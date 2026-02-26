/* ======================================================
   utils.js — Helper Utilities
   ====================================================== */
var Utils = (function () {

    function genId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
    }

    function fmtDate(d) {
        if (!d) return '—';
        var dt = new Date(d);
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function fmtDateTime(d) {
        if (!d) return '—';
        var dt = new Date(d);
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
            dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    function fmtMoney(n) {
        return 'Rs. ' + parseFloat(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function timeAgo(d) {
        if (!d) return '';
        var diff = Date.now() - new Date(d).getTime();
        var mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return mins + 'm ago';
        var hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        var days = Math.floor(hrs / 24);
        return days + 'd ago';
    }

    function getGrade(pct) {
        if (pct >= 90) return { grade: 'A+', label: 'Excellent', cls: 'success' };
        if (pct >= 80) return { grade: 'A', label: 'Very Good', cls: 'success' };
        if (pct >= 70) return { grade: 'B', label: 'Good', cls: 'info' };
        if (pct >= 60) return { grade: 'C', label: 'Average', cls: 'warning' };
        if (pct >= 50) return { grade: 'D', label: 'Pass', cls: 'warning' };
        return { grade: 'F', label: 'Fail', cls: 'danger' };
    }

    function pct(num, den) {
        if (!den) return 0;
        return Math.round((num / den) * 100);
    }

    function capitalize(s) {
        if (!s) return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function hashPwd(s) {
        // Simple deterministic hash — NOT cryptographically secure
        // For local offline use only
        var h = 0;
        for (var i = 0; i < s.length; i++) {
            h = Math.imul(31, h) + s.charCodeAt(i) | 0;
        }
        return 'h_' + Math.abs(h).toString(16);
    }

    function escHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function currentWeekStart() {
        var d = new Date();
        var day = d.getDay(); // 0=Sun
        var diff = (day === 0) ? -6 : 1 - day; // Monday
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().split('T')[0];
    }

    function todayISO() {
        return new Date().toISOString().split('T')[0];
    }

    function monthOptions() {
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return months.map(function (m, i) {
            return '<option value="' + (i + 1) + '">' + m + '</option>';
        }).join('');
    }

    function yearOptions() {
        var y = new Date().getFullYear();
        var opts = '';
        for (var i = y - 1; i <= y + 2; i++) opts += '<option value="' + i + '"' + (i === y ? ' selected' : '') + '>' + i + '</option>';
        return opts;
    }

    function receiptNumber() {
        return 'RCP-' + Date.now().toString(36).toUpperCase();
    }

    return {
        genId, fmtDate, fmtDateTime, fmtMoney, timeAgo,
        getGrade, pct, capitalize, hashPwd, escHtml,
        DAYS, SHORT_DAYS, currentWeekStart, todayISO,
        monthOptions, yearOptions, receiptNumber
    };
})();
