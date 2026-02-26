class Sphere {
  constructor() {
    this.type = 'sphere';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2;
    this.texColorWeight = 0.0;
  }

  render() {
    var rgba = this.color;

    // Pass the texture number to shader 
    gl.uniform1i(u_whichTexture, (typeof g_normalViz !== 'undefined' && g_normalViz) ? -3 : this.textureNum);

    // Pass the texture weight for blending
    gl.uniform1f(u_texColorWeight, this.texColorWeight);

    // Pass the color
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Pass the model matrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    let normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(this.matrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    var d  = Math.PI / 10;  
    var dd = Math.PI / 10;  

    for (var t = 0; t < Math.PI; t += d) {
      for (var r = 0; r < 2 * Math.PI; r += d) {

        var p1 = [Math.sin(t)    * Math.cos(r),      Math.sin(t)    * Math.sin(r),      Math.cos(t)   ];
        var p2 = [Math.sin(t+dd) * Math.cos(r),      Math.sin(t+dd) * Math.sin(r),      Math.cos(t+dd)];
        var p3 = [Math.sin(t)    * Math.cos(r+dd),   Math.sin(t)    * Math.sin(r+dd),   Math.cos(t)   ];
        var p4 = [Math.sin(t+dd) * Math.cos(r+dd),   Math.sin(t+dd) * Math.sin(r+dd),   Math.cos(t+dd)];

        var v  = [].concat(p1, p2, p4);
        var uv = [0,0, 0,0, 0,0];
        drawTriangle3DUVNormal(v, uv, v);

        v  = [].concat(p1, p4, p3);
        uv = [0,0, 0,0, 0,0];
        drawTriangle3DUVNormal(v, uv, v);
      }
    }
  }
}