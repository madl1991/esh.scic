
        async function handleLogin(event) {
            event.preventDefault();
            const email = document.getElementById('login-user').value.trim();
            const password = document.getElementById('login-pass').value;
            const errorDiv = document.getElementById('login-error');
            const loginBtn = document.getElementById('login-btn');

            errorDiv.classList.remove('ok');
            errorDiv.innerText = '';

            if (!email || !password) {
                errorDiv.innerText = 'Please enter both email and password';
                return;
            }

            const validDomains = [
                '@scic.com.ph',
                '@ncr.com.ph',
                '@north.com.ph',
                '@south.com.ph',
                '@vismin.com.ph',
                '@ncrpco.com.ph',
                '@southpco.com.ph',
                '@northpco.com.ph',
                '@visminpco.com.ph',
                '@tgm.com.ph',
                '@mab.com.ph',
                '@lmp.com.ph',
                '@wda.com.ph',
                '@corpdc.com.ph',
                '@cbmganda.com.ph',
                '@health.com.ph'
            ];
            
            const emailLower = email.toLowerCase();
            const isValidDomain = validDomains.some(domain => emailLower.endsWith(domain));
            
            if (!isValidDomain) {
                errorDiv.innerText = 'Access restricted to authorized email addresses only';
                return;
            }

            if (!window.firebase || !window.firebaseAuth) {
                errorDiv.innerText = 'Securing workspace, please try again...';
                return;
            }

            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="loading-spinner"></span> Signing in...';

            try {
                const userCredential = await window.firebase.signInWithEmailAndPassword(window.firebaseAuth, email, password);
                const user = userCredential.user;
                state.currentUser = { email: user.email, uid: user.uid };
                state.isLoggedIn = true;
                window._isNewLogin = true; // flag: actual login (not page reload)
                rememberEmailSave(user.email);
                clearLoginPassword();
            } catch (error) {
                console.error('❌ Firebase login error:', error);
                let msg = 'Invalid email or password';
                if (error.code === 'auth/invalid-email') msg = 'Invalid email address';
                else if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later.';
                else if (error.code === 'auth/network-request-failed') msg = 'Network error. Check your connection.';
                errorDiv.innerText = msg;
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Log in';
            }
        }

        // Clears the password field (and resets the show/hide eye + Caps Lock warning). Email stays.
        function clearLoginPassword() {
            const input = document.getElementById('login-pass');
            if (input) { input.value = ''; input.type = 'password'; }
            const eye = document.getElementById('login-eye');
            if (eye) {
                const ic = eye.querySelector('i');
                if (ic) ic.className = 'fas fa-eye';
                eye.setAttribute('aria-label', 'Show password');
            }
            const warn = document.getElementById('login-caps-warn');
            if (warn) warn.style.display = 'none';
        }

        function toggleLoginPass() {
            const input = document.getElementById('login-pass');
            const btn = document.getElementById('login-eye');
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.querySelector('i').className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
            btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        }

        function loginCapsCheck(e) {
            const warn = document.getElementById('login-caps-warn');
            if (!warn) return;
            const on = e.type !== 'blur' && e.getModifierState && e.getModifierState('CapsLock');
            warn.style.display = on ? 'block' : 'none';
        }

        async function handleForgotPassword(event) {
            event.preventDefault();
            const email = document.getElementById('login-user').value.trim();
            const errorDiv = document.getElementById('login-error');
            errorDiv.classList.remove('ok');
            if (!email) {
                errorDiv.innerText = 'Enter your email first, then click Forgot password';
                return;
            }
            if (!window.firebase || !window.firebaseAuth) {
                errorDiv.innerText = 'Securing workspace, please try again...';
                return;
            }
            try {
                await window.firebase.sendPasswordResetEmail(window.firebaseAuth, email);
            } catch (error) {
                if (error.code === 'auth/invalid-email') { errorDiv.innerText = 'Invalid email address'; return; }
                if (error.code === 'auth/network-request-failed') { errorDiv.innerText = 'Network error. Check your connection.'; return; }
                if (error.code === 'auth/too-many-requests') { errorDiv.innerText = 'Too many attempts. Try again later.'; return; }
                // any other error (e.g. user-not-found): show the same message, so we don't reveal which emails exist
            }
            errorDiv.classList.add('ok');
            errorDiv.innerText = 'If this email has an account, a reset link was sent.';
        }

      function handleLogout() {
    showModernDialog('Logout?', 'Are you sure you want to logout?', false, 'Logout').then(async confirmed => {
        if (confirmed) {
            // ── LOGOUT SAVE GUARD ──────────────────────────────────────────
            // Flush any dirty rows to Firestore before logging out so data
            // is never lost due to the user clicking Logout mid-edit.
            if (window.RowSaveManager?.hasDirty()) {
                showToast('Saving unsaved changes before logout…', 'info', 2000);
                try { await window.RowSaveManager.saveAllDirty(); } catch(e) {}
            }
            // ──────────────────────────────────────────────────────────────
            if (state.currentUser) {
                await LoginLogbook.logLogout(state.currentUser);
            }
            localStorage.removeItem('esh_session_start');
            localStorage.removeItem('esh_last_tab');
            backupManager.stopAutoSave();
            await firebaseLogout();
        }
    });
}



        function loadUserData(email) {
            const year = state.selectedYear || 2026;
            const storageKey = `esh_dashboard_${year}_${email}`;
            const savedData = localStorage.getItem(storageKey);

            if (savedData) {
                const data = JSON.parse(savedData);
                state.projects = data.projects || [];
                state.projects.forEach(syncProjectStatus); // ensure status matches workStoppageDate/workResumeDate
                state.projects.forEach(p => {
                    if (p.vals && p.vals['nov-env_violations']) {
                        p.vals['nov-env_violations'] = p.vals['nov-env_violations'].filter(v =>
                            v.dateIssued || v.dateReceived || v.issuingBody || v.refNo || v.violationLaw
                        );
                    }
                    if (p.vals && p.vals['nov-env_novs']) {
                        p.vals['nov-env_novs'] = p.vals['nov-env_novs'].filter(n =>
                            n.dateIssued || n.dateReceived || n.issuingBody || n.refNo ||
                            (n.violations && n.violations.some(v => v.violationLaw))
                        );
                    }
                });
                state.personnelData = data.personnelData || [];
                state.incidentRateData = data.incidentRateData || { recordableCases: 0, lostDays: 0, totalHours: 0 };
                state.oshData = data.oshData || {};
            } else {
                initializeUserProjects(email);
            }
            state.filteredProjects = [...state.projects];
        }

        function initializeUserProjects(email) {
            state.projects = [];
            state.filteredProjects = [];
            saveUserData(email);
        }

        function saveUserData(email) {
            if (!email) return;
            const year = state.selectedYear || 2026;
            const storageKey = `esh_dashboard_${year}_${email}`;

            // Helper: strip heavy/redundant fields from projects before caching.
            // personnelData is NOT included — PersonnelDB saves it independently.
            // doePdfFiles URLs are tiny (just strings), so they're kept.
            function _lightProjects(projects) {
                return (projects || []).map(p => {
                    const copy = { ...p };
                    return copy;
                });
            }

            const data = {
                year:             year,
                projects:         _lightProjects(state.projects),
                // personnelData intentionally omitted — loaded fresh from PersonnelDB on next login
                incidentRateData: state.incidentRateData || { recordableCases: 0, lostDays: 0, totalHours: 0 },
                oshData:          state.oshData || {},
                lastSaved:        new Date().toISOString(),
                timestamp:        Date.now()
            };

            // Proactively free old year caches BEFORE attempting write
            // so we don't hit quota in the first place.
            const _freeOldCaches = () => {
                for (let _i = localStorage.length - 1; _i >= 0; _i--) {
                    const _k = localStorage.key(_i);
                    if (!_k) continue;
                    if ((_k.startsWith('esh_dashboard_') && !_k.includes('_' + year + '_')) ||
                         _k === 'esh_login_logbook' || _k === 'esh_audit_log' ||
                         _k.startsWith('esh_projects_cache_')) {
                        try { localStorage.removeItem(_k); } catch(e){}
                    }
                }
            };

            try {
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch(e) {
                if (e && e.name === 'QuotaExceededError') {
                    _freeOldCaches();
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(data));
                    } catch(e2) {
                        // Last resort: store only the bare minimum for offline recovery
                        try {
                            const minimal = {
                                year, lastSaved: data.lastSaved, timestamp: data.timestamp,
                                incidentRateData: data.incidentRateData,
                                projects: (data.projects || []).map(p => ({
                                    name: p.name, region: p.region, status: p.status,
                                    dateStarted: p.dateStarted, dateFinished: p.dateFinished
                                }))
                            };
                            localStorage.setItem(storageKey, JSON.stringify(minimal));
                        } catch(e3) {
                        }
                    }
                }
            }
        }

        // Status dot class for region AVG badge: >=70 good, 60-69 mid, <60 low
        function rbAvgDotClass(v) {
            return v >= 70 ? 'rb-dot-good' : (v >= 60 ? 'rb-dot-mid' : 'rb-dot-low');
        }

        function openAddProjectModal(region) {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('projectNameInput').value = '';
            document.getElementById('projectDateStarted').value = '';
            document.getElementById('projectDateStarted').max = today;
            document.getElementById('projectDateFinished').value = '';
            document.getElementById('projectDateFinished').max = today;
            document.getElementById('projectRegion').value = region || '';
            document.getElementById('projectModalError').innerText = '';
            document.getElementById('projectAddressInput').value = '';
            onProjectRegionChange(region || ''); // Show/hide date fields based on region
            const _aprojm = document.getElementById('addProjectModal');
            eshModalShow(_aprojm);
        }

        function onProjectRegionChange(region) {
            const dateFields = document.getElementById('projectDateFields');
            const dateStarted = document.getElementById('projectDateStarted');
            if (!dateFields) return;
            if (region === 'CORPORATE') {
                dateFields.style.display = 'none';
                dateStarted.removeAttribute('required');
            } else {
                dateFields.style.display = '';
                dateStarted.setAttribute('required', '');
            }
        }

        function onEditProjectRegionChange(region) {
            const dateFields = document.getElementById('editProjectDateFields');
            const dateStarted = document.getElementById('editProjectDateStarted');
            const wsFields = document.getElementById('editProjectWorkStoppageFields');
            if (!dateFields) return;
            if (region === 'CORPORATE') {
                dateFields.style.display = 'none';
                dateStarted.removeAttribute('required');
                if (wsFields) wsFields.style.display = 'none';
            } else {
                dateFields.style.display = '';
                dateStarted.setAttribute('required', '');
                if (wsFields) wsFields.style.display = '';
            }
        }

        function closeAddProjectModal() {
            const _aprojm = document.getElementById('addProjectModal');
            eshModalHide(_aprojm);
        }

        let confirmModalResolve = null;

        function showConfirmModal() {
            return new Promise((resolve) => {
                confirmModalResolve = resolve;
                const modal = document.getElementById('confirmModal');
                eshModalShow(modal);
            });
        }

        function closeConfirmModal(confirmed) {
            const modal = document.getElementById('confirmModal');
            eshModalHide(modal);
            if (confirmModalResolve) {
                confirmModalResolve(confirmed);
                confirmModalResolve = null;
            }
        }

        document.addEventListener('keydown', function(e) {
            const modal = document.getElementById('confirmModal');
            if (modal && modal.classList.contains('show')) {
                if (e.key === 'Escape') {
                    closeConfirmModal(false);
                } else if (e.key === 'Enter') {
                    closeConfirmModal(true);
                }
            }
        });

        let countdownInterval = null;
        let logoutTimeout = null;

        function showSuccessModal() {
            const modal = document.getElementById('successModal');
            eshModalShow(modal);
            
            let seconds = 3;
            const countdownEl = document.getElementById('countdown-timer');
            countdownEl.textContent = seconds;
            
            countdownInterval = setInterval(() => {
                seconds--;
                if (seconds >= 0) {
                    countdownEl.textContent = seconds;
                }
            }, 1000);
            
            logoutTimeout = setTimeout(async () => {
                await firebaseLogout();
                location.reload();
            }, 3000);
        }

        function closeSuccessModal() {
            const modal = document.getElementById('successModal');
            eshModalHide(modal);
            
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            if (logoutTimeout) {
                clearTimeout(logoutTimeout);
                logoutTimeout = null;
            }
            
            firebaseLogout().then(() => {
                location.reload();
            });
        }

        document.addEventListener('keydown', function(e) {
            const modal = document.getElementById('successModal');
            if (modal && modal.classList.contains('show')) {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    closeSuccessModal();
                }
            }
        });

        function confirmAddProject() {
            const name = document.getElementById('projectNameInput').value.trim();
            const dateStarted = document.getElementById('projectDateStarted').value;
            const dateFinished = document.getElementById('projectDateFinished').value;
            const region = document.getElementById('projectRegion').value;
            const address = document.getElementById('projectAddressInput').value.trim();
            const isRenewable = document.getElementById('projectIsRenewable').checked;
            const errorDiv = document.getElementById('projectModalError');

            errorDiv.innerText = '';

            if (!name) { errorDiv.innerText = 'Project name is required'; return; }
            if (!region) { errorDiv.innerText = 'Region is required'; return; }
            const today = new Date().toISOString().split('T')[0];
            if (region !== 'CORPORATE') {
                if (!dateStarted) { errorDiv.innerText = 'Date started is required'; return; }
                if (dateStarted > today) { errorDiv.innerText = 'Date started cannot be a future date'; return; }
                if (dateFinished && dateFinished > today) { errorDiv.innerText = 'Date finished cannot be a future date'; return; }
                if (dateFinished && new Date(dateFinished) < new Date(dateStarted)) {
                    errorDiv.innerText = 'Date finished cannot be before date started'; return;
                }
            }
            if (state.projects.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                errorDiv.innerText = 'Project name already exists'; return;
            }

            const rbacAdd = UserAccounts.checkPermission(state.currentUser?.email, 'create', region, state.currentTab);
            if (!rbacAdd.allowed) {
                errorDiv.innerText = rbacAdd.reason.replace('403: ', '⚠️ ');
                return;
            }
            if (UserAccounts.isPCO(state.currentUser?.email)) {
                errorDiv.innerText = 'PCO accounts cannot add new projects. Contact your Administrator.';
                return;
            }

            const newProject = {
    name, region, status: 'on-going',
    dateStarted, dateFinished,
    address: address,
    isRenewable: isRenewable,
    vals: {}, selected: false,
    doePdfFiles: {},
    auditData: {
        Q1: { scoreImpl: 0, docuComp: 0 },
        Q2: { scoreImpl: 0, docuComp: 0 },
        Q3: { scoreImpl: 0, docuComp: 0 },
        Q4: { scoreImpl: 0, docuComp: 0 }
    }
};
            state.projects.push(newProject);

            const masterIdx = state.masterProjects.findIndex(p => p.name === name);
            if (masterIdx >= 0) {
                state.masterProjects[masterIdx] = newProject;
            } else {
                state.masterProjects.push(newProject);
            }

            state.projects.sort((a, b) => a.name.localeCompare(b.name));
            reapplyFilters(); // Reapply current filters
            saveUserData(state.currentUser.email); // Save to localStorage immediately
            closeAddProjectModal();
            render();

            showSyncPill('syncing', 'Saving new project to cloud...');
            saveToFirebaseWithRetry().then(success => {
                if (success) {
                    markSyncComplete();
                    try {
                        const dataUserId = getDataSourceUserId();
                        localStorage.removeItem(`esh_projects_cache_${dataUserId}`);
                        localStorage.removeItem(`esh_projects_cache_ts_${dataUserId}`);
                    } catch(e) {}
                } else {
                    markSyncFailed();
                    showToast('Project saved locally but cloud sync failed. Will retry when connection improves.', 'warning');
                }
            }).catch(() => markSyncFailed());
            
            if (isRenewable) {
                showToast(`Project "${name}" added as Renewable Energy project`, 'success');
            } else {
                showToast(`Project "${name}" added successfully`, 'success');
            }
        }

        let editingProjectOriginalName = '';

        function openEditProjectModal(projectName, currentRegion) {
            const project = state.projects.find(p => p.name === projectName);
            if (!project) return;

            editingProjectOriginalName = projectName;
            
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('editProjectDateStarted').setAttribute('max', today);
            document.getElementById('editProjectDateFinished').setAttribute('max', today);
            
            document.getElementById('editProjectNameInput').value = project.name;
            document.getElementById('editProjectDateStarted').value = project.dateStarted || '';
            document.getElementById('editProjectDateFinished').value = project.dateFinished || '';
            document.getElementById('editProjectRegion').value = project.region;
            document.getElementById('editProjectIsRenewable').checked = project.isRenewable || false;
            document.getElementById('editProjectAddressInput').value = project.address || '';
            document.getElementById('editProjectWorkStoppageDate').value = project.workStoppageDate || '';
            document.getElementById('editProjectWorkResumeDate').value = project.workResumeDate || '';
            document.getElementById('editProjectWorkStoppageFields').style.display = (project.region === 'CORPORATE') ? 'none' : '';
            document.getElementById('editProjectModalError').innerText = '';
            onEditProjectRegionChange(project.region); // show/hide date fields based on region
            const _eprojm = document.getElementById('editProjectModal');
            eshModalShow(_eprojm);
        }

        function closeEditProjectModal() {
            const _eprojm = document.getElementById('editProjectModal');
            eshModalHide(_eprojm);
            editingProjectOriginalName = '';
        }

        function confirmEditProject() {
            const newName = document.getElementById('editProjectNameInput').value.trim();
            const dateStarted = document.getElementById('editProjectDateStarted').value;
            const dateFinished = document.getElementById('editProjectDateFinished').value;
            const newRegion = document.getElementById('editProjectRegion').value;
            const address = document.getElementById('editProjectAddressInput').value.trim();
            const isRenewable = document.getElementById('editProjectIsRenewable').checked;
            const errorDiv = document.getElementById('editProjectModalError');

            errorDiv.innerText = '';

            if (!newName) { errorDiv.innerText = 'Project name is required'; return; }
            if (!newRegion) { errorDiv.innerText = 'Region is required'; return; }

            if (newRegion !== 'CORPORATE') {
                if (!dateStarted) { errorDiv.innerText = 'Date started is required'; return; }
                if (dateFinished) {
                    const finishedDate = new Date(dateFinished);
                    const startDate = new Date(dateStarted);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (finishedDate < startDate) {
                        errorDiv.innerText = 'Date finished cannot be before date started';
                        return;
                    }
                    if (finishedDate > today) {
                        errorDiv.innerText = 'Date finished cannot be in the future';
                        return;
                    }
                }
            }
            
            if (newName.toLowerCase() !== editingProjectOriginalName.toLowerCase()) {
                if (state.projects.some(p => p.name.toLowerCase() === newName.toLowerCase())) {
                    errorDiv.innerText = 'Project name already exists'; 
                    return;
                }
            }

            const project = state.projects.find(p => p.name === editingProjectOriginalName);
            if (project) {
                const oldName = editingProjectOriginalName;
                const oldRegion = project.region; // captured before it is overwritten below
                const nameChanged = newName !== oldName;

                project.name = newName;
                project.region = newRegion;
                project.isRenewable = isRenewable;
                project.address = address;

                if (newRegion === 'CORPORATE') {
                    project.dateStarted = '';
                    project.dateFinished = '';
                    project.status = 'on-going';
                    project.workStoppageDate = '';
                    project.workResumeDate = '';
                } else {
                    project.dateStarted = dateStarted;
                    project.dateFinished = dateFinished;
                    const wsDate = document.getElementById('editProjectWorkStoppageDate').value;
                    const wrDate = document.getElementById('editProjectWorkResumeDate').value;
                    if (wsDate && wrDate && wrDate < wsDate) {
                        errorDiv.innerText = 'Resume Date cannot be earlier than the Work Stoppage Date';
                        return;
                    }
                    project.workStoppageDate = wsDate;
                    project.workResumeDate = wrDate;
                    if (dateFinished) {
                        project.status = 'finished';
                    } else if (wsDate && !wrDate) {
                        project.status = 'work-stoppage';
                    } else {
                        // resumed (wsDate + wrDate) or no stoppage at all — treat as on-going
                        project.status = 'on-going';
                    }
                }

                // Update masterProjects with the renamed project
                const mIdx = state.masterProjects.findIndex(p => p.name === oldName);
                if (mIdx >= 0) state.masterProjects[mIdx] = project;

                if (nameChanged) {
                    // Clean stale old-name entry from yearProjectCache (all years)
                    if (state.yearProjectCache) {
                        state.yearProjectCache.forEach((cachedProjects, yr) => {
                            const _cleaned = cachedProjects.filter(p => p.name !== oldName);
                            if (_cleaned.length !== cachedProjects.length) {
                                state.yearProjectCache.set(yr, _cleaned);
                            }
                        });
                    }
                    // Clean any lingering old-name entry from masterProjects
                    const _staleMIdx = state.masterProjects.findIndex(p => p.name === oldName);
                    if (_staleMIdx >= 0 && state.masterProjects[_staleMIdx] !== project) {
                        state.masterProjects.splice(_staleMIdx, 1);
                    }
                    // Update personnel assignments and persist to PersonnelDB
                    (state.personnelData || []).forEach(person => {
                        if (person.current === oldName) {
                            person.current = newName;
                            if (typeof PersonnelDB !== 'undefined') {
                                PersonnelDB.savePerson(person).catch(e => console.warn('PersonnelDB rename-sync failed:', e));
                            }
                        }
                    });
                    // Suppress ESH Calendar RTDB listener echo during rename
                    window._eshSavingActual = true;
                    setTimeout(function() { window._eshSavingActual = false; }, 4000);
                }

                state.projects.sort((a, b) => a.name.localeCompare(b.name));
                reapplyFilters();
                saveUserData(state.currentUser.email);
                closeEditProjectModal();
                render();

                showSyncPill('syncing', 'Saving to cloud...');

                // Use ProjectsDB.renameProject for atomic rename across all storage layers:
                // Firestore (write new doc + delete old doc) + ESH Calendar RTDB (re-key entries)
                const _year = state.selectedYear || new Date().getFullYear();
                if (nameChanged && window.ProjectsDB) {
                    window.ProjectsDB.renameProject(_year, oldName, project, oldRegion)
                        .then(s => s ? markSyncComplete() : markSyncFailed())
                        .catch(() => markSyncFailed());
                } else {
                    saveToFirebaseWithRetry()
                        .then(s => s ? markSyncComplete() : markSyncFailed())
                        .catch(() => markSyncFailed());
                    // Region changed but name did not: Yjs docs are per region, so copy the rows to the new region
                    if (oldRegion !== newRegion && window.ESHDataSync && typeof window.ESHDataSync.renameProjectRows === 'function') {
                        window.ESHDataSync.renameProjectRows(oldName, newName, oldRegion, newRegion)
                            .catch(e => console.warn('Region change: Yjs row copy failed:', e && e.message));
                    }
                }

                showToast(`Project updated${isRenewable ? ' (Renewable Energy)' : ''}`, 'success');
            }
        }

        function handleSearch() {
            try {
                const searchInput = document.getElementById('search-input');
                const regionFilter = document.getElementById('region-filter');
                const statusFilter = document.getElementById('status-filter');

                if (!searchInput || !regionFilter || !statusFilter) return;

                const search = searchInput.value.toLowerCase().trim();
                const region = regionFilter.value;
                const status = statusFilter.value;

                state.searchTerm = searchInput.value;
                state.regionFilter = region;
                state.statusFilter = status;

                let filtered = [...state.projects];
                filtered.forEach(syncProjectStatus); // ensure p.status reflects workStoppageDate/workResumeDate before filtering
                if (search)  filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
                if (region)  filtered = filtered.filter(p => p.region === region);
                if (status)  filtered = filtered.filter(p => p.status === status);
                state.filteredProjects = filtered;

                // ── Overall tab: pure DOM filter — no render() so search bar & dropdown stay intact ──
                if (state.currentTab === 'overall') {
                    const names = new Set(filtered.map(p => p.name));
                    document.querySelectorAll('.project-row[data-pname]').forEach(row => {
                        const rowName = row.getAttribute('data-pname');
                        const rowStatus = row.getAttribute('data-status'); // uses _derivedStatus set at render time
                        const nameMatch = names.has(rowName);
                        const statusMatch = !status || rowStatus === status;
                        row.style.display = (nameMatch && statusMatch) ? '' : 'none';
                    });
                    // Hide region sections that become fully empty after filter
                    document.querySelectorAll('[id^="region-content-"]').forEach(sec => {
                        const hasVisible = sec.querySelector('.project-row[data-pname]:not([style*="display: none"]):not([style*="display:none"])');
                        const header = sec.previousElementSibling;
                        if (header) header.style.display = hasVisible ? '' : 'none';
                        sec.style.display = hasVisible ? '' : 'none';
                    });
                    return;
                }

                // All other tabs: full re-render (original behaviour)
                const activeElement = document.activeElement;
                const cursorPosition = searchInput.selectionStart;
                render();
                if (activeElement && activeElement.id === 'search-input') {
                    const newSearchInput = document.getElementById('search-input');
                    if (newSearchInput) {
                        newSearchInput.focus();
                        newSearchInput.setSelectionRange(cursorPosition, cursorPosition);
                    }
                }
            } catch (error) {
                console.error('Error in handleSearch:', error);
            }
        }

        function reapplyFilters() {
            const search = state.searchTerm.toLowerCase().trim();
            const region = state.regionFilter;
            const status = state.statusFilter;

            let filtered = [...state.projects];
            
            if (search) {
                filtered = filtered.filter(p => 
                    p.name.toLowerCase().includes(search)
                );
            }
            
            if (region && region !== '') {
                filtered = filtered.filter(p => p.region === region);
            }
            
            if (status && status !== '') {
                filtered = filtered.filter(p => p.status === status);
            }
            
            state.filteredProjects = filtered;
        }

        function toggleEdit() {
            const _editableRoles = ['pco', 'envi_head', 'admin', 'superintendent'];
            if (!_editableRoles.includes(state.userRole)) {
                showToast('Your account is view-only.', 'warning');
                return;
            }

            const latestYear = Math.max(...availableYears);
            const isPastYear = state.selectedYear < latestYear;
            if (isPastYear && !state.isAdmin) {
                showToast(`${state.selectedYear} is a past year — view-only for your account. Only Admin can make corrections.`, 'warning');
                return;
            }

            window._editSnapshot = _takeEditSnapshot(); // for Cancel (discard without page reload)
            state.isEditing = true;
            document.body.classList.add('is-editing');
            const _eshEditTabs = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills','esh-calendar-corp-drills'];
            if (_eshEditTabs.includes(state.currentTab)) {
                try { eshFetchAndRender(state.currentTab); } catch(e) {}
            }
            
            const floatingBtn = document.getElementById('floating-edit-btn');
            const floatingIcon = document.getElementById('floating-edit-icon');
            const floatingTooltip = document.getElementById('floating-edit-tooltip');
            
            if (floatingBtn) {
                floatingBtn.classList.add('save-mode');
                floatingBtn.setAttribute('onclick', 'saveData()');
                floatingBtn.setAttribute('aria-label', 'Save changes');
            }
            if (floatingIcon) {
                floatingIcon.className = 'fas fa-save';
            }
            if (floatingTooltip) {
                floatingTooltip.textContent = 'Click to Save';
            }

            // For KPM tab: refresh each region table in-place instead of full render()
            // This avoids destroying inputs and causing scroll jumps
            if (state.currentTab === 'kpm' && typeof window.kpmRefreshRegion === 'function') {
                ['NCR','SOUTH_LUZON','NORTH_LUZON','VISAYAS___MINDANAO'].forEach(function(rk) {
                    window.kpmRefreshRegion(rk);
                });
            } else {
                const _mc = document.getElementById('main-content');
                const _scrollBefore = _mc ? _mc.scrollTop : 0;
                render();
                if (_mc && _scrollBefore > 0) {
                    requestAnimationFrame(() => { _mc.scrollTop = _scrollBefore; });
                }
            }
        }

        // ── Cancel editing (no page reload) ─────────────────────────────────
        function _takeEditSnapshot() {
            try {
                return JSON.stringify({
                    projects: state.projects,
                    incidentRateData: state.incidentRateData || null,
                    oshData: state.oshData || {}
                });
            } catch (e) { return null; }
        }
        function _editHasChanges() {
            if (!window._editSnapshot) return true; // unknown start point → ask first
            return _takeEditSnapshot() !== window._editSnapshot;
        }
        function cancelEdit() {
            if (!state.isEditing) return;
            const _cMc = document.getElementById('main-content');
            const _cScroll = _cMc ? _cMc.scrollTop : 0;

            // Put the data back the way it was when editing started (in memory — no reload)
            let _restored = false;
            if (window._editSnapshot) {
                try {
                    const snap = JSON.parse(window._editSnapshot);
                    state.projects = snap.projects || [];
                    if (snap.incidentRateData) state.incidentRateData = snap.incidentRateData;
                    state.oshData = snap.oshData || {};
                    _restored = true;
                } catch (e) {  }
            }
            if (!_restored && state.currentUser && state.currentUser.email) {
                try { loadUserData(state.currentUser.email); } catch (e) {  }
            }
            window._editSnapshot = null;
            try { reapplyFilters(); } catch (e) { state.filteredProjects = [...state.projects]; }

            state.isEditing = false;
            document.body.classList.remove('is-editing');

            const fb = document.getElementById('floating-edit-btn');
            const fi = document.getElementById('floating-edit-icon');
            const ft = document.getElementById('floating-edit-tooltip');
            if (fb) {
                fb.classList.remove('save-mode');
                fb.setAttribute('onclick', 'toggleEdit()');
                fb.setAttribute('aria-label', 'Edit mode');
                fb.style.pointerEvents = 'auto';
                fb.style.opacity = '1';
            }
            if (fi) fi.className = 'fas fa-edit';
            if (ft) ft.textContent = 'Click to Edit';

            // Redraw in place (same way Save does) — keeps scroll position
            const _escTabs = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills','esh-calendar-corp-drills'];
            if (_escTabs.includes(state.currentTab)) {
                try { eshFetchAndRender(state.currentTab); } catch (e) {}
            } else if (state.currentTab === 'kpm' && typeof window.kpmRefreshRegion === 'function') {
                ['NCR','SOUTH_LUZON','NORTH_LUZON','VISAYAS___MINDANAO'].forEach(function(rk) { window.kpmRefreshRegion(rk); });
            } else {
                render();
                if (_cMc && _cScroll > 0) requestAnimationFrame(() => { _cMc.scrollTop = _cScroll; });
            }
            showToast('Editing cancelled — unsaved changes discarded.', 'info', 2500);
        }
        async function requestCancelEdit() {
            if (!state.isEditing || window._cancelEditDialogOpen) return;
            if (_editHasChanges()) {
                window._cancelEditDialogOpen = true;
                let ok = false;
                try {
                    ok = await showModernDialog(
                        'Cancel Editing?',
                        'Unsaved changes will be discarded. The page will not reload.',
                        true, 'Discard changes', 'Keep editing');
                } finally { window._cancelEditDialogOpen = false; }
                if (!ok) return;
            }
            cancelEdit();
        }
        window.cancelEdit = cancelEdit;
        window.requestCancelEdit = requestCancelEdit;

        async function saveData() {
            const floatingBtn = document.getElementById('floating-edit-btn');
            const floatingIcon = document.getElementById('floating-edit-icon');
            const floatingTooltip = document.getElementById('floating-edit-tooltip');

            state.isEditing = false;
            document.body.classList.remove('is-editing');
            // BEFORE disabling the button — prevents visible freeze
            if (state.currentTab === 'lta-registry' && typeof renderLtaRegistryTab === 'function') {
                renderLtaRegistryTab();
            }

            if (floatingBtn) {
                floatingBtn.style.pointerEvents = 'none';
                floatingBtn.style.opacity = '0.6';
            }
            if (floatingIcon) {
                floatingIcon.className = 'fas fa-spinner fa-spin';
            }
            if (floatingTooltip) {
                floatingTooltip.textContent = 'Saving...';
            }
            
            saveUserData(state.currentUser.email);

            // Save all appliances data together with main data
            if (typeof window.appliancesSaveAll === 'function') {
                window.appliancesSaveAll();
            }

            markPendingSync();

            showSyncPill('syncing', 'Syncing to cloud...');
            
            let success = false;
            if (!navigator.onLine) {
                state.offlineQueue = state.offlineQueue || [];
                state.offlineQueue.push({ id: Date.now(), action: 'SAVE_ALL', timestamp: new Date().toISOString() });
                localStorage.setItem('esh_offline_queue', JSON.stringify(state.offlineQueue));
                success = true; // treat as success since localStorage is saved
                showSyncPill('offline', 'Offline — saved locally, will sync later');
                hideSyncPill(4000);
            } else {
                success = await saveToFirebaseWithRetry();
                if (!success) {
                    state.offlineQueue = state.offlineQueue || [];
                    state.offlineQueue.push({ id: Date.now(), action: 'SAVE_ALL', timestamp: new Date().toISOString() });
                    localStorage.setItem('esh_offline_queue', JSON.stringify(state.offlineQueue));
                    markSyncFailed();
                    success = true; // don't block UI — local is saved
                } else {
                    markSyncComplete();
                }
            }
            
            if (success) {
                if (floatingIcon) floatingIcon.className = 'fas fa-check';
                if (floatingTooltip) floatingTooltip.textContent = 'Saved!';
                
                setTimeout(() => {
                    if (floatingBtn) {
                        floatingBtn.classList.remove('save-mode');
                        floatingBtn.setAttribute('onclick', 'toggleEdit()');
                        floatingBtn.setAttribute('aria-label', 'Edit mode');
                        floatingBtn.style.pointerEvents = 'auto';
                        floatingBtn.style.opacity = '1';
                    }
                    if (floatingIcon) floatingIcon.className = 'fas fa-edit';
                    if (floatingTooltip) floatingTooltip.textContent = 'Click to Edit';
                    const _eshSaveTabs = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills','esh-calendar-corp-drills'];
                    if (_eshSaveTabs.includes(state.currentTab)) {
                        try { eshFetchAndRender(state.currentTab); } catch(e) {}
                    } else if (state.currentTab === 'kpm' && typeof window.kpmRefreshRegion === 'function') {
                        ['NCR','SOUTH_LUZON','NORTH_LUZON','VISAYAS___MINDANAO'].forEach(function(rk) {
                            window.kpmRefreshRegion(rk);
                        });
                    } else {
                        const _saveMc = document.getElementById('main-content');
                        const _saveScroll = _saveMc ? _saveMc.scrollTop : 0;
                        render();
                        if (_saveMc && _saveScroll > 0) {
                            requestAnimationFrame(() => { _saveMc.scrollTop = _saveScroll; });
                        }
                    }
                }, 400);
            } else {
                if (floatingIcon) floatingIcon.className = 'fas fa-times';
                if (floatingTooltip) floatingTooltip.textContent = 'Failed!';
                showToast('Failed to save data. Please try again.', 'error');
                
                setTimeout(() => {
                    if (floatingBtn) {
                        floatingBtn.classList.remove('save-mode');
                        floatingBtn.setAttribute('onclick', 'toggleEdit()');
                        floatingBtn.setAttribute('aria-label', 'Edit mode');
                        floatingBtn.style.pointerEvents = 'auto';
                        floatingBtn.style.opacity = '1';
                    }
                    if (floatingIcon) floatingIcon.className = 'fas fa-edit';
                    if (floatingTooltip) floatingTooltip.textContent = 'Click to Edit';
                    const _eshFailTabs = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills','esh-calendar-corp-drills'];
                    if (_eshFailTabs.includes(state.currentTab)) {
                        try { eshFetchAndRender(state.currentTab); } catch(e) {}
                    } else if (state.currentTab === 'kpm' && typeof window.kpmRefreshRegion === 'function') {
                        ['NCR','SOUTH_LUZON','NORTH_LUZON','VISAYAS___MINDANAO'].forEach(function(rk) {
                            window.kpmRefreshRegion(rk);
                        });
                    } else {
                        const _failMc = document.getElementById('main-content');
                        const _failScroll = _failMc ? _failMc.scrollTop : 0;
                        render();
                        if (_failMc && _failScroll > 0) {
                            requestAnimationFrame(() => { _failMc.scrollTop = _failScroll; });
                        }
                    }
                }, 800);
            }
            
        }


        // ── NAV CONFIG: one place for the sidebar menu + header titles ─────────────
        // group: { label, icon, items[] }   item: { tab, icon, label, title, hidden?, active?, accent?, lock? }
        // title may be a string or a function (for year-based titles). Settings is a standalone item.
        const _navYr = () => state.selectedYear;
        window.NAV_CONFIG = [
            { label: 'Dashboard & Analytics', icon: 'fa-chart-bar', items: [
                { tab: 'headlines', icon: 'fa-house', label: 'Home', title: 'HOME' },
                { tab: 'overall', icon: 'fa-gauge-high', label: 'Overall Summary', title: 'OVERALL SUMMARY', active: true },
                { tab: 'rates', icon: 'fa-chart-line', label: 'Statistics Rate', title: 'STATISTICS RATE' }
            ]},
            { label: 'Monitoring', icon: 'fa-eye', items: [
                { tab: 'exposures', icon: 'fa-stopwatch', label: 'Total Exposures', title: 'TOTAL EXPOSURES' },
                { tab: 'personnel', icon: 'fa-users-viewfinder', label: 'ESH Personnel Monitoring', title: 'ESH PERSONNEL MONITORING' },
                { tab: 'osh-requirement', icon: 'fa-shield-halved', label: 'OSH Personnel Requirement', title: 'OSH PERSONNEL REQUIREMENT MONITORING' },
                { tab: 'activities', icon: 'fa-clipboard-check', label: 'ESH Activities & Programs', title: 'ESH ACTIVITIES AND PROGRAMS' }
            ]},
            { label: 'Reportorial', icon: 'fa-file-alt', items: [
                { tab: 'corporate-kpm', icon: 'fa-chart-bar', label: 'Corporate KPM Report', title: 'CORPORATE KPM MONTHLY REPORT', hidden: true },
                { tab: 'kpm', icon: 'fa-file-lines', label: 'KPM', title: 'KEY PERFORMANCE MEASURES REPORT' },
                { tab: 'got-monitoring', icon: 'fa-bullseye', label: 'GOT Monitoring', title: 'GOALS, OBJECTIVES & TARGETS (GOT) MONITORING' },
                { tab: 'dole', icon: 'fa-file-contract', label: 'DOLE Reportorial', title: 'DOLE REPORTORIAL' },
                { tab: 'emb', icon: 'fa-industry', label: 'EMB Reportorial', title: 'EMB REPORTORIAL' },
                { tab: 'doe', icon: 'fa-solar-panel', label: 'DOE Reportorial', title: 'DOE REPORTORIAL - RENEWABLE ENERGY PROJECTS' },
                { tab: 'env-monthly-report', icon: 'fa-leaf', label: 'Envi Reportorial', title: 'ENVIRONMENTAL MONTHLY REPORT' },
                { tab: 'health-report', icon: 'fa-notes-medical', label: 'Health Reportorial', title: 'HEALTH REPORTORIAL' }
            ]},
            { label: 'ESH Records', icon: 'fa-triangle-exclamation', items: [
                { tab: 'safety-alerts', icon: 'fa-bell', label: 'Safety Alerts', title: 'SAFETY ALERTS' },
                { tab: 'medical', icon: 'fa-triangle-exclamation', label: 'Accident/Incident Record', title: 'ACCIDENT/ INCIDENT RECORD' },
                { tab: 'lta-registry', icon: 'fa-hospital-user', label: 'Incident & Accident Registry', title: 'INCIDENT AND ACCIDENT REGISTRY' },
                { tab: 'tabulation', icon: 'fa-table-list', label: 'Incident Tabulation', title: 'INCIDENT / ACCIDENT TABULATION' },
                { tab: 'nov', icon: 'fa-hard-hat', label: 'OSH Issued NOV', title: 'OSH REGULATORY ISSUED NOV' },
                { tab: 'nov-env', icon: 'fa-leaf', label: 'Envi Issued NOV', title: 'ENVI REGULATORY ISSUED NOV' },
                { tab: 'nov-monitoring', icon: 'fa-chart-gantt', label: 'ESH NOV Monitoring', title: 'ESH NOV MONITORING' }
            ]},
            { label: 'Compliance & Audit', icon: 'fa-magnifying-glass-chart', items: [
                { tab: 'audit', icon: 'fa-magnifying-glass-dollar', label: 'Internal ESH Audit Result', title: 'INTERNAL ESH AUDIT REPORT',
                  lock: { id: 'audit-nav-lock', title: 'Admin only', hidden: true } },
                { tab: 'cshp', icon: 'fa-shield-heart', label: 'CSHP', title: 'CONSTRUCTION SAFETY & HEALTH PROGRAM (DATE APPROVED)' },
                { tab: 'reg', icon: 'fa-certificate', label: 'Certificate of Registration', title: 'DOLE CERTIFICATE OF REGISTRATION (DATE REGISTERED)' },
                { tab: 'doe-permit', icon: 'fa-id-card', label: 'DOE Safety Officer Permit', title: 'DOE SAFETY OFFICER PERMIT' },
                { tab: 'permits', icon: 'fa-leaf', label: 'Environmental Permits', title: 'ENVIRONMENTAL PERMITS/LICENSES/CLEARANCE' },
                { tab: 'env-monitoring', icon: 'fa-seedling', label: 'Environmental Monitoring', title: 'ENVIRONMENTAL MONITORING' }
            ]},
            { label: 'ESH Calendar & Drills', icon: 'fa-calendar-check', items: [
                { tab: 'esh-calendar-env', icon: 'fa-leaf', label: 'Environment Trainings', title: () => `${_navYr()} ESH CALENDAR — ENVIRONMENT TRAININGS` },
                { tab: 'esh-calendar-safety', icon: 'fa-hard-hat', label: 'Safety Trainings', title: () => `${_navYr()} ESH CALENDAR — SAFETY TRAININGS` },
                { tab: 'esh-calendar-health', icon: 'fa-heart-pulse', label: 'Health Awareness', title: () => `${_navYr()} ESH CALENDAR — HEALTH AWARENESS` },
                { tab: 'esh-calendar-drills', icon: 'fa-person-running', label: 'Emergency Drills', title: () => `${_navYr()} ESH CALENDAR — EMERGENCY DRILLS` },
                { tab: 'esh-calendar-corp-drills', icon: 'fa-building-columns', label: 'Corporate Drills', title: () => `${_navYr()} ESH CALENDAR — CORPORATE DRILLS`, accent: 'yellow' }
            ]},
            { tab: 'settings', icon: 'fa-sliders', label: 'Settings', title: 'SETTINGS', hidden: true }
        ];
        window.NAV_ITEMS = [];
        NAV_CONFIG.forEach(g => (g.items || [g]).forEach(i => NAV_ITEMS.push(i)));

        function navTitle(t) {
            const it = NAV_ITEMS.find(i => i.tab === t);
            if (!it) return t.toUpperCase();
            return typeof it.title === 'function' ? it.title() : it.title;
        }
        function _navEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
        function _navItemHtml(i) {
            const lock = i.lock
                ? ' <i class="fas fa-lock nav-lock' + (i.lock.cls ? ' ' + i.lock.cls : '') + '" id="' + i.lock.id + '"'
                  + (i.lock.hidden ? ' style="display:none;"' : '') + ' title="' + _navEsc(i.lock.title) + '"></i>'
                : '';
            return '<div class="nav-item' + (i.active ? ' active' : '') + (i.accent ? ' nav-accent-' + i.accent : '') + '"'
                + ' data-tab="' + i.tab + '" onclick="changeTab(\'' + i.tab + '\')"' + (i.hidden ? ' style="display:none;"' : '') + '>'
                + '<i class="fas ' + i.icon + '"></i> ' + _navEsc(i.label) + lock + '</div>';
        }
        function renderNav() {
            const nav = document.getElementById('main-nav');
            if (!nav) return;
            nav.innerHTML = NAV_CONFIG.map(g => g.items
                ? '<div class="nav-group"><div class="nav-group-header collapsed" onclick="toggleNavGroup(this)">'
                  + '<span><i class="fas ' + g.icon + '"></i> ' + _navEsc(g.label) + '</span><i class="fas fa-chevron-down chevron"></i></div>'
                  + '<div class="nav-group-items collapsed">' + g.items.map(_navItemHtml).join('') + '</div></div>'
                : _navItemHtml(g)).join('');
        }
        renderNav();

        function toggleNavGroup(header) {
            const items = header.nextElementSibling;
            const isCollapsed = items.classList.contains('collapsed');

            if (isCollapsed) {
                items.classList.remove('collapsed');
                header.classList.remove('collapsed');
                items.style.height = items.scrollHeight + 'px';
                items.addEventListener('transitionend', function handler() {
                    items.style.height = 'auto';
                    items.removeEventListener('transitionend', handler);
                });
            } else {
                items.style.height = items.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        items.classList.add('collapsed');
                        header.classList.add('collapsed');
                    });
                });
            }

            const groupName = header.querySelector('span').textContent.trim();
            const navGroupStates = JSON.parse(localStorage.getItem('navGroupStates') || '{}');
            const newState = isCollapsed; // will be expanded
            navGroupStates[groupName] = newState;
            localStorage.setItem('navGroupStates', JSON.stringify(navGroupStates));
        }
        
        function restoreNavGroupStates() {
            const navGroupStates = JSON.parse(localStorage.getItem('navGroupStates') || '{}');
            document.querySelectorAll('.nav-group-header').forEach(header => {
                const groupName = header.querySelector('span').textContent.trim();
                const isExpanded = navGroupStates[groupName];
                
                if (isExpanded === true) {
                    const items = header.nextElementSibling;
                    items.classList.remove('collapsed');
                    header.classList.remove('collapsed');
                    items.style.height = 'auto';
                }
            });
        }

        function renderRbacBanner() {
            const el = document.getElementById('global-rbac-banner');
            if (!el) return;

            const email = state.currentUser?.email;
            if (!email) { el.style.display = 'none'; return; }

            const info = UserAccounts.getUserInfo(email);
            const tab = state.currentTab;

            let bannerHtml = '';
            if (!document.getElementById('rbac-line-css')) {
                const st = document.createElement('style');
                st.id = 'rbac-line-css';
                st.textContent = '.rbac-line{padding:4px 18px;font-size:.7rem;color:#6b7770;background:#f5f7f6;border-bottom:1px solid #e3e9e4;font-weight:500}'
                    + '.rbac-line b{font-weight:600;color:#4a5750}'
                    + 'body.dark-mode .rbac-line{background:#1b261f;border-color:#2f4034;color:#9fb0a4}'
                    + 'body.dark-mode .rbac-line b{color:#c5d3c9}';
                document.head.appendChild(st);
            }
            const _line = (text, tip) => `<div class="rbac-line"${tip ? ` title="${tip}"` : ''}>${text}</div>`;

            if (info.role === 'admin') {
                bannerHtml = _line('<b>Admin</b> · CORPORATE · Read: all regions · Write: CORPORATE only',
                    'Includes Settings, Personnel, User Mgmt, Audit');
            }

            if (info.role === 'superintendent') {
                const isSuperEditableTab = [
                    'overall','rates','exposures','medical','nov','nov-monitoring',
                    'activities','kpm','dole','doe','doe-permit','cshp','reg',
                    'personnel','osh-requirement','tabulation','got-monitoring',
                    'lta-registry','health-report',
                    'esh-calendar-safety','esh-calendar-health','esh-calendar-drills'
                ].includes(tab);
                bannerHtml = _line(`<b>Superintendent</b> · ${info.region} · ${isSuperEditableTab ? 'Editable' : 'Read-only'}`,
                    `Write: Safety &amp; Health tabs within ${info.region}. Env tabs managed by PCO. Corporate Drills is Admin-managed only.`);
            }

            if (info.role === 'pco') {
                const isPcoEditableTab = UserAccounts.PCO_EDITABLE_TABS && UserAccounts.PCO_EDITABLE_TABS.includes(tab);
                bannerHtml = _line(`<b>PCO</b> · ${info.region} · ${isPcoEditableTab ? 'Editable' : 'Read-only'}`,
                    'PCO can only edit Environmental modules: Env Monitoring, EMB Reportorial, Env Permits, ESH Calendar (Env)');
            }

            if (info.role === 'manager') {
                bannerHtml = _line('<b>Manager</b> · View only', 'Contact Admin to request edit access');
            }

            if (info.role === 'doc_controller') {
                bannerHtml = _line('<b>Document Controller</b> · View only', 'Document control functions are managed through the Admin panel');
            }

            if (info.role === 'envi_head') {
                const isEnviTab = UserAccounts.ENVI_HEAD_EDITABLE_TABS && UserAccounts.ENVI_HEAD_EDITABLE_TABS.includes(tab);
                bannerHtml = _line(`<b>Environmental Head</b> · ${isEnviTab ? 'Editable' : 'Read-only'}`,
                    'Editable: Env Monitoring, EMB, Permits, NOV-Env, ESH Calendar (Env)');
            }

            if (info.role === 'corp_nurse') {
                bannerHtml = _line('<b>Corporate Nurse</b> · View only', 'Health data entry is handled by the assigned Superintendent');
            }

            if (bannerHtml) {
                el.innerHTML = bannerHtml;
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
                el.innerHTML = '';
            }
        }

        // ── Shared style for the report tables (Corporate KPM, KPM, GOT) — matches the Statistics Rate tab ──
        window.rptInjectCss = function() {
            if (document.getElementById('rpt-css')) return;
            var st = document.createElement('style');
            st.id = 'rpt-css';
            st.textContent = [
            '.rpt-wrap{margin:0 16px 14px}',
            '.rpt-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:10px;padding:10px 16px;margin-bottom:10px}',
            '.rpt-bar h2{margin:0;font-size:.85rem;font-weight:800;letter-spacing:.04em;color:#2e7d32;text-transform:uppercase}',
            '.rpt-sub{color:#555;font-size:.7rem;flex:1;min-width:180px}',
            '.rpt-sub .rpt-sub-1l{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.6rem}',
            '.rpt-pill{display:inline-block;padding:3px 11px;border-radius:20px;font-size:.62rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;background:#e8f5e9;color:#1b5e20;border:1px solid #a5d6a7;white-space:nowrap}',
            '.rpt-pill.gold{background:#fff8e1;color:#7a5c00;border-color:#ffe082}',
            '.rpt-pill.view{background:#fff;color:#3a6ea5;border-color:#b9cfe8}',
            '.rpt-card{background:#fff;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:10px;overflow:hidden}',
            '.rpt-scroll{overflow-x:auto}',
            '.rpt-table{width:100%;border-collapse:collapse;table-layout:fixed;min-width:1000px}',
            '.rpt-table th,.rpt-table td{width:auto!important;min-width:0!important;max-width:none!important}',
            '.rpt-table thead th.first{width:200px!important}',
            '.rpt-table thead th.avg{width:76px!important}',
            '.rpt-table tbody th{white-space:normal}',
            '.rpt-table th,.rpt-table td{padding:9px 7px;text-align:center;border-right:1px solid #e3e9e4;border-bottom:1px solid #e3e9e4;white-space:nowrap;font-size:.72rem}',
            '.rpt-table th:last-child,.rpt-table td:last-child{border-right:0}',
            '.rpt-table thead th{background:#b9dfbb;color:#1b5e20;font-size:.65rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase}',
            '.rpt-table thead th.now{background:#e65100;color:#fff}',
            '.rpt-table thead th.avg{background:#a5d6a7}',
            '.rpt-table thead th.first,.rpt-table tbody th{text-align:left;padding-left:14px;min-width:150px}',
            '.rpt-table tbody th{background:#fff;font-weight:700;color:#1f2d23;position:sticky;left:0;z-index:1}',
            '.rpt-table tbody th small{display:block;font-weight:400;color:#8a948c;font-size:.62rem;margin-top:1px}',
            '.rpt-table tbody tr:nth-child(even) th,.rpt-table tbody tr:nth-child(even) td{background:#f4faf4}',
            '.rpt-table td{font-weight:700;color:#1b5e20;background:#fff}',
            '.rpt-table td.mid{color:#8a5a00;background:#fff6dc!important}',
            '.rpt-table td.bad{color:#c62828;background:#fdecec!important}',
            '.rpt-table td.none{color:#c4cbc6;font-weight:400}',
            '.rpt-table td.future{color:#d3d8d4;font-weight:400;background:#fafbfa!important}',
            '.rpt-table td.off{background:#eceff1!important}',
            '.rpt-table td.avg{border-left:2px solid #a5d6a7;font-weight:800}',
            '.rpt-table tr.total th,.rpt-table tr.total td{background:#1b5e20!important;color:#fff!important;border-color:#2c6f31}',
            '.rpt-table tr.total td.none,.rpt-table tr.total td.future{color:#8fb893!important;font-weight:400}',
            '.rpt-empty{padding:18px;text-align:center;color:#888;font-size:.74rem;font-style:italic}',
            '.rpt-legend{display:flex;gap:16px;flex-wrap:wrap;align-items:center;padding:8px 16px;font-size:.65rem;color:#4b554d;background:#fff;border-top:1px solid #e3e9e4}',
            '.rpt-legend span::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;vertical-align:-1px}',
            '.rpt-legend .g::before{background:#2e7d32}.rpt-legend .a::before{background:#e0a800}.rpt-legend .r::before{background:#c62828}',
            '.rpt-legend .end{margin-left:auto;color:#8a948c}.rpt-legend .end::before{display:none}',
            'body.dark-mode .rpt-bar,body.dark-mode .rpt-card,body.dark-mode .rpt-legend{background:var(--bg-card,#1e2a22);border-color:#2f4034}',
            'body.dark-mode .rpt-table tbody th,body.dark-mode .rpt-table td{background:var(--bg-card,#1e2a22);color:#c8e6c9;border-color:#2f4034}',
            'body.dark-mode .rpt-table tbody tr:nth-child(even) th,body.dark-mode .rpt-table tbody tr:nth-child(even) td{background:#243329}',
            'body.dark-mode .rpt-table tbody th{color:#e8f5e9}',
            'body.dark-mode .rpt-table thead th{background:#2e5a34;color:#e8f5e9}',
            'body.dark-mode .rpt-sub,body.dark-mode .rpt-legend{color:#a7b5aa}'
            ].join('');
            document.head.appendChild(st);
        };
        // mode 'kpm': >=90 ok, 85-89 mid, <85 bad.  mode 'got': >=75 ok, 50-74 mid, <50 bad.  v is a 0..1 fraction.
        window.rptHead = function(first, months, cur, withAvg) {
            window.rptInjectCss();
            var h = '<th class="first">' + first + '</th>';
            months.forEach(function(m, i) { h += '<th' + (i === cur ? ' class="now"' : '') + '>' + m + '</th>'; });
            if (withAvg) h += '<th class="avg">AVG</th>';
            return h;
        };
        // One source of truth for score colors (table cells + YTD summary text).
        // Uses the value as displayed (1 decimal) so 89.96 → "90.0%" is colored as 90.0%.
        window.rptTone = function(v, mode) {
            var p = Math.round(v * 1000) / 10;
            return mode === 'got' ? (p >= 75 ? 'ok' : p >= 50 ? 'mid' : 'bad') : (p >= 90 ? 'ok' : p >= 85 ? 'mid' : 'bad');
        };
        window.rptTd = function(v, i, cur, mode) {
            if (v === null || v === undefined) return '<td class="' + (i > cur ? 'future' : 'none') + '">—</td>';
            return '<td class="' + window.rptTone(v, mode) + '">' + (v * 100).toFixed(1) + '%</td>';
        };
        window.rptAvgTd = function(v, mode) {
            if (v === null || v === undefined) return '<td class="none avg">—</td>';
            return '<td class="avg ' + window.rptTone(v, mode) + '">' + (v * 100).toFixed(1) + '%</td>';
        };
        window.rptRowHead = function(name, sub) { return '<th>' + name + (sub ? '<small>' + sub + '</small>' : '') + '</th>'; };
        window.rptTotalRow = function(label, vals, cur, overall, mode) {
            var r = '<tr class="total"><th>' + label + '</th>';
            vals.forEach(function(v, i) { r += window.rptTd(v, i, cur, mode); });
            r += (overall === null || overall === undefined) ? '<td class="none avg">—</td>' : '<td class="avg ' + window.rptTone(overall, mode) + '">' + (overall * 100).toFixed(1) + '%</td>';
            return r + '</tr>';
        };
        window.rptLegend = function(mode) {
            var l = mode === 'got'
                ? '<span class="g">≥75% On track</span><span class="a">50–74% Partial</span><span class="r">&lt;50% Needs attention</span>'
                : '<span class="g">≥90% Excellent</span><span class="a">85–89% Satisfactory</span><span class="r">&lt;85% Needs improvement</span>';
            return '<div class="rpt-legend">' + l + '<span class="end">— = no data entered</span></div>';
        };
        window.rptCard = function(title, sub, badges, thead, tbody, mode) {
            window.rptInjectCss();
            return '<div class="rpt-wrap rpt-score">'
                + window.rptBar({ title: title, sub: sub, html: badges })
                + '<div class="rpt-card"><div class="rpt-scroll"><table class="rpt-table"><thead><tr>' + thead + '</tr></thead><tbody>' + tbody + '</tbody></table></div>'
                + window.rptLegend(mode) + '</div></div>';
        };

        // PH OSHS / US OSHA toggle (Statistics Rate tab).
        // Do NOT call changeTab() here. changeTab() replays the slideRight animation
        // on #dashboard-content (opacity 0 + slide from left), which makes the whole tab flick.
        // We only need to re-render with the new standard, so call render() directly.
        // render() already keeps the scroll position.
        window.setRatesStandard = function(std) {
            if (state.currentTab !== 'rates') return;
            if ((state.ratesStandard || 'oshs') === std) return;
            state.ratesStandard = std;
            render();
        };

        function changeTab(t) {
            if (state.userRole === 'pco' && !UserAccounts.PCO_NAV_TABS.includes(t)) t = 'overall'; // PCO can't open tabs hidden from the sidebar
            // Save scroll of current tab before switching
            const _mc = document.getElementById('main-content');
            if (_mc && state.currentTab) {
                try { localStorage.setItem('esh_last_scroll_' + state.currentTab, String(_mc.scrollTop || 0)); } catch(e) {}
            }
            state.currentTab = t;
            localStorage.setItem('esh_last_tab', t);
            if (window.PresenceTracker) PresenceTracker.updateActivity('viewing', { tab: t });
            document.querySelectorAll('.nav-item').forEach(n => {
                const isActive = n.dataset.tab === t;
                n.classList.toggle('active', isActive);
                
                if (isActive && n.parentElement.classList.contains('nav-group-items')) {
                    const groupItems = n.parentElement;
                    const groupHeader = groupItems.previousElementSibling;
                    
                    if (groupItems.classList.contains('collapsed')) {
                        groupItems.classList.remove('collapsed');
                        groupHeader.classList.remove('collapsed');
                        
                        const groupName = groupHeader.querySelector('span').textContent.trim();
                        const navGroupStates = JSON.parse(localStorage.getItem('navGroupStates') || '{}');
                        navGroupStates[groupName] = true; // Expanded
                        localStorage.setItem('navGroupStates', JSON.stringify(navGroupStates));
                    }
                }
            });
            (function(){
                var _ht = document.querySelector('.header-title');
                var _logoByTab = { 'cshp': 'DOLE_LOGO', 'reg': 'DOLE_LOGO', 'dole': 'DOLE_LOGO', 'permits': 'EMB_LOGO', 'emb': 'EMB_LOGO', 'doe': 'DOE_LOGO', 'doe-permit': 'DOE_LOGO' };
                var _lg = _logoByTab[t] ? window[_logoByTab[t]] : '';
                _ht.textContent = '';
                if (_lg) {
                    var _im = document.createElement('img');
                    _im.src = _lg; _im.alt = '';
                    _im.style.cssText = 'height:26px;width:auto;vertical-align:middle;margin-right:10px;border-radius:3px;';
                    _ht.appendChild(_im);
                }
                _ht.appendChild(document.createTextNode(navTitle(t)));
            })();
            document.getElementById('settings-view').classList.toggle('hidden', t !== 'settings');
            document.getElementById('personnel-view').classList.toggle('hidden', t !== 'personnel');
                        document.getElementById('osh-requirement-view').classList.toggle('hidden', t !== 'osh-requirement');
            document.getElementById('env-monitoring-view').classList.toggle('hidden', t !== 'env-monitoring');
            document.getElementById('health-report-view').classList.toggle('hidden', t !== 'health-report');
            document.getElementById('got-monitoring-view').classList.toggle('hidden', t !== 'got-monitoring');
            document.getElementById('nov-env-view').classList.toggle('hidden', t !== 'nov-env');
            document.getElementById('osh-nov-view').classList.toggle('hidden', t !== 'nov');
            document.getElementById('lta-registry-view').classList.toggle('hidden', t !== 'lta-registry');
            document.getElementById('tabulation-view').classList.toggle('hidden', t !== 'tabulation');
            document.getElementById('safety-alerts-view').classList.toggle('hidden', t !== 'safety-alerts');
            document.getElementById('headlines-view').classList.toggle('hidden', t !== 'headlines');
            document.getElementById('dashboard-content').classList.toggle('hidden', t === 'settings' || t === 'personnel' || t === 'osh-requirement' || t === 'env-monitoring' || t === 'health-report' || t === 'got-monitoring' || t === 'nov-env' || t === 'nov' || t === 'lta-registry' || t === 'tabulation' || t === 'safety-alerts' || t === 'headlines');
            
            const pcRates = document.getElementById('trend-chart-persistent-rates');
            const pcMedical = document.getElementById('trend-chart-persistent-medical');
            if (pcRates)   pcRates.style.display   = (t === 'rates')   ? 'block' : 'none';
            if (pcMedical) pcMedical.style.display  = (t === 'medical') ? 'block' : 'none';
            
            const eshCalTabs = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills','esh-calendar-corp-drills'];
            eshCalTabs.forEach(ct => {
                const el = document.getElementById(ct + '-view');
                if (el) el.classList.toggle('hidden', t !== ct);
            });
            const isEshCal = eshCalTabs.includes(t);
            if (isEshCal) {
                document.getElementById('dashboard-content').classList.add('hidden');
                eshFetchAndRender(t);
            }
            
            
            const dashContent = document.getElementById('dashboard-content');
            const settingsView = document.getElementById('settings-view');
            const personnelView = document.getElementById('personnel-view');
            
            if (dashContent && !dashContent.classList.contains('hidden')) {
                dashContent.style.animation = 'none';
                void dashContent.offsetWidth;
                dashContent.style.animation = 'slideRight 0.5s ease-out';
            }
            
            if (settingsView && !settingsView.classList.contains('hidden')) {
                settingsView.style.animation = 'none';
                void settingsView.offsetWidth;
                settingsView.style.animation = 'slideRight 0.5s ease-out';
            }
            
            if (personnelView && !personnelView.classList.contains('hidden')) {
                personnelView.style.animation = 'none';
                void personnelView.offsetWidth;
                personnelView.style.animation = 'slideRight 0.5s ease-out';
            }
            
            if (t === 'settings') {
                populateSettingsTab();
                updateYearDisplay(); // Update year displays in settings
            }
            
            if (t === 'env-monitoring') {
                // Load persisted env data from Yjs/Firestore before rendering
                if (typeof window.loadEnvFromYjs === 'function') {
                    window.loadEnvFromYjs().then(() => {
                        // If Yjs returned 0 rows, try Firebase direct fallback
                        if ((window._envData || []).length === 0 && typeof window.loadEnvFromFirebaseDirect === 'function') {
                            window.loadEnvFromFirebaseDirect();
                        }
                        setTimeout(envInitChart, 50);
                    });
                } else if (typeof window.loadEnvFromFirebaseDirect === 'function') {
                    window.loadEnvFromFirebaseDirect().then(() => setTimeout(envInitChart, 100));
                } else {
                    setTimeout(envInitChart, 100);
                }

            }
            if (t === 'health-report') { setTimeout(renderHealthReport, 100); setTimeout(function(){ if(typeof window.openHealthReportModal==='function') window.openHealthReportModal(); }, 200); }
            if (t === 'got-monitoring') { setTimeout(renderGotMonitoring, 100); }
            if (t === 'nov') { setTimeout(renderOshNovTab, 100); }
            if (t === 'tabulation') { setTimeout(renderTabulation, 100); }
            if (t === 'lta-registry') { setTimeout(renderLtaRegistryTab, 100); }
            if (t === 'headlines') {
                if (typeof initSafetyAlertAwardListeners === 'function') initSafetyAlertAwardListeners();
                setTimeout(function(){ if (typeof renderSafetyAlertAwardPanel === 'function') renderSafetyAlertAwardPanel(); }, 150);
            } else if (typeof stopSafetyAwardCarousel === 'function') {
                stopSafetyAwardCarousel();
            }
            if (t === 'safety-alerts') {
                if (typeof initSafetyAlertAwardListeners === 'function') initSafetyAlertAwardListeners();
                setTimeout(function(){ if (typeof renderSafetyAlertsPage === 'function') renderSafetyAlertsPage(); }, 100);
            }
            
            if (t === 'personnel') { renderPTable(); }
            if (t === 'osh-requirement') { setTimeout(renderOsh2, 100); }
            
            renderRbacBanner();

            if (t === 'corporate-kpm') {
                const _ckAllowed = ['esh@wda.com.ph','esh@tgm.com.ph','esh@mab.com.ph','esh@lmp.com.ph','esh@corpdc.com.ph','esh@cbmganda.com.ph','esh@scic.com.ph'];
                if (!_ckAllowed.includes(state.currentUser?.email)) {
                    showToast('Corporate KPM Report is restricted. Contact WDA System Admin for access.', 'warning');
                    changeTab('overall');
                    return;
                }
            }

            if (t === 'personnel' && state.userRole === 'pco') {
                showToast('ESH Personnel Monitoring is not accessible for PCO accounts.', 'warning');
                changeTab('overall');
                return;
            }

            if (t === 'osh-requirement' && state.userRole === 'pco') {
                showToast('OSH Personnel Requirement is not accessible for PCO accounts.', 'warning');
                changeTab('overall');
                return;
            }
            
            // Universal Excel export button visibility
            const _xlNoRoles  = ['superintendent', 'pco', 'corp_nurse'];
            const _xlNoTabs   = ['settings'];
            const _xlPersonOk = (t !== 'personnel') || (state.isAdmin || state.userRole === 'manager');
            const _showXl     = !_xlNoRoles.includes(state.userRole) && !_xlNoTabs.includes(t) && _xlPersonOk;
            const _uniXlBtn   = document.getElementById('export-excel-btn');
            if (_uniXlBtn) _uniXlBtn.style.display = _showXl ? 'inline-block' : 'none';

            if (window.ESHDataSync) { window.ESHDataSync.onTabChange(t); }
            
            render();
        }

