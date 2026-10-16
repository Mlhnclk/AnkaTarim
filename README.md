# Anka Tarımsal Takip

Zeytin eleme operasyonları, müşteri bakiyeleri, personel komisyonları, fiyat listeleri ve WhatsApp kayıtları için Django REST API ve React arayüzü.

## Çalıştırma

Backend:

```powershell
.venv\Scripts\python.exe backend\manage.py migrate
.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Arayüz: `http://127.0.0.1:5173/`

## Environment Ayarları

Local geliştirmede environment dosyaları zorunlu değildir. Uygulama aşağıdaki varsayılanlarla çalışır:

- Backend API: `http://127.0.0.1:8000/api/`
- Frontend: `http://127.0.0.1:5173/`
- Django debug: açık

Özel bir API adresi kullanacaksanız frontend örnek dosyasını kopyalayıp düzenleyin:

```powershell
Copy-Item frontend\.env.example frontend\.env
```

`frontend/.env` içindeki `VITE_API_URL` değeri `/api/` ile bitmelidir:

```env
VITE_API_URL=http://127.0.0.1:8000/api/
```

<<<<<<< Updated upstream
## Çok Şirketli Kullanım

Her şirket aynı uygulama ve veritabanını kullanır; operasyon kayıtları oturum açan kullanıcının şirketine göre ayrılır. API şirketi kullanıcı profilinden belirlediği için frontend'den şirket kimliği göndermek gerekmez.

Yeni şirket eklemek için platform yöneticisi `/admin/` üzerinden:

1. `Core > Companies` bölümünde şirketi oluşturur.
2. `Authentication and Authorization > Users` bölümünde şirketin ilk kullanıcısını oluşturur.
3. `Core > App user profiles` bölümünde kullanıcıyı şirkete bağlar ve gerekli satın alma, satış ve kullanıcı yönetimi yetkilerini verir.

Şirket yöneticileri uygulama içindeki kullanıcı yönetiminden yeni çalışan ekleyebilir; bu çalışanlar otomatik olarak yöneticinin şirketine bağlanır. Mevcut kayıtlar ve kullanıcı profilleri ilk migrasyonda `Anka Tarımsal Takip` şirketine atanır.

```powershell
.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
```

=======
>>>>>>> Stashed changes
## Kontroller

```powershell
cd frontend
npm run lint
npm run build
cd ..
.venv\Scripts\python.exe backend\manage.py check
.venv\Scripts\python.exe backend\manage.py test core
```

