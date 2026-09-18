import React, { useState, useEffect } from 'react';
import { History, GitCommit, ChevronDown, ChevronRight, Star, ShieldCheck, Layout, Zap, Sparkles, RefreshCw } from 'lucide-react';

const changelogData: { id: string; version: string; date: string; tag: string; title: string; changes: { id: string; type: string; text: string }[] }[] = [
    {
        id: 'v1.0.0',
        version: '1.0.0',
        date: 'Septiembre 2026',
        tag: 'Inicial',
        title: 'Lanzamiento fundacional — Gestión de Reputación Digital',
        changes: [
            { id: 's1', type: 'title', text: 'Módulo de RRSS y Protocolo de Atención' },
            { id: 'c1', type: 'feature', text: 'PDF imprimible del "Protocolo de Atención en RRSS" con colores corporativos ENGIE mediante tokens CSS (--engie-*), eliminando colores estáticos.' },
            { id: 'c2', type: 'ui', text: 'Títulos del PDF establecidos como "Reputación Digital • ENGIE Management" y "Protocolo de Atención en RRSS" en lugar del encabezado genérico.' },
            { id: 'c3', type: 'ui', text: 'Página final en blanco al imprimir el PDF: se corrigió ocultando el #print-header ("Reporte: ENGIE Management") y los pseudo-elementos body::before/::after (gradiente mesh + noise) que se replicaban en cada página.' },
            { id: 'd1', type: 'divider', text: '' },
            { id: 's2', type: 'title', text: 'Correcciones de Layout y Estilos' },
            { id: 'c4', type: 'ui', text: 'Se añadió PrintStyles en StaticViews.tsx que anula height:100vh, flex-1 y min-height de contenedores padres en modo impresión, forzando display:block y overflow:hidden para evitar páginas extras.' },
            { id: 'c5', type: 'ui', text: 'Se sustituyeron colores estáticos del PDF por tokens del design-system (--engie-primary-cyan, --engie-action-blue, --engie-dark-blue, --success, --warning, --error) garantizando herencia automática de la paleta corporativa.' },
            { id: 'c6', type: 'ui', text: 'Margen inferior de la última sección corregido a mb-0 para eliminar espaciado que contribuía a la página en blanco.' },
            { id: 'd2', type: 'divider', text: '' },
            { id: 's3', type: 'title', text: 'Historial de Menciones' },
            { id: 'c7', type: 'feature', text: 'Botón de impresión del reporte de menciones: ahora genera un documento A4 con la misma información de la tarjeta (metadatos del reporte y una ficha por mención con usuario/sitio web, tipo de actor, sentimiento, riesgo, estatus, narrativa, hallazgo, métricas y enlace original) en lugar de imprimir sólo el encabezado y el pie del modal.' },
            { id: 'c8', type: 'ui', text: 'Se añadió el área de impresión menciones-print-area y las reglas @media print de index.css se generalizaron con :is() para cubrir también menciones: aíslan el bloque del documento, neutralizan los contenedores padre (scroll, alturas, fondos, backdrop-blur) y ocultan el #print-header global para evitar páginas en blanco.' },
            { id: 'c9', type: 'ui', text: 'El campo "Usuario o Sitio Web" se muestra como etiqueta corta enlazable (@usuario para redes sociales o dominio para medios digitales) conservando la URL completa como destino del enlace y como columna "URL Fuente" en la exportación CSV.' },
            { id: 'c10', type: 'ui', text: 'Los modales de consulta de los historiales de Menciones e Incidencias ahora también se cierran con un clic fuera de la tarjeta (en el fondo oscuro), además del botón X. Se evaluó el mousedown del fondo para no cerrar la ventana al iniciar una selección de texto dentro.' },
            { id: 'd3', type: 'divider', text: '' },
            { id: 's4', type: 'title', text: 'Dashboard — Analítica de Actores / Fuentes' },
            { id: 'c11', type: 'feature', text: 'Nueva analítica "Top Actores / Fuentes Recurrentes" en el Dashboard → Menciones: radar (Chart.js) con los 10 actores o fuentes de más menciones registradas, acompañado del ranking que muestra el número concreto de menciones y su porcentaje sobre el total. Reutiliza la misma clave analítica de los reportes (Usuario o Sitio Web → @usuario o dominio), se colorea con los tokens corporativos según el tema claro/oscuro y se incorporó también como bloque del PDF ejecutivo del panel.' },
            { id: 'c12', type: 'ui', text: 'Etiqueta corta del campo "Usuario o Sitio Web": se corrigió la duplicación de arrobas cuando la URL ya incluía el handle (https://www.youtube.com/@canal mostraba @@canal, igual en X, TikTok o Instagram). extractFuenteLabel() ahora descarta las @ de la propia URL y resuelve las rutas estructurales de cada plataforma (youtube.com/c/Canal y /user/Canal, linkedin.com/in/usuario y /company/empresa, reddit.com/r/subreddit y /u/usuario), que antes generaban etiquetas erróneas como @c, @in, @company o @r y fusionaban actores distintos en una sola fila del ranking. También se descartan publicaciones y recursos que no son un perfil (instagram.com/p/…, /stories/…, facebook.com/groups/…, profile.php), que se mostraban como @p, @groups o @profile.php. El arreglo aplica a todo lo que usa la utilidad: historial y modal de Menciones, PDF del reporte, CSV (actorFuente / fuenteDeteccion), reportes analíticos y el radar de Top Actores / Fuentes del Dashboard.' },
            { id: 'c13', type: 'improvement', text: 'El radar de "Top Actores / Fuentes Recurrentes" ahora traza el mismo Top 10 que el ranking (antes 6 ejes), de modo que gráfico y lista muestran exactamente los mismos actores. Con más de 6 ejes las etiquetas y los puntos se compactan y el lienzo se amplía automáticamente para conservar la legibilidad.' },
            { id: 'c14', type: 'improvement', text: 'El radar de "Top Actores / Fuentes Recurrentes" se sustituyó por un gráfico de barras horizontales: con tantos ejes el polígono y las etiquetas se solapaban y el bloque resultaba difícil de leer. Las barras se ordenan de mayor a menor con intensidad decreciente, la altura del lienzo se ajusta al número de elementos (ya no hay recorte de etiquetas ni límite de 6 ejes) y el tooltip conserva el nombre completo del actor/fuente con su porcentaje. El detalle de la derecha pasó a ser una tabla numérica (posición, actor/fuente, menciones y %), ya que el gráfico representa la magnitud: así se evita duplicar el canal de barras y el bloque queda más despejado. La misma analítica alimenta el bloque del PDF ejecutivo.' },
        ],
    },
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
    const [expandedVersions, setExpandedSections] = useState<Record<string, boolean>>({});
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
                {visibleChangelog.length === 0 && (
                    <div className="theme-bg-container border theme-border rounded-2xl p-10 text-center">
                        <History className="w-10 h-10 mx-auto theme-text-muted mb-3" />
                        <p className="text-sm font-bold theme-text-main">Aún no hay registros de changelog</p>
                        <p className="text-xs theme-text-muted mt-1">Las versiones y actualizaciones de la plataforma se mostrarán aquí.</p>
                    </div>
                )}
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