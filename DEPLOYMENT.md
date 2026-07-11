# Music Vault - Deployment Guide

## Status: Backend sudah di-rewrite ke Node.js untuk Vercel

Anda bisa mematikan laptop sekarang. Semua perubahan sudah saya simpan di lokal.
Ikuti langkah-langkah di bawah ini saat Anda kembali online.

---

## Langkah Selanjutnya (Setelah Kembali Online)

### 1. Push Perubahan ke GitHub

Buka terminal di direktori project dan jalankan:

```bash
cd "/home/spfariza/Downloads/project /Music Vault"
git add .
git commit -m "Rewrite backend to Node.js for Vercel deployment"
git push origin main
```

### 2. Deploy ke Vercel

1. Buka https://vercel.com
2. Login dengan akun GitHub Anda
3. Klik "Add New..." → "Project"
4. Pilih repository `music-vault`
5. Klik "Import"
6. Klik "Deploy" (tanpa perlu ubah setting apapun)
7. Tunggu proses deploy selesai (2-3 menit)
8. Anda akan mendapat URL seperti: `https://music-vault-xxxx.vercel.app`

### 3. Setup Vercel Blob Storage (Untuk Upload File)

Agar fitur upload musik berfungsi, Anda perlu aktifkan Vercel Blob:

1. Buka https://vercel.com/dashboard
2. Pilih project `music-vault`
3. Klik tab "Storage"
4. Klik "Create Database" → pilih "Blob"
5. Beri nama: `music-storage`
6. Klik "Create"
7. Klik "Connect to Project" → pilih `music-vault`
8. Environment variable `BLOB_READ_WRITE_TOKEN` akan otomatis ditambahkan

### 4. Redeploy (Setelah Connect Blob)

1. Setelah connect Blob storage, buat redeploy:
2. Di dashboard Vercel project, klik "Deployments"
3. Klik tombol "..." di deployment terbaru
4. Pilih "Redeploy"

### 5. Test Aplikasi

Buka URL Vercel Anda dan test:
- ✅ Upload musik
- ✅ Search file
- ✅ Play music (streaming)
- ✅ Delete file (hanya owner yang bisa hapus)
- ✅ Create playlist
- ✅ Add/remove songs dari playlist

---

## Struktur API Endpoints

Backend baru menggunakan Node.js dengan struktur:

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/stats` | GET | Network stats |
| `/api/heartbeat` | POST | Peer activity |
| `/api/search?q=...` | GET | Cari file |
| `/api/upload` | POST | Upload file |
| `/api/list_files` | GET | Daftar semua file |
| `/api/delete_file?filename=...` | DELETE | Hapus file (owner only) |
| `/api/music/[filename]` | GET | Stream audio (HTTP 206) |
| `/api/playlists` | GET | Daftar playlist |
| `/api/playlist/create` | POST | Buat playlist |
| `/api/playlist/add_song` | POST | Tambah lagu ke playlist |
| `/api/playlist/remove_song` | POST | Hapus lagu dari playlist |
| `/api/playlist/songs?playlistId=...` | GET | Daftar lagu di playlist |

---

## File yang Diubah/Ditambah

**Baru:**
- `package.json` - Dependencies Node.js
- `vercel.json` - Konfigurasi Vercel
- `api/_store.js` - Data store (in-memory)
- `api/stats.js` - Stats endpoint
- `api/heartbeat.js` - Heartbeat endpoint
- `api/search.js` - Search endpoint
- `api/upload.js` - Upload endpoint
- `api/list_files.js` - List files endpoint
- `api/delete_file.js` - Delete file endpoint
- `api/music/[filename].js` - Audio streaming
- `api/playlists.js` - List playlists
- `api/playlist/create.js` - Create playlist
- `api/playlist/add_song.js` - Add song to playlist
- `api/playlist/songs.js` - Get playlist songs
- `api/playlist/remove_song.js` - Remove song from playlist

**Dimodifikasi:**
- `js/core.js` - Backend URL diubah ke `/api` (relative path)

**Tidak berubah:**
- `IndexingServer.java` - Tetap ada, bisa dijalankan lokal
- `index.html` - Tidak berubah
- `css/*` - Tidak berubah
- `js/search.js`, `js/upload.js`, `js/playlist.js` - Perlu update minor (opsional)

---

## Catatan Penting

1. **Vercel Blob Storage** diperlukan untuk menyimpan file upload. Tanpa ini, fitur upload tidak akan berfungsi di production.

2. **In-Memory Storage** - Data playlists dan file index disimpan di memory. Artinya:
   - Data akan reset setiap redeploy/cold start
   - Untuk produksi yang lebih stabil, pertimbangkan gunakan database eksternal (Supabase, PlanetScale, dll)

3. **Free Tier Limits**:
   - Vercel: 100GB bandwidth/bulan
   - Vercel Blob: 500MB storage gratis
   - Cukup untuk project portfolio/demo

4. **Cold Start** - Serverless function butuh 1-3 detik untuk "wake up" saat idle. Ini normal.

---

## Jika Ada Masalah

### Error: "Failed to fetch"
- Pastikan sudah deploy di Vercel
- Cek apakah Blob storage sudah connect

### Error: "Upload failed"
- Pastikan `BLOB_READ_WRITE_TOKEN` sudah ada di environment variables
- Redeploy setelah connect Blob storage

### Audio tidak bisa diputar
- Pastikan file sudah upload ke Blob storage
- Cek console browser untuk error detail

---

Selamat istirahat! Project sudah siap deploy. 🎵
