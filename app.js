// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
const S = {
  title: 'STARVIXEN', issue: '12', date: '04/26',
  spineBgColor: '#111111', spineTextColor: '#ffffff',
  titleFontName: 'Bebas Neue',
  spineIssueRot: 'cw',
  spineHideDate: false,
  bgImgEl: null, mainImgEl: null, logoImgEl: null, backImgEl: null,
  spineFullImgEl: null, spineBottomImgEl: null,
  mainPosY: 50, mainOpacity: 1, overlayOp: 0.5,
  frontBgColor: '#1a1212', backBgColor: '#0d0d0d',
  showBarcode: true,
  lang: 'en',
  magSize: 'letter',
  dpi: 300,
  frontAlign: 'center',
  taglineAlign: 'center',
  // base64 data URLs for the current issue's images
  imageData: { bgimg: null, main: null, logo: null, back: null, spinefull: null, spinebottom: null },
};

// ══════════════════════════════════════════════
//  MULTI-ISSUE ENGINE
// ══════════════════════════════════════════════

// Fields captured/restored per issue
const ISSUE_TEXT_FIELDS = ['f-issue','f-date','f-masthead','f-tagline','f-headline','f-sub','f-teaser','f-feat-left','f-feat-right','f-vert-left','f-vert-right','f-vert-right2','f-label','f-extra-call1','f-extra-call2','f-price-front','b-brand','b-tagline','b-blurb','b-website','b-price','b-legal'];
const ISSUE_STATE_KEYS  = ['title','issue','date','spineBgColor','spineTextColor','titleFontName','spineIssueRot','spineHideDate','mainPosY','mainOpacity','overlayOp','frontBgColor','backBgColor','showBarcode','lang','frontAlign','taglineAlign'];

let ISSUES = [];
let CURRENT_IDX = 0;

function snapshotCurrentIssue() {
  const snap = {};
  ISSUE_STATE_KEYS.forEach(k => snap[k] = S[k]);
  snap.domText = {};
  ISSUE_TEXT_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    snap.domText[id] = el ? (el.innerText || el.textContent || '') : '';
  });
  snap.titleColor   = document.getElementById('f-masthead')?.style.color || '#fff';
  snap.mastheadFont = document.getElementById('f-masthead')?.style.fontFamily || '';
  snap.imageData = { ...S.imageData };
  snap.domPositions = collectDomPositions();
  return snap;
}

function applyIssueSnapshot(snap) {
  ISSUE_STATE_KEYS.forEach(k => { if (snap[k] !== undefined) S[k] = snap[k]; });

  const ti = document.getElementById('input-title');
  const ii = document.getElementById('input-issue');
  const di = document.getElementById('input-date');
  if (ti) ti.value = snap.title || '';
  if (ii) ii.value = snap.issue || '';
  if (di) di.value = snap.date  || '';

  if (snap.domText) {
    ISSUE_TEXT_FIELDS.forEach(id => {
      const val = snap.domText[id];
      if (val === undefined) return;
      // Update cover contenteditable (innerText preserves line breaks)
      const el = document.getElementById(id);
      if (el) el.innerText = val;
      // Sync sidebar input (id="si-{id}")
      const si = document.getElementById('si-' + id);
      if (si) si.value = val;
    });
  }

  const mast  = document.getElementById('f-masthead');
  const brand = document.getElementById('b-brand');
  if (mast)  { mast.style.color = snap.titleColor||''; mast.style.fontFamily = snap.mastheadFont||''; mast.style.textAlign = snap.frontAlign||'center'; }
  if (brand) { brand.style.fontFamily = snap.mastheadFont||''; }
  const tagline = document.getElementById('f-tagline');
  if (tagline) tagline.style.textAlign = snap.taglineAlign||'center';

  const spineHideCB = document.getElementById('spine-hide-date');
  if (spineHideCB) spineHideCB.checked = !!snap.spineHideDate;

  S.imageData = { bgimg:null, main:null, logo:null, back:null, spinefull:null, spinebottom:null, ...(snap.imageData||{}) };
  restoreAllImages(S.imageData);
  // Clear all moved flags first, then apply saved positions
  [...DRAGGABLE_IDS, 'b-brand','b-tagline','b-blurb','b-website','b-price','b-legal'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    delete el.dataset.moved;
    el.style.top = ''; el.style.left = ''; el.style.right = ''; el.style.bottom = ''; el.style.transform = '';
  });
  applyDomPositions(snap.domPositions);

  renderSpine();
  fitAllTitles();
}

function saveCurrentAndGo(newIdx) {
  if (ISSUES.length === 0) return;
  ISSUES[CURRENT_IDX] = { ...ISSUES[CURRENT_IDX], ...snapshotCurrentIssue() };
  CURRENT_IDX = Math.max(0, Math.min(newIdx, ISSUES.length - 1));
  applyIssueSnapshot(ISSUES[CURRENT_IDX]);
  updateStepperUI();
  renderIssueCards();
}

function updateStepperUI() {
  const info  = document.getElementById('stepper-info');
  const badge = document.getElementById('issue-count-badge');
  const total = ISSUES.length;
  const cur   = CURRENT_IDX + 1;
  if (info)  info.textContent  = `Issue ${cur} / ${total}`;
  if (badge) badge.textContent = `${total} issue${total !== 1 ? 's' : ''} in project`;
}

function stepIssue(dir) {
  const newIdx = CURRENT_IDX + dir;
  if (newIdx < 0 || newIdx >= ISSUES.length) return;
  saveCurrentAndGo(newIdx);
}

function addNewIssue() {
  // Save current before adding
  if (ISSUES.length > 0) {
    ISSUES[CURRENT_IDX] = { ...ISSUES[CURRENT_IDX], ...snapshotCurrentIssue() };
  }
  const prev  = ISSUES[ISSUES.length - 1] || snapshotCurrentIssue();
  const newIss = { ...prev };
  // Auto-increment volume number
  newIss.issue = bumpVolumeLabel(prev.issue || 'Vol. 1');
  newIss.date  = bumpDateByMonths(prev.date || 'January 2026', 1);
  if (newIss.domText) {
    newIss.domText['f-issue'] = newIss.issue;
    newIss.domText['f-date']  = newIss.date;
  }
  ISSUES.push(newIss);
  CURRENT_IDX = ISSUES.length - 1;
  applyIssueSnapshot(ISSUES[CURRENT_IDX]);
  updateStepperUI();
  renderIssueCards();
  // Switch to design view if on issues tab
  const canvasArea = document.querySelector('.canvas-area');
  const issPanel   = document.getElementById('issues-panel');
  if (issPanel && issPanel.classList.contains('visible')) {
    setView('all', { target: document.querySelector('.tab') });
  }
}

function duplicateCurrentIssue() {
  ISSUES[CURRENT_IDX] = { ...ISSUES[CURRENT_IDX], ...snapshotCurrentIssue() };
  const dup = { ...ISSUES[CURRENT_IDX] };
  if (dup.domText) dup.domText = { ...dup.domText };
  dup.issue = bumpVolumeLabel(dup.issue || 'Vol. 1');
  dup.date  = bumpDateByMonths(dup.date || 'January 2026', 1);
  if (dup.domText) {
    dup.domText['f-issue'] = dup.issue;
    dup.domText['f-date']  = dup.date;
  }
  ISSUES.splice(CURRENT_IDX + 1, 0, dup);
  CURRENT_IDX++;
  applyIssueSnapshot(ISSUES[CURRENT_IDX]);
  updateStepperUI();
  renderIssueCards();
}

function deleteIssue(idx) {
  if (ISSUES.length <= 1) { alert('At least one issue must remain.'); return; }
  ISSUES.splice(idx, 1);
  CURRENT_IDX = Math.min(CURRENT_IDX, ISSUES.length - 1);
  applyIssueSnapshot(ISSUES[CURRENT_IDX]);
  updateStepperUI();
  renderIssueCards();
}

function renderIssueCards() {
  const grid = document.getElementById('issues-grid');
  if (!grid) return;
  grid.innerHTML = '';
  ISSUES.forEach((iss, i) => {
    const isActive = (i === CURRENT_IDX);
    const card = document.createElement('div');
    card.className = 'issue-card' + (isActive ? ' active-issue' : '');
    card.innerHTML = `
      ${isActive ? '<div class="issue-active-badge">Editing</div>' : ''}
      <div class="issue-card-num">Issue ${i + 1}</div>
      <div class="issue-card-title">${escHtml(iss.title || 'Untitled')}</div>
      <div class="issue-card-date">${escHtml(iss.date  || '—')}</div>
      <div class="issue-card-vol">${escHtml(iss.issue || '—')}</div>
      <div class="issue-card-actions">
        <button class="btn-secondary" style="flex:1;font-size:9px;padding:4px 0" onclick="loadIssue(${i})">Edit</button>
        <button class="btn-danger-sm" onclick="event.stopPropagation();deleteIssue(${i})">Delete</button>
      </div>`;
    card.addEventListener('click', () => loadIssue(i));
    grid.appendChild(card);
  });
}

function loadIssue(idx) {
  saveCurrentAndGo(idx);
  // Switch back to design view
  setView('all', { target: document.querySelector('.tab') });
}

