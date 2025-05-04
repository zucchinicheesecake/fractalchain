class FractalAddress {
  static random(depth) {
    let addr = "";
    for (let i = 0; i < depth; i++) addr += Math.floor(Math.random() * 3);
    return addr;
  }
  static shortestPath(a, b) {
    let i = 0,
      m = Math.min(a.length, b.length);
    while (i < m && a[i] === b[i]) i++;
    return { up: a.length - i, down: b.slice(i) };
  }
  static isParent(p, c) {
    return c.startsWith(p);
  }
}
module.exports = FractalAddress;
