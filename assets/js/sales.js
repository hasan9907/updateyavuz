// Sales management functions

document.addEventListener('DOMContentLoaded', () => {
  // DOM hazırlık kontrolü
  if (document.getElementById('sales-table')) {
    try {
      loadSales();
      initializeSaleEvents();
    } catch (error) {
      console.error('Sayfa yüklenirken hata:', error);
      if (window.api && window.api.logError) {
        window.api.logError('Sayfa yükleme hatası: ' + error.message);
      }
    }
  } else {
    console.info('Satış tablosu bulunamadı. Muhtemelen farklı bir sayfadasınız.');
  }
  // Ödeme türü alanı değişince çek tarihi göster/gizle
  const paymentTypeEl = document.getElementById('sale-payment-type');
  const chequeDateGroup = document.getElementById('cheque-date-group');
  if (paymentTypeEl && chequeDateGroup) {
    paymentTypeEl.addEventListener('change', function() {
      if (this.value === 'cheque') {
        chequeDateGroup.style.display = '';
      } else {
        chequeDateGroup.style.display = 'none';
        document.getElementById('sale-cheque-date').value = '';
      }
    });
  }
  // URL'den saleId parametresi ile detay modalı aç
  const params = new URLSearchParams(window.location.search);
  const saleId = params.get('saleId');
  if (saleId) {
    setTimeout(() => viewSale(saleId), 500);
  }
});

// Initialize sale related event listeners
function initializeSaleEvents() {
  try {
    // API kontrolü
    if (!window.api) {
      throw new Error('API bağlantısı kurulamadı');
    }

    const addSaleBtn = document.getElementById('add-sale-btn');
    const addItemRowBtn = document.getElementById('add-item-row');
    const saveSaleBtn = document.getElementById('save-sale');
    const printInvoiceBtn = document.getElementById('print-invoice');
    const editSaleFromViewBtn = document.getElementById('edit-sale-from-view');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // Button kontrollerini yap ve null değillerse event listener ekle
    if (addSaleBtn) {
      addSaleBtn.addEventListener('click', () => {
        try {
          prepareNewSaleForm();
        } catch (error) {
          console.error('Yeni satış formu hazırlanırken hata:', error);
          window.api.logError('Yeni satış formu hatası: ' + error.message);
        }
      });
    }

    if (addItemRowBtn) {
      addItemRowBtn.addEventListener('click', () => {
        try {
          addItemRow();
        } catch (error) {
          console.error('Ürün satırı eklenirken hata:', error);
          window.api.logError('Ürün satırı ekleme hatası: ' + error.message);
        }
      });
    }

    if (saveSaleBtn) {
      saveSaleBtn.addEventListener('click', () => {
        try {
          saveSale();
        } catch (error) {
          console.error('Satış kaydedilirken hata:', error);
          window.api.logError('Satış kaydetme hatası: ' + error.message);
        }
      });
    }
    
    if (printInvoiceBtn) {
      printInvoiceBtn.addEventListener('click', () => {
        try {
          const saleId = printInvoiceBtn.getAttribute('data-sale-id');
          if (!saleId) throw new Error('Satış ID bulunamadı');
          openTemplateSelectModal(saleId);
        } catch (error) {
          console.error('Fatura yazdırılırken hata:', error);
          window.api.logError('Fatura yazdırma hatası: ' + error.message);
        }
      });
    }
    
    if (editSaleFromViewBtn) {
      editSaleFromViewBtn.addEventListener('click', () => {
        try {
          editSaleFromView();
        } catch (error) {
          console.error('Satış düzenleme hatası:', error);
          window.api.logError('Satış düzenleme hatası: ' + error.message);
        }
      });
    }
    
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        try {
          confirmDeleteSale();
        } catch (error) {
          console.error('Satış silme hatası:', error);
          window.api.logError('Satış silme hatası: ' + error.message);
        }
      });
    }
    
    console.log('Satış olayları başarıyla başlatıldı');
  } catch (error) {
    console.error('Satış olayları başlatılırken hata:', error);
    if (window.api && window.api.logError) {
      window.api.logError('Satış olayları başlatma hatası: ' + error.message);
    }
  }
}

