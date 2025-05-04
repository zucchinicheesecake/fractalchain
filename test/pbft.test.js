const PBFTCluster = require("./PBFTNode");
const cluster = new PBFTCluster();

const tx = { id: "tx999", data: { amount: 999 } };
const results = cluster.broadcast(tx);
console.log("Consensus Results:", results);