// ── Series generator ──
function openSeriesDialog() {
  // Default start month to current month
  const now = new Date();
  const mSel = document.getElementById('gen-month');
  const ySel = document.getElementById('gen-year');
  if (mSel) mSel.value = now.getMonth();
  if (ySel) ySel.value = now.getFullYear();
  document.getElementById('series-dialog').style.display = 'flex';
}
function closeSeriesDialog() {
  document.getElementById('series-dialog').style.display = 'none';
}
function generateSeries() {
  const volStart  = parseInt(document.getElementById('gen-vol-start').value)  || 1;
  const count     = Math.min(48, parseInt(document.getElementById('gen-count').value) || 6);
  const startMonth= parseInt(document.getElementById('gen-month').value);
  const startYear = parseInt(document.getElementById('gen-year').value) || 2026;
  const cadence   = parseInt(document.getElementById('gen-cadence').value) || 1;
  const volStyle  = document.getElementById('gen-vol-style').value;

  // Save current state first
  if (ISSUES.length > 0) ISSUES[CURRENT_IDX] = { ...ISSUES[CURRENT_IDX], ...snapshotCurrentIssue() };
  const base = ISSUES[CURRENT_IDX] || snapshotCurrentIssue();

  ISSUES = [];
  for (let i = 0; i < count; i++) {
    const d  = new Date(startYear, startMonth + i * cadence, 1);
    const mo = d.toLocaleString('en-US', { month: 'long' });
    const yr = d.getFullYear();
    const volNum  = volStart + i;
    const volLabel= fmtVolLabel(volStyle, volNum);
    const dateStr = `${mo} ${yr}`;
    const iss = { ...base };
    if (iss.domText) iss.domText = { ...iss.domText };
    iss.issue = volLabel;
    iss.date  = dateStr;
    if (iss.domText) {
      iss.domText['f-issue'] = volLabel;
      iss.domText['f-date']  = dateStr;
    }
    ISSUES.push(iss);
  }
  CURRENT_IDX = 0;
  applyIssueSnapshot(ISSUES[0]);
  updateStepperUI();
  renderIssueCards();
  closeSeriesDialog();
  setView('issues', { target: document.getElementById('tab-issues') });
}

// ── Helpers ──
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function bumpDateByMonths(dateStr, n) {
  const parts = (dateStr || '').split(' ');
  const mIdx  = MONTHS.indexOf(parts[0]);
  const yr    = parseInt(parts[1]) || new Date().getFullYear();
  if (mIdx < 0) return dateStr;
  const d = new Date(yr, mIdx + n, 1);
  return MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}
