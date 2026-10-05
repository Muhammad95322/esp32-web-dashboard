# Panduan Eksekusi Proyek IoT: Sensor ke Nuxt & Supabase (Arahan Lengkap)

Dokumen ini adalah **Goals & Execution Plan** yang dirancang sebagai panduan kerja detail (A-Z) untuk *Junior Developer*. Harap baca dan ikuti setiap instruksi dengan saksama untuk menghindari *error* arsitektur atau *bug* integrasi.

---

## 🎯 1. Tujuan Utama & Arsitektur (The Goal)
Membangun sistem IoT di mana **ESP32 membaca data sensor (misal: pengukuran tinggi 172.5 cm) dan menampilkannya langsung ke smartphone/komputer pengguna** melalui website secara *real-time*.

**Kunci Penting:**
Pengguna tidak perlu melakukan koneksi ke Wi-Fi ESP32 secara manual (bukan mode *Access Point* lokal yang merepotkan). ESP32 akan terkoneksi ke Wi-Fi/Internet secara independen, dan pengguna cukup mengakses website menggunakan internet di HP mereka.

### **Tech Stack yang Digunakan:**
*   **Hardware:** ESP32 + Sensor
*   **Konektivitas:** Wi-Fi + HTTP REST API (atau MQTT)
*   **Backend & Database:** Supabase (PostgreSQL + Auth + Realtime)
*   **Frontend Web:** Nuxt.js (Vue.js Framework)

---

## 🧠 2. Bagaimana Sistem Mengetahui Data Milik User yang Login?
Ini adalah bagian paling krusial. Agar angka "172.5 cm" dari ESP32 masuk ke akun user yang benar (dan bukan ke akun orang lain), kita menggunakan konsep **Device ID Pairing (Pemetaan Perangkat)**.

**Logikanya:**
1. Setiap alat ESP32 memiliki **ID Unik** (misalnya `ESP32-MAC-ADDRESS` atau kode unik yang di-generate).
2. Di website (Nuxt), saat user pertama kali memakai alat, mereka harus memasukkan/menambahkan **ID Unik** tersebut ke akun mereka.
3. Saat ESP32 mengirim data ke Supabase, ESP32 menyertakan **ID Unik** tersebut.
4. Supabase secara otomatis melihat, "Oh, data dengan ID alat ini adalah milik User A".
5. Website langsung menampilkan data tersebut di layar HP User A secara *real-time*.

---

## 🛠️ 3. Roadmap & Langkah Kerja Eksekusi (Step-by-Step)

### FASE 1: Setup Backend (Supabase & PostgreSQL)
*Tugas: Menyiapkan fondasi database, autentikasi, dan keamanan.*

1. **Buat Project di Supabase:** Buat project baru dan simpan `Project URL` serta `anon_key`.
2. **Buat Tabel Database:**
   *   **Tabel `devices`**:
       *   `id` (uuid, primary key)
       *   `device_code` (text, unik - ID dari ESP32)
       *   `user_id` (uuid, foreign key ke tabel auth.users Supabase)
   *   **Tabel `measurements`**:
       *   `id` (uuid, primary key)
       *   `device_id` (uuid, foreign key ke tabel `devices`)
       *   `value` (numeric/float - menyimpan hasil ukuran seperti 172.5)
       *   `created_at` (timestamp)
3. **Konfigurasi Row Level Security (RLS) - WAJIB:**
   *   Aktifkan RLS di tabel `devices` dan `measurements`.
   *   Buat *policy* agar user (yang sedang login) HANYA BISA melihat dan membaca data dari tabel `measurements` yang terhubung dengan `device_id` miliknya. (Sangat penting agar data tidak bocor antar pengguna).

### FASE 2: Setup Frontend Web (Nuxt.js)
*Tugas: Membangun UI/UX website, sistem login, dan dashboard Real-time.*

1. **Inisialisasi Project:** Buat project Nuxt 3 baru (`npx nuxi@latest init web-app`).
2. **Install Supabase Module:** Install `@nuxtjs/supabase` dan konfigurasikan `.env` dengan `URL` dan `Key` dari Fase 1.
3. **Buat Halaman Autentikasi (`/login` & `/register`):**
   *   Buat form login/register menggunakan Supabase Auth (Email & Password).
