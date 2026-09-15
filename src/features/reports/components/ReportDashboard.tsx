import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { collection, getDocs } from 'firebase/firestore';
import { db, appId } from '../../../services/firebase/config';
import { normalizeMention, normalizeMentions, normalizeMencionRow, normalizeMencionesDb, normalizeCsvMenciones, isMencionesCsv, type ReportRow } from '../utils/csvExport';
import { calcPlatforms, calcRiskLevels, calcTimeline, calcTopics, calcTopActors, calcTopicsByRisk, useReportGenerator } from '../hooks/useReportGenerator';
import { BarChart3, Database, UploadCloud, Search, ChevronLeft, ChevronRight, FileText, AlertTriangle, Share2, FileDown, Loader2, Target, TrendingUp, Users, Layers } from 'lucide-react';
import Papa from 'papaparse';
import { useTheme } from '../../../app/providers/ThemeProvider';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

const inputStyles = "w-full p-2.5 rounded-xl theme-bg-low border theme-border theme-text-main text-sm outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all duration-300 font-medium";

/* ============================================================
   CONTRASTE WCAG 2.2 (1.4.3 AA ≥ 4.5:1) — el texto de los badges
   se aclara (modo oscuro) u oscurece (modo claro) hasta garantizar
   el ratio contra su fondo translúcido (color al 12% sobre superficie)
   ============================================================ */
