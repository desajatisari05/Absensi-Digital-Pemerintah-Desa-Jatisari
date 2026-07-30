import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import './style.css';

// ===== KONFIGURASI BACKEND =====
const API_BASE_URL = 'http://192.168.1.106:3000';

// ===== STATE =====
let currentUser = null;
let currentPhoto = null;
let currentLocation = null;
let todayAttendance = null;
let historyData = [];
let syncQueue = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  try { await SplashScreen.hide(); } catch (e) {}
  await initApp();
});

async function initApp() {
  await loadSyncQueue();
  await loadHistory();
  await loadTodayAttendance();

  const { value: saved } = await Preferences.get({ key: 'currentUser' });
  if (saved) {
    currentUser = JSON.parse(saved);
    showHome();
  } else {
    showLogin();
  }
}

// ===== SYNC QUEUE =====
async function loadSyncQueue() {
  const { value } = await Preferences.get({ key: 'syncQueue' });
  syncQueue = value ? JSON.parse(value) : [];
}

async function saveSyncQueue() {
  await Preferences.set({ key: 'syncQueue', value: JSON.stringify(syncQueue) });
}

async function addToSyncQueue(record) {
  syncQueue.push(record);
  await saveSyncQueue();
}

// ===== AUTH =====
async function loginToServer(email, password) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Login gagal');
    }

    return await res.json();
  } catch (e) {
    // Server tidak bisa diakses → mode offline
    console.log('Server offline, using local mode:', e.message);
    return { 
      offline: true, 
      token: 'offline-token',
      user: { 
        id: '1',
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1), 
        email 
      } 
    };
  }
}

function showLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="logo-wrap">
          <svg viewBox="0 0 72 72" fill="none"><circle cx="36" cy="36" r="28" fill="none" stroke="#667eea" stroke-width="3"/><path d="M36 20c-4 0-7 3-7 7s3 7 7 7 7-3 7-7-3-7-7-7z" fill="none" stroke="#667eea" stroke-width="2"/><path d="M36 34v8M30 42h12" stroke="#667eea" stroke-width="2" stroke-linecap="round"/></svg>
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
        <p id="offlineNotice" style="text-align:center;font-size:12px;color:#f59e0b;margin-top:10px;display:none;">
          &#9888; Server offline. Mode lokal aktif.
        </p>
      </div>
    </div>
  `;
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');
  const offlineEl = document.getElementById('offlineNotice');

  if (!email || !pass) { errorEl.textContent = 'Email dan password wajib diisi'; return; }

  errorEl.textContent = 'Memproses login...';

  const data = await loginToServer(email, pass);

  if (data.offline) {
    offlineEl.style.display = 'block';
    errorEl.textContent = '';
  }

  currentUser = {
    id: data.user.id || '1',
    name: data.user.name,
    email: data.user.email,
    avatar: data.user.name.charAt(0).toUpperCase()
  };

  await Preferences.set({ key: 'currentUser', value: JSON.stringify(currentUser) });
  await Preferences.set({ key: 'token', value: data.token || 'offline-token' });

  showHome();

  if (data.offline) {
    showToast('Login mode offline. Data tersimpan di HP.', 'warning');
  } else {
    showToast('Login berhasil!', 'success');
  }
}

async function handleLogout() {
  await Preferences.remove({ key: 'currentUser' });
  await Preferences.remove({ key: 'token' });
  await Preferences.remove({ key: 'todayAttendance' });
  currentUser = null;
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
    full: now.toISOString(),
    yearMonth: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  };
}

function formatTime(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toTimeString().slice(0,5);
}

// ===== UI HELPERS =====
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

function showToast(msg, type) {
  const existing = document.querySelector('.toast-msg');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast-msg toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== HOME =====
function showHome() {
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
}

// ===== CHECK IN =====
async function processCheckIn() {
  const btn = document.getElementById('btnAction');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;"></span> Memproses...';

  showStatus('statusMsg', 'Mengambil lokasi GPS...', 'info');
  const loc = await getLocation();
  if (loc.error) { showStatus('statusMsg', loc.error, 'error'); resetBtn(btn, 'in'); return; }
  currentLocation = loc;

  showStatus('statusMsg', 'Mengambil foto selfie...', 'info');
  const photo = await takePhoto();
  if (photo.error) { showStatus('statusMsg', photo.error, 'error'); resetBtn(btn, 'in'); return; }
  currentPhoto = photo.base64;

  const resultImg = document.getElementById('photoResult');
  const placeholder = document.getElementById('cameraPlaceholder');
  if (resultImg) { resultImg.src = base64ToDataUrl(photo.base64); resultImg.style.display = 'block'; }
  if (placeholder) placeholder.style.display = 'none';

  const dt = formatDateTime();
  const record = {
    id: Date.now().toString(),
    type: 'checkin',
    date: dt.date,
    yearMonth: dt.yearMonth,
    time: dt.full,
    photo: photo.base64,
    lat: loc.lat,
    lng: loc.lng,
    accuracy: loc.accuracy,
    userEmail: currentUser.email,
    userName: currentUser.name,
    synced: false
  };

  todayAttendance = { date: dt.date, checkIn: record };
  await saveTodayAttendance(todayAttendance);
  await addToHistory(record);
  await addToSyncQueue(record);

  showStatus('statusMsg', `Absen masuk berhasil! ${dt.time}`, 'success');
  showToast('Data tersimpan di HP. Akan dikirim saat server tersedia.', 'warning');

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
  if (loc.error) { showStatus('statusMsg', loc.error, 'error'); resetBtn(btn, 'out'); return; }

  showStatus('statusMsg', 'Mengambil foto selfie...', 'info');
  const photo = await takePhoto();
  if (photo.error) { showStatus('statusMsg', photo.error, 'error'); resetBtn(btn, 'out'); return; }

  const resultImg = document.getElementById('photoResult');
  const placeholder = document.getElementById('cameraPlaceholder');
  if (resultImg) { resultImg.src = base64ToDataUrl(photo.base64); resultImg.style.display = 'block'; }
  if (placeholder) placeholder.style.display = 'none';

  const dt = formatDateTime();
  const record = {
    id: Date.now().toString(),
    type: 'checkout',
    date: dt.date,
    yearMonth: dt.yearMonth,
    time: dt.full,
    photo: photo.base64,
    lat: loc.lat,
    lng: loc.lng,
    accuracy: loc.accuracy,
    userEmail: currentUser.email,
    userName: currentUser.name,
    synced: false
  };

  todayAttendance.checkOut = record;
  await saveTodayAttendance(todayAttendance);
  await addToHistory(record);
  await addToSyncQueue(record);

  showStatus('statusMsg', `Absen pulang berhasil! ${dt.time}`, 'success');
  showToast('Data tersimpan di HP. Akan dikirim saat server tersedia.', 'warning');

  setTimeout(() => showHome(), 1500);
}

function resetBtn(btn, type) {
  btn.disabled = false;
  btn.innerHTML = type === 'in'
    ? '<span>&#128247;</span> Ambil Foto & Absen Masuk'
    : '<span>&#128247;</span> Ambil Foto & Absen Pulang';
}

// ===== HISTORY =====
function showHistory() {
  document.getElementById('app').innerHTML = `
    <div class="history-container">
      <div class="header">
        <div class="header-left">
          <button class="icon-btn" onclick="showHome()">&#8592;</button>
          <h2>Riwayat Absensi</h2>
        </div>
      </div>
      <div class="history-list" id="historyList"></div>
      <div class="bottom-nav">
        <button class="nav-item" onclick="showHome()">&#127968;<span>Beranda</span></button>
        <button class="nav-item active" onclick="showHistory()">&#128220;<span>Riwayat</span></button>
        <button class="nav-item" onclick="showProfile()">&#128100;<span>Profil</span></button>
      </div>
    </div>
  `;
  renderHistoryList();
}

function renderHistoryList() {
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
    const time = formatTime(item.time);
    const photo = item.photo ? base64ToDataUrl(item.photo) : '';
    const badgeClass = item.type === 'checkout' ? 'badge-out' : 'badge-in';
    const badgeText = item.type === 'checkout' ? 'Pulang' : 'Masuk';
    const syncIcon = item.synced ? '&#9989;' : '&#9888;';
    return `
      <div class="history-item">
        <img class="history-thumb" src="${photo}" alt="" onerror="this.style.display='none'">
        <div class="history-info">
          <h4>${item.date}</h4>
          <p>&#128337; Jam: ${time}</p>
          <p>&#128205; ${item.lat ? item.lat.toFixed(4) + ', ' + item.lng.toFixed(4) : '-'}</p>
          <span class="badge ${badgeClass}">${badgeText}</span>
          <span style="font-size:11px;color:#6b7280;margin-left:6px;">${syncIcon} ${item.synced ? 'Tersinkron' : 'Belum sync'}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ===== PROFILE =====
