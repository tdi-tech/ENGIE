# Innova Management

**Plataforma Integral SaaS para la Gestión de Seguridad, Cumplimiento y Control Operativo de Incidencias.**

Innova Management es una herramienta interna tipo SaaS (Software as a Service) diseñada para centralizar la documentación, el monitoreo y la mitigación de crisis digitales. La plataforma opera bajo una estricta **arquitectura Zero-Trust (Cero Confianza)**, dividiendo su operación de manera estratégica para dar soporte técnico al área de IT y control de reputación a los equipos de Community Managers, asegurando un historial inmutable y auditable bajo estrictos protocolos de confidencialidad corporativa.

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
* **Semáforos Gemelos (Novedad):** Integración de módulos duales en la vista ejecutiva de Reputación RRSS que cuantifican visualmente y en tiempo real las incidencias tanto por su **Nivel de Riesgo** (Bajo, Medio, Alto, Crítico) como por su **Estatus Operativo**.
* **Notificaciones Dinámicas:** Campana de alertas inteligente con motor de audio nativo (Web Audio API) y panel de preferencias en la nube para silenciar módulos específicos.
* **Persistencia de Navegación UX:** Integración de estados basados en `localStorage` coordinados entre la aplicación y el Sidebar para evitar redirecciones accidentales al Dashboard al presionar F5 o refrescar la página.
* **Optimización Lazy Loading y Skeletons:** Los datos de los historiales solo se consultan al servidor cuando el usuario ingresa a la vista explícitamente. La carga se suaviza mediante animaciones vectoriales limpias, eliminando parpadeos bruscos.
* **Sincronización en Tiempo Real:** Reemplazo de lecturas estáticas por escuchadores activos (`onSnapshot`), proyectando cambios de estado, contadores del firewall y nuevas incidencias de forma simultánea en todas las pestañas abiertas sin requerir recargas manuales.

### 1. Seguridad IT, Cumplimiento (Compliance) y SIEM
* **Radar de Intrusos (SIEM Forense):** Módulo de ciberseguridad que detecta y registra silenciosamente accesos denegados (Errores 403), capturando la IP pública real, País de origen y UserAgent del atacante (incluyendo el rastreo de atacantes externos bajo el identificador `anonymous_attacker`). 
* **Microservicio de Purga Automática (Serverless):** Sistema autónomo diseñado para mantener la salud de la base de datos eliminando registros obsoletos de notificaciones y bitácoras forenses. El microservicio opera mediante una arquitectura de tres capas:
  1.  **Frontend (React):** Interfaz donde el `ADMIN_IT` define la regla de negocio y frecuencia de la limpieza (Manual, Diario, Semanal, Mensual). Esta orden se cifra y almacena en un documento de configuración de Firestore.
  2.  **Motor Lógico (PHP REST API):** Un *script* blindado e invisible alojado en Hostinger, el cual consume la API de Firestore mediante un *Service Account Token* con permisos de *Firebase Admin SDK*. El script lee el documento de configuración de React, consulta su propio bloc de memoria local (`ultima_purga.txt`) para validar matemáticamente si ya transcurrió el tiempo necesario y, de ser así, ejecuta consultas en lote (`Batch Deletes`) para destruir los registros viejos sin afectar módulos transaccionales (Tickets o Historiales).
  3.  **Gatillo de Ejecución (Cron Job):** Programador nativo de Hostinger configurado en formato `0 0 * * *` (Ejecución CLI en el core de Linux). Despierta silenciosamente al motor PHP todos los días a las 12:00 AM para que evalúe y decida, según las reglas del Frontend, si debe actuar o volver a suspenderse, creando un entorno 100% automatizado que no depende del navegador.
* **Reporte de Hackeos y Checklist:** Documentación estructurada de vectores de ataque y sala de crisis global con sincronización en tiempo real para tareas de contención.
* **Vigía de Inactividad Global:** Monitoreo en segundo plano que detecta el abandono de la plataforma, ejecutando la destrucción automática de la sesión por seguridad.
* **Centro de Respaldos Cifrados (Core):** Módulo para la mesa directiva que compila un JSON general de todo el ecosistema y lo **encripta mediante criptografía AES-256** usando `crypto-js`. Su motor inverso inyecta inteligentemente registros borrados omitiendo duplicaciones, previa validación de contraseña.

