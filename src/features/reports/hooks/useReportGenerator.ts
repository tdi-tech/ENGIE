import { useCallback } from 'react';
import type { ReportRow } from '../utils/csvExport';

import { jsPDF as JsPDFClass } from 'jspdf';
import * as chartModule from 'chart.js';

const PLATFORM_COLORS: Record<string, string> = {
    'Facebook': '#1877F2',
    'Instagram': '#E4405F',
    'TikTok': '#000000',
    'LinkedIn': '#0A66C2',
    'YouTube': '#FF0000',
    'X': '#1DA1F2',
    'Medios Digitales': '#6366F1'
};
const FALLBACK_COLOR = '#6366F1';

const RISK_COLORS: Record<string, string> = {
    'Bajo': '#10B981',
    'Medio': '#F59E0B',
    'Alto': '#F97316',
    'Crítico': '#EF4444'
};

const TREND_COLORS: Record<string, string> = {
    'Aumentando': '#EF4444',
    'Estable': '#10B981',
    'Disminuyendo': '#3B82F6'
};

const SENTIMENT_COLORS: Record<string, string> = {
    'Positivo': '#10B981',
    'Neutral': '#F59E0B',
    'Negativo': '#EF4444'
};

const ESTATUS_COLORS: Record<string, string> = {
    'Monitoreo activo': '#3B82F6', 'En revisión': '#F59E0B', 'Seguimiento activo': '#8B5CF6', 'Escalado': '#EF4444', 'Resuelto': '#10B981'
};

type RGB = [number, number, number];
const NAVY: RGB = [10, 17, 32];        
const CARD_BG: RGB = [16, 26, 46];     
const TEXT_DARK: RGB = [232, 237, 247]; 
const TEXT_GRAY: RGB = [147, 162, 192]; 
const LINE: RGB = [34, 49, 77];        

const COL = {
    critical: [224, 72, 90] as RGB,
    verify: [47, 217, 196] as RGB,
    alert: [245, 169, 63] as RGB,
    info: [91, 141, 239] as RGB
};

const hexToRgb = (hex: string): RGB => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [91, 141, 239];
};

const rgbToHex = (c: RGB) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

