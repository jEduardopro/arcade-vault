# SPEC 05 — El juego Asteroides

> **Estado:** Implemented
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-04
> **Objetivo:** Portar el juego de `references/started-games/02-asteroids/` a un motor TypeScript propio y conectarlo a la pantalla `/games/asteroides/play`, de forma que ASTEROIDES sea el primer cartucho de verdad jugable del Vault.

---

## 1 — Por qué existe este spec

SPEC 01 montó la pantalla del reproductor (`app/components/game-player.tsx`) con un juego fingido: un
`setInterval` de 220 ms que suma puntos al azar, tres cuadrados de CSS que flotan dentro del marco CRT y
un modal de fin que se abre pulsando un botón. No hay juego. Los ocho cartuchos del catálogo llevan a la
misma animación.

Este spec sustituye esa mentira por un juego real en uno de los cartuchos. El código ya existe:
`references/started-games/02-asteroids/game.js` son 511 líneas de canvas puro, sin dependencias, con su
nave, sus asteroides que se parten, sus partículas y un power-up de disparo triple. Lo que no existe es la
forma de meterlo en una aplicación de React sin que se pisen: `game.js` vive de globales de módulo, lee
`document.getElementById('canvas')` al cargarse y arranca un `requestAnimationFrame` que nunca para.

Así que el trabajo real no es traducir el juego, es decidir la frontera. Dónde termina el motor y empieza
React, quién dibuja el HUD, quién decide que la partida acabó y qué pasa con el teclado cuando el modal
pide unas iniciales. Esa frontera se diseña una vez aquí, porque en `references/started-games/` esperan
otros dos juegos —Tetris y Arkanoid— que cruzarán exactamente la misma.

---

## 2 — Alcance

**Dentro:**

- El motor del juego portado a TypeScript en `app/lib/engines/asteroides/`, sin globales de módulo y sin
  ninguna referencia a React.
- El componente cliente `app/components/asteroides-game.tsx`, que monta el `<canvas>`, lo escala y
  traduce los avisos del motor a estado de React.
- `app/components/player-shell.tsx`: la barra `.player-hud`, el marco `.crt`, el overlay de pausa y el
  modal de fin, extraídos del `GamePlayer` actual para que los use tanto el juego real como el
  reproductor falso.
- Un registro `app/lib/engines/registry.ts` que asocia `Game["id"]` con su componente de juego. Si el id
  no está en el registro, la pantalla cae en el reproductor falso de siempre.
- Sustituir la ficha `rocas` del catálogo por la ficha `asteroides`, en la misma posición del array.
- HUD real: puntuación, vidas, nivel y el tiempo restante del power-up `3x` salen del motor.
- Pantalla de inicio dentro del CRT, con los controles y `PULSA ESPACIO`.
- Pausa de verdad con el botón `PAUSA`, con las teclas `P` y `Escape`, y automática al perder el foco de
  la pestaña.
- Fin de partida por el modal existente, con guardado de la puntuación en `localStorage` mediante el
  `saveScore()` que ya existe.
- Aviso `SE REQUIERE TECLADO` dentro del CRT en dispositivos de puntero grueso.
- Repintado del juego con los tokens del tema en lugar del blanco sobre negro del original.
- Una regla nueva en `app/globals.css` para el canvas, dentro del bloque `NOT PART OF THE PORT`.

**Fuera de alcance (para specs futuros):**

- **Tetris y Arkanoid.** El registro queda preparado, pero este spec solo implementa un juego.
- **Controles táctiles.** En móvil el juego se ve pero no se juega, y lo dice.
- **Puntuaciones en Supabase.** SPEC 04 dejó explícitamente fuera las tablas y la RLS. `saveScore()`
  sigue escribiendo en `av_scores` de `localStorage`, y `app/lib/session.tsx` no se toca.
- **El Salón de la Fama y el `best` del catálogo.** `app/lib/scores.ts` sigue con `seededScores()` y la
  ficha sigue anunciando un récord inventado.
