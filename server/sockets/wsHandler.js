import { analyticsStore, connectedDashboards } from '../analytics/store.js';
import { broadcast } from '../utils/broadcast.js';

export function handleWebSocket(wss) {
  wss.on('connection', (ws) => {
    analyticsStore.connectedDashboards = ++analyticsStore.connectedDashboards;

    ws.send(JSON.stringify({
      type: 'user_connected',
      data: {
        totalDashboards: analyticsStore.connectedDashboards,
        connectedAt: new Date().toISOString(),
      },
    }));

    broadcast(wss, {
      type: 'user_connected',
      data: { totalDashboards: analyticsStore.connectedDashboards },
    });

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'request_detailed_stats') {
          const { page, country } = parsed.filter || {};
          let filteredSessions = Array.from(analyticsStore.activeSessions.entries())
            .map(([sessionId, sessionData]) => ({ sessionId, ...sessionData }))
            .filter((s) => s.isActive);

          if (page) {
            filteredSessions = filteredSessions.filter((s) =>
              s.currentPage?.toLowerCase() === page.toLowerCase() ||
              s.journey?.some((p) => p.toLowerCase() === page.toLowerCase())
            );
          }

          if (country) {
            filteredSessions = filteredSessions.filter((s) =>
              s.country?.toLowerCase() === country.toLowerCase()
            );
          }

          const filteredPages = page
            ? { [page]: analyticsStore.pagesVisited[page] || 0 }
            : analyticsStore.pagesVisited;

          ws.send(JSON.stringify({
            type: 'detailed_stats_response',
            data: {
              filter: parsed.filter,
              sessions: filteredSessions,
              pagesVisited: filteredPages,
            },
          }));
        }

        if (parsed.type === 'track_dashboard_action') {
          console.log('Dashboard action tracked:', parsed.action);
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      analyticsStore.connectedDashboards--;
      broadcast(wss, {
        type: 'user_disconnected',
        data: { totalDashboards: analyticsStore.connectedDashboards },
      });
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}
