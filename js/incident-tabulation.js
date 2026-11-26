
function computeAggregateTabulation() {
    let totalManHours   = 0;
    let totalManHoursToDate = 0; // cumulative incl. previous year carry-over
    let ltaCases        = 0;
    let medTreatment    = 0;
    let firstAid        = 0;
    let fatality        = 0;
    let highPotential   = 0;
    let lostDays        = 0;   // from Incident & Accident Registry (Scheduled Charge Item / actual dates)

    const _selYear = state && state.selectedYear ? parseInt(state.selectedYear) : new Date().getFullYear();
    // YTD: Jan up to the last completed month (current year), or all 12 months for a past year.
    const _maxMonth = (new Date().getFullYear() === _selYear) ? Math.max(1, new Date().getMonth()) : 12; // current month is still ongoing, so YTD stops at the last completed month
    const _hasDaysChargedFn = typeof window.computeDaysCharged === 'function' && typeof window.ltaEntryPersons === 'function';

    // Same project list as the Total Projects card (no CORPORATE, no PLANT OPERATIONS).
    const _projs = getReportingProjects();
    const _activeCount = getReportingProjects(null, { activeOnly: true }).length;

    _projs.forEach(p => {
        let pMh = 0;
        for (let i = 1; i <= _maxMonth; i++) {
            const mh = parseFloat(p.vals['exposures_Total Exposed Manhour']?.[i]) || 0;
            totalManHours += mh;
            pMh           += mh;
            ltaCases      += parseFloat(p.vals['medical_LTA']?.[i])                          || 0;
            medTreatment  += parseFloat(p.vals['medical_Medical Treatment']?.[i])            || 0;
            firstAid      += parseFloat(p.vals['medical_First Aid']?.[i])                   || 0;
            fatality      += parseFloat(p.vals['medical_Fatality']?.[i])                    || 0;
            highPotential += parseFloat(p.vals['medical_High-Potential incident']?.[i])     || 0;
        }

        // No. of Lost Days — sourced directly from the Incident & Accident Registry
        // (lta-registry_entries), same as the Medical Tab auto-sync: Scheduled Charge
        // Item (Table 6, ANSI Z16.1) for permanent/amputation/vision/hearing/fatality,
        // or actual Date of Accident → RTW for temporary/confinement entries. N/A
        // entries and entries outside the selected year are excluded.
        if (_hasDaysChargedFn) {
            const entries = p.vals['lta-registry_entries'] || [];
            entries.forEach(e => {
                if (!e) return;
                const dateForYear = e.dateOfAccident || e.dateReported || ''; // fallback, same pattern used elsewhere in registry (e.g. sort/list rendering)
                if (!dateForYear) return;
                const accidentYear = new Date(dateForYear).getFullYear();
                if (accidentYear !== _selYear) return;
                window.ltaEntryPersons(e).forEach(pp => {
                    if (pp.injuryType === 'na') return; // same N/A skip as before, now per person
                    lostDays += window.computeDaysCharged(pp).daysCharged || 0;
                });
            });
        } else {
            // Fallback (should not normally trigger — window.computeDaysCharged is
            // registered by showUI() before this card renders)
            for (let i = 1; i <= _maxMonth; i++) {
                lostDays += parseFloat(p.vals['medical_Days Lost/Charged']?.[i]) || 0;
            }
        }

        const prevMh = parseFloat(p.vals['exposures_Total Exposed Man-hour to date']?.[0]) || 0;
        totalManHoursToDate += prevMh + pMh;
    });

    // High-Potential Incident is NOT recordable (no actual injury) — same rule as the Rates table.
    const recordableCases = ltaCases + medTreatment + fatality;

    let ltirOsha = 0, ltirOshs = 0, trirOsha = 0, trirOshs = 0, srOsha = 0, srOshs = 0;
    if (totalManHours > 0) {
        ltirOsha = (ltaCases        * 200000)   / totalManHours;
        ltirOshs = (ltaCases        * 1000000)  / totalManHours;
        trirOsha = (recordableCases * 200000)   / totalManHours;
        trirOshs = (recordableCases * 1000000)  / totalManHours;
        srOsha   = (lostDays        * 200000)   / totalManHours;
        srOshs   = (lostDays        * 1000000)  / totalManHours;
    }

    const _mo = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return {
        recordableCases: recordableCases,
        lostDays:        lostDays,
        totalHours:      Math.round(totalManHours),
        totalHoursToDate: Math.round(totalManHoursToDate),
        ltaCases:        ltaCases,
        fatalCases:      fatality,
        highPotential:   highPotential,
        projectCount:    _projs.length,
        activeCount:     _activeCount,
        throughMonth:    _maxMonth,
        throughLabel:    'JAN–' + _mo[_maxMonth - 1],
        ltirOsha:  window.formatRate('LTIR', ltirOsha, 'osha'), ltirOshs:  window.formatRate('LTIR', ltirOshs, 'oshs'),
        trirOsha:  window.formatRate('TRIR', trirOsha, 'osha'), trirOshs:  window.formatRate('TRIR', trirOshs, 'oshs'),
        srOsha:    window.formatRate('SEVERITY RATE', srOsha, 'osha'), srOshs: window.formatRate('SEVERITY RATE', srOshs, 'oshs')
    };
}

// Tooltip (native title): computation lang ng LTIR / TRIR / Severity Rate, gamit ang numbers ng Incident Tabulation card.
function rateTipHTML(kind, std, d) {
    const isOsha = std === 'osha';
    const base = isOsha ? 200000 : 1000000;
    const cfg = {
        ltir: { name: 'LTIR', n: d.ltaCases, nl: 'LTA cases', val: isOsha ? d.ltirOsha : d.ltirOshs },
        trir: { name: 'TRIR', n: d.recordableCases, nl: 'Recordable cases', val: isOsha ? d.trirOsha : d.trirOshs },
        sr:   { name: 'Severity Rate', n: d.lostDays, nl: 'Lost days', val: isOsha ? d.srOsha : d.srOshs }
    }[kind];
    const f = v => Number(v).toLocaleString('en-US');
    const mh = d.totalHours;
    const L = [
        cfg.name + ' · ' + (isOsha ? 'OSHA' : 'OSHS'),
        cfg.nl + ' × ' + f(base) + ' ÷ man-hours'
    ];
    if (mh > 0) {
        L.push(f(cfg.n) + ' × ' + f(base) + ' ÷ ' + f(mh));
        L.push('= ' + cfg.val);
    } else {
        L.push('No man-hours yet');
    }
    return L.map(x => String(x).replace(/&/g, '&amp;').replace(/"/g, '&quot;')).join('&#10;');
}

// INCIDENT TABULATION RATE: first-draw count-up of the numbers (KPI strip + rate table).
// Starts when the panel is on screen, plays once per page load, and does not replay on re-render.
// Skipped when the device uses reduced motion. Same 1.2 s curve as the Project Status donut.
function _cuIntroState() {
    return window._rateNumIntro || (window._rateNumIntro = { done: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches), gen: 0 });
}
function _cuAttr(v) { return ' data-cu="' + String(v) + '"'; }
function _cuTxt(v) {
    const s = String(v);
    if (_cuIntroState().done || !/^[\d,]+(\.\d+)?$/.test(s)) return s;
    const dec = (s.split('.')[1] || '').length;
    return '0' + (dec ? '.' + '0'.repeat(dec) : '');
}
function _rateNumsIntro(tries) {
    const S = _cuIntroState();
    if (S.done) return;
    const panel = document.getElementById('incident-tabulation-panel');
    if (!panel) { if ((tries || 0) < 5) setTimeout(() => _rateNumsIntro((tries || 0) + 1), 100); return; }
    const items = Array.from(panel.querySelectorAll('[data-cu]')).map(el => {
        const raw = el.getAttribute('data-cu'), t = raw.replace(/,/g, '');
        return { el: el, raw: raw, n: /^[\d,]+(\.\d+)?$/.test(raw) ? parseFloat(t) : NaN, dec: (t.split('.')[1] || '').length, comma: raw.indexOf(',') >= 0 };
    });
    if (!items.length) return;
    const gen = ++S.gen, dur = 1200;
    const out = (it, v) => it.comma
        ? v.toLocaleString('en-US', { minimumFractionDigits: it.dec, maximumFractionDigits: it.dec })
        : v.toFixed(it.dec);
    const finish = () => {
        if (S.gen !== gen || S.done || !panel.isConnected) return;
        S.done = true;
        items.forEach(it => { if (it.el.isConnected) it.el.textContent = it.raw; });
    };
    const run = () => {
        if (S.gen !== gen) return;
        let t0 = null;
        const step = ts => {
            if (S.gen !== gen || S.done || !panel.isConnected) return;
            if (t0 === null) t0 = ts;
            const p = Math.min((ts - t0) / dur, 1), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            items.forEach(it => { if (it.n > 0 && it.el.isConnected) it.el.textContent = out(it, it.n * e); });
            if (p < 1) requestAnimationFrame(step); else finish();
        };
        requestAnimationFrame(step);
        setTimeout(finish, dur + 800); // safety if the tab was in the background
    };
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(es => {
            if (S.gen !== gen) { io.disconnect(); return; }
            if (es.some(e => e.isIntersecting)) { io.disconnect(); run(); }
        }, { threshold: 0.4 });
        io.observe(panel);
    } else run();
}

function buildIncidentTabulationHTML() {
    const d = computeAggregateTabulation();
    // Flat status style (same look as Corporate KPM legend): colored number + small dot + text
    const _stNum = (v, ok, neutral, cu) => `<div${cu ? _cuAttr(v) : ''} style="font-size:1.3rem;font-weight:800;color:${neutral ? 'var(--text-primary)' : (ok ? '#2e7d32' : '#c62828')};">${cu ? _cuTxt(v) : v}</div>`;
    const _stNumC = (v, ok, neutral) => _stNum(v, ok, neutral, true); // number that counts up on first draw
    const _stDot = ok => `<div style="font-size:0.62rem;color:#4b554d;margin-top:3px;display:flex;align-items:center;justify-content:center;gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:${ok ? '#2e7d32' : '#c62828'};display:inline-block;"></span>${ok ? 'Within target' : 'Exceeded'}</div>`;
    const _html = `
    <div id="incident-tabulation-panel" style="padding: 0 16px;">
      <div style="background: var(--bg-card); border-radius: 0 0 12px 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border:none; border-top: none; margin-bottom: 10px;">

        
        <div class="sec-head">
          <div class="sec-head-title">INCIDENT TABULATION RATE</div>
          <div class="sec-head-badges"><span class="sec-pill sec-pill-yellow">AUTO-COMPUTED · ${d.projectCount} PROJECTS (${d.activeCount} ACTIVE) · ${d.throughLabel}</span></div>
        </div>

        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0; border-bottom: 1px solid var(--border-color);">

          <div style="padding: 10px 14px; text-align: center; border-right: 1px solid var(--border-color);">
            <div style="font-size: 0.58rem; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 3px;">No. of LTA Cases</div>
            <div${_cuAttr(d.ltaCases)} style="font-size: 1.5rem; font-weight: 900; color: #1f3d2b; line-height: 1;">${_cuTxt(d.ltaCases)}</div>
            <div style="font-size: 0.57rem; color: var(--text-secondary); margin-top: 2px;">Lost Time Accidents YTD</div>
          </div>

          <div style="padding: 10px 14px; text-align: center; border-right: 1px solid var(--border-color);">
            <div style="font-size: 0.58rem; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 3px;">No. of Recordable Cases</div>
            <div${_cuAttr(d.recordableCases)} style="font-size: 1.5rem; font-weight: 900; color: #1f3d2b; line-height: 1;">${_cuTxt(d.recordableCases)}</div>
            <div style="font-size: 0.57rem; color: var(--text-secondary); margin-top: 2px;">LTA + Medical + Fatality</div>
          </div>

          <div style="padding: 10px 14px; text-align: center; border-right: 1px solid var(--border-color);">
            <div style="font-size: 0.58rem; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 3px;">No. of Lost Days</div>
            <div${_cuAttr(d.lostDays.toLocaleString())} style="font-size: 1.5rem; font-weight: 900; color: #1f3d2b; line-height: 1;">${_cuTxt(d.lostDays.toLocaleString())}</div>
            <div style="font-size: 0.57rem; color: var(--text-secondary); margin-top: 2px;">From Incident &amp; Accident Registry</div>
          </div>

          <div style="padding: 10px 14px; text-align: center; border-right: 1px solid var(--border-color);">
            <div style="font-size: 0.58rem; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 3px;">Total Man-hours Exposure</div>
            <div${_cuAttr(d.totalHours.toLocaleString())} style="font-size: 1.5rem; font-weight: 900; color: #1f3d2b; line-height: 1;">${_cuTxt(d.totalHours.toLocaleString())}</div>
            <div style="font-size: 0.57rem; color: var(--text-secondary); margin-top: 2px;">Total Exposed Manhour ${d.throughLabel}</div>
          </div>

          <div style="padding: 10px 14px; text-align: center;">
            <div style="font-size: 0.58rem; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 3px;">Total Man-Hours Exposed to Date</div>
            <div${_cuAttr(d.totalHoursToDate.toLocaleString())} style="font-size: 1.5rem; font-weight: 900; color: #1f3d2b; line-height: 1;">${_cuTxt(d.totalHoursToDate.toLocaleString())}</div>
            <div style="font-size: 0.57rem; color: var(--text-secondary); margin-top: 2px;">Cumulative incl. Previous Year</div>
          </div>

        </div>

        
        <div style="overflow-x: auto;">
          <table class="inj-rate-tbl" style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
            <thead>
              <tr>
                <th style="background:#b7ddb5;color:#1b5e20;padding:8px 12px;text-align:left;border:none;width:40%;font-weight:700;letter-spacing:0.4px;">INJURY / ILLNESS</th>
                <th style="background:#b7ddb5;color:#1b5e20;padding:8px 12px;text-align:center;border:none;width:22%;font-weight:700;letter-spacing:0.4px;">OSHA<br><span style="font-size:0.65rem;font-weight:500;">200,000 hrs base</span></th>
                <th style="background:#b7ddb5;color:#1b5e20;padding:8px 12px;text-align:center;border:none;width:22%;font-weight:700;letter-spacing:0.4px;">OSHS<br><span style="font-size:0.65rem;font-weight:500;">1,000,000 hrs base</span></th>
                <th style="background:#b7ddb5;color:#1b5e20;padding:8px 12px;text-align:center;border:none;border-left:2px solid #9ecf9b;width:16%;font-weight:700;letter-spacing:0.4px;">TARGET</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="background:var(--bg-card);color:var(--text-primary);padding:8px 12px;border:none;border-bottom:1px solid var(--border-color);">
                  <div style="font-weight:700;font-size:0.78rem;">Fatality</div>
                  <div style="font-size:0.61rem;color:var(--text-secondary);margin-top:2px;">Zero fatality target for all projects</div>
                </td>
                <td colspan="2" style="background:var(--bg-card);padding:8px;text-align:center;border:none;border-bottom:1px solid var(--border-color);">
                  ${_stNumC(d.fatalCases ?? 0, (d.fatalCases ?? 0) <= 0)}
                  ${_stDot((d.fatalCases ?? 0) <= 0)}
                </td>
                <td style="background:var(--bg-card);padding:8px;text-align:center;border:none;border-bottom:1px solid var(--border-color);border-left:2px solid #dfe7e0;">
                  ${_stNum(0, true, true)}
                </td>
              </tr>
              <tr>
                <td style="background:var(--bg-card);color:var(--text-primary);padding:8px 12px;border:none;border-bottom:1px solid var(--border-color);">
                  <div style="font-weight:700;font-size:0.78rem;">LTIR — Lost Time Incident Rate</div>
                  <div style="font-size:0.61rem;color:var(--text-secondary);margin-top:2px;">LTA cases × base ÷ man-hours</div>
                </td>
                <td style="background:var(--bg-card);padding:8px;text-align:center;border:none;border-bottom:1px solid var(--border-color);"><div title="${rateTipHTML('ltir','osha',d)}" data-tip-nowrap style="cursor:help;">${_stNumC(d.ltirOsha, parseFloat(d.ltirOsha) <= window.STATS_TARGETS.ltir)}${_stDot(parseFloat(d.ltirOsha) <= window.STATS_TARGETS.ltir)}</div></td>
                <td style="background:var(--bg-card);padding:8px;text-align:center;border:none;border-bottom:1px solid var(--border-color);"><div title="${rateTipHTML('ltir','oshs',d)}" data-tip-nowrap style="cursor:help;">${_stNumC(d.ltirOshs, parseFloat(d.ltirOshs) <= window.STATS_TARGETS.ltir)}${_stDot(parseFloat(d.ltirOshs) <= window.STATS_TARGETS.ltir)}</div></td>
                <td style="background:var(--bg-card);padding:8px;text-align:center;border:none;border-bottom:1px solid var(--border-color);border-left:2px solid #dfe7e0;">${_stNum(window.STATS_TARGETS.ltir.toFixed(2), true, true)}</td>
              </tr>
              <tr>
                <td style="background:var(--bg-card);color:var(--text-primary);padding:8px 12px;border:none;border-bottom:1px solid var(--border-color);">
                  <div style="font-weight:700;font-size:0.78rem;">TRIR — Total Recordable Incident Rate</div>
                  <div style="font-size:0.61rem;color:var(--text-secondary);margin-top:2px;">Recordable cases × base ÷ man-hours</div>
                </td>
                <td style="background:var(--bg-card);padding:8px;text-align:center;border:none;border-bottom:1px solid var(--border-color);"><div title="${rateTipHTML('trir','osha',d)}" data-tip-nowrap style="cursor:help;">${_stNumC(d.trirOsha, parseFloat(d.trirOsha) <= window.STATS_TARGETS.trir)}${_stDot(parseFloat(d.trirOsha) <= window.STATS_TARGETS.trir)}</div></td>
                <td style="background:var(--bg-card);padding:8px;text-align:center;border:none;border-bottom:1px solid var(--border-color);"><div title="${rateTipHTML('trir','oshs',d)}" data-tip-nowrap style="cursor:help;">${_stNumC(d.trirOshs, parseFloat(d.trirOshs) <= window.STATS_TARGETS.trir)}${_stDot(parseFloat(d.trirOshs) <= window.STATS_TARGETS.trir)}</div></td>
                <td style="background:var(--bg-card);padding:8px;text-align:center;border:none;border-bottom:1px solid var(--border-color);border-left:2px solid #dfe7e0;">${_stNum(window.STATS_TARGETS.trir.toFixed(2), true, true)}</td>
              </tr>
              <tr>
                <td style="background:var(--bg-card);color:var(--text-primary);padding:8px 12px;border:none;">
                  <div style="font-weight:700;font-size:0.78rem;">SR — Severity Rate</div>
                  <div style="font-size:0.61rem;color:var(--text-secondary);margin-top:2px;">Total days lost × base ÷ man-hours</div>
                </td>
                <td style="background:var(--bg-card);padding:8px;text-align:center;border:none;"><div title="${rateTipHTML('sr','osha',d)}" data-tip-nowrap style="cursor:help;">${_stNumC(d.srOsha, true, true)}</div></td>
                <td style="background:var(--bg-card);padding:8px;text-align:center;border:none;"><div title="${rateTipHTML('sr','oshs',d)}" data-tip-nowrap style="cursor:help;">${_stNumC(d.srOshs, true, true)}</div></td>
                <td style="background:var(--bg-card);padding:8px;text-align:center;border:none;border-left:2px solid #dfe7e0;"><div style="font-size:1.1rem;font-weight:700;color:#9e9e9e;">—</div></td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>`;
    setTimeout(_rateNumsIntro, 0);
    return _html;
}

