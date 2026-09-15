import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
    Save, Download, Trash2, Smartphone, Printer, X, Edit3, Link as LinkIcon, HardDrive, 
    Search, ChevronDown, ChevronRight, ChevronLeft, FileText, Loader2, Calendar, AlertTriangle,
    CheckSquare, Check
} from 'lucide-react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db, appId, IS_MOCK } from '../../../services/firebase/config';
import { getMonthName } from '../../../shared/utils/date';
import { normalizeIncidencia, riesgoValue } from '../../../shared/utils/incidencias';
import DOMPurify from 'dompurify'; 

const inputStyles = "w-full p-3 rounded-xl theme-bg-low border theme-border theme-text-main focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm";
const optionStyles = "theme-bg-container theme-text-main font-medium";
const editorStyles = `.wysiwyg-content ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin: 0.5rem 0; } .wysiwyg-content ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin: 0.5rem 0; }`;

// Vocabulario reputacional del formulario — única fuente de verdad para form y filtros
const FUENTES_DETECCION = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'X', 'Medios Digitales'];
const TEMAS_PRINCIPALES = ['Seguridad y regulación', 'Comunidades e impacto social', 'Legal y derechos humanos', 'Medio ambiente', 'Afectaciones o riesgos', 'Avances de obra e infraestructura', 'Reputación corporativa'];
const NIVELES_RIESGO = ['Bajo', 'Medio', 'Alto', 'Crítico'];

const EditorToolbar = ({ onCommand }: { onCommand: (cmd: string, val?: string) => void }) => {
    return (
        <div className="flex flex-wrap items-center gap-2 p-2 border-b theme-border bg-black/20 text-gray-400 select-none">
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('undo')} className="p-1.5 hover:bg-white/10 rounded hover:text-white transition-colors" title="Deshacer (Ctrl+Z)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg></button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <select onChange={(e) => onCommand('fontSize', e.target.value)} className="bg-transparent border border-gray-600 rounded text-xs p-1 outline-none hover:border-gray-400 theme-text-main cursor-pointer" title="Tamaño de texto" defaultValue="3">
                <option className={optionStyles} value="1">Muy Pequeño</option><option className={optionStyles} value="2">Pequeño</option><option className={optionStyles} value="3">Normal</option><option className={optionStyles} value="4">Mediano</option><option className={optionStyles} value="5">Grande</option><option className={optionStyles} value="6">Muy Grande</option><option className={optionStyles} value="7">Título</option>
            </select>
            <input type="color" aria-label="Color de texto" onChange={(e) => onCommand('foreColor', e.target.value)} className="w-6 h-6 p-0 border border-gray-600 rounded cursor-pointer bg-transparent hover:border-gray-400" title="Color de texto" />
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('bold')} className="px-2 py-1 font-bold text-sm hover:bg-white/10 rounded hover:text-white transition-colors" title="Negrita">B</button>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('italic')} className="px-2 py-1 italic font-serif text-sm hover:bg-white/10 rounded hover:text-white transition-colors" title="Cursiva">I</button>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('underline')} className="px-2 py-1 underline text-sm hover:bg-white/10 rounded hover:text-white transition-colors" title="Subrayado">U</button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('insertUnorderedList')} className="p-1.5 hover:bg-white/10 rounded hover:text-white transition-colors" title="Lista con viñetas"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('removeFormat')} className="px-2 py-1 text-xs font-bold hover:bg-white/10 rounded hover:text-white transition-colors" title="Limpiar Formato">Tx</button>
        </div>
    );
};

