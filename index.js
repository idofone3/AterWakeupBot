const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bot = require('./bot');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve dashboard
app.use(express.static('public'));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Dashboard connected');
  
  // Send initial bot status
  socket.emit('bot-status', bot.getStatus());
  
  // Handle dashboard commands
  socket.on('command', (cmd) => {
    if (cmd === 'reconnect') bot.reconnect();
    if (cmd === 'toggle-movement') bot.toggleMovement();
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  bot.start(io); // Start the bot with socket.io instance
});
