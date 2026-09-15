// ── Normalización unificada de Menciones ──────────────────────────────────
// Soporta los tres esquemas que conviven en la colección 'comments':
//   1. registrosList          → nuevo form "Redes sociales"
//   2. registrosDigitalesList → nuevo form "Medios digitales"
//   3. comentariosList        → esquema legacy (retrocompatibilidad)
import { extractFuenteLabel, extractFuenteUrl } from './fuenteUtils';

export interface NormalizedMencion {
    id: string;
    usuario: string;
    comentario: string;
    canal: string;
    sentiment: string;
    nivelRiesgo: string;
    estatus: string;
    tipoActor: string;
    sitioWeb: string;
    linkPublicacion: string;
    hallazgo: string;
    metricas: { visualizaciones: string; reacciones: string; comentarios: string; compartidos: string };
    // Etiqueta corta para mostrar (@usuario / dominio) y URL cruda como destino
    fuenteLabel: string;
    fuenteUrl: string | null;
}

const NA = 'N/A';

export const normalizeMenciones = (com: any): NormalizedMencion[] => {
    if (!com) return [];

    // 1. Nuevo form "Redes sociales"
    if (Array.isArray(com.registrosList) && com.registrosList.length > 0) {
        return com.registrosList.map((r: any, i: number) => ({
            id: r.id || `${com.id}-${i}`,
                                    usuario: r.usuarioSitioWeb || NA,
            comentario: r.narrativa === 'Otro' && r.narrativaOtro ? `Otro: ${r.narrativaOtro}` : (r.narrativa || 'Sin narrativa'),
            canal: r.canal || 'N/D',
            sentiment: r.sentiment || '',
            nivelRiesgo: r.nivelRiesgo || '',
            estatus: r.estatus || '',
            tipoActor: r.tipoActor === 'Otro' && r.tipoActorOtro ? `Otro: ${r.tipoActorOtro}` : (r.tipoActor || ''),
            sitioWeb: r.usuarioSitioWeb || '',
            linkPublicacion: r.linkPublicacion || '',
            hallazgo: r.hallazgoReputacional || '',
            metricas: {
                visualizaciones: r.visualizaciones || '',
                reacciones: r.reacciones || '',
                comentarios: r.comentarios || '',
                compartidos: r.compartidos || ''
            },
            fuenteMonitoreo: 'Redes sociales',
            fuenteLabel: extractFuenteLabel(r.usuarioSitioWeb || ''),
            fuenteUrl: extractFuenteUrl(r.usuarioSitioWeb || '')
        }));
    }

    // 2. Nuevo form "Medios digitales"
    if (Array.isArray(com.registrosDigitalesList) && com.registrosDigitalesList.length > 0) {
        return com.registrosDigitalesList.map((r: any, i: number) => ({
            id: r.id || `${com.id}-${i}`,
            usuario: r.sitioWeb || NA,
            comentario: r.narrativa === 'Otro' && r.narrativaOtro ? `Otro: ${r.narrativaOtro}` : (r.narrativa || 'Sin narrativa'),
            canal: 'Medio digital',
            sentiment: r.sentimiento || '',
            nivelRiesgo: r.nivelRiesgo || '',
            estatus: r.estatus || '',
            tipoActor: r.tipoActor === 'Otro' && r.tipoActorOtro ? `Otro: ${r.tipoActorOtro}` : (r.tipoActor || ''),
            sitioWeb: r.sitioWeb || '',
            linkPublicacion: r.linkPublicacion || '',
            hallazgo: r.hallazgoReputacional || '',
            metricas: { visualizaciones: '', reacciones: '', comentarios: '', compartidos: '' },
            fuenteMonitoreo: 'Medios digitales',
            fuenteLabel: extractFuenteLabel(r.sitioWeb || ''),
            fuenteUrl: extractFuenteUrl(r.sitioWeb || '')
        }));
    }

    // 3. Esquema legacy (comentariosList o campos planos)
    const legacyList = Array.isArray(com.comentariosList) && com.comentariosList.length > 0
        ? com.comentariosList
        : [{
            id: com.id,
            usuario: com.usuario || NA,
            comentario: com.descripcion || 'Sin comentario',
            canal: com.canal || com.redSocial || NA,
            sentiment: com.sentiment || ''
        }];

    return legacyList.map((c: any, i: number) => ({
        id: c.id || `${com.id}-${i}`,
        usuario: c.usuario || NA,
        comentario: c.comentario || 'Sin comentario',
        canal: c.canal || c.redSocial || 'N/D',
        sentiment: c.sentiment || '',
        nivelRiesgo: '',
        estatus: '',
        tipoActor: '',
        linkPublicacion: c.linkPublicacion || c.posteoUrl || '',
        hallazgo: '',
        fuenteMonitoreo: 'Redes sociales',
        fuenteLabel: extractFuenteLabel(c.usuario || com.usuario || ''),
        fuenteUrl: extractFuenteUrl(c.usuario || com.usuario || ''),
        metricas: { visualizaciones: '', reacciones: '', comentarios: '', compartidos: '' }
    }));
};