function bumpVolumeLabel(label) {
  const m = label.match(/(\d+)\s*$/);
  if (!m) return label + ' 2';
  return label.replace(/\d+\s*$/, '') + (parseInt(m[1]) + 1);
}
function fmtVolLabel(style, n) {
  switch(style) {
    case 'no':    return `No. ${n}`;
    case 'issue': return `Issue ${n}`;
    case 'num':   return `#${n}`;
    default:      return `Vol. ${n}`;
  }
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init first issue from current state ──
function initIssues() {
  ISSUES = [ snapshotCurrentIssue() ];
  CURRENT_IDX = 0;
  updateStepperUI();
  renderIssueCards();
}

// ══════════════════════════════════════════════
//  SPINE CONSTANTS
// ══════════════════════════════════════════════
const SPINE_W   = 28;
const SPINE_H   = 560;
const SPINE_PAD = 28;   // equal margin from top and bottom edges

// ══════════════════════════════════════════════
//  BARCODE  —  EAN-13, magazine-style
//  Structure: [2-digit country] + [01729] + [5-digit issue/year] + [check]
// ══════════════════════════════════════════════

// GS1 country prefixes (2-digit)
const EAN_COUNTRY_PREFIX = {
  en: '00',   // USA / English
  de: '40',   // Germany
  ja: '45',   // Japan
  fr: '30',   // France
  es: '84',   // Spain
};

// EAN-13 check digit (standard weighted sum)
function ean13Check(digits12) {
  let s = 0;
  for (let i = 0; i < 12; i++) s += parseInt(digits12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (s % 10)) % 10;
}

// Build EAN-13:
//   [2]  country prefix  (from S.lang)
//   [5]  fixed "01729"
//   [5]  dynamic — derived from issue number + year
//   [1]  EAN-13 check digit
function buildEAN13(issueStr, dateStr, lang) {
  const prefix  = EAN_COUNTRY_PREFIX[lang || 'en'] || '00';
  const fixed   = '01729';

  // Issue number — strip non-digits, fallback 1
  const issueNum = parseInt((issueStr || '1').replace(/\D+/g, '')) || 1;
  // Year — extract 4-digit year, fallback current
  const yearMatch = (dateStr || '').match(/\d{4}/);
  const year      = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

  // Dynamic 5 digits:  issue padded to 3  +  last 2 of year  (e.g. issue 12, 2026 → "01226")
  const dynIssue = String(issueNum % 1000).padStart(3, '0');
  const dynYear  = String(year % 100).padStart(2, '0');
  const dynamic  = dynIssue + dynYear;           // always exactly 5 digits

  const digits12 = prefix + fixed + dynamic;     // 2+5+5 = 12
  const check    = ean13Check(digits12);
  return digits12 + check;                       // 13 digits total
}

function makeBarcodeDataURL(ean) {
  // Legacy: kept for any external callers; returns empty
  return '';
}

function refreshBarcodes() {
  const ean = buildEAN13(S.issue, S.date, S.lang);
  const svgEl = document.getElementById('bc-svg-front');
  if (!svgEl) return;
  try {
    JsBarcode(svgEl, ean, {
      format:       'EAN13',
      lineColor:    '#ffffff',
      background:   'transparent',
      width:        1.4,
      height:       22,
      displayValue: true,
      fontSize:     7,
      margin:       2,
      font:         '"DM Sans", sans-serif',
      textMargin:   2,
      xmlDocument:  document
    });
  } catch(e) {
    console.warn('Barcode SVG error:', e);
  }
}

// Rasterize the inline SVG barcode to a canvas ImageBitmap (used during hi-res export)
async function getBarcodeBitmap() {
  const svgEl = document.getElementById('bc-svg-front');
  if (!svgEl) return null;
  const serializer = new XMLSerializer();
  let svgStr = serializer.serializeToString(svgEl);
  // Ensure xmlns is present
  if (!svgStr.includes('xmlns=')) {
    svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function initBarcodes() { refreshBarcodes(); }

function toggleBarcode(show) {
  S.showBarcode = show;
  const fEl = document.getElementById('f-barcode');
  if (fEl) fEl.style.display = show ? '' : 'none';
  scheduleSave();
}


// ══════════════════════════════════════════════
//  SPINE CANVAS RENDERER
// ══════════════════════════════════════════════

// Return the vertical offset needed to visually center a string drawn with textBaseline:'alphabetic'
// Positive offset shifts the draw point DOWN to compensate for font metric dead space.
function spineGlyphOffset(ctx, text) {
  const m       = ctx.measureText(text);
  const ascent  = m.actualBoundingBoxAscent  ?? 0;
  const descent = m.actualBoundingBoxDescent ?? 0;
  const glyphH  = ascent + descent;
  // 'middle' baseline sits at (ascent - descent)/2 above the baseline
  // True visual center correction:
  return (ascent - descent) / 2 - glyphH / 2 + descent;
}

function drawSpineCtx(ctx, W, H) {
  const PAD = SPINE_PAD;

  // ── 1. Background ──
  ctx.fillStyle = S.spineBgColor;
  ctx.fillRect(0, 0, W, H);

  // ── 2. Full spine image ──
  if (S.spineFullImgEl) {
    drawImageCover(ctx, S.spineFullImgEl, 0, 0, W, H, 50);
  }

  // ── 3. Date — top, reads top→bottom (CW rotation) ──
  if (S.date && !S.spineHideDate) {
    const dateText = S.date.toUpperCase();
    ctx.save();
    ctx.font = '7px "DM Sans", Arial, sans-serif';
    const m      = ctx.measureText(dateText);
    const gAsc   = m.actualBoundingBoxAscent  ?? 5;
    const gDesc  = m.actualBoundingBoxDescent ?? 1;
    // To center the glyph across the spine width:
    // after CW rotation, the glyph's height maps to the screen X axis.
    // Drawing the baseline at +(gAsc-gDesc)/2 places the visual glyph center at the origin (W/2).
    const shift  = (gAsc - gDesc) / 2;
    ctx.translate(W / 2, PAD);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle    = S.spineTextColor;
    ctx.globalAlpha  = 0.45;
    ctx.fillText(dateText, 0, shift);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── 4. Title — true visual center of spine ──
  {
    const titleText = S.title.toUpperCase();
    const maxLen    = H - 2 * (PAD + 18);
    let   fontSize  = 16;
    const fontStack = `"${S.titleFontName}", sans-serif`;
    ctx.font = `${fontSize}px ${fontStack}`;
    const measured  = ctx.measureText(titleText).width;
    if (measured > maxLen) {
      fontSize = Math.max(7, Math.floor(fontSize * maxLen / measured));
    }
    ctx.font = `${fontSize}px ${fontStack}`;

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle    = S.spineTextColor;

    // Compute tight vertical center: offset so visual glyph mid = 0
    const m     = ctx.measureText(titleText);
    const gAsc  = m.actualBoundingBoxAscent  ?? fontSize * 0.72;
    const gDesc = m.actualBoundingBoxDescent ?? fontSize * 0.12;
    const shift = (gAsc - gDesc) / 2; // shifts baseline so glyph center = 0
    ctx.fillText(titleText, 0, shift);
    ctx.restore();
  }

  // ── 5. Bottom emblem image ──
  if (S.spineBottomImgEl) {
    const imgSz = W - 6;
    const imgX  = (W - imgSz) / 2;
    const imgY  = H - PAD - 2 - 14 - imgSz;
    ctx.drawImage(S.spineBottomImgEl, imgX, imgY, imgSz, imgSz);
  }

  // ── 6. Issue — bottom, rotation per S.spineIssueRot ──
  if (S.issue) {
    const issueText = S.issue.toUpperCase();
    ctx.save();
    ctx.font         = '7px "DM Sans", Arial, sans-serif';
    ctx.fillStyle    = S.spineTextColor;
    ctx.globalAlpha  = 0.4;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';

    const m     = ctx.measureText(issueText);
    const gAsc  = m.actualBoundingBoxAscent  ?? 5;
    const gDesc = m.actualBoundingBoxDescent ?? 1;
    // Same formula as date and title: centers glyph visually across spine width
    const shift = (gAsc - gDesc) / 2;

    if (S.spineIssueRot === 'horiz') {
      ctx.translate(W / 2, H - PAD);
      const issW = m.width;
      if (issW > W - 4) ctx.scale((W - 4) / issW, 1);
      ctx.fillText(issueText, 0, shift);
    } else if (S.spineIssueRot === 'ccw') {
      ctx.translate(W / 2, H - PAD);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(issueText, 0, shift);
    } else {
      // 'cw' default
      ctx.translate(W / 2, H - PAD);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(issueText, 0, shift);
    }
    ctx.restore();
  }
}

function renderSpine() {
  const sc  = document.getElementById('spine-canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  sc.width        = Math.round(DESIGN_SW * dpr);
  sc.height       = Math.round(DESIGN_H  * dpr);
  sc.style.width  = DESIGN_SW + 'px';
  sc.style.height = DESIGN_H  + 'px';
  const ctx = sc.getContext('2d');
  ctx.scale(dpr, dpr);
  drawSpineCtx(ctx, DESIGN_SW, DESIGN_H);
}

// ══════════════════════════════════════════════
//  IMAGE HELPERS
// ══════════════════════════════════════════════
function imgFromUrl(url) {
  return new Promise(res => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => res(img); img.onerror = () => res(null); img.src = url;
  });
}

function setThumb(id, url) {
  const t = document.getElementById('thumb-' + id); t.src = url; t.classList.add('show');
}
function markZone(id, name) {
  const z = document.getElementById('zone-' + id); z.classList.add('has-img'); z.querySelector('span').textContent = name;
  document.getElementById('wrap-' + id).classList.add('has-img');
}
function clearZone(id, placeholderText) {
  const z  = document.getElementById('zone-' + id); z.classList.remove('has-img'); z.querySelector('span').textContent = placeholderText;
  const t  = document.getElementById('thumb-' + id); t.src = ''; t.classList.remove('show');
  document.getElementById('wrap-' + id).classList.remove('has-img');
  // reset file input
  const inp = z.querySelector('input[type=file]'); if (inp) { inp.value = ''; }
}

// ── IMAGE COMPRESSION ──────────────────────────
// Max dimension for stored images (keeps localStorage lean)
const IMG_MAX_PX = 1600;
const IMG_QUALITY = 0.78;

function compressToDataURL(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let W = img.naturalWidth, H = img.naturalHeight;
        if (W > IMG_MAX_PX || H > IMG_MAX_PX) {
          const sc = IMG_MAX_PX / Math.max(W, H);
          W = Math.round(W * sc); H = Math.round(H * sc);
        }
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        c.getContext('2d').drawImage(img, 0, 0, W, H);
        // Use PNG for files that may have transparency, JPEG for photos
        const useJpeg = !file.name.toLowerCase().endsWith('.png') && !file.name.toLowerCase().endsWith('.gif');
        resolve(c.toDataURL(useJpeg ? 'image/jpeg' : 'image/png', useJpeg ? IMG_QUALITY : 1));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Apply a data URL to DOM + S.imageData + S.xxxImgEl
function applyImageDataURL(key, dataURL, label) {
  if (!dataURL) return;
  S.imageData[key] = dataURL;
  imgFromUrl(dataURL).then(imgEl => {
    switch(key) {
      case 'bgimg':
        S.bgImgEl = imgEl;
        document.getElementById('lyr-bg-img').style.backgroundImage = `url("${dataURL}")`;
        break;
      case 'main':
        S.mainImgEl = imgEl;
        document.getElementById('lyr-main-img').style.backgroundImage = `url("${dataURL}")`;
        break;
      case 'logo':
        S.logoImgEl = imgEl;
        const logoEl = document.getElementById('f-logo-img');
        logoEl.src = dataURL; logoEl.classList.add('show');
        document.getElementById('f-masthead').style.display = 'none';
        break;
      case 'back':
        S.backImgEl = imgEl;
        document.getElementById('lyr-back-img').style.backgroundImage = `url("${dataURL}")`;
        break;
      case 'spinefull':
        S.spineFullImgEl = imgEl; renderSpine(); break;
      case 'spinebottom':
        S.spineBottomImgEl = imgEl; renderSpine(); break;
    }
    if (label) { setThumb(key, dataURL); markZone(key, label); }
    scheduleSave();
  });
}

// Restore all images from a stored imageData object (on issue switch / page load)
function restoreAllImages(imageData) {
  // Clear all first
  const clearKeys = ['bgimg','main','logo','back','spinefull','spinebottom'];
  clearKeys.forEach(k => {
    S[{ bgimg:'bgImgEl', main:'mainImgEl', logo:'logoImgEl', back:'backImgEl', spinefull:'spineFullImgEl', spinebottom:'spineBottomImgEl' }[k]] = null;
  });
  document.getElementById('lyr-bg-img').style.backgroundImage   = 'none';
  document.getElementById('lyr-main-img').style.backgroundImage = 'none';
  document.getElementById('lyr-back-img').style.backgroundImage = 'none';
  const logoEl = document.getElementById('f-logo-img');
  logoEl.src = ''; logoEl.classList.remove('show');
  document.getElementById('f-masthead').style.display = '';
  // Reset all zones
  Object.keys(ZONE_DEFAULTS).forEach(k => clearZone(k, ZONE_DEFAULTS[k]));

  if (!imageData) return;
  // Re-apply stored images
  Object.entries(imageData).forEach(([k, v]) => {
    if (v) applyImageDataURL(k, v, '✓ Saved image');
  });
}

// ── LOAD FUNCTIONS ──────────────────────────────
function loadBgImage(input) {
  const file = input.files[0]; if (!file) return;
  compressToDataURL(file).then(url => applyImageDataURL('bgimg', url, file.name));
}
function loadCoverImage(input) {
  const file = input.files[0]; if (!file) return;
  compressToDataURL(file).then(url => applyImageDataURL('main', url, file.name));
}
function loadLogoImage(input) {
  const file = input.files[0]; if (!file) return;
  compressToDataURL(file).then(url => applyImageDataURL('logo', url, file.name));
}
function loadBackImage(input) {
  const file = input.files[0]; if (!file) return;
  compressToDataURL(file).then(url => applyImageDataURL('back', url, file.name));
}
function loadSpineFullImage(input) {
  const file = input.files[0]; if (!file) return;
  compressToDataURL(file).then(url => applyImageDataURL('spinefull', url, file.name));
}
function loadSpineBottomImage(input) {
  const file = input.files[0]; if (!file) return;
  compressToDataURL(file).then(url => applyImageDataURL('spinebottom', url, file.name));
}

// ── CLEAR FUNCTIONS ──────────────────────────────
const ZONE_DEFAULTS = {
  bgimg:       'Click or drop background',
  main:        'Click or drop — PNG / transparent OK',
  logo:        'PNG with transparency recommended',
  back:        'Click or drop image',
  spinefull:   'Covers entire spine',
  spinebottom: 'Small icon above issue label',
};
function clearImage(key) {
  clearZone(key, ZONE_DEFAULTS[key] || 'Click or drop image');
  S.imageData[key] = null;
  switch(key) {
    case 'bgimg':
      S.bgImgEl = null;
      document.getElementById('lyr-bg-img').style.backgroundImage = 'none'; break;
    case 'main':
      S.mainImgEl = null;
      document.getElementById('lyr-main-img').style.backgroundImage = 'none'; break;
    case 'logo':
      S.logoImgEl = null;
      const logo = document.getElementById('f-logo-img');
      logo.src = ''; logo.classList.remove('show');
      document.getElementById('f-masthead').style.display = ''; break;
    case 'back':
      S.backImgEl = null;
      document.getElementById('lyr-back-img').style.backgroundImage = 'none'; break;
    case 'spinefull':  S.spineFullImgEl   = null; renderSpine(); break;
    case 'spinebottom': S.spineBottomImgEl = null; renderSpine(); break;
  }
  scheduleSave();
}

// ══════════════════════════════════════════════
//  TEXT + STATE SETTERS
// ══════════════════════════════════════════════
// Map of cover element IDs that have a matching sidebar input (id="si-{coverId}")
const SIDEBAR_SYNCED_IDS = new Set([
  'f-tagline','f-headline','f-sub','f-teaser',
  'f-feat-left','f-feat-right','f-vert-left','f-vert-right','f-vert-right2',
  'f-label','f-extra-call1','f-extra-call2','f-price-front',
  'b-tagline','b-blurb','b-website','b-price','b-legal'
]);

const MULTILINE_IDS = new Set([
  'f-headline','f-sub','f-feat-left','f-feat-right',
  'f-extra-call1','f-extra-call2','b-blurb','b-legal'
]);

function setText(id, val) {
  const el = document.getElementById(id);
  if (el && document.activeElement !== el) {
    // Use innerText so \n becomes a visible line break in contenteditable
    el.innerText = val;
  }
  // Sync sidebar input if it's not the one being typed in
  const si = document.getElementById('si-' + id);
  if (si && document.activeElement !== si) {
    si.value = val;
  }
}

// Called from cover contenteditable 'input' events — pushes cover text to sidebar
function syncToSidebar(id) {
  if (!SIDEBAR_SYNCED_IDS.has(id)) return;
  const el = document.getElementById(id);
  const si = document.getElementById('si-' + id);
  if (!el || !si || document.activeElement === si) return;
  si.value = el.innerText || el.textContent || '';
}

// ══════════════════════════════════════════════
//  DRAG-TO-REPOSITION SYSTEM
// ══════════════════════════════════════════════

// All cover element IDs that can be dragged to a new position
const DRAGGABLE_IDS = [
  'f-issue','f-date','f-masthead','f-tagline',
  'f-headline','f-sub','f-teaser',
  'f-feat-left','f-feat-right',
  'f-vert-left','f-vert-right','f-vert-right2',
  'f-label','f-extra-call1','f-extra-call2',
  'f-price-front','f-barcode'
];

let _moveMode  = false;
let _dragEl    = null;
let _dragCover = null;
let _dragStartClientX = 0, _dragStartClientY = 0;
let _dragStartElX     = 0, _dragStartElY     = 0;

function toggleMoveMode() {
  _moveMode = !_moveMode;
  const btn = document.getElementById('move-toggle-btn');
  btn.classList.toggle('active', _moveMode);
  btn.textContent = _moveMode ? '✓ Move Mode ON' : '☩ Move Elements';
  // Toggle move-mode class on both covers
  ['cover-front','cover-back'].forEach(id => {
    document.getElementById(id)?.classList.toggle('move-mode', _moveMode);
  });
}

function resetAllPositions() {
  DRAGGABLE_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.left   = '';
    el.style.top    = '';
    el.style.right  = '';
    el.style.bottom = '';
    el.style.transform = '';
    delete el.dataset.moved;
  });
  // Also reset back cover
  ['b-brand','b-tagline','b-blurb','b-website','b-price','b-legal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.left = ''; el.style.top = '';
    el.style.right = ''; el.style.bottom = '';
    el.style.transform = '';
    delete el.dataset.moved;
  });
  fitAllTitles(); updateSubPos(); updateBottomZone();
  scheduleSave();
  showToast('Positions reset');
}

// Attach drag listeners to all cover elements
function initDragHandlers() {
  document.querySelectorAll('.cover-front .ce-text, .cover-back .ce-text').forEach(el => {
    el.addEventListener('mousedown', onCoverElMousedown);
    el.addEventListener('touchstart', onCoverElTouchstart, { passive: false });
  });
}

function _getElBasePos(el) {
  // offsetLeft/Top reflect layout position (design px), independent of CSS transform
  let x = el.offsetLeft;
  let y = el.offsetTop;
  // Account for translateY(-50%) etc.
  const tf = getComputedStyle(el).transform;
  if (tf && tf !== 'none') {
    const m = tf.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*([-\d.]+)\)/);
    if (m) y += parseFloat(m[1]);
  }
  return { x, y };
}

