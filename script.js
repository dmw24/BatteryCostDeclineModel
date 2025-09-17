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
        backgroundColor: chem.color,
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.32,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
            label: (context) => `${context.dataset.label}: $${context.parsed.y.toFixed(2)} /kWh`,
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
        },
        y: {
          grid: {
            color: 'rgba(148, 163, 184, 0.08)',
          },
          ticks: {
            color: 'rgba(226, 232, 240, 0.8)',
            callback: (value) => `$${value}`,
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
  const final = costs[costs.length - 1];
  const change = ((chem.baselineCost - final) / chem.baselineCost) * 100;
  valueEl.textContent = `$${final.toFixed(2)}`;
  deltaEl.textContent = `${change >= 0 ? '▼' : '▲'} ${Math.abs(change).toFixed(1)}% vs baseline`;
  deltaEl.style.color = change >= 0 ? 'var(--positive)' : '#f87171';
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
  const startYear = Number(controls.startYear.value);
  const totalDoublings = Number(controls.totalDoublings.value);
  const shape = controls.uptakeShape.value;

  const labels = Array.from({ length: years }, (_, i) => startYear + i);
  const doublingsByYear = labels.map((_, index) => adoptionProgress(index, years, shape) * totalDoublings);

  const costMap = {};

  Object.values(chemistries).forEach((chem, idx) => {
    const dataset = chart.data.datasets[idx];
    const costs = doublingsByYear.map((d) => computeCost(chem, d));
    dataset.data = costs;
    dataset.borderColor = chem.color;
    dataset.backgroundColor = chem.color;
    costMap[chem.id] = costs;
    updateSummary(chem, costs);
  });

  chart.data.labels = labels;
  chart.update();
  updateTable(labels, costMap);
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
buildSummaryCards();
updateModel();
