// Core application functionality

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

// Initialize the application
function initializeApp() {
  // Initialize sidebar based on current page
  initializeSidebar();
  
  // Setup global error handler
  setupErrorHandler();
  
  // Log current page load
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  window.api?.log(`Sayfa yüklendi: ${currentPage}`);
}

// Set active link in sidebar based on current page
function initializeSidebar() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const currentPageId = currentPage.replace('.html', '') === 'index' ? 'dashboard' : currentPage.replace('.html', '');
  
  // Set active class on current page link
  const navLinks = document.querySelectorAll('.sidebar .nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });
}

// Global error handler
function setupErrorHandler() {
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    if (window.api) {
      window.api.logError(`Uncaught error: ${event.error?.message || 'Unknown error'}`);
    }
    
    // Show error to user
    if (window.Utils) {
      window.Utils.showAlert('danger', `Uygulama hatası: ${event.error?.message || 'Bilinmeyen hata'}`);
    }
    
    return false;
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.api) {
      window.api.logError(`Unhandled promise rejection: ${event.reason?.message || 'Unknown error'}`);
    }
    
    // Show error to user
    if (window.Utils) {
      window.Utils.showAlert('danger', `İşlenmeyen hata: ${event.reason?.message || 'Bilinmeyen hata'}`);
    }
    
    return false;
  });
} 