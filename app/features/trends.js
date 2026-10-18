(function () {
  // Вкладка Trends: график формы (ELO или баланс побед) и тепловая карта «когда ты играешь лучше».
  // Данные берутся из истории матчей, которую уже загружает SidebarManager (/api/history).

  const RANGES = [
    { label: "Last 50", size: 50 },
    { label: "Last 100", size: 100 },
    { label: "Last 200", size: 200 },
    { label: "All", size: Infinity },
  ];
  const DEFAULT_RANGE = 1;

  // Минимальный ELO каждого уровня FACEIT CS2 (как в rendering.js)
  const LEVEL_MIN_ELO = [
    100, 501, 751, 901, 1051, 1201, 1351, 1531, 1751, 2001,
  ];

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const NARROW_WIDTH = 560; // уже этой ширины контейнера используем компактную раскладку
  const MIN_SLOT_MATCHES = 10; // сколько матчей нужно, чтобы окно попало в выводы
  const MIN_DAY_MATCHES = 15;

  let renderToken = 0;

  // ---------- данные ----------

  function readElo(item) {
    const raw = item?.elo;
    const candidates = [
      raw && typeof raw === "object" ? raw.current : raw,
      raw && typeof raw === "object" ? raw.after : undefined,
      item?.elo_after,
      item?.eloAfter,
    ];
    for (const value of candidates) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }

  // true = победа, false = поражение, null = не удалось определить
  function readResult(item, playerId) {
    const winner = item?.results?.winner;
    if (winner !== "faction1" && winner !== "faction2") return null;
    const inTeam = (key) =>
      (item?.teams?.[key]?.players || []).some((p) => p.player_id === playerId);
    const inFirst = inTeam("faction1");
    const inSecond = inTeam("faction2");
    if (!inFirst && !inSecond) return null;
    return winner === "faction1" ? inFirst : inSecond;
  }

  // Хронологический список матчей: { t, win, elo }
  function buildPoints(items, playerId) {
    return items
      .map((item) => ({
        t: Number(item?.finished_at) * 1000,
        win: readResult(item, playerId),
        elo: readElo(item),
      }))
      .filter((p) => Number.isFinite(p.t) && p.t > 0)
      .sort((a, b) => a.t - b.t);
  }

  async function ensureHistory(manager, playerId) {
    if (
      !manager.allHistoryItems?.length ||
      manager.historyPlayerId !== playerId
    ) {
      await manager.showMatchesStats(false);
    }
    return manager.historyPlayerId === playerId ? manager.allHistoryItems : [];
  }

  // ---------- форматирование ----------

  const fmtDate = (t) =>
    new Date(t).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });

  function winRateColor(rate) {
    const clamped = Math.min(Math.max(rate, 25), 75);
    const hue = Math.round(((clamped - 25) / 50) * 125);
    return `${hue} 75% 48%`;
  }

  const pad2 = (n) => String(n).padStart(2, "0");
  const slotLabel = (slot, hours) =>
    `${pad2(slot * hours)}-${pad2((slot + 1) * hours)}`;

  // ---------- сводка и график ----------

  function summarize(points, useElo) {
    const known = points.filter((p) => p.win !== null);
    const wins = known.filter((p) => p.win).length;
    const winRate = known.length
      ? Math.round((wins / known.length) * 100)
      : null;

    let current = { type: "-", count: 0 };
    for (let i = known.length - 1; i >= 0; i--) {
      const type = known[i].win ? "+" : "-";
      if (current.count === 0) current = { type, count: 1 };
      else if (current.type === type) current.count++;
      else break;
    }

    let bestStreak = 0;
    let run = 0;
    for (const p of known) {
      run = p.win ? run + 1 : 0;
      bestStreak = Math.max(bestStreak, run);
    }

    const result = { matches: points.length, winRate, current, bestStreak };
    if (useElo) {
      const withElo = points.filter((p) => p.elo !== null);
      if (withElo.length) {
        result.eloChange = withElo[withElo.length - 1].elo - withElo[0].elo;
        result.peak = Math.max(...withElo.map((p) => p.elo));
      }
    } else {
      result.net = wins - (known.length - wins);
    }
    return result;
  }

  function niceTicks(min, max, count) {
    const step = (max - min) / count;
    const magnitude = Math.pow(10, Math.floor(Math.log10(step || 1)));
    const nice = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= step);
    const first = Math.ceil(min / nice) * nice;
    const ticks = [];
    for (let v = first; v <= max; v += nice) ticks.push(v);
    return ticks;
  }

  function renderChart(points, useElo, narrow, width) {
    const series = useElo
      ? points.filter((p) => p.elo !== null)
      : points.filter((p) => p.win !== null);
    if (series.length < 2) {
      return {
        html: `<p class="trends-empty">Not enough matches to draw a chart.</p>`,
        points: [],
      };
    }

    let values;
    if (useElo) {
      values = series.map((p) => p.elo);
    } else {
      let net = 0;
      values = series.map((p) => (net += p.win ? 1 : -1));
    }

    const W = narrow ? Math.max(300, width) : 800;
    const H = narrow ? 230 : 260;
    const L = narrow ? 40 : 52;
    const R = narrow ? 40 : 52;
    const T = 14;
    const B = 28;
    const innerW = W - L - R;
    const innerH = H - T - B;

    let min = Math.min(...values);
    let max = Math.max(...values);
    if (!useElo) {
      min = Math.min(min, 0);
      max = Math.max(max, 0);
    }
    const span = max - min || 10;
    const yMin = min - span * 0.12;
    const yMax = max + span * 0.12;

    const x = (i) => L + (i * innerW) / (series.length - 1);
    const y = (v) => T + innerH * (1 - (v - yMin) / (yMax - yMin));

    const line = values
      .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
    const area = `${line} L${x(series.length - 1).toFixed(1)} ${H - B} L${L} ${H - B} Z`;

    const ticks = niceTicks(yMin, yMax, 4)
      .map(
        (v) => `
        <line class="tc-grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"></line>
        <text class="tc-label" x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${Math.round(v)}</text>`,
      )
      .join("");

    let marks = "";
    if (useElo) {
      LEVEL_MIN_ELO.forEach((minElo, i) => {
        if (i === 0 || minElo <= yMin || minElo >= yMax) return;
        marks += `
          <line class="tc-level" x1="${L}" x2="${W - R}" y1="${y(minElo).toFixed(1)}" y2="${y(minElo).toFixed(1)}"></line>
          <text class="tc-level-label" x="${W - R + 5}" y="${(y(minElo) + 3).toFixed(1)}" text-anchor="start">LVL ${i + 1}</text>`;
      });
    } else {
      marks = `<line class="tc-zero" x1="${L}" x2="${W - R}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"></line>`;
    }

    const points_ = series.map((p, i) => ({
      x: x(i),
      y: y(values[i]),
      t: p.t,
      win: p.win,
      value: values[i],
      delta: useElo && i > 0 ? values[i] - values[i - 1] : null,
    }));

    const showDots = series.length <= (narrow ? 80 : 150);
    const dots = showDots
      ? points_
          .map((p, i) => {
            const cls =
              p.win === null
                ? "tc-dot"
                : p.win
                  ? "tc-dot tc-dot-w"
                  : "tc-dot tc-dot-l";
            return `<circle class="${cls}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.2"></circle>`;
          })
          .join("")
      : "";

    const mid = Math.floor((series.length - 1) / 2);
    const xLabels = [
      [0, "start"],
      [mid, "middle"],
      [series.length - 1, "end"],
    ]
      .map(
        ([i, anchor]) =>
          `<text class="tc-label" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${anchor}">${fmtDate(series[i].t)}</text>`,
      )
      .join("");

    const html = `
      <div class="trend-chart-wrap">
        <svg class="trend-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${useElo ? "ELO over the selected matches" : "Net wins over the selected matches"}">
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ff5500" stop-opacity="0.35"></stop>
              <stop offset="100%" stop-color="#ff5500" stop-opacity="0"></stop>
            </linearGradient>
          </defs>
          ${ticks}${marks}
          <path class="tc-area" d="${area}"></path>
          <path class="tc-line" d="${line}"></path>
          ${dots}
          <line class="tc-hover-line" x1="0" x2="0" y1="${T}" y2="${H - B}"></line>
          <circle class="tc-hover-dot" cx="0" cy="0" r="6"></circle>
          ${xLabels}
        </svg>
        <div class="trend-tip" role="status"></div>
      </div>`;

    return { html, points: points_, geom: { W, H, L, R, T, B, useElo } };
  }

  // ---------- своя подсказка при наведении ----------

  const fmtDateTime = (t) =>
    new Date(t).toLocaleString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  function tipHtml(p, index, total, useElo) {
    const badge =
      p.win === null
        ? ""
        : `<span class="trend-tip-badge ${p.win ? "win" : "loss"}">${p.win ? "Win" : "Loss"}</span>`;
    const valueLabel = useElo
      ? `${p.value} ELO`
      : `Net ${p.value > 0 ? "+" : ""}${p.value}`;
    const delta =
      p.delta === null || p.delta === 0
        ? ""
        : `<span class="trend-tip-delta ${p.delta > 0 ? "up" : "down"}">${p.delta > 0 ? "+" : ""}${p.delta}</span>`;
    return `
      <div class="trend-tip-date">${fmtDateTime(p.t)}</div>
      <div class="trend-tip-main">${badge}<span class="trend-tip-value">${valueLabel}</span>${delta}</div>
      <div class="trend-tip-meta">Match ${index + 1} of ${total}</div>`;
  }

  // Наведение работает по всей ширине графика: подсказка привязывается к ближайшей точке
  function bindChartHover(container, chart) {
    if (!chart.points.length) return;
    const wrap = container.querySelector(".trend-chart-wrap");
    const svg = wrap?.querySelector(".trend-chart");
    const tip = wrap?.querySelector(".trend-tip");
    const line = svg?.querySelector(".tc-hover-line");
    const dot = svg?.querySelector(".tc-hover-dot");
    if (!wrap || !svg || !tip || !line || !dot) return;

    const { W, L, R, useElo } = chart.geom;
    const points = chart.points;
    const step = (W - L - R) / (points.length - 1);

    const hide = () => {
      tip.classList.remove("show");
      line.classList.remove("show");
      dot.classList.remove("show");
    };

    const show = (event) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      const scale = rect.width / W;
      const index = Math.min(
        Math.max(
          Math.round(((event.clientX - rect.left) / scale - L) / step),
          0,
        ),
        points.length - 1,
      );
      const p = points[index];

      line.setAttribute("x1", p.x.toFixed(1));
      line.setAttribute("x2", p.x.toFixed(1));
      dot.setAttribute("cx", p.x.toFixed(1));
      dot.setAttribute("cy", p.y.toFixed(1));
      dot.setAttribute(
        "class",
        `tc-hover-dot show${p.win === null ? "" : p.win ? " win" : " loss"}`,
      );
      line.classList.add("show");

      tip.innerHTML = tipHtml(p, index, points.length, useElo);
      tip.classList.add("show");

      const wrapRect = wrap.getBoundingClientRect();
      const px = p.x * scale + (rect.left - wrapRect.left);
      const py = p.y * scale + (rect.top - wrapRect.top);
      const tipW = tip.offsetWidth;
      const tipH = tip.offsetHeight;
      const left = Math.min(
        Math.max(px - tipW / 2, 4),
        Math.max(wrapRect.width - tipW - 4, 4),
      );
      const above = py - tipH - 16 >= 0;
      tip.style.left = `${left}px`;
      tip.style.top = `${above ? py - tipH - 16 : py + 18}px`;
    };

    svg.addEventListener("pointermove", show);
    svg.addEventListener("pointerdown", show);
    svg.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "touch") hide();
    });
    svg.addEventListener("pointercancel", hide);

    const onOutside = (event) => {
      if (!wrap.isConnected) {
        document.removeEventListener("pointerdown", onOutside);
        return;
      }
      if (!wrap.contains(event.target)) hide();
    };
    document.addEventListener("pointerdown", onOutside);
  }

  function renderStats(summary, useElo) {
    const signed = (n) => (n > 0 ? `+${n}` : String(n));
    const rateClass =
      summary.winRate === null
        ? ""
        : summary.winRate < 40
          ? "wr-poor"
          : summary.winRate < 55
            ? "wr-avg"
            : "wr-good";
    const streak =
      summary.current.count > 0
        ? `${summary.current.type}${summary.current.count}`
        : "-";
    const streakClass =
      summary.current.type === "W"
        ? "wr-good"
        : summary.current.type === "L"
          ? "wr-poor"
          : "";

    const tiles = [
      { value: summary.matches, label: "Matches" },
      {
        value: summary.winRate === null ? "-" : `${summary.winRate}%`,
        label: "Win rate",
        cls: rateClass,
      },
      { value: streak, label: "Current streak", cls: streakClass },
      { value: summary.bestStreak, label: "Best win streak" },
    ];
    if (useElo && summary.eloChange !== undefined) {
      tiles.push({
        value: signed(summary.eloChange),
        label: "ELO change",
        cls: summary.eloChange >= 0 ? "wr-good" : "wr-poor",
      });
      tiles.push({ value: summary.peak, label: "Peak ELO" });
    } else if (!useElo) {
      tiles.push({
        value: signed(summary.net),
        label: "Net wins",
        cls: summary.net >= 0 ? "wr-good" : "wr-poor",
      });
    }

    return tiles
      .map(
        (t) => `
        <div class="trends-stat">
          <span class="trends-stat-value ${t.cls || ""}">${t.value}</span>
          <span class="trends-stat-label">${t.label}</span>
        </div>`,
      )
      .join("");
  }

  // ---------- тепловая карта ----------

  function buildHeatmap(points, hours) {
    const slots = 24 / hours;
    const grid = Array.from({ length: 7 }, () =>
      Array.from({ length: slots }, () => ({ n: 0, w: 0 })),
    );
    let used = 0;
    for (const p of points) {
      if (p.win === null) continue;
      const date = new Date(p.t);
      const day = (date.getDay() + 6) % 7; // понедельник = 0
      const slot = Math.floor(date.getHours() / hours);
      grid[day][slot].n++;
      if (p.win) grid[day][slot].w++;
      used++;
    }
    return { grid, used };
  }

  function aggregate(cells) {
    return cells.reduce((acc, c) => ({ n: acc.n + c.n, w: acc.w + c.w }), {
      n: 0,
      w: 0,
    });
  }

  function renderInsights(grid, hours) {
    const slots = Array.from({ length: 24 / hours }, (_, s) => ({
      label: `${slotLabel(s, hours).replace("-", ":00 - ")}:00`,
      ...aggregate(grid.map((row) => row[s])),
    }));
    const days = DAYS.map((label, d) => ({ label, ...aggregate(grid[d]) }));
    const rate = (e) => e.w / e.n;
    const pick = (list, min, best) => {
      const ok = list.filter((e) => e.n >= min);
      if (!ok.length) return null;
      return ok.reduce((a, b) =>
        best ? (rate(b) > rate(a) ? b : a) : rate(b) < rate(a) ? b : a,
      );
    };
    const busiest = [...slots].sort((a, b) => b.n - a.n)[0];

    const describe = (e) =>
      e
        ? `<b>${e.label}</b><span>${Math.round(rate(e) * 100)}% win rate - ${e.n} matches</span>`
        : `<b>-</b><span>Not enough matches yet</span>`;

    const cards = [
      {
        title: "Best time",
        body: describe(pick(slots, MIN_SLOT_MATCHES, true)),
      },
      {
        title: "Worst time",
        body: describe(pick(slots, MIN_SLOT_MATCHES, false)),
      },
      { title: "Best day", body: describe(pick(days, MIN_DAY_MATCHES, true)) },
      {
        title: "Most active",
        body:
          busiest && busiest.n
            ? `<b>${busiest.label}</b><span>${busiest.n} matches</span>`
            : `<b>-</b><span>No data</span>`,
      },
    ];

    return cards
      .map(
        (c) => `<div class="trends-insight"><em>${c.title}</em>${c.body}</div>`,
      )
      .join("");
  }

  function renderHeatmap(points, hours) {
    const slotCount = 24 / hours;
    const { grid, used } = buildHeatmap(points, hours);
    if (used < 20) {
      return `<p class="trends-empty">Need at least 20 matches with known results to build the activity map.</p>`;
    }

    const maxN = Math.max(...grid.flat().map((c) => c.n), 1);
    const head = Array.from(
      { length: slotCount },
      (_, s) => `<div class="heat-head">${slotLabel(s, hours)}</div>`,
    ).join("");

    const rows = DAYS.map((day, d) => {
      const cells = grid[d]
        .map((cell, s) => {
          if (!cell.n) return `<div class="heat-cell heat-empty"></div>`;
          const rate = Math.round((cell.w / cell.n) * 100);
          const alpha = (0.22 + 0.68 * Math.min(1, cell.n / maxN)).toFixed(2);
          const title = `${day} ${slotLabel(s, hours)}: ${rate}% win rate (${cell.n} matches)`;
          const label = cell.n >= 3 ? `${rate}%` : "";
          return `<div class="heat-cell" style="background: hsl(${winRateColor(rate)} / ${alpha});" title="${title}">${label}<small>${cell.n}</small></div>`;
        })
        .join("");
      return `<div class="heat-day">${day}</div>${cells}`;
    }).join("");

    let timezone = "";
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      /* ignore */
    }

    return `
      <div class="heat-scroll">
        <div class="heat" style="--slots: ${slotCount};"><div></div>${head}${rows}</div>
      </div>
      <div class="trends-insights">${renderInsights(grid, hours)}</div>
      <p class="trends-note">Win rate by ${hours}-hour window in your local time${timezone ? ` (${timezone})` : ""}. Brighter cells mean more matches; green is above 50%, red is below.</p>`;
  }

  // ---------- вкладка ----------

  function shell(inner) {
    return `<div class="trends">${inner}</div>`;
  }

  async function render(container, manager) {
    const token = ++renderToken;
    const playerId = window.currentPlayerData?.player_id;
    if (!container || !manager || !playerId) return;

    container.innerHTML = shell(
      `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading match history...</div>`,
    );

    let items = [];
    try {
      items = await ensureHistory(manager, playerId);
    } catch (error) {
      items = [];
    }

    // пользователь успел сменить вкладку или игрока
    if (
      token !== renderToken ||
      !container.isConnected ||
      manager.currentView !== "trends"
    )
      return;

    const points = buildPoints(items, playerId);
    if (!points.length) {
      container.innerHTML = shell(
        `<p class="api-error-text">No match history available for this player.</p>`,
      );
      return;
    }

    const known = points.filter((p) => p.win !== null).length;
    const withElo = points.filter((p) => p.elo !== null).length;
    const useElo = withElo >= 10 && withElo >= points.length * 0.6;

    let rangeIndex = DEFAULT_RANGE;
    const isNarrow = () =>
      container.clientWidth > 0 && container.clientWidth < NARROW_WIDTH;
    let narrow = isNarrow();

    const draw = () => {
      narrow = isNarrow();
      const size = RANGES[rangeIndex].size;
      const slice = Number.isFinite(size) ? points.slice(-size) : points;
      const summary = summarize(slice, useElo);
      const chart = renderChart(
        slice,
        useElo,
        narrow,
        container.clientWidth - 32,
      );

      const chips = RANGES.map(
        (r, i) =>
          `<button type="button" class="trends-range${i === rangeIndex ? " active" : ""}" data-range="${i}">${r.label}</button>`,
      ).join("");

      const note = useElo
        ? ""
        : `<p class="trends-note">Per-match ELO is not available in the match history, so the chart shows net wins (wins minus losses).</p>`;
      const unknown =
        known < points.length
          ? `<p class="trends-note">${points.length - known} matches without a known result are skipped.</p>`
          : "";

      container.innerHTML = shell(`
        <div class="trends-card">
          <div class="trends-card-header">
            <i class="fas fa-chart-line"></i>
            <span>${useElo ? "ELO trend" : "Form trend"}</span>
            <div class="trends-ranges">${chips}</div>
          </div>
          <div class="trends-stats">${renderStats(summary, useElo)}</div>
          ${chart.html}
          ${note}${unknown}
        </div>
        <div class="trends-card">
          <div class="trends-card-header">
            <i class="fas fa-fire"></i>
            <span>When you play best</span>
          </div>
          ${renderHeatmap(points, narrow ? 4 : 3)}
        </div>`);

      bindChartHover(container, chart);

      container.querySelectorAll(".trends-range").forEach((btn) => {
        btn.addEventListener("click", () => {
          rangeIndex = Number(btn.dataset.range);
          draw();
        });
      });
    };

    draw();

    // при повороте экрана или изменении окна перерисовываем, если сменилась раскладка
    const onResize = () => {
      if (!container.isConnected || manager.currentView !== "trends") {
        window.removeEventListener("resize", onResize);
        return;
      }
      if (isNarrow() !== narrow) draw();
    };
    window.addEventListener("resize", onResize);
  }

  window.AppTrends = { render };
})();
