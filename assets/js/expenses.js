// Expenses management functions

document.addEventListener('DOMContentLoaded', () => {
  initializeExpenseEvents();
  loadExpenses();
  setDefaultDates();
  populateCategoryFilter();
});

// Initialize expense related event listeners
function initializeExpenseEvents() {
  // Add expense button click
  document.getElementById('add-expense-btn').addEventListener('click', () => {
    prepareNewExpenseForm();
  });

  // Save expense button click
  document.getElementById('save-expense').addEventListener('click', saveExpense);
  
  // Apply filter button click
  document.getElementById('apply-expense-filter').addEventListener('click', loadExpenses);
  
  // Confirm delete button click
  document.getElementById('confirm-delete-btn').addEventListener('click', confirmDeleteExpense);
}

// Set default date filters to current month
function setDefaultDates() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  document.getElementById('expense-date-start').valueAsDate = startOfMonth;
  document.getElementById('expense-date-end').valueAsDate = endOfMonth;
  
  // Set today's date for new expense form
  document.getElementById('expense-date').valueAsDate = today;
}

// Populate category filter dropdown with existing categories
async function populateCategoryFilter() {
  try {
    const expenses = await window.api.getExpenses();
    const categoryFilter = document.getElementById('expense-category-filter');
    const categories = new Set();
    
    // Add default option
    categories.add('');
    
    // Collect unique categories
    expenses.forEach(expense => {
      if (expense.category) {
        categories.add(expense.category);
      }
    });
    
    // Sort categories
    const sortedCategories = Array.from(categories).sort();
    
    // Add to dropdown
    categoryFilter.innerHTML = '<option value="">Tümü</option>';
    sortedCategories.forEach(category => {
      if (category) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
      }
    });
  } catch (error) {
    console.error('Kategoriler yüklenirken hata:', error);
  }
}

// Prepare the new expense form
function prepareNewExpenseForm() {
  // Reset form
  document.getElementById('expense-form').reset();
  
  // Set today's date
  document.getElementById('expense-date').valueAsDate = new Date();
  
  // Clear expense ID if it exists
  const expenseIdInput = document.getElementById('expense-id');
  if (expenseIdInput) {
    expenseIdInput.value = '';
  }
  
  // Update modal title and save button text
  document.querySelector('#expenseModal .modal-title').textContent = 'Yeni Gider Ekle';
  document.getElementById('save-expense').textContent = 'Kaydet';
  
  // Show modal
  const expenseModal = new bootstrap.Modal(document.getElementById('expenseModal'));
  expenseModal.show();
}

// Load expenses from database with filters
async function loadExpenses() {
  try {
    const startDate = document.getElementById('expense-date-start').value;
    const endDate = document.getElementById('expense-date-end').value;
    const category = document.getElementById('expense-category-filter').value;
    
    const expensesTable = document.getElementById('expenses-table').getElementsByTagName('tbody')[0];
    expensesTable.innerHTML = '<tr><td colspan="6" class="text-center">Yükleniyor...</td></tr>';
    
    // Get all expenses first
    const allExpenses = await window.api.getExpenses();
    
    // Apply filters
    let filteredExpenses = allExpenses;
    
    if (startDate) {
      filteredExpenses = filteredExpenses.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        const filterStartDate = new Date(startDate);
        return expenseDate >= filterStartDate;
      });
    }
    
    if (endDate) {
      filteredExpenses = filteredExpenses.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        const filterEndDate = new Date(endDate);
        // Set end date to end of day
        filterEndDate.setHours(23, 59, 59, 999);
        return expenseDate <= filterEndDate;
      });
    }
    
    if (category) {
      filteredExpenses = filteredExpenses.filter(expense => expense.category === category);
    }
    
    // Sort by date (newest first)
    filteredExpenses.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
    
    if (filteredExpenses.length === 0) {
      expensesTable.innerHTML = '<tr><td colspan="6" class="text-center">Hiç gider bulunamadı</td></tr>';
      document.getElementById('expenses-total').textContent = window.Utils.formatCurrency(0);
      return;
    }
    
    let tableHTML = '';
    let total = 0;
    
    filteredExpenses.forEach(expense => {
      total += expense.amount;
      
      tableHTML += `
        <tr>
          <td>${expense.id}</td>
          <td>${window.Utils.formatDate(expense.expense_date)}</td>
          <td>${expense.description}</td>
          <td>${expense.category || '-'}</td>
          <td>${window.Utils.formatCurrency(expense.amount)}</td>
          <td>
            <button class="btn btn-sm btn-outline-warning me-1" onclick="editExpense(${expense.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense(${expense.id})">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    expensesTable.innerHTML = tableHTML;
    document.getElementById('expenses-total').textContent = window.Utils.formatCurrency(total);
    
    window.api.log(`Gider listesi yüklendi: ${filteredExpenses.length} gider`);
  } catch (error) {
    console.error('Giderler listelenirken hata:', error);
    window.api.logError('Gider listeleme hatası: ' + error.message);
    
    const expensesTable = document.getElementById('expenses-table').getElementsByTagName('tbody')[0];
    expensesTable.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">
          <i class="bi bi-exclamation-triangle"></i> Giderler yüklenirken hata oluştu
        </td>
      </tr>
    `;
    
    window.Utils.showAlert('danger', 'Giderler yüklenirken hata oluştu: ' + error.message);
  }
}

