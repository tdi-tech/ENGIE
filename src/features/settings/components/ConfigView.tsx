import React, { useState, useEffect, useCallback } from 'react';
import { 
    Settings, Moon, Sun, Bell, Volume2, VolumeX, 
    ShieldCheck, Megaphone, MessageSquare, 
    Server, Trash2, AlertTriangle, CheckCircle2, X, RefreshCw,
    Activity, ExternalLink, Database, HardDrive, Cpu, Fingerprint, Clock
} from 'lucide-react';
// 🔥 FIX: Importamos setDoc y getDoc
import { collection, getDocs, deleteDoc, doc, getCountFromServer, setDoc, getDoc } from 'firebase/firestore';
import { db, appId } from '../../../services/firebase/config';

const playSynthesizedNotification = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine'; 
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    } catch (error) {
        console.error("Audio bloqueado:", error);
    }
};

const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button 
        type="button" 
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 dark:focus:ring-offset-gray-900 ${checked ? 'bg-[var(--primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-sm ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const HeuristicCard = ({ title, value, subtitle, percent, maxLabel, icon, colorClass }: any) => {
    const isWaiting = value === null;
    
    const getBarColor = () => {
        if (percent > 85) return 'bg-red-500';
        if (percent > 60) return 'bg-orange-500';
        return colorClass || 'bg-[var(--primary)]';
    };

    return (
        <div className="p-5 theme-bg-low border theme-border rounded-xl shadow-sm flex flex-col justify-between bg-black/5 dark:bg-white/5 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500 ${colorClass.replace('bg-', 'text-')}`}>
                {React.cloneElement(icon, { className: "w-24 h-24" })}
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg text-white shadow-sm ${colorClass}`}>{icon}</div>
                        <p className="text-xs font-black theme-text-main uppercase tracking-wider">{title}</p>
                    </div>
                </div>
                
                <div className="mb-3">
                    <p className="text-3xl font-black theme-text-main flex items-baseline gap-1">
                        {isWaiting ? <span className="animate-pulse text-gray-400">...</span> : value}
                    </p>
                    <p className="text-[11px] font-bold theme-text-muted mt-1">{subtitle}</p>
                </div>

                {percent !== undefined && (
                    <div className="space-y-1.5 mt-auto pt-2 border-t theme-border border-dashed">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="theme-text-muted">Uso Estimado</span>
                            <span className="theme-text-main">{isWaiting ? '0' : percent.toFixed(2)}% de {maxLabel}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-1.5 rounded-full transition-all duration-1000 ease-out ${getBarColor()}`} style={{ width: `${isWaiting ? 0 : percent}%`, minWidth: isWaiting ? '0%' : '2%' }}></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const ConfigView = ({ 
    isDarkMode, toggleTheme, userRole, userPrefs, updateUserPrefs, showToast
}: any) => {
    const [isPurging, setIsPurging] = useState(false);
    
    // 🔥 NUEVOS ESTADOS PARA EL CRONJOB
    const [cronFreq, setCronFreq] = useState('manual');
    const [isSettingCron, setIsSettingCron] = useState(false);

    const [stats, setStats] = useState<any>({
        operativeCount: null,
        tracesCount: null,
        estimatedBytes: null,
        syncTime: null
    });
    const [isFetchingLocal, setIsFetchingLocal] = useState(false);
    const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

    const prefs = userPrefs || { sound: true, security: true, rrss: true, comments: true };
    const cleanRole = userRole?.toUpperCase()?.trim() || '';
    const isITAdmin = cleanRole === 'ADMIN_IT';
    const canViewNotifications = ['ADMIN_IT', 'ADMIN_CM'].includes(cleanRole);

    const fetchGlobalServerStats = useCallback(async () => {
        if (!isITAdmin) return;
        setIsFetchingLocal(true);
        
        try {
            // Cada lectura se captura por separado para que un fallo puntual
            // (p.ej. permission-denied en auditLogs) NO tumbe el panel completo.
            const safeCount = async (colName: string) => {
                try {
                    const snap = await getCountFromServer(collection(db, 'artifacts', appId, 'public', 'data', colName));
                    return { colName, value: snap.data().count };
                } catch (err: any) {
                    if (err?.code === 'permission-denied') {
                        console.warn(`[devops] ${colName}: lectura restringida (permission-denied)`);
                    } else {
                        console.error(`[devops] ${colName}:`, err);
                    }
                    return { colName, value: null };
                }
            };

            const resultados = await Promise.all([
                safeCount('rrss_incidents'),
                safeCount('comments'),
                safeCount('notifications'),
                safeCount('auditLogs')
            ]);
            const valores: Record<string, number | null> = {};
            resultados.forEach(r => { valores[r.colName] = r.value; });

            const cRrss = valores['rrss_incidents'] ?? 0;
            const cComs = valores['comments'] ?? 0;
            const cNotifs = valores['notifications'] ?? 0;
            const cLogs = valores['auditLogs'] ?? 0;

            const opCount = cRrss + cComs;
            const trCount = cNotifs + cLogs;

            const estimatedSize = 
                (cRrss * 2200) + 
                (cComs * 800) + 
                (cNotifs * 400) + 
                (cLogs * 600);

            setStats({
                operativeCount: opCount,
                tracesCount: trCount,
                estimatedBytes: estimatedSize,
                syncTime: new Date().toLocaleTimeString()
            });

            // 🔥 NUEVO: Leer la configuración del CronJob actual
            try {
                const cronSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'devops_cron'));
                if(cronSnap.exists()) {
                    setCronFreq(cronSnap.data().frecuencia || 'manual');
                }
            } catch (cronError: any) {
                console.log("No hay configuración previa del CronJob" + (cronError?.code ? ` (${cronError.code})` : ''));
            }

        } catch (error) {
            console.error("Error al consultar la infraestructura:", error);
            showToast('Aviso: No se pudo conectar con Firestore.', true);
        } finally {
            setIsFetchingLocal(false);
        }
    }, [isITAdmin, showToast]);

    useEffect(() => {
        fetchGlobalServerStats();
    }, [fetchGlobalServerStats]);

    // 🔥 NUEVA FUNCIÓN: Envía la orden de programación a Firebase
    const programarPurga = async (frecuenciaElegida: string) => {
        setIsSettingCron(true);
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'devops_cron'), {
                frecuencia: frecuenciaElegida, 
                ultimaModificacion: new Date().toISOString()
            }, { merge: true });
            
            setCronFreq(frecuenciaElegida);
            showToast(`Motor de purga configurado en modo: ${frecuenciaElegida.toUpperCase()}`);
        } catch (error) {
            showToast('Error al programar el motor de limpieza', true);
        } finally {
            setIsSettingCron(false);
        }
    };

    const handlePurgeTraces = async () => {
        setIsPurgeModalOpen(false);
        setIsPurging(true);
        showToast('Iniciando purga global de rastros y logs de auditoría...');
        
        try {
            const [notifQuery, auditQuery] = await Promise.all([
                getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'notifications')),
                getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'auditLogs'))
            ]);

            const deletePromises: Promise<void>[] = [];
            notifQuery.docs.forEach(document => deletePromises.push(deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', document.id))));
            auditQuery.docs.forEach(document => deletePromises.push(deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'auditLogs', document.id))));
            
            await Promise.all(deletePromises);
            showToast('Limpieza profunda completada. Notificaciones y Radar vaciados.');
            await fetchGlobalServerStats();
        } catch (error) {
            showToast('Ocurrió un error al purgar los datos del servidor.', true);
        } finally {
            setIsPurging(false);
        }
    };

    const handleTogglePref = (key: string) => {
        const newValue = !prefs[key];
        const newPrefs = { ...prefs, [key]: newValue };
        updateUserPrefs(newPrefs);
        showToast('Preferencias actualizadas en la nube');
        if (key === 'sound' && newValue === true) {
            playSynthesizedNotification();
        }
    };

    const openFirestoreUsage = () => window.open('https://console.firebase.google.com/project/_/firestore/usage', '_blank');
    const openStorageUsage = () => window.open('https://console.firebase.google.com/project/_/storage/usage', '_blank');

    const MAX_BYTES = 1073741824; 
    const storagePercent = stats.estimatedBytes !== null ? (stats.estimatedBytes / MAX_BYTES) * 100 : 0;
    const formatMB = (bytes: number) => bytes ? (bytes / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB';

    return (
        <div className="max-w-6xl mx-auto space-y-6 fade-in pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold theme-text-main flex items-center gap-2">
                        <Settings className="w-6 h-6 text-[var(--primary)]" /> Configuración
                    </h2>
                    <p className="theme-text-muted text-sm mt-1">Ajustes del sistema, preferencias y salud del servidor.</p>
                </div>
            </div>

            <div className={isITAdmin ? "grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch" : "grid grid-cols-1 gap-6"}>
                <div className={isITAdmin ? "lg:col-span-1 flex flex-col gap-6" : "w-full flex flex-col gap-6"}>
                    
                    <div className="theme-bg-container border theme-border rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold theme-text-main mb-4 uppercase tracking-wider flex items-center gap-2">
                            <Moon className="w-4 h-4 text-purple-500" /> Interfaz
                        </h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold theme-text-main">Tema Visual</p>
                                <p className="text-xs theme-text-muted mt-0.5">Modo claro / oscuro</p>
                            </div>
                            <button 
                                type="button"
                                onClick={toggleTheme}
                                className="flex items-center gap-2 px-3 py-1.5 theme-bg-low border theme-border rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-bold text-xs theme-text-main"
                            >
                                {isDarkMode ? <Sun className="w-3.5 h-3.5"/> : <Moon className="w-3.5 h-3.5"/>}
                                {isDarkMode ? 'Claro' : 'Oscuro'}
                            </button>
                        </div>
                    </div>

                    {canViewNotifications && (
                        <div className="theme-bg-container border theme-border rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold theme-text-main mb-4 uppercase tracking-wider flex items-center gap-2">
                                <Bell className="w-4 h-4 text-orange-500" /> Notificaciones
                            </h3>
                            <div className="space-y-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${prefs.sound ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                            {prefs.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                        </div>
                                        <div><p className="text-sm font-bold theme-text-main">Efectos de Sonido</p><p className="text-xs theme-text-muted">Sonidos al recibir alertas</p></div>
                                    </div>
                                    <ToggleSwitch checked={prefs.sound} onChange={() => handleTogglePref('sound')} />
                                </div>
                                
                                {(
                                    <>
                                        <div className="h-px w-full bg-gray-200 dark:bg-gray-800"></div>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3"><Megaphone className="w-4 h-4 text-orange-500" /><div><p className="text-sm font-bold theme-text-main">Crisis RRSS</p><p className="text-xs theme-text-muted">Incidencias de Reputación</p></div></div>
                                            <ToggleSwitch checked={prefs.rrss} onChange={() => handleTogglePref('rrss')} />
                                        </div>
                                    </>
                                )}
                                
                                <div className="h-px w-full bg-gray-200 dark:bg-gray-800"></div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3"><MessageSquare className="w-4 h-4 text-blue-500" /><div><p className="text-sm font-bold theme-text-main">Comentarios</p><p className="text-xs theme-text-muted">Reportes de Trazabilidad</p></div></div>
                                    <ToggleSwitch checked={prefs.comments} onChange={() => handleTogglePref('comments')} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {isITAdmin && (
                    <div className="lg:col-span-2 flex flex-col gap-6 fade-in">
                        <div className="theme-bg-container border theme-border rounded-2xl p-6 shadow-sm flex flex-col h-full relative overflow-hidden">
                            
                            {/* ENCABEZADO */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
                                <div>
                                    <h3 className="text-sm font-bold theme-text-main uppercase tracking-wider flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> Panel DevOps & Cuotas</h3>
                                    <p className="text-xs theme-text-muted mt-1">Estimaciones algorítmicas de la salud de Firestore en tiempo real.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {stats.syncTime && <span className="text-[10px] theme-text-muted font-bold">Sync: {stats.syncTime}</span>}
                                    <button onClick={fetchGlobalServerStats} disabled={isFetchingLocal} className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50 shadow-sm">
                                        <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLocal ? 'animate-spin' : ''}`} /> 
                                        {isFetchingLocal ? 'Calculando...' : 'Re-evaluar DB'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 relative z-10">
                                <HeuristicCard 
                                    title="Almacenamiento" 
                                    value={formatMB(stats.estimatedBytes)} 
                                    subtitle="Estimación algorítmica por colección"
                                    percent={storagePercent}
                                    maxLabel="1 GB (Spark)"
                                    icon={<HardDrive className="w-5 h-5"/>} 
                                    colorClass="bg-emerald-500" 
                                />
                                <HeuristicCard 
                                    title="Doc. Operativos" 
                                    value={stats.operativeCount !== null ? stats.operativeCount.toLocaleString() : null} 
                                    subtitle="Incidencias y Menciones"
                                    icon={<Database className="w-5 h-5"/>} 
                                    colorClass="bg-blue-500" 
                                />
                                <HeuristicCard 
                                    title="Rastros de Sistema" 
                                    value={stats.tracesCount !== null ? stats.tracesCount.toLocaleString() : null} 
                                    subtitle="Notificaciones y Logs Audit"
                                    icon={<Fingerprint className="w-5 h-5"/>} 
                                    colorClass="bg-purple-500" 
                                />
                            </div>

                            <div className="mb-8 space-y-4 relative z-10 p-5 bg-black/5 dark:bg-white/5 border theme-border rounded-xl">
                                <div>
                                    <h4 className="text-sm font-bold theme-text-main flex items-center gap-2"><Server className="w-4 h-4 text-[var(--accent-purple)]"/> Visores Exactos de Facturación</h4>
                                    <p className="text-xs theme-text-muted mt-1">Acceso directo a las gráficas oficiales de uso saltando los menús intermedios.</p>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button onClick={openFirestoreUsage} className="flex flex-col items-start gap-2 p-4 border theme-border rounded-xl theme-bg-low hover:border-[var(--accent-purple)]/50 hover:bg-[var(--accent-purple)]/5 transition-all text-left group">
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-sm font-black theme-text-main group-hover:text-[var(--accent-purple)] transition-colors">Lecturas / Escrituras</span>
                                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[var(--accent-purple)]" />
                                        </div>
                                        <span className="text-[11px] font-medium theme-text-muted leading-tight">Abre la gráfica exacta de Firestore para monitorear el límite de 50k lecturas/día.</span>
                                    </button>

                                    <button onClick={openStorageUsage} className="flex flex-col items-start gap-2 p-4 border theme-border rounded-xl theme-bg-low hover:border-[var(--accent-purple)]/50 hover:bg-[var(--accent-purple)]/5 transition-all text-left group">
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-sm font-black theme-text-main group-hover:text-[var(--accent-purple)] transition-colors">Ancho de Banda (Red)</span>
                                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[var(--accent-purple)]" />
                                        </div>
                                        <span className="text-[11px] font-medium theme-text-muted leading-tight">Abre la gráfica de Storage y Hosting para vigilar el límite de los 10 GB mensuales.</span>
                                    </button>
                                </div>
                            </div>

                            {/* HERRAMIENTAS CRÍTICAS */}
                            <div className="mt-auto pt-4 border-t theme-border relative z-10">
                                <h4 className="text-xs font-bold theme-text-muted uppercase tracking-widest mb-3">Mantenimiento Crítico</h4>
                                
                                {/* 1. PURGA MANUAL (ORIGINAL) */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 theme-bg-low border border-red-500/30 rounded-xl transition-colors bg-red-500/5 shadow-inner mb-4">
                                    <div className="flex items-start gap-3 w-full sm:w-auto">
                                        <div className="p-2 bg-red-500 text-white rounded-lg shadow-sm mt-0.5"><Trash2 className="w-5 h-5"/></div>
                                        <div>
                                            <p className="text-sm font-black theme-text-main text-red-600 dark:text-red-400 uppercase tracking-wider">Purgar Rastros del Servidor</p>
                                            <p className="text-xs text-red-600/80 dark:text-red-400/80 max-w-sm leading-relaxed mt-1">Esta acción elimina permanentemente los logs de auditoría y notificaciones para liberar espacio.</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => { if (stats.tracesCount === 0 || stats.tracesCount === null) { showToast('El servidor ya está limpio.'); return; } setIsPurgeModalOpen(true); }} 
                                        disabled={isPurging || stats.tracesCount === 0 || stats.tracesCount === null} 
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-500 transition-transform shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {isPurging ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
                                        {isPurging ? 'Purgando...' : 'Ejecutar Purga'}
                                    </button>
                                </div>

                                {/* 2. 🔥 NUEVO: AUTOMATIZACIÓN CRONJOB */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 theme-bg-low border border-[var(--accent-purple)]/30 rounded-xl transition-colors bg-[var(--accent-purple)]/5 shadow-inner">
                                    <div className="flex items-start gap-3 w-full sm:w-auto">
                                        <div className="p-2 bg-[var(--accent-purple)] text-white rounded-lg shadow-sm mt-0.5"><Clock className="w-5 h-5"/></div>
                                        <div>
                                            <p className="text-sm font-black theme-text-main text-[var(--accent-purple)] uppercase tracking-wider">Automatización de Purga</p>
                                            <p className="text-xs text-[var(--accent-purple)]/80 max-w-sm leading-relaxed mt-1">Programa el microservicio en Hostinger para ejecutar la purga en segundo plano según tus reglas.</p>
                                        </div>
                                    </div>
                                    <select 
                                        value={cronFreq} 
                                        onChange={(e) => programarPurga(e.target.value)} 
                                        disabled={isSettingCron}
                                        className="w-full sm:w-auto px-4 py-3 bg-white dark:bg-gray-900 border border-[var(--accent-purple)]/30 rounded-xl text-sm font-bold theme-text-main outline-none focus:border-[var(--accent-purple)] cursor-pointer disabled:opacity-50"
                                    >
                                        <option value="manual">Modo Manual</option>
                                        <option value="diario">Purga Diaria</option>
                                        <option value="semanal">Purga Semanal</option>
                                        <option value="mensual">Purga Mensual</option>
                                    </select>
                                </div>

                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL CONFIRMACIÓN PURGA */}
            {isPurgeModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 fade-in">
                    <div className="theme-bg-container rounded-2xl w-full max-w-md shadow-2xl border theme-border flex flex-col overflow-hidden">
                        <div className="p-4 border-b theme-border flex justify-between items-center bg-red-500/5">
                            <div className="flex items-center gap-3"><div className="p-2 bg-red-500/20 text-red-500 rounded-lg"><Trash2 className="w-5 h-5" /></div><div><h3 className="font-bold theme-text-main">Confirmar Purga</h3><p className="text-[10px] theme-text-muted font-medium uppercase tracking-wider">Acción Irreversible</p></div></div>
                            <button type="button" onClick={() => setIsPurgeModalOpen(false)} className="p-1.5 theme-text-muted hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium leading-relaxed">¿Estás seguro de que deseas vaciar por completo las notificaciones operativas y todos los registros forenses del sistema? Esta acción no se puede deshacer.</p>
                            </div>
                        </div>
                        <div className="p-4 border-t theme-border bg-black/5 dark:bg-white/5 flex gap-3 justify-end">
                            <button type="button" onClick={() => setIsPurgeModalOpen(false)} className="px-4 py-2 text-sm font-bold theme-text-main border theme-border rounded-xl hover:theme-bg-low transition-colors">Cancelar</button>
                            <button type="button" onClick={handlePurgeTraces} className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors shadow-sm">Vaciar Servidor</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};