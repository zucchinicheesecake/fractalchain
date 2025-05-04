const blessed = require('blessed');
const contrib = require('blessed-contrib');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const moment = require('moment');

// Configuration
const CONFIG = {
  refreshRate: 250,         // UI refresh rate in ms
  logMaxEntries: 20,        // Max log entries to show
  historyPoints: 30,        // Data points in history charts
  fractalMaxDepth: 18,      // Maximum fractal depth
  colors: {
    primary: 'green',
    secondary: 'cyan',
    accent: 'yellow',
    warning: 'red',
    text: 'white',
    border: 'blue',
    heading: 'bold',
    success: 'green',
    error: 'red'
  }
};

// State management
const STATE = {
  blocksMined: 0,
  hashCount: 0,
  hashRate: 0,
  lastHashRate: 0,
  avgHashRate: 0,
  peakHashRate: 0,
  lastBlockTime: Date.now(),
  startTime: Date.now(),
  difficulty: process.env.DIFFICULTY || 5,
  chainLength: 0,
  logs: [],
  hashRateHistory: Array(CONFIG.historyPoints).fill(0),
  blockTimeHistory: Array(CONFIG.historyPoints).fill(0),
  errors: 0,
  minerStatus: 'starting',
  systemLoad: 0,
  memoryUsage: 0,
  cpuTemp: 0,
  pendingTransactions: 0
};

// Advanced fractal generators
const fractalGenerators = {
  sierpinski: (depth, width) => {
    const lines = [];
    for (let y = 0; y < depth; y++) {
      let line = '';
      for (let x = 0; x < width; x++) {
        line += ((x & y) === 0) ? '▲' : ' ';
      }
      lines.push(line);
    }
    return lines.join('\n');
  },
  
  mandelbrot: (depth, width) => {
    const lines = [];
    const maxIterations = 30;
    const centerX = -0.5;
    const centerY = 0;
    const zoomLevel = 3.5 / Math.max(1, Math.log2(1 + STATE.blocksMined / 10));
    
    for (let y = 0; y < depth; y++) {
      let line = '';
      for (let x = 0; x < width; x++) {
        const realComponent = centerX + (x - width / 2) * zoomLevel / width;
        const imaginaryComponent = centerY + (y - depth / 2) * zoomLevel / depth;
        
        let realPart = 0;
        let imaginaryPart = 0;
        let iteration = 0;
        
        while (realPart * realPart + imaginaryPart * imaginaryPart < 4 && iteration < maxIterations) {
          const temp = realPart * realPart - imaginaryPart * imaginaryPart + realComponent;
          imaginaryPart = 2 * realPart * imaginaryPart + imaginaryComponent;
          realPart = temp;
          iteration++;
        }
        
        if (iteration === maxIterations) {
          line += '■';
        } else {
          const symbols = ' .:;+=xX$&#@';
          const index = Math.floor(iteration / maxIterations * symbols.length);
          line += symbols[index] || ' ';
        }
      }
      lines.push(line);
    }
    return lines.join('\n');
  },
  
  julia: (depth, width) => {
    const lines = [];
    const maxIterations = 20;
    // Parameters that change slightly based on blocks mined
    const angle = (STATE.blocksMined % 360) * Math.PI / 180;
    const c_real = 0.7885 * Math.cos(angle);
    const c_imag = 0.7885 * Math.sin(angle);
    
    for (let y = 0; y < depth; y++) {
      let line = '';
      for (let x = 0; x < width; x++) {
        let real = (x - width / 2) * 3.0 / width;
        let imag = (y - depth / 2) * 3.0 / depth;
        
        let iteration = 0;
        while (real * real + imag * imag < 4 && iteration < maxIterations) {
          const real_temp = real * real - imag * imag + c_real;
          imag = 2 * real * imag + c_imag;
          real = real_temp;
          iteration++;
        }
        
        if (iteration === maxIterations) {
          line += '@';
        } else {
          const symbols = ' .:;+=xX$&#';
          const index = Math.floor(iteration / maxIterations * symbols.length);
          line += symbols[index] || ' ';
        }
      }
      lines.push(line);
    }
    return lines.join('\n');
  },
  
  // Dynamic fractal selector based on blocks mined
  current() {
    const fractals = [this.sierpinski, this.mandelbrot, this.julia];
    const index = STATE.blocksMined % fractals.length;
    const fractal = fractals[index];
    
    // Dynamically adjust depth based on blocks mined
    const baseDepth = 8;
    const maxDepth = CONFIG.fractalMaxDepth;
    let depth = baseDepth + Math.min(maxDepth - baseDepth, Math.floor(Math.log2(1 + STATE.blocksMined)));
    
    // Adjust width for different fractals
    const width = index === 0 ? depth * 2 : depth * 2.5;
    
    return fractal(depth, width);
  }
};

