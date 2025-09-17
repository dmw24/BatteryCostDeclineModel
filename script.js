const defaultChemistries = {
  lfp: {
    id: 'lfp',
    name: 'LFP',
    badge: 'Iron phosphate workhorse',
    color: '#38bdf8',
    baselineCost: 59,
    floorCost: 22.2,
    learningRate: 0.2,
  },
  nmc: {
    id: 'nmc',
    name: 'NMC-811',
    badge: 'High nickel energy density',
    color: '#c084fc',
    baselineCost: 68.6,
    floorCost: 33.75,
    learningRate: 0.18,
  },
  sodium: {
    id: 'sodium',
    name: 'Sodium-ion',
    badge: 'Emerging storage contender',
    color: '#facc15',
    baselineCost: 87,
    floorCost: 21.57,
    learningRate: 0.22,
  },
};

let chemistries = JSON.parse(JSON.stringify(defaultChemistries));

const HISTORY_END_YEAR = 2024;

const historicalData = {
  lfp: [
    { year: 2010, cost: 600 },
    { year: 2012, cost: 420 },
    { year: 2014, cost: 310 },
    { year: 2016, cost: 215 },
    { year: 2018, cost: 162 },
    { year: 2020, cost: 130 },
    { year: 2022, cost: 96 },
    { year: 2023, cost: 76 },
    { year: 2024, cost: 59 },
  ],
  nmc: [
    { year: 2010, cost: 780 },
    { year: 2012, cost: 560 },
    { year: 2014, cost: 410 },
    { year: 2016, cost: 290 },
    { year: 2018, cost: 210 },
    { year: 2020, cost: 160 },
    { year: 2022, cost: 120 },
    { year: 2023, cost: 92 },
    { year: 2024, cost: 68.6 },
  ],
  sodium: [
    { year: 2012, cost: 650 },
    { year: 2014, cost: 520 },
    { year: 2016, cost: 410 },
    { year: 2018, cost: 320 },
    { year: 2020, cost: 250 },
    { year: 2021, cost: 220 },
    { year: 2022, cost: 185 },
    { year: 2023, cost: 140 },
    { year: 2024, cost: 87 },
  ],
};

const historyYears = Array.from(
  new Set(
    Object.values(historicalData)
      .flatMap((series) => series.map((point) => point.year))
      .filter((year) => year <= HISTORY_END_YEAR),
  ),
).sort((a, b) => a - b);

