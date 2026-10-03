/**
 * GROWW & INDIAN EQUITIES INSTITUTIONAL RESEARCH DASHBOARD
 * Core JavaScript Logic for Dynamic Stock Input, File Uploads & Analytics
 */

let currentAnalysisData = null;
let selectedFiles = [];

// Helper to format currency numbers cleanly in JS
function formatPrice(val, decimals = 2) {
  if (val === undefined || val === null || isNaN(Number(val))) return '0.00';
  return Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatRupees(num) {
  if (num === undefined || num === null || isNaN(Number(num))) return '₹0';
  return '₹' + Math.round(Number(num)).toLocaleString('en-IN');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Stock Analysis Dashboard Loaded');
  initThemeToggle();
  initTabNavigation();
  initScrollCTA();
  initFileUploadAndSearch();
  initAccumulationCalculator();

  // Load default GROWW analysis on initial load
  triggerInitialAnalysis('GROWW');
});

// Theme Switcher
function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    toggleBtn.setAttribute('title', isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme');
  });
}

// Tab Switching
function initTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabPanes.forEach(pane => {
        if (pane.id === targetTabId) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });
}

// Scroll CTA Button to Accumulation Planner
function initScrollCTA() {
  const scrollBtn = document.getElementById('scrollToTranchesBtn');
  const tabBtnAccumulation = document.getElementById('tabBtnAccumulation');
  const accumulationSection = document.getElementById('tab-accumulation');

  if (scrollBtn && tabBtnAccumulation && accumulationSection) {
    scrollBtn.addEventListener('click', () => {
      tabBtnAccumulation.click();
      accumulationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

// Search & File Upload Handling
function initFileUploadAndSearch() {
  const form = document.getElementById('stockAnalysisForm');
  const stockInput = document.getElementById('stockInput');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const fileChipsContainer = document.getElementById('fileChipsContainer');
  const quickChips = document.querySelectorAll('.quick-chip');

  // Quick Chips
  quickChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      quickChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const symbol = chip.getAttribute('data-symbol');
      stockInput.value = symbol;
      runAnalysis(symbol, selectedFiles);
    });
  });

  // Dropzone click triggers file dialog
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files);
      addFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      addFiles(files);
    });
  }

  function addFiles(files) {
    files.forEach(f => {
      if (!selectedFiles.some(existing => existing.name === f.name && existing.size === f.size)) {
        selectedFiles.push(f);
      }
    });
    renderFileChips();
  }

  function renderFileChips() {
    if (!fileChipsContainer) return;
    fileChipsContainer.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      const sizeKB = (file.size / 1024).toFixed(0);
      chip.innerHTML = `
        <span>&#x1F4C4; ${file.name} (${sizeKB} KB)</span>
        <button type="button" class="remove-file-btn" data-index="${index}">&times;</button>
      `;
      fileChipsContainer.appendChild(chip);
    });

    document.querySelectorAll('.remove-file-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'));
        selectedFiles.splice(idx, 1);
        renderFileChips();
      });
    });
  }

  // Handle Form Submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ticker = stockInput.value.trim();
      if (!ticker) return;

      runAnalysis(ticker, selectedFiles);
    });
  }
}

// Initial default analysis call
function triggerInitialAnalysis(ticker) {
  runAnalysis(ticker, []);
}

