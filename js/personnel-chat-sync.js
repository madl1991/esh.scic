
// ── Personnel View Modal — defined here so it has access to `state` ──
window.pcViewPersonnel = function(idx) {
    const p = state.personnelData[idx];
    if (!p) return;

    window._pcCurrentIdx = idx;
    const pid = (typeof PersonnelDB !== 'undefined') ? PersonnelDB.getPersonId(p) : String(p._pid || (p.id ? 'emp_' + String(p.id).trim() : String(idx)));
    window._pcCurrentPid = pid;

    // Name
    document.getElementById('pc-view-name').textContent      = (p.name || '').toUpperCase();
    document.getElementById('pc-view-pos-badge').textContent  = p.pos || '—';
    document.getElementById('pc-view-assign').textContent    = p.current ? `· ${p.current}` : '';

    // Info grid — compact, clean
    function _iRow(label, val) {
        const v = (!val || val === '—') ? '<span style="color:#ccc;">—</span>' : val;
        return `<div style="padding:8px 0;border-bottom:1px solid #eef1ef;">
          <div style="font-size:0.58rem;color:#9aa59e;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">${label}</div>
          <div style="font-size:0.75rem;color:#333;font-weight:600;line-height:1.3;">${v}</div>
        </div>`;
    }

    const fmtDate = s => { if(!s) return '—'; const d=new Date(s); return isNaN(d)?s:d.toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}); };
    const calcYOS = s => {
        if(!s) return '—';
        const start = new Date(s);
        if(isNaN(start)) return '—';
        const now = new Date();
        if(start > now) return '—';

        let years  = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();
        let days   = now.getDate() - start.getDate();

        if(days < 0){
            months--;
            const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += prevMonth.getDate();
        }
        if(months < 0){
            years--;
            months += 12;
        }

        if(years  >= 1) return `${years} Year${years!==1?'s':''}`;
        if(months >= 1) return `${months} Month${months!==1?'s':''}`;

        const totalDays = Math.floor((now - start) / (1000*60*60*24));
        const weeks = Math.floor(totalDays / 7);
        if(weeks >= 1) return `${weeks} Week${weeks!==1?'s':''}`;

        return `${totalDays} Day${totalDays!==1?'s':''}`;
    };

    document.getElementById('pc-view-info-grid').innerHTML = [
        _iRow('ID Number',         p.id   || '—'),
        _iRow('Date Hired',        fmtDate(p.hired)),
        _iRow('Length of Service', calcYOS(p.hired)),
        _iRow('Age',              p.age  ? `${p.age} yrs old` : '—'),
        _iRow('Gender',           p.gen  || '—'),
        _iRow('Email',            p.mail || '—'),
        _iRow('Contact No.',      p.num  || '—'),
        _iRow('Home Address',     p.addr || '—'),
    ].join('');

    // Credentials — VIEW ONLY, no upload/edit buttons
    const CERT_MAP_LOCAL = {
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
    const CORP_POS_LOCAL = [
        'QESH Group Manager','QESH Deputy Manager',
        'ESH Manager for Regulation & Compliance','ESH Manager for Project Implementation',
        'Environmental and Sustainability Head','Corporate Physician','Corporate Nurse',
        'Corporate Dentist','QESH Corp. DC','Corporate Safety Officer'
    ];

    const pos        = p.pos || '';
    const isCorpPos  = CORP_POS_LOCAL.includes(pos);
    const certCfg    = CERT_MAP_LOCAL[pos];
    const certSection = document.getElementById('pc-cert-section');
    const certExempt  = document.getElementById('pc-cert-exempt') || { style: {} };
    const certList    = document.getElementById('pc-cert-list');

    if (isCorpPos) {
        certSection.style.display = 'none';
        certExempt.style.display  = 'block';
    } else if (!certCfg) {
        certSection.style.display = 'none';
        certExempt.style.display  = 'none';
    } else {
        certSection.style.display = 'block';
        certExempt.style.display  = 'none';

        // ── DIRECT FIRESTORE READ (same pattern as CSHP/DOLE/DOE-PERMIT) ─────
        // Instead of relying on an onSnapshot listener (which dies after logout),
        // read fresh directly from Firestore each time — exactly like uploadPDF does.
        const certData = (window._pcCertData && window._pcCertData[pid] || {})[certCfg.key];

        // Async-refresh: fetch fresh data from Firestore in background, then re-render.
        // This means the modal opens instantly with cached data (if any), then updates
        // silently once the fresh Firestore read completes — same UX as project PDFs.
        if (window.firebaseDb && window.firebase && window.firebase.getDoc) {
            const _freshPid = pid;
            const _freshIdx = idx;
            window.firebase.getDoc(
                window.firebase.doc(window.firebaseDb, 'personnel_certificates', _freshPid)
            ).then(snap => {
                const freshData = snap.exists() ? snap.data() : {};
                // Update local cache with the fresh Firestore data
                if (!window._pcCertData) window._pcCertData = {};
                window._pcCertData[_freshPid] = freshData;
                // Re-render only if this modal is still showing the same person
                if (window._pcCurrentIdx === _freshIdx &&
                    document.getElementById('pc-view-modal').classList.contains('show')) {
                    const _freshCertCfg = certCfg;
                    const _freshCertData = (freshData || {})[_freshCertCfg.key];
                    const certListEl = document.getElementById('pc-cert-list');
                    if (certListEl) certListEl.innerHTML = _certCardView(_freshCertCfg, _freshCertData);
                }
            }).catch(e => console.warn('pcViewPersonnel: fresh cert read failed:', e.message));
        }

        // View-only cert card
        function _certCardView(cfg, data) {
            const { label, icon } = cfg;

            // Check if marked as To Follow
            const toFollow = p.certToFollow === cfg.key;
            if (toFollow) {
                return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px dashed #ffcc80;border-radius:10px;background:#fff8e1;">
                  <div style="width:34px;height:34px;border-radius:9px;background:#fff3e0;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas ${icon}" style="color:#ffa726;font-size:0.9rem;"></i>
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:0.78rem;font-weight:700;color:#333;">${label}</div>
                    <div style="font-size:0.63rem;color:#e65100;margin-top:2px;font-weight:600;">${window.icon("wait")} Certificate — To Follow</div>
                  </div>
                  <span style="font-size:0.55rem;font-weight:800;color:#e65100;background:#fff3e0;padding:2px 7px;border-radius:20px;border:1px solid #ffcc80;white-space:nowrap;">TO FOLLOW</span>
                </div>`;
            }

            if (!data) {
                return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px dashed #e0e0e0;border-radius:10px;background:#fafafa;">
                  <div style="width:34px;height:34px;border-radius:9px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas ${icon}" style="color:#ccc;font-size:0.9rem;"></i>
                  </div>
                  <div>
                    <div style="font-size:0.78rem;font-weight:700;color:#333;">${label}</div>
                    <div style="font-size:0.63rem;color:#bbb;margin-top:2px;">No certificate on file</div>
                  </div>
                </div>`;
            }

            const now = new Date(); now.setHours(0,0,0,0);
            const exp = data.expiry ? new Date(data.expiry) : null;
            if (exp) exp.setHours(0,0,0,0);
            const d   = (exp && cfg.hasExpiry !== false) ? Math.round((exp - now) / 86400000) : null;

            // Status — only compute if cert has expiry requirement
            const hasExp = !!(data.expiry);
            const missingExp = cfg.hasExpiry !== false && !hasExp;
            const st  = missingExp?'expiring':d===null?'valid':d<0?'expired':d<=60?'expiring':'valid';
            const color  = st==='valid'?'#2e7d32':st==='expiring'?'#e65100':'#c62828';
            const bg     = st==='valid'?'#f1f8e9':st==='expiring'?'#fff3e0':'#ffebee';
            const border = st==='valid'?'#c8e6c9':st==='expiring'?'#ffcc80':'#ef9a9a';
            const stLabel= st==='valid'?'VALID':st==='expiring'?'EXPIRING SOON':'EXPIRED';
            const dLabel = d===null?'No expiry':d<0?`Expired ${Math.abs(d)}d ago`:`${d} days left`;

            return `<div style="border:1.5px solid ${border};border-radius:10px;padding:12px 14px;background:${bg};">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                  <div style="width:34px;height:34px;border-radius:9px;background:${color}18;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas ${icon}" style="color:${color};font-size:0.9rem;"></i>
                  </div>
                  <div style="min-width:0;">
                    <div style="font-size:0.78rem;font-weight:700;color:#222;">${label}</div>
                    <div style="font-size:0.63rem;color:#666;margin-top:2px;">${hasExp ? `Expires <strong>${data.expiry}</strong> · <span style="color:${color};font-weight:700;">${dLabel}</span>` : missingExp ? '<span style="color:#e65100;font-weight:700;">Expiry date not set — please update</span>' : '<span style="color:#000;">No expiration date</span>'}</div>
                  </div>
                </div>
                ${(hasExp || missingExp) ? `<span style="font-size:0.55rem;font-weight:800;color:${color};background:${color}18;padding:2px 7px;border-radius:20px;border:1px solid ${border};white-space:nowrap;flex-shrink:0;">${hasExp ? stLabel : 'SET EXPIRY'}</span>` : ''}
              </div>
              ${data.pdfUrl ? `<a href="${data.pdfUrl}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:10px;padding:6px;background:#fff;border:1px solid ${border};border-radius:7px;font-size:0.68rem;font-weight:700;color:${color};text-decoration:none;"><i class="fas fa-file-pdf"></i> View Certificate PDF</a>` : `<div style="margin-top:8px;padding:5px;text-align:center;font-size:0.63rem;color:#000;">No PDF on file</div>`}
            </div>`;
        }

        certList.innerHTML = _certCardView(certCfg, certData);
    }

    const _pcvm = document.getElementById('pc-view-modal');
    eshModalShow(_pcvm);
};

