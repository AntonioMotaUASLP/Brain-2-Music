// Instantiate the model by specifying the desired checkpoint.
const model = new mm.MusicVAE(
    'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_4bar');

// Create a player for playing the generated music.
const player = new mm.Player();

// Visualizador de notas
const noteVisualization = new mm.Visualizer(player, document.getElementById('note-visualization'));


// Variables for controlling the generation and playback process.
let stopSignal = false; // Flag to signal when to stop generating music.
let count = 0; // Counter to keep track of the number of generated trios.
let tempo = 80; // Initial tempo for the generated music.

// Function to sample and play music continuously.
const sampleAndPlayForever = () => {
    player.stop();
    count += 1;
    document.getElementById('count').innerHTML = `${count} trios`;

    return model.sample(1)
        .then((samples) => {
            noteVisualization.redraw(samples[0]);
            return player.start(samples[0], tempo);
        })
        .then(stopSignal ? undefined : sampleAndPlayForever);
};

// Function to sample and play music continuously.
// const sampleAndPlayForever = () => {
//     player.stop(); // Stop the player if it's currently playing.
//     count += 1; // Increment the trio count.
//     document.getElementById('count').innerHTML = `${count} trios`; // Update the trio count in the HTML.
//     return model.sample(1)
//         .then((samples) => player.start(samples[0], tempo))
//         .then(stopSignal ? undefined : sampleAndPlayForever); // Recursive call to sampleAndPlayForever unless stopSignal is true.
// };

// Function to change the tempo based on a delta value.
const changeTempo = (delta) => {
    tempo = Math.max(Math.min(tempo + delta * 10, 140), 40); // Adjust the tempo within a range [40, 140] bpm.
    const tempoCounter = document.getElementById('tempo');
    tempoCounter.setAttribute('scrollamount', tempo / 10); // Adjust the scroll speed of the tempo display.
    tempoCounter.innerHTML = `${tempo} bpm`; // Update the tempo display in the HTML.
};

// Function to start generating and playing music.
const start = () => {
    mm.Player.tone.context.resume();
    document.getElementById('start').style.display = "none";
    changeTempo(0);
    stopSignal = false;
    sampleAndPlayForever();
    // Inicializa la visualización después de iniciar la reproducción continua
    noteVisualization.initialize();
};

// Function to stop generating and playing music.
const stop = () => {
    stopSignal = true;
    player.stop();
    noteVisualization.stop();
    document.getElementById('wait').style.display = "none";
    document.getElementById('start').style.display = "block";
};

// Initialize the model and stop the generation and playback.
model.initialize().then(stop);
