// Utility functions for use across the application

// Format currency for display (TRY)
function formatCurrency(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2
  }).format(value);
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format time for display
function formatTime(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format date and time together
function formatDateTime(dateString) {
  if (!dateString) return '-';
  
  return `${formatDate(dateString)} ${formatTime(dateString)}`;
}

// Show alert message on page
function showAlert(type, message, container = '.main-content', autoDismiss = true) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  const targetContainer = document.querySelector(container);
  targetContainer.insertBefore(alertDiv, targetContainer.firstChild);
  
  // Auto dismiss after 3 seconds if requested
  if (autoDismiss) {
    setTimeout(() => {
      const alert = bootstrap.Alert.getOrCreateInstance(alertDiv);
      alert.close();
    }, 3000);
  }
}

// Validate input field
function validateInput(input, errorMessage) {
  if (!input || input.trim() === '') {
    return { valid: false, message: errorMessage };
  }
  return { valid: true };
}

// Validate numeric input
function validateNumeric(input, errorMessage) {
  if (!input || isNaN(parseFloat(input)) || parseFloat(input) <= 0) {
    return { valid: false, message: errorMessage };
  }
  return { valid: true };
}

// Validate email format
function validateEmail(email) {
  if (!email || email.trim() === '') {
    return { valid: true }; // Empty is allowed
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Geçerli bir e-posta adresi giriniz.' };
  }
  
  return { valid: true };
}

// Export utility functions to window scope
window.Utils = {
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  showAlert,
  validateInput,
  validateNumeric,
  validateEmail
}; 