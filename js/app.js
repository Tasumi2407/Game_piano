const piano = document.getElementById('piano');
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const octaves = [2, 3, 4, 5, 6];

octaves.forEach(octave => {
    notes.forEach(note => {
        const key = document.createElement('div');
        key.classList.add('key');
        if (note.includes('#')) {
            key.classList.add('black');
        } else {
            key.classList.add('white');
        }
        key.setAttribute('data-note', `${note}${octave}`);
        key.innerText = note;
        piano.appendChild(key);
    });
});

document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => {
        const note = key.getAttribute('data-note');
        const synth = new Tone.Synth().toDestination();
        synth.triggerAttackRelease(note, '8n');
    });
});

/*
// Cargar las muestras de piano
const sampler = new Tone.Sampler({
    urls: {
        "C1": "C1.mp3",
        "C2": "C2.mp3",
        "C3": "C3.mp3",
        "C4": "C4.mp3",
        "C5": "C5.mp3",
        "C6": "C6.mp3",
        "C7": "C7.mp3",
        "D#1": "Ds1.mp3",
        "D#2": "Ds2.mp3",
        "D#3": "Ds3.mp3",
        "D#4": "Ds4.mp3",
        "D#5": "Ds5.mp3",
        "D#6": "Ds6.mp3",
        "D#7": "Ds7.mp3",
        "F#1": "Fs1.mp3",
        "F#2": "Fs2.mp3",
        "F#3": "Fs3.mp3",
        "F#4": "Fs4.mp3",
        "F#5": "Fs5.mp3",
        "F#6": "Fs6.mp3",
        "F#7": "Fs7.mp3",
        "A1": "A1.mp3",
        "A2": "A2.mp3",
        "A3": "A3.mp3",
        "A4": "A4.mp3",
        "A5": "A5.mp3",
        "A6": "A6.mp3",
        "A7": "A7.mp3",
    },
    baseUrl: "https://tonejs.github.io/audio/salamander/"
}).toDestination();

*/



// Mapear las teclas del teclado a las notas
const keyMap = {
    'z': 'C2', 's': 'C#2', 'x': 'D2', 'd': 'D#2', 'c': 'E2', 'v': 'F2', 'g': 'F#2', 
    'b': 'G2', 'h': 'G#2', 'n': 'A2', 'j': 'A#2', 'm': 'B2', 'q': 'C3', '2': 'C#3', 
    'w': 'D3', '3': 'D#3', 'e': 'E3', 'r': 'F3', '5': 'F#3', 't': 'G3', '6': 'G#3', 
    'y': 'A3', '7': 'A#3', 'u': 'B3', 'i': 'C4', '9': 'C#4', 'o': 'D4', '0': 'D#4', 
    'p': 'E4'
};

document.addEventListener('keydown', (event) => {
    const note = keyMap[event.key];
    if (note) {
        const keyElement = [...document.querySelectorAll('.key')].find(key => key.getAttribute('data-note') === note);
        if (keyElement) {
            keyElement.click(); // Simula el clic en la tecla correspondiente
            keyElement.classList.add('active');
            setTimeout(() => keyElement.classList.remove('active'), 150); // Ajustar el tiempo de acuerdo a la duración del efecto deseado
        }
    }
});
