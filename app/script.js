const appState = window.AppState || {
  playerStats: null,
  isInitialized: false,
  currentPlayerProfile: null,
  sidebarManager: null,
  lastHandledPath: null,
  currentLanguage: "en",
};

let playerStats = appState.playerStats ?? null;
let isInitialized = appState.isInitialized ?? false;
let currentPlayerProfile = appState.currentPlayerProfile ?? null;
let sidebarManager = appState.sidebarManager ?? null;
let lastHandledPath = appState.lastHandledPath ?? null;
let currentLanguage = "en";
const translations = window.AppI18nCatalog || { en: {} };
const SidebarManager = window.SidebarManager || null;

window.currentLanguage = currentLanguage;

function syncStateFromApp() {
  appState.playerStats = playerStats;
  appState.isInitialized = isInitialized;
  appState.currentPlayerProfile = currentPlayerProfile;
  appState.sidebarManager = sidebarManager;
  appState.lastHandledPath = lastHandledPath;
  appState.currentLanguage = currentLanguage;
}

function getText(key, placeholders = {}) {
  let text =
    translations[currentLanguage]?.[key] || translations.en?.[key] || key;

  Object.keys(placeholders).forEach((placeholder) => {
    text = text.replace(`{${placeholder}}`, placeholders[placeholder]);
  });

  return text;
}

function getCurrentLanguage() {
  return window.currentLanguage || currentLanguage || "en";
}

function setElementHtml(selector, html) {
  const element = document.querySelector(selector);
  if (element) element.innerHTML = html;
}

function setElementText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

function updateReactionTestTexts() {
  setElementHtml(
    "#reactionTestModal h2",
    `<i class="fas fa-bolt"></i> ${getText("reactionTest")}`,
  );

  const instructions = document.getElementById("reactionInstructions");
  if (instructions) {
    const paragraphs = instructions.querySelectorAll("p");
    if (paragraphs.length >= 3) {
      paragraphs[0].textContent = getText("reactionInstructions1");
      paragraphs[1].textContent = getText("reactionInstructions2");
      paragraphs[2].innerHTML = getText("reactionInstructions3");
    }
    setElementHtml(
      "#startReactionTest",
      `<i class="fas fa-play"></i> ${getText("startTest")}`,
    );
  }

  setElementText("#reactionWaiting .reaction-screen p", getText("reactionWait"));
  setElementText("#reactionReady .reaction-screen p", getText("reactionClickNow"));
  setElementText("#reactionResults h3", getText("reactionYourResult"));

  const timeValue = document.getElementById("reactionTimeValue");
  if (timeValue) {
    setElementHtml(
      ".reaction-time",
      `<span id="reactionTimeValue">${timeValue.textContent}</span> ${getText("reactionTimeMs")}`,
    );
  }

  setElementHtml(
    "#retryReactionTest",
    `<i class="fas fa-redo"></i> ${getText("reactionRetryTest")}`,
  );
  setElementText("#reactionTooEarly h3", getText("reactionTooEarly"));
  setElementText("#reactionTooEarly p", getText("reactionTooEarlyText"));
  setElementHtml(
    "#restartReactionTest",
    `<i class="fas fa-redo"></i> ${getText("reactionTryAgain")}`,
  );
}

function updateTranslatedNodes(selector) {
  document.querySelectorAll(selector).forEach((element) => {
    const translateKey = element.dataset.translate;
    if (translateKey) element.textContent = getText(translateKey);
  });
}

function updateSidebarTexts() {
  updateTranslatedNodes(".sidebar-item span[data-translate]");
}

function updateDrawerTexts() {
  const drawer = document.getElementById("mobileSidebarDrawer");
  if (!drawer || window.getComputedStyle(drawer).display === "none") return;

  updateTranslatedNodes(
    "#mobileSidebarDrawer .drawer-title[data-translate], #mobileSidebarDrawer .drawer-item span[data-translate]",
  );
}

