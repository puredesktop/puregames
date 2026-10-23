import{test}from'node:test';import assert from'node:assert/strict';import{newRace,step,steer}from'./trails.mjs';
test('reversal rejected and previous state immutable',()=>{const s=newRace(),n=step(s,{0:3});assert.equal(n.players[0].x,6);assert.equal(s.tick,0)});
test('same-cell collision is a draw',()=>{const s=newRace();s.players=[{x:10,y:10,d:1,alive:true},{x:12,y:10,d:3,alive:true}];const n=step(s);assert.ok(n.done);assert.ok(n.players.every(p=>!p.alive))});
test('agents finish without invalid states',()=>{let s=newRace();for(let i=0;i<1400&&!s.done;i++)s=step(s,{0:steer(s,0),1:steer(s,1)});assert.ok(s.done);assert.ok(s.tick>10)});
