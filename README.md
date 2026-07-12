# 🎵 Music Vault (MusShare)

Music Vault adalah aplikasi **Decentralized Music Sharing & Streaming** yang mengusung antarmuka bergaya modern *Neumorphism/Glassmorphism*. Project ini mensimulasikan lingkungan ekosistem **Peer-to-Peer (P2P)** di mana setiap *node* (pengguna) dapat saling membagikan, mencari, dan melakukan *streaming* file audio secara langsung.

Aplikasi ini telah dimodernisasi dan di-*deploy* sepenuhnya menggunakan infrastruktur *Serverless* Vercel, menjamin performa tinggi, skalabilitas, dan aksesibilitas global tanpa batasan perangkat keras lokal.

## ✨ Fitur Utama

- **No-Login Ownership System:** Identitas pengguna dikelola menggunakan `Node-ID` unik yang dibuat secara otomatis melalui `localStorage` di browser. Tidak ada sistem registrasi dan database relasional yang rumit, memberikan anonimitas dan kemudahan akses.
- **Secure Serverless Storage:** Menggunakan integrasi modern `@vercel/blob` untuk penyimpanan file audio secara aman (Private Blob). File musik Anda hanya bisa diputar melalui URL *presigned* yang terenkripsi dan sementara, mencegah pencurian *bandwidth* atau unduhan ilegal.
- **Live Audio Streaming:** Mendukung *HTTP 206 Partial Content* melalui Vercel Blob *streaming*. Pengguna dapat melompati (seek/skip) menit ke berapapun dalam lagu tanpa harus mengunduh file secara utuh (anti-buffering).
- **Audio Visualizer:** Animasi grafik frekuensi suara *real-time* yang digambar secara mulus di atas elemen `<canvas>` menggunakan Web Audio API murni.
- **Secure File Deletion:** File musik Anda tidak bisa dihapus oleh pengguna lain. API Serverless memverifikasi kepemilikan file dengan mencocokkan *Header X-Node-Id* pengirim dengan *prefix* kepemilikan yang tersimpan di sistem penyimpanan awan.
- **Network Telemetry:** Statistik lalu lintas secara *real-time* yang menampilkan latensi (*ping*) jaringan, total *peer* yang sedang aktif secara global, dan total lagu unik yang tersedia di ekosistem keseluruhan.

## 💻 Tech Stack (Modern Serverless Architecture)

Project ini dirancang untuk menunjukkan keahlian integrasi Vanilla Frontend murni dengan modern Backend *Serverless* yang efisien:
- **Frontend:** Vanilla HTML5, CSS3 (Flexbox/Grid dengan pola UI *Neumorphism* & *Glassmorphism*), dan Vanilla JavaScript murni. Bebas dari *bloatware* dan framework raksasa, membuktikan penguasaan fundamental web sejati (DOM Manipulation, Web Audio API, Web Storage, Event Delegation).
- **Backend (Serverless):** Node.js menggunakan *framework* ringan **Express.js** yang dieksekusi sebagai fungsi *Serverless* di platform **Vercel** (`api/index.js`).
- **Database / File Storage:** Mengandalkan arsitektur penyimpanan modern **Vercel Blob** untuk manajemen file statis dan biner tanpa batas, menggantikan metode *in-memory* dan *file-system* lokal usang.
- **State Management:** Memanfaatkan *In-Memory Maps* tingkat *instance* pada fungsi serverless yang dikombinasikan dengan pembacaan metadata *Vercel Blob* berkecepatan tinggi untuk pencarian file instan.

---

## 📂 Struktur Direktori

```text
music-vault/
├── api/
│   └── index.js           # Serverless Node.js Backend API (Express.js) - Endpoint routing, auth, & Vercel Blob SDK operations
├── index.html             # Halaman antarmuka utama (UI)
├── css/
│   ├── core.css           # Styling dasar, layouting, & variabel warna utama
│   ├── ui.css             # Logika desain komponen Neumorphism/Glassmorphism tingkat lanjut
│   └── upload.css         # Styling spesifik halaman library, visualizer, animasi status upload, & micro-interactions
├── js/
│   ├── core.js            # Inisialisasi P2P Node, Network Stats, logika Web Audio API (Visualizer), & Heartbeat system
│   ├── search.js          # Mesin pencari dinamis dan sistem relasi antar node
│   ├── upload.js          # Sistem antrean upload sequential, File Reader, limitasi file, & fitur hapus aman
│   └── playlist.js        # Modul manajemen struktur data playlist berbasis klien
├── package.json           # Dependensi aplikasi Node.js (Express, Vercel Blob SDK)
└── vercel.json            # Konfigurasi routing serverless deployment & rule headers
```

## 🚀 Instalasi & Menjalankan Secara Lokal

Meskipun aplikasi ini menggunakan infrastruktur Vercel, Anda tetap bisa menjalankannya di komputer lokal Anda untuk pengembangan (*development*).

**Prasyarat:**
1. [Node.js](https://nodejs.org/) terinstal di komputer.
2. Akun Vercel dan [Vercel CLI](https://vercel.com/docs/cli) terinstal (`npm i -g vercel`).
3. Project Vercel Blob sudah dikonfigurasi di *dashboard* Vercel Anda untuk mendapatkan token.

**Langkah-langkah:**

1. Klon (*clone*) repositori ini dan masuk ke foldernya:
   ```bash
   git clone <url-repo-anda>
   cd music-vault
   ```
2. Instal semua dependensi Node.js:
   ```bash
   npm install
   ```
3. Hubungkan ke project Vercel Anda dan tarik *Environment Variables* (Token Vercel Blob):
   ```bash
   vercel link
   vercel env pull .env.local
   ```
4. Jalankan server pengembangan (*Development Server*) Vercel secara lokal:
   ```bash
   vercel dev
   ```
5. Buka browser Anda dan akses aplikasi di URL yang disediakan oleh terminal (biasanya `http://localhost:3000`). Semua routing API (`/api/...`) dan halaman frontend akan ditangani secara otomatis oleh Vercel CLI selayaknya berjalan di *production*.

## 📌 Status Project & Deployment

Aplikasi ini sepenuhnya siap tayang di lingkungan **Production** (Telah dicoba dengan stabil) melalui integrasi otomatis CI/CD Vercel. 

Silakan coba versi Live-nya secara langsung: 
👉 **[Kunjungi Demo Aplikasi Music Vault](https://music-vault-sigma.vercel.app/)**
