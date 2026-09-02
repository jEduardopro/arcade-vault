# SPEC 02 — Landing: el Home de Arcade Vault

> **Estado:** Approved
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-02
> **Objetivo:** Portar `references/templates/home-about/home.jsx` a la ruta `/` y mover la Biblioteca a `/games`, dejando la landing como portada del sitio.

---

## 1 — Por qué existe este spec

SPEC 01 dejó `/` ocupado por la Biblioteca porque la referencia de entonces no tenía landing: el
`nav.jsx` original mandaba el logo a `biblioteca`. La nueva referencia
(`references/templates/home-about/`) sí la tiene, y su `nav.jsx` manda el logo a `home` y añade un
enlace **Inicio** antes de **Biblioteca**. Es decir: la portada del sitio ya no es el catálogo.

Este spec porta esa landing y hace el hueco: la Biblioteca baja a `/games`, que es el segmento donde
ya viven `/games/[id]` y `/games/[id]/play`.

El `styles.css` nuevo es un **superconjunto exacto** del actual: 794 líneas añadidas, **cero
eliminadas ni modificadas**. Portarlo es un `append`, no una migración.

---

## 2 — Alcance

**Dentro:**

- `/` pasa a ser la landing, con las siete secciones de `home.jsx` en su orden: hero, «¿POR QUÉ
  ARCADE VAULT?», «JUEGOS DISPONIBLES AHORA», estadísticas, «ACTIVIDAD EN VIVO», «PRECIOS» y el CTA final.
- La Biblioteca completa de SPEC 01 (hero `ARCADE VAULT` + `LibraryGrid`) se mueve intacta a `/games`.
- `app/globals.css` se re-porta desde `references/templates/home-about/styles.css` completo.
- El Nav gana el enlace **Inicio** y el logo apunta al Home.
- Todos los enlaces internos que hoy apuntan a `/` para «volver a la biblioteca» pasan a `/games`.
- Los datos mock del Home (features, ticker, top jugadores, estadísticas, FAQ, plan) en `app/lib/home.ts`.
- Animación de entrada por scroll con un componente cliente `<Reveal>` que respeta `prefers-reduced-motion`.
- `auth-form.tsx` acepta `?tab=signup` para abrir directamente la pestaña de registro.

**Fuera de alcance (para specs futuros):**

- La página **Acerca de** (`home-about/about.jsx`): héroe, highlights, divisor pixelado y formulario
  de contacto con validación y terminal de éxito. Su CSS entra ya con el re-port, pero no se añade ni
  la ruta ni el enlace en el Nav, para no dejar un enlace a un 404.
- El mando de arcade (`.gp-*`, `.gp-themer`, `.score-pop`) que trae el CSS nuevo. No lo usa ninguna de
  las dos pantallas de la referencia; queda como CSS disponible sin componente.
- Que la «ACTIVIDAD EN VIVO» sea real o rote en el cliente. Es una tabla estática.
- Autenticación real. `?tab=signup` solo preselecciona una pestaña; el formulario sigue siendo falso.
- Redirección o `redirect()` desde `/` hacia `/games`. `/` sigue existiendo, ahora con otro contenido.
- Soporte de `prefers-reduced-motion` en el resto del tema (sigue pendiente desde SPEC 01).
- Tests automatizados. El proyecto no tiene runner configurado.

---

## 3 — Modelo de datos

Un módulo nuevo, `app/lib/home.ts`. Son los literales de `home.jsx` tipados; no hay API ni base de
datos. La única cifra derivada es el número de juegos.

