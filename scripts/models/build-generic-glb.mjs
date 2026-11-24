#!/usr/bin/env node
/**
 * Genera modelos 3D GLB orgánicos y diferenciados por silueta/arquetipo para los
 * 15 pares del catálogo Key Street (Court, Terrace, Y2K Skate, High-Top, Runner).
 *
 * Convención del proyecto (verificada por validate-models.mjs):
 *   - +Y arriba, punta hacia +X, talón hacia -X
 *   - centrado en X/Z, base apoyada en y = 0
 *   - largo exacto ≈ 0,29 m (rango aceptado 0,28–0,30 m)
 *   - sin texturas externas (solo factores PBR) y compresión EXT_meshopt_compression
 *
 * Uso: node models/build-generic-glb.mjs [slug ...]
 * Salida: frontend/public/assets/models/{slug}.glb
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document, NodeIO } from "@gltf-transform/core";
import * as THREE from "three";

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(SCRIPTS, "..");
const CATALOG = path.join(SCRIPTS, "catalog", "catalog.json");
const MANIFEST = path.join(REPO, "assets", "models", "manifest.json");
const OUT_DIR = path.join(REPO, "frontend", "public", "assets", "models");
const TMP = path.join(SCRIPTS, ".cache", "models");
const CLI = path.join(SCRIPTS, "node_modules", "@gltf-transform", "cli", "bin", "cli.js");

const TARGET_LENGTH = 0.29;

function linear(hex) {
  const c = new THREE.Color(hex);
  c.convertSRGBToLinear();
  return [c.r, c.g, c.b, 1];
}

function shadeHex(hex, factor) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return `#${c.getHexString()}`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Ancho anatómico de horma (u = 0 talón → u = 1 punta). */
function lastHalfWidth(u, widthMul = 1) {
  let w;
  if (u < 0.16) {
    const t = u / 0.16;
    w = 0.012 + 0.025 * Math.sin((t * Math.PI) / 2);
  } else if (u < 0.42) {
    const t = (u - 0.16) / 0.26;
    w = lerp(0.037, 0.0365, Math.sin(t * Math.PI) * 0.4 + t * 0.6);
  } else if (u < 0.74) {
    const t = (u - 0.42) / 0.32;
    w = lerp(0.0365, 0.0475, smoothstep(0, 1, t));
  } else {
    const t = (u - 0.74) / 0.26;
    w = 0.0475 * Math.pow(Math.max(0, 1 - Math.pow(t, 1.55)), 0.58);
  }
  return Math.max(0.0025, w * widthMul);
}

/** Ligera elevación de la punta (toe spring). */
function toeSpringY(u, amount = 0.008) {
  if (u <= 0.68) return 0;
  const t = (u - 0.68) / 0.32;
  return amount * Math.pow(t, 1.85);
}

/**
 * Construye una malla sólida suavizada mediante secciones transversales (lofting)
 * con bordes superior/inferior redondeados tipo súper-elipse y tapas cerradas.
 */
