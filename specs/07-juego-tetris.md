# SPEC 07 — El juego Caída

> **Estado:** Implemented
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-09-04
> **Objetivo:** Portar el Tetris de `references/started-games/03-tetris/` a un motor TypeScript propio y enchufarlo al cartucho `caida`, de forma que CAÍDA sea el segundo juego de verdad jugable del Vault.

---

## 1 — Por qué existe este spec

SPEC 05 no portó un juego: diseñó una frontera y portó un juego para probarla. Lo dejó escrito en su
sección 1 —«en `references/started-games/` esperan otros dos juegos, Tetris y Arkanoid, que cruzarán
exactamente la misma»— y con eso convirtió el port de ASTEROIDES en una receta: tres archivos de motor sin
React, un componente cliente que traduce callbacks a estado, una línea en el registro y `PlayerShell`
pintando todo lo que no es el juego.

Este spec es la primera vez que esa receta se usa en un juego que no se parece al primero. ASTEROIDES es
un shooter vectorial de mundo toroidal con tres vidas, y el contrato se diseñó mirándolo. CAÍDA aprieta el
contrato por dos sitios distintos:

- **La geometría no encaja.** El tablero de `game.js` es de 10×20 celdas de 30 px, o sea **300×600**, una
  proporción 1:2 vertical. `.crt-screen` es 4:3 fijo desde el port de SPEC 01. El único juego portado hasta
  hoy medía 800×600 y coincidía por casualidad.
- **No hay vidas.** El HUD de `PlayerShell` tiene una casilla de vidas, y en Tetris no hay ninguna. El
  contrato ya prevé el caso (`lives: 0` pinta `—`), pero este spec es el primero que lo ejerce.

Lo que **no** hay que decidir aquí es nada de catálogo ni de puntuaciones. La fila `caida` existe en
`public.games` desde la semilla de SPEC 06, con `cat = 'PUZZLE'`, `cover = 'cover-tetro'`,
`color = 'magenta'` y `sort_order = 1`, y su copy ya describe este juego con precisión sospechosa: «la
velocidad aumenta sin piedad cada 10 líneas» es literalmente `level = floor(lines / 10) + 1` de `game.js`.
Comprobado por MCP antes de escribir esto: la fila está, y tiene **cero marcas** en `public.scores`.

Así que el leaderboard viene gratis. En cuanto el cartucho se monte a través de `PlayerShell`, la primera
partida guardada será el primer récord real de un juego que no es ASTEROIDES, y aparecerá en el Salón de la
Fama y en la ficha sin una línea de cableado nuevo.

---

## 2 — Alcance

**Dentro:**

- El motor portado a TypeScript en `app/lib/engines/caida/`, sin globales de módulo, sin ninguna
  referencia a React y sin leer el DOM más allá de su canvas.
- El componente cliente `app/components/caida-game.tsx`, que monta el `<canvas>`, traduce los avisos del
  motor a estado de React y se lo pasa a `<PlayerShell>`.
- Una línea de `dynamic()` y una entrada nueva en `app/components/game-registry.ts`.
- Una migración que baja `public.games.max_score` de `caida` a `1000000`.
- `CLAUDE.md`: la afirmación de que ASTEROIDES es el único cartucho que juega de verdad, y la nota de que
  el mundo del motor puede ser más grande que el campo de juego.

**Fuera de alcance (para specs futuros):**

- **Arkanoid.** `references/started-games/04-arkanoid/` sigue esperando; portarlo es su propio spec.
- **La pieza tuerca.** `PIECES[8]` del original, el anillo 3×3 con el centro hueco, no se porta. La
  decisión y su motivo están en la sección 6.
- **Mecánicas de Tetris moderno que el original no trae.** Ni pieza reservada (_hold_), ni bolsa de siete,
  ni _wall kicks_ de la SRS, ni T-spins, ni _lock delay_, ni combos, ni back-to-back. Se porta lo que hay
  en `game.js`: aleatorio uniforme y pateo `[0, ±1, ±2]`.
- **Controles táctiles.** Igual que ASTEROIDES, con puntero grueso se avisa de que se necesita teclado.
- **Sonido.** El original no tiene y aquí no se añade.
- **Repetición de tecla propia (DAS).** El movimiento lateral sigue dependiendo del auto-repeat del
  navegador, como en el original.
- **`app/globals.css`.** No se toca: el mundo del motor es 800×600, que es la proporción que
  `.crt-screen` ya tiene, así que `.game-canvas` de SPEC 05 sirve tal cual.
- **`app/components/player-shell.tsx` y `app/components/game-player.tsx`.** El shell no recibe props
  nuevas y el despachador no cambia de forma; solo el registro que consulta.
