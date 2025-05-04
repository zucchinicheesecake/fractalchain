const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const cluster = require('cluster');

// Configuration
const CHAIN_FILE = 'fractal_chain.json';
const DIFFICULTY = process.env.DIFFICULTY || 5; // Number of leading zeros
const MINING_REWARD = 50;
const ADJUSTMENT_INTERVAL = 10; // Blocks per difficulty adjustment
const TARGET_BLOCK_TIME = 60000; // 1 minute target per block

class MerkleTree {
  constructor(tx) { this.leaves = tx.map(t=>this.hash(JSON.stringify(t))); this.root=this.build(this.leaves); }
  hash(d){ return crypto.createHash('sha256').update(d).digest('hex'); }
  build(l){ if(l.length<2) return l[0]||''; let n=[]; for(let i=0;i<l.length;i+=2){ let a=l[i],b=l[i+1]||a; n.push(this.hash(a+b)); } return this.build(n);}
}

class FractalBlockchain {
  constructor(){
    this.chain=this.load();
    this.pending=[];
    this.isMining=false;
  }
  load(){
    if(fs.existsSync(CHAIN_FILE)){
      console.log('Loaded '+JSON.parse(fs.readFileSync(CHAIN_FILE)).length+' blocks');
      return JSON.parse(fs.readFileSync(CHAIN_FILE));
    }
    const g = {index:0,prevHash:'0'.repeat(64),timestamp:Date.now(),transactions:[{from:'GENESIS',to:'NETWORK',amount:0,data:'Genesis',timestamp:Date.now()}],nonce:0,difficulty:DIFFICULTY,hash:''};
    g.merkleRoot=new MerkleTree(g.transactions).root;
    g.hash=this.hashBlock(g);
    console.log('Created genesis block');
    return [g];
  }
  save(){ fs.writeFileSync(CHAIN_FILE,JSON.stringify(this.chain,null,2)); }
  hashBlock(b){
    const h = {i:b.index,p:b.prevHash,m:b.merkleRoot,t:b.timestamp,d:b.difficulty,n:b.nonce};
    return crypto.createHash('sha256').update(JSON.stringify(h)).digest('hex');
  }
  latest(){ return this.chain[this.chain.length-1]; }
  difficulty(){
    const last=this.latest();
    if(last.index%ADJUSTMENT_INTERVAL||last.index===0) return last.difficulty;
    const prev=this.chain[this.chain.length-ADJUSTMENT_INTERVAL];
    const expected=ADJUSTMENT_INTERVAL*TARGET_BLOCK_TIME, taken=last.timestamp-prev.timestamp;
    return taken<expected/2?last.difficulty+1: taken>expected*2?Math.max(1,last.difficulty-1): last.difficulty;
  }
  createBlock(){
    const last=this.latest();
    const txs=this.pending.slice(); // no verification here
    txs.push({from:'NETWORK',to:os.hostname(),amount:MINING_REWARD,data:'Reward',timestamp:Date.now()});
    const m=new MerkleTree(txs);
    return { index:last.index+1, prevHash:last.hash, timestamp:Date.now(), transactions:txs, merkleRoot:m.root, difficulty:this.difficulty(), nonce:0, hash:'' };
  }
  add(b){
    const h=this.hashBlock(b);
    if(!h.startsWith('0'.repeat(b.difficulty))) return false;
    b.hash=h; this.chain.push(b); this.pending=[]; this.save(); console.log('Block #'+b.index+' added'); return true;
  }
}

if(cluster.isPrimary||cluster.isMaster){
  const bc=new FractalBlockchain();
  const workers=os.cpus().length;
  console.log('Starting with '+workers+' workers');
  let active=0;
  for(let i=0;i<workers;i++){
    const w=cluster.fork();
    w.on('message',m=>{
      if(m.type==='MINED'){
        if(bc.add(m.block)){
          Object.values(cluster.workers).forEach(x=> x.id!==w.id && x.send({type:'STOP'}));
          setTimeout(start,1000);
        }
      }
    });
    w.on('exit',()=>cluster.fork());
    active++;
  }
  function start(){
    const blk=bc.createBlock(), chunk=1e6;
    Object.entries(cluster.workers).forEach(([id,w])=>{
      const idx=Number(id)-1;
      w.send({type:'START', block:blk, start:idx*chunk, end:(idx+1)*chunk});
    });
  }
  start();
  process.on('SIGINT',()=>{
    Object.values(cluster.workers).forEach(w=> w.send({type:'STOP'}));
    bc.save(); process.exit();
  });
} else {
  const bc=new FractalBlockchain();
  process.on('message', msg=>{
    if(msg.type==='START'){
      let b=msg.block;
      for(b.nonce=msg.start; b.nonce<msg.end; b.nonce++){
        const h=bc.hashBlock(b);
        if(h.startsWith('0'.repeat(b.difficulty))){
          b.hash=h; process.send({type:'MINED', block:b}); break;
        }
      }
    }
    if(msg.type==='STOP') return; // just break loop next iteration
  });
}
