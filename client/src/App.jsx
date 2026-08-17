import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';

import Login from './pages/Login';
import OperatorLayout from './layouts/OperatorLayout';
import AdminLayout from './layouts/AdminLayout';
import TeacherLayout from './layouts/TeacherLayout';
import SMMLayout from './layouts/SMMLayout';
import StudentLayout from './layouts/StudentLayout';

import Reports from './pages/shared/Reports';
import AdminReports from './pages/admin/AllReports';

import StudentDashboard from './pages/student/Dashboard';
import StudentStudy from './pages/student/Study';
import StudentMentorBot from './pages/student/MentorBot';
import StudentGames from './pages/student/Games';

import OperatorKanban from './pages/operator/Kanban';
import OperatorCalendar from './pages/operator/Calendar';

import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminDatabase from './pages/admin/Database';
import AdminSettings from './pages/admin/Settings';
import AdminKPI from './pages/admin/KPI';
import AdminTasks from './pages/admin/Tasks';
import AdminCourses from './pages/admin/Courses';

import TeacherTasks from './pages/teacher/Tasks';
import TeacherHomeworkReview from './pages/teacher/HomeworkReview';
import StudentManager from './pages/shared/StudentManager';
import Leaderboard from './pages/shared/Leaderboard';
import BotKnowledgeBase from './pages/shared/BotKnowledgeBase';

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

  if (user.role === 'STUDENT') {
    return <Navigate to="/student" replace />;
  }
  
  if (user.role === 'TEACHER' || user.role === 'MENTOR') {
    return <Navigate to="/teacher" replace />;
  }
  
  if (user.role === 'SMM') {
    return <Navigate to="/smm" replace />;
  }

  return <Navigate to="/operator" replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <ErrorBoundary>
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
                <Route path="reports" element={<Reports />} />
              </Route>

              <Route path="/teacher" element={
                <ProtectedRoute allowedRoles={['TEACHER', 'MENTOR', 'ADMIN']}>
                  <TeacherLayout />
                </ProtectedRoute>
              }>
                <Route index element={<TeacherTasks />} />
                <Route path="homeworks" element={<TeacherHomeworkReview />} />
                <Route path="students" element={<StudentManager />} />
                <Route path="courses" element={<AdminCourses />} />
                <Route path="bot-knowledge" element={<BotKnowledgeBase />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="reports" element={<Reports />} />
              </Route>
              
              <Route path="/smm" element={
                <ProtectedRoute allowedRoles={['SMM']}>
                  <SMMLayout />
                </ProtectedRoute>
              }>
                <Route index element={<TeacherTasks />} />
                <Route path="facebook" element={<AdminSettings />} />
                <Route path="reports" element={<Reports />} />
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
                <Route path="courses" element={<AdminCourses />} />
                <Route path="students" element={<StudentManager />} />
                <Route path="bot-knowledge" element={<BotKnowledgeBase />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="reports" element={<Reports />} />
                <Route path="all-reports" element={<AdminReports />} />
              </Route>

              <Route path="/student" element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentLayout />
                </ProtectedRoute>
              }>
                <Route index element={<StudentDashboard />} />
                <Route path="mentor-bot" element={<StudentMentorBot />} />
                <Route path="games" element={<StudentGames />} />
                <Route path="courses/:courseId" element={<StudentStudy />} />
                <Route path="leaderboard" element={<Leaderboard />} />
              </Route>

            </Routes>
          </ErrorBoundary>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
