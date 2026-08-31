import React from 'react';
import { Users, AlertTriangle, X, Megaphone, MessageSquare, ChevronRight, ShieldAlert, Lock } from 'lucide-react';
import type { PreviewModalState } from '../types/models';

export const LoginModal = ({ 
    isOpen, 
    onClose, 
    onGoogleLogin,
    remainingAttempts = 5 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    onGoogleLogin: () => void,
    remainingAttempts?: number 
}) => {
    if (!isOpen) return null;

    const isWarning = remainingAttempts < 5;
    const isCritical = remainingAttempts <= 2;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative theme-bg-container theme-border border p-8 rounded-2xl w-full max-w-sm shadow-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="theme-text-main font-bold text-xl mb-2">Acceso Corporativo</h3>
                <p className="text-sm theme-text-muted mb-6">Inicia sesión con tu cuenta de Workspace de Tierra de Ideas.</p>
                
                <button 
                    type="button" 
                    onClick={onGoogleLogin} 
                    className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-bold text-sm shadow-sm transition-transform hover:-translate-y-0.5 mb-4"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path fill="none" d="M1 1h22v22H1z" /></svg>
                    Continuar con Google
                </button>

                <div className={`mt-2 mb-4 p-2.5 rounded-xl border text-xs flex items-center justify-center gap-2 transition-colors ${
                    isCritical ? 'bg-red-500/10 border-red-500/30 text-red-500 font-bold animate-pulse' :
                    isWarning ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-semibold' :
                    'bg-black/5 dark:bg-white/5 border-transparent theme-text-muted'
                }`}>
                    {isWarning ? <ShieldAlert className="w-4 h-4 flex-shrink-0" /> : <Lock className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span>
                        {remainingAttempts === 5 
                            ? 'Seguridad Firewall: Máximo 5 intentos permitidos' 
                            : `🚨 Advertencia: Quedan ${remainingAttempts} intento(s) antes del bloqueo`}
                    </span>
                </div>

                <button type="button" onClick={onClose} className="text-sm font-medium theme-text-muted hover:theme-text-main">
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export const ConfirmModal = ({ isOpen, title, msg, onConfirm, onClose }: any) => {
    if (!isOpen) return null;

    const displayTitle = typeof title === 'object' ? (title.title || "Confirmar acción") : (title || "Confirmar acción");
    const displayMsg = typeof msg === 'object' ? (msg.msg || msg.message || "") : (typeof title === 'object' ? (title.msg || title.message || "") : (msg || ""));
    const handleConfirm = typeof onConfirm === 'function' ? onConfirm : (typeof title === 'object' && typeof title.onConfirm === 'function' ? title.onConfirm : () => {});

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative theme-bg-container theme-border border p-8 rounded-2xl w-full max-w-sm shadow-2xl text-center fade-in">
                <div className="w-16 h-16 rounded-full bg-[var(--error)]/10 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8 text-[var(--error)]"/></div>
                <h3 className="theme-text-main font-bold text-xl mb-2">{displayTitle}</h3>
                <p className="text-sm theme-text-muted mb-8">{displayMsg}</p>
                <div className="flex justify-center gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg theme-text-muted hover:theme-text-main theme-bg-low font-medium text-sm transition-colors">Cancelar</button>
                    <button type="button" onClick={() => { handleConfirm(); if (onClose) onClose(); }} className="px-6 py-2.5 bg-[var(--error)] hover:brightness-110 text-white rounded-lg font-bold text-sm shadow-sm transition-transform hover:-translate-y-0.5">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

export const PreviewModal = ({ state, onClose, onNavigate }: { state: PreviewModalState, onClose: () => void, onNavigate: (path: string) => void }) => {
    if (!state.isOpen || !state.data) return null;
    const { type, data } = state;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 fade-in">
            <div className="theme-bg-container rounded-2xl w-full max-w-md shadow-2xl border theme-border flex flex-col">
                <div className={`p-4 border-b theme-border flex justify-between items-center ${type === 'rrss' ? 'bg-orange-500/5' : 'bg-blue-500/5'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${type === 'rrss' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-500'}`}>
                            {type === 'rrss' ? <Megaphone className="w-5 h-5"/> : <MessageSquare className="w-5 h-5"/>}
                        </div>
                        <div><h3 className="font-bold theme-text-main">Vista Rápida</h3><p className="text-[10px] theme-text-muted font-medium uppercase tracking-wider">{type === 'rrss' ? 'Crisis RRSS' : 'Comentarios'}</p></div>
                    </div>
                    <button onClick={onClose} className="p-1.5 theme-text-muted hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-5 space-y-4">
                    {type === 'rrss' ? (
                        <>
                            <div className="flex justify-between items-start">
                                <div><p className="text-xs theme-text-muted font-bold mb-1">Medio Afectado</p><p className="text-lg font-bold theme-text-main text-orange-500">{data.medio}</p></div>
                                <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${data.estado === 'Resuelto' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>{data.estado}</span>
                            </div>
                            <div className="p-3 theme-bg-low rounded-xl border theme-border"><p className="text-sm theme-text-main font-medium"><span className="font-bold">{data.usuario}:</span> {data.descripcion}</p></div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-xs theme-text-muted block mb-0.5">Riesgo</span><span className="font-bold theme-text-main">{data.riesgo}</span></div>
                                <div><span className="text-xs theme-text-muted block mb-0.5">Campus</span><span className="font-bold theme-text-main">{data.campus}</span></div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between items-start">
                                <div><p className="text-xs theme-text-muted font-bold mb-1">Periodo del Reporte</p><p className="text-base font-bold theme-text-main text-blue-500">{data.fechaInicio} <span className="text-sm font-medium theme-text-muted">al</span> {data.fechaFin}</p></div>
                                <span className="px-2 py-1 text-[10px] font-bold rounded-md uppercase bg-blue-500/10 text-blue-500">{data.contenido}</span>
                            </div>
                            <div className="p-3 theme-bg-low rounded-xl border theme-border"><p className="text-sm theme-text-main font-medium">Contiene <span className="font-bold text-blue-500">{data.comentariosList?.length || 1}</span> comentario(s) registrado(s).</p></div>
                        </>
                    )}
                </div>
                <div className="p-4 border-t theme-border flex gap-3">
                    <button onClick={() => { onClose(); onNavigate(type === 'rrss' ? 'historial-rss' : 'historial-comentario'); }} className={`w-full py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 ${type === 'rrss' ? 'bg-orange-600' : 'bg-blue-600'}`}>Ver historial completo <ChevronRight className="w-4 h-4"/></button>
                </div>
            </div>
        </div>
    );
};