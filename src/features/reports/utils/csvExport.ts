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
