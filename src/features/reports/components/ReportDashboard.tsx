import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { collection, getDocs } from 'firebase/firestore';
import { db, appId } from '../../../services/firebase/config';
import { normalizeComments, generateCSV, downloadCSV, type ReportRow } from '../utils/csvExport';
import { calcSentiment, calcRedSocial, calcOrigen, calcTrend, calcCampusRanking, calcTopUsers, useReportGenerator } from '../hooks/useReportGenerator';
import { BarChart3, FileUp, Database, UploadCloud, Box, Filter, Search, ChevronLeft, ChevronRight, ExternalLink, FileText, AlertTriangle, MapPin, Share2, FileDown, Loader2 } from 'lucide-react';
import Papa from 'papaparse';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

const inputStyles = "w-full p-2.5 rounded-xl theme-bg-low border theme-border theme-text-main text-sm outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all duration-300 font-medium";

const COMMON_SCALES = {
    x: { grid: { display: false }, ticks: { color: '#93a2c0' }, border: { color: 'rgba(147, 162, 192, 0.2)' } },
    y: { grid: { color: 'rgba(147, 162, 192, 0.1)' }, ticks: { color: '#93a2c0', precision: 0 }, border: { display: false } }
};

const CHART_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { color: '#93a2c0', boxWidth: 10, boxHeight: 10, padding: 14 } } },
    scales: COMMON_SCALES
};

const RED_COLORS = ['#5b8def', '#e0485a', '#2fd9c4', '#f5a93f', '#4fd18b'];

