const FractalChain = require("./FractalChainCore");
const FractalAddress = require("./FractalAddress");
const FractalConsensus = require("./FractalConsensus");

const chain = new FractalChain();
for (let i = 0; i < 5; i++) {
  const addr = FractalAddress.random(3);
  chain.submitTx("tx" + i, addr, { amount: i * 100 });
}

const engine = new FractalConsensus(chain.root);
const results = engine.traverseAndRun();
console.log("Fractal Consensus Results:", results);
