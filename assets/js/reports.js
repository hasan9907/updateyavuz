// Reports management functions

document.addEventListener('DOMContentLoaded', () => {
  initializeReportEvents();
  setDefaultDates();
});

// Initialize report related event listeners
function initializeReportEvents() {
  // Generate report button click
  document.getElementById('generate-report').addEventListener('click', generateReport);
  
  // Print report button click
  document.getElementById('print-report').addEventListener('click', printReport);
  
  // Export report button click
  document.getElementById('export-report').addEventListener('click', exportReport);
  
  // Report type change
  document.getElementById('report-type').addEventListener('change', updateReportTitle);
}

// Set default date filters to current month
function setDefaultDates() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  document.getElementById('report-date-start').valueAsDate = startOfMonth;
  document.getElementById('report-date-end').valueAsDate = endOfMonth;
  
  // Also update the report title
  updateReportTitle();
}

// Update report title based on selected report type
function updateReportTitle() {
  const reportType = document.getElementById('report-type').value;
  const reportTitleElement = document.getElementById('report-title');
  
  const reportTitles = {
    'summary': 'Özet Rapor',
    'sales': 'Satış Raporu',
    'expenses': 'Gider Raporu',
    'profit': 'Kâr Raporu',
    'products': 'Ürün Satış Raporu',
    'customers': 'Müşteri Satış Raporu'
  };
  
  reportTitleElement.textContent = reportTitles[reportType] || 'Rapor';
}