function updateAuditData(pName, qtr, field, val) {
    const p = state.projects.find(x => x.name === pName);
    const rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p?.region, 'audit');
    if (!rbac.allowed) {
        showLockedMessage(rbac.reason);
        return;
    }
    
    const numVal = parseFloat(val);
    if (numVal < 0) {
        showToast('Negative numbers are not allowed', 'warning');
        const input = event?.target;
        if (input) input.value = '';
        return;
    }
    
    if (numVal > 100) {
        showToast('Audit scores cannot exceed 100%', 'warning');
        const input = event?.target;
        if (input) input.value = '100';
        val = '100';
    }
    
    if (p) {
        if (!p.auditData) {
            p.auditData = {
                Q1: { scoreImpl: 0, docuComp: 0 }, Q2: { scoreImpl: 0, docuComp: 0 },
                Q3: { scoreImpl: 0, docuComp: 0 }, Q4: { scoreImpl: 0, docuComp: 0 }
            };
        }
        p.auditData[qtr][field] = parseFloat(val) || 0;
        if (window.RowSaveManager) window.RowSaveManager.markDirty(pName, `auditData_${qtr}_${field}`);
        render(); // Update the average computation on screen
    }
}

        function fmtPhone(val) {
            const digits = val.replace(/\D/g, '').slice(0, 11);
            if (digits.length <= 4) return digits;
            if (digits.length <= 7) return digits.slice(0,4) + ' ' + digits.slice(4);
            return digits.slice(0,4) + ' ' + digits.slice(4,7) + ' ' + digits.slice(7);
        }

        function titleCase(val) {
            return val.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        }

        // Computes the "Total Exposed Man-hour to date" running series for a project (months 1-12).
        // Logic: cumulative Previous-year base + running sum of monthly "Total Exposed Manhour".
        // Per OSHS Rule 1050, "Exposure" = total employee-hours worked, used as the denominator for
        // Frequency Rate / Severity Rate. This is a straight running total for the reporting period
        // and does NOT reset when an LTA/Fatality occurs — LTA/Fatality occurrence and its associated
        // Days Lost/Charged are tracked separately (see "No. of Days w/o LTA" and the Medical tab) and
        // feed the SR numerator, not this denominator. Do not reintroduce a reset-on-LTA rule here.
        function computeExposureToDateSeries(p) {
            const key = 'exposures_Total Exposed Man-hour to date';
            const manhourKey = 'exposures_Total Exposed Manhour';
            const prevBase = parseFloat(p.vals[key] ? (p.vals[key][0] ?? 0) : 0) || 0;
            let cumulative = prevBase;
            const series = new Array(13).fill(0); // index 1..12 used

            for (let i = 1; i <= 12; i++) {
                const monthManhour = parseFloat(p.vals[manhourKey] ? (p.vals[manhourKey][i] ?? '') : '') || 0;
                if (monthManhour > 0 && !(window.isExposureMonthHidden && window.isExposureMonthHidden(i))) cumulative += monthManhour;

                series[i] = cumulative;
            }
            return series;
        }
        window.computeExposureToDateSeries = computeExposureToDateSeries;

        // Total Exposures: a month's figures stay hidden and locked until that month is over
        // (the current month and later months show nothing). Display only: stored values and
        // the auto-computations are not touched.
        // Tabs that use this rule. To apply it to another tab, add the tab name here.
        const UNFINISHED_MONTH_LOCK_TABS = ['exposures', 'activities'];
        // Rows that are auto-generated and may show current-month data in advance (ESH Activities).
        const UNFINISHED_MONTH_EXEMPT_ROWS = ['No. of Identified Near-Miss', 'Drills Conducted', 'Training Conducted'];
        function isExposureMonthHidden(i, row) {
            if (!UNFINISHED_MONTH_LOCK_TABS.includes(state.currentTab)) return false;
            if (state.currentTab === 'activities' && UNFINISHED_MONTH_EXEMPT_ROWS.includes(row)) return false;
            const _n = new Date(); const _cy = _n.getFullYear(); const _cm = _n.getMonth() + 1;
            const _sy = parseInt(state.selectedYear) || _cy;
            return _sy > _cy || (_sy === _cy && i >= _cm);
        }
        window.isExposureMonthHidden = isExposureMonthHidden;

        function updateToDateMonthCells(pName) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            const series = computeExposureToDateSeries(p);

            for (let i = 1; i <= 12; i++) {
                const cumulative = series[i];
                const cell = document.querySelector(`[data-todate-proj="${CSS.escape(pName)}"][data-todate-month="${i}"]`);
                if (cell) {
                    cell.textContent = isExposureMonthHidden(i) ? '' : (cumulative > 0 ? fmtNum(cumulative) : (cumulative === 0 ? '0' : ''));
                    cell.style.color = '';
                    cell.style.fontWeight = '700';
                }
            }

            const ytdCell = document.querySelector(`[data-todate-proj="${CSS.escape(pName)}"][data-todate-month="ytd"]`);
            if (ytdCell) {
                const ytdCum = series[12];
                ytdCell.textContent = ytdCum > 0 ? fmtNum(ytdCum) : (ytdCum === 0 ? '0' : '');
            }
        }

        // Instant DOM update for exposures tab — updates the Overall Summary merged table cells
        // without waiting for the full deferred render. Mirrors updateToDateMonthCells pattern.
        function _updateExposuresSummaryCells(key, mIdx) {
            if (state.currentTab !== 'exposures') return;
            const displayProjects = state.filteredProjects || state.projects || [];
            // mIdx 0 = PREVIOUS column, 1-12 = monthly columns
            // Update the Overall Summary table (merged table at the top, data-expsummary attribute)
            // Find all summary cells for this key+mIdx
            const colIdx = mIdx; // 0=prev, 1-12=months
            // Recalculate the total for this column across all displayed projects
            let colTotal = 0;
            displayProjects.forEach(function(p) {
                const v = p.vals[key] ? (p.vals[key][colIdx] ?? '') : '';
                const n = parseFloat(String(v).replace(/,/g, ''));
                if (!isNaN(n)) colTotal += n;
            });
            // Find the summary cell via data attribute
            const summaryCell = document.querySelector(
                `[data-expsummary-key="${CSS.escape(key)}"][data-expsummary-col="${colIdx}"]`
            );
            if (summaryCell) {
                summaryCell.textContent = (colTotal > 0 && !(colIdx >= 1 && isExposureMonthHidden(colIdx))) ? colTotal.toLocaleString('en-US') : '';
            }
        }
        window._updateExposuresSummaryCells = _updateExposuresSummaryCells;

        function _refreshDateCell(input) {
            const td = input.closest('td');
            if (!td) return;
            const v = input.value;
            const now = new Date();
            const curYear = now.getFullYear();
            const selYear = state.selectedYear || curYear;
            if (selYear !== curYear) return; // only color-code current year
            if (v) {
                td.style.background = '';
                input.style.borderColor = '#a5d6a7';
                input.style.background  = '#c8e6c9';
                input.style.color       = '#2e7d32';
            } else {
                td.style.background = '#ffebee';
                input.style.borderColor = '#ef9a9a';
                input.style.background  = '#fff5f5';
                input.style.color       = '#c62828';
            }
        }
        window._refreshDateCell = _refreshDateCell;

        function updateVal(pName, key, mIdx, val) {
            // Preserve boolean values for checkboxes (do NOT convert false→"false" which is truthy)
            if (typeof val !== 'boolean') {
                val = String(val).replace(/,/g, '');
            }
            const p = state.projects.find(x => x.name === pName);
            const rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p?.region, state.currentTab);
            if (!rbac.allowed) {
                showLockedMessage(rbac.reason);
                render();
                return;
            }
            
            const numVal = typeof val === 'boolean' ? NaN : parseFloat(val);
            if (!isNaN(numVal) && numVal < 0) {
                showToast('Negative numbers are not allowed', 'warning');
                const input = event?.target;
                if (input) input.value = '';
                return;
            }
            
            if (key === 'exposures_No. of Days w/o LTA' && mIdx !== 0 && !isNaN(numVal)) {
                const currentYear = new Date().getFullYear();
                const maxDays = new Date(currentYear, mIdx, 0).getDate();
                if (numVal > maxDays) {
                    showToast(`No. of Days w/o LTA cannot exceed ${maxDays} days for this month`, 'warning');
                    const input = event?.target;
                    if (input) input.value = String(maxDays);
                    val = String(maxDays);
                }
            }
            if (p) {
                if (!p.vals[key]) p.vals[key] = new Array(13).fill("");
                p.vals[key][mIdx] = val;
                if (window.ESHDataSync) {
                    window.ESHDataSync.queueFieldSave(p.region, state.currentTab, pName, key, mIdx, val);
                }
                // Row-level dirty tracking — marks this row as needing a save
                if (window.RowSaveManager) {
                    window.RowSaveManager.markDirty(pName, `${key}_${mIdx}`);
                }
            }
            if (typeof markPendingSync === 'function') markPendingSync();
            if (state.currentTab === 'cshp' || state.currentTab === 'reg' || state.currentTab === 'doe-permit') {
                if (typeof saveUserData === 'function') saveUserData(state.currentUser?.email);
                try {
                    const _activeInput = (typeof event !== 'undefined' && event && event.target && event.target.tagName === 'INPUT') ? event.target : null;
                    if (_activeInput) {
                        _activeInput.value = val;
                        _activeInput.style.borderColor = val ? '#4caf50' : '';
                        _activeInput.style.background  = val ? '#f1fff1' : '';
                    }
                } catch(_domErr) {}
                // DISABLED auto-save on input: Save button only.
                if (typeof saveUserData === 'function') saveUserData(state.currentUser?.email);
            } else {
                // Just mark pending — no Firebase write until Save button
                if (typeof saveUserData === 'function') saveUserData(state.currentUser?.email);
            }
            // Deferred render for _skipRenderTabs: re-render 800ms after user stops typing
            // so data reflects immediately without needing save/refresh
            // Note: _skipRenderTabs are re-rendered by saveData() and _doSnapshotRender()
            // No deferred render here — avoids wiping active input while user is typing

            // FIX: For 'exposures' tab — use targeted DOM updates ONLY (no full render).
            // Full render() during typing destroys the active input even with focus-restore,
            // because the restored element is a NEW DOM node and focus behavior is unreliable.
            // All visible derived values (summary row, Man-hour to date) are updated in-place
            // via _updateExposuresSummaryCells and updateToDateMonthCells — no re-render needed.
            if (state.currentTab === 'exposures') {
                if (key !== 'exposures_Total Exposed Man-hour to date') {
                    _updateExposuresSummaryCells(key, mIdx);
                }
                if (key === 'exposures_Total Exposed Manhour' || key === 'exposures_Total Exposed Man-hour to date') {
                    updateToDateMonthCells(pName);
                }
            }
            // nov-monitoring still uses deferred render (no DOM-surgery helpers available for it yet)
            if (state.currentTab === 'nov-monitoring') {
                const _deferredTabKey = '_novMonitoringDeferredRender';
                const _deferredTabName = 'nov-monitoring';
                clearTimeout(window[_deferredTabKey]);
                window[_deferredTabKey] = setTimeout(function() {
                    if (state.currentTab !== _deferredTabName) return;
                    const _activeEl2 = document.activeElement;
                    const _activeId2 = _activeEl2 ? _activeEl2.id : null;
                    const _activeName2 = _activeEl2 ? _activeEl2.getAttribute('name') : null;
                    const _activeSelStart2 = (_activeEl2 && _activeEl2.selectionStart !== undefined) ? _activeEl2.selectionStart : null;
                    const _activeSelEnd2 = (_activeEl2 && _activeEl2.selectionEnd !== undefined) ? _activeEl2.selectionEnd : null;
                    const _mainEl2 = document.getElementById('main-content') || document.documentElement;
                    const _savedScrollY2 = _mainEl2.scrollTop || 0;
                    render();
                    if (_savedScrollY2 > 0) {
                        requestAnimationFrame(function() { _mainEl2.scrollTop = _savedScrollY2; });
                    }
                    let _restoreEl2 = _activeId2 ? document.getElementById(_activeId2) : null;
                    if (!_restoreEl2 && _activeName2) _restoreEl2 = document.querySelector('[name=' + JSON.stringify(_activeName2) + ']');
                    if (_restoreEl2) {
                        _restoreEl2.focus();
                        if (_activeSelStart2 !== null && _restoreEl2.setSelectionRange) {
                            try { _restoreEl2.setSelectionRange(_activeSelStart2, _activeSelEnd2); } catch(e) {}
                        }
                    }
                }, 300);
            }

            if (state.currentTab === 'rates') {
                const _activeInPanel = document.activeElement?.closest('#incident-tabulation-panel');
                if (!_activeInPanel) {
                    const panel = document.getElementById('incident-tabulation-panel');
                    if (panel) {
                        panel.outerHTML = buildIncidentTabulationHTML();
                    }
                }
            }
            const _skipRenderTabs = ['cshp', 'reg', 'doe-permit', 'exposures', 'activities',
                                     'dole', 'env-monthly-report', 'nov', 'nov-env', 'nov-monitoring',
                                     'medical', 'kpm', 'emb', 'permits', 'lta-registry', 'health-report',
                                     'audit', 'env-monitoring', 'osh-requirement', 'tabulation', 'got-monitoring'];
            if (!_skipRenderTabs.includes(state.currentTab)) {
                const _activeEl = document.activeElement;
                const _activeId = _activeEl ? _activeEl.id : null;
                const _activeName = _activeEl ? _activeEl.getAttribute('name') : null;
                const _activeSelStart = (_activeEl && _activeEl.selectionStart !== undefined) ? _activeEl.selectionStart : null;
                const _activeSelEnd = (_activeEl && _activeEl.selectionEnd !== undefined) ? _activeEl.selectionEnd : null;
                const _mainEl = document.getElementById('main-content') || document.documentElement;
                const _savedScrollY = _mainEl.scrollTop || 0;
                render();
                if (_savedScrollY > 0) {
                    requestAnimationFrame(() => { _mainEl.scrollTop = _savedScrollY; });
                }
                let _restoreEl = _activeId ? document.getElementById(_activeId) : null;
                if (!_restoreEl && _activeName) _restoreEl = document.querySelector('[name=' + JSON.stringify(_activeName) + ']');
                if (_restoreEl) {
                    _restoreEl.focus();
                    if (_activeSelStart !== null && _restoreEl.setSelectionRange) {
                        try { _restoreEl.setSelectionRange(_activeSelStart, _activeSelEnd); } catch(e) {}
                    }
                }
            }
        }

        function addEccEntry(pName) {
            const p = state.projects.find(x => x.name === pName);
            const _rbacEcc = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p?.region, 'permits');
            if (!p || !_rbacEcc.allowed) { showLockedMessage(_rbacEcc.reason); return; }
            const key = 'permits_ECC';
            if (!p.vals[key]) p.vals[key] = {};
            if (!p.vals[key].entries) {
                const old = { permitNo: p.vals[key][1] ?? '', dateIssued: p.vals[key][2] ?? '', expiryDate: p.vals[key][3] ?? '' };
                p.vals[key].entries = (old.permitNo || old.dateIssued || old.expiryDate) ? [old] : [];
                delete p.vals[key][1]; delete p.vals[key][2]; delete p.vals[key][3];
            }
            p.vals[key].entries.push({ permitNo: '', dateIssued: '', expiryDate: '' });
            saveToFirebase();
            render();
        }

        function removeEccEntry(pName, idx) {
            const p = state.projects.find(x => x.name === pName);
            const _rbacEcc = UserAccounts.checkPermission(state.currentUser?.email, 'delete', p?.region, 'permits');
            if (!p || !_rbacEcc.allowed) { showLockedMessage(_rbacEcc.reason); return; }
            const key = 'permits_ECC';
            if (!p.vals[key]?.entries) return;
            showDeleteDialog('ECC Entry', `ECC entry #${idx + 1} of ${pName}`).then(confirmed => {
                if (!confirmed) return;
                const backup = JSON.parse(JSON.stringify(p.vals[key].entries));
                p.vals[key].entries.splice(idx, 1);
                saveToFirebase(); render();
                showUndoToast(`ECC entry #${idx + 1} deleted from ${pName}`, () => {
                    p.vals[key].entries = backup;
                    saveToFirebase(); render();
                });
            });
        }

        function updateEccEntry(pName, idx, field, value) {
            const p = state.projects.find(x => x.name === pName);
            const _rbacEcc = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p?.region, 'permits');
            if (!p || !_rbacEcc.allowed) { showLockedMessage(_rbacEcc.reason); return; }
            const key = 'permits_ECC';
            if (!p.vals[key]) p.vals[key] = {};
            if (!p.vals[key].entries) p.vals[key].entries = [{ permitNo: '', dateIssued: '', expiryDate: '' }];
            if (p.vals[key].entries[idx] !== undefined) {
                p.vals[key].entries[idx][field] = value;
                if (typeof markPendingSync === 'function') markPendingSync(); // FIX: was missing
            }
        }
        const MULTI_ENTRY_PERMITS = [
            'Permit to Transport (PTT)',
            'Permit to Operate (PTO)',
            'Discharge Permit (DP)',
            'NWRB Water Permit'
        ];
        window.MULTI_ENTRY_PERMITS = MULTI_ENTRY_PERMITS;
        const MULTI_ENTRY_SHORT = {
            'Permit to Transport (PTT)': 'PTT',
            'Permit to Operate (PTO)': 'PTO',
            'Discharge Permit (DP)': 'DP',
            'NWRB Water Permit': 'NWRB'
        };
        window.MULTI_ENTRY_SHORT = MULTI_ENTRY_SHORT;
        const NO_EXPIRY_PERMITS = [
            'ECC',
            'Company Registration System (CRS)',
            "Hazardous Waste Generator's ID",
            'NWRB Water Permit'
        ];
        window.NO_EXPIRY_PERMITS = NO_EXPIRY_PERMITS;
        function addMultiPermitEntry(pName, permitRow) {
            const p = state.projects.find(x => x.name === pName);
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p?.region, 'permits');
            if (!p || !_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            const key = 'permits_' + permitRow;
            if (!p.vals[key]) p.vals[key] = {};
            if (!p.vals[key].entries) {
                const old = { permitNo: p.vals[key][1] || '', dateIssued: p.vals[key][2] || '', expiryDate: p.vals[key][3] || '' };
                p.vals[key].entries = (old.permitNo || old.dateIssued || old.expiryDate) ? [old] : [];
                delete p.vals[key][1]; delete p.vals[key][2]; delete p.vals[key][3];
            }
            p.vals[key].entries.push({ permitNo: '', dateIssued: '', expiryDate: '' });
            saveToFirebase(); render();
        }
        window.addMultiPermitEntry = addMultiPermitEntry;
        function removeMultiPermitEntry(pName, permitRow, idx) {
            const p = state.projects.find(x => x.name === pName);
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'delete', p?.region, 'permits');
            if (!p || !_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            const key = 'permits_' + permitRow;
            if (!p.vals[key] || !p.vals[key].entries) return;
            showDeleteDialog('Permit Entry', `${permitRow} entry #${idx + 1} of ${pName}`).then(confirmed => {
                if (!confirmed) return;
                const backup = JSON.parse(JSON.stringify(p.vals[key].entries));
                p.vals[key].entries.splice(idx, 1);
                if (p.vals[key].entries.length === 0) p.vals[key].entries = [{ permitNo: '', dateIssued: '', expiryDate: '' }];
                saveToFirebase(); render();
                showUndoToast(`${permitRow} entry #${idx + 1} deleted from ${pName}`, () => {
                    p.vals[key].entries = backup;
                    saveToFirebase(); render();
                });
            });
        }
        window.removeMultiPermitEntry = removeMultiPermitEntry;

        function addEmbEntry(pName, type) {
            const p = state.projects.find(x => x.name === pName);
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p?.region, 'emb');
            if (!p || !_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            const key = type === 'SMR' ? 'emb_extra_smr' : 'emb_extra_cmr';
            if (!p.vals[key]) p.vals[key] = [];
            if (type === 'SMR') {
                p.vals[key].push({ fac: {'1':'','2':'','3':'','4':''}, sd: {'1':'','2':'','3':'','4':''}, rn: {'1':'','2':'','3':'','4':''} });
            } else {
                p.vals[key].push({ fac: {'1':'','2':''}, sd: {'1':'','2':''}, rn: {'1':'','2':''} });
            }
            saveToFirebase(); render();
        }
        window.addEmbEntry = addEmbEntry;

        function removeEmbEntry(pName, type, idx) {
            const p = state.projects.find(x => x.name === pName);
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'delete', p?.region, 'emb');
            if (!p || !_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            const key = type === 'SMR' ? 'emb_extra_smr' : 'emb_extra_cmr';
            if (!p.vals[key]) return;
            showDeleteDialog('EMB Entry', `${type} entry #${idx + 1} of ${pName}`).then(confirmed => {
                if (!confirmed) return;
                const backup = JSON.parse(JSON.stringify(p.vals[key]));
                p.vals[key].splice(idx, 1);
                saveToFirebase(); render();
                showUndoToast(`${type} entry #${idx + 1} deleted from ${pName}`, () => {
                    p.vals[key] = backup;
                    saveToFirebase(); render();
                });
            });
        }
        window.removeEmbEntry = removeEmbEntry;

        function updateEmbEntry(pName, type, idx, field, period, value) {
            const p = state.projects.find(x => x.name === pName);
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p?.region, 'emb');
            if (!p || !_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            const key = type === 'SMR' ? 'emb_extra_smr' : 'emb_extra_cmr';
            if (!p.vals[key]) p.vals[key] = [];
            if (p.vals[key][idx] && p.vals[key][idx][field]) {
                p.vals[key][idx][field][period] = value;
                if (typeof markPendingSync === 'function') markPendingSync();
            }
        }
        window.updateEmbEntry = updateEmbEntry;

        function updateMultiPermitEntry(pName, permitRow, idx, field, value) {
            const p = state.projects.find(x => x.name === pName);
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p?.region, 'permits');
            if (!p || !_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            const key = 'permits_' + permitRow;
            if (!p.vals[key]) p.vals[key] = {};
            if (!p.vals[key].entries) p.vals[key].entries = [{ permitNo: '', dateIssued: '', expiryDate: '' }];
            if (p.vals[key].entries[idx] !== undefined) {
                p.vals[key].entries[idx][field] = value;
                if (typeof markPendingSync === 'function') markPendingSync();
            }
        }
        window.updateMultiPermitEntry = updateMultiPermitEntry;

        function _pdfSetStatus(msg, type) {
            const colors = {
                uploading: { bg: '#e3f2fd', border: '#1976D2', text: '#0d47a1', icon: 'fa-spinner fa-spin' },
                saving:    { bg: '#fff8e1', border: '#f57c00', text: '#e65100', icon: 'fa-cloud-arrow-up fa-pulse' },
                success:   { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20', icon: 'fa-circle-check' },
                error:     { bg: '#ffebee', border: '#c62828', text: '#b71c1c', icon: 'fa-triangle-exclamation' }
            };
            let el = document.getElementById('_pdf-upload-status-bar');
            if (type === 'clear') { if (el) el.remove(); return; }
            const c = colors[type] || colors.uploading;
            if (!el) {
                el = document.createElement('div');
                el.id = '_pdf-upload-status-bar';
                el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;min-width:320px;max-width:520px;border-radius:10px;padding:10px 18px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,0.18);font-size:0.85rem;font-weight:600;transition:background 0.3s,border-color 0.3s;';
                document.body.appendChild(el);
            }
            el.style.background = c.bg;
            el.style.border = '2px solid ' + c.border;
            el.style.color = c.text;
            el.innerHTML = '<i class="fas ' + c.icon + '" style="font-size:1.1rem;flex-shrink:0;"></i><span>' + msg + '</span>';
        }

        window._pdfSetStatus = _pdfSetStatus; // expose to global scope for cross-closure access

        window.triggerPdfUpload = function(projectName, pdfKey, isReplacement) {
            var inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = '.pdf,application/pdf';
            inp.style.display = 'none';
            document.body.appendChild(inp);
            inp.onchange = function() {
                document.body.removeChild(inp);
                uploadPDF(inp, projectName, pdfKey, !!isReplacement);
            };
            setTimeout(function() { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
            inp.click();
        };

        async function uploadPDF(inputElement, projectName, pdfKey, isReplacement = false) {
            const file = inputElement.files[0];
            if (!file) return;
            try { inputElement.value = ''; } catch(e) {}

            if (file.type !== 'application/pdf') {
                _pdfSetStatus('Please upload PDF files only.', 'error');
                setTimeout(() => _pdfSetStatus('', 'clear'), 4000);
                return;
            }

            if (isReplacement) {
                const confirmed = await showModernDialog(
                    'Replace PDF',
                    'Are you sure you want to replace the existing PDF file with this new one?',
                    true
                );
                if (!confirmed) return;
            }

            _pdfSetStatus('Uploading PDF for <strong>' + projectName + '</strong>…', 'uploading');

            try {
                const project = state.projects.find(p => p.name === projectName);
                if (!project) throw new Error('Project not found: ' + projectName);

                // Note: old file (if replacing) is left in Cloudinary storage — unsigned
                // uploads can't be deleted from the browser for security reasons. Harmless
                // since the free tier gives 25GB.

                const timestamp = Date.now();
                const folder = 'compliance-pdfs/' + projectName.replace(/[^a-zA-Z0-9]/g,'_') + '_' + pdfKey.replace(/[^a-zA-Z0-9]/g,'_') + '_' + timestamp;
                const { url: downloadURL, publicId } = await uploadPdfToCloudinary(file, folder);

                if (!project.vals[pdfKey]) project.vals[pdfKey] = new Array(13).fill('');
                project.vals[pdfKey][1] = {
                    name: file.name,
                    url: downloadURL,
                    cloudinaryId: publicId,
                    uploadedAt: new Date().toISOString(),
                    size: file.size
                };

                _pdfSetStatus('Saving to cloud for <strong>' + projectName + '</strong>…', 'saving');
                if (typeof _saveDebounceTimer !== 'undefined') clearTimeout(_saveDebounceTimer);
                if (window._saveDebounceTimer) clearTimeout(window._saveDebounceTimer);
                saveUserData(state.currentUser?.email);

                let saved = false;
                const _maxAttempts = 6;
                for (let attempt = 0; attempt < _maxAttempts; attempt++) {
                    if (window._isSaving) {
                        await new Promise(res => setTimeout(res, 500 + attempt * 300));
                        continue;
                    }
                    try {
                        saved = await saveToFirebase();
                    } catch(saveErr) {
                    }
                    if (saved) break;
                    await new Promise(res => setTimeout(res, 600));
                }

                if (!saved) {
                    window._isSaving = false;
                    window._isSavingEcho = false;
                    await new Promise(res => setTimeout(res, 200));
                    saved = await saveToFirebase();
                }

                if (!saved) {
                    throw new Error('Could not save to Firestore after multiple attempts. Please refresh and try again.');
                }

                _pdfSetStatus(('' + window.icon("search") + ' Verifying save for <strong>') + projectName + '</strong>…', 'saving');
                let verified = false;
                try {
                    const _verifyRef = window.firebase.doc(
                        window.firebaseDb,
                        'users', 'fUnXsvKnRYMpuySRbeVYJk7TO452',
                        'years', String(state.selectedYear || 2026),
                        'projects', ProjectsDB.getProjectId(projectName)
                    );
                    const _verifySnap = await window.firebase.getDoc(_verifyRef);
                    if (_verifySnap.exists()) {
                        const _verifyData = _verifySnap.data();
                        const _verifyVal = _verifyData?.vals?.[pdfKey];
                        const _savedUrl = Array.isArray(_verifyVal) ? _verifyVal[1]?.url : _verifyVal?.[1]?.url;
                        verified = (_savedUrl === downloadURL);
                        if (!verified) {
                        }
                    }
                } catch(verifyErr) {
                    verified = true;
                }

                const _pdfUpScrollY = (document.getElementById("main-content")||{}).scrollTop || 0; const _pdfUpMc = document.getElementById("main-content");
                render();
                if (_pdfUpScrollY > 0) requestAnimationFrame(() => {
                    if(_pdfUpMc) _pdfUpMc.scrollTop = _pdfUpScrollY;
                });

                if (verified) {
                    _pdfSetStatus((isReplacement ? 'PDF replaced & verified' : 'PDF uploaded & verified') + ' — ' + projectName, 'success');
                } else {
                    _pdfSetStatus('PDF uploaded but save could not be verified. Please refresh to check.', 'error');
                    console.error('❌ PDF save verification FAILED for:', projectName, '| pdfKey:', pdfKey);
                }
                setTimeout(() => _pdfSetStatus('', 'clear'), verified ? 4000 : 8000);

            } catch (error) {
                console.error('❌ PDF upload error:', error);
                _pdfSetStatus('Upload failed: ' + error.message, 'error');
                setTimeout(() => _pdfSetStatus('', 'clear'), 6000);

                const _pdfErrMc = document.getElementById("main-content"); const _pdfErrScrollY = (_pdfErrMc||{}).scrollTop || 0;
                render();
                if (_pdfErrScrollY > 0) requestAnimationFrame(() => { if(_pdfErrMc) _pdfErrMc.scrollTop = _pdfErrScrollY; });
            }
        }

        async function deletePDF(projectName, pdfKey) {
            const project = state.projects.find(p => p.name === projectName);
            if (!project || !project.vals[pdfKey] || !project.vals[pdfKey][1]) return;

            const confirmed = await showModernDialog(
                'Delete PDF',
                'Are you sure you want to delete this PDF file? This action cannot be undone.',
                true
            );

            if (!confirmed) return;

            try {
                // Note: the file itself stays in Cloudinary storage — unsigned uploads can't
                // be deleted from the browser for security reasons. Harmless since files are
                // the free tier gives 25GB.
                project.vals[pdfKey][1] = null;

                _pdfSetStatus('Deleting PDF for <strong>' + projectName + '</strong>…', 'saving');
                saveUserData(state.currentUser?.email);
                let saved = false;
                for (let attempt = 0; attempt < 4; attempt++) {
                    if (window._isSaving) { await new Promise(res => setTimeout(res, 800)); continue; }
                    saved = await saveToFirebase();
                    if (saved) break;
                    await new Promise(res => setTimeout(res, 800));
                }
                if (!saved) { window._isSaving = false; window._isSavingEcho = false; saved = await saveToFirebase(); }
                if (!saved) throw new Error('Could not save deletion to Firestore. Please refresh and try again.');

                const _pdfDelMc = document.getElementById("main-content"); const _pdfDelScrollY = (_pdfDelMc||{}).scrollTop || 0;
                render();
                if (_pdfDelScrollY > 0) requestAnimationFrame(() => { if(_pdfDelMc) _pdfDelMc.scrollTop = _pdfDelScrollY; });

                _pdfSetStatus('PDF deleted — ' + projectName, 'success');
                setTimeout(() => _pdfSetStatus('', 'clear'), 3000);
            } catch (error) {
                console.error('❌ PDF deletion error:', error);
                _pdfSetStatus('Delete failed: ' + error.message, 'error');
                setTimeout(() => _pdfSetStatus('', 'clear'), 5000);
            }
        }

        async function deleteProject(projectName) {
    
    const _isAdminUser = UserAccounts.isAdmin(state.currentUser?.email);

    if (projectName === 'Corporate' && !_isAdminUser) {
        showToast('🏢 The Corporate project cannot be deleted — it is a permanent entity.', 'warning');
        return;
    }

    const PERMANENT_PLANTS = ['Pililla Batching Plant and Yard', 'Sta. Clara Railways Pre-Cast Manufacturing Plant'];
    if (PERMANENT_PLANTS.includes(projectName) && !_isAdminUser) {
        showToast('🏭 Plant facilities cannot be deleted — they are permanent monitoring entities.', 'warning');
        return;
    }
    
    const project = state.projects.find(p => p.name === projectName);
    const rbacDel = UserAccounts.checkPermission(state.currentUser?.email, 'delete', project?.region, state.currentTab);
    if (!rbacDel.allowed) {
        showLockedMessage(rbacDel.reason);
        return;
    }
    
    const beforeValidation = validateState();
    
    const confirmed = await showDeleteDialog('Project', projectName);
    
    if (confirmed) {
        const deletedFromProjects       = state.projects.find(p => p.name === projectName);
        const deletedFromMasterProjects = state.masterProjects.find(p => p.name === projectName);

        state.projects       = state.projects.filter(p => p.name !== projectName);
        state.masterProjects = state.masterProjects.filter(p => p.name !== projectName);

        if (state.yearProjectCache) {
            state.yearProjectCache.forEach((cachedProjects, yr) => {
                state.yearProjectCache.set(yr, cachedProjects.filter(p => p.name !== projectName));
            });
        }

        try {
            const _delCacheUid = getDataSourceUserId();
            localStorage.removeItem(`esh_projects_cache_${_delCacheUid}`);
            localStorage.removeItem(`esh_projects_cache_ts_${_delCacheUid}`);
        } catch(e) {}
        try {
            const _delYear = state.selectedYear || 2026;
            const _delKey = `esh_dashboard_${_delYear}_${state.currentUser?.email}`;
            const _delRaw = localStorage.getItem(_delKey);
            if (_delRaw) {
                const _delData = JSON.parse(_delRaw);
                if (_delData.projects) {
                    _delData.projects = _delData.projects.filter(p => p.name !== projectName);
                    localStorage.setItem(_delKey, JSON.stringify(_delData));
                }
            }
        } catch(e) {}

        reapplyFilters();
        saveUserData(state.currentUser.email);
        render();

        const deletedProject = deletedFromMasterProjects;
        let firestoreDeleteDone = false;
        (async () => {
            if (deletedProject && window.ProjectsDB) {
                const _startYear = deletedProject.dateStarted
                    ? parseInt(deletedProject.dateStarted.split('-')[0])
                    : 2020; // fallback: earliest possible project year in the system
                const _endYear = deletedProject.dateFinished
                    ? parseInt(deletedProject.dateFinished.split('-')[0])
                    : new Date().getFullYear(); // ongoing project: delete up to current year
                const deletePromises = [];
                for (let yr = _startYear; yr <= _endYear; yr++) {
                    deletePromises.push(ProjectsDB.deleteProject(yr, projectName));
                }
                await Promise.all(deletePromises);
            }
            const saved = await saveToFirebaseWithRetry();
            firestoreDeleteDone = true;
            if (saved) {
                AuditLogger.log('PROJECT_DELETED', {
                    projectName: projectName,
                    year: state.selectedYear,
                    remainingProjects: state.projects.length
                });
            } else {
                showToast('Deleted locally — failed to sync to cloud.', 'warning');
            }
        })();

        showUndoToast(`"${projectName}" has been deleted.`, async () => {
            if (deletedFromProjects) state.projects.push(deletedFromProjects);
            if (deletedFromMasterProjects) state.masterProjects.push(deletedFromMasterProjects);
            reapplyFilters();
            saveUserData(state.currentUser.email);
            render();
            if (deletedFromMasterProjects && window.ProjectsDB) {
                const projectsByYear = _buildProjectsByYear([deletedFromMasterProjects]);
                projectsByYear.forEach((_, year) => {
                    ProjectsDB.saveProject(year, deletedFromMasterProjects).catch(() => {});
                });
            }
            saveToFirebaseWithRetry().catch(() => {});
            showToast(`Project "${projectName}" restored!`, 'success');
        });
    } else {
    }
}

     function changeProjectStatus(projectName, event) {
    event.stopPropagation();
    const project = state.projects.find(p => p.name === projectName);
    if (!project) return;

    // Status is auto-derived from dates — show info toast instead of dropdown
    if (project.workStoppageDate && !project.workResumeDate) {
        showToast('Status is automatically set to Work Stoppage. Set a Resume Date in Edit Project to change it.', 'info');
        return;
    }
    
    closeAllStatusDropdowns();
    
    const dropdown = document.createElement('div');
    dropdown.className = 'status-dropdown';
    
    const statuses = [
        { value: 'on-going', label: getStatusLabel('on-going') },
        { value: 'finished', label: getStatusLabel('finished') }
    ];
    
    statuses.forEach(status => {
        const btn = document.createElement('button');
        btn.textContent = status.label;
        btn.style.fontWeight = project.status === status.value ? '700' : '400';
        
        if (status.value === 'finished' && !project.dateFinished) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.title = 'Finished status requires a finished date. Edit the project and add a finished date first.';
        }
        
        btn.onclick = () => {
            if (status.value === 'finished' && !project.dateFinished) {
                showToast('Finished status requires a finished date. Please edit the project and add a finished date first.', 'warning');
                return;
            }
            
            project.status = status.value;
            reapplyFilters(); // Reapply filters after status change
            saveUserData(state.currentUser.email);
            closeAllStatusDropdowns();
            render();
        };
        dropdown.appendChild(btn);
    });
    
    const badge = event.target;
    const rect = badge.getBoundingClientRect();
    
    const dropdownHeight = 120; // Approximate height of dropdown with 3 items
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    dropdown.style.position = 'fixed';
    dropdown.style.left = rect.left + 'px';
    
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        dropdown.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
        dropdown.style.top = 'auto';
    } else {
        dropdown.style.top = (rect.bottom + 5) + 'px';
        dropdown.style.bottom = 'auto';
    }
    
    document.body.appendChild(dropdown);
}

