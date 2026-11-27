// Parity test: JS engine vs Colab V2.4 output for round "alphabet" (run 2026-05-03).
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname,'..','play.html'), 'utf8');
const src = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
eval(src);
const E = globalThis.SIM002;
const assert = require('assert');

// Reconstructed from notebook outputs (Cells 3-7). Pre-only rolls: values unknown except 23121; excluded anyway.
const both = [
  // roll, preStake, preVal, postStake, postVal
  ['23014','Divest',8,'Divest',15],['23136','Divest',8,'Divest',10],['23284','Fund',4,'Fund',2],
  ['23055','Fund',10,'Fund',12],['23088','Fund',5,'Fund',5],['23178','Fund',10,'Fund',5],
  ['23068','Divest',7,'Fund',10],['23254','Fund',5,'Fund',7],['23157','Divest',3,'Divest',5],
  ['23227','Fund',5,'Fund',5],['23075','Fund',2,'Divest',7],
  ['23019','Fund',10,'Divest',8],['23255','Fund',7,'Divest',6],['23018','Fund',7,'Divest',5],
  ['23195','Fund',7,'Divest',3],['23146','Fund',3,'Divest',2],['23174','Fund',2,'Divest',2],['23268','Fund',1,'Divest',1],
];
const preOnly = ['23040','23264','23298','23171','23272','23121','23221','23222','23223','23032','23035','23038'];

const preCsv = 'Roll No,Team,Stake,Value\n' + both.map(r=>`${r[0]},Alphabet,${r[1]},${r[2]}`).join('\n') + '\n' +
  preOnly.map(r=>`${r},Alphabet,Divest,5`).join('\n') + '\n23014,Alphabet,Fund,1\n'; // duplicate -> first kept
const postCsv = 'Roll No,Presenting Team,Stake,Value,Select the Primary Strategic Driver for your final investment decision\n' +
  both.map(r=>`${r[0]},Alphabet,${r[3]},${r[4]},"High execution risk, and/or internal operational issues"`).join('\n') + '\n';

const pre = E.sheetToRecords(preCsv, 'Pre'), post = E.sheetToRecords(postCsv, 'Post');
assert.strictEqual(pre.length, 30); assert.strictEqual(post.length, 18);
const j = E.joinAndValidate(pre, post, {});
assert.strictEqual(j.rows.length, 18);
assert.deepStrictEqual(j.onlyPre.sort(), preOnly.slice().sort());
assert.strictEqual(j.rows.filter(r=>r.valid).length, 11);
assert.ok(j.rows.filter(r=>!r.valid).every(r=>r.reasons.join()==='STAKE_CHANGE_INV_INSUFFICIENT'));

const s = E.scoreRound(j.rows, 'Divest', {});
assert.strictEqual(s.lossPool, 46); assert.strictEqual(s.winInv, 37);
assert.strictEqual(s.winners, 4); assert.strictEqual(s.losers, 7);
assert.ok(Math.abs(s.zeroSumCheck) < 1e-9);

// Expected rank order and P&L from Colab Cell 7 output
const expected = [
  ['23014',18.65],['23136',12.43],['23075',8.70],['23157',6.22],['23284',-2],['23088',-5],['23178',-5],['23227',-5],
  ['23254',-7],['23068',-10],['23055',-12],
  ['23019',-5],['23255',-5],['23018',-5],['23195',-5],['23146',-5],['23174',-5],['23268',-5],
];
s.rows.forEach((r,i)=>{
  assert.strictEqual(r.roll, expected[i][0], `rank ${i+1}: got ${r.roll}`);
  assert.strictEqual(r.pnl.toFixed(2), expected[i][1].toFixed(2), `pnl ${r.roll}`);
});
assert.strictEqual(s.rows[0].avg, 11.5);
assert.strictEqual(s.rows[0].driver, 'High execution risk, and/or internal operational issues');

// Edge case A
const allD = E.scoreRound(j.rows, 'Fund', {}); // mixed -> normal
assert.ok(Math.abs(allD.zeroSumCheck) < 1e-9);
const same = E.scoreRound(j.rows.filter(r=>r.valid && r.stakePost==='Divest'), 'Fund', {});
assert.strictEqual(same.edge, 'A'); assert.ok(same.rows.every(r=>r.pnl===0));

// Ceiling exception: pre 15, switch, post 15 valid; pre 14 switch post 14 invalid
const k = E.joinAndValidate(
  [{roll:'1',team:'',stake:'Fund',value:15},{roll:'2',team:'',stake:'Fund',value:14},{roll:'3',team:'',stake:'Fund',value:3}],
  [{roll:'1',team:'',stake:'Divest',value:15},{roll:'2',team:'',stake:'Divest',value:14},{roll:'3',team:'',stake:'Hold',value:3}], {});
assert.strictEqual(k.rows[0].valid, true); assert.strictEqual(k.rows[1].valid, false);
assert.ok(k.rows[2].reasons[0].startsWith('INVALID_POST_STAKE'));
// Out-of-range invalid -> 0 P&L under V2.4; -penalty when penaltyAllInvalid
assert.strictEqual(E.scoreRound(k.rows,'Fund',{}).rows.find(r=>r.roll==='3').pnl, 0);
assert.strictEqual(E.scoreRound(k.rows,'Fund',{penaltyAllInvalid:true}).rows.find(r=>r.roll==='3').pnl, -5);

// Cumulative: penalty carries into cumulative (per V2.4 code)
const st = E.standings([{id:'alphabet',rows:s.rows}], {});
assert.strictEqual(st.minReq, 3);
assert.strictEqual(st.rows.find(r=>r.roll==='23019').pnl, -5);
assert.strictEqual(st.rows[0].roll, '23014');
// Re-scoring same round ID overwrites, not double counts
const st2 = E.standings([{id:'alphabet',rows:s.rows},{id:'alphabet',rows:s.rows}], {});
assert.strictEqual(st2.rows.find(r=>r.roll==='23014').rounds, 1);
// Quick entry parse
const q = E.quickToSheets('23014, Divest, 8, Divest, 15, Strong alignment, with consumers\n23284, Fund, 4,,\n');
assert.strictEqual(q.pre.length, 2); assert.strictEqual(q.post.length, 1); assert.strictEqual(q.post[0].driver, 'Strong alignment, with consumers');

console.log('PARITY OK — 18 scored, 11 valid, loss pool 46, rank order and P&L match Colab V2.4 output.');
