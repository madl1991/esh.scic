
(function() {

const ESH_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const ESH_TRAININGS = {
    'esh-calendar-env': [
        'Chemicals & Hazardous Waste Management including PPE management',
        'Ecological Solid Waste Management',
        'Water Pollution Prevention and Control',
        'Aspect and Impact Identification Training',
        'Chemical and Oil Spill Handling with drills',
        '5S and Good Housekeeping',
        'Biodiversity Management',
        'Use and Conservation of Resources (Energy, Water, Fuel and Materials)',
        'Air Pollution Prevention and Control',
        'Climate Change Awareness',
        'Safety Data Sheets and GHS Labelling',
    ],
    'esh-calendar-safety': [
        '8-Hr Mandatory OSH Training',
        'Emergency Preparedness and Response',
        'Accident/Incident Notification, Investigation, Classification, Reporting and Recording',
        'Fire Prevention and Control Awareness',
        'HIRAC Awareness',
        'Behavioral Based Safety',
        'Permit to Work System',
        'ESH Standard Practices',
        'Personal Protective Equipment (PPE), usage, limitation and proper disposal',
        'Weather (Disaster) Management',
        'Using of Electrical Power Tools including Electrical Safety',
        'Defensive Driving Seminar',
        'Confined Space and/or Tunneling Safety including Gas Test Awareness',
        'Spotter & Flagman Training',
        'Heavy Equipment Safety Training',
        'Safe Operation Procedure (SOP) for Retrieval & Rescue of Equipment/Vehicle Training',
    ],
    'esh-calendar-health': [
        'Hepatitis B (Viral Hepatitis Awareness Month)',
        'Heart Awareness',
        'Oral Health Awareness',
        'Tuberculosis Awareness',
        'Heat Stress Awareness',
        'Immunization Awareness Month, and Reiteration of Heat Stress Awareness',
        'Covid-19 Awareness',
        'Hypertension Awareness, and Reiteration of Heat Stress Awareness',
        'HIV-AIDS Awareness, and Reiteration of Heat Stress Awareness',
        'Water-born Disease Awareness',
        'Blood Donation Awareness',
        'Nutrition Awareness',
        'Diabetes Awareness',
        'Sight Saving Awareness',
        'Breastfeeding Awareness',
        'Generic Medicine Awareness',
        'Blood Disease Awareness',
        'Mental Health Awareness',
        'Breast Cancer Awareness',
        'Consciousness Against Counterfeit Medicine',
        'Anti-Sexual Harassment',
        'Ear, Nose, and Throat Consciousness',
    ],
};

const ESH_DRILLS = [
    { id:0,  name:'Earthquake', freq:'Quarterly' },
    { id:1,  name:'Fire', freq:'Twice a year' },
    { id:2,  name:'Chemical and Oil Spillage', freq:'Twice a year' },
    { id:3,  name:'Serious Injury', freq:'Twice a year' },
    { id:4,  name:'Death Cause by Accident', freq:'Twice a year' },
    { id:5,  name:'Death by Natural Cases', freq:'Twice a year' },
    { id:6,  name:'Medical Emergency', freq:'Twice a year' },
    { id:8,  name:'Explosion', freq:'Once a year' },
    { id:9,  name:'Bomb Threat', freq:'Once a year' },
    { id:10, name:'Un-exploded Ordnance', freq:'Once a year' },
    { id:11, name:'Weather Disturbance (Typhoons, Heavy Rains, Strong Winds and Flooding)', freq:'Once a year' },
    { id:12, name:'Weather Emergency (Lightning)', freq:'Once a year' },
    { id:7,  name:'Confined Space and Tunnel Emergency', freq:'Twice a year' },
    { id:13, name:'Volcanic Eruption', freq:'Once a year' },
    { id:14, name:'Tsunami / Storm Surge', freq:'Once a year' },
    { id:15, name:'In case of active shooting', freq:'Once a year' },
    { id:16, name:'Riot', freq:'Once a year' },
    { id:17, name:'Workplace Violence', freq:'Once a year' },
    { id:18, name:'Labor Strike', freq:'Once a year' },
];

const TAB_COLORS = {
    'esh-calendar-env':    { header:'#1b5e20', light:'#e8f5e9', accent:'#2e7d32', icon:'fa-leaf', label:'ENVIRONMENT' },
    'esh-calendar-safety': { header:'#2e7d32', light:'#e8f5e9', accent:'#388e3c', icon:'fa-hard-hat', label:'SAFETY' },
    'esh-calendar-health': { header:'#1b5e20', light:'#e8f5e9', accent:'#2e7d32', icon:'fa-heart-pulse', label:'HEALTH' },
    'esh-calendar-drills': { header:'#2e7d32', light:'#e8f5e9', accent:'#388e3c', icon:'fa-person-running', label:'EMERGENCY DRILLS' },
};

// Legacy _eshCalendarUnsubscribe replaced by _eshCalendarUnsubRTDB in simplified sync

// ── ESH CALENDAR SYNC — SIMPLIFIED (KPM-style direct RTDB write) ──────────────
// Architecture mirrors KPM/RowSaveManager: click → direct Firebase write → onValue re-render.
// No echo guards, no deletion cache, no tombstones, no pending queues.
// Firebase RTDB is the single source of truth. onValue listener just re-renders.

let _eshCalendarUnsubRTDB = null; // main data listener unsubscribe
let _eshCalendarUnsubDels = null; // deletions listener (kept for backward compat cleanup)

function _eshKeyToFirebasePath(key) {
    // Firebase RTDB forbidden chars: . # $ [ ] /
    // | is ALLOWED — do NOT encode it (keeps keys readable and avoids _PIPE_ vs | duplicates)
    return key
        .replace(/\./g, '_DOT_')
        .replace(/#/g, '_HASH_')
        .replace(/\$/g, '_DOLLAR_')
        .replace(/\[/g, '_LBRACKET_')
        .replace(/\]/g, '_RBRACKET_');
    // Note: | is intentionally NOT encoded — Firebase allows it in keys
}

function _eshFirebasePathToKey(safeName) {
    // Decode legacy _PIPE_ encoded keys from old sync versions
    return safeName
        .replace(/_PIPE_/g, '|')
        .replace(/_DOT_/g, '.')
        .replace(/_HASH_/g, '#')
        .replace(/_DOLLAR_/g, '$')
        .replace(/_LBRACKET_/g, '[')
        .replace(/_RBRACKET_/g, ']');
}

// ── Simple localStorage helpers ───────────────────────────────────────────────
// _eshMemCache: in-memory ESH data store — immune to localStorage quota errors.
// This is the PRIMARY source of truth for this session.
// Firebase RTDB is the persistent source of truth across sessions/browsers.
window._eshMemCache = window._eshMemCache || (function() {
    try { return JSON.parse(localStorage.getItem('esh_calendar_data') || '{}'); } catch(e) { return {}; }
})();

function getEshStorage() {
    // Always return the in-memory cache — never read from localStorage directly
    return window._eshMemCache || {};
}

function _eshSaveLocal(key, value) {
    // ALWAYS update in-memory cache first — immune to localStorage quota
    if (!window._eshMemCache) window._eshMemCache = {};
    if (value === null || value === undefined) { delete window._eshMemCache[key]; }
    else { window._eshMemCache[key] = value; }
    // Try to persist to localStorage (best-effort — not required for correctness)
    try {
        localStorage.setItem('esh_calendar_data', JSON.stringify(window._eshMemCache));
    } catch(e) {
        if (e && e.name === 'QuotaExceededError') {
            try {
                ['esh_login_logbook','esh_audit_log','esh_projects_cache'].forEach(function(k) {
                    try { localStorage.removeItem(k); } catch(e2) {}
                });
                localStorage.setItem('esh_calendar_data', JSON.stringify(window._eshMemCache));
            } catch(e2) {} // localStorage full — in-memory cache is still valid
        }
    }
}

// ── Direct RTDB write — same as KPM's saveToFirebaseDebounced but for RTDB ───
// value=true → set plan, value=null → delete plan
function _eshRtdbWrite(key, value) {
    if (!window.firebaseRealtimeDb || !window.firebase || !window.firebase.dbRef || !window.firebase.set) {
        showToast('Firebase not ready. Please try again.', 'warning', 3000);
        return Promise.reject('rtdb-not-ready');
    }
    const safePath = 'esh-calendar/data/' + _eshKeyToFirebasePath(key);
    const ref = window.firebase.dbRef(window.firebaseRealtimeDb, safePath);
    const writeVal = (value === null || value === undefined || value === false) ? null : value;
    return window.firebase.set(ref, writeVal);
}

// ── _eshRtdbRenameProject: re-key ALL ESH Calendar RTDB entries for a renamed project ─
// Writes newName keys and removes oldName keys atomically via RTDB multi-path update.
async function _eshRtdbRenameProject(oldName, newName, year) {
    if (!oldName || !newName || oldName === newName) return;
    const dbOk = window.firebaseRealtimeDb && window.firebase && window.firebase.dbRef && window.firebase.update;
    const rootRef = dbOk ? window.firebase.dbRef(window.firebaseRealtimeDb, 'esh-calendar/data') : null;

    // Build source map: read RTDB directly (all years/tabs), fall back to in-memory cache.
    let source = null;
    if (rootRef && window.firebase.get) {
        try {
            const snap = await window.firebase.get(rootRef);
            const raw = snap.val() || {};
            source = {};
            Object.keys(raw).forEach(function(k) {
                const v = raw[k];
                if (v === null || v === undefined || v === false) return;
                source[_eshFirebasePathToKey(k)] = v;
            });
        } catch(e) {  }
    }
    if (!source) source = Object.assign({}, window._eshMemCache || {});

    const updates = {};
    let count = 0;
    if (!window._eshMemCache) window._eshMemCache = {};
    Object.keys(source).forEach(function(key) {
        const val = source[key];
        const parts = key.split('|');
        // Actual/na keys:  year|tab|project|idx|month|field  (6 parts)
        // Row N/A keys:    year|tab|project|idx|na_row       (5 parts)
        // GLOBAL_PLAN keys have 'GLOBAL_PLAN' in parts[2], so they are never matched.
        if ((parts.length === 6 || (parts.length === 5 && parts[4] === 'na_row')) && parts[2] === oldName && (!year || parts[0] === String(year))) {
            const np = parts.slice();
            np[2] = newName;
            const newKey = np.join('|');
            updates[_eshKeyToFirebasePath(newKey)] = val;
            updates[_eshKeyToFirebasePath(key)] = null; // delete old key
            window._eshMemCache[newKey] = val;
            delete window._eshMemCache[key];
            count++;
        }
    });
    if (count > 0) {
        try { localStorage.setItem('esh_calendar_data', JSON.stringify(window._eshMemCache)); } catch(e) {}
        if (dbOk) {
            try {
                await window.firebase.update(rootRef, updates);
            } catch(e) {
            }
        }
    } else {
    }

    // Custom rows (esh-custom-rows-v2/<tab>_<project>) are also keyed by project name — move them too.
    const _tabs = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills'];
    for (const tab of _tabs) {
        try {
            const oldLocal = _eshCustomRowsKey(tab, oldName);
            const localRows = localStorage.getItem(oldLocal);
            if (localRows) {
                localStorage.setItem(_eshCustomRowsKey(tab, newName), localRows);
                localStorage.removeItem(oldLocal);
            }
            if (dbOk && window.firebase.get) {
                const oldPath = _eshFirebaseCustomRowsPath(tab, oldName);
                const newPath = _eshFirebaseCustomRowsPath(tab, newName);
                if (oldPath === newPath) continue;
                const oldRef = window.firebase.dbRef(window.firebaseRealtimeDb, oldPath);
                const snap = await window.firebase.get(oldRef);
                const rows = snap.val();
                if (rows) {
                    const crRef = window.firebase.dbRef(window.firebaseRealtimeDb, 'esh-custom-rows-v2');
                    const u = {};
                    u[newPath.replace('esh-custom-rows-v2/', '')] = rows;
                    u[oldPath.replace('esh-custom-rows-v2/', '')] = null;
                    await window.firebase.update(crRef, u);
                }
            }
        } catch(e) {  }
    }
}
window._eshRtdbRenameProject = _eshRtdbRenameProject;

// ── setEshStorage: kept for compatibility — just saves full object to localStorage ─
function setEshStorage(data) {
    // Update in-memory cache first (always succeeds)
    window._eshMemCache = data || {};
    // Best-effort localStorage persist
    try {
        localStorage.setItem('esh_calendar_data', JSON.stringify(window._eshMemCache));
    } catch(e) {
        if (e && e.name === 'QuotaExceededError') {
            try {
                ['esh_login_logbook','esh_audit_log','esh_projects_cache'].forEach(function(k) {
                    try { localStorage.removeItem(k); } catch(e2) {} });
                localStorage.setItem('esh_calendar_data', JSON.stringify(window._eshMemCache));
            } catch(e2) {} // localStorage full — in-memory cache still valid
        }
    }
}

// ── eshFetchAndRender: fetch once and render (used on tab switch) ─────────────
function eshFetchAndRender(tabType) {
    try { renderEshCalendar(tabType); } catch(e) { console.error('renderEshCalendar error:', e); }
    if (!window.firebaseRealtimeDb || !window.firebase) return;
    try {
        const ref = window.firebase.dbRef(window.firebaseRealtimeDb, 'esh-calendar/data');
        window.firebase.get(ref).then(function(snapshot) {
            const remoteData = snapshot.val() || {};
            const curYear = String((state && state.selectedYear) || 2026);
            const fromFb = {};
            Object.entries(remoteData).forEach(function(kv) {
                const decoded = _eshFirebasePathToKey(kv[0]);
                if (kv[1] === null || kv[1] === undefined || kv[1] === false) return;
                if (!decoded.startsWith('20')) return; // skip legacy no-year-prefix keys
                fromFb[decoded] = kv[1];
            });
            // Merge into in-memory cache (remote wins for plan keys, keep local actuals)
            if (!window._eshMemCache) window._eshMemCache = {};
            Object.entries(fromFb).forEach(function(kv) {
                window._eshMemCache[kv[0]] = kv[1];
            });
            try { localStorage.setItem('esh_calendar_data', JSON.stringify(window._eshMemCache)); } catch(e) {}
            try { renderEshCalendar(tabType); } catch(e) {}
        }).catch(function(e) {  });
    } catch(e) {  }
}
window.eshFetchAndRender = eshFetchAndRender;


// ── ESH RTDB Self-Healing Cleanup (runs once per session) ────────────────────
// Deletes: false-valued plan keys, legacy no-year-prefix keys, stale deletion records
// This cleans up bad data left by previous sync versions.
window._eshRtdbCleanupDone = false;
function _eshRtdbSelfHealCleanup() {
    if (window._eshRtdbCleanupDone) return;
    if (!window.firebaseRealtimeDb || !window.firebase || !window.firebaseAuth?.currentUser) return;
    const email = window.firebaseAuth.currentUser.email;
    // Only admin can write to RTDB
    if (!email || (!email.includes('esh@scic') && !email.includes('esh@wda'))) return;
    window._eshRtdbCleanupDone = true;

    const dataRef = window.firebase.dbRef(window.firebaseRealtimeDb, 'esh-calendar/data');
    const delRef = window.firebase.dbRef(window.firebaseRealtimeDb, 'esh-calendar/deletions');

    // Step 1: Clean data path — null out false values and legacy no-year keys
    window.firebase.get(dataRef).then(function(snap) {
        const allData = snap.val() || {};
        const nullUpdates = {};
        let cleaned = 0;
        Object.entries(allData).forEach(function(kv) {
            const k = kv[0], v = kv[1];
            const decoded = k.replace(/_PIPE_/g, '|');
            // Delete false values (should be null)
            if (v === false || v === null) {
                nullUpdates[k] = null;
                cleaned++;
            }
            // Delete legacy keys without year prefix
            else if (!decoded.startsWith('20')) {
                nullUpdates[k] = null;
                cleaned++;
            }
        });
        if (cleaned > 0) {
            window.firebase.update(dataRef, nullUpdates)
                .then(function() {  })
                .catch(function(e) {  });
        } else {
        }
    }).catch(function(e) {  });

    // Step 2: Clean deletion records — delete ALL (new architecture doesn't use them)
    window.firebase.get(delRef).then(function(snap) {
        const allDels = snap.val() || {};
        const delCount = Object.keys(allDels).length;
        if (delCount > 0) {
            // Null each child key. A set() on the whole 'deletions' node is denied by the RTDB rules
            // (only the $key children have a .write rule), so use update() with per-child nulls.
            const _delUpdates = {};
            Object.keys(allDels).forEach(function(dk) { _delUpdates[dk] = null; });
            window.firebase.update(delRef, _delUpdates)
                .then(function() {  })
                .catch(function(e) {  });
        } else {
        }
    }).catch(function(e) {  });
}
window._eshRtdbSelfHealCleanup = _eshRtdbSelfHealCleanup;
// ── startEshCalendarSync: real-time RTDB listener → re-render on change ───────
// KPM-style: Firebase pushes change → update local cache → re-render visible tab
function startEshCalendarSync() {
    if (!window.firebaseRealtimeDb || !window.firebase || !window.firebase.dbRef || !window.firebase.onValue) return;
    if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
        return;
    }
    // Detach any existing listeners
    if (_eshCalendarUnsubRTDB) { try { _eshCalendarUnsubRTDB(); } catch(e) {} _eshCalendarUnsubRTDB = null; }
    if (_eshCalendarUnsubDels) { try { _eshCalendarUnsubDels(); } catch(e) {} _eshCalendarUnsubDels = null; }
    // Also clear legacy unsubscribe handle
    if (window._eshCalendarUnsubscribe) { try { window._eshCalendarUnsubscribe(); } catch(e) {} window._eshCalendarUnsubscribe = null; }

    const curYear = String((state && state.selectedYear) || 2026);
    const ref = window.firebase.dbRef(window.firebaseRealtimeDb, 'esh-calendar/data');

    _eshCalendarUnsubRTDB = window.firebase.onValue(ref, function(snapshot) {
        const remoteData = snapshot.val() || {};

        // ── Build in-memory cache from Firebase snapshot (source of truth) ──
        // Do NOT rely on localStorage — it may be full (QuotaExceededError).
        // _eshMemCache is the authoritative in-memory store for this session.
        const fromFirebase = {};
        Object.entries(remoteData).forEach(function(kv) {
            const decoded = _eshFirebasePathToKey(kv[0]);
            // Skip null/undefined AND false — false means "unset" (legacy bad write), treat as deleted
            if (kv[1] === null || kv[1] === undefined || kv[1] === false) return;
            // Skip keys without year prefix (legacy migration artifacts)
            if (!decoded.startsWith('20')) return;
            fromFirebase[decoded] = kv[1];
        });

        // Update the global in-memory cache — this is what getEshStorage() reads
        // Preserve actual dates that aren't in Firebase yet (locally set but not yet synced)
        const prevCache = window._eshMemCache || {};
        const newCache = {};
        // Start with previous actuals (non-plan keys)
        Object.entries(prevCache).forEach(function(kv) {
            if (!kv[0].includes('|GLOBAL_PLAN|')) newCache[kv[0]] = kv[1];
        });
        // Apply all Firebase values (authoritative)
        Object.entries(fromFirebase).forEach(function(kv) {
            newCache[kv[0]] = kv[1];
        });
        window._eshMemCache = newCache;

        // Try to persist to localStorage (best-effort, non-blocking)
        try { localStorage.setItem('esh_calendar_data', JSON.stringify(newCache)); } catch(e) {
            if (e && e.name === 'QuotaExceededError') {
                try {
                    ['esh_login_logbook','esh_audit_log','esh_projects_cache'].forEach(function(k2) {
                        try { localStorage.removeItem(k2); } catch(e2) {} });
                    localStorage.setItem('esh_calendar_data', JSON.stringify(newCache));
                } catch(e2) {
                    // localStorage full — in-memory cache is still the source of truth, that's fine
                }
            }
        }

        // Re-render visible ESH calendar tabs
        // ── Skip re-render if a delete confirm dialog is open, or if we just wrote an actual ──
        if (window._eshConfirmDialogOpen) {
            return;
        }
        if (window._eshSavingActual) {
            return;
        }
        const eshTabs = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills','esh-calendar-corp-drills'];
        const tabsToRefresh = (state && eshTabs.includes(state.currentTab)) ? [state.currentTab] : eshTabs;
        tabsToRefresh.forEach(function(tabType) {
            const allProjects = (state && state.projects) ? state.projects : [];
            const regionOrder = ['NCR', 'SOUTH LUZON', 'NORTH LUZON', 'VISAYAS & MINDANAO'];
            regionOrder.forEach(function(region) {
                const regProjects = allProjects.filter(function(p) { return p.region === region; });
                if (!regProjects.length) return;
                const safeRegion = region.replace(/[^a-z0-9]/gi, '_');
                const contentEl = document.getElementById(tabType + '-' + safeRegion + '-content');
                if (contentEl && contentEl.style.display !== 'none') {
                    // ── Skip re-render if user is actively editing a date input inside this container ──
                    const _focusedEl = document.activeElement;
                    if (_focusedEl && _focusedEl.type === 'date' && contentEl.contains(_focusedEl)) {
                        // User is mid-input — defer re-render to avoid wiping their input
                        (function(_t, _r, _rp) {
                            setTimeout(function() {
                                const _fi = document.activeElement;
                                if (_fi && _fi.type === 'date' && document.getElementById(_t + '-' + _r.replace(/[^a-z0-9]/gi,'_') + '-content') && document.getElementById(_t + '-' + _r.replace(/[^a-z0-9]/gi,'_') + '-content').contains(_fi)) return;
                                const _pi = _eshRegionProjectIdx[eshGetRegionKey(_t, _r)] || 0;
                                try { eshRenderRegionTable(_t, _r, _rp, _pi); } catch(e) {}
                            }, 1500);
                        })(tabType, region, regProjects);
                        return;
                    }
                    const projIdx = _eshRegionProjectIdx[eshGetRegionKey(tabType, region)] || 0;
                    try { eshRenderRegionTable(tabType, region, regProjects, projIdx); } catch(e) {}
                }
            });
        });
    }, function(err) {  });

}
window.startEshCalendarSync = startEshCalendarSync;

function migrateEshPlanKeys() {
    if (localStorage.getItem('esh_plan_migrated_v2') === '1') return;
    try {
        const storage = getEshStorage();
        const newStorage = {};
        let migrated = 0;
        Object.entries(storage).forEach(function([key, val]) {
            const parts = key.split('|');
            if (parts.length === 5 && parts[4] === 'plan' && parts[1] !== 'GLOBAL_PLAN') {
                const globalKey = parts[0] + '|GLOBAL_PLAN|' + parts[2] + '|' + parts[3] + '|plan';
                if (!(globalKey in newStorage)) { newStorage[globalKey] = val; migrated++; }
            } else {
                newStorage[key] = val;
            }
        });
        if (migrated > 0) { setEshStorage(newStorage);  }
        localStorage.setItem('esh_plan_migrated_v2', '1');
    } catch(e) {  }
}
migrateEshPlanKeys();

function migrateEshAddYearPrefix() {
    if (localStorage.getItem('esh_plan_migrated_v3') === '1') return;
    try {
        const storage = getEshStorage();
        const newStorage = {};
        let migrated = 0;
        Object.entries(storage).forEach(function([key, val]) {
            if (/^\d{4}\|/.test(key)) {
                newStorage[key] = val; // already has year prefix
            } else {
                newStorage['2026|' + key] = val;
                migrated++;
            }
        });
        if (migrated > 0) {
            localStorage.setItem('esh_calendar_data', JSON.stringify(newStorage));
        }
        localStorage.setItem('esh_plan_migrated_v3', '1');
    } catch(e) {  }
}
migrateEshAddYearPrefix();

// FIX: One-time cleanup — remove any stale GLOBAL_PLAN entries from the pending
// writes queue that may have accumulated from previous sessions on this browser.
// These would have been re-uploaded on next flush, restoring deleted plans.
(function _cleanStalePlanPendingWrites() {
    try {
        const pending = JSON.parse(localStorage.getItem('esh_calendar_pending_writes') || '{}');
        let cleaned = 0;
        Object.keys(pending).forEach(function(k) {
            if (k.includes('|GLOBAL_PLAN|') && k.endsWith('|plan')) {
                delete pending[k];
                cleaned++;
            }
        });
        if (cleaned > 0) {
            localStorage.setItem('esh_calendar_pending_writes', JSON.stringify(pending));
        }
    } catch(e) {}
})();

window.getEshStorage = getEshStorage; // re-exported for external callers

// eshPurgeAllPlanKeys: admin console utility — bulk delete all plan keys from RTDB
window.eshPurgeAllPlanKeys = async function(yearFilter) {
    const year = yearFilter || (state && state.selectedYear) || 2026;
    if (!window.firebaseRealtimeDb || !window.firebase) { console.error('Firebase not ready'); return; }
    if (!state || !state.isAdmin) { console.error('Admin only'); return; }
    const ref = window.firebase.dbRef(window.firebaseRealtimeDb, 'esh-calendar/data');
    const snap = await window.firebase.get(ref).catch(e => { console.error('Fetch failed:', e); return null; });
    if (!snap) return;
    const remoteData = snap.val() || {};
    const planKeys = [];
    Object.keys(remoteData).forEach(function(safeK) {
        const k = _eshFirebasePathToKey(safeK);
        if (k.startsWith(year + '|') && k.includes('|GLOBAL_PLAN|') && k.endsWith('|plan')) planKeys.push(k);
    });
    if (!planKeys.length) { showToast && showToast('No plan keys found — already clean!', 'success', 4000); return; }
    const updates = {};
    planKeys.forEach(function(k) { updates[_eshKeyToFirebasePath(k)] = null; });
    try {
        await window.firebase.update(ref, updates);
        // Clear localStorage
        const s = getEshStorage();
        planKeys.forEach(function(k) { delete s[k]; });
        try { localStorage.setItem('esh_calendar_data', JSON.stringify(s)); } catch(e) {}
        showToast && showToast('All ' + planKeys.length + ' plan keys purged!', 'success', 6000);
        const tabs = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills','esh-calendar-corp-drills'];
        if (state && tabs.includes(state.currentTab)) setTimeout(function() { try { renderEshCalendar(state.currentTab); } catch(e) {} }, 500);
    } catch(e) { console.error('Purge failed:', e); }
};

// eshPurgePlanKey: admin console utility — delete a single plan key from RTDB
window.eshPurgePlanKey = function(key) {
    if (!key.includes('|GLOBAL_PLAN|') || !key.endsWith('|plan')) {  return; }
    _eshRtdbWrite(key, null)
        .then(function() {  showToast && showToast('Plan key purged.', 'success', 3000); })
        .catch(function(e) { console.error('eshPurgePlanKey failed:', e); });
    _eshSaveLocal(key, null);
};


(function _eshLocalStorageHealthCheck() {
    try {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) total += (k.length + (localStorage.getItem(k) || '').length) * 2;
        }
        const usedKB = Math.round(total / 1024);
        if (usedKB > 7000) { // over ~7MB of 10MB — be more aggressive before hitting the wall
            const yr = String((window.state && window.state.selectedYear) || new Date().getFullYear());
            let freed = 0;
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (!k) continue;
                if (
                    (k.startsWith('esh_dashboard_') && !k.includes('_' + yr + '_')) ||
                    k === 'esh_login_logbook' || k === 'esh_audit_log' ||
                    k.startsWith('esh_projects_cache_') ||
                    k.startsWith('esh_session_loaded_')
                ) {
                    try { localStorage.removeItem(k); freed++; } catch(e){}
                }
            }
            // FIX: If esh_calendar_data is huge and localStorage is still near quota,
            // slim it down to plan keys + current-year keys only.
            // Non-plan, non-current-year keys (old actuals, other years) can be dropped —
            // they will be re-fetched from Firebase on the next onValue sync.
            if (usedKB > 7000) {
                try {
                    const raw = JSON.parse(localStorage.getItem('esh_calendar_data') || '{}');
                    const rawKeys = Object.keys(raw);
                    const calSizeKB = Math.round(JSON.stringify(raw).length * 2 / 1024);
                    if (calSizeKB > 2000) { // if calendar data alone is >2MB, slim it
                        const slim = {};
                        rawKeys.forEach(function(k) {
                            // Always keep current-year keys (Firebase will fill gaps)
                            if (k.startsWith(yr + '|')) { slim[k] = raw[k]; return; }
                            // Always keep plan keys regardless of year (they are small)
                            if (k.includes('|GLOBAL_PLAN|') && k.endsWith('|plan')) { slim[k] = raw[k]; return; }
                            // Drop everything else (old year actuals, etc.)
                        });
                        const slimKB = Math.round(JSON.stringify(slim).length * 2 / 1024);
                        localStorage.setItem('esh_calendar_data', JSON.stringify(slim));
                        freed += (rawKeys.length - Object.keys(slim).length);
                    }
                } catch(e2) {  }
            }
        }
    } catch(e) {}
})();
window.ESH_DRILLS = ESH_DRILLS;
window.ESH_TRAININGS = ESH_TRAININGS;

