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

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
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
//Globals related to UI elements
let g_selectedColor=[1.0,1.0,1.0,1.0];
let g_selectedSize=5;
let g_selectedType=POINT;
let g_selectedSegments=10;

function addActionsForHTMLUI() {
  //Button Events (Shape Type)
  document.getElementById('green').onclick = function() { 
  g_selectedColor = [0.0, 1.0, 0.0, 1.0];
  document.getElementById('greenSlide').value = 100;
  document.getElementById('redSlide').value = 0;
  document.getElementById('blueSlide').value = 0;
  };
  document.getElementById('red').onclick = function() { 
  g_selectedColor = [1.0, 0.0, 0.0, 1.0];
  document.getElementById('greenSlide').value = 0;
  document.getElementById('redSlide').value = 100;
  document.getElementById('blueSlide').value = 0;
  };
  document.getElementById('blue').onclick = function() { 
    g_selectedColor = [0.0, 0.0, 1.0, 1.0];
    document.getElementById('greenSlide').value = 0;
    document.getElementById('redSlide').value = 0;
    document.getElementById('blueSlide').value = 100;
    renderAllShapes(); 
  };

  document.getElementById('clearButton').onclick = function() { 
    g_shapesList = []; 
    sharkDrawn = false;
    document.getElementById('drawSharkButton').textContent = "Draw Shark Picture";
    document.getElementById('drawSharkButton').style.backgroundColor = '';
    document.getElementById('drawSharkButton').style.color = '';
    renderAllShapes();
  };

  document.getElementById('drawSharkButton').onclick = function() {
    if (!sharkDrawn) {
      sharkDrawn = true;
      drawSharkDirect();
      this.textContent = "Shark Picture (Already Drawn)";
      this.style.backgroundColor = '#4CAF50';
      this.style.color = 'white';
    }
  };

  document.getElementById('pointButton').onclick = function() { g_selectedType=POINT};
  document.getElementById('triButton').onclick = function() { g_selectedType=TRIANGLE};
  document.getElementById('circleButton').onclick = function() { g_selectedType=CIRCLE};

  //Slider Events
  document.getElementById('redSlide').addEventListener('input', function() {
  g_selectedColor[0] = this.value/100;
  renderAllShapes(); 
  });

  document.getElementById('greenSlide').addEventListener('input', function() {
    g_selectedColor[1] = this.value/100;
    renderAllShapes(); 
  });

  document.getElementById('blueSlide').addEventListener('input', function() {
    g_selectedColor[2] = this.value/100;
    renderAllShapes();
  });

  document.getElementById('sizeSlide').addEventListener('input', function() {
    g_selectedSize = this.value;
  });

  document.getElementById('circleSlide').addEventListener('input', function() {
    g_selectedSegments = this.value;
  });
}

function initSliders() {
  document.getElementById('redSlide').value = g_selectedColor[0] * 100;
  document.getElementById('greenSlide').value = g_selectedColor[1] * 100;
  document.getElementById('blueSlide').value = g_selectedColor[2] * 100;
}


function main() {

  // Set up canvas and gl variables
  setupWebGL();
  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  addActionsForHTMLUI();
  initSliders();
 
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
  
  // Extract the event click and return it in the WebGL coordinates
  let [x,y] = convertCoordinatesEventToGL(ev);
  
  let point = new Triangle();
  if (g_selectedType==POINT){
    point = new Point();
  } else if (g_selectedType ==TRIANGLE) {
    point = new Triangle();
  } else {
    point = new Circle();
  }
  point.position = [x,y];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;

  if (g_selectedType == CIRCLE) {
    point.segments = g_selectedSegments;
  }

  g_shapesList.push(point);

  // Draw every shape that is supposed to be in the canvas
  renderAllShapes();
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