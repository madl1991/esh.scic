
// ══════════════════════════════════════════════════════════════════════
//  PERSONNEL CERTIFICATE SYSTEM
//  - Certs stored in Firestore: personnel_certificates/{_pid}
//  - PDF in Cloudinary:         personnel_certificates/{_pid} (raw upload, URL saved in Firestore)
//  - Position → Required cert mapping:
//    Safety Officer I-IV  → COSH
//    PCO                  → PCO Accreditation
//    First Aider          → BLS Certificate
//    Project Nurse        → OHNAP
//    Project Physician    → OH Physician Certificate
//    ESH Superintendent / ESH Head → DOLE OSH Practitioner Certificate
//    Corporate positions  → Exempt (no cert required)
// ══════════════════════════════════════════════════════════════════════
(function() {


  // State
  window._pcCertData = {};
  // _pcCurrentIdx and _pcCurrentPid are managed on window by pcViewPersonnel (in main script)
  let _pcCurrentCertKey = null;
  let _pcCurrentFile = null;
  // _pcUnsub removed — no longer using onSnapshot; using direct getDocs instead

  // Convenience getters for use inside this IIFE
  function getCurIdx() { return window._pcCurrentIdx != null ? window._pcCurrentIdx : null; }
  function getCurPid() { return window._pcCurrentPid || null; }

  // ── Helpers ────────────────────────────────────────────────────────
  function _days(dateStr) {
    if (!dateStr) return null;
    const now = new Date(); now.setHours(0,0,0,0);
    const exp = new Date(dateStr); exp.setHours(0,0,0,0);
    return Math.round((exp - now) / 86400000);
  }

  function _status(dateStr) {
    if (!dateStr) return 'none';
    const d = _days(dateStr);
    if (d < 0)  return 'expired';
    if (d <= 60) return 'expiring';
    return 'valid';
  }

  function _pid(person) {
    if (person._pid) return String(person._pid);
    if (person.id)   return String(person.id);
    // Fallback to index in personnelData
    const arr = window.state && window.state.personnelData;
    if (arr) {
      const i = arr.indexOf(person);
      if (i >= 0) return String(i);
    }
    return String(getCurIdx() !== null ? getCurIdx() : 'unknown');
  }

  // ── Upload modal ───────────────────────────────────────────────────

  window.pcCloseUpload = function() {
    eshModalHide(document.getElementById('pc-upload-modal'));
    _pcCurrentFile = null;
    // Revoke preview object URL to free memory
    const iframe = document.getElementById('pc-pdf-iframe');
    if (iframe && iframe.src && iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
      iframe.src = '';
    }
    document.getElementById('pc-pdf-preview-wrap').style.display = 'none';
    document.getElementById('pc-ocr-status').style.display = 'none';
    document.getElementById('pc-ocr-badge').style.display = 'none';
  };

  window.pcFileChosen = function(input) {
    const file = input.files[0];
    if (!file) return;
    const errEl = document.getElementById('pc-upload-error');
    errEl.style.display = 'none';
    if (file.type !== 'application/pdf') {
      errEl.textContent = 'PDF files only.';
      errEl.style.display = 'block';
      input.value = '';
      return;
    }
    _pcCurrentFile = file;
    document.getElementById('pc-upload-fname-text').textContent = `${file.name} (${(file.size/1024).toFixed(0)} KB)`;
    document.getElementById('pc-upload-fname').style.display = 'block';
    const drop = document.getElementById('pc-upload-drop');
    drop.style.borderColor = '#2e7d32'; drop.style.background = '#f1f8e9';

    // ── PDF Preview ──────────────────────────────────────────────────────
    const prevUrl = URL.createObjectURL(file);
    const iframe = document.getElementById('pc-pdf-iframe');
    iframe.src = prevUrl;
    document.getElementById('pc-pdf-preview-wrap').style.display = 'block';

    // ── OCR: auto-extract expiry date via Claude API ─────────────────────
    pcExtractExpiry(file);
  };

  // ── OCR function — reads PDF and extracts expiry date ──────────────────
  window.pcExtractExpiry = async function(file) {
    const statusEl = document.getElementById('pc-ocr-status');
    const badgeEl  = document.getElementById('pc-ocr-badge');
    const expiryEl = document.getElementById('pc-upload-expiry');

    // Show scanning indicator
    statusEl.style.display = 'flex';
    statusEl.style.background = '#e3f2fd';
    statusEl.style.border = '1px solid #90caf9';
    statusEl.style.color = '#1565c0';
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning PDF for expiry date...';
    badgeEl.style.display = 'none';

    try {
      // Convert PDF to base64
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = () => rej(new Error('Read failed'));
        r.readAsDataURL(file);
      });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 }
              },
              {
                type: 'text',
                text: `Look at this certificate/document PDF and find the expiry, expiration, or validity date.
Return ONLY a JSON object like: {"found": true, "date": "YYYY-MM-DD"} 
If no expiry date found: {"found": false}
Do not include any other text, explanation, or markdown. JSON only.`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = (data.content || []).map(b => b.text || '').join('').trim();
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      if (result.found && result.date) {
        expiryEl.value = result.date;
        statusEl.style.background = '#e8f5e9';
        statusEl.style.border = '1px solid #a5d6a7';
        statusEl.style.color = '#2e7d32';
        statusEl.innerHTML = `<i class="fas fa-check-circle"></i> Expiry date detected: <strong style="margin-left:4px;">${result.date}</strong> — please verify before saving.`;
        badgeEl.style.display = 'inline';
      } else {
        statusEl.style.background = '#fff8e1';
        statusEl.style.border = '1px solid #ffe082';
        statusEl.style.color = '#f57f17';
        statusEl.innerHTML = '<i class="fas fa-triangle-exclamation"></i> No expiry date found in PDF — please enter it manually.';
      }

    } catch(err) {
      statusEl.style.background = '#fafafa';
      statusEl.style.border = '1px solid #eee';
      statusEl.style.color = '#999';
      statusEl.innerHTML = '<i class="fas fa-circle-info"></i> OCR unavailable — please enter expiry date manually.';
    }
  };

  window.pcSaveCert = async function() {
    // RBAC guard — only admin and superintendent (own region) can save certs
    const _role = window.state && window.state.userRole;
    const _isAdmin = window.state && window.state.isAdmin;
    const _userRegion = window.state && window.state.userRegion;
    const _pRegMap = window._pRegionMap || {};
    const _p = getCurIdx() !== null ? (window.state && window.state.personnelData||[])[getCurIdx()] : null;
    const _personRegion = _p ? (_pRegMap[_p.current] || '') : '';
    const _canSave = _isAdmin || (_role === 'superintendent' && _userRegion && _personRegion === _userRegion);
    if (!_canSave) {
      const errEl = document.getElementById('pc-upload-error');
      errEl.textContent = 'Access Denied — You do not have permission to upload certificates for this personnel.';
      errEl.style.display = 'block';
      return;
    }
    const expiry = document.getElementById('pc-upload-expiry').value;
    const errEl  = document.getElementById('pc-upload-error');
    errEl.style.display = 'none';

    if (!expiry) { errEl.textContent = 'Please enter the expiry date.'; errEl.style.display = 'block'; return; }
    if (!getCurPid() || !_pcCurrentCertKey) { errEl.textContent = 'No person selected.'; errEl.style.display = 'block'; return; }

    const db = window.firebaseDb;
    if (!db) { errEl.textContent = 'Firebase not ready. Please wait.'; errEl.style.display = 'block'; return; }

    const { doc, setDoc, getDoc, updateDoc } = window.firebase;

    const saveBtn = document.getElementById('pc-upload-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
      let pdfUrl = null, fileName = null;

      if (_pcCurrentFile) {
        document.getElementById('pc-upload-progress').style.display = 'block';
        const bar = document.getElementById('pc-upload-bar');
        bar.style.width = '25%';
        const folder = `personnel_certificates/${getCurPid()}`;
        bar.style.width = '55%';
        const { url } = await uploadPdfToCloudinary(_pcCurrentFile, folder);
        bar.style.width = '85%';
        pdfUrl = url;
        fileName = _pcCurrentFile.name;
        bar.style.width = '100%';
      }

      const docRef = doc(db, 'personnel_certificates', getCurPid());

      // ── Always fetch existing Firestore record first ───────────────────────
      // This is the source of truth — never trust local cache for PDF protection.
      const existing = await getDoc(docRef);
      const existingCert = existing.exists() ? (existing.data()[_pcCurrentCertKey] || null) : null;

      // ── PDF Protection: once a PDF exists in Firestore, it is LOCKED ───────
      // Nobody — not even admin — can overwrite an existing pdfUrl.
      // Only the expiry date can be updated on existing records.
      const entry = { expiry, updatedAt: new Date().toISOString() };
      // Old Firebase Storage links are dead (free usage expired) — allow replacing them with the Cloudinary upload
      const _oldIsFirebaseUrl = !!(existingCert && existingCert.pdfUrl && /firebasestorage\.googleapis\.com|firebasestorage\.app/i.test(existingCert.pdfUrl));
      if (existingCert && existingCert.pdfUrl && !(_oldIsFirebaseUrl && pdfUrl)) {
        // PDF already on file — preserve it unconditionally, ignore any new upload
        entry.pdfUrl    = existingCert.pdfUrl;
        entry.fileName  = existingCert.fileName;
        entry.uploadedBy = existingCert.uploadedBy || null;
        // Note: new file (_pcCurrentFile) is intentionally discarded here
      } else if (pdfUrl) {
        // No existing PDF — allow the new upload, stamp who uploaded it
        entry.pdfUrl    = pdfUrl;
        entry.fileName  = fileName;
        entry.uploadedBy = window.state?.currentUser?.email || null;
      }

      if (existing.exists()) { await updateDoc(docRef, { [_pcCurrentCertKey]: entry }); }
      else                   { await setDoc(docRef,   { [_pcCurrentCertKey]: entry }); }

      pcCloseUpload();

      // Update local cache right away and re-render the main table (no page refresh needed)
      try {
        if (!window._pcCertData) window._pcCertData = {};
        const _pidNow = getCurPid();
        window._pcCertData[_pidNow] = Object.assign({}, window._pcCertData[_pidNow] || {}, { [_pcCurrentCertKey]: entry });
        if (typeof renderPTable === 'function') renderPTable();
      } catch (e) {  }

      // ── POST-SAVE REFRESH (mirrors uploadPDF pattern) ─────────────────────
      // Force a fresh Firestore read of the entire personnel_certificates
      // collection (same as how saveToFirebase + render() refreshes project PDFs),
      // then re-render the view modal if it's still open.
      if (typeof window._pcLoadCerts === 'function') window._pcLoadCerts();
      // Also do an immediate direct getDoc for this specific person so the modal
      // updates instantly without waiting for the full getDocs to complete.
      if (window.firebaseDb && window.firebase && window.firebase.getDoc) {
        const _savePid   = getCurPid();
        const _saveIdx   = getCurIdx();
        window.firebase.getDoc(
          window.firebase.doc(window.firebaseDb, 'personnel_certificates', _savePid)
        ).then(snap => {
          if (!window._pcCertData) window._pcCertData = {};
          window._pcCertData[_savePid] = snap.exists() ? snap.data() : {};
          if (typeof renderPTable === 'function') renderPTable();
          if (_saveIdx !== null &&
              document.getElementById('pc-view-modal').classList.contains('show') &&
              window._pcCurrentIdx === _saveIdx) {
            pcViewPersonnel(_saveIdx);
          }
        }).catch(e => console.warn('post-save cert refresh failed:', e.message));
      }
      // ──────────────────────────────────────────────────────────────────────

    } catch(err) {
      console.error('pcSaveCert error:', err);
      errEl.textContent = 'Error: ' + err.message;
      errEl.style.display = 'block';
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
      document.getElementById('pc-upload-progress').style.display = 'none';
    }
  };

  // ── DIRECT FIRESTORE READ — same pattern as CSHP / DOLE / DOE-PERMIT ──────
  // The old onSnapshot listener approach caused certs to disappear after
  // logout/re-login because Firebase kills the listener when auth token is
  // revoked. This replacement does a one-shot getDocs (like loadAllProjectsAndFilter)
  // on demand — no persistent listener to maintain or restart.
  //
  // Called: (a) on init to warm up the cache, (b) by pcSaveCert after every save,
  //         (c) by pcViewPersonnel via its own per-person getDoc (see above).
  // ────────────────────────────────────────────────────────────────────────────

  function _loadCerts() {
    const db = window.firebaseDb;
    const { getDocs, collection } = window.firebase || {};
    if (!db || !getDocs || !collection) { setTimeout(_loadCerts, 800); return; }

    getDocs(collection(db, 'personnel_certificates'))
      .then(snap => {
        window._pcCertData = {};
        snap.forEach(d => { window._pcCertData[d.id] = d.data(); });
        // Refresh view modal if it happens to be open
        if (document.getElementById('pc-view-modal').classList.contains('show') && getCurIdx() !== null) {
          pcViewPersonnel(getCurIdx());
        }
      })
      .catch(err => console.warn('pcLoadCerts getDocs error:', err));
  }

  // Expose for login/logout hooks (same pattern as saveToFirebase exposure)
  window._pcLoadCerts = _loadCerts;

  function _waitFirebase() {
    if (window.firebaseDb && window.firebase && window.firebase.getDocs) _loadCerts();
    else setTimeout(_waitFirebase, 800);
  }
  _waitFirebase();

  // Backdrop clicks
  // pc-view-modal backdrop click disabled — use × button to close
  // pc-upload-modal backdrop click disabled — use × button to close

})();

