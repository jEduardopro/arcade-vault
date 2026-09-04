# SPEC 06 — Leaderboard y catálogo en Supabase

> **Estado:** Implemented
> **Depende de:** SPEC 01, SPEC 04, SPEC 05
> **Fecha:** 2026-09-04
> **Objetivo:** Crear las tablas `games` y `scores` en Supabase con sus vistas, su RLS y su semilla, y hacer que el catálogo y todas las puntuaciones de la aplicación salgan de ahí en vez de un array y una función de semilla.

---

## 1 — Por qué existe este spec

SPEC 04 dejó los cables puestos y lo dijo por escrito: las tablas son del spec que las necesite, y la
decisión de cómo se aplican y versionan las migraciones se toma en el spec que cree la primera tabla.
Este es ese spec. El esquema `public` sigue hoy con **cero tablas y cero migraciones**, comprobado por
MCP antes de escribir esto.

Mientras tanto, la aplicación miente en dos sitios a la vez. El catálogo son ocho objetos literales en
`app/lib/games.ts`, que viajan en el bundle. Las puntuaciones las fabrica `seededScores()` en
`app/lib/scores.ts`, una semilla determinista que rellena el Salón de la Fama y las ocho fichas con
nombres inventados. Y desde SPEC 05 hay una tercera pieza incómoda: ASTEROIDES es un juego de verdad,
con una puntuación de verdad, que al terminar se guarda en `localStorage["av_scores"]` y no la ve nadie
más que el navegador que la escribió. Se puede jugar, pero no se puede competir, que es la mitad de lo
que la portada promete.

Este spec cierra ese circuito: se juega, se guarda en Postgres y aparece en el Salón de la Fama para
todo el mundo. Y de paso decide, por primera vez, cómo se escribe SQL en este repositorio.

Lo que **no** decide es la autenticación. El usuario sigue viviendo en `localStorage` bajo `av_user`
desde SPEC 01, así que la tabla de puntuaciones acepta escrituras anónimas con un nombre de jugador.
Es una decisión consciente con su coste, y está en la sección 6.

---

## 2 — Alcance

**Dentro:**

- Las tablas `public.games` y `public.scores`, con sus `CHECK`, sus índices y RLS activa.
- Las vistas `public.leaderboard` (mejor marca por jugador, ya rankeada) y `public.games_with_best`
  (el catálogo con su récord real calculado).
- Cuatro migraciones SQL versionadas en `supabase/migrations/`, aplicadas con `apply_migration` del MCP.
- Semilla de los ocho juegos del catálogo actual y de doce puntuaciones para `asteroides`.
- Regenerar `app/lib/supabase/types.ts` con el esquema nuevo.
- `app/lib/supabase/public.ts`: un cliente sin cookies para las lecturas públicas cacheables.
- `app/lib/games.ts`: fuera el array `GAMES`, dentro `getGames()` y `getGame(id)` asíncronas y cacheadas
  bajo la etiqueta `games`.
- `app/lib/scores.ts`: fuera `seededScores()`, dentro `getLeaderboard()`, `formatDate()` y
  `validateScore()`. `formatScore()` se queda intacta.
- `app/actions/scores.ts`: la Server Action `submitScore` que valida, limita por IP, inserta y revalida.
- `app/lib/rate-limit.ts`: `SCORE_RATE` y `takeScoreSlot()`, junto al cupo de contacto de SPEC 03.
- `app/lib/session.tsx`: desaparecen `saveScore()` y `StoredScore`; el usuario de `localStorage` se queda.
- `app/components/player-shell.tsx`: el modal de fin guarda contra la base de datos con `useActionState`.
- Las seis pantallas que consumen el catálogo o las puntuaciones: `/`, `/games`, `/games/[id]`,
  `/games/[id]/play`, `/hall-of-fame` y los componentes `library-grid`, `hall-board` y `home.ts`.
- `CLAUDE.md`: la convención de migraciones y de dónde salen ahora los datos.

**Fuera de alcance (para specs futuros):**

- **Autenticación real.** `app/lib/session.tsx` sigue guardando el usuario en `localStorage`, y
  `app/components/auth-form.tsx` no se toca. La tabla `scores` no tiene `user_id` ni FK a `auth.users`.
- **El ticker y el top 5 de la portada.** `HOME_TICKER` y `HOME_TOP` de `app/lib/home.ts` siguen siendo
  literales copiados de la referencia de SPEC 02. Solo se toca `HOME_STATS`, y únicamente porque hoy
  importa `GAMES`.
- **Contador de partidas real.** `plays` sigue siendo una columna de texto sembrada con `"15.6K"` y sus
  vecinos. Contar partidas es un camino de escritura nuevo que este spec no abre.
- **Editar el catálogo desde la aplicación.** No hay panel de administración: `games` solo se escribe
  por migración, y no lleva políticas de `insert`, `update` ni `delete`.
