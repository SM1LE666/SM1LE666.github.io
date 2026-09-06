const appState = window.AppState || {
  playerStats: null,
  isInitialized: false,
  currentPlayerProfile: null,
  sidebarManager: null,
  lastHandledPath: null,
  currentLanguage: 'en',
  REQUEST_DELAY: 30,
};

let playerStats = appState.playerStats ?? null;
let isInitialized = appState.isInitialized ?? false; // Флаг для предотвращения множественной инициализации
let currentPlayerProfile = appState.currentPlayerProfile ?? null; // Текущий профиль игрока
let sidebarManager = appState.sidebarManager ?? null; // Менеджер сайдбара
const REQUEST_DELAY = appState.REQUEST_DELAY ?? 30; // Задержка в мс между запросами

function syncStateFromApp() {
  appState.playerStats = playerStats;
  appState.isInitialized = isInitialized;
  appState.currentPlayerProfile = currentPlayerProfile;
  appState.sidebarManager = sidebarManager;
  appState.lastHandledPath = lastHandledPath;
  appState.currentLanguage =
    typeof currentLanguage !== 'undefined'
      ? currentLanguage
      : appState.currentLanguage ?? 'en';
}

/**
 * Обновляет URL в адресной строке для отображаемого игрока.
 * @param {string | null} nickname - Никнейм игрока или null для сброса на главную.
 */
function updateUrlForPlayer(nickname) {
  const path = window.AppRouter
    ? window.AppRouter.buildPlayerUrl(nickname)
    : nickname
      ? `/player/${encodeURIComponent(nickname)}`
      : '/';
  const title = nickname ? `FACEIT Analyze - ${nickname}` : 'FACEIT Analyze';
  if (window.location.pathname !== path) {
    history.pushState({ nickname: nickname }, title, path);
    lastHandledPath = path;
    syncStateFromApp();
  }
  document.title = title;
}

let lastHandledPath = appState.lastHandledPath ?? null; // Защита от двойного вызова handleUrlChange

/**
 * Обрабатывает изменения URL (при загрузке или навигации) и загружает соответствующий контент.
 */
async function handleUrlChange() {
  const path = window.location.pathname;

  if (lastHandledPath === path) {
    console.log('Path уже обработан, игнорируем:', path);
    return;
  }

  lastHandledPath = path;
  syncStateFromApp();
  console.log('Обработка нового пути:', path);

  const route = window.AppRouter ? window.AppRouter.resolvePath(path) : null;
  const nickname = route?.type === 'player' ? route.nickname : null;

  if (nickname) {
    console.log('Загрузка профиля для:', nickname);

    const nicknameInput = document.getElementById('nickname');
    if (nicknameInput) {
      nicknameInput.value = nickname;
      console.log('Установлено значение в input:', nickname);
    } else {
      console.warn("Input поле 'nickname' не найдено в DOM");
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      await searchPlayer(nickname, false);
      console.log('Профиль успешно загружен:', nickname);
    } catch (error) {
      console.error('Ошибка при загрузке профиля:', error);
      alert(`Ошибка: ${error.message}`);
    }
  } else {
    console.log('Переход на главную страницу');
    const nicknameInput = document.getElementById('nickname');
    if (nicknameInput && nicknameInput.value) {
      nicknameInput.value = '';
    }
    goBackToMain(false);
  }
}

let SidebarManager = window.SidebarManager || null;

// LegacySidebarManager moved to app/features/legacy-sidebar-manager.js
// --- Anonymous analytics tracking (Vercel) ---
function getAnonymousId() {
  return window.AppAnalytics.getAnonymousId();
}

function getSessionId() {
  return window.AppAnalytics.getSessionId();
}

function getLastAnalyzedPlayer() {
  return window.AppAnalytics.getLastAnalyzedPlayer();
}

function getCookieConsent() {
  return window.AppAnalytics.getCookieConsent();
}