function _startDrag(el, clientX, clientY) {
  _dragEl    = el;
  _dragCover = el.closest('#cover-front, #cover-back');
  const pos  = _getElBasePos(el);
  _dragStartElX     = pos.x;
  _dragStartElY     = pos.y;
  _dragStartClientX = clientX;
  _dragStartClientY = clientY;
  el.classList.add('dragging');
  // Switch to top+left positioning so dragging works cleanly
  const DW = _dragCover.id === 'cover-front' ? DESIGN_W : DESIGN_W;
  const DH = DESIGN_H;
  el.style.left   = (_dragStartElX / DW * 100).toFixed(2) + '%';
  el.style.top    = (_dragStartElY / DH * 100).toFixed(2) + '%';
  el.style.right  = '';
  el.style.bottom = '';
  el.style.transform = '';
}

function onCoverElMousedown(e) {
  if (!_moveMode) return;
  e.preventDefault();
  _startDrag(e.currentTarget, e.clientX, e.clientY);
  document.addEventListener('mousemove', onDocMousemove);
  document.addEventListener('mouseup',   onDocMouseup);
}

function onCoverElTouchstart(e) {
  if (!_moveMode) return;
  e.preventDefault();
  const t = e.touches[0];
  _startDrag(e.currentTarget, t.clientX, t.clientY);
  document.addEventListener('touchmove', onDocTouchmove, { passive: false });
  document.addEventListener('touchend',  onDocTouchend);
}

function _applyDrag(clientX, clientY) {
  if (!_dragEl || !_dragCover) return;
  const coverRect = _dragCover.getBoundingClientRect();
  const scaleF    = coverRect.width / DESIGN_W;
  const dx = (clientX - _dragStartClientX) / scaleF;
  const dy = (clientY - _dragStartClientY) / scaleF;
  const newLeft = _dragStartElX + dx;
  const newTop  = _dragStartElY + dy;
  _dragEl.style.left = (newLeft / DESIGN_W * 100).toFixed(2) + '%';
  _dragEl.style.top  = (newTop  / DESIGN_H * 100).toFixed(2) + '%';
  _dragEl.dataset.moved = '1';
}

function _endDrag() {
  if (!_dragEl) return;
  _dragEl.classList.remove('dragging');
  _dragEl = null; _dragCover = null;
  scheduleSave();
}

function onDocMousemove(e) { _applyDrag(e.clientX, e.clientY); }
function onDocMouseup()    { _endDrag(); document.removeEventListener('mousemove', onDocMousemove); document.removeEventListener('mouseup', onDocMouseup); }
function onDocTouchmove(e) { e.preventDefault(); const t = e.touches[0]; _applyDrag(t.clientX, t.clientY); }
function onDocTouchend()   { _endDrag(); document.removeEventListener('touchmove', onDocTouchmove); document.removeEventListener('touchend', onDocTouchend); }

// Collect all explicitly-moved element positions for snapshot
function collectDomPositions() {
  const pos = {};
  [...DRAGGABLE_IDS, 'b-brand','b-tagline','b-blurb','b-website','b-price','b-legal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el || !el.dataset.moved) return;
    pos[id] = {
      top:    el.style.top    || '',
      left:   el.style.left   || '',
      right:  el.style.right  || '',
      bottom: el.style.bottom || '',
      transform: el.style.transform || ''
    };
  });
  return pos;
}

// Apply saved positions back to elements
function applyDomPositions(pos) {
  if (!pos) return;
  Object.entries(pos).forEach(([id, p]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (p.top)    el.style.top    = p.top;
    if (p.left)   el.style.left   = p.left;
    if (p.right  !== undefined) el.style.right  = p.right;
    if (p.bottom !== undefined) el.style.bottom = p.bottom;
    if (p.transform !== undefined) el.style.transform = p.transform;
    el.dataset.moved = '1';
  });
}

// Auto-shrink font until text fits on one line within the element's box
function fitText(id, maxFontPx) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.fontSize = maxFontPx + 'px';
  let size = maxFontPx;
  while (el.scrollWidth > el.clientWidth && size > 8) {
    size -= 1;
    el.style.fontSize = size + 'px';
  }
  tightenTextBox(el);
}

// Remove only the top dead space caused by font ascender metrics.
// Never sets height — works correctly for both single and multi-line elements.
function tightenTextBox(el) {
  if (!el) return;
  // Reset first so we measure from a clean state
  el.style.marginTop  = '';
  el.style.paddingTop = '';
  el.style.height     = '';
  el.style.overflow   = '';

  const text = el.textContent.trim();
  if (!text) return;

  const cs       = getComputedStyle(el);
  const fontSize = parseFloat(cs.fontSize) || 12;
  const lineH    = parseFloat(cs.lineHeight);

  // Measure true glyph top via canvas
  const cv  = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font  = cs.font;
  const m   = ctx.measureText(text.split('\n')[0] || text);

  const ascent = m.actualBoundingBoxAscent ?? fontSize * 0.72;

  // The line box height (= lineHeight when set, else ≈ fontSize * 1.2)
  const lineBox = isNaN(lineH) ? fontSize * 1.2 : lineH;

  // Dead space above the glyph cap = half the leading gap above
  // topGap is how far down from the line-box top the glyph cap sits
  const topGap = Math.max(0, lineBox - ascent - (fontSize * 0.18));
  const pull   = Math.floor(topGap * 0.85); // slight multiplier — don't over-pull

  if (pull > 0) el.style.marginTop = `-${pull}px`;
}

// Relax while editing, re-tighten on blur
function bindTightenOnEdit(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('focus', () => {
    el.style.marginTop  = '';
    el.style.paddingTop = '';
    el.style.height     = '';
    el.style.overflow   = '';
  });
  el.addEventListener('blur', () => tightenTextBox(el));
}

function fitAllTitles() {
  fitText('f-masthead', 72);
  fitText('b-brand',    42);
  // Tighten single-line labels only
  ['f-issue','f-date','f-tagline','f-price-front','b-tagline'].forEach(id => {
    const el = document.getElementById(id);
    if (el) tightenTextBox(el);
  });
  updateTaglinePos();
  updateSubPos();
  updateBottomZone();
}

// Chain f-sub directly below f-headline with tight gap
function updateSubPos() {
  const hl  = document.getElementById('f-headline');
  const sub = document.getElementById('f-sub');
  if (!hl || !sub) return;
  // headline uses transform:translateY(-50%) so its rendered top = offsetTop - offsetHeight/2
  const hlRenderedTop = hl.offsetTop - hl.offsetHeight / 2;
  const hlBottom      = hlRenderedTop + hl.offsetHeight;
  sub.style.top = (hlBottom + 4) + 'px';
  sub.style.transform = 'none'; // clear any inherited transform
}

