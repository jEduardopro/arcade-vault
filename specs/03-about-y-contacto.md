# SPEC 03 — Acerca de y el formulario de contacto

> **Estado:** Implemented
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-09-02
> **Objetivo:** Portar `references/templates/home-about/about.jsx` a la ruta `/about` y hacer que su formulario de contacto envíe correo de verdad con Resend a través de una Server Action.

---

## 1 — Por qué existe este spec

SPEC 02 dejó la página Acerca de fuera de alcance de forma explícita: portó el `styles.css` completo de
`references/templates/home-about/`, así que **todo el CSS de esta pantalla ya está en `app/globals.css`**
(líneas 1102–1180: `.about-hero`, `.about-title`, `.highlight`, `.about-divider`, `.contact-grid`,
`.contact-form`, `.terminal-success`, `.term-*`), pero no creó ni la ruta ni el enlace del Nav para no
dejar un enlace visible apuntando a un 404. Este spec cierra ese hueco.

La diferencia con los dos specs anteriores es que aquí el proyecto deja de ser una maqueta. Hasta ahora
todo era estático o `localStorage`: no hay backend, ni dependencias fuera de Next y React, ni variables
de entorno. El formulario de contacto es el primer punto donde la aplicación habla con un servicio
externo, y eso arrastra decisiones que la referencia no tiene, porque en ella `onSubmit` solo hacía
`setSent(form.name)` sin enviar nada.

El markup y las clases se copian del template tal cual. Lo que se añade es la mitad que el template
finge: validación en servidor, límite de envíos, estado de envío en curso y estado de error.

---

## 2 — Alcance

**Dentro:**

- Ruta `/about` con las dos secciones de `about.jsx` en su orden: el héroe «ACERCA DE ARCADE VAULT» con
  sus tres _highlights_, el divisor pixelado y la sección de contacto.
- Los tres iconos pixelados del héroe (`HEART`, `BROWSER`, `PLANT`), copiados `rect` a `rect`.
- El formulario de contacto con sus tres campos (nombre, correo, mensaje), su `shake` de validación y su
  terminal de éxito `VAULT-OS // TERMINAL`.
- Envío real de correo con **Resend**, desde una **Server Action**, no desde un Route Handler.
- Validación en el servidor: campos no vacíos, formato de correo y topes de longitud.
- Límite de envíos por IP, en memoria del proceso.
- Estado de envío en curso (botón bloqueado con `ENVIANDO…`) y estado de error (terminal en rojo con
  botón `REINTENTAR` que conserva lo escrito).
- Modo consola cuando falta `RESEND_API_KEY` fuera de producción: el mensaje se escribe en el log del
  servidor y el formulario responde con éxito.
- El enlace **Acerca de** en el Nav, escritorio y móvil, en la misma posición que `nav.jsx`.
- `.env.example` versionado con las tres variables, y la excepción correspondiente en `.gitignore`.
- Un bloque `.terminal-error` nuevo en `app/globals.css`, la única regla que no viene del port literal.

**Fuera de alcance (para specs futuros):**

- Persistir los mensajes en cualquier sitio (base de datos, archivo, panel de administración). El correo
  es el único destino.
- Acuse de recibo automático al remitente. Duplicaría los envíos y convertiría el formulario en un
  amplificador de spam.
- Cuerpo del correo maquetado en HTML. Se manda texto plano.
- El asunto dinámico con el nombre de quien escribe. El asunto es fijo; el nombre va en el cuerpo.
- Honeypot, CAPTCHA o cualquier otra protección anti-bot más allá del límite por IP.
- Que el envío funcione con JavaScript desactivado. Sin JS la página se lee entera, pero no se envía.
- Un límite por IP compartido entre instancias (Redis, KV o similar). El contador vive en memoria y se
  pierde al reiniciar el proceso.
- El mando de arcade (`.gp-*`, `.gp-themer`, `.score-pop`), que sigue siendo CSS sin componente desde
  SPEC 02.
- Autenticación real, internacionalización y tests automatizados. Siguen pendientes desde SPEC 01.

---

## 3 — Modelo de datos

Tres módulos nuevos. No hay base de datos: lo único que sobrevive a la petición es el contador de
envíos por IP, y solo mientras el proceso siga vivo.

