# SPEC 04 — Integración con Supabase

> **Estado:** Approved
> **Depende de:** SPEC 03
> **Fecha:** 2026-09-04
> **Objetivo:** Dejar el proyecto de Supabase conectado a la aplicación —dependencias, variables de entorno, clientes de navegador y de servidor y tipos generados— sin tocar ninguna pantalla ni crear ninguna tabla.

---

## 1 — Por qué existe este spec

Hasta aquí la aplicación es una maqueta con una sola grieta hacia fuera: el formulario de contacto de
SPEC 03, que habla con Resend desde una Server Action. Todo lo demás es mentira consentida. El usuario
que «inicia sesión» vive en `localStorage` bajo `av_user` (`app/lib/session.tsx`), las puntuaciones del
Salón de la Fama las inventa una semilla determinista (`app/lib/scores.ts`) y los ocho juegos viajan en
el bundle (`app/lib/games.ts`).

Sustituir esas tres mentiras por datos reales son tres specs, no uno. Este spec no sustituye ninguna:
solo pone los cables. Al terminar, la aplicación se ve y se comporta exactamente igual que antes, pero
cualquier módulo puede pedir un cliente de Supabase tipado y hablar con el proyecto.

El proyecto remoto ya existe y está conectado por MCP (`.mcp.json`, `project_ref=oobeaihkamxugtjbthjl`).
Su esquema `public` tiene **cero tablas**, y al terminar este spec seguirá teniendo cero. Las tablas son
del spec que las necesite.

La dependencia con SPEC 03 es de convención, no de código: allí se fijó cómo se documentan las
variables de entorno, que `.env.example` se versiona y que `.gitignore` lleva la excepción `!.env.example`.
Este spec añade dos variables siguiendo esas mismas reglas.

---

## 2 — Alcance

**Dentro:**

- Las dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Dos variables de entorno nuevas, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  documentadas en `.env.example` y en `CLAUDE.md`.
- `app/lib/supabase/client.ts`: el cliente de navegador, para Client Components.
- `app/lib/supabase/server.ts`: el cliente de servidor, ligado a las cookies de la petición, para Server
  Components, Server Actions y Route Handlers.
- `app/lib/supabase/types.ts`: el tipo `Database` generado desde el proyecto remoto, con el que se tipan
  los dos clientes.
- Versionar `.mcp.json`, que hoy está sin seguimiento.
- Retirar `SUPABASE_DB_PASSWORD` de `.env.example`.

**Fuera de alcance (para specs futuros):**

- **Cualquier tabla.** Ni `profiles`, ni `scores`, ni `games`. El esquema `public` termina este spec como
  lo empieza: vacío.
- **Migraciones, RLS y políticas.** Sin tablas no hay nada que migrar ni que proteger. La forma de
  aplicar y versionar migraciones se decide en el spec que cree la primera tabla.
- **Autenticación real.** `app/lib/session.tsx` y `app/components/auth-form.tsx` no se tocan: el usuario
  sigue viviendo en `localStorage`. Ni método de acceso, ni pantalla de callback, ni cierre de sesión.
- **`proxy.ts` para refrescar la sesión.** Sin sesiones no hay nada que refrescar. Nota para ese spec: en
  Next 16 el archivo es `proxy.ts`; `middleware.ts` está deprecado y renombrado
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
- **Ruta de diagnóstico o script de comprobación de conexión.** Se descartaron de forma explícita: la
  verificación de este spec es que el proyecto compile.
- **Puntuaciones reales.** `app/lib/scores.ts` sigue generando filas con `seededScores`.
- **El catálogo en base de datos.** `GAMES` sigue siendo un array en `app/lib/games.ts`.
- **Persistir los mensajes del formulario de contacto.** SPEC 03 lo dejó fuera y sigue fuera.
- **La clave secreta (`service_role`).** Nada de este spec necesita saltarse RLS.
- **Storage, Realtime y Edge Functions.**
- **Tests automatizados.** El proyecto sigue sin runner desde SPEC 01.

---

## 3 — Modelo de datos

Este spec **no crea ninguna estructura de datos en la base de datos**. Lo que introduce son tres módulos
y dos variables de entorno.

### 3.1 — `app/lib/supabase/types.ts` — el esquema tipado

