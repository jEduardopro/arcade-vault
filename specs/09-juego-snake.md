# SPEC 09 — El juego Snake

> **Estado:** Implemented
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-09-04
> **Objetivo:** Escribir desde cero un motor TypeScript de Snake que come fruta dibujada con sprites y enchufarlo a un cartucho nuevo `snake`, que sustituye a `serpentina` en el catálogo y es el cuarto juego de verdad jugable del Vault.

---

## 1 — Por qué existe este spec

SPEC 05, SPEC 07 y SPEC 08 portaron los tres juegos que esperaban en `references/started-games/`.
La carpeta se quedó sin código y la receta quedó probada tres veces: tres archivos de motor sin React,
un componente cliente que traduce callbacks a estado, una línea en el registro y `PlayerShell` pintando
todo lo que no es el juego.

SNAKE es el primero que no porta nada, y por eso aprieta el contrato por sitios que los tres anteriores
no tocaron:

- **No hay original.** `references/started-games/snake-assets/` tiene dos archivos y ninguno es un juego:
  `fruits.png`, una hoja de 3790×442 con 22 frutas, y `sprites.js`, un mapa de coordenadas. No hay
  `game.js` del que copiar números, así que cada constante de este spec es una decisión tomada aquí y
  no un valor heredado. Es la prueba de que el contrato de SPEC 05 sirve para diseñar y no solo para
  portar.
- **Es el primer cartucho con un sprite.** SPEC 07 y SPEC 08 tiraron sus spritesheets a propósito, y de
  ahí salió la regla de que ningún motor necesita una compuerta de carga antes del primer frame. Aquí la
  fruta **es** el juego, así que la compuerta entra, y con ella la rama de error que la hace inofensiva:
  si la hoja no carga, la fruta se dibuja con primitivas y la partida arranca igual.
- **Es el primer spec que toca el catálogo con algo más que un `update`.** Los dos anteriores heredaron
  una fila ya sembrada. Este juego se tiene que llamar SNAKE, y la fila sembrada se llama `SERPENTINA` y
  promete exactamente el mismo juego. Una fila nueva y el borrado de la vieja, en la misma migración.

Lo que **no** hay que decidir aquí es nada de puntuaciones ni de reproductor: `PlayerShell`, el flujo de
guardado y el ranking de SPEC 06 funcionan solos en cuanto el id existe en `public.games`.

---

## 2 — Alcance

**Entra:**

- Un motor nuevo en `app/lib/engines/snake/`, con los cuatro archivos de la sección 3: `constants.ts`,
  `entities.ts`, `sprites.ts` y `engine.ts`, sin una sola importación de React.
- Un mundo de 800×600 dividido en una grilla de 20×15 celdas de 40 px, que ocupa la pantalla entera.
- Una serpiente de tres segmentos que crece un segmento por fruta, muere contra los cuatro muros y muere
  al morderse a sí misma.
- Fruta con sprite: seis frutas recortadas de `fruits.png` a un PNG propio en `public/games/snake/`,
  sorteadas en cada aparición, con caída a comida vectorial si la imagen no carga.
- Puntuación de `10 × nivel` por fruta, nivel `floor(frutas / 5) + 1` capado en 10, y velocidad que baja
  de 0.16 s por paso a un suelo de 0.07 s en ese mismo nivel 10.
- Control por flechas y por WASD, con el giro de 180° ignorado y una cola de dos giros.
- El cartucho `app/components/snake-game.tsx` y su entrada en `app/components/game-registry.ts`.
- Una migración que inserta la fila `snake` con `max_score = 50000` y borra la fila `serpentina`.
- La corrección de `CLAUDE.md`: cuántos cartuchos juegan de verdad, y que ya hay un motor con imagen.

**Fuera de alcance (para specs futuros):**

- Sonido. SNAKE es mudo, y BLOQUE BUSTER sigue siendo el único cartucho que suena. El audio de
  plataforma —mute recordado, control en `PlayerShell`— sigue sin construir y es su propio spec.
- Controles táctiles. Con puntero grueso el overlay dice `SE REQUIERE TECLADO`, igual que ASTEROIDES.
- Obstáculos, portales, modo sin muros y power-ups. Solo la grilla vacía, la serpiente y la fruta.
- Récord local o ranking propio dentro del cartucho. Ni un `localStorage`: la marca se guarda por el
  flujo de `PlayerShell` y el ranking es el de SPEC 06.
- Las otras 16 frutas de `fruits.png`, y cualquier valor de puntuación distinto por fruta.
- Reutilizar el arte de `cover-snake` para un `serpentina` reinventado. La fila se borra, no se recicla.

---

## 3 — Modelo de datos

### 3.1 — La fila del catálogo

Es el único spec de juego que **inserta**. `snake` ocupa el hueco de `serpentina`: mismo `sort_order`,
misma `cat`, misma `cover`, mismo `color` y el mismo `plays` sembrado, porque es el mismo cartucho con
el nombre que le corresponde.

```sql
-- supabase/migrations/<timestamp>_replace_serpentina_with_snake.sql
delete from public.games where id = 'serpentina';

insert into public.games (id, title, short, long, cat, cover, color, plays, sort_order, max_score)
values (
    'snake',
    'SNAKE',
    'Crece a base de fruta sin morderte la cola.',
    'Una serpiente de luz recorre la grilla buscando fruta. Cada bocado la alarga y, cada cinco, la grilla acelera y la fruta pasa a valer más. Los cuatro muros matan, y un movimiento en falso la hace devorarse a sí misma.',
    'ARCADE', 'cover-snake', 'green', '9.1K', 2, 50000
)
on conflict (id) do nothing;
```

