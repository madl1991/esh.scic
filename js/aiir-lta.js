
        function parseAiirDocument(html, plainText) {
            let T, caRows = [], fuCols = [{}, {}, {}], fuMeta = { reason: '', car: '' };
            if (html) {
                const doc = new DOMParser().parseFromString(
                    html.replace(/<\/(td|th|p|li|tr|h\d)>/gi, '$&\n').replace(/<br\s*\/?>/gi, '\n'), 'text/html');
                T = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
                // Corrective action table
                const d2 = new DOMParser().parseFromString(html, 'text/html');
                d2.querySelectorAll('table').forEach(tb => {
                    const rows = Array.from(tb.querySelectorAll('tr'));
                    if (!rows.length) return;
                    const head = (rows[0].textContent || '').toUpperCase();
                    if (head.includes('1ST') && head.includes('2ND') && head.includes('3RD') && head.includes('FOLLOW')) {
                        // Monitoring & Follow-up table — copy only what is actually filled in the AIIR
                        const blank = v => /^[\s_\-–.:]*$/.test(v || '');
                        const txt = td => (td ? (td.textContent || '').replace(/\s+/g, ' ').trim() : '');
                        rows.slice(1).forEach(tr => {
                            const c = Array.from(tr.children).map(txt);
                            const label = c[0] || '';
                            if (/reason for ineffectiveness/i.test(label)) {
                                const reason = label.replace(/reason for ineffectiveness( during verification)?/i, '').replace(/[_\s:]+$/g, '').trim();
                                if (reason && !blank(reason)) fuMeta.reason = reason;
                                const carIdx = c.findIndex(x => /CAR\s*No/i.test(x));
                                const carVal = carIdx >= 0 ? (c[carIdx].replace(/.*CAR\s*No\.?\s*:?\s*/i, '') || c[carIdx + 1] || '') : '';
                                if (carVal && !blank(carVal)) fuMeta.car = carVal;
                                return;
                            }
                            let key = '', resVal = '';
                            if (/date of follow-?up/i.test(label)) key = 'date';
                            else if (/follow-?up by/i.test(label)) key = 'by';
                            else if (/ineffective/i.test(label)) { key = 'result'; resVal = LTA_FOLLOWUP_RESULTS[2]; }
                            else if (/continuous monitoring/i.test(label)) { key = 'result'; resVal = LTA_FOLLOWUP_RESULTS[1]; }
                            else if (/effective corrective action|for close-?out/i.test(label)) { key = 'result'; resVal = LTA_FOLLOWUP_RESULTS[0]; }
                            if (!key) return;
                            for (let k = 0; k < 3; k++) {
                                const v = c[k + 1];
                                if (v === undefined || blank(v)) continue;
                                if (key === 'result') { if (!fuCols[k].result) fuCols[k].result = resVal; }
                                else if (key === 'by') fuCols[k].by = v;
                                else { const d = _aiirParseDate(v); if (d) fuCols[k][key] = d; }
                            }
                        });
                    } else if (head.includes('CORRECTIVE ACTION') && head.includes('RESPONSIBLE') && head.includes('TIMELINE')) {
                        rows.slice(1).forEach(tr => {
                            // join the paragraphs inside a cell with a space so words do not stick together
                            const cellTxt = td => { const t = d2.createElement('div'); t.innerHTML = td.innerHTML.replace(/<\/p>|<br\s*\/?>/gi, ' '); return (t.textContent || '').replace(/\s+/g, ' ').trim(); };
                            const c = Array.from(tr.children).map(cellTxt);
                            if (c.length >= 3 && c[0] && !/approved by/i.test(c[0])) caRows.push({ action: c[0], responsible: c[1], timeline: c[2] });
                        });
                    }
                });
            } else {
                T = (plainText || '').replace(/\s+/g, ' ').trim();
            }

            const r = {};
            const found = [];
            const set = (k, v) => { if (v !== '' && v != null && !(Array.isArray(v) && !v.length)) { r[k] = v; found.push(k); } };

            const aiir = T.match(/\bAIIR[\s\-–]*(?:[A-Z]{2,}[\s\-–]*)*\d{4}[\s\-–]*\d+\b/i);
            if (aiir) set('aiirNo', aiir[0].replace(/\s*[\-–]\s*/g, '-').replace(/\s+/g, '').toUpperCase());

            set('dateReported', _aiirParseDate(_aiirGrab(T, /Reported Date\s*:/i, [/Acc\w*\s*\/?\s*Inc\w*\s*Report/i, /Name of Project/i])));
            const dtAcc = _aiirGrab(T, /Date and Time when the Accident\s*\/?\s*Incident happened\s*:/i, [/Equipment\s*\/\s*Machinery/i, /Exact Location/i]);
            set('dateOfAccident', _aiirParseDate(dtAcc));

            const name = _aiirGrab(T, /Employee'?s?’?s? Name\s*:/i, [/Employee No/i, /Age\s*:/i]);
            const age = (_aiirGrab(T, /\bAge\s*:/i, [/Sex/i, /Civil/i]).match(/\d{1,3}/) || [''])[0];
            if (name) set('injuredPersonName', age ? `${name}, ${age}` : name);
            set('occupation', _aiirGrab(T, /Position\s*\/\s*Function\s*:/i, [/Month\/?s? with the Company/i, /Date of Employee/i]));
            set('locationOfIncident', _aiirGrab(T, /Exact Location of the Accident\s*\/?\s*Incident\s*:/i, [/Witnesses or Others/i]));

            const equip = _aiirGrab(T, /Equipment\s*\/\s*Machinery\s*\/\s*Tools\s+Involved[^:]*:/i, [/Exact Location/i]);
            const detailsRaw = _aiirGrab(T, /Detailed Description of Accident\s*\/?\s*Incident\s*\([^)]*\)\s*:?/i, [/Related Facts/i]);
            set('detailsFacts', detailsRaw);
            set('rootCause', _aiirGrab(T, /FINAL ROOT CAUSE/i, [/Does this incident/i]));
            const natInj = _aiirGrab(T, /Nature of Injury or Illness\s*:/i, [/Medical Findings/i]);
            const findings = _aiirGrab(T, /Medical Findings[^:]*:/i, [/Attended by/i, /Treatment Given/i]);

            // Classification checkboxes
            const clsSec = _aiirGrab(T, /ESH ACCIDENT\s*\/\s*INCIDENT CLASSIFICATIONS?/i, [/ENVIRONMENTAL ACCIDENT/i, /Note\s*:/i]);
            const checked = [];
            const MAP = [[/Fatality/i,'Fatality'],[/Lost Time/i,'LTA'],[/Medical Treatment/i,'Medical Treatment'],
                         [/Dangerous Occurrence/i,'Dangerous Occurrence'],[/First Aid/i,'First Aid'],[/Near[\s\-]*Miss/i,'Near Miss']];
            const cre = /\(\s*([✓✔☑xX])\s*\)\s*([A-Za-z][A-Za-z\s\-]*?)(?=\s*\(|$)/g;
            let cm;
            while ((cm = cre.exec(clsSec))) MAP.forEach(([re, v]) => { if (re.test(cm[2]) && !checked.includes(v)) checked.push(v); });
            const PRI = ['Fatality','LTA','Medical Treatment','Dangerous Occurrence','First Aid','Near Miss'];
            const cls = PRI.find(p => checked.includes(p));
            if (cls) set('incidentClassification', cls);

            // Keyword-matched dropdown values (best guess — user reviews)
            const injText = `${natInj} ${findings}`;
            const allText = `${detailsRaw} ${injText} ${equip}`;

            set('natureOfInjury', _aiirPick(LTA_NATURE_OF_INJURY, injText, [
                [/amputat/i,'Amputation'],[/fractur|broken bone/i,'Bone Fracture'],[/avulsion/i,'Avulsion'],
                [/crush/i,'Crush Injury'],[/lacerat|\bcut\b/i,'Cut / Lacerated Wound'],[/puncture/i,'Nail Puncture / Punctured Wound'],
                [/\bburn/i,'Burn'],[/contusion|bruis/i,'Contusion / Bruise'],[/abrasion/i,'Abrasion'],
                [/dislocat/i,'Dislocation'],[/sprain/i,'Sprain'],[/strain|spasm/i,'Muscle Spasm / Strain'],
                [/swelling|hematoma/i,'Swelling / Hematoma'],[/open wound/i,'Open Wound'],[/head (injury|trauma)/i,'Head Injury / Head Trauma'],
                [/eye injur/i,'Eye Injury / Strain'],[/snake/i,'Snake Bite'],[/insect|bee sting/i,'Bee Sting / Insect Bite']]));

            const bp = [];
            const addBp = v => { if (LTA_BODY_PARTS.includes(v) && !bp.includes(v)) bp.push(v); };
            const sided = [['hand','Hand'],['wrist','Wrist'],['forearm','Forearm'],['elbow','Elbow'],['arm','Arm'],['shoulder','Shoulder'],
                           ['thumb','Thumb'],['finger','Finger/s'],['leg','Leg'],['knee','Knee'],['ankle','Ankle'],['foot','Foot'],['toe','Toe/s'],['thigh','Thigh']];
            sided.forEach(([w, label]) => {
                const re = new RegExp(`\\b(left|right)[\\s\\-]+(?:\\w+\\s+)?${w}s?\\b|\\b${w}s?\\s*\\(?(left|right)\\)?`, 'ig');
                let m;
                while ((m = re.exec(injText))) addBp(`${label} (${((m[1] || m[2]).toLowerCase() === 'left') ? 'Left' : 'Right'})`);
            });
            [[/\bhead\b/i,'Head'],[/\bface\b/i,'Face'],[/\bneck\b/i,'Neck'],[/\bchest\b/i,'Chest / Thoracic Cage'],
             [/lower back|lumbar/i,'Back (Lower/Lumbar)'],[/upper back/i,'Back (Upper)'],[/abdomen/i,'Abdomen'],[/\bspine\b/i,'Spine'],
             [/pelvis|\bhip\b/i,'Hip / Pelvis']].forEach(([re, v]) => { if (re.test(injText)) addBp(v); });
            set('bodyPartsAffected', bp);

            const cause = _aiirPick(LTA_CAUSE_OF_INJURY, allText, [
                [/falling object|struck by falling|fell on/i,'Struck by Falling Objects'],
                [/\bfell\b|\bfall\b|slip|\btrip/i,'Falls of Persons'],
                [/caught|entangl|pinch|rotating|moving part|crush|between/i,'Caught By or In Between Objects'],
                [/struck|\bhit\b|striking|stepp?ed on/i,'Stepping On / Striking Against / Struck by Objects (Excluding Falling Objects)'],
                [/overexert|lifting|manual handling|strenuous/i,'Over-exertion or Strenuous Movements'],
                [/\bburn|hot surface|extreme temperature|heat stress/i,'Exposure to or Contact with Extreme Temperatures'],
                [/electric(?!ian)|electrocut|arc flash/i,'Exposure to or Contact with Electric Current'],
                [/chemical|toxic|fume|inhal/i,'Exposure to or Contact with Harmful Substances'],
                [/radiation/i,'Exposure to Radiation']]);
            set('causeOfInjury', cause.slice(0, 1));

            const agentSrc = `${equip} ${detailsRaw}`;
            const agent = _aiirPick(LTA_AGENT_OF_INJURY, agentSrc, [
                [/hand tool|hammer|wrench|screwdriver|pliers|chisel|hand saw/i,'Hand Tools'],
                [/chemical|acid|solvent|fuel|paint/i,'Chemical Substances'],
                [/truck|forklift|trailer|vehicle|motorcycle|\bvan\b|\bbus\b|\bcar\b|pickup/i,'Conveying / Transport / Packaging Equipment or Vehicles'],
                [/machine|equipment|bulldozer|excavator|crane|grader|roller|loader|generator|compressor|\bfan\b|grinder|\bsaw\b|drill|welding/i,'Machines / Equipment'],
                [/scaffold|building|structure|floor|wall|roof|ladder|stair/i,'Building / Structures']]);
            set('agentOfInjury', agent.slice(0, 1));


            // Contributing Factors — from the 4M+E root-cause analysis cells
            const rcStart = T.search(/Manpower\s*:/i);
            if (rcStart >= 0) {
                const R = T.slice(rcStart);
                const mp = _aiirGrab(R, /Manpower\s*:/i, [/Machine\s*:/i, /Materials?\s*:/i]);
                const mc = _aiirGrab(R, /Machine\s*:/i, [/Materials?\s*:/i, /Method\s*:/i]);
                const mt = _aiirGrab(R, /Materials?\s*:/i, [/Method\s*:/i, /Environment\s*:/i]);
                const me = _aiirGrab(R, /Method\s*:/i, [/Environment\s*:/i, /FINAL ROOT CAUSE/i]);
                const en = _aiirGrab(R, /Environment\s*:/i, [/FINAL ROOT CAUSE/i, /Does this incident/i]);
                const F = LTA_FACTOR_CATEGORIES;
                set('factor_PEOPLE', _aiirPickNeg(F.PEOPLE, mp, [
                    [/not aware|unaware|lack of (awareness|training|knowledge)|not (properly )?trained|untrained|no (proper )?training|inadequate training/, 'Lack of Awareness or Training'],
                    [/fatigue|tired|stress|overwork/, 'Fatigue and Stress'],
                    [/negligen|complacen|careless/, 'Negligence or Complacency'],
                    [/ignor(ed|ing)|did not follow|not follow(ed|ing)|failed to follow|failure to follow|violat|bypass|disregard/, 'Ignoring Safety Procedures'],
                    [/distract/, 'Distractions'],
                    [/miscommunicat|poor communication|communication (gap|breakdown|failure)|not communicated/, 'Poor Communication'],
                    [/improper(ly)? (use|used|handl)|misuse|direct (hand )?contact|wrong (method|tool)|incorrect (use|method)/, 'Improper Use of Equipment'],
                    [/risk[\s\-]?tak|unsafe act|short[\s\-]?cut/, 'Risk-Taking Behavior']]));
                set('factor_EQUIPMENT', _aiirPickNeg(F.EQUIPMENT, mc, [
                    [/faulty|defect|malfunction|unprotected|inadequate guard|insufficient (to prevent|guard)|missing guard|guard[^.]{0,40}(gap|missing|inadequate|insufficient)|worn|broken/, 'Faulty Equipment'],
                    [/improper(ly)? (use|used) of tools?|wrong tool|misuse of tools?/, 'Improper Use of Tools'],
                    [/lack of maintenance|poor maintenance|not (properly )?maintained|overdue (pms|maintenance)/, 'Lack of Maintenance'],
                    [/failure to use ppe|without ppe|not wearing ppe|did not wear/, 'Failure to Use PPE'],
                    [/uncalibrated|outdated|not calibrated|expired calibration/, 'Uncalibrated/Outdated Equipment']]));
                set('factor_MATERIALS', _aiirPickNeg(F.MATERIALS, mt, [
                    [/flammable|toxic/, 'Flammable or Toxic Substances'],[/storage|stored/, 'Improper Storage'],
                    [/defective material|substandard/, 'Defective Materials'],[/spill|leak/, 'Spills and Leaks']]));
                set('factor_ENVIRONMENT', _aiirPickNeg(F.ENVIRONMENT, en, [
                    [/housekeeping|untidy|cluttered/, 'Poor Housekeeping'],[/hazardous substance/, 'Hazardous Substances'],
                    [/weather|\brain|\bwet\b|slippery|typhoon|strong wind/, 'Weather Conditions'],[/ventilation/, 'Inadequate Ventilation'],
                    [/poor lighting|inadequate lighting|insufficient light|too dark/, 'Inadequate Lighting'],[/noise/, 'Excessive Noise'],
                    [/vibration/, 'Excessive Vibration'],[/congested|cramped|limited space|narrow|crowded/, 'Congested Work Areas']]));
                set('factor_ORGANIZATIONAL', _aiirPickNeg(F.ORGANIZATIONAL, me, [
                    [/hirac|risk assessment|\bjha\b|hazard (identification|assessment)|did not adequately control|not adequately (identified|controlled|assessed)|inadequate (identification|control|risk)/, 'Inadequate Risk Assessments'],
                    [/lack of safety training|no safety training|inadequate (safety )?training/, 'Lack of Safety Training'],
                    [/poor supervision|inadequate supervision|no supervision|unsupervised|not supervised/, 'Poor Supervision'],
                    [/deadline|pressure|rush(ed|ing)/, 'Pressure to Meet Deadlines'],
                    [/lack of proper ppe|inadequate ppe/, 'Lack of Proper PPE'],
                    [/failure to maintain|equipment (was )?not maintained/, 'Failure to Maintain Equipment']]));
            }

            const NI = [
                [/electric(?!ian)|electrocut/i,'Electric Shock'],[/arc flash/i,'Arc Flashes'],
                [/from height|fell from|fall from/i,'Fall to Below'],[/slip|\btrip|\bfell\b|\bfall\b/i,'Fall to Surface'],
                [/struck by|hit by|falling object|\bstruck\s+(?!against)(?:the|a|an|his|her|him|them|\w+'s)\b/i,'Struck-By'],[/struck against|hit against|bump/i,'Struck Against'],
                [/caught (in|between)|entangl|pinch/i,'Caught in Between'],[/caught by/i,'Caught By'],[/caught on/i,'Caught-On'],
                [/chemical burn/i,'Chemical Burns'],[/\bburn/i,'Burns'],[/manual handling|manually (lift|carr|handl)|lifting (a |the )?(heavy|load)/i,'Manual Handling'],[/overexert/i,'Overexertion'],
                [/vehicular|collision|vehicle accident/i,'Vehicular Accident'],[/explosion|\bfire\b/i,'Fire and Explosions'],
                [/rotating|moving part|contact with|contacted/i,'Contact With']];
            set('natureOfIncident', (_aiirPick(LTA_NATURE_OF_INCIDENT, detailsRaw, NI)[0]) || '');

            if (cls === 'Fatality') set('injuryType', 'fatality');
            else if (/amputat/i.test(injText)) set('injuryType', 'amputation');
            const notes = [];
            const sch = _aiirScheduledItem(`${injText} ${detailsRaw}`, cls);
            if (sch.type) set('injuryType', sch.type);
            if (sch.item) set('scheduledChargeItem', sch.item);
            if (sch.note) notes.push(sch.note);

            const FUK = { result: 'Result', date: 'Date', by: 'By' };
            fuCols.forEach((o, i) => Object.keys(o).forEach(k => set('followUp' + (i + 1) + FUK[k], o[k])));
            if (fuMeta.reason || fuMeta.car) {
                let fi = fuCols.findIndex(o => o.result === LTA_FOLLOWUP_RESULTS[2]);
                if (fi < 0) fi = 2;
                set('followUp' + (fi + 1) + 'Reason', fuMeta.reason);
                set('followUp' + (fi + 1) + 'CarNo', fuMeta.car);
            }
            if (caRows.length) {
                r.correctiveActions = caRows;
                r.correctiveAction = caRows.map(x => x.action).join('\n');
                r.responsible = caRows.map(x => x.responsible).filter(Boolean).join(', ');
                r.timeline = caRows.map(x => x.timeline).filter(Boolean).join(', ');
                found.push('correctiveActions');
            }
            return { data: r, found, notes };
        }

        function _aiirLoadMammoth() {
            return new Promise((resolve, reject) => {
                if (window.mammoth) return resolve();
                const urls = [
                    'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
                    'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js'
                ];
                let i = 0;
                const next = () => {
                    if (i >= urls.length) return reject(new Error('Could not load the DOCX reader (check internet).'));
                    const sc = document.createElement('script');
                    sc.src = urls[i++];
                    sc.onload = () => resolve();
                    sc.onerror = next;
                    document.head.appendChild(sc);
                };
                next();
            });
        }

        const _aiirNorm = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

        // ════════════════════════════════════════════════════════════════
        // AIIR AI EXTRACTION (Claude via Firebase Cloud Function proxy)
        // Falls back to the regex parser (parseAiirDocument) if the AI is unreachable.
        // Set once in index.html:  window.AIIR_AI_ENDPOINT = 'https://<region>-<project>.cloudfunctions.net/aiirExtract';
        // ════════════════════════════════════════════════════════════════
        function _aiirHtmlToText(html) {
            const d = new DOMParser().parseFromString(html, 'text/html');
            const out = [];
            d.body.querySelectorAll('table').forEach(tb => {
                const lines = Array.from(tb.querySelectorAll('tr')).map(tr =>
                    Array.from(tr.children).map(td => (td.textContent || '').replace(/\s+/g, ' ').trim()).join(' | '));
                tb.replaceWith(d.createTextNode('\n' + lines.join('\n') + '\n'));
            });
            return (d.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
        }

        // Reads the text of a legacy Word .doc (Word 97-2003 binary) fully in the browser.
        // Nothing is uploaded or saved — the file is only read. Cells -> " | ", rows -> new line.
        function _aiirDocBinaryRaw(buf) {
            const dv = new DataView(buf);
            if (dv.getUint32(0, true) !== 0xE011CFD0 || dv.getUint32(4, true) !== 0xE11AB1A1) throw new Error('The file is not a valid Word .doc.');
            const ssz = 1 << dv.getUint16(0x1E, true), mssz = 1 << dv.getUint16(0x20, true), cutoff = dv.getUint32(0x38, true);
            const u8 = new Uint8Array(buf);
            const sectOff = s => (s + 1) * ssz;
            const join = parts => { const out = new Uint8Array(parts.reduce((a, x) => a + x.length, 0)); let p = 0; parts.forEach(x => { out.set(x, p); p += x.length; }); return out; };
            const chain = (src, start, tbl, off, sz) => { const parts = []; let s = start, n = 0; while (s >= 0 && s < tbl.length && n++ < 1000000) { parts.push(src.subarray(off(s), off(s) + sz)); s = tbl[s]; } return parts; };
            const toInts = bytes => { const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.length), a = []; for (let i = 0; i + 4 <= bytes.length; i += 4) a.push(v.getInt32(i, true)); return a; };
            // sector allocation table (FAT)
            const difat = [];
            for (let i = 0; i < 109; i++) { const v = dv.getInt32(0x4C + i * 4, true); if (v >= 0) difat.push(v); }
            let ds = dv.getInt32(0x44, true), nd = dv.getUint32(0x48, true);
            while (nd-- > 0 && ds >= 0) {
                const o = sectOff(ds);
                for (let i = 0; i < ssz / 4 - 1; i++) { const v = dv.getInt32(o + i * 4, true); if (v >= 0) difat.push(v); }
                ds = dv.getInt32(o + ssz - 4, true);
            }
            const fat = [];
            difat.forEach(s => toInts(u8.subarray(sectOff(s), sectOff(s) + ssz)).forEach(v => fat.push(v)));
            // directory
            const dir = join(chain(u8, dv.getInt32(0x30, true), fat, sectOff, ssz));
            const dd = new DataView(dir.buffer, dir.byteOffset, dir.length), ents = [];
            for (let o = 0; o + 128 <= dir.length; o += 128) {
                const nl = dd.getUint16(o + 64, true); if (!nl) continue;
                let name = ''; for (let i = 0; i < nl / 2 - 1; i++) name += String.fromCharCode(dd.getUint16(o + i * 2, true));
                ents.push({ name, type: dir[o + 66], start: dd.getInt32(o + 116, true), size: dd.getUint32(o + 120, true) });
            }
            let mini = null, miniFat = null;
            const root = ents.find(e => e.type === 5);
            const readStream = e => {
                if (e.size >= cutoff) return join(chain(u8, e.start, fat, sectOff, ssz)).subarray(0, e.size);
                if (!mini) {
                    mini = join(chain(u8, root.start, fat, sectOff, ssz));
                    miniFat = toInts(join(chain(u8, dv.getInt32(0x3C, true), fat, sectOff, ssz)));
                }
                return join(chain(mini, e.start, miniFat, s => s * mssz, mssz)).subarray(0, e.size);
            };
            // Word file information block + piece table
            const wdEnt = ents.find(e => e.name === 'WordDocument');
            if (!wdEnt) throw new Error('No Word content found in the .doc file.');
            const W = readStream(wdEnt), wv = new DataView(W.buffer, W.byteOffset, W.length);
            if (wv.getUint16(0, true) !== 0xA5EC) throw new Error('The .doc file is too old (Word 6/95). Open it in Word → Save As → .docx, then import it again.');
            const flags = wv.getUint16(0x0A, true);
            if (flags & 0x0100) throw new Error('The Word file has a password. Remove the password first.');
            const tEnt = ents.find(e => e.name === ((flags & 0x0200) ? '1Table' : '0Table'));
            if (!tEnt) throw new Error('The .doc file is damaged (no table stream).');
            const T = readStream(tEnt), tv = new DataView(T.buffer, T.byteOffset, T.length);
            const ccpText = wv.getInt32(0x4C, true);
            const fcClx = wv.getUint32(0x1A2, true), lcbClx = wv.getUint32(0x1A6, true);
            let p = fcClx, plc = -1, plcLen = 0;
            while (p < fcClx + lcbClx) {
                if (T[p] === 1) p += 3 + tv.getUint16(p + 1, true);
                else if (T[p] === 2) { plcLen = tv.getUint32(p + 1, true); plc = p + 5; break; }
                else break;
            }
            if (plc < 0) throw new Error('Could not read the text of the .doc file.');
            const n = ((plcLen - 4) / 12) | 0, w1252 = new TextDecoder('windows-1252'), u16 = new TextDecoder('utf-16le');
            let text = '';
            for (let i = 0; i < n; i++) {
                const cpS = tv.getInt32(plc + i * 4, true), cpE = tv.getInt32(plc + (i + 1) * 4, true);
                if (cpS >= ccpText) break;
                const len = Math.min(cpE, ccpText) - cpS;
                const fc = tv.getUint32(plc + (n + 1) * 4 + i * 8 + 2, true);
                if (fc & 0x40000000) { const o = (fc & 0x3FFFFFFF) >> 1; text += w1252.decode(W.subarray(o, o + len)); }
                else text += u16.decode(W.subarray(fc, fc + len * 2));
            }
            // keep paragraph marks (\r) and table marks (\x07) so tables can be read as rows
            return text
                .replace(/\x13[^\x14\x15]*\x14/g, '').replace(/[\x13\x15]/g, '')   // field codes
                .replace(/[\x0B\x0C]/g, '\r').replace(/[\x00-\x06\x08\x0E-\x1F]/g, '');
        }
        function _aiirDocTextFromRaw(raw) {
            return raw
                .replace(/\x07\x07/g, '\n').replace(/\x07/g, ' | ')                 // table row / cell ends
                .replace(/\r/g, '\n')
                .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        }
        // Reads the Corrective Action / Responsible / Timeline table of a .doc exactly as written in the AIIR.
        // In the raw text a cell ends with \x07 and a row ends with one more \x07, so empty cells are not mistaken for row ends.
        function _aiirDocCorrectiveActions(raw) {
            const tk = raw.split('\x07');
            const clean = t => (t || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
            let j = -1;
            for (let i = 1; i < tk.length - 1; i++) {
                if (/^\s*responsible/i.test(tk[i]) && /timeline/i.test(tk[i + 1]) && /action/i.test(tk[i - 1])) { j = i; break; }
            }
            if (j < 0) return [];
            let sIdx = j - 1; while (sIdx > 0 && tk[sIdx - 1] !== '') sIdx--;
            let e = j + 1; while (e < tk.length && tk[e] !== '') e++;
            const N = e - sIdx, aOff = (j - 1) - sIdx, rOff = j - sIdx, tOff = j + 1 - sIdx;
            const rows = [];
            for (let pos = e + 1; pos + N < tk.length; pos += N + 1) {
                if (tk[pos + N] !== '') break;                       // different table shape → the table ended
                const c = tk.slice(pos, pos + N).map(clean);
                if (/approved by/i.test(c[aOff])) break;
                if (c[aOff]) rows.push({ action: c[aOff], responsible: c[rOff], timeline: c[tOff] });
            }
            return rows;
        }

        function _aiirOptions() {
            return {
                natureOfIncident: LTA_NATURE_OF_INCIDENT, classification: LTA_INCIDENT_CLASSIFICATION,
                natureOfInjury: LTA_NATURE_OF_INJURY, bodyParts: LTA_BODY_PARTS,
                causeOfInjury: LTA_CAUSE_OF_INJURY, agentOfInjury: LTA_AGENT_OF_INJURY,
                followUpResults: LTA_FOLLOWUP_RESULTS, factors: LTA_FACTOR_CATEGORIES
            };
        }

        async function _aiirCallAI(payload) {
            const url = window.AIIR_AI_ENDPOINT;
            if (!url) throw new Error('AIIR_AI_ENDPOINT not configured');
            const user = window.firebaseAuth && window.firebaseAuth.currentUser;
            if (!user) throw new Error('Not signed in');
            const token = await user.getIdToken();
            const r = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ ...payload, options: _aiirOptions() })
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j.result) throw new Error(j.error || ('AI HTTP ' + r.status));
            return j.result;
        }

        // Convert the AI JSON into the same shape parseAiirDocument() returns ({data, found, notes}).
        // Every dropdown value is re-validated against the real lists — anything not in a list is dropped.
        function _aiirMapAIResult(a) {
            const r = {}, found = [], notes = [];
            const set = (k, v) => { if (v !== '' && v != null && !(Array.isArray(v) && !v.length)) { r[k] = v; found.push(k); } };
            const str = v => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
            const date = v => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : '');
            const one = (list, v) => (list.includes(v) ? v : '');
            const many = (list, arr) => (Array.isArray(arr) ? arr.filter((x, i) => list.includes(x) && arr.indexOf(x) === i) : []);

            set('aiirNo', str(a.aiirNo));
            set('dateReported', date(a.dateReported));
            set('dateOfAccident', date(a.dateOfAccident));
            set('locationOfIncident', str(a.locationOfIncident));
            set('natureOfIncident', one(LTA_NATURE_OF_INCIDENT, a.natureOfIncident));
            const cls = one(LTA_INCIDENT_CLASSIFICATION, a.incidentClassification);
            set('incidentClassification', cls);
            set('detailsFacts', (a.detailsFacts || '').trim());
            set('rootCause', (a.rootCause || '').trim());

            if (a.hasInjury) {
                set('injuredPersonName', str(a.injuredPersonName));
                set('occupation', str(a.occupation));
                set('natureOfInjury', many(LTA_NATURE_OF_INJURY, a.natureOfInjury));
                set('bodyPartsAffected', many(LTA_BODY_PARTS, a.bodyPartsAffected));
                const c = one(LTA_CAUSE_OF_INJURY, a.causeOfInjury); if (c) set('causeOfInjury', [c]);
                const g = one(LTA_AGENT_OF_INJURY, a.agentOfInjury); if (g) set('agentOfInjury', [g]);
                // Scheduled-charge logic stays deterministic (exact table matches only)
                const inj = `${a.injurySummary || ''} ${a.detailsFacts || ''}`;
                if (cls === 'Fatality') set('injuryType', 'fatality');
                else if (/amputat/i.test(inj)) set('injuryType', 'amputation');
                const sch = _aiirScheduledItem(inj, cls);
                if (sch.type) set('injuryType', sch.type);
                if (sch.item) set('scheduledChargeItem', sch.item);
                if (sch.note) notes.push(sch.note);
            }

            ['PEOPLE', 'EQUIPMENT', 'MATERIALS', 'ENVIRONMENT', 'ORGANIZATIONAL'].forEach(k =>
                set('factor_' + k, many(LTA_FACTOR_CATEGORIES[k], a['factor_' + k])));

            const rows = (Array.isArray(a.correctiveActions) ? a.correctiveActions : [])
                .map(x => ({ action: str(x.action), responsible: str(x.responsible), timeline: str(x.timeline) })).filter(x => x.action);
            if (rows.length) {
                r.correctiveActions = rows;
                r.correctiveAction = rows.map(x => x.action).join('\n');
                r.responsible = [...new Set(rows.map(x => x.responsible).filter(Boolean))].join(', ');
                r.timeline = [...new Set(rows.map(x => x.timeline).filter(Boolean))].join(', ');
                found.push('correctiveActions');
            }

            const FUK = { result: 'Result', date: 'Date', by: 'By' };
            (Array.isArray(a.followUps) ? a.followUps : []).forEach(f => {
                const n = f.n; if (![1, 2, 3].includes(n)) return;
                set(`followUp${n}Result`, one(LTA_FOLLOWUP_RESULTS, f.result));
                set(`followUp${n}Date`, date(f.date));
                set(`followUp${n}By`, str(f.by));
            });
            if (a.followUpReason || a.carNo) {
                let fi = [1, 2, 3].find(n => r[`followUp${n}Result`] === LTA_FOLLOWUP_RESULTS[2]) || 3;
                set(`followUp${fi}Reason`, str(a.followUpReason));
                set(`followUp${fi}CarNo`, str(a.carNo));
            }
            (a.uncertain || []).forEach(u => u && u.field && notes.push(`${u.field}: ${u.reason}`));
            return { data: r, found, notes, ai: true };
        }

        // Contributing Factors must come only from Section I (Root-Cause Analysis: Manpower / Machine / Materials / Method / Environment).
        // Whatever the AI guessed for these five dropdowns is replaced with what Section I actually says; if Section I says nothing, they stay N/A.
        function _aiirUseSectionIFactors(res, regexRes) {
            const keys = ['PEOPLE', 'EQUIPMENT', 'MATERIALS', 'ENVIRONMENT', 'ORGANIZATIONAL'].map(k => 'factor_' + k);
            keys.forEach(k => { delete res.data[k]; });
            res.found = (res.found || []).filter(k => !keys.includes(k));
            let n = 0;
            keys.forEach(k => {
                const v = regexRes && regexRes.data && regexRes.data[k];
                if (Array.isArray(v) && v.length) { res.data[k] = v; res.found.push(k); n++; }
            });
            if (!n) res.notes = [...(res.notes || []), 'No Contributing Factors found in Section I (Root-Cause Analysis). Left as N/A.'];
            return res;
        }

        // Nature of Incident must come only from "Detailed Description of Accident / Incident (Identify and State the Immediate Cause ...)".
        function _aiirDescriptionText(text) {
            const m = /Detailed Description of Accident\s*\/?\s*Incident\s*\([^)]*\)\s*:?/i.exec(text || '');
            if (!m) return '';
            const rest = text.slice(m.index + m[0].length);
            const e = /Related Facts/i.exec(rest);
            return (e ? rest.slice(0, e.index) : rest).replace(/^[\s:|.\-–]+/, '').trim();
        }
        // The AI is asked again with the Detailed Description text alone, so it cannot use any other part of the AIIR.
        // If that fails or gives nothing valid, the keyword rule on the same description is used; if still nothing, it stays blank.
        async function _aiirNatureFromDescription(res, text, regexRes) {
            res.data = res.data || {}; res.found = (res.found || []).filter(k => k !== 'natureOfIncident'); res.notes = res.notes || [];
            delete res.data.natureOfIncident;
            const desc = _aiirDescriptionText(text);
            let val = '';
            if (desc.length >= 30) {
                try {
                    const a = await _aiirCallAI({ text: desc });
                    if (a && LTA_NATURE_OF_INCIDENT.includes(a.natureOfIncident)) val = a.natureOfIncident;
                } catch (err) {  }
            }
            if (!val && regexRes && regexRes.data && regexRes.data.natureOfIncident) val = regexRes.data.natureOfIncident;
            if (val) { res.data.natureOfIncident = val; res.found.push('natureOfIncident'); }
            else res.notes.push('Nature of Incident could not be determined from the Detailed Description. Select it manually.');
            return res;
        }

        // Only injury cases have an Injured Person. For any other classification (High-Potential Incident, Dangerous Occurrence,
        // Near Miss) the AIIR may still list names of people who were merely involved — they are not injured, so the whole
        // Injured Person section is set to N/A. If the classification could not be read, nothing is changed.
        const LTA_INJURY_CLASSES = ['LTA', 'Restricted Work Case (RWC)', 'Medical Treatment', 'First Aid', 'Fatality'];
        function _aiirApplyInjuredPersonRule(res) {
            const cls = res && res.data && res.data.incidentClassification;
            if (!cls || LTA_INJURY_CLASSES.includes(cls)) return res;
            const keys = ['injuredPersonName', 'occupation', 'natureOfInjury', 'bodyPartsAffected', 'causeOfInjury', 'agentOfInjury', 'injuryType', 'scheduledChargeItem'];
            keys.forEach(k => { delete res.data[k]; });
            res.found = (res.found || []).filter(k => !keys.includes(k));
            res.data.injuredPersonName = 'N/A';
            res.found.push('injuredPersonName');
            return res;
        }

        // Corrective Actions are copied exactly as written in the AIIR's Corrective Action / Responsible / Timeline table.
        // The AI's own wording is used only if that table could not be read.
        function _aiirUseTableCorrectiveActions(res, regexRes) {
            res.data = res.data || {}; res.found = res.found || []; res.notes = res.notes || [];
            const rows = regexRes && regexRes.data && regexRes.data.correctiveActions;
            const uniq = a => [...new Set(a.filter(Boolean))].join(', ');
            if (Array.isArray(rows) && rows.length) {
                res.data.correctiveActions = rows;
                res.data.correctiveAction = rows.map(x => x.action).join('\n');
                res.data.responsible = uniq(rows.map(x => x.responsible));
                res.data.timeline = uniq(rows.map(x => x.timeline));
                if (!res.found.includes('correctiveActions')) res.found.push('correctiveActions');
            } else if (!(res.data.correctiveActions && res.data.correctiveActions.length)) {
                res.notes.push('No Corrective Action found in the AIIR. Enter it manually.');
            }
            return res;
        }

        async function _aiirReadFile(f) {
            // Microsoft Word files only (any version). Type is checked by file content, not just the name.
            if (!/\.(docx|docm|dotx|dotm|doc|dot)$/i.test(f.name)) throw new Error('Only Microsoft Word files are accepted (.doc, .docx, .docm, .dotx, .dotm).');
            const buf = await f.arrayBuffer();
            const b = new Uint8Array(buf, 0, Math.min(8, buf.byteLength));
            const isZip = b[0] === 0x50 && b[1] === 0x4B;                                        // Word 2007+ (.docx/.docm/.dotx/.dotm)
            const isOle = b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0;      // Word 97-2003 (.doc/.dot)
            let text = '', regexRes = null;
            if (isZip) {
                await _aiirLoadMammoth();
                let out;
                try { out = await window.mammoth.convertToHtml({ arrayBuffer: buf }); }
                catch (e) { throw new Error('Could not read the file. It is not a valid Microsoft Word document.'); }
                text = _aiirHtmlToText(out.value);
                regexRes = parseAiirDocument(out.value);
            } else if (isOle) {
                const raw = _aiirDocBinaryRaw(buf);
                text = _aiirDocTextFromRaw(raw);
                regexRes = parseAiirDocument(null, text);
                const caRows = _aiirDocCorrectiveActions(raw);
                if (caRows.length) {
                    regexRes.data.correctiveActions = caRows;
                    regexRes.found = (regexRes.found || []).filter(k => k !== 'correctiveActions').concat('correctiveActions');
                }
            } else {
                throw new Error('This is not a valid Microsoft Word document.');
            }
            let res;
            try {
                res = _aiirUseSectionIFactors(_aiirMapAIResult(await _aiirCallAI({ text })), regexRes);
                res = await _aiirNatureFromDescription(res, text, regexRes);
            } catch (err) {
                regexRes.notes = ['AI reader is not available — the regex parser was used (lower accuracy). Check all fields carefully.', ...(regexRes.notes || [])];
                res = regexRes;
            }
            return _aiirApplyInjuredPersonRule(_aiirUseTableCorrectiveActions(res, regexRes));
        }

        window._importAiirViaFile = function(pName) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p.region, 'medical');
            if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            const inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = '.doc,.docx,.docm,.dot,.dotx,.dotm,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            inp.onchange = async () => {
                const f = inp.files && inp.files[0];
                if (!f) return;
                try {
                    showToast('🤖 The AI is reading the AIIR...', 'info', 4000);
                    const res = await _aiirReadFile(f);
                    if (!res.data.aiirNo && !res.data.dateOfAccident) {
                        throw new Error('No AIIR No. or Date of Accident found. Is the template correct (FM-ESH-13-01)?');
                    }
                    // Duplicate check across all projects — do not add if AIIR No. already exists
                    if (res.data.aiirNo) {
                        const key = _aiirNorm(res.data.aiirNo);
                        for (const proj of state.projects) {
                            const list = (proj.vals && proj.vals['lta-registry_entries']) || [];
                            const di = list.findIndex(x => x && _aiirNorm(x.aiirNo) === key);
                            if (di >= 0) {
                                showToast(`${res.data.aiirNo} already exists in ${proj.name} — not added.`, 'error', 5000);
                                if (proj.name === pName) openLtaModal(pName, di, false);
                                return;
                            }
                        }
                    }
                    _ltaAutoEditMode();
                    window._ltaPrefill = res.data;
                    openLtaModal(pName, -1, true);
                    showToast(`${res.found.length} fields filled ${res.ai ? '(AI)' : '(regex)'} from the AIIR. Review before saving (especially the dropdowns).`, 'success', 6000);
                    if (res.notes && res.notes.length) setTimeout(() => showToast('' + res.notes.join(' '), 'error', 9000), 600);
                } catch (err) {
                    console.error('AIIR import failed:', err);
                    window._ltaPrefill = null;
                    showToast('' + err.message, 'error', 6000);
                }
            };
            inp.click();
        };

        // ══════════════════════════════════════════════════════════════════
        // LTA ENTRY MODAL SYSTEM
        // openLtaModal(pName, idx, editMode) — opens dialog for view/edit/add
        // saveLtaModal(pName, idx)           — saves dialog form to state
        // ══════════════════════════════════════════════════════════════════

        // Splits the entry modal into tabs. It only MOVES the existing nodes into panes,
        // so every id, name="ltamod-..." and inline handler stays the same (save/AIIR/DL code untouched).
        // View mode: make read-only text boxes as tall as their text (no inner scroll bar)
        window._ltaAutoGrow = function(modal) {
            if (!modal) return;
            modal.querySelectorAll('textarea:disabled').forEach(t => {
                if (t.offsetParent === null) return;
                t.style.height = 'auto';
                t.style.height = (t.scrollHeight + 2) + 'px';
            });
        };

        window._ltaBuildTabs = function() {
            const modal = document.getElementById('lta-entry-modal');
            const body = modal && modal.querySelector('#lta-modal-body');
            const grid = body && body.querySelector('.lta-grid');
            if (!grid) return;
            const TABS = [
                { m: 'Incident Information', m2: 'Injured Person', label: 'Incident & Injured Person', icon: 'fa-file-alt' },
                { m: 'Contributing Factors', label: 'Contributing Factors', icon: 'fa-circle-exclamation' },
                { m: 'Root Cause', label: 'Root Cause & Action', icon: 'fa-magnifying-glass' },
                { m: 'Monitoring', label: 'Follow-Up', icon: 'fa-list-check' },
                { m: 'Days Lost', label: 'Days Lost', icon: 'fa-calendar-xmark' },
                { m: 'Closure', label: 'Closure', icon: 'fa-circle-check' }
            ];
            const panes = TABS.map(() => { const d = document.createElement('div'); d.className = 'lta-grid lta-tab-pane'; return d; });
            let cur = 0;
            Array.from(grid.children).forEach(ch => {
                if (ch.classList.contains('lta-section-label')) {
                    const i = TABS.findIndex(t => ch.textContent.indexOf(t.m) !== -1 || (t.m2 && ch.textContent.indexOf(t.m2) !== -1));
                    if (i !== -1) { cur = i; if (!ch.querySelector('button')) ch.style.display = 'none'; }
                }
                panes[cur].appendChild(ch);
            });
            panes.forEach(p => body.insertBefore(p, grid));
            grid.remove();
            const bar = document.createElement('div');
            bar.className = 'lta-tabs';
            const show = i => {
                panes.forEach((p, j) => { p.style.display = j === i ? '' : 'none'; btns[j].classList.toggle('on', j === i); });
                body.scrollTop = 0;
                if (modal.classList.contains('lta-vw') && window._ltaAutoGrow) window._ltaAutoGrow(modal);
            };
            const btns = TABS.map((t, i) => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'lta-tab';
                b.innerHTML = '<i class="fas ' + t.icon + '"></i> ' + t.label;
                b.onclick = () => show(i);
                bar.appendChild(b);
                return b;
            });
            body.style.minHeight = 'min(430px,70vh)';
            body.parentNode.insertBefore(bar, body);
            // Date formatter (also used by view mode)
            window._ltaFmtDate = function(iso) {
                const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
                if (!m) return '';
                const MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                return (+m[3]) + ' ' + MN[+m[2] - 1] + ' ' + m[1];
            };
            modal._ltaGo = function(tabKey, fieldName) {
                const i = TABS.findIndex(t => t.m === tabKey);
                if (i < 0) return;
                show(i);
                const el = fieldName && modal.querySelector('[name="ltamod-' + fieldName + '"]');
                if (el) setTimeout(() => { try { el.focus(); } catch (e) {} }, 0);
            };
            show(0);
        };

        window.openLtaModal = function(pName, idx, editMode) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            if (window.PresenceTracker) PresenceTracker.setProject(pName, !!editMode);
            const entries = p.vals['lta-registry_entries'] || [];
            const isNew = (idx === -1);
            const e = isNew ? {
                aiirNo:'', dateReported:'', locationOfIncident:'', natureOfIncident:'',
                incidentClassification:'LTA', incidentMechanism:'',
                factor_PEOPLE:[], factor_EQUIPMENT:[], factor_MATERIALS:[],
                factor_ENVIRONMENT:[], factor_ORGANIZATIONAL:[],
                detailsFacts:'', injuredPersonName:'', natureOfInjury:'', bodyPartsAffected:'', causeOfInjury:[], agentOfInjury:[],
                occupation:'', rootCause:'', correctiveActions:[], correctiveAction:'', responsible:'', timeline:'',
                followUp1:'', followUp2:'', followUp3:'',
                dateOfAccident:'', dateRTW:'', injuryType:'temporary', scheduledChargeItem:'',
                dateClosed:'', status:'Open', remarks:''
            } : JSON.parse(JSON.stringify(entries[idx]));
            if (isNew && window._ltaPrefill) { Object.assign(e, window._ltaPrefill); window._ltaPrefill = null; }

            const canEdit = editMode || isNew;
            const dis = canEdit ? '' : 'disabled';
            const pId = pName.replace(/[^a-zA-Z0-9]/g,'_');
            const pnSafe = pName.replace(/'/g,"\\'");
            const entryNum = isNew ? (entries.length + 1) : (idx + 1);
            window._ltaPersonSeq = Array.isArray(e.additionalPersons) ? e.additionalPersons.length : 0;

            const mkOpts = (arr, val) => {
                // Support both single string (legacy) and array (multi-select)
                const selArr = Array.isArray(val) ? val : (val ? val.split(',').map(v=>v.trim()).filter(Boolean) : []);
                return arr.map(o => `<option value="${o}" ${selArr.includes(o)?'selected':''}>${o}</option>`).join('');
            };

            // Build factor checkbox dropdowns (multi-select)
            const factorCats = ['PEOPLE','EQUIPMENT','MATERIALS','ENVIRONMENT','ORGANIZATIONAL'];
            const catColors  = {PEOPLE:'#1565c0',EQUIPMENT:'#6a1b9a',MATERIALS:'#e65100',ENVIRONMENT:'#2e7d32',ORGANIZATIONAL:'#c62828'};
            const catIcons   = {PEOPLE:'fa-user',EQUIPMENT:'fa-wrench',MATERIALS:'fa-boxes-stacked',ENVIRONMENT:'fa-leaf',ORGANIZATIONAL:'fa-sitemap'};
            const factorsHtml = factorCats.map(cat => {
                const fKey   = 'factor_' + cat;
                const raw    = e[fKey] !== undefined ? e[fKey] : [];
                // Normalize: legacy 'N/A' string → [], legacy single string → [str], array stays array
                const selArr = Array.isArray(raw) ? raw
                    : (raw === 'N/A' || raw === '' ? [] : [raw]);
                const opts   = (typeof LTA_FACTOR_CATEGORIES !== 'undefined' ? LTA_FACTOR_CATEGORIES[cat] || [] : []);
                const ddId   = `ltamod-fac-dd-${pId}-${cat}`;
                const prvId  = `ltamod-fac-prv-${pId}-${cat}`;
                const panId  = `ltamod-fac-pan-${pId}-${cat}`;
                const color  = catColors[cat];
                const icon   = catIcons[cat];

                if (!canEdit) {
                    // View mode: chips, or N/A if nothing selected
                    return `<div class="lta-field">
                        <label>${cat}</label>
                        ${selArr.length
                            ? `<ul class="lta-plain-list">${selArr.map(s=>`<li>${s}</li>`).join('')}</ul>`
                            : `<span class="lta-plain-empty">N/A</span>`}
                    </div>`;
                }

                return `<div class="lta-field">
                    <label style="color:${color};font-weight:800;"><i class="fas ${icon}" style="margin-right:3px;"></i>${cat}</label>
                    <div class="lta-cb-dropdown" id="${ddId}">
                        <button type="button" class="lta-cb-trigger" style="border-color:${color}55;"
                            onclick="window._ltaToggleCbDd('${ddId}',event)">
                            <span class="lta-cb-preview" id="${prvId}">${selArr.length ? selArr.join(', ') : 'N/A'}</span>
                            <i class="fas fa-chevron-down" style="font-size:0.6rem;flex-shrink:0;color:${color};"></i>
                        </button>
                        <div class="lta-cb-panel" id="${panId}" style="display:none;">
                            <div class="lta-cb-list">
                                <label class="lta-cb-item">
                                    <input type="checkbox" value="__CLEAR__"
                                        onchange="window._ltaClearFactorCb('${ddId}','${prvId}',this)">
                                    <span style="color:#888;font-style:italic;">N/A (clear all)</span>
                                </label>
                                <div style="height:1px;background:#e8f5e9;margin:2px 0;"></div>
                                ${opts.map(o => `
                                <label class="lta-cb-item">
                                    <input type="checkbox" value="${o}" ${selArr.includes(o)?'checked':''}
                                        onchange="window._ltaUpdateCbPreview('${ddId}','${prvId}')">
                                    <span>${o}</span>
                                </label>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');

            // Scheduled charges section
            const scOpts = typeof SCHEDULED_CHARGES_GROUPS !== 'undefined' ? SCHEDULED_CHARGES_GROUPS.map(g =>
                `<optgroup label="${g.group}">${g.items.map(item =>
                    `<option value="${item}" ${e.scheduledChargeItem===item?'selected':''}>${item} — ${SCHEDULED_CHARGES[item].toLocaleString()} days</option>`
                ).join('')}</optgroup>`).join('') : '';

            const injType = e.injuryType || 'temporary';
            const injTypeDef = typeof LTA_INJURY_TYPES !== 'undefined' ? LTA_INJURY_TYPES.find(t=>t.value===injType) : null;
            const dlSectionHtml = window._ltaBuildDLHtml(e, dis, scOpts);

            const existing = document.getElementById('lta-entry-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'lta-entry-modal';
            window.eshMountModal(modal, {
                id: 'lta-entry-modal', icon: 'fa-file-circle-exclamation', width: 'min(1600px,99vw)',
                title: `${isNew ? 'New incident / accident entry' : (String(e.aiirNo || '').trim() ? String(e.aiirNo).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;') : (canEdit ? 'Edit entry #' + entryNum : 'View entry #' + entryNum))}`,
                sub: `${pName}${(!isNew && String(e.aiirNo || '').trim()) ? ' \u00b7 ' + (canEdit ? 'Edit' : 'View') : ''}`,
                body: `
                <div style="padding:18px 20px;max-height:70vh;overflow-y:auto;background:var(--bg-card);" id="lta-modal-body">
                    <div class="lta-grid">

                        <div class="lta-section-label" style="grid-column:1/-1;"><i class="fas fa-file-alt" style="margin-right:5px;"></i>Incident Information</div>

                        <div class="lta-field">
                            <label>AIIR No.</label>
                            <input type="text" name="ltamod-aiirNo" value="${e.aiirNo||''}" ${dis} placeholder="e.g. SCIC-SJRP-AIIR-2026-001">
                        </div>
                        <div class="lta-field">
                            <label>Date Reported</label>
                            <input type="date" name="ltamod-dateReported" value="${e.dateReported||''}" ${dis}>
                        </div>
                        <div class="lta-field">
                            <label>Location of Incident</label>
                            <input type="text" name="ltamod-locationOfIncident" value="${e.locationOfIncident||''}" ${dis} placeholder="e.g. Phase 4 Wall">
                        </div>
                        <div class="lta-field">
                            <label>Nature of Incident</label>
                            <select name="ltamod-natureOfIncident" ${dis}
                                onchange="(function(sel){var i=document.getElementById('ltamod-noi-other-${pId}');if(i){var on=(sel.value==='Others');i.style.display=on?'block':'none';if(on)i.focus();else i.value='';}})(this)">
                                <option value="">— Select —</option>
                                ${typeof LTA_NATURE_OF_INCIDENT !== 'undefined' ? mkOpts(LTA_NATURE_OF_INCIDENT, e.natureOfIncident) : ''}
                            </select>
                            <input type="text" name="ltamod-natureOfIncidentOther" id="ltamod-noi-other-${pId}" ${dis}
                                value="${String(e.natureOfIncidentOther||'').replace(/"/g,'&quot;')}" placeholder="Please specify..." maxlength="200"
                                style="display:${e.natureOfIncident==='Others'?'block':'none'};margin-top:6px;width:100%;box-sizing:border-box;">
                        </div>
                        <div class="lta-field">
                            <label>Incident Classification</label>
                            <div style="position:relative;">
                                <select name="ltamod-incidentClassification" ${dis}
                                    style="width:100%;"
                                    title="${(e.incidentClassification && typeof LTA_INCIDENT_CLASSIFICATION_DESC !== 'undefined' ? (LTA_INCIDENT_CLASSIFICATION_DESC[e.incidentClassification]||'') : '').replace(/"/g,'&quot;')}"
                                    onchange="(function(sel){
                                        const desc = (typeof LTA_INCIDENT_CLASSIFICATION_DESC !== 'undefined') ? LTA_INCIDENT_CLASSIFICATION_DESC[sel.value] : null;
                                        sel.title = desc || '';
                                    })(this); if (window._ltaDLRefresh) window._ltaDLRefresh();">
                                    <option value="">— Select —</option>
                                    ${typeof LTA_INCIDENT_CLASSIFICATION !== 'undefined' ? LTA_INCIDENT_CLASSIFICATION.map(o => {
                                        const desc = (typeof LTA_INCIDENT_CLASSIFICATION_DESC !== 'undefined') ? (LTA_INCIDENT_CLASSIFICATION_DESC[o] || '').replace(/"/g,'&quot;') : '';
                                        const selArr = Array.isArray(e.incidentClassification) ? e.incidentClassification : (e.incidentClassification ? [e.incidentClassification] : []);
                                        return `<option value="${o}" title="${desc}" ${selArr.includes(o)?'selected':''}>${o}</option>`;
                                    }).join('') : ''}
                                </select>
                            </div>
                        </div>
                        <div class="lta-field lta-field-full">
                            <label>Details / Facts of Incident</label>
                            <textarea name="ltamod-detailsFacts" ${dis} spellcheck="true" lang="en" style="min-height:160px;">${e.detailsFacts||''}</textarea>
                        </div>

                        <div class="lta-section-label lta-field-full" style="margin-top:4px;">
                            <i class="fas fa-circle-exclamation" style="margin-right:5px;color:#e65100;"></i>Contributing Factors
                        </div>
                        ${factorsHtml}

                        <div class="lta-section-label" style="grid-column:1/-1;display:flex;align-items:center;justify-content:flex-start;gap:10px;">
                            <span><i class="fas fa-user-injured" style="margin-right:5px;"></i>Injured Person</span>
                            ${canEdit ? `<button type="button"
                                id="ltamod-naBtn-${pId}"
                                onclick="window._ltaModalToggleNA('${pId}')"
                                title="No injured person — disable the whole section"
                                style="flex-shrink:0;padding:2px 10px;border-radius:6px;
                                    border:1.5px solid ${e.injuredPersonName==='N/A'?'#2e7d32':'#bbb'};
                                    background:${e.injuredPersonName==='N/A'?'#e8f5e9':'#f9f9f9'};
                                    color:${e.injuredPersonName==='N/A'?'#2e7d32':'#888'};
                                    font-size:0.65rem;font-weight:700;cursor:pointer;white-space:nowrap;"
                                data-isna="${e.injuredPersonName==='N/A'?'1':'0'}">
                                ${e.injuredPersonName==='N/A'?'✓ N/A':'N/A'}
                            </button>` : (e.injuredPersonName==='N/A' ? '<span style="font-size:0.65rem;font-weight:700;color:#2e7d32;">N/A — Not Applicable</span>' : '')}
                        </div>

                        <div class="lta-field">
                            <label>Injured Person Name / Age</label>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <input type="text" name="ltamod-injuredPersonName" id="ltamod-injperson-${pId}"
                                    value="${e.injuredPersonName==='N/A'?'':(e.injuredPersonName||'')}"
                                    ${dis} ${e.injuredPersonName==='N/A'?'placeholder="N/A — Not Applicable"':'placeholder="e.g. Juan dela Cruz, 35"'}
                                    style="${e.injuredPersonName==='N/A'?'background:#f5f5f5;color:#999;font-style:italic;':''}">
                            </div>
                        </div>
                        <div class="lta-field">
                            <label>Nature of Injury</label>
                            ${(()=>{
                                const selArr = Array.isArray(e.natureOfInjury) ? e.natureOfInjury
                                    : (e.natureOfInjury ? e.natureOfInjury.split(',').map(v=>v.trim()).filter(Boolean) : []);
                                if (!canEdit) {
                                    // View mode: show selected as chips
                                    return selArr.length
                                        ? `<ul class="lta-plain-list">${selArr.map(s=>`<li>${s}</li>`).join('')}</ul>`
                                        : `<span class="lta-plain-empty">—</span>`;
                                }
                                return `<div class="lta-cb-dropdown" id="ltamod-ni-dd-${pId}">
                                    <button type="button" class="lta-cb-trigger" onclick="window._ltaToggleCbDd('ltamod-ni-dd-${pId}',event)">
                                        <span class="lta-cb-preview" id="ltamod-ni-preview-${pId}">${selArr.length ? selArr.join(', ') : '— Select —'}</span>
                                        <i class="fas fa-chevron-down" style="font-size:0.6rem;flex-shrink:0;"></i>
                                    </button>
                                    <div class="lta-cb-panel" id="ltamod-ni-panel-${pId}" style="display:none;">
                                        <div class="lta-cb-search-wrap"><input type="text" class="lta-cb-search" placeholder="Search..." oninput="window._ltaFilterCb(this,'ltamod-ni-panel-${pId}')"></div>
                                        <div class="lta-cb-list">
                                        ${(typeof LTA_NATURE_OF_INJURY !== 'undefined' ? LTA_NATURE_OF_INJURY : []).map(o=>`
                                            <label class="lta-cb-item">
                                                <input type="checkbox" value="${o}" ${selArr.includes(o)?'checked':''}
                                                    data-dd="ltamod-ni-dd-${pId}"
                                                    data-preview="ltamod-ni-preview-${pId}"
                                                    onchange="window._ltaUpdateCbPreview('ltamod-ni-dd-${pId}','ltamod-ni-preview-${pId}')">
                                                <span>${o}</span>
                                            </label>`).join('')}
                                        </div>
                                    </div>
                                </div>`;
                            })()}
                        </div>
                        <div class="lta-field">
                            <label>Body Parts Affected</label>
                            ${(()=>{
                                const selArr = Array.isArray(e.bodyPartsAffected) ? e.bodyPartsAffected
                                    : (e.bodyPartsAffected ? e.bodyPartsAffected.split(',').map(v=>v.trim()).filter(Boolean) : []);
                                if (!canEdit) {
                                    return selArr.length
                                        ? `<ul class="lta-plain-list">${selArr.map(s=>`<li>${s}</li>`).join('')}</ul>`
                                        : `<span class="lta-plain-empty">—</span>`;
                                }
                                return `<div class="lta-cb-dropdown" id="ltamod-bp-dd-${pId}">
                                    <button type="button" class="lta-cb-trigger" onclick="window._ltaToggleCbDd('ltamod-bp-dd-${pId}',event)">
                                        <span class="lta-cb-preview" id="ltamod-bp-preview-${pId}">${selArr.length ? selArr.join(', ') : '— Select —'}</span>
                                        <i class="fas fa-chevron-down" style="font-size:0.6rem;flex-shrink:0;"></i>
                                    </button>
                                    <div class="lta-cb-panel" id="ltamod-bp-panel-${pId}" style="display:none;">
                                        <div class="lta-cb-search-wrap"><input type="text" class="lta-cb-search" placeholder="Search body part..." oninput="window._ltaFilterCb(this,'ltamod-bp-panel-${pId}')"></div>
                                        <div class="lta-cb-list">
                                        ${(typeof LTA_BODY_PARTS !== 'undefined' ? LTA_BODY_PARTS : []).map(o=>`
                                            <label class="lta-cb-item">
                                                <input type="checkbox" value="${o}" ${selArr.includes(o)?'checked':''}
                                                    data-dd="ltamod-bp-dd-${pId}"
                                                    data-preview="ltamod-bp-preview-${pId}"
                                                    onchange="window._ltaUpdateCbPreview('ltamod-bp-dd-${pId}','ltamod-bp-preview-${pId}')">
                                                <span>${o}</span>
                                            </label>`).join('')}
                                        </div>
                                    </div>
                                </div>`;
                            })()}
                        </div>
                        <div class="lta-field">
                            <label>Cause of Injury</label>
                            ${(()=>{
                                const selArr = Array.isArray(e.causeOfInjury) ? e.causeOfInjury
                                    : (e.causeOfInjury ? e.causeOfInjury.split(',').map(v=>v.trim()).filter(Boolean) : []);
                                if (!canEdit) {
                                    return selArr.length
                                        ? `<ul class="lta-plain-list">${selArr.map(s=>`<li>${window._ltaCbLabel(s, e.causeOfInjuryOther)}</li>`).join('')}</ul>`
                                        : `<span class="lta-plain-empty">—</span>`;
                                }
                                return `<div class="lta-cb-dropdown" id="ltamod-ci-dd-${pId}">
                                    <button type="button" class="lta-cb-trigger" onclick="window._ltaToggleCbDd('ltamod-ci-dd-${pId}',event)">
                                        <span class="lta-cb-preview" id="ltamod-ci-preview-${pId}">${selArr.length ? selArr.map(v=>window._ltaCbLabel(v, e.causeOfInjuryOther)).join(', ') : '— Select —'}</span>
                                        <i class="fas fa-chevron-down" style="font-size:0.6rem;flex-shrink:0;"></i>
                                    </button>
                                    <div class="lta-cb-panel" id="ltamod-ci-panel-${pId}" style="display:none;">
                                        <div class="lta-cb-search-wrap"><input type="text" class="lta-cb-search" placeholder="Search cause..." oninput="window._ltaFilterCb(this,'ltamod-ci-panel-${pId}')"></div>
                                        <div class="lta-cb-list">
                                        ${(typeof LTA_CAUSE_OF_INJURY !== 'undefined' ? LTA_CAUSE_OF_INJURY : []).map(o=>`
                                            <label class="lta-cb-item">
                                                <input type="checkbox" value="${o}" ${selArr.includes(o)?'checked':''}
                                                    data-dd="ltamod-ci-dd-${pId}"
                                                    data-preview="ltamod-ci-preview-${pId}"
                                                    onchange="window._ltaUpdateCbPreview('ltamod-ci-dd-${pId}','ltamod-ci-preview-${pId}')">
                                                <span>${o}</span>
                                            </label>`).join('')}
                                        </div>
                                    </div>
                                </div>
                                <input type="text" class="lta-cb-other" id="ltamod-ci-other-${pId}" value="${String(e.causeOfInjuryOther||'').replace(/"/g,'&quot;')}" placeholder="Please specify..." maxlength="200" style="display:${selArr.some(v=>/^others/i.test(v))?'block':'none'};margin-top:6px;width:100%;box-sizing:border-box;" oninput="window._ltaUpdateCbPreview('ltamod-ci-dd-${pId}','ltamod-ci-preview-${pId}')">`;
                            })()}
                        </div>
                        <div class="lta-field">
                            <label>Agent of Injury</label>
                            ${(()=>{
                                const selArr = Array.isArray(e.agentOfInjury) ? e.agentOfInjury
                                    : (e.agentOfInjury ? e.agentOfInjury.split(',').map(v=>v.trim()).filter(Boolean) : []);
                                if (!canEdit) {
                                    return selArr.length
                                        ? `<ul class="lta-plain-list">${selArr.map(s=>`<li>${window._ltaCbLabel(s, e.agentOfInjuryOther)}</li>`).join('')}</ul>`
                                        : `<span class="lta-plain-empty">—</span>`;
                                }
                                return `<div class="lta-cb-dropdown" id="ltamod-ag-dd-${pId}">
                                    <button type="button" class="lta-cb-trigger" onclick="window._ltaToggleCbDd('ltamod-ag-dd-${pId}',event)">
                                        <span class="lta-cb-preview" id="ltamod-ag-preview-${pId}">${selArr.length ? selArr.map(v=>window._ltaCbLabel(v, e.agentOfInjuryOther)).join(', ') : '— Select —'}</span>
                                        <i class="fas fa-chevron-down" style="font-size:0.6rem;flex-shrink:0;"></i>
                                    </button>
                                    <div class="lta-cb-panel" id="ltamod-ag-panel-${pId}" style="display:none;">
                                        <div class="lta-cb-search-wrap"><input type="text" class="lta-cb-search" placeholder="Search agent..." oninput="window._ltaFilterCb(this,'ltamod-ag-panel-${pId}')"></div>
                                        <div class="lta-cb-list">
                                        ${(typeof LTA_AGENT_OF_INJURY !== 'undefined' ? LTA_AGENT_OF_INJURY : []).map(o=>`
                                            <label class="lta-cb-item">
                                                <input type="checkbox" value="${o}" ${selArr.includes(o)?'checked':''}
                                                    data-dd="ltamod-ag-dd-${pId}"
                                                    data-preview="ltamod-ag-preview-${pId}"
                                                    onchange="window._ltaUpdateCbPreview('ltamod-ag-dd-${pId}','ltamod-ag-preview-${pId}')">
                                                <span>${o}</span>
                                            </label>`).join('')}
                                        </div>
                                    </div>
                                </div>
                                <input type="text" class="lta-cb-other" id="ltamod-ag-other-${pId}" value="${String(e.agentOfInjuryOther||'').replace(/"/g,'&quot;')}" placeholder="Please specify..." maxlength="200" style="display:${selArr.some(v=>/^others/i.test(v))?'block':'none'};margin-top:6px;width:100%;box-sizing:border-box;" oninput="window._ltaUpdateCbPreview('ltamod-ag-dd-${pId}','ltamod-ag-preview-${pId}')">`;
                            })()}
                        </div>
                        <div class="lta-field">
                            <label>Occupation</label>
                            <input type="text" name="ltamod-occupation" value="${e.occupation||''}" ${dis} placeholder="e.g. Mason/Carpenter">
                        </div>

                        ${(canEdit || (Array.isArray(e.additionalPersons) && e.additionalPersons.length)) ? `<div class="lta-section-label ltamod-persons-head" style="grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;${e.injuredPersonName==='N/A' ? 'display:none;' : ''}">
                            <span><i class="fas fa-users" style="margin-right:5px;"></i>Other injured persons in this incident <span style="font-size:0.6rem;font-weight:400;color:var(--lm-muted,#888);">(Person 1 is the section above)</span></span>
                            ${canEdit ? `<button type="button" class="lta-ca-add" onclick="window._ltaAddPerson('${pId}')"><i class="fas fa-plus"></i> Add person</button>` : ''}
                        </div>` : ''}
                        <div class="lta-field-full ltamod-persons-wrap" style="grid-column:1/-1;${e.injuredPersonName==='N/A' ? 'display:none;' : ''}">
                            ${(Array.isArray(e.additionalPersons) ? e.additionalPersons : []).map((x, k) => window._ltaPersonCardHtml(pId, x, k, canEdit)).join('')}
                        </div>
                        <div class="lta-field-full ltamod-persons-total" style="grid-column:1/-1;"></div>

                        <div class="lta-section-label" style="grid-column:1/-1;"><i class="fas fa-magnifying-glass" style="margin-right:5px;"></i>Root Cause & Corrective Action</div>

                        <div class="lta-field lta-field-full">
                            <label>Root Cause</label>
                            <textarea name="ltamod-rootCause" ${dis} style="min-height:60px;">${e.rootCause||''}</textarea>
                        </div>
                        <div class="lta-section-label" style="grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;">
                            <span><i class="fas fa-clipboard-list" style="margin-right:5px;"></i>Corrective / Preventive Action</span>
                            ${canEdit ? `<button type="button" class="lta-ca-add" onclick="window._ltaAddCARow('${pId}')"><i class="fas fa-plus"></i> Add Row</button>` : ''}
                        </div>
                        <div class="lta-field lta-field-full" style="margin-top:2px;">
                            <div id="ltamod-ca-tbody-${pId}" class="lta-ca-list">
                                ${(()=>{
                                    // Normalize data: support new array format & legacy single-field format
                                    const rows = Array.isArray(e.correctiveActions) && e.correctiveActions.length
                                        ? e.correctiveActions
                                        : (e.correctiveAction||e.responsible||e.timeline
                                            ? [{action: e.correctiveAction||'', responsible: e.responsible||'', timeline: e.timeline||''}]
                                            : [{action:'',responsible:'',timeline:''}]);
                                    const head = `<div class="lta-ca-head${canEdit ? '' : ' ro'}"><span>Action</span><span>Responsible</span><span>Timeline</span>${canEdit ? '<span class="lta-ca-head-sp"></span>' : ''}</div>`;
                                    return head + rows.map(r => window._ltaCARowHtml(pId, r, canEdit, dis)).join('');
                                })()}
                            </div>
                        </div>

                        <div class="lta-section-label" style="grid-column:1/-1;"><i class="fas fa-list-check" style="margin-right:5px;"></i>Monitoring & Follow-up Results</div>

                        ${(() => {
                            const RES = (typeof LTA_FOLLOWUP_RESULTS !== 'undefined') ? LTA_FOLLOWUP_RESULTS : [];
                            const ORD = { 1: '1st', 2: '2nd', 3: '3rd' };
                            const esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                            const sub = 'font-size:0.62rem;color:var(--lm-muted,#666);font-weight:600;margin:6px 0 2px;display:block;';
                            return [1, 2, 3].map(n => {
                                const k = 'followUp' + n;
                                const res = e[k + 'Result'] || '';
                                const legacy = String(e[k] || '').trim();
                                return `<div class="lta-field">
                                    <label>${ORD[n]} Follow-up</label>
                                    <select name="ltamod-${k}Result" ${dis}
                                        onchange="(function(s){var p=s.closest('.lta-field');
                                            p.querySelector('.fu-in').style.display = s.value==='${RES[2]}' ? 'block' : 'none';})(this)">
                                        <option value="">— Select Result —</option>
                                        ${RES.map(o => `<option value="${esc(o)}" ${res === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
                                    </select>
                                    <span style="${sub}">Date of Follow-up</span>
                                    <input type="date" name="ltamod-${k}Date" value="${esc(e[k + 'Date'])}" ${dis}>
                                    <span style="${sub}">Follow-up By</span>
                                    <input type="text" name="ltamod-${k}By" value="${esc(e[k + 'By'])}" ${dis} placeholder="Enter full name">
                                    <div class="fu-in" style="display:${res === RES[2] ? 'block' : 'none'};">
                                        <span style="${sub}">Reason for Ineffectiveness</span>
                                        <input type="text" name="ltamod-${k}Reason" value="${esc(e[k + 'Reason'])}" ${dis} placeholder="Reason for ineffectiveness">
                                        <span style="${sub}">CAR No.</span>
                                        <input type="text" name="ltamod-${k}CarNo" value="${esc(e[k + 'CarNo'])}" ${dis} placeholder="CAR No.">
                                    </div>
                                    ${legacy ? `<span style="${sub}">Notes (previous free-text entry)</span>
                                    <textarea name="ltamod-${k}" ${dis} rows="3" style="min-height:60px;resize:vertical;">${esc(legacy)}</textarea>` : ''}
                                </div>`;
                            }).join('');
                        })()}

                        <div class="lta-section-label" style="grid-column:1/-1;">
                            <i class="fas fa-calendar-xmark" style="margin-right:5px;"></i>Days Lost / Charged Computation
                        </div>
                        <div class="lta-field-full" style="grid-column:1/-1;">${dlSectionHtml}</div>

                        <div class="lta-section-label" style="grid-column:1/-1;"><i class="fas fa-circle-check" style="margin-right:5px;"></i>Closure</div>

                        <div class="lta-field">
                            <label>Date Closed</label>
                            <input type="date" name="ltamod-dateClosed" value="${e.dateClosed||''}" ${dis}>
                        </div>
                        <div class="lta-field">
                            <label>Status</label>
                            <select name="ltamod-status" ${dis} data-st="${e.status||'Open'}" onchange="this.dataset.st=this.value">
                                ${['Open','Ongoing','Closed'].map(o=>`<option value="${o}" ${(e.status||'Open')===o?'selected':''}>${o}</option>`).join('')}
                            </select>
                        </div>
                        <div class="lta-field lta-field-full">
                            <label>Remarks</label>
                            <input type="text" name="ltamod-remarks" value="${e.remarks||''}" ${dis} placeholder="No remarks">
                        </div>

                    </div>
                </div>
                `,
                foot: canEdit ? `<button class="mdl-btn primary" onclick="window.saveLtaModal('${pnSafe}',${idx})"><i class="fas fa-save" style="margin-right:6px;"></i>${isNew ? 'Add Entry' : 'Save Changes'}</button>
                    <button class="mdl-btn neutral" onclick="eshCloseModal('lta-entry-modal')">Cancel</button>` : ''
            });
            if (canEdit && e.injuredPersonName === 'N/A') window._ltaApplyNAState(pId, true, false);
            window._ltaBuildTabs();
            if (window._ltaDLRefresh) window._ltaDLRefresh();
            if (!canEdit) {
                // View mode: white clean look (styles.css: .lta-vw) + classification badge in the header
                modal.classList.add('lta-vw');
                window._ltaAutoGrow(modal);
                const _cls = Array.isArray(e.incidentClassification) ? e.incidentClassification[0] : e.incidentClassification;
                const _xBtn = modal.querySelector('.mdl-x');
                if (_cls && _xBtn) {
                    const _bd = document.createElement('span');
                    _bd.className = 'lta-vw-badge';
                    _bd.dataset.cls = _cls;
                    _bd.textContent = _cls;
                    _xBtn.parentNode.insertBefore(_bd, _xBtn);
                }
                // View mode: show dates as "13 September 2026" (the date input stays hidden so other code can still read it)
                modal.querySelectorAll('input[type="date"]').forEach(inp => {
                    const txt = window._ltaFmtDate(inp.value);
                    if (!txt) return;
                    const sp = document.createElement('span');
                    sp.className = 'lta-date-view';
                    sp.textContent = txt;
                    inp.style.display = 'none';
                    inp.insertAdjacentElement('afterend', sp);
                });
            } else {
                // Edit mode: remember if the user changed anything (used by the close warning)
                const _mark = ev => { if (ev.isTrusted) modal.dataset.dirty = '1'; };
                modal.addEventListener('input', _mark);
                modal.addEventListener('change', _mark);
                modal.addEventListener('click', ev => {
                    if (ev.isTrusted && ev.target.closest('.lta-ca-add, .lta-ca-del, .ltamod-persons-head button, .ltamod-person-card button')) modal.dataset.dirty = '1';
                });
            }
        };

        // ── Days Lost / Charged card (one shared builder) ───────────────────
        // Three modes: Actual days / Scheduled charge / Not applicable.
        // Injury type state lives in #ltamod-dl-card dataset.userType (read on save). Radios only exist for Actual-days types and N/A.
        window._ltaEnsureDLStyles = function() {
            /* CSS moved to styles.css */
        };

        window._ltaBuildDLHtml = function(e, dis, scOpts) {
            window._ltaEnsureDLStyles();
            const esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            const types = (typeof LTA_INJURY_TYPES !== 'undefined') ? LTA_INJURY_TYPES : [];
            const userType = e.injuryType || 'temporary';
            const defOf = v => types.find(t => t.value === v);
            const lastActual = (defOf(userType) && !defOf(userType).useScheduled && userType !== 'na') ? userType : 'temporary';
            const lastSched  = (defOf(userType) && defOf(userType).useScheduled) ? userType : 'permanent';
            const pill = t => `<label class="ltadl-pill"><input type="radio" name="ltamod-injuryType" value="${t.value}" ${t.value === userType ? 'checked' : ''} ${dis} onchange="window._ltaDLSetType(this.value)"><span>${esc(t.label)}</span></label>`;
            const modeBtn = (m, t, n) => `<button type="button" class="ltadl-mode" data-mode="${m}" aria-pressed="false" ${dis} onclick="window._ltaDLSetMode('${m}')"><span class="t">${t}</span><span class="n">${n}</span></button>`;
            return `<div class="ltadl" id="ltamod-dl-card" data-mode="actual" data-lock="" data-canedit="${dis ? '0' : '1'}"
                    data-user-type="${esc(userType)}" data-last-actual="${esc(lastActual)}" data-last-sched="${esc(lastSched)}" data-user-sc="${esc(e.scheduledChargeItem)}">
                <div class="ltadl-modes" role="group" aria-label="Days lost method">
                    ${modeBtn('actual', 'Actual days', 'Date of accident to RTW')}
                    ${modeBtn('scheduled', 'Scheduled charge', 'Fixed days, Table 6')}
                    ${modeBtn('na', 'Not applicable', 'Not counted')}
                </div>
                <div class="ltadl-note" role="note"></div>
                <div class="ltadl-title">Actual Days Lost</div>
                <div class="ltadl-types ltadl-types-actual">${types.filter(t => t.value !== 'na' && !t.useScheduled).map(pill).join('')}</div>
                <input type="radio" name="ltamod-injuryType" value="na" ${userType === 'na' ? 'checked' : ''} ${dis} style="display:none;" tabindex="-1" aria-hidden="true">
                <div class="ltadl-fields">
                    <div class="lta-field ltadl-doa"><label>Date of accident</label>
                        <input type="date" name="ltamod-dateOfAccident" value="${esc(e.dateOfAccident)}" ${dis} oninput="window._ltaDLRefresh()" onchange="window._ltaDLRefresh()"></div>
                    <div class="lta-field ltadl-rtw"><label>Date return to work (RTW)</label>
                        <input type="date" name="ltamod-dateRTW" value="${esc(e.dateRTW)}" ${dis} oninput="window._ltaDLRefresh()" onchange="window._ltaDLRefresh()"></div>
                    <div class="lta-field ltadl-sc"><label>Scheduled charge item</label>
                        <select name="ltamod-scheduledChargeItem" ${dis} onchange="window._ltaDLSetSc(this.value)">
                            <option value="">— Select injury/condition —</option>${scOpts || ''}
                        </select></div>
                </div>
                <div class="ltadl-result" id="ltamod-dl-result" aria-live="polite">
                    <span class="ltadl-num">0</span><span class="ltadl-lbl"></span><span class="ltadl-sub"></span>
                </div>
            </div>`;
        };

        window._ltaDLRefresh = function() {
            const card = document.getElementById('ltamod-dl-card');
            if (!card) return;
            const scope = document.getElementById('lta-entry-modal') || document;
            const clsEl = scope.querySelector('[name="ltamod-incidentClassification"]');
            const cls = clsEl ? clsEl.value : '';
            const canEdit = card.dataset.canedit === '1';
            const types = (typeof LTA_INJURY_TYPES !== 'undefined') ? LTA_INJURY_TYPES : [];
            const rule = window.ltaClassDlRule(cls);
            const lock = rule.lock;
            const userType = card.dataset.userType || 'temporary';
            const eff = window.ltaEffectiveInjuryType({ incidentClassification: cls, injuryType: userType });
            const effDef = types.find(t => t.value === eff);
            const mode = eff === 'na' ? 'na' : (effDef && effDef.useScheduled ? 'scheduled' : 'actual');

            card.dataset.mode = mode;
            card.dataset.lock = lock;
            const note = card.querySelector('.ltadl-note');
            if (note) note.textContent = rule.reason;

            card.querySelectorAll('input[name="ltamod-injuryType"]').forEach(r => {
                r.checked = (r.value === eff);
                if (r.value === 'na') return;
                const d = types.find(t => t.value === r.value);
                let off = !canEdit || lock === 'na' || lock === 'fatality';
                if (lock === 'rwc' && ((d && !d.useScheduled) || r.value === 'fatality')) off = true;
                r.disabled = off;
            });
            card.querySelectorAll('.ltadl-mode').forEach(b => {
                const m = b.dataset.mode;
                b.setAttribute('aria-pressed', m === mode ? 'true' : 'false');
                b.disabled = !canEdit || lock === 'na' || lock === 'fatality' || (lock === 'rwc' && m === 'actual') || (lock === 'nona' && m === 'na');
            });

            const sc = card.querySelector('[name="ltamod-scheduledChargeItem"]');
            if (sc) {
                if (lock === 'fatality') {
                    if (card.dataset.forced !== '1') { card.dataset.userSc = sc.value; card.dataset.forced = '1'; }
                    sc.value = 'Fatality';
                    sc.disabled = true;
                } else {
                    if (card.dataset.forced === '1') { sc.value = card.dataset.userSc || ''; card.dataset.forced = ''; }
                    sc.disabled = !canEdit;
                }
            }

            const doa = (card.querySelector('[name="ltamod-dateOfAccident"]') || {}).value || '';
            const rtw = (card.querySelector('[name="ltamod-dateRTW"]') || {}).value || '';
            const item = sc ? sc.value : '';
            const r = (typeof window.computeDaysCharged === 'function')
                ? window.computeDaysCharged({ incidentClassification: cls, injuryType: userType, dateOfAccident: doa, dateRTW: rtw, scheduledChargeItem: item })
                : { daysCharged: 0 };
            const n = r.daysCharged || 0;
            card.dataset.dl = String(mode === 'na' ? 0 : n);
            if (window._ltaPersonsRefreshAll) window._ltaPersonsRefreshAll();
            const num = card.querySelector('.ltadl-num'), lbl = card.querySelector('.ltadl-lbl'), sub = card.querySelector('.ltadl-sub');
            if (!num || !lbl || !sub) return;
            num.classList.toggle('has', mode !== 'na' && n > 0);
            if (mode === 'na') {
                num.textContent = '0'; lbl.textContent = 'days';
                sub.textContent = 'Not added to Medical tab: Days Lost/Charged';
            } else if (mode === 'scheduled') {
                num.textContent = n.toLocaleString(); lbl.textContent = 'days charged';
                sub.textContent = !item ? 'Pick the scheduled item' : (!doa ? 'Add the date of accident so it counts in the right month' : 'ANSI Z16.1, Table 6');
            } else {
                num.textContent = n.toLocaleString(); lbl.textContent = n === 1 ? 'day lost' : 'days lost';
                sub.textContent = (doa && rtw) ? 'Excludes Sundays. Counts from the day after the accident' : 'Fill in both dates to compute';
            }
        };

        window._ltaDLSetMode = function(mode) {
            const card = document.getElementById('ltamod-dl-card');
            if (!card) return;
            if (mode === 'na' && card.dataset.lock === 'nona') return; // LTA / Medical Treatment / First Aid: N/A not allowed
            card.dataset.userType = mode === 'na' ? 'na'
                : (mode === 'scheduled' ? (card.dataset.lastSched || 'permanent') : (card.dataset.lastActual || 'temporary'));
            window._ltaDLRefresh();
        };

        window._ltaDLSetType = function(value) {
            const card = document.getElementById('ltamod-dl-card');
            if (!card) return;
            card.dataset.userType = value;
            const types = (typeof LTA_INJURY_TYPES !== 'undefined') ? LTA_INJURY_TYPES : [];
            const d = types.find(t => t.value === value);
            if (d && value !== 'na') {
                if (d.useScheduled) card.dataset.lastSched = value; else card.dataset.lastActual = value;
            }
            const sc = card.querySelector('[name="ltamod-scheduledChargeItem"]');
            if (value === 'fatality' && sc && !sc.value) { sc.value = 'Fatality'; card.dataset.userSc = 'Fatality'; }
            window._ltaDLRefresh();
        };

        window._ltaDLSetSc = function(value) {
            const card = document.getElementById('ltamod-dl-card');
            if (card) card.dataset.userSc = value;
            window._ltaDLRefresh();
        };

        // ---- Other injured persons (persons 2..N of one incident) ----
        // Each card has its own classification, injury details and days lost method.
        // Date of accident, root cause, corrective actions and follow-ups stay shared by the incident.
        window._ltaPersonCardHtml = function(pId, x, k, canEdit) {
            x = x || {};
            const esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            const dis = canEdit ? '' : 'disabled';
            const arr = v => Array.isArray(v) ? v : (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
            const types = (typeof LTA_INJURY_TYPES !== 'undefined') ? LTA_INJURY_TYPES : [];
            const classes = (typeof LTA_INCIDENT_CLASSIFICATION !== 'undefined') ? LTA_INCIDENT_CLASSIFICATION : [];
            const groups = (typeof SCHEDULED_CHARGES_GROUPS !== 'undefined') ? SCHEDULED_CHARGES_GROUPS : [];
            const userType = x.injuryType || 'temporary';
            const clsVal = Array.isArray(x.incidentClassification) ? (x.incidentClassification[0] || '') : (x.incidentClassification || '');
            const scOpts = groups.map(g => '<optgroup label="' + esc(g.group) + '">' + g.items.map(item =>
                '<option value="' + esc(item) + '"' + (x.scheduledChargeItem === item ? ' selected' : '') + '>' + esc(item) + ' - ' + (SCHEDULED_CHARGES[item] || 0).toLocaleString() + ' days</option>'
            ).join('') + '</optgroup>').join('');
            const dd = (key, label, list, vals, other) => {
                const ddId = 'ltamod-p' + k + '-' + key + '-dd-' + pId;
                const prvId = 'ltamod-p' + k + '-' + key + '-preview-' + pId;
                const panId = 'ltamod-p' + k + '-' + key + '-panel-' + pId;
                const hasOther = (key === 'ci' || key === 'ag');
                if (!canEdit) {
                    return '<div class="lta-field"><label>' + label + '</label>' + (vals.length
                        ? '<ul class="lta-plain-list">' + vals.map(s => '<li>' + esc(window._ltaCbLabel(s, other)) + '</li>').join('') + '</ul>'
                        : '<span class="lta-plain-empty">-</span>') + '</div>';
                }
                return `<div class="lta-field"><label>${label}</label>
                    <div class="lta-cb-dropdown" id="${ddId}">
                        <button type="button" class="lta-cb-trigger" onclick="window._ltaToggleCbDd('${ddId}',event)">
                            <span class="lta-cb-preview" id="${prvId}">${vals.length ? esc(vals.map(v => window._ltaCbLabel(v, other)).join(', ')) : '- Select -'}</span>
                            <i class="fas fa-chevron-down" style="font-size:0.6rem;flex-shrink:0;"></i>
                        </button>
                        <div class="lta-cb-panel" id="${panId}" style="display:none;">
                            <div class="lta-cb-search-wrap"><input type="text" class="lta-cb-search" placeholder="Search..." oninput="window._ltaFilterCb(this,'${panId}')"></div>
                            <div class="lta-cb-list">
                                ${list.map(o => `<label class="lta-cb-item"><input type="checkbox" value="${esc(o)}" ${vals.includes(o) ? 'checked' : ''} onchange="window._ltaUpdateCbPreview('${ddId}','${prvId}')"><span>${esc(o)}</span></label>`).join('')}
                            </div>
                        </div>
                    </div>
                    ${hasOther ? `<input type="text" class="lta-cb-other" id="ltamod-p${k}-${key}-other-${pId}" value="${esc(other)}" placeholder="Please specify..." maxlength="200" style="display:${vals.some(v => /^others/i.test(v)) ? 'block' : 'none'};margin-top:6px;width:100%;box-sizing:border-box;" oninput="window._ltaUpdateCbPreview('${ddId}','${prvId}')">` : ''}
                </div>`;
            };
            return `<div class="ltamod-person-card" data-k="${k}" data-canedit="${canEdit ? '1' : '0'}" data-user-type="${esc(userType)}" style="border:1.5px solid #c8e6c9;border-radius:8px;padding:10px 12px;margin:8px 0;background:var(--bg-card);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <span class="ltamod-person-title" style="font-size:0.74rem;font-weight:800;color:#1b5e20;">Person</span>
                    ${canEdit ? `<button type="button" class="lta-ca-del" title="Remove this person" onclick="window._ltaRemovePerson('${pId}',${k})"><i class="fas fa-times"></i></button>` : ''}
                </div>
                <div class="lta-grid">
                    <div class="lta-field"><label>Injured Person Name / Age</label>
                        <input type="text" data-pf="injuredPersonName" value="${esc(x.injuredPersonName)}" ${dis} placeholder="e.g. Juan dela Cruz, 35"></div>
                    <div class="lta-field"><label>Occupation</label>
                        <input type="text" data-pf="occupation" value="${esc(x.occupation)}" ${dis} placeholder="e.g. Mason/Carpenter"></div>
                    <div class="lta-field"><label>Incident Classification</label>
                        <select data-pf="incidentClassification" ${dis} onchange="window._ltaPersonsRefreshAll()">
                            <option value="">- Select -</option>
                            ${classes.map(o => '<option value="' + esc(o) + '"' + (clsVal === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('')}
                        </select></div>
                    ${dd('ni', 'Nature of Injury', (typeof LTA_NATURE_OF_INJURY !== 'undefined' ? LTA_NATURE_OF_INJURY : []), arr(x.natureOfInjury), '')}
                    ${dd('bp', 'Body Parts Affected', (typeof LTA_BODY_PARTS !== 'undefined' ? LTA_BODY_PARTS : []), arr(x.bodyPartsAffected), '')}
                    ${dd('ci', 'Cause of Injury', (typeof LTA_CAUSE_OF_INJURY !== 'undefined' ? LTA_CAUSE_OF_INJURY : []), arr(x.causeOfInjury), x.causeOfInjuryOther)}
                    ${dd('ag', 'Agent of Injury', (typeof LTA_AGENT_OF_INJURY !== 'undefined' ? LTA_AGENT_OF_INJURY : []), arr(x.agentOfInjury), x.agentOfInjuryOther)}
                    <div class="lta-field"><label>Days lost method</label>
                        <select data-pf="injuryType" ${dis} onchange="window._ltaPersonTypeChanged(this)">
                            ${types.map(t => '<option value="' + esc(t.value) + '"' + (t.value === userType ? ' selected' : '') + '>' + esc(t.label) + '</option>').join('')}
                        </select></div>
                    <div class="lta-field" data-pwrap="rtw"><label>Date return to work (RTW)</label>
                        <input type="date" data-pf="dateRTW" value="${esc(x.dateRTW)}" ${dis} oninput="window._ltaPersonsRefreshAll()" onchange="window._ltaPersonsRefreshAll()"></div>
                    <div class="lta-field" data-pwrap="sc"><label>Scheduled charge item</label>
                        <select data-pf="scheduledChargeItem" ${dis} onchange="window._ltaPersonsRefreshAll()">
                            <option value="">- Select injury/condition -</option>${scOpts}
                        </select></div>
                    <div class="lta-field lta-field-full">
                        <div class="ltamod-person-note" style="font-size:0.62rem;color:var(--lm-muted,#888);"></div>
                        <div class="ltamod-person-result" style="font-size:0.78rem;font-weight:800;color:#c62828;"></div>
                    </div>
                </div>
            </div>`;
        };

        // The person picked a days lost method: remember it (the classification may force another one for now).
        window._ltaPersonTypeChanged = function(sel) {
            const card = sel.closest('.ltamod-person-card');
            if (card) card.dataset.userType = sel.value;
            window._ltaPersonsRefreshAll();
        };

        // Recompute one person card. Returns the days charged for that person.
        window._ltaPersonRefresh = function(card) {
            const q = f => card.querySelector('[data-pf="' + f + '"]');
            const canEdit = card.dataset.canedit === '1';
            const types = (typeof LTA_INJURY_TYPES !== 'undefined') ? LTA_INJURY_TYPES : [];
            const clsEl = q('incidentClassification'), typeEl = q('injuryType'), scEl = q('scheduledChargeItem'), rtwEl = q('dateRTW');
            if (!clsEl || !typeEl || !scEl || !rtwEl) return 0;
            const cls = clsEl.value;
            const rule = window.ltaClassDlRule(cls);
            const eff = window.ltaEffectiveInjuryType({ incidentClassification: cls, injuryType: card.dataset.userType || typeEl.value });
            typeEl.value = eff;
            Array.from(typeEl.options).forEach(o => {
                const d = types.find(t => t.value === o.value);
                let off = false;
                if (rule.lock === 'na' || rule.lock === 'fatality') off = o.value !== eff;
                else if (rule.lock === 'rwc') off = (o.value !== 'na' && !!d && !d.useScheduled) || o.value === 'fatality';
                else if (rule.lock === 'nona') off = o.value === 'na';
                o.disabled = off;
            });
            typeEl.disabled = !canEdit || rule.lock === 'na' || rule.lock === 'fatality';
            if (rule.lock === 'fatality') {
                if (card.dataset.forcedSc !== '1') { card.dataset.userSc = scEl.value; card.dataset.forcedSc = '1'; }
                scEl.value = 'Fatality';
            } else if (card.dataset.forcedSc === '1') {
                scEl.value = card.dataset.userSc || ''; card.dataset.forcedSc = '';
            }
            scEl.disabled = !canEdit || rule.lock === 'fatality';
            const effDef = types.find(t => t.value === eff);
            const useSc = !!(effDef && effDef.useScheduled);
            const wRtw = card.querySelector('[data-pwrap="rtw"]'), wSc = card.querySelector('[data-pwrap="sc"]');
            if (wRtw) wRtw.style.display = (eff !== 'na' && !useSc) ? '' : 'none';
            if (wSc) wSc.style.display = useSc ? '' : 'none';
            const doaEl = document.querySelector('#lta-entry-modal [name="ltamod-dateOfAccident"]');
            const doa = doaEl ? doaEl.value : '';
            const r = window.computeDaysCharged({ incidentClassification: cls, injuryType: eff, dateOfAccident: doa, dateRTW: rtwEl.value, scheduledChargeItem: scEl.value });
            const n = (eff === 'na') ? 0 : (r.daysCharged || 0);
            const out = card.querySelector('.ltamod-person-result');
            if (out) {
                if (eff === 'na') out.textContent = '0 days. Not added to Days Lost/Charged.';
                else if (useSc) out.textContent = scEl.value ? n.toLocaleString() + ' days charged (Table 6)' : 'Pick the scheduled item';
                else out.textContent = (doa && rtwEl.value) ? n + (n === 1 ? ' day lost' : ' days lost') : 'Fill in the date of accident above and the RTW date';
            }
            const note = card.querySelector('.ltamod-person-note');
            if (note) note.textContent = rule.reason;
            card.dataset.dl = String(n);
            return n;
        };

        // Recompute every person card and the incident total (Person 1 + the other persons).
        window._ltaPersonsRefreshAll = function() {
            const modal = document.getElementById('lta-entry-modal');
            const wrap = modal && modal.querySelector('.ltamod-persons-wrap');
            if (!wrap) return;
            const tot = modal.querySelector('.ltamod-persons-total');
            const cards = Array.from(wrap.querySelectorAll('.ltamod-person-card'));
            const main = document.getElementById('ltamod-dl-card');
            let total = main ? (parseFloat(main.dataset.dl) || 0) : 0;
            cards.forEach((c, i) => {
                const t = c.querySelector('.ltamod-person-title');
                if (t) t.textContent = 'Person ' + (i + 2);
                total += window._ltaPersonRefresh(c);
            });
            if (tot) {
                tot.innerHTML = cards.length
                    ? '<div style="padding:8px 12px;border-radius:8px;background:#fff8e1;border:1px solid #ffe082;color:#e65100;font-size:0.75rem;font-weight:800;">Total for this incident (all persons): ' + total.toLocaleString() + ' days charged</div>'
                    : '';
            }
        };

        window._ltaAddPerson = function(pId) {
            const modal = document.getElementById('lta-entry-modal');
            const wrap = modal && modal.querySelector('.ltamod-persons-wrap');
            if (!wrap) return;
            const naBtn = document.getElementById('ltamod-naBtn-' + pId);
            if (naBtn && naBtn.dataset.isna === '1') { showToast('Turn off N/A in the Injured Person section first.', 'error', 3500); return; }
            window._ltaPersonSeq = (window._ltaPersonSeq || 0) + 1;
            const clsEl = modal.querySelector('[name="ltamod-incidentClassification"]');
            const x = { incidentClassification: clsEl ? clsEl.value : 'LTA', injuryType: 'temporary' };
            wrap.insertAdjacentHTML('beforeend', window._ltaPersonCardHtml(pId, x, window._ltaPersonSeq, true));
            window._ltaPersonsRefreshAll();
            const last = wrap.lastElementChild;
            const nameEl = last && last.querySelector('[data-pf="injuredPersonName"]');
            if (nameEl) nameEl.focus();
        };

        window._ltaRemovePerson = function(pId, k) {
            const modal = document.getElementById('lta-entry-modal');
            const card = modal && modal.querySelector('.ltamod-person-card[data-k="' + k + '"]');
            if (card) card.remove();
            window._ltaPersonsRefreshAll();
        };

        // Read the person cards into plain objects (same rules as Person 1 on save).
        window._ltaReadPersons = function(modal) {
            const out = [];
            modal.querySelectorAll('.ltamod-persons-wrap .ltamod-person-card').forEach(card => {
                const k = card.dataset.k;
                const q = f => card.querySelector('[data-pf="' + f + '"]');
                const vals = key => {
                    const d = card.querySelector('[id^="ltamod-p' + k + '-' + key + '-dd-"]');
                    return d ? Array.from(d.querySelectorAll('input[type=checkbox]:checked')).map(c => c.value) : [];
                };
                const other = key => {
                    const i = card.querySelector('[id^="ltamod-p' + k + '-' + key + '-other-"]');
                    return i ? i.value.trim() : '';
                };
                const cls = q('incidentClassification').value;
                const p = {
                    injuredPersonName: q('injuredPersonName').value.trim(),
                    occupation: q('occupation').value.trim(),
                    incidentClassification: cls,
                    natureOfInjury: vals('ni'),
                    bodyPartsAffected: vals('bp'),
                    causeOfInjury: vals('ci'),
                    agentOfInjury: vals('ag'),
                    dateRTW: q('dateRTW').value,
                    scheduledChargeItem: q('scheduledChargeItem').value
                };
                p.causeOfInjuryOther = p.causeOfInjury.some(v => /^others/i.test(v)) ? other('ci') : '';
                p.agentOfInjuryOther = p.agentOfInjury.some(v => /^others/i.test(v)) ? other('ag') : '';
                p.injuryType = window.ltaEffectiveInjuryType({ incidentClassification: cls, injuryType: card.dataset.userType || q('injuryType').value });
                if (window.ltaClassKind(cls) === 'fatality') p.scheduledChargeItem = 'Fatality';
                out.push(p);
            });
            return out;
        };

        // Apply / remove "Not Applicable" state for the whole Injured Person section
        window._ltaApplyNAState = function(pId, on, clear) {
            if (clear === undefined) clear = true;
            const inp = document.getElementById('ltamod-injperson-' + pId);
            const btn = document.getElementById('ltamod-naBtn-' + pId);
            const modal = document.getElementById('lta-entry-modal');
            if (!inp || !btn || !modal) return;
            const grey = on ? '#f5f5f5' : '';
            inp.disabled = on;
            if (on && clear) inp.value = '';
            inp.placeholder = on ? 'N/A — Not Applicable' : 'e.g. Juan dela Cruz, 35';
            inp.style.background = grey; inp.style.color = on ? '#999' : ''; inp.style.fontStyle = on ? 'italic' : '';
            const occ = modal.querySelector('[name="ltamod-occupation"]');
            if (occ) {
                occ.disabled = on;
                if (on && clear) occ.value = '';
                occ.placeholder = on ? 'N/A — Not Applicable' : 'e.g. Mason/Carpenter';
                occ.style.background = grey; occ.style.color = on ? '#999' : ''; occ.style.fontStyle = on ? 'italic' : '';
            }
            ['ni', 'bp', 'ci', 'ag'].forEach(k => {
                const dd = document.getElementById(`ltamod-${k}-dd-${pId}`);
                if (!dd) return;
                if (on && clear) dd.querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = false; });
                const otherInp = document.getElementById(`ltamod-${k}-other-${pId}`);
                if (otherInp && on) { if (clear) otherInp.value = ''; otherInp.style.display = 'none'; }
                const trig = dd.querySelector('.lta-cb-trigger');
                const pan = dd.querySelector('.lta-cb-panel');
                const prv = dd.querySelector('.lta-cb-preview');
                if (trig) { trig.disabled = on; trig.style.background = grey; trig.style.opacity = on ? '0.6' : ''; trig.style.cursor = on ? 'not-allowed' : ''; }
                if (pan && on) pan.style.display = 'none';
                if (prv) {
                    const vals = Array.from(dd.querySelectorAll('input[type=checkbox]:checked')).map(c => c.value);
                    prv.textContent = on ? 'N/A' : (vals.length ? vals.join(', ') : '— Select —');
                }
            });
            btn.dataset.isna = on ? '1' : '0';
            btn.textContent = on ? '✓ N/A' : 'N/A';
            btn.style.borderColor = on ? '#2e7d32' : '#bbb';
            btn.style.background = on ? '#e8f5e9' : '#f9f9f9';
            btn.style.color = on ? '#2e7d32' : '#888';
            // Other injured persons only make sense when there is an injured person
            const _pw = modal.querySelector('.ltamod-persons-wrap');
            const _ph = modal.querySelector('.ltamod-persons-head');
            const _pt = modal.querySelector('.ltamod-persons-total');
            if (_pw) { if (on && clear) _pw.innerHTML = ''; _pw.style.display = on ? 'none' : ''; }
            if (_ph) _ph.style.display = on ? 'none' : 'flex';
            if (_pt) _pt.style.display = on ? 'none' : '';
            if (!on && window._ltaPersonsRefreshAll) window._ltaPersonsRefreshAll();
        };

        window._ltaModalToggleNA = function(pId) {
            const btn = document.getElementById('ltamod-naBtn-' + pId);
            if (!btn) return;
            window._ltaApplyNAState(pId, btn.dataset.isna !== '1', true);
        };

        // ── Corrective Action table row helpers ────────────────────────────────

        // (Checkbox dropdown CSS moved to styles.css)

        // Close all checkbox dropdowns when clicking outside
        if (!window._ltaCbOutsideListenerAdded) {
            window._ltaCbOutsideListenerAdded = true;
            document.addEventListener('click', function(ev) {
                document.querySelectorAll('.lta-cb-panel').forEach(panel => {
                    if (!panel.closest('.lta-cb-dropdown').contains(ev.target)) {
                        panel.style.display = 'none';
                    }
                });
            });
        }

        window._ltaToggleCbDd = function(ddId, ev) {
            ev.stopPropagation();
            const dd = document.getElementById(ddId);
            if (!dd) return;
            const panel = dd.querySelector('.lta-cb-panel');
            document.querySelectorAll('.lta-cb-panel').forEach(p => { if (p !== panel) p.style.display = 'none'; });
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            if (panel.style.display === 'block') setTimeout(() => panel.querySelector('.lta-cb-search')?.focus(), 50);
        };

        // "Others (Please Specify)" + typed text -> "Others: <text>"
        window._ltaCbLabel = function(v, other) {
            const t = String(other || '').trim();
            return (/^others/i.test(v) && t) ? ('Others: ' + t) : v;
        };

        window._ltaUpdateCbPreview = function(ddId, previewId) {
            const dd = document.getElementById(ddId);
            const preview = document.getElementById(previewId);
            if (!dd || !preview) return;
            const checked = Array.from(dd.querySelectorAll('input[type=checkbox]:checked')).map(c => c.value);
            // Inline "please specify" input (Cause / Agent of Injury)
            const otherInp = document.getElementById(previewId.replace('-preview-', '-other-'));
            const hasOther = checked.some(v => /^others/i.test(v));
            if (otherInp) {
                otherInp.style.display = hasOther ? 'block' : 'none';
            }
            const otherTxt = otherInp ? otherInp.value : '';
            preview.textContent = checked.length ? checked.map(v => window._ltaCbLabel(v, otherTxt)).join(', ') : '— Select —';
        };

        window._ltaFilterCb = function(input, panelId) {
            const q = input.value.toLowerCase();
            const panel = document.getElementById(panelId);
            if (!panel) return;
            panel.querySelectorAll('.lta-cb-item').forEach(item => {
                item.classList.toggle('hidden', !item.querySelector('span').textContent.toLowerCase().includes(q));
            });
        };

        window._ltaClearFactorCb = function(ddId, previewId, clearChk) {
            // When "N/A (clear all)" is clicked, uncheck all real options
            const dd = document.getElementById(ddId);
            const preview = document.getElementById(previewId);
            if (!dd || !preview) return;
            dd.querySelectorAll('input[type=checkbox]').forEach(c => {
                if (c.value !== '__CLEAR__') c.checked = false;
            });
            clearChk.checked = false; // uncheck the N/A box itself too (it's a trigger, not a state)
            preview.textContent = 'N/A';
        };
        // ─────────────────────────────────────────────────────────────────────

window._ltaCARowHtml = function(pId, r, canEdit, dis) {
            const esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;');
            r = r || {};
            return `<div class="lta-ca-row${canEdit ? '' : ' ro'}">
                <div class="lta-field"><label>Action</label>
                    <textarea rows="2" ${dis || ''} data-ca-field="action" placeholder="Describe corrective/preventive action...">${esc(r.action)}</textarea></div>
                <div class="lta-field"><label>Responsible</label>
                    <textarea rows="2" ${dis || ''} data-ca-field="responsible" placeholder="e.g. Safety Officer">${esc(r.responsible)}</textarea></div>
                <div class="lta-field"><label>Timeline</label>
                    <textarea rows="2" ${dis || ''} data-ca-field="timeline" placeholder="e.g. Immediate">${esc(r.timeline)}</textarea></div>
                ${canEdit ? `<button type="button" class="lta-ca-del" title="Remove row" onclick="window._ltaRemoveCARow('${pId}',this)"><i class="fas fa-times"></i></button>` : ''}
            </div>`;
        };

        window._ltaAddCARow = function(pId) {
            const list = document.getElementById('ltamod-ca-tbody-' + pId);
            if (!list) return;
            list.insertAdjacentHTML('beforeend', window._ltaCARowHtml(pId, {}, true, ''));
            const last = list.lastElementChild;
            if (last) last.querySelector('[data-ca-field="action"]').focus();
        };

        window._ltaRemoveCARow = function(pId, btn) {
            const list = document.getElementById('ltamod-ca-tbody-' + pId);
            if (!list) return;
            const row = btn.closest('.lta-ca-row');
            // Never remove the last row — just clear it instead
            if (list.querySelectorAll('.lta-ca-row').length <= 1) {
                row.querySelectorAll('textarea').forEach(ta => ta.value = '');
                return;
            }
            row.remove();
        };
        // ──────────────────────────────────────────────────────────────────────

        window.saveLtaModal = function(pName, idx) {
            const modal = document.getElementById('lta-entry-modal');
            if (!modal) return;
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p.region, 'medical');
            if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }

            // Added persons need a name. A card without a name would still be counted as a person.
            {
                const _naB = document.getElementById('ltamod-naBtn-' + pName.replace(/[^a-zA-Z0-9]/g,'_'));
                if (!(_naB && _naB.dataset.isna === '1')) {
                    const _bad = Array.from(modal.querySelectorAll('.ltamod-persons-wrap .ltamod-person-card'))
                        .find(c => !(((c.querySelector('[data-pf="injuredPersonName"]') || {}).value) || '').trim());
                    if (_bad) { showToast('Enter the name of each added person, or remove the card.', 'error', 4000); if (modal._ltaGo) modal._ltaGo('Incident Information'); return; }
                }
            }

            // Basic checks before saving
            {
                const _v = n => { const el = modal.querySelector('[name="ltamod-' + n + '"]'); return el ? String(el.value || '').trim() : ''; };
                if (_v('status') === 'Closed' && !_v('dateClosed')) {
                    showToast('Status is Closed. Enter the Date Closed, or change the Status.', 'error', 4500); if (modal._ltaGo) modal._ltaGo('Closure', 'dateClosed'); return;
                }
                const _rtwEl = modal.querySelector('[name="ltamod-dateRTW"]');
                const _doa = _v('dateOfAccident'), _rtw = _v('dateRTW');
                if (_rtwEl && _rtwEl.offsetParent !== null && _doa && _rtw && _rtw < _doa) {
                    showToast('Date Return to Work cannot be earlier than the Date of Accident.', 'error', 4500); if (modal._ltaGo) modal._ltaGo('Days Lost', 'dateRTW'); return;
                }
            }

            if (!p.vals['lta-registry_entries']) p.vals['lta-registry_entries'] = [];
            const isNew = (idx === -1);
            if (isNew) {
                p.vals['lta-registry_entries'].push({});
                idx = p.vals['lta-registry_entries'].length - 1;
            }
            const entry = p.vals['lta-registry_entries'][idx];

            // Read all named fields from modal
            const pId = pName.replace(/[^a-zA-Z0-9]/g,'_');
            const naBtn = document.getElementById('ltamod-naBtn-' + pId);
            const injpersonIsNA = naBtn && naBtn.dataset.isna === '1';

            const fields = [
                'aiirNo','dateReported','locationOfIncident','natureOfIncident','natureOfIncidentOther',
                'incidentClassification','detailsFacts','injuredPersonName',
                'occupation',
                'rootCause',
                'followUp1','followUp2','followUp3',
                'followUp1Result','followUp1Date','followUp1By','followUp1Reason','followUp1CarNo',
                'followUp2Result','followUp2Date','followUp2By','followUp2Reason','followUp2CarNo',
                'followUp3Result','followUp3Date','followUp3By','followUp3Reason','followUp3CarNo',
                'dateOfAccident','dateRTW','scheduledChargeItem',
                'dateClosed','status','remarks'
            ];
            fields.forEach(f => {
                const el = modal.querySelector(`[name="ltamod-${f}"]`);
                if (el) entry[f] = el.value;
            });
            if (entry.natureOfIncident !== 'Others') entry.natureOfIncidentOther = '';
            else entry.natureOfIncidentOther = (entry.natureOfIncidentOther || '').trim();
            // Clear conditional follow-up fields that no longer apply to the chosen Result
            [1, 2, 3].forEach(n => {
                const r = entry['followUp' + n + 'Result'] || '';
                if (r !== LTA_FOLLOWUP_RESULTS[2]) { entry['followUp' + n + 'Reason'] = ''; entry['followUp' + n + 'CarNo'] = ''; }
            });

            // Read checkbox dropdown values for nature of injury & body parts
            const niDd = document.getElementById('ltamod-ni-dd-' + pId);
            if (niDd) {
                entry.natureOfInjury = Array.from(niDd.querySelectorAll('input[type=checkbox]:checked')).map(c => c.value);
            }
            const bpDd = document.getElementById('ltamod-bp-dd-' + pId);
            if (bpDd) {
                entry.bodyPartsAffected = Array.from(bpDd.querySelectorAll('input[type=checkbox]:checked')).map(c => c.value);
            }
            const ciDd = document.getElementById('ltamod-ci-dd-' + pId);
            if (ciDd) {
                entry.causeOfInjury = Array.from(ciDd.querySelectorAll('input[type=checkbox]:checked')).map(c => c.value);
                entry.causeOfInjuryOther = entry.causeOfInjury.some(v => /^others/i.test(v))
                    ? (document.getElementById('ltamod-ci-other-' + pId)?.value || '').trim() : '';
            }
            const agDd = document.getElementById('ltamod-ag-dd-' + pId);
            if (agDd) {
                entry.agentOfInjury = Array.from(agDd.querySelectorAll('input[type=checkbox]:checked')).map(c => c.value);
                entry.agentOfInjuryOther = entry.agentOfInjury.some(v => /^others/i.test(v))
                    ? (document.getElementById('ltamod-ag-other-' + pId)?.value || '').trim() : '';
            }

            // Read factor checkbox dropdowns (PEOPLE, EQUIPMENT, MATERIALS, ENVIRONMENT, ORGANIZATIONAL)
            ['PEOPLE','EQUIPMENT','MATERIALS','ENVIRONMENT','ORGANIZATIONAL'].forEach(cat => {
                const facDd = document.getElementById(`ltamod-fac-dd-${pId}-${cat}`);
                if (facDd) {
                    const checked = Array.from(facDd.querySelectorAll('input[type=checkbox]:checked'))
                        .map(c => c.value).filter(v => v !== '__CLEAR__');
                    entry['factor_' + cat] = checked.length ? checked : [];
                }
            });

            // Read corrective action rows from table
            const caTbody = document.getElementById('ltamod-ca-tbody-' + pId);
            if (caTbody) {
                const caRows = Array.from(caTbody.querySelectorAll('.lta-ca-row')).map(tr => ({
                    action:      (tr.querySelector('[data-ca-field="action"]')?.value || '').trim(),
                    responsible: (tr.querySelector('[data-ca-field="responsible"]')?.value || '').trim(),
                    timeline:    (tr.querySelector('[data-ca-field="timeline"]')?.value || '').trim()
                })).filter(r => r.action || r.responsible || r.timeline);
                entry.correctiveActions = caRows.length ? caRows : [];
                // Keep legacy fields in sync (first row) for backward compat with old PDF/reports
                entry.correctiveAction = caRows.map(r=>r.action).filter(Boolean).join('\n');
                entry.responsible      = caRows.map(r=>r.responsible).filter(Boolean).join(', ');
                entry.timeline         = caRows.map(r=>r.timeline).filter(Boolean).join(', ');
            }
            if (injpersonIsNA) {
                // No injured person → whole section is Not Applicable
                entry.injuredPersonName = 'N/A';
                entry.natureOfInjury = ['N/A'];
                entry.bodyPartsAffected = ['N/A'];
                entry.causeOfInjury = [];
                entry.agentOfInjury = [];
                entry.causeOfInjuryOther = '';
                entry.agentOfInjuryOther = '';
                entry.occupation = '';
            }

            // Other injured persons (Person 2..N). Not kept when the injured person is N/A.
            {
                const _addl = injpersonIsNA ? [] : window._ltaReadPersons(modal);
                if (_addl.length || Array.isArray(entry.additionalPersons)) entry.additionalPersons = _addl;
            }

            // Injury type from radio
            const _dlCardEl = modal.querySelector('#ltamod-dl-card');
            if (_dlCardEl && _dlCardEl.dataset.userType) entry.injuryType = _dlCardEl.dataset.userType;
            // Enforce classification rule (High-Potential / Dangerous Occurrence / Near Miss = N/A, Fatality = 6,000 days). LTA / Medical Treatment / First Aid = user's choice
            entry.injuryType = ltaEffectiveInjuryType(entry);
            if (ltaClassKind(entry.incidentClassification) === 'fatality') entry.scheduledChargeItem = 'Fatality';

            syncIncidentClassificationsFromRegistry();
            syncDaysLostFromLtaRegistry();
            if (typeof saveUserData === 'function') saveUserData(state.currentUser?.email);
            // Mark dirty BEFORE saving so the onSnapshot echo is ignored while save is in flight
            if (window.RowSaveManager) window.RowSaveManager.markDirty(pName, 'lta_entries');
            if (typeof markPendingSync === 'function') markPendingSync();
            // Use immediate save (not debounced) so Firebase has the new data before onSnapshot fires
            if (typeof saveToFirebase === 'function') saveToFirebase();
            else if (typeof saveToFirebaseDebounced === 'function') saveToFirebaseDebounced();
            _ltaAutoEditMode();

            modal.remove();
            renderLtaRegistryTab();
            showToast(isNew ? '✅ Entry added successfully.' : '✅ Entry updated.', 'success', 2500);
        };

        // Override addLtaEntry to open modal instead
        window._addLtaEntryViaModal = function(pName) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p.region, 'medical');
            if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            _ltaAutoEditMode();
            openLtaModal(pName, -1, true);
        };

        // Helper: targeted re-render of only the Days Lost / Charged section
        // Called when injuryType changes — avoids wiping unsaved fields in other inputs
        function renderLtaDLSection(p, idx, pName, isDisabled) {
            const e = p.vals['lta-registry_entries'][idx];
            const pId = pName.replace(/[^a-zA-Z0-9]/g,'_');
            const pnSafe = pName.replace(/'/g, "\\'");
            const dis = isDisabled ? 'disabled' : '';
            const injuryTypeDef = LTA_INJURY_TYPES.find(t => t.value === (e.injuryType || 'temporary'));
            const useScheduled = injuryTypeDef ? injuryTypeDef.useScheduled : false;

            // Rebuild the radio buttons section
            let radioHtml = `<div id="lta-dl-section-${pId}-${idx}" style="display:contents;">
                <div class="lta-section-label"><i class="fas fa-calendar-xmark" style="margin-right:5px;"></i>Days Lost / Charged Computation <span style="font-size:0.6rem;font-weight:400;color:#888;">(Select "N/A" if no days are lost or not applicable)</span></div>
                <div class="lta-field lta-field-full">
                    <label>⚕ Injury / Case Type <span style="color:#e65100;font-weight:800;">*</span></label>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;margin-top:4px;">
                        ${LTA_INJURY_TYPES.map(t => {
                            const isSelected = (e.injuryType || 'temporary') === t.value;
                            const usesSC = t.useScheduled;
                            return '<label style="display:flex;align-items:flex-start;gap:7px;padding:7px 10px;border-radius:6px;cursor:' + (dis?'default':'pointer') + ';border:1.5px solid ' + (isSelected?(usesSC?'#c62828':'#2e7d32'):'var(--border-color)') + ';background:' + (isSelected?(usesSC?'#fff0f0':'#f1f8f1'):'var(--input-bg)') + ';transition:all 0.15s;">'
                                + '<input type="radio" name="injuryType-' + pId + '-' + idx + '" value="' + t.value + '" ' + (isSelected?'checked':'') + ' ' + dis + ' style="margin-top:2px;accent-color:' + (usesSC?'#c62828':'#2e7d32') + ';" onchange="updateLtaField(\'' + pnSafe + '\',' + idx + ',\'injuryType\',this.value)">'
                                + '<div><div style="font-size:0.72rem;font-weight:700;color:' + (isSelected?(usesSC?'#c62828':'#1b5e20'):'var(--text-primary)') + ';">' + (usesSC?window.icon("list"):'🩹 ') + t.label + '</div>'
                                + '<div style="font-size:0.6rem;color:var(--text-secondary);margin-top:1px;">' + t.note + '</div></div></label>';
                        }).join('')}
                    </div>
                </div>`;

            // Computation result
            if (e.injuryType === 'na') {
                radioHtml += `<div class="lta-computed-dl" style="background:#f5f5f5;border-color:#ccc;grid-column:1/-1;">
                    <i class="fas fa-ban" style="color:#9e9e9e;font-size:1rem;"></i>
                    <div><div style="font-size:0.62rem;color:#888;font-weight:600;">DAYS LOST / CHARGED — NOT APPLICABLE</div>
                    <div style="font-size:0.85rem;font-weight:800;color:#9e9e9e;">0 days — excluded from computation</div></div></div>`;
            } else if (useScheduled) {
                const scOpts = typeof SCHEDULED_CHARGES_GROUPS !== 'undefined' ? SCHEDULED_CHARGES_GROUPS.map(g =>
                    '<optgroup label="' + g.group + '">' + g.items.map(item =>
                        '<option value="' + item + '" ' + (e.scheduledChargeItem === item ? 'selected' : '') + '>' + item + ' — ' + (SCHEDULED_CHARGES[item]||0).toLocaleString() + ' days</option>'
                    ).join('') + '</optgroup>').join('') : '';
                const sc = e.scheduledChargeItem && typeof SCHEDULED_CHARGES !== 'undefined' ? (SCHEDULED_CHARGES[e.scheduledChargeItem] || 0) : 0;
                radioHtml += `<div class="lta-field" style="grid-column:1/-1;">
                    <label>${window.icon("list")} Scheduled Charge Item</label>
                    <select ${dis} onchange="updateLtaField('${pnSafe}',${idx},'scheduledChargeItem',this.value)">
                        <option value="">— Select injury/condition —</option>${scOpts}
                    </select></div>
                    <div class="lta-computed-dl" style="background:#fff0f0;border-color:#ef9a9a;grid-column:1/-1;">
                    <i class="fas fa-calendar-minus" style="color:#c62828;font-size:1rem;"></i>
                    <div><div style="font-size:0.62rem;color:#c62828;font-weight:600;">SCHEDULED CHARGE (ANSI Z16.1)</div>
                    <div style="font-size:0.85rem;font-weight:800;color:#c62828;">${sc.toLocaleString()} days charged</div>
                    <div style="font-size:0.58rem;color:#888;margin-top:2px;">Fixed by DOLE standard — select item above</div></div></div>`;
            } else {
                const { daysCharged } = typeof computeDaysCharged === 'function' ? computeDaysCharged(e) : { daysCharged: 0 };
                radioHtml += `<div class="lta-field"><label>Date of Accident / Incident</label>
                    <input type="date" value="${e.dateOfAccident||''}" ${dis} oninput="updateLtaField('${pnSafe}',${idx},'dateOfAccident',this.value)"></div>
                    <div class="lta-field"><label>Date Return to Work (RTW)</label>
                    <input type="date" value="${e.dateRTW||''}" ${dis} oninput="updateLtaField('${pnSafe}',${idx},'dateRTW',this.value)"></div>
                    <div class="lta-computed-dl" style="grid-column:1/-1;">
                    <i class="fas fa-calculator" style="color:#e65100;font-size:1rem;"></i>
                    <div><div style="font-size:0.62rem;color:#e65100;font-weight:600;">COMPUTED DAYS LOST</div>
                    <div style="font-size:0.85rem;font-weight:800;color:${daysCharged>0?'#c62828':'#2e7d32'};">${daysCharged} day${daysCharged!==1?'s':''} lost</div>
                    <div style="font-size:0.58rem;color:#888;margin-top:2px;">${daysCharged>0?'Attributed to month of accident · Synced to Medical Tab → Days Lost/Charged':'Fill in Date of Accident and Date RTW to compute'}</div></div></div>`;
            }
            radioHtml += `</div><!-- end lta-dl-section -->`;
            return radioHtml;
        }

        function renderLtaRegistryTab() {
            const container = document.getElementById('lta-registry-view');
            if (!container) return;
            const _mc = document.getElementById('main-content') || document.documentElement;
            const _savedScroll = _mc.scrollTop || 0;
            const displayProjects = (state.filteredProjects || state.projects || []);
            const REGIONS_LTA = ["CORPORATE", "NCR", "SOUTH LUZON", "NORTH LUZON", "VISAYAS & MINDANAO"];

            let totalEntries = 0;
            displayProjects.forEach(p => {
                totalEntries += (p.vals['lta-registry_entries'] || []).length;
            });

            let html = '';

            html += `<div class="tab-info-bar tib-oneline">
                <div class="tib-body">
                    <p class="tib-sub">Lost Time Accident records per project</p>
                    <span class="tib-info" title="Days Lost are auto-computed (excl. Sundays, starting day after accident) and auto-sync to the Days Lost/Charged row in the Medical Tab. All incident classifications (LTA, Medical Treatment, First Aid, Fatality, etc.) are automatically reflected in the ACCIDENT/INCIDENT RECORD tab.">i</span>
                </div>
                <div class="tib-badges">
                    <span class="tib-pill tib-pill-green">${displayProjects.length} PROJECTS</span>
                    <span class="tib-pill tib-pill-yellow">${totalEntries} LTA ENTRIES</span>
                </div>
            </div>`;



            html += `<div class="lta-view">`;

            REGIONS_LTA.forEach(reg => {
                const regProjs = displayProjects.filter(p => p.region === reg);
                if (!regProjs.length) return;
                const canEditReg = UserAccounts.canEdit(state.currentUser?.email, reg);
                const isCollapsed = !expandedRegions.has(reg);
                const allRegEntries = regProjs.flatMap(p => p.vals['lta-registry_entries']||[]);
                const _classifCounts = {};
                allRegEntries.forEach(e => {
                    ltaEntryPersons(e).forEach(pp => {
                        const c = pp.incidentClassification || 'Unclassified';
                        _classifCounts[c] = (_classifCounts[c] || 0) + 1;
                    });
                });
                // Badge config: label, background, text color — only shown if count > 0
                const _classifBadgeConfig = {
                    'LTA':                    { bg: 'rgba(198,40,40,0.35)',    color: '#ffcdd2' },
                    'Fatality':               { bg: 'rgba(80,0,0,0.5)',        color: '#ff8a80' },
                    'Medical Treatment':      { bg: 'rgba(230,81,0,0.35)',     color: '#ffe0b2' },
                    'First Aid':              { bg: 'rgba(245,127,23,0.35)',   color: '#fff9c4' },
                    'High-Potential incident':{ bg: 'rgba(74,20,140,0.35)',    color: '#e1bee7' },
                    'Dangerous Occurrences':  { bg: 'rgba(1,87,155,0.35)',     color: '#bbdefb' },
                    'Unclassified':           { bg: 'rgba(97,97,97,0.35)',     color: '#f5f5f5' },
                };
                const _classifInitials = {
                    'LTA':                     'LTA',
                    'Fatality':                'FAT',
                    'Medical Treatment':       'MT',
                    'First Aid':               'FA',
                    'High-Potential incident': 'HP',
                    'Dangerous Occurrences':   'DO',
                    'Near Miss':               'NM',
                    'Restricted Work Case':    'RWC',
                    'Confinement':             'CONF',
                    'Unclassified':            'N/C',
                };
                const _classifBadgesHtml = Object.entries(_classifCounts)
                    .filter(([,cnt]) => cnt > 0)
                    .map(([cls, cnt]) => {
                        const cfg = _classifBadgeConfig[cls] || { bg: 'rgba(97,97,97,0.35)', color: '#f5f5f5' };
                        const abbr = _classifInitials[cls] || cls.substring(0, 3).toUpperCase();
                        return `<span class="rbadge" style="background:${cfg.bg};color:${cfg.color};" title="${cls}">${cnt} ${abbr}</span>`;
                    }).join('');

                html += `${window.regionBanner({ id: `lta-region-banner-${reg}`, reg: reg, cls: 'lta-region-banner', toggle: 'toggleLtaRegion', collapsed: isCollapsed, editable: canEditReg,
                    right: `<span class="rbadge rbadge-count rb-proj">${regProjs.length} PROJ</span>` + _classifBadgesHtml })}
                <div id="lta-region-content-${reg}" class="lta-region-content region-content ${isCollapsed?'collapsed':''}">`;

                let _ltaNavProjs = regProjs;
                let _ltaInlineNav = null; // Prev/Next live inside the project header (no separate bar)
                if (regProjs.length > 1) {
                    const _ltaNk = _tabNavKey('lta-registry', reg);
                    let _ltaIdx = Math.min(_tabRegionProjectIdx[_ltaNk] || 0, regProjs.length - 1);
                    _tabRegionProjectIdx[_ltaNk] = _ltaIdx;
                    _ltaNavProjs = [regProjs[_ltaIdx]];
                    _ltaInlineNav = { idx: _ltaIdx, total: regProjs.length };
                }

                _ltaNavProjs.forEach(p => {
                    const pnSafe = p.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                    const pId = p.name.replace(/\s/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
                    const entries = p.vals['lta-registry_entries'] || [];
                    const totalDL = entries.reduce((s,e) => s + computeEntryDaysCharged(e).daysCharged, 0);
                    const canEdit = UserAccounts.canEdit(state.currentUser?.email, p.region) && UserAccounts.canEditTab(state.currentUser?.email, 'medical');
                    const dis = (state.isEditing && canEdit) ? '' : 'disabled';

                    const _ltaIsWS = isProjectOnStoppage(p);
                    html += `<div class="lta-project-card" style="${_ltaIsWS ? 'opacity:0.85;' : ''}">
                        <div class="lta-project-header${(_ltaInlineNav && !_ltaIsWS) ? ' proj-nav-bar' : ''}" style="cursor:default;${_ltaIsWS ? 'background:#ffebee;border-left-color:#c62828;' : ''}${_ltaInlineNav ? 'display:grid;grid-template-columns:1fr auto 1fr;gap:10px;' : ''}">
                            <div style="display:flex;align-items:center;gap:10px;min-width:0;${_ltaInlineNav ? 'justify-self:start;' : ''}">
                                ${_ltaInlineNav ? _tabNavBtn('lta-registry', reg, -1, _ltaInlineNav.idx, _ltaInlineNav.total) : ''}
                                ${_ltaInlineNav ? '' : `<div style="min-width:0;">
                                    <div class="lta-project-name">${p.name}</div>
                                </div>`}
                            </div>
                            ${_ltaInlineNav ? `<div style="min-width:0;text-align:center;justify-self:center;">
                                <div class="lta-project-name">${p.name}</div>
                                <div class="lta-proj-sub">Project ${_ltaInlineNav.idx + 1} of ${_ltaInlineNav.total}</div>
                            </div>` : ''}
                            <div style="display:flex;align-items:center;gap:8px;${_ltaInlineNav ? 'justify-self:end;' : ''}">
                                ${(state.isEditing && canEdit) ? `<button class="lta-add-btn" onclick="event.stopPropagation();window._importAiirViaFile('${pnSafe}')" title="Import from AIIR (Microsoft Word)"><i class="fas fa-file-import"></i> Import AIIR</button><button class="lta-add-btn" onclick="event.stopPropagation();window._addLtaEntryViaModal('${pnSafe}')"><i class="fas fa-plus"></i> Add Entry</button>` : ''}
                                ${_ltaInlineNav ? _tabNavBtn('lta-registry', reg, 1, _ltaInlineNav.idx, _ltaInlineNav.total) : ''}
                            </div>
                        </div>
                        <div id="lta-proj-${pId}-content" class="lta-project-body">`;

                    if (entries.length === 0) {
                        html += `<div class="lta-empty-msg"><i class="fas fa-inbox" style="margin-right:6px;"></i>No LTA entries recorded for this project.${(state.isEditing && canEdit) ? ' Click "+ Add Entry" to begin.' : ''}</div>`;
                    } else {
                        const openCount = entries.filter(e => e.status === 'Open').length;
                        const ongoingCount = entries.filter(e => e.status === 'Ongoing').length;
                        const closedCount = entries.filter(e => e.status === 'Closed').length;
                        html += `<div class="lta-summary-bar" style="padding-top:10px;">
                            <span class="lta-summary-pill" style="background:#e3f2fd;color:#1565c0;">${entries.length} ${entries.length === 1 ? 'Entry' : 'Entries'}</span>
                            <span class="lta-summary-pill" style="background:#ffebee;color:#c62828;">${openCount} Open</span>
                            <span class="lta-summary-pill" style="background:#fff3e0;color:#e65100;">${ongoingCount} Ongoing</span>
                            <span class="lta-summary-pill" style="background:#e8f5e9;color:#2e7d32;">${closedCount} Closed</span>
                            <span class="lta-summary-pill" style="background:#fff8e1;color:#f57f17;">Total: ${totalDL} Days Charged</span>
                        </div>`;

                        // ── Compact list rows — sorted by date of accident ────────────────
                        const sortedEntries = [...entries].sort((a,b) => {
                            const da = a.dateOfAccident || a.dateReported || '';
                            const db = b.dateOfAccident || b.dateReported || '';
                            if (!da && !db) return 0;
                            if (!da) return 1;
                            if (!db) return -1;
                            return new Date(da) - new Date(db);
                        });
                        sortedEntries.forEach((e, idx) => {
                            // Find original index for edit/delete operations
                            const origIdx = entries.indexOf(e);
                            const { daysCharged: dl, method: dlMethod } = computeEntryDaysCharged(e);
                            const dlLabel = dlMethod === 'na' ? 'N/A' : (dlMethod === 'scheduled' ? dl + ' (SC)' : dl + ' day' + (dl !== 1 ? 's' : ''));
                            const dlBg = dlMethod === 'na' ? '#e0e0e0' : (dl > 0 ? '#c62828' : '#e8f5e9');
                            const dlColor = dlMethod === 'na' ? '#888' : (dl > 0 ? 'white' : '#2e7d32');
                            const statusColor = e.status === 'Closed' ? '#2e7d32' : e.status === 'Ongoing' ? '#e65100' : '#c62828';
                            const statusBg   = e.status === 'Closed' ? '#e8f5e9' : e.status === 'Ongoing' ? '#fff3e0' : '#ffebee';
                            const classifLabel = ltaEntryClassLabel(e) || '—';
                            const personLabel  = e.injuredPersonName === 'N/A' ? '<em style="color:#aaa;">N/A</em>' : (e.injuredPersonName || '<em style="color:#aaa;">—</em>');
                            const accidentDate = e.dateOfAccident || (e.dateReported ? `${e.dateReported}` : '—');
                            const aiirLabel    = e.aiirNo || '<em style="color:#aaa;">No AIIR No.</em>';

                            html += `<div class="lta-row-item" style="
                                display:flex; align-items:center; gap:10px;
                                padding:9px 14px; border-bottom:1px solid var(--border-color);
                                background:var(--bg-card); transition:background 0.15s;
                                cursor:pointer;"
                                onmouseenter="this.style.background='var(--hover-bg,#f5f9f5)'"
                                onmouseleave="this.style.background='var(--bg-card)'"
                                onclick="openLtaModal('${pnSafe}',${origIdx},false)">

                                <span style="background:#1b5e20;color:white;border-radius:50%;width:22px;height:22px;
                                    display:inline-flex;align-items:center;justify-content:center;
                                    font-size:0.65rem;font-weight:800;flex-shrink:0;">${idx+1}</span>

                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:0.73rem;font-weight:700;color:var(--text-primary);
                                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                        ${aiirLabel}
                                        <span style="font-weight:400;color:#888;font-size:0.65rem;margin-left:6px;">${accidentDate}</span>
                                    </div>
                                    <div style="font-size:0.63rem;color:#888;margin-top:1px;
                                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                        ${personLabel}${ltaEntryPersons(e).length > 1 ? ' +' + (ltaEntryPersons(e).length - 1) + ' more' : ''} · ${classifLabel}
                                    </div>
                                </div>

                                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                                    <span style="background:${dlBg};color:${dlColor};border-radius:10px;
                                        padding:2px 8px;font-size:0.63rem;font-weight:800;">${dlLabel}</span>
                                    <span style="background:${statusBg};color:${statusColor};border-radius:8px;
                                        padding:2px 8px;font-size:0.63rem;font-weight:700;">${e.status||'Open'}</span>
                                    ${(state.isEditing && canEdit) ? `
                                    <button onclick="event.stopPropagation();openLtaModal('${pnSafe}',${origIdx},true)"
                                        title="Edit entry"
                                        style="background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;border-radius:5px;
                                            padding:3px 8px;font-size:0.62rem;font-weight:700;cursor:pointer;">
                                        <i class="fas fa-pen"></i>
                                    </button>
                                    <button onclick="event.stopPropagation();removeLtaEntry('${pnSafe}',${origIdx})"
                                        title="Delete entry"
                                        style="background:transparent;color:#ef5350;border:1px solid #ef5350;border-radius:5px;
                                            padding:3px 8px;font-size:0.62rem;cursor:pointer;">
                                        <i class="fas fa-trash"></i>
                                    </button>` : ''}
                                </div>
                            </div>`;
                        }); // end sortedEntries.forEach
                    }

                    html += `</div></div>`; // end lta-project-body + lta-project-card
                }); // end _ltaNavProjs.forEach

                html += `</div>`; // end lta-region-content
            }); // end REGIONS_LTA.forEach

            html += `</div>`; // end lta-view
            container.innerHTML = html;
            if (_savedScroll > 0) {
                requestAnimationFrame(() => { _mc.scrollTop = _savedScroll; });
            }
        }

        function toggleLtaRegion(regionName, event) {
            if (event && (event.target.tagName === 'BUTTON' || event.target.closest('button'))) return;
            const banner = document.getElementById('lta-region-banner-' + regionName);
            const cont   = document.getElementById('lta-region-content-' + regionName);
            if (!banner || !cont) return;
            if (expandedRegions.has(regionName)) {
                expandedRegions.delete(regionName);
                _animateRegion(cont, true);
                banner.classList.add('collapsed');
            } else {
                expandedRegions.add(regionName);
                _animateRegion(cont, false);
                banner.classList.remove('collapsed');
            }
            localStorage.setItem(_EXP_KEY, JSON.stringify([...expandedRegions]));
        }

        const OSH_NOV_INTERNAL_BODIES = [
            'Client',
            'ISO Internal Audit',
            'ESH Internal Audit'
        ];
        const OSH_NOV_EXTERNAL_BODIES = [
            'DOLE',
            'OSHC',
            'BWC',
            'Others'
        ];

        const OSH_NOV_PRIMARY_LAWS = [
            'RA 11058 — OSH Standards Act',
            'DO 252-25 — Revised IRR of RA 11058',
            'PD 442 — Labor Code of the Philippines',
            'DO 174-17 — Contracting & Subcontracting',
            'DO 13 s.1998 — Construction OSH Guidelines',
            'DO 56 s.2005 — Construction Safety & Health Program Cost',
            'DO 238-23 — Rules on Enforcement of Labor Standards',
            'Others'
        ];
        const OSH_NOV_OSHS_RULES = [
            'Rule 1020 — OSHS General Provisions',
            'Rule 1030 — Training of Personnel in OSH',
            'Rule 1040 — Health and Safety Committee',
            'Rule 1050 — Notification and Keeping of Records',
            'Rule 1060 — Premises of Establishments',
            'Rule 1070 — Occupational Health and Environmental Control',
            'Rule 1080 — Personal Protective Equipment',
            'Rule 1090 — Hazardous Materials',
            'Rule 1100 — Gas and Electric Welding and Cutting',
            'Rule 1150 — Construction Safety',
            'Rule 1160 — Explosives',
            'Rule 1170 — Flammable and Combustible Liquids',
            'Rule 1200 — Electrical Safety',
            'Rule 1210 — Machine Guarding',
            'Rule 1220 — Materials Handling and Storage',
            'Rule 1230 — Boiler and Pressure Vessel',
            'Rule 1410 — Construction Safety (COSH)'
        ];
        function buildOshLawOpts(selected) {
            let opts = '<option value="">— Select —</option>';
            opts += '<optgroup label="📋 Primary Laws">';
            OSH_NOV_PRIMARY_LAWS.forEach(o => { opts += `<option value="${o}" ${selected===o?'selected':''}>${o}</option>`; });
            opts += '</optgroup>';
            opts += '<optgroup label="⚙️ OSHS Rules">';
            OSH_NOV_OSHS_RULES.forEach(o => { opts += `<option value="${o}" ${selected===o?'selected':''}>${o}</option>`; });
            opts += '</optgroup>';
            return opts;
        }

        const OSH_NOV_INTERNAL_IB_SET = new Set(['Client','ISO Internal Audit','ESH Internal Audit']);

        function migrateOshNovData(p) {
            if (!p.vals) p.vals = {};
            if (p.vals['osh-nov_internal_novs'] !== undefined || p.vals['osh-nov_external_novs'] !== undefined) return;
            const oldNovs = p.vals['osh-nov_novs'] || [];
            const internal = [], external = [];
            oldNovs.forEach(nov => {
                if (OSH_NOV_INTERNAL_IB_SET.has(nov.issuingBody)) internal.push(nov);
                else external.push(nov);
            });
            p.vals['osh-nov_internal_novs'] = internal;
            p.vals['osh-nov_external_novs'] = external;
            delete p.vals['osh-nov_novs'];
        }

        function _oshAutoEditMode() {
            const _isPastYr = state.selectedYear < Math.max(...availableYears);
            if (_isPastYr && !state.isAdmin) return; // past year — non-admin view-only
            if (!state.isEditing) {
                state.isEditing = true;
                document.body.classList.add('is-editing');
                const _fb = document.getElementById('floating-edit-btn');
                const _fi = document.getElementById('floating-edit-icon');
                const _ft = document.getElementById('floating-edit-tooltip');
                if (_fb) { _fb.classList.add('save-mode'); _fb.setAttribute('onclick','saveData()'); }
                if (_fi) _fi.className = 'fas fa-save';
                if (_ft) _ft.textContent = 'Click to Save';
            }
        }

        function addOshNovEntry(pName, type) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p.region, 'nov');
            if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            _oshAutoEditMode();
            migrateOshNovData(p);
            const key = type === 'internal' ? 'osh-nov_internal_novs' : 'osh-nov_external_novs';
            if (!p.vals[key]) p.vals[key] = [];
            p.vals[key].push({ dateIssued: '', dateReceived: '', issuingBody: '', refNo: '', violations: [{ violationLaw: '', status: 'Open' }] });
            saveToFirebase(); renderOshNovTab();
        }

        function removeOshNovEntry(pName, type, nIdx) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'delete', p.region, 'nov');
            if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            migrateOshNovData(p);
            const key = type === 'internal' ? 'osh-nov_internal_novs' : 'osh-nov_external_novs';
            if (!p.vals[key]) return;
            const label = `${type === 'internal' ? 'Internal' : 'External'} NOV #${nIdx + 1}`;
            showDeleteDialog('OSH NOV', `${label} from ${pName}`).then(confirmed => {
                if (!confirmed) return;
                const backup = JSON.parse(JSON.stringify(p.vals[key]));
                p.vals[key].splice(nIdx, 1);
                saveToFirebase(); renderOshNovTab();
                showUndoToast(`${label} deleted from ${pName}`, () => {
                    p.vals[key] = backup;
                    saveToFirebase(); renderOshNovTab();
                });
            });
        }

        function addOshNovViolation(pName, type, nIdx) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'edit', p.region, 'nov');
            if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            _oshAutoEditMode();
            migrateOshNovData(p);
            const key = type === 'internal' ? 'osh-nov_internal_novs' : 'osh-nov_external_novs';
            if (!p.vals[key] || !p.vals[key][nIdx]) return;
            p.vals[key][nIdx].violations.push({ violationLaw: '', status: 'Open' });
            saveToFirebase(); renderOshNovTab();
        }

        function removeOshNovViolation(pName, type, nIdx, vIdx) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            const _rbac = UserAccounts.checkPermission(state.currentUser?.email, 'delete', p.region, 'nov');
            if (!_rbac.allowed) { showLockedMessage(_rbac.reason); return; }
            migrateOshNovData(p);
            const key = type === 'internal' ? 'osh-nov_internal_novs' : 'osh-nov_external_novs';
            const nov = p.vals[key] && p.vals[key][nIdx];
            if (!nov) return;
            const label = nov.violations.length === 1
                ? `${type === 'internal' ? 'Internal' : 'External'} NOV #${nIdx + 1} (entire NOV)`
                : `Violation #${vIdx + 1} from NOV #${nIdx + 1}`;
            showDeleteDialog('OSH NOV Violation', `${label} — ${pName}`).then(confirmed => {
                if (!confirmed) return;
                const backup = JSON.parse(JSON.stringify(p.vals[key]));
                if (nov.violations.length === 1) {
                    p.vals[key].splice(nIdx, 1);
                } else {
                    nov.violations.splice(vIdx, 1);
                }
                saveToFirebase(); renderOshNovTab();
                showUndoToast(`${label} deleted`, () => {
                    p.vals[key] = backup;
                    saveToFirebase(); renderOshNovTab();
                });
            });
        }

        function updateOshNovNovField(pName, type, nIdx, field, value) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            migrateOshNovData(p);
            const key = type === 'internal' ? 'osh-nov_internal_novs' : 'osh-nov_external_novs';
            if (p.vals[key] && p.vals[key][nIdx]) {
                p.vals[key][nIdx][field] = value;
                if (typeof markPendingSync === 'function') markPendingSync();
                if (window.RowSaveManager) window.RowSaveManager.markDirty(pName, `oshnov_${type}_${nIdx}_${field}`);
                if (typeof saveToFirebaseDebounced === 'function') saveToFirebaseDebounced();
            }
        }

        function updateOshNovViolField(pName, type, nIdx, vIdx, field, value) {
            const p = state.projects.find(x => x.name === pName);
            if (!p) return;
            migrateOshNovData(p);
            const key = type === 'internal' ? 'osh-nov_internal_novs' : 'osh-nov_external_novs';
            const nov = p.vals[key] && p.vals[key][nIdx];
            if (nov && nov.violations[vIdx]) {
                nov.violations[vIdx][field] = value;
                if (typeof markPendingSync === 'function') markPendingSync();
                if (window.RowSaveManager) window.RowSaveManager.markDirty(pName, `oshnov_viol_${type}_${nIdx}_${vIdx}`);
                if (typeof saveToFirebaseDebounced === 'function') saveToFirebaseDebounced();
            }
        }

        function toggleOshNovRegion(regionName, event) {
            if (event && (event.target.tagName === 'BUTTON' || event.target.closest('button'))) return;
            const banner = document.getElementById('osh-nov-region-banner-' + regionName);
            const cont   = document.getElementById('osh-nov-region-content-' + regionName);
            if (!banner || !cont) return;
            if (expandedRegions.has(regionName)) {
                expandedRegions.delete(regionName);
                cont.classList.add('collapsed');
                banner.classList.add('collapsed');
            } else {
                expandedRegions.add(regionName);
                cont.classList.remove('collapsed');
                banner.classList.remove('collapsed');
            }
            localStorage.setItem(_EXP_KEY, JSON.stringify([...expandedRegions]));
        }

 // kept as empty object for any legacy references

