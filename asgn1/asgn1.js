// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    //gl_PointSize = 30.0;
    gl_PointSize = u_Size;
    }`
  
// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
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
let g_eraserSize = 10;

let sharkDrawn = false;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
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
}

//Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;
const ERASER = 3;
//Globals related to UI elements
let g_selectedColor=[1.0,1.0,1.0,1.0];
let g_selectedSize=5;
let g_selectedType=POINT;
let g_selectedSegments=10;

//extra globals for bonus
let g_rainbowMode = false;
let g_rainbowSpeed = 0.01;

let g_undoStack = [];
let g_redoStack = [];
let g_maxUndoSteps = 20; 
let g_actionCount = 0;
let g_lastClickWasDrag = false;

function addActionsForHTMLUI() {
  //Button Events (Shape Type)
  document.getElementById('green').onclick = function() { 
  g_selectedColor = [0.0, 1.0, 0.0, 1.0];
  document.getElementById('greenSlide').value = 100;
  document.getElementById('redSlide').value = 0;
  document.getElementById('blueSlide').value = 0;
  updateColorPickerButton('#00ff00');
  };
  document.getElementById('red').onclick = function() { 
  g_selectedColor = [1.0, 0.0, 0.0, 1.0];
  document.getElementById('greenSlide').value = 0;
  document.getElementById('redSlide').value = 100;
  document.getElementById('blueSlide').value = 0;
  updateColorPickerButton('#ff0000');
  };
  document.getElementById('blue').onclick = function() { 
    g_selectedColor = [0.0, 0.0, 1.0, 1.0];
    document.getElementById('greenSlide').value = 0;
    document.getElementById('redSlide').value = 0;
    document.getElementById('blueSlide').value = 100;
    updateColorPickerButton('#0000ff');
    renderAllShapes(); 
  };

  document.getElementById('clearButton').onclick = function() { 
    g_shapesList = []; 
    sharkDrawn = false;
    g_undoStack = [];
    g_redoStack = [];
    g_actionCount = 0;
    document.getElementById('drawSharkButton').textContent = "Draw Shark Picture";
    document.getElementById('drawSharkButton').style.backgroundColor = '';
    document.getElementById('drawSharkButton').style.color = '';
    renderAllShapes();
    updateUndoRedoStatus();
  };
  // undo button
  document.getElementById('undoButton').onclick = function() {undo();};

  // redo button
  document.getElementById('redoButton').onclick = function() {redo();};

  //draw shark
  document.getElementById('drawSharkButton').onclick = function() {
    if (!sharkDrawn) {
      saveStateToUndoStack();
      sharkDrawn = true;
      drawSharkDirect();
      this.textContent = "Shark Picture (Already Drawn)";
      this.style.backgroundColor = '#4CAF50';
      this.style.color = 'white';
      g_actionCount++;
      updateUndoRedoStatus();
    }
  };

  document.getElementById('eraserButton').onclick = function() { 
    g_selectedType = ERASER;
    
    // visual feedback - change button appearance
    this.style.backgroundColor = '#f0f0f0';
    this.style.border = '2px solid #333';
    this.style.fontWeight = 'bold';
    
    // reset other shape buttons
    document.getElementById('pointButton').style.backgroundColor = '';
    document.getElementById('pointButton').style.border = '';
    document.getElementById('pointButton').style.fontWeight = '';
    
    document.getElementById('triButton').style.backgroundColor = '';
    document.getElementById('triButton').style.border = '';
    document.getElementById('triButton').style.fontWeight = '';
    
    document.getElementById('circleButton').style.backgroundColor = '';
    document.getElementById('circleButton').style.border = '';
    document.getElementById('circleButton').style.fontWeight = '';
  };

  document.getElementById('colorPickerButton').onclick = function() {
    //make OS show built in color picker
    document.getElementById('colorPicker').click();
  };
  
  document.getElementById('colorPicker').addEventListener('input', function() {
    applyColorFromPicker(this.value);
  });

  document.getElementById('pointButton').onclick = function() { g_selectedType=POINT};
  document.getElementById('triButton').onclick = function() { g_selectedType=TRIANGLE};
  document.getElementById('circleButton').onclick = function() { g_selectedType=CIRCLE};

  //bonus feature : rainbow mode button
  document.getElementById('rainbowButton').onclick = function() {
    g_rainbowMode = !g_rainbowMode;
    
    if (g_rainbowMode) {
        // rainbow mode on
        this.textContent = "Rainbow Mode ON";
        this.style.backgroundColor = 'linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)';
        this.style.color = 'black';
        this.style.fontWeight = 'bold';
        
        // disable color picker and sliders when in rainbow mode
        document.getElementById('colorPickerButton').style.opacity = '0.5';
        document.getElementById('colorPickerButton').style.pointerEvents = 'none';
        document.getElementById('redSlide').disabled = true;
        document.getElementById('greenSlide').disabled = true;
        document.getElementById('blueSlide').disabled = true;
    } else {
        // rainbow OFF
        this.textContent = "Rainbow Mode OFF";
        this.style.backgroundColor = '';
        this.style.color = '';
        this.style.fontWeight = '';
        
        // re-enable color picker and sliders
        document.getElementById('colorPickerButton').style.opacity = '1';
        document.getElementById('colorPickerButton').style.pointerEvents = 'auto';
        document.getElementById('redSlide').disabled = false;
        document.getElementById('greenSlide').disabled = false;
        document.getElementById('blueSlide').disabled = false;
    }
    
    renderAllShapes(); // redraw to show immediate feedback
  };

  //export png button
  document.getElementById('exportButton').onclick = function() {
    exportAsPNG();
  };


  //Slider Events
  document.getElementById('redSlide').addEventListener('input', function() {
  g_selectedColor[0] = this.value/100;
  updateColorPickerButtonFromRGB();
  renderAllShapes(); 
  });

  document.getElementById('greenSlide').addEventListener('input', function() {
    g_selectedColor[1] = this.value/100;
    updateColorPickerButtonFromRGB();
    renderAllShapes(); 
  });

  document.getElementById('blueSlide').addEventListener('input', function() {
    g_selectedColor[2] = this.value/100;
    updateColorPickerButtonFromRGB();
    renderAllShapes();
  });

  document.getElementById('sizeSlide').addEventListener('input', function() {
    g_selectedSize = this.value;
  });

  document.getElementById('circleSlide').addEventListener('input', function() {
    g_selectedSegments = this.value;
  });

  document.getElementById('rainbowSpeedSlide').addEventListener('input', function() {
    // convert to 0.001-0.05 range
    g_rainbowSpeed = this.value / 1000;
  });

  //eraser size slider
  document.getElementById('eraserSizeSlide').addEventListener('input', function() {g_eraserSize = this.value;});
}

function initSliders() {
  document.getElementById('redSlide').value = g_selectedColor[0] * 100;
  document.getElementById('greenSlide').value = g_selectedColor[1] * 100;
  document.getElementById('blueSlide').value = g_selectedColor[2] * 100;
  updateColorPickerButtonFromRGB();
}


function main() {

  // Set up canvas and gl variables
  setupWebGL();
  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  addActionsForHTMLUI();
  initSliders();
  updateColorPickerButtonFromRGB();
 
  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  // canvas.onmousemove = click;

  canvas.onmousemove = function(ev) { if(ev.buttons == 1) {click(ev)}};

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}


var g_shapesList = [];

// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = []; // THe array to store the size of the a point

function click(ev) {
  if (ev.type === 'mousedown' || (ev.type === 'mousemove' && !g_lastClickWasDrag)) {
    // save current state to undo stack BEFORE adding new shape
    saveStateToUndoStack();
  }
  
  g_lastClickWasDrag = (ev.type === 'mousemove');

  // extract the event click and return it in the WebGL coordinates
  let [x,y] = convertCoordinatesEventToGL(ev);
  
  if (g_selectedType == ERASER) {
    // erase shapes near the click position
    let erasedSomething = false;
    
    // check shapes from newest to oldest (so we erase most recent first)
    for (let i = g_shapesList.length - 1; i >= 0; i--) {
      let shape = g_shapesList[i];
      
      // different hit detection for different shape types
      let isHit = false;
      
      if (shape.constructor.name === 'Point') {
        // for points: check distance from center
        let dx = shape.position[0] - x;
        let dy = shape.position[1] - y;
        // use size to determine eraser radius (bigger eraser for larger points)
        let eraserRadius = 0.05 + (shape.size / 100);
        isHit = (dx * dx + dy * dy) < (eraserRadius * eraserRadius);
      }
      else if (shape.constructor.name === 'Triangle') {
        // for triangles: check if point is inside triangle
        isHit = isPointInTriangle(x, y, shape);
      }
      else if (shape.constructor.name === 'Circle') {
        // for circles: check distance from center
        let dx = shape.position[0] - x;
        let dy = shape.position[1] - y;
        // approximate circle radius based on size
        let circleRadius = shape.size / 100;
        isHit = (dx * dx + dy * dy) < (circleRadius * circleRadius);
      }
      
      if (isHit) {
        g_shapesList.splice(i, 1);
        erasedSomething = true;
        // break; 
      }
    }
    
    let eraserRadius = (g_eraserSize / 100);

    if (erasedSomething) {
      g_actionCount++;
      renderAllShapes();
      updateUndoRedoStatus();
    }
    
    return; 
  }

  let point;
  if (g_selectedType==POINT){
    point = new Point();
  } else if (g_selectedType ==TRIANGLE) {
    point = new Triangle();
  } else {
    point = new Circle();
  }
  point.position = [x,y];

  if (g_rainbowMode) {
    point.color = getRainbowColor(x, y);
    point.color.push(1.0); 
    } else {
      point.color = g_selectedColor.slice();
    }

    point.size = g_selectedSize;

  if (g_selectedType == CIRCLE) {
    point.segments = g_selectedSegments;
  }

  g_shapesList.push(point);
  g_actionCount++;
  
  // Draw every shape that is supposed to be in the canvas
  renderAllShapes();
  updateUndoRedoStatus();
}

function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}

//draw every shape that is supposed to be in the canvas
function renderAllShapes() {
  
  //Check the time at the start of this function
  var startTime = performance.now();

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw shapes from g_shapesList
  var len = g_shapesList.length;
  for(var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }

  // Redraw shark on top if it was drawn
  if (sharkDrawn) {
    drawSharkDirect();
  }

  var duration = performance.now() - startTime;
  var fps = duration > 0 ? Math.floor(1000 / duration) : 0;

  sendTextToHTML("numdot: " + len + " ms:" + Math.floor(duration) + " fps: " + fps, "numdot");
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

function drawSharkDirect() {
  const currentBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
  
  // vertical size (height)
  const shrinkY = 0.7;    
   // horizontal size (length)
  const stretchX = 0.9;  
  // move right a little
  const shiftX = 0.3;     

  // body triangles
  drawPictureTriangle([-0.8 * stretchX + shiftX, 0.4 * shrinkY, -0.8 * stretchX + shiftX, -0.4 * shrinkY, 0.2 * stretchX + shiftX, -0.4 * shrinkY], [0.5, 0.8, 1.0, 1.0]);
  drawPictureTriangle([-0.8 * stretchX + shiftX, 0.4 * shrinkY, 0.2 * stretchX + shiftX, 0.4 * shrinkY, 0.2 * stretchX + shiftX, -0.4 * shrinkY], [0.5, 0.8, 1.0, 1.0]);
  drawPictureTriangle([0.2 * stretchX + shiftX, 0.4 * shrinkY, 0.2 * stretchX + shiftX, -0.4 * shrinkY, 0.9 * stretchX + shiftX, -0.4 * shrinkY], [0.5, 0.8, 1.0, 1.0]);
  drawPictureTriangle([0.2 * stretchX + shiftX, 0.4 * shrinkY, 0.9 * stretchX + shiftX, 0.4 * shrinkY, 0.9 * stretchX + shiftX, -0.4 * shrinkY], [0.5, 0.8, 1.0, 1.0]);

  // triangle for head
  drawPictureTriangle([-1.4 * stretchX + shiftX, 0.0 * shrinkY, -0.8 * stretchX + shiftX, 0.4 * shrinkY, -0.8 * stretchX + shiftX, -0.4 * shrinkY], [0.5, 0.8, 1.0, 1.0]);

  // eye triangle
  drawPictureTriangle([-0.9 * stretchX + shiftX, 0.2 * shrinkY, -0.75 * stretchX + shiftX, 0.35 * shrinkY, -0.75 * stretchX + shiftX, 0.2 * shrinkY], [0, 0, 0, 1]);

  // mouth triangle (red)
  const mouthShiftX = 0.055;
  drawPictureTriangle([-1.28 * stretchX + shiftX + mouthShiftX, -0.115 * shrinkY, -0.86 * stretchX + shiftX + mouthShiftX, -0.42 * shrinkY, -0.76 * stretchX + shiftX + mouthShiftX, -0.055 * shrinkY], [1.0, 0.0, 0.0, 1.0]);

  // teeth(white)
  drawPictureTriangle([-1.15 * stretchX + shiftX + mouthShiftX, -0.095 * shrinkY, -1.1 * stretchX + shiftX + mouthShiftX, -0.22 * shrinkY, -1.05 * stretchX + shiftX + mouthShiftX, -0.075 * shrinkY], [1.0, 1.0, 1.0, 1.0]);
  drawPictureTriangle([-1.05 * stretchX + shiftX + mouthShiftX, -0.085 * shrinkY, -1.0 * stretchX + shiftX + mouthShiftX, -0.22 * shrinkY, -0.95 * stretchX + shiftX + mouthShiftX, -0.065 * shrinkY], [1.0, 1.0, 1.0, 1.0]);
  drawPictureTriangle([-0.95 * stretchX + shiftX + mouthShiftX, -0.075 * shrinkY, -0.9 * stretchX + shiftX + mouthShiftX, -0.22 * shrinkY, -0.85 * stretchX + shiftX + mouthShiftX, -0.055 * shrinkY], [1.0, 1.0, 1.0, 1.0]);
  drawPictureTriangle([-0.85 * stretchX + shiftX + mouthShiftX, -0.065 * shrinkY, -0.8 * stretchX + shiftX + mouthShiftX, -0.22 * shrinkY, -0.75 * stretchX + shiftX + mouthShiftX, -0.045 * shrinkY], [1.0, 1.0, 1.0, 1.0]);
  drawPictureTriangle([-1.09 * stretchX + shiftX + mouthShiftX, -0.24 * shrinkY, -1.03 * stretchX + shiftX + mouthShiftX, -0.18 * shrinkY, -1.03 * stretchX + shiftX + mouthShiftX, -0.30 * shrinkY], [1.0, 1.0, 1.0, 1.0]);
  drawPictureTriangle([-1.034 * stretchX + shiftX + mouthShiftX, -0.288 * shrinkY, -0.973 * stretchX + shiftX + mouthShiftX, -0.234 * shrinkY, -0.963 * stretchX + shiftX + mouthShiftX, -0.361 * shrinkY], [1.0, 1.0, 1.0, 1.0]);
  drawPictureTriangle([(-0.948 - 0.02 - 0.02 + 0.02) * stretchX + shiftX + mouthShiftX, (-0.342 - 0.02 + 0.01) * shrinkY, (-0.845 - 0.02) * stretchX + shiftX + mouthShiftX, (-0.261 - 0.02 + 0.01) * shrinkY, (-0.843 - 0.02 + 0.02 - 0.02 + 0.01) * stretchX + shiftX + mouthShiftX, (-0.449 - 0.02 + 0.01 + 0.02 + 0.02) * shrinkY], [1.0, 1.0, 1.0, 1.0]);

  // chevrons
  const offsetX = 0.1;
  drawPictureTriangle([-0.65 * stretchX + shiftX + offsetX, 0.0 * shrinkY, -0.25 * stretchX + shiftX + offsetX, 0.20 * shrinkY, -0.25 * stretchX + shiftX + offsetX, 0.08 * shrinkY], [0,0,0,1]);
  drawPictureTriangle([-0.65 * stretchX + shiftX + offsetX, 0.0 * shrinkY, -0.25 * stretchX + shiftX + offsetX, -0.08 * shrinkY, -0.25 * stretchX + shiftX + offsetX, -0.20 * shrinkY], [0,0,0,1]);
  drawPictureTriangle([-0.3 * stretchX + shiftX + offsetX, 0.0 * shrinkY, 0.1 * stretchX + shiftX + offsetX, 0.20 * shrinkY, 0.1 * stretchX + shiftX + offsetX, 0.08 * shrinkY], [0,0,0,1]);
  drawPictureTriangle([-0.3 * stretchX + shiftX + offsetX, 0.0 * shrinkY, 0.1 * stretchX + shiftX + offsetX, -0.08 * shrinkY, 0.1 * stretchX + shiftX + offsetX, -0.20 * shrinkY], [0,0,0,1]);
  drawPictureTriangle([0.05 * stretchX + shiftX + offsetX, 0.0 * shrinkY, 0.45 * stretchX + shiftX + offsetX, 0.20 * shrinkY, 0.45 * stretchX + shiftX + offsetX, 0.08 * shrinkY], [0,0,0,1]);
  drawPictureTriangle([0.05 * stretchX + shiftX + offsetX, 0.0 * shrinkY, 0.45 * stretchX + shiftX + offsetX, -0.08 * shrinkY, 0.45 * stretchX + shiftX + offsetX, -0.20 * shrinkY], [0,0,0,1]);

  // fins
  const shiftLeft = 0.35;
  drawPictureTriangle([-0.1 * stretchX + shiftX - shiftLeft, 0.4 * shrinkY, 0.25 * stretchX + shiftX - shiftLeft, 0.8 * shrinkY, 0.3 * stretchX + shiftX - shiftLeft, 0.4 * shrinkY], [0.5, 0.8, 1.0, 1.0]);
  drawPictureTriangle([0.22 * stretchX + shiftX - shiftLeft, 0.4 * shrinkY, 0.25 * stretchX + shiftX - shiftLeft, 0.80 * shrinkY, 0.3 * stretchX + shiftX - shiftLeft, 0.4 * shrinkY], [1.0, 1.0, 1.0, 1.0]);
  drawPictureTriangle([-0.05 * stretchX + shiftX - shiftLeft, -0.4 * shrinkY, 0.1 * stretchX + shiftX - shiftLeft, -0.7 * shrinkY, 0.15 * stretchX + shiftX - shiftLeft, -0.4 * shrinkY], [0.5, 0.8, 1.0, 1.0]);
  drawPictureTriangle([0.11 * stretchX + shiftX - shiftLeft, -0.4 * shrinkY, 0.1 * stretchX + shiftX - shiftLeft, -0.7 * shrinkY, 0.15 * stretchX + shiftX - shiftLeft, -0.4 * shrinkY], [1.0, 1.0, 1.0, 1.0]);


  //plants
  // dark green
  const plantColor = [0.0, 0.6, 0.0, 1.0]; 
  // move more to the left
  const dx = -0.05; 
   // move down
  const dy = 0.15; 

  //move 1st plant to left
  const shiftLeftPlantX = 0.15; 
  drawPictureTriangle([-0.85+dx+shiftLeftPlantX, -0.4-dy, -0.9+dx+shiftLeftPlantX, -0.55-dy, -0.8+dx+shiftLeftPlantX, -0.55-dy], plantColor); // top tip
  drawPictureTriangle([-0.9+dx+shiftLeftPlantX, -0.55-dy, -0.8+dx+shiftLeftPlantX, -0.55-dy, -0.9+dx+shiftLeftPlantX, -0.7-dy], plantColor);   // row 1 square (tri 1)
  drawPictureTriangle([-0.8+dx+shiftLeftPlantX, -0.55-dy, -0.8+dx+shiftLeftPlantX, -0.7-dy, -0.9+dx+shiftLeftPlantX, -0.7-dy], plantColor);     // row 1 square (tri 2)
  drawPictureTriangle([-0.9+dx+shiftLeftPlantX, -0.7-dy, -0.8+dx+shiftLeftPlantX, -0.7-dy, -0.9+dx+shiftLeftPlantX, -0.85-dy], plantColor);     // row 2 square (tri 1)
  drawPictureTriangle([-0.8+dx+shiftLeftPlantX, -0.7-dy, -0.8+dx+shiftLeftPlantX, -0.85-dy, -0.9+dx+shiftLeftPlantX, -0.85-dy], plantColor);    // row 2 square (tri 2)

  // 2nd plant
  drawPictureTriangle([-0.25+dx, -0.4-dy, -0.3+dx, -0.55-dy, -0.2+dx, -0.55-dy], plantColor);
  drawPictureTriangle([-0.3+dx, -0.55-dy, -0.2+dx, -0.55-dy, -0.3+dx, -0.7-dy], plantColor);
  drawPictureTriangle([-0.2+dx, -0.55-dy, -0.2+dx, -0.7-dy, -0.3+dx, -0.7-dy], plantColor);
  drawPictureTriangle([-0.3+dx, -0.7-dy, -0.2+dx, -0.7-dy, -0.3+dx, -0.85-dy], plantColor);
  drawPictureTriangle([-0.2+dx, -0.7-dy, -0.2+dx, -0.85-dy, -0.3+dx, -0.85-dy], plantColor);

  // 3rd plant
  drawPictureTriangle([0.35+dx, -0.4-dy, 0.3+dx, -0.55-dy, 0.4+dx, -0.55-dy], plantColor);
  drawPictureTriangle([0.3+dx, -0.55-dy, 0.4+dx, -0.55-dy, 0.3+dx, -0.7-dy], plantColor);
  drawPictureTriangle([0.4+dx, -0.55-dy, 0.4+dx, -0.7-dy, 0.3+dx, -0.7-dy], plantColor);
  drawPictureTriangle([0.3+dx, -0.7-dy, 0.4+dx, -0.7-dy, 0.3+dx, -0.85-dy], plantColor);
  drawPictureTriangle([0.4+dx, -0.7-dy, 0.4+dx, -0.85-dy, 0.3+dx, -0.85-dy], plantColor);

  // Fish variables
  // lighter orange
  const fishBodyTopColor = [1.0, 0.8, 0.3, 1.0]; 
  // darker orange
  const fishBodyBottomColor = [1.0, 0.6, 0.0, 1.0]; 
  // black
  const fishEyeColor = [0, 0, 0, 1];              
  const fishTailColor = fishBodyBottomColor;        
  // size of the fish
  const fishScale = 0.6;       
  //shift x                    
  const fishShiftX = -0.7;                  
  //shift y   
  const fishShiftY = 0.8;                   

  // body
  drawPictureTriangle([fishShiftX, fishShiftY, fishShiftX + 0.5*fishScale, fishShiftY - 0.15*fishScale, fishShiftX + 0.5*fishScale, fishShiftY + 0.15*fishScale],fishBodyBottomColor);
  drawPictureTriangle([fishShiftX, fishShiftY,fishShiftX + 0.35*fishScale, fishShiftY - 0.10*fishScale,fishShiftX + 0.35*fishScale, fishShiftY + 0.10*fishScale ],fishBodyTopColor);

  // eye
  drawPictureTriangle([fishShiftX + 0.33*fishScale, fishShiftY + 0.01*fishScale,fishShiftX + 0.33*fishScale, fishShiftY + 0.07*fishScale,fishShiftX + 0.23*fishScale, fishShiftY + 0.04*fishScale],[0, 0, 0, 1]  );

  //tail
  drawPictureTriangle([fishShiftX + 0.5*fishScale, fishShiftY,fishShiftX + 0.62*fishScale, fishShiftY - 0.10*fishScale,fishShiftX + 0.62*fishScale, fishShiftY + 0.10*fishScale ],fishBodyBottomColor);

  //Top-right fish 
  const fishShiftX2 = 0.4;  
  const fishShiftY2 = 0.8;  

  //body
  drawPictureTriangle([fishShiftX2, fishShiftY2,fishShiftX2 + 0.5*fishScale, fishShiftY2 - 0.15*fishScale,fishShiftX2 + 0.5*fishScale, fishShiftY2 + 0.15*fishScale],fishBodyBottomColor);
  drawPictureTriangle([fishShiftX2, fishShiftY2,fishShiftX2 + 0.35*fishScale, fishShiftY2 - 0.10*fishScale,fishShiftX2 + 0.35*fishScale, fishShiftY2 + 0.10*fishScale],fishBodyTopColor);

  // eye
  drawPictureTriangle([fishShiftX2 + 0.33*fishScale, fishShiftY2 + 0.01*fishScale,fishShiftX2 + 0.33*fishScale, fishShiftY2 + 0.07*fishScale,fishShiftX2 + 0.23*fishScale, fishShiftY2 + 0.04*fishScale],[0, 0, 0, 1]);

  // tail
  drawPictureTriangle([fishShiftX2 + 0.5*fishScale, fishShiftY2,fishShiftX2 + 0.62*fishScale, fishShiftY2 - 0.10*fishScale,fishShiftX2 + 0.62*fishScale, fishShiftY2 + 0.10*fishScale],fishBodyBottomColor);

  gl.bindBuffer(gl.ARRAY_BUFFER, currentBuffer);
}

function drawPictureTriangle(vertices, color) {
  // set color
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  
  // create and bind buffer
  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  
  // set up attribute pointer
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  
  // draw the triangle
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  
  // clean up
  gl.deleteBuffer(vertexBuffer);
}

//extra functions for color picker
function applyColorFromPicker(hexColor) {
  // convert hex color to RGB
  // hex format: #RRGGBB or #RGB
  hexColor = hexColor.replace('#', '');
  
  let r, g, b;
  
  if (hexColor.length === 6) {
    // #RRGGBB format
    r = parseInt(hexColor.substr(0, 2), 16) / 255;
    g = parseInt(hexColor.substr(2, 2), 16) / 255;
    b = parseInt(hexColor.substr(4, 2), 16) / 255;
  } else if (hexColor.length === 3) {
    // #RGB format
    r = parseInt(hexColor.charAt(0) + hexColor.charAt(0), 16) / 255;
    g = parseInt(hexColor.charAt(1) + hexColor.charAt(1), 16) / 255;
    b = parseInt(hexColor.charAt(2) + hexColor.charAt(2), 16) / 255;
  } else {
    // default to white
    r = g = b = 1.0;
  }
  
  // update selected color
  g_selectedColor = [r, g, b, 1.0];
  
  // update RGB sliders
  document.getElementById('redSlide').value = r * 100;
  document.getElementById('greenSlide').value = g * 100;
  document.getElementById('blueSlide').value = b * 100;
  
  // update color picker button background to show selected color
  const colorPickerButton = document.getElementById('colorPickerButton');
  colorPickerButton.style.backgroundColor = '#' + hexColor;
  // light/dark text for contrast
  colorPickerButton.style.color = (r + g + b < 1.5) ? 'white' : 'black'; 
  
  // update the color picker input to match 
  document.getElementById('colorPicker').value = '#' + hexColor;
  
  // redraw to show the new color
  renderAllShapes();
}

function updateColorPickerButton(hexColor) {
  const colorPickerButton = document.getElementById('colorPickerButton');
  const colorPickerInput = document.getElementById('colorPicker');
  
  // update button color
  colorPickerButton.style.backgroundColor = hexColor;
  
  // update text color for contrast
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  colorPickerButton.style.color = (r + g + b < 1.5) ? 'white' : 'black';
  
  // update the color picker input value
  colorPickerInput.value = hexColor;
}

function updateColorPickerButtonFromRGB() {
  const r = Math.round(g_selectedColor[0] * 255);
  const g = Math.round(g_selectedColor[1] * 255);
  const b = Math.round(g_selectedColor[2] * 255);
  
  // convert to hex
  const hexColor = '#' + 
    (r < 16 ? '0' : '') + r.toString(16) +
    (g < 16 ? '0' : '') + g.toString(16) +
    (b < 16 ? '0' : '') + b.toString(16);
  
  // update color picker button
  const colorPickerButton = document.getElementById('colorPickerButton');
  const colorPickerInput = document.getElementById('colorPicker');
  
  colorPickerButton.style.backgroundColor = hexColor;
  colorPickerButton.style.color = (g_selectedColor[0] + g_selectedColor[1] + g_selectedColor[2] < 1.5) ? 'white' : 'black';
  
  // update color picker input
  colorPickerInput.value = hexColor;
}

//rainbow mode functions
// workflow: generate HSL values based on time and position and then convert to RGB to display to the canvas
//convert HSL(Hue, saturation, lightness) to RGB
function hslToRgb(h, s, l) {
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l; // Grayscale
    } else {
        const hue2rgb = function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return [r, g, b];
}

// generate a rainbow color based on time and position
function getRainbowColor(x, y) {
    // time based hue
    const timeHue = (Date.now() * g_rainbowSpeed) % 1;
    
    // position based hue
    const posHue = (x + y + 2) / 4 % 1; // Normalize to 0-1
    
    // random generated
    const combinedHue = (timeHue + posHue * 0.3) % 1;
    
    // apply full saturation but medium lightness for vibrant colors
    return hslToRgb(combinedHue, 0.9, 0.6);
}

//function to export PNG
function exportAsPNG() {
    // create a temp link element
    const link = document.createElement('a');
    
    // set the download filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `webgl-drawing-${timestamp}.png`;
    
    // convert canvas to data URL (PNG format)
    link.href = canvas.toDataURL('image/png');
    
    // append to document, click it, then remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // visual feedback
    const originalText = document.getElementById('exportButton').textContent;
    document.getElementById('exportButton').textContent = 'Saved!';
    document.getElementById('exportButton').style.backgroundColor = '#4CAF50';
    document.getElementById('exportButton').style.color = 'white';
    
    // reset button after 1.5 seconds
    setTimeout(() => {
        document.getElementById('exportButton').textContent = originalText;
        document.getElementById('exportButton').style.backgroundColor = '';
        document.getElementById('exportButton').style.color = '';
    }, 1500);
}

//functions for undo and redo + updating button states
// save current state to undo stack
function saveStateToUndoStack() {
  // Deep copy the shapes list with type information
  const stateCopy = g_shapesList.map(shape => {
    // create a new object with all properties PLUS type
    const copy = {
      // store the shape type for reconstruction
      _type: shape.constructor.name,
    };
    
    // copy all properties from the shape
    for (let key in shape) {
      if (shape.hasOwnProperty(key)) {
        if (Array.isArray(shape[key])) {
          copy[key] = shape[key].slice(); // copy array
        } else {
          copy[key] = shape[key]; // copy primitive
        }
      }
    }
    return copy;
  });
  
  g_undoStack.push(stateCopy);
  
  // clear redo stack when new action is performed
  g_redoStack = [];
  
  // limit undo stack size
  if (g_undoStack.length > g_maxUndoSteps) {
    g_undoStack.shift(); // remove oldest
  }
  
  updateUndoRedoStatus();
}

// undo function
function undo() {
  if (g_undoStack.length > 0) {
    // save current state to redo stack (with type info)
    g_redoStack.push(g_shapesList.map(shape => {
      const copy = {
        _type: shape.constructor.name,
      };
      
      for (let key in shape) {
        if (shape.hasOwnProperty(key)) {
          if (Array.isArray(shape[key])) {
            copy[key] = shape[key].slice();
          } else {
            copy[key] = shape[key];
          }
        }
      }
      return copy;
    }));
    
    // restore previous state by recreating shape instances
    const savedState = g_undoStack.pop();
    g_shapesList = [];
    
    // Recreate each shape as proper class instance
    for (let shapeData of savedState) {
      let shape;
      
      // Create the appropriate shape instance based on stored type
      switch (shapeData._type) {
        case 'Point':
          shape = new Point();
          break;
        case 'Triangle':
          shape = new Triangle();
          break;
        case 'Circle':
          shape = new Circle();
          break;
        default:
          // fallback to Point if type not recognized
          shape = new Point();
      }
      
      // copy all properties from saved data to the new instance
      for (let key in shapeData) {
        if (key !== '_type' && shapeData.hasOwnProperty(key)) {
          shape[key] = shapeData[key];
        }
      }
      
      g_shapesList.push(shape);
    }
    
    renderAllShapes();
    updateUndoRedoStatus();
  }
}

// redo function
function redo() {
  if (g_redoStack.length > 0) {
    // save current state to undo stack
    g_undoStack.push(g_shapesList.map(shape => {
      const copy = {
        _type: shape.constructor.name,
      };
      
      for (let key in shape) {
        if (shape.hasOwnProperty(key)) {
          if (Array.isArray(shape[key])) {
            copy[key] = shape[key].slice();
          } else {
            copy[key] = shape[key];
          }
        }
      }
      return copy;
    }));
    
    // restore redone state by recreating shape instances
    const savedState = g_redoStack.pop();
    g_shapesList = [];
    
    // recreate each shape as proper class instance
    for (let shapeData of savedState) {
      let shape;
      
      // create the appropriate shape instance based on stored type
      switch (shapeData._type) {
        case 'Point':
          shape = new Point();
          break;
        case 'Triangle':
          shape = new Triangle();
          break;
        case 'Circle':
          shape = new Circle();
          break;
        default:
          shape = new Point();
      }
      
      // copy all properties from saved data to the new instance
      for (let key in shapeData) {
        if (key !== '_type' && shapeData.hasOwnProperty(key)) {
          shape[key] = shapeData[key];
        }
      }
      
      g_shapesList.push(shape);
    }
    
    renderAllShapes();
    updateUndoRedoStatus();
  }
}
// update status display
function updateUndoRedoStatus() {
  const statusEl = document.getElementById('undoRedoStatus');
  if (statusEl) {
    statusEl.textContent = 
      `Actions: ${g_actionCount} | ` +
      `Undos available: ${g_undoStack.length} | ` +
      `Redos available: ${g_redoStack.length}`;
  }
  
  // update button states
  const undoBtn = document.getElementById('undoButton');
  const redoBtn = document.getElementById('redoButton');
  
  if (undoBtn) {
    undoBtn.disabled = g_undoStack.length === 0;
    undoBtn.style.opacity = g_undoStack.length === 0 ? '0.5' : '1';
  }
  
  if (redoBtn) {
    redoBtn.disabled = g_redoStack.length === 0;
    redoBtn.style.opacity = g_redoStack.length === 0 ? '0.5' : '1';
  }
}

//helper functions for eraser tool:
function isPointInTriangle(px, py, triangle) {
  // Triangles store vertices differently - you might need to adjust
  // based on how your Triangle class stores vertices
  
  // If your Triangle class has vertices property:
  if (triangle.vertices && triangle.vertices.length >= 6) {
    const [x1, y1, x2, y2, x3, y3] = triangle.vertices;
    
    // Barycentric coordinate technique
    const area = 0.5 * (-y2*x3 + y1*(-x2 + x3) + x1*(y2 - y3) + x2*y3);
    const s = 1/(2*area) * (y1*x3 - x1*y3 + (y3 - y1)*px + (x1 - x3)*py);
    const t = 1/(2*area) * (x1*y2 - y1*x2 + (y1 - y2)*px + (x2 - x1)*py);
    
    return s > 0 && t > 0 && (1 - s - t) > 0;
  }
  
  // Fallback: check distance from triangle's position (center-ish)
  let dx = triangle.position[0] - px;
  let dy = triangle.position[1] - py;
  return (dx * dx + dy * dy) < 0.05; // Approximate
}

//visuals for eraser tool
// Update all shape button handlers to include visual feedback
function setActiveButton(buttonId) {
  // Remove active class from all shape buttons
  ['pointButton', 'triButton', 'circleButton', 'eraserButton'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.classList.remove('active');
      btn.style.backgroundColor = '';
      btn.style.border = '';
      btn.style.fontWeight = '';
    }
  });
  
  // add active class to selected button
  const activeBtn = document.getElementById(buttonId);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.style.backgroundColor = '#4CAF50';
    activeBtn.style.color = 'white';
    activeBtn.style.border = '2px solid #333';
    activeBtn.style.fontWeight = 'bold';
  }
  }

// update button handlers:
  document.getElementById('pointButton').onclick = function() { 
    g_selectedType = POINT;
    setActiveButton('pointButton');
  };

  document.getElementById('triButton').onclick = function() { 
    g_selectedType = TRIANGLE;
    setActiveButton('triButton');
  };

  document.getElementById('circleButton').onclick = function() { 
    g_selectedType = CIRCLE;
    setActiveButton('circleButton');
  };

  document.getElementById('eraserButton').onclick = function() { 
    g_selectedType = ERASER;
    setActiveButton('eraserButton');
};