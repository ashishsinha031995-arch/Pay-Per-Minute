import React from 'react';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="dashboard-layout min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="max-w-7xl w-full mx-auto p-4 flex-1">
        {children}
      </div>
    </div>
  );
};