// Load sales from database
async function loadSales() {
  try {
    const salesTable = document.getElementById('sales-table');
    if (!salesTable) {
      console.error("'sales-table' ID'li tablo bulunamadı");
      return;
    }
    
    const salesTableBody = salesTable.querySelector('tbody');
    if (!salesTableBody) {
      salesTable.innerHTML = '<tbody><tr><td colspan="5" class="text-center">Tablo gövdesi bulunamadı</td></tr></tbody>';
      console.error("Tablo gövdesi (tbody) bulunamadı, oluşturuluyor");
      return;
    }
    
    salesTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Yükleniyor...</td></tr>';
    
    // API kontrolü
    if (!window.api || typeof window.api.getSalesReport !== 'function') {
      salesTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">API bağlantısı kurulamadı</td></tr>';
      console.error('API fonksiyonu bulunamadı: getSalesReport');
      return;
    }
    
    const sales = await window.api.getSalesReport({ startDate: null, endDate: null });
    
    if (!sales || !sales.sales || sales.sales.length === 0) {
      salesTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Hiç satış bulunamadı</td></tr>';
      return;
    }
    
    let tableHTML = '';
    
    sales.sales.forEach(sale => {
      // Utility kontrolü
      const formatDateTime = window.Utils && window.Utils.formatDateTime ? 
        window.Utils.formatDateTime : (date) => new Date(date).toLocaleString('tr-TR');
      const formatCurrency = window.Utils && window.Utils.formatCurrency ? 
        window.Utils.formatCurrency : (amount) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
      
      tableHTML += `
        <tr>
          <td>${sale.id}</td>
          <td>${formatDateTime(sale.sale_date)}</td>
          <td>${sale.customer_name || 'Anonim'}</td>
          <td>${formatCurrency(sale.total_amount)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="viewSale(${sale.id})">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning me-1" onclick="editSale(${sale.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger me-1" onclick="openDeleteModal(${sale.id})">
              <i class="bi bi-trash"></i>
            </button>
            <button class="btn btn-sm btn-outline-success" onclick="openTemplateSelectModal(${sale.id})" title="Fatura Yazdır">
              <i class="bi bi-printer"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    salesTableBody.innerHTML = tableHTML;
    
    if (window.api.log) {
      window.api.log(`Satış listesi yüklendi: ${sales.sales.length} satış`);
    }
  } catch (error) {
    console.error('Satışlar listelenirken hata:', error);
    
    if (window.api && window.api.logError) {
      window.api.logError('Satış listeleme hatası: ' + error.message);
    }
    
    const salesTable = document.getElementById('sales-table');
    if (salesTable) {
      const salesTableBody = salesTable.querySelector('tbody');
      if (salesTableBody) {
        salesTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-danger">
              <i class="bi bi-exclamation-triangle"></i> Satışlar yüklenirken hata oluştu
            </td>
          </tr>
        `;
      }
    }
    
    if (window.Utils && window.Utils.showAlert) {
      window.Utils.showAlert('danger', 'Satışlar yüklenirken hata oluştu: ' + error.message);
    }
  }
}

