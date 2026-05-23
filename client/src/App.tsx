import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import AuthGuard from '@/components/shared/AuthGuard';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectBoardPage from '@/pages/ProjectBoardPage';
import ProjectBacklogPage from '@/pages/ProjectBacklogPage';
import TicketDetailPage from '@/pages/TicketDetailPage';
import UsersPage from '@/pages/UsersPage';
import AppLayout from '@/components/shared/AppLayout';
import EpicDetailPage from '@/pages/EpicDetailPage';
import TimeReportPage from '@/pages/TimeReportPage';
import ProjectOverviewPage from '@/pages/ProjectOverviewPage';

export default function App() {
  const { token } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={token ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId/board" element={<ProjectBoardPage />} />
        <Route path="projects/:projectId/backlog" element={<ProjectBacklogPage />} />
        <Route path="projects/:projectId/tickets/:ticketId" element={<TicketDetailPage />} />
        <Route path="projects/:projectId/epics/:epicId" element={<EpicDetailPage />} />
        <Route path="projects/:projectId/time-report" element={<TimeReportPage />} />
        <Route path="projects/:projectId/overview" element={<ProjectOverviewPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
