import React from 'react';
import { RolesView, ProtocoloRRSSView } from '../shared/components/StaticViews';
import { AyudaView } from '../shared/components/AyudaView';
import { DashboardView } from '../features/dashboard/components/DashboardView';
import { ConfigView } from '../features/settings/components/ConfigView';
import { NewRRSSIncidentView, HistorialRRSSView } from '../features/rrss/components/RRSSViews';
import { NewCommentView, HistorialCommentView } from '../features/comments/components/CommentViews';
import { UserManagementView } from '../features/users/components/UserViews';
import { BackupView } from '../features/backups/components/BackupView';
import { AuditViews } from '../features/audit/components/AuditViews';
import { ChangelogView } from '../shared/components/ChangelogView';
import { ReportDashboard } from '../features/reports/components/ReportDashboard';

type AccessLevel = 'PUBLIC' | 'LOGGED_IN' | 'ADMIN_IT' | 'ADMIN_CM_IT' | 'ADMIN_CM_IT_EDITOR' | 'GUEST_ONLY';

interface RouteConfig {
    component: React.FC<any>;
    access: AccessLevel;
}

export const ROUTES: Record<string, RouteConfig> = {
    'dashboard': { component: DashboardView, access: 'PUBLIC' },
    'roles': { component: RolesView, access: 'PUBLIC' },
    'ayuda': { component: AyudaView, access: 'PUBLIC' },
    'changelog': { component: ChangelogView, access: 'LOGGED_IN' },
    'config': { component: ConfigView, access: 'PUBLIC' },
    'protocolo-rss': { component: ProtocoloRRSSView, access: 'PUBLIC' },
    'historial-rss': { component: HistorialRRSSView, access: 'PUBLIC' },
    'historial-comentario': { component: HistorialCommentView, access: 'PUBLIC' },

    'nuevo-rss': { component: NewRRSSIncidentView, access: 'LOGGED_IN' },
    'nuevo-comentario': { component: NewCommentView, access: 'LOGGED_IN' },

    'gestion-usuarios': { component: UserManagementView, access: 'ADMIN_CM_IT' },

    'backups': { component: BackupView, access: 'ADMIN_IT' },
    'auditoria': { component: AuditViews, access: 'ADMIN_IT' },

    'reportes': { component: ReportDashboard, access: 'ADMIN_CM_IT_EDITOR' },
};

export const AppRouter = ({ currentView, props }: { currentView: string, props: any }) => {
    const route = ROUTES[currentView] || ROUTES['dashboard'];
    const Component = route.component;
    return <Component {...props} />;
};
