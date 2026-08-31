import { updateDocument, deleteDocument, detectMaliciousPayload } from '../../../services/firebase/core.service';
import { logAuditEvent } from '../../../services/firebase/audit.service';
import { writeBatch, doc } from 'firebase/firestore';
import { db, appId } from '../../../services/firebase/config';

export const useComments = (showToast: any, setConfirmModal: any, logAction: any) => {
    const updateComment = async (id: string, updatedData: any) => {
        if (detectMaliciousPayload(updatedData)) {
            await logAuditEvent(`Bloqueo de Seguridad: Inyección XSS/SQL (Comentarios)`);
            return showToast('Bloqueo de seguridad: Caracteres prohibidos detectados.', true);
        }
        try {
            await updateDocument('comments', id, updatedData, `Editar comentario ID: ${id}`);
            await logAction(`Editó un reporte de comentarios`, 'Comentarios', 'edit', id);
            showToast('Comentario editado correctamente.');
        } catch (err: any) { showToast(err.code === 'permission-denied' ? 'Permiso denegado.' : 'Acción denegada', true); }
    };

    const deleteComment = (id: string) => {
        // 🔥 FIX: Parámetros separados por comas para el Modal
        setConfirmModal(
            'Eliminar Reporte', 
            'Eliminará el reporte de forma permanente. ¿Estás seguro?',
            async () => {
                try {
                    await deleteDocument('comments', id, `Eliminar comentario ID: ${id}`);
                    await logAction(`Eliminó de forma permanente un reporte`, 'Comentarios', 'delete');
                    showToast('Reporte eliminado exitosamente.');
                } catch (err: any) { showToast(err.code === 'permission-denied' ? 'Bloqueo: Privilegios insuficientes.' : 'Acción denegada', true); }
            }
        );
    };

    const deleteCommentsBatch = (ids: string[], onSuccess: () => void) => {
        // 🔥 FIX: Parámetros separados por comas para el Modal
        setConfirmModal(
            'Purgar Historial por Lotes', 
            `Estás a punto de eliminar de forma permanente ${ids.length} reporte(s) de comentarios. Esta acción limpiará la base de datos y no se puede deshacer. ¿Deseas continuar?`,
            async () => {
                try {
                    const chunkSize = 500; 
                    for (let i = 0; i < ids.length; i += chunkSize) {
                        const chunk = ids.slice(i, i + chunkSize);
                        const batch = writeBatch(db);
                        chunk.forEach(id => {
                            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'comments', id);
                            batch.delete(docRef);
                        });
                        await batch.commit();
                    }
                    await logAction(`Purgó masivamente ${ids.length} reportes de comentarios`, 'Comentarios', 'delete');
                    showToast(`Se eliminaron ${ids.length} reportes correctamente.`);
                    if (onSuccess) onSuccess();
                } catch (err: any) { 
                    showToast(err.code === 'permission-denied' ? 'Bloqueo: Privilegios insuficientes.' : 'Acción denegada', true); 
                }
            }
        );
    };

    return { updateComment, deleteComment, deleteCommentsBatch };
};