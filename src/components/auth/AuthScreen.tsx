import React from 'react';
import { ShieldCheck, LogIn, AlertOctagon, GraduationCap, Calendar, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { user, isAdmin, authError, signInWithGoogle, signOutUser, loading, authorizedEmails } = useAuth();

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 text-center space-y-6">
        {/* Brand Header */}
        <div className="space-y-3">
          <div className="inline-flex p-3 bg-blue-600 text-white rounded-xl shadow-md">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Department Timetable Planner
          </h1>
          <p className="text-sm text-slate-500">
            University Academic Timetabling & Optimization Portal
          </p>
        </div>

        {/* Security / Authorization Note */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Administrator Access Control</span>
          </div>
          <p>
            Access is restricted to explicitly authorized university departmental administrators.
            All schedule matrices, rooms, and teacher constraints are secured via server-side authorization and Firestore security rules.
          </p>
          <div className="pt-1 border-t border-slate-200/60 text-slate-500">
            <span className="font-medium text-slate-700">Authorized Admin: </span>
            <code className="text-blue-600 font-mono text-[11px]">{authorizedEmails[0] || 'shivangshukla884@gmail.com'}</code>
          </div>
        </div>

        {/* Access Denied State (User logged in but not an authorized admin) */}
        {user && !isAdmin && (
          <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-left text-xs text-red-700 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold text-red-800">
              <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
              <span>Unauthorized Account</span>
            </div>
            <p>
              Signed in as <strong>{user.email}</strong>. This account does not possess department administrator credentials.
            </p>
            <button
              onClick={signOutUser}
              className="mt-2 w-full py-2 px-3 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors shadow-xs"
            >
              Sign Out & Switch Account
            </button>
          </div>
        )}

        {/* Auth Error Notification */}
        {authError && !user && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs text-left">
            {authError}
          </div>
        )}

        {/* Sign In CTA */}
        {!user && (
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={signInWithGoogle}
              className="w-full inline-flex items-center justify-center gap-3 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-60 cursor-pointer text-sm"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Authenticating...' : 'Sign In with Google Administrator Account'}
            </button>
            <p className="text-[11px] text-slate-400">
              Uses Firebase Authentication via secure popup
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-400 max-w-sm space-y-1">
        <p>Department Timetable Planner • Automated University Scheduling</p>
        <p>Prepared for Operations Research & Constraint Optimization</p>
      </div>
    </div>
  );
};