```ts
// app/lib/home.ts
import { GAMES } from "@/app/lib/games";

export type AccentColor = "cyan" | "magenta" | "yellow" | "green";
export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export type HomeFeature = {
  icon: FeatureIconKind;
  title: string;   // "JUEGOS CLÁSICOS"
  desc: string;
  color: AccentColor;
};

export type TickerRow = {
  player: string;  // "NEONFOX"
  game: string;    // "Caída"
  score: number;   // 184220
  ago: string;     // "hace 2 min"
  color: AccentColor;
};

export type TopRow = {
  rank: number;    // 1..5
  player: string;
  score: number;
};

export type HomeStat = {
  n: string;       // "8+", "MILES", "GLOBAL"
  unit: string;    // "JUEGOS"
  sub: string;     // "Y CONTANDO"
};

export type FaqItem = { q: string; a: string };

export const HOME_FEATURES: readonly HomeFeature[];   // los 4 de home.jsx
export const HOME_TICKER: readonly TickerRow[];       // las 7 filas
export const HOME_TOP: readonly TopRow[];             // las 5 filas
export const HOME_STATS: readonly HomeStat[];         // 3; el primero usa `${GAMES.length}+`
export const HOME_FAQ: readonly FaqItem[];            // las 3 preguntas
export const PLAN_PERKS: readonly string[];           // los 6 «✔ …» del plan
export const PREVIEW_COUNT = 6;                       // GAMES.slice(0, PREVIEW_COUNT)
```

Convenciones:

- Los números se pintan con `formatScore` de `app/lib/scores.ts`, nunca con `toLocaleString("es-ES")`,
  por el mismo motivo de hidratación que documentó SPEC 01.
- `HOME_STATS[0].n` es `` `${GAMES.length}+` ``, no el `"12+"` literal de la referencia: la cifra sale
  del catálogo y no se desincroniza al añadir juegos.
- El resto de los literales se copian palabra por palabra, incluidos los nombres de juego del ticker
  («Bloque Buster», «Glotón», …), que ya coinciden con los títulos de `GAMES`.

---

## 4 — Plan de implementación

Cada paso deja la aplicación compilando y navegable.

1. **Re-portar `app/globals.css`.** Sustituir todo lo que va debajo del bloque `@theme inline` por
   `references/templates/home-about/styles.css` completo. La cabecera del archivo (comentario de
   Tailwind sin preflight, los tres `@import`, `@layer` y `@theme inline`) no se toca. Como el archivo
   nuevo es un superconjunto exacto del viejo, ninguna pantalla existente cambia de aspecto.
   Verificar: `npm run build` pasa y las cinco rutas de SPEC 01 se ven igual que antes.

2. **Actualizar el puntero de `CLAUDE.md`.** La sección de convenciones dice que el tema es un port de
   `references/templates/styles.css`; pasa a ser `references/templates/home-about/styles.css`.
   Verificar: no queda ninguna mención al archivo antiguo como fuente del tema.

3. **Mover la Biblioteca a `/games`.** Crear `app/games/page.tsx` con el contenido actual de
   `app/page.tsx` (hero + `<LibraryGrid />`), añadiéndole `export const metadata = { title: "Biblioteca" }`.
   `LibraryGrid`, `GameCard` y `CoverArt` no cambian. Verificar: `/games` muestra las 8 tarjetas y los
   filtros siguen funcionando.

4. **Reapuntar los enlaces internos** que hoy llevan a la biblioteca en `/`:
   `app/components/nav.tsx` (los dos «Biblioteca», escritorio y móvil), `app/components/hall-board.tsx:118`,
   `app/games/[id]/page.tsx:70` («VOLVER AL VAULT»), `app/not-found.tsx:40`,
   `app/components/game-player.tsx:151` («SALIR» del modal) y los dos `router.push("/")` de
   `app/components/auth-form.tsx` (envío del formulario e invitado). El logo del Nav se queda en `/`,
   que ahora es el Home. Verificar: ningún enlace de «volver a la biblioteca» aterriza en la landing.

5. **`app/components/nav.tsx`: añadir «Inicio».** Enlace a `/` antes de «Biblioteca», en el nav de
   escritorio y en el panel móvil. El estado activo se recalcula: `isHome` es `pathname === "/"` exacto,
   e `isLibrary` pasa a ser `pathname.startsWith("/games")`. Verificar: en `/` se ilumina Inicio; en
   `/games`, `/games/caida` y `/games/caida/play` se ilumina Biblioteca; nunca las dos a la vez.