function getEshKey(tabType, projName, trainIdx, monthIdx, field) {
    const year = (state && state.selectedYear) || 2026;
    if (field === 'plan') {
        return `${year}|${tabType}|GLOBAL_PLAN|${trainIdx}|${monthIdx}|plan`;
    }
    return `${year}|${tabType}|${projName}|${trainIdx}|${monthIdx}|${field}`;
}

function getDrillStorageIdx(drill, arrayIdx) {
    if (drill._custom) return 500 + (drill._customIdx || 0);
    return (drill.id !== undefined) ? drill.id : arrayIdx;
}
window.getDrillStorageIdx = getDrillStorageIdx; // expose globally for render() access

function isMonthOverdue(monthIdx) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-based
    const selYear = (state && state.selectedYear) || curYear;
    return (selYear < curYear) || (selYear === curYear && monthIdx < curMonth);
}

function isMonthFuture(monthIdx) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-based
    const selYear = (state && state.selectedYear) || curYear;
    return (selYear > curYear) || (selYear === curYear && monthIdx > curMonth);
}

function getMaxDateForMonth(monthIdx) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const selYear = (state && state.selectedYear) || 2026;
    if (monthIdx === curMonth && curYear === selYear) {
        return today;
    }
    if (selYear < curYear || (selYear === curYear && monthIdx < curMonth)) {
        const lastDay = new Date(selYear, monthIdx + 1, 0).getDate();
        const mm = String(monthIdx + 1).padStart(2, '0');
        return selYear + '-' + mm + '-' + String(lastDay).padStart(2, '0');
    }
    return '';
}

function getMinDateForMonth(monthIdx) {
    const selYear = (state && state.selectedYear) || 2026;
    const mm = String(monthIdx + 1).padStart(2, '0');
    return selYear + '-' + mm + '-01';
}

