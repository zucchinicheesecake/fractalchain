const express = require("express"),
  app = express();
const FractalChain = require("./FractalChainCore");
const FractalAddress = require("./FractalAddress");
const chain = new FractalChain();

app.use(express.json());
app.post("/tx", (req, res) => {
  const { id, payload } = req.body;
  const addr = FractalAddress.random(3);
  chain.submitTx(id, addr, payload);
  res.json({ status: "ok", addr });
});

app.listen(3001, () => console.log("FractalChain API on 3001"));

app.post("/contract", (req, res) => {
  const { code, input } = req.body;
  try {
    const SmartContract = require("./SmartContracts");
    const sc = new SmartContract(code);
    let result = sc.execute({}, input);
    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});