window.pcCloseView = function() {
    const _pcvm = document.getElementById('pc-view-modal');
    eshModalHide(_pcvm);
};


(function() {
    function todayStr() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function applyMaxDate(input) {
        if (input.type !== 'date') return;
        if (input.hasAttribute('data-allow-future')) return;
        const today = todayStr();
        if (!input.max || input.max > today) {
            input.max = today;
        }
        if (!input._maxDateListener) {
            input._maxDateListener = true;
            input.addEventListener('change', function() {
                if (this.value > todayStr()) {
                    this.value = todayStr();
                    this.style.outline = '2px solid #ef5350';
                    setTimeout(() => { this.style.outline = ''; }, 1200);
                }
            });
        }
    }

    function applyToAll() {
        document.querySelectorAll('input[type="date"]:not([data-allow-future])').forEach(applyMaxDate);
    }

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mut) {
            mut.addedNodes.forEach(function(node) {
                if (node.nodeType !== 1) return;
                if (node.matches && node.matches('input[type="date"]')) {
                    applyMaxDate(node);
                }
                node.querySelectorAll && node.querySelectorAll('input[type="date"]').forEach(applyMaxDate);
            });
        });
    });

    function init() {
        applyToAll();
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

let _chatRoom = 'general';
let _chatListener = null;
let _chatTypingTimeout = null;
let _chatTypingListener = null;
 // incremented each call to cancel stale async calls
let _chatPanelOpen = false;
let _chatUnread = 0;

const CHAT_ROOMS = [
    { id: 'general',     label: 'General' },
    { id: 'ncr',         label: 'NCR' },
    { id: 'south-luzon', label: 'S. Luzon' },
    { id: 'north-luzon', label: 'N. Luzon' },
    { id: 'vismin',      label: 'VisMin' },
    { id: 'corporate',   label: 'Corporate' },
];

// Rooms a user may see: General for everyone, plus the user's own region room.
// Admin, Manager and other all-region accounts (region 'ALL' or 'CORPORATE') see every room.
const CHAT_REGION_ROOM = {
    'NCR': 'ncr',
    'NORTH LUZON': 'north-luzon',
    'SOUTH LUZON': 'south-luzon',
    'VISAYAS & MINDANAO': 'vismin',
    'CORPORATE': 'corporate'
};

function chatAllowedRooms() {
    const role   = (typeof state !== 'undefined' && state?.userRole)   || '';
    const region = (typeof state !== 'undefined' && state?.userRegion) || '';
    const seeAll = role === 'admin' || region === 'ALL' || region === 'CORPORATE';
    return CHAT_ROOMS.filter(r => !CHAT_LEGACY_ROOMS[r.id] && (r.id === 'general' || seeAll || r.id === CHAT_REGION_ROOM[region]));
}

// ── 1-on-1 chats: every user in the list below gets a private chat with every other user ──
// Same list as the Firebase rules for teamChat/general.
const CHAT_DM_EMAILS = [
    'esh@scic.com.ph', 'esh@wda.com.ph', 'esh@corpdc.com.ph',
    'esh@tgm.com.ph', 'esh@mab.com.ph', 'esh@lmp.com.ph', 'esh@health.com.ph',
    'esh@ncr.com.ph', 'esh@ncrpco.com.ph', 'esh@north.com.ph', 'esh@northpco.com.ph',
    'esh@south.com.ph', 'esh@southpco.com.ph', 'esh@vismin.com.ph', 'esh@visminpco.com.ph',
    'esh@cbmganda.com.ph'
];
// The old regional rooms were really a chat between the region's accounts and WDA. They are no longer
// shown as groups; their old messages now appear inside the 1-on-1 chat with WDA.
const CHAT_WDA = 'esh@wda.com.ph';
const CHAT_LEGACY_ROOMS = {
    'ncr':         ['esh@ncr.com.ph',    'esh@ncrpco.com.ph'],
    'north-luzon': ['esh@north.com.ph',  'esh@northpco.com.ph'],
    'south-luzon': ['esh@south.com.ph',  'esh@southpco.com.ph'],
    'vismin':      ['esh@vismin.com.ph', 'esh@visminpco.com.ph']
};
let _chatLegacyListener = null;
const _chatWatchMsgs = {};     // roomId -> messages from the room's own node
const _chatLegacyWatch = {};   // legacy room -> its messages

// Which old regional room belongs to the chat between me and other (only region account <-> WDA)
function chatLegacyRoomFor(me, other) {
    me = String(me || '').toLowerCase(); other = String(other || '').toLowerCase();
    const rooms = Object.keys(CHAT_LEGACY_ROOMS);
    for (let i = 0; i < rooms.length; i++) {
        const acc = CHAT_LEGACY_ROOMS[rooms[i]];
        if ((acc.indexOf(me) >= 0 && other === CHAT_WDA) || (me === CHAT_WDA && acc.indexOf(other) >= 0)) return rooms[i];
    }
    return null;
}
function _chatByKey(a, b) { return a.key < b.key ? -1 : (a.key > b.key ? 1 : 0); }
function chatDmCombinedMsgs(roomId) {
    const me = _chatMe(), other = _chatDmOther(roomId);
    let msgs = (_chatWatchMsgs[roomId] || []).slice();
    const R = chatLegacyRoomFor(me, other);
    if (R) {
        msgs = msgs.concat((_chatLegacyWatch[R] || []).filter(function(m) {
            const e = String(m.email || '').toLowerCase();
            return e === me || e === other;
        }));
    }
    msgs.sort(_chatByKey);
    return msgs;
}

let _chatView = 'list';              // 'list' = list of chats, 'conv' = one open chat
const _chatRoomLastMsg = {};         // roomId -> { text, ts, email }

function _chatMe() { return String(window.firebaseAuth?.currentUser?.email || '').trim().toLowerCase(); }
function _chatIsDm(roomId) { return typeof roomId === 'string' && roomId.indexOf('dm:') === 0; }
function _chatDmOther(roomId) { return roomId.slice(3); }
// Firebase keys cannot contain ".", so dots become commas. The two emails are sorted so both users get the same key.
function chatDmPairKey(a, b) {
    const k = [a, b].map(function(e) { return String(e).trim().toLowerCase().replace(/\./g, ','); }).sort();
    return k[0] + '__' + k[1];
}
function chatRoomPath(roomId) {
    return _chatIsDm(roomId) ? 'dmChat/' + chatDmPairKey(_chatMe(), _chatDmOther(roomId)) : 'teamChat/' + roomId;
}
function chatDmUsers() {
    const me = _chatMe();
    return CHAT_DM_EMAILS.filter(function(e) { return e !== me; });
}
function chatWatchRoomIds() {
    return chatAllowedRooms().map(function(r) { return r.id; })
        .concat(chatDmUsers().map(function(e) { return 'dm:' + e; }));
}
// Names shown in the chat only (the rest of the dashboard keeps the account names)
const CHAT_NAME_OVERRIDES = {
    'esh@wda.com.ph':       'WDA Manager',
    'esh@scic.com.ph':      'Dashboard Admin',
    'esh@corpdc.com.ph':    'QESH DC',
    'esh@cbmganda.com.ph':  'Environmental Head',
    'esh@visminpco.com.ph': 'VisMin PCO',
    'esh@vismin.com.ph':    'VisMin Superintendent'
};
function chatUserName(email) {
    const ov = CHAT_NAME_OVERRIDES[String(email || '').trim().toLowerCase()];
    if (ov) return ov;
    try {
        const i = UserAccounts.getUserInfo(email);
        if (i && i.displayName && i.displayName !== 'Unknown') return i.displayName;
    } catch (e) { }
    return String(email || '').split('@')[0];
}
function chatRoomLabel(roomId) {
    if (_chatIsDm(roomId)) return chatUserName(_chatDmOther(roomId));
    return CHAT_ROOMS.find(function(r) { return r.id === roomId; })?.label || 'General';
}

function chatRoomAllowed(roomId) {
    if (_chatIsDm(roomId)) return chatDmUsers().indexOf(_chatDmOther(roomId)) >= 0;
    return chatAllowedRooms().some(r => r.id === roomId);
}

function chatEnsureRoomAllowed() {
    if (!chatRoomAllowed(_chatRoom)) _chatRoom = 'general';
}

// ── Unread watcher ─────────────────────────────────────────────────────────
// Starts after login and listens to every room the user may see, so the badge works even if the chat
// panel was never opened. "Seen" is the key of the last message read in each room (saved per user in
// localStorage). RTDB push keys are time-ordered, so a newer key means a newer message.
let _chatWatchUnsubs = [];
const _chatRoomLatest = {};   // room -> key of the newest message
const _chatRoomUnread = {};   // room -> messages from other people newer than the seen key

function _chatSeenKey() {
    return 'esh_chat_seen_' + (window.firebaseAuth?.currentUser?.uid || '');
}
function _chatLoadSeen() {
    try { return JSON.parse(localStorage.getItem(_chatSeenKey()) || '{}') || {}; } catch(e) { return {}; }
}
function _chatSaveSeen(map) {
    try { localStorage.setItem(_chatSeenKey(), JSON.stringify(map)); } catch(e) {}
}

function chatUpdateBadge() {
    let total = 0;
    Object.keys(_chatRoomUnread).forEach(function(r) {
        if (_chatPanelOpen && _chatView === 'conv' && r === _chatRoom) return; // the chat being read does not count
        total += _chatRoomUnread[r] || 0;
    });
    _chatUnread = total;
    let badge = document.getElementById('chat-msg-badge');
    if (!badge) {
        const host = document.querySelector('#chat-messenger-container .na-badge') || document.getElementById('chat-messenger-container');
        if (!host) return;
        badge = document.createElement('span');
        badge.id = 'chat-msg-badge';
        badge.className = 'chat-msg-badge na-dot';
        badge.style.display = 'none';
        host.appendChild(badge);
    }
    if (total > 0) {
        badge.textContent = total > 9 ? '9+' : String(total);
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function chatMarkRoomSeen(roomId) {
    const latest = _chatRoomLatest[roomId];
    if (latest !== undefined) {
        const seen = _chatLoadSeen();
        if (!seen[roomId] || latest > seen[roomId]) { seen[roomId] = latest; _chatSaveSeen(seen); }
    }
    _chatRoomUnread[roomId] = 0;
    chatUpdateBadge();
}

function chatStopUnreadWatch() {
    _chatWatchUnsubs.forEach(function(fn) { try { fn(); } catch(e) {} });
    _chatWatchUnsubs = [];
    Object.keys(_chatRoomUnread).forEach(function(k) { delete _chatRoomUnread[k]; });
    Object.keys(_chatRoomLatest).forEach(function(k) { delete _chatRoomLatest[k]; });
    _chatSoundLastKey = {};
    Object.keys(_chatWatchMsgs).forEach(function(k) { delete _chatWatchMsgs[k]; });
    Object.keys(_chatLegacyWatch).forEach(function(k) { delete _chatLegacyWatch[k]; });
    Object.keys(_chatRoomLastMsg).forEach(function(k) { delete _chatRoomLastMsg[k]; });
    chatUpdateBadge();
}

// ── New message sound (generated with Web Audio, no audio file needed) ──
let _chatAudioCtx = null;
let _chatSoundLastKey = {};   // roomId -> latest message key already seen (baseline)
let _chatSoundLastPlay = 0;

function _chatUnlockAudio() {
    try {
        if (!_chatAudioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            _chatAudioCtx = new AC();
        }
        if (_chatAudioCtx.state === 'suspended') _chatAudioCtx.resume();
    } catch (e) { }
}
// Browsers only allow sound after the user has clicked or pressed a key once
['click', 'keydown', 'touchstart'].forEach(function(ev) {
    document.addEventListener(ev, _chatUnlockAudio, { passive: true });
});

function chatPlayMessageSound() {
    try {
        const now = Date.now();
        if (now - _chatSoundLastPlay < 1000) return;
        _chatSoundLastPlay = now;
        if (!_chatAudioCtx || _chatAudioCtx.state !== 'running') return;
        const ctx = _chatAudioCtx;
        const t0 = ctx.currentTime;
        [[880, 0], [1318.5, 0.12]].forEach(function(n) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = n[0];
            gain.gain.setValueAtTime(0.0001, t0 + n[1]);
            gain.gain.exponentialRampToValueAtTime(0.18, t0 + n[1] + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + 0.35);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(t0 + n[1]);
            osc.stop(t0 + n[1] + 0.4);
        });
    } catch (e) { }
}

// Works out unread count, last message, badge and sound for one chat from all the messages that belong to it
function chatProcessRoom(roomId) {
    const me = window.firebaseAuth?.currentUser?.email || '';
    const msgs = _chatIsDm(roomId) ? chatDmCombinedMsgs(roomId) : (_chatWatchMsgs[roomId] || []);
    const latest = msgs.length ? msgs[msgs.length - 1].key : '';
    _chatRoomLatest[roomId] = latest;
    _chatRoomLastMsg[roomId] = msgs.length ? msgs[msgs.length - 1] : null;

    // Sound: only for a newer message from someone else; first load only sets the baseline
    const _prevKey = _chatSoundLastKey[roomId];
    _chatSoundLastKey[roomId] = latest;
    if (_prevKey !== undefined && latest > _prevKey && msgs.length && msgs[msgs.length - 1].email !== me) {
        chatPlayMessageSound();
    }

    const seenMap = _chatLoadSeen();
    if (seenMap[roomId] === undefined) { // first run on this device: what is already there counts as read
        seenMap[roomId] = latest;
        _chatSaveSeen(seenMap);
    }
    if (_chatPanelOpen && _chatView === 'conv' && roomId === _chatRoom) { chatMarkRoomSeen(roomId); chatRenderListIfOpen(); return; }

    const seen = seenMap[roomId] || '';
    _chatRoomUnread[roomId] = msgs.filter(function(m) { return m.key > seen && m.email !== me; }).length;
    chatUpdateBadge();
    chatRenderListIfOpen();
}

function chatStartUnreadWatch() {
    chatStopUnreadWatch();
    const rtdb = window.firebaseRealtimeDb;
    const auth = window.firebaseAuth;
    if (!rtdb || !auth?.currentUser || !window.firebase?.onValue) return;
    const me = _chatMe();

    chatWatchRoomIds().forEach(function(roomId) {
        try {
            const ref = window.firebase.dbRef(rtdb, chatRoomPath(roomId));
            const unsub = window.firebase.onValue(ref, function(snap) {
                const msgs = [];
                snap.forEach(function(child) {
                    const v = child.val() || {};
                    msgs.push({ key: child.key, email: v.email, text: v.text, ts: v.ts });
                });
                _chatWatchMsgs[roomId] = msgs;
                chatProcessRoom(roomId);
            }, function(err) {
                console.warn('Chat unread watch error (' + roomId + '):', err && err.code);
            });
            _chatWatchUnsubs.push(unsub);
        } catch(e) {
            console.warn('Chat unread watch failed (' + roomId + '):', e);
        }
    });

    // Old regional rooms: WDA watches all of them, a region account only its own
    Object.keys(CHAT_LEGACY_ROOMS).forEach(function(R) {
        const acc = CHAT_LEGACY_ROOMS[R];
        const isWda = me === CHAT_WDA;
        if (!isWda && acc.indexOf(me) < 0) return;
        try {
            const ref = window.firebase.dbRef(rtdb, 'teamChat/' + R);
            const unsub = window.firebase.onValue(ref, function(snap) {
                const msgs = [];
                snap.forEach(function(child) {
                    const v = child.val() || {};
                    msgs.push({ key: child.key, email: v.email, text: v.text, ts: v.ts });
                });
                _chatLegacyWatch[R] = msgs;
                (isWda ? acc : [CHAT_WDA]).forEach(function(e) { chatProcessRoom('dm:' + e); });
            }, function(err) {
                console.warn('Chat legacy watch error (' + R + '):', err && err.code);
            });
            _chatWatchUnsubs.push(unsub);
        } catch(e) { }
    });
}
window.chatStartUnreadWatch = chatStartUnreadWatch;
window.chatStopUnreadWatch = chatStopUnreadWatch;

function toggleChatPanel(e) {
    if (e) e.stopPropagation();
    const panel = document.getElementById('chat-panel');
    if (!panel) return;
    _chatPanelOpen = !_chatPanelOpen;
    panel.style.display = _chatPanelOpen ? 'flex' : 'none';
    if (_chatPanelOpen) {
        // This handler stops the click from reaching the document, so the "click outside" closers of the
        // other header dropdowns never run. Close them here so they do not overlap the chat panel.
        ['users-dropdown', 'year-dropdown', 'notification-dropdown', 'settings-dropdown-menu'].forEach(function(id) {
            const dd = document.getElementById(id);
            if (dd) dd.classList.add('hidden');
        });
        chatEnsureRoomAllowed();
        chatStartPresence();
        _chatView = 'list';          // always open on the list of chats
        chatApplyView();
        chatRenderList();
    } else {
        chatClearTyping();
        chatStopPresence();
    }
}

document.addEventListener('click', function(e) {
    if (!_chatPanelOpen) return;
    const container = document.getElementById('chat-messenger-container');
    if (container && !container.contains(e.target)) {
        _chatPanelOpen = false;
        const panel = document.getElementById('chat-panel');
        if (panel) panel.style.display = 'none';
        chatClearTyping();
    }
});

function chatApplyView() {
    const panel = document.getElementById('chat-panel');
    if (!panel) return;
    const conv = _chatView === 'conv';
    panel.classList.toggle('view-conv', conv);
    panel.classList.toggle('view-list', !conv);
    const back = document.getElementById('chat-panel-back');
    if (back) back.style.display = conv ? 'inline-flex' : 'none';
    const icon = document.getElementById('chat-panel-icon');
    if (icon) icon.style.display = conv ? 'none' : '';
    const title = document.getElementById('chat-panel-title');
    const sub = document.getElementById('chat-panel-sub');
    if (conv) {
        if (title) title.textContent = chatRoomLabel(_chatRoom);
        if (sub) sub.textContent = _chatIsDm(_chatRoom) ? 'Private chat' : 'Group chat';
    } else {
        if (title) title.textContent = 'ESH Team Chat';
        if (sub) sub.textContent = 'Messages';
    }
}

function chatOpenRoom(roomId) {
    if (!chatRoomAllowed(roomId)) return;
    _chatRoom = roomId;
    _chatView = 'conv';
    chatApplyView();
    chatMarkRoomSeen(roomId);
    chatListenRoom(roomId);
    setTimeout(function() { const inp = document.getElementById('chat-panel-input'); if (inp) inp.focus(); }, 100);
}

function chatShowList(e) {
    if (e) e.stopPropagation();
    chatClearTyping();
    if (_chatListener && typeof _chatListener._unsub === 'function') { _chatListener._unsub(); _chatListener = null; }
    if (_chatLegacyListener && typeof _chatLegacyListener._unsub === 'function') { _chatLegacyListener._unsub(); _chatLegacyListener = null; }
    if (_chatTypingListener && typeof _chatTypingListener._unsub === 'function') { _chatTypingListener._unsub(); _chatTypingListener = null; }
    _chatView = 'list';
    chatApplyView();
    chatRenderList();
    chatUpdateBadge();
}

async function chatListenRoom(roomId) {
    if (!chatRoomAllowed(roomId)) { roomId = 'general'; _chatRoom = 'general'; }
    const rtdb = window.firebaseRealtimeDb;
    const auth = window.firebaseAuth;
    if (!rtdb) return;

    if (_chatListener && typeof _chatListener._unsub === 'function') {
        _chatListener._unsub();
        _chatListener = null;
    }
    if (_chatLegacyListener && typeof _chatLegacyListener._unsub === 'function') {
        _chatLegacyListener._unsub();
        _chatLegacyListener = null;
    }
    if (_chatTypingListener && typeof _chatTypingListener._unsub === 'function') {
        _chatTypingListener._unsub();
        _chatTypingListener = null;
    }

    const el = document.getElementById('chat-messages-panel');
    if (el) el.innerHTML = '<div style="text-align:center;padding:20px;font-size:0.75rem;color:var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        if (auth?.currentUser) await auth.currentUser.getIdToken(true);
    } catch(e) {
    }

    try {
        const msgRef = window.firebase.dbRef(rtdb, chatRoomPath(roomId));
        const _meE = _chatMe();
        const _otherE = _chatIsDm(roomId) ? _chatDmOther(roomId) : '';
        const _legacyR = _chatIsDm(roomId) ? chatLegacyRoomFor(_meE, _otherE) : null;
        let _mainMsgs = [], _legMsgs = [];
        const _draw = function() {
            const all = _mainMsgs.concat(_legMsgs);
            all.sort(function(a, b) { return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); });
            chatRenderMessages(all);
        };
        const unsub = window.firebase.onValue(msgRef, snap => {
            _mainMsgs = [];
            snap.forEach(child => { _mainMsgs.push({ id: child.key, ...child.val() }); });
            _draw();
        }, err => {
            console.error('Chat listen error:', err.code, err.message);
            const el2 = document.getElementById('chat-messages-panel');
            if (el2) el2.innerHTML = '<div class="chat-empty-panel"><i class="fas fa-exclamation-triangle" style="color:#ef5350;"></i><div style="color:#ef5350;">Permission denied.<br>Check Firebase rules.</div></div>';
        });
        _chatListener = { _unsub: unsub };

        if (_legacyR) {
            const legUnsub = window.firebase.onValue(window.firebase.dbRef(rtdb, 'teamChat/' + _legacyR), snap => {
                _legMsgs = [];
                snap.forEach(child => {
                    const v = child.val() || {};
                    const em = String(v.email || '').toLowerCase();
                    if (em === _meE || em === _otherE) _legMsgs.push({ id: child.key, ...v });
                });
                _draw();
            }, () => { });
            _chatLegacyListener = { _unsub: legUnsub };
        }

        if (_chatIsDm(roomId)) { const tb = document.getElementById('chat-typing-bar'); if (tb) tb.textContent = ''; return; } // no typing indicator in 1-on-1
        const typRef = window.firebase.dbRef(rtdb, 'chatTyping/' + roomId);
        const typUnsub = window.firebase.onValue(typRef, snap => {
            const bar = document.getElementById('chat-typing-bar');
            if (!bar) return;
            const currentUid = auth?.currentUser?.uid;
            const names = [];
            snap.forEach(child => {
                if (child.key !== currentUid) {
                    const name = (child.val().name || '').split(/[\s@]/)[0];
                    if (name) names.push(name);
                }
            });
            if (names.length === 0) {
                bar.textContent = '';
            } else if (names.length === 1) {
                bar.textContent = names[0] + ' is typing…';
            } else {
                bar.textContent = names.slice(0, 2).join(', ') + ' are typing…';
            }
        });
        _chatTypingListener = { _unsub: typUnsub };
    } catch(e) {
        console.error('Chat listen error:', e);
    }
}

