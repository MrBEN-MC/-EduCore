/* ======================================================
   cardmarker.js — Card Marker Dashboard
   ====================================================== */
var CardMarkerPage = (function () {

    function render(h) {
        if (h === 'card-marker-attendance') return attendance();
        if (h === 'card-marker-fees') return feeCollection();
        return overview();
    }

    function getMyClasses() {
        var user = Auth.currentUser();
        var teacher = DB.findUser(function (u) { return u.id === user.assignedTo; });
        if (!teacher) return [];
        return DB.classesByTeacher(teacher.id);
    }

    function overview() {
        var classes = getMyClasses();
        var user = Auth.currentUser();
        var teacher = DB.findUser(function (u) { return u.id === user.assignedTo; });
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Card Marker Dashboard</h1></div>' +
            '<div class="card mb-4"><div class="info-row">' +
            '<span class="info-key">Assigned Teacher</span>' +
            '<span class="info-val">' + (teacher ? Utils.escHtml(teacher.name) : '<span class="text-danger">Not assigned to a teacher yet</span>') + '</span>' +
            '</div></div>' +
            '<div class="stats-grid">' +
            '<div class="stat-card c-primary"><div class="stat-icon">📚</div><div class="stat-value">' + classes.length + '</div><div class="stat-label">Assigned Classes</div></div>' +
            '<div class="stat-card c-success"><div class="stat-icon">✅</div><div class="stat-value">' + DB.getAttendanceSessions().filter(function (s) { return classes.some(function (c) { return c.id === s.classId; }); }).length + '</div><div class="stat-label">Sessions Marked</div></div>' +
            '<div class="stat-card c-info"><div class="stat-icon">💰</div><div class="stat-value">' + DB.getFeeCollections().filter(function (f) { return f.collectedBy === user.id; }).length + '</div><div class="stat-label">Fees Collected</div></div>' +
            '</div>' +
            '<div class="card"><div class="card-header"><h3 class="card-title">Quick Actions</h3></div>' +
            '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
            '<button class="btn btn-primary" onclick="App.navigate(\'card-marker-attendance\')">✅ Mark Attendance</button>' +
            '<button class="btn btn-success" onclick="App.navigate(\'card-marker-fees\')">💰 Collect Fees</button>' +
            '</div></div>';
    }

    // ── Attendance ──
    function attendance() {
        var classes = getMyClasses();
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Mark Attendance</h1></div>' +
            (classes.length ?
                '<div class="card mb-4"><div class="form-row">' +
                '<div class="form-group"><label class="form-label">Select Class</label>' +
                '<select class="form-control" id="att-class" onchange="CardMarkerPage.loadAttendanceForm()">' +
                '<option value="">-- Select Class --</option>' +
                classes.map(function (c) { return '<option value="' + c.id + '">' + Utils.escHtml(c.name) + '</option>'; }).join('') +
                '</select></div>' +
                '<div class="form-group"><label class="form-label">Date</label>' +
                '<input class="form-control" id="att-date" type="date" value="' + Utils.todayISO() + '" onchange="CardMarkerPage.loadAttendanceForm()"></div>' +
                '</div></div>' +
                '<div id="att-form"></div>' :
                '<div class="card"><p class="text-muted">You are not assigned to any teacher\'s classes yet.</p></div>'
            );
    }

    function loadAttendanceForm() {
        var cid = document.getElementById('att-class').value;
        var date = document.getElementById('att-date').value;
        if (!cid || !date) { document.getElementById('att-form').innerHTML = ''; return; }
        var enrollments = DB.enrollmentsByClass(cid);
        var users = DB.getUsers();
        var existing = DB.sessionExists(cid, date);
        var existingRecords = existing ? DB.recordsBySession(existing.id) : [];

        var html = '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">Students — ' + Utils.fmtDate(date) + '</h3>' +
            (existing ? '<span class="badge badge-warning">Session already marked</span>' : '') + '</div>' +
            '<div class="att-legend">' +
            '<div class="att-legend-item"><div class="att-dot att-present"></div>Present</div>' +
            '<div class="att-legend-item"><div class="att-dot att-absent"></div>Absent</div>' +
            '<div class="att-legend-item"><div class="att-dot" style="background:var(--warning)"></div>Late</div>' +
            '<div class="att-legend-item"><div class="att-dot" style="background:var(--info)"></div>Excused</div>' +
            '</div>';

        if (!enrollments.length) { html += '<p class="text-muted">No students enrolled in this class.</p>'; }
        else {
            html += '<div>';
            enrollments.forEach(function (e) {
                var st = users.find(function (u) { return u.id === e.studentId; });
                if (!st) return;
                var rec = existingRecords.find(function (r) { return r.studentId === st.id; });
                var cur = rec ? rec.status : 'present';
                html += '<div class="att-student-row">' +
                    '<div class="flex items-c gap-2">' +
                    '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-d));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px">' + st.name.charAt(0).toUpperCase() + '</div>' +
                    '<strong>' + Utils.escHtml(st.name) + '</strong>' +
                    '</div>' +
                    '<div class="att-radio-group">' +
                    ['present', 'absent', 'late', 'excused'].map(function (s) {
                        return '<label class="att-radio"><input type="radio" name="att-' + st.id + '" value="' + s + '"' + (cur === s ? ' checked' : '') + '>' + Utils.capitalize(s) + '</label>';
                    }).join('') +
                    '</div>' +
                    '</div>';
            });
            html += '</div>';
        }
        html += '<div class="form-actions"><button class="btn btn-primary" onclick="CardMarkerPage.submitAttendance(\'' + cid + '\',\'' + date + '\')">✅ Submit Attendance</button></div></div>';
        document.getElementById('att-form').innerHTML = html;
    }

    function submitAttendance(cid, date) {
        var enrollments = DB.enrollmentsByClass(cid);
        if (!enrollments.length) { App.toast('No students to mark', 'warning'); return; }
        var cm = Auth.currentUser();

        // Create session (or get existing)
        var sess = DB.sessionExists(cid, date);
        if (!sess) sess = DB.addAttendanceSession({ classId: cid, date: date, cardMarkerId: cm.id });

        enrollments.forEach(function (e) {
            var radios = document.querySelectorAll('input[name="att-' + e.studentId + '"]');
            var status = 'present';
            radios.forEach(function (r) { if (r.checked) status = r.value; });
            DB.updateAttendanceRecord(sess.id, e.studentId, status);
        });

        App.toast('Attendance submitted for ' + enrollments.length + ' student(s)', 'success');
        loadAttendanceForm();
    }

    // ── Fee Collection ──
    function feeCollection() {
        var classes = getMyClasses();
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Fee Collection</h1></div>' +
            (classes.length ?
                '<div class="card mb-4"><div class="form-group"><label class="form-label">Select Class</label>' +
                '<select class="form-control" id="fee-class" onchange="CardMarkerPage.loadFeeStudents()">' +
                '<option value="">-- Select Class --</option>' +
                classes.map(function (c) { return '<option value="' + c.id + '">' + Utils.escHtml(c.name) + '</option>'; }).join('') +
                '</select></div></div>' +
                '<div id="fee-list"></div>' :
                '<div class="card"><p class="text-muted">No classes assigned.</p></div>'
            );
    }

    function loadFeeStudents() {
        var cid = document.getElementById('fee-class').value;
        if (!cid) { document.getElementById('fee-list').innerHTML = ''; return; }
        var cls = DB.findClass(cid);
        var enrollments = DB.enrollmentsByClass(cid);
        var users = DB.getUsers();
        var now = new Date();
        var curMonth = now.getMonth() + 1;
        var curYear = now.getFullYear();

        var rows = enrollments.map(function (e) {
            var st = users.find(function (u) { return u.id === e.studentId; });
            if (!st) return '';
            var allFees = DB.feesByStudent(st.id).filter(function (f) { return f.classId === cid; });
            var thisMonth = allFees.filter(function (f) { return f.month == curMonth && f.year == curYear; });
            var paid = allFees.reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);
            return '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px;border-bottom:1px solid var(--border)">' +
                '<div class="flex items-c gap-2">' +
                '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-d));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px">' + st.name.charAt(0).toUpperCase() + '</div>' +
                '<div><strong>' + Utils.escHtml(st.name) + '</strong><div class="text-sm text-muted">Total paid: ' + Utils.fmtMoney(paid) + '</div></div>' +
                '</div>' +
                '<div class="flex items-c gap-2">' +
                (thisMonth.length ? '<span class="badge badge-success">✅ Paid this month</span>' :
                    '<span class="badge badge-danger">⚠ Unpaid</span>') +
                '<button class="btn btn-sm btn-primary" onclick="CardMarkerPage.collectModal(\'' + st.id + '\',\'' + cid + '\',\'' + Utils.escHtml(st.name) + '\',' + cls.feeAmount + ')">Collect</button>' +
                '</div>' +
                '</div>';
        }).join('');

        document.getElementById('fee-list').innerHTML =
            '<div class="card"><div class="card-header"><h3 class="card-title">Students</h3></div>' +
            (rows || '<p class="text-muted">No students enrolled.</p>') + '</div>';
    }

    function collectModal(sid, cid, name, defaultAmt) {
        var now = new Date();
        App.openModal('Collect Fee — ' + name,
            '<div class="form-group"><label class="form-label">Amount (Rs.) *</label>' +
            '<input class="form-control" id="fc-amount" type="number" value="' + defaultAmt + '" min="1"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">Month</label>' +
            '<select class="form-control" id="fc-month">' + Utils.monthOptions() + '</select></div>' +
            '<div class="form-group"><label class="form-label">Year</label>' +
            '<select class="form-control" id="fc-year">' + Utils.yearOptions() + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label class="form-label">Note</label>' +
            '<input class="form-control" id="fc-note" placeholder="e.g. January 2025 class fee"></div>',
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-success" onclick="CardMarkerPage.saveFee(\'' + sid + '\',\'' + cid + '\')">💰 Record Payment</button>'
        );
        // Set current month
        document.getElementById('fc-month').value = now.getMonth() + 1;
    }

    function saveFee(sid, cid) {
        var amount = parseFloat(document.getElementById('fc-amount').value) || 0;
        var month = parseInt(document.getElementById('fc-month').value);
        var year = parseInt(document.getElementById('fc-year').value);
        var note = document.getElementById('fc-note').value.trim();
        if (amount <= 0) { App.toast('Enter a valid amount', 'danger'); return; }
        var cm = Auth.currentUser();
        DB.addFeeCollection({ studentId: sid, classId: cid, amount, month, year, note, collectedBy: cm.id, receiptNo: Utils.receiptNumber() });
        App.closeModal(); App.toast('Payment recorded — ' + Utils.fmtMoney(amount), 'success');
        loadFeeStudents();
    }

    return { render, loadAttendanceForm, submitAttendance, loadFeeStudents, collectModal, saveFee };
})();
