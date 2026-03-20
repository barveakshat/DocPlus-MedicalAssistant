import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Download,
  FolderOpen,
  FilePlus,
  ShieldCheck,
} from 'lucide-react';

interface PatientRecord {
  name: string;
  path: string;
  size: number;
  created_at: string;
  signedUrl: string | null;
  mimeType: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PatientMyRecords: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const patientId = user?.id;
  const bucketFolder = `patient-records/${patientId}`;

  const fetchRecords = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const { data: files, error } = await supabase.storage
      .from('chat-attachments')
      .list(bucketFolder, { sortBy: { column: 'created_at', order: 'desc' } });

    if (error || !files) { setRecords([]); setLoading(false); return; }

    const enriched: PatientRecord[] = await Promise.all(
      files
        .filter((f) => f.name !== '.emptyFolderPlaceholder')
        .map(async (f) => {
          const path = `${bucketFolder}/${f.name}`;
          const { data: signed } = await supabase.storage
            .from('chat-attachments')
            .createSignedUrl(path, 60 * 60 * 24 * 7);
          const mimeType =
            f.metadata?.mimetype ||
            (f.name.endsWith('.pdf') ? 'application/pdf' :
              f.name.match(/\.(png|jpg|jpeg|webp|gif)$/i) ? 'image/jpeg' : 'application/octet-stream');
          return {
            name: f.name,
            path,
            size: f.metadata?.size ?? 0,
            created_at: f.created_at ?? new Date().toISOString(),
            signedUrl: signed?.signedUrl ?? null,
            mimeType,
          };
        })
    );
    setRecords(enriched);
    setLoading(false);
  }, [patientId, bucketFolder]);

  useEffect(() => { void fetchRecords(); }, [fetchRecords]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !patientId) return;
    setUploading(true);
    setUploadProgress(0);
    const files = Array.from(fileList);
    let done = 0;

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${file.name} exceeds 10 MB limit.`, variant: 'destructive' });
        done += 1;
        setUploadProgress(Math.round((done / files.length) * 100));
        continue;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${bucketFolder}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from('chat-attachments').upload(path, file, { upsert: false, contentType: file.type });
      if (error) {
        toast({ title: 'Upload failed', description: `Could not upload ${file.name}: ${error.message}`, variant: 'destructive' });
      }
      done += 1;
      setUploadProgress(Math.round((done / files.length) * 100));
    }

    toast({ title: 'Upload complete', description: 'Your records have been saved.' });
    setUploading(false);
    setUploadProgress(0);
    void fetchRecords();
  };

  const handleDelete = async (record: PatientRecord) => {
    const { error } = await supabase.storage.from('chat-attachments').remove([record.path]);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setRecords((prev) => prev.filter((r) => r.path !== record.path));
    toast({ title: 'File removed', description: `${record.name} has been deleted.` });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto" style={{ background: '#eef5fc' }}>

      {/* Page Header Banner */}
      <div
        className="relative overflow-hidden px-8 py-6 shrink-0"
        style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div className="absolute top-3 right-28 w-20 h-20 rounded-full opacity-10 bg-white" />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="h-4 w-4 text-white/70" />
            <span className="text-white/70 text-sm font-medium">Health Records</span>
          </div>
          <h1 className="text-[24px] font-bold text-white tracking-tight mb-1">My Medical Records</h1>
          <p className="text-white/70 text-[14px] font-medium">
            Upload and manage your personal health documents. Your doctor can view these files.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-5">

        {/* Security note */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: '#f0f6fc', borderColor: '#c0dcf5' }}
        >
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#1868b7]" />
          <p className="text-[13px] font-medium text-[#1868b7]">
            Your records are encrypted and securely stored. Only you and your assigned doctor can access them.
          </p>
        </div>

        {/* Upload Area */}
        <div
          className="bg-white border-2 border-dashed rounded-xl p-6 space-y-4 transition-all"
          style={{ borderColor: '#c0dcf5' }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl shrink-0" style={{ background: '#f0f6fc' }}>
              <FilePlus className="h-6 w-6 text-[#1868b7]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-slate-800 mb-0.5">Upload Documents</p>
              <p className="text-xs text-slate-400">
                Accepted: PDF, PNG, JPG, JPEG, WEBP — max 10 MB each
              </p>
            </div>
          </div>

          <div className="relative">
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
              multiple
              disabled={uploading}
              onChange={(e) => void handleUpload(e.target.files)}
              className="border-[#c0dcf5] focus-visible:ring-[#1868b7]"
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-[#1868b7]">Uploading files...</span>
                <span className="text-slate-500">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Files List */}
        <div className="bg-white border border-[#cddff0] rounded-xl overflow-hidden shadow-sm">
          <div
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #f7fbff, #f0f6fc)' }}
          >
            <div className="p-1.5 rounded-lg" style={{ background: '#dceaf6' }}>
              <FolderOpen className="h-4 w-4 text-[#1868b7]" />
            </div>
            <span className="text-[14px] font-bold text-slate-800">Uploaded Files</span>
            <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#dceaf6] text-[#1868b7]">
              {records.length} file{records.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#1868b7]" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: '#f0f6fc' }}>
                <FolderOpen className="h-7 w-7 text-[#c0dcf5]" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No records yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload your first document above.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f0f6fc]">
              {records.map((record) => {
                const isImage = record.mimeType.startsWith('image/');
                const isPdf = record.mimeType === 'application/pdf';
                return (
                  <div
                    key={record.path}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-[#f7fbff] transition-colors"
                  >
                    <div className="p-2.5 rounded-xl shrink-0" style={{ background: isImage ? '#f0f7ff' : '#f5f0ff', border: `1px solid ${isImage ? '#c0dcf5' : '#d4c0f5'}` }}>
                      {isImage ? (
                        <ImageIcon className="h-5 w-5 text-[#1868b7]" />
                      ) : (
                        <FileText className="h-5 w-5 text-purple-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{record.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatSize(record.size)} · {new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {record.signedUrl && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#1868b7]" asChild>
                          <a href={record.signedUrl} target="_blank" rel="noopener noreferrer" download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                        onClick={() => void handleDelete(record)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientMyRecords;
