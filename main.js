import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import './style.css';

// ===== STATE =====
let currentUser = null;
let currentPhoto = null;
let currentLocation = null;
let todayAttendance = null;
let historyData = [];
let currentPage = 'home';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await SplashScreen.hide();
  } catch (e) {}
  await initApp();
});

async function initApp() {
  const { value: saved } = await Preferences.get({ key: 'currentUser' });
  if (saved) {
    currentUser = JSON.parse(saved);
    await loadTodayAttendance();
    await loadHistory();
    showHome();
  } else {
    showLogin();
  }
}

// ===== AUTH =====
function showLogin() {
  currentUser = null;
  currentPhoto = null;
  currentLocation = null;
  todayAttendance = null;
  document.getElementById('app').innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="logo-wrap">
          <svg viewBox="0 0 72 72" fill="none"><path d="M36 8C22.7 8 12 18.7 12 32c0 11.5 7.8 21.2 18.4 24.1 1.3.3 1.8-.6 1.8-1.3 0-.6 0-2.6-.1-4.7-7.6 1.7-9.2-3.2-9.2-3.2-1.2-3.2-3-4-3-4-2.5-1.7.2-1.7.2-1.7 2.7.2 4.2 2.8 4.2 2.8 2.4 4.2 6.4 3 8 2.3.2-1.8 1-3 1.7-3.7-6.1-.7-12.4-3-12.4-13.5 0-3 1.1-5.4 2.8-7.3-.3-.7-1.2-3.4.3-7.1 0 0 2.3-.7 7.5 2.8 2.2-.6 4.5-.9 6.8-.9 2.3 0 4.6.3 6.8.9 5.2-3.5 7.5-2.8 7.5-2.8 1.5 3.7.6 6.4.3 7.1 1.8 1.9 2.8 4.3 2.8 7.3 0 10.5-6.4 12.8-12.5 13.5 1 1 1.8 2.8 1.8 5.6 0 4-.1 7.3-.1 8.3 0 .8.5 1.7 1.8 1.3C52.2 53.2 60 43.5 60 32c0-13.3-10.7-24-24-24z" fill="#667eea"/></svg>
        </div>
        <h1>Absensi Digital</h1>
        <p class="subtitle">Sistem Absensi Kerja Berbasis GPS</p>
        <div class="input-group">
          <label><span class="icon">&#9993;</span> Email</label>
          <input type="email" id="loginEmail" placeholder="budi@company.com" value="budi@company.com">
        </div>
        <div class="input-group">
          <label><span class="icon">&#128274;</span> Password</label>
          <input type="password" id="loginPass" placeholder="Password" value="password123">
        </div>
        <button class="btn-primary" onclick="handleLogin()">
          <span>&#10142;</span> Masuk
        </button>
        <p class="error-msg" id="loginError"></p>
      </div>
    </div>
  `;
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');

  if (!email || !pass) { errorEl.textContent = 'Email dan password wajib diisi'; return; }

  // Simulasi login (ganti dengan API call ke server kamu)
  if (pass === 'password123') {
    currentUser = {
      id: '1',
      name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      email: email,
      avatar: email.charAt(0).toUpperCase()
    };
    await Preferences.set({ key: 'currentUser', value: JSON.stringify(currentUser) });
    await loadTodayAttendance();
    await loadHistory();
    showHome();
  } else {
    errorEl.textContent = 'Email atau password salah';
  }
}

async function handleLogout() {
  await Preferences.remove({ key: 'currentUser' });
  await Preferences.remove({ key: 'todayAttendance' });
  await Preferences.remove({ key: 'historyData' });
  showLogin();
}

// ===== DATA =====
async function loadTodayAttendance() {
  const { value } = await Preferences.get({ key: 'todayAttendance' });
  todayAttendance = value ? JSON.parse(value) : null;
}

async function saveTodayAttendance(data) {
  todayAttendance = data;
  await Preferences.set({ key: 'todayAttendance', value: JSON.stringify(data) });
}

async function loadHistory() {
  const { value } = await Preferences.get({ key: 'historyData' });
  historyData = value ? JSON.parse(value) : [];
}

async function addToHistory(record) {
  historyData.unshift(record);
  await Preferences.set({ key: 'historyData', value: JSON.stringify(historyData) });
}

// ===== GPS =====
async function getLocation() {
  try {
    const permission = await Geolocation.requestPermissions();
    if (permission.location !== 'granted') {
      return { error: 'Izin lokasi ditolak. Aktifkan GPS di pengaturan HP.' };
    }
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy
    };
  } catch (e) {
    return { error: 'Gagal mendapatkan lokasi: ' + e.message };
  }
}

// ===== CAMERA =====
async function takePhoto() {
  try {
    const permission = await Camera.requestPermissions();
    if (permission.camera !== 'granted') {
      return { error: 'Izin kamera ditolak. Berikan izin kamera di pengaturan HP.' };
    }
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: 'base64',
      source: 'CAMERA',
      direction: 'FRONT'
    });
    return { base64: image.base64String };
  } catch (e) {
    return { error: 'Gagal mengambil foto: ' + e.message };
  }
}

function base64ToDataUrl(base64) {
  return 'data:image/jpeg;base64,' + base64;
}

// ===== FORMAT =====
function formatDateTime() {
  const now = new Date();
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return {
    date: `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
    time: now.toTimeString().slice(0,5),
    full: now.toISOString()
  };
}

