import React, { useMemo, useState, useEffect } from 'react';
import { Activity, AlertTriangle, Megaphone, MessageSquare, TrendingUp, TrendingDown, Minus, Loader2, Globe, Download, Users } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId, auth, IS_MOCK, ALLOWED_EMAIL_DOMAIN_MAIL } from '../../../services/firebase/config';
import { StatCard } from '../../../shared/components/UIComponents';
import { normalizeIncidencia, riesgoValue } from '../../../shared/utils/incidencias';
import { normalizeMenciones } from '../../../shared/utils/menciones';
import { MOCK_RRSS_INCIDENTS, MOCK_COMMENTS } from '../../../shared/utils/mockData';
import { jsPDF } from 'jspdf';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../../../app/providers/ThemeProvider';

// Chart.js: se registran únicamente las piezas que consume el panel (barras del Top Actores / Fuentes)
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Top de actores/fuentes recurrentes: el gráfico y el ranking comparten el mismo
// límite, de modo que la comparación visual y la lista numérica muestren lo mismo.
const RANKING_TOP = 10;
const TOP_ACTORES = RANKING_TOP;

// El eje de categorías no admite etiquetas largas (@usuario o dominio ya vienen cortos)
const shortenAxisLabel = (label: string, max = 18): string =>
    label.length > max ? label.slice(0, max - 1) + '…' : label;

