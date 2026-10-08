# SPEC 10 — La costura de skins

> **Estado:** Implemented (parcial: solo ASTEROIDES)
> **Depende de:** SPEC 01, SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-09-17
> **Implementado:** 2026-09-17, pasos 1-4, 8 y 9. Los pasos 5, 6 y 7 —
> CAÍDA, BLOQUE BUSTER y SNAKE— siguen pendientes por una razón mecánica y no
> por recorte: esos tres motores no tienen `skins.ts`, y este spec dice
> explícitamente que escribirlo es trabajo del agente `skin-designer`, no de
> aquí. Cuando esas paletas existan, los pasos son los mismos.
> **Objetivo:** Hacer que los motores pinten con una paleta recibida por parámetro en vez de con la constante `PALETTE` que importan, y dar al jugador un selector de skin en la pantalla de juego.

---

## 1 — Por qué existe este spec

El agente `skin-designer` escribe paletas: `app/lib/skins.ts` con los tres ids y
`app/lib/engines/<juego>/skins.ts` con los colores de cada uno. Hoy esos archivos no
los lee nadie.

La razón es que los cuatro motores importan `PALETTE` directamente de su
`constants.ts` — 47 referencias en `app/lib/engines/` — y las cuatro fábricas reciben
`(canvas, callbacks)` y nada más. Entre una paleta y un frame pintado no hay ningún
hueco por donde meter una elección del jugador.

Este spec abre ese hueco. No diseña ningún color: los colores ya están medidos y
registrados en `references/game-skins.md`, y `clasico` es copia byte por byte de la
`PALETTE` de hoy, así que al terminar este spec la pantalla se ve exactamente igual
hasta que alguien pulse otra opción.

Es además el spec que por fin usa `.gp-themer` y sus `swatch`, que `app/globals.css`
arrastra desde SPEC 01 sin ningún markup que las aplique.

---

## 2 — Alcance

**Entra:**

- Un tercer parámetro `skin: SkinId` en `createAsteroidesEngine`, `createCaidaEngine`,
  `createBloqueBusterEngine` y `createSnakeEngine`.
- Un método `setSkin(skin: SkinId)` en el `EngineHandle` de los cuatro motores, para
  cambiar de skin sobre un motor vivo sin volver a montarlo.
- `entities.ts` de los cuatro juegos recibiendo la paleta como argumento de `draw()`
  en vez de importar la constante del módulo.
- Los dos literales fugados de `snake/entities.ts` (`rgba(255, 0, 110, …)` en el halo
  de la fruta) derivados de la paleta.
- Los radios de desenfoque saliendo de `bloque-buster/constants.ts` (`GLOW`) y del `12`
  suelto de `snake/entities.ts` hacia el bloque `glow` de cada paleta.
- Un store de preferencia en `app/lib/skin-store.tsx`, del mismo patrón que
  `app/lib/session.tsx`.
- El selector de skin en `app/components/player-shell.tsx`, reutilizando `.gp-themer`.
- Escribir `app/lib/engines/<juego>/skins.ts` para los tres cartuchos que aún no lo
  tienen (`caida`, `bloque-buster`, `snake`) **no** entra aquí: lo hace el agente
  `skin-designer`, y este spec solo consume lo que exista.

**Fuera de alcance (para specs futuros):**

- Cualquier cuarto skin. Los ids son tres y están cerrados en `app/lib/skins.ts`.
- Un skin claro. La luminancia del fondo se queda en ≤ 0.05.
- Tocar `app/globals.css`. Todo lo que el selector necesita ya está portado.
- Llevar el skin al resto del sitio (nav, catálogo, hall of fame). Aquí solo pinta el
  canvas del cartucho.
- Persistir la preferencia en Supabase. Un skin no es dato de catálogo.
- Sonido, mute recordado y cualquier otra prop nueva del shell (sigue en SPEC 08).

---

## 3 — Modelo de datos

Ninguna tabla cambia y ninguna migración se toca. Las estructuras nuevas son tres.

**El id compartido**, ya escrito en `app/lib/skins.ts`:

```ts
export type SkinId = "clasico" | "neon" | "retro";
export const DEFAULT_SKIN: SkinId = "clasico";
```

**La paleta por motor**, ya escrita en `app/lib/engines/asteroides/skins.ts`. Su forma
es la que ya tenía la `PALETTE` de ese juego, y las cuatro difieren a propósito:

```ts
// asteroides: particle son componentes RGB sueltos, porque entities.ts los
// interpola en un rgba() con alpha vivo.
export type Palette = {
    bg: string;
    ship: string;
    asteroid: string;
    bullet: string;
    powerUp: string;
    flame: string;
    particle: string; // "230, 233, 255"
    glow: { ship: number; asteroid: number; /* … */ particle: number };
};
export const SKINS: Record<SkinId, Palette>;
```

`caida` conserva su array `pieces` indexado por `Cell` — índice 0 es el `null` de
relleno — y su `ghostAlpha`, que es un número y no un color. `bloque-buster` conserva
`blocks` indexado por **nombre** de color, con `red` pintando bronce. `snake` conserva
sus cinco claves. Ninguna se armoniza con las otras.

