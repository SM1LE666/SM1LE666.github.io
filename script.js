// Глобальная переменная для доступа из onclick
let playerStats;
let isInitialized = false; // Флаг для предотвращения множественной инициализации

// Объект с переводами
const translations = {
  en: {
    // Header
    title: "FACEIT Analyze",

    // Search section
    searchTitle: "Search Player Statistics",
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
    mapName: "Name",
    mapWinRate: "Win Rate",
    mapMatches: "Matches",

    // Messages
    gettingData: "Getting data for",
    gettingStats: "Getting CS:2 statistics for",
    playerNotFound: "Player not found.",
    noCs2Stats:
      "CS:2 statistics for {nickname} not found. Player hasn't played CS:2 or data is unavailable.",
    noCs2Matches:
      "{nickname} hasn't played CS:2 matches. Only CS:GO statistics available, which is not considered.",
    notEnoughData: "Not enough data",

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
    supportStep2: "Select items to transfer",
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
      "Gmail has been opened to send the message. Please check your browser tabs.",

    // Error messages
    faceitApiNotLoaded:
      "FaceitAPI not loaded. Check developer console for details.",
    error: "Error",

    // Demo mode messages
    demoMode: "Demo Mode",
    demoModeNote:
      "Using demo data for demonstration. Real API may be limited on static hosting.",
  },

  ru: {
    // Header
    title: "FACEIT Analyze",

    // Search section
    searchTitle: "Поиск статистики игроков",
    searchPlaceholder: "Введите никнейм игрока или ссылку на профиль",
    analyzeButton: "АНАЛИЗ",

    // Results section
    resultsTitle: "Статистика игрока",
    enterNickname: "Введите никнейм для просмотра результатов.",

    // Player info
    country: "Страна",
    elo: "ELO",
    level: "Уровень",
    matches: "Матчей",
    winRate: "Винрейт",
    faceitProfile: "Профиль FACEIT",

    // Stats
    avgStatsTitle: "Средняя статистика",
    killsPerMatch: "Убийств за матч",
    deathsPerMatch: "Смертей за матч",
    totalKills: "Всего убийств",
    totalDeaths: "Всего смертей",

    // Maps
    bestMapTitle: "Лучшая карта",
    worstMapTitle: "Худшая карта",
    mapName: "Название",
    mapWinRate: "Винрейт",
    mapMatches: "Матчей",

    // Messages
    gettingData: "Получение данных для",
    gettingStats: "Получение статистики CS:2 для",
    playerNotFound: "Игрок не найден.",
    noCs2Stats:
      "Статистика CS:2 для {nickname} не найдена. Игрок не играл в CS:2 или данные недоступны.",
    noCs2Matches:
      "{nickname} не играл матчи в CS:2. Доступна только статистика CS:GO, которая не учитывается.",
    notEnoughData: "Недостаточно данных",

    // Validation
    enterNicknameValidation:
      "Пожалуйста, введите никнейм или ссылку на профиль.",
    fillAllFields: "Пожалуйста, заполните все поля",

    // Footer
    supportUs: "Поддержать нас",
    contactUs: "Связаться с нами",
    footerText: "Продвинутая статистика для игроков FACEIT",

    // Support modal
    supportTitle: "Поддержать FACEIT Analyze",
    steamTradeOffer: "Steam Trade Offer",
    howToSupport: "Как поддержать:",
    supportStep1: 'Нажмите на кнопку "Steam Trade Offer"',
    supportStep2: "Выберите предметы для передачи",
    supportStep3: "Отправьте трейд-оффер",
    supportNote:
      "Любые скины CS:2, CS:GO или другие игровые предметы будут приняты с благодарностью!",

    // Contact modal
    contactTitle: "Отправить сообщение",
    contactDescription:
      "Есть вопросы, предложения или нужна помощь? Напишите нам!",
    yourName: "Ваше имя",
    enterName: "Введите ваше имя",
    email: "Email",
    messageSubject: "Тема сообщения",
    selectSubject: "Выберите тему",
    bugReport: "Сообщить об ошибке",
    featureRequest: "Предложить улучшение",
    support: "Техническая поддержка",
    partnership: "Сотрудничество",
    other: "Другое",
    message: "Сообщение",
    messagePlaceholder: "Опишите ваш вопрос или предложение...",
    sendMessage: "Отправить сообщение",
    orWriteDirectly: "Или напишите напрямую:",

    // Success messages
    emailClientOpened:
      "Gmail открыт для отправки сообщения. Проверьте новую вкладку в браузере.",

    // Error messages
    faceitApiNotLoaded:
      "FaceitAPI не загружен. Проверьте консоль разработчика для деталей.",
    error: "Ошибка",

    // Demo mode messages
    demoMode: "Режим демонстрации",
    demoModeNote:
      "Используются демонстрационные данные. Реальный API может быть ограничен на статическом хостинге.",
  },
};

