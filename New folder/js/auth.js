/* ======================================================
   auth.js — Authentication & Session Management
   ====================================================== */
var Auth = (function () {

    var SESSION_KEY = 'educore_session';

    function getSession() {
        try {
            var raw = sessionStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function setSession(user) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }

    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    function login(email, password) {
        email = email.trim().toLowerCase();
        var hashed = Utils.hashPwd(password);
        var user = DB.findUser(function (u) {
            return u.email.toLowerCase() === email && u.passwordHash === hashed && u.status !== 'inactive';
        });
        if (!user) return null;
        setSession(user);
        return user;
    }

    function logout() {
        clearSession();
        window.location.hash = '#login';
        location.reload();
    }

    function isLoggedIn() {
        return !!getSession();
    }

    function currentUser() {
        return getSession();
    }

    function hasRole(role) {
        var sess = getSession();
        return sess && sess.role === role;
    }

    function requireAuth() {
        if (!isLoggedIn()) {
            window.location.hash = '#login';
            return false;
        }
        return true;
    }

    function createOwner(data) {
        return DB.addUser({
            id: Utils.genId(),
            role: 'owner',
            name: data.name,
            email: data.email.trim().toLowerCase(),
            phone: data.phone || '',
            passwordHash: Utils.hashPwd(data.password),
            status: 'active',
            createdAt: new Date().toISOString()
        });
    }

    function createUser(data) {
        // Creates any role user; password defaults to 'educore123'
        var pwd = data.password || 'educore123';
        return DB.addUser({
            id: Utils.genId(),
            role: data.role,
            name: data.name,
            email: data.email.trim().toLowerCase(),
            phone: data.phone || '',
            passwordHash: Utils.hashPwd(pwd),
            status: 'active',
            assignedTo: data.assignedTo || null,  // teacher id for card markers
            createdAt: new Date().toISOString()
        });
    }

    return {
        getSession, setSession, clearSession,
        login, logout, isLoggedIn, currentUser, hasRole,
        requireAuth, createOwner, createUser
    };
})();