function hexToRgb(hex) {
  if (!hex) return { r: 255, g: 255, b: 255 };
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function mixWithWhite(hex, amount = 0.25, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (channel) => Math.round(channel + (255 - channel) * amount);
  const nr = mix(r);
  const ng = mix(g);
  const nb = mix(b);
  return alpha === 1 ? `rgb(${nr}, ${ng}, ${nb})` : `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;
}

function withAlpha(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const controls = {
  startYear: document.getElementById('startYear'),
  forecastYears: document.getElementById('forecastYears'),
  totalDoublings: document.getElementById('totalDoublings'),
  uptakeShape: document.getElementById('uptakeShape'),
  resetButton: document.getElementById('resetButton'),
  valueLabels: document.querySelectorAll('span.value[data-target]'),
};

const chemistryGrid = document.getElementById('chemistryGrid');
const summaryGrid = document.getElementById('summaryGrid');
const tableBody = document.getElementById('forecastTable');
const historyTableBody = document.getElementById('historyTable');

controls.valueLabels.forEach((span) => {
  const target = span.dataset.target;
  span.textContent = controls[target].value + (target === 'forecastYears' ? ' years' : ' doublings');
});

setValueLabel('totalDoublings', `${Number(controls.totalDoublings.value).toFixed(2)} doublings`);

controls.forecastYears.addEventListener('input', (event) => {
  setValueLabel('forecastYears', `${event.target.value} years`);
  updateModel();
});

controls.totalDoublings.addEventListener('input', (event) => {
  setValueLabel('totalDoublings', `${parseFloat(event.target.value).toFixed(2)} doublings`);
  updateModel();
});

controls.startYear.addEventListener('input', () => updateModel());
controls.uptakeShape.addEventListener('change', () => updateModel());
controls.resetButton.addEventListener('click', resetDefaults);

function setValueLabel(target, text) {
  const label = document.querySelector(`span.value[data-target="${target}"]`);
  if (label) label.textContent = text;
}

function createChemistryCard(config) {
  const card = document.createElement('article');
  card.className = 'chem-card';
  card.dataset.chemistry = config.id;

  card.innerHTML = `
    <header>
      <div>
        <h3>${config.name}</h3>
        <p class="badge">${config.badge}</p>
      </div>
      <span class="color-chip" style="background: ${config.color}"></span>
    </header>
    <div class="chem-stat">
      <span>Baseline cost</span>
      <strong><span data-role="baselineDisplay">$${config.baselineCost.toFixed(2)}</span> /kWh</strong>
    </div>
    <div class="chem-stat">
      <span>Materials floor</span>
      <strong><span data-role="floorDisplay">$${config.floorCost.toFixed(2)}</span> /kWh</strong>
    </div>
    <div class="chem-stat">
      <span>Learning rate</span>
      <strong><span data-role="lrDisplay">${(config.learningRate * 100).toFixed(1)}%</span> per doubling</strong>
    </div>
    <div class="slider-row">
      <label>Learning rate</label>
      <input type="range" min="0.05" max="0.35" step="0.01" value="${config.learningRate}" data-field="learningRate">
      <div class="slider-value">Drag to explore literature bounds.</div>
    </div>
    <div class="slider-row">
      <label>Baseline cost ($/kWh)</label>
      <input type="number" min="10" max="300" step="0.5" value="${config.baselineCost}" data-field="baselineCost">
    </div>
    <div class="slider-row">
      <label>Materials floor ($/kWh)</label>
      <input type="number" min="5" max="200" step="0.1" value="${config.floorCost}" data-field="floorCost">
    </div>
  `;

  card.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      const field = input.dataset.field;
      const value = parseFloat(input.value);
      if (Number.isFinite(value)) {
        chemistries[config.id][field] = field === 'learningRate' ? value : value;
        refreshChemCard(card, chemistries[config.id]);
        updateModel();
      }
    });
  });

  return card;
}

function refreshChemCard(card, config) {
  const baselineDisplay = card.querySelector('[data-role="baselineDisplay"]');
  const floorDisplay = card.querySelector('[data-role="floorDisplay"]');
  const lrDisplay = card.querySelector('[data-role="lrDisplay"]');

  if (baselineDisplay) baselineDisplay.textContent = `$${config.baselineCost.toFixed(2)}`;
  if (floorDisplay) floorDisplay.textContent = `$${config.floorCost.toFixed(2)}`;
  if (lrDisplay) lrDisplay.textContent = `${(config.learningRate * 100).toFixed(1)}%`;
}

Object.values(chemistries).forEach((chem) => {
  chemistryGrid.appendChild(createChemistryCard(chem));
});

let chart;
let materialsChart;

function buildChart() {
  const ctx = document.getElementById('costChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: Object.values(chemistries).map((chem) => ({
        label: chem.name,
        data: [],
        fill: false,
        borderColor: chem.color,
        backgroundColor: withAlpha(chem.color, 0.25),
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.32,
        spanGaps: true,
        segment: {
          borderDash: (ctx) => (ctx.p0?.raw?.history && ctx.p1?.raw?.history ? [6, 4] : undefined),
          borderColor: (ctx) =>
            ctx.p0?.raw?.history && ctx.p1?.raw?.history ? mixWithWhite(chem.color, 0.4) : chem.color,
        },
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            color: 'rgba(243, 244, 246, 0.9)',
            usePointStyle: true,
            font: {
              size: 13,
            },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(148, 163, 184, 0.4)',
          borderWidth: 1,
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const modeLabel = context.raw?.history ? 'historical' : 'modeled';
              return `${context.dataset.label}: $${context.parsed.y.toFixed(2)} /kWh (${modeLabel})`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(148, 163, 184, 0.08)',
          },
          ticks: {
            color: 'rgba(226, 232, 240, 0.8)',
          },
          title: {
            display: true,
            text: 'Year',
            color: 'rgba(226, 232, 240, 0.7)',
          },
        },
        y: {
          grid: {
            color: 'rgba(148, 163, 184, 0.08)',
          },
          ticks: {
            color: 'rgba(226, 232, 240, 0.8)',
            callback: (value) => `$${value}`,
          },
          title: {
            display: true,
            text: 'Pack cost ($/kWh)',
            color: 'rgba(226, 232, 240, 0.7)',
          },
        },
      },
    },
  });
}

function buildMaterialsChart() {
  const canvas = document.getElementById('materialsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  materialsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Materials floor',
          data: [],
          backgroundColor: [],
          borderRadius: 14,
          borderSkipped: false,
          stack: 'baseline',
        },
        {
          label: 'Above-floor portion',
          data: [],
          backgroundColor: [],
          borderRadius: 14,
          borderSkipped: false,
          stack: 'baseline',
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: 'rgba(243, 244, 246, 0.85)',
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(148, 163, 184, 0.4)',
          borderWidth: 1,
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          padding: 12,
          callbacks: {
            label: (context) => `${context.dataset.label}: $${context.parsed.x.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            color: 'rgba(148, 163, 184, 0.08)',
          },
          ticks: {
            color: 'rgba(226, 232, 240, 0.8)',
            callback: (value) => `$${value}`,
          },
        },
        y: {
          stacked: true,
          grid: {
            display: false,
          },
          ticks: {
            color: 'rgba(226, 232, 240, 0.85)',
          },
        },
      },
    },
  });
}