- **Borrar o moderar puntuaciones.** `scores` tampoco lleva políticas de `update` ni `delete`. Limpiar
  una fila abusiva se hace por SQL.
- **Realtime.** El Salón de la Fama no se actualiza solo mientras está abierto; hay que recargar.
- **Paginación del Salón de la Fama.** Se muestran las doce primeras marcas de cada juego, como hoy.
- **Migrar las filas viejas de `localStorage["av_scores"]`.** Se quedan donde están, huérfanas, y ningún
  módulo vuelve a leerlas.
- **Los seis juegos que siguen sin serlo.** Sus fichas tendrán ahora `best: 0` porque su tabla está
  vacía. Portar Tetris o Arkanoid es el spec de cada uno.
- **Cache Components.** `next.config.ts` no activa `cacheComponents`, así que se usa el modelo anterior
  (`unstable_cache` + `revalidateTag`). Migrar el proyecto entero al modelo nuevo es otro spec.
- **Tests automatizados.** El proyecto sigue sin runner desde SPEC 01.

---

## 3 — Modelo de datos

### 3.1 — `public.games`

El catálogo. La clave primaria es el slug que ya está en las URLs, así que `/games/asteroides` sigue
funcionando sin traducción de ids.

```sql
create table public.games (
    id          text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
    title       text        not null,
    short       text        not null,
    long        text        not null,
    cat         text        not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
    cover       text        not null check (cover in (
                    'cover-bricks','cover-tetro','cover-snake','cover-glot',
                    'cover-invaders','cover-rocas','cover-rana','cover-duelo')),
    color       text        not null check (color in ('cyan','magenta','yellow','green')),
    plays       text        not null,          -- ya formateado: "15.6K"
    sort_order  smallint    not null,          -- conserva el orden del array de SPEC 01
    max_score   integer     not null default 10000000 check (max_score > 0),
    created_at  timestamptz not null default now()
);
```

Los tres `check ... in (...)` son el espejo en Postgres de las uniones `Category`, `CoverArt` y el color
del botón que `app/lib/games.ts` ya declara. Son lo que permite que la capa de TypeScript siga tratando
esas columnas como uniones y no como `string`.

`max_score` es el techo de puntuación aceptable para ese juego. Existe porque la tabla `scores` acepta
inserciones anónimas y un `CHECK` de Postgres no puede consultar otra tabla; la comprobación por juego la
hace la Server Action.

### 3.2 — `public.scores`

Una fila por partida guardada. No se sobreescribe ni se acumula por jugador: eso lo resuelve la vista.

```sql
create table public.scores (
    id          uuid primary key default gen_random_uuid(),
    game_id     text        not null references public.games(id) on delete cascade,
    player      text        not null check (player ~ '^[A-Z0-9_]{1,10}$'),
    score       integer     not null check (score >= 0 and score <= 10000000),
    created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);
```

El patrón de `player` es exactamente lo que el input del modal ya produce hoy: mayúsculas, diez
caracteres como mucho. El `CHECK` de `score` es el tope absoluto; el de cada juego lo aplica la acción.

### 3.3 — `public.leaderboard` — la mejor marca de cada jugador

Un jugador puede guardar diez partidas de ASTEROIDES; el Salón de la Fama enseña una sola, la mejor.
La vista deja además el rango calculado, para que ninguna pantalla tenga que numerar filas a mano.

```sql
create view public.leaderboard with (security_invoker = true) as
with best as (
    select distinct on (game_id, player) game_id, player, score, created_at
    from public.scores
    order by game_id, player, score desc, created_at asc
)
select
    game_id,
    player,
    score,
    created_at,
    (row_number() over (partition by game_id order by score desc, created_at asc))::int as rank
from best;
```

`security_invoker = true` es obligatorio: sin él la vista se ejecuta con los permisos de quien la creó y
se salta la RLS de `scores`. Con el empate resuelto por `created_at asc`, quien llegó antes al mismo
número queda por delante.

El cliente filtra por `game_id` y por `rank`, así que las doce primeras marcas de un juego son
`select … from leaderboard where game_id = ? and rank <= 12 order by rank`.

### 3.4 — `public.games_with_best` — el catálogo con su récord real

```sql
create view public.games_with_best with (security_invoker = true) as
select g.*, coalesce(max(s.score), 0)::int as best
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;
```

Es lo que sustituye al `best` inventado de la ficha. Un juego sin ninguna partida guardada devuelve `0`,
que es la verdad: hoy solo ASTEROIDES tendrá récord.

### 3.5 — RLS y políticas

Las dos tablas llevan RLS activa. Lo que queda abierto es exactamente lo que la aplicación necesita y
nada más:

