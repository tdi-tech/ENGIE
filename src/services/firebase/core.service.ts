import { setDoc, addDoc, arrayUnion, deleteDoc } from "firebase/firestore";
import { getCollectionRef, getDocRef } from '../firestore/collections.service';
import { safeFirestoreOperation } from './audit.service';
import type { CollectionName } from '../../shared/types/models';

export const detectMaliciousPayload = (data: Record<string, unknown>): boolean => {
    if (!data) return false;
    const str = JSON.stringify(data).toLowerCase();
    const patterns = ['<script>', 'javascript:', 'onerror=', 'onload=', 'drop table', 'union select', '../../'];
    return patterns.some(pattern => str.includes(pattern));
};

export const updateDocument = async (collectionName: CollectionName, docId: string, data: Record<string, unknown>, actionName: string): Promise<void> => {
    return safeFirestoreOperation(async () => {
        await setDoc(getDocRef(collectionName, docId), data, { merge: true });
    }, actionName);
};

export const deleteDocument = async (collectionName: CollectionName, docId: string, actionName: string): Promise<void> => {
    return safeFirestoreOperation(async () => {
        await deleteDoc(getDocRef(collectionName, docId));
    }, actionName);
};

export const pushNotification = async (userId: string, userName: string, userPhoto: string, actionText: string, moduleName: string, actionType: string, incidentId: string = ''): Promise<void> => {
    try {
        await addDoc(getCollectionRef('notifications'), {
            userId, 
            userName: userName || 'Administrador', 
            userPhoto: userPhoto || '',
            action: actionText, 
            module: moduleName, 
            type: actionType, 
            incidentId,
            timestamp: new Date().toISOString(), 
            readBy: [], 
            deletedBy: []   
        });
    } catch (error) {
        console.error("Error pushing notification", error);
    }
};

export const markNotificationRead = async (notifId: string, userId: string): Promise<void> => {
    try {
        await setDoc(getDocRef('notifications', notifId), { 
            readBy: arrayUnion(userId) 
        }, { merge: true });
    } catch (error) {
        // Fallo silencioso intencional para no interrumpir UX
    }
};