// ==========================================
// 1. EVENT LISTENER SAAT HALAMAN DI-LOAD
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Inisialisasi Tampilan
  if (typeof renderStatusArmada === "function") renderStatusArmada();
  if (typeof renderAdminUnitList === "function") renderAdminUnitList();

  // Mencegah Form Reload Saat Submit
  const formReservasi = document.getElementById("formReservasi");
  if (formReservasi) {
    formReservasi.addEventListener("submit", (e) => {
      e.preventDefault();
      prosesReservasi();
    });
  }
});

// ==========================================
// 2. NAVIGASI HAMBURGER MENU (GARIS 3)
// ==========================================
function toggleMenu() {
  const navLinks = document.querySelector(".nav-links");
  if (navLinks) {
    navLinks.classList.toggle("active");
  }
}

// ==========================================
// 3. MANAGEMENT DATA ARMADA (LOCALSTORAGE)
// ==========================================
const defaultArmadaData = {
  "Unit 1": { nama: "Unit 1", status: "Tersedia", bookings: [] },
  "Unit 2": { nama: "Unit 2", status: "Tersedia", bookings: [] },
  "Unit 3": { nama: "Unit 3", status: "Tersedia", bookings: [] }
};

function getArmadaData() {
  const data = localStorage.getItem("ijt_armada_status");
  return data ? JSON.parse(data) : defaultArmadaData;
}

function saveArmadaData(armada) {
  localStorage.setItem("ijt_armada_status", JSON.stringify(armada));
}

// ==========================================
// 4. RENDER TAMPILAN ARMADA & ADMIN
// ==========================================
function renderStatusArmada() {
  const container = document.getElementById("unitStatusContainer");
  if (!container) return;

  const armada = getArmadaData();
  container.innerHTML = "";

  Object.keys(armada).forEach((key) => {
    const unit = armada[key];
    const card = document.createElement("div");
    card.className = "unit-card";
    card.innerHTML = `
      <h3>${unit.nama}</h3>
      <p>Status: <strong>${unit.status}</strong></p>
    `;
    container.appendChild(card);
  });
}

function renderAdminUnitList() {
  const container = document.getElementById("adminUnitList");
  if (!container) return;

  const armada = getArmadaData();
  container.innerHTML = "";

  Object.keys(armada).forEach((key) => {
    const unit = armada[key];
    const item = document.createElement("div");
    item.className = "admin-unit-item";
    
    let htmlBookings = "";
    if (unit.bookings && unit.bookings.length > 0) {
      unit.bookings.forEach((b) => {
        htmlBookings += `
          <div style="margin-top:5px; padding:5px; background:#f0f0f0; border-radius:4px;">
            <p><strong>${b.nama || 'Customer'}</strong> (${b.tglMulai || ''} - ${b.tglSelesai || ''})</p>
            <button onclick="hapusBookingAdmin('${key}', '${b.id}')">🗑️ Hapus</button>
          </div>
        `;
      });
    } else {
      htmlBookings = "<p><em>Belum ada jadwal.</em></p>";
    }

    item.innerHTML = `
      <h4>${unit.nama} - Status: ${unit.status}</h4>
      <button onclick="ubahStatusMaintenance('${key}', 'Tersedia')">Set Tersedia</button>
      <button onclick="ubahStatusMaintenance('${key}', 'Maintenance')">Set Maintenance</button>
      <div class="booking-list">${htmlBookings}</div>
      <hr>
    `;
    container.appendChild(item);
  });
}

// ==========================================
// 5. FUNGSI UBAM MAINTENANCE & HAPUS
// ==========================================
function ubahStatusMaintenance(unitName, statusBaru) {
  database.ref("statusArmada/" + unitName).set({
    status: statusBaru
  }).then(() => {
    console.log("Status " + unitName + " diubah ke " + statusBaru);
  }).catch((err) => {
    alert("Gagal mengupdate status: " + err.message);
  });
}

function hapusBookingAdmin(unitName, bookingId) {
  if (confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) {
    database.ref("reservasi").once("value", (snapshot) => {
      const data = snapshot.val();
      for (const firebaseKey in data) {
        if (data[firebaseKey].id === bookingId || firebaseKey === bookingId) {
          database.ref("reservasi/" + firebaseKey).remove();
          break;
        }
      }
    });
  }
}

// ==========================================
// 6. LISTENERS FIREBASE REALTIME (AKHIR FILE)
// ==========================================

// Listener 1: Data Reservasi
database.ref("reservasi").on("value", (snapshot) => {
  const firebaseData = snapshot.val();
  const armada = getArmadaData();

  for (const key in armada) {
    armada[key].bookings = [];
  }

  if (firebaseData) {
    Object.keys(firebaseData).forEach((key) => {
      const b = firebaseData[key];
      const namaUnit = b.unitArmada || b.unit || b.mobil;

      if (namaUnit && armada[namaUnit]) {
        b.id = b.id || key;
        armada[namaUnit].bookings.push(b);
      }
    });
  }

  saveArmadaData(armada);
  renderStatusArmada();
  renderAdminUnitList();
});

// Listener 2: Status Maintenance
database.ref("statusArmada").on("value", (snapshot) => {
  const dataStatus = snapshot.val();
  const armada = getArmadaData();

  if (dataStatus) {
    Object.keys(dataStatus).forEach((unit) => {
      if (armada[unit]) {
        armada[unit].status = dataStatus[unit].status;
      }
    });

    saveArmadaData(armada);
    renderStatusArmada();
    renderAdminUnitList();
  }
});
  