6. **`app/lib/home.ts`.** Los tipos y las seis constantes de la sección 3. Verificar: `npx tsc --noEmit`
   sin errores y `HOME_STATS[0].n === "8+"`.

7. **`app/components/reveal.tsx`.** Componente cliente que envuelve a sus hijos en un `<section>` con
   clase `reveal` y le añade `in` cuando entra en pantalla, usando un `ref` propio y un
   `IntersectionObserver` con `threshold: 0.12`, igual que la referencia. Se revela de inmediato, sin
   observar, si `matchMedia("(prefers-reduced-motion: reduce)").matches` o si el navegador no trae
   `IntersectionObserver`. El observer se desconecta al desmontar y deja de observar el elemento tras la
   primera intersección. Acepta `className` para las variantes (`home-section`, `home-stats`, `home-final`).
   Verificar: al cargar `/` las secciones de abajo aparecen al hacer scroll; con reduced-motion activado
   están visibles desde el primer momento.

8. **`app/page.tsx`, paso 1 — hero.** Reemplazar la Biblioteca por el Home: `<div className="home fade-in">`
   con `.home-hero`, el eyebrow «▸ INSERTA UNA MONEDA_», el `h1` de tres líneas
   (`EL ARCADE` / `CLÁSICO ESTÁ` / `DE VUELTA`), el subtítulo, los dos CTA
   (`▶ EXPLORAR JUEGOS` → `/games`, `✦ CREAR CUENTA` → `/login?tab=signup`) y el indicador
   `DESLIZA ▼`. Server Component: los CTA son `<Link>` con clase `btn`. Verificar: `/` muestra el hero
   con el título en tres líneas y ambos botones navegan.

9. **`app/components/home-silhouettes.tsx`.** Las 8 siluetas SVG decorativas (`s1`–`s8`) dentro de
   `<div className="home-silos" aria-hidden="true">`, copiadas rect a rect de `home.jsx`, con sus
   colores literales. Se monta dentro de `.home-hero`. Verificar: flotan detrás del hero y no aparecen
   en el árbol de accesibilidad.

10. **`app/components/home-feature-icon.tsx` y la sección «// 01».** El icono es un `switch` sobre
    `FeatureIconKind` que devuelve el SVG 16×16 correspondiente con `fill="currentColor"`. La sección
    va dentro de `<Reveal className="home-section">` con su `.section-head` (kicker `// 01`, título,
    regla) y el `.feature-grid` mapeando `HOME_FEATURES`. Verificar: cuatro tarjetas, cada una con su
    color de acento, y el `:hover` las eleva.

11. **`app/components/home-mini-card.tsx` y la sección «// 02».** La mini-tarjeta es un `<Link>` a
    `/games/[id]` que envuelve portada, título y categoría; usa `CoverArt` de SPEC 01. La sección
    recorre `GAMES.slice(0, PREVIEW_COUNT)` en el `.mini-rail` y cierra con el botón
    `VER TODOS LOS JUEGOS →` a `/games`. Verificar: seis mini-tarjetas y pulsar una abre su detalle.

12. **Sección de estadísticas.** `<Reveal className="home-stats">` con el `.stats-inner` mapeando
    `HOME_STATS`. Verificar: el primer bloque dice `8+ JUEGOS`.

13. **Sección «// 03» — actividad en vivo.** `.activity-grid` con dos `.activity-card`: el ticker
    recorre `HOME_TICKER` (cada `.tick-row` con su `animationDelay` de `i * 60` ms) y la lista de top
    recorre `HOME_TOP`, aplicando `top1`/`top2`/`top3` a las tres primeras y anchura de barra
    `100 - i * 16` por ciento. El enlace `VER SALÓN →` va a `/hall-of-fame`. Los importes usan
    `formatScore`. Verificar: siete filas entran escalonadas y las cinco de top muestran oro, plata y
    bronce en las tres primeras.