### 3.1 — `app/lib/about.ts` — los literales de la pantalla

```ts
// app/lib/about.ts
import type { AccentColor } from "@/app/lib/home";

export type HighlightIconKind = "HEART" | "BROWSER" | "PLANT";

export type AboutHighlight = {
    icon: HighlightIconKind;
    text: string; // "HECHO CON ❤️ PARA JUGADORES"
    color: AccentColor; // "magenta" | "cyan" | "green"
};

export type ContactTip = {
    text: string; // "RESPUESTA EN 24-48H"
    led: "green" | "yellow" | "magenta"; // clase "", "y", "m" del .tip-led
};

export const ABOUT_HIGHLIGHTS: readonly AboutHighlight[]; // los 3 de about.jsx
export const CONTACT_TIPS: readonly ContactTip[]; // los 3 .tip
export const DIVIDER_PIXELS = 24; // los <span> del .div-pixels
```

`AccentColor` se reutiliza de `app/lib/home.ts`: es exactamente el mismo conjunto de acentos.

### 3.2 — `app/lib/contact.ts` — el contrato del formulario

```ts
// app/lib/contact.ts

export const CONTACT_LIMITS = {
    name: 80,
    email: 160,
    message: 4000,
} as const;

export type ContactInput = { name: string; email: string; message: string };

// El estado que la Server Action devuelve al formulario.
//   idle    → nada enviado todavía; se pinta el formulario
//   invalid → los datos no pasan la validación; el formulario tiembla y se queda
//   sent    → correo entregado (o registrado en consola); terminal verde
//   failed  → fallo de transporte, configuración o límite; terminal roja
export type ContactState =
    | { status: "idle" }
    | { status: "invalid"; message: string }
    | { status: "sent"; name: string }
    | { status: "failed"; message: string };

export const CONTACT_IDLE: ContactState = { status: "idle" };

// Validación pura, sin dependencias del servidor, para poder llamarla desde la
// Server Action y desde cualquier prueba futura.
export function validateContact(input: ContactInput):
    | { ok: true; value: ContactInput } // con los tres campos ya recortados
    | { ok: false; message: string };
```

Reglas de `validateContact`, en este orden:

1. Recorta los tres campos con `trim()`.
2. Si alguno queda vacío → `"Rellena los tres campos antes de enviar."`
3. Si el correo no encaja con un patrón `algo@algo.algo` sin espacios →
   `"Ese correo no parece válido."`
4. Si algún campo supera su tope de `CONTACT_LIMITS` → `"El mensaje es demasiado largo."`

### 3.3 — `app/lib/rate-limit.ts` — el contador por IP

```ts
// app/lib/rate-limit.ts

export const CONTACT_RATE = {
    max: 3, // envíos permitidos
    windowMs: 10 * 60 * 1000, // por ventana de 10 minutos
} as const;

// Devuelve false cuando la IP ya agotó su cuota en la ventana actual.
export function takeContactSlot(ip: string): boolean;
```

Implementación: un `Map<string, number[]>` a nivel de módulo con las marcas de tiempo de los envíos de
cada IP. En cada llamada se descartan las anteriores a `Date.now() - windowMs`; si quedan `max` o más,
devuelve `false`. Las entradas que se quedan sin marcas se borran del `Map`, para que no crezca sin
límite. Es deliberadamente efímero: se pierde en cada reinicio y no se comparte entre instancias.

### 3.4 — Variables de entorno

| Variable             | Obligatoria   | Para qué                                                                            |
| -------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `RESEND_API_KEY`     | En producción | Clave de la API de Resend. Sin ella, fuera de producción se activa el modo consola. |
| `CONTACT_TO_EMAIL`   | Sí            | Buzón del equipo que recibe los mensajes.                                           |
| `CONTACT_FROM_EMAIL` | Sí            | Remitente verificado en Resend (p. ej. `Arcade Vault <hola@midominio.com>`).        |

Ninguna lleva el prefijo `NEXT_PUBLIC_`: las tres se leen solo dentro de la Server Action, así que
nunca viajan al navegador.

---

## 4 — Plan de implementación

Cada paso deja la aplicación compilando y navegable.

