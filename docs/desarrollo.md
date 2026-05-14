# Guia de Desarrollo

## Objetivo del prototipo

El prototipo separa dos responsabilidades:

- El piano real vive en HTML/CSS y `js/piano-app.js`.
- El juego vive en Phaser dentro de `#game-container` y `js/game.js`.

Esto permite cambiar el juego sin romper el piano, y cambiar el piano sin reescribir Phaser.

## Pantalla actual

La pantalla esta organizada asi:

```text
header.game-header
main.game-shell
  section.stage-panel
    div#game-container   Phaser
  section.piano-panel
    div.piano-toolbar
    div#piano            Piano real
```

## Como el juego escucha notas

`js/game.js` no habla directamente con MIDI. Solo escucha eventos:

```js
window.addEventListener('piano-note-on', (event) => {
    const { note, source } = event.detail;
});
```

Eso mantiene el juego simple.

## Siguientes pasos sugeridos

1. Crear una lista de notas objetivo.
2. Mostrar la nota objetivo en la partitura.
3. Al tocar la nota correcta, crear un sprite en Phaser.
4. Mover el personaje hacia el sprite.
5. Al tocar una nota incorrecta, restar vida.
6. Cuando la vida llegue a cero, mostrar pantalla de derrota.
7. Cuando termine la secuencia, mostrar pantalla de victoria.

## Donde agregar el personaje

El personaje debe vivir en `js/game.js`, dentro de la escena Phaser.

Ejemplo conceptual:

```js
this.player = this.add.sprite(80, 360, 'player');
```

Luego, cuando haya un acierto:

```js
this.tweens.add({
    targets: this.player,
    x: nextSprite.x,
    y: nextSprite.y,
    duration: 400
});
```

## Donde cambiar el piano

El piano visual se cambia en:

```text
css/style.css
```

La cantidad de octavas se cambia en:

```text
js/piano-app.js
```

Busca:

```js
const octaves = [2, 3, 4, 5, 6];
```