El borrado es seguro y el orden de las dos sentencias no importa, porque los ids son distintos y
`sort_order` no es único. Tres comprobaciones lo respaldan:

- `select * from public.scores where game_id = 'serpentina'` no devuelve ninguna fila hoy, así que el
  `on delete cascade` de `scores.game_id` no arrastra nada.
- `grep -rn 'serpentina' app/` no devuelve nada: la fila era solo datos, ningún componente la nombra.
- La migración es idempotente. El `delete` de una fila que ya no está es un no-op, y el
  `on conflict (id) do nothing` es el que exige SPEC 06 para toda semilla con id literal.

No hay cambio de esquema: `cover-snake` ya está en el `CHECK` de `cover` y en la unión `CoverArt` de
`app/lib/games.ts`, así que **no** hace falta una novena portada ni sus tres cambios coordinados.
`app/lib/supabase/types.ts` se regenera y tiene que quedar idéntico.

Estado del catálogo antes y después, confirmado hoy contra la base de datos:

| columna      | `serpentina` (se borra) | `snake` (entra)                            |
| ------------ | ----------------------- | ------------------------------------------ |
| `title`      | `SERPENTINA`            | `SNAKE`                                    |
| `cat`        | `ARCADE`                | `ARCADE`                                   |
| `cover`      | `cover-snake`           | `cover-snake`                              |
| `color`      | `green`                 | `green`                                    |
| `sort_order` | `2`                     | `2`                                        |
| `plays`      | `9.1K`                  | `9.1K`                                     |
| `max_score`  | `10000000`              | `50000`                                    |
| marcas       | ninguna                 | ninguna, hasta la primera partida guardada |

El catálogo sigue teniendo **ocho** filas y `/games/serpentina` pasa a devolver 404. Nadie enlazaba a
esa ruta: el cartucho nunca fue jugable y su ficha solo se alcanza desde `/games`.

`max_score` es el techo que `app/actions/scores.ts` lee **en vivo** antes de insertar, un `select`
propio y no el catálogo cacheado, así que surte efecto sin revalidar la etiqueta `games`. La aritmética
de los 50 000 está en la sección 6.

### 3.2 — El recorte de `fruits.png`

`references/started-games/snake-assets/fruits.png` no se toca ni se copia entero: son 585 KB y 22
frutas para usar seis. El asset que sirve la aplicación es un recorte propio en
`public/games/snake/fruits.png`, de **900×160**, con fondo transparente y seis huecos de 150×160.

**Los nombres de `sprites.js` no son fiables; su geometría sí.** Las 22 posiciones que el archivo
declara coinciden al píxel con las que devuelve un análisis del canal alfa de la fila mediana
(`y = 136`, alto 160), así que las `x` y las `w` se pueden usar tal cual. Las etiquetas, en cambio,
están descolocadas: lo que llama `banana` es una manzana, lo que llama `strawberry` es un nabo y lo que
llama `watermelon` es un champiñón. Su propio comentario lo explica —las coordenadas se detectaron por
análisis de píxeles, los nombres se pusieron a mano—, así que las seis frutas de este spec se
identificaron mirando la hoja y no leyendo el archivo.

Cada fruta se centra en su hueco de 150 px, así que la `x` de recorte es `x − (150 − w) / 2`:

| hueco | fruta   | posición real | recorte 150×160 |
| ----- | ------- | ------------- | --------------- |
| 0     | manzana | x 34, w 110   | `+14+136`       |
| 1     | cereza  | x 1400, w 130 | `+1390+136`     |
| 2     | fresa   | x 1228, w 130 | `+1218+136`     |
| 3     | uva     | x 540, w 130  | `+530+136`      |
| 4     | naranja | x 2786, w 110 | `+2766+136`     |
| 5     | limón   | x 2604, w 130 | `+2594+136`     |

La sexta es un limón y no la sandía porque la sandía mide **170 px de ancho**, la única de las 22 que
no cabe en un hueco de 150. Ensanchar los huecos habría arrastrado el tamaño de la hoja y el de
`FOOD_DRAW`; el limón cuesta cero y además reparte mejor el color, porque manzana, cereza y fresa ya
son tres rojos.

Ninguno de los seis recortes invade a su vecina: el hueco más ajustado deja 10 px de margen a cada
lado y la fruta contigua más cercana empieza 40 px después.

Un solo comando lo genera, y su resultado se versiona como cualquier otro asset:

```sh
magick references/started-games/snake-assets/fruits.png \
  \( -clone 0 -crop 150x160+14+136   +repage \) \
  \( -clone 0 -crop 150x160+1390+136 +repage \) \
  \( -clone 0 -crop 150x160+1218+136 +repage \) \
  \( -clone 0 -crop 150x160+530+136  +repage \) \
  \( -clone 0 -crop 150x160+2766+136 +repage \) \
  \( -clone 0 -crop 150x160+2594+136 +repage \) \
  -delete 0 +append -background none \
  public/games/snake/fruits.png
```

`sprites.js` no se copia al proyecto: sus 22 entradas se quedan en `references/` y las seis que
importan viven ya resueltas en `constants.ts`, donde el hueco `i` está siempre en `x = i * 150`.

