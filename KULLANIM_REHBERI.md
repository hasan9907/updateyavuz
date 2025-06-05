# Yavuz Muhasebe Sistemi - Yükleme ve Güncelleme Rehberi

## 📦 Yükleme

### Yeni Kurulum (v1.0.4)
**ÖNEMLİ**: v1.0.4 sqlite3 modül sorunu çözüldü. Artık "Cannot find module 'sqlite3'" hatası almayacaksınız.

#### Seçenek 1: ZIP Paketi (Önerilen)
1. `dist` klasöründen **Yavuz-Muhasebe-v1.0.4.zip** dosyasını indirin
2. ZIP dosyasını istediğiniz klasöre çıkarın
3. `win-unpacked-v1.0.4` klasörü içindeki **Yavuz Muhasebe.exe** dosyasını çalıştırın
4. İsteğe bağlı: Masaüstüne kısayol oluşturun

#### Seçenek 2: Eski Kurulum Dosyası
1. `dist` klasöründen **Yavuz Muhasebe Setup 1.0.3.exe** dosyasını çalıştırın
2. ⚠️ **DİKKAT**: Bu versiyon sqlite3 sorunu yaşayabilir

### Sistem Gereksinimleri
- Windows 10 veya üzeri
- En az 4 GB RAM
- 500 MB boş disk alanı

## 🔄 Otomatik Güncelleme Sistemi

### Nasıl Çalışır?
- Program her açıldığında otomatik olarak güncellemeleri kontrol eder
- Yeni sürüm bulunduğunda size bildirim gelir
- Güncelleme onayınızla otomatik olarak indirilir ve kurulur

### Güncelleme Türleri
1. **Otomatik Kontrol**: Program açılışında
2. **Manuel Kontrol**: Ayarlar menüsünden "Güncellemeleri Kontrol Et"

### Güncelleme İşlemi
1. ✅ Yeni sürüm bulundu bildirimi
2. 📥 Güncelleme dosyası otomatik indiriliyor
3. 🔄 Program yeniden başlatılıyor
4. ✨ Güncelleme tamamlandı!

## 📋 Sürüm Notları

### v1.0.4 (Son Sürüm - ÖNEMLİ GÜNCELLEME)
- 🔧 **SQLİTE3 MODÜL SORUNU ÇÖZÜLDÜ**: "Cannot find module 'sqlite3'" hatası düzeltildi
- ✅ Program başlatma sorunları giderildi
- 🎯 Kararlı çalışma için gerekli tüm bağımlılıklar eklendi
- 📦 Portable ZIP versiyonu eklendi (kurulum gerektirmez)

### v1.0.3
- Fatura toplam hesaplama sisteminde iyileştirmeler
- "Toplam" bölümü: İndirimsiz toplam gösterir
- "Genel Toplam" bölümü: İndirimli final toplam gösterir
- Daha temiz ve anlaşılır toplam gösterimi

### v1.0.2
- Fatura düzeni iyileştirmeleri
- Şablon sistemi güncellemeleri

### v1.0.1
- İlk kararlı sürüm
- Temel muhasebe özellikleri

## 🛠️ Sorun Giderme

### ✅ Program Açılmıyor Sorunu ÇÖZÜLDÜ (v1.0.4)
Eski versiyonlarda yaşanan **"Cannot find module 'sqlite3'"** hatası v1.0.4'te tamamen çözülmüştür.

**Hâlâ sorun yaşıyorsanız**:
1. v1.0.4 ZIP paketini kullanın
2. Antivirus yazılımınızı kontrol edin
3. Yönetici olarak çalıştırmayı deneyin

### Güncelleme Çalışmıyor
1. İnternet bağlantınızı kontrol edin
2. Firewall ayarlarınızı kontrol edin
3. Program dosyalarının yazma iznini kontrol edin

### Veritabanı Sorunu
- Program her çalıştığında otomatik olarak `financeapp.db` dosyasını kontrol eder
- Sorun yaşarsanız yedek dosyalarınızı kontrol edin

## 📞 Destek

**Teknik Destek**: [GitHub Issues](https://github.com/hasan9907/update/issues)
**E-posta**: info@yavuzyazilim.com

## 📁 Dosya Yapısı

### Kurulum Versiyonu
```
Program Files/Yavuz Muhasebe/
├── Yavuz Muhasebe.exe          # Ana program
├── financeapp.db               # Veritabanı
├── resources/                  # Program kaynakları
├── node_modules/               # Gerekli modüller (sqlite3 dahil)
└── localization/              # Dil dosyaları
```

### Portable Versiyonu (v1.0.4)
```
win-unpacked-v1.0.4/
├── Yavuz Muhasebe.exe          # Ana program
├── financeapp.db               # Veritabanı
├── node_modules/               # Tüm bağımlılıklar dahil
└── resources/                  # Program kaynakları
```

## 🔐 Güvenlik

- Tüm veriler yerel bilgisayarınızda saklanır
- Şifreleme ile korumalı veritabanı
- Otomatik yedekleme sistemi
- Güvenli güncelleme protokolü (SHA512 doğrulama)

---

**© 2024 Yavuz Yazılım - Tüm hakları saklıdır** 