# SPEC 08 — El juego Bloque Buster

> **Estado:** Implemented
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-09-04
> **Objetivo:** Portar el Arkanoid de `references/started-games/04-arkanoid/` a un motor TypeScript propio y enchufarlo al cartucho `bloque-buster`, de forma que BLOQUE BUSTER sea el tercer juego de verdad jugable del Vault.

---

## 1 — Por qué existe este spec

SPEC 05 diseñó la frontera entre motor y React, y SPEC 07 demostró que la receta sirve para un juego
que no se parece al primero. Este es el tercer y último juego que espera en `references/started-games/`:
al terminarlo, la carpeta queda vacía y el Vault tendrá tres cartuchos reales de ocho.

La receta ya está probada, así que lo interesante de este port es por dónde aprieta el contrato, y son
tres sitios que ni ASTEROIDES ni CAÍDA tocaron:

- **Es el primer original con assets binarios.** `game.js` dibuja paleta, pelota, bloques y explosiones
  desde `assets/spritesheet-breakout.png`, y suena con dos `.mp3`. El spritesheet no entra —el port es
  vectorial— pero los dos efectos sí: BLOQUE BUSTER es el primer cartucho del Vault que suena. La
  sección 6 explica las dos decisiones.
- **Es el primer juego con ratón.** El original mueve la paleta con `mousemove` sobre el canvas.
  El canvas del Vault va escalado dentro de `.crt-screen`, así que el motor tiene que traducir las
  coordenadas del puntero, y esa es la primera vez que un motor escucha a su propio canvas y no solo a
  `window`.
- **Es el primer original con estado de victoria.** `game.js` tiene `gameState = 'win'` y un cartel de
  «¡Completaste el juego!» al limpiar el nivel 5. `PlayerShell` solo conoce `over`, y el techo real de
  puntuación del original son 2 080 puntos, que en un leaderboard significa que todos los expertos
  empatan. Este spec convierte el juego en un bucle sin fin: tras el nivel 5 vuelve el patrón 1 con la
  velocidad siguiendo su progresión, y la partida solo termina sin vidas.

Del catálogo no hay nada que decidir. La fila `bloque-buster` existe en `public.games` desde la semilla
de SPEC 06 con `cat = 'ARCADE'`, `cover = 'cover-bricks'`, `color = 'cyan'` y `sort_order = 0`, y su copy
—«rebota la pelota y destruye muros de neón», «cada nivel reorganiza la grilla en patrones imposibles»—
describe exactamente los cinco patrones de `levels.js`. Comprobado por MCP antes de escribir esto: la fila
está y tiene **cero marcas** en `public.scores`.

Que su `sort_order` sea `0` tiene un efecto de escaparate: es la primera ficha de `/games` y la primera
tarjeta del home. Hasta hoy la puerta de entrada al catálogo era un reproductor falso.

---

## 2 — Alcance

**Dentro:**

- El motor portado a TypeScript en `app/lib/engines/bloque-buster/`, sin globales de módulo, sin ninguna
  referencia a React y sin tocar ningún nodo que no haya creado él.
- **Los dos efectos de sonido del original**, `ball-bounce.mp3` y `break-sound.mp3`, copiados a
  `public/games/bloque-buster/` y reproducidos desde `app/lib/engines/bloque-buster/sound.ts` en los
  mismos cinco puntos que `game.js`: los tres muros, la paleta y un bloque al romperse.
- El componente cliente `app/components/bloque-buster-game.tsx`, que monta el `<canvas>`, traduce los
  avisos del motor a estado de React y se lo pasa a `<PlayerShell>`.
- Una línea de `dynamic()` y una entrada nueva en `app/components/game-registry.ts`.
- Una migración que baja `public.games.max_score` de `bloque-buster` a `100000`.
- `CLAUDE.md`: la afirmación de cuántos cartuchos juegan de verdad, la lista de motores portados y la
  nota de que este es el único cartucho con sonido.

**Fuera de alcance (para specs futuros):**

- **El spritesheet.** `assets/spritesheet-breakout.png` no se copia a `public/`: el port es vectorial con
  los tokens de `:root`. La decisión y su motivo están en la sección 6.
- **El sonido como feature de plataforma.** Se portan los dos efectos de este juego y nada más: no hay
  silenciado persistido, ni control en el HUD, ni sonido en ASTEROIDES ni en CAÍDA. Eso sigue siendo un
  spec propio para los tres cartuchos a la vez.
- **El estado de victoria del original.** Con el bucle sin fin no existe: la partida acaba sin vidas.
- **El selector de nivel del overlay de pausa.** Los cinco botones dibujados en el canvas y su
  `canvas.addEventListener('click', …)` desaparecen. Saltar de nivel es un modo de depuración, no una
  mecánica.
- **Power-ups, paletas de anchura variable, bloques de varios golpes y bloques irrompibles.** El original
  no los tiene y aquí no se inventan.
- **Patrones de nivel nuevos.** Se portan los cinco de `levels.js` y se reciclan en bucle; un sexto
  patrón es otro spec.
- **Controles táctiles.** Igual que ASTEROIDES y CAÍDA: con puntero grueso se avisa de que se necesita
  teclado. Que el juego tenga ratón no lo hace jugable con el dedo.
- **`app/globals.css`.** No se toca: el mundo del motor es 800×600, que es la proporción que
  `.crt-screen` ya tiene, así que `.game-canvas` de SPEC 05 sirve tal cual.
- **`app/components/player-shell.tsx` y `app/components/game-player.tsx`.** El shell no recibe props
  nuevas y el despachador no cambia de forma; solo el registro que consulta.
- **`app/lib/games.ts`, `app/lib/scores.ts`, `app/lib/catalogue.ts`, `app/lib/leaderboard.ts`,
  `app/actions/scores.ts` y `app/lib/rate-limit.ts`.** Un cartucho nuevo no toca ninguno: el guardado, la
  validación y el cupo por IP son los de SPEC 06.
- **Las siete rutas.** Ninguna página cambia.
- **El copy, `cat`, `cover`, `color`, `sort_order` y `plays` de la fila `bloque-buster`.** La ficha ya
  describe este juego. `plays` sigue siendo el `'12.4K'` inventado de la semilla.
- **Una portada nueva.** `cover-bricks` ya existe y ya es de este juego.
- **Sembrar puntuaciones falsas** de `bloque-buster`. La primera marca real llega jugando.
- **La etiqueta `TECLADO / TÁCTIL`** de la ficha de detalle, que sigue siendo un literal compartido por
  los ocho cartuchos desde el port de SPEC 01.
