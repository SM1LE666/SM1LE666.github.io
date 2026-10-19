(function () {
  const RANGES = [
    { label: "Last 50", size: 50 },
    { label: "Last 100", size: 100 },
    { label: "Last 200", size: 200 },
    { label: "All", size: Infinity },
  ];
  const DEFAULT_RANGE = 1;

  const LEVEL_MIN_ELO = [
    100, 501, 751, 901, 1051, 1201, 1351, 1531, 1751, 2001,
  ];

  // Настройте путь к SVG-иконкам уровней под ваш проект
  const LEVEL_ICON_PATH = (level) => `/images/levels/lvl${level}.svg`;

  function getFaceitLevel(elo) {
    const val = Number(elo) || 0;
    let lvl = 1;
    LEVEL_MIN_ELO.forEach((min, i) => {
      if (val >= min) lvl = i + 1;
    });
    return Math.min(Math.max(lvl, 1), 10);
  }

  function renderLevelIcon(elo, size = 18) {
    const lvl = getFaceitLevel(elo);
    return `<img src="${LEVEL_ICON_PATH(lvl)}" alt="Lvl ${lvl}" width="${size}" height="${size}" style="vertical-align: middle; display: inline-block; object-fit: contain;" />`;
  }

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const NARROW_WIDTH = 560;
  const MIN_SLOT_MATCHES = 10;
  const MIN_DAY_MATCHES = 15;

  let renderToken = 0;
  const eloCache = {};

  async function loadEloMap(playerId) {
    if (eloCache[playerId]) return eloCache[playerId];
    const map = new Map();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(
        `/api/elo-history?playerId=${encodeURIComponent(playerId)}`,
        { headers: { Accept: "application/json" }, signal: controller.signal },
      );
      clearTimeout(timer);
      if (response.ok) {
        const data = await response.json();
        for (const entry of data?.items || []) {
          const elo = Number(entry?.elo);
          if (entry?.matchId && Number.isFinite(elo) && elo > 0) {
            map.set(String(entry.matchId), elo);
          }
        }
      }
    } catch {}
    if (map.size) eloCache[playerId] = map;
    return map;
  }

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

  function buildPoints(items, playerId, eloMap, baseElo) {
    const rawPoints = items
      .map((item) => ({
        matchId: String(item?.match_id || item?.matchId || ""),
        t: Number(item?.finished_at) * 1000,
        win: readResult(item, playerId),
        elo: readElo(item) ?? eloMap?.get(String(item?.match_id)) ?? null,
      }))
      .filter((p) => Number.isFinite(p.t) && p.t > 0)
      .sort((a, b) => a.t - b.t);

    const missingEloCount = rawPoints.filter(
      (p) => p.elo === null && p.win !== null,
    ).length;
    if (missingEloCount > 0 && Number.isFinite(baseElo) && baseElo > 0) {
      let currentRunningElo = baseElo;
      for (let i = rawPoints.length - 1; i >= 0; i--) {
        const p = rawPoints[i];
        if (p.elo === null) {
          p.elo = currentRunningElo;
        }
        if (p.win !== null) {
          currentRunningElo += p.win ? -25 : 25;
        }
      }
    }

    return rawPoints;
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

  const fmtDate = (t) =>
    new Date(t).toLocaleDateString(undefined, {
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

  function summarize(points, useElo) {
    const known = points.filter((p) => p.win !== null);
    const wins = known.filter((p) => p.win).length;
    const winRate = known.length
      ? Math.round((wins / known.length) * 100)
      : null;

    let current = { type: "-", count: 0 };
    for (let i = known.length - 1; i >= 0; i--) {
      const type = known[i].win ? "W" : "L";
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
    const series = points.filter((p) => p.elo !== null);
    if (series.length < 2) {
      return {
        html: `<p class="trends-empty">Not enough matches to draw a chart.</p>`,
        points: [],
      };
    }

    const values = series.map((p) => p.elo);
    const W = narrow ? Math.max(300, width) : 800;
    const H = narrow ? 230 : 260;
    const L = narrow ? 40 : 52;
    const R = narrow ? 40 : 52;
    const T = 14;
    const B = 28;
    const innerW = W - L - R;
    const innerH = H - T - B;

    const min = Math.min(...values);
    const max = Math.max(...values);
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
    LEVEL_MIN_ELO.forEach((minElo, i) => {
      if (minElo <= yMin || minElo >= yMax) return;
      marks += `
        <line class="tc-level" x1="${L}" x2="${W - R}" y1="${y(minElo).toFixed(1)}" y2="${y(minElo).toFixed(1)}"></line>
        <text class="tc-level-label" x="${W - R + 5}" y="${(y(minElo) + 3).toFixed(1)}" text-anchor="start">LVL ${i + 1}</text>`;
    });

    const points_ = series.map((p, i) => ({
      x: x(i),
      y: y(values[i]),
      t: p.t,
      win: p.win,
      value: values[i],
      delta: i > 0 ? values[i] - values[i - 1] : null,
    }));

    const showDots = series.length <= (narrow ? 80 : 150);
    const dots = showDots
      ? points_
          .map((p) => {
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
        <svg class="trend-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="ELO trend chart">
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

    return { html, points: points_, geom: { W, H, L, R, T, B } };
  }

  const fmtDateTime = (t) =>
    new Date(t).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  function tipHtml(p, index, total) {
    const badge =
      p.win === null
        ? ""
        : `<span class="trend-tip-badge ${p.win ? "win" : "loss"}">${p.win ? "Win" : "Loss"}</span>`;

    // Добавляем иконку уровня FACEIT прямо в тултип рядом с ELO
    const lvlIcon = renderLevelIcon(p.value, 16);
    const valueLabel = `ELO: ${Math.round(p.value)} ${lvlIcon}`;

    const delta =
      p.delta === null || p.delta === 0
        ? ""
        : `<span class="trend-tip-delta ${p.delta > 0 ? "up" : "down"}">${p.delta > 0 ? "+" : ""}${p.delta} ELO</span>`;
    return `
      <div class="trend-tip-date">${fmtDateTime(p.t)}</div>
      <div class="trend-tip-main">${badge}<span class="trend-tip-value">${valueLabel}</span>${delta}</div>
      <div class="trend-tip-meta">Match ${index + 1} of ${total}</div>`;
  }

  function bindChartHover(container, chart) {
    if (!chart.points.length) return;
    const wrap = container.querySelector(".trend-chart-wrap");
    const svg = wrap?.querySelector(".trend-chart");
    const tip = wrap?.querySelector(".trend-tip");
    const line = svg?.querySelector(".tc-hover-line");
    const dot = svg?.querySelector(".tc-hover-dot");
    if (!wrap || !svg || !tip || !line || !dot) return;

    const { W, L, R } = chart.geom;
    const points = chart.points;
    const step = (W - L - R) / (points.length - 1 || 1);

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

      tip.innerHTML = tipHtml(p, index, points.length);
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
  }

  function renderStats(summary) {
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
    if (summary.eloChange !== undefined) {
      tiles.push({
        value: signed(summary.eloChange),
        label: "ELO change",
        cls: summary.eloChange >= 0 ? "wr-good" : "wr-poor",
      });
      tiles.push({ value: Math.round(summary.peak), label: "Peak ELO" });
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

  function buildHeatmap(points, hours) {
    const slots = 24 / hours;
    const grid = Array.from({ length: 7 }, () =>
      Array.from({ length: slots }, () => ({ n: 0, w: 0 })),
    );
    let used = 0;
    for (const p of points) {
      if (p.win === null) continue;
      const date = new Date(p.t);
      const day = (date.getDay() + 6) % 7;
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
    } catch {}

    return `
      <div class="heat-scroll">
        <div class="heat" style="--slots: ${slotCount};"><div></div>${head}${rows}</div>
      </div>
      <div class="trends-insights">${renderInsights(grid, hours)}</div>
      <p class="trends-note">Win rate by ${hours}-hour window in your local time${timezone ? ` (${timezone})` : ""}.</p>`;
  }

  function shell(inner) {
    return `<div class="trends">${inner}</div>`;
  }

  async function render(container, manager) {
    const token = ++renderToken;
    const playerData = window.currentPlayerData;
    const playerId = playerData?.player_id;
    if (!container || !manager || !playerId) return;

    container.innerHTML = shell(
      `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading match history and ELO...</div>`,
    );

    let items = [];
    let eloMap = new Map();
    try {
      [items, eloMap] = await Promise.all([
        ensureHistory(manager, playerId),
        loadEloMap(playerId),
      ]);
    } catch {
      items = [];
    }

    if (
      token !== renderToken ||
      !container.isConnected ||
      manager.currentView !== "trends"
    )
      return;

    const baseElo = Number(
      playerData?.games?.cs2?.faceit_elo ||
        window.currentPlayerProfile?.currentElo ||
        1000,
    );

    const points = buildPoints(items, playerId, eloMap, baseElo);
    if (!points.length) {
      container.innerHTML = shell(
        `<p class="api-error-text">No match history available for this player.</p>`,
      );
      return;
    }

    const known = points.filter((p) => p.win !== null).length;
    let rangeIndex = DEFAULT_RANGE;
    const isNarrow = () =>
      container.clientWidth > 0 && container.clientWidth < NARROW_WIDTH;
    let narrow = isNarrow();

    const draw = () => {
      narrow = isNarrow();
      const size = RANGES[rangeIndex].size;
      const slice = Number.isFinite(size) ? points.slice(-size) : points;

      const summary = summarize(slice, true);
      const chart = renderChart(
        slice,
        true,
        narrow,
        container.clientWidth - 32,
      );

      const chips = RANGES.map(
        (r, i) =>
          `<button type="button" class="trends-range${i === rangeIndex ? " active" : ""}" data-range="${i}">${r.label}</button>`,
      ).join("");

      const unknown =
        known < points.length
          ? `<p class="trends-note">${points.length - known} matches without a known result are skipped.</p>`
          : "";

      container.innerHTML = shell(`
        <div class="trends-card">
          <div class="trends-card-header">
            <i class="fas fa-chart-line"></i>
            <span>ELO trend</span>
            <div class="trends-ranges">${chips}</div>
          </div>
          <div class="trends-stats">${renderStats(summary)}</div>
          ${chart.html}
          ${unknown}
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
