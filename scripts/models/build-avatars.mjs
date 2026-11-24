#!/usr/bin/env node
/**
 * Construye los avatares 3D modulares CC0 (avatar-masculino.glb y avatar-femenino.glb)
 * a partir del pack Quaternius Modular Men & Women (CC0-1.0).
 *
 * Operaciones realizadas por avatar:
 *   1. Descarga y cachea en scripts/.cache/avatars/ los .glb fuente CC0.
 *   2. Posa el esqueleto desde T-pose a postura relajada natural (A-pose suave).
 *   3. Hornea CPU skinning por malla usando el glTF Skin propio de cada nodo.
 *   4. Normaliza a 1,75 m de altura, base en y = 0, mirando a +Z.
 *   5. Separa e indexa piezas intercambiables por nombre bajo 3 pivotes:
 *      LowerBody (pantalones, medias, tobillos, Ankle_L, Ankle_R),
 *      UpperBody (camiseta, oversize, hoodie, camisa),
 *      HeadGroup (Head_Base, 5 cabellos, 3 barbas).
 *   6. Unifica materiales PBR nombrados (Mat_Skin, Mat_Hair, Mat_Beard, Mat_Top, ...),
 *      comprime con EXT_meshopt_compression y valida 0 errores con gltf-validator.
 *
 * Uso: node models/build-avatars.mjs
 * Salida: frontend/public/assets/avatars/avatar-masculino.glb y avatar-femenino.glb
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import validator from "gltf-validator";
import { MeshoptDecoder } from "meshoptimizer";
import * as THREE from "three";

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(SCRIPTS, "..");
const CACHE_DIR = path.join(SCRIPTS, ".cache", "avatars");
const OUT_DIR = path.join(REPO, "frontend", "public", "assets", "avatars");
const MANIFEST_PATH = path.join(REPO, "assets", "models", "avatars-manifest.json");
const CLI = path.join(SCRIPTS, "node_modules", "@gltf-transform", "cli", "bin", "cli.js");
const BASE_RAW_URL = "https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb";

const TARGET_HEIGHT = 1.75;

const SOURCES = {
  modular_men: ["Casual", "Casual2", "Beach", "Suit", "Worker"],
  modular_women: ["Casual", "Punk", "Adventurer", "Suit"],
};

function linear(hex) {
  const c = new THREE.Color(hex);
  c.convertSRGBToLinear();
  return [c.r, c.g, c.b, 1];
}

async function ensureCachedGlb(pack, name) {
  const dir = path.join(CACHE_DIR, pack);
  await mkdir(dir, { recursive: true });
  const dest = path.join(dir, `${name}.glb`);
  try {
    const s = await stat(dest);
    if (s.size > 1024) return dest;
  } catch {
    /* descargar */
  }
  const url = `${BASE_RAW_URL}/${pack}/${name}.glb`;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      await writeFile(dest, buf);
      console.log(`Descargado ${pack}/${name}.glb (${(buf.byteLength / 1024).toFixed(0)} KB)`);
      return dest;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  throw lastErr;
}

