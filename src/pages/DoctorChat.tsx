import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDoctorPatientChat } from '@/hooks/useDoctorPatientChat';
import DoctorPatientChatWindow from '@/components/DoctorPatientChatWindow';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';
import { Stethoscope, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PatientInfo {
  id: string;
  name: string;
  user_id: string;
  email?: string;
}

interface DoctorPatientChatSession {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  session_type?: string;
}

const DoctorChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [currentSession, setCurrentSession] = useState<DoctorPatientChatSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Get patient info from navigation state (from Patients page)
  const navPatientId = (location.state as any)?.patientId as string | undefined;
  const navPatientName = (location.state as any)?.patientName as string | undefined;

  const {
    createSession,
    getOrCreateSession,
    fetchSessions,
  } = useDoctorPatientChat(currentSession?.id || null);

  // Load patient info and create/find chat session
  useEffect(() => {
    if (user?.id && navPatientId) {
      loadPatientAndSession();
    } else {
      setLoading(false);
    }
  }, [user, navPatientId]);

  const loadPatientAndSession = async () => {
    if (!user?.id || !navPatientId) return;

    try {
      setLoading(true);
      const effectiveDoctorId = user.auth_user_id || user.id;

      // Fetch patient details
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id, name, user_id, email')
        .eq('user_id', navPatientId)
        .maybeSingle();

      if (patientError || !patientData) {
        console.error('Error fetching patient:', patientError);
        toast({
          title: 'Error',
          description: 'Could not find the patient record.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      setPatientInfo(patientData);

      // Get or create session between this doctor and patient
      const sessionId = await getOrCreateSession(effectiveDoctorId, patientData.user_id);
      if (sessionId) {
        // Fetch full session data
        const { data: sessionData } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionData) {
          setCurrentSession(sessionData as DoctorPatientChatSession);
        }
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize the chat session.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSessionUpdate = () => {
    fetchSessions();
  };

  if (loading) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] p-6 md:p-8">
        <div className="w-full">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  // No patient selected — show a prompt
  if (!navPatientId || !patientInfo) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] p-6 md:p-8">
        <div className="w-full min-h-full flex items-center justify-center">
          <Card className="text-center py-12 px-8">
            <CardContent>
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Patient Selected</h3>
              <p className="text-muted-foreground">
                Go to the <strong>Patients</strong> page and click the chat icon next to a patient's name to start a conversation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-hidden bg-[#fafafa] p-6 md:p-8">
      <div className="w-full h-full flex flex-col min-h-0">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Chat with Patient</h1>
              <p className="text-muted-foreground">
                Secure messaging with {patientInfo.name}
              </p>
            </div>
            <div className="flex items-center space-x-3 bg-accent/50 px-4 py-2 rounded-lg">
              <Stethoscope className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{patientInfo.name}</p>
                {patientInfo.email && (
                  <p className="text-sm text-muted-foreground">{patientInfo.email}</p>
                )}
              </div>
            </div>
          </div>
        </div>

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

export default DoctorChat;