// Confirm before SCHEDULING or UNSCHEDULING a plan cell (dashboard-themed dialog).
// The plan is global (shared by all projects/regions) and every planned month counts as a
// required item in the compliance rating, so one accidental click changes every region's rating.
// Returns a Promise<boolean>.
async function _eshConfirmPlanChange(tabType, ti, mi, nowPlanned) {
    const year = (state && state.selectedYear) || 2026;
    const monthName = (typeof ESH_MONTHS !== 'undefined' && ESH_MONTHS[mi]) ? ESH_MONTHS[mi] : ('Month ' + (mi + 1));
    const esc = function(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    // Best-effort item name (training/drill) for the message
    let itemName = '';
    try {
        if (tabType === 'esh-calendar-drills' && typeof ESH_DRILLS !== 'undefined') {
            const d = ESH_DRILLS.find(function(dr, i) { return getDrillStorageIdx(dr, i) === ti; });
            if (d) itemName = d.name || '';
        } else if (typeof ESH_TRAININGS !== 'undefined' && ESH_TRAININGS[tabType] && ESH_TRAININGS[tabType][ti]) {
            itemName = ESH_TRAININGS[tabType][ti];
        }
    } catch(e) {}
    const label = (itemName ? '<strong>' + esc(itemName) + '</strong><br>' : '') + esc(monthName) + ' ' + year;
    let title, msg, confirmText;
    if (nowPlanned) {
        title = 'Set plan?';
        confirmText = 'Schedule';
        msg = label + '<br><br>' +
              'This plan is shared by <strong>all projects and regions</strong>.<br>' +
              'It will count as a required item in the compliance rating of every region.';
    } else {
        title = 'Remove plan?';
        confirmText = 'Remove';
        const prefix = year + '|' + tabType + '|';
        const suffix = '|' + ti + '|' + mi + '|actual';
        const stor = getEshStorage();
        let n = 0;
        Object.keys(stor).forEach(function(k) {
            if (k.startsWith(prefix) && k.endsWith(suffix) && k.indexOf('|GLOBAL_PLAN|') === -1 && stor[k] && stor[k] !== '__DELETED__') n++;
        });
        msg = label + '<br><br>' +
              'This plan is shared by <strong>all projects and regions</strong>.<br>' +
              'It will no longer count in the compliance rating of any region.<br><br>' +
              (n > 0 ? n + ' actual date(s) already entered will be hidden (not deleted). They come back if you schedule this month again.'
                     : 'No actual dates are entered for this month yet.');
    }
    window._eshConfirmDialogOpen = true; // pause the realtime re-render while the dialog is open
    let ok = false;
    try {
        if (typeof showModernDialog === 'function') {
            ok = await showModernDialog(title, msg, !nowPlanned, confirmText, 'Cancel');
        } else {
            ok = confirm(title + '\n\n' + msg.replace(/<br>/g, '\n').replace(/<[^>]+>/g, ''));
        }
    } finally { window._eshConfirmDialogOpen = false; }
    return ok;
}

function eshCanEdit(tabType, projectRegion) {
    const email = state && state.currentUser ? state.currentUser.email : null;
    if (!email) return false;
    const info = UserAccounts.getUserInfo(email);

    // Admin: can set GLOBAL_PLAN on all regions in ESH calendar tabs
    // Data entry (actuals) is still restricted to CORPORATE only per RBAC Matrix v2
    if (info.role === 'admin') {
        const _adminReg = (projectRegion || '').trim().toUpperCase();
        if (tabType === 'esh-calendar-corp-drills') return true; // corp-drills is admin-managed
        if (!projectRegion) return true;
        // Admin can set plan/schedule globally across all regions in ESH calendar
        const _eshCalPlanTabs = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills'];
        if (_eshCalPlanTabs.includes(tabType)) return true;
        return _adminReg === 'CORPORATE';
    }

    // Corporate region and Corp Drills are always admin-only
    if (projectRegion === 'CORPORATE') return false;
    if (tabType === 'esh-calendar-corp-drills') return false;

    // Managers are always view-only
    if (info.role === 'manager') return false;

    if (info.role === 'superintendent') {
        return info.region === projectRegion;
    }

    if (info.role === 'pco') {
        const pcoAllowed = ['esh-calendar-env'];
        return pcoAllowed.includes(tabType) && info.region === projectRegion;
    }

    if (info.role === 'envi_head') {
        return tabType === 'esh-calendar-env';
    }

    if (info.role === 'corp_nurse') {
        return tabType === 'esh-calendar-health';
    }

    return false;
}

const _eshRegionProjectIdx = {};

function eshGetRegionKey(tabType, region) { return tabType + '|' + region; }

function tabNavProject(tabType, region, delta) {
    const key = _tabNavKey(tabType, region);
    const allProjects = (state && (state.filteredProjects || state.projects)) ? (state.filteredProjects || state.projects) : [];
    const regProjs = allProjects.filter(p => p.region === region);
    if (!regProjs.length) return;
    let cur = _tabRegionProjectIdx[key] || 0;
    cur = Math.max(0, Math.min(regProjs.length - 1, cur + delta));
    _tabRegionProjectIdx[key] = cur;
    if (tabType === 'health-report' && typeof renderHealthReport === 'function') {
        renderHealthReport();
    } else if (tabType === 'lta-registry' && typeof renderLtaRegistryTab === 'function') {
        renderLtaRegistryTab();
    } else if (tabType === 'nov' && typeof renderOshNovTab === 'function') {
        renderOshNovTab();
    } else if (tabType === 'nov-env' && typeof window.renderNovEnvTab === 'function') {
        window.renderNovEnvTab();
    } else if (tabType === 'env-monitoring' && typeof envRenderRegions === 'function') {
        envRenderRegions();
    } else if (tabType === 'waste' && typeof wasteRenderRegions === 'function') {
        wasteRenderRegions();
        wasteUpdateSummary();
    } else if (tabType === 'water' && typeof waterRenderRegions === 'function') {
        waterRenderRegions();
        waterUpdateSummary();
    } else if (tabType === 'fuel' && typeof fuelRenderRegions === 'function') {
        fuelRenderRegions();
        fuelUpdateSummary();
    } else if (typeof render === 'function') {
        render();
    }
}
window.tabNavProject = tabNavProject;

// Project card + region total sit flush inside the region card (banner and table read as one block).
function _tabProjCardStyle() { return 'overflow:hidden;'; }
window._tabProjCardStyle = _tabProjCardStyle;

// ONE region banner for every monitoring tab. Uses the SAME markup/classes as every other tab (.region-banner.region-<slug>),
// so subtitle, VISMIN label, padlock, colors and dark mode all come from the shared CSS.
// o: { key ('env'|'wtr'|'fl'|'waste'|'appl' = id prefix), toggle (fn name), region, rk, rc (colors), projCount,
//      chips [{text, kind:'a'|'b'}], right (extra html before chevron), open, editable, viewOnly, body (omit to leave the body open) }
function _tabRegionBanner(o) {
    const rc = o.rc;
    const isCorpPlant = o.region === 'CORPORATE' || o.region === 'PLANT OPERATIONS';
    const col = o.open ? '' : ' collapsed';
    const chip = (c) => `<span class="rbadge rbadge-count"${c.kind === 'b' ? ' style="background:rgba(100,255,100,0.2);color:#c8f7c5;"' : ''}>${c.text}</span>`;
    const n = o.projCount;
    const strip = o.viewOnly
        ? `<div style="padding:9px 14px;background:${rc.light};border-bottom:none;display:flex;align-items:center;gap:7px;font-size:0.71rem;color:${rc.bg};font-weight:600;">${window.icon('lock')} This region is <strong>view-only</strong> for your account.</div>`
        : '';
    const head = window.regionBanner({ id: `${o.key}-region-banner-${o.rk}`, reg: o.region, toggle: o.toggle, collapsed: !o.open, editable: o.editable,
        right: (isCorpPlant ? '' : `<span class="rbadge rbadge-count rb-proj">${n} PROJECT${n !== 1 ? 'S' : ''}</span>`) + (o.chips || []).filter(Boolean).map(chip).join('') + (o.right || '') })
        + `<div id="${o.key}-region-body-${o.rk}" class="region-content${col}" style="background:var(--bg-card);">${strip}`;
    return o.body === undefined ? head : head + o.body + '</div>';
}
window._tabRegionBanner = _tabRegionBanner;

// Open/close a banner made by _tabRegionBanner (same collapse animation as regionToggle in core-helpers.js).
function _tabRegionSetOpen(key, rk, open) {
    const b = document.getElementById(key + '-region-banner-' + rk), c = document.getElementById(key + '-region-body-' + rk);
    if (!b || !c) return;
    clearTimeout(c._rhT);
    if (!open) {
        c.style.height = c.offsetHeight + 'px'; void c.offsetHeight;
        c.classList.add('collapsed'); c.style.height = '0px'; b.classList.add('collapsed');
    } else {
        c.classList.remove('collapsed'); c.style.height = '0px';
        const t = c.scrollHeight + (c.offsetHeight - c.clientHeight); void c.offsetHeight;
        c.style.height = t + 'px'; c._rhT = setTimeout(function () { c.style.height = ''; }, 300); b.classList.remove('collapsed');
    }
}
window._tabRegionSetOpen = _tabRegionSetOpen;

// Clamp + store the current project index for a tab/region. Returns the index.
function _tabProjIdx(tabType, region, projs) {
    const k = _tabNavKey(tabType, region);
    const i = Math.max(0, Math.min(projs.length - 1, _tabRegionProjectIdx[k] || 0));
    _tabRegionProjectIdx[k] = i;
    return i;
}
window._tabProjIdx = _tabProjIdx;

// ONE project header for every monitoring tab (Electricity, Water, Waste, Appliances, Fuel).
// Prev | centered project name + status + "Project X of Y" | Next. No icons, no counts.
// o: { tabType, region, projs, idx, proj, color, status (true = project status badge | html string | falsy) }
function _tabProjHeader(o) {
    const c = o.color || '#1b5e20';
    const multi = o.projs.length > 1;
    const st = o.proj.status;
    const statusHtml = o.status === true
        ? (!st || st === 'on-going' ? '' : `<span style="background:${st==='on-hold'?'#fff3e0':'#e8f5e9'};color:${st==='on-hold'?'#e65100':'#2e7d32'};padding:1px 8px;border-radius:10px;font-size:0.62rem;font-weight:700;">${st}</span>`)
        : (o.status || '');
    const sub = multi ? `<div style="font-size:0.6rem;font-weight:600;color:#888;margin-top:2px;">Project ${o.idx + 1} of ${o.projs.length}</div>` : '';
    return `<div style="background:linear-gradient(90deg,${c}22,${c}11);padding:8px 14px;display:flex;align-items:center;gap:8px;border-bottom:none;">
        <div style="flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:flex-start;">${multi ? _tabNavBtn(o.tabType, o.region, -1, o.idx, o.projs.length) : ''}</div>
        <div style="flex:0 1 auto;min-width:0;text-align:center;">
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;">
                <span style="font-weight:700;font-size:0.76rem;color:${c};">${o.proj.name}</span>
                ${statusHtml}
            </div>
            ${sub}
        </div>
        <div style="flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:8px;">${multi ? _tabNavBtn(o.tabType, o.region, 1, o.idx, o.projs.length) : ''}</div>
    </div>`;
}
window._tabProjHeader = _tabProjHeader;

function _tabNavBar(tabType, region, projIdx, regProjsLen) {
    if (regProjsLen <= 1) return '';
    const allP = (state && (state.filteredProjects || state.projects)) ? (state.filteredProjects || state.projects) : [];
    const proj = allP.filter(p => p.region === region)[projIdx];
    const projName = proj ? proj.name : '';
    return `<div class="proj-nav-bar" style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:#e8f5e9;border-bottom:2px solid #c8e6c9;border-radius:0 0 0 0;">
        <button onclick="tabNavProject('${tabType.replace(/'/g,"\\'")}','${region.replace(/'/g,"\\'")}', -1)" ${projIdx===0?'disabled':''} style="background:${projIdx===0?'#ccc':'#f9a825'};color:#000;border:none;border-radius:6px;padding:5px 14px;font-size:0.72rem;font-weight:700;cursor:${projIdx===0?'not-allowed':'pointer'};opacity:${projIdx===0?'0.4':'1'};">
            <i class="fas fa-chevron-left"></i> Prev
        </button>
        <div style="text-align:center;">
            <div style="font-size:0.72rem;font-weight:800;color:#1b5e20;">
                <i class="fas fa-building" style="margin-right:5px;"></i>${projName}
            </div>
            <div style="font-size:0.62rem;color:#888;margin-top:2px;">Project ${projIdx+1} of ${regProjsLen}</div>
        </div>
        <button onclick="tabNavProject('${tabType.replace(/'/g,"\\'")}','${region.replace(/'/g,"\\'")}', 1)" ${projIdx===regProjsLen-1?'disabled':''} style="background:${projIdx===regProjsLen-1?'#ccc':'#f9a825'};color:#000;border:none;border-radius:6px;padding:5px 14px;font-size:0.72rem;font-weight:700;cursor:${projIdx===regProjsLen-1?'not-allowed':'pointer'};opacity:${projIdx===regProjsLen-1?'0.4':'1'};">
            Next <i class="fas fa-chevron-right"></i>
        </button>
    </div>`;
}
window._tabNavBar = _tabNavBar;

// Prev/Next button placed inside the project card (dir: -1 = Prev, 1 = Next)
function _tabNavBtn(tabType, region, dir, projIdx, regProjsLen) {
    const isPrev = dir < 0;
    const off = isPrev ? projIdx === 0 : projIdx === regProjsLen - 1;
    const t = tabType.replace(/'/g, "\\'");
    const r = region.replace(/'/g, "\\'");
    return `<button onclick="event.stopPropagation();${tabType === 'appliances' ? `appliancesNavProject('${r}', ${dir})` : `tabNavProject('${t}','${r}', ${dir})`}" ${off ? 'disabled' : ''} style="flex-shrink:0;white-space:nowrap;background:${off ? '#ccc' : '#f9a825'};color:#000;border:none;border-radius:6px;padding:5px 14px;font-size:0.72rem;font-weight:700;cursor:${off ? 'not-allowed' : 'pointer'};opacity:${off ? '0.4' : '1'};">${isPrev ? '<i class="fas fa-chevron-left"></i> Prev' : 'Next <i class="fas fa-chevron-right"></i>'}</button>`;
}
window._tabNavBtn = _tabNavBtn;

function eshNavigateProject(tabType, region, delta) {
    const key = eshGetRegionKey(tabType, region);
    const allProjects = (state && state.projects) ? state.projects.filter(p => (p.status || '').toLowerCase() !== 'finished') : [];
    const regProjects = allProjects.filter(p => p.region === region);
    if (!regProjects.length) return;
    let cur = _eshRegionProjectIdx[key] || 0;
    cur = Math.max(0, Math.min(regProjects.length - 1, cur + delta));
    _eshRegionProjectIdx[key] = cur;
    eshRenderRegionTable(tabType, region, regProjects, cur);
}
window.eshNavigateProject = eshNavigateProject;

function eshToggleRegion(regionId) {
    const contentEl = document.getElementById(regionId);
    const icon = document.getElementById(regionId + '-icon');
    if (!contentEl) return;
    const wasCollapsed = contentEl.style.display === 'none';
    contentEl.style.display = wasCollapsed ? '' : 'none';
    if (icon) icon.style.transform = wasCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
    const banner = contentEl.previousElementSibling;
    if (banner) banner.style.borderRadius = wasCollapsed ? '8px 8px 0 0' : '8px';

    if (wasCollapsed) {
        const allProjects = (state && state.projects) ? state.projects.filter(p => (p.status || '').toLowerCase() !== 'finished') : [];
        const regionOrder = ["CORPORATE", "NCR", "SOUTH LUZON", "NORTH LUZON", "VISAYAS & MINDANAO"];
        const tabTypes = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills','esh-calendar-corp-drills'];
        tabTypes.forEach(function(tabType) {
            regionOrder.forEach(function(region) {
                const safeRegion = region.replace(/[^a-z0-9]/gi, '_');
                const expectedId = tabType + '-' + safeRegion + '-content';
                if (expectedId === regionId) {
                    const regProjects = allProjects.filter(function(p) { return p.region === region; });
                    if (!regProjects.length) return;
                    const projIdx = _eshRegionProjectIdx[eshGetRegionKey(tabType, region)] || 0;
                    eshRenderRegionTable(tabType, region, regProjects, projIdx);
                }
            });
        });
    }
}
window.eshToggleRegion = eshToggleRegion;

function eshRenderRegionTable(tabType, region, regProjects, projIdx) {
    const isDrills = tabType === 'esh-calendar-drills';
    const col = TAB_COLORS[tabType] || TAB_COLORS['esh-calendar-env'];
    const trainings = ESH_TRAININGS[tabType] || [];
    const storage = getEshStorage();
    const proj = regProjects[projIdx];
    const safeRegion = region.replace(/[^a-z0-9]/gi,'_');
    const tableContainerId = tabType + '-' + safeRegion + '-table';
    const container = document.getElementById(tableContainerId);
    if (!container || !proj) return;

    const navHtml = `
        <div class="proj-nav-bar" style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:#e8f5e9;border-bottom:1px solid #c8e6c9;">
            <button onclick="eshNavigateProject('${tabType}','${region}',-1)" ${projIdx===0?'disabled':''} style="background:${projIdx===0?'#ccc':'#f9a825'};color:#000;border:none;border-radius:6px;padding:5px 14px;font-size:0.72rem;font-weight:700;opacity:${projIdx===0?'0.4':'1'};">
                <i class="fas fa-chevron-left"></i> Prev
            </button>
            <div style="text-align:center;">
                <div style="font-size:0.72rem;font-weight:800;color:#1b5e20;">
                    <i class="fas fa-building" style="margin-right:5px;"></i>${proj.name}
                </div>
                <div style="font-size:0.62rem;color:#888;margin-top:2px;">Project ${projIdx+1} of ${regProjects.length}${(function(){
                    const _po = ((window._eshOverdueByProj || {})[tabType] || {})[proj.name] || 0;
                    return _po > 0 ? ' <span style="background:#fdecec;color:#c62828;padding:1px 8px;border-radius:9px;font-weight:800;margin-left:6px;">' + _po + ' overdue</span>' : '';
                })()}</div>
            </div>
            <button onclick="eshNavigateProject('${tabType}','${region}',1)" ${projIdx===regProjects.length-1?'disabled':''} style="background:${projIdx===regProjects.length-1?'#ccc':'#f9a825'};color:#000;border:none;border-radius:6px;padding:5px 14px;font-size:0.72rem;font-weight:700;opacity:${projIdx===regProjects.length-1?'0.4':'1'};">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        </div>`;

    let tableHtml = '';
    if (isDrills) {
        tableHtml = buildDrillsSingleTable([proj], storage, col);
    } else {
        tableHtml = buildTrainingSingleTable(tabType, [proj], trainings, storage, col);
    }

    const existingWrapper = container.querySelector('div[style*="overflow-x"]');
    const savedScrollLeft = existingWrapper ? existingWrapper.scrollLeft : 0;

    container.innerHTML = navHtml + `<div class="esh-table-scroll" style="overflow-x:auto;">${tableHtml}</div>`;

    if (savedScrollLeft > 0) {
        const newWrapper = container.querySelector('.esh-table-scroll');
        if (newWrapper) newWrapper.scrollLeft = savedScrollLeft;
    }
}
window.eshRenderRegionTable = eshRenderRegionTable;

function renderEshCalendar(tabType) {
    if (tabType === 'esh-calendar-corp-drills') {
        try { if (typeof renderCorpDrillsTab === 'function') renderCorpDrillsTab(); } catch(err) {
            console.error('❌ renderCorpDrillsTab crashed:', err);
        }
        return;
    }
    const viewId = tabType + '-view';
    const container = document.getElementById(viewId);
    if (!container) return;

    const col = TAB_COLORS[tabType] || TAB_COLORS['esh-calendar-env'];
    const regionOrder = ["NCR", "SOUTH LUZON", "NORTH LUZON", "VISAYAS & MINDANAO"];
    const allProjects = (state && state.projects) ? state.projects.filter(p => (p.status || '').toLowerCase() !== 'finished') : [];


    const _ss = getEshStorage();
    const _ssYear = (state && state.selectedYear) || new Date().getFullYear();
    const _ssNow = new Date();
    const _ssCurMonth = _ssNow.getMonth();
    const _ssCurYear  = _ssNow.getFullYear();
    const _ssIsDrills = (tabType === 'esh-calendar-drills');
    const _ssTrainings = ESH_TRAININGS[tabType] || [];
    const _ssDrills    = (typeof ESH_DRILLS !== 'undefined') ? ESH_DRILLS : [];
    const _ssAllProjs  = (state && state.projects)
        ? state.projects.filter(p => p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS' && (p.status || '').toLowerCase() !== 'finished')
        : [];

    function _ssMonthOverdue(mi) {
        return (_ssYear < _ssCurYear) || (_ssYear === _ssCurYear && mi < _ssCurMonth);
    }

    const _ssRegionMap = {};
    _ssAllProjs.forEach(proj => {
        let oc = 0, tp = 0;
        if (_ssIsDrills) {
            _ssDrills.forEach((drill, di) => {
                for (let mi = 0; mi < 12; mi++) {
                    if (isMonthBlacklistedForProject(proj, mi + 1, _ssYear)) continue; // work stoppage — skip
                    const pk = `${_ssYear}|esh-calendar-drills|GLOBAL_PLAN|${di}|${mi}|plan`;
                    if (!_ss[pk] || !_ssMonthOverdue(mi)) continue;
                    tp++;
                    const ak = `${_ssYear}|esh-calendar-drills|${proj.name}|${di}|${mi}|actual`;
                    if (!_ss[ak]) oc++;
                }
            });
        } else {
            const _OSH8HR_LABEL = '8-Hr Mandatory OSH Training';
            _ssTrainings.forEach((t, ti) => {
                for (let mi = 0; mi < 12; mi++) {
                    if (isMonthBlacklistedForProject(proj, mi + 1, _ssYear)) continue; // work stoppage — skip
                    // ── 8-Hr OSH N/A: skip months from activation onwards ──
                    if (t === _OSH8HR_LABEL) {
                        const _naK = `${_ssYear}|${tabType}|${proj.name}|${ti}|na_row`;
                        const _naFrom = _ss[_naK] !== undefined ? parseInt(_ss[_naK]) : -1;
                        if (_naFrom >= 0 && mi >= _naFrom) continue; // exempt
                    }
                    const pk = `${_ssYear}|${tabType}|GLOBAL_PLAN|${ti}|${mi}|plan`;
                    if (!_ss[pk] || !_ssMonthOverdue(mi)) continue;
                    tp++;
                    const ak = `${_ssYear}|${tabType}|${proj.name}|${ti}|${mi}|actual`;
                    if (!_ss[ak]) oc++;
                }
            });
        }
        if (oc > 0) {
            if (!_ssRegionMap[proj.region]) _ssRegionMap[proj.region] = [];
            _ssRegionMap[proj.region].push({ name: proj.name, overdueCount: oc, totalPlanned: tp });
        }
    });

    // Overdue counts are shown as badges (region banner + project nav). The old Overdue Summary table was removed.
    window._eshOverdueByProj = window._eshOverdueByProj || {};
    window._eshOverdueByProj[tabType] = {};
    Object.keys(_ssRegionMap).forEach(function(r) {
        _ssRegionMap[r].forEach(function(pr) { window._eshOverdueByProj[tabType][pr.name] = pr.overdueCount; });
    });
    const _ssRegionOrder  = ['NCR','SOUTH LUZON','NORTH LUZON','VISAYAS & MINDANAO'];
    const _ssRegionColors = { 'NCR':'#1565c0','SOUTH LUZON':'#2e7d32','NORTH LUZON':'#e65100','VISAYAS & MINDANAO':'#6a1b9a' };
    const _ssTotalProjs   = Object.values(_ssRegionMap).reduce((s,a) => s + a.length, 0);
    const _ssTypeLabel    = _ssIsDrills ? 'drills' : 'trainings';
    const _ssDateStr      = _ssNow.toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' });

    let _ssHtml = '';
    if (_ssTotalProjs === 0) {
        _ssHtml = `<div class="esh-sum-allclear">
            <i class="fas fa-circle-check"></i>
            <div>
                <div class="ac-txt">${window.icon("ok")} All Clear — No Overdue ${col.label} Found</div>
                <div class="ac-sub">All planned ${_ssTypeLabel} up to this month have been completed, or none are scheduled yet.</div>
            </div>
        </div>`;
    } else {
        let _ssAccordion = '';
        _ssRegionOrder.forEach((rgn, ri) => {
            const projs = _ssRegionMap[rgn];
            if (!projs || !projs.length) return;
            const rcolor  = _ssRegionColors[rgn] || '#1b5e20';
            const rId     = 'esh-sum-rgn-' + tabType.replace(/[^a-z0-9]/gi,'_') + '-' + ri;
            projs.sort((a,b) => b.overdueCount - a.overdueCount);
            const maxOc   = projs[0].overdueCount;
            const rgnTotal = projs.reduce((s,p) => s + p.overdueCount, 0);

            const rows = projs.map(p => `<tr>
                <td class="td-proj">${p.name}</td>
                <td class="td-num">${p.overdueCount}</td>
                <td class="td-bar">
                    <div class="bar-bg"><div class="bar-fill" style="width:${Math.max(8, Math.round(p.overdueCount / maxOc * 100))}%;"></div></div>
                </td>
                <td><span class="td-tag"><i class="fas fa-circle-exclamation" style="font-size:0.55rem;"></i> Action Needed</span></td>
            </tr>`).join('');

            _ssAccordion += `
            <div class="esh-sum-rgn-hdr" id="${rId}-hdr" onclick="(function(){
                var h=document.getElementById('${rId}-hdr');
                var b=document.getElementById('${rId}-body');
                var open=b.classList.toggle('open');
                h.classList.toggle('open',open);
            })()">
                <div class="rgn-dot" style="background:${rcolor};"></div>
                <div class="rgn-name"><i class="fas fa-location-dot" style="margin-right:5px;color:${rcolor};font-size:0.6rem;"></i>${rgn}</div>
                <div class="rgn-badge">${projs.length} project${projs.length !== 1 ? 's' : ''} &nbsp;·&nbsp; ${rgnTotal} overdue</div>
                <i class="fas fa-chevron-down rgn-chevron"></i>
            </div>
            <div class="esh-sum-tbl-wrap" id="${rId}-body">
                <table class="esh-sum-tbl">
                    <thead><tr>
                        <th>Project Name</th>
                        <th style="text-align:center;min-width:60px;">Overdue</th>
                        <th style="min-width:90px;">Load</th>
                        <th>Status</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        });

        _ssHtml = `<div class="esh-sum-wrap">
            <div class="esh-sum-kpm-hdr">
                <i class="fas fa-triangle-exclamation sum-icon"></i>
                <div>
                    <div class="sum-title">Overdue Summary — ${_ssYear} ESH Calendar: ${col.label}</div>
                    <div class="sum-sub">Scheduled ${_ssTypeLabel} with no recorded completion as of ${_ssDateStr} · Click a region to expand</div>
                </div>
                <div class="sum-total-pill">
                    <div class="snum">${_ssTotalProjs}</div>
                    <div class="slbl">Projects</div>
                </div>
            </div>
            ${_ssAccordion}
            <div class="esh-sum-footer">
                <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#ffcdd2;display:inline-block;"></span>Only planned ${_ssTypeLabel} without a recorded actual date are counted as overdue.</span>
            </div>
        </div>`;
    }

    let html = `<div class="esh-cal-wrap">
        ${(function() {
            const _rbacEmail = state && state.currentUser ? state.currentUser.email : null;
            if (!_rbacEmail || !window.UserAccounts) return '';
            const _rbacInfo = window.UserAccounts.getUserInfo(_rbacEmail);
            if (_rbacInfo.role === 'admin') return '';
            const _isCorpDrills = (tabType === 'esh-calendar-corp-drills');
            const _tabLabels = {
                'esh-calendar-env':    'Environment Trainings',
                'esh-calendar-safety': 'Safety Trainings',
                'esh-calendar-health': 'Health Awareness',
                'esh-calendar-drills': 'Emergency Drills',
                'esh-calendar-corp-drills': 'Corporate Drills'
            };
            const _tabLabel = _tabLabels[tabType] || tabType;

            // Determine access for this tab/role
            let _rbacIcon = 'fa-lock', _rbacColor = '#c62828', _rbacBg = '#ffebee', _rbacBorder = '#ef9a9a';
            let _rbacTitle = '', _rbacSub = '', _canEditAny = false;

            if (_rbacInfo.role === 'superintendent') {
                _canEditAny = true;
                _rbacIcon = 'fa-pen-to-square'; _rbacColor = '#1565c0'; _rbacBg = '#e3f2fd'; _rbacBorder = '#90caf9';
                _rbacTitle = `✏️ Editable — ${_tabLabel}`;
                _rbacSub = `You can edit records for your region: <strong>${_rbacInfo.region}</strong>. Other regions are read-only.`;
            } else if (_rbacInfo.role === 'pco') {
                _canEditAny = (tabType === 'esh-calendar-env');
                if (_canEditAny) {
                    _rbacIcon = 'fa-pen-to-square'; _rbacColor = '#00695c'; _rbacBg = '#e0f2f1'; _rbacBorder = '#80cbc4';
                    _rbacTitle = `✏️ Editable — ${_tabLabel}`;
                    _rbacSub = `PCO access: You can enter actual dates for your region: <strong>${_rbacInfo.region}</strong>.`;
                } else {
                    _rbacTitle = `🔒 Read-Only — ${_tabLabel}`;
                    _rbacSub = `PCO accounts can only edit the <strong>Environment Trainings</strong> tab. All other calendar tabs are view-only.`;
                }
            } else if (_rbacInfo.role === 'envi_head') {
                _canEditAny = (tabType === 'esh-calendar-env');
                if (_canEditAny) {
                    _rbacIcon = 'fa-pen-to-square'; _rbacColor = '#00695c'; _rbacBg = '#e0f2f1'; _rbacBorder = '#80cbc4';
                    _rbacTitle = `✏️ Editable — ${_tabLabel}`;
                    _rbacSub = `Environmental Head: Full read/write access to all regions for this tab.`;
                } else {
                    _rbacTitle = `🔒 Read-Only — ${_tabLabel}`;
                    _rbacSub = `Environmental Head can only edit the <strong>Environment Trainings</strong> tab. All other calendar tabs are view-only.`;
                }
            } else if (_rbacInfo.role === 'corp_nurse') {
                _canEditAny = (tabType === 'esh-calendar-health');
                if (_canEditAny) {
                    _rbacIcon = 'fa-pen-to-square'; _rbacColor = '#ad1457'; _rbacBg = '#fce4ec'; _rbacBorder = '#f48fb1';
                    _rbacTitle = `✏️ Editable — ${_tabLabel}`;
                    _rbacSub = `Corporate Nurse: Full read/write access to all regions for this tab.`;
                } else {
                    _rbacColor = '#880e4f'; _rbacBg = '#fce4ec'; _rbacBorder = '#f48fb1';
                    _rbacTitle = `🔒 Read-Only — ${_tabLabel}`;
                    _rbacSub = `Corporate Nurse can only edit the <strong>Health Awareness</strong> tab. All other calendar tabs are view-only.`;
                }
            } else if (_rbacInfo.role === 'manager') {
                _rbacTitle = `👁️ View-Only — ${_tabLabel}`;
                _rbacSub = `Manager accounts can view all data but cannot make any changes.`;
            } else {
                _rbacTitle = `🔒 Read-Only — ${_tabLabel}`;
                _rbacSub = `Your account does not have edit access to this tab. Contact an Admin if you need write access.`;
            }

            return '';
        })()}
        <div class="esh-cal-legend" style="flex-wrap:wrap;gap:10px 18px;">
            <span style="font-weight:700;color:var(--text-primary);font-size:0.72rem;">FREQUENCY:</span>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#b3d9f7;border:1px solid #7ab8e8;"></div> Once a Year (Pastel Blue)</div>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#fff9b0;border:1px solid #e0d44a;"></div> Twice a Year (Pastel Yellow)</div>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#b8f0c0;border:1px solid #6bc97a;"></div> Quarterly (Pastel Green)</div>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#c8c8c8;border:1px solid #999;"></div> N/A – Not Applicable (Grey)</div>
            <div style="width:1px;background:#ddd;align-self:stretch;"></div>
            <span style="font-weight:700;color:var(--text-primary);font-size:0.72rem;">STATUS:</span>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#f9a825;"></div> Planned</div>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#2e7d32;"></div> Completed</div>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#c62828;"></div> Overdue</div>

        </div>
    `;

    const corpProj = allProjects.find(p => p.region === 'CORPORATE');
    const regularProjects = allProjects.filter(p => p.region !== 'CORPORATE' && p.region !== 'PLANT OPERATIONS' && (p.status || '').toLowerCase() !== 'finished');

    if (regularProjects.length === 0 && !corpProj) {
        html += `<div class="esh-no-projects">
            <i class="fas fa-folder-open" style="font-size:2rem;margin-bottom:10px;opacity:0.3;display:block;"></i>
            <strong>No projects found.</strong><br>
            <span style="font-size:0.75rem;">Add projects via the Overall Summary to see them here.</span>
        </div>`;
    }

    regionOrder.forEach(region => {
        const regProjects = regularProjects.filter(p => p.region === region);
        if (regProjects.length === 0) return;
        const safeRegion = region.replace(/[^a-z0-9]/gi,'_');
        const regionContentId = tabType + '-' + safeRegion + '-content';
        const regionIconId = tabType + '-' + safeRegion + '-icon';
        const tableContainerId = tabType + '-' + safeRegion + '-table';
        const projIdx = _eshRegionProjectIdx[eshGetRegionKey(tabType, region)] || 0;

        const _eshCanEditRegion = eshCanEdit(tabType, region);
        html += `
        <div class="esh-region-block">
            ${window.regionBanner({ id: `esh-banner-${tabType}-${safeRegion}`, reg: region, icon: 'fa-location-dot', onclick: `eshToggleRegion('${regionContentId}')`, collapsed: true, editable: _eshCanEditRegion, style: 'margin:0;border-radius:10px;',
                iconAttrs: `id="${regionIconId}" style="transform:rotate(-90deg);"`,
                right: `<span class="rbadge rbadge-count rb-proj">${regProjects.length} PROJECT${regProjects.length!==1?'S':''}</span>` + (function(){
                    const _ovd = (_ssRegionMap[region] || []).reduce(function(a, x){ return a + x.overdueCount; }, 0);
                    return _ovd > 0
                        ? '<span class="rbadge rbadge-avg" title="Planned ' + _ssTypeLabel + ' with no recorded actual date"><span class="rb-dot rb-dot-low"></span>' + _ovd + ' OVERDUE</span>'
                        : '';
                })() })}
            <div id="${regionContentId}" class="esh-region-content" style="display:none;">
                <div id="${tableContainerId}"></div>
            </div>
        </div>`;
    });

    html += `</div>`;
    // ── Preserve open/closed UI state across re-render (global Edit/Save triggers a rebuild) ──
    const _eshOpenRegions = [];
    const _eshOpenSumRgns = [];
    container.querySelectorAll('.esh-region-content').forEach(function(el) {
        if (el.id && el.style.display !== 'none') _eshOpenRegions.push(el.id);
    });
    container.querySelectorAll('.esh-sum-tbl-wrap.open').forEach(function(el) {
        if (el.id) _eshOpenSumRgns.push(el.id);
    });
    container.innerHTML = html;
    // ── Restore previously opened regions / summary accordions ──
    _eshOpenRegions.forEach(function(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = '';
        const icon = document.getElementById(id.replace(/-content$/, '-icon'));
        if (icon) icon.style.transform = 'rotate(0deg)';
        const banner = el.previousElementSibling;
        if (banner) banner.style.borderRadius = '8px 8px 0 0';
    });
    _eshOpenSumRgns.forEach(function(id) {
        const b = document.getElementById(id);
        const h = document.getElementById(id.replace(/-body$/, '-hdr'));
        if (b) b.classList.add('open');
        if (h) h.classList.add('open');
    });

    regionOrder.forEach(region => {
        const regProjects = regularProjects.filter(p => p.region === region);
        if (regProjects.length === 0) return;
        const projIdx = _eshRegionProjectIdx[eshGetRegionKey(tabType, region)] || 0;
        eshRenderRegionTable(tabType, region, regProjects, projIdx);
    });
}

function buildTrainingSingleTable(tabType, projects, trainings, storage, col) {
    const canEdit = projects.length > 0 ? eshCanEdit(tabType, projects[0].region) : false;
    const isAdmin = !!(state && state.isAdmin);
    // RBAC: Admin can ONLY set Plan. Only Superintendent can input Actual dates.
    const canEditActual = !isAdmin && canEdit;
    // N/A: Superintendent only (Admin cannot set N/A on actual-input tabs)
    const _canSetNA = !!(state && state.userRole === 'superintendent');
    const customRows = (typeof getEshCustomRows === 'function') ? getEshCustomRows(tabType, projects[0] ? projects[0].name : '') : [];
    const allTrainings = [
        ...trainings.map(t => ({ label: t, isCustom: false })),
        ...customRows.map((r, i) => ({ label: typeof r === 'string' ? r : r.name, isCustom: true, customIdx: i }))
    ];

    const OSH_8HR_LABEL = '8-Hr Mandatory OSH Training';
    let html = `<table class="esh-table esh-plain">
        <thead>
            <tr>
                <th class="esh-th-name" rowspan="2">Training / Awareness</th>`;
    ESH_MONTHS.forEach(m => {
        html += `<th colspan="2" style="text-align:center;border-left:2px solid rgba(255,255,255,0.15);">${m.substring(0,3)}</th>`;
    });
    html += `</tr><tr>`;
    ESH_MONTHS.forEach(() => {
        html += `<th class="esh-th-plan">Plan</th><th class="esh-th-actual">Actual</th>`;
    });
    html += `</tr></thead><tbody>`;

    projects.forEach(proj => {
        allTrainings.forEach((trainingObj, ti) => {
            const trainingLabel = trainingObj.label;
            const isCustomEntry = trainingObj.isCustom;
            const customIdx = trainingObj.customIdx;
            const storageIdx = isCustomEntry ? (500 + customIdx) : ti;

            html += `<tr><td class="esh-td-name">
                ${isCustomEntry ? '<span style="background:#e8f5e9;color:#1b5e20;border-radius:4px;font-size:0.55rem;font-weight:700;padding:1px 5px;margin-right:5px;vertical-align:middle;">CUSTOM</span>' : ''}
                ${trainingLabel}
                ${(isCustomEntry && isAdmin) ? `<button onclick="eshDeleteCustomRow('${tabType}','${projects[0]?projects[0].name.replace(/'/g,"\\'"):''}',${customIdx})" title="Remove this row" style="float:right;background:none;border:none;color:#c62828;cursor:pointer;font-size:0.75rem;padding:0 3px;opacity:0.6;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6"><i class="fas fa-trash"></i></button>` : ''}
            </td>`;
            ESH_MONTHS.forEach((m, mi) => {
                // ── Work Stoppage: gray out the month cell ──────────────────
                const _eshSelYr = (state && state.selectedYear) || new Date().getFullYear();
                const _wsBlocked = (typeof isMonthBlacklistedForProject === 'function')
                    && isMonthBlacklistedForProject(proj, mi + 1, _eshSelYr);
                if (_wsBlocked) {
                    const _notYetStarted = (typeof isMonthBeforeProjectStart === 'function') && isMonthBeforeProjectStart(proj, mi + 1, _eshSelYr);
                    const _wsTip = getMonthExemptTip(proj, mi + 1, _eshSelYr).replace(/"/g, '&quot;');
                    html += `<td class="esh-td-plan esh-plan-locked" style="background:#e0e0e0 !important;cursor:not-allowed;" title="${_wsTip}"></td>`;
                    html += `<td class="esh-td-actual" style="background:#e0e0e0 !important;cursor:not-allowed;" title="${_wsTip}"></td>`;
                    return;
                }

                // ── 8-Hr OSH N/A: per-month toggle ──
                const _is8HrOsh = (trainingLabel === OSH_8HR_LABEL);
                const _naSelYr  = (state && state.selectedYear) || new Date().getFullYear();
                const _naRKey   = `${_naSelYr}|${tabType}|${proj.name}|${storageIdx}|na_row`;
                const _naFrom   = storage[_naRKey] !== undefined ? parseInt(storage[_naRKey]) : -1;
                const _isNaCell = _is8HrOsh && _naFrom >= 0 && mi >= _naFrom;

                if (_is8HrOsh && _isNaCell) {
                    // Only the STARTING month shows an undo button — following months are display-only
                    const _isStartMonth = (mi === _naFrom);
                    if (_isStartMonth) {
                        // Starting month: Superintendent/Admin can click to remove N/A entirely
                        const _undoTip = _canSetNA
                            ? `N/A is set from ${ESH_MONTHS[_naFrom]} onwards — all employees in this project have completed the 8-Hr Mandatory OSH Training. Click to remove N/A and restore all months.`
                            : `N/A is set from ${ESH_MONTHS[_naFrom]} onwards — all employees have completed this training. This month is excluded from compliance tracking.`;
                        const _undoClick = _canSetNA
                            ? `onclick="eshToggle8HrOshNA(event,'${tabType}','${proj.name.replace(/'/g,"\'")}',${storageIdx},${mi})"`
                            : '';
                        html += `<td colspan="2" class="esh-td-actual" style="background:#d4edda !important;text-align:center;vertical-align:middle;padding:3px 4px;">
                            <button ${_undoClick} title="${_undoTip}"
                                style="background:#2e7d32;color:#fff;border:none;border-radius:4px;font-size:0.58rem;font-weight:700;padding:2px 6px;cursor:${_canSetNA?'pointer':'default'};width:100%;">
                                ✓ N/A
                            </button>
                            ${_canSetNA ? `<div style="font-size:0.48rem;color:#555;margin-top:2px;line-height:1.2;">click to undo</div>` : ''}
                        </td>`;
                    } else {
                        // Following months — greyed out, no interaction
                        const _followTip = `N/A — All employees in this project have completed the 8-Hr Mandatory OSH Training. This month is excluded from compliance tracking.`;
                        html += `<td colspan="2" class="esh-td-actual" style="background:#e0e0e0 !important;text-align:center;vertical-align:middle;padding:3px 4px;">
                            <span style="font-size:0.58rem;font-weight:700;color:#9e9e9e;" title="${_followTip}">✓ N/A</span>
                        </td>`;
                    }
                    return;
                }

                if (_is8HrOsh && !_isNaCell) {
                    // Normal month for 8-Hr OSH — render plan/actual + small N/A button inside actual cell
                    const planKey8 = getEshKey(tabType, proj.name, storageIdx, mi, 'plan');
                    const actualKey8 = getEshKey(tabType, proj.name, storageIdx, mi, 'actual');
                    const isPlanned8 = !!(storage[planKey8]) && storage[planKey8] !== '__DELETED__';
                    // Defensive: ignore actual if plan was cleared
                    const _rawActual8 = (storage[actualKey8] && storage[actualKey8] !== '__DELETED__') ? storage[actualKey8] : '';
                    const actualVal8 = isPlanned8 ? _rawActual8 : '';
                    const overdue8 = isPlanned8 && !actualVal8 && isMonthOverdue(mi);
                    const done8 = !!actualVal8;
                    let actualClass8 = 'esh-td-actual';
                    if (done8) actualClass8 += ' esh-done';
                    else if (overdue8) actualClass8 += ' esh-overdue';
                    else if (!isPlanned8) actualClass8 += ' esh-not-planned';
                    const _naBtnTip = _canSetNA
                        ? `Click N/A to mark that all employees in this project have already completed the 8-Hr Mandatory OSH Training. From ${ESH_MONTHS[mi]} onwards, all months will be excluded from compliance tracking.`
                        : 'N/A — Mark this when all employees have completed the 8-Hr Mandatory OSH Training. (Only Superintendent or Admin can set this.)';
                    const _naBtnClick = _canSetNA
                        ? `onclick="event.stopPropagation();eshToggle8HrOshNA(event,'${tabType}','${proj.name.replace(/'/g,"\'")}',${storageIdx},${mi})"`
                        : '';
                    html += `<td class="esh-td-plan${isPlanned8?' esh-planned':''}${!isAdmin?' esh-plan-locked':''}"
                        data-tabtype="${tabType}" data-ti="${storageIdx}" data-mi="${mi}" data-projname="${proj.name.replace(/"/g,'&quot;')}"
                        onclick="event.stopPropagation();eshSetPlan('${tabType}','${proj.name}',${storageIdx},${mi},null,this)"
                        title="${!isAdmin ? '🔒 Admin only — Cannot set Plan/Schedule' : isPlanned8 ? 'Click to unschedule' : 'Click to schedule'}">
                    </td>`;
                    const _editDisabled8 = (!(state && state.isEditing) && canEditActual) ? `disabled title="✏️ Press Edit button to enable input"` : '';
                    const dateDisabled8 = !canEditActual ? `disabled title="${isAdmin ? 'Admin can only set Plan — Superintendent inputs Actual dates.' : 'Read-only for your role/region'}"` : '';
                    html += `<td class="${actualClass8}" style="position:relative;">` + (isPlanned8
                        ? `<input type="date" value="${actualVal8}" ${dateDisabled8 || _editDisabled8}
                            onchange="eshSetActual('${tabType}','${proj.name}',${storageIdx},${mi},this.value,this.closest('td'))">`
                        : '') +
                        `<button ${_naBtnClick} title="${_naBtnTip}"
                            style="display:block;margin:${isPlanned8?'2px auto 0':'auto'};background:${_canSetNA?'#bdbdbd':'#e0e0e0'};color:${_canSetNA?'#fff':'#aaa'};border:none;border-radius:3px;font-size:0.5rem;font-weight:700;padding:1px 5px;cursor:${_canSetNA?'pointer':'default'};line-height:1.4;width:100%;"
                        >N/A</button>
                    </td>`;
                    return;
                }

                const planKey = getEshKey(tabType, proj.name, storageIdx, mi, 'plan');
                const actualKey = getEshKey(tabType, proj.name, storageIdx, mi, 'actual');
                const isPlanned = !!(storage[planKey]) && storage[planKey] !== '__DELETED__';
                // Defensive: ignore actual if plan was cleared — prevents ghost green cells from stale Firebase data
                const _rawActual = (storage[actualKey] && storage[actualKey] !== '__DELETED__') ? storage[actualKey] : '';
                const actualVal = isPlanned ? _rawActual : '';
                const isFuture = isMonthFuture(mi);
                const overdue = isPlanned && !actualVal && isMonthOverdue(mi);
                const done = !!actualVal;
                const maxDate = getMaxDateForMonth(mi);
                const minDate = getMinDateForMonth(mi);

                const dateDisabled = !canEditActual ? `disabled title="${isAdmin ? 'Admin can only set Plan — Superintendent inputs Actual dates.' : 'Read-only for your role/region'}"` : '';
                const effectiveMax = '';
                const effectiveMin = '';

                let actualClass = 'esh-td-actual';
                if (done) { actualClass += ' esh-done'; }
                else if (overdue) { actualClass += ' esh-overdue'; }
                else if (!isPlanned) { actualClass += ' esh-not-planned'; }

                html += `<td class="esh-td-plan${isPlanned?' esh-planned':''}${!isAdmin?' esh-plan-locked':''}"
                    data-tabtype="${tabType}" data-ti="${storageIdx}" data-mi="${mi}" data-projname="${proj.name.replace(/"/g,'&quot;')}"
                    onclick="event.stopPropagation();eshSetPlan('${tabType}','${proj.name}',${storageIdx},${mi},null,this)"
                    title="${!isAdmin ? '🔒 Admin only — Cannot set Plan/Schedule' : isPlanned ? 'Click to unschedule' : 'Click to schedule'}">
                </td>`;
                const _editDisabled2 = (!(state && state.isEditing) && !dateDisabled) ? `disabled title="✏️ Press Edit button to enable input"` : '';
                html += `<td class="${actualClass}">` + (isPlanned
                    ? `<input type="date" value="${actualVal}" ${dateDisabled || _editDisabled2}
                        ${effectiveMax} ${effectiveMin}
                        onchange="eshSetActual('${tabType}','${proj.name}',${storageIdx},${mi},this.value,this.closest('td'))">`
                    : '') + `</td>`;
            });

            // (N/A per-month buttons rendered inline in each month cell)

            html += `</tr>`;
        });
    });

    html += `</tbody></table>`;
    if (isAdmin) {
        const _pn = projects[0] ? projects[0].name.replace(/'/g,"\\'") : '';
        html += `<div style="position:sticky;left:0;box-sizing:border-box;padding:10px 14px;background:var(--bg-card);border-top:1px dashed var(--border-color);text-align:center;">
            <button onclick="eshAddRowModal('${tabType}','${_pn}')"
                style="background:linear-gradient(135deg,#1b5e20,#388e3c);color:white;border:none;border-radius:7px;padding:7px 18px;font-size:0.74rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                <i class="fas fa-plus-circle"></i> ADD ROW
            </button>
            <span style="font-size:0.63rem;color:var(--text-secondary);margin-left:10px;">Add client-required training for this project only</span>
        </div>`;
    }
    return html;
}

