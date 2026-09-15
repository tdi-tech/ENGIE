import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
    Save, Download, Trash2, MessageSquare, Printer, X, Edit3, 
    Link as LinkIcon, Calendar, PlusCircle, Share2, MapPin, 
    Frown, Meh, Smile, Search, ChevronDown, ChevronRight, ChevronLeft, Loader2,
    CheckSquare, Check, Filter
} from 'lucide-react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db, appId, IS_MOCK } from '../../../services/firebase/config';
import { getMonthName } from '../../../shared/utils/date';
import { calcCommentAnalytics, normalizeMenciones, isRegistroVacio } from '../../../shared/utils/menciones';
import { extractFuenteLabel, extractFuenteUrl } from '../../../shared/utils/fuenteUtils';

const inputStyles = "w-full p-3 rounded-xl theme-bg-low border theme-border theme-text-main focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm";
const radioLabelStyles = "flex items-center gap-2 text-sm font-medium theme-text-main cursor-pointer";



const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
    if (!sentiment) return null;
    if (sentiment === 'Negativo') return <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1 shadow-sm transition-transform hover:scale-105"><Frown className="w-3.5 h-3.5" /> Negativo</span>;
    if (sentiment === 'Neutral') return <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30 flex items-center gap-1 shadow-sm transition-transform hover:scale-105"><Meh className="w-3.5 h-3.5" /> Neutral</span>;
    if (sentiment === 'Positivo') return <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 flex items-center gap-1 shadow-sm transition-transform hover:scale-105"><Smile className="w-3.5 h-3.5" /> Positivo</span>;
    return null;
};