function updateModalTexts() {
  setElementHtml(
    "#supportModal h2",
    `<i class="fas fa-heart"></i> ${getText("supportTitle")}`,
  );
  setElementHtml(
    ".steam-support",
    `<i class="fab fa-steam"></i> ${getText("steamTradeOffer")}`,
  );

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

  setElementHtml(
    "#contactModal h2",
    `<i class="fas fa-envelope"></i> ${getText("contactTitle")}`,
  );
  setElementText("#contactModal .modal-content > p", getText("contactDescription"));
  setElementText('label[for="contactName"]', getText("yourName"));
  setElementText('label[for="contactEmail"]', getText("email"));
  setElementText('label[for="contactSubject"]', getText("messageSubject"));
  setElementText('label[for="contactMessage"]', getText("message"));

  const nameInput = document.getElementById("contactName");
  if (nameInput) nameInput.placeholder = getText("enterName");

  const messageTextarea = document.getElementById("contactMessage");
  if (messageTextarea) messageTextarea.placeholder = getText("messagePlaceholder");

  const subjectSelect = document.getElementById("contactSubject");
  if (subjectSelect) {
    const optionKeys = [
      "selectSubject",
      "bugReport",
      "featureRequest",
      "support",
      "partnership",
      "other",
    ];
    optionKeys.forEach((key, index) => {
      if (subjectSelect.options[index]) {
        subjectSelect.options[index].textContent = getText(key);
      }
    });
  }

  setElementHtml(
    ".submit-btn",
    `<i class="fas fa-paper-plane"></i> ${getText("sendMessage")}`,
  );
}

function updatePageTexts() {
  setElementHtml("#search h2", `<i class="fas fa-search"></i> ${getText("searchTitle")}`);
  setElementHtml(
    "#results h2",
    `<i class="fas fa-trophy"></i> ${getText("resultsTitle")}`,
  );

  const nicknameInput = document.getElementById("nickname");
  if (nicknameInput) nicknameInput.placeholder = getText("searchPlaceholder");

  const searchButton = document.getElementById("searchButton");
  if (searchButton) searchButton.textContent = getText("analyzeButton");

  updateSidebarTexts();

  const output = document.getElementById("output");
  if (output) {
    const outputText = output.textContent.trim();
    if (
      outputText.includes("Enter a nickname") ||
      outputText.includes("Введите никнейм")
    ) {
      output.textContent = getText("enterNickname");
    }
  }

  setElementHtml(".support-btn", `<i class="fas fa-heart"></i> ${getText("supportUs")}`);
  setElementHtml(
    ".contact-btn",
    `<i class="fas fa-envelope"></i> ${getText("contactUs")}`,
  );
  setElementHtml(
    "#reactionTestBtn",
    `<i class="fas fa-bolt"></i> ${getText("reactionTest")}`,
  );
  updateModalTexts();
}

function updateUrlForPlayer(nickname) {
  const path = window.AppRouter
    ? window.AppRouter.buildPlayerUrl(nickname)
    : nickname
      ? `/player/${encodeURIComponent(nickname)}`
      : "/";
  const title = nickname ? `FACEIT Analyze - ${nickname}` : "FACEIT Analyze";

  if (window.location.pathname !== path) {
    history.pushState({ nickname }, title, path);
    lastHandledPath = path;
    syncStateFromApp();
  }
  document.title = title;
}

async function handleUrlChange() {
  const path = window.location.pathname;
  if (lastHandledPath === path) return;

  lastHandledPath = path;
  syncStateFromApp();

  const route = window.AppRouter ? window.AppRouter.resolvePath(path) : null;
  const nickname = route?.type === "player" ? route.nickname : null;
  const nicknameInput = document.getElementById("nickname");

  if (nickname) {
    if (nicknameInput) nicknameInput.value = nickname;
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      await searchPlayer(nickname, false);
    } catch (error) {
      console.error("Ошибка при загрузке профиля:", error);
      alert(`Ошибка: ${error.message}`);
    }
    return;
  }

  if (nicknameInput?.value) nicknameInput.value = "";
  goBackToMain(false);
}