// Fecha canónica del reporte (nuevo y legacy)
export const mencionFecha = (com: any): string =>
    com?.fechaPublicacion || com?.fechaInicio || '';

// ¿El registro está vacío? (para limpiar listas al guardar)
export const isRegistroVacio = (r: any, tipo: 'rs' | 'md'): boolean => {
    if (tipo === 'rs') {
        return !r.usuarioSitioWeb && !r.narrativa && !r.linkPublicacion && !r.sentiment;
    }
    return !r.sitioWeb && !r.narrativa && !r.linkPublicacion && !r.sentimiento;
};

// ── Análisis de datos de menciones ───────────────────────────────────────────

export interface CommentAnalytics {
    total: number;
    byFuente: Record<string, number>;
    bySentiment: Record<string, number>;
    byRiesgo: Record<string, number>;
    byEstatus: Record<string, number>;
    sentimentVsRiesgo: Record<string, number>;
    fuenteVsSentiment: Record<string, number>;
}

export const calcCommentAnalytics = (comments: any[]): CommentAnalytics => {
    const allItems: any[] = [];
    comments.forEach((com) => {
        const normalized = normalizeMenciones(com);
        normalized.forEach((item) => allItems.push(item));
    });

    const emptyCounters = <T extends string>(keys: T[]): Record<T, number> =>
        keys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {} as Record<T, number>);

    const byFuente = emptyCounters(['Redes sociales', 'Medios digitales'] as const);
    const bySentiment = emptyCounters(['Positivo', 'Neutro', 'Negativo'] as const);
    const byRiesgo = emptyCounters(['Bajo', 'Medio', 'Alto', 'Crítico'] as const);
    const byEstatus = emptyCounters(['Monitoreando', 'Escalado', 'Cerrado'] as const);
    const sentimentVsRiesgo: Record<string, number> = {};
    const fuenteVsSentiment: Record<string, number> = {};

    allItems.forEach((item) => {
        const fm = item.fuenteMonitoreo as 'Redes sociales' | 'Medios digitales';
        if (fm) byFuente[fm] = (byFuente[fm] || 0) + 1;
        if (item.sentiment) {
            const sentimentKey = item.sentiment === 'Neutral' ? 'Neutro' : item.sentiment;
            bySentiment[sentimentKey as 'Positivo' | 'Neutro' | 'Negativo'] = (bySentiment[sentimentKey as 'Positivo' | 'Neutro' | 'Negativo'] || 0) + 1;
        }
        if (item.nivelRiesgo) byRiesgo[item.nivelRiesgo as 'Bajo' | 'Medio' | 'Alto' | 'Crítico'] = (byRiesgo[item.nivelRiesgo as 'Bajo' | 'Medio' | 'Alto' | 'Crítico'] || 0) + 1;
        if (item.estatus) byEstatus[item.estatus as 'Monitoreando' | 'Escalado' | 'Cerrado'] = (byEstatus[item.estatus as 'Monitoreando' | 'Escalado' | 'Cerrado'] || 0) + 1;

        const svKey = `${item.sentiment || 'Sin sentimiento'} / ${item.nivelRiesgo || 'Sin riesgo'}`;
        sentimentVsRiesgo[svKey] = (sentimentVsRiesgo[svKey] || 0) + 1;

        const fvKey = `${item.fuenteMonitoreo || 'Sin fuente'} / ${item.sentiment || 'Sin sentimiento'}`;
        fuenteVsSentiment[fvKey] = (fuenteVsSentiment[fvKey] || 0) + 1;
    });

    return {
        total: allItems.length,
        byFuente,
        bySentiment,
        byRiesgo,
        byEstatus,
        sentimentVsRiesgo,
        fuenteVsSentiment,
    };
};