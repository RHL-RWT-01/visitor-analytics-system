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
    activeSessions: new Map()
};

let connectedDashboards = 0;

function broadcast(message) {
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

wss.on('connection', ws => {
    connectedDashboards++;
    console.log(`Dashboard connected. Total dashboards: ${connectedDashboards}`);

    ws.send(JSON.stringify({
        type: 'user_connected',
        data: {
            totalDashboards: connectedDashboards,
            connectedAt: new Date().toISOString()
        }
    }));

    wss.clients.forEach(client => {
        if (client !== ws && client.readyState === client.OPEN) {
            client.send(JSON.stringify({
                type: 'user_connected',
                data: {
                    totalDashboards: connectedDashboards
                }
            }));
        }
    });

    ws.on('message', message => {
        try {
            const parsedMessage = JSON.parse(message);
            console.log('Received WebSocket message:', parsedMessage);

            if (parsedMessage.type === 'request_detailed_stats') {
                const { page, country } = parsedMessage.filter || {};

                let filteredSessions = Array.from(analytics.activeSessions.entries())
                    .map(([sessionId, sessionData]) => ({
                        sessionId,
                        ...sessionData
                    }))
                    .filter(session => session.isActive);

                if (page) {
                    filteredSessions = filteredSessions.filter(session =>
                        session.currentPage.toLowerCase() === page.toLowerCase() ||
                        session.journey.some(p => p.toLowerCase() === page.toLowerCase())
                    );
                }

                if (country) {
                    filteredSessions = filteredSessions.filter(session =>
                        session.country && session.country.toLowerCase() === country.toLowerCase()
                    );
                }

                const filteredPages = page
                    ? { [page]: analytics.pagesVisited[page] || 0 }
                    : analytics.pagesVisited;

                ws.send(JSON.stringify({
                    type: 'detailed_stats_response',
                    data: {
                        filter: parsedMessage.filter,
                        sessions: filteredSessions,
                        pagesVisited: filteredPages
                    }
                }));
            }
            else if (parsedMessage.type === 'track_dashboard_action') {
                console.log('Dashboard action tracked:', parsedMessage.action, parsedMessage.details);
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        connectedDashboards--;
        console.log(`Dashboard disconnected. Total dashboards: ${connectedDashboards}`);

        broadcast({
            type: 'user_disconnected',
            data: {
                totalDashboards: connectedDashboards
            }
        });
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
});

app.get('/', (req, res) => {
    res.send('Visitor Analytics System API is running...');
});

app.post('/api/events', (req, res) => {
    const event = req.body;
    console.log('Received event:', event);

    if (!event || !event.type || !event.sessionId || !event.timestamp) {
        return res.status(400).json({ error: 'Missing required event fields (type, sessionId, timestamp)' });
    }

    analytics.totalVisitorsToday++;

    let session = analytics.activeSessions.get(event.sessionId);

    if (!session) {
        session = {
            journey: [],
            currentPage: '',
            duration: 0,
            lastActivity: new Date(event.timestamp),
            isActive: true,
            country: event.country || 'Unknown'
        };
        analytics.activeSessions.set(event.sessionId, session);
        analytics.totalActiveVisitors++;
        console.log(`New session created: ${event.sessionId}, Active visitors: ${analytics.totalActiveVisitors}`);
    } else {
        const timeDiff = (new Date(event.timestamp).getTime() - session.lastActivity.getTime()) / 1000;
        if (!isNaN(timeDiff) && timeDiff >= 0 && event.type !== 'session_end') {
            session.duration += timeDiff;
        }
    }

    if (event.type === 'pageview') {
        if (event.page && session.currentPage.toLowerCase() !== event.page.toLowerCase()) {
            session.journey.push(event.page);
        }
        session.currentPage = event.page || session.currentPage;
        console.log(`Session ${event.sessionId} pageview: ${session.currentPage}`);
    } else if (event.type === 'session_end') {
        session.isActive = false;
        analytics.totalActiveVisitors--;
        console.log(`Session ended: ${event.sessionId}, Active visitors: ${analytics.totalActiveVisitors}`);
    }

    session.lastActivity = new Date(event.timestamp);

    if (event.page) {
        analytics.pagesVisited[event.page] = (analytics.pagesVisited[event.page] || 0) + 1;
    }

    broadcast({
        type: 'visitor_update',
        data: {
            event,
            stats: {
                totalActive: analytics.totalActiveVisitors,
                totalToday: analytics.totalVisitorsToday,
                pagesVisited: analytics.pagesVisited
            }
        }
    });

    if (session.isActive) {
        broadcast({
            type: 'session_activity',
            data: {
                sessionId: event.sessionId,
                currentPage: session.currentPage,
                journey: session.journey,
                duration: Math.round(session.duration),
                country: session.country
            }
        });
    }

    res.status(200).json({ message: 'Event received and processed' });
});

app.get('/api/analytics/summary', (req, res) => {
    res.status(200).json({
        totalActive: analytics.totalActiveVisitors,
        totalToday: analytics.totalVisitorsToday,
        pagesVisited: analytics.pagesVisited
    });
});

app.get('/api/analytics/sessions', (req, res) => {
    const sessionsArray = Array.from(analytics.activeSessions.entries())
        .map(([sessionId, data]) => ({
            sessionId,
            ...data
        }))
        .filter(session => session.isActive);

    res.status(200).json(sessionsArray);
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
    console.log(`Current time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
});