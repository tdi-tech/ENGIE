import React, { useState, useEffect } from 'react';
import { History, GitCommit, ChevronDown, ChevronRight, Star, ShieldCheck, Layout, Zap, Sparkles, RefreshCw } from 'lucide-react';

const changelogData = [
    // 🔥 NUEVA VERSIÓN 3.5.0
    {
        id: 'cl-v3-5-0',
        version: 'Versión 3.5.0',
        date: 'Agosto 2026',
        tag: 'Última Versión',
        title: 'Microservicio de Purga, Borrado en Lote y Semáforos RRSS',
        changes: [
            { id: 'ch-350-1', type: 'title', text: 'Automatización y Microservicios' },
            { id: 'ch-350-2', type: 'security', text: 'Microservicio de Purga Automática: Despliegue de un sistema Serverless (Cron Job + PHP blindado) que limpia de forma autónoma notificaciones y bitácoras de auditoría antiguas según la frecuencia deseada (Diario, Semanal, Mensual).' },
            { id: 'ch-350-3', type: 'divider', text: '' },
            { id: 'ch-350-4', type: 'title', text: 'Gestión Operativa y Visualización' },
            { id: 'ch-350-5', type: 'feature', text: 'Eliminación por Lotes: Activación de la multi-selección en los historiales de Comentarios e Incidencias RRSS para que los administradores puedan depurar registros masivamente en un par de clics.' },
            { id: 'ch-350-6', type: 'ui', text: 'Gráficas de Semáforos en RRSS: Inyección de dos nuevas tarjetas visuales en el Dashboard de Reputación para monitorear en tiempo real la acumulación de casos por su Nivel de Riesgo (Bajo, Medio, Alto, Crítico) y su Estatus Operativo.' }
        ]
    },
    {
        id: 'cl-v3-4-0',
        version: 'Versión 3.4.0',
        date: 'Agosto 2026',
        tag: 'Estable', // 🔥 Se cambió de 'Última Versión' a 'Estable'
        title: 'Módulo Analítico de Comentarios y Semáforo en RRSS',
        changes: [
            { id: 'ch-340-1', type: 'title', text: 'Dashboard de Reportes y Análisis' },
            { id: 'ch-340-2', type: 'feature', text: 'Nuevo Módulo de Reportes: Dashboard analítico exclusivo para administradores, enfocado en la trazabilidad y análisis de sentimiento de la bitácora de comentarios.' },
            { id: 'ch-340-3', type: 'feature', text: 'Ingesta Dual Inteligente: Capacidad de alimentar las métricas subiendo un archivo CSV encriptado (con lectura segura vía PapaParse) o extrayendo la información en vivo desde Firestore.' },
            { id: 'ch-340-4', type: 'ui', text: 'Semáforo Operativo en RRSS: Integración de un sistema de estados visuales (semáforo) en el historial de incidencias de Redes Sociales, permitiendo a los administradores clasificar y priorizar visualmente el nivel de riesgo de cada caso.' },
            { id: 'ch-340-5', type: 'divider', text: '' },
            { id: 'ch-340-6', type: 'title', text: 'Exportación y UX/UI' },
            { id: 'ch-340-7', type: 'feature', text: 'Generación PDF de Alta Fidelidad: Motor de renderizado que captura las gráficas interactivas y exporta un documento ejecutivo respetando la identidad visual y el Modo Oscuro de la plataforma.' },
            { id: 'ch-340-8', type: 'ui', text: 'Gráficas Camaleónicas: Refactorización del motor de Chart.js para eliminar fondos estáticos, permitiendo que las curvas de tendencia y las donas se adapten perfectamente a las transiciones de temas (Claro/Oscuro).' },
            { id: 'ch-340-9', type: 'security', text: 'Filtros Dinámicos Validados: Los selectores de temporalidad ahora escanean la base de datos para mostrar únicamente los años y meses operativos que realmente contienen registros, evitando búsquedas vacías.' }
        ]
    },
    {
        id: 'cl-v3-3-0',
        version: 'Versión 3.3.0',
        date: 'Julio 2026',
        tag: 'Estable',
        title: 'Módulo de Tickets Emergentes, Exportaciones & Nuevo Rol Operativo',
        changes: [
            { id: 'ch-330-1', type: 'title', text: 'Nuevas Funcionalidades Operativas' },
            { id: 'ch-330-2', type: 'feature', text: 'Nuevo Rol "Editor Content": Implementación de un perfil aislado y especializado en la consola de tickets, con interfaz castrada para garantizar la confidencialidad de los módulos de ciberseguridad y crisis.' },
            { id: 'ch-330-3', type: 'feature', text: 'Gestión Interna de Producción: Consola de control para documentar fechas reales de entrega, notas internas y enlaces de arte final o carpetas en la nube.' },
            { id: 'ch-330-4', type: 'feature', text: 'Asignación Dinámica de Responsables: Selector personalizado integrado al perfil de Google Workspace que muestra foto y rol de cada miembro del equipo, enviando notificaciones directas y exclusivas al usuario asignado.' },
            { id: 'ch-330-5', type: 'divider', text: '' },
            { id: 'ch-330-6', type: 'title', text: 'Exportación, Interfaz y Ciberseguridad' },
            { id: 'ch-330-7', type: 'ui', text: 'Borrado en Lote y Multi-Selección: Nueva experiencia de usuario para administradores que permite eliminar tickets masivamente activando un modo de selección visual y una barra de ejecución flotante.' },
            { id: 'ch-330-8', type: 'feature', text: 'Generador CSV Inteligente: Nuevo motor de exportación conectado a Firestore con filtros dinámicos que escanean años y meses reales en la base de datos para extraer sábanas de información precisas.' },
            { id: 'ch-330-9', type: 'security', text: 'Cierres RBAC Estrictos: Reglas de Firestore ajustadas para prevenir que usuarios de bajo nivel manipulen los responsables asignados o fuercen el borrado de registros mediante el DOM.' },
            { id: 'ch-330-10', type: 'security', text: 'Firewall Anti-Spam: Blindaje para el formulario público de tickets con Rate Limit de 60 segundos y bloqueo de IP/Usuario por 30 minutos tras 5 intentos fallidos de PIN corporativo.' }
        ]
    },
    {
        id: 'cl-v3-2-3',
        version: 'Versión 3.2.3',
        date: 'Junio 2026',
        tag: 'Estable',
        title: 'Optimización de Canales Operativos y Filtros de Monitoreo',
        changes: [
            { id: 'ch-323-1', type: 'title', text: 'Unificación de Criterios y Permisos Corporativos' },
            { id: 'ch-323-2', type: 'feature', text: 'Unificación Operativa: Los equipos de coordinación y edición de contenidos ahora cuentan con acceso completo para documentar, actualizar y gestionar incidencias de seguridad de forma centralizada.' },
            { id: 'ch-323-3', type: 'security', text: 'Jerarquía de Privilegios: El equipo de administración de contenidos ahora puede pre-registrar colaboradores y pausar accesos temporales, manteniendo bloqueada la asignación de roles técnicos avanzados por seguridad del sistema.' },
            { id: 'ch-323-4', type: 'security', text: 'Blindaje de Áreas Críticas: Restricción absoluta del módulo de Gestión de Cuentas para roles operativos; cualquier intento de acceso no autorizado es registrado automáticamente en las bitácoras.' },
            { id: 'ch-323-5', type: 'divider', text: '' },
            { id: 'ch-323-6', type: 'title', text: 'Estabilidad de Consola y Depuración de Alertas' },
            { id: 'ch-323-7', type: 'ui', text: 'Optimización de Procesos: Implementación de controladores silenciosos en la carga de datos para suprimir alertas innecesarias durante la validación de perfiles corporativos.' },
            { id: 'ch-323-8', type: 'security', text: 'Depuración Forense: Se optimizó el Radar de Intrusos para omitir alertas normales de exportación de sábanas de datos o respaldos, dejándolo exclusivo para la detección de anomalías.' }
        ]
    },
    {
        id: 'cl-v3-2-2',
        version: 'Versión 3.2.2',
        date: 'Junio 2026',
        tag: 'Estable',
        title: 'Radar de Intrusos & Auditoría Centralizada',
        changes: [
            { id: 'ch-322-1', type: 'title', text: 'Monitoreo Perimetral Automático' },
            { id: 'ch-322-2', type: 'security', text: 'Radar de Intrusos: Incorporación de una bitácora inmutable en el servidor que registra al instante cualquier intento de acceso no autorizado o violación a las políticas corporativas.' },
            { id: 'ch-322-3', type: 'security', text: 'Retención y Autodestrucción Segura: Los registros de auditoría avanzada no pueden ser editados ni borrados por ningún usuario. Se eliminan físicamente de forma automática a los 14 días mediante políticas automáticas del servidor.' },
            { id: 'ch-322-4', type: 'feature', text: 'Trazabilidad y Auditoría de Conexiones: Captura automatizada y discreta de la procedencia geográfica, proveedor y agente de navegación en accesos bloqueados para análisis forense de TI.' },
            { id: 'ch-322-5', type: 'feature', text: 'Descargas Forenses CSV: Nuevo motor de exportación local en memoria que permite generar sábanas de datos analíticos sin elevar los consumos de cuota del servidor.' },
            { id: 'ch-322-6', type: 'ui', text: 'Consola Blindada de TI: Interfaz de supervisión de amenazas exclusiva para el perfil directivo de sistemas, equipada con pantallas de carga fluida y estados visuales limpios.' }
        ]
    },
    {
        id: 'cl-v3-2-1',
        version: 'Versión 3.2.1',
        date: 'Junio 2026',
        tag: 'Estable',
        title: 'Políticas de Cero Confianza y Protección de Datos',
        changes: [
            { id: 'ch-321-1', type: 'title', text: 'Políticas de Seguridad de Cero Confianza' },
            { id: 'ch-321-2', type: 'security', text: 'Validación Centralizada: Todo el control de accesos y roles institucionales se procesa directamente en el servidor central, impidiendo manipulaciones externas desde el navegador.' },
            { id: 'ch-321-3', type: 'security', text: 'Protección de Brechas Informativas: Bloqueo perimetral estricto a usuarios no identificados para la visualización de paneles operativos, alertas de incidentes y listas corporativas.' },
            { id: 'ch-321-4', type: 'security', text: 'Resguardo de Cuentas Fundacionales: Las credenciales y rangos clave de la organización se encuentran protegidos a nivel de infraestructura para evitar cualquier modification accidental.' },
            { id: 'ch-321-5', type: 'security', text: 'Vigía Preventivo de Sesión: Lanzamiento de un temporizador automático que concluye de forma segura la sesión tras detectar inactividad prolongada en la estación de trabajo.' },
            { id: 'ch-321-6', type: 'divider', text: '' },
            { id: 'ch-321-7', type: 'title', text: 'Cifrado Corporativo y Eficiencia de Red' },
            { id: 'ch-321-8', type: 'security', text: 'Respaldos de Datos Blindados: El módulo de copias de seguridad genera archivos descargables con cifrado avanzado que exigen una llave maestra para su lectura o inyección.' },
            { id: 'ch-321-9', type: 'feature', text: 'Centro de Restauración Inteligente: Capacidad de recuperar de emergencia expedientes históricos específicos sin generar duplicidad de datos activos en la nube.' },
            { id: 'ch-321-10', type: 'feature', text: 'Carga Bajo Demanda de Información: Refactorización del flujo de datos; las sábanas de información histórica se descargan únicamente cuando el usuario consulta la sección de forma explícita.' },
            { id: 'ch-321-11', type: 'ui', text: 'Estructuras Visuales de Espera: Implementación de componentes de carga fluidos que eliminan parpadeos y mejoran la experiencia de usuario mientras se consulta al servidor.' }
        ]
    },
    {
        id: 'cl-v3-2-0',
        version: 'Versión 3.2.0',
        date: 'Junio 2026',
        tag: 'Estable',
        title: 'Persistencia de Navegación y Preferencias en la Nube',
        changes: [
            { id: 'ch-320-1', type: 'feature', text: 'Retención de Ubicación Operativa: El sistema memoriza la sección de trabajo activa en caso de recargas accidentales del navegador, eliminando desvíos al menú inicial.' },
            { id: 'ch-320-2', type: 'security', text: 'Privacidad de Bitácoras Avanzadas: El historial de actualizaciones de la plataforma queda resguardado exclusivamente para personal identificado con credenciales operativas.' },
            { id: 'ch-320-3', type: 'security', text: 'Monitor de Salud Tecnológica: Nueva consola ejecutiva de TI para supervisar cuotas de servicio, volumen de registros y herramientas de depuración local.' },
            { id: 'ch-320-4', type: 'feature', text: 'Preferencias de Notificación en la Nube: Panel interactivo para personalizar las alertas de audio y visuales por cada canal de atención (Seguridad, Redes, Comentarios), sincronizado con Firestore.' },
            { id: 'ch-320-5', type: 'feature', text: 'Alertas Auditivas de Alta Velocidad: Sistema de sonido procesado de forma nativa por el navegador para agilizar los tiempos de respuesta ante emergencias.' },
            { id: 'ch-320-6', type: 'feature', text: 'Filtros Avanzados de Descarga: Capacidad de extraer reportes globales o segmentados por años o meses específicos mediante un selector predictivo.' },
            { id: 'ch-320-7', type: 'feature', text: 'Exportación aplanada para Comentarios: Desglose avanzado (1 fila = 1 comentario) para análisis dinámicos en Excel sin anidaciones rotas.' },
            { id: 'ch-320-8', type: 'feature', text: 'Reporte Ejecutivo en PDF: Exportación nativa y optimizada para impresión directo desde las métricas del Dashboard.' },
            { id: 'ch-320-9', type: 'ui', text: 'Rediseño de Configuración y UX: Arquitectura en columnas dinámicas para preferencias. Mejora visual en modales de detalle con "Action Cards".' }
        ]
    },
    {
        id: 'cl-v3-1-0',
        version: 'Versión 3.1.0',
        date: 'Mayo 2026',
        tag: 'Estable',
        title: 'Tablero Ejecutivo Inteligente y Central de Alertas',
        changes: [
            { id: 'ch-310-1', type: 'feature', text: 'Rediseño Absoluto del Dashboard: Organización modular mediante pestañas independientes para clasificar la información (Seguridad, Redes y Comentarios).' },
            { id: 'ch-310-2', type: 'feature', text: 'Métricas Visuales de Alto Nivel: Integración de gráficas analíticas automatizadas (Donut Charts, barras de progreso y tendencias de impacto) construidas de forma nativa.' },
            { id: 'ch-310-3', type: 'ui', text: 'Estructuración Cronológica: Menús e historiales organizados mediante panels colapsables ordenados por año y mes para agilizar las búsquedas.' },
            { id: 'ch-310-4', type: 'feature', text: 'Paginación Modular del Servidor: Segmentación fija de registros por pantalla (30 elementos) para mantener el software veloz y reducir el consumo de ancho de banda.' },
            { id: 'ch-310-5', type: 'ui', text: 'Indicadores Visuales Operativos: Distintivos de color de alto contraste para identificar de un vistazo las tendencias de opinión o niveles de riesgo en los reportes.' },
            { id: 'ch-310-6', type: 'feature', text: 'Paneles de Apertura Rápida: Implementación de vistas previas emergentes dentro del tablero para consultar incidentes sin salir de la pantalla de análisis principal.' },
            { id: 'ch-310-7', type: 'feature', text: 'Central de Notificaciones en Tiempo Real: Campana interactiva con alertas visuales inmediatas, filtros de lectura y enlaces directos al expediente del caso.' },
            { id: 'ch-310-8', type: 'security', text: 'Consola de Control de Acceso: Módulo directivo para autorizar perfiles de ingreso, dar de alta cuentas corporativas de forma manual y pausar usuarios temporalmente.' }
        ]
    },
    {
        id: 'cl-v3-0-0',
        version: 'Versión 3.0.0',
        date: 'Mayo 2026',
        tag: 'Estable',
        title: 'Gestión Documental Avanzada y Reportes Formales',
        changes: [
            { id: 'ch-300-1', type: 'feature', text: 'Edición Documental Profesional: Incorporación de una herramienta nativa para redactar y dar formato a bitácoras ejecutivas detalladas de manera fluida.' },
            { id: 'ch-300-2', type: 'feature', text: 'Generación Nativa de Archivos Word: Motor de exportación universal que genera de manera automática documentos oficiales (.docx) listos para intercambio institucional.' },
            { id: 'ch-300-3', type: 'ui', text: 'Optimización de Espacio en Pantalla: Rediseño visual de los formularios de captura a dos columnas para acelerar la inserción de datos y reducir la fatiga operativa.' },
            { id: 'ch-300-4', type: 'feature', text: 'Métricas de Contexto Operativo: Inclusión de parámetros analíticos para evaluar el ambiente general y planteles específicos involucrados en cada reporte.' }
        ]
    },
    {
        id: 'cl-v2-0-0',
        version: 'Versión 2.0.0',
        date: 'Abril 2026',
        tag: 'Estable',
        title: 'Conectividad Centralizada en la Nube y Expansión de Módulos',
        changes: [
            { id: 'ch-200-1', type: 'feature', text: 'Ecosistema Sincronizado en la Nube: Migración integral de la plataforma hacia servidores en la nube de alta disponibilidad, asegurando actualización inmediata entre dispositivos.' },
            { id: 'ch-200-2', type: 'feature', text: 'Lanzamiento de Nuevas Líneas Operativas: Despliegue de los módulos estratégicos para el control de "Reputación Digital" y "Trazabilidad de Comentarios".' },
            { id: 'ch-200-3', type: 'feature', text: 'Consola de Gestión Gerencial: Modales interactivos para examinar el desglose completo de casos, realizar correcciones en tiempo real o archivar registros de forma segura.' },
            { id: 'ch-200-4', type: 'feature', text: 'Generación y descarga de sábanas de datos en formato CSV para análisis externo.' },
            { id: 'ch-200-5', type: 'security', text: 'Sistema de protección de rutas y acciones condicionado por el rol del usuario (Admin vs Lector).' }
        ]
    },
    {
        id: 'cl-v1-0-0',
        version: 'Versión 1.0.0',
        date: 'Marzo 2026',
        tag: 'Estable',
        title: 'Despliegue de la Plataforma Corporativa',
        changes: [
            { id: 'ch-100-1', type: 'ui', text: 'Lanzamiento Estructural Base: Despliegue de la arquitectura del software optimizada para alta velocidad de respuesta.' },
            { id: 'ch-100-2', type: 'ui', text: 'Identidad Visual Premium: Interfaz limpia con soporte total de accesibilidad y transición fluida automatizada entre modos de visualización claro y oscuro.' },
            { id: 'ch-100-3', type: 'feature', text: 'Módulo de Respuestas e Incidentes: Panel inicial enfocado en registrar, documentar y dar seguimiento oportuno a eventos críticos de seguridad informática.' },
            { id: 'ch-100-4', type: 'feature', text: 'Protocolos de Contención Inmediata: Listas interactivas compartidas en tiempo real para coordinar y verificar de manera obligatoria las acciones de mitigación ante emergencias.' }
        ]
    }
];

