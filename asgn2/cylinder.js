class Cylinder {
  constructor() {
    this.type = 'cylinder';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();

    this.segments = 24;
    this.radiusTop = 0.5;
    this.radiusBottom = 0.5;
    this.height = 1.0;

    // Angle control (THIS is the key)
    this.startAngle = 0;           // degrees
    this.endAngle = 360;           // degrees

    this.drawCaps = true;
  }

  render() {
    gl.uniform4f(
      u_FragColor,
      this.color[0],
      this.color[1],
      this.color[2],
      this.color[3]
    );

    gl.uniformMatrix4fv(
      u_ModelMatrix,
      false,
      this.matrix.elements
    );

    this.drawCylinder();
  }

  drawCylinder() {
    const seg = this.segments;
    const h = this.height;

    const startRad = (this.startAngle * Math.PI) / 180;
    const endRad   = (this.endAngle   * Math.PI) / 180;
    const angleStep = (endRad - startRad) / seg;

    for (let i = 0; i < seg; i++) {
      const a1 = startRad + i * angleStep;
      const a2 = startRad + (i + 1) * angleStep;

      const x1b = Math.cos(a1) * this.radiusBottom;
      const z1b = Math.sin(a1) * this.radiusBottom;
      const x2b = Math.cos(a2) * this.radiusBottom;
      const z2b = Math.sin(a2) * this.radiusBottom;

      const x1t = Math.cos(a1) * this.radiusTop;
      const z1t = Math.sin(a1) * this.radiusTop;
      const x2t = Math.cos(a2) * this.radiusTop;
      const z2t = Math.sin(a2) * this.radiusTop;

      // Side quad
      drawTriangle3D([
        x1b, 0, z1b,
        x2b, 0, z2b,
        x1t, h, z1t
      ]);

      drawTriangle3D([
        x2b, 0, z2b,
        x2t, h, z2t,
        x1t, h, z1t
      ]);

      // Bottom cap
      if (this.drawCaps) {
        drawTriangle3D([
          0, 0, 0,
          x2b, 0, z2b,
          x1b, 0, z1b
        ]);
      }

      // Top cap
      if (this.drawCaps) {
        drawTriangle3D([
          0, h, 0,
          x1t, h, z1t,
          x2t, h, z2t
        ]);
      }
    }
  }
}
