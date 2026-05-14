// Tamano interno del canvas de Phaser.
// Phaser escala este canvas para que quepa dentro de #game-container.
const GAME_WIDTH = 1120;
const GAME_HEIGHT = 480;

// Seguridad: el juego debe abrirse por http://127.0.0.1:4173.
// Si se abre como file://, Chrome bloquea los audios mp3.
if (window.location.protocol === 'file:') {
    const warning = document.getElementById('file-warning');

    if (warning) {
        warning.hidden = false;
    }

    throw new Error('Abre el juego desde http://127.0.0.1:4173, no como archivo file://.');
}

// Notas que pueden caer. Estas son los carriles del MVP.
// Si quieres cambiar las notas del juego, normalmente empiezas aqui.
const FALLING_NOTES = ['F2'];

// Tempo inicial. El jugador puede cambiarlo con los botones + y -.
const DEFAULT_BPM = 80;

// Limites para que el jugador no ponga un tempo imposible o demasiado lento.
const MIN_BPM = 40;
const MAX_BPM = 180;

// Cuantos BPM sube o baja cada vez que se presiona + o -.
const BPM_STEP = 20;

// Velocidad base de las notas en pixeles por segundo.
// En setTempo() se escala segun el BPM actual.
const BASE_NOTE_SPEED = 180;

// Margen de acierto alrededor de la linea de golpe.
// Mas grande = mas facil. Mas pequeno = mas dificil.
const HIT_WINDOW = 44;

class PianoGameScene extends Phaser.Scene {
    /**
     * Constructor de la escena.
     * Aqui solo se preparan variables; Phaser todavia no ha dibujado nada.
     */
    constructor() {
        // Nombre interno de esta escena en Phaser.
        super('PianoGameScene');

        // Lista de carriles visuales. Cada carril representa una nota.
        this.lanes = [];

        // Lista de notas que estan cayendo en este momento.
        this.fallingNotes = [];

        // Puntaje actual.
        this.score = 0;

        // Vida actual del jugador.
        this.health = 5;

        // Tempo actual del juego.
        this.bpm = DEFAULT_BPM;

        // Velocidad actual de caida, calculada desde el BPM.
        this.noteSpeed = BASE_NOTE_SPEED;

        // true = juego pausado, false = juego corriendo.
        this.isPaused = false;

        // Timer de Phaser que crea notas cada cierto tiempo.
        this.spawnTimer = null;

        // Referencias a textos del HUD para poder actualizarlos.
        this.scoreText = null;
        this.healthText = null;
        this.feedbackText = null;
        this.lastInputText = null;
        this.bpmText = null;
        this.pauseButtonText = null;

        // Coordenada Y de la linea donde el jugador debe tocar.
        this.hitLineY = 390;

        // Coordenada Y donde nacen las notas.
        this.spawnY = 78;
    }

    /**
     * create() es llamado una vez por Phaser al iniciar la escena.
     * Aqui se dibuja el escenario, se conectan eventos y empieza el spawner.
     */
    create() {
        this.drawStage();
        this.drawLanes();
        this.drawHud();
        this.drawControls();
        this.bindPianoInput();
        this.setTempo(DEFAULT_BPM);
        this.startSpawner();
    }

    /**
     * update() es llamado automaticamente muchas veces por segundo.
     * delta trae el tiempo desde el ultimo frame, en milisegundos.
     */
    update(_, delta) {
        // Si esta pausado, no movemos notas.
        if (this.isPaused) {
            return;
        }

        // Si no esta pausado, seguimos actualizando la caida.
        this.updateFallingNotes(delta);
    }

    /**
     * Dibuja el fondo general del area de juego.
     */
    drawStage() {
        // Fondo gris principal.
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xd8d8d8).setOrigin(0);

        // Franja azul superior.
        this.add.rectangle(0, 0, GAME_WIDTH, 64, 0xc7e3f1).setOrigin(0);