// ── Chat presence dots (green = online, orange = idle, grey = offline) ──
let _chatPresence = null;          // null = presence data not available to this user
let _chatPresenceUnsub = null;
let _chatPresenceTimer = null;

function chatPresenceStatus(email) {
    if (_chatPresence === null) return null;
    const em = String(email || '').trim().toLowerCase();
    if (!em) return null;
    const now = (window.PresenceTracker && PresenceTracker._now) ? PresenceTracker._now() : Date.now();
    let best = 'offline';
    Object.values(_chatPresence || {}).forEach(function(d) {
        if (!d || String(d.email || '').trim().toLowerCase() !== em) return;
        if (!d.status || d.status === 'offline') return;
        if (!d.lastSeen || (now - d.lastSeen) > 120000) return;
        if (d.status === 'online') best = 'online';
        else if (best !== 'online') best = 'idle';
    });
    return best;
}

function chatPresenceDotHtml(email) {
    const s = chatPresenceStatus(email);
    if (!s) return '';
    const label = s === 'online' ? 'Online' : (s === 'idle' ? 'Idle' : 'Offline');
    return '<i class="au-dot chat-dot ' + (s === 'idle' ? 'idle' : (s === 'offline' ? 'off' : '')) + '" title="' + label + '"></i>';
}