// Anchor f-feat-left/right just above f-teaser with a consistent gap
function updateBottomZone() {
  const cover  = document.getElementById('cover-front');
  const teaser = document.getElementById('f-teaser');
  const featL  = document.getElementById('f-feat-left');
  const featR  = document.getElementById('f-feat-right');
  if (!cover || !teaser || !featL || !featR) return;

  const coverH     = cover.offsetHeight;
  // teaser offsetTop = distance from cover top to teaser top
  const teaserTop  = teaser.offsetTop;
  // feats bottom = distance from cover bottom to where feats should end
  const featBottom = coverH - teaserTop + 8;

  featL.style.bottom = featBottom + 'px';
  featR.style.bottom = featBottom + 'px';
}

function setAllTitles(val) {
  S.title = val;
  setText('f-masthead', val);
  setText('b-brand', val);
  fitAllTitles();
  renderSpine();
  scheduleSave();
  refreshBarcodes();
}
function setAllIssues(val) { S.issue = val; setText('f-issue', val); renderSpine(); scheduleSave(); refreshBarcodes(); }
function setDate(val)       { S.date  = val; setText('f-date', val); renderSpine(); scheduleSave(); refreshBarcodes(); }

function applyTitleColor(val, swatchEl) {
  document.getElementById('f-masthead').style.color = val;
  if (swatchEl) {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('sel'));
    swatchEl.classList.add('sel');
    document.getElementById('title-color-picker').value = val;
  }
}
function setTitleFont(val) {
  S.titleFontName = val;
  const css = `"${val}", sans-serif`;
  document.getElementById('f-masthead').style.fontFamily = css;
  document.getElementById('b-brand').style.fontFamily    = css;
  // Re-fit after font change since different fonts have different widths
  fitAllTitles();
  renderSpine();
}
function setCoverOpacity(val) {
  S.mainOpacity = val / 100;
  document.getElementById('lyr-main-img').style.opacity = S.mainOpacity;
  document.getElementById('opacity-val').textContent = val + '%';
}
function setCoverPos(val) {
  S.mainPosY = Number(val);
  document.getElementById('lyr-main-img').style.backgroundPositionY = val + '%';
  document.getElementById('pos-val').textContent = val + '%';
}
function setOverlay(val) {
  S.overlayOp = val / 100;
  const op = S.overlayOp;
  document.getElementById('lyr-overlay').style.background =
    `linear-gradient(to bottom,rgba(0,0,0,${(op*.7).toFixed(2)}) 0%,transparent 40%,rgba(0,0,0,${op.toFixed(2)}) 100%)`;
  document.getElementById('ov-val').textContent = val + '%';
  scheduleSave();
}
function setSpineBg(val)    { S.spineBgColor   = val; renderSpine(); scheduleSave(); }
function setSpineColor(val) { S.spineTextColor = val; renderSpine(); scheduleSave(); }
function setSpineIssueRot(val) { S.spineIssueRot = val; renderSpine(); }
// ══════════════════════════════════════════════
//  MAGAZINE SIZES  (width × height in mm)
// ══════════════════════════════════════════════
const MAG_SIZES = {
  a4:       { w: 210,   h: 297,   label: 'A4' },
  a5:       { w: 148,   h: 210,   label: 'A5' },
  a3:       { w: 297,   h: 420,   label: 'A3' },
  letter:   { w: 215.9, h: 279.4, label: 'Letter' },
  us_mag:   { w: 212.7, h: 276.2, label: 'US Magazine' },
  us_digest:{ w: 139.7, h: 215.9, label: 'US Digest' },
  tabloid:  { w: 279.4, h: 431.8, label: 'Tabloid' },
  uk_mag:   { w: 210,   h: 276,   label: 'UK Standard' },
  b5:       { w: 176,   h: 250,   label: 'B5' },
  b5_jis:   { w: 182,   h: 257,   label: 'B5 JIS' },
  b4_jis:   { w: 257,   h: 364,   label: 'B4 JIS' },
  sq210:    { w: 210,   h: 210,   label: 'Square 210' },
  sq300:    { w: 300,   h: 300,   label: 'Square 300' },
};
const MM_PER_INCH = 25.4;

function mmToPx(mm, dpi) { return Math.round((mm / MM_PER_INCH) * dpi); }

function updateOutputInfo() {
  const size = MAG_SIZES[S.magSize] || MAG_SIZES.letter;
  const dpi  = S.dpi;
  const pW   = mmToPx(size.w, dpi);
  const pH   = mmToPx(size.h, dpi);
  // Spine: proportional to preview (28:560 ≈ 5% of page width)
  const spineRatio = 28 / 420;
  const spW  = Math.round(pW * spineRatio);
  const totalW = pW * 2 + spW;

  document.getElementById('info-frontback').textContent = `${pW} × ${pH} px`;
  document.getElementById('info-spine').textContent     = `${spW} × ${pH} px`;
  document.getElementById('info-spread').textContent    = `${totalW} × ${pH} px`;
}

function setMagSize(val) {
  S.magSize = val;
  updateOutputInfo();
  resizePanels();
  const size = MAG_SIZES[val] || MAG_SIZES.letter;
  showFormatBadge(size.label, S.displayPH);
}
function setDpi(val)      { S.dpi    = Number(val); updateOutputInfo(); }

// ══════════════════════════════════════════════
//  RESIZE PREVIEW PANELS via uniform CSS transform:scale
//
//  Design canvas is always 420×560 (front/back) and 28×560 (spine).
//  A single uniform scale keeps every font, image, and position
//  pixel-perfect — no stretching ever.
//  The panel-sizer wrapper is sized to the target display dimensions
//  so the surrounding flexbox uses the right space.
// ══════════════════════════════════════════════
let DESIGN_W  = 420;
let DESIGN_H  = 560;
let DESIGN_SW = 28;
const SPINE_RATIO = 28 / 420;   // fixed physical proportion

function resizePanels() {
  const canvasArea = document.querySelector('.canvas-area');
  if (!canvasArea) return;

  const size  = MAG_SIZES[S.magSize] || MAG_SIZES.letter;
  const ratio = size.w / size.h;

  // ── Recompute design canvas dimensions to match the format ratio ──
  // DESIGN_H is always 560; DESIGN_W scales with the format
  DESIGN_W  = Math.round(DESIGN_H * ratio);
  DESIGN_SW = Math.max(14, Math.round(DESIGN_W * SPINE_RATIO));

  // Resize the actual cover div elements so % positions map correctly
  const frontEl = document.getElementById('cover-front');
  const backEl  = document.getElementById('cover-back');
  const spineEl = document.getElementById('cover-spine');
  const spineCanvas = document.getElementById('spine-canvas');
  if (frontEl)    { frontEl.style.width = DESIGN_W + 'px'; frontEl.style.height = DESIGN_H + 'px'; }
  if (backEl)     { backEl.style.width  = DESIGN_W + 'px'; backEl.style.height  = DESIGN_H + 'px'; }
  if (spineEl)    { spineEl.style.width = DESIGN_SW + 'px'; spineEl.style.height = DESIGN_H + 'px'; }
  if (spineCanvas){ spineCanvas.width = DESIGN_SW; spineCanvas.style.width = DESIGN_SW + 'px'; spineCanvas.style.height = DESIGN_H + 'px'; }

  // Available display space
  const availW = canvasArea.offsetWidth  - 80;
  const availH = canvasArea.offsetHeight - 96;
  if (availW <= 0 || availH <= 0) return;

  // Target display size at this ratio
  const spreadFactor = ratio * (2 + SPINE_RATIO);
  const targetPH  = Math.floor(Math.min(availH, availW / spreadFactor));
  const targetPW  = Math.floor(targetPH * ratio);
  const targetSpW = Math.max(12, Math.floor(targetPW * SPINE_RATIO));

  // Uniform scale so design fits the target display box without stretching
  const scaleF  = Math.min(targetPW / DESIGN_W,  targetPH / DESIGN_H);
  const scaleSp = Math.min(targetSpW / DESIGN_SW, targetPH / DESIGN_H);

  const scaledPW  = Math.round(DESIGN_W  * scaleF);
  const scaledPH  = Math.round(DESIGN_H  * scaleF);
  const scaledSpW = Math.round(DESIGN_SW * scaleSp);
  const scaledSpH = Math.round(DESIGN_H  * scaleSp);

  const offsetFX = Math.floor((targetPW  - scaledPW)  / 2);
  const offsetFY = Math.floor((targetPH  - scaledPH)  / 2);
  const offsetSX = Math.floor((targetSpW - scaledSpW) / 2);
  const offsetSY = Math.floor((targetPH  - scaledSpH) / 2);

  const sizerFront = document.getElementById('sizer-front');
  const sizerSpine = document.getElementById('sizer-spine');
  const sizerBack  = document.getElementById('sizer-back');
  if (sizerFront) { sizerFront.style.width = targetPW  + 'px'; sizerFront.style.height = targetPH + 'px'; }
  if (sizerSpine) { sizerSpine.style.width = targetSpW + 'px'; sizerSpine.style.height = targetPH + 'px'; }
  if (sizerBack)  { sizerBack.style.width  = targetPW  + 'px'; sizerBack.style.height  = targetPH + 'px'; }

  if (frontEl) frontEl.style.transform = `translate(${offsetFX}px,${offsetFY}px) scale(${scaleF})`;
  if (backEl)  backEl.style.transform  = `translate(${offsetFX}px,${offsetFY}px) scale(${scaleF})`;
  if (spineEl) spineEl.style.transform = `translate(${offsetSX}px,${offsetSY}px) scale(${scaleSp})`;

  S.previewW  = DESIGN_W;
  S.previewH  = DESIGN_H;
  S.previewSpW = DESIGN_SW;

  renderSpine();
  fitAllTitles();
  updateSubPos();
  updateBottomZone();
}

