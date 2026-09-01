import React, { useState, useEffect, useCallback } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db, appId, auth, ALLOWED_EMAIL_DOMAIN_MAIL } from '../services/firebase/config';

import { logAuditEvent } from '../services/firebase/audit.service'; 

import { useTheme } from './providers/ThemeProvider';
import { useToast } from './providers/ToastProvider';
import { useModals } from './providers/ModalProvider';
import { useAuthSession } from '../features/auth/hooks/useAuthSession';
import { useGlobalEvents } from '../features/notifications/hooks/useGlobalEvents';
import { useUsersManager } from '../features/users/hooks/useUsersManager';
import { useIncidents } from '../features/incidents/hooks/useIncidents';
import { useRRSS } from '../features/rrss/hooks/useRRSS';
import { useComments } from '../features/comments/hooks/useComments';
import { useTickets } from '../features/tickets/hooks/useTickets';

import { AppRouter, ROUTES } from './routes';
import { MainLayout } from '../shared/components/Layout/MainLayout';
import { LoginModal } from '../shared/components/Modals';
import { Inactivity } from '../shared/components/Inactivity';

const AppContent = () => {
    const { isDarkMode, toggleTheme } = useTheme();
    const { showToast } = useToast();
    const { openConfirmModal, openPreviewModal, onNavigateRef } = useModals();

    const [currentView, setCurrentView] = useState(() => localStorage.getItem('innova_current_view') || 'dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false); 
    const [notifMenuOpen, setNotifMenuOpen] = useState(false);
    const [notifTab, setNotifTab] = useState('unread');
    const [loginModalOpen, setLoginModalOpen] = useState(false);

    const { user, isAdmin, userRole, cloudStatus, loginWithGoogle, logoutAdmin, userPrefs, updateUserPrefs, prefsRef, loginRemainingAttempts } = useAuthSession(showToast, setLoginModalOpen);
    const { checklistState, setChecklistState, notifications, logAction, markAsRead, hideNotification } = useGlobalEvents(user, prefsRef, showToast);
    const { appUsers, updateUserRole, toggleUserStatus, deleteUserRecord, addManualUser } = useUsersManager(user, userRole, showToast, openConfirmModal);
    
    const dummySetDetailModalOpen = () => {}; 
    const { toggleIncidentStatus, updateIncident, deleteIncident } = useIncidents(showToast, openConfirmModal, dummySetDetailModalOpen, logAction);
    
    // 🔥 FIX: Se extrajeron los Batch Deletes para que no se pierdan
    const { updateRrssIncident, deleteRrssIncident, deleteRrssBatch } = useRRSS(showToast, openConfirmModal, logAction);
    
    // 🔥 FIX: Uso de la versión plural correcta que viene del hook
    const { updateComment, deleteComment, deleteCommentsBatch } = useComments(showToast, openConfirmModal, logAction);
    
    // 🔥 FIX DE TICKETS: Se extrajo todo el arsenal completo del hook
    const { 
        updateTicketStatus, 
        updateTicketInternals, 
        deleteTicket,
        deleteMultipleTickets,
        exportTicketsCSV,
        isExportingCSV,
        ticketRemainingAttempts,
        ticketLockoutUntil
    } = useTickets(showToast, openConfirmModal, logAction);

    const navigate = useCallback(async (view: string) => {
        const route = ROUTES[view] || ROUTES['dashboard'];
        const access = route.access;

        if (access !== 'PUBLIC' && access !== 'GUEST_ONLY' && !user) {
            showToast('Debes iniciar sesión para acceder a esta sección.', true);
            return setLoginModalOpen(true);
        }

        if (access === 'GUEST_ONLY' && user) {
            showToast('Ya tienes sesión activa. Redirigiendo a tu consola de gestión.', true);
            return navigate('gestion-tickets');
        }

        if ((userRole as string) === 'EDITOR_CONTENT') {
            const allowedViews = ['dashboard', 'gestion-tickets', 'roles', 'ayuda', 'config', 'historial-comentario'];
            if (!allowedViews.includes(view)) {
                showToast('Acceso denegado. Tu rol (Editor Content) no tiene permisos para esta área.', true);
                return navigate('dashboard');
            }
        }

        if (access === 'ADMIN_IT' && userRole !== 'ADMIN_IT') {
            await logAuditEvent(`Violación RBAC: Acceso restringido (/${view})`);
            return showToast('Acceso denegado. Exclusivo para Administrador de IT.', true);
        }
        if (access === 'ADMIN_CM_IT' && userRole !== 'ADMIN_IT' && userRole !== 'ADMIN_CM') {
            return showToast('Acceso denegado. Tu rol no tiene permisos para esta área.', true);
        }
        if (access === 'ADMIN_CM_IT_EDITOR' && !['ADMIN_IT', 'ADMIN_CM', 'EDITOR_CM'].includes(userRole as string)) {
            return showToast('Acceso denegado. Tu rol no tiene permisos para esta área.', true);
        }

        setCurrentView(view); 
        localStorage.setItem('innova_current_view', view); 
        setSidebarOpen(false);
    }, [user, userRole, showToast]); 

    const handleLogin = useCallback(async () => {
        try {
            await loginWithGoogle();
            const currentEmail = auth.currentUser?.email || '';
            if (auth.currentUser && currentEmail.endsWith('@' + ALLOWED_EMAIL_DOMAIN_MAIL)) {
                setLoginModalOpen(false);
                setCurrentView('dashboard');
                localStorage.setItem('innova_current_view', 'dashboard');
                showToast('¡Bienvenido de vuelta a ENGIE Management!');
            }
        } catch (error) {
            console.error("Inicio de sesión cancelado o fallido:", error);
        }
    }, [loginWithGoogle, showToast]);

    const handleLogout = useCallback(() => {
        navigate('dashboard');
        setTimeout(() => {
            logoutAdmin();
            showToast('Sesión cerrada correctamente');
        }, 150);
    }, [navigate, logoutAdmin, showToast]);

    useEffect(() => { 
        onNavigateRef.current = navigate; 
    }, [navigate, onNavigateRef]);

    useEffect(() => {
        if (cloudStatus === 'Conectando...') return;
        
        const route = ROUTES[currentView] || ROUTES['dashboard'];
        const access = route.access;
        let finalView = currentView;

        if (access !== 'PUBLIC' && access !== 'GUEST_ONLY' && !user) {
            finalView = 'dashboard';
        } else if (access === 'GUEST_ONLY' && user) {
            finalView = 'gestion-tickets';
        } else if ((userRole as string) === 'EDITOR_CONTENT') {
            const allowedViews = ['dashboard', 'gestion-tickets', 'roles', 'ayuda', 'config', 'historial-comentario'];
            if (!allowedViews.includes(currentView)) finalView = 'dashboard';
        } else if (access === 'ADMIN_IT' && userRole !== 'ADMIN_IT') {
            finalView = 'dashboard';
        } else if (access === 'ADMIN_CM_IT' && !['ADMIN_IT', 'ADMIN_CM'].includes(userRole as string)) {
            finalView = 'dashboard';
        } else if (access === 'ADMIN_CM_IT_EDITOR' && !['ADMIN_IT', 'ADMIN_CM', 'EDITOR_CM'].includes(userRole as string)) {
            finalView = 'dashboard';
        }

        if (finalView !== currentView) {
            setCurrentView(finalView);
            localStorage.setItem('innova_current_view', finalView);
        }
    }, [user, isAdmin, userRole, currentView, cloudStatus]);

    useEffect(() => {
        const handleClickOutside = (e: any) => {
            if (!e.target.closest('.notif-container')) setNotifMenuOpen(false);
            if (!e.target.closest('.profile-container')) setProfileMenuOpen(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const validNotifications = notifications.filter((n: any) => {
        if (n.userId === user?.uid || (n.deletedBy && n.deletedBy.includes(user?.uid))) return false;
        
        if ((userRole as string) === 'EDITOR_CONTENT') {
            if (n.type !== 'ticket_assign' && n.type !== 'ticket_status' && n.module !== 'Comentarios') return false;
        }
        
        return true;
    });
    
    const unreadNotifications = validNotifications.filter((n: any) => !(n.readBy && n.readBy.includes(user?.uid)));
    const readNotifications = validNotifications.filter((n: any) => (n.readBy && n.readBy.includes(user?.uid)));

    const handleViewIncident = async (n: any) => {
        setNotifMenuOpen(false);
        try {
            let colName: any = n.module === 'Hackeos' ? 'incidents' : n.module === 'Incidencia RRSS' ? 'rrss_incidents' : n.module === 'Comentarios' ? 'comments' : n.module === 'Tickets' ? 'tickets' : '';
            if (!colName) return;
            const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, n.incidentId));
            
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                if (colName === 'incidents') { navigate('historial'); showToast('Apertura rápida. Busca en la lista.'); } 
                else if (colName === 'rrss_incidents') openPreviewModal('rrss', data);
                else if (colName === 'tickets') { navigate('gestion-tickets'); showToast('Abriendo consola de gestión.'); }
                else openPreviewModal('comment', data);
            } else showToast('El registro fue eliminado', true);
        } catch(e) { showToast('Error al conectar con servidor', true); }
    };

    const displayRoleName = userRole === 'ADMIN_IT' ? 'Administrador IT' 
                          : userRole === 'ADMIN_CM' ? 'Administrador CM' 
                          : userRole === 'EDITOR_CM' ? 'Editor CM' 
                          : (userRole as string) === 'EDITOR_CONTENT' ? 'Editor Content'
                          : 'Administrador';

    // 🔥 FIX: Se inyectaron todos los métodos faltantes en las props
    const viewProps = {
        isAdmin, user, userRole, showToast, navigate, logAction, appUsers, checklistState, setChecklistState,
        updateUserRole, toggleUserStatus, deleteUserRecord, addManualUser, isDarkMode, toggleTheme, userPrefs, updateUserPrefs,
        toggleIncidentStatus, updateIncident, deleteIncident, 
        updateRrssIncident, deleteRrssIncident, deleteRrssBatch, 
        updateComment, deleteComment, deleteCommentsBatch,
        updateTicketStatus, updateTicketInternals, deleteTicket,
        deleteMultipleTickets, exportTicketsCSV, isExportingCSV, ticketRemainingAttempts, ticketLockoutUntil,
        openConfirmModal
    };

    return (
        <MainLayout 
            isDarkMode={isDarkMode} toggleTheme={toggleTheme} currentView={currentView} navigate={navigate}
            sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} profileMenuOpen={profileMenuOpen} setProfileMenuOpen={setProfileMenuOpen}
            notifMenuOpen={notifMenuOpen} setNotifMenuOpen={setNotifMenuOpen} notifTab={notifTab} setNotifTab={setNotifTab}
            user={user} isAdmin={isAdmin} userRole={userRole} cloudStatus={cloudStatus} displayRoleName={displayRoleName}
            unreadNotifications={unreadNotifications} readNotifications={readNotifications} validNotifications={validNotifications}
            markAsRead={markAsRead} hideNotification={hideNotification} handleViewIncident={handleViewIncident}
            openLoginModal={() => setLoginModalOpen(true)} logoutAdmin={handleLogout}
        >
            <AppRouter currentView={currentView} props={viewProps} />
            <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onGoogleLogin={handleLogin} remainingAttempts={loginRemainingAttempts} />
            {(user || isAdmin) && <Inactivity onLogout={handleLogout} />}
        </MainLayout>
    );
};

export default AppContent;