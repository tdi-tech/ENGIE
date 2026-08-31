import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface InactivityProps {
    onLogout: () => void;
}

export const Inactivity = ({ onLogout }: InactivityProps) => {
    const [showModal, setShowModal] = useState(false);
    const [countdown, setCountdown] = useState(300);

    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    // 🔥 NUEVO: Candado de seguridad para evitar conflictos con el mouse en el último segundo
    const isLoggingOutRef = useRef(false);

    const INACTIVITY_LIMIT = 60 * 1000;

    useEffect(() => {
        if (!onLogout) return;

        const handleActivity = () => {
            // Si el cronómetro ya llegó a 0 y se está cerrando sesión, ignoramos el movimiento del mouse
            if (isLoggingOutRef.current) return;

            setShowModal(false);
            setCountdown(300);

            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

            idleTimerRef.current = setTimeout(() => {
                setShowModal(true);
            }, INACTIVITY_LIMIT);
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, handleActivity));

        // Iniciamos el timer por primera vez
        idleTimerRef.current = setTimeout(() => {
            setShowModal(true);
        }, INACTIVITY_LIMIT);

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        };
    }, [onLogout]);

    // 🔥 FIX 1: Cronómetro puro (Solo se encarga de restar números de forma segura)
    useEffect(() => {
        if (showModal) {
            countdownTimerRef.current = setInterval(() => {
                setCountdown((prev) => prev > 0 ? prev - 1 : 0);
            }, 1000);
        }
        return () => {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        };
    }, [showModal]);

    // 🔥 FIX 2: El "Francotirador" (Vigila el contador y dispara el logout instantáneamente)
    useEffect(() => {
        if (showModal && countdown === 0 && !isLoggingOutRef.current) {
            isLoggingOutRef.current = true; // Bloqueamos interacciones del usuario
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            onLogout(); // Disparo exacto al llegar a 0 sin congelarse
        }
    }, [countdown, showModal, onLogout]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 fade-in no-print">
            <div className="theme-bg-container border theme-border rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scale">
                <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                    <h3 className="text-lg font-bold theme-text-main">¿Sigues ahí?</h3>
                    <p className="text-xs theme-text-muted mt-1 leading-relaxed">
                        Detectamos inactividad en la plataforma. Tu sesión se cerrará de forma automática en:
                    </p>
                </div>
                <div className="text-3xl font-mono font-bold text-[var(--primary)] bg-black/5 dark:bg-white/5 py-2 px-5 rounded-xl inline-block shadow-inner tracking-wider">
                    {formatTime(countdown)}
                </div>
                <p className="text-[11px] text-amber-500 font-semibold uppercase tracking-wider animate-pulse">
                    Mueve el mouse o interactúa para continuar
                </p>
            </div>
        </div>
    );
};