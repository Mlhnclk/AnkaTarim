# Anka Tarimsal Takip

## Yerel geliştirme kurulumu

Gereksinimler:

- Python 3.12 veya üzeri
- Node.js 20.19+ veya 22.12+
- npm

### Backend (Django API)

Proje kök klasöründe PowerShell açıp sanal ortamı oluşturun ve bağımlılıkları yükleyin:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Backend'i başlatın:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

API, `http://127.0.0.1:8000/api/` adresinde çalışır. Geliştirme ayarları varsayılan olarak SQLite veritabanını `backend\db.sqlite3` dosyasında kullanır.

### Frontend (React/Vite)

Backend çalışır durumdayken, proje kökünde ikinci bir PowerShell açın:

```powershell
Set-Location frontend
npm install
npm run dev
```

Arayüzü Vite'ın çıktısında belirtilen yerel adreste açın (varsayılan: `http://localhost:5173`). Geliştirme modunda frontend API adresi varsayılan olarak `http://127.0.0.1:8000/api/` şeklindedir.

API adresini değiştirmek gerekiyorsa `frontend\.env.local` dosyasına aşağıdaki satırı ekleyin ve Vite'ı yeniden başlatın:

```dotenv
VITE_API_URL=http://127.0.0.1:8000/api/
```
