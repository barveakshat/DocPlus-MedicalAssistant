import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pill, Plus, Loader2, Printer, CheckCircle, XCircle, ClipboardCheck } from 'lucide-react';

interface Prescription {
  id: string;
  doctor_user_id: string;
  patient_user_id: string;
  patient_id: string | null;
  drug_name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  status: string;
  issued_at: string;
  patient_name?: string;
}

interface PatientOption {
  id: string;
  user_id: string | null;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
  discontinued: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_ACCENT: Record<string, string> = {
  active: '#10b981',
  completed: '#94a3b8',
  discontinued: '#ef4444',
};

const FREQUENCY_OPTIONS = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 8 hours', 'Every 12 hours', 'As needed', 'Before meals', 'After meals', 'At bedtime',
];

const DURATION_OPTIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '3 months', 'Ongoing'];

const Prescriptions: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [todayLogs, setTodayLogs] = useState<Set<string>>(new Set());
  const [loggingDose, setLoggingDose] = useState<string | null>(null);

  const [selectedPatientUserId, setSelectedPatientUserId] = useState('');
  const [drugName, setDrugName] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('Twice daily');
  const [duration, setDuration] = useState('7 days');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  const effectiveUserId = user?.auth_user_id || user?.id;

  const fetchPrescriptions = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    const col = user?.role === 'doctor' ? 'doctor_user_id' : 'patient_user_id';
    const { data } = await supabase.from('prescriptions').select('*').eq(col, effectiveUserId).order('issued_at', { ascending: false });
    if (!data) { setLoading(false); return; }

    if (user?.role === 'doctor') {
      const patientUserIds = [...new Set(data.map((p) => p.patient_user_id))];
      const { data: pats } = await supabase.from('patients').select('id, user_id, name').in('user_id', patientUserIds);
      const patMap = new Map((pats ?? []).map((p) => [p.user_id, p.name]));
      setPrescriptions(data.map((p) => ({ ...p, patient_name: patMap.get(p.patient_user_id) ?? 'Unknown' })));
    } else {
      setPrescriptions(data);
    }
    setLoading(false);
  }, [effectiveUserId, user?.role]);

  const fetchPatients = useCallback(async () => {
    if (user?.role !== 'doctor' || !effectiveUserId) return;
    const { data } = await supabase.from('patients').select('id, user_id, name').eq('assigned_doctor_id', effectiveUserId);
    setPatients((data ?? []) as PatientOption[]);
  }, [user?.role, effectiveUserId]);

  const fetchTodayLogs = useCallback(async () => {
    if (user?.role !== 'patient' || !effectiveUserId) return;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data } = await supabase.from('medication_logs').select('prescription_id').eq('patient_user_id', effectiveUserId).gte('taken_at', todayStart.toISOString());
    if (data) setTodayLogs(new Set(data.map((r) => r.prescription_id)));
  }, [user?.role, effectiveUserId]);

  useEffect(() => {
    void fetchPrescriptions();
    void fetchPatients();
    void fetchTodayLogs();
  }, [fetchPrescriptions, fetchPatients, fetchTodayLogs]);

  const handleLogDose = async (prescriptionId: string) => {
    if (!effectiveUserId) return;
    setLoggingDose(prescriptionId);
    const { error } = await supabase.from('medication_logs').insert({ prescription_id: prescriptionId, patient_user_id: effectiveUserId });
    if (error) {
      toast({ title: 'Failed to log dose', description: error.message, variant: 'destructive' });
    } else {
      setTodayLogs((prev) => new Set([...prev, prescriptionId]));
      toast({ title: 'Dose logged', description: 'Your dose has been recorded for today.' });
    }
    setLoggingDose(null);
  };

  const handleCreate = async () => {
    if (!effectiveUserId || !drugName.trim() || !dose.trim()) return;
    setSaving(true);
    const patient = patients.find((p) => p.user_id === selectedPatientUserId);
    if (!patient?.user_id) {
      toast({ title: 'Select a patient', variant: 'destructive' });
      setSaving(false);
      return;
    }
    const { error } = await supabase.from('prescriptions').insert({
      doctor_user_id: effectiveUserId,
      patient_user_id: patient.user_id,
      patient_id: patient.id,
      drug_name: drugName.trim(),
      dose: dose.trim(),
      frequency,
      duration,
      instructions: instructions.trim() || null,
    });
    if (error) {
      toast({ title: 'Failed to create prescription', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Prescription issued', description: `${drugName} prescribed to ${patient.name}.` });
      setShowDialog(false);
      setDrugName(''); setDose(''); setInstructions(''); setSelectedPatientUserId('');
      void fetchPrescriptions();
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('prescriptions').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      setPrescriptions((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    }
  };

  const printPrescription = (rx: Prescription) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Prescription</title>
      <style>body{font-family:serif;padding:40px;max-width:600px;margin:0 auto}
      h1{font-size:1.5rem;border-bottom:2px solid #333;padding-bottom:8px}
      .field{margin:8px 0}.label{font-weight:bold;font-size:.85rem;color:#555}
      .value{font-size:1rem}</style></head><body>
      <h1>DocPlus Medical — Prescription</h1>
      <div class="field"><div class="label">Patient</div><div class="value">${rx.patient_name ?? 'Patient'}</div></div>
      <div class="field"><div class="label">Date Issued</div><div class="value">${new Date(rx.issued_at).toLocaleDateString()}</div></div>
      <hr>
      <div class="field"><div class="label">Drug</div><div class="value">${rx.drug_name}</div></div>
      <div class="field"><div class="label">Dose</div><div class="value">${rx.dose}</div></div>
      <div class="field"><div class="label">Frequency</div><div class="value">${rx.frequency}</div></div>
      <div class="field"><div class="label">Duration</div><div class="value">${rx.duration}</div></div>
      ${rx.instructions ? `<div class="field"><div class="label">Instructions</div><div class="value">${rx.instructions}</div></div>` : ''}
      <br><div style="margin-top:40px;border-top:1px solid #ccc;padding-top:12px;font-size:.8rem;color:#888">Issued via DocPlus Medical Assistant</div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  const active = prescriptions.filter((p) => p.status === 'active');
  const archived = prescriptions.filter((p) => p.status !== 'active');

  return (
    <div className="flex-1 h-full overflow-y-auto" style={{ background: '#eef5fc' }}>

      {/* Page Header Banner */}
      <div
        className="relative overflow-hidden px-8 py-6 shrink-0"
        style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div className="absolute top-3 right-28 w-20 h-20 rounded-full opacity-10 bg-white" />
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Pill className="h-4 w-4 text-white/70" />
              <span className="text-white/70 text-sm font-medium">Medication Management</span>
            </div>
            <h1 className="text-[24px] font-bold text-white tracking-tight mb-1">Prescriptions</h1>
            <p className="text-white/70 text-[14px] font-medium">
              {user?.role === 'doctor' ? 'Issue and manage patient prescriptions.' : 'View your current and past prescriptions.'}
            </p>
          </div>
          {user?.role === 'doctor' && (
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-white text-[#1868b7] hover:bg-blue-50 font-bold border-0 shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Prescription
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-6">

        {/* Active */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-600">Active Prescriptions</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
              {active.length}
            </span>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#1868b7]" />
              </div>
            ) : active.length === 0 ? (
              <div className="bg-white border border-[#cddff0] rounded-xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: '#f0f6fc' }}>
                  <Pill className="h-7 w-7 text-[#c0dcf5]" />
                </div>
                <p className="text-sm font-semibold text-slate-500">No active prescriptions.</p>
              </div>
            ) : (
              active.map((rx) => (
                <PrescriptionCard
                  key={rx.id} rx={rx} userRole={user?.role ?? 'patient'}
                  onUpdateStatus={updateStatus} onPrint={printPrescription}
                  takenToday={todayLogs.has(rx.id)} onLogDose={handleLogDose} loggingDose={loggingDose}
                />
              ))
            )}
          </div>
        </section>

        {/* Archived */}
        {archived.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-400">Past Prescriptions</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                {archived.length}
              </span>
            </div>
            <div className="space-y-3 opacity-75">
              {archived.map((rx) => (
                <PrescriptionCard
                  key={rx.id} rx={rx} userRole={user?.role ?? 'patient'}
                  onUpdateStatus={updateStatus} onPrint={printPrescription}
                  takenToday={false} onLogDose={handleLogDose} loggingDose={loggingDose}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1868b7]">Issue Prescription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Patient</label>
              <Select value={selectedPatientUserId} onValueChange={setSelectedPatientUserId}>
                <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => <SelectItem key={p.id} value={p.user_id ?? p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Drug Name</label>
                <Input value={drugName} onChange={(e) => setDrugName(e.target.value)} placeholder="e.g. Amoxicillin" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Dose</label>
                <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 500mg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Frequency</label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Duration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DURATION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Instructions (optional)</label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Take with food, avoid alcohol..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={saving || !drugName.trim() || !dose.trim() || !selectedPatientUserId}
              className="text-white border-0"
              style={{ background: 'linear-gradient(135deg, #1868b7, #0891b2)' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Issue Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PrescriptionCard: React.FC<{
  rx: Prescription;
  userRole: string;
  onUpdateStatus: (id: string, status: string) => void;
  onPrint: (rx: Prescription) => void;
  takenToday: boolean;
  onLogDose: (id: string) => void;
  loggingDose: string | null;
}> = ({ rx, userRole, onUpdateStatus, onPrint, takenToday, onLogDose, loggingDose }) => {
  const accent = STATUS_ACCENT[rx.status] ?? '#94a3b8';
  return (
    <div
      className="bg-white border border-[#cddff0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl shrink-0" style={{ background: '#f0f6fc', border: '1px solid #c0dcf5' }}>
            <Pill className="h-4 w-4 text-[#1868b7]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-slate-900 text-[15px]">{rx.drug_name}</span>
              <span className="text-slate-400 text-sm">· {rx.dose}</span>
              <Badge className={`text-[10px] border rounded-full px-2 ${STATUS_COLORS[rx.status] ?? ''}`}>{rx.status}</Badge>
              {userRole === 'patient' && rx.status === 'active' && takenToday && (
                <Badge className="text-[10px] border bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full px-2">
                  <CheckCircle className="h-3 w-3 mr-1" /> Taken today
                </Badge>
              )}
            </div>
            {rx.patient_name && (
              <p className="text-xs font-medium text-slate-500 mb-1">Patient: <span className="font-semibold">{rx.patient_name}</span></p>
            )}
            <p className="text-sm text-slate-600 font-medium">{rx.frequency} · {rx.duration}</p>
            {rx.instructions && (
              <p className="text-xs text-slate-400 mt-1 italic">{rx.instructions}</p>
            )}
            <p className="text-xs text-slate-400 mt-1.5">
              Issued {new Date(rx.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => onPrint(rx)}>
            <Printer className="h-4 w-4" />
          </Button>
          {userRole === 'patient' && rx.status === 'active' && !takenToday && (
            <Button
              size="sm" variant="outline"
              className="h-8 text-xs font-semibold border-[#c0dcf5] hover:bg-[#f0f6fc]"
              style={{ color: '#1868b7' }}
              onClick={() => onLogDose(rx.id)}
              disabled={loggingDose === rx.id}
            >
              {loggingDose === rx.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ClipboardCheck className="h-3 w-3 mr-1" />}
              Log Dose
            </Button>
          )}
          {userRole === 'doctor' && rx.status === 'active' && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:text-emerald-700" onClick={() => onUpdateStatus(rx.id, 'completed')} title="Mark completed">
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => onUpdateStatus(rx.id, 'discontinued')} title="Discontinue">
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Prescriptions;
