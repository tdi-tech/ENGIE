import React from 'react';
import { Menu, Sun, Moon, LogOut, Bell, Trash2, Eye, Users, CheckCircle2, Lock } from 'lucide-react';
import { Sidebar } from '../Sidebar';
import { Inactivity } from '../Inactivity';

export const MainLayout = ({
    children, isDarkMode, toggleTheme, currentView, navigate, 
    sidebarOpen, setSidebarOpen, profileMenuOpen, setProfileMenuOpen,
    notifMenuOpen, setNotifMenuOpen, notifTab, setNotifTab,
    user, isAdmin, userRole, cloudStatus, displayRoleName,
    unreadNotifications, readNotifications, validNotifications,
    markAsRead, hideNotification, handleViewIncident,
    openLoginModal, logoutAdmin
}: any) => {

    const renderHeaderTitle = () => {
        const baseClass = "text-sm sm:text-xl font-bold flex items-center gap-1.5 sm:gap-2.5 tracking-tight select-none truncate max-w-[160px] sm:max-w-none";
        const parentClass = "hidden sm:inline theme-text-muted opacity-80 font-semibold";
        const separatorClass = "hidden sm:inline text-gray-600 font-light text-lg";
        const childClass = "theme-text-main font-bold truncate";

        switch (currentView) {
            case 'dashboard': return <h1 className="text-base sm:text-xl font-bold theme-text-main tracking-tight">Dashboard</h1>;
            case 'gestion-usuarios': return <h1 className="text-base sm:text-xl font-bold theme-text-main tracking-tight">Gestión de Usuarios</h1>;
            case 'protocolo': return <div className={baseClass}><span className={parentClass}>Hackeos</span><span className={separatorClass}>/</span><span className={childClass}>Protocolo</span></div>;
            case 'nuevo': return <div className={baseClass}><span className={parentClass}>Hackeos</span><span className={separatorClass}>/</span><span className={childClass}>Crear incidente</span></div>;
            case 'checklist': return <div className={baseClass}><span className={parentClass}>Hackeos</span><span className={separatorClass}>/</span><span className={childClass}>Checklist Rápido</span></div>;
            case 'historial': return <div className={baseClass}><span className={parentClass}>Hackeos</span><span className={separatorClass}>/</span><span className={childClass}>Historial</span></div>;
            case 'glosario': return <div className={baseClass}><span className={parentClass}>Hackeos</span><span className={separatorClass}>/</span><span className={childClass}>Glosario</span></div>;
            case 'protocolo-rss': return <div className={baseClass}><span className={parentClass}>Incidencias RRSS</span><span className={separatorClass}>/</span><span className={childClass}>Protocolo</span></div>;
            case 'nuevo-rss': return <div className={baseClass}><span className={parentClass}>Incidencias RRSS</span><span className={separatorClass}>/</span><span className={childClass}>Crear incidente</span></div>;
            case 'historial-rss': return <div className={baseClass}><span className={parentClass}>Incidencias RRSS</span><span className={separatorClass}>/</span><span className={childClass}>Historial</span></div>;
            case 'nuevo-comentario': return <div className={baseClass}><span className={parentClass}>Comentarios</span><span className={separatorClass}>/</span><span className={childClass}>Capturar comentarios</span></div>;
            case 'historial-comentario': return <div className={baseClass}><span className={parentClass}>Comentarios</span><span className={separatorClass}>/</span><span className={childClass}>Historial</span></div>;
            case 'roles': return <h1 className="text-base sm:text-xl font-bold theme-text-main tracking-tight">Roles</h1>;
            case 'changelog': return <h1 className="text-base sm:text-xl font-bold theme-text-main tracking-tight">Changelog</h1>;
            case 'backups': return <h1 className="text-base sm:text-xl font-bold theme-text-main tracking-tight">Copias de Seguridad Core</h1>;
            case 'auditoria': return <h1 className="text-base sm:text-xl font-bold theme-text-main tracking-tight">Auditoría Avanzada</h1>;
            case 'config': return <h1 className="text-base sm:text-xl font-bold theme-text-main tracking-tight">Configuración</h1>;
            case 'ayuda': return <h1 className="text-base sm:text-xl font-bold theme-text-main tracking-tight">Ayuda</h1>;
            default: return <h1 className="text-base sm:text-xl font-bold theme-text-main tracking-tight capitalize truncate">{currentView.replace(/-/g, ' ')}</h1>;
        }
    };

    // 🔥 Agregamos el rol a una constante para limpiar el código de abajo
    const isInternalUser = isAdmin || userRole === 'EDITOR_CONTENT';

    return (
        <div className={`h-screen print:h-auto flex relative font-sans transition-colors duration-300 ${isAdmin ? 'is-admin' : ''}`}>
            {((user && user.email) || isAdmin) && <Inactivity onLogout={logoutAdmin} />}

            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentView={currentView} navigate={navigate} isAdmin={isAdmin} cloudStatus={cloudStatus} userRole={userRole} user={user} />

            <main className="flex-1 print:block flex flex-col h-full print:h-auto relative overflow-x-hidden print:overflow-visible w-full bg-[var(--surface)]">
                <header className="h-16 border-b theme-border theme-bg-container flex items-center justify-between px-4 sm:px-6 no-print shadow-sm z-50 relative">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 theme-text-muted hover:theme-text-main rounded-lg"><Menu className="w-6 h-6"/></button>
                        <div className="flex items-center">{renderHeaderTitle()}</div>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-4">
                        {/* 🔥 Usamos isInternalUser para que los Content también vean la campana */}
                        {isInternalUser && (
                            <div className="relative notif-container">
                                <button onClick={() => setNotifMenuOpen(!notifMenuOpen)} className="p-2 theme-text-muted hover:theme-text-main rounded-lg transition-colors relative" title="Notificaciones">
                                    <Bell className="w-5 h-5"/>
                                    {unreadNotifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--surface)] animate-pulse"></span>}
                                </button>
                                {notifMenuOpen && (
                                    <div className="fixed sm:absolute left-4 sm:left-auto right-4 sm:right-0 inset-x-4 sm:inset-x-auto mt-3 w-auto sm:w-80 theme-bg-container border theme-border rounded-xl shadow-2xl z-50 fade-in flex flex-col max-h-[500px] sm:max-h-[450px]">
                                        <div className="p-4 border-b theme-border flex items-center justify-between bg-[var(--primary)]/5">
                                            <h3 className="font-bold theme-text-main">Actividad Reciente</h3>
                                            <span className="text-xs font-bold theme-text-muted bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg">{validNotifications.length}</span>
                                        </div>
                                        <div className="flex items-center border-b theme-border bg-[var(--surface)]">
                                            <button onClick={(e) => { e.stopPropagation(); setNotifTab('unread'); }} className={`flex-1 py-2 text-xs font-bold text-center transition-colors ${notifTab === 'unread' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'theme-text-muted hover:theme-text-main'}`}>Nuevas ({unreadNotifications.length})</button>
                                            <button onClick={(e) => { e.stopPropagation(); setNotifTab('read'); }} className={`flex-1 py-2 text-xs font-bold text-center transition-colors ${notifTab === 'read' ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'theme-text-muted hover:theme-text-main'}`}>Leídas ({readNotifications.length})</button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                            {notifTab === 'unread' && unreadNotifications.length === 0 && <p className="text-center text-xs theme-text-muted py-8">No hay notificaciones nuevas.</p>}
                                            {notifTab === 'read' && readNotifications.length === 0 && <p className="text-center text-xs theme-text-muted py-8">No tienes notificaciones leídas.</p>}
                                            {(notifTab === 'unread' ? unreadNotifications : readNotifications).map((n: any) => (
                                                <div key={n.id} className="p-3 theme-bg-low rounded-xl border theme-border mb-2 flex flex-col relative group shadow-sm">
                                                    <div className="flex items-start gap-3">
                                                        {n.userPhoto ? (
                                                            <img src={n.userPhoto} alt="User" className="w-8 h-8 rounded-full flex-shrink-0 border theme-border" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{n.userName?.charAt(0) || 'A'}</div>
                                                        )}
                                                        <div className="flex-1 min-w-0 pr-6">
                                                            <p className="text-xs font-bold theme-text-main truncate">{n.userName}</p>
                                                            <p className="text-xs theme-text-muted mt-0.5 leading-relaxed">{n.action}</p>
                                                            <div className="flex items-center gap-2 mt-1.5"><span className="text-[9px] font-bold uppercase tracking-wider text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded">{n.module}</span><span className="text-[9px] font-medium theme-text-muted">{new Date(n.timestamp).toLocaleDateString()}</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex items-center gap-2 pl-11">
                                                        {notifTab === 'unread' && <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }} className="text-[10px] font-bold bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-1.5 rounded-lg hover:bg-[var(--primary)]/20 transition-colors flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Marcar leído</button>}
                                                        {(n.type === 'create' || n.type === 'edit') && n.incidentId && <button onClick={(e) => { e.stopPropagation(); handleViewIncident(n); }} className="text-[10px] font-bold bg-slate-500/10 theme-text-main px-2 py-1.5 rounded-lg hover:bg-slate-500/20 transition-colors flex items-center gap-1"><Eye className="w-3 h-3"/> Ver Incidente</button>}
                                                    </div>
                                                    {notifTab === 'read' && <button onClick={(e) => { e.stopPropagation(); hideNotification(n.id); }} className="absolute top-3 right-3 p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <button onClick={toggleTheme} className="p-1 sm:p-2 theme-text-muted hover:theme-text-main rounded-lg transition-colors" title="Cambiar Tema">
                            {isDarkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
                        </button>
                        
                        {/* 🔥 Usamos isInternalUser para mostrar el perfil */}
                        {isInternalUser ? (
                            <div className="flex items-center gap-1.5 sm:gap-3 pl-1 relative profile-container">
                                <div className="text-right hidden sm:block"><p className="text-sm font-bold theme-text-main leading-none">{user?.displayName}</p><p className="text-[10px] theme-text-muted uppercase font-bold mt-1 tracking-wider">{displayRoleName}</p></div>
                                <div className="relative">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="Perfil" referrerPolicy="no-referrer" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-[2px] sm:border-[3px] border-[var(--primary)] shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => setProfileMenuOpen(!profileMenuOpen)} />
                                    ) : (
                                        <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[var(--primary)] hover:brightness-110 flex items-center justify-center text-white font-bold text-xs sm:text-sm cursor-pointer hover:scale-105 transition-transform">{user?.displayName?.charAt(0) || 'A'}</button>
                                    )}
                                    {profileMenuOpen && (
                                        <div className="absolute right-0 mt-3 w-52 sm:w-56 theme-bg-container border theme-border rounded-xl shadow-2xl py-2 z-50 fade-in">
                                            <div className="px-4 py-3 border-b theme-border sm:hidden"><p className="text-sm font-bold theme-text-main truncate">{user?.displayName}</p><p className="text-xs theme-text-muted mt-0.5">{displayRoleName}</p></div>
                                            {(userRole === 'ADMIN_IT' || userRole === 'ADMIN_CM') && (
                                                <><button onClick={() => { navigate('gestion-usuarios'); setProfileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium theme-text-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3"><Users className="w-4 h-4 text-blue-500" /> Gestionar Usuarios</button><div className="border-t theme-border my-1"></div></>
                                            )}
                                            <button onClick={logoutAdmin} className="w-full text-left px-4 py-3 text-sm font-medium text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors flex items-center gap-3"><LogOut className="w-4 h-4" /> Cerrar Sesión</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button onClick={openLoginModal} className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 bg-[var(--primary)] text-white hover:brightness-110"><Lock className="w-3.5 h-3.5"/><span className="hidden xs:inline sm:inline">Entrar</span></button>
                        )}
                    </div>
                </header>

                <div id="main-content" className="flex-1 print:block overflow-y-auto print:overflow-visible p-4 sm:p-8 print:p-0 w-full">
                    {children}
                </div>
            </main>
            <div id="print-header" className="hidden text-black font-bold text-2xl">Reporte: Innova Management</div>
        </div>
    );
};