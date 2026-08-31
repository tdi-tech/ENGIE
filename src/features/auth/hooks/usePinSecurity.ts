import { useState, useCallback, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, appId, auth } from '../../../services/firebase/config';
// 🔥 IMPORTAMOS EL SENSOR DE AUDITORÍA
import { logAuditEvent } from '../../../services/firebase/audit.service';

export const usePinSecurity = (showToast: any) => {
    const [isPinLocked, setIsPinLocked] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const [pinRemainingAttempts, setPinRemainingAttempts] = useState(5);

    useEffect(() => {
        const fetchServerLockState = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser?.email) return;

            try {
                const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.email);
                const userSnap = await getDoc(userDocRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const now = Date.now();

                    if (userData.pinLockoutUntil) {
                        const lockoutTime = new Date(userData.pinLockoutUntil).getTime();
                        if (now < lockoutTime) {
                            const diffMins = Math.ceil((lockoutTime - now) / (1000 * 60));
                            setIsPinLocked(true);
                            setRemainingTime(diffMins);
                            setPinRemainingAttempts(0);
                            return;
                        } else {
                            setIsPinLocked(false);
                            setRemainingTime(0);
                        }
                    }

                    const fails = userData.pinFailedAttempts || 0;
                    setPinRemainingAttempts(Math.max(0, 5 - fails));
                }
            } catch (error) {
                console.error("Error al sincronizar estado de seguridad del PIN:", error);
            }
        };

        fetchServerLockState();
    }, []);

    const verifyPin = useCallback(async (inputPin: string, userEmail: string) => {
        if (!userEmail) {
            showToast('Error: No se identificó el correo del usuario.', true);
            return false;
        }

        try {
            const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userEmail);
            const userSnap = await getDoc(userDocRef);

            if (!userSnap.exists()) {
                showToast('Usuario no encontrado en la base de datos', true);
                return false;
            }

            const userData = userSnap.data();
            const now = new Date();

            if (userData.pinLockoutUntil) {
                const lockoutDate = new Date(userData.pinLockoutUntil).getTime();
                if (now.getTime() < lockoutDate) {
                    const diffMins = Math.ceil((lockoutDate - now.getTime()) / (1000 * 60));
                    setIsPinLocked(true);
                    setRemainingTime(diffMins);
                    setPinRemainingAttempts(0);
                    showToast(`🚨 PIN bloqueado por seguridad. Intenta de nuevo en ${diffMins} minutos.`, true);
                    // 🔥 AUDITAMOS INTENTO DE FORZAR ACCESO CON PIN BLOQUEADO
                    await logAuditEvent(`Intento de verificación de PIN con cuenta bloqueada (${userEmail})`);
                    return false;
                } else {
                    await updateDoc(userDocRef, { pinFailedAttempts: 0, pinLockoutUntil: null });
                    setIsPinLocked(false);
                    setRemainingTime(0);
                    setPinRemainingAttempts(5);
                }
            }

            if (userData.securityPin === inputPin) {
                await updateDoc(userDocRef, { pinFailedAttempts: 0, pinLockoutUntil: null });
                setIsPinLocked(false);
                setRemainingTime(0);
                setPinRemainingAttempts(5);
                showToast('¡PIN verificado correctamente!');
                return true;
            } else {
                const currentFails = (userData.pinFailedAttempts || 0) + 1;
                const rem = Math.max(0, 5 - currentFails);
                setPinRemainingAttempts(rem);

                let updatePayload: any = { pinFailedAttempts: currentFails };

                if (currentFails >= 5) {
                    const lockoutTimestamp = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
                    updatePayload.pinLockoutUntil = lockoutTimestamp;
                    setIsPinLocked(true);
                    setRemainingTime(30);
                    showToast('🚨 5 intentos fallidos: Tu PIN ha sido bloqueado por 30 minutos.', true);
                    
                    await logAuditEvent(`Alerta Brute-Force: Usuario ${userEmail} bloqueado 30 min por fallar PIN 5 veces`);
                } else {
                    showToast(`PIN incorrecto. Te quedan ${rem} intento(s) en el servidor.`, true);
                    // 🔥 AUDITAMOS CADA FALLO INDIVIDUAL DEL PIN
                    await logAuditEvent(`Alerta de Seguridad: PIN de seguridad incorrecto (Intento ${currentFails}/5 en cuenta ${userEmail})`);
                }

                await updateDoc(userDocRef, updatePayload);
                return false;
            }
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                showToast('Acceso bloqueado: No tienes permisos para verificar este PIN.', true);
                await logAuditEvent(`Alerta RBAC/DOM: Intento ilegal de forzar verificación de PIN en cuenta ${userEmail}`);
            } else {
                showToast('Error técnico al verificar PIN de seguridad', true);
            }
            return false;
        }
    }, [showToast]);

    return { verifyPin, isPinLocked, remainingTime, pinRemainingAttempts };
};