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

  function renderMapBox(map) {
    if (!map) return `<p>Not enough data</p>`;

    return `
      <p class="stat-row">${formatStatRow(`Map: ${map.name}`)}</p>
      <p class="stat-row">${formatStatRow(`Matches: ${map.matches}`)}</p>
      <p class="stat-row">${formatStatRow(`Win Rate: ${map.winRate.toFixed(1)}%`)}</p>
      <p class="stat-row">${formatStatRow(`K/D: ${map.kd.toFixed(2)}`)}</p>
      <p class="stat-row">${formatStatRow(`Headshots: ${map.hs.toFixed(1)}%`)}</p>
    `;
  }

  // Оценка диапазона 0 - 100
  function getScoreRating(value) {
    if (value <= 33) return { text: "Poor", class: "poor" };
    if (value <= 67) return { text: "Okay", class: "okay" };
    return { text: "Good", class: "good" };
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

  // Расчёт 7 HLTV-метрик (0 - 100). Используется в Overview и в Compare.
  function computeHltvMetrics(profile) {
    const avgStats = profile?.avgStats;
    const lifetime = profile?.lifetime || profile?.statsData?.lifetime || {};
    const allMaps =
      (Array.isArray(profile?.allMaps) && profile.allMaps.length
        ? profile.allMaps
        : window.FaceitAPI?.getAllMapsStats?.(
            profile?.statsData?.segments || [],
          )) || [];

    if (!Object.keys(lifetime).length) {
      console.warn(
        "computeHltvMetrics: lifetime-статистика пуста, метрики будут посчитаны по запасным значениям",
      );
    }

    // 1. Извлекаем базовые показатели
    let rawWinRate = parseFloat(lifetime["Win Rate %"]);
    if (isNaN(rawWinRate) || rawWinRate === 0) {
      const wins = parseInt(lifetime["Wins"] || "0", 10);
      const totalMatches = avgStats?.totalMatches || 0;
      rawWinRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 50;
    }
    const rawHs = parseFloat(
      lifetime["Average Headshots %"] || avgStats?.avgHs || 0,
    );
    const rawKd = parseFloat(
      lifetime["Average K/D Ratio"] || avgStats?.kd || 0,
    );
    const rawAvgKills = parseFloat(avgStats?.avgKills || 0);

    // 2. Агрегируем данные по картам (ADR)
    let totalAdr = 0;
    if (Array.isArray(allMaps) && allMaps.length > 0) {
      totalAdr =
        allMaps.reduce((sum, m) => sum + (parseFloat(m.adr) || 0), 0) /
        allMaps.length;
    }
    const adrVal = totalAdr > 0 ? totalAdr : 75;

    // Clutching: см. computeClutchScore
    const clutchingScore = computeClutchScore({
      lifetime,
      allMaps,
      matches: avgStats?.totalMatches || 0,
      rawKd,
    });

    // 3. Формулы HLTV-метрик (0 - 100)
    // Firepower: урон + K/D + хедшоты
    const firepower = Math.min(
      Math.max(
        Math.round(
          (adrVal / 100) * 40 + (rawKd / 2.0) * 40 + (rawHs / 100) * 20,
        ),
        0,
      ),
      100,
    );

    // Entrying / Opening: агрессивные фраги (KPR) и процент побед
    const entrying = Math.min(
      Math.max(
        Math.round((rawAvgKills / 25) * 60 + (rawWinRate / 100) * 40),
        0,
      ),
      100,
    );

    // Trading: стабильность размёна на основе K/D и сбалансированности смертей
    const trading = Math.min(
      Math.max(Math.round((rawKd / 1.5) * 70 + (rawWinRate / 100) * 30), 0),
      100,
    );

    // Opening: первоначальные дуэли на картах
    const opening = Math.min(
      Math.max(
        Math.round((rawWinRate / 100) * 50 + (rawAvgKills / 25) * 50),
        0,
      ),
      100,
    );

    // Sniping: оцениваем по выживаемости и K/D (при высоком K/D / низком HS%)
    const snipingBonus = rawHs < 40 ? 15 : 0;
    const sniping = Math.min(
      Math.max(
        Math.round((rawKd / 1.8) * 65 + snipingBonus + (rawWinRate / 100) * 20),
        0,
      ),
      100,
    );

    // Utility: влияние гранат на основе общего ADR и кастомной нормы
    const utility = Math.min(
      Math.max(Math.round((adrVal / 90) * 70 + (rawWinRate / 100) * 30), 0),
      100,
    );

    const metrics = [
      { label: "Firepower", displayValue: `${firepower}`, score: firepower },
      { label: "Entrying", displayValue: `${entrying}`, score: entrying },
      { label: "Trading", displayValue: `${trading}`, score: trading },
      { label: "Opening", displayValue: `${opening}`, score: opening },
      {
        label: "Clutching",
        displayValue: `${clutchingScore}`,
        score: clutchingScore,
      },
      { label: "Sniping", displayValue: `${sniping}`, score: sniping },
      { label: "Utility", displayValue: `${utility}`, score: utility },
    ];

    return metrics;
  }

  function renderOverviewStats(container) {
    if (!container || !window.currentPlayerProfile) return;

    const {
      avgStats,
      mapAnalysis,
      lifetime = {},
      allMaps = [],
    } = window.currentPlayerProfile;

    const metrics = computeHltvMetrics(window.currentPlayerProfile);

    const metricsCardHtml = `
      <div class="metrics-card slide-in-animation">
        <div class="metrics-card-header">
          <i class="fas fa-chart-bar"></i>
          <span>HLTV Performance Profile</span>
        </div>
        <div class="metrics-grid">
          ${metrics
            .map((m) => {
              const rating = getScoreRating(m.score);
              return `
              <div class="metric-item metric-item-${rating.class}">
                <div class="metric-item-top">
                  <span class="metric-label">${m.label}</span>
                  <span class="metric-badge badge-${rating.class}">${rating.text}</span>
                </div>
                <div class="metric-item-bottom">
                  <span class="metric-value">${m.displayValue}</span>
                </div>
                <div class="metric-progress-track">
                  <div class="metric-progress-fill fill-${rating.class}" style="width: ${m.score}%;"></div>
                </div>
              </div>
            `;
            })
            .join("")}
            <p class="how-to-improve">How to improve?</p>
        </div>
      </div>
    `;

    container.innerHTML = `
    ${metricsCardHtml}
    <div class="stats-grid">
      <div class="stats-box slide-in-animation">
        <h3><i class="fas fa-chart-line"></i> Average Statistics</h3>
        <p class="stat-row">${formatStatRow(`Matches: ${formatNumber(avgStats.totalMatches)}`)}</p>
        <p class="stat-row">${formatStatRow(`Avg. Kills: ${avgStats.avgKills}`)}</p>
        <p class="stat-row">${formatStatRow(`Avg. Deaths: ${avgStats.avgDeaths}`)}</p>
        <p class="stat-row">${formatStatRow(`K/D: ${avgStats.kd}`)}</p>
        <p class="stat-row">${formatStatRow(`Headshots: ${avgStats.avgHs}%`)}</p>
      </div>

      <div class="stats-box slide-in-animation">
        <h3><i class="fas fa-map"></i> Best Map</h3>
        ${renderMapBox(mapAnalysis.bestMap)}
      </div>

      <div class="stats-box slide-in-animation">
        <h3><i class="fas fa-map-marked-alt"></i> Worst Map</h3>
        ${renderMapBox(mapAnalysis.worstMap)}
      </div>
    </div>
    `;
  }

  function renderPlayerCard(
    playerData,
    countryName,
    currentElo,
    avgStats,
    lifetime,
  ) {
    const faceitLevel = playerData.games?.cs2?.skill_level;

    const levelValue = faceitLevel
      ? `<img src="/images/levels/lvl${faceitLevel}.svg" alt="Level ${faceitLevel}" style="width: 35px; height: 35px; object-fit: contain; vertical-align: middle;" />`
      : "N/A";

    const countryCode = playerData.country
      ? playerData.country.toLowerCase()
      : "";
    const flagImg = countryCode
      ? `<img src="https://flagcdn.com/24x18/${countryCode}.png" alt="${countryName}" style="vertical-align: middle; margin-left: 6px; border-radius: 2px; box-shadow: 0 0 4px rgba(0,0,0,0.4); width: 25px; margin-bottom: 3px;" />`
      : "";

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
          <p style="
    font-size: 19px;
    font-weight: bold;">${levelValue} ${formatNumber(currentElo)} ELO</p>
          <p>Country: ${countryName}${flagImg}</p>
          <p>Matches: ${formatNumber(avgStats.totalMatches)}</p>
          <p>Win Rate: ${lifetime["Win Rate %"] || "0"}%</p>
          <img
            src="/assets/faceit.svg"
            alt="FACEIT Profile"
            title="FACEIT Profile"
            onclick="window.open('https://www.faceit.com/en/players/${playerData.nickname}', '_blank')"
            style="cursor: pointer; width: 45px; height: 45px; margin-top: 5px; border-radius: 8px; border: 2px solid var(--primary-color); transition: transform 0.3s, box-shadow 0.3s; object-fit: contain;"
            onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 0 10px var(--primary-color)';"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"
          />
        </div>
      </div>
      <div class="stats-container"></div>
    </div>
  `;
  }

  function applyMapCardBackgrounds(container) {
    if (!container) return;

    const mapCards = container.querySelectorAll(
      ".map-card, .mc-card, .mc-chip[data-map]",
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
