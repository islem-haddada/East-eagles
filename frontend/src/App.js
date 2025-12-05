import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/layout/Layout';
import Dashboard from './pages/admin/Dashboard';
import Athletes from './pages/admin/Athletes';
import Trainings from './pages/admin/Trainings';
import Attendance from './pages/admin/Attendance';
import './App.css';

// Protected Route Component
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Chargement...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};



function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Navigate to="/admin" replace />
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
              {/* <Route path="documents" element={<Documents />} /> */}
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;