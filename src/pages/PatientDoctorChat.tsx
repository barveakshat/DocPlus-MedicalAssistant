import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDoctorPatientChat } from '@/hooks/useDoctorPatientChat';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DoctorPatientChatWindow from '@/components/DoctorPatientChatWindow';
import SymptomTriageWizard, { type TriageResult } from '@/components/SymptomTriageWizard';
import { Stethoscope, AlertTriangle, CheckCircle, Phone, Loader2, MessageCircle, CalendarDays } from 'lucide-react';

interface DoctorInfo {
  id: string;
  name: string;
  user_id: string;
  registration_no?: string;
}

interface DoctorPatientChatSession {
  id: string;
  doctor_id: string;
  patient_id: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PatientCarePlanInfo {
  care_plan: string | null;
  follow_up_date: string | null;
}

const TRIAGE_SESSION_KEY = 'docplus_triage_done';

const PatientDoctorChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [currentSession, setCurrentSession] = useState<DoctorPatientChatSession | null>(null);
  const [carePlanInfo, setCarePlanInfo] = useState<PatientCarePlanInfo>({ care_plan: null, follow_up_date: null });
  const [loading, setLoading] = useState(true);
  const [showTriage, setShowTriage] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

  if (!user || user.role !== 'patient') {
    return (
      <div className="flex-1 h-full flex items-center justify-center" style={{ background: '#eef5fc' }}>
        <div className="text-center bg-white border border-[#cddff0] rounded-2xl p-10 shadow-sm max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#f0f6fc' }}>
            <Stethoscope className="h-8 w-8 text-[#c0dcf5]" />
          </div>
          <h3 className="text-[16px] font-bold text-slate-800 mb-2">Access Denied</h3>
          <p className="text-[13px] text-slate-500">This page is only accessible to patients.</p>
        </div>
      </div>
    );
  }

  const {
    sessions: doctorPatientSessions,
    createSession: createDoctorPatientSession,
    markMessagesAsRead: markDoctorPatientMessagesAsRead,
    fetchSessions: refreshDoctorPatientSessions,
  } = useDoctorPatientChat(currentSession?.id || null);

  useEffect(() => {
    if (user?.role === 'patient' && !sessionStorage.getItem(TRIAGE_SESSION_KEY)) {
      setShowTriage(true);
    }
  }, [user?.role]);

  const handleTriageComplete = (result: TriageResult) => {
    sessionStorage.setItem(TRIAGE_SESSION_KEY, '1');
    setTriageResult(result);
    setShowTriage(false);
  };

  const handleTriageSkip = () => {
    sessionStorage.setItem(TRIAGE_SESSION_KEY, '1');
    setShowTriage(false);
  };

  useEffect(() => {
    if (user?.id) void loadDoctorInfo();
    else setLoading(false);
  }, [user]);

