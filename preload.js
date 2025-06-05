const { contextBridge, ipcRenderer } = require('electron');

// API'yi pencereye ekle
contextBridge.exposeInMainWorld('api', {
  // Müşteriler
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  getCustomer: (customerId) => ipcRenderer.invoke('get-customer', customerId),
  addCustomer: (customer) => ipcRenderer.invoke('add-customer', customer),
  updateCustomer: (customer) => ipcRenderer.invoke('update-customer', customer),
  deleteCustomer: (customerId) => ipcRenderer.invoke('delete-customer', customerId),
  
  // Ürünler
  getProducts: () => ipcRenderer.invoke('get-products'),
  getProduct: (productId) => ipcRenderer.invoke('get-product', productId),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  updateProduct: (product) => ipcRenderer.invoke('update-product', product),
  updateProductStock: (data) => ipcRenderer.invoke('update-product-stock', data),
  deleteProduct: (productId) => ipcRenderer.invoke('delete-product', productId),
  
  // Satışlar
  addSale: (saleData) => ipcRenderer.invoke('add-sale', saleData),
  updateSale: (saleData) => ipcRenderer.invoke('update-sale', saleData),
  deleteSale: (saleId) => ipcRenderer.invoke('delete-sale', saleId),
  
  // Giderler
  addExpense: (expense) => ipcRenderer.invoke('add-expense', expense),
  getExpenses: () => ipcRenderer.invoke('get-expenses'),
  updateExpense: (expense) => ipcRenderer.invoke('update-expense', expense),
  deleteExpense: (expenseId) => ipcRenderer.invoke('delete-expense', expenseId),
  
  // Raporlar
  getSalesReport: (dateRange) => ipcRenderer.invoke('get-sales-report', dateRange),
  getExpensesReport: (dateRange) => ipcRenderer.invoke('get-expenses-report', dateRange),
  getProfitReport: (dateRange) => ipcRenderer.invoke('get-profit-report', dateRange),
  getProductsReport: (dateRange) => ipcRenderer.invoke('get-products-report', dateRange),
  getCustomersReport: (dateRange) => ipcRenderer.invoke('get-customers-report', dateRange),
  
  // Fatura İşlemleri
  getSaleDetails: (saleId) => ipcRenderer.invoke('get-sale-details', saleId),
  getInvoiceTemplates: () => ipcRenderer.invoke('get-invoice-templates'),
  saveInvoiceTemplate: (template) => ipcRenderer.invoke('save-invoice-template', template),
  getSavedInvoices: () => ipcRenderer.invoke('get-saved-invoices'),
  saveInvoice: (invoiceData) => ipcRenderer.invoke('save-invoice', invoiceData),
  
  // Yazdırma işlemleri
  printInvoice: (saleId, template) => ipcRenderer.invoke('print-invoice', saleId, template),
  printSavedInvoice: (invoiceId) => ipcRenderer.invoke('print-saved-invoice', invoiceId),
  previewInvoice: (saleId, template) => ipcRenderer.invoke('preview-invoice', saleId, template),
  
  // Yaklaşan çek ödemeleri
  getUpcomingCheques: (days) => ipcRenderer.invoke('get-upcoming-cheques', days),
  getAllCheques: () => ipcRenderer.invoke('get-all-cheques'),
  
  // Pencere yenileme
  reloadWindow: () => ipcRenderer.invoke('reload-window'),

  // Geliştirme amaçlı loglama
  log: (message) => {
    console.log(`Renderer Log: ${message}`);
    ipcRenderer.send('log-from-renderer', message);
  },
  logError: (error) => {
    console.error(`Renderer Error: ${error}`);
    ipcRenderer.send('error-from-renderer', error);
  },

  // Basit fatura işlemleri
  getSaleData: () => ipcRenderer.invoke("get-sale-data"),
  basit_print_invoice: () => ipcRenderer.invoke("basit-print-invoice"),
  
  // Gelişmiş Fatura İşlemleri
  generateInvoiceHtml: (saleId, template) => ipcRenderer.invoke('generate-invoice-html', saleId, template),
  exportInvoiceAsPdf: (saleId, template, outputPath) => ipcRenderer.invoke('export-invoice-as-pdf', saleId, template, outputPath),
  
  // Güncelleme İşlemleri
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});

// Electron API'yi de ayrıca ekle (güncelleme event'leri için)
contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, progress) => callback(progress)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, error) => callback(error))
}); 