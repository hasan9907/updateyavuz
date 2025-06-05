// Yaklaşan çek ödemeleri sayfası JS

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('cheques-table-container');
  try {
    if (!window.api || typeof window.api.getUpcomingCheques !== 'function' || typeof window.api.getAllCheques !== 'function') {
      container.innerHTML = '<div class="alert alert-danger">API bağlantısı yok.</div>';
      return;
    }
    // Önce 30 gün içinde yaklaşanları çek
    const cheques = await window.api.getUpcomingCheques(30);
    // Sonra tüm çekli satışları çek
    const allCheques = await window.api.getAllCheques();
    // Tarih filtresi ve başlık
    let html = `<div class="mb-3">
      <h4>Tüm Çekli Satışlar</h4>
      <div class="text-muted mb-2">Aşağıda geçmiş ve gelecek tüm çekli satışları görebilirsiniz.</div>
    </div>`;
    if (!allCheques || allCheques.length === 0) {
      html += '<div class="alert alert-info">Hiç çekli satış bulunamadı.</div>';
      container.innerHTML = html;
      return;
    }
    html += `<div class="table-responsive"><table class="table table-bordered align-middle">
      <thead class="table-light">
        <tr>
          <th>Müşteri</th>
          <th>Çek Tarihi</th>
          <th>Tutar</th>
          <th>İşlem</th>
        </tr>
      </thead>
      <tbody>`;
    allCheques.forEach(row => {
      html += `<tr>
        <td>${row.customer_name || '-'}</td>
        <td>${window.Utils.formatDate(row.cheque_date)}</td>
        <td>${window.Utils.formatCurrency(row.total_amount)}</td>
        <td><a href="sales.html?saleId=${row.id}" class="btn btn-sm btn-outline-primary">Satışa Git</a></td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    // Eğer yaklaşan çek varsa üstte ayrıca göster
    if (cheques && cheques.length > 0) {
      html = `<div class="mb-4">
        <h4 class="text-warning">Yaklaşan Çek Ödemeleri (30 gün)</h4>
        <div class="table-responsive"><table class="table table-bordered align-middle">
          <thead class="table-light">
            <tr>
              <th>Müşteri</th>
              <th>Çek Tarihi</th>
              <th>Tutar</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>` +
        cheques.map(row => `
          <tr>
            <td>${row.customer_name || '-'}</td>
            <td>${window.Utils.formatDate(row.cheque_date)}</td>
            <td>${window.Utils.formatCurrency(row.total_amount)}</td>
            <td><a href="sales.html?saleId=${row.id}" class="btn btn-sm btn-outline-primary">Satışa Git</a></td>
          </tr>`).join('') +
        '</tbody></table></div></div>' + html;
    }
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Hata: ${err.message}</div>`;
  }
}); 