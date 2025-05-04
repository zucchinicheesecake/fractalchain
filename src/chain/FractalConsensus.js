const PBFTCluster = require("./PBFTNode");
class FractalConsensus {
  constructor(root) {
    this.root = root;
  }

  traverseAndRun(node = this.root) {
    if (!node) return [];
    const cluster = new PBFTCluster();
    const results = node.data.map((tx) => cluster.broadcast(tx));
    const flattened = [].concat(...results);
    for (const child of node.children) {
      if (child) flattened.push(...this.traverseAndRun(child));
    }
    return flattened;
  }
}
module.exports = FractalConsensus;
