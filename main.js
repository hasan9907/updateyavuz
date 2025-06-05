const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Auto-updater konfigürasyonu
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

// GitHub için explicitly set et
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'hasan9907',
  repo: 'updateyavuz'
});

// Development modda güncelleme kontrolü için
if (process.env.NODE_ENV === 'development') {
  autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
}

// Development modda da çalışması için force flag
if (!app.isPackaged) {
  autoUpdater.forceDevUpdateConfig = true;
  // Environment variable set et
  process.env.ELECTRON_IS_DEV = '0';
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  log.info('Güncellemeler kontrol ediliyor...');
});

autoUpdater.on('update-available', (info) => {
  log.info('Güncelleme mevcut.');
  if (mainWindow) {
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Güncelleme mevcut değil.');
});

autoUpdater.on('error', (err) => {
  log.error('Auto-updater hatası:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.message);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  let logMessage = "İndirme hızı: " + progressObj.bytesPerSecond;
  logMessage = logMessage + ' - İndirilen ' + Math.round(progressObj.percent) + '%';
  logMessage = logMessage + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  log.info(logMessage);
  console.log(logMessage);
  
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Güncelleme indirildi.');
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', {
      version: info.version
    });
  }
});

// Pencere başvurusu
let mainWindow;

// Uygulama data dizinini oluştur 
const userDataPath = app.getPath('userData');

// Eğer dizin yoksa oluştur
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

// Veritabanı bağlantısı
const db = new sqlite3.Database(path.join(userDataPath, 'financeapp.db'), (err) => {
  if (err) {
    console.error('Veritabanı açılırken hata oluştu: ', err);
  } else {
    // Tabloları oluştur
    initDatabase();
  }
});

function initDatabase() {
  console.log("Veritabanı tabloları oluşturuluyor...");
  
  db.serialize(() => {
    // Müşteriler tablosu
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error("Müşteriler tablosu oluşturulurken hata:", err);
      else console.log("Müşteriler tablosu hazır");
    });

    // Ürünler tablosu
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      purchase_price REAL DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      barcode TEXT
    )`, (err) => {
      if (err) console.error("Ürünler tablosu oluşturulurken hata:", err);
      else console.log("Ürünler tablosu hazır");
    });

    // Satışlar tablosu
    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      total_amount REAL NOT NULL,
      sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      payment_type TEXT,
      cheque_date DATE,
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    )`, (err) => {
      if (err) console.error("Satışlar tablosu oluşturulurken hata:", err);
      else console.log("Satışlar tablosu hazır");
    });

    // Satış detayları tablosu
    db.run(`CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )`, (err) => {
      if (err) console.error("Satış detayları tablosu oluşturulurken hata:", err);
      else console.log("Satış detayları tablosu hazır");
    });

    // Giderler tablosu
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      category TEXT
    )`, (err) => {
      if (err) console.error("Giderler tablosu oluşturulurken hata:", err);
      else console.log("Giderler tablosu hazır");
    });
    
    // Migrate existing tables if needed
    migrateDatabase();
  });
}

// Veritabanı versiyonlama ve migrasyon işlemleri
function migrateDatabase() {
  console.log("Veritabanı şemaları kontrol ediliyor ve güncelleniyor...");
  
  // Ürünler tablosuna purchase_price kolonu ekle
  db.run(`ALTER TABLE products ADD COLUMN purchase_price REAL DEFAULT 0`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log("Ürünler tablosundaki purchase_price kolonu zaten mevcut.");
      } else {
        console.error("Ürünler tablosuna purchase_price kolonu eklenirken hata:", err);
      }
    } else {
      console.log("Ürünler tablosuna purchase_price kolonu eklendi.");
    }
  });
  // Ürünler tablosuna vat_rate kolonu ekle
  db.run(`ALTER TABLE products ADD COLUMN vat_rate REAL DEFAULT 18`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log("Ürünler tablosundaki vat_rate kolonu zaten mevcut.");
      } else {
        console.error("Ürünler tablosuna vat_rate kolonu eklenirken hata:", err);
      }
    } else {
      console.log("Ürünler tablosuna vat_rate kolonu eklendi.");
    }
  });
  // Satışlar tablosuna payment_type kolonu ekle
  db.run(`ALTER TABLE sales ADD COLUMN payment_type TEXT`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log("Satışlar tablosundaki payment_type kolonu zaten mevcut.");
      } else {
        console.error("Satışlar tablosuna payment_type kolonu eklenirken hata:", err);
      }
    } else {
      console.log("Satışlar tablosuna payment_type kolonu eklendi.");
    }
  });
  // Satışlar tablosuna cheque_date kolonu ekle
  db.run(`ALTER TABLE sales ADD COLUMN cheque_date DATE`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log("Satışlar tablosundaki cheque_date kolonu zaten mevcut.");
      } else {
        console.error("Satışlar tablosuna cheque_date kolonu eklenirken hata:", err);
      }
    } else {
      console.log("Satışlar tablosuna cheque_date kolonu eklendi.");
    }
  });
  
  // Fatura şablonları tablosu oluştur
  db.run(`CREATE TABLE IF NOT EXISTS invoice_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error("Fatura şablonları tablosu oluşturulurken hata:", err);
    else console.log("Fatura şablonları tablosu hazır");
  });
  
  // Faturalar tablosu oluştur
  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    template_type TEXT NOT NULL,
    template_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales (id)
  )`, (err) => {
    if (err) console.error("Faturalar tablosu oluşturulurken hata:", err);
    else console.log("Faturalar tablosu hazır");
  });
  
  // Buraya gelecekte yeni migrasyon işlemleri eklenebilir
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('pages/index.html');
  
  // Geliştirme araçlarını aç
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  
  // Otomatik güncelleme kontrolü
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  } else {
    // Development modda güncelleme test etmek için
    log.info('Development modunda çalışıyor - Auto-updater manuel olarak tetiklenebilir');
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  db.close();
});

// IPC Handlers - Veritabanı işlemleri için

// Müşteriler
ipcMain.handle('get-customers', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM customers ORDER BY name', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

// Tek bir müşterinin bilgilerini getir
ipcMain.handle('get-customer', async (event, customerId) => {
  return new Promise((resolve, reject) => {
    if (!customerId || isNaN(parseInt(customerId))) {
      return reject(new Error('Geçersiz müşteri ID.'));
    }
    
    db.get('SELECT * FROM customers WHERE id = ?', [parseInt(customerId)], (err, row) => {
      if (err) {
        reject(err);
      } else if (!row) {
        reject(new Error(`${customerId} ID'li müşteri bulunamadı.`));
      } else {
        resolve(row);
      }
    });
  });
});

ipcMain.handle('add-customer', async (event, customer) => {
  return new Promise((resolve, reject) => {
    const { name, phone, email, address } = customer;
    
    // Temel doğrulama
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return reject(new Error('Müşteri adı geçersiz veya eksik.'));
    }
    
    db.run(
      'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
      [name, phone || null, email || null, address || null],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...customer });
        }
      }
    );
  });
});

// Müşteri güncelleme
ipcMain.handle('update-customer', async (event, customer) => {
  return new Promise((resolve, reject) => {
    const { id, name, phone, email, address } = customer;
    
    // Temel doğrulama
    if (!id || isNaN(parseInt(id))) {
      return reject(new Error('Geçersiz müşteri ID.'));
    }
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return reject(new Error('Müşteri adı geçersiz veya eksik.'));
    }
    
    db.run(
      'UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?',
      [name, phone || null, email || null, address || null, parseInt(id)],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            id: parseInt(id),
            name,
            phone: phone || null,
            email: email || null,
            address: address || null,
            changes: this.changes 
          });
        }
      }
    );
  });
});

// Müşteri silme
ipcMain.handle('delete-customer', async (event, customerId) => {
  return new Promise((resolve, reject) => {
    if (!customerId || isNaN(parseInt(customerId))) {
      return reject(new Error('Geçersiz müşteri ID.'));
    }
    
    // Önce müşterinin mevcut olup olmadığını kontrol et
    db.get('SELECT id FROM customers WHERE id = ?', [parseInt(customerId)], (err, row) => {
      if (err) {
        return reject(err);
      }
      
      if (!row) {
        return reject(new Error(`${customerId} ID'li müşteri bulunamadı.`));
      }
      
      // Müşteri mevcut, silme işlemini gerçekleştir
      db.run('DELETE FROM customers WHERE id = ?', [parseInt(customerId)], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            id: parseInt(customerId),
            deleted: this.changes > 0
          });
        }
      });
    });
  });
});

// Ürünler
ipcMain.handle('get-products', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM products ORDER BY name', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('get-product', async (event, productId) => {
  console.log('get-product çağrıldı:', productId);
  return new Promise((resolve, reject) => {
    if (!productId || isNaN(parseInt(productId))) {
      console.error('Geçersiz ürün ID:', productId);
      return reject(new Error('Geçersiz ürün ID.'));
    }
    
    db.get('SELECT * FROM products WHERE id = ?', [parseInt(productId)], (err, row) => {
      if (err) {
        console.error('Ürün bilgisi alınırken hata:', err);
        reject(err);
      } else if (!row) {
        console.error('Ürün bulunamadı, ID:', productId);
        reject(new Error(`${productId} ID'li ürün bulunamadı.`));
      } else {
        console.log('Ürün bilgisi alındı:', row);
        resolve(row);
      }
    });
  });
});

ipcMain.handle('add-product', async (event, product) => {
  console.log('add-product çağrıldı:', product);
  return new Promise((resolve, reject) => {
    const { name, description, price, purchase_price, stock_quantity, barcode, vat_rate } = product;
    
    // Temel doğrulama
    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.error('Ürün adı geçersiz:', name);
      return reject(new Error('Ürün adı geçersiz veya eksik.'));
    }
    
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      console.error('Ürün fiyatı geçersiz:', price);
      return reject(new Error('Ürün fiyatı geçersiz. Geçerli bir sayı olmalıdır.'));
    }
    
    // Alış fiyatı kontrolü
    const safePurchasePrice = isNaN(parseFloat(purchase_price)) ? 0 : parseFloat(purchase_price);
    if (safePurchasePrice < 0) {
      console.error('Ürün alış fiyatı geçersiz:', purchase_price);
      return reject(new Error('Ürün alış fiyatı negatif olamaz.'));
    }
    
    const safeStockQuantity = isNaN(parseInt(stock_quantity)) ? 0 : parseInt(stock_quantity);
    
    // Begin transaction for adding product and creating expense
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      db.run(
        'INSERT INTO products (name, description, price, purchase_price, stock_quantity, barcode, vat_rate) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, description || null, parseFloat(price), safePurchasePrice, safeStockQuantity, barcode || null, typeof vat_rate === 'number' ? vat_rate : 18],
        function (err) {
          if (err) {
            console.error('Ürün kaydedilirken hata:', err);
            db.run('ROLLBACK');
            return reject(err);
          }
          
          const productId = this.lastID;
          console.log('Yeni ürün eklendi, ID:', productId);
          
          // Eğer başlangıç stoğu ve alış fiyatı varsa, gider kaydı oluştur
          if (safeStockQuantity > 0 && safePurchasePrice > 0) {
            const expenseAmount = safePurchasePrice * safeStockQuantity;
            const expenseDescription = `Ürün Alımı: ${name} (${safeStockQuantity} adet)`;
            
            db.run(
              'INSERT INTO expenses (description, amount, category) VALUES (?, ?, ?)',
              [expenseDescription, expenseAmount, 'Ürün Alımı'],
              function (err) {
                if (err) {
                  console.error('Gider kaydı oluşturulurken hata:', err);
                  db.run('ROLLBACK');
                  return reject(err);
                }
                
                console.log(`Ürün alımı gider kaydı oluşturuldu, ID: ${this.lastID}, Tutar: ${expenseAmount}`);
                
                db.run('COMMIT');
                resolve({ 
                  id: productId, 
                  name: name,
                  description: description || null,
                  price: parseFloat(price),
                  purchase_price: safePurchasePrice,
                  stock_quantity: safeStockQuantity,
                  expenseCreated: true,
                  expenseAmount: expenseAmount,
                  expenseId: this.lastID
                });
              }
            );
          } else {
            // Gider kaydı oluşturulmayacaksa direkt commit
            db.run('COMMIT');
            resolve({ 
              id: productId, 
              name: name,
              description: description || null,
              price: parseFloat(price),
              purchase_price: safePurchasePrice,
              stock_quantity: safeStockQuantity,
              expenseCreated: false
            });
          }
        }
      );
    });
  });
});