- **`app/lib/games.ts`, `app/lib/scores.ts`, `app/lib/catalogue.ts`, `app/lib/leaderboard.ts`,
  `app/actions/scores.ts` y `app/lib/rate-limit.ts`.** Un cartucho nuevo no toca ninguno: el guardado, la
  validación y el cupo por IP son los de SPEC 06.
- **Las siete rutas.** Ninguna página cambia.
- **El copy, `cat`, `cover`, `color`, `sort_order` y `plays` de la fila `caida`.** La ficha ya describe
  este juego. `plays` sigue siendo el `'31.8K'` inventado de la semilla, igual que en los otros siete
  cartuchos.
- **Una portada nueva.** `cover-tetro` ya existe y ya es de este juego.
- **El tema claro del original.** El botón de tema y la clave `localStorage["tetris-theme"]` desaparecen:
  el Vault es oscuro fijo desde SPEC 01.
- **La etiqueta `TECLADO / TÁCTIL`** de la ficha de detalle, que sigue siendo un literal compartido por
  los ocho cartuchos desde el port de SPEC 01.
- **Realtime y paginación del Salón de la Fama**, que siguen fuera desde SPEC 06.
- **Tests automatizados.** El proyecto sigue sin runner desde SPEC 01.

---

## 3 — Modelo de datos

### 3.1 — La fila del catálogo

`caida` ya existe en `public.games`. Lo único que cambia es el techo de puntuación:

```sql
-- supabase/migrations/<timestamp>_set_caida_max_score.sql
update public.games set max_score = 1000000 where id = 'caida';
```

`max_score` es el techo que `app/actions/scores.ts` lee **en vivo** antes de insertar —un `select` propio,
no el catálogo cacheado—, así que el cambio surte efecto sin revalidar la etiqueta `games`. No hay cambio
de esquema: `app/lib/supabase/types.ts` se queda idéntico.

Nada más de la fila se toca. Para que quede por escrito, este es el estado confirmado hoy:

| columna      | valor                                                     |
| ------------ | --------------------------------------------------------- |
| `id`         | `caida`                                                   |
| `title`      | `CAÍDA`                                                   |
| `cat`        | `PUZZLE`                                                  |
| `cover`      | `cover-tetro`                                             |
| `color`      | `magenta`                                                 |
| `sort_order` | `1`                                                       |
| `plays`      | `31.8K`                                                   |
| `max_score`  | `10000000` → **`1000000`**                                |
| marcas       | ninguna: `public.scores` no tiene ninguna fila de `caida` |

### 3.2 — `app/lib/engines/caida/constants.ts`

Todos los números del juego, copiados de `game.js`, más la geometría del mundo y la paleta. Los intervalos
del original están en milisegundos; aquí van en segundos, porque el bucle del motor trabaja en segundos
desde SPEC 05. Son los mismos valores.

```ts
// El mundo es 800×600 como en ASTEROIDES, para reutilizar la proporción 4:3
// de .crt-screen. El pozo de 300×600 del original va centrado dentro.
export const WORLD = { w: 800, h: 600 } as const;
export const MAX_DT = 0.05; // tope de dt, evita el salto al volver de otra pestaña

export const WELL = {
    cols: 10,
    rows: 20,
    block: 30, // 10×30 = 300 de ancho, 20×30 = 600 de alto
    x: 250, // (800 − 300) / 2
    y: 0, // 600 de alto = todo el mundo
} as const;

// La vista previa de la pieza siguiente, en el hueco derecho. Cuatro celdas de
// lado, igual que el canvas de 120×120 del original.
export const NEXT = { x: 615, y: 60, cells: 4, block: 30 } as const;

export const DROP = { base: 1, step: 0.09, min: 0.1 } as const; // segundos
export const LEVEL = { linesPerLevel: 10 } as const;
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;
export const SCORE = { hardDropPerCell: 2, softDropPerRow: 1 } as const;
export const KICKS = [0, -1, 1, -2, 2] as const; // pateo al rotar contra un muro

// Las siete formas de game.js, cada matriz con el índice de su color.
export const PIECES = [
    null,
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ], // I
    [
        [2, 2],
        [2, 2],
    ], // O
    // … T, S, Z, J, L, copiadas vértice a vértice
] as const;

// Espejo de los tokens de :root en app/globals.css. Siete piezas y siete tonos
// distinguibles, sin repetir ninguno.
export const PALETTE = {
    gutter: "#0a0a0f", // --bg, los huecos laterales
    well: "#0f0f18", // --bg-2, el fondo del pozo
    grid: "rgba(74,79,112,0.35)", // --ink-faint con alfa, la retícula
    frame: "rgba(0,245,255,0.18)", // --line, el borde del pozo y de la caja
    highlight: "rgba(255,255,255,0.12)", // el brillo superior de cada bloque
    ghostAlpha: 0.2,
    pieces: [
        null,
        "#00f5ff", // I → --cyan
        "#f5ff00", // O → --yellow
        "#ff006e", // T → --magenta
        "#00ff88", // S → --green
        "#d97a3a", // Z → --bronze
        "#c7d0e0", // J → --silver
        "#ffcf3a", // L → --gold
    ],
} as const;
```