- **Sonido.** El original no tiene y aquí no se añade.
- **OVNIs, escudos, vidas extra por puntuación o cualquier mecánica que `game.js` no traiga.**
- **Tabla de récords local dentro de la pantalla del juego.**
- **Guardar la partida a medias.** Al salir de la ruta, la partida se pierde.
- **La etiqueta `TECLADO / TÁCTIL`** de la ficha de detalle, que es un literal compartido por los ocho
  cartuchos desde el port de SPEC 01. Hacerla depender del juego pide un campo nuevo en `Game`.
- **Tests automatizados.** El proyecto sigue sin runner desde SPEC 01.

---

## 3 — Modelo de datos

### 3.1 — La ficha del catálogo

`app/lib/games.ts` mantiene ocho entradas. La sexta, `rocas`, se sustituye en el sitio por:

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Pulveriza rocas a la deriva en gravedad cero.",
  long: "Tu nave triangular flota en un vacío toroidal: sal por un borde y aparecerás por el opuesto. Dispara para partir las rocas grandes en medianas y las medianas en pequeñas, y recoge el módulo 3x para triplicar tu fuego durante cinco segundos.",
  cat: "SHOOTER",
  cover: "cover-rocas",   // se reutiliza el generador CSS que ya existe
  color: "yellow",
  best: 41200,
  plays: "15.6K",
}
```

El tipo `CoverArt` no cambia: la portada `cover-rocas` de `app/globals.css` se queda como está y ahora la
usa esta ficha. `best` y `plays` conservan los valores de la ficha anterior, que son inventados igual que
los de los otros siete cartuchos.

### 3.2 — `app/lib/engines/asteroides/constants.ts`

Todos los números del juego, copiados de `game.js` sin cambiar ninguno, más la paleta.

```ts
export const WORLD = { w: 800, h: 600 } as const; // el mundo sigue siendo 800×600
export const MAX_DT = 0.05; // tope de dt, evita el salto al volver de otra pestaña

export const SHIP = {
    rot: 3.5,
    thrust: 260,
    drag: 0.987,
    radius: 12,
    nose: 21,
    invincible: 3,
    cooldown: 0.2,
} as const;
export const BULLET = { speed: 520, ttl: 1.1, radius: 2 } as const;

export const RADII = [0, 16, 30, 50] as const; // por tamaño 1, 2, 3
export const SPEEDS = [0, 85, 55, 32] as const;
export const POINTS = [0, 100, 50, 20] as const;

export const POWERUP = {
    dropChance: 0.15,
    duration: 5,
    ttl: 12,
    tripleSpread: 0.18,
    guaranteedAfterKills: 5,
} as const;

export const RUN = {
    lives: 3,
    firstWave: 4,
    safeDist: 130,
    deadTimer: 2,
} as const;

// Espejo de los tokens de :root en app/globals.css. El tema es oscuro fijo desde
// SPEC 01, así que los literales no se desincronizan solos.
export const PALETTE = {
    bg: "#0a0a0f", // --bg
    ship: "#00f5ff", // --cyan
    asteroid: "#e6e9ff", // --ink
    bullet: "#f5ff00", // --yellow
    powerUp: "#ff006e", // --magenta
    flame: "#ffcf3a", // --gold
    particle: "230,233,255", // --ink en componentes RGB, para el rgba() con alfa
} as const;
```

### 3.3 — `app/lib/engines/asteroides/entities.ts`

Las cinco clases de `game.js`, con dos cambios mecánicos y ninguno de comportamiento:

- `draw(ctx: CanvasRenderingContext2D)` recibe el contexto en vez de leerlo de una global.
- `Ship.update(dt, input)` recibe el estado del teclado en vez de leer una global `keys`.

```ts
export type Input = { left: boolean; right: boolean; thrust: boolean };

export class Bullet {
    x;
    y;
    vx;
    vy;
    ttl;
    radius;
    dead;
    update(dt);
    draw(ctx);
}
export class Asteroid {
    x;
    y;
    size: 1 | 2 | 3;
    radius;
    verts;
    dead;
    update(dt);
    split(): Asteroid[];
    draw(ctx);
}
export class Ship {
    x;
    y;
    angle;
    vx;
    vy;
    invincible;
    tripleShot;
    dead;
    reset();
    update(dt, input: Input);
    tryShoot(): Bullet[];
    draw(ctx);
}
export class Particle {
    x;
    y;
    vx;
    vy;
    ttl;
    life;
    dead;
    update(dt);
    draw(ctx);
}
export class PowerUp {
    x;
    y;
    vx;
    vy;
    radius;
    ttl;
    dead;
    update(dt);
    draw(ctx);
}
```

La silueta de la nave, el polígono irregular de los asteroides (de 8 a 12 vértices, radio entre el 60 % y
el 100 %), la muesca trasera, la llama del propulsor y el parpadeo de invencibilidad se copian vértice a
vértice. Lo único que cambia es de dónde sale el color.

### 3.4 — `app/lib/engines/asteroides/engine.ts` — la frontera

```ts
export type GameStatus = "ready" | "playing" | "paused" | "over";

