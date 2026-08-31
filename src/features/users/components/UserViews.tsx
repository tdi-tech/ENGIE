import React, { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, UserX, UserCheck, Users, Info, Plus, Save, X } from 'lucide-react';
import { ALLOWED_EMAIL_DOMAIN_MAIL } from '../../../services/firebase/config';

export const UserManagementView = ({ appUsers, userRole, updateUserRole, toggleUserStatus, deleteUserRecord, addManualUser }: any) => {

    const [isAdding, setIsAdding] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState('EDITOR_CM');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 600);
        return () => clearTimeout(timer);
    }, [appUsers]);

    const handleAddSubmit = async (e: any) => {
        e.preventDefault();
        await addManualUser(newEmail, newRole);
        setNewEmail('');
        setNewRole('EDITOR_CM');
        setIsAdding(false);
    };

    const sortedUsers = [...appUsers].sort((a, b) => {
        const aIsAdminIT = a.role === 'ADMIN_IT';
        const bIsAdminIT = b.role === 'ADMIN_IT';
        if (aIsAdminIT && !bIsAdminIT) return -1;
        if (!aIsAdminIT && bIsAdminIT) return 1;

        return (a.displayName || '').localeCompare(b.displayName || '');
    });

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 fade-in pb-10 animate-pulse">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="space-y-3">
                        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                        <div className="h-4 w-96 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    </div>
                    {(userRole === 'ADMIN_IT' || userRole === 'ADMIN_CM') && <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>}
                </div>

                <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl mb-6"></div>

                <div className="theme-bg-container border theme-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="h-14 bg-black/5 dark:bg-white/5 border-b theme-border"></div>
                    <div className="divide-y theme-border p-4 space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                        <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                    </div>
                                </div>
                                <div className="h-10 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800"></div>
                                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 fade-in pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold theme-text-main flex items-center gap-2">
                        <Users className="w-6 h-6 text-[var(--primary)]" />
                        Gestión de Usuarios
                    </h2>
                    <p className="theme-text-muted text-sm mt-1">
                        Controla los accesos, asigna roles y deshabilita cuentas del equipo.
                    </p>
                </div>

                {(userRole === 'ADMIN_IT' || userRole === 'ADMIN_CM') && (
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white font-bold text-sm rounded-lg hover:brightness-110 shadow-sm transition-all"
                    >
                        {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isAdding ? 'Cancelar' : 'Pre-registrar Usuario'}
                    </button>
                )}
            </div>

            {isAdding && (userRole === 'ADMIN_IT' || userRole === 'ADMIN_CM') && (
                <div className="p-5 theme-bg-container border theme-border rounded-xl shadow-sm fade-in mb-6">
                    <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                        <div className="w-full sm:flex-1 space-y-1">
                            <label className="text-xs font-bold theme-text-muted">Correo Corporativo</label>
                            <input type="email" required placeholder={'ejemplo@' + ALLOWED_EMAIL_DOMAIN_MAIL} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full p-2.5 rounded-lg theme-bg-low border theme-border theme-text-main outline-none focus:border-[var(--primary)]" />
                        </div>
                        <div className="w-full sm:w-64 space-y-1">
                            <label className="text-xs font-bold theme-text-muted">Asignar Rol</label>
                            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full p-2.5 rounded-lg theme-bg-low border theme-border theme-text-main outline-none focus:border-[var(--primary)]">
                                <option value="EDITOR_CONTENT">Editor Content</option>
                                <option value="EDITOR_CM">Editor CM</option>
                                <option value="ADMIN_CM">Administrador CM</option>
                                <option value="ADMIN_IT">Administrador IT</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full sm:w-auto px-5 py-2.5 mt-2 sm:mt-0 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-500 shadow-sm transition-all flex items-center justify-center gap-2">
                            <Save className="w-4 h-4" /> Guardar
                        </button>
                    </form>
                </div>
            )}

            <div className="p-4 theme-bg-low border theme-border rounded-xl flex items-start gap-3 shadow-sm">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm theme-text-muted leading-relaxed">
                    <strong className="theme-text-main">Sincronización Automática:</strong><br />
                    Si no pre-registras a un usuario, aparecerá en esta lista automáticamente en cuanto inicie sesión por primera vez con su cuenta <strong className="theme-text-main">@{ALLOWED_EMAIL_DOMAIN_MAIL}</strong> y se le asignará el rol de <em>Editor CM</em> por defecto.
                </p>
            </div>

            <div className="theme-bg-container border theme-border rounded-2xl overflow-hidden shadow-sm mt-6">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/5 dark:bg-white/5 border-b theme-border text-xs uppercase tracking-wider theme-text-muted">
                                <th className="p-4 font-bold">Usuario</th>
                                <th className="p-4 font-bold">Rol en Plataforma</th>
                                <th className="p-4 font-bold text-center">Estado</th>
                                <th className="p-4 font-bold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y theme-border">
                            {sortedUsers.map((u: any) => {
                                const isSuperUser = u.role === 'ADMIN_IT';
                                const canEdit = !isSuperUser;

                                return (
                                    <tr key={u.email} className={`transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${u.disabled ? 'opacity-50' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {u.photoURL ? (
                                                    <img src={u.photoURL} alt={u.displayName} className="w-10 h-10 rounded-full border theme-border shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold shadow-sm">
                                                        {u.displayName?.charAt(0) || 'U'}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold theme-text-main flex items-center gap-2">
                                                        {u.displayName}
                                                        {isSuperUser && <span title="Administrador IT Protegido" className="flex"><ShieldAlert className="w-3 h-3 text-[var(--primary)]" /></span>}
                                                    </p>
                                                    <p className="text-xs theme-text-muted">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4">
                                            <select
                                                value={u.role}
                                                onChange={(e) => updateUserRole(u.email, e.target.value)}
                                                disabled={!canEdit || u.disabled}
                                                className="w-full max-w-[200px] p-2 text-sm rounded-lg theme-bg-low border theme-border theme-text-main outline-none focus:border-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="ADMIN_IT">Administrador IT</option>
                                                <option value="ADMIN_CM">Administrador CM</option>
                                                <option value="EDITOR_CM">Editor CM</option>
                                                <option value="EDITOR_CONTENT">Editor Content</option>
                                            </select>
                                            {isSuperUser && (
                                                <p className="text-[10px] text-[var(--primary)] font-bold mt-1 flex items-center gap-1">
                                                    <ShieldAlert className="w-3 h-3" /> Escudo del Sistema Activo
                                                </p>
                                            )}
                                        </td>

                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${u.disabled ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                {u.disabled ? 'Deshabilitado' : 'Activo'}
                                            </span>
                                        </td>

                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => toggleUserStatus(u.email, u.disabled)}
                                                    disabled={!canEdit}
                                                    title={!canEdit ? "Nivel de privilegios intocable" : (u.disabled ? "Habilitar Cuenta" : "Deshabilitar Cuenta")}
                                                    className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${u.disabled ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-orange-500 hover:bg-orange-500/10'}`}
                                                >
                                                    {u.disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                                </button>

                                                {userRole === 'ADMIN_IT' && (
                                                    <button
                                                        onClick={() => deleteUserRecord(u.email)}
                                                        disabled={!canEdit}
                                                        title={!canEdit ? "Nivel de privilegios intocable" : "Eliminar permanentemente"}
                                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};