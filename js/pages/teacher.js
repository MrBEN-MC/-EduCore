/* ======================================================
   teacher.js — Teacher Dashboard
   ====================================================== */
var TeacherPage = (function () {

    function render(h) {
        if (h === 'teacher-timetable') return timetable();
        if (h === 'teacher-exams') return exams();
        if (h === 'teacher-resources') return resources();
        return myClasses();
    }

    // ── My Classes ──
    function myClasses() {
        var user = Auth.currentUser();
        var classes = DB.classesByTeacher(user.id);
        var subs = DB.getSubjects();
        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">My Classes</h1></div>' +
            (classes.length ? '<div class="grid-auto">' + classes.map(function (c) {
                var sub = subs.find(function (s) { return s.id === c.subjectId; });
                var enrolled = DB.enrollmentsByClass(c.id);
                return '<div class="card">' +
                    '<div class="card-header"><strong>' + Utils.escHtml(c.name) + '</strong>' +
                    '<span class="badge badge-primary">' + (sub ? sub.name : '—') + '</span></div>' +
                    '<div class="info-block">' +
                    '<div class="info-row"><span class="info-key">Students</span><span class="info-val">' + enrolled.length + '</span></div>' +
                    '<div class="info-row"><span class="info-key">Grade</span><span class="info-val">' + Utils.escHtml(c.gradeLevel || '—') + '</span></div>' +
                    '<div class="info-row"><span class="info-key">Room</span><span class="info-val">' + Utils.escHtml(c.room || '—') + '</span></div>' +
                    '</div>' +
                    '<button class="btn btn-primary w-full" onclick="TeacherPage.classDetail(\'' + c.id + '\')">View Students →</button>' +
                    '</div>';
            }).join('') + '</div>' :
                '<div class="card"><p class="text-muted">No classes assigned to you yet. Contact the worker/manager.</p></div>');
    }

    function classDetail(cid) {
        var cls = DB.findClass(cid);
        var enrollments = DB.enrollmentsByClass(cid);
        var allUsers = DB.getUsers();
        var subs = DB.getSubjects();
        var sub = subs.find(function (s) { return s.id === cls.subjectId; });

        var rows = enrollments.map(function (e) {
            var st = allUsers.find(function (u) { return u.id === e.studentId; });
            if (!st) return '';
            var att = DB.studentAttendanceStats(st.id, cid);
            var fees = DB.feesByStudent(st.id).filter(function (f) { return f.classId === cid; });
            var paid = fees.reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0);
            var exams = DB.examsByClass(cid);
            var results = exams.map(function (ex) {
                var r = DB.resultByExamStudent(ex.id, st.id);
                return r ? Math.round((r.marks / ex.maxMarks) * 100) : null;
            }).filter(function (x) { return x !== null; });
            var avgMark = results.length ? Math.round(results.reduce(function (a, b) { return a + b; }, 0) / results.length) : null;
            return '<tr>' +
                '<td><strong>' + Utils.escHtml(st.name) + '</strong></td>' +
                '<td><span class="badge ' + (att.pct >= 75 ? 'badge-success' : 'badge-danger') + '">' + att.pct + '%</span>(' + att.present + '/' + att.total + ')</td>' +
                '<td>' + Utils.fmtMoney(paid) + '</td>' +
                '<td>' + (avgMark !== null ? '<span class="badge badge-' + (avgMark >= 50 ? 'success' : 'danger') + '">' + avgMark + '%</span>' : '<span class="text-muted">No exams</span>') + '</td>' +
                '</tr>';
        }).join('');

        App.openModal('Class: ' + cls.name,
            '<div class="info-block">' +
            '<div class="info-row"><span class="info-key">Subject</span><span class="info-val">' + (sub ? sub.name : '—') + '</span></div>' +
            '<div class="info-row"><span class="info-key">Total Students</span><span class="info-val">' + enrollments.length + '</span></div>' +
            '</div>' +
            '<div class="table-wrap"><table><thead><tr><th>Student</th><th>Attendance</th><th>Fees Paid</th><th>Avg Mark</th></tr></thead>' +
            '<tbody>' + (rows || '<tr class="empty-row"><td colspan="4">No students enrolled</td></tr>') + '</tbody></table></div>'
        );
    }

    // ── Timetable ──
    function timetable() {
        var user = Auth.currentUser();
        var weekOf = Utils.currentWeekStart();
        var classes = DB.classesByTeacher(user.id);

        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Weekly Timetable</h1>' +
            '<div style="display:flex;align-items:center;gap:12px">' +
            '<span class="text-muted">Week of ' + Utils.fmtDate(weekOf) + '</span>' +
            '<button class="btn btn-primary" onclick="TeacherPage.saveTimetable(\'' + weekOf + '\')">💾 Save Timetable</button>' +
            '</div></div>' +
            (classes.length ?
                '<div class="card"><p class="text-muted mb-4">Click a cell to assign a class to that time slot.</p>' +
                renderTTGrid(user.id, weekOf, classes) +
                '</div>' :
                '<div class="card"><p class="text-muted">No classes assigned yet.</p></div>'
            );
    }

    function renderTTGrid(teacherId, weekOf, classes) {
        var slots = DB.slotsByTeacherWeek(teacherId, weekOf);
        var times = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
        var html = '<div class="tt-grid">' +
            '<div class="tt-header"></div>' +
            Utils.DAYS.map(function (d) { return '<div class="tt-header">' + d + '</div>'; }).join('');

        times.forEach(function (time) {
            html += '<div class="tt-time">' + time + '</div>';
            for (var d = 0; d < 6; d++) {
                var slot = slots.find(function (s) { return s.day === d && s.startTime === time; });
                var cls = slot ? DB.findClass(slot.classId) : null;
                html += '<div class="tt-cell' + (slot ? ' filled' : '') + '" ' +
                    'onclick="TeacherPage.ttCellClick(' + d + ',\'' + time + '\',\'' + weekOf + '\',\'' + teacherId + '\')">' +
                    (cls ? '<div class="tt-slot-label">' + Utils.escHtml(cls.name) + '</div>' +
                        '<div class="tt-slot-sub">' + time + '</div>' : '') +
                    '</div>';
            }
        });
        return html + '</div>';
    }

    function ttCellClick(day, time, weekOf, teacherId) {
        var classes = DB.classesByTeacher(teacherId);
        var existing = DB.slotsByTeacherWeek(teacherId, weekOf).find(function (s) { return s.day == day && s.startTime === time; });
        var options = '<option value="">-- Clear slot --</option>' +
            classes.map(function (c) { return '<option value="' + c.id + '"' + (existing && existing.classId === c.id ? ' selected' : '') + '>' + Utils.escHtml(c.name) + '</option>'; }).join('');
        App.openModal('Set Slot — ' + Utils.SHORT_DAYS[day] + ' ' + time,
            '<div class="form-group"><label class="form-label">Assign Class</label>' +
            '<select class="form-control" id="tt-select">' + options + '</select></div>',
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="TeacherPage.saveSlot(\'' + teacherId + '\',' + day + ',\'' + time + '\',\'' + weekOf + '\')">Save</button>'
        );
    }

    function saveSlot(tid, day, time, weekOf) {
        var cid = document.getElementById('tt-select').value;
        if (cid) {
            DB.upsertTimetableSlot({ teacherId: tid, classId: cid, day: parseInt(day), startTime: time, weekOf: weekOf });
        } else {
            var s = DB.getTimetableSlots();
            var idx = s.findIndex(function (x) { return x.teacherId === tid && x.day == day && x.startTime === time && x.weekOf === weekOf; });
            if (idx >= 0) { var st = DB.get(); st.timetableSlots.splice(idx, 1); localStorage.setItem('educore_data', JSON.stringify(st)); }
        }
        App.closeModal(); timetable();
    }

    function saveTimetable(weekOf) {
        App.toast('Timetable saved for week of ' + Utils.fmtDate(weekOf), 'success');
    }

    // ── Exams ──
    function exams() {
        var user = Auth.currentUser();
        var classes = DB.classesByTeacher(user.id);
        var allExams = DB.getExams().filter(function (e) { return classes.some(function (c) { return c.id === e.classId; }); });

        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Exams & Papers</h1>' +
            '<button class="btn btn-primary" onclick="TeacherPage.addExamModal()">➕ Schedule Exam</button></div>' +
            '<div class="card">' +
            '<div class="table-wrap"><table><thead><tr><th>Title</th><th>Class</th><th>Type</th><th>Date</th><th>Max Marks</th><th>Actions</th></tr></thead><tbody>' +
            (allExams.length ? allExams.map(function (ex) {
                var cls = DB.findClass(ex.classId);
                return '<tr><td><strong>' + Utils.escHtml(ex.title) + '</strong></td>' +
                    '<td>' + Utils.escHtml(cls ? cls.name : '—') + '</td>' +
                    '<td><span class="badge badge-info">' + Utils.capitalize(ex.type) + '</span></td>' +
                    '<td>' + Utils.fmtDate(ex.scheduledAt) + '</td>' +
                    '<td>' + Utils.escHtml(String(ex.maxMarks)) + '</td>' +
                    '<td class="td-actions">' +
                    '<button class="btn btn-sm btn-ghost" onclick="TeacherPage.enterMarksModal(\'' + ex.id + '\')">📝 Marks</button>' +
                    '<button class="btn btn-sm btn-danger" onclick="TeacherPage.deleteExam(\'' + ex.id + '\')">🗑️</button>' +
                    '</td></tr>';
            }).join('') : '<tr class="empty-row"><td colspan="6">No exams scheduled yet.</td></tr>') +
            '</tbody></table></div></div>';
    }

    function addExamModal() {
        var user = Auth.currentUser();
        var classes = DB.classesByTeacher(user.id);
        App.openModal('Schedule Exam / Paper',
            '<div class="form-group"><label class="form-label">Title *</label><input class="form-control" id="ex-title" placeholder="e.g. Mid Term Paper 1"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">Class *</label><select class="form-control" id="ex-class">' +
            '<option value="">Select class</option>' +
            classes.map(function (c) { return '<option value="' + c.id + '">' + Utils.escHtml(c.name) + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="form-group"><label class="form-label">Type</label><select class="form-control" id="ex-type">' +
            '<option value="paper">Paper</option><option value="term-test">Term Test</option><option value="quiz">Quiz</option></select></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label class="form-label">Date *</label><input class="form-control" id="ex-date" type="date"></div>' +
            '<div class="form-group"><label class="form-label">Max Marks *</label><input class="form-control" id="ex-maxmarks" type="number" placeholder="100" min="1"></div>' +
            '</div>',
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="TeacherPage.saveExam()">Schedule</button>'
        );
    }

    function saveExam() {
        var title = document.getElementById('ex-title').value.trim();
        var cid = document.getElementById('ex-class').value;
        var date = document.getElementById('ex-date').value;
        var max = parseInt(document.getElementById('ex-maxmarks').value) || 100;
        if (!title || !cid || !date) { App.toast('All fields required', 'danger'); return; }
        DB.addExam({ title, classId: cid, type: document.getElementById('ex-type').value, scheduledAt: date, maxMarks: max, teacherId: Auth.currentUser().id });
        App.closeModal(); App.toast('Exam scheduled', 'success'); exams();
    }

    function enterMarksModal(examId) {
        var exam = DB.getExams().find(function (e) { return e.id === examId; });
        var enrollments = DB.enrollmentsByClass(exam.classId);
        var users = DB.getUsers();
        var html = '<p class="text-muted mb-4"><strong>' + Utils.escHtml(exam.title) + '</strong> — Max: ' + exam.maxMarks + '</p>';
        if (!enrollments.length) { html += '<p class="text-muted">No students enrolled.</p>'; }
        else {
            html += '<div style="display:flex;flex-direction:column;gap:10px">' + enrollments.map(function (e) {
                var st = users.find(function (u) { return u.id === e.studentId; });
                var res = DB.resultByExamStudent(examId, e.studentId);
                if (!st) return '';
                return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
                    '<span style="flex:1">' + Utils.escHtml(st.name) + '</span>' +
                    '<input type="number" class="form-control" style="width:100px" id="mk-' + e.studentId + '" ' +
                    'placeholder="— " min="0" max="' + exam.maxMarks + '" value="' + (res ? res.marks : '') + '"></div>';
            }).join('') + '</div>';
        }
        App.openModal('Enter Marks', html,
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="TeacherPage.saveMarks(\'' + examId + '\')">💾 Save Marks</button>'
        );
    }

    function saveMarks(examId) {
        var exam = DB.getExams().find(function (e) { return e.id === examId; });
        var enrollments = DB.enrollmentsByClass(exam.classId);
        var count = 0;
        enrollments.forEach(function (e) {
            var inp = document.getElementById('mk-' + e.studentId);
            if (inp && inp.value !== '') {
                var marks = Math.min(parseFloat(inp.value) || 0, exam.maxMarks);
                var pct = Utils.pct(marks, exam.maxMarks);
                var grade = Utils.getGrade(pct).grade;
                DB.upsertExamResult({ examId, studentId: e.studentId, marks, grade });
                count++;
            }
        });
        App.closeModal(); App.toast('Saved marks for ' + count + ' student(s)', 'success');
    }

    function deleteExam(id) {
        App.confirm('Delete this exam and all marks?', function () { DB.deleteExam(id); exams(); });
    }

    // ── Resources ──
    function resources() {
        var user = Auth.currentUser();
        var classes = DB.classesByTeacher(user.id);
        var allRes = DB.getResources().filter(function (r) { return r.teacherId === user.id; });

        document.getElementById('page-content').innerHTML =
            '<div class="page-header"><h1 class="page-title">Notes & Resources</h1>' +
            '<button class="btn btn-primary" onclick="TeacherPage.uploadModal()">⬆️ Upload</button></div>' +
            '<div class="grid-auto">' +
            (allRes.length ? allRes.map(function (r) {
                var cls = DB.findClass(r.classId);
                return '<div class="card">' +
                    '<div class="flex items-c gap-3 mb-2"><span style="font-size:28px">' + (r.fileType.includes('pdf') ? '📄' : '📎') + '</span>' +
                    '<div><strong>' + Utils.escHtml(r.title) + '</strong><div class="text-sm text-muted">' + Utils.escHtml(cls ? cls.name : '—') + '</div></div></div>' +
                    '<div class="text-sm text-muted mb-4">' + Utils.fmtDate(r.uploadedAt) + '</div>' +
                    '<div class="flex gap-2">' +
                    '<button class="btn btn-ghost btn-sm" onclick="TeacherPage.downloadRes(\'' + r.id + '\')">⬇️ Download</button>' +
                    '<button class="btn btn-danger btn-sm" onclick="TeacherPage.deleteRes(\'' + r.id + '\')">🗑️</button>' +
                    '</div></div>';
            }).join('') : '<div class="card"><p class="text-muted">No resources uploaded yet.</p></div>') +
            '</div>';
    }

    function uploadModal() {
        var user = Auth.currentUser();
        var classes = DB.classesByTeacher(user.id);
        App.openModal('Upload Resource',
            '<div class="form-group"><label class="form-label">Title *</label><input class="form-control" id="res-title" placeholder="e.g. Chapter 3 Notes"></div>' +
            '<div class="form-group"><label class="form-label">Class *</label><select class="form-control" id="res-class">' +
            '<option value="">Select class</option>' +
            classes.map(function (c) { return '<option value="' + c.id + '">' + Utils.escHtml(c.name) + '</option>'; }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">File (max 5MB) *</label><input class="form-control" id="res-file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png,.txt" style="padding:8px"></div>' +
            '<p class="form-hint">⚠️ Files are stored locally in your browser. Max 5MB.</p>',
            '<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="TeacherPage.saveResource()">Upload</button>'
        );
    }

    function saveResource() {
        var user = Auth.currentUser();
        var title = document.getElementById('res-title').value.trim();
        var cid = document.getElementById('res-class').value;
        var file = document.getElementById('res-file').files[0];
        if (!title || !cid || !file) { App.toast('All fields required', 'danger'); return; }
        if (file.size > 5 * 1024 * 1024) { App.toast('File too large. Max 5MB.', 'danger'); return; }
        var reader = new FileReader();
        reader.onload = function (ev) {
            DB.addResource({ title, classId: cid, teacherId: user.id, fileType: file.type, fileName: file.name, data: ev.target.result });
            App.closeModal(); App.toast('Resource uploaded', 'success'); resources();
        };
        reader.readAsDataURL(file);
    }

    function downloadRes(id) {
        var r = DB.getResources().find(function (x) { return x.id === id; });
        if (!r || !r.data) { App.toast('File not found', 'danger'); return; }
        var a = document.createElement('a'); a.href = r.data; a.download = r.fileName || r.title;
        a.click();
    }

    function deleteRes(id) {
        App.confirm('Delete this resource?', function () { DB.deleteResource(id); App.toast('Deleted', 'warning'); resources(); });
    }

    return { render, classDetail, ttCellClick, saveSlot, saveTimetable, addExamModal, saveExam, enterMarksModal, saveMarks, deleteExam, uploadModal, saveResource, downloadRes, deleteRes };
})();
