import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { Clients } from './pages/Clients.js';
import { Suppliers } from './pages/Suppliers.js';
import { Channels } from './pages/Channels.js';
import { ContentTypes } from './pages/ContentTypes.js';
import { Contents } from './pages/Contents.js';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white font-bold text-sm">
        جاري تحميل نظام OMS Media...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedLayout>
                <Clients />
              </ProtectedLayout>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedLayout>
                <Suppliers />
              </ProtectedLayout>
            }
          />
          <Route
            path="/channels"
            element={
              <ProtectedLayout>
                <Channels />
              </ProtectedLayout>
            }
          />
          <Route
            path="/content-types"
            element={
              <ProtectedLayout>
                <ContentTypes />
              </ProtectedLayout>
            }
          />
          <Route
            path="/contents"
            element={
              <ProtectedLayout>
                <Contents />
              </ProtectedLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
