import { useState, useCallback, useRef, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, arrayUnion, getDoc, setDoc, onSnapshot, getDocs, query } from 'firebase/firestore';
import { db, appId, auth, getNetworkContext, IS_MOCK } from '../../../services/firebase/config';
import { logAuditEvent, logSecurityBlock } from '../../../services/firebase/audit.service';

export const useTickets = (showToast: any, openConfirmModal: any, logAction?: any) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExportingCSV, setIsExportingCSV] = useState(false);
    const lastSubmissionTime = useRef<number>(0);
    const [ticketRemainingAttempts, setTicketRemainingAttempts] = useState(5);
    const [ticketLockoutUntil, setTicketLockoutUntil] = useState<number | null>(null);

    useEffect(() => {
        if (IS_MOCK) return;
        let unsub: (() => void) | undefined;
        getNetworkContext().then((net) => {
            const userToUse = auth.currentUser;
            const lockId = userToUse?.email 
                ? userToUse.email.replace(/[@.]/g, '_') 
                : (net.ip ? net.ip.replace(/\./g, '_') : "anonymous_client");
                
            const lockRef = doc(db, 'artifacts', appId, 'public', 'data', 'firewall_locks', lockId);
            
            unsub = onSnapshot(lockRef, (lockSnap) => {
                if (lockSnap.exists()) {
                    const data = lockSnap.data();
                    if (data.lockoutUntil && Date.now() < new Date(data.lockoutUntil).getTime()) {
                        setTicketLockoutUntil(new Date(data.lockoutUntil).getTime());
                        setTicketRemainingAttempts(0);
                    } else {
                        const rem = Math.max(0, 5 - (data.failedAttempts || 0));
                        setTicketRemainingAttempts(rem);
                        if (data.lockoutUntil && Date.now() >= new Date(data.lockoutUntil).getTime()) {
                            setTicketLockoutUntil(null);
                        }
                    }
                } else {
                    setTicketRemainingAttempts(5);
                    setTicketLockoutUntil(null);
                }
            });
        }).catch(() => {});

        return () => { if (unsub) unsub(); };
    }, []);

    const createTicket = useCallback(async (ticketData: any, currentUser?: any) => {
        setIsSubmitting(true);
        try {
            const userToUse = currentUser || auth.currentUser;
            const net = await getNetworkContext().catch(() => ({ ip: "unknown_client" }));
            const lockId = userToUse?.email 
                ? userToUse.email.replace(/[@.]/g, '_') 
                : (net.ip ? net.ip.replace(/\./g, '_') : "anonymous_client");
            
            const lockRef = doc(db, 'artifacts', appId, 'public', 'data', 'firewall_locks', lockId);
            const lockSnap = await getDoc(lockRef);
            const lockData = lockSnap.exists() ? lockSnap.data() : {};
            const now = Date.now();

            if (lockData.lockoutUntil) {
                const lockoutTime = new Date(lockData.lockoutUntil).getTime();
                if (now < lockoutTime) {
                    const minRestantes = Math.ceil((lockoutTime - now) / (1000 * 60));
                    showToast(`🚨 Firewall de Servidor: IP bloqueada por seguridad. Intenta en ${minRestantes} minuto(s).`, true);
                    await logAuditEvent(`Intento ilegal de envío durante bloqueo activo de firewall en Tickets (${lockId})`);
                    setIsSubmitting(false);
                    return false;
                }
            }

            if (lockData.lastSubmissionTime && (now - lockData.lastSubmissionTime < 60 * 1000)) {
                const segRestantes = Math.ceil((60 * 1000 - (now - lockData.lastSubmissionTime)) / 1000);
                showToast(`⚡ Rate Limit de Servidor: Espera ${segRestantes}s para enviar otro ticket.`, true);
                await logSecurityBlock(`Spam de tickets / Exceso de velocidad (Rate Limit 60s en ${lockId})`, 0);
                setIsSubmitting(false);
                return false;
            }

            const payload = {
                ...ticketData,
                estado: 'Pendiente',
                timestamp: new Date().toISOString(),
                autor: userToUse?.email || 'ENGIE Cliente (Web)',
                fechaEntregaReal: '',
                linkArte: '',
                notasInternas: '',
                responsable: '',
                readBy: []
            };

            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'), payload);
            
            await setDoc(lockRef, {
                failedAttempts: 0,
                lockoutUntil: null,
                lastSubmissionTime: now,
                lastIp: net.ip || "unknown"
            }, { merge: true });

            setTicketRemainingAttempts(5);
            setTicketLockoutUntil(null);
            showToast('¡Ticket creado y enviado a la central con éxito!');
            
            // Esta notificación global es correcta: Queremos que todos sepan que hay trabajo nuevo
            if (logAction) await logAction(`Creó un nuevo ticket de soporte`, 'Tickets', 'create');
            
            setIsSubmitting(false);
            return true;
        } catch (error: any) {
            setIsSubmitting(false);
            
            if (error.code === 'permission-denied') {
                try {
                    const net = await getNetworkContext().catch(() => ({ ip: "unknown_client" }));
                    const userToUse = currentUser || auth.currentUser;
                    const lockId = userToUse?.email ? userToUse.email.replace(/[@.]/g, '_') : (net.ip ? net.ip.replace(/\./g, '_') : "anonymous_client");
                    const lockRef = doc(db, 'artifacts', appId, 'public', 'data', 'firewall_locks', lockId);
                    const lockSnap = await getDoc(lockRef);
                    const lockData = lockSnap.exists() ? lockSnap.data() : {};
                    
                    const currentFails = (lockData.failedAttempts || 0) + 1;
                    const rem = Math.max(0, 5 - currentFails);
                    setTicketRemainingAttempts(rem);

                    const updatePayload: any = { failedAttempts: currentFails, lastIp: net.ip || "unknown" };

                    if (currentFails >= 5) {
                        const lockoutTimestamp = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                        updatePayload.lockoutUntil = lockoutTimestamp;
                        setTicketLockoutUntil(new Date(lockoutTimestamp).getTime());
                        showToast('🚨 5 intentos fallidos: Tu IP ha sido bloqueada en el servidor por 30 minutos.', true);
                        
                        await logAuditEvent(`Alerta Brute-Force: IP/Usuario ${lockId} bloqueado 30 min en backend por fallar PIN 5 veces`);
                    } else {
                        showToast(`Acceso denegado: PIN incorrecto. Te quedan ${rem} intento(s) en el servidor.`, true);
                        await logAuditEvent(`Alerta de Seguridad: PIN de Ticket incorrecto (Intento ${currentFails}/5 por ${lockId})`);
                    }
                    
                    await setDoc(lockRef, updatePayload, { merge: true });
                } catch (lockErr) {
                    console.error("Error al registrar fallo en firewall:", lockErr);
                }
            } else {
                showToast('Error al enviar el ticket. Verifica tu conexión.', true);
            }
            return false;
        }
    }, [showToast, logAction]);

    const updateTicketStatus = useCallback(async (id: string, nuevoEstado: string, currentUser?: any) => {
        try {
            const updatePayload: any = { estado: nuevoEstado };
            const userToUse = currentUser || auth.currentUser;
            
            if (userToUse) {
                const idsToAdd = [userToUse.uid, userToUse.email].filter(Boolean);
                updatePayload.readBy = arrayUnion(...idsToAdd);
            }
            
            const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', id);
            const ticketSnap = await getDoc(ticketRef);
            const ticketTema = ticketSnap.exists() ? ticketSnap.data().tema : 'Ticket seleccionado';

            await updateDoc(ticketRef, updatePayload);

            if (userToUse) {
                // Esta notificación global es correcta: Todos deben saber que un estatus cambió
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), {
                    userId: userToUse.uid || userToUse.email,
                    userName: userToUse.displayName || userToUse.email || 'Miembro del equipo',
                    userPhoto: userToUse.photoURL || '',
                    action: `Actualizó el estatus a "${nuevoEstado}" en: ${ticketTema}`,
                    module: 'Tickets',
                    type: 'ticket_status',
                    incidentId: id,
                    timestamp: new Date().toISOString(),
                    readBy: [],
                    deletedBy: [] 
                });
            }

            showToast(`Estatus actualizado a: ${nuevoEstado}`);
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                showToast('Acceso bloqueado: No tienes permisos.', true);
                await logAuditEvent(`Alerta RBAC/DOM: Intento ilegal de modificar estatus en ticket #${id}`);
            } else {
                showToast('Error al actualizar estatus', true);
            }
        }
    }, [showToast]);

    const updateTicketInternals = useCallback(async (
        ticketId: string, 
        ticketData: any, 
        currentUser: any, 
        appUsers: any[]
    ) => {
        try {
            const updatePayload: any = {
                fechaEntregaReal: ticketData.fechaEntregaReal || '',
                linkArte: ticketData.linkArte || '',
                notasInternas: ticketData.notasInternas || '',
                responsable: ticketData.responsable || ''
            };

            const userToUse = currentUser || auth.currentUser;
            if (userToUse) {
                const idsToAdd = [userToUse.uid, userToUse.email].filter(Boolean);
                updatePayload.readBy = arrayUnion(...idsToAdd);
            }

            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', ticketId), updatePayload);

            if (ticketData.responsable && userToUse) {
                const assignedUserObj = appUsers.find(u => (u.displayName || u.email) === ticketData.responsable);
                
                if (assignedUserObj && assignedUserObj.email !== userToUse.email) {
                    // 🎯 NUEVO: Arquitectura de Francotirador usando targetUserEmail en lugar de deletedBy masivo
                    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), {
                        userId: userToUse.uid || userToUse.email,
                        userName: userToUse.displayName || userToUse.email || 'Miembro del equipo',
                        userPhoto: userToUse.photoURL || '',
                        action: `Te asignó como responsable del ticket: "${ticketData.tema}"`,
                        module: 'Tickets',
                        type: 'ticket_assign',
                        incidentId: ticketId,
                        timestamp: new Date().toISOString(),
                        readBy: [],
                        deletedBy: [],
                        targetUserEmail: assignedUserObj.email // 🔥 El único que verá esta alerta
                    });
                }
            }

            showToast('¡Metadatos internos y responsable guardados!');
            return true;
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                showToast('Acceso bloqueado: No tienes permisos.', true);
                await logAuditEvent(`Alerta RBAC/DOM: Intento ilegal de alterar metadatos en ticket #${ticketId}`);
            } else {
                showToast('Error al guardar datos', true);
            }
            return false;
        }
    }, [showToast]);

    const deleteTicket = useCallback((id: string, onSuccess?: () => void) => {
        if (openConfirmModal) {
            openConfirmModal(
                "¿Eliminar Ticket de Producción?",
                "Esta acción purgará el ticket emergente y sus adjuntos permanentemente. ¿Deseas continuar?",
                async () => {
                    try {
                        const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', id);
                        const ticketSnap = await getDoc(ticketRef);
                        const ticketTema = ticketSnap.exists() ? ticketSnap.data().tema : `ID: ${id}`;
                        
                        await deleteDoc(ticketRef);
                        showToast('Ticket purgado del sistema');
                        if (onSuccess) onSuccess();

                        // 🎯 NUEVO: Trazabilidad de Borrado para el equipo
                        const userToUse = auth.currentUser;
                        if (userToUse) {
                            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), {
                                userId: userToUse.uid || userToUse.email,
                                userName: userToUse.displayName || userToUse.email || 'Miembro del equipo',
                                userPhoto: userToUse.photoURL || '',
                                action: `Eliminó el ticket permanentemente: "${ticketTema}"`,
                                module: 'Tickets',
                                type: 'ticket_delete',
                                incidentId: id,
                                timestamp: new Date().toISOString(),
                                readBy: [],
                                deletedBy: []
                            });
                        }
                    } catch (error: any) {
                        if (error.code === 'permission-denied') {
                            showToast('Sin permisos para eliminar', true);
                            await logAuditEvent(`Alerta RBAC/DOM: Intento ilegal de eliminar el ticket #${id}`);
                        } else {
                            showToast('Sin permisos para eliminar', true);
                        }
                    }
                }
            );
        }
    }, [openConfirmModal, showToast]);

    const deleteMultipleTickets = useCallback((ids: string[], onSuccess?: () => void) => {
        if (openConfirmModal) {
            openConfirmModal(
                "¿Eliminar Tickets Seleccionados?",
                `Estás a punto de purgar ${ids.length} ticket(s) de producción permanentemente. ¿Deseas continuar?`,
                async () => {
                    try {
                        await Promise.all(ids.map(id => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tickets', id))));
                        showToast(`${ids.length} tickets eliminados del sistema`);
                        if (onSuccess) onSuccess();

                        // 🎯 NUEVO: Trazabilidad de Borrado Masivo para el equipo
                        const userToUse = auth.currentUser;
                        if (userToUse) {
                            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), {
                                userId: userToUse.uid || userToUse.email,
                                userName: userToUse.displayName || userToUse.email || 'Miembro del equipo',
                                userPhoto: userToUse.photoURL || '',
                                action: `Eliminó ${ids.length} tickets de producción permanentemente mediante selección múltiple.`,
                                module: 'Tickets',
                                type: 'ticket_batch_delete',
                                incidentId: 'batch',
                                timestamp: new Date().toISOString(),
                                readBy: [],
                                deletedBy: []
                            });
                        }
                    } catch (error: any) {
                        if (error.code === 'permission-denied') {
                            showToast('Sin permisos para eliminar algunos tickets', true);
                            await logAuditEvent(`Alerta RBAC/DOM: Intento ilegal de eliminación masiva en Tickets`);
                        } else {
                            showToast('Error al eliminar tickets', true);
                        }
                    }
                }
            );
        }
    }, [openConfirmModal, showToast]);

    const exportTicketsCSV = useCallback(async (csvFilter: any) => {
        setIsExportingCSV(true);
        try {
            const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'tickets'));
            const querySnapshot = await getDocs(q);
            let filtrados: any[] = [];
            
            querySnapshot.forEach((d) => {
                filtrados.push({ id: d.id, ...d.data() });
            });

            if (csvFilter.tipo !== 'Todo') {
                filtrados = filtrados.filter(t => {
                    if (!t.timestamp) return false;
                    const d = new Date(t.timestamp);
                    const tYear = d.getFullYear().toString();
                    const tMonth = (d.getMonth() + 1).toString().padStart(2, '0');

                    if (csvFilter.tipo === 'Anio' && tYear !== csvFilter.anio) return false;
                    if (csvFilter.tipo === 'Mes' && (tYear !== csvFilter.anio || tMonth !== csvFilter.mes)) return false;
                    return true;
                });
            }
            
            if (csvFilter.plataforma && csvFilter.plataforma !== 'Todas') {
                filtrados = filtrados.filter(t => {
                    if (!t.plataforma) return false;
                    if (Array.isArray(t.plataforma)) {
                        return t.plataforma.includes(csvFilter.plataforma);
                    }
                    return t.plataforma === csvFilter.plataforma;
                });
            }

            if (filtrados.length === 0) {
                showToast('No hay tickets en la base de datos que coincidan con estos filtros.', true);
                setIsExportingCSV(false);
                return false;
            }

            const headers = ['ID_Ticket', 'Prioridad', 'Plataformas', 'Tema', 'Estado', 'Fecha Limite', 'Responsable', 'Fecha Entrega Real', 'Link Arte', 'Notas Internas', 'Fecha Emision'];
            
            const rows = filtrados.map(t => {
                const plats = Array.isArray(t.plataforma) ? t.plataforma.join(' | ') : t.plataforma;
                return [
                    t.id, 
                    t.prioridad, 
                    `"${plats}"`, 
                    `"${(t.tema||'').replace(/"/g, '""')}"`, 
                    t.estado, 
                    t.fechaLimite,
                    t.responsable || 'Sin asignar', 
                    t.fechaEntregaReal || '', 
                    `"${(t.linkArte||'').replace(/"/g, '""')}"`,
                    `"${(t.notasInternas||'').replace(/"/g, '""')}"`, 
                    t.timestamp
                ].join(',');
            });

            const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte_Tickets_${csvFilter.tipo}_${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('CSV Inteligente generado y validado con el servidor.');
            setIsExportingCSV(false);
            return true;
        } catch (error) {
            showToast('Error de conexión al generar el reporte.', true);
            setIsExportingCSV(false);
            return false;
        }
    }, [showToast]);

    return { 
        createTicket, 
        isSubmitting, 
        updateTicketStatus, 
        updateTicketInternals, 
        deleteTicket,
        deleteMultipleTickets,
        exportTicketsCSV,
        isExportingCSV,
        ticketRemainingAttempts,
        ticketLockoutUntil
    };
};