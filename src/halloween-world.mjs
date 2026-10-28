import * as T from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { NEIGHBOURS, WRAPPERS, normalAngle } from "./lib/halloween.mjs";

// All scenery is authored geometry and procedural texture: no downloads or asset services.
const COLOURS = ["#f9bc73", "#95d6d3", "#c6a4ec", "#ed9cab"];
export function createHalloweenWorld(
  canvas,
  { balanced = false, preview = false } = {}
) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(balanced ? 1 : 1.65, devicePixelRatio || 1));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = !balanced;
  renderer.info.autoReset = false;
  renderer.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color("#101b27");
  scene.fog = new T.FogExp2("#25333e", 0.038);
  const camera = new T.PerspectiveCamera(66, 1, 0.07, 150);
  const composer = balanced ? null : new EffectComposer(renderer);
  if (composer) {
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new T.Vector2(1, 1), 0.32, 0.55, 1.1));
    composer.addPass(new OutputPass());
  }
  const materials = new Map(),
    geometries = new Map(),
    textures = new Set();
  const mat = (colour, props = {}) => {
    const key = colour + JSON.stringify(props);
    if (!materials.has(key))
      materials.set(
        key,
        new T.MeshStandardMaterial({ color: colour, roughness: 0.82, ...props })
      );
    return materials.get(key);
  };
  const geo = (kind, args) => {
    const key = kind + args.join(",");
    if (!geometries.has(key)) geometries.set(key, new T[kind](...args));
    return geometries.get(key);
  };
  const mesh = (parent, kind, args, material, x = 0, y = 0, z = 0) => {
    const m = new T.Mesh(geo(kind, args), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (parent, w, h, d, material, x, y, z) => {
    const m = mesh(parent, "BoxGeometry", [1, 1, 1], material, x, y, z);
    m.scale.set(w, h, d);
    return m;
  };
  const sphere = (parent, radius, material, x, y, z) =>
    mesh(parent, "SphereGeometry", [radius, 16, 12], material, x, y, z);
  const group = (parent, x = 0, y = 0, z = 0) => {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  let seed = 914;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const texture = (draw) => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    draw(c.getContext("2d"));
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textures.add(t);
    return t;
  };
  const plaster = texture((c) => {
    c.fillStyle = "#e2d3bd";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18000; i++) {
      const v = 80 + random() * 90;
      c.fillStyle = `rgba(${v},${v},${v},.12)`;
      c.fillRect(random() * 256, random() * 256, 2, 2);
    }
  });
  const timber = mat("#302837"),
    stone = mat("#847b87"),
    dark = mat("#211e32");
  const gold = mat("#ffc184", { emissive: "#ff963d", emissiveIntensity: 1.15 });
  const lawn = mat("#353c46"),
    roofmat = mat("#514456");
  scene.add(new T.HemisphereLight("#9fbbcf", "#18232a", 0.85));
  const moonlight = new T.DirectionalLight("#9bb9cc", 1.5);
  moonlight.position.set(-16, 27, 16);
  moonlight.castShadow = !balanced;
  moonlight.shadow.mapSize.set(2048, 2048);
  Object.assign(moonlight.shadow.camera, {
    left: -19,
    right: 19,
    top: 35,
    bottom: -25,
    near: 1,
    far: 85,
  });
  moonlight.shadow.normalBias = 0.04;
  moonlight.target.position.set(0, 0, 12);
  scene.add(moonlight, moonlight.target);
  const fill = new T.DirectionalLight("#688291", 0.35);
  fill.position.set(5, 8, -20);
  scene.add(fill);
  box(scene, 100, 0.2, 150, lawn, 0, -0.2, 20);
  box(
    scene,
    5.8,
    0.06,
    68,
    mat("#4c4b61", { roughness: 0.38, metalness: 0.15 }),
    0,
    -0.045,
    12
  );
  // Instanced, uneven cobbles keep a detailed road within a small draw-call budget.
  const cobbles = new T.InstancedMesh(
    geo("BoxGeometry", [0.47, 0.055, 0.37]),
    mat("#696577", { roughness: 0.48, metalness: 0.12 }),
    1500
  );
  const transform = new T.Object3D(),
    colour = new T.Color();
  let nstone = 0;
  for (let z = -15; z < 43; z += 0.46)
    for (let x = -2.65; x < 2.8; x += 0.57) {
      transform.position.set(
        x + (Math.round(z / 0.46) % 2) * 0.24,
        -0.025 + random() * 0.018,
        z
      );
      transform.rotation.y = (random() - 0.5) * 0.06;
      transform.updateMatrix();
      cobbles.setMatrixAt(nstone, transform.matrix);
      colour.setHSL(0.68, 0.06, 0.23 + random() * 0.1);
      cobbles.setColorAt(nstone++, colour);
    }
  cobbles.count = nstone;
  cobbles.receiveShadow = true;
  scene.add(cobbles);
  for (const side of [-1, 1]) {
    box(scene, 1.8, 0.12, 65, mat("#8b7d86"), side * 3.8, -0.01, 12);
    box(scene, 0.18, 0.19, 65, mat("#b4a2a0"), side * 2.98, 0.03, 12);
  }
  const glowTexture = texture((c) => {
    const g = c.createRadialGradient(128, 128, 1, 128, 128, 128);
    g.addColorStop(0, "rgba(255,201,123,.8)");
    g.addColorStop(0.2, "rgba(255,166,79,.25)");
    g.addColorStop(1, "rgba(255,166,79,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });
  const glow = (parent, x, y, z, size, colour = "#ffb36e") => {
    const s = new T.Sprite(
      new T.SpriteMaterial({
        map: glowTexture,
        color: colour,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      })
    );
    s.position.set(x, y, z);
    s.scale.set(size, size, 1);
    parent.add(s);
    return s;
  };
  function pumpkin(parent, x, y, z, scale = 1) {
    const g = group(parent, x, y, z);
    g.scale.setScalar(scale);
    const body = sphere(g, 0.3, mat("#d76621", { roughness: 0.6 }), 0, 0.25, 0);
    body.scale.set(1.1, 0.85, 1);
    for (let j = 0; j < 7; j++) {
      const a = (j / 7) * Math.PI * 2;
      const rib = sphere(
        g,
        0.21,
        mat("#dd7929"),
        Math.sin(a) * 0.16,
        0.25,
        Math.cos(a) * 0.16
      );
      rib.scale.set(0.65, 1.12, 0.65);
    }
    const stem = mesh(
      g,
      "CylinderGeometry",
      [0.035, 0.05, 0.15, 6],
      mat("#5e6341"),
      0,
      0.56,
      0
    );
    stem.rotation.z = 0.3;
    for (const s of [-1, 1]) {
      const eye = mesh(
        g,
        "ConeGeometry",
        [0.06, 0.1, 3],
        gold,
        s * 0.105,
        0.32,
        -0.275
      );
      eye.rotation.z = s * 0.15;
    }
    box(g, 0.2, 0.05, 0.025, gold, 0, 0.19, -0.294);
    glow(g, 0, 0.28, -0.32, 1.2);
    return g;
  }
  function lantern(parent, x, y, z) {
    box(parent, 0.2, 0.32, 0.2, gold, x, y, z);
    for (const dx of [-0.11, 0.11])
      for (const dz of [-0.11, 0.11])
        box(parent, 0.025, 0.36, 0.025, dark, x + dx, y, z + dz);
    box(parent, 0.28, 0.05, 0.28, dark, x, y + 0.2, z);
    box(parent, 0.26, 0.045, 0.26, dark, x, y - 0.2, z);
    glow(parent, x, y, z, 2.1);
  }
  function sign(parent, words, x, y, z, width = 1.8) {
    const t = texture((c) => {
      c.fillStyle = "#302b3d";
      c.fillRect(0, 0, 256, 256);
      c.strokeStyle = "#c7a16b";
      c.lineWidth = 5;
      c.strokeRect(10, 77, 236, 100);
      c.fillStyle = "#ffe4b5";
      c.font = "600 23px Georgia";
      c.textAlign = "center";
      c.fillText(words, 128, 137, 224);
    });
    const m = new T.MeshBasicMaterial({ map: t, transparent: false });
    materials.set("sign" + materials.size, m);
    const p = mesh(parent, "PlaneGeometry", [width, width], m, x, y, z);
    return p;
  }
  const residents = [];
  function resident(parent, kind) {
    const g = group(parent, 0, 0.21, -2.65);
    const pale = mat(
      kind === "wolf" ? "#aa8264" : kind === "witch" ? "#b4c18a" : "#e6dcc8"
    );
    const coat = mat(
      kind === "vampire"
        ? "#29262b"
        : kind === "witch"
        ? "#222b2b"
        : kind === "wolf"
        ? "#3c4943"
        : "#8e9386"
    );
    if (kind === "ghost") {
      const body = sphere(
        g,
        0.42,
        mat("#b3c2c0", { emissive: "#334953", emissiveIntensity: 0.2 }),
        0,
        1.25,
        0
      );
      body.scale.set(0.7, 2, 0.7);
      for (let j = -2; j <= 2; j++) sphere(g, 0.13, pale, j * 0.13, 0.53, 0);
    } else {
      const torso = mesh(
        g,
        "CylinderGeometry",
        [0.28, 0.36, 0.7, 12],
        coat,
        0,
        0.76,
        0
      );
      sphere(g, 0.29, pale, 0, 1.34, 0).scale.set(0.7, 1.28, 0.78);
      for (const side of [-1, 1]) {
        const arm = mesh(
          g,
          "CapsuleGeometry",
          [0.08, 0.42, 3, 6],
          coat,
          side * 0.36,
          0.86,
          -0.02
        );
        arm.rotation.z = side * 0.2;
        box(g, 0.17, 0.3, 0.2, coat, side * 0.15, 0.26, 0.01);
        sphere(g, 0.09, pale, side * 0.42, 0.59, -0.04);
      }
      if (kind === "witch" || kind === "vampire") {
        const hood = sphere(g, 0.32, dark, 0, 1.4, 0.05);
        hood.scale.set(0.85, 1.42, 0.9);
        const mask = sphere(g, 0.22, pale, 0, 1.37, -0.18);
        mask.scale.set(0.72, 1.35, 0.55);
        const robe = mesh(
          g,
          "ConeGeometry",
          [0.42, 1.25, 10],
          coat,
          0,
          0.7,
          0.05
        );
        robe.scale.z = 0.8;
      }
      if (kind === "mummy")
        for (let k = 0; k < 7; k++) {
          const band = mesh(
            g,
            "TorusGeometry",
            [0.29, 0.025, 4, 16],
            mat("#a89f88"),
            0,
            0.55 + k * 0.13,
            0
          );
          band.rotation.x = Math.PI / 2 + 0.12;
        }
      if (kind === "skeleton") {
        for (let k = 0; k < 4; k++)
          box(g, 0.37 - k * 0.025, 0.035, 0.06, pale, 0, 0.65 + k * 0.12, -0.3);
      }
    }
    for (const s of [-1, 1]) {
      const eye = sphere(g, 0.046, dark, s * 0.108, 1.36, -0.265);
      eye.scale.y = 1.3;
    }
    sphere(g, 0.04, dark, 0, 1.19, -0.285).scale.set(0.5, 1.8, 0.5);
    residents.push(g);
    return g;
  }
  NEIGHBOURS.forEach((n, i) => {
    const side = Math.sign(n.x),
      house = group(scene, side * 7.55, 0, n.z);
    house.rotation.y = (side * Math.PI) / 2;
    const wall = mat(n.colour, { map: plaster, roughness: 0.95 });
    box(house, 4.25, 3.6, 3.8, wall, 0, 1.8, 0.2);
    box(house, 4.5, 0.24, 4, stone, 0, 0.16, 0.2);
    // Gabled roof with individually instanced overlapping shingles.
    const gable = new T.Shape();
    gable.moveTo(-2.25, 3.5);
    gable.lineTo(0, 4.85);
    gable.lineTo(2.25, 3.5);
    gable.closePath();
    const roof = new T.Mesh(
      new T.ExtrudeGeometry(gable, { depth: 4.1, bevelEnabled: false }),
      mat(n.roof)
    );
    roof.position.z = -1.85;
    roof.castShadow = true;
    house.add(roof);
    // Two explicit sloping planes form a clean, deep eave.
    for (const slope of [-1, 1]) {
      const r = box(
        house,
        2.76,
        0.18,
        4.5,
        mat(n.roof),
        slope * 1.16,
        4.04,
        0.2
      );
      r.rotation.z = slope * -0.58;
      const tiles = new T.InstancedMesh(
        geo("BoxGeometry", [0.33, 0.075, 0.47]),
        roofmat,
        80
      );
      let idx = 0;
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 10; col++) {
          const x = slope * (0.13 + row * 0.3);
          transform.position.set(
            x,
            4.8 - Math.abs(x) * 0.65,
            -1.9 + col * 0.46
          );
          transform.rotation.set(0, 0, slope * -0.58);
          transform.updateMatrix();
          tiles.setMatrixAt(idx++, transform.matrix);
        }
      tiles.castShadow = true;
      house.add(tiles);
    }
    box(house, 0.58, 1.2, 0.65, mat("#745c69"), 1.2, 4.8, 0.75);
    box(house, 0.72, 0.16, 0.8, stone, 1.2, 5.4, 0.75);
    for (const x of [-2.02, 0, 2.02])
      box(house, 0.13, 3.65, 0.14, timber, x, 1.88, -1.73);
    for (const y of [0.6, 2.75, 3.52])
      box(house, 4.2, 0.12, 0.14, timber, 0, y, -1.74);
    const brace = box(house, 1.9, 0.1, 0.14, timber, 1.05, 3.08, -1.75);
    brace.rotation.z = 0.3;
    box(house, 1.05, 2.13, 0.13, mat("#372e42"), 0, 1.18, -1.75);
    const door = box(
      house,
      0.83,
      1.9,
      0.1,
      mat(i % 2 ? "#405b60" : "#71505b"),
      0.13,
      1.17,
      -1.85
    );
    door.rotation.y = -0.3;
    sphere(house, 0.045, gold, 0.43, 1.12, -2.02);
    for (const x of [-1.3, 1.3]) {
      box(house, 1.06, 1.27, 0.12, timber, x, 1.9, -1.8);
      box(
        house,
        0.89,
        1.1,
        0.13,
        i === 4
          ? mat("#526c70", { emissive: "#527a87", emissiveIntensity: 0.7 })
          : gold,
        x,
        1.9,
        -1.88
      );
      if (i === 1 || i === 3)
        for (const y of [1.65, 2.1]) {
          const plank = box(house, 1.17, 0.14, 0.1, timber, x, y, -2.07);
          plank.rotation.z = x > 0 ? 0.22 : -0.2;
        }
      for (const dx of [-0.3, 0.3])
        box(
          house,
          0.14,
          0.98,
          0.05,
          mat(i % 2 ? "#c69b74" : "#a68088"),
          x + dx,
          1.9,
          -1.98
        );
      box(house, 0.07, 1.12, 0.06, timber, x, 1.9, -2);
      box(house, 0.94, 0.07, 0.06, timber, x, 1.9, -2);
      box(house, 1.22, 0.12, 0.35, stone, x, 1.29, -1.94);
    }
    box(house, 2.9, 0.17, 1.25, mat("#a48d87"), 0, 0.15, -2.27);
    box(house, 2.3, 0.12, 0.55, stone, 0, 0.05, -3.08);
    const awning = box(house, 3.1, 0.14, 1.75, mat(n.roof), 0, 2.85, -2.35);
    awning.rotation.x = -0.1;
    for (const x of [-1.32, 1.32])
      box(house, 0.13, 2.6, 0.13, timber, x, 1.48, -2.96);
    lantern(house, -0.73, 2.05, -2.02);
    const light = new T.PointLight("#cf9970", 5, 7, 2);
    light.position.set(0, 2, -2.6);
    house.add(light);
    pumpkin(house, -1.04, 0.24, -2.7, 1.12);
    pumpkin(house, 1.15, 0.24, -2.47, 0.75);
    sign(
      house,
      n.name.replace(", the ", " ").replace(", a ", " "),
      0,
      2.64,
      -3.25,
      1.85
    );
    resident(house, n.kind);
    for (const x of [-2.5, 2.5]) {
      for (let j = 0; j < 9; j++) {
        const picket = box(
          house,
          0.1,
          0.74,
          0.1,
          mat("#a0909a"),
          x,
          0.48,
          -3 + j * 0.55
        );
        mesh(
          house,
          "ConeGeometry",
          [0.08, 0.13, 4],
          mat("#a0909a"),
          picket.position.x,
          0.9,
          picket.position.z
        );
      }
      box(house, 0.09, 0.08, 4.5, timber, x, 0.46, -0.8);
    }
  });
  // Trees, lamps and autumn foliage frame the street without obscuring the route.
  const leafGeo = geo("IcosahedronGeometry", [1, 1]);
  const leaves = new T.InstancedMesh(leafGeo, mat("#bc703b"), 150);
  let leafIndex = 0;
  for (const side of [-1, 1])
    for (let j = 0; j < 7; j++) {
      const z = -5 + j * 6.4,
        x = side * (11.5 + random() * 2);
      const trunk = mesh(
        scene,
        "CylinderGeometry",
        [0.18, 0.38, 4.5, 7],
        mat("#51404a"),
        x,
        2,
        z
      );
      trunk.rotation.z = side * 0.12;
      for (let k = 0; k < 10; k++) {
        transform.position.set(
          x + (random() - 0.5) * 3.4,
          4 + random() * 2.8,
          z + (random() - 0.5) * 3.2
        );
        transform.rotation.set(random(), random(), random());
        transform.scale.set(1.1 + random(), 0.8 + random(), 1 + random());
        transform.updateMatrix();
        leaves.setMatrixAt(leafIndex, transform.matrix);
        colour.setHSL(0.065 + random() * 0.04, 0.17, 0.13 + random() * 0.11);
        leaves.setColorAt(leafIndex++, colour);
      }
    }
  leaves.count = leafIndex;
  leaves.castShadow = true;
  scene.add(leaves);
  for (let j = 0; j < 5; j++)
    for (const side of [-1, 1]) {
      const x = side * 3.05,
        z = -5 + j * 8.1;
      mesh(scene, "CylinderGeometry", [0.05, 0.1, 3.6, 8], dark, x, 1.8, z);
      sphere(scene, 0.16, dark, x, 0.14, z);
      lantern(scene, x, 3.62, z);
      mesh(
        scene,
        "ConeGeometry",
        [0.23, 0.23, 4],
        dark,
        x,
        3.98,
        z
      ).rotation.y = Math.PI / 4;
      const light = new T.PointLight("#ddbd8e", 4, 6, 2);
      light.position.set(x, 3.4, z);
      scene.add(light);
      const p = pumpkin(scene, x + side * 0.45, 0.08, z + 0.2, 0.65);
      p.rotation.y = side * 1.2;
    }
  // Strings sag between poles; bulbs are emissive instead of dozens of shadow lights.
  for (const z of [-1, 10, 22, 32]) {
    const points = [];
    for (let k = 0; k <= 20; k++)
      points.push(
        new T.Vector3(-10 + k, 6.4 - Math.sin((k / 20) * Math.PI) * 1.9, z)
      );
    const curve = new T.CatmullRomCurve3(points);
    const wire = new T.Mesh(
      new T.TubeGeometry(curve, 40, 0.018, 4, false),
      dark
    );
    scene.add(wire);
    for (let k = 0; k <= 16; k++) {
      const p = curve.getPoint(k / 16),
        bulb = sphere(
          scene,
          0.085,
          k % 3
            ? dark
            : mat("#b9b899", { emissive: "#d5d2b7", emissiveIntensity: 0.6 }),
          p.x,
          p.y - 0.1,
          p.z
        );
      bulb.castShadow = false;
    }
  }
  const fallen = new T.InstancedMesh(
    geo("PlaneGeometry", [0.12, 0.19]),
    mat("#79644b", { side: T.DoubleSide }),
    300
  );
  for (let i = 0; i < 300; i++) {
    transform.position.set((random() - 0.5) * 10, 0.085, -7 + random() * 43);
    transform.rotation.set(-Math.PI / 2, 0, random() * Math.PI * 2);
    transform.scale.setScalar(0.5 + random());
    transform.updateMatrix();
    fallen.setMatrixAt(i, transform.matrix);
  }
  scene.add(fallen);
  for (let i = 0; i < 14; i++) {
    const g = group(
      scene,
      (i % 2 ? -1 : 1) * (12 + random() * 4),
      0,
      -3 + i * 2.7
    );
    g.rotation.z = (random() - 0.5) * 0.25;
    box(g, 0.5, 0.8, 0.18, mat("#4a5558"), 0, 0.4, 0);
    sphere(g, 0.25, mat("#4a5558"), 0, 0.8, 0).scale.z = 0.38;
  }
  const watcher = group(scene);
  const shroud = mat("#131c22", { roughness: 1 });
  const shape = mesh(
    watcher,
    "ConeGeometry",
    [0.48, 2.85, 12],
    shroud,
    0,
    1.4,
    0
  );
  shape.scale.z = 0.62;
  sphere(watcher, 0.21, shroud, 0, 2.63, 0).scale.set(0.75, 1.3, 0.75);
  for (const side of [-1, 1]) {
    const arm = mesh(
      watcher,
      "CylinderGeometry",
      [0.032, 0.065, 1.6, 6],
      shroud,
      side * 0.39,
      1.4,
      0
    );
    arm.rotation.z = side * 0.15;
    sphere(
      watcher,
      0.028,
      mat("#c9ddda", { emissive: "#bfdcce", emissiveIntensity: 1.8 }),
      side * 0.07,
      2.65,
      0.16
    );
    for (let k = 0; k < 3; k++)
      box(
        watcher,
        0.018,
        0.3,
        0.018,
        shroud,
        side * 0.51 + k * 0.035,
        0.48,
        0.01
      );
  }
  const mist = [];
  const mistTexture = texture((c) => {
    const grad = c.createRadialGradient(128, 128, 0, 128, 128, 126);
    grad.addColorStop(0, "rgba(194,218,222,.22)");
    grad.addColorStop(0.4, "rgba(194,218,222,.11)");
    grad.addColorStop(1, "rgba(194,218,222,0)");
    c.fillStyle = grad;
    c.fillRect(0, 0, 256, 256);
  });
  for (let i = 0; i < 7; i++) {
    const sprite = new T.Sprite(
      new T.SpriteMaterial({
        map: mistTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.33,
      })
    );
    sprite.position.set(i % 2 ? -2 : 2, 0.45, i * 6);
    sprite.scale.set(17, 2.4, 1);
    scene.add(sprite);
    mist.push(sprite);
  }
  const moon = sphere(
    scene,
    3.1,
    mat("#fff0cd", { emissive: "#ffdcad", emissiveIntensity: 0.7 }),
    -18,
    25,
    59
  );
  moon.castShadow = false;
  glow(scene, -18, 25, 59, 23, "#b6b7ec");
  const stars = new Float32Array(210 * 3);
  for (let i = 0; i < 210; i++) {
    stars[i * 3] = (random() - 0.5) * 160;
    stars[i * 3 + 1] = 17 + random() * 60;
    stars[i * 3 + 2] = (random() - 0.5) * 160;
  }
  const starGeo = new T.BufferGeometry();
  starGeo.setAttribute("position", new T.BufferAttribute(stars, 3));
  const starMat = new T.PointsMaterial({
    color: "#eee0ca",
    size: 0.1,
    transparent: true,
    opacity: 0.65,
  });
  scene.add(new T.Points(starGeo, starMat));
  // End-of-street village gate and sign make the space feel authored in both directions.
  for (const z of [-8, 34]) {
    for (const side of [-1, 1])
      box(scene, 0.35, 5.5, 0.35, timber, side * 3.5, 2.65, z);
    box(scene, 7.5, 0.28, 0.3, timber, 0, 5.25, z);
    const s = sign(
      scene,
      z < 0 ? "COME BACK SOON" : "GOURD STREET",
      0,
      4.65,
      z,
      3.9
    );
    if (z < 0) s.rotation.y = Math.PI;
  }
  const sweets = WRAPPERS.map((w, i) => {
    const g = group(scene, w.x, 0.3, w.z),
      m = mat("#92bab7", {
        emissive: "#77adae",
        emissiveIntensity: 0.7,
        metalness: 0.5,
        roughness: 0.25,
      });
    const shard = mesh(g, "OctahedronGeometry", [0.16, 0], m);
    shard.scale.set(0.4, 1.5, 0.7);
    for (let k = 0; k < 3; k++) {
      const chip = mesh(
        g,
        "OctahedronGeometry",
        [0.04, 0],
        m,
        Math.sin(k * 2.1) * 0.2,
        -0.1 + k * 0.12,
        Math.cos(k * 2.1) * 0.2
      );
      chip.rotation.z = k;
    }
    glow(g, 0, 0, 0, 0.85, "#94bbbd");
    return g;
  });
  const avatars = COLOURS.map((c) => {
    const g = group(scene),
      coat = mat("#3e4b4b"),
      fabric = mat(c, { roughness: 1 });
    mesh(g, "CapsuleGeometry", [0.24, 0.42, 3, 10], coat, 0, 0.95, 0);
    const hood = sphere(g, 0.22, coat, 0, 1.57, 0);
    hood.scale.y = 1.13;
    const face = sphere(g, 0.15, mat("#3a4448"), 0, 1.57, 0.14);
    face.scale.set(0.8, 1.1, 0.45);
    for (const side of [-1, 1]) {
      mesh(
        g,
        "CapsuleGeometry",
        [0.085, 0.49, 3, 6],
        coat,
        side * 0.3,
        1.03,
        0.035
      ).rotation.z = side * 0.08;
      mesh(
        g,
        "CapsuleGeometry",
        [0.105, 0.5, 3, 6],
        mat("#29363b"),
        side * 0.14,
        0.39,
        0
      );
      box(g, 0.19, 0.12, 0.3, dark, side * 0.14, 0.1, 0.08);
    }
    const scarf = mesh(
      g,
      "TorusGeometry",
      [0.18, 0.04, 6, 16],
      fabric,
      0,
      1.36,
      0
    );
    scarf.rotation.x = Math.PI / 2;
    box(g, 0.08, 0.3, 0.03, fabric, 0.12, 1.2, 0.23);
    const torch = mesh(
      g,
      "CylinderGeometry",
      [0.05, 0.04, 0.24, 8],
      dark,
      0.32,
      0.75,
      0.13
    );
    torch.rotation.x = Math.PI / 2;
    sphere(
      g,
      0.045,
      mat("#a5c3ba", { emissive: "#9bc5bc", emissiveIntensity: 0.8 }),
      0.32,
      0.75,
      0.26
    );
    return g;
  });
  const labels = [];
  function setNames(names) {
    for (const l of labels) {
      l.parent.remove(l);
      l.material.map.dispose();
      l.material.dispose();
    }
    labels.length = 0;
    names.forEach((name, i) => {
      if (!avatars[i]) return;
      const t = texture((c) => {
        c.clearRect(0, 0, 256, 256);
        c.fillStyle = "rgba(26,24,42,.85)";
        c.beginPath();
        c.roundRect(5, 93, 246, 65, 20);
        c.fill();
        c.fillStyle = COLOURS[i];
        c.font = "bold 25px sans-serif";
        c.textAlign = "center";
        c.fillText(String(name).slice(0, 22), 128, 134, 226);
      });
      const label = new T.Sprite(
        new T.SpriteMaterial({ map: t, depthWrite: false })
      );
      label.scale.set(1.7, 1.7, 1);
      label.position.y = 2.15;
      avatars[i].add(label);
      labels.push(label);
    });
  }
  // Sparse moving particles, all in one draw call.
  const moteGeo = new T.BufferGeometry(),
    motePositions = new Float32Array(70 * 3),
    moteOrigin = [];
  for (let i = 0; i < 70; i++)
    moteOrigin.push([
      (random() - 0.5) * 17,
      0.4 + random() * 5,
      -5 + random() * 40,
    ]);
  moteGeo.setAttribute("position", new T.BufferAttribute(motePositions, 3));
  const moteMat = new T.PointsMaterial({
    color: "#b3c5c9",
    size: 0.027,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  scene.add(new T.Points(moteGeo, moteMat));
  // A camera-mounted torch is also the defence against the watcher.
  const bucket = group(camera, 0.34, -0.32, -0.6);
  const torch = mesh(
    bucket,
    "CylinderGeometry",
    [0.065, 0.055, 0.37, 16],
    mat("#303e43", { metalness: 0.7, roughness: 0.35 }),
    0,
    0,
    0
  );
  torch.rotation.x = Math.PI / 2;
  const head = mesh(
    bucket,
    "CylinderGeometry",
    [0.095, 0.065, 0.1, 16],
    mat("#67777c", { metalness: 0.8, roughness: 0.2 }),
    0,
    0,
    -0.21
  );
  head.rotation.x = Math.PI / 2;
  mesh(
    bucket,
    "CircleGeometry",
    [0.08, 24],
    mat("#c5d8cf", { emissive: "#c5d8cf", emissiveIntensity: 1.3 }),
    0,
    0,
    -0.265
  ).rotation.y = Math.PI;
  const beam = new T.SpotLight("#d3e5d9", 35, 25, 0.43, 0.65, 1.5);
  beam.position.set(0.25, -0.14, -0.2);
  beam.target.position.set(0, -0.12, -10);
  camera.add(beam, beam.target);
  scene.add(camera);
  // Simulation forward is +Z; WebGL camera forward is -Z. Mirror the authored
  // world once so screen-right, strafing, compass and mouse look all agree.
  const world = new T.Group();
  [...scene.children]
    .filter((child) => child !== camera)
    .forEach((child) => world.add(child));
  world.scale.z = -1;
  scene.add(world);
  // Batch static masonry, window frames and fence posts by geometry/material.
  // Residents, witnesses and collectibles retain their own animated transforms.
  world.updateMatrixWorld(true);
  const animated = new Set([...residents, ...avatars, ...sweets, watcher]);
  const batches = new Map(),
    inverse = world.matrixWorld.clone().invert();
  world.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    for (let parent = o; parent; parent = parent.parent)
      if (animated.has(parent)) return;
    const key = `${o.geometry.uuid}/${o.material.uuid}/${o.castShadow}/${o.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(o);
  });
  for (const objects of batches.values()) {
    if (objects.length < 2) continue;
    const first = objects[0],
      batch = new T.InstancedMesh(
        first.geometry,
        first.material,
        objects.length
      );
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    objects.forEach((o, i) => {
      batch.setMatrixAt(
        i,
        new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld)
      );
      o.parent.remove(o);
    });
    batch.computeBoundingSphere();
    world.add(batch);
  }
  let lastNames = "",
    previousTime = 0;
  const smooth = [];
  let fpsFrames = 0,
    fpsStart = 0;
  function render(board, seat, time, reduced = false, names = []) {
    const dt = Math.min(0.1, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;
    const t = reduced ? 0 : time / 1000;
    const nameKey = names.join("\0");
    if (nameKey !== lastNames) {
      setNames(names);
      lastNames = nameKey;
    }
    board.players.forEach((p, i) => {
      if (!smooth[i]) smooth[i] = { ...p };
      const q = smooth[i],
        lerp = 1 - Math.exp(-dt * 18);
      q.x += (p.x - q.x) * lerp;
      q.z += (p.z - q.z) * lerp;
      q.yaw += normalAngle(p.yaw - q.yaw) * lerp;
      const moving = Math.hypot(p.x - q.x, p.z - q.z) > 0.012;
      if (Math.hypot(p.x - q.x, p.z - q.z) > 5) {
        q.x = p.x;
        q.z = p.z;
      }
      const a = avatars[i];
      a.visible = i !== Math.max(0, seat);
      a.position.set(q.x, Math.sin(t * 2.6 + i) * 0.045, q.z);
      a.rotation.y = q.yaw;
      if (i === Math.max(0, seat)) {
        const bob = reduced || !moving ? 0 : Math.sin(t * 9) * 0.022;
        camera.position.set(q.x, 1.62 + bob, -q.z);
        camera.rotation.set(0, -q.yaw, 0, "YXZ");
        bucket.position.y = -0.32 + bob * 0.5;
      }
    });
    avatars.forEach((a, i) => {
      if (!board.players[i]) a.visible = false;
    });
    mist.forEach((s, i) => {
      s.position.x = Math.sin(t * 0.08 + i) * 1.7;
    });
    sweets.forEach((s, i) => {
      s.visible = !board.collected.includes(i);
      s.rotation.y = t * 0.8 + i;
      s.position.y = 0.3 + Math.sin(t * 2 + i) * 0.06;
    });
    residents.forEach((r, i) => {
      r.position.y = 0.21 + Math.sin(t * 1.4 + i) * 0.018;
      r.rotation.z = Math.sin(t + i) * 0.025;
    });
    moteOrigin.forEach((p, i) => {
      motePositions[i * 3] = p[0] + Math.sin(t * 0.22 + i) * 0.8;
      motePositions[i * 3 + 1] = p[1] + Math.sin(t * 0.4 + i) * 0.16;
      motePositions[i * 3 + 2] = p[2] + Math.cos(t * 0.2 + i) * 0.4;
    });
    moteGeo.attributes.position.needsUpdate = true;
    watcher.visible = board.visited.length > 0 && !board.done;
    const w = board.watcher || { x: 0, z: 31 };
    watcher.position.set(w.x, Math.sin(t * 1.8) * 0.04, w.z);
    watcher.rotation.y = Math.atan2(
      camera.position.x - w.x,
      -camera.position.z - w.z
    );
    bucket.visible = !preview && seat >= 0;
    beam.visible = !preview;
    beam.intensity = 35 + Math.sin(t * 9) * 0.6;
    renderer.info.reset();
    if (composer) composer.render();
    else renderer.render(scene, camera);
    if (++fpsFrames >= 60) {
      canvas.dataset.renderFps = String(
        Math.round((fpsFrames * 1000) / Math.max(1, time - fpsStart))
      );
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      fpsStart = time;
      fpsFrames = 0;
    }
  }
  function resize(w, h) {
    if (w < 1 || h < 1) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
  }
  function dispose() {
    const gs = new Set(),
      ms = new Set();
    scene.traverse((o) => {
      if (o.geometry) gs.add(o.geometry);
      if (o.material)
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          ms.add(m)
        );
    });
    gs.forEach((g) => g.dispose());
    ms.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    composer?.passes.forEach((p) => p.dispose?.());
    composer?.dispose();
    renderer.dispose();
  }
  return { render, resize, dispose };
}
