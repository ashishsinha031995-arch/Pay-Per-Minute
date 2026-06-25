import React from 'react';

interface RoleRouteProps {
  currentRole: 'user' | 'consultant' | 'admin';
  allowedRoles: ('user' | 'consultant' | 'admin')[];
  fallback: React.ReactNode;
  children: React.ReactNode;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ currentRole, allowedRoles, fallback, children }) => {
  if (!allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};
