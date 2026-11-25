import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { LanguageProvider } from './context/LanguageContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { Invoices } from './pages/Invoices.js';
import { CreateInvoice } from './pages/CreateInvoice.js';
import { InvoiceDetail } from './pages/InvoiceDetail.js';
import { Approvals } from './pages/Approvals.js';
import { Payments } from './pages/Payments.js';
import { Clients } from './pages/Clients.js';
import { Services } from './pages/Services.js';
import { Settings } from './pages/Settings.js';
import { AuditLogs } from './pages/AuditLogs.js';
import { Reports } from './pages/Reports.js';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center text-white font-bold">
        جاري تحميل نظام OMS Invoice...
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
        <div className="no-print">
          <Sidebar />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
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
              path="/invoices"
              element={
                <ProtectedLayout>
                  <Invoices />
                </ProtectedLayout>
              }
            />
            <Route
              path="/invoices/new"
              element={
                <ProtectedLayout>
                  <CreateInvoice />
                </ProtectedLayout>
              }
            />
            <Route
              path="/invoices/:id"
              element={
                <ProtectedLayout>
                  <InvoiceDetail />
                </ProtectedLayout>
              }
            />
            <Route
              path="/approvals"
              element={
                <ProtectedLayout>
                  <Approvals />
                </ProtectedLayout>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedLayout>
                  <Payments />
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
              path="/services"
              element={
                <ProtectedLayout>
                  <Services />
                </ProtectedLayout>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedLayout>
                  <Reports />
                </ProtectedLayout>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedLayout>
                  <AuditLogs />
                </ProtectedLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedLayout>
                  <Settings />
                </ProtectedLayout>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </LanguageProvider>
  );
};
export default App;