| Tabla    | `select`               | `insert`                    | `update` / `delete` |
| -------- | ---------------------- | --------------------------- | ------------------- |
| `games`  | público (`using true`) | ninguna política → nadie    | ninguna política    |
| `scores` | público (`using true`) | público (`with check true`) | ninguna política    |

```sql
alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games are public"   on public.games  for select to anon, authenticated using (true);
create policy "scores are public"  on public.scores for select to anon, authenticated using (true);
create policy "anyone can submit"  on public.scores for insert to anon, authenticated with check (true);
```

Sin política de `update` ni de `delete`, una fila guardada es inmutable desde la API. El catálogo solo
se escribe por migración.

### 3.6 — El tipo `Game` en TypeScript

`app/lib/games.ts` conserva sus tipos escritos a mano —`Category`, `CoverArt`, `Game`— con los mismos
campos que hoy. No se derivan de `app/lib/supabase/types.ts` por dos razones: los tipos generados dan
`string` donde la interfaz necesita una unión (`CoverArt` es lo que `cover-art.tsx` conmuta), y las
columnas de una vista salen anulables porque PostgREST no puede saber que no lo son.

La conversión vive en un solo sitio, la función que lee la vista, y está justificada por los `CHECK`
de la sección 3.1:

```ts
// app/lib/games.ts
function toGame(row: GamesWithBestRow): Game {
    return {
        id: row.id!,
        title: row.title!,
        // …
        cat: row.cat as Category,
        cover: row.cover as CoverArt,
        color: row.color as Game["color"],
        best: row.best ?? 0,
        plays: row.plays!,
    };
}

export const getGames: () => Promise<Game[]>;
export const getGame: (id: string) => Promise<Game | undefined>;
```

Las dos van envueltas en `unstable_cache` con la etiqueta `games`, así que el catálogo se sirve de caché
hasta que alguien guarda una puntuación —que cambia `best`— y la acción invalida la etiqueta.

### 3.7 — `ScoreRow` y la lectura de puntuaciones

`app/lib/scores.ts` conserva el tipo `ScoreRow` tal cual (`rank`, `name`, `score`, `date`), de modo que
`leaderboard.tsx` y `hall-board.tsx` no cambian de contrato. Lo que cambia es de dónde salen las filas:

```ts
export type ScoreRow = {
    rank: number;
    name: string;
    score: number;
    date: string;
};

/** Las `limit` mejores marcas de un juego, ya rankeadas por la vista. */
export function getLeaderboard(
    gameId: string,
    limit?: number,
): Promise<ScoreRow[]>;

/** "07/03/2026" a partir de un timestamptz, sin depender de los datos de ICU. */
export function formatDate(iso: string): string;
```

`formatDate` se escribe a mano por el mismo motivo que `formatScore` en SPEC 01: `toLocaleDateString`
depende de la ICU disponible en Node y en el navegador, y una fecha que se pinta distinto en el servidor
y en el cliente es un error de hidratación.

### 3.8 — La validación de una puntuación

Mismo reparto que el formulario de contacto de SPEC 03: la validación pura vive en `app/lib/`, la acción
vive en `app/actions/` y solo ella habla con el exterior.

```ts
// app/lib/scores.ts
export type ScoreState = { ok: boolean; error?: string };

export function validateScore(input: {
    player: string;
    score: number;
}): ScoreState;
```

Las reglas son las de los `CHECK`: `player` de 1 a 10 caracteres `A–Z0–9_` tras pasar a mayúsculas, y
`score` entero entre 0 y el `max_score` del juego. Los mensajes son literales fijos, como en SPEC 03.

### 3.9 — Lo que desaparece

| Se va                                  | De dónde              | Por qué                                     |
| -------------------------------------- | --------------------- | ------------------------------------------- |
| `GAMES` y el `getGame()` síncrono      | `app/lib/games.ts`    | El catálogo es ahora `public.games`.        |
| `seededScores()` y el array `PLAYERS`  | `app/lib/scores.ts`   | Las puntuaciones son ahora `public.scores`. |
| `saveScore()` y el tipo `StoredScore`  | `app/lib/session.tsx` | El guardado pasa por la Server Action.      |
| La clave `av_scores` de `localStorage` | —                     | Nadie vuelve a escribirla ni a leerla.      |

`av_user` y todo lo demás de `session.tsx` se quedan: la sesión falsa es de otro spec.

---

## 4 — Plan de implementación

Cada paso deja la aplicación compilando y las siete rutas navegables.

1. **Migración del esquema.** Crear `supabase/migrations/` y, dentro,
   `20260904090000_create_games_and_scores.sql` con las dos tablas de las secciones 3.1 y 3.2, el índice
   y todo el bloque de RLS y políticas de la sección 3.5. Aplicarla con `apply_migration` del MCP usando
   el mismo nombre del archivo, para que el registro remoto y el repositorio digan lo mismo.
   Verificar: `list_tables` devuelve `games` y `scores`, y `list_migrations` la muestra registrada.

