
function updateReportorialColors() {
    if (!['kpm', 'dole', 'emb', 'doe', 'doe-permit', 'env-monthly-report'].includes(state.currentTab)) return;
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11 (0=January)
    const currentYear = currentDate.getFullYear();
    
    function isOverdue(monthIndex) {
        if (monthIndex < currentMonth) {
            return true;
        }
        return false;
    }
    
    setTimeout(() => {
        const tables = document.querySelectorAll('.table-container table');
        
        tables.forEach(table => {
            const rows = table.querySelectorAll('tbody tr, tr');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                
                if (cells.length === 0) return;
                
                if (state.currentTab === 'kpm' || state.currentTab === 'dole' || state.currentTab === 'env-monthly-report') {
                    const firstDataCell = cells[1];
                    if (firstDataCell && firstDataCell.getAttribute('colspan') === '12') {
                        return; // Skip annual report rows
                    }
                    
                    for (let i = 1; i <= 12 && i < cells.length; i++) {
                        const cell = cells[i];
                        const input = cell.querySelector('input[type="date"]');
                        
                        if (input) {
                            const monthIndex = i - 1; // Convert to 0-based index (0=Jan, 11=Dec)
                            const inputValue = input.value.trim();
                            
                            if (inputValue === '' && isOverdue(monthIndex)) {
                                cell.style.backgroundColor = '#ffcdd2'; // Light red
                                input.style.backgroundColor = '#ffcdd2';
                                input.style.color = '#c62828'; // Dark red text
                            } 
                            else if (inputValue !== '') {
                                cell.style.backgroundColor = '#c8e6c9'; // Light green
                                input.style.backgroundColor = '#c8e6c9';
                                input.style.color = '#2e7d32'; // Dark green text
                            }
                            else {
                                const isFutureCell = (i - 1) >= currentMonth; // i is 1-based, currentMonth is 0-based
                                if (isFutureCell) {
                                    cell.style.backgroundColor = '#f5f5f5';
                                    input.style.backgroundColor = '#f5f5f5';
                                    input.style.color = '#bdbdbd';
                                } else {
                                    cell.style.backgroundColor = '';
                                    input.style.backgroundColor = '';
                                    input.style.color = '';
                                }
                            }
                        }
                    }
                }
                
                else if (state.currentTab === 'emb') {
                    const rowType = cells[0]?.textContent.trim() || '';
                    
                    if (rowType.includes('Submission Date')) {
                        const firstDataCell = cells[1];
                        const secondDataCell = cells[2];
                        
                        if (firstDataCell && firstDataCell.getAttribute('colspan') === '2' && 
                            secondDataCell && secondDataCell.getAttribute('colspan') === '2') {
                            
                            const input1 = firstDataCell.querySelector('input[type="date"]');
                            if (input1) {
                                const inputValue1 = input1.value.trim();
                                let isOverdue1 = false;
                                
                                if (currentDate.getFullYear() > state.selectedYear) {
                                    isOverdue1 = true;
                                } else if (currentDate.getFullYear() === state.selectedYear) {
                                    if (currentMonth > 6) { // After July
                                        isOverdue1 = true;
                                    } else if (currentMonth === 6 && currentDate.getDate() > 15) { // After July 15
                                        isOverdue1 = true;
                                    }
                                }
                                
                                if (inputValue1 === '' && isOverdue1) {
                                    firstDataCell.style.backgroundColor = '#ffcdd2';
                                    input1.style.backgroundColor = '#ffcdd2';
                                    input1.style.color = '#c62828';
                                } else if (inputValue1 !== '') {
                                    firstDataCell.style.backgroundColor = '#c8e6c9';
                                    input1.style.backgroundColor = '#c8e6c9';
                                    input1.style.color = '#2e7d32';
                                } else {
                                    firstDataCell.style.backgroundColor = '';
                                    input1.style.backgroundColor = '';
                                    input1.style.color = '';
                                }
                            }
                            
                            const input2 = secondDataCell.querySelector('input[type="date"]');
                            if (input2) {
                                const inputValue2 = input2.value.trim();
                                let isOverdue2 = false;
                                
                                const deadlineYear = state.selectedYear + 1; // Deadline is in the next year
                                const currentYear = currentDate.getFullYear();
                                
                                if (currentYear > deadlineYear) {
                                    isOverdue2 = true;
                                } else if (currentYear === deadlineYear) {
                                    if (currentMonth === 0 && currentDate.getDate() > 15) {
                                        isOverdue2 = true;
                                    } else if (currentMonth > 0) {
                                        isOverdue2 = true;
                                    }
                                }
                                
                                if (inputValue2 === '' && isOverdue2) {
                                    secondDataCell.style.backgroundColor = '#ffcdd2';
                                    input2.style.backgroundColor = '#ffcdd2';
                                    input2.style.color = '#c62828';
                                } else if (inputValue2 !== '') {
                                    secondDataCell.style.backgroundColor = '#c8e6c9';
                                    input2.style.backgroundColor = '#c8e6c9';
                                    input2.style.color = '#2e7d32';
                                } else {
                                    secondDataCell.style.backgroundColor = '#f5f5f5';
                                    input2.style.backgroundColor = '#f5f5f5';
                                    input2.style.color = '#9e9e9e';
                                }
                            }
                        } else {
                            for (let q = 1; q <= 4 && q < cells.length; q++) {
                                const cell = cells[q];
                                const input = cell.querySelector('input[type="date"]');
                                if (input) {
                                    const inputValue = input.value.trim();
                                    let isOverdue = false;
                                    if (q === 4) {
                                        const deadlineYear = state.selectedYear + 1;
                                        const curYr = currentDate.getFullYear();
                                        if (curYr > deadlineYear) isOverdue = true;
                                        else if (curYr === deadlineYear && (currentMonth > 0 || (currentMonth === 0 && currentDate.getDate() > 15))) isOverdue = true;
                                    } else {
                                        const dlMonth0 = q * 3;
                                        if (currentMonth > dlMonth0) isOverdue = true;
                                        else if (currentMonth === dlMonth0 && currentDate.getDate() > 15) isOverdue = true;
                                    }
                                    if (inputValue !== '') {
                                        cell.style.backgroundColor = '#c8e6c9';
                                        input.style.backgroundColor = '#c8e6c9';
                                        input.style.color = '#2e7d32';
                                    } else if (isOverdue) {
                                        cell.style.backgroundColor = '#ffcdd2';
                                        input.style.backgroundColor = '#ffcdd2';
                                        input.style.color = '#c62828';
                                    } else {
                                        cell.style.backgroundColor = '#f5f5f5';
                                        input.style.backgroundColor = '#f5f5f5';
                                        input.style.color = '#9e9e9e';
                                    }
                                }
                            }
                        }
                    }
                }
                
                else if (state.currentTab === 'doe') {
                    const rowType = cells[0]?.textContent.trim() || '';
                    
                    if (rowType.includes('Submission Date')) {
                        for (let q = 1; q <= 4 && q < cells.length; q++) {
                            const cell = cells[q];
                            const input = cell.querySelector('input[type="date"]');
                            
                            if (input) {
                                const inputValue = input.value.trim();
                                let isOverdue = false;
                                
                                if (q === 4) {
                                    const deadlineYear = state.selectedYear + 1;
                                    const currentYear = currentDate.getFullYear();
                                    
                                    if (currentYear > deadlineYear) {
                                        isOverdue = true;
                                    } else if (currentYear === deadlineYear) {
                                        if (currentMonth === 0 && currentDate.getDate() > 20) {
                                            isOverdue = true;
                                        } else if (currentMonth > 0) {
                                            isOverdue = true;
                                        }
                                    }
                                } else {
                                    const quarterLastMonth = (q * 3) - 1;
                                    const deadlineMonth = quarterLastMonth + 1;
                                    
                                    if (currentMonth > deadlineMonth) {
                                        isOverdue = true;
                                    } else if (currentMonth === deadlineMonth && currentDate.getDate() > 20) {
                                        isOverdue = true;
                                    }
                                }
                                
                                if (inputValue === '' && isOverdue) {
                                    cell.style.backgroundColor = '#ffcdd2';
                                    input.style.backgroundColor = '#ffcdd2';
                                    input.style.color = '#c62828';
                                }
                                else if (inputValue !== '') {
                                    cell.style.backgroundColor = '#c8e6c9';
                                    input.style.backgroundColor = '#c8e6c9';
                                    input.style.color = '#2e7d32';
                                }
                                else {
                                    cell.style.backgroundColor = '';
                                    input.style.backgroundColor = '';
                                    input.style.color = '';
                                }
                            }
                        }
                    }
                }
                
                else if (state.currentTab === 'doe-permit') {
                    if (cells.length >= 3) {
                        const validUntilCell = cells[3]; // now index 3 (after Client-Provided col)
                        const dateInput = validUntilCell ? validUntilCell.querySelector('input[type="date"]') : null;
                        
                        if (dateInput) {
                            const validUntilValue = dateInput.value.trim();
                            // No fill: bold colored text + tooltip. Classes are styled in styles.css.
                            validUntilCell.style.backgroundColor = '';
                            dateInput.style.backgroundColor = '';
                            dateInput.style.color = '';
                            dateInput.style.fontWeight = '';
                            ['doe-vu-expired', 'doe-vu-soon', 'doe-vu-valid'].forEach(function(c) { dateInput.classList.remove(c); });
                            validUntilCell.removeAttribute('title');
                            dateInput.removeAttribute('title');

                            if (validUntilValue !== '') {
                                const expiryDate = new Date(validUntilValue);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                expiryDate.setHours(0, 0, 0, 0);
                                const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                                let vuClass, vuTip;
                                if (expiryDate < today) { vuClass = 'doe-vu-expired'; vuTip = 'Expired'; }
                                else if (daysUntilExpiry <= 30) { vuClass = 'doe-vu-soon'; vuTip = 'Valid - expires in ' + daysUntilExpiry + ' day' + (daysUntilExpiry === 1 ? '' : 's'); }
                                else { vuClass = 'doe-vu-valid'; vuTip = 'Valid'; }
                                dateInput.classList.add(vuClass);
                                dateInput.title = vuTip;
                                validUntilCell.title = vuTip;
                            }
                        }
                    }
                }
            });
        });
        
    }, 100);
}