function chatRefreshPresenceDots() {
    document.querySelectorAll('#chat-panel .au-wrap[data-email]').forEach(function(av) {
        const html = chatPresenceDotHtml(av.getAttribute('data-email'));
        const old = av.querySelector('.chat-dot');
        const oldKey = old ? old.className + '|' + old.title : '';
        let nk = '';
        if (html) { const t = document.createElement('div'); t.innerHTML = html; const n = t.firstChild; nk = n.className + '|' + n.title; }
        if (oldKey === nk) return;
        if (old) old.remove();
        if (html) av.insertAdjacentHTML('beforeend', html);
    });
}

function chatStartPresence() {
    chatStopPresence();
    try {
        if (!window.firebaseRealtimeDb || !window.firebase?.onValue) return;
        const ref = window.firebase.dbRef(window.firebaseRealtimeDb, 'presence');
        _chatPresenceUnsub = window.firebase.onValue(ref, function(snap) {
            _chatPresence = snap.val() || {};
            chatRefreshPresenceDots();
        }, function(err) {
            // No read access to presence for this account: show no dots
            _chatPresence = null;
            chatRefreshPresenceDots();
            console.warn('Chat presence not available:', err && err.code);
        });
        _chatPresenceTimer = setInterval(chatRefreshPresenceDots, 30000);
    } catch (e) { _chatPresence = null; }
}

function chatStopPresence() {
    try { if (typeof _chatPresenceUnsub === 'function') _chatPresenceUnsub(); } catch (e) { }
    _chatPresenceUnsub = null;
    if (_chatPresenceTimer) { clearInterval(_chatPresenceTimer); _chatPresenceTimer = null; }
}

