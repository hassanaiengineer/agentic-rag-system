import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  ZoomIn,
  ZoomOut,
  FileWarning,
} from 'lucide-react';
import { API_BASE, authHeaders } from '../services/apiClient';
import { useUIStore } from '../store/useUIStore';

// Load the pdf.js worker from a CDN pinned to the bundled version (no Vite worker config needed).
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const EmptyState: React.FC<{ icon: React.ElementType; title: string; subtitle: string }> = ({
  icon: Icon,
  title,
  subtitle,
}) => (
  <div className="h-full flex flex-col items-center justify-center text-center px-8 text-slate-400">
    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-slate-400" />
    </div>
    <p className="text-sm font-semibold text-slate-600">{title}</p>
    <p className="text-xs mt-1 max-w-xs leading-relaxed">{subtitle}</p>
  </div>
);

export const PdfViewer: React.FC = () => {
  const selectedDocument = useUIStore((s) => s.selectedDocument);
  const pdfPage = useUIStore((s) => s.pdfPage);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  const isPdf = !!selectedDocument && selectedDocument.toLowerCase().endsWith('.pdf');

  const fileConfig = useMemo(() => {
    if (!selectedDocument || !isPdf) return null;
    return {
      url: `${API_BASE}/files/${encodeURIComponent(selectedDocument)}`,
      httpHeaders: authHeaders(),
    };
  }, [selectedDocument, isPdf]);

  // Follow citation-driven page jumps from the chat.
  useEffect(() => {
    if (pdfPage) setPage(pdfPage);
  }, [pdfPage]);

  useEffect(() => {
    setError(false);
    setNumPages(0);
  }, [selectedDocument]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver(() => {
      setWidth(Math.max(280, el.clientWidth - 48));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const clampedPage = Math.min(Math.max(1, page), numPages || 1);

  return (
    <div className="h-full flex flex-col bg-slate-100/60 min-w-0">
      {/* Toolbar */}
      <div className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 truncate">
            {selectedDocument || 'No document selected'}
          </span>
        </div>
        {isPdf && numPages > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div ref={containerRef} className="flex-1 overflow-auto p-6 flex justify-center">
        {!selectedDocument ? (
          <EmptyState
            icon={FileText}
            title="Select a document"
            subtitle="Pick a file from the Knowledge Base to preview it here. Cited pages will jump into view as you chat."
          />
        ) : !isPdf ? (
          <EmptyState
            icon={FileWarning}
            title="Preview unavailable"
            subtitle="Inline preview is available for PDF files. This document is still fully searchable in chat."
          />
        ) : error ? (
          <EmptyState
            icon={FileWarning}
            title="Couldn't load preview"
            subtitle="The file could not be rendered, but it remains indexed and searchable."
          />
        ) : (
          <Document
            file={fileConfig!}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={() => setError(true)}
            loading={
              <div className="flex items-center justify-center h-64 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            }
          >
            <div className="shadow-lg rounded-lg overflow-hidden bg-white">
              <Page
                pageNumber={clampedPage}
                width={width}
                scale={scale}
                renderTextLayer
                renderAnnotationLayer={false}
              />
            </div>
          </Document>
        )}
      </div>

      {/* Page navigation */}
      {isPdf && numPages > 0 && !error && (
        <div className="h-12 border-t border-slate-200 bg-white flex items-center justify-center gap-4 shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={clampedPage <= 1}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600 tabular-nums">
            Page {clampedPage} / {numPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={clampedPage >= numPages}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