### 3.3 — `app/lib/engines/caida/entities.ts`

El original no tiene clases: tiene una matriz global `board` y un objeto literal `current`. El port las
convierte en dos clases, con la misma regla que SPEC 05: `draw(ctx)` recibe el contexto y nada lee una
global.

```ts
export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Shape = Cell[][];

/** El pozo: la matriz de celdas ya fijadas, y su dibujo. */
export class Well {
    cells: Cell[][]; // WELL.rows × WELL.cols, 0 = vacío
    reset(): void;
    collide(shape: Shape, x: number, y: number): boolean;
    merge(piece: Piece): void;
    clearLines(): number; // devuelve cuántas filas se limpiaron
    draw(ctx: CanvasRenderingContext2D): void; // fondo, retícula, borde y celdas
}

/** La pieza en juego, y también la que se muestra en la vista previa. */
export class Piece {
    type: Cell;
    shape: Shape;
    x: number;
    y: number;
    rotateCW(): Shape; // transponer + invertir, sin mutar
    ghostY(well: Well): number; // proyecta hacia abajo hasta chocar
    draw(ctx: CanvasRenderingContext2D, alpha?: number): void;
}

export function randomPiece(): Piece;
export function drawPreview(ctx: CanvasRenderingContext2D, piece: Piece): void;
```

Dos diferencias con `entities.ts` de ASTEROIDES, y las dos son deliberadas:

- **Ninguna clase tiene `update(dt)`.** En CAÍDA nada se mueve solo: el único efecto del tiempo es un
  acumulador que cada `dropInterval` baja la pieza una fila, y ese acumulador es del motor, no de la
  pieza. Inventar un `Piece.update(dt)` que consultara el nivel sería mover la máquina de estados dentro
  de la entidad.
- **`Well.clearLines()` devuelve un número en vez de puntuar.** El original suma la puntuación dentro de
  `clearLines()` y llama a `updateHUD()`. Puntuar es del motor, que es quien tiene el nivel y quien emite
  el `snapshot`.

El dibujo de un bloque —relleno de `size - 2` con 1 px de margen y la franja de brillo de 4 px arriba— se
copia tal cual del `drawBlock()` original. Lo único que cambia es de dónde sale el color y que el origen
se desplaza a `WELL.x`, `WELL.y`.

### 3.4 — `app/lib/engines/caida/engine.ts` — la frontera

```ts
export type GameStatus = "ready" | "playing" | "paused" | "over";

// Lo que el motor publica hacia React. Se emite solo cuando algún valor
// cambia, no en cada fotograma.
export type GameSnapshot = {
    score: number;
    lives: number; // siempre 0: CAÍDA no tiene vidas, y el shell pinta "—"
    level: number;
    lines: number; // el campo específico de este juego
};

export type EngineHandle = {
    start(): void; // "ready" → "playing"
    pause(): void;
    resume(): void;
    end(): void; // fin forzado desde el botón FIN
    restart(): void; // vuelve a "ready" con el pozo vacío dibujado
    destroy(): void; // cancela el rAF y retira todos los listeners
};

export type EngineCallbacks = {
    snapshot: (snapshot: GameSnapshot) => void;
    status: (status: GameStatus) => void;
};

export function createCaidaEngine(
    canvas: HTMLCanvasElement,
    on: EngineCallbacks,
): EngineHandle;
```

Las cuatro reglas de la frontera de SPEC 05, que este motor también cumple:

1. **El motor no importa React**, y no conoce el DOM más allá de su `canvas` y de `window` para el
   teclado. `grep -rn 'from "react"' app/lib/engines` sigue devolviendo nada.
2. **El motor no dibuja HUD ni overlays.** `updateHUD()`, el overlay compartido de `PAUSA` / `GAME OVER` y
   el botón `Reiniciar` del original desaparecen: esa información viaja por `snapshot` y por `status`, y la
   pinta React. **Dentro del canvas no se dibuja ni un carácter de texto.**