function formatTime(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toTimeString().slice(0,5);
}

// ===== STATUS =====
function showStatus(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `status-msg show ${type}`;
}

function hideStatus(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'status-msg';
}

// ===== HOME =====
function showHome() {
  currentPage = 'home';
  const dt = formatDateTime();
  const isCheckedIn = todayAttendance && todayAttendance.checkIn;
  const isCheckedOut = todayAttendance && todayAttendance.checkOut;

  document.getElementById('app').innerHTML = `
    <div class="home-container">
      <div class="header">
        <div class="header-left">
          <button class="icon-btn" onclick="toggleSidebar()">&#9776;</button>
          <h2>Absensi</h2>
        </div>
        <div class="date-text">${dt.date}<br>pukul ${dt.time}</div>
      </div>

      <div class="attendance-card">
        <div class="card-title">
          <span>&#128247;</span> Absensi dengan Foto & GPS
        </div>

        <div class="camera-preview" id="cameraPreview">
          <div class="camera-placeholder" id="cameraPlaceholder">
            <div class="camera-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p>Tap tombol di bawah untuk<br>mengambil foto selfie</p>
          </div>
          <img class="photo-result" id="photoResult" alt="Selfie">
        </div>

        <div class="info-row">
          <span class="icon">&#128337;</span>
          <span class="label">Jam:</span>
          <span id="clockTime">${dt.time}</span>
        </div>
        <div class="info-row">
          <span class="icon">&#128205;</span>
          <span class="label">Lokasi:</span>
          <span id="locationText">Mendapatkan lokasi...</span>
        </div>

        <div class="status-msg" id="statusMsg"></div>

        ${!isCheckedIn ? `
          <button class="btn-action btn-checkin" id="btnAction" onclick="processCheckIn()">
            <span>&#128247;</span> Ambil Foto & Absen Masuk
          </button>
        ` : !isCheckedOut ? `
          <button class="btn-action btn-checkout" id="btnAction" onclick="processCheckOut()">
            <span>&#128247;</span> Ambil Foto & Absen Pulang
          </button>
        ` : `
          <div class="info-row" style="background:#d1fae5;color:#065f46;">
            <span class="icon">&#9989;</span>
            <span>Absensi hari ini sudah selesai!</span>
          </div>
        `}

        ${isCheckedIn ? `
          <div style="margin-top:12px;padding:12px;background:#f0fdf4;border-radius:10px;">
            <p style="font-size:13px;color:#065f46;font-weight:600;">
              &#10003; Masuk: ${formatTime(todayAttendance.checkIn.time)}
              ${todayAttendance.checkOut ? ' | Pulang: ' + formatTime(todayAttendance.checkOut.time) : ''}
            </p>
          </div>
        ` : ''}
      </div>

      <div class="bottom-nav">
        <button class="nav-item active" onclick="showHome()">
          &#127968;<span>Beranda</span>
        </button>
        <button class="nav-item" onclick="showHistory()">
          &#128220;<span>Riwayat</span>
        </button>
        <button class="nav-item" onclick="showProfile()">
          &#128100;<span>Profil</span>
        </button>
      </div>
    </div>
  `;

  getLocation().then(loc => {
    const el = document.getElementById('locationText');
    if (el) {
      if (loc.error) el.textContent = loc.error;
      else {
        el.textContent = `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
        currentLocation = loc;
      }
    }
  });

  // Update clock
  setInterval(() => {
    const t = formatDateTime();
    const c = document.getElementById('clockTime');
    if (c) c.textContent = t.time;
  }, 30000);
}

// ===== CHECK IN =====
async function processCheckIn() {
  const btn = document.getElementById('btnAction');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> Memproses...';

  showStatus('statusMsg', 'Mengambil lokasi GPS...', 'info');
  const loc = await getLocation();
  if (loc.error) { showStatus('statusMsg', loc.error, 'error'); btn.disabled = false; btn.innerHTML = '<span>&#128247;</span> Ambil Foto & Absen Masuk'; return; }
  currentLocation = loc;

  showStatus('statusMsg', 'Mengambil foto selfie...', 'info');
  const photo = await takePhoto();
  if (photo.error) { showStatus('statusMsg', photo.error, 'error'); btn.disabled = false; btn.innerHTML = '<span>&#128247;</span> Ambil Foto & Absen Masuk'; return; }
  currentPhoto = photo.base64;

  // Show photo
  const resultImg = document.getElementById('photoResult');
  const placeholder = document.getElementById('cameraPlaceholder');
  if (resultImg) { resultImg.src = base64ToDataUrl(photo.base64); resultImg.style.display = 'block'; }
  if (placeholder) placeholder.style.display = 'none';

  const dt = formatDateTime();
  todayAttendance = {
    date: dt.date,
    checkIn: {
      time: dt.full,
      photo: photo.base64,
      lat: loc.lat,
      lng: loc.lng,
      accuracy: loc.accuracy
    }
  };
  await saveTodayAttendance(todayAttendance);
  await addToHistory({ ...todayAttendance, type: 'in', id: Date.now() });

  showStatus('statusMsg', `Absen masuk berhasil! ${dt.time}`, 'success');
  setTimeout(() => showHome(), 1500);
}

// ===== CHECK OUT =====
async function processCheckOut() {
  const btn = document.getElementById('btnAction');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> Memproses...';

  showStatus('statusMsg', 'Mengambil lokasi GPS...', 'info');
  const loc = await getLocation();
  if (loc.error) { showStatus('statusMsg', loc.error, 'error'); btn.disabled = false; btn.innerHTML = '<span>&#128247;</span> Ambil Foto & Absen Pulang'; return; }

  showStatus('statusMsg', 'Mengambil foto selfie...', 'info');
  const photo = await takePhoto();
  if (photo.error) { showStatus('statusMsg', photo.error, 'error'); btn.disabled = false; btn.innerHTML = '<span>&#128247;</span> Ambil Foto & Absen Pulang'; return; }

  const resultImg = document.getElementById('photoResult');
  const placeholder = document.getElementById('cameraPlaceholder');
  if (resultImg) { resultImg.src = base64ToDataUrl(photo.base64); resultImg.style.display = 'block'; }
  if (placeholder) placeholder.style.display = 'none';

  const dt = formatDateTime();
  todayAttendance.checkOut = {
    time: dt.full,
    photo: photo.base64,
    lat: loc.lat,
    lng: loc.lng,
    accuracy: loc.accuracy
  };
  await saveTodayAttendance(todayAttendance);
  await addToHistory({ ...todayAttendance, type: 'out', id: Date.now() });

  showStatus('statusMsg', `Absen pulang berhasil! ${dt.time}`, 'success');
  setTimeout(() => showHome(), 1500);
}

// ===== HISTORY =====
function showHistory() {
  currentPage = 'history';
  const dt = formatDateTime();

  document.getElementById('app').innerHTML = `
    <div class="history-container">
      <div class="header">
        <div class="header-left">
          <button class="icon-btn" onclick="showHome()">&#8592;</button>
          <h2>Riwayat Absensi</h2>
        </div>
        <div class="date-text">${dt.date}</div>
      </div>
      <div class="history-list" id="historyList"></div>
      <div class="bottom-nav">
        <button class="nav-item" onclick="showHome()">&#127968;<span>Beranda</span></button>
        <button class="nav-item active" onclick="showHistory()">&#128220;<span>Riwayat</span></button>
        <button class="nav-item" onclick="showProfile()">&#128100;<span>Profil</span></button>
      </div>
    </div>
  `;

  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;

  if (historyData.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128220;</div>
        <p>Belum ada riwayat absensi</p>
      </div>
    `;
    return;
  }

  list.innerHTML = historyData.map(item => {
    const time = item.checkIn ? formatTime(item.checkIn.time) : '--:--';
    const photo = item.checkIn ? base64ToDataUrl(item.checkIn.photo) : '';
    const badgeClass = item.type === 'out' ? 'badge-out' : 'badge-in';
    const badgeText = item.type === 'out' ? 'Pulang' : 'Masuk';
    return `
      <div class="history-item">
        <img class="history-thumb" src="${photo}" alt="">
        <div class="history-info">
          <h4>${item.date}</h4>
          <p>&#128337; Jam: ${time}</p>
          <p>&#128205; ${item.checkIn ? item.checkIn.lat.toFixed(4) + ', ' + item.checkIn.lng.toFixed(4) : '-'}</p>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ===== PROFILE =====
function showProfile() {
  currentPage = 'profile';
  document.getElementById('app').innerHTML = `
    <div class="profile-container">
      <div class="profile-header">
        <div class="profile-avatar">${currentUser.avatar}</div>
        <h3>${currentUser.name}</h3>
        <p>${currentUser.email}</p>
      </div>
      <div class="profile-menu">
        <div class="menu-item">
          <div class="left"><span class="icon">&#128100;</span> Nama Lengkap</div>
          <span>${currentUser.name}</span>
        </div>
        <div class="menu-item">
          <div class="left"><span class="icon">&#9993;</span> Email</div>
          <span>${currentUser.email}</span>
        </div>
        <div class="menu-item">
          <div class="left"><span class="icon">&#128205;</span> Izin Lokasi</div>
          <span class="arrow">&#10095;</span>
        </div>
        <div class="menu-item">
          <div class="left"><span class="icon">&#128247;</span> Izin Kamera</div>
          <span class="arrow">&#10095;</span>
        </div>
      </div>
      <button class="btn-logout" onclick="handleLogout()">Keluar</button>
      <div class="bottom-nav">
        <button class="nav-item" onclick="showHome()">&#127968;<span>Beranda</span></button>
        <button class="nav-item" onclick="showHistory()">&#128220;<span>Riwayat</span></button>
        <button class="nav-item active" onclick="showProfile()">&#128100;<span>Profil</span></button>
      </div>
    </div>
  `;
}

function toggleSidebar() {
  // Placeholder untuk sidebar menu
  alert('Menu: Beranda, Riwayat, Profil, Keluar');
}

// ===== EXPOSE FUNCTIONS =====
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.showHome = showHome;
window.showHistory = showHistory;
window.showProfile = showProfile;
window.processCheckIn = processCheckIn;
window.processCheckOut = processCheckOut;
window.toggleSidebar = toggleSidebar;