// Lo que el motor publica hacia React. Se emite solo cuando algún valor cambia,
// no en cada fotograma.
export type GameSnapshot = {
    score: number;
    lives: number;
    level: number;
    tripleShot: number; // segundos restantes con un decimal; 0 si no está activo
};

export type EngineHandle = {
    start(): void; // "ready" → "playing"
    pause(): void;
    resume(): void;
    end(): void; // fin forzado desde el botón FIN
    restart(): void; // vuelve a "ready" con el campo inicial dibujado
    destroy(): void; // cancela el rAF y retira todos los listeners
};

export function createAsteroidsEngine(
    canvas: HTMLCanvasElement,
    on: {
        snapshot: (s: GameSnapshot) => void;
        status: (s: GameStatus) => void;
    },
): EngineHandle;
```

Reglas de la frontera, que es lo que hace que este módulo sea reutilizable:

1. **El motor no importa React ni conoce el DOM más allá de su `canvas` y de `window` para el teclado.**
2. **El motor no dibuja HUD ni overlays.** `drawHUD()`, `drawLifeIcon()` y `drawOverlay()` de `game.js`
   desaparecen: esa información viaja por `snapshot` y la pinta React.
3. **`snapshot` se emite solo cuando cambia algo.** `score`, `lives` y `level` cambian pocas veces por
   partida; `tripleShot` se redondea a un decimal, así que emite unas diez veces por segundo y solo
   mientras el power-up está activo. Sin ese filtro serían sesenta `setState` por segundo.
4. **El estado interno `'dead'` de `game.js`** —los dos segundos entre perder una vida y reaparecer— no
   sale al exterior: para React la partida sigue en `"playing"`, que es lo que el jugador ve.
5. **`destroy()` es obligatorio** y lo llama el `useEffect` al desmontar. Cancela el `requestAnimationFrame`
   y quita los listeners de teclado y de visibilidad.

### 3.5 — El registro

```ts
// app/lib/engines/registry.ts
import dynamic from "next/dynamic";

export type GameComponentProps = { game: Game };

// Carga diferida: los otros siete cartuchos no descargan el motor.
export const GAME_ENGINES: Partial<
    Record<string, ComponentType<GameComponentProps>>
