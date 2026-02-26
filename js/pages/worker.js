/* ======================================================
   worker.js — Worker Dashboard
   ====================================================== */
var WorkerPage = (function () {

    function render(h) {
        if (h === 'worker-teachers') return teachers();
        if (h === 'worker-students') return students();
        if (h === 'worker-classes') return classes();
        if (h === 'worker-cardmarkers') return cardmarkers();
        if (h === 'worker-fees') return fees();
        if (h === 'worker-calendar') return calendar();
        if (h === 'worker-reports') return reports();
        // student profile: worker-student-XXXX
        if (h.startsWith('worker-student-')) return studentProfile(h.replace('worker-student-', ''));
        return overview();
    }

    function statCard(icon, label, val, cls) {
        return '<div class="stat-card ' + cls + '"><div class="stat-icon">' + icon + '</div>' +
            '<div class="stat-value">' + Utils.escHtml(String(val)) + '</div>' +
            '<div class="stat-label">' + Utils.escHtml(label) + '</div></div>';
    }

    // ── Overview ──
    function overview() {
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Worker Dashboard</h1></div>' +
            '<div class="stats-grid">' +
            statCard('👩‍🏫', 'Teachers', DB.usersByRole('teacher').length, 'c-primary') +
            statCard('👨‍🎓', 'Students', DB.usersByRole('student').length, 'c-success') +
            statCard('📚', 'Classes', DB.getClasses().length, 'c-warning') +
            statCard('💰', 'Fees Collected', Utils.fmtMoney(DB.getFeeCollections().reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0)), 'c-info') +
            '</div>' +
            '<div class="card"><div class="card-header"><h3 class="card-title">Quick Actions</h3></div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">' +
            '<button class="btn btn-primary" onclick="App.navigate(\'worker-teachers\')">👩‍🏫 Manage Teachers</button>' +
            '<button class="btn btn-primary" onclick="App.navigate(\'worker-students\')">👨‍🎓 Manage Students</button>' +
            '<button class="btn btn-primary" onclick="App.navigate(\'worker-classes\')">📚 Manage Classes</button>' +
            '<button class="btn btn-ghost" onclick="App.navigate(\'worker-cardmarkers\')">✅ Card Markers</button>' +
            '<button class="btn btn-ghost" onclick="App.navigate(\'worker-fees\')">💰 Fee Overview</button>' +
            '</div></div>';
    }

    // ── Teachers ──
    function teachers() {
        var list = DB.usersByRole('teacher');
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><div><h1 class="page-title">Teachers</h1></div>' +
            '<button class="btn btn-primary" onclick="WorkerPage.addTeacherModal()">➕ Add Teacher</button></div>' +
            '<div class="card">' +
            '<div class="table-toolbar"><input class="table-search" placeholder="Search..." oninput="WorkerPage.filterTable(this.value,\'t-table\')"></div>' +
            '<div class="table-wrap"><table id="t-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Classes</th><th>Actions</th></tr></thead><tbody>' +
            (list.length ? list.map(function (t) {
                var cls = DB.classesByTeacher(t.id).length;
                return '<tr data-search="' + Utils.escHtml(t.name + t.email).toLowerCase() + '">' +
                    '<td><strong>' + Utils.escHtml(t.name) + '</strong></td>' +
                    '<td>' + Utils.escHtml(t.email) + '</td>' +
                    '<td>' + Utils.escHtml(t.phone || '—') + '</td>' +
                    '<td><span class="badge badge-info">' + cls + ' class(es)</span></td>' +
                    '<td class="td-actions">' +
                    '<button class="btn btn-sm btn-ghost" onclick="WorkerPage.editUserModal(\'' + t.id + '\')">✏️</button>' +
                    '<button class="btn btn-sm btn-danger" onclick="WorkerPage.removeUser(\'' + t.id + '\',\'worker-teachers\')">🗑️</button>' +
                    '</td></tr>';
            }).join('') : '<tr class="empty-row"><td colspan="5">No teachers yet.</td></tr>') +
            '</tbody></table></div></div>';
    }

    function addTeacherModal() {
        App.openModal('Add Teacher',
            userFormHtml('th'),
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="WorkerPage.saveUserRole(\'teacher\',\'th\',\'worker-teachers\')">Add Teacher</button>'
        );
    }

    function userFormHtml(pfx) {
        return '<div class="form-group"><label class="form-label">Full Name *</label><input class="form-control" id="' + pfx + '-name" placeholder="Full name"></div>' +
            '<div class="form-group"><label class="form-label">Email *</label><input class="form-control" id="' + pfx + '-email" type="email" placeholder="teacher@email.com"></div>' +
            '<div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="' + pfx + '-phone" placeholder="0771234567"></div>' +
            '<p class="form-hint">Default password: <strong>educore123</strong></p>';
    }

    function saveUserRole(role, pfx, nav) {
        var name = document.getElementById(pfx + '-name').value.trim();
        var email = document.getElementById(pfx + '-email').value.trim().toLowerCase();
        var phone = document.getElementById(pfx + '-phone').value.trim();
        if (!name || !email) { App.toast('Name and email required', 'danger'); return; }
        if (DB.findUser(function (u) { return u.email === email; })) { App.toast('Email already exists', 'danger'); return; }
        Auth.createUser({ role, name, email, phone });
        App.closeModal(); App.toast(Utils.capitalize(role) + ' added', 'success'); App.navigate(nav);
    }

    function editUserModal(id) {
        var u = DB.findUser(function (x) { return x.id === id; });
        if (!u) return;
        App.openModal('Edit User',
            '<div class="form-group"><label class="form-label">Name</label><input class="form-control" id="eu-name" value="' + Utils.escHtml(u.name) + '"></div>' +
            '<div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="eu-phone" value="' + Utils.escHtml(u.phone || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Reset Password</label><input class="form-control" id="eu-pwd" type="password" placeholder="Leave blank to keep current"></div>',
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="WorkerPage.updateUser(\'' + id + '\')">Save</button>'
        );
    }

    function updateUser(id) {
        var changes = { name: document.getElementById('eu-name').value.trim(), phone: document.getElementById('eu-phone').value.trim() };
        var pwd = document.getElementById('eu-pwd').value;
        if (pwd.length >= 6) changes.passwordHash = Utils.hashPwd(pwd);
        DB.updateUser(id, changes); App.closeModal(); App.toast('User updated', 'success');
        App.navigate(window.location.hash.replace('#', ''));
    }

    function removeUser(id, back) {
        App.confirm('Remove this user? This cannot be undone.', function () {
            DB.updateUser(id, { status: 'inactive' }); App.toast('User removed', 'warning'); App.navigate(back);
        });
    }

    // ── Students ──
    function students() {
        var list = DB.usersByRole('student');
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><div><h1 class="page-title">Students</h1>' +
            '<div class="page-sub">' + list.length + ' registered student(s)</div></div>' +
            '<button class="btn btn-primary" onclick="WorkerPage.addStudentModal()">➕ Add Student</button></div>' +
            '<div class="card">' +
            '<div class="table-toolbar"><input class="table-search" placeholder="Search by name or email..." oninput="WorkerPage.filterTable(this.value,\'s-table\')"></div>' +
            '<div class="table-wrap"><table id="s-table"><thead><tr><th>Student</th><th>Email</th><th>Phone</th><th>Classes</th><th>Total Paid</th><th>Actions</th></tr></thead><tbody>' +
            (list.length ? list.map(function (s) {
                var enr = DB.enrollmentsByStudent(s.id).length;
                var paid = DB.feesByStudent(s.id).reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);
                return '<tr data-search="' + Utils.escHtml(s.name + s.email).toLowerCase() + '">' +
                    '<td><div class="flex items-c gap-2">' +
                    '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-d));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;flex-shrink:0">' + s.name.charAt(0).toUpperCase() + '</div>' +
                    '<div><strong>' + Utils.escHtml(s.name) + '</strong><div class="text-sm text-muted">' + Utils.fmtDate(s.createdAt) + '</div></div>' +
                    '</div></td>' +
                    '<td>' + Utils.escHtml(s.email) + '</td>' +
                    '<td>' + Utils.escHtml(s.phone || '—') + '</td>' +
                    '<td><span class="badge badge-info">' + enr + ' class(es)</span></td>' +
                    '<td><strong class="text-success">' + Utils.fmtMoney(paid) + '</strong></td>' +
                    '<td class="td-actions">' +
                    '<button class="btn btn-sm btn-primary" onclick="App.navigate(\'worker-student-' + s.id + '\')" title="Full Profile">👁 Profile</button>' +
                    '<button class="btn btn-sm btn-ghost" onclick="WorkerPage.manageEnrollments(\'' + s.id + '\')" title="Enroll">📚</button>' +
                    '<button class="btn btn-sm btn-ghost" onclick="WorkerPage.editUserModal(\'' + s.id + '\')" title="Edit">✏️</button>' +
                    '<button class="btn btn-sm btn-danger" onclick="WorkerPage.removeUser(\'' + s.id + '\',\'worker-students\')" title="Remove">🗑️</button>' +
                    '</td></tr>';
            }).join('') : '<tr class="empty-row"><td colspan="6">No students yet. Click ➕ Add Student to get started.</td></tr>') +
            '</tbody></table></div></div>';
    }

    // ── Full Student Profile ──
    function studentProfile(sid) {
        var s = DB.findUser(function (u) { return u.id === sid; });
        if (!s) { App.navigate('worker-students'); return; }
        var enrollments = DB.enrollmentsByStudent(sid);
        var allClasses = DB.getClasses();
        var allUsers = DB.getUsers();
        var subs = DB.getSubjects();
        var allFees = DB.feesByStudent(sid);
        var totalPaid = allFees.reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);
        var allResults = DB.resultsByStudent(sid);
        var allExams = DB.getExams();

        // Per-class summary
        var classRows = enrollments.map(function (e) {
            var cls = allClasses.find(function (c) { return c.id === e.classId; });
            if (!cls) return '';
            var teacher = allUsers.find(function (u) { return u.id === cls.teacherId; });
            var sub = subs.find(function (sub) { return sub.id === cls.subjectId; });
            var att = DB.studentAttendanceStats(sid, e.classId);
            var clsFees = allFees.filter(function (f) { return f.classId === e.classId; });
            var paid = clsFees.reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);
            var exams = DB.examsByClass(e.classId);
            var results = exams.map(function (ex) { var r = DB.resultByExamStudent(ex.id, sid); return r ? Utils.pct(r.marks, ex.maxMarks) : null; }).filter(function (x) { return x !== null; });
            var avg = results.length ? Math.round(results.reduce(function (a, b) { return a + b; }, 0) / results.length) : null;
            var g = avg !== null ? Utils.getGrade(avg) : null;
            return '<tr>' +
                '<td><strong>' + Utils.escHtml(cls.name) + '</strong>' + (sub ? '<div class="text-sm text-muted">' + sub.name + '</div>' : '') + '</td>' +
                '<td>' + (teacher ? Utils.escHtml(teacher.name) : '—') + '</td>' +
                '<td><span class="badge ' + (att.pct >= 75 ? 'badge-success' : 'badge-danger') + '">' + att.pct + '%</span><span class="text-muted text-sm"> (' + att.present + '/' + att.total + ')</span></td>' +
                '<td><strong>' + Utils.fmtMoney(paid) + '</strong></td>' +
                '<td>' + (g ? '<span class="badge badge-' + g.cls + '">' + avg + '% ' + g.grade + '</span>' : '<span class="text-muted">No exams</span>') + '</td>' +
                '<td class="td-actions">' +
                '<button class="btn btn-sm btn-success" onclick="WorkerPage.manualFeeModal(\'' + sid + '\',\'' + e.classId + '\',\'' + Utils.escHtml(cls.name) + '\',' + cls.feeAmount + ')">💰 Add Fee</button>' +
                '</td></tr>';
        }).join('');

        // Recent fee history
        var feeRows = allFees.slice().reverse().slice(0, 10).map(function (f) {
            var cls = allClasses.find(function (c) { return c.id === f.classId; });
            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return '<tr><td><code>' + Utils.escHtml(f.receiptNo || '—') + '</code></td>' +
                '<td>' + Utils.escHtml(cls ? cls.name : '—') + '</td>' +
                '<td>' + months[(f.month || 1) - 1] + ' ' + f.year + '</td>' +
                '<td><strong class="text-success">' + Utils.fmtMoney(f.amount) + '</strong></td>' +
                '<td>' + Utils.fmtDate(f.createdAt) + '</td></tr>';
        }).join('');

        document.getElementById('page-content').innerHTML =
            '<div class="page-header">' +
            '<div class="flex items-c gap-3">' +
            '<button class="btn btn-ghost btn-sm" onclick="App.navigate(\'worker-students\')">← Back</button>' +
            '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-d));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:20px">' + s.name.charAt(0).toUpperCase() + '</div>' +
            '<div><h1 class="page-title" style="font-size:20px">' + Utils.escHtml(s.name) + '</h1><div class="page-sub">Student Profile</div></div>' +
            '</div>' +
            '<div class="flex gap-2">' +
            '<button class="btn btn-ghost" onclick="WorkerPage.editUserModal(\'' + sid + '\')">✏️ Edit</button>' +
            '<button class="btn btn-ghost" onclick="WorkerPage.printReportCard(\'' + sid + '\')" title="Print/save">🖨️ Report Card</button>' +
            '</div>' +
            '</div>' +
            '<div class="grid-2" style="margin-bottom:20px">' +
            '<div class="card"><h3 class="card-title mb-4">Personal Info</h3>' +
            '<div class="info-block">' +
            '<div class="info-row"><span class="info-key">Email</span><span class="info-val">' + Utils.escHtml(s.email) + '</span></div>' +
            '<div class="info-row"><span class="info-key">Phone</span><span class="info-val">' + Utils.escHtml(s.phone || '—') + '</span></div>' +
            '<div class="info-row"><span class="info-key">Joined</span><span class="info-val">' + Utils.fmtDate(s.createdAt) + '</span></div>' +
            '<div class="info-row"><span class="info-key">Status</span><span class="info-val"><span class="badge badge-success">Active</span></span></div>' +
            '</div>' +
            '</div>' +
            '<div class="stats-grid" style="grid-template-columns:1fr 1fr">' +
            '<div class="stat-card c-primary"><div class="stat-icon">📚</div><div class="stat-value">' + enrollments.length + '</div><div class="stat-label">Classes</div></div>' +
            '<div class="stat-card c-success"><div class="stat-icon">💰</div><div class="stat-value">' + Utils.fmtMoney(totalPaid) + '</div><div class="stat-label">Total Paid</div></div>' +
            '<div class="stat-card c-info"><div class="stat-icon">📝</div><div class="stat-value">' + allResults.length + '</div><div class="stat-label">Exams Done</div></div>' +
            '<div class="stat-card c-warning"><div class="stat-icon">🔔</div><div class="stat-value">' + allFees.length + '</div><div class="stat-label">Payments</div></div>' +
            '</div>' +
            '</div>' +
            '<div class="card mb-4"><div class="card-header"><h3 class="card-title">Class Performance</h3></div>' +
            (enrollments.length ?
                '<div class="table-wrap"><table><thead><tr><th>Class</th><th>Teacher</th><th>Attendance</th><th>Fees Paid</th><th>Avg Grade</th><th>Action</th></tr></thead><tbody>' + classRows + '</tbody></table></div>' :
                '<p class="text-muted">Not enrolled in any class yet. <button class="btn btn-sm btn-primary" onclick="WorkerPage.manageEnrollments(\'' + sid + '\')" style="display:inline-flex">📚 Enroll Now</button></p>') +
            '</div>' +
            '<div class="card"><div class="card-header"><h3 class="card-title">Fee Payment History</h3></div>' +
            (allFees.length ?
                '<div class="table-wrap"><table><thead><tr><th>Receipt #</th><th>Class</th><th>Period</th><th>Amount</th><th>Date</th></tr></thead><tbody>' + feeRows + '</tbody></table></div>' :
                '<p class="text-muted">No fee payments recorded yet.</p>') +
            '</div>';
    }

    // ── Manual Fee Modal (Worker can also record fees) ──
    function manualFeeModal(sid, cid, className, defaultAmt) {
        var now = new Date();
        App.openModal('Record Fee Payment — ' + className,
            '<div class="form-group"><label class="form-label">Amount (Rs.) *</label>' +
            '<input class="form-control" id="mf-amount" type="number" value="' + defaultAmt + '" min="1"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">Month</label><select class="form-control" id="mf-month">' + Utils.monthOptions() + '</select></div>' +
            '<div class="form-group"><label class="form-label">Year</label><select class="form-control" id="mf-year">' + Utils.yearOptions() + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label class="form-label">Note</label><input class="form-control" id="mf-note" placeholder="e.g. January 2025 class fee"></div>',
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-success" onclick="WorkerPage.saveManualFee(\'' + sid + '\',\'' + cid + '\')" >💰 Save Payment</button>'
        );
        document.getElementById('mf-month').value = now.getMonth() + 1;
    }

    function saveManualFee(sid, cid) {
        var amount = parseFloat(document.getElementById('mf-amount').value) || 0;
        var month = parseInt(document.getElementById('mf-month').value);
        var year = parseInt(document.getElementById('mf-year').value);
        var note = document.getElementById('mf-note').value.trim();
        if (amount <= 0) { App.toast('Enter a valid amount', 'danger'); return; }
        var wk = Auth.currentUser();
        DB.addFeeCollection({ studentId: sid, classId: cid, amount, month, year, note, collectedBy: wk.id, receiptNo: Utils.receiptNumber() });
        App.closeModal();
        App.toast('Payment of ' + Utils.fmtMoney(amount) + ' recorded ✅', 'success');
        studentProfile(sid);
    }

    // ── Print Report Card (opens a printable window) ──
    function printReportCard(sid) {
        var s = DB.findUser(function (u) { return u.id === sid; });
        var inst = DB.getInstitution();
        var enrollments = DB.enrollmentsByStudent(sid);
        var allClasses = DB.getClasses();
        var allExams = DB.getExams();
        var subs = DB.getSubjects();

        var rows = enrollments.map(function (e) {
            var cls = allClasses.find(function (c) { return c.id === e.classId; });
            if (!cls) return '';
            var sub = subs.find(function (sub) { return sub.id === cls.subjectId; });
            var att = DB.studentAttendanceStats(sid, e.classId);
            var exams = DB.examsByClass(e.classId);
            return exams.map(function (ex) {
                var r = DB.resultByExamStudent(ex.id, sid);
                var pct = r ? Utils.pct(r.marks, ex.maxMarks) : null;
                var g = pct !== null ? Utils.getGrade(pct) : null;
                return '<tr style="border-bottom:1px solid #ddd">' +
                    '<td style="padding:8px">' + Utils.escHtml(cls.name) + '</td>' +
                    '<td style="padding:8px">' + (sub ? sub.name : '—') + '</td>' +
                    '<td style="padding:8px">' + Utils.escHtml(ex.title) + '</td>' +
                    '<td style="padding:8px">' + ex.maxMarks + '</td>' +
                    '<td style="padding:8px">' + (r ? r.marks : 'N/A') + '</td>' +
                    '<td style="padding:8px">' + (g ? pct + '% — ' + g.grade : '—') + '</td>' +
                    '<td style="padding:8px">' + att.pct + '%</td>' +
                    '</tr>';
            }).join('');
        }).join('');

        var w = window.open('', '_blank', 'width=800,height=600');
        w.document.write('<!DOCTYPE html><html><head><title>Report Card</title>' +
            '<style>body{font-family:Arial,sans-serif;padding:30px;color:#222} table{width:100%;border-collapse:collapse} th{background:#1e293b;color:#fff;padding:10px;text-align:left} td{padding:8px;border-bottom:1px solid #ddd} .header{text-align:center;margin-bottom:24px} h1{margin:0} .info{display:flex;justify-content:space-between;margin-bottom:20px;background:#f8f9fa;padding:14px;border-radius:8px}</style>' +
            '</head><body>' +
            '<div class="header"><h1>🎓 ' + (inst ? inst.name : 'EduCore') + '</h1><h2 style="margin:6px 0 2px">Student Progress Report</h2><p style="color:#666">' + (inst ? inst.address : '') + '</p></div>' +
            '<div class="info"><div><strong>Student:</strong> ' + Utils.escHtml(s.name) + '<br><strong>Email:</strong> ' + Utils.escHtml(s.email) + '</div>' +
            '<div><strong>Report Date:</strong> ' + Utils.fmtDate(new Date().toISOString()) + '<br><strong>Classes Enrolled:</strong> ' + enrollments.length + '</div></div>' +
            '<table><thead><tr><th>Class</th><th>Subject</th><th>Exam</th><th>Max</th><th>Scored</th><th>Grade</th><th>Att%</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888">No exam results recorded yet</td></tr>') +
            '</tbody></table>' +
            '<script>window.print();<\/script></body></html>');
        w.document.close();
    }

    function addStudentModal() {
        App.openModal('Add Student',
            userFormHtml('st'),
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="WorkerPage.saveUserRole(\'student\',\'st\',\'worker-students\')">Add Student</button>'
        );
    }

    function manageEnrollments(studentId) {
        var student = DB.findUser(function (u) { return u.id === studentId; });
        var allClasses = DB.getClasses();
        var teachers = DB.getUsers();
        var subs = DB.getSubjects();
        var html = '<p class="text-muted mb-2">Classes for <strong>' + Utils.escHtml(student.name) + '</strong></p>';
        if (!allClasses.length) { html += '<p class="text-muted">No classes created yet. <a href="#" onclick="App.closeModal();App.navigate(\'worker-classes\')">Create classes</a> first.</p>'; }
        else {
            html += allClasses.map(function (c) {
                var enrolled = DB.isEnrolled(studentId, c.id);
                var teacher = teachers.find(function (t) { return t.id === c.teacherId; });
                var sub = subs.find(function (s) { return s.id === c.subjectId; });
                return '<div class="info-row">' +
                    '<div><strong>' + Utils.escHtml(c.name) + '</strong>' +
                    '<div class="text-sm text-muted">' + (sub ? sub.name : '') + (teacher ? ' · ' + teacher.name : '') + '</div></div>' +
                    (enrolled ?
                        '<button class="btn btn-sm btn-danger" onclick="WorkerPage.unenroll(\'' + studentId + '\',\'' + c.id + '\')">Remove</button>' :
                        '<button class="btn btn-sm btn-success" onclick="WorkerPage.enroll(\'' + studentId + '\',\'' + c.id + '\')">Enroll</button>') +
                    '</div>';
            }).join('');
        }
        App.openModal('Manage Enrollments', html);
    }

    function enroll(sid, cid) {
        if (DB.isEnrolled(sid, cid)) { App.toast('Already enrolled', 'warning'); return; }
        DB.addEnrollment({ studentId: sid, classId: cid });
        App.toast('Enrolled successfully', 'success');
        manageEnrollments(sid);
    }

    function unenroll(sid, cid) {
        var e = DB.getEnrollments().find(function (e) { return e.studentId === sid && e.classId === cid; });
        if (e) { DB.deleteEnrollment(e.id); App.toast('Removed from class', 'warning'); manageEnrollments(sid); }
    }

    // ── Classes ──
    function classes() {
        var list = DB.getClasses();
        var teachers = DB.usersByRole('teacher');
        var subs = DB.getSubjects();
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><div><h1 class="page-title">Classes</h1></div>' +
            '<button class="btn btn-primary" onclick="WorkerPage.addClassModal()">➕ Add Class</button></div>' +
            '<div class="grid-auto">' +
            (list.length ? list.map(function (c) {
                var teacher = teachers.find(function (t) { return t.id === c.teacherId; });
                var sub = subs.find(function (s) { return s.id === c.subjectId; });
                var enrolled = DB.enrollmentsByClass(c.id).length;
                return '<div class="card" style="cursor:pointer">' +
                    '<div class="card-header"><strong>' + Utils.escHtml(c.name) + '</strong>' +
                    '<button class="btn btn-sm btn-danger" onclick="WorkerPage.deleteClass(\'' + c.id + '\')">✕</button></div>' +
                    '<div class="info-block">' +
                    '<div class="info-row"><span class="info-key">Subject</span><span class="info-val">' + (sub ? Utils.escHtml(sub.name) : '—') + '</span></div>' +
                    '<div class="info-row"><span class="info-key">Teacher</span><span class="info-val">' + (teacher ? Utils.escHtml(teacher.name) : '—') + '</span></div>' +
                    '<div class="info-row"><span class="info-key">Grade</span><span class="info-val">' + Utils.escHtml(c.gradeLevel || '—') + '</span></div>' +
                    '<div class="info-row"><span class="info-key">Students</span><span class="info-val">' + enrolled + '</span></div>' +
                    '<div class="info-row"><span class="info-key">Fee</span><span class="info-val">' + Utils.fmtMoney(c.feeAmount) + ' / ' + Utils.escHtml(c.feeMode || 'month') + '</span></div>' +
                    '</div>' +
                    '<button class="btn btn-ghost w-full" onclick="WorkerPage.editClassModal(\'' + c.id + '\')">✏️ Edit Class</button>' +
                    '</div>';
            }).join('') : '<div class="card"><p class="text-muted">No classes created yet.</p></div>') +
            '</div>';
    }

    function addClassModal() {
        App.openModal('Add Class', classFormHtml(null),
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="WorkerPage.saveClass(null)">Create Class</button>'
        );
    }

    function editClassModal(id) {
        var c = DB.findClass(id);
        App.openModal('Edit Class', classFormHtml(c),
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="WorkerPage.saveClass(\'' + id + '\')">Save</button>'
        );
    }

    function classFormHtml(c) {
        var teachers = DB.usersByRole('teacher');
        var subs = DB.getSubjects();
        return '<div class="form-group"><label class="form-label">Class Name *</label>' +
            '<input class="form-control" id="cf-name" placeholder="e.g. Maths Grade 10 - Batch A" value="' + Utils.escHtml(c ? c.name : '') + '"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">Subject</label><select class="form-control" id="cf-subject">' +
            '<option value="">Select subject</option>' +
            subs.map(function (s) { return '<option value="' + s.id + '"' + (c && c.subjectId === s.id ? ' selected' : '') + '>' + Utils.escHtml(s.name) + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="form-group"><label class="form-label">Teacher</label><select class="form-control" id="cf-teacher">' +
            '<option value="">Select teacher</option>' +
            teachers.map(function (t) { return '<option value="' + t.id + '"' + (c && c.teacherId === t.id ? ' selected' : '') + '>' + Utils.escHtml(t.name) + '</option>'; }).join('') +
            '</select></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">Grade Level</label><input class="form-control" id="cf-grade" placeholder="e.g. Grade 10" value="' + Utils.escHtml(c ? c.gradeLevel || '' : '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Room / Location</label><input class="form-control" id="cf-room" placeholder="Room 3A" value="' + Utils.escHtml(c ? c.room || '' : '') + '"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">Fee Amount (Rs.)</label><input class="form-control" id="cf-fee" type="number" placeholder="2500" value="' + Utils.escHtml(c ? c.feeAmount || '' : '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Fee Mode</label><select class="form-control" id="cf-feemode">' +
            '<option value="month"' + (c && c.feeMode === 'month' ? ' selected' : '') + '>Monthly</option>' +
            '<option value="session"' + (c && c.feeMode === 'session' ? ' selected' : '') + '>Per Session</option>' +
            '<option value="annual"' + (c && c.feeMode === 'annual' ? ' selected' : '') + '>Annual</option>' +
            '</select></div>' +
            '</div>';
    }

    function saveClass(id) {
        var name = document.getElementById('cf-name').value.trim();
        if (!name) { App.toast('Class name required', 'danger'); return; }
        var data = {
            name, subjectId: document.getElementById('cf-subject').value,
            teacherId: document.getElementById('cf-teacher').value,
            gradeLevel: document.getElementById('cf-grade').value.trim(),
            room: document.getElementById('cf-room').value.trim(),
            feeAmount: parseFloat(document.getElementById('cf-fee').value) || 0,
            feeMode: document.getElementById('cf-feemode').value
        };
        if (id) DB.updateClass(id, data); else DB.addClass(data);
        App.closeModal(); App.toast(id ? 'Class updated' : 'Class created', 'success'); classes();
    }

    function deleteClass(id) {
        App.confirm('Delete this class and all its data?', function () { DB.deleteClass(id); App.toast('Class deleted', 'warning'); classes(); });
    }

    // ── Card Markers ──
    function cardmarkers() {
        var list = DB.usersByRole('card-marker');
        var teachers = DB.usersByRole('teacher');
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><div><h1 class="page-title">Card Markers</h1></div>' +
            '<button class="btn btn-primary" onclick="WorkerPage.addCmModal()">➕ Add Card Marker</button></div>' +
            '<div class="card">' +
            '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Assigned Teacher</th><th>Actions</th></tr></thead><tbody>' +
            (list.length ? list.map(function (cm) {
                var t = teachers.find(function (t) { return t.id === cm.assignedTo; });
                return '<tr><td><strong>' + Utils.escHtml(cm.name) + '</strong></td><td>' + Utils.escHtml(cm.email) + '</td>' +
                    '<td>' + (t ? Utils.escHtml(t.name) : '<span class="text-muted">Unassigned</span>') + '</td>' +
                    '<td class="td-actions"><button class="btn btn-sm btn-danger" onclick="WorkerPage.removeUser(\'' + cm.id + '\',\'worker-cardmarkers\')">🗑️</button></td></tr>';
            }).join('') : '<tr class="empty-row"><td colspan="4">No card markers yet.</td></tr>') +
            '</tbody></table></div></div>';
    }

    function addCmModal() {
        var teachers = DB.usersByRole('teacher');
        App.openModal('Add Card Marker',
            userFormHtml('cm') +
            '<div class="form-group"><label class="form-label">Assign to Teacher</label><select class="form-control" id="cm-teacher">' +
            '<option value="">Select teacher</option>' +
            teachers.map(function (t) { return '<option value="' + t.id + '">' + Utils.escHtml(t.name) + '</option>'; }).join('') + '</select></div>',
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="WorkerPage.saveCm()">Add Card Marker</button>'
        );
    }

    function saveCm() {
        var name = document.getElementById('cm-name').value.trim();
        var email = document.getElementById('cm-email').value.trim().toLowerCase();
        var phone = document.getElementById('cm-phone').value.trim();
        var tid = document.getElementById('cm-teacher').value;
        if (!name || !email) { App.toast('Name and email required', 'danger'); return; }
        if (DB.findUser(function (u) { return u.email === email; })) { App.toast('Email already exists', 'danger'); return; }
        Auth.createUser({ role: 'card-marker', name, email, phone, assignedTo: tid || null });
        App.closeModal(); App.toast('Card Marker added', 'success'); cardmarkers();
    }

    // ── Fees ──
    function fees() {
        var collections = DB.getFeeCollections();
        var total = collections.reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);
        var users = DB.getUsers();
        var classes = DB.getClasses();
        // Per-class fee totals
        var byClass = {};
        collections.forEach(function (f) { byClass[f.classId] = (byClass[f.classId] || 0) + parseFloat(f.amount || 0); });
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Fee Overview</h1></div>' +
            '<div class="stats-grid">' +
            statCard('💰', 'Total Collected', Utils.fmtMoney(total), 'c-success') +
            statCard('📋', 'No. of Payments', collections.length, 'c-primary') +
            statCard('👨‍🎓', 'Fee-Paying Students', Object.keys(collections.reduce(function (a, f) { a[f.studentId] = 1; return a; }, {})).length, 'c-info') +
            '</div>' +
            '<div class="grid-2">' +
            '<div class="card"><div class="card-header"><h3 class="card-title">Revenue by Class</h3></div>' +
            (classes.length ?
                '<div class="table-wrap"><table><thead><tr><th>Class</th><th>Collected</th><th>Payments</th></tr></thead><tbody>' +
                classes.map(function (c) {
                    var amt = byClass[c.id] || 0;
                    var cnt = collections.filter(function (f) { return f.classId === c.id; }).length;
                    return '<tr><td><strong>' + Utils.escHtml(c.name) + '</strong></td>' +
                        '<td class="text-success"><strong>' + Utils.fmtMoney(amt) + '</strong></td>' +
                        '<td>' + cnt + '</td></tr>';
                }).join('') + '</tbody></table></div>' :
                '<p class="text-muted">No classes yet.</p>') +
            '</div>' +
            '<div class="card"><div class="card-header"><h3 class="card-title">Recent Payments</h3></div>' +
            (collections.length ?
                '<div class="table-wrap"><table><thead><tr><th>Student</th><th>Class</th><th>Amount</th><th>Date</th></tr></thead><tbody>' +
                collections.slice().reverse().slice(0, 15).map(function (f) {
                    var st = users.find(function (u) { return u.id === f.studentId; });
                    var cls = classes.find(function (c) { return c.id === f.classId; });
                    return '<tr>' +
                        '<td>' + Utils.escHtml(st ? st.name : '—') + '</td>' +
                        '<td>' + Utils.escHtml(cls ? cls.name : '—') + '</td>' +
                        '<td><strong class="text-success">' + Utils.fmtMoney(f.amount) + '</strong></td>' +
                        '<td>' + Utils.fmtDate(f.createdAt) + '</td></tr>';
                }).join('') + '</tbody></table></div>' :
                '<p class="text-muted">No payments recorded yet.</p>') +
            '</div>' +
            '</div>';
    }

    // ── Reports ──
    function reports() {
        var students = DB.usersByRole('student');
        var teachers = DB.usersByRole('teacher');
        var classes = DB.getClasses();
        var fees = DB.getFeeCollections();
        var total = fees.reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);

        // Unpaid students this month
        var now = new Date();
        var unpaid = students.filter(function (s) {
            return DB.enrollmentsByStudent(s.id).some(function (e) {
                var paid = fees.find(function (f) { return f.studentId === s.id && f.classId === e.classId && f.month === (now.getMonth() + 1) && f.year === now.getFullYear(); });
                return !paid;
            });
        });

        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Reports</h1></div>' +
            '<div class="stats-grid">' +
            statCard('👨‍🎓', 'Total Students', students.length, 'c-primary') +
            statCard('👩‍🏫', 'Total Teachers', teachers.length, 'c-success') +
            statCard('📚', 'Total Classes', classes.length, 'c-warning') +
            statCard('💰', 'Total Revenue', Utils.fmtMoney(total), 'c-info') +
            '</div>' +
            '<div class="card"><div class="card-header"><h3 class="card-title">⚠️ Unpaid Students This Month</h3></div>' +
            (unpaid.length ?
                '<div class="table-wrap"><table><thead><tr><th>Student</th><th>Email</th><th>Enrolled Classes</th><th>Action</th></tr></thead><tbody>' +
                unpaid.map(function (s) {
                    var enr = DB.enrollmentsByStudent(s.id).length;
                    return '<tr>' +
                        '<td><strong>' + Utils.escHtml(s.name) + '</strong></td>' +
                        '<td>' + Utils.escHtml(s.email) + '</td>' +
                        '<td>' + enr + '</td>' +
                        '<td><button class="btn btn-sm btn-primary" onclick="App.navigate(\'worker-student-' + s.id + '\')" >View Profile</button></td></tr>';
                }).join('') + '</tbody></table></div>' :
                '<p style="color:var(--success)">✅ All enrolled students have paid this month!</p>') +
            '</div>';
    }

    // ── Calendar ──
    function calendar() {
        var now = new Date();
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Academic Calendar</h1></div>' +
            '<div class="card">' +
            '<div class="card-header"><h3 class="card-title">' + now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear() + '</h3></div>' +
            '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px">' +
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) { return '<div style="text-align:center;font-size:11px;font-weight:600;color:var(--text-2);padding:8px">' + d + '</div>'; }).join('') +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px" id="cal-grid"></div>' +
            '</div>';
        buildCalendar(now.getFullYear(), now.getMonth());
    }

    function buildCalendar(year, month) {
        var first = new Date(year, month, 1).getDay();
        var days = new Date(year, month + 1, 0).getDate();
        var today = new Date().getDate();
        var html = '';
        for (var i = 0; i < first; i++) html += '<div></div>';
        for (var d = 1; d <= days; d++) {
            var isToday = d === today && month === new Date().getMonth();
            html += '<div style="text-align:center;padding:10px 4px;border-radius:8px;cursor:pointer;font-size:13px;' + (isToday ? 'background:var(--primary);color:#fff;font-weight:700' : '') + '">' + d + '</div>';
        }
        document.getElementById('cal-grid').innerHTML = html;
    }

    function filterTable(q, tableId) {
        var rows = document.querySelectorAll('#' + tableId + ' tbody tr');
        rows.forEach(function (r) {
            var s = (r.getAttribute('data-search') || r.textContent).toLowerCase();
            r.style.display = s.includes(q.toLowerCase()) ? '' : 'none';
        });
    }

    return {
        render, addTeacherModal, saveUserRole, editUserModal, updateUser, removeUser,
        manageEnrollments, enroll, unenroll,
        addStudentModal, studentProfile, manualFeeModal, saveManualFee, printReportCard,
        addClassModal, editClassModal, saveClass, deleteClass,
        addCmModal, saveCm,
        filterTable
    };
})();
