const demo = require("../contracts/demo");

describe("demo contract", () => {
  it("should increment counter by input.inc", () => {
    const result = demo({ counter: 0 }, { inc: 3 });
    expect(result).to.have.property("counter", 3);
  });
});