14. **Sección «// 04» — precios.** `.pricing-grid` con la `.price-card` (etiqueta, nombre, `$0 / SIEMPRE`,
    los seis `PLAN_PERKS`, el botón `EMPEZAR GRATIS →` a `/login?tab=signup`, el pie y el sello
    `FREE PLAY`) y la `.pricing-faq` con los tres `HOME_FAQ`. Sin acordeón: las respuestas están siempre
    visibles, como en la referencia. Verificar: la tarjeta y las tres preguntas se ven en una fila en
    escritorio y apiladas por debajo de 900px.

15. **CTA final.** `<Reveal className="home-final">` con `¿LISTO PARA JUGAR?`, el botón
    `INSERTAR MONEDA →` a `/games` y la línea de pie. Verificar: el botón lleva a la biblioteca.

16. **Fallback sin JavaScript.** Añadir en `app/page.tsx` un `<noscript>` con
    `.reveal { opacity: 1; transform: none; }`, porque `.reveal` arranca en `opacity: 0` y sin JS las
    secciones quedarían invisibles. Verificar: con JavaScript desactivado en el navegador se ve la
    página entera.

17. **`?tab=signup` en `/login`.** `app/login/page.tsx` pasa a leer su `searchParams` (es un `Promise`
    en Next 16, hay que hacer `await`) con `PageProps<"/login">` y le pasa a `AuthForm` un prop
    `initialTab: "in" | "up"`, que el componente usa como estado inicial. Sin `useSearchParams`, así no
    hace falta un `Suspense` ni una isla cliente extra. Verificar: `/login?tab=signup` abre con la
    pestaña `CREAR CUENTA` activa y el campo de correo visible; `/login` sigue abriendo en `INICIAR SESIÓN`.

18. **Metadatos.** `/` hereda el título por defecto del layout (`Arcade Vault · Portal Retro`), que
    describe la landing; `/games` declara `title: "Biblioteca"`. Verificar: la pestaña dice
    `Arcade Vault · Portal Retro` en `/` y `Biblioteca · Arcade Vault` en `/games`.

---

## 5 — Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] `/` muestra la landing: hero con `EL ARCADE / CLÁSICO ESTÁ / DE VUELTA` en tres líneas, y ya no la Biblioteca.
- [ ] `/games` muestra el hero `ARCADE VAULT` y las 8 tarjetas, con buscador y chips funcionando igual que antes.
- [ ] Las cinco pantallas de SPEC 01 (`/games`, `/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame`) se ven idénticas a antes del re-port de CSS.
- [ ] El Nav muestra `Inicio` y `Biblioteca`; en `/` solo se ilumina Inicio y en `/games/caida` solo Biblioteca.
- [ ] El logo del Nav lleva a `/`.
- [ ] `▶ EXPLORAR JUEGOS`, `VER TODOS LOS JUEGOS →` e `INSERTAR MONEDA →` navegan a `/games`.
- [ ] `✦ CREAR CUENTA` y `EMPEZAR GRATIS →` abren `/login?tab=signup` con la pestaña `CREAR CUENTA` activa y el campo de correo visible.
- [ ] `/login` sin parámetros sigue abriendo en `INICIAR SESIÓN`.
- [ ] Enviar el formulario de acceso, o pulsar `JUGAR COMO INVITADO`, aterriza en `/games`.
- [ ] `VOLVER AL VAULT` del detalle, `SALIR` del modal de fin de partida, el botón de la 404 y el del Salón llevan a `/games`, no a la landing.
- [ ] La sección `// 01` muestra 4 tarjetas con icono pixelado, y al pasar el ratón cada una se eleva y se ilumina en su color.
- [ ] La sección `// 02` muestra exactamente 6 mini-tarjetas, y pulsar una abre `/games/<id>`.
- [ ] El primer bloque de estadísticas dice `8+` sobre `JUEGOS`.
- [ ] El ticker muestra 7 filas que entran escalonadas de izquierda a derecha, con las cifras formateadas con punto de millar (`+184.220`).
- [ ] La lista de top muestra 5 filas; las tres primeras van en oro, plata y bronce, y las barras decrecen.
- [ ] `VER SALÓN →` navega a `/hall-of-fame`.
- [ ] La sección `// 04` muestra la tarjeta de plan con `$0 / SIEMPRE`, seis ventajas, el sello `FREE PLAY` y las tres preguntas frecuentes.
- [ ] Las secciones por debajo del hero arrancan invisibles y aparecen al entrar en pantalla al hacer scroll.
- [ ] Con `prefers-reduced-motion: reduce` activado, todas las secciones están visibles desde la carga, sin animación de entrada.
- [ ] Con JavaScript desactivado, la landing completa es visible.
- [ ] Con el navegador a 800px de ancho, el Home no genera scroll horizontal y el `feature-grid`, el `mini-rail`, las estadísticas, el `activity-grid` y el `pricing-grid` se apilan.
- [ ] La consola del navegador no registra ningún error de hidratación en `/` ni en `/games`.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** la Biblioteca se muda a `/games`. Queda como índice del segmento donde ya viven
  `/games/[id]` y `/games/[id]/play`, así que el catálogo y sus fichas comparten prefijo.
