import React from 'react';

// 🚨 FIX REACT DOCTOR: Sacado al módulo para evitar que se reconstruya en cada render
const BORDERS: Record<string, string> = { primary: 'border-[var(--primary)]', blue: 'border-blue-500', yellow: 'border-[var(--warning)]', emerald: 'border-[var(--success)]', red: 'border-[var(--error)]', orange: 'border-orange-500' };

export const NavBtn = ({ id, current, icon: Icon, label, onClick }: any) => (
    <button type="button" onClick={() => onClick(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${current === id ? 'bg-[var(--surface-high)] theme-text-main shadow-sm' : 'theme-text-muted hover:theme-bg-low hover:theme-text-main'}`}>
        <Icon className={`w-5 h-5 ${current === id ? 'text-[var(--primary)]' : ''}`} /> {label}
    </button>
);

export const StatCard = ({ title, value, color, icon }: any) => {
    return (
        <div className={`theme-bg-container theme-border border p-6 rounded-xl border-l-4 ${BORDERS[color]} shadow-sm relative overflow-hidden group hover:border-[var(--primary)] transition-colors`}>
            <p className="theme-text-muted text-sm font-bold tracking-wide">{title}</p>
            <p className="text-4xl font-extrabold theme-text-main mt-3">{value}</p>
            {icon}
        </div>
    );
};