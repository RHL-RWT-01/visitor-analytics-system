import React, { useState, useEffect, useRef } from 'react';
interface VisitorEvent {
    type: string;
    page?: string;
    sessionId: string;
    timestamp: string;
    country?: string;
    metadata?: any;
}

// interface AnalyticsStats {
//     totalActive: number;
//     totalToday: number;
//     pagesVisited: { [key: string]: number };
// }

interface SessionData {
    sessionId: string;
    currentPage: string;
    journey: string[];
    duration: number;
}

interface WebSocketMessage {
    type: string;
    data: any;
}

const Dashboard: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
    const [connectedDashboardsCount, setConnectedDashboardsCount] = useState<number>(0);
    const [activeVisitors, setActiveVisitors] = useState<number>(0);
    const [totalVisitorsToday, setTotalVisitorsToday] = useState<number>(0);
    const [pagesVisited, setPagesVisited] = useState<{ [key: string]: number }>({});
    const [visitorFeed, setVisitorFeed] = useState<VisitorEvent[]>([]);
    const [activeSessions, setActiveSessions] = useState<Map<string, SessionData>>(new Map());
    const ws = useRef<WebSocket | null>(null);
    const reconnectInterval = useRef<number | null>(null);

    const WS_URL = 'ws://localhost:3000';

    const connectWebSocket = () => {
        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
            console.log("WebSocket is already open or connecting.");
            return;
        }

        ws.current = new WebSocket(WS_URL);
        setConnectionStatus('reconnecting');
        console.log('Attempting to connect to WebSocket...');

        ws.current.onopen = () => {
            console.log('WebSocket connected!');
            setConnectionStatus('connected');
            if (reconnectInterval.current) {
                clearInterval(reconnectInterval.current);
                reconnectInterval.current = null;
            }
        };

        ws.current.onmessage = (event) => {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('Message from server:', message);

            switch (message.type) {
                case 'visitor_update':
                    setActiveVisitors(message.data.stats.totalActive);
                    setTotalVisitorsToday(message.data.stats.totalToday);
                    setPagesVisited(message.data.stats.pagesVisited);
                    setVisitorFeed(prev => [message.data.event, ...prev].slice(0, 50)); // Limit feed to 50
                    break;
                case 'user_connected':
                case 'user_disconnected':
                    setConnectedDashboardsCount(message.data.totalDashboards);
                    break;
                case 'session_activity':
                    setActiveSessions(prev => {
                        const newMap = new Map(prev);
                        newMap.set(message.data.sessionId, message.data);
                        return newMap;
                    });
                    break;
                case 'alert':
                    alert(`Alert (${message.data.level}): ${message.data.message}`);
                    break;
                case 'detailed_stats_response':
                    console.log('Detailed stats response:', message.data);
                    break;
                default:
                    console.warn('Unknown message type:', message.type);
            }
        };

        ws.current.onclose = () => {
            console.log('WebSocket disconnected.');
            setConnectionStatus('disconnected');
            if (!reconnectInterval.current) {
                reconnectInterval.current = setInterval(connectWebSocket, 3000); // Reconnect every 3 seconds
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setConnectionStatus('disconnected');
            ws.current?.close(); 
        };
    };

    useEffect(() => {
        connectWebSocket();


        // cleanup
        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (reconnectInterval.current) {
                clearInterval(reconnectInterval.current);
            }
        };
    }, []);

    const handleApplyFilter = () => {
        const country = (document.getElementById('filterCountry') as HTMLInputElement).value.trim();
        const page = (document.getElementById('filterPage') as HTMLInputElement).value.trim();

        const filter: { country?: string; page?: string } = {};
        if (country) filter.country = country;
        if (page) filter.page = page;

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'request_detailed_stats',
                filter: filter
            }));
            ws.current.send(JSON.stringify({
                type: 'track_dashboard_action',
                action: 'filter_applied',
                details: { filterType: Object.keys(filter).join(', '), value: Object.values(filter).join(', ') }
            }));
            console.log('Sent request_detailed_stats and track_dashboard_action');
        } else {
            console.warn('WebSocket not connected. Cannot apply filter.');
        }
    };

    const handleResetStats = () => {
        if (confirm('Are you sure you want to clear client-side statistics display? This does NOT affect server stats.')) {
            setActiveVisitors(0);
            setTotalVisitorsToday(0);
            setPagesVisited({});
            setVisitorFeed([]);
            setActiveSessions(new Map());
            setConnectedDashboardsCount(1);
            console.log('Client-side stats cleared.');
        }
    };

    const toggleSessionJourney = (sessionId: string) => {
        const element = document.getElementById(`session-journey-${sessionId}`);
        if (element) {
            element.classList.toggle('hidden'); 
        }
    };

    return (
        <div className="font-sans p-5 bg-gray-50 text-gray-800 leading-relaxed">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg my-5">
                <h1 className="text-3xl font-bold text-blue-700 border-b-2 border-gray-200 pb-3 mb-5">Live Visitor Analytics</h1>

                <div className="text-center text-lg mb-5 p-3 bg-gray-100 rounded-md text-gray-700">
                    <span className={`font-bold ${connectionStatus === 'connected' ? 'text-green-600' : connectionStatus === 'disconnected' ? 'text-red-600' : 'text-orange-500'}`}>
                        {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                    </span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span>Dashboards Connected: <span className="font-bold" id="connectedDashboardsCount">{connectedDashboardsCount}</span></span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <div className="bg-blue-50 p-5 rounded-lg shadow-sm text-center">
                        <h3 className="text-xl font-semibold text-blue-600 mb-4 border-b-0 pb-0">Active Visitors</h3>
                        <p className="text-5xl font-bold text-gray-800">{activeVisitors}</p>
                    </div>
                    <div className="bg-blue-50 p-5 rounded-lg shadow-sm text-center">
                        <h3 className="text-xl font-semibold text-blue-600 mb-4 border-b-0 pb-0">Total Visitors Today</h3>
                        <p className="text-5xl font-bold text-gray-800">{totalVisitorsToday}</p>
                    </div>
                    <div className="bg-blue-50 p-5 rounded-lg shadow-sm text-center">
                        <h3 className="text-xl font-semibold text-blue-600 mb-4 border-b-0 pb-0">Pages Visited</h3>
                        <ul className="list-none p-0 text-left max-h-40 overflow-y-auto mt-4">
                            {Object.entries(pagesVisited)
                                .sort(([, countA], [, countB]) => countB - countA)
                                .map(([page, count]) => (
                                    <li key={page} className="bg-blue-100 p-2 mb-1 rounded-md border border-blue-200 text-sm flex justify-between items-center">
                                        <span>{page}</span>
                                        <span className="font-semibold">{count}</span>
                                    </li>
                                ))}
                        </ul>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-blue-700 border-b-2 border-gray-200 pb-3 mb-5">Live Visitor Feed</h2>
                <div className="live-feed">
                    <ul className="list-none p-0 max-h-72 overflow-y-auto border border-gray-300 rounded-md bg-white">
                        {visitorFeed.map((event, index) => (
                            <li key={`${event.sessionId}-${event.timestamp}-${index}`} className="p-3 border-b border-gray-200 text-sm flex justify-between items-center last:border-b-0 even:bg-gray-50">
                                <div>
                                    <strong className="text-gray-900">{event.sessionId}</strong> - <span className="font-medium text-purple-600">{event.type}</span>
                                    <br />
                                    <span className="text-gray-600">
                                        {event.type === 'pageview' && `Page: ${event.page}`}
                                        {event.type === 'click' && `Click on: ${event.metadata?.element || 'N/A'}`}
                                        {event.type === 'session_end' && `Session Ended`}
                                        {` (${event.country || 'N/A'})`}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <h2 className="text-2xl font-bold text-blue-700 border-b-2 border-gray-200 pb-3 my-5">Active Sessions</h2>
                <div className="active-sessions">
                    <ul className="list-none p-0 max-h-72 overflow-y-auto border border-gray-300 rounded-md bg-white">
                        {Array.from(activeSessions.values()).map(session => (
                            <li key={session.sessionId} className="p-3 border-b border-gray-200 text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center last:border-b-0 even:bg-gray-50">
                                <div className="flex-grow">
                                    <strong className="text-gray-900">Session ID: {session.sessionId}</strong>
                                    <p className="text-gray-700">Current Page: <span className="font-semibold">{session.currentPage || 'N/A'}</span></p>
                                    <p className="text-gray-700">Duration: <span className="font-semibold">{Math.round(session.duration || 0)}</span>s</p>
                                    <div id={`session-journey-${session.sessionId}`} className="session-journey mt-2 pl-5 text-gray-500 italic hidden">
                                        <p>Journey: <span className="font-normal text-gray-600">{(session.journey || []).join(' > ')}</span></p>
                                    </div>
                                </div>
                                <button
                                    className="mt-2 sm:mt-0 bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md text-xs transition-colors duration-200"
                                    onClick={() => toggleSessionJourney(session.sessionId)}
                                >
                                    {/* Dynamically set button text based on visibility */}
                                    {document.getElementById(`session-journey-${session.sessionId}`)?.classList.contains('hidden') ? 'Show Journey' : 'Hide Journey'}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <h2 className="text-2xl font-bold text-blue-700 border-b-2 border-gray-200 pb-3 my-5">Interactive Features</h2>
                <div className="interactive-controls p-5 bg-green-50 rounded-lg border border-green-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="filterCountry" className="font-semibold text-green-800 block mb-1">Filter by Country:</label>
                            <input type="text" id="filterCountry" placeholder="e.g., India" className="p-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-400" />
                        </div>
                        <div>
                            <label htmlFor="filterPage" className="font-semibold text-green-800 block mb-1">Filter by Page:</label>
                            <input type="text" id="filterPage" placeholder="e.g., /products" className="p-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-400" />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            id="applyFilter"
                            onClick={handleApplyFilter}
                            className="bg-green-600 hover:bg-green-700 text-white py-2 px-5 rounded-md text-base transition-colors duration-200 flex-grow sm:flex-grow-0"
                        >
                            Apply Filter
                        </button>
                        <button
                            id="resetStats"
                            onClick={handleResetStats}
                            className="bg-red-500 hover:bg-red-600 text-gray-900 py-2 px-5 rounded-md text-base transition-colors duration-200 flex-grow sm:flex-grow-0"
                        >
                            Clear/Reset Statistics 
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;