> = {
    asteroides: dynamic(() => import("@/app/components/asteroides-game"), {
        ssr: false,
    }),
};
```

`app/components/game-player.tsx` queda reducido a un despachador: busca `GAME_ENGINES[game.id]`, monta ese
componente si existe y, si no, monta el reproductor falso. Añadir Tetris será una línea aquí.

Este spec **no introduce ninguna estructura persistente nueva**. La fila que se guarda al terminar es la
`StoredScore` que SPEC 01 ya definió en `app/lib/session.tsx`, con `game: "asteroides"`.

---

## 4 — Plan de implementación

Cada paso deja la aplicación compilando y las siete rutas navegables.

1. **La ficha del catálogo.** Sustituir en `app/lib/games.ts` la entrada `rocas` por la `asteroides` de la
   sección 3.1, en la misma posición del array. Nada más cambia: `CoverArt`, `CATS` y `getGame()` se
   quedan igual.
   Verificar: `/games` sigue mostrando ocho fichas, `/games/asteroides` abre la ficha de detalle con la
   portada de rocas y `/games/rocas` devuelve el 404 de `app/not-found.tsx`.

2. **`app/lib/engines/asteroides/constants.ts`.** Los valores de la sección 3.2, con un comentario que
   diga que los números vienen de `references/started-games/02-asteroids/game.js` sin tocar.
   Verificar: `npx tsc --noEmit` sin errores.

3. **`app/lib/engines/asteroides/entities.ts`.** Las cinco clases de la sección 3.3, con `draw(ctx)` y
   `Ship.update(dt, input)`. El wrap toroidal (`wrap`), `dist`, `rand` y `randInt` van en este mismo
   archivo, no exportados salvo los que el motor necesite.
   Verificar: `npx tsc --noEmit` sin errores y `npm run lint` sin avisos.

4. **`app/lib/engines/asteroides/engine.ts`.** `createAsteroidsEngine` con:
    - la máquina de estados `ready → playing ⇄ paused → over`, más el `'dead'` interno de dos segundos;
    - el bucle `requestAnimationFrame` con `dt` capado a `MAX_DT`, que en `paused` y en `over` no se
      ejecuta (al reanudar se descarta el tiempo transcurrido, así que no hay salto);
    - los listeners de `keydown`/`keyup` en `window`, con `preventDefault()` de `ArrowUp`, `ArrowDown`,
      `ArrowLeft`, `ArrowRight` y `Space` **solo mientras el estado es `"playing"`**;
    - `P` y `Escape` alternan pausa; `Space` en `"ready"` arranca;
    - pausa automática con `visibilitychange` cuando la pestaña se oculta;
    - el escalado: `canvas.width = 800 * dpr`, `canvas.height = 600 * dpr` con `dpr` capado a 2, y
      `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, de modo que todo el juego siga razonando en coordenadas
      800×600;
    - en `"ready"` y en `"over"` se dibuja un fotograma estático del campo, para que el overlay no quede
      sobre un rectángulo vacío.

    Verificar: `npx tsc --noEmit` sin errores.

5. **`app/globals.css` — la regla del canvas.** Al final del archivo, dentro del bloque
   `NOT PART OF THE PORT` que abrió SPEC 03:

    ```css
    .game-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
    }
    ```

    El `.crt-screen` ya tiene `aspect-ratio: 4 / 3` y `overflow: hidden`, que es justo la proporción del
    mundo del juego.
    Verificar: ninguna otra pantalla cambia de aspecto.

6. **`app/components/player-shell.tsx`.** Extraer del `GamePlayer` actual, **sin cambiar su markup ni sus
   clases**, la barra `.player-hud`, el marco `.crt`, el overlay `EN PAUSA` y el modal de fin con el
   guardado de puntuación. Recibe por props `game`, `score`, `lives`, `level`, un `extraStat` opcional
   (`{ label, value }`) para el `3x`, `paused`, `over`, y los manejadores `onTogglePause`, `onEnd` y
   `onRestart`; lo que va dentro de `.crt-screen` llega por `children`.
   En el mismo paso, `game-player.tsx` pasa a usarlo conservando su comportamiento actual.
   Verificar: `/games/caida/play` se ve y se comporta exactamente igual que antes del spec.

7. **`app/components/asteroides-game.tsx`.** Componente `"use client"` que:
    - crea el motor en un `useEffect` con `[]` y llama a `destroy()` en la limpieza, para que el
      doble montaje de StrictMode en desarrollo no deje dos bucles corriendo;
    - guarda `snapshot` y `status` en estado y se los pasa a `<PlayerShell>`;
    - pinta dentro del `.crt-screen` el `<canvas className="game-canvas">` y, encima, el overlay que toque:
      en `"ready"` un `.crt-content` con el título, los tres controles y `▸ PULSA ESPACIO_`; el de pausa lo
      pinta el shell;
    - detecta el puntero grueso con `window.matchMedia("(pointer: coarse)")` **después de montar**, para no
      romper la hidratación, y en ese caso muestra `SE REQUIERE TECLADO` con la lista de controles en lugar
      del overlay de inicio, sin arrancar el motor;
    - conecta `FIN` a `engine.end()`, `PAUSA` a `pause()`/`resume()` y `JUGAR DE NUEVO` a `restart()`, que
      devuelve el juego a `"ready"`;
    - pasa `extraStat={{ label: "3x", value: `${snapshot.tripleShot.toFixed(1)}s` }}` solo cuando
      `tripleShot > 0`.

    Verificar: `/games/asteroides/play` arranca en la pantalla de inicio, Espacio empieza la partida y la
    nave responde a las flechas.