// ── Helpers de semáforo para el modal de menciones ──
// Semáforo: devuelve punto de color + clases de badge
const getSentimentDot = (s: string): { dot: string; badge: string } => {
    if (s === 'Positivo') return { dot: 'bg-green-500', badge: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30' };
    if (s === 'Neutral') return { dot: 'bg-slate-500', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30' };
    return { dot: 'bg-red-500', badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30' };
};
const getRiesgoDot = (r: string): { dot: string; badge: string } => {
    if (r === 'Bajo') return { dot: 'bg-green-500', badge: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30' };
    if (r === 'Medio') return { dot: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30' };
    if (r === 'Alto') return { dot: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30' };
    return { dot: 'bg-red-500', badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30' };
};
const getEstatusDot = (e: string): { dot: string; badge: string } => {
    if (e === 'Cerrado') return { dot: 'bg-green-500', badge: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30' };
    if (e === 'Escalado') return { dot: 'bg-red-500', badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30' };
    return { dot: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30' };
};

// ── Piezas del layout de impresión del reporte de menciones ──
// Fila etiqueta/valor con el mismo estilo de tabla que el informe de incidencias RRSS
const PrintRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <tr>
        <td className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 w-[30%] align-top">{label}</td>
        <td className="border border-gray-400 px-2 py-1.5 align-top break-words">{children}</td>
    </tr>
);

// Punto de semáforo para el documento impreso (se conserva el color exacto en el PDF)
const PrintDot = ({ color }: { color: string }) => (
    <span className={`inline-block w-2 h-2 rounded-full align-middle mr-1 ${color}`} />
);

export const NewCommentView = ({ isAdmin, showToast, navigate, user, logAction }: any) => {
    const [formData, setFormData] = useState<any>({
        fechaPublicacion: '', horaDeteccion: '', fuenteMonitoreo: 'Redes sociales', evidencia: '',
        registrosList: [{
            id: Date.now().toString(),
            canal: 'Facebook',
            tipoActor: '',
            usuarioSitioWeb: '',
            sentiment: '',
            narrativa: '',
            narrativaOtro: '',
            tipoActorOtro: '',
            nivelRiesgo: '',
            estatus: '',
            visualizaciones: '',
            reacciones: '',
            comentarios: '',
            compartidos: '',
            hallazgoReputacional: '',
            linkPublicacion: ''
        }],
        registrosDigitalesList: [{
            id: Date.now().toString(),
            sitioWeb: '',
            tipoActor: '',
            tipoActorOtro: '',
            sentimiento: '',
            narrativa: '',
            narrativaOtro: '',
            nivelRiesgo: '',
            estatus: '',
            hallazgoReputacional: '',
            linkPublicacion: ''
        }]
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const addRegistro = () => {
        const last = formData.registrosList[formData.registrosList.length - 1];
        setFormData({
            ...formData,
            registrosList: [...formData.registrosList, {
                id: Date.now().toString(),
                canal: last.canal,
                tipoActor: last.tipoActor,
                usuarioSitioWeb: '',
                sentiment: '',
                narrativa: last.narrativa,
                narrativaOtro: '',
                tipoActorOtro: '',
                nivelRiesgo: '',
                estatus: '',
                visualizaciones: '',
                reacciones: '',
                comentarios: '',
                compartidos: '',
                hallazgoReputacional: '',
                linkPublicacion: ''
            }]
        });
    };

    const updateRegistro = (index: number, field: string, value: string) => {
        const newList = [...formData.registrosList];
        newList[index] = { ...newList[index], [field]: value };
        setFormData({ ...formData, registrosList: newList });
    };

    const removeRegistro = (index: number) => {
        const newList = formData.registrosList.filter((_: any, i: number) => i !== index);
        setFormData({ ...formData, registrosList: newList });
    };

    const addRegistroDigital = () => {
        const last = formData.registrosDigitalesList[formData.registrosDigitalesList.length - 1];
        setFormData({
            ...formData,
            registrosDigitalesList: [...formData.registrosDigitalesList, {
                id: Date.now().toString(),
                sitioWeb: '',
                tipoActor: last.tipoActor,
                tipoActorOtro: '',
                sentimiento: '',
                narrativa: last.narrativa,
                narrativaOtro: '',
                nivelRiesgo: '',
                estatus: '',
                hallazgoReputacional: '',
                linkPublicacion: ''
            }]
        });
    };

    const updateRegistroDigital = (index: number, field: string, value: string) => {
        const newList = [...formData.registrosDigitalesList];
        newList[index] = { ...newList[index], [field]: value };
        setFormData({ ...formData, registrosDigitalesList: newList });
    };

    const removeRegistroDigital = (index: number) => {
        const newList = formData.registrosDigitalesList.filter((_: any, i: number) => i !== index);
        setFormData({ ...formData, registrosDigitalesList: newList });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return showToast('Permisos insuficientes.', true);
        setIsSubmitting(true);
        try {
            // 🧹 Solo persistimos la lista activa y descartamos registros vacíos
            const { registrosList, registrosDigitalesList, ...rest } = formData;
            const payload = formData.fuenteMonitoreo === 'Medios digitales'
                ? { ...rest, registrosDigitalesList: registrosDigitalesList.filter((r: any) => !isRegistroVacio(r, 'md')) }
                : { ...rest, registrosList: registrosList.filter((r: any) => !isRegistroVacio(r, 'rs')) };

            const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'comments'), {
                ...payload, autor: user?.displayName || 'Administrador', timestamp: new Date().toISOString()
            });

            if (logAction) await logAction('Creó un nuevo reporte de comentarios', 'Comentarios', 'create', docRef.id);

            showToast('Reporte guardado exitosamente.'); navigate('historial-comentario');
        } catch (error) { showToast('Error al guardar.', true); }
        setIsSubmitting(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 fade-in pb-16">
            
            <div className="theme-bg-container p-6 sm:p-10 rounded-[2rem] border theme-border shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-700">
                    <MessageSquare className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Trazabilidad Comunitaria
                    </p>
                    <h2 className="text-4xl font-black theme-text-main mb-4 tracking-tight">Crear Reporte de Menciones</h2>
                    <p className="theme-text-muted text-base max-w-2xl leading-relaxed">
                        Registro de menciones detectadas en medios digitales y redes sociales durante un periodo específico. Analizar su origen, alcance, tono, narrativa y nivel de riesgo para generar un reporte reputacional.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 px-2 sm:px-8">
                
                <div className="space-y-4">
                    <h3 className="text-xl font-black theme-text-main flex items-center gap-2 border-b-2 border-gray-200 dark:border-gray-800 pb-3">
                        <Calendar className="w-5 h-5 text-blue-500" /> Parámetros Globales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-black/5 dark:bg-white/5 rounded-2xl border theme-border">
                        <div className="space-y-4">
                            <label className="text-sm font-bold theme-text-main block">Parámetros del Reporte</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5"><label htmlFor="n-fechaPublicacion" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Fecha de publicación</label><input id="n-fechaPublicacion" type="date" required value={formData.fechaPublicacion} onChange={(e) => setFormData({...formData, fechaPublicacion: e.target.value})} className={`${inputStyles} [color-scheme:light] dark:[color-scheme:dark]`} /></div>
                                <div className="space-y-1.5"><label htmlFor="n-horaDeteccion" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Hora de detección</label><input id="n-horaDeteccion" type="time" required value={formData.horaDeteccion} onChange={(e) => setFormData({...formData, horaDeteccion: e.target.value})} className={`${inputStyles} [color-scheme:light] dark:[color-scheme:dark]`} /></div>
                            </div>
                        </div>
                        <div className="space-y-4 flex flex-col justify-center border-t md:border-t-0 md:border-l theme-border pt-6 md:pt-0 md:pl-8">
                            <label className="text-sm font-bold theme-text-main block">Fuente de Monitoreo</label>
                            <div className="flex flex-wrap items-center gap-8 mt-1">
                                <label className={radioLabelStyles}><input type="radio" name="fuenteMonitoreo" value="Redes sociales" checked={formData.fuenteMonitoreo === 'Redes sociales'} onChange={(e) => setFormData({...formData, fuenteMonitoreo: e.target.value})} className="w-5 h-5 text-blue-500 focus:ring-blue-500" /> <span className="text-base">Redes sociales</span></label>
                                <label className={radioLabelStyles}><input type="radio" name="fuenteMonitoreo" value="Medios digitales" checked={formData.fuenteMonitoreo === 'Medios digitales'} onChange={(e) => setFormData({...formData, fuenteMonitoreo: e.target.value})} className="w-5 h-5 text-blue-500 focus:ring-blue-500" /> <span className="text-base">Medios digitales</span></label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pt-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-gray-200 dark:border-gray-800 pb-3">
                        <h3 className="text-xl font-black theme-text-main flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-blue-500" /> {formData.fuenteMonitoreo === 'Redes sociales' ? 'Desglose de Menciones - Redes Sociales' : 'Desglose de Menciones - Medios Digitales'}
                        </h3>
                        <button type="button" onClick={formData.fuenteMonitoreo === 'Redes sociales' ? addRegistro : addRegistroDigital} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-xl transition-colors">
                            <PlusCircle className="w-4 h-4"/> Agregar nuevo registro
                        </button>
                    </div>

                    {formData.fuenteMonitoreo === 'Redes sociales' ? (
                        <div className="space-y-6">
                            {formData.registrosList.map((registro: any, idx: number) => (
                                <div key={registro.id || idx} className="p-6 sm:p-8 theme-bg-container border theme-border rounded-[1.5rem] relative fade-in shadow-sm group border-l-[6px] border-l-blue-500 hover:border-l-blue-600 transition-all">
                                    {formData.registrosList.length > 1 && (
                                        <button type="button" onClick={() => removeRegistro(idx)} className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm" title="Eliminar este registro">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    )}
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 flex items-center justify-center text-xs font-black">{idx + 1}</span>
                                        <h4 className="font-bold theme-text-main text-lg">Detalle del Registro</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label htmlFor={`canal-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Canal</label>
                                            <select id={`canal-${idx}`} value={registro.canal} onChange={(e) => updateRegistro(idx, 'canal', e.target.value)} className={inputStyles}>
                                                {['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'X'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`tipoActor-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Tipo de Actor</label>
                                            <select id={`tipoActor-${idx}`} value={registro.tipoActor} onChange={(e) => updateRegistro(idx, 'tipoActor', e.target.value)} className={`${inputStyles} ${!registro.tipoActor ? 'text-gray-400' : ''}`}>
                                                <option value="" disabled>Seleccionar tipo de actor...</option>
                                                {['Gobierno', 'Creadores de contenido', 'Detractor', 'Portales de noticias', 'Periódicos digitales', 'Medios especializados', 'Sitios institucionales', 'Medios Locales', 'Otro'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        {registro.tipoActor === 'Otro' && (
                                            <div className="space-y-1.5 md:col-span-2">
                                                <label htmlFor={`tipoActorOtro-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Especificar Tipo de Actor</label>
                                                <input id={`tipoActorOtro-${idx}`} type="text" required placeholder="Describe el tipo de actor..." value={registro.tipoActorOtro} onChange={(e) => updateRegistro(idx, 'tipoActorOtro', e.target.value)} className={inputStyles} />
                                            </div>
                                        )}
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label htmlFor={`usuario-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Usuario o Sitio Web</label>
                                            <input id={`usuario-${idx}`} type="url" required placeholder="Ej: https://twitter.com/usuario o https://sitio-web.com" value={registro.usuarioSitioWeb} onChange={(e) => updateRegistro(idx, 'usuarioSitioWeb', e.target.value)} className={inputStyles} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`sentimiento-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Sentimiento de la Mención</label>
                                            <select id={`sentimiento-${idx}`} required value={registro.sentiment} onChange={(e) => updateRegistro(idx, 'sentiment', e.target.value)} className={`${inputStyles} ${!registro.sentiment ? 'text-gray-400' : ''}`}>
                                                <option value="" disabled>Seleccionar sentimiento...</option>
                                                <option value="Positivo" className="text-green-600 dark:text-green-400">🟢 Positivo</option>
                                                <option value="Neutral" className="text-yellow-600 dark:text-yellow-400">🟡 Neutral</option>
                                                <option value="Negativo" className="text-red-600 dark:text-red-400">🔴 Negativo</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`narrativa-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Narrativa</label>
                                            <select id={`narrativa-${idx}`} value={registro.narrativa} onChange={(e) => updateRegistro(idx, 'narrativa', e.target.value)} className={`${inputStyles} ${!registro.narrativa ? 'text-gray-400' : ''}`}>
                                                <option value="" disabled>Seleccionar narrativa...</option>
                                                {['Seguridad y regulación', 'Inversión y desarrollo regional', 'Avances de obra e infraestructura', 'Legal y derechos humanos', 'Medio ambiente', 'Difusión informativa', 'Otro'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        {registro.narrativa === 'Otro' && (
                                            <div className="space-y-1.5 md:col-span-2">
                                                <label htmlFor={`narrativaOtro-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Especificar Narrativa</label>
                                                <input id={`narrativaOtro-${idx}`} type="text" required placeholder="Describe la narrativa..." value={registro.narrativaOtro} onChange={(e) => updateRegistro(idx, 'narrativaOtro', e.target.value)} className={inputStyles} />
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <label htmlFor={`nivelRiesgo-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Nivel de Riesgo</label>
                                            <select id={`nivelRiesgo-${idx}`} value={registro.nivelRiesgo} onChange={(e) => updateRegistro(idx, 'nivelRiesgo', e.target.value)} className={`${inputStyles} ${!registro.nivelRiesgo ? 'text-gray-400' : ''}`}>
                                                <option value="" disabled>Seleccionar nivel...</option>
                                                <option value="Bajo">Bajo</option>
                                                <option value="Medio">Medio</option>
                                                <option value="Alto">Alto</option>
                                                <option value="Crítico">Crítico</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`estatus-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Estatus</label>
                                            <select id={`estatus-${idx}`} value={registro.estatus} onChange={(e) => updateRegistro(idx, 'estatus', e.target.value)} className={`${inputStyles} ${!registro.estatus ? 'text-gray-400' : ''}`}>
                                                <option value="" disabled>Seleccionar estatus...</option>
                                                <option value="Monitoreando">Monitoreando</option>
                                                <option value="Escalado">Escalado</option>
                                                <option value="Cerrado">Cerrado</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`visualizaciones-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Visualizaciones</label>
                                            <input id={`visualizaciones-${idx}`} type="text" placeholder="Ej: 1,250" value={registro.visualizaciones} onChange={(e) => updateRegistro(idx, 'visualizaciones', e.target.value)} className={inputStyles} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`reacciones-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Reacciones</label>
                                            <input id={`reacciones-${idx}`} type="text" placeholder="Ej: 340" value={registro.reacciones} onChange={(e) => updateRegistro(idx, 'reacciones', e.target.value)} className={inputStyles} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`comentarios-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Comentarios</label>
                                            <input id={`comentarios-${idx}`} type="text" placeholder="Ej: 85" value={registro.comentarios} onChange={(e) => updateRegistro(idx, 'comentarios', e.target.value)} className={inputStyles} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`compartidos-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Compartidos</label>
                                            <input id={`compartidos-${idx}`} type="text" placeholder="Ej: 42" value={registro.compartidos} onChange={(e) => updateRegistro(idx, 'compartidos', e.target.value)} className={inputStyles} />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label htmlFor={`hallazgoReputacional-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Hallazgo reputacional</label>
                                            <textarea id={`hallazgoReputacional-${idx}`} rows={3} placeholder="Describe los hallazgos clave de la publicación, qué conversación puede activar y si requiere seguimiento..." value={registro.hallazgoReputacional} onChange={(e) => updateRegistro(idx, 'hallazgoReputacional', e.target.value)} className={`${inputStyles} resize-none leading-relaxed`}></textarea>
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label htmlFor={`linkPublicacion-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Link de la publicación original</label>
                                            <input id={`linkPublicacion-${idx}`} type="url" placeholder="https://..." value={registro.linkPublicacion} onChange={(e) => updateRegistro(idx, 'linkPublicacion', e.target.value)} className={inputStyles} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {formData.registrosDigitalesList.map((registro: any, idx: number) => (
                                <div key={registro.id || idx} className="p-6 sm:p-8 theme-bg-container border theme-border rounded-[1.5rem] relative fade-in shadow-sm group border-l-[6px] border-l-blue-500 hover:border-l-blue-600 transition-all">
                                    {formData.registrosDigitalesList.length > 1 && (
                                        <button type="button" onClick={() => removeRegistroDigital(idx)} className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm" title="Eliminar este registro">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    )}
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 flex items-center justify-center text-xs font-black">{idx + 1}</span>
                                        <h4 className="font-bold theme-text-main text-lg">Detalle del Registro - Medio Digital</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label htmlFor={`md-sitioWeb-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Sitio Web</label>
                                            <input id={`md-sitioWeb-${idx}`} type="url" required placeholder="https://ejemplo.com" value={registro.sitioWeb} onChange={(e) => updateRegistroDigital(idx, 'sitioWeb', e.target.value)} className={inputStyles} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`md-tipoActor-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Tipo de Actor</label>
                                            <select id={`md-tipoActor-${idx}`} value={registro.tipoActor} onChange={(e) => updateRegistroDigital(idx, 'tipoActor', e.target.value)} className={`${inputStyles} ${!registro.tipoActor ? 'text-gray-400' : ''}`}>
                                                <option value="" disabled>Seleccionar tipo de actor...</option>
                                                {['Gobierno', 'Creadores de contenido', 'Detractor', 'Portales de noticias', 'Periódicos digitales', 'Medios especializados', 'Sitios institucionales', 'Medios Locales', 'Otro'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        {registro.tipoActor === 'Otro' && (
                                            <div className="space-y-1.5">
                                                <label htmlFor={`md-tipoActorOtro-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Especificar Tipo de Actor</label>
                                                <input id={`md-tipoActorOtro-${idx}`} type="text" required placeholder="Describe el tipo de actor..." value={registro.tipoActorOtro} onChange={(e) => updateRegistroDigital(idx, 'tipoActorOtro', e.target.value)} className={inputStyles} />
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <label htmlFor={`md-sentimiento-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Sentimiento de la Mención</label>
                                            <select id={`md-sentimiento-${idx}`} required value={registro.sentimiento} onChange={(e) => updateRegistroDigital(idx, 'sentimiento', e.target.value)} className={`${inputStyles} ${!registro.sentimiento ? 'text-gray-400' : ''}`}>
                                                <option value="" disabled>Seleccionar sentimiento...</option>
                                                <option value="Positivo" className="text-green-600 dark:text-green-400">🟢 Positivo</option>
                                                <option value="Neutral" className="text-yellow-600 dark:text-yellow-400">🟡 Neutral</option>
                                                <option value="Negativo" className="text-red-600 dark:text-red-400">🔴 Negativo</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`md-narrativa-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Narrativa</label>
                                            <select id={`md-narrativa-${idx}`} value={registro.narrativa} onChange={(e) => updateRegistroDigital(idx, 'narrativa', e.target.value)} className={`${inputStyles} ${!registro.narrativa ? 'text-gray-400' : ''}`}>
                                                <option value="" disabled>Seleccionar narrativa...</option>
                                                {['Seguridad y regulación', 'Inversión y desarrollo regional', 'Avances de obra e infraestructura', 'Legal y derechos humanos', 'Medio ambiente', 'Difusión informativa', 'Otro'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        {registro.narrativa === 'Otro' && (
                                            <div className="space-y-1.5">
                                                <label htmlFor={`md-narrativaOtro-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Especificar Narrativa</label>
                                                <input id={`md-narrativaOtro-${idx}`} type="text" required placeholder="Describe la narrativa..." value={registro.narrativaOtro} onChange={(e) => updateRegistroDigital(idx, 'narrativaOtro', e.target.value)} className={inputStyles} />
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <label htmlFor={`md-nivelRiesgo-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Nivel de Riesgo</label>
                                            <select id={`md-nivelRiesgo-${idx}`} value={registro.nivelRiesgo} onChange={(e) => updateRegistroDigital(idx, 'nivelRiesgo', e.target.value)} className={`${inputStyles} ${!registro.nivelRiesgo ? 'text-gray-400' : ''}`}>
                                                <option value="" disabled>Seleccionar nivel...</option>
                                                <option value="Bajo" className="text-green-600 dark:text-green-400">🟢 Bajo</option>
                                                <option value="Medio" className="text-orange-600 dark:text-orange-400">🟠 Medio</option>
                                                <option value="Alto" className="text-yellow-600 dark:text-yellow-400">🟡 Alto</option>
                                                <option value="Crítico" className="text-red-600 dark:text-red-400">🔴 Crítico</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`md-estatus-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Estatus</label>
                                            <select id={`md-estatus-${idx}`} value={registro.estatus} onChange={(e) => updateRegistroDigital(idx, 'estatus', e.target.value)} className={`${inputStyles} ${!registro.estatus ? 'text-gray-400' : ''}`}>
                                                <option value="" disabled>Seleccionar estatus...</option>
                                                <option value="Monitoreando" className="text-yellow-600 dark:text-yellow-400">🟡 Monitoreando</option>
                                                <option value="Escalado" className="text-red-600 dark:text-red-400">🔴 Escalado</option>
                                                <option value="Cerrado" className="text-green-600 dark:text-green-400">🟢 Cerrado</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label htmlFor={`md-hallazgoReputacional-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Hallazgo reputacional</label>
                                            <textarea id={`md-hallazgoReputacional-${idx}`} rows={3} placeholder="Describe los hallazgos clave de la publicación, qué conversación puede activar y si requiere seguimiento..." value={registro.hallazgoReputacional} onChange={(e) => updateRegistroDigital(idx, 'hallazgoReputacional', e.target.value)} className={`${inputStyles} resize-none leading-relaxed`}></textarea>
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label htmlFor={`md-linkPublicacion-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Link de la publicación original</label>
                                            <input id={`md-linkPublicacion-${idx}`} type="url" placeholder="Link de la publicación original" value={registro.linkPublicacion} onChange={(e) => updateRegistroDigital(idx, 'linkPublicacion', e.target.value)} className={inputStyles} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-8 space-y-8">
                    <div className="space-y-2"><label htmlFor="n-evidencia" className="text-sm font-bold theme-text-main flex items-center gap-2"><LinkIcon className="w-4 h-4 text-emerald-500"/> Repositorio de Evidencias <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider ml-2">Opcional</span></label>
                        <p className="text-xs theme-text-muted mb-2">Ingresa el enlace a la carpeta de Google Drive o presentación con las capturas de pantalla.</p>
                        <input id="n-evidencia" type="url" placeholder="https://drive.google.com/..." value={formData.evidencia} onChange={(e) => setFormData({...formData, evidencia: e.target.value})} className={inputStyles} />
                    </div>
                    
                    <div className="pt-6 flex flex-col sm:flex-row items-center justify-end gap-4 border-t-2 border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={() => navigate('dashboard')} className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold theme-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Cancelar y Volver</button>
                        <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-black bg-blue-600 text-white hover:bg-blue-500 hover:-translate-y-0.5 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:translate-y-0">{isSubmitting ? 'Guardando en la nube...' : <><Save className="w-5 h-5"/> Guardar Reporte Final</>}</button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export const HistorialCommentView = ({ showToast, isAdmin, updateComment, deleteComment, deleteCommentsBatch }: any) => {
    const [comments, setComments] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedComment, setSelectedComment] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editData, setEditData] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('Todos');
    const [filterFuente, setFilterFuente] = useState('Todas');
    const [filterMonth, setFilterMonth] = useState('Todos');
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const camposFiltro = [
        { value: 'usuario', label: 'Actor' },
        { value: 'redSocial', label: 'Canal' },
        { value: 'comentario', label: 'Narrativa' },
        { value: 'sentiment', label: 'Sentimiento' },
        { value: 'estatus', label: 'Estatus' },
        { value: 'nivelRiesgo', label: 'Nivel de riesgo' },
    ];
    const [pagePerMonth, setPagePerMonth] = useState<Record<string, number>>({});
    const itemsPerPage = 30;
    
    // 🔥 ESTADOS PARA SELECCIÓN MÚLTIPLE
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Estados Modal de Exportación
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportType, setExportType] = useState('all');
    const [exportYear, setExportYear] = useState('');
    const [exportMonth, setExportMonth] = useState('');
    const [exportFuente, setExportFuente] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [editingNarrativaIdx, setEditingNarrativaIdx] = useState<number | null>(null);
    const [editingNarrativaValue, setEditingNarrativaValue] = useState('');

    useEffect(() => {
        if (IS_MOCK) { setIsLoading(false); return; }
        setIsLoading(true);
        const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'comments');
        const unsub = onSnapshot(commentsRef, (snapshot) => {
            const data: any[] = [];
            snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setComments(data);
            // Cálculo de analíticas unificadas
            const analytics = calcCommentAnalytics(data);
            setAnalytics(analytics);
            setTimeout(() => setIsLoading(false), 600);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        setPagePerMonth({});
        // Limpiamos selecciones si cambiamos filtros para evitar borrar cosas invisibles
        setSelectedIds([]);
        setIsSelectionMode(false);
    }, [searchTerm, filterYear, filterMonth]);

    useEffect(() => {
        setExportMonth('');
        setExportFuente('');
    }, [exportType, exportYear]);

    const getNormalizedComments = (com: any) => normalizeMenciones(com);

    const availableYears = useMemo(() => {
        const years = new Set(comments.map((c: any) => c.fechaPublicacion ? c.fechaPublicacion.split('-')[0] : null).filter(Boolean));
        return Array.from(years).sort((a: any, b: any) => b.localeCompare(a));
    }, [comments]);

    const availableMonthsForFilter = useMemo(() => {
        const months = new Set(
            comments
                .filter((c: any) => filterYear === 'Todos' || (c.fechaPublicacion && c.fechaPublicacion.split('-')[0] === filterYear))
                .map((c: any) => c.fechaPublicacion && c.fechaPublicacion.split('-')[1])
                .filter(Boolean)
        );
        return Array.from(months).sort((a: any, b: any) => a.localeCompare(b));
    }, [comments, filterYear]);

    const availableMonthsForExport = useMemo(() => {
        const months = new Set(
            comments
                .filter((c: any) => !exportYear || (c.fechaPublicacion && c.fechaPublicacion.split('-')[0] === exportYear))
                .map((c: any) => c.fechaPublicacion && c.fechaPublicacion.split('-')[1])
                .filter(Boolean)
        );
        return Array.from(months).sort((a: any, b: any) => a.localeCompare(b));
    }, [comments, exportYear]);

    const filteredComments = useMemo(() => {
        return comments.filter((com: any) => {
            const year = com.fechaPublicacion ? com.fechaPublicacion.split('-')[0] : '';
            const month = com.fechaPublicacion ? com.fechaPublicacion.split('-')[1] : '';
            const matchYear = filterYear === 'Todos' || year === filterYear;
            const matchMonth = filterMonth === 'Todos' || month === filterMonth;
            const term = searchTerm.toLowerCase();
            const list = getNormalizedComments(com);
            
            // Filtro por fuente de monitoreo
            const matchFuente = filterFuente === 'Todas' || list.some((c: any) => c.fuenteMonitoreo === filterFuente);
            
            const matchSearch = term === '' || list.some((c: any) => {
                return camposFiltro.some((cf: any) => {
                    const valor = c[cf.value];
                    return valor && String(valor).toLowerCase().includes(term);
                });
            });
            return matchYear && matchMonth && matchSearch && matchFuente;
        });
    }, [comments, searchTerm, filterYear, filterMonth, filterFuente]);

    const groupedData = useMemo(() => {
        const groups: Record<string, Record<string, any[]>> = {};
        filteredComments.forEach((com: any) => {
            const year = com.fechaPublicacion ? com.fechaPublicacion.split('-')[0] : 'Sin Fecha';
            const month = com.fechaPublicacion ? com.fechaPublicacion.split('-')[1] : '00';
            if (!groups[year]) groups[year] = {};
            if (!groups[year][month]) groups[year][month] = [];
            groups[year][month].push(com);
        });
        return groups;
    }, [filteredComments]);

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
    
    const openDetail = (com: any) => { 
        if (isSelectionMode) {
            toggleSelection(com.id);
        } else {
            setSelectedComment(com); 
            setIsDetailOpen(true); 
        }
    };
    
    const openEdit = () => {
        // Deriva los registros editables según la fuente real del doc (no legacy).
        // NO se meten campos extra: la regla isValidCommentReport usa hasOnly,
        // así que el payload debe contener EXACTAMENTE los campos permitidos.
        const isRedes = selectedComment.fuenteMonitoreo !== 'Medios digitales';
        if (isRedes) {
            setEditData({ ...selectedComment, registrosList: (selectedComment.registrosList || []) });
        } else {
            setEditData({ ...selectedComment, registrosDigitalesList: (selectedComment.registrosDigitalesList || []) });
        }
        setIsDetailOpen(false);
        setIsEditOpen(true);
    };
    const updateEditRegistro = (index: number, field: string, value: string) => {
        const list = [...(editData.registrosList || [])];
        list[index] = { ...list[index], [field]: value };
        setEditData({ ...editData, registrosList: list });
    };
    const updateEditRegistroDigital = (index: number, field: string, value: string) => {
        const list = [...(editData.registrosDigitalesList || [])];
        list[index] = { ...list[index], [field]: value };
        setEditData({ ...editData, registrosDigitalesList: list });
    };
    const removeEditRegistro = (index: number) => {
        const list = (editData.registrosList || []).filter((_: any, i: number) => i !== index);
        setEditData({ ...editData, registrosList: list });
    };
    const removeEditRegistroDigital = (index: number) => {
        const list = (editData.registrosDigitalesList || []).filter((_: any, i: number) => i !== index);
        setEditData({ ...editData, registrosDigitalesList: list });
    };
    const handleDelete = () => { setIsDetailOpen(false); deleteComment(selectedComment.id); };

    const startEditNarrativa = (idx: number, currentValue: string) => {
        setEditingNarrativaIdx(idx);
        setEditingNarrativaValue(currentValue);
    };

    const saveEditNarrativa = () => {
        if (editingNarrativaIdx === null || !selectedComment) return;
        const isRedes = selectedComment.fuenteMonitoreo !== 'Medios digitales';
        const listKey = isRedes ? 'registrosList' : 'registrosDigitalesList';
        const updatedList = [...(selectedComment[listKey] || [])];
        if (updatedList[editingNarrativaIdx]) {
            updatedList[editingNarrativaIdx] = { ...updatedList[editingNarrativaIdx], narrativa: editingNarrativaValue };
            const payload: any = {
                fechaPublicacion: selectedComment.fechaPublicacion || '',
                horaDeteccion: selectedComment.horaDeteccion || '',
                fuenteMonitoreo: selectedComment.fuenteMonitoreo || 'Redes sociales',
                evidencia: selectedComment.evidencia || '',
                autor: selectedComment.autor || 'Administrador',
                timestamp: selectedComment.timestamp || new Date().toISOString()
            };
            payload[listKey] = updatedList;
            updateComment(selectedComment.id, payload);
            setSelectedComment({ ...selectedComment, [listKey]: updatedList });
            showToast('Narrativa actualizada');
        }
        setEditingNarrativaIdx(null);
    };

    const handleEditUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        // La regla isValidCommentReport usa hasOnly: el payload debe contener
        // EXACTAMENTE los campos permitidos. Extraemos solo esos y NO propagamos
        // campos ninja (id, fuentemonitoreoEditada, etc.) del doc original.
        const src = editData || {};
        const editarRS = src.fuenteMonitoreo !== 'Medios digitales';
        const lista = editarRS
            ? (src.registrosList || []).filter((r: any) => !isRegistroVacio(r, 'rs'))
            : (src.registrosDigitalesList || []).filter((r: any) => !isRegistroVacio(r, 'md'));

        const payload: any = {
            fechaPublicacion: src.fechaPublicacion || '',
            horaDeteccion: src.horaDeteccion || '',
            fuenteMonitoreo: src.fuenteMonitoreo || 'Redes sociales',
            evidencia: src.evidencia || '',
            autor: src.autor || 'Administrador',
            timestamp: src.timestamp || new Date().toISOString()
        };
        if (editarRS) {
            payload.registrosList = lista;
        } else {
            payload.registrosDigitalesList = lista;
        }
        updateComment(editData.id, payload);
        setIsEditOpen(false);
    };

    // 🔥 LOGICA DE SELECCIÓN MÚLTIPLE (Estilo UX de Tickets)
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleMonthSelection = (monthItems: any[], isSelected: boolean) => {
        if (isSelected) {
            // Deseleccionar los del mes
            const monthIds = monthItems.map(item => item.id);
            setSelectedIds(prev => prev.filter(id => !monthIds.includes(id)));
        } else {
            // Seleccionar los del mes que no estén seleccionados
            const newIds = monthItems.map(item => item.id).filter(id => !selectedIds.includes(id));
            setSelectedIds(prev => [...prev, ...newIds]);
        }
    };

    const executeBatchDelete = () => {
        if (deleteCommentsBatch) {
            deleteCommentsBatch(selectedIds, () => {
                setSelectedIds([]);
                setIsSelectionMode(false);
            });
        }
    };

    const handleExecuteExport = () => {
        let dataToExport = comments;
        let filenameSuffix = 'Todo';

        if (exportType === 'month') {
            if (!exportYear && !exportMonth) return showToast('Selecciona al menos un año o un mes para exportar', true);
            if (exportYear) {
                dataToExport = dataToExport.filter((i: any) => i.fechaPublicacion && i.fechaPublicacion.split('-')[0] === exportYear);
                filenameSuffix = exportYear;
            }
            if (exportMonth) {
                dataToExport = dataToExport.filter((i: any) => i.fechaPublicacion && i.fechaPublicacion.split('-')[1] === exportMonth);
                filenameSuffix = filenameSuffix === 'Todo' ? exportMonth : `${filenameSuffix}_${exportMonth}`;
            }

        } else if (exportType === 'custom') {
            if (!exportYear && !exportMonth && !exportFuente) return showToast('Configura al menos un criterio para la combinación personalizada', true);
            if (exportYear) {
                dataToExport = dataToExport.filter((i: any) => i.fechaPublicacion && i.fechaPublicacion.split('-')[0] === exportYear);
                filenameSuffix = exportYear;
            }
            if (exportMonth) {
                dataToExport = dataToExport.filter((i: any) => i.fechaPublicacion && i.fechaPublicacion.split('-')[1] === exportMonth);
                filenameSuffix = filenameSuffix === 'Todo' ? exportMonth : `${filenameSuffix}_${exportMonth}`;
            }
            if (exportFuente) {
                dataToExport = dataToExport.filter((i: any) => getNormalizedComments(i).some((c: any) => c.fuenteMonitoreo === exportFuente));
                filenameSuffix = `${filenameSuffix === 'Todo' ? 'F' : filenameSuffix}_${exportFuente.replace(/\s+/g, '-')}`;
            }
        }

        // Desglose por registro: el filtro de fuente se aplica a NIVEL REGISTRO
        // (solo se exportan los registros de la fuente seleccionada, no el reporte completo)
        const fuenteFilter = exportType === 'custom' ? exportFuente : '';
        const registros = dataToExport.flatMap((i: any) => {
            let list = getNormalizedComments(i);
            if (fuenteFilter) list = list.filter((c: any) => c.fuenteMonitoreo === fuenteFilter);
            return list.map((c: any) => ({ i, c }));
        });
        if (registros.length === 0) return showToast('No hay datos registrados con esos filtros', true);

        setIsExporting(true);

        setTimeout(() => {
            const headers = isAdmin
                ? ['Fecha Publicación,Hora Detección,Fuente Monitoreo,Evidencias,Canal,Usuario o Sitio Web,URL Fuente,Tipo de Actor,Sentimiento,Nivel de Riesgo,Estatus,Narrativa,Link Publicación,Hallazgo Reputacional,Visualizaciones,Reacciones,Comentarios,Compartidos,Autor']
                : ['Fecha Publicación,Hora Detección,Fuente Monitoreo,Evidencias,Canal,Usuario o Sitio Web,URL Fuente,Tipo de Actor,Sentimiento,Nivel de Riesgo,Estatus,Narrativa,Link Publicación,Hallazgo Reputacional,Visualizaciones,Reacciones,Comentarios,Compartidos'];

            const rows = registros.map(({ i, c }: any) => {
                const escape = (text: any) => `"${(text ?? '').toString().replace(/"/g, '""')}"`;
                const baseData = [
                    escape(i.fechaPublicacion), escape(i.horaDeteccion), escape(i.fuenteMonitoreo), escape(i.evidencia),
                    escape(c.canal || 'N/D'), escape(extractFuenteLabel(c.usuario) || ''), escape(extractFuenteUrl(c.usuario) || ''), escape(c.tipoActor || ''), escape(c.sentiment || 'N/A'),
                    escape(c.nivelRiesgo || ''), escape(c.estatus || ''), escape(c.comentario), escape(c.linkPublicacion), escape(c.hallazgo || ''),
                    escape(c.metricas?.visualizaciones || ''), escape(c.metricas?.reacciones || ''),
                    escape(c.metricas?.comentarios || ''), escape(c.metricas?.compartidos || '')
                ].join(',');
                return isAdmin ? `${baseData},${escape(i.autor || 'Admin')}` : baseData;
            });

            const link = document.createElement("a"); 
            link.href = encodeURI("data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n")); 
            link.download = `Comentarios_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.csv`; 
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            
            setIsExporting(false);
            setIsExportModalOpen(false); 
            showToast('Exportación desglosada completada exitosamente');
        }, 1500);
    };

    return (
        <>
            <div className="space-y-6 fade-in pb-24 relative">
                <div className={(isDetailOpen || isEditOpen) ? 'print:hidden' : ''}>
                    
                    {/* ENCABEZADO CON BOTONES */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div>
                            <h2 className="text-2xl font-bold theme-text-main">Historial de Menciones</h2>
                            <p className="theme-text-muted text-sm mt-1">Registro organizado de menciones.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            
                            {/* 🔥 NUEVO BOTON SELECCIÓN MÚLTIPLE (Como en Tickets) */}
                            {isAdmin && comments.length > 0 && (
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

                            <button type="button" onClick={() => setIsExportModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all text-sm font-bold shadow-sm">
                                <Download className="w-4 h-4"/> Exportar CSV
                            </button>
                        </div>
                    </div>

                    <div className="p-4 theme-bg-container border theme-border rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-2/3 flex items-center">
                            <Search className="absolute left-3 text-gray-400 w-4 h-4 pointer-events-none" />
                            <input type="text" aria-label="Buscar" placeholder="Busca por Actor, canal, narrativa, sentimiento, estatus o nivel de riesgo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputStyles} pl-10 pr-10`} />
                            {searchTerm && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearchTerm('')} className="absolute right-3 p-1 rounded-md text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors" title="Limpiar búsqueda"><X className="w-4 h-4" /></button>}
                        </div>
                        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-4">
                            <div className="flex items-center gap-2"><label htmlFor="hc-filter-year" className="text-xs font-bold theme-text-muted whitespace-nowrap">Año</label><select id="hc-filter-year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={`${inputStyles} py-2 px-3 min-w-[100px]`}><option value="Todos">Todos</option>{availableYears.map((y: any) => <option key={y} value={y}>{y}</option>)}</select></div>
                            <div className="flex items-center gap-2"><label htmlFor="hc-filter-month" className="text-xs font-bold theme-text-muted whitespace-nowrap">Mes</label><select id="hc-filter-month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className={`${inputStyles} py-2 px-3 min-w-[120px]`}><option value="Todos">Todos</option>{availableMonthsForFilter.map((m: any) => <option key={m} value={m}>{getMonthName(m)}</option>)}</select></div>
                            <div className="flex items-center gap-2"><label htmlFor="hc-filter-fuente" className="text-xs font-bold theme-text-muted whitespace-nowrap">Fuente</label><select id="hc-filter-fuente" value={filterFuente} onChange={(e) => setFilterFuente(e.target.value)} className={`${inputStyles} py-2 px-3 min-w-[160px]`}><option value="Todas">Todas</option><option value="Redes sociales">Redes sociales</option><option value="Medios digitales">Medios digitales</option></select></div>
                            <div className="bg-black/5 dark:bg-white/5 border theme-border px-3 py-2 rounded-lg whitespace-nowrap"><span className="text-xs font-bold theme-text-main">{filteredComments.length}</span><span className="text-[10px] theme-text-muted font-medium ml-1">de {comments.length}</span></div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-in">
                            {[1, 2, 3, 4, 5, 6].map(card => (
                                <div key={card} className="p-5 theme-bg-container rounded-xl border theme-border shadow-sm h-44 animate-pulse flex flex-col">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-300 dark:bg-gray-700 flex-shrink-0"></div>
                                        <div className="flex-1 space-y-2 py-1">
                                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mt-2">
                                        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                                        <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                                    </div>
                                    <div className="mt-auto pt-3 border-t theme-border flex gap-2">
                                        <div className="h-6 w-16 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
                                        <div className="h-6 w-20 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredComments.length === 0 ? (
                        <div className="text-center py-12 theme-bg-container rounded-2xl border theme-border"><MessageSquare className="w-12 h-12 theme-text-muted mx-auto mb-4 opacity-30" /><p className="theme-text-muted">No se encontraron reportes con los criterios actuales.</p></div>
                    ) : (
                        <div className="space-y-4">
                            {Object.keys(groupedData).sort((a, b) => b.localeCompare(a)).map(year => {
                                const isYearExpanded = !!expandedSections[year];
                                const totalInYear = Object.values(groupedData[year]).flat().length;

                                return (
                                    <div key={year} className="theme-bg-container border theme-border rounded-xl overflow-hidden shadow-sm">
                                        <button type="button" onClick={() => toggleSection(year)} className="w-full flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3">{isYearExpanded ? <ChevronDown className="w-5 h-5 theme-text-muted" /> : <ChevronRight className="w-5 h-5 theme-text-muted" />}<h3 className="text-lg font-bold theme-text-main">{year}</h3><span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs font-bold">{totalInYear}</span></div>
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
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

                                                    // Determinar si todos los items visibles del mes están seleccionados
                                                    const isAllMonthSelected = monthItems.length > 0 && monthItems.every((i:any) => selectedIds.includes(i.id));

                                                    return (
                                                        <div key={monthKey} className="border theme-border rounded-lg overflow-hidden bg-[var(--surface)]">
                                                            
                                                            {/* 🔥 BOTON DE MES CON CHECKBOX */}
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
                                                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                        {paginatedMonthItems.map((com: any) => {
                                                                            const list = getNormalizedComments(com);
                                                                            const firstComment = list[0];
                                                                            const hasMore = list.length > 1;
                                                                            const uniqueNetworks = Array.from(new Set(list.map((c: any) => com.fuenteMonitoreo === 'Medios digitales' ? (c.tipoActor || 'Medio digital') : c.canal).filter(Boolean)));
                                                                            const hasNegative = list.some((c: any) => c.sentiment === 'Negativo');
                                                                            const cardSentimentStatus = hasNegative ? 'Negativo' : (list.some((c: any) => c.sentiment === 'Neutral') ? 'Neutral' : '');

                                                                            const isSelected = selectedIds.includes(com.id);

                                                                            return (
                                                                                // 🔥 UX TARJETA: Idéntica a Tickets (Estilo rojo si está seleccionada)
                                                                                <button 
                                                                                    type="button" 
                                                                                    key={com.id} 
                                                                                    onClick={() => openDetail(com)} 
                                                                                    className={`text-left w-full p-4 rounded-xl border shadow-sm transition-all cursor-pointer group flex flex-col h-full border-l-4 relative ${
                                                                                        isSelectionMode 
                                                                                        ? isSelected 
                                                                                            ? 'bg-red-500/10 border-red-500 border-l-red-500 scale-[0.98]' 
                                                                                            : 'theme-bg-container theme-border border-l-gray-300 dark:border-l-gray-700 hover:border-red-500/50'
                                                                                        : `theme-bg-container ${hasNegative ? 'border-red-500/50 hover:border-red-500 border-l-red-500' : 'theme-border hover:border-blue-500 border-l-blue-500'}`
                                                                                    }`}
                                                                                >
                                                                                    {isSelectionMode && (
                                                                                        <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-red-500 border-red-500' : 'border-gray-400 dark:border-gray-600'}`}>
                                                                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                                                                        </div>
                                                                                    )}

                                                                                    <div className={`flex items-start gap-3 mb-3 w-full ${isSelectionMode ? 'pr-8' : ''}`}>
                                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                                                                            isSelectionMode && isSelected 
                                                                                            ? 'bg-red-500' 
                                                                                            : `theme-bg-low ${hasNegative ? 'group-hover:bg-red-500' : 'group-hover:bg-blue-500'}`
                                                                                        }`}>
                                                                                            <MessageSquare className={`w-4 h-4 transition-colors ${isSelectionMode && isSelected ? 'text-white' : 'theme-text-muted group-hover:text-white'}`} />
                                                                                        </div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                             <h3 className={`font-bold truncate text-sm transition-colors ${isSelectionMode && isSelected ? 'text-red-500' : 'theme-text-main'}`}>Publicación: {com.fechaPublicacion}</h3>
                                                                                             <p className="text-[10px] font-semibold theme-text-muted mt-0.5 truncate flex items-center gap-1">Detección: {com.horaDeteccion}{isAdmin && <><span className="mx-1">|</span> Por: <span className="text-blue-500 truncate">{com.autor || 'Administrador'}</span></>}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-sm theme-text-main line-clamp-2 min-h-[40px] opacity-90 mb-1 w-full"><span className="font-bold mr-1">{extractFuenteLabel(firstComment.usuario)}:</span>{firstComment.comentario}</div>
                                                                                    {hasMore && <p className="text-[10px] font-bold text-blue-500 mb-2">+ {list.length - 1} comentario(s) más</p>}
                                                                                    <div className="mt-auto pt-3 border-t theme-border flex flex-wrap gap-2 items-center w-full"><span className={`px-2 py-1 text-[10px] font-bold rounded-md ${com.fuenteMonitoreo === 'Medios digitales' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{com.fuenteMonitoreo || 'Fuente de monitoreo'}</span><SentimentBadge sentiment={cardSentimentStatus} />{uniqueNetworks.map((net: any) => <span key={net} className={`px-2 py-1 text-[10px] font-bold rounded-md border ${isSelectionMode && isSelected ? 'bg-red-500/20 border-red-500/30 text-red-600 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>{net}</span>)}</div>
                                                                                </button>
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

            {/* 🔥 BARRA FLOTANTE DE EJECUCIÓN (PORTAL) */}
            {isSelectionMode && isAdmin && ReactDOM.createPortal(
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

            {/* MODAL DE EXPORTACIÓN INTELIGENTE CON FILTRO CAMPUS */}
            {isExportModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 fade-in">
                    <div className="theme-bg-container rounded-2xl w-full max-w-md shadow-2xl border theme-border flex flex-col overflow-hidden">
                        <div className="p-5 border-b theme-border flex justify-between items-center bg-blue-500/5">
                            <h3 className="font-bold theme-text-main flex items-center gap-2"><Download className="w-5 h-5 text-blue-500" /> Exportación Inteligente CSV</h3>
                            <button type="button" onClick={() => setIsExportModalOpen(false)} className="p-2 theme-text-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <p className="text-sm theme-text-muted">Selecciona el alcance de los datos que deseas descargar en formato CSV para tu reporte.</p>
                            <div className="space-y-3">
                                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${exportType === 'all' ? 'border-blue-500 bg-blue-500/5' : 'theme-border theme-bg-low hover:border-gray-400'}`}>
                                    <input type="radio" name="exportType" checked={exportType === 'all'} onChange={() => setExportType('all')} className="w-4 h-4 text-blue-500" />
                                    <div><p className="text-sm font-bold theme-text-main">Todo el Historial</p><p className="text-xs theme-text-muted">Descarga todos los incidentes registrados.</p></div>
                                </label>
                                
                                <label className={`flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${exportType === 'month' ? 'border-blue-500 bg-blue-500/5' : 'theme-border theme-bg-low hover:border-gray-400'}`}>
                                    <div className="flex items-center gap-3">
                                        <input type="radio" name="exportType" checked={exportType === 'month'} onChange={() => setExportType('month')} className="w-4 h-4 text-blue-500" />
                                        <div><p className="text-sm font-bold theme-text-main">Filtrar por Año y/o Mes</p></div>
                                    </div>
                                    {exportType === 'month' && (
                                        <div className="ml-7 flex flex-col gap-3 fade-in mt-2">
                                            <div className="flex gap-3">
                                                <select aria-label="Seleccionar año" value={exportYear} onChange={(e) => setExportYear(e.target.value)} className={`${inputStyles} w-1/2`}>
                                                    <option value="">Todos los años</option>
                                                    {availableYears.map((y: any) => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                                <select aria-label="Seleccionar mes" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className={`${inputStyles} w-1/2`}>
                                                    <option value="">Todos los meses</option>
                                                    {availableMonthsForExport.map((m: any) => <option key={m} value={m}>{getMonthName(m)}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </label>

                                <label className={`flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${exportType === 'custom' ? 'border-blue-500 bg-blue-500/5' : 'theme-border theme-bg-low hover:border-gray-400'}`}>
                                    <div className="flex items-center gap-3">
                                        <input type="radio" name="exportType" checked={exportType === 'custom'} onChange={() => setExportType('custom')} className="w-4 h-4 text-blue-500" />
                                        <div><p className="text-sm font-bold theme-text-main">Combinación Personalizada</p><p className="text-xs theme-text-muted">Combina año, mes y fuente de monitoreo.</p></div>
                                    </div>
                                    {exportType === 'custom' && (
                                        <div className="ml-7 flex flex-col gap-3 fade-in mt-2">
                                            <div className="flex gap-3">
                                                <select aria-label="Seleccionar año" value={exportYear} onChange={(e) => setExportYear(e.target.value)} className={`${inputStyles} w-1/2`}>
                                                    <option value="">Todos los años</option>
                                                    {availableYears.map((y: any) => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                                <select aria-label="Seleccionar mes" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className={`${inputStyles} w-1/2`}>
                                                    <option value="">Todos los meses</option>
                                                    {availableMonthsForExport.map((m: any) => <option key={m} value={m}>{getMonthName(m)}</option>)}
                                                </select>
                                            </div>
                                            <select aria-label="Filtrar por fuente" value={exportFuente} onChange={(e) => setExportFuente(e.target.value)} className={inputStyles}>
                                                <option value="">Toda fuente</option>
                                                <option value="Redes sociales">Redes sociales</option>
                                                <option value="Medios digitales">Medios digitales</option>
                                            </select>
                                            <button type="button" onClick={() => { setExportYear(''); setExportMonth(''); setExportFuente(''); }} className="self-start text-xs font-bold text-blue-500 hover:text-blue-400 hover:underline transition-colors">Limpiar combinación</button>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>
                        <div className="p-4 border-t theme-border flex justify-end gap-3 bg-black/5 dark:bg-white/5">
                            <button type="button" onClick={() => setIsExportModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold theme-text-main hover:bg-black/10 dark:hover:bg-white/10 transition-colors">Cancelar</button>
                            <button type="button" onClick={handleExecuteExport} disabled={isExporting} className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>} 
                                {isExporting ? 'Generando...' : 'Generar CSV'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isDetailOpen && selectedComment && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 fade-in print:static print:block print:p-0 print:bg-transparent">
                    <div className="theme-bg-container rounded-2xl w-full max-w-2xl shadow-2xl border theme-border overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:w-full print:max-w-full menciones-print-area">
                        <div className="p-5 border-b theme-border flex justify-between items-center bg-blue-500/5 no-print print:hidden">
                            <div className="flex items-center gap-3"><div className="p-2 bg-blue-500/20 rounded-lg"><MessageSquare className="w-5 h-5 text-blue-500" /></div><div><h3 className="font-bold theme-text-main text-lg">Reporte de Comentarios</h3><p className="text-xs theme-text-muted font-medium">Publicación: {selectedComment.fechaPublicacion} | Detección: {selectedComment.horaDeteccion}</p></div></div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => window.print()} className="p-2 theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"><Printer className="w-5 h-5"/></button>
                                {isAdmin && (
                                    <><button type="button" onClick={openEdit} className="p-2 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"><Edit3 className="w-5 h-5"/></button><button type="button" onClick={handleDelete} className="p-2 text-[var(--error)] hover:bg-[var(--error)]/10 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button></>
                                )}
                                <button type="button" onClick={() => setIsDetailOpen(false)} className="p-2 theme-text-muted hover:theme-text-main bg-black/5 dark:bg-white/5 rounded-lg"><X className="w-5 h-5"/></button>
                            </div>
                        </div>

                        {/* ── LAYOUT DE IMPRESIÓN: la misma información de la tarjeta, en formato documento ── */}
                        <div className="hidden print:block text-black text-[10.5pt] leading-normal">
                            <h1 className="text-[16pt] font-bold text-blue-700 border-b-2 border-blue-600 pb-1.5 mb-3">ENGIE MANAGEMENT - REPORTE DE MENCIONES</h1>
                            <table className="w-full border-collapse mb-4">
                                <tbody>
                                    <PrintRow label="Fecha de Publicación">{selectedComment.fechaPublicacion || '—'}</PrintRow>
                                    <PrintRow label="Hora de Detección">{selectedComment.horaDeteccion || '—'}</PrintRow>
                                    <PrintRow label="Fuente de Monitoreo">{selectedComment.fuenteMonitoreo || '—'}</PrintRow>
                                    <PrintRow label="Reportado por">{selectedComment.autor || 'Administrador'}</PrintRow>
                                    <PrintRow label="Evidencias">{selectedComment.evidencia ? (<a href={selectedComment.evidencia} target="_blank" rel="noreferrer" className="text-blue-700 underline break-all">{selectedComment.evidencia}</a>) : 'Sin evidencias adjuntas'}</PrintRow>
                                </tbody>
                            </table>
                            <p className="text-[12pt] font-bold text-blue-700 border-b border-blue-600 pb-0.5 mb-2">Menciones Registradas ({getNormalizedComments(selectedComment).length})</p>
                            {getNormalizedComments(selectedComment).map((c: any, idx: number) => (
                                <div key={c.id || idx} className="border border-gray-400 mb-3 break-inside-avoid">
                                    <p className="bg-gray-100 border-b border-gray-400 px-2 py-1 font-bold text-[11pt]">Mención #{idx + 1} · {c.fuenteMonitoreo === 'Medios digitales' ? 'Medio digital' : (c.canal || 'N/D')}</p>
                                    <table className="w-full border-collapse">
                                        <tbody>
                                            <PrintRow label="Usuario o Sitio Web">
                                                <b>{c.fuenteLabel || c.usuario || '—'}</b>
                                                {c.fuenteUrl && (<><br /><a href={c.fuenteUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline break-all">{c.fuenteUrl}</a></>)}
                                            </PrintRow>
                                            <PrintRow label="Tipo de Actor">{c.tipoActor || '—'}</PrintRow>
                                            <PrintRow label="Evaluación">
                                                {c.sentiment && (<span className="mr-4 whitespace-nowrap"><PrintDot color={getSentimentDot(c.sentiment).dot} />Sentimiento: <b>{c.sentiment}</b></span>)}
                                                {c.nivelRiesgo && (<span className="mr-4 whitespace-nowrap"><PrintDot color={getRiesgoDot(c.nivelRiesgo).dot} />Riesgo: <b>{c.nivelRiesgo}</b></span>)}
                                                {c.estatus && (<span className="whitespace-nowrap"><PrintDot color={getEstatusDot(c.estatus).dot} />Estatus: <b>{c.estatus}</b></span>)}
                                                {!c.sentiment && !c.nivelRiesgo && !c.estatus && '—'}
                                            </PrintRow>
                                            <PrintRow label="Narrativa"><span className="whitespace-pre-wrap">{c.comentario || 'Sin narrativa'}</span></PrintRow>
                                            {c.hallazgo && (<PrintRow label="Hallazgo Reputacional"><span className="whitespace-pre-wrap">{c.hallazgo}</span></PrintRow>)}
                                            {(c.fuenteMonitoreo !== 'Medios digitales') && (c.metricas?.visualizaciones || c.metricas?.reacciones || c.metricas?.comentarios || c.metricas?.compartidos) && (
                                                <PrintRow label="Métricas">
                                                    <span className="mr-3 whitespace-nowrap">Visualizaciones: <b>{c.metricas?.visualizaciones || '0'}</b></span>
                                                    <span className="mr-3 whitespace-nowrap">Reacciones: <b>{c.metricas?.reacciones || '0'}</b></span>
                                                    <span className="mr-3 whitespace-nowrap">Comentarios: <b>{c.metricas?.comentarios || '0'}</b></span>
                                                    <span className="whitespace-nowrap">Compartidos: <b>{c.metricas?.compartidos || '0'}</b></span>
                                                </PrintRow>
                                            )}
                                            {c.linkPublicacion && (<PrintRow label="Publicación Original"><a href={c.linkPublicacion} target="_blank" rel="noreferrer" className="text-blue-700 underline break-all">{c.linkPublicacion}</a></PrintRow>)}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                            {getNormalizedComments(selectedComment).length === 0 && (<p className="italic text-gray-600">Sin menciones registradas.</p>)}
                            <p className="mt-4 pt-2 border-t border-gray-400 text-[9.5pt] text-gray-600 italic">Reportado por: {selectedComment.autor || 'Administrador'} · Generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 print:hidden">
                            <div className="mb-6 flex items-center gap-2 no-print">{selectedComment.fuenteMonitoreo === 'Medios digitales' ? <span className="px-3 py-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30 rounded-lg text-xs font-bold uppercase tracking-wider">Medios Digitales</span> : <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-bold uppercase tracking-wider">{selectedComment.fuenteMonitoreo || 'Fuente de monitoreo'}</span>}{selectedComment.evidencia && (<a href={selectedComment.evidencia} target="_blank" rel="noreferrer" className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:brightness-110 no-print"><LinkIcon className="w-3 h-3"/> Evidencias</a>)}</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 no-print">
                                {[
                                    { label: 'Fecha de Publicación', value: selectedComment.fechaPublicacion },
                                    { label: 'Hora de Detección', value: selectedComment.horaDeteccion },
                                    { label: 'Fuente de Monitoreo', value: selectedComment.fuenteMonitoreo }
                                ].map(f => (
                                    <div key={f.label} className="p-3 theme-bg-low rounded-xl border theme-border">
                                        <p className="text-[10px] font-bold theme-text-muted uppercase tracking-wider mb-1">{f.label}</p>
                                        <p className="text-sm theme-text-main font-semibold break-words">{f.value || '—'}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4 no-print">
                                <p className="text-sm font-bold theme-text-muted uppercase tracking-wider flex items-center gap-2 border-b theme-border pb-2">Menciones Registradas <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">{getNormalizedComments(selectedComment).length}</span></p>
                                {getNormalizedComments(selectedComment).map((c: any, idx: number) => (
                                    <div key={c.id || idx} className={`p-4 theme-bg-low rounded-xl border space-y-3 ${c.sentiment === 'Negativo' ? 'border-red-500/30 bg-red-500/5' : 'theme-border'}`}>
                                        <div className="flex flex-wrap items-center gap-2 border-b theme-border pb-2 border-dashed">
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider"><Share2 className="w-3 h-3"/> {c.fuenteMonitoreo === 'Medios digitales' ? 'Medio digital' : (c.canal || 'N/D')}</span>
                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                            {extractFuenteUrl(c.usuario) ? (<a href={extractFuenteUrl(c.usuario) as string} target="_blank" rel="noreferrer" title={c.usuario} className="font-bold text-sm text-blue-500 hover:underline inline-flex items-center gap-1"><LinkIcon className="w-3 h-3 flex-shrink-0" /> {extractFuenteLabel(c.usuario)}</a>) : (<span className="font-bold text-sm text-blue-500 break-all">{extractFuenteLabel(c.usuario)}</span>)}
                                            {c.tipoActor && (<><span className="text-gray-300 dark:text-gray-600">|</span><span className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Actor: <span className="theme-text-main normal-case">{c.tipoActor}</span></span></>)}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {c.sentiment && (<span title="Sentimiento de la Mención" className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider ${getSentimentDot(c.sentiment).badge}`}><span className={`inline-block w-2 h-2 rounded-full mr-1 ${getSentimentDot(c.sentiment).dot}`}></span>Sentimiento: {c.sentiment}</span>)}
                                            {c.nivelRiesgo && (c.fuenteMonitoreo === 'Medios digitales'
                                                ? <span title="Nivel de Riesgo" className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider ${getRiesgoDot(c.nivelRiesgo).badge}`}><span className={`inline-block w-2 h-2 rounded-full mr-1 ${getRiesgoDot(c.nivelRiesgo).dot}`}></span>Riesgo: {c.nivelRiesgo}</span>
                                                : <span title="Nivel de Riesgo" className="px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">Riesgo: {c.nivelRiesgo}</span>)}
                                            {c.estatus && (c.fuenteMonitoreo === 'Medios digitales'
                                                ? <span title="Estatus de la Mención" className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider border ${getEstatusDot(c.estatus).badge}`}><span className={`inline-block w-2 h-2 rounded-full mr-1 ${getEstatusDot(c.estatus).dot}`}></span>Estatus: {c.estatus}</span>
                                                : <span title="Estatus de la Mención" className="px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider border bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">Estatus: {c.estatus}</span>)}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Narrativa</p>
                                            {editingNarrativaIdx === idx ? (
                                                <div className="flex flex-col gap-2">
                                                    <select value={editingNarrativaValue} onChange={(e) => setEditingNarrativaValue(e.target.value)} className={inputStyles}>
                                                        {['Seguridad y regulación', 'Inversión y desarrollo regional', 'Avances de obra e infraestructura', 'Legal y derechos humanos', 'Medio ambiente', 'Difusión informativa', 'Otro'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                    <div className="flex gap-2">
                                                        <button type="button" onClick={saveEditNarrativa} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-colors flex items-center gap-1"><Check className="w-3 h-3"/> Guardar</button>
                                                        <button type="button" onClick={() => setEditingNarrativaIdx(null)} className="px-3 py-1.5 theme-bg-low theme-text-muted rounded-lg text-xs font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-colors">Cancelar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm theme-text-main whitespace-pre-wrap cursor-pointer hover:bg-blue-500/5 dark:hover:bg-blue-500/10 p-1.5 rounded-lg transition-colors" onClick={() => startEditNarrativa(idx, c.comentario === 'Sin narrativa' ? '' : c.comentario)} title="Click para editar narrativa">{c.comentario || 'Sin narrativa'}</p>
                                            )}
                                        </div>
                                        {c.hallazgo && (
                                            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                                                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">Hallazgo Reputacional</p>
                                                <p className="text-xs theme-text-main whitespace-pre-wrap">{c.hallazgo}</p>
                                            </div>
                                        )}
                                        {(c.fuenteMonitoreo !== 'Medios digitales') && (c.metricas?.visualizaciones || c.metricas?.reacciones || c.metricas?.comentarios || c.metricas?.compartidos) && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                {[['Visualizaciones', c.metricas?.visualizaciones], ['Reacciones', c.metricas?.reacciones], ['Comentarios', c.metricas?.comentarios], ['Compartidos', c.metricas?.compartidos]].map(([l, v]) => v ? (
                                                    <div key={l} className="p-2 theme-bg-container border theme-border rounded-lg text-center">
                                                        <p className="text-[9px] font-bold theme-text-muted uppercase tracking-wider">{l}</p>
                                                        <p className="text-sm font-bold theme-text-main">{v}</p>
                                                    </div>
                                                ) : null)}
                                            </div>
                                        )}
                                        {c.linkPublicacion && (
                                            <div className="pt-1">
                                                <p className="text-[10px] theme-text-muted font-bold uppercase tracking-wider mb-1">Publicación Original</p>
                                                <a href={c.linkPublicacion} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"><LinkIcon className="w-3 h-3 flex-shrink-0" /> Enlace</a>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 pt-4 border-t theme-border flex justify-between items-center">{isAdmin ? <p className="text-sm font-bold theme-text-muted italic flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Reportado por: <span className="theme-text-main">{selectedComment.autor || 'Administrador'}</span></p> : <p className="text-sm font-bold theme-text-muted italic flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-400"></span>Registro de sistema</p>}</div>
                        </div>
                    </div>
                </div>
            )}

            {isEditOpen && editData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 fade-in">
                    <div className="theme-bg-container rounded-2xl w-full max-w-3xl shadow-2xl border theme-border flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b theme-border flex justify-between items-center bg-blue-500/5">
                            <h3 className="font-bold theme-text-main flex items-center gap-2"><Edit3 className="w-5 h-5 text-blue-500" /> Editar Reporte de Comentarios</h3>
                            <button type="button" onClick={() => setIsEditOpen(false)} className="p-2 theme-text-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <form id="editCommentForm" onSubmit={handleEditUpdate} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 theme-bg-lowest border theme-border rounded-xl">
                                    <div><label htmlFor="ec-fechaPublicacion" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Fecha de publicación</label><input id="ec-fechaPublicacion" type="date" required value={editData.fechaPublicacion} onChange={e => setEditData({...editData, fechaPublicacion: e.target.value})} className={`${inputStyles} [color-scheme:light] dark:[color-scheme:dark]`} /></div>
                                    <div><label htmlFor="ec-horaDeteccion" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Hora de detección</label><input id="ec-horaDeteccion" type="time" required value={editData.horaDeteccion} onChange={e => setEditData({...editData, horaDeteccion: e.target.value})} className={`${inputStyles} [color-scheme:light] dark:[color-scheme:dark]`} /></div>
                                    <div><label htmlFor="ec-fuenteMonitoreo" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Fuente de Monitoreo</label><select id="ec-fuenteMonitoreo" value={editData.fuenteMonitoreo} onChange={e => setEditData({...editData, fuenteMonitoreo: e.target.value})} className={inputStyles}><option value="Redes sociales">Redes sociales</option><option value="Medios digitales">Medios digitales</option></select></div>
                                    <div><label htmlFor="ec-evidencia" className="text-xs font-bold theme-text-muted uppercase tracking-wider">Evidencia (Opcional)</label><input id="ec-evidencia" type="url" value={editData.evidencia} onChange={e => setEditData({...editData, evidencia: e.target.value})} className={inputStyles} /></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b theme-border pb-2">
                                        <label className="text-sm font-bold theme-text-main">Comentarios Registrados</label>
                                        {editData.fuenteMonitoreo !== 'Medios digitales' ? (
                                            <button type="button" onClick={() => { const last = (editData.registrosList || [])[(editData.registrosList || []).length - 1] || {}; setEditData({...editData, registrosList: [...(editData.registrosList || []), { id: Date.now().toString(), canal: last.canal || 'Facebook', tipoActor: last.tipoActor || '', usuarioSitioWeb: '', sentiment: '', narrativa: last.narrativa || '', narrativaOtro: '', tipoActorOtro: '', nivelRiesgo: '', estatus: '', visualizaciones: '', reacciones: '', comentarios: '', compartidos: '', hallazgoReputacional: '', linkPublicacion: '' }]}); }} className="text-xs flex items-center gap-1 font-bold text-blue-500 hover:underline"><PlusCircle className="w-3 h-3"/> Agregar otro</button>
                                        ) : (
                                            <button type="button" onClick={() => { const last = (editData.registrosDigitalesList || [])[(editData.registrosDigitalesList || []).length - 1] || {}; setEditData({...editData, registrosDigitalesList: [...(editData.registrosDigitalesList || []), { id: Date.now().toString(), sitioWeb: '', tipoActor: last.tipoActor || '', tipoActorOtro: '', sentimiento: '', narrativa: last.narrativa || '', narrativaOtro: '', nivelRiesgo: '', estatus: '', hallazgoReputacional: '', linkPublicacion: '' }]}); }} className="text-xs flex items-center gap-1 font-bold text-blue-500 hover:underline"><PlusCircle className="w-3 h-3"/> Agregar otro</button>
                                        )}
                                    </div>
                                    {editData.fuenteMonitoreo !== 'Medios digitales' ? (
                                        (editData.registrosList || []).map((c: any, idx: number) => (
                                            <div key={c.id || idx} className="flex flex-col gap-4 p-4 theme-bg-low border theme-border rounded-xl relative group">
                                                {(editData.registrosList || []).length > 1 && (<button type="button" onClick={() => removeEditRegistro(idx)} className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3"/></button>)}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div><label htmlFor={`er-canal-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Canal</label>
                                                        <select id={`er-canal-${idx}`} value={c.canal} onChange={(e) => updateEditRegistro(idx, 'canal', e.target.value)} className={inputStyles}>
                                                            {['Facebook', 'Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'X'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                    <div><label htmlFor={`er-usuario-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Usuario o Sitio Web</label>
                                                        <input id={`er-usuario-${idx}`} type="url" required placeholder="Ej: https://twitter.com/usuario o https://sitio-web.com" value={c.usuarioSitioWeb || ''} onChange={(e) => updateEditRegistro(idx, 'usuarioSitioWeb', e.target.value)} className={inputStyles} />
                                                    </div>
                                                    <div><label htmlFor={`er-actor-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Tipo de Actor</label>
                                                        <select id={`er-actor-${idx}`} value={c.tipoActor} onChange={(e) => updateEditRegistro(idx, 'tipoActor', e.target.value)} className={`${inputStyles} ${!c.tipoActor ? 'text-gray-400' : ''}`}>
                                                            <option value="" disabled>Seleccionar tipo de actor...</option>
                                                            {['Gobierno', 'Creadores de contenido', 'Detractor', 'Portales de noticias', 'Periódicos digitales', 'Medios especializados', 'Sitios institucionales', 'Medios Locales', 'Otro'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                <div><label htmlFor={`er-sen-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Sentimiento de la Mención</label>
                                                        <select id={`er-sen-${idx}`} required value={c.sentiment} onChange={(e) => updateEditRegistro(idx, 'sentiment', e.target.value)} className={`${inputStyles} ${!c.sentiment ? 'text-gray-400' : ''}`}>
                                                            <option value="" disabled>Seleccionar sentimiento...</option>
                                                            <option value="Positivo" className="text-green-600 dark:text-green-400">🟢 Positivo</option>
                                                            <option value="Neutral" className="text-yellow-600 dark:text-yellow-400">🟡 Neutral</option>
                                                            <option value="Negativo" className="text-red-600 dark:text-red-400">🔴 Negativo</option>
                                                        </select>
                                                    </div>
                                                    <div><label htmlFor={`er-riesgo-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Nivel de Riesgo</label>
                                                        <select id={`er-riesgo-${idx}`} value={c.nivelRiesgo} onChange={(e) => updateEditRegistro(idx, 'nivelRiesgo', e.target.value)} className={`${inputStyles} ${!c.nivelRiesgo ? 'text-gray-400' : ''}`}>
                                                            <option value="" disabled>Seleccionar nivel...</option>
                                                            <option value="Bajo">Bajo</option>
                                                            <option value="Medio">Medio</option>
                                                            <option value="Alto">Alto</option>
                                                            <option value="Crítico">Crítico</option>
                                                        </select>
                                                    </div>
                                                    <div><label htmlFor={`er-estatus-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Estatus</label>
                                                        <select id={`er-estatus-${idx}`} value={c.estatus} onChange={(e) => updateEditRegistro(idx, 'estatus', e.target.value)} className={`${inputStyles} ${!c.estatus ? 'text-gray-400' : ''}`}>
                                                            <option value="" disabled>Seleccionar estatus...</option>
                                                            <option value="Monitoreando">Monitoreando</option>
                                                            <option value="Escalado">Escalado</option>
                                                            <option value="Cerrado">Cerrado</option>
                                                        </select>
                                                    </div>
<div className="md:col-span-2"><label htmlFor={`er-narrativa-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Narrativa</label><select id={`er-narrativa-${idx}`} value={c.narrativa} onChange={(e) => updateEditRegistro(idx, 'narrativa', e.target.value)} className={`${inputStyles} ${!c.narrativa ? 'text-gray-400' : ''}`}><option value="" disabled>Seleccionar narrativa...</option>{['Seguridad y regulación', 'Inversión y desarrollo regional', 'Avances de obra e infraestructura', 'Legal y derechos humanos', 'Medio ambiente', 'Difusión informativa', 'Otro'].map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                                                    {c.narrativa === 'Otro' && <div className="md:col-span-2"><label htmlFor={`er-narrativaOtro-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Especificar Narrativa</label><input id={`er-narrativaOtro-${idx}`} type="text" required placeholder="Describe la narrativa..." value={c.narrativaOtro || ''} onChange={(e) => updateEditRegistro(idx, 'narrativaOtro', e.target.value)} className={inputStyles} /></div>}
                                                    <div className="md:col-span-2"><label htmlFor={`er-hallazgo-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Hallazgo reputacional</label><textarea id={`er-hallazgo-${idx}`} rows={2} value={c.hallazgoReputacional} onChange={(e) => updateEditRegistro(idx, 'hallazgoReputacional', e.target.value)} className={`${inputStyles} resize-none leading-relaxed`}></textarea></div>
                                                    <div className="md:col-span-2"><label htmlFor={`er-link-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Link de la publicación original</label><input id={`er-link-${idx}`} type="url" placeholder="https://..." value={c.linkPublicacion} onChange={(e) => updateEditRegistro(idx, 'linkPublicacion', e.target.value)} className={inputStyles} /></div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
(editData.registrosDigitalesList || []).map((c: any, idx: number) => (
                                            <div key={c.id || idx} className="flex flex-col gap-4 p-4 theme-bg-low border theme-border rounded-xl relative group">
                                                {(editData.registrosDigitalesList || []).length > 1 && (<button type="button" onClick={() => removeEditRegistroDigital(idx)} className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3"/></button>)}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="md:col-span-2"><label htmlFor={`ed-sitio-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Sitio Web</label><input id={`ed-sitio-${idx}`} type="url" required value={c.sitioWeb} onChange={(e) => updateEditRegistroDigital(idx, 'sitioWeb', e.target.value)} className={inputStyles} /></div>
                                                    <div><label htmlFor={`ed-actor-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Tipo de Actor</label>
                                                        <select id={`ed-actor-${idx}`} value={c.tipoActor} onChange={(e) => updateEditRegistroDigital(idx, 'tipoActor', e.target.value)} className={`${inputStyles} ${!c.tipoActor ? 'text-gray-400' : ''}`}>
                                                            <option value="" disabled>Seleccionar tipo de actor...</option>
                                                            {['Gobierno', 'Creadores de contenido', 'Detractor', 'Portales de noticias', 'Periódicos digitales', 'Medios especializados', 'Sitios institucionales', 'Medios Locales', 'Otro'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                    {c.tipoActor === 'Otro' && (
                                                        <div><label htmlFor={`ed-actorOtro-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Especificar Tipo de Actor</label><input id={`ed-actorOtro-${idx}`} type="text" required value={c.tipoActorOtro} onChange={(e) => updateEditRegistroDigital(idx, 'tipoActorOtro', e.target.value)} className={inputStyles} /></div>
                                                    )}
                                                    <div><label htmlFor={`ed-sen-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Sentimiento de la Mención</label>
                                                        <select id={`ed-sen-${idx}`} required value={c.sentimiento} onChange={(e) => updateEditRegistroDigital(idx, 'sentimiento', e.target.value)} className={`${inputStyles} ${!c.sentimiento ? 'text-gray-400' : ''}`}>
                                                            <option value="" disabled>Seleccionar sentimiento...</option>
                                                            <option value="Positivo" className="text-green-600 dark:text-green-400">🟢 Positivo</option>
                                                            <option value="Neutral" className="text-yellow-600 dark:text-yellow-400">🟡 Neutral</option>
                                                            <option value="Negativo" className="text-red-600 dark:text-red-400">🔴 Negativo</option>
                                                        </select>
                                                    </div>
<div><label htmlFor={`ed-nivelRiesgo-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Nivel de Riesgo</label>
                                                        <select id={`ed-nivelRiesgo-${idx}`} value={c.nivelRiesgo} onChange={(e) => updateEditRegistroDigital(idx, 'nivelRiesgo', e.target.value)} className={`${inputStyles} ${!c.nivelRiesgo ? 'text-gray-400' : ''}`}>
                                                            <option value="" disabled>Seleccionar nivel...</option>
                                                            <option value="Bajo" className="text-green-600 dark:text-green-400">🟢 Bajo</option>
                                                            <option value="Medio" className="text-orange-600 dark:text-orange-400">🟠 Medio</option>
                                                            <option value="Alto" className="text-yellow-600 dark:text-yellow-400">🟡 Alto</option>
                                                            <option value="Crítico" className="text-red-600 dark:text-red-400">🔴 Crítico</option>
                                                        </select>
                                                    </div>
                                                    <div><label htmlFor={`ed-estatus-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Estatus</label>
                                                        <select id={`ed-estatus-${idx}`} value={c.estatus} onChange={(e) => updateEditRegistroDigital(idx, 'estatus', e.target.value)} className={`${inputStyles} ${!c.estatus ? 'text-gray-400' : ''}`}>
                                                            <option value="" disabled>Seleccionar estatus...</option>
                                                            <option value="Monitoreando" className="text-yellow-600 dark:text-yellow-400">🟡 Monitoreando</option>
                                                            <option value="Escalado" className="text-red-600 dark:text-red-400">🔴 Escalado</option>
                                                            <option value="Cerrado" className="text-green-600 dark:text-green-400">🟢 Cerrado</option>
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-2"><label htmlFor={`ed-narrativa-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Narrativa</label><select id={`ed-narrativa-${idx}`} value={c.narrativa} onChange={(e) => updateEditRegistroDigital(idx, 'narrativa', e.target.value)} className={`${inputStyles} ${!c.narrativa ? 'text-gray-400' : ''}`}><option value="" disabled>Seleccionar narrativa...</option>{['Seguridad y regulación', 'Inversión y desarrollo regional', 'Avances de obra e infraestructura', 'Legal y derechos humanos', 'Medio ambiente', 'Difusión informativa', 'Otro'].map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                                                    {c.narrativa === 'Otro' && <div className="md:col-span-2"><label htmlFor={`ed-narrativaOtro-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Especificar Narrativa</label><input id={`ed-narrativaOtro-${idx}`} type="text" required placeholder="Describe la narrativa..." value={c.narrativaOtro || ''} onChange={(e) => updateEditRegistroDigital(idx, 'narrativaOtro', e.target.value)} className={inputStyles} /></div>}
                                                    <div className="md:col-span-2"><label htmlFor={`ed-hallazgo-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Hallazgo reputacional</label><textarea id={`ed-hallazgo-${idx}`} rows={2} value={c.hallazgoReputacional} onChange={(e) => updateEditRegistroDigital(idx, 'hallazgoReputacional', e.target.value)} className={`${inputStyles} resize-none leading-relaxed`}></textarea></div>
                                                    <div className="md:col-span-2"><label htmlFor={`ed-link-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Link de la publicación original</label><input id={`ed-link-${idx}`} type="url" placeholder="Link de la publicación original" value={c.linkPublicacion} onChange={(e) => updateEditRegistroDigital(idx, 'linkPublicacion', e.target.value)} className={inputStyles} /></div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t theme-border flex justify-end gap-3 bg-black/5 dark:bg-white/5">
                            <button type="button" onClick={() => setIsEditOpen(false)} className="px-5 py-2.5 rounded-xl font-bold theme-text-main hover:bg-black/10 dark:hover:bg-white/10 transition-colors">Cancelar</button>
                            <button type="submit" form="editCommentForm" className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 flex items-center gap-2 shadow-sm"><Save className="w-4 h-4"/> Actualizar Reporte</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};