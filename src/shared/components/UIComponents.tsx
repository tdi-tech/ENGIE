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

export const ActionBtn = ({ onClick, icon, title, desc, bgIcon }: any) => (
    <button type="button" onClick={onClick} className={`p-5 rounded-2xl theme-border border theme-bg-container hover:border-[var(--primary)] transition-all text-left shadow-sm group hover:-translate-y-1`}>
        <div className={`w-10 h-10 rounded-lg ${bgIcon} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>{icon}</div>
        <div className="font-bold theme-text-main text-lg mb-1 leading-tight">{title}</div>
        <div className="text-sm theme-text-muted">{desc}</div>
    </button>
);

export const FilterBtn = ({ active, onClick, label, color }: any) => {
    // 🚨 FIX REACT DOCTOR: Extraído al alcance local en formato constante
    const colors: Record<string, string> = { 
        slate: active ? 'theme-bg-high theme-text-main' : 'theme-bg-low theme-text-muted hover:theme-text-main',
        yellow: active ? 'bg-[var(--warning)]/20 text-[var(--warning)]' : 'bg-[var(--warning)]/5 text-[var(--warning)] hover:bg-[var(--warning)]/10',
        emerald: active ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--success)]/5 text-[var(--success)] hover:bg-[var(--success)]/10'
    };
    return <button type="button" onClick={onClick} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors border border-transparent shadow-sm ${colors[color]}`}>{label}</button>;
};

export const InfoBox = ({ label, value, block = false, font = '' }: any) => (
    <div className={`theme-bg-low theme-border border p-4 rounded-xl ${block ? 'w-full' : ''}`}>
        <p className="text-[10px] theme-text-muted uppercase font-bold tracking-wider mb-1">{label}</p>
        <p className={`theme-text-main text-sm sm:text-base font-medium break-words ${font}`}>{value}</p>
    </div>
);

// 🚨 FIX REACT DOCTOR: Módulos fuera del alcance del render
const ROLE_BORDERS: Record<string, string> = { primary: 'border-[var(--primary)]', purple: 'border-purple-500', warning: 'border-[var(--warning)]', success: 'border-[var(--success)]' };
const ROLE_TEXTS: Record<string, string> = { primary: 'text-[var(--primary)]', purple: 'text-purple-500', warning: 'text-[var(--warning)]', success: 'text-[var(--success)]' };

export const RoleCard = ({ title, desc, icon, color, list }: any) => {
    return (
        <div className={`theme-bg-container theme-border border rounded-2xl p-6 shadow-sm`}>
            <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl theme-bg-low border border-transparent border-b-4 ${ROLE_BORDERS[color]}`}>{icon}</div>
                <div>
                    <h3 className="text-lg font-bold theme-text-main">{title}</h3>
                    <p className={`text-xs font-bold uppercase tracking-wider ${ROLE_TEXTS[color]}`}>{desc}</p>
                </div>
            </div>
            <ul className="space-y-3 text-sm theme-text-muted">
                {list.map((item: string, i: number) => <li key={`rc-${i}-${item.substring(0,5)}`} className="flex gap-3"><span className={`font-bold ${ROLE_TEXTS[color]}`}>•</span> {item}</li>)}
            </ul>
        </div>
    );
};

export const GlossaryCard = ({ title, desc }: any) => (
    <div className="theme-bg-container theme-border border p-5 rounded-xl shadow-sm hover:border-[var(--primary)] transition-colors">
        <h4 className="font-bold text-[var(--primary)] text-lg mb-1">{title}</h4>
        <p className="text-sm theme-text-muted">{desc}</p>
    </div>
);