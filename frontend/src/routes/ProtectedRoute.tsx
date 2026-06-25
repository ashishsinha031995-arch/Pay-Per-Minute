import React from 'react';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  onRedirect: () => void;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ isAuthenticated, onRedirect, children }) => {
  React.useEffect(() => {
    if (!isAuthenticated) {
      onRedirect();
    }
  }, [isAuthenticated, onRedirect]);

  return isAuthenticated ? <>{children}</> : null;
};
