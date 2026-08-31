import { useCallback } from 'react';
import type { ReportRow } from '../utils/csvExport';

// 🔥 FIX: Importaciones estáticas para jsPDF y Chart.js
import { jsPDF as JsPDFClass } from 'jspdf';
import * as chartModule from 'chart.js';

const SENTIMENT_COLORS: Record<string, string> = {
    'Negativo': '#e0485a',
    'Neutral': '#7c8db5',
    'Positivo': '#4fd18b'
};
const FALLBACK_COLOR = '#5b8def';
const RED_COLORS = ['#5b8def', '#e0485a', '#2fd9c4', '#f5a93f', '#4fd18b'];

type RGB = [number, number, number];
const NAVY: RGB = [10, 17, 32];        
const CARD_BG: RGB = [16, 26, 46];     
const TEXT_DARK: RGB = [232, 237, 247]; 
const TEXT_GRAY: RGB = [147, 162, 192]; 
const LINE: RGB = [34, 49, 77];        

const AMBER_BG: RGB = [36, 26, 10];
const AMBER_TEXT: RGB = [245, 169, 63];
const COL = {
    critical: [224, 72, 90] as RGB,
    verify: [47, 217, 196] as RGB,
    alert: [245, 169, 63] as RGB,
    info: [91, 141, 239] as RGB
};

const sentimentColor = (s: string) => SENTIMENT_COLORS[s] || FALLBACK_COLOR;

const hexToRgb = (hex: string): RGB => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [91, 141, 239];
};

export const countBy = (arr: any[], keyFn: (item: any) => string) => {
    const map: Record<string, number> = {};
    arr.forEach(item => { const k = keyFn(item); map[k] = (map[k] || 0) + 1; });
    return map;
};

export const calcSentiment = (rows: ReportRow[]) => {
    const counts = countBy(rows, r => r.sentiment);
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(l => counts[l]);
    const colors = labels.map(l => sentimentColor(l));
    return { labels, data, colors };
};

export const calcRedSocial = (rows: ReportRow[]) => {
    const counts = countBy(rows, r => r.redSocial);
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(l => counts[l]);
    return { labels, data };
};

export const calcOrigen = (rows: ReportRow[]) => {
    const groups: Record<string, { total: number; neg: number }> = {};
    rows.forEach(r => {
        const k = r.contenido;
        if (!groups[k]) groups[k] = { total: 0, neg: 0 };
        groups[k].total++;
        if (r.sentiment === 'Negativo') groups[k].neg++;
    });
    const labels = Object.keys(groups);
    const totals = labels.map(l => groups[l].total);
    const negPct = labels.map(l => groups[l].total ? Math.round(groups[l].neg / groups[l].total * 100) : 0);
    return { labels, totals, negPct };
};