// Prepare the new sale form
async function prepareNewSaleForm() {
  try {
    // Reset form
    document.getElementById('sale-form').reset();
    document.getElementById('sale-id').value = '';
    
    // Update modal title
    document.querySelector('#saleModal .modal-title').textContent = 'Yeni Satış';
    document.getElementById('save-sale').textContent = 'Satışı Kaydet';
    
    // Clear product rows
    const tbody = document.getElementById('sale-items-table').getElementsByTagName('tbody')[0];
    tbody.innerHTML = `
      <tr id="empty-item-row">
        <td colspan="5" class="text-center">Henüz ürün eklenmedi</td>
      </tr>
    `;
    
    // Reset total
    document.getElementById('sale-total').textContent = window.Utils.formatCurrency(0);
    
    // Load customers for dropdown
    const customers = await window.api.getCustomers();
    const customerSelect = document.getElementById('sale-customer');
    customerSelect.innerHTML = '<option value="">Müşteri seçin...</option>';
    
    customers.forEach(customer => {
      const option = document.createElement('option');
      option.value = customer.id;
      option.textContent = customer.name;
      customerSelect.appendChild(option);
    });
    
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
      const modalElement = document.getElementById('saleModal');
      const newModal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
      });
      
      // Make sure form inputs are enabled before showing modal
      const formInputs = modalElement.querySelectorAll('input, textarea, select');
      formInputs.forEach(input => {
        input.disabled = false;
        input.removeAttribute('readonly');
      });
      
      newModal.show();
      
      // Force focus after modal is visible
      setTimeout(() => {
        const customerSelect = document.getElementById('sale-customer');
        if (customerSelect) {
          customerSelect.focus();
          customerSelect.click();
        }
      }, 300);
    }, 100);
  } catch (error) {
    console.error('Satış formu hazırlanırken hata:', error);
    window.api.logError('Satış formu hazırlama hatası: ' + error.message);
    window.Utils.showAlert('danger', 'Satış formu hazırlanırken hata oluştu: ' + error.message);
  }
}