// Текущий язык (по умолчанию русский)
let currentLanguage = "ru";

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

// Функция для переключения языка
function switchLanguage(lang) {
  if (!translations[lang]) {
    console.error(`Язык ${lang} не поддерживается`);
    return;
  }

  // Предотвращаем повторные вызовы для того же языка
  if (currentLanguage === lang) {
    return;
  }

  currentLanguage = lang;
  // Обновляем глобальную переменную для доступа из других файлов
  window.currentLanguage = currentLanguage;

  // Сохраняем выбранный язык в localStorage
  localStorage.setItem("faceit-analyze-language", lang);

  // Обновляем активную кнопку языка
  updateLanguageButtons();

  // Обновляем все тексты на странице
  updatePageTexts();

  // Если есть отображенная статистика игрока, обновляем её
  if (playerStats && playerStats.innerHTML.trim() !== "") {
    updatePlayerStatsTexts();
    // Обновляем названия стран через FaceitAPI если доступно
    if (window.FaceitAPI && window.FaceitAPI.updateCountryNames) {
      try {
        window.FaceitAPI.updateCountryNames();
      } catch (error) {
        console.warn("Ошибка при обновлении названий стран:", error);
      }
    }
  }
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

  const footerText = document.querySelector("footer p");
  if (footerText) {
    footerText.textContent = `© 2025 FACEIT Analyze | ${getText("footerText")}`;
  }

  // Модальные окна
  updateModalTexts();
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

  const contactDescription = document.querySelector("#contactModal > p");
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
    } else if (index === 2) {
      h3.innerHTML = `<i class="fas fa-map-marked-alt"></i> ${getText(
        "worstMapTitle"
      )}`;
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

// Запускаем инициализацию после загрузки страницы
window.addEventListener("load", init);

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

    // Получаем данные игрока
    const playerData = await window.FaceitAPI.getPlayerData(nickname, apiKey);
    window.currentPlayerData = playerData; // Сохраняем для использования в переводах

    // Проверяем, используются ли демо данные
    const isDemoMode =
      playerData.player_id && playerData.player_id.startsWith("demo-");

    // Показываем уведомление о демо режиме, если нужно
    if (isDemoMode) {
      showDemoNotification();
    } else {
      hideDemoNotification();
    }

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

    // Получаем актуальное ELO
    const currentElo = await window.FaceitAPI.getCurrentElo(
      playerData.player_id,
      gameId,
      playerData.games?.[gameId]?.faceit_elo || 0,
      apiKey
    );

    // Получаем название страны
    const countryName = await window.FaceitAPI.getCountryName(
      playerData.country
    );

    // Отображаем результаты
    displayPlayerStats(playerData, statsData, currentElo, countryName);

    if (output) {
      output.style.display = "none";
    }
  } catch (error) {
    console.error("Ошибка анализа игрока:", error);
    if (output) {
      if (error.message.includes("404")) {
        output.textContent = getText("playerNotFound");
      } else if (
        error.message.includes("CS:2") ||
        error.message.includes("cs2")
      ) {
        output.textContent = getText("noCs2Stats", { nickname: nickname });
      } else {
        output.textContent = `${getText("error")}: ${error.message}`;
      }
    }
  }
}

// Функция для отображения статистики игрока
function displayPlayerStats(playerData, statsData, currentElo, countryName) {
  const playerStatsContainer = document.getElementById("playerStats");
  if (!playerStatsContainer) return;

  // Обрабатываем статистику
  const gameId = "cs2";
  const lifetime = statsData.lifetime || {};
  const segments = statsData.segments || [];

  const avgStats = window.FaceitAPI.calculateAvgStats(
    lifetime,
    segments,
    gameId
  );
  const mapAnalysis = window.FaceitAPI.analyzeMaps(segments, gameId);

  // Создаем HTML для карточки игрока
  const playerCardHTML = `
    <div class="player-card fade-in-animation">
      <div class="player-header">
        <div class="player-avatar">
          <img src="${playerData.avatar || "logooo.png"}" alt="${
    playerData.nickname
  }" onerror="this.src='logooo.png'">
        </div>
        <div class="player-info">
          <h2>${playerData.nickname}</h2>
          <p>${getText("country")}: ${countryName}</p>
          <p>ELO: ${window.FaceitAPI.formatNumber(currentElo)}</p>
          <p>${getText("level")}: ${
    playerData.games?.[gameId]?.skill_level || "N/A"
  } <span class="level-indicator">⭐</span></p>
          <p>${getText("matches")}: ${window.FaceitAPI.formatNumber(
    avgStats.totalMatches
  )}</p>
          <p>${getText("winRate")}: ${lifetime["Win Rate %"] || "0"}%</p>
          <a href="https://www.faceit.com/${
            currentLanguage === "ru" ? "ru" : "en"
          }/players/${playerData.nickname}" target="_blank">${getText(
    "faceitProfile"
  )}</a>
        </div>
      </div>
      
      <div class="stats-container">
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
          <h3><i class="fas fa-map-marked-alt"></i> ${getText(
            "worstMapTitle"
          )}</h3>
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
      </div>
    </div>
  `;

  playerStatsContainer.innerHTML = playerCardHTML;
  playerStatsContainer.style.display = "block";
}