**La preferencia**, en `app/lib/skin-store.tsx`:

```ts
const SKIN_KEY = "av_skin"; // localStorage
function getSnapshot(): SkinId; // valor cacheado, estable entre renders
function getServerSnapshot(): SkinId; // DEFAULT_SKIN, siempre
function setSkin(next: SkinId): void; // escribe y notifica
export function useSkin(): [SkinId, (next: SkinId) => void];
```

Convenciones:

- Un valor guardado que no pase `isSkinId()` se trata como ausente y cae a
  `DEFAULT_SKIN`; un `av_skin` viejo no puede romper la pantalla.
- El snapshot de servidor **tiene que ser** `DEFAULT_SKIN`. Si devolviera lo que hay en
  `localStorage` el primer render de cliente no coincidiría con el del servidor y React
  reportaría un desajuste de hidratación — es la misma razón por la que
  `app/lib/session.tsx` sirve `null`.

---

## 4 — Plan de implementación

1. **`app/lib/skin-store.tsx`.** Módulo `"use client"` con el store sobre
   `localStorage["av_skin"]`, leído por `useSyncExternalStore`. Copia la forma de
   `app/lib/session.tsx`: `subscribe`, `getSnapshot` cacheado, `getServerSnapshot`
   devolviendo `DEFAULT_SKIN`, y un `try/catch` alrededor de `localStorage` para el modo
   privado. Prueba manual: en la consola, `localStorage.setItem("av_skin","retro")` y
   recargar no rompe nada todavía.

2. **ASTEROIDES, `entities.ts`.** Cambiar la firma de `draw(ctx)` a
   `draw(ctx, palette)` en `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle`, y
   sustituir cada `PALETTE.x` por `palette.x`. El `rgba(${PALETTE.particle}, …)` de
   `Particle.draw` pasa a `rgba(${palette.particle}, …)`. Quitar el import de `PALETTE`.
   Prueba manual: `npx tsc --noEmit` señala exactamente las llamadas de `engine.ts`.

3. **ASTEROIDES, `engine.ts`.** Tercer parámetro `skin: SkinId = DEFAULT_SKIN` en
   `createAsteroidesEngine`, una variable `palette = SKINS[skin]` pasada a cada `draw()`
   y usada en el `fillStyle` del borrado de frame, y un `setSkin(next)` en el handle que
   reasigna `palette`. Prueba manual: el juego se ve idéntico a antes.

4. **`app/components/asteroides-game.tsx`.** Leer `useSkin()` y pasar el valor a la
   fábrica. El `useEffect` de montaje **mantiene su array de dependencias vacío**: el
   skin no entra ahí. Un segundo `useEffect`, dependiente de `skin`, llama a
   `handle.setSkin(skin)` sobre el handle guardado en un ref. Prueba manual: cambiar
   `av_skin` a mano y recargar pinta ámbar.

5. **CAÍDA**, pasos 2–4 aplicados a `caida/`, incluido `ghostAlpha` viajando dentro de
   la paleta.

6. **BLOQUE BUSTER**, pasos 2–4 aplicados a `bloque-buster/`, y `GLOW` borrado de
   `constants.ts`: sus tres valores (`paddle: 14`, `ball: 10`, `block: 6`) pasan al
   bloque `glow` de `clasico`, que es donde tienen que estar para que `neon` pueda
   subirlos.

7. **SNAKE**, pasos 2–4 aplicados a `snake/`, con dos arreglos que solo este juego
   necesita: el `12` literal de `paintSegment(ctx, segments[0], PALETTE.head, 12)` sale a
   `palette.glow.head`, y las dos paradas del gradiente del halo de la fruta
   (`"rgba(255, 0, 110, 0.35)"` y `"rgba(255, 0, 110, 0)"`) se derivan de la paleta en vez
   de estar escritas a mano. Mientras ese literal siga ahí la fruta es magenta en los tres
   skins y `retro` es mentira.

8. **El selector en `app/components/player-shell.tsx`.** Un `.gp-themer` bajo el marco
   CRT con tres `.swatch`, una por skin, `.active` en la actual, que llaman al setter del
   store. No se añade ninguna clase nueva a `app/globals.css`. Prueba manual: pulsar una
   swatch repinta el canvas sin reiniciar la partida ni perder la puntuación.

   Al implementarlo, `skin` y `onSkinChange` quedaron como props **opcionales** del
   shell, y el selector solo se pinta cuando llegan las dos. Es lo que evita que los
   cartuchos sin paletas —los tres de los pasos 5-7, y los cuatro que todavía montan
   `fake-game-player.tsx`— enseñen tres swatches que no pintarían nada.

9. **Documentación.** Actualizar `CLAUDE.md` con la costura ya construida y
   `references/implemented-games.md` con la nota de que cada cartucho tiene tres skins.

---

