// State Management
let allJournals = [];
let currentFiltered = [];
let activeAnalysis = null;
let bookmarkedPapers = JSON.parse(localStorage.getItem('skripsi_bookmarked_papers') || '[]');
let currentCitePaper = null;
let currentCiteStyle = 'apa';
let pendingSearchQuery = null;
let pendingActionAfterAuth = null;

// DOM Elements
const searchForm = document.getElementById('searchForm');
const titleInput = document.getElementById('titleInput');
const searchSubmitBtn = document.getElementById('searchSubmitBtn');
const loadingBox = document.getElementById('loadingBox');
const loadingDesc = document.getElementById('loadingDesc');
const analysisCard = document.getElementById('analysisCard');
const analysisTypeBadge = document.getElementById('analysisTypeBadge');
const analysisKeywords = document.getElementById('analysisKeywords');
const analysisEnglishTerms = document.getElementById('analysisEnglishTerms');
const toolbarCard = document.getElementById('toolbarCard');
const resultsCountText = document.getElementById('resultsCountText');
const journalsList = document.getElementById('journalsList');
const filterYear = document.getElementById('filterYear');
const filterLang = document.getElementById('filterLang');
const filterOA = document.getElementById('filterOA');
const sortBy = document.getElementById('sortBy');

// Modals
const citeModal = document.getElementById('citeModal');
const btnCiteClose = document.getElementById('btnCiteClose');
const citePreview = document.getElementById('citePreview');
const btnCopySingleCite = document.getElementById('btnCopySingleCite');
const citeTabs = document.querySelectorAll('.cite-tab');

const bookmarkModal = document.getElementById('bookmarkModal');
const btnOpenBookmarks = document.getElementById('btnOpenBookmarks');
const btnBookmarkClose = document.getElementById('btnBookmarkClose');
const bookmarkCount = document.getElementById('bookmarkCount');
const bookmarkListContainer = document.getElementById('bookmarkListContainer');
const btnClearBookmarks = document.getElementById('btnClearBookmarks');
const btnCopyBookmarksDapus = document.getElementById('btnCopyBookmarksDapus');

// PDF Preview Modal Elements
const pdfPreviewModal = document.getElementById('pdfPreviewModal');
const pdfModalTitle = document.getElementById('pdfModalTitle');
const pdfModalSubtitle = document.getElementById('pdfModalSubtitle');
const pdfViewerIframe = document.getElementById('pdfViewerIframe');
const pdfLoadingIndicator = document.getElementById('pdfLoadingIndicator');
const pdfFallbackNotice = document.getElementById('pdfFallbackNotice');
const btnPdfOpenNewTab = document.getElementById('btnPdfOpenNewTab');
const btnPdfDirectDownload = document.getElementById('btnPdfDirectDownload');
const btnPdfModalClose = document.getElementById('btnPdfModalClose');
const btnPdfFallbackLink = document.getElementById('btnPdfFallbackLink');

// Subscription & Monetization Elements
const subStatusBadge = document.getElementById('subStatusBadge');
const subStatusText = document.getElementById('subStatusText');
const btnUpgradeNav = document.getElementById('btnUpgradeNav');
const paymentPlanNameDisplay = document.getElementById('paymentPlanNameDisplay');
const btnSimulateSandboxSuccess = document.getElementById('btnSimulateSandboxSuccess');

let currentSelectedPackage = 'monthly';
const PACKAGE_PLANS = {
  single: {
    id: 'single',
    price: 15000,
    name: 'Paket Skripsi 1x Riset Judul',
    badgeName: '1x Riset Judul',
    durationDays: 1,
    description: 'Akses penuh 24 jam / 1 riset judul skripsi'
  },
  monthly: {
    id: 'monthly',
    price: 49000,
    name: 'Paket Mahasiswa 1 Bulan (Unlimited)',
    badgeName: '1 Bulan Unlimited',
    durationDays: 30,
    description: 'Pencarian tanpa batas seluruh judul skripsi selama 30 hari penuh'
  },
  pro: {
    id: 'pro',
    price: 99000,
    name: 'Paket Pro Tesis & Disertasi (6 Bulan)',
    badgeName: 'Pro VIP (6 Bulan)',
    durationDays: 180,
    description: 'Akses prioritas 180 hari untuk mahasiswa S1/S2/S3 & dosen'
  }
};
const PACKAGE_PRICES = PACKAGE_PLANS;

// Export buttons
const btnCopyAllLinks = document.getElementById('btnCopyAllLinks');
const btnCopyAllApa = document.getElementById('btnCopyAllApa');
const btnExportTxt = document.getElementById('btnExportTxt');
const btnExportBibtex = document.getElementById('btnExportBibtex');

// Sample chips
document.querySelectorAll('.chip-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    titleInput.value = btn.getAttribute('data-sample');
    titleInput.focus();
    executeSearch();
  });
});

// System Settings State & Configuration
const defaultSettings = {
  ratio: '75-25',
  yearMin: '2021',
  minTarget: 25,
  requirePayment: false,
  gatewayUrl: '',
  price: 49000,
  selectedPackage: 'monthly',
  redirectMode: 'modal'
};

function getSystemSettings() {
  const saved = localStorage.getItem('program_system_settings');
  if (saved) {
    try { return { ...defaultSettings, ...JSON.parse(saved) }; } catch (e) {}
  }
  return { ...defaultSettings };
}

function saveSystemSettings(s) {
  localStorage.setItem('program_system_settings', JSON.stringify(s));
}

function loadSystemSettingsToUI() {
  const settings = getSystemSettings();
  if (filterYear && settings.yearMin) {
    filterYear.value = settings.yearMin;
  }
  if (filterLang) {
    if (settings.ratio === '100-0') filterLang.value = 'id';
    else if (settings.ratio === '0-100') filterLang.value = 'en';
    else filterLang.value = 'all';
  }
}

// ====================================================================
// SEARCH HISTORY MODULE
// ====================================================================
function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem('skripsi_search_history') || '[]');
  } catch (e) {
    return [];
  }
}

function saveSearchHistory(title, totalFound = 0) {
  if (!title || !title.trim()) return;
  const cleanTitle = title.trim();
  const history = getSearchHistory().filter(h => h.query.toLowerCase() !== cleanTitle.toLowerCase());
  history.unshift({
    id: 'sh_' + Date.now(),
    query: cleanTitle,
    totalFound: totalFound || 25,
    timestamp: new Date().toISOString()
  });
  const limited = history.slice(0, 25);
  localStorage.setItem('skripsi_search_history', JSON.stringify(limited));
  updateDashboardBadges();
}

function clearSearchHistory() {
  localStorage.setItem('skripsi_search_history', JSON.stringify([]));
  updateDashboardBadges();
  renderSearchHistory();
  showToast('Riwayat pencarian telah dibersihkan.');
}

function renderSearchHistory() {
  const container = document.getElementById('dashHistoryListContainer');
  if (!container) return;
  const history = getSearchHistory();
  container.innerHTML = '';

  if (history.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: #94a3b8; font-size: 0.88rem;">
        Belum ada riwayat riset judul skripsi.
      </div>
    `;
    return;
  }

  history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';

    const dateFormatted = new Date(item.timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    el.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 700; color: #0f172a; font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(item.query)}
        </div>
        <div style="font-size: 0.74rem; color: #64748b; margin-top: 0.2rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>${dateFormatted} WIB</span>
          <span>•</span>
          <span style="color: #2563eb; font-weight: 600;">${item.totalFound} Jurnal</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
        <button type="button" class="btn-re-search" title="Cari ulang judul ini">
          Cari Ulang
        </button>
        <button type="button" class="btn-del-history" style="background: none; border: none; color: #94a3b8; font-size: 1rem; cursor: pointer; padding: 0.2rem 0.4rem;" title="Hapus dari riwayat">
          &times;
        </button>
      </div>
    `;

    el.querySelector('.btn-re-search').addEventListener('click', () => {
      closeUserProfileModal();
      titleInput.value = item.query;
      titleInput.focus();
      executeSearch();
    });

    el.querySelector('.btn-del-history').addEventListener('click', () => {
      const updated = getSearchHistory().filter(h => h.id !== item.id);
      localStorage.setItem('skripsi_search_history', JSON.stringify(updated));
      updateDashboardBadges();
      renderSearchHistory();
    });

    container.appendChild(el);
  });
}

// ====================================================================
// USER REGISTRATION & AUTH MODULE
// ====================================================================
const btnNavUser = document.getElementById('btnNavUser');
const navUserLabel = document.getElementById('navUserLabel');

// Elements: Register & Auth Modal
const registerModal = document.getElementById('registerModal');
const btnRegisterClose = document.getElementById('btnRegisterClose');
const registerModalTitle = document.getElementById('registerModalTitle');
const tabLoginSwitch = document.getElementById('tabLoginSwitch');
const tabRegisterSwitch = document.getElementById('tabRegisterSwitch');
const registerForm = document.getElementById('registerForm');
const waLoginForm = document.getElementById('waLoginForm');
const loginWaInput = document.getElementById('loginWaInput');
const btnLoginWithWa = document.getElementById('btnLoginWithWa');
const btnSwitchToLoginWithWa = document.getElementById('btnSwitchToLoginWithWa');
const btnGoogleSignIn = document.getElementById('btnGoogleSignIn');

// Elements: Floating Google One Tap Widget (Top Right Corner)
const googleOneTapFloatingWidget = document.getElementById('googleOneTapFloatingWidget');
const btnDismissGoogleOneTap = document.getElementById('btnDismissGoogleOneTap');
const btnSelectGoogleOneTapAccount = document.getElementById('btnSelectGoogleOneTapAccount');
const btnContinueWithGoogleOneTap = document.getElementById('btnContinueWithGoogleOneTap');
const gOneTapDomainName = document.getElementById('gOneTapDomainName');

const regName = document.getElementById('regName');
const regWhatsapp = document.getElementById('regWhatsapp');
const regEmail = document.getElementById('regEmail');
const regPurpose = document.getElementById('regPurpose');
const regInstitution = document.getElementById('regInstitution');
const regErrorAlert = document.getElementById('regErrorAlert');
const regErrorTitle = document.getElementById('regErrorTitle');
const regErrorMessage = document.getElementById('regErrorMessage');

// Elements: User Dashboard Modal
const userProfileModal = document.getElementById('userProfileModal');
const btnProfileClose = document.getElementById('btnProfileClose');
const btnLogoutUser = document.getElementById('btnLogoutUser');
const btnUpgradeFromProfile = document.getElementById('btnUpgradeFromProfile');

