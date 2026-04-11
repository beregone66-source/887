import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQgAH6vMMe2JsKe0adZ9lOgzJ7VS-3_l0",
  authDomain: "asta-d7e4e.firebaseapp.com",
  projectId: "asta-d7e4e",
  storageBucket: "asta-d7e4e.firebasestorage.app",
  messagingSenderId: "845479746428",
  appId: "1:845479746428:web:f72de165fa64d020ab22f9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SESSION_KEY = 'bioschedule_session_v1';

const defaultData = {
  joinCode: 'BIO-LIFE-2026',
  schedule: [
    { id: 1, title: 'أحياء الخلية', day: 'الأحد', time: '09:00 - 10:30', location: 'قاعة 3', type: 'نظري' },
    { id: 2, title: 'علم النبات', day: 'الاثنين', time: '10:30 - 12:00', location: 'قاعة 5', type: 'عملي' },
    { id: 3, title: 'مختبر الأحياء المجهرية', day: 'الثلاثاء', time: '11:00 - 12:30', location: 'مختبر 2', type: 'مختبر' },
    { id: 4, title: 'الوراثة', day: 'الأربعاء', time: '08:30 - 10:00', location: 'قاعة 1', type: 'نظري' }
  ],
  materials: [],
  labs: [
    {
      id: 1,
      course: 'مختبر الأحياء المجهرية',
      title: 'تحضير شريحة وفحص بكتيري',
      date: '2026-04-11',
      requirements: 'قفازات، دفتر مختبر، شريحة زجاجية، تقرير مختصر قبل الدخول.',
      attachment: 'https://example.com/lab-report.pdf'
    },
    {
      id: 2,
      course: 'علم النبات',
      title: 'تشريح ساق النبات',
      date: '2026-04-14',
      requirements: 'مشرط، عدسة، دفتر ملاحظات، صورة للنموذج العملي.',
      attachment: 'https://example.com/botany-lab.pdf'
    }
  ],
  tasks: [
    {
      id: 1,
      title: 'تقرير مختبر البكتريا',
      course: 'مختبر الأحياء المجهرية',
      deadline: '2026-04-12',
      details: 'كتابة النتائج، الصور المجهرية، والمناقشة العلمية بحدود صفحتين.'
    },
    {
      id: 2,
      title: 'واجب علم النبات',
      course: 'علم النبات',
      deadline: '2026-04-16',
      details: 'حل الأسئلة من الفصل الثالث وتحضير ملخص قصير عن أنواع الأنسجة النباتية.'
    }
  ]
};

const state = {
  data: structuredClone(defaultData),
  session: loadSession(),
  activeTab: 'home'
};

const els = {
  body: document.body,
  loginView: document.getElementById('loginView'),
  appView: document.getElementById('appView'),
  bottomNav: document.getElementById('bottomNav'),
  loginForm: document.getElementById('loginForm'),
  logoutBtn: document.getElementById('logoutBtn'),
  joinCodeBtn: document.getElementById('joinCodeBtn'),
  themeToggle: document.getElementById('themeToggle'),
  seedBtn: document.getElementById('seedBtn'),
  clearBtn: document.getElementById('clearBtn'),
  toast: document.getElementById('toast'),
  welcomeTitle: document.getElementById('welcomeTitle'),
  welcomeSub: document.getElementById('welcomeSub'),
  metricLectures: document.getElementById('metricLectures'),
  metricLabs: document.getElementById('metricLabs'),
  metricTasks: document.getElementById('metricTasks'),
  metricCommitment: document.getElementById('metricCommitment'),
  overviewCards: document.getElementById('overviewCards'),
  alertsList: document.getElementById('alertsList'),
  scheduleGrid: document.getElementById('scheduleGrid'),
  materialsList: document.getElementById('materialsList'),
  labsList: document.getElementById('labsList'),
  tasksList: document.getElementById('tasksList'),
  statsGrid: document.getElementById('statsGrid'),
  adminOverview: document.getElementById('adminOverview'),
  accountCard: document.getElementById('accountCard'),
  scheduleForm: document.getElementById('scheduleForm'),
  materialForm: document.getElementById('materialForm'),
  labForm: document.getElementById('labForm'),
  taskForm: document.getElementById('taskForm'),
  networkStatus: document.getElementById('networkStatus')
};

