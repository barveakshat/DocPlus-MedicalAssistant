import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { HuggingFaceService } from '@/services/huggingFaceService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  AlertTriangle,
  FileText,
  Image,
  Loader2,
  ScanLine,
  Sparkles,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';

export type MetricType = 'glucose' | 'systolic' | 'diastolic' | 'hba1c' | 'hemoglobin';

export interface ExtractedMetric {
  id: string;
  type: MetricType;
  label: string;
  value: number;
  unit: string;
  source: string;
  recordedAt: string;
  abnormal: boolean;
  reference: string;
}

export interface ReportAlert {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium';
  timestamp: string;
}

interface UploadedReport {
  id: string;
  name: string;
  mimeType: string;
  uploadedAt: string;
  sizeInBytes: number;
  status: 'processing' | 'processed' | 'failed';
  processingMessage?: string;
  extractedMetrics: ExtractedMetric[];
  alerts: ReportAlert[];
  extractedText?: string;
}

interface PersistedReportsState {
  reports: UploadedReport[];
  aiAnalysis: string;
  aiAnalysisUpdatedAt: string | null;
}

export interface ReportsInsights {
  metrics: ExtractedMetric[];
  alerts: ReportAlert[];
  reportCount: number;
}

interface ReportsDocumentsHubProps {
  patientName: string;
  patientId: string;
  onInsightsChange?: (insights: ReportsInsights) => void;
}

const chartConfig = {
  glucose: {
    label: 'Glucose',
    color: 'hsl(var(--chart-2))',
  },
  systolic: {
    label: 'Systolic',
    color: 'hsl(var(--chart-1))',
  },
  diastolic: {
    label: 'Diastolic',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

const createMetric = (
  type: MetricType,
  value: number,
  source: string,
  recordedAt: string,
  index: number,
  overrideLabel?: string
): ExtractedMetric | null => {
  if (Number.isNaN(value)) return null;

  if (type === 'glucose') {
    return {
      id: `${source}-glucose-${index}`,
      type,
      label: overrideLabel || 'Glucose',
      value,
      unit: 'mg/dL',
      source,
      recordedAt,
      abnormal: value < 70 || value > 140,
      reference: '70-140 mg/dL',
    };
  }

  if (type === 'hba1c') {
    return {
      id: `${source}-hba1c-${index}`,
      type,
      label: 'HbA1c',
      value,
      unit: '%',
      source,
      recordedAt,
      abnormal: value >= 6.5,
      reference: '< 6.5%',
    };
  }

  if (type === 'hemoglobin') {
    return {
      id: `${source}-hemoglobin-${index}`,
      type,
      label: 'Hemoglobin',
      value,
      unit: 'g/dL',
      source,
      recordedAt,
      abnormal: value < 12 || value > 17,
      reference: '12-17 g/dL',
    };
  }

  if (type === 'systolic') {
    return {
      id: `${source}-systolic-${index}`,
      type,
      label: 'Systolic BP',
      value,
      unit: 'mmHg',
      source,
      recordedAt,
      abnormal: value >= 140 || value < 90,
      reference: '90-139 mmHg',
    };
  }

  return {
    id: `${source}-diastolic-${index}`,
    type: 'diastolic',
    label: 'Diastolic BP',
    value,
    unit: 'mmHg',
    source,
    recordedAt,
    abnormal: value >= 90 || value < 60,
    reference: '60-89 mmHg',
  };
};

const extractClinicalMetrics = (text: string, source: string, recordedAt: string) => {
  const metrics: ExtractedMetric[] = [];
  const normalized = text.toLowerCase();

  const glucoseMatches = Array.from(
    normalized.matchAll(/(?:glucose|blood\s*sugar|fbs|rbs)\D{0,20}(\d{2,3}(?:\.\d+)?)/g)
  );
  glucoseMatches.forEach((match, index) => {
    const metric = createMetric('glucose', Number(match[1]), source, recordedAt, index);
    if (metric) metrics.push(metric);
  });

  const bpMatches = Array.from(
    normalized.matchAll(/(?:bp|blood\s*pressure)\D{0,20}(\d{2,3})\s*[\/\\]\s*(\d{2,3})/g)
  );
  bpMatches.forEach((match, index) => {
    const systolic = createMetric('systolic', Number(match[1]), source, recordedAt, index);
    const diastolic = createMetric('diastolic', Number(match[2]), source, recordedAt, index);
    if (systolic) metrics.push(systolic);
    if (diastolic) metrics.push(diastolic);
  });

  const hba1cMatches = Array.from(normalized.matchAll(/(?:hba1c|a1c)\D{0,20}(\d(?:\.\d+)?)/g));
  hba1cMatches.forEach((match, index) => {
    const metric = createMetric('hba1c', Number(match[1]), source, recordedAt, index);
    if (metric) metrics.push(metric);
  });

  const hbMatches = Array.from(normalized.matchAll(/(?:hemoglobin|haemoglobin|hb)\D{0,20}(\d(?:\.\d+)?)/g));
  hbMatches.forEach((match, index) => {
    const metric = createMetric('hemoglobin', Number(match[1]), source, recordedAt, index);
    if (metric) metrics.push(metric);
  });

  return metrics;
};

const buildAlertsFromMetrics = (metrics: ExtractedMetric[]): ReportAlert[] => {
  const abnormal = metrics.filter((metric) => metric.abnormal);
  return abnormal.map((metric, index) => {
    const highSeverity =
      (metric.type === 'glucose' && metric.value >= 250) ||
      (metric.type === 'systolic' && metric.value >= 180) ||
      (metric.type === 'diastolic' && metric.value >= 120);

    return {
      id: `${metric.id}-alert-${index}`,
      title: `${metric.label} out of range`,
      description: `${metric.value} ${metric.unit} (${metric.reference}) in ${metric.source}`,
      severity: highSeverity ? 'high' : 'medium',
      timestamp: metric.recordedAt,
    };
  });
};

const fileToText = async (file: File, onProgress: (value: number, message: string) => void) => {
  if (file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
    onProgress(100, 'Parsed text report');
    return file.text();
  }

  if (file.type.startsWith('image/')) {
    onProgress(15, 'Running OCR on image...');
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const result = await worker.recognize(file);
    await worker.terminate();
    onProgress(100, 'Image OCR complete');
    return result.data.text || '';
  }

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    onProgress(15, 'Extracting text from PDF...');
    const pdfjs = await import('pdfjs-dist');
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer, disableWorker: true });
    const pdf = await loadingTask.promise;
    const pagesToRead = Math.min(pdf.numPages, 5);

    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const textItems = textContent.items as Array<{ str?: string }>;
      pageTexts.push(textItems.map((item) => item.str || '').join(' '));
      onProgress(Math.round((pageNumber / pagesToRead) * 100), `Reading PDF page ${pageNumber}/${pagesToRead}`);
    }

    return pageTexts.join('\n');
  }

  onProgress(100, 'Unsupported format for OCR');
  return '';
};

