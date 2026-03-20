import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Activity, Plus, Loader2, Heart, Droplets, ClipboardList } from 'lucide-react';

interface TargetMetric {
  metric_type: string;
  target_min: number;
  target_max: number;
  unit: string;
}

interface DiseaseProgram {
  id: string;
  patient_user_id: string;
  doctor_user_id: string;
  program_type: string;
  program_name: string;
  target_metrics: TargetMetric[];
  check_in_frequency: string;
  is_active: boolean;
  created_at: string;
  patient_name?: string;
}

interface VitalLog {
  id: string;
  program_id: string | null;
  metric_type: string;
  value: number;
  unit: string;
  notes: string | null;
  logged_at: string;
}

interface PatientOption {
  id: string;
  user_id: string | null;
  name: string;
}

const PROGRAM_PRESETS: Record<string, { name: string; metrics: TargetMetric[] }> = {
  diabetes: {
    name: 'Diabetes Management',
    metrics: [
      { metric_type: 'glucose', target_min: 70, target_max: 140, unit: 'mg/dL' },
      { metric_type: 'hba1c', target_min: 0, target_max: 7, unit: '%' },
    ],
  },
  hypertension: {
    name: 'Hypertension Management',
    metrics: [
      { metric_type: 'systolic', target_min: 90, target_max: 130, unit: 'mmHg' },
      { metric_type: 'diastolic', target_min: 60, target_max: 80, unit: 'mmHg' },
    ],
  },
  custom: { name: '', metrics: [] },
};