function closeAllStatusDropdowns() {
    document.querySelectorAll('.status-dropdown').forEach(d => d.remove());
}

function isProjectOnStoppage(p) {
    return !!(p.workStoppageDate && !p.workResumeDate);
}

// ── Status labels and badge: one source for On-Going / Work Stoppage / Finished ──
var STATUS_INFO = {
    'on-going':      { label: 'On-Going',      cls: 'status-ongoing' },
    'work-stoppage': { label: 'Work Stoppage', cls: 'status-stoppage' },
    'finished':      { label: 'Finished',      cls: 'status-finished' }
};
function getStatusLabel(status) {
    return (STATUS_INFO[status] || STATUS_INFO['on-going']).label;
}
function statusBadge(status, opts) {
    opts = opts || {};
    var info = STATUS_INFO[status] || STATUS_INFO['on-going'];
    return '<span class="status-badge ' + info.cls + (opts.onclick ? ' clickable' : '') + '"'
        + (opts.onclick ? ' onclick="' + opts.onclick + '"' : '')
        + (opts.title ? ' title="' + opts.title + '"' : '')
        + '>' + info.label + '</span>';
}
window.STATUS_INFO = STATUS_INFO; window.getStatusLabel = getStatusLabel; window.statusBadge = statusBadge;

// ── Shared project list + stats targets (single source for counts and rates) ──
// Reporting projects = real projects only (no CORPORATE, no PLANT OPERATIONS).
// Finished/stopped projects stay in the list, because their YTD data still counts.
// Pass { activeOnly: true } to get only projects that are not stopped and not finished.
window.STATS_TARGETS = { ltir: 0.50, trir: 1.25, sr: null }; // sr: null = no target set

