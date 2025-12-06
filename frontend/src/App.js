import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ConfirmProvider } from './context/ConfirmContext';
import './styles/global.css';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/layout/Layout';
import Dashboard from './pages/admin/Dashboard';
import Athletes from './pages/admin/Athletes';
import Trainings from './pages/admin/Trainings';
import Attendance from './pages/admin/Attendance';
import Documents from './pages/admin/Documents';
import AdminPayments from './pages/admin/Payments';
import AdminSchedule from './pages/admin/Schedule';
import AthleteLayout from './components/layout/AthleteLayout';
import AthleteDashboard from './pages/athlete/Dashboard';
import Profile from './pages/athlete/Profile';
import MyTrainings from './pages/athlete/MyTrainings';
import AthletePayments from './pages/athlete/Payments';
import './App.css';

// Protected Route Component
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Chargement...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Role Redirect Component
const RoleRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'admin' || user?.role === 'coach') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/athlete" replace />;
};



function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ConfirmProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <RoleRedirect />
                    </PrivateRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <PrivateRoute>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="athletes" element={<Athletes />} />
                  <Route path="trainings" element={<Trainings />} />
                  <Route path="trainings/:id/attendance" element={<Attendance />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="schedule" element={<AdminSchedule />} />
                </Route>

                {/* Athlete Routes */}
                <Route
                  path="/athlete"
                  element={
                    <PrivateRoute>
                      <AthleteLayout />
                    </PrivateRoute>
                  }
                >
                  <Route index element={<AthleteDashboard />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="trainings" element={<MyTrainings />} />
                  <Route path="payments" element={<AthletePayments />} />
                </Route>
              </Routes>
            </div>
          </Router>
        </ConfirmProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;