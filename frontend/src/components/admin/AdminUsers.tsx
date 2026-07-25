import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, AdminUser } from '../../services/admin';
import { Loader2, Trash2, ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export const AdminUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.listUsers });

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.setUserActive(id, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">User</th>
            <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
            <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Documents</th>
            <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chunks</th>
            <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users?.map((u: AdminUser) => (
            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                    {u.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{u.name || u.email.split('@')[0]}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] font-bold capitalize',
                    u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {u.role}
                </span>
              </td>
              <td className="px-5 py-3 font-medium text-slate-700 tabular-nums">{u.documents}</td>
              <td className="px-5 py-3 font-medium text-slate-700 tabular-nums">{u.chunks}</td>
              <td className="px-5 py-3">
                <button
                  onClick={() => toggle.mutate({ id: u.id, is_active: !u.is_active })}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                    u.is_active
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}
                >
                  {u.is_active ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="px-5 py-3 text-right">
                <button
                  onClick={() => {
                    if (confirm(`Delete user ${u.email}?`)) remove.mutate(u.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