function buildLoft(slices, ringSegs = 28) {
  const positions = [];
  const indices = [];
  const rings = slices.length;

  for (let i = 0; i < rings; i++) {
    const s = slices[i];
    const yc = (s.yBottom + s.yTop) * 0.5;
    const ry = Math.max(0.0012, (s.yTop - s.yBottom) * 0.5);
    const rz = Math.max(0.0015, s.zHalf);
    const exp = s.boxiness ?? 0.78;
    const pinchTop = s.pinchTop ?? 0.86;
    const zOff = s.zOffset ?? 0;

    for (let j = 0; j < ringSegs; j++) {
      const theta = (j / ringSegs) * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const sy = Math.sign(sinT) * Math.pow(Math.abs(sinT), exp);
      const sz = Math.sign(cosT) * Math.pow(Math.abs(cosT), exp);
      const topTaper = sinT > 0 ? lerp(1, pinchTop, sinT) : 1;
      const y = yc + ry * sy;
      const z = zOff + rz * sz * topTaper;
      positions.push(s.x, y, z);
    }
  }

  for (let i = 0; i < rings - 1; i++) {
    const a0 = i * ringSegs;
    const b0 = (i + 1) * ringSegs;
    for (let j = 0; j < ringSegs; j++) {
      const jn = (j + 1) % ringSegs;
      const a = a0 + j;
      const b = a0 + jn;
      const c = b0 + j;
      const d = b0 + jn;
      indices.push(a, c, b, b, c, d);
    }
  }

  // Tapa trasera (u = 0)
  const first = slices[0];
  const startCenterIdx = positions.length / 3;
  positions.push(first.x - 0.002, (first.yBottom + first.yTop) * 0.5, first.zOffset ?? 0);
  for (let j = 0; j < ringSegs; j++) {
    const jn = (j + 1) % ringSegs;
    indices.push(startCenterIdx, j, jn);
  }

  // Tapa delantera (u = 1)
  const last = slices[rings - 1];
  const endCenterIdx = positions.length / 3;
  positions.push(last.x + 0.002, (last.yBottom + last.yTop) * 0.5, last.zOffset ?? 0);
  const lastBase = (rings - 1) * ringSegs;
  for (let j = 0; j < ringSegs; j++) {
    const jn = (j + 1) % ringSegs;
    indices.push(endCenterIdx, lastBase + jn, lastBase + j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Construye una tira 3D extruida y biselada a partir de puntos (x, y). */
function buildStrip(pts, depth, bevel = 0.0012) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i][0], pts[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Tubo curvo suave para cordones, ribetes o cuello acolchado. */
function buildTube(points, radius, tubularSegments = 20, radialSegments = 10) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  geo.computeVertexNormals();
  return geo;
}

/** Perfil superior de la capellada según silueta y arquetipo. */
function getArchetype(product) {
  const code = String(product.modelCode || "").toUpperCase();
  const sil = String(product.silhouette || "LOW").toUpperCase();
  if (code === "CTA" || sil === "HIGH") return "HIGH_CANVAS";
  if (code === "AJ4" || sil === "MID") return "MID_AIR";
  if (code === "530") return "RUNNER";
  if (code === "C00S" || code === "SXL") return "CHUNKY_SKATE";
  if (code === "SMB" || code === "HBS" || code === "OSK") return "TERRACE";
  return "COURT";
}

function buildSneakerParts(product) {
  const palette = product.palette ?? {};
  const upper = palette.upper ?? "#FFFFFF";
  const sole = palette.sole ?? "#F1F1EF";
  const accent = palette.accent ?? "#16302B";
  const code = String(product.modelCode || "").toUpperCase();
  const arch = getArchetype(product);

  const upperRough =
    arch === "CHUNKY_SKATE" || arch === "TERRACE" && code !== "OSK"
      ? 0.86
      : arch === "HIGH_CANVAS"
        ? 0.82
        : 0.48;
  const laceColor =
    accent.toLowerCase() === upper.toLowerCase()
      ? shadeHex(upper, 0.9)
      : arch === "HIGH_CANVAS"
        ? "#F8F8F6"
        : arch === "CHUNKY_SKATE"
          ? "#F4F4F0"
          : upper;

  const L = 0.29;
  const xMin = -L / 2;
  const N = 26;
  const widthMul = arch === "CHUNKY_SKATE" ? 1.12 : arch === "TERRACE" ? 0.96 : 1.02;
  const soleThick =
    arch === "COURT"
      ? 0.029
      : arch === "CHUNKY_SKATE"
        ? 0.032
        : arch === "RUNNER"
          ? 0.034
          : arch === "MID_AIR"
            ? 0.033
            : 0.023;
  const outsoleH = 0.008;
  const springAmt = arch === "RUNNER" ? 0.012 : 0.0075;

  const parts = [];

  // 1. Suela exterior (con ligero taqueado en su base)
  const outsoleSlices = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = xMin + u * L;
    const spr = toeSpringY(u, springAmt);
    outsoleSlices.push({
      x,
      yBottom: spr,
      yTop: spr + outsoleH,
      zHalf: lastHalfWidth(u, widthMul * 1.03),
      boxiness: 0.55,
      pinchTop: 0.98,
    });
  }
  parts.push({
    name: "suela",
    geo: buildLoft(outsoleSlices, 24),
    color: sole,
    rough: 0.78,
    metal: 0.04,
  });

  // 2. Mediasuela / Foxing vulcanizado
  const midsoleSlices = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = xMin + u * L;
    const spr = toeSpringY(u, springAmt);
    const heelBoost = arch === "RUNNER" || arch === "MID_AIR" ? (1 - smoothstep(0.05, 0.6, u)) * 0.011 : 0;
    const midTop = spr + soleThick + heelBoost;
    midsoleSlices.push({
      x,
      yBottom: spr + outsoleH - 0.002,
      yTop: midTop,
      zHalf: lastHalfWidth(u, widthMul * (arch === "RUNNER" ? 1.05 : 1.01)),
      boxiness: arch === "RUNNER" ? 0.72 : 0.52,
      pinchTop: 0.95,
    });
  }
  const midsoleColor =
    arch === "TERRACE" && code !== "OSK"
      ? sole
      : arch === "RUNNER"
        ? "#F4F5F7"
        : arch === "HIGH_CANVAS"
          ? "#F5F3EC"
          : "#F7F7F5";
  parts.push({
    name: "mediasuela",
    geo: buildLoft(midsoleSlices, 24),
    color: midsoleColor,
    rough: arch === "HIGH_CANVAS" ? 0.35 : 0.56,
  });

  // Foxing stripe fina para Converse CTA y Vans OSK
  if (arch === "HIGH_CANVAS" || code === "OSK") {
    const stripeSlices = [];
    for (let i = 0; i <= 22; i++) {
      const u = 0.03 + (i / 22) * 0.93;
      const spr = toeSpringY(u, springAmt);
      stripeSlices.push({
        x: xMin + u * L,
        yBottom: spr + soleThick - 0.0055,
        yTop: spr + soleThick - 0.0028,
        zHalf: lastHalfWidth(u, widthMul * 1.022),
        boxiness: 0.5,
        pinchTop: 1,
      });
    }
    parts.push({
      name: "linea-foxing",
      geo: buildLoft(stripeSlices, 20),
      color: "#1B1B1B",
      rough: 0.6,
    });
  }

  // Ventana Air en AJ4
  if (arch === "MID_AIR") {
    for (const side of [-1, 1]) {
      const win = buildStrip(
        [
          [-0.095, soleThick - 0.014],
          [-0.048, soleThick - 0.014],
          [-0.048, soleThick - 0.003],
          [-0.095, soleThick - 0.003],
        ],
        0.005,
        0.001,
      );
      win.translate(0, 0, side * 0.038);
      parts.push({ name: "unidad-air", geo: win, color: "#1C1E22", rough: 0.2, metal: 0.25 });
    }
  }

  // 3. Capellada principal curva (horma anatómica continua)
  const collarH =
    arch === "HIGH_CANVAS"
      ? 0.148
      : arch === "MID_AIR"
        ? 0.118
        : arch === "CHUNKY_SKATE"
          ? 0.094
          : 0.088;
  const upperSlices = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = xMin + u * L;
    const spr = toeSpringY(u, springAmt);
    const baseRise = soleThick - 0.004 + (arch === "RUNNER" ? (1 - smoothstep(0.05, 0.55, u)) * 0.01 : 0);

    let topY;
    if (u < 0.18) {
      // Talón redondeado
      const t = u / 0.18;
      topY = lerp(collarH * 0.94, collarH, smoothstep(0, 1, t));
    } else if (u < 0.44) {
      // Escote lateral del tobillo
      const t = (u - 0.18) / 0.26;
      const dip = arch === "HIGH_CANVAS" ? collarH * 0.95 : collarH * 0.78;
      topY = lerp(collarH, dip, Math.sin(t * Math.PI) * 0.65 + t * 0.35);
    } else if (u < 0.68) {
      // Empeine con caída hacia la puntera
      const t = (u - 0.44) / 0.24;
      const instepStart = arch === "HIGH_CANVAS" ? collarH * 0.84 : collarH * 0.85;
      topY = lerp(instepStart, soleThick + 0.028, smoothstep(0, 1, t));
    } else {
      // Puntera suave descendiendo al toe cap
      const t = (u - 0.68) / 0.32;
      topY = lerp(soleThick + 0.028, spr + soleThick + 0.006, Math.pow(t, 1.3));
    }

    const taperTop = u < 0.45 ? (arch === "HIGH_CANVAS" ? 0.78 : 0.72) : 0.66;
    upperSlices.push({
      x,
      yBottom: spr + baseRise,
      yTop: Math.max(spr + baseRise + 0.007, topY),
      zHalf: lastHalfWidth(u, widthMul * 0.94),
      boxiness: 0.78,
      pinchTop: taperTop,
    });
  }
  parts.push({
    name: "capellada",
    geo: buildLoft(upperSlices, 28),
    color: upper,
    rough: upperRough,
  });

  // 4. Cavidad / Forro interno oscuro en la abertura del tobillo
  const liningSlices = [];
  for (let i = 0; i <= 10; i++) {
    const u = 0.07 + (i / 10) * 0.34;
    const topY = arch === "HIGH_CANVAS" ? collarH - 0.001 : collarH * 0.84;
    liningSlices.push({
      x: xMin + u * L,
      yBottom: topY - 0.018,
      yTop: topY + 0.002,
      zHalf: lastHalfWidth(u, widthMul * 0.62),
      boxiness: 0.75,
      pinchTop: 0.92,
    });
  }
  parts.push({
    name: "forro-interno",
    geo: buildLoft(liningSlices, 18),
    color: arch === "HIGH_CANVAS" ? "#E8E6DE" : "#222428",
    rough: 0.92,
  });

  // 5. Cuello acolchado (collar U-ring)
  if (arch !== "HIGH_CANVAS") {
    const colY = collarH * 0.92;
    const collarTube = buildTube(
      [
        [-0.038, colY - 0.016, 0.032 * widthMul],
        [-0.082, colY - 0.008, 0.035 * widthMul],
        [-0.122, colY + 0.003, 0.022 * widthMul],
        [-0.132, colY + 0.005, 0],
        [-0.122, colY + 0.003, -0.022 * widthMul],
        [-0.082, colY - 0.008, -0.035 * widthMul],
        [-0.038, colY - 0.016, -0.032 * widthMul],
      ],
      arch === "CHUNKY_SKATE" ? 0.015 : 0.011,
      24,
      10,
    );
    parts.push({
      name: "cuello-acolchado",
      geo: collarTube,
      color: code === "550" || code === "AJ4" ? accent : upper,
      rough: 0.72,
    });
  }

  // 6. Puntera especial por arquetipo (Shell-toe, Rubber Toe Cap, T-toe o Mudguard)
  if (arch === "HIGH_CANVAS" || code === "SST") {
    const capSlices = [];
    for (let i = 0; i <= 10; i++) {
      const u = 0.74 + (i / 10) * 0.26;
      const spr = toeSpringY(u, springAmt);
      const t = (u - 0.74) / 0.26;
      capSlices.push({
        x: xMin + u * L,
        yBottom: spr + soleThick - 0.003,
        yTop: lerp(spr + soleThick + 0.026, spr + soleThick + 0.007, Math.pow(t, 1.25)),
        zHalf: lastHalfWidth(u, widthMul * 0.97),
        boxiness: 0.74,
        pinchTop: 0.7,
      });
    }
    parts.push({
      name: "puntera-goma",
      geo: buildLoft(capSlices, 22),
      color: code === "SST" ? "#F1F1EF" : "#F5F3EC",
      rough: 0.32,
    });
  } else if (arch === "TERRACE" && code !== "OSK") {
    // T-toe gamuza
    const tToe = [];
    for (let i = 0; i <= 10; i++) {
      const u = 0.73 + (i / 10) * 0.26;
      const spr = toeSpringY(u, springAmt);
      const t = (u - 0.73) / 0.26;
      tToe.push({
        x: xMin + u * L,
        yBottom: spr + soleThick - 0.002,
        yTop: lerp(spr + soleThick + 0.024, spr + soleThick + 0.006, Math.pow(t, 1.2)),
        zHalf: lastHalfWidth(u, widthMul * 0.96),
        boxiness: 0.76,
        pinchTop: 0.72,
      });
    }
    parts.push({
      name: "puntera-t-toe",
      geo: buildLoft(tToe, 20),
      color: code === "SMB" ? "#E2DED4" : shadeHex(upper, 1.15),
      rough: 0.9,
    });
  } else if (arch === "COURT" || arch === "RUNNER") {
    // Mudguard curvo alrededor de la puntera
    const mud = [];
    for (let i = 0; i <= 10; i++) {
      const u = 0.68 + (i / 10) * 0.31;
      const spr = toeSpringY(u, springAmt);
      const t = (u - 0.68) / 0.31;
      mud.push({
        x: xMin + u * L,
        yBottom: spr + soleThick - 0.003,
        yTop: lerp(spr + soleThick + 0.017, spr + soleThick + 0.008, t),
        zHalf: lastHalfWidth(u, widthMul * 0.975),
        boxiness: 0.72,
        pinchTop: 0.76,
      });
    }
    parts.push({
      name: "mudguard",
      geo: buildLoft(mud, 20),
      color: code === "DNK" || code === "AJ1L" ? accent : upper,
      rough: upperRough,
    });
  }

  // 7. Lengüeta curva acolchada
  const tongueThick = arch === "CHUNKY_SKATE" ? 0.014 : 0.008;
  const tongueSlices = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = lerp(0.055, -0.028, t);
    const y = lerp(soleThick + 0.028, collarH + 0.012, t);
    tongueSlices.push({
      x,
      yBottom: y - tongueThick,
      yTop: y + tongueThick * 0.4,
      zHalf: lerp(0.024, 0.028, Math.sin(t * Math.PI)) * widthMul,
      boxiness: 0.65,
      pinchTop: 0.96,
    });
  }
  parts.push({
    name: "lengueta",
    geo: buildLoft(tongueSlices, 16),
    color: arch === "RUNNER" ? "#D6DAE0" : upper,
    rough: 0.68,
  });

  // 8. Contrafuerte / Talón acento
  const heelSlices = [];
  for (let i = 0; i <= 6; i++) {
    const u = (i / 6) * 0.16;
    const spr = toeSpringY(u, springAmt);
    heelSlices.push({
      x: xMin + u * L,
      yBottom: spr + soleThick + 0.002,
      yTop: collarH * (arch === "HIGH_CANVAS" ? 0.9 : 0.88),
      zHalf: lastHalfWidth(u, widthMul * 0.965),
      boxiness: 0.76,
      pinchTop: 0.75,
    });
  }
  parts.push({
    name: "contrafuerte",
    geo: buildLoft(heelSlices, 18),
    color: arch === "HIGH_CANVAS" ? upper : accent,
    rough: arch === "RUNNER" ? 0.35 : 0.55,
    metal: arch === "RUNNER" ? 0.35 : 0,
  });

  // 9. Detalles laterales distintivos (franjas, swoosh, alas AJ4, onda Vans, parche Converse)
  for (const side of [-1, 1]) {
    const zPos = side * 0.041 * widthMul;
    if (code === "SST" || code === "SMB" || code === "HBS" || code === "C00S") {
      // 3 franjas características inclinadas
      for (let s = 0; s < 3; s++) {
        const dx = -0.032 + s * 0.02;
        const stripe = buildStrip(
          [
            [dx - 0.005, soleThick + 0.002],
            [dx + 0.006, soleThick + 0.002],
            [dx + 0.02, soleThick + 0.04],
            [dx + 0.009, soleThick + 0.04],
          ],
          0.005,
          0.0008,
        );
        stripe.translate(0, 0, zPos * 0.94);
        parts.push({
          name: `franja-${s + 1}`,
          geo: stripe,
          color: accent,
          rough: 0.5,
        });
      }
    } else if (code === "OSK" || code === "SXL") {
      // Ola / Formstrip lateral curva
      const wave = buildTube(
        [
          [-0.085, soleThick + 0.034, zPos * 0.88],
          [-0.035, soleThick + 0.028, zPos * 0.98],
          [0.015, soleThick + 0.017, zPos * 0.96],
          [0.055, soleThick + 0.012, zPos * 0.92],
        ],
        code === "SXL" ? 0.0075 : 0.0045,
        16,
        8,
      );
      parts.push({ name: "onda-lateral", geo: wave, color: accent, rough: 0.5 });
    } else if (code === "AJ4") {
      // Alas triangulares de soporte AJ4
      const wing = buildStrip(
        [
          [-0.045, soleThick + 0.01],
          [-0.015, soleThick + 0.01],
          [0.008, collarH * 0.78],
          [-0.012, collarH * 0.82],
        ],
        0.005,
        0.001,
      );
      wing.translate(0, 0, zPos * 0.92);
      parts.push({ name: "ala-soporte", geo: wing, color: "#D6D8DC", rough: 0.5 });
    } else if (code === "HIGH_CANVAS" || code === "CTA") {
      if (side === -1) {
        const patch = new THREE.CylinderGeometry(0.018, 0.018, 0.004, 20);
        patch.rotateX(Math.PI / 2);
        patch.translate(-0.075, collarH * 0.72, zPos * 0.82);
        parts.push({ name: "parche-tobillo", geo: patch, color: accent, rough: 0.65 });
      }
    } else if (code === "550" || code === "530") {
      // Emblema N lateral
      const nBadge = buildStrip(
        [
          [-0.032, soleThick + 0.012],
          [-0.002, soleThick + 0.012],
          [0.005, soleThick + 0.038],
          [-0.025, soleThick + 0.038],
        ],
        0.005,
        0.001,
      );
      nBadge.translate(0, 0, zPos * 0.94);
      parts.push({
        name: "emblema-n",
        geo: nBadge,
        color: accent,
        rough: code === "530" ? 0.35 : 0.55,
        metal: code === "530" ? 0.45 : 0,
      });
    } else if (code !== "STS") {
      // Wing lateral curvo estilo Court (AF1 / DNK / AJ1L / CVL)
      const swoosh = buildTube(
        [
          [-0.09, soleThick + 0.032, zPos * 0.82],
          [-0.035, soleThick + 0.018, zPos * 0.96],
          [0.018, soleThick + 0.019, zPos * 0.95],
          [0.048, soleThick + 0.026, zPos * 0.88],
        ],
        0.0055,
        16,
        8,
      );
      parts.push({ name: "panel-lateral", geo: swoosh, color: accent, rough: 0.42 });
    }
  }

  // 10. Cordones cruzados + ojales
  const laceRows = arch === "HIGH_CANVAS" ? 6 : 5;
  const laceThick = arch === "CHUNKY_SKATE" ? 0.0044 : 0.0028;
  for (let i = 0; i < laceRows; i++) {
    const t = i / (laceRows - 1);
    const x0 = lerp(0.068, -0.012, t);
    const x1 = x0 - 0.011;
    const y0 = lerp(soleThick + 0.026, collarH * 0.78, t);
    const y1 = lerp(soleThick + 0.029, collarH * 0.82, Math.min(1, t + 0.14));
    const zSpan = lerp(0.024, 0.029, t) * widthMul;

    const c1 = buildTube(
      [
        [x0, y0, -zSpan],
        [(x0 + x1) / 2, (y0 + y1) / 2 + 0.005, 0],
        [x1, y1, zSpan],
      ],
      laceThick,
      10,
      6,
    );
    const c2 = buildTube(
      [
        [x0, y0, zSpan],
        [(x0 + x1) / 2, (y0 + y1) / 2 + 0.006, 0],
        [x1, y1, -zSpan],
      ],
      laceThick,
      10,
      6,
    );
    parts.push({ name: `cordon-a-${i}`, geo: c1, color: laceColor, rough: 0.75 });
    parts.push({ name: `cordon-b-${i}`, geo: c2, color: laceColor, rough: 0.75 });

    if (arch === "HIGH_CANVAS") {
      for (const side of [-1, 1]) {
        const eyelet = new THREE.CylinderGeometry(0.0032, 0.0032, 0.004, 10);
        eyelet.rotateX(Math.PI / 2);
        eyelet.translate(x0, y0, side * (zSpan + 0.001));
        parts.push({ name: `ojal-${i}-${side}`, geo: eyelet, color: "#D4D7DC", rough: 0.28, metal: 0.75 });
      }
    }
  }

  return parts;
}

