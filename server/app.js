import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import analyticsRoutes from './routes/analyticsRoutes.js';
import { handleWebSocket } from './sockets/wsHandler.js';

const app = express();
const PORT = 3000;
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

app.get('/', (_, res) => {
  res.send('Visitor Analytics System API is running...');
});

app.use('/api', analyticsRoutes(wss));
handleWebSocket(wss);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket running on ws://localhost:${PORT}`);
});