3. **`snapshot` se emite solo cuando cambia un valor.** En CAÍDA los cuatro campos cambian por sucesos
   discretos —fijar una pieza, limpiar filas, una fila de bajada suave, una celda de caída dura—, nunca
   por fotograma. No hace falta redondear nada.
4. **`destroy()` es parte del contrato** y lo llama el `useEffect` en su limpieza, o el doble montaje de
   StrictMode deja dos bucles corriendo y la partida va al doble de velocidad.

El estado interno del original que **no** sale al exterior: `dropAccum` y `dropInterval`. Para React solo
existen `score`, `lives`, `level` y `lines`.

**El teclado.** Los mismos códigos que `game.js`:

| tecla       | en `"ready"`       | en `"playing"`   |
| ----------- | ------------------ | ---------------- |
| `←` `→`     | —                  | mover            |
| `↑` / `X`   | —                  | rotar            |
| `↓`         | —                  | bajada suave     |
| `Espacio`   | empieza la partida | caída dura       |
| `P` / `Esc` | —                  | alterna la pausa |

`preventDefault()` se aplica a `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` y `Space` **solo mientras
el estado es `"playing"`**. Con el modal de fin abierto el estado es `"over"`, así que el input de
iniciales escribe con normalidad, espacios incluidos.

**El escalado.** `canvas.width = 800 * dpr` y `canvas.height = 600 * dpr` con `dpr` capado a 2, y
`ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, igual que ASTEROIDES: el juego sigue razonando en coordenadas
800×600 y los bloques no salen borrosos en pantallas densas.

**El reparto del mundo.** El pozo de 300×600 va centrado; el hueco derecho lleva la caja de la pieza
siguiente; el hueco izquierdo se queda negro a propósito, porque el HUD es del shell y ahí no va nada.

```
800×600
┌───────────────────────────────┐
│         ┌─────────┐   ┌─────┐ │
│         │  pozo   │   │ ███ │ │  ← NEXT, 4×4 celdas
│         │ 300×600 │   │  █  │ │
│         │         │   └─────┘ │
│         └─────────┘           │
└───────────────────────────────┘
  hueco       x=250       hueco
```

### 3.5 — El registro

```ts
// app/components/game-registry.ts
const CaidaGame = dynamic(() => import("@/app/components/caida-game"), {
    ssr: false,
});

export const GAME_ENGINES: Partial<
    Record<string, ComponentType<GameComponentProps>>
> = {
    asteroides: AsteroidesGame,
    caida: CaidaGame,
};
```

`app/components/game-player.tsx` no cambia: ya despacha por `GAME_ENGINES[game.id]` y cae en
`fake-game-player.tsx` cuando no encuentra nada.

### 3.6 — Lo que llega a `PlayerShell`

Las props exactas, sin ninguna nueva:

```tsx
<PlayerShell
    game={game}
    score={snapshot.score}
    lives={snapshot.lives} // 0 → el shell pinta "—"
    level={snapshot.level}
    extraStat={{ label: "LÍNEAS", value: String(snapshot.lines) }}
    paused={status === "paused"}
    over={status === "over"}
    onTogglePause={…}
    onEnd={…}
    onRestart={…}
>
    <canvas className="game-canvas" width={800} height={600} />
