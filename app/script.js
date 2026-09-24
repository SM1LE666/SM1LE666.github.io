const appState = window.AppState || {
  playerStats: null,
  isInitialized: false,
  currentPlayerProfile: null,
  sidebarManager: null,
  lastHandledPath: null,
};

let playerStats = appState.playerStats ?? null;
let isInitialized = appState.isInitialized ?? false;
let currentPlayerProfile = appState.currentPlayerProfile ?? null;
let sidebarManager = appState.sidebarManager ?? null;
let lastHandledPath = appState.lastHandledPath ?? null;
const SidebarManager = window.SidebarManager || null;

function syncStateFromApp() {
  appState.playerStats = playerStats;
  appState.isInitialized = isInitialized;
  appState.currentPlayerProfile = currentPlayerProfile;
  appState.sidebarManager = sidebarManager;
  appState.lastHandledPath = lastHandledPath;
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
  const currentPath = window.location.pathname;
  if (lastHandledPath === currentPath) return;

  lastHandledPath = currentPath;
  syncStateFromApp();

  const route = window.AppRouter
    ? window.AppRouter.resolvePath(currentPath)
    : null;

  if (route?.type === "modal") {
    openModalByRoute(route.modalId, false);
    return;
  } else {
    closeModalRoute(false);
  }

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

  if (!sidebarManager && (SidebarManager || window.SidebarManager)) {
    const ManagerClass = SidebarManager || window.SidebarManager;
    sidebarManager = new ManagerClass();
    window.sidebarManager = sidebarManager;
  }

  window.AppUIEvents.initializeEventListeners();
  window.addEventListener(
    "resize",
    debounce(() => sidebarManager?.handleResize(), 150),
  );
  window.addEventListener("popstate", handleUrlChange);

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
  let errorText = "Player not found or request error occurred.";
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
    alert("Please enter a nickname or profile URL.");
    return;
  }

  const output = document.getElementById("output");
  const playerStatsContainer = document.getElementById("playerStats");
  const faceitService = window.FaceitAPI;

  if (!playerStats) playerStats = playerStatsContainer;
  if (output) output.textContent = `Getting data for ${nickname}...`;

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
      output.textContent = `Getting CS:2 statistics for ${playerData.nickname}...`;
    }

    const gameId = "cs2";
    const statsData = await faceitService.getStatsData(
      playerData.player_id,
      gameId,
    );
    const currentElo = await faceitService.getCurrentElo(
      playerData.player_id,
      gameId,
      playerData.games?.[gameId]?.faceit_elo || 0,
    );
    const countryName = await faceitService.getCountryName(playerData.country);
    const lifetime = statsData.lifetime || {};
    const segments = statsData.segments || [];
    const avgStats = faceitService.calculateAvgStats(
      lifetime,
      segments,
      gameId,
    );
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

    // Объединяем отрисовку элементов и активацию сайдбара в один кадр
    requestAnimationFrame(() => {
      const statsContainer =
        playerStatsContainer.querySelector(".stats-container");

      showPlayerResults();
      window.AppRendering.renderOverviewStats(statsContainer);

      if (sidebarManager) {
        if (statsContainer) {
          sidebarManager.originalStatsHTML = statsContainer.innerHTML;
        }
        // showForPlayerProfile уже включает обзор (overview), switchView вызван не будет
        sidebarManager.showForPlayerProfile();
      }
    });
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
  if (proGrid) {
    proGrid.style.display = "flex";
  }
  if (resultsSection) resultsSection.style.display = "none";
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

const MODAL_ROUTE_MAP = {
  "reaction-test": "reactionTestModal",
  contact: "contactModal",
  support: "supportModal",
};

function openModalByRoute(modalRoute, updateUrl = true) {
  const modalId = MODAL_ROUTE_MAP[modalRoute];
  if (!modalId) return;

  Object.values(MODAL_ROUTE_MAP).forEach((id) => {
    const el = document.getElementById(id);
    if (el && id !== modalId) {
      el.style.display = "none";
      el.classList.remove("show");
    }
  });

  const modalElement = document.getElementById(modalId);
  if (modalElement) {
    modalElement.style.display = "flex";
    modalElement.classList.add("show");
  }

  if (updateUrl) {
    const targetPath = `/${modalRoute}`;
    if (window.location.pathname !== targetPath) {
      history.pushState(
        { modal: modalRoute, previousPath: window.location.pathname },
        "",
        targetPath,
      );
      lastHandledPath = targetPath;
      syncStateFromApp();
    }
  }
}

function closeModalRoute(updateUrl = true) {
  Object.values(MODAL_ROUTE_MAP).forEach((modalId) => {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.style.display = "none";
      modalElement.classList.remove("show");
    }
  });

  if (updateUrl) {
    const fallbackPath = window.currentPlayerData?.nickname
      ? `/player/${encodeURIComponent(window.currentPlayerData.nickname)}`
      : "/";

    if (window.location.pathname !== fallbackPath) {
      history.pushState(null, "", fallbackPath);
      lastHandledPath = fallbackPath;
      syncStateFromApp();
    }
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

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
