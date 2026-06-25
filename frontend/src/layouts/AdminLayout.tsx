import React from 'react';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="admin-layout min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex-1">
        {children}
      </div>
    </div>
  );
};