const originalRenderBase = render;
render = function() {
    originalRenderBase();
    updateReportorialColors();
    if (typeof updateNotifications === 'function') {
        updateNotifications();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        updateReportorialColors();
    }, 1500);
});

function refreshReportorialColors() {
    updateReportorialColors();
}

window.refreshReportorialColors = refreshReportorialColors;

document.addEventListener('input', function(e) {
    if (e.target.tagName === 'INPUT' && e.target.type === 'date') {
        if (['kpm', 'dole', 'emb', 'doe', 'env-monthly-report'].includes(state.currentTab)) {
            setTimeout(updateReportorialColors, 50);
        }
    }
});

// ── CLOUDINARY CONFIG (replaces Firebase Storage for PDF uploads) ──────────
// 1. Sign up at cloudinary.com (free tier)
// 2. Copy your "Cloud Name" from the dashboard and paste it below
// 3. Create an UNSIGNED upload preset (Settings → Upload → Upload presets)
//    and paste its name below
const CLOUDINARY_CLOUD_NAME   = 'xs57zpaa';
const CLOUDINARY_UPLOAD_PRESET = 'esh_dashboard_unsigned';

// Uploads a PDF file to Cloudinary and returns { url, publicId }.
// PDFs must go through the "raw" resource type endpoint (not "image").
async function uploadPdfToCloudinary(file, folder) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    if (folder) formData.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error('Cloudinary upload failed: ' + errText);
    }

    const data = await res.json();
    return { url: data.secure_url, publicId: data.public_id };
}

