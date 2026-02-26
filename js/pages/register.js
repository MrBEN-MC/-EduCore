/* ======================================================
   register.js — Institution Registration Wizard (3 Steps)
   ====================================================== */
var RegisterPage = (function () {

    var state = { step: 1, inst: {}, owner: {} };

    function render() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('dashboard-container').classList.add('hidden');
        document.getElementById('auth-content').innerHTML = html();
    }

    function html() {
        return '<div class="auth-bg"><div class="auth-card">' +
            '<div class="auth-logo"><span class="logo-big">🎓</span><h1>EduCore</h1><p>Register your institution</p></div>' +
            '<div class="wizard-steps">' +
            '<div class="wizard-step ' + (state.step === 1 ? 'active' : '') + '" id="ws1">1. Institution</div>' +
            '<div class="wizard-step ' + (state.step === 2 ? 'active' : '') + '" id="ws2">2. Owner</div>' +
            '<div class="wizard-step ' + (state.step === 3 ? 'active' : '') + '" id="ws3">3. Password</div>' +
            '</div>' +
            '<div id="wizard-body">' + stepHtml() + '</div>' +
            '</div></div>';
    }

    function stepHtml() {
        if (state.step === 1) return `
      <div class="form-group">
        <label class="form-label">Institution Name *</label>
        <input class="form-control" id="r-instname" placeholder="e.g. Bright Future Academy" value="${Utils.escHtml(state.inst.name || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Institution Type</label>
        <select class="form-control" id="r-insttype">
          <option value="tuition" ${state.inst.type === 'tuition' ? 'selected' : ''}>Tuition Center</option>
          <option value="vocational" ${state.inst.type === 'vocational' ? 'selected' : ''}>Vocational Institute</option>
          <option value="other" ${state.inst.type === 'other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Address *</label>
        <textarea class="form-control" id="r-address" rows="2" placeholder="Full address">${Utils.escHtml(state.inst.address || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Phone *</label>
          <input class="form-control" id="r-instphone" placeholder="0771234567" value="${Utils.escHtml(state.inst.phone || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-control" id="r-instemail" placeholder="info@institution.com" value="${Utils.escHtml(state.inst.email || '')}">
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="RegisterPage.step1Next()">Next →</button>
      </div>`;

        if (state.step === 2) return `
      <div class="form-group">
        <label class="form-label">Owner Full Name *</label>
        <input class="form-control" id="r-ownername" placeholder="Your full name" value="${Utils.escHtml(state.owner.name || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Owner Email *</label>
        <input class="form-control" id="r-owneremail" type="email" placeholder="owner@email.com" value="${Utils.escHtml(state.owner.email || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-control" id="r-ownerphone" placeholder="0771234567" value="${Utils.escHtml(state.owner.phone || '')}">
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="RegisterPage.goStep(1)">← Back</button>
        <button class="btn btn-primary" onclick="RegisterPage.step2Next()">Next →</button>
      </div>`;

        if (state.step === 3) return `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:40px">🔐</div>
        <p class="text-muted" style="margin-top:8px">Set a secure password for the owner account</p>
      </div>
      <div class="form-group">
        <label class="form-label">Password *</label>
        <input class="form-control" id="r-pwd" type="password" placeholder="Min 6 characters">
      </div>
      <div class="form-group">
        <label class="form-label">Confirm Password *</label>
        <input class="form-control" id="r-pwd2" type="password" placeholder="Repeat password">
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="RegisterPage.goStep(2)">← Back</button>
        <button class="btn btn-primary" onclick="RegisterPage.finish()">🎓 Register Institution</button>
      </div>`;
    }

    function rerender() {
        document.getElementById('auth-content').innerHTML = html();
    }

    function goStep(n) { state.step = n; rerender(); }

    function step1Next() {
        var name = document.getElementById('r-instname').value.trim();
        var addr = document.getElementById('r-address').value.trim();
        var phone = document.getElementById('r-instphone').value.trim();
        if (!name) { App.toast('Institution name is required', 'danger'); return; }
        if (!addr) { App.toast('Address is required', 'danger'); return; }
        if (!phone) { App.toast('Phone is required', 'danger'); return; }
        state.inst = {
            name: name,
            type: document.getElementById('r-insttype').value,
            address: addr,
            phone: phone,
            email: document.getElementById('r-instemail').value.trim()
        };
        goStep(2);
    }

    function step2Next() {
        var name = document.getElementById('r-ownername').value.trim();
        var email = document.getElementById('r-owneremail').value.trim().toLowerCase();
        if (!name) { App.toast('Owner name is required', 'danger'); return; }
        if (!email || !email.includes('@')) { App.toast('Valid email is required', 'danger'); return; }
        var exists = DB.findUser(function (u) { return u.email === email; });
        if (exists) { App.toast('Email already exists', 'danger'); return; }
        state.owner = { name, email, phone: document.getElementById('r-ownerphone').value.trim() };
        goStep(3);
    }

    function finish() {
        var pwd = document.getElementById('r-pwd').value;
        var pwd2 = document.getElementById('r-pwd2').value;
        if (pwd.length < 6) { App.toast('Password must be at least 6 characters', 'danger'); return; }
        if (pwd !== pwd2) { App.toast('Passwords do not match', 'danger'); return; }

        // Create institution
        var institution = Object.assign({}, state.inst, { id: Utils.genId(), createdAt: new Date().toISOString() });
        DB.saveInstitution(institution);

        // Create owner user
        var owner = Auth.createOwner({ name: state.owner.name, email: state.owner.email, phone: state.owner.phone, password: pwd });

        // Seed default subjects
        ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Physics', 'Chemistry', 'Biology', 'Commerce', 'ICT'].forEach(function (sub) {
            DB.addSubject({ id: Utils.genId(), name: sub, code: sub.substring(0, 3).toUpperCase() });
        });

        // Login
        Auth.setSession(owner);
        App.toast('Institution registered successfully! Welcome, ' + owner.name + '!', 'success');
        state = { step: 1, inst: {}, owner: {} };
        App.navigate('owner');
    }

    return { render, goStep, step1Next, step2Next, finish };
})();
