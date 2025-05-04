const FractalChain = require("./FractalChainCore");
const FractalAddress = require("./FractalAddress");
const chain = new FractalChain();

for (let i = 0; i < 10; i++) {
  const addr = FractalAddress.random(3);
  chain.submitTx("tx" + i, addr, { amount: i * 10 });
  console.log("Submitted tx to:", addr);
}
