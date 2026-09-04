# SPEC 01 — MVP visual: las cinco pantallas de Arcade Vault

> **Estado:** Implemented
> **Depende de:** ninguna
> **Fecha:** 2026-09-02
> **Objetivo:** Portar las cinco pantallas de `references/templates/` a rutas reales de Next.js 16 con datos mock, sin implementar ningún juego.

---

## 1 — Por qué existe este spec

El tema global (`app/globals.css`) ya es un port byte a byte de `references/templates/styles.css`, pero
ninguna pantalla lo usa todavía: `app/page.tsx` sigue siendo la landing de create-next-app.

La referencia es una SPA de React 18 vía CDN con routing por hash y todo el estado en un único
componente `App`. Este spec la reconstruye con las convenciones del proyecto: App Router, TypeScript
estricto y Server Components por defecto. El resultado visual debe ser indistinguible del original.

---

## 2 — Alcance

**Dentro:**

- Cinco rutas: `/`, `/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame`.
- Layout compartido con `Nav` (incluido el panel móvil) y el footer de `app.jsx`.
- Datos mock portados de `data.jsx`: los 8 juegos, las 5 categorías y el generador `seededScores`.
- Sesión falsa en `localStorage` (`av_user`) y guardado de puntuaciones (`av_scores`).
- Página 404 con el tema arcade para ids de juego desconocidos.
- La simulación de partida de `reproductor.jsx` tal cual: puntuación automática, pausa, fin y modal.
- Adaptación responsive que ya cubre `globals.css` (breakpoints 840px, 900px y 720px).

**Fuera de alcance (para specs futuros):**

- Cualquier juego real. Las 8 fichas apuntan a la misma simulación falsa.
- Backend, base de datos o API. Todo es mock en el bundle o en `localStorage`.
- Autenticación real, validación de credenciales, OAuth. Los botones de Google y GitHub no hacen nada.
- Que las puntuaciones guardadas alimenten las tablas de posiciones (ver Decisiones).
- El contador `CRÉDITOS · 03`, que es texto fijo sin lógica.
- Internacionalización. La interfaz es solo español.
- Tests automatizados. El proyecto no tiene runner configurado.

---

## 3 — Modelo de datos

Tres módulos nuevos bajo `app/lib/`. No hay base de datos ni API.

```ts
// app/lib/games.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type CoverArt =
    | "cover-bricks"
    | "cover-tetro"
    | "cover-snake"
    | "cover-glot"
    | "cover-invaders"
    | "cover-rocas"
    | "cover-rana"
    | "cover-duelo";

export type Game = {
    id: string; // slug de la URL: "bloque-buster", "caida", …
    title: string; // "BLOQUE BUSTER"
    short: string; // texto de la tarjeta
    long: string; // texto de la página de detalle
    cat: Category;
    cover: CoverArt; // clase CSS del generador de portada en globals.css
    color: "cyan" | "magenta" | "yellow" | "green"; // variante del botón JUGAR
    best: number;
    plays: string; // ya formateado: "12.4K"
};

export const GAMES: Game[]; // los 8 de data.jsx, sin cambios
export const CATS: readonly ["TODOS", ...Category[]];
export function getGame(id: string): Game | undefined;
```

```ts
// app/lib/scores.ts
export type ScoreRow = {
    rank: number;
    name: string;
    score: number;
    date: string; // "07/03/2026"
};

// Portado literal de data.jsx. Determinista: la misma semilla da siempre las mismas filas.
export function seededScores(seed: number, count?: number): ScoreRow[];

// Sustituye a toLocaleString("es-ES"). Separador de miles "." fijo, sin depender de ICU.
export function formatScore(n: number): string;
```

```ts
// app/lib/session.tsx
export type SessionUser = { name: string }; // clave localStorage: "av_user"
export type StoredScore = {
    // clave localStorage: "av_scores"
    game: string; // Game["id"]
    score: number;
    name: string;
    at: number; // Date.now()
};

export function SessionProvider(props: {
    children: React.ReactNode;
}): JSX.Element;
export function useSession(): {
    user: SessionUser | null;
    signIn: (user: SessionUser | null) => void;
    signOut: () => void;
    saveScore: (entry: Omit<StoredScore, "at">) => void;
};
```

