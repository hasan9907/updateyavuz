// renderer.js
// Fatura yazdırma işlemlerini yönetir

function renderInvoice(saleData) {
  document.getElementById('invoiceNumber').innerText = saleData.invoiceNo;
  document.getElementById('invoiceDate').innerText = saleData.date;
  document.getElementById('customerName').innerText = saleData.customer;

  const productsDiv = document.getElementById('products');
  productsDiv.innerHTML = '';
  saleData.items.forEach((item, index) => {
    const y = 200 + index * 25;
    productsDiv.innerHTML += `
      <div class="field" style="top:${y}px; left:60px;">${item.name}</div>
      <div class="field" style="top:${y}px; left:350px;">${item.qty}</div>
      <div class="field" style="top:${y}px; left:430px;">₺${item.total}</div>
    `;
  });

  document.getElementById('totalAmount').innerText = `₺${saleData.total}`;
}

// API üzerinden fatura verilerini al ve doldur
function initInvoice() {
  window.api.getSaleData().then(renderInvoice).catch(err => {
    console.error("Fatura verisi alınamadı:", err);
    // Hata durumunda demo verileri göster
    demoInvoice();
  });
}

// Demo bir satış verisiyle test et
function demoInvoice() {
  const demoData = {
    invoiceNo: "TEST123",
    date: new Date().toLocaleDateString('tr-TR'),
    customer: "Test Müşteri",
    items: [
      { name: "Ürün 1", qty: 2, total: 100 },
      { name: "Ürün 2", qty: 1, total: 200 },
      { name: "Ürün 3", qty: 3, total: 150 }
    ],
    total: 450
  };
  renderInvoice(demoData);
}

// Gerçek bir satışın faturasını bastırmak için orjinal API
function printSaleInvoice(saleId) {
  // Mevcut API kullanımı
  if (saleId) {
    window.api.printInvoice(saleId);
  } else {
    console.error("Satış ID belirtilmedi!");
  }
}

// A4 hazır formlar için basit yazdırma
function printBasicInvoice() {
  window.api.basit_print_invoice().catch(err => {
    console.error("Fatura yazdırma hatası:", err);
  });
}

// Ayarlar sayfası fonksiyonları
function saveGeneralSettings() {
  const companyName = document.getElementById('companyName').value;
  const companyAddress = document.getElementById('companyAddress').value;
  const taxOffice = document.getElementById('taxOffice').value;
  const taxNumber = document.getElementById('taxNumber').value;

  // localStorage'a kaydet
  localStorage.setItem('companyName', companyName);
  localStorage.setItem('companyAddress', companyAddress);
  localStorage.setItem('taxOffice', taxOffice);
  localStorage.setItem('taxNumber', taxNumber);

  // Başarı mesajı göster
  showNotification('Ayarlar başarıyla kaydedildi!', 'success');
}

function loadGeneralSettings() {
  const companyName = localStorage.getItem('companyName') || '';
  const companyAddress = localStorage.getItem('companyAddress') || '';
  const taxOffice = localStorage.getItem('taxOffice') || '';
  const taxNumber = localStorage.getItem('taxNumber') || '';

  if (document.getElementById('companyName')) {
    document.getElementById('companyName').value = companyName;
  }
  if (document.getElementById('companyAddress')) {
    document.getElementById('companyAddress').value = companyAddress;
  }
  if (document.getElementById('taxOffice')) {
    document.getElementById('taxOffice').value = taxOffice;
  }
  if (document.getElementById('taxNumber')) {
    document.getElementById('taxNumber').value = taxNumber;
  }
}

// Güncelleme fonksiyonları
async function checkForUpdates() {
  const btn = document.getElementById('checkUpdatesBtn');
  const status = document.getElementById('updateStatus');
  const statusText = document.getElementById('updateStatusText');
  
  if (!btn || !status || !statusText) return;
  
  btn.disabled = true;
  status.classList.remove('d-none');
  statusText.textContent = 'Güncellemeler kontrol ediliyor...';
  hideAllUpdateAlerts();

  try {
    if (window.api && window.api.checkForUpdates) {
      const result = await window.api.checkForUpdates();
      
      if (result.success && result.hasUpdate) {
        showUpdateAvailable();
      } else {
        showUpdateNotAvailable();
      }
    } else {
      showUpdateNotAvailable();
    }
  } catch (error) {
    console.error('Güncelleme kontrolü hatası:', error);
    showUpdateError('Güncelleme kontrolü sırasında hata oluştu: ' + error.message);
  } finally {
    btn.disabled = false;
    status.classList.add('d-none');
  }
}

async function downloadUpdate() {
  const btn = document.getElementById('downloadBtn');
  const status = document.getElementById('updateStatus');
  const statusText = document.getElementById('updateStatusText');
  
  if (!btn) return;
  
  btn.disabled = true;
  
  if (status) status.classList.remove('d-none');
  if (statusText) statusText.textContent = 'Güncelleme indiriliyor...';
  
  try {
    if (window.api && window.api.downloadUpdate) {
      console.log('Güncelleme indirme başlatılıyor...');
      const result = await window.api.downloadUpdate();
      console.log('İndirme sonucu:', result);
      
      if (!result.success) {
        showUpdateError('Güncelleme indirme hatası: ' + result.error);
        btn.disabled = false;
        if (status) status.classList.add('d-none');
      } else {
        showNotification('Güncelleme indirme başlatıldı. Lütfen bekleyin...', 'info');
      }
    }
  } catch (error) {
    console.error('İndirme hatası:', error);
    showUpdateError('İndirme sırasında hata oluştu: ' + error.message);
    btn.disabled = false;
    if (status) status.classList.add('d-none');
  }
}