let _badgeTimer = null;
function showFormatBadge(label, displayH) {
  let badge = document.getElementById('format-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'format-badge';
    badge.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);' +
      'font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--accent);' +
      'background:#111;border:1px solid #2a2a2a;padding:5px 14px;border-radius:2px;' +
      'pointer-events:none;transition:opacity .3s;opacity:0;z-index:100;';
    document.body.appendChild(badge);
  }
  const size = MAG_SIZES[S.magSize] || MAG_SIZES.letter;
  badge.textContent = `${label}  ·  ${size.w} × ${size.h} mm`;
  badge.style.opacity = '1';
  clearTimeout(_badgeTimer);
  _badgeTimer = setTimeout(() => { badge.style.opacity = '0'; }, 2800);
}

// ══════════════════════════════════════════════
//  ALIGNMENT
// ══════════════════════════════════════════════
function setAlign(elId, align, btn, groupId) {
  const el = document.getElementById(elId);
  if (el) el.style.textAlign = align;
  // Update state
  if (elId === 'f-masthead') S.frontAlign   = align;
  if (elId === 'f-tagline')  S.taglineAlign = align;
  // Update button active state within the group
  if (groupId) {
    document.querySelectorAll('#' + groupId + ' button').forEach(b => b.classList.remove('asel'));
    if (btn) btn.classList.add('asel');
  }
}

// ══════════════════════════════════════════════
//  TAGLINE POSITION — sticks to masthead bottom
// ══════════════════════════════════════════════
function updateTaglinePos() {
  const issueEl = document.getElementById('f-issue');
  const dateEl  = document.getElementById('f-date');
  const mast    = document.getElementById('f-masthead');
  const tag     = document.getElementById('f-tagline');
  if (!mast || !tag) return;

  // Bottom of issue/date row
  const rowBottom = Math.max(
    issueEl ? issueEl.offsetTop + issueEl.offsetHeight : 0,
    dateEl  ? dateEl.offsetTop  + dateEl.offsetHeight  : 0
  );

  // Place masthead just below — account for any negative marginTop already applied
  const mastMT  = parseFloat(mast.style.marginTop) || 0;
  const mastTop = rowBottom + 4 - mastMT; // compensate so rendered top = rowBottom+4
  mast.style.top = mastTop + 'px';

  // Tagline: below rendered bottom of masthead
  const renderedBot = mastTop + mastMT + mast.offsetHeight;
  tag.style.top = (renderedBot + 5) + 'px';
  tightenTextBox(tag);
}

// ══════════════════════════════════════════════
//  VIEW TABS
// ══════════════════════════════════════════════
function setView(v, e) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (e && e.target) e.target.classList.add('active');

  const isIssues = (v === 'issues');
  const canvasArea = document.querySelector('.canvas-area');
  const issPanel   = document.getElementById('issues-panel');

  if (canvasArea) canvasArea.style.display = isIssues ? 'none' : '';
  if (issPanel)   issPanel.classList.toggle('visible', isIssues);

  if (!isIssues) {
    document.getElementById('wrap-front-panel').style.display = (v==='all'||v==='front') ? '' : 'none';
    document.getElementById('wrap-spine').style.display       = (v==='all'||v==='spine') ? '' : 'none';
    document.getElementById('wrap-back-panel').style.display  = (v==='all'||v==='back')  ? '' : 'none';
  }

  if (isIssues) renderIssueCards();
}

function setSpineHideDate(val) { S.spineHideDate = val; renderSpine(); }

// ══════════════════════════════════════════════
//  OBJECT-FIT: COVER helper
// ══════════════════════════════════════════════
function drawImageCover(ctx, img, x, y, w, h, posYPct = 50) {
  if (!img) return;
  const iW = img.naturalWidth  || img.width;
  const iH = img.naturalHeight || img.height;
  if (!iW || !iH) return;
  const boxR = w / h, imgR = iW / iH;
  let sw, sh, sx, sy;
  if (imgR > boxR) {
    // image wider than box → fit height, crop sides
    sh = iH; sw = sh * boxR; sx = (iW - sw) / 2; sy = 0;
  } else {
    // image taller than box → fit width, crop top/bottom by posY
    sw = iW; sh = sw / boxR; sx = 0;
    sy = (iH - sh) * (posYPct / 100);
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// ══════════════════════════════════════════════
//  CANVAS DOWNLOAD RENDERERS
// ══════════════════════════════════════════════
const DL_SCALE = 2;

async function renderFrontToCanvas(outW, outH) {
  const DW = DESIGN_W, DH = DESIGN_H;
  const W = outW || DW * 2, H = outH || DH * 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  await document.fonts.ready;

  // ONE global scale: design-space pixels → output pixels
  ctx.scale(W / DW, H / DH);

  // ── 1. BG solid ──
  ctx.fillStyle = S.frontBgColor || '#1a1212';
  ctx.fillRect(0, 0, DW, DH);
  // ── 2. BG image ──
  if (S.bgImgEl) drawImageCover(ctx, S.bgImgEl, 0, 0, DW, DH, 50);
  // ── 3. Main image ──
  if (S.mainImgEl) {
    ctx.save(); ctx.globalAlpha = S.mainOpacity;
    drawImageCover(ctx, S.mainImgEl, 0, 0, DW, DH, S.mainPosY);
    ctx.restore();
  }
  // ── 4. Overlay gradient ──
  const op = S.overlayOp;
  const grad = ctx.createLinearGradient(0, 0, 0, DH);
  grad.addColorStop(0,   `rgba(0,0,0,${(op*.7).toFixed(2)})`);
  grad.addColorStop(0.4, 'rgba(0,0,0,0)');
  grad.addColorStop(1,   `rgba(0,0,0,${op.toFixed(2)})`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, DW, DH);

  // ── Layout helpers ──
  // offsetLeft/Top/Width/Height live in CSS layout px = design px, unaffected by parent CSS transforms
  function dRect(el) {
    return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  }
  // For elements with transform:translateY(-50%), read the actual matrix translateY
  function dRectTY(el) {
    const r = dRect(el);
    const tf = getComputedStyle(el).transform;
    if (tf && tf !== 'none') {
      const m = tf.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*([-\d.]+)\)/);
      if (m) r.y += parseFloat(m[1]);
    }
    return r;
  }

  // Apply CSS text-transform to a string
  function applyTT(text, cs) {
    const tt = cs.textTransform;
    if (tt === 'uppercase')  return text.toUpperCase();
    if (tt === 'lowercase')  return text.toLowerCase();
    if (tt === 'capitalize') return text.replace(/\b\w/g, ch => ch.toUpperCase());
    return text;
  }

  // Set ctx.letterSpacing when browser supports it (Chrome 99+, Firefox 113+, Safari 16.4+)
  function applyLS(cs) {
    if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing || '0px';
  }

  // Measure text respecting letter-spacing even in browsers without ctx.letterSpacing
  function measureW(text, cs) {
    let w = ctx.measureText(text).width;
    if (!('letterSpacing' in ctx)) {
      const ls = parseFloat(cs.letterSpacing) || 0;
      if (ls && text.length > 1) w += ls * (text.length - 1);
    }
    return w;
  }

  // Word-wrap that respects explicit \n breaks from contenteditable innerText,
  // letter-spacing-aware measuring, and a max width in design px
  function wrapLines(text, maxW, cs) {
    const result = [];
    for (const para of text.split('\n')) {
      if (!para.trim()) { result.push(''); continue; }
      const words = para.split(' ');
      let cur = '';
      for (const word of words) {
        if (!word) continue;
        const test = cur ? cur + ' ' + word : word;
        if (measureW(test, cs) > maxW && cur) { result.push(cur); cur = word; }
        else cur = test;
      }
      if (cur) result.push(cur);
    }
    return result.length ? result : [''];
  }

  // Full paintEl: innerText → text-transform → letterSpacing → line-wrap → draw
  function paintEl(id, defaultAlign, transformed) {
    const el = document.getElementById(id);
    if (!el || el.style.display === 'none') return;
    const cs   = getComputedStyle(el);
    const dr   = transformed ? dRectTY(el) : dRect(el);
    // innerText preserves <br> / contenteditable line breaks; textContent collapses them
    const text = applyTT((el.innerText || el.textContent || '').trimEnd(), cs);
    if (!text) return;
    ctx.save();
    ctx.font         = cs.font;
    ctx.fillStyle    = cs.color;
    ctx.textBaseline = 'top';
    applyLS(cs);
    const align = cs.textAlign || defaultAlign || 'left';
    ctx.textAlign = align;
    const drawX = align === 'center' ? dr.x + dr.w / 2
                : align === 'right'  ? dr.x + dr.w
                : dr.x;
    const lineH = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    wrapLines(text, dr.w, cs).forEach((line, i) =>
      ctx.fillText(line, drawX, dr.y + i * lineH));
    ctx.restore();
  }

  // ── 5. Text elements ──
  paintEl('f-issue', 'left');
  paintEl('f-date',  'right');

  // Masthead or logo image
  const logoEl = document.getElementById('f-logo-img');
  if (logoEl.classList.contains('show') && S.logoImgEl) {
    const logoH = Math.min(DH * 0.16, S.logoImgEl.naturalHeight);
    const logoW = (S.logoImgEl.naturalWidth / S.logoImgEl.naturalHeight) * logoH;
    ctx.drawImage(S.logoImgEl, (DW - logoW) / 2, DH * 0.032, logoW, logoH);
  } else if (document.getElementById('f-masthead').style.display !== 'none') {
    paintEl('f-masthead', S.frontAlign || 'center');
  }

  paintEl('f-tagline',     S.taglineAlign || 'center');
  paintEl('f-headline',    'left', true);  // translateY(-50%)
  paintEl('f-sub',         'left');
  paintEl('f-feat-left',   'left');
  paintEl('f-feat-right',   'right');
  paintEl('f-label',        'left');
  paintEl('f-extra-call1',  'right');
  paintEl('f-extra-call2',  'right');
  paintEl('f-price-front',  'left');

  // ── 6. Vertical columns — upright chars stacked top→bottom ──
  ['f-vert-left', 'f-vert-right', 'f-vert-right2'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cs   = getComputedStyle(el);
    const dr   = dRect(el);
    const text = applyTT((el.innerText || el.textContent || '').trim(), cs);
    if (!text) return;
    ctx.save();
    ctx.font         = cs.font;
    ctx.fillStyle    = cs.color;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    applyLS(cs);
    const fontSize = parseFloat(cs.fontSize) || 13;
    const ls       = parseFloat(cs.letterSpacing) || 0;
    const charStep = fontSize + ls; // vertical advance per character
    const cx       = dr.x + dr.w / 2;
    let   y        = dr.y;
    for (const ch of text) {
      ctx.fillText(ch, cx, y);
      y += charStep;
      if (y > dr.y + dr.h) break; // clip to element height
    }
    ctx.restore();
  });

  // ── 7. Teaser with top divider ──
  const teaserEl = document.getElementById('f-teaser');
  if (teaserEl) {
    const cs   = getComputedStyle(teaserEl);
    const dr   = dRect(teaserEl);
    const text = applyTT((teaserEl.innerText || teaserEl.textContent || '').trimEnd(), cs);
    const pt   = parseFloat(cs.paddingTop) || 5;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(dr.x, dr.y); ctx.lineTo(dr.x + dr.w, dr.y); ctx.stroke();
    ctx.font         = cs.font;
    ctx.fillStyle    = cs.color;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';
    applyLS(cs);
    const lineH = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    wrapLines(text, dr.w, cs).forEach((line, i) =>
      ctx.fillText(line, dr.x, dr.y + pt + i * lineH));
    ctx.restore();
  }

  // ── 8. Barcode ──
  if (S.showBarcode) {
    const bcEl  = document.getElementById('f-barcode');
    const bcBmp = await getBarcodeBitmap();
    if (bcBmp && bcEl) {
      const dr = { x: bcEl.offsetLeft, y: bcEl.offsetTop, w: bcEl.offsetWidth, h: bcEl.offsetHeight };
      ctx.drawImage(bcBmp, dr.x, dr.y, dr.w, dr.h);
    }
  }
  return c;
}