function buildDocument(product) {
  const doc = new Document();
  doc.getRoot().getAsset().generator = "KeyStreet build-generic-glb v2";
  const buffer = doc.createBuffer();
  const scene = doc.createScene(product.slug);
  const node = doc.createNode(`${product.slug}-generico`);
  scene.addChild(node);
  doc.getRoot().setDefaultScene(scene);
  const mesh = doc.createMesh("sneaker-generico");
  const materials = new Map();

  const rawParts = buildSneakerParts(product);
  // Medir ancho X exacto para garantizar 0,290 m exactos
  let minX = Infinity;
  let maxX = -Infinity;
  for (const part of rawParts) {
    part.geo.computeBoundingBox();
    minX = Math.min(minX, part.geo.boundingBox.min.x);
    maxX = Math.max(maxX, part.geo.boundingBox.max.x);
  }
  const scaleFactor = TARGET_LENGTH / Math.max(0.05, maxX - minX);
  const scaleMatrix = new THREE.Matrix4().makeScale(scaleFactor, scaleFactor, scaleFactor);

  for (const part of rawParts) {
    const geo = part.geo;
    geo.applyMatrix4(scaleMatrix);
    geo.computeVertexNormals();

    const key = `${part.color}|${part.rough}|${part.metal ?? 0}`;
    if (!materials.has(key)) {
      materials.set(
        key,
        doc
          .createMaterial(part.name)
          .setBaseColorFactor(linear(part.color))
          .setRoughnessFactor(part.rough)
          .setMetallicFactor(part.metal ?? 0),
      );
    }

    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const position = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array(posAttr.array))
      .setBuffer(buffer);
    const normal = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array(normAttr.array))
      .setBuffer(buffer);
    const prim = doc.createPrimitive().setAttribute("POSITION", position).setAttribute("NORMAL", normal);
    if (geo.index) {
      const idxArr =
        posAttr.count > 65535
          ? new Uint32Array(geo.index.array)
          : new Uint16Array(geo.index.array);
      prim.setIndices(doc.createAccessor().setType("SCALAR").setArray(idxArr).setBuffer(buffer));
    }
    prim.setMaterial(materials.get(key));
    mesh.addPrimitive(prim);
  }

  node.setMesh(mesh);
  return doc;
}

async function main() {
  const only = new Set(process.argv.slice(2));
  const catalog = JSON.parse(await readFile(CATALOG, "utf8"));
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(TMP, { recursive: true });
  const io = new NodeIO();

  for (const product of catalog.products) {
    if (only.size && !only.has(product.slug)) continue;
    const raw = path.join(TMP, `${product.slug}.raw.glb`);
    const centered = path.join(TMP, `${product.slug}.centered.glb`);
    const out = path.join(OUT_DIR, `${product.slug}.glb`);
    await io.write(raw, buildDocument(product));
    execFileSync(process.execPath, [CLI, "center", raw, centered, "--pivot", "below"], { stdio: "pipe" });
    execFileSync(process.execPath, [CLI, "meshopt", centered, out], { stdio: "pipe" });
    await rm(raw, { force: true });
    await rm(centered, { force: true });
    console.log(`3D orgánico: ${path.relative(REPO, out)}`);
  }
  console.log(`Siguiente paso: node models/validate-models.mjs (actualiza ${path.relative(REPO, MANIFEST)})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
