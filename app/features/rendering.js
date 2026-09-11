(function () {
  function getTranslator() {
    return window.getText || ((key) => key);
  }

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
    const getText = getTranslator();
    if (!map) return `<p>${getText("notEnoughData")}</p>`;

    return `
      <p class="stat-row">${formatStatRow(`${getText("mapName")}: ${map.name}`)}</p>
      <p class="stat-row">${formatStatRow(`${getText("mapMatches")}: ${map.matches}`)}</p>
      <p class="stat-row">${formatStatRow(`${getText("mapWinRate")}: ${map.winRate.toFixed(1)}%`)}</p>
      <p class="stat-row">${formatStatRow(`K/D: ${map.kd.toFixed(2)}`)}</p>
      <p class="stat-row">${formatStatRow(`${getText("Headshots")}: ${map.hs.toFixed(1)}%`)}</p>
    `;
  }

  // Функция оценки диапазона 0 - 100
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
        // Проценты уже находятся в диапазоне 0-100
        return Math.min(Math.max(Math.round(val), 0), 100);

      case "kd":
        // Нормализация K/D: 0.6 K/D ≈ 0%, 1.0 K/D ≈ 50% (Okay), 1.5+ K/D ≈ 100% (Good)
        const kdNormalized = ((val - 0.6) / 0.9) * 100;
        return Math.min(Math.max(Math.round(kdNormalized), 0), 100);

      case "avgKills":
        // Нормализация средних киллов за матч (10 киллов ≈ 0%, 16 киллов ≈ 50%, 22+ килла ≈ 100%)
        const killsNormalized = ((val - 10) / 12) * 100;
        return Math.min(Math.max(Math.round(killsNormalized), 0), 100);

      default:
        return Math.min(Math.max(Math.round(val), 0), 100);
    }
  }

  function renderOverviewStats(container) {
    if (!container || !window.currentPlayerProfile) return;

    const getText = getTranslator();
    const { avgStats, mapAnalysis } = window.currentPlayerProfile;

    container.innerHTML = `
    <div class="stats-box slide-in-animation">
      <h3><i class="fas fa-chart-line"></i> ${getText("avgStatsTitle")}</h3>
      <p class="stat-row">${formatStatRow(`${getText("Matches")}: ${formatNumber(avgStats.totalMatches)}`)}</p>
      <p class="stat-row">${formatStatRow(`${getText("killsPerMatch")}: ${avgStats.avgKills}`)}</p>
      <p class="stat-row">${formatStatRow(`${getText("deathsPerMatch")}: ${avgStats.avgDeaths}`)}</p>
      <p class="stat-row">${formatStatRow(`K/D: ${avgStats.kd}`)}</p>
      <p class="stat-row">${formatStatRow(`${getText("Headshots")}: ${avgStats.avgHs}%`)}</p>
    </div>

    <div class="stats-box slide-in-animation">
      <h3><i class="fas fa-map"></i> ${getText("bestMapTitle")}</h3>
      ${renderMapBox(mapAnalysis.bestMap)}
    </div>

    <div class="stats-box slide-in-animation">
      <h3><i class="fas fa-map-marked-alt"></i> ${getText("worstMapTitle")}</h3>
      ${renderMapBox(mapAnalysis.worstMap)}
    </div>
  `;
    const overviewContainer =
      document.getElementById("overview-tab") ||
      document.querySelector(".overview-container");
    if (!overviewContainer) return;

    // Извлекаем объект lifetime-статистики
    const lifetime = data?.lifetime || data?.stats?.lifetime || {};

    // Расчет K/D и средних киллов с помощью функций FaceitAPI (из вашего faceit.js)
    const calculatedAvg = window.FaceitAPI
      ? window.FaceitAPI.calculateAvgStats(lifetime, data?.segments, "cs2")
      : {};

    // Извлечение реальных значений из ответа API
    const rawWinRate = lifetime["Win Rate %"] || 0;
    const rawHs = lifetime["Average Headshots %"] || calculatedAvg.avgHs || 0;
    const rawKd = lifetime["Average K/D Ratio"] || calculatedAvg.kd || 0;
    const rawAvgKills =
      calculatedAvg.avgKills ||
      (lifetime["Total Matches"] > 0
        ? lifetime["Total Kills with extended stats"] /
          lifetime["Total Matches"]
        : 0);

    // Формирование списка метрик
    const metrics = [
      {
        label: "Win Rate",
        displayValue: `${Math.round(parseFloat(rawWinRate))}%`,
        score: normalizeMetric("winrate", rawWinRate),
      },
      {
        label: "K/D Ratio",
        displayValue: parseFloat(rawKd).toFixed(2),
        score: normalizeMetric("kd", rawKd),
      },
      {
        label: "Headshots",
        displayValue: `${Math.round(parseFloat(rawHs))}%`,
        score: normalizeMetric("hs", rawHs),
      },
      {
        label: "Avg Kills",
        displayValue: parseFloat(rawAvgKills).toFixed(1),
        score: normalizeMetric("avgKills", rawAvgKills),
      },
    ];

    // Создаем или обновляем карточку
    let metricsCard = overviewContainer.querySelector(".metrics-card");
    if (!metricsCard) {
      metricsCard = document.createElement("div");
      metricsCard.className = "metrics-card";
      overviewContainer.appendChild(metricsCard);
    }

    metricsCard.innerHTML = `
    <div class="metrics-grid">
      ${metrics
        .map((m) => {
          const rating = getScoreRating(m.score);
          return `
          <div class="metric-item">
            <div class="metric-info">
              <span class="metric-label">${m.label}</span>
              <span class="metric-value">${m.displayValue}</span>
            </div>
            <span class="metric-badge ${rating.class}">${rating.text}</span>
          </div>
        `;
        })
        .join("")}
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
    const getText = getTranslator();
    const faceitLevel = playerData.games?.cs2?.skill_level;

    const levelValue = faceitLevel
      ? `<img src="/images/levels/lvl${faceitLevel}.svg" alt="Level ${faceitLevel}" style="width: 35px; height: 35px; object-fit: contain; vertical-align: middle;" />`
      : "N/A";

    const profileLang = window.currentLanguage === "ru" ? "ru" : "en";

    return `
    <div class="player-card fade-in-animation">
      <div class="player-header">
        <div class="player-avatar">
          <img src="${playerData.avatar || ".png"}" alt="${
            playerData.nickname
          }" onerror="this.src='/assets/logooo.png'">
        </div>
        <div class="player-info">
          <h2>${playerData.nickname}</h2>
          <p style="
    font-size: 20px;
    font-weight: bold;">${levelValue} ${formatNumber(currentElo)} ELO</p>
          <p>${getText("country")}: ${countryName}</p>
          <p>${getText("matches")}: ${formatNumber(avgStats.totalMatches)}</p>
          <p>${getText("winRate")}: ${lifetime["Win Rate %"] || "0"}%</p>
          <img
            src="/assets/faceit.png"
            alt="${getText("faceitProfile")}"
            title="${getText("faceitProfile")}"
            onclick="window.open('https://www.faceit.com/${profileLang}/players/${playerData.nickname}', '_blank')"
            style="cursor: pointer; width: 45px; height: 45px; border-radius: 8px; border: 2px solid var(--primary-color); transition: transform 0.3s, box-shadow 0.3s; margin-right: 10px; object-fit: contain;"
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

    const mapCards = container.querySelectorAll(".map-card");
    const assetBaseUrl = (() => {
      const basePath = window.location.pathname.replace(/\/player\/.*$/, "/");
      const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
      return new URL(normalizedBase, window.location.origin).toString();
    })();

    const mapBackgrounds = {
      ancient: new URL("images/maps/ancient.jpg", assetBaseUrl).toString(),
      anubis: new URL("images/maps/anubis.jpg", assetBaseUrl).toString(),
      dust2: new URL("images/maps/dust2.jpg", assetBaseUrl).toString(),
      inferno: new URL("images/maps/inferno.jpg", assetBaseUrl).toString(),
      mirage: new URL("images/maps/mirage.jpg", assetBaseUrl).toString(),
      nuke: new URL("images/maps/nuke.jpg", assetBaseUrl).toString(),
      overpass: new URL("images/maps/overpass.jpg", assetBaseUrl).toString(),
      train: new URL("images/maps/train.jpg", assetBaseUrl).toString(),
      vertigo: new URL("images/maps/vertigo.jpg", assetBaseUrl).toString(),
      cache: new URL("images/maps/cache.jpg", assetBaseUrl).toString(),
    };

    mapCards.forEach((card) => {
      const mapKey = card.getAttribute("data-map");
      if (mapKey && mapBackgrounds[mapKey]) {
        const imagePath = mapBackgrounds[mapKey];
        card.style.setProperty("--map-bg-url", `url('${imagePath}')`);
        card.style.backgroundImage = `linear-gradient(135deg, rgba(26, 26, 26, 0.25), rgba(255, 85, 0, 0.08)), url('${imagePath}')`;
        card.style.backgroundSize = "cover";
        card.style.backgroundPosition = "center";
        card.style.backgroundRepeat = "no-repeat";
        card.classList.add("has-map-bg");
      }
    });
  }

  window.AppRendering = {
    formatStatRow,
    renderOverviewStats,
    renderPlayerCard,
    applyMapCardBackgrounds,
  };

  window.formatStatRow = formatStatRow;
  window.renderOverviewStats = renderOverviewStats;
  window.applyMapCardBackgrounds = applyMapCardBackgrounds;
})();