        // Panel claro donde caen las notas.
        this.add.rectangle(36, 82, GAME_WIDTH - 72, GAME_HEIGHT - 110, 0xebebeb).setOrigin(0).setStrokeStyle(2, 0xb4b4b4);
    }

    /**
     * Dibuja los carriles. Cada carril corresponde a una nota de FALLING_NOTES.
     */
    drawLanes() {
        // Ancho visual de cada carril.
        const laneWidth = 170;

        // Separacion entre carriles.
        const laneGap = 28;

        // Ancho total de todos los carriles juntos.
        const totalWidth = FALLING_NOTES.length * laneWidth + (FALLING_NOTES.length - 1) * laneGap;

        // X inicial para centrar los carriles.
        const startX = (GAME_WIDTH - totalWidth) / 2;

        FALLING_NOTES.forEach((note, index) => {
            // X del carril actual.
            const x = startX + index * (laneWidth + laneGap);

            // Centro horizontal del carril. Aqui cae la nota.
            const centerX = x + laneWidth / 2;

            // Rectangulo del carril.
            this.add.rectangle(x, 100, laneWidth, 302, 0xf7f7f7).setOrigin(0).setStrokeStyle(2, 0xc0c0c0);

            // Texto con el nombre de la nota del carril.
            this.add.text(centerX, 112, note, {
                color: '#1f1f1f',
                fontFamily: 'Arial',
                fontSize: '24px',
                fontStyle: 'bold'
            }).setOrigin(0.5, 0);

            // Guardamos datos del carril para usarlo al generar notas.
            this.lanes.push({ note, x, centerX, width: laneWidth });
        });

        // Linea de golpe: el jugador debe tocar cuando la nota esta cerca de aqui.
        this.add.rectangle(GAME_WIDTH / 2, this.hitLineY, totalWidth + 42, 6, 0x1d293f).setOrigin(0.5);

        // Etiqueta visual de la linea.
        this.add.text(56, this.hitLineY - 16, 'Linea de golpe', {
            color: '#1d293f',
            fontFamily: 'Arial',
            fontSize: '16px',
            fontStyle: 'bold'
        });
    }

    /**
     * Dibuja textos de score, vida y feedback.
     */
    drawHud() {
        // Titulo de la mecanica actual.
        this.add.text(56, 20, 'Notas cayendo', {
            color: '#202020',
            fontFamily: 'Arial',
            fontSize: '26px',
            fontStyle: 'bold'
        });

        // Texto del puntaje.
        this.scoreText = this.add.text(GAME_WIDTH - 280, 18, 'Score: 0', {
            color: '#202020',
            fontFamily: 'Arial',
            fontSize: '22px',
            fontStyle: 'bold'
        });

        // Texto de vida.
        this.healthText = this.add.text(GAME_WIDTH - 130, 18, `Vida: ${this.health}`, {
            color: '#202020',
            fontFamily: 'Arial',
            fontSize: '22px',
            fontStyle: 'bold'
        });

        // Mensajes de acierto/fallo.
        this.feedbackText = this.add.text(56, 424, 'Toca la nota cuando llegue a la linea.', {
            color: '#4b4b4b',
            fontFamily: 'Arial',
            fontSize: '18px'
        });

        // Muestra la ultima nota recibida desde MIDI/piano/teclado.
        this.lastInputText = this.add.text(GAME_WIDTH - 330, 424, 'Ultima nota: -', {
            color: '#4b4b4b',
            fontFamily: 'Arial',
            fontSize: '18px'
        });
    }

    /**
     * Dibuja controles interactivos dentro del canvas:
     * pausa/play y botones para cambiar BPM.
     */
    drawControls() {
        // Boton de pausa/play.
        this.pauseButtonText = this.makeButton(420, 30, 'Pausa', () => this.togglePause());

        // Boton para bajar tempo.
        this.makeButton(536, 30, '- BPM', () => this.setTempo(this.bpm - BPM_STEP));

        // Texto del tempo actual.
        this.bpmText = this.add.text(626, 20, '', {
            color: '#202020',
            fontFamily: 'Arial',
            fontSize: '20px',
            fontStyle: 'bold'
        });

        // Boton para subir tempo.
        this.makeButton(736, 30, '+ BPM', () => this.setTempo(this.bpm + BPM_STEP));
    }

    /**
     * Crea un boton simple usando texto de Phaser.
     * x, y: posicion del boton.
     * label: texto visible.
     * onClick: funcion que se ejecuta al hacer clic.
     */
    makeButton(x, y, label, onClick) {
        // Creamos texto con fondo, padding y cursor.
        const button = this.add.text(x, y, label, {
            color: '#ffffff',
            backgroundColor: '#1d293f',
            fontFamily: 'Arial',
            fontSize: '16px',
            fontStyle: 'bold',
            padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // Ejecuta la funcion cuando el jugador hace clic.
        button.on('pointerdown', onClick);

        // Pequeno feedback visual al pasar el mouse.
        button.on('pointerover', () => button.setStyle({ backgroundColor: '#2f4367' }));
        button.on('pointerout', () => button.setStyle({ backgroundColor: '#1d293f' }));

        return button;
    }

    /**
     * Conecta Phaser con el piano.
     * piano-app.js ya detecta MIDI y emite eventos globales.
     */
    bindPianoInput() {
        // Evento cuando se toca una nota.
        window.addEventListener('piano-note-on', (event) => {
            const { note, source } = event.detail;
            this.handleNoteOn(note, source);
        });

        // Evento cuando se suelta una nota.
        window.addEventListener('piano-note-off', (event) => {
            this.lastInputText.setText(`Ultima nota: ${event.detail.note} (soltada)`);
        });
    }

    /**
     * Inicia el sistema que genera notas cada cierto tiempo.
     */
    startSpawner() {
        // Crea la primera nota de inmediato para no iniciar vacio.
        this.spawnFallingNote();

        // Crea el timer repetitivo.
        this.restartSpawner();
    }

    /**
     * Reinicia el timer de generacion.
     * Esto se usa cuando cambia el BPM.
     */
    restartSpawner() {
        // Si ya habia un timer, lo quitamos para crear uno con nuevo delay.
        if (this.spawnTimer) {
            this.spawnTimer.remove(false);
        }

        // El delay depende del BPM actual.
        const spawnInterval = Math.round(60000 / this.bpm);

        // Timer de Phaser que llama spawnFallingNote en loop.
        this.spawnTimer = this.time.addEvent({
            delay: spawnInterval,
            callback: () => {
                if (!this.isPaused) {
                    this.spawnFallingNote();
                }
            },
            loop: true
        });
    }

    /**
     * Cambia el tempo del juego.
     * Tambien ajusta la velocidad de caida para que el juego se sienta mas rapido.
     */
    setTempo(nextBpm) {
        // Limita el BPM entre MIN_BPM y MAX_BPM.
        this.bpm = Phaser.Math.Clamp(nextBpm, MIN_BPM, MAX_BPM);

        // Escala la velocidad de caida segun el BPM.
        this.noteSpeed = BASE_NOTE_SPEED * (this.bpm / DEFAULT_BPM);

        // Actualiza el texto visible del tempo.
        if (this.bpmText) {
            this.bpmText.setText(`Tempo: ${this.bpm} BPM`);
        }

        // Si el timer ya existe, lo recrea con el nuevo intervalo.
        if (this.spawnTimer) {
            this.restartSpawner();
        }
    }

    /**
     * Alterna entre pausado y corriendo.
     */
    togglePause() {
        // Invierte el estado.
        this.isPaused = !this.isPaused;

        // Cambia el texto del boton.
        this.pauseButtonText.setText(this.isPaused ? 'Play' : 'Pausa');

        // Muestra feedback.
        this.feedbackText.setText(this.isPaused ? 'Juego pausado.' : 'Juego corriendo.');
        this.feedbackText.setColor('#4b4b4b');
    }

    /**
     * Crea una nota nueva en un carril aleatorio.
     */
    spawnFallingNote() {
        // Escoge un carril al azar de los carriles existentes.
        const lane = Phaser.Utils.Array.GetRandom(this.lanes);

        // Circulo visual de la nota.
        const circle = this.add.circle(lane.centerX, this.spawnY, 28, 0x222222).setStrokeStyle(4, 0xffffff);

        // Texto dentro del circulo, por ejemplo F2.
        const label = this.add.text(lane.centerX, this.spawnY, lane.note, {
            color: '#ffffff',
            fontFamily: 'Arial',
            fontSize: '18px',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Guardamos la nota en el arreglo de notas activas.
        this.fallingNotes.push({
            note: lane.note,
            lane,
            circle,
            label,
            hit: false,
            missed: false
        });
    }

    /**
     * Mueve las notas hacia abajo y detecta si alguna fallo.
     */
    updateFallingNotes(delta) {
        // Convierte pixeles/segundo a pixeles en este frame.
        const distance = this.noteSpeed * (delta / 1000);

        this.fallingNotes.forEach((fallingNote) => {
            // Mueve el circulo.
            fallingNote.circle.y += distance;

            // Mueve el texto junto con el circulo.
            fallingNote.label.y += distance;

            // Si paso la linea de golpe y no habia sido marcada, registra fallo.
            if (!fallingNote.missed && fallingNote.circle.y > this.hitLineY + HIT_WINDOW) {
                fallingNote.missed = true;
                this.registerMiss(fallingNote);
            }
        });

        // Elimina notas que ya no deben seguir en la lista.
        this.fallingNotes = this.fallingNotes.filter((fallingNote) => {
            // Mantiene la nota si sigue visible y no fue acertada.
            if (fallingNote.circle.y < GAME_HEIGHT + 60 && !fallingNote.hit) {
                return true;
            }

            // Si ya salio o fue acertada, destruye sus objetos graficos.
            this.destroyFallingNote(fallingNote);
            return false;
        });
    }

    /**
     * Se ejecuta cada vez que el usuario toca una nota.
     */
    handleNoteOn(note, source) {
        // Muestra la ultima nota recibida.
        this.lastInputText.setText(`Ultima nota: ${note} (${source})`);

        // Busca una nota que pueda ser acertada en este momento.
        const candidate = this.findHittableNote(note);

        // Si no hay nota correcta cerca de la linea, no suma puntos.
        if (!candidate) {
            this.feedbackText.setText(`${note} no esta en zona.`);
            this.feedbackText.setColor('#8a1f1f');
            return;
        }

        // Si si encontro una nota valida, registra acierto.
        this.registerHit(candidate);
    }

    /**
     * Busca una nota que coincida con la nota tocada y este cerca de la linea.
     */
    findHittableNote(note) {
        return this.fallingNotes
            // Debe ser la misma nota y no estar ya marcada.
            .filter((fallingNote) => fallingNote.note === note && !fallingNote.hit && !fallingNote.missed)
            // Debe estar dentro del margen de acierto.
            .filter((fallingNote) => Math.abs(fallingNote.circle.y - this.hitLineY) <= HIT_WINDOW)
            // Si hay varias, agarra la mas cercana a la linea.
            .sort((a, b) => Math.abs(a.circle.y - this.hitLineY) - Math.abs(b.circle.y - this.hitLineY))[0];
    }

    /**
     * Registra un acierto.
     */
    registerHit(fallingNote) {
        // Marca la nota como acertada.
        fallingNote.hit = true;

        // Suma puntos.
        this.score += 100;

        // Actualiza el HUD.
        this.scoreText.setText(`Score: ${this.score}`);
        this.feedbackText.setText(`Bien: ${fallingNote.note}`);
        this.feedbackText.setColor('#0c6b36');

        // Animacion corta para que la nota desaparezca.
        this.tweens.add({
            targets: [fallingNote.circle, fallingNote.label],
            alpha: 0,
            scale: 1.5,
            duration: 160,
            onComplete: () => this.destroyFallingNote(fallingNote)
        });
    }

    /**
     * Registra un fallo cuando la nota pasa la linea.
     */
    registerMiss(fallingNote) {
        // Resta vida sin bajar de cero.
        this.health = Math.max(0, this.health - 1);

        // Actualiza el HUD.
        this.healthText.setText(`Vida: ${this.health}`);
        this.feedbackText.setText(`Fallaste: ${fallingNote.note}`);
        this.feedbackText.setColor('#8a1f1f');

        // Cambia el color para mostrar que esa nota ya fallo.
        fallingNote.circle.setFillStyle(0x8a1f1f);
    }

    /**
     * Destruye los objetos visuales de una nota.
     */
    destroyFallingNote(fallingNote) {
        // Evita errores si Phaser ya destruyo el circulo.
        if (fallingNote.circle && fallingNote.circle.active) {
            fallingNote.circle.destroy();
        }

        // Evita errores si Phaser ya destruyo el texto.
        if (fallingNote.label && fallingNote.label.active) {
            fallingNote.label.destroy();
        }
    }
}

// Configuracion global de Phaser.
const config = {
    // Phaser.AUTO deja que Phaser elija WebGL o Canvas segun el navegador.
    type: Phaser.AUTO,

    // Tamano interno del juego.
    width: GAME_WIDTH,
    height: GAME_HEIGHT,

    // Color de fondo si no hay nada dibujado.
    backgroundColor: '#3f3f3f',

    // El canvas se mete dentro del div #game-container.
    parent: 'game-container',

    // Escala el juego para que se adapte al espacio disponible.
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    // Escena principal.
    scene: PianoGameScene
};

// Aqui arranca Phaser.
new Phaser.Game(config);
