
        
        const PresenceTracker = {
            myPresenceRef: null,
            usersPresenceRef: null,
            activityTimeout: null,
            lastActivityTime: Date.now(),
            _serverOffset: 0,        // difference between Firebase server clock and this device clock
            _unsubs: [],             // Firebase listeners to detach on logout / re-login
            _heartbeatInterval: null,
            _staleCleanupInterval: null,
            _activityBound: false,
            _needsRegister: false,
            _firstOnlineResolve: null,
            _baseData: null,
            _currentStatus: 'online',

            // Server-based time. Device clocks can differ, so lastSeen must not rely on Date.now() alone.
            _now() {
                return Date.now() + (this._serverOffset || 0);
            },

            _fullData() {
                const now = this._now();
                return Object.assign({}, this._baseData, {
                    status: this._currentStatus || 'online',
                    currentActivity: {
                        action: 'viewing',
                        tab: state.currentTab,
                        project: null,
                        cell: null,
                        timestamp: now
                    },
                    lastSeen: now,
                    lastActive: now - (Date.now() - this.lastActivityTime)
                });
            },

            // Register "remove me if I disconnect" FIRST, then write presence.
            // Runs on first login AND on every reconnect (wifi drop, sleep, etc.)
            async _goOnline() {
                if (!this.myPresenceRef || !this._baseData) return;
                try {
                    await window.firebase.onDisconnect(this.myPresenceRef).remove();
                } catch (e) { }
                const presenceData = this._fullData();
                try {
                    await window.firebase.set(this.myPresenceRef, presenceData);
                } catch (e) {
                    if (e.code === 'PERMISSION_DENIED' || (e.message && e.message.includes('permission_denied'))) {
                        try {
                            const cu = window.firebaseAuth?.currentUser;
                            if (cu) await cu.getIdToken(true);
                            await new Promise(r => setTimeout(r, 500));
                            await window.firebase.set(this.myPresenceRef, this._fullData());
                        } catch (e2) { }
                    }
                }
                this._needsRegister = false;
            },

            _teardown() {
                if (this._heartbeatInterval) { clearInterval(this._heartbeatInterval); this._heartbeatInterval = null; }
                if (this._staleCleanupInterval) { clearInterval(this._staleCleanupInterval); this._staleCleanupInterval = null; }
                (this._unsubs || []).forEach(fn => { try { if (typeof fn === 'function') fn(); } catch (e) { } });
                this._unsubs = [];
            },

            async initialize(userId, userEmail) {
                if (!window.firebaseRealtimeDb) {
                    return;
                }

                // Clear anything left from a previous login in the same page
                this._teardown();

                const userInfo = UserAccounts.getUserInfo(userEmail);
                const deviceInfo = DeviceFingerprint.getPlatformInfo();

                this.myPresenceRef = window.firebase.dbRef(
                    window.firebaseRealtimeDb,
                    `presence/${userId}`
                );

                this.usersPresenceRef = window.firebase.dbRef(
                    window.firebaseRealtimeDb,
                    'presence'
                );

                const resolvedDisplayName = userInfo.displayName && userInfo.displayName !== 'Administrator'
                    ? userInfo.displayName
                    : (state.currentUser?.displayName
                        || localStorage.getItem('esh_displayname_' + userEmail)
                        || (userInfo.role === 'admin' ? 'ESH Admin' : userEmail.split('@')[0]));

                this._userEmail = userEmail;
                this._currentStatus = 'online';
                this.lastActivityTime = Date.now();

                // Fields that never change during a session. Re-sent on every heartbeat
                // so the entry always heals itself if it was removed.
                this._baseData = {
                    displayName: resolvedDisplayName,
                    email: userEmail,
                    role: userInfo.role,
                    region: userInfo.region,
                    color: userInfo.color,
                    deviceId: state.deviceFingerprint || null,
                    platform: deviceInfo.platform || null,
                    browser: deviceInfo.browser || null
                };

                // Server clock offset (fixes wrong "stale" results when device clocks differ)
                try {
                    const offRef = window.firebase.dbRef(window.firebaseRealtimeDb, '.info/serverTimeOffset');
                    const u1 = window.firebase.onValue(offRef, (snap) => {
                        this._serverOffset = Number(snap.val()) || 0;
                    });
                    this._unsubs.push(u1);
                } catch (e) { }

                // Connection listener: fires now and again after every reconnect
                const firstOnline = new Promise(res => { this._firstOnlineResolve = res; });
                try {
                    const connRef = window.firebase.dbRef(window.firebaseRealtimeDb, '.info/connected');
                    const u2 = window.firebase.onValue(connRef, (snap) => {
                        if (snap.val() === true) {
                            this._goOnline().finally(() => {
                                if (this._firstOnlineResolve) {
                                    this._firstOnlineResolve();
                                    this._firstOnlineResolve = null;
                                }
                            });
                        }
                    });
                    this._unsubs.push(u2);
                } catch (e) {
                    await this._goOnline();
                }
                await Promise.race([firstOnline, new Promise(r => setTimeout(r, 5000))]);

                if (userInfo.role === 'admin') {
                    this.startPresenceListener();
                }

                this.setupActivityTracking();
            },

            startPresenceListener() {
                const u = window.firebase.onValue(this.usersPresenceRef, (snapshot) => {
                    const presenceData = snapshot.val() || {};
                    state.activeUsers = presenceData;

                    if (state.isAdmin && state.isLoggedIn) {
                        this.updateActiveUsersUI();
                        if (typeof renderForceLogoutList === 'function') renderForceLogoutList();
                    }
                }, () => { });
                this._unsubs.push(u);

                if (this._staleCleanupInterval) clearInterval(this._staleCleanupInterval);
                this._staleCleanupInterval = setInterval(() => {
                    if (state.isAdmin && state.isLoggedIn) {
                        this._autoCleanupStale(state.activeUsers || {});
                    }
                }, 60000);
            },

            async _autoCleanupStale(presenceData) {
                const now = this._now();
                const STALE_MS = 10 * 60 * 1000;
                const SAFE_MS  = 5 * 60 * 1000;
                for (const [uid, data] of Object.entries(presenceData)) {
                    const lastSeen = data.lastSeen || 0;
                    if ((now - lastSeen) < SAFE_MS) continue;
                    const isTimedOut = !data.lastSeen || (now - lastSeen) > STALE_MS;
                    const isUnknown  = !data.email && !data.displayName;
                    const isOffline  = data.status === 'offline';
                    if (isTimedOut || isUnknown || isOffline) {
                        try {
                            await window.firebase.remove(window.firebase.dbRef(window.firebaseRealtimeDb, 'presence/' + uid));
                        } catch(e) {  }
                    }
                }
            },

            async _heartbeat() {
                if (!this.myPresenceRef || !this._baseData) return;
                const idleTime = Date.now() - this.lastActivityTime;
                const newStatus = idleTime > 5 * 60 * 1000 ? 'idle' : 'online';
                this._currentStatus = newStatus;

                try {
                    if (this._needsRegister) {
                        // Entry was removed (e.g. "Leave site?" dialog was cancelled): put it back in full
                        await this._goOnline();
                    } else {
                        // Full identity fields every time, so a removed entry never comes back as "Unknown User"
                        await window.firebase.update(this.myPresenceRef, Object.assign({}, this._baseData, {
                            status: newStatus,
                            lastSeen: this._now(),
                            lastActive: this._now() - (Date.now() - this.lastActivityTime),
                            'currentActivity/tab': state.currentTab
                        }));
                    }
                } catch(e) {  }

                if (state.isAdmin && state.isLoggedIn) {
                    this.updateActiveUsersUI();
                }
            },

            setupActivityTracking() {
                if (!this._activityBound) {
                    this._activityBound = true;
                    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

                    events.forEach(event => {
                        document.addEventListener(event, () => {
                            this.lastActivityTime = Date.now();
                            if (this.myPresenceRef && this._currentStatus !== 'online') {
                                this._currentStatus = 'online';
                                this.updateStatus('online').catch(() => { });
                            }
                        });
                    });

                    // Browsers slow down timers in background tabs. When the user comes back, update right away.
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible' && this.myPresenceRef) {
                            this.lastActivityTime = Date.now();
                            this._heartbeat();
                        }
                    });
                }

                if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
                this._heartbeatInterval = setInterval(() => this._heartbeat(), 15000);
            },

            async updateStatus(status) {
                if (!this.myPresenceRef) return;

                await window.firebase.update(this.myPresenceRef, {
                    status: status,
                    lastSeen: this._now()
                });
            },

            async updateActivity(action, details = {}) {
                if (!this.myPresenceRef) return;
                try {
                    await window.firebase.update(this.myPresenceRef, {
                        'currentActivity/action': action,
                        'currentActivity/tab': details.tab || state.currentTab,
                        'currentActivity/project': details.project || null,
                        'currentActivity/cell': details.cell || null,
                        'currentActivity/timestamp': this._now(),
                        lastSeen: this._now()
                    });
                } catch (e) { }
            },

            // Project opened / closed (shown in the active users list)
            setProject(name, editing) {
                return this.updateActivity(editing ? 'editing' : 'viewing', { tab: state.currentTab, project: name });
            },
            clearProject() {
                return this.updateActivity('viewing', { tab: state.currentTab });
            },

            updateActiveUsersUI() {
                if (!state.isAdmin) return;

                const usersList = document.getElementById('users-list');
                const usersBadge = document.getElementById('users-count-badge');
                const container = document.getElementById('active-users-container');

                if (!usersList || !usersBadge || !container) {
                    return;
                }

                container.style.display = 'inline-block';

                const now = this._now();
                const STALE_THRESHOLD = 2 * 60 * 1000; // no heartbeat for 2 minutes = not online anymore

                // Same rule for the list and the badge, so they always match
                const users = Object.entries(state.activeUsers || {}).filter(([, data]) => {
                    if (!data || !data.status || data.status === 'offline') return false;
                    if (!data.email && !data.displayName) return false;
                    if (!data.lastSeen || (now - data.lastSeen) > STALE_THRESHOLD) return false;
                    return true;
                });

                const onlineCount = users.filter(([, data]) => data.status === 'online').length;

                usersBadge.textContent = onlineCount;

                if (users.length === 0) {
                    usersList.innerHTML = `
                        <div class="dropdown-empty">
                            <i class="fas fa-user-slash"></i>
                            <div>No users online</div>
                        </div>
                    `;
                    return;
                }

                users.sort((a, b) => {
                    if (a[1].status !== b[1].status) {
                        const statusOrder = { online: 0, idle: 1, offline: 2 };
                        return (statusOrder[a[1].status] ?? 3) - (statusOrder[b[1].status] ?? 3);
                    }
                    return (a[1].displayName || '').localeCompare(b[1].displayName || '');
                });


                const rows = users.map(([userId, data]) => {
                    const isIdle = data.status === 'idle';
                    const icon = isIdle ? 'moon' : (data.currentActivity?.action === 'editing' ? 'edit' : 'eye');
                    return `
                        <div class="au-row">
                            <div class="au-av" title="${this._esc(this._positionOf(data))}" style="background: ${this._esc(data.color || '#2e7d32')}">
                                ${this._avatarHtml(data)}<i class="au-dot ${isIdle ? 'idle' : ''}"></i>
                            </div>
                            <div class="au-who">
                                <div class="au-act" title="${this._esc(this._activityLine(data.currentActivity, data.status))}"><i class="fas fa-${icon}"></i><span>${this._esc(this._activityLine(data.currentActivity, data.status))}</span></div>
                            </div>
                            <div class="au-when ${isIdle ? 'idle' : ''}">${this._whenText(data, now)}</div>
                        </div>
                    `;
                }).join('');

                usersList.innerHTML = `
                    <div class="au-wrap">
                        ${rows}
                        <div class="au-foot">Updates live. Idle after 5 minutes.</div>
                    </div>
                `;
            },

            // Avatar label per account email (falls back to 2 initials)
            _AVATAR_LABELS: {
                'esh@tgm.com.ph': 'TGM',
                'esh@mab.com.ph': 'MAB',
                'esh@wda.com.ph': 'WDA',
                'esh@lmp.com.ph': 'LMP',
                'esh@corpdc.com.ph': 'DC',
                'esh@cbmganda.com.ph': 'CBM',
                'esh@health.com.ph': 'HEALTH',
                'esh@visminpco.com.ph': 'PCO VISMIN',
                'esh@northpco.com.ph': 'PCO NORTH',
                'esh@southpco.com.ph': 'PCO SOUTH',
                'esh@ncrpco.com.ph': 'PCO NCR',
                'esh@scic.com.ph': 'ADMIN',
                'esh@ncr.com.ph': 'AMA',
                'esh@north.com.ph': 'RST',
                'esh@south.com.ph': 'MDL',
                'esh@vismin.com.ph': 'GGM'
            },

            // Position shown as tooltip on each row
            _POSITIONS: {
                'esh@scic.com.ph': 'Dashboard Author',
                'esh@ncr.com.ph': 'NCR Superintendent',
                'esh@north.com.ph': 'North Superintendent',
                'esh@south.com.ph': 'South Superintendent',
                'esh@vismin.com.ph': 'VisMin Superintendent',
                'esh@tgm.com.ph': 'QESH GM (Group Manager)',
                'esh@mab.com.ph': 'QESH Deputy GM',
                'esh@wda.com.ph': 'ESH Manager for Regulation & Compliance',
                'esh@lmp.com.ph': 'ESH Manager for Project Implementation',
                'esh@corpdc.com.ph': 'QESH Corporate DC',
                'esh@cbmganda.com.ph': 'Environmental and Sustainability Head',
                'esh@health.com.ph': 'Corporate Nurse',
                'esh@visminpco.com.ph': 'PCO VisMin',
                'esh@northpco.com.ph': 'PCO North',
                'esh@southpco.com.ph': 'PCO South',
                'esh@ncrpco.com.ph': 'PCO NCR'
            },

            _positionOf(data) {
                const email = String(data.email || '').trim().toLowerCase();
                return this._POSITIONS[email] || data.displayName || data.email || 'Unknown User';
            },

            _esc(s) {
                return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
            },

            _avatarHtml(data) {
                const email = String(data.email || '').trim().toLowerCase();
                const label = this._AVATAR_LABELS[email]
                    || (data.displayName || data.email || 'U').substring(0, 2).toUpperCase();
                const parts = label.split(' ');
                const longest = Math.max.apply(null, parts.map(p => p.length));
                const size = longest <= 3 ? 9.5 : (longest <= 5 ? 7.5 : 6.5);
                return '<span class="au-av-t" style="font-size:' + size + 'px">' + parts.map(p => this._esc(p)).join('<br>') + '</span>';
            },

            _activityLine(activity, status) {
                const a = activity || {};
                let tabLabel = a.tab || 'dashboard';
                try { if (typeof navTitle === 'function') tabLabel = navTitle(a.tab || 'dashboard'); } catch (e) { }
                const base = a.project ? tabLabel + ' - ' + a.project : tabLabel;
                if (status === 'idle') return 'Last on ' + base;
                return (a.action === 'editing' ? 'Editing ' : '') + base;
            },

            _whenText(data, now) {
                if (data.status !== 'idle') return 'Now';
                if (!data.lastActive) return 'Idle';
                const m = Math.max(1, Math.floor((now - data.lastActive) / 60000));
                return m < 60 ? 'Idle ' + m + 'm' : 'Idle ' + Math.floor(m / 60) + 'h';
            },

            async refreshDisplayName(displayName) {
                if (!this.myPresenceRef || !displayName) return;
                if (this._baseData) this._baseData.displayName = displayName;
                try {
                    await window.firebase.update(this.myPresenceRef, { displayName });
                } catch(e) {
                }
            },

            // opts.soft = true: only used on page unload. Removes my entry but keeps timers and listeners,
            // so if the user cancels the "Leave site?" dialog the heartbeat puts the entry back.
            async cleanup(opts) {
                const ref = this.myPresenceRef;
                if (opts && opts.soft) {
                    this._needsRegister = true;
                    if (ref) { try { await window.firebase.remove(ref); } catch (e) { } }
                    return;
                }
                this._teardown();
                if (ref) {
                    try { await window.firebase.onDisconnect(ref).cancel(); } catch (e) { }
                    try { await window.firebase.remove(ref); } catch (e) { }
                }
                this.myPresenceRef = null;
                this.usersPresenceRef = null;
                this._baseData = null;
                state.activeUsers = {};
            }
        };
        window.PresenceTracker = PresenceTracker;
        
        LoginLogbook.loadFromStorage();
        
        const AdminSystem = {
            adminEmails: [],
            
            isAdmin(email) {
                return UserAccounts.isAdmin(email);
            },
            
            checkAdminAccess() {
                if (!state.currentUser) return false;
                return state.isAdmin;
            },
            
            
            async getAllUsers() {
                const users = {};
                state.loginLogbook.forEach(entry => {
                    if (!users[entry.email]) {
                        users[entry.email] = {
                            email: entry.email,
                            displayName: entry.displayName,
                            uid: entry.uid,
                            lastLogin: entry.timestamp,
                            loginCount: 0,
                            locations: new Set()
                        };
                    }
                    users[entry.email].loginCount++;
                    if (entry.city && entry.country) {
                        users[entry.email].locations.add(`${entry.city}, ${entry.country}`);
                    }
                    if (new Date(entry.timestamp) > new Date(users[entry.email].lastLogin)) {
                        users[entry.email].lastLogin = entry.timestamp;
                    }
                });
                
                return Object.values(users);
            },
            
            async revokeAccess(email) {
                AuditLogger.log('ACCESS_REVOKED', { targetUser: email, admin: state.currentUser.email });
                showToast(`Access revoked for ${email}`, 'warning');
            }
        };
        
        const OfflineManager = {
            init() {
                state.isOnline = navigator.onLine;
                if (this._bound) return;   // init() runs after every login — attach the listeners only once
                this._bound = true;
                window.addEventListener('online', () => this.handleOnline());
                window.addEventListener('offline', () => this.handleOffline());
            },
            
            handleOnline() {
                state.isOnline = true;
                AuditLogger.log('SYSTEM_ONLINE', { status: 'Connected to internet' });
                if (state.offlineQueue.length === 0) {
                    // Nothing waiting to sync, so never show a "syncing" pill (it would have nothing to finish it).
                    if (_pendingSync) showSyncPill('pending', 'Unsaved changes — not yet synced to cloud');
                    else hideSyncPill(0);
                    return;
                }
                showSyncPill('syncing', 'Back online — syncing...');
                this.syncOfflineQueue();
            },
            
            handleOffline() {
                state.isOnline = false;
                showSyncPill('offline', 'Offline — local saves only');
                AuditLogger.log('SYSTEM_OFFLINE', { status: 'Disconnected from internet' });
            },
            
            addToQueue(action, data) {
                state.offlineQueue.push({
                    id: Date.now(),
                    action: action,
                    data: data,
                    timestamp: new Date().toISOString()
                });
                localStorage.setItem('esh_offline_queue', JSON.stringify(state.offlineQueue));
            },
            
            async syncOfflineQueue() {
                if (state.offlineQueue.length === 0) return;
                
                try {
                    const success = await saveToFirebase();
                    if (success) {
                        state.offlineQueue = [];
                        localStorage.removeItem('esh_offline_queue');
                        markSyncComplete();
                    } else {
                        markSyncFailed();   // leave "syncing" — show the real state while we retry
                        setTimeout(() => this.syncOfflineQueue(), 15000);
                    }
                } catch (e) {
                    console.error('Failed to sync offline queue:', e);
                    markSyncFailed();
                    setTimeout(() => this.syncOfflineQueue(), 15000);
                }
            },
            
            async processQueueItem(item) {
                if (item.action === 'SAVE_DATA' || item.action === 'SAVE_ALL') {
                    await saveToFirebase();
                }
            }
        };
        
        
        const LazyLoader = {
            observer: null,
            
            init() {
                this.observer = new IntersectionObserver(
                    (entries) => this.handleIntersection(entries),
                    { rootMargin: '50px' }
                );
            },
            
            handleIntersection(entries) {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadContent(entry.target);
                        this.observer.unobserve(entry.target);
                    }
                });
            },
            
            observe(elements) {
                elements.forEach(el => this.observer.observe(el));
            },
            
            loadContent(element) {
                const projectName = element.dataset.projectName;
                if (projectName) {
                }
            }
        };
        
        
        function validateState() {
            const issues = [];
            
            if (state.projects.length > state.masterProjects.length) {
                issues.push('⚠️ projects has more items than masterProjects - data inconsistency!');
            }
            
            const projectNames = state.projects.map(p => p.name);
            const duplicates = projectNames.filter((name, index) => projectNames.indexOf(name) !== index);
            if (duplicates.length > 0) {
                issues.push(`⚠️ Duplicate projects found: ${duplicates.join(', ')}`);
            }
            
            state.projects.forEach(p => {
                if (!p.name) issues.push(`⚠️ Project without name found`);
                if (!p.region) issues.push(`⚠️ Project "${p.name}" missing region`);
                if (!p.dateStarted) issues.push(`⚠️ Project "${p.name}" missing dateStarted`);
                if (!p.status) issues.push(`⚠️ Project "${p.name}" missing status`);
            });
            
            if (state.filteredProjects.length > state.projects.length) {
                issues.push('⚠️ filteredProjects has more items than projects');
            }
            
            return {
                isValid: issues.length === 0,
                issues: issues,
                stats: {
                    totalProjects: state.projects.length,
                    masterProjects: state.masterProjects.length,
                    filteredProjects: state.filteredProjects.length,
                    selectedYear: state.selectedYear,
                    isLoggedIn: state.isLoggedIn
                }
            };
        }
        
        window.debugCommands = {
            // ── Admin patch: fix a project's work-stoppage/resume/kpm_na flags ──
            // Usage: debugCommands.fixProjectFlags('6.9MW Clarin HEPP', { workResumeDate: '2025-01-01', kpm_na: '' })
            // workResumeDate : ISO date string e.g. '2025-06-01'  ('' = clear)
            // workStoppageDate: ISO date string                    ('' = clear)
            // kpm_na         : '1' = mark N/A,  '' = clear N/A flag
            fixProjectFlags: async function(projectName, flags = {}) {
                const year = state.selectedYear || new Date().getFullYear();
                const p = state.projects.find(proj => proj.name === projectName);
                if (!p) {
                    console.error(`❌ fixProjectFlags: project not found → "${projectName}"`);
                    console.log('Available projects:', state.projects.map(x => x.name));
                    return false;
                }

                const changes = [];
                // Fields to write directly to Firestore (partial update — does not overwrite other fields)
                const firestoreUpdate = {};

                if ('workResumeDate' in flags) {
                    p.workResumeDate = flags.workResumeDate;
                    firestoreUpdate['workResumeDate'] = flags.workResumeDate;
                    changes.push(`workResumeDate = "${flags.workResumeDate}"`);
                }
                if ('workStoppageDate' in flags) {
                    p.workStoppageDate = flags.workStoppageDate;
                    firestoreUpdate['workStoppageDate'] = flags.workStoppageDate;
                    changes.push(`workStoppageDate = "${flags.workStoppageDate}"`);
                }
                if ('kpm_na' in flags) {
                    if (!p.vals) p.vals = {};
                    p.vals['kpm_na'] = flags.kpm_na;
                    firestoreUpdate['vals.kpm_na'] = flags.kpm_na;
                    changes.push(`kpm_na = "${flags.kpm_na}"`);
                }

                // Auto-clear kpm_na when workResumeDate is being set
                // (resumed projects should never stay excluded from KPM)
                if ('workResumeDate' in flags && flags.workResumeDate && !('kpm_na' in flags)) {
                    if (!p.vals) p.vals = {};
                    if (p.vals['kpm_na'] === '1') {
                        p.vals['kpm_na'] = '';
                        firestoreUpdate['vals.kpm_na'] = '';
                        changes.push('kpm_na auto-cleared (project resumed)');
                    }
                }

                // Re-sync status from updated dates and write it too
                if (typeof syncProjectStatus === 'function') syncProjectStatus(p);
                firestoreUpdate['status'] = p.status;

                if (!changes.length) {
                    console.warn('⚠️ fixProjectFlags: no valid flags provided. Use: { workResumeDate, workStoppageDate, kpm_na }');
                    return false;
                }

                console.log(`🔧 Patching "${projectName}" → ${changes.join(', ')}`);
                console.log(`   New status: ${p.status}`);

                let saved = false;
                try {
                    if (window.ProjectsDB && window.firebase && window.firebaseDb) {
                        // Use updateDoc (partial field patch) — safer than full saveProject overwrite
                        const docRef = window.ProjectsDB.getDocRef(year, projectName);
                        await window.firebase.updateDoc(docRef, firestoreUpdate);
                        saved = true;
                    } else if (typeof saveToFirebaseWithRetry === 'function') {
                        saved = await saveToFirebaseWithRetry();
                    }
                } catch(e) {
                    console.error(`❌ fixProjectFlags Firebase error: ${e.message}`);
                    // Fallback: try full project save
                    try {
                        if (window.ProjectsDB) {
                            saved = await window.ProjectsDB.saveProject(year, p);
                        }
                    } catch(e2) {
                        console.error(`❌ fixProjectFlags fallback also failed: ${e2.message}`);
                    }
                }

                if (saved) {
                    console.log(`✅ fixProjectFlags: "${projectName}" patched in Firebase.`);
                    if (typeof reapplyFilters === 'function') reapplyFilters();
                    if (typeof render === 'function') render();
                } else {
                    console.error(`❌ fixProjectFlags: Firebase save failed. Try logging in as Admin and retry.`);
                }
                return saved;
            }
        };
        
        function initDarkMode() {
            const savedTheme = localStorage.getItem('esh_theme_preference');
            if (savedTheme === 'dark') {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
        }

        function toggleDarkMode() {
            if (document.body.classList.contains('dark-mode')) {
                disableDarkMode();
            } else {
                enableDarkMode();
            }
        }

        function enableDarkMode() {
            document.body.classList.add('dark-mode');
            state.darkMode = true;
            localStorage.setItem('esh_theme_preference', 'dark');
            updateThemeIcon();
            applyChartTheme();
        }

        function disableDarkMode() {
            document.body.classList.remove('dark-mode');
            state.darkMode = false;
            localStorage.setItem('esh_theme_preference', 'light');
            updateThemeIcon();
            applyChartTheme();
        }

        // Charts (canvas) hindi sumusunod sa CSS, kaya inaayos dito ang kulay ng text/grid
        // at ni-re-draw ang lahat ng live chart tuwing nagpapalit ng theme.
        function applyChartTheme() {
            if (!window.Chart) return;
            var dark = document.body.classList.contains('dark-mode');
            var tick = dark ? '#a9b4ad' : '#5d6b63';
            var grid = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
            try {
                Chart.defaults.color = dark ? '#b0b0b0' : '#666';
                Chart.defaults.borderColor = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.1)';
            } catch (e) {}
            var list = [];
            try { if (state && state.charts) Object.keys(state.charts).forEach(function (k) { list.push(state.charts[k]); }); } catch (e) {}
            try { if (typeof trendChartInstances !== 'undefined') Object.keys(trendChartInstances).forEach(function (k) { list.push(trendChartInstances[k]); }); } catch (e) {}
            var cardBg = (getComputedStyle(document.body).getPropertyValue('--bg-card') || '').trim();
            list.forEach(function (ch) {
                try {
                    if (!ch || !ch.options || (ch.canvas && !ch.canvas.isConnected)) return;
                    var sc = ch.options.scales;
                    if (sc) Object.keys(sc).forEach(function (k) {
                        var sx = sc[k]; if (!sx) return;
                        if (sx.ticks) sx.ticks.color = tick;
                        if (sx.grid && sx.grid.display !== false && typeof sx.grid.color !== 'function') sx.grid.color = grid;
                    });
                    var lg = ch.options.plugins && ch.options.plugins.legend && ch.options.plugins.legend.labels;
                    if (lg) lg.color = tick;
                    if (ch.config && ch.config.type === 'doughnut' && cardBg && ch.data && ch.data.datasets && ch.data.datasets[0]) {
                        ch.data.datasets[0].borderColor = cardBg;
                    }
                    if (ch._animatingLabels === true) ch._animatingLabels = false;
                    ch.update('none');
                } catch (e) {}
            });
        }

        function updateThemeIcon() {
            const icon = document.getElementById('theme-icon');
            if (document.body.classList.contains('dark-mode')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }

        const YEAR_RANGE = { min: 2026, max: new Date().getFullYear() }; // Year range: 2026 to current calendar year only — next year appears automatically on Jan 1
        let availableYears = [];

        function initializeYears() {
            availableYears = [];
            for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
                availableYears.push(year);
            }
            
            const savedYear = localStorage.getItem('esh_selected_year');
            if (savedYear && availableYears.includes(parseInt(savedYear))) {
                state.selectedYear = parseInt(savedYear);
            } else {
                const currentYear = new Date().getFullYear();
                state.selectedYear = availableYears.includes(currentYear) ? currentYear : availableYears[availableYears.length - 1];
            }
            
            renderYearOptions();
            updateYearDisplay();
        }

        function renderYearOptions() {
            const container = document.getElementById('year-options');
            if (!container) return;
            
            container.innerHTML = '';
            
            const sortedYears = [...availableYears].sort((a, b) => b - a);
            
            sortedYears.forEach(year => {
                const option = document.createElement('div');
                option.className = 'year-option';
                if (year === state.selectedYear) {
                    option.classList.add('active');
                }
                
                option.innerHTML = `<span>${year}</span>`;
                
                option.onclick = () => requestYearSwitch(year);
                container.appendChild(option);
            });
        }

        function toggleYearDropdown() {
            if (!state.isAdmin) return;
            const dropdown = document.getElementById('year-dropdown');
            dropdown.classList.toggle('hidden');
            
            if (!dropdown.classList.contains('hidden')) {
                setTimeout(() => {
                    document.addEventListener('click', closeYearDropdownOnClickOutside);
                }, 0);
            }
        }

        function closeYearDropdownOnClickOutside(e) {
            const dropdown = document.getElementById('year-dropdown');
            const btn = document.getElementById('year-selector-btn');
            
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeYearDropdownOnClickOutside);
            }
        }

        async function requestYearSwitch(newYear) {
            if (!state.isAdmin) {
                showToast('Only admin accounts can switch years.', 'error');
                return;
            }
            if (newYear === state.selectedYear) {
                toggleYearDropdown();
                return;
            }

            toggleYearDropdown();

            const confirmed = await showYearSwitchDialog(state.selectedYear, newYear);
            if (confirmed) {
                await switchYear(newYear);
            }
        }

        function showYearSwitchDialog(fromYear, toYear) {
            const isFuture = toYear > new Date().getFullYear();
            return uxDialog({
                id: 'year-switch-dialog-overlay',
                zIndex: 99999,
                tone: isFuture ? 'warn' : 'ok',
                icon: 'fa-calendar-alt',
                title: `Switch to ${toYear}?`,
                message: `The dashboard will change from ${fromYear} to ${toYear}.`,
                notes: [
                    { icon: isFuture ? 'fa-hourglass-half' : 'fa-sync-alt',
                      html: isFuture
                        ? '<strong>Future year.</strong> No data yet. All tabs will be blank.'
                        : `<strong>Year ${toYear}.</strong> Previous data found. Existing inputs for this year will be loaded.` },
                    { icon: 'fa-users',
                      html: '<strong>ESH Personnel Monitoring</strong> will not change. The personnel list is global and carries over across all years.' },
                    { icon: 'fa-shield-alt',
                      html: `Data from <strong>${fromYear}</strong> remains safely saved. Switching years will not affect it.` }
                ],
                confirmText: `Switch to ${toYear}`
            });
        }

        function filterProjectsByYear(projects, selectedYear) {
            return projects.filter(project => {
                if (project.region === 'CORPORATE' || project.region === 'PLANT OPERATIONS') return true;

                const startYear = project.dateStarted ? parseInt(project.dateStarted.split('-')[0]) : null;
                
                const finishedYear = project.dateFinished ? parseInt(project.dateFinished.split('-')[0]) : null;
                
                if (!startYear) return false;
                
                if (finishedYear) {
                    return selectedYear >= startYear && selectedYear <= finishedYear;
                } else {
                    return selectedYear >= startYear;
                }
            });
        }
        
        
        function toggleUsersDropdown() {
            const dropdown = document.getElementById('users-dropdown');
            
            dropdown.classList.toggle('hidden');
            
            if (!dropdown.classList.contains('hidden')) {
                if (window.PresenceTracker) PresenceTracker.updateActiveUsersUI();
                setTimeout(() => {
                    document.addEventListener('click', closeUsersDropdownOnClickOutside);
                }, 0);
            }
        }
        
        function closeUsersDropdownOnClickOutside(e) {
            const dropdown = document.getElementById('users-dropdown');
            const btn = document.getElementById('active-users-btn');
            
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeUsersDropdownOnClickOutside);
            }
        }

        async function switchYear(newYear) {

            // Detach realtime listener for old year before switching
            if (window.RowSaveManager && state.selectedYear) {
                window.RowSaveManager.detachRealtimeSync(state.selectedYear);
            }

            const oldYear = state.selectedYear;

            if (!state.yearProjectCache) state.yearProjectCache = new Map();
            if (state.projects && state.projects.length > 0) {
                const existingCache = state.yearProjectCache.get(oldYear) || [];
                const cacheMap = new Map(existingCache.map(p => [p.name, p]));
                state.projects.forEach(p => cacheMap.set(p.name, p));
                state.yearProjectCache.set(oldYear, Array.from(cacheMap.values()));
            }
            try {
                if (window.firebaseReady && window.firebaseDb && state.currentUser) {
                    await saveToFirebase();
                }
            } catch(e) {  }

            state.selectedYear = newYear;
            localStorage.setItem('esh_selected_year', newYear);

            state.searchTerm = '';
            state.regionFilter = '';
            state.statusFilter = '';

            const preservedPersonnel = JSON.parse(JSON.stringify(state.personnelData || []));

            showToast(`Loading ${newYear} data...`, 'info', 1500);

            let yearLoaded = false;
            let carryForwardApplied = false; // tracks if carry-forward ran (new year, no Firebase data yet)

            if (!state.yearProjectCache) state.yearProjectCache = new Map();

            if (window.firebaseReady && window.firebaseDb) {
                try {
                    const dataUserId = getDataSourceUserId();
                    const yearDocRef = window.firebase.doc(window.firebaseDb, 'users', dataUserId, 'years', newYear.toString());
                    const yearSnap = await window.firebase.getDoc(yearDocRef);

                    if (yearSnap.exists()) {
                        const data = yearSnap.data();

                        const perProjectDocs = await ProjectsDB.loadYear(newYear);
                        const newYearProjects = (perProjectDocs && perProjectDocs.length > 0)
                            ? perProjectDocs
                            : (data.projects || []);

                        state.yearProjectCache.set(newYear, newYearProjects.map(p => JSON.parse(JSON.stringify(p))));

                        state.incidentRateData = data.incidentRateData || { recordableCases: 0, lostDays: 0, totalHours: 0 };
                        state.oshData = data.oshData || {};
                        const docPersonnel = data.personnelData || [];
                        if (docPersonnel.length >= preservedPersonnel.length) {
                            preservedPersonnel.splice(0, preservedPersonnel.length, ...docPersonnel);
                        }
                        yearLoaded = true;
                    } else {
                        state.incidentRateData = { recordableCases: 0, lostDays: 0, totalHours: 0 };
                        state.oshData = {};

                        if (newYear > oldYear) {

                            const CARRY_OVER_PREFIXES = [
                                'permits_', 'emb_', 'cshp_', 'dole_', 'doe_', 'doe-permit_',
                                'reg_', 'nov_', 'nov-env_'
                            ];
                            const FULL_RESET_PREFIXES = [
                                'got_', 'kpm_', 'audit_'
                            ];

                            const oldYearProjects = state.yearProjectCache.get(oldYear) || [];
                            const carriedProjects = oldYearProjects
                                .filter(p => {
                                    const finishedYear = p.dateFinished ? parseInt(p.dateFinished.split('-')[0]) : null;
                                    const isFinished = (p.status || '').toLowerCase() === 'finished'
                                        && finishedYear !== null && finishedYear <= oldYear;
                                    const hasExpiredDate = finishedYear !== null && finishedYear < oldYear;
                                    return !(isFinished || hasExpiredDate);
                                })
                                .map(p => {
                                    const carried = JSON.parse(JSON.stringify(p));
                                    if (carried.vals) {
                                        Object.keys(carried.vals).forEach(key => {
                                            if (CARRY_OVER_PREFIXES.some(pfx => key.startsWith(pfx))) {
                                                return; // skip — carry-over as-is
                                            }

                                            if (FULL_RESET_PREFIXES.some(pfx => key.startsWith(pfx))) {
                                                delete carried.vals[key];
                                                return;
                                            }

                                            const arr = carried.vals[key];
                                            if (Array.isArray(arr) && arr.length >= 13) {
                                                let ytd = 0, hasAny = false;
                                                for (let i = 1; i <= 12; i++) {
                                                    const v = parseFloat(arr[i]);
                                                    if (!isNaN(v) && v !== 0) { ytd += v; hasAny = true; }
                                                }
                                                const newArr = new Array(14).fill(null);
                                                newArr[0] = hasAny ? ytd : (arr[0] || null); // PREVIOUS = old YTD
                                                carried.vals[key] = newArr;
                                            }
                                        });
                                    }
                                    carried.oshData = {}; // fresh osh for new year
                                    return carried;
                                });
                            state.yearProjectCache.set(newYear, carriedProjects);
                            carryForwardApplied = true; // carry-forward ran — need to auto-save to Firebase
                        } else {
                            state.yearProjectCache.set(newYear, []);
                        }
                        yearLoaded = true;
                    }
                } catch(e) {
                }
            }

            if (!yearLoaded) {
                const localKey = `esh_dashboard_${newYear}_${state.currentUser?.email}`;
                const localRaw = localStorage.getItem(localKey);
                if (localRaw) {
                    try {
                        const localData = JSON.parse(localRaw);
                        const newYearProjects = (localData.projects || []).map(p => JSON.parse(JSON.stringify(p)));
                        state.yearProjectCache.set(newYear, newYearProjects);
                        state.incidentRateData = localData.incidentRateData || { recordableCases: 0, lostDays: 0, totalHours: 0 };
                        state.oshData = localData.oshData || {};
                    } catch(e) {
                        state.yearProjectCache.set(newYear, []);
                        state.incidentRateData = { recordableCases: 0, lostDays: 0, totalHours: 0 };
                        state.oshData = {};
                    }
                } else {
                    state.incidentRateData = { recordableCases: 0, lostDays: 0, totalHours: 0 };
                    state.oshData = {};
                    if (newYear > oldYear) {
                        const CARRY_OVER_PREFIXES_OFFLINE = [
                            'permits_', 'emb_', 'cshp_', 'dole_', 'doe_', 'doe-permit_',
                            'reg_', 'nov_', 'nov-env_'
                        ];
                        const FULL_RESET_PREFIXES_OFFLINE = [
                            'got_', 'kpm_', 'audit_'
                        ];

                        const oldYearProjects = state.yearProjectCache.get(oldYear) || [];
                        const carriedOffline = oldYearProjects
                            .filter(p => {
                                const finishedYear = p.dateFinished ? parseInt(p.dateFinished.split('-')[0]) : null;
                                const isFinished = (p.status || '').toLowerCase() === 'finished'
                                    && finishedYear !== null && finishedYear <= oldYear;
                                const hasExpiredDate = finishedYear !== null && finishedYear < oldYear;
                                return !(isFinished || hasExpiredDate);
                            })
                            .map(p => {
                                const carried = JSON.parse(JSON.stringify(p));
                                if (carried.vals) {
                                    Object.keys(carried.vals).forEach(key => {
                                        if (CARRY_OVER_PREFIXES_OFFLINE.some(pfx => key.startsWith(pfx))) {
                                            return;
                                        }
                                        if (FULL_RESET_PREFIXES_OFFLINE.some(pfx => key.startsWith(pfx))) {
                                            delete carried.vals[key];
                                            return;
                                        }
                                        const arr = carried.vals[key];
                                        if (Array.isArray(arr) && arr.length >= 13) {
                                            let ytd = 0, hasAny = false;
                                            for (let i = 1; i <= 12; i++) {
                                                const v = parseFloat(arr[i]);
                                                if (!isNaN(v) && v !== 0) { ytd += v; hasAny = true; }
                                            }
                                            const newArr = new Array(14).fill(null);
                                            newArr[0] = hasAny ? ytd : (arr[0] || null);
                                            carried.vals[key] = newArr;
                                        }
                                    });
                                }
                                carried.oshData = {};
                                return carried;
                            });
                        state.yearProjectCache.set(newYear, carriedOffline);
                        carryForwardApplied = true; // carry-forward ran offline — save when Firebase available
                    } else {
                        state.yearProjectCache.set(newYear, []);
                    }
                }
            }

            state.personnelData = preservedPersonnel;

            const newYearCachedProjects = state.yearProjectCache.get(newYear) || [];
            const shellMap = new Map();
            state.yearProjectCache.forEach((projects, yr) => {
                projects.forEach(p => {
                    if (!shellMap.has(p.name)) {
                        shellMap.set(p.name, {
                            name: p.name,
                            region: p.region,
                            dateStarted: p.dateStarted,
                            dateFinished: p.dateFinished,
                            status: p.status,
                            vals: {},
                            oshData: {}
                        });
                    }
                });
            });
            newYearCachedProjects.forEach(p => {
                shellMap.set(p.name, p); // full project data (vals, oshData, etc.) for current year
            });
            state.masterProjects = Array.from(shellMap.values());

            state.projects = filterProjectsByYear(state.masterProjects, newYear);
            state.projects.forEach(syncProjectStatus); // ensure status matches workStoppageDate/workResumeDate
            ensureCorporateProject(); ensurePlantProjects();
            state.filteredProjects = [...state.projects];

            try {
                const dataUserId = getDataSourceUserId();
                localStorage.removeItem(`esh_projects_cache_${dataUserId}`);
                localStorage.removeItem(`esh_projects_cache_ts_${dataUserId}`);
            } catch(e) {}

            if (carryForwardApplied && state.isAdmin && window.firebaseReady && window.firebaseDb) {
                try {
                    showToast(`Initializing ${newYear} data — saving to Firebase...`, 'info', 2500);
                    await saveToFirebase();
                } catch(e) {
                    showToast(`Could not auto-save ${newYear} data. Please press Save manually.`, 'warning', 5000);
                }
            }

            updateYearDisplay();
            renderYearOptions();
            render();
            renderPTable();

            if (state.currentTab === 'tabulation') {
                setTimeout(renderTabulation, 100);
            }

            showToast(`Switched to ${newYear} — ${state.projects.length} project(s) loaded`, 'success');

            // Re-attach real-time sync for the new year
            if (window.RowSaveManager) {
                window.RowSaveManager.attachRealtimeSync(newYear);
            }

        }

        function toggleNotificationDropdown() {
            const dropdown = document.getElementById('notification-dropdown');
            dropdown.classList.toggle('hidden');
            
            if (!dropdown.classList.contains('hidden')) {
                updateNotifications();
                setTimeout(() => {
                    document.addEventListener('click', closeNotificationDropdownOnClickOutside);
                }, 0);
            }
        }

        function closeNotificationDropdownOnClickOutside(e) {
            const dropdown = document.getElementById('notification-dropdown');
            const btn = document.getElementById('notification-bell-btn');
            
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeNotificationDropdownOnClickOutside);
            }
        }

        function updateNotifications() {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth(); // 0-11, real today's month
            const currentYear = currentDate.getFullYear();
            const currentDay = currentDate.getDate();
            window.updateNotifications = updateNotifications; // expose globally

            // ── Selected year (the year the dashboard is viewing) ──────────────
            const _notifSelYr = (state && state.selectedYear) || currentYear;

            // For monthly overdue checks:
            // • If viewing a PAST year  → all 12 months are "past" (limit = 12)
            // • If viewing CURRENT year → only months strictly before today (limit = currentMonth, 0-based index)
            // • If viewing a FUTURE year → nothing is past yet (limit = 0)
            const _pastMonthLimit = (_notifSelYr < currentYear) ? 12
                                  : (_notifSelYr === currentYear) ? currentMonth
                                  : 0;

            // Helper: return the 0-based month index when this project started
            // within the selected year (0 = Jan). Returns 0 if started before or
            // during Jan of the selected year (all months apply).
            function _projectStartMonth0(project) {
                if (!project.dateStarted) return 0;
                const parts = project.dateStarted.split('-');
                const pYear = parseInt(parts[0]);
                const pMonth0 = parseInt(parts[1]) - 1; // 0-based
                if (pYear < _notifSelYr) return 0;   // started before this year → all months
                if (pYear > _notifSelYr) return 12;  // starts after this year → no months
                return pMonth0; // started mid-year → only from that month onward
            }

            // Helper: days until expiry (negative = already expired)
            function daysUntil(dateStr) {
                if (!dateStr || dateStr.trim() === '') return null;
                const d = new Date(dateStr);
                if (isNaN(d)) return null;
                return Math.floor((d - currentDate) / (1000 * 60 * 60 * 24));
            }

            // Helper: get permit entries (handles multi-entry and legacy single-entry)
            function getPermitEntries(project, row) {
                const key = 'permits_' + row;
                const raw = project.vals && project.vals[key];
                if (!raw) return [];
                if (raw.entries && raw.entries.length) return raw.entries;
                return [{ permitNo: raw[1] || '', dateIssued: raw[2] || '', expiryDate: raw[3] || '' }];
            }

            // Helper: core documents that must be flagged when missing, EVEN IF the
            // project is on work stoppage: CSHP, DOLE Certificate of Registration,
            // DOE Safety Officer Permit (renewable only) and ECC (Environmental Permits).
            function getMissingCoreDocs(project, isCorp, isPlant) {
                const out = [];
                const v = project.vals || {};
                // CSHP (not for CORPORATE / PLANT OPERATIONS)
                if (!isCorp && !isPlant) {
                    const d = v['cshp_CSHP Approval Date'] ? v['cshp_CSHP Approval Date'][1] : '';
                    if (!d || d.toString().trim() === '') out.push({ name: 'CSHP (Missing)', tab: 'cshp' });
                }
                // DOLE Certificate of Registration (not for PLANT OPERATIONS)
                if (!isPlant) {
                    const d = v['reg_DOLE Certificate of Registration Date'] ? v['reg_DOLE Certificate of Registration Date'][1] : '';
                    if (!d || d.toString().trim() === '') out.push({ name: 'DOLE Certificate of Registration (Missing)', tab: 'reg' });
                }
                // DOE Safety Officer Permit (renewable only, not CORPORATE / PLANT OPERATIONS)
                if (project.isRenewable === true && !isCorp && !isPlant && v['doe-permit_client_provided'] !== '1') {
                    const pv = v['doe-permit_DOE Safety Officer Permit'];
                    const no = pv ? pv[1] : '';
                    if (!no || no.toString().trim() === '') out.push({ name: 'DOE Safety Officer Permit (Missing)', tab: 'doe-permit' });
                }
                // ECC under Environmental Permits (not for CORPORATE)
                if (!isCorp) {
                    const raw = v['permits_ECC'];
                    const skip = raw && (raw['__na'] === '1' || v['permits_ECC__na'] === '1' || raw['__cp'] === '1' || v['permits_ECC__cp'] === '1');
                    if (!skip) {
                        const entries = getPermitEntries(project, 'ECC');
                        const hasNo = entries.some(e => e.permitNo && e.permitNo.toString().trim() !== '');
                        if (!hasNo) out.push({ name: 'Missing Permit(s): ECC', tab: 'permits' });
                    }
                }
                return out;
            }

            let projectOverdues = {};

            // ── KPM: pre-build region -> projects map ─────────────────────────
            // dateSubmitted is saved on projs[0] (the first project per region),
            // NOT on every project individually. So we must check region-wide:
            // a month is "submitted" if ANY non-N/A, non-stopped project in the
            // same region has kpm_v3_{month}_dateSubmitted set.
            // This mirrors the anySubm pattern used in the KPM summary view.
            const _KPM_MO_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const _kpmRegionProjects = {};
            state.projects.forEach(p => {
                if (p.status === 'work-stoppage') return;
                if (p.status === 'finished') return;
                if (p.vals && p.vals['kpm_na'] === '1') return;
                const reg = (p.region || 'UNKNOWN').toUpperCase();
                if (!_kpmRegionProjects[reg]) _kpmRegionProjects[reg] = [];
                _kpmRegionProjects[reg].push(p);
            });
            // For each region, pre-compute which past months are missing dateSubmitted
            const _kpmRegionOverdueMonths = {};
            Object.entries(_kpmRegionProjects).forEach(([reg, regProjs]) => {
                const missingMonths = [];
                for (let month = 0; month < _pastMonthLimit; month++) {
                    const mo = _KPM_MO_NAMES[month];
                    const _dateKey = 'kpm_v3_' + mo + '_dateSubmitted';
                    const anySubmitted = regProjs.some(p => {
                        const v = p.vals && p.vals[_dateKey];
                        return v && v.toString().trim() !== '';
                    });
                    if (!anySubmitted) missingMonths.push(month);
                }
                _kpmRegionOverdueMonths[reg] = missingMonths;
            });

            state.projects.forEach(project => {
                // ── Skip work-stoppage projects entirely — they are exempt ──────
                // Work-stoppage projects are exempt from periodic reports, but still
                // flagged when CSHP / DOLE Cert. of Registration / DOE SO Permit / ECC is missing.
                // Re-derive status from the dates first, so a stale p.status can never hide a stoppage.
                if (typeof syncProjectStatus === 'function') syncProjectStatus(project);
                if (project.status === 'work-stoppage') {
                    const _sReg = (project.region || '').toUpperCase();
                    const _stopTabs = getMissingCoreDocs(project, _sReg === 'CORPORATE', _sReg === 'PLANT OPERATIONS');
                    if (_stopTabs.length > 0) projectOverdues[project.name] = _stopTabs;
                    return;
                }
                // ── Skip finished projects — no longer active, no overdue alerts ──
                if (project.status === 'finished') return;

                let overdueTabs = [];

                // Project start month within the selected year (0-based).
                // Months before this index are skipped — project didn't exist yet.
                const _projStartMo0 = _projectStartMonth0(project);

                // Region-aware exclusion flags — mirrors dashboard tab visibility rules:
                // CORPORATE allowed tabs: rates, exposures, medical, nov, nov-env, nov-monitoring, activities, dole
                // PLANT OPERATIONS allowed tabs: permits, emb, env-monitoring, env-monthly-report
                const _notifRegion = (project.region || '').toUpperCase();
                const _isCorp  = _notifRegion === 'CORPORATE';
                const _isPlant = _notifRegion === 'PLANT OPERATIONS';

                // ── KPM: check region-wide dateSubmitted (not per-project) ────────
                // CORPORATE and PLANT OPERATIONS are excluded from KPM reporting
                if (!_isCorp && !_isPlant) {
                    const _kpmNa = project.vals && project.vals['kpm_na'] === '1';
                    const _reg = _notifRegion || 'UNKNOWN';
                    const _regionMissingMonths = _kpmRegionOverdueMonths[_reg] || [];
                    const _effectiveMissing = _kpmNa ? [] : _regionMissingMonths.filter(month => {
                        if (month < _projStartMo0) return false;
                        if (typeof isMonthBlacklistedForProject === 'function' &&
                            isMonthBlacklistedForProject(project, month + 1, _notifSelYr)) return false;
                        return true;
                    });
                    if (_effectiveMissing.length > 0) overdueTabs.push({ name: 'KPM', tab: 'kpm' });
                }

                // ── ENVI REPORTORIAL (Environmental Monthly Report): missing monthly entries ──
                // CORPORATE and PLANT OPERATIONS are excluded from EMR reporting
                let hasEnvMonthlyOverdue = false;
                const key_emr = 'env-monthly-report_Environmental Monthly Report (EMR)';
                if (_pastMonthLimit > 0 && !_isCorp && !_isPlant) {
                    for (let month = 0; month < _pastMonthLimit; month++) {
                        // Skip months before the project started this year
                        if (month < _projStartMo0) continue;
                        // Skip blacklisted months (work-stoppage periods)
                        if (typeof isMonthBlacklistedForProject === 'function' &&
                            isMonthBlacklistedForProject(project, month + 1, _notifSelYr)) continue;
                        const value = project.vals[key_emr] ? project.vals[key_emr][month + 1] : '';
                        if (!value || value.toString().trim() === '') { hasEnvMonthlyOverdue = true; break; }
                    }
                }
                if (hasEnvMonthlyOverdue) overdueTabs.push({ name: 'ENVI Reportorial (EMR)', tab: 'env-monthly-report' });

                // ── GOT MONITORING: no GOT data entered for any past month ───────
                // CORPORATE and PLANT OPERATIONS are excluded from GOT Monitoring
                if (!_isCorp && !_isPlant) {
                    const _gotGoalIds = ['E1','E2','E3','S1','S2','S3'];
                    const _selYrGot   = _notifSelYr;
                    let hasAnyGotData = false;
                    outer_got: for (const goalId of _gotGoalIds) {
                        const k = 'got_' + goalId + '_0';
                        const raw = project.vals && project.vals[k];
                        if (!raw) continue;
                        for (let month = 1; month <= _pastMonthLimit; month++) {
                            // Skip months before the project started this year
                            if ((month - 1) < _projStartMo0) continue;
                            if (typeof isMonthBlacklistedForProject === 'function' &&
                                isMonthBlacklistedForProject(project, month, _selYrGot)) continue;
                            const cell = raw[month];
                            const rVal = cell && (typeof cell === 'object' ? cell.r : cell);
                            if (rVal && rVal.toString().trim() !== '') { hasAnyGotData = true; break outer_got; }
                        }
                    }
                    if (!hasAnyGotData && _pastMonthLimit > 0) overdueTabs.push({ name: 'GOT Monitoring (No Data Entered)', tab: 'got-monitoring' });
                }

                // ── ESH CALENDAR & DRILLS: planned drills with no actual recorded ─
                // CORPORATE and PLANT OPERATIONS are excluded from ESH Calendar & Drills
                if (!_isCorp && !_isPlant) {
                    const _eshStor = (typeof getEshStorage === 'function') ? getEshStorage() : (window._eshMemCache || {});
                    const _eshSelYr = _notifSelYr;
                    let hasEshDrillOverdue = false;
                    outer_drills: for (const [storKey, planVal] of Object.entries(_eshStor)) {
                        if (!planVal) continue;
                        if (!storKey.startsWith(_eshSelYr + '|esh-calendar-drills|GLOBAL_PLAN|')) continue;
                        const parts = storKey.split('|');
                        if (parts.length < 6 || parts[5] !== 'plan') continue;
                        const di = parts[3], mi = parseInt(parts[4]);
                        if (mi < 1 || mi > _pastMonthLimit) continue;
                        if ((mi - 1) < _projStartMo0) continue;
                        const naCellKey = _eshSelYr + '|esh-calendar-drills|' + project.name + '|' + di + '|' + mi + '|na';
                        if (_eshStor[naCellKey]) continue;
                        const actualKey = _eshSelYr + '|esh-calendar-drills|' + project.name + '|' + di + '|' + mi + '|actual';
                        if (!_eshStor[actualKey]) { hasEshDrillOverdue = true; break outer_drills; }
                    }
                    if (hasEshDrillOverdue) overdueTabs.push({ name: 'ESH Calendar & Drills (Pending Actual)', tab: 'esh-calendar-drills' });
                }

                // ── DOLE Monthly: WAIR, RSO, MOM ────────────────────────────────
                // PLANT OPERATIONS is excluded from DOLE reporting
                let hasDoleMonthlyOverdue = false;
                if (_pastMonthLimit > 0 && !_isPlant) {
                    ['WAIR', 'RSO', 'MOM'].forEach(row => {
                        if (hasDoleMonthlyOverdue) return;
                        const key = `dole_${row}`;
                        for (let month = 0; month < _pastMonthLimit; month++) {
                            // Skip months before the project started this year
                            if (month < _projStartMo0) continue;
                            // Skip blacklisted months (work-stoppage periods)
                            if (typeof isMonthBlacklistedForProject === 'function' &&
                                isMonthBlacklistedForProject(project, month + 1, _notifSelYr)) continue;
                            const value = project.vals[key] ? project.vals[key][month + 1] : '';
                            if (!value || value.toString().trim() === '') { hasDoleMonthlyOverdue = true; break; }
                        }
                    });
                }
                if (hasDoleMonthlyOverdue) overdueTabs.push({ name: 'DOLE Reportorial', tab: 'dole' });

                // ── DOLE Annual: AEDR (due Jan 30) & AMR (due Mar 31) ───────────
                // PLANT OPERATIONS is excluded from DOLE reporting
                if (!_isPlant) {
                const _doleAnnual = [
                    { row: 'AEDR', label: 'AEDR (Annual Exposure Data Report)', dlM: 0, dlD: 30 }, // Jan 30
                    { row: 'AMR',  label: 'AMR (Annual Medical Report)',         dlM: 2, dlD: 31 }  // Mar 31
                ];
                const _doleSelYr = _notifSelYr;
                _doleAnnual.forEach(({ row, label, dlM, dlD }) => {
                    // Column year Y: report covers Y-1, deadline falls within Y
                    const isPastDue = currentYear > _doleSelYr ||
                        (currentYear === _doleSelYr && (currentMonth > dlM || (currentMonth === dlM && currentDay > dlD)));
                    if (!isPastDue) return;
                    // No covered period yet (project started in/after the selected year),
                    // or stoppage-year exemption → never flag as missing.
                    if (!isDoleAnnualRequired(project, _doleSelYr)) return;
                    if (isDoleAnnualStoppageExempt(project, _doleSelYr)) return;
                    if (isDoleAnnualNA(project, row)) return; // marked N/A (AEDR or AMR) → never flag as missing
                    const val = project.vals[`dole_${row}`] ? (project.vals[`dole_${row}`][1] || '') : '';
                    if (!val || val.trim() === '') {
                        overdueTabs.push({ name: `${label} (Missing)`, tab: 'dole' });
                    }
                });
                } // end !_isPlant DOLE Annual

                // ── EMB Reportorial: SMR quarterly ──────────────────────────────
                // CORPORATE is excluded from EMB reporting
                let hasEmbOverdue = false;
                if (!_isCorp) {
                const _embSelYr = _notifSelYr;
                const key_emb = 'emb_SMR (Quarterly) - Submission Date';
                const key_emb_coc = 'emb_SMR (Quarterly) - Care of Client';
                const key_emb_na  = 'emb_SMR (Quarterly) - N/A';
                for (let quarter = 1; quarter <= 4; quarter++) {
                    let isOverdue = false;
                    if (quarter === 4) {
                        const deadlineYear = _embSelYr + 1;
                        if (currentYear > deadlineYear) isOverdue = true;
                        else if (currentYear === deadlineYear && (currentMonth > 0 || (currentMonth === 0 && currentDay > 15))) isOverdue = true;
                    } else {
                        const deadlineMonth = quarter * 3; // Apr=3, Jul=6, Oct=9 (0-based)
                        if (currentYear > _embSelYr) isOverdue = true;
                        else if (currentYear === _embSelYr && (currentMonth > deadlineMonth || (currentMonth === deadlineMonth && currentDay > 15))) isOverdue = true;
                    }
                    if (isOverdue) {
                        // Check Care of Client / N/A exemption — if either is set, project is exempt for this quarter
                        const cocV = project.vals[key_emb_coc] ? project.vals[key_emb_coc][quarter] : '';
                        const naV  = project.vals[key_emb_na]  ? project.vals[key_emb_na][quarter]  : '';
                        const isCocExempt = cocV === true || cocV === 'true' || cocV === '1'
                                         || naV  === true || naV  === 'true' || naV  === '1';
                        if (!isCocExempt) {
                            const value = project.vals[key_emb] ? project.vals[key_emb][quarter] : '';
                            if (!value || value.toString().trim() === '') { hasEmbOverdue = true; break; }
                        }
                    }
                }
                } // end !_isCorp EMB
                if (hasEmbOverdue) overdueTabs.push({ name: 'EMB Reportorial', tab: 'emb' });

                // ── DOE (Renewable only) ─────────────────────────────────────────
                // CORPORATE and PLANT OPERATIONS are excluded from DOE reporting
                if (project.isRenewable === true && !_isCorp && !_isPlant) {
                    // DOE Safety Officer Permit
                    if (!(project.vals && project.vals['doe-permit_client_provided'] === '1')) {
                        const doePermitVals = project.vals['doe-permit_DOE Safety Officer Permit'];
                        const permitNumber = doePermitVals ? doePermitVals[1] : '';
                        const validUntil = doePermitVals ? doePermitVals[2] : '';
                        if (!permitNumber || permitNumber.trim() === '') {
                            overdueTabs.push({ name: 'DOE Safety Officer Permit (Missing)', tab: 'doe-permit' });
                        } else if (validUntil && validUntil.trim() !== '') {
                            const d = daysUntil(validUntil);
                            if (d !== null && d < 0)   overdueTabs.push({ name: 'DOE Safety Officer Permit (Expired)', tab: 'doe-permit', isExpired: true });
                            else if (d !== null && d <= 60) overdueTabs.push({ name: `DOE Safety Officer Permit (Expiring in ${d}d)`, tab: 'doe-permit', isExpiring: true });
                        }
                    }
                    // DOE Quarterly Report
                    if (!(project.vals && (project.vals['doe_client_provided'] === '1' || project.vals['doe-permit_client_provided'] === '1'))) {
                        const doeQKey = 'doe_DOE Quarterly Report Submission Date';
                        const _doeSelY = _notifSelYr;
                        const _doeDueMonths = { 1: [3,20], 2: [6,20], 3: [9,20], 4: [0,20] };
                        let hasDoeOverdue = false;
                        for (let q = 1; q <= 4; q++) {
                            const [dm, dd] = _doeDueMonths[q];
                            let isPastDue = false;
                            if (q === 4) {
                                const dlY = _doeSelY + 1;
                                if (currentYear > dlY) isPastDue = true;
                                else if (currentYear === dlY && (currentMonth > 0 || (currentMonth === 0 && currentDay > dd))) isPastDue = true;
                            } else {
                                if (currentYear > _doeSelY) isPastDue = true;
                                else if (currentYear === _doeSelY && (currentMonth > dm || (currentMonth === dm && currentDay > dd))) isPastDue = true;
                            }
                            if (isPastDue) {
                                const val = project.vals[doeQKey] ? project.vals[doeQKey][q] : '';
                                if (!val || val.toString().trim() === '') { hasDoeOverdue = true; break; }
                            }
                        }
                        if (hasDoeOverdue) overdueTabs.push({ name: 'DOE Reportorial (Overdue)', tab: 'doe' });
                    }
                }

                // ── CSHP ────────────────────────────────────────────────────────
                // CORPORATE and PLANT OPERATIONS are excluded from CSHP
                if (!_isCorp && !_isPlant) {
                const cshpDate = project.vals['cshp_CSHP Approval Date'] ? project.vals['cshp_CSHP Approval Date'][1] : '';
                if (!cshpDate || cshpDate.trim() === '') {
                    overdueTabs.push({ name: 'CSHP (Missing)', tab: 'cshp' });
                }
                } // end !_isCorp && !_isPlant CSHP

                // ── DOLE Certificate of Registration ─────────────────────────────
                // PLANT OPERATIONS is excluded from DOLE
                if (!_isPlant) {
                    const _regDate = project.vals['reg_DOLE Certificate of Registration Date'] ? project.vals['reg_DOLE Certificate of Registration Date'][1] : '';
                    if (!_regDate || _regDate.toString().trim() === '') {
                        overdueTabs.push({ name: 'DOLE Certificate of Registration (Missing)', tab: 'reg' });
                    }
                }

                // ── PERMITS: expired / expiring soon / missing ──────────────────
                // CORPORATE is excluded from Permits reporting
                if (!_isCorp) {
                const PERMIT_ROWS = (window.MULTI_ENTRY_PERMITS)
                    ? ['ECC','Company Registration System (CRS)','CNC','Certificate of Accreditation (DENR-EMB)','Certificate of Accreditation (LLDA)','LLDA Clearance','Permit to Transport (PTT)','Permit to Operate (PTO)','Discharge Permit (DP)',"Hazardous Waste Generator's ID",'Permit to Transport (Haz Waste)','Permit to Transport (Logs)','Tree Cutting Permit (STCP or S/PLTP)','Permit to Cut Coconut Tree','NWRB Water Permit']
                    : [];
                const NO_EXPIRY = window.NO_EXPIRY_PERMITS || [];
                let expiredPermits = [], expiringPermits = [], missingPermits = [];

                PERMIT_ROWS.forEach(row => {
                    const key = 'permits_' + row;
                    const raw = project.vals && project.vals[key];
                    // Skip if N/A or Client-Provided
                    if (raw && (raw['__na'] === '1' || project.vals[key + '__na'] === '1')) return;
                    if (raw && (raw['__cp'] === '1' || project.vals[key + '__cp'] === '1')) return;

                    const entries = getPermitEntries(project, row);
                    const noExpiry = NO_EXPIRY.includes(row);

                    // ECC is mandatory: no entry at all counts as missing
                    if (row === 'ECC' && entries.length === 0) {
                        missingPermits.push(row);
                        return;
                    }

                    entries.forEach(entry => {
                        if (!entry.permitNo || entry.permitNo.trim() === '') {
                            missingPermits.push(row);
                            return;
                        }
                        if (noExpiry) return; // No expiry to check
                        if (!entry.expiryDate || entry.expiryDate.trim() === '') return; // No expiry date entered yet
                        const d = daysUntil(entry.expiryDate);
                        if (d !== null && d < 0)    expiredPermits.push(row);
                        else if (d !== null && d <= 60) expiringPermits.push(row);
                    });
                });

                if (expiredPermits.length > 0) {
                    overdueTabs.push({ name: `Expired Permit(s): ${expiredPermits.slice(0,2).join(', ')}${expiredPermits.length > 2 ? ` +${expiredPermits.length-2} more` : ''}`, tab: 'permits', isExpired: true });
                }
                if (expiringPermits.length > 0) {
                    overdueTabs.push({ name: `Expiring Soon (≤60d): ${expiringPermits.slice(0,2).join(', ')}${expiringPermits.length > 2 ? ` +${expiringPermits.length-2} more` : ''}`, tab: 'permits', isExpiring: true });
                }
                if (missingPermits.length > 0) {
                    overdueTabs.push({ name: `Missing Permit(s): ${missingPermits.slice(0,2).join(', ')}${missingPermits.length > 2 ? ` +${missingPermits.length-2} more` : ''}`, tab: 'permits' });
                }
                } // end !_isCorp Permits

                // ── OSH Deficiency ───────────────────────────────────────────────
                // CORPORATE and PLANT OPERATIONS are excluded from OSH Deficiency checks
                if (!_isCorp && !_isPlant) {
                    const manpower = (typeof getOshManpower === 'function') ? getOshManpower(project) : 0;
                    if (manpower > 0) {
                        const req = computeOshRequirements(manpower);
                        if (req) {
                            const actual = countActualOshPersonnel(project.name);
                            const deficiencies = [];
                            if (req.firstAider    > 0 && actual.firstAider    < req.firstAider)    deficiencies.push(`First Aider (${actual.firstAider}/${req.firstAider})`);
                            if (req.safetyOfficer > 0 && actual.safetyOfficer < req.safetyOfficer) deficiencies.push(`Safety Officer (${actual.safetyOfficer}/${req.safetyOfficer})`);
                            // Extra check: when SO4 is required (soLabel contains 'SO4'), verify at least 1 actual SO4 is present.
                            // ESH Superintendent and ESH Head are SO3-level and do NOT satisfy the SO4 slot.
                            if (req.soLabel && req.soLabel.includes('SO4') && actual.so4Count < 1) deficiencies.push(`Safety Officer IV required (0 SO4 assigned — ESH Head/Superintendent are SO3 only)`);
                            if (req.ohNurse       > 0 && actual.ohNurse       < req.ohNurse)       deficiencies.push(`OH Nurse (${actual.ohNurse}/${req.ohNurse})`);
                            if (req.ohDentist     > 0 && actual.ohDentist     < req.ohDentist)     deficiencies.push(`OH Dentist (${actual.ohDentist}/${req.ohDentist})`);
                            if (req.ohPhysician   > 0 && actual.ohPhysician   < req.ohPhysician)   deficiencies.push(`OH Physician (${actual.ohPhysician}/${req.ohPhysician})`);
                            if (deficiencies.length > 0) {
                                overdueTabs.push({ name: `OSH Deficiency: ${deficiencies.join(', ')}`, tab: 'osh-requirement', isOsh: true });
                            }
                        }
                    }
                }

                if (overdueTabs.length > 0) {
                    projectOverdues[project.name] = overdueTabs;
                }
            });

            let totalIssues = 0;
            Object.keys(projectOverdues).forEach(projectName => {
                totalIssues += projectOverdues[projectName].length;
            });

            const badge = document.getElementById('notification-badge');
            if (totalIssues > 0) {
                badge.textContent = totalIssues > 99 ? '99+' : totalIssues;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }

            const notificationList = document.getElementById('notification-list');
            if (totalIssues === 0) {
                notificationList.innerHTML = `
                    <div class="notification-empty">
                        <i class="fas fa-check-circle"></i>
                        <div style="font-weight: 600; margin-bottom: 5px;">All caught up!</div>
                        <div>No overdue reports or missing permits.</div>
                    </div>
                `;
            } else {
                let html = '';
                const sortedProjectNames = Object.keys(projectOverdues).sort((a, b) => a.localeCompare(b));

                sortedProjectNames.forEach(projectName => {
                    const tabs = projectOverdues[projectName];
                    window._notifOpen = window._notifOpen || new Set();
                    const _grpOpen = window._notifOpen.has(projectName);
                    html += `<div class="notification-group${_grpOpen ? ' open' : ''}" data-pn="${encodeURIComponent(projectName)}" onclick="toggleNotifGroup(this)"><i class="fas fa-chevron-right notif-chev"></i><i class="fas fa-building"></i><span>${projectName}</span><b>${tabs.length}</b></div><div class="notif-group-body${_grpOpen ? ' open' : ''}">`;
                    tabs.forEach(tabInfo => {
                        const isOsh      = tabInfo.isOsh === true;
                        const isExpired  = tabInfo.isExpired === true;
                        const isExpiring = tabInfo.isExpiring === true;

                        const iconClass  = isOsh ? 'fa-shield-halved' : isExpired ? 'fa-circle-xmark' : isExpiring ? 'fa-clock' : 'fa-exclamation-triangle';
                        const statusText = isOsh ? 'OSH Deficient' : isExpired ? 'Expired' : isExpiring ? 'Expiring Soon' : 'Missing';
                        const statusColor= isOsh ? '#e65100' : isExpired ? '#c62828' : isExpiring ? '#e65100' : '#d32f2f';
                        const iconBg     = isOsh ? 'rgba(230,81,0,0.1)' : isExpired ? 'rgba(198,40,40,0.1)' : isExpiring ? 'rgba(230,81,0,0.1)' : 'rgba(211,47,47,0.1)';
                        const displayName = isOsh ? tabInfo.name.replace('OSH Deficiency: ', '') : tabInfo.name;

                        const _pnSafe = projectName.replace(/'/g, "\\'");
                        html += `
                            <div class="notification-item" onclick="redirectToProjectTable('${_pnSafe}', '${tabInfo.tab}')">
                                <div class="notif-icon-box" style="background:${iconBg};">
                                    <i class="fas ${iconClass}" style="color:${statusColor};"></i>
                                </div>
                                <div class="notif-text">
                                    <div>${displayName}</div>
                                    <div class="notif-status" style="color:${statusColor};">${statusText}</div>
                                </div>
                                <i class="fas fa-chevron-right notif-arrow"></i>
                            </div>
                        `;
                    });
                    html += '</div>';
                });

                notificationList.innerHTML = html;
            }
        }

        // Collapse / expand one project in the overdue reports list (collapsed by default, open state is remembered)
        window.toggleNotifGroup = function (head) {
            const body = head.nextElementSibling;
            if (!body) return;
            const name = decodeURIComponent(head.getAttribute('data-pn') || '');
            const open = !body.classList.contains('open');
            body.classList.toggle('open', open);
            head.classList.toggle('open', open);
            window._notifOpen = window._notifOpen || new Set();
            if (open) window._notifOpen.add(name); else window._notifOpen.delete(name);
        };

        function redirectToProjectTable(projectName, tabName) {
            document.getElementById('notification-dropdown').classList.add('hidden');
            
            changeTab(tabName);
            
            setTimeout(() => {
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.value = projectName;
                    if (typeof filterProjects === 'function') {
                        filterProjects();
                    }
                }
                
                showToast(`Viewing "${projectName}" in ${getTabLabel(tabName)}`, 'info');
            }, 100);
        }
        
        function getTabLabel(tabName) {
            const labels = {
                'kpm': 'KPM',
                'dole': 'DOLE Reportorial',
                'emb': 'EMB Reportorial',
                'env-monthly-report': 'ENVI Reportorial',
                'got-monitoring': 'GOT Monitoring',
                'esh-calendar-drills': 'ESH Calendar & Drills'
            };
            return labels[tabName] || tabName;
        }

        function toggleSettingsDropdown() {
            const dropdown = document.getElementById('settings-dropdown-menu');
            dropdown.classList.toggle('hidden');
            
            updateSettingsThemeDisplay();
            
            if (!dropdown.classList.contains('hidden')) {
                setTimeout(() => {
                    document.addEventListener('click', closeSettingsDropdownOnClickOutside);
                }, 0);
            }
        }

        function closeSettingsDropdownOnClickOutside(e) {
            const dropdown = document.getElementById('settings-dropdown-menu');
            const btn = document.getElementById('settings-dropdown-btn');
            
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeSettingsDropdownOnClickOutside);
            }
        }

        function updateSettingsThemeDisplay() {
            // Label and icon stay fixed; the switch (CSS, body.dark-mode) shows the state.
            const icon = document.getElementById('settings-theme-icon');
            const text = document.getElementById('settings-theme-text');
            if (icon) icon.className = 'fas fa-moon';
            if (text) text.textContent = 'Dark Mode';
        }

        function toggleDarkModeFromMenu() {
            toggleDarkMode();
            updateSettingsThemeDisplay();
        }

        function openSettingsTab() {
            document.getElementById('settings-dropdown-menu').classList.add('hidden');
            changeTab('settings');
        }

        function handleLogoutFromMenu() {
            document.getElementById('settings-dropdown-menu').classList.add('hidden');
            handleLogout();
        }

        function updateYearDisplay() {
            const yearSelectorContainer = document.querySelector('.year-selector-container');
            if (yearSelectorContainer) {
                if (!state.isAdmin) {
                    yearSelectorContainer.style.pointerEvents = 'none';
                    yearSelectorContainer.title = '';
                    const _btn = document.getElementById('year-selector-btn');
                    if (_btn) {
                        _btn.style.cursor = 'default';
                        _btn.style.background = 'transparent';
                        _btn.style.border = '1px solid rgba(255,255,255,0.3)';
                        _btn.style.boxShadow = 'none';
                    }
                } else {
                    yearSelectorContainer.style.pointerEvents = '';
                    yearSelectorContainer.title = 'Select Year';
                    const _btn = document.getElementById('year-selector-btn');
                    if (_btn) {
                        _btn.style.cursor = '';
                        _btn.style.background = '';
                        _btn.style.border = '';
                        _btn.style.boxShadow = '';
                    }
                }
            }

            const yearBtn = document.getElementById('year-selector-btn');
            if (yearBtn) {
                yearBtn.title = state.isAdmin ? 'Select Year' : '';
                const label = document.getElementById('year-selector-label');
                if (label) label.textContent = state.selectedYear;
            }
            
            const settingsCurrentYear = document.getElementById('settings-current-year');
            const targetYearDisplay = document.getElementById('target-year-display');
            const exportYearDisplay = document.getElementById('export-year-display');
            
            if (settingsCurrentYear) settingsCurrentYear.textContent = state.selectedYear;
            if (targetYearDisplay) targetYearDisplay.textContent = state.selectedYear;
            if (exportYearDisplay) exportYearDisplay.textContent = state.selectedYear;
            const footerCopyrightYear = document.getElementById('footer-copyright-year');
            if (footerCopyrightYear) footerCopyrightYear.textContent = state.selectedYear;
            
            const sourceYearSelect = document.getElementById('source-year-select');
            if (sourceYearSelect) {
                sourceYearSelect.innerHTML = '<option value="">Select source year...</option>';
                const otherYears = availableYears.filter(y => y !== state.selectedYear).sort((a, b) => b - a);
                otherYears.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    sourceYearSelect.appendChild(option);
                });
            }
        }

        // ── Dynamic Login Greeting ──────────────────────────────────────────
        function setLoginGreeting() {
            const el = document.getElementById('login-greeting-text');
            if (!el) return;
            const h = new Date().getHours();
            let emoji, word, rest;
            if      (h >= 5  && h < 12) { emoji = '☕';  word = 'Good';    rest = ' morning!';   }
            else if (h >= 12 && h < 13) { emoji = '🌞'; word = 'Good';    rest = ' noon!';      }
            else if (h >= 13 && h < 18) { emoji = '⛅'; word = 'Good';    rest = ' afternoon!'; }
            else if (h >= 18 && h < 20) { emoji = '🌙';  word = 'Good';    rest = ' evening!';   }
            else if (h >= 20 && h < 24) { emoji = '🌛';  word = 'Good';    rest = ' night!';     }
            else                         { emoji = '🦉';  word = 'Working'; rest = ' late?';      }
            el.innerHTML = emoji + ' <span class="accent">' + word + '</span>' + rest;
        }
        setLoginGreeting();
        // ────────────────────────────────────────────────────────────────────

        const _REMEMBER_EMAIL_KEY = 'esh_remember_email';

        function rememberEmailLoad() {
            const saved = localStorage.getItem(_REMEMBER_EMAIL_KEY);
            if (!saved) return;
            function _fill() {
                const emailInput = document.getElementById('login-user');
                if (emailInput) {
                    emailInput.value = saved;
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                const cb = document.getElementById('login-remember');
                if (cb) cb.checked = true;
            }
            _fill();
            setTimeout(_fill, 200);
        }

        function rememberEmailSave(email) {
            if (email) localStorage.setItem(_REMEMBER_EMAIL_KEY, email);
        }