// ── Cumulative YTD rates (Jan → reporting month) ─────────────────────────
// Base follows the OSHS / OSHA toggle (state.ratesStandard): OSHS = 1,000,000 hrs, OSHA = 200,000 hrs,
// the same base for LTIR, TRIR and Severity Rate (as before).
// Cases, lost workdays and man-hours accumulate month by month. A month with no new
// incident keeps the earlier cases in the numerator, so the rate falls only because
// man-hours grow. High-Potential Incident is not recordable.
window.RATE_BASES = {};
['LTIR', 'TRIR', 'SEVERITY RATE'].forEach(function(k) {
    Object.defineProperty(window.RATE_BASES, k, { enumerable: true, get: function() {
        return (typeof state !== 'undefined' && state && state.ratesStandard === 'osha') ? 200000 : 1000000;
    } });
});
window.calcCumRate = function(rateKey, lta, rec, dl, mh) {
    if (!(mh > 0)) return null;
    const n = rateKey === 'LTIR' ? lta : rateKey === 'TRIR' ? rec : dl;
    return (n * window.RATE_BASES[rateKey]) / mh;
};
// Tooltip text (native title, lines joined with &#10;): shows the computation behind a rate cell.
window.rateCompTip = function(rateKey, n, mh, periodLabel, caseLines) {
    // Same line layout as rateTipHTML (Incident Tabulation card): name · standard / formula / numbers / = result
    const isOsha = window.RATE_BASES[rateKey] === 200000;
    const base = window.RATE_BASES[rateKey];
    const f = function(x) { return Number(x).toLocaleString('en-US'); };
    const nLabel = rateKey === 'LTIR' ? 'LTA cases' : rateKey === 'TRIR' ? 'Recordable cases' : 'Lost days';
    const name = rateKey === 'SEVERITY RATE' ? 'Severity Rate' : rateKey;
    const L = [
        name + ' · ' + (isOsha ? 'OSHA' : 'OSHS') + (periodLabel ? ' · ' + periodLabel : ''),
        nLabel + ' × ' + f(base) + ' ÷ man-hours'
    ];
    // Cases behind the number (AIIR No. + classification), shown whenever there are cases
    if (n > 0 && caseLines && caseLines.length) caseLines.forEach(function(x) { L.push(x); });
    if (mh > 0) {
        L.push(f(n) + ' × ' + f(base) + ' ÷ ' + f(mh));
        L.push('= ' + window.formatRate(rateKey, (n * base) / mh));
    } else if (n === 0) {
        L.push('No cases');
        L.push('= ' + window.formatRate(rateKey, 0));
    } else if (mh === 0) {
        if (!(caseLines && caseLines.length)) L.push(f(n) + ' case(s)');
        L.push('= ' + window.formatRate(rateKey, 0));
    } else {
        L.push('No man-hours yet');
    }
    return L.map(function(x) { return String(x).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }).join('&#10;');
};
// Same, for a cumulative series from buildCumulativeSeries (month i, 1-12; 12 = running YTD).
window.rateCompTipCum = function(rateKey, cs, i) {
    const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const end = Math.max(1, Math.min(i, cs.last || i));
    const n = rateKey === 'LTIR' ? cs.lta[i] : rateKey === 'TRIR' ? cs.rec[i] : cs.dl[i];
    // Case list per month (used when there are cases but no man-hours yet): "Jan: AIIR No. (classification)"
    const lines = [];
    if (cs.mo) {
        const want = rateKey === 'TRIR' ? ['LTA', 'Medical Treatment', 'Fatality'] : ['LTA']; // LTIR and Severity Rate: LTA only
        for (let m = 1; m <= end; m++) {
            (cs.mo.cases[m] || []).forEach(function(c) {
                if (want.indexOf(c.cls) < 0) return;
                lines.push(mon[m - 1] + ': ' + (c.aiir || 'No AIIR No.') + ' (' + c.cls + ')');
            });
        }
    }
    return window.rateCompTip(rateKey, n, cs.mh[i], (end === 1 ? 'Jan' : 'Jan–' + mon[end - 1]), lines);
};
// Display rounding. OSHS (PH, Rule 1056.03): LTIR 2 decimals, Severity Rate whole number.
// TRIR is not in the OSH Standards, so it uses 2 decimals. OSHA: 2 decimals for all three.
// Math stays at full precision; only the shown / stored text is rounded. 'std' is optional ('osha' | 'oshs').
window.formatRate = function(rateKey, v, std) {
    if (v === null || v === undefined || isNaN(v)) return '';
    const s = std || ((typeof state !== 'undefined' && state && state.ratesStandard === 'osha') ? 'osha' : 'oshs');
    const dec = (s !== 'osha' && rateKey === 'SEVERITY RATE') ? 0 : 2;
    const out = v.toFixed(dec);
    return parseFloat(out) === 0 ? '0' : out;
};
window.buildCumulativeSeries = function(projects, maxMonth) {
    const n = maxMonth || 12;
    const mh = new Array(13).fill(0), lta = new Array(13).fill(0),
          rec = new Array(13).fill(0), dl = new Array(13).fill(0),
          act = new Array(13).fill(false), // true = manpower reported that month (project is active)
          mo = { lta: new Array(13).fill(0), med: new Array(13).fill(0), fat: new Array(13).fill(0), dl: new Array(13).fill(0),
                 cases: [[], [], [], [], [], [], [], [], [], [], [], [], []] }; // per month: { aiir, cls } from the incident registry // per-month counts by type (not cumulative)
    let cMh = 0, cLta = 0, cRec = 0, cDl = 0, last = 0;
    // Same rule as Total Exposures: only completed months count. The current month and later
    // months are skipped (running totals stay flat), so numerator and man-hours always cover
    // the same months.
    const _bcsNow = new Date(), _bcsCY = _bcsNow.getFullYear(), _bcsCM = _bcsNow.getMonth() + 1;
    const _bcsSY = parseInt(state && state.selectedYear) || _bcsCY;
    const _bcsCap = _bcsSY > _bcsCY ? 0 : (_bcsSY === _bcsCY ? _bcsCM - 1 : 12);
    for (let m = 1; m <= n; m++) {
        if (m > _bcsCap) { mh[m] = cMh; lta[m] = cLta; rec[m] = cRec; dl[m] = cDl; continue; }
        let mMh = 0;
        (projects || []).forEach(function(p) {
            if (!p || !p.vals) return;
            const g = function(k) { return parseFloat(p.vals[k] && p.vals[k][m]) || 0; };
            mMh += g('exposures_Total Exposed Manhour');
            if (g('exposures_Total Manpower') > 0) act[m] = true;
            const l = g('medical_LTA'), me = g('medical_Medical Treatment'), f = g('medical_Fatality');
            const _dlv = g('medical_Days Lost/Charged');
            cLta += l; cRec += l + me + f; cDl += _dlv;
            mo.lta[m] += l; mo.med[m] += me; mo.fat[m] += f; mo.dl[m] += _dlv;
        });
        // Incident registry entries of this month (for the tooltip list: AIIR No. + classification)
        (projects || []).forEach(function(p) {
            const ents = (p && p.vals && p.vals['lta-registry_entries']) || [];
            ents.forEach(function(e) {
                if (!e) return;
                const ds = e.dateOfAccident || e.dateReported;
                if (!ds) return;
                const d = new Date(ds);
                if (d.getFullYear() !== _bcsSY || d.getMonth() + 1 !== m) return;
                const ps = (typeof window.ltaEntryPersons === 'function') ? window.ltaEntryPersons(e) : [e];
                ps.forEach(function(pp) {
                    if (pp.incidentClassification) mo.cases[m].push({ aiir: String(e.aiirNo || '').trim(), cls: pp.incidentClassification });
                });
            });
        });
        cMh += mMh;
        if (mMh > 0) last = m; // last month that has man-hours encoded
        mh[m] = cMh; lta[m] = cLta; rec[m] = cRec; dl[m] = cDl;
    }
    return { mh: mh, lta: lta, rec: rec, dl: dl, act: act, mo: mo, last: last };
};
function getReportingProjects(list, opts) {
    const src = list || (state && state.projects) || [];
    const activeOnly = !!(opts && opts.activeOnly);
    return src.filter(function(p) {
        if (p.region === 'CORPORATE' || p.region === 'PLANT OPERATIONS') return false;
        if (activeOnly && (isProjectOnStoppage(p) || p.dateFinished)) return false;
        return true;
    });
}
// Label for the "N PROJECTS" pill. If the table also shows a Corporate row, say so.
function getProjectCountLabel(list) {
    // PLANT OPERATIONS is never counted or mentioned. Only the Corporate row is shown as an extra.
    const all = (list || []).filter(function(p) { return p.region !== 'PLANT OPERATIONS'; });
    const n = getReportingProjects(all).length;
    const extra = all.length - n; // Corporate rows only
    return n + ' PROJECTS' + (extra > 0 ? ' + ' + extra + ' CORP' : '');
}

