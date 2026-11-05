
        async function updatePasswordSecure() {
            const currentPass = document.getElementById('current-password').value;
            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-password').value;
            const btn = document.getElementById('update-pwd-btn');

            showSettingsMsg('settings-message', '', '');

            if (!currentPass || !newPass || !confirmPass) {
                showSettingsMsg('settings-message', 'Please fill all fields', 'error');
                return;
            }

            if (newPass !== confirmPass) {
                showSettingsMsg('settings-message', 'New passwords do not match', 'error');
                return;
            }

            if (newPass.length < 8) {
                showSettingsMsg('settings-message', 'Password must be at least 8 characters', 'error');
                return;
            }

            const hasNumber = /[0-9]/.test(newPass);
            const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPass);
            
            if (!hasNumber || !hasSpecial) {
                showSettingsMsg('settings-message', 'Password must contain at least one number and one special character (!@#$%^&*)', 'error');
                return;
            }

            if (currentPass === newPass) {
                showSettingsMsg('settings-message', 'New password must be different from current password', 'error');
                return;
            }

            const confirmChange = await showConfirmModal();

            if (!confirmChange) return;

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> VERIFYING & UPDATING...';
            showSettingsMsg('settings-message', 'Step 1/3: Verifying your identity...', 'loading');

            try {
                const user = window.firebaseAuth.currentUser;
                const email = user.email;
                
                if (!window.firebase.reauthenticateWithCredential) {
                    const { reauthenticateWithCredential, EmailAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                    window.firebase.reauthenticateWithCredential = reauthenticateWithCredential;
                    window.firebase.EmailAuthProvider = EmailAuthProvider;
                }

                const credential = window.firebase.EmailAuthProvider.credential(email, currentPass);
                
                try {
                    await window.firebase.reauthenticateWithCredential(user, credential);
                } catch (authError) {
                    throw new Error('WRONG_PASSWORD');
                }

                showSettingsMsg('settings-message', 'Step 2/3: Updating password securely...', 'loading');
                await window.firebase.updatePassword(user, newPass);

                // ── FORCE LOGOUT ALL OTHER DEVICES ────────────────────────────
                // Write a passwordChanged flag in Realtime DB.
                // All other active sessions are listening to this node and will
                // auto-logout when they detect it. The current device clears it
                // after writing so it doesn't log itself out too.
                try {
                    const pwChangedRef = window.firebase.dbRef(
                        window.firebaseRealtimeDb, `password_changed/${user.uid}`
                    );
                    await window.firebase.set(pwChangedRef, {
                        changedAt: Date.now(),
                        changedBy: state.deviceFingerprint || 'unknown'
                    });
                } catch(e) {
                }
                // ──────────────────────────────────────────────────────────────

                showSettingsMsg('settings-message', 'Step 3/3: Password updated! Logging out all sessions...', 'success');
                
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                document.getElementById('pwd-strength').innerHTML = '';

                setTimeout(() => {
                    showSuccessModal();
                }, 500);

            } catch (error) {
                console.error('❌ Password update error:', error);
                
                if (error.message === 'WRONG_PASSWORD') {
                    showSettingsMsg('settings-message', 'Current password is incorrect. Please try again.', 'error');
                } else if (error.code === 'auth/requires-recent-login') {
                    showSettingsMsg('settings-message', 'For security, please log out and log back in before changing your password.', 'error');
                } else {
                    showSettingsMsg('settings-message', 'Password update failed: ' + error.message, 'error');
                }
                
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-key"></i> UPDATE PASSWORD';
            }
        }

        async function updatePassword() {
            await updatePasswordSecure();
        }

        function applyTheme(mode) {
            if (mode === 'dark') {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
            updateSettingsThemeButtons();
        }

        function updateSettingsThemeButtons() {
            const isDark = document.body.classList.contains('dark-mode');
            const lightBtn = document.getElementById('theme-light-btn');
            const darkBtn = document.getElementById('theme-dark-btn');
            if (lightBtn) lightBtn.classList.toggle('active', !isDark);
            if (darkBtn) darkBtn.classList.toggle('active', isDark);
        }

        function showSettingsMsg(elId, text, type) {
            const el = document.getElementById(elId);
            if (!el) return;
            el.className = 'settings-msg' + (type ? ' ' + type : '');
            el.innerHTML = type === 'loading'
                ? `<i class="fas fa-spinner fa-spin"></i> ${text}`
                : text;
            if (text && type !== 'loading') {
                setTimeout(() => { el.className = 'settings-msg'; el.innerHTML = ''; }, 4500);
            }
        }

        function populateSettingsTab() {
            const user = state.currentUser;
            if (!user) return;

            const savedName = user.displayName || localStorage.getItem('esh_displayname_' + user.email) || '';
            const displayName = savedName || user.email.split('@')[0];
            document.getElementById('settings-display-name').textContent = displayName;
            document.getElementById('current-display-name-text').textContent = savedName || '—';
            document.getElementById('settings-hero-email').textContent = user.email;
            document.getElementById('current-email').textContent = user.email;

            const uidEl = document.getElementById('settings-uid');
            if (uidEl) uidEl.textContent = user.uid ? user.uid.substring(0, 20) + '...' : '—';

            const fbStatus = document.getElementById('settings-firebase-status');
            if (fbStatus) {
                if (firebaseReady && window.firebaseDb) {
                    fbStatus.className = 'firebase-status-badge connected';
                    fbStatus.innerHTML = '<i class="fas fa-wifi"></i> Connected';
                } else {
                    fbStatus.className = 'firebase-status-badge disconnected';
                    fbStatus.innerHTML = '<i class="fas fa-wifi-slash"></i> Disconnected';
                }
            }

            const syncEl = document.getElementById('settings-last-sync');
            if (syncEl && state.lastSyncTimestamp) {
                syncEl.textContent = new Date(state.lastSyncTimestamp).toLocaleString('en-PH');
            } else if (syncEl) {
                syncEl.textContent = 'Not yet synced';
            }

            const projEl = document.getElementById('settings-total-projects');
            if (projEl) projEl.textContent = state.projects.length + ' projects';

            updateSettingsThemeButtons();

            const isAdmin = UserAccounts.isAdmin(user.email);

            const backupSection = document.getElementById('backup-recovery-section');
            if (backupSection && isAdmin) backupSection.innerHTML = showBackupRecoveryUI();
            
            const copyrightYear = document.getElementById('copyright-year');
            if (copyrightYear) copyrightYear.textContent = new Date().getFullYear();
            
            const backupRecoveryCard = document.getElementById('backup-recovery-card');

            if (!isAdmin) {
                if (backupRecoveryCard) backupRecoveryCard.style.display = 'none';
            } else {
                if (backupRecoveryCard) backupRecoveryCard.style.display = 'block';
                // ── CROSS-DEVICE FIX: Always pull fresh logbook from Firebase when
                // admin opens Settings — ensures logins from other devices appear here.
                if (typeof loadLogbookFromFirebase === 'function') {
                    loadLogbookFromFirebase();
                }
            }

            // ── EXECUTIVE DASHBOARD RESYNC — restricted to these two accounts only.
            // Card itself lives in the settings-accordion markup (index.html) right
            // alongside Display Name / Account Info / Change Password / Backup &
            // Recovery — we just toggle its visibility here based on email.
            const EXEC_RESYNC_ALLOWED_EMAILS = ['esh@scic.com.ph', 'esh@wda.com.ph'];
            const userEmailLower = (user.email || '').toLowerCase();
            const resyncCard = document.getElementById('exec-resync-card');
            if (resyncCard) {
                resyncCard.style.display = EXEC_RESYNC_ALLOWED_EMAILS.includes(userEmailLower) ? '' : 'none';
            }
        }

        setInterval(() => {
            const now = new Date();
            const dateEl = document.getElementById('live-date');
            const clockEl = document.getElementById('live-clock');
            if (dateEl) dateEl.innerText = now.toLocaleDateString('en-PH', {weekday:'long', year:'numeric', month:'long', day:'numeric'}).toUpperCase();
            if (clockEl) clockEl.innerText = now.toLocaleTimeString('en-PH');
        }, 1000);

       window.addEventListener('load', () => {
    initDarkMode();
    backupManager.init();
});
// ── Dialogs: one builder for every confirm/warning box. Styles live in styles.css (.ux-*). ──
function uxDialogHTML(o) {
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tone = { danger: 'ux-danger', ok: 'ux-ok', warn: 'ux-warn' }[o.tone] || 'ux-ok';
    const notes = (o.notes && o.notes.length)
        ? `<div class="ux-notes">${o.notes.map(n => `<div class="ux-note"><i class="fas ${n.icon}"></i><span>${n.html}</span></div>`).join('')}</div>`
        : '';
    const btns = (o.buttons || []).map(b =>
        `<button class="ux-btn${b.primary ? ' ux-btn-ok' : ''}"${b.key ? ` data-ux="${b.key}"` : ''}${b.id ? ` id="${b.id}"` : ''}${b.onclick ? ` onclick="${b.onclick}"` : ''}>${esc(b.text)}</button>`
    ).join('');
    return `
        <div class="ux-dialog ${tone}" role="${o.tone === 'ok' ? 'dialog' : 'alertdialog'}" aria-modal="true">
            <div class="ux-dialog-head">
                <i class="fas ${o.icon} ux-dialog-icon"></i>
                <h4 class="ux-dialog-title">${esc(o.title)}</h4>
            </div>
            <p class="ux-dialog-msg">${o.message || ''}</p>
            ${notes}
            ${o.extra || ''}
            <div class="ux-dialog-btns">${btns}</div>
        </div>`;
}

// Opens a dialog and returns a Promise: true = confirm, false = cancel or Esc.
// o: { tone:'danger'|'ok'|'warn', icon, title, message(html), notes:[{icon,html}],
//      confirmText, cancelText, id, zIndex, top, focus:'confirm'|'cancel' }
function uxDialog(o) {
    return new Promise((resolve) => {
        if (o.id) { const old = document.getElementById(o.id); if (old) old.remove(); }

        const overlay = document.createElement('div');
        overlay.className = 'ux-dialog-overlay' + (o.top ? ' ux-dialog-top' : '');
        if (o.id) overlay.id = o.id;
        if (o.zIndex) overlay.style.zIndex = String(o.zIndex);
        overlay.innerHTML = uxDialogHTML(Object.assign({}, o, {
            buttons: [
                { text: o.cancelText || 'Cancel', key: 'cancel' },
                { text: o.confirmText || 'OK',    key: 'confirm', primary: true }
            ]
        }));
        document.body.appendChild(overlay);

        const close = (result) => {
            document.removeEventListener('keydown', onKey, true);
            overlay.remove();
            resolve(result);
        };
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(false); } };
        document.addEventListener('keydown', onKey, true);

        const cancelBtn  = overlay.querySelector('[data-ux="cancel"]');
        const confirmBtn = overlay.querySelector('[data-ux="confirm"]');
        cancelBtn.onclick  = () => close(false);
        confirmBtn.onclick = () => close(true);
        (o.focus === 'cancel' ? cancelBtn : confirmBtn).focus();
    });
}
window.uxDialog = uxDialog;
window.uxDialogHTML = uxDialogHTML;

function showDeleteDialog(itemLabel, itemName) {
    // Temporarily lower any open full-screen modals so the confirmation
    // dialog is never obscured (they create new stacking contexts)
    const _modalsToLower = ['osh-nov-modal','env-nov-modal','got-compliance-modal','lta-modal','lta-entry-modal'];
    const _savedZIndex = {};
    _modalsToLower.forEach(id => {
        const el = document.getElementById(id);
        if (el) { _savedZIndex[id] = el.style.zIndex; el.style.zIndex = '999'; }
    });
    const _restoreModals = () => {
        _modalsToLower.forEach(id => {
            const el = document.getElementById(id);
            if (el && _savedZIndex[id] !== undefined) el.style.zIndex = _savedZIndex[id];
        });
    };
    return uxDialog({
        tone: 'danger',
        icon: 'fa-trash-alt',
        title: `Delete ${itemLabel}?`,
        message: `This will permanently delete <span class="ux-dialog-name">${itemName}</span>.`,
        confirmText: 'Delete',
        top: true,
        focus: 'cancel'
    }).then((result) => { _restoreModals(); return result; });
}

function showUndoToast(message, onUndo, duration = 5000) {
    const container = document.getElementById('toast-container') || (() => {
        const c = document.createElement('div');
        c.id = 'toast-container';
        document.body.appendChild(c);
        return c;
    })();

    const toast = document.createElement('div');
    toast.className = 'undo-toast';
    toast.innerHTML = `
        <div class="undo-toast-body">
            <div class="undo-toast-icon"><i class="fas fa-trash"></i></div>
            <div class="undo-toast-text">
                <div class="undo-toast-title">Deleted</div>
                <div class="undo-toast-msg">${message}</div>
            </div>
        </div>
        <button class="undo-btn" id="undo-btn-action">↩ Undo</button>
        <div class="undo-toast-progress" style="animation-duration:${duration}ms"></div>
    `;
    container.appendChild(toast);

    let undone = false;
    const timer = setTimeout(() => {
        if (!undone) {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 320);
        }
    }, duration);

    toast.querySelector('#undo-btn-action').onclick = () => {
        if (!undone) {
            undone = true;
            clearTimeout(timer);
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 320);
            onUndo();
        }
    };
}

function showModernDialog(title, message, isDanger = false, confirmText = null, cancelText = 'Cancel') {
    return uxDialog({
        tone: isDanger ? 'danger' : 'ok',
        icon: isDanger ? 'fa-exclamation-triangle' : (/log\s?out/i.test(title) ? 'fa-sign-out-alt' : 'fa-question-circle'),
        title,
        message,                               // html allowed, so callers can use <br> and <strong>
        confirmText: confirmText || (isDanger ? 'Delete' : 'OK'),
        cancelText
    });
}

function formatDateDMY(isoStr) {
    if (!isoStr) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parts[0];
    if (isNaN(d) || isNaN(m) || m < 0 || m > 11) return isoStr;
    return `${d} ${months[m]} ${y}`;
}

