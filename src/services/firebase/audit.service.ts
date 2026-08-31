import { collection, addDoc } from 'firebase/firestore';
import { db, appId, auth, getNetworkContext, IS_MOCK } from './config';

export const logAuditEvent = async (actionDescription: string, forceEmail?: string): Promise<void> => {
    try {
        // ⚡ MODO MOCK: no se escribe en auditLogs (no hay base real y el mock
        // no admite Firestore). Se evita intentar guardar logs de acceso.
        if (IS_MOCK) return;

        const now = new Date();
        const expireDate = new Date(now.getTime() + (13 * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000));
        const currentUser = auth.currentUser;

        // 🔥 OBTENEMOS LA RED EN VIVO (IP pública y país reales del atacante)
        const netContext = await getNetworkContext().catch(() => ({ ip: "Desconocida", country: "Desconocido" }));

        // Si no hay usuario logueado, lo catalogamos como Lector Anónimo pero capturamos toda su red
        const uid = currentUser?.uid || "anonymous_attacker";
        const email = forceEmail || currentUser?.email || "Usuario Lector / No Autenticado";
        const provider = currentUser?.providerData[0]?.providerId || "reader / external_ip";

        const auditPayload = {
            ip: netContext.ip || "127.0.0.1",
            pais: netContext.country || "Local/Proxy",
            fecha: now,
            expireAt: expireDate,
            uid: uid,
            email: email,
            provider: provider,
            userAgent: navigator.userAgent || "unknown-agent",
            accion: actionDescription
        };

        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'auditLogs'), auditPayload);
    } catch (err) {
        console.error("Fallo crítico al asentar registro en auditLogs:", err);
    }
};

// Helper estandarizado para registrar bloqueos de firewall y rate limits
export const logSecurityBlock = async (motivo: string, minutosBloqueo: number, emailIntento?: string): Promise<void> => {
    const minText = minutosBloqueo > 0 ? `por ${minutosBloqueo} minutos` : 'temporalmente';
    const msg = `🚨 BLOQUEO FIREWALL: IP / Lector bloqueado ${minText}. Motivo: ${motivo}`;
    await logAuditEvent(msg, emailIntento);
};

export const safeFirestoreOperation = async <T>(operationFn: () => Promise<T>, actionName: string): Promise<T> => {
    try {
        return await operationFn();
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            await logAuditEvent(`Bloqueo 403: Operación denegada (${actionName})`);
        }
        throw error;
    }
};