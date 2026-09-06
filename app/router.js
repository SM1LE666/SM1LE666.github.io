(function () {
  function normalizePath(path) {
    if (!path) return "/";
    return String(path).trim() || "/";
  }

  function buildPlayerUrl(nickname) {
    if (!nickname) return "/";
    return `/player/${encodeURIComponent(String(nickname).trim())}`;
  }

  function resolvePath(path) {
    const normalizedPath = normalizePath(path);
    const match = normalizedPath.match(/^\/player\/(.+)$/);

    if (match && match[1]) {
      return {
        type: "player",
        path: normalizedPath,
        nickname: decodeURIComponent(match[1]),
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
      resolvePath,
    };
  }
})();
