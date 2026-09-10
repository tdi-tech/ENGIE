import { jsPDF as JsPDFClass } from 'jspdf';
import * as chartModule from 'chart.js';
import type { ReportRow } from './csvExport';
import {
    calcPlatforms, calcRiskLevels, calcTimeline, calcTopicsByRisk, calcTopActors,
} from '../hooks/useReportGenerator';

// ── Paleta y primitivos del PDF ejecutivo (mismo lenguaje visual que Analíticas) ──
export const RISK_COLORS: Record<string, string> = {
    'Bajo': '#10B981', 'Medio': '#F59E0B', 'Alto': '#F97316', 'Crítico': '#EF4444'
};
export const SENTIMENT_COLORS: Record<string, string> = {
    'Positivo': '#10B981', 'Neutral': '#F59E0B', 'Neutro': '#F59E0B', 'Negativo': '#EF4444'
};
export const ESTATUS_COLORS: Record<string, string> = {
    'Monitoreo activo': '#3B82F6', 'En revisión': '#F59E0B', 'Seguimiento activo': '#8B5CF6',
    'Escalado': '#EF4444', 'Resuelto': '#10B981', 'Monitoreando': '#3B82F6', 'Cerrado': '#10B981'
};

export type RGB = [number, number, number];
export const NAVY: RGB = [10, 17, 32];
export const CARD_BG: RGB = [16, 26, 46];
export const TEXT_DARK: RGB = [232, 237, 247];
export const TEXT_GRAY: RGB = [147, 162, 192];
export const LINE: RGB = [34, 49, 77];

export const COL = {
    critical: [224, 72, 90] as RGB,
    verify: [47, 217, 196] as RGB,
    alert: [245, 169, 63] as RGB,
    info: [91, 141, 239] as RGB
};