1. **Dependencia y configuración.** `npm install resend`. Crear `.env.example` con las tres variables y
   valores de ejemplo, y añadir `!.env.example` a `.gitignore` (el patrón `.env*` actual también lo
   ignoraría). Documentar las tres variables en `CLAUDE.md`, en una sección de configuración nueva.
   Verificar: `.env.example` aparece en `git status` como archivo sin seguimiento y `npm run build` sigue
   pasando.

2. **`app/lib/contact.ts`.** Los tipos, `CONTACT_LIMITS`, `CONTACT_IDLE` y `validateContact` de la
   sección 3.2. Módulo puro, sin `"use server"` ni importaciones de Next.
   Verificar: `npx tsc --noEmit` sin errores.

3. **`app/lib/rate-limit.ts`.** `CONTACT_RATE` y `takeContactSlot` de la sección 3.3.
   Verificar: `npx tsc --noEmit` sin errores.

4. **`app/actions/contact.ts` — la Server Action.** Archivo con `"use server"` que exporta
   `sendContactMessage(prev: ContactState, formData: FormData): Promise<ContactState>`, con esta
   secuencia:
    1. Lee `name`, `email` y `message` del `FormData` y los pasa por `validateContact`. Si falla →
       `{ status: "invalid", message }`.
    2. Obtiene la IP con `await headers()` (en Next 16 `headers()` es asíncrono), tomando la primera
       entrada de `x-forwarded-for` y cayendo en `"unknown"` si no viene. Si `takeContactSlot` devuelve
       `false` → `{ status: "failed", message: "Demasiados envíos desde esta conexión. Inténtalo en unos minutos." }`.
    3. Si no hay `RESEND_API_KEY`:
        - fuera de producción → `console.info` con el mensaje completo y `{ status: "sent", name }`;
        - en producción → `{ status: "failed", message: "El servicio de correo no está configurado." }`.
    4. Llama a `resend.emails.send` con `from: CONTACT_FROM_EMAIL`, `to: CONTACT_TO_EMAIL`,
       `replyTo` con el correo del formulario, `subject: "Arcade Vault · Nuevo mensaje de contacto"` y un
       `text` plano con nombre, correo y mensaje. Toda la llamada va dentro de un `try/catch`.
    5. Si Resend devuelve error o el `catch` se dispara → `console.error` en el servidor y
       `{ status: "failed", message: "No pudimos enviar el mensaje. Inténtalo de nuevo." }`. Si va bien →
       `{ status: "sent", name }`.

    Ningún mensaje devuelto al cliente incluye el detalle del error de Resend; ese detalle solo va al log.
    Verificar: sin `RESEND_API_KEY` en `.env.local`, enviar el formulario en `npm run dev` imprime el
    mensaje en la terminal del servidor y pinta la terminal de éxito.

5. **`app/globals.css` — la variante de error.** Añadir, al final del archivo y bajo un comentario que
   deje claro que es la única regla que no viene del port de `references/templates/home-about/styles.css`:

    ```css
    .terminal-error {
        border-color: var(--magenta);
        box-shadow: 0 0 22px rgba(255, 0, 110, 0.25);
    }
    .terminal-error .term-body .line {
        color: var(--magenta);
    }
    .terminal-error .term-body .dim {
        color: var(--ink-dim);
    }
    .terminal-error .term-body .success {
        color: var(--magenta);
        text-shadow: 0 0 6px rgba(255, 0, 110, 0.45);
    }
    ```

    Se aplica junto a `.terminal-success`, no en su lugar: la estructura (barra, puntos, cuerpo) es la
    misma y solo cambia el color. Verificar: el resto de pantallas no cambia de aspecto.

6. **`app/lib/about.ts`.** Los tipos y las tres constantes de la sección 3.1, con los literales copiados
   palabra por palabra de `about.jsx`, incluido el emoji de «HECHO CON ❤️ PARA JUGADORES».
   Verificar: `ABOUT_HIGHLIGHTS.length === 3` y `CONTACT_TIPS.length === 3`.

7. **`app/components/about-highlight-icon.tsx`.** El equivalente de `HighlightIcon`: un `switch` sobre
   `HighlightIconKind` que devuelve el SVG 16×16 correspondiente con `className="hl-icon"` y
   `fill="currentColor"`, copiando los `rect` uno a uno, incluidos los `fill="#0a0a0f"` del icono
   `BROWSER`. Server Component, sin `"use client"`.
   Verificar: los tres iconos se pintan y heredan el color de su `.highlight`.

