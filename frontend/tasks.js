// Check authentication
checkAuth();
loadUserInfo();

const user = JSON.parse(localStorage.getItem('user') || '{}');
let allProjects = [];
let allUsers = [];
let currentTaskId = null;

// Create task button
document.getElementById('createTaskBtn').addEventListener('click', openCreateModal);

// Load all tasks
async function loadTasks() {
  try {
    const projectId = document.getElementById('projectFilter').value;
    const status = document.getElementById('statusFilter').value;

    let url = `${API_URL}/tasks?`;
    if (projectId) url += `projectId=${projectId}&`;
    if (status) url += `status=${status}&`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success) {
      displayTasks(data.tasks);
    } else {
      if (response.status === 401) {
        logout();
      } else {
        showError('Failed to load tasks');
      }
    }
  } catch (error) {
    console.error('Tasks error:', error);
    showError('Network error');
  }
}

// Display tasks
function displayTasks(tasks) {
  const container = document.getElementById('tasksList');

  if (tasks.length === 0) {
    container.innerHTML = '<p style="color: white; text-align: center;">No tasks found</p>';
    return;
  }

  container.innerHTML = tasks.map(task => {
    const overdue = isOverdue(task.dueDate, task.status);

    return `
      <div class="task-card">
        <h3>${task.title}</h3>
        <p>${task.description}</p>
        <p><strong>Project:</strong> ${task.project.name}</p>
        <p><strong>Status:</strong> <span class="status-badge status-${task.status.toLowerCase().replace(' ', '')}">${task.status}</span></p>
        <p><strong>Priority:</strong> <span class="priority-${task.priority.toLowerCase()}">${task.priority}</span></p>
        <p><strong>Assigned to:</strong> ${task.assignedTo ? task.assignedTo.name : 'Unassigned'}</p>
        <p><strong>Due Date:</strong> ${formatDate(task.dueDate)} ${overdue ? '<span style="color: red;">(Overdue)</span>' : ''}</p>
        <div class="card-actions">
          ${(user.role === 'Admin' || task.createdBy._id === user.id || (task.assignedTo && task.assignedTo._id === user.id)) ?
            `<button class="btn btn-secondary btn-small" onclick="editTask('${task._id}')">Edit</button>` : ''}
          ${(user.role === 'Admin' || task.createdBy._id === user.id) ?
            `<button class="btn btn-danger btn-small" onclick="deleteTask('${task._id}')">Delete</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Load projects for filter and task form
async function loadProjectsForFilter() {
  try {
    const response = await fetch(`${API_URL}/projects`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success) {
      allProjects = data.projects;

      // Update project filter
      const filterSelect = document.getElementById('projectFilter');
      filterSelect.innerHTML = '<option value="">All Projects</option>' +
        data.projects.map(p => `<option value="${p._id}">${p.name}</option>`).join('');

      // Update task form project select
      const taskProjectSelect = document.getElementById('taskProject');
      taskProjectSelect.innerHTML = '<option value="">Select Project</option>' +
        data.projects.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

// Load users for assignment
async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success) {
      allUsers = data.users;

      const assignSelect = document.getElementById('taskAssignedTo');
      assignSelect.innerHTML = '<option value="">Unassigned</option>' +
        data.users.map(u => `<option value="${u._id}">${u.name} (${u.role})</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Open create modal
async function openCreateModal() {
  currentTaskId = null;
  document.getElementById('modalTitle').textContent = 'Create Task';
  document.getElementById('taskForm').reset();
  document.getElementById('taskId').value = '';

  // Set default due date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('taskDueDate').value = tomorrow.toISOString().split('T')[0];

  await loadProjectsForFilter();
  await loadUsers();

  document.getElementById('taskModal').style.display = 'block';
}

// Edit task
async function editTask(taskId) {
  currentTaskId = taskId;

  try {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success) {
      const task = data.task;

      document.getElementById('modalTitle').textContent = 'Edit Task';
      document.getElementById('taskId').value = task._id;
      document.getElementById('taskTitle').value = task.title;
      document.getElementById('taskDescription').value = task.description;
      document.getElementById('taskProject').value = task.project._id;
      document.getElementById('taskAssignedTo').value = task.assignedTo ? task.assignedTo._id : '';
      document.getElementById('taskStatus').value = task.status;
      document.getElementById('taskPriority').value = task.priority;
      document.getElementById('taskDueDate').value = task.dueDate.split('T')[0];

      await loadProjectsForFilter();
      await loadUsers();

      document.getElementById('taskModal').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading task:', error);
    showError('Failed to load task');
  }
}

// Delete task
async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;

  try {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success) {
      showSuccess('Task deleted successfully');
      loadTasks();
    } else {
      showError(data.message || 'Failed to delete task');
    }
  } catch (error) {
    console.error('Delete error:', error);
    showError('Network error');
  }
}

// Handle task form submission
document.getElementById('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const taskData = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDescription').value,
    project: document.getElementById('taskProject').value,
    assignedTo: document.getElementById('taskAssignedTo').value || null,
    status: document.getElementById('taskStatus').value,
    priority: document.getElementById('taskPriority').value,
    dueDate: document.getElementById('taskDueDate').value
  };

  try {
    const url = currentTaskId
      ? `${API_URL}/tasks/${currentTaskId}`
      : `${API_URL}/tasks`;

    const method = currentTaskId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData)
    });

    const data = await response.json();

    if (data.success) {
      showSuccess(currentTaskId ? 'Task updated' : 'Task created');
      closeTaskModal();
      loadTasks();
    } else {
      showError(data.message || 'Operation failed');
    }
  } catch (error) {
    console.error('Save error:', error);
    showError('Network error');
  }
});

// Close modal
function closeTaskModal() {
  document.getElementById('taskModal').style.display = 'none';
}

// Modal close button
document.querySelector('.close').addEventListener('click', closeTaskModal);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('taskModal');
  if (e.target === modal) {
    closeTaskModal();
  }
});

// Load initial data
loadProjectsForFilter();
loadTasks();