// ── DOLE Annual Reports (AEDR / AMR) ─────────────────────────────────────────
// The annual report shown under year Y covers Y-1 and is submitted in Y
// (AEDR due Jan 30, AMR due Mar 31). There is NO "one year of operation" requirement:
// a report is required as soon as the project operated during any part of the covered
// year (Y-1), counting from the start month. A project that started in Y or later has no
// covered period yet, so nothing is required and nothing may be flagged as missing.
// No / invalid dateStarted → treated as required (same convention as the other date helpers).
function isDoleAnnualRequired(p, selectedYear) {
    const selY = selectedYear || (state && state.selectedYear) || new Date().getFullYear();
    if (!p || !p.dateStarted) return true;
    const d = new Date(p.dateStarted);
    if (isNaN(d)) return true;
    return d.getFullYear() <= selY - 1;
}

// Stoppage-only exemption for the covered year (selY-1). Deliberately does NOT use
// isMonthBlacklistedForProject, because that also blacklists "before project start" months,
// which are a normal part of a partial first year and must not exempt the report.
function isDoleAnnualStoppageExempt(p, selectedYear) {
    if (!p || !p.workStoppageDate) return false;
    const selY = selectedYear || (state && state.selectedYear) || new Date().getFullYear();
    const covY = selY - 1;
    const stopD = new Date(p.workStoppageDate);
    if (isNaN(stopD)) return false;
    const absStop = stopD.getFullYear() * 12 + (stopD.getMonth() + 1);
    let absRes = Infinity; // not resumed → stopped from absStop onward
    if (p.workResumeDate) {
        const resD = new Date(p.workResumeDate);
        if (!isNaN(resD)) absRes = resD.getFullYear() * 12 + (resD.getMonth() + 1);
    }
    for (let mo = 1; mo <= 12; mo++) {
        const absMo = covY * 12 + mo;
        if (absMo >= absStop && absMo <= absRes) return true; // resume month itself is still frozen
    }
    return false;
}


