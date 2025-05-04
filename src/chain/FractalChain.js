const SmartContract = require("./SmartContracts");
const fs = require("fs");
class FractalChain {
  constructor() {
    this.state = {};
    this.contracts = {};
    this.txPool = [];
  }
  registerContract(name, path) {
    const contractFn = require(path);
    this.contracts[name] = new SmartContract(contractFn);
  }
  submitTransaction(tx) {
    this.txPool.push(tx);
  }
  runConsensus() {
    const committed = [];
    for (const tx of this.txPool) {
      const contract = this.contracts[tx.contract];
      if (contract) {
        this.state[tx.contract] = contract.execute(
          this.state[tx.contract] || {},
          tx.input,
        );
        committed.push({ tx, decision: "commit" });
      } else {
        committed.push({ tx, decision: "reject", reason: "Unknown contract" });
      }
    }
    this.txPool = [];
    return committed;
  }
  getState() {
    return this.state;
  }
}
module.exports = new FractalChain();