- **Realtime y paginación del Salón de la Fama**, que siguen fuera desde SPEC 06.
- **Tests automatizados.** El proyecto sigue sin runner desde SPEC 01.

---

## 3 — Modelo de datos

### 3.1 — La fila del catálogo

`bloque-buster` ya existe en `public.games`. Lo único que cambia es el techo de puntuación:

```sql
-- supabase/migrations/<timestamp>_set_bloque_buster_max_score.sql
update public.games set max_score = 100000 where id = 'bloque-buster';
```

`max_score` es el techo que `app/actions/scores.ts` lee **en vivo** antes de insertar —un `select` propio,
no el catálogo cacheado—, así que el cambio surte efecto sin revalidar la etiqueta `games`. No hay cambio
de esquema: `app/lib/supabase/types.ts` se queda idéntico.

El número sale de contar bloques. Los cinco patrones de `levels.js` tienen 60, 40, 30, 39 y 39 bloques,
o sea 208 por vuelta completa, y cada bloque vale 10 puntos fijos: **2 080 puntos por vuelta**. Un techo
de 100 000 son 48 vueltas, que con la velocidad capada y tres vidas nadie va a hacer, y a la vez cierra
la puerta a una marca inventada de siete cifras.

Nada más de la fila se toca. Para que quede por escrito, este es el estado confirmado hoy:

| columna      | valor                                                             |
| ------------ | ----------------------------------------------------------------- |
| `id`         | `bloque-buster`                                                   |
| `title`      | `BLOQUE BUSTER`                                                   |
| `cat`        | `ARCADE`                                                          |
| `cover`      | `cover-bricks`                                                    |
| `color`      | `cyan`                                                            |
| `sort_order` | `0`                                                               |
| `plays`      | `12.4K`                                                           |
| `max_score`  | `10000000` → **`100000`**                                         |
| marcas       | ninguna: `public.scores` no tiene ninguna fila de `bloque-buster` |

### 3.2 — `app/lib/engines/bloque-buster/constants.ts`

Todos los números del juego, copiados de `game.js` y de `levels.js`, más la paleta. El original no tiene
constantes de tiempo en milisegundos salvo la explosión, que aquí va en segundos porque el bucle del motor
trabaja en segundos desde SPEC 05.

```ts
export const WORLD = { w: 800, h: 600 } as const;

/** Tope de dt, en segundos. Es más ceñido que el 0.05 de los otros dos
 *  motores: a ×2 la pelota va a 721 px/s, y 721 × 0.02 = 14.4 px por tick,
 *  menos que sus propios 16 px de diámetro. Con 0.05 saltaría 36 px y podría
 *  atravesar una fila de bloques al volver de otra pestaña. */
export const MAX_DT = 0.02;

export const PADDLE = {
    w: 81, // el `w` del objeto de game.js, no los 162 px del sprite
    h: 14,
    y: 560,
    speed: 400, // px/s con ← →
} as const;

export const BALL = {
    size: 16,
    baseVx: 200, // BASE_BALL_VX
    baseVy: -300, // BASE_BALL_VY
    speedStep: 1.1, // ×1.1 por nivel; los 1.00/1.10/1.21/1.33/1.46 de levels.js
    maxMultiplier: 2, // techo, alcanzado en el nivel 9
    maxBounceAngle: (60 * Math.PI) / 180, // rebote en el borde de la paleta
    paddleTolerance: 8, // el margen de 8 px que game.js da bajo la paleta
} as const;

export const BLOCK = { cols: 10, rows: 6, w: 64, h: 24 } as const;
export const BLOCKS_ORIGIN = { x: 80, y: 80 } as const; // (800 − 10×64) / 2

export const RUN = { lives: 3, pointsPerBlock: 10 } as const;
export const EXPLOSION_DURATION = 0.15; // los 150 ms de EXPLOSION_DURATION

/** Los cinco patrones de levels.js, generados con los mismos bucles: parrilla,
 *  pirámide, tablero de ajedrez, filas con huecos, y marco con cruz. Cada
 *  entrada es { col, row, color }, y el motor los recicla con
 *  LEVELS[(level − 1) % LEVELS.length]. */
export const LEVELS: readonly BlockSpec[][] = /* … */;

/** Los siete nombres de color del original mapeados a los tokens de :root, uno
 *  por nombre y sin repetir ninguno. */
export const PALETTE = {
    bg: "#0a0a0f", // --bg, el fondo del mundo
    paddle: "#00f5ff", // --cyan
    ball: "#e6e9ff", // --ink
    highlight: "rgba(255,255,255,0.12)", // la franja superior de cada bloque
    blocks: {
        red: "#d97a3a", // --bronze
        yellow: "#f5ff00", // --yellow
        cyan: "#00f5ff", // --cyan
        magenta: "#ff006e", // --magenta
        hotpink: "#ffcf3a", // --gold
        green: "#00ff88", // --green
        gray: "#c7d0e0", // --silver
    },
} as const;
```

### 3.3 — `app/lib/engines/bloque-buster/entities.ts`

El original no tiene clases: tiene objetos literales `paddle` y `ball`, un array global `blocks` y otro
`explosions`. El port los convierte en cuatro clases, con la misma regla que SPEC 05: `draw(ctx)` recibe
el contexto y nada lee una global.

```ts
export type BlockColor = keyof typeof PALETTE.blocks;
export type BlockSpec = { col: number; row: number; color: BlockColor };

/** La paleta. Se mueve con teclado o con el ratón; el motor decide con cuál. */
export class Paddle {
    x: number;
    readonly y = PADDLE.y;
    readonly w = PADDLE.w;
    readonly h = PADDLE.h;
    centre(): void; // al centro del mundo
    moveBy(dx: number): void; // teclado, ya limitado a [0, WORLD.w − w]
    moveTo(centreX: number): void; // ratón, centrando la paleta en centreX
    draw(ctx: CanvasRenderingContext2D): void;
}

/** La pelota. Mientras `stuck` es true no se integra: sigue a la paleta. */
export class Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    stuck: boolean;
    speed(): number; // el módulo, para conservarlo al rebotar
    stickTo(paddle: Paddle): void; // la deja centrada sobre la paleta
    launch(multiplier: number): void; // stuck = false, con la dirección base
    update(dt: number): void;
    bounceOffPaddle(paddle: Paddle): void; // ángulo por punto de impacto
    draw(ctx: CanvasRenderingContext2D): void;
}

/** Un bloque del patrón. `alive = false` en vez de borrarlo del array, igual
 *  que el original. */
export class Block {
    readonly x: number;
    readonly y: number;
    readonly w = BLOCK.w;
    readonly h = BLOCK.h;
    readonly color: BlockColor;
    alive: boolean;
    hits(ball: Ball): "x" | "y" | null; // el eje del solape menor, o null
    draw(ctx: CanvasRenderingContext2D): void;
}

/** El destello procedural que sustituye a los 4 frames del spritesheet. */
export class Explosion {
    elapsed: number;
    done(): boolean;
    update(dt: number): void;
    draw(ctx: CanvasRenderingContext2D): void;
}

export function buildLevel(index: number): Block[];
```

