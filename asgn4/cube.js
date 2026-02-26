class Cube {
  constructor() {
    this.type='cube';
    // this.position = [0.0,0.0,0.0];
    this.color = [1.0,1.0,1.0,1.0];
    // this.size = 5.0;
    // this.segments = 10;
    this.matrix = new Matrix4();
    this.normalMatrix = new Matrix4();
    this.textureNum = -2;
    this.texColorWeight = 0.0;
    
    // Pre-allocate vertex and UV arrays 
    this.vertices = new Float32Array([
      // Front face
      0,0,0, 1,1,0, 1,0,0,
      0,0,0, 0,1,0, 1,1,0,
      // Top face
      0,1,0, 0,1,1, 1,1,1,
      0,1,0, 1,1,1, 1,1,0,
      // Right face
      1,0,0, 1,1,0, 1,1,1,
      1,0,0, 1,1,1, 1,0,1,
      // Left face
      0,0,0, 0,0,1, 0,1,1,
      0,0,0, 0,1,1, 0,1,0,
      // Bottom face
      0,0,1, 1,0,1, 1,0,0,
      0,0,1, 1,0,0, 0,0,0,
      // Back face
      0,0,1, 0,1,1, 1,1,1,
      0,0,1, 1,1,1, 1,0,1
    ]);

    this.uv = new Float32Array([
      // Front face
      0,0, 1,1, 1,0,
      0,0, 0,1, 1,1,
      // Top face
      0,0, 0,1, 1,1,
      0,0, 1,1, 1,0,
      // Right face
      0,0, 0,1, 1,1,
      0,0, 1,1, 1,0,
      // Left face
      0,0, 1,0, 1,1,
      0,0, 1,1, 0,1,
      // Bottom face
      0,0, 1,0, 1,1,
      0,0, 1,1, 0,1,
      // Back face
      0,0, 0,1, 1,1,
      0,0, 1,1, 1,0
    ]);
    
    this.normals = new Float32Array([
      // Front face  
       0, 0,-1,  0, 0,-1,  0, 0,-1,
       0, 0,-1,  0, 0,-1,  0, 0,-1,
      // Top face  
       0, 1, 0,  0, 1, 0,  0, 1, 0,
       0, 1, 0,  0, 1, 0,  0, 1, 0,
      // Right face 
       1, 0, 0,  1, 0, 0,  1, 0, 0,
       1, 0, 0,  1, 0, 0,  1, 0, 0,
      // Left face  
      -1, 0, 0, -1, 0, 0, -1, 0, 0,
      -1, 0, 0, -1, 0, 0, -1, 0, 0,
      // Bottom face 
       0,-1, 0,  0,-1, 0,  0,-1, 0,
       0,-1, 0,  0,-1, 0,  0,-1, 0,
      // Back face   
       0, 0, 1,  0, 0, 1,  0, 0, 1,
       0, 0, 1,  0, 0, 1,  0, 0, 1,
    ]);

    this.transformedVertices = new Float32Array(108); // 36 vertices * 3 coords
  }

  render() {
    // var xy = this.position;
   var rgba = this.color;
    
    gl.uniform1i(u_whichTexture, (typeof g_normalViz !== 'undefined' && g_normalViz) ? -3 : this.textureNum);
    
    gl.uniform1f(u_texColorWeight, this.texColorWeight);
    // Pass the color of a point to u_FragColor uniform variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Pass the matrix to u_ModelMatrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Compute and pass the normal matrix (transpose of inverse of model matrix)
    this.normalMatrix.setInverseOf(this.matrix);
    this.normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);
    
    // Front face  (normal: 0, 0, -1)
    drawTriangle3DUVNormal(
      [0,0,0, 1,1,0, 1,0,0], [0,0, 1,1, 1,0],
      [0,0,-1, 0,0,-1, 0,0,-1]);
    drawTriangle3DUVNormal(
      [0,0,0, 0,1,0, 1,1,0], [0,0, 0,1, 1,1],
      [0,0,-1, 0,0,-1, 0,0,-1]);

    // Top face  (normal: 0, 1, 0)
    // gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    drawTriangle3DUVNormal(
      [0,1,0, 0,1,1, 1,1,1], [0,0, 0,1, 1,1],
      [0,1,0, 0,1,0, 0,1,0]);
    drawTriangle3DUVNormal(
      [0,1,0, 1,1,1, 1,1,0], [0,0, 1,1, 1,0],
      [0,1,0, 0,1,0, 0,1,0]);

    // Right face  (normal: 1, 0, 0)
    // gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    drawTriangle3DUVNormal(
      [1,0,0, 1,1,0, 1,1,1], [0,0, 0,1, 1,1],
      [1,0,0, 1,0,0, 1,0,0]);
    drawTriangle3DUVNormal(
      [1,0,0, 1,1,1, 1,0,1], [0,0, 1,1, 1,0],
      [1,0,0, 1,0,0, 1,0,0]);

    // Left face  (normal: -1, 0, 0)
    // gl.uniform4f(u_FragColor, rgba[0]*0.7, rgba[1]*0.7, rgba[2]*0.7, rgba[3]);
    drawTriangle3DUVNormal(
      [0,0,0, 0,0,1, 0,1,1], [0,0, 1,0, 1,1],
      [-1,0,0, -1,0,0, -1,0,0]);
    drawTriangle3DUVNormal(
      [0,0,0, 0,1,1, 0,1,0], [0,0, 1,1, 0,1],
      [-1,0,0, -1,0,0, -1,0,0]);

    // Bottom face  (normal: 0, -1, 0)
    // gl.uniform4f(u_FragColor, rgba[0]*0.6, rgba[1]*0.6, rgba[2]*0.6, rgba[3]);
    drawTriangle3DUVNormal(
      [0,0,1, 1,0,1, 1,0,0], [0,0, 1,0, 1,1],
      [0,-1,0, 0,-1,0, 0,-1,0]);
    drawTriangle3DUVNormal(
      [0,0,1, 1,0,0, 0,0,0], [0,0, 1,1, 0,1],
      [0,-1,0, 0,-1,0, 0,-1,0]);

    // Back face  (normal: 0, 0, 1)
    // gl.uniform4f(u_FragColor, rgba[0]*0.5, rgba[1]*0.5, rgba[2]*0.5, rgba[3]);
    drawTriangle3DUVNormal(
      [0,0,1, 0,1,1, 1,1,1], [0,0, 0,1, 1,1],
      [0,0,1, 0,0,1, 0,0,1]);
    drawTriangle3DUVNormal(
      [0,0,1, 1,1,1, 1,0,1], [0,0, 1,1, 1,0],
      [0,0,1, 0,0,1, 0,0,1]);

  }

  renderFast() {
    for (let i = 0; i < this.vertices.length; i += 3) {
      let v = this.matrix.multiplyVector4(new Vector4([this.vertices[i], this.vertices[i+1], this.vertices[i+2], 1]));
      this.transformedVertices[i] = v.elements[0];
      this.transformedVertices[i+1] = v.elements[1];
      this.transformedVertices[i+2] = v.elements[2];
    }

    return {
      vertices: this.transformedVertices,
      uv: this.uv,
      normals: this.normals,
      color: this.color,
      textureNum: this.textureNum,
      texColorWeight: this.texColorWeight
    };
  }
}