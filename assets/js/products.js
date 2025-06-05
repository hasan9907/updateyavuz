// Products management functions

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  initializeProductEvents();
});

// Initialize product related event listeners
function initializeProductEvents() {
  // Add product button click
  document.getElementById('add-product-btn').addEventListener('click', () => {
    resetProductForm();
  });

  // Save product button click
  document.getElementById('save-product').addEventListener('click', saveProduct);
  
  // Update stock button click
  document.getElementById('update-stock').addEventListener('click', updateStock);
  
  // Confirm delete button click
  document.getElementById('confirm-delete-btn').addEventListener('click', confirmDeleteProduct);
}

// Reset and show the product form
function resetProductForm() {
  // Clear form fields
  document.getElementById('product-form').reset();
  
  // Reset hidden fields and change modal title
  document.getElementById('product-id').value = '';
  document.querySelector('#productModal .modal-title').textContent = 'Yeni Ürün Ekle';
  document.getElementById('save-product').textContent = 'Kaydet';
  
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
  
  // Force window focus reset
  if (document.activeElement) {
    document.activeElement.blur();
  }
  window.focus();
  
  // Use vanilla JS to show the modal after forcing DOM refresh
  setTimeout(() => {
    const modalElement = document.getElementById('productModal');
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
      const nameInput = document.getElementById('product-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.click();
        console.log('Focus set to product name input');
      }
    };
    
    // Try focusing multiple times to ensure it works
    setTimeout(focusInput, 100);
    setTimeout(focusInput, 300);
    setTimeout(focusInput, 500);
  }, 100);
}

// Show product form for edit
function showProductForm(product = null) {
  // Clear form fields
  document.getElementById('product-form').reset();
  
  // Reset hidden fields and change modal title
  document.getElementById('product-id').value = '';
  document.querySelector('#productModal .modal-title').textContent = 'Yeni Ürün Ekle';
  document.getElementById('save-product').textContent = 'Kaydet';
  
  // If product data provided, fill the form (for edit)
  if (product) {
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-price').value = product.price || 0;
    document.getElementById('product-purchase-price').value = product.purchase_price || 0;
    document.getElementById('product-stock').value = product.stock_quantity || 0;
    document.getElementById('product-barcode').value = product.barcode || '';
    document.getElementById('product-vat-rate').value = (typeof product.vat_rate !== 'undefined' && product.vat_rate !== null) ? product.vat_rate : 18;
    
    document.querySelector('#productModal .modal-title').textContent = 'Ürün Düzenle';
    document.getElementById('save-product').textContent = 'Güncelle';
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
  
  // Force window focus reset
  if (document.activeElement) {
    document.activeElement.blur();
  }
  window.focus();
  
  // Create and show new modal
  setTimeout(() => {
    const modalElement = document.getElementById('productModal');
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
      const nameInput = document.getElementById('product-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.click();
        console.log('Focus set to product name input');
      }
    };
    
    // Try focusing multiple times to ensure it works
    setTimeout(focusInput, 100);
    setTimeout(focusInput, 300);
    setTimeout(focusInput, 500);
  }, 100);
}

