// ── Datos de demostración para modo DESCONECTADO (VITE_USE_MOCK_DB=true) ──
// Seed para que el Dashboard muestre contenido real (menciones + incidencias)
// con los esquemas que ya entienden normalizeMenciones / normalizeIncidencia.

// Incidencias reputacionales (esquema nuevo "Incidente Reputacional")
export const MOCK_RRSS_INCIDENTS: any[] = [
    {
        id: 'mock-inc-1', fecha: '2026-04-08',
        fuenteDeteccion: 'X', tipoFuente: 'Red social', actorFuente: '@cliente_a',
        temaPrincipal: 'Calidad de servicio', resumenIncidente: 'Queja por corte de suministro sin aviso previo.',
        nivelRiesgoReputacional: 'Crítico', alcanceActual: 'Local', tendencia: 'Aumentando',
        estado: 'Seguimiento activo', totalIncidencias: 12
    },
    {
        id: 'mock-inc-2', fecha: '2026-04-07',
        fuenteDeteccion: 'Facebook', tipoFuente: 'Red social', actorFuente: 'Vecinos de la Comarca',
        temaPrincipal: 'Seguridad y regulación', resumenIncidente: 'Denuncia de instalación sin permisos en zona residencial.',
        nivelRiesgoReputacional: 'Alto', alcanceActual: 'Regional', tendencia: 'Aumentando',
        estado: 'En revisión', totalIncidencias: 8
    },
    {
        id: 'mock-inc-3', fecha: '2026-04-05',
        fuenteDeteccion: 'LinkedIn', tipoFuente: 'Red social', actorFuente: 'Trabajador obra A',
        temaPrincipal: 'Laboral', resumenIncidente: 'Publicación crítica sobre condiciones laborales en obra.',
        nivelRiesgoReputacional: 'Medio', alcanceActual: 'Aislado', tendencia: 'Estable',
        estado: 'Monitoreo activo', totalIncidencias: 3
    },
    {
        id: 'mock-inc-4', fecha: '2026-04-03',
        fuenteDeteccion: 'Instagram', tipoFuente: 'Red social', actorFuente: 'ONG Ambiental',
        temaPrincipal: 'Medio ambiente', resumenIncidente: 'Mención sobre parques eólicos y su impacto.',
        nivelRiesgoReputacional: 'Bajo', alcanceActual: 'Local', tendencia: 'Disminuyendo',
        estado: 'Resuelto / solucionado', totalIncidencias: 1
    }
];

// Menciones (combina nuevo form "Redes sociales" + "Medios digitales")
export const MOCK_COMMENTS: any[] = [
    {
        id: 'mock-com-1', fechaPublicacion: '2026-04-08', horaDeteccion: '10:24',
        fuenteMonitoreo: 'Redes sociales',
        registrosList: [
            { id: 'm1', canal: 'X', usuarioSitioWeb: '@cliente1', narrativa: 'Excelente atención del equipo técnico en mi zona.', sentiment: 'positivo', nivelRiesgo: 'Bajo', estatus: 'Monitoreo activo', tipoActor: 'Ciudadano', linkPublicacion: '#' },
            { id: 'm2', canal: 'Facebook', usuarioSitioWeb: 'Marta G.', narrativa: 'Aún sin restablecer el servicio tras el corte.', sentiment: 'negativo', nivelRiesgo: 'Alto', estatus: 'Seguimiento activo', tipoActor: 'Cliente', linkPublicacion: '#' },
            { id: 'm3', canal: 'Instagram', usuarioSitioWeb: 'green_co', narrativa: 'Buena iniciativa de reciclaje vehicular.', sentiment: 'positivo', nivelRiesgo: 'Bajo', estatus: 'Monitoreo activo', tipoActor: 'ONG', linkPublicacion: '#' }
        ]
    },
    {
        id: 'mock-com-2', fechaPublicacion: '2026-04-06', horaDeteccion: '17:05',
        fuenteMonitoreo: 'Medios digitales',
        registrosDigitalesList: [
            { id: 'd1', sitioWeb: 'Noticias Energía', narrativa: 'Informe neutro sobre la nueva tarifa de electricidad.', sentimiento: 'neutral', nivelRiesgo: 'Medio', estatus: 'En revisión', tipoActor: 'Medio', linkPublicacion: '#' },
            { id: 'd2', sitioWeb: 'Foro Vecinal', narrativa: 'Reclamo colectivo por alumbrado en falla.', sentimiento: 'negativo', nivelRiesgo: 'Crítico', estatus: 'Seguimiento activo', tipoActor: 'Ciudadano', linkPublicacion: '#' }
        ]
    },
    {
        id: 'mock-com-3', fechaPublicacion: '2026-04-04', horaDeteccion: '09:12',
        fuenteMonitoreo: 'Redes sociales',
        registrosList: [
            { id: 'm4', canal: 'LinkedIn', usuarioSitioWeb: 'Dir. Comunicación', narrativa: 'Felicitaciones por el programa de sostenibilidad.', sentiment: 'positivo', nivelRiesgo: 'Bajo', estatus: 'Resuelto / solucionado', tipoActor: 'Institucional', linkPublicacion: '#' }
        ]
    }
];

