import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDoctorPatientChat } from '@/hooks/useDoctorPatientChat';
import DoctorPatientChatWindow from '@/components/DoctorPatientChatWindow';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Users, Loader2 } from 'lucide-react';

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

  const navPatientId = (location.state as any)?.patientId as string | undefined;

  const { createSession, getOrCreateSession, fetchSessions } = useDoctorPatientChat(currentSession?.id || null);

  useEffect(() => {
    if (user?.id && navPatientId) {
      void loadPatientAndSession();
    } else {
      setLoading(false);
    }
  }, [user, navPatientId]);

  const loadPatientAndSession = async () => {
    if (!user?.id || !navPatientId) return;
    try {
      setLoading(true);
      const effectiveDoctorId = user.auth_user_id || user.id;
      const { data: patientData, error: patientError } = await supabase
        .from('patients').select('id, name, user_id, email').eq('user_id', navPatientId).maybeSingle();
      if (patientError || !patientData) {
        toast({ title: 'Error', description: 'Could not find the patient record.', variant: 'destructive' });
        setLoading(false); return;
      }
      setPatientInfo(patientData);
      const sessionId = await getOrCreateSession(effectiveDoctorId, patientData.user_id);
      if (sessionId) {
        const { data: sessionData } = await supabase.from('chat_sessions').select('*').eq('id', sessionId).single();
        if (sessionData) setCurrentSession(sessionData as DoctorPatientChatSession);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to initialize the chat session.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center" style={{ background: '#eef5fc' }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1868b7] mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!navPatientId || !patientInfo) {
    return (
      <div className="flex-1 h-full flex items-center justify-center" style={{ background: '#eef5fc' }}>
        <div className="text-center bg-white border border-[#cddff0] rounded-2xl p-10 shadow-sm max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#f0f6fc' }}>
            <Users className="h-8 w-8 text-[#c0dcf5]" />
          </div>
          <h3 className="text-[16px] font-bold text-slate-800 mb-2">No Patient Selected</h3>
          <p className="text-[13px] text-slate-500">
            Go to the <strong className="text-[#1868b7]">Patients</strong> page and click the chat icon next to a patient's name to start a conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden" style={{ background: '#eef5fc' }}>
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
              Chat with {patientInfo.name}
            </h1>
            <p className="text-white/70 text-[13px] font-medium">Secure real-time messaging</p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-white text-[12px] font-semibold">{patientInfo.name}</span>
            {patientInfo.email && <span className="text-white/60 text-[11px]">· {patientInfo.email}</span>}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 min-h-0 p-5">
        <DoctorPatientChatWindow
          session={currentSession}
          onSessionUpdate={() => fetchSessions()}
          isLoading={loading}
          otherParticipantName={patientInfo.name}
        />
      </div>
    </div>
  );
};

export default DoctorChat;