function buildDrillsSingleTable(projects, storage, col) {
    const freqPastel = {
        'Once a year':   { bg:'#ddeeff', badge:'#7ab8e8', text:'#1a4f7a', label:'Once a Year' },
        'Twice a year':  { bg:'#fffde0', badge:'#e0c800', text:'#665c00', label:'Twice a Year' },
        'Quarterly':     { bg:'#e6faea', badge:'#6bc97a', text:'#1a5c28', label:'Quarterly'   },
    };
    const canEdit = projects.length > 0 ? eshCanEdit('esh-calendar-drills', projects[0].region) : false;
    const isAdmin = !!(state && state.isAdmin);
    // RBAC: Admin can ONLY set Plan (color). Only Superintendent can input Actual dates.
    const canEditActual = !isAdmin && canEdit;
    const _canSetNA = !!(state && state.userRole === 'superintendent');
    const tabType = 'esh-calendar-drills';
    const customDrillRows = (typeof getEshCustomRows === 'function') ? getEshCustomRows(tabType, projects[0] ? projects[0].name : '') : [];
    const allDrills = [
        ...ESH_DRILLS,
        ...customDrillRows.map((r, i) => ({ name: r.name||r, freq: r.freq||'Once a year', _custom: true, _customIdx: i }))
    ];

    let html = `<table class="esh-table esh-plain">
        <thead>
            <tr>
                <th class="esh-th-name" rowspan="2">Emergency Drill Type</th>
                <th class="esh-th-freq" rowspan="2" style="text-align:center;">Frequency</th>`;
    ESH_MONTHS.forEach(m => {
        html += `<th colspan="3" style="text-align:center;border-left:2px solid rgba(255,255,255,0.15);">${m.substring(0,3)}</th>`;
    });
    html += `</tr><tr>`;
    ESH_MONTHS.forEach(() => {
        html += `<th class="esh-th-plan">Plan</th><th class="esh-th-actual">Actual</th><th class="esh-th-na">N/A</th>`;
    });
    html += `</tr></thead><tbody>`;

    projects.forEach(proj => {
        allDrills.forEach((drill, di) => {
            const fp = freqPastel[drill.freq] || { bg:'#f5f5f5', badge:'#999', text:'#333', label: drill.freq };
            const isCustom = !!drill._custom;
            const customIdx = (isCustom && drill._customIdx !== undefined) ? drill._customIdx : null;
            const storageIdx = getDrillStorageIdx(drill, di);

            const _naRowYear = (state && state.selectedYear) || 2026;
            const naRowKey = `${_naRowYear}|${tabType}|${proj.name}|${storageIdx}|na_row`;
            const isNaRow = !!(storage[naRowKey]);

            const rowStyle = isNaRow
                ? 'background:#e8e8e8 !important;opacity:0.75;'
                : '';

            const rowFreqClass = drill.freq === 'Quarterly' ? 'drill-row-quarterly' : drill.freq === 'Twice a year' ? 'drill-row-twice' : 'drill-row-once';
            html += `<tr class="${rowFreqClass}" style="${rowStyle}">
            <td class="esh-td-name" style="${isNaRow ? 'background:#e0e0e0;' : ''}">
                ${isCustom ? '<span style="background:#e8f5e9;color:#1b5e20;border-radius:4px;font-size:0.55rem;font-weight:700;padding:1px 5px;margin-right:5px;vertical-align:middle;">CUSTOM</span>' : ''}
                ${drill.name}
                ${(isCustom && isAdmin) ? `<button onclick="eshDeleteCustomRow('esh-calendar-drills','${projects[0]?projects[0].name.replace(/'/g,"\\'"):''}',${customIdx})" title="Remove this row" style="float:right;background:none;border:none;color:#c62828;cursor:pointer;font-size:0.75rem;padding:0 3px;opacity:0.6;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6"><i class="fas fa-trash"></i></button>` : ''}
            </td>
            <td class="esh-td-freq">
                <span class="esh-freq"><i style="background:${isNaRow ? '#aaa' : fp.badge};"></i>${isNaRow ? 'N/A' : fp.label}</span>
            </td>`;

            ESH_MONTHS.forEach((m, mi) => {
                // ── Work Stoppage: gray out the month cell ──────────────────
                const _eshDrillSelYr = (state && state.selectedYear) || new Date().getFullYear();
                const _drillWsBlocked = (typeof isMonthBlacklistedForProject === 'function')
                    && isMonthBlacklistedForProject(proj, mi + 1, _eshDrillSelYr);
                if (_drillWsBlocked) {
                    const _drillNotYetStarted = (typeof isMonthBeforeProjectStart === 'function') && isMonthBeforeProjectStart(proj, mi + 1, _eshDrillSelYr);
                    const _drillWsTip = getMonthExemptTip(proj, mi + 1, _eshDrillSelYr).replace(/"/g, '&quot;');
                    html += `<td class="esh-td-plan esh-plan-locked" style="background:#e0e0e0 !important;cursor:not-allowed;" title="${_drillWsTip}"></td>`;
                    html += `<td class="esh-td-actual" style="background:#e0e0e0 !important;cursor:not-allowed;" title="${_drillWsTip}"></td>`;
                    html += `<td style="background:#e0e0e0 !important;cursor:not-allowed;text-align:center;border:1.5px solid #bbb;min-width:34px;padding:2px;" title="${_drillWsTip}"><span style="font-size:0.6rem;font-weight:700;color:#bbb;">—</span></td>`;
                    return;
                }
                const _naYear = (state && state.selectedYear) || 2026;
                const naCellKey = `${_naYear}|${tabType}|${proj.name}|${storageIdx}|${mi}|na`;
                const isNaCell = isNaRow || !!(storage[naCellKey]);

                const planKey = getEshKey(tabType, proj.name, storageIdx, mi, 'plan');
                const actualKey = getEshKey(tabType, proj.name, storageIdx, mi, 'actual');
                const isPlanned = !isNaCell && !!(storage[planKey]) && storage[planKey] !== '__DELETED__';
                // Defensive: ignore actual if plan was cleared or N/A cell
                const _rawActualNa = !isNaCell ? ((storage[actualKey] && storage[actualKey] !== '__DELETED__') ? storage[actualKey] : '') : '';
                const actualVal = isPlanned ? _rawActualNa : '';
                const overdue = !isNaCell && isPlanned && !actualVal && isMonthOverdue(mi);
                const done = !isNaCell && !!actualVal;

                let planCellStyle = isNaCell
                    ? 'background:#c8c8c8 !important;cursor:not-allowed;'
                    : '';
                let planClass = `esh-td-plan${isPlanned?' esh-planned':''}${(!isAdmin||isNaCell)?' esh-plan-locked':''}`;
                const planOnClick = (!isAdmin || isNaCell)
                    ? ''
                    : `onclick="event.stopPropagation();eshSetPlan('${tabType}','${proj.name}',${storageIdx},${mi},null,this)"`;
                const planTitle = isNaCell ? 'N/A – not applicable' : (!isAdmin ? 'Admin only' : isPlanned ? 'Click to unschedule' : 'Click to schedule');

                html += `<td class="${planClass}" data-tabtype="${tabType}" data-ti="${storageIdx}" data-mi="${mi}" data-freq="${drill.freq}" data-projname="${proj.name.replace(/"/g,'&quot;')}"
                    ${planOnClick} title="${planTitle}" style="${planCellStyle}"></td>`;

                let actualClass = 'esh-td-actual';
                let actualStyle = '';
                if (isNaCell) {
                    actualStyle = 'background:#c8c8c8 !important;';
                } else if (done) { actualClass += ' esh-done'; }
                else if (overdue) { actualClass += ' esh-overdue'; }

                const dateDisabled = isNaCell
                    ? `disabled title="N/A – not applicable for this project"`
                    : (!canEditActual ? `disabled title="${isAdmin ? 'Admin can only set Plan — Superintendent inputs Actual dates.' : 'Read-only for your role/region'}"`
                    : (!(state && state.isEditing) ? `disabled title="✏️ Press Edit button to enable input"` : ''));

                html += `<td class="${actualClass}" style="${actualStyle}">
                    ${isNaCell
                        ? '<span style="color:#888;font-size:0.65rem;font-weight:700;">N/A</span>'
                        : (isPlanned
                            ? `<input type="date" value="${actualVal}" ${dateDisabled}
                                onchange="eshSetActual('${tabType}','${proj.name}',${storageIdx},${mi},this.value,this.closest('td'))">`
                            : '')
                    }
                </td>`;

                // N/A cell — only show and allow interaction when the month has a plan set
                if (!isPlanned && !isNaCell) {
                    // No plan set and not N/A — show empty, non-interactive placeholder
                    html += `<td class="esh-td-nacol esh-na-off" title="Set a Plan first to enable N/A"></td>`;
                } else {
                    const naToggleTitle = isNaCell
                        ? (_canSetNA ? 'Click to remove N/A — restore this drill cell' : 'N/A — This month is excluded from compliance tracking.')
                        : (_canSetNA ? 'Click to mark as N/A (not applicable for this project)' : 'Superintendent or Admin only – cannot set N/A');
                    const naOnClick = (_canSetNA && (isPlanned || isNaCell))
                        ? `onclick="eshToggleDrillNA(event,'${tabType}','${proj.name}',${storageIdx},${mi})"`
                        : '';
                    html += `<td ${naOnClick} title="${naToggleTitle}" class="esh-td-nacol ${isNaCell?'esh-na-on':'esh-na-off'}" style="cursor:${(_canSetNA&&(isPlanned||isNaCell))?'pointer':'not-allowed'};">
                        <span class="esh-na-label">${isNaCell?'✓N/A':'N/A'}</span>
                    </td>`;
                }
            });
            html += `</tr>`;
        });
    });

    html += `</tbody></table>`;
    if (isAdmin) {
        const _pn2 = projects[0] ? projects[0].name.replace(/'/g,"\\'") : '';
        html += `<div style="position:sticky;left:0;box-sizing:border-box;padding:10px 14px;background:var(--bg-card);border-top:1px dashed var(--border-color);text-align:center;">
            <button onclick="eshAddRowModal('esh-calendar-drills','${_pn2}')"
                style="background:linear-gradient(135deg,#1b5e20,#388e3c);color:white;border:none;border-radius:7px;padding:7px 18px;font-size:0.74rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                <i class="fas fa-plus-circle"></i> ADD ROW
            </button>
            <span style="font-size:0.63rem;color:var(--text-secondary);margin-left:10px;">Add client-required drill for this project only</span>
        </div>`;
    }
    return html;
}

// ── 8-Hr Mandatory OSH Training — row-level N/A toggle ──────────────────────
// Storage key: `{year}|{tabType}|{projName}|{storageIdx}|na_row` = month index (0-11) when N/A was activated
// Once set, all months from that index onwards are greyed out and excluded from compliance.
window.eshToggle8HrOshNA = function(e, tabType, projName, storageIdx, clickedMonth) {
    e.stopPropagation();
    const _canToggleNA = state && (state.isAdmin || state.userRole === 'superintendent');
    if (!_canToggleNA) {
        showToast('Only Superintendent or Admin can set N/A.', 'warning', 3000);
        return;
    }
    // Superintendent can only toggle N/A for their own region's projects
    if (!state.isAdmin && state.userRole === 'superintendent') {
        const _naProj = state.projects && state.projects.find(p => p.name === projName);
        if (_naProj && state.userRegion && _naProj.region !== state.userRegion) {
            showToast(`Superintendent can only set N/A for projects in their own region (${state.userRegion}).`, 'warning', 3500);
            return;
        }
    }
    const storage = getEshStorage();
    const _naYear = (state && state.selectedYear) || new Date().getFullYear();
    const naKey = `${_naYear}|${tabType}|${projName}|${storageIdx}|na_row`;
    const wasActive = storage[naKey] !== undefined;
    const ESH_MO = typeof ESH_MONTHS !== 'undefined' ? ESH_MONTHS : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    if (wasActive && clickedMonth !== undefined && parseInt(storage[naKey]) === parseInt(clickedMonth)) {
        // Clicking the same starting month — remove N/A entirely
        delete storage[naKey];
        setEshStorage(storage);
        showToast('↩️ N/A removed — 8-Hr OSH Training restored for all months.', 'info', 3000);
    } else if (wasActive) {
        // Clicking a different month while N/A is active — move the start month
        storage[naKey] = parseInt(clickedMonth);
        setEshStorage(storage);
        showToast(`N/A updated — 8-Hr OSH Training excluded from ${ESH_MO[clickedMonth]} onwards.`, 'success', 3500);
    } else {
        // Activate N/A from the clicked month onwards
        const fromMonth = (clickedMonth !== undefined) ? parseInt(clickedMonth) : new Date().getMonth();
        storage[naKey] = fromMonth;
        setEshStorage(storage);
        showToast(`8-Hr OSH Training marked N/A from ${ESH_MO[fromMonth]} onwards — all employees have completed this training. Excluded from compliance.`, 'success', 4000);
    }

    // Re-render the table
    if (typeof eshRenderRegionTable === 'function' && state && state.projects) {
        const proj = state.projects.find(p => p.name === projName);
        if (proj) {
            const regionOrder = ['CORPORATE', 'NCR', 'SOUTH LUZON', 'NORTH LUZON', 'VISAYAS & MINDANAO', 'PLANT OPERATIONS'];
            regionOrder.forEach(region => {
                const regProjs = state.projects.filter(p => p.region === region);
                const idx = regProjs.findIndex(p => p.name === projName);
                if (idx >= 0) eshRenderRegionTable(tabType, region, regProjs, idx);
            });
        }
    }
};

window.eshToggleDrillNA = function(e, tabType, projName, ti, mi) {
    e.stopPropagation();
    const _canToggleDrillNA = state && (state.isAdmin || state.userRole === 'superintendent');
    if (!_canToggleDrillNA) {
        showToast('Only Superintendent or Admin can set N/A.', 'warning', 3000);
        return;
    }
    // Superintendent can only set N/A for their own region's projects
    if (!state.isAdmin && state.userRole === 'superintendent') {
        const _drillNaProj = state.projects && state.projects.find(p => p.name === projName);
        if (_drillNaProj && state.userRegion && _drillNaProj.region !== state.userRegion) {
            showToast(`Superintendent can only set N/A for projects in their own region (${state.userRegion}).`, 'warning', 3500);
            return;
        }
    }

    const storage = getEshStorage();
    const _naToggleYear = (state && state.selectedYear) || 2026;
    const naCellKey = `${_naToggleYear}|${tabType}|${projName}|${ti}|${mi}|na`;
    const wasNA = !!(storage[naCellKey]);
    const nowNA = !wasNA;

    if (nowNA) {
        storage[naCellKey] = true;
        const planKey = getEshKey(tabType, projName, ti, mi, 'plan');
        const actualKey = getEshKey(tabType, projName, ti, mi, 'actual');
        delete storage[planKey];
        delete storage[actualKey];
        showToast('Marked as N/A — excluded from compliance.', 'success', 2500);
    } else {
        delete storage[naCellKey];
        showToast('↩️ N/A removed — drill cell restored.', 'info', 2500);
    }
    setEshStorage(storage);

    const naTd = e.currentTarget || e.target.closest('td');
    if (!naTd) return;

    const planTd   = naTd.previousElementSibling;   // actual td
    const actualTd = planTd ? planTd.previousElementSibling : null; // plan td
    const realPlanTd   = actualTd;  // plan comes first
    const realActualTd = planTd;    // actual is second

    const greyBg = '#c8c8c8';
    const naTextColor = nowNA ? '#fff' : '#888';
    const naLabel = nowNA ? '✓ N/A' : 'N/A';
    const naBg = nowNA ? '#9e9e9e' : '#e0e0e0';
    const naBorder = nowNA ? '#757575' : '#aaa';

    naTd.style.background = naBg;
    naTd.style.borderColor = naBorder;
    naTd.title = nowNA ? 'Click to remove N/A — restore this drill cell' : 'Click to mark as N/A (not applicable for this project)';
    const naSpan = naTd.querySelector('span');
    if (naSpan) { naSpan.textContent = naLabel; naSpan.style.color = naTextColor; }

    if (realPlanTd) {
        if (nowNA) {
            realPlanTd.style.background = greyBg;
            realPlanTd.style.cursor = 'not-allowed';
            realPlanTd.classList.remove('esh-planned');
            realPlanTd.onclick = null;
            realPlanTd.title = 'N/A – not applicable';
        } else {
            realPlanTd.style.background = '';
            realPlanTd.style.cursor = '';
            realPlanTd.title = 'Click to schedule';
            const freq = realPlanTd.dataset.freq || '';
            realPlanTd.onclick = function(ev) {
                ev.stopPropagation();
                eshSetPlan(tabType, projName, ti, mi, null, this);
            };
        }
    }

    if (realActualTd) {
        const inp = realActualTd.querySelector('input[type="date"]');
        if (nowNA) {
            realActualTd.style.background = greyBg;
            realActualTd.classList.remove('esh-done','esh-overdue','esh-not-planned');
            realActualTd.innerHTML = '<span style="color:#888;font-size:0.65rem;font-weight:700;">N/A</span>';
        } else {
            realActualTd.style.background = '';
            realActualTd.classList.add('esh-not-planned');
            realActualTd.innerHTML = `<input type="date" value="" disabled
                title="🔒 Not scheduled — Admin must set this month as planned (yellow) first"
                onchange="eshSetActual('${tabType}','${projName}',${ti},${mi},this.value,this.closest('td'))">`;
        }
    }
};

window.eshSetPlan = async function(tabType, projName, ti, mi, _unused, tdEl) {
    if (!(state && state.isEditing)) {
        showToast('Press the Edit button first to make changes.', 'info', 3000);
        return;
    }
    if (!(state && state.isAdmin)) {
        showToast('Admin only — Cannot set Plan/Schedule.', 'warning', 3000);
        return;
    }
    const allProjects = (state && state.projects) ? state.projects : [];
    const proj = allProjects.find(p => p.name === projName);
    if (proj && !eshCanEdit(tabType, proj.region)) {
        showToast('Read-Only — You cannot edit this region/tab.', 'warning', 3000);
        return;
    }

    const key       = getEshKey(tabType, projName, ti, mi, 'plan');
    const actualKey = getEshKey(tabType, projName, ti, mi, 'actual');

    // ── Determine current state: localStorage (synced from Firebase) is source of truth ──
    const _s = getEshStorage();
    const wasPlanned = !!_s[key] && _s[key] !== '__DELETED__';
    const nowPlanned = !wasPlanned;
    if (!(await _eshConfirmPlanChange(tabType, ti, mi, nowPlanned))) return;

    // ── Update DOM immediately (optimistic UI) ────────────────────────────────
    document.querySelectorAll(
        `.esh-td-plan[data-tabtype="${tabType}"][data-ti="${ti}"][data-mi="${mi}"][data-projname="${projName.replace(/"/g,'&quot;')}"]`
    ).forEach(function(cell) {
        cell.classList.toggle('esh-planned', nowPlanned);
        cell.title = nowPlanned ? 'Click to unschedule' : 'Click to schedule';
        const actualSib = cell.nextElementSibling;
        if (!actualSib || !actualSib.classList.contains('esh-td-actual')) return;
        if (nowPlanned) {
            actualSib.classList.remove('esh-not-planned', 'esh-done', 'esh-overdue');
            if (tabType !== 'esh-calendar-drills' && !actualSib.querySelector('input[type="date"]')) {
                const canEdit = eshCanEdit(tabType, proj?.region);
                const inp = document.createElement('input');
                inp.type = 'date'; inp.value = (_s[actualKey] && _s[actualKey] !== '__DELETED__') ? _s[actualKey] : '';
                if (inp.value) { actualSib.classList.add('esh-done'); }
                if (!canEdit) { inp.disabled = true; inp.title = '🔒 Read-only for your role/region'; }
                inp.onchange = function() { window.eshSetActual(tabType, projName, ti, mi, this.value, this.closest('td')); };
                actualSib.appendChild(inp);
            } else if (tabType === 'esh-calendar-drills') {
                const inp = actualSib.querySelector('input[type="date"]');
                if (inp && eshCanEdit(tabType, proj?.region)) { inp.disabled = false; inp.title = ''; inp.style.opacity = ''; actualSib.classList.remove('esh-not-planned'); }
                if (inp && _s[actualKey] && _s[actualKey] !== '__DELETED__') { inp.value = _s[actualKey]; actualSib.classList.add('esh-done'); }
            }
        } else {
            if (tabType !== 'esh-calendar-drills') {
                const inp = actualSib.querySelector('input[type="date"]');
                if (inp) { inp.value = ''; actualSib.removeChild(inp); }
                actualSib.classList.remove('esh-done', 'esh-overdue');
                actualSib.classList.add('esh-not-planned');
            } else {
                const inp = actualSib.querySelector('input[type="date"]');
                if (inp) { inp.value = ''; inp.disabled = true; }
                actualSib.classList.remove('esh-done', 'esh-overdue');
                actualSib.classList.add('esh-not-planned');
            }
        }
    });

    // ── Update localStorage optimistically ────────────────────────────────────
    if (nowPlanned) { _s[key] = true; } else { delete _s[key]; }
    _eshSaveLocal(key, nowPlanned ? true : null);

    // ── Write directly to Firebase RTDB (KPM-style) ───────────────────────────
    _eshRtdbWrite(key, nowPlanned ? true : null)
        .then(function() {
            showToast(nowPlanned ? '✅ Month scheduled.' : '🗑️ Schedule removed.', 'success', 1500);
        })
        .catch(function(e) {
            const errMsg = (e && (e.message || e.code || String(e))) || '';
            console.error('❌ ESH plan write failed:', key, errMsg);
            showToast('Save failed: ' + errMsg, 'error', 4000);
            // Rollback optimistic UI and localStorage
            if (nowPlanned) { delete _s[key]; } else { _s[key] = true; }
            _eshSaveLocal(key, nowPlanned ? null : true);
            // Rollback DOM
            document.querySelectorAll(
                `.esh-td-plan[data-tabtype="${tabType}"][data-ti="${ti}"][data-mi="${mi}"][data-projname="${projName.replace(/"/g,'&quot;')}"]`
            ).forEach(function(cell) {
                cell.classList.toggle('esh-planned', !nowPlanned);
            });
        });
};

