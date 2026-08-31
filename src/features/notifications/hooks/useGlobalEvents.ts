import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId, IS_MOCK, ALLOWED_EMAIL_DOMAIN_MAIL } from '../../../services/firebase/config';
import { pushNotification, markNotificationRead, deleteDocument } from '../../../services/firebase/core.service';

const playNotificationSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
};

export const useGlobalEvents = (user: any, prefsRef: any, showToast: any) => {
    const [checklistState, setChecklistState] = useState<any>({});
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        if (IS_MOCK) return;
        if (!user) return;
        if (!user.isAnonymous && user.email && !user.email.endsWith('@' + ALLOWED_EMAIL_DOMAIN_MAIL)) return;

        const checklistRef = collection(db, 'artifacts', appId, 'public', 'data', 'appState');
        const unsubChecklist = onSnapshot(checklistRef, (snapshot) => {
            let found = false;
            snapshot.forEach((docSnap) => {
                if (docSnap.id === 'globalChecklist') {
                    setChecklistState(docSnap.data().items || {}); found = true;
                }
            });
            if (!found) setChecklistState({});
        }, () => {});

        const notifRef = collection(db, 'artifacts', appId, 'public', 'data', 'notifications');
        const unsubNotif = onSnapshot(notifRef, (snapshot) => {
            const data: any[] = [];
            
            snapshot.forEach((doc) => {
                const notif = doc.data();
                // 🎯 LÓGICA DE FRANCOTIRADOR: Si la alerta es para alguien específico y no soy yo, el sistema finge que no existe.
                if (notif.targetUserEmail && user.email && notif.targetUserEmail !== user.email) return;
                
                data.push({ id: doc.id, ...notif });
            });
            
            data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setNotifications(data);

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notif = change.doc.data();
                    
                    // 🎯 LÓGICA DE FRANCOTIRADOR (Campanita): Evitamos que le suene el audio a quien no debe
                    if (notif.targetUserEmail && user.email && notif.targetUserEmail !== user.email) return;

                    const isRecent = (new Date().getTime() - new Date(notif.timestamp).getTime()) < 10000;
                    if (isRecent && notif.userId !== user.uid) {
                        let moduleKey: 'security' | 'rrss' | 'comments' = 'security';
                        if (notif.module === 'Incidencia RRSS') moduleKey = 'rrss';
                        if (notif.module === 'Comentarios') moduleKey = 'comments';
                        
                        const currentPrefs = prefsRef.current || { sound: true, security: true, rrss: true, comments: true };
                        if (moduleKey === 'security' && !currentPrefs.security) return;
                        if (moduleKey === 'rrss' && !currentPrefs.rrss) return;
                        if (moduleKey === 'comments' && !currentPrefs.comments) return;
                        if (currentPrefs.sound) playNotificationSound();
                    }
                }
            });
        }, () => {});

        return () => { unsubChecklist(); unsubNotif(); };
    }, [user, prefsRef]);

    const logAction = useCallback(async (actionText: string, moduleName: string, actionType: 'create' | 'edit' | 'delete', incidentId: string = '') => {
        if (!user || user.isAnonymous) return;
        await pushNotification(user.uid, user.displayName, user.photoURL, actionText, moduleName, actionType, incidentId);
    }, [user]);

    const markAsRead = useCallback(async (id: string) => {
        if (!user) return;
        await markNotificationRead(id, user.uid);
    }, [user]);

    const hideNotification = useCallback(async (id: string) => {
        if (!user) return;
        try { 
            const { setDoc, doc } = await import('firebase/firestore');
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', id), { deletedBy: (await import('firebase/firestore')).arrayUnion(user.uid) }, { merge: true }); 
        } catch (err) { showToast('Error al ocultar', true); }
    }, [user, showToast]);

    const deleteNotification = useCallback(async (id: string) => {
        try {
            await deleteDocument('notifications', id, `Eliminar notificación ${id}`);
        } catch (err) { showToast('Acción denegada por el servidor', true); }
    }, [showToast]);

    return { checklistState, setChecklistState, notifications, logAction, markAsRead, hideNotification, deleteNotification };
};