// Add a new item row to the sale form
async function addItemRow() {
  try {
    // Remove empty row if it exists
    const emptyRow = document.getElementById('empty-item-row');
    if (emptyRow) {
      emptyRow.remove();
    }
    
    // Get all products
    const products = await window.api.getProducts();
    const tbody = document.getElementById('sale-items-table').getElementsByTagName('tbody')[0];
    const rowIndex = tbody.rows.length;
    
    // Create product dropdown options
    let productOptions = '<option value="">Ürün seçin...</option>';
    products.forEach(product => {
      productOptions += `<option value="${product.id}" data-price="${product.price}" data-stock="${product.stock_quantity}">${product.name}</option>`;
    });
    
    // Create new row
    const newRow = tbody.insertRow();
    newRow.innerHTML = `
      <td>
        <select class="form-select product-select" data-row="${rowIndex}" required>
          ${productOptions}
        </select>
      </td>
      <td>
        <input type="text" class="form-control item-price" data-row="${rowIndex}" readonly>
      </td>
      <td>
        <input type="number" class="form-control item-quantity" data-row="${rowIndex}" value="1" min="1" required>
      </td>
      <td>
        <input type="text" class="form-control item-total" data-row="${rowIndex}" readonly>
      </td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-danger remove-item" data-row="${rowIndex}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    
    // Add event listeners to the new row
    const productSelect = newRow.querySelector('.product-select');
    const quantityInput = newRow.querySelector('.item-quantity');
    const removeButton = newRow.querySelector('.remove-item');
    
    productSelect.addEventListener('change', updateItemRow);
    quantityInput.addEventListener('change', updateItemRow);
    removeButton.addEventListener('click', () => {
      newRow.remove();
      updateSaleTotal();
      
      if (tbody.rows.length === 0) {
        tbody.innerHTML = `
          <tr id="empty-item-row">
            <td colspan="5" class="text-center">Henüz ürün eklenmedi</td>
          </tr>
        `;
      }
    });
  } catch (error) {
    console.error('Ürün satırı eklerken hata:', error);
    window.api.logError('Ürün satırı ekleme hatası: ' + error.message);
  }
}

// Update an item row when product or quantity changes
function updateItemRow(event) {
  const row = event.target.getAttribute('data-row');
  const productSelect = document.querySelector(`.product-select[data-row="${row}"]`);
  const selected = productSelect.options[productSelect.selectedIndex];
  
  if (selected && selected.value) {
    const price = parseFloat(selected.getAttribute('data-price')) || 0;
    const quantityInput = document.querySelector(`.item-quantity[data-row="${row}"]`);
    let quantity = parseInt(quantityInput.value) || 0;
    
    // Check stock and limit quantity if necessary
    const stock = parseInt(selected.getAttribute('data-stock')) || 0;
    if (quantity > stock) {
      window.Utils.showAlert('warning', `Uyarı: Seçilen üründen yalnızca ${stock} adet stokta var. Miktar otomatik olarak düzeltildi.`);
      quantity = stock;
      quantityInput.value = stock; // Update the input value
      quantityInput.classList.add('is-invalid');
    } else {
      quantityInput.classList.remove('is-invalid');
    }
    
    // Update price
    const priceInput = document.querySelector(`.item-price[data-row="${row}"]`);
    priceInput.value = window.Utils.formatCurrency(price);
    
    // Update total
    const totalInput = document.querySelector(`.item-total[data-row="${row}"]`);
    totalInput.value = window.Utils.formatCurrency(price * quantity);
  }
  
  // Update sale total
  updateSaleTotal();
}

// Update the sale total
function updateSaleTotal() {
  const totalInputs = document.querySelectorAll('.item-total');
  let total = 0;
  
  totalInputs.forEach(input => {
    // Extract numeric value from formatted currency
    const value = input.value.replace(/[^\d,.-]/g, '').replace(',', '.');
    total += parseFloat(value) || 0;
  });
  
  document.getElementById('sale-total').textContent = window.Utils.formatCurrency(total);
}

// Save or update the sale
async function saveSale() {
  try {
    // Check if this is an edit or a new sale
    const saleId = document.getElementById('sale-id').value.trim();
    const isEdit = saleId !== '';
    
    // Get form data
    const customerId = document.getElementById('sale-customer').value;
    
    // Get items
    const items = [];
    const productSelects = document.querySelectorAll('.product-select');
    
    if (productSelects.length === 0) {
      alert('Lütfen en az bir ürün ekleyin.');
      return;
    }
    
    // Validate and collect items
    for (let i = 0; i < productSelects.length; i++) {
      const productSelect = productSelects[i];
      const row = productSelect.getAttribute('data-row');
      
      const productId = productSelect.value;
      if (!productId) {
        alert('Lütfen tüm ürünleri seçin.');
        return;
      }
      
      const selected = productSelect.options[productSelect.selectedIndex];
      const price = parseFloat(selected.getAttribute('data-price')) || 0;
      
      const quantityInput = document.querySelector(`.item-quantity[data-row="${row}"]`);
      const quantity = parseInt(quantityInput.value) || 0;
      
      if (quantity <= 0) {
        alert('Ürün miktarları pozitif olmalıdır.');
        return;
      }
      
      // Check stock availability for each product
      const stock = parseInt(selected.getAttribute('data-stock')) || 0;
      
      // For edit operations, we need to consider that some items might already be in the sale
      // The backend handles this more accurately, but we can provide immediate feedback
      if (quantity > stock) {
        alert(`Ürün "${selected.textContent}" için stok yetersiz. Mevcut: ${stock}, İstenen: ${quantity}`);
        quantityInput.classList.add('is-invalid');
        quantityInput.focus();
        return;
      }
      
      items.push({
        product_id: parseInt(productId),
        quantity: quantity,
        price: price
      });
    }
    
    // Calculate total amount
    let totalAmount = 0;
    items.forEach(item => {
      totalAmount += item.price * item.quantity;
    });
    
    // Get payment type and cheque date
    const paymentType = document.getElementById('sale-payment-type').value;
    const chequeDate = document.getElementById('sale-cheque-date').value;
    if (paymentType === 'cheque' && !chequeDate) {
      alert('Çek ile ödeme seçildiyse çek tarihi girilmelidir.');
      document.getElementById('sale-cheque-date').focus();
      return;
    }
    
    // Create sale object
    const saleData = {
      customerId: customerId ? parseInt(customerId) : null,
      items: items,
      totalAmount: totalAmount,
      payment_type: paymentType,
      cheque_date: paymentType === 'cheque' ? chequeDate : null
    };
    
    // Add ID if editing
    if (isEdit) {
      saleData.id = parseInt(saleId);
    }
    
    // Save to database
    if (isEdit) {
      await window.api.updateSale(saleData);
      window.Utils.showAlert('success', 'Satış başarıyla güncellendi');
    } else {
      await window.api.addSale(saleData);
      window.Utils.showAlert('success', 'Satış başarıyla kaydedildi');
    }
    
    // Close modal and clean up
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
    
    // Manually remove modal backdrop
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Reset body styling
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Refresh sale list
    setTimeout(() => {
      loadSales();
    }, 300);
    
  } catch (error) {
    console.error('Satış kaydedilirken hata:', error);
    window.api.logError('Satış kaydetme hatası: ' + error.message);
    
    window.Utils.showAlert('danger', 'Satış kaydedilirken hata oluştu: ' + error.message);
  }
}

// View sale details
async function viewSale(saleId) {
  try {
    const detailContent = document.getElementById('sale-detail-content');
    detailContent.innerHTML = '<p class="text-center">Yükleniyor...</p>';
    
    // Store the current sale ID for printing and editing
    document.getElementById('print-invoice').setAttribute('data-sale-id', saleId);
    document.getElementById('edit-sale-from-view').setAttribute('data-sale-id', saleId);
    
    // Show modal
    const detailModal = new bootstrap.Modal(document.getElementById('saleDetailModal'));
    detailModal.show();
    
    // Get sale details
    const saleDetails = await window.api.getSaleDetails(saleId);
    
    // Generate HTML
    let html = `
      <div class="invoice-container p-3">
        <div class="row mb-4">
          <div class="col-md-6">
            <h4>Satış #${saleDetails.sale.id}</h4>
            <p>Tarih: ${window.Utils.formatDateTime(saleDetails.sale.sale_date)}</p>
            <p>Ödeme Türü: <strong>${saleDetails.sale.payment_type === 'cheque' ? 'Çek' : saleDetails.sale.payment_type === 'cash' ? 'Nakit' : (saleDetails.sale.payment_type || '-')}</strong></p>
          </div>
          <div class="col-md-6 text-end">
            <h5>Müşteri:</h5>
            <p>${saleDetails.customer ? saleDetails.customer.name : 'Anonim'}</p>
            ${saleDetails.customer ? `
            <p>${saleDetails.customer.phone || ''}</p>
            <p>${saleDetails.customer.email || ''}</p>
            <p>${saleDetails.customer.address || ''}</p>
            ` : ''}
          </div>
        </div>
        
        <table class="table table-bordered">
          <thead>
            <tr>
              <th>Ürün</th>
              <th class="text-end">Fiyat</th>
              <th class="text-end">Miktar</th>
              <th class="text-end">KDV (%)</th>
              <th class="text-end">Toplam</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    saleDetails.items.forEach(item => {
      html += `
        <tr>
          <td>${item.product_name}</td>
          <td class="text-end">${window.Utils.formatCurrency(item.price)}</td>
          <td class="text-end">${item.quantity}</td>
          <td class="text-end">${typeof item.vat_rate === 'number' ? item.vat_rate : 18}</td>
          <td class="text-end">${window.Utils.formatCurrency(item.price * item.quantity)}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3" class="text-end">Toplam:</th>
              <th class="text-end">${window.Utils.formatCurrency(saleDetails.sale.total_amount)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    
    detailContent.innerHTML = html;
  } catch (error) {
    console.error('Satış detayları yüklenirken hata:', error);
    window.api.logError('Satış detay hatası: ' + error.message);
    
    document.getElementById('sale-detail-content').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Satış detayları yüklenirken hata oluştu: ${error.message}
      </div>
    `;
  }
}

// Edit sale (open form with sale data)
async function editSale(saleId) {
  try {
    // Get sale details
    const saleDetails = await window.api.getSaleDetails(saleId);
    prepareSaleForm(saleDetails);
  } catch (error) {
    console.error('Satış düzenleme formu hazırlanırken hata:', error);
    window.api.logError('Satış düzenleme hatası: ' + error.message);
    window.Utils.showAlert('danger', 'Satış düzenleme formu hazırlanırken hata oluştu: ' + error.message);
  }
}

// Edit sale from view modal
function editSaleFromView() {
  const saleId = document.getElementById('edit-sale-from-view').getAttribute('data-sale-id');
  if (saleId) {
    // Close the view modal manually
    const viewModal = bootstrap.Modal.getInstance(document.getElementById('saleDetailModal'));
    if (viewModal) viewModal.hide();
    
    // Remove modal backdrop manually
    setTimeout(() => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      document.body.classList.remove('modal-open');
      
      // After a short delay, open the edit form
      setTimeout(() => {
        editSale(parseInt(saleId));
      }, 300);
    }, 200);
  }
}

// Prepare the sale form for editing
async function prepareSaleForm(saleDetails) {
  try {
    // Reset form
    document.getElementById('sale-form').reset();
    
    // Set form for editing
    document.getElementById('sale-id').value = saleDetails.sale.id;
    document.querySelector('#saleModal .modal-title').textContent = `Satış #${saleDetails.sale.id} Düzenle`;
    document.getElementById('save-sale').textContent = 'Satışı Güncelle';
    
    // Clear product rows
    const tbody = document.getElementById('sale-items-table').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';
    
    // Load customers for dropdown
    const customers = await window.api.getCustomers();
    const customerSelect = document.getElementById('sale-customer');
    customerSelect.innerHTML = '<option value="">Müşteri seçin...</option>';
    
    customers.forEach(customer => {
      const option = document.createElement('option');
      option.value = customer.id;
      option.textContent = customer.name;
      customerSelect.appendChild(option);
    });
    
    // Set customer if exists
    if (saleDetails.sale.customer_id) {
      customerSelect.value = saleDetails.sale.customer_id;
    }
    
    // Load all products for item rows
    const products = await window.api.getProducts();
    
    // Add existing items
    if (saleDetails.items.length > 0) {
      saleDetails.items.forEach((item, index) => {
        // Create product dropdown options
        let productOptions = '<option value="">Ürün seçin...</option>';
        products.forEach(product => {
          const selected = product.id === item.product_id ? 'selected' : '';
          productOptions += `<option value="${product.id}" data-price="${product.price}" data-stock="${product.stock_quantity}" ${selected}>${product.name}</option>`;
        });
        
        // Create new row
        const newRow = tbody.insertRow();
        newRow.innerHTML = `
          <td>
            <select class="form-select product-select" data-row="${index}" required>
              ${productOptions}
            </select>
          </td>
          <td>
            <input type="text" class="form-control item-price" data-row="${index}" value="${window.Utils.formatCurrency(item.price)}" readonly>
          </td>
          <td>
            <input type="number" class="form-control item-quantity" data-row="${index}" value="${item.quantity}" min="1" required>
          </td>
          <td>
            <input type="text" class="form-control item-total" data-row="${index}" value="${window.Utils.formatCurrency(item.price * item.quantity)}" readonly>
          </td>
          <td>
            <button type="button" class="btn btn-sm btn-outline-danger remove-item" data-row="${index}">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        `;
        
        // Add event listeners to the new row
        const productSelect = newRow.querySelector('.product-select');
        const quantityInput = newRow.querySelector('.item-quantity');
        const removeButton = newRow.querySelector('.remove-item');
        
        productSelect.addEventListener('change', updateItemRow);
        quantityInput.addEventListener('change', updateItemRow);
        removeButton.addEventListener('click', () => {
          newRow.remove();
          updateSaleTotal();
          
          if (tbody.rows.length === 0) {
            tbody.innerHTML = `
              <tr id="empty-item-row">
                <td colspan="5" class="text-center">Henüz ürün eklenmedi</td>
              </tr>
            `;
          }
        });
      });
    } else {
      // No items, show empty row
      tbody.innerHTML = `
        <tr id="empty-item-row">
          <td colspan="5" class="text-center">Henüz ürün eklenmedi</td>
        </tr>
      `;
    }
    
    // Update total
    updateSaleTotal();
    
    // Set payment type and cheque date if exists
    if (saleDetails.sale.payment_type) {
      document.getElementById('sale-payment-type').value = saleDetails.sale.payment_type;
      if (saleDetails.sale.payment_type === 'cheque') {
        document.getElementById('cheque-date-group').style.display = '';
        document.getElementById('sale-cheque-date').value = saleDetails.sale.cheque_date || '';
      } else {
        document.getElementById('cheque-date-group').style.display = 'none';
        document.getElementById('sale-cheque-date').value = '';
      }
    } else {
      document.getElementById('sale-payment-type').value = 'cash';
      document.getElementById('cheque-date-group').style.display = 'none';
      document.getElementById('sale-cheque-date').value = '';
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
      const modalElement = document.getElementById('saleModal');
      const newModal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
      });
      
      // Make sure form inputs are enabled before showing modal
      const formInputs = modalElement.querySelectorAll('input, textarea, select');
      formInputs.forEach(input => {
        input.disabled = false;
        input.removeAttribute('readonly');
      });
      
      newModal.show();
      
      // Force focus after modal is visible
      setTimeout(() => {
        const customerSelect = document.getElementById('sale-customer');
        if (customerSelect) {
          customerSelect.focus();
          customerSelect.click();
        }
      }, 300);
    }, 100);
  } catch (error) {
    console.error('Satış düzenleme formu hazırlanırken hata:', error);
    window.api.logError('Satış düzenleme formu hazırlama hatası: ' + error.message);
    window.Utils.showAlert('danger', 'Satış düzenleme formu hazırlanırken hata oluştu: ' + error.message);
  }
}

