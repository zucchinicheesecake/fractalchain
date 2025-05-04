const SmartContract = require("./SmartContracts");
const demo = require("./contracts/demo");

class FractalChain {
  constructor() {
    this.state = {};
    this.contract = demo;
  }

  executeTransaction(input) {
    const sc = new SmartContract(this.contract.toString());
    const result = sc.execute(this.state, input);
    this.state = result;
    return result;
  }

  runConsensus() {
    const transactions = [
      { contract: "demo", input: { inc: 1 } },
      { contract: "demo", input: { inc: 3 } },
      { contract: "demo", input: { inc: 10 } },
    ];

    const results = transactions.map((tx) => {
      return {
        tx: tx,
        decision: "commit",
      };
    });

    return results;
  }
}

module.exports = new FractalChain();