ipcMain.handle('update-product', async (event, product) => {
  console.log('update-product çağrıldı:', product);
  return new Promise((resolve, reject) => {
    const { id, name, description, price, purchase_price, stock_quantity, barcode, vat_rate } = product;
    
    // Temel doğrulama
    if (!id || isNaN(parseInt(id))) {
      console.error('Geçersiz ürün ID:', id);
      return reject(new Error('Geçersiz ürün ID.'));
    }
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.error('Ürün adı geçersiz:', name);
      return reject(new Error('Ürün adı geçersiz veya eksik.'));
    }
    
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      console.error('Ürün satış fiyatı geçersiz:', price);
      return reject(new Error('Ürün satış fiyatı geçersiz. Geçerli bir sayı olmalıdır.'));
    }
    
    // Alış fiyatı kontrolü
    const safePurchasePrice = isNaN(parseFloat(purchase_price)) ? 0 : parseFloat(purchase_price);
    if (safePurchasePrice < 0) {
      console.error('Ürün alış fiyatı geçersiz:', purchase_price);
      return reject(new Error('Ürün alış fiyatı negatif olamaz.'));
    }
    
    const safeProductId = parseInt(id);
    const safeStockQuantity = isNaN(parseInt(stock_quantity)) ? 0 : parseInt(stock_quantity);
    
    // Önce mevcut ürün bilgilerini al
    db.get('SELECT * FROM products WHERE id = ?', [safeProductId], (err, currentProduct) => {
      if (err) {
        console.error('Mevcut ürün bilgisi alınırken hata:', err);
        return reject(err);
      }
      
      if (!currentProduct) {
        console.error('Güncellenecek ürün bulunamadı, ID:', safeProductId);
        return reject(new Error(`${safeProductId} ID'li ürün bulunamadı.`));
      }
      
      // Stok değişimini hesapla
      const stockDifference = safeStockQuantity - currentProduct.stock_quantity;
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Ürünü güncelle
        db.run(
          'UPDATE products SET name = ?, description = ?, price = ?, purchase_price = ?, stock_quantity = ?, barcode = ?, vat_rate = ? WHERE id = ?',
          [name, description || null, parseFloat(price), safePurchasePrice, safeStockQuantity, barcode || null, typeof vat_rate === 'number' ? vat_rate : 18, safeProductId],
          function (err) {
            if (err) {
              console.error('Ürün güncellenirken hata:', err);
              db.run('ROLLBACK');
              return reject(err);
            }
            
            console.log(`Ürün #${safeProductId} güncellendi, değişiklik:`, this.changes);
            
            // Eğer stok artışı ve alış fiyatı varsa, gider kaydı oluştur
            if (stockDifference > 0 && safePurchasePrice > 0) {
              const expenseAmount = safePurchasePrice * stockDifference;
              const expenseDescription = `Ürün Alımı: ${name} (${stockDifference} adet)`;
              
              db.run(
                'INSERT INTO expenses (description, amount, category) VALUES (?, ?, ?)',
                [expenseDescription, expenseAmount, 'Ürün Alımı'],
                function (err) {
                  if (err) {
                    console.error('Gider kaydı oluşturulurken hata:', err);
                    db.run('ROLLBACK');
                    return reject(err);
                  }
                  
                  console.log(`Ürün alımı gider kaydı oluşturuldu, ID: ${this.lastID}, Tutar: ${expenseAmount}`);
                  
                  db.run('COMMIT');
                  resolve({ 
                    id: safeProductId,
                    name,
                    description: description || null,
                    price: parseFloat(price),
                    purchase_price: safePurchasePrice,
                    stock_quantity: safeStockQuantity,
                    changes: this.changes,
                    expenseCreated: true,
                    expenseAmount: expenseAmount,
                    expenseId: this.lastID
                  });
                }
              );
            } else {
              // Gider kaydı oluşturulmayacaksa direkt commit
              db.run('COMMIT');
              resolve({ 
                id: safeProductId,
                name,
                description: description || null,
                price: parseFloat(price),
                purchase_price: safePurchasePrice,
                stock_quantity: safeStockQuantity,
                changes: this.changes,
                expenseCreated: false
              });
            }
          }
        );
      });
    });
  });
});

ipcMain.handle('update-product-stock', async (event, { id, quantity }) => {
  console.log('update-product-stock çağrıldı:', { id, quantity });
  return new Promise((resolve, reject) => {
    // Temel doğrulama
    if (!id || isNaN(parseInt(id))) {
      console.error('Geçersiz ürün ID:', id);
      return reject(new Error('Geçersiz ürün ID.'));
    }
    
    if (isNaN(parseInt(quantity))) {
      console.error('Geçersiz stok miktarı:', quantity);
      return reject(new Error('Geçersiz stok miktarı. Geçerli bir sayı olmalıdır.'));
    }
    
    const safeProductId = parseInt(id);
    const safeQuantity = parseInt(quantity);
    
    // Önce ürün bilgilerini al
    db.get('SELECT name, purchase_price FROM products WHERE id = ?', [safeProductId], (err, product) => {
      if (err) {
        console.error('Ürün bilgisi alınırken hata:', err);
        return reject(err);
      }
      
      if (!product) {
        console.error('Ürün bulunamadı, ID:', safeProductId);
        return reject(new Error(`${safeProductId} ID'li ürün bulunamadı.`));
      }
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Stok miktarını güncelle
        db.run(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
          [safeQuantity, safeProductId],
          function (err) {
            if (err) {
              console.error('Stok güncellenirken hata:', err);
              db.run('ROLLBACK');
              return reject(err);
            }
            
            console.log(`Ürün #${safeProductId} stoğu güncellendi, değişiklik:`, this.changes);
            
            // Sadece stok artırılıyorsa gider kaydı oluştur (quantity pozitifse)
            if (safeQuantity <= 0) {
              db.run('COMMIT');
              return resolve({ 
                success: true, 
                changes: this.changes,
                expenseCreated: false
              });
            }
            
            // Gider tutarını hesapla: alış fiyatı * miktar
            const expenseAmount = product.purchase_price * safeQuantity;
            const expenseDescription = `Ürün Alımı: ${product.name} (${safeQuantity} adet)`;
            
            // Gider kaydı oluştur
            db.run(
              'INSERT INTO expenses (description, amount, category) VALUES (?, ?, ?)',
              [expenseDescription, expenseAmount, 'Ürün Alımı'],
              function (err) {
                if (err) {
                  console.error('Gider kaydı oluşturulurken hata:', err);
                  db.run('ROLLBACK');
                  return reject(err);
                }
                
                console.log(`Ürün alımı gider kaydı oluşturuldu, ID: ${this.lastID}, Tutar: ${expenseAmount}`);
                
                db.run('COMMIT');
                resolve({ 
                  success: true, 
                  changes: this.changes,
                  expenseCreated: true,
                  expenseAmount: expenseAmount,
                  expenseId: this.lastID
                });
              }
            );
          }
        );
      });
    });
  });
});

// Satışlar
ipcMain.handle('add-sale', async (event, { customerId, items, totalAmount, payment_type, cheque_date }) => {
  console.log('add-sale çağrıldı:', { customerId, items: items.length + ' items', totalAmount, payment_type, cheque_date });
  return new Promise((resolve, reject) => {
    // Temel doğrulama
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('Geçersiz satış kalemleri:', items);
      return reject(new Error('Satış kalemleri geçersiz veya eksik.'));
    }
    
    if (isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) <= 0) {
      // Toplam tutar sağlanmadıysa hesapla
      totalAmount = items.reduce((total, item) => {
        return total + (parseFloat(item.price) * parseInt(item.quantity || 0));
      }, 0);
      
      if (totalAmount <= 0) {
        console.error('Geçersiz toplam tutar:', totalAmount);
        return reject(new Error('Toplam tutar geçersiz. Pozitif bir sayı olmalıdır.'));
      }
    }
    
    // Müşteri ID güvenlik kontrolü
    const safeCustomerId = customerId ? parseInt(customerId) : null;
    if (customerId && isNaN(safeCustomerId)) {
      console.error('Geçersiz müşteri ID:', customerId);
      return reject(new Error('Geçersiz müşteri ID.'));
    }
    
    // Tüm satış kalemlerini doğrula
    const processedItems = [];
    let hasError = false;
    
    for (const item of items) {
      const productId = parseInt(item.product_id || item.productId);
      const quantity = parseInt(item.quantity);
      const price = parseFloat(item.price);
      
      if (isNaN(productId) || productId <= 0) {
        console.error(`Ürün ID (${item.product_id || item.productId}) geçersiz.`);
        hasError = true;
        break;
      }
      
      if (isNaN(quantity) || quantity <= 0) {
        console.error(`Ürün #${productId} için miktar (${item.quantity}) geçersiz.`);
        hasError = true;
        break;
      }
      
      if (isNaN(price) || price < 0) {
        console.error(`Ürün #${productId} için fiyat (${item.price}) geçersiz.`);
        hasError = true;
        break;
      }
      
      processedItems.push({
        product_id: productId,
        quantity: quantity,
        price: price
      });
    }
    
    if (hasError) {
      return reject(new Error('Satış kalemleri doğrulanırken hata oluştu.'));
    }
    
    // Stok durumunu kontrol et
    db.serialize(() => {
      let stockError = null;
      
      // Her ürün için stok kontrolü yap
      function checkStock(index = 0) {
        if (index >= processedItems.length) {
          // Tüm kontroller tamamlandı, hata yoksa devam et
          if (stockError) {
            return reject(new Error(stockError));
          }
          
          startTransaction();
          return;
        }
        
        const item = processedItems[index];
        
        // Ürün stoğunu kontrol et
        db.get(
          'SELECT name, stock_quantity FROM products WHERE id = ?',
          [item.product_id],
          (err, product) => {
            if (err) {
              console.error(`Ürün #${item.product_id} stoğu kontrol edilirken hata:`, err);
              stockError = `Ürün stoğu kontrol edilirken hata oluştu: ${err.message}`;
              checkStock(index + 1);
              return;
            }
            
            if (!product) {
              console.error(`Ürün #${item.product_id} bulunamadı.`);
              stockError = `Ürün #${item.product_id} bulunamadı.`;
              checkStock(index + 1);
              return;
            }
            
            if (item.quantity > product.stock_quantity) {
              console.error(`Ürün #${item.product_id} (${product.name}) için stok yetersiz. Mevcut: ${product.stock_quantity}, İstenen: ${item.quantity}`);
              stockError = `Stok yetersiz: ${product.name} için yeterli stok bulunmuyor (Mevcut: ${product.stock_quantity}, İstenen: ${item.quantity})`;
              checkStock(index + 1);
              return;
            }
            
            // Sonraki ürüne geç
            checkStock(index + 1);
          }
        );
      }
      
      // Stok kontrolüne başla
      checkStock();
      
      // Stok kontrolü başarılıysa transaction'ı başlat
      function startTransaction() {
        // Tek bir transaction içinde tüm işlemleri yap
        db.run('BEGIN TRANSACTION', function(transactionErr) {
          if (transactionErr) {
            console.error('Transaction başlatılırken hata:', transactionErr);
            return reject(transactionErr);
          }
          
          console.log('Transaction başlatıldı');
          
          // 1. Ana satış kaydını oluştur
          createSaleRecord();
        });
      }
      
      // 1. Ana satış kaydını oluştur
      function createSaleRecord() {
        db.run(
          'INSERT INTO sales (customer_id, total_amount, payment_type, cheque_date) VALUES (?, ?, ?, ?)',
          [safeCustomerId, parseFloat(totalAmount), payment_type || null, cheque_date || null],
          function(err) {
            if (err) {
              console.error('Satış başlatılırken hata:', err);
              rollbackTransaction(err);
              return;
            }
            
            const saleId = this.lastID;
            console.log('Yeni satış başlatıldı, ID:', saleId);
            
            // 2. Satış kalemlerini ve stok güncellemelerini ekle
            addSaleItems(saleId, 0);
          }
        );
      }
      
      // 2. Satış kalemlerini ekle ve stokları güncelle (sırayla)
      function addSaleItems(saleId, index) {
        // Tüm kalemler eklendiyse işlemi tamamla
        if (index >= processedItems.length) {
          commitTransaction(saleId);
          return;
        }
        
        const item = processedItems[index];
        
        // Önce satış kalemi ekle
        db.run(
          'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [saleId, item.product_id, item.quantity, item.price],
          function(err) {
            if (err) {
              console.error(`Satış #${saleId} kalemi eklenirken hata:`, err);
              rollbackTransaction(err);
              return;
            }
            
            console.log(`Satış #${saleId} için kalem eklendi: Ürün #${item.product_id}, Miktar: ${item.quantity}`);
            
            // Sonra stok güncelle
            updateProductStock(saleId, item, index);
          }
        );
      }
      
      // 3. Ürün stok miktarını güncelle
      function updateProductStock(saleId, item, index) {
        db.run(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.product_id],
          function(err) {
            if (err) {
              console.error(`Ürün #${item.product_id} stoğu güncellenirken hata:`, err);
              rollbackTransaction(err);
              return;
            }
            
            console.log(`Ürün #${item.product_id} stoğu güncellendi, -${item.quantity}`);
            
            // Bir sonraki kaleme geç
            addSaleItems(saleId, index + 1);
          }
        );
      }
      
      // 4. İşlemi tamamla
      function commitTransaction(saleId) {
        db.run('COMMIT', function(err) {
          if (err) {
            console.error('Transaction tamamlanırken hata:', err);
            rollbackTransaction(err);
            return;
          }
          
          console.log(`Satış #${saleId} başarıyla kaydedildi, transaction tamamlandı.`);
          resolve({ saleId, success: true });
        });
      }
      
      // Hata durumunda geri al
      function rollbackTransaction(error) {
        db.run('ROLLBACK', function(rollbackErr) {
          if (rollbackErr) {
            console.error('Transaction geri alınırken hata:', rollbackErr);
            reject(new Error(`Satış kaydedilirken ve geri alınırken çoklu hata oluştu: ${error.message}, ${rollbackErr.message}`));
          } else {
            console.log('Transaction başarıyla geri alındı');
            reject(error);
          }
        });
      }
    });
  });
});

