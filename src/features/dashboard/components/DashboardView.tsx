import React, { useMemo, useState, useEffect } from 'react';
import { Activity, AlertTriangle, Megaphone, MessageSquare, TrendingUp, TrendingDown, Minus, Loader2, Globe, Download } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId, auth, IS_MOCK, ALLOWED_EMAIL_DOMAIN_MAIL } from '../../../services/firebase/config';
import { StatCard } from '../../../shared/components/UIComponents';
import { normalizeIncidencia, riesgoValue } from '../../../shared/utils/incidencias';
import { normalizeMenciones } from '../../../shared/utils/menciones';
import { MOCK_RRSS_INCIDENTS, MOCK_COMMENTS } from '../../../shared/utils/mockData';
import { jsPDF } from 'jspdf';

// ── Panel de control ENGIE: Menciones + Incidencias ───────────────────────
export const DashboardView = ({ showToast, user }: any) => {
    const [rrssIncidents, setRrssIncidents] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('menciones');
    const [mounted, setMounted] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

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
        const riesgoCounts: Record<string, number> = { Bajo: 0, Medio: 0, Alto: 0, 'Crítico': 0 };
        const actoresCriticos: Record<string, number> = {};
        comments.forEach((com: any) => {
            normalizeMenciones(com).forEach((m: any) => {
                const s = (m.sentiment || '').toLowerCase();
                if (s.includes('pos')) positivo++; else if (s.includes('neg')) negativo++; else neutral++;
                totalMenciones++;
                if (m.canal && m.canal !== 'N/D' && m.canal !== 'N/A' && m.canal !== 'Medio digital') canalCounts[m.canal] = (canalCounts[m.canal] || 0) + 1;
                const r = m.nivelRiesgo || '';
                if (r in riesgoCounts) riesgoCounts[r]++;
                // Actor crítico: registro con riesgo Alto o Crítico → cuenta por actor/fuente
                if (r === 'Alto' || r === 'Crítico') {
                    const actor = (m.tipoActor && m.tipoActor !== 'N/A' ? m.tipoActor : '') || (m.usuario && m.usuario !== 'N/A' ? m.usuario : '') || 'Actor sin identificar';
                    actoresCriticos[actor] = (actoresCriticos[actor] || 0) + 1;
                }
            });
        });
        const topActoresCriticos = Object.entries(actoresCriticos)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        return {
            totalMenciones,
            positivo,
            neutral,
            negativo,
            positivityRate: totalMenciones ? Math.round((positivo / totalMenciones) * 100) : 0,
            sentimentCounts: { Positivo: positivo, Neutral: neutral, Negativo: negativo },
            riesgoCounts,
            actoresCriticosCount: Object.values(actoresCriticos).reduce((a: number, b: number) => a + b, 0),
            topActoresCriticos,
            topCanal: Object.keys(canalCounts).sort((a, b) => canalCounts[b] - canalCounts[a])[0] || 'N/D',
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

    // Exporta los highlights visibles del tab activo a un PDF descargable.
    const handleDownloadReport = async () => {
        if (isExportingPDF) return;
        setIsExportingPDF(true);
        try {
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const pageW = 210, pageH = 297, margin = 15;
            const now = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

            // Cabecera
            doc.setFillColor(10, 17, 32);
            doc.rect(0, 0, pageW, 28, 'F');
            doc.setTextColor(0, 163, 224);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('ENGIE – Panel de Control', margin, 14);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(180, 200, 230);
            const tituloReporte = activeTab === 'menciones' ? 'Menciones y Sentimiento' : 'Incidencias y Riesgo Reputacional';
            doc.text('Reporte de ' + tituloReporte, margin, 21);
            doc.text('Generado: ' + now, pageW - margin, 21, { align: 'right' });

            let y = 40;
            doc.setTextColor(20, 30, 50);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Resumen', margin, y); y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);

            const lines: [string, string][] = activeTab === 'menciones' ? [
                ['Menciones verificadas:', String(commentsStats.totalMenciones)],
                ['Menciones positivas:', String(commentsStats.positivo)],
                ['Menciones neutrales:', String(commentsStats.neutral)],
                ['Menciones negativas:', String(commentsStats.negativo)],
                ['Actores críticos (Alto/Crítico):', String(commentsStats.actoresCriticosCount)],
                ['Canal principal:', commentsStats.topCanal]
            ] : [
                ['Reportes creados:', String(rrssStats.totalReportes)],
                ['Total incidencias:', String(rrssStats.totalIncidencias)],
                ['Peligro inminente (Crítico):', String(rrssStats.criticalRisk)],
                ['Índice de criticidad:', rrssStats.criticidadRate + '%'],
                ['Canal con mayor exposición:', rrssStats.topNetwork]
            ];
            lines.forEach(([k, v]) => {
                doc.setFont('helvetica', 'bold'); doc.text(k, margin, y);
                doc.setFont('helvetica', 'normal'); doc.text(v, margin + 55, y);
                y += 5.5;
            });
            y += 4;

            doc.setFont('helvetica', 'bold');
            doc.text(activeTab === 'menciones' ? 'Distribución de sentimiento' : 'Semáforo de riesgo', margin, y); y += 6;
            doc.setFont('helvetica', 'normal');
            const buckets = activeTab === 'menciones' ? commentsStats.sentimentCounts : rrssStats.riesgoCounts;
            Object.entries(buckets).forEach(([k, v]) => {
                doc.text('• ' + k + ': ' + v, margin, y);
                y += 5;
            });

            const totalPages = (doc as any).internal.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setFontSize(8);
                doc.setTextColor(120, 135, 160);
                doc.text('ENGIE — Social Listening · Página ' + p + ' de ' + totalPages, pageW / 2, pageH - 8, { align: 'center' });
            }

            const filename = 'ENGIE_' + activeTab + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
            doc.save(filename);
            showToast?.('Reporte PDF generado correctamente');
        } catch (err) {
            console.error('Error generando PDF:', err);
            showToast?.('No se pudo generar el PDF', true);
        } finally {
            setIsExportingPDF(false);
        }
    };

return (
        <div className="fade-in pb-20 relative space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black theme-text-main tracking-tight">Panel de Control</h1>
                    <p className="text-sm theme-text-muted mt-0.5">{activeTab === 'menciones' ? 'Menciones y sentimiento' : 'Incidencias y riesgo reputacional'}</p>
                </div>
                <button type="button" onClick={handleDownloadReport} disabled={isExportingPDF} className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[var(--primary)] text-white hover:brightness-110 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isExportingPDF ? 'Generando PDF...' : 'Descargar PDF'}
                </button>
            </div>
            <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl w-fit shadow-inner">
                <button type="button" onClick={() => setActiveTab('menciones')} className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'menciones' ? 'bg-[var(--primary)] text-white shadow-sm' : 'theme-text-muted hover:theme-text-main'}`}><MessageSquare className="w-4 h-4" /> Menciones</button>
                <button type="button" onClick={() => setActiveTab('incidencias')} className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'incidencias' ? 'bg-[var(--primary)] text-white shadow-sm' : 'theme-text-muted hover:theme-text-main'}`}><AlertTriangle className="w-4 h-4" /> Incidencias</button>
            </div>

            <div className="space-y-6">
                {activeTab === 'menciones' && (
                    <div className="fade-in space-y-6">
                        {/* Fila 1: Totales por sentimiento */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Menciones Verificadas" value={commentsStats.totalMenciones} color="blue" icon={<MessageSquare className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Menciones Positivas" value={commentsStats.positivo} color="emerald" icon={<TrendingUp className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Menciones Neutrales" value={commentsStats.neutral} color="primary" icon={<Minus className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Menciones Negativas" value={commentsStats.negativo} color="red" icon={<TrendingDown className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                        </div>
                        {/* Fila 2: Semáforo de sentimiento + Analítica de nivel de riesgo */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm engie-card-hover">
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
                            <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm engie-card-hover">
                                <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} /> Analítica de Nivel de Riesgo</h4>
                                <div className="space-y-2.5">
                                    {Object.entries(commentsStats.riesgoCounts).map(([name, count]) => {
                                        const percent = commentsStats.totalMenciones ? Math.round((Number(count) / commentsStats.totalMenciones) * 100) : 0;
                                        const barColor = name === 'Crítico' ? 'var(--error)' : name === 'Alto' ? 'rgba(249,115,22,0.9)' : name === 'Medio' ? 'var(--warning)' : 'var(--success)';
                                        return (
                                            <div key={name}>
                                                <div className="flex justify-between text-xs mb-1"><span className="font-bold theme-text-main pr-2">{name}</span><span className="theme-text-muted">{Number(count)} ({percent}%)</span></div>
                                                <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${percent}%` : '0%', backgroundColor: barColor }}></div></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        {/* Fila 3: Actores críticos + Canal principal */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 p-5 theme-bg-container border theme-border rounded-xl shadow-sm engie-card-hover">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider flex items-center gap-2"><AlertTriangle className="w-4 h-4" style={{ color: 'var(--error)' }} /> Analítica de Actores Críticos</h4>
                                    <span className="text-[11px] font-bold rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(225,29,72,0.12)', color: 'var(--error)' }}>{commentsStats.actoresCriticosCount} registros de riesgo Alto/Crítico</span>
                                </div>
                                {commentsStats.topActoresCriticos.length ? (
                                    <div className="space-y-2.5">
                                        {commentsStats.topActoresCriticos.map(([actor, count]) => {
                                            const percent = commentsStats.actoresCriticosCount ? Math.round((count / commentsStats.actoresCriticosCount) * 100) : 0;
                                            return (
                                                <div key={actor}>
                                                    <div className="flex justify-between text-xs mb-1"><span className="font-bold theme-text-main pr-2 truncate">{actor}</span><span className="theme-text-muted">{count} ({percent}%)</span></div>
                                                    <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${percent}%` : '0%', backgroundColor: 'var(--error)' }}></div></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm theme-text-muted text-center py-6">Sin actores críticos registrados hasta la fecha</p>
                                )}
                            </div>
                            <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm flex flex-col justify-center items-center text-center gap-2 engie-card-hover">
                                <div className="p-3 rounded-full mb-2" style={{ backgroundColor: 'rgba(0,163,224,0.1)', color: 'var(--engie-primary-cyan)' }}><Activity className="w-8 h-8" /></div>
                                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider">Canal Principal</p>
                                <p className="text-2xl font-black theme-text-main">{commentsStats.topCanal}</p>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'incidencias' && (
                    <div className="fade-in space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <StatCard title="Reportes Creados" value={rrssStats.totalReportes} color="blue" icon={<Megaphone className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Total Incidencias" value={rrssStats.totalIncidencias} color="orange" icon={<Activity className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Peligro Inminente" value={rrssStats.criticalRisk} color="red" icon={<AlertTriangle className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm engie-card-hover">
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