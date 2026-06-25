import React from 'react';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm mx-auto my-12">
      <h2 className="text-xl font-bold text-emerald-400">Login Route</h2>
      <p className="text-xs text-slate-400 mt-2 text-center">
        This view is unified inside the overlay authentication modal for instant single-page flow optimization.
      </p>
    </div>
  );
}
