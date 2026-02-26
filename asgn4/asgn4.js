// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;
varying vec2 v_UV;
attribute vec3 a_Normal;
varying vec3 v_Normal;
varying vec4 v_VertPos;
uniform mat4 u_ModelMatrix;
uniform mat4 u_NormalMatrix;
uniform mat4 u_GlobalRotateMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
  // Transform normal using the proper normal matrix (transpose of inverse of model matrix)
  v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 1.0)));
  v_VertPos = u_ModelMatrix * a_Position;
}`

// Fragment shader program
var FSHADER_SOURCE = `precision mediump float;
varying vec2 v_UV;
varying vec3 v_Normal;
varying vec4 v_VertPos;
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform float u_texColorWeight;
uniform int u_whichTexture;
uniform float u_FlashIntensity;
uniform vec3 u_cameraPos;

// Point light
uniform vec3  u_lightPos;
uniform vec3  u_lightColor;
uniform bool  u_lightOn;

// Spotlight
uniform bool  u_spotOn;
uniform vec3  u_spotPos;
uniform vec3  u_spotDir;          
uniform float u_spotCosCutoff;   
uniform float u_spotExponent;     
uniform vec3  u_spotColor;

void main() {
  if (u_whichTexture == -3) {
    gl_FragColor = vec4((v_Normal+1.0)/2.0, 1.0);
  } else if (u_whichTexture == -2) {
    gl_FragColor = u_FragColor;
  } else if (u_whichTexture == -1) {
    gl_FragColor = vec4(v_UV, 1.0, 1.0);
  } else if (u_whichTexture == 0) {
    gl_FragColor = mix(u_FragColor, texture2D(u_Sampler0, v_UV), u_texColorWeight);
  } else if (u_whichTexture == 1) {
    gl_FragColor = mix(u_FragColor, texture2D(u_Sampler1, v_UV), u_texColorWeight);
  } else if (u_whichTexture == 2) {
    gl_FragColor = mix(u_FragColor, texture2D(u_Sampler2, v_UV), u_texColorWeight);
  } else if (u_whichTexture == 3) {
    gl_FragColor = mix(u_FragColor, texture2D(u_Sampler3, v_UV), u_texColorWeight);
  } else {
    gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0);
  }

  if (u_whichTexture == -3 || u_whichTexture == -1) { return; }

  vec3 baseColor = vec3(gl_FragColor);
  vec3 N = normalize(v_Normal);
  vec3 E = normalize(u_cameraPos - vec3(v_VertPos));

  if (!u_lightOn && !u_spotOn) {
    return;
  }

  vec3 ambient = baseColor * 0.3;
  vec3 lighting = ambient;

  if (u_lightOn) {
    vec3 Lv    = u_lightPos - vec3(v_VertPos);
    vec3 L1    = normalize(Lv);
    float nDotL1 = max(dot(N, L1), 0.0);
    vec3 R1    = reflect(-L1, N);
    float spec1 = pow(max(dot(E, R1), 0.0), 32.0);

    vec3 diff1 = baseColor * u_lightColor * nDotL1 * 0.7;
    vec3 spec1v = u_lightColor * spec1 * 0.5;
    lighting += diff1 + spec1v;
  }

  if (u_spotOn) {
    vec3  Ls         = normalize(u_spotPos - vec3(v_VertPos));
    vec3  D          = normalize(u_spotDir);       
    float spotCosine = dot(-Ls, D);            

    float spotFactor = 0.0;
    if (spotCosine >= u_spotCosCutoff) {
      // Inside the cone: apply exponent falloff (section 7.2.6)
      spotFactor = pow(spotCosine, u_spotExponent);
    }

    if (spotFactor > 0.0) {
      float nDotLs = max(dot(N, Ls), 0.0);
      vec3  Rs     = reflect(-Ls, N);
      float specs  = pow(max(dot(E, Rs), 0.0), 32.0);

      vec3 diffS = baseColor * u_spotColor * nDotLs * 0.7 * spotFactor;
      vec3 specS = u_spotColor * specs * 0.5 * spotFactor;
      lighting  += diffS + specS;
    }
  }

  gl_FragColor = vec4(lighting, 1.0);

  // Apply flash effect
  if (u_FlashIntensity > 0.0) {
    gl_FragColor = mix(gl_FragColor, vec4(1.0, 1.0, 1.0, 1.0), u_FlashIntensity);
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
let u_NormalMatrix;
let u_ProjectionMatrix;
let u_ViewMatrix;
let u_GlobalRotateMatrix;
let a_Normal;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_Sampler3;
let u_whichTexture;
let g_globalAngle = 0;
let u_texColorWeight;
let u_FlashIntensity;
let u_lightPos;
let u_cameraPos;
let u_lightColor;
let u_lightOn;
let g_dragonModel = null;

// Spotlight uniform locations
let u_spotOn;
let u_spotPos;
let u_spotDir;
let u_spotCosCutoff;
let u_spotExponent;
let u_spotColor;

// performance tracking
let g_frameCount = 0;
let g_lastFpsTime = 0;
let g_fps = 0;
let g_lastRenderTime = 0;

// Reusable cube object 
let g_reusableCube = null;

// Camera
var g_camera;

// Mouse control
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_mouseSensitivity = 0.2;

// TNT GAME variables
let g_tntBlocks = []; 
let g_tntTotal = 5;
let g_tntRemaining = 5;
let g_gameStarted = false;
let g_gameWon = false;
let g_gameStartTime = 0;
let g_gameTimeLimit = 180;
let g_victoryTime = 0;

// Fireworks variables
let g_fireworks = [];
let g_fireworkTime = 0;

// Flash effect variables
let g_flashIntensity = 0.0;
let g_flashDecay = 0.05;

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

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
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
    console.log('Warning: Failed to create sampler2 object');
  }
  
  u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
  if(!u_Sampler3) {
    console.log('Warning: Failed to create sampler3 object');
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

  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
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
    console.log('Warning: u_texColorWeight not found');
  }

  u_FlashIntensity = gl.getUniformLocation(gl.program, 'u_FlashIntensity');
  if (!u_FlashIntensity) {
    console.log('Failed to get the storage location of u_FlashIntensity');
    return;
  }

  u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
  if (!u_lightPos) {
    console.log('Failed to get the storage location of u_lightPos');
    return;
  }

  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if (!u_cameraPos) {
    console.log('Failed to get the storage location of u_cameraPos');
    return;
  }

  u_lightColor = gl.getUniformLocation(gl.program, 'u_lightColor');
  if (!u_lightColor) {
    console.log('Failed to get the storage location of u_lightColor');
    return;
  }

  u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
  if (u_lightOn === null) {
    console.log('Warning: Failed to get the storage location of u_lightOn');
  }

  // Spotlight uniforms
  u_spotOn         = gl.getUniformLocation(gl.program, 'u_spotOn');
  u_spotPos        = gl.getUniformLocation(gl.program, 'u_spotPos');
  u_spotDir        = gl.getUniformLocation(gl.program, 'u_spotDir');
  u_spotCosCutoff  = gl.getUniformLocation(gl.program, 'u_spotCosCutoff');
  u_spotExponent   = gl.getUniformLocation(gl.program, 'u_spotExponent');
  u_spotColor      = gl.getUniformLocation(gl.program, 'u_spotColor');
}

//Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_selectorColor = [1.0,1.0,1.0,1.0];
let g_selectedSize = 5;
var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;
let g_normalViz = false; 
let g_lightPos = [0, 15, 0]; 
let g_lightAnimation = false;
let g_lightColor = [1.0, 1.0, 1.0]; 
let g_lightOn = true; 

// Spotlight state
let g_spotOn = true;
let g_spotPos = [0, 8, 0];       
let g_spotDir = [0, -1, 0];        
let g_spotCutoff = 25;              
let g_spotExponent = 15.0;       
let g_spotColor = [0.2, 0.6, 1.0]; 

function addActionsForHTMLUI() {
  document.getElementById('angleSlide').addEventListener('input',
    function() {
      g_globalAngle = (this.value * 0.5);
      renderAllShapes();
    }
  );

  // Normal visualization - separate ON/OFF buttons
  document.getElementById('normalOn').addEventListener('click', function() {
    g_normalViz = true;
    renderAllShapes();
  });
  document.getElementById('normalOff').addEventListener('click', function() {
    g_normalViz = false;
    renderAllShapes();
  });

  // Light animation toggle buttons
  document.getElementById('lightAnimOn').addEventListener('click', function() {
    g_lightAnimation = true;
  });
  document.getElementById('lightAnimOff').addEventListener('click', function() {
    g_lightAnimation = false;
  });

  // Lighting on/off toggle buttons
  document.getElementById('lightOn').addEventListener('click', function() {
    g_lightOn = true;
    renderAllShapes();
  });
  document.getElementById('lightOff').addEventListener('click', function() {
    g_lightOn = false;
    renderAllShapes();
  });

  // Spotlight on/off toggle buttons
  document.getElementById('spotOn').addEventListener('click', function() {
    g_spotOn = true;
    renderAllShapes();
  });
  document.getElementById('spotOff').addEventListener('click', function() {
    g_spotOn = false;
    renderAllShapes();
  });

  // Spotlight position sliders
  document.getElementById('spotSlideX').addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) { g_spotPos[0] = this.value / 10; renderAllShapes(); }
  });
  document.getElementById('spotSlideY').addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) { g_spotPos[1] = this.value / 10; renderAllShapes(); }
  });
  document.getElementById('spotSlideZ').addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) { g_spotPos[2] = this.value / 10; renderAllShapes(); }
  });

  // Spotlight direction sliders (X and Z axis tilt)
  document.getElementById('spotDirX').addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) { g_spotDir[0] = this.value / 100; renderAllShapes(); }
  });
  document.getElementById('spotDirZ').addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) { g_spotDir[2] = this.value / 100; renderAllShapes(); }
  });

  // Spotlight cutoff angle slider
  document.getElementById('spotCutoff').addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) { g_spotCutoff = parseFloat(this.value); renderAllShapes(); }
  });

  // Spotlight exponent slider
  document.getElementById('spotExp').addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) { g_spotExponent = parseFloat(this.value); renderAllShapes(); }
  });

  // Light position sliders
  document.getElementById('lightSlideX').addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) { g_lightPos[0] = this.value / 10; renderAllShapes(); }
  });
  document.getElementById('lightSlideY').addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) { g_lightPos[1] = this.value / 10; renderAllShapes(); }
  });
  document.getElementById('lightSlideZ').addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) { g_lightPos[2] = this.value / 10; renderAllShapes(); }
  });

  // Light color slider (hue slider 0-360)
  document.getElementById('lightColorSlide').addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) {
      // Convert hue to RGB
      let h = this.value / 360.0;
      let r, g, b;
      let i = Math.floor(h * 6);
      let f = h * 6 - i;
      let q = 1 - f;
      switch(i % 6) {
        case 0: r=1; g=f; b=0; break;
        case 1: r=q; g=1; b=0; break;
        case 2: r=0; g=1; b=f; break;
        case 3: r=0; g=q; b=1; break;
        case 4: r=f; g=0; b=1; break;
        case 5: r=1; g=0; b=q; break;
      }
      g_lightColor = [r, g, b];
      renderAllShapes();
    }
  });
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

  // Load texture 3 - tnt.jpg
  var image3 = new Image();
  if(!image3) {
    console.log('Failed to create the image3 object');
    return false;
  }
  image3.onload = function() { sendImageToTexture(image3, 3); };
  image3.src = 'tnt.jpg';
  
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

  addActionsForHTMLUI();

  document.onkeydown = keydown;
  
  // Add mouse controls
  canvas.onmousedown = handleMouseDown;
  canvas.onmouseup = handleMouseUp;
  canvas.onmousemove = handleMouseMove;

  initTextures(gl,0);
  
  // Create reusable cube
  g_reusableCube = new Cube();

  g_dragonModel = new Model();
  g_dragonModel.loadOBJ('dragon.obj');

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  
  requestAnimationFrame(tick);
}

