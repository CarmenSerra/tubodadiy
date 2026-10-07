# tubodadiy — organiza tu boda paso a paso

MVP de una app web para centralizar la organización de una boda: presupuesto,
invitados, proveedores y un dashboard con 13 secciones desplegables con
seguimiento de progreso. Ver la especificación completa en la conversación
que originó este proyecto para el contexto de producto.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** + componentes estilo shadcn/ui (Radix primitives), escritos a
  mano en `src/components/ui` porque el registro remoto de shadcn no era
  accesible al construir este proyecto — funcionalmente equivalentes.
- **Firebase**: Firestore (base de datos), Firebase Authentication (email/contraseña),
  Firebase Admin SDK (solo para aceptar invitaciones de forma atómica en el servidor).

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear un proyecto de Firebase

1. Ve a la [consola de Firebase](https://console.firebase.google.com/) y crea un proyecto.
2. Activa **Authentication** → método **Email/contraseña**.
3. Activa **Firestore Database** (modo producción).
4. En **Project settings → General → Your apps**, crea una app web y copia la
   configuración (`apiKey`, `authDomain`, etc.).
5. En **Project settings → Service accounts**, genera una clave privada nueva
   (JSON) — se usa solo para el flujo de aceptar invitaciones desde el servidor.

### 3. Configurar variables de entorno

Copia `.env.example` a `.env.local` y rellena:

- Las variables `NEXT_PUBLIC_FIREBASE_*` con la configuración web del paso 4.
- Las variables `FIREBASE_*` (Admin SDK) con los datos del JSON del paso 5
  (`project_id`, `client_email`, `private_key` — mantén los `\n` literales de
  la clave privada tal cual vienen en el JSON).

Sin estas variables, la app arranca igualmente pero muestra un aviso y
deshabilita el login/registro.

### 4. Desplegar las reglas de seguridad de Firestore

Con la [Firebase CLI](https://firebase.google.com/docs/cli):

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project <tu-project-id>
```

Las reglas (`firestore.rules`) solo permiten leer/escribir un plan de boda a
sus miembros (`memberIds`), comprobado en cada subcolección.

### 5. Arrancar en local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Decisiones de diseño y modelo de datos

- **Firestore** como base de datos NoSQL, con `weddingPlans/{planId}` como
  documento raíz y subcolecciones `members`, `steps`, `guests`, `vendors`,
  `budgetItems` — igual que en el borrador de la especificación.
- **Autorización**: casi todas las operaciones (steps, invitados, proveedores,
  presupuesto) se hacen directamente desde el cliente con el SDK de Firebase,
  protegidas por `firestore.rules` (comprobando que el usuario esté en
  `memberIds`). La única excepción es **aceptar una invitación**, que toca
  varios documentos de forma atómica (plan, `members/{uid}` e `invites/{token}`)
  y se resuelve con una Server Action (`src/lib/actions/accept-invite.ts`) que
  usa el Admin SDK para hacerlo de forma transaccional. El resto de la app no
  necesita ni usa el Admin SDK.
- **Invitaciones**: por link manual (colección `invites/{token}`, token
  aleatorio), sin envío de email todavía — el dueño del plan copia el link y
  lo comparte por el canal que prefiera. Añadir envío automático (p. ej. con
  Resend) es una mejora de fase 2 sencilla de enchufar sobre
  `createInvite()`.
- **Modelo de permisos extensible**: `members/{userId}` guarda un `role`
  (`owner` | `partner` | `planner`) y un campo `permissions` reservado (no
  usado aún) para el futuro acceso limitado de invitados (p. ej. solo RSVP).
- **Responsive real**: listados (invitados/proveedores/presupuesto) se
  renderizan como tarjetas apiladas en móvil y como tabla en escritorio, no
  solo una tabla con scroll horizontal.
- **Diseño visual**: MVP con una paleta rosa/crema y una tipografía de
  titulares con carácter (Playfair Display) como guiño ligero a la referencia
  ilustrada de la spec, pero con componentes sobrios (shadcn/ui) — la
  ilustración a mano, texturas y maquetación artesanal quedan para una fase
  posterior de "vestir" la landing.
- **Cache Components de Next.js 16 desactivado**: `create-next-app` lo activa
  por defecto, pero exige envolver cualquier lectura dinámica (incluidos los
  `params` de rutas dinámicas) en límites `<Suspense>`. Como esta app es casi
  enteramente cliente (Firebase Auth/Firestore viven en el navegador, no hay
  sesión de servidor), se ha desactivado en `next.config.ts` para mantener el
  modelo de renderizado simple — ver el comentario en ese archivo.

## Estructura

```
src/
  app/                    rutas (App Router)
    (app)/                 área autenticada: dashboard, plan/[planId]/*
    invite/[token]/        aceptar invitación (pública)
    login/, signup/        autenticación
  components/
    ui/                    componentes base (botón, card, dialog, ...)
    plan/, guests/, vendors/, budget/, members/, auth/
  lib/
    firebase/              cliente, admin, queries, mutaciones, mapeos
    hooks/                 useAuth, useCollection, useDoc
    context/               PlanProvider
    actions/                Server Actions (accept-invite)
    steps.ts               definición de las 13 secciones del MVP
    types.ts               tipos compartidos
firestore.rules            reglas de seguridad
firestore.indexes.json
firebase.json
```

## MVP vs. fase 2

Implementado en este MVP: auth, creación de plan, invitar pareja/wedding
planner con acceso total, dashboard con las 13 secciones (checklist + estado +
notas), CRUD de invitados/proveedores/presupuesto con cálculo automático
estimado vs. gastado.

Pendiente para fase 2 (fuera de alcance de este MVP): reordenar secciones
(drag & drop), invitados con acceso limitado, chatbot IA, seating chart
visual, notificaciones de tareas, exportar a PDF, envío automático de emails
de invitación.
