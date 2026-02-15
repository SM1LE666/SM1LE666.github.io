let playerStats;
let isInitialized = false; // Флаг для предотвращения множественной инициализации
let currentPlayerProfile = null; // Текущий профиль игрока
let sidebarManager = null; // Менеджер сайдбара
const REQUEST_DELAY = 30; // Задержка в мс между запросами

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
    this.matchesOffset = 0; // Смещение для пагинации
    this.matchesLimit = 10; // Количество загружаемых матчей за раз
    this.isLoadingMore = false; // Флаг загрузки
    this.totalMatches = 0; // Общее количество матчей
    this.showMoreButton = null; // Кнопка "Показать еще"

    this.initializeEventListeners();
  }

  handleResize() {
    // Добавьте этот код для обновления стилей при изменении размера окна
    const playerCard = document.querySelector(".player-card");
    const playerHeader = playerCard
      ? playerCard.querySelector(".player-header")
      : null;

    if (playerHeader && this.currentView === "matches") {
      if (window.innerWidth <= 768) {
        playerHeader.style.flexDirection = "column";
        playerHeader.style.textAlign = "center";
        playerHeader.style.alignItems = "center";
        playerHeader.style.gap = "1.5rem";
      } else {
        playerHeader.style.flexDirection = "";
        playerHeader.style.textAlign = "";
        playerHeader.style.alignItems = "";
        playerHeader.style.gap = "";
      }
    }

    // ПРИНУДИТЕЛЬНО скрываем мобильную шторку на десктопе
    if (window.innerWidth > 768) {
      if (this.mobileDrawer) {
        this.mobileDrawer.style.display = "none !important";
        this.mobileDrawer.classList.remove("expanded", "visible");
        this.isDrawerExpanded = false;
      }
      // Скрываем мобильный overlay
      if (this.mobileOverlay) {
        this.mobileOverlay.classList.remove("active");
      }
      document.body.style.overflow = "";

      // Показываем десктопный сайдбар если профиль активен
      if (this.isPlayerProfileActive) {
        this.sidebar.classList.add("player-profile-active");
        document.body.classList.add("sidebar-open");
      }
    } else {
      // На мобильных ПОЛНОСТЬЮ скрываем десктопный сайдбар
      this.sidebar.classList.remove("player-profile-active");
      document.body.classList.remove("sidebar-open");

      // Показываем шторку только если профиль активен
      if (this.isPlayerProfileActive && this.mobileDrawer) {
        this.mobileDrawer.style.display = "block";
        this.mobileDrawer.classList.add("visible");
      }
    }
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
    document.querySelectorAll(".sidebar-item, .drawer-item").forEach((item) => {
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
  async showMatchesStats() {
    try {
      const playerId = window.currentPlayerData?.player_id;
      if (!playerId) {
        console.error("Player ID is not available.");
        return;
      }

      // Сбрасываем состояние при новой загрузке
      this.currentMatches = [];
      this.matchesOffset = 0;
      this.isLoadingMore = false;

      // Показываем индикатор загрузки с переводом
      const statsContainer = document.querySelector(".stats-container");
      if (statsContainer) {
        statsContainer.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> ${getText(
          "loadingMatchHistory"
        )}</div>`;
      }

      // Загружаем все матчи игрока
      const url = `https://open.faceit.com/data/v4/players/${playerId}/history?game=cs2&limit=2000`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer 6f6dd5d6-0ccf-4c2c-a88e-c4386aa0d03a`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);
        throw new Error("Failed to fetch match history from FACEIT API.");
      }

      const data = await response.json();

      if (!data || !data.items || data.items.length === 0) {
        console.warn("No match history found for the player.");
        const statsContainer = document.querySelector(".stats-container");
        if (statsContainer) {
          statsContainer.innerHTML = `<p class=\"api-error-text\">No match history available for this player.</p>`;
        }
        return;
      }

      console.log(
        `Загружено ${data.items.length} матчей из ${
          data.total || data.items.length
        } доступных`
      );
      this.totalMatches = data.total || data.items.length;

      // Показываем индикатор обработки с переводом
      if (statsContainer) {
        statsContainer.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> ${getText(
          "processingMatches"
        )}</div>`;
      }

      // Получение детальной статистики для каждого матча
      const matches = await Promise.all(
        data.items.map(async (match, index) => {
          try {
            const stats = await this.fetchMatchStats(match.match_id, playerId);
            return this.formatMatchData(
              match,
              stats,
              playerId,
              index,
              this.totalMatches
            );
          } catch (error) {
            console.error(
              `Error fetching stats for match ${match.match_id}:`,
              error
            );
            return this.formatMatchData(
              match,
              null,
              playerId,
              index,
              this.totalMatches
            );
          }
        })
      );

      // Сохраняем все матчи
      this.currentMatches = matches;
      console.log(`Обработано ${matches.length} матчей для отображения`);

      // Отображаем историю матчей
      this.displayMatchHistory(this.currentMatches.slice(0, 20), true);
    } catch (error) {
      console.error("Error fetching match history:", error);
      const statsContainer = document.querySelector(".stats-container");
      if (statsContainer) {
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
        const url = `https://open.faceit.com/data/v4/matches/${matchId}/stats`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer 6f6dd5d6-0ccf-4c2c-a88e-c4386aa0d03a`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 500 && retries < MAX_RETRIES - 1) {
            retries++;
            // Увеличиваем задержку с каждой попыткой
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
            continue;
          }
          throw new Error(`Failed to fetch match stats: ${response.status}`);
        }

        const statsData = await response.json();

        // Проверяем, есть ли данные по раундам
        if (!statsData.rounds || statsData.rounds.length === 0) {
          return {
            map: "Map data not available",
            score: "Score not available",
            playerStats: {},
          };
        }

        // Извлекаем основную информацию из первого раунда
        const round = statsData.rounds[0];
        const map = round.round_stats.Map || "Unknown Map";
        const score = round.round_stats.Score || "0 - 0";

        // Находим статистику конкретного игрока
        let playerStats = {};
        for (const team of round.teams) {
          const player = team.players.find((p) => p.player_id === playerId);
          if (player) {
            playerStats = player.player_stats;
            break;
          }
        }

        return {
          map,
          score,
          playerStats,
        };
      } catch (error) {
        retries++;
        if (retries >= MAX_RETRIES) {
          console.error(`Error fetching match stats for ${matchId}:`, error);
          throw error;
        }
        // Увеличиваем задержку с каждой попыткой
        await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
      }
    }
  }

  // Обновленная функция formatMatchData
  formatMatchData(match, statsData, playerId, index, totalMatches) {
    try {
      const totalMatchNumber = totalMatches - index;
      const timestamp = Number(match.finished_at) * 1000;
      const date = !isNaN(timestamp)
        ? new Date(timestamp).toLocaleDateString()
        : "Unknown Date";

      // Используем данные из statsData вместо match
      const map = statsData.map || "Map data not available";
      const score = statsData.score || "0 - 0";

      // Определение результата (победа/поражение)
      let result = "LOSS";
      if (statsData.playerStats.Result === "1") {
        result = "WIN";
      }

      return {
        matchId: match.match_id || "Unknown Match ID",
        totalMatchNumber,
        date,
        map,
        score,
        playerStats: statsData.playerStats || {},
        kills: statsData.playerStats.Kills || 0,
        deaths: statsData.playerStats.Deaths || 0,
        assists: statsData.playerStats.Assists || 0,
        headshots: statsData.playerStats.Headshots || 0,
        kdRatio: statsData.playerStats["K/D Ratio"] || 0,
        mvps: statsData.playerStats.MVPs || 0,
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

          // Показываем все блоки статистики и удаляем карточки карт
          statsContainer.querySelectorAll(".stats-box").forEach((box) => {
            box.style.display = "block";
          });

          // Удаляем все элементы карт и истории матчей если есть
          statsContainer
            .querySelectorAll(".maps-grid, .match-history, .map-card")
            .forEach((element) => {
              element.remove();
            });
          break;

        case "matches": {
          // Показываем индикатор загрузки с переводом
          statsContainer.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> ${getText(
            "loadingMatchHistory"
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

        case "maps": {
          // Показываем индикатор загрузки
          statsContainer.innerHTML = `<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> ${getText(
            "loadingMaps"
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
                const allMapsStats = window.FaceitAPI.getAllMapsStats(segments);

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

                    html += `
                      <div class="${cardClass}">
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
                              <span class="stat-label">${getText(
                                "mapMatches"
                              )}</span>
                              <span class="stat-value">${map.matches}</span>
                            </div>
                            
                            <div class="map-stat-item">
                              <i class="fas fa-crosshairs"></i>
                              <span class="stat-label">K/D</span>
                              <span class="stat-value">${map.kd}</span>
                            </div>
                          </div>
                          
                          <div class="map-stat-row">
                            <div class="map-stat-item">
                              <i class="fas fa-skull"></i>
                              <span class="stat-label">${getText(
                                "killsPerMatch"
                              )}</span>
                              <span class="stat-value">${map.avgKills}</span>
                            </div>
                            
                            <div class="map-stat-item">
                              <i class="fas fa-trophy"></i>
                              <span class="stat-label">${getText(
                                "mapWinRate"
                              )}</span>
                              <span class="stat-value">${map.winRate.toFixed(
                                1
                              )}%</span>
                            </div>
                          </div>
                          
                          <div class="map-stat-row">
                            <div class="map-stat-item">
                              <i class="fas fa-fire"></i>
                              <span class="stat-label">${getText("adr")}</span>
                              <span class="stat-value">${map.adr}</span>
                            </div>
                            
                            <div class="map-stat-item">
                              <i class="fas fa-star"></i>
                              <span class="stat-label">${getText(
                                "clutches"
                              )}</span>
                              <span class="stat-value">${map.clutches}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div class="map-card-footer">
                          <div class="performance-indicator">
                            ${
                              map.winRate >= 55
                                ? `<i class="fas fa-arrow-up"></i> ${getText(
                                    "excellentMap"
                                  )}`
                                : map.winRate >= 40
                                ? `<i class="fas fa-minus"></i> ${getText(
                                    "averageMap"
                                  )}`
                                : `<i class="fas fa-arrow-down"></i> ${getText(
                                    "poorMap"
                                  )}`
                            }
                          </div>
                        </div>
                      </div>
                    `;
                  });

                  html += "</div>";
                  statsContainer.innerHTML = html;
                } else {
                  // Fallback к analyzeMaps
                  const mapAnalysis = window.FaceitAPI.analyzeMaps(
                    segments,
                    "cs2",
                    true
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
                      "notEnoughData"
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

          return;
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

    if (!matches || matches.length === 0) {
      statsContainer.innerHTML = `<p>${getText("noMatchHistory")}</p>`;
      return;
    }

    const matchHistoryHTML = matches
      .map((match) => {
        const hasError = match.result === "Error";

        if (hasError) {
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
        const resultText = getText(match.result.toLowerCase());

        const kdRatio =
          match.deaths > 0
            ? (match.kills / match.deaths).toFixed(2)
            : match.kills > 0
            ? "∞"
            : "0.00";

        let matchUrl = "";
        if (match.matchId && match.matchId.startsWith("1-")) {
          matchUrl = `https://www.faceit.com/${getCurrentLanguage()}/cs2/room/${
            match.matchId
          }`;
        } else if (match.matchId) {
          matchUrl = `https://www.faceit.com/${getCurrentLanguage()}/matchroom/${
            match.matchId
          }`;
        }

        // Updated match item structure to match the screenshot exactly
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
              <i class="fas fa-crosshairs"></i> 
              <span>${match.headshots}</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-chart-line"></i> 
              <span>${kdRatio}</span>
            </div>
            <div class="stat-item">
              <i class="fas fa-star"></i> 
              <span>${match.mvps}</span>
            </div>
          </div>
        </div>`;
      })
      .join("");

    // Создаем контейнер для истории матчей
    let matchHistoryContainer = `<div class="match-history">${matchHistoryHTML}</div>`;

    // Если есть еще матчи для загрузки, добавляем кнопку "Показать еще"
    const hasMoreMatches = matches.length < this.currentMatches.length;
    if (hasMoreMatches) {
      const remainingMatches = this.currentMatches.length - matches.length;
      matchHistoryContainer += `
        <div class="show-more-container">
          <button class="show-more-btn" onclick="sidebarManager.loadMoreMatches()">
            <i class="fas fa-chevron-down"></i>
            ${getText("showMoreMatches")} (${remainingMatches})
          </button>
        </div>
      `;
    }

    statsContainer.innerHTML = matchHistoryContainer;

    // Добавляем анимацию появления для новых матчей
    if (!isInitialLoad) {
      const newMatches = statsContainer.querySelectorAll(".match-item");
      newMatches.forEach((item, index) => {
        if (index >= matches.length - 20) {
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
  loadMoreMatches() {
    if (this.isLoadingMore) {
      return;
    }
    this.isLoadingMore = true;

    const showMoreContainer = document.querySelector(".show-more-container");
    if (showMoreContainer) {
      showMoreContainer.innerHTML = `<div class="loading-indicator small"><i class="fas fa-spinner fa-spin"></i> ${getText(
        "processingMatches"
      )}</div>`;
    }

    // Небольшая задержка для отображения индикатора загрузки
    setTimeout(() => {
      const currentlyDisplayedCount =
        document.querySelectorAll(".match-item").length;
      const matchesToLoad = 20;
      const newTotalDisplayed = currentlyDisplayedCount + matchesToLoad;
      const matchesToDisplay = this.currentMatches.slice(0, newTotalDisplayed);

      this.displayMatchHistory(matchesToDisplay, false);

      this.isLoadingMore = false;
    }, 300);
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

  // Новые методы для управления мобильной шторкой
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
      // Показываем оверлей при развороте шторки
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

  // Функция возврата в главное меню
  goBackToMainMenu() {
    // Очищаем поле поиска
    const nicknameInput = document.getElementById("nickname");
    if (nicknameInput) {
      nicknameInput.value = "";
    }

    // Очищаем профиль игрока
    clearPlayerProfile();

    // Убираем класс для отображения поиска
    document.body.classList.remove("profile-active");

    // Прокручиваем к началу страницы с плавной анимацией
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    console.log("Возврат в главное меню");
  }

  // Обновление при изменении размера окна
  handleResize() {
    if (window.innerWidth > 768) {
      // На десктопе
      this.closeMobileSidebar();
      this.collapseDrawer();

      if (this.isPlayerProfileActive) {
        // Показываем обычный сайдбар
        this.sidebar.classList.add("player-profile-active");
        this.sidebar.classList.add("slide-in");
        document.body.classList.add("sidebar-open");

        // Скрываем мобильную шторку
        if (this.mobileDrawer) {
          this.mobileDrawer.classList.remove("visible");
        }
      }
    } else {
      // На мобильных
      document.body.classList.remove("sidebar-open");
      this.sidebar.classList.remove("slide-in");

      if (this.isPlayerProfileActive) {
        // Показываем мобильную шторку
        if (this.mobileDrawer) {
          this.mobileDrawer.classList.add("visible");
        }
      }
    }
  }
}

// --- Anonymous analytics tracking (Vercel) ---
function getAnonymousId() {
  const key = "fa_anonymous_id";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;

    const id =
      crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(key, id);
    return id;
  } catch {
    // fallback when storage is blocked
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function getSessionId() {
  const key = "fa_session_id";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id =
      crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function getLastAnalyzedPlayer() {
  try {
    const nickname = window.currentPlayerData?.nickname || null;
    const playerId = window.currentPlayerData?.player_id || null;
    return { nickname, playerId };
  } catch {
    return { nickname: null, playerId: null };
  }
}

// --- Cookie consent (analytics) ---
const COOKIE_CONSENT_KEY = "fa_cookie_consent_v1"; // 'accepted' | 'rejected'

function getCookieConsent() {
  try {
    const v = localStorage.getItem(COOKIE_CONSENT_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

function setCookieConsent(value) {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // ignore
  }
}

function isAnalyticsAllowed() {
  const consent = getCookieConsent();
  return consent === "accepted";
}

function openCookieModal() {
  const modal = document.getElementById("cookieModal");
  if (!modal) return;
  modal.style.display = "block";
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeCookieModal() {
  const modal = document.getElementById("cookieModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.classList.remove("show");
  document.body.style.overflow = "";
}

function updateCookieFabVisibility() {
  const fab = document.getElementById("cookieFab");
  if (!fab) return;
  // Keep it visible for users who rejected (so they can change their mind).
  // If accepted, we can still keep it, but hide by default to reduce UI noise.
  const consent = getCookieConsent();
  fab.style.display = consent === "accepted" ? "none" : "inline-flex";
}

function trackEvent(eventName, props = {}) {
  try {
    // Gate analytics events by consent
    if (!isAnalyticsAllowed()) return;

    const last = getLastAnalyzedPlayer();
    const payload = {
      anonymousId: getAnonymousId(),
      sessionId: getSessionId(),
      eventName,
      eventSource: "web",
      referrer: document.referrer || "",
      props: {
        // stable context
        lang: document.documentElement.lang || "",
        timezone: (() => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
          } catch {
            return "";
          }
        })(),
        screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
        url: location.href,
        // last analyzed player (if any)
        analyzedNickname: last.nickname,
        analyzedPlayerId: last.playerId,
        // custom props
        ...props,
      },
    };

    const body = JSON.stringify(payload);

    // Prefer sendBeacon (works during unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/track", blob);
      return;
    }

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore tracking errors
  }
}

// Track page view ASAP
try {
  trackEvent("page_view", { title: document.title });
} catch {}

// Global click tracking (only for meaningful elements)
document.addEventListener(
  "click",
  (e) => {
    const t = e.target;
    if (!t || !(t instanceof Element)) return;

    const el =
      t.closest("#searchButton") ||
      t.closest(".support-btn") ||
      t.closest(".contact-btn") ||
      t.closest("#reactionTestBtn") ||
      t.closest(".sidebar-item") ||
      t.closest(".drawer-item") ||
      t.closest(".show-more-btn") ||
      t.closest(".submit-btn");

    if (!el) return;

    const label =
      (el.getAttribute("data-view") &&
        `view:${el.getAttribute("data-view")}`) ||
      el.getAttribute("data-action") ||
      el.id ||
      el.className ||
      el.tagName;

    trackEvent("click", { label });
  },
  { passive: true }
);

// Функция для получения текущего языка
function getCurrentLanguage() {
  return window.currentLanguage || currentLanguage || "en";
}

// Объект с переводами
const translations = {
  en: {
    // Header
    title: "FACEIT Analyze",

    // Sidebar
    sidebarBack: "Back to Menu",
    sidebarOverview: "Overview",
    sidebarDetailed: "Detailed",
    sidebarMaps: "Maps",
    sidebarHistory: "History",
    sidebarCompare: "Compare",
    sidebarMatches: "Matches",

    // Mobile drawer
    drawerTitle: "Player Statistics",

    // Search section
    searchTitle: "Search Player",
    searchPlaceholder: "Enter player nickname or profile URL",
    analyzeButton: "ANALYZE",

    // Results section
    resultsTitle: "Player Statistics",
    enterNickname: "Enter a nickname to see results.",

    // Player info
    country: "Country",
    elo: "ELO",
    level: "Level",
    matches: "Matches",
    winRate: "Win Rate",
    faceitProfile: "FACEIT Profile",

    // Stats
    avgStatsTitle: "Average Statistics",
    killsPerMatch: "Kills per match",
    deathsPerMatch: "Deaths per match",
    totalKills: "Total kills",
    totalDeaths: "Total deaths",

    // Maps
    bestMapTitle: "Best Map",
    worstMapTitle: "Worst Map",
    mapName: "Map",
    mapWinRate: "Win Rate",
    mapMatches: "Matches",
    adr: "ADR",
    clutches: "Clutches",

    // Messages
    gettingData: "Getting data for",
    gettingStats: "Getting CS:2 statistics for",
    playerNotFound: "Player not found.",
    noCs2Stats:
      "CS:2 statistics for {nickname} not found. Player hasn't played CS:2 or data is unavailable.",
    noCs2Matches:
      "{nickname} hasn't played CS:2 matches. Only CS:GO statistics available, which is not considered.",
    notEnoughData: "Not enough data",
    noMapData: "No map data available",

    // Validation
    enterNicknameValidation: "Please enter a nickname or profile URL.",
    fillAllFields: "Please fill in all fields",

    // Footer
    supportUs: "Support Us",
    contactUs: "Contact Us",
    footerText: "Advanced Stats for FACEIT Players",

    // Support modal
    supportTitle: "Support FACEIT Analyze",
    steamTradeOffer: "Steam Trade Offer",
    howToSupport: "How to support:",
    supportStep1: 'Click on "Steam Trade Offer" button',
    supportStep2: "Select items to trade",
    supportStep3: "Send trade offer",
    supportNote:
      "Any CS:2, CS:GO skins or other game items will be accepted with gratitude!",

    // Contact modal
    contactTitle: "Send Message",
    contactDescription:
      "Have questions, suggestions or need help? Write to us!",
    yourName: "Your name",
    enterName: "Enter your name",
    email: "Email",
    messageSubject: "Message subject",
    selectSubject: "Select subject",
    bugReport: "Report a bug",
    featureRequest: "Suggest improvement",
    support: "Technical support",
    partnership: "Partnership",
    other: "Other",
    message: "Message",
    messagePlaceholder: "Describe your question or suggestion...",
    sendMessage: "Send message",
    orWriteDirectly: "Or write directly:",

    // Success messages
    emailClientOpened:
      "Your email app should open now. If nothing happens, configure a default mail app for mailto: links in Windows (Default apps → Email) or use the address faceit.analyze@gmail.com.",
    messageSent: "Message sent successfully.",
    messageSendFailed: "Failed to send message.",
    sendingMessage: "Sending...",

    // Error messages
    faceitApiNotLoaded:
      "FaceitAPI not loaded. Check developer console for details.",
    error: "Error",

    win: "WIN",
    loss: "LOSS",
    noMatchHistory: "No match history available",
    matchDetailsUnavailable: "Match details unavailable",
    SteamProfile: "Steam Profile",
    excellentMap: "Excellent Map",
    averageMap: "Average Map",
    poorMap: "Poor Map",
    showMoreMatches: "Show More",
    // Дополнительные переводы для статистических блоков
    name: "Name",

    loadingMatchHistory: "Loading match history...",
    processingMatches: "Updating matches...",
    loadingMaps: "Loading maps...",

    //Mobile Sidebar
    statsforplayer: "Player Stats",
    mainMenu: "Main Menu",
    overview: "Overview",
    matches: "Matches",
    maps: "Maps",

    reactionTest: "Reaction Test",
    startTest: "Start Test",
    reactionInstructions1:
      "Press the 'Start Test' button and wait for the green screen.",
    reactionInstructions2:
      "As soon as the screen turns green - click immediately!",
    reactionInstructions3:
      "<strong>Attention:</strong> If you click too early - the test will restart.",
    reactionWait: "Wait for green color...",
    reactionClickNow: "CLICK NOW!",
    reactionYourResult: "Your result:",
    reactionTimeMs: "ms",
    reactionTooEarly: "Too early!",
    reactionTooEarlyText: "You clicked before the green screen appeared.",
    reactionTryAgain: "Try again",
    reactionRetryTest: "Retry test",
    reactionRatingExcellent: "Incredible!",
    reactionRatingGood: "Excellent!",
    reactionRatingNormal: "Good!",
    reactionRatingAverage: "Average",
    reactionRatingSlow: "Slow",
  },
};

// Single-language mode (English only)
let currentLanguage = "en";

// Экспортируем currentLanguage в глобальную область для доступа из других файлов
window.currentLanguage = currentLanguage;

// Функция для получения текста на текущем языке
function getText(key, placeholders = {}) {
  let text =
    translations[currentLanguage][key] || translations["en"][key] || key;

  // Заменяем плейсхолдеры в тексте
  Object.keys(placeholders).forEach((placeholder) => {
    text = text.replace(`{${placeholder}}`, placeholders[placeholder]);
  });

  return text;
}

function updateReactionTestTexts() {
  const modalTitle = document.querySelector("#reactionTestModal h2");
  if (modalTitle) {
    modalTitle.innerHTML = `<i class="fas fa-bolt"></i> ${getText(
      "reactionTest"
    )}`;
  }

  const instructions = document.getElementById("reactionInstructions");
  if (instructions) {
    const paragraphs = instructions.querySelectorAll("p");
    if (paragraphs.length >= 3) {
      paragraphs[0].textContent = getText("reactionInstructions1");
      paragraphs[1].textContent = getText("reactionInstructions2");
      paragraphs[2].innerHTML = getText("reactionInstructions3");
    }

    const startButton = document.getElementById("startReactionTest");
    if (startButton) {
      startButton.innerHTML = `<i class="fas fa-play"></i> ${getText(
        "startTest"
      )}`;
    }
  }

  const waitingScreen = document.querySelector(
    "#reactionWaiting .reaction-screen p"
  );
  if (waitingScreen) {
    waitingScreen.textContent = getText("reactionWait");
  }

  const readyScreen = document.querySelector(
    "#reactionReady .reaction-screen p"
  );
  if (readyScreen) {
    readyScreen.textContent = getText("reactionClickNow");
  }

  const resultsTitle = document.querySelector("#reactionResults h3");
  if (resultsTitle) {
    resultsTitle.textContent = getText("reactionYourResult");
  }

  const timeSuffix = document.querySelector(".reaction-time");
  if (timeSuffix) {
    const timeValue = document.getElementById("reactionTimeValue");
    if (timeValue) {
      timeSuffix.innerHTML = `<span id="reactionTimeValue">${
        timeValue.textContent
      }</span> ${getText("reactionTimeMs")}`;
    }
  }

  const retryButton = document.getElementById("retryReactionTest");
  if (retryButton) {
    retryButton.innerHTML = `<i class="fas fa-redo"></i> ${getText(
      "reactionRetryTest"
    )}`;
  }

  const tooEarlyTitle = document.querySelector("#reactionTooEarly h3");
  if (tooEarlyTitle) {
    tooEarlyTitle.textContent = getText("reactionTooEarly");
  }

  const tooEarlyText = document.querySelector("#reactionTooEarly p");
  if (tooEarlyText) {
    tooEarlyText.textContent = getText("reactionTooEarlyText");
  }

  const restartButton = document.getElementById("restartReactionTest");
  if (restartButton) {
    restartButton.innerHTML = `<i class="fas fa-redo"></i> ${getText(
      "reactionTryAgain"
    )}`;
  }
}

// Функция для переключения языка
function switchLanguage(lang) {
  // Disabled in single-language mode
  return;
}

// Функция для обновления активной кнопки языка
function updateLanguageButtons() {
  const langButtons = document.querySelectorAll(".lang-btn");
  langButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.lang === currentLanguage) {
      btn.classList.add("active");
    }
  });
}

// Функция для синхронизации обоих переключателей языка
function setupLanguageSwitchers() {
  // No-op in single-language mode
  return;
}

// Функция для обновления всех текстов на странице
function updatePageTexts() {
  // Заголовки секций
  const searchTitle = document.querySelector("#search h2");
  if (searchTitle) {
    searchTitle.innerHTML = `<i class="fas fa-search"></i> ${getText(
      "searchTitle"
    )}`;
  }

  const resultsTitle = document.querySelector("#results h2");
  if (resultsTitle) {
    resultsTitle.innerHTML = `<i class="fas fa-trophy"></i> ${getText(
      "resultsTitle"
    )}`;
  }

  // Элементы поиска
  const nicknameInput = document.getElementById("nickname");
  if (nicknameInput) {
    nicknameInput.placeholder = getText("searchPlaceholder");
  }

  const searchButton = document.getElementById("searchButton");
  if (searchButton) {
    searchButton.textContent = getText("analyzeButton");
  }

  // Обновляем тексты сайдбара
  updateSidebarTexts();

  // Сообщение по умолчанию
  const output = document.getElementById("output");
  if (output) {
    // Проверяем, содержит ли output дефолтное сообщение
    const outputText = output.textContent.trim();
    if (
      outputText.includes("Enter a nickname") ||
      outputText.includes("Введите никнейм") ||
      outputText === "Enter a nickname to see results." ||
      outputText === "Введите никнейм для просмотра результатов."
    ) {
      output.textContent = getText("enterNickname");
    }
  }

  // Footer
  const supportBtn = document.querySelector(".support-btn");
  if (supportBtn) {
    supportBtn.innerHTML = `<i class="fas fa-heart"></i> ${getText(
      "supportUs"
    )}`;
  }

  const contactBtn = document.querySelector(".contact-btn");
  if (contactBtn) {
    contactBtn.innerHTML = `<i class="fas fa-envelope"></i> ${getText(
      "contactUs"
    )}`;
  }

  const reactionBtn = document.getElementById("reactionTestBtn");
  if (reactionBtn) {
    reactionBtn.innerHTML = `<i class='fas fa-bolt'></i> ${getText(
      "reactionTest"
    )}`;
  }

  const footerText = document.querySelector("footer p");
  if (footerText) {
    footerText.textContent = `© 2025 FACEIT Analyze | ${getText("footerText")}`;
  }

  // Модальные окна
  updateModalTexts();
}

// Функция для обновления текстов в сайдбаре
function updateSidebarTexts() {
  const sidebarItems = document.querySelectorAll(
    ".sidebar-item span[data-translate]"
  );
  sidebarItems.forEach((span) => {
    const translateKey = span.dataset.translate;
    if (translateKey) {
      span.textContent = getText(translateKey);
    }
  });
}

// Новая функция для перевода мобильной шторки
function updateDrawerTexts() {
  const drawer = document.getElementById("mobileSidebarDrawer");
  // Проверяем, видима ли шторка. Используем getComputedStyle для точности.
  if (!drawer || window.getComputedStyle(drawer).display === "none") {
    return; // Ничего не делаем, если шторка скрыта
  }

  // Находим все переводимые элементы в шторке (заголовок и пункты меню)
  const translatableElements = drawer.querySelectorAll(
    ".drawer-title[data-translate], .drawer-item span[data-translate]"
  );
  translatableElements.forEach((element) => {
    const translateKey = element.dataset.translate;
    if (translateKey) {
      element.textContent = getText(translateKey);
    }
  });
}

// Функция для обновления текстов в модальных окнах
function updateModalTexts() {
  // Support Modal
  const supportModalTitle = document.querySelector("#supportModal h2");
  if (supportModalTitle) {
    supportModalTitle.innerHTML = `<i class="fas fa-heart"></i> ${getText(
      "supportTitle"
    )}`;
  }

  const steamLink = document.querySelector(".steam-support");
  if (steamLink) {
    steamLink.innerHTML = `<i class="fab fa-steam"></i> ${getText(
      "steamTradeOffer"
    )}`;
  }

  const supportInfo = document.querySelector(".steam-info");
  if (supportInfo) {
    supportInfo.innerHTML = `
      <p><strong>${getText("howToSupport")}</strong></p>
      <ol>
        <li>${getText("supportStep1")}</li>
        <li>${getText("supportStep2")}</li>
        <li>${getText("supportStep3")}</li>
      </ol>
      <p><small>${getText("supportNote")}</small></p>
    `;
  }

  // Contact Modal
  const contactModalTitle = document.querySelector("#contactModal h2");
  if (contactModalTitle) {
    contactModalTitle.innerHTML = `<i class="fas fa-envelope"></i> ${getText(
      "contactTitle"
    )}`;
  }

  // Исправляем селектор для contactDescription
  const contactDescription = document.querySelector(
    "#contactModal .modal-content > p"
  );
  if (contactDescription) {
    contactDescription.textContent = getText("contactDescription");
  }

  // Form labels and placeholders
  const nameLabel = document.querySelector('label[for="contactName"]');
  if (nameLabel) nameLabel.textContent = getText("yourName");

  const nameInput = document.getElementById("contactName");
  if (nameInput) nameInput.placeholder = getText("enterName");

  const emailLabel = document.querySelector('label[for="contactEmail"]');
  if (emailLabel) emailLabel.textContent = getText("email");

  const subjectLabel = document.querySelector('label[for="contactSubject"]');
  if (subjectLabel) subjectLabel.textContent = getText("messageSubject");

  const subjectSelect = document.getElementById("contactSubject");
  if (subjectSelect) {
    const options = subjectSelect.options;
    if (options[0]) options[0].textContent = getText("selectSubject");
    if (options[1]) options[1].textContent = getText("bugReport");
    if (options[2]) options[2].textContent = getText("featureRequest");
    if (options[3]) options[3].textContent = getText("support");
    if (options[4]) options[4].textContent = getText("partnership");
    if (options[5]) options[5].textContent = getText("other");
  }

  const messageLabel = document.querySelector('label[for="contactMessage"]');
  if (messageLabel) messageLabel.textContent = getText("message");

  const messageTextarea = document.getElementById("contactMessage");
  if (messageTextarea)
    messageTextarea.placeholder = getText("messagePlaceholder");

  const submitBtn = document.querySelector(".submit-btn");
  if (submitBtn) {
    submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> ${getText(
      "sendMessage"
    )}`;
  }
}

// Функция для обновления текстов в статистике игрока
function updatePlayerStatsTexts() {
  const playerCard = document.querySelector(".player-card");
  if (!playerCard) return;

  // Обновляем информацию в заголовке карточки игрока
  const playerInfo = playerCard.querySelector(".player-info");
  if (playerInfo) {
    const paragraphs = playerInfo.querySelectorAll("p");
    paragraphs.forEach((p) => {
      const text = p.textContent;
      // Обновляем каждую строку с информацией о игроке
      if (text.includes("Страна:") || text.includes("Country:")) {
        // Для названий стран делаем отдельную обработку без множественных async вызовов
        updateCountryInPlayerInfo(p, text);
      } else if (text.includes("ELO:")) {
        const eloValue = text.split(":")[1]?.trim();
        if (eloValue) {
          p.textContent = `${getText("elo")}: ${eloValue}`;
        }
      } else if (text.includes("Уровень:") || text.includes("Level:")) {
        const levelParts = text.split(":");
        if (levelParts.length > 1) {
          const levelValue = levelParts[1]?.trim();
          p.innerHTML = `${getText("level")}: ${levelValue}`;
        }
      } else if (text.includes("Матчей:") || text.includes("Matches:")) {
        const matchesValue = text.split(":")[1]?.trim();
        if (matchesValue) {
          p.textContent = `${getText("matches")}: ${matchesValue}`;
        }
      } else if (text.includes("Винрейт:") || text.includes("Win Rate:")) {
        const winRateValue = text.split(":")[1]?.trim();
        if (winRateValue) {
          p.textContent = `${getText("winRate")}: ${winRateValue}`;
        }
      }
    });

    // Обновляем ссылку на профиль FACEIT
    const profileLink = playerInfo.querySelector("a");
    if (profileLink) {
      profileLink.textContent = getText("faceitProfile");
      // Обновляем URL ссылки в соответствии с языком
      const nickname = playerCard.querySelector("h2")?.textContent;
      if (nickname) {
        profileLink.href = `https://www.faceit.com/${
          currentLanguage === "ru" ? "ru" : "en"
        }/players/${nickname}`;
      }
    }
  }

  // Обновляем заголовки статистических блоков
  const statsBoxes = playerCard.querySelectorAll(".stats-box");
  statsBoxes.forEach((box, index) => {
    const h3 = box.querySelector("h3");
    if (!h3) return;

    if (index === 0) {
      // Блок средней статистики
      h3.innerHTML = `<i class="fas fa-chart-line"></i> ${getText(
        "avgStatsTitle"
      )}`;

      // Обновляем текст параграфов внутри
      const paragraphs = box.querySelectorAll("p");
      paragraphs.forEach((p) => {
        const text = p.textContent;
        if (
          text.includes("Убийств за матч:") ||
          text.includes("Kills per match:")
        ) {
          const killsPerMatchValue = text.split(":")[1]?.trim();
          if (killsPerMatchValue) {
            p.textContent = `${getText(
              "killsPerMatch"
            )}: ${killsPerMatchValue}`;
          }
        } else if (
          text.includes("Смертей за матч:") ||
          text.includes("Deaths per match:")
        ) {
          const deathsPerMatchValue = text.split(":")[1]?.trim();
          if (deathsPerMatchValue) {
            p.textContent = `${getText(
              "deathsPerMatch"
            )}: ${deathsPerMatchValue}`;
          }
        } else if (
          text.includes("Всего убийств:") ||
          text.includes("Total kills:")
        ) {
          const totalKillsValue = text.split(":")[1]?.trim();
          if (totalKillsValue) {
            p.textContent = `${getText("totalKills")}: ${totalKillsValue}`;
          }
        } else if (
          text.includes("Всего смертей:") ||
          text.includes("Total deaths:")
        ) {
          const totalDeathsValue = text.split(":")[1]?.trim();
          if (totalDeathsValue) {
            p.textContent = `${getText("totalDeaths")}: ${totalDeathsValue}`;
          }
        }
      });
    } else if (index === 1) {
      // Блок лучших и худших карт
      h3.innerHTML = `<i class="fas fa-map"></i> ${getText("bestMapTitle")}`;

      // Обновляем текст параграфов внутри
      const paragraphs = box.querySelectorAll("p");
      paragraphs.forEach((p) => {
        const text = p.textContent;
        if (text.includes("Карта:") || text.includes("Map:")) {
          const mapNameValue = text.split(":")[1]?.trim();
          if (mapNameValue) {
            p.textContent = `${getText("mapName")}: ${mapNameValue}`;
          }
        } else if (text.includes("Винрейт:") || text.includes("Win Rate:")) {
          const winRateValue = text.split(":")[1]?.trim();
          if (winRateValue) {
            p.textContent = `${getText("mapWinRate")}: ${winRateValue}`;
          }
        } else if (text.includes("K/D:")) {
          const kdValue = text.split(":")[1]?.trim();
          if (kdValue) {
            p.textContent = `K/D: ${kdValue}`;
          }
        } else if (text.includes("Матчей:") || text.includes("Matches:")) {
          const matchesValue = text.split(":")[1]?.trim();
          if (matchesValue) {
            p.textContent = `${getText("mapMatches")}: ${matchesValue}`;
          }
        }
      });
    } else if (index === 2) {
      h3.innerHTML = `<i class="fas fa-map-marked-alt"></i> ${getText(
        "worstMapTitle"
      )}`;

      // Обновляем текст параграфов внутри
      const paragraphs = box.querySelectorAll("p");
      paragraphs.forEach((p) => {
        const text = p.textContent;
        if (text.includes("Карта:") || text.includes("Map:")) {
          const mapNameValue = text.split(":")[1]?.trim();
          if (mapNameValue) {
            p.textContent = `${getText("mapName")}: ${mapNameValue}`;
          }
        } else if (text.includes("Винрейт:") || text.includes("Win Rate:")) {
          const winRateValue = text.split(":")[1]?.trim();
          if (winRateValue) {
            p.textContent = `${getText("mapWinRate")}: ${winRateValue}`;
          }
        } else if (text.includes("K/D:")) {
          const kdValue = text.split(":")[1]?.trim();
          if (kdValue) {
            p.textContent = `K/D: ${kdValue}`;
          }
        } else if (text.includes("Матчей:") || text.includes("Matches:")) {
          const matchesValue = text.split(":")[1]?.trim();
          if (matchesValue) {
            p.textContent = `${getText("mapMatches")}: ${matchesValue}`;
          }
        }
      });
    }
  });
}

// Отдельная функция для обновления названий стран (избегаем множественные async вызовы)
async function updateCountryInPlayerInfo(paragraph, originalText) {
  try {
    // Получаем новое название страны через FaceitAPI
    if (
      window.currentPlayerData &&
      window.currentPlayerData.country &&
      window.FaceitAPI
    ) {
      const countryCode = window.currentPlayerData.country;
      // Получаем переведенное название страны
      const newCountryName = await window.FaceitAPI.getCountryName(countryCode);
      paragraph.textContent = `${getText("country")}: ${newCountryName}`;
    } else {
      // Fallback: просто обновляем подпись, оставляя старое название
      const countryValue = originalText.split(":")[1]?.trim();
      if (countryValue) {
        paragraph.textContent = `${getText("country")}: ${countryValue}`;
      }
    }
  } catch (error) {
    console.error("Ошибка при обновлении названия страны:", error);
    // Fallback: просто обновляем подпись, оставляя старое название
    const countryValue = originalText.split(":")[1]?.trim();
    if (countryValue) {
      paragraph.textContent = `${getText("country")}: ${countryValue}`;
    }
  }
}

// Функция для инициализации приложения
function init() {
  // Предотвращаем множественную инициализацию
  if (isInitialized) {
    console.log("Приложение уже инициализировано");
    return;
  }

  console.log("Инициализация приложения...");

  // Очищаем URL от хеша чтобы избежать проблем
  if (window.location.hash) {
    history.replaceState(null, null, window.pathname);
  }

  // English-only
  currentLanguage = "en";
  window.currentLanguage = currentLanguage;

  // Инициализируем playerStats
  playerStats = document.getElementById("playerStats");

  // Инициализируем менеджер сайдбара
  sidebarManager = new SidebarManager();
  window.sidebarManager = sidebarManager; // Делаем доступным глобально

  // Добавляем обработчики событий ТОЛЬКО ОДИН РАЗ
  initializeEventListeners();

  // Обработчик изменения размера окна для сайдбара
  window.addEventListener("resize", () => {
    if (sidebarManager) {
      sidebarManager.handleResize();
    }
  });

  // Обновляем интерфейс
  updateLanguageButtons();
  updatePageTexts();

  // Диагностическая проверка загрузки FaceitAPI
  checkFaceitAPI();

  // Помечаем как инициализированное
  isInitialized = true;
}

// Отдельная функция для инициализации обработчиков событий
function initializeEventListeners() {
  // Удаляем старые обработчики перед добавлением новых
  const langButtons = document.querySelectorAll(".lang-btn");
  langButtons.forEach((btn) => {
    // Удаляем onclick атрибуты из HTML
    btn.removeAttribute("onclick");
    // Клонируем элемент для удаления всех обработчиков
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });

  // Добавляем новые обработчики для кнопок языка
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const selectedLang = btn.dataset.lang;
      switchLanguage(selectedLang);
    });
  });

  // Обработчик клика по кнопке "Поддержать нас"
  const supportBtn = document.querySelector(".support-btn");
  if (supportBtn) {
    supportBtn.removeAttribute("onclick");
    const newSupportBtn = supportBtn.cloneNode(true);
    supportBtn.parentNode.replaceChild(newSupportBtn, supportBtn);

    document.querySelector(".support-btn").addEventListener("click", (e) => {
      e.preventDefault();
      openSupportModal();
    });
  }

  // Обработчик клика по кнопке "Связаться с нами"
  const contactBtn = document.querySelector(".contact-btn");
  if (contactBtn) {
    contactBtn.removeAttribute("onclick");
    const newContactBtn = contactBtn.cloneNode(true);
    contactBtn.parentNode.replaceChild(newContactBtn, contactBtn);

    document.querySelector(".contact-btn").addEventListener("click", (e) => {
      e.preventDefault();
      openContactModal();
    });
  }

  // Обработчик клика по кнопке "Тест на реакцию"
  const reactionBtn = document.getElementById("reactionTestBtn");
  if (reactionBtn) {
    reactionBtn.removeAttribute("onclick");
    const newReactionBtn = reactionBtn.cloneNode(true);
    reactionBtn.parentNode.replaceChild(newReactionBtn, reactionBtn);
    document
      .getElementById("reactionTestBtn")
      .addEventListener("click", (e) => {
        e.preventDefault();
        openReactionTestModal();
      });
  }

  // Обработчик Enter в поле поиска
  const nicknameInput = document.getElementById("nickname");
  if (nicknameInput) {
    nicknameInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        analyzePlayer();
      }
    });

    // Обработчик изменения в поле поиска - скрываем сайдбар если поле очищено
    nicknameInput.addEventListener("input", (event) => {
      if (!event.target.value.trim() && currentPlayerProfile) {
        clearPlayerProfile();
      }
    });
  }

  // Обработчик для кнопки анализа
  const searchButton = document.getElementById("searchButton");
  if (searchButton) {
    searchButton.removeAttribute("onclick");
    const newSearchBtn = searchButton.cloneNode(true);
    searchButton.parentNode.replaceChild(newSearchBtn, searchButton);

    document.getElementById("searchButton").addEventListener("click", (e) => {
      e.preventDefault();
      const nicknameValue = document.getElementById("nickname")?.value?.trim();
      trackEvent("analyze_click", { input: nicknameValue || null });
      analyzePlayer();
    });
  }

  // Обработчики для кнопок закрытия модальных окон
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeAllModals(); // Используем новую функцию для закрытия всех модальных окон
    });
  });

  // Обработчик отправки формы контактов
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      sendMessage(e);
    });
  }

  // Закрытие модальных окон при клике вне их области

  document.addEventListener("click", (event) => {
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
      if (event.target === modal) {
        closeAllModals();
      }
    });
  });

  // Закрытие модальных окон при нажатии Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllModals();
    }
  });
}

// Функция для очистки профиля игрока
function clearPlayerProfile() {
  currentPlayerProfile = null;
  window.currentPlayerData = null;

  if (sidebarManager) {
    sidebarManager.originalStatsHTML = null;
  }

  // Скрываем статистику
  const playerStats = document.getElementById("playerStats");
  if (playerStats) {
    playerStats.innerHTML = "";
    playerStats.style.display = "none";
  }

  //Возвращаем строку поиска
  const searchSection = document.getElementById("search");
  if (searchSection) {
    searchSection.style.display = "block";
  }

  const HeaderSection = document.getElementById("header");
  if (HeaderSection) {
    HeaderSection.style.display = "block";
  }

  const FooterSection = document.getElementById("footer");
  if (FooterSection) {
    FooterSection.style.display = "block";
  }

  // Показываем сообщение по умолчанию
  const output = document.getElementById("output");
  if (output) {
    output.textContent = getText("enterNickname");
    output.style.display = "block";
  }

  // Деактивируем сайдбар
  if (sidebarManager) {
    sidebarManager.hideForPlayerProfile();
  }

  console.log("Профиль игрока очищен");
}

// Detect if input looks like a Steam profile URL / SteamID64 / vanity and should be resolved via Faceit.
function isSteamInput(value) {
  if (!value) return false;
  const v = String(value).trim();
  if (!v) return false;
  if (/^\d{17}$/.test(v)) return true; // steamid64
  if (/steamcommunity\.com\/(id|profiles)\//i.test(v)) return true;
  // If it contains no spaces and is reasonably short, allow as vanity when it doesn't look like a Faceit URL
  if (/^[a-zA-Z0-9_-]{2,64}$/.test(v) && !/faceit\.com\//i.test(v)) return true;
  return false;
}

async function resolveFaceitPlayerFromSteam(steamInput) {
  const url = `/api/faceit-by-steam?steam=${encodeURIComponent(
    String(steamInput).trim()
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

// Основная функция анализа игрока
async function analyzePlayer() {
  const nicknameInput = document.getElementById("nickname");
  const nickname = nicknameInput?.value?.trim();

  if (!nickname) {
    alert(getText("enterNicknameValidation"));
    return;
  }

  const output = document.getElementById("output");
  const playerStatsContainer = document.getElementById("playerStats");

  // Инициализируем playerStats если не инициализирована
  if (!playerStats) {
    playerStats = playerStatsContainer;
  }

  if (output) {
    output.textContent = `${getText("gettingData")} ${nickname}...`;
  }

  try {
    // Загружаем конфигурацию если не загружена
    if (!window.Config.loaded) {
      await window.Config.loadConfig();
    }

    const apiKey = window.Config.getApiKey();

    let playerData;

    // If user pasted Steam link/SteamID/vanity, resolve Faceit player first.
    if (isSteamInput(nickname)) {
      trackEvent("analyze_input_steam", { input: nickname });
      const faceitPlayer = await resolveFaceitPlayerFromSteam(nickname);
      // `faceitPlayer` is the same shape as /players?nickname response
      playerData = faceitPlayer;
    } else {
      // Получаем данные игрока по никнейму/Faceit URL
      playerData = await window.FaceitAPI.getPlayerData(nickname, apiKey);
    }

    window.currentPlayerData = playerData; // Сохраняем для использования в переводах

    // Track resolved player (input -> player id)
    trackEvent("analyze_player_resolved", {
      searched: nickname,
      resolvedNickname: playerData?.nickname || null,
      resolvedPlayerId: playerData?.player_id || null,
    });

    if (output) {
      output.textContent = `${getText("gettingStats")} ${
        playerData.nickname
      }...`;
    }

    // Получаем статистику CS:2
    const gameId = "cs2";
    const statsData = await window.FaceitAPI.getStatsData(
      playerData.player_id,
      gameId,
      apiKey
    );

    // DEBUG: выводим statsData после получения статистики игрокца
    console.log("DEBUG statsData:", statsData);

    // Получаем актуальное ELO
    const currentElo = await window.FaceitAPI.getCurrentElo(
      playerData.player_id,
      gameId,
      playerData.games?.[gameId]?.faceit_elo || 0
    );

    // Получаем название страны
    const countryName = await window.FaceitAPI.getCountryName(
      playerData.country
    );

    // Обрабатываем статистику
    const lifetime = statsData.lifetime || {};
    const segments = statsData.segments || [];

    const avgStats = window.FaceitAPI.calculateAvgStats(
      lifetime,
      segments,
      gameId
    );
    const mapAnalysis = window.FaceitAPI.analyzeMaps(segments, gameId);

    // Сохраняем данные текущего профиля
    currentPlayerProfile = {
      playerData,
      statsData,
      currentElo,
      countryName,
      avgStats,
      mapAnalysis,
    };

    // Также сохраняем в window для доступа из других функций
    window.currentPlayerProfile = currentPlayerProfile;

    // Track overall success
    trackEvent("analyze_success", {
      playerNickname: playerData?.nickname || null,
      playerId: playerData?.player_id || null,
      gameId: "cs2",
    });

    // СКРЫВАЕМ полоску с информацией о загрузке СРАЗУ после получения данных
    if (output) {
      output.style.display = "none";
    }

    // Создаем HTML для карточки игрока
    const playerCardHTML = `
    <div class="player-card fade-in-animation">
      <div class="player-header">
        <div class="player-avatar">
          <img src="${playerData.avatar || ".png"}" alt="${
      playerData.nickname
    }" onerror="this.src='logooo.png'">
        </div>
        <div class="player-info">
          <h2>${playerData.nickname}</h2>
          <p>${getText("country")}: ${countryName}</p>
          <p>ELO: ${window.FaceitAPI.formatNumber(currentElo)}</p>
          ${(() => {
            const faceitLevel = playerData.games?.[gameId]?.skill_level;
            if (faceitLevel) {
              return `<p>${getText(
                "level"
              )}: <span style="color: #FF4500; font-family: 'Roboto', sans-serif;">${"⭐".repeat(
                faceitLevel
              )}</span></p>`;
            }
            return `<p>${getText("level")}: N/A</p>`;
          })()}
          <p>${getText("matches")}: ${window.FaceitAPI.formatNumber(
      avgStats.totalMatches
    )}</p>
          <p>${getText("winRate")}: ${lifetime["Win Rate %"] || "0"}%</p>
          <img 
            src="faceit.png" 
            alt="${getText("faceitProfile")}"
            title="${getText("faceitProfile")}"
            onclick="window.open('https://www.faceit.com/${
              currentLanguage === "ru" ? "ru" : "en"
            }/players/${playerData.nickname}', '_blank')"
            style="cursor: pointer; width: 45px; height: 45px; border-radius: 8px; border: 2px solid var(--primary-color); transition: transform 0.3s, box-shadow 0.3s; margin-right: 10px; object-fit: contain;"
            onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 0 10px var(--primary-color)';"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"
          />
        </div>
      </div>
        
        <div class="stats-container">
          <div class="stats-box slide-in-animation">
            <h3><i class="fas fa-chart-line"></i> ${getText(
              "avgStatsTitle"
            )}</h3>
            <p>${getText("killsPerMatch")}: ${avgStats.avgKills}</p>
            <p>${getText("deathsPerMatch")}: ${avgStats.avgDeaths}</p>
            <p>K/D: ${avgStats.kd}</p>
            <p>${getText("totalKills")}: ${window.FaceitAPI.formatNumber(
      avgStats.totalKills
    )}</p>
            <p>${getText("totalDeaths")}: ${window.FaceitAPI.formatNumber(
      avgStats.totalDeaths
    )}</p>
          </div>
          
          <div class="stats-box slide-in-animation">
            <h3><i class="fas fa-map"></i> ${getText("bestMapTitle")}</h3>
            ${
              mapAnalysis.bestMap
                ? `
              <p>${getText("mapName")}: ${mapAnalysis.bestMap.name}</p>
              <p>${getText(
                "mapWinRate"
              )}: ${mapAnalysis.bestMap.winRate.toFixed(1)}%</p>
              <p>K/D: ${mapAnalysis.bestMap.kd.toFixed(2)}</p>
              <p>${getText("mapMatches")}: ${mapAnalysis.bestMap.matches}</p>
            `
                : `<p>${getText("notEnoughData")}</p>`
            }
          </div>
          
          <div class="stats-box slide-in-animation">
            <h3><i class="fas fa-map-marked-alt"></i> ${getText(
              "worstMapTitle"
            )}</h3>
            ${
              mapAnalysis.worstMap
                ? `
              <p>${getText("mapName")}: ${mapAnalysis.worstMap.name}</p>
              <p>${getText(
                "mapWinRate"
              )}: ${mapAnalysis.worstMap.winRate.toFixed(1)}%</p>
              <p>K/D: ${mapAnalysis.worstMap.kd.toFixed(2)}</p>
              <p>${getText("mapMatches")}: ${mapAnalysis.worstMap.matches}</p>
            `
                : `<p>${getText("notEnoughData")}</p>`
            }
          </div>
        </div>
      </div>
    </div>
  `;

    playerStatsContainer.innerHTML = playerCardHTML;
    playerStatsContainer.style.display = "block";

    // Добавляем класс для скрытия поиска при активном профиле
    document.body.classList.add("profile-active");
    // Активируем сайдбар после успешной загрузки профиля
    if (sidebarManager) {
      // Задержка для плавного появления
      setTimeout(() => {
        sidebarManager.showForPlayerProfile();

        // Сохраняем исходное состояние statsContainer
        const statsContainer = document.querySelector(".stats-container");
        if (statsContainer) {
          sidebarManager.originalStatsHTML = statsContainer.innerHTML;
        }

        // Явно устанавливаем Overview как активный вид
        sidebarManager.switchView("overview");
      }, 300);
    }
  } catch (error) {
    console.error("Ошибка при получении данных игрока:", error);

    trackEvent("analyze_error", {
      searched: nickname,
      message: String(error?.message || error),
    });

    if (output) {
      output.textContent = `${getText("error")}: ${error.message}`;
    }

    // Показываем сообщение об ошибке
    alert(`${getText("error")}: ${error.message}`);
  }
}

// Новая функция для рендеринга статистики на вкладке "Обзор"
function renderOverviewStats(container) {
  if (!container || !window.currentPlayerProfile) return;

  const { avgStats, mapAnalysis } = window.currentPlayerProfile;

  const overviewHTML = `
    <div class="stats-box slide-in-animation">
      <h3><i class="fas fa-chart-line"></i> ${getText("avgStatsTitle")}</h3>
      <p>${getText("killsPerMatch")}: ${avgStats.avgKills}</p>
      <p>${getText("deathsPerMatch")}: ${avgStats.avgDeaths}</p>
      <p>K/D: ${avgStats.kd}</p>
      <p>${getText("totalKills")}: ${window.FaceitAPI.formatNumber(
    avgStats.totalKills
  )}</p>
      <p>${getText("totalDeaths")}: ${window.FaceitAPI.formatNumber(
    avgStats.totalDeaths
  )}</p>
    </div>
    
    <div class="stats-box slide-in-animation">
      <h3><i class="fas fa-map"></i> ${getText("bestMapTitle")}</h3>
      ${
        mapAnalysis.bestMap
          ? `
        <p>${getText("mapName")}: ${mapAnalysis.bestMap.name}</p>
        <p>${getText("mapWinRate")}: ${mapAnalysis.bestMap.winRate.toFixed(
              1
            )}%</p>
        <p>K/D: ${mapAnalysis.bestMap.kd.toFixed(2)}</p>
        <p>${getText("mapMatches")}: ${mapAnalysis.bestMap.matches}</p>
      `
          : `<p>${getText("notEnoughData")}</p>`
      }
    </div>
    
    <div class="stats-box slide-in-animation">
      <h3><i class="fas fa-map-marked-alt"></i> ${getText("worstMapTitle")}</h3>
      ${
        mapAnalysis.worstMap
          ? `
        <p>${getText("mapName")}: ${mapAnalysis.worstMap.name}</p>
        <p>${getText("mapWinRate")}: ${mapAnalysis.worstMap.winRate.toFixed(
              1
            )}%</p>
        <p>K/D: ${mapAnalysis.worstMap.kd.toFixed(2)}</p>
        <p>${getText("mapMatches")}: ${mapAnalysis.worstMap.matches}</p>
      `
          : `<p>${getText("notEnoughData")}</p>`
      }
    </div>
  `;

  container.innerHTML = overviewHTML;
}

// Функции для модальных окон
function openSupportModal() {
  // Закрываем все другие модальные окна
  closeAllModals();

  const modal = document.getElementById("supportModal");
  if (modal) {
    modal.style.display = "block";
    modal.classList.add("show");
    document.body.style.overflow = "hidden"; // Блокируем скролл
  }
}

function openContactModal() {
  // Закрываем все другие модальные окна
  closeAllModals();

  const modal = document.getElementById("contactModal");
  if (modal) {
    modal.style.display = "block";
    modal.classList.add("show");
    document.body.style.overflow = "hidden"; // Блокируем скролл
  }
}

let reactionTest = {
  timeout: null,
  startTime: 0,
  isActive: false,
  delay: 0,
  scheduledTime: 0,
};

// Функция для открытия модального окна теста реакции
function openReactionTestModal() {
  closeAllModals();

  const modal = document.getElementById("reactionTestModal");
  if (!modal) return;

  // Сначала скрываем модальное окно
  modal.style.display = "none";

  // Даем браузеру время применить стили
  setTimeout(() => {
    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    // Инициализируем тест
    initReactionTest();
    updateReactionTestTexts();
  }, 10);
}

// Инициализация теста реакции
function initReactionTest() {
  // Сбрасываем состояние
  resetReactionTest();

  // Обновляем обработчики событий
  document.getElementById("startReactionTest").onclick = startReactionTest;
  document.getElementById("retryReactionTest").onclick = startReactionTest;
  document.getElementById("restartReactionTest").onclick = resetReactionTest;

  // Обработчик для экрана ожидания (ранний клик)
  const waitingScreen = document.getElementById("reactionWaiting");
  if (waitingScreen) {
    waitingScreen.onclick = () => {
      if (reactionTest.isActive && waitingScreen.style.display === "block") {
        handleEarlyClick();
      }
    };
  }

  // Обработчик для зеленого экрана
  const readyScreen = document.getElementById("reactionReady");
  if (readyScreen) {
    readyScreen.onclick = () => {
      if (reactionTest.isActive && readyScreen.style.display === "block") {
        handleReactionClick();
      }
    };
  }
}

// Запуск теста реакции
function startReactionTest() {
  // Скрываем инструкции и результаты
  document.getElementById("reactionInstructions").style.display = "none";
  document.getElementById("reactionResults").style.display = "none";
  document.getElementById("reactionTooEarly").style.display = "none";
  document.getElementById("reactionReady").style.display = "none";

  // Показываем экран ожидания
  document.getElementById("reactionWaiting").style.display = "block";

  // Устанавливаем флаг активности
  reactionTest.isActive = true;

  // Генерируем случайную задержку от 2 до 5 секунд
  reactionTest.delay = Math.floor(Math.random() * 3000) + 2000;

  // Записываем время планирования
  reactionTest.scheduledTime = performance.now();

  // Запускаем таймер
  reactionTest.timeout = setTimeout(() => {
    if (!reactionTest.isActive) return;

    // Используем requestAnimationFrame для точной синхронизации с отрисовкой
    requestAnimationFrame(() => {
      // Скрываем экран ожидания
      document.getElementById("reactionWaiting").style.display = "none";

      // Показываем зеленый экран
      document.getElementById("reactionReady").style.display = "block";

      // Записываем точное время показа зеленого экрана
      reactionTest.startTime = performance.now();

      console.log(
        "Задержка планирования:",
        reactionTest.startTime - reactionTest.scheduledTime,
        "мс"
      );
    });
  }, reactionTest.delay);
}

// Обработка клика по зеленому экрану
function handleReactionClick() {
  if (!reactionTest.isActive || reactionTest.startTime === 0) return;

  const reactionTime = Math.round(performance.now() - reactionTest.startTime);
  reactionTest.isActive = false;
  clearTimeout(reactionTest.timeout);

  document.getElementById("reactionReady").style.display = "none";
  document.getElementById("reactionResults").style.display = "block";
  document.getElementById("reactionTimeValue").textContent = reactionTime;

  // Используем переведенные фразы для рейтинга
  const ratingElement = document.getElementById("reactionRating");
  if (reactionTime < 150) {
    ratingElement.textContent = getText("reactionRatingExcellent");
  } else if (reactionTime < 200) {
    ratingElement.textContent = getText("reactionRatingGood");
  } else if (reactionTime < 250) {
    ratingElement.textContent = getText("reactionRatingNormal");
  } else if (reactionTime < 350) {
    ratingElement.textContent = getText("reactionRatingAverage");
  } else {
    ratingElement.textContent = getText("reactionRatingSlow");
  }

  console.log("Измеренное время реакции:", reactionTime, "мс");
}

// Обработка раннего клика
function handleEarlyClick() {
  // Сбрасываем флаг активности
  reactionTest.isActive = false;

  // Очищаем таймер
  clearTimeout(reactionTest.timeout);

  // Скрываем экран ожидания
  document.getElementById("reactionWaiting").style.display = "none";

  // Показываем сообщение о раннем клике
  document.getElementById("reactionTooEarly").style.display = "block";
}

// Сброс теста
function resetReactionTest() {
  // Очищаем таймер
  clearTimeout(reactionTest.timeout);

  // Сбрасываем состояние
  reactionTest.isActive = false;
  reactionTest.startTime = 0;
  reactionTest.delay = 0;
  reactionTest.scheduledTime = 0;

  // Скрываем все экраны
  document.getElementById("reactionWaiting").style.display = "none";
  document.getElementById("reactionReady").style.display = "none";
  document.getElementById("reactionResults").style.display = "none";
  document.getElementById("reactionTooEarly").style.display = "none";

  // Показываем инструкции
  document.getElementById("reactionInstructions").style.display = "block";
}

// Функция отправки сообщения
function sendMessage(event) {
  event.preventDefault();

  const name = document.getElementById("contactName").value.trim();
  const email = document.getElementById("contactEmail").value.trim();
  const subjectSelect = document.getElementById("contactSubject");
  const subjectValue = subjectSelect ? subjectSelect.value : "";
  const subjectText = subjectSelect
    ? subjectSelect.options[subjectSelect.selectedIndex]?.textContent || ""
    : "";
  const message = document.getElementById("contactMessage").value.trim();

  // Валидация
  if (!name || !email || !subjectValue || !message) {
    alert(getText("fillAllFields"));
    return;
  }

  // Делаем тему человекочитаемой
  const finalSubject = subjectText || subjectValue;

  // Создаем тело письма (URL-encoded)
  const emailBody = encodeURIComponent(
    `${getText("yourName")}: ${name}\n${getText(
      "email"
    )}: ${email}\n\n${getText("message")}:\n${message}`
  );

  const mailtoLink = `mailto:contact@faceit-analyze.com?subject=${encodeURIComponent(
    finalSubject
  )}&body=${emailBody}`;

  // На Windows/Chrome window.location/mailto иногда ведет к системному выбору приложений.
  // Более совместимый способ — инициировать клик по <a href="mailto:...">.
  try {
    const a = document.createElement("a");
    a.href = mailtoLink;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();

    alert(
      "Your email app should open now. If nothing happens, configure a default mail app for mailto: links in Windows (Default apps → Email) or use the address contact@faceit-analyze.com."
    );

    // Не закрываем окно моментально — пусть пользователь увидит подсказку/сможет повторить
    // closeAllModals();
    // document.getElementById("contactForm").reset();
  } catch (e) {
    console.error("Failed to open mail client:", e);
    alert(
      "Could not open your email app. Please email us at contact@faceit-analyze.com."
    );
  }
}

// Диагностическая функция для проверки FaceitAPI
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
    (method) => typeof window.FaceitAPI[method] !== "function"
  );

  if (missingMethods.length > 0) {
    console.error("Отсутствуют методы FaceitAPI:", missingMethods);
    return false;
  }

  console.log("FaceitAPI успешно загружен и готов к работе");
  return true;
}

// Функция для обновления переводов в карточках карт
function updateMapsTexts() {
  // Обновляем карточки карт если они отображены
  const mapCards = document.querySelectorAll(".map-card");
  if (mapCards.length > 0) {
    mapCards.forEach((card) => {
      // Обновляем статистические метки
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

      // Обновляем индикаторы производительности
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

  // Обновляем заголовки таблиц карт если есть
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

// Функция для обновления переводов в истории матчей
function updateMatchHistoryTexts() {
  // Обновляем результаты матчей
  const matchResults = document.querySelectorAll(".match-result");
  matchResults.forEach((result) => {
    const text = result.textContent.toLowerCase();
    if (text === "win" || text === "победа") {
      result.textContent = getText("win");
    } else if (text === "loss" || text === "поражение") {
      result.textContent = getText("loss");
    }
  });

  // Обновляем кнопку "Показать еще"
  const showMoreBtn = document.querySelector(".show-more-btn");
  if (showMoreBtn) {
    const btnText = showMoreBtn.textContent;
    const matches = btnText.match(/\((\d+)\)/);
    const remainingCount = matches ? matches[1] : "";

    const icon = showMoreBtn.querySelector("i");
    const iconHTML = icon
      ? icon.outerHTML
      : '<i class="fas fa-chevron-down"></i>';

    showMoreBtn.innerHTML = `${iconHTML} ${getText("showMoreMatches")}${
      remainingCount ? ` (${remainingCount})` : ""
    }`;
  }

  // Обновляем сообщения об ошибках
  const errorMessages = document.querySelectorAll(".api-error-text");
  errorMessages.forEach((error) => {
    const text = error.textContent;
    if (
      text.includes("No match history") ||
      text.includes("Нет истории матчей")
    ) {
      error.textContent = getText("noMatchHistory");
    } else if (
      text.includes("Match details unavailable") ||
      text.includes("Детали матча недоступны")
    ) {
      error.textContent = getText("matchDetailsUnavailable");
    }
  });
}

// Функция для закрытия всех модальных окон
function closeAllModals() {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    modal.style.display = "none";
    modal.classList.remove("show");
  });
  document.body.style.overflow = ""; // Восстанавливаем скролл
}

// Инициализация после загрузки DOM
document.addEventListener("DOMContentLoaded", function () {
  // Start the app (bind event listeners, init sidebar, set language, etc.)
  try {
    init();
  } catch (e) {
    console.error("Init failed:", e);
  }

  // Синхронизация переключателей языка
  setupLanguageSwitchers();

  updateCookieFabVisibility();

  // Show cookie modal only the first time (when no prior choice exists).
  if (!getCookieConsent()) {
    setTimeout(() => {
      openCookieModal();
    }, 600);
  }
});
