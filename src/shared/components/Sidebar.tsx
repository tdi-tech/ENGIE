import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, ShieldAlert, FileText, ListChecks, Users, BookOpen,
    AlertTriangle, Settings, HelpCircle, Smartphone, MessageSquareWarning,
    ChevronDown, ChevronRight, History, Cloud, CloudOff, Database, Ticket, BarChart3
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId, auth, IS_MOCK } from '../../services/firebase/config';

const NavBtn = ({ id, icon: Icon, label, currentView, navigate }: any) => (
    <button
        onClick={() => navigate(id)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${currentView === id
            ? 'bg-[var(--primary)] text-white shadow-sm'
            : 'theme-text-muted hover:theme-bg-low hover:theme-text-main'
            }`}
    >
        <Icon className="w-5 h-5" />
        {label}
    </button>
);

const SubNavBtn = ({ id, icon: Icon, label, currentView, navigate, requireAdmin, isAdmin, badgeCount }: any) => {
    if (requireAdmin && !isAdmin) return null;

    return (
        <button
            onClick={() => navigate(id)}
            className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-all pl-8 ${currentView === id
                ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-bold'
                : 'theme-text-muted hover:theme-bg-low hover:theme-text-main'
                }`}
        >
            <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 opacity-70" />
                <span>{label}</span>
            </div>
            {badgeCount > 0 && (
                <span className="relative flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-purple-600 text-white text-[10px] font-black items-center justify-center shadow-md">
                        {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                </span>
            )}
        </button>
    );
};