4. **Buat Halaman Dashboard Utama (`/dashboard`):**
   *   **Fitur Pairing:** Buat input teks di mana user bisa memasukkan `device_code` (ID Alat) mereka untuk didaftarkan ke akunnya (Menyimpan data ke tabel `devices`).
   *   **Tampilan Hasil:** Buat komponen UI (seperti kartu atau meteran besar) untuk menampilkan angka pengukuran.
5. **Implementasi Real-time Listener (Crucial Step):**
   *   Gunakan fitur **Supabase Realtime** di Nuxt.
   *   Buat *listener/subscription* ke tabel `measurements`. Begitu ada baris data baru ditambahkan ke tabel tersebut yang cocok dengan alat milik user, *update state* di layar secara instan (tanpa perlu *refresh* halaman).

### FASE 3: Pemrograman Hardware (ESP32)
*Tugas: Mengirim data sensor secara aman ke cloud.*

1. **Koneksi Jaringan:** Tulis fungsi agar ESP32 bisa terkoneksi ke jaringan Wi-Fi lokal.
2. **Pembacaan Sensor:** Tulis logika untuk membaca data dari sensor dengan akurat dan ubah nilainya menjadi angka (float/desimal, contoh: 172.5).
3. **Kirim Data ke Supabase (REST API HTTP POST):**
   *   ESP32 tidak perlu MQTT jika menggunakan Supabase. ESP32 cukup melakukan HTTP POST langsung ke endpoint REST API Supabase.
   *   **Endpoint:** `https://[PROJECT-ID].supabase.co/rest/v1/measurements`
   *   **Headers:**
       *   `apikey: [SUPABASE-ANON-KEY]`
       *   `Authorization: Bearer [SUPABASE-ANON-KEY]`
       *   `Content-Type: application/json`
   *   **Body (JSON):**
       ```json
       {
         "device_code": "KODE-UNIK-ESP32-INI",
         "value": 172.5
       }
       ```
   *(Catatan: Anda mungkin perlu menyesuaikan sedikit backend menggunakan Supabase Edge Functions atau Trigger jika ESP32 hanya mengirim `device_code` agar Supabase bisa men-translate-nya menjadi relasi `device_id` internal).*

### FASE 4: Pengujian & Integrasi (Testing)
1. Nyalakan ESP32 dan biarkan alat mengukur.
2. Login ke website Nuxt menggunakan HP/Laptop.
3. Daftarkan kode alat ESP32 ke dalam dashboard akun Anda.
4. Lakukan pengukuran fisik dengan sensor.
5. Pastikan layar HP secara ajaib menampilkan ukuran "172.5 cm" detik itu juga tanpa di-*refresh*.
6. Login menggunakan akun *berbeda*, pastikan akun tersebut **tidak bisa melihat** data dari akun sebelumnya.

---

## ⚠️ Mitigasi Error (Checklist Sebelum Deploy)
- [ ] **Error CORS pada API:** Pastikan domain website Nuxt sudah di-whitelist di pengaturan API Supabase.
- [ ] **Data tidak muncul (Blank):** Pastikan RLS (Row Level Security) di Supabase diatur dengan benar. Sering kali Junior lupa mengatur RLS sehingga data tertolak dibaca oleh Frontend.
- [ ] **ESP32 Gagal POST ke HTTPS:** Supabase menggunakan HTTPS. Pastikan HTTP Client di ESP32 mendukung koneksi HTTPS/SSL, gunakan `WiFiClientSecure` di Arduino IDE, bukan `WiFiClient` biasa, dan nonaktifkan verifikasi sertifikat (`client.setInsecure()`) jika diperlukan untuk *testing*.
- [ ] **State Nuxt Hilang:** Pastikan state pengguna (user session) tetap ada setelah *refresh* halaman menggunakan modul bawaan `@nuxtjs/supabase`.

---
*Semangat mengerjakan! Ikuti dokumen ini dari atas ke bawah, selesaikan fase per fase. Jangan lompat ke Fase 3 jika Fase 1 belum di-test dan berjalan baik.*