function computeMechanismFromLta(projects) {
    const MECHANISMS = [
        'Struck-By','Struck Against','Caught-In','Caught-On','Electric Shock',
        'Contact With','Caught in Between','Caught By','Fall to Surface','Fall to Below',
        'Arc Flashes','Burns','Manual Handling','Overexertion','Chemical Burns',
        'Inhalation of Toxic Fumes','Skin Irritation','Fire and Explosions',
        'Heat Stress','Cold Exposure','Hearing Loss','Vehicular Accident',
        'Health Concern','Animal/Insect Bite','Environmental Accident','Others'
    ];
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const mechCounts = {};
    MECHANISMS.forEach(m => { mechCounts[m] = new Array(13).fill(0); }); // 0 unused, 1-12

    (projects || []).forEach(p => {
        const entries = p.vals?.['lta-registry_entries'] || [];
        entries.forEach(e => {
            const mech = e.natureOfIncident;
            if (!mech || !mechCounts[mech]) return;
            const month = e.dateOfAccident ? new Date(e.dateOfAccident).getMonth() + 1 : null;
            if (month >= 1 && month <= 12) mechCounts[mech][month]++;
            else if (!month) mechCounts['Others'][1]++; // fallback if no date
        });
    });

    const rows = MECHANISMS.map(m => [m, ...Array.from({length:12}, (_,i) => mechCounts[m][i+1])]);
    const total = Array.from({length:12}, (_,i) => MECHANISMS.reduce((s,m) => s + mechCounts[m][i+1], 0));

    return {
        headers: ['Mechanism', ...MONTHS_SHORT],
        rows,
        total
    };
}

