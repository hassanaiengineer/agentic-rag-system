import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminApi } from '../../services/admin';
import { Activity, Clock, FileStack, Loader2, MessageSquare, Users } from 'lucide-react';

const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#db2777'];

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; accent: string }> = ({
  icon: Icon,
  label,
  value,
  accent,
}) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
  </div>
);

export const AdminAnalytics: React.FC = () => {
  const { data, isLoading } = useQuery({ queryKey: ['admin-analytics'], queryFn: adminApi.getAnalytics });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Total Queries" value={data.total_queries} accent="bg-blue-50 text-blue-600" />
        <StatCard icon={Users} label="Users" value={data.total_users} accent="bg-violet-50 text-violet-600" />
        <StatCard icon={FileStack} label="Documents" value={data.total_documents} accent="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Clock} label="Avg Latency" value={`${(data.avg_latency_ms / 1000).toFixed(2)}s`} accent="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" /> Queries over time
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.daily_queries} margin={{ left: -20, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="q" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(d) => d?.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fill="url(#q)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Intent breakdown</h3>
          {data.intent_breakdown.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-16">No queries yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.intent_breakdown}
                  dataKey="count"
                  nameKey="intent"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {data.intent_breakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {data.intent_breakdown.map((it, i) => (
              <div key={it.intent} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="capitalize font-medium">{it.intent}</span>
                <span className="text-slate-400">({it.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Recent queries</h3>
        {data.recent_queries.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No activity recorded yet.</p>
        ) : (
          <div className="space-y-1">
            {data.recent_queries.map((q, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize shrink-0 ${
                    q.intent === 'chitchat' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {q.intent}
                </span>
                <span className="text-sm text-slate-700 truncate flex-1">{q.query}</span>
                <span className="text-xs text-slate-400 shrink-0 hidden sm:block">{q.user_email}</span>
                <span className="text-xs text-slate-400 shrink-0 tabular-nums">
                  {(q.latency_ms / 1000).toFixed(2)}s
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
