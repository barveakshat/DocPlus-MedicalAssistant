import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, User, Mail, Phone, Calendar, MapPin,
  AlertTriangle, Pill, MessageCircle, ClipboardList, Download,
  HeartPulse, ShieldAlert,
} from 'lucide-react';
import { patientToFHIR, downloadFHIRBundle, type FhirLabMetricInput, type FhirPrescriptionInput } from '@/services/fhirService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PatientDetail {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  medical_history: string | null;
  allergies: string | null;
  current_medications: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  assigned_doctor_id: string | null;
  doctor_quick_notes: string | null;
  care_plan: string | null;
  follow_up_date: string | null;
  user_id: string | null;
}

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCarePlan, setSavingCarePlan] = useState(false);
  const [careForm, setCareForm] = useState({ doctor_quick_notes: '', care_plan: '', follow_up_date: '' });

  interface AdherenceEntry { drugName: string; frequency: string; logsLast30: number; expectedLast30: number; }
  const [adherence, setAdherence] = useState<AdherenceEntry[]>([]);
  const [exportingFhir, setExportingFhir] = useState(false);

  if (!user || user.role !== 'doctor') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#eef5fc' }}>
        <Card className="w-full max-w-md border-[#cddff0]">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">Only doctors can view patient details.</p>
            <Button onClick={() => navigate('/ai-chat')} style={{ background: 'linear-gradient(135deg, #1868b7, #0891b2)' }} className="text-white border-0">
              Go to AI Assistant
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => { if (id) fetchPatientDetails(); }, [id]);

  const FREQ_TO_DAILY: Record<string, number> = {
    'Once daily': 1, 'Twice daily': 2, 'Three times daily': 3, 'Four times daily': 4,
    'Every 8 hours': 3, 'Every 12 hours': 2, 'Before meals': 3, 'After meals': 3, 'At bedtime': 1,
  };

  useEffect(() => {
    const fetchAdherence = async () => {
      if (!patient?.user_id) return;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: rxData }, { data: logData }] = await Promise.all([
        supabase.from('prescriptions').select('id, drug_name, frequency, status, issued_at').eq('patient_user_id', patient.user_id).eq('status', 'active'),
        supabase.from('medication_logs').select('prescription_id').eq('patient_user_id', patient.user_id).gte('taken_at', thirtyDaysAgo),
      ]);
      if (!rxData) return;
      const logCounts = new Map<string, number>();
      (logData ?? []).forEach((l) => logCounts.set(l.prescription_id, (logCounts.get(l.prescription_id) ?? 0) + 1));
      setAdherence(rxData.map((rx) => {
        const daysActive = Math.min(30, Math.ceil((Date.now() - new Date(rx.issued_at).getTime()) / 86400000));
        const perDay = FREQ_TO_DAILY[rx.frequency] ?? 1;
        return { drugName: rx.drug_name, frequency: rx.frequency, logsLast30: logCounts.get(rx.id) ?? 0, expectedLast30: daysActive * perDay };
      }));
    };
    void fetchAdherence();
  }, [patient?.user_id]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
      if (error) { setError(error.message); return; }
      setPatient(data);
      setCareForm({ doctor_quick_notes: data.doctor_quick_notes || '', care_plan: data.care_plan || '', follow_up_date: data.follow_up_date || '' });
    } catch (err) {
      setError('Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  const startChat = () => {
    if (patient) navigate('/doctor-chat', { state: { patientId: patient.user_id, patientName: patient.name } });
  };

  const exportFHIR = async () => {
    if (!patient) return;
    setExportingFhir(true);
    const [{ data: labData }, { data: rxData }] = await Promise.all([
      supabase.from('lab_metrics').select('*').eq('patient_id', patient.user_id ?? patient.id),
      supabase.from('prescriptions').select('*').eq('patient_user_id', patient.user_id ?? patient.id),
    ]);
    const bundle = patientToFHIR(patient, (labData ?? []) as FhirLabMetricInput[], (rxData ?? []) as FhirPrescriptionInput[]);
    downloadFHIRBundle(bundle, patient.name);
    setExportingFhir(false);
    toast({ title: 'FHIR export downloaded', description: `${patient.name}_FHIR_R4.json` });
  };

  const saveCareDetails = async () => {
    if (!patient) return;
    try {
      setSavingCarePlan(true);
      const { error: updateError } = await supabase.from('patients').update({
        doctor_quick_notes: careForm.doctor_quick_notes.trim() || null,
        care_plan: careForm.care_plan.trim() || null,
        follow_up_date: careForm.follow_up_date || null,
      }).eq('id', patient.id);
      if (updateError) throw updateError;
      setPatient((prev) => prev ? { ...prev, ...careForm } : prev);
      toast({ title: 'Saved', description: 'Care plan details updated successfully.' });
    } catch (saveError) {
      toast({ title: 'Save failed', description: 'Unable to update care details right now.', variant: 'destructive' });
    } finally {
      setSavingCarePlan(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#eef5fc' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1868b7] mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading patient details...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#eef5fc' }}>
        <Card className="w-full max-w-md border-[#cddff0]">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error || 'Patient not found'}</p>
            <Button onClick={() => navigate('/patients')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Patients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: '#eef5fc' }}>

      {/* Patient Header Banner */}
      <div
        className="relative overflow-hidden px-8 py-6"
        style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="max-w-4xl mx-auto relative z-10">
          <button
            onClick={() => navigate('/patients')}
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Patients
          </button>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
                style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)' }}
              >
                {getInitials(patient.name)}
              </div>
              <div>
                <h1 className="text-[26px] font-bold text-white mb-2">{patient.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  {patient.age && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-white/20 text-white">
                      <Calendar className="h-3 w-3" /> {patient.age} years old
                    </span>
                  )}
                  {patient.gender && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold bg-white/20 text-white">
                      {patient.gender}
                    </span>
                  )}
                  {patient.follow_up_date && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-white/20 text-white">
                      <HeartPulse className="h-3 w-3" /> Follow-up: {new Date(patient.follow_up_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void exportFHIR()}
                disabled={exportingFhir}
                className="border-white/30 text-white hover:bg-white/10 bg-white/10 text-[13px]"
              >
                <Download className="h-4 w-4 mr-1.5" />
                {exportingFhir ? 'Exporting...' : 'Export FHIR'}
              </Button>
              <Button
                onClick={startChat}
                className="bg-white text-[#1868b7] hover:bg-blue-50 font-bold border-0 text-[13px]"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Start Chat
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Contact Information */}
          <div className="bg-white rounded-xl border border-[#cddff0] shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3"
              style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #f7fbff, #f0f6fc)' }}
            >
              <div className="p-1.5 rounded-lg" style={{ background: '#dceaf6' }}>
                <User className="h-4 w-4 text-[#1868b7]" />
              </div>
              <h3 className="font-bold text-[14px] text-slate-800">Contact Information</h3>
            </div>
            <div className="p-5 space-y-4">
              {patient.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[#1868b7] shrink-0" />
                  <span className="text-sm text-slate-700">{patient.email}</span>
                </div>
              )}
              {patient.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-[#1868b7] shrink-0" />
                  <span className="text-sm text-slate-700">{patient.phone}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-[#1868b7] shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700">{patient.address}</span>
                </div>
              )}
              {!patient.email && !patient.phone && !patient.address && (
                <p className="text-sm text-slate-400 italic">No contact information provided.</p>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
            <div className="bg-white rounded-xl border border-[#cddff0] shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-3"
                style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #f7fbff, #f0f6fc)' }}
              >
                <div className="p-1.5 rounded-lg" style={{ background: '#ffeedd' }}>
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-[14px] text-slate-800">Emergency Contact</h3>
              </div>
              <div className="p-5 space-y-4">
                {patient.emergency_contact_name && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-sm text-slate-700">{patient.emergency_contact_name}</span>
                  </div>
                )}
                {patient.emergency_contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-sm text-slate-700">{patient.emergency_contact_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medical Information */}
          <div className="bg-white rounded-xl border border-[#cddff0] shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3"
              style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #fff7f7, #fff2f2)' }}
            >
              <div className="p-1.5 rounded-lg" style={{ background: '#fee2e2' }}>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <h3 className="font-bold text-[14px] text-slate-800">Medical Information</h3>
            </div>
            <div className="p-5 space-y-5">
              {patient.allergies && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    <h4 className="font-semibold text-[13px] text-red-600">Allergies</h4>
                  </div>
                  <p className="text-sm text-slate-600 pl-5">{patient.allergies}</p>
                </div>
              )}
              {patient.current_medications && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="h-3.5 w-3.5 text-[#1868b7]" />
                    <h4 className="font-semibold text-[13px] text-[#1868b7]">Current Medications</h4>
                  </div>
                  <p className="text-sm text-slate-600 pl-5">{patient.current_medications}</p>
                </div>
              )}
              {patient.medical_history && (
                <div>
                  <h4 className="font-semibold text-[13px] text-slate-700 mb-2">Medical History</h4>
                  <p className="text-sm text-slate-600">{patient.medical_history}</p>
                </div>
              )}
              {!patient.allergies && !patient.current_medications && !patient.medical_history && (
                <p className="text-sm text-slate-400 italic">No medical information on record.</p>
              )}
            </div>
          </div>

          {/* Registration Info */}
          <div className="bg-white rounded-xl border border-[#cddff0] shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3"
              style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #f7fbff, #f0f6fc)' }}
            >
              <div className="p-1.5 rounded-lg" style={{ background: '#dceaf6' }}>
                <ClipboardList className="h-4 w-4 text-[#1868b7]" />
              </div>
              <h3 className="font-bold text-[14px] text-slate-800">Registration Details</h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Patient ID</p>
                <p className="text-sm text-slate-600 font-mono bg-slate-50 px-3 py-1.5 rounded-lg">{patient.id}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Registered</p>
                <p className="text-sm text-slate-600">{new Date(patient.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* Medication Adherence */}
          {adherence.length > 0 && (
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#cddff0] shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-3"
                style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #f7fbff, #f0f6fc)' }}
              >
                <div className="p-1.5 rounded-lg" style={{ background: '#dceaf6' }}>
                  <ClipboardList className="h-4 w-4 text-[#1868b7]" />
                </div>
                <h3 className="font-bold text-[14px] text-slate-800">Medication Adherence (Last 30 Days)</h3>
              </div>
              <div className="p-5 space-y-4">
                {adherence.map((entry) => {
                  const pct = entry.expectedLast30 > 0 ? Math.min(100, Math.round((entry.logsLast30 / entry.expectedLast30) * 100)) : 0;
                  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={entry.drugName} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800">{entry.drugName}</span>
                        <span className="text-slate-400 text-xs font-medium">
                          {entry.logsLast30} / {entry.expectedLast30} doses · <span style={{ color }} className="font-bold">{pct}%</span>
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: '#f0f6fc' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <p className="text-xs text-slate-400">{entry.frequency}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Doctor Notes & Care Plan */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#cddff0] shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3"
              style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #f7fbff, #f0f6fc)' }}
            >
              <div className="p-1.5 rounded-lg" style={{ background: '#dceaf6' }}>
                <HeartPulse className="h-4 w-4 text-[#1868b7]" />
              </div>
              <h3 className="font-bold text-[14px] text-slate-800">Doctor Notes & Care Plan</h3>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="doctor-quick-notes" className="text-sm font-semibold text-slate-700">Quick Notes</Label>
                <Textarea
                  id="doctor-quick-notes"
                  value={careForm.doctor_quick_notes}
                  onChange={(e) => setCareForm((prev) => ({ ...prev, doctor_quick_notes: e.target.value }))}
                  placeholder="Short note like: Follow-up in 7 days"
                  rows={3}
                  className="border-[#c0dcf5] focus-visible:ring-[#1868b7]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient-care-plan" className="text-sm font-semibold text-slate-700">Care Plan (visible to patient)</Label>
                <Textarea
                  id="patient-care-plan"
                  value={careForm.care_plan}
                  onChange={(e) => setCareForm((prev) => ({ ...prev, care_plan: e.target.value }))}
                  placeholder="Instructions for patient care"
                  rows={4}
                  className="border-[#c0dcf5] focus-visible:ring-[#1868b7]"
                />
              </div>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="follow-up-date" className="text-sm font-semibold text-slate-700">Next Follow-Up Date</Label>
                <Input
                  id="follow-up-date"
                  type="date"
                  value={careForm.follow_up_date}
                  onChange={(e) => setCareForm((prev) => ({ ...prev, follow_up_date: e.target.value }))}
                  className="border-[#c0dcf5] focus-visible:ring-[#1868b7]"
                />
              </div>
              <Button
                onClick={saveCareDetails}
                disabled={savingCarePlan}
                className="text-white border-0"
                style={{ background: 'linear-gradient(135deg, #1868b7, #0891b2)' }}
              >
                {savingCarePlan ? 'Saving...' : 'Save Care Details'}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