export const ReportDashboard = ({ showToast, isAdmin, userRole }: any) => {
    const [allData, setAllData] = useState<ReportRow[]>([]);
    const [rowData, setRowData] = useState<ReportRow[]>([]);
    const [sourceLabel, setSourceLabel] = useState('');
    const [fileInputKey, setFileInputKey] = useState(0);
    const [loadingDb, setLoadingDb] = useState(false);
    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [hasDbData, setHasDbData] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterTableSentiment, setFilterTableSentiment] = useState('');
    const [filterTableRed, setFilterTableRed] = useState('');
    const [filterTableCampus, setFilterTableCampus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const PAGE_SIZE = 10;

    const fileRef = useRef<HTMLInputElement>(null);
    const { generatePDF } = useReportGenerator();

    const isTrueAdmin = ['ADMIN_IT', 'ADMIN_CM', 'EDITOR_CM'].includes(userRole);

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        allData.forEach(r => { const y = r.fechaInicio ? r.fechaInicio.split('-')[0] : ''; if (y) years.add(y); });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [allData]);

    const availableMonths = useMemo(() => {
        if (!filterYear) return [];
        const months = new Set<string>();
        allData.forEach(r => {
            if (r.fechaInicio) {
                const [y, m] = r.fechaInicio.split('-');
                if (y === filterYear && m) months.add(m);
            }
        });
        return Array.from(months).sort();
    }, [allData, filterYear]);

    const getMonthName = (m: string) => {
        const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        return names[parseInt(m, 10) - 1] || m;
    };

    const applyFilters = useCallback((data: ReportRow[], year: string, month: string) => {
        return data.filter(r => {
            if (!r.fechaInicio) return !year && !month;
            const [y, m] = r.fechaInicio.split('-');
            if (year && y !== year) return false;
            if (month && m !== month) return false;
            return true;
        });
    }, []);

    const handleYearChange = (year: string) => {
        setFilterYear(year);
        setFilterMonth('');
        setRowData(applyFilters(allData, year, ''));
        setCurrentPage(1);
    };

    const handleMonthChange = (month: string) => {
        setFilterMonth(month);
        setRowData(applyFilters(allData, filterYear, month));
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
                
                const required = ['Fecha Inicio', 'Red Social', 'Campus', 'Sentiment', 'Usuario', 'Comentario'];
                const headers = Object.keys(data[0]);
                const missing = required.filter(r => !headers.includes(r));
                if (missing.length) { showToast(`Faltan columnas: ${missing.join(', ')}`, true); return; }

                const parsed: ReportRow[] = data.map(vals => ({
                    fechaInicio: vals['Fecha Inicio'] || '',
                    fechaFin: vals['Fecha Fin'] || vals['Fecha Inicio'] || '',
                    contenido: vals['Contenido Global'] || 'Orgánico',
                    redSocial: vals['Red Social'] || 'Sin especificar',
                    campus: vals['Campus'] || 'Sin especificar',
                    sentiment: vals['Sentiment'] || 'Sin clasificar',
                    usuario: vals['Usuario'] || 'Anónimo',
                    comentario: vals['Comentario'] || '',
                    posteoOriginal: vals['Posteo Original'] || '',
                    evidencias: vals['Evidencias'] || ''
                }));
                
                setAllData(parsed);
                setRowData(parsed);
                setHasDbData(false);
                setFilterYear('');
                setFilterMonth('');
                setSourceLabel(`CSV: ${file.name}`);
                setCurrentPage(1);
                showToast(`${parsed.length} registros cargados desde CSV`);
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
            const commentsSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'comments'));

            const comments: ReportRow[] = [];
            commentsSnap.forEach(d => comments.push(...normalizeComments(d.data())));

            setAllData(comments);
            setRowData(comments);
            setHasDbData(true);
            setFilterYear('');
            setFilterMonth('');
            setSourceLabel(`Firestore: ${comments.length} comentarios`);
            setCurrentPage(1);
            showToast(`${comments.length} registros de comentarios sincronizados`);
        } catch (err) {
            showToast('Error al conectar con la base de datos', true);
        } finally {
            setLoadingDb(false);
        }
    }, [isTrueAdmin, showToast]);

    const handleGeneratePDF = async () => {
        if (!rowData.length) { showToast('No hay datos para estructurar el PDF', true); return; }
        setIsExportingPDF(true);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
            await generatePDF(rowData, sourceLabel || 'Datos filtrados de la bitácora');
            showToast('Reporte PDF generado exitosamente');
        } catch (error) {
            showToast('Hubo un error al compilar el documento', true);
        } finally {
            setIsExportingPDF(false);
        }
    };

    const uniqueSentiments = useMemo(() => Array.from(new Set(rowData.map(r => r.sentiment))).sort(), [rowData]);
    const uniqueReds = useMemo(() => Array.from(new Set(rowData.map(r => r.redSocial))).sort(), [rowData]);
    const uniqueCampus = useMemo(() => Array.from(new Set(rowData.map(r => r.campus))).sort(), [rowData]);

    // 🔥 FIX DATA: Motor para la gráfica Agrupada (Side-by-Side) sin "Positivo"
    const groupedSentiment = useMemo(() => {
        const labels = uniqueReds;
        const neuData: number[] = [];
        const negData: number[] = [];

        labels.forEach(network => {
            const networkRows = rowData.filter(r => r.redSocial === network);
            const total = networkRows.length;
            if (total === 0) {
                neuData.push(0); negData.push(0);
                return;
            }
            const neu = networkRows.filter(r => r.sentiment === 'Neutral').length;
            const neg = networkRows.filter(r => r.sentiment === 'Negativo').length;
            
            neuData.push(Math.round((neu / total) * 100));
            negData.push(Math.round((neg / total) * 100));
        });

        return { labels, neuData, negData };
    }, [rowData, uniqueReds]);

    const tableRows = useMemo(() => {
        return rowData.filter(r => {
            if (filterTableSentiment && r.sentiment !== filterTableSentiment) return false;
            if (filterTableRed && r.redSocial !== filterTableRed) return false;
            if (filterTableCampus && r.campus !== filterTableCampus) return false;
            if (searchTerm) {
                const s = searchTerm.toLowerCase();
                return r.usuario.toLowerCase().includes(s) || r.comentario.toLowerCase().includes(s);
            }
            return true;
        }).sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || ''));
    }, [rowData, searchTerm, filterTableSentiment, filterTableRed, filterTableCampus]);

    const totalPages = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const currentTableRows = tableRows.slice(startIdx, startIdx + PAGE_SIZE);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterTableSentiment, filterTableRed, filterTableCampus]);

    const sentiment = calcSentiment(rowData);
    const redSocial = calcRedSocial(rowData);
    const origen = calcOrigen(rowData);
    const trend = calcTrend(rowData);
    const campusRank = calcCampusRanking(rowData);
    const topUsers = calcTopUsers(rowData, 2, 8);

    const hasData = rowData.length > 0;

    // 🔥 FIX UI: Dona con Porcentajes calculados para coincidir con tu captura
    const doughnutData = useMemo(() => {
        const total = sentiment.data.reduce((a, b) => a + b, 0) || 1;
        const labelsWithPct = sentiment.labels.map((l, i) => {
            const pct = Math.round((sentiment.data[i] / total) * 100);
            return `${l}: ${pct}%`;
        });
        return {
            labels: labelsWithPct,
            datasets: [{ 
                data: sentiment.data, 
                backgroundColor: sentiment.colors, 
                borderColor: 'transparent', 
                borderWidth: 2, 
                hoverOffset: 4 
            }]
        };
    }, [sentiment]);

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
                            <Database className="w-4 h-4" /> Módulo Analítico Avanzado
                        </p>
                        <h2 className="text-4xl font-black theme-text-main mb-4 tracking-tight">Reportes de Comentarios</h2>
                        <p className="theme-text-muted text-base max-w-2xl leading-relaxed">
                            Genera informes visuales a partir de exportaciones de Comentarios. Sube un CSV o extrae los datos directamente desde el motor de Firebase.
                        </p>
                    </div>
                    {hasData && (
                        <button 
                            onClick={handleGeneratePDF} 
                            disabled={isExportingPDF}
                            className="w-full md:w-auto py-3 px-6 rounded-xl bg-[var(--primary)] text-white font-bold text-sm hover:brightness-110 shadow-lg hover:shadow-[var(--primary)]/20 hover:-translate-y-1 transition-all duration-300 ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExportingPDF ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileDown className="w-5 h-5" />}
                            {isExportingPDF ? 'Validando Integridad...' : 'Generar PDF Ejecutivo'}
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
                            <h3 className="font-bold theme-text-main text-base">Inyección por CSV</h3>
                            <p className="text-xs theme-text-muted mt-1">Sube un archivo de Comentarios encriptado</p>
                        </div>
                    </div>
                    <button onClick={() => fileRef.current?.click()} className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 shadow-md transition-colors flex items-center justify-center gap-2">
                        <FileUp className="w-4 h-4" /> Seleccionar Archivo CSV
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
                                <h3 className="font-bold theme-text-main text-base">Extracción en Vivo</h3>
                                <p className="text-xs theme-text-muted mt-1">Comentarios desde Firestore en tiempo real</p>
                            </div>
                        </div>
                        {!isTrueAdmin && <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-md border border-amber-500/20">Bloqueado</span>}
                    </div>
                    <button onClick={loadFromFirestore} disabled={loadingDb || !isTrueAdmin} className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loadingDb ? <><Box className="w-4 h-4 animate-spin" /> Escaneando motor...</> : <><Database className="w-4 h-4" /> Sincronizar Comentarios</>}
                    </button>
                </div>
            </div>

            {hasDbData && (
                <div className="p-6 theme-bg-container border theme-border rounded-2xl shadow-sm border-l-[6px] border-l-indigo-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-500/10 rounded-lg"><Filter className="w-5 h-5 text-indigo-500" /></div>
                            <div>
                                <h3 className="font-bold theme-text-main text-sm uppercase tracking-wider">Filtro de Temporalidad</h3>
                                <p className="text-xs theme-text-muted mt-0.5">Aisla los datos por mes y año operativo</p>
                            </div>
                        </div>
                        {filterYear && (
                            <button onClick={() => { setFilterYear(''); setFilterMonth(''); setRowData(allData); }} className="text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-md">Restablecer filtros</button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Año Operativo</label>
                            <select value={filterYear} onChange={(e) => handleYearChange(e.target.value)} className={inputStyles}>
                                <option value="">Seleccionar Todo el Historial</option>
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Mes Operativo</label>
                            <select value={filterMonth} onChange={(e) => handleMonthChange(e.target.value)} disabled={!filterYear} className={`${inputStyles} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                <option value="">Todos los meses</option>
                                {availableMonths.map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t theme-border flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <p className="text-[11px] theme-text-muted font-bold">Base de datos segmentada: {rowData.length} de {allData.length} registros cargados en memoria.</p>
                    </div>
                </div>
            )}

            {!hasData && (
                <div className="text-center py-24 theme-bg-container rounded-[2rem] border theme-border border-dashed shadow-sm">
                    <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BarChart3 className="w-10 h-10 theme-text-muted opacity-50" />
                    </div>
                    <h3 className="font-black theme-text-main text-xl mb-2">Lienzo en Blanco</h3>
                    <p className="theme-text-muted text-sm max-w-md mx-auto">Sube un archivo CSV validado o sincroniza la base de datos de Firebase para encender el motor de reportes.</p>
                </div>
            )}

            {hasData && (
                <>
                    {/* KPIs TIPO STATCARD */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard icon={FileText} label="Total Registros" value={rowData.length} color="#5b8def" />
                        <KpiCard icon={AlertTriangle} label="% Negativo" value={`${sentiment.data[0] !== undefined ? Math.round((rowData.filter(r => r.sentiment === 'Negativo').length / rowData.length) * 100) : 0}%`} color="#e0485a" />
                        <KpiCard icon={MapPin} label="Campus Crítico" value={campusRank[0] ? campusRank[0][1] : '—'} sub={campusRank[0]?.[0]} color="#f5a93f" />
                        <KpiCard icon={Share2} label="Red Dominante" value={redSocial.data[0] !== undefined ? redSocial.data[0] : '—'} sub={redSocial.labels[0]} color="#2fd9c4" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <ChartCard title="Sentimiento Analítico" sub="Distribución global por tono (%)">
                            <div className="h-56"><Doughnut data={doughnutData} options={{...CHART_OPTIONS, cutout: '65%'}} /></div>
                        </ChartCard>
                        
                        {/* 🔥 FIX UI: Gráfica de Barras Agrupadas sin Positivo, idéntica a tu captura */}
                        <ChartCard title="Sentimiento x Plataforma" sub="Porcentaje de cada tono relativo al total de cada plataforma">
                            <div className="h-56">
                                <Bar 
                                    data={{ 
                                        labels: groupedSentiment.labels, 
                                        datasets: [
                                            { label: 'Negativo', data: groupedSentiment.negData, backgroundColor: '#e0485a', borderRadius: 4 },
                                            { label: 'Neutral', data: groupedSentiment.neuData, backgroundColor: '#7c8db5', borderRadius: 4 }
                                        ] 
                                    }} 
                                    options={{
                                        ...CHART_OPTIONS, 
                                        plugins: { legend: { display: true, position: 'bottom', labels: { color: '#93a2c0', boxWidth: 10, boxHeight: 10, padding: 10 } } },
                                        scales: {
                                            x: { ...COMMON_SCALES.x },
                                            y: { ...COMMON_SCALES.y, max: 100, ticks: { ...COMMON_SCALES.y.ticks, callback: (v: any) => v + '%' } }
                                        }
                                    }} 
                                />
                            </div>
                        </ChartCard>

                        <ChartCard title="Origen del Contenido" sub="Métricas Orgánico vs Pautado">
                            <div className="h-56"><Bar data={{ labels: origen.labels, datasets: [{ label: 'Registros', data: origen.totals, backgroundColor: '#5b8def', borderRadius: 6 }, { label: '% Negativo', data: origen.negPct, backgroundColor: '#e0485a', borderRadius: 6 }] }} options={{ ...CHART_OPTIONS, scales: { ...COMMON_SCALES, y: { ...COMMON_SCALES.y, beginAtZero: true } } }} /></div>
                        </ChartCard>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <ChartCard title="Tendencia Cronológica" sub="Volumen y curva de negatividad por corte temporal">
                            <div className="h-[380px]">
                                <Line 
                                    data={{ 
                                        labels: trend.labels, 
                                        datasets: [
                                            { 
                                                label: 'Comentarios Totales', 
                                                data: trend.totals, 
                                                backgroundColor: 'rgba(91,141,239,0.2)', 
                                                borderColor: '#5b8def', 
                                                borderWidth: 3,
                                                fill: true, 
                                                tension: 0.4, 
                                                pointRadius: 5,
                                                pointHoverRadius: 7,
                                                pointBackgroundColor: '#5b8def',
                                                pointBorderColor: '#101a2e',
                                                pointBorderWidth: 2,
                                                clip: false, 
                                                yAxisID: 'y' 
                                            }, 
                                            { 
                                                label: '% Negatividad', 
                                                data: trend.negPct, 
                                                borderColor: '#e0485a', 
                                                backgroundColor: '#e0485a', 
                                                borderWidth: 3,
                                                tension: 0.4, 
                                                borderDash: [6, 4], 
                                                pointRadius: 5,
                                                pointHoverRadius: 7,
                                                pointBackgroundColor: '#e0485a',
                                                pointBorderColor: '#101a2e',
                                                pointBorderWidth: 2,
                                                clip: false, 
                                                yAxisID: 'y1' 
                                            }
                                        ] 
                                    }} 
                                    options={{ 
                                        responsive: true, 
                                        maintainAspectRatio: false, 
                                        interaction: { mode: 'index', intersect: false },
                                        layout: { padding: { top: 25, right: 25, left: 15, bottom: 5 } },
                                        scales: { 
                                            x: { 
                                                ...COMMON_SCALES.x, 
                                                ticks: { ...COMMON_SCALES.x.ticks, maxRotation: 0, minRotation: 0, autoSkip: true, maxTicksLimit: 12, font: { size: 10.5 }, padding: 10 } 
                                            }, 
                                            y: { 
                                                ...COMMON_SCALES.y, position: 'left', grace: '25%' 
                                            }, 
                                            y1: { 
                                                beginAtZero: true, max: 100, position: 'right', grid: { display: false }, ticks: { color: '#93a2c0' }, border: { display: false }, grace: '25%' 
                                            } 
                                        }, 
                                        plugins: CHART_OPTIONS.plugins 
                                    }} 
                                />
                            </div>
                        </ChartCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Radiografía de Campus" sub="Ranking descendente de incidencias">
                            <div className="space-y-4 pt-2">
                                {campusRank.slice(0, 8).map(([name, count], i) => {
                                    const max = campusRank[0]?.[1] || 1;
                                    const pct = Math.max(4, Math.round((count / max) * 100));
                                    return (
                                        <div key={name} className="flex items-center gap-3">
                                            <span className="text-xs font-black theme-text-muted w-4">{i + 1}</span>
                                            <span className="text-xs font-semibold theme-text-main w-36 truncate" title={name}>{name}</span>
                                            <div className="flex-1 h-2.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                                                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: name === 'Sin especificar' ? '#f5a93f' : '#5b8def' }}></div>
                                            </div>
                                            <span className="text-xs font-black theme-text-main w-8 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </ChartCard>
                        <ChartCard title="Radar de Autores Recurrentes" sub="Usuarios con 2 o más interacciones en el periodo actual">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {topUsers.length ? topUsers.map(u => (
                                    <div key={u.name} className="flex items-center justify-between p-4 theme-bg-low rounded-xl border theme-border hover:border-[var(--primary)]/50 transition-colors shadow-sm">
                                        <div className="truncate pr-2">
                                            <p className="text-sm font-bold theme-text-main truncate" title={u.name}>{u.name}</p>
                                            <p className="text-[11px] font-semibold theme-text-muted mt-0.5">Tono: <span style={{ color: sentimentColor(u.dominant) }}>{u.dominant}</span></p>
                                        </div>
                                        <span className="px-3 py-1 rounded-lg text-xs font-black border flex-shrink-0" style={{ background: `${sentimentColor(u.dominant)}15`, color: sentimentColor(u.dominant), borderColor: `${sentimentColor(u.dominant)}40` }}>{u.count}×</span>
                                    </div>
                                )) : <p className="text-sm font-medium theme-text-muted py-6 col-span-full">Ningún usuario con comportamiento recurrente detectado.</p>}
                            </div>
                        </ChartCard>
                    </div>

                    {/* TABLA BITÁCORA PREMIUM INNOVA */}
                    <div className="p-6 sm:p-8 theme-bg-container border theme-border rounded-[2rem] shadow-sm overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-6">
                            <div>
                                <h3 className="font-black theme-text-main text-xl uppercase tracking-wider flex items-center gap-2"><FileText className="w-6 h-6 text-[var(--primary)]"/> Motor de Trazabilidad</h3>
                                <p className="text-xs theme-text-muted mt-1 font-medium">Búsqueda rápida en la memoria de los {rowData.length} registros cargados</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                <div className="relative flex-1 sm:min-w-[220px]">
                                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 theme-text-muted" />
                                    <input type="text" placeholder="Filtrar por autor o comentario..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`${inputStyles} pl-10`} />
                                </div>
                                <select value={filterTableSentiment} onChange={e => setFilterTableSentiment(e.target.value)} className={inputStyles}>
                                    <option value="">Sentimiento: Todos</option>
                                    {uniqueSentiments.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select value={filterTableRed} onChange={e => setFilterTableRed(e.target.value)} className={inputStyles}>
                                    <option value="">Red Social: Todas</option>
                                    {uniqueReds.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <select value={filterTableCampus} onChange={e => setFilterTableCampus(e.target.value)} className={inputStyles}>
                                    <option value="">Campus: Todos</option>
                                    {uniqueCampus.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto border theme-border rounded-xl custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[950px]">
                                <thead>
                                    <tr className="theme-bg-low border-b theme-border text-[10.5px] theme-text-muted uppercase tracking-widest">
                                        <th className="p-4 font-bold rounded-tl-xl">Fecha</th>
                                        <th className="p-4 font-bold">Campus</th>
                                        <th className="p-4 font-bold">Red Social</th>
                                        <th className="p-4 font-bold">Sentimiento</th>
                                        <th className="p-4 font-bold">Origen</th>
                                        <th className="p-4 font-bold">Usuario</th>
                                        <th className="p-4 font-bold max-w-[300px]">Comentario</th>
                                        <th className="p-4 font-bold text-center rounded-tr-xl">Evidencia</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm theme-text-secondary">
                                    {currentTableRows.length === 0 ? (
                                        <tr><td colSpan={8} className="p-12 text-center font-bold theme-text-muted border-t theme-border bg-black/5 dark:bg-white/5">La combinación de filtros no devolvió ningún resultado.</td></tr>
                                    ) : currentTableRows.map((r, i) => (
                                        <tr key={i} className="border-b theme-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <td className="p-4 whitespace-nowrap font-mono text-xs font-semibold">{r.fechaInicio}</td>
                                            <td className="p-4 whitespace-nowrap font-medium">{r.campus}</td>
                                            <td className="p-4 whitespace-nowrap font-medium">{r.redSocial}</td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2.5 py-1 text-[10px] font-black rounded-md uppercase border" style={{ background: `${sentimentColor(r.sentiment)}15`, color: sentimentColor(r.sentiment), borderColor: `${sentimentColor(r.sentiment)}40` }}>
                                                    {r.sentiment}
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-xs font-semibold">{r.contenido}</td>
                                            <td className="p-4 font-bold theme-text-main text-xs">{r.usuario}</td>
                                            <td className="p-4 max-w-[300px] truncate text-xs" title={r.comentario}>{r.comentario}</td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex gap-2 justify-center">
                                                    {r.posteoOriginal && <a href={r.posteoOriginal} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:brightness-125 flex items-center gap-1 text-[11px] font-bold transition-colors uppercase"><ExternalLink className="w-3.5 h-3.5"/> Post</a>}
                                                    {r.evidencias && <a href={r.evidencias} target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 text-[11px] font-bold transition-colors uppercase"><FileText className="w-3.5 h-3.5"/> Doc</a>}
                                                </div>
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

const KpiCard = ({ label, value, sub, color, icon: Icon }: any) => (
    <div className="p-6 theme-bg-container rounded-2xl border theme-border shadow-sm relative overflow-hidden group">
        <Icon className="w-16 h-16 absolute -right-3 -bottom-3 opacity-10 group-hover:scale-110 transition-transform duration-500" style={{ color }} />
        <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest theme-text-muted">{label}</p>
            <p className="text-4xl font-black theme-text-main mt-2 mb-1">{value}</p>
            {sub && <p className="text-[11px] font-bold truncate tracking-wide" style={{ color }}>{sub}</p>}
        </div>
    </div>
);

const ChartCard = ({ title, sub, children }: any) => (
    <div className="p-6 theme-bg-container border theme-border rounded-2xl shadow-sm h-full flex flex-col">
        <h4 className="font-bold theme-text-main text-base">{title}</h4>
        <p className="text-xs font-medium theme-text-muted mb-5 mt-0.5">{sub}</p>
        <div className="flex-1 relative">
            {children}
        </div>
    </div>
);

const sentimentColor = (s: string) => {
    if (s === 'Negativo') return '#e0485a';
    if (s === 'Neutral') return '#7c8db5';
    if (s === 'Positivo') return '#4fd18b';
    return '#5b8def';
};