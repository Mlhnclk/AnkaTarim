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

## Netlify ve Render

### 1. Render: Backend API

1. Render panelinde `New +` > `Blueprint` seçin ve GitHub reposunu bağlayın.
2. Render repo kökündeki `render.yaml` dosyasını algılar. `Apply` ile servisi oluşturun.
3. İlk deploy tamamlanınca servis adresini kopyalayın. Örnek: `https://anka-tarimsal-api.onrender.com`.
4. Render servisinde `Environment` sekmesini açıp aşağıdaki değerleri ekleyin veya güncelleyin:

```env
DJANGO_ALLOWED_HOSTS=api-servisiniz.onrender.com
```

`DJANGO_ALLOWED_HOSTS` değerine `https://` yazmayın. Render, `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, SQLite disk yolu ve HTTPS ayarlarını `render.yaml` üzerinden otomatik ayarlar.

### 2. Netlify: Frontend

1. Netlify panelinde `Add new project` > `Import an existing project` seçin ve aynı GitHub reposunu bağlayın.
2. Build ayarlarını `netlify.toml` dosyasından okutun. Gerekirse şu değerleri kullanın:

```text
Base directory: frontend
Build command: npm run build
Publish directory: frontend/dist
```

3. Netlify'da `Project configuration` > `Environment variables` bölümüne aşağıdaki değişkeni ekleyin. Değerde kendi Render adresinizi kullanın:

```env
VITE_API_URL=https://api-servisiniz.onrender.com/api/
```

4. Netlify deploy tamamlanınca site adresini kopyalayın. Örnek: `https://anka-tarimsal-takip.netlify.app`.

### 3. Render: Netlify adresine izin verin

Netlify site adresi oluştuktan sonra Render servisinde `Environment` sekmesine dönün ve aşağıdaki iki değişkeni ekleyin:

```env
CORS_ALLOWED_ORIGINS=https://site-adiniz.netlify.app
CSRF_TRUSTED_ORIGINS=https://site-adiniz.netlify.app
```

Özel domain kullanıyorsanız ilgili adresleri aynı değişkenlere virgülle ayırarak ekleyin:

```env
CORS_ALLOWED_ORIGINS=https://site-adiniz.netlify.app,https://uygulama.ornek.com
CSRF_TRUSTED_ORIGINS=https://site-adiniz.netlify.app,https://uygulama.ornek.com
```

### 4. Yeniden deploy

Render ortam değişkenlerini kaydettikten sonra `Manual Deploy` > `Deploy latest commit` ile backend'i yeniden başlatın. Netlify'da `VITE_API_URL` değiştiyse `Deploys` > `Trigger deploy` > `Deploy site` ile frontend'i yeniden derleyin.

`VITE_API_URL` build zamanında okunur; bu nedenle Netlify yeniden deploy edilmeden yeni API adresi kullanılmaz. Render disk yapılandırması SQLite verisini `/var/data` altında kalıcı tutar.

## Giriş

Backend ve frontend aynı anda çalışıyor olmalıdır. Varsayılan yönetici hesabı:

- Kullanıcı adı: `admin`
- Şifre: `admin123`

Giriş ekranı açılıyor ancak giriş yapılamıyorsa backend’i şu komutla başlatın:

```powershell
.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
```

## Kontroller

```powershell
cd frontend
npm run lint
npm run build
cd ..
.venv\Scripts\python.exe backend\manage.py check
.venv\Scripts\python.exe backend\manage.py test core
```

