import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, appId, IS_MOCK } from '../../../services/firebase/config';
import { logAuditEvent } from '../../../services/firebase/audit.service';

// 🔐 Jerarquía actual: solo ADMIN_IT y ADMIN_CM
export const ALLOWED_USER_ROLES: readonly string[] = ['ADMIN_IT', 'ADMIN_CM'];
const isAllowedRole = (role: any): boolean => ALLOWED_USER_ROLES.includes(String(role || ''));

export const useUsersManager = (user: any, userRole: any, showToast: any, openConfirmModal?: any) => {
    const [appUsers, setAppUsers] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    useEffect(() => {
        if (IS_MOCK) {
            setAppUsers([]);
            setIsLoadingUsers(false);
            return;
        }

        if (!user || !user.uid) {
            setAppUsers([]);
            setIsLoadingUsers(false);
            return;
        }

        setIsLoadingUsers(true);
        const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snapshot) => {
            const usersList: any[] = [];
            snapshot.forEach((d) => {
                const data: any = { id: d.id, ...d.data() };
                // Normaliza roles antiguos al nuevo esquema de 2 niveles
                if (data.role === 'ADMIN_IT' || data.role === 'ADMIN_CM') {
                    // OK
                } else {
                    // Roles extintos (EDITOR_CM / EDITOR_CONTENT / READER) → degradar a ADMIN_CM
                    data.role = 'ADMIN_CM';
                }
                usersList.push(data);
            });
            setAppUsers(usersList);
            setIsLoadingUsers(false);
        }, (error) => {
            if (error.code !== 'permission-denied') {
                showToast('Error al cargar la lista de usuarios', true);
            }
            setIsLoadingUsers(false);
        });

        return () => unsub();
    }, [user, showToast]);

    const addManualUser = useCallback(async (email: string, role: string) => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) {
            showToast('Por favor ingresa un correo electrónico válido', true);
            return;
        }
        if (!isAllowedRole(role)) {
            showToast('Rol no permitido. Solo se permite Administrador IT o Administrador CM.', true);
            return;
        }

        try {
            const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', cleanEmail);

            await setDoc(userDocRef, {
                email: cleanEmail,
                displayName: cleanEmail.split('@')[0],
                photoURL: null,
                role: role,
                disabled: false,
                isProtected: role === 'ADMIN_IT',
                lastLogin: new Date().toISOString(),
                preferences: {}
            });

            showToast(`¡Usuario ${cleanEmail} pre-registrado como ${role}!`);
        } catch (error: any) {
            // 🔎 Diagnóstico: distingue fallo de permisos (reglas) de datos inválidos
            const code = error?.code || '';
            if (code === 'permission-denied') {
                showToast('Acceso bloqueado: Tus permisos impiden pre-registrar este usuario.', true);
            } else {
                showToast('Datos inválidos: El formato del usuario no cumple el esquema de Firestore.', true);
            }
            console.error(`[user-register] ${code}:`, error?.message, '| details:', error?.details);
        }
    }, [showToast]);

    const updateUserRole = useCallback(async (email: string, newRole: string) => {
        if (!isAllowedRole(newRole)) {
            showToast('Rol no permitido. Solo se permite Administrador IT o Administrador CM.', true);
            return;
        }

        try {
            const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', email);
            await updateDoc(userDocRef, { role: newRole, isProtected: newRole === 'ADMIN_IT' });
            showToast(`Rol actualizado a ${newRole}`);
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                showToast('Acceso bloqueado: No tienes permisos.', true);
                logAuditEvent(`Alerta RBAC/DOM: Intento ilegal de modificar rol al usuario ${email}`)
                    .catch(err => console.error("Error al disparar auditoría:", err));
            } else {
                showToast('Error al actualizar el rol del usuario', true);
            }
        }
    }, [showToast]);

    const toggleUserStatus = useCallback(async (email: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', email);
            await updateDoc(userDocRef, { disabled: newStatus });
            showToast(newStatus ? 'Cuenta deshabilitada' : 'Cuenta habilitada correctamente');
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                showToast('Acceso bloqueado: No tienes permisos.', true);
                // 🔥 FIX: Llamada directa a logAuditEvent
                logAuditEvent(`Alerta RBAC/DOM: Intento ilegal de cambiar estado al usuario ${email}`)
                    .catch(err => console.error("Error al disparar auditoría:", err));
            } else {
                showToast('Error al cambiar el estado del usuario', true);
            }
        }
    }, [showToast]);

    const deleteUserRecord = useCallback((email: string) => {
        const target = appUsers.find((u: any) => u.email === email);
        if (target && target.role === 'ADMIN_IT') {
            showToast('El Administrador IT no puede ser eliminado del sistema.', true);
            logAuditEvent(`Alerta RBAC: Intento de eliminar al ADMIN_IT (${email})`)
                .catch(err => console.error("Error al disparar auditoría:", err));
            return;
        }

        const executeDelete = async () => {
            try {
                const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', email);
                await deleteDoc(userDocRef);
                showToast('Usuario eliminado del sistema');
            } catch (error: any) {
                if (error.code === 'permission-denied') {
                    showToast('Acceso bloqueado: No tienes permisos.', true);
                    // 🔥 FIX: Llamada directa a logAuditEvent
                    logAuditEvent(`Alerta RBAC/DOM: Intento ilegal de eliminar al usuario ${email}`)
                        .catch(err => console.error("Error al disparar auditoría:", err));
                } else {
                    showToast('No tienes permisos para eliminar este usuario', true);
                }
            }
        };

        if (openConfirmModal) {
            openConfirmModal(
                "¿Eliminar usuario permanentemente?",
                `Estás a punto de revocar todos los accesos y eliminar el registro de ${email}. ¿Deseas continuar?`,
                executeDelete
            );
        } else {
            executeDelete();
        }
    }, [showToast, openConfirmModal, appUsers]);

    return {
        appUsers,
        isLoadingUsers,
        addManualUser,
        updateUserRole,
        toggleUserStatus,
        deleteUserRecord
    };
};