const DropdownGroup = ({ id, icon: Icon, label, children, openGroup, toggleGroup, currentView, badgeCount }: any) => {
    const isOpen = openGroup === id;
    let isActive = false;
    React.Children.forEach(children, (child: any) => {
        if (child && child.props && child.props.id === currentView) {
            isActive = true;
        }
    });

    return (
        <div className="space-y-1">
            <button
                onClick={() => toggleGroup(id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive && !isOpen ? 'text-[var(--primary)] font-bold bg-[var(--primary)]/5' : 'theme-text-muted hover:theme-bg-low hover:theme-text-main'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--primary)]' : ''}`} />
                    <span className={isActive ? 'text-[var(--primary)]' : ''}>{label}</span>
                </div>
                <div className="flex items-center gap-2">
                    {badgeCount > 0 && !isOpen && (
                        <span className="relative flex h-5 w-5 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-purple-600 text-white text-[10px] font-black items-center justify-center shadow-md">
                                {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                        </span>
                    )}
                    {isOpen ? <ChevronDown className="w-4 h-4 opacity-50 transition-transform" /> : <ChevronRight className="w-4 h-4 opacity-50 transition-transform" />}
                </div>
            </button>

            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="pt-1 pb-2 space-y-1">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Sidebar = ({ sidebarOpen, setSidebarOpen, currentView, navigate, isAdmin, cloudStatus, userRole, user }: any) => {

    const isDisconnected = cloudStatus.includes('Desconectado');
    const isError = cloudStatus.includes('Error');
    const isConnecting = cloudStatus.includes('Conectando');

    const dotColor = isConnecting ? 'bg-[var(--warning)] animate-pulse' : isError ? 'bg-[var(--error)]' : isDisconnected ? 'bg-slate-400' : 'bg-[var(--success)]';
    const textColor = isError ? 'text-[var(--error)]' : isConnecting ? 'text-[var(--warning)]' : isDisconnected ? 'theme-text-muted' : 'text-[var(--success)]';

    // 🔥 FIX: Ahora el menú "Comentarios" se abre por defecto al cargar
    const [openGroup, setOpenGroup] = useState<string>(() => {
        const view = currentView || localStorage.getItem('innova_current_view') || '';
        if (['nuevo-comentario', 'historial-comentario', 'reportes'].includes(view)) return 'comentarios';
        if (['protocolo', 'nuevo', 'checklist', 'historial', 'glosario'].includes(view)) return 'hackeos';
        if (['protocolo-rss', 'nuevo-rss', 'historial-rss'].includes(view)) return 'rss';
        if (['solicitud-tickets', 'gestion-tickets'].includes(view)) return 'tickets';
        return 'comentarios';
    });

    const [newTicketsCount, setNewTicketsCount] = useState(0);

    const isInternalUser = ['ADMIN_IT', 'ADMIN_CM', 'EDITOR_CM', 'EDITOR_CONTENT'].includes(userRole);
    const isEditorContent = userRole === 'EDITOR_CONTENT';
    const isITAdmin = userRole === 'ADMIN_IT';
    
    // 🔥 FIX: ADMIN_CM ahora también entra a la regla isTrueAdmin para ver Backups
    const isTrueAdmin = ['ADMIN_IT', 'ADMIN_CM'].includes(userRole);

    const canViewReports = ['ADMIN_IT', 'ADMIN_CM', 'EDITOR_CM'].includes(userRole);

    useEffect(() => {
        if (IS_MOCK) {
            setNewTicketsCount(0);
            return;
        }

        if (!isInternalUser) {
            setNewTicketsCount(0);
            return;
        }

        const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), (snap) => {
            let count = 0;
            const currentUser = user || auth.currentUser;

            snap.forEach((doc) => {
                const data = doc.data();
                const isReadByCurrentUser = currentUser && (data.readBy || []).some((id: string) =>
                    (currentUser.uid && id === currentUser.uid) || (currentUser.email && id === currentUser.email)
                );

                if (data.estado === 'Pendiente' && !isReadByCurrentUser) {
                    count++;
                }
            });
            setNewTicketsCount(count);
        });
        return () => unsub();
    }, [isInternalUser, user]);

    const toggleGroup = (group: string) => {
        setOpenGroup(openGroup === group ? '' : group);
    };

    return (
        <>
            {sidebarOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>}

            <aside className={`fixed md:static inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 w-64 flex-shrink-0 theme-bg-lowest border-r theme-border flex flex-col z-40 no-print`}>

                <div className="p-6 flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="w-6 h-6 text-white"
                            fill="currentColor"
                        >
                            <path d="M11.57,1.72s1.99,4.81,2.21,9.54c.35,7.65-1.53,12.6-1.53,12.6.8-.46,4.2-3.37,6.5-7.48,2.3-4.11,2.91-7.91,2.91-7.91C17.43,3.69,11.57,1.72,11.57,1.72Z" />
                            <path d="M11.27,9.05s-3.77-2.39-8.49-1.01c0,0,1.19,9.39,9.47,15.82,0,0,1.49-7.63-.98-14.81Z" />
                            <path d="M10.89,7.9s-1.16-3.76-3.72-7.33c0,0-1.66-.4-4.66-.43,0,0-.36,2.46-.04,5.53,0,0,4.12-1.01,8.41,2.24Z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="font-bold text-base theme-text-main leading-tight">Tierra de ideas</h1>
                        <p className="text-[10px] theme-text-muted font-medium tracking-wide uppercase mt-0.5">Innova Management v3.5.0</p>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
                    <NavBtn id="dashboard" icon={LayoutDashboard} label="Dashboard" currentView={currentView} navigate={navigate} />

                    <div className="my-2 border-t theme-border opacity-50"></div>

                    {/* 🔥 FIX REACOMODO: Comentarios ahora es el primero de la lista */}
                    <DropdownGroup id="comentarios" icon={MessageSquareWarning} label="Comentarios" openGroup={openGroup} toggleGroup={toggleGroup} currentView={currentView}>
                        {!isEditorContent && (
                            <SubNavBtn id="nuevo-comentario" icon={AlertTriangle} label="Crear reporte" requireAdmin={true} isAdmin={isAdmin} currentView={currentView} navigate={navigate} />
                        )}
                        <SubNavBtn id="historial-comentario" icon={FileText} label="Historial" currentView={currentView} navigate={navigate} />
                        {canViewReports && (
                            <SubNavBtn id="reportes" icon={BarChart3} label="Reportes Analíticos" currentView={currentView} navigate={navigate} />
                        )}
                    </DropdownGroup>

                    {!isEditorContent && (
                        <>
                            {/* Hackeos pasa a segundo lugar */}
                            <DropdownGroup id="hackeos" icon={ShieldAlert} label="Hackeos" openGroup={openGroup} toggleGroup={toggleGroup} currentView={currentView}>
                                <SubNavBtn id="protocolo" icon={BookOpen} label="Protocolo" currentView={currentView} navigate={navigate} />
                                <SubNavBtn id="nuevo" icon={AlertTriangle} label="Crear incidente" requireAdmin={true} isAdmin={isAdmin} currentView={currentView} navigate={navigate} />
                                <SubNavBtn id="checklist" icon={ListChecks} label="Checklist Rápido" requireAdmin={true} isAdmin={isAdmin} currentView={currentView} navigate={navigate} />
                                <SubNavBtn id="historial" icon={FileText} label="Historial" currentView={currentView} navigate={navigate} />
                                <SubNavBtn id="glosario" icon={BookOpen} label="Glosario" currentView={currentView} navigate={navigate} />
                            </DropdownGroup>

                            <DropdownGroup id="rss" icon={Smartphone} label="Incidencias RRSS" openGroup={openGroup} toggleGroup={toggleGroup} currentView={currentView}>
                                <SubNavBtn id="protocolo-rss" icon={BookOpen} label="Protocolo" currentView={currentView} navigate={navigate} />
                                <SubNavBtn id="nuevo-rss" icon={AlertTriangle} label="Crear incidente" requireAdmin={true} isAdmin={isAdmin} currentView={currentView} navigate={navigate} />
                                <SubNavBtn id="historial-rss" icon={FileText} label="Historial" currentView={currentView} navigate={navigate} />
                            </DropdownGroup>
                        </>
                    )}

                    <DropdownGroup id="tickets" icon={Ticket} label="Emergentes" openGroup={openGroup} toggleGroup={toggleGroup} currentView={currentView} badgeCount={newTicketsCount}>
                        {!isInternalUser && <SubNavBtn id="solicitud-tickets" icon={AlertTriangle} label="Solicitar Ticket" currentView={currentView} navigate={navigate} />}
                        {isInternalUser && <SubNavBtn id="gestion-tickets" icon={FileText} label="Gestionar Tickets" currentView={currentView} navigate={navigate} badgeCount={newTicketsCount} />}
                    </DropdownGroup>

                    <div className="my-2 border-t theme-border opacity-50"></div>

                    <NavBtn id="roles" icon={Users} label="Roles" currentView={currentView} navigate={navigate} />

                    {isAdmin && !isEditorContent && <NavBtn id="changelog" icon={History} label="Changelog" currentView={currentView} navigate={navigate} />}

                    {/* 🔥 FIX PERMISOS: ADMIN_CM ya puede ver Backups Core */}
                    {isTrueAdmin && (
                        <NavBtn id="backups" icon={Database} label="Backups Core" currentView={currentView} navigate={navigate} />
                    )}
                    {isITAdmin && (
                        <NavBtn id="auditoria" icon={ShieldAlert} label="Auditoría Avanzada" currentView={currentView} navigate={navigate} />
                    )}
                </nav>

                <div className="p-4 border-t theme-border space-y-2">
                    <div className="theme-bg-low rounded-xl p-4 theme-border border shadow-sm flex flex-col justify-center">
                        <p className="text-xs font-bold theme-text-main mb-2">Estado del Sistema</p>
                        <div className="flex items-start gap-2">
                            <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0 mt-0.5">
                                {cloudStatus.includes('Conectado') && !cloudStatus.includes('Desconectado') ? <Cloud className={`w-4 h-4 ${textColor}`} /> : <CloudOff className={`w-4 h-4 ${textColor}`} />}
                                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-gray-900 ${dotColor}`}></span>
                            </div>
                            <span className={`text-xs font-medium leading-tight mt-0.5 ${textColor}`}>{cloudStatus}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-2 pt-2">
                        <button
                            onClick={() => navigate('config')}
                            className={`flex items-center justify-center gap-2 text-xs py-2 flex-1 transition-colors ${currentView === 'config' ? 'theme-text-main font-bold' : 'theme-text-muted hover:theme-text-main'}`}
                        >
                            <Settings className="w-4 h-4" /> Configuración
                        </button>

                        <button
                            onClick={() => navigate('ayuda')}
                            className={`flex items-center justify-center gap-2 text-xs py-2 flex-1 transition-colors ${currentView === 'ayuda' ? 'theme-text-main font-bold' : 'theme-text-muted hover:theme-text-main'}`}
                        >
                            <HelpCircle className="w-4 h-4" /> Ayuda
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};