const ReportsDocumentsHub: React.FC<ReportsDocumentsHubProps> = ({
  patientName,
  patientId,
  onInsightsChange,
}) => {
  const { toast } = useToast();
  const [reports, setReports] = useState<UploadedReport[]>([]);
  const [manualText, setManualText] = useState('');
  const [processingProgress, setProcessingProgress] = useState<Record<string, number>>({});
  const [processingMessage, setProcessingMessage] = useState<Record<string, string>>({});
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiAnalysisUpdatedAt, setAiAnalysisUpdatedAt] = useState<string | null>(null);

  const storageKey = useMemo(() => `docplus-reports-hub-${patientId}`, [patientId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setReports([]);
        setAiAnalysis('');
        setAiAnalysisUpdatedAt(null);
        setProcessingMessage({});
        setProcessingProgress({});
        return;
      }

      const parsed = JSON.parse(raw) as PersistedReportsState;
      const hydratedReports = Array.isArray(parsed.reports) ? parsed.reports : [];
      setReports(
        hydratedReports.map((report) =>
          report.status === 'processing'
            ? {
                ...report,
                status: 'failed',
                processingMessage: 'Processing was interrupted. Please re-upload this report.',
              }
            : report
        )
      );
      setAiAnalysis(parsed.aiAnalysis || '');
      setAiAnalysisUpdatedAt(parsed.aiAnalysisUpdatedAt || null);
      setProcessingMessage({});
      setProcessingProgress({});
    } catch {
      setReports([]);
      setAiAnalysis('');
      setAiAnalysisUpdatedAt(null);
      setProcessingMessage({});
      setProcessingProgress({});
    }
  }, [storageKey]);

  useEffect(() => {
    const persistableState: PersistedReportsState = {
      reports,
      aiAnalysis,
      aiAnalysisUpdatedAt,
    };
    localStorage.setItem(storageKey, JSON.stringify(persistableState));
  }, [aiAnalysis, aiAnalysisUpdatedAt, reports, storageKey]);

  const allMetrics = useMemo(
    () => reports.flatMap((report) => report.extractedMetrics).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [reports]
  );

  const allAlerts = useMemo(
    () => reports.flatMap((report) => report.alerts).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [reports]
  );

  const glucoseTrendData = useMemo(
    () => allMetrics
      .filter((metric) => metric.type === 'glucose')
      .slice()
      .reverse()
      .map((metric) => ({
        date: new Date(metric.recordedAt).toLocaleDateString(),
        glucose: metric.value,
      })),
    [allMetrics]
  );

  const bpTrendData = useMemo(() => {
    const grouped = new Map<string, { date: string; systolic?: number; diastolic?: number }>();

    allMetrics
      .filter((metric) => metric.type === 'systolic' || metric.type === 'diastolic')
      .slice()
      .reverse()
      .forEach((metric) => {
        const key = new Date(metric.recordedAt).toISOString();
        const entry = grouped.get(key) || { date: new Date(metric.recordedAt).toLocaleDateString() };
        if (metric.type === 'systolic') entry.systolic = metric.value;
        if (metric.type === 'diastolic') entry.diastolic = metric.value;
        grouped.set(key, entry);
      });

    return Array.from(grouped.values());
  }, [allMetrics]);

  useEffect(() => {
    onInsightsChange?.({
      metrics: allMetrics,
      alerts: allAlerts,
      reportCount: reports.length,
    });
  }, [allAlerts, allMetrics, onInsightsChange, reports.length]);

  const upsertReport = (
    reportId: string,
    updater: (prev: UploadedReport) => UploadedReport,
    fallbackReport?: UploadedReport
  ) => {
    setReports((prev) => {
      let found = false;
      const next = prev.map((report) => {
        if (report.id !== reportId) return report;
        found = true;
        return updater(report);
      });

      if (!found && fallbackReport) {
        return [updater(fallbackReport), ...next];
      }

      return next;
    });
  };

  const persistMetricsToSupabase = async (metrics: ExtractedMetric[], sourceName: string) => {
    if (metrics.length === 0 || !patientId) return;
    const rows = metrics.map((m) => ({
      patient_id: patientId,
      metric_type: m.type,
      metric_label: m.label,
      value: m.value,
      unit: m.unit,
      reference_range: m.reference,
      abnormal: m.abnormal,
      source_document: sourceName,
      recorded_at: m.recordedAt,
    }));
    const { error } = await supabase.from('lab_metrics').insert(rows);
    if (error) console.error('Failed to persist lab metrics:', error.message);
  };

  const processAndStoreText = (
    reportId: string,
    sourceName: string,
    text: string,
    fallbackReport?: UploadedReport
  ) => {
    const now = new Date().toISOString();
    const extractedMetrics = extractClinicalMetrics(text, sourceName, now);
    const alerts = buildAlertsFromMetrics(extractedMetrics);

    upsertReport(reportId, (prev) => ({
      ...prev,
      status: 'processed',
      processingMessage: extractedMetrics.length > 0
        ? `Extracted ${extractedMetrics.length} values`
        : 'Processed but no known lab values found',
      extractedMetrics,
      alerts,
      extractedText: text,
    }), fallbackReport);

    // Persist to Supabase in background (non-blocking)
    void persistMetricsToSupabase(extractedMetrics, sourceName);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const newReports: UploadedReport[] = fileList.map((file, index) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
      sizeInBytes: file.size,
      status: 'processing',
      processingMessage: 'Queued for OCR...',
      extractedMetrics: [],
      alerts: [],
      extractedText: '',
    }));

    setReports((prev) => [...newReports, ...prev]);

    for (let index = 0; index < newReports.length; index += 1) {
      const fileReport = newReports[index];
      const file = fileList[index];
      if (!file) {
        upsertReport(fileReport.id, (prev) => ({
          ...prev,
          status: 'failed',
          processingMessage: 'File reference lost during upload. Please retry.',
        }), fileReport);
        continue;
      }

      try {
        setProcessingProgress((prev) => ({ ...prev, [fileReport.id]: 5 }));
        setProcessingMessage((prev) => ({ ...prev, [fileReport.id]: 'Preparing document...' }));

        const text = await fileToText(file, (progress, message) => {
          setProcessingProgress((prev) => ({ ...prev, [fileReport.id]: progress }));
          setProcessingMessage((prev) => ({ ...prev, [fileReport.id]: message }));
          upsertReport(fileReport.id, (prev) => ({ ...prev, processingMessage: message }), fileReport);
        });

        processAndStoreText(fileReport.id, fileReport.name, text, fileReport);
      } catch (error) {
        upsertReport(fileReport.id, (prev) => ({
          ...prev,
          status: 'failed',
          processingMessage: error instanceof Error ? error.message : 'Could not process file',
        }), fileReport);
      } finally {
        setProcessingProgress((prev) => ({ ...prev, [fileReport.id]: 100 }));
      }
    }
  };

  const handleManualExtraction = () => {
    if (!manualText.trim()) return;

    const reportId = `manual-${Date.now()}`;
    const reportName = `Manual OCR Notes - ${new Date().toLocaleString()}`;
    const now = new Date().toISOString();
    const extractedMetrics = extractClinicalMetrics(manualText, reportName, now);
    const alerts = buildAlertsFromMetrics(extractedMetrics);

    const report: UploadedReport = {
      id: reportId,
      name: reportName,
      mimeType: 'text/plain',
      uploadedAt: now,
      sizeInBytes: manualText.length,
      status: 'processed',
      processingMessage: extractedMetrics.length > 0
        ? `Extracted ${extractedMetrics.length} values from pasted text`
        : 'No known lab values found in pasted text',
      extractedMetrics,
      alerts,
      extractedText: manualText,
    };

    setReports((prev) => [report, ...prev]);
    setManualText('');
  };

  const handleAnalyzeReportsWithAI = async () => {
    if (isAiAnalyzing) return;

    const processedReports = reports.filter((report) => report.status === 'processed');
    if (processedReports.length === 0) {
      toast({
        title: 'No processed reports',
        description: 'Upload or paste a report first, then run AI analysis.',
        variant: 'destructive',
      });
      return;
    }

    const reportText = processedReports
      .map((report) => {
        const extractedValues = report.extractedMetrics
          .map((metric) => `${metric.label}: ${metric.value} ${metric.unit}`)
          .join(', ');
        const alertsText = report.alerts
          .map((alert) => `${alert.title} (${alert.severity})`)
          .join(', ');
        const rawText = (report.extractedText || '').trim();

        return [
          `Report: ${report.name}`,
          rawText ? `Extracted Text:\n${rawText}` : '',
          extractedValues ? `Extracted Values: ${extractedValues}` : 'Extracted Values: none',
          alertsText ? `Detected Alerts: ${alertsText}` : 'Detected Alerts: none',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n---\n\n');

    const prompt = `You are assisting a clinician. Analyze these patient reports and provide a concise structured output with exactly these headings:\n\nImpression:\nRisk Level:\nKey Abnormal Findings:\nRecommended Next Steps:\n\nRules:\n- Be concise and clinically oriented.\n- Do not invent findings absent from the provided report data.\n- Mention uncertainty if information is incomplete.\n- Risk Level must be one of: low, moderate, high.\n\nPatient: ${patientName}`;

    try {
      setIsAiAnalyzing(true);
      const result = await HuggingFaceService.generateDoctorResponse(
        prompt,
        [],
        'ai-doctor',
        undefined,
        reportText
      );

      if (!result.success || !result.response) {
        throw new Error(result.error || 'AI analysis failed');
      }

      setAiAnalysis(result.response);
      setAiAnalysisUpdatedAt(new Date().toISOString());
      toast({
        title: 'Analysis complete',
        description: 'AI report interpretation generated successfully.',
      });
    } catch (error) {
      toast({
        title: 'AI analysis failed',
        description: error instanceof Error ? error.message : 'Unable to analyze reports right now.',
        variant: 'destructive',
      });
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const formatSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Reports & Documents Hub</CardTitle>
          <Badge variant={allAlerts.length > 0 ? 'destructive' : 'secondary'}>
            {allAlerts.length} abnormal alert{allAlerts.length === 1 ? '' : 's'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          OCR and trend tracking for {patientName}
        </p>
        <p className="text-xs text-muted-foreground">Patient ID: {patientId}</p>
      </CardHeader>

      <CardContent className="h-[calc(100%-6.25rem)] overflow-auto">
        <Tabs defaultValue="upload" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="values">Values</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-3 mt-3">
            <div className="rounded-md border border-dashed p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Upload className="h-4 w-4" />
                Upload PDFs / images / text reports
              </div>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.json"
                multiple
                onChange={(event) => {
                  void handleFileUpload(event.target.files);
                  event.target.value = '';
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                OCR runs for images and text extraction runs for PDFs.
              </p>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ScanLine className="h-4 w-4" />
                Paste OCR text manually
              </div>
              <Textarea
                value={manualText}
                onChange={(event) => setManualText(event.target.value)}
                placeholder="Paste extracted report text here (for scanned PDFs or external OCR output)..."
                className="min-h-[90px]"
              />
              <Button size="sm" onClick={handleManualExtraction} disabled={!manualText.trim()}>
                Extract Key Values
              </Button>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Report Interpretation
                </div>
                <Button
                  size="sm"
                  onClick={handleAnalyzeReportsWithAI}
                  disabled={isAiAnalyzing || reports.filter((report) => report.status === 'processed').length === 0}
                >
                  {isAiAnalyzing ? 'Analyzing...' : 'Analyze Reports'}
                </Button>
              </div>
              {aiAnalysis ? (
                <div className="rounded-md border bg-slate-50 p-3 text-sm">
                  <div className="prose prose-sm max-w-none text-slate-800 prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0 prose-p:my-1 prose-ul:my-2 prose-li:my-0.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {aiAnalysis}
                    </ReactMarkdown>
                  </div>
                  {aiAnalysisUpdatedAt && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Last updated: {new Date(aiAnalysisUpdatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Run AI analysis to get a clinician-style impression, risk level, and next-step suggestions.
                </p>
              )}
            </div>

            <div className="space-y-2">
              {reports.length === 0 ? (
                <div className="text-sm text-muted-foreground">No reports uploaded yet.</div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {report.mimeType.startsWith('image/') ? (
                            <Image className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                          {report.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(report.uploadedAt).toLocaleString()} • {formatSize(report.sizeInBytes)}
                        </div>
                      </div>

                      {report.status === 'processing' ? (
                        <Badge variant="secondary" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Processing
                        </Badge>
                      ) : report.status === 'failed' ? (
                        <Badge variant="destructive">Failed</Badge>
                      ) : (
                        <Badge variant="secondary">Processed</Badge>
                      )}
                    </div>

                    {report.status === 'processing' && (
                      <div className="mt-2 space-y-1">
                        <Progress value={processingProgress[report.id] || 0} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {processingMessage[report.id] || 'Processing...'}
                        </div>
                      </div>
                    )}

                    {report.processingMessage && report.status !== 'processing' && (
                      <div className="mt-2 text-xs text-muted-foreground">{report.processingMessage}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="values" className="space-y-2 mt-3">
            {allMetrics.length === 0 ? (
              <div className="text-sm text-muted-foreground">No extracted values yet.</div>
            ) : (
              allMetrics.map((metric) => (
                <div key={metric.id} className="rounded-md border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{metric.label}</div>
                    <Badge variant={metric.abnormal ? 'destructive' : 'secondary'}>
                      {metric.value} {metric.unit}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Reference: {metric.reference}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(metric.recordedAt).toLocaleString()} • {metric.source}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4 mt-3">
            <div className="rounded-md border p-3">
              <div className="mb-2 text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Glucose Trend
              </div>
              {glucoseTrendData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No glucose trend data yet.</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-48 w-full">
                  <LineChart data={glucoseTrendData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="glucose" stroke="var(--color-glucose)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              )}
            </div>

            <div className="rounded-md border p-3">
              <div className="mb-2 text-sm font-medium">Blood Pressure Trend</div>
              {bpTrendData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No BP trend data yet.</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-48 w-full">
                  <LineChart data={bpTrendData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="systolic" stroke="var(--color-systolic)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="diastolic" stroke="var(--color-diastolic)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              )}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-2 mt-3">
            {allAlerts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No abnormal alerts yet.</div>
            ) : (
              allAlerts.map((item) => (
                <Alert key={item.id} variant={item.severity === 'high' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{item.title}</AlertTitle>
                  <AlertDescription>
                    {item.description}
                    <div className="mt-1 text-xs opacity-80">{new Date(item.timestamp).toLocaleString()}</div>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ReportsDocumentsHub;