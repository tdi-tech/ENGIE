# ENGIE Management

**Plataforma Corporativa de Reputación Digital y Social Listening para el proyecto Energía Mayakan.**

**ENGIE Management** es una plataforma interna tipo SaaS, desarrollada por Tierra de Ideas para la marca **ENGIE / Energía Mayakan** en el sureste mexicano. Su propósito central es el **social listening**: el monitoreo continuo de menciones y comentarios en redes sociales, la detección temprana de tendencias y picos de conversación negativa, el registro de incidencias reputacionales y la protección de la **licencia social** del proyecto.

La plataforma alinea toda la operación de monitoreo y análisis con los **tres objetivos de comunicación del proyecto Energía Mayakan**:

1. **Posicionar a Energía Mayakan** como actor estratégico para la seguridad energética y el desarrollo del sureste mexicano.
2. **Fortalecer la reputación de la Ampliación Energía Mayakan** como empresa comprometida con el desarrollo sostenible y las comunidades.
3. **Visibilizar la colaboración público-privada** como factor clave para concretar infraestructura estratégica.

Cada KPI, incidencia y reporte del tablero se vincula a uno de estos objetivos, facilitando la priorización de análisis y las acciones correctivas, y evitando que la conversación digital derive en narrativas que pongan en riesgo la licencia social del proyecto en la región. La plataforma opera bajo una estricta **arquitectura Zero-Trust (Cero Confianza)**, con historial inmutable y auditable bajo protocolos de confidencialidad corporativa.

---

## Requisitos Previos e Instalación

Siga estos pasos para clonar, configurar y ejecutar el proyecto en su entorno de desarrollo local.

### 1. Instalar dependencias
Asegúrese de contar con Node.js instalado en su sistema. Ejecute el siguiente comando en la terminal desde la raíz del proyecto para descargar los módulos base y las librerías analíticas necesarias:

```bash
npm install
npm install chart.js jspdf papaparse react-chartjs-2
npm install @types/jspdf @types/papaparse --save-dev
```

*(Nota de dependencias críticas: Asegúrese de instalar `crypto-js` y `dompurify` para el cifrado AES-256 de respaldos y la desinfección de código HTML enriquecido ejecutando `npm i crypto-js dompurify` y sus tipos con `npm i -D @types/crypto-js @types/dompurify`).*

### 2. Configurar variables de entorno
Cree un archivo llamado `.env` en la raíz del proyecto e ingrese las credenciales correspondientes de la API de Firebase:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### 3. Ejecutar el entorno de desarrollo
Inicie el servidor de desarrollo local de Vite mediante el siguiente comando en la terminal:

```bash
npm run dev
```

---

## Arquitectura Modular y Características Principales

La plataforma ha sido estructurada visual y operativamente en bloques funcionales, centralizados en un panel de control avanzado con diseño corporativo Flat-Design:

### Panel de Control (Dashboard) y UX Avanzada
* **Métricas Consolidadas:** Gráficas SVG interactivas que muestran índices de resolución, picos de ataques y análisis de sentimiento en tiempo real.
* **Radar de Top Actores / Fuentes (Novedad):** La pestaña **Menciones** del panel traza con `chart.js` un **radar de los 10 actores o fuentes con más menciones registradas**, acompañado del **ranking con el número concreto de menciones** y su porcentaje sobre el total de menciones verificadas. Agrupa con la misma clave analítica del módulo de *Reportes y Analítica* (campo **Usuario o Sitio Web** → `@usuario` o dominio), hereda el tema claro/oscuro con los tokens corporativos `--engie-*` y la misma analítica se exporta en el **PDF ejecutivo del panel**.
* **Semáforos Gemelos (Novedad):** Integración de módulos duales en la vista ejecutiva de Reputación RRSS que cuantifican visualmente y en tiempo real las incidencias tanto por su **Nivel de Riesgo** (Bajo, Medio, Alto, Crítico) como por su **Estatus Operativo**.
* **Notificaciones Dinámicas:** Campana de alertas inteligente con motor de audio nativo (Web Audio API) y panel de preferencias en la nube para silenciar módulos específicos.
* **Persistencia de Navegación UX:** Integración de estados basados en `localStorage` coordinados entre la aplicación y el Sidebar para evitar redirecciones accidentales al Dashboard al presionar F5 o refrescar la página.
* **Optimización Lazy Loading y Skeletons:** Los datos de los historiales solo se consultan al servidor cuando el usuario ingresa a la vista explícitamente. La carga se suaviza mediante animaciones vectoriales limpias, eliminando parpadeos bruscos.
* **Sincronización en Tiempo Real:** Reemplazo de lecturas estáticas por escuchadores activos (`onSnapshot`), proyectando cambios de estado, contadores del firewall y nuevas incidencias de forma simultánea en todas las pestañas abiertas sin requerir recargas manuales.
* **Selector de Tema Claro/Oscuro:** Cambio de apariencia global desde **Configuración** (persistido en `localStorage`), con la paleta corporativa ENGIE (tokens `--engie-*`) que la interfaz y los PDFs heredan automáticamente.
* **Changelog / Notas de Lanzamiento:** Vista exclusiva para administradores (`ChangelogView`) que documenta el historial de versiones y mejoras de la plataforma, inaugurada con la versión **v1.0.0**.

