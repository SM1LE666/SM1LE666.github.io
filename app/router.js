(function () {
  function normalizePath(path) {
    if (!path) return "/";
    return String(path).trim() || "/";
  }

  function buildPlayerUrl(nickname) {
    if (!nickname) return "/";
    return `/player/${encodeURIComponent(String(nickname).trim())}`;
  }

  function buildModalUrl(modalRoute) {
    if (!modalRoute) return "/";
    return `/${modalRoute}`;
  }

  function resolvePath(path) {
    const normalizedPath = normalizePath(path);

    const modalMatch = normalizedPath.match(
      /^\/(reaction-test|support|contact)$/i,
    );
    if (modalMatch && modalMatch[1]) {
      return {
        type: "modal",
        modalId: modalMatch[1].toLowerCase(),
        path: normalizedPath,
      };
    }

    const playerMatch = normalizedPath.match(/^\/player\/(.+)$/i);
    if (playerMatch && playerMatch[1]) {
      return {
        type: "player",
        path: normalizedPath,
        nickname: decodeURIComponent(playerMatch[1]),
      };
    }

    return {
      type: "home",
      path: "/",
      nickname: null,
    };
  }

  if (typeof window !== "undefined") {
    window.AppRouter = {
      normalizePath,
      buildPlayerUrl,
      buildModalUrl,
      resolvePath,
    };
  }
})();