/** Construye árbol THREE.Object3D desde un Document glTF, posa brazos y hornea skinning. */
async function loadAndBakeSource(filePath) {
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const doc = await io.read(filePath);
  const root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];

  const objMap = new Map();
  const byName = new Map();
  const sceneObj = new THREE.Group();

  function buildNode(gNode) {
    const obj = new THREE.Object3D();
    obj.name = gNode.getName() || "";
    const t = gNode.getTranslation();
    const r = gNode.getRotation();
    const s = gNode.getScale();
    obj.position.set(t[0], t[1], t[2]);
    obj.quaternion.set(r[0], r[1], r[2], r[3]);
    obj.scale.set(s[0], s[1], s[2]);
    objMap.set(gNode, obj);
    if (obj.name) byName.set(obj.name, obj);
    for (const child of gNode.listChildren()) {
      obj.add(buildNode(child));
    }
    return obj;
  }

  for (const child of scene.listChildren()) {
    sceneObj.add(buildNode(child));
  }
  sceneObj.updateMatrixWorld(true);

  // Posa brazos desde T-pose a A-pose relajada natural
  function poseArm(upperName, lowerName, handName) {
    const upper = byName.get(upperName);
    const lower = byName.get(lowerName);
    const hand = byName.get(handName);
    if (!upper || !lower || !hand || !upper.parent) return;

    const pUpper = new THREE.Vector3();
    const pHand = new THREE.Vector3();
    upper.getWorldPosition(pUpper);
    hand.getWorldPosition(pHand);
    const side = pUpper.x >= 0 ? 1 : -1;

    const vCur = pHand.clone().sub(pUpper).normalize();
    const vTargetUpper = new THREE.Vector3(side * 0.25, -0.96, 0.07).normalize();
    const deltaUpper = new THREE.Quaternion().setFromUnitVectors(vCur, vTargetUpper);
    const qUpperW = new THREE.Quaternion();
    const qParentW = new THREE.Quaternion();
    upper.getWorldQuaternion(qUpperW);
    upper.parent.getWorldQuaternion(qParentW);
    upper.quaternion.copy(qParentW.clone().invert().multiply(deltaUpper.multiply(qUpperW)));
    sceneObj.updateMatrixWorld(true);

    // Suave flexión natural en codo/antebrazo
    const pLower = new THREE.Vector3();
    const pHand2 = new THREE.Vector3();
    lower.getWorldPosition(pLower);
    hand.getWorldPosition(pHand2);
    const vLow = pHand2.clone().sub(pLower).normalize();
    const vTargetLower = new THREE.Vector3(side * 0.14, -0.95, 0.23).normalize();
    const deltaLower = new THREE.Quaternion().setFromUnitVectors(vLow, vTargetLower);
    const qLowerW = new THREE.Quaternion();
    const qLowParentW = new THREE.Quaternion();
    lower.getWorldQuaternion(qLowerW);
    lower.parent.getWorldQuaternion(qLowParentW);
    lower.quaternion.copy(qLowParentW.clone().invert().multiply(deltaLower.multiply(qLowerW)));
    sceneObj.updateMatrixWorld(true);
  }

  poseArm("UpperArm.L", "LowerArm.L", "Hand.L");
  poseArm("UpperArm.R", "LowerArm.R", "Hand.R");

  const bones = {};
  for (const bName of ["Hips", "Torso", "Neck", "Head", "Foot.L", "Foot.R", "LowerLeg.L", "LowerLeg.R"]) {
    const o = byName.get(bName);
    if (o) {
      const v = new THREE.Vector3();
      o.getWorldPosition(v);
      bones[bName] = v;
    }
  }

  // Hornear mallas con su respectivo Skin
  const bakedMeshes = new Map();

  for (const gNode of root.listNodes()) {
    const gMesh = gNode.getMesh();
    if (!gMesh) continue;
    const gSkin = gNode.getSkin();
    const nodeObj = objMap.get(gNode);

    let jointMatrices = null;
    if (gSkin) {
      const joints = gSkin.listJoints();
      const ibmArr = gSkin.getInverseBindMatrices()?.getArray();
      jointMatrices = joints.map((jNode, idx) => {
        const jObj = objMap.get(jNode);
        const ibm = new THREE.Matrix4();
        if (ibmArr) ibm.fromArray(ibmArr, idx * 16);
        return jObj.matrixWorld.clone().multiply(ibm);
      });
    }

    const primList = [];
    for (const prim of gMesh.listPrimitives()) {
      const posAcc = prim.getAttribute("POSITION");
      if (!posAcc) continue;
      const normAcc = prim.getAttribute("NORMAL");
      const jointsAcc = prim.getAttribute("JOINTS_0");
      const weightsAcc = prim.getAttribute("WEIGHTS_0");
      const idxAcc = prim.getIndices();

      const count = posAcc.getCount();
      const outPos = new Float32Array(count * 3);
      const outNorm = new Float32Array(count * 3);

      const v = new THREE.Vector3();
      const n = new THREE.Vector3();
      const tmpV = new THREE.Vector3();
      const tmpN = new THREE.Vector3();
      const jv = [0, 0, 0, 0];
      const wv = [0, 0, 0, 0];
      const skinMat = new THREE.Matrix4();
      const normMat = new THREE.Matrix3();

      for (let i = 0; i < count; i++) {
        const pArr = [0, 0, 0];
        posAcc.getElement(i, pArr);
        v.set(pArr[0], pArr[1], pArr[2]);

        if (normAcc) {
          const nArr = [0, 0, 0];
          normAcc.getElement(i, nArr);
          n.set(nArr[0], nArr[1], nArr[2]);
        } else {
          n.set(0, 1, 0);
        }

        if (jointMatrices && jointsAcc && weightsAcc) {
          jointsAcc.getElement(i, jv);
          weightsAcc.getElement(i, wv);
          const wSum = wv[0] + wv[1] + wv[2] + wv[3] || 1;
          skinMat.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
          for (let k = 0; k < 4; k++) {
            const w = wv[k] / wSum;
            if (w <= 0) continue;
            const jm = jointMatrices[jv[k]]?.elements;
            if (!jm) continue;
            for (let m = 0; m < 16; m++) skinMat.elements[m] += jm[m] * w;
          }
          tmpV.copy(v).applyMatrix4(skinMat);
          normMat.getNormalMatrix(skinMat);
          tmpN.copy(n).applyMatrix3(normMat).normalize();
        } else {
          tmpV.copy(v).applyMatrix4(nodeObj.matrixWorld);
          normMat.getNormalMatrix(nodeObj.matrixWorld);
          tmpN.copy(n).applyMatrix3(normMat).normalize();
        }

        outPos[i * 3] = tmpV.x;
        outPos[i * 3 + 1] = tmpV.y;
        outPos[i * 3 + 2] = tmpV.z;
        outNorm[i * 3] = tmpN.x;
        outNorm[i * 3 + 1] = tmpN.y;
        outNorm[i * 3 + 2] = tmpN.z;
      }

      let indices = null;
      if (idxAcc) {
        indices = new Uint32Array(idxAcc.getArray());
      } else {
        indices = new Uint32Array(count);
        for (let i = 0; i < count; i++) indices[i] = i;
      }

      const matName = prim.getMaterial()?.getName() || "Default";
      primList.push({
        materialName: matName,
        positions: outPos,
        normals: outNorm,
        indices,
      });
    }

    bakedMeshes.set(gMesh.getName() || gNode.getName(), primList);
  }

  return { meshes: bakedMeshes, bones };
}

/** Calcula bounds [min, max] de una lista de primitivas. */
function measurePrimitives(prims) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of prims) {
    const pos = p.positions;
    for (let i = 0; i < pos.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        if (pos[i + k] < min[k]) min[k] = pos[i + k];
        if (pos[i + k] > max[k]) max[k] = pos[i + k];
      }
    }
  }
  return { min, max };
}

/** Normaliza primitivas (escala uniforme + traslación) y opcionalmente remapea materiales. */
function normalizePrimitives(
  prims,
  {
    scale,
    offset,
    pivot = [0, 0, 0],
    materialMap,
    scaleXZ = 1,
    fabricScaleXZ = 1,
    fabricDropY = 0,
  },
) {
  const out = [];
  for (const p of prims) {
    const mapped = materialMap ? materialMap(p.materialName, p) : p.materialName;
    if (!mapped) continue;

    const isFabric = mapped !== "Mat_Skin" && mapped !== "Mat_SkinShade";
    const pos = new Float32Array(p.positions.length);
    const norm = new Float32Array(p.normals.length);
    for (let i = 0; i < pos.length; i += 3) {
      const baseX = p.positions[i] * scale + offset[0] - pivot[0];
      const baseY = p.positions[i + 1] * scale + offset[1] - pivot[1];
      const baseZ = p.positions[i + 2] * scale + offset[2] - pivot[2];

      let xzMul = scaleXZ;
      let yDrop = 0;
      if (isFabric && (fabricScaleXZ !== 1 || fabricDropY !== 0)) {
        const relaxT = Math.max(0, Math.min(1, (0.37 - baseY) / 0.34));
        xzMul *= 1 + (fabricScaleXZ - 1) * (0.35 + 0.65 * relaxT);
        yDrop = fabricDropY * relaxT;
      }

      pos[i] = baseX * xzMul;
      pos[i + 1] = baseY + yDrop;
      pos[i + 2] = baseZ * xzMul;

      let nx = p.normals[i] / xzMul;
      let ny = p.normals[i + 1];
      let nz = p.normals[i + 2] / xzMul;
      const len = Math.hypot(nx, ny, nz) || 1;
      norm[i] = nx / len;
      norm[i + 1] = ny / len;
      norm[i + 2] = nz / len;
    }

    out.push({
      materialName: mapped,
      positions: pos,
      normals: norm,
      indices: new Uint32Array(p.indices),
    });
  }
  return out;
}