### 1. Seguridad IT, Cumplimiento (Compliance) y SIEM
* **Radar de Intrusos (SIEM Forense):** Módulo de ciberseguridad que detecta y registra silenciosamente accesos denegados (Errores 403), capturando la IP pública real, País de origen y UserAgent del atacante (incluyendo el rastreo de atacantes externos bajo el identificador `anonymous_attacker`). 
* **Microservicio de Purga Automática (Serverless):** Sistema autónomo diseñado para mantener la salud de la base de datos eliminando registros obsoletos de notificaciones y bitácoras forenses. El microservicio opera mediante una arquitectura de tres capas:
  1.  **Frontend (React):** Interfaz donde el `ADMIN_IT` define la regla de negocio y frecuencia de la limpieza (Manual, Diario, Semanal, Mensual). Esta orden se cifra y almacena en un documento de configuración de Firestore.
  2.  **Motor Lógico (PHP REST API):** Un *script* blindado e invisible alojado en Hostinger, el cual consume la API de Firestore mediante un *Service Account Token* con permisos de *Firebase Admin SDK*. El script lee el documento de configuración de React, consulta su propio bloc de memoria local (`ultima_purga.txt`) para validar matemáticamente si ya transcurrió el tiempo necesario y, de ser así, ejecuta consultas en lote (`Batch Deletes`) para destruir los registros viejos sin afectar los datos transaccionales (Incidencias y Menciones).
  3.  **Gatillo de Ejecución (Cron Job):** Programador nativo de Hostinger configurado en formato `0 0 * * *` (Ejecución CLI en el core de Linux). Despierta silenciosamente al motor PHP todos los días a las 12:00 AM para que evalúe y decida, según las reglas del Frontend, si debe actuar o volver a suspenderse, creando un entorno 100% automatizado que no depende del navegador.
* **Reporte de Hackeos y Checklist:** Documentación estructurada de vectores de ataque y sala de crisis global con sincronización en tiempo real para tareas de contención.
* **Vigía de Inactividad Global:** Monitoreo en segundo plano que detecta el abandono de la plataforma, ejecutando la destrucción automática de la sesión por seguridad.
* **Centro de Respaldos Cifrados (Core):** Módulo para la mesa directiva que compila un JSON general de todo el ecosistema y lo **encripta mediante criptografía AES-256** usando `crypto-js`. Su motor inverso inyecta inteligentemente registros borrados omitiendo duplicaciones, previa validación de contraseña.

### 2. Social Listening, Reputación RRSS y Análisis de Tendencias
* **Monitoreo de Menciones y Tendencias:** Detección y análisis de comentarios y menciones sobre Energía Mayakan en redes sociales, identificando tendencias, picos de conversación negativa y la evolución cronológica de la opinión (positiva, neutra y negativa).
* **Protocolo de Atención en RRSS:** Procedimiento oficial para gestionar la conversación digital alrededor del proyecto (vista **Incidencias → Protocolo**, con versión imprimible en PDF alineada a la paleta corporativa ENGIE). Define cuatro tipos de incidencia — críticas al proyecto o sus obras, desinformación y narrativas falsas, tensión socioambiental y comunitaria, y crisis que escalan a medios —, una **matriz de riesgos** en tres niveles (Bajo / Intermedio / Crítico) y el ciclo de resolución **Detección → Respuesta → Reacción → Recuperación → Aprendizaje**.
* **Gestión de Contingencias:** Herramienta enfocada en la detección de picos inusuales de alertas en canales digitales oficiales, equipado con el sistema de **Borrado por Lotes** para un mantenimiento ágil.
* **Reportes WYSIWYG Purificados:** Editor de texto enriquecido integrado, resguardado con la librería `DOMPurify` para prevenir vulnerabilidades de inyección de código (XSS) al momento de renderizar bitácoras oficiales.
* **Trazabilidad de Incidencias y Selección Masiva:** Registro de ataques focalizados organizados por tema principal y tipo de contenido (Orgánico/Pautado), incorporando también capacidades de selección interactiva para depuración masiva de historiales.
* **Módulo Analítico Avanzado:** Tablero de inteligencia de negocios exclusivo para directivos y edición, impulsado por `Chart.js` para el análisis profundo de Comentarios.
  * **Ingesta Dual Inteligente:** Motor robusto que permite alimentar las gráficas cargando archivos CSV encriptados a prueba de fallos mediante la librería `PapaParse`, o extrayendo la información en tiempo real directamente desde Firestore.
  * **Radar de Autores y Filtros Dinámicos:** Gráficas camaleónicas que se adaptan al Dark Mode para mostrar la tendencia cronológica de negatividad, temas de riesgo y usuarios recurrentes, respaldados por una bitácora de trazabilidad con buscador interno y paginación modular.

---

## Seguridad Perimetral, Firewall Zero-Trust y Exportación