### 3.3 — `app/lib/engines/snake/constants.ts`

Todos los números del juego. Ninguno viene de un original, así que cada bloque lleva escrito de dónde
sale.

```ts
// El mundo es 800×600 como los otros tres motores, que es el aspect-ratio 4/3
// de .crt-screen: .game-canvas lo cubre y app/globals.css no se toca.
export const WORLD = { w: 800, h: 600 } as const;

// dt capado. Con un paso mínimo de 0.07 s, un dt de 0.05 nunca cabe dos veces
// en un fotograma, así que el acumulador da como mucho un paso por frame.
export const MAX_DT = 0.05;

// 20 × 40 = 800, 15 × 40 = 600. La grilla es el mundo entero.
export const GRID = { cols: 20, rows: 15, cell: 40 } as const;

export const RUN = {
    startLength: 3, // segmentos al empezar
    fruitsPerLevel: 5, // level = floor(frutas / 5) + 1
    maxLevel: 10, // el nivel deja de subir donde la velocidad toca suelo
    pointsPerFruit: 10, // se multiplican por el nivel actual
} as const;

// Segundos por paso. step(1) = 0.16, step(10) = 0.07, y de ahí no baja.
export const SPEED = { start: 0.16, perLevel: 0.01, floor: 0.07 } as const;

// Cola de giros pendientes. Con capacidad 2 un giro en L a máxima velocidad no
// pierde la segunda pulsación; con capacidad 1 sí.
export const TURN_QUEUE_MAX = 2;

// Los seis huecos de public/games/snake/fruits.png, en orden.
export const SHEET = {
    src: "/games/snake/fruits.png",
    slot: { w: 150, h: 160 },
    count: 6,
} as const;

// El sprite se dibuja centrado en la celda, con el 150/160 de su hueco, y sin
// tocar la línea de la grilla: 34 de alto → 34 × 150 / 160 ≈ 32 de ancho.
export const FOOD_DRAW = { w: 32, h: 34 } as const;

// Espejo de los tokens de :root en app/globals.css. El motor no lee CSS.
export const PALETTE = {
    bg: "#0a0a0f",
    grid: "rgba(255, 255, 255, 0.06)", // --line-2
    head: "#00ff88", // --green
    body: "#00cc6a", // --green apagado, para leer la cabeza de un vistazo
    halo: "#ff006e", // --magenta, el resplandor bajo la fruta
} as const;
```

### 3.4 — `app/lib/engines/snake/entities.ts`

Tres piezas, todas con `draw(ctx)` recibiendo el contexto como parámetro, como exige el contrato.

- **`type Cell = { col: number; row: number }`** y
  **`type Direction = "up" | "down" | "left" | "right"`**, con `OPPOSITE` como mapa literal para
  descartar el giro de 180°.
- **`class Snake`.** Guarda `segments: Cell[]` con la cabeza en el índice 0, la `direction` actual y
  la cola `pendingTurns: Direction[]`.
    - `turn(d)` empuja `d` si la cola no está llena, si `d` no es igual a la última dirección
      encolada —o a `direction`, si la cola está vacía— y si no es su opuesta. Un giro contrario es un
      fallo de input, no una muerte.
    - `step(grow: boolean)` saca el primer giro pendiente, calcula la celda nueva, la mete delante y,
      si `grow` es falso, saca la última. Devuelve la celda nueva para que el motor decida si mata.
    - `hits(cell, grow)` es la colisión con el cuerpo. Con `grow` falso ignora el último segmento,
      porque esa celda queda libre en el mismo paso y entrar en ella es legal.
    - `draw(ctx)` pinta cada segmento como un cuadrado redondeado con 3 px de margen dentro de su
      celda: el cuerpo en `PALETTE.body` y la cabeza en `PALETTE.head` con `shadowBlur`.
- **`class Food`.** Guarda su `cell` y el índice de fruta `slot` (0–5).
    - `respawn(free: Cell[], rng)` elige una celda libre y sortea un `slot` nuevo. El motor le pasa la
      lista de celdas libres ya calculada; con 300 celdas recorrerlas es gratis y así la fruta nunca
      aparece bajo la serpiente.
    - `draw(ctx, sheet)` pinta primero el halo magenta —un `radialGradient` del tamaño de la celda— y
      encima delega en `sheet.draw(...)`, que decide entre sprite y vector.
- **`drawGrid(ctx)`**, una función suelta que pinta el fondo y las líneas cada 40 px. No dibuja ni un
  texto: la regla 2 del contrato prohíbe cualquier HUD dentro del canvas.

### 3.5 — `app/lib/engines/snake/sprites.ts`

El cuarto archivo del motor, con el mismo papel que `sound.ts` en BLOQUE BUSTER: aísla el asset para
que `engine.ts` no sepa que existe una imagen.

```ts
export type FruitSheet = {
    /** true cuando la hoja cargó. En false, draw() cae a la fruta vectorial. */
    readonly ready: boolean;
    draw(
        ctx: CanvasRenderingContext2D,
        slot: number,
        cx: number,
        cy: number,
    ): void;
    destroy(): void;
};

export function createFruitSheet(onReady: () => void): FruitSheet;
```

- Crea un `Image`, le asigna `SHEET.src` y llama a `onReady()` tanto en `load` como en `error`. El
  motor arranca cuando esa llamada ocurra, pase lo que pase, así que un 404 no deja un cartucho colgado.
