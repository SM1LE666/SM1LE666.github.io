// Глобальная переменная для доступа из onclick
let playerStats;
let API_KEY = null;

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
    errorLoadingApiKey: "Failed to load API key. Check configuration file.",
    error: "Error",
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
    errorLoadingApiKey:
      "Не удалось загрузить API ключ. Проверьте файл конфигурации.",
    error: "Ошибка",
  },
};

// Текущий язык (по умолчанию русский)
let currentLanguage = "ru";

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

  currentLanguage = lang;

  // Сохраняем выбранный язык в localStorage
  localStorage.setItem("faceit-analyze-language", lang);

  // Обновляем активную кнопку языка
  updateLanguageButtons();

  // Обновляем все тексты на странице
  updatePageTexts();

  // Если есть отображенная статистика игрока, обновляем её
  if (playerStats && playerStats.innerHTML.trim() !== "") {
    updatePlayerStatsTexts();
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

  const contactInfoFooter = document.querySelector(".contact-info-footer p");
  if (contactInfoFooter) {
    contactInfoFooter.innerHTML = `
      <i class="fas fa-envelope"></i> ${getText("orWriteDirectly")}
      <a href="https://mail.google.com/mail/?view=cm&fs=1&to=faceit.analyze@gmail.com" target="_blank">faceit.analyze@gmail.com</a>
    `;
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
        const countryValue = text.split(":")[1]?.trim();
        if (countryValue) {
          p.textContent = `${getText("country")}: ${countryValue}`;
        }
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
          const value = text.split(":")[1]?.trim();
          if (value) p.textContent = `${getText("killsPerMatch")}: ${value}`;
        } else if (
          text.includes("Смертей за матч:") ||
          text.includes("Deaths per match:")
        ) {
          const value = text.split(":")[1]?.trim();
          if (value) p.textContent = `${getText("deathsPerMatch")}: ${value}`;
        } else if (
          text.includes("Всего убийств:") ||
          text.includes("Total kills:")
        ) {
          const value = text.split(":")[1]?.trim();
          if (value) p.textContent = `${getText("totalKills")}: ${value}`;
        } else if (
          text.includes("Всего смертей:") ||
          text.includes("Total deaths:")
        ) {
          const value = text.split(":")[1]?.trim();
          if (value) p.textContent = `${getText("totalDeaths")}: ${value}`;
        }
      });
    } else if (index === 1) {
      // Блок лучшей карты
      h3.innerHTML = `<i class="fas fa-star"></i> ${getText("bestMapTitle")}`;

      const paragraphs = box.querySelectorAll("p");
      paragraphs.forEach((p) => {
        const text = p.textContent;
        if (text.includes("Название:") || text.includes("Name:")) {
          const value = text.split(":")[1]?.trim();
          if (value) p.textContent = `${getText("mapName")}: ${value}`;
        } else if (text.includes("Винрейт:") || text.includes("Win Rate:")) {
          const value = text.split(":")[1]?.trim();
          if (value) p.textContent = `${getText("mapWinRate")}: ${value}`;
        } else if (text.includes("Матчей:") || text.includes("Matches:")) {
          const value = text.split(":")[1]?.trim();
          if (value) p.textContent = `${getText("mapMatches")}: ${value}`;
        } else if (
          text.includes("Недостаточно данных") ||
          text.includes("Not enough data")
        ) {
          p.textContent = getText("notEnoughData");
        }
      });
    } else if (index === 2) {
      // Блок худшей карты
      h3.innerHTML = `<i class="fas fa-times-circle"></i> ${getText(
        "worstMapTitle"
      )}`;

      const paragraphs = box.querySelectorAll("p");
      paragraphs.forEach((p) => {
        const text = p.textContent;
        if (text.includes("Название:") || text.includes("Name:")) {
          const value = text.split(":")[1]?.trim();
          if (value) p.textContent = `${getText("mapName")}: ${value}`;
        } else if (text.includes("Винрейт:") || text.includes("Win Rate:")) {
          const value = text.split(":")[1]?.trim();
          if (value) p.textContent = `${getText("mapWinRate")}: ${value}`;
        } else if (text.includes("Матчей:") || text.includes("Matches:")) {
          const value = text.split(":")[1]?.trim();
          if (value) p.textContent = `${getText("mapMatches")}: ${value}`;
        } else if (
          text.includes("Недостаточно данных") ||
          text.includes("Not enough data")
        ) {
          p.textContent = getText("notEnoughData");
        }
      });
    }
  });
}