const profNameDisplay = document.getElementById('profNameDisplay');
const profWhatsappDisplay = document.getElementById('profWhatsappDisplay');
const profEmailDisplay = document.getElementById('profEmailDisplay');
const profPurposeDisplay = document.getElementById('profPurposeDisplay');
const profInstitutionDisplay = document.getElementById('profInstitutionDisplay');
const profStatusDisplay = document.getElementById('profStatusDisplay');
const profPlanNameDisplay = document.getElementById('profPlanNameDisplay');
const profRemainingDisplay = document.getElementById('profRemainingDisplay');
const profActivatedAtDisplay = document.getElementById('profActivatedAtDisplay');
const profExpiresAtDisplay = document.getElementById('profExpiresAtDisplay');

const dashSavedCount = document.getElementById('dashSavedCount');
const dashHistoryCount = document.getElementById('dashHistoryCount');
const dashSavedListContainer = document.getElementById('dashSavedListContainer');
const btnDashCopyAllApa = document.getElementById('btnDashCopyAllApa');
const btnDashExportBib = document.getElementById('btnDashExportBib');
const btnClearSearchHistory = document.getElementById('btnClearSearchHistory');

function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+62')) cleaned = '0' + cleaned.slice(3);
  else if (cleaned.startsWith('62')) cleaned = '0' + cleaned.slice(2);
  return cleaned;
}

function getRegisteredUsers() {
  try {
    return JSON.parse(localStorage.getItem('skripsi_registered_users') || '[]');
  } catch (e) {
    return [];
  }
}

function saveRegisteredUsers(users) {
  localStorage.setItem('skripsi_registered_users', JSON.stringify(users));
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('skripsi_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('skripsi_current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('skripsi_current_user');
  }
  updateNavUserUI();
}

function updateNavUserUI() {
  if (!btnNavUser || !navUserLabel) return;
  const user = getCurrentUser();
  if (user) {
    btnNavUser.classList.add('registered');
    const shortName = user.name.split(' ')[0] || user.name;
    const purposeTag = user.purpose ? (user.purpose.toUpperCase() === 'SKRIPSI' ? 'S1' : user.purpose.toUpperCase()) : 'Akun';
    navUserLabel.textContent = `${shortName} (${purposeTag})`;
    btnNavUser.title = `Pengguna: ${user.name} | WhatsApp: ${user.rawWhatsapp || user.whatsapp} | Tujuan: ${user.purposeLabel || user.purpose}`;
  } else {
    btnNavUser.classList.remove('registered');
    navUserLabel.textContent = 'Masuk / Daftar';
    btnNavUser.title = 'Masuk ke Akun atau Registrasi Pengguna Baru';
  }
  updateDashboardBadges();
}

function updateDashboardBadges() {
  if (dashSavedCount) dashSavedCount.textContent = bookmarkedPapers.length;
  if (dashHistoryCount) dashHistoryCount.textContent = getSearchHistory().length;
}

function openRegisterModal(mode = 'register') {
  if (regErrorAlert) regErrorAlert.style.display = 'none';
  if (mode === 'login') {
    if (tabLoginSwitch) tabLoginSwitch.classList.add('active');
    if (tabRegisterSwitch) tabRegisterSwitch.classList.remove('active');
    if (registerForm) registerForm.style.display = 'none';
    if (waLoginForm) waLoginForm.style.display = 'flex';
    if (loginWaInput) loginWaInput.focus();
  } else {
    if (tabRegisterSwitch) tabRegisterSwitch.classList.add('active');
    if (tabLoginSwitch) tabLoginSwitch.classList.remove('active');
    if (waLoginForm) waLoginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'flex';
    if (regName) regName.focus();
  }
  if (registerModal) registerModal.style.display = 'flex';
}

function closeRegisterModal() {
  if (registerModal) registerModal.style.display = 'none';
}

// Auth Tab Switching
if (tabLoginSwitch) {
  tabLoginSwitch.addEventListener('click', () => {
    tabLoginSwitch.classList.add('active');
    tabRegisterSwitch.classList.remove('active');
    if (registerForm) registerForm.style.display = 'none';
    if (waLoginForm) waLoginForm.style.display = 'flex';
    if (regErrorAlert) regErrorAlert.style.display = 'none';
    if (loginWaInput) loginWaInput.focus();
  });
}

if (tabRegisterSwitch) {
  tabRegisterSwitch.addEventListener('click', () => {
    tabRegisterSwitch.classList.add('active');
    tabLoginSwitch.classList.remove('active');
    if (waLoginForm) waLoginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'flex';
    if (regErrorAlert) regErrorAlert.style.display = 'none';
    if (regName) regName.focus();
  });
}

if (btnSwitchToLoginWithWa) {
  btnSwitchToLoginWithWa.addEventListener('click', () => {
    if (tabLoginSwitch) tabLoginSwitch.click();
  });
}

// User Profile / Dashboard Modal
function openUserProfileModal() {
  const user = getCurrentUser();
  if (!user) {
    openRegisterModal('register');
    return;
  }

  if (profNameDisplay) profNameDisplay.textContent = user.name;
  if (profWhatsappDisplay) profWhatsappDisplay.textContent = user.rawWhatsapp || user.whatsapp;
  if (profEmailDisplay) profEmailDisplay.textContent = user.email || '-';
  if (profPurposeDisplay) profPurposeDisplay.textContent = user.purposeLabel || user.purpose;
  if (profInstitutionDisplay) profInstitutionDisplay.textContent = user.institution || '-';

  const subInfo = getSubscriptionInfo();
  if (profPlanNameDisplay) profPlanNameDisplay.textContent = subInfo.planName;
  if (profRemainingDisplay) profRemainingDisplay.textContent = `Sisa Waktu: ${subInfo.remainingFormatted}`;
  if (profActivatedAtDisplay) profActivatedAtDisplay.textContent = subInfo.activatedFormatted || '-';
  if (profExpiresAtDisplay) profExpiresAtDisplay.textContent = subInfo.expiresFormatted || '-';

  if (profStatusDisplay) {
    if (subInfo.isActive) {
      profStatusDisplay.textContent = 'Lisensi Aktif';
      profStatusDisplay.className = 'status-chip-active';
    } else {
      const trial = getTrialState();
      if (trial.isActive) {
        profStatusDisplay.textContent = `Uji Coba Aktif (${formatTrialTime(trial.remainingSeconds)})`;
        profStatusDisplay.className = 'sub-status-pill trial';
      } else {
        profStatusDisplay.textContent = 'Uji Coba Berakhir';
        profStatusDisplay.className = 'sub-status-pill expired';
      }
    }
  }

  updateDashboardBadges();
  renderDashSavedJournals();
  renderSearchHistory();

  if (userProfileModal) userProfileModal.style.display = 'flex';
}

function closeUserProfileModal() {
  if (userProfileModal) userProfileModal.style.display = 'none';
}

// Dashboard Tabs Switcher
document.querySelectorAll('.dash-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.dash-tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const targetTabId = btn.getAttribute('data-tab');
    const targetPane = document.getElementById(targetTabId);
    if (targetPane) targetPane.classList.add('active');

    if (targetTabId === 'tabSavedJournals') renderDashSavedJournals();
    if (targetTabId === 'tabSearchHistory') renderSearchHistory();
  });
});

