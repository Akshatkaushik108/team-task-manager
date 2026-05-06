// Check authentication
checkAuth();
loadUserInfo();

// Load dashboard data
async function loadDashboard() {
  try {
    const response = await fetch(`${API_URL}/tasks/dashboard`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success) {
      const { dashboard } = data;

      // Update statistics
      document.getElementById('totalTasks').textContent = dashboard.totalTasks;
      document.getElementById('todoTasks').textContent = dashboard.todoTasks;
      document.getElementById('inProgressTasks').textContent = dashboard.inProgressTasks;
      document.getElementById('completedTasks').textContent = dashboard.completedTasks;
      document.getElementById('overdueTasks').textContent = dashboard.overdueCount;

      // Display overdue tasks
      if (dashboard.overdueCount > 0) {
        document.getElementById('overdueSection').style.display = 'block';
        displayOverdueTasks(dashboard.overdueTasks);
      }

      // Display my tasks
      displayMyTasks(dashboard.myTasks);
    } else {
      if (response.status === 401) {
        logout();
      } else {
        showError('Failed to load dashboard data');
      }
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    showError('Network error. Please check if the server is running.');
  }
}

// Display overdue tasks
function displayOverdueTasks(tasks) {
  const container = document.getElementById('overdueTasksList');

  if (tasks.length === 0) {
    container.innerHTML = '<p>No overdue tasks</p>';
    return;
  }

  container.innerHTML = tasks.map(task => `
    <div class="task-item">
      <div class="task-title">${task.title}</div>
      <div class="task-info">
        <span class="status-badge status-${task.status.toLowerCase().replace(' ', '')}">${task.status}</span>
        <strong>Project:</strong> ${task.project} |
        <strong>Due:</strong> <span style="color: red;">${formatDate(task.dueDate)}</span>
      </div>
    </div>
  `).join('');
}

// Display my tasks
function displayMyTasks(tasks) {
  const container = document.getElementById('myTasksList');

  if (tasks.length === 0) {
    container.innerHTML = '<p>No tasks assigned to you</p>';
    return;
  }

  container.innerHTML = tasks.map(task => `
    <div class="task-item">
      <div class="task-title">${task.title}</div>
      <div class="task-info">
        <span class="status-badge status-${task.status.toLowerCase().replace(' ', '')}">${task.status}</span>
        <strong>Project:</strong> ${task.project} |
        <strong>Priority:</strong> <span class="priority-${task.priority.toLowerCase()}">${task.priority}</span> |
        <strong>Due:</strong> ${formatDate(task.dueDate)}
        ${isOverdue(task.dueDate, task.status) ? '<span style="color: red;"> (Overdue)</span>' : ''}
      </div>
    </div>
  `).join('');
}

// Load dashboard on page load
loadDashboard();
