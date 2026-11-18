/**
 * A point or a direction in space, in metres: the few sums Klay's figure
 * needs. Each method changes the vector it is called on and returns it, so
 * sums chain — `a.clone().sub(b).normalize()` — and `clone` keeps the
 * original.
 */
export class Vec3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  clone() {
    return new Vec3(this.x, this.y, this.z);
  }

  add(v: Vec3) {
    return this.addScaledVector(v, 1);
  }

  sub(v: Vec3) {
    return this.addScaledVector(v, -1);
  }

  addScaledVector(v: Vec3, s: number) {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    return this;
  }

  multiplyScalar(s: number) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  negate() {
    return this.multiplyScalar(-1);
  }

  setY(y: number) {
    this.y = y;
    return this;
  }

  setZ(z: number) {
    this.z = z;
    return this;
  }

  dot(v: Vec3) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  length() {
    return Math.sqrt(this.dot(this));
  }

  distanceTo(v: Vec3) {
    return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  normalize() {
    return this.multiplyScalar(1 / (this.length() || 1));
  }

  /** This becomes a × b. */
  crossVectors(a: Vec3, b: Vec3) {
    const x = a.y * b.z - a.z * b.y;
    const y = a.z * b.x - a.x * b.z;
    const z = a.x * b.y - a.y * b.x;
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /** Turned `angle` radians round the unit vector `axis`, right-handed. */
  applyAxisAngle(axis: Vec3, angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const along = axis.dot(this) * (1 - cos);
    const turned = new Vec3().crossVectors(axis, this);
    this.multiplyScalar(cos).addScaledVector(turned, sin).addScaledVector(axis, along);
    return this;
  }

  /** The angle to another direction, in radians. */
  angleTo(v: Vec3) {
    const lengths = this.length() * v.length();
    if (lengths === 0) return Math.PI / 2;
    return Math.acos(Math.min(Math.max(this.dot(v) / lengths, -1), 1));
  }
}
