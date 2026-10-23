export const neighbors=i=>[i%5?i-1:-1,i%5<4?i+1:-1,i>=5?i-5:-1,i<20?i+5:-1].filter(x=>x>=0);
export const start=()=>({board:Array(25).fill(null),turn:0,moves:0,log:[]});
export function legal(s){return s.moves>=20?[]:s.board.flatMap((v,i)=>!v&&(s.moves===0?i===12:neighbors(i).some(n=>s.board[n]))?[i]:[])}
export function points(board){let score=0;board.forEach((v,i)=>{if(v)for(const j of neighbors(i))if(j>i&&board[j]&&board[j]!==v)score+=2});return score}
export function play(s,i,plant){if(!legal(s).includes(i)||!['sun','fern','bloom'].includes(plant))throw Error('Choose an empty connected plot and a plant.');const board=[...s.board];board[i]=plant;return {board,turn:1-s.turn,moves:s.moves+1,log:[...s.log,`${s.turn?'Game Player':'You'} planted ${plant} at ${i+1}.`]}}
export function choose(s,difficulty='thoughtful'){const options=legal(s).flatMap(i=>['sun','fern','bloom'].map(p=>({i,p,value:points(play(s,i,p).board)})));if(!options.length)return null;return difficulty==='relaxed'?options[Math.floor(Math.random()*options.length)]:options.sort((a,b)=>b.value-a.value||a.i-b.i)[0]}