// ── List of chats (groups first, then every user) ──
function _chatEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function chatListTime(ts) {
    if (!ts) return '';
    const d = new Date(ts), n = new Date();
    const diff = n - d;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
    if (diff < 7 * 86400000) return d.toLocaleDateString('en-PH', { weekday: 'short' });
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function _chatListRow(roomId, avatarHtml, name) {
    const last = _chatRoomLastMsg[roomId];
    const unread = _chatRoomUnread[roomId] || 0;
    let preview = 'No messages yet';
    if (last && last.text) preview = (last.email === _chatMe() ? 'You: ' : '') + String(last.text).replace(/\s+/g, ' ');
    const time = last ? chatListTime(last.ts) : '';
    return '<div class="chat-li' + (unread ? ' unread' : '') + '" data-room="' + _chatEsc(roomId) + '">' +
        avatarHtml +
        '<div class="chat-li-body"><div class="chat-li-name">' + _chatEsc(name) + '</div>' +
        '<div class="chat-li-last"><span class="chat-li-text">' + _chatEsc(preview) + '</span>' + (time ? '<span class="chat-li-time"> · ' + time + '</span>' : '') + '</div></div>' +
        (unread ? '<span class="chat-li-count">' + (unread > 9 ? '9+' : unread) + '</span>' : '') +
        '</div>';
}

function chatRenderList() {
    const el = document.getElementById('chat-list-view');
    if (!el) return;
    let html = '<div class="chat-li-head">Groups</div>';
    chatAllowedRooms().forEach(function(r) {
        html += _chatListRow(r.id, '<div class="chat-li-av chat-li-room"><i class="fas fa-users"></i></div>', r.label);
    });

    const people = chatDmUsers().map(function(email) {
        const last = _chatRoomLastMsg['dm:' + email];
        return { email: email, name: chatUserName(email), key: last ? (last.key || '') : '' };
    }).sort(function(a, b) {
        // newest chat first; users with no messages go last, A to Z
        if (a.key !== b.key) return a.key < b.key ? 1 : -1;
        return a.name.localeCompare(b.name);
    });

    html += '<div class="chat-li-head">People</div>';
    people.forEach(function(u) {
        let color = '#999', inner = '';
        try {
            const info = UserAccounts.getUserInfo(u.email);
            if (info && info.color) color = info.color;
            inner = (window.PresenceTracker && PresenceTracker._avatarHtml) ? PresenceTracker._avatarHtml({ email: u.email, displayName: u.name }) : _chatEsc(u.name.substring(0, 2).toUpperCase());
        } catch (e) { inner = _chatEsc(u.name.substring(0, 2).toUpperCase()); }
        const av = '<div class="au-wrap chat-li-av" data-email="' + _chatEsc(u.email) + '" style="background:' + color + ';">' + inner + chatPresenceDotHtml(u.email) + '</div>';
        html += _chatListRow('dm:' + u.email, av, u.name);
    });

    const top = el.scrollTop;
    el.innerHTML = html;
    el.scrollTop = top;
    el.onclick = function(e) {
        const row = e.target.closest ? e.target.closest('.chat-li') : null;
        if (row && row.dataset.room) chatOpenRoom(row.dataset.room);
    };
}

function chatRenderListIfOpen() {
    if (_chatPanelOpen && _chatView === 'list') chatRenderList();
}

function chatRenderMessages(msgs) {
    const el = document.getElementById('chat-messages-panel');
    if (!el) return;
    const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    const currentUser = window.firebaseAuth?.currentUser?.email || '';

    if (!msgs.length) {
        el.innerHTML = '<div class="chat-empty-panel"><i class="fas fa-comment-dots"></i><div>No messages yet.<br>Say something!</div></div>';
        return;
    }

    const lastMsg = msgs[msgs.length - 1];

    const avatarColors = ['#1b5e20','#2e7d32','#388e3c','#24692a','#00695c','#43a047','#0d3d0f','#558b2f'];
    let html = '';
    let lastDate = '';

    msgs.forEach(msg => {
        const isMine = msg.email === currentUser;
        const d = msg.ts ? new Date(msg.ts) : new Date();
        const dateStr = d.toLocaleDateString('en-PH', {month:'short',day:'numeric',year:'numeric'});
        const isToday = dateStr === new Date().toLocaleDateString('en-PH', {month:'short',day:'numeric',year:'numeric'});
        if (dateStr !== lastDate) {
            html += '<div class="chat-pdate"><span>' + (isToday ? 'Today' : dateStr) + '</span></div>';
            lastDate = dateStr;
        }
        const timeStr = d.toLocaleTimeString('en-PH', {hour:'2-digit', minute:'2-digit'});
        const initials = (msg.name || msg.email || '?').split(/[\s@]/)[0].substring(0,2).toUpperCase();
        const color = avatarColors[(msg.email||'').charCodeAt(0) % avatarColors.length];
        const safeText = (msg.text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
        const rolePill = msg.role ? '<span style="font-size:0.5rem;background:rgba(46,125,50,0.12);color:#2e7d32;border:1px solid rgba(46,125,50,0.25);padding:1px 4px;border-radius:6px;margin-left:3px;font-weight:700;text-transform:uppercase;">' + msg.role + '</span>' : '';

        html += '<div class="chat-pmsg ' + (isMine?'mine':'theirs') + '">';
        if (!isMine) {
            // Same avatar as Active Users: user color, label (e.g. ADMIN, WDA), status dot
            let _avColor = color, _avInner = initials;
            try {
                const _ui = (typeof UserAccounts !== 'undefined' && UserAccounts.getUserInfo) ? UserAccounts.getUserInfo(msg.email) : null;
                if (_ui && _ui.color) _avColor = _ui.color;
                if (window.PresenceTracker && PresenceTracker._avatarHtml) {
                    _avInner = PresenceTracker._avatarHtml({ email: msg.email, displayName: msg.name });
                }
            } catch (e) { }
            html += '<div class="au-wrap chat-pavatar chat-pavatar-au" data-email="' + String(msg.email || '').replace(/"/g, '') + '" style="background:' + _avColor + ';">' + _avInner + chatPresenceDotHtml(msg.email) + '</div>';
        }
        html += '<div class="chat-pbubble-wrap">';
        if (!isMine && !_chatIsDm(_chatRoom)) html += '<div class="chat-psender">' + (msg.name||msg.email) + rolePill + '</div>';
        html += '<div class="chat-pbubble">' + safeText + '</div>';
        html += '<div class="chat-ptime">' + timeStr + (isMine ? ' <i class="fas fa-check" style="font-size:0.45rem;opacity:0.7;"></i>' : '') + '</div>';
        html += '</div></div>';
    });

    el.innerHTML = html;
    if (wasAtBottom || lastMsg?.email === currentUser) el.scrollTop = el.scrollHeight;
}

function chatSendMessage() {
    const input = document.getElementById('chat-panel-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const rtdb = window.firebaseRealtimeDb;
    const auth = window.firebaseAuth;
    if (!rtdb || !auth?.currentUser) { showToast('Not authenticated.', 'error'); return; }
    chatEnsureRoomAllowed();

    try {
        const msgRef = window.firebase.dbRef(rtdb, chatRoomPath(_chatRoom));
        window.firebase.push(msgRef, {
            text,
            email: auth.currentUser.email,
            name: state?.displayName || auth.currentUser.email,
            role: state?.userRole || '',
            region: state?.userRegion || '',
            ts: Date.now()
        });
        input.value = '';
        chatInputResize(input);
        chatClearTyping();
    } catch(e) {
        showToast('Send failed: ' + e.message, 'error');
    }
}

function chatInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatSendMessage(); }
}

function chatInputResize(el) {
    el.style.height = 'auto';
    const border = el.offsetHeight - el.clientHeight; // border-box: scrollHeight does not include the border
    const full = el.scrollHeight + border;
    el.style.height = Math.min(full, 80) + 'px'; // 80 = max-height of .chat-panel-input
    el.style.overflowY = full > 80 ? 'auto' : 'hidden';
}

function chatSendTyping() {
    if (_chatIsDm(_chatRoom)) return;
    const rtdb = window.firebaseRealtimeDb;
    const auth = window.firebaseAuth;
    if (!rtdb || !auth?.currentUser) return;
    try {
        const uid = auth.currentUser.uid;
        const typRef = window.firebase.dbRef(rtdb, 'chatTyping/' + _chatRoom + '/' + uid);
        window.firebase.set(typRef, { name: window.state?.displayName || auth.currentUser.email, ts: Date.now() });
        clearTimeout(_chatTypingTimeout);
        _chatTypingTimeout = setTimeout(() => chatClearTyping(), 3000);
    } catch(e) {  }
}

function chatClearTyping() {
    const rtdb = window.firebaseRealtimeDb;
    const auth = window.firebaseAuth;
    clearTimeout(_chatTypingTimeout);
    if (_chatIsDm(_chatRoom)) return;
    if (!rtdb || !auth?.currentUser) return;
    try {
        const uid = auth.currentUser.uid;
        const typRef = window.firebase.dbRef(rtdb, 'chatTyping/' + _chatRoom + '/' + uid);
        window.firebase.remove(typRef);
    } catch(e) {  }
}

const ESHDataSync = (() => {

    const REGION_KEY_MAP = {
        'NCR':                  'NCR',
        'NORTH LUZON':          'NORTH_LUZON',
        'SOUTH LUZON':          'SOUTH_LUZON',
        'VISAYAS & MINDANAO':   'VISMIN',
        'PLANT OPERATIONS':     'PLANT_OPS',
        'CORPORATE':            'CORPORATE',
        'ALL':                  'ALL'
    };

    const ENV_MODULES = new Set([
        'env_monitoring','env_waste','env_water','env_appliances','env_fuel',
        'emb','permits','env_monthly_report','nov_env',
        'env-monitoring','nov-env',   // tab name aliases
        'ecc','pcab','zoning', // 'doe' REMOVED — Superintendent write only
        'esh_calendar_env',     // ESH Calendar — Environment Trainings
        'esh-calendar-env',     // alias
    ]);

    const TAB_TO_MODULE = {
        'overall':                  null,  // no row-based data
        'rates':                    null,
        'medical':                  'medical',
        'exposures':                'exposures',
        'activities':               'activities',
        'kpm':                      'kpm',
        'reg':                      'reg',
        'audit':                    'audit',
        'cshp':                     'cshp',
        'dole':                     'dole',
        'permits':                  'permits',
        'emb':                      'emb',
        'doe':                      'doe',
        'doe-permit':               'doe_permit',       // DOE SOP
        'env-monitoring':           'env_monitoring',
        'nov':                      'nov_osh',
        'nov-env':                  'nov_env',
        'lta-registry':             'lta_registry',
        'tabulation':               'tabulation',       // Envi Reportorial
        'got-monitoring':           'got_monitoring',
        'osh-requirement':          'osh_requirement',
        'health-report':            'health_report',
        'esh-calendar-env':         null,
        'esh-calendar-safety':      null,
        'esh-calendar-health':      null,
        'esh-calendar-drills':      null,
        'esh-calendar-corp-drills': null,
        'env-monthly-report':       'env_monthly_report',   // Environmental Monthly Report
    };

    const _ydocCache   = new Map();
    const _debounce    = new Map();   // key → timer id
    let   _initialized = false;
    let   _currentTab  = null;

    function regionKey(raw) {
        const up = (raw || '').toUpperCase().trim();
        return REGION_KEY_MAP[up] || up.replace(/[^A-Z0-9]/g, '_');
    }

    function toRowId(projectName) {
        return (projectName || 'unknown')
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 180);
    }

    function toEnvRowId(id) {
        return 'env_' + String(id).replace(/[^0-9]/g, '').substring(0, 18);
    }

    function isEnvModule(module) {
        return ENV_MODULES.has(module);
    }

    
    function yjsDocPath(region, module) {
        return `ESH_YJS/${regionKey(region)}_${module}`;
    }

    function canWrite(region, module) {
        const auth = window.firebaseAuth;
        if (!auth?.currentUser) return false;
        const email      = auth.currentUser.email;
        const info       = (typeof UserAccounts !== 'undefined') ? UserAccounts.getUserInfo(email) : null;
        if (!info) return false;
        const role       = info.role;
        const userRegion = regionKey(info.region || '');
        const rk         = regionKey(region);
        const isEnv      = isEnvModule(module);

        if (role === 'admin')          return rk === 'CORPORATE' && !isEnv;
        if (role === 'superintendent') return rk === userRegion  && !isEnv;
        if (role === 'envi_head')      return isEnv; // overall Environmental Head — all regions
        if (role === 'pco')            return rk === userRegion  && isEnv;

        return false;
    }

    async function _getOrCreateYDoc(region, module) {
        const path = yjsDocPath(region, module);
        if (_ydocCache.has(path)) return _ydocCache.get(path);

        if (typeof Y === 'undefined') {
            let _yjsWaited = 0;
            while (typeof Y === 'undefined' && _yjsWaited < 2000) {
                await new Promise(r => setTimeout(r, 50));
                _yjsWaited += 50;
            }
            if (typeof Y === 'undefined') {
                console.error('ESHDataSync: Yjs failed to load. CRDT sync unavailable.');
                return null;
            }
        }

        const db = window.firebaseDb;
        if (!db) return null;

        const ydoc  = new Y.Doc();
        const ytable = ydoc.getMap('manpower'); // shared map for this region+module

        const updatesCol = window.firebase.collection(db, path, 'updates');

        try {
            const snap = await window.firebase.getDocs(updatesCol);
            snap.forEach(docSnap => {
                const raw = docSnap.data().u;
                if (raw) {
                    const arr = new Uint8Array(raw);
                    Y.applyUpdate(ydoc, arr);
                }
            });
        } catch (e) {
        }

        ydoc.on('update', async (update, origin) => {
            if (origin === 'remote') return; // don't echo back remote updates
            try {
                const newDocRef = window.firebase.doc(updatesCol); // auto-ID
                await window.firebase.setDoc(newDocRef, { u: Array.from(update), t: Date.now() });
            } catch (e) {
                console.error('ESHDataSync [Yjs]: failed to persist update —', e.message);
            }
        });

        const unsubUpdates = window.firebase.onSnapshot(updatesCol, (snap) => {
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const raw = change.doc.data().u;
                    if (!raw) return;
                    const arr = new Uint8Array(raw);
                    Y.applyUpdate(ydoc, arr, 'remote');
                }
            });
        }, (err) => console.warn(`ESHDataSync [Yjs] snapshot error [${path}]:`, err.message));

        ytable.observe((event) => {
            event.changes.keys.forEach((change, rowId) => {
                if (change.action === 'delete') return;
                const rowMap = ytable.get(rowId);
                if (!rowMap || !(rowMap instanceof Y.Map)) return;
                _mergeYRowIntoState(rowId, rowMap);
            });
        });

        const entry = { ydoc, ytable, unsubUpdates };
        _ydocCache.set(path, entry);
        return entry;
    }

    
    function _mergeYRowIntoState(rowId, rowMap) {
        if (typeof state === 'undefined' || !state.projects) return;
        const proj = state.projects.find(p => toRowId(p.name) === rowId);
        if (!proj) return;
        let changed = false;
        rowMap.forEach((val, fieldRaw) => {
            if (fieldRaw === '__meta') return;
            const lastUnder = fieldRaw.lastIndexOf('_');
            if (lastUnder < 0) return;
            const key  = fieldRaw.substring(0, lastUnder);
            const mIdx = parseInt(fieldRaw.substring(lastUnder + 1), 10);
            if (isNaN(mIdx)) return;
            if (!proj.vals) proj.vals = {};
            if (!proj.vals[key]) proj.vals[key] = new Array(13).fill('');
            if (proj.vals[key][mIdx] !== val) {
                proj.vals[key][mIdx] = val;
                changed = true;
            }
        });
        if (changed) {
            _flashRemoteUpdate();
        }
    }

    async function saveField(region, module, rowId, fieldObj) {
        if (!canWrite(region, module)) {
            const _info = (typeof UserAccounts !== 'undefined')
                ? UserAccounts.getUserInfo(window.firebaseAuth?.currentUser?.email)
                : null;
            console.warn(
                `🔒 ESHDataSync [Yjs]: BLOCKED — cannot write to ${module}/${region}`,
                `| role: ${_info?.role || '?'}`,
                `| userRegion: ${_info?.region || '?'}`,
                `| isEnvModule: ${isEnvModule(module)}`,
                `| TIP: Check ENV_MODULES set and TAB_TO_MODULE — module may be miscategorized`
            );
            return false;
        }
        const entry = await _getOrCreateYDoc(region, module);
        if (!entry) return false;

        const { ydoc, ytable } = entry;

        ydoc.transact(() => {
            let rowMap = ytable.get(rowId);
            if (!rowMap || !(rowMap instanceof Y.Map)) {
                rowMap = new Y.Map();
                ytable.set(rowId, rowMap);
            }
            Object.entries(fieldObj).forEach(([field, val]) => {
                rowMap.set(field, val === undefined ? '' : String(val));
            });
            rowMap.set('__meta', JSON.stringify({
                by: window.firebaseAuth?.currentUser?.uid || 'unknown',
                at: Date.now()
            }));
        });

        console.log(`✅ ESHDataSync [Yjs]: ${regionKey(region)}/${module}/${rowId} updated (CRDT)`);
        return true;
    }

    function queueFieldSave(region, tabName, projectName, key, mIdx, val) {
        const module = TAB_TO_MODULE[tabName] || tabName;
        if (!module) return;
        const rk     = regionKey(region);
        const rowId  = toRowId(projectName);
        const field  = `${key.replace(/[^a-zA-Z0-9_]/g, '_')}_${mIdx}`;
        const dKey   = `${rk}/${module}/${rowId}/${field}`;

        clearTimeout(_debounce.get(dKey));
        _debounce.set(dKey, setTimeout(async () => {
            _debounce.delete(dKey);
            const ok = await saveField(region, module, rowId, { [field]: val });
            if (ok) console.log(`✅ ESHDataSync [Yjs]: ${dKey} = "${val}"`);
        }, 400));
    }

    async function saveEnvRow(module, rowObj) {
        if (!rowObj || !rowObj.region) return;
        const rowId   = toEnvRowId(rowObj.id);
        const payload = { ...rowObj };
        delete payload.id;
        const ok = await saveField(rowObj.region, module, rowId, payload);
        if (ok) console.log(`✅ ESHDataSync [Yjs]: env row saved → ${module}/${rowId}`);
    }

    async function deleteEnvRow(module, rowObj) {
        if (!rowObj || !rowObj.region) return;
        if (!canWrite(rowObj.region, module)) return;
        const entry = await _getOrCreateYDoc(rowObj.region, module);
        if (!entry) return;
        const rowId = toEnvRowId(rowObj.id);
        entry.ydoc.transact(() => {
            entry.ytable.delete(rowId);
        });
        try {
            const db = window.firebaseDb;
            const path = yjsDocPath(rowObj.region, module);
            const tombRef = window.firebase.doc(db, path, 'tombstones', rowId);
            await window.firebase.setDoc(tombRef, { deletedAt: Date.now(), by: window.firebaseAuth?.currentUser?.uid });
        } catch (e) {
        }
    }

    function attachRowListener(region, module, rowId, onUpdate) {
        _getOrCreateYDoc(region, module).then(entry => {
            if (!entry) return;
            const { ytable } = entry;
            const rowMap = ytable.get(rowId);
            if (rowMap instanceof Y.Map) {
                rowMap.observe(() => {
                    const data = {};
                    rowMap.forEach((v, k) => { if (k !== '__meta') data[k] = v; });
                    if (typeof onUpdate === 'function') onUpdate(data, region, module, rowId);
                });
            }
        });
    }

    function _flashRemoteUpdate() {
        if (typeof showToast === 'function') {
            clearTimeout(_flashRemoteUpdate._toast);
            _flashRemoteUpdate._toast = setTimeout(() => {
                showToast('Live update received from another user (CRDT merged)', 'info', 2500);
            }, 200);
        }
    }
    _flashRemoteUpdate._toast = null;

    function detachAll() {
        _ydocCache.forEach(({ ydoc, unsubUpdates }) => {
            try { unsubUpdates && unsubUpdates(); } catch (e) {}
            try { ydoc.destroy(); } catch (e) {}
        });
        _ydocCache.clear();
    }

    function onTabChange(tabName) {
        _currentTab = tabName;
        const module = TAB_TO_MODULE[tabName];
        _ydocCache.forEach(({ ydoc, unsubUpdates }, path) => {
            if (module && !path.endsWith(`_${module}`)) {
                try { unsubUpdates && unsubUpdates(); } catch (e) {}
                try { ydoc.destroy(); } catch (e) {}
                _ydocCache.delete(path);
            }
        });
        setTimeout(() => {
            if (typeof state === 'undefined' || !state.projects) return;
            const seenPaths = new Set();
            state.projects.forEach(p => {
                if (!module) return;
                const path = yjsDocPath(p.region, module);
                if (seenPaths.has(path)) return;
                seenPaths.add(path);
                _getOrCreateYDoc(p.region, module);
            });
        }, 300);
    }

    function init() {
        if (_initialized) return;
        _initialized = true;

        document.addEventListener('change', async (e) => {
            const el = e.target;
            if (!el.matches('input, select, textarea')) return;
            const region = el.dataset.region;
            const module = el.dataset.module;
            const rowId  = el.dataset.row;
            const field  = el.dataset.field;
            if (!region || !module || !rowId || !field) return;

            const dKey = `${regionKey(region)}/${module}/${rowId}/${field}`;
            clearTimeout(_debounce.get(dKey));
            _debounce.set(dKey, setTimeout(async () => {
                _debounce.delete(dKey);
                const ok = await saveField(region, module, rowId, { [field]: el.value });
                if (ok) console.log(`✅ ESHDataSync [Yjs attr]: ${dKey} = "${el.value}"`);
            }, 350));
        });

        document.addEventListener('input', (e) => {
            const el = e.target;
            if (!el.matches('input[type="text"], input:not([type]), textarea')) return;
            const region = el.dataset.region;
            const module = el.dataset.module;
            const rowId  = el.dataset.row;
            const field  = el.dataset.field;
            if (!region || !module || !rowId || !field) return;

            const dKey = `${regionKey(region)}/${module}/${rowId}/${field}`;
            clearTimeout(_debounce.get(dKey));
            _debounce.set(dKey, setTimeout(async () => {
                _debounce.delete(dKey);
                const ok = await saveField(region, module, rowId, { [field]: el.value });
                if (ok) console.log(`✅ ESHDataSync [Yjs input]: ${dKey} = "${el.value}"`);
            }, 700));
        });

    }

    // Copy a project's rows (KPM, DOLE, audit, etc.) from its old name to its new name.
    // Row id in ESH_YJS is derived from the project name, so a rename would otherwise
    // leave all saved data under the old row id (hidden, and the new name starts blank).
    // COPY only: old rows are kept (safe if another year still uses the old name).
    // Existing non-empty values under the new name are NOT overwritten.
    async function renameProjectRows(oldName, newName, oldRegion, newRegion) {
        const res = { moved: 0, modules: [] };
        if (!oldName || !newName) return res;
        const oldRowId = toRowId(oldName), newRowId = toRowId(newName);
        const oldRk = regionKey(oldRegion), newRk = regionKey(newRegion || oldRegion);
        if (oldRowId === newRowId && oldRk === newRk) return res;
        // If the Yjs library failed to load (CDN blocked), stop now. Otherwise every module waits 2s.
        let _yw = 0;
        while (typeof Y === 'undefined' && _yw < 2000) { await new Promise(r => setTimeout(r, 50)); _yw += 50; }
        if (typeof Y === 'undefined') {
            res.failed = true;
            return res;
        }
        const modules = Array.from(new Set(Object.values(TAB_TO_MODULE).filter(Boolean)));
        for (const module of modules) {
            try {
                const src = await _getOrCreateYDoc(oldRegion, module);
                if (!src) continue;
                const oldMap = src.ytable.get(oldRowId);
                if (!oldMap || !(oldMap instanceof Y.Map)) continue;
                const dst = (newRk === oldRk) ? src : await _getOrCreateYDoc(newRegion || oldRegion, module);
                if (!dst) continue;
                const fields = {};
                oldMap.forEach((v, k) => { if (k !== '__meta') fields[k] = v; });
                dst.ydoc.transact(() => {
                    let newMap = dst.ytable.get(newRowId);
                    if (!newMap || !(newMap instanceof Y.Map)) {
                        newMap = new Y.Map();
                        dst.ytable.set(newRowId, newMap);
                    }
                    Object.entries(fields).forEach(([k, v]) => {
                        const cur = newMap.get(k);
                        if (cur === undefined || cur === null || cur === '') newMap.set(k, v);
                    });
                    newMap.set('__meta', JSON.stringify({
                        by: window.firebaseAuth?.currentUser?.uid || 'unknown',
                        at: Date.now(),
                        renamedFrom: oldName
                    }));
                });
                res.moved++;
                res.modules.push(module);
            } catch (e) {
            }
        }
        return res;
    }

    return {
        renameProjectRows,
        init,
        onTabChange,
        queueFieldSave,
        saveEnvRow,
        deleteEnvRow,
        saveField,
        attachRowListener,
        detachAll,
        canWrite,
        regionKey,
        TAB_TO_MODULE,
        ENV_MODULES
    };

})(); // IIFE — self-contained, no global pollution except window.ESHDataSync

