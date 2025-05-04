const FractalNode = require("./FractalNode");
const FractalAddress = require("./FractalAddress");
class FractalChainCore {
  constructor() {
    this.root = new FractalNode();
  }
  submitTx(id, addr, payload) {
    this.root.insert(addr, { id, payload });
  }
}
module.exports = FractalChainCore;