function calculateYearsOfService(hireDate) {
    if (!hireDate) return '';

    const hired = new Date(hireDate);
    const today = new Date();
    if (isNaN(hired)) return '';
    if (hired > today) return '';

    let years  = today.getFullYear() - hired.getFullYear();
    let months = today.getMonth() - hired.getMonth();
    let days   = today.getDate() - hired.getDate();

    if (days < 0) {
        months--;
        const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    if (years  >= 1) return `${years} Year${years !== 1 ? 's' : ''}`;
    if (months >= 1) return `${months} Month${months !== 1 ? 's' : ''}`;

    const totalDays = Math.floor((today - hired) / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(totalDays / 7);
    if (weeks >= 1) return `${weeks} Week${weeks !== 1 ? 's' : ''}`;

    return `${totalDays} Day${totalDays !== 1 ? 's' : ''}`;
}

function toggleToUpdateField(fieldId, checked) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    if (checked) {
        el.disabled = true;
        el.style.background = '#fff3e0';
        el.style.borderColor = '#ffb74d';
        el.style.color = '#e65100';
        if (el.tagName === 'INPUT') el.placeholder = 'To be updated...';
        if (el.tagName === 'TEXTAREA') el.placeholder = 'To be updated...';
        el.value = '';
    } else {
        el.disabled = false;
        el.style.background = '';
        el.style.borderColor = '';
        el.style.color = '';
        if (el.tagName === 'INPUT' && el.type === 'text') el.placeholder = el.getAttribute('data-ph') || '';
        if (el.tagName === 'TEXTAREA') el.placeholder = el.getAttribute('data-ph') || '';
    }
}

function openAddPersonnelModal() {
    if (state.userRole === 'manager' || state.userRole === 'doc_controller') { showToast('Manager accounts are view-only.', 'warning'); return; }
    const tuMap = {tu_middleName:'personnelMiddleNameInput',tu_position:'personnelPositionInput',tu_id:'personnelIdInput',tu_hired:'personnelHiredInput',tu_age:'personnelAgeInput',tu_email:'personnelEmailInput',tu_contact:'personnelContactInput',tu_address:'personnelAddressInput',tu_area:'personnelAreaInput'};
    Object.entries(tuMap).forEach(([cbId, fieldId]) => {
        const cb = document.getElementById(cbId);
        if (cb) { cb.checked = false; toggleToUpdateField(fieldId, false); }
    });
    const assignmentSelect = document.getElementById('personnelAssignmentInput');
    let options = '<option value="">Select Project</option>';
    if (state.isAdmin) {
        options += '<option value="Corporate Office">Corporate Office</option>';
    }
    
    if (state.projects && state.projects.length > 0) {
        let projectsList = state.projects;
        if (!state.isAdmin && state.userRegion) {
            projectsList = state.projects.filter(p => p.region === state.userRegion && p.region !== 'CORPORATE');
        } else if (state.isAdmin) {
            projectsList = state.projects; // Admin sees all (including CORPORATE)
        }
        
        projectsList.forEach(p => {
            if (p.region === 'CORPORATE') return; // Corporate Office covers this
            options += `<option value="${p.name}">${p.name}</option>`;
        });
    }
    
    assignmentSelect.innerHTML = options;
    
    document.getElementById('personnelLastNameInput').value = '';
    document.getElementById('personnelFirstNameInput').value = '';
    document.getElementById('personnelMiddleNameInput').value = '';
    document.getElementById('personnelNameExtInput').value = '';
    document.getElementById('personnelPositionInput').value = '';
    document.getElementById('personnelIdInput').value = '';
    document.getElementById('personnelHiredInput').value = '';
    document.getElementById('personnelAssignmentInput').value = '';
    document.getElementById('personnelAreaInput').value = '';
    document.getElementById('personnelAgeInput').value = '';
    document.getElementById('personnelGenderInput').value = '';
    document.getElementById('personnelEmailInput').value = '';
    document.getElementById('personnelContactInput').value = '';
    document.getElementById('personnelAddressInput').value = '';
    document.getElementById('personnelModalError').textContent = '';
    
    const _apm = document.getElementById('addPersonnelModal');
    eshModalShow(_apm);
}

function closeAddPersonnelModal() {
    const _apm = document.getElementById('addPersonnelModal');
    eshModalHide(_apm);
}

function confirmAddPersonnel() {
    const lastName = document.getElementById('personnelLastNameInput').value.trim().toUpperCase();
    const firstName = document.getElementById('personnelFirstNameInput').value.trim().toUpperCase();
    const middleName = document.getElementById('personnelMiddleNameInput').value.trim().toUpperCase();
    const nameExt = document.getElementById('personnelNameExtInput').value;
    
    const toUpdate = [];
    if (document.getElementById('tu_middleName')?.checked) toUpdate.push('middleName');
    if (document.getElementById('tu_position')?.checked) toUpdate.push('position');
    if (document.getElementById('tu_id')?.checked) toUpdate.push('id');
    if (document.getElementById('tu_hired')?.checked) toUpdate.push('hired');
    if (document.getElementById('tu_age')?.checked) toUpdate.push('age');
    if (document.getElementById('tu_email')?.checked) toUpdate.push('email');
    if (document.getElementById('tu_contact')?.checked) toUpdate.push('contact');
    if (document.getElementById('tu_address')?.checked) toUpdate.push('address');
    if (document.getElementById('tu_area')?.checked) toUpdate.push('area');
    
    let fullName = `${lastName}, ${firstName}`;
    if (middleName) {
        fullName += ` ${middleName}`;
    }
    if (nameExt) {
        fullName += ` ${nameExt}`;
    }
    
    const pos = document.getElementById('personnelPositionInput').value;
    const id = document.getElementById('personnelIdInput').value.trim();
    const hired = document.getElementById('personnelHiredInput').value;
    const current = document.getElementById('personnelAssignmentInput').value;
    const area = document.getElementById('personnelAreaInput').value.trim().toUpperCase();
    const age = document.getElementById('personnelAgeInput').value;
    const gen = document.getElementById('personnelGenderInput').value;
    const mail = document.getElementById('personnelEmailInput').value.trim();
    const num = document.getElementById('personnelContactInput').value.trim();
    const addr = document.getElementById('personnelAddressInput').value.trim();
    
    const errorEl = document.getElementById('personnelModalError');
    
    if (!lastName) {
        errorEl.textContent = 'Please enter last name';
        return;
    }
    if (!firstName) {
        errorEl.textContent = 'Please enter first name';
        return;
    }
    if (!pos && !toUpdate.includes('position')) {
        errorEl.textContent = 'Please select position (or check "To Update")';
        return;
    }
    if (!id && !toUpdate.includes('id')) {
        errorEl.textContent = 'Please enter ID number (or check "To Update")';
        return;
    }
    if (!hired && !toUpdate.includes('hired')) {
        errorEl.textContent = 'Please enter date hired (or check "To Update")';
        return;
    }
    if (hired && hired > new Date().toISOString().split('T')[0]) {
        errorEl.textContent = 'Date hired cannot be a future date';
        return;
    }
    if (!current) {
        errorEl.textContent = 'Please select project';
        return;
    }
    if ((!age || age < 18 || age > 100) && !toUpdate.includes('age')) {
        errorEl.textContent = 'Please enter valid age 18-100 (or check "To Update")';
        return;
    }
    if (!gen) {
        errorEl.textContent = 'Please select gender';
        return;
    }
    
    if (!state.isAdmin && current === 'Corporate Office') {
        errorEl.textContent = 'Only Admin can assign personnel to Corporate Office';
        return;
    }
    if (!state.isAdmin) {
        const assignedProject = (state.masterProjects || state.projects || []).find(p => p.name === current);
        if (assignedProject && assignedProject.region === 'CORPORATE') {
            errorEl.textContent = 'Only Admin can assign personnel to Corporate region projects';
            return;
        }
        if (state.userRegion && assignedProject && assignedProject.region !== state.userRegion) {
            errorEl.textContent = `You can only assign personnel to projects in your region (${state.userRegion})`;
            return;
        }
    }

    // ── DUPLICATE CHECK ─────────────────────────────────────────────────────
    if (state.personnelData) {
        const dupName = state.personnelData.find(p =>
            p.name && p.name.trim().toLowerCase() === fullName.trim().toLowerCase()
        );
        if (dupName) {
            errorEl.textContent = 'Personnel "' + fullName + '" already exists in the registry';
            return;
        }
        if (id && !toUpdate.includes('id')) {
            const dupId = state.personnelData.find(p => p.id && p.id.trim() === id.trim());
            if (dupId) {
                errorEl.textContent = 'ID Number "' + id + '" is already assigned to ' + dupId.name;
                return;
            }
        }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const len = calculateYearsOfService(hired);
    
    if (!state.personnelData) state.personnelData = [];
    const newPerson = {
        name: fullName,
        lastName: lastName || '',
        firstName: firstName || '',
        middleName: middleName || '',
        nameExt: nameExt || '',
        pos: pos || '',
        id: id || '',
        hired: hired || '',
        current: current || '',
        area: area || '',
        age: age || '',
        gen: gen || '',
        mail: mail || '',
        num: num || '',
        addr: addr || '',
        len: len || '',
        toUpdate: toUpdate.length > 0 ? toUpdate : null
    };
    newPerson._pid = PersonnelDB.getPersonId(newPerson);
    state.personnelData.push(newPerson);
    
    saveUserData(state.currentUser.email);
    renderPTable();
    updatePersonnelSummary();
    closeAddPersonnelModal();
    if (window.showToast) window.showToast('Personnel added successfully!', 'success');
    if (window.showSyncPill) window.showSyncPill('syncing', 'Saving to cloud...');
    PersonnelDB.savePerson(newPerson)
        .then(s => {
            if (s) { if (window.markSyncComplete) window.markSyncComplete(); }
            else   { if (window.markSyncFailed)   window.markSyncFailed(); }
        })
        .catch(err => {
            console.error('Personnel add Firebase save failed:', err);
            if (window.markSyncFailed) window.markSyncFailed();
        });
}

// ── OSHP (DOLE-accredited OSH Practitioner) helpers ──────────────────────────
function oshpBadgeHtml(p) {
    return (p && p.oshp)
        ? `<span title="DOLE-accredited Occupational Safety and Health (OSH) Practitioner" style="display:inline-block;font-size:0.55rem;font-weight:800;color:#0d47a1;background:#e3f2fd;border:1px solid #90caf9;border-radius:4px;padding:1px 5px;margin-left:5px;vertical-align:middle;letter-spacing:0.3px;">OSHP</span>`
        : '';
}

// Adds the "DOLE-Accredited OSHP" checkbox under the OIC checkbox (no index.html change needed)
function ensureOshpCheckbox() {
    if (document.getElementById('editPersonnelOshpInput')) return;
    const oicInput = document.getElementById('editPersonnelOicInput');
    if (!oicInput) return;
    const oicWrap = oicInput.closest('label') || oicInput.parentElement;
    if (!oicWrap) return;
    const clone = oicWrap.cloneNode(true);
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    const input = clone.querySelector('input[type="checkbox"]');
    if (!input) return;
    input.id = 'editPersonnelOshpInput';
    input.checked = false;
    input.removeAttribute('onchange');
    input.removeAttribute('onclick');
    // Replace the label text
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    let n, replaced = false;
    while ((n = walker.nextNode())) {
        if (n.nodeValue.trim()) {
            n.nodeValue = replaced ? '' : ' DOLE-Accredited OSH Practitioner (OSHP)';
            replaced = true;
        }
    }
    clone.title = 'DOLE-accredited Occupational Safety and Health (OSH) Practitioner';
    clone.style.marginTop = '6px';
    oicWrap.insertAdjacentElement('afterend', clone);
}

function openEditPersonnelModal(index) {
    if (state.userRole === 'manager' || state.userRole === 'doc_controller') { showToast('Manager accounts are view-only.', 'warning'); return; }
    const person = state.personnelData[index];
    if (!person) return;
    
    if (!state.isAdmin) {
        if (person.current === 'Corporate Office') {
            showToast('Access Denied — Corporate personnel can only be edited by Admin.', 'warning');
            return;
        }
        const personProject = (state.masterProjects || state.projects || []).find(p => p.name === person.current);
        if (personProject && personProject.region === 'CORPORATE') {
            showToast('Access Denied — Corporate region personnel can only be edited by Admin.', 'warning');
            return;
        }
        if (state.userRegion) {
            const userProjects = (state.masterProjects || [])
                .filter(p => p.region === state.userRegion)
                .map(p => p.name);
            if (!userProjects.includes(person.current)) {
                showToast('Access Denied - You can only edit personnel from your region', 'error');
                return;
            }
        }
    }
    
    const assignmentSelect = document.getElementById('editPersonnelAssignmentInput');
    let options = '<option value="">Select Project</option>';
    if (state.isAdmin) {
        options += '<option value="Corporate Office">Corporate Office</option>';
    }
    
    if (state.projects && state.projects.length > 0) {
        let projectsList = state.projects;
        if (!state.isAdmin && state.userRegion) {
            projectsList = state.projects.filter(p => p.region === state.userRegion && p.region !== 'CORPORATE');
        }

        projectsList.forEach(p => {
            if (p.region === 'CORPORATE') return; // Corporate Office covers this
            options += `<option value="${p.name}">${p.name}</option>`;
        });
    }
    
    assignmentSelect.innerHTML = options;
    
    document.getElementById('editPersonnelIndex').value = index;
    
    let lastName = '';
    let firstName = '';
    let middleName = '';
    let nameExt = '';

    // Prefer the separately-stored name parts (saved since the name-splitting fix).
    // This avoids re-parsing the concatenated "name" string, which incorrectly
    // treated multi-word first names (e.g. "MICHAEL ANGELO") as First + Middle name.
    if (person.firstName || person.lastName) {
        lastName = person.lastName || '';
        firstName = person.firstName || '';
        middleName = person.middleName || '';
        nameExt = person.nameExt || '';
    } else {
        // Fallback for legacy records saved before name parts were stored separately.
        const fullName = person.name || '';
        const nameParts = fullName.split(',').map(s => s.trim());

        if (nameParts.length >= 1) {
            lastName = nameParts[0];

            if (nameParts.length >= 2) {
                const restOfName = nameParts[1].trim().split(' ');
                firstName = restOfName[0] || '';

                const extensions = ['JR.', 'SR.', 'II', 'III', 'IV', 'V'];
                const lastPart = restOfName[restOfName.length - 1];

                if (extensions.includes(lastPart.toUpperCase())) {
                    nameExt = lastPart.toUpperCase();
                    if (restOfName.length > 2) {
                        middleName = restOfName.slice(1, -1).join(' ');
                    }
                } else {
                    if (restOfName.length > 1) {
                        middleName = restOfName.slice(1).join(' ');
                    }
                }
            }
        }
    }
    
    document.getElementById('editPersonnelLastNameInput').value = lastName;
    document.getElementById('editPersonnelFirstNameInput').value = firstName;
    document.getElementById('editPersonnelMiddleNameInput').value = middleName;
    document.getElementById('editPersonnelNameExtInput').value = nameExt;
    document.getElementById('editPersonnelPositionInput').value = person.pos || '';
    document.getElementById('editPersonnelIdInput').value = person.id || '';
    document.getElementById('editPersonnelHiredInput').value = person.hired || '';
    document.getElementById('editPersonnelAssignmentInput').value = person.current || '';
    document.getElementById('editPersonnelAreaInput').value = person.area || '';
    document.getElementById('editPersonnelOicInput').checked = person.oic || false;
    ensureOshpCheckbox();
    { const _oshpEl = document.getElementById('editPersonnelOshpInput'); if (_oshpEl) _oshpEl.checked = person.oshp || false; }
    document.getElementById('editPersonnelAgeInput').value = person.age || '';
    document.getElementById('editPersonnelGenderInput').value = person.gen || '';
    document.getElementById('editPersonnelEmailInput').value = person.mail || '';
    document.getElementById('editPersonnelContactInput').value = fmtPhone(person.num || '');
    document.getElementById('editPersonnelAddressInput').value = titleCase(person.addr || '');
    document.getElementById('editPersonnelModalError').textContent = '';

    const etuMap = {
        etu_middleName: { cbId: 'etu_middleName', fieldId: 'editPersonnelMiddleNameInput', key: 'middleName' },
        etu_position:   { cbId: 'etu_position',   fieldId: 'editPersonnelPositionInput',   key: 'position' },
        etu_id:         { cbId: 'etu_id',         fieldId: 'editPersonnelIdInput',          key: 'id' },
        etu_hired:      { cbId: 'etu_hired',       fieldId: 'editPersonnelHiredInput',      key: 'hired' },
        etu_age:        { cbId: 'etu_age',         fieldId: 'editPersonnelAgeInput',        key: 'age' },
        etu_email:      { cbId: 'etu_email',       fieldId: 'editPersonnelEmailInput',      key: 'email' },
        etu_contact:    { cbId: 'etu_contact',     fieldId: 'editPersonnelContactInput',    key: 'contact' },
        etu_address:    { cbId: 'etu_address',     fieldId: 'editPersonnelAddressInput',    key: 'address' },
        etu_area:       { cbId: 'etu_area',         fieldId: 'editPersonnelAreaInput',       key: 'area' }
    };
    const existingToUpdate = Array.isArray(person.toUpdate) ? person.toUpdate : [];
    Object.values(etuMap).forEach(({ cbId, fieldId, key }) => {
        const cb = document.getElementById(cbId);
        const isPending = existingToUpdate.includes(key);
        if (cb) {
            cb.checked = isPending;
            toggleToUpdateField(fieldId, isPending);
        }
    });
    
    const _eepm = document.getElementById('editPersonnelModal');
    eshModalShow(_eepm);

    const deleteBtn = document.getElementById('editPersonnelDeleteBtn');
    const transferBtn = document.getElementById('editPersonnelTransferBtn');
    let canDelete = true;
    let canTransfer = true;
    if (!state.isAdmin) {
        if (person.current === 'Corporate Office') { canDelete = false; canTransfer = false; }
        const personProject = (state.masterProjects || state.projects || []).find(p => p.name === person.current);
        if (personProject && personProject.region === 'CORPORATE') { canDelete = false; canTransfer = false; }
        if (state.userRegion) {
            const userProjects = (state.masterProjects || []).filter(p => p.region === state.userRegion).map(p => p.name);
            if (!userProjects.includes(person.current)) { canDelete = false; canTransfer = false; }
        }
    }
    if (deleteBtn) deleteBtn.style.display = canDelete ? '' : 'none';
    if (transferBtn) transferBtn.style.display = canTransfer ? '' : 'none';

    // ── Load certificate section based on position ──
    _loadEditCertSection(person);
}

function closeEditPersonnelModal() {
    const _eepm = document.getElementById('editPersonnelModal');
    eshModalHide(_eepm);
}

// ── EDIT MODAL CERT HELPERS ────────────────────────────────────────────────

const _EDIT_CERT_MAP = {
    'Safety Officer I':   { key:'COSH',      label:'COSH Certificate',                  icon:'fa-shield-halved', hasExpiry: false },
    'Safety Officer II':  { key:'COSH',      label:'COSH Certificate',                  icon:'fa-shield-halved', hasExpiry: false },
    'Safety Officer III': { key:'COSH',      label:'COSH Certificate',                  icon:'fa-shield-halved', hasExpiry: false },
    'Safety Officer IV':  { key:'COSH',      label:'COSH Certificate',                  icon:'fa-shield-halved', hasExpiry: false },
    'PCO':                { key:'PCO_ACCRED',label:'PCO Accreditation',                 icon:'fa-leaf',          hasExpiry: true  },
    'First Aider':        { key:'BLS',       label:'BLS Certificate',                   icon:'fa-heart-pulse',   hasExpiry: true  },
    'Project Nurse':      { key:'OHNAP',     label:'OHNAP Certificate',                 icon:'fa-user-nurse',    hasExpiry: false },
    'Project Physician':  { key:'OHPHYS',    label:'OH Physician Certificate',          icon:'fa-user-doctor',   hasExpiry: false },
    'ESH Superintendent': { key:'DOLE_OSH',  label:'DOLE OSH Practitioner Certificate', icon:'fa-certificate',   hasExpiry: true  },
    'ESH Head':           { key:'DOLE_OSH',  label:'DOLE OSH Practitioner Certificate', icon:'fa-certificate',   hasExpiry: true  },
};
const _EDIT_CORP_POS = [
    'QESH Group Manager','QESH Deputy Manager',
    'ESH Manager for Regulation & Compliance','ESH Manager for Project Implementation',
    'Environmental and Sustainability Head','Corporate Physician','Corporate Nurse',
    'Corporate Dentist','QESH Corp. DC','Corporate Safety Officer'
];

window._editCertFile = null;
window._editCertCfg  = null;
window._editCertPid  = null;

function _loadEditCertSection(person) {
    const pos    = person.pos || '';
    const certCfg = _EDIT_CERT_MAP[pos];
    const section = document.getElementById('editPersonnelCertSection');
    if (!certCfg || _EDIT_CORP_POS.includes(pos)) {
        section.style.display = 'none';
        window._editCertCfg = null;
        return;
    }

    window._editCertCfg = certCfg;
    window._editCertPid = String(person._pid || person.id || '');
    window._editCertFile = null;
    window._editCertOcrToken = (window._editCertOcrToken || 0) + 1;
    const _ocrSt = document.getElementById('editCertOcrStatus');
    if (_ocrSt) _ocrSt.style.display = 'none';

    // Label
    document.getElementById('editPersonnelCertLabel').innerHTML =
        `<i class="fas ${certCfg.icon}" style="color:#2e7d32;margin-right:4px;"></i>${certCfg.label}` +
        (certCfg.hasExpiry
            ? ' <span style="color:#888;">· Expiry date required</span>'
            : ' <span style="color:#888;">· No expiration</span>');

    // Expiry group
    document.getElementById('editCertExpiryGroup').style.display = certCfg.hasExpiry ? '' : 'none';
    document.getElementById('editCertExpiry').value = '';

    // Reset file UI
    document.getElementById('editCertChosenName').style.display = 'none';
    document.getElementById('editCertError').style.display = 'none';
    document.getElementById('editCertProgress').style.display = 'none';

    // Load existing cert data
    const pid  = window._editCertPid;
    const existing = (window._pcCertData && window._pcCertData[pid] || {})[certCfg.key];
    const toFollow = person.certToFollow === certCfg.key;
    document.getElementById('editCert_toFollow').checked = toFollow;
    toggleCertToFollow(toFollow);

    const dropZone   = document.getElementById('editCertDropZone');
    const existingEl = document.getElementById('editCertExistingName');
    if (existing && existing.pdfUrl) {
        existingEl.style.display = 'block';
        existingEl.innerHTML = `<i class="fas fa-check-circle" style="color:#2e7d32;margin-right:4px;"></i>Current: <a href="${existing.pdfUrl}" target="_blank" style="color:#1b5e20;font-weight:700;">${existing.fileName || 'View PDF'}</a>`;
        if (existing.expiry) document.getElementById('editCertExpiry').value = existing.expiry;
        dropZone.querySelector('div:last-child').textContent = 'Click to replace PDF';
    } else {
        existingEl.style.display = 'none';
        dropZone.querySelector('div:last-child').textContent = 'Click to choose PDF file';
    }

    section.style.display = 'block';
}

window.toggleCertToFollow = function(checked) {
    document.getElementById('editCertFields').style.display = checked ? 'none' : '';
};

// ── AUTO-DETECT EXPIRY DATE FROM CERTIFICATE PDF ───────────────────────────
// Reads the PDF text with pdf.js and looks for "valid until / validity / expiry" + a date.
// Only fills the field when exactly one clear date is found. No guessing.
window._parseCertExpiryFromText = function(text) {
    if (!text || text.replace(/\s+/g, '').length < 20) return { status: 'notext' };
    const t = text.replace(/\s+/g, ' ');

    const MONTHS = { january:1, february:2, march:3, april:4, may:5, june:6, july:7, august:8,
                     september:9, october:10, november:11, december:12,
                     jan:1, feb:2, mar:3, apr:4, jun:6, jul:7, aug:8, sep:9, sept:9, oct:10, nov:11, dec:12 };
    const mon = 'january|february|march|april|may|june|july|august|september|october|november|december|sept|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec';

    const fmt = (y, mo, d) => {
        if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return '';
        const dt = new Date(Date.UTC(y, mo - 1, d));
        if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return '';
        return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    };

    const toISO = (s) => {
        s = s.trim();
        const sn = s.replace(/\s*([\/\-.])\s*/g, '$1');   // "05 / 03 / 2027" -> "05/03/2027"
        let m = sn.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) return fmt(+m[1], +m[2], +m[3]);
        m = sn.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})$/);
        if (m) {
            const a = +m[1], b = +m[2], y = m[3].length === 2 ? 2000 + (+m[3]) : +m[3];
            if (a > 12 && b <= 12) return fmt(y, b, a);   // DD/MM/YYYY
            if (b > 12 && a <= 12) return fmt(y, a, b);   // MM/DD/YYYY
            if (a === b)           return fmt(y, a, b);
            return '';                                    // ambiguous: do not guess
        }
        m = s.match(/^([a-z]+)\.?[\s\-]+(\d{1,2})(?:st|nd|rd|th)?\s*[,\-]?\s*(\d{4})$/i);
        if (m && MONTHS[m[1].toLowerCase()]) return fmt(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
        m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)\.?,?\s+(\d{4})$/i);
        if (m && MONTHS[m[2].toLowerCase()]) return fmt(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
        return '';
    };

    const datePart =
        '(' +
        '(?:' + mon + ')\\.?[\\s\\-]+\\d{1,2}(?:st|nd|rd|th)?\\s*[,\\-]?\\s*\\d{4}' + '|' +
        '\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:' + mon + ')\\.?,?\\s+\\d{4}' + '|' +
        '\\d{4}\\s*-\\s*\\d{1,2}\\s*-\\s*\\d{1,2}' + '|' +
        '\\d{1,2}\\s*[/\\-.]\\s*\\d{1,2}\\s*[/\\-.]\\s*(?:\\d{4}|\\d{2})(?!\\d)' +
        ')';
    const labelPart =
        '(?:valid\\s*(?:only\\s*)?(?:until|till|thru|through|to|up\\s*to)|validity(?:\\s*date)?|' +
        'expir(?:y|ation)(?:\\s*date)?|expires(?:\\s*on)?)\\s*[:\\-\u2013\u2014]?\\s*';

    const rx = new RegExp(labelPart + datePart, 'gi');
    const found = new Set();
    let m;
    const unclear = [];   // dates that were found but day/month order is not clear
    while ((m = rx.exec(t)) !== null) {
        const iso = toISO(m[1]);
        if (iso) found.add(iso); else unclear.push(m[1].trim());
    }
    // "Valid from <date> to <date>": the second date is the expiry
    const rxRange = new RegExp('valid\\s*from\\s*' + datePart + '\\s*(?:to|until|till|thru|through|-|\u2013|\u2014)\\s*' + datePart, 'gi');
    while ((m = rxRange.exec(t)) !== null) {
        const iso = toISO(m[2]);
        if (iso) found.add(iso); else unclear.push(m[2].trim());
    }
    // Label written AFTER the date: "05/21/2028 EXPIRY"
    const rxAfter = new RegExp(datePart + '\\s*(?:date\\s*of\\s*)?(?:expiry|expiration|expires)', 'gi');
    while ((m = rxAfter.exec(t)) !== null) {
        const iso = toISO(m[1]);
        if (iso) found.add(iso); else unclear.push(m[1].trim());
    }

    // Fallback when the OCR lost the word "EXPIRY" (e.g. "DATE OF 05/22/2026 ... DATE OF 05/21/2028 ... ISSUANCE").
    // Word order in OCR text is often scrambled, so do not rely on which word is next to which date.
    // Rule: the text mentions "issuance/issued", there are exactly two dates, and both are clear.
    // Then the later one is the expiry. Marked as inferred so the user checks it.
    if (found.size === 0 && unclear.length === 0 && /issu/i.test(t)) {
        const rxAny = new RegExp(datePart, 'gi');
        const all = new Set();
        let bad = false;
        while ((m = rxAny.exec(t)) !== null) {
            const iso = toISO(m[1]);
            if (iso) all.add(iso);
            else if (!/^\d{4}\s*-/.test(m[1].trim())) bad = true;   // year-first form is never ambiguous, so an invalid one is just noise (e.g. "2009-20-8" from a permit number)
        }
        if (!bad && all.size === 2) {
            const sorted = Array.from(all).sort();
            return { status: 'ok', date: sorted[1], inferred: true };
        }
    }

    if (found.size === 1) return { status: 'ok', date: Array.from(found)[0] };
    if (found.size > 1)   return { status: 'multiple', dates: Array.from(found) };
    if (unclear.length)   return { status: 'unclear', raw: unclear[0] };
    return { status: 'none' };
};

