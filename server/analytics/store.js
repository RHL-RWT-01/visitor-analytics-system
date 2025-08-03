export const analyticsStore = {
  totalActiveVisitors: 0,
  totalVisitorsToday: 0,
  pagesVisited: {},
  activeSessions: new Map(),
  sessionIdsCounted: new Set(),
};

export let connectedDashboards = 0;