// Функция для инициализации языка
function initializeLanguage() {
  // Загружаем сохраненный язык из localStorage
  const savedLanguage = localStorage.getItem("faceit-analyze-language");
  if (savedLanguage && translations[savedLanguage]) {
    currentLanguage = savedLanguage;
  }

  // Обновляем интерфейс
  updateLanguageButtons();
  updatePageTexts();
}

// Диагностическая функция для проверки загрузки FaceitAPI
function checkFaceitAPI() {
  if (!window.FaceitAPI) {
    console.error("FaceitAPI не определен в window!");
    alert(getText("faceitApiNotLoaded"));
    return false;
  }
  return true;
}

// Глобальная функция для создания дефолтного аватара
function createDefaultAvatar(nickname) {
  // Простой SVG аватар с первой буквой никнейма
  const firstLetter =
    nickname && nickname.length > 0 ? nickname[0].toUpperCase() : "?";
  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#333333"/>
      <text x="50" y="60" text-anchor="middle" fill="#ff5500" font-size="40" font-family="Arial, sans-serif" font-weight="bold">${firstLetter}</text>
    </svg>
  `;
  return "data:image/svg+xml;base64," + btoa(svg);
}

// Глобальная функция для вызова через onclick в HTML
async function analyzePlayer() {
  if (!checkFaceitAPI()) {
    return;
  }

  const nicknameInput = document.getElementById("nickname");
  if (!nicknameInput) {
    console.error("Элемент nickname не найден!");
    return;
  }

  const nicknameValue = nicknameInput.value;

  // Получаем ссылки на элементы, если ещё не получили
  if (!playerStats) playerStats = document.getElementById("playerStats");

  await fetchPlayerStats(nicknameValue);
}

// Инициализация после загрузки страницы
document.addEventListener("DOMContentLoaded", async function () {
  preventAutoRefresh();

  // Загружаем конфигурацию с API ключом
  try {
    await window.Config.loadConfig();
    API_KEY = window.Config.getApiKey();
    console.log("API ключ успешно загружен из конфигурации");
  } catch (error) {
    console.error("Ошибка загрузки API ключа:", error);
    alert("Не удалось загрузить API ключ. Проверьте файл конфигурации.");
    return;
  }

  // Инициализация глобальных переменных
  playerStats = document.getElementById("playerStats");
  const nickname = document.getElementById("nickname");

  // Добавляем обработчик поиска по нажатию Enter
  nickname.addEventListener("keypress", async (event) => {
    if (event.key === "Enter") {
      await analyzePlayer();
    }
  });

  // Инициализация языка
  initializeLanguage();
});

// Функция для предотвращения автообновления страницы
function preventAutoRefresh() {
  // Отключаем автообновление страницы браузером
  window.addEventListener("beforeunload", function (e) {
    // Предотвращаем автоматическое обновление
    e.preventDefault();
    return undefined;
  });

  // Блокируем попытки обновления через F5, Ctrl+R, Ctrl+F5
  document.addEventListener("keydown", function (e) {
    // F5 или Ctrl+R
    if (e.key === "F5" || (e.ctrlKey && e.key === "r")) {
      e.preventDefault();
      console.log("Автообновление страницы заблокировано");
      return false;
    }

    // Ctrl+F5 (принудительное обновление)
    if (e.ctrlKey && e.key === "F5") {
      e.preventDefault();
      console.log("Принудительное обновление страницы заблокировано");
      return false;
    }
  });

  // Отключаем контекстное меню (правый клик) для предотвращения "Обновить"
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    return false;
  });

  // Предотвращаем автоматическое обновление через navigation API
  if ("navigation" in window) {
    navigation.addEventListener("navigate", function (e) {
      if (e.navigationType === "reload") {
        e.preventDefault();
        console.log("Навигационное обновление заблокировано");
      }
    });
  }

  // Блокируем обновление через history API
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function () {
    // Разрешаем только изменения в пределах текущей страницы
    if (arguments[2] && arguments[2].includes("#")) {
      return originalPushState.apply(history, arguments);
    }
  };

  history.replaceState = function () {
    // Разрешаем только изменения в пределах текущей страницы
    if (arguments[2] && arguments[2].includes("#")) {
      return originalReplaceState.apply(history, arguments);
    }
  };

  // Отключаем автоперевод Google Chrome
  disableGoogleTranslate();

  console.log("Защита от автообновления и автоперевода активирована");
}

// Функция для отключения автоперевода Google Chrome
function disableGoogleTranslate() {
  // Добавляем класс notranslate к body
  document.body.classList.add("notranslate");

  // Устанавливаем атрибуты для отключения перевода
  document.documentElement.setAttribute("translate", "no");
  document.body.setAttribute("translate", "no");

  // Блокируем Google Translate скрипты
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) {
          // Элемент
          // Добавляем translate="no" к новым элементам
          if (node.tagName) {
            node.setAttribute("translate", "no");
          }

          // Блокируем Google Translate элементы
          if (
            node.id &&
            (node.id.includes("google_translate") ||
              node.id.includes("goog-gt") ||
              (node.className && node.className.includes("goog-te")))
          ) {
            node.remove();
            console.log("Заблокирован элемент Google Translate");
          }

          // Рекурсивно применяем к дочерним элементам
          const children = node.querySelectorAll("*");
          children.forEach((child) => {
            child.setAttribute("translate", "no");
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Блокируем загрузку Google Translate скриптов
  const originalCreateElement = document.createElement;
  document.createElement = function (tagName) {
    const element = originalCreateElement.call(document, tagName);

    if (tagName.toLowerCase() === "script") {
      const originalSrc = Object.getOwnPropertyDescriptor(
        HTMLScriptElement.prototype,
        "src"
      );
      Object.defineProperty(element, "src", {
        get: originalSrc.get,
        set: function (value) {
          if (
            value &&
            (value.includes("translate.google") ||
              value.includes("translate.googleapis"))
          ) {
            console.log("Заблокирован Google Translate скрипт:", value);
            return;
          }
          originalSrc.set.call(this, value);
        },
      });
    }

    // Добавляем translate="no" к новым элементам
    element.setAttribute("translate", "no");

    return element;
  };

  console.log("Защита от Google Translate активирована");
}

// Основная функция получения и отображения статистики игрока
async function fetchPlayerStats(nicknameValue) {
  const playerNickname = nicknameValue.trim();
  if (!playerStats) playerStats = document.getElementById("playerStats");
  let outputDiv = document.getElementById("output");

  if (!playerNickname) {
    outputDiv.style.display = "block";
    outputDiv.innerHTML = getText("enterNicknameValidation");
    playerStats.innerHTML = "";
    return;
  }

  // Если элемент output был удален, создаем его заново
  if (!outputDiv) {
    outputDiv = document.createElement("div");
    outputDiv.id = "output";
    outputDiv.style.display = "block";

    // Вставляем перед playerStats
    const resultsSection = document.getElementById("results");
    resultsSection.insertBefore(outputDiv, playerStats);
  }

  outputDiv.style.display = "block";
  outputDiv.innerHTML = `${getText("gettingData")} ${playerNickname}...`;
  playerStats.innerHTML = "";

  try {
    const playerData = await FaceitAPI.getPlayerData(playerNickname, API_KEY);
    if (!playerData) {
      outputDiv.innerHTML = getText("playerNotFound");
      return;
    }

    const playerId = playerData.player_id;
    outputDiv.innerHTML = `${getText("gettingStats")} ${
      playerData.nickname
    }...`;

    // Получаем ТОЛЬКО статистику CS:2
    const statsData = await FaceitAPI.getStatsData(playerId, "cs2", API_KEY);
    const gameId = "cs2";

    // Проверяем, есть ли вообще данные CS:2
    if (!statsData || !statsData.lifetime || !statsData.segments) {
      outputDiv.innerHTML = getText("noCs2Stats", {
        nickname: playerData.nickname,
      });
      playerStats.innerHTML = "";
      return;
    }

    // Проверяем, есть ли матчи в CS:2
    const cs2Matches = parseInt(statsData.lifetime["Total Matches"] || "0", 10);
    if (cs2Matches === 0) {
      outputDiv.innerHTML = getText("noCs2Matches", {
        nickname: playerData.nickname,
      });
      playerStats.innerHTML = "";
      return;
    }

    // Если данные CS:2 есть, обрабатываем их
    const countryName = await FaceitAPI.getCountryName(
      playerData.country || "Н/Д"
    );
    const fallbackElo = playerData.games?.[gameId]?.faceit_elo || "Н/Д";
    const currentElo = await FaceitAPI.getCurrentElo(
      playerId,
      gameId,
      fallbackElo,
      API_KEY
    );
    const avgStats = FaceitAPI.calculateAvgStats(
      statsData.lifetime,
      statsData.segments,
      gameId
    );
    const mapAnalysis = FaceitAPI.analyzeMaps(statsData.segments, gameId);

    // Скрываем output вместо удаления
    outputDiv.style.display = "none";

    // Отображаем данные в карточке с анимацией
    displayPlayerData(
      playerData,
      statsData,
      avgStats,
      mapAnalysis,
      currentElo,
      countryName,
      gameId,
      true
    );
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    outputDiv.style.display = "block";
    outputDiv.innerHTML = `${getText("error")}: ${error.message}`;
    playerStats.innerHTML = "";
  }
}

// Функция для отображения статистики в карточках
function displayPlayerData(
  player,
  statsData,
  avgStats,
  mapAnalysis,
  currentElo,
  countryName,
  gameId,
  animate = false
) {
  // Убедимся, что playerStats определен
  if (!playerStats) playerStats = document.getElementById("playerStats");

  // Очищаем предыдущие результаты
  playerStats.innerHTML = "";

  // Форматируем основную информацию
  const nickname = player.nickname || "Н/Д";
  const level = player.games?.[gameId]?.skill_level || "Н/Д";
  const matches = statsData.lifetime?.Matches || "0";
  const winRate = statsData.lifetime?.["Win Rate %"] || "0%";
  const avatar = player.avatar || createDefaultAvatar(nickname);

  // Формируем ссылку на профиль FACEIT
  const faceitProfileUrl = `https://www.faceit.com/${
    currentLanguage === "ru" ? "ru" : "en"
  }/players/${nickname}`;

  // Создаем карточку игрока
  const playerCard = document.createElement("div");
  playerCard.className = "player-card";
  playerCard.setAttribute("translate", "no"); // Отключаем перевод для карточки

  // Добавляем класс анимации, если запрошено
  if (animate) {
    playerCard.classList.add("fade-in-animation");
  }

  // Добавляем класс в зависимости от уровня для стилизации
  playerCard.classList.add(`level-${level}`);

  playerCard.innerHTML = `
      <div class="player-header" translate="no">
          <div class="player-avatar">
              <img src="${avatar}" alt="${nickname}" onerror="this.src='${createDefaultAvatar(
    nickname
  )}'">
          </div>
          <div class="player-info" translate="no">
              <h2 translate="no">${nickname}</h2>
              <p translate="no">${getText("country")}: ${countryName}</p>
              <p translate="no">${getText("elo")}: ${currentElo}</p>
              <p translate="no">${getText("level")}: ${level} 
                  <span class="level-indicator">${Array(parseInt(level) || 0)
                    .fill("⭐")
                    .join("")}</span>
              </p>
              <p translate="no">${getText("matches")}: ${matches}</p>
              <p translate="no">${getText("winRate")}: ${winRate}%</p>
              <p translate="no"><a href="${faceitProfileUrl}" target="_blank">${getText(
    "faceitProfile"
  )}</a></p>
          </div>
      </div>

      <div class="stats-container" translate="no">
          <div class="stats-box ${
            animate ? "slide-in-animation" : ""
          }" translate="no">
              <h3 translate="no"><i class="fas fa-chart-line"></i> ${getText(
                "avgStatsTitle"
              )}</h3>
              <p translate="no">${getText("killsPerMatch")}: ${
    avgStats.avgKills
  }</p>
              <p translate="no">${getText("deathsPerMatch")}: ${
    avgStats.avgDeaths
  }</p>
              <p translate="no">K/D: ${avgStats.kd}</p>
              <p translate="no">${getText("totalKills")}: ${
    avgStats.totalKills
  }</p>
              <p translate="no">${getText("totalDeaths")}: ${
    avgStats.totalDeaths
  }</p>
          </div>

          <div class="stats-box ${
            animate ? "slide-in-animation" : ""
          }" translate="no">
              <h3 translate="no"><i class="fas fa-star"></i> ${getText(
                "bestMapTitle"
              )}</h3>
              ${
                mapAnalysis.bestMap
                  ? `<p translate="no">${getText("mapName")}: ${
                      mapAnalysis.bestMap.name
                    }</p>
                     <p translate="no">${getText("mapWinRate")}: ${
                      mapAnalysis.bestMap.winRate
                    }%</p>
                     <p translate="no">${getText("mapMatches")}: ${
                      mapAnalysis.bestMap.matches
                    }</p>
                     <p translate="no">K/D: ${mapAnalysis.bestMap.kd.toFixed(
                       2
                     )}</p>`
                  : `<p translate="no">${getText("notEnoughData")}</p>`
              }
          </div>

          <div class="stats-box ${
            animate ? "slide-in-animation" : ""
          }" translate="no">
              <h3 translate="no"><i class="fas fa-times-circle"></i> ${getText(
                "worstMapTitle"
              )}</h3>
              ${
                mapAnalysis.worstMap
                  ? `<p translate="no">${getText("mapName")}: ${
                      mapAnalysis.worstMap.name
                    }</p>
                     <p translate="no">${getText("mapWinRate")}: ${
                      mapAnalysis.worstMap.winRate
                    }%</p>
                     <p translate="no">${getText("mapMatches")}: ${
                      mapAnalysis.worstMap.matches
                    }</p>
                     <p translate="no">K/D: ${mapAnalysis.worstMap.kd.toFixed(
                       2
                     )}</p>`
                  : `<p translate="no">${getText("notEnoughData")}</p>`
              }
          </div>
      </div>
  `;

  playerStats.appendChild(playerCard);
}

// Функции для модальных окон
function openSupportModal() {
  document.getElementById("supportModal").style.display = "block";
  document.body.style.overflow = "hidden"; // Блокируем прокрутку фона
}

function closeSupportModal() {
  document.getElementById("supportModal").style.display = "none";
  document.body.style.overflow = "auto"; // Восстанавливаем прокрутку
}

function openContactModal() {
  document.getElementById("contactModal").style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeContactModal() {
  document.getElementById("contactModal").style.display = "none";
  document.body.style.overflow = "auto";
}

// Обработка отправки формы контактов
function sendMessage(event) {
  event.preventDefault();

  const form = event.target;
  const name = form.contactName.value;
  const email = form.contactEmail.value;
  const subject = form.contactSubject.value;
  const message = form.contactMessage.value;

  // Простая валидация с переводами
  if (!name || !email || !subject || !message) {
    alert(getText("fillAllFields"));
    return;
  }

  // Получаем текст темы из выбранного option
  const subjectText = form.contactSubject.selectedOptions[0].text;

  // Формируем текст письма
  const emailBody = `