// Execute Stock Analysis via API
async function runAnalysis(ticker, files) {
  const submitBtn = document.getElementById('analyzeSubmitBtn');
  const btnText = document.getElementById('analyzeBtnText');
  const statusNotification = document.getElementById('statusNotification');

  try {
    if (submitBtn) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
    }
    if (btnText) btnText.textContent = `Analyzing ${ticker}...`;
    if (statusNotification) {
      statusNotification.className = 'status-notification';
      statusNotification.textContent = 'Fetching live financials from Screener.in & parsing documents...';
    }

    const formData = new FormData();
    formData.append('ticker', ticker);
    files.forEach(f => {
      formData.append('files', f);
    });

    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to complete analysis.');
    }

    currentAnalysisData = result.data;
    renderFullDashboard(currentAnalysisData);

    if (statusNotification) {
      statusNotification.className = 'status-notification success';
      statusNotification.textContent = `Analysis complete for ${currentAnalysisData.company_name}!`;
      setTimeout(() => { statusNotification.textContent = ''; }, 4000);
    }

  } catch (err) {
    console.error('Analysis error:', err);
    if (statusNotification) {
      statusNotification.className = 'status-notification error';
      statusNotification.textContent = `Error: ${err.message}`;
    }
  } finally {
    if (submitBtn) {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
    if (btnText) btnText.innerHTML = '&#x26A1; Generate Institutional Analysis';
  }
}