function computeFactorsFromLta(projects) {
    const FACTOR_STRUCTURE = [
        ['PEOPLE',        'Lack of Awareness or Training'],
        ['',              'Fatigue and Stress'],
        ['',              'Negligence or Complacency'],
        ['',              'Ignoring Safety Procedures'],
        ['',              'Distractions'],
        ['',              'Poor Communication'],
        ['',              'Improper Use of Equipment'],
        ['',              'Risk-Taking Behavior'],
        ['EQUIPMENT',     'Faulty Equipment'],
        ['',              'Improper Use of Tools'],
        ['',              'Lack of Maintenance'],
        ['',              'Failure to Use PPE'],
        ['',              'Uncalibrated/Outdated Equipment'],
        ['MATERIALS',     'Flammable or Toxic Substances'],
        ['',              'Improper Storage'],
        ['',              'Defective Materials'],
        ['',              'Spills and Leaks'],
        ['ENVIRONMENT',   'Poor Housekeeping'],
        ['',              'Defective Equipment'],
        ['',              'Hazardous Substances'],
        ['',              'Weather Conditions'],
        ['',              'Inadequate Ventilation'],
        ['',              'Inadequate Lighting'],
        ['',              'Excessive Noise'],
        ['',              'Excessive Vibration'],
        ['',              'Congested Work Areas'],
        ['ORGANIZATIONAL','Lack of Safety Training'],
        ['',              'Poor Supervision'],
        ['',              'Inadequate Risk Assessments'],
        ['',              'Pressure to Meet Deadlines'],
        ['',              'Lack of Proper PPE'],
        ['',              'Failure to Maintain Equipment'],
    ];
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const FACTOR_CATS  = ['PEOPLE','EQUIPMENT','MATERIALS','ENVIRONMENT','ORGANIZATIONAL'];

    const subCounts = {};
    FACTOR_STRUCTURE.forEach(([,sub]) => { subCounts[sub] = new Array(13).fill(0); });

    (projects || []).forEach(p => {
        const entries = p.vals?.['lta-registry_entries'] || [];
        entries.forEach(e => {
            const month = e.dateOfAccident ? new Date(e.dateOfAccident).getMonth() + 1 : null;
            if (!month || month < 1 || month > 12) return;

            // Read from factor_CATEGORY arrays (current multi-select UI)
            FACTOR_CATS.forEach(cat => {
                const arr = e['factor_' + cat];
                if (Array.isArray(arr)) {
                    arr.forEach(sub => {
                        if (sub && subCounts[sub] !== undefined) subCounts[sub][month]++;
                    });
                }
            });

            // Fallback: legacy single factorSubItem field
            if (e.factorSubItem && subCounts[e.factorSubItem] !== undefined) {
                subCounts[e.factorSubItem][month]++;
            }
        });
    });

    const rows = FACTOR_STRUCTURE.map(([cat, sub]) => [cat, sub, ...Array.from({length:12}, (_,i) => subCounts[sub][i+1])]);
    const total = Array.from({length:12}, (_,i) => FACTOR_STRUCTURE.reduce((s,[,sub]) => s + subCounts[sub][i+1], 0));

    return {
        headers: ['Factor', 'Sub-Factor', ...MONTHS_SHORT],
        rows,
        total
    };
}

