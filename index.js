const express = require("express");
const app = express();
const { Server } = require("ws");
const server = app.listen(3000, () => console.log("FractalChain node on 3000"));
new Server({ server });