//called by browser repeatedly whenever its time
function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  
  // Update flash effect decay
  if (g_flashIntensity > 0) {
    g_flashIntensity = Math.max(0, g_flashIntensity - g_flashDecay);
  }

  // Animate light position 
  if (g_lightAnimation) {
    g_lightPos[0] = 10 * Math.cos(g_seconds);
    g_lightPos[2] = 10 * Math.sin(g_seconds);
  }
  
  renderAllShapes();
  
  requestAnimationFrame(tick);
}

var g_shapesList = [];

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

// Helper function to place a random TNT block
function placeRandomTNT() {
  let attempts = 0;
  let maxAttempts = 500;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    let x = Math.floor(Math.random() * 28) + 2;
    let z = Math.floor(Math.random() * 28) + 2; 
    
    if (g_map[z][x] === 0) {
      let tooClose = false;
      for (let tnt of g_tntBlocks) {
        let distX = Math.abs(tnt.x - x);
        let distZ = Math.abs(tnt.z - z);
        if (distX < 3 && distZ < 3) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        g_map[z][x] = 1;
        g_tntBlocks.push({
          x: x,
          z: z,
          active: true
        });
        console.log(`Placed random TNT at (${x}, ${z})`);
        return true;
      }
    }
  }
  
  console.log("Could not find valid location for random TNT after", maxAttempts, "attempts");
  return false;
}

