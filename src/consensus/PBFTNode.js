class PBFTNode {
  constructor(id) {
    this.id = id;
    this.state = "idle";
    this.log = [];
  }

  receive(tx) {
    this.log.push(tx);
    this.state = "prepared";
    return { node: this.id, decision: "commit", tx };
  }
}

class PBFTCluster {
  constructor(size = 4) {
    this.nodes = Array.from({ length: size }, (_, i) => new PBFTNode("N" + i));
  }

  broadcast(tx) {
    return this.nodes.map((node) => node.receive(tx));
  }
}

module.exports = PBFTCluster;
