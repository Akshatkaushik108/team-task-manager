// Check authentication
checkAuth();
loadUserInfo();

const user = JSON.parse(localStorage.getItem('user') || '{}');
let allUsers = [];
let currentProjectId = null;

// Show/hide create button based on role
if (user.role === 'Admin') {
  document.getElementById('createProjectBtn').style.display = 'block';
  document.getElementById('createProjectBtn').addEventListener('click', openCreateModal);
}

// Load all projects
async function loadProjects() {
  try {
    const response = await fetch(`${API_URL}/projects`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success) {
      displayProjects(data.projects);
    } else {
      if (response.status === 401) {
        logout();
      } else {
        showError('Failed to load projects');
      }
    }
  } catch (error) {
    console.error('Projects error:', error);
    showError('Network error');
  }
}

// Display projects
function displayProjects(projects) {
  const container = document.getElementById('projectsList');

  if (projects.length === 0) {
    container.innerHTML = '<p style="color: white; text-align: center;">No projects found</p>';
    return;
  }

  container.innerHTML = projects.map(project => `
    <div class="project-card">
      <h3>${project.name}</h3>
      <p>${project.description}</p>
      <p><strong>Status:</strong> <span class="status-badge">${project.status}</span></p>
      <p><strong>Team Members:</strong> ${project.teamMembers.length}</p>
      <p><strong>Created by:</strong> ${project.createdBy.name}</p>
      <div class="card-actions">
        ${(user.role === 'Admin' || project.createdBy._id === user.id) ?
          `<button class="btn btn-secondary btn-small" onclick="editProject('${project._id}')">Edit</button>` : ''}
        ${user.role === 'Admin' ?
          `<button class="btn btn-danger btn-small" onclick="deleteProject('${project._id}')">Delete</button>` : ''}
      </div>
    </div>
  `).join('');
}

// Load users for team member selection
async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success) {
      allUsers = data.users;
      displayTeamMembersList();
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Display team members checkboxes
function displayTeamMembersList() {
  const container = document.getElementById('teamMembersList');

  container.innerHTML = allUsers.map(user => `
    <div class="checkbox-item">
      <input type="checkbox" id="user-${user._id}" value="${user._id}">
      <label for="user-${user._id}">${user.name} (${user.email}) - ${user.role}</label>
    </div>
  `).join('');
}

// Open create modal
async function openCreateModal() {
  currentProjectId = null;
  document.getElementById('modalTitle').textContent = 'Create Project';
  document.getElementById('projectForm').reset();
  document.getElementById('projectId').value = '';

  await loadUsers();

  document.getElementById('projectModal').style.display = 'block';
}

// Edit project
async function editProject(projectId) {
  currentProjectId = projectId;

  try {
    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success) {
      const project = data.project;

      document.getElementById('modalTitle').textContent = 'Edit Project';
      document.getElementById('projectId').value = project._id;
      document.getElementById('projectName').value = project.name;
      document.getElementById('projectDescription').value = project.description;
      document.getElementById('projectStatus').value = project.status;

      await loadUsers();

      // Check team members
      project.teamMembers.forEach(member => {
        const checkbox = document.getElementById(`user-${member._id}`);
        if (checkbox) checkbox.checked = true;
      });

      document.getElementById('projectModal').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading project:', error);
    showError('Failed to load project');
  }
}

// Delete project
async function deleteProject(projectId) {
  if (!confirm('Are you sure you want to delete this project?')) return;

  try {
    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (data.success) {
      showSuccess('Project deleted successfully');
      loadProjects();
    } else {
      showError(data.message || 'Failed to delete project');
    }
  } catch (error) {
    console.error('Delete error:', error);
    showError('Network error');
  }
}

// Handle project form submission
document.getElementById('projectForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const projectData = {
    name: document.getElementById('projectName').value,
    description: document.getElementById('projectDescription').value,
    status: document.getElementById('projectStatus').value,
    teamMembers: Array.from(document.querySelectorAll('#teamMembersList input:checked'))
      .map(cb => cb.value)
  };

  try {
    const url = currentProjectId
      ? `${API_URL}/projects/${currentProjectId}`
      : `${API_URL}/projects`;

    const method = currentProjectId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });

    const data = await response.json();

    if (data.success) {
      showSuccess(currentProjectId ? 'Project updated' : 'Project created');
      closeProjectModal();
      loadProjects();
    } else {
      showError(data.message || 'Operation failed');
    }
  } catch (error) {
    console.error('Save error:', error);
    showError('Network error');
  }
});

// Close modal
function closeProjectModal() {
  document.getElementById('projectModal').style.display = 'none';
}

// Modal close button
document.querySelector('.close').addEventListener('click', closeProjectModal);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('projectModal');
  if (e.target === modal) {
    closeProjectModal();
  }
});

// Load projects on page load
loadProjects();