### 2. Módulo de Tickets Emergentes & Consola de Producción
* **Emisión de Solicitudes:** Canal público para clientes y lectores autenticado exclusivamente mediante PIN corporativo de seguridad, equipado con semáforo de prioridad (Baja a Crítica), fechas límite, selector interactivo de múltiples plataformas y editor visual WYSIWYG purificado.
* **Consola Operativa de Gestión:** Panel interno de control que permite a los equipos documentar fechas reales de entrega, enlaces de arte final o carpetas de Drive y notas internas de avance. 
* **Borrado Dinámico por Lotes:** Sistema de multi-selección de elementos que permite a los administradores destruir masivamente múltiples tickets o registros desde una sola interfaz, optimizando el mantenimiento y la depuración del sistema en un solo clic.
* **Asignación Dinámica de Responsables:** Selector personalizado conectado a los perfiles de Google Workspace que muestra fotografía y rol de cada miembro, disparando notificaciones directas y alertas de asignación exclusivas al usuario seleccionado.

### 3. Reputación, Crisis RRSS y Reportes Analíticos de Comentarios
* **Gestión de Contingencias:** Herramienta enfocada en la detección de picos inusuales de alertas en canales digitales oficiales, equipado con el sistema de **Borrado por Lotes** para un mantenimiento ágil.
* **Reportes WYSIWYG Purificados:** Editor de texto enriquecido integrado, resguardado con la librería `DOMPurify` para prevenir vulnerabilidades de inyección de código (XSS) al momento de renderizar bitácoras oficiales.
* **Trazabilidad de Quejas y Selección Masiva:** Registro de ataques focalizados organizados por campus y tipo de contenido (Orgánico/Pautado), incorporando también capacidades de selección interactiva para depuración masiva de historiales.
* **Módulo Analítico Avanzado:** Tablero de inteligencia de negocios exclusivo para directivos y edición, impulsado por `Chart.js` para el análisis profundo de Comentarios.
  * **Ingesta Dual Inteligente:** Motor robusto que permite alimentar las gráficas cargando archivos CSV encriptados a prueba de fallos mediante la librería `PapaParse`, o extrayendo la información en tiempo real directamente desde Firestore.
  * **Radar de Autores y Filtros Dinámicos:** Gráficas camaleónicas que se adaptan al Dark Mode para mostrar la tendencia cronológica de negatividad, campus afectados y usuarios recurrentes, respaldados por una bitácora de trazabilidad con buscador interno y paginación modular.

---

## Seguridad Perimetral, Firewall Zero-Trust y Exportación

* **Firewall Backend & Rate Limit de Servidor:** Protección anti-spam con enfriamiento estricto de 60 segundos por IP/Email entre peticiones. Cuenta con un sistema de castigo inmutable en Firestore que bloquea automáticamente la IP por 30 minutos al acumular 5 intentos fallidos en el PIN de Tickets o en el Login corporativo.
* **Blindaje de Rutas y Dominio (GUEST_ONLY):** Restricción de acceso de nivel infraestructura que rechaza cualquier correo ajeno a `@tierradeideas.mx`. Incorpora el nivel de acceso granular `GUEST_ONLY`, el cual intercepta, expulsa y reubica en silencio a usuarios logueados que intenten manipular el DOM o alterar el `localStorage` para forzar la entrada a vistas públicas.
* **Arquitectura Zero-Trust (Backend Rules):** Toda validación de roles y permisos se ejecuta directamente en el servidor (Firebase Security Rules). La plataforma restringe operaciones críticas de lectura/escritura a usuarios no autorizados, rechazando de raíz cualquier manipulación desde el cliente.
* **Control de Accesos Basado en Roles (RBAC):** Sistema dinámico sin credenciales expuestas. Maneja 5 niveles escalonados (Lector, Editor Content, Editor CM, Administrador CM y Administrador IT) con protección automática para superusuarios fundadores y un ecosistema de vistas castradas e independientes según el perfil operativo.
* **Simetría Visual y Portales React:** Estandarización milimétrica en grillas de captura y renderizado de modales mediante `ReactDOM.createPortal` para un desenfoque de fondo que cubre el 100% de la pantalla sin bloquear notificaciones emergentes.
* **Exportación Inteligente Universal:**
  * **CSV Dinámico con Filtros Server-Side:** Descarga masiva optimizada para Excel que consulta directamente a la base de datos para ofrecer segmentación dinámica mediante años y meses reales que cuentan con registros. Incluye soporte para spinners de carga asíncrona y procesamiento robusto con `PapaParse`.
  * **Documentos Word (.docx):** Generación nativa basada en XML para descargar reportes con texto enriquecido.
  * **Reportes Ejecutivos PDF Premium:** Sistema de impresión ejecutivo impulsado por `jsPDF` que renderiza documentos de alta fidelidad con gráficas interactivas incrustadas, respetando el Modo Oscuro de la plataforma y garantizando la entregabilidad de los datos visualizados en el tablero.

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