// Returns true if the project is finished AND the given month is the month it was declared
// finished or any later month. Months BEFORE the finish month stay active (still editable and
// still counted in compliance). e.g. finished 1 Mar 2026 → Jan & Feb active; Mar onwards excluded.
function isProjectFinishedForMonth(p, monthIdx1Based, selectedYear) {
    if (!p.dateFinished) return false;
    const selY   = selectedYear || (state && state.selectedYear) || new Date().getFullYear();
    const finD   = new Date(p.dateFinished);
    const finAbs = finD.getFullYear() * 12 + (finD.getMonth() + 1);
    const moAbs  = selY * 12 + monthIdx1Based;
    return moAbs >= finAbs; // lock/exclude from the finish month onwards; earlier months stay active
}

// Auto-sync p.status from dates so stale Firestore data is always corrected at render time
function syncProjectStatus(p) {
    if (p.dateFinished) {
        p.status = 'finished';
    } else if (p.workStoppageDate && !p.workResumeDate) {
        p.status = 'work-stoppage';
    } else {
        p.status = 'on-going';
    }
}

function getReportProjects() {
    return (state.filteredProjects || state.projects || []).filter(p => !isProjectOnStoppage(p));
}

// Returns true if the given month is the month the project started or any month before it —
// the project is only counted starting the FOLLOWING month.
// Example: project started September 3 → September and earlier are not required (this
// returns true for them); October onward returns false (required as normal).
function isMonthBeforeProjectStart(p, monthIdx1Based, selectedYear, openStartMonth) {
    if (!p.dateStarted) return false;
    const selY = selectedYear || (state && state.selectedYear) || new Date().getFullYear();
    const startD = new Date(p.dateStarted);
    if (isNaN(startD)) return false;
    const absStart = startD.getFullYear() * 12 + (startD.getMonth() + 1);
    const absMo    = selY * 12 + monthIdx1Based;
    // openStartMonth = true (Total Exposures + ESH Activities and Programs only): the start month is open for input,
    // because real exposure/activity happens from the start date. Only months BEFORE the start month are locked.
    if (openStartMonth) return absMo < absStart;
    return absMo <= absStart; // the start month itself and earlier months are not required; counting begins the following month
}

