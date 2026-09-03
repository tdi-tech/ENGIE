import React, { useMemo, useState, useEffect } from 'react';
import { Clock, Activity, AlertTriangle, Megaphone, MessageSquare, TrendingUp, MapPin, Download, Loader2 } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId, auth, IS_MOCK, ALLOWED_EMAIL_DOMAIN_MAIL } from '../../../services/firebase/config';
import { StatCard } from '../../../shared/components/UIComponents';
import { normalizeIncidencia, riesgoValue } from '../../../shared/utils/incidencias';

// ── Panel de control ENGIE: Menciones + Incidencias ───────────────────────
export const DashboardView = ({ showToast, user }: any) => {
    const [rrssIncidents, setRrssIncidents] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [activeTab, setActiveTab] = useState('menciones');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (IS_MOCK) { setActiveTab('menciones'); setIsLoading(false); return; }
        setIsLoading(true);

        const u = auth.currentUser;
        if (u && !u.isAnonymous && u.email && !u.email.endsWith('@' + ALLOWED_EMAIL_DOMAIN_MAIL)) {
            setIsLoading(false);
            return;
        }

        const unsub1 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'rrss_incidents'), snap => {
            const arr: any[] = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
            setRrssIncidents(arr.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        }, () => {});

        const unsub2 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'comments'), snap => {
            const arr: any[] = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
            setComments(arr.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }, () => {});

        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => { unsub1(); unsub2(); clearTimeout(timer); };
    }, [user]);

    useEffect(() => {
        setMounted(false);
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, [activeTab]);

    const rrssStats = useMemo(() => {
        let totalIncidenciasSum = 0, criticalRisk = 0;
        const networkCounts: Record<string, number> = {};
        const uniqueCampus = new Set<string>();
        const riesgoCounts: Record<string, number> = { 'Bajo': 0, 'Medio': 0, 'Alto': 0, 'Crítico': 0 };
        const estatusCounts: Record<string, number> = { 'Monitoreo activo': 0, 'En revisión': 0, 'Seguimiento activo': 0, 'Resuelto / solucionado': 0 };

        rrssIncidents.forEach((inc: any) => {
            const n = normalizeIncidencia(inc);
            totalIncidenciasSum += (Number(n.totalIncidencias) || 0);
            let r = n.nivelRiesgo ? riesgoValue(n.nivelRiesgo) : 'Bajo';
            if (r === 'Crítico') criticalRisk++;
            if (r in riesgoCounts) riesgoCounts[r]++;
            let est = n.estado || 'Monitoreo activo';
            if (est in estatusCounts) estatusCounts[est]++;
            if (n.fuenteDeteccion && n.fuenteDeteccion !== 'N/A') networkCounts[n.fuenteDeteccion] = (networkCounts[n.fuenteDeteccion] || 0) + 1;
            if (n.campus && n.campus !== 'Sin especificar') uniqueCampus.add(n.campus);
        });

        const topNetwork = Object.keys(networkCounts).sort((a, b) => networkCounts[b] - networkCounts[a])[0] || 'N/A';
        const criticidadRate = rrssIncidents.length > 0 ? Math.round((criticalRisk / rrssIncidents.length) * 100) : 0;

        return { totalReportes: rrssIncidents.length, totalIncidencias: totalIncidenciasSum, campusAfectados: uniqueCampus.size, criticalRisk, topNetwork, criticidadRate, riesgoCounts, estatusCounts };
    }, [rrssIncidents]);

    const commentsStats = useMemo(() => {
        let organic = 0, paid = 0, totalIndividuales = 0, neutral = 0, negativo = 0;
        const campusCounts: Record<string, number> = {};

        comments.forEach((com: any) => {
            if (com.fuenteMonitoreo === 'Redes sociales') organic++;
            if (com.fuenteMonitoreo === 'Medios digitales') paid++;
            const cList = com.comentariosList || [];
            totalIndividuales += cList.length;
            cList.forEach((c: any) => {
                if (c.sentiment === 'Negativo') negativo++;
                else if (c.sentiment === 'Neutral') neutral++;
                const camp = c.campus && c.campus !== 'Sin especificar' ? c.campus : null;
                if (camp) campusCounts[camp] = (campusCounts[camp] || 0) + 1;
            });
        });

        const topCampus = Object.keys(campusCounts).sort((a, b) => campusCounts[b] - campusCounts[a])[0] || 'Ninguno';
        return { totalReportes: comments.length, totalIndividuales, organic, paid, negativo, neutral, topCampus };
    }, [comments]);

    const handleDownloadReport = () => {
        if (activeTab === 'incidencias' && rrssStats.totalReportes === 0) return showToast('No hay datos de Incidencias.', true);
        if (activeTab === 'menciones' && commentsStats.totalReportes === 0) return showToast('No hay datos de Menciones.', true);
        setIsExportingPDF(true);
        setTimeout(() => { window.print(); setIsExportingPDF(false); }, 1500);
    };

    if (isLoading) {
        return (
            <div className="fade-in pb-20 space-y-8 animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="theme-bg-container border theme-border rounded-xl p-6 shadow-sm h-28 flex flex-col justify-between">
                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mt-2"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
return (
        <div className="fade-in pb-20 relative">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-black/5 dark:bg-white/5 border theme-border rounded-xl w-full md:w-fit shadow-inner overflow-x-auto">
                    <button type="button" onClick={() => setActiveTab('menciones')} className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'menciones' ? 'bg-[var(--surface)] shadow-md theme-text-main scale-100' : 'theme-text-muted hover:theme-text-main scale-95'}`}><MessageSquare className="w-4 h-4 text-blue-500" /> Menciones</button>
                    <button type="button" onClick={() => setActiveTab('incidencias')} className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'incidencias' ? 'bg-[var(--surface)] shadow-md theme-text-main scale-100' : 'theme-text-muted hover:theme-text-main scale-95'}`}><Megaphone className="w-4 h-4 text-orange-500" /> Incidencias</button>
                </div>
                <button type="button" onClick={handleDownloadReport} disabled={isExportingPDF} className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[var(--primary)] text-white hover:brightness-110 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isExportingPDF ? 'Generando PDF...' : 'Descargar PDF'}
                </button>
            </div>

            <div className="space-y-6">
                {activeTab === 'menciones' && (
                    <div className="fade-in space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard title="Reportes de Menciones" value={commentsStats.totalReportes} color="blue" icon={<MessageSquare className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Menciones Individuales" value={commentsStats.totalIndividuales} color="purple" icon={<MessageSquare className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Negativas" value={commentsStats.negativo} color="red" icon={<TrendingUp className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Orgánico / Pautado" value={`${commentsStats.organic} / ${commentsStats.paid}`} color="emerald" icon={<Activity className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                {comments.slice(0, 5).map((com: any) => (
                                    <div key={com.id} className="theme-bg-container border theme-border rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-sm font-bold theme-text-main">Publicación: {com.fechaPublicacion}</p>
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{com.fuenteMonitoreo}</span>
                                        </div>
                                        <p className="text-xs theme-text-muted">Detección: {com.horaDeteccion}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm flex flex-col justify-center items-center text-center gap-2">
                                <Clock className="w-6 h-6" />
                                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider">Campus con más Alertas</p>
                                <p className="text-2xl font-black theme-text-main">{commentsStats.topCampus}</p>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'incidencias' && (
                    <div className="fade-in space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard title="Reportes Creados" value={rrssStats.totalReportes} color="blue" icon={<Megaphone className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Total Incidencias" value={rrssStats.totalIncidencias} color="orange" icon={<Activity className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Campus Afectados" value={rrssStats.campusAfectados} color="emerald" icon={<MapPin className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Peligro Inminente" value={rrssStats.criticalRisk} color="red" icon={<AlertTriangle className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 p-5 theme-bg-container border theme-border rounded-xl shadow-sm">
                                <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-red-500" /> Semáforo de Riesgo</h4>
                                <div className="space-y-2.5">
                                    {Object.entries(rrssStats.riesgoCounts).map(([name, count]) => {
                                        const percent = rrssStats.totalReportes ? Math.round((Number(count) / rrssStats.totalReportes) * 100) : 0;
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
                            <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm flex flex-col justify-center items-center text-center gap-2">
                                <div className="p-4 bg-red-500/10 text-red-500 rounded-full mb-2"><AlertTriangle className="w-8 h-8" /></div>
                                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider">Índice de Criticidad</p>
                                <p className="text-3xl font-black text-red-500">{rrssStats.criticidadRate}%</p>
                                <span className="text-[11px] font-bold bg-red-500/10 text-red-500 rounded-md px-2 py-0.5">Canal: {rrssStats.topNetwork}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};