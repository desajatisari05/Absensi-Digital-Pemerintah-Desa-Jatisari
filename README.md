# Absensi Digital - Aplikasi Android (Capacitor)

Aplikasi absensi kerja berbasis GPS & kamera (selfie) untuk Android.

---

## Fitur

- Login sederhana
- Absen masuk & pulang dengan **foto selfie** + **GPS**
- Riwayat absensi dengan foto & lokasi
- Data tersimpan lokal di HP (Preferences)
- **Tidak ada masalah `getUserMedia`** karena kamera diakses secara native

---

## Prasyarat

1. **Node.js** (v18+) - [Download](https://nodejs.org/)
2. **Android Studio** - [Download](https://developer.android.com/studio)
3. **Java JDK** (17) - Sudah termasuk di Android Studio
4. **Android SDK** - Sudah termasuk di Android Studio

---

## Langkah Build APK

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Web App

```bash
npm run build
```

### 3. Add Platform Android (Hanya Sekali)

```bash
npx cap add android
```

### 4. Sync ke Android

```bash
npx cap sync
```

### 5. Buka di Android Studio

```bash
npx cap open android
```

### 6. Build APK di Android Studio

1. Di Android Studio, tunggu Gradle sync selesai
2. Klik menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. Tunggu proses build
4. APK akan tersimpan di:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### 7. Install ke HP

- Transfer APK ke HP (via USB, WhatsApp, atau Google Drive)
- Buka file APK di HP
- Izinkan install dari sumber tidak dikenal
- Selesai!

---

## Permission yang Dibutuhkan (Otomatis)

Capacitor otomatis menambahkan permission di `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

Saat pertama kali buka aplikasi, HP akan minta izin **Kamera** dan **Lokasi**. Pastikan **Izinkan**.

---

## Koneksi ke Backend (Opsional)

Saat ini aplikasi ini menyimpan data lokal di HP. Untuk menghubungkan ke backend server:

1. Buka `src/main.js`
2. Cari bagian `// Simulasi login` dan ganti dengan API call ke server kamu
3. Ganti juga `API_BASE_URL` di bagian atas file

Contoh koneksi ke backend:
```javascript
const res = await fetch('http://192.168.1.50:3000/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const data = await res.json();
```

---

## Struktur Folder

```
absensi-digital-apk/
├── android/              ← Dibuat otomatis oleh Capacitor
├── src/
│   ├── main.js           ← Logika utama aplikasi
│   └── style.css         ← Styling
├── dist/                 ← Hasil build web (auto)
├── index.html
├── capacitor.config.ts   ← Konfigurasi Capacitor
├── vite.config.ts
└── package.json
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `npm install` error | Pastikan Node.js v18+, coba `npm install --legacy-peer-deps` |
| Android Studio tidak terbuka | Pastikan `ANDROID_HOME` sudah diatur di environment variable |
| Kamera tidak jalan | Pastikan izin kamera diberikan di pengaturan HP |
| GPS tidak jalan | Pastikan GPS aktif di HP dan izin lokasi diberikan |
| Build gagal | Clean project: **Build > Clean Project**, lalu rebuild |

---

## Tech Stack

- **Capacitor 6** - Native bridge untuk Android
- **Vite** - Build tool
- **Vanilla JS** - Tanpa framework berat
- **Capacitor Camera** - Akses kamera native
- **Capacitor Geolocation** - Akses GPS native
- **Capacitor Preferences** - Penyimpanan lokal

---

Dibuat untuk mengatasi masalah `getUserMedia` pada aplikasi web absensi GPS.