const roles = {
  student: { label: 'طالب', icon: 'fa-user-graduate' },
  teacher: { label: 'أستاذ جامعي', icon: 'fa-chalkboard-user' },
  representative: { label: 'ممثل الشعبة', icon: 'fa-users-gear' },
  admin: { label: 'الادارة', icon: 'fa-user-shield' }
};

localforage.config({ name: 'BioSchedule_DB' });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installModalOverlay').classList.add('active');
});

document.getElementById('installBtn').addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('installModalOverlay').classList.remove('active');
    }
    deferredPrompt = null;
  }
});

async function init() {
  bindEvents();
  applySavedTheme();
  await loadLocalData();
  updateAppState();
  checkNetworkStatus();
}

window.addEventListener('online', () => {
  els.networkStatus.className = 'network-status online';
  els.networkStatus.innerHTML = '<i class="fa-solid fa-wifi"></i> متصل';
  syncData();
});

window.addEventListener('offline', () => {
  els.networkStatus.className = 'network-status offline';
  els.networkStatus.innerHTML = '<i class="fa-solid fa-plane-slash"></i> غير متصل';
});

function checkNetworkStatus() {
  if (navigator.onLine) {
    els.networkStatus.className = 'network-status online';
    els.networkStatus.innerHTML = '<i class="fa-solid fa-wifi"></i> متصل';
    syncData();
  } else {
    els.networkStatus.className = 'network-status offline';
    els.networkStatus.innerHTML = '<i class="fa-solid fa-plane-slash"></i> غير متصل';
  }
}

async function loadLocalData() {
  const localData = await localforage.getItem('appData');
  if (localData) {
    state.data = localData;
  } else {
    state.data = structuredClone(defaultData);
    await localforage.setItem('appData', state.data);
  }
}

async function enqueueSyncOperation(action, collectionName, item) {
  const queue = await localforage.getItem('syncQueue') || [];
  queue.push({ action, collectionName, item, timestamp: Date.now() });
  await localforage.setItem('syncQueue', queue);
  if (navigator.onLine) syncData();
}

async function syncData() {
  els.networkStatus.className = 'network-status syncing';
  els.networkStatus.innerHTML = '<i class="fa-solid fa-rotate"></i> جاري المزامنة...';
  
  try {
    const queue = await localforage.getItem('syncQueue') || [];
    
    for (const op of queue) {
      const docRef = doc(db, op.collectionName, op.item.id.toString());
      if (op.action === 'add' || op.action === 'edit') {
        await setDoc(docRef, op.item);
      } else if (op.action === 'delete') {
        await deleteDoc(docRef);
      }
    }
    await localforage.setItem('syncQueue', []);

    const collectionsToFetch = ['schedule', 'materials', 'labs', 'tasks'];
    for (const collName of collectionsToFetch) {
      const querySnapshot = await getDocs(collection(db, collName));
      const fetchedItems = [];
      querySnapshot.forEach((doc) => {
        fetchedItems.push(doc.data());
      });
      if (fetchedItems.length > 0) {
        state.data[collName] = fetchedItems.sort((a,b) => b.id - a.id);
      }
    }
    await localforage.setItem('appData', state.data);
    renderAll();
    
    els.networkStatus.className = 'network-status online';
    els.networkStatus.innerHTML = '<i class="fa-solid fa-check"></i> تمت المزامنة';
    setTimeout(() => {
      els.networkStatus.innerHTML = '<i class="fa-solid fa-wifi"></i> متصل';
    }, 3000);
  } catch (error) {
    els.networkStatus.className = 'network-status offline';
    els.networkStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> خطأ مزامنة';
  }
}