// Render the Entire UI from Analysis Data
function renderFullDashboard(data) {
  if (!data) return;

  // 1. Header Vitals
  document.getElementById('brandDisplayName').textContent = data.company_name.split(' ')[0];
  document.getElementById('headerCompanyName').textContent = data.company_name;
  document.getElementById('headerCmp').textContent = `₹${formatPrice(data.cmp)}`;
  document.getElementById('headerMcap').textContent = String(data.mcap).includes('Cr') ? data.mcap : `${data.mcap} Cr`;
  document.getElementById('headerPe').textContent = `${data.pe}x`;
  document.getElementById('headerRoceRoe').textContent = `${data.roce}% / ${data.roe}%`;
  document.getElementById('footerCompanyName').textContent = data.company_name;

  // 2. Titles & Summaries
  document.getElementById('companyExecutiveTitle').textContent = `${data.company_name} — Decision Matrix`;
  if (data.about) {
    document.getElementById('companyAboutDesc').textContent = data.about.slice(0, 240) + '...';
  }

  // 3. Five Core Decision Pillars
  // Pillar 1: Business
  const badgeBiz = document.getElementById('badgeBusiness');
  badgeBiz.textContent = data.business_status;
  badgeBiz.className = `status-badge ${data.business_status === 'STRONG' ? 'badge-strong' : (data.business_status === 'BAD' ? 'badge-bad' : 'badge-expensive')}`;
  document.getElementById('businessHighlight').textContent = data.roce > 0 ? `${data.roce}% ROCE Efficiency` : 'Capital Return';
  document.getElementById('businessSummary').innerHTML = `
    Business moat classified as <strong>${data.business_status}</strong> based on market positioning, <strong>ROCE of ${data.roce}%</strong>, and <strong>ROE of ${data.roe}%</strong>.
  `;
  document.getElementById('businessBullets').innerHTML = `
    <li>3-Year Compounded Sales Growth: <strong>${data.sales_3y_cagr}%</strong></li>
    <li>Debt to Equity Ratio: <strong>${data.debt_equity}x</strong> (Pristine Balance Sheet)</li>
    <li>Operating Profit Margin: <strong>${data.opm_ttm}%</strong></li>
  `;

  // Pillar 2: Growth
  const badgeGrowth = document.getElementById('badgeGrowth');
  badgeGrowth.textContent = data.growth_status;
  badgeGrowth.className = `status-badge ${data.growth_status.includes('VERY') ? 'badge-very-strong' : (data.growth_status === 'STRONG' ? 'badge-good' : 'badge-expensive')}`;
  
  const vis = data.orderbook_visibility || {};
  const highlightText = vis.headline ? vis.headline : `${data.sales_3y_cagr}% 3Y Sales CAGR`;
  document.getElementById('growthHighlight').textContent = highlightText;
  
  const visHeadlineMention = vis.amount ? `, backed by <strong>${vis.amount}</strong>` : '';
  document.getElementById('growthSummary').innerHTML = `
    Growth trajectory ranked <strong>${data.growth_status}</strong>${visHeadlineMention} with <strong>${data.profit_3y_cagr}% 3Y profit CAGR</strong> and <strong>${data.sales_3y_cagr}% 3Y sales CAGR</strong>.
  `;
  
  const orderBookBullet = vis.growth_bullet 
    ? `<li><strong>Order Book & Revenue Visibility:</strong> ${vis.growth_bullet}</li>`
    : `<li><strong>Revenue Visibility:</strong> Anchored by ${data.sales_3y_cagr}% 3Y sales CAGR and expanding order pipeline.</li>`;

  document.getElementById('growthBullets').innerHTML = `
    ${orderBookBullet}
    <li>TTM Revenue: <strong>₹${Number(data.sales_ttm).toLocaleString('en-IN')} Cr</strong> | TTM PAT: <strong>₹${Number(data.pat_ttm).toLocaleString('en-IN')} Cr</strong></li>
    <li>Execution Runway: <strong>${vis.runway || 'Consistent Compounding Runway'}</strong> (Coverage: <strong>${vis.coverage || 'Robust'}</strong>)</li>
  `;

  // Pillar 3: Fundamentals
  const badgeFund = document.getElementById('badgeFundamentals');
  badgeFund.textContent = data.fundamentals_status;
  badgeFund.className = `status-badge ${data.fundamentals_status.includes('GOOD') ? 'badge-good' : 'badge-bad'}`;
  document.getElementById('fundamentalsHighlight').textContent = `${data.opm_ttm}% OPM | ₹${Number(data.pat_ttm).toLocaleString('en-IN')} Cr PAT`;
  document.getElementById('fundamentalsSummary').innerHTML = `
    Financial health evaluated as <strong>${data.fundamentals_status}</strong>. High operational margin of <strong>${data.opm_ttm}%</strong> and conservative leverage.
  `;
  document.getElementById('fundamentalsBullets').innerHTML = `
    <li>Zero or conservative debt (D/E: ${data.debt_equity}x)</li>
    <li>Consistent operating profitability and cash flow generation</li>
    <li>Stable promoter holding with zero pledge</li>
  `;

  // Pillar 4: Valuation
  const badgeVal = document.getElementById('badgeValuation');
  badgeVal.textContent = data.valuation_status;
  badgeVal.className = `status-badge ${data.valuation_status.includes('CHEAP') ? 'badge-cheap' : (data.valuation_status === 'REASONABLE' ? 'badge-strong' : 'badge-expensive')}`;
  document.getElementById('valuationHighlight').textContent = `${data.pe}x Stock P/E`;
  document.getElementById('valuationSummary').innerHTML = `
    Valuation ranked as <strong>${data.valuation_status}</strong> at <strong>${data.pe}x TTM P/E</strong> and <strong>${data.pb}x P/B</strong>.
  `;
  document.getElementById('valuationBullets').innerHTML = `
    <li>52-Week Range: <strong>₹${formatPrice(data.low_52w, 1)} – ₹${formatPrice(data.high_52w, 1)}</strong></li>
    <li>Current Price: <strong>₹${formatPrice(data.cmp)}</strong></li>
    <li>Requires sustained 20%+ earnings growth to justify current multiple</li>
  `;

  // Pillar 5: Investment Decision
  const badgeDec = document.getElementById('badgeDecision');
  badgeDec.textContent = data.investment_decision;
  badgeDec.className = `status-badge ${data.investment_decision === 'BUY' ? 'badge-good' : 'badge-action'}`;
  document.getElementById('decisionHighlight').textContent = `${data.investment_decision} at ₹${formatPrice(data.cmp)}`;
  document.getElementById('decisionSummary').textContent = data.action_text;
  document.getElementById('footerDecision').textContent = data.investment_decision;

  // 4. Document Insights Banner
  const docBanner = document.getElementById('docInsightsBanner');
  const docChipsList = document.getElementById('docChipsList');
  if (data.doc_signals && data.doc_signals.has_documents) {
    docBanner.style.display = 'flex';
    docChipsList.innerHTML = '';
    data.doc_signals.doc_summaries.forEach(doc => {
      const chip = document.createElement('span');
      chip.className = 'status-chip live';
      chip.textContent = `${doc.filename} (${doc.pages || 1} pgs parsed)`;
      docChipsList.appendChild(chip);
    });
  } else {
    docBanner.style.display = 'none';
  }

  // 5. Accumulation Tranches & Calculator
  renderTranchesTable(data.tranches, data.cmp);
  renderPriceLadder(data);
  renderDrawdownGrid(data.cmp);

  // 6. Financial Statements & Peers Table
  renderFinancialsTable(data);
  renderPeersTable(data.peers_data);

  // 7. Pros & Cons
  renderProsAndCons(data.pros, data.cons);

  // 8. Order Book & Revenue Visibility Panel
  renderOrderBookPanel(data.orderbook_visibility);

  // 9. Valuation Scenarios
  renderScenarios(data.scenarios);

  // 10. Surveillance Radar
  renderSurveillanceRadar(data);
}