Convenciones:

- Las semillas de las tablas se calculan igual que en la referencia, para que los números coincidan:
  detalle usa `seededScores(id.length * 17 + 3, 10)`, salón usa `seededScores(id.length * 23 + 7, 12)`.
- `localStorage` se lee dentro de un `useEffect`, nunca durante el render (ver Riesgos).
- Todo acceso a `localStorage` va envuelto en `try/catch`, como en `app.jsx`.

---

## 4 — Plan de implementación

Cada paso deja la aplicación compilando y navegable.

1. **`app/lib/games.ts`** — tipos `Game`, `Category`, `CoverArt`, el array `GAMES` con los 8 juegos
   copiados de `data.jsx`, `CATS` y `getGame`. Verificar: `npx tsc --noEmit` sin errores.

2. **`app/lib/scores.ts`** — `ScoreRow`, `seededScores` portado literal y `formatScore`. Verificar:
   `formatScore(184220)` devuelve `"184.220"`.

3. **`app/lib/session.tsx`** — componente cliente con `SessionProvider` y `useSession`. Lee `av_user`
   en `useEffect` al montar. Montarlo en `app/layout.tsx` envolviendo a `#root`. Verificar: la app
   sigue sirviendo `/` sin errores de hidratación en consola.

4. **`app/components/cover-art.tsx`** y **`app/components/site-footer.tsx`** — el primero renderiza
   `<div className={"cover-bg " + cover} />`; el segundo copia el footer de `app.jsx` con sus estilos
   inline. Añadir el footer al layout. Verificar: el footer aparece abajo en todas las rutas.

5. **`app/components/nav.tsx`** — cliente. Logo, enlaces Biblioteca / Salón de la Fama, contador de
   créditos, botón de sesión y panel móvil con backdrop. El estado activo se deriva de `usePathname`:
   Biblioteca está activa en `/` y en cualquier `/games/…`. Montar en el layout. Verificar: los enlaces
   navegan, y por debajo de 840px aparece la hamburguesa y se abre el panel.

6. **`app/components/game-card.tsx`** — cliente. Portada, categoría, título, descripción, mejor
   puntuación y botón JUGAR con la variante de color del juego. Conserva el tilt 3D con `onMouseMove`.
   Toda la tarjeta enlaza a `/games/[id]`.

7. **`app/components/library-grid.tsx`** y **`app/page.tsx`** — el grid cliente tiene el buscador, los
   chips de categoría y el estado vacío; la página servidor añade el hero `ARCADE VAULT` con `.flicker`
   y el cursor parpadeante. Reemplaza la landing de create-next-app. Verificar: 8 tarjetas, escribir
   "cai" deja una, la categoría PUZZLE deja una, y una búsqueda sin resultados muestra `NO HAY RESULTADOS`.

8. **`app/components/leaderboard.tsx`** y **`app/games/[id]/page.tsx`** — servidor. Portada grande,
   etiquetas, título neón, descripción larga, franja de estadísticas, botones JUGAR AHORA / VOLVER AL
   VAULT y las 10 filas con oro, plata y bronce. Usa `PageProps<"/games/[id]">`. Verificar:
   `/games/caida` muestra CAÍDA y sus 10 filas.

9. **`app/not-found.tsx`** y `notFound()` en la ruta de detalle — 404 con tipografía pixel y botón de
   vuelta a la biblioteca. Verificar: `/games/no-existe` devuelve 404 con el tema, no una página en blanco.

10. **`app/components/game-player.tsx`** y **`app/games/[id]/play/page.tsx`** — cliente. HUD con
    jugador, puntuación, vidas y nivel; marco CRT con la arena falsa; overlay de pausa; modal de fin
    con captura de nombre y `saveScore`. El intervalo se limpia al desmontar. Verificar: la puntuación
    sube sola, PAUSA la congela, FIN abre el modal y GUARDAR muestra el toast de guardado.