// Open delete confirmation modal
function openDeleteModal(saleId) {
  document.getElementById('delete-sale-hidden-id').value = saleId;
  document.getElementById('delete-sale-id').textContent = `#${saleId}`;
  
  const deleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
  deleteModal.show();
}

// Confirm sale deletion
function confirmDeleteSale() {
  const saleId = document.getElementById('delete-sale-hidden-id').value;
  
  if (!saleId) {
    window.Utils.showAlert('danger', 'Silinecek satış ID bilgisi eksik');
    return;
  }
  
  window.api.deleteSale(parseInt(saleId))
    .then(() => {
      window.Utils.showAlert('success', 'Satış başarıyla silindi');
      
      // Close delete confirmation modal
      const deleteModal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
      if (deleteModal) deleteModal.hide();
      
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
          
          // Satış listesini yenile
          loadSales();
        });
      }, 300);
    })
    .catch(error => {
      console.error('Satış silme hatası:', error);
      window.api.logError('Satış silme hatası: ' + error.message);
      
      // Close delete confirmation modal
      const deleteModal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
      if (deleteModal) deleteModal.hide();
      
      window.Utils.showAlert('danger', 'Satış silinirken hata oluştu: ' + error.message);
    });
}

// Taslak seçme modalı ve önizleme fonksiyonları:
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('templateSelectModal')) {
    const modalHtml = `
      <div class="modal fade" id="templateSelectModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Fatura Taslağı Seç</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div id="template-list-modal"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
              <button type="button" class="btn btn-primary" id="select-template-btn">Önizle</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
});

// Taslak seçme modalını açan fonksiyon:
window.openTemplateSelectModal = function(saleId) {
  // Taslakları localStorage'dan al
  const templates = JSON.parse(localStorage.getItem('printTemplatesV3') || '[]');
  const listDiv = document.getElementById('template-list-modal');
  if (!listDiv) return;
  if (templates.length === 0) {
    listDiv.innerHTML = '<div class="alert alert-warning">Hiç taslak bulunamadı. <a href=\'print-layout.html\' target=\'_blank\'>Yeni taslak oluşturun</a>.</div>';
  } else {
    listDiv.innerHTML = templates.map(t => `
      <div class="form-check">
        <input class="form-check-input" type="radio" name="template-radio-modal" value="${t.name}" id="template-modal-${t.name}">
        <label class="form-check-label" for="template-modal-${t.name}">${t.name}</label>
      </div>
    `).join('');
  }
  // Seçim butonuna event ekle
  document.getElementById('select-template-btn').onclick = function() {
    const selected = document.querySelector('input[name="template-radio-modal"]:checked');
    if (!selected) {
      alert('Bir taslak seçin!');
      return;
    }
    const tpl = templates.find(t => t.name === selected.value);
    if (!tpl) {
      alert('Taslak bulunamadı!');
      return;
    }
    // Modalı kapat
    const modal = bootstrap.Modal.getInstance(document.getElementById('templateSelectModal'));
    if (modal) modal.hide();
    // Önizleme başlat
    previewInvoiceWithTemplate(saleId, tpl);
  };
  // Modalı aç
  const modal = new bootstrap.Modal(document.getElementById('templateSelectModal'));
  modal.show();
};

// Önizleme fonksiyonu:
async function previewInvoiceWithTemplate(saleId, template) {
  try {
    // --- Taslak formatını uygun hale getir ---
    const convertedTemplate = convertTemplateForPrint(template);
    console.log('Yazdırmaya gönderilen taslak:', convertedTemplate);
    if (!window.api || typeof window.api.previewInvoice !== 'function') {
      throw new Error('API bağlantısı yok');
    }
    // Önizleme penceresi açılır
    await window.api.previewInvoice(parseInt(saleId), convertedTemplate);
  } catch (error) {
    window.Utils.showAlert('danger', 'Önizleme açılamadı: ' + error.message);
  }
}

// Taslak objesini yazdırma için uygun formata dönüştür
function convertTemplateForPrint(tpl) {
  // Eğer zaten fields ve appearance varsa, dokunma
  if (tpl.fields && tpl.appearance) return tpl;
  // print-layout.html formatından dönüştür
  const defaultFields = {
    showInvoiceNumber: true,
    showInvoiceDate: true,
    showCustomerInfo: true,
    showProductId: true,
    showProductName: true,
    showProductDescription: false,
    showProductQuantity: true,
    showProductPrice: true,
    showProductTotal: true,
    showDueDate: false
  };
  const fields = { ...defaultFields };
  // selectedFields ve fieldSettings ile alanları güncelle
  if (tpl.selectedFields) {
    Object.keys(fields).forEach(key => {
      fields[key] = tpl.selectedFields.includes(key);
    });
  }
  // appearance ve companyInfo için varsayılanlar
  const appearance = {
    primaryColor: "#343a40",
    secondaryColor: "#f8f9fa",
    font: "Arial, sans-serif",
    borderStyle: "solid",
    headerPosition: "left"
  };
  const companyInfo = {
    name: "",
    address: "",
    phone: "",
    email: "",
    taxOffice: "",
    taxNumber: ""
  };
  // fieldSettings ile font-size gibi şeyler ayarlanabilir (geliştirilebilir)
  return {
    fields,
    appearance,
    companyInfo,
    fieldSettings: tpl.fieldSettings || {},
    selectedFields: tpl.selectedFields || [],
    topOffset: typeof tpl.topOffset === 'number' ? tpl.topOffset : 0,
    bottomOffset: typeof tpl.bottomOffset === 'number' ? tpl.bottomOffset : 0,
    suretFieldSettings: tpl.suretFieldSettings || tpl.fieldSettings || {},
    suretSelectedFields: tpl.suretSelectedFields || tpl.selectedFields || []
  };
} 