const formatShortDate = (dstr: string) => {
    if (!dstr) return '';
    const parts = dstr.split('-');
    if (parts.length !== 3) return dstr;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]}`;
};

export const calcTrend = (rows: ReportRow[]) => {
    const groups: Record<string, { total: number; neg: number; sortKey: string; label: string }> = {};
    rows.forEach(r => {
        const sortKey = r.fechaInicio || '0000-00-00';
        const rawKey = (r.fechaInicio && r.fechaFin) ? `${r.fechaInicio}|${r.fechaFin}` : 'Sin periodo';
        
        if (!groups[rawKey]) {
            const label = (r.fechaInicio && r.fechaFin)
                ? `${formatShortDate(r.fechaInicio)} - ${formatShortDate(r.fechaFin)}`
                : 'Sin periodo';
            groups[rawKey] = { total: 0, neg: 0, sortKey, label };
        }
        groups[rawKey].total++;
        if (r.sentiment === 'Negativo') groups[rawKey].neg++;
    });
    
    const sortedKeys = Object.keys(groups).sort((a, b) => groups[a].sortKey.localeCompare(groups[b].sortKey));
    const labels = sortedKeys.map(k => groups[k].label);
    const totals = sortedKeys.map(k => groups[k].total);
    const negPct = sortedKeys.map(k => groups[k].total ? Math.round(groups[k].neg / groups[k].total * 100) : 0);
    return { labels, totals, negPct };
};

export const calcCampusRanking = (rows: ReportRow[]) => {
    const counts = countBy(rows, r => r.campus);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

export const calcTopUsers = (rows: ReportRow[], minCount = 2, limit = 8) => {
    const counts: Record<string, number> = {};
    const dominant: Record<string, Record<string, number>> = {};
    rows.forEach(r => {
        counts[r.usuario] = (counts[r.usuario] || 0) + 1;
        dominant[r.usuario] = dominant[r.usuario] || {};
        dominant[r.usuario][r.sentiment] = (dominant[r.usuario][r.sentiment] || 0) + 1;
    });
    return Object.entries(counts)
        .filter(([, c]) => c >= minCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({
            name, count,
            dominant: Object.entries(dominant[name]).sort((a, b) => b[1] - a[1])[0][0]
        }));
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
    const withDates = rows.filter(r => r.fechaInicio && r.fechaFin);
    if (!withDates.length) return { start: null, end: null, cycles: 0 };
    const starts = withDates.map(r => r.fechaInicio).sort();
    const ends = withDates.map(r => r.fechaFin).sort();
    const cycles = new Set(withDates.map(r => r.fechaInicio + '|' + r.fechaFin)).size;
    return { start: starts[0], end: ends[ends.length - 1], cycles };
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
    sentiment?: string | null;
    red?: string | null;
    origen?: string | null;
    trend?: string | null;
}

export const useReportGenerator = () => {

    const generatePDF = useCallback(async (rows: ReportRow[], sourceLabel: string, images?: ChartImages) => {
        if (!rows.length) return;

        const doc = new JsPDFClass({ unit: 'mm', format: 'a4' });
        const pageW = 210, pageH = 297, margin = 15;
        const contentW = pageW - margin * 2;

        const total = rows.length;
        const neg = rows.filter(r => r.sentiment === 'Negativo').length;
        const negPct = total ? Math.round(neg / total * 100) : 0;
        const unclassified = rows.filter(r => r.campus === 'Sin especificar');
        const campusRanking = calcCampusRanking(rows);
        const topCampus = calcCampusRanking(rows.filter(r => r.campus !== 'Sin especificar'))[0];
        const redAgg = calcRedSocial(rows);
        const period = computePeriod(rows);
        const periodText = period.start ? `${spanishDate(period.start)} – ${spanishDate(period.end)}` : 'No disponible';

        let imgSentiment = images?.sentiment;
        let imgRed = images?.red;
        let imgOrigen = images?.origen;
        let imgTrend = images?.trend;

        if (!imgSentiment || !imgRed || !imgOrigen || !imgTrend) {
            
            const origenAgg = calcOrigen(rows);
            const trendAgg = calcTrend(rows);

            // Dona Analítica con cálculo de porcentajes en las etiquetas
            const sentAgg = calcSentiment(rows);
            const totalSent = sentAgg.data.reduce((a, b) => a + b, 0) || 1;
            const sentLabels = sentAgg.labels.map((l, i) => `${l}: ${Math.round((sentAgg.data[i] / totalSent) * 100)}%`);

            imgSentiment = imgSentiment || await renderOffscreenChart(chartModule, {
                type: 'doughnut',
                data: { labels: sentLabels, datasets: [{ data: sentAgg.data, backgroundColor: sentAgg.colors, borderColor: '#101a2e', borderWidth: 2 }] },
                options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#93a2c0', font: { size: 13 }, boxWidth: 11, boxHeight: 11, padding: 12 } } } }
            }, 480, 480);

            // Barras Agrupadas por Plataforma (Sin Positivos, solo Negativo y Neutral, topado a 100%)
            const uniqueReds = Array.from(new Set(rows.map(r => r.redSocial))).sort();
            const neuData: number[] = [];
            const negData: number[] = [];

            uniqueReds.forEach(network => {
                const networkRows = rows.filter(r => r.redSocial === network);
                const nTotal = networkRows.length;
                if (nTotal === 0) {
                    neuData.push(0); negData.push(0);
                    return;
                }
                const neu = networkRows.filter(r => r.sentiment === 'Neutral').length;
                const rNeg = networkRows.filter(r => r.sentiment === 'Negativo').length;
                
                neuData.push(Math.round((neu / nTotal) * 100));
                negData.push(Math.round((rNeg / nTotal) * 100));
            });

            imgRed = imgRed || await renderOffscreenChart(chartModule, {
                type: 'bar',
                data: { 
                    labels: uniqueReds, 
                    datasets: [
                        { label: 'Negativo', data: negData, backgroundColor: '#e0485a', borderRadius: 4 },
                        { label: 'Neutral', data: neuData, backgroundColor: '#7c8db5', borderRadius: 4 }
                    ] 
                },
                options: { 
                    plugins: { legend: { display: true, position: 'bottom', labels: { color: '#93a2c0', font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 10 } } }, 
                    scales: { 
                        x: { grid: { display: false }, ticks: { color: '#93a2c0' } }, 
                        y: { max: 100, grid: { color: 'rgba(147, 162, 192, 0.1)' }, beginAtZero: true, ticks: { precision: 0, color: '#93a2c0', callback: (v: any) => v + '%' }, border: { display: false } } 
                    } 
                }
            }, 560, 380);

            imgOrigen = imgOrigen || await renderOffscreenChart(chartModule, {
                data: {
                    labels: origenAgg.labels, datasets: [
                        { type: 'bar', label: 'Registros', data: origenAgg.totals, backgroundColor: '#5b8def', borderRadius: 5, yAxisID: 'y' },
                        { type: 'bar', label: '% Negativo', data: origenAgg.negPct, backgroundColor: '#e0485a', borderRadius: 5, yAxisID: 'y1' }
                    ]
                },
                options: {
                    plugins: { legend: { position: 'bottom', labels: { color: '#93a2c0', font: { size: 11 } } } },
                    scales: { x: { grid: { display: false }, ticks: { color: '#93a2c0' } }, y: { position: 'left', grid: { color: 'rgba(147, 162, 192, 0.1)' }, beginAtZero: true, ticks: { color: '#93a2c0' }, border: { display: false } }, y1: { position: 'right', grid: { display: false }, border: { display: false }, beginAtZero: true, max: 100, ticks: { color: '#93a2c0', callback: (v: any) => v + '%' } } }
                }
            }, 560, 380);

            imgTrend = imgTrend || await renderOffscreenChart(chartModule, {
                type: 'line',
                data: {
                    labels: trendAgg.labels, datasets: [
                        { 
                            label: 'Comentarios Totales', 
                            data: trendAgg.totals, 
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
                            data: trendAgg.negPct, 
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
                },
                options: {
                    plugins: { legend: { position: 'bottom', labels: { color: '#93a2c0', font: { size: 11 } } } },
                    layout: { padding: { top: 25, right: 25, left: 15, bottom: 5 } },
                    scales: { 
                        x: { grid: { display: false }, ticks: { maxRotation: 0, minRotation: 0, autoSkip: true, maxTicksLimit: 12, color: '#93a2c0', font: { size: 10.5 }, padding: 10 } }, 
                        y: { position: 'left', grid: { color: 'rgba(147, 162, 192, 0.1)' }, beginAtZero: true, ticks: { color: '#93a2c0' }, border: { display: false }, grace: '25%' }, 
                        y1: { position: 'right', grid: { display: false }, border: { display: false }, beginAtZero: true, max: 100, ticks: { color: '#93a2c0', callback: (v: any) => v + '%' }, grace: '25%' } 
                    }
                }
            }, 900, 380);
        }

        let page = 1;
        let y = 36;
        const drawHeader = () => {
            doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(0, 0, pageW, pageH, 'F'); 
            doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
            doc.text('INNOVA MANAGEMENT', margin, 11);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
            doc.text('Reporte Analítico · Comentarios', margin, 17.5);
            doc.setFontSize(7.5);
            doc.text('Generado: ' + nowStamp(), pageW - margin, 10, { align: 'right' });
            doc.text('Fuente: ' + sourceLabel, pageW - margin, 15.5, { align: 'right' });
            doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.5); doc.line(0, 26, pageW, 26);
        };
        const drawFooter = (pageNum: number) => {
            doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.2); doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
            doc.text('Innova Management · Reporte Ejecutivo Estructurado', margin, pageH - 8);
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
        doc.text(`${total} registros de comentarios  ·  ${period.cycles} ciclo(s) de reporte`, margin, y);
        y += 10;

        const kpiData = [
            { label: 'TOTAL DE REGISTROS', value: String(total), sub: 'Registros analizados', color: COL.info },
            { label: '% SENTIMIENTO NEGATIVO', value: negPct + '%', sub: `${neg} de ${total}`, color: COL.critical },
            { label: 'CAMPUS CRÍTICO', value: topCampus ? String(topCampus[1]) : '—', sub: topCampus ? topCampus[0] : 'Sin datos', color: COL.alert },
            { label: 'RED SOCIAL DOMINANTE', value: redAgg.data[0] !== undefined ? String(redAgg.data[0]) : '—', sub: redAgg.labels[0] || '—', color: COL.verify }
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

        if (unclassified.length) {
            const uSent = calcSentiment(unclassified);
            const uRed = calcRedSocial(unclassified);
            const boxH = 21;
            checkPageBreak(boxH + 4);
            doc.setFillColor(AMBER_BG[0], AMBER_BG[1], AMBER_BG[2]); doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'F');
            doc.setTextColor(AMBER_TEXT[0], AMBER_TEXT[1], AMBER_TEXT[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
            doc.text(`${unclassified.length} comentarios (${Math.round(unclassified.length / total * 100)}%) no tienen campus especificado`, margin + 4, y + 6);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.3); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
            doc.text('Ya están incluidos en las métricas generales; requieren clasificación manual para asignarse a un plantel.', margin + 4, y + 11);
            doc.text('Sentimiento — ' + uSent.labels.map((l, i) => `${l}: ${uSent.data[i]}`).join('   ·   '), margin + 4, y + 16);
            doc.text('Red social — ' + uRed.labels.map((l, i) => `${l}: ${uRed.data[i]}`).join('   ·   '), margin + 4, y + 20);
            y += boxH + 10;
        }

        // 🔥 FIX UI PDF: Rediseño de Layout para que las gráficas se aprecien en tamaño decente (2 Filas)
        sectionTitle('Panorama General de Monitoreo');
        checkPageBreak(120); // Reservamos espacio amplio para evitar cortes
        
        if (imgSentiment) {
            // Fila 1: Dona a la izquierda, Barras a la derecha
            const donutW = 65, donutH = 65; 
            doc.addImage(imgSentiment, 'PNG', margin, y, donutW, donutH);
            
            const redW = contentW - donutW - 10; // ~105mm para las barras (gran legibilidad)
            const redH = redW * (380 / 560);
            const redY = y + (donutH > redH ? (donutH - redH) / 2 : 0); // Centrado vertical relativo a la dona
            
            if (imgRed) doc.addImage(imgRed, 'PNG', margin + donutW + 10, redY, redW, redH);
            
            y += Math.max(donutH, redH) + 12; // Brinco a la siguiente fila
            
            // Fila 2: Origen del contenido (centrado y ancho)
            if (imgOrigen) {
                checkPageBreak(70);
                const origenW = 130; 
                const origenH = origenW * (380 / 560);
                const centerOffsetX = margin + (contentW - origenW) / 2;
                doc.addImage(imgOrigen, 'PNG', centerOffsetX, y, origenW, origenH);
                y += origenH + 10;
            }
        }

        sectionTitle('Tendencia Cronológica de Interacciones');
        if (imgTrend) {
            const trendDispW = contentW, trendDispH = trendDispW * (380 / 900);
            checkPageBreak(trendDispH + 6);
            doc.addImage(imgTrend, 'PNG', margin, y, trendDispW, trendDispH);
            y += trendDispH + 10;
        }

        sectionTitle('Comentarios por Campus');
        const campusMax = campusRanking.length ? campusRanking[0][1] : 1;
        campusRanking.forEach(([name, count]) => {
            checkPageBreak(7);
            const barMaxW = 68;
            const barW = Math.max(2, (count / campusMax) * barMaxW);
            const isUnspecified = name === 'Sin especificar';
            const barCol: RGB = isUnspecified ? COL.alert : COL.info;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
            doc.text(truncateToWidth(doc, name, 58), margin, y + 3.6);
            doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]); doc.rect(margin + 62, y, barMaxW, 3, 'F');
            doc.setFillColor(barCol[0], barCol[1], barCol[2]); doc.rect(margin + 62, y, barW, 3, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
            doc.text(String(count), margin + 62 + barMaxW + 5, y + 3.4);
            y += 6.8;
        });
        y += 5;

        sectionTitle('Radar de Autores Recurrentes');
        const topUsers = calcTopUsers(rows);
        if (!topUsers.length) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
            doc.text('Ningún usuario tiene un comportamiento recurrente registrado.', margin, y);
            y += 8;
        } else {
            topUsers.forEach(u => {
                checkPageBreak(7);
                const dominantCol: RGB = SENTIMENT_COLORS[u.dominant] ? hexToRgb(SENTIMENT_COLORS[u.dominant]) : COL.info;
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
                doc.text(truncateToWidth(doc, u.name, 100), margin, y + 3.6);
                doc.setTextColor(dominantCol[0], dominantCol[1], dominantCol[2]); doc.setFontSize(7.3);
                doc.text(u.dominant, margin + 105, y + 3.6);
                doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.3);
                doc.text(u.count + '×', pageW - margin, y + 3.6, { align: 'right' });
                y += 6.6;
            });
        }
        y += 4;

        sectionTitle('Motor de Trazabilidad — Bitácora de Comentarios');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
        doc.text(`${rows.length} comentarios extraídos bajo los filtros seleccionados`, margin, y);
        y += 6;

        const cols = [
            { label: 'Fecha', width: 16 },
            { label: 'Campus', width: 28 },
            { label: 'Red', width: 18 },
            { label: 'Tono', width: 18 },
            { label: 'Usuario', width: 28 },
            { label: 'Comentario', width: 72 }
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

        const sortedRows = rows.slice().sort((a, b) => (a.fechaInicio || '').localeCompare(b.fechaInicio || ''));
        sortedRows.forEach(r => {
            checkPageBreak(6, drawTableHeader);
            let cx = margin + 2;
            const sentCol: RGB = SENTIMENT_COLORS[r.sentiment] ? hexToRgb(SENTIMENT_COLORS[r.sentiment]) : COL.info;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
            doc.text(r.fechaInicio || '-', cx, y + 3.8); cx += cols[0].width;
            doc.text(truncateToWidth(doc, r.campus, cols[1].width - 2), cx, y + 3.8); cx += cols[1].width;
            doc.text(truncateToWidth(doc, r.redSocial, cols[2].width - 2), cx, y + 3.8); cx += cols[2].width;
            doc.setTextColor(sentCol[0], sentCol[1], sentCol[2]);
            doc.text(truncateToWidth(doc, r.sentiment, cols[3].width - 2), cx, y + 3.8);
            doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
            cx += cols[3].width;
            doc.text(truncateToWidth(doc, r.usuario, cols[4].width - 2), cx, y + 3.8); cx += cols[4].width;
            doc.text(truncateToWidth(doc, r.comentario.replace(/\s+/g, ' ').trim(), cols[5].width - 2), cx, y + 3.8);
            doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.1);
            doc.line(margin, y + 5.4, pageW - margin, y + 5.4);
            y += 6;
        });

        drawFooter(page);

        const fileDate = new Date().toISOString().slice(0, 10);
        const filename = `Innova-Management-Reporte-Comentarios-${fileDate}.pdf`;

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