(function () {
  if (typeof window === 'undefined') return;

  const delegateNormalizeMapKey = (mapName) => {
    if (typeof window.LegacySidebarManager?.normalizeMapKey === 'function') {
      return window.LegacySidebarManager.normalizeMapKey(mapName);
    }
    if (!mapName) return '';
    return String(mapName)
      .trim()
      .toLowerCase()
      .replace(/^de_/, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  };

  class SidebarManagerAdapter {
    static normalizeMapKey(mapName) {
      return delegateNormalizeMapKey(mapName);
    }

    constructor(...args) {
      if (typeof window.LegacySidebarManager === 'function') {
        return new window.LegacySidebarManager(...args);
      }

      this.sidebar = document.getElementById('sidebar');
      this.mobileOverlay = document.getElementById('mobileOverlay');
      this.mobileDrawer = document.getElementById('mobileSidebarDrawer');
      this.isPlayerProfileActive = false;
      this.isMobileOpen = false;
      this.isDrawerExpanded = false;
      this.currentView = 'overview';
      this.currentMatches = [];
      this.currentMapFilter = null;
      this.matchesOffset = 0;
      this.matchesLimit = 40;
      this.totalMatches = 0;
      this.displayedMatchesCount = 0;
      this.availableMapOptions = [];
    }

    getFilteredMatches() {
      if (typeof window.LegacySidebarManager?.prototype?.getFilteredMatches === 'function') {
        return new window.LegacySidebarManager().getFilteredMatches();
      }
      return [];
    }
  }

  window.SidebarManager = SidebarManagerAdapter;
})();
