// invoice.js - Kapsamlı Fatura Modülü
// Bu dosya fatura işlemleri ve önizleme için gereken tüm fonksiyonları içerir

// Fatura işleme ve yazdırma fonksiyonları
class InvoiceManager {
  constructor() {
    this.currentSale = null;
    this.currentTemplate = 'standard'; // 'standard' veya 'a4-form'
    this.companySettings = {
      name: "Finans Yönetim Sistemi",
      address: "İstanbul / Türkiye",
      phone: "+90 555 123 4567",
      email: "info@finansyonetim.com",
      taxOffice: "Kadıköy",
      taxNumber: "12345678901",
      logo: null // Base64 encoded logo
    };
    
    // DOM hazır olduğunda başlatma
    this.isInitialized = false;
    this.initOnDOMReady();
  }
  
  // DOM yüklendikten sonra bir kez çağır
  initOnDOMReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }
  
  // Sınıfı başlat
  initialize() {
    if (this.isInitialized) return;
    
    console.log('InvoiceManager başlatılıyor...');
    
    try {
      // Şablon ayarlarını yükle
      // Firma bilgilerini yükle
      // Diğer başlangıç işlemleri
      
      this.isInitialized = true;
      console.log('InvoiceManager başlatıldı');
    } catch (error) {
      console.error('InvoiceManager başlatılırken hata:', error);
    }
  }

  // Satış verilerini API'den yükler
  async loadSaleData(saleId) {
    try {
      if (!window.api) {
        throw new Error("API erişilemedi. Preload script doğru yüklenmemiş olabilir.");
      }
      
      this.currentSale = await window.api.getSaleDetails(saleId);
      return this.currentSale;
    } catch (error) {
      console.error("Satış verileri yüklenirken hata:", error);
      throw new Error(`Satış verileri yüklenemedi: ${error.message}`);
    }
  }

  // Şablon türüne göre fatura HTML içeriği oluşturur
  generateInvoiceHtml(saleData, templateType) {
    if (!saleData || !saleData.sale) {
      throw new Error("Geçersiz satış verisi");
    }

    switch (templateType || this.currentTemplate) {
      case 'a4-form':
        return this.generateA4FormHtml(saleData);
      case 'standard':
      default:
        return this.generateStandardHtml(saleData);
    }
  }

  // Standart fatura şablonu HTML'i
  generateStandardHtml(saleData) {
    const sale = saleData.sale || {};
    const customer = saleData.customer || {};
    const items = saleData.items || [];
    const invoiceNumber = this.formatInvoiceNumber(sale.id);
    const invoiceDate = this.formatDate(sale.sale_date);
    
    let itemsHtml = '';
    let subtotal = 0;
    
    // Ürün satırlarını oluştur
    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      
      itemsHtml += `
        <tr class="item">
          <td>${item.product_name}</td>
          <td>${item.quantity}</td>
          <td>${this.formatCurrency(item.price)}</td>
          <td>${this.formatCurrency(itemTotal)}</td>
        </tr>
      `;
    });
    
    // KDV hesapla (örnek %18)
    const taxRate = 0.18;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Fatura #${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
          .invoice-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .invoice-title { font-size: 28px; font-weight: bold; margin-bottom: 30px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          table th, table td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
          table th { background-color: #f8f8f8; font-weight: bold; }
          .text-right { text-align: right; }
          .totals { margin-top: 20px; }
          .totals table { width: 300px; margin-left: auto; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
          
          @media print {
            body { margin: 0; background-color: white; }
            .invoice-box { box-shadow: none; border: none; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="invoice-header">
            <div>
              <h2>${this.companySettings.name}</h2>
              <p>
                ${this.companySettings.address}<br>
                Tel: ${this.companySettings.phone}<br>
                E-posta: ${this.companySettings.email}<br>
                Vergi Dairesi: ${this.companySettings.taxOffice}<br>
                Vergi No: ${this.companySettings.taxNumber}
              </p>
            </div>
            <div>
              <h1 class="invoice-title">FATURA</h1>
              <p><strong>Fatura No:</strong> ${invoiceNumber}</p>
              <p><strong>Tarih:</strong> ${invoiceDate}</p>
            </div>
          </div>
          
          <div>
            <h3>Müşteri Bilgileri:</h3>
            <p>
              <strong>${customer.name || 'Misafir Müşteri'}</strong><br>
              ${customer.address || ''}<br>
              ${customer.phone || ''}
            </p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Ürün / Hizmet</th>
                <th>Miktar</th>
                <th>Birim Fiyat</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="totals">
            <table>
              <tr>
                <td>Ara Toplam:</td>
                <td class="text-right">${this.formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td>KDV (%${taxRate * 100}):</td>
                <td class="text-right">${this.formatCurrency(taxAmount)}</td>
              </tr>
              <tr>
                <td><strong>Genel Toplam:</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(totalAmount)}</strong></td>
              </tr>
            </table>
          </div>
          
          <div class="footer">
            <p>Bu bir elektronik belgedir. İmza gerekmemektedir.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // A4 Hazır Form üzerine yazdırma için HTML
  generateA4FormHtml(saleData) {
    const sale = saleData.sale || {};
    const customer = saleData.customer || {};
    const items = saleData.items || [];
    const invoiceNumber = this.formatInvoiceNumber(sale.id);
    const invoiceDate = this.formatDate(sale.sale_date);
    
    // A4 formdaki belirli konumlara yerleştirilecek veriler için CSS pozisyonları
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Fatura #${invoiceNumber}</title>
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          .form-container { position: relative; width: 210mm; height: 297mm; }
          .field { position: absolute; font-size: 12px; }
          
          /* Form alanları ve konumları */
          #invoiceNumber { top: 50px; left: 430px; }
          #invoiceDate { top: 80px; left: 430px; }
          #customerName { top: 120px; left: 60px; }
          #customerAddress { top: 140px; left: 60px; }
          #customerPhone { top: 160px; left: 60px; }
          
          /* Ürün tablosu başlangıç konumu */
          .product-table { position: absolute; top: 200px; left: 60px; width: 500px; }
          .product-row { position: relative; margin-bottom: 8px; }
          .product-name { display: inline-block; width: 250px; }
          .product-qty { display: inline-block; width: 50px; text-align: center; }
          .product-price { display: inline-block; width: 80px; text-align: right; }
          .product-total { display: inline-block; width: 80px; text-align: right; }
          
          #subtotal { top: 550px; left: 430px; }
          #tax { top: 575px; left: 430px; }
          #totalAmount { top: 600px; left: 430px; font-weight: bold; }
          
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="form-container">
          <!-- Sabit form alanları -->
          <div class="field" id="invoiceNumber">${invoiceNumber}</div>
          <div class="field" id="invoiceDate">${invoiceDate}</div>
          <div class="field" id="customerName">${customer.name || 'Misafir Müşteri'}</div>
          <div class="field" id="customerAddress">${customer.address || ''}</div>
          <div class="field" id="customerPhone">${customer.phone || ''}</div>
          
          <!-- Ürün tablosu -->
          <div class="product-table">
            ${items.map((item, index) => {
              const itemTotal = item.price * item.quantity;
              return `
                <div class="product-row">
                  <div class="product-name">${item.product_name}</div>
                  <div class="product-qty">${item.quantity}</div>
                  <div class="product-price">${this.formatCurrency(item.price)}</div>
                  <div class="product-total">${this.formatCurrency(itemTotal)}</div>
                </div>
              `;
            }).join('')}
          </div>
          
          <!-- Toplam alanları -->
          ${(() => {
            let subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const taxRate = 0.18;
            const taxAmount = subtotal * taxRate;
            const totalAmount = subtotal + taxAmount;
            
            return `
              <div class="field" id="subtotal">${this.formatCurrency(subtotal)}</div>
              <div class="field" id="tax">${this.formatCurrency(taxAmount)}</div>
              <div class="field" id="totalAmount">${this.formatCurrency(totalAmount)}</div>
            `;
          })()}
        </div>
      </body>
      </html>
    `;
  }

  // Fatura yazdırma işlemi
  async printInvoice(saleId, templateType) {
    try {
      if (!window.api) {
        throw new Error("API erişilemedi. Preload script doğru yüklenmemiş olabilir.");
      }
      
      // Şablon ayarları
      const template = this.getTemplateSettings(templateType);
      
      // Yazdırma işlemini API üzerinden gerçekleştir
      const result = await window.api.printInvoice(saleId, template);
      
      if (result.success) {
        console.log("Fatura başarıyla yazdırıldı.");
        return { success: true };
      } else {
        throw new Error(result.error || "Yazdırma sırasında bir hata oluştu");
      }
    } catch (error) {
      console.error("Fatura yazdırılırken hata:", error);
      return { success: false, error: error.message };
    }
  }

  // Şablon ayarlarını döndür
  getTemplateSettings(templateType) {
    switch (templateType || this.currentTemplate) {
      case 'a4-form':
        return {
          type: 'a4-form',
          readyPrintSettings: {
            invoiceHeight: 140, // mm
            margins: { top: 0, left: 0, right: 0, bottom: 0 }
          },
          fields: {
            showInvoiceNumber: true,
            showInvoiceDate: true,
            showCustomerInfo: true,
            showProductId: false,
            showProductName: true,
            showProductQuantity: true,
            showProductPrice: true,
            showProductTotal: true
          },
          appearance: {
            primaryColor: "#333333",
            secondaryColor: "#f8f8f8"
          }
        };
        
      case 'standard':
      default:
        return {
          type: 'standard',
          fields: {
            invoiceTitle: "FATURA",
            showInvoiceNumber: true,
            showInvoiceDate: true,
            showCustomerInfo: true,
            showProductId: true,
            showProductName: true,
            showProductQuantity: true,
            showProductPrice: true,
            showProductTotal: true
          },
          companyInfo: {
            name: this.companySettings.name,
            address: this.companySettings.address,
            phone: this.companySettings.phone,
            email: this.companySettings.email,
            taxOffice: this.companySettings.taxOffice,
            taxNumber: this.companySettings.taxNumber,
            logo: this.companySettings.logo
          },
          appearance: {
            primaryColor: "#343a40",
            secondaryColor: "#f8f9fa",
            showLogo: !!this.companySettings.logo,
            font: "Arial, sans-serif",
            borderStyle: "solid",
            headerPosition: "left"
          }
        };
    }
  }

  // Fatura numarası formatla
  formatInvoiceNumber(id) {
    if (!id) return "---";
    const date = new Date();
    return `FTR-${date.getFullYear()}-${String(id).padStart(4, '0')}`;
  }

  // Tarihi formatla
  formatDate(dateString) {
    if (!dateString) return "---";
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  }

  // Para birimi formatla
  formatCurrency(amount) {
    if (amount === undefined || amount === null) return "---";
    try {
      return new Intl.NumberFormat('tr-TR', { 
        style: 'currency', 
        currency: 'TRY',
        minimumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      console.error("Para birimi formatlarken hata:", error);
      return amount + " TL";
    }
  }

  // Firma ayarlarını güncelle
  updateCompanySettings(settings) {
    this.companySettings = { ...this.companySettings, ...settings };
  }

  // Şablon renklerini güncelle
  updateTemplateColors(primaryColor, secondaryColor) {
    const template = this.getTemplateSettings(this.currentTemplate);
    template.appearance.primaryColor = primaryColor;
    template.appearance.secondaryColor = secondaryColor;
    return template;
  }
}

// Modül dışa aktarma
document.addEventListener('DOMContentLoaded', function() {
  console.log('invoice.js yüklendi, InvoiceManager küresel olarak tanımlanıyor...');
  window.InvoiceManager = new InvoiceManager();
}); 