async function uploadDoePdf(projectName, quarter) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.type !== 'application/pdf') {
            showToast('Please select a PDF file', 'warning');
            return;
        }
        
        try {
            showToast(`Uploading PDF for Q${quarter}...`, 'info');
            
            const year = state.selectedYear;
            const folder = `doe-reports/${year}`;
            const { url: downloadURL, publicId } = await uploadPdfToCloudinary(file, folder);
            
            const project = state.projects.find(p => p.name === projectName);
            if (project) {
                if (!project.doePdfFiles) project.doePdfFiles = {};
                project.doePdfFiles[`Q${quarter}`] = {
                    url: downloadURL,
                    fileName: file.name,
                    cloudinaryId: publicId,
                    uploadedAt: new Date().toISOString()
                };
                
                if (window._saveDebounceTimer) clearTimeout(window._saveDebounceTimer);
                let saved = false;
                for (let attempt = 0; attempt < 4; attempt++) {
                    if (window._isSaving) { await new Promise(res => setTimeout(res, 800)); continue; }
                    saved = await saveToFirebase();
                    if (saved) break;
                    await new Promise(res => setTimeout(res, 800));
                }
                if (!saved) { window._isSaving = false; window._isSavingEcho = false; saved = await saveToFirebase(); }
                const _doeQMc = document.getElementById("main-content"); const _doeQScrollY = (_doeQMc||{}).scrollTop || 0;
                render();
                if (_doeQScrollY > 0) requestAnimationFrame(() => { if(_doeQMc) _doeQMc.scrollTop = _doeQScrollY; });
                if (saved) {
                    if (typeof window._pdfSetStatus === 'function') window._pdfSetStatus('PDF uploaded for Q' + quarter + ' — ' + projectName, 'success');
                    else showToast('PDF uploaded for Q' + quarter, 'success');
                    setTimeout(() => { if (typeof window._pdfSetStatus === 'function') window._pdfSetStatus('', 'clear'); }, 4000);
                } else {
                    if (typeof window._pdfSetStatus === 'function') window._pdfSetStatus('Uploaded to storage but cloud save may have failed. Refresh to verify.', 'error');
                    else showToast('Upload may not have saved fully. Refresh to verify.', 'warning');
                    setTimeout(() => { if (typeof window._pdfSetStatus === 'function') window._pdfSetStatus('', 'clear'); }, 6000);
                }
            }
        } catch (error) {
            console.error('Error uploading PDF:', error);
            if (typeof window._pdfSetStatus === 'function') {
                window._pdfSetStatus('Upload failed: ' + error.message, 'error');
                setTimeout(() => window._pdfSetStatus('', 'clear'), 6000);
            } else {
                showToast('Failed to upload PDF: ' + error.message, 'error');
            }
        }
    };
    
    input.click();
}

async function viewDoePdf(projectName, quarter) {
    const project = state.projects.find(p => p.name === projectName);
    if (!project || !project.doePdfFiles || !project.doePdfFiles[`Q${quarter}`]) {
        showToast('No PDF file found', 'warning');
        return;
    }
    
    const pdfData = project.doePdfFiles[`Q${quarter}`];
    window.open(pdfData.url, '_blank');
}

async function deleteDoePdf(projectName, quarter) {
    const confirmed = await showModernDialog(
        'Delete PDF',
        `Delete the uploaded PDF for Q${quarter}?<br><br>This action cannot be undone.`,
        true
    );
    
    if (!confirmed) return;
    
    try {
        const project = state.projects.find(p => p.name === projectName);
        if (!project || !project.doePdfFiles || !project.doePdfFiles[`Q${quarter}`]) {
            showToast('No PDF file found', 'warning');
            return;
        }
        
        // Note: unsigned Cloudinary uploads can't be deleted from the browser for security
        // reasons (real deletion needs your Cloudinary API secret, which should never sit in
        // client-side code). We remove the reference here so it disappears from the dashboard;
        // the actual file just stays in your Cloudinary storage (harmless — files are capped
        // the free tier gives you 25GB).
        delete project.doePdfFiles[`Q${quarter}`];
        
        await saveToFirebase();
        render();
        showToast(`PDF removed for Q${quarter}`, 'success');
    } catch (error) {
        console.error('Error deleting PDF:', error);
        showToast('Failed to delete PDF: ' + error.message, 'error');
    }
}

async function extractTextFromPdf(file) {
    try {
        if (typeof pdfjsLib === 'undefined') return null;
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ') + '\n';
        }
        return fullText;
    } catch(e) {
        return null;
    }
}

