// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;
varying vec2 v_UV;
// uniform float u_Size;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
  //gl_PointSize = 30.0;
  // gl_PointSize = u_Size;
}`

// Fragment shader program
var FSHADER_SOURCE = `precision mediump float;
varying vec2 v_UV;
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform float u_texColorWeight;
uniform int u_whichTexture;
void main() {
  if (u_whichTexture == -2) {
    gl_FragColor = u_FragColor;
  
  } else if (u_whichTexture == -1) {
    gl_FragColor = vec4(v_UV, 1.0, 1.0);

  } else if (u_whichTexture == 0) {
    vec4 baseColor = u_FragColor;
    vec4 texColor = texture2D(u_Sampler0, v_UV);
    gl_FragColor = (1.0 - u_texColorWeight) * baseColor + u_texColorWeight * texColor;
    
  } else if (u_whichTexture == 1) {
    vec4 baseColor = u_FragColor;
    vec4 texColor = texture2D(u_Sampler1, v_UV);
    gl_FragColor = (1.0 - u_texColorWeight) * baseColor + u_texColorWeight * texColor;
    
  } else if (u_whichTexture == 2) {
    vec4 baseColor = u_FragColor;
    vec4 texColor = texture2D(u_Sampler2, v_UV);
    gl_FragColor = (1.0 - u_texColorWeight) * baseColor + u_texColorWeight * texColor;
    
  } else if (u_whichTexture == 3) {
    vec4 baseColor = u_FragColor;
    vec4 texColor = texture2D(u_Sampler3, v_UV);
    gl_FragColor = (1.0 - u_texColorWeight) * baseColor + u_texColorWeight * texColor;
    
  } else {
    gl_FragColor = vec4(1.0, 0.2, 1.0, 1.0);
  }
}`

// Global Variables
let canvas;
let gl;
let a_Position;
let a_UV;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;
let u_GlobalRotateMatrix;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_Sampler3;
let u_whichTexture;
let g_globalAngle = 0;
let u_texColorWeight;

// performance tracking
let g_frameCount = 0;
let g_lastFpsTime = 0;
let g_fps = 0;
let g_lastRenderTime = 0;

// Reusable cube object 
let g_reusableCube = null;

// Camera controls
let g_cameraPos = [0, 2, 10];  
let g_cameraYaw = 0;        
let g_cameraPitch = 0;          
let g_moveSpeed = 0.2;
let g_rotateSpeed = 2.0;

// Mouse control
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_mouseSensitivity = 0.2;

// Key states
let g_keys = {};

// TNT GAME variables
let g_tntBlocks = []; 
let g_tntTotal = 3;
let g_tntRemaining = 3;
let g_gameStarted = false;
let g_gameWon = false;
let g_gameStartTime = 0;
let g_gameTimeLimit = 120; 

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
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

  //Get the storage location of a_UV
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
  }

  // get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }

  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if(!u_Sampler0) {
    console.log('Failed to create sampler0 object');
    return false;
  }

  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if(!u_Sampler1) {
    console.log('Failed to create sampler1 object');
    return false;
  }

  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if(!u_Sampler2) {
    console.log('Failed to create sampler2 object');
    return false;
  }
  
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  if(!u_Sampler3) {
    console.log('Failed to create sampler3 object');
    return false;
  }

  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
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

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }
  
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  if (!u_texColorWeight) {
    console.log('Failed to get the storage location of u_texColorWeight');
    return;
  }
}

//Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_selectorColor = [1.0,1.0,1.0,1.0];
let g_selectedSize = 5;
var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;


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

  document.getElementById('animationArmOnButton').onclick = function() {
    g_ArmAnimation = true;
  };

  document.getElementById('animationArmOffButton').onclick = function() {
    g_ArmAnimation = false;
  };

  document.getElementById('animationLegOnButton').onclick = function() {
    g_legAnimation = true;
    renderAllShapes();
  };

  document.getElementById('fallOverButton').onclick = function() {
    g_fallAnimation = true;
    g_fallStartTime = g_seconds;
    g_fallRotation = 0;
    g_fallArmFlail = 0;
    g_fallYPosition = 0;
    g_fallXPosition = 0;
  };

  document.getElementById('angleSlide').addEventListener('input',
    function() {
      g_globalAngle = (this.value * 0.5);
      renderAllShapes();
    }
  );
}

function initTextures(gl, n) {
  // Load texture 0 - sky.jpg
  var image0 = new Image();
  if(!image0) {
    console.log('Failed to create the image0 object');
    return false;
  }
  image0.onload = function() { sendImageToTexture(image0, 0); };
  image0.src = 'sky.jpg';

  // Load texture 1 - bookshelf.jpg
  var image1 = new Image();
  if(!image1) {
    console.log('Failed to create the image1 object');
    return false;
  }
  image1.onload = function() { sendImageToTexture(image1, 1); };
  image1.src = 'bookshelf.jpg';

  // Load texture 2 - ice-cube.png
  var image2 = new Image();
  if(!image2) {
    console.log('Failed to create the image2 object');
    return false;
  }
  image2.onload = function() { sendImageToTexture(image2, 2); };
  image2.src = 'ice-cube.png';

  // Load texture 3 - tnt.png
  var image3 = new Image();
  if(!image3) {
    console.log('Failed to create the image3 object');
    return false;
  }
  image3.onload = function() { sendImageToTexture(image3, 3); };
  image3.src = 'tnt.png';
  
  return true;
}

function sendImageToTexture(image, textureUnit) {
  var texture = gl.createTexture();
  if(!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  
  // Activate the appropriate texture unit
  if (textureUnit === 0) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(u_Sampler0, 0);
  } else if (textureUnit === 1) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(u_Sampler1, 1);
  } else if (textureUnit === 2) {
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(u_Sampler2, 2);
  } else if (textureUnit === 3) {
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(u_Sampler3, 3);
  }

  console.log('Finished loading texture ' + textureUnit);
}

function main() {
  // Set up canvas and gl variables
  setupWebGL();
  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  // Initialize camera
  g_camera = new Camera(canvas);

  // Initialize reusable shapes
  // initReusableShapes();
  
  addActionsForHTMLUI();

  document.onkeydown = keydown;
  
  // Add mouse controls
  canvas.onmousedown = handleMouseDown;
  canvas.onmouseup = handleMouseUp;
  canvas.onmousemove = handleMouseMove;

  initTextures(gl,0);
  
  // Create reusable cube
  g_reusableCube = new Cube();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  
  requestAnimationFrame(tick);
}

//called by browser repeatedly whenever its time
function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  
  // updateAnimationAngles();
  renderAllShapes();
  
  requestAnimationFrame(tick);
}

var g_shapesList = [];

// Camera will be initialized in main()
var g_camera;

// 32x32 world map 
var g_map = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];


function keydown(ev) {
  // W - Move forward
  if (ev.keyCode == 87) {
    g_camera.moveForward();
    console.log("Moving forward");
  }
  // S - Move backward
  else if (ev.keyCode == 83) {
    g_camera.moveBackward();
    console.log("Moving backward");
  }
  // A - Move left
  else if (ev.keyCode == 65) {
    g_camera.moveLeft();
    console.log("Moving left");
  }
  // D - Move right
  else if (ev.keyCode == 68) {
    g_camera.moveRight();
    console.log("Moving right");
  }
  // Q - Pan left
  else if (ev.keyCode == 81) {
    g_camera.panLeft();
    console.log("Panning left");
  }
  // E - Pan right
  else if (ev.keyCode == 69) {
    g_camera.panRight();
    console.log("Panning right");
  }
  // Right arrow
  else if (ev.keyCode == 39) {
    g_camera.eye.elements[0] += 0.2;
    g_camera.updateViewMatrix();
  }
  // Left arrow
  else if (ev.keyCode == 37) {
    g_camera.eye.elements[0] -= 0.2;
    g_camera.updateViewMatrix();
  }
  // SPACE - Add block
  else if (ev.keyCode == 32) {
    addBlock();
  }
  // X - Delete block
  else if (ev.keyCode == 88) {
    deleteBlock();
  }
  // G - Start/Restart game 
  else if (ev.keyCode == 71) {
    initTNTGame();
  }
  // F - Defuse TNT 
  else if (ev.keyCode == 70) {
    if (g_gameStarted && !g_gameWon) {
      defuseTNT();
    }
  }
  
  console.log("Key pressed:", ev.keyCode);
}

function handleMouseDown(ev) {
  g_mouseDown = true;
  g_lastMouseX = ev.clientX;
  g_lastMouseY = ev.clientY;
}

function handleMouseUp(ev) {
  g_mouseDown = false;
}

function handleMouseMove(ev) {
  if (!g_mouseDown) return;
  
  let currentX = ev.clientX;
  let currentY = ev.clientY;
  
  let deltaX = currentX - g_lastMouseX;
  let deltaY = currentY - g_lastMouseY;
  
  g_camera.panMouse(-deltaX * g_mouseSensitivity);
  g_camera.tiltMouse(-deltaY * g_mouseSensitivity);
  
  g_lastMouseX = currentX;
  g_lastMouseY = currentY;
}

function initTNTGame() {

  g_tntBlocks = [];
  g_tntRemaining = 1;
  g_tntTotal = 1;

  g_gameStarted = true;
  g_gameWon = false;
  g_gameStartTime = g_seconds;

  let block = getBlockInFront();

  if (!block) {
    console.log("Couldn't find valid block in front of player.");
    return;
  }

  let spawnX = block.x;
  let spawnZ = block.z;

  console.log("Spawning TNT at:", spawnX, spawnZ);

  if (g_map[spawnZ][spawnX] === 0) {
    g_map[spawnZ][spawnX] = 1;
  }

  g_tntBlocks.push({
    x: spawnX,
    z: spawnZ,
    active: true
  });

  updateGameUI();
}

function getNearbyTNT() {
  let camX = g_camera.eye.elements[0];
  let camZ = g_camera.eye.elements[2];
  
  for (let i = 0; i < g_tntBlocks.length; i++) {
    let tnt = g_tntBlocks[i];
    if (!tnt.active) continue;
    
    let tntWorldX = tnt.x - 16;
    let tntWorldZ = tnt.z - 16;
    
    let distX = tntWorldX - camX;
    let distZ = tntWorldZ - camZ;
    let distSq = distX * distX + distZ * distZ;
    
    if (distSq < 4) { 
      return i;
    }
  }
  
  return -1;
}

function defuseTNT() {
  let tntIndex = getNearbyTNT();

  if (tntIndex !== -1) {
    let tnt = g_tntBlocks[tntIndex];
    tnt.active = false;
    g_tntRemaining--;

    console.log(`TNT Defused! Remaining: ${g_tntRemaining}`);

    if (g_tntRemaining === 0) {
      g_gameWon = true;
      let timeElapsed = (g_seconds - g_gameStartTime).toFixed(1);
      console.log(`🎉 VICTORY! All TNT defused in ${timeElapsed} seconds!`);
    }

    updateGameUI();
  } else {
    console.log("No TNT nearby. Get closer to a TNT block!");
  }
}

// Update game UI
function updateGameUI() {
  let gameElement = document.getElementById('gameStatus');
  if (!gameElement) return;
  
  if (!g_gameStarted) {
    gameElement.innerHTML = 'Press G to start TNT Defusal Mission!';
    gameElement.style.color = 'white';
    gameElement.style.fontSize = '24px';
  } else if (g_gameWon) {
    let timeElapsed = (g_seconds - g_gameStartTime).toFixed(1);
    gameElement.innerHTML = ` VICTORY! All TNT defused in ${timeElapsed}s! Press G to play again.`;
    gameElement.style.color = 'gold';
    gameElement.style.fontSize = '32px';
  } else {
    let timeRemaining = Math.max(0, g_gameTimeLimit - (g_seconds - g_gameStartTime));
    gameElement.innerHTML = `TNT Remaining: ${g_tntRemaining}/${g_tntTotal} | Time: ${timeRemaining.toFixed(0)}s | Press F to defuse`;
    gameElement.style.fontSize = '24px';
    
    if (timeRemaining <= 10) {
      gameElement.style.color = 'red';
    } else if (timeRemaining <= 30) {
      gameElement.style.color = 'orange';
    } else {
      gameElement.style.color = 'lime';
    }
    
    if (timeRemaining <= 0 && !g_gameWon) {
      gameElement.innerHTML = ' GAME OVER! Time\'s up! Press G to try again.';
      gameElement.style.color = 'red';
      gameElement.style.fontSize = '32px';
      g_gameStarted = false;
    }
  }
}

function getBlockInFront() {
  let forward = Vector3Helper.subtract(g_camera.at, g_camera.eye);
  forward = Vector3Helper.normalize(forward);
  
  let lookPoint = Vector3Helper.add(
    g_camera.eye,
    Vector3Helper.multiply(forward, 3.5)
  );
  
  let mapX = Math.floor(lookPoint.elements[0] + 16);
  let mapZ = Math.floor(lookPoint.elements[2] + 16);
  
  if (mapX < 0 || mapX >= 32 || mapZ < 0 || mapZ >= 32) {
    return null;
  }
  
  return { x: mapX, z: mapZ };
}

function addBlock() {
  let block = getBlockInFront();
  if (!block) {
    console.log("Can't add block - out of bounds");
    return;
  }
  
  if (g_map[block.z][block.x] < 4) {
    g_map[block.z][block.x]++;
    console.log(`Added block at (${block.x}, ${block.z}). Height: ${g_map[block.z][block.x]}`);
  } else {
    console.log("Max height reached");
  }
}

function deleteBlock() {
  let block = getBlockInFront();
  if (!block) {
    console.log("Can't delete block - out of bounds");
    return;
  }
  
  if (g_map[block.z][block.x] > 0) {
    g_map[block.z][block.x]--;
    console.log(`Deleted block at (${block.x}, ${block.z}). Height: ${g_map[block.z][block.x]}`);
  } else {
    console.log("No blocks to delete");
  }
}

function drawTriangle3DUVBatch(vertices, uv) {
  var n = vertices.length / 3; // Number of vertices

  // Create a buffer object for vertices
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the vertex buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write data into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Create a buffer object for UVs
  var uvBuffer = gl.createBuffer();
  if (!uvBuffer) {
    console.log('Failed to create the UV buffer object');
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uv, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function renderAllShapes() {
  let startTime = performance.now();

  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);

  var globalRotMatr = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMatr.elements);

  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var sky = new Cube();
  sky.color = [0.53, 0.81, 0.92, 1.0]; 
  sky.textureNum = -2;  
  sky.texColorWeight = 0.0;
  sky.matrix = new Matrix4();
  sky.matrix.scale(50, 50, 50);  
  sky.matrix.translate(-0.5, -0.5, -0.5);  
  sky.render();

  var ground = new Cube();
  ground.color = [0.4, 0.6, 0.3, 1.0];  
  ground.textureNum = 0; 
  ground.texColorWeight = 0.3;  
  ground.matrix = new Matrix4();
  ground.matrix.translate(0, -0.75, 0);  
  ground.matrix.scale(32, 0.1, 32);  
  ground.matrix.translate(-0.5, 0, -0.5);  
  ground.render();

  let camX = g_camera.eye.elements[0];
  let camZ = g_camera.eye.elements[2];
  let renderDistance = 12; 
  
  let cubesRendered = 0;

  let texture1Cubes = []; 
  let texture2Cubes = []; 
  let texture3Cubes = []; 

  for (let x = 0; x < 32; x++) {
    for (let z = 0; z < 32; z++) {
      let height = g_map[z][x];
      
      if (height === 0) continue; 
      
      let worldX = x - 16;
      let worldZ = z - 16;
      
      let distX = worldX - camX;
      let distZ = worldZ - camZ;
      let distSq = distX * distX + distZ * distZ;
      
      if (distSq > renderDistance * renderDistance) {
        continue; 
      }
      
      let leftBlocked = (x > 0 && g_map[z][x-1] >= height);
      let rightBlocked = (x < 31 && g_map[z][x+1] >= height);
      let frontBlocked = (z > 0 && g_map[z-1][x] >= height);
      let backBlocked = (z < 31 && g_map[z+1][x] >= height);
      
      let fullySurrounded = leftBlocked && rightBlocked && frontBlocked && backBlocked;
      
      for (let y = 0; y < height; y++) {
        if (fullySurrounded && y < height - 1) {
          continue; 
        }
        
        let isTNT = false;
        for (let tnt of g_tntBlocks) {
          if (tnt.active && tnt.x === x && tnt.z === z && y === height - 1) {
            isTNT = true;
            break;
          }
        }

        let textureChoice = isTNT ? 3 : (((x * 73 + z * 37 + y * 11) % 2) === 0 ? 1 : 2);

        if (!g_reusableCube) {
          g_reusableCube = new Cube();
        }

        if (isTNT) {
          g_reusableCube.textureNum = 3;
          g_reusableCube.color[0] = 1.0;
          g_reusableCube.color[1] = 0.2;
          g_reusableCube.color[2] = 0.0;
          g_reusableCube.color[3] = 1.0;
        } else if (textureChoice === 2) {
          g_reusableCube.textureNum = 2;
          g_reusableCube.color[0] = 0.8;
          g_reusableCube.color[1] = 0.9;
          g_reusableCube.color[2] = 1.0;
          g_reusableCube.color[3] = 1.0;
        } else {
          g_reusableCube.textureNum = 1;
          g_reusableCube.color[0] = 0.6;
          g_reusableCube.color[1] = 0.5;
          g_reusableCube.color[2] = 0.4;
          g_reusableCube.color[3] = 1.0;
        }

        g_reusableCube.texColorWeight = 0.9;  
        g_reusableCube.matrix.setIdentity();
        g_reusableCube.matrix.translate(worldX, y - 0.75, worldZ);
        
        let cubeData = g_reusableCube.renderFast();
        
        let verticesCopy = new Float32Array(cubeData.vertices);
        let uvCopy = new Float32Array(cubeData.uv);
        
        if (isTNT) {
          texture3Cubes.push({
            vertices: verticesCopy,
            uv: uvCopy,
            color: cubeData.color,
            textureNum: cubeData.textureNum,
            texColorWeight: cubeData.texColorWeight
          });
        } else if (textureChoice === 2) {
          texture2Cubes.push({
            vertices: verticesCopy,
            uv: uvCopy,
            color: cubeData.color,
            textureNum: cubeData.textureNum,
            texColorWeight: cubeData.texColorWeight
          });
        } else {
          texture1Cubes.push({
            vertices: verticesCopy,
            uv: uvCopy,
            color: cubeData.color,
            textureNum: cubeData.textureNum,
            texColorWeight: cubeData.texColorWeight
          });
        }
        cubesRendered++;
      }
    }
  }
  
  if (texture1Cubes.length > 0) {
    gl.uniform1i(u_whichTexture, 1);
    gl.uniform1f(u_texColorWeight, 0.9);
    gl.uniform4f(u_FragColor, 0.6, 0.5, 0.4, 1.0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
    
    let totalVertices = new Float32Array(texture1Cubes.length * 108); 
    let totalUV = new Float32Array(texture1Cubes.length * 72); 
    let offset = 0;
    let uvOffset = 0;
    
    for (let cube of texture1Cubes) {
      totalVertices.set(cube.vertices, offset);
      totalUV.set(cube.uv, uvOffset);
      offset += cube.vertices.length;
      uvOffset += cube.uv.length;
    }
    
    drawTriangle3DUVBatch(totalVertices, totalUV);
  }
  
  if (texture2Cubes.length > 0) {
    gl.uniform1i(u_whichTexture, 2);
    gl.uniform1f(u_texColorWeight, 0.9);
    gl.uniform4f(u_FragColor, 0.8, 0.9, 1.0, 1.0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
    
    let totalVertices = new Float32Array(texture2Cubes.length * 108);
    let totalUV = new Float32Array(texture2Cubes.length * 72);
    let offset = 0;
    let uvOffset = 0;
    
    for (let cube of texture2Cubes) {
      totalVertices.set(cube.vertices, offset);
      totalUV.set(cube.uv, uvOffset);
      offset += cube.vertices.length;
      uvOffset += cube.uv.length;
    }
    
    drawTriangle3DUVBatch(totalVertices, totalUV);
  }
  
  if (texture3Cubes.length > 0) {
    gl.uniform1i(u_whichTexture, 3);
    gl.uniform1f(u_texColorWeight, 0.95);
    gl.uniform4f(u_FragColor, 1.0, 0.2, 0.0, 1.0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
    
    let totalVertices = new Float32Array(texture3Cubes.length * 108);
    let totalUV = new Float32Array(texture3Cubes.length * 72);
    let offset = 0;
    let uvOffset = 0;
    
    for (let cube of texture3Cubes) {
      totalVertices.set(cube.vertices, offset);
      totalUV.set(cube.uv, uvOffset);
      offset += cube.vertices.length;
      uvOffset += cube.uv.length;
    }
    
    drawTriangle3DUVBatch(totalVertices, totalUV);
  }
  
  // Update game UI
  updateGameUI();
  
  // Performance tracking
  let endTime = performance.now();
  let renderTime = endTime - startTime;
  g_frameCount++;
  
  if (endTime - g_lastFpsTime > 1000) {
    g_fps = g_frameCount;
    g_frameCount = 0;
    g_lastFpsTime = endTime;
    
    let fpsElement = document.getElementById('fps');
    if (fpsElement) {
      fpsElement.innerHTML = `FPS: ${g_fps} | Render: ${renderTime.toFixed(1)}ms | Cubes: ${cubesRendered}`;
      if (g_fps >= 30) {
        fpsElement.style.color = 'green';
      } else if (g_fps >= 15) {
        fpsElement.style.color = 'orange';
      } else {
        fpsElement.style.color = 'red';
      }
    }
  }
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}