window.eshCorpSetPlan = async function(tabType, projName, ti, mi, _unused, tdEl, drillColor) {
    if (!(state && state.isEditing)) {
        showToast('Press the Edit button first to make changes.', 'info', 3000);
        return;
    }
    if (!(state && state.isAdmin)) {
        showToast('Admin only — Cannot set Plan/Schedule.', 'warning', 3000);
        return;
    }
    const allProjects = (state && state.projects) ? state.projects : [];
    const proj = allProjects.find(p => p.name === projName);
    if (proj && !eshCanEdit(tabType, proj.region)) {
        showToast('Read-Only — You cannot edit this region/tab.', 'warning', 3000);
        return;
    }

    const key           = getEshKey(tabType, projName, ti, mi, 'plan');
    const actualKey     = getEshKey(tabType, projName, ti, mi, 'actual');
    const _s            = getEshStorage();
    const wasPlanned    = !!_s[key];
    const nowPlanned    = !wasPlanned;
    if (!(await _eshConfirmPlanChange(tabType, ti, mi, nowPlanned))) return;
    const cellColor     = drillColor || (tdEl && tdEl.dataset.drillcolor) || '#43a047';
    const planTitle     = nowPlanned ? 'Click to unschedule' : 'Click to schedule';

    // ── Update DOM immediately ────────────────────────────────────────────────
    if (tdEl) {
        tdEl.classList.toggle('esh-planned', nowPlanned);
        tdEl.title = planTitle;
        tdEl.style.setProperty('--dc', cellColor);
        const actualSib = tdEl.nextElementSibling;
        if (actualSib && actualSib.classList.contains('esh-td-actual')) {
            const inp = actualSib.querySelector('input[type="date"]');
            if (inp) {
                if (nowPlanned) {
                    inp.disabled = false; inp.title = ''; inp.style.opacity = ''; actualSib.classList.remove('esh-not-planned');
                    if (_s[actualKey] && _s[actualKey] !== '__DELETED__') { inp.value = _s[actualKey]; actualSib.classList.add('esh-done'); }
                }
                else { inp.value = ''; inp.disabled = true; actualSib.classList.remove('esh-done','esh-overdue'); actualSib.classList.add('esh-not-planned'); }
            }
        }
    }
    document.querySelectorAll(`.esh-td-plan[data-tabtype="${tabType}"][data-ti="${ti}"][data-mi="${mi}"][data-projname="${projName.replace(/"/g,'&quot;')}"]`).forEach(cell => {
        if (cell === tdEl) return;
        cell.classList.toggle('esh-planned', nowPlanned);
        cell.title = planTitle;
        cell.style.setProperty('--dc', drillColor || cell.dataset.drillcolor || '#43a047');
    });

    // ── Update localStorage optimistically ────────────────────────────────────
    if (nowPlanned) { _s[key] = true; } else { delete _s[key]; }
    _eshSaveLocal(key, nowPlanned ? true : null);

    // ── Write directly to Firebase RTDB ──────────────────────────────────────
    _eshRtdbWrite(key, nowPlanned ? true : null)
        .then(function() {
            showToast(nowPlanned ? '✅ Month scheduled.' : '🗑️ Schedule removed.', 'success', 1500);
        })
        .catch(function(e) {
            const errMsg = (e && (e.message || e.code || String(e))) || '';
            console.error('❌ ESH corp plan write failed:', key, errMsg);
            showToast('Save failed: ' + errMsg, 'error', 4000);
            // Rollback
            if (nowPlanned) { delete _s[key]; } else { _s[key] = true; }
            _eshSaveLocal(key, nowPlanned ? null : true);
            if (tdEl) { tdEl.classList.toggle('esh-planned', !nowPlanned); }
        });
};