// ── CERTIFICATE PDF READER ─────────────────────────────────────────────────
// Step 1: read the PDF text layer with pdf.js (fast).
// Step 2: if no date is found, render the pages and run Tesseract OCR in the browser.
window._CERT_PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

window._certLoadTesseract = function() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (window._certTessPromise) return window._certTessPromise;
    window._certTessPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
        s.onload  = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Tesseract not available'));
        s.onerror = () => { window._certTessPromise = null; reject(new Error('Tesseract failed to load')); };
        document.head.appendChild(s);
    });
    return window._certTessPromise;
};

window._certReadPdfTextLayer = async function(pdf, maxPages) {
    let out = '';
    const last = Math.min(pdf.numPages, maxPages);
    for (let i = 1; i <= last; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        let lastY = null;
        content.items.forEach(it => {
            if (!it.str) return;
            const y = it.transform ? Math.round(it.transform[5]) : lastY;
            if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) out += '\n';
            out += it.str + ' ';
            lastY = y;
        });
        out += '\n';
    }
    // Some OCR tools save one letter per text item: "E X P I R Y" -> "EXPIRY"
    out = out.replace(/\b(?:[A-Za-z] ){3,}[A-Za-z]\b/g, m => m.replace(/ /g, ''));
    return out;
};

window._certOcrPdf = async function(pdf, onStatus, parse) {
    const spin = (msg) => { if (onStatus) onStatus('<i class="fas fa-spinner fa-spin"></i> ' + msg); };
    const T = await window._certLoadTesseract();
    const worker = await T.createWorker('eng');

    // Render a page (or one region of it, as fractions 0..1) to a canvas
    const renderToCanvas = async (page, scale, region) => {
        const vp = page.getViewport({ scale });
        const x0 = region ? Math.floor(vp.width  * region.x0) : 0;
        const y0 = region ? Math.floor(vp.height * region.y0) : 0;
        const w  = region ? Math.ceil(vp.width  * (region.x1 - region.x0)) : Math.ceil(vp.width);
        const h  = region ? Math.ceil(vp.height * (region.y1 - region.y0)) : Math.ceil(vp.height);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        await page.render({ canvasContext: ctx, viewport: vp, transform: [1, 0, 0, 1, -x0, -y0] }).promise;
        return canvas;
    };
    const good = (r) => r && (r.status === 'ok' || r.status === 'multiple');

    let text = '', result = { status: 'notext' };
    try {
        // Pass 1: whole page (first 2 pages), about 290 DPI
        const last = Math.min(pdf.numPages, 2);
        for (let i = 1; i <= last; i++) {
            spin('Running OCR, page ' + i + ' of ' + last + '...');
            const page = await pdf.getPage(i);
            const canvas = await renderToCanvas(page, 4, null);
            const res = await worker.recognize(canvas);
            text += ((res && res.data && res.data.text) || '') + '\n';
        }
        result = parse(text);
        if (good(result)) return { text, result, pass: 1 };

        // Pass 2: small print. Many certificates put "Validity: <date>" beside the photo, top-right.
        // Zoom into that corner (about 430 DPI) and read it as one block of text.
        spin('Reading the top-right corner (small print)...');
        const page1 = await pdf.getPage(1);
        const corner = await renderToCanvas(page1, 6, { x0: 0.55, y0: 0, x1: 1, y1: 0.4 });
        await worker.setParameters({ tessedit_pageseg_mode: (T.PSM && T.PSM.SINGLE_BLOCK) || '6' });
        const res2 = await worker.recognize(corner);
        const text2 = (res2 && res2.data && res2.data.text) || '';
        const result2 = parse(text2);
        if (good(result2)) return { text: text2, result: result2, pass: 2 };
        if (result.status === 'notext') result = result2;
    } finally {
        try { await worker.terminate(); } catch (e) {}
    }
    return { text, result, pass: 1 };
};