const getChangeStyle = (type: string) => {
    switch (type) {
        case 'feature': return { icon: <Zap className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-500/10', text: 'text-blue-500' };
        case 'security': return { icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, bg: 'bg-emerald-500/10', text: 'text-emerald-500' };
        case 'ui': return { icon: <Layout className="w-4 h-4 text-purple-500" />, bg: 'bg-purple-500/10', text: 'text-purple-500' };
        default: return { icon: <GitCommit className="w-4 h-4 text-gray-500" />, bg: 'bg-gray-500/10', text: 'text-gray-500' };
    }
};

export const ChangelogView = () => {
    const [expandedVersions, setExpandedSections] = useState<Record<string, boolean>>({ [changelogData[0].id]: true });
    const [currentYear, setCurrentYear] = useState<number>(2026);
    
    const [visibleCount, setVisibleCount] = useState<number>(5);

    useEffect(() => {
        setCurrentYear(new Date().getFullYear());
    }, []);

    const toggleVersion = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 5);
    };

    const visibleChangelog = changelogData.slice(0, visibleCount);

    return (
        <div className="max-w-4xl mx-auto space-y-6 fade-in pb-10">
            <style>{`
                @keyframes staggerFade {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .stagger-item {
                    animation: staggerFade 0.6s ease-out forwards;
                    opacity: 0;
                }
            `}</style>

            <div className="theme-bg-container p-6 sm:p-8 rounded-2xl border theme-border shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <History className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4" /> Notas de Lanzamiento
                    </p>
                    <h2 className="text-3xl font-black theme-text-main mb-2">Changelog</h2>
                    <p className="theme-text-muted text-sm max-w-xl">
                        Descubre las últimas actualizaciones, mejoras de seguridad y nuevas funcionalidades integradas en la plataforma.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {visibleChangelog.map((item, index) => {
                    const isExpanded = !!expandedVersions[item.id];

                    return (
                        <div 
                            key={item.id} 
                            className="theme-bg-container border theme-border rounded-2xl overflow-hidden shadow-sm transition-all hover:border-gray-500/50 stagger-item"
                            style={{ 
                                animationDelay: `${(index % 5) * 0.12}s` 
                            }}
                        >
                            <button 
                                type="button"
                                onClick={() => toggleVersion(item.id)}
                                className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-left gap-4"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        <div className={`transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                            <ChevronRight className="w-5 h-5 theme-text-muted" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-3 mb-1">
                                            <h3 className="text-xl font-bold theme-text-main">{item.version}</h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.tag === 'Última Versión' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                {item.tag}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium theme-text-muted">{item.title}</p>
                                    </div>
                                </div>
                                <div className="pl-9 sm:pl-0">
                                    <span className="text-xs font-bold theme-text-muted bg-[var(--surface)] px-3 py-1.5 rounded-lg border theme-border shadow-inner">
                                        {item.date}
                                    </span>
                                </div>
                            </button>

                            <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden">
                                    <div className="p-6 border-t theme-border bg-[var(--background)]">
                                        <ul className="space-y-2">
                                            {item.changes.map((change) => {
                                                if (change.type === 'divider') {
                                                    return <div key={change.id} className="h-px w-full bg-gray-200 dark:bg-gray-700 my-4"></div>;
                                                }
                                                if (change.type === 'title') {
                                                    return (
                                                        <h4 key={change.id} className="text-sm font-black text-[var(--primary)] uppercase tracking-wider mt-4 mb-2 flex items-center gap-2">
                                                            <Sparkles className="w-4 h-4" />
                                                            {change.text}
                                                        </h4>
                                                    );
                                                }

                                                const style = getChangeStyle(change.type);
                                                return (
                                                    <li key={change.id} className="flex items-start gap-4 py-1">
                                                        <div className={`p-2 rounded-lg mt-0.5 flex-shrink-0 shadow-sm ${style.bg}`}>
                                                            {style.icon}
                                                        </div>
                                                        <p className="text-sm theme-text-main leading-relaxed pt-1.5">
                                                            {change.text}
                                                        </p>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {visibleCount < changelogData.length && (
                <div className="flex justify-center pt-4">
                    <button 
                        type="button" 
                        onClick={handleLoadMore}
                        className="flex items-center gap-2 px-6 py-2.5 theme-bg-container border theme-border rounded-xl text-sm font-bold theme-text-main hover:border-[var(--primary)] hover:text-[var(--primary)] shadow-sm transition-all group"
                    >
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        Cargar versiones anteriores
                    </button>
                </div>
            )}

            <div className="text-center pt-8 pb-4">
                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider">
                    ENGIE Management &copy; {currentYear}
                </p>
            </div>
        </div>
    );
};