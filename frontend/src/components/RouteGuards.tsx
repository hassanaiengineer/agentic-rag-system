import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const FullScreenLoader = () => (
  <div className="h-screen flex items-center justify-center bg-white">
    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
  </div>
);

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const status = useAuthStore((s) => s.status);
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};