function bindEvents() {
  els.loginForm.addEventListener('submit', handleLogin);
  els.logoutBtn.addEventListener('click', logout);
  els.joinCodeBtn.addEventListener('click', () => showToast(`رمز الشعبة: ${state.data.joinCode}`));
  els.themeToggle.addEventListener('click', toggleTheme);
  els.seedBtn.addEventListener('click', reseedData);
  els.clearBtn.addEventListener('click', clearData);

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('showAddMaterialFormBtn')?.addEventListener('click', () => {
    document.getElementById('materialFormContainer').classList.remove('hidden');
    els.materialForm.reset();
    document.getElementById('materialIdInput').value = '';
  });

  els.scheduleForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const item = {
      id: Date.now(),
      title: form.get('title'),
      day: form.get('day'),
      time: form.get('time'),
      location: form.get('location'),
      type: form.get('type')
    };
    state.data.schedule.unshift(item);
    await localforage.setItem('appData', state.data);
    await enqueueSyncOperation('add', 'schedule', item);
    e.target.reset();
    renderAll();
    showToast('تمت إضافة المحاضرة بنجاح');
  });

  els.materialForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const id = form.get('materialId');
    const matData = {
      id: id ? parseInt(id) : Date.now(),
      title: form.get('title'),
      teacher: form.get('teacher'),
      description: form.get('description'),
      pdf: form.get('pdf'),
      video: form.get('video'),
      type: form.get('materialType')
    };

    if (id) {
      const index = state.data.materials.findIndex(m => m.id === parseInt(id));
      if (index > -1) state.data.materials[index] = matData;
      await localforage.setItem('appData', state.data);
      await enqueueSyncOperation('edit', 'materials', matData);
      showToast('تم تعديل المادة بنجاح');
    } else {
      state.data.materials.unshift(matData);
      await localforage.setItem('appData', state.data);
      await enqueueSyncOperation('add', 'materials', matData);
      showToast('تم حفظ المادة والمحتوى');
    }

    e.target.reset();
    document.getElementById('materialIdInput').value = '';
    document.getElementById('materialFormContainer').classList.add('hidden');
    renderAll();
  });

  els.labForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const item = {
      id: Date.now(),
      course: form.get('course'),
      title: form.get('title'),
      date: form.get('date'),
      requirements: form.get('requirements'),
      attachment: form.get('attachment')
    };
    state.data.labs.unshift(item);
    await localforage.setItem('appData', state.data);
    await enqueueSyncOperation('add', 'labs', item);
    e.target.reset();
    renderAll();
    showToast('تمت إضافة المختبر');
  });

  els.taskForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const item = {
      id: Date.now(),
      title: form.get('title'),
      course: form.get('course'),
      deadline: form.get('deadline'),
      details: form.get('details')
    };
    state.data.tasks.unshift(item);
    await localforage.setItem('appData', state.data);
    await enqueueSyncOperation('add', 'tasks', item);
    e.target.reset();
    renderAll();
    showToast('تمت إضافة المهمة');
  });
}

function handleLogin(e) {
  e.preventDefault();
  const name = document.getElementById('nameInput').value.trim();
  const email = document.getElementById('emailInput').value.trim();
  const roleEl = document.querySelector('input[name="roleInput"]:checked');
  const role = roleEl ? roleEl.value : 'student';
  const department = document.getElementById('departmentInput').value;

  if (!isAcademicEmail(email)) {
    showToast('يرجى إدخال إيميل جامعي صحيح للتجربة');
    return;
  }

  state.session = { name, email, role, department };
  persistSession();
  updateAppState();
  showToast(`أهلاً ${name}، تم تسجيل الدخول بنجاح`);
}

function logout() {
  state.session = null;
  localStorage.removeItem(SESSION_KEY);
  updateAppState();
  showToast('تم تسجيل الخروج');
}

function updateAppState() {
  const loggedIn = !!state.session;
  els.loginView.classList.toggle('active', !loggedIn);
  els.appView.classList.toggle('active', loggedIn);
  els.bottomNav.classList.toggle('hidden', !loggedIn);

  if (loggedIn) {
    switchTab(state.activeTab);
    renderAll();
  }
}

function renderAll() {
  const user = state.session;
  if (!user) return;

  const roleInfo = roles[user.role];
  els.welcomeTitle.textContent = `أهلاً ${user.name}`;
  els.welcomeSub.innerHTML = `${roleInfo.label} • ${user.department} <span class="role-stamp"><i class="fa-solid ${roleInfo.icon}"></i> ${roleInfo.label}</span>`;

  const tasks = state.data.tasks;
  const labs = upcomingLabs();
  const lectures = state.data.schedule.length;
  const commitment = computeCommitment();

  els.metricLectures.textContent = String(lectures);
  els.metricLabs.textContent = String(labs.length);
  els.metricTasks.textContent = String(tasks.length);
  els.metricCommitment.textContent = `${commitment}%`;

  renderOverview();
  renderAlerts();
  renderSchedule();
  renderMaterials();
  renderLabs();
  renderTasks();
  renderStats();
  renderAdminOverview();
  renderAccount();
  applyRoleVisibility();
}