// Generate a report based on selected filters
async function generateReport() {
  try {
    const reportType = document.getElementById('report-type').value;
    const startDate = document.getElementById('report-date-start').value;
    const endDate = document.getElementById('report-date-end').value;
    
    if (!startDate || !endDate) {
      window.Utils.showAlert('warning', 'Lütfen tarih aralığını belirtiniz.');
      return;
    }
    
    const dateRange = {
      startDate: startDate,
      endDate: endDate
    };
    
    // Show loading
    const reportContainer = document.getElementById('report-container');
    reportContainer.innerHTML = '<div class="text-center"><p>Rapor oluşturuluyor...</p><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Yükleniyor...</span></div></div>';
    
    switch (reportType) {
      case 'summary':
        await generateSummaryReport(dateRange);
        break;
      case 'sales':
        await generateSalesReport(dateRange);
        break;
      case 'expenses':
        await generateExpensesReport(dateRange);
        break;
      case 'profit':
        await generateProfitReport(dateRange);
        break;
      case 'products':
        await generateProductsReport(dateRange);
        break;
      case 'customers':
        await generateCustomersReport(dateRange);
        break;
      default:
        throw new Error('Geçersiz rapor tipi.');
    }
    
  } catch (error) {
    console.error('Rapor oluşturulurken hata:', error);
    window.api.logError('Rapor oluşturma hatası: ' + error.message);
    
    const reportContainer = document.getElementById('report-container');
    reportContainer.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Rapor oluşturulurken hata oluştu: ${error.message}
      </div>
    `;
  }
}

// Generate summary report
async function generateSummaryReport(dateRange) {
  // Get all necessary data
  const [salesReport, expensesReport, profitReport] = await Promise.all([
    window.api.getSalesReport(dateRange),
    window.api.getExpensesReport(dateRange),
    window.api.getProfitReport(dateRange)
  ]);
  
  // Format date range for display
  const startDate = window.Utils.formatDate(dateRange.startDate);
  const endDate = window.Utils.formatDate(dateRange.endDate);
  
  // Create report HTML
  const reportContainer = document.getElementById('report-container');
  reportContainer.innerHTML = `
    <div class="report-summary">
      <div class="text-center mb-4">
        <h4>Özet Rapor</h4>
        <p>${startDate} - ${endDate}</p>
      </div>
      
      <div class="row mb-4">
        <div class="col-md-4">
          <div class="card bg-primary text-white">
            <div class="card-body text-center">
              <h5 class="card-title">Toplam Satış</h5>
              <h3>${window.Utils.formatCurrency(salesReport.totalAmount)}</h3>
              <p>${salesReport.sales.length} satış işlemi</p>
            </div>
          </div>
        </div>
        
        <div class="col-md-4">
          <div class="card bg-danger text-white">
            <div class="card-body text-center">
              <h5 class="card-title">Toplam Gider</h5>
              <h3>${window.Utils.formatCurrency(expensesReport.totalAmount)}</h3>
              <p>${expensesReport.expenses.length} gider kaydı</p>
            </div>
          </div>
        </div>
        
        <div class="col-md-4">
          <div class="card bg-success text-white">
            <div class="card-body text-center">
              <h5 class="card-title">Net Kâr</h5>
              <h3>${window.Utils.formatCurrency(profitReport.totalProfit)}</h3>
              <p>Kâr Marjı: ${(profitReport.profitMargin * 100).toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">Aylık Satış ve Giderler</div>
            <div class="card-body">
              <canvas id="monthly-chart"></canvas>
            </div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">Kategori Bazında Giderler</div>
            <div class="card-body">
              <canvas id="expense-category-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Create monthly chart
  createMonthlySalesExpensesChart(salesReport, expensesReport);
  
  // Create expense category chart
  createExpenseCategoryChart(expensesReport);
}

// Create monthly sales and expenses chart
function createMonthlySalesExpensesChart(salesReport, expensesReport) {
  // Prepare data
  const months = {};
  
  // Process sales data
  salesReport.monthlySales.forEach(monthly => {
    months[monthly.month] = {
      sales: monthly.amount,
      expenses: 0
    };
  });
  
  // Process expense data
  expensesReport.monthlyExpenses.forEach(monthly => {
    if (!months[monthly.month]) {
      months[monthly.month] = {
        sales: 0,
        expenses: 0
      };
    }
    months[monthly.month].expenses = monthly.amount;
  });
  
  // Sort months
  const sortedMonths = Object.keys(months).sort();
  
  // Format month labels (YYYY-MM to MMM YYYY)
  const labels = sortedMonths.map(month => {
    const [year, monthNum] = month.split('-');
    const date = new Date(year, parseInt(monthNum) - 1, 1);
    return date.toLocaleString('tr-TR', { month: 'short', year: 'numeric' });
  });
  
  // Prepare dataset values
  const salesData = sortedMonths.map(month => months[month].sales);
  const expensesData = sortedMonths.map(month => months[month].expenses);
  
  // Create chart
  const ctx = document.getElementById('monthly-chart').getContext('2d');
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Satışlar',
          data: salesData,
          backgroundColor: 'rgba(13, 110, 253, 0.7)',
          borderColor: 'rgba(13, 110, 253, 1)',
          borderWidth: 1
        },
        {
          label: 'Giderler',
          data: expensesData,
          backgroundColor: 'rgba(220, 53, 69, 0.7)',
          borderColor: 'rgba(220, 53, 69, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return window.Utils.formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// Create expense category chart
function createExpenseCategoryChart(expensesReport) {
  // Group expenses by category
  const categories = {};
  
  expensesReport.expenses.forEach(expense => {
    const category = expense.category || 'Diğer';
    if (!categories[category]) {
      categories[category] = 0;
    }
    categories[category] += expense.amount;
  });
  
  // Convert to arrays for chart
  const categoryLabels = Object.keys(categories);
  const categoryData = Object.values(categories);
  
  // Random colors for categories
  const backgroundColors = categoryLabels.map(() => 
    `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`
  );
  
  // Create chart
  const ctx = document.getElementById('expense-category-chart').getContext('2d');
  
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: categoryLabels,
      datasets: [{
        data: categoryData,
        backgroundColor: backgroundColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.label || '';
              if (label) {
                label += ': ';
              }
              label += window.Utils.formatCurrency(context.raw);
              return label;
            }
          }
        }
      }
    }
  });
}

