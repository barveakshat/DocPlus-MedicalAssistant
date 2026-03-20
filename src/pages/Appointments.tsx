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
import { Calendar, Clock, Phone, User, CheckCircle2, XCircle, Loader2, Plus } from 'lucide-react';

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
  // Joined
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

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookDialog, setShowBookDialog] = useState(false);

  // Form state
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

    // Enrich with names
    if (user?.role === 'doctor') {
      const patientUserIds = [...new Set(data.map((a) => a.patient_user_id))];
      const { data: pats } = await supabase
        .from('patients')
        .select('id, user_id, name')
        .in('user_id', patientUserIds);

      const patMap = new Map((pats ?? []).map((p) => [p.user_id, p.name]));
      setAppointments(
        data.map((a) => ({ ...a, patient_name: patMap.get(a.patient_user_id) ?? 'Unknown' }))
      );
    } else {
      // Patient view — get doctor name
      const { data: doctor } = await supabase
        .from('doctors')
        .select('name')
        .eq('user_id', data[0]?.doctor_user_id ?? '')
        .maybeSingle();
      setAppointments(data.map((a) => ({ ...a, doctor_name: doctor?.name ?? 'Your Doctor' })));
    }
    setLoading(false);
  }, [effectiveUserId, user?.role]);

  const fetchPatients = useCallback(async () => {
    if (user?.role !== 'doctor' || !effectiveUserId) return;
    const { data } = await supabase
      .from('patients')
      .select('id, user_id, name')
      .eq('assigned_doctor_id', effectiveUserId);
    setPatients((data ?? []) as PatientOption[]);
  }, [user?.role, effectiveUserId]);

  useEffect(() => {
    void fetchAppointments();
    void fetchPatients();
  }, [fetchAppointments, fetchPatients]);

  const handleBook = async () => {
    if (!effectiveUserId || !scheduledAt) return;
    setSaving(true);

    // Patient books with assigned doctor
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
      // Patient books with their assigned doctor
      const { data: patientRow } = await supabase
        .from('patients')
        .select('assigned_doctor_id')
        .eq('user_id', effectiveUserId)
        .maybeSingle();
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
      setScheduledAt('');
      setNotes('');
      setSelectedPatientUserId('');
      void fetchAppointments();
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    }
  };

  const upcoming = appointments.filter(
    (a) => new Date(a.scheduled_at) >= new Date() && a.status !== 'cancelled'
  );
  const past = appointments.filter(
    (a) => new Date(a.scheduled_at) < new Date() || a.status === 'cancelled'
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
            <p className="text-sm text-slate-500 mt-1">
              {user?.role === 'doctor'
                ? 'Manage patient appointments and consultations.'
                : 'View and book appointments with your doctor.'}
            </p>
          </div>
          <Button
            onClick={() => setShowBookDialog(true)}
            className="bg-[#5442f5] hover:bg-[#4335c0] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Book Appointment
          </Button>
        </div>

        {/* Upcoming */}
        <section>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
            Upcoming ({upcoming.length})
          </h2>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No upcoming appointments.</p>
              </div>
            ) : (
              upcoming.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  userRole={user?.role ?? 'patient'}
                  onUpdateStatus={updateStatus}
                />
              ))
            )}
          </div>
        </section>

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
              Past & Cancelled ({past.length})
            </h2>
            <div className="space-y-3 opacity-70">
              {past.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  userRole={user?.role ?? 'patient'}
                  onUpdateStatus={updateStatus}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Book Dialog */}
      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {user?.role === 'doctor' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Patient</label>
                <Select value={selectedPatientUserId} onValueChange={setSelectedPatientUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.user_id ?? p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Date & Time</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Type</label>
                <Select value={apptType} onValueChange={(v) => setApptType(v as 'phone' | 'in-person')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="in-person">In-person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Duration</label>
                <Select
                  value={String(durationMinutes)}
                  onValueChange={(v) => setDurationMinutes(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
              <label className="text-sm font-medium text-slate-700 mb-1 block">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for visit, special instructions..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBookDialog(false)}>Cancel</Button>
            <Button
              onClick={() => void handleBook()}
              disabled={saving || !scheduledAt}
              className="bg-[#5442f5] hover:bg-[#4335c0] text-white"
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4">
      <div className="shrink-0 text-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-w-[60px]">
        <div className="text-xs font-semibold text-slate-500 uppercase">
          {date.toLocaleDateString('en-US', { month: 'short' })}
        </div>
        <div className="text-2xl font-bold text-slate-900 leading-none">{date.getDate()}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-slate-800">
            {userRole === 'doctor' ? appt.patient_name : appt.doctor_name}
          </span>
          <Badge className={`text-[10px] border ${STATUS_COLORS[appt.status] ?? ''}`}>
            {appt.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
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
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{appt.notes}</p>
        )}
      </div>

      {/* Doctor actions */}
      {userRole === 'doctor' && !isPast && appt.status === 'pending' && (
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            onClick={() => onUpdateStatus(appt.id, 'confirmed')}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50"
            onClick={() => onUpdateStatus(appt.id, 'cancelled')}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        </div>
      )}
      {userRole === 'doctor' && !isPast && appt.status === 'confirmed' && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs shrink-0"
          onClick={() => onUpdateStatus(appt.id, 'completed')}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Complete
        </Button>
      )}
    </div>
  );
};

export default Appointments;
