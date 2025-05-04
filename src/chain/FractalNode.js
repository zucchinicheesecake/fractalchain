class FractalNode {
  constructor(address = "", level = 0, parent = null) {
    this.address = address;
    this.level = level;
    this.parent = parent;
    this.children = [null, null, null];
    this.data = [];
  }
  getNode(path) {
    let node = this;
    for (let d of path) {
      const i = +d;
      if (!node.children[i])
        node.children[i] = new FractalNode(
          node.address + d,
          node.level + 1,
          node,
        );
      node = node.children[i];
    }
    return node;
  }
  insert(path, tx) {
    this.getNode(path).data.push(tx);
  }
}
module.exports = FractalNode;