function setCookieConsent(value) {
  window.AppAnalytics.setCookieConsent(value);
}

function isAnalyticsAllowed() {
  return window.AppAnalytics.isAnalyticsAllowed();
}

function openCookieModal() {
  window.AppAnalytics.openCookieModal();
}

function closeCookieModal() {
  window.AppAnalytics.closeCookieModal();
}

function updateCookieFabVisibility() {
  window.AppAnalytics.updateCookieFabVisibility();
}

function trackEvent(eventName, props = {}) {
  window.AppAnalytics.trackEvent(eventName, props);
}

// Функция для получения текущего языка
function getCurrentLanguage() {
  return window.currentLanguage || currentLanguage || "en";
}

// Объект с переводами (вынесен в app/features/i18n-catalog.js)
const translations = window.AppI18nCatalog || { en: {} };

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
      "reactionTest",
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
        "startTest",
      )}`;
    }
  }

  const waitingScreen = document.querySelector(
    "#reactionWaiting .reaction-screen p",
  );
  if (waitingScreen) {
    waitingScreen.textContent = getText("reactionWait");
  }

  const readyScreen = document.querySelector(
    "#reactionReady .reaction-screen p",
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
      "reactionRetryTest",
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
      "reactionTryAgain",
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
      "searchTitle",
    )}`;
  }

  const resultsTitle = document.querySelector("#results h2");
  if (resultsTitle) {
    resultsTitle.innerHTML = `<i class="fas fa-trophy"></i> ${getText(
      "resultsTitle",
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
      "supportUs",
    )}`;
  }

  const contactBtn = document.querySelector(".contact-btn");
  if (contactBtn) {
    contactBtn.innerHTML = `<i class="fas fa-envelope"></i> ${getText(
      "contactUs",
    )}`;
  }

  const reactionBtn = document.getElementById("reactionTestBtn");
  if (reactionBtn) {
    reactionBtn.innerHTML = `<i class='fas fa-bolt'></i> ${getText(
      "reactionTest",
    )}`;
  }

  // Модальные окна
  updateModalTexts();
}

