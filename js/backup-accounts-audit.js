
let backupManager = {
    backups: [],
    autoSaveInterval: null,
    maxBackups: 10,
    autoSaveFrequency: 300000, // 5 minutes in milliseconds

    _storageKey() {
        if (!state.currentUser?.email) return null;
        return 'esh_backups_' + state.currentUser.email.replace(/[^a-zA-Z0-9@._-]/g, '_');
    },

    init() {
        // Only run backup system for admin accounts
        if (!UserAccounts.isAdmin(state.currentUser?.email)) {
            return;
        }
        this.loadBackupsFromStorage();
        this.startAutoSave();
    },

    loadBackupsFromStorage() {
        const key = this._storageKey();
        if (!key) { this.backups = []; return; }
        try {
            const saved = localStorage.getItem(key);
            const parsed = saved ? JSON.parse(saved) : [];
            this.backups = parsed.filter(b => b.email === state.currentUser?.email);
        } catch(e) {
            this.backups = [];
        }
    },

    saveBackupsToStorage() {
        const key = this._storageKey();
        if (!key) return;
        const ownBackups = this.backups.filter(b => b.email === state.currentUser?.email);
        localStorage.setItem(key, JSON.stringify(ownBackups));
    },

    createBackup(manual = false) {
        if (!state.currentUser) return false;

        this.loadBackupsFromStorage();

        const backup = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            email: state.currentUser.email,  // Always tag with owner
            projects: JSON.parse(JSON.stringify(state.projects)),
            manual: manual,
            size: JSON.stringify(state.projects).length
        };

        this.backups.unshift(backup);

        if (this.backups.length > this.maxBackups) {
            this.backups = this.backups.slice(0, this.maxBackups);
        }

        this.saveBackupsToStorage();
        return backup;
    },

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (state.isLoggedIn && state.currentUser) {
                this.loadBackupsFromStorage(); // Always reload for current user first
                this.createBackup(false);
                // Auto-save to Firebase disabled — Save button only.
                // Local backup still created every 5 minutes for safety.
            }
        }, this.autoSaveFrequency);
    },

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
    },

    getBackupsForUser(email) {
        if (!state.currentUser || state.currentUser.email !== email) return [];
        this.loadBackupsFromStorage();
        return this.backups.filter(b => b.email === email);
    },

    restoreBackup(backupId) {
        if (!state.currentUser) return false;
        this.loadBackupsFromStorage();

        const backup = this.backups.find(b => b.id === backupId && b.email === state.currentUser.email);
        if (!backup) {
            console.error('Backup not found or does not belong to current user');
            return false;
        }

        state.projects = JSON.parse(JSON.stringify(backup.projects));
        state.filteredProjects = [...state.projects];
        saveUserData(state.currentUser.email);
        render();
        return true;
    },

    deleteBackup(backupId) {
        if (!state.currentUser) return false;
        this.loadBackupsFromStorage();

        const backup = this.backups.find(b => b.id === backupId);
        if (!backup || backup.email !== state.currentUser.email) {
            console.error('Cannot delete: backup not found or belongs to another account');
            return false;
        }

        this.backups = this.backups.filter(b => b.id !== backupId);
        this.saveBackupsToStorage();
        return true;
    },

    exportBackup(backupId) {
        if (!state.currentUser) return false;
        this.loadBackupsFromStorage();

        const backup = this.backups.find(b => b.id === backupId && b.email === state.currentUser.email);
        if (!backup) return false;

        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `esh_backup_${backup.timestamp.split('T')[0]}_${state.currentUser.email.split('@')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    },

    importBackup(file) {
        if (!state.currentUser) return Promise.resolve(false);
        const currentEmail = state.currentUser.email;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    if (backup.projects && Array.isArray(backup.projects)) {
                        if (backup.email && backup.email !== currentEmail) {
                            console.error('Import rejected: backup belongs to a different account:', backup.email);
                            resolve('wrong_account');
                            return;
                        }
                        state.projects = backup.projects;
                        state.filteredProjects = [...state.projects];
                        saveUserData(currentEmail);
                        this.createBackup(true); // Create a restore-point backup
                        render();
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } catch (error) {
                    console.error('Error importing backup:', error);
                    resolve(false);
                }
            };
            reader.readAsText(file);
        });
    },

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
};

function showBackupRecoveryUI() {
    backupManager.loadBackupsFromStorage();
    const userBackups = backupManager.getBackupsForUser(state.currentUser.email);
    const lastBackup = userBackups[0];
    const lastBackupTime = lastBackup ? backupManager.formatDate(lastBackup.timestamp) : 'Never';
    
    const showAllBackups = window.showAllBackupsFlag === true;
    const displayBackups = showAllBackups ? userBackups : userBackups.slice(0, 3);
    const hasMore = userBackups.length > 3;

    let html = `
        <div class="backup-section">
            <h4><i class="fas fa-shield-alt"></i> Backup & Recovery</h4>
            
            <div class="backup-info">
                <strong>Last Auto-Backup:</strong> ${lastBackupTime}<br>
                <strong>Total Backups:</strong> ${userBackups.length} / ${backupManager.maxBackups}<br>
                <strong>Auto-save Frequency:</strong> Every 5 minutes
            </div>

            <div class="backup-buttons">
                <button class="btn btn-primary" onclick="createManualBackup()">
                    <i class="fas fa-download"></i> Create Manual Backup
                </button>
                <button class="btn btn-primary" onclick="exportCurrentBackup()">
                    <i class="fas fa-file-export"></i> Export Backup
                </button>
                <button class="btn btn-primary" onclick="document.getElementById('import-backup-input').click()">
                    <i class="fas fa-file-import"></i> Import Backup
                </button>
            </div>

            <input type="file" id="import-backup-input" accept=".json" style="display:none;" onchange="importBackupFile(this)">

            <div id="backup-status-message"></div>

            <div class="backup-list">
                <h5 style="color: #1b5e20; margin-top: 20px; margin-bottom: 10px;">
                    <i class="fas fa-history"></i> Backup History
                </h5>
                ${userBackups.length > 0 ? displayBackups.map(backup => `
                    <div class="backup-item">
                        <div class="backup-item-info">
                            <div class="backup-item-date">
                                ${backup.manual ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'} 
                                ${backupManager.formatDate(backup.timestamp)}
                            </div>
                            <div class="backup-item-size">
                                ${backupManager.formatSize(backup.size)} • 
                                ${backup.projects.length} projects
                            </div>
                        </div>
                        <div class="backup-item-actions">
                            <button class="backup-item-btn backup-item-btn-restore" onclick="restoreBackupConfirm(${backup.id})">
                                <i class="fas fa-undo"></i> Restore
                            </button>
                            <button class="backup-item-btn backup-item-btn-delete" onclick="deleteBackupConfirm(${backup.id})">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `).join('') : '<p style="color: var(--text-secondary); font-size: 0.85rem;">No backups available</p>'}
                
                ${hasMore && !showAllBackups ? `
                    <button class="btn btn-outline" onclick="toggleShowAllBackups()" style="width: 100%; margin-top: 15px; padding: 10px;">
                        <i class="fas fa-chevron-down"></i> See More (${userBackups.length - 3} more backups)
                    </button>
                ` : ''}
                
                ${showAllBackups && hasMore ? `
                    <button class="btn btn-outline" onclick="toggleShowAllBackups()" style="width: 100%; margin-top: 15px; padding: 10px;">
                        <i class="fas fa-chevron-up"></i> Show Less
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    return html;
}

function toggleShowAllBackups() {
    window.showAllBackupsFlag = !window.showAllBackupsFlag;
    const backupSection = document.getElementById('backup-recovery-section');
    if (backupSection) backupSection.innerHTML = showBackupRecoveryUI();
}

function createManualBackup() {
    const backup = backupManager.createBackup(true);
    if (backup) {
        showBackupStatus('Backup created successfully!', 'success');
        setTimeout(() => {
            changeTab('settings');
        }, 500);
    }
}

function exportCurrentBackup() {
    const userBackups = backupManager.getBackupsForUser(state.currentUser.email);
    if (userBackups.length === 0) {
        showBackupStatus('No backups to export', 'error');
        return;
    }
    backupManager.exportBackup(userBackups[0].id);
    showBackupStatus('Backup exported successfully!', 'success');
}

function importBackupFile(input) {
    const file = input.files[0];
    if (!file) return;

    backupManager.importBackup(file).then(result => {
        if (result === true) {
            showBackupStatus('Backup imported and restored successfully!', 'success');
            setTimeout(() => { changeTab('settings'); }, 500);
        } else if (result === 'wrong_account') {
            showBackupStatus('Import failed: This backup file belongs to a different account. You can only import your own backup files.', 'error');
        } else {
            showBackupStatus('Invalid backup file format', 'error');
        }
    });

    input.value = '';
}

function restoreBackupConfirm(backupId) {
    const backup = backupManager.backups.find(b => b.id === backupId);
    if (!backup) return;

    showModernDialog(
        'Restore Backup',
        `Restore data from ${backupManager.formatDate(backup.timestamp)}? Your current data will be replaced.`,
        false
    ).then(confirmed => {
        if (confirmed) {
            if (backupManager.restoreBackup(backupId)) {
                showBackupStatus('Backup restored successfully!', 'success');
                setTimeout(() => {
                    changeTab('overall');
                }, 500);
            } else {
                showBackupStatus('Failed to restore backup', 'error');
            }
        }
    });
}

function deleteBackupConfirm(backupId) {
    const backup = backupManager.backups.find(b => b.id === backupId);
    if (!backup) return;

    showModernDialog(
        'Delete Backup',
        `Delete backup from ${backupManager.formatDate(backup.timestamp)}? This cannot be undone.`,
        true
    ).then(confirmed => {
        if (confirmed) {
            if (backupManager.deleteBackup(backupId)) {
                showBackupStatus('Backup deleted successfully!', 'success');
                setTimeout(() => {
                    changeTab('settings');
                }, 500);
            } else {
                showBackupStatus('Failed to delete backup', 'error');
            }
        }
    });
}

function showBackupStatus(message, type) {
    const statusDiv = document.getElementById('backup-status-message');
    if (!statusDiv) return;

    statusDiv.innerHTML = `<div class="backup-status ${type}">${message}</div>`;
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 4000);
}

async function saveToFirebaseMain() {
    if (state.userRole === 'manager' || state.userRole === 'doc_controller') { showToast('Manager accounts are view-only. Cannot save data.', 'warning'); return; }
    showSyncPill('syncing', 'Syncing to cloud...');
    const success = await saveToFirebase();
    if (success) {
        markSyncComplete();
    } else {
        markPendingSync();
        showToast('Sync failed. Check your connection.', 'error', 4000);
    }
}
window.saveToFirebaseMain = saveToFirebaseMain;

function pGlobalEdit() {
    if (state.userRole === 'manager' || state.userRole === 'doc_controller') { showToast('Manager accounts are view-only.', 'warning'); return; }
    const container = document.getElementById('p-cards-container');
    if (!container) return;
    const rows = container.querySelectorAll('tr[id^="p-row-"]');
    let anyEditable = false;
    rows.forEach(row => {
        const editBtn = row.querySelector('.p-edit-btn');
        if (editBtn) {
            const match = editBtn.id.match(/p-edit-btn-(\d+)/);
            if (match) { openEditPersonnelModal(parseInt(match[1])); anyEditable = true; }
        }
    });
    const editBtn = document.getElementById('p-global-edit-btn');
    const saveBtn = document.getElementById('p-global-save-btn');
    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = '';
    // Show Add Personnel button now that edit mode is active
    const pAddBtn = document.getElementById('p-add-personnel-btn');
    if (pAddBtn && state.userRole !== 'manager') pAddBtn.style.display = 'flex';
    if (!anyEditable) showToast('No personnel rows to edit.', 'info');
}
window.pGlobalEdit = pGlobalEdit;

function pGlobalSave() {
    const rows = document.querySelectorAll('.p-project-card tr.p-editing');
    rows.forEach(row => {
        const saveBtn = row.querySelector('.p-save-btn');
        if (saveBtn) {
            const match = saveBtn.id.match(/p-save-btn-(\d+)/);
            if (match) savePersonnel(parseInt(match[1]));
        }
    });
    const editBtn = document.getElementById('p-global-edit-btn');
    const saveBtn = document.getElementById('p-global-save-btn');
    if (editBtn) editBtn.style.display = '';
    if (saveBtn) saveBtn.style.display = 'none';
    // Hide Add Personnel button when exiting edit mode
    const pAddBtn = document.getElementById('p-add-personnel-btn');
    if (pAddBtn) pAddBtn.style.display = 'none';
    showToast('All personnel changes saved.', 'success');
}
window.pGlobalSave = pGlobalSave;

const RBAC_ACCOUNTS = [
    { uid: 'fUnXsvKnRYMpuySRbeVYJk7TO452', email: 'esh@scic.com.ph',      role: 'admin',          displayName: 'ESH Admin',                      region: 'CORPORATE',           module_access: [] },
    { uid: 'hcnqoDM72cQhesbmJpM9SMMGsQb2', email: 'esh@ncr.com.ph',       role: 'superintendent', displayName: 'NCR Superintendent',             region: 'NCR',                 module_access: [] },
    { uid: 'ZkaQ1QiZQSPKfO1VbFk5uW5eldI2', email: 'esh@north.com.ph',     role: 'superintendent', displayName: 'North Luzon Superintendent',     region: 'NORTH LUZON',         module_access: [] },
    { uid: 'TNR2IlOdLreZNM4AXn7ejTPVXLZ2', email: 'esh@south.com.ph',     role: 'superintendent', displayName: 'South Luzon Superintendent',     region: 'SOUTH LUZON',         module_access: [] },
    { uid: 'RsOVQnzUh5bDcZCYRrE0I6P2ZCF2', email: 'esh@vismin.com.ph',   role: 'superintendent', displayName: 'Visayas & Mindanao Superintendent', region: 'VISAYAS & MINDANAO', module_access: [] },
    { uid: 'XZjjCJnanac8B9r6pVUJBdEbvk93', email: 'esh@ncrpco.com.ph',   role: 'pco',            displayName: 'NCR PCO',                        region: 'NCR',                 module_access: ['permits','emb','env-monitoring','env-monthly-report','esh-calendar-env'] },
    { uid: 'vAx6TARdxtfIQsNpNwWLO2YWh622', email: 'esh@northpco.com.ph', role: 'pco',            displayName: 'North Luzon PCO',               region: 'NORTH LUZON',         module_access: ['permits','emb','env-monitoring','env-monthly-report','esh-calendar-env'] },
    { uid: 'm6opwibuujUCci63nUNb6R6Vwse2', email: 'esh@southpco.com.ph', role: 'pco',            displayName: 'South Luzon PCO',               region: 'SOUTH LUZON',         module_access: ['permits','emb','env-monitoring','env-monthly-report','esh-calendar-env'] },
    { uid: 'TH12T1L0G2UYrP5iSwuWL7aLHp93', email: 'esh@visminpco.com.ph',role: 'pco',           displayName: 'Visayas & Mindanao PCO',         region: 'VISAYAS & MINDANAO',  module_access: ['permits','emb','env-monitoring','env-monthly-report','esh-calendar-env'] },
    { uid: 'RflE3UOhZJM824EqAkB5KuVA3bu1',  email: 'esh@tgm.com.ph',      role: 'manager',       displayName: 'TGM Manager',                   region: 'ALL',                 module_access: [] },
    { uid: 'u8r8wlD0thb5hAR9HwJ0vSQZC8u1',     email: 'esh@mab.com.ph',      role: 'manager',       displayName: 'MAB Manager',                   region: 'ALL',                 module_access: [] },
    { uid: '3d8uwAYjNPSCcH9Xbu1fsCiuJK13', email: 'esh@lmp.com.ph',      role: 'manager',       displayName: 'LMP Manager',                   region: 'ALL',                 module_access: [] },
    { uid: 'ljciHhNmmGQnriHwbwgeb8Yi1V63',    email: 'esh@wda.com.ph',      role: 'admin',      displayName: 'WDA System Admin',              region: 'CORPORATE',           module_access: [] },
    { uid: 'WYcn1vEPoRTrq8rbrGBFUB9x4H03',    email: 'esh@corpdc.com.ph',   role: 'admin',          displayName: 'Corporate Document Controller', region: 'CORPORATE',      module_access: [] },
    { uid: 'b1uiTykyjhN60Il11Inmv9e6h252', email: 'esh@cbmganda.com.ph', role: 'envi_head',     displayName: 'Environmental Head (Overall)',  region: 'PLANT OPERATIONS',    module_access: ['permits','emb','env-monitoring','env-monthly-report','nov-env','esh-calendar-env'] },
    { uid: 'EW3RstAsVwNxMHHCNHdV3zWGMtt2',  email: 'esh@health.com.ph',   role: 'corp_nurse',    displayName: 'Corporate Nurse',               region: 'ALL',                 module_access: [] },
];

async function rbacDeployAll() {
    if (!state.isAdmin) {
        showToast('Admin access required to deploy roles.', 'error');
        return;
    }
    if (!window.firebaseDb) {
        showToast('Firebase not ready. Try again in a moment.', 'error');
        return;
    }

    const btn = document.getElementById('rbac-deploy-btn');
    const logEl = document.getElementById('rbac-log');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deploying…';
    logEl.innerHTML = '';

    function rbacLog(msg, type) {
        const colors = { success: '#2e7d32', error: '#c62828', info: '#888' };
        const div = document.createElement('div');
        div.style.cssText = `color:${colors[type]||'#888'};margin:2px 0;`;
        div.textContent = msg;
        logEl.appendChild(div);
        logEl.scrollTop = logEl.scrollHeight;
    }

    function setStatus(uid, html) {
        const el = document.getElementById('rbac-st-' + uid);
        if (el) el.innerHTML = html;
    }

    let ok = 0, fail = 0;
    rbacLog('// Starting deployment of ' + RBAC_ACCOUNTS.length + ' role documents…', 'info');

    for (const acct of RBAC_ACCOUNTS) {
        setStatus(acct.uid, '<i class="fas fa-spinner fa-spin rbac-spin"></i>');
        try {
            const docRef = window.firebase.doc(window.firebaseDb, 'roles', acct.uid);
            await window.firebase.setDoc(docRef, {
                role:          acct.role,
                displayName:   acct.displayName,
                region:        acct.region,
                module_access: acct.module_access,
                email:         acct.email,
                pendingUid:    false,
                deployedBy:    state.currentUser?.email || 'admin',
                deployedAt:    new Date().toISOString()
            });
            setStatus(acct.uid, '<span class="rbac-ok"><i class="fas fa-circle-check"></i> OK</span>');
            rbacLog(`✓ ${acct.email} → ${acct.role.toUpperCase()} [${acct.region}]`, 'success');
            ok++;
        } catch (err) {
            setStatus(acct.uid, '<span class="rbac-err"><i class="fas fa-circle-xmark"></i> FAIL</span>');
            rbacLog(`✗ ${acct.email} — ${err.message}`, 'error');
            fail++;
        }
        await new Promise(r => setTimeout(r, 250));
    }

    rbacLog(`// Done — ${ok} deployed, ${fail} failed.`, 'info');

    if (fail === 0) {
        btn.innerHTML = '<i class="fas fa-check-circle"></i> All Roles Deployed!';
        btn.style.background = '#43a047';
        btn.style.color = 'white';
        const statusEl = document.getElementById('rbac-deploy-status');
        if (statusEl) statusEl.style.display = 'flex';
        showToast(`All ${ok} role documents deployed to Firestore!`, 'success', 5000);

        AuditLogger.log('RBAC_ROLES_DEPLOYED', { deployedCount: ok, by: state.currentUser?.email });
    } else {
        btn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${ok} OK, ${fail} Failed`;
        btn.style.background = '#f57f17';
        btn.style.color = '#1b5e20';
        showToast(`${fail} role(s) failed to deploy. Check the log.`, 'warning', 5000);
    }

    btn.disabled = false;
}
window.rbacDeployAll = rbacDeployAll;


function updateAdminStats() {
    const devices = new Set(
        state.loginLogbook.map(entry => `${entry.ip}_${entry.userAgent}`)
    );
    const totalUsersEl = document.getElementById('admin-total-users');
    if (totalUsersEl) {
        totalUsersEl.textContent = devices.size;
        const label = totalUsersEl.parentElement?.parentElement?.querySelector('.stat-secondary');
        if (label) label.textContent = 'Unique Devices';
    }

    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const logins24h = state.loginLogbook.filter(entry =>
        entry.action === 'LOGIN' && new Date(entry.timestamp).getTime() > oneDayAgo
    ).length;
    const logins24hEl = document.getElementById('admin-logins-24h');
    if (logins24hEl) logins24hEl.textContent = logins24h;

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const uniqueIps = new Set(
        state.loginLogbook
            .filter(entry => new Date(entry.timestamp).getTime() > sevenDaysAgo)
            .map(entry => entry.ip)
    );
    const uniqueIpsEl = document.getElementById('admin-unique-ips');
    if (uniqueIpsEl) uniqueIpsEl.textContent = uniqueIps.size;

    const totalAuditsEl = document.getElementById('admin-total-audits');
    if (totalAuditsEl) totalAuditsEl.textContent = state.auditLog.length;
}

function renderLogbook() {
    const container = document.getElementById('logbook-container');
    if (!container) return; // guard: element not yet in DOM
    const logs = state.loginLogbook.filter(entry => {
        if (!entry.email) return false;
        const _ua = window.UserAccounts ? window.UserAccounts.getUserInfo(entry.email) : {role:'admin'};
        return _ua.role === 'superintendent' || _ua.role === 'pco';
    });
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                <p style="font-size: 1.1rem; font-weight: 600;">No login records yet</p>
                <p style="font-size: 0.9rem;">Login history will appear here</p>
            </div>
        `;
        return;
    }
    
    const displayLogs = logs.slice(0, 10);
    
    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; table-layout: fixed;">
            <thead>
                <tr style="background: var(--bg-body);">
                    <th style="width:12%; padding: 9px 14px; text-align: left;   font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);">Timestamp</th>
                    <th style="width:8%;  padding: 9px 14px; text-align: center; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);">Action</th>
                    <th style="width:17%; padding: 9px 14px; text-align: center; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);">User</th>
                    <th style="width:21%; padding: 9px 14px; text-align: center; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);">IP Address</th>
                    <th style="width:16%; padding: 9px 14px; text-align: center; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);">Location</th>
                    <th style="width:14%; padding: 9px 14px; text-align: center; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);">Device</th>
                    <th style="width:12%; padding: 9px 14px; text-align: center; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);">Browser</th>
                </tr>
            </thead>
            <tbody id="logbook-tbody">
                ${displayLogs.map((entry, index) => `
                    <tr style="border-bottom: 1px solid var(--border-color); background: ${index % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-body)'};">
                        <td style="padding: 9px 14px; white-space: nowrap; text-align: left; overflow: hidden;">
                            <div style="font-weight: 600; font-size: 0.75rem; color: var(--text-primary);">${new Date(entry.timestamp).toLocaleDateString()}</div>
                            <div style="font-size: 0.68rem; color: var(--text-secondary);">${new Date(entry.timestamp).toLocaleTimeString()}</div>
                        </td>
                        <td style="padding: 9px 14px; text-align: center; overflow: hidden;">
                            <span style="padding: 2px 8px; border-radius: 3px; font-weight: 600; font-size: 0.65rem; letter-spacing: 0.04em; ${entry.action === 'LOGIN' ? 'background: #e8f5e9; color: #2e7d32;' : 'background: #fce4ec; color: #c62828;'}">
                                ${entry.action === 'LOGIN' ? 'LOGIN' : 'LOGOUT'}
                            </span>
                        </td>
                        <td style="padding: 9px 14px; text-align: center; overflow: hidden;">
                            <div style="font-weight: 600; font-size: 0.75rem; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${entry.displayName || 'Unknown'}</div>
                            <div style="font-size: 0.68rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${entry.email}</div>
                        </td>
                        <td style="padding: 9px 14px; text-align: center; overflow: hidden;">
                            <span style="font-family: monospace; font-size: 0.68rem; color: var(--text-secondary); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${entry.ip || 'Unknown'}">${entry.ip || 'Unknown'}</span>
                        </td>
                        <td style="padding: 9px 14px; text-align: center;">
                            <div style="display: inline-flex; align-items: center; gap: 5px;">
                                <span>${getCountryFlag(entry.country)}</span>
                                <div style="text-align: left;">
                                    <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-primary);">${entry.city || 'Unknown'}</div>
                                    <div style="font-size: 0.68rem; color: var(--text-secondary);">${entry.country || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td style="padding: 9px 14px; text-align: center; font-size: 0.73rem; color: var(--text-secondary);">${entry.device || '-'} · ${entry.os || '-'}</td>
                        <td style="padding: 9px 14px; text-align: center; font-size: 0.73rem; color: var(--text-secondary);">${entry.browser || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${logs.length > 10 ? `
            <div style="padding: 10px 14px; text-align: center; background: var(--bg-body); border-top: 1px solid var(--border-color);">
                <span style="font-size:0.72rem;color:var(--text-secondary);"><i class="fas fa-info-circle"></i> Showing latest 10 entries. <a href="#" onclick="exportLogbook(); return false;" style="color: #2e7d32; text-decoration: none; font-weight: 600;">Export All →</a></span>
            </div>
        ` : ''}
    `;
}

function getCountryFlag(country) {
    const flags = {
        'Philippines': '🇵🇭',
        'United States': '🇺🇸',
        'Japan': '🇯🇵',
        'Singapore': '🇸🇬',
        'China': '🇨🇳',
        'South Korea': '🇰🇷',
        'Australia': '🇦🇺',
        'United Kingdom': '🇬🇧',
        'Canada': '🇨🇦',
        'Germany': '🇩🇪'
    };
    return flags[country] || '🌐';
}

async function renderUserManagement() {
    const container = document.getElementById('user-management-container');
    if (!container) return;
    const users = await AdminSystem.getAllUsers();
    
    if (users.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-users-slash" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                <p>No users found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="adm-users-wrap">
            ${users.map(user => `
                <div class="adm-user-card">
                    <div class="adm-user-avatar">${(user.displayName || user.email).charAt(0).toUpperCase()}</div>
                    <div class="adm-user-info">
                        <div class="adm-user-name">${user.displayName}</div>
                        <div class="adm-user-email">${user.email}</div>
                        <div class="adm-user-meta">
                            <span class="adm-meta-tag">${user.loginCount} logins</span>
                            <span class="adm-meta-tag">${new Date(user.lastLogin).toLocaleDateString()}</span>
                        </div>
                    </div>
                    ${AdminSystem.isAdmin(user.email)
                        ? `<span class="adm-admin-tag">ADMIN</span>`
                        : UserAccounts.isPCO(user.email)
                            ? `<span class="adm-admin-tag" style="background:#00ACC1;">PCO</span>`
                            : `<button class="adm-revoke-btn" onclick="revokeUserAccess('${user.email}')"><i class="fas fa-ban"></i> Revoke</button>`
                    }
                </div>
            `).join('')}
        </div>
    `;
}

async function loadLogbookFromFirebase() {
    try {
        const logbookRef = window.firebase.dbRef(window.firebaseRealtimeDb, 'login-logbook');
        await Promise.race([
            new Promise((resolve) => {
                window.firebase.onValue(logbookRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const entries = Object.values(data);
                        entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        state.loginLogbook = entries;
                        LoginLogbook.saveToStorage();
                        // Always refresh UI when Firebase data arrives — device-agnostic
                        updateAdminStats();
                        renderLogbook();
                        renderUserManagement();
                    }
                    resolve();
                }); // removed onlyOnce — now real-time!
            }),
            new Promise((resolve) => setTimeout(resolve, 10000)) // 10s timeout
        ]);
    } catch (e) {
    }
}

function exportLogbook() {
    const csv = LoginLogbook.exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `login_logbook_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('Logbook exported successfully!', 'success');
    AuditLogger.log('LOGBOOK_EXPORTED', { admin: state.currentUser.email });
}

async function revokeUserAccess(email) {
    const confirmed = await showModernDialog(
        'Revoke Access',
        `Are you sure you want to revoke access for <strong>${email}</strong>?<br><br>This will prevent the user from logging in.`,
        true
    );
    
    if (confirmed) {
        await AdminSystem.revokeAccess(email);
        renderUserManagement();
    }
}

        const REGIONS = ["CORPORATE", "PLANT OPERATIONS", "NCR", "SOUTH LUZON", "NORTH LUZON", "VISAYAS & MINDANAO"];
        const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
       const SCHEMA = {
    'exposures': ["Total Manpower", "Total Exposed Manhour", "Total Exposed Man-hour to date", "No. of Days w/o LTA"],
    'rates': ["LTIR","TRIR","SEVERITY RATE"],
    'medical': ["Medical Treatment","First Aid","LTA","Fatality","High-Potential incident", "Dangerous Occurrences", "Days Lost/Charged"],
    'nov': ["OSH Internal Issues", "OSH External Issues"],
    'activities': ["No. of ESH Committee Conducted", "No. of ESH inspection", "No. of Identified Near-Miss", "Drills Conducted", "Training Conducted"],
    'kpm': ["KPM&I"],
    'audit': ["Score Implementation", "Documentation and Compliance"],
    'dole': ["WAIR","RSO", "MOM", "AEDR", "AMR"],
    'dole_annual': ["AEDR", "AMR"],
    'permits': ["ECC", "Company Registration System (CRS)", "CNC", "Certificate of Accreditation (DENR-EMB)", "Certificate of Accreditation (LLDA)", "LLDA Clearance", "Permit to Transport (PTT)", "Permit to Operate (PTO)", "Discharge Permit (DP)", "Hazardous Waste Generator's ID", "Permit to Transport (Haz Waste)", "Permit to Transport (Logs)", "Tree Cutting Permit (STCP or S/PLTP)", "Permit to Cut Coconut Tree", "NWRB Water Permit"],
    'emb': ["SMR (Quarterly) - Submission Date", "SMR (Quarterly) - Reference No.", "CMR (Semi-Annual) - Submission Date", "CMR (Semi-Annual) - Reference No."],
    'cshp': ["CSHP Approval Date"],
    'reg': ["DOLE Certificate of Registration Date"],
    'doe': ["DOE Quarterly Report Submission Date"],
    'doe-permit': ["DOE Safety Officer Permit"],
    'env-monthly-report': ["Environmental Monthly Report (EMR)"],
    'tabulation': []
};

function fmtNum(val) {
    if (val === '' || val === null || val === undefined) return '';
    var n = parseFloat(val);
    if (isNaN(n)) return '';
    if (Number.isInteger(n)) return n.toLocaleString('en-US');
    return parseFloat(n.toFixed(4)).toLocaleString('en-US');
}

function numFmtInput(el, saveFn) {
    var cursorPos = el.selectionStart;
    var raw = el.value.replace(/,/g, '');

    var cleaned = raw.replace(/[^0-9.]/g, '');
    var dotIdx = cleaned.indexOf('.');
    if (dotIdx !== -1) {
        cleaned = cleaned.slice(0, dotIdx + 1) + cleaned.slice(dotIdx + 1).replace(/\./g, '');
    }

    if (cleaned !== raw) {
        el.value = cleaned;
    }

    if (cleaned === '' || cleaned === '.') {
        saveFn('');
        return;
    }

    var n = parseFloat(cleaned);
    if (isNaN(n)) { saveFn(''); return; }

    if (n < 0) {
        cleaned = '0';
        n = 0;
    }

    var parts = cleaned.split('.');
    var intPart = parseInt(parts[0] || '0', 10).toLocaleString('en-US');
    var formatted = parts.length > 1 ? intPart + '.' + parts[1] : intPart;

    var commasBefore = (el.value.slice(0, cursorPos).match(/,/g) || []).length;
    el.value = formatted;
    var commasAfter = (formatted.slice(0, cursorPos).match(/,/g) || []).length;
    var newCursor = cursorPos + (commasAfter - commasBefore);
    el.setSelectionRange(newCursor, newCursor);

    saveFn(cleaned);
}

function applyNumFmtToInputs() {
    document.querySelectorAll('input[data-num]').forEach(function(el) {
        if (el.value && el.value !== '') {
            var raw = el.value.replace(/,/g, '');
            var n = parseFloat(raw);
            if (!isNaN(n) && n >= 0) {
                var parts = raw.split('.');
                var intPart = parseInt(parts[0] || '0', 10).toLocaleString('en-US');
                el.value = parts.length > 1 ? intPart + '.' + parts[1] : intPart;
            }
        }
        if (!el._numFmtKeydownBound) {
            el._numFmtKeydownBound = true;
            el.addEventListener('keydown', function(e) {
                var allowed = [
                    'Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
                    'Home','End','Enter','Escape'
                ];
                if (allowed.includes(e.key)) return;
                if (e.ctrlKey || e.metaKey) return; // allow Ctrl+A, Ctrl+C, Ctrl+V etc.
                if (/^\d$/.test(e.key)) return;
                if (e.key === '.' && !this.value.includes('.')) return;
                e.preventDefault();
            });
        }
    });
}

        let state = {
            isLoggedIn: false,
            isEditing: false,
            currentTab: 'overall',
            currentUser: null,
            selectedYear: new Date().getFullYear(), // Default year - current year
            projects: [], // Currently displayed projects (filtered by year)
            masterProjects: [], // ALL projects from ALL years (loaded once)
            yearProjectCache: new Map(), // ISOLATED year-keyed project store: Map<year, projects[]>
            personnelData: [],
            incidentRateData: { recordableCases: 0, lostDays: 0, totalHours: 0 },
            filteredProjects: [],
            charts: {},
            darkMode: false,
            isDataMigrated: false, // Track if data has been migrated to year-based structure
            doePermitData: { permitNumber: '', validityDate: '' }, // NEW: DOE Safety Officer Permit
            auditLog: [], // NEW: Audit trail for all changes
            offlineQueue: [], // NEW: Queue for offline changes
            isOnline: navigator.onLine, // NEW: Online status
            isAdmin: false, // NEW: Admin role flag
            loginLogbook: [], // NEW: Login history with IP and location
            searchTerm: '', // NEW: Preserve search input
            regionFilter: '', // NEW: Preserve region filter
            statusFilter: '', // NEW: Preserve status filter
            userRole: null, // 'admin' or 'superintendent'
            userRegion: null, // 'ALL', 'NCR', 'NORTH LUZON', 'SOUTH LUZON', 'VISAYAS & MINDANAO'
            userColor: '#FF0000', // Color for user identification
            deviceFingerprint: null, // Unique device identifier
            activeUsers: {}, // Real-time presence tracking {userId: {status, activity, ...}}
            
            presenceListener: null, // Firebase listener for presence updates
            deviceListener: null, // Firebase listener for device updates
            complianceView: (new Date().getMonth() > 0 ? new Date().getMonth() : 12) // 0 = Overall, 1-12 = monthly; default to previous month (current month data incomplete)
        };

        window.DEBUG_MODE = true; // Set to false to disable debug logs
        
        const DeviceFingerprint = {
            async generate() {
                const components = {
                    canvas: await this.getCanvasFingerprint(),
                    webgl: this.getWebGLFingerprint(),
                    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    language: navigator.language,
                    platform: navigator.platform,
                    userAgent: navigator.userAgent,
                    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
                    deviceMemory: navigator.deviceMemory || 'unknown',
                    plugins: Array.from(navigator.plugins || []).map(p => p.name).join(','),
                    touchSupport: 'ontouchstart' in window
                };
                
                const fingerprint = await this.hashComponents(components);
                return fingerprint;
            },
            
            async getCanvasFingerprint() {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 200;
                    canvas.height = 50;
                    
                    ctx.textBaseline = 'top';
                    ctx.font = '14px Arial';
                    ctx.fillStyle = '#f60';
                    ctx.fillRect(125, 1, 62, 20);
                    ctx.fillStyle = '#069';
                    ctx.fillText('ESH Dashboard 🛡️', 2, 15);
                    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
                    ctx.fillText('Fingerprint Test', 4, 17);
                    
                    return canvas.toDataURL();
                } catch (e) {
                    return 'canvas-error';
                }
            },
            
            getWebGLFingerprint() {
                try {
                    const canvas = document.createElement('canvas');
                    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                    if (!gl) return 'no-webgl';
                    
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (!debugInfo) return 'no-debug-info';
                    
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    
                    return `${vendor}~${renderer}`;
                } catch (e) {
                    return 'webgl-error';
                }
            },
            
            async hashComponents(components) {
                const str = JSON.stringify(components);
                const encoder = new TextEncoder();
                const data = encoder.encode(str);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            },
            
            getPlatformInfo() {
                const ua = navigator.userAgent;
                let platform = 'Unknown';
                let browser = 'Unknown';
                
                if (ua.indexOf('Win') !== -1) platform = 'Windows';
                else if (ua.indexOf('Mac') !== -1) platform = 'MacOS';
                else if (ua.indexOf('Linux') !== -1) platform = 'Linux';
                else if (ua.indexOf('Android') !== -1) platform = 'Android';
                else if (ua.indexOf('iOS') !== -1 || ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) platform = 'iOS';
                
                if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
                else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
                else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
                else if (ua.indexOf('Edg') !== -1) browser = 'Edge';
                else if (ua.indexOf('MSIE') !== -1 || ua.indexOf('Trident') !== -1) browser = 'IE';
                
                return { platform, browser };
            }
        };
        
        const AuditLogger = {
            log(action, details = {}) {
                const entry = {
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    user: state.currentUser?.email || 'Unknown',
                    userName: state.currentUser?.displayName || 'Unknown User',
                    action: action,
                    details: details,
                    year: state.selectedYear
                };
                
                state.auditLog.unshift(entry); // Add to beginning
                
                if (state.auditLog.length > 500) {
                    state.auditLog = state.auditLog.slice(0, 500);
                }
                
                this.saveToStorage();
                
            },
            
            saveToStorage() {
                try {
                    localStorage.setItem('esh_audit_log', JSON.stringify(state.auditLog));
                } catch (e) {
                    if (e && e.name === 'QuotaExceededError') {
                        try {
                            if (state.auditLog && state.auditLog.length > 50) state.auditLog = state.auditLog.slice(-50);
                            localStorage.setItem('esh_audit_log', JSON.stringify(state.auditLog));
                        } catch(e2) {
                            try { localStorage.removeItem('esh_audit_log'); } catch(e3){}
                        }
                    }
                }
            },
            
            loadFromStorage() {
                try {
                    const saved = localStorage.getItem('esh_audit_log');
                    if (saved) {
                        state.auditLog = JSON.parse(saved);
                    }
                } catch (e) {
                    console.error('Failed to load audit log from localStorage:', e);
                }
            },
            
            
            getRecent(limit = 50) {
                return state.auditLog.slice(0, limit);
            },
            
            filterByAction(action) {
                return state.auditLog.filter(entry => entry.action === action);
            },
            
            filterByDateRange(startDate, endDate) {
                const start = new Date(startDate).getTime();
                const end = new Date(endDate).getTime();
                return state.auditLog.filter(entry => {
                    const timestamp = new Date(entry.timestamp).getTime();
                    return timestamp >= start && timestamp <= end;
                });
            },
            
            exportToCSV() {
                const headers = ['Timestamp', 'User', 'Action', 'Details', 'Year'];
                const rows = state.auditLog.map(entry => {
                    let detailsText = '';
                    if (Object.keys(entry.details).length > 0) {
                        const details = entry.details;
                        let parts = [];
                        
                        if (details.projectName)   parts.push(`Project: ${details.projectName}`);
                        if (details.email)          parts.push(`Email: ${details.email}`);
                        if (details.status)         parts.push(`Status: ${details.status}`);
                        if (details.year)           parts.push(`Year: ${details.year}`);
                        if (details.tab)            parts.push(`Tab: ${details.tab}`);
                        if (details.step !== undefined) parts.push(`Step: ${details.step}`);
                        if (details.totalSteps !== undefined) parts.push(`Total Steps: ${details.totalSteps}`);
                        if (details.remainingProjects !== undefined) parts.push(`Remaining: ${details.remainingProjects}`);
                        if (details.personnelName)  parts.push(`Personnel: ${details.personnelName}`);
                        if (details.fromProject)    parts.push(`From: ${details.fromProject}`);
                        if (details.fromRegion)     parts.push(`From Region: ${details.fromRegion}`);
                        if (details.toProject)      parts.push(`To: ${details.toProject}`);
                        if (details.toRegion)       parts.push(`To Region: ${details.toRegion}`);
                        if (details.initiatorRole)  parts.push(`Role: ${details.initiatorRole}`);
                        if (details.crossRegion)    parts.push(`Cross-Region: YES`);
                        
                        detailsText = parts.join('; ');
                    }
                    
                    return [
                        new Date(entry.timestamp).toLocaleString(),
                        entry.userName,
                        entry.action.replace(/_/g, ' '),
                        detailsText,
                        entry.year
                    ];
                });
                
                let csv = headers.join(',') + '\n';
                rows.forEach(row => {
                    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
                });
                
                return csv;
            }
        };
        
        AuditLogger.loadFromStorage();
        
        const LoginLogbook = {
            async logLogin(user) {
                try {
                    const _ui = UserAccounts.getUserInfo(user.email);
                    if (_ui.role === 'admin') return;
                    const ipInfo = await this.getIPInfo();
                    
                    const entry = {
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        timestamp: new Date().toISOString(),
                        email: user.email,
                        displayName: user.displayName || 'Unknown User',
                        uid: user.uid,
                        ip: ipInfo.ip || 'Unknown',
                        country: ipInfo.country || 'Unknown',
                        region: ipInfo.region || 'Unknown',
                        city: ipInfo.city || 'Unknown',
                        timezone: ipInfo.timezone || 'Unknown',
                        isp: ipInfo.isp || 'Unknown',
                        userAgent: navigator.userAgent,
                        browser: this.getBrowserInfo(),
                        os: this.getOSInfo(),
                        device: this.getDeviceInfo(),
                        screenResolution: `${screen.width}x${screen.height}`,
                        action: 'LOGIN'
                    };
                    
                    state.loginLogbook.unshift(entry);
                    
                    if (state.loginLogbook.length > 1000) {
                        state.loginLogbook = state.loginLogbook.slice(0, 1000);
                    }
                    
                    this.saveToStorage();
                    
                    await this.saveToFirebase(entry);
                    
                } catch (error) {
                    console.error('Failed to log login:', error);
                }
            },
            
            async logLogout(user) {
                try {
                    const _ui2 = UserAccounts.getUserInfo(user.email);
                    if (_ui2.role === 'admin') return;
                    const ipInfo = await Promise.race([
                        this.getIPInfo(),
                        new Promise(resolve => setTimeout(() => resolve({}), 2000))
                    ]);
                    
                    const entry = {
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        timestamp: new Date().toISOString(),
                        email: user.email,
                        displayName: user.displayName || 'Unknown User',
                        uid: user.uid,
                        ip: ipInfo.ip || 'Unknown',
                        action: 'LOGOUT'
                    };
                    
                    state.loginLogbook.unshift(entry);
                    if (state.loginLogbook.length > 1000) {
                        state.loginLogbook = state.loginLogbook.slice(0, 1000);
                    }
                    
                    this.saveToStorage();
                    await this.saveToFirebase(entry);
                } catch (error) {
                    console.error('Failed to log logout:', error);
                }
            },
            
            async getIPInfo() {
                const jsonpFetch = (url, callbackParam = 'callback') => new Promise((resolve, reject) => {
                    const cbName = '_ipCb_' + Math.random().toString(36).slice(2);
                    const script = document.createElement('script');
                    const timer = setTimeout(() => {
                        cleanup();
                        reject(new Error('JSONP timeout'));
                    }, 7000);
                    const cleanup = () => {
                        clearTimeout(timer);
                        delete window[cbName];
                        if (script.parentNode) script.parentNode.removeChild(script);
                    };
                    window[cbName] = (data) => { cleanup(); resolve(data); };
                    script.onerror = () => { cleanup(); reject(new Error('JSONP script error')); };
                    script.src = `${url}${url.includes('?') ? '&' : '?'}${callbackParam}=${cbName}`;
                    document.head.appendChild(script);
                });

                const jsonpApis = [
                    async () => {
                        const d = await jsonpFetch('https://ipinfo.io/json', 'callback');
                        if (!d.ip) throw new Error('ipinfo.io: no ip');
                        return { ip: d.ip, country: d.country, region: d.region, city: d.city, timezone: d.timezone, isp: d.org };
                    },
                    async () => {
                        const d = await jsonpFetch('https://ip-api.com/json/?fields=status,country,regionName,city,timezone,isp,query');
                        if (d.status !== 'success') throw new Error('ip-api.com: ' + d.message);
                        return { ip: d.query, country: d.country, region: d.regionName, city: d.city, timezone: d.timezone, isp: d.isp };
                    }
                ];

                for (const api of jsonpApis) {
                    try {
                        const result = await api();
                        if (result.ip) {
                            return result;
                        }
                    } catch (e) {
                    }
                }

                const fetchApis = [
                    async () => {
                        const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(6000) });
                        if (!r.ok) throw new Error('ipapi.co failed');
                        const d = await r.json();
                        if (d.error) throw new Error(d.reason || 'ipapi.co error');
                        return { ip: d.ip, country: d.country_name, region: d.region, city: d.city, timezone: d.timezone, isp: d.org };
                    },
                    async () => {
                        const r = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(6000) });
                        if (!r.ok) throw new Error('ipwho.is failed');
                        const d = await r.json();
                        if (!d.success) throw new Error('ipwho.is error');
                        return { ip: d.ip, country: d.country, region: d.region, city: d.city, timezone: d.timezone?.id, isp: d.connection?.isp };
                    },
                    async () => {
                        const r = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(6000) });
                        if (!r.ok) throw new Error('freeipapi failed');
                        const d = await r.json();
                        return { ip: d.ipAddress, country: d.countryName, region: d.regionName, city: d.cityName, timezone: d.timeZone, isp: null };
                    }
                ];

                for (const api of fetchApis) {
                    try {
                        const result = await api();
                        if (result.ip) {
                            return result;
                        }
                    } catch (e) {
                    }
                }

                return {};
            },
            
            getBrowserInfo() {
                const ua = navigator.userAgent;
                if (ua.includes('Chrome')) return 'Chrome';
                if (ua.includes('Firefox')) return 'Firefox';
                if (ua.includes('Safari')) return 'Safari';
                if (ua.includes('Edge')) return 'Edge';
                if (ua.includes('Opera')) return 'Opera';
                return 'Unknown';
            },
            
            getOSInfo() {
                const ua = navigator.userAgent;
                if (ua.includes('Windows')) return 'Windows';
                if (ua.includes('Mac')) return 'macOS';
                if (ua.includes('Linux')) return 'Linux';
                if (ua.includes('Android')) return 'Android';
                if (ua.includes('iOS')) return 'iOS';
                return 'Unknown';
            },
            
            getDeviceInfo() {
                const ua = navigator.userAgent;
                if (ua.includes('Mobile')) return 'Mobile';
                if (ua.includes('Tablet')) return 'Tablet';
                return 'Desktop';
            },
            
            saveToStorage() {
                try {
                    localStorage.setItem('esh_login_logbook', JSON.stringify(state.loginLogbook));
                } catch (e) {
                    if (e && e.name === 'QuotaExceededError') {
                        try {
                            if (state.loginLogbook && state.loginLogbook.length > 30) state.loginLogbook = state.loginLogbook.slice(-30);
                            localStorage.setItem('esh_login_logbook', JSON.stringify(state.loginLogbook));
                        } catch(e2) {
                            try { localStorage.removeItem('esh_login_logbook'); } catch(e3){}
                        }
                    }
                }
            },
            
            loadFromStorage() {
                try {
                    const saved = localStorage.getItem('esh_login_logbook');
                    if (saved) {
                        state.loginLogbook = JSON.parse(saved);
                    }
                } catch (e) {
                    console.error('Failed to load logbook from localStorage:', e);
                }
            },
            
            async saveToFirebase(entry) {
                try {
                    const currentUser = window.firebaseAuth.currentUser;
                    if (currentUser) {
                        await currentUser.getIdToken(true); // force refresh
                    }
                    const logbookRef = window.firebase.dbRef(
                        window.firebaseRealtimeDb,
                        `login-logbook/${entry.id}`
                    );
                    await window.firebase.set(logbookRef, entry);
                } catch (e) {
                }
            },
            
            getRecent(limit = 100) {
                return state.loginLogbook.slice(0, limit);
            },
            
            filterByUser(email) {
                return state.loginLogbook.filter(entry => entry.email === email);
            },
            
            filterByDateRange(startDate, endDate) {
                const start = new Date(startDate).getTime();
                const end = new Date(endDate).getTime();
                return state.loginLogbook.filter(entry => {
                    const timestamp = new Date(entry.timestamp).getTime();
                    return timestamp >= start && timestamp <= end;
                });
            },
            
            exportToCSV() {
                const headers = ['Timestamp', 'Action', 'Email', 'Display Name', 'IP Address', 'Location', 'Browser', 'OS', 'Device'];
                const rows = state.loginLogbook.map(entry => [
                    new Date(entry.timestamp).toLocaleString(),
                    entry.action,
                    entry.email,
                    entry.displayName,
                    entry.ip,
                    `${entry.city}, ${entry.region}, ${entry.country}`,
                    entry.browser || '-',
                    entry.os || '-',
                    entry.device || '-'
                ]);
                
                let csv = headers.join(',') + '\n';
                rows.forEach(row => {
                    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
                });
                
                return csv;
            }
        };
        
        LoginLogbook.loadFromStorage();
        
        const UserAccounts = {
            superintendents: {
                'esh@scic.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'admin',
                    displayName: 'ESH Admin',
                    region: 'CORPORATE',
                    color: '#D32F2F'
                },
                'esh@ncr.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'superintendent',
                    displayName: 'NCR Superintendent',
                    region: 'NCR',
                    color: '#2196F3'
                },
                'esh@north.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'superintendent',
                    displayName: 'North Luzon Superintendent',
                    region: 'NORTH LUZON',
                    color: '#4CAF50'
                },
                'esh@south.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'superintendent',
                    displayName: 'South Luzon Superintendent',
                    region: 'SOUTH LUZON',
                    color: '#FF9800'
                },
                'esh@vismin.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'superintendent',
                    displayName: 'Visayas & Mindanao Superintendent',
                    region: 'VISAYAS & MINDANAO',
                    color: '#9C27B0'
                },
                'esh@ncrpco.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'pco',
                    displayName: 'NCR PCO',
                    region: 'NCR',
                    color: '#00ACC1'
                },
                'esh@southpco.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'pco',
                    displayName: 'South Luzon PCO',
                    region: 'SOUTH LUZON',
                    color: '#F4511E'
                },
                'esh@northpco.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'pco',
                    displayName: 'North Luzon PCO',
                    region: 'NORTH LUZON',
                    color: '#43A047'
                },
                'esh@visminpco.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'pco',
                    displayName: 'Visayas & Mindanao PCO',
                    region: 'VISAYAS & MINDANAO',
                    color: '#8E24AA'
                },

                'esh@tgm.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'manager',
                    displayName: 'TGM Manager',
                    region: 'ALL',
                    color: '#37474f'
                },
                'esh@mab.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'manager',
                    displayName: 'MAB Manager',
                    region: 'ALL',
                    color: '#37474f'
                },
                'esh@lmp.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'manager',
                    displayName: 'LMP Manager',
                    region: 'ALL',
                    color: '#37474f'
                },

                'esh@wda.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'admin',
                    displayName: 'WDA System Admin',
                    region: 'CORPORATE',
                    color: '#b71c1c'
                },

                'esh@corpdc.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'admin',
                    displayName: 'Corporate Document Controller',
                    region: 'CORPORATE',
                    color: '#1a237e'
                },

                'esh@cbmganda.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'envi_head',
                    displayName: 'Environmental Head (Overall)',
                    region: 'PLANT OPERATIONS',
                    color: '#00695c'
                },

                'esh@health.com.ph': {
                    password: '*** (auth via Firebase Auth)',
                    role: 'corp_nurse',
                    displayName: 'Corporate Nurse',
                    region: 'ALL',
                    color: '#ad1457'
                }
            },

            PCO_EDITABLE_TABS: [
                'permits', 'emb', 'env-monitoring', 'env-monthly-report',
                'nov-env', 'esh-calendar-env',
            ],

            ENVI_HEAD_EDITABLE_TABS: [
                'permits', 'emb', 'env-monitoring', 'env-monthly-report',
                'nov-env', 'esh-calendar-env',
            ],

            NURSE_EDITABLE_TABS: [
                'health-report', 'esh-calendar-health',  // Both Nurse and Superintendent can write
            ],

            PCO_VIEW_TABS: [
                'overall', 'rates', 'exposures', 'medical', 'nov', 'nov-monitoring',
                'activities', 'corporate-kpm', 'kpm', 'dole', 'doe', 'doe-permit', 'cshp', 'reg', 'audit',
                'esh-calendar-safety', 'esh-calendar-health', 'esh-calendar-drills',
                'personnel', 'osh-requirement', 'health-report', 'tabulation',
                'got-monitoring', 'nov-monitoring', 'exposures', 'lta-registry', 'medical'
            ],

            // Sidebar tabs a PCO may see (Envi Head is a separate role and sees everything). Edit this list only.
            PCO_NAV_TABS: [
                'headlines', 'overall', 'safety-alerts', 'nov-monitoring',
                'emb', 'env-monthly-report', 'nov-env', 'permits', 'env-monitoring', 'esh-calendar-env', 'settings'
            ],

            getUserInfo(email) {
                if (!email) return { role: 'guest', region: null, displayName: 'Guest', color: '#999' };
                if (this.superintendents[email]) return this.superintendents[email];
                return { role: 'guest', displayName: 'Unknown', region: null, color: '#999' };
            },

            isAdmin(email) {
                if (!email) return false;
                const info = this.getUserInfo(email);
                return info.role === 'admin';
            },

            isSuperintendent(email) {
                const info = this.getUserInfo(email);
                return info.role === 'superintendent';
            },

            isPCO(email) {
                const info = this.getUserInfo(email);
                return info.role === 'pco';
            },

            checkPermission(userEmail, action, projectRegion, tab) {
                const info = this.getUserInfo(userEmail);

                // ── WRITE POLICY (per RBAC Matrix v2) ────────────────────────────────
                // ADMIN          → Write on CORPORATE region only (all tabs within CORPORATE)
                //                  View-only for all other regions
                // SUPERINTENDENT → Write on Safety + Health tabs, own region only
                // PCO            → Write on Environmental tabs only, own region only
                // ENVI HEAD      → Write on Environmental tabs only, PLANT OPERATIONS only
                //                  View-only for other env regions (can coordinate via PCOs)
                // CORP NURSE     → View-only (monitoring only — superintendent handles health writes)
                // MANAGER        → Read-only (no write)
                // DOC CONTROLLER → Read-only (no write, but can access Settings)
                // ──────────────────────────────────────────────────────────────────────

                if (info.role === 'guest')          return { allowed: false, reason: '403: Not authenticated' };
                if (info.role === 'manager')         return { allowed: false, reason: 'Manager accounts are view-only.' };
                if (info.role === 'doc_controller')  return { allowed: false, reason: 'Document Controller accounts are view-only.' };
                if (info.role === 'corp_nurse')      return { allowed: false, reason: 'Corporate Nurse is monitoring/view-only. Coordinate with Superintendent for health data entry.' };

                // Admin — write on CORPORATE projects only, view all regions
                if (info.role === 'admin') {
                    // AUDIT tab: only esh@wda.com.ph has write access
                    if (tab === 'audit') {
                        if (userEmail !== 'esh@wda.com.ph') {
                            return { allowed: false, reason: 'Internal ESH Audit Report can only be edited by the WDA System Admin.' };
                        }
                        return { allowed: true, reason: 'WDA Admin: audit write access' };
                    }
                    // CORPORATE KPM tab: edit exclusively for esh@wda.com.ph; others in allowed list are view-only
                    if (tab === 'corporate-kpm') {
                        if (userEmail !== 'esh@wda.com.ph') {
                            return { allowed: false, reason: 'Corporate KPM Report can only be edited by the WDA System Admin (esh@wda.com.ph). You have view-only access.' };
                        }
                        return { allowed: true, reason: 'WDA Admin: Corporate KPM write access' };
                    }
                    const _adminProjReg = (projectRegion || '').trim().toUpperCase();
                    if (projectRegion && _adminProjReg !== 'CORPORATE') {
                        return { allowed: false, reason: `Admin can only edit CORPORATE records. For ${projectRegion} corrections, coordinate with the assigned Superintendent or PCO.` };
                    }
                    return { allowed: true, reason: 'Admin: CORPORATE write access' };
                }

                // Superintendent — write on safety + health tabs, own region only
                // (Environmental tabs are handled by PCO per region)
                if (info.role === 'superintendent') {
                    const SUPER_EDITABLE_TABS = [
                        'overall', 'rates', 'exposures', 'medical', 'nov', 'nov-monitoring',
                        'activities', 'kpm', 'dole', 'doe', 'doe-permit', 'cshp', 'reg',
                        'personnel', 'osh-requirement', 'tabulation', 'got-monitoring',
                        'lta-registry', 'health-report',
                        'esh-calendar-safety', 'esh-calendar-health', 'esh-calendar-drills'
                    ];
                    if (tab && !SUPER_EDITABLE_TABS.includes(tab)) {
                        return { allowed: false, reason: `Superintendent cannot edit "${tab}". Environmental tabs are managed by the assigned PCO.` };
                    }
                    const _superRegion   = (info.region || '').trim().toUpperCase();
                    const _superProjReg  = (projectRegion || '').trim().toUpperCase();
                    if (projectRegion && _superRegion !== _superProjReg) {
                        return { allowed: false, reason: `You can only edit records in ${info.region}.` };
                    }
                    return { allowed: true, reason: 'Superintendent: tab + region match' };
                }

                // Corp Nurse — view-only (handled above via early return)

                // PCO — own region, env tabs only
                if (info.role === 'pco') {
                    if (tab && !this.PCO_EDITABLE_TABS.includes(tab)) {
                        return { allowed: false, reason: `PCO accounts can only edit Environmental modules. "${tab}" is read-only for your role.` };
                    }
                    const _pcoRegion = (info.region || '').trim().toUpperCase();
                    const _pcoProjRegion = (projectRegion || '').trim().toUpperCase();
                    if (projectRegion && _pcoRegion !== _pcoProjRegion) {
                        return { allowed: false, reason: `You can only edit records in ${info.region}.` };
                    }
                    return { allowed: true, reason: 'PCO: env tab + region match' };
                }

                // Environmental Head — overall PCO head, cross-region access, env tabs only
                if (info.role === 'envi_head') {
                    if (tab && !this.ENVI_HEAD_EDITABLE_TABS.includes(tab)) {
                        return { allowed: false, reason: `Environmental Head can only edit environmental modules. "${tab}" is read-only.` };
                    }
                    // Overall Environmental Head oversees all regional PCOs — full cross-region
                    // write access to environmental modules (each region's rows/fields remain
                    // separate documents/keys, so this never overwrites another PCO's entries).
                    return { allowed: true, reason: 'Envi Head: env tab, all-region access' };
                }

                return { allowed: false, reason: '403: Unauthorized Action' };
            },

            canEdit(userEmail, projectRegion) {
                const result = this.checkPermission(userEmail, 'edit', projectRegion, state.currentTab);
                return result.allowed;
            },

            canEditTab(userEmail, tab) {
                const result = this.checkPermission(userEmail, 'edit', null, tab);
                return result.allowed;
            },

            isPCOViewOnly(userEmail, tab) {
                const info = this.getUserInfo(userEmail);
                if (info.role !== 'pco') return false;
                return this.PCO_VIEW_TABS.includes(tab);
            },

            getLockedReason(userEmail, projectRegion, tab) {
                const result = this.checkPermission(userEmail, 'edit', projectRegion, tab);
                return result.reason;
            },

            getAccessLevel(userEmail) {
                const userInfo = this.getUserInfo(userEmail);
                const isAdmin  = userInfo.role === 'admin';
                const canWriteData = userInfo.role === 'pco' || userInfo.role === 'envi_head'
                                  || userInfo.role === 'superintendent' || isAdmin;
                return {
                    role: userInfo.role,
                    region: userInfo.region,
                    permissions: {
                        viewAll: true,
                        editAll: isAdmin,
                        editOwn: canWriteData,
                        accessSettings: isAdmin,
                        viewUsers: isAdmin,
                        viewDevices: isAdmin,
                        deleteProjects: isAdmin,
                        createAccounts: isAdmin
                    }
                };
            }
        };
        window.UserAccounts = UserAccounts;

        // ── Region banner visibility (ONE place) ─────────────────────────────────────────────
        // Superintendent & PCO see only their own region's banner. Other roles see all.
        // Only banners (and their body) are hidden; summary tables/totals are never touched.
        // Covers every tab automatically: any `.region-banner.region-<slug>` or `[data-region-card]` card.
        (function initRegionBannerHider() {
            const norm = r => String(r || '').trim().toUpperCase();
            function ownRegion() {
                try {
                    const info = UserAccounts.getUserInfo(state.currentUser && state.currentUser.email);
                    return (info.role === 'superintendent' || info.role === 'pco') ? norm(info.region) : null;
                } catch (e) { return null; }
            }
            function regionOf(el) {
                if (el.dataset.regionCard) return el.dataset.regionCard;
                const slugs = Object.keys(window.REGION_COLORS || {});
                return slugs.find(r => el.classList.contains('region-' + window.regionSlug(r))) || null;
            }
            function hide(el) {
                const next = el.nextElementSibling, parent = el.parentElement;
                // banner sitting alone in its own card with its body -> hide the whole card
                if (!el.dataset.regionCard && parent && parent.children.length <= 2 && parent !== document.body) { parent.style.display = 'none'; return; }
                el.style.display = 'none';
                if (!el.dataset.regionCard && next && (next.classList.contains('region-content') || /content|body/.test(next.id || ''))) next.style.display = 'none';
            }
            function apply() {
                const mine = ownRegion();
                if (!mine) return;
                document.querySelectorAll('.region-banner:not([data-rv]), [data-region-card]:not([data-rv])').forEach(el => {
                    el.setAttribute('data-rv', '1');
                    const reg = regionOf(el);
                    if (reg && norm(reg) !== mine) hide(el);
                });
            }
            function start() {
                apply();
                new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
            }
            if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
        })();