export const NewRRSSIncidentView = ({ isAdmin, showToast, navigate, user, logAction }: any) => {
    const [formData, setFormData] = useState({
        totalIncidencias: 1, fecha: new Date().toISOString().split('T')[0],
        actorFuente: '', fuenteDeteccion: 'Facebook', tipoFuente: 'Queja',
        temaPrincipal: 'Seguridad y regulación', nivelRiesgoReputacional: 'Bajo',
        alcanceActual: 'Aislado', tendencia: 'Estable',
        resumenIncidente: '', hallazgosClave: '',
        enlacePublicacion: '', enlaceDrive: '', reporteTexto: '', estado: 'Monitoreo activo'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    const execCommand = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setFormData(prev => ({ ...prev, reporteTexto: editorRef.current?.innerHTML || '' }));
            if (command !== 'foreColor' && command !== 'fontSize') editorRef.current.focus();
        }
    };

    const handleEditorBlur = () => { if (editorRef.current) setFormData(prev => ({ ...prev, reporteTexto: editorRef.current?.innerHTML || '' })); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return showToast('Permisos insuficientes.', true);
        setIsSubmitting(true);
        try {
            const finalReporte = editorRef.current ? editorRef.current.innerHTML : formData.reporteTexto;
            const cleanHTML = DOMPurify.sanitize(finalReporte); 
            const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'rrss_incidents'), {
                ...formData, reporteTexto: cleanHTML, autor: user?.displayName || 'Administrador', timestamp: new Date().toISOString()
            });
            
            if (logAction) await logAction('Creó un nuevo reporte de reputación', 'Incidencia RRSS', 'create', docRef.id);

            showToast('Incidente RRSS guardado exitosamente.'); navigate('historial-rss');
        } catch (error) { showToast('Error al guardar el incidente.', true); }
        setIsSubmitting(false);
    };

    return (
        <>
            <style>{editorStyles}</style>
            <div className="max-w-5xl mx-auto space-y-10 fade-in pb-16">

                <div className="theme-bg-container p-6 sm:p-10 rounded-[2rem] border theme-border shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-700">
                        <Smartphone className="w-48 h-48" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Smartphone className="w-4 h-4" /> Reputación Digital
                        </p>
                        <h2 className="text-4xl font-black theme-text-main mb-4 tracking-tight">Crear Incidente Reputacional</h2>
                        <p className="theme-text-muted text-base max-w-2xl leading-relaxed">
                            Registra y evalúa una situación con potencial de afectar la reputación de la marca. Vincula las menciones relacionadas y da seguimiento a su evolución.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 px-2 sm:px-8">
                    
                    <div className="space-y-4">
                        <h3 className="text-xl font-black theme-text-main flex items-center gap-2 border-b-2 border-gray-200 dark:border-gray-800 pb-3">
                            <AlertTriangle className="w-5 h-5 text-orange-500" /> Parámetros Generales
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 sm:p-8 theme-bg-container rounded-[1.5rem] border theme-border shadow-sm border-l-[6px] border-l-orange-500">
                            <div className="space-y-1.5">
                                <label htmlFor="nri-fecha" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Fecha de Recepción</label>
                                <input id="nri-fecha" type="date" required value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} className={`${inputStyles} [color-scheme:light] dark:[color-scheme:dark]`} />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="nri-total" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Volumen (Total Incidencias)</label>
                                <input id="nri-total" type="number" min="1" required value={formData.totalIncidencias} onChange={(e) => setFormData({...formData, totalIncidencias: parseInt(e.target.value)})} className={inputStyles} />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="nri-actorFuente" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Actor o Fuente</label>
                                <input id="nri-actorFuente" type="url" required placeholder="@usuario o sitio web" value={formData.actorFuente} onChange={(e) => setFormData({...formData, actorFuente: e.target.value})} className={inputStyles} />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="nri-fuenteDeteccion" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Fuente de Detección</label>
                                <select id="nri-fuenteDeteccion" value={formData.fuenteDeteccion} onChange={(e) => setFormData({...formData, fuenteDeteccion: e.target.value})} className={inputStyles}>
                                    {FUENTES_DETECCION.map(opt => <option className={optionStyles} key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="nri-tipoFuente" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Tipo de Fuente</label>
                                <select id="nri-tipoFuente" value={formData.tipoFuente} onChange={(e) => setFormData({...formData, tipoFuente: e.target.value})} className={inputStyles}>
                                    {['Queja', 'Desinformación', 'Acusación', 'Denuncia', 'Cuestionamiento', 'Riesgo de seguridad', 'Conflicto comunitario', 'Tema legal', 'Cobertura negativa', 'Crisis activa'].map(opt => <option className={optionStyles} key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="nri-temaPrincipal" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Tema Principal</label>
                                <select id="nri-temaPrincipal" value={formData.temaPrincipal} onChange={(e) => setFormData({...formData, temaPrincipal: e.target.value})} className={inputStyles}>
                                    {TEMAS_PRINCIPALES.map(opt => <option className={optionStyles} key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>

                            <div className="lg:col-span-3 border-t theme-border pt-4 mt-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <label htmlFor="nri-nivelRiesgo" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Nivel de Riesgo Reputacional</label>
                                    <select id="nri-nivelRiesgo" value={formData.nivelRiesgoReputacional} onChange={(e) => setFormData({...formData, nivelRiesgoReputacional: e.target.value})} className={`${inputStyles} font-bold`}>
                                        <option className={optionStyles} value="Bajo">🟢 Bajo</option>
                                        <option className={optionStyles} value="Medio">🟠 Medio</option>
                                        <option className={optionStyles} value="Alto">🟡 Alto</option>
                                        <option className={optionStyles} value="Crítico">🔴 Crítico</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="nri-alcance" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Alcance Actual</label>
                                    <select id="nri-alcance" value={formData.alcanceActual} onChange={(e) => setFormData({...formData, alcanceActual: e.target.value})} className={`${inputStyles} font-bold`}>
                                        <option className={optionStyles} value="Aislado">🟢 Aislado</option>
                                        <option className={optionStyles} value="Limitado">🟠 Limitado</option>
                                        <option className={optionStyles} value="Extendido">🟡 Extendido</option>
                                        <option className={optionStyles} value="Viral">🔴 Viral</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="nri-tendencia" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Tendencia</label>
                                    <select id="nri-tendencia" value={formData.tendencia} onChange={(e) => setFormData({...formData, tendencia: e.target.value})} className={`${inputStyles} font-bold`}>
                                        <option className={optionStyles} value="Disminuyendo">🟢 Disminuyendo</option>
                                        <option className={optionStyles} value="Estable">🟡 Estable</option>
                                        <option className={optionStyles} value="Creciendo rápidamente">🔴 Creciendo rápidamente</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h3 className="text-xl font-black theme-text-main flex items-center gap-2 border-b-2 border-gray-200 dark:border-gray-800 pb-3">
                            <FileText className="w-5 h-5 text-orange-500" /> Detalles del Incidente
                        </h3>
                        <div className="space-y-6 p-6 sm:p-8 theme-bg-container rounded-[1.5rem] border theme-border shadow-sm">
                            <div className="space-y-1.5">
                                <label htmlFor="nri-resumen" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Resumen del Incidente</label>
                                <textarea id="nri-resumen" rows={3} placeholder="Describe qué ocurrió, quién está involucrado y por qué representa un riesgo reputacional." value={formData.resumenIncidente} onChange={(e) => setFormData({...formData, resumenIncidente: e.target.value})} className={`${inputStyles} resize-none leading-relaxed`}></textarea>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="nri-hallazgos" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Hallazgos Clave <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-2 py-0.5 rounded ml-2 font-bold">Requerido</span></label>
                                <textarea id="nri-hallazgos" required rows={3} placeholder="Resume el incidente en un máximo de 500 caracteres." maxLength={500} value={formData.hallazgosClave} onChange={(e) => setFormData({...formData, hallazgosClave: e.target.value})} className={`${inputStyles} resize-none leading-relaxed`}></textarea>
                                <p className="text-[10px] theme-text-muted text-right">{formData.hallazgosClave.length}/500</p>
                            </div>
                            <div className="space-y-1.5 pt-4">
                                <label className="text-xs font-bold theme-text-muted uppercase tracking-wider flex justify-between items-center">
                                    Análisis Interno
                                    <span className="font-normal text-orange-500 flex items-center gap-1"><Smartphone className="w-3 h-3"/> WYSIWYG Editor</span>
                                </label>
                                <div className="border theme-border rounded-xl overflow-hidden theme-bg-container focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all shadow-inner">
                                    <EditorToolbar onCommand={execCommand} />
                                    <div ref={editorRef} contentEditable onBlur={handleEditorBlur} className="w-full p-6 theme-text-main theme-bg-low outline-none min-h-[250px] overflow-y-auto max-h-[500px] text-sm leading-relaxed custom-scrollbar wysiwyg-content" data-placeholder="Redacte el análisis interno del evento aquí. Puede utilizar listas, negritas y colores para estructurar la información..." style={{ whiteSpace: 'pre-wrap' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h3 className="text-xl font-black theme-text-main flex items-center gap-2 border-b-2 border-gray-200 dark:border-gray-800 pb-3">
                            <LinkIcon className="w-5 h-5 text-orange-500" /> Referencias y Evidencias
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8 bg-black/5 dark:bg-white/5 rounded-[1.5rem] border theme-border shadow-inner">
                            <div className="space-y-1.5">
                                <label htmlFor="nri-enlacePub" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Enlace a la Publicación Original</label>
                                <input id="nri-enlacePub" type="url" placeholder="https://facebook.com/..." value={formData.enlacePublicacion} onChange={(e) => setFormData({...formData, enlacePublicacion: e.target.value})} className={inputStyles} />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="nri-enlaceDrive" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Repositorio de Evidencia (Drive)</label>
                                <input id="nri-enlaceDrive" type="url" placeholder="https://drive.google.com/..." value={formData.enlaceDrive} onChange={(e) => setFormData({...formData, enlaceDrive: e.target.value})} className={inputStyles} />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 flex flex-col sm:flex-row items-center justify-end gap-4 border-t-2 border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => navigate('dashboard')} className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold theme-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Cancelar y Volver</button>
                        <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-black bg-orange-600 text-white hover:bg-orange-500 hover:-translate-y-0.5 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:translate-y-0">
                            {isSubmitting ? 'Guardando en la nube...' : <><Save className="w-5 h-5"/> Consolidar Incidente Oficial</>}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

// 🔥 FIX: AÑADIDO `deleteRrssBatch` a las props
export const HistorialRRSSView = ({ showToast, isAdmin, updateRrssIncident, deleteRrssIncident, deleteRrssBatch }: any) => {
    const [rrssIncidents, setRrssIncidents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIncident, setSelectedIncident] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    // Cierra el modal de detalle al hacer clic fuera de la tarjeta. Se guarda el mousedown
    // en lugar del clic para no cerrar cuando el usuario inicia una selección de texto dentro.
    const backdropMouseDownRef = useRef(false);
    const nDetail = normalizeIncidencia(selectedIncident);
    const editEditorRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('Todos');
    const [filterMonth, setFilterMonth] = useState('Todos');
    
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [filterFuente, setFilterFuente] = useState('Todas');
    const [filterTema, setFilterTema] = useState('Todos');
    const [filterRiesgo, setFilterRiesgo] = useState('Todos');
    
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [pagePerMonth, setPagePerMonth] = useState<Record<string, number>>({});
    const itemsPerPage = 30;
    
    // 🔥 ESTADOS PARA SELECCIÓN MÚLTIPLE
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportType, setExportType] = useState('all'); 
    const [exportYear, setExportYear] = useState('');
    const [exportMonth, setExportMonth] = useState('');
    const [exportFuente, setExportFuente] = useState('');
    const [exportTema, setExportTema] = useState('');
    const [exportRiesgo, setExportRiesgo] = useState('');
    const [exportAlcance, setExportAlcance] = useState('');
    const [exportTendencia, setExportTendencia] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (IS_MOCK) { setIsLoading(false); return; }
        setIsLoading(true);
        const rrssRef = collection(db, 'artifacts', appId, 'public', 'data', 'rrss_incidents');
        const unsub = onSnapshot(rrssRef, (snapshot) => {
            const data: any[] = [];
            snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            setRrssIncidents(data);
            setTimeout(() => setIsLoading(false), 600);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        setPagePerMonth({});
        // Limpiamos selecciones si cambiamos filtros para evitar borrar cosas invisibles
        setSelectedIds([]);
        setIsSelectionMode(false);
    }, [searchTerm, filterYear, filterMonth, filterStatus, filterFuente, filterTema, filterRiesgo]);

    useEffect(() => {
        setExportMonth('');
    }, [exportType, exportYear]);

    const clearCustomExportFilters = () => {
        setExportFuente(''); setExportTema(''); setExportRiesgo(''); setExportAlcance(''); setExportTendencia('');
    };

    const availableYears = useMemo(() => {
        const years = new Set(rrssIncidents.map((i: any) => i.fecha ? i.fecha.split('-')[0] : null).filter(Boolean));
        return Array.from(years).sort((a: any, b: any) => b.localeCompare(a));
    }, [rrssIncidents]);

    // Opciones de filtros: exactamente el vocabulario del formulario (sin herencia legacy de Innova Schools)
    const availableFuentes = FUENTES_DETECCION;
    const availableTemas = TEMAS_PRINCIPALES;

    const availableMonthsForFilter = useMemo(() => {
        const months = new Set(
            rrssIncidents
                .filter((i: any) => filterYear === 'Todos' || (i.fecha && i.fecha.split('-')[0] === filterYear))
                .map((i: any) => i.fecha && i.fecha.split('-')[1])
                .filter(Boolean)
        );
        return Array.from(months).sort((a: any, b: any) => a.localeCompare(b));
    }, [rrssIncidents, filterYear]);

    const availableMonthsForExport = useMemo(() => {
        const months = new Set(
            rrssIncidents
                .filter((i: any) => !exportYear || (i.fecha && i.fecha.split('-')[0] === exportYear))
                .map((i: any) => i.fecha && i.fecha.split('-')[1])
                .filter(Boolean)
        );
        return Array.from(months).sort((a: any, b: any) => a.localeCompare(b));
    }, [rrssIncidents, exportYear]);

    const filteredIncidents = useMemo(() => {
        return rrssIncidents.filter((inc: any) => {
            const year = inc.fecha ? inc.fecha.split('-')[0] : '';
            const month = inc.fecha ? inc.fecha.split('-')[1] : '';
            const matchYear = filterYear === 'Todos' || year === filterYear;
            const matchMonth = filterMonth === 'Todos' || month === filterMonth;
            
            const currentStatus = inc.estado || 'Monitoreo activo';
            const matchStatus = filterStatus === 'Todos' || currentStatus === filterStatus;
            
            const term = searchTerm.toLowerCase();
            const n = normalizeIncidencia(inc);
            const matchSearch = term === '' ||
                (isAdmin && n.autor && n.autor.toLowerCase().includes(term)) ||
                (n.fuenteDeteccion && n.fuenteDeteccion.toLowerCase().includes(term)) ||
                (n.actorFuente && n.actorFuente.toLowerCase().includes(term)) ||
                (n.tipoFuente && n.tipoFuente.toLowerCase().includes(term)) ||
                (n.temaPrincipal && n.temaPrincipal.toLowerCase().includes(term)) ||
                (n.resumen && n.resumen.toLowerCase().includes(term)) ||
                (n.hallazgosClave && n.hallazgosClave.toLowerCase().includes(term)) ||
                (String(n.nivelRiesgo) && String(n.nivelRiesgo).toLowerCase().includes(term)) ||
                (n.alcanceActual && n.alcanceActual.toLowerCase().includes(term)) ||
                (n.tendencia && n.tendencia.toLowerCase().includes(term));
            
            const matchFuente = filterFuente === 'Todas' || n.fuenteDeteccion === filterFuente;
            const matchTema = filterTema === 'Todos' || n.temaPrincipal === filterTema;
            const matchRiesgo = filterRiesgo === 'Todos' || riesgoValue(n.nivelRiesgo) === filterRiesgo;

            return matchYear && matchMonth && matchStatus && matchSearch && matchFuente && matchTema && matchRiesgo;
        });
    }, [rrssIncidents, searchTerm, filterYear, filterMonth, filterStatus, filterFuente, filterTema, filterRiesgo, isAdmin]);

    const groupedData = useMemo(() => {
        const groups: Record<string, Record<string, any[]>> = {};
        filteredIncidents.forEach((inc: any) => {
            const year = inc.fecha ? inc.fecha.split('-')[0] : 'Sin Fecha';
            const month = inc.fecha ? inc.fecha.split('-')[1] : '00';
            if (!groups[year]) groups[year] = {};
            if (!groups[year][month]) groups[year][month] = [];
            groups[year][month].push(inc);
        });
        return groups;
    }, [filteredIncidents]);

    useEffect(() => {
        if (Object.keys(groupedData).length > 0) {
            const sortedYears = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));
            const newestYear = sortedYears[0];
            const sortedMonths = Object.keys(groupedData[newestYear]).sort((a, b) => b.localeCompare(a));
            const newestMonth = sortedMonths[0];
            setExpandedSections(prev => ({ ...prev, [newestYear]: true, [`${newestYear}-${newestMonth}`]: true }));
        }
    }, [groupedData]);

    const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

    // 🔥 LOGICA DE SELECCIÓN MÚLTIPLE
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleMonthSelection = (monthItems: any[], isSelected: boolean) => {
        if (isSelected) {
            const monthIds = monthItems.map(item => item.id);
            setSelectedIds(prev => prev.filter(id => !monthIds.includes(id)));
        } else {
            const newIds = monthItems.map(item => item.id).filter(id => !selectedIds.includes(id));
            setSelectedIds(prev => [...prev, ...newIds]);
        }
    };

    const executeBatchDelete = () => {
        if (deleteRrssBatch) {
            deleteRrssBatch(selectedIds, () => {
                setSelectedIds([]);
                setIsSelectionMode(false);
            });
        }
    };

    const getMediaIcon = (medio: string, isSelected: boolean = false) => {
        const m = medio || '';
        if (m.includes('Facebook') || m.includes('FB')) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-blue-500'}`}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
        if (m.includes('Instagram')) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-pink-500'}`}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
        if (m.includes('TikTok')) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-cyan-400'}`}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>;
        if (m.includes('LinkedIn')) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-blue-400'}`}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>;
        return <Smartphone className={`w-5 h-5 ${isSelected ? 'text-white' : 'theme-text-muted'}`} />;
    };

const handleDownloadDocx = (inc: any) => {
        if (!inc) return;
        const n = normalizeIncidencia(inc);
        const cleanContent = DOMPurify.sanitize(inc.reporteTexto || '');
        const docContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Reporte de Incidente Reputacional</title><style>body { font-family: 'Arial', sans-serif; color: #222222; line-height: 1.5; } h2 { color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 5px; font-size: 18pt; } .table-info { width: 100%; border-collapse: collapse; margin-top: 15px; } .table-info td { padding: 8px; border: 1px solid #dddddd; font-size: 10.5pt; } .label { font-weight: bold; background-color: #f3f4f6; width: 30%; } .section-header { font-size: 12pt; font-weight: bold; color: #f97316; margin-top: 20px; margin-bottom: 5px; } .box { border: 1px solid #e5e7eb; padding: 10px; background: #fafafa; border-radius: 4px; font-size: 11pt; } ul { padding-left: 20px; list-style-type: disc; } ol { padding-left: 20px; list-style-type: decimal; }</style></head><body><h2>ENGIE MANAGEMENT - INFORME DE INCIDENTE REPUTACIONAL</h2><table class="table-info"><tr><td class="label">Fecha Recepción</td><td>${n.fecha}</td></tr><tr><td class="label">Volumen Incidencias</td><td>${n.totalIncidencias}</td></tr><tr><td class="label">Actor / Fuente</td><td>${n.actorFuente && /^https?:\/\//i.test(n.actorFuente) ? '<a href="' + n.actorFuente + '">' + n.actorFuente + '</a>' : n.actorFuente}</td></tr><tr><td class="label">Fuente de Detección</td><td>${n.fuenteDeteccion}</td></tr><tr><td class="label">Tipo de Fuente</td><td>${n.tipoFuente || 'N/A'}</td></tr><tr><td class="label">Tema Principal</td><td>${n.temaPrincipal || 'N/A'}</td></tr><tr><td class="label">Nivel de Riesgo</td><td>${n.nivelRiesgo}</td></tr><tr><td class="label">Alcance Actual</td><td>${n.alcanceActual || 'N/A'}</td></tr><tr><td class="label">Tendencia</td><td>${n.tendencia || 'N/A'}</td></tr><tr><td class="label">Registrado por</td><td>${n.autor || 'Admin'}</td></tr></table><div class="section-header">Resumen del Incidente:</div><div class="box">${n.resumen || ''}</div><div class="section-header">Hallazgos Clave:</div><div class="box">${n.hallazgosClave || 'Sin hallazgos registrados.'}</div><div class="section-header">Análisis Interno:</div><div class="box">${cleanContent || 'Sin análisis interno detallado.'}</div><div class="section-header">Referencias y Evidencias:</div><div class="box">${(inc.enlacePublicacion ? '<p style="margin:4px 0;"><b>Enlace a la Publicación Original:</b> <a href="' + inc.enlacePublicacion + '">' + inc.enlacePublicacion + '</a></p>' : '') + (inc.enlaceDrive ? '<p style="margin:4px 0;"><b>Repositorio de Evidencia (Drive):</b> <a href="' + inc.enlaceDrive + '">' + inc.enlaceDrive + '</a></p>' : '') + (!inc.enlacePublicacion && !inc.enlaceDrive ? 'Sin referencias adjuntas.' : '')}</div></body></html>`;
        const blob = new Blob([docContent], { type: 'application/msword' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Reporte_Reputacional_${n.actorFuente || 'Incidente'}_${n.fecha}.docx`; link.click();
        showToast('Documento Word (.docx) descargado con éxito.');
    };

    const openDetail = (inc: any) => { 
        if (isSelectionMode) {
            toggleSelection(inc.id);
        } else {
            setSelectedIncident(inc); 
            setIsDetailOpen(true); 
        }
    };
    
    const openEdit = () => { setIsDetailOpen(false); setIsEditOpen(true); };
    const handleDelete = () => { setIsDetailOpen(false); deleteRrssIncident(selectedIncident.id); };

    const getRiskColor = (risk: string) => {
        switch(risk) {
            case 'Bajo': return 'bg-green-600 text-white border-transparent dark:bg-green-900/30 dark:text-green-400 dark:border dark:border-green-800';
            case 'Medio': return 'bg-yellow-500 text-black border-transparent dark:bg-yellow-900/30 dark:text-yellow-400 dark:border dark:border-yellow-800';
            case 'Alto': return 'bg-orange-600 text-white border-transparent dark:bg-orange-900/30 dark:text-orange-400 dark:border dark:border-orange-800';
            case 'Critico': return 'bg-red-600 text-white border-transparent dark:bg-red-900/30 dark:text-red-400 dark:border dark:border-red-800';
            default: return 'bg-gray-600 text-white border-transparent dark:bg-gray-800 dark:text-gray-300 dark:border dark:border-gray-700';
        }
    };

    const getRiskBorderCard = (risk: string) => {
        switch(risk) {
            case 'Bajo': return 'border-l-green-500';
            case 'Medio': return 'border-l-yellow-500';
            case 'Alto': return 'border-l-orange-500';
            case 'Critico': return 'border-l-red-500';
            default: return 'border-l-gray-500';
        }
    };

    const getNeutralBadge = () => {
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'; 
    };

    // Semáforo de Alcance (verde → rojo según exposición)
    const getAlcanceDot = (alcance: string) => {
        switch(alcance) {
            case 'Aislado': return 'bg-green-500';
            case 'Local': return 'bg-yellow-500';
            case 'Regional': return 'bg-orange-500';
            case 'Nacional': return 'bg-red-500';
            case 'Viral': return 'bg-red-600 animate-pulse';
            default: return 'bg-gray-400';
        }
    };

    // Semáforo de Tendencia (sube=rojo / estable=amarillo / baja=verde)
    const getTendenciaDot = (tendencia: string) => {
        switch(tendencia) {
            case 'Aumentando': return 'bg-red-500';
            case 'Estable': return 'bg-yellow-500';
            case 'Disminuyendo': return 'bg-green-500';
            default: return 'bg-gray-400';
        }
    };

    const isUrl = (v: string) => !!v && /^https?:\/\//i.test(v);

    // Semáforo del Nivel de Riesgo Reputacional
    const riskDot = (r: string) => {
        switch(r) {
            case 'Bajo': return 'bg-green-500';
            case 'Medio': return 'bg-yellow-500';
            case 'Alto': return 'bg-orange-500';
            case 'Crítico': case 'Critico': return 'bg-red-600 animate-pulse';
            default: return 'bg-gray-400';
        }
    };


    const execEditCommand = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        if (editEditorRef.current && command !== 'foreColor' && command !== 'fontSize') editEditorRef.current.focus();
    };

    const handleExecuteExport = () => {
        const norm = (i: any) => normalizeIncidencia(i);
        let dataToExport = rrssIncidents;
        let filenameSuffix = 'Todo';

        if (exportType === 'month') {
            if (!exportYear && !exportMonth) return showToast('Selecciona al menos un año o un mes para exportar', true);
            if (exportYear) {
                dataToExport = dataToExport.filter((i: any) => i.fecha && i.fecha.split('-')[0] === exportYear);
                filenameSuffix = exportYear;
            }
            if (exportMonth) {
                dataToExport = dataToExport.filter((i: any) => i.fecha && i.fecha.split('-')[1] === exportMonth);
                filenameSuffix = filenameSuffix === 'Todo' ? exportMonth : `${filenameSuffix}_${exportMonth}`;
            }
        } else if (exportType === 'custom') {
            if (!exportYear && !exportMonth && !exportFuente && !exportTema && !exportRiesgo && !exportAlcance && !exportTendencia) {
                return showToast('Configura al menos un criterio para la combinación personalizada', true);
            }
            if (exportYear) {
                dataToExport = dataToExport.filter((i: any) => i.fecha && i.fecha.split('-')[0] === exportYear);
                filenameSuffix = exportYear;
            }
            if (exportMonth) {
                dataToExport = dataToExport.filter((i: any) => i.fecha && i.fecha.startsWith(`${exportYear}-${exportMonth}`));
                filenameSuffix += `_${exportMonth}`;
            }
            if (exportFuente) { dataToExport = dataToExport.filter((i: any) => norm(i).fuenteDeteccion === exportFuente); filenameSuffix += `_F-${exportFuente}`; }
            if (exportTema) { dataToExport = dataToExport.filter((i: any) => norm(i).temaPrincipal === exportTema); filenameSuffix += `_T-${exportTema}`; }
            if (exportRiesgo) { dataToExport = dataToExport.filter((i: any) => riesgoValue(norm(i).nivelRiesgo) === exportRiesgo); filenameSuffix += `_R-${exportRiesgo}`; }
            if (exportAlcance) { dataToExport = dataToExport.filter((i: any) => norm(i).alcanceActual === exportAlcance); filenameSuffix += `_A-${exportAlcance}`; }
            if (exportTendencia) { dataToExport = dataToExport.filter((i: any) => norm(i).tendencia === exportTendencia); filenameSuffix += `_Ten-${exportTendencia}`; }
            filenameSuffix = filenameSuffix.replace(/[\/\s:]+/g, '-');
        }

        if (dataToExport.length === 0) return showToast('No hay datos registrados con esos criterios', true);

        setIsExporting(true);

        setTimeout(() => {
            const esc = (v: any) => String(v ?? '').replace(/"/g, '""');
            // El Análisis Interno se guarda como HTML (editor enriquecido): se exporta como texto plano
            const htmlToText = (v: any) => String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
            const headers = isAdmin
                ? ['Fecha,Volumen,Actor o Fuente,Fuente de Deteccion,Tipo de Fuente,Tema Principal,Nivel de Riesgo,Alcance Actual,Tendencia,Resumen del Incidente,Hallazgos Clave,Analisis Interno,Enlace Publicacion,Enlace Drive,Autor']
                : ['Fecha,Volumen,Actor o Fuente,Fuente de Deteccion,Tipo de Fuente,Tema Principal,Nivel de Riesgo,Alcance Actual,Tendencia,Resumen del Incidente,Hallazgos Clave,Analisis Interno,Enlace Publicacion,Enlace Drive'];
            const rows = dataToExport.map((i: any) => {
                const n = norm(i);
                const baseData = [
                    esc(i.fecha), esc(i.totalIncidencias), esc(n.actorFuente), esc(n.fuenteDeteccion), esc(n.tipoFuente),
                    esc(n.temaPrincipal), esc(n.nivelRiesgo), esc(n.alcanceActual), esc(n.tendencia),
                    esc(n.resumen), esc(n.hallazgosClave), esc(htmlToText(n.reporteTexto)),
                    esc(n.enlacePublicacion), esc(n.enlaceDrive)
                ].map(v => `"${v}"`).join(',');
                return isAdmin ? `${baseData},"${esc(i.autor || 'Administrador')}"` : baseData;
            });

            const link = document.createElement("a");
            link.href = encodeURI("data:text/csv;charset=utf-8," + [...headers, ...rows].join("\n"));
            link.download = `Historial_RRSS_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setIsExporting(false);
            setIsExportModalOpen(false);
            showToast('Exportación completada exitosamente');
        }, 1500);
    };

    return (
        <>
            <style>{editorStyles}</style>
            <div className="space-y-6 fade-in pb-24 relative">
                
                {/* 🔥 BARRA FLOTANTE DE EJECUCIÓN (PORTAL) */}
                {isSelectionMode && isAdmin && selectedIds.length > 0 && ReactDOM.createPortal(
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-[9999] fade-in">
                        <span className="font-bold text-sm">{selectedIds.length} reporte(s) seleccionados</span>
                        <button 
                            onClick={executeBatchDelete} 
                            disabled={selectedIds.length === 0}
                            className="bg-white text-red-600 px-4 py-1.5 rounded-full font-black text-xs hover:scale-105 transition-transform uppercase tracking-wider disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                        >
                            Eliminar Lote
                        </button>
                        <button onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }} className="p-1 hover:bg-white/20 rounded-full transition-colors" title="Cancelar selección"><X className="w-4 h-4"/></button>
                    </div>,
                    document.body
                )}

                <div className={(isDetailOpen || isEditOpen) ? 'print:hidden' : ''}>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div>
                            <h2 className="text-2xl font-bold theme-text-main">Historial RRSS</h2>
                            <p className="theme-text-muted text-sm mt-1">Registro histórico de incidencias en redes sociales.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            
                            {/* 🔥 NUEVO BOTÓN: SELECCIÓN MÚLTIPLE */}
                            {isAdmin && rrssIncidents.length > 0 && (
                                <button 
                                    onClick={() => {
                                        setIsSelectionMode(!isSelectionMode);
                                        setSelectedIds([]);
                                    }} 
                                    className={`w-full sm:w-auto px-4 py-2.5 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors border ${isSelectionMode ? 'bg-red-500 text-white border-red-500' : 'theme-bg-low theme-text-main border-transparent hover:border-red-500/50'}`}
                                    title={isSelectionMode ? "Cancelar selección" : "Borrar reportes por lotes"}
                                >
                                    <CheckSquare className="w-4 h-4"/> {isSelectionMode ? 'Cancelar Selección' : 'Selección Múltiple'}
                                </button>
                            )}

                            <button type="button" onClick={() => setIsExportModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-500 transition-all text-sm font-bold shadow-sm">
                                <Download className="w-4 h-4"/> Exportar CSV
                            </button>
                        </div>
                    </div>

                    <div className="p-4 theme-bg-container border theme-border rounded-xl shadow-sm mb-6 flex flex-col gap-4 min-w-0">
                        <div className="relative w-full flex items-center">
                            <Search className="absolute left-3 text-gray-400 w-4 h-4 pointer-events-none" />
                            <input type="text" aria-label="Buscar" placeholder="Buscar por actor, fuente, tema, resumen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputStyles} pl-10 pr-10`} />
                            {searchTerm && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearchTerm('')} className="absolute right-3 p-1 rounded-md text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors" title="Limpiar búsqueda"><X className="w-4 h-4" /></button>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 w-full min-w-0">
                            <div className="flex flex-col gap-1 min-w-0">
                                <label htmlFor="hr-filter-fuente" className="text-[10px] font-bold theme-text-muted uppercase tracking-wide">Fuente</label>
                                <select id="hr-filter-fuente" value={filterFuente} onChange={(e) => setFilterFuente(e.target.value)} className={`${inputStyles} py-1.5 px-2.5 w-full min-w-0`}>
                                    <option className={optionStyles} value="Todas">Todas</option>
                                    {availableFuentes.map((f: any) => <option className={optionStyles} key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                                <label htmlFor="hr-filter-tema" className="text-[10px] font-bold theme-text-muted uppercase tracking-wide">Tema</label>
                                <select id="hr-filter-tema" value={filterTema} onChange={(e) => setFilterTema(e.target.value)} className={`${inputStyles} py-1.5 px-2.5 w-full min-w-0`}>
                                    <option className={optionStyles} value="Todos">Todos</option>
                                    {availableTemas.map((t: any) => <option className={optionStyles} key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                                <label htmlFor="hr-filter-riesgo" className="text-[10px] font-bold theme-text-muted uppercase tracking-wide">Riesgo</label>
                                <select id="hr-filter-riesgo" value={filterRiesgo} onChange={(e) => setFilterRiesgo(e.target.value)} className={`${inputStyles} py-1.5 px-2.5 w-full min-w-0`}>
                                    <option className={optionStyles} value="Todos">Todos</option>
                                    {NIVELES_RIESGO.map(r => <option className={optionStyles} key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                                <label htmlFor="hr-filter-status" className="text-[10px] font-bold theme-text-muted uppercase tracking-wide">Estatus</label>
                                <select id="hr-filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputStyles} py-1.5 px-2.5 w-full min-w-0`}>
                                    <option className={optionStyles} value="Todos">Todos</option>
                                    <option className={optionStyles} value="Monitoreo activo">🔴 Monitoreo activo</option>
                                    <option className={optionStyles} value="En revisión">🟡 En revisión</option>
                                    <option className={optionStyles} value="Seguimiento activo">🟠 Seguimiento activo</option>
                                    <option className={optionStyles} value="Resuelto / solucionado">🟢 Resuelto</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                                <label htmlFor="hr-filter-year" className="text-[10px] font-bold theme-text-muted uppercase tracking-wide">Año</label>
                                <select id="hr-filter-year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={`${inputStyles} py-1.5 px-2.5 w-full min-w-0`}>
                                    <option className={optionStyles} value="Todos">Todos</option>
                                    {availableYears.map((y: any) => <option className={optionStyles} key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                                <label htmlFor="hr-filter-month" className="text-[10px] font-bold theme-text-muted uppercase tracking-wide">Mes</label>
                                <select id="hr-filter-month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className={`${inputStyles} py-1.5 px-2.5 w-full min-w-0`}>
                                    <option className={optionStyles} value="Todos">Todos</option>
                                    {availableMonthsForFilter.map((m: any) => <option className={optionStyles} key={m} value={m}>{getMonthName(m)}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 w-full">
                            {(searchTerm || filterFuente !== 'Todas' || filterTema !== 'Todos' || filterRiesgo !== 'Todos' || filterStatus !== 'Todos' || filterYear !== 'Todos' || filterMonth !== 'Todos') && (
                                <button type="button" onClick={() => { setSearchTerm(''); setFilterFuente('Todas'); setFilterTema('Todos'); setFilterRiesgo('Todos'); setFilterStatus('Todos'); setFilterYear('Todos'); setFilterMonth('Todos'); }} className="text-xs font-bold text-orange-500 hover:text-orange-400 hover:underline transition-colors whitespace-nowrap">Limpiar filtros</button>
                            )}
                            <div className="ml-auto bg-black/5 dark:bg-white/5 border theme-border px-3 py-1.5 rounded-lg whitespace-nowrap text-center"><span className="text-xs font-bold theme-text-main">{filteredIncidents.length}</span><span className="text-[10px] theme-text-muted font-medium ml-1">de {rrssIncidents.length}</span></div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-in">
                            {[1, 2, 3, 4, 5, 6].map(card => (
                                <div key={card} className="p-5 theme-bg-container rounded-xl border theme-border shadow-sm h-44 animate-pulse flex flex-col justify-between">
                                    <div className="flex items-start gap-3 mb-3 w-full">
                                        <div className="w-10 h-10 rounded-lg bg-gray-300 dark:bg-gray-700 flex-shrink-0"></div>
                                        <div className="flex-1 space-y-2 py-1 w-full">
                                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mt-2 w-full">
                                        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                                        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                                    </div>
                                    <div className="mt-auto pt-3 border-t theme-border flex gap-2 w-full">
                                        <div className="h-6 w-16 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
                                        <div className="h-6 w-20 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredIncidents.length === 0 ? (
                        <div className="text-center py-12 theme-bg-container rounded-2xl border theme-border"><Smartphone className="w-12 h-12 theme-text-muted mx-auto mb-4 opacity-30" /><p className="theme-text-muted">No se encontraron registros con los criterios actuales.</p></div>
                    ) : (
                        <div className="space-y-4">
                            {Object.keys(groupedData).sort((a, b) => b.localeCompare(a)).map(year => {
                                const isYearExpanded = !!expandedSections[year];
                                const totalInYear = Object.values(groupedData[year]).flat().length;

                                return (
                                    <div key={year} className="theme-bg-container border theme-border rounded-xl overflow-hidden shadow-sm">
                                        <button type="button" onClick={() => toggleSection(year)} className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3">{isYearExpanded ? <ChevronDown className="w-5 h-5 theme-text-muted" /> : <ChevronRight className="w-5 h-5 theme-text-muted" />}<h3 className="text-lg font-bold theme-text-main">{year}</h3><span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 px-2 py-0.5 rounded-full text-xs font-bold">{totalInYear}</span></div>
                                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                        </button>

                                        {isYearExpanded && (
                                            <div className="p-4 space-y-4 border-t theme-border bg-[var(--background)]">
                                                {Object.keys(groupedData[year]).sort((a, b) => b.localeCompare(a)).map(month => {
                                                    const monthKey = `${year}-${month}`;
                                                    const isMonthExpanded = !!expandedSections[monthKey];
                                                    const monthItems = groupedData[year][month];
                                                    const currentMonthPage = pagePerMonth[monthKey] || 1;
                                                    const totalMonthPages = Math.ceil(monthItems.length / itemsPerPage);
                                                    const paginatedMonthItems = monthItems.slice((currentMonthPage - 1) * itemsPerPage, currentMonthPage * itemsPerPage);

                                                    const isAllMonthSelected = monthItems.length > 0 && monthItems.every((i:any) => selectedIds.includes(i.id));

                                                    return (
                                                        <div key={monthKey} className="border theme-border rounded-lg overflow-hidden bg-[var(--surface)]">
                                                            
                                                            {/* 🔥 BOTÓN DE MES CON CHECKBOX (Igual que en Comentarios) */}
                                                            <div className="w-full flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border-b theme-border">
                                                                <button type="button" onClick={() => toggleSection(monthKey)} className="flex items-center gap-2 flex-1 text-left">
                                                                    {isMonthExpanded ? <ChevronDown className="w-4 h-4 theme-text-muted" /> : <ChevronRight className="w-4 h-4 theme-text-muted" />}
                                                                    <h4 className="text-sm font-bold theme-text-main uppercase tracking-wider">{getMonthName(month)}</h4>
                                                                    <span className="text-xs theme-text-muted">({monthItems.length})</span>
                                                                </button>
                                                                
                                                                {isSelectionMode && isMonthExpanded && (
                                                                    <div className="flex items-center gap-2 pr-2 border-l theme-border pl-4">
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => toggleMonthSelection(monthItems, isAllMonthSelected)}
                                                                            className="text-[10px] sm:text-xs font-bold text-red-500 cursor-pointer hover:underline flex items-center gap-2 uppercase tracking-wider"
                                                                        >
                                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAllMonthSelected ? 'bg-red-500 border-red-500' : 'border-gray-400 dark:border-gray-600'}`}>
                                                                                {isAllMonthSelected && <Check className="w-3 h-3 text-white" />}
                                                                            </div>
                                                                            <span className="hidden sm:inline-block">Marcar Mes Completo</span>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {isMonthExpanded && (
                                                                <div className="bg-[var(--surface)]">
                                                                    <div className="p-4 grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                                                                        {paginatedMonthItems.map((inc: any) => {
                                                                            const nCard = normalizeIncidencia(inc);
                                                                            const riskStr = riesgoValue(nCard.nivelRiesgo) === 'Crítico' ? 'Critico' : String(riesgoValue(nCard.nivelRiesgo));
                                                                            const isSelected = selectedIds.includes(inc.id);
                                                                            
                                                                            return (
                                                                                // 🔥 UX TARJETA: Idéntica a Tickets/Comentarios (Roja si está seleccionada)
                                                                                <div 
                                                                                    key={inc.id} 
                                                                                    onClick={() => openDetail(inc)} 
                                                                                    className={`relative text-left w-full p-5 rounded-xl border shadow-sm transition-all duration-300 cursor-pointer group flex flex-col h-full border-l-[6px] ${
                                                                                        isSelectionMode
                                                                                        ? isSelected
                                                                                            ? 'bg-red-500/10 border-red-500 border-l-red-500 scale-[0.98]'
                                                                                            : `theme-bg-container theme-border hover:border-red-500/50 ${getRiskBorderCard(riskStr)}`
                                                                                        : `theme-bg-container theme-border hover:bg-black/10 dark:hover:bg-white/10 ${getRiskBorderCard(riskStr)}`
                                                                                    }`}
                                                                                >
                                                                                    {/* Checkbox Individual */}
                                                                                    {isSelectionMode && isAdmin && (
                                                                                        <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors z-20 ${isSelected ? 'bg-red-500 border-red-500' : 'border-gray-400 dark:border-gray-600'}`}>
                                                                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                                                                        </div>
                                                                                    )}

                                                                                    <div className={`flex items-start gap-3 mb-3 w-full ${isSelectionMode ? 'pr-8' : ''}`}>
                                                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors border ${
                                                                                            isSelectionMode && isSelected
                                                                                            ? 'bg-red-500 border-red-500 text-white'
                                                                                            : 'theme-bg-low theme-border'
                                                                                        }`}>
                                                                                            {getMediaIcon(nCard.fuenteDeteccion, isSelectionMode && isSelected)}
                                                                                        </div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <h3 className={`font-bold truncate text-base transition-colors ${isSelectionMode && isSelected ? 'text-red-500' : 'theme-text-main'}`}>{nCard.fuenteDeteccion}</h3>
                                                                                            <p className="text-xs font-semibold theme-text-muted mt-0.5 truncate flex items-center gap-1">{inc.fecha} {isAdmin && <><span className="mx-1">|</span> Por: <span className="text-orange-500 truncate">{inc.autor || 'Administrador'}</span></>}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-sm theme-text-main line-clamp-2 min-h-[40px] opacity-90 w-full"><span className="font-bold mr-1">{nCard.actorFuente}:</span> {nCard.resumen}</div>
                                                                                    <div className="text-[11px] theme-text-muted mt-2 px-1 w-full"><span className="font-semibold theme-text-main">Tema:</span> {nCard.temaPrincipal || '—'} <span className="mx-1">·</span><span className="font-semibold theme-text-main">Tipo:</span> {nCard.tipoFuente || '—'}</div>
                                                                                    
                                                                                    <div className="mt-4 flex flex-col gap-2 pt-3 border-t theme-border border-dashed w-full">
                                                                                        <div className="flex flex-wrap items-center justify-between w-full gap-2">
                                                                                            <div className="flex flex-wrap items-center gap-2 flex-1">
                                                                                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider ${getRiskColor(riskStr)}`}>Riesgo: {nCard.nivelRiesgo}</span>
                                                                                                {nCard.alcanceActual && <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-md uppercase tracking-wider whitespace-nowrap ${getNeutralBadge()}`}>Alcance: {nCard.alcanceActual}</span>}{nCard.tendencia && <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-md uppercase tracking-wider whitespace-nowrap ${getNeutralBadge()}`}>Tendencia: {nCard.tendencia}</span>}
                                                                                            </div>
                                                                                            {inc.reporteTexto && (
                                                                                                <div onClick={(e) => { e.stopPropagation(); handleDownloadDocx(inc); }} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors no-print flex-shrink-0" title="Descargar reporte (.docx)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="18"/><line x1="15" y1="15" x2="12" y2="18"/></svg></div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {totalMonthPages > 1 && (
                                                                        <div className="p-4 flex items-center justify-between border-t theme-border bg-black/5 dark:bg-white/5">
                                                                            <p className="text-xs theme-text-muted">Mostrando <span className="font-bold theme-text-main">{((currentMonthPage - 1) * itemsPerPage) + 1}</span> a <span className="font-bold theme-text-main">{Math.min(currentMonthPage * itemsPerPage, monthItems.length)}</span> de <span className="font-bold theme-text-main">{monthItems.length}</span> reportes</p>
                                                                            <div className="flex items-center gap-2">
                                                                                <button type="button" onClick={(e) => { e.stopPropagation(); setPagePerMonth(prev => ({...prev, [monthKey]: Math.max((prev[monthKey] || 1) - 1, 1)})) }} disabled={currentMonthPage === 1} className="p-1.5 rounded-lg theme-bg-low border theme-border theme-text-main hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                                                                <span className="text-xs font-bold theme-text-main px-2">Página {currentMonthPage} de {totalMonthPages}</span>
                                                                                <button type="button" onClick={(e) => { e.stopPropagation(); setPagePerMonth(prev => ({...prev, [monthKey]: Math.min((prev[monthKey] || 1) + 1, totalMonthPages)})) }} disabled={currentMonthPage === totalMonthPages} className="p-1.5 rounded-lg theme-bg-low border theme-border theme-text-main hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DE EXPORTACIÓN INTELIGENTE */}
            {isExportModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 fade-in">
                    <div className="theme-bg-container rounded-2xl w-full max-w-md shadow-2xl border theme-border flex flex-col overflow-hidden">
                        <div className="p-5 border-b theme-border flex justify-between items-center bg-orange-500/5">
                            <h3 className="font-bold theme-text-main flex items-center gap-2"><Download className="w-5 h-5 text-orange-500" /> Exportación Inteligente CSV</h3>
                            <button type="button" onClick={() => setIsExportModalOpen(false)} className="p-2 theme-text-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <p className="text-sm theme-text-muted">Selecciona el alcance de los datos que deseas descargar en formato CSV para tu reporte.</p>
                            <div className="space-y-3">
                                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${exportType === 'all' ? 'border-orange-500 bg-orange-500/5' : 'theme-border theme-bg-low hover:border-gray-400'}`}>
                                    <input type="radio" name="exportType" checked={exportType === 'all'} onChange={() => setExportType('all')} className="w-4 h-4 text-orange-500" />
                                    <div><p className="text-sm font-bold theme-text-main">Todo el Historial</p><p className="text-xs theme-text-muted">Descarga todos los incidentes registrados.</p></div>
                                </label>

                                <label className={`flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${exportType === 'month' ? 'border-orange-500 bg-orange-500/5' : 'theme-border theme-bg-low hover:border-gray-400'}`}>
                                    <div className="flex items-center gap-3">
                                        <input type="radio" name="exportType" checked={exportType === 'month'} onChange={() => setExportType('month')} className="w-4 h-4 text-orange-500" />
                                        <div><p className="text-sm font-bold theme-text-main">Filtrar por Año y/o Mes</p></div>
                                    </div>
                                    {exportType === 'month' && (
                                        <div className="ml-7 flex flex-col gap-3 fade-in mt-2">
                                            <div className="flex gap-3">
                                                <select aria-label="Seleccionar año" value={exportYear} onChange={(e) => setExportYear(e.target.value)} className={`${inputStyles} w-1/2`}>
                                                    <option className={optionStyles} value="">Todos los años</option>
                                                    {availableYears.map((y: any) => <option className={optionStyles} key={y} value={y}>{y}</option>)}
                                                </select>
                                                <select aria-label="Seleccionar mes" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className={`${inputStyles} w-1/2`}>
                                                    <option className={optionStyles} value="">Todos los meses</option>
                                                    {availableMonthsForExport.map((m: any) => <option className={optionStyles} key={m} value={m}>{getMonthName(m)}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </label>

                                <label className={`flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${exportType === 'custom' ? 'border-orange-500 bg-orange-500/5' : 'theme-border theme-bg-low hover:border-gray-400'}`}>
                                    <div className="flex items-center gap-3">
                                        <input type="radio" name="exportType" checked={exportType === 'custom'} onChange={() => { setExportType('custom'); if(!exportYear && availableYears.length) setExportYear(String(availableYears[0])); }} className="w-4 h-4 text-orange-500" />
                                        <div><p className="text-sm font-bold theme-text-main">Combinación Personalizada</p><p className="text-xs theme-text-muted">Combina año, mes, fuente, tema, riesgo, estatus, alcance y tendencia.</p></div>
                                    </div>
                                    {exportType === 'custom' && (
                                        <div className="ml-7 flex flex-col gap-3 fade-in mt-2">
                                            <div className="flex gap-3">
                                                <select aria-label="Seleccionar año" value={exportYear} onChange={(e) => setExportYear(e.target.value)} className={`${inputStyles} w-1/2`}>
                                                    <option className={optionStyles} value="">Todos los años</option>
                                                    {availableYears.map((y: any) => <option className={optionStyles} key={y} value={y}>{y}</option>)}
                                                </select>
                                                <select aria-label="Seleccionar mes" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className={`${inputStyles} w-1/2`} disabled={!exportYear}>
                                                    <option className={optionStyles} value="">Todos los meses</option>
                                                    {availableMonthsForExport.map((m: any) => <option className={optionStyles} key={m} value={m}>{getMonthName(m)}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <select aria-label="Filtrar por fuente" value={exportFuente} onChange={(e) => setExportFuente(e.target.value)} className={`${inputStyles} py-2`}>
                                                    <option className={optionStyles} value="">Toda fuente</option>
                                                    {availableFuentes.map((f: any) => <option className={optionStyles} key={f} value={f}>{f}</option>)}
                                                </select>
                                                <select aria-label="Filtrar por tema" value={exportTema} onChange={(e) => setExportTema(e.target.value)} className={`${inputStyles} py-2`}>
                                                    <option className={optionStyles} value="">Todo tema</option>
                                                    {availableTemas.map((t: any) => <option className={optionStyles} key={t} value={t}>{t}</option>)}
                                                </select>
                                                <select aria-label="Filtrar por riesgo" value={exportRiesgo} onChange={(e) => setExportRiesgo(e.target.value)} className={`${inputStyles} py-2`}>
                                                    <option className={optionStyles} value="">Todo riesgo</option>
                                                    {NIVELES_RIESGO.map(r => <option className={optionStyles} key={r} value={r}>{r}</option>)}
                                                </select>
                                                <select aria-label="Filtrar por alcance" value={exportAlcance} onChange={(e) => setExportAlcance(e.target.value)} className={`${inputStyles} py-2`}>
                                                    <option className={optionStyles} value="">Todo alcance</option>
                                                    {['Aislado', 'Limitado', 'Extendido', 'Viral'].map(o => <option className={optionStyles} key={o} value={o}>{o}</option>)}
                                                </select>
                                                <select aria-label="Filtrar por tendencia" value={exportTendencia} onChange={(e) => setExportTendencia(e.target.value)} className={`${inputStyles} py-2`}>
                                                    <option className={optionStyles} value="">Toda tendencia</option>
                                                    {['Disminuyendo', 'Estable', 'Creciendo rápidamente'].map(o => <option className={optionStyles} key={o} value={o}>{o}</option>)}
                                                </select>
                                            </div>
                                            <button type="button" onClick={clearCustomExportFilters} className="self-start text-xs font-bold text-orange-500 hover:text-orange-400 hover:underline transition-colors">Limpiar combinación</button>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>
                        <div className="p-4 border-t theme-border flex justify-end gap-3 bg-black/5 dark:bg-white/5">
                            <button type="button" onClick={() => setIsExportModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold theme-text-main hover:bg-black/10 dark:hover:bg-white/10 transition-colors">Cancelar</button>
                            <button type="button" onClick={handleExecuteExport} disabled={isExporting} className="px-5 py-2.5 rounded-xl font-bold bg-orange-600 text-white hover:bg-orange-500 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>} 
                                {isExporting ? 'Generando...' : 'Generar CSV'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALLE DE REPORTE */}
            {isDetailOpen && selectedIncident && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 fade-in print:static print:block print:p-0 print:bg-transparent"
                    onMouseDown={(e) => { backdropMouseDownRef.current = e.target === e.currentTarget; }}
                    onClick={(e) => { if (backdropMouseDownRef.current && e.target === e.currentTarget) setIsDetailOpen(false); }}
                >
                    <div className="theme-bg-container rounded-2xl w-full max-w-2xl shadow-2xl border theme-border overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:w-full print:max-w-full rrss-print-area">
                        <div className="p-5 border-b theme-border flex justify-between items-center bg-orange-500/5 no-print print:hidden">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg">{getMediaIcon(nDetail.fuenteDeteccion)}</div>
                                <div><h3 className="font-bold theme-text-main text-lg">{nDetail.fuenteDeteccion}</h3><p className="text-xs theme-text-muted font-medium">{nDetail.fecha}</p></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => window.print()} className="p-2 theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors" title="Imprimir"><Printer className="w-5 h-5"/></button>
                                {isAdmin && (
                                    <>
                                        <button type="button" onClick={openEdit} className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors" title="Editar"><Edit3 className="w-5 h-5"/></button>
                                        <button type="button" onClick={handleDelete} className="p-2 text-[var(--error)] hover:bg-[var(--error)]/10 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-5 h-5"/></button>
                                    </>
                                )}
                                <button type="button" onClick={() => setIsDetailOpen(false)} className="p-2 theme-text-muted hover:theme-text-main bg-black/5 dark:bg-white/5 rounded-lg"><X className="w-5 h-5"/></button>
                            </div>
                        </div>

                            {/* ── LAYOUT DE IMPRESIÓN (réplica exacta del .docx) ── */}
                            <div className="hidden print:block text-black text-[10.5pt] leading-normal">
                                <h1 className="text-[16pt] font-bold text-orange-600 border-b-2 border-orange-500 pb-1.5 mb-3">ENGIE MANAGEMENT - INFORME DE INCIDENTE REPUTACIONAL</h1>
                                <table className="w-full border-collapse">
                                    <tbody>
                                        <tr><td className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 w-[30%] align-top">Fecha Recepción</td><td className="border border-gray-400 px-2 py-1.5 align-top">{nDetail.fecha}</td></tr>
                                        <tr><td className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 align-top">Volumen Incidencias</td><td className="border border-gray-400 px-2 py-1.5 align-top">{nDetail.totalIncidencias || 1}</td></tr>
                                        <tr><td className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 align-top">Actor / Fuente</td><td className="border border-gray-400 px-2 py-1.5 align-top break-all">{isUrl(nDetail.actorFuente) ? <a href={nDetail.actorFuente} className="text-blue-700 underline">{nDetail.actorFuente}</a> : nDetail.actorFuente}</td></tr>
                                        <tr><td className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 align-top">Fuente de Detección</td><td className="border border-gray-400 px-2 py-1.5 align-top">{nDetail.fuenteDeteccion}</td></tr>
                                        <tr><td className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 align-top">Tipo de Fuente</td><td className="border border-gray-400 px-2 py-1.5 align-top">{nDetail.tipoFuente || 'N/A'}</td></tr>
                                        <tr><td className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 align-top">Tema Principal</td><td className="border border-gray-400 px-2 py-1.5 align-top">{nDetail.temaPrincipal || 'N/A'}</td></tr>
                                        <tr><td className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 align-top">Nivel de Riesgo</td><td className="border border-gray-400 px-2 py-1.5 align-top">{nDetail.nivelRiesgo}</td></tr>
                                        <tr><td className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 align-top">Alcance Actual</td><td className="border border-gray-400 px-2 py-1.5 align-top">{nDetail.alcanceActual || 'N/A'}</td></tr>
                                        <tr><td className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 align-top">Tendencia</td><td className="border border-gray-400 px-2 py-1.5 align-top">{nDetail.tendencia || 'N/A'}</td></tr>
                                        <tr><td className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 align-top">Registrado por</td><td className="border border-gray-400 px-2 py-1.5 align-top">{nDetail.autor || 'Admin'}</td></tr>
                                    </tbody>
                                </table>
                                <p className="text-[12pt] font-bold text-orange-600 border-b border-orange-500 pb-0.5 mt-5 mb-1.5">Resumen del Incidente:</p>
                                <div className="border border-gray-400 p-2.5 bg-gray-50 whitespace-pre-wrap">{nDetail.resumen || ''}</div>
                                <p className="text-[12pt] font-bold text-orange-600 border-b border-orange-500 pb-0.5 mt-4 mb-1.5">Hallazgos Clave:</p>
                                <div className="border border-gray-400 p-2.5 bg-gray-50 whitespace-pre-wrap">{nDetail.hallazgosClave || 'Sin hallazgos registrados.'}</div>
                                {selectedIncident.reporteTexto && (<><p className="text-[12pt] font-bold text-orange-600 border-b border-orange-500 pb-0.5 mt-4 mb-1.5">Análisis Interno:</p><style>{editorStyles}</style><div className="border border-gray-400 p-2.5 bg-gray-50 prose-editor" dangerouslySetInnerHTML={{ __html: selectedIncident.reporteTexto }} /></>)}
                                <p className="text-[12pt] font-bold text-orange-600 border-b border-orange-500 pb-0.5 mt-4 mb-1.5">Referencias y Evidencias:</p>
                                <div className="border border-gray-400 p-2.5 bg-gray-50">
                                    {selectedIncident.enlacePublicacion && <p className="m-1"><b>Enlace a la Publicación Original:</b> <a href={selectedIncident.enlacePublicacion} className="text-blue-700 underline break-all">{selectedIncident.enlacePublicacion}</a></p>}
                                    {selectedIncident.enlaceDrive && <p className="m-1"><b>Repositorio de Evidencia (Drive):</b> <a href={selectedIncident.enlaceDrive} className="text-blue-700 underline break-all">{selectedIncident.enlaceDrive}</a></p>}
                                    {selectedIncident.reporteTexto && <p className="m-1"><b>Reporte Oficial:</b> Documento Word (.docx) generado desde la plataforma.</p>}
                                    {!selectedIncident.enlacePublicacion && !selectedIncident.enlaceDrive && !selectedIncident.reporteTexto && <p className="italic">Sin referencias adjuntas.</p>}
                                </div>
                                <p className="mt-5 pt-2 border-t border-gray-400 text-[9.5pt] text-gray-600 italic">Reportado por: {selectedIncident.autor || 'Administrador'} · Generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            </div>

                            {/* Contenido interactivo (solo pantalla) */}
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 print:hidden">

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 print:mt-4 print:mb-6 print:gap-4">
                                <div className="print:mb-2"><p className="text-xs theme-text-muted font-medium mb-1 print:text-xs print:font-bold print:text-gray-600">Fecha de Recepción</p><p className="font-bold theme-text-main bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg inline-block print:bg-gray-100 print:text-black print:text-sm">{nDetail.fecha}</p></div>
                                <div className="print:mb-2"><p className="text-xs theme-text-muted font-medium mb-1 print:text-xs print:font-bold print:text-gray-600">Volumen (Total Incidencias)</p><p className="font-bold theme-text-main bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg inline-block print:bg-gray-100 print:text-black print:text-sm">{nDetail.totalIncidencias || 1}</p></div>
                                <div className="print:mb-2"><p className="text-xs theme-text-muted font-medium mb-1 print:text-xs print:font-bold print:text-gray-600">Actor o Fuente</p>
                                    {isUrl(nDetail.actorFuente) ? (
                                        <a href={nDetail.actorFuente} target="_blank" rel="noopener noreferrer" className="font-bold text-orange-500 hover:underline inline-flex items-center gap-1.5 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg print:bg-gray-100 print:text-black print:text-sm print:no-underline"><LinkIcon className="w-3.5 h-3.5 print:hidden" />Enlace</a>
                                    ) : (
                                        <p className="font-bold theme-text-main bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg inline-block break-all print:bg-gray-100 print:text-black print:text-sm">{nDetail.actorFuente}</p>
                                    )}
                                </div>
                                <div className="print:mb-2"><p className="text-xs theme-text-muted font-medium mb-1 print:text-xs print:font-bold print:text-gray-600">Fuente de Detección</p><p className="font-bold theme-text-main bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg inline-block print:bg-gray-100 print:text-black print:text-sm">{nDetail.fuenteDeteccion}</p></div>
                                <div className="print:mb-2"><p className="text-xs theme-text-muted font-medium mb-1 print:text-xs print:font-bold print:text-gray-600">Tipo de Fuente</p><span className={`inline-block px-3 py-1 rounded-md text-xs font-bold border print:bg-gray-100 print:text-black print:border-gray-300 print:text-sm`}>{nDetail.tipoFuente || '—'}</span></div>
                                <div className="print:mb-2"><p className="text-xs theme-text-muted font-medium mb-1 print:text-xs print:font-bold print:text-gray-600">Tema Principal</p><p className="font-bold theme-text-main print:text-black print:text-sm">{nDetail.temaPrincipal || '—'}</p></div>
                                <div className="print:mb-2"><p className="text-xs theme-text-muted font-medium mb-1 print:text-xs print:font-bold print:text-gray-600">Nivel de Riesgo Reputacional</p><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border print:bg-gray-100 print:text-black print:border-gray-300 print:text-sm`}><span className={`w-2 h-2 rounded-full ${riskDot(nDetail.nivelRiesgo as string)} print:bg-gray-600`}></span>{nDetail.nivelRiesgo}</span></div>
                                <div className="print:mb-2"><p className="text-xs theme-text-muted font-medium mb-1 print:text-xs print:font-bold print:text-gray-600">Alcance Actual</p><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border print:bg-gray-100 print:text-black print:border-gray-300 print:text-sm`}><span className={`w-2 h-2 rounded-full ${getAlcanceDot(nDetail.alcanceActual || '')} print:bg-gray-600`}></span>{nDetail.alcanceActual || 'N/A'}</span></div>
                                <div className="print:mb-2"><p className="text-xs theme-text-muted font-medium mb-1 print:text-xs print:font-bold print:text-gray-600">Tendencia</p><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border print:bg-gray-100 print:text-black print:border-gray-300 print:text-sm`}><span className={`w-2 h-2 rounded-full ${getTendenciaDot(nDetail.tendencia || '')} print:bg-gray-600`}></span>{nDetail.tendencia || 'N/A'}</span></div>
                            </div>

                            <div className="space-y-6 print:space-y-4">
                                <div className="print:break-inside-avoid">
                                    <p className="text-xs theme-text-muted font-semibold mb-3 uppercase tracking-wider border-b theme-border pb-1 print:text-sm print:font-bold print:text-black print:border-gray-300">Detalles del Incidente</p>
                                    <div className="space-y-4 print:space-y-2">
                                        <div className="print:mb-3"><p className="text-xs theme-text-muted font-medium mb-1.5 uppercase tracking-wider print:text-xs print:font-bold print:text-black">Resumen del Incidente</p><div className="p-4 theme-bg-low rounded-xl border theme-border theme-text-main whitespace-pre-wrap text-sm leading-relaxed print:p-3 print:bg-gray-50 print:border-gray-200 print:text-sm">{nDetail.resumen}</div></div>
                                        {nDetail.hallazgosClave && <div className="print:mb-3"><p className="text-xs theme-text-muted font-medium mb-1.5 uppercase tracking-wider print:text-xs print:font-bold print:text-black">Hallazgos Clave</p><div className="p-4 theme-bg-low rounded-xl border theme-border theme-text-main whitespace-pre-wrap text-sm leading-relaxed print:p-3 print:bg-gray-50 print:border-gray-200 print:text-sm">{nDetail.hallazgosClave}</div></div>}
                                        {selectedIncident.reporteTexto && (
                                            <div className="print:mb-3 print:break-inside-avoid">
                                                <p className="text-xs theme-text-muted font-medium mb-1.5 uppercase tracking-wider print:text-xs print:font-bold print:text-black">Análisis Interno</p>
                                                <style>{editorStyles}</style>
                                                <div className="p-4 theme-bg-low rounded-xl border theme-border theme-text-main text-sm leading-relaxed prose-editor print:p-3 print:bg-gray-50 print:border-gray-200 print:text-sm" dangerouslySetInnerHTML={{ __html: selectedIncident.reporteTexto }} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="print:break-inside-avoid">
                                    <p className="text-xs theme-text-muted font-semibold mb-3 uppercase tracking-wider border-b theme-border pb-1 print:text-sm print:font-bold print:text-black print:border-gray-300">Referencias y Evidencias</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-3">
                                        {selectedIncident.enlacePublicacion && (<a href={selectedIncident.enlacePublicacion} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 theme-bg-low border theme-border rounded-xl hover:border-orange-500 transition-colors group print:p-2 print:bg-gray-50 print:border-gray-200 print:no-underline"><div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg flex-shrink-0 print:bg-orange-100"><LinkIcon className="w-4 h-4"/></div><div className="overflow-hidden"><p className="text-xs font-bold theme-text-main group-hover:text-orange-500 transition-colors print:text-black">Enlace a la Publicación Original</p><p className="text-[10px] theme-text-muted truncate print:text-gray-600">{selectedIncident.enlacePublicacion}</p></div></a>)}
                                        {selectedIncident.enlaceDrive && (<a href={selectedIncident.enlaceDrive} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 theme-bg-low border theme-border rounded-xl hover:border-green-500 transition-colors group print:p-2 print:bg-gray-50 print:border-gray-200 print:no-underline"><div className="p-2 bg-green-500/10 text-green-600 rounded-lg flex-shrink-0 print:bg-green-100"><HardDrive className="w-4 h-4"/></div><div className="overflow-hidden"><p className="text-xs font-bold theme-text-main group-hover:text-green-600 transition-colors print:text-black">Repositorio de Evidencia (Drive)</p><p className="text-[10px] theme-text-muted truncate print:text-gray-600">{selectedIncident.enlaceDrive}</p></div></a>)}
                                        {selectedIncident.reporteTexto && (<div onClick={() => handleDownloadDocx(selectedIncident)} className="cursor-pointer flex items-center gap-3 p-3 theme-bg-low border theme-border rounded-xl hover:border-blue-500 transition-colors group print:p-2 print:bg-gray-50 print:border-gray-200"><div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg flex-shrink-0 print:bg-blue-100"><FileText className="w-4 h-4"/></div><div className="overflow-hidden"><p className="text-xs font-bold theme-text-main group-hover:text-blue-500 transition-colors print:text-black">Reporte Oficial</p><p className="text-[10px] theme-text-muted print:text-gray-600">Clic para descargar (.docx)</p></div></div>)}
                                        {!selectedIncident.enlacePublicacion && !selectedIncident.enlaceDrive && !selectedIncident.reporteTexto && <p className="text-xs theme-text-muted italic print:text-gray-500">Sin referencias adjuntas.</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-4 border-t theme-border flex justify-between items-center print:mt-6 print:pt-3 print:border-gray-300">
                                {isAdmin ? <p className="text-sm font-bold theme-text-muted italic flex items-center gap-2 print:text-xs print:text-gray-600"><span className="w-2 h-2 rounded-full bg-orange-500 print:bg-gray-600"></span>Reportado por: <span className="theme-text-main print:text-black">{selectedIncident.autor || 'Administrador'}</span></p> : <p className="text-sm font-bold theme-text-muted italic flex items-center gap-2 print:text-xs print:text-gray-600"><span className="w-2 h-2 rounded-full bg-gray-400 print:bg-gray-600"></span>Registro de sistema (Acceso público)</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE EDICIÓN */}
            {isEditOpen && selectedIncident && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 fade-in">
                    <div className="theme-bg-container rounded-2xl w-full max-w-3xl shadow-2xl border theme-border flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b theme-border flex justify-between items-center bg-orange-500/5">
                            <h3 className="font-bold theme-text-main flex items-center gap-2"><Edit3 className="w-5 h-5 text-orange-500" /> Editar Incidente RRSS</h3>
                            <button type="button" onClick={() => setIsEditOpen(false)} className="p-2 theme-text-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
<form id="editRrssForm" onSubmit={(e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                const cleanHTML = DOMPurify.sanitize(editEditorRef.current ? editEditorRef.current.innerHTML : (selectedIncident.reporteTexto || ''));
                                updateRrssIncident(selectedIncident.id, {
                                    // La regla isValidRRSSIncident usa hasAll/hasOnly:
                                    // autor y timestamp deben conservarse del doc original.
                                    autor: selectedIncident.autor,
                                    timestamp: selectedIncident.timestamp,
                                    fecha: fd.get('fecha'),
                                    totalIncidencias: parseInt(fd.get('total') as string) || 1,
                                    actorFuente: fd.get('actorFuente'),
                                    fuenteDeteccion: fd.get('fuenteDeteccion'),
                                    tipoFuente: fd.get('tipoFuente'),
                                    temaPrincipal: fd.get('temaPrincipal'),
                                    nivelRiesgoReputacional: fd.get('nivelRiesgo'),
                                    alcanceActual: fd.get('alcanceActual'),
                                    tendencia: fd.get('tendencia'),
                                    area: fd.get('area'),
                                    resumenIncidente: fd.get('resumenIncidente'),
                                    hallazgosClave: fd.get('hallazgosClave'),
                                    enlacePublicacion: fd.get('enlacePub'),
                                    enlaceDrive: fd.get('enlaceDrive'),
                                    reporteTexto: cleanHTML,
                                    estado: selectedIncident.estado || 'Monitoreo activo'
                                });
                                setIsEditOpen(false);
                            }} className="space-y-5">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div><label htmlFor="er-total" className="text-xs font-bold theme-text-muted">Volumen (Total)</label><input id="er-total" name="total" type="number" min="1" required defaultValue={nDetail.totalIncidencias} className={inputStyles} /></div>
                                    <div><label htmlFor="er-fecha" className="text-xs font-bold theme-text-muted">Fecha de Recepción</label><input id="er-fecha" name="fecha" type="date" required defaultValue={nDetail.fecha} className={`${inputStyles} [color-scheme:light] dark:[color-scheme:dark]`} /></div>
                                    <div><label htmlFor="er-actorFuente" className="text-xs font-bold theme-text-muted">Actor o Fuente</label><input id="er-actorFuente" name="actorFuente" type="text" required defaultValue={nDetail.actorFuente} className={inputStyles} /></div>
                                    <div>
                                        <label htmlFor="er-fuenteDeteccion" className="text-xs font-bold theme-text-muted">Fuente de Detección</label>
                                        <select id="er-fuenteDeteccion" name="fuenteDeteccion" defaultValue={nDetail.fuenteDeteccion} className={inputStyles}>
                                            {(() => { const opts = ['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'X', 'Medios Digitales']; return (<>{nDetail.fuenteDeteccion && nDetail.fuenteDeteccion !== 'N/A' && !opts.includes(nDetail.fuenteDeteccion) && <option className={optionStyles} value={nDetail.fuenteDeteccion}>{nDetail.fuenteDeteccion} (actual)</option>}{opts.map(o => <option className={optionStyles} key={o} value={o}>{o}</option>)}</>); })()}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="er-tipoFuente" className="text-xs font-bold theme-text-muted">Tipo de Fuente</label>
                                        <select id="er-tipoFuente" name="tipoFuente" defaultValue={nDetail.tipoFuente} className={inputStyles}>
                                            {(() => { const opts = ['Queja', 'Desinformación', 'Acusación', 'Denuncia', 'Cuestionamiento', 'Riesgo de seguridad', 'Conflicto comunitario', 'Tema legal', 'Cobertura negativa', 'Crisis activa']; return (<>{nDetail.tipoFuente && !opts.includes(nDetail.tipoFuente) && <option className={optionStyles} value={nDetail.tipoFuente}>{nDetail.tipoFuente} (actual)</option>}{opts.map(o => <option className={optionStyles} key={o} value={o}>{o}</option>)}</>); })()}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="er-temaPrincipal" className="text-xs font-bold theme-text-muted">Tema Principal</label>
                                        <select id="er-temaPrincipal" name="temaPrincipal" defaultValue={nDetail.temaPrincipal} className={inputStyles}>
                                            {(() => { const opts = ['Seguridad y regulación', 'Comunidades e impacto social', 'Legal y derechos humanos', 'Medio ambiente', 'Afectaciones o riesgos', 'Avances de obra e infraestructura', 'Reputación corporativa']; return (<>{nDetail.temaPrincipal && !opts.includes(nDetail.temaPrincipal) && <option className={optionStyles} value={nDetail.temaPrincipal}>{nDetail.temaPrincipal} (actual)</option>}{opts.map(o => <option className={optionStyles} key={o} value={o}>{o}</option>)}</>); })()}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="er-nivelRiesgo" className="text-xs font-bold theme-text-muted">Nivel de Riesgo Reputacional</label>
                                        <select id="er-nivelRiesgo" name="nivelRiesgo" defaultValue={String(nDetail.nivelRiesgo)} className={`${inputStyles} font-bold`}>
                                            <option className={optionStyles} value="Bajo">🟢 Bajo</option>
                                            <option className={optionStyles} value="Medio">🟠 Medio</option>
                                            <option className={optionStyles} value="Alto">🟡 Alto</option>
                                            <option className={optionStyles} value="Crítico">🔴 Crítico</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="er-alcance" className="text-xs font-bold theme-text-muted">Alcance Actual</label>
                                        <select id="er-alcance" name="alcanceActual" defaultValue={nDetail.alcanceActual} className={`${inputStyles} font-bold`}>
                                            {(() => { const opts = ['Aislado', 'Limitado', 'Extendido', 'Viral']; return (<>{nDetail.alcanceActual && !opts.includes(nDetail.alcanceActual) && <option className={optionStyles} value={nDetail.alcanceActual}>{nDetail.alcanceActual} (actual)</option>}{opts.map(o => <option className={optionStyles} key={o} value={o}>{o}</option>)}</>); })()}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="er-tendencia" className="text-xs font-bold theme-text-muted">Tendencia</label>
                                        <select id="er-tendencia" name="tendencia" defaultValue={nDetail.tendencia} className={`${inputStyles} font-bold`}>
                                            {(() => { const opts = ['Disminuyendo', 'Estable', 'Creciendo rápidamente']; return (<>{nDetail.tendencia && !opts.includes(nDetail.tendencia) && <option className={optionStyles} value={nDetail.tendencia}>{nDetail.tendencia} (actual)</option>}{opts.map(o => <option className={optionStyles} key={o} value={o}>{o}</option>)}</>); })()}
                                        </select>
                                    </div>
                                    <div><label htmlFor="er-area" className="text-xs font-bold theme-text-muted">Área Responsable</label><select id="er-area" name="area" defaultValue={nDetail.area || 'Operaciones'} className={inputStyles}><option className={optionStyles} value="Operaciones">Operaciones</option><option className={optionStyles} value="Legal">Legal</option><option className={optionStyles} value="Comercial - Call Center">Comercial - Call Center</option></select></div>
                                </div>
                                <div><label htmlFor="er-resumenIncidente" className="text-xs font-bold theme-text-muted">Resumen del Incidente</label><textarea id="er-resumenIncidente" name="resumenIncidente" rows={3} required defaultValue={nDetail.resumen} className={`${inputStyles} resize-none leading-relaxed`}></textarea></div>
                                <div><label htmlFor="er-hallazgosClave" className="text-xs font-bold theme-text-muted">Hallazgos Clave</label><textarea id="er-hallazgosClave" name="hallazgosClave" rows={3} maxLength={500} defaultValue={nDetail.hallazgosClave} className={`${inputStyles} resize-none leading-relaxed`}></textarea></div>
                                <div>
                                    <label className="text-xs font-bold theme-text-muted mb-1 block">Editar análisis interno (Texto Enriquecido)</label>
                                    <div className="border theme-border rounded-xl overflow-hidden theme-bg-container focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400 transition-all">
                                        <EditorToolbar onCommand={execEditCommand} />
                                        <div className="w-full p-4 theme-text-main theme-bg-low outline-none min-h-[160px] overflow-y-auto max-h-[300px] text-sm leading-relaxed custom-scrollbar wysiwyg-content" ref={editEditorRef} contentEditable dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedIncident.reporteTexto || '') }} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label htmlFor="er-enlacePub" className="text-xs font-bold theme-text-muted">Enlace a la Publicación Original</label><input id="er-enlacePub" name="enlacePub" type="url" defaultValue={nDetail.enlacePublicacion} className={inputStyles} /></div>
                                    <div><label htmlFor="er-enlaceDrive" className="text-xs font-bold theme-text-muted">Repositorio de Evidencia (Drive)</label><input id="er-enlaceDrive" name="enlaceDrive" type="url" defaultValue={nDetail.enlaceDrive} className={inputStyles} /></div>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t theme-border flex justify-end gap-3 bg-black/5 dark:bg-white/5">
                            <button type="button" onClick={() => setIsEditOpen(false)} className="px-5 py-2 rounded-xl font-bold theme-text-main hover:bg-black/10 dark:hover:bg-white/10 transition-colors">Cancelar</button>
                            <button type="submit" form="editRrssForm" className="px-5 py-2 rounded-xl font-bold bg-orange-600 text-white hover:bg-orange-500 flex items-center gap-2"><Save className="w-4 h-4"/> Actualizar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};