Archivo generado, no escrito a mano. Sale del proyecto remoto con la herramienta
`generate_typescript_types` del MCP de Supabase y se pega tal cual, con una cabecera que deje claro que
es generado y cómo se regenera.

```ts
// app/lib/supabase/types.ts
// Generado desde el proyecto de Supabase. No editar a mano.
export type Database = {
    public: {
        Tables: Record<string, never>; // hoy: 0 tablas
        // Views, Functions, Enums, CompositeTypes…
    };
};
```

Con el esquema vacío el archivo es casi anecdótico. Entra igual porque es lo que hace que los dos
clientes salgan tipados desde el primer día: cuando aparezca la primera tabla, se regenera el archivo y
todas las llamadas quedan tipadas sin tocar ningún otro módulo.

### 3.2 — `app/lib/supabase/client.ts` — el cliente de navegador

```ts
// app/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/app/lib/supabase/types";

export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
}
```

Es una función, no un singleton exportado. Se llama dentro del componente que lo necesite.

### 3.3 — `app/lib/supabase/server.ts` — el cliente de servidor

```ts
// app/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/app/lib/supabase/types";

export async function createClient() {
    const cookieStore = await cookies(); // en Next 16 cookies() es asíncrono
    return createServerClient<Database>(url, key, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    /* cookieStore.set por cada una */
                } catch {
                    // Llamado desde un Server Component: se ignora. Lo resolverá el
                    // proxy.ts de refresco de sesión cuando llegue el spec de auth.
                }
            },
        },
    });
}
```

Es `async` porque `cookies()` lo es. Se crea uno por petición: la sesión vive en las cookies de esa
petición, así que reutilizar una instancia entre peticiones mezclaría usuarios.

### 3.4 — Variables de entorno

| Variable                               | Obligatoria | Para qué                                                                                           |
| -------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Sí          | URL de la API del proyecto, `https://<project-ref>.supabase.co`.                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí          | Clave publicable del proyecto. Es pública por diseño: viaja al navegador y lo que la acota es RLS. |

Las dos llevan `NEXT_PUBLIC_`, al revés que las tres de SPEC 03. Es deliberado: el cliente de navegador
las necesita en el bundle. Ninguna clave secreta entra en este spec.

Los valores reales van en `.env.local`, que `.gitignore` ya ignora. En `.env.example` van placeholders,
igual que en SPEC 03.

---

## 4 — Plan de implementación

Cada paso deja la aplicación compilando y las siete rutas navegables.

1. **Dependencias.** `npm install @supabase/supabase-js @supabase/ssr`, las dos en `dependencies`.
   Verificar: aparecen en `package.json` y `npm run build` sigue pasando.

2. **Variables de entorno.** Añadir a `.env.example` un bloque nuevo, bajo el de contacto, con
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y un comentario que explique que
   la clave publicable es pública y que la protección real es RLS. En el mismo paso, **borrar la línea
   `SUPABASE_DB_PASSWORD=`**: ningún módulo la lee y su sitio, si alguna vez hace falta para la CLI, es
   `.env.local`. Rellenar `.env.local` con los valores reales del proyecto — la URL sale de
   `get_project_url` y la clave de `get_publishable_keys`, ambas del MCP, o del panel de Supabase.
   Verificar: `git status` no muestra `.env.local`, y `.env.example` no contiene ningún valor real.

3. **`app/lib/supabase/types.ts`.** Generar los tipos con `generate_typescript_types` del MCP y guardar
   la salida con la cabecera de «archivo generado». Con cero tablas el `Database` sale prácticamente
   vacío; es lo esperado.
   Verificar: `npx tsc --noEmit` sin errores y el archivo exporta `Database`.

4. **`app/lib/supabase/client.ts`.** La función `createClient()` de la sección 3.2, tipada con
   `Database`. Sin `"use client"`: el módulo no es un componente, lo importan los que sí lo son.
   Verificar: `npx tsc --noEmit` sin errores.

5. **`app/lib/supabase/server.ts`.** La función `async createClient()` de la sección 3.3, con `getAll` y
   `setAll` y el `try/catch` del patrón oficial de Supabase para Next.js.
   Verificar: `npx tsc --noEmit` sin errores.

