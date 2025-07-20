import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const PORT = 3000;
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const analytics = {
  totalActiveVisitors: 0,
  totalVisitorsToday: 0,
  pagesVisited: {},
  activeSessions: new Map(),
  sessionIdsCounted: new Set(), // Track counted sessions
};

let connectedDashboards = 0;

function broadcast(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws) => {
  connectedDashboards++;
  console.log(`Dashboard connected. Total: ${connectedDashboards}`);

  ws.send(JSON.stringify({
    type: 'user_connected',
    data: {
      totalDashboards: connectedDashboards,
      connectedAt: new Date().toISOString(),
    },
  }));

  wss.clients.forEach((client) => {
    if (client !== ws && client.readyState === client.OPEN) {
      client.send(JSON.stringify({
        type: 'user_connected',
        data: { totalDashboards: connectedDashboards },
      }));
    }
  });

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);

      if (parsed.type === 'request_detailed_stats') {
        const { page, country } = parsed.filter || {};

        let filteredSessions = Array.from(analytics.activeSessions.entries())
          .map(([sessionId, sessionData]) => ({
            sessionId,
            ...sessionData,
          }))
          .filter((session) => session.isActive);

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
          ? { [page]: analytics.pagesVisited[page] || 0 }
          : analytics.pagesVisited;

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
    connectedDashboards--;
    console.log(`Dashboard disconnected. Total: ${connectedDashboards}`);

    broadcast({
      type: 'user_disconnected',
      data: { totalDashboards: connectedDashboards },
    });
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Root endpoint
app.get('/', (_, res) => {
  res.send('Visitor Analytics System API is running...');
});

// Visitor tracking endpoint
app.post('/api/events', (req, res) => {
  const event = req.body;

  if (!event?.type || !event?.sessionId || !event?.timestamp) {
    return res.status(400).json({ error: 'Missing required fields (type, sessionId, timestamp)' });
  }

  const { sessionId, type, timestamp, page, country = 'Unknown' } = event;

  // Count unique visitors today by sessionId
  if (!analytics.sessionIdsCounted.has(sessionId)) {
    analytics.totalVisitorsToday++;
    analytics.sessionIdsCounted.add(sessionId);
  }

  let session = analytics.activeSessions.get(sessionId);

  if (!session) {
    session = {
      journey: [],
      currentPage: '',
      duration: 0,
      lastActivity: new Date(timestamp),
      isActive: true,
      country,
    };
    analytics.activeSessions.set(sessionId, session);
    analytics.totalActiveVisitors++;
    console.log(`New session: ${sessionId}`);
  } else {
    const diffSec = (new Date(timestamp).getTime() - session.lastActivity.getTime()) / 1000;
    if (!isNaN(diffSec) && diffSec >= 0 && type !== 'session_end') {
      session.duration += diffSec;
    }
  }

  // Page view tracking
  if (type === 'pageview') {
    if (page && session.currentPage.toLowerCase() !== page.toLowerCase()) {
      session.journey.push(page);
    }
    session.currentPage = page || session.currentPage;
  } else if (type === 'session_end') {
    if (session.isActive) {
      analytics.totalActiveVisitors--;
    }
    session.isActive = false;
  }

  session.lastActivity = new Date(timestamp);

  if (page) {
    analytics.pagesVisited[page] = (analytics.pagesVisited[page] || 0) + 1;
  }

  // Broadcast updated stats
  broadcast({
    type: 'visitor_update',
    data: {
      event,
      stats: {
        totalActive: analytics.totalActiveVisitors,
        totalToday: analytics.totalVisitorsToday,
        pagesVisited: analytics.pagesVisited,
      },
    },
  });

  if (session.isActive) {
    broadcast({
      type: 'session_activity',
      data: {
        sessionId,
        currentPage: session.currentPage,
        journey: session.journey,
        duration: Math.round(session.duration),
        country: session.country,
      },
    });
  }

  res.status(200).json({ message: 'Event processed successfully' });
});

// Summary API
app.get('/api/analytics/summary', (_, res) => {
  res.json({
    totalActive: analytics.totalActiveVisitors,
    totalToday: analytics.totalVisitorsToday,
    pagesVisited: analytics.pagesVisited,
  });
});

// Active session API
app.get('/api/analytics/sessions', (_, res) => {
  const sessions = Array.from(analytics.activeSessions.entries())
    .map(([sessionId, data]) => ({ sessionId, ...data }))
    .filter((s) => s.isActive);

  res.json(sessions);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket running on ws://localhost:${PORT}`);
});
