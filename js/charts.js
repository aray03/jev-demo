// Standard-tier list prices in USD per 1M tokens, checked Nov 2, 2026.
// Jev: docs.typesafe.ai/models · Claude: platform.claude.com/docs/en/about-claude/pricing
// OpenAI: developers.openai.com/api/docs/pricing
const PRICES = [
  { name: 'Jev 1.14',          family: 'jev',    input: 0.042, output: 0 },
  { name: 'Claude Haiku 5.5',  family: 'claude', input: 0.10,  output: 0.50 },
  { name: 'GPT-6 Luna',        family: 'gpt',    input: 0.10,  output: 0.50 },
  { name: 'Claude Sonnet 5.5', family: 'claude', input: 2,     output: 10 },
  { name: 'GPT-6.1 Sol',       family: 'gpt',    input: 2,     output: 10 },
  { name: 'Claude Opus 5.5',   family: 'claude', input: 4,     output: 20 },
  { name: 'Claude Fable 5.1',  family: 'claude', input: 10,    output: 50 },
  { name: 'GPT-6 Astra',       family: 'gpt',    input: 10,    output: 50 },
];

// Image slide assumptions. TypeSafe hasn't published an image-token formula,
// so every model gets the same count: Claude's (w*h)/750 for a ~1092x1092 photo.
// Replace with the real `usage` number from a Jev response if you have one.
const IMAGE_INPUT_TOKENS = 1600;
const IMAGE_OUTPUT_TOKENS = 50; // a short label from an LLM; Jev output is free
const IMAGE_COUNT = 1000;

// Classification slide assumptions: a short text prompt and a one-word answer.
const CLASSIFY_INPUT_TOKENS = 500;
const CLASSIFY_OUTPUT_TOKENS = 20;
const CLASSIFY_COUNT = 1_000_000;

const css = getComputedStyle(document.documentElement);
const COLORS = {
  jev: css.getPropertyValue('--jev').trim(),
  claude: css.getPropertyValue('--claude').trim(),
  gpt: css.getPropertyValue('--gpt').trim(),
};
const TEXT = css.getPropertyValue('--text').trim();
const MUTED = css.getPropertyValue('--muted').trim();
const GRID = css.getPropertyValue('--border').trim();

function jobCost(p, inputTokens, outputTokens, count) {
  return (count * (inputTokens * p.input + outputTokens * p.output)) / 1e6;
}

function money(v) {
  if (v >= 100) return '$' + Math.round(v).toLocaleString();
  if (v >= 1) return '$' + v.toFixed(2);
  return '$' + v.toFixed(3);
}

// Draws the dollar value at the end of each bar.
const valueLabels = {
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillStyle = TEXT;
    ctx.textBaseline = 'middle';
    meta.data.forEach((bar, i) => {
      ctx.fillText(money(chart.data.datasets[0].data[i]), bar.x + 8, bar.y);
    });
    ctx.restore();
  },
};

function barChart(canvas, values, axisTitle) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: PRICES.map(p => p.name),
      datasets: [{
        data: values,
        backgroundColor: PRICES.map(p => COLORS[p.family]),
        borderRadius: 6,
        barPercentage: 0.8,
      }],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { right: 90 } },
      animation: { duration: 900 },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: axisTitle, color: MUTED, font: { size: 15 } },
          ticks: { color: MUTED, font: { size: 14 }, maxRotation: 0, callback: v => (v === 0 ? '$0' : money(v)) },
          grid: { color: GRID },
        },
        y: {
          ticks: { color: TEXT, font: { size: 17, weight: '600' } },
          grid: { display: false },
        },
      },
    },
    plugins: [valueLabels],
  });
}

const CHARTS = {
  'chart-image': canvas => barChart(
    canvas,
    PRICES.map(p => jobCost(p, IMAGE_INPUT_TOKENS, IMAGE_OUTPUT_TOKENS, IMAGE_COUNT)),
    'Cost to label 1,000 images',
  ),
  'chart-input': canvas => barChart(
    canvas,
    PRICES.map(p => p.input),
    'USD per 1M input tokens',
  ),
  'chart-classify': canvas => barChart(
    canvas,
    PRICES.map(p => jobCost(p, CLASSIFY_INPUT_TOKENS, CLASSIFY_OUTPUT_TOKENS, CLASSIFY_COUNT)),
    'Cost of 1,000,000 classifications',
  ),
};

const built = {};

// Build each chart the first time its slide is shown, so the bars animate in.
function renderChartsIn(slide) {
  slide.querySelectorAll('canvas[data-chart]').forEach(canvas => {
    const key = canvas.dataset.chart;
    if (built[key]) {
      built[key].reset();
      built[key].update();
    } else {
      built[key] = CHARTS[key](canvas);
    }
  });
}

function fillAssumptions() {
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('img-tokens', IMAGE_INPUT_TOKENS.toLocaleString());
  set('img-out', IMAGE_OUTPUT_TOKENS.toLocaleString());
  set('cls-in', CLASSIFY_INPUT_TOKENS.toLocaleString());
  set('cls-out', CLASSIFY_OUTPUT_TOKENS.toLocaleString());

  const jev = PRICES[0];
  const fable = PRICES.find(p => p.name === 'Claude Fable 5.1');
  const haiku = PRICES.find(p => p.name === 'Claude Haiku 5.5');
  set('x-fable', Math.round(fable.input / jev.input) + '×');
  const imgRatio = jobCost(haiku, IMAGE_INPUT_TOKENS, IMAGE_OUTPUT_TOKENS, 1) /
    jobCost(jev, IMAGE_INPUT_TOKENS, IMAGE_OUTPUT_TOKENS, 1);
  set('x-img-haiku', imgRatio.toFixed(1) + '×');
  set('jev-classify', money(jobCost(jev, CLASSIFY_INPUT_TOKENS, CLASSIFY_OUTPUT_TOKENS, CLASSIFY_COUNT)));
  set('fable-classify', money(jobCost(fable, CLASSIFY_INPUT_TOKENS, CLASSIFY_OUTPUT_TOKENS, CLASSIFY_COUNT)));
}