8. **`app/components/reveal.tsx` — prop `ariaHidden`.** El divisor de `about.jsx` es decorativo y lleva
   `aria-hidden="true"`, pero también `reveal`. Se le añade a `<Reveal>` una prop opcional
   `ariaHidden?: boolean` que se traslada al `<section>`. El comportamiento del observador no cambia.
   Verificar: el Home sigue funcionando igual y el divisor no aparece en el árbol de accesibilidad.

9. **`app/components/contact-form.tsx` — la isla cliente.** Componente `"use client"` que envuelve el
   `<form className="contact-form">` y consume la Server Action con
   `useActionState(sendContactMessage, CONTACT_IDLE)`. Comportamiento por estado:
    - **`idle` e `invalid`:** se pintan los tres `.field` del template (etiquetas `NOMBRE`,
      `CORREO ELECTRÓNICO`, `MENSAJE`, con sus `placeholder` originales) y el botón
      `▶  ENVIAR MENSAJE`. Los campos son controlados, para que el texto sobreviva a un error.
    - **Validación en cliente:** antes de enviar se repite la comprobación de campos vacíos del template;
      si falla, se cancela el envío y se aplica la clase `shake` durante 400 ms. El mismo temblor se
      dispara cuando el estado que vuelve del servidor es `invalid`, y el mensaje de la validación se
      muestra sobre el botón.
    - **Envío en curso** (`isPending` de `useActionState`): los tres campos y el botón quedan
      deshabilitados y el botón dice `ENVIANDO…`. Esto es lo que impide el doble envío por doble clic.
    - **`sent`:** la terminal de éxito exacta del template — barra con los tres puntos,
      `VAULT-OS // TERMINAL`, las tres líneas `[OK]`, la línea de éxito con el nombre en mayúsculas y el
      `caret`, y el botón `ENVIAR OTRO MENSAJE` que vacía los campos y vuelve al estado inicial.
    - **`failed`:** la misma terminal con la clase `terminal-error`, las líneas
      `[ERROR] Conexión rechazada…` en rojo, el `message` que devolvió la acción y un botón `REINTENTAR`
      que vuelve al formulario **con los tres campos tal como estaban**.

    El `shake` se limpia con un `setTimeout` que se cancela al desmontar, igual que hace la referencia.
    Verificar: enviar con un campo vacío hace temblar el formulario sin llamar al servidor; enviar
    correcto muestra la terminal verde; el botón queda bloqueado mientras se envía.

10. **`app/about/page.tsx`.** Server Component que replica la estructura de `about.jsx`:
    `<main className="av-main">` con `<div className="about fade-in">` dentro, y ahí:
    - el `<noscript>` con `.reveal { opacity: 1; transform: none; }`, igual que `app/page.tsx`, porque el
      divisor y la sección de contacto arrancan en `opacity: 0`;
    - `<section className="about-hero">` con el kicker `▸ ACERCA DE`, el `h1` `ACERCA DE ARCADE VAULT`,
      el párrafo de misión y el `.highlight-row` mapeando `ABOUT_HIGHLIGHTS` con su
      `transitionDelay: i * 80` en línea, tal como la referencia;
    - `<Reveal className="about-divider" ariaHidden>` con las dos `.div-bar` y los `DIVIDER_PIXELS`
      `<span>` con `animationDelay: i * 80`;
    - `<Reveal className="about-contact">` con el `.contact-grid`: a la izquierda el `.contact-intro`
      (kicker `▸ CONTACTO`, título `CONTÁCTANOS`, subtítulo y los `CONTACT_TIPS`) y a la derecha
      `<ContactForm />`.

    Además `export const metadata = { title: "Acerca de", description: … }`.
    Verificar: `/about` se ve igual que el template, el divisor y el contacto aparecen al hacer scroll y
    la pestaña del navegador dice `Acerca de · Arcade Vault`.

11. **`app/components/nav.tsx` — el enlace.** `Acerca de` a `/about`, después de `Salón de la Fama`, en
    el nav de escritorio y en el panel móvil, con `const isAbout = pathname === "/about"`.
    Verificar: en `/about` solo se ilumina `Acerca de`, y el resto de rutas mantiene su estado activo.

