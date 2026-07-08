const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(process.env.PORT || 3000, () => console.log('Server running'));
const wss = new WebSocketServer({ server });
const rooms = new Map();

wss.on('connection', (ws) => {
  let currentRoom = null;
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'create') {
      const id = Math.random().toString(36).substr(2, 6);
      rooms.set(id, { password: msg.password, clients: new Set([ws]) });
      currentRoom = id;
      ws.send(JSON.stringify({ type: 'joined', id }));
    } else if (msg.type === 'join') {
      const room = rooms.get(msg.id);
      if (room && room.password === msg.password) {
        room.clients.add(ws);
        currentRoom = msg.id;
        ws.send(JSON.stringify({ type: 'joined', id: msg.id }));
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Auth Failed' }));
      }
    } else if (msg.type === 'chat' && currentRoom) {
      rooms.get(currentRoom).clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: msg.text })));
    }
  });
  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).clients.delete(ws);
      if (rooms.get(currentRoom).clients.size === 0) rooms.delete(currentRoom);
    }
  });
});