function showProfile() {
  const pendingCount = syncQueue.length;
  document.getElementById('app').innerHTML = `
    <div class="profile-container">
      <div class="profile-header">
        <div class="profile-avatar">${currentUser.avatar || currentUser.name.charAt(0).toUpperCase()}</div>
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
        <div class="menu-item" onclick="showSyncStatus()">
          <div class="left"><span class="icon">&#128260;</span> Status Sinkronisasi</div>
          <span style="color:${pendingCount > 0 ? '#f59e0b' : '#22c55e'};">${pendingCount} pending</span>
        </div>
        <div class="menu-item" onclick="attemptSync()">
          <div class="left"><span class="icon">&#128228;</span> Sinkronkan Sekarang</div>
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

function showSyncStatus() {
  const pending = syncQueue.length;
  alert(`Status Sinkronisasi\n\nData tersimpan di HP: ${historyData.length}\nBelum dikirim ke server: ${pending}\n\n${pending > 0 ? 'Data akan otomatis dikirim saat WiFi/server tersedia.' : 'Semua data sudah tersinkron!'}`);
}

async function attemptSync() {
  if (syncQueue.length === 0) {
    showToast('Tidak ada data yang perlu disinkronkan.', 'info');
    return;
  }

  showToast('Menyinkronkan data ke server...', 'info');

  const failed = [];
  for (const record of syncQueue) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${API_BASE_URL}/api/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify(record),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) throw new Error('Sync failed');
      record.synced = true;
    } catch (e) {
      failed.push(record);
    }
  }

  syncQueue = failed;
  await saveSyncQueue();

  if (failed.length === 0) {
    showToast('✅ Semua data berhasil disinkronkan!', 'success');
  } else {
    showToast(`⚠️ ${failed.length} data belum tersinkron. Server mungkin offline.`, 'warning');
  }
}

async function getToken() {
  const { value } = await Preferences.get({ key: 'token' });
  return value || '';
}

function toggleSidebar() {
  alert('Menu: Beranda, Riwayat, Profil, Keluar');
}

// ===== EXPOSE =====
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.showHome = showHome;
window.showHistory = showHistory;
window.showProfile = showProfile;
window.processCheckIn = processCheckIn;
window.processCheckOut = processCheckOut;
window.attemptSync = attemptSync;
window.showSyncStatus = showSyncStatus;
window.toggleSidebar = toggleSidebar;