12. **Verificación final.** `npm run build` y `npm run lint`. Recorrer las siete rutas
    (`/`, `/games`, `/games/[id]`, `/games/[id]/play`, `/login`, `/hall-of-fame`, `/about`) comprobando
    que ninguna cambió de aspecto y que la consola no registra errores de hidratación.

---

## 5 — Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/about` existe y muestra el héroe `ACERCA DE ARCADE VAULT` con el párrafo de misión y tres
      _highlights_ con sus iconos pixelados en magenta, cian y verde.
- [ ] Al pasar el ratón por un _highlight_, se eleva y su borde toma su color de acento.
- [ ] El divisor pixelado muestra 24 cuadros que parpadean escalonados.
- [ ] La sección de contacto muestra el título `CONTÁCTANOS`, los tres `.tip` con sus LED verde,
      amarillo y magenta, y el formulario con los tres campos y sus `placeholder` del template.
- [ ] El Nav muestra `Acerca de` en escritorio y en el panel móvil; en `/about` solo se ilumina ese
      enlace, y en `/`, `/games` y `/hall-of-fame` sigue iluminándose el que ya se iluminaba.
- [ ] Enviar el formulario con cualquier campo vacío lo hace temblar y no dispara ninguna petición al
      servidor.
- [ ] Enviar con un correo sin `@` devuelve el temblor y el mensaje `Ese correo no parece válido.`, sin
      llamar a Resend.
- [ ] Mientras el envío está en curso, los tres campos y el botón están deshabilitados y el botón dice
      `ENVIANDO…`.
- [ ] Un envío correcto sustituye el formulario por la terminal verde `VAULT-OS // TERMINAL`, con el
      nombre en mayúsculas en la línea de éxito y el cursor parpadeando.
- [ ] `ENVIAR OTRO MENSAJE` devuelve al formulario con los tres campos vacíos.
- [ ] Con `RESEND_API_KEY` inválida, el formulario muestra la terminal en magenta con `REINTENTAR`, y
      pulsar `REINTENTAR` devuelve al formulario **con el texto que el usuario había escrito**.
- [ ] Ningún mensaje mostrado en pantalla incluye el detalle del error de Resend ni la clave de API; ese
      detalle solo aparece en el log del servidor.
- [ ] Sin `RESEND_API_KEY` y en desarrollo, el envío imprime nombre, correo y mensaje en la terminal del
      servidor y muestra la terminal de éxito.
- [ ] Al cuarto envío desde la misma IP dentro de diez minutos, la respuesta es la terminal de error con
      el mensaje de demasiados envíos.
- [ ] El correo que llega al buzón de `CONTACT_TO_EMAIL` tiene asunto
      `Arcade Vault · Nuevo mensaje de contacto`, y responderle escribe directamente a la dirección que
      puso quien rellenó el formulario.
- [ ] `.env.example` está versionado con las tres variables y **sin ningún valor real**.
- [ ] `git status` no muestra `.env.local` como archivo sin seguimiento.
- [ ] Con JavaScript desactivado, `/about` se lee entera: el divisor y la sección de contacto son
      visibles.
- [ ] Con `prefers-reduced-motion: reduce`, el divisor y la sección de contacto están visibles desde la
      carga, sin animación de entrada.
- [ ] A 800 px de ancho, `/about` no genera scroll horizontal: los _highlights_ se apilan en una columna
      y el `.contact-grid` pasa a una sola columna.
- [ ] Las seis rutas anteriores a este spec se ven exactamente igual que antes.
- [ ] La consola del navegador no registra errores de hidratación en `/about`.

---

## 6 — Decisiones tomadas y descartadas

- **Sí:** Server Action en `app/actions/contact.ts`. La clave de API nunca sale del servidor, no hay
  endpoint HTTP público que golpear directamente y `useActionState` da el estado pendiente sin escribir
  `fetch` ni serializar JSON a mano. Es el camino idiomático de Next 16.
- **No:** un Route Handler `POST /api/contact`. Más código para el mismo resultado y deja un endpoint
  abierto sin ningún consumidor externo que lo justifique.
