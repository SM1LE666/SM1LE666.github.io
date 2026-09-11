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
    // Извлекаем все необходимые данные из профиля текущего игрока
    const {
      avgStats,
      mapAnalysis,
      lifetime = {},
    } = window.currentPlayerProfile;

    // Получаем фактические значения показателей
    const rawWinRate = lifetime["Win Rate %"] || 0;
    const rawHs = lifetime["Average Headshots %"] || avgStats?.avgHs || 0;
    const rawKd = lifetime["Average K/D Ratio"] || avgStats?.kd || 0;
    const rawAvgKills = avgStats?.avgKills || 0;

    // Рассчитываем метрики и их баллы
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

    // Генерируем HTML-разметку карточки метрик
    const metricsCardHtml = `
      <div class="metrics-card slide-in-animation">
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
      </div>
    `;

    // Выводим блоки статистики вместе с карточкой метрик
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

      ${metricsCardHtml}
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