6. **`CLAUDE.md`.** Ampliar la sección de variables de entorno con las dos nuevas y añadir una nota corta
   en las convenciones: dónde viven los dos clientes, que el de servidor es `async`, que los tipos de
   `app/lib/supabase/types.ts` se regeneran con el MCP cada vez que cambie el esquema, y que el
   `proxy.ts` de refresco de sesión llega con el spec de autenticación.
   Verificar: la tabla de variables de `CLAUDE.md` lista las cinco variables del proyecto.

7. **Versionar `.mcp.json`.** El archivo solo contiene la URL del servidor MCP con el `project_ref`;
   ninguna clave, porque la sesión se autentica por OAuth. Versionarlo hace que quien clone el
   repositorio tenga el servidor configurado.
   Verificar: `git status` ya no lo muestra como archivo sin seguimiento y el archivo no contiene ninguna
   clave.

8. **Verificación final.** `npm run build`, `npm run lint` y `npx tsc --noEmit`. Recorrer las siete rutas
   (`/`, `/games`, `/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame`, `/about`) comprobando que
   ninguna cambió de aspecto ni de comportamiento.

---

## 5 — Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `@supabase/supabase-js` y `@supabase/ssr` están en `dependencies` de `package.json`, no en
      `devDependencies`.
- [ ] `app/lib/supabase/client.ts` exporta `createClient()` y devuelve un cliente tipado con `Database`.
- [ ] `app/lib/supabase/server.ts` exporta `async createClient()` y usa `await cookies()`.
- [ ] `app/lib/supabase/types.ts` exporta `Database` y lleva en su cabecera que es un archivo generado.
- [ ] `.env.example` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` **sin
      ningún valor real**, y ya no contiene `SUPABASE_DB_PASSWORD`.
- [ ] `git status` no muestra `.env.local`.
- [ ] `.mcp.json` está versionado y no contiene ninguna clave ni token.
- [ ] `CLAUDE.md` documenta las dos variables nuevas y la ubicación de los dos clientes.
- [ ] Ningún archivo fuera de `app/lib/supabase/` lee `process.env.NEXT_PUBLIC_SUPABASE_*`
      (`grep -r NEXT_PUBLIC_SUPABASE app` solo devuelve resultados en esa carpeta).
- [ ] El esquema `public` del proyecto de Supabase sigue con **cero tablas** al terminar el spec.
- [ ] No existe `middleware.ts` ni `proxy.ts` en la raíz del repositorio.
- [ ] No se ha creado ninguna ruta nueva: `app/` tiene exactamente las mismas páginas y Route Handlers
      que antes del spec.
- [ ] `app/lib/session.tsx`, `app/components/auth-form.tsx`, `app/lib/scores.ts` y `app/lib/games.ts` no
      tienen ni un cambio.
- [ ] Las siete rutas se ven y se comportan exactamente igual que antes: el login falso sigue guardando
      en `localStorage` y el Salón de la Fama sigue mostrando las filas de `seededScores`.
- [ ] La consola del navegador no registra ningún error nuevo en ninguna de las siete rutas.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** este spec es solo el cableado. El usuario acotó el alcance a «solo la integración con Supabase»
  y aplazó de forma explícita autenticación, tablas y verificación en caliente. Queda registrado que la
  fase de preguntas se cerró pronto por decisión suya: las decisiones de auth y de esquema no están
  tomadas aquí, se toman en sus specs.
- **Sí:** `@supabase/ssr` con `createBrowserClient` y `createServerClient`. Es el camino que Supabase
  documenta para el App Router y el único que guarda la sesión en cookies, que es lo que permite que
  servidor y navegador vean al mismo usuario.
- **No:** `createClient` de `@supabase/supabase-js` a secas. Guarda la sesión en `localStorage`, invisible
  para el servidor, y obligaría a rehacer los dos módulos en cuanto llegue la autenticación.
- **Sí:** una función `createClient()` por módulo, llamada donde se necesite. El cliente de servidor
  depende de las cookies de su petición; un singleton compartido mezclaría sesiones entre usuarios.
- **Sí:** el nombre `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, que es el que usa hoy la documentación de
  Supabase para Next.js.
- **No:** la `anon key` heredada. Es el nombre antiguo de la misma idea; empezar por el nuevo evita
  renombrar variables dentro de tres specs.
- **No:** la clave secreta (`service_role`). Nada de este spec la necesita, y una clave que se salta RLS
  no se añade «por si acaso»: entra el día que un módulo concreto la justifique.