window._editCertAutoDetectExpiry = async function(file) {
    const cfg      = window._editCertCfg;
    const expiryEl = document.getElementById('editCertExpiry');
    if (!cfg || !cfg.hasExpiry || !expiryEl) return;

    let st = document.getElementById('editCertOcrStatus');
    if (!st) {
        st = document.createElement('div');
        st.id = 'editCertOcrStatus';
        st.style.cssText = 'display:none;margin-top:6px;font-size:0.72rem;padding:6px 10px;border-radius:6px;';
        expiryEl.parentNode.appendChild(st);
    }
    const show = (bg, border, color, html) => {
        st.style.display = 'block';
        st.style.background = bg;
        st.style.border = '1px solid ' + border;
        st.style.color = color;
        st.innerHTML = html;
    };
    const info = (html) => show('#e3f2fd', '#90caf9', '#1565c0', html);
    const warn = (html) => show('#fff8e1', '#ffe082', '#f57f17', '<i class="fas fa-triangle-exclamation"></i> ' + html);

    const token = (window._editCertOcrToken = (window._editCertOcrToken || 0) + 1);
    const stale = () => token !== window._editCertOcrToken || window._editCertFile !== file;
    info('<i class="fas fa-spinner fa-spin"></i> Reading PDF for expiry date...');

    let r = { status: 'notext' }, via = 'text', failReason = '';
    try {
        if (typeof pdfjsLib === 'undefined') throw new Error('pdfjs_missing');
        pdfjsLib.GlobalWorkerOptions.workerSrc = window._CERT_PDFJS_WORKER;
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

        const text = await window._certReadPdfTextLayer(pdf, 3);
        r = window._parseCertExpiryFromText(text);
        if (stale()) return;

        if (r.status === 'notext' || r.status === 'none') {
            info('<i class="fas fa-spinner fa-spin"></i> No date in the PDF text. Running OCR on the page image (10–30 seconds)...');
            try {
                const o = await window._certOcrPdf(pdf, info, window._parseCertExpiryFromText);
                if (stale()) return;
                const r2 = o.result;
                if (r2.status === 'ok' || r2.status === 'multiple') { r = r2; via = 'ocr'; }
                else if (r.status === 'notext') r = r2;
            } catch (e) {
                failReason = 'ocr_failed';
            }
        }
    } catch (e) {
        failReason = (e && e.message === 'pdfjs_missing') ? 'pdfjs_missing' : 'read_failed';
    }

    // A newer file was chosen while this one was being read
    if (stale()) return;

    if (r.status === 'ok') {
        expiryEl.value = r.date;
        show('#e8f5e9', '#a5d6a7', '#2e7d32',
            '<i class="fas fa-check-circle"></i> Expiry date detected' + (via === 'ocr' ? ' (OCR)' : '') +
            ': <strong style="margin-left:4px;">' + r.date + '</strong> — ' +
            (r.inferred ? 'the word "expiry" was not found; this is the later of two dates on the certificate. ' : '') +
            'please verify before saving.');
    } else if (r.status === 'multiple') {
        warn('More than one date found (' + r.dates.join(', ') + ') — please enter the expiry date manually.');
    } else if (r.status === 'unclear') {
        warn('Found "' + r.raw + '" but cannot tell day from month — please enter the expiry date manually.');
    } else if (failReason === 'pdfjs_missing') {
        warn('PDF reader (pdf.js) is not loaded — please enter the expiry date manually.');
    } else if (failReason === 'read_failed') {
        warn('Could not open this PDF — please enter the expiry date manually.');
    } else if (failReason === 'ocr_failed') {
        warn('The PDF text has no expiry date, and OCR could not run (check internet) — please enter the expiry date manually.');
    } else if (r.status === 'notext') {
        warn('No readable text found, even after OCR — please enter the expiry date manually.');
    } else {
        warn('No expiry date found in PDF — please enter it manually.');
    }
};

window.onEditCertFileChosen = function(input) {
    const file = input.files[0];
    const errEl = document.getElementById('editCertError');
    errEl.style.display = 'none';
    if (!file) return;
    if (file.type !== 'application/pdf') {
        errEl.textContent = 'PDF files only.'; errEl.style.display = 'block';
        input.value = ''; return;
    }
    window._editCertFile = file;
    document.getElementById('editCertChosenNameText').textContent = `${file.name} (${(file.size/1024).toFixed(0)} KB)`;
    document.getElementById('editCertChosenName').style.display = 'block';
    document.getElementById('editCertDropZone').style.borderColor = '#2e7d32';
    document.getElementById('editCertDropZone').style.background = '#f1f8e9';
    window._editCertAutoDetectExpiry(file);
};

// Called by confirmEditPersonnel — uploads cert if file chosen, saves cert data
window._saveEditCert = async function(personIdx) {
    const cfg = window._editCertCfg;
    if (!cfg) return; // position has no cert requirement

    const person    = state.personnelData[personIdx];
    const pid       = String(person._pid || person.id || personIdx);
    const toFollow  = document.getElementById('editCert_toFollow').checked;

    // Mark certToFollow on person object
    person.certToFollow = toFollow ? cfg.key : '';

    if (toFollow) return; // no upload needed

    const expiry   = cfg.hasExpiry ? document.getElementById('editCertExpiry').value : '';
    const errEl    = document.getElementById('editCertError');
    errEl.style.display = 'none';

    if (cfg.hasExpiry && !expiry) {
        errEl.textContent = 'Please enter the expiry date for this certificate.';
        errEl.style.display = 'block';
        throw new Error('expiry_required');
    }

    const db      = window.firebaseDb;
    if (!db) return;

    const { doc, setDoc, getDoc, updateDoc } = window.firebase;

    let pdfUrl = null, fileName = null;

    if (window._editCertFile) {
        document.getElementById('editCertProgress').style.display = 'block';
        const bar = document.getElementById('editCertProgressBar');
        bar.style.width = '20%';
        const folder = `personnel_certificates/${pid}`;
        bar.style.width = '50%';
        const { url } = await uploadPdfToCloudinary(window._editCertFile, folder);
        bar.style.width = '85%';
        pdfUrl    = url;
        fileName  = window._editCertFile.name;
        bar.style.width = '100%';
    }

    // Build entry — preserve existing pdfUrl if no new file
    const docRef   = doc(db, 'personnel_certificates', pid);
    const existing = await getDoc(docRef);
    const entry    = { updatedAt: new Date().toISOString() };
    if (cfg.hasExpiry) entry.expiry = expiry;
    if (pdfUrl) { entry.pdfUrl = pdfUrl; entry.fileName = fileName; }
    else if (existing.exists() && (existing.data()[cfg.key]||{}).pdfUrl) {
        entry.pdfUrl    = existing.data()[cfg.key].pdfUrl;
        entry.fileName  = existing.data()[cfg.key].fileName;
    }

    if (existing.exists()) await updateDoc(docRef, { [cfg.key]: entry });
    else                   await setDoc(docRef,    { [cfg.key]: entry });

    // Update local cache and re-render the table so the status changes without a page refresh
    try {
        if (!window._pcCertData) window._pcCertData = {};
        window._pcCertData[pid] = Object.assign({}, window._pcCertData[pid] || {}, { [cfg.key]: entry });
        if (typeof renderPTable === 'function') renderPTable();
    } catch (e) {  }

    document.getElementById('editCertProgress').style.display = 'none';
};

let _transferSelectedProject = null;
let _transferActiveRegion = null;
const TP_HIDDEN_REGIONS = ['PLANT OPERATIONS']; // regions left out of the Transfer list

function openTransferPersonnelModal() {
    const index = parseInt(document.getElementById('editPersonnelIndex').value);
    const person = state.personnelData[index];
    if (!person) return;

    _transferSelectedProject = null;

    const subtitle = document.getElementById('transferPersonnelSubtitle');
    if (subtitle) {
        subtitle.textContent = `${person.name} · from ${person.current || 'N/A'}`;
        subtitle.title = subtitle.textContent;
    }

    document.getElementById('transferProjectSearch').value = '';
    document.getElementById('transferPersonnelError').textContent = '';
    const _selBox = document.getElementById('transferSelectedName');
    if (_selBox) _selBox.classList.add('empty');
    const _selTxt = document.getElementById('transferSelectedNameText');
    if (_selTxt) _selTxt.textContent = 'No project selected';
    const confirmBtn = document.getElementById('transferPersonnelConfirmBtn');
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.opacity = '0.5'; }

    const currentAssignment = person.current || '';
    const allProjects = [];

    if (state.isAdmin && currentAssignment !== 'Corporate Office') {
        allProjects.push({ name: 'Corporate Office', region: 'CORPORATE' });
    }

    const masterList = state.masterProjects || state.projects || [];
    masterList.forEach(p => {
        if (!p.name || p.name === currentAssignment || p.region === 'CORPORATE') return;
        if (TP_HIDDEN_REGIONS.includes((p.region || '').toUpperCase())) return; // not shown in Transfer
        if (state.userRole === 'pco' && state.userRegion && p.region !== state.userRegion) return;
        allProjects.push({ name: p.name, region: p.region || '' });
    });

    const REGION_ORDER = ['CORPORATE','NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];
    allProjects.sort((a, b) => {
        const ri = r => { const i = REGION_ORDER.indexOf((r||'').toUpperCase()); return i >= 0 ? i : 99; };
        if (ri(a.region) !== ri(b.region)) return ri(a.region) - ri(b.region);
        return a.name.localeCompare(b.name);
    });

    window._transferAllProjects = allProjects;
    const _curRec = masterList.find(p => p.name === currentAssignment);
    const _curReg = ((_curRec && _curRec.region) || '').toUpperCase();
    const _regs = allProjects.map(p => (p.region || '').toUpperCase());
    _transferActiveRegion = _regs.includes(_curReg) ? _curReg : (_regs[0] || null);
    renderTransferRegionChips();
    renderTransferProjectList(_visibleTransferProjects(), false);

    const transferNote = document.getElementById('transfer-region-note');
    if (transferNote) {
        if (!state.isAdmin && state.userRegion) {
            transferNote.style.display = '';
            if (state.userRole === 'superintendent') {
                transferNote.innerHTML = `<i class="fas fa-map-marker-alt" style="margin-right:5px;"></i>
                    You can transfer personnel to any region. However, you can only <strong>receive</strong> transfers into <strong>${state.userRegion}</strong>.`;
            } else {
                transferNote.innerHTML = `<i class="fas fa-map-marker-alt" style="margin-right:5px;"></i>Showing projects in your region only: <strong>${state.userRegion}</strong>`;
            }
        } else {
            transferNote.style.display = 'none';
        }
    }

    const _tpm = document.getElementById('transferPersonnelModal');
    eshModalShow(_tpm);
}

