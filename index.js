const mineflayer = require('mineflayer');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Configuration
const SERVER_PORT = process.env.PORT || 3000;
const MC_CONFIG = {
    host: 'FuckAternos-toyz.aternos.me',
    port: 37786,
    username: 'AFKBot',
    version: '1.20.4',
    auth: 'offline'
};

// Create bot
let bot = null;
let botStatus = {
    online: false,
    position: { x: 0, y: 0, z: 0 },
    health: 20,
    food: 20,
    gameMode: 'unknown',
    server: `${MC_CONFIG.host}:${MC_CONFIG.port}`,
    lastMovement: 'Never',
    uptime: '0s'
};

// Create Express server
app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

// Start HTTP server
http.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log(`Dashboard running on http://0.0.0.0:${SERVER_PORT}`);
    startBot();
});

// Bot initialization
function startBot() {
    bot = mineflayer.createBot(MC_CONFIG);
    
    bot.on('login', () => {
        botStatus.online = true;
        bot.chat('/gamemode creative'); // Set to creative mode
        updateDashboard();
        startMovement();
        startUptimeCounter();
    });
    
    bot.on('spawn', () => {
        botStatus.position = bot.entity.position;
        updateDashboard();
    });
    
    bot.on('health', () => {
        botStatus.health = bot.health;
        botStatus.food = bot.food;
        updateDashboard();
    });
    
    bot.on('game', (gamemode) => {
        botStatus.gameMode = gamemode;
        updateDashboard();
    });
    
    bot.on('position', () => {
        botStatus.position = bot.entity.position;
        updateDashboard();
    });
    
    bot.on('end', () => {
        botStatus.online = false;
        updateDashboard();
        setTimeout(startBot, 10000); // Reconnect after 10 seconds
    });
    
    bot.on('error', (err) => {
        console.error('Bot error:', err);
        botStatus.online = false;
        updateDashboard();
        setTimeout(startBot, 30000); // Reconnect after 30 seconds
    });
    
    bot.on('kicked', (reason) => {
        console.log('Kicked:', reason);
        botStatus.online = false;
        updateDashboard();
        setTimeout(startBot, 60000); // Reconnect after 1 minute
    });
}

// Movement system
function startMovement() {
    const positions = [
        { x: 0, y: 70, z: 0 },
        { x: 5, y: 70, z: 0 },
        { x: 0, y: 70, z: 5 },
        { x: -5, y: 70, z: 0 },
        { x: 0, y: 70, z: -5 }
    ];
    
    let currentIndex = 0;
    
    setInterval(() => {
        if (!bot || !bot.entity) return;
        
        const target = positions[currentIndex];
        currentIndex = (currentIndex + 1) % positions.length;
        
        // Move towards target
        bot.lookAt(target);
        bot.setControlState('forward', true);
        
        setTimeout(() => {
            if (bot) bot.setControlState('forward', false);
        }, 1000);
        
        // Record movement time
        botStatus.lastMovement = new Date().toLocaleTimeString();
        updateDashboard();
    }, 15000); // Move every 15 seconds
}

// Uptime counter
function startUptimeCounter() {
    const startTime = Date.now();
    
    setInterval(() => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        botStatus.uptime = `${hours}h ${minutes}m ${secs}s`;
        updateDashboard();
    }, 1000);
}

// Update dashboard via Socket.io
function updateDashboard() {
    if (bot && bot.entity) {
        botStatus.position = {
            x: Math.round(bot.entity.position.x),
            y: Math.round(bot.entity.position.y),
            z: Math.round(bot.entity.position.z)
        };
    }
    
    io.emit('bot-status', botStatus);
}

// Socket.io connection
io.on('connection', (socket) => {
    socket.emit('bot-status', botStatus);
    console.log('Dashboard client connected');
});

// Handle shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    if (bot) bot.quit();
    process.exit();
});