// Save new expense
async function saveExpense() {
  try {
    // Get form values
    const expenseId = document.getElementById('expense-id')?.value;
    const description = document.getElementById('expense-description').value.trim();
    const amountStr = document.getElementById('expense-amount').value.trim();
    const date = document.getElementById('expense-date').value;
    const category = document.getElementById('expense-category').value;
    
    // Validation using utility functions
    const descriptionValidation = window.Utils.validateInput(description, 'Gider açıklaması boş bırakılamaz.');
    if (!descriptionValidation.valid) {
      alert(descriptionValidation.message);
      return;
    }
    
    const amountValidation = window.Utils.validateNumeric(amountStr, 'Geçerli bir tutar giriniz.');
    if (!amountValidation.valid) {
      alert(amountValidation.message);
      return;
    }
    
    if (!date) {
      alert('Lütfen bir tarih seçiniz.');
      return;
    }
    
    // Create expense object
    const expense = {
      description,
      amount: parseFloat(amountStr),
      expense_date: date,
      category
    };
    
    // Check if this is an edit operation
    const isEdit = expenseId && expenseId.trim() !== '';
    
    if (isEdit) {
      expense.id = parseInt(expenseId);
      await window.api.updateExpense(expense);
      window.Utils.showAlert('success', 'Gider başarıyla güncellendi');
    } else {
      // Save new expense to database
      await window.api.addExpense(expense);
      window.Utils.showAlert('success', 'Gider başarıyla eklendi');
    }
    
    // Close modal
    const expenseModal = bootstrap.Modal.getInstance(document.getElementById('expenseModal'));
    expenseModal.hide();
    
    // Refresh expense list
    loadExpenses();
    
    // Update category filter (might be a new category)
    populateCategoryFilter();
  } catch (error) {
    console.error('Gider kaydedilirken hata:', error);
    window.api.logError('Gider kaydetme hatası: ' + error.message);
    
    window.Utils.showAlert('danger', 'Gider işlemi sırasında hata oluştu: ' + error.message);
  }
}

// Edit expense
async function editExpense(expenseId) {
  try {
    // Reset form
    document.getElementById('expense-form').reset();
    
    // Get expense details
    const expenses = await window.api.getExpenses();
    const expense = expenses.find(e => e.id === expenseId);
    
    if (!expense) {
      window.Utils.showAlert('danger', `Gider #${expenseId} bulunamadı.`);
      return;
    }
    
    // Add a hidden input for expense ID if it doesn't exist
    let expenseIdInput = document.getElementById('expense-id');
    if (!expenseIdInput) {
      expenseIdInput = document.createElement('input');
      expenseIdInput.type = 'hidden';
      expenseIdInput.id = 'expense-id';
      document.getElementById('expense-form').appendChild(expenseIdInput);
    }
    
    // Fill form with expense data
    expenseIdInput.value = expense.id;
    document.getElementById('expense-description').value = expense.description;
    document.getElementById('expense-amount').value = expense.amount;
    
    // Format date for input (YYYY-MM-DD)
    if (expense.expense_date) {
      const date = new Date(expense.expense_date);
      const formattedDate = date.toISOString().split('T')[0];
      document.getElementById('expense-date').value = formattedDate;
    }
    
    document.getElementById('expense-category').value = expense.category || '';
    
    // Update modal title
    document.querySelector('#expenseModal .modal-title').textContent = `Gider #${expense.id} Düzenle`;
    
    // Update save button text
    document.getElementById('save-expense').textContent = 'Güncelle';
    
    // Show modal
    const expenseModal = new bootstrap.Modal(document.getElementById('expenseModal'));
    expenseModal.show();
  } catch (error) {
    console.error('Gider düzenleme formu hazırlanırken hata:', error);
    window.api.logError('Gider düzenleme hatası: ' + error.message);
    window.Utils.showAlert('danger', 'Gider düzenleme sırasında hata oluştu: ' + error.message);
  }
}

// Open delete confirmation modal
function deleteExpense(expenseId) {
  document.getElementById('delete-expense-hidden-id').value = expenseId;
  document.getElementById('delete-expense-id').textContent = `#${expenseId}`;
  
  const deleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
  deleteModal.show();
}

// Confirm expense deletion
async function confirmDeleteExpense() {
  try {
    const expenseId = document.getElementById('delete-expense-hidden-id').value;
    
    if (!expenseId) {
      window.Utils.showAlert('danger', 'Silinecek gider ID bilgisi eksik');
      return;
    }
    
    // Call API to delete expense
    await window.api.deleteExpense(parseInt(expenseId));
    
    // Close delete confirmation modal
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    if (deleteModal) deleteModal.hide();
    
    // Refresh expense list
    loadExpenses();
    
    // Update category filter
    populateCategoryFilter();
    
    // Show success message
    window.Utils.showAlert('success', 'Gider başarıyla silindi');
  } catch (error) {
    console.error('Gider silme hatası:', error);
    window.api.logError('Gider silme hatası: ' + error.message);
    
    // Close delete confirmation modal
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    if (deleteModal) deleteModal.hide();
    
    window.Utils.showAlert('danger', 'Gider silinirken hata oluştu: ' + error.message);
  }
} 