// Generate sales report
async function generateSalesReport(dateRange) {
  const salesReport = await window.api.getSalesReport(dateRange);
  
  // Format date range for display
  const startDate = window.Utils.formatDate(dateRange.startDate);
  const endDate = window.Utils.formatDate(dateRange.endDate);
  
  // Create report HTML
  const reportContainer = document.getElementById('report-container');
  
  // Build table HTML
  let salesTableHTML = `
    <table class="table table-striped table-bordered">
      <thead>
        <tr>
          <th>ID</th>
          <th>Tarih</th>
          <th>Müşteri</th>
          <th>Toplam Tutar</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  if (salesReport.sales.length === 0) {
    salesTableHTML += '<tr><td colspan="4" class="text-center">Bu tarih aralığında satış bulunamadı</td></tr>';
  } else {
    salesReport.sales.forEach(sale => {
      salesTableHTML += `
        <tr>
          <td>${sale.id}</td>
          <td>${window.Utils.formatDateTime(sale.sale_date)}</td>
          <td>${sale.customer_name || 'Anonim'}</td>
          <td class="text-end">${window.Utils.formatCurrency(sale.total_amount)}</td>
        </tr>
      `;
    });
  }
  
  salesTableHTML += `
      </tbody>
      <tfoot>
        <tr>
          <th colspan="3" class="text-end">Toplam:</th>
          <th class="text-end">${window.Utils.formatCurrency(salesReport.totalAmount)}</th>
        </tr>
      </tfoot>
    </table>
  `;
  
  // Full report HTML
  reportContainer.innerHTML = `
    <div class="report-sales">
      <div class="text-center mb-4">
        <h4>Satış Raporu</h4>
        <p>${startDate} - ${endDate}</p>
      </div>
      
      <div class="mb-4">
        <div class="row mb-3">
          <div class="col-md-4">
            <div class="card bg-primary text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Toplam Satış</h5>
                <h3>${window.Utils.formatCurrency(salesReport.totalAmount)}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-info text-white">
              <div class="card-body text-center">
                <h5 class="card-title">İşlem Sayısı</h5>
                <h3>${salesReport.sales.length}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-secondary text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Ortalama Satış</h5>
                <h3>${salesReport.sales.length > 0 ? window.Utils.formatCurrency(salesReport.totalAmount / salesReport.sales.length) : window.Utils.formatCurrency(0)}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mb-4">
        <h5>Satış Listesi</h5>
        <div class="table-responsive">
          ${salesTableHTML}
        </div>
      </div>
      
      <div class="row">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header">Aylık Satış Grafiği</div>
            <div class="card-body">
              <canvas id="sales-monthly-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Create monthly sales chart
  createMonthlySalesChart(salesReport.monthlySales);
}