2. **Migración de las vistas.** `20260904090100_create_leaderboard_views.sql` con `leaderboard` y
   `games_with_best` de las secciones 3.3 y 3.4, las dos con `security_invoker = true`.
   Verificar: `select * from public.leaderboard` devuelve cero filas sin error.

3. **Migraciones de semilla.** `20260904090200_seed_games.sql` con las ocho fichas actuales de
   `app/lib/games.ts` —mismo `id`, `title`, `short`, `long`, `cat`, `cover`, `color` y `plays`, con
   `sort_order` de 0 a 7 en el orden del array— y `20260904090300_seed_asteroides_scores.sql` con doce
   filas para `asteroides`, usando los nombres retro de `PLAYERS` y fechas repartidas por 2026. Las dos
   con `on conflict do nothing`, para que reaplicarlas no duplique nada.
   Verificar: `games` tiene 8 filas, `leaderboard` tiene 12 con `game_id = 'asteroides'` y rangos de 1 a
   12, y `games_with_best` da `best > 0` solo para `asteroides`.

4. **Regenerar los tipos.** Ejecutar `generate_typescript_types` del MCP y pegar la salida en
   `app/lib/supabase/types.ts`, conservando la cabecera de «archivo generado» que puso SPEC 04 y
   actualizando la línea que dice que el esquema tiene cero tablas.
   Verificar: `Database["public"]["Tables"]` incluye `games` y `scores`, `Views` incluye `leaderboard` y
   `games_with_best`, y `npx tsc --noEmit` pasa.

5. **`app/lib/supabase/public.ts`.** Un tercer cliente, sin cookies, para las lecturas públicas:
   `createPublicClient()` sobre `createClient` de `@supabase/supabase-js` con las dos variables
   `NEXT_PUBLIC_*` que ya existen. Hace falta porque `unstable_cache` no admite dentro las APIs de
   petición, y el cliente de `server.ts` llama a `cookies()`.
   Verificar: `npx tsc --noEmit` sin errores.

6. **`app/lib/games.ts` y sus seis consumidores.** Sustituir el array por `getGames()` y `getGame(id)`
   de la sección 3.6, envueltas en `unstable_cache` con la etiqueta `games`, y actualizar de una vez a
   todo el que las usa: `app/page.tsx`, `app/lib/home.ts` (donde `HOME_STATS` pasa a ser la función
   `homeStats(gameCount)`), `app/games/page.tsx` con `library-grid.tsx` recibiendo `games` por props,
   `app/games/[id]/page.tsx`, `app/games/[id]/play/page.tsx` y `app/hall-of-fame/page.tsx` con
   `hall-board.tsx` recibiendo también `games` por props. Es el único paso que toca muchos archivos a la
   vez, y es a propósito: un array exportado no se puede quitar a medias sin dejar el proyecto sin
   compilar.
   Verificar: `npm run build` pasa, `grep -rn "GAMES" app` no devuelve nada, y las seis pantallas se ven
   igual que antes salvo el récord de las fichas, que ahora es `0` en siete de los ocho cartuchos.

7. **`app/lib/scores.ts` y las dos pantallas de puntuaciones.** Borrar `seededScores()` y `PLAYERS`,
   añadir `getLeaderboard()` y `formatDate()` de la sección 3.7, y pasar a usarlas
   `app/games/[id]/page.tsx` —que ya no calcula semilla— y `hall-board.tsx`, cuya fila «TU MEJOR MARCA»
   deja de inventar rango y puntuación: si el nombre del usuario de `localStorage` está entre las filas
   reales se muestra la suya, y si no, el bloque no se pinta. Las dos rutas declaran
   `export const dynamic = "force-dynamic"`, porque una puntuación recién guardada tiene que verse al
   volver.
   Verificar: `/hall-of-fame` muestra las doce marcas sembradas en la pestaña de ASTEROIDES y una tabla
   vacía en las otras siete; `/games/asteroides` muestra las diez primeras en el panel lateral.

8. **`app/lib/rate-limit.ts`.** Añadir, junto a `CONTACT_RATE` y `takeContactSlot()`, la constante
   `SCORE_RATE = { max: 5, windowMs: 5 * 60 * 1000 }` y `takeScoreSlot(ip)`, con la misma mecánica de Map
   efímero y la misma advertencia en el comentario.
   Verificar: `npm run lint` y `npx tsc --noEmit` sin errores.