// Calculate chain stats
function updateChainStats() {
  try {
    if (fs.existsSync('fractal_chain.json')) {
      const chainData = JSON.parse(fs.readFileSync('fractal_chain.json'));
      STATE.chainLength = chainData.length;
      
      // Extract more useful stats if available
      if (chainData.length > 0) {
        const latestBlock = chainData[chainData.length - 1];
        STATE.lastBlockHash = latestBlock.hash ? latestBlock.hash.substring(0, 10) + '...' : 'N/A';
        
        // Count pending transactions if the chain has transaction data
        if (fs.existsSync('mempool.json')) {
          try {
            const mempool = JSON.parse(fs.readFileSync('mempool.json'));
            STATE.pendingTransactions = Array.isArray(mempool) ? mempool.length : 0;
          } catch (e) {
            STATE.pendingTransactions = 0;
          }
        }
      }
    } else {
      STATE.chainLength = 0;
    }
  } catch (err) {
    addLog(`Error reading chain: ${err.message}`, 'error');
    STATE.errors++;
  }
}

// System stats monitoring
function updateSystemStats() {
  // CPU Load
  STATE.systemLoad = os.loadavg()[0].toFixed(2);
  
  // Memory usage
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  STATE.memoryUsage = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
  
  // Try to get CPU temperature on Linux systems
  try {
    if (os.platform() === 'linux' && fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
      const temp = parseInt(fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8')) / 1000;
      STATE.cpuTemp = temp.toFixed(1);
    }
  } catch (e) {
    STATE.cpuTemp = 'N/A';
  }
}

// Logger function
function addLog(message, type = 'info') {
  const timestamp = moment().format('HH:mm:ss');
  const logEntry = {
    timestamp,
    message,
    type
  };
  
  STATE.logs.unshift(logEntry);
  
  // Trim log to max size
  if (STATE.logs.length > CONFIG.logMaxEntries) {
    STATE.logs.pop();
  }
}

// Update hash rate history
function updateHashRateHistory() {
  STATE.hashRateHistory.shift();
  STATE.hashRateHistory.push(STATE.hashRate);
  
  STATE.blockTimeHistory.shift();
  const lastBlockTime = STATE.blockTimeHistory[STATE.blockTimeHistory.length - 1] || 0;
  STATE.blockTimeHistory.push(lastBlockTime);
}

// Format time from milliseconds to readable format
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

// Calculate mining profitability (example function)
function calculateProfitability() {
  // This is a simplified example - you would implement your actual economics here
  const difficulty = parseInt(STATE.difficulty);
  const hashRate = STATE.avgHashRate;
  
  if (hashRate <= 0) return '...calculating...';
  
  // Example formula: profitability = hashRate / (2^difficulty) * rewardPerBlock
  const rewardPerBlock = 50; // Example reward
  const probabilityPerHash = 1 / Math.pow(2, difficulty);
  const blocksPerSecond = hashRate * probabilityPerHash;
  const rewardPerHour = blocksPerSecond * rewardPerBlock * 3600;
  
  return rewardPerHour.toFixed(4) + ' coins/hour';
}

// Initialize the blessed screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Advanced Fractal Mining Dashboard',
  cursor: {
    artificial: true,
    shape: 'line',
    blink: true,
    color: 'cyan'
  }
});

// Create layout grid
const grid = new contrib.grid({
  rows: 12,
  cols: 12,
  screen: screen
});