// Create monthly sales chart
function createMonthlySalesChart(monthlySales) {
  // Sort months
  const sortedMonths = [...monthlySales].sort((a, b) => a.month.localeCompare(b.month));
  
  // Format month labels (YYYY-MM to MMM YYYY)
  const labels = sortedMonths.map(monthly => {
    const [year, monthNum] = monthly.month.split('-');
    const date = new Date(year, parseInt(monthNum) - 1, 1);
    return date.toLocaleString('tr-TR', { month: 'short', year: 'numeric' });
  });
  
  // Prepare dataset values
  const salesData = sortedMonths.map(monthly => monthly.amount);
  
  // Create chart
  const ctx = document.getElementById('sales-monthly-chart').getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Aylık Satış',
          data: salesData,
          backgroundColor: 'rgba(13, 110, 253, 0.2)',
          borderColor: 'rgba(13, 110, 253, 1)',
          borderWidth: 2,
          tension: 0.1,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return window.Utils.formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// Generate expenses report
async function generateExpensesReport(dateRange) {
  const expensesReport = await window.api.getExpensesReport(dateRange);
  
  // Format date range for display
  const startDate = window.Utils.formatDate(dateRange.startDate);
  const endDate = window.Utils.formatDate(dateRange.endDate);
  
  // Create report HTML
  const reportContainer = document.getElementById('report-container');
  
  // Build table HTML
  let expensesTableHTML = `
    <table class="table table-striped table-bordered">
      <thead>
        <tr>
          <th>ID</th>
          <th>Tarih</th>
          <th>Açıklama</th>
          <th>Kategori</th>
          <th>Tutar</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  if (expensesReport.expenses.length === 0) {
    expensesTableHTML += '<tr><td colspan="5" class="text-center">Bu tarih aralığında gider bulunamadı</td></tr>';
  } else {
    expensesReport.expenses.forEach(expense => {
      expensesTableHTML += `
        <tr>
          <td>${expense.id}</td>
          <td>${window.Utils.formatDate(expense.expense_date)}</td>
          <td>${expense.description}</td>
          <td>${expense.category || '-'}</td>
          <td class="text-end">${window.Utils.formatCurrency(expense.amount)}</td>
        </tr>
      `;
    });
  }
  
  expensesTableHTML += `
      </tbody>
      <tfoot>
        <tr>
          <th colspan="4" class="text-end">Toplam:</th>
          <th class="text-end">${window.Utils.formatCurrency(expensesReport.totalAmount)}</th>
        </tr>
      </tfoot>
    </table>
  `;
  
  // Full report HTML
  reportContainer.innerHTML = `
    <div class="report-expenses">
      <div class="text-center mb-4">
        <h4>Gider Raporu</h4>
        <p>${startDate} - ${endDate}</p>
      </div>
      
      <div class="mb-4">
        <div class="row mb-3">
          <div class="col-md-4">
            <div class="card bg-danger text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Toplam Gider</h5>
                <h3>${window.Utils.formatCurrency(expensesReport.totalAmount)}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-info text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Gider Sayısı</h5>
                <h3>${expensesReport.expenses.length}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-secondary text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Ortalama Gider</h5>
                <h3>${expensesReport.expenses.length > 0 ? window.Utils.formatCurrency(expensesReport.totalAmount / expensesReport.expenses.length) : window.Utils.formatCurrency(0)}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mb-4">
        <h5>Gider Listesi</h5>
        <div class="table-responsive">
          ${expensesTableHTML}
        </div>
      </div>
      
      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">Aylık Gider Grafiği</div>
            <div class="card-body">
              <canvas id="expenses-monthly-chart"></canvas>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">Kategori Bazında Giderler</div>
            <div class="card-body">
              <canvas id="expenses-category-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Create monthly expenses chart
  createMonthlyExpensesChart(expensesReport.monthlyExpenses);
}

// Create monthly expenses chart
function createMonthlyExpensesChart(monthlyExpenses) {
  // Sort months
  const sortedMonths = [...monthlyExpenses].sort((a, b) => a.month.localeCompare(b.month));
  
  // Format month labels (YYYY-MM to MMM YYYY)
  const labels = sortedMonths.map(monthly => {
    const [year, monthNum] = monthly.month.split('-');
    const date = new Date(year, parseInt(monthNum) - 1, 1);
    return date.toLocaleString('tr-TR', { month: 'short', year: 'numeric' });
  });
  
  // Prepare dataset values
  const expensesData = sortedMonths.map(monthly => monthly.amount);
  
  // Create chart
  const ctx = document.getElementById('expenses-monthly-chart').getContext('2d');
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Aylık Gider',
          data: expensesData,
          backgroundColor: 'rgba(220, 53, 69, 0.2)',
          borderColor: 'rgba(220, 53, 69, 1)',
          borderWidth: 2,
          tension: 0.1,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return window.Utils.formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// Generate profit report
async function generateProfitReport(dateRange) {
  const profitReport = await window.api.getProfitReport(dateRange);
  
  // Format date range for display
  const startDate = window.Utils.formatDate(dateRange.startDate);
  const endDate = window.Utils.formatDate(dateRange.endDate);
  
  // Create report HTML
  const reportContainer = document.getElementById('report-container');
  
  // Calculate profit status and color
  const profitStatus = profitReport.totalProfit >= 0 ? 'Kâr' : 'Zarar';
  const profitStatusColor = profitReport.totalProfit >= 0 ? 'success' : 'danger';
  
  // Full report HTML
  reportContainer.innerHTML = `
    <div class="report-profit">
      <div class="text-center mb-4">
        <h4>Kâr/Zarar Raporu</h4>
        <p>${startDate} - ${endDate}</p>
      </div>
      
      <div class="mb-4">
        <div class="row mb-3">
          <div class="col-md-4">
            <div class="card bg-primary text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Toplam Satış</h5>
                <h3>${window.Utils.formatCurrency(profitReport.totalSales)}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-danger text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Toplam Gider</h5>
                <h3>${window.Utils.formatCurrency(profitReport.totalExpenses)}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-${profitStatusColor} text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Net ${profitStatus}</h5>
                <h3>${window.Utils.formatCurrency(Math.abs(profitReport.totalProfit))}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">Kâr Marjı</div>
            <div class="card-body text-center">
              <h2 class="mb-3 text-${profitStatusColor}">${(profitReport.profitMargin * 100).toFixed(2)}%</h2>
              <p>Kâr marjı = Net Kâr / Toplam Satış</p>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">Gelir-Gider Oranı</div>
            <div class="card-body text-center">
              <canvas id="profit-pie-chart" style="max-height: 180px;"></canvas>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">Detaylı Analiz</div>
        <div class="card-body">
          <table class="table table-bordered">
            <thead>
              <tr>
                <th>Metrik</th>
                <th>Değer</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Toplam Satış</td>
                <td>${window.Utils.formatCurrency(profitReport.totalSales)}</td>
                <td>Belirtilen tarih aralığındaki toplam satış miktarı</td>
              </tr>
              <tr>
                <td>Toplam Gider</td>
                <td>${window.Utils.formatCurrency(profitReport.totalExpenses)}</td>
                <td>Belirtilen tarih aralığındaki toplam gider miktarı</td>
              </tr>
              <tr>
                <td>Net ${profitStatus}</td>
                <td>${window.Utils.formatCurrency(Math.abs(profitReport.totalProfit))}</td>
                <td>Toplam Satış - Toplam Gider</td>
              </tr>
              <tr>
                <td>Kâr Marjı</td>
                <td>${(profitReport.profitMargin * 100).toFixed(2)}%</td>
                <td>Net Kâr / Toplam Satış</td>
              </tr>
              <tr>
                <td>Toplam Gelir-Gider Oranı</td>
                <td>${profitReport.totalExpenses > 0 ? (profitReport.totalSales / profitReport.totalExpenses).toFixed(2) : 'N/A'}</td>
                <td>Toplam Satış / Toplam Gider</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  // Create profit pie chart
  createProfitPieChart(profitReport);
}

// Create profit pie chart
function createProfitPieChart(profitReport) {
  // Prepare data
  const data = [
    profitReport.totalSales,
    profitReport.totalExpenses
  ];
  
  const labels = ['Toplam Satış', 'Toplam Gider'];
  const backgroundColor = ['rgba(13, 110, 253, 0.8)', 'rgba(220, 53, 69, 0.8)'];
  
  // Create chart
  const ctx = document.getElementById('profit-pie-chart').getContext('2d');
  
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColor,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.label || '';
              if (label) {
                label += ': ';
              }
              label += window.Utils.formatCurrency(context.raw);
              return label;
            }
          }
        }
      }
    }
  });
}

// Generate products report
async function generateProductsReport(dateRange) {
  const productsReport = await window.api.getProductsReport(dateRange);
  
  // Format date range for display
  const startDate = window.Utils.formatDate(dateRange.startDate);
  const endDate = window.Utils.formatDate(dateRange.endDate);
  
  // Create report HTML
  const reportContainer = document.getElementById('report-container');
  
  // Build table HTML
  let productsTableHTML = `
    <table class="table table-striped table-bordered">
      <thead>
        <tr>
          <th>ID</th>
          <th>Ürün Adı</th>
          <th>Satış Fiyatı</th>
          <th>Alış Fiyatı</th>
          <th>Satılan Adet</th>
          <th>Toplam Satış</th>
          <th>Kâr</th>
          <th>Kâr Marjı</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  if (productsReport.products.length === 0 || !productsReport.totalSalesAmount) {
    productsTableHTML += '<tr><td colspan="8" class="text-center">Bu tarih aralığında ürün satışı bulunamadı</td></tr>';
  } else {
    productsReport.products.forEach(product => {
      if (!product.total_sales_amount) {
        product.total_sales_amount = 0;
      }
      
      productsTableHTML += `
        <tr>
          <td>${product.product_id}</td>
          <td>${product.product_name}</td>
          <td>${window.Utils.formatCurrency(product.product_price)}</td>
          <td>${product.product_purchase_price ? window.Utils.formatCurrency(product.product_purchase_price) : '-'}</td>
          <td>${product.total_quantity_sold || 0}</td>
          <td>${window.Utils.formatCurrency(product.total_sales_amount)}</td>
          <td>${window.Utils.formatCurrency(product.profit || 0)}</td>
          <td>${product.profit_margin ? (product.profit_margin * 100).toFixed(2) + '%' : '-'}</td>
        </tr>
      `;
    });
  }
  
  productsTableHTML += `
      </tbody>
      <tfoot>
        <tr>
          <th colspan="4" class="text-end">Toplam:</th>
          <th>${productsReport.totalQuantitySold || 0}</th>
          <th>${window.Utils.formatCurrency(productsReport.totalSalesAmount || 0)}</th>
          <th colspan="2"></th>
        </tr>
      </tfoot>
    </table>
  `;
  
  // Full report HTML
  reportContainer.innerHTML = `
    <div class="report-products">
      <div class="text-center mb-4">
        <h4>Ürün Satış Raporu</h4>
        <p>${startDate} - ${endDate}</p>
      </div>
      
      <div class="mb-4">
        <div class="row mb-3">
          <div class="col-md-4">
            <div class="card bg-primary text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Toplam Satış</h5>
                <h3>${window.Utils.formatCurrency(productsReport.totalSalesAmount || 0)}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-info text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Satılan Ürün Sayısı</h5>
                <h3>${productsReport.totalQuantitySold || 0}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-success text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Aktif Ürünler</h5>
                <h3>${productsReport.productCount || 0}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mb-4">
        <h5>Ürün Satış Listesi</h5>
        <div class="table-responsive">
          ${productsTableHTML}
        </div>
      </div>
      
      <div class="row">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header">En Çok Satan 10 Ürün</div>
            <div class="card-body">
              <canvas id="top-products-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Create top products chart
  createTopProductsChart(productsReport.products);
}

// Create top products chart
function createTopProductsChart(products) {
  // Filter out products with no sales and sort by sales amount
  const productsWithSales = products
    .filter(product => product.total_sales_amount > 0)
    .sort((a, b) => b.total_sales_amount - a.total_sales_amount)
    .slice(0, 10); // Get top 10
  
  if (productsWithSales.length === 0) {
    document.getElementById('top-products-chart').parentNode.innerHTML = '<p class="text-center text-muted">Bu tarih aralığında ürün satışı bulunamadı</p>';
    return;
  }
  
  // Prepare data
  const labels = productsWithSales.map(product => product.product_name);
  const salesData = productsWithSales.map(product => product.total_sales_amount);
  const quantityData = productsWithSales.map(product => product.total_quantity_sold);
  
  // Create chart
  const ctx = document.getElementById('top-products-chart').getContext('2d');
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Satış Miktarı (TL)',
          data: salesData,
          backgroundColor: 'rgba(13, 110, 253, 0.7)',
          borderColor: 'rgba(13, 110, 253, 1)',
          borderWidth: 1,
          order: 1,
          yAxisID: 'y'
        },
        {
          label: 'Satılan Adet',
          data: quantityData,
          backgroundColor: 'rgba(0, 200, 0, 0.2)',
          borderColor: 'rgba(0, 200, 0, 1)',
          borderWidth: 2,
          type: 'line',
          order: 0,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          position: 'left',
          title: {
            display: true,
            text: 'Satış Miktarı (TL)'
          },
          ticks: {
            callback: function(value) {
              return window.Utils.formatCurrency(value);
            }
          }
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          title: {
            display: true,
            text: 'Satılan Adet'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// Generate customers report
async function generateCustomersReport(dateRange) {
  const customersReport = await window.api.getCustomersReport(dateRange);
  
  // Format date range for display
  const startDate = window.Utils.formatDate(dateRange.startDate);
  const endDate = window.Utils.formatDate(dateRange.endDate);
  
  // Create report HTML
  const reportContainer = document.getElementById('report-container');
  
  // Build table HTML
  let customersTableHTML = `
    <table class="table table-striped table-bordered">
      <thead>
        <tr>
          <th>ID</th>
          <th>Müşteri Adı</th>
          <th>Telefon</th>
          <th>E-posta</th>
          <th>Satış Sayısı</th>
          <th>Toplam Satış</th>
          <th>Son Satış Tarihi</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  if (customersReport.customers.length === 0 || !customersReport.totalSalesAmount) {
    customersTableHTML += '<tr><td colspan="7" class="text-center">Bu tarih aralığında müşteri satışı bulunamadı</td></tr>';
  } else {
    customersReport.customers.forEach(customer => {
      if (!customer.total_sales_amount) {
        customer.total_sales_amount = 0;
      }
      
      customersTableHTML += `
        <tr>
          <td>${customer.customer_id}</td>
          <td>${customer.customer_name || 'Anonim'}</td>
          <td>${customer.customer_phone || '-'}</td>
          <td>${customer.customer_email || '-'}</td>
          <td>${customer.total_sales_count || 0}</td>
          <td>${window.Utils.formatCurrency(customer.total_sales_amount)}</td>
          <td>${customer.last_sale_date ? window.Utils.formatDate(customer.last_sale_date) : '-'}</td>
        </tr>
      `;
    });
  }
  
  customersTableHTML += `
      </tbody>
      <tfoot>
        <tr>
          <th colspan="4" class="text-end">Toplam:</th>
          <th>${customersReport.totalSalesCount || 0}</th>
          <th>${window.Utils.formatCurrency(customersReport.totalSalesAmount || 0)}</th>
          <th></th>
        </tr>
      </tfoot>
    </table>
  `;
  
  // Full report HTML
  reportContainer.innerHTML = `
    <div class="report-customers">
      <div class="text-center mb-4">
        <h4>Müşteri Satış Raporu</h4>
        <p>${startDate} - ${endDate}</p>
      </div>
      
      <div class="mb-4">
        <div class="row mb-3">
          <div class="col-md-4">
            <div class="card bg-primary text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Toplam Satış</h5>
                <h3>${window.Utils.formatCurrency(customersReport.totalSalesAmount || 0)}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-info text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Toplam Satış Sayısı</h5>
                <h3>${customersReport.totalSalesCount || 0}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-success text-white">
              <div class="card-body text-center">
                <h5 class="card-title">Aktif Müşteriler</h5>
                <h3>${customersReport.customerCount || 0}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mb-4">
        <h5>Müşteri Satış Listesi</h5>
        <div class="table-responsive">
          ${customersTableHTML}
        </div>
      </div>
      
      <div class="row">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header">En Çok Alışveriş Yapan 10 Müşteri</div>
            <div class="card-body">
              <canvas id="top-customers-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Create top customers chart
  createTopCustomersChart(customersReport.customers);
}

// Create top customers chart
function createTopCustomersChart(customers) {
  // Filter out customers with no sales and sort by sales amount
  const customersWithSales = customers
    .filter(customer => customer.total_sales_amount > 0)
    .sort((a, b) => b.total_sales_amount - a.total_sales_amount)
    .slice(0, 10); // Get top 10
  
  if (customersWithSales.length === 0) {
    document.getElementById('top-customers-chart').parentNode.innerHTML = '<p class="text-center text-muted">Bu tarih aralığında müşteri satışı bulunamadı</p>';
    return;
  }
  
  // Prepare data
  const labels = customersWithSales.map(customer => customer.customer_name || 'Anonim');
  const salesData = customersWithSales.map(customer => customer.total_sales_amount);
  const countData = customersWithSales.map(customer => customer.total_sales_count);
  
  // Create chart
  const ctx = document.getElementById('top-customers-chart').getContext('2d');
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Toplam Alışveriş (TL)',
          data: salesData,
          backgroundColor: 'rgba(13, 110, 253, 0.7)',
          borderColor: 'rgba(13, 110, 253, 1)',
          borderWidth: 1,
          order: 1,
          yAxisID: 'y'
        },
        {
          label: 'Alışveriş Sayısı',
          data: countData,
          backgroundColor: 'rgba(255, 193, 7, 0.2)',
          borderColor: 'rgba(255, 193, 7, 1)',
          borderWidth: 2,
          type: 'line',
          order: 0,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          position: 'left',
          title: {
            display: true,
            text: 'Toplam Alışveriş (TL)'
          },
          ticks: {
            callback: function(value) {
              return window.Utils.formatCurrency(value);
            }
          }
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          title: {
            display: true,
            text: 'Alışveriş Sayısı'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// Print the current report
function printReport() {
  // Add a print-specific class to the body to apply print styles
  document.body.classList.add('printing');
  
  // Create a print-friendly version of the report
  const reportContainer = document.getElementById('report-container');
  const reportTitle = document.getElementById('report-title').textContent;
  
  // Get date range for the report title
  const startDate = document.getElementById('report-date-start').value;
  const endDate = document.getElementById('report-date-end').value;
  const dateRangeText = startDate && endDate 
    ? `${window.Utils.formatDate(startDate)} - ${window.Utils.formatDate(endDate)}`
    : '';
  
  // Store original content to restore after printing
  const originalContent = reportContainer.innerHTML;
  
  // Create a print-friendly header
  const printHeader = `
    <div class="print-header">
      <h2>${reportTitle}</h2>
      ${dateRangeText ? `<p>${dateRangeText}</p>` : ''}
      <p>Oluşturulma Tarihi: ${window.Utils.formatDate(new Date())}</p>
    </div>
  `;
  
  // Temporarily add the print header to the report container
  reportContainer.innerHTML = printHeader + reportContainer.innerHTML;
  
  // Print the document
  window.print();
  
  // Restore original content
  reportContainer.innerHTML = originalContent;
  
  // Remove print class
  document.body.classList.remove('printing');
}

// Export the current report to Excel
function exportReport() {
  try {
    const reportType = document.getElementById('report-type').value;
    const reportTitle = document.getElementById('report-title').textContent;
    
    // Get date range for the file name
    const startDate = document.getElementById('report-date-start').value;
    const endDate = document.getElementById('report-date-end').value;
    const dateRangeText = startDate && endDate 
      ? `${startDate}_${endDate}`
      : new Date().toISOString().split('T')[0];
    
    // Create filename for the export
    const fileName = `${reportTitle.replace(/\s+/g, '_')}_${dateRangeText}.xlsx`;
    
    // Depending on the report type, call the appropriate export function
    switch (reportType) {
      case 'summary':
        exportSummaryReport(fileName);
        break;
      case 'sales':
        exportSalesReport(fileName);
        break;
      case 'expenses':
        exportExpensesReport(fileName);
        break;
      case 'profit':
        exportProfitReport(fileName);
        break;
      case 'products':
        exportProductsReport(fileName);
        break;
      case 'customers':
        exportCustomersReport(fileName);
        break;
      default:
        throw new Error('Geçersiz rapor tipi.');
    }
  } catch (error) {
    console.error('Rapor Excel\'e aktarılırken hata:', error);
    window.api.logError('Excel\'e aktarma hatası: ' + error.message);
    window.Utils.showAlert('error', 'Excel\'e aktarma sırasında bir hata oluştu: ' + error.message);
  }
}

// Helper function to export table data to Excel
function exportTableToExcel(tableSelector, fileName, sheetName = 'Sayfa1') {
  // Get all tables in the report container
  const tables = document.querySelectorAll(tableSelector);
  
  if (tables.length === 0) {
    window.Utils.showAlert('warning', 'Dışa aktarılacak tablo bulunamadı.');
    return;
  }
  
  // Create a workbook with a worksheet
  const wb = XLSX.utils.book_new();
  
  // Process each table
  tables.forEach((table, index) => {
    // Clone the table to modify it
    const tableClone = table.cloneNode(true);
    
    // Convert the HTML table to a worksheet
    const ws = XLSX.utils.table_to_sheet(tableClone);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName + (tables.length > 1 ? ` ${index + 1}` : ''));
  });
  
  // Save the workbook as an XLSX file
  XLSX.writeFile(wb, fileName);
  
  window.Utils.showAlert('success', `Rapor başarıyla Excel dosyasına aktarıldı: ${fileName}`);
}

// Export summary report to Excel
function exportSummaryReport(fileName) {
  // For summary report, we need to extract data from charts and cards
  const totalSales = document.querySelector('.report-summary .bg-primary h3').textContent;
  const totalExpenses = document.querySelector('.report-summary .bg-danger h3').textContent;
  const netProfit = document.querySelector('.report-summary .bg-success h3').textContent;
  
  // Create a temporary table for the Excel export
  const tempTable = document.createElement('table');
  tempTable.innerHTML = `
    <thead>
      <tr>
        <th>Metrik</th>
        <th>Değer</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Toplam Satış</td>
        <td>${totalSales}</td>
      </tr>
      <tr>
        <td>Toplam Gider</td>
        <td>${totalExpenses}</td>
      </tr>
      <tr>
        <td>Net Kâr</td>
        <td>${netProfit}</td>
      </tr>
    </tbody>
  `;
  
  // Add the temporary table to the document temporarily
  tempTable.style.display = 'none';
  document.body.appendChild(tempTable);
  
  // Export the table
  exportTableToExcel('body > table', fileName, 'Özet Rapor');
  
  // Remove the temporary table
  document.body.removeChild(tempTable);
}

// Export sales report to Excel
function exportSalesReport(fileName) {
  exportTableToExcel('.report-sales table', fileName, 'Satış Raporu');
}

// Export expenses report to Excel
function exportExpensesReport(fileName) {
  exportTableToExcel('.report-expenses table', fileName, 'Gider Raporu');
}

// Export profit report to Excel
function exportProfitReport(fileName) {
  exportTableToExcel('.report-profit table', fileName, 'Kâr Raporu');
}

// Export products report to Excel
function exportProductsReport(fileName) {
  exportTableToExcel('.report-products table', fileName, 'Ürün Satış Raporu');
}

// Export customers report to Excel
function exportCustomersReport(fileName) {
  exportTableToExcel('.report-customers table', fileName, 'Müşteri Satış Raporu');
} 