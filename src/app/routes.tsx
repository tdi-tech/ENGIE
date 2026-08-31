import React from 'react';
import { StaticProtocoloView, RolesView, GlosarioView, ProtocoloRRSSView } from '../shared/components/StaticViews';
import { AyudaView } from '../shared/components/AyudaView';
import { ChangelogView } from '../shared/components/ChangelogView';
import { DashboardView } from '../features/dashboard/components/DashboardView';
import { ConfigView } from '../features/settings/components/ConfigView';
import { HistorialView, ChecklistView, NewIncidentView } from '../features/incidents/components/HackViews';
import { NewRRSSIncidentView, HistorialRRSSView } from '../features/rrss/components/RRSSViews';
import { NewCommentView, HistorialCommentView } from '../features/comments/components/CommentViews';
import { UserManagementView } from '../features/users/components/UserViews';
import { BackupView } from '../features/backups/components/BackupView';
import { AuditViews } from '../features/audit/components/AuditViews';
import { SolicitudTicketsView, GestionTicketsView } from '../features/tickets/components/TicketViews';
import { ReportDashboard } from '../features/reports/components/ReportDashboard';

// 🔥 NUEVO NIVEL: 'ADMIN_CM_IT_EDITOR' para blindar el acceso estricto a Reportes
type AccessLevel = 'PUBLIC' | 'LOGGED_IN' | 'ADMIN_IT' | 'ADMIN_CM_IT' | 'ADMIN_CM_IT_EDITOR' | 'GUEST_ONLY';

interface RouteConfig {
    component: React.FC<any>;
    access: AccessLevel;
}

export const ROUTES: Record<string, RouteConfig> = {
    'dashboard': { component: DashboardView, access: 'PUBLIC' },
    'protocolo': { component: StaticProtocoloView, access: 'PUBLIC' },
    'historial': { component: HistorialView, access: 'PUBLIC' },
    'glosario': { component: GlosarioView, access: 'PUBLIC' },
    'roles': { component: RolesView, access: 'PUBLIC' },
    'ayuda': { component: AyudaView, access: 'PUBLIC' },
    'config': { component: ConfigView, access: 'PUBLIC' },
    'protocolo-rss': { component: ProtocoloRRSSView, access: 'PUBLIC' },
    'historial-rss': { component: HistorialRRSSView, access: 'PUBLIC' },
    'historial-comentario': { component: HistorialCommentView, access: 'PUBLIC' },

    'changelog': { component: ChangelogView, access: 'LOGGED_IN' },
    'nuevo': { component: NewIncidentView, access: 'LOGGED_IN' },
    'checklist': { component: ChecklistView, access: 'LOGGED_IN' },
    'nuevo-rss': { component: NewRRSSIncidentView, access: 'LOGGED_IN' },
    'nuevo-comentario': { component: NewCommentView, access: 'LOGGED_IN' },

    'gestion-usuarios': { component: UserManagementView, access: 'ADMIN_CM_IT' },

    'backups': { component: BackupView, access: 'ADMIN_IT' },
    'auditoria': { component: AuditViews, access: 'ADMIN_IT' },
    
    // 🔥 ASIGNADO A NUEVO NIVEL: Ahora administradores y Editor CM tienen acceso
    'reportes': { component: ReportDashboard, access: 'ADMIN_CM_IT_EDITOR' },

    'solicitud-tickets': { component: SolicitudTicketsView, access: 'GUEST_ONLY' },
    'gestion-tickets': { component: GestionTicketsView, access: 'LOGGED_IN' },
};

export const AppRouter = ({ currentView, props }: { currentView: string, props: any }) => {
    const route = ROUTES[currentView] || ROUTES['dashboard'];

    if (route.access === 'GUEST_ONLY' && props.user) {
        setTimeout(() => {
            if (props.navigate) props.navigate('gestion-tickets');
        }, 0);
        return <GestionTicketsView {...props} />;
    }

    const Component = route.component;
    return <Component {...props} />;
};