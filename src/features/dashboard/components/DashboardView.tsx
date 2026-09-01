import React, { useMemo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
    ShieldAlert, ListChecks, BookOpen, Users, Clock, Activity, 
    AlertTriangle, CheckCircle2, Lock, Megaphone, MessageSquare, 
    FileText, X, ChevronRight, PieChart, TrendingUp, MapPin, Download, Loader2,
    Ticket, Send, Calendar
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId, auth, IS_MOCK, ALLOWED_EMAIL_DOMAIN_MAIL } from '../../../services/firebase/config'; 
import { StatCard, ActionBtn } from '../../../shared/components/UIComponents';
import { DetailModal, EditIncidentModal } from '../../incidents/components/HackViews';

export const DashboardView = ({ 
    isAdmin, user, userRole, navigate, showToast, 
    toggleIncidentStatus, updateIncident, deleteIncident 
}: any) => {

    const [incidents, setIncidents] = useState<any[]>([]);
    const [rrssIncidents, setRrssIncidents] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const isEditorContent = userRole === 'EDITOR_CONTENT';
    
    // 🔥 MODIFICACIÓN 1: Ahora 'comentarios' es la pestaña por defecto
    const [activeTab, setActiveTab] = useState(isEditorContent ? 'tickets' : 'comentarios');
    const [mounted, setMounted] = useState(false);
    
    const [previewModal, setPreviewModal] = useState<{isOpen: boolean, type: string, data: any}>({isOpen: false, type: '', data: null});
    const [selectedHackeo, setSelectedHackeo] = useState<any>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);

    useEffect(() => {
        if (isEditorContent) setActiveTab('tickets');
    }, [isEditorContent]);

    useEffect(() => {
        if (IS_MOCK) { setIsLoading(false); return; }
        setIsLoading(true); 
        
        const u = auth.currentUser;
        if (u && !u.isAnonymous && u.email && !u.email.endsWith('@' + ALLOWED_EMAIL_DOMAIN_MAIL)) {
            setIsLoading(false);
            return;
        }

        const unsub1 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'incidents'), snap => {
            const arr: any[] = []; snap.forEach(d => arr.push({id: d.id, ...d.data()}));
            setIncidents(arr.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        }, () => {}); 

        const unsub2 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'rrss_incidents'), snap => {
            const arr: any[] = []; snap.forEach(d => arr.push({id: d.id, ...d.data()}));
            setRrssIncidents(arr.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        }, () => {}); 

        const unsub3 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'comments'), snap => {
            const arr: any[] = []; snap.forEach(d => arr.push({id: d.id, ...d.data()}));
            setComments(arr.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }, () => {}); 
        
        const unsub4 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), snap => {
            const arr: any[] = []; snap.forEach(d => arr.push({id: d.id, ...d.data()}));
            setTickets(arr.sort((a,b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()));
        }, () => {}); 
        
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => { unsub1(); unsub2(); unsub3(); unsub4(); clearTimeout(timer); };
    }, [user]); 

    useEffect(() => {
        setMounted(false);
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, [activeTab]);

    const hackStats = useMemo(() => {
        let open = 0, resolved = 0, critical = 0;
        const vectorCounts: Record<string, number> = {};
        const platformCounts: Record<string, number> = {};

        incidents.forEach((inc: any) => {
            if (inc.estado !== 'Resuelto') open++;
            if (inc.estado === 'Resuelto') resolved++;
            if (inc.impacto === 'Alto' || inc.impacto === 'Crítico') critical++;
            if (inc.vector) vectorCounts[inc.vector] = (vectorCounts[inc.vector] || 0) + 1;
            if (inc.plataforma) platformCounts[inc.plataforma] = (platformCounts[inc.plataforma] || 0) + 1;
        });

        const topVectors = Object.entries(vectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({
            name, count, percent: incidents.length ? Math.round((count / incidents.length) * 100) : 0 
        }));
        const topPlatform = Object.keys(platformCounts).sort((a,b) => platformCounts[b] - platformCounts[a])[0] || 'N/A';

        return { total: incidents.length, open, resolved, critical, topVectors, topPlatform };
    }, [incidents]);

    const rrssStats = useMemo(() => {
        let totalIncidenciasSum = 0, criticalRisk = 0;
        const networkCounts: Record<string, number> = {};
        const uniqueCampus = new Set<string>();

        // 🔥 MODIFICACIÓN 2: Contadores para los Semáforos
        const riesgoCounts: Record<string, number> = { 'Bajo': 0, 'Medio': 0, 'Alto': 0, 'Crítico': 0 };
        const estatusCounts: Record<string, number> = { 'Monitoreo activo': 0, 'En revisión': 0, 'Seguimiento activo': 0, 'Resuelto / solucionado': 0 };

        rrssIncidents.forEach((inc: any) => {
            totalIncidenciasSum += (Number(inc.totalIncidencias) || 0);
            
            // Matemática de Riesgo
            let r = inc.riesgo || 'Bajo';
            if (r === 'Critico') r = 'Crítico';
            if (r === 'Crítico') criticalRisk++;
            if (r in riesgoCounts) riesgoCounts[r]++;

            // Matemática de Estatus
            let est = inc.estado || 'Monitoreo activo';
            if (est in estatusCounts) estatusCounts[est]++;

            if (inc.medio) networkCounts[inc.medio] = (networkCounts[inc.medio] || 0) + 1;
            if (inc.campus && inc.campus !== 'Sin especificar') uniqueCampus.add(inc.campus);
        });

        const topNetwork = Object.keys(networkCounts).sort((a,b) => networkCounts[b] - networkCounts[a])[0] || 'N/A';
        const criticidadRate = rrssIncidents.length > 0 ? Math.round((criticalRisk / rrssIncidents.length) * 100) : 0;

        return { 
            totalReportes: rrssIncidents.length, 
            totalIncidencias: totalIncidenciasSum, 
            campusAfectados: uniqueCampus.size, 
            criticalRisk, 
            topNetwork, 
            criticidadRate,
            riesgoCounts, // Agregado al return
            estatusCounts // Agregado al return
        };
    }, [rrssIncidents]);

    const commentsStats = useMemo(() => {
        let organic = 0, paid = 0, totalIndividuales = 0, neutral = 0, negativo = 0;
        const campusCounts: Record<string, number> = {};

        comments.forEach((com: any) => {
            if (com.contenido === 'Orgánico') organic++;
            if (com.contenido === 'Pautado') paid++;
            
            const cList = com.comentariosList || [];
            totalIndividuales += cList.length;
            
            cList.forEach((c: any) => {
                if (c.sentiment === 'Negativo') negativo++;
                else if (c.sentiment === 'Neutral') neutral++;
                const camp = c.campus && c.campus !== 'Sin especificar' ? c.campus : null;
                if (camp) campusCounts[camp] = (campusCounts[camp] || 0) + 1;
            });
        });

        const topCampus = Object.keys(campusCounts).sort((a,b) => campusCounts[b] - campusCounts[a])[0] || 'Ninguno';
        const totalSentiment = (negativo + neutral) || 1; 

        return { totalReportes: comments.length, totalIndividuales, organic, paid, negativo, neutral, totalSentiment, topCampus };
    }, [comments]);

    const ticketStats = useMemo(() => {
        let pendientes = 0, enProduccion = 0, resueltos = 0, criticos = 0;
        const plataformaCounts: Record<string, number> = {};
        const prioridadCounts: Record<string, number> = { '🟢 Baja': 0, '🟡 Media': 0, '🟠 Alta': 0, '🔴 Crítica': 0 };

        tickets.forEach((t: any) => {
            if (t.estado === 'Pendiente') pendientes++;
            else if (t.estado === 'En Producción' || t.estado === 'En Revisión') enProduccion++;
            else if (t.estado === 'Resuelto') resueltos++;

            if (t.prioridad && (t.prioridad.includes('Alta') || t.prioridad.includes('Crítica'))) criticos++;
            if (t.plataforma) plataformaCounts[t.plataforma] = (plataformaCounts[t.plataforma] || 0) + 1;
            if (t.prioridad && priorityKey(t.prioridad) in prioridadCounts) {
                prioridadCounts[priorityKey(t.prioridad)]++;
            }
        });

        function priorityKey(p: string) {
            if (p.includes('Baja')) return '🟢 Baja';
            if (p.includes('Media')) return '🟡 Media';
            if (p.includes('Alta')) return '🟠 Alta';
            if (p.includes('Crítica')) return '🔴 Crítica';
            return '🟢 Baja';
        }

        const topPlataforma = Object.keys(plataformaCounts).sort((a,b) => plataformaCounts[b] - plataformaCounts[a])[0] || 'Ninguna';
        const resolutionRate = tickets.length > 0 ? Math.round((resueltos / tickets.length) * 100) : 0;

        return { total: tickets.length, pendientes, enProduccion, resueltos, criticos, topPlataforma, resolutionRate, prioridadCounts };
    }, [tickets]);

    const handleDownloadReport = () => {
        if (activeTab === 'seguridad' && hackStats.total === 0) return showToast("No hay datos de Seguridad.", true);
        if (activeTab === 'rrss' && rrssStats.totalReportes === 0) return showToast("No hay datos de Reputación RRSS.", true);
        if (activeTab === 'comentarios' && commentsStats.totalReportes === 0) return showToast("No hay datos de Comentarios.", true);
        if (activeTab === 'tickets' && ticketStats.total === 0) return showToast("No hay datos de Tickets.", true);
        
        setIsExportingPDF(true);
        setTimeout(() => {
            window.print();
            setIsExportingPDF(false);
        }, 1500);
    };

    if (isLoading) {
        return (
            <div className="fade-in pb-20 space-y-8 animate-pulse">
                <div className="flex gap-2 mb-8 overflow-x-auto">
                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg flex-shrink-0"></div>
                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg flex-shrink-0"></div>
                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg flex-shrink-0"></div>
                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg flex-shrink-0"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="theme-bg-container border theme-border rounded-xl p-6 shadow-sm h-28 flex flex-col justify-between">
                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mt-2"></div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="h-64 theme-bg-container border theme-border rounded-xl shadow-sm p-6 flex flex-col gap-5">
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-4/5"></div>
                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                        </div>
                        <div className="h-32 theme-bg-container border theme-border rounded-xl shadow-sm"></div>
                    </div>
                    <div className="h-96 theme-bg-container border theme-border rounded-xl shadow-sm p-6 flex flex-col gap-4">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                        <div className="flex gap-4 items-center"><div className="w-10 h-10 rounded-lg bg-gray-300 dark:bg-gray-700"></div><div className="flex-1 space-y-2"><div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div><div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div></div></div>
                        <div className="flex gap-4 items-center mt-2"><div className="w-10 h-10 rounded-lg bg-gray-300 dark:bg-gray-700"></div><div className="flex-1 space-y-2"><div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-4/5"></div><div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div></div></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* 🔥 FIX PDF PRO: Usamos React Portals para sacar el PDF del MainLayout y evitar que el Sidebar aplaste el contenido. */}
            <style type="text/css">
                {`
                .print-portal-root { display: none; }
                @media print {
                    /* Ocultamos el root de la app completa */
                    #root { display: none !important; }
                    
                    /* Mostramos el portal flotante al 100% de ancho */
                    .print-portal-root { 
                        display: block !important; 
                        width: 100% !important; 
                        max-width: 100% !important;
                        color: black !important;
                    }
                    @page { size: A4 portrait; margin: 1cm; }
                    body { 
                        background-color: white !important; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .print-break-avoid {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
                `}
            </style>

            <div className="fade-in pb-20 relative dashboard-interactive-view">
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                    <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-black/5 dark:bg-white/5 border theme-border rounded-xl w-full md:w-fit shadow-inner overflow-x-auto">
                        {/* 🔥 MODIFICACIÓN 3: Botón de Comentarios reordenado al principio */}
                        <button type="button" onClick={() => setActiveTab('comentarios')} className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'comentarios' ? 'bg-[var(--surface)] shadow-md theme-text-main scale-100' : 'theme-text-muted hover:theme-text-main scale-95'}`}><MessageSquare className="w-4 h-4 text-blue-500" /> Comentarios</button>
                        
                        {!isEditorContent && (
                            <>
                                <button type="button" onClick={() => setActiveTab('seguridad')} className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'seguridad' ? 'bg-[var(--surface)] shadow-md theme-text-main scale-100' : 'theme-text-muted hover:theme-text-main scale-95'}`}><ShieldAlert className="w-4 h-4 text-red-500" /> Seguridad IT</button>
                                <button type="button" onClick={() => setActiveTab('rrss')} className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'rrss' ? 'bg-[var(--surface)] shadow-md theme-text-main scale-100' : 'theme-text-muted hover:theme-text-main scale-95'}`}><Megaphone className="w-4 h-4 text-orange-500" /> Reputación RRSS</button>
                            </>
                        )}
                        <button type="button" onClick={() => setActiveTab('tickets')} className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'tickets' ? 'bg-[var(--surface)] shadow-md theme-text-main scale-100' : 'theme-text-muted hover:theme-text-main scale-95'}`}><Ticket className="w-4 h-4 text-purple-500" /> Tickets</button>
                    </div>
                    <button type="button" onClick={handleDownloadReport} disabled={isExportingPDF} className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[var(--primary)] text-white hover:brightness-110 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />} 
                        {isExportingPDF ? 'Generando PDF...' : 'Descargar PDF'}
                    </button>
                </div>

                <div className="space-y-6">
                    {/* TRACTO: SEGURIDAD Y ACCESOS */}
                    {activeTab === 'seguridad' && !isEditorContent && (
                        <div className="fade-in space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard title="Total Incidentes" value={hackStats.total} color="blue" icon={<Activity className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="Activos (En Proceso)" value={hackStats.open} color="orange" icon={<AlertTriangle className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="Mitigados (Cerrados)" value={hackStats.resolved} color="emerald" icon={<CheckCircle2 className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="Riesgo Alto / Crítico" value={hackStats.critical} color="red" icon={<ShieldAlert className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm">
                                            <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500"/> Top 3 Vectores de Ataque</h4>
                                            <div className="space-y-3">
                                                {hackStats.topVectors.length > 0 ? hackStats.topVectors.map((vec) => (
                                                    <div key={vec.name}>
                                                        <div className="flex justify-between text-xs mb-1"><span className="font-bold theme-text-main truncate pr-2">{vec.name}</span><span className="theme-text-muted">{vec.percent}%</span></div>
                                                        <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${vec.percent}%` : '0%' }}></div></div>
                                                    </div>
                                                )) : <p className="text-xs theme-text-muted italic">No hay datos suficientes.</p>}
                                            </div>
                                        </div>
                                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm flex flex-col justify-center items-center text-center gap-2">
                                            <div className="p-4 bg-red-500/10 text-red-500 rounded-full mb-2"><ShieldAlert className="w-8 h-8"/></div>
                                            <p className="text-xs font-bold theme-text-muted uppercase tracking-wider">Plataforma más Vulnerable</p>
                                            <p className="text-2xl font-black theme-text-main truncate max-w-full px-4">{hackStats.topPlatform}</p>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-3 ml-1">Acciones Rápidas</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            <ActionBtn onClick={() => navigate('nuevo')} icon={isAdmin ? <ShieldAlert className="w-5 h-5 text-red-500"/> : <Lock className="w-5 h-5 text-gray-400"/>} title="Reportar Incidente" desc={isAdmin ? "Protocolo de emergencia." : "Solo Administrador."} bgIcon={isAdmin ? "bg-red-500/10" : "bg-gray-500/10"} />
                                            <ActionBtn onClick={() => navigate('checklist')} icon={isAdmin ? <ListChecks className="w-5 h-5 text-emerald-500"/> : <Lock className="w-5 h-5 text-gray-400"/>} title="Checklist Rápido" desc={isAdmin ? "Verifica pasos urgentes." : "Solo Administrador."} bgIcon={isAdmin ? "bg-emerald-500/10" : "bg-gray-500/10"} />
                                            <ActionBtn onClick={() => navigate('historial')} icon={<Clock className="w-5 h-5 text-slate-400"/>} title="Historial" desc="Casos documentados." bgIcon="bg-slate-500/10" />
                                            <ActionBtn onClick={() => navigate('protocolo')} icon={<BookOpen className="w-5 h-5 text-blue-500"/>} title="Protocolo IT" desc="Guía de contención." bgIcon="bg-blue-500/10" />
                                            <ActionBtn onClick={() => navigate('roles')} icon={<Users className="w-5 h-5 text-purple-500"/>} title="Matriz de Roles" desc="A quién notificar." bgIcon="bg-purple-500/10" />
                                            <ActionBtn onClick={() => navigate('glosario')} icon={<BookOpen className="w-5 h-5 text-orange-500"/>} title="Glosario Ciber" desc="Conceptos técnicos." bgIcon="bg-orange-500/10" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col h-full">
                                    <h3 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-3 ml-1 flex items-center gap-2"><Clock className="w-4 h-4"/> Actividad Reciente</h3>
                                    <div className="theme-bg-container theme-border border rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col p-2 min-h-[16rem]">
                                        {incidents.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                                <ShieldAlert className="w-8 h-8 theme-text-muted opacity-30 mb-3" />
                                                <p className="theme-text-muted text-sm">Sin incidentes registrados.</p>
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto space-y-2">
                                                {incidents.slice(0, 5).map((inc: any) => (
                                                    <button type="button" key={inc.id} onClick={() => { setSelectedHackeo(inc); setDetailModalOpen(true); }} className="w-full text-left p-3 theme-bg-low rounded-xl hover:border-red-500 border border-transparent transition-colors cursor-pointer group">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-sm font-bold theme-text-main truncate group-hover:text-red-500 transition-colors">{inc.plataforma}</p>
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${inc.estado === 'Resuelto' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>{inc.estado}</span>
                                                        </div>
                                                        <p className="text-xs theme-text-muted truncate">{new Date(inc.fecha).toLocaleDateString()} - {inc.vector}</p>
                                                    </button>
                                                ))}
                                                <button type="button" onClick={() => navigate('historial')} className="w-full mt-2 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">Ver historial completo</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRACTO: REPUTACIÓN RRSS */}
                    {activeTab === 'rrss' && !isEditorContent && (
                        <div className="fade-in space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard title="Reportes Creados" value={rrssStats.totalReportes} color="blue" icon={<FileText className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="Total Incidencias" value={rrssStats.totalIncidencias} color="orange" icon={<Activity className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="Campus Afectados" value={rrssStats.campusAfectados} color="purple" icon={<MapPin className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="Crítico (Peligro Inminente)" value={rrssStats.criticalRisk} color="red" icon={<AlertTriangle className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-1">Índice de Criticidad</p>
                                                <div className="flex items-end gap-2"><span className="text-3xl font-black text-red-500">{rrssStats.criticidadRate}%</span><span className="text-xs font-medium theme-text-muted mb-1.5">nivel crítico</span></div>
                                            </div>
                                            <div className="relative w-20 h-20 flex-shrink-0">
                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-gray-200 dark:text-gray-800" />
                                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="12" strokeLinecap="round" className="text-red-500 transition-all duration-1000 ease-out" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={mounted ? (2 * Math.PI * 40) * (1 - rrssStats.criticidadRate / 100) : 2 * Math.PI * 40} />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"><Megaphone className="w-6 h-6"/></div>
                                            <div><p className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-0.5">Canal más Crítico</p><p className="text-xl font-bold theme-text-main truncate">{rrssStats.topNetwork}</p></div>
                                        </div>
                                    </div>

                                    {/* 🔥 MODIFICACIÓN 4: Inyección de la UI de Semáforos Gemelos en RRSS con los colores mapeados */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm">
                                            <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-red-500"/> Semáforo de Riesgo</h4>
                                            <div className="space-y-2.5">
                                                {Object.entries(rrssStats.riesgoCounts).map(([name, count]) => {
                                                    const percent = rrssStats.totalReportes ? Math.round((Number(count) / rrssStats.totalReportes) * 100) : 0;
                                                    // Mapeo exacto: Bajo=Verde, Medio=Amarillo, Alto=Naranja, Critico=Rojo
                                                    const barColor = name === 'Crítico' ? 'bg-red-500' : name === 'Alto' ? 'bg-orange-500' : name === 'Medio' ? 'bg-yellow-500' : 'bg-emerald-500';
                                                    return (
                                                        <div key={name}>
                                                            <div className="flex justify-between text-xs mb-1"><span className="font-bold theme-text-main pr-2">{name}</span><span className="theme-text-muted">{Number(count)} ({percent}%)</span></div>
                                                            <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`} style={{ width: mounted ? `${percent}%` : '0%' }}></div></div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm">
                                            <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500"/> Semáforo de Estatus</h4>
                                            <div className="space-y-2.5">
                                                {Object.entries(rrssStats.estatusCounts).map(([name, count]) => {
                                                    const percent = rrssStats.totalReportes ? Math.round((Number(count) / rrssStats.totalReportes) * 100) : 0;
                                                    // Mapeo exacto: Monitoreo activo=Rojo, En revisión=Amarillo, Seguimiento activo=Naranja, Resuelto=Verde
                                                    const barColor = name === 'Monitoreo activo' ? 'bg-red-500' 
                                                                   : name === 'En revisión' ? 'bg-yellow-500' 
                                                                   : name === 'Seguimiento activo' ? 'bg-orange-500' 
                                                                   : name === 'Resuelto / solucionado' ? 'bg-emerald-500' 
                                                                   : 'bg-slate-400';
                                                    return (
                                                        <div key={name}>
                                                            <div className="flex justify-between text-xs mb-1"><span className="font-bold theme-text-main pr-2 truncate">{name}</span><span className="theme-text-muted flex-shrink-0">{Number(count)} ({percent}%)</span></div>
                                                            <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`} style={{ width: mounted ? `${percent}%` : '0%' }}></div></div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-3 ml-1">Acciones Rápidas</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <ActionBtn onClick={() => navigate('nuevo-rss')} icon={isAdmin ? <Megaphone className="w-5 h-5 text-orange-500"/> : <Lock className="w-5 h-5 text-gray-400"/>} title="Registrar Crisis" desc={isAdmin ? "Abre un nuevo caso RRSS." : "Solo Administrador."} bgIcon={isAdmin ? "bg-orange-500/10" : "bg-gray-500/10"} />
                                            <ActionBtn onClick={() => navigate('historial-rss')} icon={<Clock className="w-5 h-5 text-blue-500"/>} title="Historial RRSS" desc="Casos de reputación pasados." bgIcon="bg-blue-500/10" />
                                            <ActionBtn onClick={() => navigate('protocolo-rss')} icon={<BookOpen className="w-5 h-5 text-purple-500"/>} title="Protocolo Oficial" desc="Estrategia de atención." bgIcon="bg-purple-500/10" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col h-full">
                                    <h3 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-3 ml-1 flex items-center gap-2"><Clock className="w-4 h-4"/> Actividad Reciente</h3>
                                    <div className="theme-bg-container theme-border border rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col p-2 min-h-[16rem]">
                                        {rrssIncidents.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center"><Megaphone className="w-8 h-8 theme-text-muted opacity-30 mb-3" /><p className="theme-text-muted text-sm">Sin casos de crisis recientes.</p></div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto space-y-2">
                                                {rrssIncidents.slice(0, 5).map((inc: any) => (
                                                    <button type="button" key={inc.id} onClick={() => setPreviewModal({isOpen: true, type: 'rrss', data: inc})} className="w-full text-left p-3 theme-bg-low rounded-xl hover:border-orange-500 border border-transparent transition-colors cursor-pointer group">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-sm font-bold theme-text-main truncate group-hover:text-orange-500 transition-colors">{inc.redSocial}</p>
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${inc.riesgo === 'Crítico' || inc.riesgo === 'Critico' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>{inc.riesgo}</span>
                                                        </div>
                                                        <p className="text-xs theme-text-muted truncate">{inc.totalIncidencias} Incidencias • {new Date(inc.fecha).toLocaleDateString()}</p>
                                                    </button>
                                                ))}
                                                <button type="button" onClick={() => navigate('historial-rss')} className="w-full mt-2 py-2 text-xs font-bold text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors">Ver historial completo</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRACTO: COMENTARIOS */}
                    {activeTab === 'comentarios' && (
                        <div className="fade-in space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard title="Reportes Creados" value={commentsStats.totalReportes} color="purple" icon={<FileText className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="Total Comentarios" value={commentsStats.totalIndividuales} color="blue" icon={<MessageSquare className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="Contenido Orgánico" value={commentsStats.organic} color="emerald" icon={<Activity className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="Contenido Pautado" value={commentsStats.paid} color="orange" icon={<Activity className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm">
                                            <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-purple-500"/> Análisis de Sentimiento</h4>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex flex-col"><span className="text-2xl font-black text-red-500 leading-none">{commentsStats.negativo}</span><span className="text-[10px] font-bold theme-text-muted uppercase">Negativos</span></div>
                                                <div className="flex flex-col text-right"><span className="text-2xl font-black text-slate-500 leading-none">{commentsStats.neutral}</span><span className="text-[10px] font-bold theme-text-muted uppercase">Neutrales</span></div>
                                            </div>
                                            <div className="h-4 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                                                <div className="h-full bg-red-500 transition-all duration-1000 ease-out" style={{ width: mounted ? `${(commentsStats.negativo / commentsStats.totalSentiment) * 100}%` : '0%' }}></div>
                                                <div className="h-full bg-slate-400 dark:bg-slate-500 transition-all duration-1000 ease-out delay-300" style={{ width: mounted ? `${(commentsStats.neutral / commentsStats.totalSentiment) * 100}%` : '0%' }}></div>
                                            </div>
                                        </div>
                                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><MapPin className="w-6 h-6"/></div>
                                            <div><p className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-0.5">Campus con más Alertas</p><p className="text-xl font-bold theme-text-main truncate">{commentsStats.topCampus}</p></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-3 ml-1">Acciones Rápidas</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <ActionBtn onClick={() => navigate('nuevo-comentario')} icon={isAdmin ? <MessageSquare className="w-5 h-5 text-blue-500"/> : <Lock className="w-5 h-5 text-gray-400"/>} title="Capturar Comentarios" desc={isAdmin ? "Crea un registro de mensajes." : "Solo Administrador."} bgIcon={isAdmin ? "bg-blue-500/10" : "bg-gray-500/10"} />
                                            <ActionBtn onClick={() => navigate('historial-comentario')} icon={<Clock className="w-5 h-5 text-slate-500"/>} title="Historial Comentarios" desc="Consulta registros anteriores." bgIcon="bg-slate-500/10" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col h-full">
                                    <h3 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-3 ml-1 flex items-center gap-2"><Clock className="w-4 h-4"/> Actividad Reciente</h3>
                                    <div className="theme-bg-container theme-border border rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col p-2 min-h-[16rem]">
                                        {comments.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center"><MessageSquare className="w-8 h-8 theme-text-muted opacity-30 mb-3" /><p className="theme-text-muted text-sm">Sin reportes de comentarios.</p></div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto space-y-2">
                                                {comments.slice(0, 5).map((com: any) => (
                                                    <button type="button" key={com.id} onClick={() => setPreviewModal({isOpen: true, type: 'comment', data: com})} className="w-full text-left p-3 theme-bg-low rounded-xl hover:border-blue-500 border border-transparent transition-colors cursor-pointer group">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-sm font-bold theme-text-main truncate group-hover:text-blue-500 transition-colors">Reporte del {com.fechaInicio}</p>
                                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{com.contenido}</span>
                                                        </div>
                                                        <p className="text-xs theme-text-muted truncate">Finaliza: {com.fechaFin}</p>
                                                    </button>
                                                ))}
                                                <button type="button" onClick={() => navigate('historial-comentario')} className="w-full mt-2 py-2 text-xs font-bold text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors">Ver historial completo</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRACTO: EMERGENTES (TICKETS) */}
                    {activeTab === 'tickets' && (
                        <div className="fade-in space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard title="Total Solicitudes" value={ticketStats.total} color="purple" icon={<Ticket className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="En Cola (Pendientes)" value={ticketStats.pendientes} color="orange" icon={<Clock className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="En Producción / Rev." value={ticketStats.enProduccion} color="blue" icon={<Activity className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                                <StatCard title="Resueltos / Listos" value={ticketStats.resueltos} color="emerald" icon={<CheckCircle2 className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2"/>}/>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm">
                                            <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-500"/> Semáforo de Prioridades</h4>
                                            <div className="space-y-2.5">
                                                {Object.entries(ticketStats.prioridadCounts).map(([name, count]) => {
                                                    const percent = ticketStats.total ? Math.round((count / ticketStats.total) * 100) : 0;
                                                    const barColor = name.includes('Crítica') ? 'bg-red-500' : name.includes('Alta') ? 'bg-orange-500' : name.includes('Media') ? 'bg-yellow-500' : 'bg-emerald-500';
                                                    return (
                                                        <div key={name}>
                                                            <div className="flex justify-between text-xs mb-1"><span className="font-bold theme-text-main pr-2">{name}</span><span className="theme-text-muted">{count} ({percent}%)</span></div>
                                                            <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden"><div className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`} style={{ width: mounted ? `${percent}%` : '0%' }}></div></div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm flex flex-col justify-center items-center text-center gap-2">
                                            <div className="p-4 bg-purple-500/10 text-purple-500 rounded-full mb-2"><Ticket className="w-8 h-8"/></div>
                                            <p className="text-xs font-bold theme-text-muted uppercase tracking-wider">Canal más Solicitado</p>
                                            <p className="text-2xl font-black theme-text-main truncate max-w-full px-4">{ticketStats.topPlataforma}</p>
                                            <span className="text-[11px] font-bold px-2 py-0.5 bg-purple-500/10 text-purple-500 rounded-md mt-1">{ticketStats.resolutionRate}% índice de entrega</span>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-3 ml-1">Acciones Rápidas</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {!user ? (
                                                <ActionBtn onClick={() => navigate('solicitud-tickets')} icon={<Send className="w-5 h-5 text-purple-500"/>} title="Solicitar Ticket" desc="Formulario para ENGIE." bgIcon="bg-purple-500/10" />
                                            ) : (
                                                <ActionBtn onClick={() => navigate('gestion-tickets')} icon={<FileText className="w-5 h-5 text-purple-500"/>} title="Gestionar Tickets" desc="Tablero Kanban y tiempos real." bgIcon="bg-purple-500/10" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col h-full">
                                    <h3 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-3 ml-1 flex items-center gap-2"><Clock className="w-4 h-4"/> Actividad Reciente</h3>
                                    <div className="theme-bg-container theme-border border rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col p-2 min-h-[16rem]">
                                        {tickets.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                                <Ticket className="w-8 h-8 theme-text-muted opacity-30 mb-3" />
                                                <p className="theme-text-muted text-sm">Sin tickets registrados.</p>
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto space-y-2">
                                                {tickets.slice(0, 5).map((t: any) => (
                                                    <button type="button" key={t.id} onClick={() => setPreviewModal({isOpen: true, type: 'ticket', data: t})} className="w-full text-left p-3 theme-bg-low rounded-xl hover:border-purple-500 border border-transparent transition-colors cursor-pointer group">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-sm font-bold theme-text-main truncate group-hover:text-purple-500 transition-colors">{t.tema}</p>
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${t.estado === 'Resuelto' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-600'}`}>{t.estado}</span>
                                                        </div>
                                                        <p className="text-xs theme-text-muted truncate">{t.prioridad} • {t.plataforma} • Límite: {t.fechaLimite}</p>
                                                    </button>
                                                ))}
                                                <button type="button" onClick={() => navigate(user ? 'gestion-tickets' : 'solicitud-tickets')} className="w-full mt-2 py-2 text-xs font-bold text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors">
                                                    {user ? 'Abrir consola de gestión' : 'Ver formulario de emisión'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {previewModal.isOpen && previewModal.data && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 fade-in">
                        <div className="theme-bg-container rounded-2xl w-full max-w-md shadow-2xl border theme-border flex flex-col">
                            <div className={`p-4 border-b theme-border flex justify-between items-center ${previewModal.type === 'rrss' ? 'bg-orange-500/5' : previewModal.type === 'ticket' ? 'bg-purple-500/5' : 'bg-blue-500/5'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${previewModal.type === 'rrss' ? 'bg-orange-500/20 text-orange-500' : previewModal.type === 'ticket' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                        {previewModal.type === 'rrss' ? <Megaphone className="w-5 h-5"/> : previewModal.type === 'ticket' ? <Ticket className="w-5 h-5"/> : <MessageSquare className="w-5 h-5"/>}
                                    </div>
                                    <div><h3 className="font-bold theme-text-main">Vista Rápida</h3><p className="text-[10px] theme-text-muted font-medium uppercase tracking-wider">{previewModal.type === 'rrss' ? 'Crisis RRSS' : previewModal.type === 'ticket' ? 'Solicitud Ticket' : 'Comentarios'}</p></div>
                                </div>
                                <button type="button" onClick={() => setPreviewModal({isOpen: false, type: '', data: null})} className="p-1.5 theme-text-muted hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
                            </div>
                            <div className="p-5 space-y-4">
                                {previewModal.type === 'rrss' ? (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <div><p className="text-xs theme-text-muted font-bold mb-1">Medio Afectado</p><p className="text-lg font-bold theme-text-main text-orange-500">{previewModal.data.medio}</p></div>
                                            <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${previewModal.data.riesgo === 'Crítico' || previewModal.data.riesgo === 'Critico' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>{previewModal.data.riesgo}</span>
                                        </div>
                                        <div className="p-3 theme-bg-low rounded-xl border theme-border"><p className="text-sm theme-text-main font-medium"><span className="font-bold">{previewModal.data.usuario}:</span> {previewModal.data.descripcion}</p></div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><span className="text-xs theme-text-muted block mb-0.5">Total Incidencias</span><span className="font-bold theme-text-main">{previewModal.data.totalIncidencias}</span></div>
                                            <div><span className="text-xs theme-text-muted block mb-0.5">Campus</span><span className="font-bold theme-text-main">{previewModal.data.campus}</span></div>
                                        </div>
                                    </>
                                ) : previewModal.type === 'ticket' ? (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <div><p className="text-xs theme-text-muted font-bold mb-1">Plataforma</p><p className="text-lg font-bold theme-text-main text-purple-500">{previewModal.data.plataforma}</p></div>
                                            <span className="px-2 py-1 text-[10px] font-bold rounded-md uppercase bg-purple-500/10 text-purple-500">{previewModal.data.estado}</span>
                                        </div>
                                        <div className="p-3 theme-bg-low rounded-xl border theme-border"><p className="text-sm theme-text-main font-medium"><span className="font-bold">{previewModal.data.tema}:</span> {previewModal.data.mensaje}</p></div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><span className="text-xs theme-text-muted block mb-0.5">Prioridad</span><span className="font-bold theme-text-main">{previewModal.data.prioridad}</span></div>
                                            <div><span className="text-xs theme-text-muted block mb-0.5">Fecha Límite</span><span className="font-bold theme-text-main">{previewModal.data.fechaLimite || 'No definida'}</span></div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <div><p className="text-xs theme-text-muted font-bold mb-1">Periodo del Reporte</p><p className="text-base font-bold theme-text-main text-blue-500">{previewModal.data.fechaInicio} <span className="text-sm font-medium theme-text-muted">al</span> {previewModal.data.fechaFin}</p></div>
                                            <span className="px-2 py-1 text-[10px] font-bold rounded-md uppercase bg-blue-500/10 text-blue-500">{previewModal.data.contenido}</span>
                                        </div>
                                        <div className="p-3 theme-bg-low rounded-xl border theme-border"><p className="text-sm theme-text-main font-medium">Contiene <span className="font-bold text-blue-500">{previewModal.data.comentariosList?.length || 1}</span> comentario(s) registrado(s).</p></div>
                                    </>
                                )}
                            </div>
                            <div className="p-4 border-t theme-border flex gap-3">
                                <button type="button" onClick={() => { setPreviewModal({isOpen: false, type: '', data: null}); navigate(previewModal.type === 'rrss' ? 'historial-rss' : previewModal.type === 'ticket' ? (user ? 'gestion-tickets' : 'solicitud-tickets') : 'historial-comentario'); }} className={`w-full py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 ${previewModal.type === 'rrss' ? 'bg-orange-600' : previewModal.type === 'ticket' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                                    {previewModal.type === 'ticket' ? (user ? 'Ir a Consola de Gestión' : 'Formulario de Emisión') : 'Ver historial completo'} <ChevronRight className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 🔥 FIX PDF PRO: El reporte se dibuja directo en el body al dar clic en Exportar */}
            {isExportingPDF && ReactDOM.createPortal(
                <div className="print-portal-root">
                    <div className="p-8 w-full max-w-5xl mx-auto text-black">
                        <div className="border-b-2 border-gray-800 pb-4 mb-8">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">ENGIE MANAGEMENT</h1>
                            <h2 className="text-xl font-bold text-gray-600 mt-1 uppercase">Reporte Ejecutivo - {activeTab === 'seguridad' ? 'Seguridad y Accesos' : activeTab === 'rrss' ? 'Reputación RRSS' : activeTab === 'tickets' ? 'Solicitudes Emergentes (Tickets)' : 'Comentarios'}</h2>
                            <p className="text-sm text-gray-500 mt-2 font-medium">Generado el: {new Date().toLocaleDateString()} a las {new Date().toLocaleTimeString()}</p>
                        </div>

                        {activeTab === 'seguridad' && (
                            <div>
                                <div className="grid grid-cols-4 gap-4 mb-8">
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Total Incidentes</p><p className="text-2xl font-black text-gray-900">{hackStats.total}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Activos (En Proceso)</p><p className="text-2xl font-black text-gray-900">{hackStats.open}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Mitigados (Cerrados)</p><p className="text-2xl font-black text-gray-900">{hackStats.resolved}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Riesgo Alto / Crítico</p><p className="text-2xl font-black text-gray-900">{hackStats.critical}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="border border-gray-300 p-6 rounded-lg print-break-avoid">
                                        <h3 className="text-sm font-bold text-gray-800 uppercase border-b border-gray-200 pb-2 mb-4">Top 3 Vectores de Ataque</h3>
                                        {hackStats.topVectors.map((v, i) => (<div key={i} className="flex justify-between items-center mb-3 text-sm"><span className="font-bold text-gray-700">{v.name}</span><span className="text-gray-500 font-medium">{v.percent}% ({v.count} casos)</span></div>))}
                                    </div>
                                    <div className="border border-gray-300 p-6 rounded-lg text-center flex flex-col justify-center print-break-avoid">
                                        <h3 className="text-sm font-bold text-gray-800 uppercase mb-2">Plataforma más Vulnerable</h3><p className="text-2xl font-black text-gray-900">{hackStats.topPlatform}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'rrss' && (
                            <div>
                                <div className="grid grid-cols-4 gap-4 mb-8">
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Reportes Creados</p><p className="text-2xl font-black text-gray-900">{rrssStats.totalReportes}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Total Incidencias</p><p className="text-2xl font-black text-gray-900">{rrssStats.totalIncidencias}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Campus Afectados</p><p className="text-2xl font-black text-gray-900">{rrssStats.campusAfectados}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Peligro Inminente</p><p className="text-2xl font-black text-gray-900">{rrssStats.criticalRisk}</p></div>
                                </div>

                                {/* 🔥 MODIFICACIÓN 5: Inyección de Semáforos en la Exportación PDF */}
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div className="border border-gray-300 p-6 rounded-lg print-break-avoid">
                                        <h3 className="text-sm font-bold text-gray-800 uppercase border-b border-gray-200 pb-2 mb-4">Semáforo de Riesgo</h3>
                                        {Object.entries(rrssStats.riesgoCounts).map(([name, count], i) => (<div key={i} className="flex justify-between items-center mb-3 text-sm"><span className="font-bold text-gray-700">{name}</span><span className="text-gray-500 font-medium">{Number(count)} incidencias</span></div>))}
                                    </div>
                                    <div className="border border-gray-300 p-6 rounded-lg print-break-avoid">
                                        <h3 className="text-sm font-bold text-gray-800 uppercase border-b border-gray-200 pb-2 mb-4">Semáforo de Estatus</h3>
                                        {Object.entries(rrssStats.estatusCounts).map(([name, count], i) => (<div key={i} className="flex justify-between items-center mb-3 text-sm"><span className="font-bold text-gray-700">{name}</span><span className="text-gray-500 font-medium">{Number(count)} incidencias</span></div>))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="border border-gray-300 p-6 rounded-lg text-center flex flex-col justify-center print-break-avoid"><h3 className="text-sm font-bold text-gray-800 uppercase mb-2">Índice de Criticidad</h3><p className="text-4xl font-black text-red-600">{rrssStats.criticidadRate}%</p></div>
                                    <div className="border border-gray-300 p-6 rounded-lg text-center flex flex-col justify-center print-break-avoid"><h3 className="text-sm font-bold text-gray-800 uppercase mb-2">Canal más Crítico</h3><p className="text-2xl font-black text-gray-900">{rrssStats.topNetwork}</p></div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'comentarios' && (
                            <div>
                                <div className="grid grid-cols-4 gap-4 mb-8">
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Total Reportes</p><p className="text-2xl font-black text-gray-900">{commentsStats.totalReportes}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Comentarios Indv.</p><p className="text-2xl font-black text-gray-900">{commentsStats.totalIndividuales}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Orgánico</p><p className="text-2xl font-black text-gray-900">{commentsStats.organic}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Pautado</p><p className="text-2xl font-black text-gray-900">{commentsStats.paid}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="border border-gray-300 p-6 rounded-lg print-break-avoid">
                                        <h3 className="text-sm font-bold text-gray-800 uppercase border-b border-gray-200 pb-2 mb-4">Análisis de Sentimiento</h3>
                                        <div className="flex justify-between items-center text-sm"><span className="font-bold text-gray-700">Comentarios Negativos</span><span className="text-gray-900 font-black text-lg">{commentsStats.negativo}</span></div>
                                        <div className="flex justify-between items-center mt-2 text-sm"><span className="font-bold text-gray-700">Comentarios Neutrales</span><span className="text-gray-900 font-black text-lg">{commentsStats.neutral}</span></div>
                                    </div>
                                    <div className="border border-gray-300 p-6 rounded-lg text-center flex flex-col justify-center print-break-avoid"><h3 className="text-sm font-bold text-gray-800 uppercase mb-2">Campus con más Alertas</h3><p className="text-2xl font-black text-gray-900">{commentsStats.topCampus}</p></div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'tickets' && (
                            <div>
                                <div className="grid grid-cols-4 gap-4 mb-8">
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Total Solicitudes</p><p className="text-2xl font-black text-gray-900">{ticketStats.total}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Pendientes</p><p className="text-2xl font-black text-gray-900">{ticketStats.pendientes}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">En Producción</p><p className="text-2xl font-black text-gray-900">{ticketStats.enProduccion}</p></div>
                                    <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-center print-break-avoid"><p className="text-[10px] font-bold text-gray-500 uppercase">Resueltos</p><p className="text-2xl font-black text-gray-900">{ticketStats.resueltos}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="border border-gray-300 p-6 rounded-lg print-break-avoid">
                                        <h3 className="text-sm font-bold text-gray-800 uppercase border-b border-gray-200 pb-2 mb-4">Semáforo de Prioridades</h3>
                                        {Object.entries(ticketStats.prioridadCounts).map(([name, count], i) => (<div key={i} className="flex justify-between items-center mb-3 text-sm"><span className="font-bold text-gray-700">{name}</span><span className="text-gray-500 font-medium">{count as number} solicitudes ({ticketStats.total ? Math.round((Number(count) / ticketStats.total) * 100) : 0}%)</span></div>))}
                                    </div>
                                    <div className="border border-gray-300 p-6 rounded-lg text-center flex flex-col justify-center print-break-avoid"><h3 className="text-sm font-bold text-gray-800 uppercase mb-2">Canal más Solicitado</h3><p className="text-2xl font-black text-gray-900">{ticketStats.topPlataforma}</p></div>
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-12 text-center text-[10px] text-gray-400 font-medium">DOCUMENTO DE USO INTERNO - CONFIDENCIAL</div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};