// ════════════════════════════════════════════════════════════════════════
// SAFETY ALERT & SAFETY AWARD MODULE
// Company-wide by default (users/{ADMIN_UID}/safety_alerts|safety_awards),
// each entry can optionally be tagged to a specific project.
// Images hosted on Cloudinary (unsigned upload) — only the secure_url is
// stored in Firestore, never the raw image data.
// ════════════════════════════════════════════════════════════════════════
const SAFETY_ADMIN_UID          = 'fUnXsvKnRYMpuySRbeVYJk7TO452';
const SAFETY_CLOUDINARY_CLOUD   = 'xs57zpaa';
const SAFETY_CLOUDINARY_PRESET  = 'safety_dashboard';

window._safetyAlerts = [];
window._safetyAwards = [];
window._safetyListenersAttached = false;

// Only these two accounts may publish/edit/delete Safety Alerts & Awards.
// Everyone else can still VIEW them — this is a client-side UX gate; the real
// enforcement lives in Firestore rules (isSafetyPublisher()).
const SAFETY_PUBLISHER_EMAILS = ['esh@wda.com.ph', 'esh@scic.com.ph'];
function isSafetyPublisher() {
    const email = (window.firebaseAuth?.currentUser?.email || '').toLowerCase();
    return SAFETY_PUBLISHER_EMAILS.includes(email);
}
window.isSafetyPublisher = isSafetyPublisher;

function safetyAlertsColRef() {
    return window.firebase.collection(window.firebaseDb, 'users', SAFETY_ADMIN_UID, 'safety_alerts');
}
function safetyAwardsColRef() {
    return window.firebase.collection(window.firebaseDb, 'users', SAFETY_ADMIN_UID, 'safety_awards');
}

function initSafetyAlertAwardListeners(_try) {
    if (window._safetyListenersAttached) return;
    if (!window.firebaseDb || !window.firebase) {
        // Firebase not ready yet (first open) — retry for up to ~5s instead of giving up
        _try = (_try || 0) + 1;
        if (_try <= 10) setTimeout(function(){ initSafetyAlertAwardListeners(_try); }, 500);
        return;
    }
    window._safetyListenersAttached = true;
    try {
        window.firebase.onSnapshot(safetyAlertsColRef(), function(snap) {
            const arr = [];
            snap.forEach(function(d){ arr.push(Object.assign({ id: d.id }, d.data())); });
            arr.sort(function(a,b){ return (b.dateIssued||'').localeCompare(a.dateIssued||'') || String(b.alertNo||'').localeCompare(String(a.alertNo||''), undefined, { numeric: true }); }); // newest first; same date -> higher alert no. first
            window._safetyAlerts = arr;
            renderSafetyAlertAwardPanel();
            // Safety Alerts tab: re-render when the data arrives (first open had no data yet)
            var _saView = document.getElementById('safety-alerts-view');
            if (_saView && !_saView.classList.contains('hidden') && typeof renderSafetyAlertsPage === 'function') renderSafetyAlertsPage();
        });
        window.firebase.onSnapshot(safetyAwardsColRef(), function(snap) {
            const arr = [];
            snap.forEach(function(d){ arr.push(Object.assign({ id: d.id }, d.data())); });
            arr.sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
            window._safetyAwards = arr;
            renderSafetyAlertAwardPanel();
        });
    } catch(e) {  }
}
window.initSafetyAlertAwardListeners = initSafetyAlertAwardListeners;

async function saveSafetyAlert(alert) {
    const id  = alert.id || ('alert_' + Date.now());
    const ref = window.firebase.doc(safetyAlertsColRef(), id);
    await window.firebase.setDoc(ref, Object.assign({}, alert, { id: id, _savedAt: Date.now() }), { merge: true });
    return id;
}
window.saveSafetyAlert = saveSafetyAlert;

async function deleteSafetyAlert(id) {
    if (!canManageSafety()) { showToast('Switch to Edit Mode to delete a Safety Alert.', 'error'); return; }
    await window.firebase.deleteDoc(window.firebase.doc(safetyAlertsColRef(), id));
}
window.deleteSafetyAlert = deleteSafetyAlert;

async function saveSafetyAward(award) {
    const id  = award.id || ('award_' + Date.now());
    const ref = window.firebase.doc(safetyAwardsColRef(), id);
    await window.firebase.setDoc(ref, Object.assign({}, award, { id: id, _savedAt: Date.now() }), { merge: true });
    return id;
}
window.saveSafetyAward = saveSafetyAward;

async function deleteSafetyAward(id) {
    if (!canManageSafety()) { showToast('Switch to Edit Mode to delete a Safety Award.', 'error'); return; }
    await window.firebase.deleteDoc(window.firebase.doc(safetyAwardsColRef(), id));
}
window.deleteSafetyAward = deleteSafetyAward;

// ── Cloudinary unsigned upload — returns secure_url ───────────────────────
async function uploadImageToCloudinary(file, onProgress) {
    const url = `https://api.cloudinary.com/v1_1/${SAFETY_CLOUDINARY_CLOUD}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', SAFETY_CLOUDINARY_PRESET);
    formData.append('folder', 'safety-dashboard');
    return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.upload.onprogress = function(e) {
            if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = function() {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve(data.secure_url);
                else reject(new Error(data.error?.message || 'Cloudinary upload failed'));
            } catch(e) { reject(e); }
        };
        xhr.onerror = function() { reject(new Error('Network error during upload')); };
        xhr.send(formData);
    });
}
window.uploadImageToCloudinary = uploadImageToCloudinary;

function safetyProjectOptionsHTML(selected) {
    const names = (state.projects || []).map(function(p){ return p.name; }).filter(Boolean);
    let opts = `<option value="" ${!selected ? 'selected' : ''}>Company-wide</option>`;
    names.forEach(function(n){
        opts += `<option value="${n.replace(/"/g,'&quot;')}" ${selected === n ? 'selected' : ''}>${n}</option>`;
    });
    return opts;
}

// ── Image crop tool (Cropper.js, loaded on demand) ──────────────────────────
let _cropperLoadPromise = null;
function loadSafetyCropperLib() {
    if (window.Cropper) return Promise.resolve();
    if (_cropperLoadPromise) return _cropperLoadPromise;
    _cropperLoadPromise = new Promise(function(resolve, reject) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js';
        script.onload = function(){ resolve(); };
        script.onerror = function(){ reject(new Error('Could not load the image crop tool.')); };
        document.head.appendChild(script);
    });
    return _cropperLoadPromise;
}

// Opens a crop dialog for one image file. Resolves with a cropped Blob,
// rejects (silently, caller should catch) if the user cancels.
function safetyCropImage(file, aspectRatio) {
    return loadSafetyCropperLib().then(function() {
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;';
                overlay.innerHTML = `
                <div style="background:#fff;border-radius:12px;max-width:540px;width:100%;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                    <div style="padding:12px 18px;font-weight:800;font-size:0.85rem;color:#333;border-bottom:1px solid var(--border-color);">Adjust the photo — drag to reposition, corners to resize</div>
                    <div style="max-height:56vh;background:#111;">
                        <img id="safety-crop-img" src="${e.target.result}" style="max-width:100%;display:block;">
                    </div>
                    <div style="padding:12px 18px;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end;gap:10px;">
                        <button id="safety-crop-cancel" class="mdl-btn neutral">Skip this photo</button>
                        <button id="safety-crop-confirm" class="mdl-btn primary">Use this crop</button>
                    </div>
                </div>`;
                document.body.appendChild(overlay);
                const imgEl = overlay.querySelector('#safety-crop-img');
                const cropper = new Cropper(imgEl, {
                    aspectRatio: aspectRatio,
                    viewMode: 1,
                    autoCropArea: 1,
                    background: false,
                    responsive: true
                });
                overlay.querySelector('#safety-crop-cancel').onclick = function() {
                    cropper.destroy(); overlay.remove(); reject(new Error('cancelled'));
                };
                overlay.querySelector('#safety-crop-confirm').onclick = function() {
                    const canvas = cropper.getCroppedCanvas({ maxWidth: 1600, maxHeight: 1600 });
                    canvas.toBlob(function(blob) {
                        cropper.destroy(); overlay.remove();
                        resolve(blob);
                    }, 'image/jpeg', 0.9);
                };
            };
            reader.readAsDataURL(file);
        });
    });
}
window.safetyCropImage = safetyCropImage;

// Unified, order-preserving photo list. Only the Safety Award form uses this now —
// Safety Alerts switched to a simple PDF/Word file attachment instead of individual photos.
window._safetyPhotoItems = { award: [] };

async function safetyHandlePhotoSelect(inputEl, kind) {
    const files = Array.from(inputEl.files || []);
    inputEl.value = ''; // allow re-selecting the same file later
    const aspect   = 16/9; // award hero widescreen
    const statusId = 'sw-upload-status';
    for (let i = 0; i < files.length; i++) {
        const statusEl = document.getElementById(statusId);
        if (statusEl) statusEl.textContent = `Adjusting photo ${i + 1}/${files.length}...`;
        try {
            const blob = await safetyCropImage(files[i], aspect);
            window._safetyPhotoItems[kind].push({ id: 'new_' + Date.now() + '_' + i, kind: 'new', blob: blob });
            safetyRenderPhotoPreview(kind);
        } catch (e) { /* user skipped this photo */ }
    }
    const statusEl2 = document.getElementById(statusId);
    if (statusEl2) statusEl2.textContent = '';
}
window.safetyHandlePhotoSelect = safetyHandlePhotoSelect;

function safetyRenderPhotoPreview(kind) {
    const previewId = kind === 'award' ? 'sw-photo-preview' : `sa-${kind.replace('alert_','')}-preview`;
    const el = document.getElementById(previewId);
    if (!el) return;
    const items = window._safetyPhotoItems[kind] || [];
    if (items.length === 0) { el.innerHTML = ''; return; }
    const label = document.createElement('div'); // not used, just placeholder to keep structure simple
    el.innerHTML = `<div style="font-size:0.62rem;color:var(--text-secondary);margin-bottom:4px;">Click the star to set the front (cover) photo — it's the one shown first.</div>` +
        items.map(function(item, i) {
            const url = item.kind === 'existing' ? item.url : URL.createObjectURL(item.blob);
            const isFront = i === 0;
            return `<span style="position:relative;display:inline-block;margin:2px 8px 8px 0;">
                <img src="${url}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:2px solid ${isFront ? '#2e7d32' : 'var(--border-color)'};">
                ${isFront ? `<span style="position:absolute;bottom:-6px;left:0;right:0;text-align:center;background:#2e7d32;color:#fff;font-size:8px;font-weight:700;border-radius:4px;padding:1px 0;">FRONT</span>` : ''}
                <span onclick="safetySetFrontPhoto('${kind}','${item.id}')" title="Set as front photo" style="position:absolute;top:-6px;left:-6px;width:18px;height:18px;border-radius:50%;background:${isFront ? '#2e7d32' : '#fff'};border:1px solid ${isFront ? '#2e7d32' : 'var(--border-color)'};color:${isFront ? '#fff' : '#f9a825'};font-size:11px;line-height:16px;text-align:center;cursor:pointer;">&#9733;</span>
                <span onclick="safetyRemovePhotoItem('${kind}','${item.id}')" title="Remove" style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;background:#c62828;color:#fff;font-size:10px;line-height:16px;text-align:center;cursor:pointer;">&times;</span>
            </span>`;
        }).join('');
}
window.safetyRenderPhotoPreview = safetyRenderPhotoPreview;

function safetySetFrontPhoto(kind, itemId) {
    const items = window._safetyPhotoItems[kind];
    const idx = items.findIndex(function(it){ return it.id === itemId; });
    if (idx <= 0) return; // already front, or not found
    const [chosen] = items.splice(idx, 1);
    items.unshift(chosen);
    safetyRenderPhotoPreview(kind);
}
window.safetySetFrontPhoto = safetySetFrontPhoto;

function safetyRemovePhotoItem(kind, itemId) {
    window._safetyPhotoItems[kind] = window._safetyPhotoItems[kind].filter(function(it){ return it.id !== itemId; });
    safetyRenderPhotoPreview(kind);
}
window.safetyRemovePhotoItem = safetyRemovePhotoItem;

// Close helper (exit animation is handled globally by the ESH Popup Animator at the top of this file)
function safetyCloseOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}
window.safetyCloseOverlay = safetyCloseOverlay;

// ── Full-screen photo viewer (lightbox) ─────────────────────────────────────
function safetyOpenLightbox(url) {
    if (!url) return;
    const overlay = document.createElement('div');
    overlay.id = 'safety-lightbox-overlay';
    overlay.onclick = function(){ safetyCloseOverlay('safety-lightbox-overlay'); };
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:10002;display:flex;align-items:center;justify-content:center;padding:24px;cursor:zoom-out;';
    overlay.innerHTML = `
        <span onclick="safetyCloseOverlay('safety-lightbox-overlay')" style="position:absolute;top:18px;right:24px;color:#fff;font-size:2rem;cursor:pointer;line-height:1;">&times;</span>
        <img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:6px;box-shadow:0 10px 50px rgba(0,0,0,0.5);">`;
    document.body.appendChild(overlay);
}
window.safetyOpenLightbox = safetyOpenLightbox;


// ── View full detail (opened by clicking a photo) ───────────────────────────
window.DOE_LOGO = 'images/doe-logo.png';
window.EMB_LOGO = 'images/emb-logo.png';
window.DOLE_LOGO = 'images/dole-logo.png';

// Logos with transparent areas (the white leaf and wave gaps of EMB, the white centre of DOLE) lose those areas on the dark theme.
// Once at startup, each logo gets a white fill behind it that follows its own outline (convex hull of its opaque pixels),
// so it looks the same on light and dark. The logo variables are replaced and any logo already on screen is swapped.
(function () {
    function hull(pts) {
        pts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
        function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
        var lo = [], up = [], i;
        for (i = 0; i < pts.length; i++) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], pts[i]) <= 0) lo.pop(); lo.push(pts[i]); }
        for (i = pts.length - 1; i >= 0; i--) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], pts[i]) <= 0) up.pop(); up.push(pts[i]); }
        lo.pop(); up.pop();
        return lo.concat(up);
    }
    function fill(name) {
        var src = window[name];
        if (typeof src !== 'string' || !src) return;
        var im = new Image();
        im.onload = function () {
            try {
                var w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas');
                c.width = w; c.height = h;
                var x = c.getContext('2d');
                x.drawImage(im, 0, 0);
                var d = x.getImageData(0, 0, w, h).data, pts = [], i, j;
                for (j = 0; j < h; j++) for (i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] > 20) pts.push([i + 0.5, j + 0.5]);
                if (pts.length < 3) return;
                var hl = hull(pts);
                x.clearRect(0, 0, w, h);
                x.beginPath();
                hl.forEach(function (p, k) { if (k) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); });
                x.closePath();
                x.fillStyle = '#fff'; x.fill();
                x.lineWidth = 1; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.stroke();
                x.drawImage(im, 0, 0);
                var out = c.toDataURL('image/png');
                window[name] = out;
                document.querySelectorAll('img').forEach(function (e) { if (e.getAttribute('src') === src) e.setAttribute('src', out); });
            } catch (e) { /* keep the original logo */ }
        };
        im.src = src;
    }
    ['EMB_LOGO', 'DOLE_LOGO', 'DOE_LOGO'].forEach(fill);
})();
function _mdlHtml(o) {
    // Shared modal frame. Content (o.body) is passed as-is.
    // o: { id, icon, title, sub, chips[], width, closeJs, body, foot }
    var w = (typeof o.width === 'number' || o.width == null) ? ((o.width || 520) + 'px') : o.width;
    var closeJs = o.closeJs || ("eshCloseModal('" + (o.id || '') + "')");
    var chips = (o.chips && o.chips.length)
        ? '<div class="mdl-chips">' + o.chips.map(function(c){ return '<span class="mdl-chip">' + c + '</span>'; }).join('') + '</div>' : '';
    var sub = o.sub ? '<div class="mdl-sub">' + o.sub + '</div>' : '';
    var hasExtra = !!(sub || chips);
    var titleBlock = hasExtra
        ? '<div class="mdl-titles"><span class="mdl-title">' + o.title + '</span>' + sub + chips + '</div>'
        : '<span class="mdl-title">' + o.title + '</span>';
    var foot = (o.foot == null ? '' : String(o.foot)).trim();
    return '<div class="mdl" style="max-width:' + w + ';">'
        + '<div class="mdl-head' + (hasExtra ? ' top' : '') + '">' + (o.iconImg ? '<img src="' + o.iconImg + '" alt="" style="width:30px;height:auto;max-height:30px;object-fit:contain;flex-shrink:0;margin-right:10px;">' : (o.noIcon ? '' : '<i class="fas ' + (o.icon || 'fa-circle-info') + ' mdl-ic"></i>')) + titleBlock
        + '<button class="mdl-x" onclick="' + closeJs + '" title="Close" aria-label="Close">&times;</button></div>'
        + '<div class="mdl-body' + (o.bodyFlex ? ' flex' : '') + '">' + o.body + '</div>'
        + (foot ? '<div class="mdl-foot">' + foot + '</div>' : '<div class="mdl-gap"></div>')
        + '</div>';
}
window._mdlHtml = _mdlHtml;

// One place that builds the overlay + frame for every modal.
// eshMountModal(el, o, z): fills an overlay element (already created, may carry data-* attributes) and adds it to the page.
// eshOpenModal(o): creates the element (replacing an old one with the same id) and mounts it.
// o: _mdlHtml options + { z, onClose }
// Shared table colors for reportorial modals (EMB, DOLE). Edit here to change all of them.
window._dpRowFill = function(el) {
    var tr = el.closest('tr'); if (!tr) return;
    var t = tr.querySelector('input[type="text"]'), d = tr.querySelector('input[type="date"]');
    tr.classList.toggle('dp-gap', !!(t && d && (!t.value.trim() || !d.value)));
};
window.ESH_RPT_MODAL_TBL = { grp: '#9ecf9b', proj: '#b7ddb5', txt: '#000', bd: '#c8e6c9', rowBg: 'var(--bg-card)' };
window.eshMountModal = function(el, o, z) {
    el.className = 'mdl-overlay';
    if (z || o.z) el.style.zIndex = z || o.z;
    el._mdlOnClose = o.onClose || null;
    el.innerHTML = _mdlHtml(o);
    document.body.appendChild(el);
    if (el.querySelector('.mdl-scroll-hint')) {
        var _sync = function() { window.eshSyncScrollHints(el); };
        requestAnimationFrame(_sync);
        setTimeout(_sync, 250);
        var _onResize = function() { if (!el.isConnected) { window.removeEventListener('resize', _onResize); return; } _sync(); };
        window.addEventListener('resize', _onResize);
    }
    return el;
};

