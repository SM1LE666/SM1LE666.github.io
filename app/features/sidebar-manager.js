(function () {
  if (typeof window === "undefined") return;

  function extractPlayerStats(teams, playerId) {
    for (const team of teams || []) {
      const player = (team.players || []).find((p) => p.player_id === playerId);
      if (player) return player.player_stats || {};
    }
    return {};
  }

  function extractFallbackMatch(infoData, playerId, fallbackMap = "Unknown Map") {
    const fallbackRound = infoData.rounds && infoData.rounds[0];
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
    const lang = getCurrentLanguage();
    if (matchId.startsWith("1-")) {
      return `https://www.faceit.com/${lang}/cs2/room/${matchId}`;
    }
    return `https://www.faceit.com/${lang}/matchroom/${matchId}`;
  }

  function formatKdRatio(kills, deaths) {
    if (deaths > 0) return (kills / deaths).toFixed(2);
    return kills > 0 ? "∞" : "0.00";
  }

  function buildMatchItemHtml(match) {
    if (match.result === "Error") {
      return `
          <div class="match-item error">
            <div class="match-header">
              <span class="match-date">Error loading match</span>
            </div>
            <div class="match-error">Failed to load match data</div>
          </div>
        `;
    }

    const resultClass = match.result.toLowerCase();
    const resultText = getText(resultClass);
    const matchUrl = buildMatchUrl(match.matchId);

    return `
        <div class="match-item ${resultClass}" ${
          matchUrl ? `onclick="window.open('${matchUrl}', '_blank')"` : ""
        }>
          <span class="match-date">${match.date}</span>
          <span class="match-result">${resultText}</span>
          <span class="match-map">${match.map}</span>
          <span class="match-score">${match.score}</span>
          <div class="player-stats">
            <div class="stat-item">
              <i class="fas fa-skull"></i>
              <span>${match.kills}</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-skull-crossbones"></i>
              <span>${match.deaths}</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-handshake"></i>
              <span>${match.assists}</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-percentage"></i>
              <span>${match.headshots}%</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-chart-line"></i>
              <span>${formatKdRatio(match.kills, match.deaths)}</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-star"></i>
              <span>${match.mvps}</span>
            </div>
          </div>
        </div>`;
  }

  class SidebarManager {
    constructor() {
      this.sidebar = document.getElementById("sidebar");
      this.mobileToggle = document.getElementById("mobileMenuToggle");
      this.mobileOverlay = document.getElementById("mobileOverlay");
      this.mobileDrawer = document.getElementById("mobileSidebarDrawer"); // Новая шторка
      this.isPlayerProfileActive = false;
      this.isMobileOpen = false;
      this.isDrawerExpanded = false; // Состояние разворота шторки
      this.currentView = "overview";
      this.originalStatsHTML = null;
      this.updateViewTimeout = null;
      this.originalPlayerHeaderDisplay = "flex";
      this.currentMatches = []; // Все загруженные матчи
      this.currentMapFilter = null; // Выбранная карта для фильтрации (ключ)
      this.matchesOffset = 0; // Смещение для пагинации
      this.matchesLimit = 40; // Количество загружаемых матчей за раз
      this.isLoadingMore = false; // Флаг загрузки
      this.totalMatches = 0; // Общее количество матчей
      this.showMoreButton = null; // Кнопка "Показать еще"
      this.allHistoryItems = []; // Все элементы истории матчей (без деталей)
      this.orderedMatches = []; // Детали матчей в исходном порядке истории
      this.displayedMatchesCount = 0; // Сколько матчей сейчас отображаем
      this.unfilteredDisplayedCount = 0; // Сколько матчей показано без фильтра карты
      this.availableMapOptions = []; // Опции фильтра карт с полным количеством
      this.mapScanOffsets = {}; // До какого индекса истории уже сканировали карту

      this.initializeEventListeners();
    }

    // Нормализует имя карты в ключ (как в карточках карт)
    static normalizeMapKey(mapName) {
      if (!mapName) return "";
      return String(mapName)
        .trim()
        .toLowerCase()
        .replace(/^de_/, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    }

    // Возвращает массив матчей с учётом выбранного фильтра карты
    getFilteredMatches() {
      if (!this.currentMapFilter) return this.currentMatches || [];
      return (this.currentMatches || []).filter(
        (m) =>
          SidebarManager.normalizeMapKey(m.map) === this.currentMapFilter,
      );
    }

    initializeEventListeners() {
      // Обработчики для элементов сайдбара (десктоп)
      const sidebarItems = document.querySelectorAll(".sidebar-item");
      sidebarItems.forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();

          // Проверяем, если это кнопка "Назад"
          if (item.dataset.action === "back") {
            this.goBackToMainMenu();
            return;
          }

          if (!this.isPlayerProfileActive) return; // Не работает без активного профиля

          const view = item.dataset.view;
          if (view) {
            this.switchView(view);
          }
        });
      });

      // Обработчики для элементов мобильной шторки
      const drawerItems = document.querySelectorAll(".drawer-item");
      drawerItems.forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Проверяем, если это кнопка "Назад"
          if (item.dataset.action === "back") {
            this.goBackToMainMenu();
            return;
          }

          if (!this.isPlayerProfileActive) return;

          const view = item.dataset.view;
          if (view) {
            this.switchView(view);
            // После выбора ВСЕГДА сворачиваем шторку на мобильных
            if (window.innerWidth <= 768) {
              this.collapseDrawer();
            }
          }
        });
      });

      // Обработчик для кнопки сворачивания/разворачивания шторки
      // Используем делегирование событий, так как кнопка может появиться позже
      document.addEventListener("click", (e) => {
        if (e.target.closest("#drawerHeader")) {
          e.preventDefault();
          e.stopPropagation();
          if (!this.isPlayerProfileActive) {
            return;
          }
          this.toggleDrawer();
        }
      });

      // Desktop mobile toggle (теперь скрыт на мобильных)
      if (this.mobileToggle) {
        this.mobileToggle.addEventListener("click", (e) => {
          e.preventDefault();
          if (!this.isPlayerProfileActive) return;
          this.toggleMobileSidebar();
        });
      }

      // Mobile overlay
      if (this.mobileOverlay) {
        this.mobileOverlay.addEventListener("click", () => {
          this.closeMobileSidebar();
          this.collapseDrawer();
        });
      }

      // Клавиша Escape для закрытия
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (this.isMobileOpen) {
            this.closeMobileSidebar();
          }
          if (this.isDrawerExpanded) {
            this.collapseDrawer();
          }
        }
      });

      // Floating cookie settings button
      const cookieFab = document.getElementById("cookieFab");
      if (cookieFab) {
        cookieFab.addEventListener("click", (e) => {
          e.preventDefault();
          // Close other modals so it behaves like the others
          closeAllModals();
          openCookieModal();
        });
      }

      // Cookie modal buttons
      const cookieAcceptBtn = document.getElementById("cookieAcceptBtn");
      if (cookieAcceptBtn) {
        cookieAcceptBtn.addEventListener("click", (e) => {
          e.preventDefault();
          setCookieConsent("accepted");
          closeCookieModal();
          // Send a one-time event after consent
          trackEvent("cookie_consent", { value: "accepted" });
          updateCookieFabVisibility();
        });
      }

      const cookieRejectBtn = document.getElementById("cookieRejectBtn");
      if (cookieRejectBtn) {
        cookieRejectBtn.addEventListener("click", (e) => {
          e.preventDefault();
          setCookieConsent("rejected");
          closeCookieModal();
          updateCookieFabVisibility();
        });
      }
    }

    goBackToMainMenu() {
      goBackToMain(true); // true означает, что нужно обновить URL
    }

    showForPlayerProfile() {
      if (this.isPlayerProfileActive) return;

      const playerHeader = document.querySelector(".player-header");
      if (playerHeader) {
        // Сохраняем исходное значение display
        this.originalPlayerHeaderDisplay =
          window.getComputedStyle(playerHeader).display;
      }

      this.isPlayerProfileActive = true;

      this.switchView("overview");

      // На десктопе показываем обычный сайдбар
      if (window.innerWidth > 768) {
        this.sidebar.classList.add("player-profile-active");
        this.sidebar.classList.add("slide-in");
        document.body.classList.add("sidebar-open");

        // ГАРАНТИРУЕМ что шторка скрыта на десктопе
        if (this.mobileDrawer) {
          this.mobileDrawer.style.display = "none";
          this.mobileDrawer.classList.remove("visible", "expanded");
        }
      } else {
        // На мобильных показываем шторку
        if (this.mobileDrawer) {
          this.mobileDrawer.style.display = "block";
          this.mobileDrawer.classList.add("visible");

          // Убеждаемся, что шторка свернута по умолчанию
          this.mobileDrawer.classList.remove("expanded");
          this.isDrawerExpanded = false;
          // Сразу обновляем тексты в шторке на текущем языке
          updateDrawerTexts();
        }
      }
    }

    // Скрыть сайдбар при отсутствии профиля
    hideForPlayerProfile() {
      if (!this.isPlayerProfileActive) return;

      const nicknameInput = document.getElementById("nickname");
      if (nicknameInput && nicknameInput.value.trim() !== "") {
        return; // Не скрываем сайдбар, если есть введенный никнейм
      }

      this.isPlayerProfileActive = false;

      // Скрываем десктопный сайдбар
      this.sidebar.classList.remove("player-profile-active");
      this.sidebar.classList.remove("slide-in");
      this.sidebar.classList.add("hidden");
      document.body.classList.remove("sidebar-open");

      // Скрываем мобильную шторку ПОЛНОСТЬЮ
      if (this.mobileDrawer) {
        this.collapseDrawer(); // Сворачиваем если развернута
        this.mobileDrawer.classList.remove("visible");
        this.mobileDrawer.style.animation =
          "slideOut 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards";

        // Полностью скрываем после анимации
        setTimeout(() => {
          if (!this.isPlayerProfileActive) {
            this.mobileDrawer.style.display = "none";
          }
        }, 400);
      }

      // Закрываем мобильный сайдбар если открыт
      this.closeMobileSidebar();

      // Скрываем mobile toggle для десктопа
      if (this.mobileToggle) {
        this.mobileToggle.style.display = "none";
      }

      // Убираем класс hidden через некоторое время
      setTimeout(() => {
        this.sidebar.classList.remove("hidden");
      }, 300);

      console.log("Сайдбар/шторка деактивированы");
    }

    // Переключение видов в сайдбаре
    switchView(view) {
      if (!this.isPlayerProfileActive) return;

      // На мобильных автоматически закрываем меню после выбора
      if (window.innerWidth <= 768) {
        this.closeMobileSidebar();
        this.collapseDrawer(); // Также сворачиваем шторку
      }

      this.currentView = view;

      // Обновляем активный элемент в обоих сайдбарах
      document
        .querySelectorAll(".sidebar-item, .drawer-item")
        .forEach((item) => {
          item.classList.remove("active");
          if (item.dataset.view === view) {
            item.classList.add("active");
          }
        });

      // Здесь можно добавить логику переключения контента
      this.updatePlayerStatsView(view);

      console.log(`Переключено на вид: ${view}`);
    }

    // Добавляем класс для текста ошибки API
    hideApiErrorText() {
      const apiErrorClass = "api-error-text";
      const errorTextElements = document.querySelectorAll(`.${apiErrorClass}`);
      errorTextElements.forEach((element) => {
        element.style.display = "none";
      });
    }

    // Обновите метод showMatchesStats
    async showMatchesStats(render = true) {
      try {
        const playerId = window.currentPlayerData?.player_id;
        if (!playerId) {
          console.error("Player ID is not available.");
          return;
        }

        // Reset map filter when loading a new player's matches to avoid leaking
        // selected map from previously viewed profile
        this.currentMapFilter = null;

        // Сбрасываем состояние при новой загрузке
        this.currentMatches = [];
        this.allHistoryItems = [];
        this.orderedMatches = [];
        this.availableMapOptions = [];
        this.mapScanOffsets = {};
        this.displayedMatchesCount = 0;
        this.unfilteredDisplayedCount = 0;
        this.matchesOffset = 0;
        this.isLoadingMore = false;

        // Показываем индикатор загрузки с переводом
        const statsContainer = document.querySelector(".stats-container");
        if (render && statsContainer) {
          statsContainer.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> ${getText(
            "loadingMatchHistory",
          )}</div>`;
        }

        // Загружаем все матчи игрока (через прокси)
        const pageSize = 100;
        let offset = 0;
        let allHistoryItems = [];
        let totalHistory = 0;
        let pageCount = 0;
        const seenMatchIds = new Set();
        const MAX_RETRIES = 2;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 3;

        while (consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
          let retries = 0;
          let success = false;
          let lastError = null;

          while (retries <= MAX_RETRIES && !success) {
            try {
              const historyUrl = `/api/history?playerId=${encodeURIComponent(
                String(playerId),
              )}&gameId=cs2&limit=${pageSize}&offset=${offset}`;

              console.log(
                `Fetching history page ${pageCount + 1} (offset=${offset}, retry=${retries})`,
              );

              const response = await fetch(historyUrl, {
                headers: {
                  Accept: "application/json",
                },
              });

              if (!response.ok) {
                lastError = `HTTP ${response.status} ${response.statusText}`;
                console.warn(
                  `History page ${pageCount} failed: ${lastError} (attempt ${retries + 1}/${MAX_RETRIES + 1})`,
                );

                // First page is critical, others are optional
                if (pageCount === 0) {
                  retries++;
                  if (retries <= MAX_RETRIES) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    continue;
                  } else {
                    throw new Error(
                      `Failed to fetch first page of match history: ${lastError}`,
                    );
                  }
                } else {
                  // For non-first pages, log warning and continue with what we have
                  console.warn(
                    `Stopping pagination at page ${pageCount}, keeping ${allHistoryItems.length} matches`,
                  );
                  break;
                }
              }

              const data = await response.json();

              if (!data || !data.items) {
                lastError = "Invalid response format: missing items";
                if (pageCount === 0) {
                  retries++;
                  if (retries <= MAX_RETRIES) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    continue;
                  } else {
                    throw new Error(`Failed to parse first page: ${lastError}`);
                  }
                } else {
                  console.warn(
                    `Stopping pagination at page ${pageCount}, keeping ${allHistoryItems.length} matches`,
                  );
                  break;
                }
              }

              if (data.items.length === 0) {
                console.log(`End of history reached at page ${pageCount}`);
                break;
              }

              if (!totalHistory) {
                totalHistory = data.total || data.items.length;
                console.log(`Total matches reported by API: ${totalHistory}`);
              }

              let addedThisPage = 0;
              for (const item of data.items) {
                const matchId = item?.match_id || item?.matchId || "";
                if (matchId && seenMatchIds.has(matchId)) {
                  continue;
                }
                if (matchId) {
                  seenMatchIds.add(matchId);
                }
                allHistoryItems.push(item);
                addedThisPage++;
              }

              console.log(
                `Page ${pageCount} loaded: ${addedThisPage} new matches (total: ${allHistoryItems.length})`,
              );
              success = true;
              consecutiveErrors = 0; // Сбрасываем счетчик ошибок при успехе
            } catch (error) {
              lastError = error.message;
              if (pageCount === 0) {
                retries++;
                if (retries <= MAX_RETRIES) {
                  console.warn(
                    `First page attempt ${retries} failed, retrying...`,
                  );
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                } else {
                  throw error;
                }
              } else {
                consecutiveErrors++;
                console.warn(
                  `Stopping pagination at page ${pageCount}, keeping ${allHistoryItems.length} matches (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS} consecutive errors)`,
                );
                break;
              }
            }
          }

          if (!success && pageCount === 0) {
            throw new Error(`Failed to load first page of match history`);
          }

          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.log(
              `Reached ${MAX_CONSECUTIVE_ERRORS} consecutive errors (likely API offset limit), stopping pagination`,
            );
            break;
          }

          pageCount++;

          if (success) {
            // Check if we should continue paginating
            const lastPageItems = allHistoryItems.slice(-pageSize);
            if (lastPageItems.length < pageSize) {
              console.log(
                `Last page had fewer than ${pageSize} items, stopping pagination`,
              );
              break;
            }
            offset += pageSize;
          } else {
            break;
          }
        }

        if (!allHistoryItems || allHistoryItems.length === 0) {
          console.warn("No match history found for the player.");
          if (render && statsContainer) {
            statsContainer.innerHTML = `<p class="api-error-text">No match history available for this player.</p>`;
          }
          return;
        }

        console.log(
          `Загружено ${allHistoryItems.length} матчей${
            totalHistory ? ` (total: ${totalHistory})` : ""
          }`,
        );
        this.totalMatches = totalHistory || allHistoryItems.length;

        // Показываем индикатор обработки с переводом
        if (render && statsContainer) {
          statsContainer.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> ${getText(
            "processingMatches",
          )}</div>`;
        }

        // Сохраняем историю и подготавливаем ленивую загрузку деталей матчей
        this.allHistoryItems = allHistoryItems;
        this.orderedMatches = new Array(allHistoryItems.length).fill(null);
        this.currentMatches = [];
        this.displayedMatchesCount = 0;

        // Считаем фильтры по полному количеству матчей из сегментов профиля
        // (без необходимости загружать детали каждого матча заранее)
        const mapCounts = {};
        const segments = window.currentPlayerProfile?.statsData?.segments || [];
        if (window.FaceitAPI && window.FaceitAPI.getAllMapsStats) {
          const allMapsStats = window.FaceitAPI.getAllMapsStats(segments) || [];
          allMapsStats.forEach((map) => {
            const key = SidebarManager.normalizeMapKey(map.name);
            const count = Number(map.matches) || 0;
            if (!key || count <= 0) return;
            mapCounts[key] = {
              name: map.name,
              count,
            };
          });
        }

        this.availableMapOptions = Object.keys(mapCounts)
          .map((k) => ({
            key: k,
            name: mapCounts[k].name,
            count: mapCounts[k].count,
          }))
          .sort((a, b) => b.count - a.count);

        // Загружаем только первую порцию матчей
        const initialLimit = Math.min(
          this.matchesLimit,
          this.allHistoryItems.length,
        );
        await this.ensureMatchesLoadedRange(0, initialLimit);
        this.displayedMatchesCount = this.currentMatches.length;
        this.unfilteredDisplayedCount = this.displayedMatchesCount;
        console.log(
          `Обработано ${this.currentMatches.length} матчей для первичного отображения`,
        );

        // Уберём оставшиеся индикаторы загрузки (чтобы сообщение об обновлении не висело)
        if (render && statsContainer) {
          statsContainer
            .querySelectorAll(".loading-indicator")
            .forEach((el) => el.remove());
        }

        // Построим список доступных карт и отрисуем выпадающий фильтр
        try {
          const statsContainer = document.querySelector(".stats-container");

          // Фолбэк: если не удалось взять карты из сегментов, считаем по уже загруженным матчам
          if (!this.availableMapOptions.length) {
            const loadedMapCounts = {};
            (this.currentMatches || []).forEach((m) => {
              const raw = m.map || "";
              const key = SidebarManager.normalizeMapKey(raw) || "";
              if (!key) return;
              if (!loadedMapCounts[key]) {
                loadedMapCounts[key] = { name: raw || key, count: 0 };
              }
              loadedMapCounts[key].count++;
            });
            this.availableMapOptions = Object.keys(loadedMapCounts).map(
              (k) => ({
                key: k,
                name: loadedMapCounts[k].name,
                count: loadedMapCounts[k].count,
              }),
            );
          }

          if (render && statsContainer) {
            // Вставляем фильтр перед списком матчей (тексты прописаны вручную)
            const selectHtml = `
            <div class="map-filter-container">
              <label class="map-filter-label">Map:
                <select id="mapFilterSelect">
                  <option value="">All maps</option>
                  ${this.availableMapOptions
                    .map(
                      (o) =>
                        `<option value="${o.key}">${o.name} (${o.count})</option>`,
                    )
                    .join("")}
                </select>
              </label>
            </div>
          `;

            // Удаляем возможные старые фильтры
            const old = statsContainer.querySelector(".map-filter-container");
            if (old) old.remove();

            statsContainer.insertAdjacentHTML("beforeend", selectHtml);

            const select = document.getElementById("mapFilterSelect");
            if (select) {
              select.addEventListener("change", async (e) => {
                this.currentMapFilter = e.target.value || null;

                if (this.currentMapFilter) {
                  const selectedMapOption = this.availableMapOptions.find(
                    (opt) => opt.key === this.currentMapFilter,
                  );
                  const expectedCount = selectedMapOption?.count || 0;

                  this.renderMatchesLoadingIndicator();
                  await this.ensureMatchesLoadedForMap(
                    this.currentMapFilter,
                    this.matchesLimit,
                    expectedCount,
                  );
                  const filteredMatches = this.getFilteredMatches();
                  const matchesToDisplay = filteredMatches.slice(
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
            }
          }

          // Отображаем историю матчей (первая порция)
          if (render) {
            this.displayMatchHistory(
              this.currentMatches.slice(0, this.matchesLimit),
              true,
            );
          }
        } catch (err) {
          console.error("Error rendering map filter:", err);
          if (render) {
            this.displayMatchHistory(
              this.currentMatches.slice(0, this.matchesLimit),
              true,
            );
          }
        }
      } catch (error) {
        console.error("Error fetching match history:", error);
        const statsContainer = document.querySelector(".stats-container");
        if (render && statsContainer) {
          statsContainer.innerHTML = `<p class="api-error-text">${error.message}</p>`;
        }
      }
    }

    // Обновите метод fetchMatchStats для повторных попыток
    async fetchMatchStats(matchId, playerId) {
      const MAX_RETRIES = 3;
      let retries = 0;

      while (retries < MAX_RETRIES) {
        try {
          // Fetch match-room statistics via serverless proxy
          const url = `/api/match-stats?matchId=${encodeURIComponent(
            String(matchId),
          )}`;

          const response = await fetch(url, {
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            if (
              (response.status === 500 || response.status === 404) &&
              retries < MAX_RETRIES - 1
            ) {
              retries++;
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * retries),
              );
              continue;
            }
            if (response.status === 404) {
              try {
                const infoRes = await fetch(
                  `/api/server?action=match-info&matchId=${encodeURIComponent(String(matchId))}`,
                );
                if (infoRes.ok) {
                  return extractFallbackMatch(await infoRes.json(), playerId);
                }
              } catch {
                // ignore fallback errors for missing match stats
              }

              return {
                map: "Unknown Map",
                score: "0 - 0",
                playerStats: {},
              };
            }

            throw new Error(`Failed to fetch match stats: ${response.status}`);
          }

          const statsData = await response.json();

          // V4 match stats response contains rounds
          if (!statsData.rounds || statsData.rounds.length === 0) {
            try {
              const infoRes = await fetch(
                `/api/server?action=match-info&matchId=${encodeURIComponent(String(matchId))}`,
              );
              if (infoRes.ok) {
                return extractFallbackMatch(await infoRes.json(), playerId);
              }
            } catch {
              // ignore fallback errors
            }

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
          if (retries >= MAX_RETRIES) {
            console.error(`Error fetching match stats for ${matchId}:`, error);
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
        }
      }
    }

    // Обновленная функция formatMatchData
    formatMatchData(match, statsData, playerId, index, totalMatches) {
      try {
        const safeStats = statsData || {};
        const safePlayerStats = safeStats.playerStats || {};
        const totalMatchNumber = totalMatches - index;
        const timestamp = Number(match.finished_at) * 1000;
        const date = !isNaN(timestamp)
          ? new Date(timestamp).toLocaleDateString()
          : "Unknown Date";

        // Используем данные из statsData вместо match
        const map = safeStats.map || "Map data not available";
        const score = safeStats.score || "0 - 0";

        // Определение результата (победа/поражение)
        let result = "LOSS";
        if (safePlayerStats.Result === "1") {
          result = "WIN";
        }

        const kills = Number(safePlayerStats.Kills) || 0;
        const headshots = Number(safePlayerStats.Headshots) || 0;
        const headshotPercentage =
          kills > 0 ? Math.round((headshots / kills) * 100) : 0;

        return {
          matchId: match.match_id || "Unknown Match ID",
          totalMatchNumber,
          date,
          map,
          score,
          playerStats: safePlayerStats,
          kills: kills,
          deaths: safePlayerStats.Deaths || 0,
          assists: safePlayerStats.Assists || 0,
          headshots: headshotPercentage,
          kdRatio: safePlayerStats["K/D Ratio"] || 0,
          mvps: safePlayerStats.MVPs || 0,
          result,
        };
      } catch (error) {
        console.error("Error formatting match data:", error);
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

      wrapper.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> ${getText(
        "processingMatches",
      )}</div>`;
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
        if (!this.orderedMatches[i]) {
          indexesToLoad.push(i);
        }
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
            try {
              const stats = await this.fetchMatchStats(
                historyMatch.match_id,
                playerId,
              );
              return this.formatMatchData(
                historyMatch,
                stats,
                playerId,
                historyIndex,
                this.totalMatches,
              );
            } catch (error) {
              console.error(
                `Error fetching stats for match ${historyMatch.match_id}:`,
                error,
              );
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

      let loadedForMap = this.getFilteredMatches().length;
      if (loadedForMap >= requiredCount) {
        return;
      }

      const chunkSize = this.matchesLimit;
      let chunkStart = this.mapScanOffsets[mapKey] || 0;

      while (
        chunkStart < this.allHistoryItems.length &&
        loadedForMap < requiredCount
      ) {
        const chunk_end = Math.min(
          chunk_start + chunkSize,
          this.allHistoryItems.length,
        );
        await this.ensureMatchesLoadedRange(chunk_start, chunk_end);
        this.mapScanOffsets[mapKey] = chunk_end;

        loadedForMap = this.getFilteredMatches().length;
        chunk_start = chunk_end;
      }
    }

    // Обновление отображения статистики в зависимости от выбранного вида
    updatePlayerStatsView(view) {
      const statsContainer = document.querySelector(".stats-container");
      const playerCard = document.querySelector(".player-card");
      const playerHeader = playerCard
        ? playerCard.querySelector(".player-header")
        : null;
      if (!playerCard || !playerHeader) return;

      const search = document.getElementById("search");
      // Сохраняем элементы .stats-box один раз
      const statsBoxes = playerCard.querySelectorAll(".stats-box"); // Исправлено: ищем в playerCard, а не в playerHeader

      // Отменяем предыдущий таймаут
      if (this.updateViewTimeout) {
        clearTimeout(this.updateViewTimeout);
      }

      // Анимируем только видимые элементы
      if (playerCard.style.display !== "none") {
        playerCard.style.opacity = "0.7";
      }

      this.updateViewTimeout = setTimeout(() => {
        switch (view) {
          case "overview":
            this.hideApiErrorText();

            if (search) search.style.display = "none";

            // Удаляем все элементы карт и истории матчей если есть (ДО рендеринга нового контента)
            statsContainer
              .querySelectorAll(
                ".maps-grid, .match-history, .map-card, .loading-indicator",
              )
              .forEach((element) => {
                element.remove();
              });

            // Генерируем HTML для обзора с актуальными переводами
            renderOverviewStats(statsContainer);

            // Восстанавливаем оригинальные стили
            playerCard.style.display = "block";
            playerHeader.style.display = "flex";
            playerHeader.style.flexDirection = ""; // Сбрасываем кастомные стили
            playerHeader.style.textAlign = "";
            playerHeader.style.alignItems = "";
            playerHeader.style.gap = "";

            statsContainer.style.display = "grid";

            // Показываем все блоки статистики
            statsContainer.querySelectorAll(".stats-box").forEach((box) => {
              box.style.display = "block";
            });

            break;

          case "matches": {
            // Показываем индикатор загрузки с переводом
            statsContainer.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> ${getText(
              "loadingMatchHistory",
            )}</div>`;
            statsContainer.style.display = "block";

            // Показываем карточку с оригинальным заголовком
            playerCard.style.display = "block";
            playerHeader.style.display = "flex";

            // Для мобильных адаптируем заголовок
            if (window.innerWidth <= 768) {
              playerHeader.style.flexDirection = "column";
              playerHeader.style.textAlign = "center";
              playerHeader.style.alignItems = "center";
              playerHeader.style.gap = "1.5rem";
            }

            // Загружаем матчи с небольшой задержкой для плавности UI
            setTimeout(() => {
              this.showMatchesStats();
            }, 300);
            break;
          }

          case "records": {
            this.hideApiErrorText();
            if (search) search.style.display = "none";

            playerCard.style.display = "block";
            playerHeader.style.display = "flex";
            statsContainer.style.display = "block"; // Changed from grid to block

            // Render record filter buttons
            statsContainer.innerHTML = `
            <div class="record-filters">
              <button class="record-filter-btn active" data-record="mostKills">${getText(
                "mostKills",
              )}</button>
              <button class="record-filter-btn" data-record="highestKD">${getText(
                "highestKD",
              )}</button>
              <button class="record-filter-btn" data-record="highestKDDifference">${getText(
                "highestKDDifference",
              )}</button>
              <button class="record-filter-btn" data-record="mostMVPs">${getText(
                "mostMVPs",
              )}</button>
              <button class="record-filter-btn" data-record="highestHeadshotPct">${getText(
                "highestHeadshotPct",
              )}</button>
            </div>
            <div class="record-display">
              <div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> ${getText(
                "loadingRecords",
              )}</div>
            </div>
          `;

            // Add event listeners for filter buttons
            statsContainer
              .querySelectorAll(".record-filter-btn")
              .forEach((button) => {
                button.addEventListener("click", (e) => {
                  statsContainer
                    .querySelectorAll(".record-filter-btn")
                    .forEach((btn) => btn.classList.remove("active"));
                  e.target.classList.add("active");
                  this.showRecord(e.target.dataset.record);
                });
              });

            // Initially show the default record
            this.showRecord("mostKills");
            break;
          }

          case "maps": {
            // Показываем индикатор загрузки
            statsContainer.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> ${getText(
              "loadingMaps",
            )}</div>`;
            statsContainer.style.display = "block";

            // Скрываем блоки статистики, но НЕ трогаем player-header
            statsBoxes.forEach((box) => {
              box.style.display = "none";
            });

            // ВАЖНО: Сохраняем правильные стили для player-header как в других случаях
            if (playerHeader) {
              playerHeader.style.display = "flex";
              // Для мобильных применяем те же стили, что и для matches
              if (window.innerWidth <= 768) {
                playerHeader.style.flexDirection = "column";
                playerHeader.style.textAlign = "center";
                playerHeader.style.alignItems = "center";
                playerHeader.style.gap = "1.5rem";
              } else {
                // Для десктопа восстанавливаем исходные стили
                playerHeader.style.flexDirection = "";
                playerHeader.style.textAlign = "";
                playerHeader.style.alignItems = "";
                playerHeader.style.gap = "";
              }
            }

            // Загружаем карты с небольшой задержкой для плавности UI
            setTimeout(() => {
              try {
                const playerProfile = window.currentPlayerProfile;

                if (!playerProfile || !playerProfile.statsData) {
                  statsContainer.innerHTML = `<p>${getText("notEnoughData")}</p>`;
                  return;
                }

                const segments = playerProfile.statsData.segments || [];

                if (segments.length === 0) {
                  statsContainer.innerHTML = `<p>${getText("notEnoughData")}</p>`;
                  return;
                }

                // Используем getAllMapsStats для получения данных карт
                if (window.FaceitAPI && window.FaceitAPI.getAllMapsStats) {
                  const allMapsStats =
                    window.FaceitAPI.getAllMapsStats(segments);

                  allMapsStats.sort((a, b) => b.winRate - a.winRate);

                  if (allMapsStats && allMapsStats.length > 0) {
                    // Создаем сетку карточек
                    let html = `<div class="maps-grid">`;

                    allMapsStats.forEach((map) => {
                      // Определяем цвет карточки на основе винрейта
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
                        winRateColor = "#4caf50";
                      }

                      // Normalize map key for styling/backgrounds
                      const mapKey = String(map.name || "")
                        .trim()
                        .toLowerCase()
                        .replace(/^de_/, "")
                        .replace(/\s+/g, "_")
                        .replace(/[^a-z0-9_]/g, "");

                      // Ensure kd and avgKills are numbers
                      const kd =
                        typeof map.kd === "number"
                          ? map.kd
                          : parseFloat(map.kd);
                      const avgKills =
                        typeof map.avgKills === "number"
                          ? map.avgKills
                          : parseFloat(map.avgKills);
                      const hs =
                        typeof map.hs === "number"
                          ? map.hs
                          : parseFloat(map.hs);
                      const adr =
                        typeof map.adr === "number"
                          ? map.adr
                          : parseFloat(map.adr);

                      html += `
                      <div class="${cardClass}" data-map="${mapKey}">
                        <div class="map-card-header">
                          <h3 class="map-name">${map.name}</h3>
                          <div class="win-rate-badge" style="background: ${winRateColor}">
                            ${map.winRate.toFixed(1)}%
                          </div>
                        </div>
                        <div class="map-card-body">
                          <div class="map-stat-row">
                            <div class="map-stat-item">
                              <i class="fas fa-gamepad"></i>
                              <span class="stat-label">${getText("mapMatches")}</span>
                              <span class="stat-value">${map.matches}</span>
                            </div>
                            <div class="map-stat-item">
                              <i class="fas fa-crosshairs"></i>
                              <span class="stat-label">K/D</span>
                              <span class="stat-value">${!isNaN(kd) ? kd.toFixed(2) : "-"}</span>
                            </div>
                          </div>
                          <div class="map-stat-row">
                            <div class="map-stat-item">
                              <i class="fas fa-bolt"></i>
                              <span class="stat-label">Avg.kills</span>
                              <span class="stat-value">${!isNaN(avgKills) ? avgKills.toFixed(1) : "-"}</span>
                            </div>
                            <div class="map-stat-item">
                              <i class="fas fa-trophy"></i>
                              <span class="stat-label">${getText("mapWinRate")}</span>
                              <span class="stat-value">${map.winRate.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div class="map-stat-row">
                            <div class="map-stat-item">
                              <i class="fas fa-fire"></i>
                              <span class="stat-label">ADR</span>
                              <span class="stat-value">${!isNaN(adr) ? adr.toFixed(1) : "-"}</span>
                            </div>
                            <div class="map-stat-item">
                              <i class="fas fa-star"></i>
                              <span class="stat-label">Clutches</span>
                              <span class="stat-value">${typeof map.clutches === "number" ? map.clutches : "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    `;
                    });

                    html += "</div>";
                    statsContainer.innerHTML = html;

                    // Применяем фоны для карточек карт
                    applyMapCardBackgrounds(statsContainer);
                  } else {
                    // Fallback к analyzeMaps
                    const mapAnalysis = window.FaceitAPI.analyzeMaps(
                      segments,
                      "cs2",
                      true,
                    );

                    if (
                      mapAnalysis &&
                      mapAnalysis.allMaps &&
                      mapAnalysis.allMaps.length > 0
                    ) {
                      mapAnalysis.allMaps.sort((a, b) => b.winRate - a.winRate);
                      let html = `<table class="maps-table"><thead><tr>
                      <th>${getText("mapName")}</th>
                      <th>${getText("mapMatches")}</th>
                      <th>${getText("mapWinRate")}</th>
                      <th>K/D</th>
                      <th>${getText("killsPerMatch")}</th>
                    </tr></thead><tbody>`;

                      mapAnalysis.allMaps.forEach((map) => {
                        html += `<tr>
                        <td>${map.name}</td>
                        <td>${map.matches}</td>
                        <td>${map.winRate.toFixed(1)}%</td>
                        <td>${map.kd.toFixed(2)}</td>
                        <td>${map.avgKills.toFixed(1)}</td>
                      </tr>`;
                      });

                      html += "</tbody></table>";
                      statsContainer.innerHTML = html;
                    } else {
                      statsContainer.innerHTML = `<p>${getText(
                        "notEnoughData",
                      )}</p>`;
                    }
                  }
                } else {
                  statsContainer.innerHTML = `<p>${getText("notEnoughData")}</p>`;
                }
              } catch (error) {
                console.error("Ошибка при загрузке данных карт:", error);
                statsContainer.innerHTML = `<p class="api-error-text">Ошибка загрузки данных карт</p>`;
              }
            }, 300);

            break;
          }

          default:
            console.warn("Unknown view type:", view);
        }

        playerCard.style.opacity = "1";
      }, 150);
    }

    // В классе SidebarManager
    displayMatchHistory(matches, isInitialLoad = false) {
      const statsContainer = document.querySelector(".stats-container");
      if (!statsContainer) return;

      // Ensure we render matches inside a dedicated wrapper so we don't wipe filters
      let wrapper = statsContainer.querySelector(".matches-content-wrapper");
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "matches-content-wrapper";
        statsContainer.appendChild(wrapper);
      }

      if (!matches || matches.length === 0) {
        wrapper.innerHTML = `<p>${getText("noMatchHistory")}</p>`;
        return;
      }

      const matchHistoryHTML = matches.map(buildMatchItemHtml).join("");

      // Создаем контейнер для истории матчей
      let matchHistoryContainer = `<div class="match-history">${matchHistoryHTML}</div>`;

      // Если есть еще матчи для загрузки, добавляем кнопку "Показать еще"
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
      const hasMoreMatches = matches.length < totalFiltered;
      if (hasMoreMatches) {
        const remainingMatches = totalFiltered - matches.length;
        matchHistoryContainer += `
        <div class="show-more-container">
          <button class="show-more-btn" style="font-family: 'Orbitron', sans-serif;" onclick="sidebarManager.loadMoreMatches()">
            <i class="fas fa-chevron-down"></i>
            ${getText("showMoreMatches")} (${remainingMatches})
          </button>
        </div>
      `;
      }

      wrapper.innerHTML = matchHistoryContainer;

      // Добавляем анимацию появления для новых матчей
      if (!isInitialLoad) {
        const newMatches = statsContainer.querySelectorAll(".match-item");
        newMatches.forEach((item, index) => {
          if (index >= matches.length - this.matchesLimit) {
            // Анимируем только новые матчи
            item.style.opacity = "0";
            item.style.transform = "translateY(20px)";
            setTimeout(() => {
              item.style.transition = "opacity 0.3s ease, transform 0.3s ease";
              item.style.opacity = "1";
              item.style.transform = "translateY(0)";
            }, index * 50);
          }
        });
      }
    }

    // Загрузка дополнительных матчей
    async loadMoreMatches() {
      if (this.isLoadingMore) {
        return;
      }
      this.isLoadingMore = true;

      const showMoreContainer = document.querySelector(".show-more-container");
      if (showMoreContainer) {
        showMoreContainer.innerHTML = `<div class="loading-indicator small"><i class="fas fa-spinner fa-spin"></i> ${getText(
          "processingMatches",
        )}</div>`;
      }

      try {
        const currentlyDisplayedCount =
          document.querySelectorAll(".match-item").length;
        const newTotalDisplayed = currentlyDisplayedCount + this.matchesLimit;

        if (this.currentMapFilter) {
          const selectedMapOption = this.availableMapOptions.find(
            (opt) => opt.key === this.currentMapFilter,
          );
          const expectedCount = selectedMapOption?.count || 0;
          await this.ensureMatchesLoadedForMap(
            this.currentMapFilter,
            newTotalDisplayed,
            expectedCount,
          );

          const source = this.getFilteredMatches();
          const matchesToDisplay = source.slice(0, newTotalDisplayed);
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

      recordDisplay.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> ${getText(
        "loadingRecords",
      )}</div>`;

      if (this.currentMatches.length === 0) {
        await this.showMatchesStats(false);
      }

      if (this.currentMatches.length === 0) {
        recordDisplay.innerHTML = `<p>${getText("notEnoughData")}</p>`;
        return;
      }

      const recordLabelMap = {
        mostKills: getText("mostKills"),
        highestKD: getText("highestKD"),
        highestKDDifference: getText("highestKDDifference"),
        mostMVPs: getText("mostMVPs"),
        highestHeadshotPct: getText("highestHeadshotPct"),
      };

      const recordLabel = recordLabelMap[recordType] || "";

      const rankedMatches = this.currentMatches
        .filter((match) => match.result !== "Error")
        .map((match) => {
          let value;
          switch (recordType) {
            case "mostKills":
              value = Number(match.kills);
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
            case "highestHeadshotPct": {
              const kills = Number(match.kills);
              const headshots = Number(match.headshots);
              value = kills > 0 ? (headshots / kills) * 100 : 0;
              break;
            }
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

      if (rankedMatches.length === 0) {
        recordDisplay.innerHTML = `<p>${getText("notEnoughData")}</p>`;
        return;
      }

      recordDisplay.innerHTML = this.formatRecord(rankedMatches, recordLabel);
    }

    formatRecord(rankedMatches, label) {
      const itemsHtml = rankedMatches
        .map(({ match }) => buildMatchItemHtml(match))
        .join("");

      return `
      <div class="record-match-list">
        <h3>${label}</h3>
        <div class="match-history">
          ${itemsHtml}
        </div>
      </div>
    `;
    }

    // Mobile sidebar methods (for desktop compatibility)
    toggleMobileSidebar() {
      if (!this.isPlayerProfileActive) return;

      if (this.isMobileOpen) {
        this.closeMobileSidebar();
      } else {
        this.openMobileSidebar();
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

    // Н
    toggleDrawer() {
      if (!this.isPlayerProfileActive) return;

      if (this.isDrawerExpanded) {
        this.collapseDrawer();
      } else {
        this.expandDrawer();
      }
    }

    expandDrawer() {
      this.isDrawerExpanded = true;
      if (this.mobileDrawer) {
        this.mobileDrawer.classList.add("expanded");
        // Показываем о
        if (this.mobileOverlay) {
          this.mobileOverlay.classList.add("active");
        }
        document.body.style.overflow = "hidden";
      }
    }

    collapseDrawer() {
      this.isDrawerExpanded = false;
      if (this.mobileDrawer) {
        this.mobileDrawer.classList.remove("expanded");

        // Скрываем оверлей при сворачивании шторки
        if (this.mobileOverlay) {
          this.mobileOverlay.classList.remove("active");
        }
        document.body.style.overflow = "";
      }
    }

    handleResize() {
      if (window.innerWidth > 768) {
        // На десктопе
        this.closeMobileSidebar();
        this.collapseDrawer();

        if (this.mobileDrawer) {
          // Полностью скрываем мобильную шторку на десктопе
          this.mobileDrawer.classList.remove("visible", "expanded");
          this.mobileDrawer.style.display = "none";
        }

        if (this.isPlayerProfileActive) {
          // Показываем обычный сайдбар
          this.sidebar.classList.add("player-profile-active");
          this.sidebar.classList.add("slide-in");
          document.body.classList.add("sidebar-open");
        }
      } else {
        // На мобильных
        document.body.classList.remove("sidebar-open");
        this.sidebar.classList.remove("slide-in");
        this.sidebar.classList.remove("player-profile-active");

        if (this.mobileDrawer) {
          // На мобильных шторка должна быть видна только при активном профиле
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
})();