function renderOverview() {
  const cards = [
    { icon: 'fa-qrcode', title: 'رمز الشعبة', value: state.data.joinCode, note: 'لربط الطلبة بالشعبة' },
    { icon: 'fa-user-group', title: 'نوع الدخول', value: roles[state.session.role].label, note: 'صلاحية المستخدم الحالية' },
    { icon: 'fa-building-columns', title: 'القسم', value: state.session.department, note: 'القسم المرتبط بالحساب' },
    { icon: 'fa-bell', title: 'التذكيرات', value: `${buildAlerts().length} تنبيه`, note: 'داخل التطبيق' }
  ];

  els.overviewCards.innerHTML = cards.map(card => `
    <div class="card-item">
      <div class="badge"><i class="fa-solid ${card.icon}"></i> ${card.title}</div>
      <h4>${card.value}</h4>
      <div class="muted">${card.note}</div>
    </div>
  `).join('');
}

function renderAlerts() {
  const alerts = buildAlerts();
  els.alertsList.innerHTML = alerts.map(alert => `
    <div class="alert-item">
      <div class="badge ${alert.level}"><i class="fa-solid ${alert.icon}"></i> ${alert.type}</div>
      <h4>${alert.title}</h4>
      <div class="muted">${alert.text}</div>
    </div>
  `).join('') || '<div class="alert-item"><h4>لا توجد تنبيهات حالياً</h4><div class="muted">كل الأمور مرتبة في الوقت الحالي.</div></div>';
}

function renderSchedule() {
  els.scheduleGrid.innerHTML = state.data.schedule.map(item => `
    <div class="schedule-item">
      <div class="badge"><i class="fa-solid fa-book"></i> ${item.type}</div>
      <h4>${item.title}</h4>
      <div class="muted">${item.day} • ${item.time}</div>
      <div class="muted">${item.location}</div>
    </div>
  `).join('');
}

