// components.js - Ortak bileşenler

// Sidebar HTML'ini oluşturan fonksiyon
function createSidebar(activePage) {
  const sidebarItems = [
    { id: "dashboard", icon: "speedometer2", text: "Gösterge Paneli" },
    { id: "customers", icon: "people", text: "Müşteriler" },
    { id: "products", icon: "box", text: "Ürünler" },
    { id: "sales", icon: "cart", text: "Satışlar" },
    { id: "expenses", icon: "cash", text: "Giderler" },
    { id: "reports", icon: "bar-chart", text: "Raporlar" }
  ];
  
  let sidebarHTML = `
    <div class="col-md-2 sidebar">
      <h4 class="text-center mb-4">Finans Yönetim</h4>
      <ul class="nav flex-column">
  `;
  
  sidebarItems.forEach(item => {
    const isActive = item.id === activePage ? "active" : "";
    const pageUrl = item.id === "dashboard" ? "index.html" : `${item.id}.html`;
    
    sidebarHTML += `
      <li class="nav-item">
        <a class="nav-link ${isActive}" href="${pageUrl}">
          <i class="bi bi-${item.icon}"></i> ${item.text}
        </a>
      </li>
    `;
  });
  
  sidebarHTML += `
      </ul>
    </div>
  `;
  
  return sidebarHTML;
}

// Header ve style elemanlarını içeren fonksiyon
function createHeader(pageTitle) {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${pageTitle} - Finans Yönetim Sistemi</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
      <link rel="stylesheet" href="../assets/styles.css">
    </head>
  `;
}

// Footer HTML'ini oluşturan fonksiyon
function createFooter(includeChartJS = false) {
  let scripts = `
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  `;
  
  if (includeChartJS) {
    scripts += `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`;
  }
  
  scripts += `
    <script src="../renderer.js"></script>
    <script>
      // Sayfa yüklendikten sonra sidebarı otomatik olarak oluştur
      document.addEventListener('DOMContentLoaded', () => {
        // Sayfa içeriğini ve bileşenlerini yükle
        window.api?.log('Sayfa yüklendi: ' + document.title);
      });
    </script>
  `;
  
  return scripts + `
    </body>
    </html>
  `;
}

// Dışarıya fonksiyonları açıyoruz
window.Components = {
  createSidebar,
  createHeader,
  createFooter
}; 