// Render Order Book & Visibility Panel
function renderOrderBookPanel(vis) {
  if (!vis) return;
  const panel = document.getElementById('orderbookPanel');
  if (!panel) return;

  const visTypeBadge = document.getElementById('visTypeBadge');
  const visHeadline = document.getElementById('visHeadline');
  const visRunwayChip = document.getElementById('visRunwayChip');
  const visAmount = document.getElementById('visAmount');
  const visCoverage = document.getElementById('visCoverage');
  const visInflows = document.getElementById('visInflows');
  const visRunway = document.getElementById('visRunway');
  const visSnippetsList = document.getElementById('visSnippetsList');

  if (visTypeBadge) visTypeBadge.textContent = vis.visibility_type || 'Order Book & Visibility';
  if (visHeadline) visHeadline.textContent = vis.headline || 'Revenue Visibility Analysis';
  if (visRunwayChip) visRunwayChip.textContent = vis.runway || 'Multi-Year Runway';
  if (visAmount) visAmount.textContent = vis.amount || 'High Asset Stickiness';
  if (visCoverage) visCoverage.textContent = vis.coverage || 'Strong Coverage';
  if (visInflows) visInflows.textContent = vis.inflows || 'Steady Recurring Inflows';
  if (visRunway) visRunway.textContent = vis.runway || 'Visible Compounding Runway';

  if (visSnippetsList) {
    if (vis.snippets && vis.snippets.length > 0) {
      visSnippetsList.innerHTML = vis.snippets.map(s => `<li>${s}</li>`).join('');
    } else {
      visSnippetsList.innerHTML = `<li>${vis.growth_bullet}</li>`;
    }
  }
}

