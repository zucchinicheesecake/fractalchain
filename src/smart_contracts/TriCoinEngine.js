const TriCoin = require("./TriCoin");

class TriCoinEngine {
  constructor() {
    this.economy = new TriCoin();
  }

  process(results) {
    for (const res of results) {
      if (res.decision === "commit") {
        const { id, payload } = res.tx;
        const fee = this.calculateFee(payload);
        this.economy.chargeFee(id, fee);
      }
    }
    this.economy.distributeRewards(results);
  }

  calculateFee(payload) {
    return Math.ceil(Math.random() * 5); // Placeholder: inject fractal distance logic here later
  }
}

module.exports = TriCoinEngine;
