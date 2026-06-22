# ilhamdho convert

A high-performance, responsive, client-side PDF and file processing web application built using Vite, React, and various local client-side document processing libraries. Runs 100% in the browser.

---

## 🚀 Fitur & Kelebihan
- **100% Client-Side**: Semua file diproses langsung di browser pengunjung secara "ngebut", tanpa upload ke server mana pun (menjamin privasi & keamanan data).
- **Responsive Preview**: Pratinjau penuh halaman PDF untuk peletakan tanda tangan & edit teks yang presisi.
- **Visual PDF Tools**: Merge, Split, Compress, Sign, dan Edit PDF secara visual.
- **Document Convert**: Mengubah JPG ke PDF, PDF ke JPG, Word ke PDF, dan PDF ke Word (dengan preservasi posisi layout yang rapi).
- **Kritik & Laporan Bug Terbuka**: Kolom masukan bagi pengunjung untuk melaporkan bug atau memberikan saran langsung di web tanpa perlu membuka aplikasi luar (dilengkapi lencana pengenal *Developer*).

---

## 📊 Cara Mengaktifkan Database Masukan (Google Sheets Backend)
Kolom Kritik & Saran saat ini menggunakan penyimpanan lokal browser (`localStorage`) secara otomatis agar web bisa langsung diuji coba. 

Untuk menyambungkan database online agar semua pengunjung bisa melihat tanggapan satu sama lain dan agar Anda bisa membalasnya, ikuti panduan berikut (gratis & 1 menit selesai):

1. **Buat Google Sheet**:
   - Buka Google Sheets dan buat spreadsheet baru dengan nama `ilhamdho-convert-feedback`.
   - Buat kolom-kolom ini pada baris pertama (header):
     `ID` | `Nama` | `Kategori` | `Pesan` | `Tanggal` | `Balasan` | `Dibalas Oleh`

2. **Buka Google Apps Script**:
   - Di Google Sheets Anda, klik menu **Extensions (Ekstensi)** -> **Apps Script**.
   - Hapus semua kode bawaan, lalu paste kode berikut:

   ```javascript
   function doGet() {
     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     var rows = sheet.getDataRange().getValues();
     var comments = [];
     
     for (var i = 1; i < rows.length; i++) {
       comments.push({
         id: rows[i][0],
         name: rows[i][1],
         category: rows[i][2],
         comment: rows[i][3],
         timestamp: rows[i][4],
         reply: rows[i][5],
         repliedBy: rows[i][6]
       });
     }
     
     return ContentService.createTextOutput(JSON.stringify(comments))
       .setMimeType(ContentService.MimeType.JSON);
   }

   function doPost(e) {
     try {
       var data = JSON.parse(e.postData.contents);
       var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
       
       sheet.appendRow([
         data.id || Utilities.getUuid(),
         data.name,
         data.category,
         data.comment,
         new Date().toISOString(),
         '', // reply
         ''  // repliedBy
       ]);
       
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
         .setMimeType(ContentService.MimeType.JSON);
     } catch (err) {
       return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
         .setMimeType(ContentService.MimeType.JSON);
     }
   }
   ```

3. **Deploy Web App**:
   - Klik tombol **Deploy** di kanan atas -> **New deployment**.
   - Pilih jenis tipe: **Web app**.
   - Ubah pengaturan:
     - *Execute as*: **Me (kamu)**
     - *Who has access*: **Anyone (siapa saja)**
   - Klik **Deploy**, beri otorisasi akses akun Google Anda jika diminta.
   - Salin **URL Web App** yang dihasilkan.

4. **Masukkan URL ke Kode Proyek**:
   - Buka file `src/components/Shared/Comments.jsx`.
   - Paste URL Web App tersebut pada variabel `GOOGLE_SCRIPT_URL` di baris ke-6:
     ```javascript
     const GOOGLE_SCRIPT_URL = "URL_WEB_APP_ANDA_DISINI";
     ```
   - Commit & push pembaruan tersebut ke GitHub Anda. Selesai!

5. **Cara Membalas Komentar Pengunjung**:
   - Anda cukup membuka file Google Sheets Anda.
   - Ketik balasan Anda pada kolom `Balasan` di baris komentar yang dituju.
   - Ketik `Developer` pada kolom `Dibalas Oleh` untuk memunculkan lencana Developer emas di web.
