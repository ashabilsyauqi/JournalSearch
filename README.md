# Sistem Rekomendasi Jurnal Ilmiah Berdasarkan Judul Skripsi

Aplikasi cerdas untuk membantu mahasiswa, dosen, dan peneliti menemukan bahan bacaan, tinjauan pustaka, landasan teori, dan metodologi ilmiah **hanya dengan menginputkan rencana judul skripsi**.

Sistem ini terhubung langsung ke pangkalan data publikasi resmi dunia (**OpenAlex** dan **Crossref**) yang memuat lebih dari 250 juta karya ilmiah, termasuk jurnal-jurnal nasional terakreditasi (SINTA, Garuda, Neliti, OJS kampus) dan jurnal internasional bereputasi tinggi (Scopus, DOAJ, IEEE, Elsevier, Springer).

---

## 🌟 Fitur Utama

1. **Pencarian Hanya Dengan Judul Skripsi**:
   - Sistem secara otomatis membedah judul skripsi: mendeteksi jenis penelitian (Kausalitas, Pengembangan Metodologis, Evaluatif), mengekstrak variabel kunci (Variabel X, Variabel Y, Metode/Algoritma), dan menerjemahkan padanan istilah akademik internasional secara otomatis.
2. **Minimal 20 Jurnal Terpublikasi Terjamin**:
   - Sistem melakukan *multi-query aggregation* dan *deduplication* untuk menjamin pengguna mendapatkan minimal 20 artikel jurnal terpublikasi nyata (bahkan bisa mencapai 50+ artikel relevan).
3. **Rekomendasi Penempatan Bab Skripsi**:
   - Setiap kartu jurnal dilengkapi analisis kecocokan bab:
     * *Bab 1*: Latar Belakang & Urgensi Penelitian
     * *Bab 2*: Tinjauan Pustaka & Landasan Teori Variabel
     * *Bab 3*: Metodologi Penelitian, Algoritma, & Desain Sistem
     * *Bab 4*: Pembahasan Komparatif & Diskusi Hasil
4. **Tautan Akses Langsung**:
   - Tautan DOI resmi ke penerbit jurnal.
   - Tombol unduh **PDF Fulltext Gratis** untuk jurnal yang berstatus Open Access.
5. **Format Sitasi Otomatis 1-Klik**:
   - Tersedia format sitasi instan: **APA 7th Edition**, **IEEE**, **Harvard**, dan **BibTeX**.
6. **Koleksi Acuan Skripsi & Ekspor Lengkap**:
   - Tandai jurnal favorit dengan bintang (★).
   - Salin semua daftar pustaka terformat rapi sesuai abjad.
   - Ekspor draf daftar pustaka ke file `.txt` (siap tempel di Microsoft Word).
   - Ekspor file `.bib` (siap diimpor ke Mendeley atau Zotero).
7. **Filter & Sorting Interaktif**:
   - Filter rentang tahun (5 tahun terakhir: standar skripsi 2021-2026, atau semua).
   - Filter bahasa (Jurnal Indonesia / Jurnal Internasional).
   - Filter khusus Open Access (Hanya yang bisa diunduh gratis).
   - Urutkan berdasarkan Relevansi, Tahun Terbaru, atau Sitasi Terbanyak.

---

## 🚀 Cara Menjalankan

### Cara 1: Menggunakan File `start.bat` (Termudah di Windows)
Cukup klik dua kali file **`start.bat`**. Browser akan otomatis terbuka ke `http://localhost:3000`.

### Cara 2: Melalui Terminal / Command Prompt
1. Buka folder ini di terminal:
   ```bash
   cd C:\Users\Swanto\.gemini\antigravity\scratch\sistem-pencari-jurnal
   ```
2. Jalankan perintah:
   ```bash
   node server.js
   ```
3. Buka browser di alamat:
   ```
   http://localhost:3000
   ```

---

## 🧪 Menjalankan Pengujian Otomatis
Untuk memverifikasi bahwa sistem mampu menemukan minimal 20 jurnal di berbagai bidang skripsi (Manajemen, Informatika AI, dan Pendidikan):
```bash
node test-search.js
```
