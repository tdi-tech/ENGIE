import { useCallback } from 'react';
import type { ReportRow } from '../../reports/utils/csvExport';
import { buildExecutiveHistoryPDF, COL, TEXT_DARK, readableOnDark, RISK_COLORS, ESTATUS_COLORS, type HistoryPdfConfig } from '../../reports/utils/executivePdf';

export const RRSS_HISTORY_PDF: HistoryPdfConfig = {
    docTitle: 'Reporte de Incidencias · Historial RRSS',
    docSubject: 'Reporte Ejecutivo · Incidencias RRSS',
    docKeywords: 'incidencias, rrss, reporte, engie',
    headerSubtitle: 'Reporte Ejecutivo · Incidencias RRSS',
    periodNoun: 'incidencias registradas',
    filePrefix: 'ENGIE-Incidencias-RRSS',
    timelineLabel: 'Total Incidencias',
    showTopicsSection: true,
    actorsTitle: 'Top Actores / Fuentes',
    detailTitle: 'Detalle de Incidencias',
    detailCountNoun: 'incidencias bajo los filtros seleccionados',
    kpis: (rows: ReportRow[], { platformAgg }: { platformAgg: any }) => {
        const total = rows.length;
        const criticos = rows.filter((r: ReportRow) => r.nivelRiesgo === 'Crítico').length;
        const altos = rows.filter((r: ReportRow) => r.nivelRiesgo === 'Alto').length;
        return [
            { label: 'TOTAL INCIDENCIAS', value: String(total), sub: 'Registros analizados', color: COL.info },
            { label: 'RIESGO CRÍTICO', value: String(criticos), sub: `${total ? Math.round(criticos / total * 100) : 0}% del total`, color: COL.critical },
            { label: 'RIESGO ALTO', value: String(altos), sub: `${total ? Math.round(altos / total * 100) : 0}% del total`, color: COL.alert },
            { label: 'FUENTE TOP', value: platformAgg.data[0] !== undefined ? String(platformAgg.data[0]) : '—', sub: platformAgg.labels[0] || '—', color: COL.verify },
        ];
    },
    tableCols: [
        { label: 'Fecha', width: 20 }, { label: 'Fuente', width: 26 },
        { label: 'Actor', width: 28 }, { label: 'Riesgo', width: 15 },
        { label: 'Tema', width: 33 }, { label: 'Alcance', width: 18 },
        { label: 'Tendencia', width: 20 }, { label: 'Estado', width: 20 },
    ],
    rowCells: (r: ReportRow) => {
        const T = TEXT_DARK;
        return [
            { text: r.fecha || '-', color: T },
            { text: r.fuenteDeteccion, color: T },
            { text: r.actorFuente, color: T },
            { text: r.nivelRiesgo, color: readableOnDark(RISK_COLORS[r.nivelRiesgo] || '#6B7280') },
            { text: r.temaPrincipal, color: T },
            { text: r.alcanceActual || '—', color: T },
            { text: r.tendencia || '—', color: T },
            { text: r.estado || '—', color: readableOnDark(ESTATUS_COLORS[r.estado] || '#6B7280') },
        ];
    },
};

export const useRrssPdfExport = () => {
    const generateRRSSHistoryPDF = useCallback(async (rows: ReportRow[], sourceLabel: string) => {
        await buildExecutiveHistoryPDF(rows, sourceLabel, RRSS_HISTORY_PDF);
    }, []);
    return { generateRRSSHistoryPDF };
};