Tres diferencias con `entities.ts` de ASTEROIDES, y las tres son deliberadas:

- **`Block.hits()` devuelve el eje, no un booleano.** El original hace `ball.vy = -ball.vy` siempre, sin
  mirar por qué cara entró la pelota. Aquí se compara el solape horizontal con el vertical y se invierte
  la componente del eje con menos solape, que es el que entró; sin eso la pelota atraviesa de lado las
  columnas del patrón 5.
- **`Ball.bounceOffPaddle()` recalcula `vx`.** El original solo invierte `vy`, así que el ángulo
  horizontal de la pelota no se puede cambiar nunca. Aquí el punto de impacto manda:
  `offset = (ballCx − paddleCx) / (paddleW / 2)` recortado a `[−1, 1]`, el ángulo es
  `offset × 60°` y el módulo de la velocidad se conserva. Con 60° de tope `cos(60°) = 0.5`, así que la
  componente vertical nunca baja de la mitad y la pelota no se queda rebotando en horizontal.
- **`Ball.stuck`.** El estado de saque, que el original no tiene. No es un cuarto `GameStatus`: la
  partida sigue en `"playing"`, el bucle corre y la paleta se mueve; lo único que no ocurre es la
  integración de la pelota.

El dibujo de un bloque —relleno de `w − 2` × `h − 2` con 1 px de margen y una franja de brillo de 4 px
arriba— es el `drawBlock()` que SPEC 07 ya portó para CAÍDA, con el color saliendo de `PALETTE.blocks`.
La paleta y la pelota se dibujan con `shadowBlur` en su propio color, que es lo que las hace parecer de
neón sin un solo píxel de imagen.

### 3.4 — Los niveles y el bucle sin fin

El original tiene cinco niveles y se acaba. Aquí el nivel no tiene techo:

```
patrón   = LEVELS[(level − 1) % 5]
velocidad = min(BALL.maxMultiplier, BALL.speedStep ** (level − 1))
```

Los cinco multiplicadores literales de `levels.js` (1.00, 1.10, 1.21, 1.33, 1.46) son exactamente
`1.1 ^ (n − 1)` redondeado a dos decimales, así que la fórmula reproduce el original y lo extiende sin
inventar nada:

| nivel                     | 1   | 2   | 3    | 4    | 5     | 6    | 7    | 8    | 9+   |
| ------------------------- | --- | --- | ---- | ---- | ----- | ---- | ---- | ---- | ---- |
| patrón                    | 1   | 2   | 3    | 4    | 5     | 1    | 2    | 3    | …    |
| multiplicador             | 1.0 | 1.1 | 1.21 | 1.33 | 1.464 | 1.61 | 1.77 | 1.95 | 2.0  |
| px por fotograma a 60 fps | 6.0 | 6.6 | 7.3  | 8.0  | 8.8   | 9.7  | 10.6 | 11.7 | 12.0 |

A ×2,0 la pelota avanza 12 px por fotograma, menos que sus 16 px de diámetro y menos que los 24 px de
alto de un bloque, así que nada se atraviesa. El techo se alcanza en el nivel 9 y a partir de ahí solo
cambia el patrón.

### 3.5 — `app/lib/engines/bloque-buster/engine.ts` — la frontera

```ts
export type GameStatus = "ready" | "playing" | "paused" | "over";

// Lo que el motor publica hacia React. Se emite solo cuando algún valor
// cambia, no en cada fotograma.
export type GameSnapshot = {
    score: number;
    lives: number; // empieza en RUN.lives = 3
    level: number; // 1, 2, 3… sin reiniciar al cerrar la vuelta
    blocks: number; // el campo específico de este juego: los que quedan vivos
};

export type EngineHandle = {
    start(): void; // "ready" → "playing"
    pause(): void;
    resume(): void;
    end(): void; // fin forzado desde el botón FIN
    restart(): void; // vuelve a "ready" con el patrón 1 dibujado
    destroy(): void; // cancela el rAF y retira todos los listeners
};

export type EngineCallbacks = {
    snapshot: (snapshot: GameSnapshot) => void;
    status: (status: GameStatus) => void;
};

export function createBloqueBusterEngine(
    canvas: HTMLCanvasElement,
    on: EngineCallbacks,
): EngineHandle;
```

Las cuatro reglas de la frontera de SPEC 05, que este motor también cumple:

1. **El motor no importa React**, y no toca ningún nodo que no haya creado él: su `canvas`, la
   `window` que escucha para el teclado y los elementos de audio de `sound.ts`, que no cuelgan del
   documento. `grep -rn 'from "react"' app/lib/engines` sigue devolviendo nada.
2. **El motor no dibuja HUD ni overlays.** El `Score:` / `Nivel:` / las pelotitas de vidas del
   `draw()` original, el `drawOverlay()` de `GAME OVER` y de `¡Completaste el juego!`, y el
   `drawPauseOverlay()` completo con sus cinco botones desaparecen: esa información viaja por `snapshot`
   y por `status`, y la pinta React. **Dentro del canvas no se dibuja ni un carácter de texto.**
3. **`snapshot` se emite solo cuando cambia un valor.** Los cuatro campos cambian por sucesos discretos
   —romper un bloque, perder una vida, cerrar un nivel—, nunca por fotograma. No hace falta redondear
   nada.
4. **`destroy()` es parte del contrato** y lo llama el `useEffect` en su limpieza, o el doble montaje de
   StrictMode deja dos bucles corriendo y la partida va al doble de velocidad.

El estado interno que **no** sale al exterior: `explosions`, `ball.stuck` y el multiplicador de velocidad
del nivel. Para React solo existen `score`, `lives`, `level` y `blocks`.

**El teclado.** Los mismos códigos que `game.js`, más `Espacio` para arrancar y para sacar:

| tecla       | en `"ready"`       | en `"playing"`                 |
| ----------- | ------------------ | ------------------------------ |
| `←` `→`     | —                  | mover la paleta a 400 px/s     |
| `Espacio`   | empieza la partida | lanza la pelota si está pegada |
| `P` / `Esc` | —                  | alterna la pausa               |