window.ESHDataSync = ESHDataSync;

// Recovery for projects that were renamed BEFORE the rename fix.
// Run in the browser console (Superintendent of that region, or admin, logged in):
//   eshRecoverRenamedProject('OLD PROJECT NAME', 'NEW PROJECT NAME', 'NCR', 2026)   // year optional; omit = all years
// Copies ESH_YJS rows and re-keys ESH Calendar RTDB entries from the old name to the new name.
window.eshRecoverRenamedProject = async function(oldName, newName, region, year) {
    // Allowed: the Superintendent of that region (they are the ones who rename projects), or admin.
    const _email = state && state.currentUser ? state.currentUser.email : null;
    const _info = (_email && typeof UserAccounts !== 'undefined') ? UserAccounts.getUserInfo(_email) : null;
    const _okSupt = !!(_info && _info.role === 'superintendent' && (_info.region || '').toUpperCase() === (region || '').toUpperCase());
    if (!(state && state.isAdmin) && !_okSupt) { console.error('Only the Superintendent of ' + region + ' (or admin) can run this.'); return; }
    if (!oldName || !newName || !region) { console.error('Usage: eshRecoverRenamedProject(oldName, newName, region)'); return; }
    const y = await window.ESHDataSync.renameProjectRows(oldName, newName, region, region);
    await window._eshRtdbRenameProject(oldName, newName, year);
    try { render(); } catch(e) {}
    if (typeof showToast === 'function') showToast('Recovery done: ' + y.moved + ' module(s) copied. Refresh the page to verify.', 'success', 6000);
};

