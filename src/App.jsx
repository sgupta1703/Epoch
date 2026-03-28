import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoadingSpinner from './components/LoadingSpinner';
import EpochArchivist from './components/EpochArchivist';
import SettingsEffects from './components/SettingsEffects';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Landing from './Landing';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ClassroomView from './pages/teacher/ClassroomView';
import UnitEditor from './pages/teacher/UnitEditor';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentClassroom from './pages/student/StudentClassroom';
import StudentUnit from './pages/student/StudentUnit';
import NotesView from './pages/student/NotesView';
import PersonaChat from './pages/student/PersonaChat';
import QuizView from './pages/student/QuizView';
import AssignmentView from './pages/student/AssignmentView';
import SettingsPage from './pages/settings/SettingsPage';

function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage label="Loading..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RedirectIfAuthed() {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage label="Loading..." />;
  if (isAuthenticated) {
    return (
      <Navigate
        to={role === 'teacher' ? '/teacher' : '/student'}
        replace
        state={role === 'teacher' ? { applyDefaultLanding: true } : undefined}
      />
    );
  }
  return <Outlet />;
}

function RequireRole({ role: required }) {
  const { role, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage label="Loading..." />;
  if (role !== required) return <Navigate to={role === 'teacher' ? '/teacher' : '/student'} replace />;
  return <Outlet />;
}

function AppRoutes() {
  const { user, setUser } = useAuth();

  return (
    <>
      <SettingsEffects />
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route element={<RedirectIfAuthed />}>
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="/register" element={<Register onLogin={setUser} />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<RequireRole role="teacher" />}>
            <Route path="/teacher" element={<TeacherDashboard user={user} />} />
            <Route path="/teacher/settings" element={<SettingsPage user={user} role="teacher" />} />
            <Route path="/teacher/classroom/:classroomId" element={<ClassroomView user={user} />} />
            <Route path="/teacher/classroom/:classroomId/unit/:unitId" element={<UnitEditor user={user} />} />
          </Route>

          <Route element={<RequireRole role="student" />}>
            <Route path="/student" element={<StudentDashboard user={user} />} />
            <Route path="/student/settings" element={<SettingsPage user={user} role="student" />} />
            <Route path="/student/classroom/:classroomId" element={<StudentClassroom user={user} />} />
            <Route path="/student/classroom/:classroomId/unit/:unitId" element={<StudentUnit user={user} />} />
            <Route path="/student/classroom/:classroomId/unit/:unitId/notes" element={<NotesView user={user} />} />
            <Route path="/student/classroom/:classroomId/unit/:unitId/personas" element={<PersonaChat user={user} />} />
            <Route path="/student/classroom/:classroomId/unit/:unitId/quiz" element={<QuizView user={user} />} />
            <Route path="/student/classroom/:classroomId/unit/:unitId/assignment" element={<AssignmentView user={user} />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <EpochArchivist />
      </AuthProvider>
    </BrowserRouter>
  );
}