## 5 — Criterios de aceptación

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] `grep -rn 'from "react"' app/lib/engines` sigue devolviendo cero líneas.
- [ ] `grep -rn 'PALETTE' app/lib/engines/*/entities.ts` devuelve cero líneas.
- [ ] `grep -rn 'rgba(255, 0, 110' app/lib/engines/snake/entities.ts` devuelve cero líneas.
- [ ] Con `av_skin` ausente, los cuatro juegos se ven píxel a píxel como antes del spec.
- [ ] Pulsar la swatch `RETRO` durante una partida en curso cambia los colores sin
      reiniciar la partida, sin perder la puntuación y sin pausar.
- [ ] La elección sobrevive a una recarga de la página.
- [ ] La consola no muestra ningún aviso de desajuste de hidratación al cargar
      `/games/asteroides/play` con un skin guardado distinto del predeterminado.
- [ ] Montar y desmontar la pantalla en StrictMode no deja dos bucles corriendo: el
      `destroy()` del handle sigue llamándose en la limpieza del `useEffect`.
- [ ] En `retro`, las siete piezas de CAÍDA y los siete bloques de BLOQUE BUSTER se
      distinguen entre sí en una captura de pantalla.
- [ ] Ningún archivo de `supabase/migrations/` cambia, y `app/globals.css` tampoco.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** tercer parámetro con valor por defecto `DEFAULT_SKIN`. Las cuatro llamadas
  actuales siguen compilando durante los pasos intermedios, así que cada paso del plan
  queda commiteable por separado.
- **Sí:** `setSkin()` en el handle. El `useEffect` de montaje tiene el array de
  dependencias vacío a propósito: meter `skin` ahí destruiría y recrearía el motor en
  cada cambio, perdiendo la partida, y en StrictMode el doble montaje lo haría dos veces.
- **No:** re-crear el motor al cambiar de skin. Es la alternativa barata y cuesta la
  partida en curso.
- **Sí:** la paleta como argumento de `draw()`. Es el mismo movimiento que SPEC 05 hizo
  con `ctx`: la entidad no busca su contexto, se lo dan.
- **No:** un objeto `palette` guardado como campo de cada entidad. Serían cuatro copias
  del mismo puntero que habría que actualizar una a una en `setSkin()`.
- **Sí:** `localStorage` bajo `av_skin`, con `useSyncExternalStore`. Es el patrón que ya
  existe en `app/lib/session.tsx` y no añade dependencias.
- **No:** cookie ni columna en Supabase. Un skin no es dato de catálogo y `public.games`
  no describe ninguno; una cookie obligaría a tocar `proxy.ts`, que aún no existe.
- **Sí:** el selector vive en `player-shell.tsx`. Es el cromo de la pantalla, como el HUD
  y el overlay de pausa; un juego no debe saber que existe.
- **Sí:** reutilizar las clases de `.gp-themer` del port. Sus modificadores se llaman
  `neon`, `vapor` y `cabinet` porque son nombres de la plantilla y no ids de skin; el
  mapeo es `clasico → .neon` (punto cian, el acento propio del Vault), `neon → .vapor`
  (punto magenta, el look empujado) y `retro → .cabinet` (punto amarillo, lo más cercano
  al ámbar del fósforo).
- **No:** renombrar esas clases en `app/globals.css`. Es un port literal y CLAUDE.md
  prohíbe editarlo.
- **Sí:** el bloque `glow` vive en la paleta. `neon` se define por tener más bloom, así
  que el radio es un valor de skin y no de tuning; en `clasico` vale lo de hoy, y `0`
  donde hoy no hay brillo.

---

## 7 — Riesgos identificados

| Riesgo                                                               | Mitigación                                                                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Desajuste de hidratación al leer la preferencia                      | `getServerSnapshot()` devuelve `DEFAULT_SKIN` siempre; el skin guardado entra justo después de hidratar.              |
| `skin` colado en las dependencias del `useEffect` de montaje         | Criterio de aceptación explícito: cambiar de skin en partida no la reinicia.                                          |
| `shadowBlur` sin resetear que se filtra al resto del frame           | `snake/entities.ts` ya envuelve su pintado; al mover el radio a la paleta hay que conservar ese `save()`/`restore()`. |
| Un `av_skin` viejo o manipulado                                      | `isSkinId()` valida y cae a `DEFAULT_SKIN`.                                                                           |
| Los tres cartuchos sin `skins.ts` todavía                            | El tercer parámetro tiene valor por defecto, así que un motor sin paletas sigue compilando y pintando `clasico`.      |
| Colisión de numeración con los borradores de `specs/game-jam/ducks/` | Aquellos dos también dicen SPEC 10; si se promociona uno, se renumera al promocionarlo, no aquí.                      |

---

## 8 — Lo que **no** entra en este spec

- Diseñar colores. Los diseña el agente `skin-designer` y viven en `skins.ts`.
- Un cuarto skin o un skin claro.
- Tocar `app/globals.css`, `supabase/migrations/` o el catálogo.
- Llevar el skin fuera del canvas: nav, tarjetas y leaderboard se quedan como están.
- Sonido, mute recordado o cualquier otra prop nueva del shell.

Cada una de esas cosas, si llega, va en su propio spec.