11. **`app/components/auth-form.tsx`** y **`app/login/page.tsx`** — cliente. Tabs INICIAR SESIÓN /
    CREAR CUENTA (el correo solo aparece en la segunda), campos, botón principal, entrada como invitado,
    separador y los dos botones sociales inertes. Al enviar llama a `signIn` y navega a `/`. Verificar:
    entrar con "px_kai" deja `PX_KAI ▾` en el Nav y sobrevive a un recargado.

12. **`app/components/hall-board.tsx`** y **`app/hall-of-fame/page.tsx`** — el board es cliente porque
    la pestaña seleccionada gobierna el podio y la tabla. Cabecera con degradado, 8 chips, podio
    plata-oro-bronce, tabla de 12 filas con animación escalonada y la fila `TU MEJOR MARCA` cuando hay
    sesión. Verificar: cambiar de pestaña cambia las cifras del podio y de la tabla.

13. **Metadatos por ruta** — `metadata` estática en `/login`, `/hall-of-fame` y la 404, y
    `generateMetadata` en el detalle y el reproductor para que el título lleve el nombre del juego.
    Verificar: la pestaña del navegador dice `CAÍDA · Arcade Vault` en `/games/caida`.

---

## 5 — Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de ESLint.
- [ ] `/` muestra las 8 tarjetas con sus portadas CSS, sin ningún resto de la landing de create-next-app.
- [ ] Escribir `cai` en el buscador deja exactamente una tarjeta: CAÍDA.
- [ ] Pulsar el chip `PUZZLE` deja exactamente una tarjeta; `TODOS` devuelve las 8.
- [ ] Una búsqueda sin coincidencias muestra el bloque `NO HAY RESULTADOS`.
- [ ] Pasar el ratón por una tarjeta la inclina en 3D y al salir vuelve a su posición.
- [ ] Pulsar una tarjeta navega a `/games/<id>` y el botón atrás del navegador vuelve a `/`.
- [ ] `/games/caida` muestra el título, la descripción larga, las tres estadísticas y 10 filas de
      puntuaciones con las tres primeras en oro, plata y bronce.
- [ ] `/games/no-existe` devuelve la 404 con estilo arcade y su botón vuelve a `/`.
- [ ] `JUGAR AHORA` lleva a `/games/caida/play` y allí la puntuación sube sola.
- [ ] `PAUSA` congela la puntuación y muestra el overlay `EN PAUSA`; `REANUDAR` la reanuda.
- [ ] `FIN` abre el modal con la puntuación final; `GUARDAR PUNTUACIÓN` lo sustituye por el toast
      `▸ PUNTUACIÓN GUARDADA_` y añade una entrada a `av_scores` en localStorage.
- [ ] `JUGAR DE NUEVO` deja puntuación en 0, vidas en 3 y nivel en 01.
- [ ] `SALIR` desde el reproductor vuelve a la página de detalle del mismo juego.
- [ ] En `/login`, la pestaña `CREAR CUENTA` añade el campo de correo y `INICIAR SESIÓN` lo quita.
- [ ] Enviar el formulario navega a `/` y el Nav pasa a mostrar el nombre en mayúsculas, máximo 10 caracteres.
- [ ] Recargar la página conserva la sesión; pulsar el nombre en el Nav la cierra.
- [ ] `JUGAR COMO INVITADO` navega a `/` y el Nav sigue mostrando `Iniciar Sesión`.
- [ ] `/hall-of-fame` muestra 8 pestañas, el podio y 12 filas; cambiar de pestaña cambia los datos.
- [ ] Con sesión iniciada, el Salón añade la fila `TU MEJOR MARCA` resaltada en amarillo.
- [ ] Con el navegador a 800px de ancho, el Nav esconde los enlaces y la hamburguesa abre el panel lateral.
- [ ] La consola del navegador no registra ningún error de hidratación en ninguna de las cinco rutas.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** rutas reales en inglés (`/games/[id]`, `/login`, `/hall-of-fame`) con la interfaz en español.
  Da URLs compartibles, historial de navegador y los tipos `PageProps` por ruta.