// Load products from database
async function loadProducts() {
  try {
    const productsTable = document.getElementById('products-table').getElementsByTagName('tbody')[0];
    productsTable.innerHTML = '<tr><td colspan="6" class="text-center">Yükleniyor...</td></tr>';
    
    const products = await window.api.getProducts();
    
    if (products.length === 0) {
      productsTable.innerHTML = '<tr><td colspan="6" class="text-center">Hiç ürün bulunamadı</td></tr>';
      return;
    }
    
    let tableHTML = '';
    
    products.forEach(product => {
      tableHTML += `
        <tr>
          <td>${product.id}</td>
          <td>${product.name}</td>
          <td>${product.description || '-'}</td>
          <td>
            <div>Satış: ${window.Utils.formatCurrency(product.price)}</div>
            <div class="text-muted small">Alış: ${window.Utils.formatCurrency(product.purchase_price || 0)}</div>
          </td>
          <td>${product.stock_quantity}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="viewProduct(${product.id})">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning me-1" onclick="editProduct(${product.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary me-1" onclick="openStockModal(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.stock_quantity})">
              <i class="bi bi-box"></i> Stok
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="openDeleteModal(${product.id}, '${product.name.replace(/'/g, "\\'")}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    productsTable.innerHTML = tableHTML;
    
    window.api.log(`Ürün listesi yüklendi: ${products.length} ürün`);
  } catch (error) {
    console.error('Ürünler listelenirken hata:', error);
    window.api.logError('Ürün listeleme hatası: ' + error.message);
    
    const productsTable = document.getElementById('products-table').getElementsByTagName('tbody')[0];
    productsTable.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">
          <i class="bi bi-exclamation-triangle"></i> Ürünler yüklenirken hata oluştu
        </td>
      </tr>
    `;
  }
}

// Save new product or update existing
async function saveProduct() {
  try {
    const id = document.getElementById('product-id').value.trim();
    const name = document.getElementById('product-name').value.trim();
    const description = document.getElementById('product-description').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const purchase_price = parseFloat(document.getElementById('product-purchase-price').value);
    const stock_quantity = parseInt(document.getElementById('product-stock').value);
    const barcode = document.getElementById('product-barcode').value.trim();
    const vat_rate = parseFloat(document.getElementById('product-vat-rate').value) || 18;
    
    if (!name) {
      alert('Ürün adı zorunludur.');
      return;
    }
    if (isNaN(price) || price < 0) {
      alert('Geçerli bir satış fiyatı girin.');
      return;
    }
    if (isNaN(vat_rate) || vat_rate < 0 || vat_rate > 100) {
      alert('Geçerli bir KDV oranı girin (0-100 arası).');
      return;
    }
    
    const product = {
      name,
      description,
      price,
      purchase_price: isNaN(purchase_price) ? 0 : purchase_price,
      stock_quantity: isNaN(stock_quantity) ? 0 : stock_quantity,
      barcode,
      vat_rate
    };
    
    if (id) product.id = parseInt(id);
    
    let result;
    
    // If ID exists, update; otherwise add new
    if (id) {
      // Update existing product
      result = await window.api.updateProduct(product);
      
      if (result.expenseCreated) {
        window.Utils.showAlert('success', `Ürün başarıyla güncellendi ve ${window.Utils.formatCurrency(result.expenseAmount)} tutarında gider kaydı oluşturuldu.`);
      } else {
        window.Utils.showAlert('success', 'Ürün başarıyla güncellendi');
      }
    } else {
      // Add new product
      result = await window.api.addProduct(product);
      
      if (result.expenseCreated) {
        window.Utils.showAlert('success', `Ürün başarıyla eklendi ve ${window.Utils.formatCurrency(result.expenseAmount)} tutarında gider kaydı oluşturuldu.`);
      } else {
        window.Utils.showAlert('success', 'Ürün başarıyla eklendi');
      }
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
      
      // Refresh product list
      loadProducts();
    }, 300);
    
  } catch (error) {
    console.error('Ürün işlemi sırasında hata:', error);
    window.api.logError('Ürün işlem hatası: ' + error.message);
    
    window.Utils.showAlert('danger', 'Ürün işlemi sırasında hata oluştu: ' + error.message);
  }
}

// Open stock update modal
function openStockModal(productId, productName, currentStock) {
  document.getElementById('stock-product-id').value = productId;
  document.getElementById('stock-product-name').value = productName;
  document.getElementById('stock-current').value = currentStock;
  document.getElementById('stock-add').value = 0;
  
  const stockModal = new bootstrap.Modal(document.getElementById('stockModal'));
  stockModal.show();
}

// Update product stock
async function updateStock() {
  try {
    const productId = document.getElementById('stock-product-id').value;
    const addStock = parseInt(document.getElementById('stock-add').value);
    
    if (isNaN(addStock)) {
      alert('Geçerli bir stok miktarı giriniz.');
      return;
    }
    
    // Update in database
    const result = await window.api.updateProductStock({
      id: productId,
      quantity: addStock
    });
    
    // Close modal
    const stockModal = bootstrap.Modal.getInstance(document.getElementById('stockModal'));
    if (stockModal) stockModal.hide();
    
    // Clean up modal backdrop manually
    setTimeout(() => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }, 300);
    
    // Refresh product list
    loadProducts();
    
    // Show success messages
    if (result.expenseCreated) {
      window.Utils.showAlert('success', `Ürün stoğu başarıyla güncellendi ve ${window.Utils.formatCurrency(result.expenseAmount)} tutarında gider kaydı oluşturuldu.`);
    } else {
      window.Utils.showAlert('success', 'Ürün stoğu başarıyla güncellendi');
    }
  } catch (error) {
    console.error('Stok güncellenirken hata:', error);
    window.api.logError('Stok güncelleme hatası: ' + error.message);
    
    window.Utils.showAlert('danger', 'Stok güncellenirken hata oluştu: ' + error.message);
  }
}