function initTNTGame() {
  g_fireworks = [];
  
  for (let tnt of g_tntBlocks) {
    if (tnt.active) {
      g_map[tnt.z][tnt.x] = 0;
    }
  }
  
  g_tntBlocks = [];
  g_tntRemaining = 5;
  g_tntTotal = 5;
  g_victoryTime = 0;

  g_gameStarted = true;
  g_gameWon = false;
  g_gameStartTime = g_seconds;

  let tutorialBlock = getBlockInFront();
  
  let tutorialPlaced = false;
  if (tutorialBlock) {
    let spawnX = tutorialBlock.x;
    let spawnZ = tutorialBlock.z;

    console.log("Spawning tutorial TNT at map coordinates:", spawnX, spawnZ);

    if (g_map[spawnZ][spawnX] === 0) {
      g_map[spawnZ][spawnX] = 1;
    }

    g_tntBlocks.push({
      x: spawnX,
      z: spawnZ,
      active: true
    });
    
    tutorialPlaced = true;
    console.log("Tutorial TNT placed");
  } else {
    console.log("Couldn't find valid block in front of player for tutorial TNT");
  }

  let remainingToPlace = tutorialPlaced ? 4 : 5;
  let placed = 0;
  
  while (placed < remainingToPlace) {
    if (placeRandomTNT()) {
      placed++;
    }
  }

  console.log(`TNT Game Started! Total TNT: ${g_tntBlocks.length}`);
  updateGameUI();
}

function getNearbyTNT() {
  let camX = g_camera.eye.elements[0];
  let camY = g_camera.eye.elements[1];
  let camZ = g_camera.eye.elements[2];
  
  for (let i = 0; i < g_tntBlocks.length; i++) {
    let tnt = g_tntBlocks[i];
    if (!tnt.active) continue;
    
    let tntWorldX = tnt.x - 16;
    let tntWorldY = 0;
    let tntWorldZ = tnt.z - 16;
    
    let distX = tntWorldX - camX;
    let distY = tntWorldY - camY;
    let distZ = tntWorldZ - camZ;
    let distSq = distX * distX + distY * distY + distZ * distZ;
    
    if (distSq < 16) { 
      console.log(`Found TNT at index ${i}, distance: ${Math.sqrt(distSq).toFixed(2)}`);
      return i;
    }
  }
  
  return -1;
}

function defuseTNT() {
  let tntIndex = getNearbyTNT();

  if (tntIndex !== -1) {
    let tnt = g_tntBlocks[tntIndex];
    
    if (!tnt.active) {
      console.log("This TNT has already been defused!");
      return;
    }
    
    tnt.active = false;
    g_tntRemaining--;
    
    g_map[tnt.z][tnt.x] = 0;

    console.log(`TNT Defused! Remaining: ${g_tntRemaining}`);

    if (g_tntRemaining === 0) {
      g_gameWon = true;
      g_victoryTime = g_seconds - g_gameStartTime;
      let timeElapsed = g_victoryTime.toFixed(1);
      console.log(`VICTORY! All TNT defused in ${timeElapsed} seconds!`);
      
      createVictoryFireworks();
    }

    updateGameUI();
  } else {
    console.log("No TNT nearby. Get closer to a TNT block!");
  }
}

function createVictoryFireworks() {
  g_fireworks = [];
  for (let i = 0; i < 10; i++) {
    g_fireworks.push({
      x: (Math.random() - 0.5) * 30,
      y: 2 + Math.random() * 10,
      z: (Math.random() - 0.5) * 30,
      particles: [],
      exploded: false,
      explodeTime: g_seconds + 0.5 + Math.random() * 1.5,
      color: [Math.random(), Math.random(), Math.random(), 1.0]
    });
  }
}

function updateFireworks() {
  if (!g_gameWon) return;
  
  if (g_fireworks.length < 15 && Math.random() < 0.02) {
    g_fireworks.push({
      x: (Math.random() - 0.5) * 30,
      y: 2 + Math.random() * 12,
      z: (Math.random() - 0.5) * 30,
      particles: [],
      exploded: false,
      explodeTime: g_seconds + 0.3 + Math.random() * 1,
      color: [Math.random(), Math.random(), Math.random(), 1.0]
    });
  }
  
  for (let i = g_fireworks.length - 1; i >= 0; i--) {
    let fw = g_fireworks[i];
    
    if (!fw.exploded && g_seconds >= fw.explodeTime) {
      fw.exploded = true;
      for (let j = 0; j < 20; j++) {
        let angle = (j / 20) * Math.PI * 2;
        let speed = 0.5 + Math.random() * 0.5;
        fw.particles.push({
          x: fw.x,
          y: fw.y,
          z: fw.z,
          vx: Math.cos(angle) * speed,
          vy: Math.random() * speed,
          vz: Math.sin(angle) * speed,
          life: 1.0,
          color: fw.color
        });
      }
    }
    
    for (let j = fw.particles.length - 1; j >= 0; j--) {
      let p = fw.particles[j];
      p.x += p.vx * 0.1;
      p.y += p.vy * 0.1;
      p.z += p.vz * 0.1;
      p.life -= 0.01;
      
      if (p.life <= 0) {
        fw.particles.splice(j, 1);
      }
    }
    
    if (fw.exploded && fw.particles.length === 0) {
      g_fireworks.splice(i, 1);
    }
  }
}

