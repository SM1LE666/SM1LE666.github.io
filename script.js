// Глобальная переменная для доступа из onclick
let playerStats;

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
    // Дополнительно обновляем названия стран
    updateCountryNamesInPlayerCard();
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
    paragraphs.forEach(async (p) => {
      const text = p.textContent;
      // Обновляем каждую строку с информацией о игроке
      if (text.includes("Страна:") || text.includes("Country:")) {
        // Получаем новое название страны через FaceitAPI
        if (
          window.currentPlayerData &&
          window.currentPlayerData.country &&
          window.FaceitAPI
        ) {
          const countryCode = window.currentPlayerData.country;
          try {
            // Получаем переведенное название страны
            const newCountryName = await window.FaceitAPI.getCountryName(
              countryCode
            );
            p.textContent = `${getText("country")}: ${newCountryName}`;
          } catch (error) {
            console.error("Ошибка при получении названия страны:", error);
            // Fallback: просто обновляем подпись, оставляя старое название
            const countryValue = text.split(":")[1]?.trim();
            if (countryValue) {
              p.textContent = `${getText("country")}: ${countryValue}`;
            }
          }
        } else {
          // Fallback: просто обновляем подпись, оставляя старое название
          const countryValue = text.split(":")[1]?.trim();
          if (countryValue) {
            p.textContent = `${getText("country")}: ${countryValue}`;
          }
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

// Функция для инициализации приложения
function init() {
  // Устанавливаем язык интерфейса в зависимости от настроек браузера или локального хранилища
  const browserLang = navigator.language || navigator.userLanguage;
  const savedLang = localStorage.getItem("faceit-analyze-language");
  const defaultLang = "ru"; // Язык по умолчанию

  const lang = translations[browserLang]
    ? browserLang
    : translations[savedLang]
    ? savedLang
    : defaultLang;
  switchLanguage(lang);

  // Добавляем обработчики событий для кнопок переключения языка
  const langButtons = document.querySelectorAll(".lang-btn");
  langButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedLang = btn.dataset.lang;
      switchLanguage(selectedLang);
    });
  });

  // Обработчик клика по кнопке "Поддержать нас" (открывает модальное окно)
  const supportBtn = document.querySelector(".support-btn");
  if (supportBtn) {
    supportBtn.addEventListener("click", () => {
      const modal = document.getElementById("supportModal");
      if (modal) {
        modal.style.display = "block";
        // Обновляем тексты в модальном окне поддержки
        updateModalTexts();
      }
    });
  }

  // Обработчик клика по кнопке "Связаться с нами" (открывает модальное окно)
  const contactBtn = document.querySelector(".contact-btn");
  if (contactBtn) {
    contactBtn.addEventListener("click", () => {
      const modal = document.getElementById("contactModal");
      if (modal) {
        modal.style.display = "block";
        // Обновляем тексты в модальном окне контактов
        updateModalTexts();
      }
    });
  }

  // Закрытие модальных окон при клике вне их области
  window.addEventListener("click", (event) => {
    const supportModal = document.getElementById("supportModal");
    const contactModal = document.getElementById("contactModal");
    if (
      (supportModal && event.target === supportModal) ||
      (contactModal && event.target === contactModal)
    ) {
      event.target.style.display = "none";
    }
  });

  // Диагностическая проверка загрузки FaceitAPI
  checkFaceitAPI();
}

// Диагностическая функция для проверки загрузки FaceitAPI
function checkFaceitAPI() {
  if (!window.FaceitAPI) {
    console.error("FaceitAPI не определен в window!");
    // Убираем алерт - просто логируем ошибку в консоль
    console.warn(getText("faceitApiNotLoaded"));
    return false;
  }
  return true;
}

// Запускаем инициализацию после загрузки страницы
window.addEventListener("load", init);
