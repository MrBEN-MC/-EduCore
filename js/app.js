/* ======================================================
   app.js — Main Application: Router, Shell, Notifications
   ====================================================== */
var App = (function () {

    var MENUS = {
        owner: [
            { label: 'Dashboard', icon: '📊', hash: 'owner' },
            { label: 'Workers', icon: '👥', hash: 'owner-workers' },
            { label: 'Settings', icon: '⚙️', hash: 'owner-settings' },
            { label: 'Reports', icon: '📈', hash: 'owner-reports' }
        ],
        worker: [
            { label: 'Dashboard', icon: '📊', hash: 'worker' },
            { label: 'Teachers', icon: '👩‍🏫', hash: 'worker-teachers' },
            { label: 'Students', icon: '🎓', hash: 'worker-students' },
            { label: 'Classes', icon: '📚', hash: 'worker-classes' },
            { label: 'Card Markers', icon: '✅', hash: 'worker-cardmarkers' },
            { label: 'Fees', icon: '💰', hash: 'worker-fees' },
            { label: 'Reports', icon: '📈', hash: 'worker-reports' },
            { label: 'Calendar', icon: '📅', hash: 'worker-calendar' }
        ],
        teacher: [
            { label: 'My Classes', icon: '📚', hash: 'teacher' },
            { label: 'Timetable', icon: '🗓️', hash: 'teacher-timetable' },
            { label: 'Exams', icon: '📝', hash: 'teacher-exams' },
            { label: 'Resources', icon: '📎', hash: 'teacher-resources' }
        ],
        'card-marker': [
            { label: 'Dashboard', icon: '📊', hash: 'card-marker' },
            { label: 'Attendance', icon: '✅', hash: 'card-marker-attendance' },
            { label: 'Fee Collection', icon: '💰', hash: 'card-marker-fees' }
        ],
        student: [
            { label: 'Dashboard', icon: '🏠', hash: 'student' },
            { label: 'My Classes', icon: '📚', hash: 'student-classes' },
            { label: 'Payments', icon: '💰', hash: 'student-payments' },
            { label: 'Marks', icon: '📝', hash: 'student-marks' },
            { label: 'Attendance', icon: '✅', hash: 'student-attendance' },
            { label: 'Notes & Tutes', icon: '📎', hash: 'student-resources' },
            { label: 'My Progress', icon: '📈', hash: 'student-progress' },
            { label: 'My Profile', icon: '👤', hash: 'student-profile' }
        ]
    };

    var BREADCRUMBS = {
        'owner': 'Overview', 'owner-workers': 'Workers', 'owner-settings': 'Settings', 'owner-reports': 'Reports',
        'worker': 'Overview', 'worker-teachers': 'Teachers', 'worker-students': 'Students', 'worker-classes': 'Classes',
        'worker-cardmarkers': 'Card Markers', 'worker-fees': 'Fees', 'worker-calendar': 'Calendar',
        'teacher': 'My Classes', 'teacher-timetable': 'Timetable', 'teacher-exams': 'Exams', 'teacher-resources': 'Resources',
        'card-marker': 'Dashboard', 'card-marker-attendance': 'Attendance', 'card-marker-fees': 'Fee Collection',
        'student': 'Dashboard', 'student-classes': 'My Classes', 'student-payments': 'Payments',
        'student-marks': 'My Marks', 'student-attendance': 'Attendance', 'student-resources': 'Notes & Tutes', 'student-progress': 'My Progress'
    };

    // ── Demo Seed (runs only if no institution exists) ──
    function seedDemo() {
        if (DB.getInstitution()) return; // already set up
        // Create demo institution
        DB.saveInstitution({
            id: Utils.genId(),
            name: '1 Academy',
            type: 'tuition',
            address: '123 Main Street',
            phone: '0771234567',
            email: 'info@1academy.com',
            createdAt: new Date().toISOString()
        });
        // Create demo owner account
        DB.addUser({
            id: Utils.genId(),
            role: 'owner',
            name: 'Admin Owner',
            email: 'admin@1academy.com',
            phone: '0771234567',
            passwordHash: Utils.hashPwd('admin123'),
            status: 'active',
            createdAt: new Date().toISOString()
        });
        // Seed default subjects
        ['Mathematics', 'Science', 'English', 'History', 'Physics', 'Chemistry', 'Biology', 'ICT'].forEach(function (sub) {
            DB.addSubject({ id: Utils.genId(), name: sub, code: sub.substring(0, 3).toUpperCase() });
        });
    }

    function init() {
        setTimeout(function () {
            document.getElementById('loading-screen').style.display = 'none';

            seedDemo(); // auto-create demo account if fresh install

            // Check if institution exists
            if (!DB.getInstitution()) {
                window.location.hash = '#register';
            } else if (!Auth.isLoggedIn()) {
                window.location.hash = '#login';
            } else {
                var h = window.location.hash.replace('#', '') || getDefaultHash();
                navigate(h);
            }
            window.addEventListener('hashchange', onHashChange);
        }, 1800);
    }

    function onHashChange() {
        var h = window.location.hash.replace('#', '');
        if (h === 'register') { RegisterPage.render(); return; }
        if (h === 'login') { renderLogin(); return; }
        if (!Auth.isLoggedIn()) { renderLogin(); return; }
        var user = Auth.currentUser();
        showDashboard(user);
        routePage(h, user);
    }

    function getDefaultHash() {
        var u = Auth.currentUser();
        if (!u) return 'login';
        return u.role === 'card-marker' ? 'card-marker' : u.role;
    }

    function navigate(h) {
        window.location.hash = '#' + h;
    }

    // ── Login ──
    function renderLogin() {
        document.getElementById('dashboard-container').classList.add('hidden');
        document.getElementById('auth-container').classList.remove('hidden');
        var inst = DB.getInstitution();
        document.getElementById('auth-content').innerHTML =
            '<div class="auth-bg"><div class="auth-card">' +
            '<div class="auth-logo"><span class="logo-big">🎓</span><h1>EduCore</h1>' +
            '<p>' + (inst ? Utils.escHtml(inst.name) : 'Tuition Management System') + '</p></div>' +
            '<div class="form-group"><label class="form-label">Email Address</label>' +
            '<input class="form-control" id="l-email" type="email" placeholder="your@email.com"></div>' +
            '<div class="form-group"><label class="form-label">Password</label>' +
            '<input class="form-control" id="l-pwd" type="password" placeholder="••••••••" onkeydown="if(event.key===\'Enter\')App.doLogin()"></div>' +
            '<button class="btn btn-primary w-full" style="justify-content:center;margin-top:8px" onclick="App.doLogin()">🔑 Sign In</button>' +
            '<p style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-3)">Default password for new accounts: <strong>educore123</strong></p>' +
            '</div></div>';
    }

    function doLogin() {
        var email = document.getElementById('l-email').value;
        var pwd = document.getElementById('l-pwd').value;
        if (!email || !pwd) { toast('Please enter email and password', 'danger'); return; }
        var user = Auth.login(email, pwd);
        if (!user) { toast('Invalid email or password', 'danger'); return; }
        toast('Welcome back, ' + user.name + '!', 'success');
        navigate(user.role === 'card-marker' ? 'card-marker' : user.role);
    }

    // ── Dashboard Shell ──
    function showDashboard(user) {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');

        var inst = DB.getInstitution();
        if (inst) document.getElementById('inst-name-short').textContent = inst.name;
        document.getElementById('user-name-display').textContent = user.name;
        document.getElementById('user-role-display').textContent = Utils.capitalize(user.role.replace('-', ' '));
        document.getElementById('user-avatar-display').textContent = user.name.charAt(0).toUpperCase();

        buildNav(user.role);
        refreshNotifBadge(user.id);
    }

    function buildNav(role) {
        var items = MENUS[role] || [];
        var active = window.location.hash.replace('#', '');
        var html = items.map(function (item) {
            return '<div class="nav-item' + (active === item.hash ? ' active' : '') + '" onclick="App.navigate(\'' + item.hash + '\')">' +
                '<span class="nav-icon">' + item.icon + '</span>' + Utils.escHtml(item.label) + '</div>';
        }).join('');
        document.getElementById('sidebar-nav').innerHTML = html;
    }

    // ── Routing ──
    function routePage(h, user) {
        document.getElementById('breadcrumb').textContent = BREADCRUMBS[h] || 'Dashboard';
        buildNav(user.role);

        if (h.startsWith('owner')) { OwnerPage.render(h); return; }
        if (h.startsWith('worker')) { WorkerPage.render(h); return; }
        if (h.startsWith('teacher')) { TeacherPage.render(h); return; }
        if (h.startsWith('card-marker')) { CardMarkerPage.render(h); return; }
        if (h.startsWith('student')) { StudentPage.render(h); return; }
    }

    // ── Sidebar ──
    function toggleSidebar() {
        var sb = document.getElementById('sidebar');
        var ov = document.getElementById('sidebar-overlay');
        sb.classList.toggle('open');
        ov.classList.toggle('hidden');
    }
    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.add('hidden');
    }

    // ── Notifications ──
    var notifOpen = false;
    function toggleNotif() {
        notifOpen = !notifOpen;
        var panel = document.getElementById('notif-panel');
        if (notifOpen) { panel.classList.remove('hidden'); renderNotifs(); }
        else panel.classList.add('hidden');
        document.removeEventListener('click', closeNotifOutside);
        if (notifOpen) setTimeout(function () { document.addEventListener('click', closeNotifOutside); }, 50);
    }
    function closeNotifOutside(e) { if (!document.querySelector('.notif-wrap').contains(e)) { notifOpen = false; document.getElementById('notif-panel').classList.add('hidden'); document.removeEventListener('click', closeNotifOutside); } }
    function renderNotifs() {
        var user = Auth.currentUser();
        var list = DB.notifsByUser(user.id).slice(0, 20);
        var el = document.getElementById('notif-list');
        if (!list.length) { el.innerHTML = '<div class="notif-empty">No notifications</div>'; return; }
        el.innerHTML = list.map(function (n) {
            return '<div class="notif-item' + (n.isRead ? '' : ' unread') + '" onclick="App.readNotif(\'' + n.id + '\')">' +
                '<div class="notif-msg">' + Utils.escHtml(n.message) + '</div>' +
                '<div class="notif-time">' + Utils.timeAgo(n.createdAt) + '</div>' +
                '</div>';
        }).join('');
    }
    function readNotif(id) { DB.markNotifRead(id); renderNotifs(); refreshNotifBadge(Auth.currentUser().id); }
    function markAllRead() { DB.markAllNotifsRead(); renderNotifs(); refreshNotifBadge(Auth.currentUser().id); }
    function refreshNotifBadge(uid) {
        var c = DB.unreadCount(uid);
        var badge = document.getElementById('notif-count');
        badge.textContent = c;
        c > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');
    }
    function pushNotif(userId, message) { DB.addNotification({ userId, message }); refreshNotifBadge(userId); }

    // ── Global Search ──
    function globalSearch(q) { /* Basic — just filter visible table if present */ }

    // ── Modal ──
    function openModal(title, bodyHtml, footerHtml) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        var footer = document.getElementById('modal-footer');
        if (footerHtml) { footer.innerHTML = footerHtml; footer.classList.remove('hidden'); }
        else footer.classList.add('hidden');
        document.getElementById('modal-overlay').classList.remove('hidden');
    }
    function closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('modal-body').innerHTML = '';
    }

    // ── Toast ──
    function toast(msg, type) {
        type = type || 'info';
        var icons = { success: '✅', danger: '❌', warning: '⚠️', info: 'ℹ️' };
        var t = document.createElement('div');
        t.className = 'toast ' + type;
        t.innerHTML = '<span>' + icons[type] + '</span><span>' + Utils.escHtml(msg) + '</span>';
        document.getElementById('toast-container').appendChild(t);
        setTimeout(function () {
            t.style.animation = 'toastOut .3s ease forwards';
            setTimeout(function () { t.remove(); }, 350);
        }, 3500);
    }

    // ── Confirm ──
    function confirm(msg, onYes) {
        openModal('Confirm Action',
            '<p style="color:var(--text-2)">' + Utils.escHtml(msg) + '</p>',
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-danger" onclick="App.closeModal();(' + onYes + ')()">Confirm</button>'
        );
    }

    return {
        init, navigate, doLogin, renderLogin,
        toggleSidebar, closeSidebar,
        toggleNotif, readNotif, markAllRead, refreshNotifBadge, pushNotif,
        globalSearch,
        openModal, closeModal, toast, confirm
    };
})();

// ── Bootstrap ──
window.addEventListener('DOMContentLoaded', function () {
    // Handle hash on load
    var h = window.location.hash.replace('#', '');
    if (h === 'register') { RegisterPage.render(); return; }
    App.init();
});