function renderFireworks() {
  if (!g_gameWon) return;
  
  for (let fw of g_fireworks) {
    if (!fw.exploded) {
      let rocket = new Cube();
      rocket.color = [1.0, 1.0, 1.0, 1.0];
      rocket.textureNum = -2;
      rocket.matrix = new Matrix4()
        .translate(fw.x, fw.y, fw.z)
        .scale(0.2, 0.2, 0.2);
      rocket.render();
    }
    
    for (let p of fw.particles) {
      let particle = new Cube();
      particle.color = [p.color[0], p.color[1], p.color[2], p.life];
      particle.textureNum = -2;
      particle.matrix = new Matrix4()
        .translate(p.x, p.y, p.z)
        .scale(0.1, 0.1, 0.1);
      particle.render();
    }
  }
}

function updateGameUI() {
  let gameElement = document.getElementById('gameStatus');
  let gameStateDisplay = document.getElementById('gameStateDisplay');
  let tntCountElement = document.getElementById('tntCount');
  let timeRemainingElement = document.getElementById('timeRemaining');
  let camPosElement = document.getElementById('cameraPos');
  
  if (!gameElement) return;
  
  if (camPosElement && g_camera) {
    let x = g_camera.eye.elements[0].toFixed(1);
    let y = g_camera.eye.elements[1].toFixed(1);
    let z = g_camera.eye.elements[2].toFixed(1);
    camPosElement.innerHTML = `(${x}, ${y}, ${z})`;
  }
  
  if (!g_gameStarted) {
    gameElement.innerHTML = 'Press G to start TNT Defusal Mission';
    gameElement.className = '';
    gameElement.style.color = 'white';
    gameElement.style.fontSize = '24px';
    
    if (gameStateDisplay) gameStateDisplay.innerHTML = 'Not Started';
    if (tntCountElement) tntCountElement.innerHTML = '0/0';
    if (timeRemainingElement) timeRemainingElement.innerHTML = '0s';
    
  } else if (g_gameWon) {
    let timeElapsed = g_victoryTime.toFixed(1);
    
    gameElement.innerHTML = `VICTORY! All TNT defused in ${timeElapsed}s. Press G to play again.`;
    gameElement.className = 'victory';
    gameElement.style.color = 'gold';
    gameElement.style.fontSize = '32px';
    
    if (gameStateDisplay) {
      gameStateDisplay.innerHTML = 'VICTORY';
      gameStateDisplay.style.color = 'gold';
    }
    if (tntCountElement) {
      tntCountElement.innerHTML = '0/0';
      tntCountElement.style.color = 'gold';
    }
    if (timeRemainingElement) {
      timeRemainingElement.innerHTML = '0s';
      timeRemainingElement.style.color = 'gold';
    }
    
  } else {
    let timeRemaining = Math.max(0, g_gameTimeLimit - (g_seconds - g_gameStartTime));
    let minutes = Math.floor(timeRemaining / 60);
    let seconds = Math.floor(timeRemaining % 60);
    let timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    gameElement.innerHTML = `TNT Remaining: ${g_tntRemaining}/${g_tntTotal} | Time: ${timeString} | Press F to defuse`;
    gameElement.className = '';
    gameElement.style.fontSize = '24px';
    
    if (gameStateDisplay) {
      gameStateDisplay.innerHTML = 'In Progress';
      gameStateDisplay.style.color = '#ffaa00';
    }
    if (tntCountElement) {
      tntCountElement.innerHTML = `${g_tntRemaining}/${g_tntTotal}`;
      tntCountElement.style.color = '#ffaa00';
    }
    if (timeRemainingElement) {
      timeRemainingElement.innerHTML = timeString;
    }
    
    if (timeRemaining <= 10) {
      gameElement.style.color = 'red';
      gameElement.style.animation = 'pulse 1s infinite';
      if (timeRemainingElement) {
        timeRemainingElement.style.color = 'red';
        timeRemainingElement.style.fontWeight = 'bold';
      }
    } else if (timeRemaining <= 30) {
      gameElement.style.color = 'orange';
      gameElement.style.animation = 'none';
      if (timeRemainingElement) {
        timeRemainingElement.style.color = 'orange';
        timeRemainingElement.style.fontWeight = 'normal';
      }
    } else {
      gameElement.style.color = 'lime';
      gameElement.style.animation = 'none';
      if (timeRemainingElement) {
        timeRemainingElement.style.color = 'lime';
        timeRemainingElement.style.fontWeight = 'normal';
      }
    }
    
    if (timeRemaining <= 0 && !g_gameWon) {
      gameElement.innerHTML = 'GAME OVER! Time expired. Press G to try again.';
      gameElement.className = 'gameOver';
      gameElement.style.color = 'red';
      gameElement.style.fontSize = '32px';
      
      g_flashIntensity = 1.0;
      
      if (gameStateDisplay) {
        gameStateDisplay.innerHTML = 'GAME OVER';
        gameStateDisplay.style.color = 'red';
      }
      if (tntCountElement) {
        tntCountElement.innerHTML = `${g_tntRemaining}/${g_tntTotal}`;
        tntCountElement.style.color = 'red';
      }
      if (timeRemainingElement) {
        timeRemainingElement.innerHTML = '0:00';
        timeRemainingElement.style.color = 'red';
      }
      
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
  var n = vertices.length / 3; 

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

function renderTNTParticles() {
  if (!g_gameStarted || g_gameWon) return;
  
  for (let tnt of g_tntBlocks) {
    if (!tnt.active) continue;
    
    let worldX = tnt.x - 16;
    let worldZ = tnt.z - 16;
    
    let camX = g_camera.eye.elements[0];
    let camZ = g_camera.eye.elements[2];
    let distSq = (worldX - camX) * (worldX - camX) + (worldZ - camZ) * (worldZ - camZ);
    if (distSq > 200) continue; 
    
    for (let i = 0; i < 8; i++) {
      let angle = g_seconds * 3 + i * (Math.PI * 2 / 8);
      let heightOffset = Math.sin(g_seconds * 2 + i) * 0.4;
      let radius = 0.9;
      
      let offsetX = Math.cos(angle) * radius;
      let offsetZ = Math.sin(angle) * radius;
      
      let particle = new Cube();
      
      if (i % 3 === 0) {
        particle.color = [1.0, 0.1, 0.0, 0.9]; 
      } else if (i % 3 === 1) {
        particle.color = [1.0, 0.3, 0.0, 0.9]; 
      } else {
        particle.color = [0.9, 0.0, 0.0, 0.9];
      }
      
      particle.textureNum = -2; 
      particle.texColorWeight = 0.0;
      
      particle.matrix = new Matrix4()
        .translate(worldX + 0.5, 0.5 + heightOffset, worldZ + 0.5)
        .translate(offsetX, 0, offsetZ)
        .scale(0.18, 0.18, 0.18);
      
      particle.render();
      
      if (i % 2 === 0) {
        let particle2 = new Cube();
        particle2.color = [1.0, 0.2, 0.0, 0.8];
        particle2.textureNum = -2;
        
        particle2.matrix = new Matrix4()
          .translate(worldX + 0.5, 1.2 - heightOffset, worldZ + 0.5)
          .translate(offsetX * 0.6, 0, offsetZ * 0.6)
          .scale(0.12, 0.12, 0.12);
        
        particle2.render();
      }
      
      if (i % 4 === 0) {
        let particle3 = new Cube();
        particle3.color = [1.0, 0.0, 0.0, 1.0]; 
        particle3.textureNum = -2;
        
        particle3.matrix = new Matrix4()
          .translate(worldX + 0.5, 0.8, worldZ + 0.5)
          .translate(offsetX * 1.2, Math.sin(g_seconds * 5 + i) * 0.3, offsetZ * 1.2)
          .scale(0.08, 0.08, 0.08);
        
        particle3.render();
      }
    }
  }
}

function renderAllShapes() {
  let startTime = performance.now();

  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);

  var globalRotMatr = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMatr.elements);

  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  
  gl.uniform1f(u_FlashIntensity, g_flashIntensity);

  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform1i(u_lightOn, g_lightOn ? 1 : 0);
  gl.uniform3f(u_cameraPos,
    g_camera.eye.elements[0],
    g_camera.eye.elements[1],
    g_camera.eye.elements[2]);

  gl.uniform1i(u_spotOn, g_spotOn ? 1 : 0);
  gl.uniform3f(u_spotPos, g_spotPos[0], g_spotPos[1], g_spotPos[2]);
  let sd = g_spotDir;
  let sdLen = Math.sqrt(sd[0]*sd[0] + sd[1]*sd[1] + sd[2]*sd[2]);
  gl.uniform3f(u_spotDir, sd[0]/sdLen, sd[1]/sdLen, sd[2]/sdLen);
  gl.uniform1f(u_spotCosCutoff, Math.cos(g_spotCutoff * Math.PI / 180.0));
  gl.uniform1f(u_spotExponent, g_spotExponent);
  gl.uniform3f(u_spotColor, g_spotColor[0], g_spotColor[1], g_spotColor[2]);

  if (g_normalViz) {
    gl.uniform1i(u_whichTexture, -3);
  }

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var light = new Cube();
  light.color = [2, 2, 0, 1];
  light.textureNum = -3;
  light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  light.matrix.scale(-0.5, -0.5, -0.5);
  light.matrix.translate(-0.5, -0.5, -0.5);
  light.render();

  var spotMarker = new Cube();
  spotMarker.color = [g_spotColor[0], g_spotColor[1], g_spotColor[2], 1];
  spotMarker.textureNum = -3;
  spotMarker.matrix.translate(g_spotPos[0], g_spotPos[1], g_spotPos[2]);
  spotMarker.matrix.scale(-0.4, -0.4, -0.4);
  spotMarker.matrix.translate(-0.5, -0.5, -0.5);
  spotMarker.render();

  var sky = new Cube();
  sky.color = [0.53, 0.81, 0.92, 1.0]; 
  sky.textureNum = -2;  
  sky.texColorWeight = 0.0;
  sky.matrix = new Matrix4();
  sky.matrix.scale(-50, -50, -50);  
  sky.matrix.translate(-0.5, -0.5, -0.5);  
  sky.render();

  var s = new Sphere();
  s.color = [1.0, 0.5, 0.0, 1.0];
  s.matrix.translate(0, 5, 0);  
  s.render();

  if (g_dragonModel) {
    g_dragonModel.color = [0.6, 0.2, 0.8, 1.0]; 
    g_dragonModel.matrix = new Matrix4();
    g_dragonModel.matrix.translate(5, 7, 0);  
    g_dragonModel.matrix.scale(1, 1, 1); 
    g_dragonModel.render();
  }

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
        let isActiveTNT = false;
        for (let tnt of g_tntBlocks) {
          if (tnt.x === x && tnt.z === z && y === height - 1) {
            isTNT = true;
            isActiveTNT = tnt.active;
            break;
          }
        }

        let textureChoice;
        if (isTNT && isActiveTNT) {
          textureChoice = 3;
        } else {
          textureChoice = (((x * 73 + z * 37 + y * 11) % 2) === 0 ? 1 : 2);
        }

        if (!g_reusableCube) {
          g_reusableCube = new Cube();
        }

        if (isTNT && isActiveTNT) {
          let pulseFactor = 0.9 + Math.sin(g_seconds * 5) * 0.15;
          
          let redPulse = 1.0;
          let greenPulse = 0.1 + Math.sin(g_seconds * 8) * 0.15;
          
          g_reusableCube.textureNum = 3;
          g_reusableCube.color[0] = redPulse;
          g_reusableCube.color[1] = greenPulse;
          g_reusableCube.color[2] = 0.0;
          g_reusableCube.color[3] = 1.0;
          
          g_reusableCube.matrix.setIdentity();
          g_reusableCube.matrix.translate(worldX, y - 0.75, worldZ);
          g_reusableCube.matrix.translate(0.5, 0.5, 0.5);
          g_reusableCube.matrix.scale(pulseFactor, pulseFactor, pulseFactor);
          g_reusableCube.matrix.translate(-0.5, -0.5, -0.5);
        } else if (textureChoice === 2) {
          g_reusableCube.textureNum = 2;
          g_reusableCube.color[0] = 0.8;
          g_reusableCube.color[1] = 0.9;
          g_reusableCube.color[2] = 1.0;
          g_reusableCube.color[3] = 1.0;
          g_reusableCube.matrix.setIdentity();
          g_reusableCube.matrix.translate(worldX, y - 0.75, worldZ);
        } else {
          g_reusableCube.textureNum = 1;
          g_reusableCube.color[0] = 0.6;
          g_reusableCube.color[1] = 0.5;
          g_reusableCube.color[2] = 0.4;
          g_reusableCube.color[3] = 1.0;
          g_reusableCube.matrix.setIdentity();
          g_reusableCube.matrix.translate(worldX, y - 0.75, worldZ);
        }

        g_reusableCube.texColorWeight = 0.9;  
        
        let cubeData = g_reusableCube.renderFast();
        
        let verticesCopy = new Float32Array(cubeData.vertices);
        let uvCopy = new Float32Array(cubeData.uv);
        let normalsCopy = new Float32Array(cubeData.normals);
        
        if (isTNT && isActiveTNT) {
          texture3Cubes.push({
            vertices: verticesCopy,
            uv: uvCopy,
            normals: normalsCopy,
            color: cubeData.color,
            textureNum: cubeData.textureNum,
            texColorWeight: cubeData.texColorWeight
          });
        } else if (textureChoice === 2) {
          texture2Cubes.push({
            vertices: verticesCopy,
            uv: uvCopy,
            normals: normalsCopy,
            color: cubeData.color,
            textureNum: cubeData.textureNum,
            texColorWeight: cubeData.texColorWeight
          });
        } else {
          texture1Cubes.push({
            vertices: verticesCopy,
            uv: uvCopy,
            normals: normalsCopy,
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
    gl.uniform1i(u_whichTexture, (g_normalViz ? -3 : 1));
    gl.uniform1f(u_texColorWeight, 0.9);
    gl.uniform4f(u_FragColor, 0.6, 0.5, 0.4, 1.0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, new Matrix4().elements);
    
    let totalVertices = new Float32Array(texture1Cubes.length * 108); 
    let totalUV = new Float32Array(texture1Cubes.length * 72); 
    let totalNormals = new Float32Array(texture1Cubes.length * 108);
    let offset = 0;
    let uvOffset = 0;
    let nOffset = 0;
    
    for (let cube of texture1Cubes) {
      totalVertices.set(cube.vertices, offset);
      totalUV.set(cube.uv, uvOffset);
      totalNormals.set(cube.normals, nOffset);
      offset += cube.vertices.length;
      uvOffset += cube.uv.length;
      nOffset += cube.normals.length;
    }
    
    drawTriangle3DUVNormal(totalVertices, totalUV, totalNormals);
  }
  
  if (texture2Cubes.length > 0) {
    gl.uniform1i(u_whichTexture, (g_normalViz ? -3 : 2));
    gl.uniform1f(u_texColorWeight, 0.9);
    gl.uniform4f(u_FragColor, 0.8, 0.9, 1.0, 1.0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, new Matrix4().elements);
    
    let totalVertices = new Float32Array(texture2Cubes.length * 108);
    let totalUV = new Float32Array(texture2Cubes.length * 72);
    let totalNormals = new Float32Array(texture2Cubes.length * 108);
    let offset = 0;
    let uvOffset = 0;
    let nOffset = 0;
    
    for (let cube of texture2Cubes) {
      totalVertices.set(cube.vertices, offset);
      totalUV.set(cube.uv, uvOffset);
      totalNormals.set(cube.normals, nOffset);
      offset += cube.vertices.length;
      uvOffset += cube.uv.length;
      nOffset += cube.normals.length;
    }
    
    drawTriangle3DUVNormal(totalVertices, totalUV, totalNormals);
  }
  
  if (texture3Cubes.length > 0) {
    gl.uniform1i(u_whichTexture, (g_normalViz ? -3 : 3));
    gl.uniform1f(u_texColorWeight, 0.95);
    gl.uniform4f(u_FragColor, 1.0, 0.2, 0.0, 1.0);
    gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, new Matrix4().elements);
    
    let totalVertices = new Float32Array(texture3Cubes.length * 108);
    let totalUV = new Float32Array(texture3Cubes.length * 72);
    let totalNormals = new Float32Array(texture3Cubes.length * 108);
    let offset = 0;
    let uvOffset = 0;
    let nOffset = 0;
    
    for (let cube of texture3Cubes) {
      totalVertices.set(cube.vertices, offset);
      totalUV.set(cube.uv, uvOffset);
      totalNormals.set(cube.normals, nOffset);
      offset += cube.vertices.length;
      uvOffset += cube.uv.length;
      nOffset += cube.normals.length;
    }
    
    drawTriangle3DUVNormal(totalVertices, totalUV, totalNormals);
  }
  
  if (g_gameWon) {
    updateFireworks();
    renderFireworks();
  }
  
  renderTNTParticles();
  
  updateGameUI();
  
  let blocksElement = document.getElementById('blocksRendered');
  if (blocksElement) {
    blocksElement.innerHTML = cubesRendered;
  }
  
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
      fpsElement.innerHTML = `FPS: ${g_fps} | Render: ${renderTime.toFixed(1)}ms`;
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