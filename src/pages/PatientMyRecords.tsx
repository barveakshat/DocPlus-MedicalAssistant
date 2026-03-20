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

    if (error || !files) {
      setRecords([]);
      setLoading(false);
      return;
    }

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
            (f.name.endsWith('.pdf')
              ? 'application/pdf'
              : f.name.match(/\.(png|jpg|jpeg|webp|gif)$/i)
              ? 'image/jpeg'
              : 'application/octet-stream');

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

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !patientId) return;
    setUploading(true);
    setUploadProgress(0);

    const files = Array.from(fileList);
    let done = 0;

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 10 MB limit.`,
          variant: 'destructive',
        });
        done += 1;
        setUploadProgress(Math.round((done / files.length) * 100));
        continue;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${bucketFolder}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage
        .from('chat-attachments')
        .upload(path, file, { upsert: false, contentType: file.type });

      if (error) {
        toast({
          title: 'Upload failed',
          description: `Could not upload ${file.name}: ${error.message}`,
          variant: 'destructive',
        });
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
    const { error } = await supabase.storage
      .from('chat-attachments')
      .remove([record.path]);

    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setRecords((prev) => prev.filter((r) => r.path !== record.path));
    toast({ title: 'File removed', description: `${record.name} has been deleted.` });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Medical Records</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload and manage your personal health documents. Your doctor can view these files.
          </p>
        </div>

        {/* Upload area */}
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Upload className="h-4 w-4 text-[#5442f5]" />
            Upload documents
          </div>
          <p className="text-xs text-slate-500">
            Accepted: PDF, PNG, JPG, JPEG, WEBP — max 10 MB each
          </p>
          <Input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
            multiple
            disabled={uploading}
            onChange={(e) => void handleUpload(e.target.files)}
          />
          {uploading && (
            <div className="space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-slate-500">Uploading... {uploadProgress}%</p>
            </div>
          )}
        </div>

        {/* Records list */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-800">Uploaded Files</span>
            <Badge variant="secondary" className="ml-auto">
              {records.length} file{records.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No records yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload your first document above.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {records.map((record) => (
                <div
                  key={record.path}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  {record.mimeType.startsWith('image/') ? (
                    <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{record.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatSize(record.size)} •{' '}
                      {new Date(record.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {record.signedUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-blue-600"
                        asChild
                      >
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientMyRecords;