// Функция для обновления текстов в сайдбаре
function updateSidebarTexts() {
  const sidebarItems = document.querySelectorAll(
    ".sidebar-item span[data-translate]",
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
    ".drawer-title[data-translate], .drawer-item span[data-translate]",
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
      "supportTitle",
    )}`;
  }

  const steamLink = document.querySelector(".steam-support");
  if (steamLink) {
    steamLink.innerHTML = `<i class="fab fa-steam"></i> ${getText(
      "steamTradeOffer",
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
      "contactTitle",
    )}`;
  }

  // Исправляем селектор для contactDescription
  const contactDescription = document.querySelector(
    "#contactModal .modal-content > p",
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
      "sendMessage",
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
        "avgStatsTitle",
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
              "killsPerMatch",
            )}: ${killsPerMatchValue}`;
          }
        } else if (
          text.includes("Смертей за матч:") ||
          text.includes("Deaths per match:")
        ) {
          const deathsPerMatchValue = text.split(":")[1]?.trim();
          if (deathsPerMatchValue) {
            p.textContent = `${getText(
              "deathsPerMatch",
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
        "worstMapTitle",
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
async function init() {
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
  appState.playerStats = playerStats;

  // Инициализируем менеджер сайдбара
  sidebarManager = new SidebarManager();
  appState.sidebarManager = sidebarManager;
  window.sidebarManager = sidebarManager; // Делаем доступным глобально

  // Добавляем обработчики событий ТОЛЬКО ОДИН РАЗ
  initializeEventListeners();

  // Обработчик изменения размера окна для сайдбара
  window.addEventListener("resize", () => {
    if (sidebarManager) {
      sidebarManager.handleResize();
    }
  });

  // === ИСПРАВЛЕНИЕ SPA-МАРШРУТИЗАЦИИ ===
  // Обработчик для кнопок "Назад" и "Вперед" в браузере
  window.addEventListener("popstate", handleUrlChange);

  // Обновляем интерфейс ПЕРЕД обработкой маршрута
  updateLanguageButtons();
  updatePageTexts();

  // ВАЖНО: загружаем конфигурацию ДО обработки маршрутов
  console.log("Загрузка конфигурации...");
  try {
    await window.Config.loadConfig();
    console.log("Конфигурация успешно загружена");
  } catch (error) {
    console.error("Ошибка при загрузке конфигурации:", error);
  }

  // Диагностическая проверка загрузки FaceitAPI
  checkFaceitAPI();

  // Помечаем как инициализированное ДО маршрутизации
  isInitialized = true;
  appState.isInitialized = isInitialized;
  appState.playerStats = playerStats;
  appState.currentPlayerProfile = currentPlayerProfile;
  appState.sidebarManager = sidebarManager;

  // Обработчик маршрутизации при загрузке страницы (с await для ожидания загрузки профиля)
  console.log("Обработка маршрутизации...");
  await handleUrlChange();
  console.log("Инициализация завершена");
}

// Отдельная функция для инициализации обработчиков событий
function initializeEventListeners() {
  window.AppUIEvents.initializeEventListeners();
}

// Функция для инициализации карточек про-игроков
function initializeProPlayerCards() {
  window.AppUIEvents.initializeProPlayerCards();
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

  // Скрываем секцию results
  const resultsSection = document.getElementById("results");
  if (resultsSection) {
    resultsSection.style.display = "none";
  }

  // Показываем pro-grid
  const proGrid = document.querySelector(".pro-grid");
  if (proGrid) {
    proGrid.style.display = "flex";
  }

  // Сбрасываем URL на главную страницу
  updateUrlForPlayer(null);

  //Возвращаем строку поиска
  const searchSection = document.getElementById("search");
  if (searchSection) {
    searchSection.style.display = "block";
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

// Detect if input looks like a Steam profile URL / SteamID64 and should be resolved via Faceit.
function isSteamInput(value) {
  return window.AppPlayerResolve.isSteamInput(value);
}

async function resolveFaceitPlayerFromSteam(steamInput) {
  return window.AppPlayerResolve.resolveFaceitPlayerFromSteam(steamInput);
}

// Основная функция анализа игрока
async function analyzePlayer() {
  const nicknameInput = document.getElementById("nickname");
  const nickname = nicknameInput?.value?.trim();

  if (!nickname) {
    console.error("Никнейм не указан в поле ввода");
    alert(getText("enterNicknameValidation"));
    return;
  }

  console.log("analyzePlayer: начало анализа для", nickname);

  const output = document.getElementById("output");
  const playerStatsContainer = document.getElementById("playerStats");

  const faceitService = window.FaceitService || window.FaceitAPI;

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
      console.log("analyzePlayer: загрузка конфигурации...");
      await window.Config.loadConfig();
    }

    // Убеждаемся что FaceitAPI готов
    if (!window.FaceitAPI) {
      throw new Error("FaceitAPI не загружена");
    }

    console.log("analyzePlayer: все зависимости готовы");

    const apiKey = window.Config.getApiKey();

    let playerData;

    // If user pasted Steam link/SteamID/vanity, resolve Faceit player first.
    if (isSteamInput(nickname)) {
      console.log("analyzePlayer: Steam вход обнаружен");
      trackEvent("analyze_input_steam", { input: nickname });
      const faceitPlayer = await resolveFaceitPlayerFromSteam(nickname);
      // `faceitPlayer` is the same shape as /players?nickname response
      playerData = faceitPlayer;
    } else {
      // Получаем данные игрока по никнейму/Faceit URL
      console.log("analyzePlayer: загрузка данных игрока");
      playerData = await faceitService.getPlayerData(nickname, apiKey);
    }

    console.log("analyzePlayer: данные получены", playerData);
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
    const statsData = await faceitService.getStatsData(
      playerData.player_id,
      gameId,
      apiKey,
    );

    // DEBUG: выводим statsData после получения статистики игрокца
    console.log("DEBUG statsData:", statsData);

    // Получаем актуальное ELO
    const currentElo = await faceitService.getCurrentElo(
      playerData.player_id,
      gameId,
      playerData.games?.[gameId]?.faceit_elo || 0,
    );

    // Получаем название страны
    const countryName = await faceitService.getCountryName(
      playerData.country,
    );

    // Обрабатываем статистику
    const lifetime = statsData.lifetime || {};
    const segments = statsData.segments || [];

    const avgStats = faceitService.calculateAvgStats(
      lifetime,
      segments,
      gameId,
    );
    const mapAnalysis = faceitService.analyzeMaps(segments, gameId);

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
          }" onerror="this.src='/logooo.png'">
        </div>
        <div class="player-info">
          <h2>${playerData.nickname}</h2>
          <p>${getText("country")}: ${countryName}</p>
          <p>ELO: ${window.FaceitAPI.formatNumber(currentElo)}</p>
          ${(() => {
            const faceitLevel = playerData.games?.[gameId]?.skill_level;
            if (faceitLevel) {
              return `<p>${getText(
                "level",
              )}: <span style="color: #FF4500; font-family: 'Roboto', sans-serif;">${"⭐".repeat(
                faceitLevel,
              )}</span></p>`;
            }
            return `<p>${getText("level")}: N/A</p>`;
          })()}
          <p>${getText("matches")}: ${window.FaceitAPI.formatNumber(
            avgStats.totalMatches,
          )}</p>
          <p>${getText("winRate")}: ${lifetime["Win Rate %"] || "0"}%</p>
          <img 
            src="/faceit.png" 
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
              "avgStatsTitle",
            )}</h3>
            <p class="stat-row">${formatStatRow(
              `${getText("Matches")}: ${window.FaceitAPI.formatNumber(
                avgStats.totalMatches,
              )}`,
            )}</p>
            <p class="stat-row">${formatStatRow(
              `${getText("killsPerMatch")}: ${avgStats.avgKills}`,
            )}</p>
            <p class="stat-row">${formatStatRow(
              `${getText("deathsPerMatch")}: ${avgStats.avgDeaths}`,
            )}</p>
            <p class="stat-row">${formatStatRow(`K/D: ${avgStats.kd}`)}</p>
            <p class="stat-row">${formatStatRow(
              `${getText("Headshots")}: ${avgStats.avgHs}%`,
            )}</p>
          </div>
          
          <div class="stats-box slide-in-animation">
            <h3><i class="fas fa-map"></i> ${getText("bestMapTitle")}</h3>
            ${
              mapAnalysis.bestMap
                ? `
              <p class="stat-row">${formatStatRow(
                `${getText("mapName")}: ${mapAnalysis.bestMap.name}`,
              )}</p>
              <p class="stat-row">${formatStatRow(
                `${getText(
                  "mapMatches",
                )}: ${mapAnalysis.bestMap.matches}`,
              )}</p>
              <p class="stat-row">${formatStatRow(
                `${getText("mapWinRate")}: ${mapAnalysis.bestMap.winRate.toFixed(1)}%`,
              )}</p>
              <p class="stat-row">${formatStatRow(
                `K/D: ${mapAnalysis.bestMap.kd.toFixed(2)}`,
              )}</p>
              <p class="stat-row">${formatStatRow(
                `${getText("Headshots")}: ${mapAnalysis.bestMap.hs.toFixed(1)}%`,
              )}</p>
            `
                : `<p>${getText("notEnoughData")}</p>`
            }
          </div>
          
          <div class="stats-box slide-in-animation">
            <h3><i class="fas fa-map-marked-alt"></i> ${getText(
              "worstMapTitle",
            )}</h3>
            ${
              mapAnalysis.worstMap
                ? `
              <p class="stat-row">${formatStatRow(
                `${getText("mapName")}: ${mapAnalysis.worstMap.name}`,
              )}</p>
              <p class="stat-row">${formatStatRow(
                `${getText(
                  "mapMatches",
                )}: ${mapAnalysis.worstMap.matches}`,
              )}</p>
              <p class="stat-row">${formatStatRow(
                `${getText("mapWinRate")}: ${mapAnalysis.worstMap.winRate.toFixed(
                  1,
                )}%`,
              )}</p>
              <p class="stat-row">${formatStatRow(
                `K/D: ${mapAnalysis.worstMap.kd.toFixed(2)}`,
              )}</p>
              <p class="stat-row">${formatStatRow(
                `${getText("Headshots")}: ${mapAnalysis.worstMap.hs.toFixed(1)}%`,
              )}</p>
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

    // Показываем секцию results и скрываем pro-grid
    const resultsSection = document.getElementById("results");
    if (resultsSection) {
      resultsSection.style.display = "block";
    }

    const proGrid = document.querySelector(".pro-grid");
    if (proGrid) {
      proGrid.style.display = "none";
    }

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

    // Определяем текст ошибки
    let errorText = "Игрок не найден или произошла ошибка запроса.";
    try {
      const parsedError = JSON.parse(error.message);
      if (parsedError.errors && parsedError.errors[0]?.code === "err_nf0") {
        errorText =
          "Player not found. Please check the input or try again later.";
      }
    } catch (e) {
      if (error.message) errorText = error.message;
    }

    // Ищем или создаем баннер ошибки
    let banner = document.getElementById("custom-error-banner");

    if (!banner) {
      banner = document.createElement("div");
      banner.id = "custom-error-banner";
      banner.style.position = "fixed";
      banner.style.top = "20px";
      banner.style.left = "50%";
      banner.style.transform = "translateX(-50%)";
      banner.style.zIndex = "99999";
      banner.style.backgroundColor = "rgba(51, 51, 51, 0.9)";
      banner.style.color = "#ff5500";
      banner.style.padding = "14px 24px";
      banner.style.borderRadius = "8px";
      banner.style.border = "1px solid #ff5500";
      banner.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.5)";
      banner.style.fontFamily = "Orbitron, sans-serif";
      banner.style.fontSize = "13px";
      banner.style.textAlign = "center";
      banner.style.transition = "opacity 0.3s ease";

      document.body.appendChild(banner);
    }

    banner.textContent = errorText;
    banner.style.opacity = "1";

    if (window.errorTimeout) {
      clearTimeout(window.errorTimeout);
    }

    // Скрываем через 2 секунды
    window.errorTimeout = setTimeout(() => {
      banner.style.opacity = "0";
      setTimeout(() => {
        banner.remove();
      }, 300);
    }, 2000);

    if (output) {
      output.style.display = "block";
      output.textContent = errorText;

      setTimeout(() => {
        output.style.display = "none";
      }, 2000);
    }
  }
}