function buildSummaryCards() {
  summaryGrid.innerHTML = '';
  Object.values(chemistries).forEach((chem) => {
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.dataset.chemistry = chem.id;
    card.innerHTML = `
      <h4>${chem.name}</h4>
      <span class="value" data-role="summaryValue">$${chem.baselineCost.toFixed(2)}</span>
      <span class="delta" data-role="summaryDelta">Baseline</span>
      <span class="meta" data-role="summaryFloor">Floor: $${chem.floorCost.toFixed(2)}/kWh</span>
    `;
    summaryGrid.appendChild(card);
  });
}

function adoptionProgress(index, total, shape) {
  if (total <= 1) return 1;
  const t = index / (total - 1);
  switch (shape) {
    case 'front':
      return Math.pow(t, 0.65);
    case 'back':
      return Math.pow(t, 1.75);
    case 's-curve': {
      const logistic = 1 / (1 + Math.exp(-6 * (t - 0.5)));
      const min = 1 / (1 + Math.exp(3));
      const max = 1 / (1 + Math.exp(-3));
      return ((logistic - min) / (max - min)) || 0;
    }
    default:
      return t;
  }
}

function computeCost(chem, doublings) {
  const { baselineCost, floorCost, learningRate } = chem;
  const ratio = Math.max(0, Math.min(1, 1 - learningRate));
  const rawCost = floorCost + (baselineCost - floorCost) * Math.pow(ratio, doublings);
  return Math.max(floorCost, rawCost);
}

function updateSummary(chem, costs) {
  const card = summaryGrid.querySelector(`[data-chemistry="${chem.id}"]`);
  if (!card) return;
  const valueEl = card.querySelector('[data-role="summaryValue"]');
  const deltaEl = card.querySelector('[data-role="summaryDelta"]');
  const floorEl = card.querySelector('[data-role="summaryFloor"]');
  const final = costs[costs.length - 1];
  const change = ((chem.baselineCost - final) / chem.baselineCost) * 100;
  valueEl.textContent = `$${final.toFixed(2)}`;
  deltaEl.textContent = `${change >= 0 ? '▼' : '▲'} ${Math.abs(change).toFixed(1)}% vs baseline`;
  deltaEl.style.color = change >= 0 ? 'var(--positive)' : '#f87171';
  if (floorEl) floorEl.textContent = `Floor: $${chem.floorCost.toFixed(2)}/kWh`;
}

function updateMaterialsChart() {
  if (!materialsChart) return;
  const chemList = Object.values(chemistries);
  const floors = chemList.map((chem) => chem.floorCost);
  const baselines = chemList.map((chem) => chem.baselineCost);
  const aboveFloor = baselines.map((value, index) => Math.max(value - floors[index], 0));

  materialsChart.data.labels = chemList.map((chem) => chem.name);
  materialsChart.data.datasets[0].data = floors;
  materialsChart.data.datasets[0].backgroundColor = chemList.map((chem) => withAlpha(chem.color, 0.75));
  materialsChart.data.datasets[1].data = aboveFloor;
  materialsChart.data.datasets[1].backgroundColor = chemList.map((chem) => mixWithWhite(chem.color, 0.65, 0.55));
  materialsChart.update();
}

