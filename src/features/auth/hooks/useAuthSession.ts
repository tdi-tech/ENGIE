import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, appId, getNetworkContext, IS_MOCK, MOCK_SUPERUSER_ID, MOCK_AUTH_USER, ALLOWED_EMAIL_DOMAIN_MAIL } from '../../../services/firebase/config';
import { loginWithGoogleDomain, logoutUser, subscribeToAuthChanges } from '../../../services/firebase/auth.service';

// 🔥 FIX: Importación estática de auditoría
import { logAuditEvent } from '../../../services/firebase/audit.service';

import type { User } from 'firebase/auth';
import type { UserRole, UserSession } from '../../../shared/types/models';

export const useAuthSession = (showToast: any, setLoginModalOpen: any) => {
    const [user, setUser] = useState<UserSession | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userRole, setUserRole] = useState<UserRole>('');
    const [cloudStatus, setCloudStatus] = useState('Conectando...');
    
    const [loginRemainingAttempts, setLoginRemainingAttempts] = useState(5);
    const [isLoginLocked, setIsLoginLocked] = useState(false);

    const [userPrefs, setUserPrefs] = useState<any>(null);
    const prefsRef = useRef<any>(null);

    useEffect(() => {
        if (IS_MOCK) return;
        let unsub: (() => void) | undefined;
        getNetworkContext().then((net) => {
            const lockId = `login_${net.ip ? net.ip.replace(/\./g, '_') : "anon"}`;
            const lockRef = doc(db, 'artifacts', appId, 'public', 'data', 'firewall_locks', lockId);
            
            unsub = onSnapshot(lockRef, (lockSnap) => {
                if (lockSnap.exists()) {
                    const data = lockSnap.data();
                    if (data.lockoutUntil && Date.now() < new Date(data.lockoutUntil).getTime()) {
                        setIsLoginLocked(true);
                        setLoginRemainingAttempts(0);
                    } else {
                        const rem = Math.max(0, 5 - (data.failedAttempts || 0));
                        setLoginRemainingAttempts(rem);
                        setIsLoginLocked(false);
                    }
                } else {
                    setLoginRemainingAttempts(5);
                    setIsLoginLocked(false);
                }
            });
        }).catch(() => {});

        return () => { if (unsub) unsub(); };
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges(async (firebaseUser: User | null) => {
            if (firebaseUser) {
                // ⚡ MOCK SUPERUSER (Zero-State): rol ADMIN_IT total sin tocar
                // la colección users ni el dominio. Evita el 403 perimetral.
                if (IS_MOCK && firebaseUser.uid === MOCK_SUPERUSER_ID) {
                    setUser({
                        uid: MOCK_AUTH_USER.uid,
                        email: MOCK_AUTH_USER.email,
                        displayName: MOCK_AUTH_USER.displayName ?? null,
                        photoURL: MOCK_AUTH_USER.photoURL ?? null,
                        isAnonymous: false
                    });
                    setUserRole('ADMIN_IT');
                    setIsAdmin(true);
                    const mockPrefs = { sound: true, security: true, rrss: true, comments: true };
                    setUserPrefs(mockPrefs);
                    prefsRef.current = mockPrefs;
                    setLoginRemainingAttempts(5);
                    setIsLoginLocked(false);
                    setCloudStatus('Conectado a Firebase');
                    return;
                }
                if (!firebaseUser.email?.endsWith('@' + ALLOWED_EMAIL_DOMAIN_MAIL)) {
                    try {
                        const net = await getNetworkContext().catch(() => ({ ip: "unknown_client" }));
                        const lockId = `login_${net.ip ? net.ip.replace(/\./g, '_') : "anon"}`;
                        const lockRef = doc(db, 'artifacts', appId, 'public', 'data', 'firewall_locks', lockId);
                        const lockSnap = await getDoc(lockRef).catch(() => null);
                        const lockData = lockSnap && lockSnap.exists() ? lockSnap.data() : {};
                        
                        const currentFails = (lockData.failedAttempts || 0) + 1;
                        const rem = Math.max(0, 5 - currentFails);
                        setLoginRemainingAttempts(rem);
                        
                        let updatePayload: any = { failedAttempts: currentFails, lastIp: net.ip || "unknown", type: 'login_domain_violation' };
                        if (currentFails >= 5) {
                            const lockoutTime = Date.now() + (30 * 60 * 1000);
                            updatePayload.lockoutUntil = new Date(lockoutTime).toISOString();
                            setIsLoginLocked(true);
                            showToast('🚨 5 intentos fallidos: Tu IP ha sido bloqueada temporalmente por 30 minutos.', true);
                        } else {
                            showToast(`Acceso denegado: Exclusivo @${ALLOWED_EMAIL_DOMAIN_MAIL}. Quedan ${rem} intento(s).`, true);
                        }
                        await setDoc(lockRef, updatePayload, { merge: true });
                        
                        // 🔥 FIX: Llamada directa a logAuditEvent
                        await logAuditEvent(`Alerta RBAC/Firewall: Intento de login ajeno al dominio por ${firebaseUser.email}`);
                    } catch (err) {
                        console.error("Error registrando bloqueo en firewall:", err);
                    } finally {
                        await logoutUser();
                        setUser(null);
                        setIsAdmin(false);
                        setUserRole('');
                        setCloudStatus('Desconectado');
                    }
                    return;
                }

                const session: UserSession = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    isAnonymous: firebaseUser.isAnonymous
                };
                setUser(session);
                try {
                    const selfRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', firebaseUser.email);
                    const selfSnap = await getDoc(selfRef);

                    if (!selfSnap.exists()) {
                        // 🆕 Alta automática por primer login: el usuario del dominio entra
                        // directo como ADMIN_CM (único auto-rol permitido). Un ADMIN_IT
                        // podrá promocionarlo a ADMIN_IT desde Gestión de Usuarios.
                        const bootstrapPrefs = { sound: true, security: true, rrss: true, comments: true };
                        await setDoc(selfRef, {
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                            photoURL: firebaseUser.photoURL,
                            role: 'ADMIN_CM',
                            disabled: false,
                            isProtected: false,
                            lastLogin: new Date().toISOString(),
                            preferences: bootstrapPrefs
                        }, { merge: true });
                        setUserRole('ADMIN_CM');
                        setIsAdmin(true);
                        setUserPrefs(bootstrapPrefs);
                        prefsRef.current = bootstrapPrefs;
                    } else {
                        const data = selfSnap.data();
                        if (data.disabled) {
                            await logoutUser();
                            showToast('Tu cuenta ha sido deshabilitada. Contacta a TI.', true);
                            return;
                        }
                        
                        await setDoc(selfRef, { 
                            lastLogin: new Date().toISOString(),
                            photoURL: firebaseUser.photoURL || data.photoURL || null,
                            displayName: firebaseUser.displayName || data.displayName
                        }, { merge: true });
                        
                        const role = data.role as UserRole;
                        setUserRole(role || '');
                        setIsAdmin(['ADMIN_IT', 'ADMIN_CM'].includes(role));

                        const loadedPrefs = data.preferences || { sound: true, security: true, rrss: true, comments: true };
                        setUserPrefs(loadedPrefs);
                        prefsRef.current = loadedPrefs;
                    }
                    
                    const net = await getNetworkContext().catch(() => ({ ip: "unknown" }));
                    const lockId = `login_${net.ip ? net.ip.replace(/\./g, '_') : "anon"}`;
                    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'firewall_locks', lockId), { failedAttempts: 0, lockoutUntil: null }, { merge: true }).catch(() => {});
                    setLoginRemainingAttempts(5);
                    setIsLoginLocked(false);
                } catch (error: any) {
                    console.error('[auth] Error validando perfil:', error);
                }
                
                setCloudStatus('Conectado a Firebase');
            } else {
                setUser(null);
                setIsAdmin(false);
                setUserRole('');
                setUserPrefs(null);
                prefsRef.current = null;
                setCloudStatus('Desconectado');
            }
        });

        return () => unsubscribe();
    }, [showToast]);

    const loginWithGoogle = async () => {
        if (isLoginLocked) {
            return showToast('🚨 Firewall: Acceso bloqueado por seguridad por intentos fallidos previos.', true);
        }
        try {
            await loginWithGoogleDomain();
        } catch (error: any) {
            if (error.code === 'auth/too-many-requests') {
                showToast('🚨 Demasiados intentos fallidos. Tu acceso fue bloqueado temporalmente por Google Security.', true);
                // 🔥 FIX: Llamada directa
                logAuditEvent('Alerta DDoS: Google cortó tráfico por exceso de peticiones de Login (too-many-requests)').catch(() => {});
            } else {
                showToast(error.message || 'Error al iniciar sesión', true);
            }
        }
    };

    const logoutAdmin = async () => {
        try {
            await logoutUser();
        } catch (error) {
            showToast('Error al cerrar sesión', true);
        }
    };

    const updateUserPrefs = async (newPrefs: any) => {
        if (!user?.email) return;
        const prefs = { ...userPrefs, ...newPrefs };
        setUserPrefs(prefs);
        prefsRef.current = prefs;
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.email), { preferences: prefs }, { merge: true });
        } catch (error) {
            console.error("Error guardando preferencias", error);
        }
    };

    return { 
        user, isAdmin, userRole, cloudStatus, 
        loginWithGoogle, logoutAdmin, userPrefs, updateUserPrefs, prefsRef,
        loginRemainingAttempts, isLoginLocked
    };
};