- **No:** `/biblioteca`. Sería la única ruta en español y partiría el vocabulario de URLs en dos.
- **No:** dejar la Biblioteca en `/` y el Home en `/home`. Es el cambio más pequeño, pero deja la
  portada del sitio fuera de la raíz, que es justo lo contrario de lo que hace la referencia.
- **No:** un `redirect()` de `/` a `/games` para los enlaces viejos. `/` sigue resolviendo, ahora con la
  landing; no hay nada roto que redirigir, y el proyecto todavía no tiene tráfico externo.
- **Sí:** re-portar `globals.css` desde el `styles.css` nuevo completo. Es un superconjunto exacto del
  anterior (0 líneas eliminadas o modificadas), así que la operación es segura y mantiene la invariante
  del CLAUDE.md: el tema es un port byte a byte de un único archivo de referencia.
- **Sí:** aceptar las ~350 líneas de CSS que aún no usa nadie (`.about-*`, `.gp-*`, `.score-pop`,
  `.gp-themer`). Es el precio de la invariante, y el spec de la página Acerca de no tendrá que tocar el tema.
- **No:** portar solo los bloques del Home. Ahorraría CSS muerto, pero `globals.css` dejaría de ser un
  port literal y cada pantalla nueva volvería a negociar qué trozo de tema le toca.
- **Sí:** solo el enlace `Inicio` en el Nav. `Acerca de` entra cuando exista la ruta; añadirlo ahora
  sería un enlace visible a un 404.
- **Sí:** datos mock literales en `app/lib/home.ts`. La landing se renderiza entera en el servidor, no
  hay riesgo de hidratación y las cifras coinciden con la referencia.
- **No:** derivar el ticker y el top de `seededScores`. Sincronizaría los nombres con el catálogo, pero
  cambiaría todos los números visibles de la maqueta sin ganar nada: siguen siendo datos falsos.
- **No:** rotar el ticker en el cliente para que «ACTIVIDAD EN VIVO» se mueva. Mete una isla cliente y
  un `setInterval` en la portada a cambio de un efecto que la referencia no tiene.
- **Sí:** la única cifra derivada es el número de juegos (`8+` en vez de `12+`). Una portada que anuncia
  12 juegos y un catálogo que enseña 8 es una incoherencia gratuita, y el resto de literales no miente.
- **Sí:** `<Reveal>` como componente cliente con su propio `ref`, en lugar del `document.querySelectorAll`
  de la referencia. Cada sección observa su propio nodo, sin que un `useEffect` de página vaya a buscar
  elementos por el DOM.