9. **`app/actions/scores.ts`.** La Server Action `submitScore(prev, formData)`, con `"use server"`,
   que: normaliza el nombre a mayúsculas; valida con `validateScore()`; resuelve el juego con `getGame()`
   para comprobar el `max_score`; toma turno con `takeScoreSlot()` usando la IP de `x-forwarded-for`
   igual que `contact.ts`; inserta en `scores` con el cliente de `app/lib/supabase/server.ts`; y llama a
   `revalidateTag("games")` —para el récord de las fichas— más `revalidatePath("/hall-of-fame")` y
   `revalidatePath("/games/[id]", "page")`. Cada mensaje devuelto al cliente es un literal fijo; el
   detalle del error de Postgres va al log del servidor y a ningún sitio más.
   Verificar: `npx tsc --noEmit` sin errores.

10. **El guardado real en el modal.** En `app/lib/session.tsx`, borrar `saveScore()`, `StoredScore` y la
    constante `SCORES_KEY`. En `app/components/player-shell.tsx`, envolver el `.input-row` del modal en un
    `<form>` con `useActionState(submitScore, …)`, un `<input type="hidden" name="gameId">`, el botón
    deshabilitado mientras está pendiente, el `▸ PUNTUACIÓN GUARDADA_` de siempre al terminar bien y el
    error en un `.terminal-error` cuando falla. Las clases del port no cambian.
    Verificar: terminar una partida de ASTEROIDES y guardar añade una fila a `scores`; volver a
    `/hall-of-fame` la muestra.

11. **Avisos de seguridad.** Ejecutar `get_advisors` del MCP en modo `security` y dejar el informe
    limpio: RLS activa en las dos tablas y ninguna vista con `security definer`.
    Verificar: `get_advisors` no devuelve ningún aviso de nivel `ERROR`.

12. **`CLAUDE.md`.** Documentar que el SQL vive en `supabase/migrations/` con nombre
    `<timestamp>_<descripcion>.sql` y se aplica con `apply_migration` del MCP; que `types.ts` se
    regenera después de cada migración; que hay tres clientes de Supabase y para qué sirve cada uno; que
    el catálogo se lee cacheado bajo la etiqueta `games` y las puntuaciones en rutas dinámicas; y que
    `app/lib/games.ts` ya no exporta ningún array.
    Verificar: la sección de convenciones menciona `supabase/migrations/` y los tres clientes.

13. **Verificación final.** `npm run build`, `npm run lint` y `npx tsc --noEmit`. Recorrer las siete
    rutas comprobando que ninguna se rompe con la base de datos respondiendo, y jugar una partida
    completa de ASTEROIDES de principio a puntuación guardada.

---

## 5 — Criterios de aceptación

**Base de datos**

- [ ] `list_tables` devuelve exactamente `games` y `scores` en el esquema `public`.
- [ ] Las dos tablas tienen RLS activa y `get_advisors` en modo `security` no devuelve ningún `ERROR`.
- [ ] `games` tiene ocho filas, con los mismos `id` que el array de SPEC 05 y `sort_order` de 0 a 7.
- [ ] `scores` tiene doce filas, todas con `game_id = 'asteroides'`.
- [ ] `leaderboard` devuelve una sola fila por par (`game_id`, `player`), con `rank` empezando en 1 para
      cada juego.
- [ ] `games_with_best` devuelve `best > 0` para `asteroides` y `best = 0` para los otros siete.
- [ ] Un `insert` anónimo en `scores` con `player = 'ab'` o con `score = -1` es rechazado por el `CHECK`.
- [ ] Un `update` o un `delete` anónimo sobre `scores` no modifica ninguna fila.
- [ ] Un `insert` anónimo en `games` es rechazado por RLS.
- [ ] `supabase/migrations/` contiene los cuatro archivos `.sql` y `list_migrations` los muestra
      registrados con el mismo nombre.

**Catálogo**

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `grep -rn "GAMES" app` no devuelve ningún resultado y `grep -rn "seededScores" app` tampoco.
- [ ] `/games` muestra las ocho fichas, y el buscador y los chips de categoría siguen filtrando igual
      que antes.
- [ ] `/games/asteroides` abre la ficha de detalle y `/games/rocas` sigue devolviendo la pantalla de
      cartucho no encontrado.
- [ ] La portada muestra las mismas seis fichas de siempre en el carril de vista previa, y el bloque de
      estadísticas anuncia `8+ JUEGOS` calculado desde la base de datos.
- [ ] El récord de la ficha de ASTEROIDES coincide con la primera fila de su leaderboard.

**Puntuaciones**

- [ ] `/hall-of-fame` muestra las doce marcas sembradas en la pestaña de ASTEROIDES, con el podio de las
      tres primeras.
- [ ] Las otras siete pestañas muestran la tabla vacía sin romper la pantalla ni el podio.
- [ ] `/games/asteroides` muestra las diez primeras marcas en el panel lateral.
- [ ] Un jugador con tres partidas guardadas del mismo juego aparece una sola vez, con su mejor
      puntuación.