// ── OVERALL SUMMARY SEARCH DROPDOWN ──────────────────────────────────────────

function osShowSearchDropdown(val, inputEl) {
    const dropdown = document.getElementById('os-search-dropdown');
    if (!dropdown) return;

    const query = (val || '').trim().toLowerCase();
    if (!query || !state.projects || state.projects.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    // Role-based filter: superintendents only see their own region
    const _userRegion = state.userRegion || '';
    let projects = [...state.projects];
    if (!state.isAdmin && _userRegion) {
        projects = projects.filter(p => p.region === _userRegion);
    }

    const matches = projects.filter(p =>
        (p.name || '').toLowerCase().includes(query)
    );

    if (matches.length === 0) {
        dropdown.innerHTML = '<div style="padding:10px 14px; color:#6b7280; font-size:0.78rem;">No projects found.</div>';
    } else {
        // Best matches first: starts with query, then word starts with query, then anywhere
        const _rank = p => {
            const n = (p.name || '').toLowerCase();
            if (n.startsWith(query)) return 0;
            if (n.includes(' ' + query)) return 1;
            return 2;
        };
        matches.sort((a, b) => _rank(a) - _rank(b));

        const _esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const items = matches.slice(0, 10).map(p => {
            const nm = p.name || '';
            const at = nm.toLowerCase().indexOf(query);
            const nameHtml = at < 0 ? _esc(nm)
                : _esc(nm.slice(0, at)) + '<b>' + _esc(nm.slice(at, at + query.length)) + '</b>' + _esc(nm.slice(at + query.length));
            const metaHtml = (p.region ? _esc(p.region) + ' \u00b7 ' : '') + statusBadge(p.status);
            return `<div class="os-sr-row" data-name="${_esc(encodeURIComponent(nm))}" onclick="osPickSearch(decodeURIComponent(this.dataset.name))">
                <div class="os-sr-name">${nameHtml}</div>
                <div class="os-sr-meta">${metaHtml}</div>
            </div>`;
        });
        dropdown.innerHTML = items.join('');
        window._osSrActive = -1;
    }

    // Position the dropdown using fixed coords from the input element
    const src = inputEl || document.getElementById('search-input');
    if (src) {
        const rect = src.getBoundingClientRect();
        dropdown.style.top    = (rect.bottom + 4) + 'px';
        dropdown.style.left   = rect.left + 'px';
        dropdown.style.width  = rect.width + 'px';
    }
    dropdown.style.display = 'block';
}

function osPickSearch(name) {
    osOpenModal(name);
    const dd = document.getElementById('os-search-dropdown');
    if (dd) dd.style.display = 'none';
    const inp = document.getElementById('search-input');
    if (inp) inp.value = '';
    handleSearch();
}

// Keyboard: Arrow Up/Down to move, Enter to open, Esc to close
document.addEventListener('keydown', function(e) {
    if (!e.target || e.target.id !== 'search-input') return;
    const dd = document.getElementById('os-search-dropdown');
    if (!dd || dd.style.display === 'none') return;
    const rows = dd.querySelectorAll('.os-sr-row');
    if (e.key === 'Escape') { dd.style.display = 'none'; return; }
    if (!rows.length) return;
    let i = typeof window._osSrActive === 'number' ? window._osSrActive : -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        i = e.key === 'ArrowDown' ? Math.min(i + 1, rows.length - 1) : Math.max(i - 1, 0);
        rows.forEach(function(r, k) { r.classList.toggle('os-active', k === i); });
        rows[i].scrollIntoView({ block: 'nearest' });
        window._osSrActive = i;
    } else if (e.key === 'Enter') {
        e.preventDefault();
        rows[i >= 0 ? i : 0].click();
    }
});