// Create widgets
const fractalBox = grid.set(0, 0, 6, 6, blessed.box, {
  label: ' {bold}Fractal Visualization{/bold} ',
  tags: true,
  border: { type: 'line', fg: CONFIG.colors.border },
  style: {
    fg: CONFIG.colors.primary,
    border: { fg: CONFIG.colors.border },
  },
  shadow: true
});

const statsBox = grid.set(0, 6, 3, 6, blessed.box, {
  label: ' {bold}Mining Statistics{/bold} ',
  tags: true,
  border: { type: 'line', fg: CONFIG.colors.border },
  style: {
    fg: CONFIG.colors.text,
    border: { fg: CONFIG.colors.border },
  },
  shadow: true,
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  vi: true
});

const hashRateChart = grid.set(3, 6, 3, 6, contrib.line, {
  label: ' {bold}Hash Rate History{/bold} ',
  showLegend: false,
  xPadding: 5,
  xLabelPadding: 3,
  wholeNumbersOnly: true,
  style: {
    line: CONFIG.colors.secondary,
    text: CONFIG.colors.text,
    baseline: CONFIG.colors.border,
    fg: CONFIG.colors.text,
    border: { fg: CONFIG.colors.border }
  },
  border: { type: 'line', fg: CONFIG.colors.border },
});

const logBox = grid.set(6, 0, 6, 6, contrib.log, {
  label: ' {bold}Mining Log{/bold} ',
  tags: true,
  border: { type: 'line', fg: CONFIG.colors.border },
  style: {
    fg: CONFIG.colors.text,
    border: { fg: CONFIG.colors.border },
  },
  shadow: true,
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: ' ',
    style: { bg: CONFIG.colors.secondary }
  }
});

const systemStatsBox = grid.set(6, 6, 3, 6, blessed.box, {
  label: ' {bold}System Performance{/bold} ',
  tags: true,
  border: { type: 'line', fg: CONFIG.colors.border },
  style: {
    fg: CONFIG.colors.text,
    border: { fg: CONFIG.colors.border },
  },
  shadow: true
});

const chainStatsBox = grid.set(9, 6, 3, 6, blessed.box, {
  label: ' {bold}Blockchain Statistics{/bold} ',
  tags: true,
  border: { type: 'line', fg: CONFIG.colors.border },
  style: {
    fg: CONFIG.colors.text,
    border: { fg: CONFIG.colors.border },
  },
  shadow: true
});

// Create donut chart for memory usage
const memoryDonut = grid.set(6, 6, 3, 3, contrib.donut, {
  label: 'Memory Usage',
  radius: 8,
  arcWidth: 3,
  remainColor: 'black',
  yPadding: 2,
  data: [
    { percent: 0, label: 'Used', color: CONFIG.colors.accent }
  ]
});

// Create a gauge for system load
const loadGauge = grid.set(6, 9, 3, 3, contrib.gauge, {
  label: 'CPU Load',
  percent: [0],
  stroke: 'green',
  fill: 'white',
  style: {
    fg: CONFIG.colors.text,
    border: { fg: CONFIG.colors.border },
  }
});

// Add key handlers for interaction
screen.key(['escape', 'q', 'C-c'], () => {
  addLog('Shutting down dashboard...', 'warning');
  setTimeout(() => {
    if (miner) miner.kill();
    process.exit(0);
  }, 500);
});

// Function keys for different views
screen.key('f1', () => {
  addLog('Help: Press F1-F4 to switch views, q to quit', 'info');
});

screen.key('f2', () => {
  // Example of changing visualization mode
  STATE.visMode = (STATE.visMode || 0) + 1;
  if (STATE.visMode > 2) STATE.visMode = 0;
  addLog(`Visualization mode changed to ${STATE.visMode}`, 'info');
});

// Spawn the miner process
let miner;
try {
  addLog('Starting miner process...', 'info');
  miner = spawn('node', ['miner.js']);
  STATE.minerStatus = 'running';
} catch (err) {
  addLog(`Failed to start miner: ${err.message}`, 'error');
  STATE.minerStatus = 'error';
  STATE.errors++;
}