- [ ] Terminar una partida de ASTEROIDES, escribir un nombre y pulsar `GUARDAR PUNTUACIÓN` inserta una
      fila en `scores` y muestra `▸ PUNTUACIÓN GUARDADA_`.
- [ ] Esa puntuación aparece en `/hall-of-fame` y en `/games/asteroides` sin esperar ningún intervalo.
- [ ] Si la puntuación entra en el récord, la ficha de `/games` lo refleja tras la revalidación de la
      etiqueta `games`.
- [ ] Guardar seis veces en cinco minutos desde la misma IP falla la sexta con el mensaje de límite, sin
      insertar.
- [ ] Un nombre con caracteres no permitidos se rechaza con un mensaje en el modal y sin insertar nada.
- [ ] `localStorage["av_scores"]` no se escribe en ningún momento.

**Lo que no debe haber cambiado**

- [ ] Las siete rutas conservan su maquetación y sus clases: ningún componente cambia de markup salvo el
      `<form>` que envuelve el `.input-row` del modal.
- [ ] `app/lib/session.tsx` sigue exportando `useSession()` con `user`, `signIn` y `signOut`, y el login
      falso sigue guardando en `av_user`.
- [ ] `app/lib/engines/`, `app/components/asteroides-game.tsx` y `app/components/game-registry.ts` no
      tienen ni un cambio: el motor del juego sigue sin saber nada de la base de datos.
- [ ] `HOME_TICKER` y `HOME_TOP` de `app/lib/home.ts` conservan sus literales.
- [ ] `.env.example` no gana ninguna variable: este spec no introduce ninguna.
- [ ] Ningún archivo fuera de `app/lib/supabase/` lee `process.env.NEXT_PUBLIC_SUPABASE_*`.
- [ ] La consola del navegador no registra errores ni avisos de hidratación en ninguna de las siete
      rutas.

---

## 6 — Decisiones tomadas y descartadas

**Alcance**

- **Sí:** las dos tablas en el mismo spec. Decisión del usuario. `scores.game_id` referencia a
  `games.id`, así que separarlas dejaría una tabla de puntuaciones apuntando a un catálogo que todavía
  vive en el bundle, o una tabla de juegos que no usa nadie.
- **No:** solo `scores`, con el catálogo en el array. Es menos trabajo, pero mantiene el récord de la
  ficha desconectado del leaderboard que se pinta a su lado.
- **No:** partir en dos specs. Se ofreció y se descartó: el usuario quiere ver el circuito cerrado.
- **No:** tocar el ticker y el top 5 de la portada. Son copia literal de la referencia de SPEC 02 y
  hacerlos reales con un solo juego jugable llenaría la portada de la misma fila cinco veces.

**Esquema**

- **Sí:** `games.id` es el slug (`text`), no un `uuid`. Las URLs ya lo usan desde SPEC 01 y una clave
  sintética obligaría a un segundo campo y a una traducción en cada ruta.
- **Sí:** `CHECK` con listas cerradas para `cat`, `cover` y `color`, en vez de tipos `enum` de Postgres.
  Un `enum` se amplía con un `ALTER TYPE` que no se puede ejecutar dentro de una transacción con otros
  cambios; una lista en un `CHECK` se cambia con un `ALTER TABLE` normal.
- **Sí:** `plays` como texto sembrado. Contar partidas de verdad significa escribir en la base de datos
  al empezar cada partida, que es un camino nuevo con su propio abuso posible.
- **Sí:** `best` derivado en la vista `games_with_best`. Es la única forma de que el récord de la ficha
  no pueda contradecir a la tabla de al lado.
- **No:** `best` como columna mantenida por un trigger. Un valor calculado que se guarda es un valor que
  se puede desincronizar; con ocho juegos y un índice por `(game_id, score desc)`, el `max` es gratis.
- **Sí:** una fila por partida en `scores`, y la deduplicación en la vista. Guardar solo la mejor marca
  perdería el historial, que es lo que un día permitirá contar partidas o enseñar una progresión.
- **Sí:** `rank` calculado dentro de la vista con `row_number()`. Evita que cada pantalla numere las
  filas por su cuenta y que dos pantallas discrepen en cómo se rompe un empate.
- **Sí:** empate resuelto por `created_at asc`. Quien llegó antes al mismo número queda delante.
- **Sí:** `max_score` por juego. Un `CHECK` no puede mirar otra tabla, así que el techo absoluto está en
  `scores` y el techo por juego lo aplica la acción, que ya tiene el juego cargado para otra cosa.

**Migraciones**

- **Sí:** SQL versionado en `supabase/migrations/` y aplicado con `apply_migration` del MCP. Decisión del
  usuario. Quien clone el repositorio ve el esquema y su historia en git, y no hace falta instalar la CLI
  ni Docker.