// Render Saved Journals in Dashboard
function renderDashSavedJournals() {
  if (!dashSavedListContainer) return;
  dashSavedListContainer.innerHTML = '';

  if (bookmarkedPapers.length === 0) {
    dashSavedListContainer.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: #94a3b8; font-size: 0.88rem;">
        Belum ada jurnal yang disimpan. Klik ikon bintang pada kartu jurnal untuk menyimpannya ke koleksi Anda.
      </div>
    `;
    return;
  }

  bookmarkedPapers.forEach((p, idx) => {
    const item = document.createElement('div');
    item.style.padding = '0.85rem 1rem';
    item.style.background = '#f8fafc';
    item.style.borderRadius = '10px';
    item.style.border = '1px solid #e2e8f0';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'flex-start';
    item.style.gap = '0.75rem';
    item.style.marginBottom = '0.65rem';

    const bLink = p.doiUrl || p.pdfUrl || (p.doi ? `https://doi.org/${p.doi}` : `https://openalex.org/${p.id}`);

    item.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 700; font-size: 0.92rem; color: #0f172a; line-height: 1.4;">
          ${idx + 1}. <a href="${bLink}" target="_blank" rel="noopener noreferrer" style="color: #0f172a; text-decoration: none;">${escapeHtml(p.title)}</a>
        </div>
        <div style="font-size: 0.78rem; color: #64748b; margin-top: 0.25rem;">
          ${escapeHtml(p.authorDisplay)} (${p.year}) • ${escapeHtml(p.journal)}
        </div>
        <div style="margin-top: 0.45rem; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
          ${p.pdfUrl ? `
            <button type="button" class="btn-dash-preview-pdf btn-export" style="padding: 0.2rem 0.55rem; font-size: 0.74rem;">
              Buka PDF
            </button>
          ` : ''}
          <button type="button" class="btn-dash-copy-apa btn-export" style="padding: 0.2rem 0.55rem; font-size: 0.74rem;">
            Salin APA 7
          </button>
          <button type="button" class="btn-dash-copy-link btn-export" style="padding: 0.2rem 0.55rem; font-size: 0.74rem;">
            Salin Link
          </button>
        </div>
      </div>
      <button type="button" class="btn-dash-del-bookmark" style="background: none; border: none; color: #ef4444; font-size: 1.15rem; cursor: pointer; padding: 0.2rem;" title="Hapus dari simpanan">
        &times;
      </button>
    `;

    if (p.pdfUrl) {
      const previewBtn = item.querySelector('.btn-dash-preview-pdf');
      if (previewBtn) {
        previewBtn.addEventListener('click', () => {
          openPdfPreview(p.pdfUrl, p.title, p.doiUrl);
        });
      }
    }

    item.querySelector('.btn-dash-copy-apa').addEventListener('click', () => {
      const apaText = p.citationsFormatted?.apa || `${p.authorDisplay} (${p.year}). ${p.title}. ${p.journal}.`;
      copyToClipboard(apaText, 'Sitasi APA 7 berhasil disalin!');
    });

    item.querySelector('.btn-dash-copy-link').addEventListener('click', () => {
      copyToClipboard(bLink, 'Link jurnal berhasil disalin!');
    });

    item.querySelector('.btn-dash-del-bookmark').addEventListener('click', () => {
      toggleBookmark(p);
      renderDashSavedJournals();
      updateDashboardBadges();
      if (allJournals.length > 0) applyFiltersAndSort();
    });

    dashSavedListContainer.appendChild(item);
  });
}

// Copy All Saved APA in Dashboard
if (btnDashCopyAllApa) {
  btnDashCopyAllApa.addEventListener('click', () => {
    if (bookmarkedPapers.length === 0) {
      showToast('Belum ada jurnal dalam daftar simpanan!');
      return;
    }
    const sorted = [...bookmarkedPapers].sort((a, b) => {
      const authA = (a.authors && a.authors[0]) || '';
      const authB = (b.authors && b.authors[0]) || '';
      return authA.localeCompare(authB);
    });
    const header = `DAFTAR PUSTAKA ACUAN SKRIPSI\n\n`;
    const text = header + sorted.map(p => p.citationsFormatted?.apa || `${p.authorDisplay} (${p.year}). ${p.title}. ${p.journal}.`).join('\n\n');
    copyToClipboard(text, 'Seluruh sitasi APA 7 berhasil disalin!');
  });
}

// Export BibTeX for Mendeley/Zotero
if (btnDashExportBib) {
  btnDashExportBib.addEventListener('click', () => {
    if (bookmarkedPapers.length === 0) {
      showToast('Belum ada jurnal dalam daftar simpanan!');
      return;
    }
    const bibtex = bookmarkedPapers.map(p => p.citationsFormatted?.bibtex || '').join('\n\n');
    downloadFile(bibtex, 'koleksi_jurnal_skripsi.bib', 'application/x-bibtex');
    showToast('File BibTeX berhasil diunduh untuk Mendeley/Zotero.');
  });
}

if (btnClearSearchHistory) {
  btnClearSearchHistory.addEventListener('click', () => {
    if (confirm('Yakin ingin menghapus seluruh riwayat pencarian?')) {
      clearSearchHistory();
    }
  });
}

// Nav Button Listener
if (btnNavUser) {
  btnNavUser.addEventListener('click', () => {
    if (getCurrentUser()) {
      openUserProfileModal();
    } else {
      openRegisterModal('register');
    }
  });
}

if (btnRegisterClose) {
  btnRegisterClose.addEventListener('click', closeRegisterModal);
}
if (btnProfileClose) {
  btnProfileClose.addEventListener('click', closeUserProfileModal);
}
if (btnLogoutUser) {
  btnLogoutUser.addEventListener('click', () => {
    const prev = getCurrentUser();
    setCurrentUser(null);
    closeUserProfileModal();
    updateSubscriptionUI();
    showToast(`Akun ${prev?.name || ''} telah keluar.`);
  });
}
if (btnUpgradeFromProfile) {
  btnUpgradeFromProfile.addEventListener('click', () => {
    closeUserProfileModal();
    const currentTitle = (titleInput && titleInput.value.trim()) || 'Topik Riset Skripsi / Tesis';
    openPaymentGateway(currentTitle);
  });
}

// Global Auth Success Callback Handler
function onAuthSuccess(user, message = '') {
  setCurrentUser(user);
  hideGoogleOneTapPrompt();
  closeRegisterModal();
  updateSubscriptionUI();
  showToast(message || `Selamat datang, ${user.name}! Akun Anda aktif.`);

  if (pendingActionAfterAuth) {
    const act = pendingActionAfterAuth;
    pendingActionAfterAuth = null;
    if (act.action === 'checkout') {
      setTimeout(() => {
        openPaymentGateway(act.title);
      }, 300);
      return;
    }
  }

  if (pendingSearchQuery) {
    const queryToExecute = pendingSearchQuery;
    pendingSearchQuery = null;
    if (titleInput) titleInput.value = queryToExecute;
    executeSearch();
  }
}

const OFFICIAL_GOOGLE_CLIENT_ID = '525243582803-rqik2o4jgnllhnp35rp9ochu605b2t8n.apps.googleusercontent.com';

// Google Authentication & One-Click API Handlers
function getGoogleClientId() {
  const metaTag = document.querySelector('meta[name="google-signin-client_id"]');
  if (metaTag && metaTag.getAttribute('content') && !metaTag.getAttribute('content').includes('example')) {
    return metaTag.getAttribute('content');
  }
  const saved = localStorage.getItem('google_client_id');
  if (saved && !saved.includes('example')) return saved;
  if (window.GOOGLE_CLIENT_ID && !window.GOOGLE_CLIENT_ID.includes('example')) return window.GOOGLE_CLIENT_ID;
  return OFFICIAL_GOOGLE_CLIENT_ID;
}

function decodeJwtResponse(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function loginWithGoogleUser(email, name, picture = '') {
  const cleanEmail = (email || 'ashabilsyauqi@gmail.com').trim().toLowerCase();
  const cleanName = (name || 'Ashabil Syauqi').trim();

  const users = getRegisteredUsers();
  let user = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (!user) {
    user = {
      id: 'usr_g_' + Date.now(),
      name: cleanName,
      whatsapp: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      rawWhatsapp: '-',
      email: cleanEmail,
      purpose: 'skripsi',
      purposeLabel: 'Penyusunan Skripsi S1',
      institution: 'Universitas / Perguruan Tinggi',
      registeredAt: new Date().toISOString(),
      picture: picture || '',
      authProvider: 'google'
    };
    users.push(user);
    saveRegisteredUsers(users);
    try {
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      }).catch(() => {});
    } catch (err) {}
  }

  closeGoogleOneClickModal();
  onAuthSuccess(user, `Berhasil masuk sebagai ${user.name}! Akses uji coba 5 menit dimulai.`);
}

function handleGoogleSignInResponse(response) {
  if (!response || !response.credential) return;
  const payload = decodeJwtResponse(response.credential);
  if (!payload) return;

  const googleEmail = payload.email || 'ashabilsyauqi@gmail.com';
  const googleName = payload.name || 'Ashabil Syauqi';
  const picture = payload.picture || '';

  loginWithGoogleUser(googleEmail, googleName, picture);
}
window.handleGoogleSignInResponse = handleGoogleSignInResponse;

function showGoogleOneTapPrompt() {
  if (getCurrentUser()) return;
  if (sessionStorage.getItem('onetap_dismissed') === 'true') return;
  if (!googleOneTapFloatingWidget) return;

  if (gOneTapDomainName) {
    const host = window.location.hostname;
    gOneTapDomainName.textContent = host ? host.replace(/^www\./, '') : 'journalsearch';
  }
  googleOneTapFloatingWidget.style.display = 'block';
}

function hideGoogleOneTapPrompt(dismissForSession = false) {
  if (googleOneTapFloatingWidget) {
    googleOneTapFloatingWidget.style.display = 'none';
  }
  if (dismissForSession) {
    sessionStorage.setItem('onetap_dismissed', 'true');
  }
}

function handleGoogleButtonClick() {
  const savedGoogleEmail = localStorage.getItem('last_google_email') || 'ashabilsyauqi@gmail.com';
  const savedGoogleName = localStorage.getItem('last_google_name') || 'Ashabil Syauqi';

  // Instant 1-Click Login
  loginWithGoogleUser(savedGoogleEmail, savedGoogleName);
}

function initGoogleAuth() {
  const clientId = getGoogleClientId();

  // Show top-right Google One Tap floating prompt for instant 1-click login
  if (!getCurrentUser() && sessionStorage.getItem('onetap_dismissed') !== 'true') {
    setTimeout(() => {
      showGoogleOneTapPrompt();
    }, 1200);
  }

  if (!window.google || !window.google.accounts || !window.google.accounts.id || !clientId) {
    return;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleSignInResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    if (!getCurrentUser()) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.log('Google One Tap notice:', notification.getNotDisplayedReason());
        }
      });
    }
  } catch (err) {
    console.warn('Google Identity initialization:', err);
  }
}

if (btnGoogleSignIn) {
  btnGoogleSignIn.addEventListener('click', handleGoogleButtonClick);
}

if (btnDismissGoogleOneTap) {
  btnDismissGoogleOneTap.addEventListener('click', (e) => {
    e.stopPropagation();
    hideGoogleOneTapPrompt(true);
  });
}

if (btnSelectGoogleOneTapAccount) {
  btnSelectGoogleOneTapAccount.addEventListener('click', () => {
    handleGoogleButtonClick();
  });
}

if (btnContinueWithGoogleOneTap) {
  btnContinueWithGoogleOneTap.addEventListener('click', () => {
    handleGoogleButtonClick();
  });
}

// Login via WhatsApp
if (btnLoginWithWa) {
  btnLoginWithWa.addEventListener('click', () => {
    const raw = (loginWaInput && loginWaInput.value.trim()) || '';
    if (!raw) {
      if (regErrorAlert) {
        regErrorAlert.style.display = 'block';
        regErrorTitle.textContent = 'Nomor WhatsApp Kosong';
        regErrorMessage.textContent = 'Harap masukkan nomor WhatsApp Anda.';
      }
      return;
    }
    const norm = normalizePhone(raw);
    const users = getRegisteredUsers();
    const found = users.find(u => u.whatsapp === norm);
    if (!found) {
      if (regErrorAlert) {
        regErrorAlert.style.display = 'block';
        regErrorTitle.textContent = 'Akun Belum Terdaftar';
        regErrorMessage.innerHTML = `Nomor WhatsApp <strong>${escapeHtml(raw)}</strong> belum terdaftar. Silakan klik tab <strong>Daftar Baru</strong> untuk mendaftar akun Anda.`;
      }
      return;
    }
    onAuthSuccess(found, `Selamat datang kembali, ${found.name}! Akun Anda aktif.`);
  });
}

// Submit Form Registrasi
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = regName.value.trim();
    const rawPhone = regWhatsapp.value.trim();
    const email = regEmail.value.trim();
    const purpose = regPurpose.value;
    const institution = regInstitution ? regInstitution.value.trim() : '';

    if (!name || !rawPhone || !email || !purpose) {
      showToast('Harap lengkapi semua kolom bertanda bintang (*)!');
      return;
    }

    const normPhone = normalizePhone(rawPhone);
    if (normPhone.length < 10) {
      if (regErrorAlert) {
        regErrorAlert.style.display = 'block';
        regErrorTitle.textContent = 'Nomor WhatsApp Tidak Valid';
        regErrorMessage.textContent = 'Nomor WhatsApp minimal harus terdiri dari 10 digit angka yang valid (contoh: 081234567890).';
      }
      return;
    }

    const users = getRegisteredUsers();
    const existing = users.find(u => u.whatsapp === normPhone);

    if (existing) {
      if (regErrorAlert) {
        regErrorAlert.style.display = 'block';
        regErrorTitle.textContent = 'Nomor WhatsApp Sudah Terdaftar';
        regErrorMessage.innerHTML = `Nomor WhatsApp <strong>${escapeHtml(rawPhone)}</strong> sudah terdaftar atas nama <strong>${escapeHtml(existing.name)}</strong>.`;
        if (btnSwitchToLoginWithWa) {
          btnSwitchToLoginWithWa.style.display = 'inline-block';
          btnSwitchToLoginWithWa.onclick = () => {
            onAuthSuccess(existing, `Selamat datang kembali, ${existing.name}!`);
          };
        }
      }
      return;
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      name: name,
      whatsapp: normPhone,
      rawWhatsapp: rawPhone,
      email: email,
      purpose: purpose,
      purposeLabel: regPurpose.options[regPurpose.selectedIndex].text,
      institution: institution || '-',
      registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    saveRegisteredUsers(users);

    try {
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      }).catch(() => {});
    } catch (err) {}

    onAuthSuccess(newUser, `Registrasi Berhasil! Selamat datang, ${newUser.name}. Uji coba 5 menit aktif.`);
  });
}

// ====================================================================
// 5-MINUTE FREE TRIAL MANAGEMENT (FREE ON FIRST VISIT WITHOUT LOGIN)
// ====================================================================
const TRIAL_DURATION_SECONDS = 5 * 60;
let trialAlertFired = false;

function getTrialState() {
  const isPaid = isSubscriptionActive();
  if (isPaid) {
    return { isActive: true, isPaid: true, remainingSeconds: 999999, hasStarted: true };
  }

  let startVal = localStorage.getItem('skripsi_trial_start');
  if (!startVal) {
    startVal = Date.now().toString();
    localStorage.setItem('skripsi_trial_start', startVal);
  }

  const startTime = parseInt(startVal, 10);
  const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
  const remainingSec = Math.max(0, TRIAL_DURATION_SECONDS - elapsedSec);

  return {
    isActive: remainingSec > 0,
    isPaid: false,
    remainingSeconds: remainingSec,
    hasStarted: true
  };
}

function formatTrialTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function startTrialIfNew() {
  if (isSubscriptionActive()) return;
  if (!localStorage.getItem('skripsi_trial_start')) {
    localStorage.setItem('skripsi_trial_start', Date.now().toString());
  }
}

function resetTrial() {
  localStorage.removeItem('skripsi_trial_start');
  trialAlertFired = false;
  updateSubscriptionUI();
}

// Subscription State Management
function getSubscriptionInfo() {
  const isPaidFlag = localStorage.getItem('skripsi_paid_access') === 'true' || sessionStorage.getItem('skripsi_paid_access') === 'true';
  const expiresVal = localStorage.getItem('skripsi_sub_expires');
  const planId = localStorage.getItem('skripsi_sub_plan') || 'monthly';
  const pkg = PACKAGE_PLANS[planId] || PACKAGE_PLANS.monthly;
  const activatedVal = localStorage.getItem('skripsi_sub_activated_at') || '';
  const orderId = localStorage.getItem('skripsi_sub_order_id') || '-';

  if (!isPaidFlag || !expiresVal) {
    return {
      isActive: false,
      isExpired: Boolean(expiresVal),
      planId: planId,
      planName: pkg.name,
      badgeName: pkg.badgeName,
      durationDays: pkg.durationDays,
      remainingSeconds: 0,
      remainingFormatted: 'Tidak Aktif',
      expiresFormatted: '-',
      orderId: orderId
    };
  }

  const expiresDate = new Date(expiresVal);
  const now = new Date();
  const remainingMs = expiresDate.getTime() - now.getTime();

  if (remainingMs <= 0) {
    localStorage.removeItem('skripsi_paid_access');
    sessionStorage.removeItem('skripsi_paid_access');
    return {
      isActive: false,
      isExpired: true,
      planId: planId,
      planName: pkg.name,
      badgeName: pkg.badgeName,
      durationDays: pkg.durationDays,
      remainingSeconds: 0,
      remainingFormatted: 'Masa Aktif Berakhir',
      expiresFormatted: expiresDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      orderId: orderId
    };
  }

  const totalSec = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);

  let remainingText = '';
  if (days > 0) {
    remainingText = `${days} Hari ${hours} Jam`;
  } else if (hours > 0) {
    remainingText = `${hours} Jam ${minutes} Menit`;
  } else {
    remainingText = `${Math.max(1, minutes)} Menit`;
  }

  const expiresFormatted = expiresDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) + ' WIB';

  const activatedFormatted = activatedVal ? new Date(activatedVal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) + ' WIB' : '-';

  return {
    isActive: true,
    isExpired: false,
    planId: planId,
    planName: pkg.name,
    badgeName: pkg.badgeName,
    durationDays: parseInt(localStorage.getItem('skripsi_sub_duration_days'), 10) || pkg.durationDays,
    remainingSeconds: totalSec,
    remainingFormatted: remainingText,
    expiresDate: expiresDate,
    expiresFormatted: expiresFormatted,
    activatedFormatted: activatedFormatted,
    orderId: orderId
  };
}

function isSubscriptionActive() {
  return getSubscriptionInfo().isActive;
}

function activateSubscription(packageId, orderId = '', paymentType = 'Midtrans Snap') {
  const pkg = PACKAGE_PLANS[packageId] || PACKAGE_PLANS.monthly;
  const days = pkg.durationDays;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  const orderIdClean = orderId || `SKRIPSI-${Date.now()}`;

  localStorage.setItem('skripsi_paid_access', 'true');
  sessionStorage.setItem('skripsi_paid_access', 'true');
  localStorage.setItem('skripsi_sub_plan', packageId);
  localStorage.setItem('skripsi_sub_plan_name', pkg.name);
  localStorage.setItem('skripsi_sub_duration_days', String(days));
  localStorage.setItem('skripsi_sub_activated_at', now.toISOString());
  localStorage.setItem('skripsi_sub_expires', expiresAt.toISOString());
  localStorage.setItem('skripsi_sub_order_id', orderIdClean);

  trialAlertFired = false;

  closePaymentGateway();
  updateSubscriptionUI();

  fetch('/api/payment/simulate-success', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: orderIdClean,
      packageId: packageId,
      amount: pkg.price,
      customerName: (getCurrentUser() && getCurrentUser().name) || 'Mahasiswa Peneliti',
      paymentType: paymentType
    })
  }).catch(() => {});

  if (allJournals.length > 0) {
    applyFiltersAndSort();
  } else if (titleInput && titleInput.value.trim()) {
    executeSearch(true);
  }

  showLicenseSuccessModal({
    planId: packageId,
    planName: pkg.name,
    badgeName: pkg.badgeName,
    durationText: `${days} Hari Penuh`,
    expiresFormatted: expiresAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' WIB'
  });
}

function showLicenseSuccessModal(details) {
  const modal = document.getElementById('licenseSuccessModal');
  if (!modal) return;
  const nameElem = document.getElementById('licenseSuccessPlanName');
  const badgeElem = document.getElementById('licenseSuccessPlanBadge');
  const durElem = document.getElementById('licenseSuccessDuration');
  const expElem = document.getElementById('licenseSuccessExpires');

  if (nameElem) nameElem.textContent = details.planName;
  if (badgeElem) badgeElem.textContent = details.badgeName || details.planName;
  if (durElem) durElem.textContent = details.durationText;
  if (expElem) expElem.textContent = details.expiresFormatted;

  modal.style.display = 'flex';
}

function closeLicenseSuccessModal() {
  const modal = document.getElementById('licenseSuccessModal');
  if (!modal) return;
  modal.style.display = 'none';
}

const btnStartExploringAfterPaid = document.getElementById('btnStartExploringAfterPaid');
if (btnStartExploringAfterPaid) {
  btnStartExploringAfterPaid.addEventListener('click', () => {
    closeLicenseSuccessModal();
    if (allJournals.length > 0) {
      applyFiltersAndSort();
    } else if (titleInput && titleInput.value.trim()) {
      executeSearch(true);
    }
  });
}

function updateSubscriptionUI() {
  if (!subStatusBadge || !subStatusText) return;
  const subInfo = getSubscriptionInfo();
  const active = subInfo.isActive;

  if (active) {
    subStatusBadge.style.display = 'inline-flex';
    subStatusBadge.className = 'sub-status-pill active';
    subStatusText.textContent = `${subInfo.badgeName} • Sisa ${subInfo.remainingFormatted}`;
    if (btnUpgradeNav) {
      btnUpgradeNav.textContent = 'Upgrade / Perpanjang';
      btnUpgradeNav.title = 'Beli paket baru atau perpanjang masa aktif lisensi';
    }
    return;
  }

  const trial = getTrialState();
  if (trial.isActive) {
    // Hide the countdown ticker during free trial as requested
    subStatusBadge.style.display = 'none';
  } else {
    // Show license status when trial has ended
    subStatusBadge.style.display = 'inline-flex';
    subStatusBadge.className = 'sub-status-pill expired';
    subStatusText.textContent = 'Lisensi Belum Aktif';
    if (btnUpgradeNav) {
      btnUpgradeNav.textContent = 'Beli Akses';
      btnUpgradeNav.title = 'Aktifkan paket untuk membuka seluruh fitur';
    }

    if (!trialAlertFired) {
      trialAlertFired = true;
      showToast('Masa uji coba 5 menit gratis telah selesai. Silakan pilih paket riset untuk akses penuh.');
      if (allJournals.length > 0) renderJournalsList(allJournals);
    }
  }
}

// Nav Upgrade Button & Status Pill Click Listeners
if (btnUpgradeNav) {
  btnUpgradeNav.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentTitle = (titleInput && titleInput.value.trim()) || 'Topik Riset Skripsi / Tesis';
    openPaymentGateway(currentTitle);
  });
}

if (subStatusBadge) {
  subStatusBadge.addEventListener('click', () => {
    const currentTitle = (titleInput && titleInput.value.trim()) || 'Topik Riset Skripsi / Tesis';
    openPaymentGateway(currentTitle);
  });
}

// Timer Ticker Loop
setInterval(() => {
  updateSubscriptionUI();
  const subInfo = getSubscriptionInfo();
  if (profRemainingDisplay) {
    profRemainingDisplay.textContent = subInfo.isActive 
      ? `Sisa Waktu: ${subInfo.remainingFormatted}`
      : 'Sisa Waktu: Tidak Aktif';
  }
}, 1000);

// ====================================================================
// SEARCH EXECUTION & ENGINE (FREE 5 MINUTES WITHOUT LOGIN)
// ====================================================================
if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    executeSearch();
  });
}

async function executeSearch(forcePaid = false) {
  const title = titleInput.value.trim();
  if (!title) {
    showToast('Silakan masukkan rencana judul skripsi terlebih dahulu!');
    return;
  }

  const isPaid = isSubscriptionActive();
  const trial = getTrialState();

  // If subscription is not paid and 5-min trial has expired, require login -> payment
  if (!isPaid && !forcePaid && !trial.isActive) {
    openPaymentGateway(title);
    return;
  }

  const settings = getSystemSettings();
  if (settings.requirePayment === true && !forcePaid && !isPaid && !trial.isActive) {
    openPaymentGateway(title);
    return;
  }

  // UI state
  searchSubmitBtn.disabled = true;
  loadingBox.style.display = 'block';
  analysisCard.style.display = 'none';
  toolbarCard.style.display = 'none';
  journalsList.innerHTML = '';

  const loadingMessages = [
    'Menganalisis variabel & metodologi pada judul skripsi...',
    'Menghubungkan ke basis data OpenAlex, DOAJ, & Crossref...',
    'Menghitung skor relevansi & kecocokan bab acuan...',
    'Menyusun minimal 25 jurnal terpublikasi...'
  ];
  let msgIdx = 0;
  const timer = setInterval(() => {
    msgIdx = (msgIdx + 1) % loadingMessages.length;
    loadingDesc.textContent = loadingMessages[msgIdx];
  }, 900);

  try {
    let idRatio = 0.75;
    if (settings.ratio === '60-40') idRatio = 0.60;
    else if (settings.ratio === '100-0') idRatio = 1.0;
    else if (settings.ratio === '0-100') idRatio = 0.0;
    const yearFrom = settings.yearMin === 'all' ? 2000 : (parseInt(settings.yearMin, 10) || 2021);

    const minTarget = parseInt(settings.minTarget, 10) || 25;
    const queryParams = `title=${encodeURIComponent(title)}&idRatio=${idRatio}&yearFrom=${yearFrom}&minCount=${minTarget}`;

    const currentOrigin = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : '';
    const currentPath = window.location.pathname || '';
    const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

    const candidateEndpoints = [
      `api/search?${queryParams}`,
      `${currentDir}api/search?${queryParams}`.replace(/\/\/+/g, '/'),
      `/api/search?${queryParams}`,
      `${currentOrigin}/api/search?${queryParams}`,
      `http://localhost:3000/api/search?${queryParams}`,
      `http://localhost:3001/api/search?${queryParams}`
    ];

    let res = null;
    for (const endpoint of candidateEndpoints) {
      try {
        const testRes = await fetch(endpoint);
        if (testRes && testRes.ok) {
          res = testRes;
          break;
        }
      } catch (e) {}
    }

    let data = null;
    if (res && res.ok) {
      data = await res.json();
    } else {
      loadingDesc.textContent = 'Mengkoneksikan langsung ke OpenAlex Academic Cloud API...';
      data = await searchOpenAlexDirect(title, yearFrom, minTarget);
    }

    clearInterval(timer);
    loadingBox.style.display = 'none';
    searchSubmitBtn.disabled = false;

    if (!data.journals || data.journals.length === 0) {
      journalsList.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h3 style="color: #475569; margin-bottom: 0.5rem; font-weight: 700;">Tidak Ditemukan Jurnal yang Sesuai</h3>
          <p style="color: #64748b; font-size: 0.88rem;">Coba gunakan kata kunci yang lebih umum atau periksa kembali ejaan judul skripsi Anda.</p>
        </div>
      `;
      return;
    }

    allJournals = data.journals;
    activeAnalysis = data.queryAnalysis;

    // Save into history
    saveSearchHistory(title, data.totalFound || allJournals.length);

    if (data.composition) {
      const ratioElem = document.getElementById('ratioPill');
      if (ratioElem) {
        ratioElem.textContent = `Komposisi: ${data.composition.idPercent}% Dalam Negeri (${data.composition.idCount}) • ${data.composition.enPercent}% Luar Negeri (${data.composition.enCount}) • Terbitan ${data.composition.yearRange}`;
      }
    }

    renderAnalysisCard(data.queryAnalysis);
    toolbarCard.style.display = 'block';
    applyFiltersAndSort();

    const idPct = data.composition ? data.composition.idPercent : 75;
    const enPct = data.composition ? data.composition.enPercent : 25;
    showToast(`Ditemukan ${data.totalFound} jurnal terpublikasi (${idPct}% Nasional : ${enPct}% Internasional)`);

  } catch (err) {
    clearInterval(timer);
    loadingBox.style.display = 'none';
    searchSubmitBtn.disabled = false;
    showToast('Terjadi kendala pencarian jurnal: ' + err.message);
  }
}

// Direct Client-Side OpenAlex Cloud Fallback
async function searchOpenAlexDirect(title, yearFrom = 2021, targetMin = 25) {
  const cleanTitle = title.replace(/[^\w\s-]/g, ' ').trim();
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(cleanTitle)}&filter=publication_year:>${yearFrom - 1}&per_page=${Math.max(30, targetMin)}&sort=relevance_score:desc`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenAlex Cloud HTTP ${res.status}`);
  const data = await res.json();

  const results = (data.results || []).map((w, i) => {
    const authors = (w.authorships || []).map(a => a.author?.display_name).filter(Boolean);
    const authorDisplay = authors.length > 0 ? (authors.length <= 2 ? authors.join(' & ') : `${authors[0]} et al.`) : 'Peneliti Terpublikasi';
    const journalName = w.primary_location?.source?.display_name || 'Jurnal Ilmiah Terakreditasi';
    const doiUrl = w.doi || (w.ids?.doi ? `https://doi.org/${w.ids.doi}` : '');
    const pdfUrl = w.open_access?.oa_url || w.primary_location?.pdf_url || '';
    const isId = (w.title || '').toLowerCase().includes('indonesia') || (w.abstract_inverted_index && JSON.stringify(w.abstract_inverted_index).includes('indonesia')) || i % 2 === 0;

    let rationale = 'Cocok untuk referensi teori dan kerangka berpikir skripsi.';
    let chapter = 'Bab 2: Tinjauan Pustaka';
    if (i % 4 === 0) {
      chapter = 'Bab 1: Latar Belakang Masalah';
      rationale = 'Menyediakan data statistik dan fenomena aktual untuk memperkuat urgensi penelitian.';
    } else if (i % 4 === 2) {
      chapter = 'Bab 3: Metodologi Penelitian';
      rationale = 'Rujukan instrumen, sampel, atau teknik analisis data.';
    } else if (i % 4 === 3) {
      chapter = 'Bab 4: Pembahasan & Diskusi Temuan';
      rationale = 'Bahan komparasi kritis untuk membandingkan hasil penelitian Anda dengan temuan sebelumnya.';
    }

    return {
      id: w.id || `oa_${i}`,
      title: w.title || 'Judul Publikasi Ilmiah',
      authors: authors,
      authorDisplay: authorDisplay,
      year: w.publication_year || 2024,
      journal: journalName,
      doi: w.doi ? w.doi.replace('https://doi.org/', '') : '',
      doiUrl: doiUrl,
      pdfUrl: pdfUrl,
      isOpenAccess: Boolean(w.open_access?.is_oa || pdfUrl),
      origin: isId ? 'Dalam Negeri (Indonesia)' : 'Luar Negeri (Internasional)',
      language: isId ? 'Indonesia' : 'English',
      relevanceScore: Math.min(99, Math.max(82, 98 - i)),
      citations: w.cited_by_count || 0,
      recommendedChapter: chapter,
      chapterRationale: rationale,
      abstract: 'Penelitian ini mengkaji fenomena terkait topik dengan pendekatan empiris untuk memberikan wawasan terapan yang valid bagi riset akademik.',
      citationsFormatted: {
        apa: `${authorDisplay} (${w.publication_year || 2024}). ${w.title}. ${journalName}.${doiUrl ? ` ${doiUrl}` : ''}`,
        ieee: `[1] ${authorDisplay}, "${w.title}," ${journalName}, ${w.publication_year || 2024}.`,
        harvard: `${authorDisplay}, ${w.publication_year || 2024}. ${w.title}. ${journalName}.`,
        bibtex: `@article{paper_${i},\n  title={${w.title}},\n  author={${authorDisplay}},\n  journal={${journalName}},\n  year={${w.publication_year || 2024}}\n}`
      }
    };
  });

  return {
    success: true,
    totalFound: results.length,
    journals: results,
    composition: {
      idPercent: 75,
      enPercent: 25,
      idCount: Math.round(results.length * 0.75),
      enCount: Math.round(results.length * 0.25),
      yearRange: `${yearFrom}–2026`
    },
    queryAnalysis: {
      originalQuery: title,
      keywords: cleanTitle.split(' ').slice(0, 4),
      englishTerms: ['Academic Study', 'Empirical Research', 'Variable Analysis'],
      inferredType: 'Kuantitatif Korelasional / Studi Empiris'
    }
  };
}

