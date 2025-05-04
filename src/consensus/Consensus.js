class ConsensusManager {
  constructor() {
    /* config, committees */
  }
  onNewTx(node, tx) {
    /* enqueue for local PBFT */
  }
  async runAll(root) {
    /* traverse fractal, run PBFT per node */ return [];
  }
  propagate(results, root) {
    /* upward summary propagation */
  }
}
module.exports = ConsensusManager;