// Column visibility for month-based project tables (KPM EP, DOLE, EMR, GOT, ESH Calendar, Drills).
// A project's column is hidden — not just blanked — when it takes no part in that month:
//  • not yet started: the start month and every earlier month (column first appears the FOLLOWING month)
//  • finished: the month it was declared finished and every month after it
// Hiding only affects display; compliance maths already excludes these months.
function isProjectHiddenForMonth(p, monthIdx1Based, selectedYear) {
    if (!p) return false;
    if (isMonthBeforeProjectStart(p, monthIdx1Based, selectedYear)) return true;
    if (p.dateFinished) {
        const selY = selectedYear || (state && state.selectedYear) || new Date().getFullYear();
        const finD = new Date(p.dateFinished);
        if (!isNaN(finD)) {
            const finAbs = finD.getFullYear() * 12 + (finD.getMonth() + 1);
            return (selY * 12 + monthIdx1Based) >= finAbs;
        }
    }
    return false;
}

// Returns the 1-based quarter (1-4) in which the project's dateStarted falls, for the
// given year. Returns 1 if the project started before that year (all quarters required).
// Returns 5 if the project starts AFTER that year (no quarters required that year) —
// used by DOE Reportorial (quarterly) so quarters before the project existed aren't required.
function getDoeStartQuarterForYear(p, year) {
    if (!p.dateStarted) return 1;
    const d = new Date(p.dateStarted);
    if (isNaN(d)) return 1;
    const y = d.getFullYear();
    if (y < year) return 1;
    if (y > year) return 5;
    return Math.ceil((d.getMonth() + 1) / 3);
}

