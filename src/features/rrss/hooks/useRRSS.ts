import { updateDocument, deleteDocument, detectMaliciousPayload } from '../../../services/firebase/core.service';
import { logAuditEvent } from '../../../services/firebase/audit.service';
import { writeBatch, doc } from 'firebase/firestore';
import { db, appId } from '../../../services/firebase/config';

export const useRRSS = (showToast: any, setConfirmModal: any, logAction: any) => {
    const updateRrssIncident = async (id: string, updatedData: any) => {
        if (detectMaliciousPayload(updatedData)) {
            await logAuditEvent(`Bloqueo de Seguridad: Inyección XSS/SQL (RRSS)`);
            return showToast('Bloqueo de seguridad: Caracteres prohibidos detectados.', true);
        }
        try {
            await updateDocument('rrss_incidents', id, updatedData, `Editar incidente de RRSS ID: ${id}`);
            await logAction(`Editó un caso de reputación`, 'Incidencia RRSS', 'edit', id);
            showToast('Incidente RRSS editado correctamente.');
        } catch (err: any) { showToast(err.code === 'permission-denied' ? 'Permiso denegado.' : 'Acción denegada', true); }
    };

    const deleteRrssIncident = (id: string) => {
        // 🔥 FIX: Parámetros separados por comas para el Modal
        setConfirmModal(
            'Eliminar Incidente RRSS', 
            'Eliminará el registro de forma permanente. ¿Seguro?',
            async () => {
                try {
                    await deleteDocument('rrss_incidents', id, `Eliminar incidente RRSS ID: ${id}`);
                    await logAction(`Eliminó permanentemente un caso de crisis`, 'Incidencia RRSS', 'delete');
                    showToast('Registro eliminado exitosamente');
                } catch (err: any) { showToast(err.code === 'permission-denied' ? 'Bloqueo: No tienes permisos de eliminación.' : 'Acción denegada', true); }
            }
        );
    };

    const deleteRrssBatch = (ids: string[], onSuccess: () => void) => {
        // 🔥 FIX: Parámetros separados por comas para el Modal
        setConfirmModal(
            'Purgar Historial por Lotes', 
            `Estás a punto de eliminar de forma permanente ${ids.length} reporte(s) de RRSS. Esta acción limpiará la base de datos y no se puede deshacer. ¿Deseas continuar?`,
            async () => {
                try {
                    const chunkSize = 500; 
                    for (let i = 0; i < ids.length; i += chunkSize) {
                        const chunk = ids.slice(i, i + chunkSize);
                        const batch = writeBatch(db);
                        chunk.forEach(id => {
                            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'rrss_incidents', id);
                            batch.delete(docRef);
                        });
                        await batch.commit();
                    }
                    await logAction(`Purgó masivamente ${ids.length} incidentes de RRSS`, 'Incidencia RRSS', 'delete');
                    showToast(`Se eliminaron ${ids.length} reportes correctamente.`);
                    if (onSuccess) onSuccess();
                } catch (err: any) { 
                    showToast(err.code === 'permission-denied' ? 'Bloqueo: Privilegios insuficientes.' : 'Acción denegada', true); 
                }
            }
        );
    };

    return { updateRrssIncident, deleteRrssIncident, deleteRrssBatch };
};