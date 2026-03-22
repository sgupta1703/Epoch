import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import LoadingSpinner from './components/LoadingSpinner';
import EpochArchivist from './components/EpochArchivist';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Landing
import Landing from './Landing';

// Teacher pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ClassroomView from './pages/teacher/ClassroomView';
import UnitEditor from './pages/teacher/UnitEditor';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentClassroom from './pages/student/StudentClassroom';
import StudentUnit from './pages/student/StudentUnit';
import NotesView from './pages/student/NotesView';
import PersonaChat from './pages/student/PersonaChat';
import QuizView from './pages/student/QuizView';
import AssignmentView from './pages/student/AssignmentView';


function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage label="Loading…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RedirectIfAuthed() {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage label="Loading…" />;
  if (isAuthenticated) {
    return <Navigate to={role === 'teacher' ? '/teacher' : '/student'} replace />;
  }
  return <Outlet />;
}

function RequireRole({ role: required }) {
  const { role, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage label="Loading…" />;
  if (role !== required) {
    return <Navigate to={role === 'teacher' ? '/teacher' : '/student'} replace />;
  }
  return <Outlet />;
}

function AppRoutes() {
  const { user, setUser } = useAuth();

  return (
    <Routes>
      {/* ── Landing ── */}
      <Route path="/" element={<Landing />} />

      {/* ── Public / redirect-if-authed ── */}
      <Route element={<RedirectIfAuthed />}>
        <Route path="/login"    element={<Login    onLogin={setUser} />} />
        <Route path="/register" element={<Register onLogin={setUser} />} />
      </Route>

      {/* ── Protected routes ── */}
      <Route element={<RequireAuth />}>

        {/* Teacher routes */}
        <Route element={<RequireRole role="teacher" />}>
          <Route path="/teacher"                                          element={<TeacherDashboard user={user} />} />
          <Route path="/teacher/classroom/:classroomId"                  element={<ClassroomView    user={user} />} />
          <Route path="/teacher/classroom/:classroomId/unit/:unitId"     element={<UnitEditor       user={user} />} />
        </Route>

        {/* Student routes */}
        <Route element={<RequireRole role="student" />}>
          <Route path="/student"                                                       element={<StudentDashboard user={user} />} />
          <Route path="/student/classroom/:classroomId"                               element={<StudentClassroom user={user} />} />
          <Route path="/student/classroom/:classroomId/unit/:unitId"                  element={<StudentUnit      user={user} />} />
          <Route path="/student/classroom/:classroomId/unit/:unitId/notes"            element={<NotesView        user={user} />} />
          <Route path="/student/classroom/:classroomId/unit/:unitId/personas"         element={<PersonaChat      user={user} />} />
          <Route path="/student/classroom/:classroomId/unit/:unitId/quiz"             element={<QuizView         user={user} />} />
          <Route path="/student/classroom/:classroomId/unit/:unitId/assignment"       element={<AssignmentView user={user} />} />
        </Route>

      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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