// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `attribute vec4 a_Position;
uniform float u_Size;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;
void main() {
  gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  //gl_PointSize = 30.0;
  gl_PointSize = u_Size;
}`

// Fragment shader program
var FSHADER_SOURCE = `precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}`

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let g_selectedSegments = 10;
let g_yellowAnimation = false;
let g_BeakAnimation = false;
//mouse
let g_mouseDown = false;
let g_lastMouseX = null;
let g_lastMouseY = null;
let g_globalAngleX = 0;  
let g_globalAngleY = 0; 

// poke animation variables
let g_pokeAnimation = false;
let g_pokeStartTime = 0;
let g_pokeDuration = 1.5; 
let g_pokeEyeScale = 1.0;
let g_pokeBodyJump = 0;
let g_pokeArmFlap = 0;
let g_pokeBeakOpen = 0;

// Performance tracking
let g_frameCount = 0;
let g_lastFpsTime = 0;
let g_fps = 0;
let g_lastRenderTime = 0;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", {
    preserveDrawingBuffer: true
  });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

//Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;
//Globals related to UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_globalAngle = 0;
let g_lowerLegAngle = 0;
let g_BeakAngle = 0;
let g_magentaAngle = 0;
let g_bodyWaddle = 0;
let g_legWalkAngle = 0;
let g_armSwingAngle = 0;
let g_walkAnimation = false;
let g_startTime = performance.now() / 1000.0;
let g_seconds = performance.now() / 1000.0 - g_startTime;

// Performance optimization: Reusable objects
let g_reuse = {
  matrices: {
    penguinBase: new Matrix4(),
    penguinBaseMatrix: new Matrix4(),
    globalRotMatr: new Matrix4(),
    leftThighMatrix: new Matrix4(),
    leftLegMatrix: new Matrix4(),
    rightThighMatrix: new Matrix4(),
    rightLegMatrix: new Matrix4(),
    tempMatrix1: new Matrix4(),
    tempMatrix2: new Matrix4()
  },
  shapes: {
    head: null,
    leftEye: null,
    leftPupil: null,
    rightEye: null,
    rightPupil: null,
    leftEyelid: null,
    rightEyelid: null,
    upperBeak: null,
    lowerBeak: null,
    bowCenter: null,
    bowRight: null,
    bowLeft: null,
    body: null,
    belly: null,
    belly2: null,
    belly3: null,
    leftArm: null,
    rightArm: null,
    leftThigh: null,
    leftLeg: null,
    leftFoot: null,
    rightThigh: null,
    rightLeg: null,
    rightFoot: null
  }
};

function initReusableShapes() {
  // Initialize all shapes once
  g_reuse.shapes.head = new Cube();
  g_reuse.shapes.leftEye = new Cylinder();
  g_reuse.shapes.leftPupil = new Cylinder();
  g_reuse.shapes.rightEye = new Cylinder();
  g_reuse.shapes.rightPupil = new Cylinder();
  g_reuse.shapes.leftEyelid = new Cylinder();
  g_reuse.shapes.rightEyelid = new Cylinder();
  g_reuse.shapes.upperBeak = new Cylinder();
  g_reuse.shapes.lowerBeak = new Cylinder();
  g_reuse.shapes.bowCenter = new Cylinder();
  g_reuse.shapes.bowRight = new Cylinder();
  g_reuse.shapes.bowLeft = new Cylinder();
  g_reuse.shapes.body = new Cube();
  g_reuse.shapes.belly = new Cube();
  g_reuse.shapes.belly2 = new Cube();
  g_reuse.shapes.belly3 = new Cube();
  g_reuse.shapes.leftArm = new Cube();
  g_reuse.shapes.rightArm = new Cube();
  g_reuse.shapes.leftThigh = new Cube();
  g_reuse.shapes.leftLeg = new Cube();
  g_reuse.shapes.leftFoot = new Cube();
  g_reuse.shapes.rightThigh = new Cube();
  g_reuse.shapes.rightLeg = new Cube();
  g_reuse.shapes.rightFoot = new Cube();
  
  // Set constant properties once
  g_reuse.shapes.leftEye.segments = 16;
  g_reuse.shapes.leftEye.radiusTop = 0.1;
  g_reuse.shapes.leftEye.radiusBottom = 0.1;
  g_reuse.shapes.leftEye.height = 0.15;
  
  g_reuse.shapes.leftPupil.segments = 12;
  g_reuse.shapes.leftPupil.radiusTop = 0.05;
  g_reuse.shapes.leftPupil.radiusBottom = 0.05;
  g_reuse.shapes.leftPupil.height = 0.05;
  
  g_reuse.shapes.rightEye.segments = 16;
  g_reuse.shapes.rightEye.radiusTop = 0.1;
  g_reuse.shapes.rightEye.radiusBottom = 0.1;
  g_reuse.shapes.rightEye.height = 0.15;
  
  g_reuse.shapes.rightPupil.segments = 12;
  g_reuse.shapes.rightPupil.radiusTop = 0.05;
  g_reuse.shapes.rightPupil.radiusBottom = 0.05;
  g_reuse.shapes.rightPupil.height = 0.05;
  
  g_reuse.shapes.leftEyelid.segments = 32;
  g_reuse.shapes.leftEyelid.radiusTop = 0.13;
  g_reuse.shapes.leftEyelid.radiusBottom = 0.13;
  g_reuse.shapes.leftEyelid.height = 0.08;
  g_reuse.shapes.leftEyelid.startAngle = 0;
  g_reuse.shapes.leftEyelid.endAngle = 180;
  g_reuse.shapes.leftEyelid.drawCaps = true;
  
  g_reuse.shapes.rightEyelid.segments = 32;
  g_reuse.shapes.rightEyelid.radiusTop = 0.13;
  g_reuse.shapes.rightEyelid.radiusBottom = 0.13;
  g_reuse.shapes.rightEyelid.height = 0.08;
  g_reuse.shapes.rightEyelid.startAngle = 0;
  g_reuse.shapes.rightEyelid.endAngle = 180;
  g_reuse.shapes.rightEyelid.drawCaps = true;
  
  g_reuse.shapes.upperBeak.segments = 12;
  g_reuse.shapes.upperBeak.radiusTop = 0.01;
  g_reuse.shapes.upperBeak.radiusBottom = 0.15;
  g_reuse.shapes.upperBeak.height = 0.15;
  g_reuse.shapes.upperBeak.isHalf = true;
  g_reuse.shapes.upperBeak.halfDirection = 'top';
  
  g_reuse.shapes.lowerBeak.segments = 12;
  g_reuse.shapes.lowerBeak.radiusTop = 0.01;
  g_reuse.shapes.lowerBeak.radiusBottom = 0.15;
  g_reuse.shapes.lowerBeak.height = 0.15;
  g_reuse.shapes.lowerBeak.isHalf = true;
  g_reuse.shapes.lowerBeak.halfDirection = 'bottom';
  
  g_reuse.shapes.bowCenter.segments = 12;
  g_reuse.shapes.bowCenter.radiusTop = 0.05;
  g_reuse.shapes.bowCenter.radiusBottom = 0.05;
  g_reuse.shapes.bowCenter.height = 0.15;
  
  g_reuse.shapes.bowRight.segments = 12;
  g_reuse.shapes.bowRight.radiusTop = 0.08;
  g_reuse.shapes.bowRight.radiusBottom = 0.02;
  g_reuse.shapes.bowRight.height = 0.25;
  
  g_reuse.shapes.bowLeft.segments = 12;
  g_reuse.shapes.bowLeft.radiusTop = 0.08;
  g_reuse.shapes.bowLeft.radiusBottom = 0.02;
  g_reuse.shapes.bowLeft.height = 0.25;
}

function addActionsForHTMLUI() {
  //Button Events (Shape Type)
  document.getElementById('animationBeakOffButton').onclick = function() {
    g_BeakAnimation = false;
  };

  document.getElementById('animationBeakOnButton').onclick = function() {
    g_BeakAnimation = true;
  };

  document.getElementById('animationWalkOnButton').onclick = function() {
    g_walkAnimation = true;
  };

  document.getElementById('animationWalkOffButton').onclick = function() {
    g_walkAnimation = false;
  };

  document.getElementById('BeakSlide').addEventListener('input',
  function() {
    g_BeakAngle = this.value;
    renderAllShapes();
  });

  document.getElementById('jointSlide').addEventListener('input',
  function() {
    g_lowerLegAngle = this.value;
    renderAllShapes();
  });

  document.getElementById('angleSlide').addEventListener('input',
  function() {
    g_globalAngleY = (this.value * 0.5);
    renderAllShapes();
  });
}

function updatePerformanceDisplay(duration) {
  g_frameCount++;
  let currentTime = performance.now();
  
  // Update FPS every second
  if (currentTime - g_lastFpsTime > 1000) {
    g_fps = Math.round((g_frameCount * 1000) / (currentTime - g_lastFpsTime));
    g_frameCount = 0;
    g_lastFpsTime = currentTime;
  }
  
  // Update display
  let fpsText = `FPS: ${g_fps} | Render: ${Math.round(duration)}ms`;
  if (g_pokeAnimation) {
    fpsText += " |  Poked!";
  }
  sendTextToHTML(fpsText, "numdot");
}

function initSliders() {
  // Initialize slider to match current rotation
  document.getElementById('angleSlide').value = g_globalAngleY * 2;
}

function main() {
  // Set up canvas and gl variables
  setupWebGL();
  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  // Initialize reusable shapes
  initReusableShapes();
  
  addActionsForHTMLUI();
  initSliders();
  
  // Initialize performance tracking
  g_lastFpsTime = performance.now();
  
  // Register mouse event handlers
  canvas.onmousedown = function(ev) { mouseDown(ev); };
  canvas.onmouseup = function(ev) { mouseUp(ev); };
  canvas.onmousemove = function(ev) { mouseMove(ev); };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  requestAnimationFrame(tick);
}

//called by browser repeatedly whenever its time
function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  
  updateAnimationAngles();
  renderAllShapes();
  
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_BeakAnimation) {
    g_BeakAngle = (30 * Math.sin(3 * g_seconds));
  }

  if (g_walkAnimation) {
    g_legWalkAngle = (1 * Math.sin(2 * g_seconds));
    g_bodyWaddle = (3 * Math.sin(2 * g_seconds));
    g_armSwingAngle = (25 * Math.sin(1 * g_seconds));
  }
  
  // Update poke animation
  updatePokeAnimation();
}

function updatePokeAnimation() {
  if (g_pokeAnimation) {
    let elapsed = g_seconds - g_pokeStartTime;
    let progress = elapsed / g_pokeDuration;
    
    if (progress >= 1.0) {
      // Animation finished
      g_pokeAnimation = false;
      g_pokeEyeScale = 1.0;
      g_pokeBodyJump = 0;
      g_pokeArmFlap = 0;
      g_pokeBeakOpen = 0;
    } else {
      // Surprised reaction: eyes get big, body jumps, arms flap, beak opens
      // Use sin for smooth animation
      let wave = Math.sin(progress * Math.PI);
      
      // Eyes expand then return to normal
      g_pokeEyeScale = 1.0 + (0.8 * wave);
      
      // Body jumps up
      g_pokeBodyJump = 0.4 * wave;
      
      // Arms flap outward rapidly
      g_pokeArmFlap = 40 * Math.sin(progress * Math.PI * 4);
      
      // Beak opens wide in surprise
      g_pokeBeakOpen = 50 * wave;
    }
  }
}

var g_shapesList = [];

function click(ev) {
  let[x, y] = convertCoordinatesEventToGL(ev);

  let point;
  if (g_selectedType == POINT) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
  } else {
    point = new Circle();
  }
  point.position = [x, y];
  point.size = g_selectedSize;

  if (g_selectedType == CIRCLE) {
    point.segments = g_selectedSegments;
  }

  g_shapesList.push(point);
  renderAllShapes();
}

function renderAllShapes() {
  let startTime = performance.now();
  
  // Use reusable matrix
  let globalRotMatr = g_reuse.matrices.globalRotMatr;
  globalRotMatr.setIdentity();
  globalRotMatr.rotate(g_globalAngleX, 1, 0, 0);
  globalRotMatr.rotate(g_globalAngleY + 180, 0, 1, 0);
  
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMatr.elements);

  // Clear canvas with blue background 
  gl.clearColor(0.7, 0.85, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // penguin base matrix using reusable matrix
  let penguinBase = g_reuse.matrices.penguinBase;
  penguinBase.setIdentity();
  penguinBase.translate(0, g_pokeBodyJump, 0);  // Add jump from poke animation
  penguinBase.scale(0.8, 0.8, 0.8);
  penguinBase.rotate(g_bodyWaddle, 0, 0, 1);
  
  let penguinBaseMatrix = g_reuse.matrices.penguinBaseMatrix;
  penguinBaseMatrix.set(penguinBase);

  //head 
  let head = g_reuse.shapes.head;
  head.color = [0.1, 0.1, 0.1, 1.0];
  head.matrix.set(penguinBaseMatrix);
  head.matrix.translate(-0.35, 0.2, -0.2);
  head.matrix.scale(0.7, 0.7, 0.5);
  head.render();

  // left eye with poke scaling
  let leftEye = g_reuse.shapes.leftEye;
  leftEye.color = [0.98, 0.98, 0.98, 1.0];
  leftEye.matrix.set(penguinBaseMatrix);
  leftEye.matrix.translate(0.15, 0.6, 0.25);
  leftEye.matrix.rotate(90, 1, 0, 0);
  leftEye.matrix.scale(1.5 * g_pokeEyeScale, 0.8 * g_pokeEyeScale, 1.2 * g_pokeEyeScale);
  leftEye.render();

  let leftPupil = g_reuse.shapes.leftPupil;
  leftPupil.color = [0.1, 0.1, 0.1, 1.0];
  leftPupil.matrix.set(penguinBaseMatrix);
  leftPupil.matrix.translate(0.15, 0.6, 0.38);
  leftPupil.matrix.rotate(90, 1, 0, 0);
  leftPupil.matrix.scale(g_pokeEyeScale, g_pokeEyeScale, g_pokeEyeScale);
  leftPupil.render();

  // right eye with poke scaling
  let rightEye = g_reuse.shapes.rightEye;
  rightEye.color = [0.98, 0.98, 0.98, 1.0];
  rightEye.matrix.set(penguinBaseMatrix);
  rightEye.matrix.translate(-0.15, 0.6, 0.25);
  rightEye.matrix.rotate(90, 1, 0, 0);
  rightEye.matrix.scale(1.5 * g_pokeEyeScale, 0.8 * g_pokeEyeScale, 1.2 * g_pokeEyeScale);
  rightEye.render();

  let rightPupil = g_reuse.shapes.rightPupil;
  rightPupil.color = [0.1, 0.1, 0.1, 1.0];
  rightPupil.matrix.set(penguinBaseMatrix);
  rightPupil.matrix.translate(-0.15, 0.6, 0.38);
  rightPupil.matrix.rotate(90, 1, 0, 0);
  rightPupil.matrix.scale(g_pokeEyeScale, g_pokeEyeScale, g_pokeEyeScale);
  rightPupil.render();

  // Left eyelid 
  let leftEyelid = g_reuse.shapes.leftEyelid;
  leftEyelid.color = [0.1, 0.1, 0.1, 1.0];
  leftEyelid.matrix.set(penguinBaseMatrix);
  leftEyelid.matrix.translate(0.15, 0.65, 0.372);
  leftEyelid.matrix.rotate(270, 1, 0, 0);
  leftEyelid.matrix.scale(1.2, 0.9, 1.2);
  leftEyelid.render();

  let rightEyelid = g_reuse.shapes.rightEyelid;
  rightEyelid.color = [0.1, 0.1, 0.1, 1.0];
  rightEyelid.matrix.set(penguinBaseMatrix);
  rightEyelid.matrix.translate(-0.15, 0.65, 0.372);
  rightEyelid.matrix.rotate(270, 1, 0, 0);
  rightEyelid.matrix.scale(1.2, 0.9, 1.2);
  rightEyelid.render();

  //mouth/beak with poke animation
  let currentBeakAngle = g_BeakAnimation ? g_BeakAngle : 0;
  currentBeakAngle += g_pokeBeakOpen;  // Add poke beak opening
  
  let upperBeak = g_reuse.shapes.upperBeak;
  upperBeak.color = [1.0, 0.8, 0.3, 1.0];
  upperBeak.matrix.set(penguinBaseMatrix);
  upperBeak.matrix.translate(-0.0, 0.345, 0.25);
  upperBeak.matrix.rotate(currentBeakAngle, 1, 0, 0);
  upperBeak.matrix.scale(1, 1, 2.5);
  upperBeak.matrix.rotate(90, 1, 0, 0);
  upperBeak.render();

  //lower beak
  let lowerBeak = g_reuse.shapes.lowerBeak;
  lowerBeak.color = [1.0, 0.8, 0.3, 1.0];
  lowerBeak.matrix.set(penguinBaseMatrix);
  lowerBeak.matrix.translate(-0.0, 0.35, 0.25);
  lowerBeak.matrix.rotate(-currentBeakAngle, 1, 0, 0);
  lowerBeak.matrix.scale(1, 1, 2.5);
  lowerBeak.matrix.rotate(90, 1, 0, 0);
  lowerBeak.render();

  // Bowtie
  let bowCenter = g_reuse.shapes.bowCenter;
  bowCenter.color = [1.0, 0.2, 0.2, 1.0];
  bowCenter.matrix.set(penguinBaseMatrix);
  bowCenter.matrix.translate(0.01, 0.06, 0.32);
  bowCenter.matrix.rotate(90, 1, 0, 0);
  bowCenter.render();

  let bowRight = g_reuse.shapes.bowRight;
  bowRight.color = [1.0, 0.2, 0.2, 1.0];
  bowRight.matrix.set(penguinBaseMatrix);
  bowRight.matrix.translate(-0.01, 0.05, 0.32);
  bowRight.matrix.rotate(90, 1, 0, 0);
  bowRight.matrix.rotate(65, 0, 0, 1);
  bowRight.render();

  let bowLeft = g_reuse.shapes.bowLeft;
  bowLeft.color = [1.0, 0.2, 0.2, 1.0];
  bowLeft.matrix.set(penguinBaseMatrix);
  bowLeft.matrix.translate(0.04, 0.05, 0.32);
  bowLeft.matrix.rotate(90, 1, 0, 0);
  bowLeft.matrix.rotate(-70, 0, 0, 1);
  bowLeft.render();

  // Body
  let body = g_reuse.shapes.body;
  body.color = [0.1, 0.1, 0.1, 1.0];
  body.matrix.set(penguinBaseMatrix);
  body.matrix.translate(-0.35, -0.6, -0.2);
  body.matrix.scale(0.7, 0.8, 0.5);
  body.render();

  // Belly
  let belly = g_reuse.shapes.belly;
  belly.color = [0.95, 0.95, 0.95, 1.0];
  belly.matrix.set(penguinBaseMatrix);
  belly.matrix.translate(-0.25, -0.55, -0.05);
  belly.matrix.scale(0.5, 0.7, 0.4);
  belly.render();

  let belly2 = g_reuse.shapes.belly2;
  belly2.color = [1.0, 1.0, 1.0, 1.0];
  belly2.matrix.set(penguinBaseMatrix);
  belly2.matrix.translate(-0.25, -0.55, 0.3);
  belly2.matrix.scale(0.5, 0.55, 0.1);
  belly2.render();

  let belly3 = g_reuse.shapes.belly3;
  belly3.color = [0.98, 0.98, 0.98, 1.0];
  belly3.matrix.set(penguinBaseMatrix);
  belly3.matrix.translate(-0.25, -0.55, 0.35);
  belly3.matrix.scale(0.5, 0.35, 0.1);
  belly3.render();

  // WINGS with poke flapping
  // left arm
  let leftArm = g_reuse.shapes.leftArm;
  leftArm.color = [0.1, 0.1, 0.1, 1.0];
  leftArm.matrix.set(penguinBaseMatrix);
  leftArm.matrix.translate(0.3, 0.06, 0.3);
  let swingBias = -50; 
  let leftArmAngle = swingBias + g_armSwingAngle + g_pokeArmFlap;  // Add poke flap
  leftArm.matrix.rotate(leftArmAngle, 0, 0, 1);
  leftArm.matrix.rotate(-90, 1, 0, 0);  
  leftArm.matrix.scale(0.7, 0.5, 0.09); 
  leftArm.render();

  // right wing 
  let rightArm = g_reuse.shapes.rightArm;
  rightArm.color = [0.1, 0.1, 0.1, 1.0];
  rightArm.matrix.set(penguinBaseMatrix);
  rightArm.matrix.translate(-0.36, 0.1, 0.3); 
  rightArm.matrix.rotate(-leftArmAngle + 180, 0, 0, 1);
  rightArm.matrix.rotate(-90, 1, 0, 0);
  rightArm.matrix.scale(0.7, 0.5, 0.09);
  rightArm.render();

  // Legs
  let leftThigh = g_reuse.shapes.leftThigh;
  leftThigh.color = [0.5, 0.5, 0.5, 1.0];
  leftThigh.matrix.set(penguinBaseMatrix);
  leftThigh.matrix.translate(0, -0.65, -0.2);
  leftThigh.matrix.rotate(g_legWalkAngle, 1, 0, 0);
  leftThigh.matrix.translate(0, -0.1, 0);
  let leftThighMatrix = g_reuse.matrices.leftThighMatrix;
  leftThighMatrix.set(leftThigh.matrix);
  leftThigh.matrix.scale(0.35, 0.15, 0.5);
  leftThigh.render();

  // left lower leg 
  let leftLeg = g_reuse.shapes.leftLeg;
  leftLeg.color = [0.6, 0.6, 0.6, 1.0];
  leftLeg.matrix.set(leftThighMatrix);
  leftLeg.matrix.translate(0, -0.05, 0);
  leftLeg.matrix.rotate(g_lowerLegAngle, 1, 0, 0);
  leftLeg.matrix.translate(0, -0.1, 0);
  let leftLegMatrix = g_reuse.matrices.leftLegMatrix;
  leftLegMatrix.set(leftLeg.matrix);
  leftLeg.matrix.scale(0.35, 0.15, 0.5);
  leftLeg.render();

  // left foot
  let leftFoot = g_reuse.shapes.leftFoot;
  leftFoot.color = [1.0, 0.65, 0.0, 1.0];
  leftFoot.matrix.set(leftLegMatrix);
  leftFoot.matrix.translate(0, -0.08, 0);
  leftFoot.matrix.scale(0.35, 0.08, 0.7);
  leftFoot.render();

  // right thigh
  let rightThigh = g_reuse.shapes.rightThigh;
  rightThigh.color = [0.5, 0.5, 0.5, 1.0];
  rightThigh.matrix.set(penguinBaseMatrix);
  rightThigh.matrix.translate(-0.35, -0.65, -0.2);
  rightThigh.matrix.rotate(-g_legWalkAngle, 1, 0, 0);
  rightThigh.matrix.translate(0, -0.1, 0);
  let rightThighMatrix = g_reuse.matrices.rightThighMatrix;
  rightThighMatrix.set(rightThigh.matrix);
  rightThigh.matrix.scale(0.35, 0.15, 0.5);
  rightThigh.render();

  // lower right leg
  let rightLeg = g_reuse.shapes.rightLeg;
  rightLeg.color = [0.6, 0.6, 0.6, 1.0];
  rightLeg.matrix.set(rightThighMatrix);
  rightLeg.matrix.translate(0, -0.05, 0);
  rightLeg.matrix.rotate(-g_lowerLegAngle, 1, 0, 0);
  rightLeg.matrix.translate(0, -0.1, 0);
  let rightLegMatrix = g_reuse.matrices.rightLegMatrix;
  rightLegMatrix.set(rightLeg.matrix);
  rightLeg.matrix.scale(0.35, 0.15, 0.5);
  rightLeg.render();

  // right foot
  let rightFoot = g_reuse.shapes.rightFoot;
  rightFoot.color = [1.0, 0.65, 0.0, 1.0];
  rightFoot.matrix.set(rightLegMatrix);
  rightFoot.matrix.translate(0, -0.08, 0);
  rightFoot.matrix.scale(0.35, 0.08, 0.7);
  rightFoot.render();

  // Update performance display
  let duration = performance.now() - startTime;
  updatePerformanceDisplay(duration);
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

function mouseDown(ev) {
  if (ev.shiftKey) {
    g_pokeAnimation = true;
    g_pokeStartTime = g_seconds;
    return; 
  }
  
  g_mouseDown = true;
  g_lastMouseX = ev.clientX;
  g_lastMouseY = ev.clientY;
}

function mouseUp(ev) {
  g_mouseDown = false;
}

function mouseMove(ev) {
  if (!g_mouseDown) {
    return;
  }
  
  let newX = ev.clientX;
  let newY = ev.clientY;
  
  let deltaX = newX - g_lastMouseX;
  let deltaY = newY - g_lastMouseY;
  
  g_globalAngleY += deltaX * 0.5;
  g_globalAngleX += deltaY * 0.5;
  
  g_globalAngleX = Math.max(-90, Math.min(90, g_globalAngleX));
  
  document.getElementById('angleSlide').value = g_globalAngleY * 2;
  
  g_lastMouseX = newX;
  g_lastMouseY = newY;
  
  renderAllShapes();
}