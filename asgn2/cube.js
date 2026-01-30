class Cube {
  constructor() {
    this.type='cube';
    // this.position = [0.0,0.0,0.0];
    this.color = [1.0,1.0,1.0,1.0];
    // this.size = 5.0;
    // this.segments = 10;
    this.matrix = new Matrix4();
  }

  render() {
    // var xy = this.position;
   var rgba = this.color;
    
    // Pass the matrix to u_ModelMatrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    
    // Front face
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    drawTriangle3D([0,0,0, 1,1,0, 1,0,0]);
    drawTriangle3D([0,0,0, 0,1,0, 1,1,0]);
    
    // Top face
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    drawTriangle3D([0,1,0, 0,1,1, 1,1,1]);
    drawTriangle3D([0,1,0, 1,1,1, 1,1,0]);
    
    // Right face
    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    drawTriangle3D([1,0,0, 1,1,0, 1,1,1]);
    drawTriangle3D([1,0,0, 1,1,1, 1,0,1]);
    
    // Left face
    gl.uniform4f(u_FragColor, rgba[0]*0.7, rgba[1]*0.7, rgba[2]*0.7, rgba[3]);
    drawTriangle3D([0,0,0, 0,0,1, 0,1,1]);
    drawTriangle3D([0,0,0, 0,1,1, 0,1,0]);
    
    // Bottom face
    gl.uniform4f(u_FragColor, rgba[0]*0.6, rgba[1]*0.6, rgba[2]*0.6, rgba[3]);
    drawTriangle3D([0,0,1, 1,0,1, 1,0,0]);
    drawTriangle3D([0,0,1, 1,0,0, 0,0,0]);
    
    // Back face
    gl.uniform4f(u_FragColor, rgba[0]*0.5, rgba[1]*0.5, rgba[2]*0.5, rgba[3]);
    drawTriangle3D([0,0,1, 0,1,1, 1,1,1]);
    drawTriangle3D([0,0,1, 1,1,1, 1,0,1]);

  }
}