async function installUpdate() {
  if (confirm('Uygulama kapatılacak ve güncelleme yüklenecek. Devam etmek istiyor musunuz?')) {
    try {
      if (window.api && window.api.quitAndInstall) {
        await window.api.quitAndInstall();
      }
    } catch (error) {
      console.error('Yükleme hatası:', error);
      showUpdateError('Yükleme sırasında hata oluştu: ' + error.message);
    }
  }
}

function hideAllUpdateAlerts() {
  const alerts = ['updateAvailable', 'updateNotAvailable', 'updateDownloaded'];
  alerts.forEach(alertId => {
    const element = document.getElementById(alertId);
    if (element) element.classList.add('d-none');
  });
}

function showUpdateAvailable() {
  hideAllUpdateAlerts();
  const element = document.getElementById('updateAvailable');
  const downloadBtn = document.getElementById('downloadBtn');
  if (element) element.classList.remove('d-none');
  if (downloadBtn) downloadBtn.classList.remove('d-none');
}

function showUpdateNotAvailable() {
  hideAllUpdateAlerts();
  const element = document.getElementById('updateNotAvailable');
  if (element) element.classList.remove('d-none');
}

function showUpdateDownloaded() {
  hideAllUpdateAlerts();
  const element = document.getElementById('updateDownloaded');
  const downloadBtn = document.getElementById('downloadBtn');
  const installBtn = document.getElementById('installBtn');
  if (element) element.classList.remove('d-none');
  if (downloadBtn) downloadBtn.classList.add('d-none');
  if (installBtn) installBtn.classList.remove('d-none');
}

function showUpdateError(message) {
  hideAllUpdateAlerts();
  showNotification(message, 'error');
}

// Yedekleme fonksiyonları
function createBackup() {
  showNotification('Yedekleme özelliği yakında eklenecek!', 'info');
}

function restoreBackup() {
  showNotification('Geri yükleme özelliği yakında eklenecek!', 'info');
}

// Bildirim gösterme fonksiyonu
function showNotification(message, type = 'info') {
  // Mevcut bildirimleri temizle
  const existingNotifications = document.querySelectorAll('.notification-toast');
  existingNotifications.forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} notification-toast`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;
  
  notification.innerHTML = `
    <div class="d-flex align-items-center">
      <i class="bi bi-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
      <span>${message}</span>
      <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
    </div>
  `;

  document.body.appendChild(notification);

  // 5 saniye sonra otomatik kaldır
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
  // Aktif satış varsa yükle, yoksa demo göster
  initInvoice();
  
  // Ayarları yükle
  loadGeneralSettings();
  
  // Mevcut sürüm bilgisini göster
  const versionElement = document.getElementById('currentVersion');
  if (versionElement) {
    versionElement.textContent = '1.0.5';
  }
  
  // Auto-updater event listener'larını ekle
  if (window.electronAPI) {
    console.log('Event listener\'lar kayıt ediliyor...');
    
    window.electronAPI.onUpdateAvailable((info) => {
      console.log('Update available event:', info);
      showNotification(`Yeni sürüm mevcut: v${info.version}`, 'info');
      showUpdateAvailable();
    });
    
    window.electronAPI.onUpdateDownloaded((info) => {
      console.log('Update downloaded event:', info);
      showNotification('Güncelleme indirildi! Yükleme için uygulamayı yeniden başlatın.', 'success');
      showUpdateDownloaded();
      
      // Status'u gizle
      const status = document.getElementById('updateStatus');
      if (status) status.classList.add('d-none');
    });
    
    window.electronAPI.onDownloadProgress((progress) => {
      console.log('Download progress event:', progress);
      const statusText = document.getElementById('updateStatusText');
      const status = document.getElementById('updateStatus');
      
      if (statusText) {
        statusText.textContent = `İndiriliyor... ${Math.round(progress.percent)}%`;
      }
      if (status) {
        status.classList.remove('d-none');
      }
      
      // Progress bar varsa güncelle
      const progressBar = document.getElementById('downloadProgressBar');
      if (progressBar) {
        progressBar.style.width = `${progress.percent}%`;
        progressBar.setAttribute('aria-valuenow', progress.percent);
      }
    });
    
    window.electronAPI.onUpdateError((error) => {
      console.log('Update error event:', error);
      showUpdateError('Güncelleme hatası: ' + error);
      
      // Status'u gizle ve butonları yeniden aktif et
      const status = document.getElementById('updateStatus');
      const downloadBtn = document.getElementById('downloadBtn');
      if (status) status.classList.add('d-none');
      if (downloadBtn) downloadBtn.disabled = false;
    });
  } else {
    console.log('electronAPI mevcut değil!');
  }
  
  // Basit form yazdırma testi için buton ekle (isteğe bağlı)
  /*
  const testBtn = document.createElement('button');
  testBtn.textContent = "Fatura Yazdır";
  testBtn.style.position = "fixed";
  testBtn.style.top = "10px";
  testBtn.style.right = "10px";
  testBtn.addEventListener('click', printBasicInvoice);
  document.body.appendChild(testBtn);
  */
});