- **No:** aplicar solo por MCP sin dejar el archivo. El esquema existiría únicamente en el proyecto
  remoto y en un `types.ts` generado, sin forma de revisar un cambio en un diff.
- **No:** la CLI de Supabase con stack local. Es lo más ortodoxo y añade Docker y una dependencia de
  tooling a un proyecto que hoy se levanta con `npm run dev`.
- **Sí:** cuatro migraciones pequeñas —esquema, vistas, juegos, puntuaciones— en vez de una grande. La
  semilla es lo que más probablemente se quiera repetir o descartar por separado.
- **Sí:** semillas con `on conflict do nothing`. Reaplicarlas no duplica filas.

**Escrituras y seguridad**

- **Sí:** inserción anónima en `scores` con RLS abierta al `insert`. Decisión del usuario. Es lo único
  coherente con una sesión que vive en `localStorage`: exigir un usuario real convertiría este spec en
  el spec de autenticación.
- **No:** escritura solo con auth de Supabase. Dejaría el leaderboard en solo lectura hasta que llegue
  ese spec, con un juego jugable y ninguna forma de competir.
- **No:** insertar con la clave secreta desde el servidor. SPEC 04 dejó fuera `sb_secret_…` a propósito,
  y una clave que se salta la RLS no entra para hacer lo que la RLS ya permite.
- **Sí:** la inserción va por Server Action y no desde el navegador. Decisión del usuario. Es lo que
  permite validar en el servidor, limitar por IP y revalidar las páginas afectadas en la misma llamada.
- **Sí:** `CHECK` en Postgres **y** límite por IP en la acción. Decisión del usuario. El `CHECK` es la
  última línea y protege aunque alguien llame a PostgREST directamente; el límite evita que quien lo
  haga por la aplicación llene la tabla.
- **Sí:** reutilizar `app/lib/rate-limit.ts` de SPEC 03. Misma mecánica, mismo comentario sobre su
  naturaleza efímera, y un archivo menos.
- **Sí:** sin políticas de `update` ni `delete` en ninguna de las dos tablas. Una fila guardada es
  inmutable desde la API, y moderar se hace por SQL.
- **Sí:** `security_invoker = true` en las dos vistas. Sin él la vista se ejecuta con los permisos de su
  creador y se salta la RLS de las tablas que consulta.

**Lectura y caché**

- **Sí:** todo se lee en el servidor y baja por props. Decisión del usuario. `hall-board` y
  `library-grid` siguen ocupándose solo de la pestaña y del filtro, sin ganar estados de carga ni de
  error que hoy no tienen.
- **No:** consultar desde el navegador al cambiar de pestaña. Añade un parpadeo por pestaña a una
  pantalla que hoy conmuta al instante.
- **Sí:** catálogo cacheado con `unstable_cache` y etiqueta `games`, puntuaciones en rutas dinámicas.
  Decisión del usuario. El catálogo cambia con una migración; una puntuación tiene que verse al volver
  de la partida.
- **Sí:** un tercer cliente sin cookies en `app/lib/supabase/public.ts`. `unstable_cache` no admite
  dentro las APIs de petición y el cliente de `server.ts` llama a `cookies()`, así que el cacheado
  necesita un cliente que no las toque. También es lo correcto conceptualmente: el catálogo es público y
  no depende de quién lo pida.
- **Sí:** `unstable_cache` y no `use cache`. `next.config.ts` no activa `cacheComponents`, y activarlo
  cambia el modelo de renderizado de las siete rutas. Ese es otro spec, y está anotado fuera de alcance.
- **Sí:** `revalidateTag("games")` además de los dos `revalidatePath`. El récord de la ficha vive en la
  consulta cacheada del catálogo; sin invalidar la etiqueta seguiría enseñando el récord anterior.

**Datos y pantallas**

- **Sí:** sembrar solo ASTEROIDES. Decisión del usuario. Es el único juego jugable desde SPEC 05, así
  que es el único donde una marca sembrada significa algo; las otras siete tablas vacías son la verdad.
- **No:** sembrar doce filas por juego. Llenaría las ocho pantallas, pero volvería a poner datos
  inventados justo donde este spec los quita.
- **Sí:** borrar `seededScores()` sin dejar respaldo. Decisión del usuario. Un fallback silencioso a
  filas inventadas hace imposible distinguir una base de datos caída de una tabla vacía.
- **Sí:** la fila «TU MEJOR MARCA» del Salón de la Fama pasa a ser real o no aparece. Con datos de
  verdad al lado, un rango calculado con `8 + (id.length % 4)` deja de ser una maqueta y pasa a ser una
  mentira.
- **Sí:** `Game` sigue siendo un tipo escrito a mano, con la conversión concentrada en una función. Los
  tipos generados dan `string` donde la interfaz necesita uniones, y las columnas de una vista salen
  anulables.