window.eshSetActual = async function(tabType, projName, ti, mi, value, tdEl) {
    // ── Guards ────────────────────────────────────────────────────────────────
    if (!(state && state.isEditing)) {
        if (tdEl) { const inp = tdEl.querySelector('input[type="date"]'); if (inp) inp.value = ''; }
        showToast('Press the Edit button first to make changes.', 'info', 3000);
        return;
    }
    const allProjects = (state && state.projects) ? state.projects : [];
    const proj = allProjects.find(p => p.name === projName);
    if (proj && !eshCanEdit(tabType, proj.region)) {
        showToast('Read-Only — You cannot edit this region/tab.', 'warning', 3000);
        if (tdEl) { const inp = tdEl.querySelector('input[type="date"]'); if (inp) inp.value = ''; }
        return;
    }
    const _isAdminRole = !!(state && state.isAdmin);
    const _isCorp = tabType === 'esh-calendar-corp-drills';
    if (_isAdminRole && !_isCorp) {
        showToast('Admin can only set the Plan (schedule). Only the Superintendent can input Actual dates.', 'warning', 4000);
        if (tdEl) { const inp = tdEl.querySelector('input[type="date"]'); if (inp) inp.value = ''; }
        return;
    }
    if (value) {
        const expectedYear = (state && state.selectedYear) || 2026;
        if (!value.startsWith(String(expectedYear))) {
            showToast(`The date must be within ${expectedYear}.`, 'warning', 4000);
            if (tdEl) { const inp = tdEl.querySelector('input[type="date"]'); if (inp) inp.value = ''; }
            return;
        }
    }
    if (!value) {
        const _storage = getEshStorage();
        const _key = getEshKey(tabType, projName, ti, mi, 'actual');
        const _existing = (_storage[_key] && _storage[_key] !== '__DELETED__') ? _storage[_key] : '';
        if (_existing) {
            const _mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            // ── Guard: suppress Firebase listener re-render while confirm dialog is open ──
            window._eshConfirmDialogOpen = true;
            let _confirmed = false;
            try {
                _confirmed = await showModernDialog(
                    'Delete actual date?',
                    `Delete actual date <strong>${_existing}</strong> for <strong>${projName}</strong> — ${_mn[mi] || 'Month '+(mi+1)}?<br>This action cannot be undone.`,
                    true, 'Delete', 'Cancel');
            } finally { window._eshConfirmDialogOpen = false; }
            if (!_confirmed) {
                if (tdEl) { const inp = tdEl.querySelector('input[type="date"]'); if (inp) inp.value = _existing; }
                return;
            }
        }
    }

    const actualKey = getEshKey(tabType, projName, ti, mi, 'actual');

    if (!window.firebaseRealtimeDb || !window.firebase || !window.firebase.dbRef || !window.firebase.set) {
        showToast('Firebase not ready. Please try again.', 'warning', 3000);
        if (tdEl) { const inp = tdEl.querySelector('input[type="date"]'); if (inp) inp.value = ''; }
        return;
    }

    // ── Update UI optimistically ──────────────────────────────────────────────
    if (tdEl) {
        tdEl.classList.remove('esh-done', 'esh-overdue', 'esh-not-planned');
        tdEl.style.background = '';
        const inp = tdEl.querySelector('input[type="date"]');
        if (inp) inp.value = value || '';
        if (value) {
            tdEl.classList.add('esh-done');
            if (inp) { inp.disabled = false; inp.style.opacity = ''; inp.style.pointerEvents = ''; }
        } else {
            if (isMonthOverdue(mi)) { tdEl.classList.add('esh-overdue'); }
        }
    }

    // ── Update localStorage ───────────────────────────────────────────────────
    _eshSaveLocal(actualKey, value || null);

    // ── Write directly to Firebase RTDB ──────────────────────────────────────
    // Set flag to suppress the immediate onValue echo re-render (would wipe the user's current view)
    window._eshSavingActual = true;
    const safePath = 'esh-calendar/data/' + _eshKeyToFirebasePath(actualKey);
    const ref = window.firebase.dbRef(window.firebaseRealtimeDb, safePath);
    window.firebase.set(ref, value || null)
        .then(function() {
            showToast(value ? '✅ Actual date saved.' : '🗑️ Actual date deleted.', 'success', 2000);
            // Clear flag after a short delay — allows the echo onValue to fire without disruption
            setTimeout(function() { window._eshSavingActual = false; }, 2000);
        })
        .catch(function(e) {
            const errMsg = (e && (e.message || e.code || String(e))) || '';
            console.error('❌ eshSetActual failed:', actualKey, errMsg);
            showToast('Save failed: ' + errMsg, 'error', 5000);
            _eshSaveLocal(actualKey, null);
            window._eshSavingActual = false;
            if (tdEl) { const inp = tdEl.querySelector('input[type="date"]'); if (inp) inp.value = ''; tdEl.classList.remove('esh-done', 'esh-overdue'); }
        });
};