async function init() {
  if (isInitialized) return;

  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname);
  }

  currentLanguage = "en";
  window.currentLanguage = currentLanguage;
  playerStats = document.getElementById("playerStats");
  sidebarManager = new SidebarManager();
  window.sidebarManager = sidebarManager;
  syncStateFromApp();

  window.AppUIEvents.initializeEventListeners();
  window.addEventListener("resize", () => sidebarManager?.handleResize());
  window.addEventListener("popstate", handleUrlChange);

  updatePageTexts();

  try {
    await window.Config.loadConfig();
  } catch (error) {
    console.error("Ошибка при загрузке конфигурации:", error);
  }

  window.AppPlayerResolve.checkFaceitAPI();

  isInitialized = true;
  syncStateFromApp();
  await handleUrlChange();
}

function parseAnalyzeError(error) {
  let errorText = "Игрок не найден или произошла ошибка запроса.";
  try {
    const parsedError = JSON.parse(error.message);
    if (parsedError.errors && parsedError.errors[0]?.code === "err_nf0") {
      return "Player not found. Please check the input or try again later.";
    }
  } catch {
    if (error.message) errorText = error.message;
  }
  return errorText;
}

function showAnalyzeError(errorText, output) {
  let banner = document.getElementById("custom-error-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "custom-error-banner";
    banner.style.cssText =
      "position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;background-color:rgba(51,51,51,0.9);color:#ff5500;padding:14px 24px;border-radius:8px;border:1px solid #ff5500;box-shadow:0 4px 20px rgba(0,0,0,0.5);font-family:Orbitron,sans-serif;font-size:13px;text-align:center;transition:opacity 0.3s ease";
    document.body.appendChild(banner);
  }

  banner.textContent = errorText;
  banner.style.opacity = "1";

  if (window.errorTimeout) clearTimeout(window.errorTimeout);
  window.errorTimeout = setTimeout(() => {
    banner.style.opacity = "0";
    setTimeout(() => banner.remove(), 300);
  }, 2000);

  if (output) {
    output.style.display = "block";
    output.textContent = errorText;
    setTimeout(() => {
      output.style.display = "none";
    }, 2000);
  }
}

function showPlayerResults() {
  const resultsSection = document.getElementById("results");
  const proGrid = document.querySelector(".pro-grid");
  if (resultsSection) resultsSection.style.display = "block";
  if (proGrid) proGrid.style.display = "none";
  document.body.classList.add("profile-active");
}