function parseDoePermitFromText(text) {
    if (!text) return { permitNumber: '', validUntil: '' };
    const t = text.replace(/\s+/g, ' ');

    let permitNumber = '';
    const permitPatterns = [
        /(?:permit\s*(?:number|no\.?|#)[:\s]*)([\w\-]+)/i,
        /\b([A-Z]{2,8}-(?:SO-?)?\d{4}-\d{2,6})\b/,
        /\b([A-Z]{2,8}-\d{4}-\d{2,6})\b/,
    ];
    for (const rx of permitPatterns) {
        const m = t.match(rx);
        if (m) { permitNumber = m[1].trim(); break; }
    }

    let validUntil = '';
    const dateLabel = /(?:valid\s*(?:until|thru|through)|validity|expir(?:y|es|ation)(?:\s*date)?)[:\s]*([\w\/\-,. ]{5,30})/i;
    const dlMatch = t.match(dateLabel);
    const rawDate = dlMatch ? dlMatch[1].trim() : '';

    const parseDate = (str) => {
        if (!str) return '';
        const months = { january:1,february:2,march:3,april:4,may:5,june:6,
                         july:7,august:8,september:9,october:10,november:11,december:12,
                         jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

        let m = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;

        m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;

        m = str.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
        if (m) {
            const mo = months[m[2].toLowerCase()];
            if (mo) return `${m[3]}-${String(mo).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
        }
        m = str.match(/([a-z]+)\s+(\d{1,2})[,\s]+(\d{4})/i);
        if (m) {
            const mo = months[m[1].toLowerCase()];
            if (mo) return `${m[3]}-${String(mo).padStart(2,'0')}-${m[2].padStart(2,'0')}`;
        }
        return '';
    };

    validUntil = parseDate(rawDate);

    if (!validUntil) {
        const allDates = [...t.matchAll(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g)];
        if (allDates.length > 0) {
            const last = allDates[allDates.length - 1];
            validUntil = `${last[3]}-${last[1].padStart(2,'0')}-${last[2].padStart(2,'0')}`;
        }
    }

    return { permitNumber, validUntil };
}

async function uploadDoePermitPdf(projectName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.style.display = 'none';
    document.body.appendChild(input);
    
    input.onchange = async (e) => {
        document.body.removeChild(input);
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.type !== 'application/pdf') {
            showToast('Please select a PDF file', 'warning');
            return;
        }
        
        try {
            showToast('Reading PDF...', 'info', 2500);

            const pdfText = await extractTextFromPdf(file);
            const parsed = parseDoePermitFromText(pdfText);

            showToast('Uploading DOE Safety Officer Permit...', 'info', 3000);
            
            const year = state.selectedYear;
            const folder = `doe-permits/${year}`;
            const { url: downloadURL, publicId } = await uploadPdfToCloudinary(file, folder);
            
            const project = state.projects.find(p => p.name === projectName);
            if (project) {
                const key = 'doe-permit_DOE Safety Officer Permit';
                if (!project.vals[key]) project.vals[key] = {};
                
                project.vals[key][3] = downloadURL;
                project.vals[key].pdfFileName = file.name;
                project.vals[key].cloudinaryId = publicId;

                const hadPermitNo   = !!(project.vals[key][1]);
                const hadValidUntil = !!(project.vals[key][2]);

                if (parsed.permitNumber && !hadPermitNo) {
                    project.vals[key][1] = parsed.permitNumber;
                }
                if (parsed.validUntil && !hadValidUntil) {
                    project.vals[key][2] = parsed.validUntil;
                }

                if (typeof _saveDebounceTimer !== 'undefined') clearTimeout(_saveDebounceTimer);
                if (window._saveDebounceTimer) clearTimeout(window._saveDebounceTimer);
                saveUserData(state.currentUser?.email);

                _pdfSetStatus('Saving DOE Permit for <strong>' + projectName + '</strong>…', 'saving');
                let saved = false;
                for (let attempt = 0; attempt < 4; attempt++) {
                    if (window._isSaving) { await new Promise(res => setTimeout(res, 800)); continue; }
                    saved = await saveToFirebase();
                    if (saved) break;
                    await new Promise(res => setTimeout(res, 800));
                }
                if (!saved) { window._isSaving = false; window._isSavingEcho = false; saved = await saveToFirebase(); }
                if (!saved) throw new Error('Could not save to Firestore. Please refresh and try again.');

                const _doeUpMc = document.getElementById("main-content"); const _doeUpScrollY = (_doeUpMc||{}).scrollTop || 0;
                render();
                if (_doeUpScrollY > 0) requestAnimationFrame(() => { if(_doeUpMc) _doeUpMc.scrollTop = _doeUpScrollY; });

                const autoMsg = [
                    (parsed.permitNumber && !hadPermitNo) ? 'Permit No: ' + parsed.permitNumber : '',
                    (parsed.validUntil   && !hadValidUntil) ? 'Valid Until: ' + parsed.validUntil : ''
                ].filter(Boolean).join(' · ');

                const successMsg = (autoMsg ? 'DOE Permit uploaded — Auto-filled: ' + autoMsg : 'DOE Permit uploaded. Fill fields manually if needed.') + ' — ' + projectName;
                _pdfSetStatus(successMsg, 'success');
                setTimeout(() => _pdfSetStatus('', 'clear'), 5000);
            }
        } catch (error) {
            console.error('Error uploading PDF:', error);
            _pdfSetStatus('DOE Permit upload failed: ' + error.message, 'error');
            setTimeout(() => _pdfSetStatus('', 'clear'), 6000);
        }
    };
    
    input.click();
}


async function viewDoePermitPdf(projectName) {
    const project = state.projects.find(p => p.name === projectName);
    const key = 'doe-permit_DOE Safety Officer Permit';
    
    if (!project || !project.vals[key] || !project.vals[key][3]) {
        showToast('No PDF file found', 'warning');
        return;
    }

    window.open(project.vals[key][3], '_blank');
}
async function deleteDoePermitPdf(projectName) {
    const confirmed = await showModernDialog(
        'Replace PDF',
        'This will delete the current PDF so you can upload a new one. Continue?',
        true
    );
    
    if (!confirmed) return;
    
    try {
        const project = state.projects.find(p => p.name === projectName);
        const key = 'doe-permit_DOE Safety Officer Permit';
        
        if (!project || !project.vals[key] || !project.vals[key][3]) {
            showToast('No PDF file found', 'warning');
            return;
        }
        
        // Note: unsigned Cloudinary uploads can't be deleted from the browser for security
        // reasons — we just clear the reference here. The old file stays harmlessly in
        // Cloudinary storage (free tier gives 25GB).
        delete project.vals[key][3];
        delete project.vals[key].pdfFileName;
        delete project.vals[key].cloudinaryId;

        _pdfSetStatus('Clearing DOE Permit PDF for <strong>' + projectName + '</strong>…', 'saving');
        let saved = false;
        for (let attempt = 0; attempt < 4; attempt++) {
            if (window._isSaving) { await new Promise(res => setTimeout(res, 800)); continue; }
            saved = await saveToFirebase();
            if (saved) break;
            await new Promise(res => setTimeout(res, 800));
        }
        if (!saved) { window._isSaving = false; window._isSavingEcho = false; saved = await saveToFirebase(); }

        render();
        if (saved) {
            _pdfSetStatus('PDF cleared — ' + projectName + '. You can now upload a new one.', 'success');
        } else {
            _pdfSetStatus('PDF removed locally but cloud save may have failed. Refresh to verify.', 'error');
        }
        setTimeout(() => _pdfSetStatus('', 'clear'), 5000);
    } catch (error) {
        console.error('Error deleting PDF:', error);
        _pdfSetStatus('Failed to delete PDF: ' + error.message, 'error');
        setTimeout(() => _pdfSetStatus('', 'clear'), 5000);
    }
}

function computeOshRequirements(manpower) {
    // Based on DOLE Section 22. OSHS for the Construction Industry
    const n = Math.max(0, parseInt(manpower) || 0);
    if (n === 0) return null;

    let firstAider = 0, safetyOfficer = 0, ohNurse = 0, ohDentist = 0, ohPhysician = 0;
    let soLabel = '', nurseLabel = '', physLabel = '', dentistLabel = '';

    if (n >= 1 && n <= 9) {
        // 1-9: 1 FA, 1 SO2, no nurse/dentist/physician
        firstAider = 1; safetyOfficer = 1; soLabel = '1 SO2';

    } else if (n >= 10 && n <= 50) {
        // 10-50: 2 FA, 2 SO2, no nurse/dentist/physician
        firstAider = 2; safetyOfficer = 2; soLabel = '2 SO2';

    } else if (n >= 51 && n <= 99) {
        // 51-99: 2 FA, 2 SO2, 2 PT Nurse, no dentist/physician
        firstAider = 2; safetyOfficer = 2; soLabel = '2 SO2';
        ohNurse = 2; nurseLabel = '2 PT';

    } else if (n >= 100 && n <= 199) {
        // 100-199: 3 FA, 3 SO2/2 SO3, no nurse, no dentist, 1 PT Physician
        firstAider = 3; safetyOfficer = 5; soLabel = '3 SO2/2 SO3';
        ohPhysician = 1; physLabel = '1 PT';

    } else if (n >= 200 && n <= 500) {
        // 200-500: 6 FA, 2 SO3 + 1 SO4, 1 FT Nurse, 1 PT Dentist, 2 PT Physician
        firstAider = 6; safetyOfficer = 3; soLabel = '2 SO3 + 1 SO4';
        ohNurse = 1; nurseLabel = '1 FT';
        ohDentist = 1; dentistLabel = '1 PT';
        ohPhysician = 2; physLabel = '2 PT';

    } else {
        // 501+: Rows from the table:
        //   Base (200-500):  6 FA, 2 SO3+1 SO4 (3 SO), 1 FT Nurse, 1 PT Dentist, 2 PT Physician
        //   501-2000 row:    FA=-, SO=-, Nurse=-, Dentist=-, Physician becomes 2 PT/1 FT (+1 FT)
        //   Every +250 row:  +1 FT Nurse
        //   Every +500 row:  +1 FA, +1 SO2, +4 PT/1 FT Physician (+5 total)
        const over500 = n - 500;
        const blocks500 = Math.floor(over500 / 500);
        const blocks250 = Math.floor(over500 / 250);

        // First Aider: 6 base + 1 per every 500 over 500
        firstAider = 6 + blocks500;

        // Safety Officer: base 2 SO3+1 SO4 (3), + 1 SO2 per every 500 over 500
        safetyOfficer = 3 + blocks500;
        soLabel = blocks500 === 0
            ? '2 SO3 + 1 SO4'
            : '2 SO3 + 1 SO4 + ' + blocks500 + ' SO2';

        // OH Nurse: 1 FT base + 1 FT per every 250 over 500
        ohNurse = 1 + blocks250;
        nurseLabel = ohNurse + ' FT';

        // OH Dentist: 1 PT (unchanged from 200-500 base)
        ohDentist = 1;
        dentistLabel = '1 PT';

        // OH Physician:
        //   501-2000 base: 2 PT + 1 FT = 3 (501-2000 row adds 1 FT to the 200-500 base of 2 PT)
        //   Every +500 over 500: +4 PT/1 FT = +5 per block
        ohPhysician = 3 + (blocks500 * 5);
        if (blocks500 === 0) {
            physLabel = '2 PT/1 FT';
        } else {
            const extraPT = blocks500 * 4;
            const extraFT = blocks500 * 1;
            physLabel = '2 PT/1 FT + ' + extraPT + ' PT/' + extraFT + ' FT';
        }
    }

    return { firstAider, safetyOfficer, ohNurse, ohDentist, ohPhysician, soLabel, nurseLabel, physLabel, dentistLabel };
}

function classifyOshPosition(pos) {
    if (!pos) return null;
    const p = pos.toLowerCase().trim();
    if (p.includes('first aid')) return 'firstAider';
    // Safety Officer IV is the only position that satisfies SO4 requirement.
    // ESH Superintendent and ESH Head are SO3-level — they do NOT qualify as SO4.
    if (p.includes('safety officer iv') || p === 'safety officer 4') return 'safetyOfficerSO4';
    if (
        p.includes('safety officer iii') || p === 'safety officer 3' ||
        p === 'esh superintendent' || p === 'esh head'
    ) return 'safetyOfficerSO3';
    if (p.includes('safety officer ii') || p === 'safety officer 2') return 'safetyOfficerSO2';
    if (p.includes('safety officer i')  || p === 'safety officer 1') return 'safetyOfficerSO1';
    if (p.includes('safety officer')) return 'safetyOfficerSO2'; // generic fallback → SO2
    if (p.includes('nurse')) return 'ohNurse';
    if (p.includes('dentist')) return 'ohDentist';
    if (p.includes('physician') || p.includes('doctor')) return 'ohPhysician';
    return null;
}

function getOshData(projectName) {
    if (!state.oshData) state.oshData = {};
    if (!state.oshData[projectName]) {
        state.oshData[projectName] = { manpower: 0 };
    }
    return state.oshData[projectName];
}

function saveOshData() {
    if (!window.firebaseDb || !firebaseReady || !state.oshData) {
        if (state.currentUser?.email) saveUserDataLocal(state.currentUser.email);
        return;
    }

    const _oshUserInfo = UserAccounts.getUserInfo(state.currentUser?.email);
    const _oshAllowedRegion = (() => {
        if (_oshUserInfo.role === 'admin')       return 'CORPORATE';
        if (_oshUserInfo.role === 'envi_head')   return ['PLANT OPERATIONS', 'CORPORATE'];
        if (_oshUserInfo.role === 'corp_nurse')  return '__NONE__';
        if (_oshUserInfo.region && _oshUserInfo.region !== 'ALL') return _oshUserInfo.region;
        return null;
    })();

    const dataUserId = getDataSourceUserId();
    const year = state.selectedYear || 2026;
    let _oshSkipped = 0;
    Object.entries(state.oshData).forEach(([projectName, oshEntry]) => {
        const project = (state.masterProjects || state.projects || []).find(p => p.name === projectName);
        if (!project) return;

        if (_oshAllowedRegion && !(Array.isArray(_oshAllowedRegion) ? _oshAllowedRegion.includes(project.region) : project.region === _oshAllowedRegion)) {
            _oshSkipped++;
            return;
        }

        const projectId = ProjectsDB.getProjectId(project.name);
        const projectRef = window.firebase.doc(
            window.firebaseDb, 'users', dataUserId, 'years', year.toString(), 'projects', projectId
        );
        window.firebase.setDoc(projectRef, { oshData: oshEntry }, { merge: true })
            .catch(e => console.warn('saveOshData failed for "' + projectName + '":', e.message));
    });
    if (_oshSkipped > 0) {
    }
}

function countActualOshPersonnel(projectName) {
    const data = state.personnelData || [];
    const counts = {
        firstAider: 0,
        safetyOfficer: 0,  // total of all SO levels (SO1+SO2+SO3+SO4)
        so4Count: 0,        // SO4-only count for SO4-specific requirement checks
        safetyOfficerSO4: 0,
        safetyOfficerSO3: 0,
        safetyOfficerSO2: 0,
        safetyOfficerSO1: 0,
        ohNurse: 0, ohDentist: 0, ohPhysician: 0, names: []
    };
    data.forEach(p => {
        if (p.current === projectName) {
            const cat = classifyOshPosition(p.pos);
            if (cat) {
                // Aggregate all SO sub-levels into safetyOfficer total
                if (cat === 'safetyOfficerSO4' || cat === 'safetyOfficerSO3' ||
                    cat === 'safetyOfficerSO2' || cat === 'safetyOfficerSO1') {
                    counts.safetyOfficer++;
                    counts[cat]++;
                    if (cat === 'safetyOfficerSO4') counts.so4Count++;
                } else {
                    counts[cat]++;
                }
                counts.names.push({ name: p.name || '?', pos: p.pos, cat });
            }
        }
    });
    return counts;
}

function renderOsh2() {
    const container = document.getElementById('osh2-regions-container');
    if (!container) return;

    if (!document.getElementById('osh2-card-css')) {
        const st = document.createElement('style');
        st.id = 'osh2-card-css';
        st.textContent = [
            '.osh2-list{padding:8px;display:flex;flex-direction:column;gap:6px}',
            '.osh2-card{background:var(--bg-card);border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-radius:10px;padding:5px 12px;display:flex;align-items:center;gap:14px}',
            '.osh2-top{display:flex;align-items:center;gap:10px;flex-wrap:nowrap;flex:0 0 32%;min-width:380px;max-width:500px}',
            '.osh2-title{flex:1;min-width:0;font-weight:600;font-size:.78rem;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
            '.osh2-idx{color:var(--text-secondary);font-size:.62rem;margin-right:5px}',
            '.osh2-sub{font-size:.58rem;color:var(--text-secondary);font-weight:400}',
            '.osh2-mp{display:flex;align-items:center;gap:6px;font-size:.58rem;color:var(--text-secondary)}.osh2-mp input,.osh2-mp>div{width:56px!important;padding:3px 5px!important;font-size:.7rem!important}',
            '.osh2-chips{flex:1;min-width:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:0}',
            '.osh2-chip{border-radius:6px;padding:3px 8px;border:none;display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:6px;align-items:center;line-height:1.2}',
            '.osh2-cl{grid-column:1 / -1;font-size:.56rem;font-weight:600;opacity:.85}',
            '.osh2-cv{font-size:.74rem;font-weight:800;display:flex;align-items:center;gap:5px}.osh2-cv i{font-size:.7rem}',
            '.osh2-cs{font-size:.54rem;font-weight:600;min-width:0}.osh2-cs:empty{display:none}',
            '.osh2-chip.ok{background:#e8f5e9;color:#2e7d32}',
            '.osh2-chip.part{background:#fff3e0;color:#e65100}',
            '.osh2-chip.none{background:#ffebee;color:#c62828}',
            '.osh2-chip.nr{background:#eef1ef;color:#9e9e9e}',
            'body.dark-mode .osh2-chip.nr{background:var(--input-bg)}',
            '.osh2-chip.nr .osh2-cv{font-size:.68rem;font-weight:600;opacity:.6}',
            '.osh2-people{margin-top:5px;padding-top:4px;border-top:1px solid var(--border-color);display:flex;flex-wrap:wrap;gap:2px 14px}',
            'body.dark-mode .osh2-chip.ok{background:rgba(76,175,80,.15);color:#a5d6a7}',
            'body.dark-mode .osh2-chip.part{background:rgba(255,152,0,.15);color:#ffb74d}',
            'body.dark-mode .osh2-chip.none{background:rgba(244,67,54,.15);color:#ef9a9a}',
            '@media (max-width:1280px){.osh2-card{display:block}.osh2-top{flex-wrap:wrap;min-width:0;max-width:none}.osh2-title{min-width:200px}.osh2-chips{grid-template-columns:repeat(auto-fit,minmax(110px,1fr));margin-top:6px}}'
        ].join('');
        document.head.appendChild(st);
    }

    const regionFilter = (document.getElementById('osh2-region-filter') || {}).value || 'all';
    const statusFilter = (document.getElementById('osh2-status-filter') || {}).value || 'all';

    const allProjects = getReportProjects(); // exclude work-stopped projects from OSH requirement tab

    const REGIONS = ['NCR', 'SOUTH LUZON', 'NORTH LUZON', 'VISAYAS & MINDANAO'];
    const grouped = {};
    REGIONS.forEach(r => grouped[r] = []);

    allProjects.forEach(p => {
        const r = (p.region || '').trim().toUpperCase();
        if (grouped[r] !== undefined) grouped[r].push(p);
    });

    let totalProjects = 0, totalCompliant = 0, totalDeficient = 0, totalNoInput = 0;
    let html = '';

    const REGIONS_TO_SHOW = [...REGIONS];

    REGIONS_TO_SHOW.forEach(region => {
        if (regionFilter !== 'all' && regionFilter.toUpperCase() !== region) return;

        let projects = grouped[region] || [];
        if (!projects.length) return;

        let regionRows = '';
        let rCompliant = 0, rDeficient = 0, rNoInput = 0;

        projects.forEach((proj, idx) => {
            const d = getOshData(proj.name);
            const manpower = parseInt(d.manpower) || 0;
            const req = computeOshRequirements(manpower);
            const actual = countActualOshPersonnel(proj.name);

            let rowStatus = 'no-input';
            let defGaps = [];

            if (req) {
                const cats = ['firstAider','safetyOfficer','ohNurse','ohDentist','ohPhysician'];
                let hasDeficiency = false;
                cats.forEach(cat => {
                    if (req[cat] > 0 && actual[cat] < req[cat]) {
                        hasDeficiency = true;
                        defGaps.push(cat);
                    }
                });
                // Extra check: when SO4 is required (soLabel contains 'SO4'), verify at least 1 actual SO4 is present.
                // ESH Superintendent and ESH Head are SO3-level and do NOT satisfy the SO4 slot.
                if (req.soLabel && req.soLabel.includes('SO4') && actual.so4Count < 1) {
                    hasDeficiency = true;
                    defGaps.push('safetyOfficerSO4');
                }
                rowStatus = hasDeficiency ? 'deficient' : 'compliant';
                if (hasDeficiency) rDeficient++; else rCompliant++;
            } else {
                rNoInput++;
            }

            totalProjects++;

            if (statusFilter !== 'all' && statusFilter !== rowStatus) return;

            const safeN = (proj.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

            const _oshUserInfo = UserAccounts.getUserInfo(state.currentUser?.email);
            const canEditThisRegion = state.isEditing && (
                _oshUserInfo.role === 'admin'
                || (_oshUserInfo.role === 'superintendent' && _oshUserInfo.region === region)
                || (_oshUserInfo.role === 'corp_nurse')
            );

            function makeCell(cat, reqCount, actCount, label) {
                const CAT_NAMES = { firstAider:'First aider', safetyOfficer:'Safety officer', ohNurse:'OH nurse', ohDentist:'OH dentist', ohPhysician:'OH physician' };
                const catName = CAT_NAMES[cat] || cat;
                if (reqCount === 0) {
                    const _nrPeople = actual.names.filter(n => n.cat === cat);
                    const _nrTitle = _nrPeople.length ? ' title="' + _nrPeople.map(n => n.name + ' (' + n.pos + ')').join('\n').replace(/"/g, '&quot;') + '"' : '';
                    return `<div class="osh2-chip nr"${_nrTitle}><span class="osh2-cl">${catName}</span><span class="osh2-cv">N/R</span><span class="osh2-cs"></span></div>`;
                }

                // Safety officer: SO4 sub-requirement (ESH Head/Supt are SO3 only)
                const so4Missing = (cat === 'safetyOfficer' && req.soLabel && req.soLabel.includes('SO4') && actual.so4Count < 1);
                const ok = actCount >= reqCount && !so4Missing;
                const kind = ok ? 'ok' : (actCount > 0 ? 'part' : 'none');

                const SO_CATS = ['safetyOfficerSO4','safetyOfficerSO3','safetyOfficerSO2','safetyOfficerSO1'];
                const peopleInCat = cat === 'safetyOfficer'
                    ? actual.names.filter(n => SO_CATS.includes(n.cat))
                    : actual.names.filter(n => n.cat === cat);
                const namesTooltip = peopleInCat.length
                    ? peopleInCat.map(n => n.name + ' (' + n.pos + ')').join('\n')
                    : 'None assigned';
                const so4Warning = so4Missing ? '\nNo Safety Officer IV assigned' : '';

                return `<div class="osh2-chip ${kind}" title="${namesTooltip}${so4Warning}">
                    <span class="osh2-cl">${catName}</span>
                    <span class="osh2-cv">${window._rowStatus(kind, '', '', false)}<span>${actCount}/${reqCount}</span></span>
                    <span class="osh2-cs">${so4Missing ? 'Missing: SO4' : (label || '')}</span>
                </div>`;
            }

            const statusBadge = !req
                ? window._rowStatus('wait', 'No input', '', true)
                : rowStatus === 'compliant'
                    ? window._rowStatus('ok', 'Compliant', '', true)
                    : window._rowStatus('part', 'Deficient', '', true);

            const mpHtml = canEditThisRegion
                ? `<input class="osh2-mp-input" type="number" min="0" value="${manpower||''}" placeholder="0"
                        onchange="updateOsh2Manpower('${safeN}',this.value)"
                        style="width:65px;padding:5px 6px;border:1.5px solid ${manpower>0?'#2e7d32':'var(--border-color)'};border-radius:6px;background:var(--input-bg);color:var(--text-primary);font-size:0.78rem;text-align:center;font-weight:700;" />`
                : `<div style="width:65px;padding:5px 6px;border:1.5px solid var(--border-color);border-radius:6px;background:rgba(0,0,0,0.04);color:var(--text-secondary);font-size:0.78rem;text-align:center;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:4px;cursor:not-allowed;" title="You can only edit your assigned region">
                        <i class="fas fa-lock" style="font-size:0.6rem;opacity:0.5;"></i>
                        <span>${manpower > 0 ? manpower : '–'}</span>
                   </div>`;

            regionRows += `<div class="osh2-card">
                <div class="osh2-top">
                    <div class="osh2-title" title="${String(proj.name||'').replace(/"/g,'&quot;')}">${proj.name}</div>
                    <div class="osh2-mp"><span>Manpower</span>${mpHtml}</div>
                    <div>${statusBadge}</div>
                </div>
                ${req ? `<div class="osh2-chips">
                    ${makeCell('firstAider', req.firstAider, actual.firstAider, '')}
                    ${makeCell('safetyOfficer', req.safetyOfficer, actual.safetyOfficer, req.soLabel)}
                    ${makeCell('ohNurse', req.ohNurse, actual.ohNurse, req.nurseLabel)}
                    ${makeCell('ohDentist', req.ohDentist, actual.ohDentist, req.dentistLabel||'')}
                    ${makeCell('ohPhysician', req.ohPhysician, actual.ohPhysician, req.physLabel)}
                </div>` : ''}
            </div>`;
        });

        totalCompliant += rCompliant;
        totalDeficient += rDeficient;
        totalNoInput += rNoInput;

        if (!regionRows) return; // All filtered out

        const regionTotal = rCompliant + rDeficient + rNoInput;
        const rPct = regionTotal > 0 ? Math.round((rCompliant / (rCompliant + rDeficient)) * 100) : 0;

        const canEditRegion = state.isEditing && UserAccounts.canEdit(state.currentUser?.email, region);

        html += `
        <div style="background:var(--bg-card);border-radius:10px;overflow:hidden;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.05);margin-bottom:16px;">
            
            ${window.regionBanner({ id: `osh2-rbanner-${region.replace(/[^a-zA-Z0-9]/g,'_')}`, reg: region, icon: 'fa-location-dot', collapsed: true, editable: canEditRegion, style: 'margin:0;',
                onclick: `toggleOsh2Region(this,'osh2-region-${region.replace(/[^a-z0-9]/gi,'_')}')`,
                right: `<span class="rbadge rbadge-count rb-proj">${projects.length} PROJECT${projects.length!==1?'S':''}</span>`
                    + `<span class="rbadge" style="background:rgba(76,175,80,0.3);color:#a5d6a7;"><i class="fas fa-circle-check"></i> ${rCompliant} OK</span>`
                    + (rDeficient > 0 ? `<span class="rbadge" style="background:rgba(255,82,82,0.3);color:#ff8a80;animation:osh-pulse 2s infinite;"><i class="fas fa-circle-half-stroke"></i> ${rDeficient} Deficient</span>` : '')
                    + (rNoInput > 0 ? `<span class="rbadge" style="background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);"><i class="fas fa-clock"></i> ${rNoInput} No Input</span>` : '')
                    + ((rCompliant+rDeficient)>0 ? `<span class="rbadge rbadge-avg">${rPct}% COMPLIANT</span>` : '') })}

            
            <div id="osh2-region-${region.replace(/[^a-z0-9]/gi,'_')}" style="overflow-x:auto;display:none;">
                <div class="osh2-list">${regionRows}</div>
            </div>
        </div>`;
    });

    // ── Preserve opened regions across re-render (Edit/Save rebuilds this view) ──
    const _osh2Open = [];
    container.querySelectorAll('[id^="osh2-region-"]').forEach(function(el) {
        if (el.style.display !== 'none') _osh2Open.push(el.id);
    });
    container.innerHTML = html || `<div style="padding:50px;text-align:center;color:var(--text-secondary);background:var(--bg-card);border-radius:10px;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <i class="fas fa-hard-hat" style="font-size:2.5rem;opacity:0.25;margin-bottom:12px;"></i>
        <div style="font-weight:600;">No projects match the current filter.</div>
    </div>`;
    _osh2Open.forEach(function(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = '';
        const hdr = el.previousElementSibling;
        if (hdr) hdr.classList.remove('collapsed');
    });
    applyNumFmtToInputs();

    const tot = totalCompliant + totalDeficient;
    const pct = tot > 0 ? Math.round((totalCompliant / tot) * 100) : 0;
    const b1 = document.getElementById('osh2-badge-total');
    const b2 = document.getElementById('osh2-badge-compliant');
    const b3 = document.getElementById('osh2-badge-deficient');
    if (b1) b1.textContent = `${allProjects.length} Projects`;
    if (b2) b2.innerHTML = `<i class="fas fa-circle-check"></i> ${totalCompliant} Compliant`;
    if (b3) b3.innerHTML = totalDeficient > 0 ? `<i class="fas fa-circle-half-stroke"></i> ${totalDeficient} Deficient` : `<i class="fas fa-circle-check"></i> All Checked`;

    const statBar = document.getElementById('osh2-stat-bar');
    if (statBar && allProjects.length > 0) {
        const pctC = Math.round((totalCompliant / allProjects.length) * 100);
        const pctD = Math.round((totalDeficient / allProjects.length) * 100);
        statBar.innerHTML = `
            <div title="${totalCompliant} Compliant" style="height:6px;width:${pctC}%;background:#4caf50;transition:width 0.5s;"></div>
            <div title="${totalDeficient} Deficient" style="height:6px;width:${pctD}%;background:#ff7043;transition:width 0.5s;"></div>
            <div title="${totalNoInput} No Input" style="height:6px;flex:1;background:#e0e0e0;"></div>`;
    }
}

function updateOsh2Manpower(projectName, value) {
    if (!state.oshData) state.oshData = {};
    if (!state.oshData[projectName]) state.oshData[projectName] = {};
    state.oshData[projectName].manpower = Math.max(0, parseInt(value) || 0);
    saveOshData();
    clearTimeout(window._osh2Timer);
    window._osh2Timer = setTimeout(() => {
        renderOsh2();
        if (typeof updateNotifications === 'function') updateNotifications();
    }, 600);
}

function toggleOsh2Region(headerEl, contentId) {
    const content = document.getElementById(contentId);
    if (!content) return;
    const isOpen = content.style.display !== 'none';
    content.style.display = isOpen ? 'none' : '';
    headerEl.classList.toggle('collapsed', isOpen);
}

document.addEventListener('DOMContentLoaded', function() {
});