const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const relLum = (c: { r: number; g: number; b: number }) => {
    const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
const toHex = (c: { r: number; g: number; b: number }) => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
export const ensureContrast = (hex: string, dark: boolean): string => {
    const base = hexToRgb(hex);
    const target = dark ? { r: 255, g: 255, b: 255 } : { r: 17, g: 24, b: 39 };
    const surfaceLum = relLum(dark ? { r: 17, g: 24, b: 39 } : { r: 255, g: 255, b: 255 });
    const bgLum = surfaceLum * 0.88 + relLum(base) * 0.12; // fondo = color al ~12% sobre superficie
    // Umbral interno 5.2:1 → margen de seguridad sobre el 4.5:1 AA (el modelo de fondo es aproximado)
    for (let t = 0; t <= 1.0001; t += 0.05) {
        const c = t === 0 ? base : { r: base.r + (target.r - base.r) * t, g: base.g + (target.g - base.g) * t, b: base.b + (target.b - base.b) * t };
        const l = relLum(c);
        if ((Math.max(l, bgLum) + 0.05) / (Math.min(l, bgLum) + 0.05) >= 5.2) return toHex(c);
    }
    return dark ? '#ffffff' : '#111827';
};
// Color de relleno de barras/series: garantiza 3:1 (1.4.11 componentes gráficos)
export const ensureGraphicContrast = (hex: string, dark: boolean): string => {
    const base = hexToRgb(hex);
    const l = relLum(base);
    if (dark && l < 0.10) return toHex({ r: base.r + (255 - base.r) * 0.65, g: base.g + (255 - base.g) * 0.65, b: base.b + (255 - base.b) * 0.65 });
    if (!dark && l > 0.85) return toHex({ r: base.r * 0.55, g: base.g * 0.55, b: base.b * 0.55 });
    return hex;
};

const makeChartTheme = (dark: boolean) => {
    const tick = dark ? '#93a2c0' : '#475569';
    return {
        tick,
        scales: {
            x: { grid: { display: false }, ticks: { color: tick }, border: { color: dark ? 'rgba(147, 162, 192, 0.2)' : 'rgba(71, 85, 105, 0.25)' } },
            y: { grid: { color: dark ? 'rgba(147, 162, 192, 0.1)' : 'rgba(71, 85, 105, 0.12)' }, ticks: { color: tick, precision: 0 }, border: { display: false } }
        },
        legend: { position: 'bottom' as const, labels: { color: tick, boxWidth: 10, boxHeight: 10, padding: 14 } }
    };
};

const PLATFORM_COLORS: Record<string, string> = {
    'Facebook': '#1877F2',
    'Instagram': '#E4405F',
    'TikTok': '#000000',
    'LinkedIn': '#0A66C2',
    'YouTube': '#FF0000',
    'X': '#1DA1F2',
    'Medios Digitales': '#6366F1'
};

const RISK_COLORS: Record<string, string> = {
    'Bajo': '#10B981',
    'Medio': '#F59E0B',
    'Alto': '#F97316',
    'Crítico': '#EF4444'
};

export const ReportDashboard = ({ showToast, isAdmin, userRole }: any) => {
    const { isDarkMode } = useTheme();
    const chartTheme = useMemo(() => makeChartTheme(isDarkMode), [isDarkMode]);
    // Estilo de badge con contraste AA garantizado (1.4.3) + borde para no depender solo del color
    const badge = (hex: string) => ({ background: `${hex}20`, color: ensureContrast(hex, isDarkMode), border: `1px solid ${ensureContrast(hex, isDarkMode)}45` });
    const sentimentHex = (s: string) => s === 'Positivo' ? '#10B981' : s === 'Negativo' ? '#EF4444' : s === 'Neutral' ? '#F59E0B' : '#6B7280';
    const [allData, setAllData] = useState<ReportRow[]>([]);
    const [rowData, setRowData] = useState<ReportRow[]>([]);
    const [sourceLabel, setSourceLabel] = useState('');
    const [fileInputKey, setFileInputKey] = useState(0);
    const [loadingDb, setLoadingDb] = useState(false);
    const [hasDbData, setHasDbData] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlatform, setFilterPlatform] = useState('');
    const [filterRisk, setFilterRisk] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const PAGE_SIZE = 10;

    const fileRef = useRef<HTMLInputElement>(null);
    const { generatePDF } = useReportGenerator();

    const isTrueAdmin = ['ADMIN_IT', 'ADMIN_CM'].includes(userRole);

    const uniquePlatforms = useMemo(() => Array.from(new Set(rowData.map(r => r.fuenteDeteccion))).sort(), [rowData]);
    const uniqueRisks = useMemo(() => ['Crítico', 'Alto', 'Medio', 'Bajo'].filter(r => rowData.some(row => row.nivelRiesgo === r)), [rowData]);

    const applyFilters = useCallback((data: ReportRow[], platform: string, risk: string) => {
        return data.filter(r => {
            if (platform && r.fuenteDeteccion !== platform) return false;
            if (risk && r.nivelRiesgo !== risk) return false;
            return true;
        });
    }, []);

    const handleFilterPlatformChange = (platform: string) => {
        setFilterPlatform(platform);
        setRowData(applyFilters(allData, platform, filterRisk));
        setCurrentPage(1);
    };

    const handleFilterRiskChange = (risk: string) => {
        setFilterRisk(risk);
        setRowData(applyFilters(allData, filterPlatform, risk));
        setCurrentPage(1);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showToast('El archivo debe ser .csv', true);
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as any[];
                if (!data.length) { showToast('CSV sin datos', true); return; }
                
                const firstRow = data[0] as any;
                // Detecta el esquema: menciones (modelo actual) o legacy
                const parsed: ReportRow[] = isMencionesCsv(firstRow)
                    ? data.map(vals => normalizeCsvMenciones(vals))
                    : data.map(vals => ({
                        id: vals['ID'] || '',
                        fecha: vals['Fecha'] || vals['Fecha Inicio'] || '',
                        fuenteDeteccion: vals['Plataforma'] || vals['Red Social'] || vals['Fuente Detección'] || 'Sin especificar',
                        actorFuente: vals['Actor'] || vals['Usuario'] || vals['Fuente'] || 'Anónimo',
                        tipoFuente: vals['Tipo'] || vals['Tipo Fuente'] || 'Sin clasificar',
                        temaPrincipal: vals['Tema'] || vals['Tema Principal'] || 'Sin clasificar',
                        nivelRiesgo: vals['Riesgo'] || vals['Nivel Riesgo'] || 'Bajo',
                        alcanceActual: vals['Alcance'] || 'Sin especificar',
                        tendencia: vals['Tendencia'] || 'Sin especificar',
                        resumen: vals['Resumen'] || '',
                        hallazgosClave: vals['Hallazgos'] || '',
                        estado: vals['Estado'] || 'Monitoreo activo',
                        area: vals['Área'] || vals['Area'] || 'Sin asignar',
                        totalIncidencias: parseInt(vals['Total']) || 1,
                        autor: vals['Autor'] || 'Administrador',
                    }));
                
                setAllData(parsed);
                setRowData(parsed);
                setHasDbData(false);
                setFilterPlatform('');
                setFilterRisk('');
                setSourceLabel(`CSV: ${file.name}`);
                setCurrentPage(1);
                showToast(`${parsed.length} menciones cargadas desde CSV`);
            },
            error: () => showToast('Error al leer el CSV', true)
        });

        e.target.value = '';
        setFileInputKey(k => k + 1);
    };

    const loadFromFirestore = useCallback(async () => {
        if (!isTrueAdmin) { showToast('Permisos insuficientes', true); return; }
        setLoadingDb(true);
        try {
            // Carga la colección de menciones (comments) y expande cada registro
            const mentionsSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'comments'));
            const mentions: ReportRow[] = [];
            mentionsSnap.forEach(d => {
                normalizeMencionesDb(d.data()).forEach((row, idx) => {
                    mentions.push({ ...row, id: `${d.id}-${idx}` });
                });
            });

            setAllData(mentions);
            setRowData(mentions);
            setHasDbData(true);
            setFilterPlatform('');
            setFilterRisk('');
            setSourceLabel(`Firestore: ${mentions.length} menciones`);
            setCurrentPage(1);
            showToast(`${mentions.length} menciones sincronizadas`);
        } catch (err) {
            showToast('Error al conectar con la base de datos', true);
        } finally {
            setLoadingDb(false);
        }
    }, [isTrueAdmin, showToast]);

    const handleGeneratePDF = async () => {
        if (!rowData.length) { showToast('No hay datos para generar el PDF', true); return; }
        setIsExportingPDF(true);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
            await generatePDF(rowData, sourceLabel || 'Datos filtrados de menciones');
            showToast('Reporte PDF generado exitosamente');
        } catch (error) {
            showToast('Hubo un error al compilar el documento', true);
        } finally {
            setIsExportingPDF(false);
        }
    };

    const platforms = calcPlatforms(rowData);
    const riskLevels = calcRiskLevels(rowData);
    const timeline = calcTimeline(rowData);
    const topics = calcTopics(rowData);
    const topActors = calcTopActors(rowData);
    const topicsByRisk = calcTopicsByRisk(rowData);

    // Sentimiento y Estatus (campos reales del formulario de menciones)
    const sentimentCounts = useMemo(() => {
        const order = ['Positivo', 'Neutral', 'Negativo'];
        const labels = order.filter(s => rowData.some(r => r.sentimiento === s));
        return { labels, data: labels.map(s => rowData.filter(r => r.sentimiento === s).length) };
    }, [rowData]);
    const estatusCounts = useMemo(() => {
        const order = ['Monitoreo activo', 'En revisión', 'Seguimiento activo', 'Escalado', 'Resuelto'];
        const labels = order.filter(e => rowData.some(r => r.estado === e))
            .concat(Array.from(new Set(rowData.map(r => r.estado).filter(e => e && !order.includes(e)))));
        return { labels, data: labels.map(e => rowData.filter(r => r.estado === e).length) };
    }, [rowData]);
    const ESTATUS_COLORS: Record<string, string> = {
        'Monitoreo activo': '#3B82F6', 'En revisión': '#F59E0B', 'Seguimiento activo': '#8B5CF6', 'Escalado': '#EF4444', 'Resuelto': '#10B981'
    };
    const sentimentTop = useMemo(() => {
        const entries = sentimentCounts.labels.map((label: string, i: number) => ({ label, count: sentimentCounts.data[i] }));
        return entries.sort((a, b) => b.count - a.count)[0] || { label: '—', count: 0 };
    }, [sentimentCounts]);

    const tableRows = useMemo(() => {
        return rowData.filter(r => {
            if (searchTerm) {
                const s = searchTerm.toLowerCase();
                return r.actorFuente.toLowerCase().includes(s) || 
                       r.resumen.toLowerCase().includes(s) ||
                       r.tipoFuente.toLowerCase().includes(s) ||
                       r.temaPrincipal.toLowerCase().includes(s);
            }
            return true;
        }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    }, [rowData, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const currentTableRows = tableRows.slice(startIdx, startIdx + PAGE_SIZE);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterPlatform, filterRisk]);

    const hasData = rowData.length > 0;

    const platformDoughnutData = useMemo(() => ({
        labels: platforms.labels,
        datasets: [{ 
            data: platforms.data, 
            backgroundColor: platforms.labels.map(l => ensureGraphicContrast(PLATFORM_COLORS[l] || '#6366F1', isDarkMode)), 
            borderColor: 'transparent', 
            borderWidth: 2, 
            hoverOffset: 4 
        }]
    }), [platforms, isDarkMode]);

    const riskDoughnutData = useMemo(() => ({
        labels: riskLevels.labels,
        datasets: [{ 
            data: riskLevels.data, 
            backgroundColor: riskLevels.colors, 
            borderColor: 'transparent', 
            borderWidth: 2, 
            hoverOffset: 4 
        }]
    }), [riskLevels]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 fade-in pb-20">
            {/* HERO HEADER */}
            <div className="theme-bg-container p-6 sm:p-10 rounded-[2rem] border theme-border shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-700">
                    <BarChart3 className="w-48 h-48 text-[var(--primary)]" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Database className="w-4 h-4" /> Módulo Analítico de Menciones
                        </p>
                        <h2 className="text-4xl font-black theme-text-main mb-4 tracking-tight">Reportes de Menciones RRSS</h2>
                        <p className="theme-text-muted text-base max-w-2xl leading-relaxed">
                            Análisis integral de menciones en redes sociales. Visualiza tendencias, riesgos y plataformas.
                        </p>
                    </div>
                    {hasData && (
                        <button 
                            onClick={handleGeneratePDF} 
                            disabled={isExportingPDF}
                            className="w-full md:w-auto py-3 px-6 rounded-xl bg-[var(--primary)] text-white font-bold text-sm hover:brightness-110 shadow-lg hover:shadow-[var(--primary)]/20 hover:-translate-y-1 transition-all duration-300 ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExportingPDF ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileDown className="w-5 h-5" />}
                            {isExportingPDF ? 'Generando...' : 'Generar PDF Ejecutivo'}
                        </button>
                    )}
                </div>
            </div>

            {/* CONTROLES DE INGESTA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 sm:p-8 border rounded-2xl flex flex-col justify-between gap-6 transition-all duration-300 ease-out bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40 hover:shadow-lg hover:-translate-y-1 group">
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-xl shadow-md bg-blue-600 text-white group-hover:scale-110 transition-transform duration-300">
                            <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold theme-text-main text-base">Importar CSV de Menciones</h3>
                            <p className="text-xs theme-text-muted mt-1">Sube un archivo con datos de menciones</p>
                        </div>
                    </div>
                    <button onClick={() => fileRef.current?.click()} className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 shadow-md transition-colors flex items-center justify-center gap-2">
                        <UploadCloud className="w-4 h-4" /> Seleccionar Archivo CSV
                    </button>
                    <input key={fileInputKey} ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </div>

                <div className="p-6 sm:p-8 border rounded-2xl flex flex-col justify-between gap-6 transition-all duration-300 ease-out bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-lg hover:-translate-y-1 group">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-4">
                            <div className="p-4 rounded-xl shadow-md bg-emerald-500 text-white group-hover:scale-110 transition-transform duration-300">
                                <Database className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold theme-text-main text-base">Sincronizar desde Firestore</h3>
                                <p className="text-xs theme-text-muted mt-1">Menciones en tiempo real</p>
                            </div>
                        </div>
                        {!isTrueAdmin && <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-md border border-amber-500/20">Bloqueado</span>}
                    </div>
                    <button onClick={loadFromFirestore} disabled={loadingDb || !isTrueAdmin} className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loadingDb ? <Loader2 className="w-4 h-4 animate-spin"/> : <Database className="w-4 h-4"/>}
                        {loadingDb ? 'Sincronizando...' : 'Cargar desde Firestore'}
                    </button>
                </div>
            </div>

            {hasData && (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard icon={FileText} label="Total Menciones" value={rowData.length} color="#5b8def" />
                        <KpiCard icon={AlertTriangle} label="Riesgo Crítico" value={rowData.filter(r => r.nivelRiesgo === 'Crítico').length} color="#e0485a" />
                        <KpiCard icon={Target} label="Plataforma Top" value={platforms.labels[0] || '—'} sub={`${platforms.data[0] || 0} menciones`} color="#2fd9c4" />
                        <KpiCard icon={TrendingUp} label="Sentimiento Top" value={sentimentTop.label} sub={`${sentimentTop.count} menciones`} color="#f5a93f" />
                    </div>

                    {/* GRÁFICAS PRINCIPALES */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Distribución por Plataforma" sub="Menciones por red social">
                            <div className="h-64"><Doughnut data={platformDoughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: chartTheme.legend }, scales: chartTheme.scales, cutout: '60%' }} /></div>
                        </ChartCard>
                        
                        <ChartCard title="Distribución por Nivel de Riesgo" sub="Clasificación de severidad">
                            <div className="h-64"><Doughnut data={riskDoughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: chartTheme.legend }, scales: chartTheme.scales, cutout: '60%' }} /></div>
                        </ChartCard>
                    </div>

                    {/* EVOLUCIÓN TEMPORAL */}
                    <div className="grid grid-cols-1 gap-6">
                        <ChartCard title="Evolución Temporal de Menciones" sub="Volumen y distribución por riesgo en el tiempo">
                            <div className="h-[320px]">
                                <Bar 
                                    data={{ 
                                        labels: timeline.labels, 
                                        datasets: [
                                            { label: 'Total', data: timeline.totals, backgroundColor: '#5b8def', borderRadius: 4 },
                                            { label: 'Crítico', data: timeline.criticos, backgroundColor: '#e0485a', borderRadius: 4 },
                                            { label: 'Alto', data: timeline.altos, backgroundColor: '#f5a93f', borderRadius: 4 }
                                        ] 
                                    }} 
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: true, position: 'bottom', labels: { color: chartTheme.tick, boxWidth: 10, boxHeight: 10, padding: 10 } } },
                                        scales: {
                                            x: { ...chartTheme.scales.x },
                                            y: { ...chartTheme.scales.y, beginAtZero: true }
                                        }
                                    }} 
                                />
                            </div>
                        </ChartCard>
                    </div>

                    {/* TEMAS POR RIESGO */}
                    <div className="grid grid-cols-1 gap-6">
                        <ChartCard title="Temas por Nivel de Riesgo" sub="Análisis cruzado de temas y severidad">
                            <div className="h-[300px]">
                                <Bar 
                                    data={{ 
                                        labels: topicsByRisk.labels, 
                                        datasets: [
                                            { label: 'Crítico', data: topicsByRisk.critico, backgroundColor: '#e0485a', borderRadius: 4 },
                                            { label: 'Alto', data: topicsByRisk.alto, backgroundColor: '#f5a93f', borderRadius: 4 },
                                            { label: 'Medio', data: topicsByRisk.medio, backgroundColor: '#7c8db5', borderRadius: 4 },
                                            { label: 'Bajo', data: topicsByRisk.bajo, backgroundColor: '#10B981', borderRadius: 4 }
                                        ] 
                                    }} 
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        indexAxis: 'y' as const,
                                        plugins: { legend: { display: true, position: 'bottom', labels: { color: chartTheme.tick, boxWidth: 10, boxHeight: 10, padding: 10 } } },
                                        scales: {
                                            x: { ...chartTheme.scales.x, stacked: true, beginAtZero: true },
                                            y: { ...chartTheme.scales.y, stacked: true }
                                        }
                                    }} 
                                />
                            </div>
                        </ChartCard>
                    </div>

                    {/* TOP ACTORES */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Top Actores / Fuentes" sub="Fuentes con más menciones registradas">
                            <div className="space-y-3 pt-2">
                                {topActors.length ? topActors.slice(0, 6).map((actor, i) => (
                                    <div key={actor.name} className="flex items-center gap-3">
                                        <span className="text-xs font-black theme-text-muted w-4">{i + 1}</span>
                                        <span className="text-xs font-semibold theme-text-main w-32 truncate" title={actor.name}>{actor.name}</span>
                                        <div className="flex-1 h-2.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(4, (actor.count / (topActors[0]?.count || 1)) * 100)}%`, background: RISK_COLORS[actor.dominantRisk] || '#5b8def' }}></div>
                                        </div>
                                        <span className="text-xs font-black theme-text-main w-8 text-right">{actor.count}</span>
                                    </div>
                                )) : <p className="text-sm font-medium theme-text-muted py-6 text-center">No hay actores registrados.</p>}
                            </div>
                        </ChartCard>

                        <ChartCard title="Sentimiento y Estatus" sub="Distribución de sentimiento y estatus de atención">
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <p className="text-xs font-bold theme-text-muted mb-2 uppercase">Sentimiento</p>
                                    {sentimentCounts.labels.slice(0, 5).map((label: string, i: number) => (
                                        <div key={label} className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-semibold theme-text-main w-20 truncate">{label}</span>
                                            <div className="flex-1 h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${(sentimentCounts.data[i] / (sentimentCounts.data[0] || 1)) * 100}%`, background: label === 'Positivo' ? '#10B981' : label === 'Negativo' ? '#EF4444' : '#F59E0B' }}></div>
                                            </div>
                                            <span className="text-[10px] font-bold theme-text-muted w-6 text-right">{sentimentCounts.data[i]}</span>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <p className="text-xs font-bold theme-text-muted mb-2 uppercase">Estatus</p>
                                    {estatusCounts.labels.map((label: string, i: number) => (
                                        <div key={label} className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-semibold theme-text-main w-20 truncate">{label}</span>
                                            <div className="flex-1 h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${(estatusCounts.data[i] / (estatusCounts.data[0] || 1)) * 100}%`, background: ESTATUS_COLORS[label] || 'var(--primary)' }}></div>
                                            </div>
                                            <span className="text-[10px] font-bold theme-text-muted w-6 text-right">{estatusCounts.data[i]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ChartCard>
                    </div>

                    {/* TABLA BITÁCORA */}
                    <div className="p-6 sm:p-8 theme-bg-container border theme-border rounded-[2rem] shadow-sm overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-6">
                            <div>
                                <h3 className="font-black theme-text-main text-xl uppercase tracking-wider flex items-center gap-2"><FileText className="w-6 h-6 text-[var(--primary)]"/> Bitácora de Menciones</h3>
                                <p className="text-xs theme-text-muted mt-1 font-medium">Búsqueda rápida en {rowData.length} registros</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                <div className="relative flex-1 sm:min-w-[220px]">
                                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 theme-text-muted" />
                                    <input type="text" placeholder="Filtrar por actor, tema o tipo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`${inputStyles} pl-10`} />
                                </div>
                                <select value={filterPlatform} onChange={e => handleFilterPlatformChange(e.target.value)} className={inputStyles}>
                                    <option value="">Plataforma: Todas</option>
                                    {uniquePlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <select value={filterRisk} onChange={e => handleFilterRiskChange(e.target.value)} className={inputStyles}>
                                    <option value="">Riesgo: Todos</option>
                                    {uniqueRisks.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto border theme-border rounded-xl custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="theme-bg-low border-b theme-border text-[10.5px] theme-text-muted uppercase tracking-widest">
                                        <th className="p-4 font-bold rounded-tl-xl">Fecha</th>
                                        <th className="p-4 font-bold">Canal</th>
                                        <th className="p-4 font-bold">Tipo Actor</th>
                                        <th className="p-4 font-bold">Riesgo</th>
                                        <th className="p-4 font-bold">Narrativa</th>
                                        <th className="p-4 font-bold">Sentimiento</th>
                                        <th className="p-4 font-bold">Usuario/Sitio</th>
                                        <th className="p-4 font-bold text-center rounded-tr-xl">Estatus</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm theme-text-secondary">
                                    {currentTableRows.length === 0 ? (
                                        <tr><td colSpan={8} className="p-12 text-center font-bold theme-text-muted border-t theme-border bg-black/5 dark:bg-white/5">No se encontraron resultados.</td></tr>
                                    ) : currentTableRows.map((r, i) => (
                                        <tr key={i} className="border-b theme-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <td className="p-4 whitespace-nowrap font-mono text-xs font-semibold">{r.fecha}</td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-[10px] font-bold rounded-md" style={badge(ensureGraphicContrast(PLATFORM_COLORS[r.fuenteDeteccion] || '#6366F1', isDarkMode))}>
                                                    {r.fuenteDeteccion}
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-xs font-semibold">{r.tipoFuente}</td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-[10px] font-bold rounded-md" style={badge(RISK_COLORS[r.nivelRiesgo] || '#6B7280')}>
                                                    {r.nivelRiesgo}
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-xs">{r.temaPrincipal}</td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-[10px] font-bold rounded-md" style={badge(sentimentHex(r.sentimiento || ''))}>
                                                    {r.sentimiento || '—'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold theme-text-main text-xs max-w-[150px]">
                                                    {r.enlaceFuente ? (
                                                        <a href={r.enlaceFuente} target="_blank" rel="noreferrer" title={r.enlaceFuente} className="truncate block text-blue-500 hover:underline">{r.actorFuente}</a>
                                                    ) : (
                                                        <span className="truncate block" title={r.actorFuente}>{r.actorFuente}</span>
                                                    )}
                                                </td>
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <span className="px-2 py-1 text-[10px] font-bold rounded-md" style={badge(ESTATUS_COLORS[r.estado] || '#6B7280')}>{r.estado || '—'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
                            <span className="text-xs font-bold theme-text-muted uppercase tracking-wider">Mostrando pág {currentPage} de {totalPages}</span>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl theme-bg-low border theme-border text-xs font-bold theme-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"><ChevronLeft className="w-4 h-4"/> Anterior</button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages || totalPages === 0} className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl theme-bg-low border theme-border text-xs font-bold theme-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">Siguiente <ChevronRight className="w-4 h-4"/></button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const KpiCard = ({ icon: Icon, label, value, sub, color }: any) => (
    <div className="p-5 theme-bg-container border theme-border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 opacity-5 group-hover:scale-110 transition-transform duration-500" style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}></div>
        <div className="flex items-start justify-between relative z-10">
            <div>
                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">{label}</p>
                <p className="text-3xl font-black theme-text-main" style={{ color }}>{value}</p>
                {sub && <p className="text-xs font-semibold theme-text-muted mt-1">{sub}</p>}
            </div>
            <div className="p-3 rounded-xl" style={{ background: `${color}15` }}>
                <Icon className="w-5 h-5" style={{ color }} />
            </div>
        </div>
    </div>
);

const ChartCard = ({ title, sub, children }: any) => (
    <div className="p-6 theme-bg-container border theme-border rounded-2xl shadow-sm">
        <div className="mb-4">
            <h3 className="font-bold theme-text-main text-sm">{title}</h3>
            {sub && <p className="text-xs theme-text-muted mt-0.5">{sub}</p>}
        </div>
        {children}
    </div>
);
