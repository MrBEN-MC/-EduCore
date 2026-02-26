/* ======================================================
   student.js — Student Portal
   ====================================================== */
var StudentPage = (function () {

    function render(h) {
        if (h === 'student-classes') return myClasses();
        if (h === 'student-payments') return payments();
        if (h === 'student-marks') return marks();
        if (h === 'student-attendance') return attendance();
        if (h === 'student-resources') return studResources();
        if (h === 'student-progress') return progress();
        if (h === 'student-profile') return profile();
        return dashboard();
    }

    function dashboard() {
        var user = Auth.currentUser();
        var enrollments = DB.enrollmentsByStudent(user.id);
        var allClasses = DB.getClasses();
        var fees = DB.feesByStudent(user.id);
        var totalPaid = fees.reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);
        var exams = DB.getExams();
        var myResults = DB.resultsByStudent(user.id);

        document.getElementById('page-content').innerHTML =
            '<div class="page-header">' +
            '<div><h1 class="page-title">Welcome, ' + Utils.escHtml(user.name) + '</h1>' +
            '<div class="page-sub">Your learning dashboard</div></div>' +
            '</div>' +
            '<div class="stats-grid">' +
            '<div class="stat-card c-primary"><div class="stat-icon">📚</div><div class="stat-value">' + enrollments.length + '</div><div class="stat-label">Enrolled Classes</div></div>' +
            '<div class="stat-card c-success"><div class="stat-icon">💰</div><div class="stat-value">' + Utils.fmtMoney(totalPaid) + '</div><div class="stat-label">Total Fees Paid</div></div>' +
            '<div class="stat-card c-info"><div class="stat-icon">📝</div><div class="stat-value">' + myResults.length + '</div><div class="stat-label">Exams Completed</div></div>' +
            '</div>' +
            '<div class="grid-2">' +
            '<div class="card"><div class="card-header"><h3 class="card-title">My Classes</h3>' +
            '<button class="btn btn-sm btn-ghost" onclick="App.navigate(\'student-classes\')">View All →</button></div>' +
            (enrollments.length ? enrollments.slice(0, 3).map(function (e) {
                var cls = allClasses.find(function (c) { return c.id === e.classId; });
                if (!cls) return '';
                var att = DB.studentAttendanceStats(user.id, e.classId);
                return '<div class="info-row"><span>' + Utils.escHtml(cls.name) + '</span>' +
                    '<span class="badge ' + (att.pct >= 75 ? 'badge-success' : 'badge-danger') + '">' + att.pct + '% att.</span></div>';
            }).join('') : '<p class="text-muted">No classes enrolled yet.</p>') +
            '</div>' +
            '<div class="card"><div class="card-header"><h3 class="card-title">Recent Marks</h3>' +
            '<button class="btn btn-sm btn-ghost" onclick="App.navigate(\'student-marks\')">View All →</button></div>' +
            (myResults.length ? myResults.slice(-4).reverse().map(function (r) {
                var ex = exams.find(function (e) { return e.id === r.examId; });
                if (!ex) return '';
                var pct = Utils.pct(r.marks, ex.maxMarks);
                var g = Utils.getGrade(pct);
                return '<div class="info-row"><span>' + Utils.escHtml(ex.title) + '</span>' +
                    '<span><strong>' + r.marks + '/' + ex.maxMarks + '</strong> <span class="badge badge-' + g.cls + '">' + g.grade + '</span></span></div>';
            }).join('') : '<p class="text-muted">No exam results yet.</p>') +
            '</div>' +
            '</div>';
    }

    // ── My Classes ──
    function myClasses() {
        var user = Auth.currentUser();
        var enrollments = DB.enrollmentsByStudent(user.id);
        var allClasses = DB.getClasses();
        var allUsers = DB.getUsers();
        var subs = DB.getSubjects();
        var weekOf = Utils.currentWeekStart();

        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">My Classes</h1></div>' +
            (enrollments.length ? '<div class="grid-auto">' + enrollments.map(function (e) {
                var cls = allClasses.find(function (c) { return c.id === e.classId; });
                if (!cls) return '';
                var teacher = allUsers.find(function (u) { return u.id === cls.teacherId; });
                var sub = subs.find(function (s) { return s.id === cls.subjectId; });
                var att = DB.studentAttendanceStats(user.id, e.classId);
                var slots = DB.slotsByClassWeek(e.classId, weekOf);
                return '<div class="card">' +
                    '<div class="card-header"><strong>' + Utils.escHtml(cls.name) + '</strong>' +
                    (sub ? '<span class="badge badge-primary">' + Utils.escHtml(sub.name) + '</span>' : '') +
                    '</div>' +
                    '<div class="info-block">' +
                    '<div class="info-row"><span class="info-key">Teacher</span><span class="info-val">' + Utils.escHtml(teacher ? teacher.name : '—') + '</span></div>' +
                    '<div class="info-row"><span class="info-key">Room</span><span class="info-val">' + Utils.escHtml(cls.room || '—') + '</span></div>' +
                    '<div class="info-row"><span class="info-key">Attendance</span><span class="info-val"><span class="badge ' + (att.pct >= 75 ? 'badge-success' : 'badge-danger') + '">' + att.pct + '%</span></span></div>' +
                    '<div class="info-row"><span class="info-key">Fee</span><span class="info-val">' + Utils.fmtMoney(cls.feeAmount) + ' / ' + Utils.escHtml(cls.feeMode || 'month') + '</span></div>' +
                    '</div>' +
                    (slots.length ? '<div style="margin-top:8px"><div class="text-sm text-muted mb-1">This week\'s schedule:</div>' +
                        slots.map(function (s) { return '<span class="badge badge-gray" style="margin:2px">' + Utils.DAYS[s.day] + ' ' + s.startTime + '</span>'; }).join('') + '</div>' : '') +
                    '</div>';
            }).join('') + '</div>' :
                '<div class="card"><p class="text-muted">You are not enrolled in any class yet. Contact the institution admin.</p></div>');
    }

    // ── Payments ──
    function payments() {
        var user = Auth.currentUser();
        var feeList = DB.feesByStudent(user.id).slice().reverse();
        var total = feeList.reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);
        var allClasses = DB.getClasses();
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Payment History</h1></div>' +
            '<div class="stats-grid">' +
            '<div class="stat-card c-success"><div class="stat-icon">💰</div><div class="stat-value">' + Utils.fmtMoney(total) + '</div><div class="stat-label">Total Paid</div></div>' +
            '<div class="stat-card c-primary"><div class="stat-icon">📋</div><div class="stat-value">' + feeList.length + '</div><div class="stat-label">Transactions</div></div>' +
            '</div>' +
            '<div class="card"><div class="card-header"><h3 class="card-title">All Payments</h3></div>' +
            '<div class="table-wrap"><table><thead><tr><th>Receipt #</th><th>Class</th><th>Amount</th><th>Period</th><th>Date</th></tr></thead><tbody>' +
            (feeList.length ? feeList.map(function (f) {
                var cls = allClasses.find(function (c) { return c.id === f.classId; });
                var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return '<tr>' +
                    '<td><code>' + Utils.escHtml(f.receiptNo || '—') + '</code></td>' +
                    '<td>' + Utils.escHtml(cls ? cls.name : '—') + '</td>' +
                    '<td><strong class="text-success">' + Utils.fmtMoney(f.amount) + '</strong></td>' +
                    '<td>' + months[(f.month || 1) - 1] + ' ' + f.year + '</td>' +
                    '<td>' + Utils.fmtDate(f.createdAt) + '</td></tr>';
            }).join('') : '<tr class="empty-row"><td colspan="5">No payments recorded yet.</td></tr>') +
            '</tbody></table></div></div>';
    }

    // ── Marks ──
    function marks() {
        var user = Auth.currentUser();
        var enrollments = DB.enrollmentsByStudent(user.id);
        var allClasses = DB.getClasses();
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">My Marks</h1></div>' +
            (enrollments.length ? enrollments.map(function (e) {
                var cls = allClasses.find(function (c) { return c.id === e.classId; });
                if (!cls) return '';
                var exams = DB.examsByClass(e.classId);
                var rows = exams.map(function (ex) {
                    var r = DB.resultByExamStudent(ex.id, user.id);
                    if (!r) return '<tr><td>' + Utils.escHtml(ex.title) + '</td><td><span class="badge badge-info">' + Utils.capitalize(ex.type) + '</span></td><td>' + Utils.fmtDate(ex.scheduledAt) + '</td><td>' + Utils.escHtml(String(ex.maxMarks)) + '</td><td class="text-muted">—</td><td>—</td></tr>';
                    var pct = Utils.pct(r.marks, ex.maxMarks);
                    var g = Utils.getGrade(pct);
                    return '<tr><td>' + Utils.escHtml(ex.title) + '</td><td><span class="badge badge-info">' + Utils.capitalize(ex.type) + '</span></td>' +
                        '<td>' + Utils.fmtDate(ex.scheduledAt) + '</td><td>' + ex.maxMarks + '</td>' +
                        '<td><strong>' + r.marks + '</strong> (' + pct + '%)</td>' +
                        '<td><span class="badge badge-' + g.cls + '">' + g.grade + '</span></td></tr>';
                }).join('');
                return '<div class="card mb-4"><div class="card-header"><h3 class="card-title">' + Utils.escHtml(cls.name) + '</h3></div>' +
                    (exams.length ?
                        '<div class="table-wrap"><table><thead><tr><th>Exam</th><th>Type</th><th>Date</th><th>Max</th><th>Your Marks</th><th>Grade</th></tr></thead><tbody>' + rows + '</tbody></table></div>' :
                        '<p class="text-muted">No exams scheduled yet for this class.</p>') +
                    '</div>';
            }).join('') : '<div class="card"><p class="text-muted">No classes enrolled.</p></div>');
    }

    // ── Attendance ──
    function attendance() {
        var user = Auth.currentUser();
        var enrollments = DB.enrollmentsByStudent(user.id);
        var allClasses = DB.getClasses();
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">My Attendance</h1></div>' +
            (enrollments.length ? enrollments.map(function (e) {
                var cls = allClasses.find(function (c) { return c.id === e.classId; });
                if (!cls) return '';
                var att = DB.studentAttendanceStats(user.id, e.classId);
                var sessions = DB.sessionsByClass(e.classId);
                var records = DB.getAttendanceRecords().filter(function (r) {
                    return r.studentId === user.id && sessions.some(function (s) { return s.id === r.sessionId; });
                });
                return '<div class="card mb-4">' +
                    '<div class="card-header"><h3 class="card-title">' + Utils.escHtml(cls.name) + '</h3>' +
                    '<span class="badge ' + (att.pct >= 75 ? 'badge-success' : 'badge-danger') + '">' + att.pct + '% Attendance</span>' +
                    '</div>' +
                    '<div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">' +
                    '<div class="stat-card c-success" style="flex:1;min-width:120px"><div class="stat-icon">✅</div><div class="stat-value">' + att.present + '</div><div class="stat-label">Present</div></div>' +
                    '<div class="stat-card c-danger" style="flex:1;min-width:120px"><div class="stat-icon">❌</div><div class="stat-value">' + (att.total - att.present) + '</div><div class="stat-label">Absent</div></div>' +
                    '<div class="stat-card c-primary" style="flex:1;min-width:120px"><div class="stat-icon">📅</div><div class="stat-value">' + att.total + '</div><div class="stat-label">Total Sessions</div></div>' +
                    '</div>' +
                    (att.pct < 75 ? '<div style="background:rgba(239,68,68,.15);border:1px solid var(--danger);border-radius:8px;padding:12px;color:var(--danger);margin-bottom:12px">⚠️ Low attendance! You need at least 75% to be eligible for exams.</div>' : '') +
                    '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>' +
                    (records.length ? records.slice().reverse().map(function (r) {
                        var sess = sessions.find(function (s) { return s.id === r.sessionId; });
                        var statusClasses = { present: 'badge-success', absent: 'badge-danger', late: 'badge-warning', excused: 'badge-info' };
                        return '<tr><td>' + Utils.fmtDate(sess ? sess.date : '') + '</td>' +
                            '<td><span class="badge ' + (statusClasses[r.status] || 'badge-gray') + '">' + Utils.capitalize(r.status) + '</span></td></tr>';
                    }).join('') : '<tr class="empty-row"><td colspan="2">No attendance records yet.</td></tr>') +
                    '</tbody></table></div></div>';
            }).join('') : '<div class="card"><p class="text-muted">No classes enrolled.</p></div>');
    }

    // ── Resources ──
    function studResources() {
        var user = Auth.currentUser();
        var enrollments = DB.enrollmentsByStudent(user.id);
        var classIds = enrollments.map(function (e) { return e.classId; });
        var allRes = DB.getResources().filter(function (r) { return classIds.indexOf(r.classId) >= 0; });
        var allClasses = DB.getClasses();
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Notes & Tutes</h1></div>' +
            (allRes.length ? '<div class="grid-auto">' + allRes.map(function (r) {
                var cls = allClasses.find(function (c) { return c.id === r.classId; });
                return '<div class="card">' +
                    '<div class="flex items-c gap-3 mb-2">' +
                    '<span style="font-size:28px">' + (r.fileType && r.fileType.includes('pdf') ? '📄' : '📎') + '</span>' +
                    '<div><strong>' + Utils.escHtml(r.title) + '</strong><div class="text-sm text-muted">' + Utils.escHtml(cls ? cls.name : '—') + '</div></div>' +
                    '</div>' +
                    '<div class="text-sm text-muted mb-4">Uploaded ' + Utils.fmtDate(r.uploadedAt) + '</div>' +
                    '<button class="btn btn-primary w-full" onclick="StudentPage.downloadRes(\'' + r.id + '\')">⬇️ Download</button>' +
                    '</div>';
            }).join('') + '</div>' :
                '<div class="card"><p class="text-muted">No resources shared by your teachers yet.</p></div>');
    }

    function downloadRes(id) {
        var r = DB.getResources().find(function (x) { return x.id === id; });
        if (!r || !r.data) { App.toast('File not available', 'danger'); return; }
        var a = document.createElement('a'); a.href = r.data; a.download = r.fileName || r.title; a.click();
    }

    // ── Progress ──
    function progress() {
        var user = Auth.currentUser();
        var enrollments = DB.enrollmentsByStudent(user.id);
        var allClasses = DB.getClasses();
        var myResults = DB.resultsByStudent(user.id);
        var allExams = DB.getExams();

        // Build chart data: all results sorted by exam date
        var chartData = myResults.map(function (r) {
            var ex = allExams.find(function (e) { return e.id === r.examId; });
            if (!ex) return null;
            return { label: ex.title.substring(0, 15), pct: Utils.pct(r.marks, ex.maxMarks), date: ex.scheduledAt };
        }).filter(Boolean).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

        // Attendance by class
        var attData = enrollments.map(function (e) {
            var cls = allClasses.find(function (c) { return c.id === e.classId; });
            if (!cls) return null;
            var att = DB.studentAttendanceStats(user.id, e.classId);
            return { label: cls.name.substring(0, 12), pct: att.pct };
        }).filter(Boolean);

        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">My Progress</h1></div>' +
            '<div class="grid-2">' +
            '<div class="card"><div class="card-header"><h3 class="card-title">📈 Marks Trend</h3></div>' +
            '<div class="chart-wrap"><canvas id="marks-chart"></canvas></div></div>' +
            '<div class="card"><div class="card-header"><h3 class="card-title">✅ Attendance by Class</h3></div>' +
            '<div class="chart-wrap"><canvas id="att-chart"></canvas></div></div>' +
            '</div>' +
            '<div class="card mt-4"><div class="card-header"><h3 class="card-title">📊 Performance Summary</h3></div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">' +
            enrollments.map(function (e) {
                var cls = allClasses.find(function (c) { return c.id === e.classId; });
                if (!cls) return '';
                var att = DB.studentAttendanceStats(user.id, e.classId);
                var exams = DB.examsByClass(e.classId);
                var results = exams.map(function (ex) {
                    var r = DB.resultByExamStudent(ex.id, user.id);
                    return r ? Utils.pct(r.marks, ex.maxMarks) : null;
                }).filter(function (x) { return x !== null; });
                var avg = results.length ? Math.round(results.reduce(function (a, b) { return a + b; }, 0) / results.length) : null;
                var g = avg !== null ? Utils.getGrade(avg) : null;
                return '<div class="card-sm">' +
                    '<div class="font-600 mb-2 truncate">' + Utils.escHtml(cls.name) + '</div>' +
                    '<div class="info-row"><span class="text-muted">Attendance</span><span class="badge ' + (att.pct >= 75 ? 'badge-success' : 'badge-danger') + '">' + att.pct + '%</span></div>' +
                    '<div class="info-row"><span class="text-muted">Avg Mark</span><span>' + (g ? '<span class="badge badge-' + g.cls + '">' + avg + '% ' + g.grade + '</span>' : '—') + '</span></div>' +
                    '</div>';
            }).join('') +
            '</div></div>';

        setTimeout(function () {
            // Marks trend chart
            var mCtx = document.getElementById('marks-chart').getContext('2d');
            new Chart(mCtx, {
                type: 'line', data: {
                    labels: chartData.map(function (d) { return d.label; }),
                    datasets: [{
                        label: 'Score (%)', data: chartData.map(function (d) { return d.pct; }),
                        borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.15)', tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#6366f1'
                    }]
                }, options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#e2e8f0' } } },
                    scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: '#2d3d57' } }, y: { min: 0, max: 100, ticks: { color: '#94a3b8' }, grid: { color: '#2d3d57' } } }
                }
            });
            // Attendance chart
            var aCtx = document.getElementById('att-chart').getContext('2d');
            new Chart(aCtx, {
                type: 'bar', data: {
                    labels: attData.map(function (d) { return d.label; }),
                    datasets: [{
                        label: 'Attendance %', data: attData.map(function (d) { return d.pct; }),
                        backgroundColor: attData.map(function (d) { return d.pct >= 75 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'; }),
                        borderRadius: 6
                    }]
                }, options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#e2e8f0' } } },
                    scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: '#2d3d57' } }, y: { min: 0, max: 100, ticks: { color: '#94a3b8' }, grid: { color: '#2d3d57' } } }
                }
            });
        }, 100);
    }

    // ── Profile & Settings ──
    function profile() {
        var user = Auth.currentUser();
        var enrollments = DB.enrollmentsByStudent(user.id);
        var allClasses = DB.getClasses();
        var allFees = DB.feesByStudent(user.id);
        var totalPaid = allFees.reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);
        var results = DB.resultsByStudent(user.id);

        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">My Profile</h1></div>' +
            '<div class="grid-2">' +
            '<div class="card">' +
            '<div style="text-align:center;margin-bottom:20px">' +
            '<div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-d));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:28px;margin:0 auto 12px">' + user.name.charAt(0).toUpperCase() + '</div>' +
            '<h2 style="font-size:18px;font-weight:700">' + Utils.escHtml(user.name) + '</h2>' +
            '<span class="badge badge-primary">Student</span>' +
            '</div>' +
            '<h3 class="card-title mb-4" style="margin-bottom:16px">Edit Personal Info</h3>' +
            '<div class="form-group"><label class="form-label">Full Name</label><input class="form-control" id="pr-name" value="' + Utils.escHtml(user.name) + '"></div>' +
            '<div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="pr-phone" value="' + Utils.escHtml(user.phone || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Email (read-only)</label><input class="form-control" value="' + Utils.escHtml(user.email) + '" disabled style="opacity:.6"></div>' +
            '<button class="btn btn-primary" onclick="StudentPage.saveProfile()">💾 Save Changes</button>' +
            '</div>' +
            '<div>' +
            '<div class="card mb-4">' +
            '<h3 class="card-title" style="margin-bottom:16px">Change Password</h3>' +
            '<div class="form-group"><label class="form-label">New Password</label><input class="form-control" id="pr-pwd" type="password" placeholder="Min 6 characters"></div>' +
            '<div class="form-group"><label class="form-label">Confirm Password</label><input class="form-control" id="pr-pwd2" type="password" placeholder="Repeat password"></div>' +
            '<button class="btn btn-warning" onclick="StudentPage.changePassword()">🔐 Change Password</button>' +
            '</div>' +
            '<div class="stats-grid" style="grid-template-columns:1fr 1fr">' +
            '<div class="stat-card c-primary"><div class="stat-icon">📚</div><div class="stat-value">' + enrollments.length + '</div><div class="stat-label">Classes</div></div>' +
            '<div class="stat-card c-success"><div class="stat-icon">💰</div><div class="stat-value">' + Utils.fmtMoney(totalPaid) + '</div><div class="stat-label">Total Paid</div></div>' +
            '<div class="stat-card c-info"><div class="stat-icon">📝</div><div class="stat-value">' + results.length + '</div><div class="stat-label">Exams Done</div></div>' +
            '<div class="stat-card c-warning"><div class="stat-icon">🔔</div><div class="stat-value">' + allFees.length + '</div><div class="stat-label">Payments</div></div>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    function saveProfile() {
        var user = Auth.currentUser();
        var name = document.getElementById('pr-name').value.trim();
        var phone = document.getElementById('pr-phone').value.trim();
        if (!name) { App.toast('Name cannot be empty', 'danger'); return; }
        DB.updateUser(user.id, { name, phone });
        // Update session
        Auth.setSession(Object.assign({}, user, { name, phone }));
        document.getElementById('user-name-display').textContent = name;
        document.getElementById('user-avatar-display').textContent = name.charAt(0).toUpperCase();
        App.toast('Profile updated successfully', 'success');
    }

    function changePassword() {
        var user = Auth.currentUser();
        var pwd = document.getElementById('pr-pwd').value;
        var pwd2 = document.getElementById('pr-pwd2').value;
        if (pwd.length < 6) { App.toast('Password must be at least 6 characters', 'danger'); return; }
        if (pwd !== pwd2) { App.toast('Passwords do not match', 'danger'); return; }
        DB.updateUser(user.id, { passwordHash: Utils.hashPwd(pwd) });
        document.getElementById('pr-pwd').value = '';
        document.getElementById('pr-pwd2').value = '';
        App.toast('Password changed successfully', 'success');
    }

    return { render, downloadRes, saveProfile, changePassword };
})();
