# MIDI y Entrada del Piano

El archivo `js/piano-app.js` centraliza todas las entradas musicales:

- Clic en el piano virtual.
- Teclado del computador.
- Teclado musical MIDI real.

## Flujo de una nota

1. El usuario toca una nota.
2. `piano-app.js` convierte la entrada a una nota tipo `C4`, `D#4`, `A5`.
3. Tone.js reproduce el sample del piano.
4. Se marca la tecla visualmente con `.active`.
5. Se emite un evento global para Phaser.

## Eventos disponibles

Nota presionada:

```js
window.addEventListener('piano-note-on', (event) => {
    const { note, velocity, source } = event.detail;
});
```

Nota soltada:

```js
window.addEventListener('piano-note-off', (event) => {
    const { note, source } = event.detail;
});
```

## Fuentes

El campo `source` puede ser:

- `midi`: teclado musical real.
- `keyboard`: teclado del computador.
- `screen`: clic directo en el piano virtual.

## Conversion MIDI

El teclado MIDI entrega numeros. Por ejemplo:

- `60` -> `C4`
- `61` -> `C#4`
- `62` -> `D4`

La funcion `midiNoteToName(noteNumber)` hace esa conversion.

## Nota importante

El navegador puede bloquear audio hasta que haya una interaccion del usuario. Por eso `piano-app.js` llama `Tone.start()` antes de tocar una nota.