const VITAL_METRICS = [
  { type: 'glucose', label: 'Blood Glucose', unit: 'mg/dL' },
  { type: 'systolic', label: 'Systolic BP', unit: 'mmHg' },
  { type: 'diastolic', label: 'Diastolic BP', unit: 'mmHg' },
  { type: 'hba1c', label: 'HbA1c', unit: '%' },
  { type: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL' },
  { type: 'weight', label: 'Weight', unit: 'kg' },
  { type: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
];

const DiseasePrograms: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<DiseaseProgram[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<DiseaseProgram | null>(null);

  // Create form
  const [selectedPatientUserId, setSelectedPatientUserId] = useState('');
  const [programType, setProgramType] = useState<'diabetes' | 'hypertension' | 'custom'>('diabetes');
  const [programName, setProgramName] = useState(PROGRAM_PRESETS.diabetes.name);
  const [frequency, setFrequency] = useState('daily');
  const [saving, setSaving] = useState(false);

  // Vital log form
  const [logMetricType, setLogMetricType] = useState('glucose');
  const [logValue, setLogValue] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [loggingVital, setLoggingVital] = useState(false);

  const effectiveUserId = user?.auth_user_id || user?.id;

  const fetchPrograms = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    const col = user?.role === 'doctor' ? 'doctor_user_id' : 'patient_user_id';
    const { data } = await supabase
      .from('disease_programs')
      .select('*')
      .eq(col, effectiveUserId)
      .order('created_at', { ascending: false });

    if (!data) { setLoading(false); return; }

    if (user?.role === 'doctor') {
      const patientUserIds = [...new Set(data.map((p) => p.patient_user_id))];
      const { data: pats } = await supabase
        .from('patients').select('id, user_id, name').in('user_id', patientUserIds);
      const patMap = new Map((pats ?? []).map((p) => [p.user_id, p.name]));
      setPrograms(data.map((p) => ({
        ...p,
        target_metrics: (p.target_metrics as TargetMetric[]) ?? [],
        patient_name: patMap.get(p.patient_user_id) ?? 'Unknown',
      })));
    } else {
      setPrograms(data.map((p) => ({ ...p, target_metrics: (p.target_metrics as TargetMetric[]) ?? [] })));
    }
    setLoading(false);
  }, [effectiveUserId, user?.role]);

  const fetchPatients = useCallback(async () => {
    if (user?.role !== 'doctor' || !effectiveUserId) return;
    const { data } = await supabase
      .from('patients').select('id, user_id, name').eq('assigned_doctor_id', effectiveUserId);
    setPatients((data ?? []) as PatientOption[]);
  }, [user?.role, effectiveUserId]);

  useEffect(() => {
    void fetchPrograms();
    void fetchPatients();
  }, [fetchPrograms, fetchPatients]);

  const handleCreate = async () => {
    if (!effectiveUserId || !selectedPatientUserId) return;
    setSaving(true);
    const preset = PROGRAM_PRESETS[programType];
    const patient = patients.find((p) => p.user_id === selectedPatientUserId);
    const { error } = await supabase.from('disease_programs').insert({
      doctor_user_id: effectiveUserId,
      patient_user_id: selectedPatientUserId,
      program_type: programType,
      program_name: programName || preset.name,
      target_metrics: preset.metrics as unknown as import('@/integrations/supabase/types').Json,
      check_in_frequency: frequency,
    });
    if (error) {
      toast({ title: 'Failed to create program', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Program created', description: `${programName} enrolled for ${patient?.name}.` });
      setShowCreateDialog(false);
      void fetchPrograms();
    }
    setSaving(false);
  };

  const handleLogVital = async () => {
    if (!effectiveUserId || !selectedProgram || !logValue) return;
    setLoggingVital(true);
    const metricMeta = VITAL_METRICS.find((m) => m.type === logMetricType);
    const { error } = await supabase.from('vital_logs').insert({
      program_id: selectedProgram.id,
      patient_user_id: effectiveUserId,
      metric_type: logMetricType,
      value: parseFloat(logValue),
      unit: metricMeta?.unit ?? '',
      notes: logNotes.trim() || null,
    });
    if (error) {
      toast({ title: 'Failed to log vital', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Vital logged', description: 'Your reading has been recorded.' });
      setShowLogDialog(false);
      setLogValue(''); setLogNotes('');
    }
    setLoggingVital(false);
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
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-white/70" />
              <span className="text-white/70 text-sm font-medium">Health Monitoring</span>
            </div>
            <h1 className="text-[24px] font-bold text-white tracking-tight mb-1">Disease Programs</h1>
            <p className="text-white/70 text-[14px] font-medium">
              {user?.role === 'doctor'
                ? 'Enroll patients in structured chronic disease monitoring programs.'
                : 'Track your vitals and view your monitoring programs.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-bold bg-white/20 text-white border border-white/30">
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
              {programs.length} program{programs.length !== 1 ? 's' : ''}
            </span>
            {user?.role === 'doctor' && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="text-white border-0 font-semibold shadow-sm"
                style={{ background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.35)' }}
              >
                <Plus className="h-4 w-4 mr-2" /> Enroll Patient
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#1868b7]" />
          </div>
        ) : programs.length === 0 ? (
          <div className="bg-white border border-[#cddff0] rounded-xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#f0f6fc' }}>
              <Activity className="h-8 w-8 text-[#c0dcf5]" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No programs yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              {user?.role === 'doctor'
                ? 'Enroll a patient in a Diabetes or Hypertension program to start tracking.'
                : 'Your doctor will enroll you in a monitoring program.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => {
              const isDiabetes = program.program_type === 'diabetes';
              return (
                <div
                  key={program.id}
                  className="bg-white border border-[#cddff0] rounded-xl overflow-hidden shadow-sm"
                  style={{ borderLeft: `4px solid ${isDiabetes ? '#1868b7' : '#e11d48'}` }}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2.5 rounded-xl shrink-0"
                          style={{
                            background: isDiabetes ? '#f0f6fc' : '#fff0f3',
                            border: `1px solid ${isDiabetes ? '#c0dcf5' : '#fecdd3'}`,
                          }}
                        >
                          {isDiabetes
                            ? <Droplets className="h-5 w-5 text-[#1868b7]" />
                            : <Heart className="h-5 w-5 text-rose-500" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800 text-[15px]">{program.program_name}</span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                program.is_active
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {program.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {program.patient_name && (
                            <p className="text-xs text-slate-500 mb-1">Patient: <span className="font-medium text-slate-700">{program.patient_name}</span></p>
                          )}
                          <p className="text-xs text-slate-500 mb-2">
                            Check-in: <span className="font-medium text-slate-700 capitalize">{program.check_in_frequency}</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {program.target_metrics.map((m) => (
                              <span
                                key={m.metric_type}
                                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                                style={{ background: '#f0f6fc', color: '#1868b7', border: '1px solid #c0dcf5' }}
                              >
                                {m.metric_type}: {m.target_min}–{m.target_max} {m.unit}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {user?.role === 'patient' && program.is_active && (
                        <Button
                          size="sm"
                          className="shrink-0 h-8 text-xs font-semibold border"
                          style={{ background: '#f0f6fc', color: '#1868b7', borderColor: '#c0dcf5' }}
                          onClick={() => { setSelectedProgram(program); setShowLogDialog(true); }}
                        >
                          Log Vital
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Program Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Enroll Patient in Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Patient</label>
              <Select value={selectedPatientUserId} onValueChange={setSelectedPatientUserId}>
                <SelectTrigger className="border-[#c0dcf5] focus:ring-[#1868b7]"><SelectValue placeholder="Select patient..." /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => <SelectItem key={p.id} value={p.user_id ?? p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Program Type</label>
              <Select
                value={programType}
                onValueChange={(v) => {
                  setProgramType(v as 'diabetes' | 'hypertension' | 'custom');
                  setProgramName(PROGRAM_PRESETS[v]?.name ?? '');
                }}
              >
                <SelectTrigger className="border-[#c0dcf5] focus:ring-[#1868b7]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diabetes">Diabetes Management</SelectItem>
                  <SelectItem value="hypertension">Hypertension Management</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Program Name</label>
              <Input
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                className="border-[#c0dcf5] focus-visible:ring-[#1868b7]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Check-in Frequency</label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="border-[#c0dcf5] focus:ring-[#1868b7]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={saving || !selectedPatientUserId}
              className="text-white border-0"
              style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Vital Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Log Vital Reading</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Metric</label>
              <Select value={logMetricType} onValueChange={setLogMetricType}>
                <SelectTrigger className="border-[#c0dcf5] focus:ring-[#1868b7]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(selectedProgram?.target_metrics.length
                    ? selectedProgram.target_metrics.map((m) => ({
                        type: m.metric_type,
                        label: VITAL_METRICS.find((v) => v.type === m.metric_type)?.label ?? m.metric_type,
                      }))
                    : VITAL_METRICS
                  ).map((m) => (
                    <SelectItem key={m.type} value={m.type}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Value ({VITAL_METRICS.find((m) => m.type === logMetricType)?.unit})
              </label>
              <Input
                type="number"
                value={logValue}
                onChange={(e) => setLogValue(e.target.value)}
                placeholder="Enter reading..."
                className="border-[#c0dcf5] focus-visible:ring-[#1868b7]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Notes (optional)</label>
              <Textarea
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                placeholder="Any observations..."
                rows={2}
                className="border-[#c0dcf5] focus-visible:ring-[#1868b7]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowLogDialog(false)}>Cancel</Button>
            <Button
              onClick={() => void handleLogVital()}
              disabled={loggingVital || !logValue}
              className="text-white border-0"
              style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
            >
              {loggingVital ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Reading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiseasePrograms;