- **No:** los dos a la vez. Duplicaría la validación hoy para un cliente externo que no existe.
- **Sí:** las tres direcciones por variables de entorno. Cambiar de buzón no exige recompilar y ningún
  correo real queda escrito en el repositorio.
- **No:** el remitente fijo `onboarding@resend.dev`. Funciona sin verificar dominio, pero solo puede
  enviar a la dirección dueña de la cuenta, así que el formulario dejaría de servir en cuanto el buzón
  del equipo fuera otro.
- **Sí:** `/about`, en inglés. SPEC 02 ya cerró el vocabulario de URLs al descartar `/biblioteca`;
  `/acerca-de` volvería a partirlo en dos.
- **Sí:** el enlace `Acerca de` en el Nav, en la posición exacta de `nav.jsx`. La razón por la que SPEC 02
  lo omitió — que apuntaría a un 404 — desaparece con este spec.
- **Sí:** terminal en rojo para el fallo, reutilizando la estructura de `.terminal-success` con la clase
  `terminal-error`. Mantiene el lenguaje visual de la pantalla y, sobre todo, no pierde lo que el usuario
  escribió.
- **No:** fingir éxito siempre y registrar el fallo solo en el log. Es lo más fiel al template, pero
  miente al usuario y tira su mensaje sin avisar.
- **No:** mezclar el fallo de servidor con el `shake` de validación. Son dos cosas distintas: una la
  arregla el usuario corrigiendo un campo, la otra no la puede arreglar. El `shake` se reserva para lo
  que sí depende de él.
- **Sí:** un bloque `.terminal-error` nuevo en `globals.css`. Rompe la invariante de que el tema es un
  port literal del `styles.css` de referencia, y por eso va al final del archivo, bajo un comentario que
  lo señala como añadido. La alternativa — estilos en línea en el componente — escondería el color del
  error fuera del tema, que es peor.
- **Sí:** límite de 3 envíos por IP cada 10 minutos, en un `Map` en memoria. Cero dependencias nuevas y
  frena el abuso trivial, que es todo lo que un formulario de contacto de una maqueta necesita.
- **No:** Redis, KV o cualquier almacén compartido para el límite. Añade infraestructura a un proyecto
  que hoy no tiene ninguna. Queda anotado en los riesgos que el contador no sobrevive a un reinicio ni se
  comparte entre instancias.
- **No:** honeypot ni CAPTCHA en este spec. Se pueden añadir después sin tocar nada de lo que aquí se
  decide.
- **Sí:** revalidar en el servidor con formato de correo y topes de longitud. El `type="email"` del
  template es una validación de navegador: no llega al servidor y cualquiera puede saltársela.
- **Sí:** los topes de 80 / 160 / 4000 caracteres. Sin ellos, un `FormData` de un megabyte llega entero
  a Resend.
- **Sí:** botón bloqueado con `ENVIANDO…` durante el envío. El template no lo necesitaba porque no
  enviaba nada; con una llamada de red real, un formulario que no responde invita a pulsar dos veces.
- **No:** animar las líneas de la terminal mientras se espera la respuesta. Más código de animación y
  obliga a decidir qué hacer si el fallo llega a mitad de la secuencia.
- **Sí:** modo consola cuando falta `RESEND_API_KEY` fuera de producción. Quien clone el repositorio
  puede ver y probar la pantalla completa sin darse de alta en Resend; en producción, la falta de clave
  sí devuelve error, porque ahí sí es un fallo.
- **No:** validar la variable al cargar el módulo y reventar el arranque. Tumbaría el sitio entero por
  una pantalla de contacto.
- **Sí:** `Reply-To` con el correo de quien escribe. Responder desde el buzón del equipo le llega
  directamente, sin copiar direcciones a mano.
- **No:** acuse de recibo automático al remitente. Duplica los envíos y convierte el formulario en un
  amplificador: cualquiera podría hacer que se mande correo a una dirección ajena.
- **No:** asunto dinámico con el nombre y cuerpo en HTML. El asunto fijo es filtrable igual y el texto
  plano no se rompe en ningún cliente de correo. El nombre va en el cuerpo.
- **Sí:** `<noscript>` que neutraliza `.reveal`, igual que en la landing. Sin él, media pantalla queda
  invisible para quien no ejecuta JavaScript.
