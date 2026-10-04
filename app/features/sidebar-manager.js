if (typeof window !== "undefined") {
  function extractPlayerStats(teams, playerId) {
    for (const team of teams || []) {
      const player = (team.players || []).find((p) => p.player_id === playerId);
      if (player) return player.player_stats || {};
    }
    return {};
  }

  function extractFallbackMatch(
    infoData,
    playerId,
    fallbackMap = "Unknown Map",
  ) {
    const fallbackRound = infoData.rounds?.[0];
    return {
      map:
        fallbackRound?.round_stats?.Map ||
        infoData.map ||
        infoData.game_map ||
        infoData.voting?.map ||
        infoData.voting?.map_name ||
        infoData.voting?.map_selection ||
        fallbackMap,
      score: fallbackRound?.round_stats?.Score || infoData.score || "0 - 0",
      playerStats: extractPlayerStats(
        fallbackRound?.teams || infoData.teams,
        playerId,
      ),
    };
  }

  function buildMatchUrl(matchId) {
    if (!matchId) return "";
    const lang = window.currentLanguage || "en";
    return matchId.startsWith("1-")
      ? `https://www.faceit.com/${lang}/cs2/room/${matchId}`
      : `https://www.faceit.com/${lang}/matchroom/${matchId}`;
  }

  function formatKdRatio(kills, deaths) {
    if (deaths > 0) return (kills / deaths).toFixed(2);
    return kills > 0 ? "∞" : "0.00";
  }

  function buildMatchItemHtml(match) {
    if (match.result === "Error") {
      return `
        <div class="mc-card mc-error">
          <div class="mc-info">
            <span class="mc-map">Error loading match</span>
            <span class="mc-date">Failed to load match data</span>
          </div>
        </div>`;
    }

    const resultClass = match.result.toLowerCase();
    const matchUrl = buildMatchUrl(match.matchId);
    const mapKey = SidebarManager.normalizeMapKey(match.map);
    const mapName = /^de_/i.test(match.map)
      ? match.map.replace(/^de_/i, "").replace(/^./, (c) => c.toUpperCase())
      : match.map;

    const kills = Number(match.kills) || 0;
    const deaths = Number(match.deaths) || 0;
    const kd = deaths > 0 ? kills / deaths : kills;

    const stats = [
      { label: "Kills", value: kills },
      { label: "Deaths", value: deaths },
      { label: "Assists", value: Number(match.assists) || 0 },
      { label: "HS", value: `${match.headshots}%` },
      {
        label: "K/D",
        value: formatKdRatio(kills, deaths),
        cls: kd >= 1 ? "good" : "bad",
      },
      { label: "MVP", value: Number(match.mvps) || 0 },
    ];

    return `
      <div class="mc-card ${resultClass}" data-map="${mapKey}" ${
        matchUrl ? `onclick="window.open('${matchUrl}', '_blank')"` : ""
      }>
        <div class="mc-info">
          <span class="mc-map">${mapName}</span>
          <span class="mc-date"><i class="fas fa-calendar-alt"></i>${match.date}</span>
        </div>
        <div class="mc-outcome">
          <span class="mc-result">${match.result.toUpperCase()}</span>
          <span class="mc-score">${match.score}</span>
        </div>
        <div class="mc-stats">
          ${stats
            .map(
              (s) =>
                `<div class="mc-stat ${s.cls || ""}"><span class="mc-stat-value">${s.value}</span><span class="mc-stat-label">${s.label}</span></div>`,
            )
            .join("")}
        </div>
      </div>`;
  }

  class SidebarManager {
    constructor() {
      this.sidebar = document.getElementById("sidebar");
      this.mobileToggle = document.getElementById("mobileMenuToggle");
      this.mobileOverlay = document.getElementById("mobileOverlay");
      this.mobileDrawer = document.getElementById("mobileSidebarDrawer");
      this.isPlayerProfileActive = false;
      this.isMobileOpen = false;
      this.isDrawerExpanded = false;
      this.currentView = "overview";
      this.originalStatsHTML = null;
      this.currentMatches = [];
      this.currentMapFilter = null;
      this.matchesLimit = 40;
      this.isLoadingMore = false;
      this.totalMatches = 0;
      this.allHistoryItems = [];
      this.orderedMatches = [];
      this.displayedMatchesCount = 0;
      this.unfilteredDisplayedCount = 0;
      this.availableMapOptions = [];
      this.mapScanOffsets = {};

      this.initializeEventListeners();
    }

    static normalizeMapKey(mapName) {
      if (!mapName) return "";
      return String(mapName)
        .trim()
        .toLowerCase()
        .replace(/^de_/, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    }

    getFilteredMatches() {
      if (!this.currentMapFilter) return this.currentMatches || [];
      return (this.currentMatches || []).filter(
        (m) => SidebarManager.normalizeMapKey(m.map) === this.currentMapFilter,
      );
    }

    initializeEventListeners() {
      document.querySelectorAll(".sidebar-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          if (item.dataset.action === "back") return this.goBackToMainMenu();
          if (this.isPlayerProfileActive && item.dataset.view) {
            this.switchView(item.dataset.view);
          }
        });
      });

      document.querySelectorAll(".drawer-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (item.dataset.action === "back") return this.goBackToMainMenu();
          if (this.isPlayerProfileActive && item.dataset.view) {
            this.switchView(item.dataset.view);
            if (window.innerWidth <= 768) this.collapseDrawer();
          }
        });
      });

      document.addEventListener("click", (e) => {
        if (e.target.closest("#drawerHeader") && this.isPlayerProfileActive) {
          e.preventDefault();
          e.stopPropagation();
          this.toggleDrawer();
        }
      });

      if (this.mobileToggle) {
        this.mobileToggle.addEventListener("click", (e) => {
          e.preventDefault();
          if (this.isPlayerProfileActive) this.toggleMobileSidebar();
        });
      }

      if (this.mobileOverlay) {
        this.mobileOverlay.addEventListener("click", () => {
          this.closeMobileSidebar();
          this.collapseDrawer();
        });
      }

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (this.isMobileOpen) this.closeMobileSidebar();
          if (this.isDrawerExpanded) this.collapseDrawer();
        }
      });

      document.getElementById("cookieFab")?.addEventListener("click", (e) => {
        e.preventDefault();
        if (typeof closeAllModals === "function") closeAllModals();
        openCookieModal();
      });

      document
        .getElementById("cookieAcceptBtn")
        ?.addEventListener("click", (e) => {
          e.preventDefault();
          setCookieConsent("accepted");
          closeCookieModal();
          trackEvent("cookie_consent", { value: "accepted" });
          updateCookieFabVisibility();
        });

      document
        .getElementById("cookieRejectBtn")
        ?.addEventListener("click", (e) => {
          e.preventDefault();
          setCookieConsent("rejected");
          closeCookieModal();
          updateCookieFabVisibility();
        });

      window.addEventListener("load", () => {
        setTimeout(() => {
          if (getCookieConsent() === null) openCookieModal();
        }, 500);
      });
    }

    goBackToMainMenu() {
      goBackToMain(true);
    }

    showForPlayerProfile() {
      if (this.isPlayerProfileActive) return;
      this.isPlayerProfileActive = true;
      this.switchView("overview");

      if (window.innerWidth > 768) {
        this.sidebar.classList.add("player-profile-active", "slide-in");
        document.body.classList.add("sidebar-open");
        if (this.mobileDrawer) {
          this.mobileDrawer.style.display = "none";
          this.mobileDrawer.classList.remove("visible", "expanded");
        }
      } else if (this.mobileDrawer) {
        this.mobileDrawer.style.display = "block";
        this.mobileDrawer.classList.add("visible");
        this.mobileDrawer.classList.remove("expanded");
        this.isDrawerExpanded = false;
        if (typeof updateDrawerTexts === "function") updateDrawerTexts();
      }
    }

    hideForPlayerProfile() {
      if (!this.isPlayerProfileActive) return;
      const nicknameInput = document.getElementById("nickname");
      if (nicknameInput) {
        nicknameInput.value = "";
      }

      this.isPlayerProfileActive = false;
      document.querySelector(".pro-grid")?.style.setProperty("display", "flex");

      this.sidebar.classList.remove("player-profile-active", "slide-in");
      this.sidebar.classList.add("hidden");
      document.body.classList.remove("sidebar-open");

      if (this.mobileDrawer) {
        this.collapseDrawer();
        this.mobileDrawer.classList.remove("visible");
        this.mobileDrawer.style.animation =
          "slideOut 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards";
        setTimeout(() => {
          if (!this.isPlayerProfileActive)
            this.mobileDrawer.style.display = "none";
        }, 400);
      }

      this.closeMobileSidebar();
      if (this.mobileToggle) this.mobileToggle.style.display = "none";

      setTimeout(() => this.sidebar.classList.remove("hidden"), 300);
    }

    switchView(view) {
      if (!this.isPlayerProfileActive) return;

      if (window.innerWidth <= 768) {
        this.closeMobileSidebar();
        this.collapseDrawer();
      }

      this.currentView = view;

      document
        .querySelectorAll(".sidebar-item, .drawer-item")
        .forEach((item) => {
          item.classList.toggle("active", item.dataset.view === view);
        });

      this.updatePlayerStatsView(view);
    }

    async showMatchesStats(render = true) {
      try {
        const playerId = window.currentPlayerData?.player_id;
        if (!playerId) return;

        this.currentMapFilter = null;
        this.currentMatches = [];
        this.allHistoryItems = [];
        this.orderedMatches = [];
        this.availableMapOptions = [];
        this.mapScanOffsets = {};
        this.displayedMatchesCount = 0;
        this.unfilteredDisplayedCount = 0;
        this.isLoadingMore = false;

        const statsContainer = document.querySelector(".stats-container");
        if (render && statsContainer) {
          statsContainer.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading match history...</div>`;
        }

        const pageSize = 100;
        let offset = 0;
        let allHistoryItems = [];
        let totalHistory = 0;
        let pageCount = 0;
        const seenMatchIds = new Set();
        let consecutiveErrors = 0;

        while (consecutiveErrors < 3) {
          let retries = 0;
          let success = false;

          while (retries <= 2 && !success) {
            try {
              const historyUrl = `/api/history?playerId=${encodeURIComponent(
                String(playerId),
              )}&gameId=cs2&limit=${pageSize}&offset=${offset}`;

              const response = await fetch(historyUrl, {
                headers: { Accept: "application/json" },
              });

              if (!response.ok) throw new Error(`HTTP ${response.status}`);

              const data = await response.json();
              if (!data || !data.items) throw new Error("Invalid items");

              if (data.items.length === 0) break;

              if (!totalHistory) {
                totalHistory = data.total || data.items.length;
              }

              for (const item of data.items) {
                const matchId = item?.match_id || item?.matchId;
                if (matchId && !seenMatchIds.has(matchId)) {
                  seenMatchIds.add(matchId);
                  allHistoryItems.push(item);
                }
              }

              success = true;
              consecutiveErrors = 0;

              // Если получили меньше pageSize, значит это реально конец истории
              if (data.items.length < pageSize) {
                break;
              }
            } catch (error) {
              retries++;
              if (retries > 2) {
                consecutiveErrors++;
                console.warn(`Page at offset ${offset} failed after retries`);
              } else {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }
          }

          if (!success) {
            // Прерываем только если это первая страница, иначе работаем с тем, что качнули
            if (pageCount === 0)
              throw new Error("Failed to load match history");
            break;
          }

          pageCount++;
          offset += pageSize;
        }

        if (!allHistoryItems.length) {
          if (render && statsContainer) {
            statsContainer.innerHTML = `<p class="api-error-text">No match history available for this player.</p>`;
          }
          return;
        }

        this.totalMatches = totalHistory || allHistoryItems.length;
        this.allHistoryItems = allHistoryItems;
        this.orderedMatches = new Array(allHistoryItems.length).fill(null);

        const mapCounts = {};
        const segments = window.currentPlayerProfile?.statsData?.segments || [];
        if (window.FaceitAPI?.getAllMapsStats) {
          (window.FaceitAPI.getAllMapsStats(segments) || []).forEach((map) => {
            const key = SidebarManager.normalizeMapKey(map.name);
            const count = Number(map.matches) || 0;
            if (key && count > 0) mapCounts[key] = { name: map.name, count };
          });
        }

        this.availableMapOptions = Object.keys(mapCounts)
          .map((k) => ({
            key: k,
            name: mapCounts[k].name,
            count: mapCounts[k].count,
          }))
          .sort((a, b) => b.count - a.count);

        await this.ensureMatchesLoadedRange(
          0,
          Math.min(this.matchesLimit, this.allHistoryItems.length),
        );
        this.displayedMatchesCount = this.currentMatches.length;
        this.unfilteredDisplayedCount = this.displayedMatchesCount;

        if (render && statsContainer) {
          statsContainer
            .querySelectorAll(".loading-indicator")
            .forEach((el) => el.remove());

          if (!this.availableMapOptions.length) {
            const loadedMapCounts = {};
            this.currentMatches.forEach((m) => {
              const key = SidebarManager.normalizeMapKey(m.map);
              if (key) {
                loadedMapCounts[key] = loadedMapCounts[key] || {
                  name: m.map || key,
                  count: 0,
                };
                loadedMapCounts[key].count++;
              }
            });
            this.availableMapOptions = Object.keys(loadedMapCounts).map(
              (k) => ({
                key: k,
                name: loadedMapCounts[k].name,
                count: loadedMapCounts[k].count,
              }),
            );
          }

          const chipsHtml = `
            <div class="mc-filter">
              <button type="button" class="mc-chip active" data-map-filter="">
                <span class="mc-chip-name">All maps</span>
                <span class="mc-chip-count">${this.totalMatches}</span>
              </button>
              ${this.availableMapOptions
                .map(
                  (o) => `
              <button type="button" class="mc-chip" data-map-filter="${o.key}" data-map="${o.key}">
                <span class="mc-chip-name">${o.name}</span>
                <span class="mc-chip-count">${o.count}</span>
              </button>`,
                )
                .join("")}
            </div>`;

          statsContainer.querySelector(".mc-filter")?.remove();
          statsContainer.insertAdjacentHTML("beforeend", chipsHtml);
          const chipsEl = statsContainer.querySelector(".mc-filter");
          if (typeof applyMapCardBackgrounds === "function")
            applyMapCardBackgrounds(chipsEl);

          chipsEl.addEventListener("click", async (e) => {
            const chip = e.target.closest(".mc-chip");
            if (!chip || chip.classList.contains("active")) return;
            chipsEl
              .querySelectorAll(".mc-chip")
              .forEach((c) => c.classList.toggle("active", c === chip));
            // на мобильных подкручиваем ленту, чтобы выбранный чип был виден
            chip.scrollIntoView({
              behavior: "smooth",
              inline: "center",
              block: "nearest",
            });

            const requestId = (this.filterRequestId =
              (this.filterRequestId || 0) + 1);
            this.currentMapFilter = chip.dataset.mapFilter || null;

            if (this.currentMapFilter) {
              const selectedMapOption = this.availableMapOptions.find(
                (opt) => opt.key === this.currentMapFilter,
              );
              this.renderMatchesLoadingIndicator();
              await this.ensureMatchesLoadedForMap(
                this.currentMapFilter,
                this.matchesLimit,
                selectedMapOption?.count || 0,
              );
              if (requestId !== this.filterRequestId) return;
              const matchesToDisplay = this.getFilteredMatches().slice(
                0,
                this.matchesLimit,
              );
              this.displayedMatchesCount = matchesToDisplay.length;
              this.displayMatchHistory(matchesToDisplay, true);
            } else {
              const visibleCount =
                this.unfilteredDisplayedCount > 0
                  ? this.unfilteredDisplayedCount
                  : this.matchesLimit;
              await this.ensureMatchesLoadedRange(0, visibleCount);
              if (requestId !== this.filterRequestId) return;
              this.displayedMatchesCount = Math.min(
                visibleCount,
                this.currentMatches.length,
              );
              this.unfilteredDisplayedCount = this.displayedMatchesCount;
              this.displayMatchHistory(
                this.currentMatches.slice(0, this.displayedMatchesCount),
                true,
              );
            }
          });

          this.displayMatchHistory(
            this.currentMatches.slice(0, this.matchesLimit),
            true,
          );
        }
      } catch (error) {
        const statsContainer = document.querySelector(".stats-container");
        if (render && statsContainer) {
          statsContainer.innerHTML = `<p class="api-error-text">${error.message}</p>`;
        }
      }
    }

    async fetchMatchStats(matchId, playerId) {
      let retries = 0;
      while (retries < 3) {
        try {
          const response = await fetch(
            `/api/match-stats?matchId=${encodeURIComponent(String(matchId))}`,
            {
              headers: { Accept: "application/json" },
            },
          );

          if (!response.ok) {
            if (response.status === 404) {
              try {
                const infoRes = await fetch(
                  `/api/server?action=match-info&matchId=${encodeURIComponent(String(matchId))}`,
                );
                if (infoRes.ok)
                  return extractFallbackMatch(await infoRes.json(), playerId);
              } catch {}
              return { map: "Unknown Map", score: "0 - 0", playerStats: {} };
            }
            throw new Error(`Failed to fetch match stats: ${response.status}`);
          }

          const statsData = await response.json();
          if (!statsData.rounds?.length) {
            try {
              const infoRes = await fetch(
                `/api/server?action=match-info&matchId=${encodeURIComponent(String(matchId))}`,
              );
              if (infoRes.ok)
                return extractFallbackMatch(await infoRes.json(), playerId);
            } catch {}
            return {
              map: "Map data not available",
              score: "Score not available",
              playerStats: {},
            };
          }

          const round = statsData.rounds[0];
          return {
            map: round.round_stats?.Map || "Unknown Map",
            score: round.round_stats?.Score || "0 - 0",
            playerStats: extractPlayerStats(round.teams, playerId),
          };
        } catch (error) {
          retries++;
          if (retries >= 3) throw error;
          await new Promise((r) => setTimeout(r, 1000 * retries));
        }
      }
    }

    formatMatchData(match, statsData, playerId, index, totalMatches) {
      try {
        const safePlayerStats = statsData?.playerStats || {};
        const timestamp = Number(match.finished_at) * 1000;
        const kills = Number(safePlayerStats.Kills) || 0;
        const headshots = Number(safePlayerStats.Headshots) || 0;

        return {
          matchId: match.match_id || "Unknown Match ID",
          totalMatchNumber: totalMatches - index,
          date: !isNaN(timestamp)
            ? new Date(timestamp).toLocaleDateString()
            : "Unknown Date",
          map: statsData?.map || "Map data not available",
          score: statsData?.score || "0 - 0",
          playerStats: safePlayerStats,
          kills,
          deaths: safePlayerStats.Deaths || 0,
          assists: safePlayerStats.Assists || 0,
          headshots: kills > 0 ? Math.round((headshots / kills) * 100) : 0,
          kdRatio: safePlayerStats["K/D Ratio"] || 0,
          mvps: safePlayerStats.MVPs || 0,
          result: safePlayerStats.Result === "1" ? "WIN" : "LOSS",
        };
      } catch (error) {
        return {
          matchId: "Error",
          totalMatchNumber: "Error",
          date: "Error",
          map: "Error",
          score: "Error",
          playerStats: {},
          kills: 0,
          deaths: 0,
          assists: 0,
          headshots: 0,
          kdRatio: 0,
          mvps: 0,
          result: "Error",
        };
      }
    }

    renderMatchesLoadingIndicator() {
      const statsContainer = document.querySelector(".stats-container");
      if (!statsContainer) return;
      let wrapper = statsContainer.querySelector(".matches-content-wrapper");
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "matches-content-wrapper";
        statsContainer.appendChild(wrapper);
      }
      wrapper.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Processing matches, please wait...</div>`;
    }

    async ensureMatchesLoadedRange(startIndex, endIndexExclusive) {
      const playerId = window.currentPlayerData?.player_id;
      if (!playerId || !this.allHistoryItems.length) return;

      const cappedStart = Math.max(0, startIndex);
      const cappedEnd = Math.min(
        endIndexExclusive,
        this.allHistoryItems.length,
      );
      if (cappedStart >= cappedEnd) return;

      const indexesToLoad = [];
      for (let i = cappedStart; i < cappedEnd; i++) {
        if (!this.orderedMatches[i]) indexesToLoad.push(i);
      }
      if (!indexesToLoad.length) {
        this.currentMatches = this.orderedMatches.filter(Boolean);
        return;
      }

      const BATCH_SIZE = 5;
      for (let i = 0; i < indexesToLoad.length; i += BATCH_SIZE) {
        const batchIndexes = indexesToLoad.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batchIndexes.map(async (historyIndex) => {
            const historyMatch = this.allHistoryItems[historyIndex];
            const matchId = historyMatch?.match_id || historyMatch?.matchId;
            if (!historyMatch || !matchId) return null;

            try {
              const stats = await this.fetchMatchStats(matchId, playerId);
              return this.formatMatchData(
                historyMatch,
                stats,
                playerId,
                historyIndex,
                this.totalMatches,
              );
            } catch (error) {
              return this.formatMatchData(
                historyMatch,
                null,
                playerId,
                historyIndex,
                this.totalMatches,
              );
            }
          }),
        );

        batchIndexes.forEach((historyIndex, idx) => {
          this.orderedMatches[historyIndex] = batchResults[idx];
        });
      }

      this.currentMatches = this.orderedMatches.filter(Boolean);
    }

    async ensureMatchesLoadedForMap(mapKey, targetCount, expectedCount = 0) {
      if (!mapKey) return;
      const requiredCount =
        expectedCount > 0 ? Math.min(targetCount, expectedCount) : targetCount;

      if (this.getFilteredMatches().length >= requiredCount) return;

      const chunkSize = this.matchesLimit;
      let chunkStart = this.mapScanOffsets[mapKey] || 0;

      while (
        chunkStart < this.allHistoryItems.length &&
        this.getFilteredMatches().length < requiredCount
      ) {
        const chunk_end = Math.min(
          chunkStart + chunkSize,
          this.allHistoryItems.length,
        );
        await this.ensureMatchesLoadedRange(chunkStart, chunk_end);
        this.mapScanOffsets[mapKey] = chunk_end;
        chunkStart = chunk_end;
      }
    }

    updatePlayerStatsView(view) {
      const statsContainer = document.querySelector(".stats-container");
      const playerCard = document.querySelector(".player-card");
      if (!playerCard || !statsContainer) return;

      const search = document.getElementById("search");

      switch (view) {
        case "overview":
          if (search) search.style.display = "none";
          statsContainer.innerHTML = "";
          renderOverviewStats(statsContainer);
          break;

        case "matches":
          statsContainer.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading match history...</div>`;
          statsContainer.style.display = "block";
          playerCard.style.display = "block";
          this.showMatchesStats();
          break;

        case "records":
          if (search) search.style.display = "none";
          playerCard.style.display = "block";
          statsContainer.style.display = "block";
          statsContainer.innerHTML = `
            <div class="record-filters">
              <select id="recordFilterSelect">
                <option value="mostKills">Most Kills</option>
                <option value="mostAssists">Most Assists</option>
                <option value="highestKD">Highest K/D</option>
                <option value="highestKDDifference">Highest K/D Difference</option>
                <option value="mostMVPs">Most MVPs</option>
                <option value="highestHeadshotPct">Highest HS%</option>
              </select>
            </div>
            <div class="record-display">
              <div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading records...</div>
            </div>`;

          document
            .getElementById("recordFilterSelect")
            ?.addEventListener("change", (e) => {
              this.showRecord(e.target.value);
            });
          this.showRecord("mostKills");
          break;

        case "maps":
          statsContainer.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading maps...</div>`;
          statsContainer.style.display = "block";
          playerCard
            .querySelectorAll(".stats-box")
            .forEach((box) => (box.style.display = "none"));

          try {
            const segments =
              window.currentPlayerProfile?.statsData?.segments || [];
            if (!segments.length || !window.FaceitAPI?.getAllMapsStats) {
              statsContainer.innerHTML = `<p>Not enough data to display map statistics.</p>`;
              return;
            }

            const allMapsStats =
              window.FaceitAPI.getAllMapsStats(segments) || [];
            allMapsStats.sort((a, b) => b.winRate - a.winRate);

            if (allMapsStats.length > 0) {
              let html = `<div class="maps-grid">`;
              allMapsStats.forEach((map) => {
                let cardClass = "map-card";
                let winRateColor = "#4caf50";
                if (map.winRate < 40) {
                  cardClass += " poor-performance";
                  winRateColor = "#f44336";
                } else if (map.winRate < 55) {
                  cardClass += " average-performance";
                  winRateColor = "#ff9800";
                } else {
                  cardClass += " good-performance";
                }

                const mapKey = SidebarManager.normalizeMapKey(map.name);
                const kd =
                  typeof map.kd === "number" ? map.kd : parseFloat(map.kd);
                const avgKills =
                  typeof map.avgKills === "number"
                    ? map.avgKills
                    : parseFloat(map.avgKills);
                const adr =
                  typeof map.adr === "number" ? map.adr : parseFloat(map.adr);

                html += `
                  <div class="${cardClass}" data-map="${mapKey}">
                    <div class="map-card-header">
                      <h3 class="map-name">${map.name}</h3>
                      <div class="win-rate-badge" style="background: ${winRateColor}">${map.winRate.toFixed(1)}%</div>
                    </div>
                    <div class="map-card-body">
                      <div class="map-stat-row">
                        <div class="map-stat-item"><i class="fas fa-gamepad"></i><span class="stat-label">Matches</span><span class="stat-value">${map.matches}</span></div>
                        <div class="map-stat-item"><i class="fas fa-crosshairs"></i><span class="stat-label">K/D</span><span class="stat-value">${!isNaN(kd) ? kd.toFixed(2) : "-"}</span></div>
                      </div>
                      <div class="map-stat-row">
                        <div class="map-stat-item"><i class="fas fa-bolt"></i><span class="stat-label">Avg.kills</span><span class="stat-value">${!isNaN(avgKills) ? avgKills.toFixed(1) : "-"}</span></div>
                        <div class="map-stat-item"><i class="fas fa-trophy"></i><span class="stat-label">Win Rate</span><span class="stat-value">${map.winRate.toFixed(1)}%</span></div>
                      </div>
                      <div class="map-stat-row">
                        <div class="map-stat-item"><i class="fas fa-fire"></i><span class="stat-label">ADR</span><span class="stat-value">${!isNaN(adr) ? adr.toFixed(1) : "-"}</span></div>
                        <div class="map-stat-item"><i class="fas fa-star"></i><span class="stat-label">Clutches</span><span class="stat-value">${typeof map.clutches === "number" ? map.clutches : "-"}</span></div>
                      </div>
                    </div>
                  </div>`;
              });
              html += "</div>";
              statsContainer.innerHTML = html;
              if (typeof applyMapCardBackgrounds === "function")
                applyMapCardBackgrounds(statsContainer);
            } else {
              statsContainer.innerHTML = `<p>Not enough data to display map statistics.</p>`;
            }
          } catch (error) {
            statsContainer.innerHTML = `<p class="api-error-text">Ошибка загрузки данных карт</p>`;
          }
          break;
        case "compare": {
          if (search) search.style.display = "none";
          playerCard.style.display = "block";
          playerCard
            .querySelectorAll(".stats-box")
            .forEach((box) => (box.style.display = "none"));
          statsContainer.style.display = "block";
          statsContainer.innerHTML = `
            <div class="metrics-card compare-card">
              <div class="metrics-card-header">
                <i class="fas fa-balance-scale icon-accent"></i>
                <span>Compare</span>
              </div>
              <div class="compare-form">
                <input type="text" id="compareInput" class="compare-input" placeholder="Steam URL or FACEIT Nickname" autocomplete="off" spellcheck="false" />
                <button type="button" id="compareBtn" class="compare-btn"><i class="fas fa-search"></i> Compare</button>
              </div>
              <div class="compare-status" id="compareStatus"></div>
              <div class="compare-output" id="compareOutput"></div>
            </div>`;

          const compareInput = document.getElementById("compareInput");
          const compareBtn = document.getElementById("compareBtn");
          const compareStatus = document.getElementById("compareStatus");
          const compareOutput = document.getElementById("compareOutput");

          const setStatus = (type, text) => {
            const icons = {
              loading: "fa-spinner fa-spin",
              error: "fa-circle-exclamation",
              ok: "fa-circle-check",
            };
            compareStatus.className = `compare-status ${type}`;
            compareStatus.innerHTML = `<i class="fas ${icons[type]}"></i><span>${text}</span>`;
          };

          const esc = (s) =>
            String(s ?? "").replace(
              /[&<>"']/g,
              (c) =>
                ({
                  "&": "&amp;",
                  "<": "&lt;",
                  ">": "&gt;",
                  '"': "&quot;",
                  "'": "&#39;",
                })[c],
            );

          const runCompare = async () => {
            const currentProfile = window.currentPlayerProfile;
            const currentPlayer = window.currentPlayerData;
            if (!currentProfile || !currentPlayer?.player_id) {
              setStatus(
                "error",
                "No data available for the current player to compare.",
              );
              return;
            }

            // 1. Проверка ввода
            const raw = compareInput.value.trim();
            if (!raw) {
              setStatus(
                "error",
                "Please enter a Steam URL or FACEIT Nickname.",
              );
              return;
            }

            compareBtn.disabled = true;
            compareInput.disabled = true;
            compareOutput.innerHTML = "";
            setStatus("loading", "Checking profile...");

            try {
              // 2. Находим игрока Faceit (Steam-ссылка / ник / ссылка на Faceit)
              let opponentPlayer;
              try {
                if (window.AppPlayerResolve?.isSteamInput(raw)) {
                  opponentPlayer =
                    await window.AppPlayerResolve.resolveFaceitPlayerFromSteam(
                      raw,
                    );
                  if (!opponentPlayer?.games && opponentPlayer?.nickname) {
                    opponentPlayer = await window.FaceitAPI.getPlayerData(
                      opponentPlayer.nickname,
                    );
                  }
                } else {
                  opponentPlayer = await window.FaceitAPI.getPlayerData(raw);
                }
              } catch (err) {
                if (/^Error API: 404/.test(err.message)) {
                  throw new Error("Player not found on Faceit.");
                }
                throw err;
              }

              // 3. Проверка валидности профиля
              if (!opponentPlayer?.player_id)
                throw new Error("Proflile data is incomplete or invalid.");
              if (!opponentPlayer.games?.cs2)
                throw new Error(
                  "This player does not have CS2 stats on Faceit.",
                );
              if (opponentPlayer.player_id === currentPlayer.player_id) {
                throw new Error(
                  "This is the same player as the current profile.",
                );
              }

              let statsData;
              try {
                statsData = await window.FaceitAPI.getStatsData(
                  opponentPlayer.player_id,
                  "cs2",
                );
              } catch {
                throw new Error("Не удалось загрузить статистику игрока.");
              }
              const lifetime = statsData?.lifetime || {};
              const segments = statsData?.segments || [];
              const avgStats = window.FaceitAPI.calculateAvgStats(
                lifetime,
                segments,
                "cs2",
              );
              if (!avgStats.totalMatches)
                throw new Error(
                  "У игрока нет сыгранных матчей CS2 для сравнения.",
                );

              const [currentElo, opponentElo] = await Promise.all([
                window.FaceitAPI.getCurrentElo(
                  currentPlayer.player_id,
                  "cs2",
                  currentPlayer.games?.cs2?.faceit_elo,
                ),
                window.FaceitAPI.getCurrentElo(
                  opponentPlayer.player_id,
                  "cs2",
                  opponentPlayer.games?.cs2?.faceit_elo,
                ),
              ]);

              // Профиль соперника в том же формате, что и window.currentPlayerProfile
              const opponentProfile = {
                avgStats,
                lifetime,
                allMaps: window.FaceitAPI.getAllMapsStats(segments),
              };

              // Пользователь мог уйти с вкладки, пока шёл запрос
              if (!compareOutput.isConnected) return;

              // 4. Сравнение: Faceit-показатели + метрики из metrics-grid
              const metricsA = window.computeHltvMetrics(currentProfile);
              const metricsB = window.computeHltvMetrics(opponentProfile);
              const fmtInt = (v) => window.FaceitAPI.formatNumber(v);

              const faceitRows = [
                {
                  label: "Matches",
                  a: Number(currentProfile.avgStats?.totalMatches) || 0,
                  b: avgStats.totalMatches,
                  fmt: fmtInt,
                  countInScore: false, // опыт, а не уровень игры
                },
                {
                  label: "ELO",
                  a: Number(currentElo) || 0,
                  b: Number(opponentElo) || 0,
                  fmt: fmtInt,
                  countInScore: true,
                },
                {
                  label: "K/D",
                  a: parseFloat(currentProfile.avgStats?.kd) || 0,
                  b: parseFloat(avgStats.kd) || 0,
                  fmt: (v) => v.toFixed(2),
                  countInScore: true,
                },
              ].map((r) => ({
                ...r,
                fa: r.fmt(r.a),
                fb: r.fmt(r.b),
                max: Math.max(r.a, r.b) || 1,
              }));

              const hltvRows = metricsA.map((mA, i) => ({
                label: mA.label,
                a: mA.score,
                b: metricsB[i].score,
                fa: mA.displayValue,
                fb: metricsB[i].displayValue,
                max: 100,
                countInScore: true,
              }));

              let winsA = 0;
              let winsB = 0;
              const buildRows = (list) =>
                list
                  .map((r) => {
                    let winner = "tie";
                    if (r.a > r.b) winner = "a";
                    else if (r.b > r.a) winner = "b";
                    if (r.countInScore && winner === "a") winsA++;
                    if (r.countInScore && winner === "b") winsB++;

                    return `
                    <div class="compare-row" data-winner="${winner}">
                      <div class="compare-row-top">
                        <span class="compare-val a">${r.fa}</span>
                        <span class="compare-label">${r.label}</span>
                        <span class="compare-val b">${r.fb}</span>
                      </div>
                      <div class="compare-track">
                        <div class="compare-half left"><div class="compare-fill" style="--w:${((r.a / r.max) * 100).toFixed(1)}%"></div></div>
                        <div class="compare-half right"><div class="compare-fill" style="--w:${((r.b / r.max) * 100).toFixed(1)}%"></div></div>
                      </div>
                    </div>`;
                  })
                  .join("");

              const faceitRowsHtml = buildRows(faceitRows);
              const hltvRowsHtml = buildRows(hltvRows);

              const chip = (player, side) => `
                <div class="compare-player ${side}">
                  ${
                    player?.avatar
                      ? `<img class="compare-avatar" src="${esc(player.avatar)}" alt="" onerror="this.src='/assets/favicon.svg';" />`
                      : `<span class="compare-avatar compare-avatar-fallback"><i class="fas fa-user"></i></span>`
                  }
                  <span class="compare-nickname">${esc(player?.nickname || "-")}</span>
                </div>`;

              compareOutput.innerHTML = `
                <div class="compare-result">
                  <div class="compare-players">
                    ${chip(currentPlayer, "left")}
                    <div class="compare-score">
                      <span class="${winsA > winsB ? "lead" : ""}">${winsA}</span>
                      <span>:</span>
                      <span class="${winsB > winsA ? "lead" : ""}">${winsB}</span>
                    </div>
                    ${chip(opponentPlayer, "right")}
                  </div>
                  <div class="compare-section-title">Faceit</div>
                  <div class="compare-rows">${faceitRowsHtml}</div>
                  <div class="compare-section-title">HLTV Performance Profile</div>
                  <div class="compare-rows">${hltvRowsHtml}</div>
                </div>`;

              setStatus(
                "ok",
                `Player was found: ${esc(opponentPlayer.nickname)}`,
              );

              // двойной rAF, чтобы полосы анимировались от краёв
              const result = compareOutput.querySelector(".compare-result");
              requestAnimationFrame(() =>
                requestAnimationFrame(() => result?.classList.add("animate")),
              );
            } catch (error) {
              if (compareOutput.isConnected) {
                setStatus(
                  "error",
                  esc(error.message || "Не удалось выполнить сравнение."),
                );
              }
            } finally {
              compareBtn.disabled = false;
              compareInput.disabled = false;
            }
          };

          compareBtn.addEventListener("click", runCompare);
          compareInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") runCompare();
          });
          break;
        }
      }
      playerCard.style.opacity = "1";
    }

    displayMatchHistory(matches, isInitialLoad = false) {
      const statsContainer = document.querySelector(".stats-container");
      if (!statsContainer) return;

      let wrapper = statsContainer.querySelector(".matches-content-wrapper");
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "matches-content-wrapper";
        statsContainer.appendChild(wrapper);
      }

      if (!matches?.length) {
        wrapper.innerHTML = `<p>No match history available.</p>`;
        return;
      }

      let matchHistoryContainer = `<div class="match-history">${matches.map(buildMatchItemHtml).join("")}</div>`;

      const selectedMapOption = this.currentMapFilter
        ? this.availableMapOptions.find(
            (opt) => opt.key === this.currentMapFilter,
          )
        : null;
      const allHistoryScanned =
        this.currentMatches.length >= (this.allHistoryItems || []).length;
      const totalFiltered = this.currentMapFilter
        ? allHistoryScanned
          ? this.getFilteredMatches().length
          : selectedMapOption?.count || this.getFilteredMatches().length
        : this.totalMatches || this.allHistoryItems.length;

      if (matches.length < totalFiltered) {
        const shownPct = Math.round((matches.length / totalFiltered) * 100);
        const nextCount = Math.min(
          this.matchesLimit,
          totalFiltered - matches.length,
        );
        matchHistoryContainer += `
          <div class="mc-more">
            <div class="mc-more-info">
              <span>Showing <b>${matches.length}</b> of <b>${totalFiltered}</b></span>
              <div class="mc-more-track"><div class="mc-more-fill" style="width: ${shownPct}%"></div></div>
            </div>
            <button type="button" class="mc-more-btn" onclick="sidebarManager.loadMoreMatches()">
              <i class="fas fa-chevron-down"></i> Show More (+${nextCount})
            </button>
          </div>`;
      }

      wrapper.innerHTML = matchHistoryContainer;
      if (typeof applyMapCardBackgrounds === "function")
        applyMapCardBackgrounds(wrapper);
    }

    async loadMoreMatches() {
      if (this.isLoadingMore) return;
      this.isLoadingMore = true;

      const showMoreContainer = document.querySelector(".mc-more");
      if (showMoreContainer) {
        showMoreContainer.innerHTML = `<div class="loading-indicator small"><i class="fas fa-spinner fa-spin"></i>Processing matches...</div>`;
      }

      try {
        const currentlyDisplayedCount =
          document.querySelectorAll(".mc-card").length;
        const newTotalDisplayed = currentlyDisplayedCount + this.matchesLimit;

        if (this.currentMapFilter) {
          const selectedMapOption = this.availableMapOptions.find(
            (opt) => opt.key === this.currentMapFilter,
          );
          await this.ensureMatchesLoadedForMap(
            this.currentMapFilter,
            newTotalDisplayed,
            selectedMapOption?.count || 0,
          );
          const matchesToDisplay = this.getFilteredMatches().slice(
            0,
            newTotalDisplayed,
          );
          this.displayedMatchesCount = matchesToDisplay.length;
          this.displayMatchHistory(matchesToDisplay, false);
        } else {
          const targetCount = Math.min(
            newTotalDisplayed,
            this.allHistoryItems.length,
          );
          await this.ensureMatchesLoadedRange(0, targetCount);
          const matchesToDisplay = this.currentMatches.slice(0, targetCount);
          this.displayedMatchesCount = matchesToDisplay.length;
          this.unfilteredDisplayedCount = this.displayedMatchesCount;
          this.displayMatchHistory(matchesToDisplay, false);
        }
      } finally {
        this.isLoadingMore = false;
      }
    }

    async showRecord(recordType) {
      const recordDisplay = document.querySelector(".record-display");
      if (!recordDisplay) return;

      recordDisplay.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading records...</div>`;

      if (!this.allHistoryItems?.length) await this.showMatchesStats(false);
      if (!this.allHistoryItems?.length) {
        recordDisplay.innerHTML = `<p>Not enough data to display records.</p>`;
        return;
      }

      try {
        await this.ensureMatchesLoadedRange(0, this.allHistoryItems.length);
      } catch (err) {}

      if (!this.currentMatches.length) {
        recordDisplay.innerHTML = `<p>Not enough data to display records.</p>`;
        return;
      }

      const recordLabelMap = {
        mostKills: "Most Kills",
        mostAssists: "Most Assists",
        highestKD: "Highest K/D",
        highestKDDifference: "Highest K/D Diff",
        mostMVPs: "Most MVPs",
        highestHeadshotPct: "Highest HS%",
      };

      const rankedMatches = this.currentMatches
        .filter((match) => match.result !== "Error")
        .map((match) => {
          let value;
          switch (recordType) {
            case "mostKills":
              value = Number(match.kills);
              break;
            case "mostAssists":
              value = Number(match.assists);
              break;
            case "highestKD":
              value = Number(match.kdRatio);
              break;
            case "highestKDDifference":
              value = Number(match.kills) - Number(match.deaths);
              break;
            case "mostMVPs":
              value = Number(match.mvps);
              break;
            case "highestHeadshotPct":
              value =
                Number(match.kills) > 0
                  ? (Number(match.headshots) / Number(match.kills)) * 100
                  : 0;
              break;
            default:
              value = null;
          }
          return value === null || Number.isNaN(value)
            ? null
            : { match, value };
        })
        .filter(Boolean)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      if (!rankedMatches.length) {
        recordDisplay.innerHTML = `<p>Not enough data to display records.</p>`;
        return;
      }

      recordDisplay.innerHTML = `
        <div class="record-match-list">
          <h3>${recordLabelMap[recordType] || ""}</h3>
          <div class="match-history">${rankedMatches.map(({ match }) => buildMatchItemHtml(match)).join("")}</div>
        </div>`;
      if (typeof applyMapCardBackgrounds === "function")
        applyMapCardBackgrounds(recordDisplay);
    }

    toggleMobileSidebar() {
      if (this.isPlayerProfileActive) {
        this.isMobileOpen
          ? this.closeMobileSidebar()
          : this.openMobileSidebar();
      }
    }

    openMobileSidebar() {
      if (!this.isPlayerProfileActive) return;
      this.isMobileOpen = true;
      this.sidebar.classList.add("mobile-active");
      this.mobileOverlay.classList.add("active");
      document.body.style.overflow = "hidden";
    }

    closeMobileSidebar() {
      this.isMobileOpen = false;
      this.sidebar.classList.remove("mobile-active");
      this.mobileOverlay.classList.remove("active");
      document.body.style.overflow = "";
    }

    toggleDrawer() {
      if (this.isPlayerProfileActive) {
        this.isDrawerExpanded ? this.collapseDrawer() : this.expandDrawer();
      }
    }

    expandDrawer() {
      this.isDrawerExpanded = true;
      if (this.mobileDrawer) {
        this.mobileDrawer.classList.add("expanded");
        this.mobileOverlay?.classList.add("active");
        document.body.style.overflow = "hidden";
      }
    }

    collapseDrawer() {
      this.isDrawerExpanded = false;
      if (this.mobileDrawer) {
        this.mobileDrawer.classList.remove("expanded");
        this.mobileOverlay?.classList.remove("active");
        document.body.style.overflow = "";
      }
    }

    handleResize() {
      if (window.innerWidth > 768) {
        this.closeMobileSidebar();
        this.collapseDrawer();

        if (this.mobileDrawer) {
          this.mobileDrawer.classList.remove("visible", "expanded");
          this.mobileDrawer.style.display = "none";
        }

        if (this.isPlayerProfileActive) {
          this.sidebar.classList.add("player-profile-active", "slide-in");
          document.body.classList.add("sidebar-open");
        }
      } else {
        document.body.classList.remove("sidebar-open");
        this.sidebar.classList.remove("slide-in", "player-profile-active");

        if (this.mobileDrawer) {
          if (this.isPlayerProfileActive) {
            this.mobileDrawer.style.display = "block";
            this.mobileDrawer.classList.add("visible");
          } else {
            this.mobileDrawer.classList.remove("visible", "expanded");
            this.mobileDrawer.style.display = "none";
          }
        }
      }
    }
  }

  window.SidebarManager = SidebarManager;
}
