import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { UserRole } from '../../types/index.js';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#64748B] text-sm font-medium font-heading">
          Loading jewellery workspace...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
};