// Satış Güncelleme
ipcMain.handle('update-sale', async (event, { id, customerId, items, totalAmount }) => {
  console.log('update-sale çağrıldı:', { id, customerId, items: items.length + ' items', totalAmount });
  return new Promise((resolve, reject) => {
    // Temel doğrulama
    if (!id || isNaN(parseInt(id))) {
      console.error('Geçersiz satış ID:', id);
      return reject(new Error('Geçersiz satış ID.'));
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('Geçersiz satış kalemleri:', items);
      return reject(new Error('Satış kalemleri geçersiz veya eksik.'));
    }
    
    if (isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) <= 0) {
      // Toplam tutar sağlanmadıysa hesapla
      totalAmount = items.reduce((total, item) => {
        return total + (parseFloat(item.price) * parseInt(item.quantity || 0));
      }, 0);
      
      if (totalAmount <= 0) {
        console.error('Geçersiz toplam tutar:', totalAmount);
        return reject(new Error('Toplam tutar geçersiz. Pozitif bir sayı olmalıdır.'));
      }
    }
    
    // Müşteri ID güvenlik kontrolü
    const safeCustomerId = customerId ? parseInt(customerId) : null;
    if (customerId && isNaN(safeCustomerId)) {
      console.error('Geçersiz müşteri ID:', customerId);
      return reject(new Error('Geçersiz müşteri ID.'));
    }
    
    const safeSaleId = parseInt(id);
    
    // Tüm satış kalemlerini doğrula
    const processedItems = [];
    let hasError = false;
    
    for (const item of items) {
      const productId = parseInt(item.product_id || item.productId);
      const quantity = parseInt(item.quantity);
      const price = parseFloat(item.price);
      
      if (isNaN(productId) || productId <= 0) {
        console.error(`Ürün ID (${item.product_id || item.productId}) geçersiz.`);
        hasError = true;
        break;
      }
      
      if (isNaN(quantity) || quantity <= 0) {
        console.error(`Ürün #${productId} için miktar (${item.quantity}) geçersiz.`);
        hasError = true;
        break;
      }
      
      if (isNaN(price) || price < 0) {
        console.error(`Ürün #${productId} için fiyat (${item.price}) geçersiz.`);
        hasError = true;
        break;
      }
      
      processedItems.push({
        product_id: productId,
        quantity: quantity,
        price: price
      });
    }
    
    if (hasError) {
      return reject(new Error('Satış kalemleri doğrulanırken hata oluştu.'));
    }
    
    // Mevcut satış bilgilerini ve stok durumunu kontrol et
    db.serialize(() => {
      // Önce mevcut satış kalemlerini al
      db.all(
        'SELECT product_id, quantity FROM sale_items WHERE sale_id = ?',
        [safeSaleId],
        (err, existingItems) => {
          if (err) {
            console.error('Mevcut satış kalemleri alınırken hata:', err);
            return reject(new Error(`Mevcut satış bilgileri alınamadı: ${err.message}`));
          }
          
          // Mevcut kalemleri bir map'e dönüştür, stok hesaplaması için
          const existingItemMap = {};
          existingItems.forEach(item => {
            existingItemMap[item.product_id] = item.quantity;
          });
          
          let stockError = null;
          
          // Her ürün için stok kontrolü yap
          function checkStock(index = 0) {
            if (index >= processedItems.length) {
              // Tüm kontroller tamamlandı, hata yoksa devam et
              if (stockError) {
                return reject(new Error(stockError));
              }
              
              startTransaction();
              return;
            }
            
            const item = processedItems[index];
            const existingQuantity = existingItemMap[item.product_id] || 0;
            // Yeni miktar, mevcut miktardan fazlaysa, farkı hesapla
            // Eğer ürün zaten satıştaysa ve miktarı azaltılmışsa veya aynıysa, stok kontrolüne gerek yok
            const additionalQuantity = Math.max(0, item.quantity - existingQuantity);
            
            if (additionalQuantity === 0) {
              // Bu ürün için ek stok kontrolüne gerek yok
              checkStock(index + 1);
              return;
            }
            
            // Ürün stoğunu kontrol et
            db.get(
              'SELECT name, stock_quantity FROM products WHERE id = ?',
              [item.product_id],
              (err, product) => {
                if (err) {
                  console.error(`Ürün #${item.product_id} stoğu kontrol edilirken hata:`, err);
                  stockError = `Ürün stoğu kontrol edilirken hata oluştu: ${err.message}`;
                  checkStock(index + 1);
                  return;
                }
                
                if (!product) {
                  console.error(`Ürün #${item.product_id} bulunamadı.`);
                  stockError = `Ürün #${item.product_id} bulunamadı.`;
                  checkStock(index + 1);
                  return;
                }
                
                if (additionalQuantity > product.stock_quantity) {
                  console.error(`Ürün #${item.product_id} (${product.name}) için stok yetersiz. Mevcut: ${product.stock_quantity}, Ek İstenen: ${additionalQuantity}`);
                  stockError = `Stok yetersiz: ${product.name} için yeterli stok bulunmuyor (Mevcut: ${product.stock_quantity}, Ek İstenen: ${additionalQuantity})`;
                  checkStock(index + 1);
                  return;
                }
                
                // Sonraki ürüne geç
                checkStock(index + 1);
              }
            );
          }
          
          // Stok kontrolüne başla
          checkStock();
          
          // Stok kontrolü başarılıysa transaction'ı başlat
          function startTransaction() {
            // Tek bir transaction içinde tüm işlemleri yap
            db.run('BEGIN TRANSACTION', function(transactionErr) {
              if (transactionErr) {
                console.error('Transaction başlatılırken hata:', transactionErr);
                return reject(transactionErr);
              }
              
              console.log('Transaction başlatıldı');
              
              // 1. Mevcut satış kalemlerini al
              getExistingSaleItems();
            });
          }
          
          function getExistingSaleItems() {
            db.all('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?', [safeSaleId], function(err, oldItems) {
              if (err) {
                console.error('Eski satış kalemleri alınırken hata:', err);
                rollbackTransaction(err);
                return;
              }
              
              console.log(`Satış #${safeSaleId} için mevcut kalemler alındı:`, oldItems.length);
              
              // 2. Mevcut ürünlerin stoklarını iade et
              restoreProductStock(oldItems, 0);
            });
          }
          
          // 3. Mevcut ürünlerin stoklarını iade et (ekleme/güncelleme için)
          function restoreProductStock(oldItems, index) {
            if (index >= oldItems.length) {
              // Stoklar iade edildi, şimdi eski kalemleri silelim
              deleteOldSaleItems();
              return;
            }
            
            const item = oldItems[index];
            
            db.run(
              'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
              [item.quantity, item.product_id],
              function(err) {
                if (err) {
                  console.error(`Ürün #${item.product_id} stoğu iade edilirken hata:`, err);
                  rollbackTransaction(err);
                  return;
                }
                
                console.log(`Ürün #${item.product_id} stoğu iade edildi, +${item.quantity}`);
                
                // Sonraki ürünün stoğunu iade et
                restoreProductStock(oldItems, index + 1);
              }
            );
          }
          
          // 4. Eski satış kalemlerini sil
          function deleteOldSaleItems() {
            db.run('DELETE FROM sale_items WHERE sale_id = ?', [safeSaleId], function(err) {
              if (err) {
                console.error(`Satış #${safeSaleId} kalemleri silinirken hata:`, err);
                rollbackTransaction(err);
                return;
              }
              
              console.log(`Satış #${safeSaleId} eski kalemleri silindi`);
              
              // 5. Yeni kalemleri ekle
              addNewSaleItems(0);
            });
          }
          
          // 5. Yeni satış kalemlerini ekle (sırayla)
          function addNewSaleItems(index) {
            if (index >= processedItems.length) {
              // Tüm yeni kalemler eklendi, ana satış kaydını güncelleyelim
              updateMainSaleRecord();
              return;
            }
            
            const item = processedItems[index];
            
            db.run(
              'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
              [safeSaleId, item.product_id, item.quantity, item.price],
              function(err) {
                if (err) {
                  console.error(`Satış #${safeSaleId} kalemi eklenirken hata:`, err);
                  rollbackTransaction(err);
                  return;
                }
                
                console.log(`Satış #${safeSaleId} için yeni kalem eklendi: Ürün #${item.product_id}, Miktar: ${item.quantity}`);
                
                // Stok miktarını güncelle
                updateProductStock(item, index);
              }
            );
          }
          
          // 6. Yeni ürünlerin stok miktarlarını azalt
          function updateProductStock(item, index) {
            db.run(
              'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
              [item.quantity, item.product_id],
              function(err) {
                if (err) {
                  console.error(`Ürün #${item.product_id} stoğu güncellenirken hata:`, err);
                  rollbackTransaction(err);
                  return;
                }
                
                console.log(`Ürün #${item.product_id} stoğu güncellendi, -${item.quantity}`);
                
                // Sonraki kaleme geç
                addNewSaleItems(index + 1);
              }
            );
          }
          
          // 7. Ana satış kaydını güncelle
          function updateMainSaleRecord() {
            db.run(
              'UPDATE sales SET customer_id = ?, total_amount = ?, payment_type = ?, cheque_date = ? WHERE id = ?',
              [safeCustomerId, parseFloat(totalAmount), payment_type || null, cheque_date || null, safeSaleId],
              function(err) {
                if (err) {
                  console.error(`Satış #${safeSaleId} güncellenirken hata:`, err);
                  rollbackTransaction(err);
                  return;
                }
                
                console.log(`Satış #${safeSaleId} güncellendi`);
                
                // İşlemi tamamla
                commitTransaction();
              }
            );
          }
          
          // 8. İşlemi tamamla
          function commitTransaction() {
            db.run('COMMIT', function(err) {
              if (err) {
                console.error('Transaction tamamlanırken hata:', err);
                rollbackTransaction(err);
                return;
              }
              
              console.log(`Satış #${safeSaleId} güncelleme işlemi tamamlandı, transaction commit edildi.`);
              resolve({ success: true });
            });
          }
          
          // Hata durumunda geri al
          function rollbackTransaction(error) {
            db.run('ROLLBACK', function(rollbackErr) {
              if (rollbackErr) {
                console.error('Transaction geri alınırken hata:', rollbackErr);
                reject(new Error(`Satış güncellenirken ve geri alınırken çoklu hata oluştu: ${error.message}, ${rollbackErr.message}`));
              } else {
                console.log('Transaction başarıyla geri alındı');
                reject(error);
              }
            });
          }
        }
      );
    });
  });
});