</PlayerShell>
```

Este spec **no introduce ninguna estructura persistente nueva**. La fila que se guarda al terminar es la de
`public.scores` que definió SPEC 06, con `game_id = 'caida'`.

---

## 4 — Plan de implementación

Cada paso deja la aplicación compilando y las siete rutas navegables.

1. **`app/lib/engines/caida/constants.ts`.** Los valores de la sección 3.2, con un comentario que diga que
   los números vienen de `references/started-games/03-tetris/game.js` sin tocar, y que los intervalos están
   convertidos de milisegundos a segundos. Las siete matrices de `PIECES` completas; `PIECES[8]`, la
   tuerca, no se copia.
   Verificar: `npx tsc --noEmit` sin errores.

2. **`app/lib/engines/caida/entities.ts`.** `Well`, `Piece`, `randomPiece()` y `drawPreview()` de la
   sección 3.3, con el dibujo del bloque copiado de `drawBlock()` y el origen desplazado a `WELL.x`,
   `WELL.y`.
   Verificar: `npx tsc --noEmit` y `npm run lint` sin avisos.

3. **`app/lib/engines/caida/engine.ts`.** `createCaidaEngine` con:
    - la máquina de estados `ready → playing ⇄ paused → over`;
    - el bucle `requestAnimationFrame` con `dt` capado a `MAX_DT`, que no se ejecuta en `"paused"` ni en
      `"over"`, y que al reanudar reinicia su marca de tiempo para que el primer `dt` valga 0;
    - el acumulador de caída: cada `dropInterval` baja la pieza una fila y, si no puede, la fija;
    - `lockPiece()` = `merge()` + `clearLines()` + puntuar + subir de nivel + `spawn()`, y si la pieza
      recién generada ya choca, `"over"`;
    - la puntuación: `LINE_SCORES[n] * level` al limpiar, `+1` por fila de bajada suave, `+2` por celda de
      caída dura;
    - `level = floor(lines / LEVEL.linesPerLevel) + 1` y
      `dropInterval = max(DROP.min, DROP.base − (level − 1) * DROP.step)`;
    - el pateo al rotar recorriendo `KICKS` y dejando la pieza quieta si ninguno cabe;
    - los listeners de `keydown`/`keyup` en `window`, con el `preventDefault()` de la sección 3.4;
    - pausa automática con `visibilitychange` cuando la pestaña se oculta, y el conjunto de teclas
      pulsadas vaciado al pausar;
    - en `"ready"` y en `"over"` se dibuja un fotograma estático del pozo, para que el overlay no quede
      sobre un rectángulo vacío.

    Verificar: `npx tsc --noEmit` sin errores.

    `app/globals.css` **no se toca en ningún paso**: el mundo es 800×600 y `.game-canvas` de SPEC 05 ya
    cubre `.crt-screen`.

4. **`app/components/caida-game.tsx`.** Componente `"use client"` calcado de `asteroides-game.tsx`:
    - crea el motor en un `useEffect` con `[]` y llama a `destroy()` en la limpieza;
    - guarda `snapshot` y `status` en estado y se los pasa a `<PlayerShell>` como en la sección 3.6;
    - pinta dentro del `.crt-screen` el `<canvas className="game-canvas">` y, encima, el overlay de
      `"ready"`: título, los cinco controles y `▸ PULSA ESPACIO_`. El de pausa lo pinta el shell;
    - lee `matchMedia("(pointer: coarse)")` con `useSyncExternalStore`, y con puntero grueso muestra
      `SE REQUIERE TECLADO` con la lista de controles en vez del overlay de inicio, sin arrancar el motor;
    - conecta `FIN` a `engine.end()`, `PAUSA` a `pause()`/`resume()` y `JUGAR DE NUEVO` a `restart()`.

    Verificar: `/games/caida/play` arranca detenido, `Espacio` empieza la partida y las flechas mueven la
    pieza.

5. **`app/components/game-registry.ts`.** El `dynamic()` y la entrada `caida` de la sección 3.5.
   Verificar: `/games/caida/play` monta el juego real; los otros seis cartuchos sin motor siguen con
   `fake-game-player.tsx`, y el bundle de esas rutas no incluye ningún motor.

6. **La migración del techo de puntuación.** Escribir
   `supabase/migrations/<timestamp>_set_caida_max_score.sql` con el `update` de la sección 3.1, aplicarlo
   con `apply_migration` bajo la descripción `set_caida_max_score`, y renombrar el archivo local al
   timestamp que reporte `list_migrations`, para que el repositorio y el registro remoto queden idénticos.
   Regenerar `app/lib/supabase/types.ts` con `generate_typescript_types` y comprobar que **no** produce
   ningún cambio: es un `update` de datos, no de esquema.
   Verificar: `select max_score from public.games where id = 'caida'` devuelve `1000000`.

7. **`CLAUDE.md`.** Corregir la afirmación de que ASTEROIDES es el único cartucho que juega de verdad:
   ahora son dos, ASTEROIDES y CAÍDA, y quedan seis con el reproductor falso. En la convención de motores,
   añadir que el mundo del motor no tiene que coincidir con el campo de juego —CAÍDA razona en 800×600 y
   dibuja un pozo de 300×600 centrado, para no añadir CSS— y que un juego sin vidas pasa `lives: 0`.
   Verificar: la sección de convenciones nombra `app/lib/engines/caida/`.

8. **Verificación final.** `npm run build`, `npm run lint` y `npx tsc --noEmit`. Recorrer las siete rutas
   (`/`, `/games`, `/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame`, `/about`) comprobando que
   solo cambia el cartucho de CAÍDA, y jugar una partida completa hasta guardar la marca.

---

## 5 — Criterios de aceptación

**El contrato del motor**

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `grep -rn 'from "react"' app/lib/engines` no devuelve nada.
- [ ] No hay ni un texto dibujado dentro del canvas: el HUD lo pinta `PlayerShell`.
- [ ] Con StrictMode montando dos veces, la partida no va al doble de velocidad.
- [ ] Salir de la ruta deja de consumir CPU: no queda ningún `requestAnimationFrame` vivo.
- [ ] Durante la partida las teclas del juego no hacen scroll; con el modal abierto, el input de iniciales
      escribe con normalidad, espacios incluidos.
- [ ] Cambiar de pestaña pausa la partida sola, y al reanudar la pieza no baja de golpe varias filas.
- [ ] La consola del navegador no registra errores ni avisos de hidratación.

**El juego**

- [ ] `/games/caida/play` arranca detenido, con el overlay de inicio y los cinco controles visibles.
- [ ] Pulsar `Espacio` en la pantalla de inicio empieza la partida.
- [ ] El pozo se ve centrado, con sus 10×20 celdas y su retícula; los huecos laterales están negros salvo
      la caja de la pieza siguiente, a la derecha.
- [ ] La caja de la pieza siguiente muestra la forma que vendrá, y cambia justo cuando la pieza en juego se
      fija.
- [ ] `←` y `→` mueven la pieza y no la dejan salir del pozo ni atravesar celdas ocupadas.
- [ ] `↑` y `X` rotan la pieza; pegada a un muro, patea hasta dos celdas, y si ningún pateo cabe, la pieza
      no rota.
- [ ] La sombra marca dónde va a caer la pieza y desaparece al fijarse.
- [ ] `↓` baja la pieza una fila y suma 1 punto.
- [ ] `Espacio` durante la partida fija la pieza al fondo de golpe y suma 2 puntos por celda recorrida.
- [ ] Completar una fila la hace desaparecer y baja una posición todo lo que había encima.
- [ ] Limpiar 1, 2, 3 o 4 filas suma exactamente 100, 300, 500 u 800 puntos multiplicados por el nivel.
- [ ] Cada 10 líneas el nivel sube uno y la caída se acelera; a partir del nivel 11 el intervalo se queda
      en 0,1 s y no baja más.
- [ ] Si la pieza recién generada ya choca, la partida termina y se abre el modal de fin.
- [ ] `P` y `Esc` alternan la pausa, y el overlay `EN PAUSA` es el del shell.
- [ ] `FIN` termina la partida con la puntuación acumulada.
- [ ] `JUGAR DE NUEVO` vacía el pozo y deja puntuación y líneas a 0, el nivel a 1 y la velocidad en su
      valor base.

**El HUD**

- [ ] El HUD muestra `VIDAS —`, porque CAÍDA no tiene vidas.
- [ ] El HUD muestra `LÍNEAS` con el contador de filas limpiadas, y sube al limpiar.
- [ ] `NIVEL` empieza en `01` y sube con cada 10 líneas.

**El catálogo y el leaderboard**

- [ ] `select max_score from public.games where id = 'caida'` devuelve `1000000`.
- [ ] `app/lib/supabase/types.ts` no cambia respecto a antes del spec.
- [ ] Terminar una partida, escribir un nombre y pulsar `GUARDAR PUNTUACIÓN` inserta una fila en
      `public.scores` con `game_id = 'caida'` y muestra `▸ PUNTUACIÓN GUARDADA_`.
- [ ] Esa marca aparece en `/hall-of-fame` y en el panel lateral de `/games/caida` sin esperar ningún
      intervalo, y el récord de la ficha se actualiza tras revalidar `games`.
- [ ] La ficha de `/games/caida` conserva su portada `cover-tetro`, su categoría `PUZZLE` y su botón
      magenta.
- [ ] Los otros seis cartuchos sin motor siguen cayendo en `fake-game-player.tsx`, sin cambios, y
      ASTEROIDES sigue jugándose igual que antes del spec.

---

## 6 — Decisiones tomadas y descartadas

**La geometría**

- **Sí:** mundo de 800×600 con el pozo de 300×600 dibujado centrado en `x = 250`. `.crt-screen` es 4:3 y
  ya tiene el `overflow: hidden`; con esta decisión `app/globals.css` no se toca y `.game-canvas` de
  SPEC 05 vale sin cambios. De paso queda establecido que el mundo de un motor no tiene que coincidir con
  su campo de juego, que es la lección que Arkanoid heredará.
- **No:** canvas de 300×600 con una regla nueva de _letterbox_ en el bloque `NOT PART OF THE PORT`.
  Funciona y daría bloques a proporción exacta, pero añade CSS a un archivo que es un port literal para
  resolver algo que la aritmética del motor resuelve gratis.
- **No:** ensanchar el pozo a 13 columnas para acercarlo a 4:3. Cambia el juego: las líneas serían más
  difíciles y el `LINE_SCORES` del original dejaría de estar calibrado.

**La pieza siguiente**

- **Sí:** dibujarla en el hueco derecho del mismo canvas, en una caja de 4×4 celdas. Son bloques, no texto
  ni HUD, así que la regla 2 de la frontera se cumple, y no hace falta una prop nueva en `PlayerShell` ni
  un segundo canvas que obligaría a cambiar la firma `create<Juego>Engine(canvas, on)`.
- **No:** pasarla como `extraStat` con la letra de la pieza (`SIG: T`). Se pierde la forma, que es la
  información útil, y ocupa la única casilla libre del HUD.
- **No:** quitarla. La pieza siguiente es información de estrategia, no decoración; sin ella el juego
  queda peor que el original.
- **No:** una caja con la etiqueta `NEXT` dibujada al lado. Sería texto dentro del canvas, que es
  exactamente lo que la regla 2 prohíbe. La caja se entiende por su posición.

**El HUD**

- **Sí:** `lives: 0` en el `snapshot`, para que `PlayerShell` pinte `—`. El shell ya lo contempla y así el
  cartucho pasa `snapshot.lives` sin condicionales.
- **Sí:** `lives` se queda en `GameSnapshot` aunque valga siempre 0. La forma del snapshot es la misma para
  todos los motores, y el cartucho no tiene que rellenar huecos.
- **Sí:** `extraStat = { label: "LÍNEAS", value }`. Es el contador que gobierna el nivel y la velocidad, y
  el que el original muestra siempre.
- **No:** `extraStat = null`. Se perdería el contador de líneas, que en Tetris es medio HUD.

**Las piezas y los colores**

- **No:** la pieza tuerca, `PIECES[8]` del original: un anillo 3×3 con el centro hueco. Deja en su fila un
  hueco que no se puede rellenar, así que endurece la partida de una forma que el jugador no puede prever
  ni corregir. Se porta el Tetris de siete piezas.
- **Sí:** las siete piezas repintadas con los tokens de `:root`, uno por pieza y sin repetir:
  `--cyan` la I, `--yellow` la O, `--magenta` la T, `--green` la S, `--bronze` la Z, `--silver` la J y
  `--gold` la L. Con la tuerca fuera hay exactamente siete tonos distinguibles disponibles, así que el
  problema de dos piezas del mismo color no aparece. El canvas deja de ser un recuadro pastel dentro de un
  marco de neón.
- **No:** los ocho pasteles del original (`#4dd0e1`, `#ba68c8`, `#e57373`…). Son los colores del tema del
  juego suelto, no de este.