* **Firewall Backend & Rate Limit de Servidor:** Protección anti-spam con enfriamiento estricto de 60 segundos por IP/Email entre peticiones. Cuenta con un sistema de castigo inmutable en Firestore que bloquea automáticamente la IP por 30 minutos al acumular 5 intentos fallidos en el Login corporativo.
* **Blindaje de Rutas y Dominio (GUEST_ONLY):** Restricción de acceso de nivel infraestructura que rechaza cualquier correo ajeno a `@tierradeideas.mx`. Incorpora el nivel de acceso granular `GUEST_ONLY`, el cual intercepta, expulsa y reubica en silencio a usuarios logueados que intenten manipular el DOM o alterar el `localStorage` para forzar la entrada a vistas públicas.
* **Arquitectura Zero-Trust (Backend Rules):** Toda validación de roles y permisos se ejecuta directamente en el servidor (Firebase Security Rules). La plataforma restringe operaciones críticas de lectura/escritura a usuarios no autorizados, rechazando de raíz cualquier manipulación desde el cliente.
* **Control de Accesos Basado en Roles (RBAC):** Sistema dinámico sin credenciales expuestas. Maneja 2 niveles escalonados — **Administrador IT** (`ADMIN_IT`) y **Administrador CM** (`ADMIN_CM`) — con protección automática para superusuarios fundadores y un ecosistema de vistas castradas e independientes según el perfil operativo.
* **Simetría Visual y Portales React:** Estandarización milimétrica en grillas de captura y renderizado de modales mediante `ReactDOM.createPortal` para un desenfoque de fondo que cubre el 100% de la pantalla sin bloquear notificaciones emergentes. Los **modales de consulta** de los historiales de Menciones e Incidencias se cierran con el botón **X** o con un **clic fuera de la tarjeta**; el cierre por clic externo usa el `mousedown` del fondo, de modo que no se dispara al iniciar una selección de texto dentro de la ventana.
* **Exportación Inteligente Universal:**
  * **CSV Dinámico con Filtros Server-Side:** Descarga masiva optimizada para Excel que consulta directamente a la base de datos para ofrecer segmentación dinámica mediante años y meses reales que cuentan con registros. Incluye soporte para spinners de carga asíncrona y procesamiento robusto con `PapaParse`.
  * **Documentos Word (.docx):** Generación nativa basada en XML para descargar reportes con texto enriquecido.
  * **Reportes Ejecutivos PDF Premium:** Sistema de impresión ejecutivo impulsado por `jsPDF` que renderiza documentos de alta fidelidad con gráficas interactivas incrustadas, respetando el Modo Oscuro de la plataforma y garantizando la entregabilidad de los datos visualizados en el tablero.
  * **PDF del Protocolo de Atención (RRSS):** La vista **Incidencias → Protocolo** tiene versión imprimible en PDF encabezada por los títulos **"Reputación Digital • ENGIE Management"** y **"Protocolo de Atención en RRSS"**, renderizada con los **tokens de color corporativos** del design-system ENGIE (`--engie-*`: `--engie-midnight-navy`, `--engie-dark-blue`, `--engie-primary-cyan`) para heredar la paleta oficial sin colores estáticos.
  * **PDF del Reporte de Menciones (Historial):** Cada reporte del **Historial de Menciones** se abre en un modal con botón de impresión que genera un documento A4 con la misma información de la tarjeta: metadatos del reporte y una ficha por mención (usuario/sitio web con etiqueta corta y URL completa, tipo de actor, sentimiento, riesgo, estatus, narrativa, hallazgo, métricas y enlace original). La etiqueta corta se calcula con `extractFuenteLabel()` (`src/shared/utils/fuenteUtils.ts`), que **descarta las arrobas que ya vengan en la URL** para no duplicarlas (`youtube.com/@canal` → `@canal`) y resuelve las rutas estructurales de cada plataforma (`/c/`, `/user/`, `/in/`, `/company/`, `/r/`, `/u/`) junto con las publicaciones y recursos que no son un perfil (`/p/`, `/stories/`, `/groups/`, `/profile.php`…), de modo que las publicaciones del mismo canal agrupan en un único actor/fuente. Usa el área de impresión `menciones-print-area`, que comparte con el informe de incidencias RRSS (`rrss-print-area`) las reglas `@media print` que aíslan el documento y evitan páginas en blanco.

---

## Stack Tecnológico

* **Core:** React 19 + TypeScript
* **Build Tool:** Vite
* **Microservicios Backend:** PHP (CLI / Hostinger Cron Jobs) + REST API
* **Gráficas y Exportación:** `Chart.js`, `jsPDF`, `PapaParse`
* **Seguridad y Limpieza:** `crypto-js` (Cifrado AES-256) y `DOMPurify` (Prevención XSS)
* **Estilos y UX/UI:** Tailwind CSS (Arquitectura corporativa Flat-Design y Dark/Light Mode nativo)
* **Audio y Media:** Web Audio API nativa + SVG escalable
* **Backend y Base de Datos:** Google Firebase (Firestore DB, Security Rules, Firebase Admin SDK y Workspace Authentication)

---

&copy; 2026 Tierra de Ideas. Todos los derechos reservados.