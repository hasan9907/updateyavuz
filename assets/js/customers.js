// Customers management functions

document.addEventListener('DOMContentLoaded', () => {
  loadCustomers();
  initializeCustomerEvents();
});

// Initialize customer related event listeners
function initializeCustomerEvents() {
  // Add customer button click
  document.getElementById('add-customer-btn').addEventListener('click', () => {
    resetCustomerForm();
  });

  // Save customer button click
  document.getElementById('save-customer').addEventListener('click', saveCustomer);
}

// Reset and show the customer form
function resetCustomerForm() {
  // Clear form fields
  document.getElementById('customer-form').reset();
  
  // Reset hidden fields and change modal title
  document.getElementById('customer-id').value = '';
  document.querySelector('#customerModal .modal-title').textContent = 'Yeni Müşteri Ekle';
  document.getElementById('save-customer').textContent = 'Kaydet';
  
  // More thorough modal cleanup
  const modalElements = document.querySelectorAll('.modal');
  modalElements.forEach(modalEl => {
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) {
      modalInstance.hide();
    }
    modalEl.classList.remove('show');
    modalEl.style.display = 'none';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.removeAttribute('aria-modal');
    modalEl.removeAttribute('role');
  });
  
  // Manually remove modal backdrop if it exists
  const backdrops = document.querySelectorAll('.modal-backdrop');
  backdrops.forEach(backdrop => backdrop.remove());
  
  // Reset body styling
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  
  // Force window focus reset - simulates minimize/restore effect
  if (document.activeElement) {
    document.activeElement.blur();
  }
  window.focus();
  
  // Use vanilla JS to show the modal after forcing DOM refresh
  setTimeout(() => {
    const modalElement = document.getElementById('customerModal');
    const newModal = new bootstrap.Modal(modalElement, {
      backdrop: 'static',
      keyboard: false
    });
    
    // Make sure form inputs are enabled before showing modal
    const formInputs = modalElement.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
      input.disabled = false;
      input.removeAttribute('readonly');
    });
    
    newModal.show();
    
    // Force focus after modal is visible with multiple attempts
    const focusInput = () => {
      const nameInput = document.getElementById('customer-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.click();
        console.log('Focus set to customer name input');
      }
    };
    
    // Try focusing multiple times to ensure it works
    setTimeout(focusInput, 100);
    setTimeout(focusInput, 300);
    setTimeout(focusInput, 500);
  }, 100);
}

// Show customer form for edit
function showCustomerForm(customer = null) {
  // Clear form fields
  document.getElementById('customer-form').reset();
  
  // Reset hidden fields and change modal title
  document.getElementById('customer-id').value = '';
  document.querySelector('#customerModal .modal-title').textContent = 'Yeni Müşteri Ekle';
  document.getElementById('save-customer').textContent = 'Kaydet';
  
  // If customer data provided, fill the form (for edit)
  if (customer) {
    document.getElementById('customer-id').value = customer.id;
    document.getElementById('customer-name').value = customer.name || '';
    document.getElementById('customer-phone').value = customer.phone || '';
    document.getElementById('customer-email').value = customer.email || '';
    document.getElementById('customer-address').value = customer.address || '';
    
    document.querySelector('#customerModal .modal-title').textContent = 'Müşteri Düzenle';
    document.getElementById('save-customer').textContent = 'Güncelle';
  }

  // More thorough modal cleanup
  const modalElements = document.querySelectorAll('.modal');
  modalElements.forEach(modalEl => {
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) {
      modalInstance.hide();
    }
    modalEl.classList.remove('show');
    modalEl.style.display = 'none';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.removeAttribute('aria-modal');
    modalEl.removeAttribute('role');
  });
  
  // Manually remove modal backdrop if it exists
  const backdrops = document.querySelectorAll('.modal-backdrop');
  backdrops.forEach(backdrop => backdrop.remove());
  
  // Reset body styling
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  
  // Create and show new modal
  setTimeout(() => {
    const modalElement = document.getElementById('customerModal');
    const newModal = new bootstrap.Modal(modalElement, {
      backdrop: 'static',
      keyboard: false
    });
    
    // Make sure form inputs are enabled before showing modal
    const formInputs = modalElement.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
      input.disabled = false;
      input.removeAttribute('readonly');
    });
    
    newModal.show();
    
    // Force focus after modal is fully visible with multiple attempts
    const focusInput = () => {
      const nameInput = document.getElementById('customer-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.click();
        console.log('Focus set to customer name input');
      }
    };
    
    // Try focusing multiple times to ensure it works
    setTimeout(focusInput, 100);
    setTimeout(focusInput, 300);
    setTimeout(focusInput, 500);
  }, 100);
}

