/**
 * The equipment and the hands, as clean shapes: ink on paper like the figure,
 * but exact — the figure may be a little sloppy, what it holds never is.
 *
 * Every shape has smooth normals all round (rounded edges, rounded ends), so
 * the ink outline — the shape pushed out along its normals — never cracks at
 * a corner.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { MODEL } from "./model";

/** A part, and whether it is paper with an ink outline or solid ink (a cable, a band). */
export type Part = { geometry: THREE.BufferGeometry; ink?: boolean };

/** A cylinder along its own y with softly rounded rims: a plate, a head, a roller. */
function rounded(radius: number, length: number, bevel = Math.min(0.006, radius / 3, length / 3)): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [new THREE.Vector2(0, -length / 2)];
  const corner = (cx: number, cy: number, from: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = from + (i / 6) * (Math.PI / 2);
      points.push(new THREE.Vector2(cx + Math.cos(a) * bevel, cy + Math.sin(a) * bevel));
    }
  };
  corner(radius - bevel, -length / 2 + bevel, -Math.PI / 2);
  corner(radius - bevel, length / 2 - bevel, 0);
  points.push(new THREE.Vector2(0, length / 2));
  return new THREE.LatheGeometry(points, 48);
}

/** A rod along its own y with round ends. */
function rod(radius: number, length: number): THREE.BufferGeometry {
  return new THREE.CapsuleGeometry(radius, Math.max(length - 2 * radius, 0.001), 8, 24);
}

const alongX = (g: THREE.BufferGeometry) => g.rotateZ(Math.PI / 2);

/** A smooth tube through points, with round ends. */
function tube(points: [number, number, number][], radius: number): THREE.BufferGeometry[] {
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const ends = [points[0], points[points.length - 1]].map((p) =>
    new THREE.SphereGeometry(radius, 20, 14).translate(...p),
  );
  return [new THREE.TubeGeometry(path, 64, radius, 16, false), ...ends];
}

export type KitPiece = {
  kind: string;
  size?: readonly number[];
  r?: number;
  length?: number;
};

/** The parts of one piece of equipment, in its own axes. */
export function kitParts(piece: KitPiece): Part[] {
  switch (piece.kind) {
    case "box": {
      const [x, y, z] = piece.size!;
      return [{ geometry: new RoundedBoxGeometry(x, y, z, 3, Math.min(0.02, Math.min(x, y, z) / 2.5)) }];
    }
    case "cylinder": // along its x
      return [{ geometry: alongX(piece.r! > 0.03 ? rounded(piece.r!, piece.length!) : rod(piece.r!, piece.length!)) }];
    case "barbell": {
      // A 1.8 m bar: the shaft, sleeves, a 45 cm plate and a collar each side.
      const parts: Part[] = [{ geometry: alongX(rod(0.014, 1.8)) }];
      for (const s of [-1, 1]) {
        parts.push(
          { geometry: alongX(rounded(0.025, 0.36)).translate(s * 0.72, 0, 0) },
          { geometry: alongX(rounded(0.225, 0.045)).translate(s * 0.53, 0, 0) },
          { geometry: alongX(rounded(0.042, 0.03)).translate(s * 0.5675, 0, 0) }, // the collar, against the plate
        );
      }
      return parts;
    }
    case "dumbbell": // along its y
      return [
        { geometry: rod(0.016, 0.2) },
        { geometry: rounded(0.05, 0.045).translate(0, 0.09, 0) },
        { geometry: rounded(0.05, 0.045).translate(0, -0.09, 0) },
      ];
    case "kettlebell": {
      // The bell round its middle; the handle's straight top at y 0.175.
      const bell = new THREE.SphereGeometry(0.085, 40, 28).scale(1, 0.94, 1);
      const handle = tube(
        [[-0.062, 0.05, 0], [-0.084, 0.12, 0], [-0.06, 0.172, 0], [0, 0.176, 0], [0.06, 0.172, 0], [0.084, 0.12, 0], [0.062, 0.05, 0]],
        0.011,
      );
      return [{ geometry: bell }, ...handle.map((geometry) => ({ geometry }))];
    }
    case "latbar": {
      // Straight where the hands go, the ends bent down; a ring for the cable.
      const bar = tube(
        [[-0.6, -0.07, 0], [-0.5, -0.012, 0], [-0.42, 0, 0], [0, 0, 0], [0.42, 0, 0], [0.5, -0.012, 0], [0.6, -0.07, 0]],
        0.014,
      );
      return [...bar.map((geometry) => ({ geometry })), { geometry: new THREE.SphereGeometry(0.022, 20, 14).translate(0, 0.012, 0) }];
    }
    case "cable": // along its y, stretched to length
      return [{ geometry: new THREE.CylinderGeometry(0.004, 0.004, 1, 10), ink: true }];
    case "band":
      return [{ geometry: new THREE.CylinderGeometry(0.0075, 0.0075, 1, 12), ink: true }];
    default:
      return [];
  }
}

/** Whether a piece stretches between two points (its length changes). */
export const stretches = (kind: string) => kind === "cable" || kind === "band";

// ---------------------------------------------------------------- the hands

/**
 * A hand closed round a rod: a soft palm and one band of fingers wrapped
 * three-quarters round, ending in a rounded fingertip. In the hand's own
 * frame — x out of the palm, y up the fingers, z across the knuckles — the
 * rod runs across the knuckles exactly inside it (model.grip).
 */
export function gripHand(rodRadius: number): Part[] {
  const { up, out } = MODEL.grip;
  const tube = 0.0125;
  const wide = 3.2;
  // The fingers rest on the rod, a hair off it, so no ink shows through.
  const round = rodRadius + tube + 0.0015;
  const band = new THREE.TorusGeometry(round, tube, 14, 40, Math.PI * 1.5);
  band.rotateZ(-Math.PI / 2);
  band.scale(1, 1, wide);
  band.translate(out, up, 0);
  const tip = new THREE.SphereGeometry(tube, 20, 14).scale(1, 1, wide).translate(out, up - round, 0);
  const palm = new THREE.SphereGeometry(1, 28, 20)
    .scale(0.021, 0.046, 0.043)
    .translate(Math.min(out - rodRadius - 0.023, 0.002), 0.034, 0);
  return [palm, band, tip].map((geometry) => ({ geometry }));
}

/**
 * An open hand: a flat palm and the fingers together, straight on. On the
 * floor, under a dumbbell, on a thigh — its palm's middle touches (model.flat).
 */
export function flatHand(): Part[] {
  const { up, out } = MODEL.flat;
  const palm = new THREE.SphereGeometry(1, 28, 20).scale(0.016, 0.047, 0.043).translate(out - 0.016, up - 0.002, 0);
  const fingers = new THREE.CapsuleGeometry(0.0115, 0.034, 8, 16).scale(1, 1, 3.4).translate(out - 0.014, up + 0.05, 0);
  return [palm, fingers].map((geometry) => ({ geometry }));
}