/**
 * Функция для поиска игрока из маршрутизации (handleUrlChange).
 * @param {string|null} nicknameParam - Никнейм для поиска (если null, берется из input)
 * @param {boolean} updateUrl - Нужно ли обновлять URL (true для поиска вручную, false при загрузке из URL)
 */
async function searchPlayer(nicknameParam = null, updateUrl = true) {
  let nickname;
  const nicknameInput = document.getElementById("nickname");

  if (nicknameParam) {
    // Используем переданный никнейм
    nickname = nicknameParam.trim();
    // ВАЖНО: устанавливаем в input поле, так как analyzePlayer() читает из input
    if (nicknameInput) {
      nicknameInput.value = nickname;
    }
  } else {
    // Берем из input поля
    nickname = nicknameInput?.value?.trim();
  }

  if (!nickname) {
    console.warn("Никнейм пуст, игнорируем поиск");
    return;
  }

  // Вызываем основную функцию анализа
  await analyzePlayer();

  // Обновляем URL если нужно (т.е. если поиск инициирован вручную)
  // Используем реальный ник FACEIT из playerData (особенно важно для Steam вводов)
  if (updateUrl) {
    const faceitNickname = window.currentPlayerData?.nickname || nickname;
    updateUrlForPlayer(faceitNickname);
  }
}

