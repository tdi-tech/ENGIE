import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
    Save, Download, Trash2, MessageSquare, Printer, X, Edit3, 
    Link as LinkIcon, Calendar, PlusCircle, Share2, MapPin, 
    Frown, Meh, Search, ChevronDown, ChevronRight, ChevronLeft, Loader2,
    CheckSquare, Check, Filter
} from 'lucide-react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db, appId, IS_MOCK } from '../../../services/firebase/config';
import { getMonthName } from '../../../shared/utils/date';
import { normalizeMenciones, isRegistroVacio } from '../../../shared/utils/menciones';

const inputStyles = "w-full p-3 rounded-xl theme-bg-low border theme-border theme-text-main focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm";
const radioLabelStyles = "flex items-center gap-2 text-sm font-medium theme-text-main cursor-pointer";

const CAMPUS_OPTIONS = [
    'Atizapán', 'Coacalco', 'Cuautitlán Izcalli', 'Ecatepec', 'Tecamac', 
    'Tultepec', 'Zumpango', 'Tizayuca', 'Querétaro: la Joya', 'Querétaro: el Marqués', 
    'Huehuetoca', 'Chalco'
];

const redesSocialesOptions = [
    'Facebook comentario', 'Facebook DM', 'Facebook grupos', 'Instagram comentario', 
    'Instagram DM', 'LinkedIn', 'Tiktok DM', 'Tiktok comentario'
];

