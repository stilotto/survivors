// Trees as instanced meshes: one draw call per part per kind, so the same
// code can plant a yard's worth or a whole county's worth.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Unit-height shapes (1 m tall); instances scale them to size.
function spruce() {
  const tiers = [[0.36, 0.5, 0.2], [0.28, 0.42, 0.42], [0.18, 0.34, 0.64], [0.1, 0.24, 0.84]];
  const foliage = mergeGeometries(tiers.map(([r, h, y]) =>
    new THREE.ConeGeometry(r, h, 8).translate(0, y + h / 2 - 0.08, 0)));
  const trunk = new THREE.CylinderGeometry(0.025, 0.04, 0.3, 6).translate(0, 0.15, 0);
  return { foliage, trunk, colors: [0x2c3b2c, 0x3d3128] };
}

function broadleaf() {
  const blobs = [[0, 0.72, 0, 0.3], [0.18, 0.6, 0.08, 0.22], [-0.16, 0.62, -0.06, 0.24], [0.02, 0.9, -0.1, 0.2]];
  const foliage = mergeGeometries(blobs.map(([x, y, z, r]) =>
    new THREE.IcosahedronGeometry(r, 1).translate(x, y, z)));
  const trunk = new THREE.CylinderGeometry(0.03, 0.05, 0.6, 6).translate(0, 0.3, 0);
  return { foliage, trunk, colors: [0x4b5a32, 0x4a3d30] };
}

// Tall bare trunk with a ragged crown near the top.
function pine() {
  const tufts = [[0, 0.82, 0, 0.16], [0.1, 0.74, 0.05, 0.12], [-0.09, 0.76, -0.04, 0.12], [0, 0.94, 0, 0.1]];
  const foliage = mergeGeometries(tufts.map(([x, y, z, r]) =>
    new THREE.IcosahedronGeometry(r, 0).scale(1, 0.6, 1).translate(x, y, z)));
  const trunk = new THREE.CylinderGeometry(0.015, 0.03, 0.85, 6).translate(0, 0.425, 0);
  return { foliage, trunk, colors: [0x34432c, 0x5a4636] };
}

// Wide, low, lumpy crown.
function oak() {
  const blobs = [[0, 0.62, 0, 0.3], [0.3, 0.55, 0.1, 0.24], [-0.28, 0.58, -0.05, 0.26],
    [0.05, 0.56, 0.3, 0.22], [-0.05, 0.6, -0.3, 0.22], [0.1, 0.82, 0, 0.2]];
  const foliage = mergeGeometries(blobs.map(([x, y, z, r]) =>
    new THREE.IcosahedronGeometry(r, 1).scale(1, 0.75, 1).translate(x, y, z)));
  const trunk = new THREE.CylinderGeometry(0.04, 0.07, 0.55, 7).translate(0, 0.27, 0);
  return { foliage, trunk, colors: [0x43532c, 0x4a3d30] };
}

// Narrow column, like a Lombardy poplar.
function poplar() {
  const foliage = new THREE.IcosahedronGeometry(0.5, 1).scale(0.26, 0.85, 0.26).translate(0, 0.55, 0);
  const trunk = new THREE.CylinderGeometry(0.02, 0.035, 0.25, 6).translate(0, 0.12, 0);
  return { foliage, trunk, colors: [0x55643a, 0x4a3f33] };
}

// A dead tree: trunk and bare limbs, no leaves.
function bare() {
  const limb = (len, r, tiltZ, yaw, y) => new THREE.CylinderGeometry(r * 0.4, r, len, 5)
    .translate(0, len / 2, 0).rotateZ(tiltZ).rotateY(yaw).translate(0, y, 0);
  const foliage = mergeGeometries([
    limb(0.45, 0.025, 0.7, 0, 0.45), limb(0.4, 0.022, 0.8, 2.1, 0.5), limb(0.35, 0.02, 0.6, 4.2, 0.6),
    limb(0.3, 0.015, 0.4, 1.0, 0.75), limb(0.25, 0.012, 0.9, 3.3, 0.7),
  ]);
  const trunk = new THREE.CylinderGeometry(0.02, 0.05, 1, 6).translate(0, 0.5, 0);
  return { foliage, trunk, colors: [0x4b433b, 0x4b433b] };
}

const KINDS = { spruce, pine, broadleaf, oak, poplar, bare };

// trees: [{ kind, x, y, z, h, yaw }]. Returns a group of instanced meshes.
export function plantTrees(trees) {
  const group = new THREE.Group();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const tint = new THREE.Color();
  for (const [kind, make] of Object.entries(KINDS)) {
    const list = trees.filter((t) => t.kind === kind);
    if (!list.length) continue;
    const shape = make();
    [shape.foliage, shape.trunk].forEach((geo, part) => {
      const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((t, i) => {
        q.setFromAxisAngle(up, t.yaw);
        const w = t.h * (t.spread ?? 1);
        m.compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(w, t.h, w));
        mesh.setMatrixAt(i, m);
        tint.setHex(shape.colors[part]).multiplyScalar(0.85 + ((i * 0.618) % 1) * 0.3);
        mesh.setColorAt(i, tint);
      });
      group.add(mesh);
    });
  }
  return group;
}