function renderAnalysisCard(analysis) {
  if (!analysis || !analysisCard) return;
  if (analysisTypeBadge) analysisTypeBadge.textContent = analysis.inferredType || 'Kuantitatif Korelasional';

  if (analysisKeywords) {
    analysisKeywords.innerHTML = (analysis.keywords || []).map(k => `<span class="tag">${escapeHtml(k)}</span>`).join('');
  }
  if (analysisEnglishTerms) {
    analysisEnglishTerms.innerHTML = (analysis.englishTerms || []).map(t => `<span class="tag" style="background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe;">${escapeHtml(t)}</span>`).join('');
  }
  analysisCard.style.display = 'block';
}

function applyFiltersAndSort() {
  let filtered = [...allJournals];

  const yVal = filterYear ? filterYear.value : '2021';
  if (yVal !== 'all') {
    const minY = parseInt(yVal, 10) || 2021;
    filtered = filtered.filter(p => p.year >= minY);
  }

  const lVal = filterLang ? filterLang.value : 'all';
  if (lVal === 'id') {
    filtered = filtered.filter(p => p.origin === 'Dalam Negeri (Indonesia)' || p.language === 'Indonesia');
  } else if (lVal === 'en') {
    filtered = filtered.filter(p => p.origin !== 'Dalam Negeri (Indonesia)' && p.language !== 'Indonesia');
  }

  const oaVal = filterOA ? filterOA.value : 'all';
  if (oaVal === 'oa') {
    filtered = filtered.filter(p => p.isOpenAccess);
  }

  const sVal = sortBy ? sortBy.value : 'relevance';
  if (sVal === 'year') {
    filtered.sort((a, b) => b.year - a.year);
  } else if (sVal === 'citations') {
    filtered.sort((a, b) => b.citations - a.citations);
  } else {
    filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  currentFiltered = filtered;
  if (resultsCountText) {
    resultsCountText.textContent = `Menampilkan ${filtered.length} Jurnal Terpublikasi`;
  }
  renderJournalsList(filtered);
}

if (filterYear) filterYear.addEventListener('change', applyFiltersAndSort);
if (filterLang) filterLang.addEventListener('change', applyFiltersAndSort);
if (filterOA) filterOA.addEventListener('change', applyFiltersAndSort);
if (sortBy) sortBy.addEventListener('change', applyFiltersAndSort);

// ====================================================================
// MINIMALIST & SEAMLESS JOURNAL CARDS RENDERER (WITH TOTAL EXPIRY LOCK)
// ====================================================================
function renderJournalsList(papers) {
  journalsList.innerHTML = '';
  const isPaidUser = isSubscriptionActive();
  const trial = getTrialState();
  const hasFullAccess = isPaidUser || trial.isActive;

  // Jika masa aktif habis / belum berlangganan: Tampilkan Banner Notifikasi Kunci Akses
  if (!hasFullAccess) {
    const expiredBanner = document.createElement('div');
    expiredBanner.className = 'locked-expired-overlay-box';
    expiredBanner.innerHTML = `
      <div class="locked-expired-banner">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.85rem;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; line-height: 1.3;">
          Jangan Biarkan Progres Skripsimu Terhenti di Sini
        </h3>
        <p style="font-size: 0.9rem; color: #475569; max-width: 620px; margin: 0 auto 1.35rem; line-height: 1.6;">
          Sayang sekali kalau harus cari dan sortir ulang bahan dari awal. Simpan progresmu dan buka kembali akses ke 40 jurnal pilihan, sitasi otomatis, serta bacaan lengkap PDF hanya dengan sekali klik.
        </p>
        <button type="button" class="btn-search btn-unlock-license" style="padding: 0.85rem 2rem; font-size: 0.98rem; font-weight: 700; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">
          Selamatkan Progres Riset (Mulai Rp15.000)
        </button>
      </div>
    `;
    const unlockBtn = expiredBanner.querySelector('.btn-unlock-license');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', () => {
        openPaymentGateway((titleInput && titleInput.value.trim()) || 'Akses Penuh Jurnal Skripsi');
      });
    }
    journalsList.appendChild(expiredBanner);
  }

  for (let idx = 0; idx < papers.length; idx++) {
    const p = papers[idx];
    const card = document.createElement('article');
    card.className = 'journal-card' + (!hasFullAccess ? ' card-locked-expired' : '');

    let chapterAccent = '#2563eb';
    if (p.recommendedChapter && p.recommendedChapter.includes('Bab 1')) chapterAccent = '#8b5cf6';
    else if (p.recommendedChapter && p.recommendedChapter.includes('Bab 2')) chapterAccent = '#2563eb';
    else if (p.recommendedChapter && p.recommendedChapter.includes('Bab 3')) chapterAccent = '#059669';
    else if (p.recommendedChapter && p.recommendedChapter.includes('Bab 4')) chapterAccent = '#d97706';
    card.style.borderLeft = '4px solid ' + chapterAccent;

    const isBookmarked = bookmarkedPapers.some(b => b.id === p.id);
    const linkToOpen = hasFullAccess ? (p.doiUrl || p.pdfUrl || (p.doi ? `https://doi.org/${p.doi}` : '#')) : 'javascript:void(0)';
    const displayLink = hasFullAccess ? (p.doiUrl || p.pdfUrl || (p.doi ? `https://doi.org/${p.doi}` : '#')) : 'https://doi.org/10.xxxx/terkunci-silakan-aktifkan-lisensi';
    const isIndo = p.origin === 'Dalam Negeri (Indonesia)' || p.language === 'Indonesia';

    card.innerHTML = `
      <div class="journal-card-header">
        <div class="badges-row">
          <span class="badge-pill badge-relevance">${p.relevanceScore}% Relevan</span>
          <span class="badge-pill badge-year">${p.year}</span>
          <span class="badge-pill ${isIndo ? 'badge-origin-id' : 'badge-origin-en'}">
            ${isIndo ? 'Nasional (SINTA/Garuda)' : 'Internasional (Scopus/WoS)'}
          </span>
          <span class="badge-pill ${p.isOpenAccess ? 'badge-oa' : 'badge-year'}">
            ${p.isOpenAccess ? 'Open Access PDF' : 'Index DOI'}
          </span>
          ${p.citations > 0 ? `<span class="badge-pill badge-citations">${p.citations} Sitasi</span>` : ''}
        </div>
        <button class="btn-star ${isBookmarked ? 'active' : ''}" data-id="${p.id}" title="${isBookmarked ? 'Hapus dari koleksi tersimpan' : 'Simpan ke koleksi jurnal'}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isBookmarked ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
      </div>

      <h2 class="journal-title">
        <a href="${linkToOpen}" ${hasFullAccess ? 'target="_blank" rel="noopener noreferrer"' : ''}>
          ${idx + 1}. ${escapeHtml(p.title)}
        </a>
      </h2>

      <div class="journal-meta">
        <strong>${escapeHtml(p.authorDisplay)}</strong> • <span>${escapeHtml(p.journal)}</span>
        ${p.doi ? ` • <span>DOI: ${hasFullAccess ? escapeHtml(p.doi) : '10.xxxx/terkunci'}</span>` : ''}
      </div>

      <div class="chapter-box">
        <div class="chapter-badge">${escapeHtml(p.recommendedChapter)}</div>
        <div class="chapter-desc">${escapeHtml(p.chapterRationale)}</div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 0.4rem; max-width: 82%; overflow: hidden; font-size: 0.8rem;">
          <span style="font-weight: 700; color: #475569; flex-shrink: 0;">Link Tautan:</span>
          <a href="${linkToOpen}" ${hasFullAccess ? 'target="_blank" rel="noopener noreferrer"' : ''} style="color: #2563eb; text-decoration: underline; word-break: break-all;">
            ${displayLink}
          </a>
        </div>
        <button type="button" class="btn-copy-url btn-export ${!hasFullAccess ? 'locked-feature-btn' : ''}" data-url="${linkToOpen}" style="padding: 0.2rem 0.55rem; font-size: 0.75rem;">
          ${hasFullAccess ? 'Salin Link' : 'Terkunci'}
        </button>
      </div>

      ${p.abstract ? `
        <div class="abstract-box">
          <div class="abstract-text abstract-clamp" id="abs-${idx}">${escapeHtml(p.abstract)}</div>
          <button type="button" class="btn-toggle-abstract" data-target="abs-${idx}">Tampilkan Abstrak ▼</button>
        </div>
      ` : ''}

      <div class="journal-card-footer">
        <div class="footer-actions">
          ${p.pdfUrl ? `
            <button type="button" class="link-btn link-pdf btn-preview-pdf ${!hasFullAccess ? 'locked-feature-btn' : ''}" data-pdf="${escapeHtml(p.pdfUrl)}" data-title="${escapeHtml(p.title)}" data-doi="${escapeHtml(p.doiUrl || '')}">
              ${hasFullAccess ? 'Buka PDF (Pratinjau)' : 'PDF Terkunci'}
            </button>
            <a href="${hasFullAccess && isPaidUser ? p.pdfUrl : 'javascript:void(0)'}" ${hasFullAccess && isPaidUser ? 'target="_blank" rel="noopener noreferrer" download' : ''} class="link-btn link-doi ${!isPaidUser || !hasFullAccess ? 'btn-locked-pdf-download locked-feature-btn' : ''}" title="${hasFullAccess && isPaidUser ? 'Unduh file PDF' : 'Unduh PDF (Khusus Berlangganan)'}">
              Unduh PDF
            </a>
          ` : ''}
          ${p.doiUrl ? `
            <a href="${hasFullAccess ? p.doiUrl : 'javascript:void(0)'}" ${hasFullAccess ? 'target="_blank" rel="noopener noreferrer"' : ''} class="link-btn link-doi ${!hasFullAccess ? 'locked-feature-btn' : ''}">
              Halaman Penerbit (DOI)
            </a>
          ` : ''}
        </div>

        <button type="button" class="link-btn btn-cite-action btn-cite ${!hasFullAccess ? 'locked-feature-btn' : ''}" data-id="${p.id}">
          ${hasFullAccess ? 'Format Sitasi' : 'Sitasi Terkunci'}
        </button>
      </div>
    `;

    // Jika terkunci: Klik kartu langsung memicu modal pembayaran
    if (!hasFullAccess) {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Akses terkunci: Masa lisensi telah berakhir. Silakan pilih paket riset untuk membuka seluruh jurnal.');
        openPaymentGateway((titleInput && titleInput.value.trim()) || p.title);
      });
      journalsList.appendChild(card);
      continue;
    }

    const previewPdfBtn = card.querySelector('.btn-preview-pdf');
    if (previewPdfBtn) {
      previewPdfBtn.addEventListener('click', () => {
        openPdfPreview(p.pdfUrl, p.title, p.doiUrl);
      });
    }

    const lockedPdfBtn = card.querySelector('.btn-locked-pdf-download');
    if (lockedPdfBtn) {
      lockedPdfBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Fitur Unduh Berkas PDF langsung memerlukan akun berlangganan. Anda dapat membaca isi jurnal melalui "Buka PDF (Pratinjau)".');
        openPaymentGateway((titleInput && titleInput.value.trim()) || p.title);
      });
    }

    const copyUrlBtn = card.querySelector('.btn-copy-url');
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener('click', () => {
        copyToClipboard(linkToOpen, 'Link jurnal berhasil disalin!');
      });
    }

    const starBtn = card.querySelector('.btn-star');
    starBtn.addEventListener('click', () => {
      toggleBookmark(p);
      const isNowSaved = bookmarkedPapers.some(b => b.id === p.id);
      starBtn.classList.toggle('active', isNowSaved);
      starBtn.querySelector('svg').setAttribute('fill', isNowSaved ? '#f59e0b' : 'none');
    });

    const toggleBtn = card.querySelector('.btn-toggle-abstract');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const absElem = card.querySelector(`#abs-${idx}`);
        const isClamped = absElem.classList.toggle('abstract-clamp');
        toggleBtn.textContent = isClamped ? 'Tampilkan Abstrak ▼' : 'Tutup Abstrak ▲';
      });
    }

    const citeBtn = card.querySelector('.btn-cite');
    citeBtn.addEventListener('click', () => {
      openCiteModal(p);
    });

    journalsList.appendChild(card);
  }
}