// ─── Region banner colors ─────────────────────────────────────────────────────
// One source: window.REGION_COLORS (index.html). Banners only need class "region-<slug>".
// Light regions (white:true) keep the white look defined in styles.css.
(function eshRegionBannerCss() {
    var rc = window.REGION_COLORS || {};
    var css = Object.keys(rc).map(function (name) {
        var c = rc[name];
        if (c.white) return '';
        var slug = name.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, '');
        return '.region-banner.region-' + slug + '{background:linear-gradient(135deg,' + c.bg + ' 0%,' + c.dark + ' 100%)}';
    }).join('');
    var st = document.createElement('style');
    st.id = 'esh-region-colors';
    st.textContent = css;
    document.head.appendChild(st);
})();
// ─────────────────────────────────────────────────────────────────────────────


// ═══════════════════════════════════════════════════════════════════════════════
// ROW SAVE MANAGER — Row-level dirty tracking + per-row Save button
// Replaces the "save everything on every keystroke" pattern with a simpler,
// Procore-style "edit row → row turns dirty → click Save → only that row saves"
// Also manages onSnapshot real-time sync for collaborative updates.
// ═══════════════════════════════════════════════════════════════════════════════
window.RowSaveManager = (function() {

    const ADMIN_UID  = 'fUnXsvKnRYMpuySRbeVYJk7TO452';
    const _dirty     = new Map(); // projectName → Set of changed field keys
    const _saving    = new Set(); // projectName → currently saving
    const _snapUnsub = new Map(); // year → unsubscribe fn for onSnapshot listener


    const _autoSaveTimers = new Map();

    function markDirty(projectName, fieldKey) {
        if (!_dirty.has(projectName)) _dirty.set(projectName, new Set());
        _dirty.get(projectName).add(fieldKey || '_any');
        _refreshBtn(projectName);
        if (typeof window.markPendingSync === 'function') window.markPendingSync();
        if (window._appInitializing) return;
        if (_autoSaveTimers.has(projectName)) clearTimeout(_autoSaveTimers.get(projectName));
        _autoSaveTimers.set(projectName, setTimeout(() => {
            _autoSaveTimers.delete(projectName);
            saveRow(projectName).catch(() => {});
        }, 800));
    }

    // ── Save a single row to Firestore ───────────────────────────────────────
    async function saveRow(projectName) {
        if (_saving.has(projectName)) return;

        const db   = window.firebaseDb;
        const auth = window.firebaseAuth;
        if (!db || !auth?.currentUser) {
            _setBtnState(projectName, 'error', 'Not logged in');
            return;
        }

        // Only block truly view-only roles (manager, doc_controller) that should
        // never write anything. All other roles — attempt the save and let
        // Firestore Security Rules enforce what they can/cannot write.
        const email    = auth.currentUser.email;
        const userInfo = window.UserAccounts?.getUserInfo(email);
        if (userInfo?.role === 'manager' || userInfo?.role === 'doc_controller') {
            _setBtnState(projectName, 'clean', 'View only');
            return;
        }

        const project = typeof state !== 'undefined'
            ? state.projects.find(p => p.name === projectName)
            : null;
        if (!project) {
            return;
        }

        _saving.add(projectName);
        _setBtnState(projectName, 'saving', 'Saving…');

        try {
            const year = state?.selectedYear || new Date().getFullYear();
            window._isSavingEcho = true;
            const result = await window.ProjectsDB?.saveProject(year, project);
            if (result) {
                _dirty.delete(projectName);
                _setBtnState(projectName, 'saved', '✓ Saved');
                setTimeout(() => _setBtnState(projectName, 'clean', '✓ Saved'), 2000);
                if (typeof window.markSyncComplete === 'function') window.markSyncComplete();
            } else {
                _setBtnState(projectName, 'error', 'Failed — retry');
            }
        } catch(e) {
            console.error('RowSaveManager.saveRow error:', e);
            _setBtnState(projectName, 'error', 'Error');
        } finally {
            _saving.delete(projectName);
            setTimeout(() => { window._isSavingEcho = false; }, 1500);
        }
    }

    // ── Render a Save button for a project row ────────────────────────────────
    // Call this inside your row HTML: RowSaveManager.renderBtn(p.name)
    function renderBtn(projectName) {
        const isDirty  = _dirty.has(projectName);
        const isSaving = _saving.has(projectName);
        const state_   = isSaving ? 'saving' : isDirty ? 'dirty' : 'clean';
        const label    = isSaving ? 'Saving…' : isDirty ? 'Save Row' : '✓ Saved';
        const pSafe    = (projectName || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<button class="rsm-save-btn rsm-${state_}"
                    onclick="window.RowSaveManager.saveRow('${pSafe}')"
                    title="${isDirty ? 'Click to save this row to cloud' : 'No unsaved changes'}"
                >${label}</button>`;
    }

    // ── Internal: refresh a row's save button in the DOM ─────────────────────
    function _refreshBtn(projectName) {
        const btn = document.querySelector(`[data-rsm-project="${CSS.escape(projectName)}"]`);
        if (!btn) return;
        const isDirty = _dirty.has(projectName);
        btn.className  = `rsm-save-btn rsm-${isDirty ? 'dirty' : 'clean'}`;
        btn.textContent = isDirty ? 'Save Row' : '✓ Saved';
        btn.style.pointerEvents = isDirty ? '' : 'none';
        // Mark the table row too
        const tr = btn.closest('tr');
        if (tr) tr.classList.toggle('rsm-row-dirty', isDirty);
    }

    function _setBtnState(projectName, state_, label) {
        const btn = document.querySelector(`[data-rsm-project="${CSS.escape(projectName)}"]`);
        if (!btn) return;
        btn.className   = `rsm-save-btn rsm-${state_}`;
        btn.textContent = label;
        btn.style.pointerEvents = (state_ === 'saving' || state_ === 'clean') ? 'none' : '';
    }

    // ── "Save All Dirty Rows" — convenience for a global Save button ──────────
    async function saveAllDirty() {
        const dirtyNames = Array.from(_dirty.keys());
        if (!dirtyNames.length) { return; }
        await Promise.all(dirtyNames.map(name => saveRow(name)));
    }

    // ── onSnapshot real-time listener ─────────────────────────────────────────
    // Listens to the shared projects subcollection and updates state.projects
    // when another user saves, without overwriting any locally-dirty rows.
    // One repaint for a burst of snapshot changes, and never while the user is typing in a field.
    let _rtTimer = null, _rtTries = 0;
    function _scheduleRealtimeRender() {
        clearTimeout(_rtTimer);
        const run = function() {
            const ae = document.activeElement;
            const typing = ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.closest && ae.closest('#main-content');
            if (typing && _rtTries < 30) { _rtTries++; _rtTimer = setTimeout(run, 500); return; }
            _rtTries = 0;
            if (typeof render !== 'function' || state?.isEditing) return;
            const mc = document.getElementById('main-content');
            const scroll = mc ? mc.scrollTop : 0;
            if (state?.currentTab === 'lta-registry' && typeof renderLtaRegistryTab === 'function') renderLtaRegistryTab();
            else render();
            if (mc && scroll > 0) requestAnimationFrame(() => { mc.scrollTop = scroll; });
        };
        _rtTimer = setTimeout(run, 250);
    }

    function attachRealtimeSync(year) {
        const db = window.firebaseDb;
        if (!db || !window.firebase?.onSnapshot) return;

        // Detach old listener for this year first
        if (_snapUnsub.has(year)) {
            try { _snapUnsub.get(year)(); } catch(e) {}
            _snapUnsub.delete(year);
        }

        const colRef = window.firebase.collection(
            db, 'users', ADMIN_UID, 'years', String(year), 'projects'
        );

        const unsub = window.firebase.onSnapshot(colRef, (snapshot) => {
            if (window._isSavingEcho || window._appInitializing) return; // skip echoes

            let updated = 0;
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added' || change.type === 'modified') {
                    if (change.doc.metadata && change.doc.metadata.hasPendingWrites) return; // our own write, already in state
                    const incoming = change.doc.data();
                    if (!incoming?.name) return;

                    // Don't overwrite rows that are currently dirty locally
                    if (_dirty.has(incoming.name)) {
                        return;
                    }

                    // Merge into state.projects — incoming (remote) is the new source of truth,
                    // but preserve any local fields that aren't in the incoming payload
                    // (field-level saves mean incoming may only have a subset of fields).
                    if (typeof state !== 'undefined' && state.projects) {
                        const idx = state.projects.findIndex(p => p.name === incoming.name);
                        if (idx >= 0) {
                            // Prefer remote data but keep local fields that remote doesn't have.
                            // Merge IN PLACE (same object) — replacing the object left state.filteredProjects
                            // pointing at the old copy, so new LTA entries did not show until a page refresh.
                            Object.assign(state.projects[idx], incoming);
                        } else {
                            state.projects.push(incoming);
                        }
                        updated++;
                    }
                }
            });

            if (updated > 0) _scheduleRealtimeRender();
        }, (err) => {
        });

        _snapUnsub.set(year, unsub);
    }

    function detachRealtimeSync(year) {
        if (_snapUnsub.has(year)) {
            try { _snapUnsub.get(year)(); } catch(e) {}
            _snapUnsub.delete(year);
        }
    }

    function detachAll() {
        _snapUnsub.forEach((fn) => { try { fn(); } catch(e) {} });
        _snapUnsub.clear();
    }

    function hasDirty() {
        return _dirty.size > 0;
    }

    return {
        markDirty,
        saveRow,
        saveAllDirty,
        renderBtn,
        attachRealtimeSync,
        detachRealtimeSync,
        detachAll,
        hasDirty
    };

})();



window.openHealthReportModal = function() {
  window.eshOpenModal({
    id: 'health-report-pending-modal',
    icon: 'fa-file-medical',
    title: 'Health Reportorial',
    sub: 'ESH Health Report Module',
    width: 460,
    body: '<div style="padding:18px 20px;font-size:0.8rem;line-height:1.6;color:var(--text-main,#1f2d23);">'
        + 'This module is empty for now. Waiting for the revised Health Reportorial format from the Corporate Nurse.'
        + '</div>'
  });
};
window.closeHealthReportModal = function() {
  window.eshCloseModal('health-report-pending-modal');
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('main-sidebar');
    const content = document.getElementById('main-content');
    if (!sidebar) return;

    const isCollapsed = sidebar.classList.contains('sidebar-collapsed');

    if (isCollapsed) {
        // Expand
        sidebar.classList.remove('sidebar-collapsed');
        if (content) content.style.marginLeft = '';
    } else {
        // Collapse
        sidebar.classList.add('sidebar-collapsed');
        if (content) content.style.marginLeft = '';
    }

    // Charts: re-measure after the sidebar transition so nothing stays clipped/stale
    [340].forEach(function(ms) { setTimeout(function() { window.dispatchEvent(new Event('resize')); }, ms); });

    // Update hamburger icon if present
    const btn = document.getElementById('hamburger-btn');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isCollapsed ? 'fas fa-bars' : 'fas fa-times';
        }
    }
};
