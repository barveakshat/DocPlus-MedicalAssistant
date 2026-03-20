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
import { Calendar, Clock, Phone, User, CheckCircle2, XCircle, Loader2, Plus, CalendarDays } from 'lucide-react';

interface Appointment {
  id: string;
  doctor_user_id: string;
  patient_user_id: string;
  patient_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  type: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  doctor_name?: string;
}

interface PatientOption {
  id: string;
  user_id: string | null;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_ACCENT: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  cancelled: '#ef4444',
  completed: '#94a3b8',
};

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookDialog, setShowBookDialog] = useState(false);

  const [selectedPatientUserId, setSelectedPatientUserId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [apptType, setApptType] = useState<'phone' | 'in-person'>('phone');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const effectiveUserId = user?.auth_user_id || user?.id;

  const fetchAppointments = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    const col = user?.role === 'doctor' ? 'doctor_user_id' : 'patient_user_id';
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq(col, effectiveUserId)
      .order('scheduled_at', { ascending: true });

    if (!data) { setLoading(false); return; }

    if (user?.role === 'doctor') {
      const patientUserIds = [...new Set(data.map((a) => a.patient_user_id))];
      const { data: pats } = await supabase.from('patients').select('id, user_id, name').in('user_id', patientUserIds);
      const patMap = new Map((pats ?? []).map((p) => [p.user_id, p.name]));
      setAppointments(data.map((a) => ({ ...a, patient_name: patMap.get(a.patient_user_id) ?? 'Unknown' })));
    } else {
      const { data: doctor } = await supabase.from('doctors').select('name').eq('user_id', data[0]?.doctor_user_id ?? '').maybeSingle();
      setAppointments(data.map((a) => ({ ...a, doctor_name: doctor?.name ?? 'Your Doctor' })));
    }
    setLoading(false);
  }, [effectiveUserId, user?.role]);

  const fetchPatients = useCallback(async () => {
    if (user?.role !== 'doctor' || !effectiveUserId) return;
    const { data } = await supabase.from('patients').select('id, user_id, name').eq('assigned_doctor_id', effectiveUserId);
    setPatients((data ?? []) as PatientOption[]);
  }, [user?.role, effectiveUserId]);

  useEffect(() => {
    void fetchAppointments();
    void fetchPatients();
  }, [fetchAppointments, fetchPatients]);

  const handleBook = async () => {
    if (!effectiveUserId || !scheduledAt) return;
    setSaving(true);

    let doctorUserId = effectiveUserId;
    let patientUserId = effectiveUserId;
    let patientId: string | null = null;

    if (user?.role === 'doctor') {
      const patient = patients.find((p) => p.user_id === selectedPatientUserId);
      if (!patient?.user_id) {
        toast({ title: 'Select a patient', variant: 'destructive' });
        setSaving(false);
        return;
      }
      patientUserId = patient.user_id;
      patientId = patient.id;
    } else {
      const { data: patientRow } = await supabase.from('patients').select('assigned_doctor_id').eq('user_id', effectiveUserId).maybeSingle();
      if (!patientRow?.assigned_doctor_id) {
        toast({ title: 'No assigned doctor found', variant: 'destructive' });
        setSaving(false);
        return;
      }
      doctorUserId = patientRow.assigned_doctor_id;
    }

    const { error } = await supabase.from('appointments').insert({
      doctor_user_id: doctorUserId,
      patient_user_id: patientUserId,
      patient_id: patientId,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: durationMinutes,
      type: apptType,
      status: 'pending',
      notes: notes.trim() || null,
    });

    if (error) {
      toast({ title: 'Failed to book appointment', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Appointment booked', description: 'Awaiting confirmation from the doctor.' });
      setShowBookDialog(false);
      setScheduledAt(''); setNotes(''); setSelectedPatientUserId('');
      void fetchAppointments();
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('appointments').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    }
  };

  const upcoming = appointments.filter((a) => new Date(a.scheduled_at) >= new Date() && a.status !== 'cancelled');
  const past = appointments.filter((a) => new Date(a.scheduled_at) < new Date() || a.status === 'cancelled');

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
              <CalendarDays className="h-4 w-4 text-white/70" />
              <span className="text-white/70 text-sm font-medium">Scheduling</span>
            </div>
            <h1 className="text-[24px] font-bold text-white tracking-tight mb-1">Appointments</h1>
            <p className="text-white/70 text-[14px] font-medium">
              {user?.role === 'doctor' ? 'Manage patient appointments and consultations.' : 'View and book appointments with your doctor.'}
            </p>
          </div>
          <Button
            onClick={() => setShowBookDialog(true)}
            className="bg-white text-[#1868b7] hover:bg-blue-50 font-bold border-0 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Book Appointment
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-6">

        {/* Upcoming */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-600">
              Upcoming
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#dceaf6] text-[#1868b7]">
              {upcoming.length}
            </span>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#1868b7]" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="bg-white border border-[#cddff0] rounded-xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: '#f0f6fc' }}>
                  <Calendar className="h-7 w-7 text-[#c0dcf5]" />
                </div>
                <p className="text-sm font-semibold text-slate-500">No upcoming appointments.</p>
                <p className="text-xs text-slate-400 mt-1">Book an appointment to get started.</p>
              </div>
            ) : (
              upcoming.map((appt) => (
                <AppointmentCard key={appt.id} appt={appt} userRole={user?.role ?? 'patient'} onUpdateStatus={updateStatus} />
              ))
            )}
          </div>
        </section>

        {/* Past */}
        {past.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-400">Past & Cancelled</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                {past.length}
              </span>
            </div>
            <div className="space-y-3 opacity-75">
              {past.map((appt) => (
                <AppointmentCard key={appt.id} appt={appt} userRole={user?.role ?? 'patient'} onUpdateStatus={updateStatus} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Book Dialog */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1868b7]">Book Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {user?.role === 'doctor' && (
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Patient</label>
                <Select value={selectedPatientUserId} onValueChange={setSelectedPatientUserId}>
                  <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.user_id ?? p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Date & Time</label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Type</label>
                <Select value={apptType} onValueChange={(v) => setApptType(v as 'phone' | 'in-person')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="in-person">In-person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Duration</label>
                <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Notes (optional)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for visit, special instructions..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBookDialog(false)}>Cancel</Button>
            <Button
              onClick={() => void handleBook()}
              disabled={saving || !scheduledAt}
              className="text-white border-0"
              style={{ background: 'linear-gradient(135deg, #1868b7, #0891b2)' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AppointmentCard: React.FC<{
  appt: Appointment;
  userRole: string;
  onUpdateStatus: (id: string, status: string) => void;
}> = ({ appt, userRole, onUpdateStatus }) => {
  const date = new Date(appt.scheduled_at);
  const isPast = date < new Date();
  const accent = STATUS_ACCENT[appt.status] ?? '#94a3b8';

  return (
    <div
      className="bg-white border border-[#cddff0] rounded-xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      {/* Date block */}
      <div
        className="shrink-0 text-center rounded-xl px-3 py-2.5 min-w-[62px]"
        style={{ background: '#f0f6fc', border: '1px solid #c0dcf5' }}
      >
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b8aaa' }}>
          {date.toLocaleDateString('en-US', { month: 'short' })}
        </div>
        <div className="text-[26px] font-bold leading-none" style={{ color: '#1868b7' }}>
          {date.getDate()}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-bold text-slate-800">
            {userRole === 'doctor' ? appt.patient_name : appt.doctor_name}
          </span>
          <Badge className={`text-[10px] border rounded-full px-2 ${STATUS_COLORS[appt.status] ?? ''}`}>
            {appt.status}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {appt.duration_minutes}m
          </span>
          <span className="flex items-center gap-1">
            {appt.type === 'phone' ? <Phone className="h-3 w-3" /> : <User className="h-3 w-3" />}
            {appt.type === 'in-person' ? 'In-person' : 'Phone'}
          </span>
        </div>
        {appt.notes && (
          <p className="text-xs text-slate-400 mt-1.5 italic line-clamp-1">{appt.notes}</p>
        )}
      </div>

      {userRole === 'doctor' && !isPast && appt.status === 'pending' && (
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            onClick={() => onUpdateStatus(appt.id, 'confirmed')}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50"
            onClick={() => onUpdateStatus(appt.id, 'cancelled')}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        </div>
      )}
      {userRole === 'doctor' && !isPast && appt.status === 'confirmed' && (
        <Button size="sm" variant="outline" className="h-8 text-xs shrink-0"
          onClick={() => onUpdateStatus(appt.id, 'completed')}>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
        </Button>
      )}
    </div>
  );
};

export default Appointments;