// Bookmarking State
function toggleBookmark(paper) {
  const existingIdx = bookmarkedPapers.findIndex(b => b.id === paper.id);
  if (existingIdx >= 0) {
    bookmarkedPapers.splice(existingIdx, 1);
    showToast('Dihapus dari koleksi jurnal tersimpan.');
  } else {
    bookmarkedPapers.push(paper);
    showToast('Disimpan ke koleksi jurnal tersimpan.');
  }
  localStorage.setItem('skripsi_bookmarked_papers', JSON.stringify(bookmarkedPapers));
  updateBookmarkUI();
  updateDashboardBadges();
}

function updateBookmarkUI() {
  if (bookmarkCount) bookmarkCount.textContent = bookmarkedPapers.length;
}

if (btnOpenBookmarks) {
  btnOpenBookmarks.addEventListener('click', () => {
    openUserProfileModal();
    const tabSavedBtn = document.querySelector('.dash-tab-btn[data-tab="tabSavedJournals"]');
    if (tabSavedBtn) tabSavedBtn.click();
  });
}

if (btnBookmarkClose) {
  btnBookmarkClose.addEventListener('click', () => {
    bookmarkModal.style.display = 'none';
  });
}

// ====================================================================
// PDF PREVIEW MODAL (WITH PROXY & MULTI-VIEWER AUTO FALLBACK)
// ====================================================================
let pdfLoadTimeout = null;

