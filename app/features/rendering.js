(function () {
  function formatStatRow(text) {
    const idx = text.indexOf(":");
    if (idx === -1) {
      return `<span class="stat-row-full">${text}</span>`;
    }
    const label = text.slice(0, idx + 1).trim();
    const value = text.slice(idx + 1).trim();
    return `<span class="stat-row-label">${label}</span><span class="stat-row-value">${value}</span>`;
  }

  function renderOverviewStats(container) {
    if (!container || !window.currentPlayerProfile) return;

    const getText = window.getText || ((key) => key);
    const formatNumber =
      window.FaceitService?.formatNumber?.bind(window.FaceitService) ||
      window.FaceitAPI?.formatNumber?.bind(window.FaceitAPI) ||
      ((value) => String(value));

    const { avgStats, mapAnalysis } = window.currentPlayerProfile;
    container.innerHTML = "";

    const overviewHTML = `
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
      ${
        mapAnalysis.bestMap
          ? `
        <p class="stat-row">${formatStatRow(`${getText("mapName")}: ${mapAnalysis.bestMap.name}`)}</p>
        <p class="stat-row">${formatStatRow(`${getText("mapMatches")}: ${mapAnalysis.bestMap.matches}`)}</p>
        <p class="stat-row">${formatStatRow(`${getText("mapWinRate")}: ${mapAnalysis.bestMap.winRate.toFixed(1)}%`)}</p>
        <p class="stat-row">${formatStatRow(`K/D: ${mapAnalysis.bestMap.kd.toFixed(2)}`)}</p>
        <p class="stat-row">${formatStatRow(`${getText("Headshots")}: ${mapAnalysis.bestMap.hs.toFixed(1)}%`)}</p>
      `
          : `<p>${getText("notEnoughData")}</p>`
      }
    </div>

    <div class="stats-box slide-in-animation">
      <h3><i class="fas fa-map-marked-alt"></i> ${getText("worstMapTitle")}</h3>
      ${
        mapAnalysis.worstMap
          ? `
        <p class="stat-row">${formatStatRow(`${getText("mapName")}: ${mapAnalysis.worstMap.name}`)}</p>
        <p class="stat-row">${formatStatRow(`${getText("mapMatches")}: ${mapAnalysis.worstMap.matches}`)}</p>
        <p class="stat-row">${formatStatRow(`${getText("mapWinRate")}: ${mapAnalysis.worstMap.winRate.toFixed(1)}%`)}</p>
        <p class="stat-row">${formatStatRow(`K/D: ${mapAnalysis.worstMap.kd.toFixed(2)}`)}</p>
        <p class="stat-row">${formatStatRow(`${getText("Headshots")}: ${mapAnalysis.worstMap.hs.toFixed(1)}%`)}</p>
      `
          : `<p>${getText("notEnoughData")}</p>`
      }
    </div>
  `;

    container.innerHTML = overviewHTML;
  }

  function updateMapsTexts() {
    const getText = window.getText || ((key) => key);
    const mapCards = document.querySelectorAll(".map-card");
    if (mapCards.length > 0) {
      mapCards.forEach((card) => {
        const statLabels = card.querySelectorAll(".stat-label");
        statLabels.forEach((label) => {
          const text = label.textContent.toLowerCase();
          if (text.includes("matches") || text.includes("матчей")) {
            label.textContent = getText("mapMatches");
          } else if (text.includes("kills") || text.includes("убийств")) {
            label.textContent = getText("killsPerMatch");
          } else if (text.includes("win rate") || text.includes("винрейт")) {
            label.textContent = getText("mapWinRate");
          } else if (text.includes("adr") || text.includes("увр")) {
            label.textContent = getText("adr");
          } else if (text.includes("clutches") || text.includes("клатчи")) {
            label.textContent = getText("clutches");
          }
        });

        const perfIndicator = card.querySelector(".performance-indicator");
        if (perfIndicator) {
          const iconElement = perfIndicator.querySelector("i");
          const icon = iconElement ? iconElement.outerHTML : "";
          const text = perfIndicator.textContent.toLowerCase();

          if (text.includes("excellent") || text.includes("отличная")) {
            perfIndicator.innerHTML = `${icon} ${getText("excellentMap")}`;
          } else if (text.includes("average") || text.includes("средняя")) {
            perfIndicator.innerHTML = `${icon} ${getText("averageMap")}`;
          } else if (text.includes("poor") || text.includes("слабая")) {
            perfIndicator.innerHTML = `${icon} ${getText("poorMap")}`;
          }
        }
      });
    }

    const mapsTable = document.querySelector(".maps-table");
    if (mapsTable) {
      const headers = mapsTable.querySelectorAll("th");
      if (headers.length >= 5) {
        headers[0].textContent = getText("mapName");
        headers[1].textContent = getText("mapMatches");
        headers[2].textContent = getText("mapWinRate");
        headers[3].textContent = "K/D";
        headers[4].textContent = getText("killsPerMatch");
      }
    }
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
      ancient: new URL("images/ancient.jpg", assetBaseUrl).toString(),
      anubis: new URL("images/anubis.jpg", assetBaseUrl).toString(),
      dust2: new URL("images/dust2.jpg", assetBaseUrl).toString(),
      inferno: new URL("images/inferno.jpg", assetBaseUrl).toString(),
      mirage: new URL("images/mirage.jpg", assetBaseUrl).toString(),
      nuke: new URL("images/nuke.jpg", assetBaseUrl).toString(),
      overpass: new URL("images/overpass.jpg", assetBaseUrl).toString(),
      train: new URL("images/train.jpg", assetBaseUrl).toString(),
      vertigo: new URL("images/vertigo.jpg", assetBaseUrl).toString(),
      cache: new URL("images/cache.jpg", assetBaseUrl).toString(),
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
    updateMapsTexts,
    applyMapCardBackgrounds,
  };
})();