// Load customers from database
async function loadCustomers() {
  try {
    const customersTable = document.getElementById('customers-table').getElementsByTagName('tbody')[0];
    customersTable.innerHTML = '<tr><td colspan="6" class="text-center">Yükleniyor...</td></tr>';
    
    const customers = await window.api.getCustomers();
    
    if (customers.length === 0) {
      customersTable.innerHTML = '<tr><td colspan="6" class="text-center">Hiç müşteri bulunamadı</td></tr>';
      return;
    }
    
    let tableHTML = '';
    
    customers.forEach(customer => {
      tableHTML += `
        <tr>
          <td>${customer.id}</td>
          <td>${customer.name}</td>
          <td>${customer.phone || '-'}</td>
          <td>${customer.email || '-'}</td>
          <td>${customer.address || '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="viewCustomer(${customer.id})">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning me-1" onclick="editCustomer(${customer.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer(${customer.id})">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    customersTable.innerHTML = tableHTML;
    
    window.api.log(`Müşteri listesi yüklendi: ${customers.length} müşteri`);
  } catch (error) {
    console.error('Müşteriler listelenirken hata:', error);
    window.api.logError('Müşteri listeleme hatası: ' + error.message);
    
    const customersTable = document.getElementById('customers-table').getElementsByTagName('tbody')[0];
    customersTable.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">
          <i class="bi bi-exclamation-triangle"></i> Müşteriler yüklenirken hata oluştu
        </td>
      </tr>
    `;
  }
}

// Save new customer or update existing
async function saveCustomer() {
  try {
    // Get form values
    const customerId = document.getElementById('customer-id').value.trim();
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    
    // Validation using utility functions
    const nameValidation = window.Utils.validateInput(name, 'Müşteri adı boş bırakılamaz.');
    if (!nameValidation.valid) {
      alert(nameValidation.message);
      return;
    }
    
    // Email validation if provided
    if (email) {
      const emailValidation = window.Utils.validateEmail(email);
      if (!emailValidation.valid) {
        alert(emailValidation.message);
        return;
      }
    }
    
    // Create customer object
    const customer = {
      name,
      phone: phone || null,
      email: email || null,
      address: address || null
    };
    
    let result;
    
    // If ID exists, update; otherwise add new
    if (customerId) {
      // Update existing customer
      customer.id = customerId;
      result = await window.api.updateCustomer(customer);
      window.Utils.showAlert('success', 'Müşteri başarıyla güncellendi');
    } else {
      // Add new customer
      result = await window.api.addCustomer(customer);
      window.Utils.showAlert('success', 'Müşteri başarıyla eklendi');
    }
    
    // More thorough modal cleanup
    const modalElements = document.querySelectorAll('.modal');
    modalElements.forEach(modalEl => {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) {
        modalInstance.hide();
      }
      modalEl.classList.remove('show');
      modalEl.style.display = 'none';
      modalEl.setAttribute('aria-hidden', 'true');
      modalEl.removeAttribute('aria-modal');
      modalEl.removeAttribute('role');
    });
    
    // Clean up modal backdrop manually
    setTimeout(() => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Refresh customer list
      loadCustomers();
    }, 300);
    
  } catch (error) {
    console.error('Müşteri işlemi sırasında hata:', error);
    window.api.logError('Müşteri işlem hatası: ' + error.message);
    
    window.Utils.showAlert('danger', 'Müşteri işlemi sırasında hata oluştu: ' + error.message);
  }
}

// View customer details
function viewCustomer(customerId) {
  // Get customer data
  window.api.getCustomer(customerId)
    .then(customer => {
      // Fill customer details in the view modal
      document.getElementById('view-customer-id').textContent = customer.id;
      document.getElementById('view-customer-name').textContent = customer.name || '-';
      document.getElementById('view-customer-phone').textContent = customer.phone || '-';
      document.getElementById('view-customer-email').textContent = customer.email || '-';
      document.getElementById('view-customer-address').textContent = customer.address || '-';
      
      // Show the view modal
      const viewModal = new bootstrap.Modal(document.getElementById('viewCustomerModal'));
      viewModal.show();
    })
    .catch(error => {
      console.error('Müşteri görüntüleme hatası:', error);
      window.api.logError('Müşteri görüntüleme hatası: ' + error.message);
      window.Utils.showAlert('danger', 'Müşteri bilgileri görüntülenirken hata oluştu');
    });
}

// Edit customer
async function editCustomer(customerId) {
  try {
    // Get customer data
    const customer = await window.api.getCustomer(customerId);
    
    // Show form with customer data
    showCustomerForm(customer);
    
  } catch (error) {
    console.error('Müşteri düzenleme formu hazırlanırken hata:', error);
    window.api.logError('Müşteri düzenleme hatası: ' + error.message);
    alert('Müşteri düzenleme formu hazırlanırken hata oluştu: ' + error.message);
  }
}

// Edit customer from view modal
function editCustomerFromView() {
  // Get the customer ID from the view modal
  const customerId = document.getElementById('view-customer-id').textContent;
  
  // Close the view modal manually
  const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewCustomerModal'));
  if (viewModal) viewModal.hide();
  
  // Remove modal backdrop manually
  setTimeout(() => {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    document.body.classList.remove('modal-open');
    
    // After a short delay, open the edit form with this customer's data
    setTimeout(() => {
      // Get the customer data and show edit form
      window.api.getCustomer(parseInt(customerId))
        .then(customer => {
          showCustomerForm(customer);
        })
        .catch(error => {
          console.error('Müşteri düzenleme hatası:', error);
          window.api.logError('Müşteri düzenleme hatası: ' + error.message);
          window.Utils.showAlert('danger', 'Müşteri düzenleme formu hazırlanırken hata oluştu');
        });
    }, 300);
  }, 200);
}

// Delete customer
function deleteCustomer(customerId) {
  if (confirm('Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
    window.api.deleteCustomer(customerId)
      .then(() => {
        window.Utils.showAlert('success', 'Müşteri başarıyla silindi');
        
        // Electron aracılığıyla pencereyi yeniden yükle
        setTimeout(() => {
          window.api.reloadWindow().catch(() => {
            console.error("Pencere yenileme başarısız oldu, alternatif yönteme geçiliyor.");
            
            // Alternatif: DOM'u manuel temizle ve resetle
            const modalElements = document.querySelectorAll('.modal');
            modalElements.forEach(modalEl => {
              document.body.removeChild(modalEl);
            });
            
            // Modal ve backdrop'ları yeniden oluştur
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            
            // Son çare olarak sayfayı yenile
            window.location.reload();
          });
        }, 500);
      })
      .catch(error => {
        console.error('Müşteri silme hatası:', error);
        window.api.logError('Müşteri silme hatası: ' + error.message);
        window.Utils.showAlert('danger', 'Müşteri silinirken hata oluştu');
      });
  }
}