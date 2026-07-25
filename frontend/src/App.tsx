import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { Workspace } from './pages/Workspace';
import { AboutPage } from './components/AboutPage';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { AdminRoute, ProtectedRoute } from './components/RouteGuards';
import { useAuthStore } from './store/useAuthStore';

const queryClient = new QueryClient();

const App: React.FC = () => {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Workspace />} />
            <Route path="/about" element={<AboutPage />} />
          </Route>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