- **No:** hacer que el envío funcione sin JavaScript conectando la acción al `action` nativo del
  formulario. Obligaría a renunciar al `shake` y al bloqueo del botón, que son el 90 % de la sensación de
  esta pantalla, a cambio de un caso que esta aplicación —un portal de juegos en el navegador— no tiene.
- **Sí:** `ariaHidden` como prop opcional de `<Reveal>` en vez de un componente nuevo. El divisor es el
  único caso decorativo, y duplicar el observador para él no compensa.
- **Sí:** conservar los `transitionDelay` en línea de los `.highlight`, aunque el CSS de esa clase no
  declare `opacity: 0` y por tanto no escalonen nada. Misma decisión que SPEC 02 tomó con
  `.feature-card`: son inertes y quitarlos alejaría el markup del original sin cambiar un píxel.

---

## 7 — Riesgos identificados

| Riesgo                                                                                                                          | Mitigación                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La clave de API o el detalle del error de Resend acaban en el navegador                                                         | Las tres variables se leen solo dentro de la Server Action y ninguna lleva `NEXT_PUBLIC_`. Los mensajes de `failed` son literales fijos; el detalle va a `console.error` en el servidor. Hay un criterio de aceptación que lo verifica. |
| `.env.local` se sube al repositorio por error                                                                                   | `.gitignore` ya ignora `.env*`; se añade la excepción `!.env.example` para que el ejemplo sí se versione, y un criterio de aceptación comprueba que `.env.example` no lleva valores reales.                                             |
| El límite por IP vive en memoria: se pierde al reiniciar y no se comparte entre instancias                                      | Aceptado y documentado. Frena el abuso trivial, que es el objetivo; un almacén compartido queda para el spec que lo necesite.                                                                                                           |
| Detrás de un proxy, `x-forwarded-for` puede faltar o venir falsificado, y todo el tráfico caería en la misma cubeta `"unknown"` | Aceptado: en el peor caso el límite es más estricto de lo previsto, nunca más laxo. El fallo degradado es que alguien vea el mensaje de «demasiados envíos» antes de tiempo, no que el formulario quede abierto.                        |
| `CONTACT_FROM_EMAIL` sin dominio verificado en Resend hace que todos los envíos fallen en producción                            | El fallo se ve tal cual en la terminal de error y queda registrado en el log del servidor. La verificación del dominio es un paso de configuración de Resend, fuera del código.                                                         |
| `.reveal` arranca en `opacity: 0`: sin JavaScript, el divisor y todo el contacto quedan invisibles                              | Bloque `<noscript>` idéntico al de la landing, y `<Reveal>` ya se revela de inmediato con `prefers-reduced-motion` o sin `IntersectionObserver`.                                                                                        |
| El bloque `.terminal-error` rompe la invariante de que `globals.css` es un port literal de la referencia                        | Va al final del archivo, aislado y bajo un comentario que lo identifica como la única regla ajena al port. `CLAUDE.md` se actualiza para decirlo.                                                                                       |
| El usuario pierde un mensaje largo si el envío falla                                                                            | El formulario es controlado y `REINTENTAR` no vacía los campos. Es un criterio de aceptación explícito.                                                                                                                                 |
| Un doble clic dispara dos correos                                                                                               | El botón y los campos quedan deshabilitados mientras `isPending`, y el límite por IP acota el daño si aun así se colara.                                                                                                                |
| Enlazar `Acerca de` desde el Nav antes de que exista la ruta dejaría un 404 visible                                             | El paso 11 (el enlace) va después del paso 10 (la ruta).                                                                                                                                                                                |

---

## 8 — Lo que **no** entra en este spec

- Persistir los mensajes en cualquier sitio que no sea el buzón de correo.
- Acuse de recibo al remitente, asunto dinámico y cuerpo del correo en HTML.
- Honeypot, CAPTCHA o límite compartido entre instancias.
- Envío funcional con JavaScript desactivado.
- El mando de arcade (`.gp-*`, `.gp-themer`, `.score-pop`), que sigue sin componente desde SPEC 02.
- Autenticación real, `prefers-reduced-motion` en el resto del tema, internacionalización y tests
  automatizados.

Cada uno de estos, si llega, va en su propio spec.