const CORP_DRILLS = [
    { name:'Earthquake',                                                              freq:'Quarterly',    color:'#43a047' },
    { name:'Fire',                                                                    freq:'Twice a year', color:'#fdd835' },
    { name:'Medical Emergency',                                                       freq:'Twice a year', color:'#fdd835' },
    { name:'Explosion',                                                               freq:'Once a year',  color:'#42a5f5' },
    { name:'Bomb Threat',                                                             freq:'Once a year',  color:'#42a5f5' },
    { name:'Weather Disturbance (Typhoons, Heavy Rains, Strong Winds, Flooding)',    freq:'Once a year',  color:'#42a5f5' },
];
window.CORP_DRILLS = CORP_DRILLS;

function getCorpDrillCustomRows() {
    try { return JSON.parse(localStorage.getItem('esh_corp_drill_custom_rows') || '[]'); } catch(e) { return []; }
}
function setCorpDrillCustomRows(rows) {
    localStorage.setItem('esh_corp_drill_custom_rows', JSON.stringify(rows));
    try {
        if (window.firebaseRealtimeDb && window.firebase && window.firebase.dbRef && window.firebase.set) {
            const ref = window.firebase.dbRef(window.firebaseRealtimeDb, 'esh-corp-drill-custom-rows');
            window.firebase.set(ref, rows).catch(e => console.warn('corp drill rows save failed:', e));
        }
    } catch(e) {}
}
window.startCorpDrillCustomRowsSync = function() {
    if (!window.firebaseRealtimeDb || !window.firebase || !window.firebase.dbRef || !window.firebase.onValue) return;
    const ref = window.firebase.dbRef(window.firebaseRealtimeDb, 'esh-corp-drill-custom-rows');
    window.firebase.onValue(ref, (snapshot) => {
        const data = snapshot.val();
        if (Array.isArray(data)) {
            localStorage.setItem('esh_corp_drill_custom_rows', JSON.stringify(data));
            if (state && state.currentTab === 'esh-calendar-corp-drills') { try { renderCorpDrillsTab(); } catch(e) {} }
        }
    }, (err) => {  });
};

window.eshCorpDrillAddRow = function() {
    const existing = document.getElementById('esh-corp-addrow-modal');
    if (existing) { eshModalShow(existing); return; }
    const m = document.createElement('div');
    m.id = 'esh-corp-addrow-modal';
    window.eshMountModal(m, { id: 'esh-corp-addrow-modal', icon: 'fa-plus-circle', width: 460,
        closeJs: "eshModalHide(document.getElementById('esh-corp-addrow-modal'))",
        title: 'Add custom drill / activity',
        body: `<div style="padding:16px 18px;"><label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px;">Drill / Activity Name</label>
        <input id="esh-corp-addrow-name" type="text" placeholder="e.g. Active Shooter Response" autocomplete="off"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border-color);border-radius:8px;font-size:0.82rem;background:var(--input-bg);color:var(--text-primary);margin-bottom:14px;box-sizing:border-box;">
        <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px;">Frequency</label>
        <select id="esh-corp-addrow-freq" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-color);border-radius:8px;font-size:0.82rem;background:var(--input-bg);color:var(--text-primary);margin-bottom:20px;box-sizing:border-box;">
            <option value="Once a year">Once a year</option>
            <option value="Twice a year">Twice a year</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Monthly">Monthly</option>
            <option value="As needed">As needed</option>
        </select>
        </div>`,
        foot: `<button class="mdl-btn neutral" onclick="eshModalHide(document.getElementById('esh-corp-addrow-modal'))">Cancel</button><button class="mdl-btn primary" onclick="eshCorpDrillConfirmAddRow()"><i class="fas fa-plus" style="margin-right:5px;"></i>Add row</button>`
    });
    setTimeout(() => { const el = document.getElementById('esh-corp-addrow-name'); if(el) el.focus(); }, 50);
};

window.eshCorpDrillConfirmAddRow = function() {
    const nameEl = document.getElementById('esh-corp-addrow-name');
    const freqEl = document.getElementById('esh-corp-addrow-freq');
    const name = (nameEl ? nameEl.value : '').trim();
    const freq = freqEl ? freqEl.value : 'Once a year';
    if (!name) { if(typeof showToast==='function') showToast('Drill name is required.', 'warning'); return; }
    const rows = getCorpDrillCustomRows();
    if (rows.some(r => r.name.toLowerCase() === name.toLowerCase()) || CORP_DRILLS.some(d => d.name.toLowerCase() === name.toLowerCase())) {
        if(typeof showToast==='function') showToast('A drill with that name already exists.', 'warning'); return;
    }
    rows.push({ name, freq });
    setCorpDrillCustomRows(rows);
    const modal = document.getElementById('esh-corp-addrow-modal');
    if (modal) eshModalHide(modal);
    renderCorpDrillsTab();
    if(typeof showToast==='function') showToast(name + ' added to Corporate Drills.', 'success');
};

window.eshCorpDrillDeleteRow = function(idx) {
    const rows = getCorpDrillCustomRows();
    const item = rows[idx];
    const label = (item && item.name) ? item.name : `Row #${idx + 1}`;
    showDeleteDialog('Corporate Drill Row', label).then(confirmed => {
        if (!confirmed) return;
        const backup = JSON.parse(JSON.stringify(rows));
        rows.splice(idx, 1);
        setCorpDrillCustomRows(rows);
        renderCorpDrillsTab();
        showUndoToast(`"${label}" removed from Corporate Drills`, () => {
            setCorpDrillCustomRows(backup);
            renderCorpDrillsTab();
        });
    });
};

