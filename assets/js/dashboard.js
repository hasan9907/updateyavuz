// Dashboard functions

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
});

// Load dashboard data from the database
async function loadDashboardData() {
  try {
    // Get current date
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const dateRange = {
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0]
    };
    
    // Fetch data concurrently
    const [salesReport, expensesReport, profitReport] = await Promise.all([
      window.api.getSalesReport(dateRange),
      window.api.getExpensesReport(dateRange),
      window.api.getProfitReport(dateRange)
    ]);
    
    // Update total values
    document.getElementById('total-sales').textContent = window.Utils.formatCurrency(salesReport.totalAmount);
    document.getElementById('total-expenses').textContent = window.Utils.formatCurrency(expensesReport.totalAmount);
    document.getElementById('total-profit').textContent = window.Utils.formatCurrency(profitReport.totalProfit);
    
    // Get products to calculate stock value
    const products = await window.api.getProducts();
    let stockValue = products.reduce((total, product) => {
      return total + (product.price * product.stock_quantity);
    }, 0);
    
    document.getElementById('stock-value').textContent = window.Utils.formatCurrency(stockValue);
    
    // Check for low stock products
    const lowStockProducts = products.filter(product => product.stock_quantity < 10);
    const lowStockContainer = document.getElementById('low-stock-products');
    
    if (lowStockProducts.length > 0) {
      let html = '<ul class="list-group">';
      lowStockProducts.forEach(product => {
        html += `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            ${product.name}
            <span class="badge bg-warning rounded-pill">${product.stock_quantity}</span>
          </li>
        `;
      });
      html += '</ul>';
      lowStockContainer.innerHTML = html;
    } else {
      lowStockContainer.innerHTML = '<p class="text-success">Tüm ürünler yeterli stokta</p>';
    }
    
    // Create sales/expenses chart
    createSalesExpensesChart(salesReport, expensesReport);
    
    window.api.log('Dashboard verileri yüklendi');
  } catch (error) {
    console.error('Dashboard verileri yüklenirken hata:', error);
    window.api.logError('Dashboard veri hatası: ' + error.message);
    window.Utils.showAlert('danger', 'Dashboard verileri yüklenirken hata oluştu: ' + error.message);
  }
}

// Create the sales and expenses chart
function createSalesExpensesChart(salesReport, expensesReport) {
  const ctx = document.getElementById('sales-expenses-chart').getContext('2d');
  
  // Get last 6 months
  const labels = [];
  const salesData = [];
  const expensesData = [];
  
  const today = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = month.toLocaleString('tr-TR', { month: 'short' });
    labels.push(monthName);
    
    // Format month key as YYYY-MM
    const monthKey = `${month.getFullYear()}-${(month.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Default to 0 if no data for this month
    let saleAmount = 0;
    let expenseAmount = 0;
    
    // Find sales for this month
    if (salesReport.monthlySales && Array.isArray(salesReport.monthlySales)) {
      const saleForMonth = salesReport.monthlySales.find(s => s.month === monthKey);
      if (saleForMonth) {
        saleAmount = saleForMonth.amount;
      }
    }
    
    // Find expenses for this month
    if (expensesReport.monthlyExpenses && Array.isArray(expensesReport.monthlyExpenses)) {
      const expenseForMonth = expensesReport.monthlyExpenses.find(e => e.month === monthKey);
      if (expenseForMonth) {
        expenseAmount = expenseForMonth.amount;
      }
    }
    
    salesData.push(saleAmount);
    expensesData.push(expenseAmount);
  }
  
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