// ── Shared pieces for modal sub-titles and info bars (Compliance, KPM, ...) ──
// Look is in styles.css (.mdl-info, .mdl-pill). Change it there and every modal that uses these follows.
window.eshEscHtml = function(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};
// Sub-title: "<pin> LOCATION · 7 active projects · extra · extra"
// o: { loc, count, noun, extra: [html, ...] }  (loc is escaped here; extra items are trusted html)
window.eshModalSub = function(o) {
    var n = o.count, noun = o.noun || 'active project';
    return window.eshEscHtml(o.loc)
        + (n == null ? '' : ' · <span style="color:#4a5750;">' + n + ' ' + noun + (n !== 1 ? 's' : '') + '</span>')
        + (o.extra || []).filter(Boolean).map(function(x) { return ' · ' + x; }).join('');
};
// Score (0..1 or null) -> pill tone. Same cut-offs as the table's average colors.
window.eshToneOf = function(v) {
    if (v === null || v === undefined || isNaN(v)) return 't-none';
    return v >= 1 ? 't-ok' : v >= 0.75 ? 't-good' : v >= 0.5 ? 't-warn' : 't-bad';
};
// Value pill. o: { id, text, tone }
window.eshPill = function(o) {
    return '<span' + (o.id ? ' id="' + o.id + '"' : '') + ' class="mdl-pill ' + (o.tone || 't-none') + '">' + o.text + '</span>';
};
window.eshSetPill = function(id, text, tone) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'mdl-pill ' + (tone || 't-none');
};
// "<icon> Label: [value]" field for the info bar. o: { icon, label, html }
window.eshInfoField = function(o) {
    return '<span class="mdl-info-field">' + (o.icon ? '<i class="fas ' + o.icon + '"></i>' : '')
        + '<span class="mdl-info-key">' + o.label + '</span>' + o.html + '</span>';
};
// Info bar under the modal title. o: { icon, label, items: [html, ...], hint }
// hint = text for the "scroll" note (shown only when the table really overflows), or falsy for none.
window.eshInfoBar = function(o) {
    return '<div class="mdl-info">'
        + (o.label ? '<span class="mdl-info-lbl">' + (o.icon ? '<i class="fas ' + o.icon + '"></i>' : '') + o.label + '</span>' : '')
        + (o.items || []).filter(Boolean).join('')
        + (o.hint ? '<span class="mdl-scroll-hint">' + o.hint + '</span>' : '')
        + '</div>';
};
// Show the scroll hint only if something in the modal body scrolls sideways.
window.eshSyncScrollHints = function(root) {
    var hints = root.querySelectorAll('.mdl-scroll-hint');
    var body = root.querySelector('.mdl-body');
    if (!hints.length || !body) return;
    var over = [body].concat(Array.prototype.slice.call(body.children)).some(function(el) {
        return el.scrollWidth > el.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowX);
    });
    hints.forEach(function(h) { h.hidden = !over; });
};
window.eshOpenModal = function(o) {
    var old = document.getElementById(o.id);
    if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = o.id;
    return window.eshMountModal(ov, o);
};
window.eshCloseModal = function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (id === 'lta-entry-modal' && el.dataset.dirty === '1') {
        if (typeof showModernDialog !== 'function') { if (!window.confirm('You have unsaved changes. Close without saving?')) return; }
        else {
            var _p = showModernDialog('Discard changes?', 'You have unsaved changes. Close without saving?', true, 'Discard', 'Keep editing');
            var _ovs = document.querySelectorAll('.ux-dialog-overlay');
            if (_ovs.length) _ovs[_ovs.length - 1].style.zIndex = '100001';   // above the modal
            _p.then(function (ok) { if (ok) { el.dataset.dirty = '0'; window.eshCloseModal(id); } });
            return;
        }
    }
    if (el._mdlOnClose) { try { el._mdlOnClose(); } catch (e) {  } }
    el.remove();
    if (id === 'lta-entry-modal' && window.PresenceTracker) PresenceTracker.clearProject();
};

