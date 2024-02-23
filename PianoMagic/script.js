
// Mapeo de botones.
const MAPPING_8 = {0:0, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7};
const MAPPING_4 = {0:0, 1:2, 2:5, 3:7};
const BUTTONS_DEVICE = ['a','s','d','f','j','k','l',';'];
const BUTTONS_MAKEY = ['ArrowUp','ArrowLeft','ArrowDown','ArrowRight','w','a','s','d'];
const BUTTONS_MAKEY_DISPLAY = ['↑','←','↓','→','w','a','s','d'];

let OCTAVES = 7;
let NUM_BUTTONS = 8;
let BUTTON_MAPPING = MAPPING_8;

let keyWhitelist;
let TEMPERATURE = getTemperature();

const heldButtonToVisualData = new Map();

// Controla el sustain en los botones
let sustaining = false
let sustainingNotes = [];

// esta linea es para que el boton de play no se active hasta que el modelo este listo
let mouseDownButton = null;

const player = new Player();
const genie = new mm.PianoGenie(CONSTANTS.GENIE_CHECKPOINT);
const painter = new FloatyNotes();
const piano = new Piano();
let isUsingMakey = false;
initEverything();

/*************************
 * Logica para el inicio de la app
 ************************/
function initEverything() {
  genie.initialize().then(() => {
    console.log('🧞‍♀️ ready!');
    playBtn.textContent = 'Play';
    playBtn.removeAttribute('disabled');
    playBtn.classList.remove('loading');
  });

  // Comenzar a dibujar el piano.
  onWindowResize();
  updateButtonText();
  window.requestAnimationFrame(() => painter.drawLoop());

  // Event listeners.
  document.getElementById('numButtons4').addEventListener('change', (event) => event.target.checked && updateNumButtons(4));
  document.getElementById('numButtons8').addEventListener('change', (event) => event.target.checked && updateNumButtons(8));
  
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('orientationchange', onWindowResize);
  window.addEventListener('hashchange', () => TEMPERATURE = getTemperature());
}

function updateNumButtons(num) {
  NUM_BUTTONS = num;
  const buttons = document.querySelectorAll('.controls > button.color');
  BUTTON_MAPPING = (num === 4) ? MAPPING_4 : MAPPING_8;
  
  // Ocultar botones que no se usan.
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].hidden = i >= num;
  }
}

function showMainScreen() {
  document.querySelector('.splash').hidden = true;
  document.querySelector('.loaded').hidden = false;

  document.addEventListener('keydown',onKeyDown);
  
  controls.addEventListener('touchstart', (event) => doTouchStart(event), {passive: true});
  controls.addEventListener('touchend', (event) => doTouchEnd(event), {passive: true});
  
  const hasTouchEvents = ('ontouchstart' in window);
  if (!hasTouchEvents) {
    controls.addEventListener('mousedown', (event) => doTouchStart(event));
    controls.addEventListener('mouseup', (event) => doTouchEnd(event));
  }
  
  controls.addEventListener('mouseover', (event) => doTouchMove(event, true));
  controls.addEventListener('mouseout', (event) => doTouchMove(event, false));
  controls.addEventListener('touchenter', (event) => doTouchMove(event, true));
  controls.addEventListener('touchleave', (event) => doTouchMove(event, false));
  canvas.addEventListener('mouseenter', () => mouseDownButton = null);
  
  // Output.
  radioMidiOutYes.addEventListener('click', () => {
    player.usingMidiOut = true;
    midiOutBox.hidden = false;
  });
  radioAudioYes.addEventListener('click', () => {
    player.usingMidiOut = false;
    midiOutBox.hidden = true;
  });
  // Input.
  radioMidiInYes.addEventListener('click', () => {
    player.usingMidiIn = true;
    midiInBox.hidden = false;
    isUsingMakey = false;
    updateButtonText();
  });
  radioDeviceYes.addEventListener('click', () => {
    player.usingMidiIn = false;
    midiInBox.hidden = true;
    isUsingMakey = false;
    updateButtonText();
  });
  radioMakeyYes.addEventListener('click', () => {
    player.usingMidiIn = false;
    midiInBox.hidden = true;
    isUsingMakey = true;
    updateButtonText();
  });
  
  // MIDI.
  if (navigator.requestMIDIAccess) {
    midiNotSupported.hidden = true;
    radioMidiInYes.parentElement.removeAttribute('disabled');
    radioMidiOutYes.parentElement.removeAttribute('disabled');
    navigator.requestMIDIAccess()
      .then(
          (midi) => player.midiReady(midi),
          (err) => console.log('Something went wrong', err));
  } else {
    midiNotSupported.hidden = false;
    radioMidiInYes.parentElement.setAttribute('disabled', true);
    radioMidiOutYes.parentElement.setAttribute('disabled', true);
  }

  document.addEventListener('keyup', onKeyUp);

  // boton de play
  const note = genie.nextFromKeyWhitelist(0, keyWhitelist, TEMPERATURE);
  genie.resetState();
}