function computeAgentOfInjuryFromLta(projects) {
    const AGENTS = (Array.isArray(window.LTA_AGENT_OF_INJURY) && window.LTA_AGENT_OF_INJURY.length)
        ? window.LTA_AGENT_OF_INJURY.slice()
        : ['Building / Structures','Prime Movers','Distribution Systems','Hand Tools','Machines / Equipment',
           'Conveying / Transport / Packaging Equipment or Vehicles','Materials / Object','Chemical Substances',
           'Humans / Animals / Plants','Others (Please Specify)'];
    const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const counts = {};
    AGENTS.forEach(a => { counts[a] = new Array(13).fill(0); }); // 0 unused, 1-12

    (projects || []).forEach(p => {
        const entries = p.vals?.['lta-registry_entries'] || [];
        entries.forEach(e => {
            const month = e.dateOfAccident ? new Date(e.dateOfAccident).getMonth() + 1 : null;
            if (!month || month < 1 || month > 12) return;
            const raw = e.agentOfInjury;
            const sel = Array.isArray(raw) ? raw
                : (raw ? String(raw).split(',').map(v => v.trim()).filter(Boolean) : []);
            // count each agent once per incident
            Array.from(new Set(sel)).forEach(a => {
                if (counts[a] !== undefined) counts[a][month]++;
            });
        });
    });

    const rows = AGENTS.map(a => [a, ...Array.from({length:12}, (_,i) => counts[a][i+1])]);
    const total = Array.from({length:12}, (_,i) => AGENTS.reduce((s,a) => s + counts[a][i+1], 0));

    return {
        headers: ['Agent of Injury', ...MONTHS_SHORT],
        rows,
        total
    };
}

var _tabulationTab = 'summary';
window.tabulationSetTab = function(t) { _tabulationTab = t; renderTabulation(); };
