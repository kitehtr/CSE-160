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

  //  document.getElementById('magentaSlide').addEventListener('input', function() {
  //   g_magentaAngle = this.value;
  //   // updateColorPickerButtonFromRGB();
  //   renderAllShapes();
  // });
  document.getElementById('angleSlide').addEventListener('input',
  function() {
    g_globalAngle = (this.value * 0.5);
    renderAllShapes();
  });

}

function initSliders() {
  // document.getElementById('redSlide').value = g_selectedColor[0] * 100;
  // document.getElementById('greenSlide').value = g_selectedColor[1] * 100;
  // document.getElementById('blueSlide').value = g_selectedColor[2] * 100;
  // updateColorPickerButtonFromRGB();
}

function main() {

  // Set up canvas and gl variables
  setupWebGL();
  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  addActionsForHTMLUI();
  // initSliders();
  // updateColorPickerButtonFromRGB();
  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  // canvas.onmousemove = click;
  canvas.onmousemove = function(ev) {
    if (ev.buttons == 1) {
      click(ev)
    }
  };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
  //renderAllShapes(); 
  requestAnimationFrame(tick);
}

//called by browser repeatedly whenever its time
function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  //Print some debug information so know we are running  
  updateAnimationAngles();

  //Draw everything
  renderAllShapes();

  //Tell the browser to update again when it has time
  requestAnimationFrame(tick);

}

function updateAnimationAngles() {

  if (g_BeakAnimation) {
    g_BeakAngle = (30 * Math.sin(3 * g_seconds));
  }

  if (g_walkAnimation) {
    g_legWalkAngle = (1 * Math.sin(2 * g_seconds));
    g_bodyWaddle = (3 * Math.sin(2 * g_seconds));
    g_armSwingAngle = (8 * Math.sin(2 * g_seconds));
  }
}

var g_shapesList = [];

// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = []; // THe array to store the size of the a point
function click(ev) {

  // extract the event click and return it in the WebGL coordinates
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

  // Draw every shape that is supposed to be in the canvas
  renderAllShapes();

}

