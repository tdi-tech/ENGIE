// ── Normalización unificada de Incidencias (Reputacional) ──────────────────
// Soporta los dos esquemas que conviven en la colección 'rrss_incidents':
//   1. Nuevo form "Incidente Reputacional"
//      (actorFuente, fuenteDeteccion, tipoFuente, temaPrincipal,
//       nivelRiesgoReputacional, alcanceActual, tendencia, resumenIncidente,
//       hallazgosClave, enlacePublicacion, enlaceDrive, reporteTexto)
//   2. Esquema legacy (RRSS): medio, usuario, descripcion, riesgo,
//      totalIncidencias, area, comentarios
// NOTA: `campus` es un campo del proyecto anterior; se conserva solo por
// compatibilidad con documentos legacy de Firestore. No se captura en el form.
export interface NormalizedIncidencia {
    id: string;
    fecha: string;
    fuenteDeteccion: string;   // canal / medio
    actorFuente: string;       // actor / usuario
    tipoFuente: string;
    temaPrincipal: string;
    resumen: string;           // resumenIncidente / descripcion
    hallazgosClave: string;
    nivelRiesgo: number | string;
    alcanceActual: string;
    tendencia: string;
    campus: string; // legacy (proyecto anterior); nunca se captura en el form nuevo
    estado: string;
    area: string;
    totalIncidencias: number;
    comentarios: string;
    autor: string;
    enlacePublicacion: string;
    enlaceDrive: string;
    reporteTexto: string;
}

const NA = 'N/A';

const riesgoKey = (riesgo: string): string => {
    if (!riesgo) return 'Bajo';
    if (riesgo === 'Critico') return 'Crítico';
    return riesgo;
};

// Normaliza un documento de rrss_incidents a campos canónicos
export const normalizeIncidencia = (inc: any): NormalizedIncidencia => {
    if (!inc) {
        return {
            id: '', fecha: '', fuenteDeteccion: NA, actorFuente: NA, tipoFuente: '',
            temaPrincipal: '', resumen: '', hallazgosClave: '', nivelRiesgo: 'Bajo',
            alcanceActual: '', tendencia: '', campus: 'Sin especificar', estado: 'Monitoreo activo',
            area: 'Operaciones', totalIncidencias: 1, comentarios: '', autor: '',
            enlacePublicacion: '', enlaceDrive: '', reporteTexto: ''
        };
    }

    // Esquema nuevo (Reputacional)
    const isNew = !!inc.actorFuente || !!inc.resumenIncidente || !!inc.nivelRiesgoReputacional;

    return {
        id: inc.id || '',
        fecha: inc.fecha || '',
        fuenteDeteccion: inc.fuenteDeteccion || inc.medio || NA,
        actorFuente: inc.actorFuente || inc.usuario || NA,
        tipoFuente: inc.tipoFuente || '',
        temaPrincipal: inc.temaPrincipal || '',
        resumen: inc.resumenIncidente || inc.descripcion || 'Sin descripción',
        hallazgosClave: inc.hallazgosClave || '',
        nivelRiesgo: isNew ? (inc.nivelRiesgoReputacional || 'Bajo') : riesgoKey(inc.riesgo || 'Bajo'),
        alcanceActual: inc.alcanceActual || '',
        tendencia: inc.tendencia || '',
        campus: inc.campus || 'Sin especificar',
        estado: inc.estado || 'Monitoreo activo',
        area: inc.area || 'Operaciones',
        totalIncidencias: (Number(inc.totalIncidencias) || 1),
        comentarios: inc.comentarios || '',
        autor: inc.autor || '',
        enlacePublicacion: inc.enlacePublicacion || '',
        enlaceDrive: inc.enlaceDrive || '',
        reporteTexto: inc.reporteTexto || ''
    };
};

// Subsistema de pesos (nuevo form de Reputacional):
const FUENTES = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'X'];
const TEMAS = ['Seguridad y regulación', 'Responsabilidad social', 'Calidad de servicio', 'Laboral', 'Medio ambiente', 'Otro'];
const RIESGOS = ['Bajo', 'Medio', 'Alto', 'Crítico'];
const ALCANCES = ['Aislado', 'Local', 'Regional', 'Nacional', 'Viral'];
const TENDENCIAS = ['Aumentando', 'Estable', 'Disminuyendo'];
const TIPOS = ['Queja', 'Denuncia', 'Viralización', 'Rumor', 'Otro'];

// Mapeo del nivel de riesgo (legacy numérico a cadena, si hiciera falta)
export const riesgoValue = (riesgo: number | string): string => {
    if (typeof riesgo === 'number') {
        return riesgo <= 0 ? 'Bajo' : riesgo === 1 ? 'Medio' : riesgo === 2 ? 'Alto' : 'Crítico';
    }
    return riesgoKey(riesgo as string);
};

export { FUENTES, TEMAS, RIESGOS, ALCANCES, TENDENCIAS, TIPOS };