`preventDefault()` se aplica a `ArrowLeft`, `ArrowRight` y `Space` **solo mientras el estado es
`"playing"`**. Con el modal de fin abierto el estado es `"over"`, así que el input de iniciales escribe
con normalidad, espacios incluidos.

**El ratón.** Un `mousemove` sobre el **canvas** —no sobre `window`— mueve la paleta, y funciona también
mientras la pelota está pegada, para colocarse antes de sacar. La conversión es la del original, que ya
contempla un canvas escalado:

```
mx = (event.clientX − rect.left) × (WORLD.w / rect.width)
```

Es el único listener que un motor del Vault pone en su propio canvas, y `destroy()` lo retira igual que
los de `window`. El `canvas.addEventListener('click', …)` del selector de nivel no se porta.

**El escalado.** `canvas.width = 800 * dpr` y `canvas.height = 600 * dpr` con `dpr` capado a 2, y
`ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, igual que los otros dos motores: el juego sigue razonando en
coordenadas 800×600.

**El reparto del mundo.** El original usa el mundo entero y encaja en 4:3 sin ajustes, así que
`app/globals.css` no se toca:

```
800×600
┌───────────────────────────────────────┐
│                                       │
│     ┌───────────────────────────┐     │ ← y = 80
│     │  10 × 6 bloques de 64×24  │     │
│     └───────────────────────────┘     │ ← y = 224
│           x = 80 … 720                │
│                                       │
│                 ○                     │ ← la pelota
│              ▄▄▄▄▄▄▄                  │ ← la paleta, y = 560
└───────────────────────────────────────┘
```

### 3.6 — `app/lib/engines/bloque-buster/sound.ts`

Los dos efectos del original, copiados sin tocar a `public/games/bloque-buster/`. El motor pide sonidos;
no sabe de archivos ni de formatos.

```ts
export type Sounds = {
    bounce(): void; // contra un muro o contra la paleta
    smash(): void; // un bloque acaba de irse
    destroy(): void; // silencia todas las voces, lo llama el destroy() del motor
};

export function createSounds(): Sounds;
```

Y en `constants.ts`, junto al resto de números:

```ts
export const SOUNDS = {
    bounce: "/games/bloque-buster/ball-bounce.mp3",
    smash: "/games/bloque-buster/break-sound.mp3",
    volume: 0.35, // el único número que el original no tiene: lo reproduce a tope
    voices: 4, // copias listas de cada efecto, para que dos golpes no se corten
} as const;
```

Los cinco puntos donde suena son los mismos que en `game.js`: los tres muros, la paleta y un bloque al
romperse. El rechazo de `play()` se traga —la política de autoreproducción puede negar un efecto anterior
al primer gesto— porque una promesa rechazada sin capturar aparecería en la consola.

### 3.7 — El registro

```ts
// app/components/game-registry.ts
const BloqueBusterGame = dynamic(
    () => import("@/app/components/bloque-buster-game"),
    { ssr: false },
);

export const GAME_ENGINES: Partial<
    Record<string, ComponentType<GameComponentProps>>
> = {
    asteroides: AsteroidesGame,
    caida: CaidaGame,
    "bloque-buster": BloqueBusterGame,
};
```

`app/components/game-player.tsx` no cambia: ya despacha por `GAME_ENGINES[game.id]` y cae en
`fake-game-player.tsx` cuando no encuentra nada.

### 3.8 — Lo que llega a `PlayerShell`

Las props exactas, sin ninguna nueva:

```tsx
<PlayerShell
    game={game}
    score={snapshot.score}
    lives={snapshot.lives}
    level={snapshot.level}
    extraStat={{ label: "BLOQUES", value: String(snapshot.blocks) }}
    paused={status === "paused"}
    over={status === "over"}
    onTogglePause={…}
    onEnd={…}
    onRestart={…}
>
    <canvas className="game-canvas" />