function updateHistoryTable() {
  if (!historyTableBody) return;
  historyTableBody.innerHTML = '';
  const lookup = Object.fromEntries(
    Object.entries(historicalData).map(([id, series]) => [id, new Map(series.map((point) => [point.year, point.cost]))]),
  );

  historyYears.forEach((year) => {
    const row = document.createElement('tr');
    const yearCell = document.createElement('td');
    yearCell.textContent = year;
    row.appendChild(yearCell);

    ['lfp', 'nmc', 'sodium'].forEach((id) => {
      const cell = document.createElement('td');
      let value = lookup[id].get(year);
      if (year === HISTORY_END_YEAR) {
        value = chemistries[id].baselineCost;
      }

      if (typeof value === 'number') {
        cell.textContent = `$${value.toFixed(2)}`;
      } else {
        cell.textContent = '—';
        cell.classList.add('empty');
      }
      row.appendChild(cell);
    });

    historyTableBody.appendChild(row);
  });
}

function updateTable(yearLabels, costMap) {
  tableBody.innerHTML = '';
  yearLabels.forEach((year, idx) => {
    const row = document.createElement('tr');
    const yearCell = document.createElement('td');
    yearCell.textContent = year;
    row.appendChild(yearCell);

    ['lfp', 'nmc', 'sodium'].forEach((id) => {
      const cell = document.createElement('td');
      cell.textContent = `$${costMap[id][idx].toFixed(2)}`;
      row.appendChild(cell);
    });
    tableBody.appendChild(row);
  });
}

function updateModel() {
  const years = Number(controls.forecastYears.value);
  let startYear = Number(controls.startYear.value);
  const totalDoublings = Number(controls.totalDoublings.value);
  const shape = controls.uptakeShape.value;

  if (startYear < HISTORY_END_YEAR) {
    startYear = HISTORY_END_YEAR;
    controls.startYear.value = HISTORY_END_YEAR;
  }

  const forecastYears = Array.from({ length: years }, (_, i) => startYear + i);
  const doublingsByYear = forecastYears.map(
    (_, index) => adoptionProgress(index, forecastYears.length, shape) * totalDoublings,
  );
  const forecastIndexByYear = new Map(forecastYears.map((year, index) => [year, index]));
  const combinedYears = [
    ...historyYears,
    ...forecastYears.filter((year) => !historyYears.includes(year)),
  ];

  const costMap = {};

  Object.values(chemistries).forEach((chem, idx) => {
    const dataset = chart.data.datasets[idx];
    const costs = doublingsByYear.map((d) => computeCost(chem, d));
    const historyLookup = new Map(historicalData[chem.id].map((point) => [point.year, point.cost]));

    dataset.borderColor = chem.color;
    dataset.backgroundColor = withAlpha(chem.color, 0.25);
    dataset.data = combinedYears.map((year) => {
      let value = null;
      if (year < HISTORY_END_YEAR) {
        value = historyLookup.get(year) ?? null;
      } else if (year === HISTORY_END_YEAR) {
        value = chem.baselineCost;
      }

      if (forecastIndexByYear.has(year)) {
        value = costs[forecastIndexByYear.get(year)];
      } else if (year > HISTORY_END_YEAR) {
        const futureIndex = forecastIndexByYear.get(year);
        if (typeof futureIndex === 'number') {
          value = costs[futureIndex];
        }
      }

      return {
        x: year,
        y: typeof value === 'number' ? value : null,
        history: year <= HISTORY_END_YEAR,
      };
    });

    costMap[chem.id] = costs;
    updateSummary(chem, costs);
  });

  chart.data.labels = combinedYears;
  chart.update();
  updateTable(forecastYears, costMap);
  updateMaterialsChart();
  updateHistoryTable();
}

function resetDefaults() {
  chemistries = JSON.parse(JSON.stringify(defaultChemistries));
  chemistryGrid.innerHTML = '';
  Object.values(chemistries).forEach((chem) => {
    chemistryGrid.appendChild(createChemistryCard(chem));
  });
  buildSummaryCards();
  controls.startYear.value = 2024;
  controls.forecastYears.value = 12;
  controls.totalDoublings.value = 5;
  controls.uptakeShape.value = 'linear';
  setValueLabel('forecastYears', '12 years');
  setValueLabel('totalDoublings', '5.00 doublings');
  updateModel();
}

buildChart();
buildMaterialsChart();
buildSummaryCards();
updateModel();