- Con la hoja cargada, `draw` hace un `drawImage` de nueve argumentos desde `slot * 150, 0, 150, 160`
  a un rectángulo de `FOOD_DRAW` centrado en `(cx, cy)`.
- Sin ella, `draw` pinta el núcleo magenta con primitivas —un círculo de radio 12 con `shadowBlur`—,
  que es exactamente lo que dibuja el arte de `cover-snake`. La partida es idéntica; solo cambia el
  pixel.
- `destroy()` suelta los dos handlers y el `src`, para que un desmontaje a mitad de carga no llame al
  `onReady` de un motor que ya no existe.

### 3.6 — `app/lib/engines/snake/engine.ts` — la frontera

`createSnakeEngine(canvas, on): EngineHandle`, con los mismos tipos que
`app/lib/engines/asteroides/engine.ts`:

```ts
export type GameStatus = "ready" | "playing" | "paused" | "over";

export type GameSnapshot = {
    score: number;
    lives: number; // siempre 0: SNAKE no tiene vidas, el shell pinta «—»
    level: number; // 1..10
    length: number; // el único campo propio de este juego
};
```

Lo que hay dentro:

- **La máquina de estados** `ready → playing ⇄ paused → over`. `start()` solo se atiende si la hoja de
  frutas ya resolvió, cargada o fallida.
- **El bucle** `requestAnimationFrame` con `dt` capado a `MAX_DT`, que no corre en `"paused"` ni en
  `"over"`, y que al reanudar reinicia su marca de tiempo para que el primer `dt` valga 0.
- **El acumulador de paso.** `acc += dt` y, mientras `acc >= step(level)`, un paso de la serpiente y
  `acc -= step(level)`. `step(level) = max(SPEED.floor, SPEED.start − SPEED.perLevel × (level − 1))`.
- **El paso**, en este orden: la cabeza nueva sale de `snake.step()`; si se sale de la grilla o
  `snake.hits(...)`, `"over"`; si cae sobre la fruta, `score += RUN.pointsPerFruit × level`, la
  serpiente crece, se recalcula `level = min(RUN.maxLevel, floor(frutas / RUN.fruitsPerLevel) + 1)` y
  la fruta reaparece. Si no queda ninguna celda libre, la partida termina en `"over"`: el tablero lleno
  es el final, no una pantalla de victoria.
- **Los listeners de `keydown` y `keyup` en `window`.** Flechas y WASD giran, `P` pausa, `Espacio` o
  cualquier tecla de dirección arrancan desde `"ready"`. `preventDefault()` **solo mientras
  `status === "playing"`**, y solo sobre esas teclas: con el modal de fin abierto el estado es `"over"`,
  así que el input de iniciales escribe con normalidad, espacios incluidos.
- **Pausa automática** con `visibilitychange` cuando la pestaña se oculta. Al pausar se vacía la cola de
  giros y el acumulador, para que volver de otra pestaña no gaste un giro viejo ni dé dos pasos de golpe.
- **El escalado.** `canvas.width = WORLD.w * dpr` con `dpr` capado a 2, y
  `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, así el juego razona siempre en coordenadas de mundo.
- **Un fotograma estático en `"ready"` y en `"over"`** —grilla, serpiente inicial y fruta— para que el
  overlay no quede sobre un rectángulo negro.
- **`snapshot` solo cuando algo cambia.** Los cuatro campos se mueven a la vez y solo al comer, o sea
  como mucho una vez cada 0.07 s y nunca 60 veces por segundo. No hay ningún valor continuo que redondear.
- **`destroy()`** cancela el `requestAnimationFrame`, quita los tres listeners de `window` y llama a
  `sheet.destroy()`. Sin él, el doble montaje de StrictMode deja dos bucles vivos y la serpiente va al
  doble de velocidad.

El motor no importa React —`grep -rn 'from "react"' app/lib/engines` tiene que seguir sin devolver
nada—, no dibuja ni un texto y no conoce más DOM que su propio canvas y la `window` a la que escucha.
A diferencia de BLOQUE BUSTER, **no** escucha a su canvas: SNAKE no usa el ratón.

`app/globals.css` no se toca en ningún paso. El mundo es 800×600 y `.game-canvas` de SPEC 05 ya lo cubre.

### 3.7 — El registro

Una importación y una entrada en `app/components/game-registry.ts`, como los tres anteriores:

```ts
const SnakeGame = dynamic(() => import("@/app/components/snake-game"), {
    ssr: false,
});

export const GAME_ENGINES: Partial<
    Record<string, ComponentType<GameComponentProps>>