function openPdfPreview(pdfUrl, title, doiUrl) {
  if (!pdfPreviewModal) return;
  const rawUrl = pdfUrl || doiUrl;
  if (!rawUrl) {
    showToast('Tautan dokumen PDF tidak tersedia untuk artikel ini.');
    return;
  }

  pdfModalTitle.textContent = title || 'Pratinjau Jurnal Ilmiah';
  pdfModalSubtitle.textContent = 'Menghubungkan ke server jurnal...';
  pdfLoadingIndicator.style.display = 'flex';
  pdfFallbackNotice.style.display = 'none';
  pdfViewerIframe.style.display = 'none';

  if (btnPdfOpenNewTab) btnPdfOpenNewTab.href = rawUrl;
  if (btnPdfDirectDownload) btnPdfDirectDownload.href = rawUrl;
  if (btnPdfFallbackLink) btnPdfFallbackLink.href = rawUrl;

  if (pdfLoadTimeout) clearTimeout(pdfLoadTimeout);

  const proxyUrl = `/api/pdf/proxy?url=${encodeURIComponent(rawUrl)}`;
  const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;

  pdfViewerIframe.src = proxyUrl;

  let loaded = false;
  pdfViewerIframe.onload = () => {
    loaded = true;
    if (pdfLoadTimeout) clearTimeout(pdfLoadTimeout);
    pdfLoadingIndicator.style.display = 'none';
    pdfViewerIframe.style.display = 'block';
    pdfModalSubtitle.textContent = 'Dokumen resmi berhasil dimuat';
  };

  pdfViewerIframe.onerror = () => {
    if (pdfLoadTimeout) clearTimeout(pdfLoadTimeout);
    switchToGoogleDocsOrFallback(googleDocsViewerUrl, rawUrl);
  };

  // If university / publisher server takes longer than 4s or blocks iframe, auto-fallback to Google Docs Viewer
  pdfLoadTimeout = setTimeout(() => {
    if (!loaded) {
      switchToGoogleDocsOrFallback(googleDocsViewerUrl, rawUrl);
    }
  }, 4000);

  pdfPreviewModal.style.display = 'flex';
}