- **No:** replicar el routing por hash de la referencia en un único `page.tsx`. Desaprovecha el App
  Router y deja los juegos sin URL propia.
- **Sí:** páginas como Server Components e islas cliente solo donde hay interacción (Nav, grid,
  reproductor, formulario de acceso, board del salón). Lo que es texto estático viaja como HTML.
- **Sí:** el board del Salón entero es cliente. La pestaña seleccionada gobierna el podio y la tabla,
  así que partirlo obligaría a subir el estado a la URL, que es justo lo que se descartó para los filtros.
- **Sí:** buscador y chips con `useState`, sin query params. Filtrar 8 juegos en memoria es inmediato y
  evita una navegación por cada tecla pulsada.
- **Sí:** sesión en `localStorage` con las claves `av_user` y `av_scores`, idénticas a la referencia.
- **No:** sesión en cookie con Server Actions. Mete un backend simulado que no aporta a un MVP visual.
- **Sí:** mantener la simulación falsa del reproductor. Es la única forma de ver el HUD, el estado de
  pausa y el modal de fin funcionando sin escribir un juego.
- **Sí:** `formatScore` propio en lugar de `toLocaleString("es-ES")`. El formato de `Intl` puede diferir
  entre el Node del servidor y el navegador, y eso rompe la hidratación.
- **Sí:** fidelidad a la referencia en el Salón: la fila `TU MEJOR MARCA` sigue saliendo del mock, no de
  `av_scores`. Se guarda pero no se lee, igual que en el original.
- **No:** mezclar `av_scores` con las tablas de posiciones. Cerraría el bucle jugar → guardar → verse,
  pero cambia el comportamiento de la referencia; si se quiere, va en su propio spec.
- **Sí:** conservar los estilos inline que ya trae la referencia (footer, ajustes puntuales de color).
  Así `app/globals.css` sigue siendo un port byte a byte de `styles.css` y no hay clases inventadas.
- **No:** reescribir la maqueta con utilidades de Tailwind. Las clases de la referencia
  (`.card`, `.btn`, `.crt`, `.podium`…) ya existen en `globals.css` y son la fuente de verdad.

---

## 7 — Riesgos identificados

| Riesgo                                                                       | Mitigación                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hidratación: el Nav depende de `localStorage`, que no existe en el servidor  | `SessionProvider` arranca con `user = null` y lee `av_user` en `useEffect`. El primer render del cliente coincide con el del servidor y el nombre aparece después de montar. |
| `toLocaleString("es-ES")` puede formatear distinto en Node y en el navegador | `formatScore` en `app/lib/scores.ts` inserta el separador a mano. Nadie llama a `toLocaleString` en componentes.                                                             |
| El `setInterval` del reproductor sigue vivo al navegar fuera                 | El `useEffect` devuelve su `clearInterval`, y también se detiene con `paused` o `over`.                                                                                      |
| `localStorage` lanza excepción en modo privado o con cookies bloqueadas      | Toda lectura y escritura va en `try/catch`. Sin persistencia la app sigue funcionando, solo se olvida la sesión.                                                             |
| `.av-bg::before` anima una rejilla en bucle infinito y consume GPU           | Fuera de alcance para este spec, pero queda anotado: respetar `prefers-reduced-motion` merece su propio cambio en el tema.                                                   |

---

## 8 — Lo que **no** entra en este spec

- Ningún juego jugable. Las 8 fichas comparten la misma simulación falsa.
- Backend, base de datos, API o persistencia en servidor.
- Autenticación real, registro, recuperación de contraseña, OAuth con Google o GitHub.
- Que `av_scores` alimente el leaderboard del detalle o la tabla del Salón.
- El contador de créditos como mecánica.
- Internacionalización y tests automatizados.
- Soporte de `prefers-reduced-motion` en las animaciones del tema.

Cada uno de estos, si llega, va en su propio spec.