// Giderler
ipcMain.handle('add-expense', async (event, expense) => {
  console.log('add-expense çağrıldı:', expense);
  return new Promise((resolve, reject) => {
    const { description, amount, category } = expense;
    
    // Temel doğrulama
    if (!description || typeof description !== 'string' || description.trim() === '') {
      console.error('Gider açıklaması geçersiz:', description);
      return reject(new Error('Gider açıklaması geçersiz veya eksik.'));
    }
    
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      console.error('Gider tutarı geçersiz:', amount);
      return reject(new Error('Gider tutarı geçersiz. Pozitif bir sayı olmalıdır.'));
    }
    
    db.run(
      'INSERT INTO expenses (description, amount, category) VALUES (?, ?, ?)',
      [description, parseFloat(amount), category || null],
      function (err) {
        if (err) {
          console.error('Gider kaydedilirken hata:', err);
          reject(err);
        } else {
          console.log('Yeni gider eklendi, ID:', this.lastID);
          resolve({ 
            id: this.lastID, 
            description,
            amount: parseFloat(amount),
            category: category || null,
            expense_date: new Date().toISOString()
          });
        }
      }
    );
  });
});

ipcMain.handle('get-expenses', async () => {
  console.log('get-expenses çağrıldı');
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM expenses ORDER BY expense_date DESC', (err, rows) => {
      if (err) {
        console.error('Giderler listelenirken hata:', err);
        reject(err);
      } else {
        console.log(`${rows.length} gider bulundu`);
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('update-expense', async (event, expense) => {
  console.log('update-expense çağrıldı:', expense);
  return new Promise((resolve, reject) => {
    const { id, description, amount, expense_date, category } = expense;
    
    // Temel doğrulama
    if (!id || isNaN(parseInt(id))) {
      console.error('Geçersiz gider ID:', id);
      return reject(new Error('Geçersiz gider ID.'));
    }
    
    if (!description || typeof description !== 'string' || description.trim() === '') {
      console.error('Gider açıklaması geçersiz:', description);
      return reject(new Error('Gider açıklaması geçersiz veya eksik.'));
    }
    
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      console.error('Gider tutarı geçersiz:', amount);
      return reject(new Error('Gider tutarı geçersiz. Pozitif bir sayı olmalıdır.'));
    }
    
    const safeId = parseInt(id);
    const safeAmount = parseFloat(amount);
    
    // Tarih kontrolü - expense_date yoksa mevcut tarih korunur
    let dateSql = '';
    let dateParam = [];
    if (expense_date) {
      dateSql = ', expense_date = ?';
      dateParam = [expense_date];
    }
    
    db.run(
      `UPDATE expenses SET description = ?, amount = ?, category = ?${dateSql} WHERE id = ?`,
      [description, safeAmount, category || null, ...dateParam, safeId],
      function (err) {
        if (err) {
          console.error('Gider güncellenirken hata:', err);
          reject(err);
        } else {
          console.log(`Gider #${safeId} güncellendi, değişiklik:`, this.changes);
          resolve({ 
            id: safeId,
            description,
            amount: safeAmount,
            expense_date: expense_date,
            category: category || null,
            changes: this.changes 
          });
        }
      }
    );
  });
});

ipcMain.handle('delete-expense', async (event, expenseId) => {
  console.log('delete-expense çağrıldı:', expenseId);
  return new Promise((resolve, reject) => {
    if (!expenseId || isNaN(parseInt(expenseId))) {
      console.error('Geçersiz gider ID:', expenseId);
      return reject(new Error('Geçersiz gider ID.'));
    }
    
    const safeExpenseId = parseInt(expenseId);
    
    // Önce giderin mevcut olup olmadığını kontrol et
    db.get('SELECT id FROM expenses WHERE id = ?', [safeExpenseId], (err, row) => {
      if (err) {
        console.error('Gider kontrol edilirken hata:', err);
        return reject(err);
      }
      
      if (!row) {
        console.error('Silinecek gider bulunamadı, ID:', safeExpenseId);
        return reject(new Error(`${safeExpenseId} ID'li gider bulunamadı.`));
      }
      
      // Gider mevcut, silme işlemini gerçekleştir
      db.run('DELETE FROM expenses WHERE id = ?', [safeExpenseId], function(err) {
        if (err) {
          console.error('Gider silinirken hata:', err);
          reject(err);
        } else {
          console.log(`Gider #${safeExpenseId} silindi, etkilenen kayıt:`, this.changes);
          resolve({ 
            id: safeExpenseId,
            deleted: this.changes > 0
          });
        }
      });
    });
  });
});

// Raporlar
ipcMain.handle('get-sales-report', async (event, { startDate, endDate }) => {
  // Handle null date parameters with sensible defaults
  const effectiveStartDate = startDate || '1970-01-01';
  const effectiveEndDate = endDate || '2099-12-31';
  
  return new Promise((resolve, reject) => {
    const query = `
      SELECT s.id, s.sale_date, s.total_amount, s.customer_id, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.sale_date BETWEEN ? AND ?
      ORDER BY s.sale_date DESC
    `;
    
    const monthlySalesQuery = `
      SELECT 
        strftime('%Y-%m', s.sale_date) as month,
        SUM(s.total_amount) as amount
      FROM sales s
      WHERE s.sale_date BETWEEN ? AND ?
      GROUP BY strftime('%Y-%m', s.sale_date)
      ORDER BY month
    `;
    
    db.all(query, [effectiveStartDate, effectiveEndDate], (err, sales) => {
      if (err) {
        return reject(err);
      }
      
      // Aylık satış toplamlarını al
      db.all(monthlySalesQuery, [effectiveStartDate, effectiveEndDate], (err, monthlySales) => {
        if (err) {
          return reject(err);
        }
        
        // Toplam satış tutarını hesapla
        const totalAmount = sales.reduce((total, sale) => total + sale.total_amount, 0);
        
        resolve({
          sales,
          monthlySales,
          totalAmount
        });
      });
    });
  });
});

ipcMain.handle('get-expenses-report', async (event, { startDate, endDate }) => {
  // Handle null date parameters with sensible defaults
  const effectiveStartDate = startDate || '1970-01-01';
  const effectiveEndDate = endDate || '2099-12-31';
  
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM expenses
      WHERE expense_date BETWEEN ? AND ?
      ORDER BY expense_date DESC
    `;
    
    const monthlyExpensesQuery = `
      SELECT 
        strftime('%Y-%m', expense_date) as month,
        SUM(amount) as amount
      FROM expenses
      WHERE expense_date BETWEEN ? AND ?
      GROUP BY strftime('%Y-%m', expense_date)
      ORDER BY month
    `;
    
    db.all(query, [effectiveStartDate, effectiveEndDate], (err, expenses) => {
      if (err) {
        return reject(err);
      }
      
      // Aylık gider toplamlarını al
      db.all(monthlyExpensesQuery, [effectiveStartDate, effectiveEndDate], (err, monthlyExpenses) => {
        if (err) {
          return reject(err);
        }
        
        // Toplam gider tutarını hesapla
        const totalAmount = expenses.reduce((total, expense) => total + expense.amount, 0);
        
        resolve({
          expenses,
          monthlyExpenses,
          totalAmount
        });
      });
    });
  });
});

ipcMain.handle('get-profit-report', async (event, { startDate, endDate }) => {
  // Handle null date parameters with sensible defaults
  const effectiveStartDate = startDate || '1970-01-01';
  const effectiveEndDate = endDate || '2099-12-31';
  
  return new Promise((resolve, reject) => {
    const salesQuery = `
      SELECT SUM(total_amount) as total_sales
      FROM sales
      WHERE sale_date BETWEEN ? AND ?
    `;
    
    const expensesQuery = `
      SELECT SUM(amount) as total_expenses
      FROM expenses
      WHERE expense_date BETWEEN ? AND ?
    `;
    
    db.get(salesQuery, [effectiveStartDate, effectiveEndDate], (err, salesRow) => {
      if (err) {
        return reject(err);
      }
      
      db.get(expensesQuery, [effectiveStartDate, effectiveEndDate], (err, expensesRow) => {
        if (err) {
          return reject(err);
        }
        
        const totalSales = salesRow.total_sales || 0;
        const totalExpenses = expensesRow.total_expenses || 0;
        const profit = totalSales - totalExpenses;
        const profitMargin = totalSales > 0 ? profit / totalSales : 0;
        
        console.log(`${effectiveStartDate} - ${effectiveEndDate} aralığında kâr raporu: Satış: ${totalSales}, Gider: ${totalExpenses}, Kâr: ${profit}`);
        
        resolve({
          totalSales,
          totalExpenses,
          totalProfit: profit,
          profitMargin,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate
        });
      });
    });
  });
});

// Satış Detayları
ipcMain.handle('get-sale-details', async (event, saleId) => {
  console.log('get-sale-details çağrıldı:', saleId);
  return new Promise((resolve, reject) => {
    // Temel doğrulama
    if (!saleId || isNaN(parseInt(saleId))) {
      console.error('Geçersiz satış ID:', saleId);
      return reject(new Error('Geçersiz satış ID.'));
    }
    
    const safeSaleId = parseInt(saleId);
    const saleQuery = 'SELECT s.*, c.name as customer_name, c.address as customer_address, c.phone as customer_phone, c.email as customer_email FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?';
    const itemsQuery = 'SELECT si.*, p.name as product_name, p.barcode as barcode, p.vat_rate as vat_rate FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?';
    
    db.get(saleQuery, [safeSaleId], (err, saleRow) => {
      if (err) {
        console.error('Satış bilgisi alınırken hata:', err);
        return reject(err);
      }
      if (!saleRow) {
        console.error('Satış bulunamadı, ID:', safeSaleId);
        return reject(new Error('Satış bulunamadı. ID: ' + safeSaleId));
      }
      
      db.all(itemsQuery, [safeSaleId], (err, itemRows) => {
        if (err) {
          console.error('Satış kalemleri alınırken hata:', err);
          return reject(err);
        }
        
        console.log(`Satış #${safeSaleId} detayları alındı. ${itemRows.length} kalem bulundu.`);
        
        // Müşteri bilgilerini ayrı bir nesneye taşıyalım (eğer varsa)
        let customerInfo = null;
        if (saleRow.customer_id) {
            customerInfo = {
                id: saleRow.customer_id,
                name: saleRow.customer_name,
                address: saleRow.customer_address,
                phone: saleRow.customer_phone,
                email: saleRow.customer_email
            };
        }
        
        // Ana satış bilgisinden müşteri alanlarını temizleyelim
        const saleInfo = { 
            id: saleRow.id,
            customer_id: saleRow.customer_id,
            total_amount: saleRow.total_amount,
            sale_date: saleRow.sale_date,
            payment_type: saleRow.payment_type,
            cheque_date: saleRow.cheque_date
        };

        resolve({
          sale: saleInfo,
          customer: customerInfo,
          items: itemRows.map(item => ({
               ...item, // Include all fields from sale_items (id, sale_id, product_id, quantity, price)
               item_total: item.quantity * item.price // Calculate item total
            }))
        });
      });
    });
  });
});