/**
 * Функция для возврата на главную страницу.
 * @param {boolean} updateUrl - Нужно ли обновлять URL
 */
function goBackToMain(updateUrl = true) {
  const output = document.getElementById("output");
  const playerStatsContainer = document.getElementById("playerStats");
  const resultsSection = document.getElementById("results");
  const proGrid = document.querySelector(".pro-grid");
  const searchSection = document.getElementById("search");
  const nicknameInput = document.getElementById("nickname");

  // Скрываем результаты поиска
  if (playerStatsContainer) {
    playerStatsContainer.innerHTML = "";
    playerStatsContainer.style.display = "none";
  }

  if (resultsSection) {
    resultsSection.style.display = "none";
  }

  // Показываем про сетку и очищаем вывод
  if (proGrid) {
    proGrid.style.display = "flex";
  }

  // Возвращаем строку поиска
  if (searchSection) {
    searchSection.style.display = "block";
  }

  if (output) {
    output.style.display = "none";
    output.textContent = "";
  }

  // Очищаем поле ввода
  if (nicknameInput) {
    nicknameInput.value = "";
  }

  // Убираем класс для восстановления видимости поиска
  document.body.classList.remove("profile-active");

  // Деактивируем сайдбар
  if (sidebarManager) {
    sidebarManager.hideForPlayerProfile();
  }

  // Сбрасываем текущий профиль
  currentPlayerProfile = null;
  window.currentPlayerProfile = null;
  window.currentPlayerData = null;

  // Прокручиваем к началу страницы с плавной анимацией
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  // Обновляем URL если нужно
  if (updateUrl) {
    updateUrlForPlayer(null);
  }
}

