import express from 'express';
import { analyticsStore } from '../analytics/store.js';
import { processVisitorEvent } from '../analytics/analyticsService.js';
import { broadcast } from '../utils/broadcast.js';

export default function analyticsRoutes(wss) {
  const router = express.Router();

  router.post('/events', (req, res) => {
    const event = req.body;
    if (!event?.type || !event?.sessionId || !event?.timestamp) {
      return res.status(400).json({ error: 'Missing required fields (type, sessionId, timestamp)' });
    }

    const { session } = processVisitorEvent(event);

    broadcast(wss, {
      type: 'visitor_update',
      data: {
        event,
        stats: {
          totalActive: analyticsStore.totalActiveVisitors,
          totalToday: analyticsStore.totalVisitorsToday,
          pagesVisited: analyticsStore.pagesVisited,
        },
      },
    });

    if (session.isActive) {
      broadcast(wss, {
        type: 'session_activity',
        data: {
          sessionId: event.sessionId,
          currentPage: session.currentPage,
          journey: session.journey,
          duration: Math.round(session.duration),
          country: session.country,
        },
      });
    }

    res.status(200).json({ message: 'Event processed successfully' });
  });

  router.get('/analytics/summary', (_, res) => {
    res.json({
      totalActive: analyticsStore.totalActiveVisitors,
      totalToday: analyticsStore.totalVisitorsToday,
      pagesVisited: analyticsStore.pagesVisited,
    });
  });

  router.get('/analytics/sessions', (_, res) => {
    const sessions = Array.from(analyticsStore.activeSessions.entries())
      .map(([sessionId, data]) => ({ sessionId, ...data }))
      .filter((s) => s.isActive);
    res.json(sessions);
  });

  return router;
}
