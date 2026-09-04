import React, { useMemo, useState, useEffect } from 'react';
import { Activity, AlertTriangle, Megaphone, MessageSquare, TrendingUp, TrendingDown, Minus, Loader2, Globe } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId, auth, IS_MOCK, ALLOWED_EMAIL_DOMAIN_MAIL } from '../../../services/firebase/config';
import { StatCard } from '../../../shared/components/UIComponents';
import { normalizeIncidencia, riesgoValue } from '../../../shared/utils/incidencias';
import { normalizeMenciones } from '../../../shared/utils/menciones';
import { MOCK_RRSS_INCIDENTS, MOCK_COMMENTS } from '../../../shared/utils/mockData';

// ── Panel de control ENGIE: Menciones + Incidencias ───────────────────────
export const DashboardView = ({ showToast, user }: any) => {
    const [rrssIncidents, setRrssIncidents] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('menciones');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (IS_MOCK) {
            setRrssIncidents(MOCK_RRSS_INCIDENTS);
            setComments(MOCK_COMMENTS);
            setActiveTab('menciones');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const u = auth.currentUser;
        if (u && !u.isAnonymous && u.email && !u.email.endsWith('@' + ALLOWED_EMAIL_DOMAIN_MAIL)) {
            setIsLoading(false);
            return;
        }
        const unsub1 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'rrss_incidents'), snap => {
            const arr: any[] = []; snap.forEach((d: any) => arr.push({ id: d.id, ...d.data() }));
            setRrssIncidents(arr.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        }, () => {});
        const unsub2 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'comments'), snap => {
            const arr: any[] = []; snap.forEach((d: any) => arr.push({ id: d.id, ...d.data() }));
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

    // ── Stats de Incidencias ────────────────────────────────────────────────
    const rrssStats = useMemo(() => {
        let totalIncidenciasSum = 0, criticalRisk = 0;
        const networkCounts: Record<string, number> = {};
        const riesgoCounts: Record<string, number> = { Bajo: 0, Medio: 0, Alto: 0, 'Crítico': 0 };
        rrssIncidents.forEach((inc: any) => {
            const n = normalizeIncidencia(inc);
            totalIncidenciasSum += Number(n.totalIncidencias) || 0;
            const r = n.nivelRiesgo ? riesgoValue(n.nivelRiesgo) : 'Bajo';
            if (r === 'Crítico') criticalRisk++;
            if (r in riesgoCounts) riesgoCounts[r]++;
            if (n.fuenteDeteccion && n.fuenteDeteccion !== 'N/A') networkCounts[n.fuenteDeteccion] = (networkCounts[n.fuenteDeteccion] || 0) + 1;
        });
        const topNetwork = Object.keys(networkCounts).sort((a, b) => networkCounts[b] - networkCounts[a])[0] || 'N/D';
        const criticidadRate = rrssIncidents.length ? Math.round((criticalRisk / rrssIncidents.length) * 100) : 0;
        return { totalReportes: rrssIncidents.length, totalIncidencias: totalIncidenciasSum, criticalRisk, riesgoCounts, criticidadRate, topNetwork };
    }, [rrssIncidents]);

    const commentsStats = useMemo(() => {
        let totalMenciones = 0, positivo = 0, negativo = 0, neutral = 0;
        const canalCounts: Record<string, number> = {};
        const fuenteCounts: Record<string, number> = {};
        comments.forEach((com: any) => {
            normalizeMenciones(com).forEach((m: any) => {
                const s = (m.sentiment || '').toLowerCase();
                if (s.includes('pos')) positivo++; else if (s.includes('neg')) negativo++; else neutral++;
                totalMenciones++;
                if (m.redSocial && m.redSocial !== 'N/D' && m.redSocial !== 'N/A') canalCounts[m.redSocial] = (canalCounts[m.redSocial] || 0) + 1;
                fuenteCounts[m.fuenteMonitoreo] = (fuenteCounts[m.fuenteMonitoreo] || 0) + 1;
            });
        });
        return {
            totalMenciones,
            fuentesActivas: Object.keys(fuenteCounts).length,
            positivityRate: totalMenciones ? Math.round((positivo / totalMenciones) * 100) : 0,
            sentimentCounts: { Positivo: positivo, Neutral: neutral, Negativo: negativo },
            topCanal: Object.keys(canalCounts).sort((a, b) => canalCounts[b] - canalCounts[a])[0] || 'N/D',
            fuentePrincipal: Object.keys(fuenteCounts).sort((a, b) => fuenteCounts[b] - fuenteCounts[a])[0] || 'N/D',
        };
    }, [comments]);

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
        <div className="fade-in pb-20 relative space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-1 h-10 rounded-full engie-energy-line" />
                <div>
                    <h1 className="text-2xl font-black theme-text-main tracking-tight">Panel de Control</h1>
                    <p className="text-sm theme-text-muted mt-0.5">{activeTab === 'menciones' ? 'Menciones y sentimiento' : 'Incidencias y riesgo reputacional'}</p>
                </div>
            </div>
            <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl w-fit shadow-inner">
                <button type="button" onClick={() => setActiveTab('menciones')} className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'menciones' ? 'bg-[var(--primary)] text-white shadow-sm' : 'theme-text-muted hover:theme-text-main'}`}><MessageSquare className="w-4 h-4" /> Menciones</button>
                <button type="button" onClick={() => setActiveTab('incidencias')} className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'incidencias' ? 'bg-[var(--primary)] text-white shadow-sm' : 'theme-text-muted hover:theme-text-main'}`}><AlertTriangle className="w-4 h-4" /> Incidencias</button>
            </div>

            <div className="space-y-6">
                {activeTab === 'menciones' && (
                    <div className="fade-in space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <StatCard title="Menciones Monitoreadas" value={commentsStats.totalMenciones} color="blue" icon={<MessageSquare className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Fuentes Activas" value={commentsStats.fuentesActivas} color="emerald" icon={<Globe className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Sentimiento Positivo" value={`${commentsStats.positivityRate}%`} color="primary" icon={<TrendingUp className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 p-5 theme-bg-container border theme-border rounded-xl shadow-sm">
                                <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: 'var(--engie-primary-cyan)' }} /> Semáforo de Sentimiento</h4>
                                <div className="space-y-2.5">
                                    {Object.entries(commentsStats.sentimentCounts).map(([name, count]) => {
                                        const percent = commentsStats.totalMenciones ? Math.round((Number(count) / commentsStats.totalMenciones) * 100) : 0;
                                        const barColor = name === 'Negativo' ? 'var(--error)' : name === 'Neutral' ? 'var(--warning)' : 'var(--success)';
                                        return (
                                            <div key={name}>
                                                <div className="flex justify-between text-xs mb-1"><span className="font-bold theme-text-main pr-2">{name}</span><span className="theme-text-muted">{Number(count)} ({percent}%)</span></div>
                                                <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${percent}%` : '0%', backgroundColor: barColor }}></div></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm flex flex-col justify-center items-center text-center gap-2">
                                <div className="p-3 rounded-full mb-2" style={{ backgroundColor: 'rgba(0,163,224,0.1)', color: 'var(--engie-primary-cyan)' }}><Activity className="w-8 h-8" /></div>
                                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider">Canal Principal</p>
                                <p className="text-2xl font-black theme-text-main">{commentsStats.topCanal}</p>
                                <span className="text-[11px] font-bold rounded-md px-2 py-0.5" style={{ backgroundColor: 'rgba(0,163,224,0.1)', color: 'var(--engie-primary-cyan)' }}>{commentsStats.fuentePrincipal}</span>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'incidencias' && (
                    <div className="fade-in space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard title="Reportes Creados" value={rrssStats.totalReportes} color="blue" icon={<Megaphone className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Total Incidencias" value={rrssStats.totalIncidencias} color="orange" icon={<Activity className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Peligro Inminente" value={rrssStats.criticalRisk} color="red" icon={<AlertTriangle className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 p-5 theme-bg-container border theme-border rounded-xl shadow-sm engie-card-hover">
                                <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4" style={{ color: 'var(--error)' }} /> Semáforo de Riesgo</h4>
                                <div className="space-y-3">
                                    {Object.entries(rrssStats.riesgoCounts).map(([name, count]) => {
                                        const percent = rrssStats.totalReportes ? Math.round((Number(count) / rrssStats.totalReportes) * 100) : 0;
                                        const barColor = name === 'Crítico' ? 'var(--error)' : name === 'Alto' ? 'var(--warning)' : name === 'Medio' ? 'var(--warning)' : 'var(--success)';
                                        return (
                                            <div key={name}>
                                                <div className="flex justify-between text-xs mb-1.5"><span className="font-bold theme-text-main pr-2">{name}</span><span className="theme-text-muted font-semibold">{Number(count)} ({percent}%)</span></div>
                                                <div className="h-2.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${percent}%` : '0%', backgroundColor: barColor }} /></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm flex flex-col justify-center items-center text-center gap-3 engie-card-hover">
                                <div className="p-4 rounded-full" style={{ backgroundColor: 'rgba(225,29,72,0.12)', color: 'var(--error)' }}><AlertTriangle className="w-8 h-8" /></div>
                                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider">Índice de Criticidad</p>
                                <p className="text-3xl font-black" style={{ color: 'var(--error)' }}>{rrssStats.criticidadRate}%</p>
                                <span className="text-[11px] font-bold rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(225,29,72,0.12)', color: 'var(--error)' }}>Canal: {rrssStats.topNetwork}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};