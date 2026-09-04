export interface ReportRow {
    fechaInicio: string;
    fechaFin: string;
    contenido: string;
    redSocial: string;
    campus: string;
    sentiment: string;
    usuario: string;
    comentario: string;
    posteoOriginal: string;
    evidencias: string;
}

export const normalizeComments = (com: any): ReportRow[] => {
    if (com.comentariosList && com.comentariosList.length > 0) {
        return com.comentariosList.map((c: any) => ({
            fechaInicio: com.fechaInicio || '',
            fechaFin: com.fechaFin || '',
            contenido: com.contenido || 'Orgánico',
            redSocial: c.redSocial || 'Facebook comentario',
            campus: c.campus || 'Sin especificar',
            sentiment: c.sentiment || 'Sin clasificar',
            usuario: c.usuario || 'Anónimo',
            comentario: c.comentario || '',
            posteoOriginal: c.posteoTipo === 'url' ? c.posteoUrl : c.posteoTexto,
            evidencias: com.evidencia || ''
        }));
    }
    return [{
        fechaInicio: com.fechaInicio || '',
        fechaFin: com.fechaFin || '',
        contenido: com.contenido || 'Orgánico',
        redSocial: com.redSocial || 'Facebook comentario',
        campus: com.campus || 'Sin especificar',
        sentiment: com.sentiment || 'Sin clasificar',
        usuario: com.usuario || 'Anónimo',
        comentario: com.descripcion || com.comentario || '',
        posteoOriginal: com.posteoTipo === 'url' ? com.posteoUrl : com.posteoTexto,
        evidencias: com.evidencia || ''
    }];
};