// Satış Silme
ipcMain.handle('delete-sale', async (event, saleId) => {
  return new Promise((resolve, reject) => {
    // Temel doğrulama
    if (!saleId || isNaN(parseInt(saleId))) {
      return reject(new Error('Geçersiz satış ID.'));
    }
    
    const safeSaleId = parseInt(saleId);
    
    // Tek bir transaction içinde tüm işlemleri yap
    db.run('BEGIN TRANSACTION', function(transactionErr) {
      if (transactionErr) {
        return reject(transactionErr);
      }
      
      // 1. Satışın mevcut olduğunu kontrol et
      db.get('SELECT id FROM sales WHERE id = ?', [safeSaleId], function(err, row) {
        if (err) {
          rollbackTransaction(err);
          return;
        }
        
        if (!row) {
          const notFoundErr = new Error(`${safeSaleId} ID'li satış bulunamadı.`);
          rollbackTransaction(notFoundErr);
          return;
        }
        
        // 2. Mevcut satış kalemlerini getir
        getExistingSaleItems();
      });
      
      // 2. Mevcut satış kalemlerini getir ve stokları güncelle
      function getExistingSaleItems() {
        db.all('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?', [safeSaleId], function(err, oldItems) {
          if (err) {
            rollbackTransaction(err);
            return;
          }
          
          // Satış kalemleri varsa stokları geri al
          if (oldItems.length > 0) {
            restoreProductStock(oldItems, 0);
          } else {
            // Satış kalemi yoksa direkt satışı sil
            deleteSaleRecord();
          }
        });
      }
      
      // 3. Ürünlerin stok miktarlarını geri al (sırayla)
      function restoreProductStock(oldItems, index) {
        if (index >= oldItems.length) {
          // Tüm ürünlerin stokları geri alındı, şimdi satış kalemlerini silelim
          deleteSaleItems();
          return;
        }
        
        const oldItem = oldItems[index];
        
        db.run(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
          [oldItem.quantity, oldItem.product_id],
          function(err) {
            if (err) {
              rollbackTransaction(err);
              return;
            }
            
            // Sonraki kaleme geç
            restoreProductStock(oldItems, index + 1);
          }
        );
      }
      
      // 4. Satış kalemlerini sil
      function deleteSaleItems() {
        db.run('DELETE FROM sale_items WHERE sale_id = ?', [safeSaleId], function(err) {
          if (err) {
            rollbackTransaction(err);
            return;
          }
          
          // Satış kalemlerini sildikten sonra, ana satış kaydını sil
          deleteSaleRecord();
        });
      }
      
      // 5. Ana satış kaydını sil
      function deleteSaleRecord() {
        db.run('DELETE FROM sales WHERE id = ?', [safeSaleId], function(err) {
          if (err) {
            console.error('Satış silinirken hata:', err);
            rollbackTransaction(err);
            return;
          }
          
          console.log(`Satış #${safeSaleId} başarıyla silindi.`);
          
          // İşlem tamamlandı, commit edelim
          commitTransaction();
        });
      }
      
      // 6. İşlemi tamamla
      function commitTransaction() {
        db.run('COMMIT', function(err) {
          if (err) {
            console.error('Transaction tamamlanırken hata:', err);
            rollbackTransaction(err);
            return;
          }
          
          console.log(`Satış #${safeSaleId} başarıyla silindi, transaction tamamlandı.`);
          resolve({ id: safeSaleId, success: true });
        });
      }
      
      // Hata durumunda geri al
      function rollbackTransaction(error) {
        db.run('ROLLBACK', function(rollbackErr) {
          if (rollbackErr) {
            console.error('Transaction geri alınırken hata:', rollbackErr);
            reject(new Error(`Satış silinirken ve geri alınırken çoklu hata oluştu: ${error.message}, ${rollbackErr.message}`));
          } else {
            console.log('Transaction başarıyla geri alındı');
            reject(error);
          }
        });
      }
    });
  });
});

// Renderer'dan loglama mesajlarını al
ipcMain.on('log-from-renderer', (event, message) => {
  console.log(`[Renderer Process]: ${message}`);
});

ipcMain.on('error-from-renderer', (event, error) => {
  console.error(`[Renderer Process Error]: ${error}`);
});

// Pencereyi yeniden yükleme işlevi
ipcMain.handle('reload-window', async () => {
  console.log('Pencere yeniden yükleniyor...');
  if (mainWindow) {
    mainWindow.reload();
    return { success: true };
  }
  return { success: false, error: 'Pencere bulunamadı' };
});

// Yazdırma işlemleri
ipcMain.handle('print-invoice', async (event, saleId, template) => {
  console.log('GELEN TEMPLATE:', JSON.stringify(template, null, 2));
  console.log(`print-invoice çağrıldı. saleId: ${saleId}, template: ${template ? 'var' : 'yok'}`);
  let printWin = null;
  try {
    if (!saleId || isNaN(parseInt(saleId))) {
      console.error('Geçersiz satış ID:', saleId);
      return { success: false, error: 'Geçersiz satış ID: ' + saleId };
    }
    // Parametre kontrolü
    if (!template) {
      console.log('Şablon belirtilmediği için varsayılan şablon kullanılıyor');
      template = {
        fields: {
          showInvoiceNumber: true,
          showInvoiceDate: true,
          showCustomerInfo: true,
          showProductId: true,
          showProductName: true,
          showProductQuantity: true,
          showProductPrice: true,
          showProductTotal: true,
          showDueDate: false
        },
        appearance: {
          primaryColor: "#343a40",
          secondaryColor: "#f8f9fa",
          font: "Arial, sans-serif" 
        }
      };
    }
    // --- KORUMA: template.fields eksikse ekle ---
    if (!template.fields) {
      template.fields = {
        showInvoiceNumber: true,
        showInvoiceDate: true,
        showCustomerInfo: true,
        showProductId: true,
        showProductName: true,
        showProductQuantity: true,
        showProductPrice: true,
        showProductTotal: true,
        showDueDate: false
      };
    }
    // --- KORUMA: template.appearance eksikse ekle ---
    if (!template.appearance) {
      template.appearance = {
        primaryColor: "#343a40",
        secondaryColor: "#f8f9fa",
        font: "Arial, sans-serif",
        borderStyle: "solid",
        headerPosition: "left"
      };
    }
    // --- KORUMA: template.companyInfo eksikse ekle ---
    if (!template.companyInfo) {
      template.companyInfo = {
        name: "",
        address: "",
        phone: "",
        email: "",
        taxOffice: "",
        taxNumber: ""
      };
    }
    
    const safeSaleId = parseInt(saleId);
    console.log(`Satış detayları alınıyor: ${safeSaleId}`);
    
    // 1. Satış detaylarını al
    let saleDetails;
    try {
      saleDetails = await new Promise((resolve, reject) => {
        const saleQuery = 'SELECT s.*, c.name as customer_name, c.address as customer_address, c.phone as customer_phone, c.email as customer_email FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?';
        const itemsQuery = 'SELECT si.*, p.name as product_name, p.barcode as barcode, p.vat_rate as vat_rate FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?';
        
        db.get(saleQuery, [safeSaleId], (err, saleRow) => {
          if (err) {
            console.error('Satış sorgusu hatası:', err);
            return reject(err);
          }
          if (!saleRow) {
            console.error('Satış bulunamadı. ID:', safeSaleId);
            return reject(new Error('Satış bulunamadı. ID: ' + safeSaleId));
          }
          
          db.all(itemsQuery, [safeSaleId], (err, itemRows) => {
            if (err) {
              console.error('Satış kalemleri sorgusu hatası:', err);
              return reject(err);
            }
            
            console.log(`Satış #${safeSaleId} detayları alındı. ${itemRows.length} kalem bulundu.`);
            
            let customerInfo = null;
            if (saleRow.customer_id) {
              customerInfo = {
                id: saleRow.customer_id,
                name: saleRow.customer_name,
                address: saleRow.customer_address,
                phone: saleRow.customer_phone,
                email: saleRow.customer_email
              };
            }
            
            const saleInfo = {
              id: saleRow.id,
              customer_id: saleRow.customer_id,
              total_amount: saleRow.total_amount,
              sale_date: saleRow.sale_date,
              payment_type: saleRow.payment_type,
              cheque_date: saleRow.cheque_date
            };
            
            resolve({
              sale: saleInfo,
              customer: customerInfo,
              items: itemRows.map(item => ({ ...item, item_total: item.quantity * item.price }))
            });
          });
        });
      });
    } catch (dbError) {
      console.error('Veritabanı hatası:', dbError);
      return { success: false, error: 'Veritabanı hatası: ' + dbError.message };
    }

    // 2. HTML içeriği oluşturma
    let invoiceHtml;
    try {
      console.log('Fatura HTML içeriği oluşturuluyor...');
      if (template && template.double && template.readyPrintSettings) {
        invoiceHtml = generateDoubleInvoiceHtmlWithTemplate(saleDetails, template);
      } else {
        invoiceHtml = template 
          ? generateInvoiceHtmlWithTemplate(saleDetails, template) 
          : generateInvoiceHtml(saleDetails);
      }
      console.log('HTML içeriği başarıyla oluşturuldu');
    } catch (htmlError) {
      console.error('HTML oluşturma hatası:', htmlError);
      return { success: false, error: 'HTML oluşturma hatası: ' + htmlError.message };
    }
    
    // 3. Yazdırma penceresi oluşturma ve yükleme
    try {
      console.log('Yazdırma penceresi oluşturuluyor...');
      // Görünür bir yazdırma penceresi oluştur (Windows'un standart yazdırma diyaloğunu görmek için)
      printWin = new BrowserWindow({ 
        width: 800, 
        height: 600,
        show: false, // Önce gizli olsun
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false
        }
      });
      
      const encodedHtml = encodeURIComponent(invoiceHtml);
      const dataUrl = `data:text/html;charset=utf-8,${encodedHtml}`;
      
      // İçeriği yükle
      console.log('Yazdırma penceresine içerik yükleniyor...');
      await printWin.loadURL(dataUrl);
      console.log('İçerik yüklendi, yazdırma işlemi hazırlanıyor...');
      
      // 4. Yazdırma işlemi
      return await new Promise((resolve) => {
        printWin.webContents.once('did-finish-load', () => {
          // Sayfa yüklendikten sonra yeterli bekleme süresi
          setTimeout(async () => {
            try {
              // İstenirse önizleme gösterilebilir
              // printWin.show();
              
              console.log('Yazdırma diyaloğu gösteriliyor...');
              // Direkt yazdırma sistemi diyaloğunu göster
              const printOptions = {
                silent: false,
                printBackground: true,
                color: true,
                margin: {
                  marginType: 'default'
                },
                landscape: false,
                deviceName: '', // Boş bırakırsak sistem varsayılan yazıcıyı kullanır
                copies: 1
              };
              
              printWin.webContents.print(printOptions, (success, reason) => {
                if (success) {
                  console.log('Yazdırma işlemi başarılı!');
                } else {
                  console.log('Yazdırma başarısız oldu:', reason);
                }
                
                // Pencereyi kapat
                console.log('Yazdırma penceresi kapatılıyor...');
                setTimeout(() => {
                  if (printWin) printWin.close();
                  printWin = null;
                }, 500);
              });
              
              // Geriye sonucu döndür
              resolve({ 
                success: true, 
                message: 'Yazdırma diyaloğu gösterildi' 
              });
            } catch (printError) {
              console.error('Yazdırma hatası:', printError);
              
              if (printWin) {
                printWin.close();
                printWin = null;
              }
              
              resolve({ 
                success: false, 
                error: 'Yazdırma hatası: ' + printError.message 
              });
            }
          }, 1500); // Sayfanın tamamen yüklenmesi için biraz daha uzun bekle
        });
      });
    } catch (error) {
      console.error('Yazdırma penceresi hatası:', error);
      
      if (printWin) {
        printWin.close();
        printWin = null;
      }
      
      return { 
        success: false, 
        error: 'Yazdırma penceresi hatası: ' + error.message 
      };
    }
  } catch (error) {
    console.error('Genel yazdırma hatası:', error);
    
    if (printWin) {
      printWin.close();
      printWin = null;
    }
    
    return { 
      success: false, 
      error: 'Yazdırma hatası: ' + error.message 
    };
  }
});