// Close dropdown on outside click
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('os-search-dropdown');
    const input    = document.getElementById('search-input');
    if (dropdown && !dropdown.contains(e.target) && (!input || !input.contains(e.target))) {
        dropdown.style.display = 'none';
    }
});

// Reposition dropdown on scroll/resize so it tracks the input
window.addEventListener('scroll', function() {
    const dropdown = document.getElementById('os-search-dropdown');
    if (!dropdown || dropdown.style.display === 'none') return;
    const input = document.getElementById('search-input');
    if (input) {
        const rect = input.getBoundingClientRect();
        dropdown.style.top  = (rect.bottom + 4) + 'px';
        dropdown.style.left = rect.left + 'px';
        dropdown.style.width = rect.width + 'px';
    }
}, true);

// ── OVERALL SUMMARY PROJECT DETAILS MODAL ────────────────────────────────────

// Compliance-gap view: reuses the standard project modal (#os-project-modal) — same header, same tile design.
function _osRenderGapView(project, year) {
    const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const b = typeof window.getComplianceBreakdown === 'function' ? window.getComplianceBreakdown(project) : null;
    const perc = typeof getPerc === 'function' ? getPerc(project, true) : null;
    if (b && !b.stopped && perc !== null && b.now !== perc) console.warn('[compliance gap] breakdown score', b.now, 'differs from getPerc', perc, project.name);
    document.getElementById('os-modal-year-label').textContent = `Compliance Gap — what is still missing (${year})`;
    document.getElementById('os-modal-personnel').style.display = 'none';
    const box = document.getElementById('os-modal-stats');

    const attr = t => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;');
    const tile = (icon, val, label, color, tip) => `
        <div${tip ? ` title="${attr(tip)}" data-tip-nowrap` : ''} style="${tip ? 'cursor:help; ' : ''}background:#f7f9f8; border:1px solid #eceeec; border-radius:8px; padding:10px 12px; display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; border-radius:8px; background:#eef1ef; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fas ${icon}" style="color:#4a5750; font-size:0.85rem;"></i>
            </div>
            <div>
                <div style="font-size:1rem; font-weight:800; color:${color}; line-height:1;">${val}</div>
                <div style="font-size:0.6rem; color:#888; font-weight:600; margin-top:2px;">${label}</div>
            </div>
        </div>`;
    const panel = (dot, title, inner) => `
        <div style="grid-column:1/-1; background:#f7f9f8; border:1px solid #eceeec; border-radius:8px; padding:8px 12px;">
            <div style="font-size:0.58rem; font-weight:700; color:#6b7770; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                <span style="width:7px; height:7px; border-radius:50%; background:${dot}; display:inline-block;"></span>${title}
            </div>${inner}
        </div>`;
    const line = (a, t) => `<div style="font-size:0.72rem; padding:2px 0; line-height:1.35;"><b style="color:#1f2d23;">${esc(a)}</b>${t ? ` <span style="color:#55635a;">— ${esc(t)}</span>` : ''}</div>`;

    if (!b || b.stopped) {
        box.innerHTML = `<div style="grid-column:1/-1; text-align:center; font-size:0.78rem; color:#55635a; padding:14px 0;">This project is on work stoppage, so it is not scored right now.</div>`;
        return;
    }
    const SEQ = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Q1','Q2','Q3','Q4','H1','H2'];
    const sortW = arr => arr.slice().sort((x, y) => SEQ.indexOf(x) - SEQ.indexOf(y));
    const fmt = arr => {            // Oct, Nov, Dec -> Oct–Dec (runs of 3+ months)
        const u = sortW([...new Set(arr)]); const out = []; let i = 0;
        while (i < u.length) {
            let j = i; const si = SEQ.indexOf(u[i]);
            while (j + 1 < u.length && si < 12 && SEQ.indexOf(u[j + 1]) === SEQ.indexOf(u[j]) + 1 && SEQ.indexOf(u[j + 1]) < 12) j++;
            out.push(j - i >= 2 ? u[i] + '–' + u[j] : u.slice(i, j + 1).join(', '));
            i = j + 1;
        }
        return out.join(', ');
    };
    const group = list => { const m = new Map(); list.forEach(x => { if (!m.has(x.what)) m.set(x.what, []); m.get(x.what).push(x.when); }); return [...m.entries()]; };
    const BARE = ['SMR','CMR','EMR','KPM report','DOE report'];
    const lineText = list => {
        const g = group(list);
        if (g.length === 1) return BARE.includes(g[0][0]) ? fmt(g[0][1]) : `${g[0][0]}: ${fmt(g[0][1])}`;
        if (g.length === 2) return g.map(([w, ws]) => `${w}: ${fmt(ws)}`).join(' · ');
        return `${list.length} items — ${fmt(list.map(x => x.when))}`;
    };

    const nOd = b.overdueCount, nUp = b.upcomingCount;
    let sum;
    if (nOd === 0 && nUp === 0) sum = 'All required reports are complete.';
    else if (nOd === 0) sum = `No overdue reports. The score reaches 100% once the remaining ${nUp} report${nUp === 1 ? ' is' : 's are'} submitted.`;
    else sum = `${nOd} report${nOd === 1 ? ' is' : 's are'} overdue` + (nUp ? ` and ${nUp} ${nUp === 1 ? 'is' : 'are'} not yet due.` : '.');

    let html = `<div style="grid-column:1/-1; text-align:center; font-size:0.78rem; font-weight:700; color:#1f2d23; margin-bottom:2px;">${esc(sum)}</div>`;
    html += tile('fa-circle-exclamation', nOd, 'Overdue Reports', nOd > 0 ? '#c62828' : '#2e7d32');
    html += tile('fa-hourglass-half', nUp, 'Not Yet Due', '#1f2d23');
    const _calc = b.areas.flatMap(a => a.parts
        ? [`${a.name}: average of ${a.parts.length} parts = ${a.clear}%`,
           ...a.parts.map(q => `   • ${q.name}: ${q.of ? q.got + ' of ' + q.of + ' = ' + Math.round(q.got / q.of * 100) + '%' : 'none required = 100%'}`)]
        : [`${a.name}: ${a.got} of ${a.of} = ${a.clear}%`]);
    const _tipClear = ['How this % is computed',
        'Overdue reports count as submitted.',
        'Reports not yet due count as not done.',
        'Each area = (submitted + overdue) ÷ required.',
        ..._calc,
        `Average of ${b.areas.length} area${b.areas.length === 1 ? '' : 's'} = ${b.ifCleared}%`].join('\n');
    const _tipFull = 'The score reaches 100% when every required report of the year is submitted.';
    html += tile('fa-arrow-trend-up', nOd > 0 ? b.ifCleared + '%' : '—', 'If Overdue Are Submitted', '#1b5e20', nOd > 0 ? _tipClear : '');
    html += tile('fa-flag-checkered', '100%', 'When Whole Year Is Complete', '#1b5e20', _tipFull);

    const od = b.areas.filter(a => a.od.length);
    if (od.length) html += panel('#c62828', 'Overdue — needs follow-up', od.map(a => line(a.name, lineText(a.od))).join(''));
    const up = b.areas.filter(a => a.up.length);
    if (up.length) html += panel('#f9a825', 'Not yet due — just wait',
        `<div style="display:grid; grid-template-columns:1fr 1fr; column-gap:16px;">${up.map(a => line(a.name, fmt(a.up.map(x => x.when)))).join('')}</div>`);
    if (b.notes.length) html += panel('#9e9e9e', 'Not counted', b.notes.map(n => line(n, '')).join(''));
    box.innerHTML = html;
}