8. **`app/lib/engines/registry.ts` y el despachador.** El registro de la sección 3.5 y `game-player.tsx`
   reducido a elegir entre el componente registrado y el reproductor falso.
   Verificar: `/games/asteroides/play` monta el juego real; los otros siete cartuchos siguen con el
   reproductor falso, y el bundle de esas rutas no incluye el motor.

9. **`CLAUDE.md`.** Documentar la convención nueva: los motores viven en `app/lib/engines/<juego>/`, no
   importan React, publican `snapshot` y `status` por callbacks y siempre exponen `destroy()`; el registro
   de `app/lib/engines/registry.ts` es el punto donde se enchufa un juego nuevo; y `.game-canvas` es la
   segunda regla del bloque `NOT PART OF THE PORT`.
   Verificar: la sección de convenciones menciona `app/lib/engines/` y el registro.

10. **Verificación final.** `npm run build`, `npm run lint` y `npx tsc --noEmit`. Recorrer las siete rutas
    (`/`, `/games`, `/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame`, `/about`) comprobando
    que solo cambia el cartucho de asteroides.

---

## 5 — Criterios de aceptación

**Catálogo y navegación**

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `/games` muestra ocho fichas y una de ellas es `ASTEROIDES`; ya no aparece `ROCAS`.
- [ ] `/games/rocas` devuelve la pantalla de cartucho no encontrado.
- [ ] Los otros siete cartuchos siguen abriendo el reproductor falso, con su puntuación automática y su
      botón `FIN`, exactamente igual que antes del spec.

**El juego**

- [ ] `/games/asteroides/play` arranca detenido, con el overlay de inicio y los tres controles visibles.
- [ ] Pulsar `Espacio` en la pantalla de inicio empieza la partida.
- [ ] `←` y `→` rotan la nave, `↑` la propulsa con su llama y `Espacio` dispara, con un tope de un
      disparo cada 0,2 s.
- [ ] La nave y todo lo que se mueve envuelve por los cuatro bordes: al salir por la derecha aparece por
      la izquierda.
- [ ] Destruir un asteroide grande suma 20 puntos y lo parte en dos medianos; un mediano suma 50 y da dos
      pequeños; un pequeño suma 100 y no se parte.
- [ ] La partida empieza con 3 vidas y 4 asteroides grandes, ninguno a menos de 130 px del centro.
- [ ] Al limpiar la pantalla se pasa de nivel y aparecen `3 + nivel` asteroides.
- [ ] Chocar con un asteroide resta una vida, revienta la nave en partículas y la hace reaparecer a los
      2 s parpadeando durante 3 s, tiempo en el que no puede morir.
- [ ] Al perder la tercera vida se abre el modal `FIN DEL JUEGO` con la puntuación alcanzada, y el juego
      deja de moverse.
- [ ] El módulo `3x` aparece a lo sumo una vez por nivel y, al recogerlo, el disparo pasa a tres balas
      durante 5 segundos.

**HUD y controles de la pantalla**

- [ ] La barra superior muestra puntuación, vidas y nivel reales del motor, y no aparece ningún texto
      dibujado dentro del canvas.
- [ ] Mientras el `3x` está activo, la barra muestra un contador que baja de 5,0 s a 0,0 s y desaparece.
- [ ] `PAUSA` congela el juego y muestra `EN PAUSA`; `REANUDAR` continúa **sin salto**: la nave sigue
      donde estaba y a la misma velocidad.
- [ ] `P` y `Escape` hacen lo mismo que el botón.
- [ ] Cambiar a otra pestaña pausa la partida sola.
- [ ] `FIN` detiene el juego y abre el modal con la puntuación del momento.
- [ ] `JUGAR DE NUEVO` cierra el modal y devuelve el juego a la pantalla de inicio, con 0 puntos, 3 vidas
      y nivel 1.
- [ ] `SALIR` y `VOLVER AL VAULT` navegan y el juego deja de consumir CPU: no queda ningún
      `requestAnimationFrame` vivo.
- [ ] Escribir las iniciales en el modal funciona con normalidad: la barra espaciadora escribe espacios y
      no dispara.
