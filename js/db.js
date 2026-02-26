/* ======================================================
   db.js — LocalStorage Data Layer
   ====================================================== */
var DB = (function () {

    var KEY = 'educore_data';

    function load() {
        try {
            var raw = localStorage.getItem(KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { }
        return freshStore();
    }

    function freshStore() {
        return {
            institution: null,
            users: [],
            subjects: [],
            classes: [],
            enrollments: [],
            attendanceSessions: [],
            attendanceRecords: [],
            feeCollections: [],
            exams: [],
            examResults: [],
            resources: [],
            timetableSlots: [],
            notifications: []
        };
    }

    function save(store) {
        localStorage.setItem(KEY, JSON.stringify(store));
    }

    function get() { return load(); }

    // ── Institution ──
    function getInstitution() { return load().institution; }
    function saveInstitution(data) {
        var s = load(); s.institution = data; save(s);
    }

    // ── Users ──
    function getUsers() { return load().users; }
    function addUser(u) {
        var s = load(); u.id = u.id || Utils.genId(); u.createdAt = u.createdAt || new Date().toISOString();
        s.users.push(u); save(s); return u;
    }
    function updateUser(id, changes) {
        var s = load(); s.users = s.users.map(function (u) { return u.id === id ? Object.assign({}, u, changes) : u; });
        save(s);
    }
    function deleteUser(id) {
        var s = load(); s.users = s.users.filter(function (u) { return u.id !== id; }); save(s);
    }
    function findUser(fn) { return load().users.find(fn); }
    function filterUsers(fn) { return load().users.filter(fn); }
    function usersByRole(role) { return load().users.filter(function (u) { return u.role === role && u.status !== 'inactive'; }); }

    // ── Subjects ──
    function getSubjects() { return load().subjects; }
    function addSubject(sub) {
        var s = load(); sub.id = sub.id || Utils.genId(); s.subjects.push(sub); save(s); return sub;
    }
    function deleteSubject(id) {
        var s = load(); s.subjects = s.subjects.filter(function (x) { return x.id !== id; }); save(s);
    }

    // ── Classes ──
    function getClasses() { return load().classes; }
    function addClass(c) {
        var s = load(); c.id = c.id || Utils.genId(); c.createdAt = new Date().toISOString();
        s.classes.push(c); save(s); return c;
    }
    function updateClass(id, changes) {
        var s = load(); s.classes = s.classes.map(function (c) { return c.id === id ? Object.assign({}, c, changes) : c; });
        save(s);
    }
    function deleteClass(id) {
        var s = load(); s.classes = s.classes.filter(function (c) { return c.id !== id; }); save(s);
    }
    function findClass(id) { return load().classes.find(function (c) { return c.id === id; }); }
    function classesByTeacher(tid) { return load().classes.filter(function (c) { return c.teacherId === tid; }); }

    // ── Enrollments ──
    function getEnrollments() { return load().enrollments; }
    function addEnrollment(e) {
        var s = load(); e.id = e.id || Utils.genId(); e.enrolledAt = new Date().toISOString(); e.status = 'active';
        s.enrollments.push(e); save(s); return e;
    }
    function deleteEnrollment(id) {
        var s = load(); s.enrollments = s.enrollments.filter(function (e) { return e.id !== id; }); save(s);
    }
    function enrollmentsByClass(cid) { return load().enrollments.filter(function (e) { return e.classId === cid && e.status === 'active'; }); }
    function enrollmentsByStudent(sid) { return load().enrollments.filter(function (e) { return e.studentId === sid && e.status === 'active'; }); }
    function isEnrolled(sid, cid) { return load().enrollments.some(function (e) { return e.studentId === sid && e.classId === cid && e.status === 'active'; }); }

    // ── Attendance Sessions ──
    function getAttendanceSessions() { return load().attendanceSessions; }
    function addAttendanceSession(sess) {
        var s = load(); sess.id = sess.id || Utils.genId(); s.attendanceSessions.push(sess); save(s); return sess;
    }
    function sessionExists(cid, date) { return load().attendanceSessions.find(function (s) { return s.classId === cid && s.date === date; }); }
    function sessionsByClass(cid) { return load().attendanceSessions.filter(function (s) { return s.classId === cid; }); }

    // ── Attendance Records ──
    function getAttendanceRecords() { return load().attendanceRecords; }
    function addAttendanceRecord(r) {
        var s = load(); r.id = r.id || Utils.genId(); s.attendanceRecords.push(r); save(s); return r;
    }
    function updateAttendanceRecord(sessId, studId, status) {
        var s = load();
        var idx = s.attendanceRecords.findIndex(function (r) { return r.sessionId === sessId && r.studentId === studId; });
        if (idx >= 0) s.attendanceRecords[idx].status = status;
        else s.attendanceRecords.push({ id: Utils.genId(), sessionId: sessId, studentId: studId, status: status });
        save(s);
    }
    function recordsBySession(sessId) { return load().attendanceRecords.filter(function (r) { return r.sessionId === sessId; }); }
    function studentAttendanceStats(studId, cid) {
        var sessions = sessionsByClass(cid);
        var sessIds = sessions.map(function (s) { return s.id; });
        var records = load().attendanceRecords.filter(function (r) { return sessIds.indexOf(r.sessionId) >= 0 && r.studentId === studId; });
        var present = records.filter(function (r) { return r.status === 'present' || r.status === 'late'; }).length;
        return { total: sessions.length, present: present, pct: Utils.pct(present, sessions.length) };
    }

    // ── Fee Collections ──
    function getFeeCollections() { return load().feeCollections; }
    function addFeeCollection(fc) {
        var s = load(); fc.id = fc.id || Utils.genId(); fc.createdAt = new Date().toISOString();
        fc.receiptNo = fc.receiptNo || Utils.receiptNumber();
        s.feeCollections.push(fc); save(s); return fc;
    }
    function feesByStudent(sid) { return load().feeCollections.filter(function (f) { return f.studentId === sid; }); }
    function feesByClass(cid) { return load().feeCollections.filter(function (f) { return f.classId === cid; }); }
    function totalFeesByClass(cid) { return feesByClass(cid).reduce(function (a, f) { return a + parseFloat(f.amount || 0); }, 0); }

    // ── Exams ──
    function getExams() { return load().exams; }
    function addExam(ex) {
        var s = load(); ex.id = ex.id || Utils.genId(); s.exams.push(ex); save(s); return ex;
    }
    function updateExam(id, changes) {
        var s = load(); s.exams = s.exams.map(function (e) { return e.id === id ? Object.assign({}, e, changes) : e; }); save(s);
    }
    function deleteExam(id) {
        var s = load(); s.exams = s.exams.filter(function (e) { return e.id !== id; }); save(s);
    }
    function examsByClass(cid) { return load().exams.filter(function (e) { return e.classId === cid; }); }

    // ── Exam Results ──
    function getExamResults() { return load().examResults; }
    function upsertExamResult(r) {
        var s = load();
        var idx = s.examResults.findIndex(function (x) { return x.examId === r.examId && x.studentId === r.studentId; });
        if (idx >= 0) s.examResults[idx] = Object.assign({}, s.examResults[idx], r);
        else { r.id = Utils.genId(); s.examResults.push(r); }
        save(s);
    }
    function resultsByExam(eid) { return load().examResults.filter(function (r) { return r.examId === eid; }); }
    function resultsByStudent(sid) { return load().examResults.filter(function (r) { return r.studentId === sid; }); }
    function resultByExamStudent(eid, sid) { return load().examResults.find(function (r) { return r.examId === eid && r.studentId === sid; }); }

    // ── Resources ──
    function getResources() { return load().resources; }
    function addResource(res) {
        var s = load(); res.id = res.id || Utils.genId(); res.uploadedAt = new Date().toISOString();
        s.resources.push(res); save(s); return res;
    }
    function deleteResource(id) {
        var s = load(); s.resources = s.resources.filter(function (r) { return r.id !== id; }); save(s);
    }
    function resourcesByClass(cid) { return load().resources.filter(function (r) { return r.classId === cid; }); }

    // ── Timetable Slots ──
    function getTimetableSlots() { return load().timetableSlots; }
    function upsertTimetableSlot(slot) {
        var s = load();
        var idx = s.timetableSlots.findIndex(function (x) { return x.classId === slot.classId && x.weekOf === slot.weekOf && x.day === slot.day; });
        if (idx >= 0) s.timetableSlots[idx] = Object.assign({}, s.timetableSlots[idx], slot);
        else { slot.id = Utils.genId(); s.timetableSlots.push(slot); }
        save(s);
    }
    function slotsByTeacherWeek(tid, weekOf) {
        return load().timetableSlots.filter(function (s) { return s.teacherId === tid && s.weekOf === weekOf; });
    }
    function slotsByClassWeek(cid, weekOf) {
        return load().timetableSlots.filter(function (s) { return s.classId === cid && s.weekOf === weekOf; });
    }

    // ── Notifications ──
    function getNotifications() { return load().notifications; }
    function addNotification(n) {
        var s = load(); n.id = Utils.genId(); n.createdAt = new Date().toISOString(); n.isRead = false;
        s.notifications.push(n); save(s); return n;
    }
    function markNotifRead(id) {
        var s = load();
        s.notifications = s.notifications.map(function (n) { return n.id === id ? Object.assign({}, n, { isRead: true }) : n; });
        save(s);
    }
    function markAllNotifsRead() {
        var s = load();
        s.notifications = s.notifications.map(function (n) { return Object.assign({}, n, { isRead: true }); });
        save(s);
    }
    function notifsByUser(uid) { return load().notifications.filter(function (n) { return n.userId === uid; }).reverse(); }
    function unreadCount(uid) { return notifsByUser(uid).filter(function (n) { return !n.isRead; }).length; }

    // ── Reset ──
    function resetAll() { localStorage.removeItem(KEY); }

    return {
        get, getInstitution, saveInstitution,
        getUsers, addUser, updateUser, deleteUser, findUser, filterUsers, usersByRole,
        getSubjects, addSubject, deleteSubject,
        getClasses, addClass, updateClass, deleteClass, findClass, classesByTeacher,
        getEnrollments, addEnrollment, deleteEnrollment, enrollmentsByClass, enrollmentsByStudent, isEnrolled,
        getAttendanceSessions, addAttendanceSession, sessionExists, sessionsByClass,
        getAttendanceRecords, addAttendanceRecord, updateAttendanceRecord, recordsBySession, studentAttendanceStats,
        getFeeCollections, addFeeCollection, feesByStudent, feesByClass, totalFeesByClass,
        getExams, addExam, updateExam, deleteExam, examsByClass,
        getExamResults, upsertExamResult, resultsByExam, resultsByStudent, resultByExamStudent,
        getResources, addResource, deleteResource, resourcesByClass,
        getTimetableSlots, upsertTimetableSlot, slotsByTeacherWeek, slotsByClassWeek,
        getNotifications, addNotification, markNotifRead, markAllNotifsRead, notifsByUser, unreadCount,
        resetAll
    };
})();
