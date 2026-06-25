import React from 'react';

export default function PaymentPage() {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm mx-auto my-12">
      <h2 className="text-xl font-bold text-emerald-400">Payment Verification</h2>
      <p className="text-xs text-slate-400 mt-2 text-center">
        Transactions are processed securely via automated triggers.
      </p>
    </div>
  );
}