- [ ] `GUARDAR PUNTUACIÓN` añade a `localStorage["av_scores"]` una fila con `game: "asteroides"` y muestra
      `▸ PUNTUACIÓN GUARDADA_`.

**Presentación**

- [ ] Durante la partida, las flechas y la barra espaciadora no hacen scroll en la página; con el juego en
      pausa o el modal abierto, sí.
- [ ] Los colores del juego son los del tema: nave cian, asteroides en `--ink`, balas amarillas, power-up
      magenta y fondo `--bg`. No queda ningún `#fff` ni `#0ff` en el motor.
- [ ] El canvas llena el `.crt-screen` sin deformarse y sin generar scroll horizontal a 800 px ni a
      375 px de ancho.
- [ ] En una pantalla con `devicePixelRatio: 2` las líneas de la nave y de los asteroides se ven nítidas.
- [ ] En un dispositivo de puntero grueso, el CRT muestra `SE REQUIERE TECLADO` con la lista de controles
      y el motor no arranca.

**Lo que no debe haber cambiado**

- [ ] `app/lib/session.tsx`, `app/lib/scores.ts`, `app/hall-of-fame/page.tsx` y `app/components/nav.tsx`
      no tienen ni un cambio.
- [ ] El único añadido a `app/globals.css` es `.game-canvas`, dentro del bloque `NOT PART OF THE PORT`.
- [ ] `app/lib/engines/` no importa React en ningún archivo
      (`grep -rn "from \"react\"" app/lib/engines` no devuelve nada).
- [ ] La consola del navegador no registra errores ni avisos de hidratación en ninguna de las siete rutas.
- [ ] En desarrollo, con StrictMode montando dos veces, la partida no va al doble de velocidad.

---

## 6 — Decisiones tomadas y descartadas

**Encaje en la plataforma**

- **Sí:** ASTEROIDES sustituye a ROCAS en el catálogo, en la misma posición del array. Decisión del
  usuario. ROCAS era una ficha inventada con exactamente la misma temática —«Pulveriza asteroides en
  gravedad cero»—, así que mantener las dos dejaba dos cartuchos gemelos, uno jugable y otro no.
- **No:** añadir ASTEROIDES como novena ficha dejando ROCAS. Descartado por el duplicado.
- **No:** renombrar ROCAS conservando su `id`. El juego es un port propio con su nombre; la ficha entra
  con su identidad, no disfrazada de otra.
- **Sí:** `id: "asteroides"` y título `ASTEROIDES`, en español, igual que `caida`, `serpentina`, `gloton` o
  `invasores`. Los `id` de los juegos ya eran españoles desde SPEC 01; la regla de SPEC 03 sobre URLs en
  inglés se refería a las rutas del sitio (`/about`), no a los slugs del catálogo.
- **Sí:** reutilizar la portada `cover-rocas`. La ficha que la usaba desaparece, así que no hay duplicado
  visual, y evita añadir un generador de portada al `globals.css` que es un port literal.

**Arquitectura**

- **Sí:** port a TypeScript en `app/lib/engines/asteroides/`, con el motor separado del componente. Es lo
  que permite tipar el juego, pasarle el linter y —sobre todo— que React lea la puntuación sin trucos.
- **No:** un `<iframe>` con `index.html` y `game.js` copiados a `public/`. Es la vía más rápida, pero
  aísla el juego: el HUD y el modal tendrían que hablar por `postMessage`, el tema no entra y el marco CRT
  quedaría por fuera de un rectángulo ajeno.
- **No:** cargar `game.js` tal cual con `next/script`. Sin tipos, sin lint, y sus globales (`ship`,
  `score`, `state`) acabarían en `window`.
- **Sí:** `app/lib/engines/` y no `app/lib/games/`. Ya existe `app/lib/games.ts`, y un archivo y una
  carpeta con el mismo nombre hacen que `@/app/lib/games` se resuelva a uno de los dos según reglas que
  nadie recuerda al leer el import.
- **Sí:** un registro `id → componente` con `next/dynamic`. Añadir Tetris será una línea, y los siete
  cartuchos falsos no descargan un motor que no van a usar.
- **No:** un `if (game.id === "asteroides")` dentro de `GamePlayer`. Menos código hoy y una refactorización
  segura mañana.