// Eventos de los botones
function doTouchStart(event) {
  event.preventDefault();
  mouseDownButton = event.target; 
  buttonDown(event.target.dataset.id, true);
}
function doTouchEnd(event) {
  event.preventDefault();
  if (mouseDownButton && mouseDownButton !== event.target) {
    buttonUp(mouseDownButton.dataset.id);
  }
  mouseDownButton = null;
  buttonUp(event.target.dataset.id);
}
function doTouchMove(event, down) {
  // si el mouse no esta presionado, no hacer nada
  if (!mouseDownButton)
    return;
  
  if (down)
    buttonDown(event.target.dataset.id, true);
  else 
    buttonUp(event.target.dataset.id, true);
}

/*************************
 * ACCIONES DE LOS BOTONES
 ************************/
function buttonDown(button, fromKeyDown) {

  if (heldButtonToVisualData.has(button)) {
    return;
  }
  
  const el = document.getElementById(`btn${button}`);
  if (!el)
    return;
  el.setAttribute('active', true);
  
  const note = genie.nextFromKeyWhitelist(BUTTON_MAPPING[button], keyWhitelist, TEMPERATURE);
  const pitch = CONSTANTS.LOWEST_PIANO_KEY_MIDI_NOTE + note;

  // Hear it.
  player.playNoteDown(pitch, button);
  
  // See it.
  const rect = piano.highlightNote(note, button);
  
  if (!rect) {
    debugger;
  }
  // Float it.
  const noteToPaint = painter.addNote(button, rect.getAttribute('x'), rect.getAttribute('width'));
  heldButtonToVisualData.set(button, {rect:rect, note:note, noteToPaint:noteToPaint});
}

function buttonUp(button) {
  const el = document.getElementById(`btn${button}`);
  if (!el)
    return;
  el.removeAttribute('active');
  
  const thing = heldButtonToVisualData.get(button);
  if (thing) {
    // Don't see it.
    piano.clearNote(thing.rect);
    
    // Stop holding it down.
    painter.stopNote(thing.noteToPaint);
    
    // Maybe stop hearing it.
    const pitch = CONSTANTS.LOWEST_PIANO_KEY_MIDI_NOTE + thing.note;
    if (!sustaining) {
      player.playNoteUp(pitch, button);
    } else {
      sustainingNotes.push(CONSTANTS.LOWEST_PIANO_KEY_MIDI_NOTE + thing.note);
    }
  }
  heldButtonToVisualData.delete(button);
}

/*************************
 * EVENTOS
 ************************/
function onKeyDown(event) {
  // los botones de play y reset no deben ser activados por el teclado
  if (event.repeat) {
    return;
  }
  if (event.key === ' ') {  // sustain pedal
    sustaining = true;
  } else if (event.key === '0' || event.key === 'r') {
    console.log('🧞‍♀️ resetting!');
    genie.resetState();
  } else {
    const button = getButtonFromKeyCode(event.key);
    if (button != null) {
      buttonDown(button, true);
    }
  }
}

function onKeyUp(event) {
  if (event.key === ' ') {  // sustain pedal
    sustaining = false;
    
    // parar todas las notas que estan siendo sostenidas
    sustainingNotes.forEach((note) => player.playNoteUp(note, -1));
    sustainingNotes = [];
  } else {
    const button = getButtonFromKeyCode(event.key);
    if (button != null) {
      buttonUp(button);
    }
  }
}

function onWindowResize() {
  OCTAVES = window.innerWidth > 700 ? 7 : 3;
  const bonusNotes = OCTAVES > 6 ? 4 : 0;  // Comienza en La y termina en Do
  const totalNotes = CONSTANTS.NOTES_PER_OCTAVE * OCTAVES + bonusNotes; 
  const totalWhiteNotes = CONSTANTS.WHITE_NOTES_PER_OCTAVE * OCTAVES + (bonusNotes - 1); 
  keyWhitelist = Array(totalNotes).fill().map((x,i) => {  
    if (OCTAVES > 6) return i;
    // comienza 3 semitonos arriba en pantallas pequeñas
    return i + 3 + CONSTANTS.NOTES_PER_OCTAVE;
  });
  
  piano.resize(totalWhiteNotes);
  painter.resize(piano.config.whiteNoteHeight);
  piano.draw();
}

/*************************
 * UTILIDADES Y CONFIGURACION
 ************************/
function getButtonFromKeyCode(key) {
  // 1 - 8
  if (key >= '1' && key <= String(NUM_BUTTONS)) {
    return parseInt(key) - 1;
  } 
  
  const index = isUsingMakey ? BUTTONS_MAKEY.indexOf(key) : BUTTONS_DEVICE.indexOf(key);
  return index !== -1 ? index : null;
}

function getTemperature() {
  const hash = parseFloat(parseHashParameters()['temperature']) || 0.25;
  const newTemp = Math.min(1, hash);
  console.log('🧞‍♀️ temperature = ', newTemp);
  return newTemp;
}

function parseHashParameters() {
  const hash = window.location.hash.substring(1);
  const params = {}
  hash.split('&').map(hk => {
    let temp = hk.split('=');
    params[temp[0]] = temp[1]
  });
  return params;
}

function updateButtonText() {
  const btns = document.querySelectorAll('.controls button.color');
  for (let i = 0; i < btns.length; i++) {
    btns[i].innerHTML = isUsingMakey ? 
        `<span>${BUTTONS_MAKEY_DISPLAY[i]}</span>` : 
        `<span>${i + 1}</span><br><span>${BUTTONS_DEVICE[i]}</span>`;
  }
}