- **Sí:** los colores como literales hexadecimales en `constants.ts`, con el token que copian anotado al
  lado, igual que en SPEC 05. El tema es oscuro fijo y sin variante clara desde SPEC 01.
- **No:** leer los tokens con `getComputedStyle`, que es lo que hace `drawGrid()` en el original con
  `--grid-line`. Ata el motor al DOM y a los nombres de las variables CSS.
- **Sí:** la sombra de la pieza (`ghostY()` con `globalAlpha` 0.2). Está en el original y la caída dura la
  hace casi obligatoria.

**Los controles**

- **Sí:** dejar la repetición lateral al auto-repeat del navegador, como el original: el movimiento solo
  ocurre en cada `keydown`. Port fiel y cero números inventados.
- **No:** un DAS propio en el motor (repetir cada ~50 ms tras ~170 ms). Se juega mejor, pero son constantes
  que el original no tiene y que habría que calibrar a ojo; si molesta, es un spec de ajuste.
- **Sí:** `Espacio` empieza la partida en `"ready"` y hace caída dura en `"playing"`, el mismo patrón que
  ASTEROIDES usa para arrancar y disparar.
- **Sí:** `preventDefault()` solo mientras el estado es `"playing"`, para que el input de iniciales del
  modal siga aceptando espacios. Es la misma trampa que SPEC 05 documentó.