- **No:** derivar `Game` de `Tables<"games_with_best">`. Obligaría a un `!` o a un `?? ""` en cada campo
  y en cada componente que lo pinta.
- **Sí:** `HOME_STATS` pasa a ser la función `homeStats(gameCount)`. Hoy es una constante que importa
  `GAMES` para contar ocho; sin el array, el número tiene que entrar desde fuera.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                      | Mitigación                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La tabla `scores` acepta inserciones anónimas desde internet: cualquiera puede escribir un millón de puntos | `CHECK` de nombre y de puntuación en Postgres, techo por juego en la acción y cupo de cinco envíos por IP cada cinco minutos. Sin `update` ni `delete`, lo peor que puede pasar es basura que se limpia con un `delete` SQL. |
| El cupo por IP vive en un `Map` de módulo: muere con el proceso y no se comparte entre instancias           | Es la misma limitación que SPEC 03 aceptó para el formulario de contacto, y está documentada en el propio archivo. Un almacén compartido es el primer cambio si esto llega a importar.                                       |
| Siete de los ocho cartuchos pasan a mostrar `best: 0` y una tabla de puntuaciones vacía                     | Es la consecuencia buscada de quitar los datos inventados. La pantalla vacía se maqueta con lo que ya hay; el día que se porte otro juego, sus marcas aparecen solas.                                                        |
| Si Supabase no responde, las siete rutas se quedan sin catálogo y sin puntuaciones                          | Ya no hay array de respaldo, por decisión explícita. Cada consulta devuelve lista vacía y registra el error en el servidor, así que la pantalla se ve vacía pero no revienta. Aceptado.                                      |
| Las variables `NEXT_PUBLIC_SUPABASE_*` mal configuradas rompen ahora pantallas, no solo módulos sin usar    | Es el riesgo que SPEC 04 anotó y aplazó: este es el primer spec que consulta de verdad. El fallo sale con el error de Supabase en el log del servidor, no en silencio.                                                       |
| Quitar `saveScore()` deja huérfanas las filas ya guardadas en `localStorage["av_scores"]`                   | Nadie las leía: el Salón de la Fama usaba `seededScores()`. Quedan como historia inerte en el navegador de quien jugó, y ningún módulo vuelve a tocar esa clave.                                                             |
| `unstable_cache` es una API inestable y con `cacheComponents` cambiaría de nombre                           | Es la API que la documentación de Next 16 indica para proyectos sin Cache Components, que es el caso. El uso está aislado en dos funciones de `app/lib/games.ts`; migrar es cambiar ese archivo.                             |
| La vista `leaderboard` recalcula un `distinct on` sobre toda la tabla en cada consulta                      | Con el índice `(game_id, score desc, created_at)` y una tabla de docenas de filas es irrelevante. El día que crezca, la sustituye una vista materializada o una RPC con `limit` empujado hacia dentro.                       |
| Dos pantallas pasan a `force-dynamic` y dejan de prerrenderizarse                                           | Es lo que compra que una puntuación recién guardada se vea al volver. Son dos rutas de siete, y el catálogo que pintan sigue saliendo de la consulta cacheada.                                                               |
| Un jugador escribe el nombre de otro y le sube una marca falsa                                              | No hay identidad hasta el spec de autenticación: el nombre es un texto libre. Está aceptado y es la razón por la que la tabla lleva `created_at` y no permite borrados desde la API.                                         |
| El `CHECK` del patrón de `player` rechaza el `"INVITADO"` por defecto del modal si alguien lo alarga        | `INVITADO` son ocho caracteres y encaja en el patrón. El input ya recorta a diez y pasa a mayúsculas; la acción vuelve a normalizar antes de validar.                                                                        |
| Las semillas quedan desincronizadas de `app/lib/games.ts` si alguien edita el array por costumbre           | El array desaparece en el paso 6 y hay un criterio de aceptación que comprueba que `grep -rn "GAMES" app` no devuelve nada. Después del spec, el catálogo solo se edita por migración.                                       |

---

## 8 — Lo que **no** entra en este spec

- Autenticación real: la sesión sigue en `localStorage` y `scores` no tiene `user_id`.
- El ticker y el top 5 de la portada, que siguen siendo literales de SPEC 02.
- Un contador de partidas real: `plays` sigue sembrado como texto.
- Panel de administración del catálogo, y borrado o moderación de puntuaciones desde la aplicación.
- Realtime en el Salón de la Fama y paginación más allá de las doce primeras marcas.
- Migrar las filas antiguas de `localStorage["av_scores"]`.
- Portar Tetris, Arkanoid o cualquier otro de los siete cartuchos que siguen sin ser un juego.
- Activar `cacheComponents` y migrar el proyecto al modelo de caché nuevo de Next 16.
- Tests automatizados, que siguen pendientes desde SPEC 01.

Cada uno de estos, si llega, va en su propio spec.
