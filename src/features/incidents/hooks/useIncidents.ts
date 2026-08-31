import { updateDocument, deleteDocument, detectMaliciousPayload } from '../../../services/firebase/core.service';
import { logAuditEvent, safeFirestoreOperation } from '../../../services/firebase/audit.service';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../../../services/firebase/config';

export const useIncidents = (showToast: any, setConfirmModal: any, setDetailModalOpen: any, logAction: any) => {
    const toggleIncidentStatus = async (id: string) => {
        try {
            await safeFirestoreOperation(async () => {
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'incidents', id);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) return;
                const inc = docSnap.data();
                const newStatus = inc.estado === 'Resuelto' ? 'Abierto' : 'Resuelto';
                await setDoc(docRef, { ...inc, estado: newStatus });
                await logAction(`Cambió el estado a ${newStatus}`, 'Hackeos', 'edit', id);
            }, `Cambiar estado de incidente de hackeo ID: ${id}`);
            showToast(`Estado actualizado con éxito`);
        } catch (err: any) { showToast(err.code === 'permission-denied' ? 'Permiso denegado por reglas de seguridad.' : 'Acción denegada', true); }
    };

    const updateIncident = async (id: string, updatedData: any) => {
        if (detectMaliciousPayload(updatedData)) {
            await logAuditEvent(`Bloqueo de Seguridad: Inyección XSS/SQL (Hackeos)`);
            return showToast('Bloqueo de seguridad: Caracteres prohibidos detectados.', true);
        }
        try {
            await updateDocument('incidents', id, updatedData, `Editar incidente de hackeo ID: ${id}`);
            await logAction(`Editó un registro de seguridad`, 'Hackeos', 'edit', id);
            showToast('Incidente editado correctamente.');
        } catch (err: any) { showToast(err.code === 'permission-denied' ? 'Permiso denegado por reglas de seguridad.' : 'Acción denegada', true); }
    };

    const deleteIncident = (id: string) => {
        setConfirmModal({
            isOpen: true, title: 'Eliminar Incidente', msg: 'Esta acción no se puede deshacer. ¿Seguro?',
            onConfirm: async () => {
                try {
                    await deleteDocument('incidents', id, `Eliminar incidente de hackeo ID: ${id}`);
                    await logAction(`Eliminó de forma permanente un registro`, 'Hackeos', 'delete');
                    showToast('Incidente eliminado');
                    setDetailModalOpen(false);
                } catch (err: any) { showToast(err.code === 'permission-denied' ? 'Bloqueo: No tienes permisos para eliminar.' : 'Acción denegada', true); }
            }
        });
    };

    return { toggleIncidentStatus, updateIncident, deleteIncident };
};