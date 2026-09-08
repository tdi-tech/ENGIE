// ── Normalización unificada de Menciones ──────────────────────────────────
// Soporta los tres esquemas que conviven en la colección 'comments':
//   1. registrosList          → nuevo form "Redes sociales"
//   2. registrosDigitalesList → nuevo form "Medios digitales"
//   3. comentariosList        → esquema legacy (retrocompatibilidad)
export interface NormalizedMencion {
    id: string;
    usuario: string;
    comentario: string;
    redSocial: string;
    sentiment: string;
    nivelRiesgo: string;
    estatus: string;
    tipoActor: string;
    campus: string;
    posteoTipo: string;
    posteoUrl: string;
    posteoTexto: string;
    linkPublicacion: string;
    hallazgo: string;
    metricas: { visualizaciones: string; reacciones: string; comentarios: string; compartidos: string };
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
            redSocial: r.canal || 'N/D',
            sentiment: r.sentiment || '',
            nivelRiesgo: r.nivelRiesgo || '',
            estatus: r.estatus || '',
            tipoActor: r.tipoActor === 'Otro' && r.tipoActorOtro ? `Otro: ${r.tipoActorOtro}` : (r.tipoActor || ''),
            campus: 'Sin especificar',
            posteoTipo: 'url',
            posteoUrl: r.linkPublicacion || '',
            posteoTexto: '',
            linkPublicacion: r.linkPublicacion || '',
            hallazgo: r.hallazgoReputacional || '',
            metricas: {
                visualizaciones: r.visualizaciones || '',
                reacciones: r.reacciones || '',
                comentarios: r.comentarios || '',
                compartidos: r.compartidos || ''
            },
            fuenteMonitoreo: 'Redes sociales'
        }));
    }

    // 2. Nuevo form "Medios digitales"
    if (Array.isArray(com.registrosDigitalesList) && com.registrosDigitalesList.length > 0) {
        return com.registrosDigitalesList.map((r: any, i: number) => ({
            id: r.id || `${com.id}-${i}`,
            usuario: r.sitioWeb || NA,
            comentario: r.narrativa === 'Otro' && r.narrativaOtro ? `Otro: ${r.narrativaOtro}` : (r.narrativa || 'Sin narrativa'),
            redSocial: r.sitioWeb || 'Medio digital',
            sentiment: r.sentimiento || '',
            nivelRiesgo: r.nivelRiesgo || '',
            estatus: r.estatus || '',
            tipoActor: r.tipoActor === 'Otro' && r.tipoActorOtro ? `Otro: ${r.tipoActorOtro}` : (r.tipoActor || ''),
            campus: 'Sin especificar',
            posteoTipo: 'url',
            posteoUrl: r.linkPublicacion || '',
            posteoTexto: '',
            linkPublicacion: r.linkPublicacion || '',
            hallazgo: r.hallazgoReputacional || '',
            metricas: { visualizaciones: '', reacciones: '', comentarios: '', compartidos: '' },
            fuenteMonitoreo: 'Medios digitales'
        }));
    }

    // 3. Esquema legacy (comentariosList o campos planos)
    const legacyList = Array.isArray(com.comentariosList) && com.comentariosList.length > 0
        ? com.comentariosList
        : [{
            id: com.id,
            usuario: com.usuario || NA,
            comentario: com.descripcion || 'Sin comentario',
            redSocial: com.redSocial || 'Facebook comentario',
            campus: com.campus || 'Sin especificar',
            sentiment: com.sentiment || '',
            posteoTipo: com.posteoTipo || 'url',
            posteoUrl: com.posteoUrl || '',
            posteoTexto: com.posteoTexto || ''
        }];

    return legacyList.map((c: any, i: number) => ({
        id: c.id || `${com.id}-${i}`,
        usuario: c.usuario || NA,
        comentario: c.comentario || 'Sin comentario',
        redSocial: c.redSocial || 'Facebook comentario',
        sentiment: c.sentiment || '',
        nivelRiesgo: '',
        estatus: '',
        tipoActor: '',
        campus: c.campus || com.campus || 'Sin especificar',
        posteoTipo: c.posteoTipo || 'url',
        posteoUrl: c.posteoUrl || '',
        posteoTexto: c.posteoTexto || '',
        linkPublicacion: c.posteoUrl || '',
        hallazgo: '',
        fuenteMonitoreo: 'Redes sociales',
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