</PlayerShell>
```

Este spec **no introduce ninguna estructura persistente nueva**. La fila que se guarda al terminar es la
de `public.scores` que definió SPEC 06, con `game_id = 'bloque-buster'`.

---

## 4 — Plan de implementación

Cada paso deja la aplicación compilando y las siete rutas navegables.

1. **`app/lib/engines/bloque-buster/constants.ts`.** Los valores de la sección 3.2, con un comentario que
   diga que los números vienen de `references/started-games/04-arkanoid/game.js` y de `levels.js` sin
   tocar. `LEVELS` se genera con los mismos cinco bucles del original —parrilla, pirámide, tablero,
   filas con huecos, marco con cruz— y con los mismos colores por fila. El multiplicador de velocidad
   pasa de cinco literales a la fórmula de la sección 3.4.
   Verificar: `npx tsc --noEmit` sin errores, y que los cinco patrones tienen 60, 40, 30, 39 y 39 bloques.

2. **`app/lib/engines/bloque-buster/entities.ts`.** `Paddle`, `Ball`, `Block`, `Explosion` y
   `buildLevel()` de la sección 3.3, con el dibujo del bloque copiado del `drawBlock()` de CAÍDA y el
   rebote por punto de impacto.
   Verificar: `npx tsc --noEmit` y `npm run lint` sin avisos.

3. **`app/lib/engines/bloque-buster/engine.ts`.** `createBloqueBusterEngine` con:
    - la máquina de estados `ready → playing ⇄ paused → over`;
    - el bucle `requestAnimationFrame` con `dt` capado a `MAX_DT`, que no se ejecuta en `"paused"` ni en
      `"over"`, y que al reanudar reinicia su marca de tiempo para que el primer `dt` valga 0;
    - el movimiento de la paleta por teclado y por ratón, limitado a `[0, WORLD.w − PADDLE.w]`;
    - el saque: mientras `ball.stuck` la pelota sigue a la paleta, y `Espacio` la lanza con la dirección
      base del original escalada por el multiplicador del nivel;
    - los rebotes en los tres muros, y el rebote en la paleta por punto de impacto con la tolerancia de
      8 px del original;
    - la colisión con bloques, un bloque por fotograma como el original, invirtiendo el eje del solape
      menor, sumando `RUN.pointsPerBlock` y empujando una `Explosion`;
    - el cierre de nivel: cuando no queda ningún bloque vivo, `level++`, `buildLevel((level − 1) % 5)`
      y la pelota vuelve a quedar pegada a la paleta;
    - la pérdida de vida: si la pelota baja de `WORLD.h`, `lives--`; a cero, `"over"`; si queda alguna,
      la pelota se pega otra vez a la paleta y el patrón se conserva;
    - los listeners de `keydown` y `keyup` en `window` y el de `mousemove` en el canvas, con el
      `preventDefault()` de la sección 3.5;
    - pausa automática con `visibilitychange` cuando la pestaña se oculta, y el conjunto de teclas
      pulsadas vaciado al pausar;
    - en `"ready"` y en `"over"` se dibuja un fotograma estático —patrón, paleta centrada y pelota
      encima— para que el overlay no quede sobre un rectángulo negro.

    Verificar: `npx tsc --noEmit` sin errores.

    `app/globals.css` **no se toca en ningún paso**: el mundo es 800×600 y `.game-canvas` de SPEC 05 ya
    cubre `.crt-screen`.

4. **`app/lib/engines/bloque-buster/sound.ts` y los dos assets.** Copiar `ball-bounce.mp3` y
   `break-sound.mp3` de `references/started-games/04-arkanoid/assets/sounds/` a
   `public/games/bloque-buster/` sin tocarlos, escribir `createSounds()` de la sección 3.6 y llamarlo
   desde `engine.ts` en los cinco puntos del original: los tres muros, la paleta y un bloque al
   romperse. `destroy()` los silencia.
   Verificar: los dos `.mp3` se sirven con `200 audio/mpeg`, y una partida dispara un efecto por rebote
   y otro distinto por bloque, sin errores en la consola.

5. **`app/components/bloque-buster-game.tsx`.** Componente `"use client"` calcado de `caida-game.tsx`:
    - crea el motor en un `useEffect` con `[]` y llama a `destroy()` en la limpieza;
    - guarda `snapshot` y `status` en estado y se los pasa a `<PlayerShell>` como en la sección 3.8;
    - pinta dentro del `.crt-screen` el `<canvas className="game-canvas">` y, encima, el overlay de
      `"ready"`: título, los controles (`RATÓN / ← →` mover, `ESPACIO` lanzar, `P` pausar) y
      `▸ PULSA ESPACIO_`. El de pausa lo pinta el shell;
    - lee `matchMedia("(pointer: coarse)")` con `useSyncExternalStore`, y con puntero grueso muestra
      `SE REQUIERE TECLADO` con la lista de controles en vez del overlay de inicio, sin arrancar el motor;
    - conecta `FIN` a `engine.end()`, `PAUSA` a `pause()`/`resume()` y `JUGAR DE NUEVO` a `restart()`.

    Verificar: `/games/bloque-buster/play` arranca detenido, `Espacio` empieza la partida, el ratón mueve
    la paleta y el segundo `Espacio` lanza la pelota.

6. **`app/components/game-registry.ts`.** El `dynamic()` y la entrada `bloque-buster` de la sección 3.7.
   Verificar: `/games/bloque-buster/play` monta el juego real; los otros cinco cartuchos sin motor siguen
   con `fake-game-player.tsx`, y el bundle de esas rutas no incluye ningún motor.

7. **La migración del techo de puntuación.** Escribir
   `supabase/migrations/<timestamp>_set_bloque_buster_max_score.sql` con el `update` de la sección 3.1,
   aplicarlo con `apply_migration` bajo la descripción `set_bloque_buster_max_score`, y renombrar el
   archivo local al timestamp que reporte `list_migrations`, para que el repositorio y el registro remoto
   queden idénticos. Regenerar `app/lib/supabase/types.ts` con `generate_typescript_types` y comprobar
   que **no** produce ningún cambio: es un `update` de datos, no de esquema.
   Verificar: `select max_score from public.games where id = 'bloque-buster'` devuelve `100000`.

8. **`CLAUDE.md`.** Corregir la afirmación de cuántos cartuchos juegan de verdad: ahora son tres,
   ASTEROIDES, CAÍDA y BLOQUE BUSTER, y quedan cinco con el reproductor falso. En la convención de
   motores, añadir `app/lib/engines/bloque-buster/` a la lista, anotar que
   `references/started-games/` queda agotado y que un motor puede escuchar a su propio canvas —el
   `mousemove` de este juego— sin romper la regla de que no conoce más DOM que él.
   Verificar: la sección de convenciones nombra `app/lib/engines/bloque-buster/`.

9. **Verificación final.** `npm run build`, `npm run lint` y `npx tsc --noEmit`. Recorrer las siete rutas
   (`/`, `/games`, `/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame`, `/about`) comprobando que
   solo cambia el cartucho de BLOQUE BUSTER, y jugar una partida completa hasta guardar la marca.

---

## 5 — Criterios de aceptación

**El contrato del motor**

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `grep -rn 'from "react"' app/lib/engines` no devuelve nada.
- [ ] No hay ni un texto dibujado dentro del canvas: el HUD lo pinta `PlayerShell`.
- [ ] Con StrictMode montando dos veces, la partida no va al doble de velocidad.
- [ ] Salir de la ruta deja de consumir CPU: no queda ningún `requestAnimationFrame` vivo, y el
      `mousemove` del canvas tampoco sigue enganchado.
- [ ] Durante la partida las teclas del juego no hacen scroll; con el modal abierto, el input de iniciales
      escribe con normalidad, espacios incluidos.
- [ ] Cambiar de pestaña pausa la partida sola, y al reanudar la pelota no se teletransporta.
- [ ] `public/` solo gana los dos `.mp3` del original, en `public/games/bloque-buster/`: el
      spritesheet no se copia a ninguna parte.
- [ ] La consola del navegador no registra errores ni avisos de hidratación.

**El juego**

- [ ] `/games/bloque-buster/play` arranca detenido, con el overlay de inicio y los controles visibles.
- [ ] Pulsar `Espacio` en la pantalla de inicio empieza la partida, con la pelota pegada a la paleta.
- [ ] Mover el ratón sobre el canvas mueve la paleta, y la paleta sigue al puntero aunque el marco CRT
      esté escalado a cualquier tamaño de ventana.
- [ ] `←` y `→` también mueven la paleta, y ninguna de las dos formas la deja salir del mundo.
- [ ] Con la pelota pegada, la paleta se puede colocar antes de sacar, y `Espacio` la lanza.
- [ ] La pelota rebota en los muros izquierdo, derecho y superior, y nunca sale del mundo por arriba ni
      por los lados.
- [ ] Golpear la paleta por el centro devuelve la pelota casi vertical, y golpearla por un borde la
      devuelve muy inclinada, sin que la velocidad total cambie.
- [ ] Romper un bloque suma exactamente 10 puntos, deja un destello donde estaba y baja el contador
      `BLOQUES` en uno.
- [ ] Una pelota que llega de lado a una columna de bloques rebota hacia el lado, no hacia arriba.
- [ ] Limpiar todos los bloques carga el patrón siguiente, sube `NIVEL` en uno y vuelve a pegar la pelota
      a la paleta.
- [ ] Tras el nivel 5 el juego no termina: el nivel 6 vuelve al primer patrón, más rápido.
- [ ] A partir del nivel 9 la pelota deja de acelerar, y a esa velocidad no atraviesa ningún bloque ni la
      paleta.
- [ ] Dejar caer la pelota descuenta una vida, conserva los bloques que quedaban y vuelve a pegar la
      pelota a la paleta.
- [ ] Perder la tercera vida termina la partida y abre el modal de fin.
- [ ] `P` y `Esc` alternan la pausa, y el overlay `EN PAUSA` es el del shell: dentro del canvas no hay
      ningún selector de nivel.
- [ ] `FIN` termina la partida con la puntuación acumulada.
- [ ] `JUGAR DE NUEVO` vuelve al patrón 1 con 3 vidas, puntuación 0, nivel 1 y la velocidad base.
- [ ] Rebotar en un muro o en la paleta suena, y romper un bloque suena distinto.
- [ ] Dos golpes seguidos no se cortan entre sí.
- [ ] ASTEROIDES y CAÍDA siguen mudos.

**El HUD**

- [ ] El HUD muestra `VIDAS ♥ ♥ ♥` al empezar, y pierde un corazón por cada pelota caída.
- [ ] El HUD muestra `BLOQUES` con los que quedan en el nivel, y llega a 0 justo cuando cambia el patrón.
- [ ] `NIVEL` empieza en `01` y sigue subiendo tras el 5: `06`, `07`, `08`…

**El catálogo y el leaderboard**

- [ ] `select max_score from public.games where id = 'bloque-buster'` devuelve `100000`.
- [ ] `app/lib/supabase/types.ts` no cambia respecto a antes del spec.
- [ ] Terminar una partida, escribir un nombre y pulsar `GUARDAR PUNTUACIÓN` inserta una fila en
      `public.scores` con `game_id = 'bloque-buster'` y muestra `▸ PUNTUACIÓN GUARDADA_`.
- [ ] Esa marca aparece en `/hall-of-fame` y en el panel lateral de `/games/bloque-buster` sin esperar
      ningún intervalo, y el récord de la ficha se actualiza tras revalidar `games`.
- [ ] La ficha de `/games/bloque-buster` conserva su portada `cover-bricks`, su categoría `ARCADE` y su
      botón cyan, y sigue siendo la primera de `/games`.
- [ ] Los otros cinco cartuchos sin motor siguen cayendo en `fake-game-player.tsx`, sin cambios, y
      ASTEROIDES y CAÍDA se juegan igual que antes del spec.

---

## 6 — Decisiones tomadas y descartadas

**Los assets**

- **Sí:** port vectorial con los tokens de `:root`. `assets/spritesheet-breakout.png` no se copia:
  bloques, paleta y pelota se dibujan con primitivas de canvas, y los siete nombres de color del original
  se mapean a siete tokens distintos —`--bronze` el rojo, `--gold` el rosa, `--silver` el gris, y los
  otros cuatro a su homónimo—. Es la misma decisión que SPEC 07 tomó con las piezas de CAÍDA, y evita
  añadir al contrato del motor un estado de carga que ningún otro tiene.
- **No:** portar el spritesheet a `public/games/bloque-buster/`. Es fiel al original, pero mete un asset
  binario en el repositorio de la aplicación, obliga al motor a no dibujar el primer fotograma hasta que
  la imagen esté lista, y trae unos sprites pastel que no son de este tema.
- **No:** vectorial con los colores del original. Cero assets, pero el `hotpink` pastel y el `gray` chocan
  con el marco de neón, que es exactamente lo que el repintado resuelve.
- **No:** la animación de explosión de cuatro frames del spritesheet. Se sustituye por un destello
  procedural de la misma duración, 0,15 s, en el color del bloque.

**El sonido**

Esta decisión se **revirtió durante la implementación**, a petición explícita del usuario: el juego se
quedaba mudo al romper bloques y al rebotar, y eso pesa más que la coherencia con los otros dos
cartuchos. Queda escrito el camino entero, porque el motivo original sigue siendo cierto y el spec de
plataforma sigue pendiente.

- **Sí (decisión final):** portar `ball-bounce.mp3` y `break-sound.mp3` tal cual a
  `public/games/bloque-buster/`. Son los sonidos que este juego tiene; sintetizarlos con WebAudio
  habría sido inventar un diseño sonoro que el original ya resuelve.
- **Sí:** un módulo aparte, `app/lib/engines/bloque-buster/sound.ts`, y no `new Audio()` esparcido por
  `engine.ts`. El motor pide `bounce()` y `smash()` y no sabe de archivos.
- **Sí:** un grupo fijo de cuatro voces por efecto, rotando. El original hace
  `new Audio(src).cloneNode().play()` en cada golpe, que crea un elemento por rebote; con el grupo dos
  golpes del mismo fotograma se solapan sin cortarse y sin generar basura.
- **Sí:** `volume: 0.35`, el único número de este apartado que el original no tiene. Lo reproduce a todo
  volumen, que dentro de una página es mucho.
- **Sí:** tragarse el rechazo de `play()`. La política de autoreproducción puede negar un efecto anterior
  al primer gesto del jugador, y una promesa rechazada sin capturar aparecería en la consola, que un
  criterio de aceptación exige limpia.
- **Sí:** los elementos de audio son del motor y `destroy()` los silencia, igual que retira los
  listeners. No se cuelgan del documento: no son nodos de la página.
- **No (decisión revertida):** dejar el juego mudo porque ASTEROIDES y CAÍDA lo están. El motivo era
  real —el audio pide gesto de usuario, silenciado persistido y un control en el HUD que `PlayerShell`
  no tiene— pero un Arkanoid sin el golpe del bloque se nota, y el usuario lo pidió expresamente.
- **No:** una tecla `M` para silenciar. No se pidió, y sería un control que ningún otro cartucho tiene;
  mientras tanto `PAUSA` corta el sonido y el navegador puede silenciar la pestaña.
- **Sigue pendiente:** el audio **de plataforma**, con silenciado que se recuerde y control en el shell,
  para los tres cartuchos a la vez. Este spec no lo resuelve, solo hace sonar este juego.

**El final de la partida**

- **Sí:** bucle sin fin. Tras el nivel 5 vuelve el patrón 1 y la velocidad sigue su progresión hasta el
  techo; la partida solo acaba sin vidas. Con cinco niveles finitos el techo de puntuación son 2 080
  puntos y cualquiera que se termine el juego con vidas de sobra empata en el Salón de la Fama, que es
  justo lo que un leaderboard no puede permitirse.
- **No:** el estado `'win'` del original como estado terminal. Es el port fiel y es trivial, pero deja el
  juego sin forma de distinguir a un buen jugador de otro.
- **No:** un overlay `RECORD COMPLETO` propio del cartucho al cerrar la quinta vuelta. Conserva el
  mensaje del original, pero añade un estado que el motor tiene que publicar y no arregla el techo.
- **Sí:** `NIVEL` sigue contando 6, 7, 8… sin reiniciar en la vuelta. Es la medida de lo lejos que
  llegaste, y el patrón se deduce con `(level − 1) % 5`.

**La velocidad**

- **Sí:** capar el multiplicador en ×2,0, alcanzado en el nivel 9. A esa velocidad la pelota avanza 12 px
  por fotograma, menos que sus 16 px de diámetro, así que la colisión discreta sigue siendo correcta. Es
  una constante y ninguna lógica nueva, el mismo patrón que el `DROP.min` de CAÍDA.
- **No:** integrar la colisión en subpasos de 4 px para poder subir la velocidad sin límite. Es más
  robusto, pero es lógica que el original no tiene y que hay que escribir y verificar para resolver un
  problema que una constante ya resuelve.
- **No:** las dos cosas. Cinturón y tirantes para un problema que solo necesita uno.
- **Sí:** `MAX_DT = 0.02` en vez del `0.05` de los otros dos motores. Es el único número de este port que
  no sale del original, y sale de una cuenta: `721 px/s × 0.02 s = 14.4 px`, menos que el diámetro de la
  pelota. Con 0,05 un fotograma lento la haría saltar 36 px y podría atravesar una fila de bloques.
- **Sí:** la fórmula `1.1 ^ (level − 1)` en vez de los cinco literales de `levels.js`. Son el mismo
  número: los literales son esa potencia redondeada a dos decimales, y la fórmula extiende la progresión
  al bucle sin inventar valores.

**El rebote y la colisión**

- **Sí:** el ángulo de salida de la paleta sale del punto de impacto, hasta ±60°, conservando el módulo de
  la velocidad. Sin eso el `vx` de la pelota solo lo deciden los rebotes en los muros, no se puede apuntar
  a un bloque concreto, y limpiar el último bloque de un patrón depende de la suerte. En una partida
  infinita eso deja de ser un detalle.
- **No:** el rebote del original, que solo invierte `vy`. Cero números inventados, pero convierte la
  paleta en un muro en vez de un instrumento.
- **No:** el arrastre de la paleta (empujar `vx` según si la paleta se movía al golpear). Permite apuntar
  con menos código, pero es un control invisible que hay que descubrir jugando.
- **Sí:** detectar el eje de la colisión con un bloque por el solape menor. Son unas ocho líneas y sin
  ellas la pelota atraviesa de lado las columnas del patrón 5, que es visible a simple vista.
- **Sí:** un bloque por fotograma, con el `break` del original. Con el `dt` capado a 0,02 s la pelota no
  llega a solapar dos bloques a la vez, así que la simplificación no se nota.

**El saque**

- **Sí:** la pelota queda pegada a la paleta al empezar cada nivel y tras perder una vida, y sale con
  `Espacio`. El saque automático del original a nivel 9, con la velocidad capada, quita la vida siguiente
  antes de que el jugador pueda reaccionar.
- **Sí:** el saque **no** es un `GameStatus` nuevo. Es una bandera `ball.stuck` dentro de `"playing"`: el
  bucle corre, la paleta se mueve y no hace falta ningún overlay. Añadir un quinto estado obligaría a
  tocar el contrato que comparten los tres motores.
- **Sí:** la pelota sale con la dirección base del original (`vx = 200`, `vy = −300` escalados), arriba y
  a la derecha. Es el `initBall()` de `game.js` tal cual, y el ángulo real se corrige en el primer rebote
  con la paleta.
- **No:** medio segundo de espera y saque automático. No hay que aprender ninguna tecla, pero es una
  constante inventada y el jugador no decide cuándo sale.

**Los controles**

- **Sí:** ratón y teclado, los dos, como el original. En un Arkanoid el ratón es el control natural, y es
  el único cartucho del Vault donde el puntero sirve para algo. El `mousemove` va sobre el canvas y
  traduce las coordenadas con `getBoundingClientRect()` y el factor `800 / rect.width`, que es lo que el
  original ya hace para su propio canvas.
- **No:** solo teclado. El motor no escucharía nada del canvas, pero se pierde el control que mejor se
  juega.
- **No:** arrastre táctil con `pointermove`. Haría el juego jugable en móvil y quitaría el aviso de
  teclado, pero abre dentro de este spec el frente de controles táctiles que SPEC 05 y SPEC 07 dejaron
  fuera. El aviso `SE REQUIERE TECLADO` se queda tal cual.
- **Sí:** `preventDefault()` solo mientras el estado es `"playing"`, para que el input de iniciales del
  modal siga aceptando espacios. Es la misma trampa que SPEC 05 documentó.
- **No:** el selector de nivel del overlay de pausa y su `click` sobre el canvas. Saltar al nivel 5 es
  depuración, y además sería texto y botones dibujados dentro del canvas, que es lo que la regla 2
  prohíbe.

**La puntuación y el HUD**

- **Sí:** 10 puntos fijos por bloque, como el original. La puntuación mide cuántos bloques rompiste, que
  es legible, y sobrevivir más vueltas ya premia por sí solo.
- **No:** `10 × nivel`, el patrón de las líneas de CAÍDA. Separa mejor a los buenos jugadores, pero
  premia dos veces lo mismo y el techo se alcanzaría en cinco vueltas en vez de cuarenta y ocho.
- **No:** un bono por limpiar el nivel. Premia terminar el patrón en vez de morir con dos bloques
  puestos, pero son dos constantes nuevas que habría que calibrar a ojo.
- **Sí:** `extraStat = { label: "BLOQUES", value }` con los que quedan vivos. Es el equivalente al
  `LÍNEAS` de CAÍDA: progreso inmediato, y cambia por sucesos discretos.
- **No:** `VUELTA`, el número de ciclo. Explica el bucle, pero cambia una vez cada cinco niveles y casi
  siempre es un `1` quieto.
- **No:** `extraStat = null`. `VIDAS` y `NIVEL` cuentan parte de la historia, pero se perdería el
  progreso dentro del nivel, que es de donde sale la tensión de un Arkanoid.
- **Sí:** `lives` de verdad, empezando en `RUN.lives = 3`. Es el primer cartucho portado que llena las dos
  casillas del HUD que el shell tiene desde SPEC 01: CAÍDA pinta `—` y ASTEROIDES no tiene contador de
  progreso.

**La estructura del port**

- **Sí:** los cinco patrones viven en `constants.ts`, generados con los mismos bucles de `levels.js`. Son
  datos de ajuste, y ahí es donde el contrato de SPEC 05 los pone.
- **No:** un cuarto archivo `levels.ts` en la carpeta del motor, espejo del `levels.js` original. Separa
  bien, pero rompe la receta de tres archivos que `CLAUDE.md` declara para cada motor por una sola
  constante.
- **Sí:** `Ball.stuck` y el saque dentro del motor, no del componente. El componente no conoce la física.
- **No:** el `paddle.w = 162` que dice el `CLAUDE.md` del juego original. El objeto de `game.js` usa
  `w: 81`; los 162 px son el ancho del sprite, que se dibujaba a la mitad. Manda el código.
- **No:** el botón `Reiniciar`, el overlay compartido de `GAME OVER` y el panel lateral del original. Los
  da `PlayerShell` desde SPEC 05.

**El catálogo**

- **Sí:** reutilizar la fila `bloque-buster` tal cual, sin tocar copy, `cat`, `cover`, `color` ni
  `sort_order`. La ficha inventada en SPEC 01 y sembrada en SPEC 06 describe este juego, incluidos los
  «patrones imposibles» de cada nivel.
- **Sí:** bajar `max_score` a 100 000. Son 48 vueltas completas a los cinco patrones; un jugador
  excelente no se acerca, y el defecto de 10 000 000 deja pasar cualquier cosa.
- **No:** 20 000, que son diez vueltas. Más honesto con lo que un humano hace, pero un jugador muy bueno
  podría chocar contra el techo y ver su marca rechazada.
- **No:** 1 000 000, el mismo valor que CAÍDA por coherencia. 480 vueltas es indistinguible de no tener
  techo.
- **No:** sembrar puntuaciones falsas para que el Salón de la Fama no salga vacío. SPEC 06 ya aceptó que
  un juego sin partidas tiene `best: 0`; la primera marca real llega jugando.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                    | Mitigación                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El doble montaje de StrictMode deja dos bucles `requestAnimationFrame` corriendo y la partida va al doble | `destroy()` es parte del contrato del motor y el `useEffect` lo llama siempre en la limpieza. Hay un criterio de aceptación explícito.                                                          |
| El `mousemove` del canvas sobrevive al desmontaje y sigue moviendo una paleta que ya no existe            | `destroy()` retira también los listeners del canvas, no solo los de `window`, y un criterio de aceptación lo comprueba.                                                                         |
| A velocidad alta la pelota atraviesa un bloque o la paleta sin tocarlos                                   | El multiplicador se capa en ×2,0 (12 px por fotograma, menos que los 16 px de la pelota) y `MAX_DT = 0.02` limita el salto de un tick a 14,4 px. Criterio de aceptación aparte para el nivel 9. |
| El `preventDefault()` del teclado se traga la barra espaciadora del input de iniciales                    | Solo se aplica mientras el estado es `"playing"`, y con el modal abierto el estado es `"over"`. Criterio de aceptación aparte.                                                                  |
| La paleta no sigue al puntero porque el canvas está escalado por `.game-canvas`                           | La conversión usa `getBoundingClientRect()` y el factor `WORLD.w / rect.width` en cada evento, no un factor calculado una vez. Es lo que el original ya hace.                                   |
| El bucle sin fin hace la partida interminable y una sesión no termina nunca                               | La velocidad se capa pero la paleta sigue midiendo 81 px de 800, y son 3 vidas sin recuperación. El botón `FIN` del shell cierra la partida cuando el jugador quiera.                           |
| El rebote por punto de impacto deja la pelota casi horizontal y rebotando entre los muros                 | El ángulo se limita a ±60°, así que la componente vertical nunca baja de la mitad del módulo. Criterio de aceptación sobre el rebote por el borde.                                              |
| Los literales de `PALETTE` se desincronizan de los tokens de `:root`                                      | El tema es oscuro fijo y sin variante clara desde SPEC 01, y cada literal lleva anotado el token que copia.                                                                                     |
| `matchMedia` leído durante el render rompe la hidratación                                                 | Se lee con `useSyncExternalStore`, igual que en `asteroides-game.tsx` y en `caida-game.tsx`.                                                                                                    |
| La migración local y la remota se quedan con timestamps distintos                                         | El paso 6 renombra el archivo al timestamp que reporte `list_migrations`, que es la convención que SPEC 06 dejó en `CLAUDE.md`.                                                                 |
| El port vectorial no se parece al juego original y alguien lo toma por un error                           | Aceptado y anotado: `references/started-games/04-arkanoid/` no se toca, y la decisión con su motivo está en la sección 6. Es la misma que SPEC 07 tomó con las piezas de CAÍDA.                 |

---

## 8 — Lo que **no** entra en este spec

- El spritesheet del original: el port es vectorial.
- El audio como feature de plataforma: silenciado que se recuerde, control en el shell y sonido en
  los otros dos cartuchos. Aquí solo suena BLOQUE BUSTER.
- El estado de victoria y el cartel de «¡Completaste el juego!».
- El selector de nivel del overlay de pausa.
- Power-ups, paletas variables, bloques de varios golpes y bloques irrompibles.
- Patrones de nivel nuevos: se reciclan los cinco de `levels.js`.
- Controles táctiles. En móvil el juego avisa de que necesita teclado.
- Audio en el Vault, que le corresponde a un spec de plataforma para los tres cartuchos.
- Cambios en `app/globals.css`, en `PlayerShell` o en el despachador.
- Cambios en el copy, la portada, la categoría, el color o el `sort_order` de la fila `bloque-buster`.
- Sembrar puntuaciones falsas de `bloque-buster`.
- Realtime y paginación del Salón de la Fama.
- La etiqueta `TECLADO / TÁCTIL` de la ficha de detalle.
- Tests automatizados, que siguen pendientes desde SPEC 01.

Cada uno de estos, si llega, va en su propio spec.