// ── Panel de control ENGIE: Menciones + Incidencias ───────────────────────
export const DashboardView = ({ showToast, user }: any) => {
    const { isDarkMode } = useTheme();
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
        const fuenteCounts: Record<string, number> = {};
        const riesgoCounts: Record<string, number> = { Bajo: 0, Medio: 0, Alto: 0, 'Crítico': 0 };
        const alcanceCounts: Record<string, number> = { Aislado: 0, Local: 0, Regional: 0, Nacional: 0, Viral: 0 };
        const tendenciaCounts: Record<string, number> = { Aumentando: 0, Estable: 0, Disminuyendo: 0 };
        const temasEscalada: Record<string, number> = {};
        let enEscalada = 0;
        rrssIncidents.forEach((inc: any) => {
            const n = normalizeIncidencia(inc);
            const r = n.nivelRiesgo ? riesgoValue(n.nivelRiesgo) : 'Bajo';
            if (r in riesgoCounts) riesgoCounts[r]++;
            const f = n.fuenteDeteccion && n.fuenteDeteccion !== 'N/A' ? n.fuenteDeteccion : null;
            if (f) fuenteCounts[f] = (fuenteCounts[f] || 0) + 1;
            const a = n.alcanceActual as keyof typeof alcanceCounts;
            if (a && a in alcanceCounts) alcanceCounts[a]++;
            const t = n.tendencia as keyof typeof tendenciaCounts;
            if (t && t in tendenciaCounts) tendenciaCounts[t]++;
            // Cruce: riesgo Alto/Crítico + tendencia Aumentando = riesgo en escalada
            if ((r === 'Alto' || r === 'Crítico') && t === 'Aumentando') {
                enEscalada++;
                const tema = n.temaPrincipal && n.temaPrincipal !== 'Otro' ? n.temaPrincipal : (n.temaPrincipal === 'Otro' ? 'Otro' : 'Tema sin clasificar');
                temasEscalada[tema] = (temasEscalada[tema] || 0) + 1;
            }
        });
        const topFuente = Object.keys(fuenteCounts).sort((a, b) => fuenteCounts[b] - fuenteCounts[a])[0] || 'N/D';
        const temasEscaladaTop = Object.entries(temasEscalada).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return { totalReportes: rrssIncidents.length, fuenteCounts, topFuente, riesgoCounts, alcanceCounts, tendenciaCounts, enEscalada, temasEscaladaTop };
    }, [rrssIncidents]);

    const commentsStats = useMemo(() => {
        let totalMenciones = 0, positivo = 0, negativo = 0, neutral = 0;
        const canalCounts: Record<string, number> = {};
        const riesgoCounts: Record<string, number> = { Bajo: 0, Medio: 0, Alto: 0, 'Crítico': 0 };
        const actoresCriticos: Record<string, number> = {};
        const actoresFuentes: Record<string, number> = {};
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
                // Top Actores / Fuentes recurrentes: misma clave analítica que los reportes
                // (actorFuente = etiqueta corta del campo "Usuario o Sitio Web": @usuario o dominio)
                const actorFuenteRaw = (m.fuenteLabel || m.usuario || '').trim();
                const actorFuente = actorFuenteRaw && actorFuenteRaw !== 'N/A' && actorFuenteRaw !== 'N/D'
                    ? actorFuenteRaw
                    : 'Actor sin identificar';
                actoresFuentes[actorFuente] = (actoresFuentes[actorFuente] || 0) + 1;
            });
        });
        const topActoresCriticos = Object.entries(actoresCriticos)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        // Ranking completo de actores/fuentes (el gráfico de barras traza los primeros
        // TOP_ACTORES y el ranking en pantalla muestra hasta RANKING_TOP con su conteo)
        const topActoresFuentes = Object.entries(actoresFuentes)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
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
            topActoresFuentes,
            actoresFuentesUnicos: topActoresFuentes.length,
            topCanal: Object.keys(canalCounts).sort((a, b) => canalCounts[b] - canalCounts[a])[0] || 'N/D',
        };
    }, [comments]);

    // ── Barras horizontales: Top Actores / Fuentes recurrentes ──────────────
    // Un gráfico de barras ordena y compara de un vistazo, con etiquetas siempre
    // legibles; el radar se saturaba al crecer el número de ejes. Se alimenta del
    // mismo ranking y colorea con la paleta corporativa según el tema activo.
    const topActoresGrafico = useMemo(
        () => commentsStats.topActoresFuentes.slice(0, TOP_ACTORES),
        [commentsStats.topActoresFuentes]
    );
    const barrasActores = useMemo<{ data: ChartData<'bar'>; options: ChartOptions<'bar'> }>(() => {
        const tick = isDarkMode ? '#93a2c0' : '#475569';
        const grid = isDarkMode ? 'rgba(147, 162, 192, 0.22)' : 'rgba(71, 85, 105, 0.18)';
        const maxVal = topActoresGrafico.reduce((a, [, c]) => Math.max(a, c), 1);
        const total = commentsStats.totalMenciones;
        return {
            data: {
                labels: topActoresGrafico.map(([name]) => shortenAxisLabel(name, 26)),
                datasets: [{
                    label: 'Menciones registradas',
                    data: topActoresGrafico.map(([, count]) => count),
                    // La intensidad decrece con la posición: refuerza la jerarquía del ranking
                    backgroundColor: topActoresGrafico.map((_, i) => isDarkMode
                        ? `rgba(0, 163, 224, ${Math.max(0.4, 0.92 - i * 0.055)})`
                        : `rgba(0, 114, 206, ${Math.max(0.4, 0.92 - i * 0.055)})`),
                    borderColor: isDarkMode ? '#00A3E0' : '#0072CE',
                    borderWidth: 0,
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 24
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            // El eje muestra la etiqueta acortada; el tooltip recupera el
                            // nombre completo del actor/fuente y añade su peso porcentual.
                            title: (items: TooltipItem<'bar'>[]) => topActoresGrafico[items[0]?.dataIndex ?? 0]?.[0] ?? '',
                            label: (ctx: TooltipItem<'bar'>) => {
                                const pct = total > 0 ? Math.round((Number(ctx.raw) / total) * 100) : 0;
                                return `${ctx.formattedValue} menciones registradas (${pct}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        suggestedMax: maxVal,
                        grid: { color: grid },
                        ticks: { color: tick, precision: 0, stepSize: maxVal <= 5 ? 1 : undefined }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: tick, font: { size: 10, weight: 'bold' }, autoSkip: false }
                    }
                }
            }
        };
    }, [topActoresGrafico, isDarkMode, commentsStats.totalMenciones]);

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
const tituloReporte = activeTab === 'menciones' ? 'Menciones y Sentimiento' : 'Incidencias y Riesgo Reputacional';
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            (doc as any).setProperties?.({ title: 'Reporte ' + tituloReporte + ' — ENGIE', subject: 'Panel de Control', author: 'ENGIE Management', keywords: 'panel, reporte, engie', creator: 'ENGIE Management' });
            const pageW = 210, pageH = 297, margin = 15;
            const contentW = pageW - margin * 2;
            const now = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

            // Paleta corporativa + contraste WCAG (texto >=4.5:1 sobre fondo claro)
            const TEXT_MAIN = [28, 40, 66];
            const TEXT_MUTED = [109, 122, 145];
            const CARD_BG = [247, 249, 252];
            const LINE = [214, 220, 230];
            const TRACK = [231, 235, 241];
            const ACCENT = { blue: [55, 125, 245], emerald: [16, 185, 129], purple: [139, 92, 246], orange: [242, 120, 42], red: [224, 72, 90] };
            const STATUS_COLORS: Record<string, string> = { 'Positivo': '#10b981', 'Neutral': '#94a3b8', 'Negativo': '#e0485a', 'Bajo': '#10b981', 'Medio': '#f5a93f', 'Alto': '#f97316', 'Crítico': '#e0485a' };
            const PALETTE = ['#5b8def', '#10b981', '#f5a93f', '#e0485a', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f97316', '#6366f1', '#ec4899', '#84cc16', '#f59e0b'];
            const hexToRgb = (h: string): number[] => { const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [91, 141, 239]; };
            const trunc = (s: string, w: number): string => { s = String(s || ''); if (!s) return ''; const lines = doc.splitTextToSize(s, w); return lines.length > 1 ? lines[0].replace(/\s+\S*$/, '') + '…' : (lines[0] || ''); };

            // Cabecera estilizada (banda navy + línea accent)
            const HEADER_H = 26;
            const drawHeader = () => {
                doc.setFillColor(10, 17, 32); doc.rect(0, 0, pageW, HEADER_H, 'F');
                doc.setFillColor(ACCENT.blue[0], ACCENT.blue[1], ACCENT.blue[2]); doc.rect(0, HEADER_H, pageW, 2, 'F');
                doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
                doc.text('ENGIE MANAGEMENT', margin, 13);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                doc.text('Panel de Control · ' + tituloReporte, margin, 20);
                doc.setFontSize(7.5);
                doc.text('Generado: ' + now, pageW - margin, 13, { align: 'right' });
                doc.text('Fuente: Historial en vivo · Firestore', pageW - margin, 20, { align: 'right' });
            };
            drawHeader();

            let page = 1;
            let y = HEADER_H + 14;
            const checkBreak = (need: number) => {
                if (y + need > pageH - 16) { doc.addPage(); page++; drawHeader(); y = HEADER_H + 14; }
            };
            const sectionTitle = (t: string) => {
                checkBreak(18);
                doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
                doc.text(t.toUpperCase(), margin, y);
                doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.4); doc.line(margin, y + 2, pageW - margin, y + 2);
                y += 9;
            };
            const drawBar = (label: string, value: number, total: number, colorHex: string, maxV: number) => {
                const trackW = contentW - 78, barX = margin + 62, bh = 4;
                const m = maxV && maxV > 0 ? maxV : Math.max(total || 1, 1);
                const frac = Math.max(0, Math.min(1, value / m));
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
                doc.text(trunc(label, 58), margin, y - 1.4);
                doc.setFillColor(TRACK[0], TRACK[1], TRACK[2]); doc.roundedRect(barX, y - bh, trackW, bh, 0.9, 0.9, 'F');
                if (frac > 0) { const c = hexToRgb(colorHex); doc.setFillColor(c[0], c[1], c[2]); doc.roundedRect(barX, y - bh, Math.max(trackW * frac, 1.4), bh, 0.9, 0.9, 'F'); }
                doc.setFontSize(7.5); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
                doc.text(pct + '% · ' + value, pageW - margin, y - 1.4, { align: 'right' });
                y += 7;
            };
            const colorFor = (bucket: string, key: string): string => {
                const mp = bucket.includes('Sentimiento') || bucket.includes('Riesgo') ? STATUS_COLORS : null;
                if (mp && mp[key]) return mp[key];
                let acc = 0; for (const ch of key) acc = (acc + ch.charCodeAt(0)) % PALETTE.length;
                return PALETTE[acc];
            };// Resumen Ejecutivo (KPIs) — tarjetas con barra de acento
            sectionTitle('Resumen Ejecutivo');
            const kpiData: any[] = activeTab === 'menciones'
                ? [
                    ['Menciones Verificadas', String(commentsStats.totalMenciones), 'Registros verificados', ACCENT.blue],
                    ['Menciones Positivas', String(commentsStats.positivo), commentsStats.positivityRate + '% del total', ACCENT.emerald],
                    ['Menciones Neutrales', String(commentsStats.neutral), 'Sin connotación', ACCENT.purple],
                    ['Menciones Negativas', String(commentsStats.negativo), 'Canal principal: ' + (commentsStats.topCanal || '—'), ACCENT.red]
                ]
                : [
                    ['Reportes Creados', String(rrssStats.totalReportes), 'Incidencias registradas', ACCENT.blue],
                    ['Fuentes de Detección', String(Object.keys(rrssStats.fuenteCounts).length), rrssStats.topFuente || '—', ACCENT.purple],
                    ['Riesgo en Escalada', String(rrssStats.enEscalada), 'Con tendencia creciente', ACCENT.orange],
                    ['Fuente Principal', String(rrssStats.topFuente), 'Canal más frecuente', ACCENT.emerald]
                ];
            const kpiW = (contentW - 12) / 4, kpiGap = 4, kpiH = 25;
            kpiData.forEach((k, i) => {
                const x = margin + i * (kpiW + kpiGap);
                doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]); doc.roundedRect(x, y, kpiW, kpiH, 2, 2, 'F');
                doc.setFillColor(k[3][0], k[3][1], k[3][2]); doc.rect(x, y, 1.6, kpiH, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
                doc.text(k[0], x + 5, y + 6, { maxWidth: kpiW - 6 });
                doc.setFontSize(16); doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]); doc.text(k[1], x + 5, y + 15.5);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
                doc.text(trunc(k[2], kpiW - 7), x + 5, y + 21);
            });
            y += kpiH + 8;// Distribuciones (barras horizontales con color)
            const buckets: any[] = activeTab === 'menciones'
                ? [
                    ['Semáforo de Sentimiento', commentsStats.sentimentCounts, ['Positivo', 'Neutral', 'Negativo']],
                    ['Analítica de Nivel de Riesgo', commentsStats.riesgoCounts, ['Bajo', 'Medio', 'Alto', 'Crítico']]
                ]
                : [
                    ['Nivel de Riesgo Reputacional', rrssStats.riesgoCounts, ['Bajo', 'Medio', 'Alto', 'Crítico']],
                    ['Alcance Actual', rrssStats.alcanceCounts, Object.keys(rrssStats.alcanceCounts)],
                    ['Tendencia', rrssStats.tendenciaCounts, Object.keys(rrssStats.tendenciaCounts)]
                ];
            buckets.forEach(([bt, obj, order]) => {
                const entries = (order || Object.keys(obj)).filter((k: string) => obj[k]).map((k: string) => [k, obj[k]]);
                checkBreak(14 + entries.length * 7 + 4);
                sectionTitle(bt);
                const sum = entries.reduce((a: number, e: any) => a + e[1], 0);
                const maxV = entries.reduce((a: number, e: any) => Math.max(a, e[1]), 1);
                entries.forEach(([k, v]: any) => drawBar(k, v, sum, colorFor(bt, k), maxV));
                y += 4;
            });

            // Ranking adicional por módulo
            if (activeTab === 'menciones' && commentsStats.topActoresCriticos && commentsStats.topActoresCriticos.length) {
                checkBreak(14 + commentsStats.topActoresCriticos.length * 7);
                sectionTitle('Analítica de Actores Críticos');
                const maxV = commentsStats.topActoresCriticos.reduce((a: number, e: any) => Math.max(a, e[1]), 1);
                commentsStats.topActoresCriticos.forEach(([k, v]: any) => { drawBar(k, v, commentsStats.actoresCriticosCount, '#e0485a', maxV); });
                y += 4;
            } else if (activeTab !== 'menciones' && rrssStats.temasEscaladaTop && rrssStats.temasEscaladaTop.length) {
                checkBreak(14 + rrssStats.temasEscaladaTop.length * 7);
                sectionTitle('Temas en Riesgo de Escalada');
                const maxV = rrssStats.temasEscaladaTop.reduce((a: number, e: any) => Math.max(a, e[1]), 1);
                rrssStats.temasEscaladaTop.forEach(([k, v]: any) => { drawBar(k, v, rrssStats.enEscalada || 1, '#f97316', maxV); });
                y += 4;
            }

            // Top Actores / Fuentes recurrentes (misma analítica del gráfico en pantalla)
            if (activeTab === 'menciones' && commentsStats.topActoresFuentes.length) {
                const topActoresPdf = commentsStats.topActoresFuentes.slice(0, TOP_ACTORES);
                checkBreak(14 + topActoresPdf.length * 7);
                sectionTitle('Top Actores / Fuentes Recurrentes');
                const maxActoresPdf = topActoresPdf.reduce((a: number, e: [string, number]) => Math.max(a, e[1]), 1);
                topActoresPdf.forEach(([k, v]: [string, number]) => { drawBar(k, v, commentsStats.totalMenciones, '#377ef5', maxActoresPdf); });
                y += 4;
            }

            // Pie de página
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 135, 160);
            doc.text('ENGIE — Social Listening · Página ' + page + ' de ' + (doc.getNumberOfPages?.() || page), pageW / 2, pageH - 8, { align: 'center' });
            doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.2); doc.line(margin, pageH - 12, pageW - margin, pageH - 12);

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
                        {/* Fila 4: Barras horizontales del Top Actores / Fuentes recurrentes (misma analítica que los reportes) */}
                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm engie-card-hover">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                <div>
                                    <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider flex items-center gap-2"><Users className="w-4 h-4" style={{ color: 'var(--engie-primary-cyan)' }} /> Top Actores / Fuentes Recurrentes</h4>
                                    <p className="text-[11px] theme-text-muted mt-1">Actores y fuentes con más menciones registradas · clave analítica <span className="font-semibold">Usuario o Sitio Web</span> · el gráfico y el ranking reflejan el mismo <span className="font-semibold">Top {TOP_ACTORES}</span></p>
                                </div>
                                <span className="text-[11px] font-bold rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(0,163,224,0.12)', color: 'var(--engie-primary-cyan)' }}>{commentsStats.actoresFuentesUnicos} actores / fuentes distintos</span>
                            </div>
                            {commentsStats.topActoresFuentes.length === 0 ? (
                                <p className="text-sm theme-text-muted text-center py-6">Sin actores o fuentes registradas hasta la fecha</p>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                                    {topActoresGrafico.length >= 2 ? (
                                        <div
                                            style={{ height: Math.max(topActoresGrafico.length * 34 + 34, 230) }}
                                            role="img"
                                            aria-label={`Gráfico de barras del Top de Actores y Fuentes por menciones registradas: ${topActoresGrafico.map(([name, count]) => `${name} con ${count} ${count === 1 ? 'mención' : 'menciones'}`).join(', ')}.`}
                                        >
                                            <Bar data={barrasActores.data} options={barrasActores.options} />
                                        </div>
                                    ) : (
                                        <p className="text-sm theme-text-muted text-center py-6">Se necesitan al menos 2 actores o fuentes distintas para comparar; el ranking de la derecha ya refleja el total de menciones.</p>
                                    )}
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-bold theme-text-muted uppercase tracking-wider mb-1">Menciones registradas por actor / fuente</p>
                                        {commentsStats.topActoresFuentes.slice(0, RANKING_TOP).map(([actor, count], i) => {
                                            const percent = commentsStats.totalMenciones ? Math.round((count / commentsStats.totalMenciones) * 100) : 0;
                                            return (
                                                <div key={actor} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-dashed theme-border last:border-0">
                                                    <span className="font-bold theme-text-main truncate" title={actor}><span className="theme-text-muted mr-1.5">{i + 1}.</span>{actor}</span>
                                                    <span className="theme-text-muted shrink-0 tabular-nums">{count} {count === 1 ? 'mención' : 'menciones'} ({percent}%)</span>
                                                </div>
                                            );
                                        })}
                                        {commentsStats.topActoresFuentes.length > RANKING_TOP && (
                                            <p className="text-[11px] theme-text-muted pt-2">+{commentsStats.topActoresFuentes.length - RANKING_TOP} actores / fuentes adicionales con {commentsStats.topActoresFuentes.slice(RANKING_TOP).reduce((a, [, c]) => a + c, 0)} menciones acumuladas.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'incidencias' && (
                    <div className="fade-in space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Reportes Creados" value={rrssStats.totalReportes} color="blue" icon={<Megaphone className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Fuentes de Detección" value={Object.keys(rrssStats.fuenteCounts).length} color="primary" icon={<Globe className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Riesgo en Escalada" value={rrssStats.enEscalada} color="red" icon={<AlertTriangle className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                            <StatCard title="Fuente Principal" value={rrssStats.topFuente} color="emerald" icon={<Activity className="w-12 h-12 opacity-10 absolute -right-2 -bottom-2" />} />
                        </div>
                        {/* Fila 2: Riesgo · Alcance · Tendencia */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {[
                                { titulo: 'Nivel de Riesgo Reputacional', icono: <AlertTriangle className="w-4 h-4" style={{ color: 'var(--error)' }} />, datos: rrssStats.riesgoCounts, color: (n: string) => n === 'Crítico' ? 'var(--error)' : n === 'Alto' ? '#f97316' : n === 'Medio' ? 'var(--warning)' : 'var(--success)' },
                                { titulo: 'Alcance Actual', icono: <Globe className="w-4 h-4" style={{ color: 'var(--primary)' }} />, datos: rrssStats.alcanceCounts, color: (n: string) => n === 'Viral' ? 'var(--error)' : n === 'Nacional' ? '#f97316' : n === 'Regional' ? 'var(--warning)' : 'var(--success)' },
                                { titulo: 'Tendencia', icono: <TrendingUp className="w-4 h-4" style={{ color: 'var(--warning)' }} />, datos: rrssStats.tendenciaCounts, color: (n: string) => n === 'Aumentando' ? 'var(--error)' : n === 'Estable' ? 'var(--warning)' : 'var(--success)' }
                            ].map((panel) => (
                                <div key={panel.titulo} className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm engie-card-hover">
                                    <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">{panel.icono} {panel.titulo}</h4>
                                    <div className="space-y-3">
                                        {Object.entries(panel.datos).map(([name, count]) => {
                                            const percent = rrssStats.totalReportes ? Math.round((Number(count) / rrssStats.totalReportes) * 100) : 0;
                                            return (
                                                <div key={name}>
                                                    <div className="flex justify-between text-xs mb-1.5"><span className="font-bold theme-text-main pr-2">{name}</span><span className="theme-text-muted font-semibold">{Number(count)} ({percent}%)</span></div>
                                                    <div className="h-2.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${percent}%` : '0%', backgroundColor: panel.color(name) }} /></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Fila 3: Cruce — Temas en riesgo de escalada (Riesgo Alto/Crítico + Tendencia Aumentando) */}
                        <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm engie-card-hover">
                            <h4 className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4" style={{ color: 'var(--error)' }} /> Temas en Riesgo de Escalada <span className="normal-case font-medium theme-text-muted text-[10px]">(Riesgo Alto/Crítico + Tendencia Aumentando)</span></h4>
                            {rrssStats.temasEscaladaTop.length === 0 ? (
                                <p className="text-sm theme-text-muted py-4 text-center">Sin temas en riesgo de escalada actualmente.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                    {rrssStats.temasEscaladaTop.map(([tema, count]) => {
                                        const maxCount = rrssStats.temasEscaladaTop[0][1] || 1;
                                        const percent = Math.round((count / maxCount) * 100);
                                        return (
                                            <div key={tema}>
                                                <div className="flex justify-between text-xs mb-1.5"><span className="font-bold theme-text-main pr-2 truncate">{tema}</span><span className="theme-text-muted font-semibold shrink-0">{count} reporte{count !== 1 ? 's' : ''}</span></div>
                                                <div className="h-2.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${percent}%` : '0%', backgroundColor: 'var(--error)' }} /></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};