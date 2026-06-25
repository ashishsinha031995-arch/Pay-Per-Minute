import React from 'react';

export default function ProfilePage() {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm mx-auto my-12">
      <h2 className="text-xl font-bold text-emerald-400">User Profile Route</h2>
      <p className="text-xs text-slate-400 mt-2 text-center">
        Review your credentials, wallet statements and past sessions details directly in the main portal profile editor.
      </p>
    </div>
  );
}
