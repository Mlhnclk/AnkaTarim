# Anka Tarimsal Takip

## Offline Windows installer

The Electron app bundles the React interface and a local Django API. It does not need a network connection for normal data entry. WhatsApp and Google Maps actions still open online services.

Build on Windows from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-desktop.txt
Set-Location frontend
npm install
$env:PATH = (Resolve-Path ..\.venv\Scripts).Path + ';' + $env:PATH
npm run desktop:build
```

The installer for version 0.3.6 is created at `frontend/release/Anka Tarimsal Takip Setup 0.3.6.exe`.

The local database is `%APPDATA%\Anka Tarimsal Takip\db.sqlite3`. The first launch copies `backend/db.sqlite3` there as initial data; later launches use the AppData copy and do not overwrite it. Back up that file to preserve local records.

The installer contains the current `backend/db.sqlite3` contents as its initial seed. Remove private or production records from that database before sharing the installer with other people.

## Excel reports

The report screens export one `.xlsx` workbook with nine filterable sheets: overall summary, producer summary and movements, producer products and payments, merchant summary, merchant product totals and sale details, and merchant collections. Current debts and credits are shown separately for each producer and merchant.
