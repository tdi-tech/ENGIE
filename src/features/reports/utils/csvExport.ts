import Papa from 'papaparse';

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

export const generateCSV = (rows: ReportRow[]): string => {
    const data = rows.map(r => ({
        'Fecha Inicio': r.fechaInicio,
        'Fecha Fin': r.fechaFin,
        'Contenido Global': r.contenido,
        'Red Social': r.redSocial,
        'Campus': r.campus,
        'Sentiment': r.sentiment,
        'Usuario': r.usuario,
        'Comentario': r.comentario,
        'Posteo Original': r.posteoOriginal,
        'Evidencias': r.evidencias
    }));
    return '\uFEFF' + Papa.unparse(data);
};

export const downloadCSV = (csv: string, filename: string) => {
    const link = document.createElement('a');
    link.href = encodeURI('data:text/csv;charset=utf-8,' + csv);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};