> = {
    asteroides: AsteroidesGame,
    caida: CaidaGame,
    "bloque-buster": BloqueBusterGame,
    snake: SnakeGame,
};
```

`game-player.tsx`, `player-shell.tsx` y las dos rutas de página no se tocan. Los cuatro cartuchos sin
motor siguen cayendo en `fake-game-player.tsx`.

### 3.8 — Lo que llega a `PlayerShell`

`app/components/snake-game.tsx` traduce los callbacks a estado y rellena las props que ya existen. No se
añade ninguna:

| prop            | valor                                                   |
| --------------- | ------------------------------------------------------- |
| `game`          | la fila `snake` que baja de la ruta                     |
| `score`         | `snapshot.score`                                        |
| `lives`         | `0` — el shell pinta `—`, el caso que estrenó CAÍDA     |
| `level`         | `snapshot.level`, de 1 a 10                             |
| `extraStat`     | `{ label: "LARGO", value: String(snapshot.length) }`    |
| `paused`        | `status === "paused"`                                   |
| `over`          | `status === "over"`                                     |
| `onTogglePause` | `pause()` / `resume()`                                  |
| `onEnd`         | `end()`                                                 |
| `onRestart`     | `restart()`                                             |
| `children`      | `<canvas className="game-canvas">` y el overlay `ready` |

El componente sigue a `caida-game.tsx` al pie de la letra: el motor vive en un `useRef` y nunca en
estado, un `useEffect` con dependencias `[]` lo crea y llama a `destroy()` en la limpieza, y
`matchMedia("(pointer: coarse)")` se lee con `useSyncExternalStore` y no con `setState` dentro de un
efecto, o la hidratación se rompe.

---

## 4 — Plan de implementación

Cada paso deja la aplicación compilando y las siete rutas navegables.

1. **El asset.** Generar `public/games/snake/fruits.png` con el comando de la sección 3.2 y versionarlo.
   `references/started-games/snake-assets/` no se toca: es la fuente y se queda como está.
   Verificar: el archivo mide 900×160, tiene canal alfa, y `/games/snake/fruits.png` se sirve con
   `200 image/png`.

2. **`app/lib/engines/snake/constants.ts`.** Los valores de la sección 3.3, con un comentario en cada
   bloque que diga de dónde sale el número, porque aquí no hay un `game.js` que citar.
   Verificar: `npx tsc --noEmit` sin errores, y `step(10)` da exactamente `0.07`.

3. **`app/lib/engines/snake/entities.ts`.** `Snake`, `Food` y `drawGrid` de la sección 3.4, con
   `draw(ctx)` recibiendo el contexto y la cola de giros con su descarte del 180°.
   Verificar: `npx tsc --noEmit` y `npm run lint` sin avisos.

4. **`app/lib/engines/snake/sprites.ts`.** `createFruitSheet()` de la sección 3.5, con `onReady`
   llamado tanto en `load` como en `error` y el dibujo vectorial de reserva.
   Verificar: renombrando el PNG a mano, el juego sigue arrancando y la fruta se ve como un núcleo
   magenta, sin errores en la consola más allá del 404 de la imagen.

5. **`app/lib/engines/snake/engine.ts`.** `createSnakeEngine` con todo lo de la sección 3.6: la máquina
   de estados, el bucle con `dt` capado, el acumulador de paso, la muerte contra muro y contra cuerpo,
   la fruta y el nivel, los listeners con su `preventDefault()` condicionado, la pausa por
   `visibilitychange`, el escalado por `dpr` y `destroy()`.
   Verificar: `npx tsc --noEmit` sin errores y `grep -rn 'from "react"' app/lib/engines` vacío.

6. **`app/components/snake-game.tsx`.** Componente `"use client"` calcado de `caida-game.tsx`:
    - crea el motor en un `useEffect` con `[]` y llama a `destroy()` en la limpieza;
    - guarda `snapshot` y `status` en estado y los pasa a `<PlayerShell>` como en la sección 3.8;
    - pinta dentro del `.crt-screen` el `<canvas className="game-canvas">` y, encima, el overlay de
      `"ready"`: el título, los controles (`← ↑ → ↓ / WASD` mover, `P` pausar) y `▸ PULSA ESPACIO_`.
      El overlay de pausa y el modal de fin los pinta el shell;
    - con puntero grueso muestra `SE REQUIERE TECLADO` con la lista de controles en vez del overlay de
      inicio, y no arranca el motor;
    - conecta `FIN` a `end()`, `PAUSA` a `pause()`/`resume()` y `JUGAR DE NUEVO` a `restart()`.

    Verificar: `/games/snake/play` arranca detenido, `Espacio` o una flecha empiezan la partida, y comer
    una fruta sube score, nivel y `LARGO` en el HUD.

7. **`app/components/game-registry.ts`.** El `dynamic()` y la entrada `snake` de la sección 3.7.
   Verificar: `/games/snake/play` monta el juego real; los otros cuatro cartuchos sin motor siguen con
   `fake-game-player.tsx`, y el bundle de esas rutas no incluye ningún motor.

8. **La migración del catálogo.** Escribir
   `supabase/migrations/<timestamp>_replace_serpentina_with_snake.sql` con el `delete` y el `insert` de
   la sección 3.1, aplicarlo con `apply_migration` bajo la descripción
   `replace_serpentina_with_snake`, y renombrar el archivo local al timestamp que reporte
   `list_migrations`, para que el repositorio y el registro remoto queden idénticos. Regenerar
   `app/lib/supabase/types.ts` con `generate_typescript_types` y comprobar que **no** produce ningún
   cambio: es un movimiento de datos, no de esquema.
   Verificar: `select id, title, sort_order, max_score from public.games order by sort_order` devuelve
   ocho filas, con `snake` / `SNAKE` / `2` / `50000` y sin rastro de `serpentina`.

9. **`CLAUDE.md`.** Tres correcciones:
    - los cartuchos que juegan de verdad pasan de tres a **cuatro** —ASTEROIDES, CAÍDA, BLOQUE BUSTER y
      SNAKE— y quedan cuatro con el reproductor falso;
    - en la convención de motores, añadir `app/lib/engines/snake/` y anotar que es el primero sin
      original en `references/started-games/`, y el primero con un cuarto archivo de assets que no es
      audio;
    - corregir la afirmación de que los dos `.mp3` de BLOQUE BUSTER son «los únicos assets binarios que
      carga un cartucho»: ahora hay también un PNG, y con él la primera compuerta de carga, cuya rama de
      error deja el juego jugable.

    Verificar: la sección de convenciones nombra `app/lib/engines/snake/` y ya no dice «tres».

10. **Verificación final.** `npm run build`, `npm run lint` y `npx tsc --noEmit`. Recorrer las siete
    rutas (`/`, `/games`, `/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame`, `/about`)
    comprobando que solo cambia el cartucho de la posición 2, y jugar una partida completa hasta guardar
    la marca.

---

## 5 — Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `grep -rn 'from "react"' app/lib/engines` no devuelve nada.
- [ ] No hay ni un texto dibujado dentro del canvas: el HUD lo pinta `PlayerShell`.
- [ ] Con StrictMode montando dos veces, la partida no va al doble de velocidad.
- [ ] Salir de la ruta deja de consumir CPU: no queda ningún `requestAnimationFrame` vivo.
- [ ] Durante la partida las teclas del juego no hacen scroll; con el modal abierto, el input de
      iniciales escribe con normalidad, espacios incluidos.
- [ ] Cambiar de pestaña pausa la partida sola, y al reanudar la serpiente da un paso, no varios de golpe.
- [ ] Terminar una partida, escribir un nombre y pulsar `GUARDAR PUNTUACIÓN` inserta una fila en
      `public.scores` y muestra `▸ PUNTUACIÓN GUARDADA_`.
- [ ] Esa marca aparece en `/hall-of-fame` y en el panel lateral de `/games/snake` sin esperar ningún
      intervalo, y el récord de la ficha se actualiza tras revalidar `games`.
- [ ] Los demás cartuchos siguen cayendo en `fake-game-player.tsx`, sin cambios.
- [ ] La consola del navegador no registra errores ni avisos de hidratación.

Y los propios de este juego:

- [ ] `/games` muestra ocho fichas y la de la posición 2 dice `SNAKE`; `/games/serpentina` devuelve 404.
- [ ] `/games/snake` y `/games/snake/play` cargan, y el botón `JUGAR` es la variante verde.
- [ ] La serpiente empieza con 3 segmentos y el HUD marca `score 0`, vidas `—`, nivel `1`, `LARGO 3`.
- [ ] Comer una fruta suma exactamente `10 × nivel`, alarga la serpiente en un segmento y sube `LARGO`.
- [ ] A las 5 frutas el nivel marca `2` y la serpiente va visiblemente más rápida; a las 45 marca `10` y
      a partir de ahí ni el nivel ni la velocidad cambian por muchas frutas más que se coman.
- [ ] Chocar contra cualquiera de los cuatro muros termina la partida y abre el modal.
- [ ] Morderse el cuerpo termina la partida; entrar en la celda que la cola deja libre en ese mismo paso
      no la termina.
- [ ] Pulsar la dirección contraria a la actual no hace nada: ni gira ni mata.
- [ ] Un giro en L a máxima velocidad —dos teclas seguidas entre dos pasos— ejecuta los dos giros, uno
      por paso.
- [ ] La fruta nunca aparece sobre una celda ocupada por la serpiente.
- [ ] Las seis frutas se ven a lo largo de una partida larga, y cada aparición sortea una nueva.
- [ ] Con `public/games/snake/fruits.png` renombrado, la partida arranca igual y la comida se dibuja como
      un núcleo magenta.
- [ ] En un dispositivo de puntero grueso, el cartucho muestra `SE REQUIERE TECLADO` y no arranca el motor.
- [ ] `select count(*) from public.games` devuelve 8, y `app/lib/supabase/types.ts` no cambia tras
      regenerarlo.

---

## 6 — Decisiones tomadas y descartadas

**Sobre el origen del juego**

- **Sí:** motor diseñado de cero en TypeScript contra el contrato de SPEC 05. Es la única opción:
  `references/started-games/snake-assets/` no tiene ningún `game.js`, solo `fruits.png` y un mapa de
  coordenadas.
- **No:** buscar un Snake vanilla fuera del repositorio para portarlo. Añadiría una dependencia de
  procedencia desconocida para un juego cuyas reglas caben en un párrafo.
- **Consecuencia:** cada número de `constants.ts` es una decisión de este spec, no un valor heredado, y
  por eso todos llevan comentario. En los tres ports anteriores el comentario decía «copiado de
  `game.js`».

**Sobre los sprites**

- **Sí:** la fruta se dibuja con sprite. Fue el requisito explícito —«debe comer frutas e ir
  creciendo»— y es lo que distingue a este cartucho de otro rectángulo de color.
- **Sí:** un PNG propio de 900×160 con seis frutas, generado desde `fruits.png`. Pasa de 585 KB a unas
  decenas, y las coordenadas se vuelven `i * 150`, que no hay que consultar en ninguna tabla.
- **No:** copiar `fruits.png` entero. 585 KB para usar seis de 22 recortes que a 40 px el jugador
  apenas distingue.
- **No:** recortar solo la fila mediana completa (3790×160, 22 frutas). Sigue siendo un asset grande
  por variedad que no se aprecia.
- **No:** `sprites.js` dentro del proyecto. Es un `window.SPRITE_ATLAS` de script global, ajeno a los
  módulos de la aplicación, y sus 22 entradas sobran cuando seis viven ya resueltas en `constants.ts`.
- **No:** fiarse de los nombres de `sprites.js`. Su geometría es exacta —las 22 posiciones coinciden al
  píxel con un análisis del canal alfa— pero las etiquetas están descolocadas, y recortar por ellas da
  berenjena, ajo y champiñón en vez de las frutas pedidas. Las seis se identificaron mirando la hoja.
- **Sí:** limón en el sexto hueco, en lugar de la sandía. La sandía mide 170 px, la única de las 22 que
  no cabe en un hueco de 150; ensancharlos habría arrastrado el tamaño de la hoja y el de `FOOD_DRAW`.
  El limón cuesta cero y reparte mejor el color, porque manzana, cereza y fresa ya son tres rojos.
- **No:** huecos de 170 px para conservar la sandía. `FOOD_DRAW` pasaría a 36 px de ancho y dejaría 2 px
  por lado en una celda de 40 en vez de 4.
- **Sí:** compuerta de carga antes del primer frame, con `onReady` disparado también en `error`. Es la
  primera del proyecto y matiza —no rompe— la regla que SPEC 07 y SPEC 08 dejaron escrita: la compuerta
  entra porque la fruta es el juego, y entra con red.
- **Sí:** caída a comida vectorial magenta si la hoja no carga. Son dos ramas de código y evitan que un
  404 deje un cartucho colgado. Es además exactamente lo que dibuja el arte de `cover-snake`.
- **No:** bloquear el overlay `"ready"` con `ERROR DE CARGA`. Convierte un fallo de red en un juego que
  no se puede jugar.
- **No:** asumir que el asset siempre carga. Menos código, a cambio de un canvas mudo el día que falle.
- **Sí:** una fruta al azar en cada aparición. Variedad constante sin afectar a la puntuación.
- **No:** una fruta por nivel. Refuerza la progresión, pero el tablero se vuelve monótono dentro de
  cada nivel.
- **No:** valor distinto por fruta según el tamaño. Añade una tabla de valores y rompe la relación
  simple entre puntuación, largo y nivel de la que sale el techo de `max_score`.

**Sobre el catálogo**

- **Sí:** fila nueva con id `snake`, para que el id, la URL, la carpeta del motor y el título digan
  todos lo mismo. El requisito era que el juego se llamara SNAKE.
- **Sí:** borrar `serpentina` en la misma migración. Prometía este mismo juego y solo hay un
  `cover-snake` entre las ocho portadas fijas; dejarla viva significaría dos fichas con el mismo arte,
  una jugable y otra no. El borrado es gratis: no tiene marcas y ningún componente la nombra.
- **No:** conservar el id `serpentina` y cambiar solo el `title` a `SNAKE`. Era el cambio más barato,
  pero deja `/games/serpentina` y `app/lib/engines/serpentina/` contradiciendo al título en todas
  partes.
- **No:** dejar `serpentina` como cartucho falso y añadir `snake` en `sort_order 8`. Nueve filas para
  ocho juegos, dos de ellas idénticas en promesa.
- **No:** reinventar `serpentina` como otro juego. Exigiría una novena portada, y con ella un
  `alter table` del `CHECK`, una regla `.cover-*` nueva en `app/globals.css` y un miembro nuevo de
  `CoverArt` en `app/lib/games.ts`: tres cambios coordinados para no borrar una fila que nunca se jugó.
- **Sí:** conservar `cat`, `cover`, `color`, `sort_order` y `plays` de la fila que se va. Es el mismo
  cartucho en el mismo hueco.
- **Sí:** copy heredado de `serpentina` y reescrito para las frutas, los muros y la aceleración. Mantiene
  la voz de las otras siete fichas.
- **No:** copy nuevo sin heredar nada. El catálogo tiene una voz y no hay motivo para romperla en una
  ficha.

**Sobre las reglas del juego**

- **Sí:** los cuatro muros matan. Es el Snake canónico, da partidas más tensas y hace predecible el
  techo de puntuación.
- **No:** mundo toroidal como ASTEROIDES. Alarga mucho las partidas y dispara el techo.
- **Sí:** `lives: 0`, que el shell pinta como `—`. SNAKE no tiene vidas, y el contrato ya preveía el
  caso desde CAÍDA.
- **No:** tres vidas conservando la puntuación. Se aleja del juego canónico y alarga las partidas sin
  añadir tensión.
- **Sí:** el nivel del HUD **es** la velocidad. Sube cada 5 frutas, y cada nivel resta 0.01 s al paso,
  así que el jugador ve la razón por la que va más rápido.
- **Sí:** suelo de velocidad en 0.07 s por paso, alcanzado en el nivel 10. Sin suelo, los últimos
  niveles son injugables y dependen del refresco de la pantalla.
- **Sí:** **tope de nivel en 10**, el mismo punto donde la velocidad toca suelo. Esto no salió de las
  preguntas, sale de la aritmética, y es lo que hace correcto el techo de 50 000: con el nivel subiendo
  sin tope, llenar el tablero daría unos 88 500 puntos y una partida perfecta rebotaría contra
  `max_score`. Con el tope, un nivel que ya no cambia nada tampoco se anuncia como si cambiara algo.
- **Sí:** `max_score = 50000`. La partida perfecta —llenar las 300 celdas, o sea 297 frutas— vale
  `10 × (5 × (1+…+9) + 10 × 252) = 27 450` puntos. El techo es 1.8 veces eso: margen para cualquier
  ajuste futuro y puerta cerrada a marcas de seis y siete cifras.
- **No:** `25000`. Queda por debajo de la partida perfecta y la haría rebotar.
- **No:** `100000`. Acepta marcas que el juego no puede producir.
- **Sí:** puntuación `10 × nivel` por fruta. Comer tarde vale más y premia sobrevivir.
- **Sí:** flechas y WASD, las dos a la vez. No cuesta nada y ahorra al jugador adivinar.
- **Sí:** el giro de 180° se ignora. Morderse el cuello es un fallo de input, no una decisión del
  jugador.
- **No:** que el giro de 180° mate. Fiel a algunas versiones clásicas, pero castiga un error que el
  propio juego provoca a alta velocidad.
- **Sí:** cola de dos giros. Es lo que hace que un giro en L a máxima velocidad ejecute las dos
  pulsaciones. Con capacidad 1 se pierde la segunda.
- **Sí:** el tablero lleno termina la partida en `"over"`, sin pantalla de victoria. Es la misma
  decisión que tomó SPEC 08: `PlayerShell` solo conoce `over`.
- **Sí:** arrancar con `Espacio` o con cualquier tecla de dirección. Lo primero por coherencia con
  ASTEROIDES y BLOQUE BUSTER, lo segundo porque en este juego la primera flecha es un movimiento y
  perderla se siente como un fallo. Decisión tomada aquí por coherencia, no preguntada.

**Sobre el reparto de archivos**

- **Sí:** un cuarto archivo, `sprites.ts`, en vez de meter el `Image` en `engine.ts`. Es el mismo papel
  que `sound.ts` en BLOQUE BUSTER: aísla el asset para que el motor no sepa que existe una imagen.
- **Sí:** grilla de 40 px, 20×15. La fruta se dibuja a 34 px y se lee dentro del marco CRT.
- **No:** celdas de 25 o de 20 px. Más espacio para maniobrar, pero el sprite deja de notarse y la
  fruta vuelve a ser un punto de color, que es justo lo que este spec quería evitar.
- **No:** tocar `app/globals.css`. El mundo es 800×600, el 4:3 exacto de `.crt-screen`, y `.game-canvas`
  de SPEC 05 ya lo cubre.

---

## 7 — Riesgos identificados

| Riesgo                                                                            | Mitigación                                                                                                                                                           |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El recorte del PNG es un paso manual y nadie lo verifica hasta que se ve el juego | El paso 1 del plan comprueba dimensiones (900×160) y canal alfa antes de escribir una línea de motor, y el comando queda escrito en la sección 3.2 para repetirlo.   |
| `fruits.png` no carga y el cartucho se queda en negro                             | `onReady` se dispara también en `error`, y la fruta cae a primitivas. Hay un criterio de aceptación que lo prueba renombrando el archivo.                            |
| Borrar `serpentina` rompe algún enlace                                            | `grep -rn 'serpentina' app/` no devuelve nada y la fila no tiene marcas. La ficha solo se alcanzaba desde `/games`, que se regenera del catálogo.                    |
| El acumulador da varios pasos en un fotograma tras un parón                       | `dt` capado a `MAX_DT = 0.05`, que es menor que el paso mínimo de 0.07 s, así que nunca cabe dos veces. La pausa por `visibilitychange` además vacía el acumulador.  |
| Con la serpiente muy larga, buscar las celdas libres en cada fruta se nota        | Son 300 celdas como máximo y solo se recorren al comer, o sea una vez cada varios segundos. Si alguna vez pesara, la lista se mantiene incremental.                  |
| El tope de nivel en 10 hace que el HUD parezca congelado en partidas largas       | Es deliberado y está en la sección 6: el nivel deja de subir donde deja de cambiar algo. Lo que sigue moviéndose es `LARGO`, que es la métrica de orgullo del juego. |

---

## 8 — Lo que **no** entra en este spec

- **Sonido.** SNAKE es mudo. BLOQUE BUSTER sigue siendo el único cartucho que suena, y el audio de
  plataforma —mute recordado, control en `PlayerShell`, silenciar los otros motores— es su propio spec.
- **Controles táctiles.** Ni swipe ni botones en pantalla: con puntero grueso el cartucho dice
  `SE REQUIERE TECLADO`, igual que ASTEROIDES.
- **Obstáculos, portales, modo sin muros y power-ups.** Solo la grilla vacía, la serpiente y la fruta.
- **Récord local o ranking dentro del cartucho.** Ni un `localStorage`: la marca se guarda por el flujo
  de `PlayerShell` y el ranking es el de SPEC 06.
- **Las otras 16 frutas** de `fruits.png`, y cualquier puntuación distinta por fruta.
- **Una portada nueva.** `snake` reutiliza `cover-snake`, y las ocho clases de portada siguen siendo
  ocho.
- **Los cuatro cartuchos que siguen sin motor** —`gloton`, `invasores`, `ranaria`, `duelo-pixel`—, que
  se quedan con `fake-game-player.tsx`.

Cada uno de ellos, si llega, va en su propio spec.
