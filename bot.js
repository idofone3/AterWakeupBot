const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder');

let botInstance = null;
let io = null;
let movementInterval = null;
let isMoving = true;

const config = {
  host: 'FuckAternos-toyz.aternos.me',
  port: 37786,
  username: 'AFKBot',
  version: '1.20.1'
};

const status = {
  connected: false,
  position: { x: 0, y: 0, z: 0 },
  health: 20,
  food: 20,
  gameMode: 'unknown',
  lastMovement: 'Never',
  movementCount: 0,
  uptime: '0s'
};

function createBot() {
  const bot = mineflayer.createBot(config);
  
  // Load pathfinder plugin
  bot.loadPlugin(pathfinder);
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  bot.pathfinder.setMovements(movements);

  bot.on('login', () => {
    console.log('Logged in to Minecraft server');
    status.connected = true;
    status.gameMode = 'creative';
    updateDashboard();
    
    // Set to creative mode
    bot.chat('/gamemode creative');
    
    // Start movement loop
    startMovement(bot);
  });

  bot.on('spawn', () => {
    status.position = bot.entity.position;
    updateDashboard();
  });

  bot.on('health', () => {
    status.health = bot.health;
    status.food = bot.food;
    updateDashboard();
  });

  bot.on('position', () => {
    status.position = bot.entity.position;
    updateDashboard();
  });

  bot.on('end', (reason) => {
    console.log('Disconnected:', reason);
    status.connected = false;
    clearInterval(movementInterval);
    updateDashboard();
    setTimeout(createBot, 10000); // Reconnect after 10s
  });

  bot.on('error', (err) => {
    console.error('Bot error:', err);
    status.connected = false;
    updateDashboard();
  });

  return bot;
}

function startMovement(bot) {
  const positions = [
    { x: 0, y: 70, z: 0 },
    { x: 5, y: 70, z: 0 },
    { x: 0, y: 70, z: 5 },
    { x: -5, y: 70, z: 0 },
    { x: 0, y: 70, z: -5 }
  ];
  
  let currentIndex = 0;
  
  movementInterval = setInterval(() => {
    if (!isMoving || !bot.entity) return;
    
    const target = positions[currentIndex];
    currentIndex = (currentIndex + 1) % positions.length;
    
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, 1));
    status.lastMovement = new Date().toLocaleTimeString();
    status.movementCount++;
    status.position = bot.entity.position;
    
    // Random actions
    if (Math.random() > 0.7) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }
    
    updateDashboard();
  }, 10000); // Move every 10 seconds
}

function updateDashboard() {
  if (io) {
    status.uptime = process.uptime().toFixed(0) + 's';
    io.emit('bot-status', status);
  }
}

module.exports = {
  start: (socketIO) => {
    io = socketIO;
    botInstance = createBot();
  },
  reconnect: () => {
    if (botInstance) botInstance.quit();
    botInstance = createBot();
  },
  toggleMovement: () => {
    isMoving = !isMoving;
    updateDashboard();
  },
  getStatus: () => status
};
