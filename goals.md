# Arahan Lengkap (Step-by-Step) Pengerjaan Proyek IoT: ESP32 + Nuxt + Supabase

Halo Tim / Junior Developer! Dokumen ini adalah panduan kerja **sangat detail langkah demi langkah** untuk menyelesaikan integrasi alat ukur ESP32 ke website Nuxt menggunakan Supabase. 

Ikuti urutan dari Langkah 1 hingga selesai secara berurutan. **Jangan melompat ke langkah berikutnya jika langkah sebelumnya belum berhasil atau masih error.**

---

## 🛠️ LANGKAH 1: Setup Awal Backend (Supabase)

1. Buka [Supabase](https://supabase.com/) dan lakukan Login / Register.
2. Klik **New Project**, beri nama (misal: `iot-sensor-project`), buat password database, dan pilih region terdekat (misal: Singapore).
3. Tunggu hingga project selesai di-setup (sekitar 2-3 menit).
4. Masuk ke menu **Project Settings > API**. 
5. Salin dan simpan di notepad Anda:
   - **Project URL**
   - **Project API Key (anon / public)**

---

## 🗄️ LANGKAH 2: Membuat Tabel Database di Supabase

Kita butuh 2 tabel: satu untuk mencatat alat yang dimiliki user, dan satu untuk mencatat hasil ukur (data sensor).

1. Di dashboard Supabase, masuk ke menu **SQL Editor**.
2. Klik **New Query**.
3. *Copy-Paste* kode SQL di bawah ini dan klik **RUN**:

```sql
-- 1. Buat tabel devices (Menyimpan daftar alat ESP32 milik user)
CREATE TABLE public.devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Buat tabel measurements (Menyimpan hasil sensor dari ESP32)
CREATE TABLE public.measurements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_code TEXT REFERENCES public.devices(device_code) ON DELETE CASCADE NOT NULL,
    value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Aktifkan Realtime untuk tabel measurements
ALTER PUBLICATION supabase_realtime ADD TABLE public.measurements;
```

---

## 🔒 LANGKAH 3: Setting Keamanan Data (Row Level Security / RLS)

Sangat penting agar user hanya bisa melihat data alatnya sendiri.

1. Masih di **SQL Editor**, hapus query sebelumnya.
2. *Copy-Paste* kode SQL ini dan klik **RUN** untuk memasang sekuriti:

```sql
-- Aktifkan RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- Policy untuk Devices: User hanya bisa melihat, menambah, menghapus device miliknya sendiri
CREATE POLICY "User can view own devices" ON public.devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own devices" ON public.devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can delete own devices" ON public.devices FOR DELETE USING (auth.uid() = user_id);

-- Policy untuk Measurements (PENTING!):
-- 1. ESP32 (menggunakan Anon Key tanpa login) BISA MENGIRIM / INSERT DATA
CREATE POLICY "ESP32 can insert measurements" ON public.measurements FOR INSERT WITH CHECK (true);

-- 2. User di Web hanya bisa MELIHAT/SELECT pengukuran jika device_code-nya cocok dengan miliknya di tabel devices
CREATE POLICY "User can view own measurements" ON public.measurements FOR SELECT USING (
    device_code IN (SELECT device_code FROM public.devices WHERE user_id = auth.uid())
);
```

---

## 💻 LANGKAH 4: Inisialisasi Frontend (Nuxt 3)

1. Buka Terminal/Command Prompt di komputer Anda.
2. Buat project Nuxt baru:
   ```bash
   npx nuxi@latest init web-dashboard
   cd web-dashboard
   npm install
   ```
3. Install modul Supabase untuk Nuxt:
   ```bash
   npm install @nuxtjs/supabase
   ```
4. Tambahkan modul di `nuxt.config.ts`:
   ```typescript
   export default defineNuxtConfig({
     modules: ['@nuxtjs/supabase']
   })
   ```
5. Buat file `.env` di dalam folder `web-dashboard`, isi dengan data dari Langkah 1:
   ```env
   SUPABASE_URL="https://[ID-PROJECT].supabase.co"
   SUPABASE_KEY="[ANON-KEY-PROJECT]"
   ```

---

## 👤 LANGKAH 5: Membuat Fitur Login & Pendaftaran (Nuxt)

Di Nuxt, Anda perlu membuat halaman untuk User login agar Supabase tahu siapa yang sedang mengakses data.

Gunakan kode *composable* bawaan `@nuxtjs/supabase`:
```vue
<!-- Halaman Login (pages/login.vue) -->
<script setup>
const supabase = useSupabaseClient()
const email = ref('')
const password = ref('')

const handleLogin = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  if (!error) navigateTo('/dashboard')
}
</script>
```
*Tugas Anda:* Rapikan UI form-nya (tambahkan HTML input untuk email dan password).

---

## 📊 LANGKAH 6: Membuat Fitur Dashboard & Real-Time (Nuxt)

Di halaman dashboard, ada 2 fitur utama yang harus Anda buat:

**1. Form Tambah Alat (Device Pairing):**
Buat form di mana user mengetik `device_code` (misal: "ESP32-A1") lalu tekan submit.
```javascript
// Logika simpan alat ke akun user:
const user = useSupabaseUser()
await supabase.from('devices').insert({
  device_code: "ESP32-A1", // didapat dari input form
  user_id: user.value.id
})
```

**2. Menampilkan Data Secara Real-Time (Ajaib):**
Saat ESP32 mengirim data ke database, layar Nuxt harus ter-update sendiri tanpa refresh!
```javascript
const measurements = ref([]) // State untuk nyimpan angka hasil ukur di layar

onMounted(() => {
  // 1. Ambil data awal dari database
  // 2. Aktifkan Real-Time Listener
  supabase.channel('custom-all-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'measurements' },
      (payload) => {
        // payload.new berisi baris data baru dari ESP32
        console.log('Ada ukuran baru masuk!', payload.new.value)
        measurements.value.unshift(payload.new) // update UI
      }
    )
    .subscribe()
})
```

---

## 🔌 LANGKAH 7: Pemrograman Hardware ESP32 (Arduino IDE)

Tugas ini dilakukan di perangkat ESP32. ESP32 bertugas sebagai pengirim data *via* HTTP POST.

1. Buka Arduino IDE.
2. Install library: **ArduinoJson** by Benoit Blanchon.
3. Gunakan `WiFiClientSecure` dan `HTTPClient` untuk mengirim POST request ke URL Supabase.
4. **Endpoint (URL):** `https://[ID-PROJECT].supabase.co/rest/v1/measurements`
5. **Headers yang wajib disisipkan di Arduino:**
   *   `apikey: [ANON-KEY-PROJECT]`
   *   `Authorization: Bearer [ANON-KEY-PROJECT]`
   *   `Content-Type: application/json`
   *   `Prefer: return=minimal`
6. **Body JSON (Data yang dikirim):**
   ```json
   {
     "device_code": "ESP32-A1", 
     "value": 172.5
   }
   ```
*(Catatan Penting: `device_code` di ESP32 ("ESP32-A1") HARUS SAMA PERSIS dengan kode alat yang didaftarkan user di website pada Langkah 6).*

---

## ✅ LANGKAH 8: Final Testing (End-to-End)

Setelah semua langkah di atas selesai, lakukan uji coba final:
1. Jalankan web Nuxt (`npm run dev`).
2. Login sebagai User A di web.
3. Di web, daftarkan alat dengan kode **"ALAT-001"**.
4. Nyalakan alat ESP32 (Pastikan di kode Arduino ESP32 sudah di set *hardcode* mengirim JSON dengan `device_code: "ALAT-001"`).
5. Lakukan pengukuran fisik di alat ESP32.
6. Lihat layar web Nuxt Anda. Jika angka ukur muncul detik itu juga (Real-Time), **SELAMAT! PROYEK ANDA BERHASIL! 🚀**

*Jika ada yang gagal, ulangi cek pesan error di konsol browser (F12) Nuxt atau di Serial Monitor Arduino IDE.*
