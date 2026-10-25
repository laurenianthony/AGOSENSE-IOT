import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, UserCheck } from 'lucide-react';
import api from '../api/axios';

export default function PendingUsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [error, setError] = useState('');

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/pending-users');
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load pending user registrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(fetchPendingUsers, 0);
    return () => window.clearTimeout(timer);
  }, [fetchPendingUsers]);

  const approveUser = async (userId) => {
    setApprovingId(userId);
    setError('');
    try {
      await api.post(`/admin/approve-user/${userId}`);
      setUsers((current) => current.filter((user) => user.id !== userId));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to approve this user. Please try again.');
    } finally {
      setApprovingId(null);
    }
  };

  return <section className="mx-auto w-full max-w-5xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-400">Account management</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Pending user approvals</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Review new registrations before granting dashboard access.</p>
      </div>
      <button type="button" onClick={fetchPendingUsers} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
        <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh
      </button>
    </div>

    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}

    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[560px] divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          <tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Registered</th><th className="px-4 py-3 text-right font-semibold">Action</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {loading ? <tr><td colSpan="4" className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">Loading pending registrations…</td></tr>
            : users.length === 0 ? <tr><td colSpan="4" className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"><span className="inline-flex items-center gap-2"><UserCheck size={18}/> No users are waiting for approval.</span></td></tr>
              : users.map((user) => <tr key={user.id} className="text-slate-800 dark:text-slate-200">
                <td className="px-4 py-3 font-semibold">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-right"><button type="button" onClick={() => approveUser(user.id)} disabled={approvingId !== null} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cyan-600 dark:hover:bg-cyan-500">{approvingId === user.id ? <RefreshCw size={14} className="animate-spin"/> : <Check size={14}/>} {approvingId === user.id ? 'Approving…' : 'Approve'}</button></td>
              </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}