async function renderBackToCanvas(outW, outH) {
  const DW = DESIGN_W, DH = DESIGN_H;
  const W = outW || DW * 2, H = outH || DH * 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  await document.fonts.ready;

  ctx.scale(W / DW, H / DH);

  ctx.fillStyle = S.backBgColor || '#0d0d0d'; ctx.fillRect(0, 0, DW, DH);
  if (S.backImgEl) drawImageCover(ctx, S.backImgEl, 0, 0, DW, DH, 50);
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, DW, DH);

  function dRect(el) {
    return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  }
  function dRectTY(el) {
    const r = dRect(el);
    const tf = getComputedStyle(el).transform;
    if (tf && tf !== 'none') {
      const m = tf.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*([-\d.]+)\)/);
      if (m) r.y += parseFloat(m[1]);
    }
    return r;
  }
  function applyTT(text, cs) {
    const tt = cs.textTransform;
    if (tt === 'uppercase')  return text.toUpperCase();
    if (tt === 'lowercase')  return text.toLowerCase();
    if (tt === 'capitalize') return text.replace(/\b\w/g, ch => ch.toUpperCase());
    return text;
  }
  function applyLS(cs) {
    if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing || '0px';
  }
  function measureW(text, cs) {
    let w = ctx.measureText(text).width;
    if (!('letterSpacing' in ctx)) {
      const ls = parseFloat(cs.letterSpacing) || 0;
      if (ls && text.length > 1) w += ls * (text.length - 1);
    }
    return w;
  }
  function wrapLines(text, maxW, cs) {
    const result = [];
    for (const para of text.split('\n')) {
      if (!para.trim()) { result.push(''); continue; }
      const words = para.split(' ');
      let cur = '';
      for (const word of words) {
        if (!word) continue;
        const test = cur ? cur + ' ' + word : word;
        if (measureW(test, cs) > maxW && cur) { result.push(cur); cur = word; }
        else cur = test;
      }
      if (cur) result.push(cur);
    }
    return result.length ? result : [''];
  }
  function paintBack(id, defaultAlign, transformed) {
    const el = document.getElementById(id); if (!el) return;
    const cs   = getComputedStyle(el);
    const dr   = transformed ? dRectTY(el) : dRect(el);
    const text = applyTT((el.innerText || el.textContent || '').trimEnd(), cs);
    if (!text) return;
    ctx.save();
    ctx.font = cs.font; ctx.fillStyle = cs.color; ctx.textBaseline = 'top';
    applyLS(cs);
    const align = cs.textAlign || defaultAlign || 'left';
    ctx.textAlign = align;
    const drawX = align === 'center' ? dr.x + dr.w/2 : align === 'right' ? dr.x + dr.w : dr.x;
    const lineH = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize)*1.3;
    wrapLines(text, dr.w, cs).forEach((line,i) => ctx.fillText(line, drawX, dr.y + i*lineH));
    ctx.restore();
  }
  paintBack('b-brand',   'center');
  paintBack('b-tagline', 'center');
  paintBack('b-blurb',   'center', true);
  paintBack('b-website', 'center');
  paintBack('b-price',   'center');
  paintBack('b-legal',   'left');
  return c;
}


function renderSpineHires(outSpW, outH) {
  const W = outSpW || DESIGN_SW * 4;
  const H = outH   || DESIGN_H  * 4;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.scale(W / DESIGN_SW, H / DESIGN_H);
  drawSpineCtx(ctx, DESIGN_SW, DESIGN_H);
  return c;
}

// ══════════════════════════════════════════════
//  DOWNLOAD HELPERS — compute output px from mag size + DPI
// ══════════════════════════════════════════════
function getOutputDims() {
  const size = MAG_SIZES[S.magSize] || MAG_SIZES.letter;
  const dpi  = S.dpi;
  const pW   = mmToPx(size.w, dpi);
  const pH   = mmToPx(size.h, dpi);
  const spW  = Math.round(pW * SPINE_RATIO);  // uses fixed physical spine ratio
  return { pW, pH, spW };
}

async function downloadFront()  {
  const { pW, pH } = getOutputDims();
  triggerDownload(await renderFrontToCanvas(pW, pH), 'front-cover.png');
}
async function downloadSpine()  {
  const { spW, pH } = getOutputDims();
  await document.fonts.ready;
  triggerDownload(renderSpineHires(spW, pH), 'spine.png');
}
async function downloadBack()   {
  const { pW, pH } = getOutputDims();
  triggerDownload(await renderBackToCanvas(pW, pH), 'back-cover.png');
}
async function downloadAll()    {
  await downloadFront(); await delay(400);
  await downloadSpine(); await delay(400);
  await downloadBack();
}
function triggerDownload(canvas, name) {
  const a = document.createElement('a'); a.download = name; a.href = canvas.toDataURL('image/png'); a.click();
}
const delay = ms => new Promise(r => setTimeout(r, ms));

// ══════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════
function wrapText(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

// ══════════════════════════════════════════════
//  DRAG & DROP
// ══════════════════════════════════════════════
document.querySelectorAll('.upload-zone').forEach(zone => {
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.style.borderColor = '#c8a96e'; });
  zone.addEventListener('dragleave', () => zone.style.borderColor = '');
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.style.borderColor = '';
    const input = zone.querySelector('input[type=file]');
    const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]);
    input.files = dt.files; input.dispatchEvent(new Event('change'));
  });
});

// ══════════════════════════════════════════════
//  INLINE EDIT HINT
// ══════════════════════════════════════════════
const sl = document.getElementById('active-label');
setTimeout(() => sl.classList.add('show'), 700);
setTimeout(() => sl.classList.remove('show'), 4500);

// IDs of single-line title elements that must never wrap
const TITLE_IDS = new Set(['f-masthead', 'b-brand']);

document.querySelectorAll('.cover-front .ce-text, .cover-back .ce-text, [contenteditable=true]').forEach(el => {
  // Block focus/editing while in move mode
  el.addEventListener('mousedown', e => {
    if (_moveMode && el.classList.contains('ce-text')) { e.preventDefault(); }
  });
  el.addEventListener('focus', () => {
    if (_moveMode) { el.blur(); return; }
    sl.textContent = 'Editing: ' + el.id; sl.classList.add('show');
  });
  el.addEventListener('blur',  () => {
    sl.classList.remove('show');
    if (TITLE_IDS.has(el.id)) fitText(el.id, el.id === 'f-masthead' ? 72 : 42);
  });
  el.addEventListener('input', () => {
    if (TITLE_IDS.has(el.id)) fitText(el.id, el.id === 'f-masthead' ? 72 : 42);
    syncToSidebar(el.id);
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); return; }
    if (e.key === 'Enter' && TITLE_IDS.has(el.id)) { e.preventDefault(); el.blur(); }
  });
  el.addEventListener('paste', e => {
    if (TITLE_IDS.has(el.id)) {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/[\r\n]+/g, ' ');
      document.execCommand('insertText', false, text);
    }
  });
});