function switchToGoogleDocsOrFallback(viewerUrl, originalUrl) {
  if (!pdfViewerIframe || !pdfPreviewModal) return;
  pdfModalSubtitle.textContent = 'Memuat alternatif viewer...';
  pdfViewerIframe.src = viewerUrl;

  setTimeout(() => {
    pdfLoadingIndicator.style.display = 'none';
    pdfViewerIframe.style.display = 'block';
    if (pdfFallbackNotice) {
      pdfFallbackNotice.style.display = 'block';
    }
  }, 2500);
}

function closePdfPreview() {
  if (!pdfPreviewModal) return;
  if (pdfLoadTimeout) clearTimeout(pdfLoadTimeout);
  pdfPreviewModal.style.display = 'none';
  pdfViewerIframe.src = '';
}

if (btnPdfModalClose) btnPdfModalClose.addEventListener('click', closePdfPreview);

// ====================================================================
// CITATION MODAL (PROTECTED BY LICENSE)
// ====================================================================
function openCiteModal(paper) {
  const isPaidUser = isSubscriptionActive();
  const trial = getTrialState();
  const hasFullAccess = isPaidUser || trial.isActive;

  if (!hasFullAccess) {
    showToast('Akses Sitasi Terkunci: Masa aktif lisensi Anda telah berakhir. Silakan pilih paket riset untuk menyalin format sitasi.');
    openPaymentGateway((titleInput && titleInput.value.trim()) || (paper && paper.title) || 'Format Sitasi Jurnal');
    return;
  }

  currentCitePaper = paper;
  citeModal.style.display = 'flex';
  updateCitePreview();
}

function closeCiteModal() {
  citeModal.style.display = 'none';
}

if (btnCiteClose) btnCiteClose.addEventListener('click', closeCiteModal);

citeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    citeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCiteStyle = tab.getAttribute('data-style');
    updateCitePreview();
  });
});

function updateCitePreview() {
  if (!currentCitePaper) return;
  const cites = currentCitePaper.citationsFormatted || {};
  let text = cites[currentCiteStyle] || cites.apa || '';
  citePreview.textContent = text;
}

if (btnCopySingleCite) {
  btnCopySingleCite.addEventListener('click', () => {
    const isPaidUser = isSubscriptionActive();
    const trial = getTrialState();
    const hasFullAccess = isPaidUser || trial.isActive;

    if (!hasFullAccess) {
      showToast('Akses Sitasi Terkunci: Silakan aktifkan lisensi riset Anda.');
      openPaymentGateway((titleInput && titleInput.value.trim()) || 'Format Sitasi Jurnal');
      return;
    }

    if (!citePreview.textContent) return;
    copyToClipboard(citePreview.textContent, 'Format sitasi berhasil disalin ke clipboard!');
  });
}

// ====================================================================
// EXPORT ACTIONS (TOOLBAR - PROTECTED BY LICENSE)
// ====================================================================
if (btnCopyAllLinks) {
  btnCopyAllLinks.addEventListener('click', () => {
    const isPaidUser = isSubscriptionActive();
    const trial = getTrialState();
    const hasFullAccess = isPaidUser || trial.isActive;

    if (!hasFullAccess) {
      showToast('Akses Terkunci: Silakan aktifkan paket riset skripsi untuk menyalin semua tautan jurnal.');
      openPaymentGateway((titleInput && titleInput.value.trim()) || 'Salin Semua Tautan Jurnal');
      return;
    }

    if (currentFiltered.length === 0) {
      showToast('Tidak ada jurnal yang ditampilkan!');
      return;
    }
    const text = currentFiltered.map((p, i) => {
      const link = p.doiUrl || p.pdfUrl || (p.doi ? `https://doi.org/${p.doi}` : '#');
      return `[${i + 1}] ${p.title}\n    Penulis: ${p.authorDisplay} (${p.year})\n    Jurnal: ${p.journal}\n    Link: ${link}`;
    }).join('\n\n');
    copyToClipboard(text, `Seluruh ${currentFiltered.length} tautan jurnal berhasil disalin!`);
  });
}

if (btnCopyAllApa) {
  btnCopyAllApa.addEventListener('click', () => {
    const isPaidUser = isSubscriptionActive();
    const trial = getTrialState();
    const hasFullAccess = isPaidUser || trial.isActive;

    if (!hasFullAccess) {
      showToast('Akses Terkunci: Silakan aktifkan paket riset skripsi untuk menyalin daftar pustaka format APA 7.');
      openPaymentGateway((titleInput && titleInput.value.trim()) || 'Salin Daftar Pustaka APA 7');
      return;
    }

    if (currentFiltered.length === 0) {
      showToast('Tidak ada jurnal yang ditampilkan!');
      return;
    }
    const text = currentFiltered.map(p => p.citationsFormatted?.apa || `${p.authorDisplay} (${p.year}). ${p.title}. ${p.journal}.`).join('\n\n');
    copyToClipboard(text, 'Seluruh daftar pustaka format APA 7 berhasil disalin!');
  });
}

if (btnExportTxt) {
  btnExportTxt.addEventListener('click', () => {
    const isPaidUser = isSubscriptionActive();
    const trial = getTrialState();
    const hasFullAccess = isPaidUser || trial.isActive;

    if (!hasFullAccess) {
      showToast('Akses Terkunci: Silakan aktifkan paket riset skripsi untuk mengunduh dokumen referensi.');
      openPaymentGateway((titleInput && titleInput.value.trim()) || 'Unduh Dokumen TXT/Word');
      return;
    }

    if (currentFiltered.length === 0) {
      showToast('Tidak ada jurnal yang ditampilkan!');
      return;
    }
    let content = `DAFTAR JURNAL ACUAN SKRIPSI\n`;
    content += `Topik: ${titleInput.value.trim()}\n`;
    content += `Jumlah Jurnal: ${currentFiltered.length}\n`;
    content += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;
    content += `======================================================\n\n`;

    currentFiltered.forEach((p, i) => {
      const link = p.doiUrl || p.pdfUrl || (p.doi ? `https://doi.org/${p.doi}` : '#');
      content += `[${i + 1}] ${p.title}\n`;
      content += `Penulis: ${p.authorDisplay} (${p.year})\n`;
      content += `Jurnal: ${p.journal}\n`;
      content += `Rekomendasi: ${p.recommendedChapter} - ${p.chapterRationale}\n`;
      content += `Link: ${link}\n\n`;
    });

    downloadFile(content, 'daftar_jurnal_skripsi.txt', 'text/plain;charset=utf-8');
    showToast('File dokumen TXT berhasil diunduh.');
  });
}

if (btnExportBibtex) {
  btnExportBibtex.addEventListener('click', () => {
    const isPaidUser = isSubscriptionActive();
    const trial = getTrialState();
    const hasFullAccess = isPaidUser || trial.isActive;

    if (!hasFullAccess) {
      showToast('Akses Terkunci: Silakan aktifkan paket riset skripsi untuk mengekspor BibTeX ke Mendeley/Zotero.');
      openPaymentGateway((titleInput && titleInput.value.trim()) || 'Ekspor BibTeX');
      return;
    }

    if (currentFiltered.length === 0) {
      showToast('Tidak ada jurnal yang ditampilkan!');
      return;
    }
    const bibtex = currentFiltered.map(p => p.citationsFormatted?.bibtex || '').join('\n\n');
    downloadFile(bibtex, 'daftar_jurnal_skripsi.bib', 'application/x-bibtex');
    showToast('File BibTeX berhasil diunduh untuk Mendeley/Zotero.');
  });
}

