// KONFIGURASI FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBt-42sZAQTSgHTYTEDE6nI85w8kF-3RLc",
  authDomain: "muhamad-ilham-saputra.firebaseapp.com",
  databaseURL: "https://muhamad-ilham-saputra-default-rtdb.firebaseio.com",
  projectId: "muhamad-ilham-saputra",
  storageBucket: "muhamad-ilham-saputra.firebasestorage.app",
  messagingSenderId: "224625005055",
  appId: "1:224625005055:web:03b4750c2b64a213bf17ca",
  measurementId: "G-GMHHFB0XL4"
};

// INISIALISASI FIREBASE
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DATA DEFAULT ARMADA
const defaultArmada = {
  "Elf (12-20 Kursi)": { status: "TERSEDIA", bookings: [] },
  "Medium Bus (25-39 Kursi)": { status: "TERSEDIA", bookings: [] },
  "Big Bus (45-59 Kursi)": { status: "TERSEDIA", bookings: [] },
  "Truk Engkel": { status: "TERSEDIA", bookings: [] },
  "Truk Fuso": { status: "TERSEDIA", bookings: [] },
  "Truk Trailer": { status: "TERSEDIA", bookings: [] }
};

// AMBIL DATA ARMADA DARI LOCALSTORAGE
function getArmadaData() {
  const localData = localStorage.getItem("ijt_armada_status");
  if (!localData) {
    localStorage.setItem("ijt_armada_status", JSON.stringify(defaultArmada));
    return defaultArmada;
  }
  const data = JSON.parse(localData);
  for (const key in data) {
    if (!data[key].bookings) {
      data[key].bookings = [];
      if (data[key].detail) {
        data[key].bookings.push(data[key].detail);
        delete data[key].detail;
      }
    }
  }
  return data;
}

// SIMPAN KEMBALI KE LOCALSTORAGE
function saveArmadaData(data) {
  localStorage.setItem("ijt_armada_status", JSON.stringify(data));
  renderStatusArmada();
}

// RENDER DAFTAR UNIT DI HALAMAN UTAMA
function renderStatusArmada() {
  const container = document.getElementById("unit-status-container");
  if (!container) return;

  const armada = getArmadaData();
  container.innerHTML = "";

  for (const [key, value] of Object.entries(armada)) {
    const isMaintenance = value.status === "MAINTENANCE";
    const totalBookings = value.bookings ? value.bookings.length : 0;
    
    let statusText = "TERSEDIA";
    let descText = totalBookings > 0 
      ? `Terjadwal ${totalBookings} pemesanan.` 
      : "Unit siap disewa kapan saja.";

    if (isMaintenance) {
      statusText = "PERBAIKAN / MAINTENANCE";
      descText = "Unit sedang dalam perawatan rutin / perbaikan.";
    }

    const card = document.createElement("div");
    card.style.cssText = "border: 1px solid #cbd5e1; padding: 12px; margin-bottom: 10px; border-radius: 6px; background: #fff;";
    card.innerHTML = `
      <h4 style="margin:0 0 5px; color:#1e3a8a;">${key}</h4>
      <span style="font-size:0.75rem; font-weight:bold; padding:3px 8px; border-radius:4px; color:white; background:${isMaintenance ? '#dc2626' : '#16a34a'};">${statusText}</span>
      <p style="font-size: 0.85rem; color: #64748b; margin: 5px 0 0;">${descText}</p>
    `;
    container.appendChild(card);
  }
}

