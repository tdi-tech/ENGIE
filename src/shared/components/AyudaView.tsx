import React, { useState, useMemo } from 'react';
import { 
    HelpCircle, ShieldAlert, Database, Users, FileText, 
    AlertTriangle, MessageSquareWarning, Info, Lock, Settings,
    Ticket, Zap, ShieldCheck
} from 'lucide-react';

const helpTopics = [
    {
        id: 'intro',
        category: 'Fundamentos y Accesos',
        title: 'Introducción al Sistema',
        icon: <Info className="w-5 h-5 text-blue-500" />,
        badge: 'General',
        badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        content: (
            <div className="space-y-4 theme-text-main text-sm leading-relaxed">
                <p>
                    <strong>ENGIE Management</strong> es una plataforma de gestión de crisis y seguridad corporativa diseñada bajo una arquitectura <em>Zero-Trust</em> (Cero Confianza). 
                </p>
                <p className="theme-text-muted">
                    El sistema cuenta con módulos operativos para monitoreo (Hackeos, RRSS, Comentarios) y un ecosistema de Tickets para el flujo de producción de contenidos, protegido por firewalls en servidor y sincronización en tiempo real.
                </p>
            </div>
        )
    },
    {
        id: 'roles-admin',
        category: 'Fundamentos y Accesos',
        title: 'Roles de Administración',
        icon: <Users className="w-5 h-5 text-purple-500" />,
        badge: 'Directivo',
        badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        content: (
            <ul className="space-y-4 theme-text-main text-sm leading-relaxed">
                <li className="flex items-start gap-3 p-4 theme-bg-low rounded-xl border theme-border">
                    <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0 shadow-sm"></span>
                    <p><strong className="theme-text-main block mb-1">ADMIN_IT:</strong> Control absoluto. Gestión de Backups, Auditoría SIEM forense, automatización de purga mediante Microservicio (Notificaciones y Auditoría), administración total de usuarios y borrado de tickets por lotes.</p>
                </li>
                <li className="flex items-start gap-3 p-4 theme-bg-low rounded-xl border theme-border">
                    <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0 shadow-sm"></span>
                    <p><strong className="theme-text-main block mb-1">ADMIN_CM:</strong> Control operativo. Acceso a Reportes Analíticos, generación de Backups Core, privilegios directivos para pre-registrar usuarios, borrado masivo de tickets y asignación de semáforos de riesgo en RRSS.</p>
                </li>
            </ul>
        )
    },
    {
        id: 'roles-operativos',
        category: 'Fundamentos y Accesos',
        title: 'Roles Operativos',
        icon: <Users className="w-5 h-5 text-indigo-500" />,
        badge: 'Ejecución',
        badgeColor: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        content: (
            <ul className="space-y-3 theme-text-main text-sm leading-relaxed">
                <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></span>
                    <p><strong className="theme-text-main">EDITOR_CM:</strong> Nivel operativo. Capacidad de crear/editar incidentes en Hackeos y RRSS. Documentación de avances en tickets y acceso visual a los Reportes Analíticos de Comentarios.</p>
                </li>
                <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></span>
                    <p><strong className="theme-text-main">EDITOR_CONTENT:</strong> Perfil especializado en la consola de Tickets Emergentes. Gestiona estados y metadatos de tickets. Acceso de lectura al historial de Comentarios para descarga CSV.</p>
                </li>
                <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></span>
                    <p><strong className="theme-text-main">Lector / Externo:</strong> Visualización de Dashboard analítico y protocolos. Acceso al formulario de Solicitud de Tickets mediante PIN corporativo (restringido en nivel <em>GUEST_ONLY</em>).</p>
                </li>
            </ul>
        )
    },
    {
        id: 'modulos',
        category: 'Operación y Gestión',
        title: 'Gestión de Reportes & Tickets',
        icon: <FileText className="w-5 h-5 text-emerald-500" />,
        badge: 'Operativo',
        badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        content: (
            <div className="space-y-5 theme-text-main text-sm leading-relaxed">
                <div className="flex gap-4 items-start">
                    <div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                    <div>
                        <p className="font-bold text-sm uppercase tracking-wider mb-1 theme-text-main">Hackeos</p>
                        <p className="theme-text-muted text-xs">Vulnerabilidades, malware y robo de cuentas oficiales. Incluye checklist de contención técnica inmediata.</p>
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="p-2 bg-orange-500/10 rounded-lg"><ShieldAlert className="w-5 h-5 text-orange-500" /></div>
                    <div>
                        <p className="font-bold text-sm uppercase tracking-wider mb-1 theme-text-main">Incidencias RRSS</p>
                        <p className="theme-text-muted text-xs">Registro y gestión de quejas críticas o crisis reputacionales. Los administradores cuentan con la capacidad de asignar un estado visual (semáforo) a cada registro en el historial para priorizar su atención.</p>
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="p-2 bg-blue-500/10 rounded-lg"><MessageSquareWarning className="w-5 h-5 text-blue-500" /></div>
                    <div>
                        <p className="font-bold text-sm uppercase tracking-wider mb-1 theme-text-main">Comentarios</p>
                        <p className="theme-text-muted text-xs">Reportes unificados de interacción comunitaria. Incluye módulo de Reportes Analíticos (visible para Admins y Editor CM) con exportación PDF.</p>
                    </div>
                </div>
                <div className="flex gap-4 items-start pt-3 border-t theme-border/40">
                    <div className="p-2 bg-purple-500/10 rounded-lg"><Ticket className="w-5 h-5 text-purple-500" /></div>
                    <div>
                        <p className="font-bold text-sm uppercase tracking-wider mb-1 theme-text-main">Tickets Emergentes & Consola</p>
                        <p className="theme-text-muted text-xs">Canal de solicitud protegido con PIN corporativo. La consola interna permite asignar responsables directos vinculados a Google Workspace, registrar fechas y ligas de arte en la nube con alertas dirigidas.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'configuracion',
        category: 'Operación y Gestión',
        title: 'Panel de Configuración',
        icon: <Settings className="w-5 h-5 text-slate-500" />,
        badge: 'Sistema',
        badgeColor: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        content: (
            <ul className="space-y-4 theme-text-main text-sm leading-relaxed">
                <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0"></span>
                    <p><strong className="theme-text-main">ADMIN_IT:</strong> Análisis de salud en tiempo real de Firestore, purga manual de rastros y programación temporal del Microservicio de Purga Automática (CronJob).</p>
                </li>
                <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0"></span>
                    <p><strong className="theme-text-main">Equipo Operativo (CM / Content):</strong> Control exclusivo sobre su tema visual e interruptores independientes para silenciar alertas sonoras o visuales por módulo.</p>
                </li>
                <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0"></span>
                    <p><strong className="theme-text-main">Lectores Externos:</strong> Acceso únicamente al cambio global de Tema (Claro/Oscuro).</p>
                </li>
            </ul>
        )
    },
    {
        id: 'firewall',
        category: 'Ciberseguridad Avanzada',
        title: 'Firewall Backend & Zero-Trust',
        icon: <Zap className="w-5 h-5 text-amber-500" />,
        badge: 'Infraestructura',
        badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        content: (
            <div className="space-y-4 theme-text-main text-sm leading-relaxed">
                <p className="theme-text-muted">
                    La plataforma ejecuta un escudo activo en servidor que evalúa cada petición antes de procesarla en la base de datos:
                </p>
                <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 theme-bg-low rounded-xl border theme-border flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                        <div>
                            <strong className="theme-text-main block">Rate Limit (60s)</strong>
                            <span className="text-xs theme-text-muted">Bloqueo de velocidad contra spam en envíos repetidos de formularios.</span>
                        </div>
                    </div>
                    <div className="p-4 theme-bg-low rounded-xl border theme-border flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                        <div>
                            <strong className="theme-text-main block">Bloqueo por Fuerza Bruta (30 min)</strong>
                            <span className="text-xs theme-text-muted">Suspensión automática e inmutable al acumular 5 intentos fallidos en el PIN de Tickets o Login.</span>
                        </div>
                    </div>
                    <div className="p-4 theme-bg-low rounded-xl border theme-border flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                        <div>
                            <strong className="theme-text-main block">Sincronización en Vivo</strong>
                            <span className="text-xs theme-text-muted">Los estados de bloqueo y contadores se reflejan en tiempo real entre pestañas del navegador.</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'backups',
        category: 'Ciberseguridad Avanzada',
        title: 'Gestión de Backups',
        icon: <Database className="w-5 h-5 text-teal-500" />,
        badge: 'Admin IT & CM',
        badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
        requireAdmin: true,
        content: (
            <div className="space-y-4 theme-text-main text-sm leading-relaxed">
                <p className="theme-text-muted">
                    Herramienta de prevención de desastres para copias de seguridad de la base de datos operativa, habilitada para la mesa directiva (IT y CM).
                </p>
                <div className="p-5 bg-teal-500/5 border border-teal-500/20 rounded-xl mt-2">
                    <p className="font-black text-teal-700 dark:text-teal-400 text-sm flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4" /> Cifrado AES-256
                    </p>
                    <p className="text-xs text-teal-600 dark:text-teal-500 leading-relaxed">
                        Los respaldos generados requieren contraseña estricta para ser inyectados. La restauración inteligente previene documentos duplicados verificando identificadores únicos en tiempo real.
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'auditoria',
        category: 'Ciberseguridad Avanzada',
        title: 'Radar de Intrusos (SIEM)',
        icon: <ShieldCheck className="w-5 h-5 text-red-500" />,
        badge: 'Exclusivo IT',
        badgeColor: 'bg-red-500/10 text-red-500 border-red-500/20',
        requireAdmin: true,
        content: (
            <div className="space-y-4 theme-text-main text-sm leading-relaxed">
                <p className="theme-text-muted">
                    Módulo de auditoría SIEM que atrapa intentos ilegales, accesos denegados, ataques de fuerza bruta y violaciones de rate limit al instante.
                </p>
                <ul className="space-y-3 mt-3">
                    <li className="flex items-start gap-3 p-4 theme-bg-low rounded-xl border theme-border">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                        <p><strong className="theme-text-main block">Captura Forense:</strong> IP real, País, UserAgent y detalle del ataque (registra incluso a atacantes anónimos).</p>
                    </li>
                    <li className="flex items-start gap-3 p-4 theme-bg-low rounded-xl border theme-border">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                        <p><strong className="theme-text-main block">Microservicio de Purga:</strong> Limpieza automatizada mediante CronJob en servidor PHP que elimina logs incondicionalmente según la programación (Diario/Semanal).</p>
                    </li>
                    <li className="flex items-start gap-3 p-4 theme-bg-low rounded-xl border theme-border">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                        <p><strong className="theme-text-main block">Exportación Segura:</strong> Descarga de reportes a CSV generados localmente sin consumir cuotas de lectura de Google Cloud.</p>
                    </li>
                </ul>
            </div>
        )
    }
];

export const AyudaView = ({ isAdmin }: { isAdmin: boolean }) => {
    const categories = ['Fundamentos y Accesos', 'Operación y Gestión', 'Ciberseguridad Avanzada'];
    const availableTopics = useMemo(() => helpTopics.filter(t => !t.requireAdmin || isAdmin), [isAdmin]);
    
    // Estado para controlar qué tema se está viendo en el panel derecho
    const [activeTopicId, setActiveTopicId] = useState<string>(availableTopics[0]?.id || 'intro');

    const activeTopic = useMemo(() => availableTopics.find(t => t.id === activeTopicId), [activeTopicId, availableTopics]);

    return (
        <div className="max-w-6xl mx-auto space-y-6 fade-in pb-10">
            {/* CABECERA ORIGINAL INTACTA */}
            <div className="theme-bg-container p-6 sm:p-8 rounded-2xl border theme-border shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none transition-transform duration-700">
                    <HelpCircle className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4" /> Centro de Soporte
                    </p>
                    <h2 className="text-3xl font-black theme-text-main mb-2">Manual Operativo</h2>
                    <p className="theme-text-muted text-sm max-w-xl">
                        Consulta los lineamientos técnicos, las matrices de permisos y el funcionamiento general de la arquitectura del sistema.
                    </p>
                </div>
            </div>

            {/* MASTER-DETAIL VIEW */}
            <div className="flex flex-col lg:flex-row gap-8 items-start mt-8">
                
                {/* PANEL IZQUIERDO: Menú Lateral (32%) */}
                <div className="w-full lg:w-[32%] flex-shrink-0 space-y-8 sticky top-6">
                    {categories.map((category, idx) => {
                        const topicsInCategory = availableTopics.filter(t => t.category === category);
                        if (topicsInCategory.length === 0) return null;

                        return (
                            <div key={idx} className="space-y-3">
                                <h3 className="text-[10px] font-black theme-text-muted uppercase tracking-widest ml-2">{category}</h3>
                                <div className="space-y-1.5">
                                    {topicsInCategory.map(topic => {
                                        const isActive = activeTopicId === topic.id;
                                        return (
                                            <button
                                                key={topic.id}
                                                onClick={() => setActiveTopicId(topic.id)}
                                                // 🔥 INYECCIÓN DIRECTA DE COLOR SÓLIDO EN STYLE PARA EVITAR QUE TAILWIND LO IGNORE 🔥
                                                style={{ 
                                                    WebkitTapHighlightColor: 'transparent',
                                                    backgroundColor: isActive ? 'var(--primary)' : 'transparent'
                                                }}
                                                className={`group w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 outline-none focus:outline-none ring-0 border-none select-none ${
                                                    isActive 
                                                        ? 'shadow-xl scale-[1.03] z-10' 
                                                        : 'hover:theme-bg-low hover:scale-[1.01] z-0 opacity-80 hover:opacity-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* El SVG ahora se fuerza a blanco con CSS directo para sobreescribir el color azul/naranja original */}
                                                    <div className={`transition-all duration-300 flex items-center justify-center ${isActive ? 'scale-125 drop-shadow-md text-white [&_svg]:!text-white' : 'scale-100 group-hover:scale-110'}`}>
                                                        {topic.icon}
                                                    </div>
                                                    <span className={`text-sm text-left transition-all duration-300 ${isActive ? 'font-black text-white' : 'font-bold theme-text-muted group-hover:theme-text-main'}`}>
                                                        {topic.title}
                                                    </span>
                                                </div>
                                                
                                                {/* Indicador LED Punchy también en blanco */}
                                                {isActive && (
                                                    <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white] animate-pulse flex-shrink-0"></div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* PANEL DERECHO: Contenido Detallado (68%) */}
                <div className="w-full lg:w-[68%]">
                    {activeTopic ? (
                        <div key={activeTopic.id} className="theme-bg-container border theme-border rounded-3xl p-8 sm:p-10 shadow-lg min-h-[500px] fade-in relative overflow-hidden flex flex-col">
                            
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8 border-b theme-border pb-8 relative z-10">
                                <div className="flex items-center gap-5">
                                    <div className="p-3.5 theme-bg-low rounded-2xl border theme-border shadow-sm">
                                        {activeTopic.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl sm:text-3xl font-black theme-text-main leading-tight mb-1.5">
                                            {activeTopic.title}
                                        </h3>
                                        <p className="text-[11px] font-bold theme-text-muted uppercase tracking-widest">
                                            {activeTopic.category}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border ${activeTopic.badgeColor} whitespace-nowrap self-start sm:self-center shadow-sm`}>
                                    {activeTopic.badge}
                                </span>
                            </div>

                            <div className="flex-1 relative z-10 text-base">
                                {activeTopic.content}
                            </div>
                        </div>
                    ) : (
                        <div className="theme-bg-container border theme-border rounded-3xl p-8 flex items-center justify-center min-h-[500px] shadow-sm">
                            <p className="theme-text-muted font-medium">Selecciona un tema del menú para explorar.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* FOOTER ORIGINAL INTACTO */}
            <div className="text-center pt-12 pb-4 fade-in">
                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-default">
                    <ShieldAlert className="w-3.5 h-3.5" /> ¿Necesitas escalamiento técnico? Contacta a Soporte IT.
                </p>
            </div>
        </div>
    );
};