// Функции для модальных окон (вызываются из HTML)
function openSupportModal() {
  const modal = document.getElementById("supportModal");
  if (modal) {
    modal.style.display = "block";
    // Обновляем тексты в модальном окне поддержки
    updateModalTexts();
  }
}

function closeSupportModal() {
  const modal = document.getElementById("supportModal");
  if (modal) {
    modal.style.display = "none";
  }
}

function openContactModal() {
  const modal = document.getElementById("contactModal");
  if (modal) {
    modal.style.display = "block";
    // Обновляем тексты в модальном окне контактов
    updateModalTexts();
  }
}

function closeContactModal() {
  const modal = document.getElementById("contactModal");
  if (modal) {
    modal.style.display = "none";
  }
}

function sendMessage(event) {
  event.preventDefault();

  const name = document.getElementById("contactName").value;
  const email = document.getElementById("contactEmail").value;
  const subject = document.getElementById("contactSubject").value;
  const message = document.getElementById("contactMessage").value;

  if (!name || !email || !subject || !message) {
    alert(getText("fillAllFields"));
    return;
  }

  // Формируем письмо для Gmail
  const subjectText = `FACEIT Analyze: ${subject}`;
  const bodyText = `Имя: ${name}\nEmail: ${email}\n\nСообщение:\n${message}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=faceit.analyze@gmail.com&su=${encodeURIComponent(
    subjectText
  )}&body=${encodeURIComponent(bodyText)}`;

  // Открываем Gmail в новой вкладке
  window.open(gmailUrl, "_blank");

  // Показываем сообщение об успехе
  alert(getText("emailClientOpened"));

  // Закрываем модальное окно
  closeContactModal();

  // Очищаем форму
  document.getElementById("contactForm").reset();
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
    history.replaceState(null, null, window.location.pathname);
  }

  // Устанавливаем язык интерфейса в зависимости от настроек браузера или локального хранилища
  const browserLang = navigator.language || navigator.userLanguage;
  const savedLang = localStorage.getItem("faceit-analyze-language");
  const defaultLang = "ru"; // Язык по умолчанию

  const lang = translations[browserLang]
    ? browserLang
    : translations[savedLang]
    ? savedLang
    : defaultLang;

  // Устанавливаем язык без вызова switchLanguage для избежания циклов
  currentLanguage = lang;
  window.currentLanguage = currentLanguage;

  // Инициализируем playerStats
  playerStats = document.getElementById("playerStats");

  // Добавляем обработчики событий ТОЛЬКО ОДИН РАЗ
  initializeEventListeners();

  // Обновляем интерфейс
  updateLanguageButtons();
  updatePageTexts();

  // Диагностическая проверка загрузки FaceitAPI
  checkFaceitAPI();

  // Помечаем как инициализированное
  isInitialized = true;
  console.log("Приложение успешно инициализировано");
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

  // Обработчик Enter в поле поиска
  const nicknameInput = document.getElementById("nickname");
  if (nicknameInput) {
    nicknameInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        analyzePlayer();
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
      analyzePlayer();
    });
  }

  // Обработчики для кнопок закрытия модальных окон
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const modal = closeBtn.closest(".modal");
      if (modal) {
        modal.style.display = "none";
      }
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
    const supportModal = document.getElementById("supportModal");
    const contactModal = document.getElementById("contactModal");
    if (
      (supportModal && event.target === supportModal) ||
      (contactModal && event.target === contactModal)
    ) {
      event.target.style.display = "none";
    }
  });
}

// Функции для управления уведомлением о демо режиме
function showDemoNotification() {
  const notification = document.getElementById("demoNotification");
  if (notification) {
    const demoText = notification.querySelector(".demo-text");
    if (demoText) {
      demoText.textContent = getText("demoModeNote");
    }
    notification.style.display = "block";
  }
}

function hideDemoNotification() {
  const notification = document.getElementById("demoNotification");
  if (notification) {
    notification.style.display = "none";
  }
}

// Диагностическая функция для проверки загрузки FaceitAPI
function checkFaceitAPI() {
  if (!window.FaceitAPI) {
    console.error("FaceitAPI не определен в window!");
    console.warn(getText("faceitApiNotLoaded"));
    return false;
  }
  return true;
}