// Set up miner process event listeners
if (miner) {
  // Handle miner output
  miner.stdout.on('data', data => {
    const output = data.toString().trim();
    
    // Log all miner output
    if (output) {
      addLog(`Miner: ${output}`, 'info');
    }
    
    // Parse mined blocks
    if (/Block #(\d+) added/.test(output)) {
      const blockMatch = output.match(/Block #(\d+) added/);
      if (blockMatch && blockMatch[1]) {
        const blockNumber = parseInt(blockMatch[1]);
        const now = Date.now();
        const blockTime = now - STATE.lastBlockTime;
        
        STATE.blocksMined++;
        STATE.lastBlockTime = now;
        STATE.blockTimeHistory[STATE.blockTimeHistory.length - 1] = blockTime / 1000; // in seconds
        
        // Calculate hashrate from block time and difficulty
        STATE.lastHashRate = (Math.pow(2, STATE.difficulty) / (blockTime / 1000)).toFixed(2);
        
        // Update peak hash rate
        if (parseFloat(STATE.lastHashRate) > parseFloat(STATE.peakHashRate)) {
          STATE.peakHashRate = STATE.lastHashRate;
        }
        
        // Add special log for block found
        addLog(`🎉 Block #${blockNumber} mined in ${(blockTime / 1000).toFixed(1)}s at ${STATE.lastHashRate} H/s`, 'success');
        
        // Update chain stats after a new block
        updateChainStats();
      }
    }
    
    // Parse hash rate updates
    else if (/Hash rate: (\d+\.?\d*) H\/s/.test(output)) {
      const hashMatch = output.match(/Hash rate: (\d+\.?\d*) H\/s/);
      if (hashMatch && hashMatch[1]) {
        STATE.hashRate = parseFloat(hashMatch[1]).toFixed(2);
        STATE.hashCount += parseInt(STATE.hashRate);
        
        // Calculate average hash rate
        const runTime = (Date.now() - STATE.startTime) / 1000;
        STATE.avgHashRate = (STATE.hashCount / runTime).toFixed(2);
      }
    }
    
    // Parse difficulty changes
    else if (/Difficulty adjusted to (\d+)/.test(output)) {
      const diffMatch = output.match(/Difficulty adjusted to (\d+)/);
      if (diffMatch && diffMatch[1]) {
        STATE.difficulty = diffMatch[1];
        addLog(`Difficulty adjusted to ${STATE.difficulty}`, 'warning');
      }
    }
  });
  
  // Handle miner errors
  miner.stderr.on('data', data => {
    const error = data.toString().trim();
    addLog(`Miner error: ${error}`, 'error');
    STATE.errors++;
  });
  
  // Handle miner exit
  miner.on('close', code => {
    STATE.minerStatus = code === 0 ? 'stopped' : 'crashed';
    addLog(`Miner process exited with code ${code}`, code === 0 ? 'info' : 'error');
    if (code !== 0) STATE.errors++;
  });
}

// Main update loop
setInterval(() => {
  // Update system and chain stats
  updateSystemStats();
  updateChainStats();
  updateHashRateHistory();
  
  // Update fractal visualization
  fractalBox.setContent(fractalGenerators.current());
  
  // Update stats display
  const uptime = formatTime(Date.now() - STATE.startTime);
  const blockTime = formatTime(Date.now() - STATE.lastBlockTime);
  
  statsBox.setContent(
    `{${CONFIG.colors.heading}}Mining Status:{/${CONFIG.colors.heading}} ${STATE.minerStatus === 'running' ? '{green-fg}Active{/green-fg}' : '{red-fg}' + STATE.minerStatus + '{/red-fg}'}\n` +
    `{${CONFIG.colors.heading}}Uptime:{/${CONFIG.colors.heading}} ${uptime}\n` +
    `{${CONFIG.colors.heading}}Blocks Mined:{/${CONFIG.colors.heading}} ${STATE.blocksMined}\n` +
    `{${CONFIG.colors.heading}}Current Hash Rate:{/${CONFIG.colors.heading}} ${STATE.hashRate} H/s\n` +
    `{${CONFIG.colors.heading}}Average Hash Rate:{/${CONFIG.colors.heading}} ${STATE.avgHashRate} H/s\n` +
    `{${CONFIG.colors.heading}}Peak Hash Rate:{/${CONFIG.colors.heading}} ${STATE.peakHashRate} H/s\n` +
    `{${CONFIG.colors.heading}}Current Difficulty:{/${CONFIG.colors.heading}} ${STATE.difficulty}\n` +
    `{${CONFIG.colors.heading}}Time Since Last Block:{/${CONFIG.colors.heading}} ${blockTime}\n` +
    `{${CONFIG.colors.heading}}Estimated Profitability:{/${CONFIG.colors.heading}} ${calculateProfitability()}\n` +
    `{${CONFIG.colors.heading}}Total Hashes:{/${CONFIG.colors.heading}} ${STATE.hashCount.toLocaleString()}`
  );
  
  // Update chart data
  hashRateChart.setData({
    x: Array.from({ length: CONFIG.historyPoints }, (_, i) => (CONFIG.historyPoints - i).toString()),
    y: STATE.hashRateHistory
  });
  
  // Update system stats
  systemStatsBox.setContent(
    `{${CONFIG.colors.heading}}CPU Load:{/${CONFIG.colors.heading}} ${STATE.systemLoad}\n` +
    `{${CONFIG.colors.heading}}Memory Usage:{/${CONFIG.colors.heading}} ${STATE.memoryUsage}%\n` +
    `{${CONFIG.colors.heading}}CPU Temperature:{/${CONFIG.colors.heading}} ${STATE.cpuTemp !== 'N/A' ? STATE.cpuTemp + '°C' : STATE.cpuTemp}\n` +
    `{${CONFIG.colors.heading}}Platform:{/${CONFIG.colors.heading}} ${os.platform()} ${os.release()}\n` +
    `{${CONFIG.colors.heading}}Free Memory:{/${CONFIG.colors.heading}} ${Math.round(os.freemem() / 1024 / 1024)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB\n` +
    `{${CONFIG.colors.heading}}Errors:{/${CONFIG.colors.heading}} ${STATE.errors}`
  );
  
  // Update blockchain stats
  chainStatsBox.setContent(
    `{${CONFIG.colors.heading}}Chain Length:{/${CONFIG.colors.heading}} ${STATE.chainLength} blocks\n` +
    `{${CONFIG.colors.heading}}Last Block Hash:{/${CONFIG.colors.heading}} ${STATE.lastBlockHash || 'N/A'}\n` +
    `{${CONFIG.colors.heading}}Pending Transactions:{/${CONFIG.colors.heading}} ${STATE.pendingTransactions}\n` +
    `{${CONFIG.colors.heading}}Chain File Size:{/${CONFIG.colors.heading}} ${fs.existsSync('fractal_chain.json') ? (fs.statSync('fractal_chain.json').size / 1024).toFixed(2) + ' KB' : 'N/A'}\n` +
    `{${CONFIG.colors.heading}}Current Mode:{/${CONFIG.colors.heading}} ${['Sierpinski', 'Mandelbrot', 'Julia'][STATE.blocksMined % 3]}\n` +
    `{${CONFIG.colors.heading}}Press F1 for help, F2 to change view{/${CONFIG.colors.heading}}`
  );
  
  // Update memory donut
  memoryDonut.update([{ percent: parseInt(STATE.memoryUsage), label: 'Used', color: STATE.memoryUsage > 80 ? CONFIG.colors.warning : CONFIG.colors.accent }]);
  
  // Update load gauge - normalize system load to percentage (load of 1.0 = 100% on single core system)
  const cpuCount = os.cpus().length;
  const loadPercentage = Math.min(100, Math.round((STATE.systemLoad / cpuCount) * 100));
  let color = CONFIG.colors.success;
  if (loadPercentage > 60) color = CONFIG.colors.accent;
  if (loadPercentage > 85) color = CONFIG.colors.warning;
  
  loadGauge.setStack([{ percent: loadPercentage, stroke: color }]);
  
  // Render the screen
  screen.render();
}, CONFIG.refreshRate);

// Initial logging
addLog('Dashboard started', 'info');
addLog(`Miner difficulty set to ${STATE.difficulty}`, 'info');
addLog('System: ' + os.platform() + ' ' + os.release(), 'info');
addLog('Press F1 for help or q to quit', 'info');

// Initial render
screen.render();
