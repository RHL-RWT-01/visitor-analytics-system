import { analyticsStore } from './store.js';

export function processVisitorEvent(event) {
  const { sessionId, type, timestamp, page, country = 'Unknown' } = event;

  if (!analyticsStore.sessionIdsCounted.has(sessionId)) {
    analyticsStore.totalVisitorsToday++;
    analyticsStore.sessionIdsCounted.add(sessionId);
  }

  let session = analyticsStore.activeSessions.get(sessionId);

  if (!session) {
    session = {
      journey: [],
      currentPage: '',
      duration: 0,
      lastActivity: new Date(timestamp),
      isActive: true,
      country,
    };
    analyticsStore.activeSessions.set(sessionId, session);
    analyticsStore.totalActiveVisitors++;
  } else {
    const diffSec = (new Date(timestamp) - session.lastActivity) / 1000;
    if (!isNaN(diffSec) && diffSec >= 0 && type !== 'session_end') {
      session.duration += diffSec;
    }
  }

  if (type === 'pageview') {
    if (page && session.currentPage.toLowerCase() !== page.toLowerCase()) {
      session.journey.push(page);
    }
    session.currentPage = page || session.currentPage;
  } else if (type === 'session_end') {
    if (session.isActive) analyticsStore.totalActiveVisitors--;
    session.isActive = false;
  }

  session.lastActivity = new Date(timestamp);

  if (page) {
    analyticsStore.pagesVisited[page] = (analyticsStore.pagesVisited[page] || 0) + 1;
  }

  return { session, analytics: analyticsStore };
}
