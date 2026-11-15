(function () {
  function formatNumber(value) {
    const formatter = window.FaceitAPI?.formatNumber?.bind(window.FaceitAPI);
    return formatter ? formatter(value) : String(value);
  }

  function formatStatRow(text) {
    const idx = text.indexOf(":");
    if (idx === -1) {
      return `<span class="stat-row-full">${text}</span>`;
    }
    const label = text.slice(0, idx + 1).trim();
    const value = text.slice(idx + 1).trim();
    return `<span class="stat-row-label">${label}</span><span class="stat-row-value">${value}</span>`;
  }

  // Цвет рейтинга винрейта (те же пороги, что на вкладке Maps)
  function winRateClass(winRate) {
    if (winRate < 40) return "wr-poor";
    if (winRate < 55) return "wr-avg";
    return "wr-good";
  }

  // "de_Nuke" / "Dust 2" -> "nuke" / "dust_2": ключ для фона карты
  function normalizeMapKey(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/^de_/, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  function renderMapBox(map) {
    if (!map) return `<p>Not enough data</p>`;
    const winRate = Number(map.winRate) || 0;

    return `
      <p class="stat-row">${formatStatRow(`Map: ${map.name}`)}</p>
      <p class="stat-row">${formatStatRow(`Matches: ${map.matches}`)}</p>
      <p class="stat-row"><span class="stat-row-label">Win Rate:</span><span class="stat-row-value ${winRateClass(winRate)}">${winRate.toFixed(1)}%</span></p>
      <p class="stat-row">${formatStatRow(`K/D: ${map.kd.toFixed(2)}`)}</p>
      <p class="stat-row">${formatStatRow(`Headshots: ${map.hs.toFixed(1)}%`)}</p>
    `;
  }

  // Оценка HLTV-метрики 0 - 100: четыре уровня
  function getScoreRating(value) {
    if (value < 40) return { text: "Weak", class: "poor" };
    if (value < 60) return { text: "Average", class: "okay" };
    if (value < 80) return { text: "Good", class: "good" };
    return { text: "Elite", class: "elite" };
  }

  // Плавный цвет от красного (0) к зелёному (100)
  function getScoreColor(value) {
    const v = Math.min(Math.max(Number(value) || 0, 0), 100);
    return `hsl(${Math.round(v * 1.25)} 85% 52%)`;
  }

  // Пороги уровней FACEIT CS2 (минимальный ELO каждого уровня)
  const FACEIT_LEVEL_MIN_ELO = [100, 501, 751, 901, 1051, 1201, 1351, 1531, 1751, 2001];

  function getEloProgress(elo) {
    const value = Number(elo) || 0;
    if (value <= 0) return null;

    let idx = 0;
    FACEIT_LEVEL_MIN_ELO.forEach((min, i) => {
      if (value >= min) idx = i;
    });

    if (idx === FACEIT_LEVEL_MIN_ELO.length - 1) {
      return { pct: 100, text: "Max level reached" };
    }

    const from = FACEIT_LEVEL_MIN_ELO[idx];
    const to = FACEIT_LEVEL_MIN_ELO[idx + 1];
    const pct = Math.min(Math.max(Math.round(((value - from) / (to - from)) * 100), 0), 100);
    return { pct, text: `${formatNumber(to - value)} ELO to Level ${idx + 2}` };
  }

  // Нормализатор метрик под шкалу 0-100%
  function normalizeMetric(type, rawValue) {
    const val = parseFloat(rawValue) || 0;

    switch (type) {
      case "winrate":
      case "hs":
        return Math.min(Math.max(Math.round(val), 0), 100);

      case "kd":
        const kdNormalized = ((val - 0.6) / 0.9) * 100;
        return Math.min(Math.max(Math.round(kdNormalized), 0), 100);

      case "avgKills":
        const killsNormalized = ((val - 10) / 12) * 100;
        return Math.min(Math.max(Math.round(killsNormalized), 0), 100);

      default:
        return Math.min(Math.max(Math.round(val), 0), 100);
    }
  }

  // ---- Clutching -------------------------------------------------------
  // Калибровочные константы: уровень «среднего» игрока, которому соответствует 50 баллов.
  // Подбираются по реальным данным (см. комментарий в computeClutchScore).
  const CLUTCH_REF_WEIGHTED = 1.5; // взвешенные клатчи за матч (1v1×1 … 1v5×5)
  const CLUTCH_REF_TOTAL = 0.9; // выигранные клатчи за матч, когда нет разбивки по 1vX
  const CLUTCH_FULL_CONFIDENCE_MATCHES = 30; // при меньшем числе матчей оценка сжимается к 50
  const CLUTCH_KEYS = [
    "Total 1v1 Wins",
    "Total 1v2 Wins",
    "Total 1v3 Wins",
    "Total 1v4 Wins",
    "Total 1v5 Wins",
  ];

  // Оценка клатчей 0 - 100.
  //  - считается на МАТЧ, а не за всю карьеру, поэтому не зависит от числа сыгранных игр;
  //  - 1v2...1v5 весят больше, чем 1v1 (вес = число соперников);
  //  - шкала плавная: 50 баллов = референсный уровень, 75 = вдвое выше, 87.5 = втрое выше,
  //    поэтому 100 практически недостижимо и топ-игроки различимы;
  //  - не зависит от винрейта и K/D (они уже учтены в других метриках);
  //  - при малой выборке оценка стягивается к 50.
  function computeClutchScore({ lifetime, allMaps, matches, rawKd }) {
    // Разбивка по 1vX из lifetime
    let weighted = 0;
    let lifetimeTotal = 0;
    CLUTCH_KEYS.forEach((key, i) => {
      const v = parseInt(lifetime?.[key], 10);
      if (!isNaN(v) && v > 0) {
        weighted += v * (i + 1);
        lifetimeTotal += v;
      }
    });

    // Общее число клатчей по картам (без разбивки)
    const mapsTotal = Array.isArray(allMaps)
      ? allMaps.reduce((sum, m) => sum + (parseInt(m.clutches, 10) || 0), 0)
      : 0;

    let perMatchValue = null;
    let reference = CLUTCH_REF_WEIGHTED;

    if (matches > 0 && weighted > 0) {
      perMatchValue = weighted / matches;
    } else if (matches > 0 && Math.max(mapsTotal, lifetimeTotal) > 0) {
      perMatchValue = Math.max(mapsTotal, lifetimeTotal) / matches;
      reference = CLUTCH_REF_TOTAL;
    }

    // Данных по клатчам нет: нейтральная оценка от K/D (без «пола» в 20 и без потолка в 100)
    if (perMatchValue === null) {
      const kd = isNaN(rawKd) ? 1 : rawKd;
      return Math.min(Math.max(Math.round(50 + (kd - 1) * 40), 15), 85);
    }

    const ratio = perMatchValue / reference;
    const raw = 100 * (1 - Math.pow(2, -ratio));
    const confidence = Math.min(1, matches / CLUTCH_FULL_CONFIDENCE_MATCHES);
    const shrunk = 50 + (raw - 50) * confidence;

    return Math.min(Math.max(Math.round(shrunk), 0), 100);
  }

// Вспомогательная функция: переводит значение из диапазона [min, max] в [0, 100]
  function scaleRange(val, min, max) {
    if (max <= min) return 0;
    const pct = ((val - min) / (max - min)) * 100;
    return Math.min(Math.max(pct, 0), 100);
  }

  function computeHltvMetrics(profile) {
    const avgStats = profile?.avgStats;
    const lifetime = profile?.lifetime || profile?.statsData?.lifetime || {};
    const allMaps =
      (Array.isArray(profile?.allMaps) && profile.allMaps.length
        ? profile.allMaps
        : window.FaceitAPI?.getAllMapsStats?.(
            profile?.statsData?.segments || [],
          )) || [];

    // Базовые показатели
    let rawWinRate = parseFloat(lifetime["Win Rate %"]);
    if (isNaN(rawWinRate) || rawWinRate === 0) {
      const wins = parseInt(lifetime["Wins"] || "0", 10);
      const totalMatches = avgStats?.totalMatches || 0;
      rawWinRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 50;
    }
    const rawHs = parseFloat(lifetime["Average Headshots %"] || avgStats?.avgHs || 0);
    const rawKd = parseFloat(lifetime["Average K/D Ratio"] || avgStats?.kd || 0);
    const rawAvgKills = parseFloat(avgStats?.avgKills || 0);
    const rawAvgDeaths = parseFloat(avgStats?.avgDeaths || 15);

    // ADR по картам
    let totalAdr = 0;
    if (Array.isArray(allMaps) && allMaps.length > 0) {
      totalAdr = allMaps.reduce((sum, m) => sum + (parseFloat(m.adr) || 0), 0) / allMaps.length;
    }
    const adrVal = totalAdr > 0 ? totalAdr : 75;

    // Нормализованные базовые шкалы (50 баллов = крепкий середняк)
    const sAdr   = scaleRange(adrVal, 50, 105);       // 75 ADR -> 45
    const sKd    = scaleRange(rawKd, 0.65, 1.45);     // 1.00 K/D -> 44
    const sKills = scaleRange(rawAvgKills, 10, 23);   // 15 Kills -> 38
    const sWr    = scaleRange(rawWinRate, 35, 65);    // 50% WR -> 50
    const sHs    = scaleRange(rawHs, 25, 65);         // 45% HS -> 50
    // Выживаемость: чем меньше смертей (от 19 до 11 за матч), тем выше балл
    const sSurv  = scaleRange(19 - rawAvgDeaths, 0, 8); // 15 смертей -> 50

    // 1. Clutching (уже хорошо откалиброван под 50)
    const clutchingScore = computeClutchScore({
      lifetime,
      allMaps,
      matches: avgStats?.totalMatches || 0,
      rawKd,
    });

    // 2. Firepower: чистая огневая мощь (урон + K/D + точность в голову)
    const firepower = Math.round(sAdr * 0.45 + sKd * 0.40 + sHs * 0.15);

    // 3. Entrying: агрессивные фраги в сочетании с темпом
    const entrying = Math.round(sKills * 0.65 + sAdr * 0.35);

    // 4. Trading: выживаемость + позиционный K/D
    const trading = Math.round(sKd * 0.55 + sSurv * 0.45);

    // 5. Opening: инициатива и конвертация первых фрагов в победы
    const opening = Math.round(sKills * 0.55 + sWr * 0.45);

    // 6. Sniping: высокий K/D + высокая выживаемость, если игрок не рифлер-хедшотер
    const awpFactor = rawHs < 38 ? 1.0 : rawHs < 45 ? 0.65 : 0.35;
    const sniping = Math.round((sKd * 0.60 + sSurv * 0.40) * awpFactor);

    // 7. Utility: урон сверх обычных убийств (разница между ADR и киллами) + командный импакт
    const extraDamage = scaleRange(adrVal - rawAvgKills * 4.2, -5, 22);
    const utility = Math.round(extraDamage * 0.65 + sWr * 0.35);

    return [
      { label: "Firepower", displayValue: `${firepower}`, score: firepower },
      { label: "Entrying",  displayValue: `${entrying}`,  score: entrying },
      { label: "Trading",   displayValue: `${trading}`,   score: trading },
      { label: "Opening",   displayValue: `${opening}`,   score: opening },
      { label: "Clutching", displayValue: `${clutchingScore}`, score: clutchingScore },
      { label: "Sniping",   displayValue: `${sniping}`,   score: sniping },
      { label: "Utility",   displayValue: `${utility}`,   score: utility },
    ];
  }

  function renderOverviewStats(container) {
    if (!container || !window.currentPlayerProfile) return;

    const { avgStats, mapAnalysis } = window.currentPlayerProfile;

    const metrics = computeHltvMetrics(window.currentPlayerProfile);

    const metricsCardHtml = `
      <div class="metrics-card slide-in-animation">
        <div class="metrics-card-header">
          <i class="fas fa-chart-bar"></i>
          <span>HLTV Performance Profile</span>
          <p class="how-to-improve"><i class="fas fa-lightbulb"></i> How to improve?</p>
        </div>
        <div class="metrics-grid">
          ${metrics
            .map((m) => {
              const rating = getScoreRating(m.score);
              return `
              <div class="metric-item metric-item-${rating.class}" style="--m-color: ${getScoreColor(m.score)};">
                <div class="metric-item-top">
                  <span class="metric-label">${m.label}</span>
                  <span class="metric-badge badge-${rating.class}">${rating.text}</span>
                </div>
                <div class="metric-item-bottom">
                  <span class="metric-value">${m.displayValue}</span>
                </div>
                <div class="metric-progress-track">
                  <div class="metric-progress-fill" style="width: ${m.score}%;"></div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;

    // Средняя разница убийств и смертей за матч
    const diffValue =
      parseFloat(avgStats.avgKills) - parseFloat(avgStats.avgDeaths);
    const killDeathDiff = Number.isNaN(diffValue)
      ? "-"
      : `${diffValue > 0 ? "+" : ""}${diffValue.toFixed(1)}`;

    const mapAttr = (map) =>
      map ? ` data-map="${normalizeMapKey(map.name)}"` : "";

    container.innerHTML = `
    ${metricsCardHtml}
    <div class="stats-grid">
      <div class="stats-box slide-in-animation">
        <h3><i class="fas fa-chart-line"></i> Average Statistics</h3>
        <p class="stat-row">${formatStatRow(`Avg. Kills: ${avgStats.avgKills}`)}</p>
        <p class="stat-row">${formatStatRow(`Avg. Deaths: ${avgStats.avgDeaths}`)}</p>
        <p class="stat-row">${formatStatRow(`Avg. Diff: ${killDeathDiff}`)}</p>
        <p class="stat-row">${formatStatRow(`K/D: ${avgStats.kd}`)}</p>
        <p class="stat-row">${formatStatRow(`Headshots: ${avgStats.avgHs}%`)}</p>
      </div>

      <div class="stats-box slide-in-animation"${mapAttr(mapAnalysis.bestMap)}>
        <h3><i class="fas fa-map"></i> Best Map</h3>
        ${renderMapBox(mapAnalysis.bestMap)}
      </div>

      <div class="stats-box slide-in-animation"${mapAttr(mapAnalysis.worstMap)}>
        <h3><i class="fas fa-map-marked-alt"></i> Worst Map</h3>
        ${renderMapBox(mapAnalysis.worstMap)}
      </div>
    </div>
    `;

    applyMapCardBackgrounds(container);
  }

  function renderPlayerCard(
    playerData,
    countryName,
    currentElo,
    avgStats,
    lifetime,
  ) {
    const faceitLevel = playerData.games?.cs2?.skill_level;

    const levelImg = faceitLevel
      ? `<img class="player-level" src="/images/levels/lvl${faceitLevel}.svg" alt="Level ${faceitLevel}" />`
      : "";

    const countryCode = playerData.country
      ? playerData.country.toLowerCase()
      : "";
    const flagImg = countryCode
      ? `<img src="https://flagcdn.com/24x18/${countryCode}.png" alt="${countryName}" style="vertical-align: middle; margin-left: 6px; border-radius: 2px; box-shadow: 0 0 4px rgba(0,0,0,0.4); width: 25px; margin-bottom: 3px;" />`
      : "";

    const eloProgress = getEloProgress(currentElo);
    const eloProgressHtml = eloProgress
      ? `<div class="elo-progress">
            <div class="elo-progress-bar"><div class="elo-progress-fill" style="width: ${eloProgress.pct}%;"></div></div>
            <span class="elo-progress-text">${eloProgress.text}</span>
          </div>`
      : "";

    const winRateText = lifetime["Win Rate %"] || "0";
    const highlights = [
      { icon: "fa-gamepad", label: "Matches", value: formatNumber(avgStats.totalMatches) },
      {
        icon: "fa-trophy",
        label: "Win Rate",
        value: `${winRateText}%`,
        cls: winRateClass(parseFloat(winRateText) || 0),
      },
      { icon: "fa-crosshairs", label: "K/D", value: avgStats.kd },
      { icon: "fa-bullseye", label: "Headshots", value: `${avgStats.avgHs}%` },
    ];
    const highlightsHtml = highlights
      .map(
        (h) => `
          <div class="highlight-tile">
            <i class="fas ${h.icon}"></i>
            <span class="highlight-value ${h.cls || ""}">${h.value}</span>
            <span class="highlight-label">${h.label}</span>
          </div>`,
      )
      .join("");

    return `
    <div class="player-card fade-in-animation">
      <div class="player-header">
        <div class="player-avatar">
          <img src="${playerData.avatar || ".png"}" alt="${
            playerData.nickname
          }" onerror="this.src='/assets/favicon.svg';" />
        </div>
        <div class="player-info">
          <h2>${playerData.nickname}</h2>
          <p>Country: ${countryName}${flagImg}</p>
          <a class="faceit-link" href="https://www.faceit.com/en/players/${encodeURIComponent(playerData.nickname)}" target="_blank" rel="noopener noreferrer" title="Open FACEIT profile">
            <img src="/assets/faceit.svg" alt="" />
            <span>FACEIT Profile</span>
            <i class="fas fa-external-link-alt"></i>
          </a>
        </div>
        <div class="player-rating">
          <div class="player-rating-main">
            ${levelImg}
            <span class="player-rating-value">${formatNumber(currentElo)}</span>
            <span class="player-rating-unit">ELO</span>
          </div>
          ${eloProgressHtml}
        </div>
        <div class="player-highlights">${highlightsHtml}
        </div>
      </div>
      <div class="stats-container"></div>
    </div>
  `;
  }

  function applyMapCardBackgrounds(container) {
    if (!container) return;

    const mapCards = container.querySelectorAll(
      ".map-card, .mc-card, .mc-chip[data-map], .stats-box[data-map]",
    );
    const assetBaseUrl = (() => {
      const basePath = window.location.pathname.replace(/\/player\/.*$/, "/");
      const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
      return new URL(normalizedBase, window.location.origin).toString();
    })();

    const mapBackgrounds = {
      ancient: new URL("images/maps/ancient.webp", assetBaseUrl).toString(),
      anubis: new URL("images/maps/anubis.webp", assetBaseUrl).toString(),
      dust2: new URL("images/maps/dust2.webp", assetBaseUrl).toString(),
      inferno: new URL("images/maps/inferno.webp", assetBaseUrl).toString(),
      mirage: new URL("images/maps/mirage.webp", assetBaseUrl).toString(),
      nuke: new URL("images/maps/nuke.webp", assetBaseUrl).toString(),
      overpass: new URL("images/maps/overpass.webp", assetBaseUrl).toString(),
      train: new URL("images/maps/train.webp", assetBaseUrl).toString(),
      vertigo: new URL("images/maps/vertigo.webp", assetBaseUrl).toString(),
      cache: new URL("images/maps/cache.webp", assetBaseUrl).toString(),
    };

    mapCards.forEach((card) => {
      const mapKey = card.getAttribute("data-map");
      if (mapKey && mapBackgrounds[mapKey]) {
        const imagePath = mapBackgrounds[mapKey];
        card.style.setProperty("--map-bg-url", `url('${imagePath}')`);
        card.classList.add("has-map-bg");
      }
    });
  }

  document.getElementById("aimTrainerBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.minigameLoaded) {
      const script = document.createElement("script");
      script.src = "/app/features/minigame.js?v=1.4";
      script.onload = () => {
        window.minigameLoaded = true;
        if (typeof window.openModalByRoute === "function") {
          window.openModalByRoute("aim-trainer", true);
        }
      };
      document.body.appendChild(script);
    } else {
      if (typeof window.openModalByRoute === "function") {
        window.openModalByRoute("aim-trainer", true);
      }
    }
  });

  const AppRendering = {
    formatStatRow,
    renderOverviewStats,
    computeHltvMetrics,
    renderPlayerCard,
    applyMapCardBackgrounds,
  };

  if (typeof window !== "undefined") {
    window.AppRendering = AppRendering;
    window.formatStatRow = formatStatRow;
    window.renderOverviewStats = renderOverviewStats;
    window.computeHltvMetrics = computeHltvMetrics;
    window.renderPlayerCard = renderPlayerCard;
    window.applyMapCardBackgrounds = applyMapCardBackgrounds;
  }
})();
