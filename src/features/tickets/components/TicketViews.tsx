import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
    Save, Download, Trash2, Ticket, Printer, X, Edit3, Link as LinkIcon, 
    Search, ChevronDown, ChevronRight, ChevronLeft, FileText, Loader2, 
    Calendar, AlertTriangle, CheckCircle2, Clock, Send, Lock, ExternalLink,
    Eye, EyeOff, Users, Check, Filter, CheckSquare
} from 'lucide-react';
import { collection, addDoc, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, appId, auth, IS_MOCK } from '../../../services/firebase/config';
import DOMPurify from 'dompurify';
import { useTickets } from '../hooks/useTickets';

const inputStyles = "w-full p-3 rounded-xl theme-bg-low border theme-border theme-text-main focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-sm";
const gridInputExactClass = "w-full h-12 px-3.5 rounded-xl theme-bg-low border theme-border theme-text-main focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-xs font-semibold box-border flex items-center";
const editorStyles = `.wysiwyg-content ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin: 0.5rem 0; } .wysiwyg-content ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin: 0.5rem 0; }`;

const PLATAFORMAS_OPTIONS = ['TikTok', 'Instagram', 'Facebook', 'LinkedIn'];

const EditorToolbar = ({ onCommand }: { onCommand: (cmd: string, val?: string) => void }) => {
    return (
        <div className="flex flex-wrap items-center gap-2 p-2 border-b theme-border bg-black/20 text-gray-400 select-none">
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('undo')} className="p-1.5 hover:bg-white/10 rounded hover:text-white transition-colors" title="Deshacer (Ctrl+Z)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg></button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('bold')} className="px-2 py-1 font-bold text-sm hover:bg-white/10 rounded hover:text-white transition-colors" title="Negrita">B</button>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('italic')} className="px-2 py-1 italic font-serif text-sm hover:bg-white/10 rounded hover:text-white transition-colors" title="Cursiva">I</button>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('underline')} className="px-2 py-1 underline text-sm hover:bg-white/10 rounded hover:text-white transition-colors" title="Subrayado">U</button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('insertUnorderedList')} className="p-1.5 hover:bg-white/10 rounded hover:text-white transition-colors" title="Lista"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onCommand('removeFormat')} className="px-2 py-1 text-xs font-bold hover:bg-white/10 rounded hover:text-white transition-colors" title="Limpiar Formato">Tx</button>
        </div>
    );
};

