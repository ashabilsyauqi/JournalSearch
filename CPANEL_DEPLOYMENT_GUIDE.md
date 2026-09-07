# Panduan Lengkap Deploy JournalSearch ke cPanel (Node.js App)

Aplikasi **JournalSearch** dibangun menggunakan **Node.js murni (Zero Runtime NPM Dependencies)** sehingga sangat ringan, cepat, dan 100% kompatibel dengan fitur **Setup Node.js App** di cPanel.

---

## Langkah 1: Upload File ke cPanel
1. Login ke cPanel hosting Anda.
2. Buka menu **File Manager**.
3. Masuk ke folder root domain/subdomain Anda (misal: `public_html` atau `public_html/jurnalsearch`).
4. Upload semua file project ini atau clone via Git Version Control di cPanel.

---

## Langkah 2: Setup Node.js App di cPanel
1. Di cPanel, cari menu **Setup Node.js App** (di bawah kategori *Software*).
2. Klik tombol **Create Application**.
3. Isi kolom konfigurasi berikut:
   - **Node.js version**: Pilih versi **18.x**, **20.x**, atau **22.x** (disarankan 20.x LTS).
   - **Application mode**: Pilih **Production** (atau *Development* jika ingin testing).
   - **Application root**: Folder tempat file diletakkan (misal: `public_html`).
   - **Application URL**: Domain/subdomain Anda (misal: `https://jurnal.domainanda.com`).
   - **Application startup file**: Isi dengan `server.js`.
4. Tambahkan **Environment Variables** (opsional tapi disarankan):
   - `PORT`: (diisi otomatis oleh cPanel)
   - `MIDTRANS_IS_PRODUCTION`: `true` (jika sudah live) atau `false` (jika sandbox)
   - `MIDTRANS_CLIENT_KEY`: `SB-Mid-client-DaJUK8F_z4TcxoeX` (atau key production)
   - `MIDTRANS_SERVER_KEY`: `SB-Mid-server-MCYu6evcz6fch1r9DhK5xWcN` (atau key production)
   - `MIDTRANS_MERCHANT_ID`: `G740209003`
5. Klik **Create**.

---

## Langkah 3: Menjalankan Aplikasi
1. Klik tombol **Run JS script** atau **Restart** pada halaman Setup Node.js App.
2. Buka URL domain Anda di browser.
3. Aplikasi siap digunakan untuk customer / mahasiswa secara live!

---

## Konfigurasi Midtrans Notification URL (Webhook)
Di dashboard Midtrans (**Settings -> Configuration**):
- **Payment Notification URL**: `https://domainanda.com/api/payment/notification`
- **Finish Redirect URL**: `https://domainanda.com/`
- **Unfinish Redirect URL**: `https://domainanda.com/`
- **Error Redirect URL**: `https://domainanda.com/`