function renderCorpDrillsTab() {
    const viewId = 'esh-calendar-corp-drills-view';
    const container = document.getElementById(viewId);
    if (!container) return;

    const corpProj = state && state.projects ? state.projects.find(p => p.region === 'CORPORATE') : null;
    const canEdit = !!(state && state.isAdmin);
    const storage = getEshStorage();
    const freqColors = { 'Once a year':'#42a5f5','Twice a year':'#fdd835','Quarterly':'#43a047','Monthly':'#0d47a1','As needed':'#4e342e' };
    const customRows = getCorpDrillCustomRows();
    const allDrills = [
        ...CORP_DRILLS,
        ...customRows.map((r, i) => ({ name: r.name||r, freq: r.freq||'Once a year', _custom: true, _customIdx: i }))
    ];
    const projName = corpProj ? corpProj.name : 'Corporate';
    const selYear = (state && state.selectedYear) || new Date().getFullYear();
    const tabType = 'esh-calendar-corp-drills';

    let html = `<div class="esh-cal-wrap">
        <div class="esh-cal-legend" style="flex-wrap:wrap;gap:10px 18px;">
            <span style="font-weight:700;color:var(--text-primary);font-size:0.72rem;">FREQUENCY:</span>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#43a047;"></div>Quarterly — Earthquake</div>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#fdd835;border:1px solid #c8a800;"></div>Twice a Year — Fire</div>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#42a5f5;"></div>Once a Year — Explosion / Bomb / Weather</div>
            <div style="width:1px;background:#ddd;align-self:stretch;"></div>
            <span style="font-weight:700;color:var(--text-primary);font-size:0.72rem;">STATUS:</span>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#2e7d32;"></div>Completed</div>
            <div class="esh-cal-legend-item"><div class="esh-cal-legend-box" style="background:#c62828;"></div>Overdue</div>
            <div class="esh-cal-legend-item" style="margin-left:auto;"><span style="background:#1b5e20;color:white;padding:2px 8px;border-radius:10px;font-size:0.6rem;font-weight:700;">ADMIN ONLY</span></div>
        </div>
        <div class="corp-drills-table-outer">
            <div class="corp-drills-table-header-bar">
                <i class="fas fa-building-columns" style="margin-right:6px;"></i>
                <strong>CORPORATE Drills &amp; Activities</strong> — For the Corporate Office only.
                ${canEdit ? 'Click <strong>Plan</strong> cell to schedule. Enter <strong>Actual</strong> date upon completion.' : ('' + window.icon("lock") + ' View only — Admin can edit.')}
            </div>
            <div style="overflow-x:auto;"><table class="esh-table esh-plain">
                <thead><tr>
                    <th class="esh-th-name" rowspan="2" style="min-width:260px;">Drill / Training / Activity</th>
                    <th class="esh-th-freq" rowspan="2" style="text-align:center;min-width:90px;">Frequency</th>`;

    ESH_MONTHS.forEach(m => { html += `<th colspan="2" style="text-align:center;border-left:2px solid rgba(255,255,255,0.15);">${m.substring(0,3)}</th>`; });
    html += `</tr><tr>`;
    ESH_MONTHS.forEach(() => { html += `<th class="esh-th-plan">Plan</th><th class="esh-th-actual">Actual</th>`; });
    html += `</tr></thead><tbody>`;

    allDrills.forEach((drill, di) => {
        const fc = freqColors[drill.freq] || '#555';
        const drillColor = drill.color || fc;
        const isCustom = !!drill._custom;
        const customIdx = (isCustom && drill._customIdx !== undefined) ? drill._customIdx : null;
        const storageIdx = isCustom ? (1000 + customIdx) : di;

        html += `<tr>
            <td class="esh-td-name" style="min-width:260px;">
                ${isCustom ? '<span style="background:#e8f5e9;color:#1b5e20;border-radius:4px;font-size:0.55rem;font-weight:700;padding:1px 5px;margin-right:5px;vertical-align:middle;">CUSTOM</span>' : ''}
                ${drill.name}
                ${(isCustom && canEdit) ? `<button onclick="eshCorpDrillDeleteRow(${customIdx})" title="Remove this row" style="float:right;background:none;border:none;color:#c62828;cursor:pointer;font-size:0.75rem;padding:0 3px;opacity:0.6;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6"><i class="fas fa-trash"></i></button>` : ''}
            </td>
            <td class="esh-td-freq"><span class="esh-freq"><i style="background:${drillColor};"></i>${drill.freq}</span></td>`;

        ESH_MONTHS.forEach((m, mi) => {
            const planKey = getEshKey(tabType, projName, storageIdx, mi, 'plan');
            const actualKey = getEshKey(tabType, projName, storageIdx, mi, 'actual');
            const isPlanned = !!(storage[planKey]) && storage[planKey] !== '__DELETED__';
            // Defensive: ignore actual if plan was cleared
            const _rawActualCorp = (storage[actualKey] && storage[actualKey] !== '__DELETED__') ? storage[actualKey] : '';
            const actualVal = isPlanned ? _rawActualCorp : '';
            const overdue = isPlanned && !actualVal && isMonthOverdue(mi);
            const done = !!actualVal;
            let actualClass = 'esh-td-actual';
            if (done) actualClass += ' esh-done';
            else if (overdue) actualClass += ' esh-overdue';

            const planBgStyle = `--dc:${drillColor};`;

            html += `<td class="esh-td-plan${isPlanned?' esh-planned':''}${!canEdit?' esh-plan-locked':''}"
                style="${planBgStyle}"
                data-tabtype="${tabType}" data-ti="${storageIdx}" data-mi="${mi}"
                data-drillcolor="${drillColor}"
                onclick="event.stopPropagation();eshCorpSetPlan('${tabType}','${projName}',${storageIdx},${mi},null,this,'${drillColor}')"
                title="${!canEdit ? '🔒 Admin only' : isPlanned ? 'Click to unschedule' : 'Click to schedule'}"></td>`;
            const _corpEditDisabled = (!canEdit || !(state && state.isEditing)) ? 'disabled' : '';
            html += `<td class="${actualClass}"><input type="date" value="${actualVal}" ${_corpEditDisabled}
                onchange="eshSetActual('${tabType}','${projName}',${storageIdx},${mi},this.value,this.closest('td'))"></td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table></div></div>`;

    if (canEdit) {
        html += `<div style="padding:12px 0 0;text-align:center;">
            <button onclick="eshCorpDrillAddRow()" style="background:linear-gradient(135deg,#1b5e20,#388e3c);color:white;border:none;border-radius:7px;padding:7px 18px;font-size:0.74rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                <i class="fas fa-plus-circle"></i> ADD ROW
            </button>
            <span style="font-size:0.63rem;color:var(--text-secondary);margin-left:10px;">Add client-required drills or additional trainings not in the standard list</span>
        </div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
}
window.renderCorpDrillsTab = renderCorpDrillsTab;

// ── ESH plain tables: dynamic frozen-column offset ───────────────────────────
// The Frequency column sticks right after the Drill-name column. The name column
// width depends on its content, so it is measured (and re-measured on resize)
// and exposed to CSS as --ep-name-w on each table.esh-plain.
(function () {
    if (window.__eshPlainSync) return;
    window.__eshPlainSync = true;
    const ro = (typeof ResizeObserver !== 'undefined')
        ? new ResizeObserver(entries => {
            entries.forEach(en => {
                const th = en.target, tbl = th.closest('table.esh-plain');
                if (tbl) tbl.style.setProperty('--ep-name-w', Math.round(th.getBoundingClientRect().width) + 'px');
            });
        })
        : null;
    function sync() {
        document.querySelectorAll('table.esh-plain:not([data-ep-sync])').forEach(tbl => {
            const th = tbl.querySelector('th.esh-th-name');
            if (!th) return;
            tbl.setAttribute('data-ep-sync', '1');
            tbl.style.setProperty('--ep-name-w', Math.round(th.getBoundingClientRect().width) + 'px');
            if (ro) ro.observe(th);
        });
    }
    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; sync(); });
    }).observe(document.body, { childList: true, subtree: true });
    sync();
})();

function _eshCustomRowsKey(tabType, projName) {
    return 'esh_custom_rows_' + tabType + '|' + (projName || '');
}
function _eshFirebaseCustomRowsPath(tabType, projName) {
    const safe = (tabType + '_' + (projName || '')).replace(/[^a-z0-9_]/gi, '_');
    return 'esh-custom-rows-v2/' + safe;
}

function getEshCustomRows(tabType, projName) {
    try { return JSON.parse(localStorage.getItem(_eshCustomRowsKey(tabType, projName)) || '[]'); } catch(e) { return []; }
}
function setEshCustomRows(tabType, projName, rows) {
    if (window.UserAccounts && state && state.currentUser) {
        const _info = window.UserAccounts.getUserInfo(state.currentUser.email);
        if (_info && _info.role === 'manager') return;
    }
    localStorage.setItem(_eshCustomRowsKey(tabType, projName), JSON.stringify(rows));
    try {
        if (window.firebaseRealtimeDb && window.firebase && window.firebase.dbRef && window.firebase.set) {
            const ref = window.firebase.dbRef(window.firebaseRealtimeDb, _eshFirebaseCustomRowsPath(tabType, projName));
            window.firebase.set(ref, rows).catch(e => console.warn('custom rows save failed:', e));
        }
    } catch(e) {}
}
window.getEshCustomRows = getEshCustomRows;

window.startEshCustomRowsSync = function() {
    if (!window.firebaseRealtimeDb || !window.firebase || !window.firebase.dbRef || !window.firebase.onValue) return;
    const ref = window.firebase.dbRef(window.firebaseRealtimeDb, 'esh-custom-rows-v2');
    window.firebase.onValue(ref, (snapshot) => {
        const data = snapshot.val();
        if (!data || typeof data !== 'object') return;
        Object.entries(data).forEach(([safeKey, rows]) => {
            if (Array.isArray(rows)) {
            }
        });
        const allTabs = ['esh-calendar-env','esh-calendar-safety','esh-calendar-health','esh-calendar-drills'];
        if (state && allTabs.includes(state.currentTab)) {
            try { renderEshCalendar(state.currentTab); } catch(e) {}
        }
    }, (err) => {  });
};

window.eshAddRowModal = function(tabType, projName) {
    if (!state || !state.isAdmin) { if(typeof showToast==='function') showToast('Admin only — Only Admins can add rows.', 'warning'); return; }
    const isDrills = tabType === 'esh-calendar-drills';
    const existing = document.getElementById('esh-std-addrow-modal');
    if (existing) existing.remove();
    const m = document.createElement('div');
    m.id = 'esh-std-addrow-modal';
    const escapedProj = (projName || '').replace(/'/g, "\\'");
    window.eshMountModal(m, { id: 'esh-std-addrow-modal', icon: 'fa-plus-circle', width: 460,
        title: 'Add custom row',
        sub: `Will appear <strong>only for: ${projName || 'this project'}</strong> in <strong>${tabType.replace('esh-calendar-','').toUpperCase()}</strong>.`,
        body: `<div style="padding:16px 18px;"><label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px;">${isDrills ? 'Drill / Activity Name' : 'Training / Awareness Topic'}</label>
        <input id="esh-std-addrow-name" type="text" placeholder="${isDrills ? 'e.g. Active Shooter Response' : 'e.g. Ladder Safety Awareness'}" autocomplete="off"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border-color);border-radius:8px;font-size:0.82rem;background:var(--input-bg);color:var(--text-primary);margin-bottom:14px;box-sizing:border-box;">
        ${isDrills ? `<label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:5px;">Frequency</label>
        <select id="esh-std-addrow-freq" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-color);border-radius:8px;font-size:0.82rem;background:var(--input-bg);color:var(--text-primary);margin-bottom:20px;box-sizing:border-box;">
            <option value="Once a year">Once a year</option>
            <option value="Twice a year">Twice a year</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Monthly">Monthly</option>
            <option value="As needed">As needed</option>
        </select>` : '<div style="height:20px;"></div>'}
        </div>`,
        foot: `<button class="mdl-btn neutral" onclick="eshCloseModal('esh-std-addrow-modal')">Cancel</button><button class="mdl-btn primary" onclick="eshConfirmAddRow('${tabType}','${escapedProj}')"><i class="fas fa-plus" style="margin-right:5px;"></i>Add row</button>`
    });
    setTimeout(() => { const el = document.getElementById('esh-std-addrow-name'); if(el) el.focus(); }, 50);
};

window.eshConfirmAddRow = function(tabType, projName) {
    const nameEl = document.getElementById('esh-std-addrow-name');
    const freqEl = document.getElementById('esh-std-addrow-freq');
    const name = (nameEl ? nameEl.value : '').trim();
    const isDrills = tabType === 'esh-calendar-drills';
    const freq = (isDrills && freqEl) ? freqEl.value : null;
    if (!name) { if(typeof showToast==='function') showToast('Name is required.', 'warning'); return; }
    const rows = getEshCustomRows(tabType, projName);
    const baseItems = isDrills ? ESH_DRILLS : (ESH_TRAININGS[tabType] || []);
    const baseNames = baseItems.map(e => (typeof e === 'string' ? e : e.name).toLowerCase());
    if (baseNames.includes(name.toLowerCase()) || rows.some(r => (typeof r === 'string' ? r : r.name).toLowerCase() === name.toLowerCase())) {
        if(typeof showToast==='function') showToast('This item already exists.', 'warning'); return;
    }
    rows.push(isDrills ? { name, freq: freq || 'Once a year' } : name);
    setEshCustomRows(tabType, projName, rows);
    const modal = document.getElementById('esh-std-addrow-modal');
    if (modal) modal.remove();
    try { renderEshCalendar(tabType); } catch(e) {}
    if(typeof showToast==='function') showToast(name + ' added to ' + (projName || 'project') + '.', 'success');
};

window.eshDeleteCustomRow = function(tabType, projName, rowIdx) {
    const rows = getEshCustomRows(tabType, projName);
    const item = rows[rowIdx];
    const label = typeof item === 'string' ? item : (item && item.name) ? item.name : `Row #${rowIdx + 1}`;
    showDeleteDialog('ESH Calendar Row', `"${label}" from ${projName || tabType}`).then(confirmed => {
        if (!confirmed) return;
        const backup = JSON.parse(JSON.stringify(rows));
        rows.splice(rowIdx, 1);
        setEshCustomRows(tabType, projName, rows);
        try { renderEshCalendar(tabType); } catch(e) {}
        showUndoToast(`"${label}" removed from ${projName || tabType}`, () => {
            setEshCustomRows(tabType, projName, backup);
            try { renderEshCalendar(tabType); } catch(e) {}
        });
    });
};

const _origRenderEshCalendar = renderEshCalendar;
window.renderEshCalendar = function(tabType) {
    if (tabType === 'esh-calendar-corp-drills') {
        try { if (typeof renderCorpDrillsTab === 'function') renderCorpDrillsTab(); } catch(err) {
            console.error('❌ renderCorpDrillsTab crashed:', err);
        }
        return;
    }
    try {
        _origRenderEshCalendar(tabType);
    } catch(eshErr) {
        console.error('❌ renderEshCalendar crashed:', eshErr);
        const _ec = document.getElementById(tabType + '-view');
        if (_ec) {
            _ec.innerHTML = `<div style="padding:40px;text-align:center;color:#c62828;">
                <i class="fas fa-triangle-exclamation" style="font-size:2rem;margin-bottom:12px;display:block;"></i>
                <div style="font-weight:700;margin-bottom:8px;">ESH Calendar Error — ${eshErr.message}</div>
                <div style="font-size:0.8rem;color:#888;margin-bottom:16px;">Try switching to another tab or refreshing.</div>
                <button onclick="changeTab('overall')" style="padding:8px 20px;background:#2e7d32;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;">↩ Go to Dashboard</button>
            </div>`;
        }
    }
};


})();

// ── Click anywhere on an ACTUAL date box → open the calendar picker ──
// Chrome/Edge only open the picker from the tiny icon (hidden/clipped in these cells), so clicks on the text just focus a segment.
(function () {
    if (window.__eshDatePickerClick) return;
    window.__eshDatePickerClick = true;
    document.addEventListener('click', function (e) {
        var inp = e.target;
        if (!inp || !inp.matches || !inp.matches('.esh-td-actual input[type="date"]')) return;
        if (inp.disabled || inp.readOnly) return;
        try { if (typeof inp.showPicker === 'function') inp.showPicker(); } catch (_) {}
    });
})();