function osOpenModal(projectName, view) {
    const project = (state.projects || []).find(p => p.name === projectName);
    if (!project) return;

    const year = state.selectedYear || new Date().getFullYear();
    const vals = project.vals || {};

    // Stat helper: sum months 1–12
    function sumYear(key) {
        let total = 0;
        for (let i = 1; i <= 12; i++) total += parseFloat(vals[key]?.[i]) || 0;
        return total;
    }

    // Total Man-Hours: same formula as RUNNING YTD in Total Exposures tab
    // = vals['exposures_Total Exposed Man-hour to date'][0]  (carry-over prev years)
    //   + sum of vals['exposures_Total Exposed Manhour'][1..12]  (current year months)
    const _prevBase  = parseFloat(vals['exposures_Total Exposed Man-hour to date']?.[0]) || 0;
    let manhoursAll  = _prevBase;
    for (let _i = 1; _i <= 12; _i++) {
        manhoursAll += parseFloat(vals['exposures_Total Exposed Manhour']?.[_i]) || 0;
    }
    const manhoursYTD = sumYear('exposures_Total Exposed Manhour'); // current year only (for bar chart)

    const fatality   = sumYear('medical_Fatality');
    const lta        = sumYear('medical_LTA');
    const medTreat   = sumYear('medical_Medical Treatment');
    const firstAid   = sumYear('medical_First Aid');
    const highPot    = sumYear('medical_High-Potential incident');
    const daysLost   = sumYear('medical_Days Lost/Charged');

    // Rates use cumulative manhours (same basis as DOLE reporting)
    const fr = manhoursAll > 0 ? ((lta / manhoursAll) * 1000000).toFixed(2) : '—';
    const sr = manhoursAll > 0 ? ((daysLost / manhoursAll) * 1000000).toFixed(2) : '—';

    // Project start year for label
    const startYear = project.dateStarted ? project.dateStarted.split('-')[0] : null;
    const mhLabel   = startYear && parseInt(startYear) < year
        ? `Since ${startYear}`
        : `${year} Total`;

    document.getElementById('os-modal-title').textContent = window._dispProjName(project.name);
    document.getElementById('os-modal-region').textContent = project.region || '';
    const addrDiv = document.getElementById('os-modal-address');
    const addrText = document.getElementById('os-modal-address-text');
    if (project.address) {
        addrText.textContent = project.address;
        addrDiv.style.display = '';
    } else {
        addrDiv.style.display = 'none';
    }
    document.getElementById('os-modal-status').innerHTML = statusBadge(project.status);
    // Corporate & Plant Operations: no On-Going / Compliant badges (they don't apply)
    const _isCorpModal = project.region === 'CORPORATE' || project.region === 'PLANT OPERATIONS';
    document.getElementById('os-modal-status').style.display = _isCorpModal ? 'none' : '';
    document.getElementById('os-modal-year-label').textContent = `Full Year Summary — ${year}`;

    // Compliance %
    const complianceBadge = document.getElementById('os-modal-compliance');
    const perc = typeof getPerc === 'function' ? getPerc(project, true) : null; // include finished projects' historical score, not a dash
    if (perc !== null && !_isCorpModal) {
        const percColor = perc >= 90 ? '#e3efe5' : perc >= 75 ? '#fdf1e1' : '#fdecea';
        complianceBadge.textContent = `✔ ${perc}% Compliant`;
        complianceBadge.style.background = percColor;
        complianceBadge.style.color = perc >= 90 ? '#1b5e20' : perc >= 75 ? '#7a4a05' : '#b3261e';
        complianceBadge.style.display = '';
    } else {
        complianceBadge.style.display = 'none';
    }

    // Personnel section
    const POS_RANK = [
        'ESH Superintendent','ESH Head',
        'Safety Officer IV','Safety Officer III','Safety Officer II','Safety Officer I',
        'PCO','Project Physician','Project Nurse','First Aider','Others'
    ];
    const projectPersonnel = (state.personnelData || []).filter(p =>
        p.current && p.current.trim().toLowerCase() === project.name.trim().toLowerCase()
    );
    const personnelSection = document.getElementById('os-modal-personnel');
    const headCard = document.getElementById('os-modal-head-card');
    const headName = document.getElementById('os-modal-head-name');
    const headPos  = document.getElementById('os-modal-head-pos');
    const countCard = document.getElementById('os-modal-esh-count-card');
    const countEl  = document.getElementById('os-modal-esh-count');

    if (projectPersonnel.length > 0) {
        personnelSection.style.display = '';
        // OIC takes priority; fallback to position rank
        let topPerson = projectPersonnel.find(p => p.oic) || null;
        if (!topPerson) {
            let topRank = 9999;
            projectPersonnel.forEach(p => {
                const rank = POS_RANK.indexOf(p.pos);
                const r = rank === -1 ? 9998 : rank;
                if (r < topRank) { topRank = r; topPerson = p; }
            });
        }
        if (topPerson) {
            headCard.style.display = '';
            headPos.textContent = topPerson.oic ? `OIC — ${topPerson.pos || 'ESH Personnel'}` : (topPerson.pos || 'ESH Personnel');
            headName.textContent = topPerson.name || '—';
        } else {
            headCard.style.display = 'none';
        }
        countCard.style.display = 'flex';
        countEl.textContent = projectPersonnel.length;
    } else {
        personnelSection.style.display = 'none';
    }

    // Total Manpower from Total Exposures (same value as OSH Personnel Requirement Monitoring)
    const totalManpower = (typeof getOshManpower === 'function') ? getOshManpower(project) : 0;

    const dangOcc  = sumYear('medical_Dangerous Occurrences');
    const nearMiss = sumYear('medical_No. of Identified Near-Miss');

    // Stat cards
    const stats = [
        { label: `Total Man-Hours (${mhLabel})`, value: manhoursAll.toLocaleString(),                               icon: 'fa-clock',             color: '#1b5e20' },
        { label: 'Total Manpower',               value: totalManpower > 0 ? totalManpower.toLocaleString() : '—',   icon: 'fa-hard-hat',          color: '#5d4037' },
        { label: 'LTA Cases',                    value: lta,      icon: 'fa-person-falling',      color: lta > 0 ? '#c62828' : '#2e7d32' },
        { label: 'Medical Treatment',            value: medTreat, icon: 'fa-kit-medical',          color: medTreat > 0 ? '#e65100' : '#2e7d32' },
        { label: 'First Aid',                    value: firstAid, icon: 'fa-band-aid',             color: '#0277bd' },
        { label: 'High-Potential Inc.',          value: highPot,  icon: 'fa-triangle-exclamation', color: highPot > 0 ? '#f9a825' : '#2e7d32' },
        { label: 'Dangerous Occurrence',         value: dangOcc,  icon: 'fa-bolt',                 color: dangOcc > 0 ? '#e65100' : '#2e7d32' },
        { label: 'Near Miss',                    value: nearMiss, icon: 'fa-eye',                  color: nearMiss > 0 ? '#6a1b9a' : '#2e7d32' },
        { label: 'Fatality',                     value: fatality, icon: 'fa-skull',                color: fatality > 0 ? '#b71c1c' : '#2e7d32' },
        { label: 'Days Lost/Charged',            value: daysLost, icon: 'fa-calendar-xmark',       color: daysLost > 0 ? '#6a1b9a' : '#2e7d32' },
        { label: 'Frequency Rate',               value: fr,       icon: 'fa-chart-line',           color: '#00695c' },
        { label: 'Severity Rate',                value: sr,       icon: 'fa-gauge',                color: '#37474f' },
    ];

    const _osWarnLabels = ['LTA Cases','Medical Treatment','High-Potential Inc.','Dangerous Occurrence','Near Miss','Fatality','Days Lost/Charged'];
    const _osStatColor = (st) => (_osWarnLabels.includes(st.label) && Number(st.value) > 0) ? '#c62828' : '#1f2d23';
    document.getElementById('os-modal-stats').innerHTML = stats.map(s => `
        <div style="background:#f7f9f8; border:1px solid #eceeec; border-radius:8px;
            padding:10px 12px; display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; border-radius:8px; background:#eef1ef;
                display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fas ${s.icon}" style="color:#4a5750; font-size:0.85rem;"></i>
            </div>
            <div>
                <div style="font-size:1rem; font-weight:800; color:${_osStatColor(s)}; line-height:1;">${s.value}</div>
                <div style="font-size:0.6rem; color:#888; font-weight:600; margin-top:2px;">${s.label}</div>
            </div>
        </div>
    `).join('');

    if (view === 'gap') _osRenderGapView(project, year);

    // Show modal
    const modal = document.getElementById('os-project-modal');
    eshModalShow(modal);
    setTimeout(() => modal.style.opacity = '1', 10);
    if (window.PresenceTracker) PresenceTracker.setProject(projectName, false);
}

function osCloseModal() {
    const modal = document.getElementById('os-project-modal');
    eshModalHide(modal);
    if (window.PresenceTracker) PresenceTracker.clearProject();
}

// os-project-modal backdrop click disabled — use × button to close

// ── Master Excel Export Dispatcher ────────────────────────────────────────────
// ── Shared Excel helpers (workbook factory + download) ───────────────────────
function eshNewWorkbook(creator) {
    const wb = new ExcelJS.Workbook();
    wb.creator = creator || 'ESH Monitoring System';
    wb.created = new Date();
    return wb;
}
async function eshDownloadXlsx(wb, filename) {
    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
}
