/* ======================================================
   owner.js — Owner Dashboard
   ====================================================== */
var OwnerPage = (function () {

    function render(h) {
        if (h === 'owner-workers') return workers();
        if (h === 'owner-settings') return settings();
        if (h === 'owner-reports') return reports();
        return overview();
    }

    // ── Overview ──
    function overview() {
        var students = DB.usersByRole('student').length;
        var teachers = DB.usersByRole('teacher').length;
        var workers = DB.usersByRole('worker').length;
        var classes = DB.getClasses().length;
        var fees = DB.getFeeCollections().reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);
        var inst = DB.getInstitution();

        document.getElementById('page-content').innerHTML =
            '<div class="page-header">' +
            '<div><h1 class="page-title">Welcome, ' + Utils.escHtml(Auth.currentUser().name) + '</h1>' +
            '<div class="page-sub">' + Utils.escHtml(inst ? inst.name : 'Institution') + '</div></div>' +
            '</div>' +
            '<div class="stats-grid">' +
            statCard('👨‍🎓', 'Students', students, 'c-primary') +
            statCard('👩‍🏫', 'Teachers', teachers, 'c-success') +
            statCard('👥', 'Workers', workers, 'c-info') +
            statCard('📚', 'Classes', classes, 'c-warning') +
            statCard('💰', 'Total Revenue', Utils.fmtMoney(fees), 'c-danger') +
            '</div>' +
            '<div class="grid-2">' +
            '<div class="card"><div class="card-header"><h3 class="card-title">Recent Activity</h3></div>' +
            '<div id="recent-activity">' + recentActivity() + '</div></div>' +
            '<div class="card"><div class="card-header"><h3 class="card-title">Quick Actions</h3></div>' +
            '<div style="display:flex;flex-direction:column;gap:10px">' +
            '<button class="btn btn-primary" onclick="App.navigate(\'owner-workers\')">➕ Add Worker</button>' +
            '<button class="btn btn-ghost" onclick="App.navigate(\'owner-settings\')">⚙️ Manage Subjects & Settings</button>' +
            '<button class="btn btn-ghost" onclick="App.navigate(\'owner-reports\')">📈 View Full Reports</button>' +
            '</div></div>' +
            '</div>';
    }

    function recentActivity() {
        var users = DB.getUsers().slice().reverse().slice(0, 6);
        if (!users.length) return '<p class="text-muted">No activity yet</p>';
        return users.map(function (u) {
            return '<div class="info-row"><span class="info-key">' + Utils.escHtml(u.name) + '</span>' +
                '<span><span class="badge badge-primary">' + Utils.capitalize(u.role) + '</span></span></div>';
        }).join('');
    }

    // ── Workers ──
    function workers() {
        var list = DB.usersByRole('worker');
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><div><h1 class="page-title">Workers</h1><div class="page-sub">Manage institution workers/managers</div></div>' +
            '<button class="btn btn-primary" onclick="OwnerPage.addWorkerModal()">➕ Add Worker</button></div>' +
            '<div class="card">' +
            '<div class="table-toolbar"><input class="table-search" placeholder="Search workers..." oninput="OwnerPage.filterTable(this.value,\'workers-table\')">' +
            '<span class="text-muted text-sm">' + list.length + ' worker(s)</span></div>' +
            '<div class="table-wrap"><table id="workers-table">' +
            '<thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead>' +
            '<tbody>' + (list.length ? list.map(function (w) {
                return '<tr data-search="' + Utils.escHtml(w.name + w.email).toLowerCase() + '">' +
                    '<td><strong>' + Utils.escHtml(w.name) + '</strong></td>' +
                    '<td>' + Utils.escHtml(w.email) + '</td>' +
                    '<td>' + Utils.escHtml(w.phone || '—') + '</td>' +
                    '<td><span class="badge badge-success">Active</span></td>' +
                    '<td>' + Utils.fmtDate(w.createdAt) + '</td>' +
                    '<td class="td-actions">' +
                    '<button class="btn btn-sm btn-ghost" onclick="OwnerPage.editWorkerModal(\'' + w.id + '\')">✏️</button>' +
                    '<button class="btn btn-sm btn-danger" onclick="OwnerPage.deactivateWorker(\'' + w.id + '\')">🗑️</button>' +
                    '</td></tr>';
            }).join('') :
                '<tr class="empty-row"><td colspan="6">No workers added yet. Click ➕ Add Worker.</td></tr>') +
            '</tbody></table></div></div>';
    }

    function addWorkerModal() {
        App.openModal('Add Worker',
            '<div class="form-group"><label class="form-label">Full Name *</label><input class="form-control" id="wk-name" placeholder="John Smith"></div>' +
            '<div class="form-group"><label class="form-label">Email *</label><input class="form-control" id="wk-email" type="email" placeholder="worker@email.com"></div>' +
            '<div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="wk-phone" placeholder="0771234567"></div>' +
            '<p class="form-hint">Default password: <strong>educore123</strong> (worker can change after login)</p>',
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="OwnerPage.saveWorker()">Add Worker</button>'
        );
    }

    function saveWorker() {
        var name = document.getElementById('wk-name').value.trim();
        var email = document.getElementById('wk-email').value.trim().toLowerCase();
        var phone = document.getElementById('wk-phone').value.trim();
        if (!name || !email) { App.toast('Name and email are required', 'danger'); return; }
        if (DB.findUser(function (u) { return u.email === email; })) { App.toast('Email already exists', 'danger'); return; }
        Auth.createUser({ role: 'worker', name, email, phone });
        App.closeModal(); App.toast('Worker added successfully', 'success'); workers();
    }

    function editWorkerModal(id) {
        var w = DB.findUser(function (u) { return u.id === id; });
        if (!w) return;
        App.openModal('Edit Worker',
            '<div class="form-group"><label class="form-label">Full Name</label><input class="form-control" id="ewk-name" value="' + Utils.escHtml(w.name) + '"></div>' +
            '<div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="ewk-phone" value="' + Utils.escHtml(w.phone || '') + '"></div>',
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="OwnerPage.updateWorker(\'' + id + '\')">Save</button>'
        );
    }

    function updateWorker(id) {
        DB.updateUser(id, { name: document.getElementById('ewk-name').value.trim(), phone: document.getElementById('ewk-phone').value.trim() });
        App.closeModal(); App.toast('Worker updated', 'success'); workers();
    }

    function deactivateWorker(id) {
        App.confirm('Deactivate this worker? They will lose access.', function () {
            DB.updateUser(id, { status: 'inactive' }); App.toast('Worker deactivated', 'warning'); workers();
        });
    }

    // ── Settings ──
    function settings() {
        var subs = DB.getSubjects();
        var inst = DB.getInstitution();
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Settings</h1></div>' +
            '<div class="grid-2">' +
            '<div class="card"><div class="card-header"><h3 class="card-title">Institution Info</h3></div>' +
            '<div class="form-group"><label class="form-label">Name</label><input class="form-control" id="s-instname" value="' + Utils.escHtml(inst ? inst.name : '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Address</label><textarea class="form-control" id="s-instaddr" rows="2">' + Utils.escHtml(inst ? inst.address : '') + '</textarea></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="s-instphone" value="' + Utils.escHtml(inst ? inst.phone : '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Email</label><input class="form-control" id="s-instemail" value="' + Utils.escHtml(inst ? inst.email : '') + '"></div>' +
            '</div>' +
            '<button class="btn btn-primary" onclick="OwnerPage.saveInstSettings()">💾 Save</button>' +
            '</div>' +
            '<div class="card"><div class="card-header"><h3 class="card-title">Subjects</h3>' +
            '<button class="btn btn-sm btn-primary" onclick="OwnerPage.addSubjectModal()">➕ Add</button></div>' +
            '<div id="subjects-list">' + subs.map(function (s) {
                return '<div class="info-row"><span>' + Utils.escHtml(s.name) + '</span>' +
                    '<button class="btn btn-sm btn-danger" onclick="OwnerPage.deleteSub(\'' + s.id + '\')">✕</button></div>';
            }).join('') + '</div></div>' +
            '</div>' +
            '<div class="card mt-4"><div class="card-header"><h3 class="card-title">Change Owner Password</h3></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">New Password</label><input class="form-control" id="s-newpwd" type="password" placeholder="Min 6 chars"></div>' +
            '<div class="form-group"><label class="form-label">Confirm Password</label><input class="form-control" id="s-pwdconfirm" type="password"></div>' +
            '</div>' +
            '<button class="btn btn-warning" onclick="OwnerPage.changePassword()">🔐 Change Password</button></div>';
    }

    function saveInstSettings() {
        var inst = DB.getInstitution();
        inst.name = document.getElementById('s-instname').value.trim() || inst.name;
        inst.address = document.getElementById('s-instaddr').value.trim();
        inst.phone = document.getElementById('s-instphone').value.trim();
        inst.email = document.getElementById('s-instemail').value.trim();
        DB.saveInstitution(inst);
        document.getElementById('inst-name-short').textContent = inst.name;
        App.toast('Settings saved', 'success');
    }

    function addSubjectModal() {
        App.openModal('Add Subject',
            '<div class="form-group"><label class="form-label">Subject Name</label><input class="form-control" id="sub-nm" placeholder="e.g. Advanced Maths"></div>' +
            '<div class="form-group"><label class="form-label">Code</label><input class="form-control" id="sub-cd" placeholder="e.g. AMATH" maxlength="8"></div>',
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="OwnerPage.saveSub()">Add Subject</button>'
        );
    }

    function saveSub() {
        var name = document.getElementById('sub-nm').value.trim();
        var code = document.getElementById('sub-cd').value.trim().toUpperCase() || name.substring(0, 4).toUpperCase();
        if (!name) { App.toast('Subject name required', 'danger'); return; }
        DB.addSubject({ name, code }); App.closeModal(); App.toast('Subject added', 'success'); settings();
    }

    function deleteSub(id) {
        App.confirm('Delete this subject?', function () { DB.deleteSubject(id); settings(); });
    }

    function changePassword() {
        var pwd = document.getElementById('s-newpwd').value;
        var pwd2 = document.getElementById('s-pwdconfirm').value;
        if (pwd.length < 6) { App.toast('Minimum 6 characters', 'danger'); return; }
        if (pwd !== pwd2) { App.toast('Passwords do not match', 'danger'); return; }
        DB.updateUser(Auth.currentUser().id, { passwordHash: Utils.hashPwd(pwd) });
        App.toast('Password changed successfully', 'success');
    }

    // ── Reports ──
    function reports() {
        var fees = DB.getFeeCollections();
        var total = fees.reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);
        var byMonth = {};
        fees.forEach(function (f) {
            var d = new Date(f.createdAt); var k = d.getFullYear() + '-' + (d.getMonth() + 1);
            byMonth[k] = (byMonth[k] || 0) + parseFloat(f.amount || 0);
        });
        var labels = Object.keys(byMonth).sort().slice(-6);
        var vals = labels.map(function (k) { return byMonth[k]; });

        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Reports & Analytics</h1></div>' +
            '<div class="stats-grid">' +
            statCard('💰', 'Total Revenue', Utils.fmtMoney(total), 'c-success') +
            statCard('📋', 'Total Payments', fees.length, 'c-primary') +
            statCard('👨‍🎓', 'Students', DB.usersByRole('student').length, 'c-info') +
            statCard('📚', 'Classes', DB.getClasses().length, 'c-warning') +
            '</div>' +
            '<div class="card"><div class="card-header"><h3 class="card-title">Monthly Revenue (Last 6 Months)</h3></div>' +
            '<div class="chart-wrap"><canvas id="revenue-chart"></canvas></div>' +
            '</div>';

        setTimeout(function () {
            var ctx = document.getElementById('revenue-chart').getContext('2d');
            new Chart(ctx, {
                type: 'bar', data: {
                    labels: labels,
                    datasets: [{ label: 'Revenue (Rs.)', data: vals, backgroundColor: 'rgba(99,102,241,0.7)', borderColor: '#6366f1', borderWidth: 2, borderRadius: 6 }]
                }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e2e8f0' } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: '#2d3d57' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: '#2d3d57' } } } }
            });
        }, 100);
    }

    function statCard(icon, label, val, cls) {
        return '<div class="stat-card ' + cls + '"><div class="stat-icon">' + icon + '</div>' +
            '<div class="stat-value">' + Utils.escHtml(String(val)) + '</div>' +
            '<div class="stat-label">' + Utils.escHtml(label) + '</div></div>';
    }

    function filterTable(q, tableId) {
        var rows = document.querySelectorAll('#' + tableId + ' tbody tr');
        rows.forEach(function (r) {
            var s = (r.getAttribute('data-search') || r.textContent).toLowerCase();
            r.style.display = s.includes(q.toLowerCase()) ? '' : 'none';
        });
    }

    return {
        render, addWorkerModal, saveWorker, editWorkerModal, updateWorker, deactivateWorker,
        saveInstSettings, addSubjectModal, saveSub, deleteSub, changePassword, filterTable
    };
})();
