import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../store/useUIStore';
import { 
  FileText, 
  UploadCloud, 
  LayoutDashboard, 
  Library, 
  Settings, 
  ChevronDown,
  Plus,
  MoreVertical,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import { cn } from '../lib/utils';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const Sidebar: React.FC = () => {
  const tenantId = useUIStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const { data: docData, isLoading } = useQuery({
    queryKey: ['documents', tenantId],
    queryFn: async () => {
      const res = await axios.get(`${BASE_URL}/documents`, {
        headers: { 'X-Tenant-ID': tenantId }
      });
      return res.data.documents;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${BASE_URL}/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'X-Tenant-ID': tenantId 
        }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (docName: string) => {
      const res = await axios.delete(`${BASE_URL}/documents/${encodeURIComponent(docName)}`, {
        headers: { 'X-Tenant-ID': tenantId }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setActiveMenu(null);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      uploadMutation.mutate(e.target.files[0]);
    }
  };

  const toggleMenu = (e: React.MouseEvent, docName: string) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === docName ? null : docName);
  };

  const handleDelete = (e: React.MouseEvent, docName: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${docName}"? This will remove all its data from the system.`)) {
      deleteMutation.mutate(docName);
    }
  };

  return (
    <div className="w-64 border-r border-slate-200 bg-slate-50/50 flex flex-col h-screen shrink-0 relative" onClick={() => setActiveMenu(null)}>
      <div className="p-6">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-lg italic">RAG.ai</span>
        </div>

        <nav className="space-y-1">
          <button 
            onClick={() => useUIStore.getState().setView('workspace')}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 text-sm font-semibold rounded-xl transition-all text-left",
              useUIStore((state) => state.view) === 'workspace' 
                ? "text-blue-600 bg-blue-50" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Workspace
          </button>
          <button 
            onClick={() => useUIStore.getState().setView('about')}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 text-sm font-semibold rounded-xl transition-all text-left",
              useUIStore((state) => state.view) === 'about' 
                ? "text-blue-600 bg-blue-50" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <Library className="w-4 h-4" />
            About this RAG
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all text-left">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>
      </div>

      <div className="flex-1 px-4 overflow-y-auto mt-4">
        <div className="flex items-center justify-between px-2 mb-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Knowledge Base</span>
          <label className="cursor-pointer hover:text-blue-600 transition-colors">
            <Plus className="w-4 h-4" />
            <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx" />
          </label>
        </div>

        {isLoading ? (
          <div className="space-y-3 px-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {docData?.map((doc: any) => (
              <div key={doc.name} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all cursor-default group relative">
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{doc.chunks} fragments</p>
                </div>
                
                <button 
                  onClick={(e) => toggleMenu(e, doc.name)}
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
        )}

        {isUploading && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3 animate-pulse">
            <UploadCloud className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-blue-700">Syncing...</span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-[10px] font-bold text-emerald-700">
              HK
            </div>
            <span className="text-xs font-bold text-slate-700">Hassan Khan</span>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>
      </div>
    </div>
  );
};