- **Sí:** generar `types.ts` aunque el esquema esté vacío. Tipar los dos clientes ahora cuesta un archivo;
  hacerlo después obliga a repasar cada llamada ya escrita.
- **No:** tablas, RLS ni migraciones en este spec. Cómo se aplican y versionan las migraciones —MCP, SQL
  en el repositorio o CLI local— es una decisión con consecuencias largas, y se toma en el spec que cree
  la primera tabla, no de pasada aquí.
- **No:** `proxy.ts` de refresco de sesión. Decisión del usuario: llega con el spec de autenticación,
  que es cuando existe una sesión que refrescar. Anotado en el alcance que el archivo se llama `proxy.ts`,
  no `middleware.ts`, porque en Next 16 la convención antigua está deprecada.
- **No:** ruta `/api/supabase-health` ni script `npm run supabase:check`. Decisión del usuario: la
  verificación de este spec es que compile. El coste es que el primer spec que consulte de verdad la base
  de datos será también el primero en descubrir un error de configuración; está anotado en los riesgos.
- **Sí:** retirar `SUPABASE_DB_PASSWORD` de `.env.example`. Ningún módulo de la aplicación la lee: es una
  credencial de la CLI de Supabase, y una contraseña de base de datos no se anuncia en un archivo de
  ejemplo versionado. Si la CLI entra en algún spec, la variable vuelve con su justificación.
- **Sí:** versionar `.mcp.json`. Solo lleva la URL del servidor MCP con el `project_ref` del proyecto;
  la autenticación es OAuth por sesión, así que el archivo no contiene ningún secreto y ahorra la
  configuración a quien clone el repositorio.
- **Sí:** `app/lib/supabase/` como carpeta propia, en vez de tres archivos sueltos en `app/lib/`. Son las
  tres piezas de una misma integración y así el `grep` del criterio de aceptación tiene un límite claro.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                                      | Mitigación                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La clave publicable viaja al navegador dentro del bundle                                                                                    | Es su naturaleza: la clave publicable está pensada para ser pública y lo que acota lo que puede hacer es RLS. Hoy no hay ninguna tabla que proteger; el spec que cree la primera es el que debe activar RLS antes de exponerla. |
| Los `!` de TypeScript en `process.env` no comprueban nada: sin variables, el cliente se crea con `undefined` y falla en tiempo de ejecución | En este spec no lo llama nadie, así que no puede romper ninguna pantalla. El primer spec que use un cliente decide qué hacer cuando faltan las variables, igual que SPEC 03 decidió el modo consola de Resend.                  |
| `types.ts` se queda obsoleto en cuanto aparezca la primera tabla                                                                            | Es un archivo generado y se regenera con el MCP. `CLAUDE.md` lo documenta como paso obligatorio de cualquier cambio de esquema.                                                                                                 |
| `setAll` lanza al llamarse desde un Server Component                                                                                        | El `try/catch` del patrón oficial lo absorbe. La consecuencia real —que la sesión no se refresque sola— no existe hasta que haya sesiones, y la resuelve el `proxy.ts` del spec de autenticación.                               |
| Sin verificación en caliente, un error de configuración pasa inadvertido hasta el siguiente spec                                            | Aceptado por decisión explícita. El fallo aparecerá en la primera consulta real, con el error de Supabase delante, no en silencio.                                                                                              |
| `.env.local` acaba en el repositorio                                                                                                        | `.gitignore` ya ignora `.env*` y `.env.local` de forma redundante, con la única excepción `!.env.example` que introdujo SPEC 03. Hay un criterio de aceptación que lo comprueba.                                                |

---

## 8 — Lo que **no** entra en este spec

- Ninguna tabla, ninguna migración, ninguna política de RLS. El esquema `public` acaba vacío.
- Autenticación real: `session.tsx` y `auth-form.tsx` siguen usando `localStorage`.
- `proxy.ts` de refresco de sesión.
- Puntuaciones reales y catálogo de juegos en base de datos.
- Ruta de diagnóstico, script de comprobación o cualquier cambio visible en las siete rutas.
- Clave secreta, Storage, Realtime y Edge Functions.
- Tests automatizados, que siguen pendientes desde SPEC 01.

Cada uno de estos, si llega, va en su propio spec.