/** Convierte una THREE.BufferGeometry en formato de primitiva normalizada. */
function geoToPrim(geo, materialName) {
  const nonIdx = geo.index ? geo : geo.toNonIndexed();
  nonIdx.computeVertexNormals();
  const pos = new Float32Array(nonIdx.attributes.position.array);
  const norm = new Float32Array(nonIdx.attributes.normal.array);
  let indices;
  if (nonIdx.index) {
    indices = new Uint32Array(nonIdx.index.array);
  } else {
    const count = pos.length / 3;
    indices = new Uint32Array(count);
    for (let i = 0; i < count; i++) indices[i] = i;
  }
  return { materialName, positions: pos, normals: norm, indices };
}

/** Combina primitivas con el mismo nombre de material destino. */
function mergeByMaterial(prims) {
  const byMat = new Map();
  for (const p of prims) {
    if (!byMat.has(p.materialName)) byMat.set(p.materialName, []);
    byMat.get(p.materialName).push(p);
  }
  const merged = [];
  for (const [materialName, list] of byMat) {
    if (list.length === 1) {
      merged.push(list[0]);
      continue;
    }
    let totalVerts = 0;
    let totalIdx = 0;
    for (const item of list) {
      totalVerts += item.positions.length / 3;
      totalIdx += item.indices.length;
    }
    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const indices = new Uint32Array(totalIdx);
    let vOff = 0;
    let iOff = 0;
    for (const item of list) {
      const vCount = item.positions.length / 3;
      positions.set(item.positions, vOff * 3);
      normals.set(item.normals, vOff * 3);
      for (let k = 0; k < item.indices.length; k++) {
        indices[iOff + k] = item.indices[k] + vOff;
      }
      vOff += vCount;
      iOff += item.indices.length;
    }
    merged.push({ materialName, positions, normals, indices });
  }
  return merged;
}

/**
 * Recorta limpiamente una malla de pantalón por encima de `cutY` para convertirla en
 * bermuda/pantaloneta, proyectando los vértices inferiores al borde `cutY`.
 */
function clipLegsAboveY(prims, cutY, materialName = "Mat_Bottom") {
  const out = [];
  for (const p of prims) {
    const pos = p.positions;
    const triIdx = p.indices;
    const kept = [];
    for (let i = 0; i < triIdx.length; i += 3) {
      const a = triIdx[i];
      const b = triIdx[i + 1];
      const c = triIdx[i + 2];
      const ya = pos[a * 3 + 1];
      const yb = pos[b * 3 + 1];
      const yc = pos[c * 3 + 1];
      if (ya >= cutY - 0.035 || yb >= cutY - 0.035 || yc >= cutY - 0.035) {
        kept.push(a, b, c);
      }
    }
    if (!kept.length) continue;
    const remap = new Map();
    const newPos = [];
    const newNorm = [];
    const newIdx = [];
    for (const oldIdx of kept) {
      let ni = remap.get(oldIdx);
      if (ni === undefined) {
        ni = newPos.length / 3;
        remap.set(oldIdx, ni);
        const y = pos[oldIdx * 3 + 1];
        const clampedY = Math.max(cutY, y);
        // Ligeramente acampanado/suelto en el dobladillo para que no atraviese la pierna
        const flare = y < cutY ? 1.04 : 1.0;
        newPos.push(pos[oldIdx * 3] * flare, clampedY, pos[oldIdx * 3 + 2] * flare);
        newNorm.push(p.normals[oldIdx * 3], p.normals[oldIdx * 3 + 1], p.normals[oldIdx * 3 + 2]);
      }
      newIdx.push(ni);
    }
    out.push({
      materialName,
      positions: new Float32Array(newPos),
      normals: new Float32Array(newNorm),
      indices: new Uint32Array(newIdx),
    });
  }
  return out;
}

/** Construye piernas desnudas anatómicas desde `topY` hasta `bottomY` en `ankleX`. */
function buildBareLegsAndBridge({ leftX, rightX, z, topY, bottomY, topR, midR, botR, matName = "Mat_Skin" }) {
  const prims = [];
  for (const x of [leftX, rightX]) {
    // Muslo/rodilla a pantorrilla
    const midY = bottomY + (topY - bottomY) * 0.45;
    if (topY > midY + 0.02) {
      const upper = new THREE.CylinderGeometry(topR, midR, topY - midY + 0.02, 18, 1);
      upper.translate(x, (topY + midY) * 0.5, z);
      prims.push(geoToPrim(upper, matName));
    }
    const lower = new THREE.CylinderGeometry(midR, botR, midY - bottomY + 0.02, 18, 1);
    lower.translate(x, (midY + bottomY) * 0.5, z);
    prims.push(geoToPrim(lower, matName));
  }
  return prims;
}

/** Medias suaves en ambos tobillos. */
function buildSocks({ leftX, rightX, z, topY, bottomY = 0.045, topRadius = 0.048, botRadius = 0.042 }) {
  const prims = [];
  const h = topY - bottomY;
  for (const x of [leftX, rightX]) {
    const cyl = new THREE.CylinderGeometry(topRadius, botRadius, h, 20);
    cyl.translate(x, bottomY + h / 2, z);
    prims.push(geoToPrim(cyl, "Mat_Socks"));
    const cuff = new THREE.TorusGeometry(topRadius, 0.0045, 8, 20);
    cuff.rotateX(Math.PI / 2);
    cuff.translate(x, topY - 0.004, z);
    prims.push(geoToPrim(cuff, "Mat_Socks"));
  }
  return prims;
}

