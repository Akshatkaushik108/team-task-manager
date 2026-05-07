// API Configuration
// Change this URL when deploying to Railway
const API_URL = 'team-task-manager-production-846b.up.railway.app/api';

// Helper function to get auth token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Helper function to get auth headers
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// Check if user is logged in
function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Load user info in navbar
function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userNameEl = document.getElementById('userName');
  const userRoleEl = document.getElementById('userRole');

  if (userNameEl && user.name) {
    userNameEl.textContent = user.name;
  }

  if (userRoleEl && user.role) {
    userRoleEl.textContent = user.role;
    userRoleEl.className = `badge ${user.role === 'Admin' ? 'badge-admin' : 'badge-member'}`;
  }
}

// Format date helper
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Check if date is overdue
function isOverdue(dueDate, status) {
  return new Date(dueDate) < new Date() && status !== 'Completed';
}

// Show/hide loading indicator
function showLoading(show = true) {
  // Simple implementation - can be enhanced with a spinner
  document.body.style.cursor = show ? 'wait' : 'default';
}

// Show error message
function showError(message) {
  alert(message); // Simple alert - can be enhanced with better UI
}

// Show success message
function showSuccess(message) {
  alert(message); // Simple alert - can be enhanced with better UI
}