async function analyzePlayer() {
  const nickname = document.getElementById("nickname")?.value?.trim();
  if (!nickname) {
    alert(getText("enterNicknameValidation"));
    return;
  }

  const output = document.getElementById("output");
  const playerStatsContainer = document.getElementById("playerStats");
  const faceitService = window.FaceitAPI;

  if (!playerStats) playerStats = playerStatsContainer;
  if (output) output.textContent = `${getText("gettingData")} ${nickname}...`;

  try {
    if (!window.Config.loaded) await window.Config.loadConfig();
    if (!window.FaceitAPI) throw new Error("FaceitAPI не загружена");

    let playerData;
    if (window.AppPlayerResolve.isSteamInput(nickname)) {
      window.trackEvent("analyze_input_steam", { input: nickname });
      playerData =
        await window.AppPlayerResolve.resolveFaceitPlayerFromSteam(nickname);
    } else {
      playerData = await faceitService.getPlayerData(nickname);
    }

    window.currentPlayerData = playerData;
    window.trackEvent("analyze_player_resolved", {
      searched: nickname,
      resolvedNickname: playerData?.nickname || null,
      resolvedPlayerId: playerData?.player_id || null,
    });

    if (output) {
      output.textContent = `${getText("gettingStats")} ${playerData.nickname}...`;
    }

    const gameId = "cs2";
    const statsData = await faceitService.getStatsData(playerData.player_id, gameId);
    const currentElo = await faceitService.getCurrentElo(
      playerData.player_id,
      gameId,
      playerData.games?.[gameId]?.faceit_elo || 0,
    );
    const countryName = await faceitService.getCountryName(playerData.country);
    const lifetime = statsData.lifetime || {};
    const segments = statsData.segments || [];
    const avgStats = faceitService.calculateAvgStats(lifetime, segments, gameId);
    const mapAnalysis = faceitService.analyzeMaps(segments, gameId);

    currentPlayerProfile = {
      playerData,
      statsData,
      currentElo,
      countryName,
      avgStats,
      mapAnalysis,
    };
    window.currentPlayerProfile = currentPlayerProfile;
    syncStateFromApp();

    window.trackEvent("analyze_success", {
      playerNickname: playerData?.nickname || null,
      playerId: playerData?.player_id || null,
      gameId,
    });

    if (output) output.style.display = "none";

    playerStatsContainer.innerHTML = window.AppRendering.renderPlayerCard(
      playerData,
      countryName,
      currentElo,
      avgStats,
      lifetime,
    );
    playerStatsContainer.style.display = "block";
    window.AppRendering.renderOverviewStats(
      playerStatsContainer.querySelector(".stats-container"),
    );
    showPlayerResults();

    if (sidebarManager) {
      setTimeout(() => {
        sidebarManager.showForPlayerProfile();
        const statsContainer = document.querySelector(".stats-container");
        if (statsContainer) {
          sidebarManager.originalStatsHTML = statsContainer.innerHTML;
        }
        sidebarManager.switchView("overview");
      }, 300);
    }
  } catch (error) {
    console.error("Ошибка при получении данных игрока:", error);
    window.trackEvent("analyze_error", {
      searched: nickname,
      message: String(error?.message || error),
    });
    showAnalyzeError(parseAnalyzeError(error), output);
  }
}

async function searchPlayer(nicknameParam = null, updateUrl = true) {
  const nicknameInput = document.getElementById("nickname");
  const nickname = nicknameParam
    ? nicknameParam.trim()
    : nicknameInput?.value?.trim();

  if (!nickname) return;
  if (nicknameParam && nicknameInput) nicknameInput.value = nickname;

  await analyzePlayer();

  if (updateUrl) {
    updateUrlForPlayer(window.currentPlayerData?.nickname || nickname);
  }
}

function goBackToMain(updateUrl = true) {
  const output = document.getElementById("output");
  const playerStatsContainer = document.getElementById("playerStats");
  const resultsSection = document.getElementById("results");
  const proGrid = document.querySelector(".pro-grid");
  const searchSection = document.getElementById("search");
  const nicknameInput = document.getElementById("nickname");

  if (playerStatsContainer) {
    playerStatsContainer.innerHTML = "";
    playerStatsContainer.style.display = "none";
  }
  if (resultsSection) resultsSection.style.display = "none";
  if (proGrid) proGrid.style.display = "flex";
  if (searchSection) searchSection.style.display = "block";
  if (output) {
    output.style.display = "none";
    output.textContent = "";
  }
  if (nicknameInput) nicknameInput.value = "";

  document.body.classList.remove("profile-active");
  sidebarManager?.hideForPlayerProfile();

  currentPlayerProfile = null;
  window.currentPlayerProfile = null;
  window.currentPlayerData = null;
  syncStateFromApp();

  window.scrollTo({ top: 0, behavior: "smooth" });
  if (updateUrl) updateUrlForPlayer(null);
}

window.getText = getText;
window.getCurrentLanguage = getCurrentLanguage;
window.updateReactionTestTexts = updateReactionTestTexts;
window.updateDrawerTexts = updateDrawerTexts;
window.updateUrlForPlayer = updateUrlForPlayer;
window.analyzePlayer = analyzePlayer;
window.searchPlayer = searchPlayer;
window.goBackToMain = goBackToMain;
window.clearPlayerProfile = () => goBackToMain(true);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
