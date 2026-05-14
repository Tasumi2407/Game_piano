const piano = document.getElementById('piano');
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const octaves = [2, 3, 4, 5, 6];

const keyMap = {
    z: 'C2', s: 'C#2', x: 'D2', d: 'D#2', c: 'E2', v: 'F2', g: 'F#2',
    b: 'G2', h: 'G#2', n: 'A2', j: 'A#2', m: 'B2', q: 'C3', 2: 'C#3',
    w: 'D3', 3: 'D#3', e: 'E3', r: 'F3', 5: 'F#3', t: 'G3', 6: 'G#3',
    y: 'A3', 7: 'A#3', u: 'B3', i: 'C4', 9: 'C#4', o: 'D4', 0: 'D#4',
    p: 'E4'
};

const noteToKeyMap = {};
const activeNotes = new Set();

for (const [key, note] of Object.entries(keyMap)) {
    noteToKeyMap[note] = key;
}

if (piano) {
    octaves.forEach((octave) => {
        notes.forEach((note) => {
            const key = document.createElement('div');
            const noteName = `${note}${octave}`;

            key.classList.add('key', note.includes('#') ? 'black' : 'white');
            key.setAttribute('data-note', noteName);

            const keyLabel = document.createElement('span');
            keyLabel.classList.add('key-label');
            keyLabel.innerHTML = `${noteName} <span class="keyboard">${noteToKeyMap[noteName] ? `(${noteToKeyMap[noteName]})` : ''}</span>`;
            key.appendChild(keyLabel);

            piano.appendChild(key);
        });
    });
}

const sampler = new Tone.Sampler({
    urls: {
        C1: 'C1.mp3',
        C2: 'C2.mp3',
        C3: 'C3.mp3',
        C4: 'C4.mp3',
        C5: 'C5.mp3',
        C6: 'C6.mp3',
        C7: 'C7.mp3',
        'D#1': 'Ds1.mp3',
        'D#2': 'Ds2.mp3',
        'D#3': 'Ds3.mp3',
        'D#4': 'Ds4.mp3',
        'D#5': 'Ds5.mp3',
        'D#6': 'Ds6.mp3',
        'D#7': 'Ds7.mp3',
        'F#1': 'Fs1.mp3',
        'F#2': 'Fs2.mp3',
        'F#3': 'Fs3.mp3',
        'F#4': 'Fs4.mp3',
        'F#5': 'Fs5.mp3',
        'F#6': 'Fs6.mp3',
        'F#7': 'Fs7.mp3',
        A1: 'A1.mp3',
        A2: 'A2.mp3',
        A3: 'A3.mp3',
        A4: 'A4.mp3',
        A5: 'A5.mp3',
        A6: 'A6.mp3',
        A7: 'A7.mp3'
    },
    baseUrl: 'assets/samples/',
    release: 1,
    attack: 0.01
}).toDestination();

function getKeyElement(note) {
    return document.querySelector(`[data-note="${note}"]`);
}

function highlightNote(note) {
    const keyElement = getKeyElement(note);

    if (keyElement) {
        keyElement.classList.add('active');
    }
}

function unhighlightNote(note) {
    const keyElement = getKeyElement(note);

    if (keyElement) {
        keyElement.classList.remove('active');
    }
}

function emitPianoEvent(type, detail) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
}

async function ensureAudioStarted() {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }
}

function playNote(note, velocity = 1, source = 'screen') {
    ensureAudioStarted().then(() => {
        sampler.triggerAttackRelease(note, '8n', undefined, velocity);
        highlightNote(note);
        setTimeout(() => unhighlightNote(note), 150);
        emitPianoEvent('piano-note-on', { note, velocity, source });
    });
}

function startNote(note, velocity = 1, source = 'midi') {
    if (activeNotes.has(note)) {
        return;
    }

    activeNotes.add(note);
    ensureAudioStarted().then(() => {
        sampler.triggerAttack(note, undefined, velocity);
        highlightNote(note);
        emitPianoEvent('piano-note-on', { note, velocity, source });
    });
}

function stopNote(note, source = 'midi') {
    if (!activeNotes.has(note)) {
        return;
    }

    activeNotes.delete(note);
    sampler.triggerRelease(note);
    unhighlightNote(note);
    emitPianoEvent('piano-note-off', { note, source });
}

function midiNoteToName(noteNumber) {
    const noteName = notes[noteNumber % 12];
    const octave = Math.floor(noteNumber / 12) - 1;

    return `${noteName}${octave}`;
}

function handleMIDIMessage(message) {
    const [command, noteNumber, velocityValue] = message.data;
    const status = command & 0xf0;
    const note = midiNoteToName(noteNumber);
    const velocity = velocityValue / 127;

    console.log('MIDI:', message.data, note);

    if (status === 0x90 && velocityValue > 0) {
        startNote(note, velocity, 'midi');
        return;
    }

    if (status === 0x80 || (status === 0x90 && velocityValue === 0)) {
        stopNote(note, 'midi');
    }
}

function connectMIDIInput(input) {
    input.onmidimessage = handleMIDIMessage;
    console.log(`MIDI conectado: ${input.name || 'teclado sin nombre'}`);
}

async function enableMIDI() {
    if (!navigator.requestMIDIAccess) {
        console.warn('Este navegador no soporta Web MIDI. Prueba con Chrome o Edge.');
        return;
    }

    try {
        const access = await navigator.requestMIDIAccess();

        for (const input of access.inputs.values()) {
            connectMIDIInput(input);
        }

        access.onstatechange = (event) => {
            if (event.port.type === 'input' && event.port.state === 'connected') {
                connectMIDIInput(event.port);
            }
        };
    } catch (error) {
        console.warn('No se pudo activar MIDI:', error);
    }
}

document.querySelectorAll('.key').forEach((key) => {
    key.addEventListener('click', () => {
        const note = key.getAttribute('data-note');
        playNote(note, 1, 'screen');
    });
});

document.addEventListener('keydown', (event) => {
    const note = keyMap[event.key];

    if (note) {
        playNote(note, 1, 'keyboard');
    }
});

function toggleLabels() {
    const labels = document.querySelectorAll('.keyboard');

    labels.forEach((label) => {
        label.style.display = label.style.display === 'none' ? 'block' : 'none';
    });
}

const toggleLabelsButton = document.getElementById('toggleLabelsButton');

if (toggleLabelsButton) {
    toggleLabelsButton.addEventListener('click', toggleLabels);
}

window.PianoInput = {
    enableMIDI,
    playNote,
    startNote,
    stopNote,
    midiNoteToName,
    ensureAudioStarted
};

enableMIDI();