// ── Tooltip reason helpers ───────────────────────────────────────────────────
// ONE source of truth for WHY a month/quarter is greyed out, so every tab shows the
// correct tooltip. Priority matches isMonthBlacklistedForProject:
//   not yet started  >  finished (finish month onwards)  >  work stoppage
function getMonthExemptReason(p, monthIdx1Based, selectedYear) {
    if (!p) return '';
    if (isMonthBeforeProjectStart(p, monthIdx1Based, selectedYear)) return 'not-started';
    if (isProjectFinishedForMonth(p, monthIdx1Based, selectedYear)) return 'finished';
    if (isMonthBlacklistedForProject(p, monthIdx1Based, selectedYear)) return 'stoppage';
    return '';
}
function getMonthExemptTip(p, monthIdx1Based, selectedYear) {
    var MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var moName = MO[monthIdx1Based - 1] || 'This month';
    var reason = getMonthExemptReason(p, monthIdx1Based, selectedYear);
    if (reason === 'not-started') {
        return 'Project not yet started — starts ' + formatDateDMY(p.dateStarted) + '. ' + moName + ' is not required.';
    }
    if (reason === 'finished') {
        return 'Project finished (' + formatDateDMY(p.dateFinished) + '). ' + moName + ' and later months are not required.';
    }
    var since = p.workStoppageDate ? ' (since ' + formatDateDMY(p.workStoppageDate) + ')' : '';
    if (p.workResumeDate) {
        return 'Work Stoppage period' + since + ' — resumed ' + formatDateDMY(p.workResumeDate) + '. ' + moName + ' is excluded from compliance counting.';
    }
    return 'Work Stoppage period' + since + ' — Set a Resume Date in Project Settings to unlock ' + moName + ' for input.';
}
// Tooltip for an auto-computed cell that shows "—" because the project has no data for that month
// (not started / finished / work stoppage). Returns '' when the month is not exempt, so the caller keeps its own text.
// 'what' = the thing that is not computed, e.g. 'rate'.
function getNoDataMonthTip(p, monthIdx1Based, selectedYear, what) {
    var reason = getMonthExemptReason(p, monthIdx1Based, selectedYear);
    if (!reason) return '';
    var MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var moName = MO[monthIdx1Based - 1] || 'this month';
    what = what || 'data';
    if (reason === 'not-started') {
        return 'Project not yet started — starts ' + formatDateDMY(p.dateStarted) + '. No ' + what + ' for ' + moName + '.';
    }
    if (reason === 'finished') {
        return 'Project finished (' + formatDateDMY(p.dateFinished) + '). No ' + what + ' for ' + moName + ' and later months.';
    }
    var since = p.workStoppageDate ? ' (since ' + formatDateDMY(p.workStoppageDate) + ')' : '';
    var resumed = p.workResumeDate ? ' — resumed ' + formatDateDMY(p.workResumeDate) : '';
    return 'Project on Work Stoppage' + since + resumed + '. No ' + what + ' for ' + moName + (p.workResumeDate ? '' : ' and later months') + '.';
}
window.getNoDataMonthTip = getNoDataMonthTip;
// Quarter version (DOE Reportorial). Same priority as isQuarterBlacklistedForProject.
function getQuarterExemptReason(p, quarterNum, selectedYear) {
    var selY = selectedYear || (state && state.selectedYear) || new Date().getFullYear();
    if (quarterNum < getDoeStartQuarterForYear(p, selY)) return 'not-started';
    if (isQuarterAfterProjectFinish(p, quarterNum, selY)) return 'finished';
    return 'stoppage';
}
function getQuarterExemptTip(p, quarterNum, selectedYear) {
    var reason = getQuarterExemptReason(p, quarterNum, selectedYear);
    if (reason === 'not-started') return 'Project not yet started (starts ' + formatDateDMY(p.dateStarted) + '). Q' + quarterNum + ' is not required.';
    if (reason === 'finished') return 'Project finished (' + formatDateDMY(p.dateFinished) + '). Q' + quarterNum + ' is after the finish quarter — not required.';
    return 'Work Stoppage period — Q' + quarterNum + ' is excluded from compliance computation.';
}

function isMonthBlacklistedForProject(p, monthIdx1Based, selectedYear, openStartMonth) {
    // Months before the project's dateStarted are never required — the project
    // didn't exist yet, so this always takes priority over the stoppage checks below.
    if (isMonthBeforeProjectStart(p, monthIdx1Based, selectedYear, openStartMonth)) return true;
    // The month the project was declared finished, and every month after it, is never required
    // (months before the finish month stay required — see isProjectFinishedForMonth).
    if (isProjectFinishedForMonth(p, monthIdx1Based, selectedYear)) return true;
    if (!p.workStoppageDate) return false;
    const selY = selectedYear || (state && state.selectedYear) || new Date().getFullYear();
    const stopD  = new Date(p.workStoppageDate);
    const absStop = stopD.getFullYear() * 12 + (stopD.getMonth() + 1);
    const absMo   = selY * 12 + monthIdx1Based;
    if (absMo < absStop) return false; // before stoppage — normal
    if (p.workResumeDate) {
        const resD   = new Date(p.workResumeDate);
        const absRes = resD.getFullYear() * 12 + (resD.getMonth() + 1);
        // Use <= so that the resume month itself is still frozen:
        // e.g. resumed Apr 24 → first submittable month is May, not April
        return absMo <= absRes;
    }
    return true; // still stopped — all months from stoppage onward are blacklisted
}

// Total Exposures + ESH Activities and Programs lock rule. Same as isMonthBlacklistedForProject EXCEPT the resume month:
// the project works again from the resume date (e.g. resumed 22 Jul → Jul 22 onwards is real
// exposure data), so the resume month is OPEN for input here. Reportorial tabs (KPM, GOT, DOLE,
// EMR, ESH Calendar, etc.) keep using isMonthBlacklistedForProject, where the resume month stays
// frozen and the following month is the first required one.
function isMonthLockedForExposure(p, monthIdx1Based, selectedYear) {
    // The start month is open for input here (e.g. started 19 Sep → Sep is enabled).
    if (!isMonthBlacklistedForProject(p, monthIdx1Based, selectedYear, true)) return false;
    if (!p.workStoppageDate || !p.workResumeDate || p.dateFinished) return true;
    if (isMonthBeforeProjectStart(p, monthIdx1Based, selectedYear, true)) return true;
    const selY = selectedYear || (state && state.selectedYear) || new Date().getFullYear();
    const resD = new Date(p.workResumeDate);
    if (isNaN(resD)) return true;
    const absRes = resD.getFullYear() * 12 + (resD.getMonth() + 1);
    return (selY * 12 + monthIdx1Based) !== absRes; // only the resume month is unlocked
}

// Quarter-level equivalent of isMonthBlacklistedForProject, used by DOE Reportorial
// (Renewable Energy) since it's tracked quarterly, not monthly. Same design as the
// month version: the entire quarter is the unit of exclusion — even a stoppage/resume
// that only touches part of a quarter blacklists that whole quarter.
// - Quarters before the project's dateStarted are never required (handled by
//   getDoeStartQuarterForYear at the call site, but double-checked here too).
// - The quarter containing workStoppageDate is blacklisted.
// - If resumed, the quarter containing workResumeDate is ALSO blacklisted (inclusive —
//   mirrors "resume month itself still frozen"), and quarters after that are normal.
// - If not yet resumed, every quarter from the stoppage quarter onward is blacklisted.
// Returns true if the given quarter falls AFTER the quarter containing the project's
// dateFinished — i.e. the project was already finished, so no report is required that
// quarter. The finish quarter itself is still required (inclusive), same convention as
// isProjectFinishedForMonth.
function isQuarterAfterProjectFinish(p, quarterNum, selectedYear) {
    if (!p.dateFinished) return false;
    const selY = selectedYear || (state && state.selectedYear) || new Date().getFullYear();
    const finD = new Date(p.dateFinished);
    if (isNaN(finD)) return false;
    const finQAbs = finD.getFullYear() * 4 + Math.ceil((finD.getMonth() + 1) / 3);
    const curQAbs = selY * 4 + quarterNum;
    return curQAbs > finQAbs;
}

// Semi-annual equivalent of isQuarterAfterProjectFinish, used by CMR (Semi-Annual)
// periods 1 (H1: Jan-Jun) and 2 (H2: Jul-Dec). Same inclusive convention: the period
// containing dateFinished is still required.
function isPeriodAfterProjectFinish(p, periodNum, selectedYear) {
    if (!p.dateFinished) return false;
    const selY = selectedYear || (state && state.selectedYear) || new Date().getFullYear();
    const finD = new Date(p.dateFinished);
    if (isNaN(finD)) return false;
    const finPAbs = finD.getFullYear() * 2 + Math.ceil((finD.getMonth() + 1) / 6);
    const curPAbs = selY * 2 + periodNum;
    return curPAbs > finPAbs;
}

function isQuarterBlacklistedForProject(p, quarterNum, selectedYear) {
    const selY = selectedYear || (state && state.selectedYear) || new Date().getFullYear();
    const doeStartQ = getDoeStartQuarterForYear(p, selY);
    if (quarterNum < doeStartQ) return true; // before project existed
    if (isQuarterAfterProjectFinish(p, quarterNum, selY)) return true; // after project finished

    if (!p.workStoppageDate) return false;
    const stopD = new Date(p.workStoppageDate);
    if (isNaN(stopD)) return false;
    const stopY = stopD.getFullYear();
    const stopQAbs = stopY * 4 + Math.ceil((stopD.getMonth() + 1) / 3); // absolute quarter index
    const curQAbs  = selY * 4 + quarterNum;

    if (curQAbs < stopQAbs) return false; // before stoppage — normal

    if (p.workResumeDate) {
        const resD = new Date(p.workResumeDate);
        if (isNaN(resD)) return true;
        const resQAbs = resD.getFullYear() * 4 + Math.ceil((resD.getMonth() + 1) / 3);
        // Inclusive: the resume quarter itself is still blacklisted (mirrors month logic)
        return curQAbs <= resQAbs;
    }
    return true; // still stopped — all quarters from stoppage onward are blacklisted
}

        // ── OVERALL CUTOFF: Overall compliance counts only months that are already due.
        // Current year → up to the previous month (same rule the region chart uses, _rcMaxMonth).
        // Other years → 12. Quarterly (SMR, DOE) and semi-annual (CMR) items count only when
        // their last month (3*q or 6*p) is within the cutoff.
        function getComplianceCutoffMonth(selectedYear) {
            const _now = new Date();
            const _cur = _now.getFullYear();
            const _sel = selectedYear || (state && state.selectedYear) || _cur;
            if (_sel !== _cur) return 12;
            return _now.getMonth() > 0 ? _now.getMonth() : 12;
        }
        window.getComplianceCutoffMonth = getComplianceCutoffMonth;