- **Sí:** aviso `SE REQUIERE TECLADO` con puntero grueso, y controles táctiles fuera de alcance. Igual que
  ASTEROIDES.

**La estructura del port**

- **Sí:** ninguna clase con `update(dt)`. El tiempo en CAÍDA solo mueve un acumulador de caída, que es del
  motor porque necesita el nivel; una pieza que se actualizara sola tendría que conocer la máquina de
  estados.
- **Sí:** `Well.clearLines()` devuelve cuántas filas limpió y el motor puntúa. El original mezcla las dos
  cosas y llama a `updateHUD()` desde dentro, que es justo lo que la frontera prohíbe.
- **No:** el botón `Reiniciar`, el overlay compartido de `PAUSA` / `GAME OVER` y las tres casillas del
  panel lateral del original. Los da `PlayerShell` desde SPEC 05.
- **No:** el botón de tema claro y la clave `localStorage["tetris-theme"]`. El Vault es oscuro fijo desde
  SPEC 01.

**El catálogo**

- **Sí:** reutilizar la fila `caida` tal cual, sin tocar copy, `cat`, `cover`, `color` ni `sort_order`. La
  ficha inventada en SPEC 01 y sembrada en SPEC 06 describe este juego, incluido el «cada 10 líneas».
- **Sí:** bajar `max_score` a 1 000 000. Es el techo que valida `submitScore`, y con el scoring del
  original una partida honesta no se acerca; el defecto de 10 000 000 deja pasar cualquier cosa.
