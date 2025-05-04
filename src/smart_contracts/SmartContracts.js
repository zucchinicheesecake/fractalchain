class SmartContract {
  constructor(fn) {
    this.fn = fn;
  }
  execute(s, i) {
    return this.fn(s, i);
  }
}
module.exports = SmartContract;
