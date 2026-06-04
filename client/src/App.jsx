import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

import Login from './pages/Login';
import OperatorLayout from './layouts/OperatorLayout';
import AdminLayout from './layouts/AdminLayout';
import TeacherLayout from './layouts/TeacherLayout';

import OperatorKanban from './pages/operator/Kanban';
import OperatorCalendar from './pages/operator/Calendar';

import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminDatabase from './pages/admin/Database';
import AdminSettings from './pages/admin/Settings';
import AdminKPI from './pages/admin/KPI';
import AdminTasks from './pages/admin/Tasks';

import TeacherTasks from './pages/teacher/Tasks';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-dark-100">Yuklanmoqda...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Or maybe an unauthorized page
  }

  return children;
}

function RoleBasedRedirect() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  
  if (user.role === 'TEACHER') {
    return <Navigate to="/teacher" replace />;
  }

  return <Navigate to="/operator" replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<RoleBasedRedirect />} />

            <Route path="/operator" element={
              <ProtectedRoute allowedRoles={['OPERATOR']}>
                <OperatorLayout />
              </ProtectedRoute>
            }>
              <Route index element={<OperatorKanban />} />
              <Route path="calendar" element={<OperatorCalendar />} />
            </Route>

            <Route path="/teacher" element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <TeacherLayout />
              </ProtectedRoute>
            }>
              <Route index element={<TeacherTasks />} />
            </Route>

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="database" element={<AdminDatabase />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="kpi" element={<AdminKPI />} />
              <Route path="tasks" element={<AdminTasks />} />
            </Route>

          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