// Render Tranche Table
function renderTranchesTable(tranches, cmp) {
  const tableBody = document.getElementById('trancheTableBody');
  const capitalInput = document.getElementById('capitalInput');
  const totalCapitalSumEl = document.getElementById('totalCapitalSum');
  const totalEstSharesEl = document.getElementById('totalEstShares');
  const projectedVwapText = document.getElementById('projectedVwapText');

  if (!tableBody || !tranches) return;

  const totalCapital = parseFloat(capitalInput ? capitalInput.value : 500000) || 500000;
  tableBody.innerHTML = '';

  let totalShares = 0;
  let totalWeightedCost = 0;

  tranches.forEach(t => {
    const capitalForTranche = totalCapital * (t.allocationPct / 100);
    const estShares = Math.floor(capitalForTranche / t.midPrice);
    totalShares += estShares;
    totalWeightedCost += (estShares * t.midPrice);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="level-badge ${t.levelClass}">${t.level}</span></td>
      <td><strong>${t.priceZone}</strong></td>
      <td><strong>${t.allocationPct}%</strong></td>
      <td class="font-mono text-emerald"><strong>${formatRupees(capitalForTranche)}</strong></td>
      <td class="font-mono">${estShares.toLocaleString('en-IN')} shares</td>
      <td><span class="text-secondary">${t.rationale}</span></td>
      <td><span class="action-pill ${t.actionPillClass}">${t.actionDirective}</span></td>
    `;
    tableBody.appendChild(tr);
  });

  const averageVwap = totalShares > 0 ? (totalWeightedCost / totalShares).toFixed(2) : 0;
  if (totalCapitalSumEl) totalCapitalSumEl.textContent = formatRupees(totalCapital);
  if (totalEstSharesEl) totalEstSharesEl.textContent = `${totalShares.toLocaleString('en-IN')} shares`;
  if (projectedVwapText) projectedVwapText.innerHTML = `<strong>Projected VWAP: ~₹${averageVwap} (vs CMP ₹${formatPrice(cmp)})</strong>`;
}

// Render Price Ladder Visual
function renderPriceLadder(data) {
  const ladderContainer = document.getElementById('ladderContainer');
  if (!ladderContainer || !data.tranches) return;

  const s1 = data.tranches[0];
  const s2 = data.tranches[1];
  const s3 = data.tranches[2];
  const s4 = data.tranches[3];

  ladderContainer.innerHTML = `
    <div class="ladder-step s4-step" title="S4: Extreme Floor ${s4.priceZone}">
      <span class="step-label">S4 Floor</span>
      <span class="step-price">${s4.priceZone}</span>
      <span class="step-badge reserve">15% Reserve</span>
    </div>
    <div class="ladder-step s3-step" title="S3: Deep Value ${s3.priceZone}">
      <span class="step-label">S3 Support</span>
      <span class="step-price">${s3.priceZone}</span>
      <span class="step-badge aggressive">25% Aggressive</span>
    </div>
    <div class="ladder-step s2-step" title="S2: Major 50W-EMA ${s2.priceZone}">
      <span class="step-label">S2 Support</span>
      <span class="step-price">${s2.priceZone}</span>
      <span class="step-badge more">35% Primary</span>
    </div>
    <div class="ladder-step s1-step" title="S1: 200-DMA ${s1.priceZone}">
      <span class="step-label">S1 Support</span>
      <span class="step-price">${s1.priceZone}</span>
      <span class="step-badge some">25% Starter</span>
    </div>
    <div class="ladder-step cmp-step active-cmp" title="Current Price ₹${formatPrice(data.cmp)}">
      <span class="step-label">Current Price</span>
      <span class="step-price">₹${formatPrice(data.cmp)}</span>
      <span class="step-badge cmp">CMP (Hold)</span>
    </div>
    <div class="ladder-step high-step" title="52-Week High ₹${formatPrice(data.high_52w, 1)}">
      <span class="step-label">52W Peak</span>
      <span class="step-price">₹${formatPrice(data.high_52w, 1)}</span>
      <span class="step-badge ath">Peak High</span>
    </div>
  `;
}

// Render Drawdown Grid
function renderDrawdownGrid(cmp) {
  const drawdownGrid = document.getElementById('drawdownGrid');
  if (!drawdownGrid) return;

  const drops = [
    { pct: 5, price: (cmp * 0.95).toFixed(1), tagClass: 'drop-5', action: 'Deploy Tranche 1 (25% at S1). Check no adverse circular.' },
    { pct: 10, price: (cmp * 0.90).toFixed(1), tagClass: 'drop-10', action: 'Wait for price to stabilize near S2 (50-WEMA).' },
    { pct: 20, price: (cmp * 0.80).toFixed(1), tagClass: 'drop-20', action: 'High attractiveness. Deploy Tranche 2 (35% at S2).' },
    { pct: 30, price: (cmp * 0.70).toFixed(1), tagClass: 'drop-30', action: 'Deep value shelf. Deploy Tranche 3 (25% at S3).' },
    { pct: 40, price: (cmp * 0.60).toFixed(1), tagClass: 'drop-40', action: 'Crash floor. Deploy final 15% reserve at S4.' }
  ];

  drawdownGrid.innerHTML = drops.map(d => `
    <div class="drawdown-item">
      <span class="drop-tag ${d.tagClass}">-${d.pct}% (₹${d.price})</span>
      <div class="drop-desc">
        <strong>Price Fall:</strong> ${d.action}<br>
        <span class="check-txt">Deterioration Check: Verify sequential sales and profit growth.</span>
      </div>
    </div>
  `).join('');
}

// Render Financial History Table
function renderFinancialsTable(data) {
  const thead = document.getElementById('financialTableHead');
  const tbody = document.getElementById('financialTableBody');
  const badgeRow = document.getElementById('ratiosBadgeRow');

  if (!thead || !tbody) return;

  badgeRow.innerHTML = `
    <span class="ratio-pill">OPM: <strong>${data.opm_ttm}%</strong></span>
    <span class="ratio-pill">ROCE: <strong>${data.roce}%</strong></span>
    <span class="ratio-pill">ROE: <strong>${data.roe}%</strong></span>
    <span class="ratio-pill">Debt/Equity: <strong>${data.debt_equity}x</strong></span>
    <span class="ratio-pill">Stock P/E: <strong>${data.pe}x</strong></span>
  `;

  if (data.pl_headers && data.pl_headers.length > 0) {
    thead.innerHTML = `<tr>${data.pl_headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
  } else {
    thead.innerHTML = `<tr><th>Metric</th><th>Recent Periods</th><th>TTM</th></tr>`;
  }

  if (data.pl_data && data.pl_data.length > 0) {
    tbody.innerHTML = data.pl_data.map(row => {
      return `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
    }).join('');
  }
}

// Render Peers Table
function renderPeersTable(peersData) {
  const thead = document.getElementById('peerTableHead');
  const tbody = document.getElementById('peerTableBody');
  if (!thead || !tbody || !peersData || peersData.length === 0) return;

  thead.innerHTML = `<tr>${peersData[0].map(h => `<th>${h}</th>`).join('')}</tr>`;
  tbody.innerHTML = peersData.slice(1, 8).map(row => {
    return `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`;
  }).join('');
}

// Render Pros and Cons
function renderProsAndCons(pros, cons) {
  const prosList = document.getElementById('prosList');
  const consList = document.getElementById('consList');
  if (prosList && pros) {
    prosList.innerHTML = pros.length > 0 ? pros.map(p => `<li>${p}</li>`).join('') : '<li>Strong operating cash flows.</li>';
  }
  if (consList && cons) {
    consList.innerHTML = cons.length > 0 ? cons.map(c => `<li>${c}</li>`).join('') : '<li>Trading at premium to book value.</li>';
  }
}

// Render 5-Year Scenarios
function renderScenarios(scenarios) {
  const grid = document.getElementById('scenariosGrid');
  if (!grid || !scenarios) return;

  const bear = scenarios.bear;
  const base = scenarios.base;
  const bull = scenarios.bull;

  grid.innerHTML = `
    <!-- BEAR -->
    <div class="scenario-card bear-card">
      <div class="scenario-header">
        <span class="scenario-tag bear">BEAR SCENARIO</span>
        <span class="cagr-tag negative">${bear.cagr} CAGR</span>
      </div>
      <h4 class="scenario-headline">Macro Stagnation & Multiple De-Rating</h4>
      <div class="scenario-specs">
        <div class="spec-row"><span>Revenue CAGR:</span><strong>${bear.revenue_cagr}</strong></div>
        <div class="spec-row"><span>EPS CAGR:</span><strong>${bear.eps_cagr}</strong></div>
        <div class="spec-row"><span>FY31E Estimated EPS:</span><strong>${bear.fy31_eps}</strong></div>
        <div class="spec-row"><span>Terminal P/E Multiple:</span><strong>${bear.terminal_pe}</strong></div>
        <div class="spec-row highlight-spec">
          <span>Projected Target Price:</span>
          <strong class="target-price red">${bear.target_price}</strong>
        </div>
      </div>
      <p class="scenario-narrative">Subdued market volumes, margin pressure, and compression of trading multiples.</p>
    </div>

    <!-- BASE -->
    <div class="scenario-card base-card">
      <div class="scenario-header">
        <span class="scenario-tag base">BASE SCENARIO</span>
        <span class="cagr-tag positive">${base.cagr} CAGR</span>
      </div>
      <h4 class="scenario-headline">Steady Multi-Year Compounding</h4>
      <div class="scenario-specs">
        <div class="spec-row"><span>Revenue CAGR:</span><strong>${base.revenue_cagr}</strong></div>
        <div class="spec-row"><span>EPS CAGR:</span><strong>${base.eps_cagr}</strong></div>
        <div class="spec-row"><span>FY31E Estimated EPS:</span><strong>${base.fy31_eps}</strong></div>
        <div class="spec-row"><span>Terminal P/E Multiple:</span><strong>${base.terminal_pe}</strong></div>
        <div class="spec-row highlight-spec">
          <span>Projected Target Price:</span>
          <strong class="target-price blue">${base.target_price}</strong>
        </div>
      </div>
      <p class="scenario-narrative">Steady market share gains, disciplined capital allocation, and resilient return on equity.</p>
    </div>

    <!-- BULL -->
    <div class="scenario-card bull-card">
      <div class="scenario-header">
        <span class="scenario-tag bull">BULL SCENARIO</span>
        <span class="cagr-tag very-positive">${bull.cagr} CAGR</span>
      </div>
      <h4 class="scenario-headline">Market Dominance & Margin Expansion</h4>
      <div class="scenario-specs">
        <div class="spec-row"><span>Revenue CAGR:</span><strong>${bull.revenue_cagr}</strong></div>
        <div class="spec-row"><span>EPS CAGR:</span><strong>${bull.eps_cagr}</strong></div>
        <div class="spec-row"><span>FY31E Estimated EPS:</span><strong>${bull.fy31_eps}</strong></div>
        <div class="spec-row"><span>Terminal P/E Multiple:</span><strong>${bull.terminal_pe}</strong></div>
        <div class="spec-row highlight-spec">
          <span>Projected Target Price:</span>
          <strong class="target-price green">${bull.target_price}</strong>
        </div>
      </div>
      <p class="scenario-narrative">Accelerating top-line compounding, multiple expansion, and high operating leverage.</p>
    </div>
  `;
}

// Render Surveillance Radar
function renderSurveillanceRadar(data) {
  const kpiOpm = document.getElementById('kpiOpm');
  const kpiSales = document.getElementById('kpiSalesGrowth');
  const kpiRoce = document.getElementById('kpiRoce');
  const kpiDebt = document.getElementById('kpiDebtEquity');

  if (kpiOpm) kpiOpm.textContent = `${data.opm_ttm}%`;
  if (kpiSales) kpiSales.textContent = `${data.sales_3y_cagr}%`;
  if (kpiRoce) kpiRoce.textContent = `${data.roce}%`;
  if (kpiDebt) kpiDebt.textContent = `${data.debt_equity}x`;
}

// Capital Input Calculator Dynamic Listener
function initAccumulationCalculator() {
  const capitalInput = document.getElementById('capitalInput');
  const presetChips = document.querySelectorAll('.preset-chip');

  if (!capitalInput) return;

  capitalInput.addEventListener('input', () => {
    if (currentAnalysisData) {
      renderTranchesTable(currentAnalysisData.tranches, currentAnalysisData.cmp);
    }
    presetChips.forEach(c => c.classList.remove('active'));
  });

  const presets = [
    { id: 'quickPreset100k', value: 100000 },
    { id: 'quickPreset500k', value: 500000 },
    { id: 'quickPreset1000k', value: 1000000 }
  ];

  presets.forEach(p => {
    const btn = document.getElementById(p.id);
    if (btn) {
      btn.addEventListener('click', () => {
        capitalInput.value = p.value;
        presetChips.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        if (currentAnalysisData) {
          renderTranchesTable(currentAnalysisData.tranches, currentAnalysisData.cmp);
        }
      });
    }
  });
}