- **No:** diseñar ya una interfaz de motor común a los tres juegos. `EngineHandle` sale de un caso real;
  generalizarla con un solo juego escrito es inventarse los requisitos de los otros dos. El segundo juego
  dirá qué parte del contrato sobra.
- **Sí:** extraer `PlayerShell`. El modal de fin, el guardado de la puntuación y el marco CRT son de la
  pantalla, no del juego. Sin extraerlos habría que duplicarlos en cada juego nuevo.

**La frontera motor / React**

- **Sí:** el HUD lo pinta React y se elimina `drawHUD()` del canvas. Una sola fuente visual, con la
  tipografía y los colores del sitio, y coherente con las otras seis pantallas.
- **No:** conservar el HUD dentro del canvas, ni duplicarlo en las dos capas.
- **Sí:** `snapshot` solo cuando algo cambia, con `tripleShot` redondeado a un decimal. Emitir en cada
  fotograma serían sesenta renders de React por segundo para pintar un número que casi nunca cambia.
- **Sí:** el modal de la plataforma manda en el fin de partida, y `drawOverlay()` desaparece. Es lo que
  permite guardar la puntuación, que es la razón por la que la pantalla existe.
- **No:** el overlay `GAME OVER` del canvas con `Espacio` para reiniciar. Compite con el modal y deja al
  jugador sin forma de guardar.
- **Sí:** `JUGAR DE NUEVO` devuelve a la pantalla de inicio en vez de arrancar de golpe. Un único punto de
  entrada a la partida, y evita que el `Espacio` que cierra el modal dispare ya dentro del juego.

**Controles**

- **Sí:** pantalla de inicio con `PULSA ESPACIO`. El original arranca solo, lo que en una web significa
  perder una vida mientras lees los controles.
- **Sí:** pausa real —el bucle deja de acumular `dt`—, botón más `P` y `Escape`, más pausa automática al
  ocultarse la pestaña. Sin la automática, el tope de `dt` evita el salto pero la partida ha seguido
  corriendo a ciegas.
- **Sí:** `preventDefault()` de flechas y `Espacio` solo mientras el estado es `"playing"`. Es lo que hace
  que el input de las iniciales del modal funcione como un input normal.
- **No:** escuchar solo con el canvas enfocado. Es más correcto en accesibilidad, pero obliga a hacer clic
  en el canvas antes de jugar, y quien no lo descubra verá un juego que no responde.
- **No:** `overflow: hidden` en toda la pantalla del reproductor. Resuelve el scroll y rompe la maqueta.

**Presentación**

- **Sí:** repintar el juego con los tokens del tema. Los vectores y la jugabilidad son los del original;
  lo único que cambia es la paleta, para que el canvas no sea un recuadro apagado dentro de un marco de
  neón.
- **Sí:** los colores como literales hexadecimales en `constants.ts`, con el token que copian anotado al
  lado. El tema es oscuro fijo desde SPEC 01 y no hay variante clara, así que no se desincronizan.
- **No:** leer los tokens con `getComputedStyle` al crear el motor. Ata el motor al DOM y a los nombres de
  las variables CSS para ganar una flexibilidad que un tema de un solo color no usa.
- **Sí:** mundo fijo de 800×600 escalado por CSS, con el backing store multiplicado por `devicePixelRatio`
  (capado a 2). La física, el wrap y las colisiones quedan idénticos al original en cualquier pantalla, y
  los vectores no salen borrosos en pantallas densas.
- **No:** canvas fluido con el mundo cambiando de tamaño. La dificultad dependería del tamaño de la
  ventana y habría que reposicionar todo al redimensionar.
- **Sí:** el power-up `3x` entra, con su contador en el HUD. Está en `game.js` aunque el README del juego
  no lo mencione, y quitarlo sería empobrecer el port; el contador entra porque el HUD del canvas, que era
  quien lo mostraba, desaparece.
- **Sí:** aviso `SE REQUIERE TECLADO` con puntero grueso, y controles táctiles fuera de alcance. Decir
  «esto necesita teclado» cuesta un overlay; unos controles táctiles decentes son markup, CSS fuera del
  port y reajustar la jugabilidad.

**Persistencia**

