var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

// Create a new image object
var img = new Image();

// Specify the source of the image
img.src = '/img/brain.png';

// Draw the image onto the canvas once it's loaded
img.onload = function() {
    ctx.drawImage(img, 200, 200, 200, 200);
};