// ── Shared NOV section (used by OSH NOV and ENVI NOV modals) ─────────────────
// One row per NOV; click a row to open its violations. Handlers are passed in by each modal.
window._novRowOpen = window._novRowOpen || {};
window.novToggleRow = function(ev, key) {
    if (ev.target.closest('input,select,button,a,label')) return;
    var tr = ev.currentTarget, det = tr.nextElementSibling, open = !tr.classList.contains('open');
    tr.classList.toggle('open', open);
    if (det) det.classList.toggle('nvt-hide', !open);
    window._novRowOpen[key] = open;
};
window.novExpandAll = function(modalId, btn) {
    var root = document.getElementById(modalId);
    if (!root) return;
    var open = btn.getAttribute('data-all') !== '1';
    root.querySelectorAll('tr.nvt-row').forEach(function(tr) {
        var det = tr.nextElementSibling;
        tr.classList.toggle('open', open);
        if (det) det.classList.toggle('nvt-hide', !open);
        window._novRowOpen[tr.getAttribute('data-key')] = open;
    });
    btn.setAttribute('data-all', open ? '1' : '0');
    btn.textContent = open ? 'Collapse all' : 'Expand all';
};
window.novSectionHtml = function(c) {
    var ed = !!c.editing, dis = ed ? '' : 'disabled', type = c.type, novs = c.novs || [];
    var ea = function(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
    var fd = function(d) { if (!d) return '—'; var a = String(d).split('-'); return a.length === 3 ? a[1] + '/' + a[2] + '/' + a[0] : ea(d); };
    var title = /^[A-Z ]+NOV$/.test(c.label) ? c.label.replace(/^([A-Z])([A-Z]*) NOV$/, function(_, a, b) { return a + b.toLowerCase() + ' NOV'; }) : c.label;
    var kp = String(c.p && c.p.name || '').replace(/[^A-Za-z0-9]/g, '_');
    var agg = { o: 0, c: 0 };
    novs.forEach(function(n) { (n.violations || []).forEach(function(v) { if ((v.status || 'Open') === 'Closed') agg.c++; else agg.o++; }); });
    var chips = '<span class="nvs-chip cnt ' + type + '">' + novs.length + ' NOV</span>'
        + (agg.o ? '<span class="nvs-chip open">' + agg.o + ' open violation' + (agg.o === 1 ? '' : 's') + '</span>' : '')
        + (agg.c ? '<span class="nvs-chip closed">' + agg.c + ' closed</span>' : '');
    var cols = ed ? 9 : 8, rows = '';
    if (!novs.length) {
        rows = '<tr><td colspan="' + cols + '" class="nvt-empty"><i class="fas fa-inbox" style="margin-right:6px;"></i>No ' + title + (/NOV$/.test(title) ? '' : ' NOV') + ' recorded.' + (ed ? ' Use the Add button below to add one.' : '') + '</td></tr>';
    }
    novs.forEach(function(nov, i) {
        var vs = nov.violations || [];
        var openN = vs.filter(function(v) { return (v.status || 'Open') !== 'Closed'; }).length;
        var st = (!vs.length || openN === vs.length) ? ['open', 'Open'] : (openN === 0 ? ['closed', 'Closed'] : ['part', 'Partly closed']);
        var key = c.secId + '|' + kp + '|' + i;
        var stored = window._novRowOpen[key];
        var isOpen = stored === undefined ? (ed || novs.length === 1) : stored;
        var ibOpts = (c.bodies || []).map(function(o) { return '<option value="' + ea(o) + '"' + (nov.issuingBody === o ? ' selected' : '') + '>' + ea(o) + '</option>'; }).join('');
        var cDate1 = ed ? '<input type="date" value="' + ea(nov.dateIssued) + '" oninput="' + c.h.field(i, 'dateIssued') + '">' : fd(nov.dateIssued);
        var cDate2 = ed ? '<input type="date" value="' + ea(nov.dateReceived) + '" oninput="' + c.h.field(i, 'dateReceived') + '">' : fd(nov.dateReceived);
        var cBody = ed ? '<select onchange="' + c.h.field(i, 'issuingBody') + '"><option value="">— Select —</option>' + ibOpts + '</select>' : (ea(nov.issuingBody) || '—');
        var cRef = ed ? '<input type="text" value="' + ea(nov.refNo) + '" oninput="' + c.h.field(i, 'refNo') + '">' : (ea(nov.refNo) || '—');
        var vrows = vs.map(function(v, j) {
            var vst = (v.status || 'Open');
            var law = ed ? '<select onchange="' + c.h.viol(i, j, 'violationLaw') + '">' + c.lawOpts(v.violationLaw) + '</select>' : (ea(v.violationLaw) || '—');
            var stc = ed ? '<select onchange="' + c.h.viol(i, j, 'status') + '">' + ['Open', 'Closed'].map(function(o) { return '<option value="' + o + '"' + (vst === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>'
                         : '<span class="status-' + (vst === 'Closed' ? 'closed' : 'open') + '">' + vst + '</span>';
            return '<tr><td>' + law + '</td><td>' + stc + '</td>'
                + (ed ? '<td style="text-align:center;"><button type="button" class="nvt-btn del" title="Remove violation" onclick="' + c.h.delViol(i, j) + '"><i class="fas fa-times"></i></button></td>' : '') + '</tr>';
        }).join('');
        rows += '<tr class="nvt-row' + (isOpen ? ' open' : '') + '" data-key="' + key + '" onclick="novToggleRow(event,\'' + key + '\')">'
            + '<td>' + (i + 1) + '</td><td>' + cDate1 + '</td><td>' + cDate2 + '</td><td>' + cBody + '</td><td>' + cRef + '</td>'
            + '<td>' + (vs.length ? vs.length + ' violation' + (vs.length === 1 ? '' : 's') + ', ' + openN + ' open' : '<span class="nvt-none">None yet</span>') + '</td>'
            + '<td><span class="nvs-chip ' + st[0] + '">' + st[1] + '</span></td>'
            + (ed ? '<td><button type="button" class="nvt-btn del" onclick="' + c.h.delNov(i) + '"><i class="fas fa-trash"></i> NOV</button></td>' : '')
            + '<td style="width:28px;"><i class="fas fa-chevron-down nvt-chev"></i></td></tr>'
            + '<tr class="nvt-det' + (isOpen ? '' : ' nvt-hide') + '"><td colspan="' + cols + '"><div class="nvt-in">'
            + (vs.length ? '<table class="nvt-v"><thead><tr><th>' + c.lawHead + '</th><th>Status</th>' + (ed ? '<th></th>' : '') + '</tr></thead><tbody>' + vrows + '</tbody></table>' : '<div class="nvt-none">No violations yet.</div>')
            + (ed ? '<div style="margin-top:8px;"><button type="button" class="nvt-btn" onclick="' + c.h.addViol(i) + '"><i class="fas fa-plus"></i> Violation</button></div>' : '')
            + '</div></td></tr>';
    });
    return '<div class="nvs">'
        + '<div class="nov-modal-sec-hdr ' + c.hdrClass + '" onclick="' + c.toggle + '(\'' + c.secId + '\')">'
        + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span class="nvs-title">' + title + '</span>' + chips + '</div>'
        + '<i id="' + c.secId + '-icon" class="fas fa-chevron-down" style="font-size:0.7rem;color:#888;transition:transform 0.3s;"></i></div>'
        + '<div id="' + c.secId + '-content" class="nov-modal-sec-content" style="max-height:9999px;"><div style="overflow-x:auto;">'
        + '<table class="nvt"><thead><tr><th>NOV #</th><th>Date issued</th><th>Date received</th><th>Issuing body</th><th>Reference no.</th><th>Violations</th><th>Status</th>' + (ed ? '<th></th>' : '') + '<th></th></tr></thead><tbody>' + rows + '</tbody></table>'
        + '</div></div></div>';
};
function safetyViewAwardDetail(id) {
    const aw = (window._safetyAwards || []).find(function(a){ return a.id === id; });
    if (!aw) return;
    const canManage = canManageSafety();
    const photos = Array.isArray(aw.photos) && aw.photos.length ? aw.photos : [null];
    const modal = document.createElement('div');
    modal.id = 'safety-detail-modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    const _awBody = `
        ${photos[0] ? `<img src="${photos[0]}" onclick="safetyOpenLightbox('${photos[0]}')" style="width:100%;max-height:320px;object-fit:cover;object-position:${aw.photoPosition||'center'};display:block;cursor:zoom-in;">` : ''}
        ${photos.length > 1 ? `<div style="display:flex;gap:6px;padding:10px 18px 0;flex-wrap:wrap;">${photos.map(function(u){return `<img src="${u}" onclick="safetyOpenLightbox('${u}')" style="width:52px;height:52px;object-fit:cover;border-radius:6px;cursor:zoom-in;">`;}).join('')}</div>` : ''}
        <div style="padding:16px 18px;">
            <div style="font-size:0.65rem;font-weight:800;color:#6b7770;letter-spacing:0.4px;">${(aw.awardTitle||'ESH AWARD AND RECOGNITION').toUpperCase()}</div>
            <div style="font-size:1.15rem;font-weight:800;color:#1b5e20;margin:2px 0;">${(aw.awardeeName||'').replace(/</g,'&lt;')}</div>
            <div style="font-size:0.72rem;color:#6b7770;">${aw.project ? aw.project.replace(/</g,'&lt;') : 'Company-wide'} · ${aw.date || ''}${aw.awardingBody ? ' · Awarded by ' + aw.awardingBody.replace(/</g,'&lt;') : ''}</div>
            ${aw.description ? `<div style="font-size:0.8rem;color:#333;margin-top:10px;white-space:pre-wrap;">${aw.description.replace(/</g,'&lt;')}</div>` : ''}
        </div>`;
    const _awFoot = canManage ? `
        <button class="mdl-btn danger" onclick="deleteSafetyAward('${aw.id}');safetyCloseOverlay('safety-detail-modal-overlay');">Delete</button>
        <button class="mdl-btn primary" onclick="safetyCloseOverlay('safety-detail-modal-overlay');safetyEditAwardForm('${aw.id}');">Edit</button>` : '';
    modal.innerHTML = _mdlHtml({ icon:'fa-award', title:'ESH award and recognition', width:560, closeJs:"safetyCloseOverlay('safety-detail-modal-overlay')", body:_awBody, foot:_awFoot });
    document.body.appendChild(modal);
}
window.safetyViewAwardDetail = safetyViewAwardDetail;

// ── Backward-compatible readers: old alerts saved photos as a flat array and
// description as a single string; new alerts use a simple PDF/Word file attachment instead.
function safetyAlertThumbUrl(a) {
    if (a.thumbnailUrl) return a.thumbnailUrl; // current shape: PDF page-1 thumbnail
    if (Array.isArray(a.photos)) return a.photos[0] || null; // legacy shape v1
    if (a.photos && typeof a.photos === 'object') { // legacy shape v2 (4M template)
        const slot = a.photos.reenactment || a.photos.photo2 || a.photos.photo3;
        if (slot && Array.isArray(slot.urls) && slot.urls[0]) return slot.urls[0];
    }
    return null;
}
window.safetyAlertThumbUrl = safetyAlertThumbUrl;

function safetyAlertSummaryText(a) {
    if (a.fileName) return a.fileType === 'pdf' ? 'PDF attachment' : 'Word document attachment';
    return a.briefDescription || a.description || '';
}
window.safetyAlertSummaryText = safetyAlertSummaryText;

// Opens an alert file for viewing, never as a download:
// PDF -> the browser's own PDF viewer; Word -> Microsoft Office online viewer.
function safetyAlertViewUrl(a) {
    if (!a || !a.fileUrl) return '';
    if (a.fileType === 'pdf') return a.fileUrl;
    return 'https://view.officeapps.live.com/op/view.aspx?src=' + encodeURIComponent(a.fileUrl);
}
function safetyOpenAlertFile(id) {
    const a = (window._safetyAlerts || []).find(function(x){ return x.id === id; });
    const url = safetyAlertViewUrl(a);
    if (url) window.open(url, '_blank', 'noopener');
}
window.safetyOpenAlertFile = safetyOpenAlertFile;

function safetyViewAlertDetail(id) {
    const a = (window._safetyAlerts || []).find(function(x){ return x.id === id; });
    if (!a) return;
    // Alert with an attached file: go straight to the file (Word online viewer / PDF), no pop-up.
    // Edit and Delete stay on the Safety Alerts tab (pen and trash buttons).
    if (a.fileUrl) { safetyOpenAlertFile(id); return; }
    const canManage = canManageSafety();
    const esc = function(s) { return (s || '').toString().replace(/</g, '&lt;'); };
    const isLegacyStructured = (Array.isArray(a.photos) || (a.photos && typeof a.photos === 'object')) && !a.fileUrl;

    let bodyHtml;
    if (isLegacyStructured) {
        // Older record saved before the file-upload redesign — show whatever it has.
        const photo = safetyAlertThumbUrl(a);
        const text = safetyAlertSummaryText(a);
        bodyHtml = `
        ${photo ? `<img src="${photo}" onclick="safetyOpenLightbox('${photo}')" style="width:100%;max-height:280px;object-fit:cover;display:block;cursor:zoom-in;">` : ''}
        <div style="padding:16px 18px;">
            <div style="font-size:1.05rem;font-weight:800;color:#1b5e20;">${esc(a.title||'Untitled Alert')}</div>
            <div style="font-size:0.72rem;color:#6b7770;margin-top:2px;">${a.project ? esc(a.project) : 'Company-wide'} · ${a.dateIssued || ''}</div>
            ${text ? `<div style="font-size:0.8rem;color:#333;margin-top:10px;white-space:pre-wrap;">${esc(text)}</div>` : ''}
        </div>`;
    } else {
        const fileIcon = a.fileType === 'pdf' ? 'fa-file-pdf' : 'fa-file-word';
        const fileColor = a.fileType === 'pdf' ? '#c62828' : '#1565c0';
        bodyHtml = `
        <div style="padding:16px 18px;">
            <div style="font-size:0.62rem;font-weight:800;color:#6b7770;">${esc(a.alertNo || '')}</div>
            <div style="font-size:1.05rem;font-weight:800;color:#1b5e20;margin-top:2px;">${esc(a.title||'Untitled Alert')}</div>
            <div style="font-size:0.72rem;color:#6b7770;margin-top:2px;">${a.project ? esc(a.project) : 'Company-wide'} · ${a.dateIssued || ''}</div>

            ${a.fileUrl ? `
            <div onclick="safetyOpenAlertFile('${a.id}')" style="margin-top:14px;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:8px;overflow:hidden;cursor:pointer;">
                ${a.thumbnailUrl
                    ? `<img src="${a.thumbnailUrl}" style="width:100%;max-height:320px;object-fit:contain;background:#f5f5f5;display:block;">`
                    : `<div style="padding:36px 0;background:#f5f5f5;display:flex;flex-direction:column;align-items:center;gap:8px;"><i class="fas ${fileIcon}" style="font-size:2.4rem;color:${fileColor};"></i></div>`}
                <div style="padding:8px 12px;background:var(--bg-card);border-top:1px solid var(--border-color);font-size:0.72rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                    <i class="fas ${fileIcon}" style="color:${fileColor};"></i>
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${esc(a.fileName || 'Attachment')}</span>
                </div>
            </div>
            ` : `<div style="margin-top:14px;font-size:0.76rem;color:var(--text-secondary);">No file attached.</div>`}
        </div>`;
    }

    const modal = document.createElement('div');
    modal.id = 'safety-detail-modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    const _alFoot = `
        ${canManage ? `
        <button class="mdl-btn danger" onclick="safetyCloseOverlay('safety-detail-modal-overlay');safetyDeleteAlertConfirm('${a.id}');">Delete</button>
        <button class="mdl-btn" onclick="safetyCloseOverlay('safety-detail-modal-overlay');safetyEditAlertForm('${a.id}');">Edit</button>` : ''}
        ${a.fileUrl ? `<button class="mdl-btn primary" onclick="safetyOpenAlertFile('${a.id}')"><i class="fas fa-up-right-from-square"></i> View file</button>` : ''}`;
    modal.innerHTML = _mdlHtml({ noIcon:true, title:'ESH ALERT', width:480, closeJs:"safetyCloseOverlay('safety-detail-modal-overlay')", body:bodyHtml, foot:_alFoot });
    document.body.appendChild(modal);
}
window.safetyViewAlertDetail = safetyViewAlertDetail;

// ── Main panel: renders active alerts + award spotlight into the placeholder ─
let _safetyCarouselTimer = null;
let _safetyCarouselIdx = 0;

// ── One-time CSS injection for the Yahoo-style 3-column layout ─────────────
function ensureSafetyAwardGridStyles() {
    // Home page styles now live in styles.css (section "Home page (Headlines tab)").
    // Remove the old injected block if an older version left one behind.
    var old = document.getElementById('saw-grid-styles');
    if (old) old.remove();
}

// Builds just the hero-carousel + mini-cards markup for the current _safetyCarouselIdx.
// Kept separate so navigating the carousel can patch this one <div> in place
// instead of re-rendering the whole 3-column panel (which would reload the weather iframe).
function buildSafetyAwardInnerHtml() {
    const awards = (window._safetyAwards || []).slice(0, 8);
    if (_safetyCarouselIdx >= awards.length) _safetyCarouselIdx = 0;
    const esc = function(s) { return String(s == null ? '' : s).replace(/</g, '&lt;'); };

    let heroHtml;
    if (awards.length === 0) {
        heroHtml = `
        <div class="saw-hero saw-hero-empty">
            <i class="fas fa-trophy"></i>
            <span>No safety awards recorded yet.</span>
        </div>`;
    } else {
        const slides = awards.map(function(aw, i) {
            const photo = (Array.isArray(aw.photos) && aw.photos[0]) ? aw.photos[0] : null;
            const on = i === _safetyCarouselIdx;
            return `
            <div class="saw-slide" data-idx="${i}" onclick="safetyViewAwardDetail('${aw.id}')" style="opacity:${on ? 1 : 0};pointer-events:${on ? 'auto' : 'none'};z-index:${on ? 1 : 0};">
                ${photo
                    ? `<img class="saw-slide-img" src="${photo}" alt="" style="object-position:${aw.photoPosition || 'center'};">`
                    : `<div class="saw-slide-ph"><i class="fas fa-trophy"></i></div>`}
                <div class="saw-hero-txt">
                    <div class="saw-kicker">${esc(aw.awardTitle || 'ESH award and recognition')}</div>
                    <h2 class="saw-hero-title">${esc(aw.awardeeName)}</h2>
                    <div class="saw-hero-meta">${aw.project ? esc(aw.project) : 'Company-wide'} · ${esc(aw.date)}${aw.awardingBody ? ' · ' + esc(aw.awardingBody) : ''}</div>
                </div>
            </div>`;
        }).join('');
        const dots = awards.map(function(_, i) {
            return `<button type="button" class="${i === _safetyCarouselIdx ? 'on' : ''}" aria-label="Go to award ${i + 1}" onclick="event.stopPropagation();safetyAwardGoTo(${i})"></button>`;
        }).join('');
        heroHtml = `
        <div id="safety-award-hero" class="saw-hero">
            ${slides}
            ${awards.length > 1 ? `
            <button type="button" class="saw-arrow l" aria-label="Previous" onclick="event.stopPropagation();safetyAwardPrev()"><i class="fas fa-chevron-left"></i></button>
            <button type="button" class="saw-arrow r" aria-label="Next" onclick="event.stopPropagation();safetyAwardNext()"><i class="fas fa-chevron-right"></i></button>
            <div class="saw-dots">${dots}</div>
            <div class="saw-count">${_safetyCarouselIdx + 1} of ${awards.length}</div>` : ''}
        </div>`;
    }

    // Up to 3 "other" awards shown as mini cards below the hero (skip the one currently featured)
    const otherAwards = awards.filter(function(_, i) { return i !== _safetyCarouselIdx; }).slice(0, 3);
    const miniCardsHtml = otherAwards.length === 0 ? '' : `
    <div class="saw-mini-grid">
        ${otherAwards.map(function(aw) {
            const photo = (Array.isArray(aw.photos) && aw.photos[0]) ? aw.photos[0] : null;
            return `
            <div class="saw-mini-card" onclick="safetyViewAwardDetail('${aw.id}')">
                <div class="saw-mini-img" style="${photo ? `background-image:url('${photo}')` : ''}">
                    ${photo ? '' : '<i class="fas fa-trophy"></i>'}
                </div>
                <div class="saw-mini-title">${esc(aw.awardeeName || aw.awardTitle || 'Safety Award')}</div>
            </div>`;
        }).join('')}
    </div>`;

    return heroHtml + miniCardsHtml;
}

// Patches only the hero-carousel <div> in place — used by next/prev/goTo so the
// weather iframe and alert list never get touched (and never re-fetch/reload).
function updateSafetyAwardHeroInPlace() {
    const el = document.getElementById('saw-award-inner');
    if (!el) { renderSafetyAlertAwardPanel(); return; } // panel not mounted yet — fall back to full render
    el.innerHTML = buildSafetyAwardInnerHtml();
}
window.updateSafetyAwardHeroInPlace = updateSafetyAwardHeroInPlace;

// ── Home: latest incident per classification, read from the Incident & Accident Registry ──
// Shows only the project, date and classification (no injured person name).
// Same for every user: all regions are shown, no restriction.
function buildHomeLatestIncidentsHtml() {
    const esc = function(s) { return String(s == null ? '' : s).replace(/</g, '&lt;'); };

    // Order = severity. Label = text shown on Home.
    const ORDER = [
        { key: 'Fatality',                    label: 'Fatality' },
        { key: 'LTA',                         label: 'LTA' },
        { key: 'Restricted Work Case (RWC)',  label: 'Restricted work case' },
        { key: 'Medical Treatment',           label: 'Medical treatment' },
        { key: 'First Aid',                   label: 'First aid' },
        { key: 'Dangerous Occurrence',        label: 'Dangerous occurrence' },
        { key: 'High-Potential Incident',     label: 'High-potential incident' },
        { key: 'Near Miss',                   label: 'Near miss' }
    ];
    const latest = {};   // key -> { date, project }
    (state.projects || []).forEach(function(p) {
        if (!p || !p.vals) return;
        (p.vals['lta-registry_entries'] || []).forEach(function(e, entryIdx) {
            if (!e) return;
            const d = e.dateOfAccident || e.dateReported || '';
            if (!d || isNaN(new Date(d).getTime())) return;
            const persons = (typeof window.ltaEntryPersons === 'function') ? window.ltaEntryPersons(e) : [e];
            persons.forEach(function(pp) {
                const c = Array.isArray(pp.incidentClassification) ? pp.incidentClassification[0] : pp.incidentClassification;
                const key = c || 'LTA';
                if (!latest[key] || d > latest[key].date) {
                    // Title = Nature of Incident from the registry ("Others" -> the text typed in)
                    const noi = String(e.natureOfIncident || '').trim();
                    const title = (noi === 'Others' ? String(e.natureOfIncidentOther || '').trim() : noi);
                    latest[key] = { date: d, project: p.name, title: title, idx: entryIdx };
                }
            });
        });
    });

    const todayMs = new Date(new Date().toDateString()).getTime();
    const daysAgo = function(d) { return Math.max(0, Math.round((todayMs - new Date(d).getTime()) / 86400000)); };
    const agoText = function(n) { return n === 0 ? 'Today' : (n === 1 ? '1 day ago' : n + ' days ago'); };
    const yr = (state && state.selectedYear) ? state.selectedYear : new Date().getFullYear();

    window._homeIncRefs = [];
    const rows = ORDER.filter(function(o) { return latest[o.key]; }).map(function(o) {
        const r = latest[o.key];
        const refNo = window._homeIncRefs.push({ project: r.project, idx: r.idx }) - 1;
        return `
            <div class="hm-inc-item" role="button" tabindex="0" title="View incident" onclick="homeOpenIncident(${refNo})" onkeydown="if(event.key==='Enter'){homeOpenIncident(${refNo});}">
                <div style="min-width:0;">
                    <div class="hm-inc-title">${o.label}${r.title ? ' - ' + esc(r.title) : ''}</div>
                    <div class="saw-alert-meta"><span>${esc(r.project || 'Company-wide')}</span><span class="saw-date">${esc(r.date)}</span></div>
                </div>
                <span class="hm-inc-ago">${agoText(daysAgo(r.date))}</span>
            </div>`;
    }).join('');

    const lta = latest['LTA'];
    const ltaLine = lta
        ? `<span class="sec-head-side">${daysAgo(lta.date)} day${daysAgo(lta.date) === 1 ? '' : 's'} since last LTA</span>`
        : `<span class="sec-head-side">No LTA recorded in ${yr}</span>`;

    return `
        <div class="sec-head hm-inc-head">
            <div class="sec-head-title">Latest incidents</div>
            ${ltaLine}
        </div>
        <div class="hm-inc-list">${rows || '<div class="saw-empty">No incidents recorded in ' + yr + '.</div>'}</div>`;
}

// Opens the registry entry (view only) from the Home "Latest incidents" list.
function homeOpenIncident(refNo) {
    const ref = (window._homeIncRefs || [])[refNo];
    if (!ref) return;
    if (typeof window.openLtaModal === 'function') window.openLtaModal(ref.project, ref.idx, false);
    else if (typeof showToast === 'function') showToast('The incident registry is not ready yet. Please try again.', 'warning');
}
window.homeOpenIncident = homeOpenIncident;

function renderSafetyAlertAwardPanel() {
    const container = document.getElementById('safety-alert-award-panel');
    if (!container) return;
    // Only render while the Headlines tab is open, so the Windy iframe does not load in the background
    if (state.currentTab !== 'headlines') return;
    ensureSafetyAwardGridStyles();

    if (_safetyCarouselTimer) { clearInterval(_safetyCarouselTimer); _safetyCarouselTimer = null; }

    const canPublish   = canManageSafety();
    const alerts       = window._safetyAlerts || [];
    const awards       = (window._safetyAwards || []).slice(0, 8);

    if (_safetyCarouselIdx >= awards.length) _safetyCarouselIdx = 0;

    // ── LEFT: Safety Alert list ──
    const topAlerts = alerts.slice(0, 5); // 5 (was 8) so the Latest incidents list fits below
    const alertsListHtml = topAlerts.length === 0
        ? `<div class="saw-empty">No safety alerts yet.</div>`
        : topAlerts.map(function(a, i) {
            const thumb = safetyAlertThumbUrl(a);
            const fileIcon = a.fileType === 'pdf' ? 'fa-file-pdf' : 'fa-file-word';
            const fileColor = a.fileType === 'pdf' ? '#c62828' : '#1565c0';
            // Alert with a file: flat file badge (W = Word, PDF = PDF). Old photo-only alerts keep their thumbnail.
            const thumbHtml = a.fileUrl
                ? `<div class="hm-fbadge ${a.fileType === 'pdf' ? 'p' : 'w'}">${a.fileType === 'pdf' ? 'PDF' : 'W'}</div>`
                : (thumb
                    ? `<img class="saw-thumb" src="${thumb}" alt="">`
                    : `<div class="saw-thumb"><i class="fas ${fileIcon}" style="color:${fileColor};"></i></div>`);
            return `
            <div class="saw-alert-item" onclick="safetyViewAlertDetail('${a.id}')">
                <div style="min-width:0;">
                    <div class="saw-alert-title">${(a.title || 'Untitled Alert').replace(/</g, '&lt;')}</div>
                    <div class="saw-alert-meta"><span>${a.project ? a.project.replace(/</g, '&lt;') : 'Company-wide'}</span><span class="saw-date">${a.dateIssued || ''}</span></div>
                </div>
                ${thumbHtml}
            </div>`;
        }).join('');
    const alertsCol = `
      <section class="saw-panel hm-alert">
        <div class="sec-head">
            <div class="sec-head-title">Safety alert</div>
            ${topAlerts.length > 0 ? `<span class="sec-head-side">${topAlerts.length} latest</span>` : ''}
        </div>
        <div class="saw-alert-list">${alertsListHtml}</div>
        ${alerts.length > 0 ? `<div class="saw-more" onclick="changeTab('safety-alerts')">See more alerts</div>` : ''}
        ${buildHomeLatestIncidentsHtml()}
      </section>`;

    // ── CENTER: ESH award hero carousel + mini cards ──
    const awardCol = `
      <section class="saw-panel hm-award">
        <div class="sec-head">
            <div class="sec-head-title">ESH award and recognition</div>
            <div class="sec-head-badges">
                ${canPublish ? `<button type="button" class="saw-chip fill" onclick="safetyOpenAwardForm()">+ Award</button>` : ''}
                <button type="button" class="saw-chip" onclick="safetyOpenAwardHistoryModal()">View all</button>
            </div>
        </div>
        <div id="saw-award-inner">${buildSafetyAwardInnerHtml()}</div>
      </section>`;

    // ── RIGHT: Weather (PAGASA + Windy). Markup lives in index.html → <template id="saw-wx-template"> ──
    const _wxTpl = document.getElementById('saw-wx-template');
    const weatherCol = _wxTpl ? '<div class="hm-wx">' + _wxTpl.innerHTML + '</div>' : '';

    container.innerHTML = `<div class="hm-grid">${awardCol}${alertsCol}${weatherCol}</div>`;
    sawWxInit();

    if (awards.length > 1) {
        _safetyCarouselTimer = setInterval(function(){ safetyAwardNext(); }, 4000);
    }
}
window.renderSafetyAlertAwardPanel = renderSafetyAlertAwardPanel;

// Weather column: PAGASA box + Windy box (markup in index.html). The PAGASA image loads right away.
// The URL only changes once per hour, so the browser can reuse its cache.
function sawWxInit() {
    const img = document.getElementById('saw-wx-pagasa-img');
    if (!img) return;
    img.classList.add('is-loading');
    img.src = img.dataset.src + '?t=' + Math.floor(Date.now() / 3600000);
}
function sawWxImgDone(img) {
    img.classList.remove('is-loading');
}
// If the image fails: retry once without the cache-buster, then show the message.
function sawWxImgErr(img) {
    if (img.src.indexOf('?') > -1) { img.src = img.src.split('?')[0]; return; }
    sawWxImgDone(img);
    img.alt = 'Hindi ma-load ang image. Buksan ang PAGASA page.';
}
window.sawWxImgDone = sawWxImgDone;
window.sawWxImgErr = sawWxImgErr;

function stopSafetyAwardCarousel() {
    if (_safetyCarouselTimer) { clearInterval(_safetyCarouselTimer); _safetyCarouselTimer = null; }
    const c = document.getElementById('safety-alert-award-panel');
    if (c) c.innerHTML = ''; // unload the Windy iframe when leaving the tab
}
window.stopSafetyAwardCarousel = stopSafetyAwardCarousel;

function safetyAwardGoTo(idx) { _safetyCarouselIdx = idx; updateSafetyAwardHeroInPlace(); }
window.safetyAwardGoTo = safetyAwardGoTo;

// ════════════════════════════════════════════════════════════════════════
// Dedicated "Safety Alerts" tab — full page, its own nav item
// ════════════════════════════════════════════════════════════════════════

function safetyAlertCardHtml(a, canManage) {
    // One plain list row: small thumbnail | title + status + project | date | actions
    const esc = function(t) { return String(t || '').replace(/</g, '&lt;'); };
    return `
    <div class="sa-row">
        <div class="sa-main">
            <div class="sa-t"><span class="sa-title" onclick="safetyViewAlertDetail('${a.id}')">${esc(a.title) || 'Untitled Alert'}</span></div>
            <div class="sa-meta">${a.project ? esc(a.project) : 'Company-wide'}</div>
        </div>
        <div class="sa-date">${a.dateIssued || ''}</div>
        <div class="sa-act">
            <button class="sa-btn" onclick="safetyViewAlertDetail('${a.id}')">View</button>
            ${canManage ? `<button class="sa-ib" onclick="safetyEditAlertForm('${a.id}')" title="Edit"><i class="fas fa-pen"></i></button>` : ''}
            ${canManage ? `<button class="sa-ib" onclick="safetyDeleteAlertConfirm('${a.id}')" title="Delete permanently" style="color:#c62828;"><i class="fas fa-trash"></i></button>` : ''}
        </div>
    </div>`;
}

function renderSafetyAlertsPage() {
    const view = document.getElementById('safety-alerts-view');
    if (!view) return;
    const canManage = canManageSafety();
    const all = window._safetyAlerts || [];

    // Alert -> region through its project (alerts only store the project name). No match / company-wide -> CORPORATE.
    const REGIONS = ['NCR', 'SOUTH LUZON', 'NORTH LUZON', 'VISAYAS & MINDANAO'];
    const projRegion = {};
    ((typeof state !== 'undefined' && state.projects) || []).forEach(function(p) { if (p && p.name) projRegion[String(p.name).trim().toLowerCase()] = p.region; });
    const groups = { 'CORPORATE': [] };
    REGIONS.forEach(function(r) { groups[r] = []; });
    all.forEach(function(a) {
        let r = projRegion[String(a.project || '').trim().toLowerCase()];
        if (!groups[r]) r = 'CORPORATE';
        groups[r].push(a);
    });

    let body;
    if (all.length === 0) {
        body = `<div style="padding:60px 20px;text-align:center;color:var(--text-secondary);">
            <i class="fas fa-triangle-exclamation" style="font-size:2.2rem;color:#c5cdc8;"></i>
            <div style="margin-top:10px;font-size:0.85rem;">No safety alerts yet.</div>
        </div>`;
    } else {
        body = REGIONS.concat(groups['CORPORATE'].length ? ['CORPORATE'] : []).map(function(reg) {
            const items = groups[reg];
            const id = window.regionSlug(reg);
            const badges = '<span class="rbadge rbadge-count">' + items.length + ' ALERT' + (items.length !== 1 ? 'S' : '') + '</span>';
            const inner = items.length
                ? '<div class="sa-list">' + items.map(function(a) { return safetyAlertCardHtml(a, canManage); }).join('') + '</div>'
                : '<div style="padding:18px;text-align:center;color:var(--text-secondary);font-size:0.76rem;font-style:italic;">No safety alerts for this region.</div>';
            // Default: all regions closed; keeps whatever the user toggled open/closed
            const collapsed = (id in window._rsCollapsed) ? window._rsCollapsed[id] : true;
            return window.regionSection({ id: id, reg: reg, badges: badges, body: inner, collapsed: collapsed, editable: canManage });
        }).join('');
    }

    view.innerHTML = `
    ${canManage ? `<div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-bottom:16px;">
        <button class="mdl-btn primary" onclick="safetyOpenAlertForm()"><i class="fas fa-plus"></i> New Safety Alert</button>
    </div>` : ''}
    ${body}`;
}
window.renderSafetyAlertsPage = renderSafetyAlertsPage;

function safetyAwardNext() {
    const count = (window._safetyAwards || []).slice(0, 8).length;
    if (count === 0) return;
    _safetyCarouselIdx = (_safetyCarouselIdx + 1) % count;
    updateSafetyAwardHeroInPlace();
}
window.safetyAwardNext = safetyAwardNext;

function safetyAwardPrev() {
    const count = (window._safetyAwards || []).slice(0, 8).length;
    if (count === 0) return;
    _safetyCarouselIdx = (_safetyCarouselIdx - 1 + count) % count;
    updateSafetyAwardHeroInPlace();
}
window.safetyAwardPrev = safetyAwardPrev;

function safetyDeleteAlertConfirm(id) {
    if (!canManageSafety()) { showToast('Switch to Edit Mode to delete an alert.', 'error'); return; }
    const alert = (window._safetyAlerts || []).find(function(a){ return a.id === id; });
    if (!alert) return;
    const modal = document.createElement('div');
    modal.id = 'safety-delete-confirm-overlay';
    window.eshMountModal(modal, { id: 'safety-delete-confirm-overlay', icon: 'fa-triangle-exclamation', width: 420, title: 'Delete this safety alert?',
        body: `<div style="padding:16px 18px;font-size:0.8rem;color:var(--text-secondary);">"${(alert.title||'Untitled Alert').replace(/</g,'&lt;')}" will be permanently deleted. This cannot be undone.</div>`,
        foot: `<button class="mdl-btn neutral" onclick="eshCloseModal('safety-delete-confirm-overlay')">Cancel</button><button class="mdl-btn danger" onclick="deleteSafetyAlert('${id}');eshCloseModal('safety-delete-confirm-overlay');">Delete</button>` }, '10000');
}
window.safetyDeleteAlertConfirm = safetyDeleteAlertConfirm;

// ── Add/Edit Alert modal ───────────────────────────────────────────────────
function canManageSafety() {
    return isSafetyPublisher() && !!state.isEditing;
}
window.canManageSafety = canManageSafety;

const SAFETY_AWARDING_BODIES = ['Internal (SCIC ESH)', 'DOLE', 'Client', 'SOPI (Safety Organization of the Philippines, Inc.)', 'Industry Organization'];

// Resolves the ordered photo list for a form into final URLs — uploads any
// new (blob) items to Cloudinary in place, keeps existing URLs as-is, and
// preserves the front/cover ordering the user picked (index 0 = front).
async function safetyResolvePhotos(kind, statusElId) {
    const items = window._safetyPhotoItems[kind] || [];
    const urls = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'existing') {
            urls.push(item.url);
        } else {
            const statusEl = document.getElementById(statusElId);
            if (statusEl) statusEl.textContent = `Uploading photo ${i + 1}/${items.length}...`;
            const url = await uploadImageToCloudinary(item.blob);
            urls.push(url);
        }
    }
    return urls;
}
window.safetyResolvePhotos = safetyResolvePhotos;

// ── Auto-fill of the ESH Alert form from the selected PDF / Word file ───────
// Reads the table headers (Alert No., Release Date, Incident Date & Time, Location, Injury):
//   Alert No. -> ESH Alert No.   Release Date -> Release Date   Injury -> Title
//   Project   -> matched against the dropdown names inside the "Brief Description" text.
// Never overwrites what was already typed/picked, and does nothing in Edit mode.
const _safetyScriptPromises = {};
function safetyLoadScriptOnce(url) {
    if (_safetyScriptPromises[url]) return _safetyScriptPromises[url];
    _safetyScriptPromises[url] = new Promise(function(resolve, reject) {
        const s = document.createElement('script');
        s.src = url; s.onload = resolve;
        s.onerror = function() { delete _safetyScriptPromises[url]; reject(new Error('Failed to load ' + url)); };
        document.head.appendChild(s);
    });
    return _safetyScriptPromises[url];
}

function safetyAutofillSetStatus(msg, isError) {
    let el = document.getElementById('sa-read-status');
    if (!el) {
        const base = document.getElementById('sa-file-status');
        if (!base) return;
        el = document.createElement('div');
        el.id = 'sa-read-status';
        base.parentNode.insertBefore(el, base.nextSibling);
    }
    el.style.cssText = 'font-size:0.68rem;margin-top:4px;color:' + (isError ? '#c62828' : 'var(--text-secondary)') + ';';
    el.textContent = msg || '';
}

// PDF -> [{s, x, y(top-down), h}] text items. No text layer -> OCR of page 1.
async function safetyReadPdfItems(file) {
    if (!window.pdfjsLib) throw new Error('PDF reader not loaded');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let items = [];
    const pages = Math.min(pdf.numPages, 2);
    for (let p = 1; p <= pages; p++) {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 1 });
        const tc = await page.getTextContent();
        tc.items.forEach(function(it) {
            if (!it.str || !it.str.trim()) return;
            items.push({ s: it.str.trim(), x: it.transform[4], y: (p - 1) * 10000 + (vp.height - it.transform[5]), h: Math.abs(it.transform[3]) || 10, w: it.width || 0 });
        });
    }
    if (items.join('').length >= 20 && items.reduce(function(n, i) { return n + i.s.length; }, 0) >= 20) return items;

    safetyAutofillSetStatus('No text in PDF. Running OCR (10–30 seconds)...');
    await safetyLoadScriptOnce('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
    const page1 = await pdf.getPage(1);
    const vp2 = page1.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = vp2.width; canvas.height = vp2.height;
    await page1.render({ canvasContext: canvas.getContext('2d'), viewport: vp2 }).promise;
    const res = await Tesseract.recognize(canvas, 'eng');
    return ((res && res.data && res.data.words) || []).filter(function(w) { return w.text && w.text.trim(); })
        .map(function(w) { return { s: w.text.trim(), x: w.bbox.x0, y: w.bbox.y0, h: (w.bbox.y1 - w.bbox.y0) || 10, w: (w.bbox.x1 - w.bbox.x0) || 0 }; });
}

// Groups text items into lines (top to bottom, left to right).
function safetyItemsToLines(items) {
    const sorted = items.slice().sort(function(a, b) { return a.y - b.y || a.x - b.x; });
    const lines = [];
    sorted.forEach(function(it) {
        const last = lines[lines.length - 1];
        if (last && Math.abs(it.y - last.y) <= Math.max(3, last.h * 0.6)) { last.items.push(it); }
        else lines.push({ y: it.y, h: it.h, items: [it] });
    });
    lines.forEach(function(l) {
        l.items.sort(function(a, b) { return a.x - b.x; });
        l.text = l.items.map(function(i) { return i.s; }).join(' ').replace(/\s+/g, ' ').trim();
    });
    return lines;
}

const SAFETY_BRIEF_STOP = /^(0\d\s*(photo|what|recommend|corrective|root|immediate)|immediate|root\s*cause|corrective|preventive|lessons|recommend|action\s*taken|prepared|investigat|reported\s*by|approved|noted)/i;

// "Brief Description" text: what follows the label until the next section label.
function safetyExtractBrief(textLines) {
    const idx = textLines.findIndex(function(t) { return /brief\s*description/i.test(t); });
    if (idx === -1) return '';
    const parts = [textLines[idx].replace(/^.*?brief\s*description\s*[:\-–]?\s*/i, '')];
    for (let i = idx + 1; i < textLines.length && i <= idx + 12; i++) {
        if (SAFETY_BRIEF_STOP.test(textLines[i])) break;
        parts.push(textLines[i]);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 1500);
}

// PDF/OCR items -> { alertNo, release, injury, brief } using the header x-positions as columns.
function safetyParseAlertItems(items) {
    const lines = safetyItemsToLines(items);
    const out = { alertNo: '', release: '', injury: '', brief: '' };
    const hi = lines.findIndex(function(l) { return /alert\s*no/i.test(l.text); });
    if (hi !== -1) {
        const cols = [
            { key: 'alertNo', re: /^alert/i }, { key: 'release', re: /^release/i }, { key: 'incident', re: /^incident/i },
            { key: 'location', re: /^location/i }, { key: 'injury', re: /injur/i }
        ];
        let hdrEnd = hi;
        if (lines[hi + 1] && lines[hi + 1].text.length < 25 && /^(&?\s*time|date|no\.?)/i.test(lines[hi + 1].text)) hdrEnd = hi + 1;
        const hdrItems = [];
        for (let li = hi; li <= hdrEnd; li++) lines[li].items.forEach(function(i) { hdrItems.push(i); });
        cols.forEach(function(c) {
            const it = hdrItems.find(function(i) { return c.re.test(i.s); });
            if (it) c.x = it.x;
        });
        const anchors = cols.filter(function(c) { return c.x !== undefined; }).sort(function(a, b) { return a.x - b.x; });
        // Header extent per column -> header centre (headers are often centred over left-aligned data).
        anchors.forEach(function(a) { a.min = Infinity; a.max = -Infinity; });
        hdrItems.forEach(function(it) {
            let col = anchors[0];
            anchors.forEach(function(a) { if (a.x <= it.x + 6) col = a; });
            if (col) { col.min = Math.min(col.min, it.x); col.max = Math.max(col.max, it.x + (it.w || 0)); }
        });
        anchors.forEach(function(a) { a.c = (a.min + a.max) / 2; });
        let stop = lines.findIndex(function(l, i) { return i > hdrEnd && /brief\s*description/i.test(l.text); });
        const dataLines = lines.slice(hdrEnd + 1, stop === -1 ? hdrEnd + 5 : stop);
        const acc = {};
        dataLines.forEach(function(l) {
            l.items.forEach(function(it) {
                const cx = it.x + (it.w || 0) / 2;
                let col = anchors[0], best = Infinity;
                anchors.forEach(function(a) {
                    const d = Math.min(Math.abs(it.x - a.x), Math.abs(cx - a.c));
                    if (d < best) { best = d; col = a; }
                });
                if (col) acc[col.key] = (acc[col.key] ? acc[col.key] + ' ' : '') + it.s;
            });
        });
        ['alertNo', 'release', 'injury'].forEach(function(k) { out[k] = (acc[k] || '').replace(/\s+/g, ' ').trim(); });
    }
    out.brief = safetyExtractBrief(lines.map(function(l) { return l.text; }));
    return out;
}

// Word (.docx) -> same shape. Each table cell is "Label value" (e.g. "Injury Lost Time Accident");
// a header-row + data-row table is also handled. Brief Description = the paragraph(s) after its label.
async function safetyParseAlertDocx(file) {
    await safetyLoadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
    const res = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    const doc = new DOMParser().parseFromString(res.value, 'text/html');
    const out = { alertNo: '', release: '', injury: '', brief: '' };
    const clean = function(x) { return String(x || '').replace(/\s+/g, ' ').trim(); };
    const cellText = function(c) {
        const ps = Array.prototype.slice.call(c.querySelectorAll('p'));
        return clean(ps.length ? ps.map(function(p) { return p.textContent; }).join(' ') : c.textContent);
    };
    const labels = [
        { key: 'alertNo', re: /^alert\s*no\.?\s*[:\-]?\s*(.*)$/i },
        { key: 'release', re: /^release\s*date\s*[:\-]?\s*(.*)$/i },
        { key: 'injury',  re: /^injur\w*\s*[:\-]?\s*(.*)$/i }
    ];
    Array.prototype.slice.call(doc.querySelectorAll('td,th')).forEach(function(cell) {
        const t = cellText(cell);
        labels.forEach(function(l) {
            if (out[l.key]) return;
            const m = t.match(l.re);
            if (!m) return;
            let v = clean(m[1]);
            if (!v) { // header-row layout: value sits in the same column of the next row
                const row = cell.parentElement, next = row && row.nextElementSibling;
                const idx = row ? Array.prototype.indexOf.call(row.children, cell) : -1;
                if (next && next.children[idx]) v = cellText(next.children[idx]);
            }
            out[l.key] = v;
        });
    });
    const blocks = Array.prototype.slice.call(doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li')).map(function(e) { return clean(e.textContent); }).filter(Boolean);
    out.brief = safetyExtractBrief(blocks);
    return out;
}

function safetyParseReleaseDate(str) {
    if (!str) return '';
    const s = str.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    const mons = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const pad = function(n) { return String(n).padStart(2, '0'); };
    const fix = function(y) { y = parseInt(y, 10); return y < 100 ? 2000 + y : y; };
    const ok = function(y, m, d) { const dt = new Date(y, m - 1, d); return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? y + '-' + pad(m) + '-' + pad(d) : ''; };
    let m;
    if ((m = s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return ok(+m[1], +m[2], +m[3]);
    if ((m = s.match(/(\d{1,2})[\s\-\/.]*([A-Za-z]{3,9})[\s\-\/.]*(\d{2,4})/))) {
        const mi = mons.indexOf(m[2].slice(0, 3).toLowerCase());
        if (mi !== -1) return ok(fix(m[3]), mi + 1, +m[1]);
    }
    if ((m = s.match(/([A-Za-z]{3,9})\.?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(\d{2,4})/))) {
        const mi = mons.indexOf(m[1].slice(0, 3).toLowerCase());
        if (mi !== -1) return ok(fix(m[3]), mi + 1, +m[2]);
    }
    if ((m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/))) {
        const a = +m[1], b = +m[2], y = fix(m[3]);
        if (a > 12) return ok(y, b, a);
        if (b > 12) return ok(y, a, b);
        return ''; // ambiguous dd/mm vs mm/dd: leave the date alone
    }
    return '';
}

// Picks the dropdown project named in the Brief Description. One clear match only.
function safetyMatchProject(brief, names) {
    if (!brief) return '';
    const compact = function(x) { return String(x).toLowerCase().replace(/[^a-z0-9]/g, ''); };
    const hay = compact(brief);
    const has = function(tok) { return new RegExp(tok + (/\d$/.test(tok) ? '(?!\\d)' : '')).test(hay); };
    const pick = function(list) {
        if (list.length <= 1) return list[0] || '';
        const longest = list.filter(function(a) { return !list.some(function(b) { return b !== a && compact(b).indexOf(compact(a)) !== -1; }); });
        return longest.length === 1 ? longest[0] : '';
    };
    const full = names.filter(function(n) { return compact(n).length >= 3 && hay.indexOf(compact(n)) !== -1; });
    if (full.length) return pick(full);
    const generic = /^(project|power|solar|wind|plant|substation|transmission|line|phase|the|of|and|corporation|corp|inc|epc|works|site|development|farm|sta|clara|scic|energy|hydro|electric|hepp|powerplant|mw|ml|km)$/;
    const byToken = names.filter(function(n) {
        const toks = n.toLowerCase().split(/[^a-z0-9]+/).filter(function(t) { return t.length >= 3 && !generic.test(t); });
        return toks.length && toks.every(has);
    });
    if (byToken.length) return pick(byToken);
    // Last tier: the project whose distinctive words appear most (must be strictly the best, at least one word).
    let best = [], bestScore = 0;
    names.forEach(function(n) {
        const toks = n.toLowerCase().split(/[^a-z0-9]+/).filter(function(t) { return t.length >= 4 && !generic.test(t); });
        const sc = toks.filter(has).length;
        if (sc > bestScore) { bestScore = sc; best = [n]; } else if (sc === bestScore && sc > 0) best.push(n);
    });
    return best.length === 1 ? best[0] : '';
}

let _safetyAutofillToken = 0;
async function safetyAutofillFromFile(file) {
    const idEl = document.getElementById('sa-id');
    if (!idEl || idEl.value) return; // Edit mode: no auto-fill
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'doc') { safetyAutofillSetStatus("Old .doc can't be read. Please fill in the fields manually.", true); return; }
    const token = ++_safetyAutofillToken;
    safetyAutofillSetStatus('Reading file...');
    try {
        const r = ext === 'pdf' ? safetyParseAlertItems(await safetyReadPdfItems(file)) : await safetyParseAlertDocx(file);
        if (token !== _safetyAutofillToken || !document.getElementById('sa-alertno')) return;

        const found = [], missing = [], kept = [];
        const noEl = document.getElementById('sa-alertno'), titleEl = document.getElementById('sa-title');
        const dateEl = document.getElementById('sa-date'), projEl = document.getElementById('sa-project');

        const isPlaceholder = function(v) { return !!v && /^[xX\s._\-#?]+$/.test(v); };
        const alertNo = isPlaceholder(r.alertNo) ? '' : (r.alertNo || '').replace(/\s+/g, '');
        if (!alertNo) missing.push(r.alertNo ? 'Alert No. (still XXXX)' : 'Alert No.');
        else if (noEl.value.trim()) kept.push('Alert No.');
        else { noEl.value = alertNo; found.push('Alert No.'); }

        const iso = safetyParseReleaseDate(r.release);
        const today = new Date().toISOString().slice(0, 10);
        if (!iso) missing.push(isPlaceholder(r.release) ? 'Release Date (still XXXX, kept today)' : (r.release ? 'Release Date (unreadable, kept today)' : 'Release Date'));
        else if (dateEl.value && dateEl.value !== today) kept.push('Release Date');
        else { dateEl.value = iso; found.push('Release Date'); }

        const title = (r.injury || '').replace(/\s+/g, ' ').trim();
        if (!title) missing.push('Title');
        else if (titleEl.value.trim()) kept.push('Title');
        else { titleEl.value = title; found.push('Title'); }

        const names = Array.prototype.slice.call(projEl.options).map(function(o) { return o.value; }).filter(Boolean);
        const proj = safetyMatchProject(r.brief, names);
        if (!proj) missing.push('Project');
        else if (projEl.value) kept.push('Project');
        else { projEl.value = proj; found.push('Project'); }

        let msg = 'Detected: ' + (found.join(', ') || 'none') + '.';
        if (missing.length) msg += ' Not found: ' + missing.join(', ') + '.';
        if (kept.length) msg += ' Kept yours: ' + kept.join(', ') + '.';
        safetyAutofillSetStatus(msg, !found.length);
    } catch (e) {
        if (token === _safetyAutofillToken) safetyAutofillSetStatus("Couldn't read the file (" + e.message + "). Please fill in manually.", true);
    }
}
window.safetyAutofillFromFile = safetyAutofillFromFile;

// Holds the currently-selected file (pending upload) for the alert form.
window._safetyAlertPendingFile = null;

function safetyHandleAlertFileSelect(inputEl) {
    const file = inputEl.files && inputEl.files[0];
    const statusEl = document.getElementById('sa-file-status');
    if (!file) { window._safetyAlertPendingFile = null; if (statusEl) statusEl.textContent = ''; safetyAutofillSetStatus(''); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf','doc','docx'].includes(ext)) {
        showToast('Please choose a PDF or Word file.', 'error');
        inputEl.value = '';
        window._safetyAlertPendingFile = null;
        if (statusEl) statusEl.textContent = '';
        return;
    }
    window._safetyAlertPendingFile = file;
    if (statusEl) statusEl.textContent = `Selected: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
    safetyAutofillFromFile(file);
}
window.safetyHandleAlertFileSelect = safetyHandleAlertFileSelect;

function safetyOpenAlertForm(existing) {
    if (!canManageSafety()) { showToast('Switch to Edit Mode to post a Safety Alert.', 'error'); return; }
    window._safetyAlertPendingFile = null;

    const today = new Date().toISOString().slice(0,10);
    const isEdit = !!existing;
    const lbl = 'font-size:0.72rem;font-weight:700;color:var(--text-secondary);';
    const inp = 'width:100%;padding:8px;border:1px solid var(--border-color);border-radius:6px;box-sizing:border-box;margin-top:4px;';

    const modal = document.createElement('div');
    modal.id = 'safety-alert-modal-overlay';
    window.eshMountModal(modal, {
        id: 'safety-alert-modal-overlay', icon: 'fa-triangle-exclamation', width: 460,
        title: `${isEdit ? 'Edit ESH alert' : 'New ESH alert'}`,
        body: `<div style="background:var(--bg-card);padding:18px 20px;display:flex;flex-direction:column;gap:10px;">
            <input type="hidden" id="sa-id" value="${isEdit ? existing.id : ''}">

            <div><div style="${lbl}">ESH Alert No. *</div>
                <input id="sa-alertno" type="text" placeholder="e.g. THEPP-2026-001" value="${isEdit ? (existing.alertNo||'').replace(/"/g,'&quot;') : ''}" style="${inp}"></div>
            <div><div style="${lbl}">Title *</div>
                <input id="sa-title" type="text" placeholder="e.g. Contusion of Thumb" value="${isEdit ? (existing.title||'').replace(/"/g,'&quot;') : ''}" style="${inp}"></div>
            <div style="display:flex;gap:10px;">
                <div style="flex:1;"><div style="${lbl}">Release Date</div>
                    <input id="sa-date" type="date" value="${isEdit ? (existing.dateIssued||today) : today}" style="${inp}"></div>
                <div style="flex:1;"><div style="${lbl}">Project</div>
                    <select id="sa-project" style="${inp}">${safetyProjectOptionsHTML(isEdit ? existing.project : '')}</select></div>
            </div>

            <div style="margin-top:6px;border-top:1px solid var(--border-color);padding-top:12px;">
                <div style="${lbl}">Upload PDF or Word file *</div>
                <input id="sa-file-input" type="file" accept=".pdf,.doc,.docx" onchange="safetyHandleAlertFileSelect(this)" style="width:100%;margin-top:4px;">
                <div id="sa-file-status" style="font-size:0.68rem;color:var(--text-secondary);margin-top:4px;">${isEdit && existing.fileName ? `Current file: ${existing.fileName.replace(/</g,'&lt;')} (choose a new file to replace it)` : ''}</div>
            </div>
        </div>
        `,
        foot: `<button class="mdl-btn neutral" onclick="eshCloseModal('safety-alert-modal-overlay')">Cancel</button><button class="mdl-btn primary" id="sa-submit-btn" onclick="safetySubmitAlert()">${isEdit ? 'Save Changes' : 'Publish Alert'}</button>`
    }, '9999');
}
window.safetyOpenAlertForm = safetyOpenAlertForm;

function safetyEditAlertForm(id) {
    const existing = (window._safetyAlerts || []).find(function(a){ return a.id === id; });
    if (existing) safetyOpenAlertForm(existing);
}
window.safetyEditAlertForm = safetyEditAlertForm;

// Uploads a non-image file (PDF/Word) to Cloudinary. PDFs go up as resource_type 'image' so
// Cloudinary can rasterize a page-1 thumbnail for us; Word docs go up as 'raw' (no thumbnail
// possible — Cloudinary can't render Office formats).
function uploadDocumentToCloudinary(file, resourceType, onProgress) {
    const url = `https://api.cloudinary.com/v1_1/${SAFETY_CLOUDINARY_CLOUD}/${resourceType}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', SAFETY_CLOUDINARY_PRESET);
    formData.append('folder', 'safety-dashboard/alerts');
    return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.upload.onprogress = function(e) {
            if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = function() {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve(data.secure_url);
                else reject(new Error(data.error?.message || 'Upload failed'));
            } catch(e) { reject(e); }
        };
        xhr.onerror = function() { reject(new Error('Network error during upload')); };
        xhr.send(formData);
    });
}
window.uploadDocumentToCloudinary = uploadDocumentToCloudinary;

// For a Cloudinary-hosted PDF (uploaded as resource_type=image), builds a page-1 JPG thumbnail URL.
function safetyCloudinaryPdfThumb(secureUrl) {
    if (!secureUrl) return null;
    // .../image/upload/v123/folder/name.pdf  ->  .../image/upload/pg_1,w_500/v123/folder/name.jpg
    const marker = '/image/upload/';
    const idx = secureUrl.indexOf(marker);
    if (idx === -1) return null;
    const withTransform = secureUrl.slice(0, idx + marker.length) + 'pg_1,w_500/' + secureUrl.slice(idx + marker.length);
    return withTransform.replace(/\.pdf($|\?)/i, '.jpg$1');
}
window.safetyCloudinaryPdfThumb = safetyCloudinaryPdfThumb;

async function safetySubmitAlert() {
    const alertNo = document.getElementById('sa-alertno').value.trim();
    const title   = document.getElementById('sa-title').value.trim();
    if (!alertNo || !title) { showToast('ESH Alert No. and Title are required.', 'error'); return; }
    const btn = document.getElementById('sa-submit-btn');
    const isEditId = document.getElementById('sa-id').value;
    const existingRecord = isEditId ? (window._safetyAlerts || []).find(function(a){ return a.id === isEditId; }) : null;

    if (!isEditId && !window._safetyAlertPendingFile) { showToast('Please upload a PDF or Word file.', 'error'); return; }

    btn.disabled = true; btn.textContent = isEditId ? 'Saving...' : 'Publishing...';
    try {
        let fileUrl = existingRecord ? existingRecord.fileUrl : null;
        let fileType = existingRecord ? existingRecord.fileType : null;
        let fileName = existingRecord ? existingRecord.fileName : null;
        let thumbnailUrl = existingRecord ? existingRecord.thumbnailUrl : null;

        if (window._safetyAlertPendingFile) {
            const file = window._safetyAlertPendingFile;
            const ext = file.name.split('.').pop().toLowerCase();
            fileType = ext === 'pdf' ? 'pdf' : 'docx';
            fileName = file.name;
            const statusEl = document.getElementById('sa-file-status');
            fileUrl = await uploadDocumentToCloudinary(file, fileType === 'pdf' ? 'image' : 'raw', function(pct) {
                if (statusEl) statusEl.textContent = `Uploading... ${pct}%`;
            });
            thumbnailUrl = fileType === 'pdf' ? safetyCloudinaryPdfThumb(fileUrl) : null;
        }

        await saveSafetyAlert({
            id: isEditId || undefined,
            alertNo: alertNo,
            title: title,
            dateIssued: document.getElementById('sa-date').value,
            project: document.getElementById('sa-project').value || null,
            fileUrl: fileUrl,
            fileType: fileType,
            fileName: fileName,
            thumbnailUrl: thumbnailUrl,
            issuedBy: (existingRecord && existingRecord.issuedBy) || (state.currentUserName || state.userEmail || 'ESH')
        });
        window._safetyAlertPendingFile = null;
        document.getElementById('safety-alert-modal-overlay').remove();
        showToast(isEditId ? 'Safety Alert updated.' : 'Safety Alert published.', 'success');
    } catch(e) {
        showToast('Failed to save alert: ' + e.message, 'error');
        btn.disabled = false; btn.textContent = isEditId ? 'Save Changes' : 'Publish Alert';
    }
}
window.safetySubmitAlert = safetySubmitAlert;

// ── Add/Edit Award modal ─────────────────────────────────────────────────────
function safetyOpenAwardForm(existing) {
    if (!canManageSafety()) { showToast('Switch to Edit Mode to post a Safety Award.', 'error'); return; }
    window._safetyPhotoItems.award = (existing && Array.isArray(existing.photos))
        ? existing.photos.map(function(url, i){ return { id: 'existing_' + i, kind: 'existing', url: url }; })
        : [];
    const today = new Date().toISOString().slice(0,10);
    const isEdit = !!existing;
    const bodyOptionsList = SAFETY_AWARDING_BODIES.map(function(b) {
        return `<option value="${b}">`;
    }).join('');
    const modal = document.createElement('div');
    modal.id = 'safety-award-modal-overlay';
    window.eshMountModal(modal, {
        id: 'safety-award-modal-overlay', icon: 'fa-award', width: 520,
        title: `${isEdit ? 'Edit safety award' : 'New safety award'}`,
        body: `<div style="background:var(--bg-card);padding:18px 20px;display:flex;flex-direction:column;gap:12px;">
            <input type="hidden" id="sw-id" value="${isEdit ? existing.id : ''}">
            <div><label style="font-size:0.72rem;font-weight:700;color:var(--text-secondary);">Awardee Name / Team *</label>
                <input id="sw-name" type="text" value="${isEdit ? (existing.awardeeName||'').replace(/"/g,'&quot;') : ''}" style="width:100%;padding:8px;border:1px solid var(--border-color);border-radius:6px;box-sizing:border-box;margin-top:4px;"></div>
            <div><label style="font-size:0.72rem;font-weight:700;color:var(--text-secondary);">Award Title *</label>
                <input id="sw-title" type="text" value="${isEdit ? (existing.awardTitle||'').replace(/"/g,'&quot;') : ''}" style="width:100%;padding:8px;border:1px solid var(--border-color);border-radius:6px;box-sizing:border-box;margin-top:4px;"></div>
            <div><label style="font-size:0.72rem;font-weight:700;color:var(--text-secondary);">Awarding Body</label>
                <input id="sw-body" type="text" list="sw-body-datalist" placeholder="e.g. SOPI (Safety Organization of the Philippines, Inc.)" value="${isEdit ? (existing.awardingBody||'').replace(/"/g,'&quot;') : ''}" style="width:100%;padding:8px;border:1px solid var(--border-color);border-radius:6px;box-sizing:border-box;margin-top:4px;">
                <datalist id="sw-body-datalist">${bodyOptionsList}</datalist></div>
            <div style="display:flex;gap:10px;">
                <div style="flex:1;"><label style="font-size:0.72rem;font-weight:700;color:var(--text-secondary);">Date</label>
                    <input id="sw-date" type="date" value="${isEdit ? (existing.date||today) : today}" style="width:100%;padding:8px;border:1px solid var(--border-color);border-radius:6px;box-sizing:border-box;margin-top:4px;"></div>
                <div style="flex:1;"><label style="font-size:0.72rem;font-weight:700;color:var(--text-secondary);">Project</label>
                    <select id="sw-project" style="width:100%;padding:8px;border:1px solid var(--border-color);border-radius:6px;box-sizing:border-box;margin-top:4px;">${safetyProjectOptionsHTML(isEdit ? existing.project : '')}</select></div>
            </div>
            <div><label style="font-size:0.72rem;font-weight:700;color:var(--text-secondary);">Citation / Description</label>
                <textarea id="sw-desc" rows="3" placeholder="Why this award was given" style="width:100%;padding:8px;border:1px solid var(--border-color);border-radius:6px;box-sizing:border-box;margin-top:4px;resize:vertical;">${isEdit ? (existing.description||'') : ''}</textarea></div>
            <div><label style="font-size:0.72rem;font-weight:700;color:var(--text-secondary);">Photos (you'll be able to crop each one — first photo is the hero image)</label>
                <input id="sw-photos" type="file" accept="image/*" multiple onchange="safetyHandlePhotoSelect(this,'award')" style="width:100%;margin-top:4px;">
                <div id="sw-photo-preview" style="margin-top:6px;"></div>
                <div id="sw-upload-status" style="font-size:0.68rem;color:var(--text-secondary);margin-top:4px;"></div>
            </div>
        </div>
        `,
        foot: `<button class="mdl-btn neutral" onclick="eshCloseModal('safety-award-modal-overlay')">Cancel</button><button class="mdl-btn primary" id="sw-submit-btn" onclick="safetySubmitAward()">${isEdit ? 'Save Changes' : 'Publish Award'}</button>`
    }, '9999');
    safetyRenderPhotoPreview('award');
}
window.safetyOpenAwardForm = safetyOpenAwardForm;

function safetyEditAwardForm(id) {
    const existing = (window._safetyAwards || []).find(function(a){ return a.id === id; });
    if (existing) safetyOpenAwardForm(existing);
}
window.safetyEditAwardForm = safetyEditAwardForm;

async function safetySubmitAward() {
    const name  = document.getElementById('sw-name').value.trim();
    const title = document.getElementById('sw-title').value.trim();
    if (!name || !title) { showToast('Awardee Name and Award Title are required.', 'error'); return; }
    const btn = document.getElementById('sw-submit-btn');
    const isEditId = document.getElementById('sw-id').value;
    btn.disabled = true; btn.textContent = isEditId ? 'Saving...' : 'Publishing...';
    try {
        const photos = await safetyResolvePhotos('award', 'sw-upload-status');
        await saveSafetyAward({
            id: isEditId || undefined,
            awardeeName: name,
            awardTitle: title,
            awardingBody: document.getElementById('sw-body').value,
            date: document.getElementById('sw-date').value,
            project: document.getElementById('sw-project').value || null,
            description: document.getElementById('sw-desc').value.trim(),
            photos: photos
        });
        window._safetyPhotoItems.award = [];
        document.getElementById('safety-award-modal-overlay').remove();
        showToast(isEditId ? 'Safety Award updated.' : 'Safety Award published.', 'success');
    } catch(e) {
        showToast('Failed to save award: ' + e.message, 'error');
        btn.disabled = false; btn.textContent = isEditId ? 'Save Changes' : 'Publish Award';
    }
}
window.safetySubmitAward = safetySubmitAward;

// ── Award history modal ────────────────────────────────────────────────────
function safetyOpenAwardHistoryModal() {
    const items = window._safetyAwards || [];
    const canManage = canManageSafety();

    let rows = '';
    if (items.length === 0) {
        rows = `<div style="padding:30px;text-align:center;color:var(--text-secondary);">No records yet.</div>`;
    } else {
        rows = items.map(function(it) {
            return `<div style="padding:10px 14px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;gap:10px;">
                <div style="min-width:0;">
                    <div style="font-weight:700;font-size:0.8rem;">${(it.awardeeName||'').replace(/</g,'&lt;')} — ${(it.awardTitle||'').replace(/</g,'&lt;')}</div>
                    <div style="font-size:0.68rem;color:var(--text-secondary);">${it.date||''} · ${it.project||'Company-wide'} ${it.awardingBody ? '· ' + it.awardingBody.replace(/</g,'&lt;') : ''}</div>
                </div>
                ${canManage ? `<span style="display:flex;gap:8px;flex-shrink:0;">
                    <button class="sa-ib" onclick="safetyEditAwardForm('${it.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="sa-ib" onclick="deleteSafetyAward('${it.id}')" title="Delete" style="color:#c62828;"><i class="fas fa-trash"></i></button>
                </span>` : ''}
            </div>`;
        }).join('');
    }

    const modal = document.createElement('div');
    modal.id = 'safety-award-history-overlay';
    window.eshMountModal(modal, { id: 'safety-award-history-overlay', icon: 'fa-trophy', width: 560, title: 'Safety Award History', body: `<div>${rows}</div>` }, '9999');
}
window.safetyOpenAwardHistoryModal = safetyOpenAwardHistoryModal;

function buildIncidentRecommendationsHTML(tabType) {
    if (tabType === 'rates') return ''; // Statistics Rate YTD Summary card removed (redundant with Incident Tabulation Rate)
    // ── Compute YTD incident/rate data from all active, non-Corp/Plant projects ──
    const _selYear = state.selectedYear || new Date().getFullYear();
    const _curMonth = new Date().getFullYear() === _selYear ? Math.max(1, new Date().getMonth()) : 12; // last completed month (current month is still ongoing)
    const _moShort  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const _moFull   = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const _projs = getReportingProjects(); // same list as Total Projects card; finished/stopped kept (their YTD data still counts)

    // ── Per-month totals (indices 1-12) ──
    var _moLTA  = new Array(12).fill(0);
    var _moMed  = new Array(12).fill(0);
    var _moFA   = new Array(12).fill(0);
    var _moFat  = new Array(12).fill(0);
    var _moHIP  = new Array(12).fill(0);
    var _moDL   = new Array(12).fill(0);
    var _moMH   = new Array(12).fill(0); // manhours (for rates tab)

    _projs.forEach(function(p) {
        for (var i = 1; i <= _curMonth; i++) {
            _moLTA[i-1]  += parseFloat(p.vals['medical_LTA']?.[i])                      || 0;
            _moMed[i-1]  += parseFloat(p.vals['medical_Medical Treatment']?.[i])         || 0;
            _moFA[i-1]   += parseFloat(p.vals['medical_First Aid']?.[i])                 || 0;
            _moFat[i-1]  += parseFloat(p.vals['medical_Fatality']?.[i])                  || 0;
            _moHIP[i-1]  += parseFloat(p.vals['medical_High-Potential incident']?.[i])   || 0;
            _moDL[i-1]   += parseFloat(p.vals['medical_Days Lost/Charged']?.[i])         || 0;
            _moMH[i-1]   += parseFloat(p.vals['exposures_Total Exposed Manhour']?.[i])   || 0;
        }
    });

    // ── YTD totals ──
    var ytdLTA = 0, ytdMed = 0, ytdFA = 0, ytdFat = 0, ytdHIP = 0, ytdDL = 0, ytdMH = 0;
    for (var _mi = 0; _mi < _curMonth; _mi++) {
        ytdLTA  += _moLTA[_mi];  ytdMed += _moMed[_mi];  ytdFA  += _moFA[_mi];
        ytdFat  += _moFat[_mi];  ytdHIP += _moHIP[_mi];  ytdDL  += _moDL[_mi];
        ytdMH   += _moMH[_mi];
    }
    var ytdTotal = ytdLTA + ytdMed + ytdFA + ytdFat + ytdHIP;

    // ── Month with highest total incidents (for incident tab) ──
    var _peakVal = 0, _peakMo = -1, _valleyVal = Infinity, _valleyMo = -1;
    for (var _mi2 = 0; _mi2 < _curMonth; _mi2++) {
        var _tot = _moLTA[_mi2] + _moMed[_mi2] + _moFA[_mi2] + _moFat[_mi2] + _moHIP[_mi2];
        if (_tot > _peakVal)     { _peakVal = _tot;    _peakMo   = _mi2; }
        if (_tot < _valleyVal)   { _valleyVal = _tot;  _valleyMo = _mi2; }
    }

    // ── Trend: compare last two months with data ──
    var _trendMsg = '';
    var _trendColor = '#1b5e20';
    var _trendIcon  = 'fa-circle-check';
    if (_curMonth >= 2) {
        var _prev = _moLTA[_curMonth-2] + _moMed[_curMonth-2] + _moFA[_curMonth-2] + _moFat[_curMonth-2] + _moHIP[_curMonth-2];
        var _curr = _moLTA[_curMonth-1] + _moMed[_curMonth-1] + _moFA[_curMonth-1] + _moFat[_curMonth-1] + _moHIP[_curMonth-1];
        if (_curr === 0 && _prev === 0) {
            _trendMsg = 'Zero incidents recorded in the last two months — excellent safety performance!';
            _trendColor = '#1b5e20'; _trendIcon = 'fa-circle-check';
        } else if (_curr < _prev) {
            _trendMsg = 'Incident count is <strong>decreasing</strong> (' + _moShort[_curMonth-2] + ': ' + _prev + ' → ' + _moShort[_curMonth-1] + ': ' + _curr + '). Keep reinforcing effective controls.';
            _trendColor = '#2e7d32'; _trendIcon = 'fa-arrow-trend-down';
        } else if (_curr === _prev) {
            _trendMsg = 'Incident count is <strong>unchanged</strong> month-over-month (' + _curr + ' incidents). Review controls to drive further reduction.';
            _trendColor = '#7a5c00'; _trendIcon = 'fa-minus';
        } else {
            _trendMsg = 'Incident count is <strong>increasing</strong> (' + _moShort[_curMonth-2] + ': ' + _prev + ' → ' + _moShort[_curMonth-1] + ': ' + _curr + '). Immediately review root causes and reinforce controls.';
            _trendColor = '#c62828'; _trendIcon = 'fa-arrow-trend-up';
        }
    }

    var _rateBase = (state.ratesStandard === 'osha') ? 200000 : 1000000;
    var _rateLabel = (state.ratesStandard === 'osha') ? 'OSHA (200K hrs)' : 'OSHS (1M hrs)';
    var ytdLTIR   = ytdMH > 0 ? window.formatRate('LTIR', ytdLTA * _rateBase / ytdMH) : '—';
    var ytdTRIR   = ytdMH > 0 ? window.formatRate('TRIR', (ytdLTA + ytdMed + ytdFat) * _rateBase / ytdMH) : '—';
    var ytdSevR   = ytdMH > 0 ? window.formatRate('SEVERITY RATE', ytdDL * _rateBase / ytdMH) : '—';

    // Rates must match the Incident Tabulation Rate table exactly: take them from the same function.
    var _agg = computeAggregateTabulation();
    if (_agg.totalHours > 0) {
        var _isOsha = (state.ratesStandard === 'osha');
        ytdMH   = _agg.totalHours;
        ytdDL   = _agg.lostDays;
        ytdLTIR = _isOsha ? _agg.ltirOsha : _agg.ltirOshs;
        ytdTRIR = _isOsha ? _agg.trirOsha : _agg.trirOshs;
        ytdSevR = _isOsha ? _agg.srOsha : _agg.srOshs;
    }

    // ── Build recommendation lines ──
    var recLines = [];

    if (tabType === 'rates') {
        // Rate-focused summary: KPI tiles + status rows (Action first, OK last)
        var _T = window.STATS_TARGETS || { ltir: 0.50, trir: 1.25, sr: null };
        var _lv = parseFloat(ytdLTIR), _tv = parseFloat(ytdTRIR), _sv = parseFloat(ytdSevR);
        var _status = function(val, target) {
            if (val === 0) return 'ok';
            if (target == null) return 'na';
            if (val > target) return 'act';
            if (val > target * 0.8) return 'watch';
            return 'ok';
        };
        var _badge = { act: 'Action', watch: 'Watch', ok: 'OK', na: 'No target' };
        var _rows = [];
        var _tileSt = { ltir: 'na', trir: 'na', sr: 'na', hip: ytdHIP > 0 ? 'act' : 'ok' };

        if (ytdMH === 0) {
            _rows.push({ s: 'na', k: 'No data', t: 'No manhour data entered yet. LTIR, TRIR, and Severity Rate cannot be computed. Encode manhour exposures for all projects.' });
        } else {
            _tileSt.ltir = _status(_lv, _T.ltir);
            _tileSt.trir = _status(_tv, _T.trir);
            _tileSt.sr   = _status(_sv, _T.sr);

            if (ytdFat > 0) {
                _rows.push({ s: 'act', k: 'Fatality', v: String(ytdFat), t: 'Fatality recorded YTD. Do the mandatory investigation, report to DOLE within 24 hours, and review site safety protocols.' });
            }
            var _lt = _lv === 0 ? 'No LTA recorded YTD. Sustain hazard controls and toolbox meetings.'
                : _tileSt.ltir === 'act'   ? 'Above target. Conduct hazard analysis for LTA-prone activities.'
                : _tileSt.ltir === 'watch' ? 'Close to target. Monitor closely.'
                : 'Within target. Keep monitoring.';
            _rows.push({ s: _tileSt.ltir, k: 'LTIR', t: _lt });

            var _tt = _tv === 0 ? 'Zero recordable injuries YTD. Maintain medical surveillance and near-miss reporting.'
                : (_tileSt.trir === 'act' ? 'Above target. ' : _tileSt.trir === 'watch' ? 'Close to target. ' : 'Within target. ') + 'Check that all ' + _agg.recordableCases + ' recordable case(s) are documented and investigated.';
            _rows.push({ s: _tileSt.trir, k: 'TRIR', t: _tt });

            if (ytdHIP > 0) {
                _rows.push({ s: 'act', k: 'High-Potential', t: ytdHIP + ' incident(s). Do root cause analysis like LTAs and escalate to management.' });
            }
            if (_sv > 0) {
                _rows.push({ s: _tileSt.sr, k: 'Severity rate', t: Number(ytdDL).toLocaleString() + ' days lost/charged YTD. Focus on prompt medical management and light-duty return to work.' });
            }
        }

        var _order = { act: 0, watch: 1, na: 2, ok: 3 };
        _rows = _rows.map(function(r, i) { r.i = i; return r; })
                     .sort(function(a, b) { return (_order[a.s] - _order[b.s]) || (a.i - b.i); });

        var _listHTML = '<ul class="srs-list">' + _rows.map(function(r) {
            return '<li><span class="srs-badge srs-' + r.s + '">' + _badge[r.s] + '</span><span>' + (r.k !== 'No data' ? '<b>' + r.k + '.</b> ' : '') + r.t + '</span></li>';
        }).join('') + '</ul>';

        return '<div class="srs-card">' +
            ('<div class="srs-title">' + window.icon("idea") + ' RECOMMENDED ACTIONS</div>') +
            '<div class="srs-sub">Auto-computed from encoded manhours and incident data · ' + _agg.projectCount + ' projects (' + _agg.activeCount + ' active) · ' + _agg.throughLabel + ' · Standard: ' + _rateLabel + '</div>' +
            '<div class="srs-cols">' + _listHTML + '</div>' +
            '</div>';
    } else {
        // Incident-record focused recommendations
        if (ytdFat > 0) {
            recLines.push('<li><i class="fas fa-skull" style="color:#c62828;margin-right:4px;"></i><strong>FATALITY:</strong> ' + ytdFat + ' fatality/ies recorded YTD. Mandatory incident investigation, DOLE notification within 24 hours, and management review required.</li>');
        }
        if (ytdTotal === 0) {
            recLines.push('<li><i class="fas fa-circle-check" style="color:#1b5e20;margin-right:4px;"></i><strong>Zero incidents recorded YTD</strong> — Outstanding safety performance across all projects. Sustain through consistent toolbox meetings and hazard identification activities.</li>');
        } else {
            recLines.push('<li><strong>YTD total: ' + ytdTotal + ' incident(s)</strong> — LTA: ' + ytdLTA + ' | Medical Treatment: ' + ytdMed + ' | First Aid: ' + ytdFA + ' | High-Potential: ' + ytdHIP + '. Ensure all incidents are root-cause analyzed and corrective actions are closed out.</li>');
        }
        if (_trendMsg) {
            recLines.push('<li><i class="fas ' + _trendIcon + '" style="color:' + _trendColor + ';margin-right:4px;"></i>' + _trendMsg + '</li>');
        }
        if (_peakMo >= 0 && _peakVal > 0) {
            recLines.push('<li><i class="fas fa-calendar-xmark" style="color:#c62828;margin-right:4px;"></i><strong>' + _moShort[_peakMo] + '</strong> had the highest incident count (' + _peakVal + '). Investigate contributing factors and ensure preventive measures are in place for similar periods.</li>');
        }
        if (ytdHIP > 0) {
            recLines.push('<li><i class="fas fa-radiation" style="color:#7a5c00;margin-right:4px;"></i><strong>' + ytdHIP + ' High-Potential Incident(s)</strong> recorded — these are near-fatalities. Conduct thorough investigation and share learnings company-wide.</li>');
        }
        if (ytdLTA === 0 && ytdTotal > 0) {
            recLines.push('<li><i class="fas fa-shield-halved" style="color:#2e7d32;margin-right:4px;"></i><strong>No Lost Time Accidents recorded YTD</strong> — Incidents are being managed below LTA level. Continue medical surveillance and ensure first aid cases are not escalating.</li>');
        }
    }

    var recsHtml = recLines.length
        ? '<ul class="ytd-list">' + recLines.join('').replace(/<i class="fas [^"]*"[^>]*><\/i>/g, '') + '</ul>'
        : '<p class="ytd-empty">No data available yet to generate recommendations.</p>';

    // ── KPI summary chips (always shown) ──
    var _chipsHTML = '';
    if (tabType === 'rates') {
        _chipsHTML =
            '<span style="background:#e8f5e9;color:#1b5e20;font-size:0.58rem;font-weight:700;padding:3px 9px;border-radius:20px;border:1px solid #a5d6a7;white-space:nowrap;">LTIR: ' + ytdLTIR + '</span>' +
            '<span style="background:#e3f2fd;color:#1565c0;font-size:0.58rem;font-weight:700;padding:3px 9px;border-radius:20px;border:1px solid #90caf9;white-space:nowrap;">TRIR: ' + ytdTRIR + '</span>' +
            '<span style="background:#ffebee;color:#c62828;font-size:0.58rem;font-weight:700;padding:3px 9px;border-radius:20px;border:1px solid #ef9a9a;white-space:nowrap;">SEV RATE: ' + ytdSevR + '</span>' +
            '<span style="background:#fff8e1;color:#7a5c00;font-size:0.58rem;font-weight:600;padding:3px 9px;border-radius:20px;border:1px solid #ffe082;white-space:nowrap;">' + _rateLabel + '</span>';
    }
    // Accident/Incident Record: no number row here. The counts are the cards in ACCIDENT/INCIDENT TRENDS (buildTrendChartHTML).

    var _tabTitle   = tabType === 'rates' ? 'STATISTICS RATE — YTD SUMMARY' : 'ACCIDENT/INCIDENT RECORD — YTD SUMMARY';
    var _tabSubtitle = tabType === 'rates'
        ? 'Auto-computed rates based on encoded manhours and incident data from all active projects · Standard: ' + _rateLabel
        : 'Consolidated incident counts from January to ' + _moFull[_curMonth - 1] + ' ' + _selYear + ' across all active projects';

    return '<div class="ytd-card">' +
        '<div class="ytd-head">' +
        '<div class="ytd-title">' + _tabTitle + '</div>' +
        '<div class="ytd-sub">' + _tabSubtitle + '</div>' +
        '</div>' +
        (_chipsHTML ? '<div class="ytd-stats">' + _chipsHTML + '</div>' : '') +
        '<div class="ytd-recs">' +
        '<div class="ytd-recs-title">Recommendations</div>' +
        recsHtml +
        '</div>' +
        '</div>';
}

function buildTrendChartHTML(tabType) {
    const title = tabType === 'rates' ? 'STATISTICS RATE TRENDS' : 'ACCIDENT/INCIDENT TRENDS';
    const persistentId = `trend-chart-persistent-${tabType}`;

    const _miniCard = (key, label) => `<div style="border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:12px;padding:12px 14px;background:var(--bg-card);">
        <div style="font-size:0.72rem;font-weight:700;color:var(--text-secondary);">${label}</div>
        <div id="rateMiniVal_${key}" style="font-size:1.6rem;font-weight:800;line-height:1.2;margin:2px 0;color:var(--text-primary);">–</div>
        <div id="rateMiniSub_${key}" style="font-size:0.72rem;font-weight:700;min-height:20px;color:var(--text-secondary);"></div>
        <div style="position:relative;height:140px;margin-top:6px;"><canvas id="trendChart_rates_${key}"></canvas></div></div>`;
    const _incKpi = (key, label) => `<div style="border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:12px;padding:10px 12px;background:var(--bg-card);">
        <div style="font-size:0.74rem;color:var(--text-secondary);">${label} (YTD)</div>
        <div id="incKpi_${key}" style="font-size:1.5rem;font-weight:700;color:var(--text-primary);">0</div></div>`;
    const _incidentLayout = '<div class="inc-kpis">' + _incKpi('fat','Fatality') + _incKpi('lta','LTA') + _incKpi('hp','High-Potential') + _incKpi('mt','Medical Treatment') + _incKpi('fa','First Aid') + _incKpi('nm','Near-miss') + '</div>'
        + '<div class="inc-split">'
        + '<div><p style="font-size:0.8rem;font-weight:700;margin:0 0 6px;color:var(--text-primary);">Injuries and incidents</p><div style="position:relative;height:280px;"><canvas id="trendChart_medical_inj"></canvas></div></div>'
        + '<div><p style="font-size:0.8rem;font-weight:700;margin:0 0 6px;color:var(--text-primary);">Near-miss reports</p><div style="position:relative;height:280px;"><canvas id="trendChart_medical_nm"></canvas></div></div>'
        + '</div>';
    const persistentEl = document.getElementById(persistentId);
    if (persistentEl && !persistentEl.dataset.initialized) {
        persistentEl.dataset.initialized = 'true';
        persistentEl.innerHTML = `
      <div style="background: var(--bg-card); border-radius: ${tabType === 'rates' ? '12px 12px 0 0' : '12px'}; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border:none; margin-bottom: ${tabType === 'rates' ? '0' : '16px'};">
        <div class="sec-head">
          <div class="sec-head-title">${title}</div>
          <div class="sec-head-badges">
              <select id="trendProjectFilter_${tabType}" onchange="updateTrendChart('${tabType}')"
                      style="padding: 3px 24px 3px 10px; border-radius: 6px; border: none; font-size: 0.7rem; font-weight: 600; background: white; color: #1f5b3a; cursor: pointer; width: 200px;">
                <option value="all">All Projects</option>
              </select>
          </div>
        </div>
        <div style="padding: 14px 16px;">
          ${tabType === 'rates'
            ? '<div class="rate-mini-grid">' + _miniCard('ltir','LTIR · target 0.50') + _miniCard('trir','TRIR · target 1.25') + _miniCard('sev','SEVERITY RATE · no target') + '</div>'
            : tabType === 'medical' ? _incidentLayout
            : '<canvas id="trendChart_' + tabType + '" style="max-height: 400px;width:100%;"></canvas>'}
        </div>
      </div>`;
    }

    document.getElementById('trend-chart-persistent-rates').style.display  = tabType === 'rates'   ? 'block' : 'none';
    document.getElementById('trend-chart-persistent-medical').style.display = tabType === 'medical' ? 'block' : 'none';

    return `<div id="trend-chart-anchor-${tabType}" style="display:none;"></div>`;
}

// STATISTICS RATE TRENDS: first-draw animation state per small chart. Once done it never plays again
// (not on hover, filter change, or re-render).
const _rateIntro = {};

// First draw only: the line is revealed left to right and the big number counts up.
// It starts when the chart scrolls into view. Skipped when the device uses reduced motion.
function _rateMiniIntro(key, inst, st, host, fmt) {
    if (st.started) return;
    st.started = true;
    const gen = st.gen = (st.gen || 0) + 1; // a reset starts a new run, so older timers stop
    const dur = 1200;
    const finish = () => {
        if (st.done || st.gen !== gen) return;
        st.done = true; st.p = 1;
        inst.options.animation = { duration: 1000 };
        const el = document.getElementById('rateMiniVal_' + key);
        if (el) el.textContent = st.target === null ? '\u2013' : fmt(st.target);
        if (inst.canvas && inst.canvas.isConnected) inst.draw();
    };
    const run = () => {
        let t0 = null, lastDraw = 0;
        const step = ts => {
            if (st.done || st.gen !== gen) return;
            if (!inst.canvas || !inst.canvas.isConnected) return;
            if (t0 === null) t0 = ts;
            const p = Math.min((ts - t0) / dur, 1), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            if (p < 1 && lastDraw && ts - lastDraw < 33) { requestAnimationFrame(step); return; } // max ~30 redraws/sec; the last frame (p = 1) always draws
            lastDraw = ts;
            st.p = e;
            const el = document.getElementById('rateMiniVal_' + key);
            if (el && st.target !== null) el.textContent = fmt(st.target * e, st.target);
            inst.draw();
            if (p < 1) requestAnimationFrame(step); else finish();
        };
        requestAnimationFrame(step);
        setTimeout(finish, dur + 800); // safety if the tab was in the background
    };
    if ('IntersectionObserver' in window && host) {
        const io = new IntersectionObserver(es => {
            if (es.some(e => e.isIntersecting)) { io.disconnect(); run(); }
        }, { threshold: 0.4 });
        io.observe(host);
    } else run();
}

// Called by render() when another tab is shown, so the Statistics Rate animation plays again on return.
window.rateMiniIntroReset = function () {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window._rateNumIntro = null; // numbers panel: plays again the next time it is built
    ['ltir', 'trir', 'sev'].forEach(key => {
        const st = _rateIntro[key], inst = trendChartInstances['rates_' + key];
        if (!st || !inst) return;
        st.done = false; st.started = false; st.p = 0; st.gen = (st.gen || 0) + 1;
        inst.options.animation = { duration: 0 };
        const el = document.getElementById('rateMiniVal_' + key);
        if (el && st.target !== null && st.target !== undefined) {
            el.textContent = (0).toLocaleString(undefined, st.target >= 100 ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (inst.canvas && inst.canvas.isConnected) inst.draw();
    });
};

// STATISTICS RATE TRENDS: one small chart per rate (own scale + target)
function _renderRatesMini(datasets) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dark = !!(state && state.darkMode);
    const gridC = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const tickC = dark ? '#9aa8a0' : '#000';
    const defs = [
        { key: 'ltir', ds: 0, color: '#1b5e20', target: 0.50 },
        { key: 'trir', ds: 1, color: '#1565c0', target: 1.25 },
        { key: 'sev',  ds: 2, color: '#b71c1c', target: null }
    ];
    const fmt = (v, ref) => (v === null || v === undefined) ? '–' : Number(v).toLocaleString(undefined, (ref === undefined ? v : ref) >= 100 ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    defs.forEach(d => {
        const data = datasets[d.ds].data;
        let last = -1, peak = -1;
        data.forEach((v, i) => { if (v !== null) { last = i; if (peak < 0 || v > data[peak]) peak = i; } });

        const valEl = document.getElementById('rateMiniVal_' + d.key);
        const subEl = document.getElementById('rateMiniSub_' + d.key);
        const st = _rateIntro[d.key] || (_rateIntro[d.key] = { done: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches), started: false, p: 0 });
        st.target = last < 0 ? null : data[last];
        if (valEl) valEl.textContent = last < 0 ? '–' : (st.done ? fmt(data[last]) : fmt(data[last] * st.p, data[last]));
        if (subEl) {
            if (last < 0) subEl.textContent = 'No data';
            else if (d.target === null) subEl.textContent = 'Peak: ' + fmt(data[peak]) + ' in ' + months[peak] + ' · latest: ' + months[last];
            else {
                const ok = data[last] <= d.target;
                subEl.innerHTML = '<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:' + (ok ? '#dcf5d0' : '#fde0e0') + ';color:' + (ok ? '#14532d' : '#8c1414') + ';">' + (ok ? 'Within target' : 'Over target') + '</span> <span style="font-weight:600;">as of ' + months[last] + '</span>';
            }
        }

        const tgtData = d.target === null ? null : new Array(12).fill(d.target);
        const inst = trendChartInstances['rates_' + d.key];
        const cv0 = inst && inst.canvas;
        if (inst) {
            inst.data.datasets[0].data = data;
            if (tgtData) inst.data.datasets[1].data = tgtData;
            inst.options.scales.y.grid.color = gridC;
            inst.options.scales.y.ticks.color = tickC;
            inst.options.scales.x.ticks.color = tickC;
            inst.update();
            if (!st.done) _rateMiniIntro(d.key, inst, st, cv0 ? cv0.parentNode : null, fmt);
            return;
        }
        const cv = document.getElementById('trendChart_rates_' + d.key);
        if (!cv) return;
        const ds = [{ label: d.key === 'sev' ? 'Severity rate' : d.key.toUpperCase(), data: data, borderColor: d.color, backgroundColor: d.color + '22', fill: true, borderWidth: 2.5, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: d.color, spanGaps: false }];
        if (tgtData) ds.push({ label: 'Target (' + d.target.toFixed(2) + ')', data: tgtData, borderColor: '#9aa8a0', borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, fill: false });
        const created = trendChartInstances['rates_' + d.key] = new Chart(cv.getContext('2d'), {
            type: 'line',
            data: { labels: months, datasets: ds },
            plugins: [{
                id: 'rateWipe',
                beforeDatasetsDraw(c) {
                    if (st.done) return;
                    const a = c.chartArea, x = c.ctx;
                    x.save(); x.beginPath();
                    x.rect(a.left - 8, 0, (a.width + 16) * st.p, c.height);
                    x.clip(); st.clipped = true;
                },
                afterDatasetsDraw(c) {
                    if (st.clipped) { c.ctx.restore(); st.clipped = false; }
                }
            }],
            options: {
                animation: st.done ? {} : { duration: 0 },
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: false }, tooltip: window.eshChartTip() },
                scales: {
                    x: { grid: { display: false }, border: { display: false }, ticks: { color: tickC, maxTicksLimit: 6, font: { size: 10 } } },
                    y: { beginAtZero: true, suggestedMax: d.target === null ? undefined : d.target * 1.2, border: { display: false }, grid: { color: gridC }, ticks: { color: tickC, maxTicksLimit: 4, font: { size: 10 } } }
                }
            }
        });
        if (!st.done) _rateMiniIntro(d.key, created, st, cv.parentNode, fmt);
    });
}

// ACCIDENT/INCIDENT TRENDS: YTD totals + stacked bars (injuries) + separate near-miss chart
function _renderIncidentSplit(datasets) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dark = !!(state && state.darkMode);
    const gridC = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const tickC = dark ? '#9aa8a0' : '#5d6b63';
    const byName = {};
    datasets.forEach(d => { byName[d.label] = d.data; });
    const zeros = () => new Array(12).fill(0);
    const sum = a => (a || []).reduce((x, y) => x + y, 0);
    const order = [
        { n: 'First Aid', c: '#8bd17c' }, { n: 'Medical Treatment', c: '#f2c94c' }, { n: 'LTA', c: '#f2994a' },
        { n: 'Dangerous Occurrences', c: '#e0613a' }, { n: 'High-Potential incident', c: '#d64545' }, { n: 'Fatality', c: '#7f1d1d' }
    ];
    const nmData = byName['No. of Identified Near-Miss'] || zeros();

    const setK = (key, val, color) => {
        const el = document.getElementById('incKpi_' + key);
        if (el) { el.textContent = val; el.style.color = color || ''; }
    };
    const fat = sum(byName['Fatality']);
    setK('fat', fat, fat ? '#b71c1c' : '#15803d');
    setK('lta', sum(byName['LTA']));
    setK('hp', sum(byName['High-Potential incident']));
    setK('mt', sum(byName['Medical Treatment']));
    setK('fa', sum(byName['First Aid']));
    setK('nm', sum(nmData));

    const applyTheme = ch => {
        ['x', 'y'].forEach(k => { ch.options.scales[k].ticks.color = tickC; });
        ch.options.scales.y.grid.color = gridC;
        if (ch.options.plugins.legend.labels) ch.options.plugins.legend.labels.color = tickC;
    };

    // Injuries: stacked bars
    const stackDs = order.map(o => ({ label: o.n, data: byName[o.n] || zeros(), backgroundColor: o.c, borderRadius: 4, borderSkipped: false, maxBarThickness: 30 }));
    const inj = trendChartInstances['medical_inj'];
    if (inj) {
        stackDs.forEach((d, i) => { inj.data.datasets[i].data = d.data; });
        applyTheme(inj);
        inj.update();
    } else {
        const cv = document.getElementById('trendChart_medical_inj');
        if (cv) {
            trendChartInstances['medical_inj'] = new Chart(cv.getContext('2d'), {
                type: 'bar',
                data: { labels: months, datasets: stackDs },
                options: {
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, color: tickC, font: { size: 11 } } },
                        tooltip: window.eshChartTip()
                    },
                    scales: {
                        x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: tickC } },
                        y: { stacked: true, beginAtZero: true, grid: { color: gridC }, border: { display: false }, ticks: { color: tickC, precision: 0 } }
                    }
                }
            });
        }
    }

    // Near-miss: own chart
    const nm = trendChartInstances['medical_nm'];
    if (nm) {
        nm.data.datasets[0].data = nmData;
        applyTheme(nm);
        nm.update();
    } else {
        const cv2 = document.getElementById('trendChart_medical_nm');
        if (cv2) {
            trendChartInstances['medical_nm'] = new Chart(cv2.getContext('2d'), {
                type: 'line',
                data: { labels: months, datasets: [{ label: 'Near-miss', data: nmData, borderColor: '#7e57c2', backgroundColor: '#7e57c222', fill: true, borderWidth: 2.5, cubicInterpolationMode: 'monotone', pointRadius: 0, pointHoverRadius: 5 }] },
                options: {
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { display: false }, tooltip: window.eshChartTip() },
                    scales: {
                        x: { grid: { display: false }, border: { display: false }, ticks: { color: tickC, maxTicksLimit: 6 } },
                        y: { beginAtZero: true, grid: { color: gridC }, border: { display: false }, ticks: { color: tickC, precision: 0 } }
                    }
                }
            });
        }
    }
}

function populateProjectFilter(tabType) {
    const suffix = tabType || '';
    const ids = suffix ? [`trendProjectFilter_${suffix}`] : ['trendProjectFilter_rates', 'trendProjectFilter_medical'];
    const regionOrder = ['CORPORATE', 'PLANT OPERATIONS', 'NCR', 'SOUTH LUZON', 'NORTH LUZON', 'VISAYAS & MINDANAO'];
    ids.forEach(id => {
        const projectFilter = document.getElementById(id);
        if (!projectFilter) return;
        let projects = state.projects;

        // Exclude PLANT OPERATIONS for rates, medical, audit, cshp, reg tabs
        if (suffix && ['rates', 'medical', 'audit', 'cshp', 'reg'].includes(suffix)) {
            projects = projects.filter(p => p.region !== 'PLANT OPERATIONS');
        }
        // Also exclude CORPORATE for audit, cshp, reg tabs
        if (suffix && ['audit', 'cshp', 'reg'].includes(suffix)) {
            projects = projects.filter(p => p.region !== 'CORPORATE');
        }

        // Group per region (optgroup), projects sorted by name inside each group
        const extraRegions = [...new Set(projects.map(p => p.region))].filter(r => !regionOrder.includes(r));
        projectFilter.innerHTML = '<option value="all">All Projects</option>';
        regionOrder.concat(extraRegions).forEach(reg => {
            const regProjects = projects.filter(p => p.region === reg).sort((a, b) => a.name.localeCompare(b.name));
            if (regProjects.length === 0) return;
            const group = document.createElement('optgroup');
            group.label = reg;
            regProjects.forEach(p => {
                const option = document.createElement('option');
                option.value = p.name;
                option.textContent = p.name;
                group.appendChild(option);
            });
            projectFilter.appendChild(group);
        });
    });
}

const trendChartInstances = {};
let _trendChartDebounce = null;

function updateTrendChart(tabType) {
    clearTimeout(_trendChartDebounce);
    _trendChartDebounce = setTimeout(() => _doUpdateTrendChart(tabType), 80);
}

function _doUpdateTrendChart(tabType) {
    const projectFilter = document.getElementById(`trendProjectFilter_${tabType}`)?.value || 'all';
    const chartId = `trendChart_${tabType}`;
    const canvas = document.getElementById(chartId) || (tabType === 'rates' ? document.getElementById('trendChart_rates_ltir') : tabType === 'medical' ? document.getElementById('trendChart_medical_inj') : null);
    
    if (!canvas) return;
    
    const _existingChart = trendChartInstances[tabType] || null;
    
    let filteredProjects = state.projects;
    
    // Exclude PLANT OPERATIONS for rates, medical, audit, cshp, reg tabs
    if (['rates', 'medical', 'audit', 'cshp', 'reg'].includes(tabType)) {
        filteredProjects = filteredProjects.filter(p => p.region !== 'PLANT OPERATIONS');
    }
    // Also exclude CORPORATE for audit, cshp, reg tabs
    if (['audit', 'cshp', 'reg'].includes(tabType)) {
        filteredProjects = filteredProjects.filter(p => p.region !== 'CORPORATE');
    }
    
    if (projectFilter !== 'all') {
        filteredProjects = filteredProjects.filter(p => p.name === projectFilter);
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const datasets = [];
    
    if (tabType === 'rates') {
        const _cs = window.buildCumulativeSeries(filteredProjects, 12);
        const rateTypes = ['LTIR', 'TRIR', 'SEVERITY RATE'];
        const colors = ['#1b5e20', '#1565c0', '#b71c1c'];

        rateTypes.forEach((rateType, idx) => {
            const data = new Array(12).fill(null);

            for (let i = 1; i <= 12; i++) {
                if (i <= _cs.last) {
                    const _r = window.calcCumRate(rateType, _cs.lta[i], _cs.rec[i], _cs.dl[i], _cs.mh[i]);
                    if (_r !== null) data[i-1] = parseFloat(window.formatRate(rateType, _r));
                }
            }

            datasets.push({
                label: rateType,
                data: data,
                borderColor: colors[idx],
                backgroundColor: colors[idx] + '20',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                spanGaps: false
            });
        });
        
        datasets.push({
            label: 'LTIR Target (0.50)',
            data: new Array(12).fill(0.50),
            borderColor: '#1b5e20',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            pointRadius: 0,
            fill: false,
            tension: 0
        });
        datasets.push({
            label: 'TRIR Target (1.25)',
            data: new Array(12).fill(1.25),
            borderColor: '#1565c0',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            pointRadius: 0,
            fill: false,
            tension: 0
        });
        datasets.push({
            label: 'Fatality Target (0)',
            data: new Array(12).fill(0),
            borderColor: '#e65100',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0
        });
        
        _renderRatesMini(datasets);
        return;

    } else if (tabType === 'medical') {
        const incidentTypes = ['Medical Treatment', 'First Aid', 'LTA', 'Fatality', 'High-Potential incident', 'Dangerous Occurrences', 'No. of Identified Near-Miss'];
        const colors = ['#1b5e20', '#2e7d32', '#1565c0', '#b71c1c', '#e65100', '#f57c00', '#6a1b9a'];
        
        incidentTypes.forEach((incidentType, idx) => {
            const data = new Array(12).fill(0);
            
            filteredProjects.forEach(p => {
                const key = `medical_${incidentType}`;
                if (p.vals && p.vals[key]) {
                    for (let i = 1; i <= 12; i++) {
                        const val = parseFloat(p.vals[key][i]) || 0;
                        data[i-1] += val;
                    }
                }
            });
            
            datasets.push({
                label: incidentType,
                data: data,
                borderColor: colors[idx],
                backgroundColor: colors[idx] + '20',
                tension: 0.4,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6
            });
        });
        _renderIncidentSplit(datasets);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    const datasetsWithGradients = datasets.map(ds => {
        // Target/dashed lines: keep them as-is (no gradient fill, no points)
        if (ds.borderDash || ds.pointRadius === 0) {
            return { ...ds, borderWidth: ds.borderWidth || 2 };
        }
        // Data lines: apply gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, ds.borderColor + '40');
        gradient.addColorStop(1, ds.borderColor + '00');
        return {
            label: ds.label,
            data: ds.data,
            borderColor: ds.borderColor,
            backgroundColor: gradient,
            borderWidth: 2,
            pointRadius: 5,
            pointBackgroundColor: ds.borderColor,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            tension: 0.4,
            fill: true
        };
    });
    
    // --- Smooth animated update (no destroy/recreate) ---
    if (_existingChart) {
        // Update each dataset's data in place so Chart.js can animate the transition
        datasetsWithGradients.forEach((ds, i) => {
            if (_existingChart.data.datasets[i]) {
                _existingChart.data.datasets[i].data = ds.data;
                _existingChart.data.datasets[i].backgroundColor = ds.backgroundColor;
            } else {
                _existingChart.data.datasets.push(ds);
            }
        });
        // Remove any extra datasets if new data has fewer series
        _existingChart.data.datasets.splice(datasetsWithGradients.length);
        _existingChart.update({
            duration: 600,
            easing: 'easeInOutQuart'
        });
        return;
    }

    trendChartInstances[tabType] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: datasetsWithGradients
        },
        options: {
            animation: {
                duration: 800,
                easing: 'easeInOutQuart'
            },
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                            size: 11,
                            weight: 600
                        },
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#333'
                    }
                },
                tooltip: window.eshChartTip({
                    mode: 'index',
                    intersect: false,
                    padding: 12,
                    titleFont: { size: 13, weight: '500' },
                    bodyFont: { size: 12, weight: '500' }
                })
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: function () { return document.body.classList.contains('dark-mode') ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'; }
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#666'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#666'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}  // end _doUpdateTrendChart

function saveUserDataLocal(email) {
    if (!email) return;
    
    const year = state.selectedYear || 2026;
    const userData = {
        year: year,
        projects: state.projects.map(p => { const c = {...p}; delete c.selected; return c; }),
        personnelData: state.personnelData,
        incidentRateData: state.incidentRateData,
        darkMode: state.darkMode,
        lastSaved: new Date().toISOString(),
        timestamp: Date.now(),
        lastModified: new Date().toISOString()
    };
    
    localStorage.setItem(`esh_dashboard_${year}_${email}`, JSON.stringify(userData));
}

let firebaseReady = false;

function getCurrentUserId() {
    return window.firebaseAuth?.currentUser?.uid || 'local-user';
}

function getDataSourceUserId() {
    const ADMIN_UID = 'fUnXsvKnRYMpuySRbeVYJk7TO452';
    return ADMIN_UID;
}

function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.firebase && window.firebaseDb && window.firebaseAuth) {
            firebaseReady = true;
            if (window.ESHDataSync) window.ESHDataSync.init();
            resolve();
            return;
        }
        const checkInterval = setInterval(() => {
            if (window.firebase && window.firebaseDb && window.firebaseAuth) {
                clearInterval(checkInterval);
                clearTimeout(timeoutId);
                firebaseReady = true;
                if (window.ESHDataSync) window.ESHDataSync.init();
                resolve();
            }
        }, 100);
        const timeoutId = setTimeout(() => {
            clearInterval(checkInterval);
            firebaseReady = false;
            resolve();
        }, 15000);
    });
}

async function saveToFirebaseWithRetry(maxRetries = 2, delayMs = 3000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (!firebaseReady || !window.firebaseDb || !state.currentUser) {
            await new Promise(r => setTimeout(r, 1500));
        }
        try {
            const cu = window.firebaseAuth?.currentUser;
            if (cu) await cu.getIdToken(true);
        } catch(e) {  }

        window._isSaving = false;

        window._isSavingEcho = true;

        const success = await saveToFirebase();
        if (success) return true;
        if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    setTimeout(() => { window._isSavingEcho = false; }, 2000);
    return false;
}
