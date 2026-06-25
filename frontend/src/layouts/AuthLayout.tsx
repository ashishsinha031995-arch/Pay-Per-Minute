import React from 'react';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="auth-layout flex items-center justify-center min-h-screen bg-slate-950 p-4">
      <div className="max-w-md w-full">
        {children}
      </div>
    </div>
  );
};
