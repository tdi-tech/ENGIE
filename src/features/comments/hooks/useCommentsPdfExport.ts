import { useCallback } from 'react';
import type { ReportRow } from '../../reports/utils/csvExport';
import { buildExecutiveHistoryPDF, COL, TEXT_DARK, readableOnDark, RISK_COLORS, SENTIMENT_COLORS, ESTATUS_COLORS, type HistoryPdfConfig } from '../../reports/utils/executivePdf';

export const COMMENTS_HISTORY_PDF: HistoryPdfConfig = {
    docTitle: 'Reporte de Menciones · Historial de Menciones',
    docSubject: 'Reporte Ejecutivo · Menciones',
    docKeywords: 'menciones, comentarios, reporte, engie',
    headerSubtitle: 'Reporte Ejecutivo · Menciones',
    periodNoun: 'menciones registradas',
    filePrefix: 'ENGIE-Menciones-Historial',
    timelineLabel: 'Total Menciones',
    showTopicsSection: true,
    actorsTitle: 'Top Actores / Fuentes',
    detailTitle: 'Detalle de Menciones',
    detailCountNoun: 'menciones bajo los filtros seleccionados',
    kpis: (rows: ReportRow[], { platformAgg }: { platformAgg: any }) => {
        const total = rows.length;
        const negativos = rows.filter((r: ReportRow) => (r.sentimiento || '') === 'Negativo').length;
        const critAlto = rows.filter((r: ReportRow) => r.nivelRiesgo === 'Crítico' || r.nivelRiesgo === 'Alto').length;
        return [
            { label: 'TOTAL MENCIONES', value: String(total), sub: 'Registros analizados', color: COL.info },
            { label: 'SENT. NEGATIVO', value: String(negativos), sub: `${total ? Math.round(negativos / total * 100) : 0}% del total`, color: COL.critical },
            { label: 'RIESGO CRÍT.+ALTO', value: String(critAlto), sub: `${total ? Math.round(critAlto / total * 100) : 0}% del total`, color: COL.alert },
            { label: 'CANAL TOP', value: platformAgg.data[0] !== undefined ? String(platformAgg.data[0]) : '—', sub: platformAgg.labels[0] || '—', color: COL.verify },
        ];
    },
    tableCols: [
        { label: 'Fecha', width: 20 }, { label: 'Canal', width: 24 },
        { label: 'Tipo Actor', width: 18 }, { label: 'Riesgo', width: 15 },
        { label: 'Narrativa', width: 33 }, { label: 'Sentimiento', width: 17 },
        { label: 'Usuario/Sitio', width: 35 }, { label: 'Estatus', width: 18 },
    ],
    rowCells: (r: ReportRow) => {
        const T = TEXT_DARK;
        return [
            { text: r.fecha || '-', color: T },
            { text: r.fuenteDeteccion, color: T },
            { text: r.tipoFuente, color: T },
            { text: r.nivelRiesgo, color: readableOnDark(RISK_COLORS[r.nivelRiesgo] || '#6B7280') },
            { text: r.temaPrincipal, color: T },
            { text: r.sentimiento || '—', color: readableOnDark(SENTIMENT_COLORS[r.sentimiento || ''] || '#6B7280') },
            { text: r.actorFuente, color: T },
            { text: r.estado || '—', color: readableOnDark(ESTATUS_COLORS[r.estado] || '#6B7280') },
        ];
    },
};

export const useCommentsPdfExport = () => {
    const generateCommentsHistoryPDF = useCallback(async (rows: ReportRow[], sourceLabel: string) => {
        await buildExecutiveHistoryPDF(rows, sourceLabel, COMMENTS_HISTORY_PDF);
    }, []);
    return { generateCommentsHistoryPDF };
};
