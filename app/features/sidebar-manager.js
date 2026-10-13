function isSteamInput(value) {
  if (!value) return false;
  const v = String(value).trim();
  if (!v) return false;
  if (/^\d{17}$/.test(v)) return true;
  if (/steamcommunity\.com\/(id|profiles)\//i.test(v)) return true;
  return false;
}

async function resolveFaceitPlayerFromSteam(steamInput) {
  const url = `/api/faceit-by-steam?steam=${encodeURIComponent(
    String(steamInput).trim(),
  )}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    throw new Error(data?.error || `Steam resolve failed (${r.status})`);
  }
  if (!data?.player) {
    throw new Error("Faceit player not found for this Steam account");
  }
  return data.player;
}

function checkFaceitAPI() {
  if (typeof window.FaceitAPI === "undefined") {
    console.error("FaceitAPI не загружен!");
    return false;
  }

  const requiredMethods = [
    "getPlayerData",
    "getStatsData",
    "getCurrentElo",
    "getCountryName",
    "calculateAvgStats",
    "analyzeMaps",
    "formatNumber",
  ];

  const missingMethods = requiredMethods.filter(
    (method) => typeof window.FaceitAPI[method] !== "function",
  );

  if (missingMethods.length > 0) {
    console.error("Отсутствуют методы FaceitAPI:", missingMethods);
    return false;
  }

  console.log("FaceitAPI успешно загружен и готов к работе");
  return true;
}
if (typeof window === "undefined") {
  let extractPlayerStats2 = function (teams, playerId) {
      for (const team of teams || []) {
        const player = (team.players || []).find(
          (p) => p.player_id === playerId,
        );
        if (player) return player.player_stats || {};
      }
      return {};
    },
    enhanceSelect2 = function (select, iconMap = {}) {
      if (!select || select.dataset.enhanced === "1") return;
      select.dataset.enhanced = "1";
      const options = Array.from(select.options);
      if (!options.length) return;
      const mk = (tag, cls, text) => {
          const el = document.createElement(tag);
          return (
            cls && (el.className = cls),
            text != null && (el.textContent = text),
            el
          );
        },
        icon = (value) => {
          const i = mk("i", `fas ${iconMap[value] || "fa-circle"} rf-icon`);
          return (i.setAttribute("aria-hidden", "true"), i);
        },
        root = mk("div", "rf-dropdown"),
        trigger = mk("button", "rf-trigger");
      ((trigger.type = "button"),
        trigger.setAttribute("aria-haspopup", "listbox"),
        trigger.setAttribute("aria-expanded", "false"));
      const triggerMain = mk("span", "rf-trigger-main"),
        label = mk("span", "rf-label"),
        chevron = mk("i", "fas fa-chevron-down rf-chevron");
      (chevron.setAttribute("aria-hidden", "true"),
        trigger.append(triggerMain, chevron));
      const menu = mk("ul", "rf-menu");
      menu.setAttribute("role", "listbox");
      const items = options.map((opt, idx) => {
        const li = mk("li", "rf-option");
        (li.setAttribute("role", "option"), (li.dataset.index = String(idx)));
        const check = mk("i", "fas fa-check rf-check");
        return (
          check.setAttribute("aria-hidden", "true"),
          li.append(
            icon(opt.value),
            mk("span", "rf-text", opt.textContent),
            check,
          ),
          menu.appendChild(li),
          li
        );
      });
      (select.parentNode.insertBefore(root, select),
        root.append(trigger, menu, select),
        select.classList.add("rf-native"),
        (select.tabIndex = -1),
        select.setAttribute("aria-hidden", "true"));
      let activeIndex = select.selectedIndex >= 0 ? select.selectedIndex : 0;
      const syncSelected = () => {
          const sel = select.selectedIndex >= 0 ? select.selectedIndex : 0;
          (items.forEach((li, i) =>
            li.setAttribute("aria-selected", i === sel ? "true" : "false"),
          ),
            triggerMain.replaceChildren(icon(options[sel].value), label),
            (label.textContent = options[sel].textContent));
        },
        setActive = (idx) => {
          ((activeIndex = (idx + items.length) % items.length),
            items.forEach((li, i) =>
              li.classList.toggle("active", i === activeIndex),
            ),
            items[activeIndex].scrollIntoView({ block: "nearest" }));
        },
        isOpen = () => root.classList.contains("open"),
        open = () => {
          (root.classList.add("open"),
            trigger.setAttribute("aria-expanded", "true"),
            setActive(select.selectedIndex >= 0 ? select.selectedIndex : 0));
        },
        close = (focusTrigger = !1) => {
          (root.classList.remove("open"),
            trigger.setAttribute("aria-expanded", "false"),
            items.forEach((li) => li.classList.remove("active")),
            focusTrigger && trigger.focus());
        },
        choose = (idx) => {
          const changed = select.selectedIndex !== idx;
          ((select.selectedIndex = idx),
            syncSelected(),
            close(!0),
            changed &&
              select.dispatchEvent(new Event("change", { bubbles: !0 })));
        };
      (trigger.addEventListener("click", () => (isOpen() ? close() : open())),
        items.forEach((li, i) => {
          (li.addEventListener("mousedown", (e) => e.preventDefault()),
            li.addEventListener("mouseenter", () => setActive(i)),
            li.addEventListener("click", () => choose(i)));
        }),
        root.addEventListener("keydown", (e) => {
          switch (e.key) {
            case "ArrowDown":
            case "ArrowUp": {
              if ((e.preventDefault(), !isOpen())) return open();
              setActive(activeIndex + (e.key === "ArrowDown" ? 1 : -1));
              break;
            }
            case "Home":
            case "End":
              if (!isOpen()) return;
              (e.preventDefault(),
                setActive(e.key === "Home" ? 0 : items.length - 1));
              break;
            case "Enter":
            case " ":
              if (!isOpen()) return;
              (e.preventDefault(), choose(activeIndex));
              break;
            case "Escape":
              isOpen() && (e.preventDefault(), close(!0));
              break;
            case "Tab":
              isOpen() && close();
              break;
          }
        }));
      const onOutside = (e) => {
        if (!root.isConnected) {
          document.removeEventListener("pointerdown", onOutside);
          return;
        }
        root.contains(e.target) || close();
      };
      (document.addEventListener("pointerdown", onOutside), syncSelected());
    },
    extractFallbackMatch2 = function (
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
        playerStats: extractPlayerStats2(
          fallbackRound?.teams || infoData.teams,
          playerId,
        ),
      };
    },
    buildMatchUrl2 = function (matchId) {
      if (!matchId) return "";
      const lang = window.currentLanguage || "en";
      return matchId.startsWith("1-")
        ? `https://www.faceit.com/${lang}/cs2/room/${matchId}`
        : `https://www.faceit.com/${lang}/matchroom/${matchId}`;
    },
    formatKdRatio2 = function (kills, deaths) {
      return deaths > 0
        ? (kills / deaths).toFixed(2)
        : kills > 0
          ? "\u221E"
          : "0.00";
    },
    buildMatchItemHtml2 = function (match) {
      if (match.result === "Error")
        return `
        <div class="mc-card mc-error">
          <div class="mc-info">
            <span class="mc-map">Error loading match</span>
            <span class="mc-date">Failed to load match data</span>
          </div>
        </div>`;
      const resultClass = match.result.toLowerCase(),
        matchUrl = buildMatchUrl2(match.matchId),
        mapKey = SidebarManager.normalizeMapKey(match.map),
        mapName = /^de_/i.test(match.map)
          ? match.map.replace(/^de_/i, "").replace(/^./, (c) => c.toUpperCase())
          : match.map,
        kills = Number(match.kills) || 0,
        deaths = Number(match.deaths) || 0,
        kd = deaths > 0 ? kills / deaths : kills,
        stats = [
          { label: "Kills", value: kills },
          { label: "Deaths", value: deaths },
          { label: "Assists", value: Number(match.assists) || 0 },
          { label: "HS", value: `${match.headshots}%` },
          {
            label: "K/D",
            value: formatKdRatio2(kills, deaths),
            cls: kd >= 1 ? "good" : "bad",
          },
          { label: "MVP", value: Number(match.mvps) || 0 },
        ];
      return `
      <div class="mc-card ${resultClass}" data-map="${mapKey}" ${matchUrl ? `onclick="window.open('${matchUrl}', '_blank')"` : ""}>
        <div class="mc-info">
          <span class="mc-map">${mapName}</span>
          <span class="mc-date"><i class="fas fa-calendar-alt"></i>${match.date}</span>
        </div>
        <div class="mc-outcome">
          <span class="mc-result">${match.result.toUpperCase()}</span>
          <span class="mc-score">${match.score}</span>
        </div>
        <div class="mc-stats">
          ${stats.map((s) => `<div class="mc-stat ${s.cls || ""}"><span class="mc-stat-value">${s.value}</span><span class="mc-stat-label">${s.label}</span></div>`).join("")}
        </div>
      </div>`;
    };
  var extractPlayerStats = extractPlayerStats2,
    enhanceSelect = enhanceSelect2,
    extractFallbackMatch = extractFallbackMatch2,
    buildMatchUrl = buildMatchUrl2,
    formatKdRatio = formatKdRatio2,
    buildMatchItemHtml = buildMatchItemHtml2;
  class SidebarManager {
    constructor() {
      ((this.sidebar = document.getElementById("sidebar")),
        (this.mobileToggle = document.getElementById("mobileMenuToggle")),
        (this.mobileOverlay = document.getElementById("mobileOverlay")),
        (this.mobileDrawer = document.getElementById("mobileSidebarDrawer")),
        (this.isPlayerProfileActive = !1),
        (this.isMobileOpen = !1),
        (this.isDrawerExpanded = !1),
        (this.currentView = "overview"),
        (this.originalStatsHTML = null),
        (this.currentMatches = []),
        (this.currentMapFilter = null),
        (this.matchesLimit = 40),
        (this.isLoadingMore = !1),
        (this.totalMatches = 0),
        (this.allHistoryItems = []),
        (this.historyPlayerId = null),
        (this.orderedMatches = []),
        (this.displayedMatchesCount = 0),
        (this.unfilteredDisplayedCount = 0),
        (this.availableMapOptions = []),
        (this.mapScanOffsets = {}),
        this.initializeEventListeners());
    }
    static normalizeMapKey(mapName) {
      return mapName
        ? String(mapName)
            .trim()
            .toLowerCase()
            .replace(/^de_/, "")
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "")
        : "";
    }
    getFilteredMatches() {
      return this.currentMapFilter
        ? (this.currentMatches || []).filter(
            (m) =>
              SidebarManager.normalizeMapKey(m.map) === this.currentMapFilter,
          )
        : this.currentMatches || [];
    }
    initializeEventListeners() {
      (document.querySelectorAll(".sidebar-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          if ((e.preventDefault(), item.dataset.action === "back"))
            return this.goBackToMainMenu();
          this.isPlayerProfileActive &&
            item.dataset.view &&
            this.switchView(item.dataset.view);
        });
      }),
        document.querySelectorAll(".drawer-item").forEach((item) => {
          item.addEventListener("click", (e) => {
            if (
              (e.preventDefault(),
              e.stopPropagation(),
              item.dataset.action === "back")
            )
              return this.goBackToMainMenu();
            this.isPlayerProfileActive &&
              item.dataset.view &&
              (this.switchView(item.dataset.view),
              window.innerWidth <= 768 && this.collapseDrawer());
          });
        }),
        document.addEventListener("click", (e) => {
          e.target.closest("#drawerHeader") &&
            this.isPlayerProfileActive &&
            (e.preventDefault(), e.stopPropagation(), this.toggleDrawer());
        }),
        this.mobileToggle &&
          this.mobileToggle.addEventListener("click", (e) => {
            (e.preventDefault(),
              this.isPlayerProfileActive && this.toggleMobileSidebar());
          }),
        this.mobileOverlay &&
          this.mobileOverlay.addEventListener("click", () => {
            (this.closeMobileSidebar(), this.collapseDrawer());
          }),
        document.addEventListener("keydown", (e) => {
          e.key === "Escape" &&
            (this.isMobileOpen && this.closeMobileSidebar(),
            this.isDrawerExpanded && this.collapseDrawer());
        }),
        document.getElementById("cookieFab")?.addEventListener("click", (e) => {
          (e.preventDefault(),
            typeof closeAllModals == "function" && closeAllModals(),
            openCookieModal());
        }),
        document
          .getElementById("cookieAcceptBtn")
          ?.addEventListener("click", (e) => {
            (e.preventDefault(),
              setCookieConsent("accepted"),
              closeCookieModal(),
              trackEvent("cookie_consent", { value: "accepted" }),
              updateCookieFabVisibility());
          }),
        document
          .getElementById("cookieRejectBtn")
          ?.addEventListener("click", (e) => {
            (e.preventDefault(),
              setCookieConsent("rejected"),
              closeCookieModal(),
              updateCookieFabVisibility());
          }),
        window.addEventListener("load", () => {
          setTimeout(() => {
            getCookieConsent() === null && openCookieModal();
          }, 500);
        }));
    }
    goBackToMainMenu() {
      goBackToMain(!0);
    }
    showForPlayerProfile() {
      this.isPlayerProfileActive ||
        ((this.isPlayerProfileActive = !0),
        this.switchView("overview"),
        window.innerWidth > 768
          ? (this.sidebar.classList.add("player-profile-active", "slide-in"),
            document.body.classList.add("sidebar-open"),
            this.mobileDrawer &&
              ((this.mobileDrawer.style.display = "none"),
              this.mobileDrawer.classList.remove("visible", "expanded")))
          : this.mobileDrawer &&
            ((this.mobileDrawer.style.display = "block"),
            this.mobileDrawer.classList.add("visible"),
            this.mobileDrawer.classList.remove("expanded"),
            (this.isDrawerExpanded = !1),
            typeof updateDrawerTexts == "function" && updateDrawerTexts()));
    }
    resetPlayerData() {
      ((this.currentMatches = []),
        (this.allHistoryItems = []),
        (this.historyPlayerId = null),
        (this.orderedMatches = []),
        (this.availableMapOptions = []),
        (this.mapScanOffsets = {}),
        (this.currentMapFilter = null),
        (this.totalMatches = 0),
        (this.displayedMatchesCount = 0),
        (this.unfilteredDisplayedCount = 0),
        (this.isLoadingMore = !1),
        (this.originalStatsHTML = null));
    }
    hideForPlayerProfile() {
      if (!this.isPlayerProfileActive) return;
      const nicknameInput = document.getElementById("nickname");
      (nicknameInput && (nicknameInput.value = ""),
        (this.isPlayerProfileActive = !1),
        this.resetPlayerData(),
        document
          .querySelector(".pro-grid")
          ?.style.setProperty("display", "flex"),
        this.sidebar.classList.remove("player-profile-active", "slide-in"),
        this.sidebar.classList.add("hidden"),
        document.body.classList.remove("sidebar-open"),
        this.mobileDrawer &&
          (this.collapseDrawer(),
          this.mobileDrawer.classList.remove("visible"),
          (this.mobileDrawer.style.animation =
            "slideOut 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards"),
          setTimeout(() => {
            this.isPlayerProfileActive ||
              (this.mobileDrawer.style.display = "none");
          }, 400)),
        this.closeMobileSidebar(),
        this.mobileToggle && (this.mobileToggle.style.display = "none"),
        setTimeout(() => this.sidebar.classList.remove("hidden"), 300));
    }
    switchView(view) {
      this.isPlayerProfileActive &&
        (window.innerWidth <= 768 &&
          (this.closeMobileSidebar(), this.collapseDrawer()),
        (this.currentView = view),
        document
          .querySelectorAll(".sidebar-item, .drawer-item")
          .forEach((item) => {
            item.classList.toggle("active", item.dataset.view === view);
          }),
        this.updatePlayerStatsView(view));
    }
    async showMatchesStats(render = !0) {
      try {
        const playerId = window.currentPlayerData?.player_id;
        if (!playerId) return;
        ((this.currentMapFilter = null),
          (this.currentMatches = []),
          (this.allHistoryItems = []),
          (this.historyPlayerId = null),
          (this.orderedMatches = []),
          (this.availableMapOptions = []),
          (this.mapScanOffsets = {}),
          (this.displayedMatchesCount = 0),
          (this.unfilteredDisplayedCount = 0),
          (this.isLoadingMore = !1));
        const statsContainer = document.querySelector(".stats-container");
        render &&
          statsContainer &&
          (statsContainer.innerHTML =
            '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading match history...</div>');
        const pageSize = 100;
        let offset = 0,
          allHistoryItems = [],
          totalHistory = 0,
          pageCount = 0;
        const seenMatchIds = new Set();
        let consecutiveErrors = 0;
        for (; consecutiveErrors < 3; ) {
          let retries = 0,
            success = !1;
          for (; retries <= 2 && !success; )
            try {
              const historyUrl = `/api/history?playerId=${encodeURIComponent(String(playerId))}&gameId=cs2&limit=${pageSize}&offset=${offset}`,
                response = await fetch(historyUrl, {
                  headers: { Accept: "application/json" },
                });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              if (!data || !data.items) throw new Error("Invalid items");
              if (data.items.length === 0) break;
              totalHistory || (totalHistory = data.total || data.items.length);
              for (const item of data.items) {
                const matchId = item?.match_id || item?.matchId;
                matchId &&
                  !seenMatchIds.has(matchId) &&
                  (seenMatchIds.add(matchId), allHistoryItems.push(item));
              }
              if (
                ((success = !0),
                (consecutiveErrors = 0),
                data.items.length < pageSize)
              )
                break;
            } catch {
              (retries++,
                retries > 2
                  ? (consecutiveErrors++,
                    console.warn(
                      `Page at offset ${offset} failed after retries`,
                    ))
                  : await new Promise((resolve) => setTimeout(resolve, 1e3)));
            }
          if (!success) {
            if (pageCount === 0)
              throw new Error("Failed to load match history");
            break;
          }
          (pageCount++, (offset += pageSize));
        }
        if (!allHistoryItems.length) {
          render &&
            statsContainer &&
            (statsContainer.innerHTML =
              '<p class="api-error-text">No match history available for this player.</p>');
          return;
        }
        if (window.currentPlayerData?.player_id !== playerId) return;
        ((this.totalMatches = Math.max(totalHistory, allHistoryItems.length)),
          (this.allHistoryItems = allHistoryItems),
          (this.historyPlayerId = playerId),
          (this.orderedMatches = new Array(allHistoryItems.length).fill(null)));
        const mapCounts = {},
          segments = window.currentPlayerProfile?.statsData?.segments || [];
        if (
          (window.FaceitAPI?.getAllMapsStats &&
            (window.FaceitAPI.getAllMapsStats(segments) || []).forEach(
              (map) => {
                const key = SidebarManager.normalizeMapKey(map.name),
                  count = Number(map.matches) || 0;
                key &&
                  count > 0 &&
                  (mapCounts[key] = { name: map.name, count });
              },
            ),
          (this.availableMapOptions = Object.keys(mapCounts)
            .map((k) => ({
              key: k,
              name: mapCounts[k].name,
              count: mapCounts[k].count,
            }))
            .sort((a, b) => b.count - a.count)),
          await this.ensureMatchesLoadedRange(
            0,
            Math.min(this.matchesLimit, this.allHistoryItems.length),
          ),
          (this.displayedMatchesCount = this.currentMatches.length),
          (this.unfilteredDisplayedCount = this.displayedMatchesCount),
          render && statsContainer)
        ) {
          if (
            (statsContainer
              .querySelectorAll(".loading-indicator")
              .forEach((el) => el.remove()),
            !this.availableMapOptions.length)
          ) {
            const loadedMapCounts = {};
            (this.currentMatches.forEach((m) => {
              const key = SidebarManager.normalizeMapKey(m.map);
              key &&
                ((loadedMapCounts[key] = loadedMapCounts[key] || {
                  name: m.map || key,
                  count: 0,
                }),
                loadedMapCounts[key].count++);
            }),
              (this.availableMapOptions = Object.keys(loadedMapCounts).map(
                (k) => ({
                  key: k,
                  name: loadedMapCounts[k].name,
                  count: loadedMapCounts[k].count,
                }),
              )));
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
          (statsContainer.querySelector(".mc-filter")?.remove(),
            statsContainer.insertAdjacentHTML("beforeend", chipsHtml));
          const chipsEl = statsContainer.querySelector(".mc-filter");
          (typeof applyMapCardBackgrounds == "function" &&
            applyMapCardBackgrounds(chipsEl),
            chipsEl.addEventListener("click", async (e) => {
              const chip = e.target.closest(".mc-chip");
              if (!chip || chip.classList.contains("active")) return;
              (chipsEl
                .querySelectorAll(".mc-chip")
                .forEach((c) => c.classList.toggle("active", c === chip)),
                chip.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest",
                }));
              const requestId = (this.filterRequestId =
                (this.filterRequestId || 0) + 1);
              if (
                ((this.currentMapFilter = chip.dataset.mapFilter || null),
                this.currentMapFilter)
              ) {
                const selectedMapOption = this.availableMapOptions.find(
                  (opt) => opt.key === this.currentMapFilter,
                );
                if (
                  (this.renderMatchesLoadingIndicator(),
                  await this.ensureMatchesLoadedForMap(
                    this.currentMapFilter,
                    this.matchesLimit,
                    selectedMapOption?.count || 0,
                  ),
                  requestId !== this.filterRequestId)
                )
                  return;
                const matchesToDisplay = this.getFilteredMatches().slice(
                  0,
                  this.matchesLimit,
                );
                ((this.displayedMatchesCount = matchesToDisplay.length),
                  this.displayMatchHistory(matchesToDisplay, !0));
              } else {
                const visibleCount =
                  this.unfilteredDisplayedCount > 0
                    ? this.unfilteredDisplayedCount
                    : this.matchesLimit;
                if (
                  (await this.ensureMatchesLoadedRange(0, visibleCount),
                  requestId !== this.filterRequestId)
                )
                  return;
                ((this.displayedMatchesCount = Math.min(
                  visibleCount,
                  this.currentMatches.length,
                )),
                  (this.unfilteredDisplayedCount = this.displayedMatchesCount),
                  this.displayMatchHistory(
                    this.currentMatches.slice(0, this.displayedMatchesCount),
                    !0,
                  ));
              }
            }),
            this.displayMatchHistory(
              this.currentMatches.slice(0, this.matchesLimit),
              !0,
            ));
        }
      } catch (error) {
        const statsContainer = document.querySelector(".stats-container");
        render &&
          statsContainer &&
          (statsContainer.innerHTML = `<p class="api-error-text">${error.message}</p>`);
      }
    }
    async fetchMatchStats(matchId, playerId) {
      let retries = 0;
      for (; retries < 3; )
        try {
          const response = await fetch(
            `/api/match-stats?matchId=${encodeURIComponent(String(matchId))}`,
            { headers: { Accept: "application/json" } },
          );
          if (!response.ok) {
            if (response.status === 404) {
              try {
                const infoRes = await fetch(
                  `/api/server?action=match-info&matchId=${encodeURIComponent(String(matchId))}`,
                );
                if (infoRes.ok)
                  return extractFallbackMatch2(await infoRes.json(), playerId);
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
                return extractFallbackMatch2(await infoRes.json(), playerId);
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
            playerStats: extractPlayerStats2(round.teams, playerId),
          };
        } catch (error) {
          if ((retries++, retries >= 3)) throw error;
          await new Promise((r) => setTimeout(r, 1e3 * retries));
        }
    }
    formatMatchData(match, statsData, playerId, index, totalMatches) {
      try {
        const safePlayerStats = statsData?.playerStats || {},
          timestamp = Number(match.finished_at) * 1e3,
          kills = Number(safePlayerStats.Kills) || 0,
          headshots = Number(safePlayerStats.Headshots) || 0;
        return {
          matchId: match.match_id || "Unknown Match ID",
          totalMatchNumber: totalMatches - index,
          date: isNaN(timestamp)
            ? "Unknown Date"
            : new Date(timestamp).toLocaleDateString(),
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
      } catch {
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
      (wrapper ||
        ((wrapper = document.createElement("div")),
        (wrapper.className = "matches-content-wrapper"),
        statsContainer.appendChild(wrapper)),
        (wrapper.innerHTML =
          '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Processing matches, please wait...</div>'));
    }
    async ensureMatchesLoadedRange(startIndex, endIndexExclusive) {
      const playerId = window.currentPlayerData?.player_id;
      if (!playerId || !this.allHistoryItems.length) return;
      const cappedStart = Math.max(0, startIndex),
        cappedEnd = Math.min(endIndexExclusive, this.allHistoryItems.length);
      if (cappedStart >= cappedEnd) return;
      const indexesToLoad = [];
      for (let i = cappedStart; i < cappedEnd; i++)
        this.orderedMatches[i] || indexesToLoad.push(i);
      if (!indexesToLoad.length) {
        this.currentMatches = this.orderedMatches.filter(Boolean);
        return;
      }
      const BATCH_SIZE = 5;
      for (let i = 0; i < indexesToLoad.length; i += BATCH_SIZE) {
        const batchIndexes = indexesToLoad.slice(i, i + BATCH_SIZE),
          batchResults = await Promise.all(
            batchIndexes.map(async (historyIndex) => {
              const historyMatch = this.allHistoryItems[historyIndex],
                matchId = historyMatch?.match_id || historyMatch?.matchId;
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
              } catch {
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
      for (
        ;
        chunkStart < this.allHistoryItems.length &&
        this.getFilteredMatches().length < requiredCount;
      ) {
        const chunk_end = Math.min(
          chunkStart + chunkSize,
          this.allHistoryItems.length,
        );
        (await this.ensureMatchesLoadedRange(chunkStart, chunk_end),
          (this.mapScanOffsets[mapKey] = chunk_end),
          (chunkStart = chunk_end));
      }
    }
    updatePlayerStatsView(view) {
      const statsContainer = document.querySelector(".stats-container"),
        playerCard = document.querySelector(".player-card");
      if (!playerCard || !statsContainer) return;
      const search = document.getElementById("search");
      switch (view) {
        case "overview":
          (search && (search.style.display = "none"),
            (statsContainer.innerHTML = ""),
            renderOverviewStats(statsContainer));
          break;
        case "matches":
          ((statsContainer.innerHTML =
            '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading match history...</div>'),
            (statsContainer.style.display = "block"),
            (playerCard.style.display = "block"),
            this.showMatchesStats());
          break;
        case "records":
          (search && (search.style.display = "none"),
            (playerCard.style.display = "block"),
            (statsContainer.style.display = "block"),
            (statsContainer.innerHTML = `
            <div class="record-filters" style="display: none">
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
            </div>`));
          const recordSelect = document.getElementById("recordFilterSelect");
          (recordSelect?.addEventListener("change", (e) => {
            this.showRecord(e.target.value);
          }),
            enhanceSelect2(recordSelect, {
              mostKills: "fa-crosshairs",
              mostAssists: "fa-hands-helping",
              highestKD: "fa-chart-line",
              highestKDDifference: "fa-balance-scale",
              mostMVPs: "fa-star",
              highestHeadshotPct: "fa-skull",
            }),
            this.showRecord("mostKills"));
          break;
        case "maps":
          ((statsContainer.innerHTML =
            '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading maps...</div>'),
            (statsContainer.style.display = "block"),
            playerCard
              .querySelectorAll(".stats-box")
              .forEach((box) => (box.style.display = "none")));
          try {
            const segments =
              window.currentPlayerProfile?.statsData?.segments || [];
            if (!segments.length || !window.FaceitAPI?.getAllMapsStats) {
              statsContainer.innerHTML =
                "<p>Not enough data to display map statistics.</p>";
              return;
            }
            const allMapsStats =
              window.FaceitAPI.getAllMapsStats(segments) || [];
            if (
              (allMapsStats.sort((a, b) => b.winRate - a.winRate),
              allMapsStats.length > 0)
            ) {
              let html = '<div class="maps-grid">';
              (allMapsStats.forEach((map) => {
                let cardClass = "map-card",
                  winRateColor = "#4caf50";
                map.winRate < 40
                  ? ((cardClass += " poor-performance"),
                    (winRateColor = "#f44336"))
                  : map.winRate < 55
                    ? ((cardClass += " average-performance"),
                      (winRateColor = "#ff9800"))
                    : (cardClass += " good-performance");
                const mapKey = SidebarManager.normalizeMapKey(map.name),
                  kd = typeof map.kd == "number" ? map.kd : parseFloat(map.kd),
                  avgKills =
                    typeof map.avgKills == "number"
                      ? map.avgKills
                      : parseFloat(map.avgKills),
                  adr =
                    typeof map.adr == "number" ? map.adr : parseFloat(map.adr);
                html += `
                  <div class="${cardClass}" data-map="${mapKey}">
                    <div class="map-card-header">
                      <h3 class="map-name">${map.name}</h3>
                      <div class="win-rate-badge" style="background: ${winRateColor}">${map.winRate.toFixed(1)}%</div>
                    </div>
                    <div class="map-card-body">
                      <div class="map-stat-row">
                        <div class="map-stat-item"><i class="fas fa-gamepad"></i><span class="stat-label">Matches</span><span class="stat-value">${map.matches}</span></div>
                        <div class="map-stat-item"><i class="fas fa-crosshairs"></i><span class="stat-label">K/D</span><span class="stat-value">${isNaN(kd) ? "-" : kd.toFixed(2)}</span></div>
                      </div>
                      <div class="map-stat-row">
                        <div class="map-stat-item"><i class="fas fa-bolt"></i><span class="stat-label">Avg.kills</span><span class="stat-value">${isNaN(avgKills) ? "-" : avgKills.toFixed(1)}</span></div>
                        <div class="map-stat-item"><i class="fas fa-trophy"></i><span class="stat-label">Win Rate</span><span class="stat-value">${map.winRate.toFixed(1)}%</span></div>
                      </div>
                      <div class="map-stat-row">
                        <div class="map-stat-item"><i class="fas fa-fire"></i><span class="stat-label">ADR</span><span class="stat-value">${isNaN(adr) ? "-" : adr.toFixed(1)}</span></div>
                        <div class="map-stat-item"><i class="fas fa-star"></i><span class="stat-label">Clutches</span><span class="stat-value">${typeof map.clutches == "number" ? map.clutches : "-"}</span></div>
                      </div>
                    </div>
                  </div>`;
              }),
                (html += "</div>"),
                (statsContainer.innerHTML = html),
                typeof applyMapCardBackgrounds == "function" &&
                  applyMapCardBackgrounds(statsContainer));
            } else
              statsContainer.innerHTML =
                "<p>Not enough data to display map statistics.</p>";
          } catch {
            statsContainer.innerHTML =
              '<p class="api-error-text">\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445 \u043A\u0430\u0440\u0442</p>';
          }
          break;
        case "compare": {
          (search && (search.style.display = "none"),
            (playerCard.style.display = "block"),
            playerCard
              .querySelectorAll(".stats-box")
              .forEach((box) => (box.style.display = "none")),
            (statsContainer.style.display = "block"),
            (statsContainer.innerHTML = `
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
            </div>`));
          const compareInput = document.getElementById("compareInput"),
            compareBtn = document.getElementById("compareBtn"),
            compareStatus = document.getElementById("compareStatus"),
            compareOutput = document.getElementById("compareOutput"),
            setStatus = (type, text) => {
              const icons = {
                loading: "fa-spinner fa-spin",
                error: "fa-circle-exclamation",
                ok: "fa-circle-check",
              };
              ((compareStatus.className = `compare-status ${type}`),
                (compareStatus.innerHTML = `<i class="fas ${icons[type]}"></i><span>${text}</span>`));
            },
            esc = (s) =>
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
              ),
            runCompare = async () => {
              const currentProfile = window.currentPlayerProfile,
                currentPlayer = window.currentPlayerData;
              if (!currentProfile || !currentPlayer?.player_id) {
                setStatus(
                  "error",
                  "No data available for the current player to compare.",
                );
                return;
              }
              const raw = compareInput.value.trim();
              if (!raw) {
                setStatus(
                  "error",
                  "Please enter a Steam URL or FACEIT Nickname.",
                );
                return;
              }
              ((compareBtn.disabled = !0),
                (compareInput.disabled = !0),
                (compareOutput.innerHTML = ""),
                setStatus("loading", "Checking profile..."));
              try {
                let opponentPlayer;
                try {
                  isSteamInput(raw)
                    ? ((opponentPlayer =
                        await resolveFaceitPlayerFromSteam(raw)),
                      !opponentPlayer?.games &&
                        opponentPlayer?.nickname &&
                        (opponentPlayer = await window.FaceitAPI.getPlayerData(
                          opponentPlayer.nickname,
                        )))
                    : (opponentPlayer =
                        await window.FaceitAPI.getPlayerData(raw));
                } catch (err) {
                  throw /^Error API: 404/.test(err.message)
                    ? new Error("Player not found on Faceit.")
                    : err;
                }
                if (!opponentPlayer?.player_id)
                  throw new Error("Proflile data is incomplete or invalid.");
                if (!opponentPlayer.games?.cs2)
                  throw new Error(
                    "This player does not have CS2 stats on Faceit.",
                  );
                if (opponentPlayer.player_id === currentPlayer.player_id)
                  throw new Error(
                    "This is the same player as the current profile.",
                  );
                let statsData;
                try {
                  statsData = await window.FaceitAPI.getStatsData(
                    opponentPlayer.player_id,
                    "cs2",
                  );
                } catch {
                  throw new Error(
                    "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0443 \u0438\u0433\u0440\u043E\u043A\u0430.",
                  );
                }
                const lifetime = statsData?.lifetime || {},
                  segments = statsData?.segments || [],
                  avgStats = window.FaceitAPI.calculateAvgStats(
                    lifetime,
                    segments,
                    "cs2",
                  );
                if (!avgStats.totalMatches)
                  throw new Error(
                    "\u0423 \u0438\u0433\u0440\u043E\u043A\u0430 \u043D\u0435\u0442 \u0441\u044B\u0433\u0440\u0430\u043D\u043D\u044B\u0445 \u043C\u0430\u0442\u0447\u0435\u0439 CS2 \u0434\u043B\u044F \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F.",
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
                  ]),
                  opponentProfile = {
                    avgStats,
                    statsData,
                    lifetime,
                    allMaps: window.FaceitAPI.getAllMapsStats(segments),
                  };
                if (!compareOutput.isConnected) return;
                const metricsA = window.computeHltvMetrics(currentProfile),
                  metricsB = window.computeHltvMetrics(opponentProfile),
                  fmtInt = (v) => window.FaceitAPI.formatNumber(v),
                  faceitRows = [
                    {
                      label: "Matches",
                      a: Number(currentProfile.avgStats?.totalMatches) || 0,
                      b: avgStats.totalMatches,
                      fmt: fmtInt,
                      countInScore: !1,
                    },
                    {
                      label: "ELO",
                      a: Number(currentElo) || 0,
                      b: Number(opponentElo) || 0,
                      fmt: fmtInt,
                      countInScore: !0,
                    },
                    {
                      label: "K/D",
                      a: parseFloat(currentProfile.avgStats?.kd) || 0,
                      b: parseFloat(avgStats.kd) || 0,
                      fmt: (v) => v.toFixed(2),
                      countInScore: !0,
                    },
                  ].map((r) => ({
                    ...r,
                    fa: r.fmt(r.a),
                    fb: r.fmt(r.b),
                    max: Math.max(r.a, r.b) || 1,
                  })),
                  hltvRows = metricsA.map((mA, i) => ({
                    label: mA.label,
                    a: mA.score,
                    b: metricsB[i].score,
                    fa: mA.displayValue,
                    fb: metricsB[i].displayValue,
                    max: 100,
                    countInScore: !0,
                  }));
                let winsA = 0,
                  winsB = 0;
                const buildRows = (list) =>
                    list
                      .map((r) => {
                        let winner = "tie";
                        return (
                          r.a > r.b
                            ? (winner = "a")
                            : r.b > r.a && (winner = "b"),
                          r.countInScore && winner === "a" && winsA++,
                          r.countInScore && winner === "b" && winsB++,
                          `
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
                    </div>`
                        );
                      })
                      .join(""),
                  faceitRowsHtml = buildRows(faceitRows),
                  hltvRowsHtml = buildRows(hltvRows),
                  chip = (player, side) => `
                <div class="compare-player ${side}">
                  ${player?.avatar ? `<img class="compare-avatar" src="${esc(player.avatar)}" alt="" onerror="this.src='/assets/favicon.svg';" />` : '<span class="compare-avatar compare-avatar-fallback"><i class="fas fa-user"></i></span>'}
                  <span class="compare-nickname">${esc(player?.nickname || "-")}</span>
                </div>`;
                ((compareOutput.innerHTML = `
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
                </div>`),
                  setStatus(
                    "ok",
                    `Player was found: ${esc(opponentPlayer.nickname)}`,
                  ));
                const result = compareOutput.querySelector(".compare-result");
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => result?.classList.add("animate")),
                );
              } catch (error) {
                compareOutput.isConnected &&
                  setStatus(
                    "error",
                    esc(
                      error.message ||
                        "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435.",
                    ),
                  );
              } finally {
                ((compareBtn.disabled = !1), (compareInput.disabled = !1));
              }
            };
          (compareBtn.addEventListener("click", runCompare),
            compareInput.addEventListener("keydown", (e) => {
              e.key === "Enter" && runCompare();
            }));
          break;
        }
      }
      playerCard.style.opacity = "1";
    }
    displayMatchHistory(matches, isInitialLoad = !1) {
      const statsContainer = document.querySelector(".stats-container");
      if (!statsContainer) return;
      let wrapper = statsContainer.querySelector(".matches-content-wrapper");
      if (
        (wrapper ||
          ((wrapper = document.createElement("div")),
          (wrapper.className = "matches-content-wrapper"),
          statsContainer.appendChild(wrapper)),
        !matches?.length)
      ) {
        wrapper.innerHTML = "<p>No match history available.</p>";
        return;
      }
      let matchHistoryContainer = `<div class="match-history">${matches.map(buildMatchItemHtml2).join("")}</div>`;
      const selectedMapOption = this.currentMapFilter
          ? this.availableMapOptions.find(
              (opt) => opt.key === this.currentMapFilter,
            )
          : null,
        allHistoryScanned =
          this.currentMatches.length >= (this.allHistoryItems || []).length,
        totalFiltered = this.currentMapFilter
          ? allHistoryScanned
            ? this.getFilteredMatches().length
            : selectedMapOption?.count || this.getFilteredMatches().length
          : this.totalMatches || this.allHistoryItems.length;
      if (matches.length < totalFiltered) {
        const shownPct = Math.round((matches.length / totalFiltered) * 100),
          nextCount = Math.min(
            this.matchesLimit,
            totalFiltered - matches.length,
          );
        matchHistoryContainer += `
          <div class="mc-more">
            <button type="button" class="mc-more-btn" onclick="sidebarManager.loadMoreMatches()">
              <i class="fas fa-chevron-down"></i> Show More (+${nextCount})
            </button>
          </div>`;
      }
      ((wrapper.innerHTML = matchHistoryContainer),
        typeof applyMapCardBackgrounds == "function" &&
          applyMapCardBackgrounds(wrapper));
    }
    async loadMoreMatches() {
      if (this.isLoadingMore) return;
      this.isLoadingMore = !0;
      const showMoreContainer = document.querySelector(".mc-more");
      showMoreContainer &&
        (showMoreContainer.innerHTML =
          '<div class="loading-indicator small"><i class="fas fa-spinner fa-spin"></i>Processing matches...</div>');
      try {
        const newTotalDisplayed =
          document.querySelectorAll(".mc-card").length + this.matchesLimit;
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
          ((this.displayedMatchesCount = matchesToDisplay.length),
            this.displayMatchHistory(matchesToDisplay, !1));
        } else {
          const targetCount = Math.min(
            newTotalDisplayed,
            this.allHistoryItems.length,
          );
          await this.ensureMatchesLoadedRange(0, targetCount);
          const matchesToDisplay = this.currentMatches.slice(0, targetCount);
          ((this.displayedMatchesCount = matchesToDisplay.length),
            (this.unfilteredDisplayedCount = this.displayedMatchesCount),
            this.displayMatchHistory(matchesToDisplay, !1));
        }
      } finally {
        this.isLoadingMore = !1;
      }
    }
    async showRecord(recordType) {
      try {
        await this.renderRecordContent(recordType);
      } finally {
        const filters = document.querySelector(".record-filters");
        filters && (filters.style.display = "");
      }
    }
    async renderRecordContent(recordType) {
      const recordDisplay = document.querySelector(".record-display");
      if (!recordDisplay) return;
      recordDisplay.innerHTML =
        '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading records...</div>';
      const currentPlayerId = window.currentPlayerData?.player_id;
      if (
        ((!this.allHistoryItems?.length ||
          this.historyPlayerId !== currentPlayerId) &&
          (await this.showMatchesStats(!1)),
        !this.allHistoryItems?.length ||
          this.historyPlayerId !== window.currentPlayerData?.player_id)
      ) {
        recordDisplay.innerHTML = "<p>Not enough data to display records.</p>";
        return;
      }
      try {
        await this.ensureMatchesLoadedRange(0, this.allHistoryItems.length);
      } catch {}
      if (!this.currentMatches.length) {
        recordDisplay.innerHTML = "<p>Not enough data to display records.</p>";
        return;
      }
      const recordLabelMap = {
          mostKills: "Most Kills",
          mostAssists: "Most Assists",
          highestKD: "Highest K/D",
          highestKDDifference: "Highest K/D Diff",
          mostMVPs: "Most MVPs",
          highestHeadshotPct: "Highest HS%",
        },
        rankedMatches = this.currentMatches
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
        recordDisplay.innerHTML = "<p>Not enough data to display records.</p>";
        return;
      }
      ((recordDisplay.innerHTML = `
        <div class="record-match-list">
          <h3>${recordLabelMap[recordType] || ""}</h3>
          <div class="match-history">${rankedMatches.map(({ match }) => buildMatchItemHtml2(match)).join("")}</div>
        </div>`),
        typeof applyMapCardBackgrounds == "function" &&
          applyMapCardBackgrounds(recordDisplay));
    }
    toggleMobileSidebar() {
      this.isPlayerProfileActive &&
        (this.isMobileOpen
          ? this.closeMobileSidebar()
          : this.openMobileSidebar());
    }
    openMobileSidebar() {
      this.isPlayerProfileActive &&
        ((this.isMobileOpen = !0),
        this.sidebar.classList.add("mobile-active"),
        this.mobileOverlay.classList.add("active"),
        (document.body.style.overflow = "hidden"));
    }
    closeMobileSidebar() {
      ((this.isMobileOpen = !1),
        this.sidebar.classList.remove("mobile-active"),
        this.mobileOverlay.classList.remove("active"),
        (document.body.style.overflow = ""));
    }
    toggleDrawer() {
      this.isPlayerProfileActive &&
        (this.isDrawerExpanded ? this.collapseDrawer() : this.expandDrawer());
    }
    expandDrawer() {
      ((this.isDrawerExpanded = !0),
        this.mobileDrawer &&
          (this.mobileDrawer.classList.add("expanded"),
          this.mobileOverlay?.classList.add("active"),
          (document.body.style.overflow = "hidden")));
    }
    collapseDrawer() {
      ((this.isDrawerExpanded = !1),
        this.mobileDrawer &&
          (this.mobileDrawer.classList.remove("expanded"),
          this.mobileOverlay?.classList.remove("active"),
          (document.body.style.overflow = "")));
    }
    handleResize() {
      window.innerWidth > 768
        ? (this.closeMobileSidebar(),
          this.collapseDrawer(),
          this.mobileDrawer &&
            (this.mobileDrawer.classList.remove("visible", "expanded"),
            (this.mobileDrawer.style.display = "none")),
          this.isPlayerProfileActive &&
            (this.sidebar.classList.add("player-profile-active", "slide-in"),
            document.body.classList.add("sidebar-open")))
        : (document.body.classList.remove("sidebar-open"),
          this.sidebar.classList.remove("slide-in", "player-profile-active"),
          this.mobileDrawer &&
            (this.isPlayerProfileActive
              ? ((this.mobileDrawer.style.display = "block"),
                this.mobileDrawer.classList.add("visible"))
              : (this.mobileDrawer.classList.remove("visible", "expanded"),
                (this.mobileDrawer.style.display = "none"))));
    }
  }
  window.AppPlayerResolve = {
    isSteamInput,
    resolveFaceitPlayerFromSteam,
    checkFaceitAPI,
  };
  window.SidebarManager = SidebarManager;
}