export const SolicitudTicketsView = ({ showToast, navigate }: any) => {
    // 🔥 FIX: Añadida la variable "descripcion" al estado inicial
    const [formData, setFormData] = useState<{
        prioridad: string, tema: string, descripcion: string, mensaje: string, plataforma: string[],
        objetivo: string, fechaLimite: string, pin: string, formato: string
    }>({
        prioridad: '🟢 Baja', tema: '', descripcion: '', mensaje: '', plataforma: ['Instagram'],
        objetivo: '', fechaLimite: '', pin: '', formato: ''
    });
    const [showPin, setShowPin] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    const { createTicket, isSubmitting, ticketRemainingAttempts, ticketLockoutUntil } = useTickets(showToast, null);

    const execCommand = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setFormData(prev => ({ ...prev, formato: editorRef.current?.innerHTML || '' }));
            editorRef.current.focus();
        }
    };

    const handleEditorBlur = () => { if (editorRef.current) setFormData(prev => ({ ...prev, formato: editorRef.current?.innerHTML || '' })); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.pin.trim()) return showToast('Por favor ingresa el PIN corporativo.', true);
        if (formData.plataforma.length === 0) return showToast('Por favor selecciona al menos una plataforma.', true);
        
        const cleanHTML = DOMPurify.sanitize(editorRef.current ? editorRef.current.innerHTML : formData.formato);
        const success = await createTicket({ ...formData, formato: cleanHTML });
        if (success) {
            setFormData({ prioridad: '🟢 Baja', tema: '', descripcion: '', mensaje: '', plataforma: ['Instagram'], objetivo: '', fechaLimite: '', pin: '', formato: '' });
            if (editorRef.current) editorRef.current.innerHTML = '';
        }
    };

    const isLocked = ticketLockoutUntil !== null && Date.now() < ticketLockoutUntil;

    return (
        <>
            <style>{editorStyles}</style>
            <div className="max-w-4xl mx-auto space-y-8 fade-in pb-16">
                <div className="theme-bg-container p-6 sm:p-10 rounded-[2rem] border theme-border shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-700">
                        <Ticket className="w-48 h-48" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Send className="w-4 h-4" /> Solicitudes Emergentes
                        </p>
                        <h2 className="text-4xl font-black theme-text-main mb-4 tracking-tight">Emisión de Ticket de Contenido</h2>
                        <p className="theme-text-muted text-base max-w-2xl leading-relaxed">
                            Abre una solicitud directa para el equipo de producción. Tu ticket será evaluado en tiempo real en nuestra consola de gestión escalonada.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 px-2 sm:px-6">
                    <div className={`p-6 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                        isLocked 
                        ? 'bg-red-500/10 border-red-500/40' 
                        : ticketRemainingAttempts <= 2 
                        ? 'bg-yellow-500/10 border-yellow-500/40' 
                        : 'bg-purple-500/10 border-purple-500/30'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl shadow-md text-white ${isLocked ? 'bg-red-500' : 'bg-purple-500'}`}>
                                <Lock className="w-5 h-5"/>
                            </div>
                            <div>
                                <h4 className="font-bold theme-text-main text-sm flex items-center gap-2">
                                    Autenticación de Cliente
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                        isLocked ? 'bg-red-500 text-white animate-pulse' :
                                        ticketRemainingAttempts <= 2 ? 'bg-yellow-500 text-black' : 'bg-purple-500/20 text-purple-500'
                                    }`}>
                                        {isLocked ? '🔒 BLOQUEADO EN SERVIDOR' : `${ticketRemainingAttempts} de 5 intentos`}
                                    </span>
                                </h4>
                                <p className="text-xs theme-text-muted">
                                    {isLocked 
                                        ? 'Has superado el límite de intentos en el servidor. Tu IP fue bloqueada por 30 min.'
                                        : 'Ingresa tu PIN de seguridad asignado por Tierra de Ideas.'}
                                </p>
                            </div>
                        </div>
                        <div className="relative flex items-center w-full sm:w-56">
                            <input 
                                type={showPin ? "text" : "password"} 
                                placeholder={isLocked ? "BLOQUEADO" : "PIN Corporativo"} 
                                required 
                                disabled={isLocked || isSubmitting}
                                value={formData.pin} 
                                onChange={(e) => setFormData({...formData, pin: e.target.value})} 
                                className={`${inputStyles} w-full text-center font-mono tracking-widest text-base font-bold bg-white dark:bg-gray-900 border-purple-500/50 pr-10 ${
                                    isLocked ? 'opacity-50 cursor-not-allowed border-red-500 text-red-500' : ''
                                }`} 
                            />
                            <button 
                                type="button" 
                                disabled={isLocked}
                                onClick={() => setShowPin(!showPin)}
                                className="absolute right-3 text-gray-400 hover:text-purple-500 transition-colors focus:outline-none disabled:opacity-30"
                                title={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                            >
                                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 theme-bg-container rounded-[1.5rem] border theme-border shadow-sm space-y-6 border-l-[6px] border-l-purple-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Semáforo de Prioridad</label>
                                <select disabled={isLocked} value={formData.prioridad} onChange={(e) => setFormData({...formData, prioridad: e.target.value})} className={`${inputStyles} font-bold`}>
                                    <option value="🟢 Baja">🟢 Baja</option>
                                    <option value="🟡 Media">🟡 Media</option>
                                    <option value="🟠 Alta">🟠 Alta</option>
                                    <option value="🔴 Crítica">🔴 Crítica</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Plataformas a publicar</label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {PLATAFORMAS_OPTIONS.map(p => (
                                        <button
                                            type="button"
                                            key={p}
                                            disabled={isLocked}
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    plataforma: prev.plataforma.includes(p)
                                                        ? prev.plataforma.filter(x => x !== p)
                                                        : [...prev.plataforma, p]
                                                }))
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                formData.plataforma.includes(p)
                                                ? 'bg-purple-500 text-white border-purple-500'
                                                : 'bg-black/5 dark:bg-white/5 theme-text-muted border-transparent hover:border-purple-500/50'
                                            } disabled:opacity-50`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Fecha Límite / Salida</label>
                                <input disabled={isLocked} type="date" required value={formData.fechaLimite} onChange={(e) => setFormData({...formData, fechaLimite: e.target.value})} className={`${inputStyles} [color-scheme:light] dark:[color-scheme:dark]`} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5"><label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Tema de la publicación</label><input disabled={isLocked} type="text" required placeholder="Ej: Apertura de inscripciones ciclo escolar..." value={formData.tema} onChange={(e) => setFormData({...formData, tema: e.target.value})} className={inputStyles} /></div>
                            <div className="space-y-1.5"><label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Objetivo del contenido</label><input disabled={isLocked} type="text" required placeholder="Ej: Tráfico a landing page, captación de leads..." value={formData.objetivo} onChange={(e) => setFormData({...formData, objetivo: e.target.value})} className={inputStyles} /></div>
                        </div>

                        {/* 🔥 FIX UX: Descripción y Copy agrupados en 2 columnas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Descripción del post</label>
                                <textarea disabled={isLocked} rows={3} required placeholder="Describe el contexto, el estilo visual o la idea del post..." value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} className={`${inputStyles} resize-none leading-relaxed`}></textarea>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Mensaje o Copy Sugerido</label>
                                <textarea disabled={isLocked} rows={3} required placeholder="Redacta el mensaje principal que se debe comunicar..." value={formData.mensaje} onChange={(e) => setFormData({...formData, mensaje: e.target.value})} className={`${inputStyles} resize-none leading-relaxed`}></textarea>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                            <label className="text-xs font-bold theme-text-muted uppercase tracking-wider flex justify-between items-center">Formato Especificado (Editor Visual)<span className="font-normal text-purple-500">Requerimientos visuales o de guion</span></label>
                            <div className={`border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-[var(--surface)] shadow-inner ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                                <EditorToolbar onCommand={execCommand} />
                                <div ref={editorRef} contentEditable={!isLocked} onBlur={handleEditorBlur} className="w-full p-4 theme-bg-low theme-text-main outline-none min-h-[160px] max-h-[350px] overflow-y-auto text-sm leading-relaxed custom-scrollbar wysiwyg-content" data-placeholder="Detalla si es Reel 30s, Carrusel de 5 slides, Video con dron, etc..."></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            type="submit" 
                            disabled={isSubmitting || isLocked} 
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-black text-white shadow-lg transition-all ${
                                isLocked ? 'bg-red-500 hover:bg-red-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 disabled:opacity-50'
                            }`}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : isLocked ? <Lock className="w-5 h-5"/> : <Send className="w-5 h-5"/>}
                            {isSubmitting ? 'Verificando firewall...' : isLocked ? 'Acceso Bloqueado en Servidor (30 min)' : 'Emitir Ticket a Producción'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

const CustomResponsableSelector = ({ selectedValue, users, onSelect, disabled }: { selectedValue: string, users: any[], onSelect: (val: string) => void, disabled?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedUser = users.find((u: any) => (u.displayName || u.email) === selectedValue);

    useEffect(() => {
        const handleClickOutside = (e: any) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div 
                onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
                className={`${gridInputExactClass} justify-between select-none ${disabled ? 'opacity-50 cursor-not-allowed bg-black/5 dark:bg-white/5' : 'cursor-pointer hover:border-purple-500'}`}
                title={disabled ? "No tienes permisos para reasignar este ticket" : "Seleccionar responsable"}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedUser ? (
                        <>
                            {selectedUser.photoURL ? (
                                <img src={selectedUser.photoURL} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-purple-500/50" />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                    {(selectedUser.displayName || selectedUser.email || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="font-semibold text-xs truncate">{selectedUser.displayName || selectedUser.email}</span>
                        </>
                    ) : (
                        <span className="text-gray-400 text-xs">-- Sin asignar --</span>
                    )}
                </div>
                {!disabled && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />}
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-[100000] top-full left-0 right-0 mt-1 theme-bg-container border theme-border rounded-xl shadow-2xl max-h-52 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                    <div 
                        onClick={() => { onSelect(''); setIsOpen(false); }}
                        className="p-2 rounded-lg hover:theme-bg-low text-xs text-gray-400 cursor-pointer flex items-center gap-2"
                    >
                        <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-[10px]">-</div>
                        <span>-- Sin asignar --</span>
                    </div>
                    {users.map((u: any) => {
                        const val = u.displayName || u.email;
                        const isSelected = val === selectedValue;
                        return (
                            <div 
                                key={u.email} 
                                onClick={() => { onSelect(val); setIsOpen(false); }}
                                className={`p-2 rounded-lg flex items-center justify-between cursor-pointer text-xs transition-colors ${isSelected ? 'bg-purple-500/10 text-purple-500 font-bold' : 'hover:theme-bg-low theme-text-main'}`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {u.photoURL ? (
                                        <img src={u.photoURL} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-purple-500/30" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                            {(val || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="truncate">{val}</span>
                                </div>
                                <span className="text-[10px] opacity-60 ml-2 flex-shrink-0">{u.role === 'ADMIN_IT' ? 'TI' : u.role === 'ADMIN_CM' ? 'CM' : 'Editor'}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const GestionTicketsView = ({ showToast, userRole, appUsers, user, updateTicketStatus, updateTicketInternals, deleteTicket, openConfirmModal }: any) => {
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [filterEstado, setFilterEstado] = useState('Todos');

    const canManageAdmin = ['ADMIN_IT', 'ADMIN_CM'].includes(userRole);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    
    const [isExportingCSV, setIsExportingCSV] = useState(false); 
    
    const [csvFilter, setCsvFilter] = useState({ 
        tipo: 'Todo', 
        anio: '', 
        mes: '', 
        plataforma: 'Todas' 
    });

    const { deleteMultipleTickets, exportTicketsCSV } = useTickets(showToast, openConfirmModal);

    const activeTeamUsers = useMemo(() => {
        return (appUsers || []).filter((u: any) => !u.disabled);
    }, [appUsers]);

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        tickets.forEach(t => {
            if (t.timestamp) years.add(new Date(t.timestamp).getFullYear().toString());
        });
        const arr = Array.from(years).sort((a, b) => b.localeCompare(a));
        if (arr.length > 0 && !csvFilter.anio) setCsvFilter(prev => ({...prev, anio: arr[0]}));
        return arr;
    }, [tickets, csvFilter.anio]);

    const availableMonths = useMemo(() => {
        if (!csvFilter.anio) return [];
        const months = new Set<string>();
        tickets.forEach(t => {
            if (t.timestamp) {
                const d = new Date(t.timestamp);
                if (d.getFullYear().toString() === csvFilter.anio) {
                    months.add((d.getMonth() + 1).toString().padStart(2, '0'));
                }
            }
        });
        const arr = Array.from(months).sort();
        if (arr.length > 0 && !csvFilter.mes) setCsvFilter(prev => ({...prev, mes: arr[0]}));
        return arr;
    }, [tickets, csvFilter.anio, csvFilter.mes]);

    const availablePlatforms = useMemo(() => {
        const plats = new Set<string>();
        tickets.forEach(t => {
            if (t.plataforma) {
                const pArray = Array.isArray(t.plataforma) ? t.plataforma : [t.plataforma];
                pArray.forEach((p: string) => plats.add(p));
            }
        });
        return Array.from(plats).sort();
    }, [tickets]);

    useEffect(() => {
        if (IS_MOCK) { setIsLoading(false); return; }
        setIsLoading(true);
        const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), (snapshot) => {
            const arr: any[] = [];
            const currentUser = user || auth.currentUser;
            
            snapshot.forEach((d) => {
                const data = d.data();
                arr.push({ id: d.id, ...data });
                
                if (currentUser && data.estado === 'Pendiente') {
                    const isAlreadyRead = (data.readBy || []).some((id: string) => 
                        (currentUser?.uid && id === currentUser.uid) || (currentUser?.email && id === currentUser.email)
                    );
                    if (!isAlreadyRead) {
                        const idsToAdd = [currentUser?.uid, currentUser?.email].filter(Boolean);
                        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', d.id), {
                            readBy: arrayUnion(...idsToAdd)
                        }).catch(() => {});
                    }
                }
            });
            arr.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
            setTickets(arr);
            setTimeout(() => setIsLoading(false), 500);
        });
        return () => unsub();
    }, [user]);

    const filteredTickets = useMemo(() => {
        if (filterEstado === 'Todos') return tickets;
        return tickets.filter((t: any) => t.estado === filterEstado);
    }, [tickets, filterEstado]);

    const handleUpdateStatus = async (id: string, nuevoEstado: string) => {
        if (updateTicketStatus) {
            await updateTicketStatus(id, nuevoEstado, user || auth.currentUser);
            if (selectedTicket && selectedTicket.id === id) {
                setSelectedTicket({ ...selectedTicket, estado: nuevoEstado });
            }
        }
    };

    const handleInstantResponsableChange = async (newVal: string) => {
        if (!selectedTicket || !canManageAdmin) return;
        setSelectedTicket((prev: any) => ({ ...prev, responsable: newVal }));
        try {
            const updatePayload: any = { responsable: newVal };
            const currentUser = user || auth.currentUser;
            if (currentUser) {
                const idsToAdd = [currentUser.uid, currentUser.email].filter(Boolean);
                updatePayload.readBy = arrayUnion(...idsToAdd);
            }
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', selectedTicket.id), updatePayload);
            showToast('Responsable del ticket guardado');
        } catch (e) {
            showToast('Error al guardar responsable', true);
        }
    };

    const handleSaveInternals = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicket) return;

        if (updateTicketInternals) {
            const success = await updateTicketInternals(selectedTicket.id, selectedTicket, user || auth.currentUser, appUsers);
            if (success) setIsDetailOpen(false);
        }
    };

    const handleDelete = (id: string) => {
        if (!canManageAdmin) return;
        if (deleteTicket) {
            deleteTicket(id, () => setIsDetailOpen(false));
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const executeBatchDelete = () => {
        deleteMultipleTickets(selectedIds, () => {
            setSelectedIds([]);
            setIsSelectionMode(false);
        });
    };

    const handleDownloadCSV = async () => {
        setIsExportingCSV(true);
        await new Promise(resolve => setTimeout(resolve, 800)); 
        const success = await exportTicketsCSV(csvFilter);
        setIsExportingCSV(false);
        if (success) setIsCsvModalOpen(false);
    };

    const getStatusBadge = (estado: string) => {
        switch(estado) {
            case 'Pendiente': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
            case 'En Producción': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
            case 'En Revisión': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
            case 'Resuelto': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
            default: return 'bg-gray-500/10 text-gray-500';
        }
    };

    const getMonthName = (m: string) => {
        const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        return names[parseInt(m) - 1] || m;
    };

    return (
        <div className="space-y-6 fade-in pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><h2 className="text-2xl font-bold theme-text-main">Consola de Gestión de Tickets</h2><p className="theme-text-muted text-sm mt-1">Control de flujo, aprobación y tiempos de entrega para Innovaschools.</p></div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    
                    {canManageAdmin && tickets.length > 0 && (
                        <button 
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                setSelectedIds([]);
                            }} 
                            className={`w-full sm:w-auto px-4 py-2.5 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors border ${isSelectionMode ? 'bg-red-500 text-white border-red-500' : 'theme-bg-low theme-text-main border-transparent hover:border-red-500/50'}`}
                            title={isSelectionMode ? "Cancelar selección" : "Borrar tickets por lotes"}
                        >
                            <CheckSquare className="w-4 h-4"/> {isSelectionMode ? 'Cancelar' : 'Selección Múltiple'}
                        </button>
                    )}

                    <button onClick={() => setIsCsvModalOpen(true)} className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-500 flex items-center justify-center gap-2 shadow-sm transition-colors">
                        <Download className="w-4 h-4"/> CSV
                    </button>
                    
                    <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className={`${inputStyles} sm:w-48 font-bold`}>
                        <option value="Todos">Todos los Estados</option>
                        <option value="Pendiente">🟡 Pendientes</option>
                        <option value="En Producción">🟣 En Producción</option>
                        <option value="En Revisión">🔵 En Revisión</option>
                        <option value="Resuelto">🟢 Resueltos</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 fade-in">
                    {[1, 2, 3, 4, 5, 6].map(card => (
                        <div key={card} className="p-5 theme-bg-container rounded-xl border theme-border shadow-sm h-44 animate-pulse flex flex-col justify-between">
                            <div className="flex items-start gap-3 mb-3 w-full">
                                <div className="w-10 h-10 rounded-lg bg-gray-300 dark:bg-gray-700 flex-shrink-0"></div>
                                <div className="flex-1 space-y-2 py-1 w-full"><div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div><div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div></div>
                            </div>
                            <div className="space-y-2 mt-2 w-full"><div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div><div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div></div>
                            <div className="mt-auto pt-3 border-t theme-border flex gap-2 w-full"><div className="h-6 w-16 bg-gray-300 dark:bg-gray-700 rounded-md"></div><div className="h-6 w-20 bg-gray-300 dark:bg-gray-700 rounded-md"></div></div>
                        </div>
                    ))}
                </div>
            ) : filteredTickets.length === 0 ? (
                <div className="text-center py-16 theme-bg-container rounded-2xl border theme-border"><Ticket className="w-12 h-12 theme-text-muted mx-auto mb-4 opacity-30" /><p className="theme-text-muted">No hay tickets registrados bajo el filtro actual.</p></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
                    {filteredTickets.map((t: any) => {
                        const assignedObj = activeTeamUsers.find((u: any) => (u.displayName || u.email) === t.responsable);
                        const plats = Array.isArray(t.plataforma) ? t.plataforma : [t.plataforma];
                        
                        const isSelected = selectedIds.includes(t.id);
                        
                        return (
                            <div 
                                key={t.id} 
                                onClick={() => { 
                                    if (isSelectionMode) toggleSelection(t.id); 
                                    else { setSelectedTicket(t); setIsDetailOpen(true); }
                                }} 
                                className={`p-5 rounded-xl border shadow-sm transition-all cursor-pointer flex flex-col justify-between h-full border-l-4 group relative ${
                                    isSelectionMode 
                                    ? isSelected 
                                        ? 'bg-red-500/10 border-red-500 border-l-red-500 scale-[0.98]' 
                                        : 'theme-bg-container theme-border border-l-gray-300 dark:border-l-gray-700 hover:border-red-500/50'
                                    : 'theme-bg-container theme-border hover:border-purple-500 border-l-purple-500'
                                }`}
                            >
                                {isSelectionMode && (
                                    <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-red-500 border-red-500' : 'border-gray-400 dark:border-gray-600'}`}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                )}
                                
                                <div>
                                    <div className="flex justify-between items-start mb-2 gap-2 pr-6">
                                        <span className="text-xs font-bold">{t.prioridad}</span>
                                        <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-md border uppercase ${getStatusBadge(t.estado)}`}>{t.estado}</span>
                                    </div>
                                    <h3 className={`font-bold text-base transition-colors line-clamp-1 ${isSelectionMode && isSelected ? 'text-red-500' : 'theme-text-main group-hover:text-purple-500'}`}>{t.tema}</h3>
                                    <p className="text-xs theme-text-muted line-clamp-2 mt-1 mb-3">{t.mensaje}</p>
                                </div>
                                <div className="pt-3 border-t theme-border flex flex-col gap-2 text-[11px] theme-text-muted">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-wrap gap-1">
                                            {plats.map((p: string, idx: number) => (
                                                <span key={idx} className={`font-bold px-2 py-0.5 border rounded text-[9px] ${isSelectionMode && isSelected ? 'bg-red-500/20 border-red-500/30 text-red-600 dark:text-red-400' : 'theme-bg-low theme-border'}`}>{p}</span>
                                            ))}
                                        </div>
                                        <span className="flex items-center gap-1 flex-shrink-0 ml-2"><Calendar className="w-3 h-3"/> Límite: {t.fechaLimite}</span>
                                    </div>
                                    {t.responsable && (
                                        <div className={`flex items-center gap-1.5 font-medium truncate pt-1 border-t theme-border/40 ${isSelectionMode && isSelected ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                            {assignedObj && assignedObj.photoURL ? (
                                                <img src={assignedObj.photoURL} alt="" className={`w-4 h-4 rounded-full object-cover flex-shrink-0 border ${isSelectionMode && isSelected ? 'border-red-500/40' : 'border-purple-500/40'}`} />
                                            ) : (
                                                <Users className="w-3.5 h-3.5 flex-shrink-0"/>
                                            )}
                                            <span className="truncate">Asignado a: <strong className="font-bold">{t.responsable}</strong></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isSelectionMode && canManageAdmin && ReactDOM.createPortal(
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-[9999] fade-in">
                    <span className="font-bold text-sm">{selectedIds.length} ticket(s) seleccionados</span>
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

            {isCsvModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 w-screen h-screen bg-black/70 backdrop-blur-md z-[50] flex items-center justify-center p-4 fade-in">
                    <div className="theme-bg-container rounded-2xl w-full max-w-md shadow-2xl border theme-border flex flex-col overflow-hidden">
                        <div className="p-4 border-b theme-border flex justify-between items-center bg-emerald-500/5">
                            <div className="flex items-center gap-3"><div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg"><Filter className="w-5 h-5"/></div><div><h3 className="font-bold theme-text-main text-base">Filtros de Exportación CSV</h3></div></div>
                            <button onClick={() => setIsCsvModalOpen(false)} disabled={isExportingCSV} className="p-1.5 theme-text-muted hover:bg-black/10 dark:hover:bg-white/10 rounded-lg disabled:opacity-50"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {availableYears.length === 0 ? (
                                <div className="text-center p-4 theme-bg-low rounded-xl border theme-border">
                                    <p className="text-sm font-bold theme-text-muted">No hay tickets registrados en la base de datos.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Rango de Tiempo</label>
                                        <select disabled={isExportingCSV} value={csvFilter.tipo} onChange={(e) => setCsvFilter({...csvFilter, tipo: e.target.value})} className={inputStyles}>
                                            <option value="Todo">Todo el historial (Ignorar fechas)</option>
                                            <option value="Anio">Filtrar solo por Año</option>
                                            <option value="Mes">Filtrar por Mes y Año específico</option>
                                        </select>
                                    </div>
                                    
                                    {csvFilter.tipo !== 'Todo' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Año</label>
                                                <select disabled={isExportingCSV} value={csvFilter.anio} onChange={(e) => setCsvFilter({...csvFilter, anio: e.target.value})} className={inputStyles}>
                                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>
                                            {csvFilter.tipo === 'Mes' && (
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Mes</label>
                                                    <select disabled={isExportingCSV} value={csvFilter.mes} onChange={(e) => setCsvFilter({...csvFilter, mes: e.target.value})} className={inputStyles}>
                                                        {availableMonths.map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold theme-text-muted uppercase tracking-wider">Red Social / Plataforma</label>
                                        <select disabled={isExportingCSV} value={csvFilter.plataforma} onChange={(e) => setCsvFilter({...csvFilter, plataforma: e.target.value})} className={inputStyles}>
                                            <option value="Todas">Todas las plataformas</option>
                                            {availablePlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-4 border-t theme-border bg-black/5 dark:bg-white/5 flex justify-end gap-3">
                            <button onClick={() => setIsCsvModalOpen(false)} disabled={isExportingCSV} className="px-5 py-2.5 rounded-xl font-bold theme-text-main text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50">Cancelar</button>
                            <button onClick={handleDownloadCSV} disabled={isExportingCSV || availableYears.length === 0} className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-2 shadow-sm transition-all disabled:opacity-50">
                                {isExportingCSV ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>} 
                                {isExportingCSV ? 'Procesando...' : 'Extraer Datos'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isDetailOpen && selectedTicket && ReactDOM.createPortal(
                <div className="fixed inset-0 w-screen h-screen bg-black/70 backdrop-blur-md z-[50] flex items-center justify-center p-4 fade-in overflow-y-auto">
                    <div className="theme-bg-container rounded-2xl w-full max-w-2xl shadow-2xl border theme-border flex flex-col max-h-[90vh] overflow-hidden my-auto">
                        <div className="p-5 border-b theme-border flex justify-between items-center bg-purple-500/5">
                            <div className="flex items-center gap-3"><div className="p-2 bg-purple-500/20 text-purple-500 rounded-lg"><Ticket className="w-5 h-5"/></div><div><h3 className="font-bold theme-text-main text-lg">{selectedTicket.tema}</h3><p className="text-xs theme-text-muted">Solicitado por Innovaschools</p></div></div>
                            <div className="flex items-center gap-2">
                                {canManageAdmin && <button onClick={() => handleDelete(selectedTicket.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg" title="Eliminar ticket"><Trash2 className="w-5 h-5"/></button>}
                                <button onClick={() => setIsDetailOpen(false)} className="p-2 theme-text-muted hover:theme-text-main rounded-lg" title="Cerrar modal"><X className="w-5 h-5"/></button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            <div className="flex flex-wrap gap-3 items-center justify-between p-4 theme-bg-low rounded-xl border theme-border">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold">{selectedTicket.prioridad}</span>
                                    <div className="flex flex-wrap gap-1">
                                        {(Array.isArray(selectedTicket.plataforma) ? selectedTicket.plataforma : [selectedTicket.plataforma]).map((p: string, idx: number) => (
                                            <span key={idx} className="text-xs font-bold px-2 py-1 bg-purple-500/10 text-purple-500 rounded border border-purple-500/20">{p}</span>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg border theme-border text-xs font-bold theme-text-main">
                                    <Calendar className="w-3.5 h-3.5 text-purple-500" />
                                    <span>Límite: <span className="text-purple-600 dark:text-purple-400">{selectedTicket.fechaLimite}</span></span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold theme-text-muted">Estatus:</span>
                                    <select value={selectedTicket.estado} onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)} className={`${inputStyles} py-1 px-3 w-auto font-bold text-xs`}>
                                        <option value="Pendiente">🟡 Pendiente</option><option value="En Producción">🟣 En Producción</option><option value="En Revisión">🔵 En Revisión</option><option value="Resuelto">🟢 Resuelto</option>
                                    </select>
                                </div>
                            </div>

                            {/* 🔥 FIX UX: Modal actualizado para mostrar Descripción del post */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-bold theme-text-muted uppercase mb-1">Descripción del Post</p>
                                        <div className="p-4 theme-bg-low rounded-xl border theme-border text-sm whitespace-pre-wrap">{selectedTicket.descripcion || 'Sin descripción asignada.'}</div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold theme-text-muted uppercase mb-1">Mensaje o Copy Solicitado</p>
                                        <div className="p-4 theme-bg-low rounded-xl border theme-border text-sm whitespace-pre-wrap">{selectedTicket.mensaje}</div>
                                    </div>
                                </div>
                                <div><p className="text-xs font-bold theme-text-muted uppercase mb-1">Objetivo del Contenido</p><p className="p-3 theme-bg-low rounded-xl border theme-border text-sm font-medium">{selectedTicket.objetivo}</p></div>
                                <div><p className="text-xs font-bold theme-text-muted uppercase mb-1">Formato Especificado</p><div className="p-4 theme-bg-low rounded-xl border theme-border text-sm wysiwyg-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedTicket.formato || '<p>Sin formato visual adjunto.</p>') }}></div></div>
                            </div>

                            <form onSubmit={handleSaveInternals} className="pt-4 border-t theme-border space-y-5">
                                <h4 className="font-bold text-sm theme-text-main flex items-center gap-2"><Clock className="w-4 h-4 text-purple-500"/> Gestión Interna de Producción</h4>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold theme-text-muted flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-purple-500"/> Responsable Asignado</label>
                                        <CustomResponsableSelector 
                                            selectedValue={selectedTicket.responsable || ''} 
                                            users={activeTeamUsers} 
                                            onSelect={handleInstantResponsableChange}
                                            disabled={!canManageAdmin}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold theme-text-muted">Fecha Real de Entrega</label>
                                        <input type="date" value={selectedTicket.fechaEntregaReal || ''} onChange={e => setSelectedTicket({...selectedTicket, fechaEntregaReal: e.target.value})} className={`${gridInputExactClass} [color-scheme:light] dark:[color-scheme:dark]`} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold theme-text-muted">Link del Arte / Drive Final</label>
                                        <input type="url" placeholder="https://drive..." value={selectedTicket.linkArte || ''} onChange={e => setSelectedTicket({...selectedTicket, linkArte: e.target.value})} className={gridInputExactClass} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold theme-text-muted">Notas Internas para el Equipo</label>
                                        <input type="text" placeholder="Comentarios de avance..." value={selectedTicket.notasInternas || ''} onChange={e => setSelectedTicket({...selectedTicket, notasInternas: e.target.value})} className={gridInputExactClass} />
                                    </div>
                                </div>

                                {selectedTicket.linkArte && <a href={selectedTicket.linkArte} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-500 hover:underline"><ExternalLink className="w-3.5 h-3.5"/> Abrir Arte Adjunto</a>}
                                <button type="submit" className="w-full py-3 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-500 flex items-center justify-center gap-2 shadow-md transition-all"><Save className="w-4 h-4"/> Guardar Metadatos Internos</button>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};