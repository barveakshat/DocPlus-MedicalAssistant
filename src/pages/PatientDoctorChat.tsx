import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDoctorPatientChat } from '@/hooks/useDoctorPatientChat';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DoctorPatientChatWindow from '@/components/DoctorPatientChatWindow';
import SymptomTriageWizard, { type TriageResult } from '@/components/SymptomTriageWizard';
import { Stethoscope, AlertTriangle, CheckCircle, Phone } from 'lucide-react';

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
  const [carePlanInfo, setCarePlanInfo] = useState<PatientCarePlanInfo>({
    care_plan: null,
    follow_up_date: null,
  });
  const [loading, setLoading] = useState(true);
  const [showTriage, setShowTriage] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

  // Check if user is a patient
  if (!user || user.role !== 'patient') {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] p-6 md:p-8">
        <div className="w-full">
          <Card className="text-center py-12">
            <CardContent>
              <Stethoscope className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground mb-4">
                This page is only accessible to patients. Please log in as a patient to access doctor chat.
              </p>
              <p className="text-sm text-muted-foreground">
                Current user role: {user?.role || 'Not logged in'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Use the doctor-patient chat hook
  const {
    sessions: doctorPatientSessions,
    createSession: createDoctorPatientSession,
    markMessagesAsRead: markDoctorPatientMessagesAsRead,
    fetchSessions: refreshDoctorPatientSessions,
  } = useDoctorPatientChat(currentSession?.id || null);

  // Show triage wizard if not done this session
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

  // Load assigned doctor information
  useEffect(() => {
    if (user?.id) {
      loadDoctorInfo();
    } else {
      console.log('PatientDoctorChat: No user.id available');
    }
  }, [user]);

  const loadDoctorInfo = async () => {
    if (!user?.id) {
      console.error('No user.id available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading doctor info for patient user_id:', user.id);

      // Get patient's assigned doctor
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('assigned_doctor_id, name, email, care_plan, follow_up_date')
        .eq('user_id', user.id)
        .single();

      if (patientError) {
        console.error('Error fetching patient data:', patientError);

        if (patientError.code === 'PGRST116') {
          // Patient record doesn't exist - create it automatically

          // First, try to find an available doctor to assign - use safe bulk query approach
          const { data: availableDoctors, error: findDoctorError } = await supabase
            .from('doctors')
            .select('user_id')
            .limit(5);

          const availableDoctor = availableDoctors?.[0] || null;
          const doctorId = availableDoctor?.user_id || null;

          const { data: newPatient, error: createError } = await supabase
            .from('patients')
            .insert({
              user_id: user.id,
              name: user.name || 'Patient',
              email: user.email || '',
              phone: '',
              age: null,
              gender: '',
              address: '',
              emergency_contact_name: '',
              emergency_contact_phone: '',
              medical_history: '',
              allergies: '',
              current_medications: '',
              assigned_doctor_id: doctorId // Use available doctor or null if none found
            })
            .select('assigned_doctor_id, name, email, care_plan, follow_up_date')
            .single();

          if (createError) {
            console.error('Error creating patient record:', createError);
            toast({
              title: "Registration Error",
              description: "Failed to create your patient record. Please contact support.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          console.log('Patient record created:', newPatient);
          console.log('New patient assigned doctor ID:', newPatient?.assigned_doctor_id);
          
          // Continue with the newly created patient data
          if (!newPatient?.assigned_doctor_id) {
            console.log('New patient has no assigned doctor, showing message');
            toast({
              title: "No Doctor Assigned",
              description: "Your patient record has been created, but you don't have an assigned doctor yet. Please contact the clinic for assistance.",
              variant: "default",
            });
            setLoading(false);
            return;
          }

          console.log('Fetching doctor data for new patient, doctor user_id:', newPatient.assigned_doctor_id);

          // Get doctor details for the newly created patient - use safe bulk query approach
          const { data: doctors } = await supabase
            .from('doctors')
            .select('id, user_id, name, registration_no')
            .limit(10);

          const doctorData = doctors?.find(d => d.user_id === newPatient.assigned_doctor_id);

          if (!doctorData) {
            console.error('Doctor not found for new patient');
            console.log('Doctor query failed for new patient, doctor ID:', newPatient.assigned_doctor_id);

            // Don't show error to user, just continue without doctor info
            setDoctorInfo(null);
            await loadOrCreateChatSession(newPatient.assigned_doctor_id);
            setLoading(false);
            return;
          }

          setDoctorInfo(doctorData);
          await loadOrCreateChatSession(doctorData.user_id);
          setLoading(false);
          return;
        } else {
          toast({
            title: "Error",
            description: "Could not load your doctor information.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      console.log('Patient data found:', patientData);
      console.log('Assigned doctor ID:', patientData?.assigned_doctor_id);
      setCarePlanInfo({
        care_plan: patientData?.care_plan || null,
        follow_up_date: patientData?.follow_up_date || null,
      });

      if (!patientData?.assigned_doctor_id) {
        console.log('No assigned doctor found, showing message');
        toast({
          title: "No Doctor Assigned",
          description: "You don't have an assigned doctor yet. Please contact the clinic for assistance.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('Fetching doctor data for user_id:', patientData.assigned_doctor_id);

      // Get doctor details - use safe bulk query approach
      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, user_id, name, registration_no')
        .limit(10);

      const doctorData = doctors?.find(d => d.user_id === patientData.assigned_doctor_id);

      if (!doctorData) {
        console.error('Doctor not found');
        console.log('Doctor query failed for ID:', patientData.assigned_doctor_id);

        // Don't show error to user, just continue without doctor info
        setDoctorInfo(null);
        await loadOrCreateChatSession(patientData.assigned_doctor_id);
      } else {
        setDoctorInfo(doctorData);
        // Find or create chat session
        await loadOrCreateChatSession(doctorData.user_id);
      }

    } catch (error) {
      console.error('Error loading doctor info:', error);
      toast({
        title: "Error",
        description: "Failed to load doctor information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrCreateChatSession = async (doctorUserId: string) => {
    if (!user?.id) return;

    try {
      console.log('loadOrCreateChatSession called with doctorUserId:', doctorUserId);
      console.log('Current user.id (Clerk):', user.id);
      console.log('Current user.user_id (Database):', user.user_id);

      // Always try to create a session - the hook will handle existing sessions
      console.log('Creating new session (or finding existing one)');
      const newSession = await createDoctorPatientSession(
        doctorUserId,
        user.auth_user_id || user.id, // Use auth_user_id for consistency with Clerk user ID
        `Chat with Dr. ${doctorInfo?.name || 'Doctor'}`
      );

      console.log('Session result:', newSession);

      if (newSession) {
        setCurrentSession(newSession);
        // Mark messages as read for the session
        await markDoctorPatientMessagesAsRead();
      } else {
        console.log('Failed to get session');
      }
    } catch (error) {
      console.error('Error loading/creating chat session:', error);
      toast({
        title: "Error",
        description: "Failed to initialize chat session.",
        variant: "destructive",
      });
    }
  };

  const handleSessionUpdate = () => {
    // Just refresh the session list metadata (e.g. last_message_at).
    // Do NOT re-create sessions here — messages are already in local state.
    refreshDoctorPatientSessions();
  };

  if (loading) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] p-6 md:p-8">
        <div className="w-full">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your doctor information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!doctorInfo) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] p-6 md:p-8">
        <div className="w-full">
          <Card className="text-center py-12">
            <CardContent>
              <Stethoscope className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Doctor Assigned</h3>
              <p className="text-muted-foreground mb-4">
                You haven't been assigned a doctor yet. Please contact the clinic for assistance.
              </p>
              <Button onClick={() => window.history.back()}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const triageBannerConfig = triageResult ? {
    Emergency: { cls: 'bg-red-50 border-red-300 text-red-800', icon: <Phone className="h-4 w-4 shrink-0" /> },
    Urgent: { cls: 'bg-amber-50 border-amber-300 text-amber-800', icon: <AlertTriangle className="h-4 w-4 shrink-0" /> },
    Routine: { cls: 'bg-emerald-50 border-emerald-300 text-emerald-800', icon: <CheckCircle className="h-4 w-4 shrink-0" /> },
  }[triageResult.urgency] : null;

  return (
    <div className="flex-1 h-full overflow-hidden bg-[#fafafa] p-6 md:p-8">
      {showTriage && (
        <SymptomTriageWizard
          onComplete={handleTriageComplete}
          onSkip={handleTriageSkip}
        />
      )}
      <div className="w-full h-full flex flex-col min-h-0">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Chat with Your Doctor</h1>
              <p className="text-muted-foreground">
                Secure messaging with Dr. {doctorInfo.name}
              </p>
            </div>
            <div className="flex items-center space-x-3 bg-accent/50 px-4 py-2 rounded-lg">
              <Stethoscope className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{doctorInfo.name}</p>
                {doctorInfo.registration_no && (
                  <p className="text-sm text-muted-foreground">Reg: {doctorInfo.registration_no}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {triageResult && triageBannerConfig && (
          <div className={`mb-4 flex items-start gap-2 border rounded-xl px-4 py-3 text-sm shrink-0 ${triageBannerConfig.cls}`}>
            {triageBannerConfig.icon}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Triage: {triageResult.urgency}</span>
                <Badge variant="outline" className="text-[10px]">{triageResult.chiefComplaint}</Badge>
              </div>
              <p className="text-xs opacity-80">{triageResult.summary}</p>
            </div>
            <button className="ml-auto text-xs opacity-50 hover:opacity-80" onClick={() => setTriageResult(null)}>✕</button>
          </div>
        )}

        {(carePlanInfo.care_plan || carePlanInfo.follow_up_date) && (
          <Card className="mb-4 border-primary/20 bg-primary/5 shrink-0">
            <CardHeader>
              <CardTitle className="text-lg">My Care Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {carePlanInfo.care_plan && (
                <p className="text-sm text-foreground whitespace-pre-wrap max-h-24 overflow-y-auto pr-1">
                  {carePlanInfo.care_plan}
                </p>
              )}
              {carePlanInfo.follow_up_date && (
                <p className="text-sm text-muted-foreground">
                  Next follow-up: {new Date(carePlanInfo.follow_up_date).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex-1 min-h-0 pb-2">
          <DoctorPatientChatWindow
            session={currentSession}
            onSessionUpdate={handleSessionUpdate}
            isLoading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default PatientDoctorChat;