// FORMAT TANGGAL
function formatTanggalIndo(dateString) {
  if (!dateString) return "-";
  const p = dateString.split('-');
  if (p.length === 3) {
    const bln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${parseInt(p[2])} ${bln[parseInt(p[1]) - 1]} ${p[0]}`;
  }
  return dateString;
}

function dateToDays(dateStr) {
  const p = dateStr.split('-');
  const d = new Date(Date.UTC(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])));
  return Math.floor(d.getTime() / (1000 * 60 * 60 * 24));
}

function daysToDateStr(days) {
  const d = new Date(days * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isTanggalBentrok(start1Str, end1Str, start2Str, end2Str) {
  return (dateToDays(start1Str) <= dateToDays(end2Str) && dateToDays(end1Str) >= dateToDays(start2Str));
}

// PROSES PEMESANAN CUSTOMER (MENYIMPAN KE LOCALSTORAGE & FIREBASE DATABASE)
async function prosesBookingCustomer(event) {
  event.preventDefault();

  const nama = document.getElementById("c_nama").value;
  const alamat = document.getElementById("c_alamat_penyewa").value;
  const unit = document.getElementById("c_unit").value;
  const tujuan = document.getElementById("c_tujuan").value;
  const durasi = parseInt(document.getElementById("c_durasi").value) || 1;
  const tglMulaiStr = document.getElementById("c_tanggal_sewa").value;
  const lokasiJemput = document.getElementById("c_lokasi_penjemputan").value;
  const pembayaran = document.getElementById("c_pembayaran").value;

  if (!unit || !tglMulaiStr) {
    alert("Silakan lengkapi pilihan unit dan tanggal sewa!");
    return;
  }

  const armada = getArmadaData();
  const unitData = armada[unit];

  if (unitData.status === "MAINTENANCE") {
    alert("Maaf, unit " + unit + " sedang dalam perawatan.");
    return;
  }

  const startDay = dateToDays(tglMulaiStr);
  const endDay = startDay + (durasi - 1);
  const tglSelesaiStr = daysToDateStr(endDay);

  let bentrok = false;
  let jadwalBentrokInfo = "";

  if (unitData.bookings && unitData.bookings.length > 0) {
    for (const b of unitData.bookings) {
      if (isTanggalBentrok(tglMulaiStr, tglSelesaiStr, b.tglMulai, b.tglSelesai)) {
        bentrok = true;
        jadwalBentrokInfo = `${formatTanggalIndo(b.tglMulai)} s/d ${formatTanggalIndo(b.tglSelesai)}`;
        break;
      }
    }
  }

  if (bentrok) {
    alert(`MAAF! Unit ${unit} sudah di-booking pada tanggal: ${jadwalBentrokInfo}.`);
    return;
  }

  const hargaText = document.getElementById("display-harga").innerText;
  const bookingId = Date.now();

  const newBooking = {
    id: bookingId,
    unitArmada: unit,
    nama: nama,
    alamat: alamat,
    tujuan: tujuan,
    durasi: durasi,
    tglMulai: tglMulaiStr,
    tglSelesai: tglSelesaiStr,
    lokasiJemput: lokasiJemput,
    pembayaran: pembayaran,
    totalHarga: hargaText,
    waktuPesan: new Date().toLocaleString("id-ID")
  };

  // 1. Simpan ke sistem lokal
  unitData.bookings.push(newBooking);
  saveArmadaData(armada);

  // 2. Simpan ke Firebase Realtime Database
  try {
    await database.ref("reservasi").push(newBooking);
  } catch (err) {
    console.error("Gagal simpan data ke Firebase:", err);
  }

  // 3. Konfirmasi Cetak PDF
  const konfirmasiCetak = confirm(`PEMESANAN BERHASIL!\n\nUnit: ${unit}\nPeriode: ${formatTanggalIndo(tglMulaiStr)} s/d ${formatTanggalIndo(tglSelesaiStr)}\n\nApakah Anda ingin mengunduh/mencetak Bukti Reservasi (PDF) sekarang?`);
  
  if (konfirmasiCetak) {
    cetakPDF(unit, newBooking);
  }

  document.getElementById("customer-form").reset();
  resetHarga();
}

// RESET TAMPILAN HARGA
function resetHarga() {
  document.getElementById("display-rate-info").innerText = "Tarif Per Hari: Rp 0";
  document.getElementById("display-harga").innerText = "Total: Rp 0";
}

// PORTAL ADMIN - RENDER JADWAL & TOMBOL CETAK PDF
function renderAdminUnitList() {
  const container = document.getElementById("admin-unit-list");
  if (!container) return;

  const armada = getArmadaData();
  container.innerHTML = "";

  const divBooked = document.createElement("div");
  divBooked.innerHTML = "<h4 style='color:#1a365d; margin-bottom:10px;'>Daftar Seluruh Jadwal Sewa Terdaftar:</h4>";

  let totalSemuaBooking = 0;

  for (const [key, value] of Object.entries(armada)) {
    if (value.bookings && value.bookings.length > 0) {
      value.bookings.forEach(d => {
        totalSemuaBooking++;
        const item = document.createElement("div");
        item.style.cssText = "background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; margin-bottom: 12px; font-size: 0.88rem; color: #334155;";
        
        const bookingJson = JSON.stringify(d).replace(/'/g, "&apos;").replace(/"/g, "&quot;");

        item.innerHTML = `
          <div style="border-bottom: 2px solid #2b6cb0; padding-bottom: 6px; margin-bottom: 8px; display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size: 1.05rem; color: #1a365d;">${key}</strong>
            <span style="background:#2b6cb0; color:white; padding:2px 8px; border-radius:4px; font-size:0.75rem;">Terjadwal</span>
          </div>
          <p style="margin:2px 0;"><strong>Penyewa:</strong> ${d.nama || '-'}</p>
          <p style="margin:2px 0;"><strong>Alamat:</strong> ${d.alamat || '-'}</p>
          <p style="margin:2px 0;"><strong>Tujuan:</strong> ${d.tujuan || '-'}</p>
          <p style="margin:2px 0;"><strong>Periode:</strong> ${formatTanggalIndo(d.tglMulai)} s/d ${formatTanggalIndo(d.tglSelesai)} (${d.durasi} Hari)</p>
          <p style="margin:2px 0;"><strong>Jemput:</strong> ${d.lokasiJemput || '-'}</p>
          <p style="margin:2px 0;"><strong>Total:</strong> ${d.totalHarga || 'Rp 0'} (${d.pembayaran || '-'})</p>
          
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button style="flex: 1; padding: 8px; background: #0284c7; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;" onclick='cetakPDF("${key}", ${bookingJson})'>
              📄 Cetak PDF
            </button>
            <button style="flex: 1; padding: 8px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;" onclick="hapusBookingAdmin('${key}', ${d.id})">
              🗑️ Hapus
            </button>
          </div>
        `;
        divBooked.appendChild(item);
      });
    }
  }

  if (totalSemuaBooking === 0) {
    divBooked.innerHTML += "<p style='color:#64748b; font-size: 0.85rem;'>Belum ada jadwal pemesanan aktif.</p>";
  }
  container.appendChild(divBooked);

  // KONTROL MAINTENANCE
  const divControl = document.createElement("div");
  divControl.style.cssText = "margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 15px;";
  divControl.innerHTML = "<h4 style='color:#1a365d; margin-bottom:10px;'>Status Maintenance Armada:</h4>";

  for (const [key, value] of Object.entries(armada)) {
    const isMaint = value.status === "MAINTENANCE";
    const controlItem = document.createElement("div");
    controlItem.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; margin-bottom: 6px;";
    
    controlItem.innerHTML = `
      <span style="font-size: 0.85rem; font-weight: 600;">${key}</span>
      <div>
        ${isMaint ? 
          `<button style="background: #16a34a; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" onclick="ubahStatusMaintenance('${key}', 'TERSEDIA')">Set Ready</button>` : 
          `<button style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;" onclick="ubahStatusMaintenance('${key}', 'MAINTENANCE')">Set Maintenance</button>`
        }
      </div>
    `;
    divControl.appendChild(controlItem);
  }
  container.appendChild(divControl);
}

function hapusBookingAdmin(unitName, bookingId) {
  if (confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) {
    const armada = getArmadaData();
    if (armada[unitName] && armada[unitName].bookings) {
      armada[unitName].bookings = armada[unitName].bookings.filter(b => b.id !== bookingId);
      saveArmadaData(armada);
      renderAdminUnitList();
    }
  }
}

function ubahStatusMaintenance(unitName, statusBaru) {
  const armada = getArmadaData();
  if (armada[unitName]) {
    armada[unitName].status = statusBaru;
    saveArmadaData(armada);
    renderAdminUnitList();
  }
}

// DRAFT TARIF KHUSUS SETIAP KOTA
const tarifHargaPerKota = {
  // --- JABODETABEK & JAWA BARAT ---
  "Jakarta":       { "Elf (12-20 Kursi)": 1300000, "Medium Bus (25-39 Kursi)": 2000000, "Big Bus (45-59 Kursi)": 3200000, "Truk Engkel": 900000,  "Truk Fuso": 1800000, "Truk Trailer": 3500000 },
  "Bogor":         { "Elf (12-20 Kursi)": 1400000, "Medium Bus (25-39 Kursi)": 2100000, "Big Bus (45-59 Kursi)": 3300000, "Truk Engkel": 1000000, "Truk Fuso": 2000000, "Truk Trailer": 4000000 },
  "Bandung":       { "Elf (12-20 Kursi)": 1600000, "Medium Bus (25-39 Kursi)": 2500000, "Big Bus (45-59 Kursi)": 3800000, "Truk Engkel": 1800000, "Truk Fuso": 3500000, "Truk Trailer": 6000000 },
  "Sukabumi":      { "Elf (12-20 Kursi)": 1500000, "Medium Bus (25-39 Kursi)": 2300000, "Big Bus (45-59 Kursi)": 3500000, "Truk Engkel": 1500000, "Truk Fuso": 3000000, "Truk Trailer": 5500000 },
  "Cianjur":       { "Elf (12-20 Kursi)": 1550000, "Medium Bus (25-39 Kursi)": 2400000, "Big Bus (45-59 Kursi)": 3600000, "Truk Engkel": 1600000, "Truk Fuso": 3200000, "Truk Trailer": 5700000 },
  "Cirebon":       { "Elf (12-20 Kursi)": 1800000, "Medium Bus (25-39 Kursi)": 2800000, "Big Bus (45-59 Kursi)": 4200000, "Truk Engkel": 2500000, "Truk Fuso": 5000000, "Truk Trailer": 8500000 },

  // --- JAWA TENGAH & DIY ---
  "Tegal":         { "Elf (12-20 Kursi)": 1900000, "Medium Bus (25-39 Kursi)": 3000000, "Big Bus (45-59 Kursi)": 4500000, "Truk Engkel": 3000000, "Truk Fuso": 5500000, "Truk Trailer": 9500000 },
  "Pekalongan":    { "Elf (12-20 Kursi)": 2000000, "Medium Bus (25-39 Kursi)": 3200000, "Big Bus (45-59 Kursi)": 4800000, "Truk Engkel": 3200000, "Truk Fuso": 6000000, "Truk Trailer": 10000000 },
  "Purwokerto":    { "Elf (12-20 Kursi)": 2100000, "Medium Bus (25-39 Kursi)": 3300000, "Big Bus (45-59 Kursi)": 5000000, "Truk Engkel": 3300000, "Truk Fuso": 6200000, "Truk Trailer": 10500000 },
  "Semarang":      { "Elf (12-20 Kursi)": 2200000, "Medium Bus (25-39 Kursi)": 3500000, "Big Bus (45-59 Kursi)": 5200000, "Truk Engkel": 3500000, "Truk Fuso": 6500000, "Truk Trailer": 11000000 },
  "Yogyakarta":    { "Elf (12-20 Kursi)": 2300000, "Medium Bus (25-39 Kursi)": 3700000, "Big Bus (45-59 Kursi)": 5500000, "Truk Engkel": 3500000, "Truk Fuso": 6500000, "Truk Trailer": 11000000 },
  "Solo":          { "Elf (12-20 Kursi)": 2400000, "Medium Bus (25-39 Kursi)": 3800000, "Big Bus (45-59 Kursi)": 5600000, "Truk Engkel": 3600000, "Truk Fuso": 6800000, "Truk Trailer": 11500000 },
  "Wonogiri":      { "Elf (12-20 Kursi)": 2450000, "Medium Bus (25-39 Kursi)": 3900000, "Big Bus (45-59 Kursi)": 5700000, "Truk Engkel": 3700000, "Truk Fuso": 7000000, "Truk Trailer": 11800000 },
  "Temanggung":    { "Elf (12-20 Kursi)": 2250000, "Medium Bus (25-39 Kursi)": 3600000, "Big Bus (45-59 Kursi)": 5300000, "Truk Engkel": 3400000, "Truk Fuso": 6400000, "Truk Trailer": 10800000 },
  "Kudus":         { "Elf (12-20 Kursi)": 2350000, "Medium Bus (25-39 Kursi)": 3750000, "Big Bus (45-59 Kursi)": 5550000, "Truk Engkel": 3550000, "Truk Fuso": 6600000, "Truk Trailer": 11200000 },
  "Rembang":       { "Elf (12-20 Kursi)": 2500000, "Medium Bus (25-39 Kursi)": 4000000, "Big Bus (45-59 Kursi)": 6000000, "Truk Engkel": 3800000, "Truk Fuso": 7200000, "Truk Trailer": 12000000 },

  // --- JAWA TIMUR & BALI ---
  "Tuban":         { "Elf (12-20 Kursi)": 2600000, "Medium Bus (25-39 Kursi)": 4100000, "Big Bus (45-59 Kursi)": 6200000, "Truk Engkel": 4200000, "Truk Fuso": 7800000, "Truk Trailer": 13500000 },
  "Surabaya":      { "Elf (12-20 Kursi)": 2700000, "Medium Bus (25-39 Kursi)": 4300000, "Big Bus (45-59 Kursi)": 6500000, "Truk Engkel": 4800000, "Truk Fuso": 8500000, "Truk Trailer": 15000000 },
  "Malang":        { "Elf (12-20 Kursi)": 2800000, "Medium Bus (25-39 Kursi)": 4400000, "Big Bus (45-59 Kursi)": 6700000, "Truk Engkel": 4900000, "Truk Fuso": 8700000, "Truk Trailer": 15500000 },
  "Batu":          { "Elf (12-20 Kursi)": 2850000, "Medium Bus (25-39 Kursi)": 4450000, "Big Bus (45-59 Kursi)": 6800000, "Truk Engkel": 5000000, "Truk Fuso": 8800000, "Truk Trailer": 15800000 },
  "Kediri":        { "Elf (12-20 Kursi)": 2650000, "Medium Bus (25-39 Kursi)": 4200000, "Big Bus (45-59 Kursi)": 6300000, "Truk Engkel": 4500000, "Truk Fuso": 8200000, "Truk Trailer": 14500000 },
  "Blitar":        { "Elf (12-20 Kursi)": 2750000, "Medium Bus (25-39 Kursi)": 4350000, "Big Bus (45-59 Kursi)": 6600000, "Truk Engkel": 4700000, "Truk Fuso": 8400000, "Truk Trailer": 14800000 },
  "Banyuwangi":    { "Elf (12-20 Kursi)": 3200000, "Medium Bus (25-39 Kursi)": 5000000, "Big Bus (45-59 Kursi)": 7500000, "Truk Engkel": 6500000, "Truk Fuso": 12000000, "Truk Trailer": 20000000 },
  "Gilimanuk":     { "Elf (12-20 Kursi)": 3500000, "Medium Bus (25-39 Kursi)": 5500000, "Big Bus (45-59 Kursi)": 8000000, "Truk Engkel": 7000000, "Truk Fuso": 13000000, "Truk Trailer": 22000000 },
  "Denpasar":      { "Elf (12-20 Kursi)": 3800000, "Medium Bus (25-39 Kursi)": 6000000, "Big Bus (45-59 Kursi)": 8800000, "Truk Engkel": 7800000, "Truk Fuso": 14500000, "Truk Trailer": 24000000 },

  // --- SUMATRA ---
  "Lampung":       { "Elf (12-20 Kursi)": 2500000, "Medium Bus (25-39 Kursi)": 4000000, "Big Bus (45-59 Kursi)": 6000000, "Truk Engkel": 5000000, "Truk Fuso": 9000000,  "Truk Trailer": 16000000 },
  "Palembang":     { "Elf (12-20 Kursi)": 3200000, "Medium Bus (25-39 Kursi)": 5000000, "Big Bus (45-59 Kursi)": 7500000, "Truk Engkel": 6500000, "Truk Fuso": 12000000, "Truk Trailer": 21000000 },
  "Prabumulih":    { "Elf (12-20 Kursi)": 3300000, "Medium Bus (25-39 Kursi)": 5200000, "Big Bus (45-59 Kursi)": 7800000, "Truk Engkel": 6700000, "Truk Fuso": 12500000, "Truk Trailer": 22000000 },
  "Jambi":         { "Elf (12-20 Kursi)": 3800000, "Medium Bus (25-39 Kursi)": 6000000, "Big Bus (45-59 Kursi)": 9000000, "Truk Engkel": 7500000, "Truk Fuso": 14000000, "Truk Trailer": 24000000 },
  "Rengat":        { "Elf (12-20 Kursi)": 4200000, "Medium Bus (25-39 Kursi)": 6600000, "Big Bus (45-59 Kursi)": 9800000, "Truk Engkel": 8200000, "Truk Fuso": 15500000, "Truk Trailer": 26500000 },
  "Pekanbaru":     { "Elf (12-20 Kursi)": 4500000, "Medium Bus (25-39 Kursi)": 7000000, "Big Bus (45-59 Kursi)": 10500000,"Truk Engkel": 8800000, "Truk Fuso": 16500000, "Truk Trailer": 28000000 },
  "Padang":        { "Elf (12-20 Kursi)": 4600000, "Medium Bus (25-39 Kursi)": 7200000, "Big Bus (45-59 Kursi)": 10800000,"Truk Engkel": 9000000, "Truk Fuso": 17000000, "Truk Trailer": 29000000 },
  "Bukittinggi":   { "Elf (12-20 Kursi)": 4700000, "Medium Bus (25-39 Kursi)": 7350000, "Big Bus (45-59 Kursi)": 11000000,"Truk Engkel": 9200000, "Truk Fuso": 17300000, "Truk Trailer": 29500000 },
  "Sibolga":       { "Elf (12-20 Kursi)": 5000000, "Medium Bus (25-39 Kursi)": 7800000, "Big Bus (45-59 Kursi)": 11800000,"Truk Engkel": 9800000, "Truk Fuso": 18500000, "Truk Trailer": 31500000 },
  "Pematang Siantar": { "Elf (12-20 Kursi)": 5300000, "Medium Bus (25-39 Kursi)": 8200000, "Big Bus (45-59 Kursi)": 12300000,"Truk Engkel": 10300000, "Truk Fuso": 19300000, "Truk Trailer": 33000000 },
  "Medan":         { "Elf (12-20 Kursi)": 5500000, "Medium Bus (25-39 Kursi)": 8500000, "Big Bus (45-59 Kursi)": 12800000,"Truk Engkel": 10800000, "Truk Fuso": 20000000, "Truk Trailer": 34000000 },
  "Banda Aceh":    { "Elf (12-20 Kursi)": 6200000, "Medium Bus (25-39 Kursi)": 9800000, "Big Bus (45-59 Kursi)": 14500000,"Truk Engkel": 12500000, "Truk Fuso": 23000000, "Truk Trailer": 38000000 },
  "Sabang":        { "Elf (12-20 Kursi)": 6800000, "Medium Bus (25-39 Kursi)": 10500000,"Big Bus (45-59 Kursi)": 15800000,"Truk Engkel": 13800000, "Truk Fuso": 25000000, "Truk Trailer": 41000000 },

 // --- KALIMANTAN & SULAWESI ---
  "Palangkaraya":  { "Elf (12-20 Kursi)": 5800000, "Medium Bus (25-39 Kursi)": 9000000, "Big Bus (45-59 Kursi)": 13500000,"Truk Engkel": 11500000, "Truk Fuso": 21000000, "Truk Trailer": 36000000 },
  "Banjarmasin":   { "Elf (12-20 Kursi)": 6000000, "Medium Bus (25-39 Kursi)": 9300000, "Big Bus (45-59 Kursi)": 14000000,"Truk Engkel": 11800000, "Truk Fuso": 22000000, "Truk Trailer": 37000000 },
  "Makassar":      { "Elf (12-20 Kursi)": 6500000, "Medium Bus (25-39 Kursi)": 10000000,"Big Bus (45-59 Kursi)": 15000000,"Truk Engkel": 12800000, "Truk Fuso": 23500000, "Truk Trailer": 39000000 },
  "Parepare":      { "Elf (12-20 Kursi)": 6700000, "Medium Bus (25-39 Kursi)": 10300000,"Big Bus (45-59 Kursi)": 15500000,"Truk Engkel": 13200000, "Truk Fuso": 24200000, "Truk Trailer": 40000000 }
};

// HITUNG HARGA SEWA
function hitungHarga() {
  const selectedUnit = document.getElementById("c_unit").value;
  const selectedTujuan = document.getElementById("c_tujuan").value;
  const durasiHari = parseInt(document.getElementById("c_durasi").value) || 1;
  
  const displayRateInfo = document.getElementById("display-rate-info");
  const displayHarga = document.getElementById("display-harga");

  if (selectedUnit && selectedTujuan) {
    const tarifKota = tarifHargaPerKota[selectedTujuan];
    
    if (tarifKota && tarifKota[selectedUnit]) {
      const hargaPerHari = tarifKota[selectedUnit];
      const totalHarga = hargaPerHari * durasiHari;

      displayRateInfo.innerText = "Tarif Per Hari (" + selectedTujuan + "): Rp " + hargaPerHari.toLocaleString("id-ID") + " (" + durasiHari + " Hari)";
      displayHarga.innerText = "Total: Rp " + totalHarga.toLocaleString("id-ID");
    } else {
      resetHarga();
    }
  } else {
    resetHarga();
  }
}

// DRAWER MENU & MODAL ADMIN
function toggleMenu() {
  const navMenu = document.getElementById('nav-menu');
  const overlay = document.getElementById('overlay');
  
  if (navMenu && overlay) {
    navMenu.classList.toggle('active');
    overlay.classList.toggle('active');
  }
}

function openModalAdmin() {
  toggleMenu();
  document.getElementById('modalAdmin').style.display = 'flex';
}

function closeModalAdmin() {
  document.getElementById('modalAdmin').style.display = 'none';
}
// LOGIN ADMIN
const dataAdmin = {
  "admin123": { password: "admin123", namaLengkap: "Admin" }
};

function loginAdmin() {
  const user = document.getElementById("username_input").value;
  const pass = document.getElementById("password_input").value;
  const errorMsg = document.getElementById("error-message");

  if (dataAdmin[user] && dataAdmin[user].password === pass) {
    errorMsg.style.display = "none";
    document.getElementById("login-section").style.display = "none";
    document.getElementById("driver-form-section").style.display = "block";
    
    document.getElementById("admin-name-display").innerText = dataAdmin[user].namaLengkap;
    renderAdminUnitList();
  } else {
    errorMsg.style.display = "block";
  }
}

function logoutAdmin() {
  document.getElementById("login-section").style.display = "block";
  document.getElementById("driver-form-section").style.display = "none";
  document.getElementById("username_input").value = "";
  document.getElementById("password_input").value = "";
}

// FUNGSI CETAK PDF
function cetakPDF(namaUnit, dataBooking) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. HEADER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text("ILHAM JAYA TRANSPORT", 105, 18, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Layanan Sewa Armada Bus & Truk Terpercaya", 105, 24, { align: "center" });
    doc.text("Pulogebang, Jakarta - Indonesia | Telp/WA: 0857-7578-9017", 105, 29, { align: "center" });

    // Garis Pemisah
    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(15, 33, 195, 33);
    doc.setLineDashPattern([], 0);

    // 2. META TRANSAKSI
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(`No. Transaksi: #INV-${dataBooking.id}`, 15, 39);
    const tglCetak = new Date().toLocaleDateString('id-ID');
    doc.text(`Tanggal Cetak: ${tglCetak}`, 195, 39, { align: "right" });

    // 3. TITLE BADGE
    doc.setFillColor(30, 58, 138);
    doc.rect(15, 43, 180, 8, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("BUKTI RESERVASI SEWA ARMADA", 105, 48.5, { align: "center" });

    // 4. TABEL DETAIL
    const detailTable = [
      ["Nama Pemesan", `: ${dataBooking.nama || '-'}`],
      ["Alamat Pemesan", `: ${dataBooking.alamat || '-'}`],
      ["Unit Armada", `: ${namaUnit}`],
      ["Rute / Tujuan", `: ${dataBooking.tujuan || '-'}`],
      ["Lokasi Penjemputan", `: ${dataBooking.lokasiJemput || '-'}`],
      ["Periode Sewa", `: ${formatTanggalIndo(dataBooking.tglMulai)} s/d ${formatTanggalIndo(dataBooking.tglSelesai)} (${dataBooking.durasi} Hari)`],
      ["Metode Pembayaran", `: ${dataBooking.pembayaran || '-'}`]
    ];

    doc.autoTable({
      startY: 55,
      body: detailTable,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45, textColor: [71, 85, 105] },
        1: { cellWidth: 135 }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 6;
// 5. TOTAL PEMBAYARAN
    doc.setFillColor(241, 245, 249);
    doc.rect(15, finalY, 180, 16, 'F');
    doc.setFillColor(30, 58, 138);
    doc.rect(15, finalY, 2, 16, 'F');

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Total Pembayaran:", 185, finalY + 5.5, { align: "right" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text(`${dataBooking.totalHarga || 'Rp 0'}`, 185, finalY + 12, { align: "right" });

    // 6. TANDA TANGAN
    const sigY = finalY + 26;
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    doc.text("Penyewa,", 45, sigY, { align: "center" });
    doc.text(`( ${dataBooking.nama || 'Customer'} )`, 45, sigY + 20, { align: "center" });

    doc.text("Admin Transport,", 165, sigY, { align: "center" });
    doc.text("( Ilham Jaya Transport )", 165, sigY + 20, { align: "center" });

    // 7. FOOTER NOTE
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("* Harap tunjukkan bukti pembayaran/reservasi ini saat serah terima unit di lokasi.", 105, sigY + 28, { align: "center" });

    // 8. UNDUH PDF
    const fileName = `Bukti_Sewa_${(dataBooking.nama || 'Customer').replace(/\s+/g, '_')}_#${dataBooking.id}.pdf`;
    doc.save(fileName);

  } catch (err) {
    console.error("Gagal buat PDF:", err);
    alert("Gagal mengunduh PDF. Pastikan jaringan internet stabil untuk memuat pustaka jsPDF.");
  }
}

// JALANKAN SAAT HALAMAN DIBUKA
document.addEventListener("DOMContentLoaded", function() {
  renderStatusArmada();
});