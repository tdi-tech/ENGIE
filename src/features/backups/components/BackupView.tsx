import React, { useState, useEffect, useMemo } from 'react';
import { Database, Download, UploadCloud, ShieldAlert, CheckCircle2, AlertCircle, Key, Lock, Eye, EyeOff, FileJson, Server, Calendar, Filter } from 'lucide-react';
import CryptoJS from 'crypto-js';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db, appId, IS_MOCK } from '../../../services/firebase/config';
import { logAuditEvent } from "../../../services/firebase/audit.service";
import { getMonthName } from '../../../shared/utils/date';

const inputStyles = "w-full p-3 rounded-xl theme-bg-low border theme-border theme-text-main focus:border-[var(--accent-purple)] focus:ring-1 focus:ring-[var(--accent-purple)] outline-none transition-all text-sm";
// radioLabelStyles eliminado por la nueva UI de tarjetas

export const BackupView = ({ showToast }: any) => {
    const [uploading, setUploading] = useState(false);
    const [backupInfo, setBackupInfo] = useState<any>(null);
    
    const [exportPassword, setExportPassword] = useState('');
    const [showExportPassword, setShowExportPassword] = useState(false);
    
    const [exportType, setExportType] = useState('all');
    const [exportYear, setExportYear] = useState('');
    const [exportMonth, setExportMonth] = useState('');

    const [importPassword, setImportPassword] = useState('');
    const [showImportPassword, setShowImportPassword] = useState(false);
    
    const [encryptedFileContent, setEncryptedFileContent] = useState<string | null>(null);

    const [rrssIncidents, setRrssIncidents] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);

    useEffect(() => {
        if (IS_MOCK) return;
        const unsubRrss = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'rrss_incidents'), (snap) => {
            const data: any[] = []; snap.forEach(doc => data.push({ id: doc.id, ...doc.data() })); setRrssIncidents(data);
        });
        const unsubComments = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'comments'), (snap) => {
            const data: any[] = []; snap.forEach(doc => data.push({ id: doc.id, ...doc.data() })); setComments(data);
        });
        return () => { unsubRrss(); unsubComments(); };
    }, []);

    const getNormalizedDate = (item: any, type: string) => {
        let rawDate = '';
        if (type === 'comments') rawDate = item.fechaInicio || '';
        else rawDate = item.fecha || '';
        return rawDate; 
    };

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        const extractYear = (list: any[], type: string) => {
            list.forEach(item => {
                const d = getNormalizedDate(item, type);
                if (d) years.add(d.split('-')[0]);
            });
        };
        extractYear(rrssIncidents, 'rrss');
        extractYear(comments, 'comments');
        
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [rrssIncidents, comments]);

    const availableMonths = useMemo(() => {
        if (!exportYear) return [];
        const months = new Set<string>();
        const extractMonth = (list: any[], type: string) => {
            list.forEach(item => {
                const d = getNormalizedDate(item, type);
                if (d && d.startsWith(exportYear)) months.add(d.split('-')[1]);
            });
        };
        extractMonth(rrssIncidents, 'rrss');
        extractMonth(comments, 'comments');
        
        return Array.from(months).sort();
    }, [rrssIncidents, comments, exportYear]);

    useEffect(() => { setExportMonth(''); }, [exportYear]);

    const handleExportAll = async () => {
        // Modo local: sin cifrado ni descarga de datos.
        if (IS_MOCK) { showToast('Los respaldos no están disponibles en modo local.', true); return; }
        if (!exportPassword || exportPassword.length < 6) {
            showToast('La contraseña debe tener al menos 6 caracteres.', true);
            return;
        }

        try {
            let rrssExport = rrssIncidents;
            let commentsExport = comments;

            if (exportType === 'filtered' && exportYear) {
                const prefix = exportMonth ? `${exportYear}-${exportMonth}` : exportYear;
                rrssExport = rrssIncidents.filter(i => getNormalizedDate(i, 'rrss').startsWith(prefix));
                commentsExport = comments.filter(i => getNormalizedDate(i, 'comments').startsWith(prefix));
            }

            const totalRecords = rrssExport.length + commentsExport.length;
            if (totalRecords === 0) {
                return showToast('No hay datos registrados en el rango de fecha seleccionado.', true);
            }

            const backupData = {
                version: "3.4",
                exportDate: new Date().toISOString(),
                temporalFilter: exportType === 'filtered' ? (exportMonth ? `${exportYear}-${exportMonth}` : exportYear) : 'ALL',
                modules: {
                    rrss: rrssExport || [],
                    comentarios: commentsExport || []
                }
            };

            const jsonString = JSON.stringify(backupData);
            const encryptedData = CryptoJS.AES.encrypt(jsonString, exportPassword).toString();
            
            const finalWrapper = {
                protected: true,
                payload: encryptedData
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalWrapper, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            const suffix = exportType === 'filtered' ? `_${backupData.temporalFilter}` : '';
            downloadAnchorNode.setAttribute("download", `CORE_BACKUP_SECURE${suffix}_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            
            setExportPassword('');
            setShowExportPassword(false);
            showToast('Copia de seguridad encriptada y generada con éxito');
        } catch (error) {
            showToast('Error al compilar y cifrar el respaldo', true);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Modo local: no se leen ni procesan archivos locales.
        if (IS_MOCK) return;
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsedData = JSON.parse(event.target?.result as string);
                
                if (parsedData.protected && parsedData.payload) {
                    setEncryptedFileContent(parsedData.payload);
                    setBackupInfo(null);
                    showToast('Archivo protegido cargado. Ingrese la contraseña de descifrado.');
                } else if (parsedData.modules && parsedData.version) {
                    showToast('Advertencia: Está cargando un respaldo obsoleto sin cifrado.', true);
                    setBackupInfo(parsedData);
                    setEncryptedFileContent(null);
                } else {
                    await logAuditEvent("Alerta de Integridad: Formato inválido");
                    showToast('El archivo no corresponde a un formato válido de ENGIE', true);
                }
            } catch (err) {
                await logAuditEvent("Fallo de Integridad: Archivo corrupto o manipulado");
                showToast('Error al leer el archivo. Estructura corrupta.', true);
            }
        };
        reader.readAsText(file);
    };

    const handleDecrypt = async () => {
        // Modo local: no se desencriptan datos.
        if (IS_MOCK) return;
        if (!encryptedFileContent || !importPassword) return;
        
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedFileContent, importPassword);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            
            if (!decryptedString) throw new Error("Contraseña incorrecta");
            
            const parsedData = JSON.parse(decryptedString);
            setBackupInfo(parsedData);
            setEncryptedFileContent(null);
            setImportPassword('');
            setShowImportPassword(false);
            showToast('Archivo descifrado correctamente. Listo para restaurar.');
        } catch (error) {
            await logAuditEvent("Alerta Criptográfica: Fallo de descifrado");
            showToast('Contraseña incorrecta o archivo corrupto.', true);
        }
    };

    const handleExecuteRestore = async () => {
        // Modo local: no se escribe nada en la nube.
        if (IS_MOCK) return;
        if (!backupInfo) return;
        setUploading(true);
        showToast('Iniciando restauración en la nube...');

        try {
            let restoredRrss = 0; let restoredComments = 0;
            let skipped = 0;
            let failed = 0; let failReason = '';
            const { rrss, comentarios } = backupInfo.modules;

            // Los docs del respaldo traen el campo 'id' (del snapshot de exportación:
            // { id: doc.id, ...doc.data() }). Firestore lo rechaza como campo del
            // documento, por eso se usa como ID del doc y se elimina del payload.
            const injectDoc = async (collectionName: string, item: any) => {
                const payload: any = { ...item };
                delete payload.id;
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, item.id), payload);
            };
            const describeError = (err: any) => {
                const code = err?.code || '';
                if (code === 'permission-denied') return 'permisos denegados por las reglas de Firestore';
                if (code === 'unavailable' || code === 'cancelled') return 'canal bloqueado (desactive bloqueadores de anuncios/extensión del navegador para este sitio)';
                return 'error desconocido';
            };

            if (rrss && Array.isArray(rrss)) {
                for (const item of rrss) {
                    if (rrssIncidents.some((i: any) => i.id === item.id)) { skipped++; continue; }
                    try { await injectDoc('rrss_incidents', item); restoredRrss++; }
                    catch (err: any) { failed++; failReason = describeError(err); }
                }
            }

            if (comentarios && Array.isArray(comentarios)) {
                for (const item of comentarios) {
                    if (comments.some((i: any) => i.id === item.id)) { skipped++; continue; }
                    try { await injectDoc('comments', item); restoredComments++; }
                    catch (err: any) { failed++; failReason = describeError(err); }
                }
            }

            const injected = restoredRrss + restoredComments;
            const skippedNote = skipped ? ` · ${skipped} duplicados omitidos` : '';
            if (failed === 0) {
                showToast(`Restauración exitosa: +${restoredRrss} Incidencias, +${restoredComments} Menciones${skippedNote}`);
                setBackupInfo(null);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showToast(`Restauración parcial: ${injected} inyectados, ${failed} fallidos (${failReason})${skippedNote}`, true);
            }
        } catch (error) {
            showToast('Error crítico durante la reinyección de datos', true);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 fade-in pb-16">
            
            <div className="theme-bg-container p-6 sm:p-10 rounded-[2rem] border theme-border shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-105 group-hover:rotate-3 transition-transform duration-700">
                    <Database className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-[var(--accent-purple)] uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Server className="w-4 h-4" /> Infraestructura Segura
                    </p>
                    <h2 className="text-4xl font-black theme-text-main mb-4 tracking-tight">Centro de Respaldos Core</h2>
                    <p className="theme-text-muted text-base max-w-2xl leading-relaxed">
                        Exportación de bases de datos consolidadas e inyección de respaldos cifrados con protocolo AES-256. Módulo de uso exclusivo para recuperación ante desastres.
                    </p>
                </div>
            </div>

            {IS_MOCK && (
                <div className="px-4 sm:px-8 fade-in">
                    <div className="flex items-center gap-4 p-6 rounded-2xl border border-dashed theme-border theme-bg-low">
                        <ShieldAlert className="w-8 h-8 text-amber-500 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold theme-text-main">Modo local (Zero-State)</h3>
                            <p className="text-sm theme-text-muted">No hay respaldos disponibles en modo local.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 px-4 sm:px-8">
                
                {/* COLUMNA IZQUIERDA: EXPORTACIÓN */}
                <div className="space-y-8 border-b lg:border-b-0 lg:border-r theme-border pb-12 lg:pb-0 lg:pr-12">
                    <div>
                        <h3 className="text-2xl font-black theme-text-main flex items-center gap-3 mb-3">
                            <Download className="w-7 h-7 text-[var(--accent-purple)]" /> Generar Respaldo
                        </h3>
                        <p className="text-sm theme-text-muted leading-relaxed">
                            Descarga historiales operativos en un archivo JSON protegido. Este archivo será ilegible si es interceptado por un tercero.
                        </p>
                    </div>

                    <div className="space-y-6">
                        
                        {/* 🔥 FIX UX: Nueva UI de Tarjetas Selectables (Selectable Cards) */}
                        <div className="p-5 border theme-border rounded-2xl theme-bg-container shadow-sm space-y-5">
                            <h4 className="font-bold text-sm theme-text-main flex items-center gap-2"><Filter className="w-4 h-4 text-[var(--accent-purple)]"/> Alcance del Respaldo</h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setExportType('all')}
                                    className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left group ${exportType === 'all' ? 'border-[var(--accent-purple)] bg-[var(--accent-purple)]/10 shadow-md' : 'border-gray-200 dark:border-gray-800 hover:border-[var(--accent-purple)]/50 bg-black/5 dark:bg-white/5'}`}
                                >
                                    <div className="flex justify-between items-center w-full mb-3">
                                        <Database className={`w-5 h-5 ${exportType === 'all' ? 'text-[var(--accent-purple)]' : 'theme-text-muted group-hover:text-[var(--accent-purple)] transition-colors'}`} />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${exportType === 'all' ? 'border-[var(--accent-purple)] bg-[var(--accent-purple)]' : 'border-gray-400 dark:border-gray-600'}`}>
                                            {exportType === 'all' && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                    </div>
                                    <span className={`font-black text-sm ${exportType === 'all' ? 'text-[var(--accent-purple)]' : 'theme-text-main'}`}>Toda la Nube</span>
                                    <span className="text-[10px] font-medium theme-text-muted mt-1">Extrae el 100% de la historia.</span>
                                </button>

                                <button 
                                    type="button"
                                    onClick={() => { setExportType('filtered'); if(!exportYear && availableYears.length) setExportYear(availableYears[0]); }}
                                    className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left group ${exportType === 'filtered' ? 'border-[var(--accent-purple)] bg-[var(--accent-purple)]/10 shadow-md' : 'border-gray-200 dark:border-gray-800 hover:border-[var(--accent-purple)]/50 bg-black/5 dark:bg-white/5'}`}
                                >
                                    <div className="flex justify-between items-center w-full mb-3">
                                        <Calendar className={`w-5 h-5 ${exportType === 'filtered' ? 'text-[var(--accent-purple)]' : 'theme-text-muted group-hover:text-[var(--accent-purple)] transition-colors'}`} />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${exportType === 'filtered' ? 'border-[var(--accent-purple)] bg-[var(--accent-purple)]' : 'border-gray-400 dark:border-gray-600'}`}>
                                            {exportType === 'filtered' && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                    </div>
                                    <span className={`font-black text-sm ${exportType === 'filtered' ? 'text-[var(--accent-purple)]' : 'theme-text-main'}`}>Rango Específico</span>
                                    <span className="text-[10px] font-medium theme-text-muted mt-1">Filtra por Año o Mes exacto.</span>
                                </button>
                            </div>

                            {exportType === 'filtered' && (
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t theme-border border-dashed fade-in">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Año a Exportar</label>
                                        <select value={exportYear} onChange={(e) => setExportYear(e.target.value)} className={inputStyles}>
                                            <option value="" disabled>Selecciona año</option>
                                            {availableYears.map((y: any) => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold theme-text-muted uppercase tracking-wider">Mes (Opcional)</label>
                                        <select value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className={inputStyles} disabled={!exportYear}>
                                            <option value="">Todo el Año</option>
                                            {availableMonths.map((m: any) => <option key={m} value={m}>{getMonthName(m)}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative focus-within:scale-[1.02] transition-transform duration-300">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 bg-[var(--accent-purple)]/10 rounded-md">
                                <Key className="w-4 h-4 text-[var(--accent-purple)]" />
                            </div>
                            <input 
                                type={showExportPassword ? "text" : "password"} 
                                placeholder="Establece una contraseña segura..." 
                                value={exportPassword} 
                                onChange={(e) => setExportPassword(e.target.value)} 
                                className="w-full pl-14 pr-12 py-4 rounded-2xl theme-bg-low border-2 border-transparent theme-text-main outline-none focus:border-[var(--accent-purple)]/50 focus:bg-[var(--surface)] text-sm font-bold shadow-inner transition-all" 
                            />
                            <button
                                type="button"
                                onClick={() => setShowExportPassword(!showExportPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[var(--accent-purple)] transition-colors rounded-lg"
                                title={showExportPassword ? "Ocultar clave" : "Mostrar clave"}
                            >
                                {showExportPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        
                        <button 
                            type="button"
                            onClick={handleExportAll} 
                            disabled={!exportPassword || exportPassword.length < 6 || (exportType === 'filtered' && !exportYear) || IS_MOCK} 
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[var(--accent-purple)] text-white font-bold text-sm rounded-2xl hover:bg-[var(--accent-purple)]/80 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Lock className="w-4 h-4" /> Encriptar y Descargar JSON
                        </button>
                        
                        {!exportPassword && (
                            <p className="text-xs font-bold text-amber-500 flex items-center gap-1.5 opacity-80">
                                <AlertCircle className="w-3.5 h-3.5" /> Requiere mínimo 6 caracteres para habilitar descarga.
                            </p>
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: IMPORTACIÓN */}
                <div className="space-y-8">
                    <div>
                        <h3 className="text-2xl font-black theme-text-main flex items-center gap-3 mb-3">
                            <UploadCloud className="w-7 h-7 text-emerald-500" /> Inyectar Copia
                        </h3>
                        <p className="text-sm theme-text-muted leading-relaxed">
                            Proporciona un archivo de respaldo oficial y su contraseña de descifrado. El sistema filtrará duplicados e inyectará únicamente los registros faltantes.
                        </p>
                    </div>

                    {!encryptedFileContent ? (
                        <div className="relative group cursor-pointer">
                            <input 
                                type="file" 
                                accept=".json" 
                                onChange={handleFileChange} 
                                disabled={uploading || IS_MOCK} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" 
                            />
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 group-hover:border-emerald-500/50 bg-black/5 dark:bg-white/5 group-hover:bg-emerald-500/5 rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300">
                                <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <FileJson className="w-8 h-8 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                                </div>
                                <p className="text-sm font-bold theme-text-main">Arrastra o haz clic para subir</p>
                                <p className="text-xs theme-text-muted mt-1">Solo archivos .json cifrados (ENGIE Management)</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 fade-in">
                            <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                <div className="p-2 bg-emerald-500 rounded-full"><Lock className="w-4 h-4 text-white"/></div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Archivo Protegido Detectado</p>
                                    <p className="text-xs theme-text-muted">Desbloquea el paquete para continuar.</p>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <input 
                                    type={showImportPassword ? "text" : "password"} 
                                    placeholder="Ingresa la contraseña de descifrado..." 
                                    value={importPassword} 
                                    onChange={(e) => setImportPassword(e.target.value)} 
                                    className="w-full pl-4 pr-32 py-4 rounded-2xl bg-white dark:bg-[var(--surface)] border-2 border-gray-200 dark:border-gray-800 theme-text-main outline-none focus:border-emerald-500/50 text-sm font-bold shadow-sm transition-all" 
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowImportPassword(!showImportPassword)}
                                        className="p-2 text-gray-400 hover:text-emerald-500 transition-colors rounded-lg"
                                    >
                                        {showImportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleDecrypt} 
                                        disabled={!importPassword}
                                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors text-sm disabled:opacity-50"
                                    >
                                        Abrir
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* CONFIRMACIÓN DE RESTAURACIÓN */}
            {backupInfo && (
                <div className="px-4 sm:px-8 fade-in">
                    <div className="border-t theme-border pt-12">
                        <div className="max-w-2xl mx-auto p-8 bg-[var(--background)] border-[3px] border-emerald-500/30 rounded-3xl shadow-xl space-y-6">
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h4 className="font-black theme-text-main text-2xl">Respaldo Verificado</h4>
                                <p className="text-sm theme-text-muted flex justify-center items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Filtro aplicado: <strong className="theme-text-main uppercase tracking-widest">{backupInfo.temporalFilter || 'HISTORIAL COMPLETO'}</strong>
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 py-6 border-y theme-border text-center">
                                <div><span className="block text-3xl font-black theme-text-main">{backupInfo.modules?.rrss?.length || 0}</span><span className="text-xs uppercase font-bold text-[var(--warning)] tracking-wider">Incidencias</span></div>
                                <div><span className="block text-3xl font-black theme-text-main">{backupInfo.modules?.comentarios?.length || 0}</span><span className="text-xs uppercase font-bold text-[var(--primary)] tracking-wider">Menciones</span></div>
                            </div>
                            
                            <div className="space-y-4">
                                <p className="text-xs theme-text-muted flex items-center justify-center gap-1.5 text-center">
                                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" /> Algoritmo de inyección activado. El sistema ignorará los registros que ya existen.
                                </p>
                                <button 
                                    type="button"
                                    onClick={handleExecuteRestore} 
                                    disabled={uploading} 
                                    className="w-full py-4 bg-emerald-600 text-white font-black text-base rounded-2xl hover:bg-emerald-500 shadow-lg transition-all disabled:opacity-50"
                                >
                                    {uploading ? "Inyectando estructura a la nube..." : "Autorizar Inyección de Datos"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};