// Çift fatura HTML'i üreten fonksiyon
function generateDoubleInvoiceHtmlWithTemplate(saleDetails, template) {
  const settings = template.readyPrintSettings || {};
  const marginTop = settings.marginTop || 20;
  const marginBottom = settings.marginBottom || 20;
  const marginLeft = settings.marginLeft || 10;
  const marginRight = settings.marginRight || 10;
  const invoiceHeight = settings.invoiceHeight || 140;
  const font = settings.font || 'Arial, sans-serif';
  const totalAmount = saleDetails.sale.total_amount || 0;
  
  // Tek fatura HTML'i
  const singleHtml = generateInvoiceHtmlWithTemplate(saleDetails, template);
  
  // Sadece <body> içeriğini almak için:
  const bodyMatch = singleHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : singleHtml;
  
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>Çift Fatura</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; padding: 0; font-family: ${font}; }
        .invoice-container {
          width: calc(210mm - ${marginLeft + marginRight}mm);
          margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
          height: ${invoiceHeight}mm;
          overflow: hidden;
          page-break-after: always;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">${bodyContent}</div>
      <div class="invoice-container">${bodyContent}</div>
    </body>
    </html>
  `;
}

// HTML içeriği oluşturan fonksiyon (varsayılan şablon)
function generateInvoiceHtml(data) {
  try {
    if (!data || !data.sale) {
      return `<!DOCTYPE html><html><body><h1>Fatura oluşturulamadı: Geçersiz veri yapısı</h1></body></html>`;
    }
    
    const sale = data.sale || {};
    const customer = data.customer || null;
    const items = Array.isArray(data.items) ? data.items : [];
    
    // Fiyat biçimlendirme fonksiyonu
    const formatCurrency = (amount) => {
      let numAmount = parseFloat(amount || 0);
      if (isNaN(numAmount)) numAmount = 0;
      
      try {
        return new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: 'TRY',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(numAmount);
      } catch (e) {
        return numAmount.toFixed(2) + ' TL';
      }
    };
    
    // Tarih biçimlendirme fonksiyonu
    const formatDate = (dateString) => {
      if (!dateString) return '-';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString || '-';
        return date.toLocaleDateString('tr-TR');
      } catch (e) {
        return dateString || '-';
      }
    };
    
    // Ürünlerin HTML tablosunu oluştur
    let itemsHtml = '';
    let totalVat = 0;
    if (items.length === 0) {
      itemsHtml = '<tr><td colspan="5" style="text-align: center;">Ürün bulunamadı</td></tr>';
    } else {
      items.forEach(item => {
        const productName = item.product_name || 'İsimsiz Ürün';
        const price = parseFloat(item.price || 0);
        const quantity = parseInt(item.quantity || 0);
        const itemTotal = price * quantity;
        const vatRate = typeof item.vat_rate === 'number' ? item.vat_rate : 18;
        const itemVat = itemTotal * (vatRate / 100);
        totalVat += itemVat;
        itemsHtml += `
          <tr class="item">
            <td>${productName}</td>
            <td class="text-right">${formatCurrency(price)}</td>
            <td class="text-center">${quantity}</td>
            <td class="text-center">%${vatRate}</td>
            <td class="text-right">${formatCurrency(itemTotal)}</td>
          </tr>
        `;
      });
    }
    
    // Müşteri bilgilerini oluştur
    let customerHtml = 'Misafir Müşteri';
    if (customer) {
      const customerName = customer.name || 'İsimsiz Müşteri';
      const customerAddress = customer.address || '';
      const customerPhone = customer.phone || '';
      const customerEmail = customer.email || '';
      
      customerHtml = `${customerName}<br>${customerAddress}`;
      if (customerPhone) customerHtml += `<br>${customerPhone}`;
      if (customerEmail) customerHtml += `<br>${customerEmail}`;
    }
    
    // Satış bilgileri
    const saleId = sale.id || '?';
    const saleDate = formatDate(sale.sale_date);
    const totalAmount = formatCurrency(sale.total_amount || 0);
    
    // HTML şablonu
    return `<!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>Fatura #${saleId}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; font-size: 12pt; color: #333; }
        .invoice-box { padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 12pt; line-height: 24px; font-family: Arial, sans-serif; color: #555; }
        .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
        .invoice-box table td { padding: 5px; vertical-align: top; }
        .invoice-box table tr.top td { padding-bottom: 20px; }
        .invoice-box table tr.top table td.title { font-size: 35px; line-height: 35px; color: #333; }
        .invoice-box table tr.information td { padding-bottom: 30px; }
        .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
        .invoice-box table tr.item td { border-bottom: 1px solid #eee; }
        .invoice-box table tr.total td { border-top: 2px solid #eee; font-weight: bold; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .footer { margin-top: 30px; font-size: 10pt; text-align: center; color: #888; }
        @media print { body { margin: 0; padding: 0; } .invoice-box { border: none; box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <table>
          <tr class="top">
            <td colspan="4">
              <table>
                <tr>
                  <td class="title"><strong>FİRMA ADI</strong></td>
                  <td style="text-align: right;">
                    Fatura #: ${saleId}<br>
                    Oluşturma: ${formatDate(new Date())}<br>
                    Satış Tarihi: ${saleDate}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr class="information">
            <td colspan="4">
              <table>
                <tr>
                  <td>
                    Firma Adresi<br>
                    Vergi Dairesi: ...<br>
                    Vergi No: ...
                  </td>
                  <td style="text-align: right;">
                    <strong>Müşteri:</strong><br>
                    ${customerHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr class="heading">
            <td>Ürün</td>
            <td class="text-right">Fiyat</td>
            <td class="text-center">Adet</td>
            <td class="text-center">KDV (%)</td>
            <td class="text-right">Toplam</td>
          </tr>
          ${itemsHtml}
          <tr class="total">
            <td colspan="4" class="text-right">Toplam KDV:</td>
            <td class="text-right">${formatCurrency(totalVat)}</td>
          </tr>
          <tr class="total">
            <td colspan="4" class="text-right">Genel Toplam:</td>
            <td class="text-right">${formatCurrency(sale.total_amount || 0)}</td>
          </tr>
        </table>
        <div class="footer">Teşekkür ederiz!</div>
      </div>
    </body>
    </html>`;
  } catch (error) {
    return `<!DOCTYPE html><html><body><h1>Fatura oluşturulamadı</h1><p>${error.message || 'Bilinmeyen hata'}</p></body></html>`;
  }
}

// Şablonlu HTML içeriği oluşturan fonksiyon
function generateInvoiceHtmlWithTemplate(data, template) {
  try {
    if (!data || !data.sale) {
      return `<!DOCTYPE html><html><body><h1>Fatura oluşturulamadı: Geçersiz veri</h1></body></html>`;
    }
    if (!template) {
      return generateInvoiceHtml(data);
    }
    // --- KORUMA: template.fields eksikse ekle ---
    if (!template.fields) {
      template.fields = {
        showInvoiceNumber: true,
        showInvoiceDate: true,
        showCustomerInfo: true,
        showProductId: true,
        showProductName: true,
        showProductQuantity: true,
        showProductPrice: true,
        showProductTotal: true,
        showDueDate: false
      };
    }
    // --- KORUMA: template.appearance eksikse ekle ---
    if (!template.appearance) {
      template.appearance = {
        primaryColor: "#343a40",
        secondaryColor: "#f8f9fa",
        font: "Arial, sans-serif",
        borderStyle: "solid",
        headerPosition: "left"
      };
    }
    // --- KORUMA: template.companyInfo eksikse ekle ---
    if (!template.companyInfo) {
      template.companyInfo = {
        name: "",
        address: "",
        phone: "",
        email: "",
        taxOffice: "",
        taxNumber: ""
      };
    }
    // --- YENİ: Eğer fieldSettings ve selectedFields varsa, mutlak konumlu A4 HTML üret ---
    if (template.fieldSettings && template.selectedFields && Array.isArray(template.selectedFields)) {
      const mmToPx = mm => mm * 3.7795275591;
      const items = Array.isArray(data.items) ? data.items : [];
      const rowGap = 12; // Her ürün satırı arası (mm)
      let labelsHtml = "";
      // Tekil basılacak alanlar (örn. tarih, genel_toplam)
      const singleFields = ["date", "genel_toplam"];
      const singleFieldPrinted = {};
      const genelToplam = data.sale && typeof data.sale.total_amount !== 'undefined' ? data.sale.total_amount : null;
      // Offsetler
      const topOffset = typeof template.topOffset === 'number' ? template.topOffset : 0;
      const bottomOffset = typeof template.bottomOffset === 'number' ? template.bottomOffset : 0;
      // SURET için ayrı fieldSettings ve selectedFields desteği
      const suretFieldSettings = template.suretFieldSettings || template.fieldSettings;
      const suretSelectedFields = template.suretSelectedFields || template.selectedFields;
      items.forEach((item, idx) => {
        // Alan anahtarları ve satış verisinden karşılıkları
        const fieldMap = {
          barcode: item.barcode || "-",
          desc: item.product_name || "-",
          price: (item.price != null ? item.price + " TL" : "-"),
          quantity: (item.quantity != null ? item.quantity : "-"),
          item_total: (item.item_total != null ? item.item_total + " TL" : "-"),
          vat: (typeof item.vat_rate === 'number' ? item.vat_rate + "%" : "-"),
          discount: "0 TL", // İsterseniz dinamik yapabilirsiniz
          total: (item.item_total != null ? item.item_total + " TL" : "-"),
          genel_toplam: (genelToplam != null ? genelToplam + " TL" : "-"),
          date: data.sale && data.sale.sale_date ? (new Date(data.sale.sale_date)).toLocaleDateString('tr-TR') : "-"
        };
        // ASIL (üst kopya)
        template.selectedFields.forEach(key => {
          const s = template.fieldSettings[key];
          if (!s) return;
          const value = fieldMap[key] || s.text || key;
          if (singleFields.includes(key)) {
            if (singleFieldPrinted[key]) return;
            singleFieldPrinted[key] = true;
            const y = s.y || 0;
            labelsHtml += `<div class="field" style="position:absolute;left:${mmToPx(s.x)}px;top:${mmToPx(y + topOffset)}px;font-size:${s.size || 16}pt;">${value}</div>`;
          } else {
            const y = (s.y || 0) + idx * rowGap;
            labelsHtml += `<div class="field" style="position:absolute;left:${mmToPx(s.x)}px;top:${mmToPx(y + topOffset)}px;font-size:${s.size || 16}pt;">${value}</div>`;
          }
        });
        // SURET (alt kopya) - tamamen bağımsız
        suretSelectedFields.forEach(key => {
          const s = suretFieldSettings[key];
          if (!s) return;
          const value = fieldMap[key] || s.text || key;
          if (singleFields.includes(key)) {
            // SURET için singleFieldPrinted kontrolü ayrı olmalı
            // (her iki kopyada da aynı alan olabilir)
            const y = s.y || 0;
            labelsHtml += `<div class="field" style="position:absolute;left:${mmToPx(s.x)}px;top:${mmToPx(y + 148.5 + bottomOffset)}px;font-size:${s.size || 16}pt;">${value}</div>`;
          } else {
            const y = (s.y || 0) + idx * rowGap;
            labelsHtml += `<div class="field" style="position:absolute;left:${mmToPx(s.x)}px;top:${mmToPx(y + 148.5 + bottomOffset)}px;font-size:${s.size || 16}pt;">${value}</div>`;
          }
        });
      });
      // A4 ve stiller
      const lineHeight = template.lineHeight || 16;
      return `<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Fatura</title>
      <style>
        html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; font-family: Arial, sans-serif; background: #fff; overflow: hidden; }
        .field { position: absolute; page-break-after: avoid; page-break-inside: avoid; line-height: ${lineHeight}pt; }
        .a4-root { position: relative; width: 210mm; height: 297mm; overflow: hidden; page-break-after: avoid; page-break-inside: avoid; }
        @media print {
          html, body, .a4-root { width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; box-sizing: border-box; }
        }
      </style>
      </head><body>
        <div class="a4-root">
          ${labelsHtml}
        </div>
      </body></html>`;
    }
    // ... eski tablo/tabanlı şablon kodu ...
    // ... existing code ...
  } catch (error) {
    return `<!DOCTYPE html><html><body><h1>Fatura oluşturulamadı</h1><p>${error.message || 'Bilinmeyen hata'}</p></body></html>`;
  }
}

// Ürün silme 
ipcMain.handle('delete-product', async (event, productId) => {
  console.log('delete-product çağrıldı:', productId);
  return new Promise((resolve, reject) => {
    if (!productId || isNaN(parseInt(productId))) {
      console.error('Geçersiz ürün ID:', productId);
      return reject(new Error('Geçersiz ürün ID.'));
    }
    
    const safeProductId = parseInt(productId);
    
    // Önce ürünün mevcut olup olmadığını kontrol et
    db.get('SELECT id FROM products WHERE id = ?', [safeProductId], (err, row) => {
      if (err) {
        console.error('Ürün kontrol edilirken hata:', err);
        return reject(err);
      }
      
      if (!row) {
        console.error('Silinecek ürün bulunamadı, ID:', safeProductId);
        return reject(new Error(`${safeProductId} ID'li ürün bulunamadı.`));
      }
      
      // Ürün mevcut, silme işlemini gerçekleştir
      db.run('DELETE FROM products WHERE id = ?', [safeProductId], function(err) {
        if (err) {
          console.error('Ürün silinirken hata:', err);
          reject(err);
        } else {
          console.log(`Ürün #${safeProductId} silindi, etkilenen kayıt:`, this.changes);
          resolve({ 
            id: safeProductId,
            deleted: this.changes > 0
          });
        }
      });
    });
  });
});

// Ürün Satış Raporu
ipcMain.handle('get-products-report', async (event, { startDate, endDate }) => {
  // Handle null date parameters with sensible defaults
  const effectiveStartDate = startDate || '1970-01-01';
  const effectiveEndDate = endDate || '2099-12-31';
  
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.description as product_description,
        p.price as product_price,
        p.purchase_price as product_purchase_price,
        p.stock_quantity as current_stock,
        SUM(si.quantity) as total_quantity_sold,
        SUM(si.price * si.quantity) as total_sales_amount,
        COUNT(DISTINCT si.sale_id) as sales_count
      FROM products p
      LEFT JOIN sale_items si ON p.id = si.product_id
      LEFT JOIN sales s ON si.sale_id = s.id AND s.sale_date BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY total_sales_amount DESC
    `;
    
    db.all(query, [effectiveStartDate, effectiveEndDate], (err, products) => {
      if (err) {
        return reject(err);
      }
      
      // Calculate totals
      const totalQuantitySold = products.reduce((total, product) => total + (product.total_quantity_sold || 0), 0);
      const totalSalesAmount = products.reduce((total, product) => total + (product.total_sales_amount || 0), 0);
      
      // Calculate profit
      products.forEach(product => {
        if (product.product_purchase_price && product.total_quantity_sold) {
          const totalCost = product.product_purchase_price * product.total_quantity_sold;
          product.profit = (product.total_sales_amount || 0) - totalCost;
          product.profit_margin = product.total_sales_amount > 0 ? product.profit / product.total_sales_amount : 0;
        } else {
          product.profit = 0;
          product.profit_margin = 0;
        }
      });
      
      resolve({
        products,
        totalQuantitySold,
        totalSalesAmount,
        productCount: products.length
      });
    });
  });
});

// Müşteri Satış Raporu
ipcMain.handle('get-customers-report', async (event, { startDate, endDate }) => {
  // Handle null date parameters with sensible defaults
  const effectiveStartDate = startDate || '1970-01-01';
  const effectiveEndDate = endDate || '2099-12-31';
  
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        COUNT(s.id) as total_sales_count,
        SUM(s.total_amount) as total_sales_amount,
        MAX(s.sale_date) as last_sale_date
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id AND s.sale_date BETWEEN ? AND ?
      GROUP BY c.id
      ORDER BY total_sales_amount DESC
    `;
    
    db.all(query, [effectiveStartDate, effectiveEndDate], (err, customers) => {
      if (err) {
        return reject(err);
      }
      
      // Calculate totals
      const totalSalesAmount = customers.reduce((total, customer) => total + (customer.total_sales_amount || 0), 0);
      const totalSalesCount = customers.reduce((total, customer) => total + (customer.total_sales_count || 0), 0);
      
      resolve({
        customers,
        totalSalesAmount,
        totalSalesCount,
        customerCount: customers.length
      });
    });
  });
});