// Новая функция для рендеринга статистики на вкладке "Обзор"
function renderOverviewStats(container) {
  window.AppRendering.renderOverviewStats(container);
}

// Helper: format a "Label: value" string into left/right spans without changing text.
function formatStatRow(text) {
  return window.AppRendering.formatStatRow(text);
}

// Функции для модальных окон
function openSupportModal() {
  window.AppModals.openSupportModal();
}

function openContactModal() {
  window.AppModals.openContactModal();
}

// Функция для открытия модального окна теста реакции
function openReactionTestModal() {
  window.AppModals.openReactionTestModal();
}

// Инициализация теста реакции
function initReactionTest() {
  window.AppModals.initReactionTest();
}

// Запуск теста реакции
function startReactionTest() {
  window.AppModals.startReactionTest();
}

// Обработка клика по зеленому экрану
function handleReactionClick() {
  window.AppModals.handleReactionClick();
}

// Обработка раннего клика
function handleEarlyClick() {
  window.AppModals.handleEarlyClick();
}

// Сброс теста
function resetReactionTest() {
  window.AppModals.resetReactionTest();
}

// Функция отправки сообщения
function sendMessage(event) {
  window.AppModals.sendMessage(event);
}

// Диагностическая функция для проверки FaceitAPI
function checkFaceitAPI() {
  return window.AppPlayerResolve.checkFaceitAPI();
}

// Функция для обновления переводов в карточках карт
function updateMapsTexts() {
  window.AppRendering.updateMapsTexts();
}

// Функция для закрытия всех модальных окон
function closeAllModals() {
  window.AppModals.closeAllModals();
}

// Функция для применения фоновых изображений к карточкам карт
function applyMapCardBackgrounds(container) {
  window.AppRendering.applyMapCardBackgrounds(container);
}

// NOTE: Featured pro players cards functionality was rolled back.

// Bootstrapping: init once DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  // If script is loaded after DOM (or cached), init immediately
  init();
}