function renderMaterials() {
  const isAdminOrTeacher = ['teacher', 'admin'].includes(state.session.role);
  els.materialsList.innerHTML = state.data.materials.map(item => `
    <div class="card-item">
      <div class="badges">
        <span class="badge"><i class="fa-solid fa-book-open"></i> ${item.teacher}</span>
        <span class="badge info"><i class="fa-solid fa-layer-group"></i> ${item.type || 'نظري'}</span>
      </div>
      <h4>${item.title}</h4>
      <div class="muted">${item.description}</div>
      <div class="item-actions">
        ${item.pdf ? `<a class="link-btn" href="${item.pdf}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> PDF</a>` : ''}
        ${item.video ? `<a class="link-btn" href="${item.video}" target="_blank" rel="noopener"><i class="fa-brands fa-youtube"></i> فيديو</a>` : ''}
        ${isAdminOrTeacher ? `
          <button class="secondary-btn" onclick="window.editMaterial(${item.id})" style="padding: 6px 12px; min-height: auto; font-size: 0.85rem;"><i class="fa-solid fa-pen"></i> تعديل</button>
          <button class="danger-btn" onclick="window.deleteMaterial(${item.id})" style="padding: 6px 12px; min-height: auto; font-size: 0.85rem;"><i class="fa-solid fa-trash"></i> حذف</button>
        ` : ''}
      </div>
    </div>
  `).join('') || '<div class="muted" style="padding: 20px 0;">لا توجد مواد دراسية حالياً.</div>';
}

function renderLabs() {
  els.labsList.innerHTML = state.data.labs.map(item => {
    const days = daysLeft(item.date);
    return `
      <div class="lab-item">
        <div class="badges">
          <span class="badge"><i class="fa-solid fa-vials"></i> ${item.course}</span>
          <span class="badge ${days <= 2 ? 'urgent' : days <= 5 ? 'warn' : 'ok'}"><i class="fa-solid fa-calendar-day"></i> ${formatDays(days)}</span>
        </div>
        <h4>${item.title}</h4>
        <div class="muted">الموعد: ${formatDate(item.date)}</div>
        <div class="muted">المواد المطلوبة: ${item.requirements}</div>
        ${item.attachment ? `<div class="item-actions"><a class="link-btn" href="${item.attachment}" target="_blank" rel="noopener"><i class="fa-solid fa-paperclip"></i> فتح المرفق</a></div>` : ''}
      </div>
    `;
  }).join('');
}

function renderTasks() {
  els.tasksList.innerHTML = state.data.tasks.map(task => {
    const days = daysLeft(task.deadline);
    return `
      <div class="task-item">
        <div class="badges">
          <span class="badge"><i class="fa-solid fa-book"></i> ${task.course}</span>
          <span class="badge ${days <= 2 ? 'urgent' : days <= 5 ? 'warn' : 'ok'}"><i class="fa-solid fa-hourglass-half"></i> ${formatDays(days)}</span>
        </div>
        <h4>${task.title}</h4>
        <div class="muted">موعد التسليم: ${formatDate(task.deadline)}</div>
        <div class="muted">${task.details}</div>
      </div>
    `;
  }).join('');
}

function renderStats() {
  const stats = [
    { title: 'نسبة الالتزام', value: `${computeCommitment()}%`, icon: 'fa-chart-line' },
    { title: 'إجمالي المواد', value: state.data.materials.length, icon: 'fa-book-bookmark' },
    { title: 'المختبرات القريبة', value: upcomingLabs().length, icon: 'fa-flask' },
    { title: 'المهام الحالية', value: state.data.tasks.length, icon: 'fa-list-check' }
  ];

  els.statsGrid.innerHTML = stats.map(stat => `
    <div class="stat-tile">
      <div class="badge"><i class="fa-solid ${stat.icon}"></i> ${stat.title}</div>
      <h4>${stat.value}</h4>
      <div class="muted">إحصائية مرئية داخل النظام</div>
    </div>
  `).join('');
}

function renderAdminOverview() {
  const items = [
    { title: 'إدارة المستخدمين', text: 'إمكانية ربط الطلاب بالإيميلات الجامعية وصلاحيات متعددة.' },
    { title: 'إدارة الجدول', text: 'التحكم بالمحاضرات وتحديثها على مستوى الشعبة أو القسم.' },
    { title: 'إدارة المحتوى', text: 'رفع ملفات وروابط فيديو ووصف علمي لكل مادة.' },
    { title: 'الربط بالشعبة', text: `رمز الانضمام الحالي: ${state.data.joinCode}` }
  ];

  els.adminOverview.innerHTML = items.map(item => `
    <div class="admin-item">
      <h4>${item.title}</h4>
      <div class="muted">${item.text}</div>
    </div>
  `).join('');
}

function renderAccount() {
  const user = state.session;
  const roleInfo = roles[user.role];
  els.accountCard.innerHTML = `
    <div class="profile-top">
      <div class="avatar"><i class="fa-solid ${roleInfo.icon}"></i></div>
      <div>
        <h3>${user.name}</h3>
        <div class="muted">${user.email}</div>
      </div>
    </div>
    <div class="profile-tiles">
      <div class="profile-tile"><strong>الصلاحية</strong><div class="muted">${roleInfo.label}</div></div>
      <div class="profile-tile"><strong>القسم</strong><div class="muted">${user.department}</div></div>
      <div class="profile-tile"><strong>الجدول</strong><div class="muted">${state.data.schedule.length} محاضرة</div></div>
      <div class="profile-tile"><strong>رمز الشعبة</strong><div class="muted">${state.data.joinCode}</div></div>
    </div>
  `;
}

function buildAlerts() {
  const alerts = [];

  state.data.tasks.forEach(task => {
    const days = daysLeft(task.deadline);
    if (days <= 5) {
      alerts.push({
        type: 'مهمة قريبة',
        title: task.title,
        text: `متبقي ${formatDays(days)} لتسليم ${task.course}`,
        icon: 'fa-list-check',
        level: days <= 2 ? 'urgent' : 'warn'
      });
    }
  });

  state.data.labs.forEach(lab => {
    const days = daysLeft(lab.date);
    if (days <= 3) {
      alerts.push({
        type: 'مختبر قريب',
        title: lab.title,
        text: `المختبر في ${formatDate(lab.date)}، جهز المواد المطلوبة مسبقاً.`,
        icon: 'fa-flask-vial',
        level: days <= 1 ? 'urgent' : 'ok'
      });
    }
  });

  return alerts.slice(0, 6);
}

function upcomingLabs() {
  return state.data.labs.filter(lab => daysLeft(lab.date) >= 0 && daysLeft(lab.date) <= 7);
}

function computeCommitment() {
  const total = state.data.tasks.length + state.data.labs.length + state.data.schedule.length;
  const baseline = Math.max(total, 1);
  return Math.min(100, Math.round((baseline / (baseline + 2)) * 100));
}

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === `tab-${tab}`));
}

function applyRoleVisibility() {
  const role = state.session.role;
  document.querySelectorAll('.role-admin-only').forEach(el => {
    el.classList.toggle('hidden', role !== 'admin');
  });
  document.querySelectorAll('.role-teacher-only').forEach(el => {
    el.classList.toggle('hidden', !['teacher', 'admin'].includes(role));
  });
  document.querySelectorAll('.role-representative-only').forEach(el => {
    el.classList.toggle('hidden', !['representative', 'admin'].includes(role));
  });
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2400);
}

function isAcademicEmail(email) {
  const lower = email.toLowerCase();
  return lower.includes('university') || lower.endsWith('.edu') || lower.includes('.edu.');
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
}

async function reseedData() {
  state.data = structuredClone(defaultData);
  await localforage.setItem('appData', state.data);
  renderAll();
  showToast('تمت إعادة تحميل البيانات التجريبية');
}

async function clearData() {
  await localforage.removeItem('appData');
  await localforage.removeItem('syncQueue');
  localStorage.removeItem(SESSION_KEY);
  state.data = structuredClone(defaultData);
  state.session = null;
  updateAppState();
  showToast('تم حذف البيانات المحلية');
}

function toggleTheme() {
  els.body.classList.toggle('light');
  const isLight = els.body.classList.contains('light');
  localStorage.setItem('bioschedule_theme', isLight ? 'light' : 'dark');
  els.themeToggle.innerHTML = `<i class="fa-solid ${isLight ? 'fa-sun' : 'fa-moon'}"></i>`;
}

function applySavedTheme() {
  const theme = localStorage.getItem('bioschedule_theme');
  if (theme === 'light') {
    els.body.classList.add('light');
    els.themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }
}

function daysLeft(dateString) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(dateString);
  target.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86400000);
}

function formatDays(days) {
  if (days < 0) return 'منتهي';
  if (days === 0) return 'اليوم';
  if (days === 1) return 'باقي يوم';
  return `باقي ${days} أيام`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' });
}

window.editMaterial = function(id) {
  const item = state.data.materials.find(m => m.id === id);
  if (!item) return;
  document.getElementById('materialIdInput').value = item.id;
  els.materialForm.elements['title'].value = item.title;
  els.materialForm.elements['teacher'].value = item.teacher;
  els.materialForm.elements['description'].value = item.description;
  els.materialForm.elements['pdf'].value = item.pdf || '';
  els.materialForm.elements['video'].value = item.video || '';
  els.materialForm.elements['materialType'].value = item.type || 'نظري';
  
  document.getElementById('materialFormContainer').classList.remove('hidden');
  switchTab('materials');
  els.materialForm.scrollIntoView({behavior: 'smooth'});
};

window.deleteMaterial = async function(id) {
  if(confirm('هل أنت متأكد من حذف هذه المادة؟')) {
    const itemToDelete = state.data.materials.find(m => m.id === id);
    state.data.materials = state.data.materials.filter(m => m.id !== id);
    await localforage.setItem('appData', state.data);
    await enqueueSyncOperation('delete', 'materials', itemToDelete);
    renderAll();
    showToast('تم حذف المادة');
  }
};

window.cancelMaterialEdit = function() {
  document.getElementById('materialFormContainer').classList.add('hidden');
  els.materialForm.reset();
  document.getElementById('materialIdInput').value = '';
};

init();
