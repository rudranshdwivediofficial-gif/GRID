const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
app.use(express.static('public'));

const server = app.listen(process.env.PORT || 3000);
const wss = new WebSocketServer({ server });

const rooms = new Map(); // { roomId: { password, clients: Set() } }

wss.on('connection', (ws) => {
  let currentRoom = null;

  ws.on('message', (data) => {
    const msg = JSON.parse(data);

    if (msg.type === 'create') {
      const id = Math.random().toString(36).substr(2, 9);
      rooms.set(id, { password: msg.password, clients: new Set([ws]) });
      currentRoom = id;
      ws.send(JSON.stringify({ type: 'joined', id }));
    }

    if (msg.type === 'join') {
      const room = rooms.get(msg.id);
      if (room && room.password === msg.password) {
        room.clients.add(ws);
        currentRoom = msg.id;
        ws.send(JSON.stringify({ type: 'joined', id: msg.id }));
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid Room or Password' }));
      }
    }

    if (msg.type === 'chat') {
      rooms.get(currentRoom).clients.forEach(client => {
        if (client.readyState === 1) client.send(JSON.stringify({ type: 'chat', text: msg.text }));
      });
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      room.clients.delete(ws);
      if (room.clients.size === 0) rooms.delete(currentRoom);
    }
  });
});