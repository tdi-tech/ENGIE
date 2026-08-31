import { collection, doc, query, orderBy } from 'firebase/firestore';
import type { CollectionReference, DocumentReference } from 'firebase/firestore';
import { db, appId } from '../firebase/config';

// Centralización absoluta de rutas inmutables de la v3.4.1
export const getCollectionRef = (collectionName: 'incidents' | 'rrss_incidents' | 'comments' | 'notifications' | 'auditLogs' | 'users' | 'appState'): CollectionReference => {
    return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
};

export const getDocRef = (collectionName: 'incidents' | 'rrss_incidents' | 'comments' | 'notifications' | 'auditLogs' | 'users' | 'appState', docId: string): DocumentReference => {
    return doc(db, 'artifacts', appId, 'public', 'data', collectionName, docId);
};