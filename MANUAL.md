# 📘 MANUAL DEL PROYECTO — ENGIE Management

**Plataforma Integral SaaS para la Gestión de Seguridad, Cumplimiento y Control Operativo de Incidencias.**

> Versión del manual: 1.0 — Febrero 2026
> Repo: `https://github.com/tdi-tech/ENGIE.git` · Rama principal: `main`

---

## ÍNDICE

1. [¿Qué es y cómo funciona la app?](#1--qué-es-y-cómo-funciona-la-app)
2. [Arquitectura del sistema](#2--arquitectura-del-sistema)
3. [Roles y permisos](#3--roles-y-permisos)
4. [Modelo de datos en Firestore](#4--modelo-de-datos-en-firestore)
5. [Requisitos e instalación](#5--requisitos-e-instalación)
6. [Variables de entorno](#6--variables-de-entorno)
7. [Comandos del día a día (npm)](#7--comandos-del-día-a-día-npm)
8. [Comandos de Git](#8--comandos-de-git)
9. [Comandos de Firebase](#9--comandos-de-firebase)
10. [Microservicio de Purga Automática (Cron Job en Hostinger)](#10--microservicio-de-purga-automática-cron-job-en-hostinger)
11. [Centro de Respaldos Core (Backups)](#11--centro-de-respaldos-core-backups)
12. [PDF Ejecutivo del Dashboard](#12--pdf-ejecutivo-del-dashboard)
13. [Solución de problemas frecuentes](#13--solución-de-problemas-frecuentes)

---

## 1. ¿Qué es y cómo funciona la app?

ENGIE Management (paquete `tdi-secure-social`) es una herramienta interna tipo SaaS que centraliza la documentación, el monitoreo y la mitigación de crisis digitales. Opera bajo **arquitectura Zero-Trust**: ninguna validación de permisos vive solo en el navegador; todo lo crítico se verifica en el servidor (Firebase Security Rules).

### Módulos principales (carpeta `src/features/`)

| Módulo | Carpeta | Qué hace |
|---|---|---|
| Dashboard | `dashboard/` | Métricas consolidadas, gráficas SVG, semáforos gemelos de riesgo/estatus y **PDF ejecutivo** |
| Incidencias RRSS | `rrss/` | Registro y seguimiento de incidencias reputacionales en redes sociales |
| Menciones / Comentarios | `comments/` | Reportes de menciones con análisis de sentimiento |
| Reportes y Analítica | `reports/` | Inteligencia de negocios con Chart.js; ingesta dual (CSV con PapaParse o Firestore en vivo); exportación a CSV, Word y **PDF ejecutivo con jsPDF** |
| Notificaciones | `notifications/` | Campana de alertas con audio nativo (Web Audio API) y preferencias en la nube |
| Auditoría SIEM | `audit/` | Radar forense de intrusos: registra accesos denegados (403) con IP real, país y UserAgent |
| Backups Core | `backups/` | Respaldo cifrado AES-256 (crypto-js) de todo el ecosistema + restauración inteligente |
| Usuarios | `users/` | Administración de usuarios, roles y sincronización automática al primer login |
| Configuración | `settings/` | Salud de Firestore en tiempo real, purga manual y programación del microservicio de purga, y **selector de tema claro/oscuro** (apariencia) |
| Auth | `auth/` | Login corporativo restringido por dominio + firewall anti-spam |
| Changelog | `shared/components/ChangelogView.tsx` | Historial de versiones y notas de lanzamiento (v1.0.0), visible para administradores |

### Flujo típico de uso

1. El usuario inicia sesión con su cuenta corporativa (`@tierradeideas.mx`).
2. Al primer login, si no está pre-registrado, aparece automáticamente en Usuarios con rol base.
3. Según su rol ve unas vistas u otras (el Sidebar oculta/muestra botones).
4. Los datos se sincronizan en tiempo real con `onSnapshot` (sin recargar).
5. Los formularios validan en cliente, pero **las reglas de Firestore son la autoridad final**.
6. El ADMIN_IT puede programar la purga automática, hacer backups y gestionar usuarios.

---

## 2. Arquitectura del sistema

```
FRONTEND (React 19 + TS, este repo)
   │  Firebase SDK (Auth + Firestore)
   ▼
FIREBASE (Google Cloud)
 · Authentication (Google) · Firestore DB · Security Rules (firestore.rules)
   │  Admin SDK (Service Account)
   ▼
MICROSERVICIO PHP (Hostinger, fuera de este repo)
 purga_cron.php — despertado por Cron Job 0 0 * * * (diario 12:00 AM)
```

**Stack completo:**

| Capa | Tecnología |
|---|---|
| Core | React 19 + TypeScript (~6.0) |
| Build | Vite 8 |
| Estilos | Tailwind CSS 3 + Dark/Light Mode nativo |
| Gráficas | Chart.js 4 + react-chartjs-2 |
| Exportación | jsPDF (PDF), PapaParse (CSV), XML nativo (Word) |
| Seguridad front | crypto-js (AES-256), DOMPurify (anti-XSS) |
| Iconos | lucide-react |
| Backend | Firebase: Firestore, Auth, Security Rules |
| Microservicio | PHP + cURL en Hostinger (Cron Jobs) |
| Audio | Web Audio API nativa |

---

## 3. Roles y permisos

El rol vive en el documento del usuario en Firestore y **solo `ADMIN_IT` puede modificar roles**.

| Rol | Valor en `role` | Accesos |
|---|---|---|
| Administrador IT | `ADMIN_IT` | Todo: Backups Core, Auditoría SIEM, Configuración/Microservicio, Usuarios, crear+restaurar datos |
| Administrador CM | `ADMIN_CM` | Backups Core (crear + restaurar), incidencias, menciones, reportes, notificaciones. **Sin** Auditoría ni Microservicio |

**Reglas clave (`firestore.rules`):**
- `isAuthenticated()` exige email `@tierradeideas.mx` y login no anónimo.
- `hasRole(appId, role)` exige además `disabled != true`.
- `isContentAdmin(appId)` = `ADMIN_IT` **o** `ADMIN_CM` → usado en `create`/`update` de `rrss_incidents` y `comments` para que **ambos perfiles puedan restaurar backups sin validador estricto**.
- `config/*` (microservicio) y lectura de `auditLogs` son **exclusivos de `ADMIN_IT`**.
- El firewall (`firewall_locks`) bloquea IP 30 min tras 5 intentos fallidos de PIN/Login.

---

## 4. Modelo de datos en Firestore

Ruta base: `artifacts/{appId}/public/data/...` donde `appId` = tu `VITE_FIREBASE_PROJECT_ID`.

| Colección | Contenido |
|---|---|
| `rrss_incidents` | Incidencias reputacionales (formulario RRSS) |
| `comments` | Reportes de menciones |
| `notifications` | Notificaciones operativas (objetivo de la purga) |

---

## 5. Requisitos e instalación

### 5.1. Software necesario

| Herramienta | Versión usada | Para qué |
|---|---|---|
| Node.js | v22.22.3 (LTS 20+ OK) | Ejecutar Vite y npm |
| npm | 10.9.8 (incluido con Node) | Instalar dependencias |
| Git | cualquiera reciente | Versionado |
| Firebase CLI | última (`npm i -g firebase-tools`) | Desplegar reglas (`firebase deploy`) |
| Navegador moderno | Chrome/Edge/Firefox | Desarrollo y uso |
| Cuenta Google | con acceso al proyecto Firebase | Auth + Firestore |
| Hosting PHP (Hostinger) | PHP 7.4+ con `openssl` y `curl` | Microservicio de purga (producción) |

### 5.2. Clonar e instalar (desde cero)

```bash
# 1. Clonar
git clone https://github.com/tdi-tech/ENGIE.git
cd ENGIE

# 2. Instalar dependencias base
npm install

# 3. Librerías de reportes/exportación (si faltaran)
npm install chart.js jspdf papaparse react-chartjs-2
npm install @types/jspdf @types/papaparse --save-dev

# 4. Cifrado de backups + sanitización HTML (críticas)
npm install crypto-js dompurify
npm install --save-dev @types/crypto-js @types/dompurify

# 5. Firebase CLI (una sola vez por máquina)
npm install -g firebase-tools
firebase login
```

### 5.3. Arrancar en desarrollo

```bash
npm run dev
# → http://localhost:5173
```

### 5.4. Modo local sin Firebase (Zero-State / Mock)

El proyecto incluye un mock de Firestore (`src/services/firestore/firestore.mock.ts`) que se activa con variable de entorno, útil para desarrollar UI sin tocar la base real. En modo mock, los respaldos están deshabilitados por diseño.

---

## 6. Variables de entorno

Copia la plantilla y complétala:

```bash
cp .env.template .env
```

```env
# true = modo local sin Firebase · false/vacío = base real
VITE_USE_MOCK_DB=

# Dominio permitido para login (vacío = sin restricción)
VITE_ALLOWED_EMAIL_DOMAIN=

# Credenciales Firebase (solo si VITE_USE_MOCK_DB=false)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

⚠️ **Reglas de sincronía obligatorias:**
- `VITE_FIREBASE_PROJECT_ID` define el `appId` del código → debe coincidir con la ruta de tus documentos en Firestore.
- `VITE_ALLOWED_EMAIL_DOMAIN` debe coincidir con el regex `isAuthenticated` en `firestore.rules` (`@tierradeideas.mx`).
- El `.env` **nunca se sube a Git**.

---

## 7. Comandos del día a día (npm)

```bash
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run build    # chequeo TypeScript (tsc -b) + build de producción a dist/
npm run preview  # previsualizar el build de producción localmente
npm run lint     # ESLint sobre todo el proyecto
npx tsc --noEmit -p tsconfig.app.json   # solo chequeo de tipos, sin compilar
```

**Antes de cada commit**, como mínimo: `npx tsc --noEmit -p tsconfig.app.json` y `npm run build`.

---

## 8. Comandos de Git

```bash
# Estado y ramas
git status --short
git branch
git log --oneline -8

# Trabajo diario
git add <archivo>                 # añadir cambios concretos (evita git add .)
git commit -m "tipo(alcance): descripción" --no-verify
git push origin main
git pull origin main              # traer cambios antes de trabajar

# Convención de mensajes usada en este repo:
#   feat(...)  → nueva funcionalidad
#   fix(...)   → corrección de bug
# Ejemplos reales:
#   feat(rules): ADMIN_CM puede crear y restaurar Backups Core
#   fix(backups): restauración quita campo id del payload
```

---

## 9. Comandos de Firebase

```bash
firebase login                    # autenticar CLI (una vez por máquina)
firebase projects:list            # ver proyectos disponibles
firebase use <project-id>         # seleccionar proyecto activo

# Desplegar SOLO las reglas (lo habitual tras editar firestore.rules):
firebase deploy --only firestore:rules
```

`firebase.json` del repo solo gestiona Firestore (`"rules": "firestore.rules"`); el hosting del front vive donde lo tengas desplegado.

> ⚠️ Tras desplegar reglas, **recarga la app** en el navegador para que los permisos se reafirmen en la sesión.

| `auditLogs` | Bitácora forense inmutable (objetivo de la purga) |
| `users` | Usuarios (`{email}` como ID): `role`, `disabled`, `isProtected`, `lastLogin`, `preferences` |
| `firewall_locks` | Castigos por IP tras intentos fallidos |
| `config/devops_cron` | Orden de purga + latido del PHP (`frecuencia`, `ultimaModificacion`, `lastRunAt`, `lastRunStatus`, `lastRunDetail`, `purgedCount`) |
| `appState` | Estado global (solo IT escribe) |

---

## 10. Microservicio de Purga Automática (Cron Job en Hostinger)

Sistema autónomo que mantiene sana la base: elimina `notifications` y `auditLogs` obsoletos sin tocar datos transaccionales (incidencias/menciones). Tres capas:

1. **Frontend (este repo, `ConfigView.tsx`)** → el `ADMIN_IT` elige frecuencia (Manual/Diario/Semanal/Mensual) → se guarda en el doc `config/devops_cron` (`frecuencia`, `ultimaModificacion`).
2. **Motor PHP (`purga_cron.php` en Hostinger)** → con Service Account + Admin SDK lee ese doc, compara con su `ultima_purga.txt` local y, si toca, hace batch deletes paginados (300 docs/página).
3. **Gatillo (Cron Job nativo de Hostinger, `0 0 * * *`)** → despierta al PHP a diario a las 12:00 AM; el PHP decide si actúa o se suspende.

### 10.1. Qué se instaló/configuró para que funcione

**En el repo (frontend):** selector de frecuencia en Configuración + indicador de latido 🟢/⏳ (lee `lastRunAt`, `lastRunStatus`, `lastRunDetail`, `purgedCount`) + botón 🔄. Reglas: `config/*` solo `ADMIN_IT`.

**En Hostinger (servidor):** archivo `purga_cron.php` en `https://<tu-dominio>/cron_secure/purga_cron.php`; Service Account JSON fuera de la web pública ("Gafete VIP"); extensiones PHP `openssl` (firma JWT RS256) y `curl` (OAuth2 + Firestore REST); Cron Job `0 0 * * *` + archivo local `ultima_purga.txt`.

**En Firebase Console:** Service Account con permiso de lectura/escritura en Firestore + reglas desplegadas.

### 10.2. Rutas correctas (bug "dice semanal aunque puse diario")

El dashboard usa la ruta anidada. Si el PHP usa la ruta raíz, **lee un doc inexistente y cae al valor por defecto `semanal`**:

```php
// ❌ MAL — doc raíz que no existe:
$configUrl = "{$baseUrl}/config/devops_cron";
borrarColeccion('notifications', ...);

// ✅ BIEN — misma ruta que el dashboard:
$APP_ID = $PROJECT_ID; // = VITE_FIREBASE_PROJECT_ID
$configUrl = "{$baseUrl}/artifacts/{$APP_ID}/public/data/config/devops_cron";
borrarColeccion("artifacts/{$APP_ID}/public/data/notifications", ...);
borrarColeccion("artifacts/{$APP_ID}/public/data/auditLogs", ...);
```

### 10.3. Latido: el PHP reporta, el dashboard muestra

En cada pasada el PHP hace `PATCH` al doc de config con `lastRunAt` (`date('c')`), `lastRunStatus` (`ok|skip|error`), `lastRunDetail` (texto) y `purgedCount` (entero). El dashboard muestra 🟢 "Cron activo · última pasada" o ⏳ "Sin señal del Cron Job".

### 10.4. Verificación

1. Cambia el select → toast "Motor de purga configurado en modo: DIARIO".
2. Abre la URL del PHP → debe decir **"ciclo diario"**.
3. Pulsa 🔄 en Configuración → 🟢 con la hora.
4. En Firestore Console abre `artifacts/<project-id>/public/data/config/devops_cron` → `frecuencia: "diario"` + campos `lastRun*`.
5. En Hostinger revisa el log del cron y `ultima_purga.txt`.

### 10.5. Lógica de tiempos del PHP

| Frecuencia | Ejecuta si pasaron… |
|---|---|
| `diario` | ≥ 0.9 días (~22 h) |
| `semanal` | ≥ 6.9 días |
| `mensual` | ≥ 29.5 días |
| `manual` | nunca (se detiene en silencio) |

---

## 11. Centro de Respaldos Core (Backups)

- **Crear backup**: `BackupView.tsx` lee `rrss_incidents` + `comments` vía `onSnapshot`, cifra el JSON con AES-256 (`crypto-js`, contraseña ≥ 6 caracteres) y lo descarga. Filtrable por año/mes. Disponible para `ADMIN_IT` y `ADMIN_CM` (botón en Sidebar).
- **Restaurar**: se sube el archivo cifrado, se verifica y se inyecta con `setDoc` por ID; los duplicados se omiten, y el toast reporta inyectados / fallidos / omitidos con el motivo (`permission-denied`, canal bloqueado, etc.).
- **Detalles técnicos:** la exportación incluye `id` en el objeto pero la restauración lo elimina del payload (las reglas usan `hasOnly` sin `id`); Firestore usa `experimentalAutoDetectLongPolling` contra bloqueadores de anuncios (`ERR_BLOCKED_BY_CLIENT`); en modo mock los respaldos están deshabilitados. Si el navegador tiene ad-blocker, desactívalo para el sitio al inyectar.

---

## 12. PDF Ejecutivo del Dashboard

El dashboard dispone de un botón **Descargar PDF** (arriba a la derecha) en las pestañas de **Menciones** e **Incidencias**. Genera en el cliente un informe ejecutivo con `jsPDF` y los **colores corporativos ENGIE del design-system** (tokens `--engie-*`, que siguen el tema claro/oscuro en vez de valores fijos), con diseño premium (cabecera corporativa, tarjetas KPI, barras horizontales con color, pie de página paginado) y **accesibilidad WCAG AA** en el contraste de texto. Los títulos de cada bloque y KPI coinciden exactamente con las tarjetas de la interfaz de la que toman el dato.

### 12.1. Menciones

| Bloque / KPI | Fuente (StatCard/tarjeta del dashboard) | Descripción |
|---|---|---|
| Menciones Verificadas | `commentsStats.totalMenciones` | Total de menciones analizadas |
| Menciones Positivas | `commentsStats.positivo` | Con porcentaje sobre el total |
| Menciones Neutrales | `commentsStats.neutral` | Sin connotación positiva/negativa |
| Menciones Negativas | `commentsStats.negativo` | Con porcentaje y canal principal |
| Semáforo de Sentimiento | `commentsStats.sentimentCounts` | Distribución Positivo · Neutral · Negativo |
| Analítica de Nivel de Riesgo | `commentsStats.riesgoCounts` | Bajo · Medio · Alto · Crítico |
| Analítica de Actores Críticos | `commentsStats.topActoresCriticos` | Ranking de actores con riesgo Alto/Crítico |

### 12.2. Incidencias

#### Protocolo de monitoreo de incidencias para **Energía Mayakan**

El monitoreo de incidencias está alineado con los tres objetivos de comunicación del proyecto **Energía Mayakan**:
1. **Posicionar a Energía Mayakan** como actor estratégico para la seguridad energética y el desarrollo del sureste mexicano.
2. **Fortalecer la reputación de Ampliación Energía Mayakan** como empresa comprometida con el desarrollo sostenible y las comunidades.
3. **Visibilizar la colaboración público‑privada** como factor clave para concretar infraestructura estratégica.

Cada KPI del dashboard se vincula a uno de estos objetivos, facilitando la priorización de análisis y la generación de acciones correctivas alineadas con la estrategia del proyecto.

El protocolo completo de atención se publica en la vista **Incidencias → Protocolo** (`ProtocoloRRSSView` en `StaticViews.tsx`) y tiene una **versión imprimible en PDF** que encabeza el documento con los títulos **"Reputación Digital • ENGIE Management"** y **"Protocolo de Atención en RRSS"**, todo renderizado con los **tokens de color corporativos del design-system ENGIE** (`--engie-*`: `--engie-midnight-navy`, `--engie-dark-blue`, `--engie-primary-cyan`) para heredar automáticamente la paleta oficial sin colores estáticos. Define cuatro tipos de incidencia típicos del proyecto:

1. **Críticas al proyecto o a sus obras** — impacto ambiental, operación de la planta o proceso constructivo de la Ampliación Energía Mayakan.
2. **Desinformación y narrativas falsas** — publicaciones que distorsionan datos sobre el proyecto, sus permisos, su operación o sus beneficios para la región.
3. **Tensión socioambiental y comunitaria** — inconformidades de comunidades, ejidos o grupos de interés sobre el diálogo social, el reparto de beneficios o el suministro eléctrico.
4. **Crisis que escalan a medios** — coberturas negativas de prensa, señalamientos contra la colaboración público‑privada o controversias corporativas que impactan al proyecto.

y una **matriz de riesgos** en tres niveles (Bajo: comentarios aislados sin viralización; Intermedio: cadenas de quejas coordinadas o viralización de inconformidades vecinales; Crítico: incidentes en planta/ducto con riesgo a personas, filtración de información sensible o cobertura negativa nacional), más un ciclo de resolución **Detección → Respuesta → Reacción → Recuperación → Aprendizaje**.

| Bloque / KPI                     | Fuente (StatCard/tarjeta del dashboard)            | Objetivo de Comunicación                                           | Descripción |
|---|---|---|---|
| Reportes Creados                 | `rrssStats.totalReportes`                           | 3. Visibilizar la colaboración público‑privada                     | Total de incidencias registradas |
| Fuentes de Detección              | `Object.keys(rrssStats.fuenteCounts).length`       | 2. Fortalecer la reputación de Ampliación Energía Mayakan          | Número de fuentes distintas |
| Riesgo en Escalada                | `rrssStats.enEscalada`                              | 1. Posicionar a Energía Mayakan                                    | Incidencias con tendencia creciente |
| Fuente Principal                  | `rrssStats.topFuente`                               | 3. Visibilizar la colaboración público‑privada                     | Canal más frecuente de origen |
| Nivel de Riesgo Reputacional      | `rrssStats.riesgoCounts`                            | 1. Posicionar a Energía Mayakan                                    | Bajo · Medio · Alto · Crítico |
| Alcance Actual                    | `rrssStats.alcanceCounts`                           | 2. Fortalecer la reputación de Ampliación Energía Mayakan          | Local · Regional · Nacional · Viral |
| Tendencia                         | `rrssStats.tendenciaCounts`                         | 3. Visibilizar la colaboración público‑privada                     | Disminuyendo · Estable · Aumentando |
| Temas en Riesgo de Escalada       | `rrssStats.temasEscaladaTop`                        | 1. Posicionar a Energía Mayakan                                    | Temas con Riesgo Alto/Crítico + Tendencia Aumentando |

> **Nota:** este reporte es el del **Dashboard** y no debe confundirse con la **exportación a PDF** del módulo *Reportes y Analítica* ni con los CSV de los historiales de Menciones/Incidencias, que no incluyen botón de PDF.

---

## 13. Solución de problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| PHP dice "semanal" aunque el dashboard dice "diario" | PHP lee `config/devops_cron` raíz en vez de `artifacts/{appId}/...` | Corregir rutas (10.2) |
| Purga ejecutada pero 0 docs borrados | `borrarColeccion` apunta a colecciones raíz inexistentes | Usar rutas `artifacts/...` (10.2) |
| Indicador ⏳ permanente | El PHP no escribe el latido | Agregar reporte `lastRun*` (10.3) |
| `permission-denied` al restaurar backup | Reglas sin desplegar / sesión vieja / rol incorrecto | `firebase deploy --only firestore:rules` + recargar + verificar `role` en `users` |
| `ERR_BLOCKED_BY_CLIENT` / no fluyen datos | Ad-blocker bloquea WebChannel de Firestore | Desactivar bloqueador para el sitio |
| Toast "No se pudo conectar con Firestore" | `.env` incompleto o proyecto equivocado | Revisar sección 6 |
| Cambié reglas y nada cambió | Falta desplegar o recargar sesión | Deploy + F5 |
| `tsc` falla tras un cambio | Tipos inconsistentes | `npx tsc --noEmit -p tsconfig.app.json` y corregir |

---

&copy; 2026 Tierra de Ideas. Todos los derechos reservados.