const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
    if (!sentiment) return null;
    if (sentiment === 'Negativo') return <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1 shadow-sm transition-transform hover:scale-105"><Frown className="w-3.5 h-3.5" /> Negativo</span>;
    if (sentiment === 'Neutral') return <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30 flex items-center gap-1 shadow-sm transition-transform hover:scale-105"><Meh className="w-3.5 h-3.5" /> Neutral</span>;
    return null;
};

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
                        {formData.fuenteMonitoreo === 'Redes sociales' && (
                            <button type="button" onClick={addRegistro} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-xl transition-colors">
                                <PlusCircle className="w-4 h-4"/> Agregar nuevo registro
                            </button>
                        )}
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
                                                {['Bajo', 'Medio', 'Alto', 'Crítico'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`estatus-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Estatus</label>
                                            <select id={`estatus-${idx}`} value={registro.estatus} onChange={(e) => updateRegistro(idx, 'estatus', e.target.value)} className={`${inputStyles} ${!registro.estatus ? 'text-gray-400' : ''}`}>
                                                <option value="" disabled>Seleccionar estatus...</option>
                                                {['Monitoreando', 'Escalado', 'Cerrado'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
                            {formData.fuenteMonitoreo === 'Medios digitales' && (
                                <div className="flex justify-end">
                                    <button type="button" onClick={addRegistroDigital} className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-xl transition-colors">
                                        <PlusCircle className="w-4 h-4"/> Agregar nuevo registro
                                    </button>
                                </div>
                            )}
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
    const [isLoading, setIsLoading] = useState(true);
    const [selectedComment, setSelectedComment] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editData, setEditData] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [campoBusqueda, setCampoBusqueda] = useState('usuario');
    const [filterYear, setFilterYear] = useState('Todos');
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
    const [exportCampus, setExportCampus] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (IS_MOCK) { setIsLoading(false); return; }
        setIsLoading(true);
        const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'comments');
        const unsub = onSnapshot(commentsRef, (snapshot) => {
            const data: any[] = [];
            snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setComments(data);
            setTimeout(() => setIsLoading(false), 600);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        setPagePerMonth({});
        // Limpiamos selecciones si cambiamos filtros para evitar borrar cosas invisibles
        setSelectedIds([]);
        setIsSelectionMode(false);
    }, [searchTerm, filterYear]);

    useEffect(() => {
        setExportCampus('');
    }, [exportType, exportYear, exportMonth]);

    const getNormalizedComments = (com: any) => normalizeMenciones(com);

    const availableYears = useMemo(() => {
        const years = new Set(comments.map((c: any) => c.fechaPublicacion ? c.fechaPublicacion.split('-')[0] : null).filter(Boolean));
        return Array.from(years).sort((a: any, b: any) => b.localeCompare(a));
    }, [comments]);

    const availableMonthsForExport = useMemo(() => {
        if (!exportYear) return [];
        const months = new Set(
            comments
                .filter((c: any) => c.fechaPublicacion && c.fechaPublicacion.split('-')[0] === exportYear)
                .map((c: any) => c.fechaPublicacion.split('-')[1])
        );
        return Array.from(months).sort((a: any, b: any) => b.localeCompare(a));
    }, [comments, exportYear]);

    const availableCampusesForExport = useMemo(() => {
        let filtered = comments;
        if (exportType === 'year' && exportYear) {
            filtered = comments.filter((i: any) => i.fechaPublicacion && i.fechaPublicacion.split('-')[0] === exportYear);
        } else if (exportType === 'month' && exportYear && exportMonth) {
            filtered = comments.filter((i: any) => i.fechaPublicacion && i.fechaPublicacion.startsWith(`${exportYear}-${exportMonth}`));
        }
        
        const campuses = new Set<string>();
        filtered.forEach((com: any) => {
            const list = getNormalizedComments(com);
            list.forEach((c: any) => {
                if (c.campus && c.campus !== 'Sin especificar') campuses.add(c.campus);
            });
        });
        
        return Array.from(campuses).sort((a: any, b: any) => a.localeCompare(b));
    }, [comments, exportType, exportYear, exportMonth]);

    const filteredComments = useMemo(() => {
        return comments.filter((com: any) => {
            const year = com.fechaPublicacion ? com.fechaPublicacion.split('-')[0] : '';
            const matchYear = filterYear === 'Todos' || year === filterYear;
            const term = searchTerm.toLowerCase();
            const list = getNormalizedComments(com);
            
            const matchSearch = term === '' || list.some((c: any) => {
                const valor = c[campoBusqueda];
                return valor && String(valor).toLowerCase().includes(term);
            });
            return matchYear && matchSearch;
        });
    }, [comments, searchTerm, campoBusqueda, filterYear]);

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
    
    const openEdit = () => { setEditData({ ...selectedComment, comentariosList: getNormalizedComments(selectedComment) }); setIsDetailOpen(false); setIsEditOpen(true); };
    const handleDelete = () => { setIsDetailOpen(false); deleteComment(selectedComment.id); };
    const handleEditUpdate = (e: React.FormEvent) => { e.preventDefault(); updateComment(editData.id, editData); setIsEditOpen(false); };

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

        if (exportType === 'year') {
            if (!exportYear) return showToast('Selecciona un año para exportar', true);
            dataToExport = comments.filter((i: any) => i.fechaPublicacion && i.fechaPublicacion.split('-')[0] === exportYear);
            if (exportCampus) dataToExport = dataToExport.filter((i: any) => getNormalizedComments(i).some((c:any) => c.campus === exportCampus));
            filenameSuffix = exportCampus ? `${exportYear}_${exportCampus}` : exportYear;

        } else if (exportType === 'month') {
            if (!exportYear || !exportMonth) return showToast('Selecciona año y mes para exportar', true);
            dataToExport = comments.filter((i: any) => i.fechaPublicacion && i.fechaPublicacion.startsWith(`${exportYear}-${exportMonth}`));
            if (exportCampus) dataToExport = dataToExport.filter((i: any) => getNormalizedComments(i).some((c:any) => c.campus === exportCampus));
            filenameSuffix = exportCampus ? `${exportYear}_${exportMonth}_${exportCampus}` : `${exportYear}_${exportMonth}`;
        }

        if (dataToExport.length === 0) return showToast('No hay datos registrados con esos filtros', true);

        setIsExporting(true);

        setTimeout(() => {
            const headers = isAdmin 
                ? ['Fecha Publicación,Hora Detección,Fuente Monitoreo,Evidencias,Red Social,Campus,Sentiment,Usuario,Tipo Posteo,Posteo Original,Comentario,Autor'] 
                : ['Fecha Publicación,Hora Detección,Fuente Monitoreo,Evidencias,Red Social,Campus,Sentiment,Usuario,Tipo Posteo,Posteo Original,Comentario'];
            
            const rows = dataToExport.flatMap((i: any) => {
                let list = getNormalizedComments(i);
                if (exportCampus) {
                    list = list.filter((c: any) => c.campus === exportCampus);
                }
                
                return list.map((c: any) => {
                    const escape = (text: string) => `"${(text || '').toString().replace(/"/g, '""')}"`;
                    const posteoOriginal = c.posteoTipo === 'url' ? c.posteoUrl : c.posteoTexto;
                    const baseData = [
                        escape(i.fechaPublicacion), escape(i.horaDeteccion), escape(i.fuenteMonitoreo), escape(i.evidencia),
                        escape(c.redSocial), escape(c.campus), escape(c.sentiment || 'N/A'), escape(c.usuario),
                        escape(c.posteoTipo), escape(posteoOriginal), escape(c.comentario)
                    ].join(',');
                    return isAdmin ? `${baseData},${escape(i.autor || 'Admin')}` : baseData;
                });
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
                            <h2 className="text-2xl font-bold theme-text-main">Historial de Comentarios</h2>
                            <p className="theme-text-muted text-sm mt-1">Registro organizado de incidencias y reputación.</p>
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
                        <div className="w-full md:w-2/3 flex items-center gap-2">
                            <select aria-label="Campo de búsqueda" value={campoBusqueda} onChange={(e) => setCampoBusqueda(e.target.value)} className={`${inputStyles} py-2 px-3 min-w-[140px]`}>
                                {camposFiltro.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <div className="relative flex-1 flex items-center">
                                <Search className="absolute left-3 text-gray-400 w-4 h-4 pointer-events-none" />
                                <input type="text" aria-label="Buscar" placeholder={`Buscar por ${camposFiltro.find((c: any) => c.value === campoBusqueda)?.label || '...'}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputStyles} pl-10 pr-10`} />
                                {searchTerm && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearchTerm('')} className="absolute right-3 p-1 rounded-md text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors" title="Limpiar búsqueda"><X className="w-4 h-4" /></button>}
                            </div>
                        </div>
                        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-4">
                            <div className="flex items-center gap-2"><label htmlFor="hc-filter-year" className="text-xs font-bold theme-text-muted whitespace-nowrap">Año</label><select id="hc-filter-year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={`${inputStyles} py-2 px-3 min-w-[100px]`}><option value="Todos">Todos</option>{availableYears.map((y: any) => <option key={y} value={y}>{y}</option>)}</select></div>
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
                                                                            const uniqueNetworks = Array.from(new Set(list.map((c: any) => c.redSocial)));
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
                                                                                    <div className="text-sm theme-text-main line-clamp-2 min-h-[40px] opacity-90 mb-1 w-full"><span className="font-bold mr-1">{firstComment.usuario}:</span>{firstComment.comentario}</div>
                                                                                    {hasMore && <p className="text-[10px] font-bold text-blue-500 mb-2">+ {list.length - 1} comentario(s) más</p>}
                                                                                    <div className="mt-auto pt-3 border-t theme-border flex flex-wrap gap-2 items-center w-full"><span className="px-2 py-1 text-[10px] font-bold rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{com.contenido}</span><SentimentBadge sentiment={cardSentimentStatus} />{uniqueNetworks.map((net: any) => <span key={net} className={`px-2 py-1 text-[10px] font-bold rounded-md border ${isSelectionMode && isSelected ? 'bg-red-500/20 border-red-500/30 text-red-600 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>{net}</span>)}</div>
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
                                
                                <label className={`flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${exportType === 'year' ? 'border-blue-500 bg-blue-500/5' : 'theme-border theme-bg-low hover:border-gray-400'}`}>
                                    <div className="flex items-center gap-3">
                                        <input type="radio" name="exportType" checked={exportType === 'year'} onChange={() => { setExportType('year'); if(!exportYear && availableYears.length) setExportYear(String(availableYears[0])); }} className="w-4 h-4 text-blue-500" />
                                        <div><p className="text-sm font-bold theme-text-main">Filtrar por Año y Campus</p><p className="text-xs theme-text-muted">Descarga un año y campus en específico.</p></div>
                                    </div>
                                    {exportType === 'year' && (
                                        <div className="ml-7 flex flex-col gap-3 fade-in mt-2">
                                            <select aria-label="Seleccionar año" value={exportYear} onChange={(e) => setExportYear(e.target.value)} className={inputStyles}>
                                                <option value="" disabled>Selecciona un año</option>
                                                {availableYears.map((y: any) => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                            <select aria-label="Seleccionar campus" value={exportCampus} onChange={(e) => setExportCampus(e.target.value)} className={inputStyles}>
                                                <option value="">Todos los Campus</option>
                                                {availableCampusesForExport.length > 0 ? (
                                                    availableCampusesForExport.map((c: any) => <option key={c} value={c}>{c}</option>)
                                                ) : (
                                                    <option value="none" disabled>No hay campus en esta fecha</option>
                                                )}
                                            </select>
                                        </div>
                                    )}
                                </label>

                                <label className={`flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${exportType === 'month' ? 'border-blue-500 bg-blue-500/5' : 'theme-border theme-bg-low hover:border-gray-400'}`}>
                                    <div className="flex items-center gap-3">
                                        <input type="radio" name="exportType" checked={exportType === 'month'} onChange={() => { setExportType('month'); if(!exportYear && availableYears.length) setExportYear(String(availableYears[0])); }} className="w-4 h-4 text-blue-500" />
                                        <div><p className="text-sm font-bold theme-text-main">Filtrar por Mes y Campus</p><p className="text-xs theme-text-muted">Descarga un mes, año y campus específico.</p></div>
                                    </div>
                                    {exportType === 'month' && (
                                        <div className="ml-7 flex flex-col gap-3 fade-in mt-2">
                                            <div className="flex gap-3">
                                                <select aria-label="Seleccionar año" value={exportYear} onChange={(e) => setExportYear(e.target.value)} className={`${inputStyles} w-1/2`}>
                                                    <option value="" disabled>Año</option>
                                                    {availableYears.map((y: any) => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                                <select aria-label="Seleccionar mes" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className={`${inputStyles} w-1/2`}>
                                                    <option value="" disabled>Mes</option>
                                                    {availableMonthsForExport.map((m: any) => <option key={m} value={m}>{getMonthName(m)}</option>)}
                                                </select>
                                            </div>
                                            <select aria-label="Seleccionar campus" value={exportCampus} onChange={(e) => setExportCampus(e.target.value)} className={inputStyles}>
                                                <option value="">Todos los Campus</option>
                                                {availableCampusesForExport.length > 0 ? (
                                                    availableCampusesForExport.map((c: any) => <option key={c} value={c}>{c}</option>)
                                                ) : (
                                                    <option value="none" disabled>No hay campus en esta fecha</option>
                                                )}
                                            </select>
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
                    <div className="theme-bg-container rounded-2xl w-full max-w-2xl shadow-2xl border theme-border overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:w-full print:max-w-full">
                        <div className="p-5 border-b theme-border flex justify-between items-center bg-blue-500/5 no-print">
                            <div className="flex items-center gap-3"><div className="p-2 bg-blue-500/20 rounded-lg"><MessageSquare className="w-5 h-5 text-blue-500" /></div><div><h3 className="font-bold theme-text-main text-lg">Reporte de Comentarios</h3><p className="text-xs theme-text-muted font-medium">Publicación: {selectedComment.fechaPublicacion} | Detección: {selectedComment.horaDeteccion}</p></div></div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => window.print()} className="p-2 theme-text-muted hover:theme-text-main hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"><Printer className="w-5 h-5"/></button>
                                {isAdmin && (
                                    <><button type="button" onClick={openEdit} className="p-2 text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"><Edit3 className="w-5 h-5"/></button><button type="button" onClick={handleDelete} className="p-2 text-[var(--error)] hover:bg-[var(--error)]/10 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button></>
                                )}
                                <button type="button" onClick={() => setIsDetailOpen(false)} className="p-2 theme-text-muted hover:theme-text-main bg-black/5 dark:bg-white/5 rounded-lg"><X className="w-5 h-5"/></button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar print:overflow-visible flex-1">
                            <div className="mb-6 flex items-center gap-2"><span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-bold uppercase tracking-wider">{selectedComment.contenido}</span>{selectedComment.evidencia && (<a href={selectedComment.evidencia} target="_blank" rel="noreferrer" className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:brightness-110 no-print"><LinkIcon className="w-3 h-3"/> Evidencias</a>)}</div>
                            <div className="space-y-4">
                                <p className="text-sm font-bold theme-text-muted uppercase tracking-wider flex items-center gap-2 border-b theme-border pb-2">Desglose de Comentarios <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">{getNormalizedComments(selectedComment).length}</span></p>
                                {getNormalizedComments(selectedComment).map((c: any, idx: number) => (
                                    <div key={c.id || idx} className={`p-4 theme-bg-low rounded-xl border space-y-3 print:border-gray-300 ${c.sentiment === 'Negativo' ? 'border-red-500/30 bg-red-500/5' : 'theme-border'}`}>
                                        <div className="flex flex-wrap items-center gap-3 border-b theme-border pb-2 border-dashed">
                                            <span className="font-bold text-sm text-blue-500 break-all">{c.usuario}</span>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider"><span className="flex items-center gap-1"><Share2 className="w-3 h-3"/> {c.redSocial}</span><span>•</span><span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {c.campus}</span>{c.sentiment && (<><span>•</span><SentimentBadge sentiment={c.sentiment} /></>)}</div>
                                        </div>
                                        <p className="text-sm theme-text-main whitespace-pre-wrap">{c.comentario}</p>
                                        <div className="pt-2">
                                            <p className="text-[10px] theme-text-muted font-bold uppercase tracking-wider mb-1">Publicación Original</p>
                                            {c.posteoTipo === 'url' ? (<a href={c.posteoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline break-all inline-flex items-start gap-1"><LinkIcon className="w-3 h-3 flex-shrink-0 mt-0.5" /> {c.posteoUrl}</a>) : (<p className="text-xs theme-text-main italic">"{c.posteoTexto}"</p>)}
                                        </div>
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
                                        <button type="button" onClick={() => { const last = editData.comentariosList[editData.comentariosList.length - 1] || {}; setEditData({...editData, comentariosList: [...editData.comentariosList, { id: Date.now().toString(), usuario:'', comentario:'', redSocial: last.redSocial || 'Facebook comentario', campus: last.campus || 'Sin especificar', sentiment: '', posteoTipo: last.posteoTipo || 'url', posteoUrl: last.posteoUrl || '', posteoTexto: last.posteoTexto || '' }]}); }} className="text-xs flex items-center gap-1 font-bold text-blue-500 hover:underline"><PlusCircle className="w-3 h-3"/> Agregar otro</button>
                                    </div>
                                    {editData.comentariosList.map((c: any, idx: number) => (
                                        <div key={c.id || idx} className="flex flex-col gap-3 p-4 theme-bg-low border theme-border rounded-xl relative group">
                                            {editData.comentariosList.length > 1 && (<button type="button" onClick={() => { const newList = editData.comentariosList.filter((_:any, i:number) => i !== idx); setEditData({...editData, comentariosList: newList}); }} className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3"/></button>)}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div><label htmlFor={`ec-red-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Red Social / Canal</label>
                                                    <select id={`ec-red-${idx}`} value={c.redSocial} onChange={(e) => { const n = [...editData.comentariosList]; n[idx].redSocial = e.target.value; setEditData({...editData, comentariosList: n}); }} className={inputStyles}>
                                                        {redesSocialesOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                </div>
                                                <div><label htmlFor={`ec-usr-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Usuario</label><input id={`ec-usr-${idx}`} type="text" required value={c.usuario} onChange={(e) => { const n = [...editData.comentariosList]; n[idx].usuario = e.target.value; setEditData({...editData, comentariosList: n}); }} className={inputStyles} /></div>
                                                <div><label htmlFor={`ec-cam-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Campus</label><select id={`ec-cam-${idx}`} value={c.campus} onChange={(e) => { const n = [...editData.comentariosList]; n[idx].campus = e.target.value; setEditData({...editData, comentariosList: n}); }} className={inputStyles}>{['Sin especificar', 'Atizapán', 'Coacalco', 'Cuautitlán Izcalli', 'Ecatepec', 'Tecamac', 'Tultepec', 'Zumpango', 'Tizayuca', 'Querétaro: la Joya', 'Querétaro: el Marqués', 'Huehuetoca', 'Chalco'].map(camp => <option key={camp}>{camp}</option>)}</select></div>
                                                <div><label htmlFor={`ec-sen-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Sentiment</label><select id={`ec-sen-${idx}`} required value={c.sentiment} onChange={(e) => { const n = [...editData.comentariosList]; n[idx].sentiment = e.target.value; setEditData({...editData, comentariosList: n}); }} className={`${inputStyles} ${!c.sentiment ? 'text-gray-400' : ''}`}><option value="" disabled>Seleccionar...</option><option value="Neutral" className="text-gray-700 dark:text-gray-300">Neutral</option><option value="Negativo" className="text-red-600 dark:text-red-400">Negativo</option></select></div>
                                            </div>
                                            <div className="pt-2"><label htmlFor={`ec-com-${idx}`} className="text-xs font-bold theme-text-muted uppercase tracking-wider">Comentario</label><textarea id={`ec-com-${idx}`} required rows={2} value={c.comentario} onChange={(e) => { const n = [...editData.comentariosList]; n[idx].comentario = e.target.value; setEditData({...editData, comentariosList: n}); }} className={`${inputStyles} resize-none leading-relaxed`}></textarea></div>
                                            <div className="pt-3 border-t theme-border border-dashed">
                                                <div className="flex items-center gap-4 mb-3"><label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Formato Post Original:</label><select aria-label="Tipo de post original" value={c.posteoTipo} onChange={(e) => { const n = [...editData.comentariosList]; n[idx].posteoTipo = e.target.value; n[idx].posteoUrl = ''; n[idx].posteoTexto = ''; setEditData({...editData, comentariosList: n}); }} className={`${inputStyles} py-1.5 px-3 w-auto text-xs`}><option value="url">Enlace (URL)</option><option value="texto">Texto Libre</option></select></div>
                                                {c.posteoTipo === 'url' ? (<input aria-label="URL del post original" type="url" placeholder="URL del post..." value={c.posteoUrl} onChange={(e) => { const n = [...editData.comentariosList]; n[idx].posteoUrl = e.target.value; setEditData({...editData, comentariosList: n}); }} className={inputStyles} />) : (<input aria-label="Texto del post original" type="text" placeholder="Texto del post..." value={c.posteoTexto} onChange={(e) => { const n = [...editData.comentariosList]; n[idx].posteoTexto = e.target.value; setEditData({...editData, comentariosList: n}); }} className={inputStyles} />)}
                                            </div>
                                        </div>
                                    ))}
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