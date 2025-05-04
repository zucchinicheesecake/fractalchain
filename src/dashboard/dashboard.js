const blessed = require("blessed");
const contrib = require("blessed-contrib");
const { execSync } = require("child_process");

const screen = blessed.screen();
const grid = new contrib.grid({ rows: 12, cols: 12, screen });

const log = grid.set(0, 0, 6, 12, contrib.log, {
  fg: "green",
  selectedFg: "green",
  label: "FractalChain Node Activity",
});

const line = grid.set(6, 0, 6, 12, contrib.line, {
  showLegend: true,
  label: "Transaction Throughput",
  minY: 0,
});

let txCount = 0;
let times = [];
let txs = [];

setInterval(() => {
  const txsThisTick = Math.floor(Math.random() * 5);
  txCount += txsThisTick;
  log.log(`+${txsThisTick} TXs received`);

  if (times.length > 30) {
    times.shift();
    txs.shift();
  }
  const t = new Date().toLocaleTimeString();
  times.push(t);
  txs.push(txCount);

  line.setData([{ title: "TXs", x: times, y: txs }]);
  screen.render();
}, 2000);

screen.key(["escape", "q", "C-c"], () => process.exit(0));
