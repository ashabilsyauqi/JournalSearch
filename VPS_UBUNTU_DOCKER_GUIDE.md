# Panduan Lengkap Setup & Deploy VPS Ubuntu dengan Docker & Nginx SSL

Panduan ini dirancang untuk VPS Ubuntu baru (Ubuntu 22.04 / 24.04 LTS).

---

## 1. Akses VPS & Update Sistem
Login ke VPS via terminal/PowerShell:
```bash
ssh root@IP_VPS_ANDA
```
Jalankan update sistem:
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 2. Install Docker & Docker Compose Plugin (Official)
Jalankan perintah 1-baris instalasi resmi Docker di Ubuntu:
```bash
curl -fsSL https://get.docker.com | sh
```
Aktifkan dan pastikan Docker service menyala:
```bash
sudo systemctl enable docker
sudo systemctl start docker
docker --version
docker compose version
```

---

## 3. Clone Repository dari GitHub
```bash
cd /opt
git clone https://github.com/ashabilsyauqi/JournalSearch.git
cd JournalSearch
```
*(Opsional jika ingin beralih ke branch sandbox)*:
```bash
git checkout sandbox
```

---

## 4. Konfigurasi Environment File (.env)
Salin template environment:
```bash
cp .env.example .env
```
Edit dengan nano jika ingin mengubah key:
```bash
nano .env
```
*(Tekan `Ctrl + O` lalu `Enter` untuk save, `Ctrl + X` untuk exit)*.

---

## 5. Build & Jalankan Container dengan Docker Compose
```bash
docker compose up -d --build
```
Cek status container:
```bash
docker ps
```
Cek log aplikasi jika diperlukan:
```bash
docker logs -f journalsearch_app
```

Aplikasi sekarang sudah aktif di port `3000` (`http://IP_VPS_ANDA:3000`).

---

## 6. (Sangat Disarankan) Pasang Nginx & SSL HTTPS Gratis (Certbot)
Agar domain Anda bisa diakses via `https://domainanda.com` dengan aman:

### A. Install Nginx & Certbot
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### B. Buat Konfigurasi Nginx
```bash
sudo nano /etc/nginx/sites-available/journalsearch
```
Tempel konfigurasi berikut (ganti `domainanda.com` dengan domain asli Anda):
```nginx
server {
    server_name domainanda.com www.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Aktifkan konfigurasi dan reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/journalsearch /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### C. Pasang SSL Gratis (Let's Encrypt)
Pastikan DNS domain Anda (A Record) sudah mengarah ke IP VPS Anda, lalu jalankan:
```bash
sudo certbot --nginx -d domainanda.com -d www.domainanda.com
```
Pilih opsi redirect HTTP ke HTTPS otomatis.

---

## 7. Perintah Praktis Maintenance
- **Restart Container**: `docker compose restart`
- **Update Code Terbaru dari GitHub**:
  ```bash
  git pull origin main
  docker compose up -d --build
  ```
- **Stop Container**: `docker compose down`