/** Geometrías de cabello complementarias cuando hace falta (rapado, melena larga). */
function buildBuzzCut(headBox) {
  const cx = (headBox.min[0] + headBox.max[0]) / 2;
  const cz = (headBox.min[2] + headBox.max[2]) / 2;
  const rx = (headBox.max[0] - headBox.min[0]) * 0.46;
  const ry = (headBox.max[1] - headBox.min[1]) * 0.44;
  const rz = (headBox.max[2] - headBox.min[2]) * 0.47;
  const cy = headBox.max[1] - ry * 0.86;
  // Casquete craneal superior y trasero (evita cubrir la cara en +Z)
  const cap = new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.54);
  cap.scale(rx, ry, rz);
  cap.rotateX(-0.24);
  cap.translate(cx, cy + 0.004, cz - rz * 0.08);
  return [geoToPrim(cap, "Mat_Hair")];
}

function buildTexturedCrown(headBox) {
  const cx = (headBox.min[0] + headBox.max[0]) / 2;
  const cz = (headBox.min[2] + headBox.max[2]) / 2;
  const rx = (headBox.max[0] - headBox.min[0]) * 0.56;
  const ry = (headBox.max[1] - headBox.min[1]) * 0.48;
  const rz = (headBox.max[2] - headBox.min[2]) * 0.56;
  const topY = headBox.max[1] - ry * 0.55;
  const list = [];
  const main = new THREE.SphereGeometry(1, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62);
  main.scale(rx, ry, rz);
  main.rotateX(-0.26);
  main.translate(cx, topY + 0.014, cz - rz * 0.1);
  list.push(geoToPrim(main, "Mat_Hair"));
  // Volumen rizado superior / nuca
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 1.9;
    const puff = new THREE.SphereGeometry(rx * 0.48, 12, 10);
    puff.translate(
      cx + Math.sin(a) * rx * 0.52,
      headBox.max[1] - 0.028,
      cz - rz * 0.25 - Math.cos(a) * rz * 0.28,
    );
    list.push(geoToPrim(puff, "Mat_Hair"));
  }
  return list;
}

function buildFemaleLongBack(headBox) {
  const cx = (headBox.min[0] + headBox.max[0]) / 2;
  const cz = (headBox.min[2] + headBox.max[2]) / 2;
  const w = (headBox.max[0] - headBox.min[0]) * 0.54;
  const drape = new THREE.CylinderGeometry(w * 0.85, w * 1.05, 0.24, 18, 1, false, Math.PI * 0.55, Math.PI * 0.9);
  drape.translate(cx, headBox.min[1] - 0.02, cz - 0.015);
  return [geoToPrim(drape, "Mat_Hair")];
}