// Luminancia relativa y ratio de contraste (WCAG 2.2 · 1.4.3)
const relLum = (c: RGB) => {
    const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const contrastRatio = (a: RGB, b: RGB) => {
    const l1 = relLum(a), l2 = relLum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
// Texto legible sobre CARD_BG: aclara el color hasta ≥4.5:1 (AA para texto pequeño del PDF)
const readableOnDark = (hex: string): RGB => {
    const base = hexToRgb(hex);
    for (let t = 0; t <= 1.0001; t += 0.06) {
        const m: RGB = [base[0] + (255 - base[0]) * t, base[1] + (255 - base[1]) * t, base[2] + (255 - base[2]) * t];
        if (contrastRatio(m, CARD_BG) >= 5) return m.map(Math.round) as RGB;
    }
    return [255, 255, 255];
};
// Relleno de gráficas: garantiza ≥3:1 vs CARD_BG (1.4.11 componentes gráficos — evita segmentos negros invisibles)
const chartFillOnDark = (hex: string): string => {
    const base = hexToRgb(hex);
    for (let t = 0; t <= 1.0001; t += 0.06) {
        const m: RGB = [base[0] + (255 - base[0]) * t, base[1] + (255 - base[1]) * t, base[2] + (255 - base[2]) * t];
        if (contrastRatio(m, CARD_BG) >= 3) return rgbToHex(m.map(Math.round) as RGB);
    }
    return '#ffffff';
};

export const countBy = (arr: any[], keyFn: (item: any) => string) => {
    const map: Record<string, number> = {};
    arr.forEach(item => { const k = keyFn(item); map[k] = (map[k] || 0) + 1; });
    return map;
};

// Distribución por plataforma (fuenteDeteccion)
export const calcPlatforms = (rows: ReportRow[]) => {
    const counts = countBy(rows, r => r.fuenteDeteccion);
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(l => counts[l]);
    const colors = labels.map(l => PLATFORM_COLORS[l] || FALLBACK_COLOR);
    return { labels, data, colors };
};

// Distribución por tipo de fuente
export const calcSourceTypes = (rows: ReportRow[]) => {
    const counts = countBy(rows, r => r.tipoFuente);
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(l => counts[l]);
    return { labels, data };
};

// Distribución por tema principal
export const calcTopics = (rows: ReportRow[]) => {
    const counts = countBy(rows, r => r.temaPrincipal);
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(l => counts[l]);
    return { labels, data };
};

// Distribución por nivel de riesgo
export const calcRiskLevels = (rows: ReportRow[]) => {
    const riskOrder = ['Crítico', 'Alto', 'Medio', 'Bajo'];
    const counts = countBy(rows, r => r.nivelRiesgo);
    const labels = riskOrder.filter(r => counts[r]);
    const data = labels.map(l => counts[l]);
    const colors = labels.map(l => RISK_COLORS[l] || '#6B7280');
    return { labels, data, colors };
};

// Distribución por alcance
export const calcScope = (rows: ReportRow[]) => {
    const counts = countBy(rows, r => r.alcanceActual);
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(l => counts[l]);
    return { labels, data };
};

// Distribución por tendencia
export const calcTrends = (rows: ReportRow[]) => {
    const counts = countBy(rows, r => r.tendencia);
    const labels = Object.keys(counts);
    const data = labels.map(l => counts[l]);
    const colors = labels.map(l => TREND_COLORS[l] || '#6B7280');
    return { labels, data, colors };
};

// Distribución por área responsable
export const calcAreas = (rows: ReportRow[]) => {
    const counts = countBy(rows, r => r.area);
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(l => counts[l]);
    return { labels, data };
};

// Evolución temporal de menciones por fecha
export const calcTimeline = (rows: ReportRow[]) => {
    const groups: Record<string, { total: number; critico: number; alto: number; sortKey: string }> = {};
    rows.forEach(r => {
        const fecha = r.fecha || 'Sin fecha';
        if (!groups[fecha]) {
            groups[fecha] = { total: 0, critico: 0, alto: 0, sortKey: fecha };
        }
        groups[fecha].total++;
        if (r.nivelRiesgo === 'Crítico') groups[fecha].critico++;
        if (r.nivelRiesgo === 'Alto') groups[fecha].alto++;
    });
    
    const sortedKeys = Object.keys(groups).sort((a, b) => groups[a].sortKey.localeCompare(groups[b].sortKey));
    const labels = sortedKeys.map(k => formatShortDate(k));
    const totals = sortedKeys.map(k => groups[k].total);
    const criticos = sortedKeys.map(k => groups[k].critico);
    const altos = sortedKeys.map(k => groups[k].alto);
    
    return { labels, totals, criticos, altos };
};

// Top actores/autores con más menciones
export const calcTopActors = (rows: ReportRow[], minCount = 1, limit = 10) => {
    const counts: Record<string, number> = {};
    const riskDominant: Record<string, Record<string, number>> = {};
    
    rows.forEach(r => {
        const actor = r.actorFuente || 'Anónimo';
        counts[actor] = (counts[actor] || 0) + 1;
        riskDominant[actor] = riskDominant[actor] || {};
        riskDominant[actor][r.nivelRiesgo] = (riskDominant[actor][r.nivelRiesgo] || 0) + 1;
    });
    
    return Object.entries(counts)
        .filter(([, c]) => c >= minCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({
            name, count,
            dominantRisk: Object.entries(riskDominant[name]).sort((a, b) => b[1] - a[1])[0][0]
        }));
};

// Cruzamiento: Plataforma x Riesgo
export const calcPlatformRiskCross = (rows: ReportRow[]) => {
    const platforms = [...new Set(rows.map(r => r.fuenteDeteccion))].sort();
    const risks = ['Crítico', 'Alto', 'Medio', 'Bajo'];
    
    const crossData: Record<string, Record<string, number>> = {};
    platforms.forEach(p => {
        crossData[p] = {};
        risks.forEach(r => crossData[p][r] = 0);
    });
    
    rows.forEach(r => {
        if (crossData[r.fuenteDeteccion] && crossData[r.fuenteDeteccion][r.nivelRiesgo] !== undefined) {
            crossData[r.fuenteDeteccion][r.nivelRiesgo]++;
        }
    });
    
    return { platforms, risks, crossData };
};

// Top temas por riesgo
export const calcTopicsByRisk = (rows: ReportRow[]) => {
    const topics: Record<string, Record<string, number>> = {};
    rows.forEach(r => {
        const tema = r.temaPrincipal || 'Sin clasificar';
        const riesgo = r.nivelRiesgo || 'Bajo';
        if (!topics[tema]) topics[tema] = {};
        topics[tema][riesgo] = (topics[tema][riesgo] || 0) + 1;
    });
    
    const labels = Object.keys(topics);
    const critico = labels.map(l => topics[l]['Crítico'] || 0);
    const alto = labels.map(l => topics[l]['Alto'] || 0);
    const medio = labels.map(l => topics[l]['Medio'] || 0);
    const bajo = labels.map(l => topics[l]['Bajo'] || 0);
    
    return { labels, critico, alto, medio, bajo };
};

const formatShortDate = (dstr: string) => {
    if (!dstr) return '';
    const parts = dstr.split('-');
    if (parts.length !== 3) return dstr;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]}`;
};

const spanishDate = (dstr: string) => {
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    if (!dstr) return '';
    const parts = dstr.split('-').map(Number);
    const y = parts[0], m = parts[1], d = parts[2];
    if (!y || !m || !d) return dstr;
    return `${d} ${months[m - 1]} ${y}`;
};

const nowStamp = () => {
    const d = new Date();
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) + " " +
        d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

const computePeriod = (rows: ReportRow[]) => {
    const withDates = rows.filter(r => r.fecha);
    if (!withDates.length) return { start: null, end: null, cycles: 0 };
    const dates = withDates.map(r => r.fecha).sort();
    const cycles = new Set(rows.map(r => r.fecha)).size;
    return { start: dates[0], end: dates[dates.length - 1], cycles };
};

const truncateToWidth = (doc: any, text: string, maxWidth: number) => {
    text = (text || '').toString();
    if (!text) return '';
    const lines = doc.splitTextToSize(text, maxWidth);
    if (lines.length <= 1) return lines[0] || '';
    return lines[0].replace(/\s+\S*$/, '') + '…';
};

const renderOffscreenChart = async (chartModuleRef: any, config: any, width: number, height: number): Promise<string | null> => {
    try {
        const Chart = chartModuleRef.Chart || (chartModuleRef as any).default?.Chart || chartModuleRef;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.position = 'absolute';
        canvas.style.left = '-9999px';
        canvas.style.top = '0';
        document.body.appendChild(canvas);

        config.options = config.options || {};
        config.options.responsive = false;
        config.options.maintainAspectRatio = false;
        config.options.animation = false;
        config.options.devicePixelRatio = 2;

        let dataUrl: string | null = null;
        const chart = new Chart(canvas, config);
        try { dataUrl = canvas.toDataURL('image/png', 1.0); }
        finally { chart.destroy(); document.body.removeChild(canvas); }
        return dataUrl;
    } catch (err) {
        console.error('Error renderizando gráfica offscreen:', err);
        return null;
    }
};

export interface ChartImages {
    platforms?: string | null;
    risk?: string | null;
    timeline?: string | null;
    topics?: string | null;
}

export const useReportGenerator = () => {

    const generatePDF = useCallback(async (rows: ReportRow[], sourceLabel: string, images?: ChartImages) => {
        if (!rows.length) return;

        const doc = new JsPDFClass({ unit: 'mm', format: 'a4' });
        // Metadatos e idioma del documento (WCAG 3.1.1 · robustez para lectores de PDF)
        doc.setLanguage('es');
        doc.setProperties({
            title: `Reporte Analítico de Menciones — ENGIE (${nowStamp()})`,
            subject: 'Reporte Analítico · Menciones RRSS',
            author: 'ENGIE Management',
            keywords: 'menciones, rrss, analiticas, engie',
            creator: 'ENGIE Management'
        });
        const pageW = 210, pageH = 297, margin = 15;
        const contentW = pageW - margin * 2;

        const total = rows.length;
        const criticos = rows.filter(r => r.nivelRiesgo === 'Crítico').length;
        const altos = rows.filter(r => r.nivelRiesgo === 'Alto').length;
        const period = computePeriod(rows);
        const periodText = period.start ? `${spanishDate(period.start)} – ${spanishDate(period.end)}` : 'No disponible';
        const platformAgg = calcPlatforms(rows);
        const riskAgg = calcRiskLevels(rows);

        let imgPlatforms = images?.platforms;
        let imgRisk = images?.risk;
        let imgTimeline = images?.timeline;
        let imgTopics = images?.topics;

        if (!imgPlatforms || !imgRisk || !imgTimeline || !imgTopics) {
            const timelineAgg = calcTimeline(rows);
            const topicsAgg = calcTopicsByRisk(rows);

            imgPlatforms = imgPlatforms || await renderOffscreenChart(chartModule, {
                type: 'doughnut',
                data: { 
                    labels: platformAgg.labels, 
                    datasets: [{ data: platformAgg.data, backgroundColor: platformAgg.colors.map(chartFillOnDark), borderColor: '#101a2e', borderWidth: 2 }] 
                },
                options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#93a2c0', font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 10 } } } }
            }, 480, 480);

            imgRisk = imgRisk || await renderOffscreenChart(chartModule, {
                type: 'doughnut',
                data: { 
                    labels: riskAgg.labels, 
                    datasets: [{ data: riskAgg.data, backgroundColor: riskAgg.colors.map(chartFillOnDark), borderColor: '#101a2e', borderWidth: 2 }] 
                },
                options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#93a2c0', font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 10 } } } }
            }, 480, 480);

            imgTimeline = imgTimeline || await renderOffscreenChart(chartModule, {
                type: 'bar',
                data: {
                    labels: timelineAgg.labels,
                    datasets: [
                        { label: 'Total Menciones', data: timelineAgg.totals, backgroundColor: '#5b8def', borderRadius: 4 },
                        { label: 'Crítico', data: timelineAgg.criticos, backgroundColor: '#e0485a', borderRadius: 4 },
                        { label: 'Alto', data: timelineAgg.altos, backgroundColor: '#f5a93f', borderRadius: 4 }
                    ]
                },
                options: {
                    plugins: { legend: { position: 'bottom', labels: { color: '#93a2c0', font: { size: 10 }, boxWidth: 10, boxHeight: 10, padding: 8 } } },
                    scales: { 
                        x: { grid: { display: false }, ticks: { color: '#93a2c0', maxRotation: 45 } }, 
                        y: { grid: { color: 'rgba(147, 162, 192, 0.1)' }, beginAtZero: true, ticks: { color: '#93a2c0', precision: 0 }, border: { display: false } } 
                    }
                }
            }, 700, 350);

            imgTopics = imgTopics || await renderOffscreenChart(chartModule, {
                type: 'bar',
                data: {
                    labels: topicsAgg.labels,
                    datasets: [
                        { label: 'Crítico', data: topicsAgg.critico, backgroundColor: '#e0485a', borderRadius: 4 },
                        { label: 'Alto', data: topicsAgg.alto, backgroundColor: '#f5a93f', borderRadius: 4 },
                        { label: 'Medio', data: topicsAgg.medio, backgroundColor: '#7c8db5', borderRadius: 4 },
                        { label: 'Bajo', data: topicsAgg.bajo, backgroundColor: '#10B981', borderRadius: 4 }
                    ]
                },
                options: {
                    indexAxis: 'y' as const,
                    plugins: { legend: { position: 'bottom', labels: { color: '#93a2c0', font: { size: 10 }, boxWidth: 10, boxHeight: 10, padding: 8 } } },
                    scales: { 
                        x: { stacked: true, grid: { color: 'rgba(147, 162, 192, 0.1)' }, ticks: { color: '#93a2c0', precision: 0 }, border: { display: false } }, 
                        y: { stacked: true, grid: { display: false }, ticks: { color: '#93a2c0' } } 
                    }
                }
            }, 700, 350);
        }

        let page = 1;
        let y = 36;
        const drawHeader = () => {
            doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(0, 0, pageW, pageH, 'F'); 
            doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
            doc.text('ENGIE MANAGEMENT', margin, 11);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
            doc.text('Reporte Analítico · Menciones RRSS', margin, 17.5);
            doc.setFontSize(7.5);
            doc.text('Generado: ' + nowStamp(), pageW - margin, 10, { align: 'right' });
            doc.text('Fuente: ' + sourceLabel, pageW - margin, 15.5, { align: 'right' });
            doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.5); doc.line(0, 26, pageW, 26);
        };
        const drawFooter = (pageNum: number) => {
            doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.2); doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
            doc.text('ENGIE Management · Reporte de Menciones', margin, pageH - 8);
            doc.text('Página ' + pageNum, pageW - margin, pageH - 8, { align: 'right' });
        };
        const checkPageBreak = (neededHeight: number, redrawFn?: () => void) => {
            if (y + neededHeight > pageH - 18) {
                drawFooter(page);
                doc.addPage(); page++;
                drawHeader();
                y = 34;
                if (redrawFn) redrawFn();
            }
        };
        const sectionTitle = (text: string) => {
            checkPageBreak(14);
            doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
            doc.text(text.toUpperCase(), margin, y);
            doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.3); doc.line(margin, y + 2.5, pageW - margin, y + 2.5);
            y += 9;
        };

        drawHeader();

        doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
        doc.text('Período Analizado: ' + periodText, margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
        doc.text(`${total} menciones registradas  ·  ${period.cycles} fecha(s) distinta(s)`, margin, y);
        y += 10;

        const kpiData = [
            { label: 'TOTAL MENCIONES', value: String(total), sub: 'Registros analizados', color: COL.info },
            { label: 'RIESGO CRÍTICO', value: String(criticos), sub: `${total ? Math.round(criticos / total * 100) : 0}% del total`, color: COL.critical },
            { label: 'RIESGO ALTO', value: String(altos), sub: `${total ? Math.round(altos / total * 100) : 0}% del total`, color: COL.alert },
            { label: 'PLATAFORMA TOP', value: platformAgg.data[0] !== undefined ? String(platformAgg.data[0]) : '—', sub: platformAgg.labels[0] || '—', color: COL.verify }
        ];
        const kpiGap = 4, kpiW = (contentW - kpiGap * 3) / 4, kpiH = 25;
        kpiData.forEach((k, i) => {
            const x = margin + i * (kpiW + kpiGap);
            doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]); doc.roundedRect(x, y, kpiW, kpiH, 2, 2, 'F');
            doc.setFillColor(k.color[0], k.color[1], k.color[2]); doc.rect(x, y, 1.5, kpiH, 'F');
            doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6);
            doc.text(k.label, x + 5, y + 6, { maxWidth: kpiW - 6 });
            doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]); doc.setFontSize(16);
            doc.text(k.value, x + 5, y + 15.5);
            doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8);
            doc.text(truncateToWidth(doc, String(k.sub), kpiW - 7), x + 5, y + 21);
        });
        y += kpiH + 8;

        sectionTitle('Distribución por Plataforma y Nivel de Riesgo');
        checkPageBreak(70);
        
        if (imgPlatforms) {
            const donutW = 85, donutH = 85; 
            doc.addImage(imgPlatforms, 'PNG', margin, y, donutW, donutH);
            
            if (imgRisk) {
                const riskW = contentW - donutW - 10;
                const riskH = riskW * (480 / 480);
                const riskY = y + (donutH > riskH ? (donutH - riskH) / 2 : 0);
                doc.addImage(imgRisk, 'PNG', margin + donutW + 10, riskY, riskW, riskH);
            }
            
            y += 95;
        }

        sectionTitle('Evolución Temporal de Menciones');
        if (imgTimeline) {
            const timeW = contentW, timeH = timeW * (350 / 700);
            checkPageBreak(timeH + 6);
            doc.addImage(imgTimeline, 'PNG', margin, y, timeW, timeH);
            y += timeH + 10;
        }

        sectionTitle('Temas por Nivel de Riesgo');
        if (imgTopics) {
            const topicsW = contentW, topicsH = topicsW * (350 / 700);
            checkPageBreak(topicsH + 6);
            doc.addImage(imgTopics, 'PNG', margin, y, topicsW, topicsH);
            y += topicsH + 10;
        }

        sectionTitle('Top Actores / Fuentes');
        const topActors = calcTopActors(rows);
        if (!topActors.length) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
            doc.text('No hay actores registrados en este periodo.', margin, y);
            y += 8;
        } else {
            topActors.forEach(u => {
                checkPageBreak(7);
                const riskCol: RGB = readableOnDark(RISK_COLORS[u.dominantRisk] || '#5b8def');
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
                doc.text(truncateToWidth(doc, u.name, 100), margin, y + 3.6);
                doc.setTextColor(riskCol[0], riskCol[1], riskCol[2]); doc.setFontSize(7.3);
                doc.text(u.dominantRisk, margin + 105, y + 3.6);
                doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.3);
                doc.text(u.count + '×', pageW - margin, y + 3.6, { align: 'right' });
                y += 6.6;
            });
        }
        y += 4;

        sectionTitle('Detalle de Menciones');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
        doc.text(`${rows.length} menciones bajo los filtros seleccionados`, margin, y);
        y += 6;

        // Columnas alineadas con la tabla del dashboard (campos reales del formulario de menciones)
        const cols = [
            { label: 'Fecha', width: 20 },
            { label: 'Canal', width: 24 },
            { label: 'Tipo Actor', width: 18 },
            { label: 'Riesgo', width: 15 },
            { label: 'Narrativa', width: 33 },
            { label: 'Sentimiento', width: 17 },
            { label: 'Usuario/Sitio', width: 35 },
            { label: 'Estatus', width: 18 }
        ];
        const drawTableHeader = () => {
            doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]); doc.rect(margin, y, contentW, 6, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
            let cx = margin + 2;
            cols.forEach(c => { doc.text(c.label.toUpperCase(), cx, y + 4); cx += c.width; });
            y += 7.5;
        };
        checkPageBreak(14);
        drawTableHeader();

        const sortedRows = rows.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
        sortedRows.forEach((r, idx) => {
            checkPageBreak(6, drawTableHeader);
            // Zebra striping: alterna el fondo de filas para facilitar el escaneo visual
            if (idx % 2 === 1) {
                doc.setFillColor(22, 32, 54); doc.rect(margin, y, contentW, 5.6, 'F');
            }
            let cx = margin + 2;
            const riskCol: RGB = readableOnDark(RISK_COLORS[r.nivelRiesgo] || '#6B7280');
            const sentCol: RGB = readableOnDark(SENTIMENT_COLORS[r.sentimiento || ''] || '#6B7280');
            const estCol: RGB = readableOnDark(ESTATUS_COLORS[r.estado] || '#6B7280');
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
            doc.text(r.fecha || '-', cx, y + 3.8); cx += cols[0].width;
            doc.text(truncateToWidth(doc, r.fuenteDeteccion, cols[1].width - 2), cx, y + 3.8); cx += cols[1].width;
            doc.text(truncateToWidth(doc, r.tipoFuente, cols[2].width - 2), cx, y + 3.8); cx += cols[2].width;
            doc.setTextColor(riskCol[0], riskCol[1], riskCol[2]);
            doc.text(truncateToWidth(doc, r.nivelRiesgo, cols[3].width - 2), cx, y + 3.8);
            doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
            cx += cols[3].width;
            doc.text(truncateToWidth(doc, r.temaPrincipal, cols[4].width - 2), cx, y + 3.8); cx += cols[4].width;
            doc.setTextColor(sentCol[0], sentCol[1], sentCol[2]);
            doc.text(truncateToWidth(doc, r.sentimiento || '—', cols[5].width - 2), cx, y + 3.8);
            doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
            cx += cols[5].width;
            // Usuario/Sitio: solo la etiqueta corta, con región clickeable hacia la URL cruda
            const fuenteLabel = truncateToWidth(doc, r.actorFuente, cols[6].width - 2);
            const linkCol: RGB = r.enlaceFuente ? readableOnDark('#5B8DEF') : TEXT_DARK;
            doc.setTextColor(linkCol[0], linkCol[1], linkCol[2]);
            const labelW = doc.getTextWidth(fuenteLabel);
            doc.text(fuenteLabel, cx, y + 3.8);
            if (r.enlaceFuente) {
                doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
                doc.link(cx, y, Math.min(labelW + 1.5, cols[6].width - 1), 5.5, { url: r.enlaceFuente });
            }
            cx += cols[6].width;
            doc.setTextColor(estCol[0], estCol[1], estCol[2]);
            doc.text(truncateToWidth(doc, r.estado || '—', cols[7].width - 2), cx, y + 3.8);
            doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.1);
            doc.line(margin, y + 5.4, pageW - margin, y + 5.4);
            y += 6;
        });

        drawFooter(page);

        const fileDate = new Date().toISOString().slice(0, 10);
        const filename = `ENGIE-Menciones-${fileDate}.pdf`;

        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const newTab = window.open(blobUrl, '_blank');

        if (!newTab) {
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }, []);

    return { generatePDF };
};
