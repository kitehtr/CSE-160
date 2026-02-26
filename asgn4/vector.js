class Vector3Helper {
  static copy(v) {
    return new Vector3([v.elements[0], v.elements[1], v.elements[2]]);
  }
  
  static set(target, source) {
    target.elements[0] = source.elements[0];
    target.elements[1] = source.elements[1];
    target.elements[2] = source.elements[2];
    return target;
  }
  
  static add(v1, v2) {
    return new Vector3([
      v1.elements[0] + v2.elements[0],
      v1.elements[1] + v2.elements[1],
      v1.elements[2] + v2.elements[2]
    ]);
  }
  
  static addInPlace(v1, v2) {
    v1.elements[0] += v2.elements[0];
    v1.elements[1] += v2.elements[1];
    v1.elements[2] += v2.elements[2];
    return v1;
  }
  
  static subtract(v1, v2) {
    return new Vector3([
      v1.elements[0] - v2.elements[0],
      v1.elements[1] - v2.elements[1],
      v1.elements[2] - v2.elements[2]
    ]);
  }
  
  static subtractInPlace(v1, v2) {
    v1.elements[0] -= v2.elements[0];
    v1.elements[1] -= v2.elements[1];
    v1.elements[2] -= v2.elements[2];
    return v1;
  }
  
  static multiply(v, scalar) {
    return new Vector3([
      v.elements[0] * scalar,
      v.elements[1] * scalar,
      v.elements[2] * scalar
    ]);
  }
  
  static multiplyInPlace(v, scalar) {
    v.elements[0] *= scalar;
    v.elements[1] *= scalar;
    v.elements[2] *= scalar;
    return v;
  }
  
  static normalize(v) {
    let result = Vector3Helper.copy(v);
    result.normalize();
    return result;
  }
  
  static magnitude(v) {
    return Math.sqrt(
      v.elements[0] * v.elements[0] +
      v.elements[1] * v.elements[1] +
      v.elements[2] * v.elements[2]
    );
  }
  
  static dot(v1, v2) {
    return v1.elements[0] * v2.elements[0] +
           v1.elements[1] * v2.elements[1] +
           v1.elements[2] * v2.elements[2];
  }
  
  static cross(v1, v2) {
    return new Vector3([
      v1.elements[1] * v2.elements[2] - v1.elements[2] * v2.elements[1],
      v1.elements[2] * v2.elements[0] - v1.elements[0] * v2.elements[2],
      v1.elements[0] * v2.elements[1] - v1.elements[1] * v2.elements[0]
    ]);
  }
  
  static toString(v) {
    return `Vector3(${v.elements[0].toFixed(3)}, ${v.elements[1].toFixed(3)}, ${v.elements[2].toFixed(3)})`;
  }
}