import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileText,
  UploadCloud,
  LayoutDashboard,
  Library,
  ShieldCheck,
  Plus,
  MoreVertical,
  Trash2,
  LogOut,
} from 'lucide-react';
import { api } from '../services/apiClient';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';

interface DocItem {
  name: string;
  chunks: number;
}

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 w-full px-3 py-2 text-sm font-semibold rounded-xl transition-all text-left',
    isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
  );

export const Sidebar: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const selectedDocument = useUIStore((s) => s.selectedDocument);
  const selectDocument = useUIStore((s) => s.selectDocument);

  const [isUploading, setIsUploading] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: docData, isLoading } = useQuery<DocItem[]>({
    queryKey: ['documents', user?.tenant_id],
    queryFn: async () => (await api.get('/documents')).data.documents,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return (await api.post('/upload', formData)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsUploading(false);
    },
    onError: () => setIsUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (docName: string) =>
      (await api.delete(`/documents/${encodeURIComponent(docName)}`)).data,
    onSuccess: (_data, docName) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (selectedDocument === docName) selectDocument(null);
      setActiveMenu(null);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      uploadMutation.mutate(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleDelete = (e: React.MouseEvent, docName: string) => {
    e.stopPropagation();
    if (confirm(`Delete "${docName}"? This removes all of its indexed data.`)) {
      deleteMutation.mutate(docName);
    }
  };

  const initials = (user?.name || user?.email || '?')
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <div
      className="w-64 border-r border-slate-200 bg-slate-50/50 flex flex-col h-screen shrink-0 relative"
      onClick={() => setActiveMenu(null)}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-blue-600 tracking-tight text-lg italic">RAG.ai</span>
        </div>

        <nav className="space-y-1">
          <NavLink to="/" end className={navItemClass}>
            <LayoutDashboard className="w-4 h-4" />
            Workspace
          </NavLink>
          <NavLink to="/about" className={navItemClass}>
            <Library className="w-4 h-4" />
            About this RAG
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navItemClass}>
              <ShieldCheck className="w-4 h-4" />
              Admin
            </NavLink>
          )}
        </nav>
      </div>

      <div className="flex-1 px-4 overflow-y-auto mt-4">
        <div className="flex items-center justify-between px-2 mb-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Knowledge Base
          </span>
          <label className="cursor-pointer hover:text-blue-600 transition-colors">
            <Plus className="w-4 h-4" />
            <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx" />
          </label>
        </div>

        {isLoading ? (
          <div className="space-y-3 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : docData && docData.length > 0 ? (
          <div className="space-y-1">
            {docData.map((doc) => (
              <div
                key={doc.name}
                onClick={() => selectDocument(doc.name)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer group relative',
                  selectedDocument === doc.name ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-slate-100'
                )}
              >
                <FileText
                  className={cn(
                    'w-4 h-4 shrink-0',
                    selectedDocument === doc.name ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{doc.chunks} fragments</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === doc.name ? null : doc.name);
                  }}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-all text-slate-400 hover:text-slate-600"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {activeMenu === doc.name && (
                  <div className="absolute right-0 top-8 w-32 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={(e) => handleDelete(e, doc.name)}
                      className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 text-xs text-slate-400 leading-relaxed">
            No documents yet. Click <span className="font-semibold">+</span> to upload a PDF or DOCX.
          </p>
        )}

        {isUploading && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3 animate-pulse">
            <UploadCloud className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-blue-700">Indexing…</span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 relative">
        {userMenuOpen && (
          <div className="absolute bottom-16 left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-200 z-50">
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
        <div
          onClick={() => setUserMenuOpen((v) => !v)}
          className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">{user?.name || user?.email}</p>
              <p className="text-[10px] text-slate-400 font-semibold capitalize">{user?.role}</p>
            </div>
          </div>
          <LogOut className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
    </div>
  );
};