  const loadDoctorInfo = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data: patientData, error: patientError } = await supabase
        .from('patients').select('assigned_doctor_id, name, email, care_plan, follow_up_date').eq('user_id', user.id).single();

      if (patientError) {
        if (patientError.code === 'PGRST116') {
          const { data: availableDoctors } = await supabase.from('doctors').select('user_id').limit(5);
          const availableDoctor = availableDoctors?.[0] || null;
          const { data: newPatient, error: createError } = await supabase.from('patients').insert({
            user_id: user.id, name: user.name || 'Patient', email: user.email || '', phone: '',
            age: null, gender: '', address: '', emergency_contact_name: '', emergency_contact_phone: '',
            medical_history: '', allergies: '', current_medications: '', assigned_doctor_id: availableDoctor?.user_id || null,
          }).select('assigned_doctor_id, name, email, care_plan, follow_up_date').single();
          if (createError) { toast({ title: 'Registration Error', description: 'Failed to create your patient record.', variant: 'destructive' }); setLoading(false); return; }
          if (!newPatient?.assigned_doctor_id) { setLoading(false); return; }
          const { data: doctors } = await supabase.from('doctors').select('id, user_id, name, registration_no').limit(10);
          const doctorData = doctors?.find(d => d.user_id === newPatient.assigned_doctor_id);
          if (doctorData) {
            setDoctorInfo(doctorData);
            await loadOrCreateChatSession(doctorData.user_id);
          }
          setLoading(false); return;
        } else {
          toast({ title: 'Error', description: 'Could not load your doctor information.', variant: 'destructive' });
          setLoading(false); return;
        }
      }

      setCarePlanInfo({ care_plan: patientData?.care_plan || null, follow_up_date: patientData?.follow_up_date || null });
      if (!patientData?.assigned_doctor_id) { setLoading(false); return; }

      const { data: doctors } = await supabase.from('doctors').select('id, user_id, name, registration_no').limit(10);
      const doctorData = doctors?.find(d => d.user_id === patientData.assigned_doctor_id);
      if (doctorData) {
        setDoctorInfo(doctorData);
        await loadOrCreateChatSession(doctorData.user_id);
      } else {
        await loadOrCreateChatSession(patientData.assigned_doctor_id);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load doctor information.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadOrCreateChatSession = async (doctorUserId: string) => {
    if (!user?.id) return;
    try {
      const newSession = await createDoctorPatientSession(
        doctorUserId,
        user.auth_user_id || user.id,
        `Chat with Dr. ${doctorInfo?.name || 'Doctor'}`
      );
      if (newSession) {
        setCurrentSession(newSession);
        await markDoctorPatientMessagesAsRead();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to initialize chat session.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center" style={{ background: '#eef5fc' }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1868b7] mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading your doctor information...</p>
        </div>
      </div>
    );
  }

  if (!doctorInfo) {
    return (
      <div className="flex-1 h-full flex items-center justify-center" style={{ background: '#eef5fc' }}>
        <div className="text-center bg-white border border-[#cddff0] rounded-2xl p-10 shadow-sm max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#f0f6fc' }}>
            <Stethoscope className="h-8 w-8 text-[#c0dcf5]" />
          </div>
          <h3 className="text-[16px] font-bold text-slate-800 mb-2">No Doctor Assigned</h3>
          <p className="text-[13px] text-slate-500 mb-4">You haven't been assigned a doctor yet. Please contact the clinic for assistance.</p>
          <Button onClick={() => window.history.back()} className="text-white border-0" style={{ background: 'linear-gradient(135deg, #1868b7, #0891b2)' }}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Triage banner config
  const triageBannerConfig = triageResult ? {
    Emergency: { bg: '#fff0f0', border: '#fecaca', textColor: '#dc2626', icon: <Phone className="h-4 w-4 shrink-0 text-red-600" /> },
    Urgent: { bg: '#fffbeb', border: '#fde68a', textColor: '#d97706', icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" /> },
    Routine: { bg: '#f0fdf4', border: '#bbf7d0', textColor: '#059669', icon: <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" /> },
  }[triageResult.urgency] : null;

  const headerExtras = (
    <>
      {triageResult && triageBannerConfig && (
        <div className="flex items-start gap-2.5 border rounded-xl px-4 py-3 text-[12px]"
          style={{ background: triageBannerConfig.bg, borderColor: triageBannerConfig.border }}
        >
          {triageBannerConfig.icon}
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: triageBannerConfig.textColor }}>Triage: {triageResult.urgency}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: triageBannerConfig.bg, border: `1px solid ${triageBannerConfig.border}`, color: triageBannerConfig.textColor }}>
                {triageResult.chiefComplaint}
              </span>
            </div>
            <p className="text-[11px] opacity-80" style={{ color: triageBannerConfig.textColor }}>{triageResult.summary}</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600 shrink-0" onClick={() => setTriageResult(null)}>
            <span className="text-[12px]">✕</span>
          </button>
        </div>
      )}

      {(carePlanInfo.care_plan || carePlanInfo.follow_up_date) && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #c0dcf5', background: '#f0f6fc' }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid #c0dcf5' }}>
            <div className="p-1 rounded-lg" style={{ background: '#dceaf6' }}>
              <Stethoscope className="h-3.5 w-3.5 text-[#1868b7]" />
            </div>
            <span className="text-[13px] font-bold text-[#1868b7]">My Care Plan</span>
          </div>
          <div className="px-4 py-3 space-y-1.5">
            {carePlanInfo.care_plan && (
              <p className="text-[12px] text-slate-600 leading-relaxed max-h-16 overflow-y-auto">{carePlanInfo.care_plan}</p>
            )}
            {carePlanInfo.follow_up_date && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-[#1868b7]" />
                <p className="text-[12px] font-medium text-[#1868b7]">
                  Next follow-up: {new Date(carePlanInfo.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden" style={{ background: '#eef5fc' }}>
      {showTriage && (
        <SymptomTriageWizard onComplete={handleTriageComplete} onSkip={handleTriageSkip} />
      )}

      {/* Banner */}
      <div
        className="relative overflow-hidden px-8 py-5 shrink-0"
        style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div className="absolute top-3 right-28 w-20 h-20 rounded-full opacity-10 bg-white" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-white tracking-tight leading-tight">
              Chat with Dr. {doctorInfo.name}
            </h1>
            <p className="text-white/70 text-[13px] font-medium">Secure real-time messaging</p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-white text-[12px] font-semibold">Dr. {doctorInfo.name}</span>
            {doctorInfo.registration_no && (
              <span className="text-white/60 text-[11px]">· Reg. {doctorInfo.registration_no}</span>
            )}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 min-h-0 p-5">
        <DoctorPatientChatWindow
          session={currentSession as any}
          onSessionUpdate={refreshDoctorPatientSessions}
          isLoading={loading}
          otherParticipantName={`Dr. ${doctorInfo.name}`}
          headerExtras={headerExtras}
        />
      </div>
    </div>
  );
};

export default PatientDoctorChat;