// ... existing code ...

ipcMain.handle("get-sale-data", () => {
  // Burada gerçek satış verisini döneceksin
  return {
    invoiceNo: "000123",
    date: "16/05/2025",
    customer: "Ahmet Yılmaz",
    items: [
      { name: "Laptop", qty: 1, total: 1500 }
    ],
    total: 1500
  };
});

// Basit A4 fatura penceresi açıp yazdırma
ipcMain.handle("basit-print-invoice", async () => {
  const printWin = new BrowserWindow({
    width: 800,
    height: 1100,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Önce sayfayı yükle
  await printWin.loadFile("invoice.html");
  
  // İsterseniz pencereyi gösterip test edebilirsiniz
  // printWin.show();

  // Sayfa yüklenince yazdırma işlemi başlat
  printWin.webContents.on('did-finish-load', () => {
    // Sayfa içeriğinin yüklenmesi için birazcık bekle
    setTimeout(() => {
      printWin.webContents.print({
        silent: false,
        printBackground: false,
        color: true,
        margin: {
          marginType: 'default'
        },
        landscape: false
      }, (success, reason) => {
        if (success) {
          console.log('Basit fatura yazdırma işlemi başarılı!');
        } else {
          console.log('Basit fatura yazdırma başarısız oldu:', reason);
        }
        
        // Yazdırma işlemi tamamlandıktan sonra pencereyi kapat
        setTimeout(() => {
          printWin.close();
        }, 500);
      });
    }, 1000);
  });

  return { success: true, message: 'Fatura penceresi açıldı' };
});

// Fatura şablon yönetimi
ipcMain.handle("get-invoice-templates", async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM invoice_templates ORDER BY name", [], (err, templates) => {
      if (err) {
        console.error("Fatura şablonları alınırken hata:", err);
        return reject(err);
      }
      resolve(templates || []);
    });
  });
});

// Fatura şablonu kaydetme
ipcMain.handle("save-invoice-template", async (event, template) => {
  return new Promise((resolve, reject) => {
    if (!template || !template.name) {
      return reject(new Error("Geçersiz şablon bilgileri"));
    }

    if (template.id) {
      // Mevcut şablonu güncelle
      db.run(
        "UPDATE invoice_templates SET name = ?, data = ? WHERE id = ?",
        [template.name, JSON.stringify(template.data), template.id],
        function(err) {
          if (err) {
            console.error("Şablon güncellenirken hata:", err);
            return reject(err);
          }
          resolve({ id: template.id, updated: true });
        }
      );
    } else {
      // Yeni şablon ekle
      db.run(
        "INSERT INTO invoice_templates (name, data) VALUES (?, ?)",
        [template.name, JSON.stringify(template.data)],
        function(err) {
          if (err) {
            console.error("Şablon eklenirken hata:", err);
            return reject(err);
          }
          resolve({ id: this.lastID, updated: false });
        }
      );
    }
  });
});

// Kaydedilmiş faturaları getir
ipcMain.handle("get-saved-invoices", async () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT i.*, s.sale_date, c.name as customer_name
      FROM invoices i 
      LEFT JOIN sales s ON i.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY i.created_at DESC
    `;
    
    db.all(query, [], (err, invoices) => {
      if (err) {
        console.error("Faturalar alınırken hata:", err);
        return reject(err);
      }
      resolve(invoices || []);
    });
  });
});

// Fatura kaydetme
ipcMain.handle("save-invoice", async (event, invoiceData) => {
  return new Promise((resolve, reject) => {
    if (!invoiceData || !invoiceData.sale_id) {
      return reject(new Error("Geçersiz fatura bilgileri"));
    }

    // Invoice numarası oluştur
    const date = new Date();
    const invoiceNumber = `FTR-${date.getFullYear()}-${String(invoiceData.sale_id).padStart(4, '0')}`;

    db.run(
      "INSERT INTO invoices (sale_id, invoice_number, template_type, template_data, created_at) VALUES (?, ?, ?, ?, ?)",
      [
        invoiceData.sale_id,
        invoiceNumber,
        invoiceData.template_type || 'standard',
        JSON.stringify(invoiceData.template_data || {}),
        new Date().toISOString()
      ],
      function(err) {
        if (err) {
          console.error("Fatura kaydedilirken hata:", err);
          return reject(err);
        }
        resolve({ id: this.lastID, invoice_number: invoiceNumber });
      }
    );
  });
});

// Kaydedilmiş faturayı yazdır
ipcMain.handle("print-saved-invoice", async (event, invoiceId) => {
  return new Promise((resolve, reject) => {
    if (!invoiceId) {
      return reject(new Error("Geçersiz fatura ID"));
    }

    db.get("SELECT * FROM invoices WHERE id = ?", [invoiceId], async (err, invoice) => {
      if (err) {
        console.error("Fatura alınırken hata:", err);
        return reject(err);
      }

      if (!invoice) {
        return reject(new Error("Fatura bulunamadı"));
      }

      try {
        const templateData = JSON.parse(invoice.template_data || '{}');
        const result = await printInvoiceInternal(invoice.sale_id, {
          ...templateData,
          type: invoice.template_type
        });
        resolve(result);
      } catch (error) {
        console.error("Kaydedilmiş fatura yazdırılırken hata:", error);
        reject(error);
      }
    });
  });
});

// Fatura HTML içeriği oluşturma
ipcMain.handle("generate-invoice-html", async (event, saleId, template) => {
  return new Promise(async (resolve, reject) => {
    try {
      const saleDetails = await getSaleDetailsInternal(saleId);
      
      let invoiceHtml;
      if (template && template.type === 'a4-form') {
        invoiceHtml = generateInvoiceHtmlWithTemplate(saleDetails, {
          ...template,
          readyPrintSettings: template.readyPrintSettings || {
            invoiceHeight: 140,
            margins: { top: 0, left: 0, right: 0, bottom: 0 }
          }
        });
      } else {
        invoiceHtml = generateInvoiceHtmlWithTemplate(saleDetails, template);
      }
      
      resolve({ html: invoiceHtml });
    } catch (error) {
      console.error('Fatura HTML oluşturma hatası:', error);
      reject(error);
    }
  });
});

// Faturayı PDF olarak dışa aktar
ipcMain.handle("export-invoice-as-pdf", async (event, saleId, template, outputPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!outputPath) {
        // Varsayılan çıktı dizini
        const documentsPath = app.getPath('documents');
        outputPath = path.join(documentsPath, `Fatura-${saleId}.pdf`);
      }
      
      const printWin = new BrowserWindow({
        width: 800,
        height: 1100,
        show: false
      });
      
      const saleDetails = await getSaleDetailsInternal(saleId);
      
      let invoiceHtml;
      if (template && template.type === 'a4-form') {
        invoiceHtml = generateInvoiceHtmlWithTemplate(saleDetails, {
          ...template,
          readyPrintSettings: template.readyPrintSettings || {
            invoiceHeight: 140,
            margins: { top: 0, left: 0, right: 0, bottom: 0 }
          }
        });
      } else {
        invoiceHtml = generateInvoiceHtmlWithTemplate(saleDetails, template);
      }
      
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(invoiceHtml)}`;
      await printWin.loadURL(dataUrl);
      
      const pdfData = await printWin.webContents.printToPDF({
        marginsType: 0,
        printBackground: true,
        landscape: false
      });
      
      fs.writeFileSync(outputPath, pdfData);
      
      printWin.close();
      
      resolve({ success: true, filePath: outputPath });
    } catch (error) {
      console.error('PDF dışa aktarma hatası:', error);
      reject(error);
    }
  });
});