- **Sí:** revelar de inmediato con `prefers-reduced-motion` y neutralizar `.reveal` en `<noscript>`.
  `.reveal` arranca en `opacity: 0`; sin una de las dos salidas, media landing es invisible para quien
  desactiva animaciones o JavaScript.
- **Sí:** `/login?tab=signup` leído en el servidor con `searchParams`, no con `useSearchParams`. Evita
  el `Suspense` que Next exige alrededor de ese hook y no añade estado de cliente nuevo.
- **Sí:** conservar los `transitionDelay` inline de `.feature-card` y `.stat-block` que trae la
  referencia, aunque el CSS de esas clases no declare `opacity: 0` y por tanto no escalonen nada. Son
  inertes y quitarlos alejaría el markup del original sin cambiar un píxel.
- **Sí:** las mini-tarjetas y los CTA son `<Link>`, así que el Home entero es un Server Component salvo
  los `<Reveal>`. El `onClick`/`navigate` de la referencia no tiene sentido con App Router.
- **Sí:** los importes con `formatScore`, no con `toLocaleString("es-ES")`. Misma razón que en SPEC 01.

---

## 7 — Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| `.reveal` arranca en `opacity: 0`: si el JS no corre, la landing se queda en blanco por debajo del hero | Bloque `<noscript>` que fuerza `.reveal { opacity: 1; transform: none; }`, y revelado inmediato cuando falta `IntersectionObserver`. |
| Con `prefers-reduced-motion` el usuario podría quedarse sin ver el contenido si el observer no dispara | `<Reveal>` comprueba el `matchMedia` antes de observar y añade `in` en el primer efecto. |
| Mover la Biblioteca de `/` a `/games` deja enlaces internos apuntando a la landing | El paso 4 enumera los siete puntos exactos (`nav.tsx` ×2, `hall-board.tsx:118`, `games/[id]/page.tsx:70`, `not-found.tsx:40`, `game-player.tsx:151`, `auth-form.tsx` ×2). Los criterios de aceptación los verifican uno a uno. |
| El re-port de `globals.css` podría alterar pantallas ya aprobadas | El `diff` entre los dos `styles.css` no tiene ni una línea eliminada ni modificada: solo añadidos. Se verifica visualmente las cinco rutas de SPEC 01 tras el paso 1. |
| `.tick-row` arranca en `opacity: 0` con `animation: … forwards`; una futura regla global de reduced-motion que anule animaciones dejaría el ticker invisible | Anotado. Hoy el tema no tiene esa regla; cuando se aborde `prefers-reduced-motion` en el tema (pendiente de SPEC 01) habrá que dar a `.tick-row` un estado final explícito. |
| Ocho siluetas SVG con `float` infinito más la rejilla animada de `.av-bg` en la misma pantalla | Son transformaciones compuestas sobre elementos pequeños. Queda anotado junto al riesgo de GPU que ya registró SPEC 01. |
| Los criterios de aceptación de SPEC 01 que dicen «`/` muestra las 8 tarjetas» quedan obsoletos | Se leen sustituyendo `/` por `/games`. SPEC 01 sigue marcado como `Implemented`; este spec es la enmienda. |
| Leer `searchParams` convierte `/login` en dinámica | Aceptado: es una pantalla de acceso, no se beneficia del prerender estático. |

---

## 8 — Lo que **no** entra en este spec

- La página **Acerca de** y su formulario de contacto, aunque su CSS ya entra con el re-port.
- El mando de arcade (`.gp-*`, `.gp-themer`, `.score-pop`), que no usa ninguna pantalla de la referencia.
- Que la actividad en vivo sea real, se actualice o salga de `av_scores`.
- Autenticación real detrás de `?tab=signup`.
- `prefers-reduced-motion` en el resto de las animaciones del tema.
- Internacionalización y tests automatizados.

Cada uno de estos, si llega, va en su propio spec.