// ══════════════════════════════════════════════
//  TRANSLATE  (MyMemory API — free, CORS-safe)
// ══════════════════════════════════════════════

// Fields we translate (skip issue#, date, price, legal, website — those are codes)
const TRANSLATE_FIELD_IDS = [
  'f-masthead', 'f-tagline', 'f-headline', 'f-sub', 'f-teaser',
  'f-feat-left', 'f-feat-right', 'f-vert-right', 'f-vert-right2',
  'b-brand', 'b-tagline', 'b-blurb'
];

const LANG_NAMES   = { en:'English',  de:'German', ja:'Japanese', fr:'French', es:'Spanish' };
const LANG_MYMEMORY = { en:'en-US', de:'de-DE', ja:'ja-JP', fr:'fr-FR', es:'es-ES' };

// Translate one string via MyMemory (free, no API key, CORS open)
async function translateOne(text, fromCode, toCode) {
  if (!text.trim()) return text;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromCode}|${toCode}`;
  const res  = await fetch(url);
  const data = await res.json();
  return data?.responseData?.translatedText || text;
}

async function translateCover(lang, btn) {
  const status = document.getElementById('translate-status');

  // Mark active button + store lang + update barcode prefix immediately
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active-lang'));
  btn.classList.add('active-lang');

  const prevLang = S.lang || 'en';
  S.lang = lang;
  refreshBarcodes();
  scheduleSave();

  const fromCode = LANG_MYMEMORY[prevLang] || 'en-US';
  const toCode   = LANG_MYMEMORY[lang]     || 'en-US';

  // Same language selected — nothing to translate
  if (fromCode === toCode) {
    status.textContent = `✓ Already in ${LANG_NAMES[lang]}`;
    status.style.color = '#7ec99a';
    return;
  }

  status.textContent = `Translating to ${LANG_NAMES[lang]}…`;
  status.style.color = 'var(--accent)';

  // Collect fields that have content
  const entries = [];
  TRANSLATE_FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && (el.innerText || el.textContent || '').trim())
      entries.push({ id, text: (el.innerText || el.textContent || '').trim() });
  });

  try {
    let done = 0;
    for (const entry of entries) {
      const translated = await translateOne(entry.text, fromCode, toCode);
      const el = document.getElementById(entry.id);
      if (el) el.innerText = translated;
      const si = document.getElementById('si-' + entry.id);
      if (si) si.value = translated;
      done++;
      status.textContent = `Translating… ${done}/${entries.length}`;
    }

    fitAllTitles();
    if (ISSUES.length > 0) ISSUES[CURRENT_IDX] = { ...ISSUES[CURRENT_IDX], ...snapshotCurrentIssue() };
    scheduleSave();

    status.textContent = `✓ Translated to ${LANG_NAMES[lang]}`;
    status.style.color = '#7ec99a';
    showToast(`Translated to ${LANG_NAMES[lang]}`, 'success');

  } catch(e) {
    console.error(e);
    status.textContent = `✗ Translation failed: ${e.message}`;
    status.style.color = '#e08080';
    showToast('Translation failed', 'error');
    S.lang = prevLang; // roll back lang on failure
    btn.classList.remove('active-lang');
  }
}

// ══════════════════════════════════════════════
//  LOCAL STORAGE ENGINE
// ══════════════════════════════════════════════
const STORAGE_KEY    = 'covr_studio_v1';
const LS_LIMIT_BYTES = 5 * 1024 * 1024;   // 5 MB soft warn threshold

let _saveTimer = null;
let _savedProject = null;   // holds data retrieved at startup

function getProjectPayload() {
  // Always snapshot current state into ISSUES first
  if (ISSUES.length > 0) {
    ISSUES[CURRENT_IDX] = { ...ISSUES[CURRENT_IDX], ...snapshotCurrentIssue() };
  }
  return {
    version:     1,
    savedAt:     new Date().toISOString(),
    magSize:     S.magSize,
    dpi:         S.dpi,
    currentIdx:  CURRENT_IDX,
    issues:      ISSUES,
  };
}

function scheduleSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(saveNow, 1800);
  updateStorageBar(null, false, 'Unsaved changes…');
}

function saveNow() {
  try {
    const payload = JSON.stringify(getProjectPayload());
    localStorage.setItem(STORAGE_KEY, payload);
    const bytes  = new Blob([payload]).size;
    updateStorageBar(bytes, true, 'Saved ' + new Date().toLocaleTimeString());
    showToast('Project saved', 'success');
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      updateStorageBar(null, false, '⚠ Storage full!');
      showToast('Storage full — reduce image sizes or remove issues', 'error');
    } else {
      showToast('Save failed: ' + e.message, 'error');
    }
  }
}

function updateStorageBar(bytes, saved, statusText) {
  const fill   = document.getElementById('storage-fill');
  const usage  = document.getElementById('storage-usage');
  const status = document.getElementById('storage-status');
  if (status) status.textContent = statusText || '';
  if (bytes !== null && bytes !== undefined) {
    const pct = Math.min(100, (bytes / LS_LIMIT_BYTES) * 100);
    if (fill)  { fill.style.width = pct + '%'; fill.className = 'storage-bar-fill' + (pct>90?' full':pct>70?' warn':''); }
    if (usage) usage.textContent = bytes < 1024*1024 ? (bytes/1024).toFixed(0)+' KB' : (bytes/(1024*1024)).toFixed(1)+' MB';
  }
}

function exportProject() {
  const payload = JSON.stringify(getProjectPayload(), null, 2);
  const a = document.createElement('a');
  a.href     = 'data:application/json;charset=utf-8,' + encodeURIComponent(payload);
  a.download = 'covr-studio-project.json';
  a.click();
  showToast('Project exported', 'success');
}

function importProjectClick() {
  document.getElementById('import-input').click();
}

function importProject(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      loadProjectData(data);
      showToast('Project imported', 'success');
      saveNow();
    } catch(err) {
      showToast('Import failed: invalid file', 'error');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function loadProjectData(data) {
  if (!data || !Array.isArray(data.issues) || data.issues.length === 0) return;
  if (data.magSize) { S.magSize = data.magSize; const sel = document.getElementById('mag-size-sel'); if(sel) sel.value = data.magSize; }
  if (data.dpi)     { S.dpi     = data.dpi;     const sel = document.getElementById('dpi-sel');      if(sel) sel.value = data.dpi; }
  ISSUES      = data.issues;
  CURRENT_IDX = Math.min(data.currentIdx || 0, ISSUES.length - 1);
  applyIssueSnapshot(ISSUES[CURRENT_IDX]);
  updateStepperUI();
  renderIssueCards();
  updateOutputInfo();
  resizePanels();
}

function clearSavedData() {
  if (!confirm('Delete all saved data? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  updateStorageBar(0, false, 'Cleared');
  showToast('Saved data cleared', 'info');
}

// ── Restore prompt ──
function checkForSavedProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    _savedProject = JSON.parse(raw);
    if (!_savedProject || !Array.isArray(_savedProject.issues)) return false;
    const savedAt  = _savedProject.savedAt ? new Date(_savedProject.savedAt).toLocaleString() : 'unknown time';
    const nIssues  = _savedProject.issues.length;
    const bytes    = new Blob([raw]).size;
    const sizeStr  = bytes < 1024*1024 ? (bytes/1024).toFixed(0)+' KB' : (bytes/(1024*1024)).toFixed(1)+' MB';
    document.getElementById('restore-info').textContent =
      `${nIssues} issue${nIssues!==1?'s':''} · Saved ${savedAt} · ${sizeStr}`;
    document.getElementById('restore-overlay').style.display = 'flex';
    return true;
  } catch(e) { return false; }
}

function confirmRestore() {
  document.getElementById('restore-overlay').style.display = 'none';
  if (_savedProject) {
    loadProjectData(_savedProject);
    const raw   = localStorage.getItem(STORAGE_KEY);
    const bytes = raw ? new Blob([raw]).size : 0;
    updateStorageBar(bytes, true, 'Restored ' + new Date(_savedProject.savedAt).toLocaleTimeString());
    showToast('Session restored', 'success');
  }
}

function discardRestore() {
  document.getElementById('restore-overlay').style.display = 'none';
  _savedProject = null;
  updateStorageBar(0, false, 'Started fresh');
}

// ── Toast ──
let _toastTimer = null;
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = `toast ${type}`;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}


// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
document.fonts.ready.then(() => {
  initBarcodes();
  initDragHandlers();
  ['f-masthead','f-tagline','f-issue','f-date','f-price-front','b-brand','b-tagline']
    .forEach(bindTightenOnEdit);

  const hasSaved = checkForSavedProject();
  resizePanels();
  updateOutputInfo();
  initIssues();
  if (!hasSaved) {
    requestAnimationFrame(() => { fitAllTitles(); updateSubPos(); updateBottomZone(); });
  }
});

// Also call scheduleSave whenever any contenteditable field is edited
document.addEventListener('input', e => {
  if (e.target && e.target.isContentEditable) scheduleSave();
});

// ── Respond to canvas area size changes (sidebar open/close, window resize) ──
let _resizeTimer = null;
function debouncedResize() {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(resizePanels, 60);
}

// ResizeObserver watches the canvas area itself for the most accurate trigger
const _canvasArea = document.querySelector('.canvas-area');
if (window.ResizeObserver && _canvasArea) {
  new ResizeObserver(debouncedResize).observe(_canvasArea);
} else {
  // Fallback for older browsers
  window.addEventListener('resize', debouncedResize);
}