- **No:** bajarlo a 200 000. Demasiado ceñido: un buen jugador podría chocar contra el techo y ver su marca
  rechazada.
- **No:** dejarlo en 10 000 000 para no tocar la base de datos. Ahorra una migración de una línea y deja el
  único control real de puntuaciones abierto de par en par.
- **No:** sembrar puntuaciones falsas de `caida` para que el Salón de la Fama no salga vacío. SPEC 06 ya
  aceptó que un juego sin partidas tiene `best: 0`; la primera marca real llega jugando.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                  | Mitigación                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El doble montaje de StrictMode en desarrollo deja dos bucles `requestAnimationFrame` corriendo y la partida va al doble | `destroy()` es parte del contrato del motor y el `useEffect` lo llama siempre en la limpieza. Hay un criterio de aceptación explícito.                                                                                      |
| El `preventDefault()` del teclado se traga la barra espaciadora del input de iniciales                                  | Solo se aplica mientras el estado es `"playing"`, y con el modal abierto el estado es `"over"`. Criterio de aceptación aparte.                                                                                              |
| Al reanudar tras una pausa larga, el acumulador de caída baja la pieza varias filas de golpe                            | El bucle no corre en `"paused"` y al reanudar reinicia su marca de tiempo, así que el primer `dt` vale 0. Además `MAX_DT` capa cada `dt` a 50 ms.                                                                           |
| El pozo ocupa poco más de un tercio del ancho del marco CRT y los bloques se ven pequeños                               | Es el precio de no añadir CSS, y el pozo escala con el marco: en el tamaño habitual de `.crt-screen` los bloques quedan cerca de los 30 px del original. Si molesta, la regla de _letterbox_ sigue disponible en otro spec. |
| La caja de la pieza siguiente se confunde con parte del campo de juego                                                  | Va separada por 65 px de hueco negro y con el borde `--line`, el mismo que enmarca el pozo. Un criterio de aceptación comprueba que se ve como una caja aparte.                                                             |
| Los literales de `PALETTE` se desincronizan de los tokens de `:root`                                                    | El tema es oscuro fijo y sin variante clara desde SPEC 01, y cada literal lleva anotado el token que copia.                                                                                                                 |
| `matchMedia` leído durante el render rompe la hidratación                                                               | Se lee con `useSyncExternalStore`, igual que en `asteroides-game.tsx`.                                                                                                                                                      |
| La migración local y la remota se quedan con timestamps distintos                                                       | El paso 6 renombra el archivo al timestamp que reporte `list_migrations`, que es la convención que SPEC 06 dejó en `CLAUDE.md`.                                                                                             |
| Quitar la pieza tuerca hace que el juego no sea el que la fuente describe                                               | Aceptado y anotado: `references/started-games/03-tetris/` no se toca, y la decisión con su motivo está en la sección 6. La ficha del catálogo dice «piezas geométricas», que sigue siendo cierto.                           |
| El aleatorio uniforme del original produce rachas largas sin la pieza que hace falta                                    | Aceptado: es el comportamiento de `game.js`. La bolsa de siete está explícitamente fuera de alcance.                                                                                                                        |

---

## 8 — Lo que **no** entra en este spec

- Arkanoid, que sigue esperando en `references/started-games/04-arkanoid/`.
- La pieza tuerca del original.
- Pieza reservada, bolsa de siete, _wall kicks_ de la SRS, T-spins, _lock delay_, combos y back-to-back.
- Repetición de tecla propia (DAS) en el motor.
- Controles táctiles. En móvil el juego avisa de que necesita teclado.
- Sonido, que el original tampoco trae.
- Cambios en `app/globals.css`, en `PlayerShell` o en el despachador.
- Cambios en el copy, la portada, la categoría, el color o el `sort_order` de la fila `caida`.
- Sembrar puntuaciones falsas de `caida`.
- Realtime y paginación del Salón de la Fama.
- La etiqueta `TECLADO / TÁCTIL` de la ficha de detalle.
- Tests automatizados, que siguen pendientes desde SPEC 01.

Cada uno de estos, si llega, va en su propio spec.