// View product details
function viewProduct(productId) {
  // Get product data
  window.api.getProduct(productId)
    .then(product => {
      // Fill product details in the view modal
      document.getElementById('view-product-id').textContent = product.id;
      document.getElementById('view-product-name').textContent = product.name || '-';
      document.getElementById('view-product-description').textContent = product.description || '-';
      document.getElementById('view-product-price').textContent = window.Utils.formatCurrency(product.price) || '-';
      document.getElementById('view-product-purchase-price').textContent = window.Utils.formatCurrency(product.purchase_price) || '-';
      document.getElementById('view-product-stock').textContent = product.stock_quantity || '0';
      document.getElementById('view-product-barcode').textContent = product.barcode || '-';
      
      // Show the view modal
      const viewModal = new bootstrap.Modal(document.getElementById('viewProductModal'));
      viewModal.show();
    })
    .catch(error => {
      console.error('Ürün görüntüleme hatası:', error);
      window.api.logError('Ürün görüntüleme hatası: ' + error.message);
      window.Utils.showAlert('danger', 'Ürün bilgileri görüntülenirken hata oluştu');
    });
}

// Edit product
async function editProduct(productId) {
  try {
    // Get product data
    const product = await window.api.getProduct(productId);
    
    // Show form with product data
    showProductForm(product);
    
  } catch (error) {
    console.error('Ürün düzenleme formu hazırlanırken hata:', error);
    window.api.logError('Ürün düzenleme hatası: ' + error.message);
    alert('Ürün düzenleme formu hazırlanırken hata oluştu: ' + error.message);
  }
}

// Edit product from view modal
function editProductFromView() {
  // Get the product ID from the view modal
  const productId = document.getElementById('view-product-id').textContent;
  
  // Close the view modal manually
  const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewProductModal'));
  if (viewModal) viewModal.hide();
  
  // Remove modal backdrop manually
  setTimeout(() => {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    document.body.classList.remove('modal-open');
    
    // After a short delay, open the edit form with this product's data
    setTimeout(() => {
      // Get the product data and show edit form
      window.api.getProduct(parseInt(productId))
        .then(product => {
          showProductForm(product);
        })
        .catch(error => {
          console.error('Ürün düzenleme hatası:', error);
          window.api.logError('Ürün düzenleme hatası: ' + error.message);
          window.Utils.showAlert('danger', 'Ürün düzenleme formu hazırlanırken hata oluştu');
        });
    }, 300);
  }, 200);
}

// Open delete confirmation modal
function openDeleteModal(productId, productName) {
  document.getElementById('delete-product-id').value = productId;
  document.getElementById('delete-product-name').textContent = productName;
  
  const deleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
  deleteModal.show();
}

// Confirm product deletion
function confirmDeleteProduct() {
  const productId = document.getElementById('delete-product-id').value;
  
  if (!productId) {
    window.Utils.showAlert('danger', 'Silinecek ürün ID bilgisi eksik');
    return;
  }
  
  window.api.deleteProduct(parseInt(productId))
    .then(() => {
      window.Utils.showAlert('success', 'Ürün başarıyla silindi');
      
      // Electron aracılığıyla pencereyi yeniden yükle
      setTimeout(() => {
        window.api.reloadWindow().catch(() => {
          console.error("Pencere yenileme başarısız oldu, alternatif yönteme geçiliyor.");
          
          // Alternatif: DOM'u manuel temizle ve resetle
          const modalElements = document.querySelectorAll('.modal');
          modalElements.forEach(modalEl => {
            if (modalEl.parentNode) {
              try {
                document.body.removeChild(modalEl);
              } catch (e) {
                console.error('Modal silme hatası:', e);
              }
            }
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
      console.error('Ürün silme hatası:', error);
      window.api.logError('Ürün silme hatası: ' + error.message);
      
      // Close delete confirmation modal
      const deleteModal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
      if (deleteModal) deleteModal.hide();
      
      window.Utils.showAlert('danger', 'Ürün silinirken hata oluştu: ' + error.message);
    });
} 