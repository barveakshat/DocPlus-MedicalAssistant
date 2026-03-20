import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, AlertTriangle, Loader2, FlaskConical } from 'lucide-react';

interface LabMetric {
  id: string;
  metric_type: string;
  metric_label: string;
  value: number;
  unit: string;
  reference_range: string | null;
  abnormal: boolean;
  source_document: string | null;
  recorded_at: string;
}

interface LabHistoryPanelProps {
  patientId: string; // patients.user_id
  patientName: string;
}

const METRIC_COLORS: Record<string, string> = {
  glucose: 'hsl(var(--chart-2))',
  systolic: 'hsl(var(--chart-1))',
  diastolic: 'hsl(var(--chart-4))',
  hba1c: 'hsl(var(--chart-3))',
  hemoglobin: 'hsl(var(--chart-5))',
};

const REFERENCE_RANGES: Record<string, { low: number; high: number }> = {
  glucose: { low: 70, high: 140 },
  systolic: { low: 90, high: 139 },
  diastolic: { low: 60, high: 89 },
  hba1c: { low: 0, high: 6.4 },
  hemoglobin: { low: 12, high: 17 },
};

const chartConfig: ChartConfig = {
  value: { label: 'Value', color: 'hsl(var(--chart-1))' },
};

const MetricChart: React.FC<{
  metricType: string;
  label: string;
  unit: string;
  data: LabMetric[];
}> = ({ metricType, label, unit, data }) => {
  const chartData = data
    .slice()
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .map((d) => ({
      date: new Date(d.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: d.value,
      abnormal: d.abnormal,
    }));

  const range = REFERENCE_RANGES[metricType];
  const color = METRIC_COLORS[metricType] ?? 'hsl(var(--chart-1))';
  const abnormalCount = data.filter((d) => d.abnormal).length;

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-800">{label}</span>
          <span className="text-xs text-slate-400">({unit})</span>
        </div>
        <div className="flex items-center gap-2">
          {abnormalCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {abnormalCount} abnormal
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">{data.length} reading{data.length !== 1 ? 's' : ''}</Badge>
        </div>
      </div>

      {chartData.length < 2 ? (
        <div className="text-xs text-slate-400 py-4 text-center">
          Need at least 2 readings to show trend.{' '}
          {chartData.length === 1 && (
            <span>Latest: <strong>{chartData[0].value} {unit}</strong></span>
          )}
        </div>
      ) : (
        <ChartContainer config={{ value: { label, color } }} className="h-40 w-full">
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {range && <ReferenceLine y={range.high} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />}
            {range && range.low > 0 && <ReferenceLine y={range.low} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    key={`dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.abnormal ? '#ef4444' : color}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                );
              }}
            />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
};

const LabHistoryPanel: React.FC<LabHistoryPanelProps> = ({ patientId, patientName }) => {
  const [metrics, setMetrics] = useState<LabMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const { data } = await supabase
      .from('lab_metrics')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(200);
    setMetrics((data ?? []) as LabMetric[]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  const groupedByType = useMemo(() => {
    const map = new Map<string, { label: string; unit: string; data: LabMetric[] }>();
    metrics.forEach((m) => {
      if (!map.has(m.metric_type)) {
        map.set(m.metric_type, { label: m.metric_label, unit: m.unit, data: [] });
      }
      map.get(m.metric_type)!.data.push(m);
    });
    return map;
  }, [metrics]);

  const abnormalTotal = useMemo(() => metrics.filter((m) => m.abnormal).length, [metrics]);

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-800">Lab History — {patientName}</span>
        </div>
        <div className="flex items-center gap-2">
          {abnormalTotal > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {abnormalTotal} abnormal
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">{metrics.length} total readings</Badge>
        </div>
      </div>

      <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-4 space-y-4">
        {groupedByType.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FlaskConical className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500">No lab history yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Upload medical reports in the Reports & Documents Hub to populate lab history.
            </p>
          </div>
        ) : (
          Array.from(groupedByType.entries()).map(([type, { label, unit, data }]) => (
            <MetricChart key={type} metricType={type} label={label} unit={unit} data={data} />
          ))
        )}

        {/* Recent readings table */}
        {metrics.length > 0 && (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Recent Readings</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {metrics.slice(0, 30).map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">{m.metric_label}</span>
                    {m.source_document && (
                      <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{m.source_document}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={m.abnormal ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {m.value} {m.unit}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(m.recorded_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default LabHistoryPanel;
