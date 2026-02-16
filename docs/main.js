(function () {
  'use strict';

  const BUILD_ID = window.HEX_ANCIENTS_BUILD_ID || 'UNKNOWN';

  // Original (non-rectangular) battlefield silhouette: Catan-ish stretched island.
  const SHAPE_NAME = 'AEGEAN-FIELD-SYM';
        const SHAPE_ROWS = [
    { qStart: 2, len: 12 },
    { qStart: 1, len: 13 },
    { qStart: 1, len: 14 },
    { qStart: 0, len: 15 },
    { qStart: 0, len: 16 },
    { qStart: 0, len: 16 },
    { qStart: 0, len: 16 },
    { qStart: 0, len: 15 },
    { qStart: 1, len: 14 },
    { qStart: 1, len: 13 },
    { qStart: 2, len: 12 },
  ];
  const HEX_COUNT = SHAPE_ROWS.reduce((s, row) => s + row.len, 0);
  const APP_MARK = 'HEX-ANCIENTS M0 • ' + SHAPE_NAME + ' • ' + HEX_COUNT + ' HEX';

  const elBuild = document.getElementById('buildId');
  const elTruth = document.getElementById('truthProbe');
  const elSelected = document.getElementById('selected');
  const elHover = document.getElementById('hover');
  const elLog = document.getElementById('log');
  const elUA = document.getElementById('ua');

  document.title = 'Hex Ancients • ' + BUILD_ID;

  if (elBuild) elBuild.textContent = BUILD_ID;
  if (elTruth) elTruth.textContent = APP_MARK + ' • ' + BUILD_ID;
  if (elUA) elUA.textContent = navigator.userAgent;

  const state = {
    selected: null,
    selectedEl: null,
    log: [],
  };

  function addLog(msg) {
    const t = new Date();
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    const ss = String(t.getSeconds()).padStart(2, '0');
    state.log.unshift(hh + ':' + mm + ':' + ss + ' — ' + msg);
    if (state.log.length > 25) state.log.pop();
    renderLog();
  }

  function renderLog() {
    if (!elLog) return;
    elLog.innerHTML = '';
    for (const line of state.log) {
      const div = document.createElement('div');
      div.className = 'logEntry';
      div.textContent = line;
      elLog.appendChild(div);
    }
  }

  function setSelected(q, r) {
    state.selected = { q, r };
    if (elSelected) elSelected.textContent = 'q=' + q + ', r=' + r;
  }

  function setHover(q, r) {
    if (elHover) elHover.textContent = 'q=' + q + ', r=' + r;
  }

  const boardHost = document.getElementById('board');
  if (!boardHost) {
    console.error('No #board element. Build:', BUILD_ID);
    return;
  }

  const cfg = {
    rows: SHAPE_ROWS.length,
    size: 34,
    margin: 14,
    layout: 'odd-r',
  };

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'boardSvg');
  svg.setAttribute('xmlns', svgNS);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Hex board');
  boardHost.innerHTML = '';
  boardHost.appendChild(svg);

  const g = document.createElementNS(svgNS, 'g');
  svg.appendChild(g);

  const SQRT3 = Math.sqrt(3);

  // Pointy-top hexes, ODD-R offset coordinates
  function gridToPixel(q, r, size) {
    const x = size * (SQRT3 * (q + 0.5 * (r & 1)));
    const y = size * (3 / 2 * r);
    return { x, y };
  }

  function hexCorner(cx, cy, size, i) {
    const angle = (Math.PI / 180) * (60 * i - 30); // pointy-top
    return {
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    };
  }

  function hexPoints(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const c = hexCorner(cx, cy, size, i);
      pts.push(c.x + ',' + c.y);
    }
    return pts.join(' ');
  }

  // Build cells + bounds (using silhouette mask)
  const cells = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let r = 0; r < SHAPE_ROWS.length; r++) {
    const row = SHAPE_ROWS[r];
    for (let q = row.qStart; q < row.qStart + row.len; q++) {
      const p = gridToPixel(q, r, cfg.size);
      cells.push({ q, r, x: p.x, y: p.y });

      for (let i = 0; i < 6; i++) {
        const c = hexCorner(p.x, p.y, cfg.size, i);
        if (c.x < minX) minX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.x > maxX) maxX = c.x;
        if (c.y > maxY) maxY = c.y;
      }
    }
  }

  const vbX = minX - cfg.margin;
  const vbY = minY - cfg.margin;
  const vbW = (maxX - minX) + cfg.margin * 2;
  const vbH = (maxY - minY) + cfg.margin * 2;
  svg.setAttribute('viewBox', vbX + ' ' + vbY + ' ' + vbW + ' ' + vbH);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const hexByKey = new Map();

  function selectPoly(poly, q, r) {
    if (state.selectedEl) state.selectedEl.classList.remove('selected');
    state.selectedEl = poly;
    poly.classList.add('selected');
    setSelected(q, r);
    addLog('Selected hex q=' + q + ', r=' + r);
  }

  for (const cell of cells) {
    const poly = document.createElementNS(svgNS, 'polygon');
    poly.setAttribute('points', hexPoints(cell.x, cell.y, cfg.size));
    poly.setAttribute('class', 'hex');
    poly.dataset.q = String(cell.q);
    poly.dataset.r = String(cell.r);

    poly.addEventListener('click', function () {
      const q = Number(poly.dataset.q);
      const r = Number(poly.dataset.r);
      selectPoly(poly, q, r);
    });

    poly.addEventListener('mouseenter', function () {
      const q = Number(poly.dataset.q);
      const r = Number(poly.dataset.r);
      setHover(q, r);
    });

    poly.addEventListener('mouseleave', function () {
      if (elHover) elHover.textContent = '—';
    });

    g.appendChild(poly);
    hexByKey.set(cell.q + ',' + cell.r, poly);
  }

  // Initial selection: middle row, middle of that row
  const startR = Math.floor(SHAPE_ROWS.length / 2);
  const midRow = SHAPE_ROWS[startR];
  const startQ = midRow.qStart + Math.floor(midRow.len / 2);
  const startPoly = hexByKey.get(startQ + ',' + startR);
  if (startPoly) selectPoly(startPoly, startQ, startR);

  addLog('App loaded (' + APP_MARK + ')');
  console.log('Hex Ancients loaded. Build:', BUILD_ID, 'Shape:', SHAPE_NAME, 'Hexes:', HEX_COUNT);
})();