export const hexToRgb = (hex: string): RGB => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [91, 141, 239];
};
const rgbToHex = (c: RGB) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const relLum = (c: RGB) => {
    const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const contrastRatio = (a: RGB, b: RGB) => {
    const l1 = relLum(a), l2 = relLum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
// Texto legible sobre CARD_BG: aclara el color hasta ≥4.5:1 (AA)
export const readableOnDark = (hex: string): RGB => {
    const base = hexToRgb(hex);
    for (let t = 0; t <= 1.0001; t += 0.06) {
        const m: RGB = [base[0] + (255 - base[0]) * t, base[1] + (255 - base[1]) * t, base[2] + (255 - base[2]) * t];
        if (contrastRatio(m, CARD_BG) >= 5) return m.map(Math.round) as RGB;
    }
    return [255, 255, 255];
};
// Relleno de gráficas: garantiza ≥3:1 vs CARD_BG (1.4.11)
export const chartFillOnDark = (hex: string): string => {
    const base = hexToRgb(hex);
    for (let t = 0; t <= 1.0001; t += 0.06) {
        const m: RGB = [base[0] + (255 - base[0]) * t, base[1] + (255 - base[1]) * t, base[2] + (255 - base[2]) * t];
        if (contrastRatio(m, CARD_BG) >= 3) return rgbToHex(m.map(Math.round) as RGB);
    }
    return '#ffffff';
};

export const spanishDate = (dstr: string) => {
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    if (!dstr) return '';
    const parts = dstr.split('-').map(Number);
    const y = parts[0], m = parts[1], d = parts[2];
    if (!y || !m || !d) return dstr;
    return `${d} ${months[m - 1]} ${y}`;
};
export const nowStamp = () => {
    const d = new Date();
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) + " " +
        d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};
export const computePeriod = (rows: ReportRow[]) => {
    const withDates = rows.filter(r => r.fecha);
    if (!withDates.length) return { start: null as string | null, end: null as string | null, cycles: 0 };
    const dates = withDates.map(r => r.fecha).sort();
    const cycles = new Set(rows.map(r => r.fecha)).size;
    return { start: dates[0], end: dates[dates.length - 1], cycles };
};
export const truncateToWidth = (doc: any, text: string, maxWidth: number) => {
    text = (text || '').toString();
    if (!text) return '';
    const lines = doc.splitTextToSize(text, maxWidth);
    if (lines.length <= 1) return lines[0] || '';
    return lines[0].replace(/\s+\S*$/, '') + '…';
};

export const renderOffscreenChart = async (config: any, width: number, height: number): Promise<string | null> => {
    try {
        const Chart = (chartModule as any).Chart || (chartModule as any).default?.Chart || chartModule;
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

export interface HistoryPdfConfig {
    docTitle: string;
    docSubject: string;
    docKeywords: string;
    headerSubtitle: string;
    periodNoun: string;
    filePrefix: string;
    kpis: (rows: ReportRow[], aggs: { platformAgg: any; riskAgg: any }) => { label: string; value: string; sub: string; color: RGB }[];
    timelineLabel: string;
    showTopicsSection: boolean;
    actorsTitle: string;
    detailTitle: string;
    detailCountNoun: string;
    tableCols: { label: string; width: number }[];
    rowCells: (r: ReportRow) => { text: string; color?: RGB }[];
}

export const buildExecutiveHistoryPDF = async (rows: ReportRow[], sourceLabel: string, cfg: HistoryPdfConfig) => {
    if (!rows.length) return;
    const doc = new JsPDFClass({ unit: 'mm', format: 'a4' });
    doc.setLanguage('es');
    doc.setProperties({
        title: `${cfg.docTitle} — ENGIE (${nowStamp()})`,
        subject: cfg.docSubject, author: 'ENGIE Management',
        keywords: cfg.docKeywords, creator: 'ENGIE Management'
    });
    const pageW = 210, pageH = 297, margin = 15;
    const contentW = pageW - margin * 2;
    const period = computePeriod(rows);
    const periodText = (period.start && period.end) ? `${spanishDate(period.start)} – ${spanishDate(period.end)}` : 'No disponible';
    const platformAgg = calcPlatforms(rows);
    const riskAgg = calcRiskLevels(rows);
    const timelineAgg = calcTimeline(rows);
    const topicsAgg = calcTopicsByRisk(rows);
    const donutOpts = { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#93a2c0', font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 10 } } } };
    const imgPlatforms = await renderOffscreenChart({ type: 'doughnut',
        data: { labels: platformAgg.labels, datasets: [{ data: platformAgg.data, backgroundColor: platformAgg.colors.map(chartFillOnDark), borderColor: '#101a2e', borderWidth: 2 }] },
        options: donutOpts }, 480, 480);
    const imgRisk = await renderOffscreenChart({ type: 'doughnut',
        data: { labels: riskAgg.labels, datasets: [{ data: riskAgg.data, backgroundColor: riskAgg.colors.map(chartFillOnDark), borderColor: '#101a2e', borderWidth: 2 }] },
        options: donutOpts }, 480, 480);
    const imgTimeline = await renderOffscreenChart({ type: 'bar',
        data: { labels: timelineAgg.labels, datasets: [
            { label: cfg.timelineLabel, data: timelineAgg.totals, backgroundColor: '#5b8def', borderRadius: 4 },
            { label: 'Crítico', data: timelineAgg.criticos, backgroundColor: '#e0485a', borderRadius: 4 },
            { label: 'Alto', data: timelineAgg.altos, backgroundColor: '#f5a93f', borderRadius: 4 }] },
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#93a2c0', font: { size: 10 }, boxWidth: 10, boxHeight: 10, padding: 8 } } },
            scales: { x: { grid: { display: false }, ticks: { color: '#93a2c0', maxRotation: 45 } },
                y: { grid: { color: 'rgba(147,162,192,0.1)' }, beginAtZero: true, ticks: { color: '#93a2c0', precision: 0 }, border: { display: false } } } } }, 700, 350);
    const imgTopics = cfg.showTopicsSection ? await renderOffscreenChart({ type: 'bar',
        data: { labels: topicsAgg.labels, datasets: [
            { label: 'Crítico', data: topicsAgg.critico, backgroundColor: '#e0485a', borderRadius: 4 },
            { label: 'Alto', data: topicsAgg.alto, backgroundColor: '#f5a93f', borderRadius: 4 },
            { label: 'Medio', data: topicsAgg.medio, backgroundColor: '#7c8db5', borderRadius: 4 },
            { label: 'Bajo', data: topicsAgg.bajo, backgroundColor: '#10B981', borderRadius: 4 }] },
        options: { indexAxis: 'y' as const,
            plugins: { legend: { position: 'bottom', labels: { color: '#93a2c0', font: { size: 10 }, boxWidth: 10, boxHeight: 10, padding: 8 } } },
            scales: { x: { stacked: true, grid: { color: 'rgba(147,162,192,0.1)' }, ticks: { color: '#93a2c0', precision: 0 }, border: { display: false } },
                y: { stacked: true, grid: { display: false }, ticks: { color: '#93a2c0' } } } } }, 700, 350) : null;
    let page = 1, y = 36;
    const drawHeader = () => {
        doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]); doc.rect(0, 0, pageW, pageH, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
        doc.text('ENGIE MANAGEMENT', margin, 11);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        doc.text(cfg.headerSubtitle, margin, 17.5);
        doc.setFontSize(7.5);
        doc.text('Generado: ' + nowStamp(), pageW - margin, 10, { align: 'right' });
        doc.text('Fuente: ' + sourceLabel, pageW - margin, 15.5, { align: 'right' });
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.5); doc.line(0, 26, pageW, 26);
    };
    const drawFooter = (pn: number) => {
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.2); doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
        doc.text('ENGIE Management · ' + cfg.headerSubtitle, margin, pageH - 8);
        doc.text('Página ' + pn, pageW - margin, pageH - 8, { align: 'right' });
    };
    const checkPageBreak = (need: number, redraw?: () => void) => {
        if (y + need > pageH - 18) { drawFooter(page); doc.addPage(); page++; drawHeader(); y = 34; if (redraw) redraw(); }
    };
    const sectionTitle = (t: string) => {
        checkPageBreak(14);
        doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
        doc.text(t.toUpperCase(), margin, y);
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.3); doc.line(margin, y + 2.5, pageW - margin, y + 2.5);
        y += 9;
    };
    drawHeader();


    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
    doc.text('Período Analizado: ' + periodText, margin, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
    doc.text(`${rows.length} ${cfg.periodNoun}  ·  ${period.cycles} fecha(s) distinta(s)`, margin, y); y += 10;
    const kpiData = cfg.kpis(rows, { platformAgg, riskAgg });
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
            const riskW = contentW - donutW - 10, riskH = riskW;
            doc.addImage(imgRisk, 'PNG', margin + donutW + 10, y + (donutH > riskH ? (donutH - riskH) / 2 : 0), riskW, riskH);
        }
        y += 95;
    }
    sectionTitle('Evolución Temporal');
    if (imgTimeline) {
        const timeW = contentW, timeH = timeW * 0.5;
        checkPageBreak(timeH + 6);
        doc.addImage(imgTimeline, 'PNG', margin, y, timeW, timeH); y += timeH + 10;
    }
    if (cfg.showTopicsSection && imgTopics) {
        sectionTitle('Temas por Nivel de Riesgo');
        const topicsW = contentW, topicsH = topicsW * 0.5;
        checkPageBreak(topicsH + 6);
        doc.addImage(imgTopics, 'PNG', margin, y, topicsW, topicsH); y += topicsH + 10;
    }
    sectionTitle(cfg.actorsTitle);
    const topActors = calcTopActors(rows);
    if (!topActors.length) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
        doc.text('No hay actores registrados en este periodo.', margin, y); y += 8;
    } else {
        topActors.forEach(u => {
            checkPageBreak(7);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.3); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
            doc.text(truncateToWidth(doc, u.name, 100), margin, y + 3.6);
            doc.setFontSize(7.3);
            doc.text(u.dominantRisk, margin + 105, y + 3.6);
            doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.3);
            doc.text(u.count + '×', pageW - margin, y + 3.6, { align: 'right' }); y += 6.6;
        });
    }
    y += 4;
    sectionTitle(cfg.detailTitle);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
    doc.text(`${rows.length} ${cfg.detailCountNoun}`, margin, y); y += 6;
    const cols = cfg.tableCols;
    const drawTableHeader = () => {
        doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]); doc.rect(margin, y, contentW, 6, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2]);
        let cx = margin + 2;
        cols.forEach(c => { doc.text(c.label.toUpperCase(), cx, y + 4); cx += c.width; }); y += 7.5;
    };
    checkPageBreak(14); drawTableHeader();
    rows.slice().sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).forEach((r, idx) => {
        checkPageBreak(6, drawTableHeader);
        if (idx % 2 === 1) { doc.setFillColor(22, 32, 54); doc.rect(margin, y, contentW, 5.6, 'F'); }
        let cx = margin + 2;
        cfg.rowCells(r).forEach((cell, ci) => {
            const col = cell.color || TEXT_DARK;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
            doc.setTextColor(col[0], col[1], col[2]);
            doc.text(truncateToWidth(doc, cell.text || '—', cols[ci].width - 2), cx, y + 3.8);
            cx += cols[ci].width;
        });
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.setLineWidth(0.1);
        doc.line(margin, y + 5.4, pageW - margin, y + 5.4); y += 6;
    });
    drawFooter(page);
    const fileDate = new Date().toISOString().slice(0, 10);
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const newTab = window.open(blobUrl, '_blank');
    if (!newTab) {
        const a = document.createElement('a');
        a.href = blobUrl; a.download = `${cfg.filePrefix}-${fileDate}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
};

