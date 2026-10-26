function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function metricFor(metrics, names) {
  for (const name of names) {
    if (metrics[name]) {
      return metrics[name];
    }
  }

  return null;
}

function metricValue(metric, key) {
  const value = metric && metric.values ? metric.values[key] : null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatNumber(value, digits = 0) {
  if (value === null || !Number.isFinite(value)) {
    return 'N/A';
  }

  return Number(value).toFixed(digits).replace(/\.0+$/, '');
}

function buildLatencyChart(metrics) {
  const candidates = [
    ['HTTP da API', 'http_req_duration'],
    ['HTTP do browser', 'browser_http_req_duration'],
    ['Geracao de pizza', 'qp_pizza_generation_ms'],
    ['LCP', 'browser_web_vital_lcp'],
    ['FCP', 'browser_web_vital_fcp'],
    ['TTFB', 'browser_web_vital_ttfb'],
    ['Iteracao', 'iteration_duration'],
  ];
  const rows = candidates
    .map(([label, name]) => ({ label, metric: metrics[name], value: metricValue(metrics[name], 'p(95)') }))
    .filter((row) => row.value !== null);

  if (rows.length === 0) {
    return '<p class="empty">Esta execucao nao produziu metricas de latencia.</p>';
  }

  const width = 880;
  const left = 166;
  const plotWidth = 625;
  const rowHeight = 42;
  const top = 26;
  const chartHeight = top + rows.length * rowHeight + 24;
  const maxValue = Math.max(...rows.map((row) => row.value), 1) * 1.12;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const grid = ticks.map((tick) => {
    const x = left + plotWidth * tick;
    const label = formatNumber(maxValue * tick);
    return `<line class="grid-line" x1="${x}" y1="${top - 8}" x2="${x}" y2="${chartHeight - 12}" />` +
      `<text class="axis-label" x="${x}" y="${chartHeight + 5}" text-anchor="middle">${label}</text>`;
  }).join('');
  const bars = rows.map((row, index) => {
    const y = top + index * rowHeight;
    const barWidth = Math.max(2, (row.value / maxValue) * plotWidth);
    const failed = row.metric.thresholds && Object.values(row.metric.thresholds).some((threshold) => !threshold.ok);
    const barClass = failed ? 'bar bar-fail' : 'bar';
    return `<text class="row-label" x="0" y="${y + 15}">${escapeHtml(row.label)}</text>` +
      `<rect class="${barClass}" x="${left}" y="${y}" width="${barWidth}" height="19" rx="3" />` +
      `<text class="bar-value" x="${Math.min(left + barWidth + 9, width - 46)}" y="${y + 15}">${formatNumber(row.value)} ms</text>`;
  }).join('');

  return `<svg class="chart" viewBox="0 0 ${width} ${chartHeight + 20}" role="img" aria-label="Latencia p95 por metrica">
    <title>Latencia p95 por metrica, em milissegundos</title>${grid}${bars}
  </svg>`;
}

function buildRateChart(metrics) {
  const candidates = [
    ['Checks aprovados', 'checks', false],
    ['Sucesso da API', 'qp_api_success_rate', false],
    ['Falhas HTTP', 'http_req_failed', true],
    ['Falhas HTTP browser', 'browser_http_req_failed', true],
  ];
  const rows = candidates
    .map(([label, name, isFailure]) => ({ label, metric: metrics[name], isFailure, rate: metricValue(metrics[name], 'rate') }))
    .filter((row) => row.rate !== null);

  if (rows.length === 0) {
    return '<p class="empty">Esta execucao nao produziu taxas de checks ou falhas.</p>';
  }

  const width = 880;
  const left = 166;
  const plotWidth = 625;
  const rowHeight = 42;
  const top = 24;
  const chartHeight = top + rows.length * rowHeight + 20;
  const grid = [0, 25, 50, 75, 100].map((tick) => {
    const x = left + plotWidth * tick / 100;
    return `<line class="grid-line" x1="${x}" y1="${top - 7}" x2="${x}" y2="${chartHeight - 8}" />` +
      `<text class="axis-label" x="${x}" y="${chartHeight + 8}" text-anchor="middle">${tick}%</text>`;
  }).join('');
  const bars = rows.map((row, index) => {
    const y = top + index * rowHeight;
    const percent = Math.max(0, Math.min(100, row.rate * 100));
    const failed = row.metric.thresholds && Object.values(row.metric.thresholds).some((threshold) => !threshold.ok);
    const barClass = row.isFailure || failed ? 'bar bar-fail' : 'bar';
    return `<text class="row-label" x="0" y="${y + 15}">${escapeHtml(row.label)}</text>` +
      `<rect class="${barClass}" x="${left}" y="${y}" width="${Math.max(2, plotWidth * percent / 100)}" height="19" rx="3" />` +
      `<text class="bar-value" x="${Math.min(left + plotWidth * percent / 100 + 9, width - 42)}" y="${y + 15}">${formatNumber(percent, 1)}%</text>`;
  }).join('');

  return `<svg class="chart" viewBox="0 0 ${width} ${chartHeight + 22}" role="img" aria-label="Checks e falhas">
    <title>Taxa de checks aprovados e falhas</title>${grid}${bars}
  </svg>`;
}

function buildThresholdRows(metrics) {
  const rows = [];
  Object.entries(metrics).forEach(([metricName, metric]) => {
    Object.entries(metric.thresholds || {}).forEach(([threshold, result]) => {
      rows.push(`<tr><td>${escapeHtml(metricName)}</td><td><code>${escapeHtml(threshold)}</code></td>` +
        `<td><span class="result ${result.ok ? 'result-pass' : 'result-fail'}">${result.ok ? 'PASSOU' : 'FALHOU'}</span></td></tr>`);
    });
  });

  if (rows.length === 0) {
    return '<p class="empty">Nenhum threshold foi configurado nesta execucao.</p>';
  }

  return `<div class="table-wrap"><table><thead><tr><th>Metrica</th><th>Threshold</th><th>Resultado</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

export function writeSummary(data) {
  const safeData = { ...data };
  delete safeData.setup_data;
  const json = JSON.stringify(safeData, null, 2);
  const metrics = safeData.metrics || {};
  const thresholds = Object.values(metrics).flatMap((metric) => Object.values(metric.thresholds || []));
  const failedThresholds = thresholds.filter((threshold) => !threshold.ok).length;
  const status = failedThresholds > 0 ? 'Thresholds excedidos' : 'Execucao concluida';
  const statusClass = failedThresholds > 0 ? 'status-fail' : 'status-pass';
  const checks = metricFor(metrics, ['checks']);
  const httpDuration = metricFor(metrics, ['http_req_duration', 'browser_http_req_duration']);
  const httpFailures = metricFor(metrics, ['http_req_failed', 'browser_http_req_failed']);
  const requestRate = metricFor(metrics, ['http_reqs', 'browser_http_reqs', 'iterations']);
  const durationSeconds = safeData.state && safeData.state.testRunDurationMs
    ? safeData.state.testRunDurationMs / 1000
    : null;
  const checkRate = metricValue(checks, 'rate');
  const failRate = metricValue(httpFailures, 'rate');
  const requestP95 = metricValue(httpDuration, 'p(95)');
  const requestsPerSecond = metricValue(requestRate, 'rate');
  const checkCount = checks ? (metricValue(checks, 'passes') || 0) + (metricValue(checks, 'fails') || 0) : 0;
  const requestCount = metricValue(requestRate, 'count');
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Resumo k6 QuickPizza</title>
  <style>
    :root { color-scheme: light; --ink: #18312d; --muted: #667b76; --line: #dce6e2; --paper: #f3f7f5; --panel: #fff; --green: #167c61; --green-soft: #e2f2ec; --red: #c34236; --red-soft: #fae9e6; --gold: #e0a22d; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.5 "Segoe UI", sans-serif; }
    main { max-width: 1180px; margin: 0 auto; padding: 34px 28px 56px; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 26px; }
    .eyebrow { margin: 0 0 7px; color: var(--green); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    h1 { margin: 0; font-size: 32px; line-height: 1.15; }
    .subhead { margin: 8px 0 0; color: var(--muted); }
    .status { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 4px; font-size: 13px; font-weight: 700; white-space: nowrap; }
    .status:before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .status-pass { color: var(--green); background: var(--green-soft); }
    .status-fail { color: var(--red); background: var(--red-soft); }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
    .card, .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 5px; }
    .card { min-height: 112px; padding: 16px 18px; }
    .card-label { display: block; color: var(--muted); font-size: 12px; font-weight: 650; }
    .card-value { display: block; margin-top: 10px; font-size: 25px; font-weight: 700; line-height: 1.15; }
    .card-note { display: block; margin-top: 5px; color: var(--muted); font-size: 12px; }
    .charts { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 14px; margin-bottom: 14px; }
    .panel { padding: 18px 20px; min-width: 0; }
    .panel h2 { margin: 0; font-size: 17px; }
    .panel-intro { margin: 4px 0 14px; color: var(--muted); font-size: 12px; }
    .chart { display: block; width: 100%; height: auto; overflow: visible; }
    .grid-line { stroke: var(--line); stroke-width: 1; }
    .axis-label { fill: var(--muted); font-size: 11px; }
    .row-label { fill: var(--ink); font-size: 12px; }
    .bar { fill: var(--green); }
    .bar-fail { fill: var(--red); }
    .bar-value { fill: var(--ink); font-size: 11px; font-weight: 700; }
    .empty { padding: 20px 0; color: var(--muted); }
    .thresholds { margin-bottom: 14px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid var(--line); }
    th { color: var(--muted); font-size: 11px; text-transform: uppercase; }
    code { color: #385850; font-size: 12px; }
    .result { display: inline-block; padding: 3px 7px; border-radius: 3px; font-size: 10px; font-weight: 800; }
    .result-pass { color: var(--green); background: var(--green-soft); }
    .result-fail { color: var(--red); background: var(--red-soft); }
    details { margin-top: 14px; }
    summary { color: var(--muted); cursor: pointer; font-weight: 650; }
    pre { max-height: 420px; overflow: auto; padding: 16px; background: #102622; color: #e0eee9; border-radius: 4px; font: 12px/1.5 Consolas, monospace; }
    footer { margin-top: 14px; color: var(--muted); font-size: 12px; }
    @media (max-width: 820px) { main { padding: 22px 16px 40px; } .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } .charts { grid-template-columns: 1fr; } }
    @media (max-width: 480px) { header { display: block; } .status { margin-top: 16px; } .cards { gap: 8px; } .card { padding: 13px; min-height: 100px; } .card-value { font-size: 21px; } .panel { padding: 15px 12px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div><p class="eyebrow">Grafana k6 / QuickPizza</p><h1>Resumo da execucao</h1><p class="subhead">Duracao: ${formatNumber(durationSeconds, 1)} s · ${formatNumber(requestCount)} requisicoes · ${formatNumber(requestsPerSecond, 2)} req/s</p></div>
      <span class="status ${statusClass}">${status}</span>
    </header>
    <section class="cards" aria-label="Indicadores principais">
      <article class="card"><span class="card-label">Latencia p95</span><strong class="card-value">${formatNumber(requestP95)} ms</strong><span class="card-note">HTTP ou browser, conforme a execucao</span></article>
      <article class="card"><span class="card-label">Checks aprovados</span><strong class="card-value">${checkRate === null ? 'N/A' : `${formatNumber(checkRate * 100, 1)}%`}</strong><span class="card-note">${formatNumber(checkCount)} verificacoes</span></article>
      <article class="card"><span class="card-label">Falhas HTTP</span><strong class="card-value">${failRate === null ? 'N/A' : `${formatNumber(failRate * 100, 2)}%`}</strong><span class="card-note">Requests considerados falhos</span></article>
      <article class="card"><span class="card-label">Iteracoes por segundo</span><strong class="card-value">${formatNumber(metricValue(metrics.iterations, 'rate'), 2)}</strong><span class="card-note">${formatNumber(metricValue(metrics.iterations, 'count'))} iteracoes completadas</span></article>
    </section>
    <section class="charts">
      <article class="panel"><h2>Latencia p95</h2><p class="panel-intro">Comparacao por metrica, em milissegundos. Barras vermelhas indicam threshold excedido.</p>${buildLatencyChart(metrics)}</article>
      <article class="panel"><h2>Sucesso e falhas</h2><p class="panel-intro">Percentual observado no conjunto de checks e requisicoes.</p>${buildRateChart(metrics)}</article>
    </section>
    <section class="panel thresholds"><h2>Thresholds</h2><p class="panel-intro">${failedThresholds} de ${thresholds.length} thresholds excedidos.</p>${buildThresholdRows(metrics)}</section>
    <details><summary>Dados brutos do k6</summary><pre>${escapeHtml(json)}</pre></details>
    <footer>Relatorio local autocontido. Nenhum recurso externo e carregado.</footer>
  </main>
</body>
</html>`;

  return {
    'results/summary.json': json,
    'results/summary.html': html,
    stdout: `${json}\n`,
  };
}