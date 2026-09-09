export interface ReportRow {
    id: string;
    fecha: string;
    fuenteDeteccion: string;
    actorFuente: string;
    tipoFuente: string;
    temaPrincipal: string;
    nivelRiesgo: string;
    alcanceActual: string;
    tendencia: string;
    resumen: string;
    hallazgosClave: string;
    estado: string;
    area: string;
    totalIncidencias: number;
    autor: string;
    // Campos de menciones (modelo actual: comentarios/registrosList)
    fuenteMonitoreo?: string;
    sentimiento?: string;
    linkPublicacion?: string;
    evidencia?: string;
    metricas?: {
        visualizaciones?: string | number;
        reacciones?: string | number;
        comentarios?: string | number;
        compartidos?: string | number;
    };
}

export const normalizeMention = (inc: any): ReportRow => {
    return {
        id: inc.id || '',
        fecha: inc.fecha || '',
        fuenteDeteccion: inc.fuenteDeteccion || inc.medio || 'Sin especificar',
        actorFuente: inc.actorFuente || inc.usuario || 'Anónimo',
        tipoFuente: inc.tipoFuente || 'Sin clasificar',
        temaPrincipal: inc.temaPrincipal || 'Sin clasificar',
        nivelRiesgo: inc.nivelRiesgoReputacional || inc.nivelRiesgo || 'Bajo',
        alcanceActual: inc.alcanceActual || 'Sin especificar',
        tendencia: inc.tendencia || 'Sin especificar',
        resumen: inc.resumenIncidente || inc.resumen || inc.descripcion || '',
        hallazgosClave: inc.hallazgosClave || '',
        estado: inc.estado || 'Monitoreo activo',
        area: inc.area || 'Sin asignar',
        totalIncidencias: Number(inc.totalIncidencias) || 1,
        autor: inc.autor || 'Administrador',
    };
};

export const normalizeMentions = (data: any): ReportRow[] => {
    if (Array.isArray(data)) {
        return data.map(normalizeMention);
    }
    if (data.comentariosList && data.comentariosList.length > 0) {
        return data.comentariosList.map((c: any) => normalizeMention({
            ...data,
            ...c,
            id: c.id || data.id,
            fecha: data.fecha || c.fecha
        }));
    }
    return [normalizeMention(data)];
};

/* ============================================================
   ADAPTADORES DE MENCIONES (modelo actual: registrosList /
   registrosDigitalesList y CSV del historial de menciones)
   ============================================================ */

// Registro expandido de mención → fila analítica
// Mapeo: canal/sitioWeb→fuenteDeteccion · usuario→actorFuente · tipoActor→tipoFuente
//        narrativa→temaPrincipal · nivelRiesgo→nivelRiesgo · estatus→estado · hallazgo→resumen
export const normalizeMencionRow = (c: any, i: any = {}): ReportRow => ({
    id: c.id || i.id || '',
    fecha: (i.fechaPublicacion || '').split('T')[0] || '',
    fuenteDeteccion: c.canal || c.sitioWeb || c.usuarioSitioWeb || 'N/D',
    actorFuente: c.usuario || c.usuarioSitioWeb || 'Anónimo',
    tipoFuente: c.tipoActor || 'Sin clasificar',
    temaPrincipal: c.narrativa || 'Sin clasificar',
    nivelRiesgo: c.nivelRiesgo || 'Bajo',
    alcanceActual: 'N/A',
    tendencia: 'N/A',
    resumen: c.hallazgo || c.comentario || '',
    hallazgosClave: c.hallazgo || '',
    estado: c.estatus || '',
    area: '',
    totalIncidencias: 1,
    autor: i.autor || '',
    fuenteMonitoreo: c.fuenteMonitoreo || i.fuenteMonitoreo || '',
    sentimiento: c.sentiment || c.sentimiento || '',
    linkPublicacion: c.linkPublicacion || '',
    evidencia: i.evidencia || '',
    metricas: c.metricas || {},
});

// Documento de la colección comments (menciones) → filas analíticas
// Expande registrosList / registrosDigitalesList a una fila por registro
export const normalizeMencionesDb = (data: any): ReportRow[] => {
    const list: any[] = data.registrosList || data.registrosDigitalesList || [];
    if (list.length === 0) return [];
    return list
        .filter((c: any) => c && (c.canal || c.usuarioSitioWeb || c.usuario || c.sitioWeb))
        .map((c: any) => normalizeMencionRow({ ...c, fuenteMonitoreo: data.fuenteMonitoreo }, data));
};

// Fila del CSV exportado del historial de menciones → fila analítica
export const normalizeCsvMenciones = (vals: any): ReportRow => ({
    id: vals['ID'] || '',
    fecha: vals['Fecha Publicación'] || vals['Fecha'] || '',
    fuenteDeteccion: vals['Canal'] || vals['Usuario o Sitio Web'] || vals['Plataforma'] || vals['Fuente Detección'] || 'N/D',
    actorFuente: vals['Usuario o Sitio Web'] || vals['Actor'] || vals['Usuario'] || 'Anónimo',
    tipoFuente: vals['Tipo de Actor'] || vals['Tipo'] || vals['Tipo Fuente'] || 'Sin clasificar',
    temaPrincipal: vals['Narrativa'] || vals['Tema'] || vals['Tema Principal'] || 'Sin clasificar',
    nivelRiesgo: vals['Nivel de Riesgo'] || vals['Riesgo'] || vals['Nivel Riesgo'] || 'Bajo',
    alcanceActual: vals['Alcance'] || 'N/A',
    tendencia: vals['Tendencia'] || 'N/A',
    resumen: vals['Hallazgo Reputacional'] || vals['Resumen'] || vals['Descripción'] || '',
    hallazgosClave: vals['Hallazgo Reputacional'] || vals['Hallazgos'] || '',
    estado: vals['Estatus'] || vals['Estado'] || '',
    area: vals['Área'] || vals['Area'] || '',
    totalIncidencias: parseInt(vals['Total']) || 1,
    autor: vals['Autor'] || 'Administrador',
    fuenteMonitoreo: vals['Fuente Monitoreo'] || '',
    sentimiento: vals['Sentimiento'] || '',
    linkPublicacion: vals['Link Publicación'] || '',
    evidencia: vals['Evidencias'] || '',
    metricas: {
        visualizaciones: vals['Visualizaciones'] || '',
        reacciones: vals['Reacciones'] || '',
        comentarios: vals['Comentarios'] || '',
        compartidos: vals['Compartidos'] || '',
    },
});

// Detección de esquema: ¿es un CSV de menciones (modelo actual) o de incidencias (legacy)?
export const isMencionesCsv = (vals: any): boolean =>
    'Fuente Monitoreo' in vals || 'Canal' in vals || 'Sentimiento' in vals || 'Narrativa' in vals;