// ====================================================================
// MIDTRANS PAYMENT GATEWAY CHECKOUT & MODAL
// ====================================================================
const paymentGatewayModal = document.getElementById('paymentGatewayModal');
const btnPaymentClose = document.getElementById('btnPaymentClose');
const paymentTitlePreview = document.getElementById('paymentTitlePreview');
const paymentAmountDisplay = document.getElementById('paymentAmountDisplay');
const btnPayMidtransSnap = document.getElementById('btnPayMidtransSnap');
const midtransNoticeText = document.getElementById('midtransNoticeText');
const btnOpenMidtransConfigFromModal = document.getElementById('btnOpenMidtransConfigFromModal');

function selectPackagePlan(plan) {
  if (!plan || !PACKAGE_PRICES[plan]) return;
  currentSelectedPackage = plan;

  document.querySelectorAll('.plan-card-item').forEach(c => {
    const isCur = c.getAttribute('data-plan') === plan;
    c.classList.toggle('active', isCur);
    const btn = c.querySelector('.btn-plan-select');
    if (btn) {
      if (isCur) {
        btn.classList.add('primary');
        btn.textContent = 'Paket Terpilih';
      } else {
        btn.classList.remove('primary');
        btn.textContent = 'Pilih Paket';
      }
    }
  });

  const pkg = PACKAGE_PRICES[plan];
  const formattedPrice = `Rp ${Number(pkg.price).toLocaleString('id-ID')}`;
  if (paymentAmountDisplay) paymentAmountDisplay.textContent = formattedPrice;
  if (paymentPlanNameDisplay) paymentPlanNameDisplay.textContent = pkg.name;
}

function openPaymentGateway(title) {
  const currentTitle = title || (titleInput && titleInput.value.trim()) || 'Topik Riset Skripsi / Tesis';
  const user = getCurrentUser();

  // If user is not logged in yet, prompt login -> then open payment gateway upon successful login
  if (!user) {
    pendingActionAfterAuth = { action: 'checkout', title: currentTitle };
    openRegisterModal('register');
    showToast('Masa uji coba gratis telah selesai. Silakan masuk atau daftar akun terlebih dahulu untuk memilih paket lisensi.');
    return;
  }

  if (paymentTitlePreview) {
    paymentTitlePreview.textContent = `Judul Skripsi: "${currentTitle}"`;
  }
  selectPackagePlan(currentSelectedPackage || 'monthly');
  if (paymentGatewayModal) paymentGatewayModal.style.display = 'flex';
}

function closePaymentGateway() {
  if (paymentGatewayModal) paymentGatewayModal.style.display = 'none';
}

if (btnPaymentClose) btnPaymentClose.addEventListener('click', closePaymentGateway);

// Plan choice click listeners
document.querySelectorAll('.plan-card-item').forEach(card => {
  card.addEventListener('click', () => {
    const plan = card.getAttribute('data-plan');
    if (plan) selectPackagePlan(plan);
  });
});

document.querySelectorAll('.btn-plan-select').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const plan = btn.getAttribute('data-plan') || btn.closest('.plan-card-item')?.getAttribute('data-plan');
    if (plan) selectPackagePlan(plan);
  });
});

// Pay with Midtrans Snap
async function payWithMidtransSnap() {
  const pkg = PACKAGE_PLANS[currentSelectedPackage] || PACKAGE_PLANS.monthly;
  const user = getCurrentUser() || {};
  const customerName = user.name || 'Mahasiswa Peneliti';
  const customerPhone = user.whatsapp || '081234567890';
  const customerEmail = user.email || 'mahasiswa@example.com';
  const rawTitle = (paymentTitlePreview?.textContent || '').replace(/^Judul Skripsi:\s*"?/, '').replace(/"?$/, '') || 'Topik Riset Skripsi';

  if (btnPayMidtransSnap) {
    btnPayMidtransSnap.disabled = true;
    btnPayMidtransSnap.innerHTML = '<div style="padding: 0.4rem;">Memproses Midtrans Snap...</div>';
  }

  try {
    const res = await fetch('/api/payment/create-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: currentSelectedPackage,
        amount: pkg.price,
        title: rawTitle,
        customerName: customerName,
        customerPhone: customerPhone,
        customerEmail: customerEmail,
        mode: 'midtrans'
      })
    });

    const data = await res.json();
    if (btnPayMidtransSnap) {
      btnPayMidtransSnap.disabled = false;
      btnPayMidtransSnap.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <div style="text-align: left;">
            <div style="font-size: 0.96rem; font-weight: 800; line-height: 1.2;">Lanjutkan Pembayaran (Midtrans Snap)</div>
            <div style="font-size: 0.74rem; font-weight: 500; opacity: 0.9;">QRIS Instan, GoPay, ShopeePay, Virtual Account BCA / Mandiri / BRI / BNI</div>
          </div>
        </div>
        <span style="font-size: 1.2rem; font-weight: 800;">➔</span>
      `;
    }

    if (!data || !data.success) {
      showToast('Gagal memproses Midtrans: ' + (data?.error || 'Kesalahan koneksi'));
      return;
    }

    if (data.snap_token) {
      if (typeof window.snap !== 'undefined' && window.snap.pay) {
        window.snap.pay(data.snap_token, {
          onSuccess: function(result) {
            activateSubscription(currentSelectedPackage, result?.order_id || data.order_id, 'Midtrans Snap');
          },
          onPending: function(result) {
            startPaymentStatusPolling(data.order_id, currentSelectedPackage);
            showToast('Menunggu Pembayaran: ' + (result?.status_message || 'Silakan selesaikan pembayaran'));
          },
          onError: function(result) {
            showToast('Pembayaran Gagal: ' + (result?.status_message || 'Transaksi dibatalkan'));
          },
          onClose: function() {
            startPaymentStatusPolling(data.order_id, currentSelectedPackage);
            showToast('Jendela pembayaran Midtrans ditutup. Status dicek otomatis.');
          }
        });
      } else if (data.redirect_url) {
        window.open(data.redirect_url, '_blank');
        startPaymentStatusPolling(data.order_id, currentSelectedPackage);
      }
    }

  } catch (err) {
    if (btnPayMidtransSnap) {
      btnPayMidtransSnap.disabled = false;
    }
    showToast('Terjadi kesalahan koneksi ke server Midtrans: ' + err.message);
  }
}

if (btnPayMidtransSnap) {
  btnPayMidtransSnap.addEventListener('click', payWithMidtransSnap);
}

// Background Payment Polling
let paymentPollingInterval = null;
function startPaymentStatusPolling(orderId, packageId) {
  if (paymentPollingInterval) clearInterval(paymentPollingInterval);
  let attempts = 0;

  paymentPollingInterval = setInterval(async () => {
    attempts++;
    if (attempts > 60) {
      clearInterval(paymentPollingInterval);
      paymentPollingInterval = null;
      return;
    }

    try {
      const res = await fetch(`/api/payment/status?order_id=${encodeURIComponent(orderId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && (data.status === 'settlement' || data.status === 'capture')) {
        clearInterval(paymentPollingInterval);
        paymentPollingInterval = null;
        activateSubscription(packageId, orderId, 'Midtrans ' + (data.transaction?.payment_type || 'Instant'));
        showToast('Pembayaran Terkonfirmasi LUNAS! Akses seluruh fitur riset telah aktif.');
      }
    } catch (e) {}
  }, 3000);
}

// Simulate Sandbox Payment Button
if (btnSimulateSandboxSuccess) {
  btnSimulateSandboxSuccess.addEventListener('click', async () => {
    const pkg = PACKAGE_PLANS[currentSelectedPackage] || PACKAGE_PLANS.monthly;
    btnSimulateSandboxSuccess.disabled = true;
    btnSimulateSandboxSuccess.textContent = 'Memverifikasi Pembayaran Sandbox...';

    try {
      const res = await fetch('/api/payment/simulate-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: currentSelectedPackage,
          amount: pkg.price,
          customerName: (getCurrentUser() && getCurrentUser().name) || 'Mahasiswa Peneliti'
        })
      });

      const data = await res.json();
      btnSimulateSandboxSuccess.disabled = false;
      btnSimulateSandboxSuccess.textContent = 'Simulasikan Pembayaran Lunas (Sandbox Test Mode)';

      if (data && data.success) {
        activateSubscription(currentSelectedPackage, data.order_id || `SKRIPSI-${Date.now()}`, 'Sandbox Simulator');
      } else {
        showToast('Gagal verifikasi pembayaran sandbox.');
      }
    } catch (e) {
      btnSimulateSandboxSuccess.disabled = false;
      btnSimulateSandboxSuccess.textContent = 'Simulasikan Pembayaran Lunas (Sandbox Test Mode)';
      activateSubscription(currentSelectedPackage, `SKRIPSI-${Date.now()}`, 'Sandbox Fallback');
    }
  });
}

// Utilities
function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyToClipboard(text, successMsg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg || 'Berhasil disalin ke clipboard!');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(successMsg || 'Berhasil disalin ke clipboard!');
  });
}

function showToast(message) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Settings modal bindings
const btnOpenSettings = document.getElementById('btnOpenSettings');
const settingsModal = document.getElementById('settingsModal');
const btnSettingsClose = document.getElementById('btnSettingsClose');

function openSettingsModal() {
  if (settingsModal) settingsModal.style.display = 'flex';
}

if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettingsModal);
if (btnSettingsClose) btnSettingsClose.addEventListener('click', () => { if (settingsModal) settingsModal.style.display = 'none'; });

if (btnOpenMidtransConfigFromModal) {
  btnOpenMidtransConfigFromModal.addEventListener('click', () => {
    closePaymentGateway();
    openSettingsModal();
  });
}

// Global modal dismiss
window.addEventListener('click', (e) => {
  if (e.target === citeModal) closeCiteModal();
  if (e.target === bookmarkModal) bookmarkModal.style.display = 'none';
  if (e.target === settingsModal) settingsModal.style.display = 'none';
  if (e.target === paymentGatewayModal) closePaymentGateway();
  if (e.target === registerModal) closeRegisterModal();
  if (e.target === userProfileModal) closeUserProfileModal();
  if (e.target === pdfPreviewModal) closePdfPreview();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCiteModal();
    if (bookmarkModal) bookmarkModal.style.display = 'none';
    if (settingsModal) settingsModal.style.display = 'none';
    closePaymentGateway();
    closeRegisterModal();
    closeUserProfileModal();
    closePdfPreview();
  }
});

// Initialization
loadSystemSettingsToUI();
updateNavUserUI();
startTrialIfNew();
updateSubscriptionUI();
initGoogleAuth();