function _tpRegLabel(r) {
    return (r || '').split(' ').map(w => w === 'NCR' ? w : w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

// Projects shown right now: a search matches every region; otherwise only the active region chip.
function _visibleTransferProjects(query) {
    const all = window._transferAllProjects || [];
    const q = (query || '').trim().toLowerCase();
    if (q) return all.filter(p => p.name.toLowerCase().includes(q) || (p.region || '').toLowerCase().includes(q));
    return all.filter(p => (p.region || '').toUpperCase() === _transferActiveRegion);
}

function renderTransferRegionChips() {
    const list = document.getElementById('transferProjectList');
    if (!list) return;
    let chips = document.getElementById('transferRegionChips');
    if (!chips) {
        chips = document.createElement('div');
        chips.id = 'transferRegionChips';
        list.parentNode.insertBefore(chips, list);
    }
    const order = [], count = {};
    (window._transferAllProjects || []).forEach(p => {
        const r = (p.region || '').toUpperCase();
        if (!(r in count)) { count[r] = 0; order.push(r); }
        count[r]++;
    });
    const searching = !!((document.getElementById('transferProjectSearch') || {}).value || '').trim();
    chips.innerHTML = order.map(r =>
        `<button type="button" class="tp-chip${(!searching && r === _transferActiveRegion) ? ' on' : ''}${searching ? ' dim' : ''}" onclick="setTransferRegion('${r.replace(/'/g, "\\'")}')">${_tpRegLabel(r)} · ${count[r]}</button>`
    ).join('');
    chips.style.display = order.length > 1 ? '' : 'none'; // a single region (e.g. PCO) needs no chips
}

function setTransferRegion(region) {
    _transferActiveRegion = region;
    const s = document.getElementById('transferProjectSearch');
    if (s) s.value = '';
    renderTransferRegionChips();
    renderTransferProjectList(_visibleTransferProjects(), false);
}

function renderTransferProjectList(projects, withHeaders = true) {
    const list = document.getElementById('transferProjectList');
    if (!list) return;

    if (projects.length === 0) {
        list.innerHTML = `<div style="padding:16px;text-align:center;color:#aaa;font-size:0.78rem;">No matching projects found.</div>`;
        return;
    }

    // Use global color source of truth; map to bg hex for the transfer list banner
    const REGION_COLORS = Object.fromEntries(
        Object.entries(window.REGION_COLORS).map(([k,v]) => [k, v.bg])
    );

    let html = '';
    let lastRegion = null;
    projects.forEach(p => {
        const reg = (p.region || '').toUpperCase();
        if (withHeaders && reg !== lastRegion) {
            const col = REGION_COLORS[reg] || '#666';
            html += `<div style="padding:5px 12px;background:${col};color:white;font-size:0.58rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;position:sticky;top:0;z-index:1;">
                <i class="fas fa-map-marker-alt" style="margin-right:5px;opacity:0.8;"></i>${reg === 'CORPORATE' ? ('' + window.icon("building") + ' CORPORATE') : reg}
            </div>`;
            lastRegion = reg;
        }
        const isSel = _transferSelectedProject === p.name;
        html += `<div class="transfer-proj-item" data-project="${p.name.replace(/"/g,'&quot;')}"
            onclick="selectTransferProject('${p.name.replace(/'/g,"\\'")}', this)"
            style="padding:9px 14px;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:8px;
                   border-bottom:1px solid #f0f0f0;transition:background 0.15s;
                   background:${isSel ? '#e8f5e9' : 'transparent'};
                   color:${isSel ? '#1b5e20' : '#333'};font-weight:${isSel ? '700' : '400'};"
            onmouseenter="if(!this.classList.contains('selected')) this.style.background='#f5f5f5';"
            onmouseleave="if(!this.classList.contains('selected')) this.style.background='transparent';">
            <i class="fas ${p.region === 'CORPORATE' ? 'fa-building-columns' : 'fa-solar-panel'}"
               style="font-size:0.7rem;opacity:0.6;flex-shrink:0;"></i>
            ${p.name}
            ${isSel ? '<i class="fas fa-check" style="margin-left:auto;color:#2e7d32;font-size:0.7rem;"></i>' : ''}
        </div>`;
    });
    list.innerHTML = html;
}

function filterTransferProjects(query) {
    if (!window._transferAllProjects) return;
    const q = (query || '').trim();
    renderTransferRegionChips();
    renderTransferProjectList(_visibleTransferProjects(q), !!q);
}

function selectTransferProject(projName, el) {
    _transferSelectedProject = projName;

    const list = document.getElementById('transferProjectList');
    list.querySelectorAll('.transfer-proj-item').forEach(item => {
        const isThis = item.getAttribute('data-project') === projName;
        item.style.background = isThis ? '#e8f5e9' : 'transparent';
        item.style.color = isThis ? '#1b5e20' : '#333';
        item.style.fontWeight = isThis ? '700' : '400';
    });

    const selDisplay = document.getElementById('transferSelectedDisplay');
    const selName = document.getElementById('transferSelectedNameText');
    if (selDisplay) selDisplay.style.display = '';
    if (selName) selName.textContent = projName;
    const _selBox2 = document.getElementById('transferSelectedName');
    if (_selBox2) _selBox2.classList.remove('empty');

    const confirmBtn = document.getElementById('transferPersonnelConfirmBtn');
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.style.opacity = '1'; }
}

function closeTransferPersonnelModal() {
    const _tpm = document.getElementById('transferPersonnelModal');
    eshModalHide(_tpm);
    _transferSelectedProject = null;
}

function confirmTransferPersonnel() {
    if (!_transferSelectedProject) return;
    const destProject = _transferSelectedProject; // kopya, kasi ginagawang null ng closeTransferPersonnelModal()

    const index = parseInt(document.getElementById('editPersonnelIndex').value);
    const person = state.personnelData[index];
    if (!person) return;

    if (!state.isAdmin && state.userRegion) {
        const targetProj = (state.masterProjects || state.projects || []).find(p => p.name === _transferSelectedProject);
        const sourceProj = (state.masterProjects || state.projects || []).find(p => p.name === person.current);
        const targetRegion = targetProj ? targetProj.region : null;
        const sourceRegion = sourceProj ? sourceProj.region : state.userRegion;

        if (state.userRole === 'superintendent') {
            if (sourceRegion && sourceRegion !== state.userRegion) {
                document.getElementById('transferPersonnelError').textContent =
                    `You can only initiate transfers for personnel in your region (${state.userRegion}).`;
                return;
            }
        } else {
            if (targetRegion && targetRegion !== state.userRegion) {
                document.getElementById('transferPersonnelError').textContent =
                    'You can only transfer personnel within your own region.';
                return;
            }
        }
    }

    const oldAssignment = person.current;
    state.personnelData[index].current = _transferSelectedProject;

    if (person.hired) {
        state.personnelData[index].len = String(calculateYearsOfService(person.hired));
    }

    const masterList2 = state.masterProjects || state.projects || [];
    const srcProj = masterList2.find(p => p.name === oldAssignment);
    const dstProj = masterList2.find(p => p.name === _transferSelectedProject);
    const transferLogEntry = {
        personnelName:  person.name,
        personnelId:    person.id   || null,
        fromProject:    oldAssignment               || null,
        fromRegion:     srcProj ? (srcProj.region || null) : null,
        toProject:      _transferSelectedProject,
        toRegion:       dstProj ? (dstProj.region  || null) : null,
        initiatedBy:    state.currentUser?.email    || 'unknown',
        initiatorRole:  state.userRole              || 'unknown',
        initiatorRegion: state.userRegion           || 'ALL',
        timestamp:      new Date().toISOString(),
        crossRegion:    srcProj && dstProj ? srcProj.region !== dstProj.region : false
    };

    AuditLogger.log('PERSONNEL_TRANSFER', transferLogEntry);

    if (window.firebaseDb && window.firebase?.setDoc) {
        try {
            const transferId = `${Date.now()}_${(person.id || 'noid').replace(/\s/g,'')}`;
            const transferRef = window.firebase.doc(
                window.firebaseDb, 'transfers', transferId
            );
            window.firebase.setDoc(transferRef, transferLogEntry)
                .then(() => console.log('📋 Transfer logged to Firestore:', transferId))
                .catch(e => console.warn('⚠️ Transfer Firestore log failed (non-critical):', e.message));
        } catch(e) {
        }
    }

    const masterList = state.masterProjects || state.projects || [];
    const targetProj = masterList.find(p => p.name === _transferSelectedProject);
    const targetRegion = targetProj ? (targetProj.region || '').toUpperCase() : '';

    const targetRegionSafe = targetRegion.replace(/[^a-zA-Z0-9]/g, '_');
    const targetProjSafe   = _transferSelectedProject.replace(/[^a-zA-Z0-9]/g, '_');

    _pCollapsedGroups.delete(targetRegionSafe);
    _pCollapsedGroups.delete('CORP_OFFICE'); // in case target is corporate
    _pCollapsedProjects.delete(targetProjSafe);

    closeTransferPersonnelModal();
    closeEditPersonnelModal();
    renderPTable();
    updatePersonnelSummary();
    saveUserData(state.currentUser.email);

    setTimeout(() => {
        const projBody = document.getElementById('p-proj-body-' + targetProjSafe);
        if (projBody) {
            projBody.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 150);

    if (window.showToast) window.showToast(
        `${person.name} transferred to ${destProject}`, 'success', 4000
    );

    if (window.showSyncPill) window.showSyncPill('syncing', 'Saving transfer...');
    const transferedPerson = state.personnelData[index];
    if (transferedPerson) {
        if (!transferedPerson._pid) transferedPerson._pid = PersonnelDB.getPersonId(transferedPerson);
        PersonnelDB.savePerson(transferedPerson)
            .then(s => {
                if (s) { if (window.markSyncComplete) window.markSyncComplete(); }
                else   { if (window.markSyncFailed) window.markSyncFailed(); }
            })
            .catch(() => { if (window.markSyncFailed) window.markSyncFailed(); });
    }
}

function deletePersonnelFromModal() {
    const index = parseInt(document.getElementById('editPersonnelIndex').value);
    closeEditPersonnelModal();
    setTimeout(() => pRowDelete(index), 200);
}

function confirmEditPersonnel() {
    const index = parseInt(document.getElementById('editPersonnelIndex').value);
    const lastName = document.getElementById('editPersonnelLastNameInput').value.trim().toUpperCase();
    const firstName = document.getElementById('editPersonnelFirstNameInput').value.trim().toUpperCase();
    const middleName = document.getElementById('editPersonnelMiddleNameInput').value.trim().toUpperCase();
    const nameExt = document.getElementById('editPersonnelNameExtInput').value;

    const toUpdate = [];
    if (document.getElementById('etu_middleName')?.checked) toUpdate.push('middleName');
    if (document.getElementById('etu_position')?.checked)   toUpdate.push('position');
    if (document.getElementById('etu_id')?.checked)         toUpdate.push('id');
    if (document.getElementById('etu_hired')?.checked)      toUpdate.push('hired');
    if (document.getElementById('etu_age')?.checked)        toUpdate.push('age');
    if (document.getElementById('etu_email')?.checked)      toUpdate.push('email');
    if (document.getElementById('etu_contact')?.checked)    toUpdate.push('contact');
    if (document.getElementById('etu_address')?.checked)    toUpdate.push('address');
    if (document.getElementById('etu_area')?.checked)       toUpdate.push('area');

    let fullName = `${lastName}, ${firstName}`;
    if (middleName) {
        fullName += ` ${middleName}`;
    }
    if (nameExt) {
        fullName += ` ${nameExt}`;
    }
    
    const pos = document.getElementById('editPersonnelPositionInput').value;
    const id = document.getElementById('editPersonnelIdInput').value.trim();
    const hired = document.getElementById('editPersonnelHiredInput').value;
    const current = document.getElementById('editPersonnelAssignmentInput').value;
    const area = document.getElementById('editPersonnelAreaInput').value.trim().toUpperCase();
    const oic = document.getElementById('editPersonnelOicInput').checked;
    const oshp = !!(document.getElementById('editPersonnelOshpInput') || {}).checked;
    const age = document.getElementById('editPersonnelAgeInput').value;
    const gen = document.getElementById('editPersonnelGenderInput').value;
    const mail = document.getElementById('editPersonnelEmailInput').value.trim();
    const num = document.getElementById('editPersonnelContactInput').value.trim();
    const addr = document.getElementById('editPersonnelAddressInput').value.trim();
    
    const errorEl = document.getElementById('editPersonnelModalError');
    
    if (!lastName) {
        errorEl.textContent = 'Please enter last name';
        return;
    }
    if (!firstName) {
        errorEl.textContent = 'Please enter first name';
        return;
    }
    if (!pos && !toUpdate.includes('position')) {
        errorEl.textContent = 'Please select position (or check "To Update")';
        return;
    }
    if (!id && !toUpdate.includes('id')) {
        errorEl.textContent = 'Please enter ID number (or check "To Update")';
        return;
    }
    if (!hired && !toUpdate.includes('hired')) {
        errorEl.textContent = 'Please enter date hired (or check "To Update")';
        return;
    }
    if (hired && hired > new Date().toISOString().split('T')[0]) {
        errorEl.textContent = 'Date hired cannot be a future date';
        return;
    }
    if (!current) {
        errorEl.textContent = 'Please select project';
        return;
    }
    if ((!age || age < 18 || age > 100) && !toUpdate.includes('age')) {
        errorEl.textContent = 'Please enter valid age 18-100 (or check "To Update")';
        return;
    }
    if (!gen) {
        errorEl.textContent = 'Please select gender';
        return;
    }
    
    if (!state.isAdmin && current === 'Corporate Office') {
        errorEl.textContent = 'Only Admin can assign personnel to Corporate Office';
        return;
    }
    if (!state.isAdmin) {
        const assignedProject2 = (state.masterProjects || state.projects || []).find(p => p.name === current);
        if (assignedProject2 && assignedProject2.region === 'CORPORATE') {
            errorEl.textContent = 'Only Admin can assign personnel to Corporate region projects';
            return;
        }
    }

    if (!toUpdate.includes('id') && id && state.personnelData && state.personnelData.some((p, idx) => p.id === id && idx !== index)) {
        errorEl.textContent = 'ID Number already exists';
        return;
    }
    
    const len = calculateYearsOfService(hired);
    
    const existingPid = state.personnelData[index]?._pid || null;
    const updatedPerson = {
        name: fullName,
        lastName: lastName || '',
        firstName: firstName || '',
        middleName: middleName || '',
        nameExt: nameExt || '',
        pos: pos || '',
        id: id || '',
        hired: hired || '',
        current: current || '',
        area: area || '',
        age: age || '',
        gen: gen || '',
        mail: mail || '',
        num: num || '',
        addr: addr || '',
        len: len || '',
        oic: oic || false,
        oshp: oshp || false,
        toUpdate: toUpdate.length > 0 ? toUpdate : null
    };
    updatedPerson._pid = existingPid || PersonnelDB.getPersonId(updatedPerson);
    state.personnelData[index] = updatedPerson;
    
    saveUserData(state.currentUser.email);
    renderPTable();
    updatePersonnelSummary();
    closeEditPersonnelModal();
    if (window.showToast) window.showToast('Personnel updated successfully!', 'success');
    if (window.showSyncPill) window.showSyncPill('syncing', 'Saving to cloud...');

    // Save cert in background (non-blocking for the modal close)
    if (window._saveEditCert) {
        window._saveEditCert(index).catch(err => {
            if (err.message !== 'expiry_required') console.error('Cert save error:', err);
        });
    }

    PersonnelDB.savePerson(updatedPerson)
        .then(s => {
            if (s) { if (window.markSyncComplete) window.markSyncComplete(); }
            else   { if (window.markSyncFailed)   window.markSyncFailed(); }
        })
        .catch(err => {
            console.error('Personnel edit Firebase save failed:', err);
            if (window.markSyncFailed) window.markSyncFailed();
        });
}

const _pCollapsedProjects = new Set();

const _pCollapsedGroups = new Set(['NCR','NORTH_LUZON','SOUTH_LUZON','VISAYAS___MINDANAO','PLANT_OPERATIONS','CORPORATE','CORP_OFFICE']);

function _pToggleProjectBySafeKey(safeKey) {
    const body = document.getElementById('p-proj-body-' + safeKey);
    const chev = document.getElementById('p-proj-chev-' + safeKey);
    if (!body) return;
    const isVisible = body.style.display !== 'none';
    body.style.display = isVisible ? 'none' : '';
    if (chev) chev.style.transform = isVisible ? 'rotate(-90deg)' : 'rotate(0deg)';
    if (isVisible) _pCollapsedProjects.add(safeKey);
    else _pCollapsedProjects.delete(safeKey);
}

document.addEventListener('click', function(e) {
    const toggle = e.target.closest('.p-proj-toggle');
    if (!toggle) return;
    const safeKey = toggle.getAttribute('data-proj-key');
    if (safeKey) _pToggleProjectBySafeKey(safeKey);
});

window.pToggleGroup = function(grpKey) {
    const safeKey = grpKey.replace(/[^a-zA-Z0-9]/g, '_');
    const body   = document.getElementById('p-grp-body-'   + safeKey);
    const banner = document.getElementById('p-grp-banner-' + safeKey);
    if (!body) return;
    const isCollapsed = body.classList.contains('collapsed');
    body.classList.toggle('collapsed', !isCollapsed);
    if (banner) {
        banner.classList.toggle('collapsed', !isCollapsed);
        banner.style.marginBottom = !isCollapsed ? '6px' : '0';
    }
    if (!isCollapsed) _pCollapsedGroups.add(safeKey);
    else _pCollapsedGroups.delete(safeKey);
};

window.pToggleGroupSafe = function(safeKey) {
    const body   = document.getElementById('p-grp-body-'   + safeKey);
    const banner = document.getElementById('p-grp-banner-' + safeKey);
    if (!body) return;
    const isCollapsed = body.classList.contains('collapsed');
    body.classList.toggle('collapsed', !isCollapsed);
    if (banner) {
        banner.classList.toggle('collapsed', !isCollapsed);
        banner.style.marginBottom = !isCollapsed ? '6px' : '0';
    }
    if (!isCollapsed) _pCollapsedGroups.add(safeKey);
    else _pCollapsedGroups.delete(safeKey);
};

function P_TABLE_THEAD() {
    return `<tr style="background:#e8f5e9;border-bottom:2px solid #a5d6a7;">
    <th style="padding:7px 10px 7px 12px;color:#1b5e20;text-align:left;font-weight:700;letter-spacing:0.3px;border:none;position:sticky;left:0;z-index:10;background:#e8f5e9;width:320px;min-width:320px;"><span style="display:inline-block;width:20px;margin-right:6px;text-align:center;">#</span> Full Name</th>
    <th style="padding:7px 14px;color:#1b5e20;text-align:center;white-space:nowrap;font-weight:700;border:none;">Position</th>
    <th style="padding:7px 14px;color:#1b5e20;text-align:center;white-space:nowrap;font-weight:700;border:none;">ID No.</th>
    <th style="padding:7px 14px;color:#1b5e20;text-align:center;white-space:nowrap;font-weight:700;border:none;">Cert. Expiry</th>
    ${state.isEditing ? '<th style="padding:7px 12px;color:#1b5e20;text-align:center;white-space:nowrap;font-weight:700;border:none;">Action</th>' : ''}
</tr>`;
}

function P_CORP_TABLE_THEAD() {
    return `<tr style="background:#e8f5e9;border-bottom:2px solid #a5d6a7;">
    <th style="padding:7px 10px 7px 12px;color:#1b5e20;text-align:left;font-weight:700;letter-spacing:0.3px;border:none;position:sticky;left:0;z-index:10;background:#e8f5e9;width:320px;min-width:320px;"><span style="display:inline-block;width:20px;margin-right:6px;text-align:center;">#</span> Full Name</th>
    <th style="padding:7px 14px;color:#1b5e20;text-align:center;white-space:nowrap;font-weight:700;border:none;">Position</th>
    <th style="padding:7px 14px;color:#1b5e20;text-align:center;white-space:nowrap;font-weight:700;border:none;">ID No.</th>
    ${state.isEditing ? '<th style="padding:7px 12px;color:#1b5e20;text-align:center;white-space:nowrap;font-weight:700;border:none;">Action</th>' : ''}
</tr>`;
}

function _pHeaderNavBtn(region, dir, off) {
    const isPrev = dir < 0;
    const r = String(region).replace(/'/g, "\\'");
    return `<button onclick="event.stopPropagation();_pNavProject('${r}', ${dir})" ${off ? 'disabled' : ''} style="flex-shrink:0;white-space:nowrap;background:${off ? '#e0e0e0' : '#f9a825'};color:${off ? '#9e9e9e' : '#3e2c00'};border:none;border-radius:6px;padding:5px 14px;font-size:0.72rem;font-weight:700;cursor:${off ? 'not-allowed' : 'pointer'};opacity:${off ? '0.6' : '1'};">${isPrev ? '<i class="fas fa-chevron-left"></i> Prev' : 'Next <i class="fas fa-chevron-right"></i>'}</button>`;
}

function buildProjectCard(projName, personnel, projOptions, displayIndexRef, isCorporateCard, navInfo) {
    const safeKey = projName.replace(/[^a-zA-Z0-9]/g, '_');
    const count = personnel.length;
    const headerBg = 'background:#f1f8e9;border-bottom:1px solid #c8e6c9;';
    const _projRec = (state.projects || []).find(x => x.name === projName);
    const _projBadge = (typeof projStatusBadge === 'function') ? projStatusBadge(_projRec) : '';

    let rows = '';
    let _projRowNum = 0;
    personnel.forEach(item => {
        const origIdx = item._origIdx;
        const p = state.personnelData[origIdx];
        if (!p) return;
        _projRowNum++;
        displayIndexRef.n++;
        const di = _projRowNum;
        const oicBadge = p.oic ? `<span style="display:inline-block;font-size:0.55rem;font-weight:800;color:#e65100;background:#fff3e0;border:1px solid #ffcc80;border-radius:4px;padding:1px 5px;margin-left:5px;vertical-align:middle;letter-spacing:0.3px;">OIC</span>` : '';
        const posDisplay = p.pos && p.pos !== 'Select' ? `<span class="p-pos-badge">${p.pos}</span>${oicBadge}${oshpBadgeHtml(p)}` : '<span style="color:#bbb;font-size:0.7rem;">—</span>';
        const hasToUpdate = p.toUpdate && p.toUpdate.length > 0;
        const rowBg = hasToUpdate ? 'background:#ffebee;' : (di % 2 === 0 ? 'background:#ffffff;' : 'background:#f4f6f8;');
        const stickyBg = hasToUpdate ? 'background:#ffebee;' : (di%2===1?'background:#f4f6f8;':'background:#ffffff;');
        // Compute cert expiry cell before template literal
        const _certCell = (() => {
            const _CMAP = {'PCO':'PCO_ACCRED','First Aider':'BLS','ESH Superintendent':'DOLE_OSH','ESH Head':'DOLE_OSH','Safety Officer I':'COSH','Safety Officer II':'COSH','Safety Officer III':'COSH','Safety Officer IV':'COSH','Project Nurse':'OHNAP','Project Physician':'OHPHYS'};
            const _NOEXP = {'COSH':1,'OHNAP':1,'OHPHYS':1};
            const _ckey = _CMAP[p.pos];
            if (!_ckey) return '<td style="text-align:center;padding:5px 14px;color:#ccc;font-size:0.7rem;">—</td>';
            const _pid2 = (typeof PersonnelDB !== 'undefined') ? PersonnelDB.getPersonId(p) : String(p._pid || (p.id ? 'emp_' + String(p.id).trim() : String(origIdx)));
            const _cdata = (window._pcCertData && window._pcCertData[_pid2] || {})[_ckey];
            if (_NOEXP[_ckey]) {
                const _up = !!(_cdata && _cdata.pdfUrl);
                return _up
                    ? '<td style="text-align:center;padding:5px 14px;white-space:nowrap;"><div title="Certificate uploaded" style="font-size:0.68rem;font-weight:700;color:#2e7d32;display:inline-block;cursor:default;">UPLOADED</div></td>'
                    : '<td style="text-align:center;padding:5px 14px;white-space:nowrap;"><div title="Certificate not uploaded" style="font-size:0.68rem;font-weight:700;color:#c62828;display:inline-block;cursor:default;">NOT UPLOADED</div></td>';
            }
            if (!_cdata) return '<td style="text-align:center;padding:5px 14px;white-space:nowrap;"><div title="Certificate not uploaded" style="font-size:0.68rem;font-weight:700;color:#c62828;display:inline-block;cursor:default;">NOT UPLOADED</div></td>';
            if (p.certToFollow === _ckey) return ('<td style="text-align:center;padding:5px 14px;font-size:0.65rem;color:#e65100;font-weight:700;">' + window.icon("wait") + ' To Follow</td>');
            const _exp = _cdata.expiry;
            if (!_exp) return '<td style="text-align:center;padding:5px 14px;white-space:nowrap;"><div title="Certificate is on file but expiry date is not set. Edit the personnel to add it." style="font-size:0.68rem;font-weight:700;color:#e65100;display:inline-block;cursor:default;">SET EXPIRY</div></td>';
            const _now = new Date(); _now.setHours(0,0,0,0);
            const _ed  = new Date(_exp); _ed.setHours(0,0,0,0);
            const _d   = Math.round((_ed - _now) / 86400000);
            const _col = _d < 0 ? '#c62828' : '#2e7d32';
            const _tip = _d < 0 ? 'Expired' : 'Valid';
            return `<td style="text-align:center;padding:5px 14px;white-space:nowrap;"><div title="${_tip}" style="font-size:0.68rem;font-weight:700;color:${_col};cursor:default;">${_exp}</div></td>`;
        })();
        rows += `
        <tr id="p-row-${origIdx}" style="${rowBg}">
            <td style="text-align:left;position:sticky;left:0;z-index:5;${stickyBg}padding:5px 10px 5px 12px;white-space:nowrap;">
                <span class="p-row-num">${di}</span>
                <span class="p-view-text" onclick="pcViewPersonnel(${origIdx})" style="display:inline-block;vertical-align:middle;font-size:0.72rem;text-transform:uppercase;cursor:pointer;text-decoration:none;${hasToUpdate?'color:#c62828;font-weight:800;':'color:var(--text-primary);font-weight:400;'}">${(p.name||'').toUpperCase()}</span>
                ${hasToUpdate ? `<i class="fas fa-circle-exclamation" title="TO UPDATE" style="font-size:0.75rem;color:#ef5350;margin-left:5px;vertical-align:middle;"></i>` : ''}
            </td>
            <td style="text-align:center;padding:5px 8px;white-space:nowrap;">${posDisplay}</td>
            <td style="text-align:center;padding:5px 14px;white-space:nowrap;font-size:0.72rem;color:var(--text-primary);font-weight:400;">${p.id||'—'}</td>
            ${_certCell}
            ${state.isEditing ? `<td style="text-align:center;padding:5px 12px;white-space:nowrap;">${personnelEditBtn(origIdx, (window._pRegionMap||{})[p.current] || 'OTHER')}</td>` : ''}
        </tr>`;
    });

    return `
    <div class="p-project-card" style="margin-bottom:2px;">
        <div class="p-proj-header${navInfo ? ' proj-nav-bar' : ''}" data-proj-key="${safeKey}" style="${headerBg}">
            <div style="display:flex;align-items:center;gap:8px;padding:7px 16px 7px 18px;color:#1b5e20;font-weight:700;font-size:0.71rem;letter-spacing:0.4px;">
                <div style="flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:flex-start;">
                    ${navInfo ? _pHeaderNavBtn(navInfo.region, -1, navInfo.idx === 0) : ''}
                </div>
                <div style="flex:0 1 auto;min-width:0;text-align:center;">
                    <div>${projName}${_projBadge}</div>
                    <div style="font-size:0.6rem;font-weight:600;opacity:0.75;margin-top:2px;">${navInfo ? `Project ${navInfo.idx + 1} of ${navInfo.total} · ` : ''}${count} personnel</div>
                </div>
                <div style="flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:8px;">
                    ${navInfo ? _pHeaderNavBtn(navInfo.region, 1, navInfo.idx === navInfo.total - 1) : ''}
                </div>
            </div>
        </div>
        <div id="p-proj-body-${safeKey}" style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.72rem;table-layout:fixed;">
                <thead>${P_TABLE_THEAD()}</thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
}

function personnelEditBtn(origIdx, personRegion) {
    if (state.isAdmin) {
        return `<button class="p-edit-btn" id="p-edit-btn-${origIdx}" onclick="openEditPersonnelModal(${origIdx})"><i class="fas fa-edit"></i></button>`;
    }
    if (state.userRole === 'superintendent' && state.userRegion) {
        if (personRegion && personRegion !== state.userRegion && personRegion !== 'OTHER') {
            return `<span title="View Only — ${personRegion} region" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:6px;background:#fff8e1;border:1px solid #ffe082;cursor:default;">
                <i class="fas fa-lock" style="color:#f9a825;font-size:0.75rem;"></i>
            </span>`;
        }
        return `<button class="p-edit-btn" id="p-edit-btn-${origIdx}" onclick="openEditPersonnelModal(${origIdx})"><i class="fas fa-edit"></i></button>`;
    }
    if (state.userRole === 'manager') {
        return `<span title="View Only — Manager Account" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:6px;background:#eceff1;border:1px solid #90a4ae;cursor:default;"><i class="fas fa-eye" style="color:#546e7a;font-size:0.75rem;"></i></span>`;
    }
    return `<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:6px;background:#fce4ec;border:1px solid #f48fb1;cursor:default;" title="View Only">
        <i class="fas fa-lock" style="color:#e91e63;font-size:0.75rem;"></i>
    </span>`;
}

// Project order: strictly A-Z by name. Never depends on personnel data or list order.
const _pProjCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
function _pSortProjectNames(projMap) {
    return Object.keys(projMap).sort((a, b) => _pProjCollator.compare(String(a).trim(), String(b).trim()));
}
// Remember the open project by NAME (not position) so it stays put when the list changes
window._pSelProj = window._pSelProj || {};
window._pSortProjectNames = _pSortProjectNames;

function _pNavProject(region, delta) {
    const key = 'personnel|' + region;
    const projectRegionMap = window._pRegionMap || {};
    const rawData = (state.personnelData || []);
    const projSet = {};
    rawData.forEach(p => {
        const r = (projectRegionMap[p.current] || '').toUpperCase();
        if (r === region && p.current !== 'Corporate Office') (projSet[p.current] = projSet[p.current] || []).push(p);
    });
    const projectNames = _pSortProjectNames(projSet);
    if (!projectNames.length) return;
    let cur = _tabRegionProjectIdx[key] || 0;
    const _selName = window._pSelProj[key];
    if (_selName && projectNames.indexOf(_selName) >= 0) cur = projectNames.indexOf(_selName);
    cur = Math.max(0, Math.min(projectNames.length - 1, cur + delta));
    _tabRegionProjectIdx[key] = cur;
    window._pSelProj[key] = projectNames[cur];
    renderPTable();
}
window._pNavProject = _pNavProject;

function renderPTable() {
    const container = document.getElementById('p-cards-container');
    if (!container) return;

    const isManagerUser = state.userRole === 'manager';
    const pAddBtn = document.getElementById('p-add-personnel-btn');
    if (pAddBtn) pAddBtn.style.display = (!isManagerUser && state.isEditing) ? 'flex' : 'none';
    const pGlobalAction = document.getElementById('p-global-action');
    if (pGlobalAction) {
        if (state.isAdmin) {
            pGlobalAction.style.display = 'flex';
            const editBtn = document.getElementById('p-global-edit-btn');
            const saveBtn = document.getElementById('p-global-save-btn');
            if (editBtn) editBtn.style.display = '';
            if (saveBtn) saveBtn.style.display = 'none';
        } else {
            pGlobalAction.style.display = 'none';
        }
    }

    let projOptions = '<optgroup label="Corporate Office">';
    if (state.isAdmin) projOptions += '<option value="Corporate Office">Corporate Office</option>';
    projOptions += '</optgroup>';
    if (state.projects && state.projects.length > 0) {
        let projectsList = state.projects.filter(p => p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS'); // exclude monitoring-only entities
        if (!state.isAdmin && state.userRegion) {
            projectsList = projectsList.filter(p => p.region === state.userRegion);
        }
        if (projectsList.length > 0) {
            projOptions += '<optgroup label="Project Sites">';
            projOptions += projectsList.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
            projOptions += '</optgroup>';
        }
    }

    let rawData = (state.personnelData || []).map((p, i) => ({ ...p, _origIdx: i }));

    const _isManagerRole = state.userRole === 'manager';
    if (!state.isAdmin && !_isManagerRole) {
        const userRegion = state.userRegion || '';
        if (userRegion) {
            const userProjects = (state.masterProjects || [])
                .filter(p => p.region === userRegion)
                .map(p => p.name);
            rawData = rawData.filter(p => {
                if (p.current === 'Corporate Office') return false; // Corporate Office — admin-only
                return userProjects.includes(p.current);
            });
        }
    }

    const CORP_POS_ORDER = ['QESH Group Manager','QESH Deputy Manager','ESH Manager for Regulation & Compliance','ESH Manager for Project Implementation','Environmental and Sustainability Head','Corporate Physician','Corporate Nurse','Corporate Dentist','QESH Corp. DC','Corporate Safety Officer','Others'];
    const PROJECT_POS_ORDER = ['ESH Superintendent','ESH Head','Safety Officer IV','Safety Officer III','Safety Officer II','Safety Officer I','PCO','Project Physician','Project Nurse','First Aider','Others'];
    const REGION_ORDER = ['CORPORATE','NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];

    const corpPosRank = pos => { const i = CORP_POS_ORDER.indexOf(pos); return i >= 0 ? i : CORP_POS_ORDER.length; };
    const projPosRank = pos => { const i = PROJECT_POS_ORDER.indexOf(pos); return i >= 0 ? i : PROJECT_POS_ORDER.length; };
    const regionRank  = r   => { const i = REGION_ORDER.indexOf((r||'').toUpperCase()); return i >= 0 ? i : REGION_ORDER.length; };

    const projectRegionMap = {};
    (state.masterProjects || state.projects || []).forEach(p => { if (p.name) projectRegionMap[p.name] = (p.region||'').toUpperCase(); });
    window._pRegionMap = projectRegionMap; // expose for personnelEditBtn helper

    const _personnelSortFn = (rankFn) => (a, b) => {
        const aOIC = a.oic ? 1 : 0;
        const bOIC = b.oic ? 1 : 0;
        if (bOIC !== aOIC) return bOIC - aOIC; // OIC goes first
        const rA = rankFn(a.pos), rB = rankFn(b.pos);
        if (rA !== rB) return rA - rB;
        // Same position: if First Aider, sort by date hired (earliest first)
        if (a.pos === 'First Aider' && b.pos === 'First Aider') {
            const dA = a.hired ? new Date(a.hired).getTime() : Infinity;
            const dB = b.hired ? new Date(b.hired).getTime() : Infinity;
            return dA - dB;
        }
        return 0;
    };
    const corpPersonnel    = rawData.filter(p => p.current === 'Corporate Office' || projectRegionMap[p.current] === 'CORPORATE').sort(_personnelSortFn(corpPosRank));
    const projectPersonnel = rawData.filter(p => p.current !== 'Corporate Office' && projectRegionMap[p.current] !== 'CORPORATE');
    projectPersonnel.forEach(p => { p._region = projectRegionMap[p.current] || 'OTHER'; });

    const regionGroups = {};
    projectPersonnel.forEach(p => {
        const r = p._region;
        if (!regionGroups[r]) regionGroups[r] = {};
        if (!regionGroups[r][p.current]) regionGroups[r][p.current] = [];
        regionGroups[r][p.current].push(p);
    });

    Object.values(regionGroups).forEach(projMap => Object.values(projMap).forEach(arr => arr.sort(_personnelSortFn(projPosRank))));

    if ((state.personnelData||[]).length === 0) {
        container.innerHTML = '';
        const emptyEl = document.getElementById('p-empty');
        if (emptyEl) emptyEl.style.display = 'block';
        updatePersonnelSummary();
        return;
    }
    const emptyEl = document.getElementById('p-empty');
    if (emptyEl) emptyEl.style.display = 'none';

    const displayIndexRef = { n: 0 };
    let html = '';

    if (corpPersonnel.length > 0) {
        const grpSafe = 'CORP_OFFICE';
        let _corpRows = '';
        let _corpRowNum = 0;
        corpPersonnel.forEach(item => {
            const origIdx = item._origIdx;
            const p = state.personnelData[origIdx];
            if (!p) return;
            _corpRowNum++;
            displayIndexRef.n++;
            const di = _corpRowNum;
            const _oicBadge = p.oic ? `<span style="display:inline-block;font-size:0.55rem;font-weight:800;color:#e65100;background:#fff3e0;border:1px solid #ffcc80;border-radius:4px;padding:1px 5px;margin-left:5px;vertical-align:middle;letter-spacing:0.3px;">OIC</span>` : '';
            const posDisplay = p.pos && p.pos !== 'Select' ? `<span class="p-pos-badge">${p.pos}</span>${_oicBadge}${oshpBadgeHtml(p)}` : '<span style="color:#bbb;font-size:0.7rem;">—</span>';
            const _hasToUpdate = p.toUpdate && p.toUpdate.length > 0;
            const _rowBg = _hasToUpdate ? 'background:#ffebee;' : (di%2===0?'background:#ffffff;':'background:#f4f6f8;');
            const _stickyBg = _hasToUpdate ? 'background:#ffebee;' : (di%2===1?'background:#f4f6f8;':'background:#ffffff;');
            _corpRows += `
            <tr id="p-row-${origIdx}" style="${_rowBg}">
                <td style="text-align:left;position:sticky;left:0;z-index:5;${_stickyBg}padding:5px 10px 5px 12px;white-space:nowrap;">
                    <span class="p-row-num">${di}</span>
                    <span class="p-view-text" onclick="pcViewPersonnel(${origIdx})" style="display:inline-block;vertical-align:middle;font-size:0.72rem;text-transform:uppercase;cursor:pointer;text-decoration:none;${_hasToUpdate?'color:#c62828;font-weight:800;':'color:var(--text-primary);font-weight:400;'}">${(p.name||'').toUpperCase()}</span>
                    ${_hasToUpdate ? `<i class="fas fa-circle-exclamation" title="TO UPDATE" style="font-size:0.75rem;color:#ef5350;margin-left:5px;vertical-align:middle;"></i>` : ''}
                </td>
                <td style="text-align:center;padding:5px 8px;white-space:nowrap;">${posDisplay}</td>
                <td style="text-align:center;padding:5px 14px;white-space:nowrap;font-size:0.72rem;color:var(--text-primary);font-weight:400;">${p.id||'—'}</td>
                ${state.isEditing ? `<td style="text-align:center;padding:5px 12px;white-space:nowrap;">${personnelEditBtn(origIdx, 'CORPORATE')}</td>` : ''}
            </tr>`;
        });
        const _corpCollapsed = _pCollapsedGroups.has(grpSafe);
        const _corpCanEdit = UserAccounts.canEdit(state.currentUser?.email, 'CORPORATE');
        html += `
        ${window.regionBanner({ id: `p-grp-banner-${grpSafe}`, reg: 'CORPORATE', cls: 'overall-rb', onclick: "pToggleGroup('CORP_OFFICE')", collapsed: _corpCollapsed, editable: _corpCanEdit, style: `margin-bottom:${_corpCollapsed?'6px':'0'};`,
            right: `<span class="rbadge rbadge-count">${corpPersonnel.length} PERSONNEL</span>` })}
        <div id="p-grp-body-${grpSafe}" class="region-content${_corpCollapsed?' collapsed':''}" style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.72rem;table-layout:fixed;">
                <thead>${P_CORP_TABLE_THEAD()}</thead>
                <tbody>${_corpRows}</tbody>
            </table>
        </div>`;
    }

    const sortedRegionKeys = Object.keys(regionGroups).filter(r => r !== 'CORPORATE').sort((a,b) => regionRank(a)-regionRank(b));

    sortedRegionKeys.forEach(region => {
        const projMap = regionGroups[region];
        const regionLabelMap = { 'NCR':'📍 NCR','SOUTH LUZON':'📍 SOUTH LUZON','NORTH LUZON':'📍 NORTH LUZON','VISAYAS & MINDANAO':'📍 VISAYAS & MINDANAO','CORPORATE':'🏢 CORPORATE' };
        const regionLabel = regionLabelMap[region] || `📍 ${region}`;
        const regionCount = Object.values(projMap).reduce((acc,arr) => acc+arr.length, 0);
        const grpSafe = region.replace(/[^a-zA-Z0-9]/g,'_');

        // Strictly A-Z by project name
        const projectNames = _pSortProjectNames(projMap);

        const _pNavKey = 'personnel|' + region;
        let _pNavIdx = Math.min(_tabRegionProjectIdx[_pNavKey] || 0, projectNames.length - 1);
        const _pSelName = window._pSelProj[_pNavKey];
        if (_pSelName && projectNames.indexOf(_pSelName) >= 0) _pNavIdx = projectNames.indexOf(_pSelName);
        _tabRegionProjectIdx[_pNavKey] = _pNavIdx;
        window._pSelProj[_pNavKey] = projectNames[_pNavIdx];
        const _showNavBar = projectNames.length > 1;
        const _visibleProjName = projectNames[_pNavIdx];

        const grpIsCollapsed = _pCollapsedGroups.has(grpSafe);
        const grpCanEdit = UserAccounts.canEdit(state.currentUser?.email, region);
        html += `
        ${window.regionBanner({ id: `p-grp-banner-${grpSafe}`, reg: region, icon: 'fa-location-dot', onclick: `pToggleGroupSafe('${grpSafe}')`, collapsed: grpIsCollapsed, editable: grpCanEdit, style: `margin-bottom:${grpIsCollapsed?'6px':'0'};`,
            right: `<span class="rbadge rbadge-count">${regionCount} PERSONNEL</span><span class="rbadge rbadge-count rb-proj">${projectNames.length} PROJECT${projectNames.length!==1?'S':''}</span>` })}
        <div id="p-grp-body-${grpSafe}" class="region-content${grpIsCollapsed?' collapsed':''}">
            ${(() => {
                const _pName = _visibleProjName;
                const _pPersonnel = (projMap[_pName] || []).sort((a,b) => {
                    const aIsOIC = (state.personnelData[a._origIdx] || {}).oic ? 1 : 0;
                    const bIsOIC = (state.personnelData[b._origIdx] || {}).oic ? 1 : 0;
                    if (bIsOIC !== aIsOIC) return bIsOIC - aIsOIC; // OIC goes first
                    const rA = projPosRank(a.pos), rB = projPosRank(b.pos);
                    if (rA !== rB) return rA - rB;
                    if (a.pos === 'First Aider' && b.pos === 'First Aider') {
                        const dA = a.hired ? new Date(a.hired).getTime() : Infinity;
                        const dB = b.hired ? new Date(b.hired).getTime() : Infinity;
                        return dA - dB;
                    }
                    return 0;
                });
                return buildProjectCard(_pName, _pPersonnel, projOptions, displayIndexRef, false, _showNavBar ? { region: region, idx: _pNavIdx, total: projectNames.length } : null);
            })()}
        </div>`;
    });

    container.innerHTML = html;
    updatePersonnelSummary();
}

function updatePersonnelSummary() {
    const data      = state.personnelData || [];
    const badgesEl  = document.getElementById('p-summary-badges');
    const summaryEl = document.getElementById('p-position-summary');
    if (!badgesEl) return;

    const total  = data.length;
    const male   = data.filter(p => p.gen === 'Male').length;
    const female = data.filter(p => p.gen === 'Female').length;

    badgesEl.innerHTML = `
        <span style="background:#e8f5e9;color:#1b5e20;padding:3px 11px;border-radius:20px;font-size:.62rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;">
            <i class="fas fa-users"></i> ${total} Total
        </span>
        <span style="background:#e3f2fd;color:#1565c0;padding:3px 11px;border-radius:20px;font-size:.62rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;">
            ♂ ${male} Male
        </span>
        <span style="background:#fce4ec;color:#c2185b;padding:3px 11px;border-radius:20px;font-size:.62rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;">
            ♀ ${female} Female
        </span>`;

    if (!summaryEl) return;

    const POS_ORDER = [
        'QESH Group Manager','QESH Deputy Manager',
        'ESH Manager for Regulation & Compliance','ESH Manager for Project Implementation',
        'Environmental and Sustainability Head',
        'Corporate Physician','Corporate Nurse','Corporate Dentist','QESH Corp. DC','Corporate Safety Officer',
        'ESH Superintendent','ESH Head',
        'Safety Officer III','Safety Officer II','Safety Officer I',
        'PCO','Project Physician','Project Nurse','First Aider',
        'TMO','ESH Project DC','Others'
    ];
    const POS_ICONS = {
        'QESH Group Manager':'fa-crown','QESH Deputy Manager':'fa-crown',
        'ESH Manager for Regulation & Compliance':'fa-briefcase',
        'ESH Manager for Project Implementation':'fa-briefcase',
        'Environmental and Sustainability Head':'fa-leaf',
        'Corporate Physician':'fa-user-doctor','Corporate Nurse':'fa-user-nurse','Corporate Dentist':'fa-tooth',
        'QESH Corp. DC':'fa-file-shield','Corporate Safety Officer':'fa-helmet-safety',
        'ESH Superintendent':'fa-shield-halved','ESH Head':'fa-shield-halved',
        'Safety Officer III':'fa-helmet-safety','Safety Officer II':'fa-helmet-safety',
        'Safety Officer I':'fa-helmet-safety',
        'PCO':'fa-tree','Project Physician':'fa-user-doctor',
        'Project Nurse':'fa-user-nurse','First Aider':'fa-kit-medical',
        'TMO':'fa-walkie-talkie','ESH Project DC':'fa-file-shield','Others':'fa-user'
    };
    const POS_COLORS = {
        'QESH Group Manager':'#7b1fa2','QESH Deputy Manager':'#8e24aa',
        'ESH Manager for Regulation & Compliance':'#1565c0',
        'ESH Manager for Project Implementation':'#1976d2',
        'Environmental and Sustainability Head':'#388e3c',
        'Corporate Physician':'#0277bd','Corporate Nurse':'#c2185b','Corporate Dentist':'#00838f',
        'QESH Corp. DC':'#455a64','Corporate Safety Officer':'#ef6c00',
        'ESH Superintendent':'#1b5e20','ESH Head':'#2e7d32',
        'Safety Officer III':'#f57c00','Safety Officer II':'#fb8c00',
        'Safety Officer I':'#ffa726',
        'PCO':'#00695c','Project Physician':'#0288d1',
        'Project Nurse':'#d81b60','First Aider':'#b71c1c',
        'TMO':'#37474f','ESH Project DC':'#546e7a','Others':'#78909c'
    };
    const POS_LABELS = {
        'QESH Group Manager':'QESH Grp Mgr','QESH Deputy Manager':'QESH Dep. Mgr',
        'ESH Manager for Regulation & Compliance':'ESH Mgr (Reg)',
        'ESH Manager for Project Implementation':'ESH Mgr (Impl)',
        'Environmental and Sustainability Head':'Env. Head',
        'Corporate Physician':'Corp. Physician','Corporate Nurse':'Corp. Nurse','Corporate Dentist':'Corp. Dentist',
        'QESH Corp. DC':'QESH Corp DC','Corporate Safety Officer':'Corp. SO',
        'ESH Superintendent':'ESH Supt.','ESH Head':'ESH Head',
        'Safety Officer III':'SO III','Safety Officer II':'SO II',
        'Safety Officer I':'SO I',
        'PCO':'PCO','Project Physician':'Proj. Physician',
        'Project Nurse':'Proj. Nurse','First Aider':'First Aider',
        'TMO':'TMO','ESH Project DC':'ESH Proj DC','Others':'Others'
    };

    const counts = {};
    data.forEach(p => { if (p.pos && p.pos !== 'Select') counts[p.pos] = (counts[p.pos]||0)+1; });

    if (Object.keys(counts).length === 0) { summaryEl.innerHTML = ''; return; }

    const sorted = [
        ...POS_ORDER.filter(p => counts[p]),
        ...Object.keys(counts).filter(p => !POS_ORDER.includes(p)).sort()
    ];

    const pills = sorted.map(pos => {
        const cnt   = counts[pos];
        const icon  = POS_ICONS[pos]  || 'fa-user';
        const color = POS_COLORS[pos] || '#546e7a';
        const label = POS_LABELS[pos] || pos;
        const bgLight = color + '12';
        const posAttr = String(pos).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
        return `<div title="${posAttr} — click to view list" data-pos="${posAttr}" onclick="openPositionListModal(this.dataset.pos)" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 14px 10px;border-right:1px solid var(--border-color);min-width:80px;flex:1;position:relative;gap:1px;cursor:pointer;transition:background 0.15s;overflow:hidden;background:${bgLight};" onmouseover="this.style.filter='brightness(0.96)'" onmouseout="this.style.filter=''">
            <i class="fas ${icon}" style="position:absolute;bottom:-6px;right:-4px;font-size:2.6rem;color:${color};opacity:0.10;pointer-events:none;transform:rotate(-10deg);"></i>
            <div style="font-size:1.4rem;font-weight:900;color:${color};line-height:1;position:relative;z-index:1;">${cnt}</div>
            <div style="font-size:0.54rem;color:${color};font-weight:700;text-align:center;line-height:1.3;white-space:nowrap;opacity:0.8;position:relative;z-index:1;">${label}</div>
            <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:${color};opacity:0.6;"></div>
        </div>`;
    }).join('');

    summaryEl.innerHTML = pills;
}

function openPositionListModal(pos) {
    const modal = document.getElementById('positionListModal');
    if (!modal) return;
    const esc = v => String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const list = (state.personnelData || [])
        .map((p, i) => ({ p, i }))
        .filter(x => x.p.pos === pos)
        .sort((a, b) => String(a.p.name || '').localeCompare(String(b.p.name || '')));

    document.getElementById('positionListTitle').textContent = pos;
    document.getElementById('positionListSubtitle').textContent = list.length + ' personnel in this position';

    const searchEl = document.getElementById('positionListSearch');
    if (searchEl) searchEl.value = '';

    const body = document.getElementById('positionListBody');
    if (!list.length) {
        body.innerHTML = '<tr><td colspan="4" class="pl-empty">No personnel found.</td></tr>';
    } else {
        body.innerHTML = list.map((x, n) => `
            <tr>
                <td class="pl-num">${n + 1}</td>
                <td class="pl-name"><span class="pl-link" onclick="pcViewPersonnel(${x.i})" title="View profile">${esc(x.p.name)}</span>${x.p.oic ? ' <span class="pl-oic">OIC</span>' : ''}</td>
                <td>${esc(x.p.current || '—')}</td>
                <td>${x.p.gen === 'Male' ? '<span class="pl-gen m">Male</span>' : x.p.gen === 'Female' ? '<span class="pl-gen f">Female</span>' : esc(x.p.gen || '—')}</td>
            </tr>`).join('');
    }
    eshModalShow(modal);
}

function filterPositionList(q) {
    q = String(q || '').trim().toLowerCase();
    document.querySelectorAll('#positionListBody tr').forEach(tr => {
        tr.style.display = (!q || tr.textContent.toLowerCase().includes(q)) ? '' : 'none';
    });
}

function closePositionListModal() {
    eshModalHide(document.getElementById('positionListModal'));
}

function pRowDelete(i) {
    const person = state.personnelData[i];
    if (!person) return;
    
    if (!state.isAdmin) {
        if (person.current === 'Corporate Office') {
            showToast('Access Denied — Corporate personnel can only be deleted by Admin.', 'warning');
            return;
        }
        const personProj = (state.masterProjects || state.projects || []).find(p => p.name === person.current);
        if (personProj && personProj.region === 'CORPORATE') {
            showToast('Access Denied — Corporate region personnel can only be deleted by Admin.', 'warning');
            return;
        }
        if (state.userRegion) {
            const userProjects = (state.masterProjects || [])
                .filter(p => p.region === state.userRegion)
                .map(p => p.name);
            if (!userProjects.includes(person.current)) {
                showToast('Access Denied - You can only delete personnel from your region', 'error');
                return;
            }
        }
    }
    
    const personName = person.name || 'this personnel';

    showDeleteDialog('Personnel', personName).then(confirmed => {
        if (!confirmed) return;

        const deletedPerson = { ...state.personnelData[i] };
        const deletedIndex  = i;
        const deletedPid    = deletedPerson._pid || null;

        state.personnelData.splice(i, 1);
        renderPTable();
        saveUserData(state.currentUser.email);

        if (deletedPid) {
            PersonnelDB.deletePerson(deletedPid).catch(e => console.warn('PersonnelDB delete failed:', e));
        }

        showUndoToast(`"${personName}" has been removed.`, () => {
            const restoreAt = Math.min(deletedIndex, state.personnelData.length);
            state.personnelData.splice(restoreAt, 0, deletedPerson);
            renderPTable();
            saveUserData(state.currentUser.email);
            if (deletedPerson._pid) {
                PersonnelDB.savePerson(deletedPerson).catch(() => {});
            }
            if (window.showToast) window.showToast('Personnel restored successfully!', 'success');
        });

    });
}

// Personnel search matcher: every word typed must match the start of a word in
// name / position / project, or ID. Email and number are searched only when the
// word looks like an email or a number. Address and gender are not searched.
// Returns 0 when it does not match, otherwise a score (higher = better match).
function pcMatchScore(p, rawQuery) {
    const norm = t => String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[,.;]/g, ' ').replace(/\s+/g, ' ').trim();
    const q = norm(rawQuery);
    if (!q) return 0;
    const words = t => norm(t).split(' ').filter(Boolean);
    const nameW = words(p.name), posW = words(p.pos), projW = words(p.current);
    const startsAny = (arr, tok) => arr.some(w => w.startsWith(tok));
    let score = 1;
    for (const tok of q.split(' ')) {
        let s1 = 0;
        if (startsAny(nameW, tok)) s1 = 3;
        else if (startsAny(posW, tok) || startsAny(projW, tok)) s1 = 2;
        else if (norm(p.id).includes(tok)) s1 = 2;
        else if (/@/.test(tok) && norm(p.mail).includes(tok)) s1 = 1;
        else if (/^[0-9+\-]{3,}$/.test(tok) && norm(p.num).replace(/[\s\-]/g, '').includes(tok.replace(/[\s\-]/g, ''))) s1 = 1;
        if (!s1) return 0;
        score += s1;
    }
    if (norm(p.name).startsWith(q)) score += 5;
    return score;
}

function pcShowSearchDropdown(val) {
    const dropdown = document.getElementById('pc-search-dropdown');
    if (!dropdown) return;

    const query = (val || '').trim().toLowerCase();
    if (!query || !state.personnelData || state.personnelData.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    const column = 'all';
    const fields = ['name','pos','id','current','gen','mail','num','addr'];

    // Region restriction: superintendents only see their own region (mirrors renderPTable logic)
    const _isManagerRole = state.userRole === 'manager';
    const _userRegion = state.userRegion || '';
    let allowedProjects = null;
    if (!state.isAdmin && !_isManagerRole && _userRegion) {
        allowedProjects = new Set(
            (state.masterProjects || state.projects || [])
                .filter(p => p.region === _userRegion)
                .map(p => p.name)
        );
    }

    const matches = [];
    state.personnelData.forEach((p, idx) => {
        if (!p) return;
        if (allowedProjects !== null) {
            if (p.current === 'Corporate Office') return;
            if (!allowedProjects.has(p.current)) return;
        }
        const sc = pcMatchScore(p, query);
        if (sc > 0) matches.push({ idx, p, sc });
    });
    matches.sort((a, b) => b.sc - a.sc);

    if (matches.length === 0) {
        dropdown.innerHTML = '<div style="padding:10px 14px; color:#aaa; font-size:0.75rem;">No results found.</div>';
        dropdown.style.display = 'block';
        return;
    }

    const items = matches.slice(0, 10).map(({ idx, p }) => {
        const name = (p.name || '').toUpperCase();
        const pos  = p.pos  ? `<span style="color:#888; font-size:0.65rem; margin-left:5px;">${p.pos}</span>` : '';
        const proj = p.current ? `<span style="font-size:0.65rem; color:#2e7d32; background:#e8f5e9; padding:1px 7px; border-radius:20px; margin-left:4px;">${p.current}</span>` : '';
        return `<div class="hv-row" onclick="document.getElementById('pc-search-dropdown').style.display='none'; document.getElementById('p-filter-value').value=''; filterPTable(); pcViewPersonnel(${idx});"
            style="padding:9px 14px; cursor:pointer; border-bottom:1px solid #f0f0f0; display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
            <i class="fas fa-user" style="color:#c8e6c9; font-size:0.72rem; margin-right:4px;"></i>
            <span style="font-weight:700; font-size:0.78rem; color:#1b5e20;">${name}</span>${pos}${proj}
        </div>`;
    });

    dropdown.innerHTML = items.join('');
    dropdown.style.display = 'block';
}

document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('pc-search-dropdown');
    const wrapper  = document.getElementById('p-filter-value');
    if (dropdown && wrapper && !wrapper.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

function filterPTable() {
    const column = 'all';
    const filterValue = (document.getElementById('p-filter-value').value || '').toLowerCase();
    const container = document.getElementById('p-cards-container');
    if (!container || !state.personnelData) return;

    if (!filterValue) {
        renderPTable();
        return;
    }

    container.querySelectorAll('[id^="p-proj-body-"], [id^="p-grp-body-"]').forEach(el => el.style.display = '');

    container.querySelectorAll('tr[id^="p-row-"]').forEach(row => {
        const origIdx = parseInt(row.id.replace('p-row-', ''));
        const person = state.personnelData[origIdx];
        if (!person) { row.style.display = 'none'; return; }

        let shouldShow = false;
        if (column === 'all') {
            shouldShow = pcMatchScore(person, filterValue) > 0;
        } else {
            shouldShow = (person[column]||'').toLowerCase().includes(filterValue);
        }
        row.style.display = shouldShow ? '' : 'none';
    });

    container.querySelectorAll('.p-project-card').forEach(card => {
        const visibleRows = card.querySelectorAll('tr[id^="p-row-"]:not([style*="display: none"]):not([style*="display:none"])');
        const cardBody = card.querySelector('[id^="p-proj-body-"]');
        if (cardBody) cardBody.style.display = visibleRows.length ? '' : 'none';
    });
}