function renderAllShapes() {

  // Check the time at the start of this function
  var startTime = performance.now();
  var globalRotMatr = new Matrix4().rotate(g_globalAngle + 180, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMatr.elements);

  // Clear canvas with blue background 
  gl.clearColor(0.7, 0.85, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // penguin
  // base matrix
  var penguinBase = new Matrix4();
  penguinBase.translate(0, 0, 0);
  penguinBase.scale(0.8, 0.8, 0.8);
  penguinBase.rotate(g_bodyWaddle, 0, 0, 1);
  var penguinBaseMatrix = new Matrix4(penguinBase);

  //head 
  var head = new Cube();
  head.color = [0.1, 0.1, 0.1, 1.0];
  head.matrix = new Matrix4(penguinBaseMatrix);
  head.matrix.translate( - 0.35, 0.2, -0.2);
  head.matrix.scale(0.7, 0.7, 0.5);
  head.render();

  // left eye 
  var leftEye = new Cylinder();
  leftEye.color = [0.98, 0.98, 0.98, 1.0];
  leftEye.segments = 16;
  leftEye.radiusTop = 0.1;
  leftEye.radiusBottom = 0.1;
  leftEye.height = 0.15;
  leftEye.matrix = new Matrix4(penguinBaseMatrix);
  leftEye.matrix.translate(0.15, 0.6, 0.25);
  leftEye.matrix.rotate(90, 1, 0, 0);
  leftEye.matrix.scale(1.5, 0.8, 1.2);
  leftEye.render();

  var leftPupil = new Cylinder();
  leftPupil.color = [0.1, 0.1, 0.1, 1.0];
  leftPupil.segments = 12;
  leftPupil.radiusTop = 0.05;
  leftPupil.radiusBottom = 0.05;
  leftPupil.height = 0.05;
  leftPupil.matrix = new Matrix4(penguinBaseMatrix);
  leftPupil.matrix.translate(0.15, 0.6, 0.38);
  leftPupil.matrix.rotate(90, 1, 0, 0);
  leftPupil.render();

  // tight eye
  var rightEye = new Cylinder();
  rightEye.color = [0.98, 0.98, 0.98, 1.0];
  rightEye.segments = 16;
  rightEye.radiusTop = 0.1;
  rightEye.radiusBottom = 0.1;
  rightEye.height = 0.15;
  rightEye.matrix = new Matrix4(penguinBaseMatrix);
  rightEye.matrix.translate( - 0.15, 0.6, 0.25);
  rightEye.matrix.rotate(90, 1, 0, 0);
  rightEye.matrix.scale(1.5, 0.8, 1.2);
  rightEye.render();

  var rightPupil = new Cylinder();
  rightPupil.color = [0.1, 0.1, 0.1, 1.0];
  rightPupil.segments = 12;
  rightPupil.radiusTop = 0.05;
  rightPupil.radiusBottom = 0.05;
  rightPupil.height = 0.05;
  rightPupil.matrix = new Matrix4(penguinBaseMatrix);
  rightPupil.matrix.translate( - 0.15, 0.6, 0.38);
  rightPupil.matrix.rotate(90, 1, 0, 0);
  rightPupil.render();

  // Left eyelid 
  var leftEyelid = new Cylinder();
  leftEyelid.color = [0.1, 0.1, 0.1, 1.0];
  leftEyelid.segments = 32;
  leftEyelid.radiusTop = 0.13;
  leftEyelid.radiusBottom = 0.13;
  leftEyelid.height = 0.08;
  leftEyelid.startAngle = 0;
  leftEyelid.endAngle = 180;
  leftEyelid.drawCaps = true;
  leftEyelid.matrix = new Matrix4(penguinBaseMatrix);
  leftEyelid.matrix.translate(0.15, 0.65, 0.372);
  leftEyelid.matrix.rotate(270, 1, 0, 0);
  leftEyelid.matrix.scale(1.2, 0.9, 1.2);
  leftEyelid.render();

  var rightEyelid = new Cylinder();
  rightEyelid.color = [0.1, 0.1, 0.1, 1.0];
  rightEyelid.segments = 32;
  rightEyelid.radiusTop = 0.13;
  rightEyelid.radiusBottom = 0.13;
  rightEyelid.height = 0.08;
  rightEyelid.startAngle = 0;
  rightEyelid.endAngle = 180;
  rightEyelid.drawCaps = true;
  rightEyelid.matrix = new Matrix4(penguinBaseMatrix);
  rightEyelid.matrix.translate( - 0.15, 0.65, 0.372);
  rightEyelid.matrix.rotate(270, 1, 0, 0);
  rightEyelid.matrix.scale(1.2, 0.9, 1.2);
  rightEyelid.render();

  //mouth/beak
  var upperBeak = new Cylinder();
  upperBeak.color = [1.0, 0.8, 0.3, 1.0];
  upperBeak.segments = 12;
  upperBeak.radiusTop = 0.01;
  upperBeak.radiusBottom = 0.15;
  upperBeak.height = 0.15;
  upperBeak.isHalf = true;
  upperBeak.halfDirection = 'top';
  upperBeak.matrix = new Matrix4(penguinBaseMatrix);
  upperBeak.matrix.translate( - 0.0, 0.345, 0.25);
  upperBeak.matrix.rotate(g_BeakAngle, 1, 0, 0);
  upperBeak.matrix.scale(1, 1, 2.5);
  upperBeak.matrix.rotate(90, 1, 0, 0);
  upperBeak.render();

  //lower beak
  var lowerBeak = new Cylinder();
  lowerBeak.color = [1.0, 0.8, 0.3, 1.0];
  lowerBeak.segments = 12;
  lowerBeak.radiusTop = 0.01;
  lowerBeak.radiusBottom = 0.15;
  lowerBeak.height = 0.15;
  lowerBeak.isHalf = true;
  lowerBeak.halfDirection = 'bottom';
  lowerBeak.matrix = new Matrix4(penguinBaseMatrix);
  lowerBeak.matrix.translate( - 0.0, 0.35, 0.25);
  lowerBeak.matrix.rotate( - g_BeakAngle, 1, 0, 0);
  lowerBeak.matrix.scale(1, 1, 2.5);
  lowerBeak.matrix.rotate(90, 1, 0, 0);
  lowerBeak.render();

  // Bowtie (inherits waddle)
  var bowCenter = new Cylinder();
  bowCenter.color = [1.0, 0.2, 0.2, 1.0];
  bowCenter.segments = 12;
  bowCenter.radiusTop = 0.05;
  bowCenter.radiusBottom = 0.05;
  bowCenter.height = 0.15;
  bowCenter.matrix = new Matrix4(penguinBaseMatrix);
  bowCenter.matrix.translate(0.01, 0.06, 0.32);
  bowCenter.matrix.rotate(90, 1, 0, 0);
  bowCenter.render();

  var bowRight = new Cylinder();
  bowRight.color = [1.0, 0.2, 0.2, 1.0];
  bowRight.segments = 12;
  bowRight.radiusTop = 0.08;
  bowRight.radiusBottom = 0.02;
  bowRight.height = 0.25;
  bowRight.matrix = new Matrix4(penguinBaseMatrix);
  bowRight.matrix.translate( - 0.01, 0.05, 0.32);
  bowRight.matrix.rotate(90, 1, 0, 0);
  bowRight.matrix.rotate(65, 0, 0, 1);
  bowRight.render();

  var bowLeft = new Cylinder();
  bowLeft.color = [1.0, 0.2, 0.2, 1.0];
  bowLeft.segments = 12;
  bowLeft.radiusTop = 0.08;
  bowLeft.radiusBottom = 0.02;
  bowLeft.height = 0.25;
  bowLeft.matrix = new Matrix4(penguinBaseMatrix);
  bowLeft.matrix.translate(0.04, 0.05, 0.32);
  bowLeft.matrix.rotate(90, 1, 0, 0);
  bowLeft.matrix.rotate( - 70, 0, 0, 1);
  bowLeft.render();

  // BODY (inherits waddle)
  var body = new Cube();
  body.color = [0.1, 0.1, 0.1, 1.0];
  body.matrix = new Matrix4(penguinBaseMatrix);
  body.matrix.translate( - 0.35, -0.6, -0.2);
  body.matrix.scale(0.7, 0.8, 0.5);
  body.render();

  // BELLY (inherits waddle)
  var belly = new Cube();
  belly.color = [0.95, 0.95, 0.95, 1.0];
  belly.matrix = new Matrix4(penguinBaseMatrix);
  belly.matrix.translate( - 0.25, -0.55, -0.05);
  belly.matrix.scale(0.5, 0.7, 0.4);
  belly.render();

  var belly2 = new Cube();
  belly2.color = [1.0, 1.0, 1.0, 1.0];
  belly2.matrix = new Matrix4(penguinBaseMatrix);
  belly2.matrix.translate( - 0.25, -0.55, 0.3);
  belly2.matrix.scale(0.5, 0.55, 0.1);
  belly2.render();

  var belly3 = new Cube();
  belly3.color = [0.98, 0.98, 0.98, 1.0];
  belly3.matrix = new Matrix4(penguinBaseMatrix);
  belly3.matrix.translate( - 0.25, -0.55, 0.35);
  belly3.matrix.scale(0.5, 0.35, 0.1);
  belly3.render();

  // WINGS (inherit waddle)
  // LEFT WING
  var leftArm = new Cube();
  leftArm.color = [0.1, 0.1, 0.1, 1.0];
  leftArm.matrix = new Matrix4(penguinBaseMatrix);
  leftArm.matrix.translate(0.35, -0.3, 0.15); 
  leftArm.matrix.rotate(g_armSwingAngle, 0, 0, 1); 
  leftArm.matrix.translate(0.13, 0.07, 0.2); 
  leftArm.matrix.rotate(90, -20, 40, 0); 
  leftArm.matrix.scale(0.5, 0.4, 0.08);
  leftArm.render();

  // RIGHT WING
  var rightArm = new Cube();
  rightArm.color = [0.1, 0.1, 0.1, 1.0];
  rightArm.matrix = new Matrix4(penguinBaseMatrix);
  rightArm.matrix.translate( - 0.35, -0.3, 0.15); 
  rightArm.matrix.rotate(-g_armSwingAngle, 0, 0, 1);
  rightArm.matrix.translate( - 0.3, -0.1, 0.2); 
  rightArm.matrix.rotate(90, 20, 40, 0);
  rightArm.matrix.scale(0.5, 0.4, 0.08);
  rightArm.render();

  // Legs
  var leftThigh = new Cube();
  leftThigh.color = [0.5, 0.5, 0.5, 1.0];
  leftThigh.matrix = new Matrix4(penguinBaseMatrix);
  leftThigh.matrix.translate(0, -0.65, -0.2);
  leftThigh.matrix.rotate(g_legWalkAngle, 1, 0, 0);
  leftThigh.matrix.translate(0, -0.1, 0);
  var leftThighMatrix = new Matrix4(leftThigh.matrix);
  leftThigh.matrix.scale(0.35, 0.15, 0.5);
  leftThigh.render();

  // left lower leg 
  var leftLeg = new Cube();
  leftLeg.color = [0.6, 0.6, 0.6, 1.0];
  leftLeg.matrix = new Matrix4(leftThighMatrix);
  leftLeg.matrix.translate(0, -0.05, 0);
  leftLeg.matrix.rotate(g_lowerLegAngle, 1, 0, 0);
  leftLeg.matrix.translate(0, -0.1, 0);
  var leftLegMatrix = new Matrix4(leftLeg.matrix);
  leftLeg.matrix.scale(0.35, 0.15, 0.5);
  leftLeg.render();

  // left foot
  var leftFoot = new Cube();
  leftFoot.color = [1.0, 0.65, 0.0, 1.0];
  leftFoot.matrix = new Matrix4(leftLegMatrix);
  leftFoot.matrix.translate(0, -0.08, 0);
  leftFoot.matrix.scale(0.35, 0.08, 0.7);
  leftFoot.render();

  // right thigh
  var rightThigh = new Cube();
  rightThigh.color = [0.5, 0.5, 0.5, 1.0];
  rightThigh.matrix = new Matrix4(penguinBaseMatrix);
  rightThigh.matrix.translate( - 0.35, -0.65, -0.2);
  rightThigh.matrix.rotate( - g_legWalkAngle, 1, 0, 0);
  rightThigh.matrix.translate(0, -0.1, 0);
  var rightThighMatrix = new Matrix4(rightThigh.matrix);
  rightThigh.matrix.scale(0.35, 0.15, 0.5);
  rightThigh.render();

  // lower right leg
  var rightLeg = new Cube();
  rightLeg.color = [0.6, 0.6, 0.6, 1.0];
  rightLeg.matrix = new Matrix4(rightThighMatrix);
  rightLeg.matrix.translate(0, -0.05, 0);
  rightLeg.matrix.rotate( - g_lowerLegAngle, 1, 0, 0);
  rightLeg.matrix.translate(0, -0.1, 0);
  var rightLegMatrix = new Matrix4(rightLeg.matrix);
  rightLeg.matrix.scale(0.35, 0.15, 0.5);
  rightLeg.render();

  // right foot
  var rightFoot = new Cube();
  rightFoot.color = [1.0, 0.65, 0.0, 1.0];
  rightFoot.matrix = new Matrix4(rightLegMatrix);
  rightFoot.matrix.translate(0, -0.08, 0);
  rightFoot.matrix.scale(0.35, 0.08, 0.7);
  rightFoot.render();

  // performance
  var len = g_shapesList.length;
  var duration = performance.now() - startTime;
  var fps = duration > 0 ? Math.floor(1000 / duration) : 0;
  sendTextToHTML("Render Time: " + Math.floor(duration) + "ms | FPS: " + fps, "numdot");
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}