/** Construye 3 estilos de barba ajustados exactamente a la mandíbula de `Head_Base`. */
function buildBeards(headBox, moustachePrims) {
  const cx = (headBox.min[0] + headBox.max[0]) / 2;
  const w = headBox.max[0] - headBox.min[0];
  const h = headBox.max[1] - headBox.min[1];
  const d = headBox.max[2] - headBox.min[2];
  const jawY = headBox.min[1] + h * 0.26;
  const frontZ = headBox.max[2] - d * 0.14;

  // 1. Sombra (barba muy pegada de 3 días en mandíbula)
  const sombraGeo = new THREE.CylinderGeometry(
    w * 0.37,
    w * 0.29,
    h * 0.22,
    20,
    1,
    false,
    -Math.PI * 0.42,
    Math.PI * 0.84,
  );
  sombraGeo.scale(1, 1, 0.95);
  sombraGeo.translate(cx, jawY + 0.01, frontZ - w * 0.27);
  const Beard_sombra = [geoToPrim(sombraGeo, "Mat_Beard")];

  // 2. Candado (bigote + perilla en mentón)
  const candadoList = [];
  if (moustachePrims?.length) {
    candadoList.push(...moustachePrims.map((p) => ({ ...p, materialName: "Mat_Beard" })));
  } else {
    const stache = new THREE.CapsuleGeometry(0.008, w * 0.22, 6, 10);
    stache.rotateZ(Math.PI / 2);
    stache.translate(cx, jawY + h * 0.1, frontZ + 0.005);
    candadoList.push(geoToPrim(stache, "Mat_Beard"));
  }
  const goatee = new THREE.SphereGeometry(w * 0.19, 14, 12);
  goatee.scale(1, 1.15, 0.72);
  goatee.translate(cx, jawY - 0.006, frontZ - 0.005);
  candadoList.push(geoToPrim(goatee, "Mat_Beard"));

  // 3. Completa (bigote + barba mandibular completa redondeada)
  const fullList = [];
  if (moustachePrims?.length) {
    fullList.push(...moustachePrims.map((p) => ({ ...p, materialName: "Mat_Beard" })));
  }
  const fullJaw = new THREE.CylinderGeometry(
    w * 0.41,
    w * 0.27,
    h * 0.3,
    22,
    1,
    false,
    -Math.PI * 0.48,
    Math.PI * 0.96,
  );
  fullJaw.translate(cx, jawY - 0.004, frontZ - w * 0.28);
  fullList.push(geoToPrim(fullJaw, "Mat_Beard"));
  const chinCap = new THREE.SphereGeometry(w * 0.27, 16, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
  chinCap.scale(1, 0.75, 0.92);
  chinCap.translate(cx, jawY - h * 0.15, frontZ - w * 0.28);
  fullList.push(geoToPrim(chinCap, "Mat_Beard"));

  return { Beard_sombra, Beard_candado: candadoList, Beard_completa: fullList };
}

/** Añade capucha y bolsillo canguro sobre una malla de hoodie. */
function buildHoodieExtras(bodyBox, topY) {
  const cx = (bodyBox.min[0] + bodyBox.max[0]) / 2;
  const cz = (bodyBox.min[2] + bodyBox.max[2]) / 2;
  const w = bodyBox.max[0] - bodyBox.min[0];
  const d = bodyBox.max[2] - bodyBox.min[2];
  const list = [];

  const hood = new THREE.TorusGeometry(0.088, 0.036, 12, 24);
  hood.rotateX(Math.PI * 0.42);
  hood.translate(cx, topY - 0.045, cz - 0.025);
  list.push(geoToPrim(hood, "Mat_Top"));

  const pocket = new THREE.BoxGeometry(w * 0.34, 0.11, 0.026);
  pocket.translate(cx, bodyBox.min[1] + 0.13, bodyBox.max[2] - d * 0.16);
  list.push(geoToPrim(pocket, "Mat_TopAccent"));

  for (const side of [-1, 1]) {
    const cord = new THREE.CylinderGeometry(0.004, 0.004, 0.12, 8);
    cord.translate(cx + side * 0.032, topY - 0.12, bodyBox.max[2] - d * 0.14);
    list.push(geoToPrim(cord, "Mat_TopAccent"));
  }
  return list;
}

/** Añade bolsillos cargo laterales sobre un pantalón. */
function buildCargoPockets(legsBox) {
  const list = [];
  const y = legsBox.min[1] + (legsBox.max[1] - legsBox.min[1]) * 0.56;
  const z = (legsBox.min[2] + legsBox.max[2]) / 2 + 0.005;
  const halfSpan = (legsBox.max[0] - legsBox.min[0]) * 0.49;
  const cx = (legsBox.min[0] + legsBox.max[0]) / 2;
  for (const side of [-1, 1]) {
    const pock = new THREE.BoxGeometry(0.028, 0.125, 0.095);
    pock.translate(cx + side * halfSpan, y, z);
    list.push(geoToPrim(pock, "Mat_BottomAccent"));
  }
  return list;
}

/** Crea un nodo glTF con malla multi-primitiva y sus accesores en el Document. */
function createPartNode(doc, buffer, materials, name, prims, translation = [0, 0, 0]) {
  const merged = mergeByMaterial(prims);
  const mesh = doc.createMesh(name);
  for (const p of merged) {
    if (!p.positions.length || !p.indices.length) continue;
    const mat = materials.get(p.materialName);
    if (!mat) continue;
    const posAcc = doc.createAccessor().setType("VEC3").setArray(p.positions).setBuffer(buffer);
    const normAcc = doc.createAccessor().setType("VEC3").setArray(p.normals).setBuffer(buffer);
    const idxArr =
      p.positions.length / 3 > 65535 ? new Uint32Array(p.indices) : new Uint16Array(p.indices);
    const idxAcc = doc.createAccessor().setType("SCALAR").setArray(idxArr).setBuffer(buffer);
    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", posAcc)
      .setAttribute("NORMAL", normAcc)
      .setIndices(idxAcc)
      .setMaterial(mat);
    mesh.addPrimitive(prim);
  }
  const node = doc.createNode(name).setTranslation(translation);
  if (mesh.listPrimitives().length > 0) node.setMesh(mesh);
  return node;
}

async function buildAvatar(gender) {
  const pack = gender === "masculino" ? "modular_men" : "modular_women";
  const loaded = {};
  for (const variant of SOURCES[pack]) {
    const file = await ensureCachedGlb(pack, variant);
    loaded[variant] = await loadAndBakeSource(file);
  }

  const base = loaded.Casual;
  const allBasePrims = [...base.meshes.values()].flat();
  const baseBounds = measurePrimitives(allBasePrims);
  const rawHeight = baseBounds.max[1] - baseBounds.min[1];
  const normScale = TARGET_HEIGHT / rawHeight;

  const footL = base.bones["Foot.L"] ?? new THREE.Vector3(0.001, 0, 0);
  const footR = base.bones["Foot.R"] ?? new THREE.Vector3(-0.001, 0, 0);
  const midX = (footL.x + footR.x) / 2;
  const midZ = (footL.z + footR.z) / 2;

  const baseTransform = {
    scale: normScale,
    offset: [-midX * normScale, -baseBounds.min[1] * normScale, -midZ * normScale],
  };

  function anchorTransform(variant, boneName) {
    const baseB = base.bones[boneName];
    const srcB = loaded[variant].bones[boneName];
    if (!baseB || !srcB) return baseTransform;
    return {
      scale: normScale,
      offset: [
        (baseB.x - srcB.x - midX) * normScale,
        (baseB.y - srcB.y - baseBounds.min[1]) * normScale,
        (baseB.z - srcB.z - midZ) * normScale,
      ],
    };
  }

  const leftAnkleX = (footL.x - midX) * normScale;
  const rightAnkleX = (footR.x - midX) * normScale;
  const ankleZ = (footL.z + footR.z) * 0.5 * normScale - midZ * normScale;

  // Medir pivotes reales (cintura/cadera y cuello)
  const baseBody = normalizePrimitives(base.meshes.get("Casual_Body"), {
    ...baseTransform,
    materialMap: (m) => m,
  });
  const baseHead = normalizePrimitives(base.meshes.get("Casual_Head"), {
    ...baseTransform,
    materialMap: (m) => m,
  });
  const baseLegs = normalizePrimitives(base.meshes.get("Casual_Legs"), {
    ...baseTransform,
    materialMap: (m) => m,
  });

  const bodyBounds = measurePrimitives(baseBody);
  const headBounds = measurePrimitives(baseHead);
  const legsBounds = measurePrimitives(baseLegs);
  const hipY = Number(legsBounds.max[1].toFixed(4));
  const neckY = Number(Math.max(bodyBounds.max[1] - 0.04, headBounds.min[1] + 0.015).toFixed(4));

  // ---- Construir piezas normalizadas ----
  const ankleBridge = buildBareLegsAndBridge({
    leftX: leftAnkleX,
    rightX: rightAnkleX,
    z: ankleZ,
    topY: 0.16,
    bottomY: 0.035,
    topR: 0.043,
    midR: 0.039,
    botR: 0.035,
  });

  const socksTobilleras = buildSocks({
    leftX: leftAnkleX,
    rightX: rightAnkleX,
    z: ankleZ,
    topY: 0.122,
    topRadius: 0.046,
    botRadius: 0.042,
  });
  const socksAltas = buildSocks({
    leftX: leftAnkleX,
    rightX: rightAnkleX,
    z: ankleZ,
    topY: 0.255,
    topRadius: 0.053,
    botRadius: 0.043,
  });

  // Pantalones (LowerBody, origen y = 0)
  const fullPantsSource =
    gender === "masculino"
      ? {
          prims: loaded.Casual2.meshes.get("Casual2_Legs"),
          transform: anchorTransform("Casual2", "Hips"),
        }
      : {
          prims: base.meshes.get("Casual_Legs"),
          transform: baseTransform,
        };

  const Bottom_jean = normalizePrimitives(fullPantsSource.prims, {
    ...fullPantsSource.transform,
    materialMap: (m) => (m === "Skin" ? "Mat_Skin" : "Mat_Bottom"),
  });
  const Bottom_jogger = normalizePrimitives(fullPantsSource.prims, {
    ...fullPantsSource.transform,
    materialMap: (m) => (m === "Skin" ? "Mat_Skin" : "Mat_Bottom"),
  });
  // Puños elásticos de jogger en los tobillos
  for (const x of [leftAnkleX, rightAnkleX]) {
    const cuff = new THREE.CylinderGeometry(0.048, 0.043, 0.046, 18);
    cuff.translate(x, 0.115, ankleZ);
    Bottom_jogger.push(geoToPrim(cuff, "Mat_BottomAccent"));
  }

  let Bottom_cargo;
  if (gender === "masculino") {
    Bottom_cargo = normalizePrimitives(loaded.Worker.meshes.get("Worker_Legs"), {
      ...anchorTransform("Worker", "Hips"),
      materialMap: (m) => (m === "Skin" ? "Mat_Skin" : "Mat_Bottom"),
    });
  } else {
    Bottom_cargo = normalizePrimitives(loaded.Suit.meshes.get("Suit_Legs"), {
      ...anchorTransform("Suit", "Hips"),
      materialMap: (m) => (m === "Skin" ? "Mat_Skin" : "Mat_Bottom"),
    });
  }
  const fullLegsBounds = measurePrimitives(Bottom_jean);
  Bottom_cargo.push(...buildCargoPockets(fullLegsBounds));

  let Bottom_mochos;
  let Bottom_pantaloneta;
  const mochoCutY = hipY * 0.4;
  const shortCutY = hipY * 0.68;
  if (gender === "masculino") {
    // Pantaloneta arriba de la rodilla desde Beach_Legs (bermuda + pantorrillas esculpidas)
    Bottom_pantaloneta = normalizePrimitives(loaded.Beach.meshes.get("Beach_Legs"), {
      ...anchorTransform("Beach", "Hips"),
      materialMap: (m) => {
        if (m === "Skin") return "Mat_Skin";
        if (m === "White") return "Mat_BottomAccent";
        return "Mat_Bottom";
      },
    });
    // Mochos bajo la rodilla recortados sobre el jean completo + pantorrillas
    Bottom_mochos = [
      ...clipLegsAboveY(Bottom_jean, mochoCutY, "Mat_Bottom"),
      ...buildBareLegsAndBridge({
        leftX: leftAnkleX,
        rightX: rightAnkleX,
        z: ankleZ,
        topY: mochoCutY + 0.03,
        bottomY: 0.045,
        topR: 0.052,
        midR: 0.046,
        botR: 0.036,
      }),
    ];
  } else {
    Bottom_mochos = [
      ...clipLegsAboveY(Bottom_jean, mochoCutY, "Mat_Bottom"),
      ...buildBareLegsAndBridge({
        leftX: leftAnkleX,
        rightX: rightAnkleX,
        z: ankleZ,
        topY: mochoCutY + 0.03,
        bottomY: 0.045,
        topR: 0.05,
        midR: 0.044,
        botR: 0.034,
      }),
    ];
    Bottom_pantaloneta = [
      ...clipLegsAboveY(Bottom_jean, shortCutY, "Mat_Bottom"),
      ...buildBareLegsAndBridge({
        leftX: leftAnkleX,
        rightX: rightAnkleX,
        z: ankleZ,
        topY: shortCutY + 0.03,
        bottomY: 0.045,
        topR: 0.06,
        midR: 0.048,
        botR: 0.034,
      }),
    ];
  }

  // Prendas superiores (UpperBody, pivote [0, hipY, 0])
  const upperPivot = [0, hipY, 0];
  let Top_camiseta;
  let Top_oversize;
  let Top_hoodie;
  let Top_camisa;

  if (gender === "masculino") {
    Top_camiseta = normalizePrimitives(loaded.Casual2.meshes.get("Casual2_Body"), {
      ...anchorTransform("Casual2", "Hips"),
      pivot: upperPivot,
      materialMap: (m) => (m === "Skin" ? "Mat_Skin" : "Mat_Top"),
    });
    Top_oversize = normalizePrimitives(loaded.Casual2.meshes.get("Casual2_Body"), {
      ...anchorTransform("Casual2", "Hips"),
      pivot: upperPivot,
      fabricScaleXZ: 1.14,
      fabricDropY: -0.048,
      materialMap: (m) => (m === "Skin" ? "Mat_Skin" : "Mat_Top"),
    });
    Top_hoodie = normalizePrimitives(base.meshes.get("Casual_Body"), {
      ...baseTransform,
      pivot: upperPivot,
      fabricScaleXZ: 1.05,
      fabricDropY: -0.02,
      materialMap: (m) => (m === "Skin" ? "Mat_Skin" : "Mat_Top"),
    });
    const hBox = measurePrimitives(Top_hoodie);
    Top_hoodie.push(...buildHoodieExtras(hBox, hBox.max[1]));

    Top_camisa = normalizePrimitives(loaded.Suit.meshes.get("Suit_Body"), {
      ...anchorTransform("Suit", "Hips"),
      pivot: upperPivot,
      materialMap: (m) => {
        if (m === "Skin") return "Mat_Skin";
        if (m === "Tie") return null; // sin corbata: look sobrecamisa streetwear
        if (m === "White") return "Mat_TopAccent";
        return "Mat_Top";
      },
    });
  } else {
    Top_camiseta = normalizePrimitives(base.meshes.get("Casual_Body"), {
      ...baseTransform,
      pivot: upperPivot,
      materialMap: (m) => (m === "Skin" ? "Mat_Skin" : "Mat_Top"),
    });
    Top_oversize = normalizePrimitives(base.meshes.get("Casual_Body"), {
      ...baseTransform,
      pivot: upperPivot,
      fabricScaleXZ: 1.16,
      fabricDropY: -0.055,
      materialMap: (m) => (m === "Skin" ? "Mat_Skin" : "Mat_Top"),
    });
    Top_hoodie = normalizePrimitives(loaded.Adventurer.meshes.get("Adventurer_Body"), {
      ...anchorTransform("Adventurer", "Hips"),
      pivot: upperPivot,
      fabricScaleXZ: 1.04,
      fabricDropY: -0.015,
      materialMap: (m) => {
        if (m === "Skin") return "Mat_Skin";
        if (m === "Gold") return "Mat_TopAccent";
        return "Mat_Top";
      },
    });
    const hBox = measurePrimitives(Top_hoodie);
    Top_hoodie.push(...buildHoodieExtras(hBox, hBox.max[1]));

    Top_camisa = normalizePrimitives(loaded.Suit.meshes.get("Suit_Body"), {
      ...anchorTransform("Suit", "Hips"),
      pivot: upperPivot,
      materialMap: (m) => {
        if (m === "Skin") return "Mat_Skin";
        if (m === "White") return "Mat_TopAccent";
        return "Mat_Top";
      },
    });
  }

  // Cabeza + cabellos + barbas (HeadGroup, pivote [0, neckY, 0])
  const headPivot = [0, neckY, 0];
  let Head_Base;
  let Hair_rapado;
  let Hair_corto;
  let Hair_urbano;
  let Hair_ondulado;
  let Hair_largo;
  let beards = null;

  if (gender === "masculino") {
    Head_Base = normalizePrimitives(base.meshes.get("Casual_Head"), {
      ...baseTransform,
      pivot: headPivot,
      materialMap: (m) => {
        if (m === "Skin") return "Mat_Skin";
        if (m === "Eyebrows") return "Mat_Eyebrows";
        if (m === "Eye") return "Mat_Eye";
        return null;
      },
    });
    const localHeadBox = measurePrimitives(Head_Base);
    Hair_rapado = buildBuzzCut(localHeadBox);

    Hair_corto = normalizePrimitives(base.meshes.get("Casual_Head"), {
      ...baseTransform,
      pivot: headPivot,
      materialMap: (m) => (m === "Hair" ? "Mat_Hair" : null),
    });
    Hair_urbano = normalizePrimitives(loaded.Casual2.meshes.get("Casual2_Head"), {
      ...anchorTransform("Casual2", "Head"),
      pivot: headPivot,
      materialMap: (m) => (m === "Hair" ? "Mat_Hair" : null),
    });
    Hair_ondulado = normalizePrimitives(loaded.Beach.meshes.get("Beach_Head"), {
      ...anchorTransform("Beach", "Head"),
      pivot: headPivot,
      materialMap: (m) => (m === "Hair" ? "Mat_Hair" : null),
    });
    Hair_largo = buildTexturedCrown(localHeadBox);

    const moustache = normalizePrimitives(loaded.Worker.meshes.get("Worker_Head"), {
      ...anchorTransform("Worker", "Head"),
      pivot: headPivot,
      materialMap: (m) => (m === "Moustache" ? "Mat_Beard" : null),
    });
    beards = buildBeards(localHeadBox, moustache);
  } else {
    Head_Base = normalizePrimitives(base.meshes.get("Casual_Head"), {
      ...baseTransform,
      pivot: headPivot,
      materialMap: (m) => {
        if (m === "Skin") return "Mat_Skin";
        if (m === "Hair_Brown") return "Mat_Eyebrows";
        if (m === "Brown") return "Mat_Eye";
        return null; // omite Hair_Blond
      },
    });
    const localHeadBox = measurePrimitives(Head_Base);
    Hair_rapado = buildBuzzCut(localHeadBox);

    Hair_corto = normalizePrimitives(loaded.Adventurer.meshes.get("Adventurer_Head"), {
      ...anchorTransform("Adventurer", "Head"),
      pivot: headPivot,
      materialMap: (m) => (m === "Hair_Brown" ? "Mat_Hair" : null),
    });
    Hair_urbano = normalizePrimitives(loaded.Punk.meshes.get("Punk_Head"), {
      ...anchorTransform("Punk", "Head"),
      pivot: headPivot,
      materialMap: (m) => (m === "Pink" || m === "Black" ? "Mat_Hair" : null),
    });
    Hair_ondulado = normalizePrimitives(base.meshes.get("Casual_Head"), {
      ...baseTransform,
      pivot: headPivot,
      materialMap: (m) => (m === "Hair_Blond" ? "Mat_Hair" : null),
    });
    Hair_largo = [
      ...normalizePrimitives(base.meshes.get("Casual_Head"), {
        ...baseTransform,
        pivot: headPivot,
        materialMap: (m) => (m === "Hair_Blond" ? "Mat_Hair" : null),
      }),
      ...buildFemaleLongBack(localHeadBox),
    ];
  }

  // ---- Ensamblar glTF Document ----
  const doc = new Document();
  doc.getRoot().getAsset().generator = "KeyStreet build-avatars (Quaternius CC0)";
  const buffer = doc.createBuffer();
  const scene = doc.createScene(`avatar-${gender}`);
  doc.getRoot().setDefaultScene(scene);

  const matSpecs = [
    ["Mat_Skin", "#DFAC84", 0.66, 0.02],
    ["Mat_SkinShade", "#C6936B", 0.72, 0.02],
    ["Mat_Eye", "#1B1918", 0.25, 0.05],
    ["Mat_Eyebrows", "#241914", 0.85, 0.0],
    ["Mat_Hair", "#181616", 0.78, 0.02],
    ["Mat_Beard", "#181616", 0.86, 0.0],
    ["Mat_Top", "#F4F4F2", 0.84, 0.0],
    ["Mat_TopAccent", "#DCDCD8", 0.78, 0.0],
    ["Mat_Bottom", "#4E6A93", 0.88, 0.0],
    ["Mat_BottomAccent", "#3B5274", 0.84, 0.0],
    ["Mat_Socks", "#F7F7F5", 0.94, 0.0],
  ];
  const materials = new Map();
  for (const [mName, hex, rough, metal] of matSpecs) {
    materials.set(
      mName,
      doc
        .createMaterial(mName)
        .setBaseColorFactor(linear(hex))
        .setRoughnessFactor(rough)
        .setMetallicFactor(metal),
    );
  }

  const lowerBody = doc
    .createNode("LowerBody")
    .setTranslation([0, 0, 0])
    .setExtras({ hipY, neckY, leftAnkleX, rightAnkleX, ankleZ });
  lowerBody.addChild(createPartNode(doc, buffer, materials, "Ankle_Bridge", ankleBridge));
  lowerBody.addChild(createPartNode(doc, buffer, materials, "Bottom_jean", Bottom_jean));
  lowerBody.addChild(createPartNode(doc, buffer, materials, "Bottom_jogger", Bottom_jogger));
  lowerBody.addChild(createPartNode(doc, buffer, materials, "Bottom_cargo", Bottom_cargo));
  lowerBody.addChild(createPartNode(doc, buffer, materials, "Bottom_mochos", Bottom_mochos));
  lowerBody.addChild(createPartNode(doc, buffer, materials, "Bottom_pantaloneta", Bottom_pantaloneta));
  lowerBody.addChild(createPartNode(doc, buffer, materials, "Socks_tobilleras", socksTobilleras));
  lowerBody.addChild(createPartNode(doc, buffer, materials, "Socks_altas", socksAltas));
  lowerBody.addChild(doc.createNode("Ankle_L").setTranslation([leftAnkleX, 0, ankleZ]));
  lowerBody.addChild(doc.createNode("Ankle_R").setTranslation([rightAnkleX, 0, ankleZ]));

  const upperBody = doc.createNode("UpperBody").setTranslation(upperPivot);
  upperBody.addChild(createPartNode(doc, buffer, materials, "Top_camiseta", Top_camiseta));
  upperBody.addChild(createPartNode(doc, buffer, materials, "Top_oversize", Top_oversize));
  upperBody.addChild(createPartNode(doc, buffer, materials, "Top_hoodie", Top_hoodie));
  upperBody.addChild(createPartNode(doc, buffer, materials, "Top_camisa", Top_camisa));

  const headGroup = doc.createNode("HeadGroup").setTranslation(headPivot);
  headGroup.addChild(createPartNode(doc, buffer, materials, "Head_Base", Head_Base));
  headGroup.addChild(createPartNode(doc, buffer, materials, "Hair_rapado", Hair_rapado));
  headGroup.addChild(createPartNode(doc, buffer, materials, "Hair_corto", Hair_corto));
  headGroup.addChild(createPartNode(doc, buffer, materials, "Hair_urbano", Hair_urbano));
  headGroup.addChild(createPartNode(doc, buffer, materials, "Hair_ondulado", Hair_ondulado));
  headGroup.addChild(createPartNode(doc, buffer, materials, "Hair_largo", Hair_largo));
  if (beards) {
    headGroup.addChild(createPartNode(doc, buffer, materials, "Beard_sombra", beards.Beard_sombra));
    headGroup.addChild(createPartNode(doc, buffer, materials, "Beard_candado", beards.Beard_candado));
    headGroup.addChild(createPartNode(doc, buffer, materials, "Beard_completa", beards.Beard_completa));
  }

  scene.addChild(lowerBody);
  scene.addChild(upperBody);
  scene.addChild(headGroup);

  await mkdir(OUT_DIR, { recursive: true });
  const rawOut = path.join(CACHE_DIR, `avatar-${gender}.raw.glb`);
  const finalOut = path.join(OUT_DIR, `avatar-${gender}.glb`);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  await io.write(rawOut, doc);
  execFileSync(process.execPath, [CLI, "weld", rawOut, rawOut], { stdio: "pipe" });
  execFileSync(process.execPath, [CLI, "meshopt", rawOut, finalOut], { stdio: "pipe" });

  const finalBytes = new Uint8Array(await readFile(finalOut));
  const report = await validator.validateBytes(finalBytes, { maxIssues: 30 });
  if (report.issues.numErrors > 0) {
    console.error(report.issues.messages);
    throw new Error(`gltf-validator encontró ${report.issues.numErrors} errores en avatar-${gender}.glb`);
  }
  console.log(
    `OK avatar-${gender}.glb -> ${(finalBytes.byteLength / 1024).toFixed(1)} KB | errores: ${report.issues.numErrors} | hipY=${hipY}m neckY=${neckY}m ankles=(${leftAnkleX.toFixed(3)}, ${rightAnkleX.toFixed(3)}, z=${ankleZ.toFixed(3)})`,
  );
  return {
    url: `/assets/avatars/avatar-${gender}.glb`,
    bytes: finalBytes.byteLength,
    hipY,
    neckY,
    leftAnkleX: Number(leftAnkleX.toFixed(4)),
    rightAnkleX: Number(rightAnkleX.toFixed(4)),
    ankleZ: Number(ankleZ.toFixed(4)),
    validatorErrors: report.issues.numErrors,
  };
}

async function main() {
  await MeshoptDecoder.ready;
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });

  const masculino = await buildAvatar("masculino");
  const femenino = await buildAvatar("femenino");

  const manifest = {
    $comment: "Avatares 3D modulares CC0-1.0 derivados de Quaternius Modular Men & Women.",
    license: "CC0-1.0",
    author: "Quaternius (Modular Men / Modular Women), normalizado y ensamblado por Key Street",
    sourceUrl: "https://quaternius.com",
    generatedAt: new Date().toISOString().slice(0, 10),
    avatars: { masculino, femenino },
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Manifiesto escrito en ${path.relative(REPO, MANIFEST_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
