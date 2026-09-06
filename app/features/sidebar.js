(function () {
  function normalizeMapKey(mapName) {
    if (!mapName) return '';
    return String(mapName)
      .trim()
      .toLowerCase()
      .replace(/^de_/, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  const SidebarHelpers = {
    normalizeMapKey,
  };

  if (typeof window !== 'undefined') {
    window.SidebarHelpers = SidebarHelpers;
  }
})();