// Fatura önizleme
ipcMain.handle("preview-invoice", async (event, saleId, template) => {
  return new Promise(async (resolve, reject) => {
    try {
      const saleDetails = await getSaleDetailsInternal(saleId);
      const previewWin = new BrowserWindow({
        width: 900,
        height: 1100,
        title: `Fatura Önizleme #${saleId}`,
        webPreferences: {
          preload: path.join(__dirname, "preload.js"),
          contextIsolation: true,
          nodeIntegration: false
        }
      });
      let invoiceHtml;
      if (template && template.type === 'a4-form') {
        invoiceHtml = generateInvoiceHtmlWithTemplate(saleDetails, {
          ...template,
          readyPrintSettings: template.readyPrintSettings || {
            invoiceHeight: 140,
            margins: { top: 0, left: 0, right: 0, bottom: 0 }
          }
        });
      } else {
        invoiceHtml = generateInvoiceHtmlWithTemplate(saleDetails, template);
      }
      // --- Modern ve sabit üst bar + responsive stil ---
      const previewStyle = `
        <style>
          html, body { height: 100%; min-height: 100vh; }
          body { background: #f4f4f4; margin: 0; padding: 0; height: 100vh; min-height: 100vh; overflow-y: auto; }
          .preview-toolbar {
            position: fixed; top: 0; left: 0; width: 100vw; height: 64px;
            background: #fff; border-bottom: 1px solid #eee; z-index: 9999;
            display: flex; align-items: center; justify-content: flex-end; gap: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            padding: 0 32px;
          }
          .preview-toolbar button {
            font-size: 1.1rem; padding: 10px 28px; border-radius: 6px; border: none;
            background: #007bff; color: #fff; font-weight: 600; cursor: pointer;
            transition: background 0.2s;
          }
          .preview-toolbar button.close-btn {
            background: #dc3545;
          }
          .preview-toolbar button:hover { filter: brightness(0.95); }
          .preview-content {
            margin-top: 80px; display: flex; justify-content: center; align-items: flex-start;
            min-height: calc(100vh - 80px); width: 100vw;
            height: calc(100vh - 80px); overflow-y: auto;
          }
          .preview-invoice-box {
            background: #fff; box-shadow: 0 0 16px #bbb3; border-radius: 8px;
            padding: 32px; margin: 32px 0; max-width: 850px; width: 100%;
            overflow-x: auto; overflow-y: auto; max-height: 100%;
          }
          @media (max-width: 900px) {
            .preview-invoice-box { padding: 8px; }
            .preview-toolbar { padding: 0 8px; }
          }
          @media print {
            .preview-toolbar { display: none !important; }
            .preview-content { margin-top: 0 !important; }
            .preview-invoice-box { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; overflow: hidden !important; }
            body { background: #fff !important; }
            html, body, .preview-invoice-box {
              overflow: hidden !important;
              width: 210mm !important;
              height: 297mm !important;
              max-width: 210mm !important;
              max-height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              box-shadow: none !important;
              border: none !important;
              scrollbar-width: none !important;
            }
            ::-webkit-scrollbar,
            ::-webkit-scrollbar-thumb,
            ::-webkit-scrollbar-track,
            ::-webkit-scrollbar-track-piece,
            ::-webkit-scrollbar-corner,
            ::-webkit-resizer {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
              background: transparent !important;
              border: none !important;
            }
            body, .preview-invoice-box {
              -ms-overflow-style: none !important;
            }
          }
        </style>
      `;
      // Fatura içeriğini kutuya al
      const wrappedHtml = `
        <!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">${previewStyle}</head><body>
        <div class="preview-toolbar no-print">
          <button onclick="window.print()">Yazdır</button>
          <button class="close-btn" onclick="window.close()">Kapat</button>
        </div>
        <div class="preview-content">
          <div class="preview-invoice-box">${invoiceHtml}</div>
        </div>
        </body></html>
      `;
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(wrappedHtml)}`;
      await previewWin.loadURL(dataUrl);
      resolve({ success: true });
    } catch (error) {
      console.error('Fatura önizleme hatası:', error);
      reject(error);
    }
  });
});

// Satış detaylarını getiren yardımcı fonksiyon
async function getSaleDetailsInternal(saleId) {
  return new Promise((resolve, reject) => {
    if (!saleId) {
      return reject(new Error("Satış ID belirtilmedi"));
    }
    
    const saleQuery = `
      SELECT s.*, c.name as customer_name, c.address as customer_address, 
             c.phone as customer_phone, c.email as customer_email 
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `;
    
    const itemsQuery = `
      SELECT si.*, p.name as product_name, p.barcode as barcode, p.vat_rate as vat_rate 
      FROM sale_items si 
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `;
    
    db.get(saleQuery, [saleId], (err, sale) => {
      if (err) {
        return reject(err);
      }
      
      if (!sale) {
        return reject(new Error(`Satış #${saleId} bulunamadı`));
      }
      
      db.all(itemsQuery, [saleId], (err, items) => {
        if (err) {
          return reject(err);
        }
        
        const customer = {
          name: sale.customer_name,
          address: sale.customer_address,
          phone: sale.customer_phone,
          email: sale.customer_email
        };
        // item_total ekle
        const itemsWithTotal = (items || []).map(item => ({
          ...item,
          item_total: (typeof item.quantity === 'number' && typeof item.price === 'number') ? item.quantity * item.price : (parseFloat(item.quantity) * parseFloat(item.price))
        }));
        resolve({
          sale,
          customer,
          items: itemsWithTotal
        });
      });
    });
  });
}

// Fatura yazdırma işlemini yönetmek için yardımcı fonksiyon
async function printInvoiceInternal(saleId, template) {
  try {
    const printWin = new BrowserWindow({
      width: 800,
      height: 1100,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    
    const saleDetails = await getSaleDetailsInternal(saleId);
    
    let invoiceHtml;
    if (template && template.type === 'a4-form') {
      invoiceHtml = generateInvoiceHtmlWithTemplate(saleDetails, {
        ...template,
        readyPrintSettings: template.readyPrintSettings || {
          invoiceHeight: 140,
          margins: { top: 0, left: 0, right: 0, bottom: 0 }
        }
      });
    } else {
      invoiceHtml = generateInvoiceHtmlWithTemplate(saleDetails, template);
    }
    
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(invoiceHtml)}`;
    await printWin.loadURL(dataUrl);
    
    return new Promise((resolve, reject) => {
      printWin.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          const printOptions = {
            silent: false,
            printBackground: true,
            color: true,
            margin: {
              marginType: 'default'
            },
            landscape: false
          };
          
          printWin.webContents.print(printOptions, (success, reason) => {
            if (success) {
              console.log('Fatura yazdırma başarılı!');
              resolve({ success: true });
            } else {
              console.error('Fatura yazdırma başarısız oldu:', reason);
              reject(new Error(`Yazdırma işlemi başarısız: ${reason}`));
            }
            
            // Pencereyi kapat
            setTimeout(() => {
              printWin.close();
            }, 500);
          });
        }, 1000);
      });
    });
  } catch (error) {
    console.error('Fatura yazdırma işleminde hata:', error);
    throw error;
  }
}

// ... existing code ...

// Yaklaşan çek ödemeleri için endpoint
ipcMain.handle('get-upcoming-cheques', async (event, days = 7) => {
  return new Promise((resolve, reject) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const future = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    const futureStr = future.toISOString().slice(0, 10);
    const query = `
      SELECT s.id, s.sale_date, s.cheque_date, s.total_amount, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.payment_type = 'cheque' AND s.cheque_date >= ? AND s.cheque_date <= ?
      ORDER BY s.cheque_date ASC
    `;
    db.all(query, [todayStr, futureStr], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
});
// ... existing code ...

// Tüm çekli ödemeleri (geçmiş ve gelecek) getiren endpoint
ipcMain.handle('get-all-cheques', async () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT s.id, s.sale_date, s.cheque_date, s.total_amount, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.payment_type = 'cheque'
      ORDER BY s.cheque_date DESC
    `;
    db.all(query, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
});
// ... existing code ...

// Manual updater IPC handlers (otomatik güncelleme kapalı)
ipcMain.handle('check-for-updates', async () => {
  try {
    log.info('Güncelleme kontrolü başlatılıyor...');
    
    // Development modda farklı yaklaşım
    if (!app.isPackaged) {
      log.info('Development modda çalışıyor, checkForUpdates kullanılıyor...');
      const result = await autoUpdater.checkForUpdates();
      log.info('Development güncelleme kontrolü sonucu:', result);
      
      return { 
        success: true, 
        hasUpdate: result?.updateInfo ? true : false,
        version: result?.updateInfo?.version || null,
        currentVersion: app.getVersion()
      };
    } else {
      const result = await autoUpdater.checkForUpdatesAndNotify();
      log.info('Production güncelleme kontrolü sonucu:', result);
      
      return { 
        success: true, 
        hasUpdate: result?.updateInfo ? true : false,
        version: result?.updateInfo?.version || null,
        currentVersion: app.getVersion()
      };
    }
  } catch (error) {
    log.error('Güncelleme kontrolü hatası:', error);
    console.error('Güncelleme kontrolü hatası:', error);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message);
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    log.info('Güncelleme indirme işlemi başlatılıyor...');
    const result = await autoUpdater.downloadUpdate();
    log.info('Güncelleme indirme işlemi tamamlandı:', result);
    return { success: true };
  } catch (error) {
    log.error('Güncelleme indirme hatası:', error);
    console.error('Güncelleme indirme hatası:', error);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message);
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('quit-and-install', async () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});