${getText("yourName")}: ${name}
${getText("email")}: ${email}
${getText("messageSubject")}: ${subjectText}

${getText("message")}:
${message}

---
${
  currentLanguage === "ru"
    ? "Отправлено через форму FACEIT Analyze"
    : "Sent via FACEIT Analyze form"
}
${currentLanguage === "ru" ? "Дата" : "Date"}: ${new Date().toLocaleString(
    currentLanguage === "ru" ? "ru-RU" : "en-US"
  )}
  `.trim();

  // Создаем прямую ссылку на Gmail Compose
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=faceit.analyze@gmail.com&su=${encodeURIComponent(
    `[FACEIT Analyze] ${subjectText}`
  )}&body=${encodeURIComponent(emailBody)}`;

  // Открываем Gmail в новой вкладке
  window.open(gmailUrl, "_blank");

  // Показываем сообщение об успехе
  alert(getText("emailClientOpened"));

  // Очищаем форму и закрываем модальное окно
  form.reset();
  closeContactModal();
}

// Закрытие модальных окон при клике вне их области
window.onclick = function (event) {
  const supportModal = document.getElementById("supportModal");
  const contactModal = document.getElementById("contactModal");

  if (event.target === supportModal) {
    closeSupportModal();
  }

  if (event.target === contactModal) {
    closeContactModal();
  }
};

// Закрытие модальных окон по клавише Escape
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeSupportModal();
    closeContactModal();
  }
});