- **Sí:** `saveScore()` a `localStorage`, sin tocar `app/lib/session.tsx`. SPEC 04 dejó por escrito que
  las tablas, la RLS y las migraciones se deciden en el spec que cree la primera tabla; meterlas aquí
  convertiría un spec de juego en un spec de base de datos.
- **No:** enchufar el Salón de la Fama ni el `best` de la ficha a las puntuaciones reales. Toca dos
  pantallas que este spec no necesita y depende de la misma decisión de base de datos.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                | Mitigación                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El doble montaje de StrictMode en desarrollo deja dos bucles `requestAnimationFrame` corriendo y el juego va al doble | `destroy()` es parte del contrato del motor y el `useEffect` lo llama siempre en la limpieza. Hay un criterio de aceptación explícito.                                                                            |
| Salir de la ruta sin parar el bucle deja el juego consumiendo CPU en segundo plano                                    | Mismo `destroy()`, más la pausa automática por `visibilitychange`. Criterio de aceptación aparte.                                                                                                                 |
| El `preventDefault()` del teclado se traga la barra espaciadora del input de iniciales                                | Solo se aplica mientras el estado es `"playing"`, y con el modal abierto el estado es `"over"`. Criterio de aceptación explícito.                                                                                 |
| Emitir el estado del juego en cada fotograma dispararía 60 renders de React por segundo                               | `snapshot` se emite solo cuando cambia un valor, y `tripleShot` va redondeado a un decimal.                                                                                                                       |
| `matchMedia` leído durante el render rompe la hidratación                                                             | Se lee en un `useEffect`, después de montar, con el overlay de inicio como estado inicial.                                                                                                                        |
| Las puntuaciones ya guardadas en `av_scores` bajo `game: "rocas"` quedan huérfanas al desaparecer la ficha            | Hoy nadie lee `av_scores` por `id`: `saveScore()` solo escribe y el Salón de la Fama usa `seededScores()`. Las filas quedan como historia inerte. El spec que lea de verdad `av_scores` decidirá si las descarta. |
| Un enlace o marcador a `/games/rocas` deja de funcionar                                                               | `getGame()` devuelve `undefined` y la página llama a `notFound()`, así que sale la pantalla de cartucho no encontrado, no un error. Aceptado: es un catálogo de maqueta sin tráfico externo.                      |
| Los literales de `PALETTE` se desincronizan de los tokens de `:root`                                                  | El tema es oscuro fijo y sin variante clara desde SPEC 01, y cada literal lleva anotado el token que copia. Un criterio de aceptación comprueba que no queda ningún color del original en el motor.               |
| Al reanudar tras una pausa larga, el `dt` acumulado teletransporta la nave                                            | El bucle no corre en `"paused"` y al reanudar reinicia su marca de tiempo, así que el primer `dt` vale 0. Además `MAX_DT` lo capa a 50 ms, igual que el original.                                                 |
| `.game-canvas` rompe la invariante de que `globals.css` es un port literal de la referencia                           | Va al final del archivo, en el bloque `NOT PART OF THE PORT` que ya abrió SPEC 03 con `.terminal-error`, y `CLAUDE.md` lo recoge.                                                                                 |
| El `best: 41200` de la ficha sigue siendo un número inventado que ahora convive con un juego real                     | Aceptado y anotado fuera de alcance: los récords de verdad llegan con el spec de puntuaciones en base de datos. Los otros siete cartuchos están en la misma situación desde SPEC 01.                              |

---

## 8 — Lo que **no** entra en este spec

- Tetris y Arkanoid: el registro queda listo, pero solo se implementa un juego.
- Controles táctiles. En móvil el juego avisa de que necesita teclado.
- Puntuaciones en Supabase, tablas, RLS y migraciones: siguen donde SPEC 04 las dejó.
- El Salón de la Fama y el `best` del catálogo, que siguen con datos inventados.
- Sonido, OVNIs, escudos, vidas extra y cualquier mecánica que `game.js` no traiga.
- Guardar una partida a medias entre visitas.
- La etiqueta `TECLADO / TÁCTIL` de la ficha de detalle.
- Tests automatizados, que siguen pendientes desde SPEC 01.

Cada uno de estos, si llega, va en su propio spec.
