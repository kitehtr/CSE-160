// DrawRectangle.js

function main() {
// Retrieve <canvas> element <- (1)
    var canvas = document.getElementById('example');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }

// Get the rendering context for 2DCG <- (2)
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 400, 400);

    var drawButton = document.getElementById('drawButton');
    drawButton.addEventListener('click', handleDrawEvent);

    var operationButton = document.getElementById('operationButton');
    operationButton.addEventListener('click', handleDrawOperationEvent);
    // var v1 = new Vector3([2.25, 2.25, 0.0]);

    // drawVector(v1, "red");
}

function drawVector(v, color) {
    var canvas = document.getElementById('example');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }
    
    var ctx = canvas.getContext('2d');

    var x = v.elements[0];
    var y = v.elements[1];

    var scaledX = x * 20;
    var scaledY = y * 20;

    ctx.beginPath();
    ctx.moveTo(200, 200); 
    ctx.lineTo(200 + scaledX, 200 - scaledY);

    ctx.strokeStyle = color;
    
    ctx.stroke();
}

function handleDrawEvent() {
    var canvas = document.getElementById('example');
     if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }

    var ctx = canvas.getContext('2d');

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 400, 400);

    var xInput = document.getElementById('xCoord');
    var yInput = document.getElementById('yCoord');
    var xInput2 = document.getElementById('xCoord2');
    var yInput2 = document.getElementById('yCoord2');

    var xValue = xInput.value;
    var yValue = yInput.value;

    var xValue2 = xInput2.value;
    var yValue2 = yInput2.value;

    var x = parseFloat(xValue);
    var y = parseFloat(yValue);

    var x2 = parseFloat(xValue2);
    var y2 = parseFloat(yValue2);
    
    if (isNaN(x)) x = 0;
    if (isNaN(y)) y = 0;

    if (isNaN(x2)) x2 = 0;
    if (isNaN(y2)) y2 = 0;

    var v1 = new Vector3([x, y, 0.0]);
    var v2 = new Vector3([x2, y2, 0.0]);

    drawVector(v1, "red");
    drawVector(v2, "blue");
}

function handleDrawOperationEvent(){
    var canvas = document.getElementById('example');
     if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }

    var ctx = canvas.getContext('2d');

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 400, 400);

    var xInput = document.getElementById('xCoord');
    var yInput = document.getElementById('yCoord');
    var x = parseFloat(xInput.value) || 0;
    var y = parseFloat(yInput.value) || 0;
    var v1 = new Vector3([x, y, 0.0]);
    drawVector(v1, "red");

    var xInput2 = document.getElementById('xCoord2');
    var yInput2 = document.getElementById('yCoord2');
    var x2 = parseFloat(xInput2.value) || 0;
    var y2 = parseFloat(yInput2.value) || 0;
    var v2 = new Vector3([x2, y2, 0.0]);
    drawVector(v2, "blue");

    var SelectedOperation = document.getElementById('operation');
    var operation = SelectedOperation.value;

    var scalarInput = document.getElementById('Scalar');
    var scalar = parseFloat(scalarInput.value) || 1.0;

    switch(operation) {
        case 'add':
            var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
            v3.add(v2);
            drawVector(v3, "green");
            break;
            
        case 'sub':
            var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
            v3.sub(v2);
            drawVector(v3, "green");
            break;
            
        case 'mul':
            var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
            var v4 = new Vector3([v2.elements[0], v2.elements[1], v2.elements[2]]);
            v3.mul(scalar);
            v4.mul(scalar);
            drawVector(v3, "green");
            drawVector(v4, "green");
            break;
            
        case 'div':
            if (scalar !== 0) {
                var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
                var v4 = new Vector3([v2.elements[0], v2.elements[1], v2.elements[2]]);
                v3.div(scalar);
                v4.div(scalar);
                drawVector(v3, "green");
                drawVector(v4, "green");
            }
            break;

        case 'mag':
            console.log("Magnitude v1:", v1.magnitude());
            console.log("Magnitude v2:", v2.magnitude());
            break;
        
        case 'norm':
            var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
            var v4 = new Vector3([v2.elements[0], v2.elements[1], v2.elements[2]]);
            v3.normalize();
            v4.normalize();
            drawVector(v3, "green");
            drawVector(v4, "green");
            console.log("Magnitude v3 (normalized):", v3.magnitude());
            console.log("Magnitude v4 (normalized):", v4.magnitude());
            break;

        case 'angleBtwn':
            let angle = angleBetween(v1, v2);
            console.log("Angle:", angle);
            break;
            
        case 'area':
            let area = areaTriangle(v1,v2);
            console.log("Area of the triangle:", area);
            break;

        default:
            return;
    }   
}

function angleBetween(v1, v2) {    
    let dotProduct = Vector3.dot(v1, v2);
    let mag1 = v1.magnitude();
    let mag2 = v2.magnitude();
    
    if (mag1 === 0 || mag2 === 0) {
        return 0;
    }
    
    let cosAlpha = dotProduct / (mag1 * mag2);
    let angleRadians = Math.acos(cosAlpha);
    let angleDegrees = angleRadians * (180 / Math.PI);
    
    return angleDegrees;
}

function areaTriangle(v1, v2) {
    let crossProduct = Vector3.cross(v1, v2);
    let parallelogramArea = crossProduct.magnitude();
    let triangleArea = parallelogramArea / 2;
    
    return triangleArea;
}