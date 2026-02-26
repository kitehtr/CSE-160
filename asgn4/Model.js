class Model {
  constructor() {
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2;
    this.isFullyLoaded = false;
    this.modelData = null;
    this.vertexBuffer = null;
    this.normalBuffer = null;
  }

  async loadOBJ(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) throw new Error(`Could not load "${filePath}"`);
      const text = await response.text();
      this._parseOBJ(text);

      this.vertexBuffer = gl.createBuffer();
      this.normalBuffer = gl.createBuffer();

      if (!this.vertexBuffer || !this.normalBuffer) {
        console.log('Model: Failed to create GL buffers');
        return;
      }

      this.isFullyLoaded = true;
      console.log(`Model loaded: ${filePath} (${this.modelData.vertices.length / 3} vertices)`);
    } catch (e) {
      console.log('Model load error:', e);
    }
  }

  _parseOBJ(text) {
    const lines = text.split('\n');
    const allVerts   = [];
    const allNormals = [];
    const unpackedVerts   = [];
    const unpackedNormals = [];

    for (const line of lines) {
      const tokens = line.trim().split(/\s+/);
      if (tokens[0] === 'v') {
        allVerts.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
      } else if (tokens[0] === 'vn') {
        allNormals.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
      } else if (tokens[0] === 'f') {
        const faceVerts = tokens.slice(1);
        for (let i = 1; i < faceVerts.length - 1; i++) {
          for (const fv of [faceVerts[0], faceVerts[i], faceVerts[i+1]]) {
            const parts = fv.split('/');
            const vi = (parseInt(parts[0]) - 1) * 3;
            unpackedVerts.push(allVerts[vi], allVerts[vi+1], allVerts[vi+2]);

            if (parts.length >= 3 && parts[2] !== '') {
              const ni = (parseInt(parts[2]) - 1) * 3;
              unpackedNormals.push(allNormals[ni], allNormals[ni+1], allNormals[ni+2]);
            } else {
              unpackedNormals.push(0, 1, 0);
            }
          }
        }
      }
    }

    this.modelData = {
      vertices: new Float32Array(unpackedVerts),
      normals:  new Float32Array(unpackedNormals)
    };
  }

  render() {
    if (!this.isFullyLoaded) return;

    var rgba = this.color;

    gl.uniform1i(u_whichTexture, (typeof g_normalViz !== 'undefined' && g_normalViz) ? -3 : this.textureNum);
    gl.uniform1f(u_texColorWeight, 0.0);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    let normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(this.matrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.modelData.vertices, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.modelData.normals, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.disableVertexAttribArray(a_UV);
    gl.vertexAttrib2f(a_UV, 0.0, 0.0);

    gl.drawArrays(gl.TRIANGLES, 0, this.modelData.vertices.length / 3);

    gl.enableVertexAttribArray(a_UV);
  }
}