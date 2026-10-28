import {
  newVector,
  stepVector,
  targetFor,
  sub,
  length,
  clamp,
} from "../src/lib/vector-wake.mjs";
const results = [];
for (const arena of ["open", "islands"]) {
  let b = newVector(1, arena),
    cooling = false;
  for (let i = 0; i < 6000 && !b.done; i++) {
    const p = b.players[0],
      t = targetFor(b);
    if (!t) {
      b = stepVector(b);
      continue;
    }
    const d = sub(t.enemy, p),
      yaw = Math.atan2(d.x, -d.z),
      pitch = Math.asin(d.y / length(d));
    const delta = Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw));
    if (p.heat > 78) cooling = true;
    if (p.heat < 20) cooling = false;
    b = stepVector(b, {
      0: {
        turn: clamp(delta * 4, -1, 1),
        pitch: clamp((pitch - p.pitch) * 4, -1, 1),
        brake: t.distance < 300,
        boost: t.distance > 1500,
        fire: t.angle < 0.11 && !cooling,
        missile: b.lockTime >= 1.1,
      },
    });
  }
  results.push({
    difficulty: arena === "open" ? "Cadet" : "Veteran",
    victory: b.victory,
    sectors: b.wave,
    targets: b.kills,
    seconds: b.time,
    score: b.players[0].score,
    hull: b.players[0].hull,
    shield: b.players[0].shield,
    accuracy: Math.round((100 * b.hits) / b.fired),
  });
}
console.log(
  JSON.stringify(
    {
      test: "ordinary-input simulated pilot; no state injection or model calls",
      results,
    },
    null,
    2
  )
);
if (results.some((r) => !r.victory)) process.exitCode = 1;
