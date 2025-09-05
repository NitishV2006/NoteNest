
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Home from './components/Home';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import FacultyDashboard from './components/FacultyDashboard';
import AdminDashboard from './components/AdminDashboard';
import Profile from './components/Profile';
import { UserRole } from './types';

const PrivateRoute: React.FC<{ children: JSX.Element; roles: UserRole[] }> = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/" />;
  }
  return children;
};

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" />;
    }

    switch (user.role) {
        case UserRole.STUDENT:
            return <StudentDashboard />;
        case UserRole.FACULTY:
            return <FacultyDashboard />;
        case UserRole.ADMIN:
            return <AdminDashboard />;
        default:
            return <Navigate to="/" />;
    }
};

function AppContent() {
  return (
    <HashRouter>
      <Header />
      <main className="container mx-auto p-4 md:p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute roles={[UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN]}>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <PrivateRoute roles={[UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN]}>
                <Profile />
              </PrivateRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </HashRouter>
  );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}