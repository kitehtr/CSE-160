class Camera {
  constructor(canvas) {
    this.fov = 60;
    this.eye = new Vector3([3, 0.5, 3]); 
    this.at = new Vector3([3, 0.5, 2]); 
    this.up = new Vector3([0, 1, 0]);
    
    this.viewMatrix = new Matrix4();
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0], this.at.elements[1], this.at.elements[2],
      this.up.elements[0], this.up.elements[1], this.up.elements[2]
    );
    
    this.projectionMatrix = new Matrix4();
    this.projectionMatrix.setPerspective(
      this.fov, 
      canvas.width / canvas.height, 
      0.1, 
      1000
    );
    
    this.speed = 0.2;
    this.rotationAngle = 5;
  }
  
  moveForward() {
    let f = Vector3Helper.subtract(this.at, this.eye);
    f = Vector3Helper.normalize(f);
    f = Vector3Helper.multiply(f, this.speed);
    
    Vector3Helper.addInPlace(this.eye, f);
    Vector3Helper.addInPlace(this.at, f);
    
    this.updateViewMatrix();
  }
  
  moveBackward() {
    let b = Vector3Helper.subtract(this.eye, this.at);
    b = Vector3Helper.normalize(b);
    b = Vector3Helper.multiply(b, this.speed);
    
    Vector3Helper.addInPlace(this.eye, b);
    Vector3Helper.addInPlace(this.at, b);
    
    this.updateViewMatrix();
  }
  
  moveLeft() {
    let f = Vector3Helper.subtract(this.at, this.eye);
    
    let s = Vector3Helper.cross(this.up, f);
    s = Vector3Helper.normalize(s);
    s = Vector3Helper.multiply(s, this.speed);
    
    Vector3Helper.addInPlace(this.eye, s);
    Vector3Helper.addInPlace(this.at, s);
    
    this.updateViewMatrix();
  }
  
  moveRight() {
    let f = Vector3Helper.subtract(this.at, this.eye);
    
    let s = Vector3Helper.cross(f, this.up);
    s = Vector3Helper.normalize(s);
    s = Vector3Helper.multiply(s, this.speed);
    
    Vector3Helper.addInPlace(this.eye, s);
    Vector3Helper.addInPlace(this.at, s);
    
    this.updateViewMatrix();
  }
  
  panLeft() {
    let f = Vector3Helper.subtract(this.at, this.eye);
    
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(
      this.rotationAngle, 
      this.up.elements[0], 
      this.up.elements[1], 
      this.up.elements[2]
    );
    
    let f_prime = rotationMatrix.multiplyVector3(f);
    
    this.at = Vector3Helper.add(this.eye, f_prime);
    
    this.updateViewMatrix();
  }
  
  panRight() {
    let f = Vector3Helper.subtract(this.at, this.eye);
    
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(
      -this.rotationAngle, 
      this.up.elements[0], 
      this.up.elements[1], 
      this.up.elements[2]
    );
    
    let f_prime = rotationMatrix.multiplyVector3(f);
    
    this.at = Vector3Helper.add(this.eye, f_prime);
    
    this.updateViewMatrix();
  }
  
  updateViewMatrix() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0], this.at.elements[1], this.at.elements[2],
      this.up.elements[0], this.up.elements[1], this.up.elements[2]
    );
  }
  
  panMouse(deltaX) {
    let f = Vector3Helper.subtract(this.at, this.eye);
    
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(
      deltaX, 
      this.up.elements[0], 
      this.up.elements[1], 
      this.up.elements[2]
    );
    
    let f_prime = rotationMatrix.multiplyVector3(f);
    
    this.at = Vector3Helper.add(this.eye, f_prime);
    
    this.updateViewMatrix();
  }
  
  tiltMouse(deltaY) {
    let f = Vector3Helper.subtract(this.at, this.eye);
    
    let right = Vector3Helper.cross(f, this.up);
    right = Vector3Helper.normalize(right);
    
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(
      deltaY,
      right.elements[0],
      right.elements[1],
      right.elements[2]
    );
    
    let f_prime = rotationMatrix.multiplyVector3(f);
    
    this.at = Vector3Helper.add(this.eye, f_prime);
    
    this.updateViewMatrix();
  }
}