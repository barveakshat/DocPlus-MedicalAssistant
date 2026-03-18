import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Calendar, 
  Activity, 
  MessageSquare,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Bot
} from 'lucide-react';

type DashboardPatient = {
  id: string;
  user_id: string | null;
  name: string;
  medical_history: string | null;
  created_at: string;
};

type DashboardSession = {
  id: string;
  participant_1_id: string | null;
  participant_2_id: string | null;
  last_message_at: string | null;
};

type DashboardMessage = {
  id: string;
  sender_id: string | null;
  session_id: string;
  is_read: boolean | null;
  created_at: string;
};

type DashboardScheduleItem = {
  id: string;
  name: string;
  time: string;
  type: string;
  status: 'Completed' | 'In Progress' | 'Waiting' | 'Scheduled';
};

type DashboardInsight = {
  id: string;
  patient: string;
  insight: string;
  priority: 'High' | 'Medium' | 'Low';
};

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<DashboardPatient[]>([]);
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [messages, setMessages] = useState<DashboardMessage[]>([]);
  const [doctorUserId, setDoctorUserId] = useState<string | null>(null);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityFromPatient = (patient: DashboardPatient): 'High' | 'Medium' | 'Low' => {
    const medicalHistoryLength = patient.medical_history?.trim().length || 0;
    if (medicalHistoryLength > 180) return 'High';
    if (medicalHistoryLength > 40) return 'Medium';
    return 'Low';
  };

  const getInsightText = (patient: DashboardPatient, unreadCount: number) => {
    if (unreadCount > 0) {
      return `${unreadCount} unread patient message${unreadCount > 1 ? 's' : ''} pending your response.`;
    }

    if (patient.medical_history?.trim()) {
      return `Medical history available. Review latest notes before the next consultation.`;
    }

    return 'Profile details are limited. Consider collecting additional history in the next follow-up.';
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id || user.role !== 'doctor') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: doctor, error: doctorError } = await supabase
          .from('doctors')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (doctorError) throw doctorError;

        const currentDoctorUserId = doctor?.user_id || user.auth_user_id || user.id;
        setDoctorUserId(currentDoctorUserId);

        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('id, user_id, name, medical_history, created_at')
          .eq('assigned_doctor_id', currentDoctorUserId)
          .order('created_at', { ascending: false });

        if (patientsError) throw patientsError;

        const { data: sessionsData, error: sessionsError } = await supabase
          .from('chat_sessions')
          .select('id, participant_1_id, participant_2_id, last_message_at')
          .eq('session_type', 'doctor-patient')
          .or(`participant_1_id.eq.${currentDoctorUserId},participant_2_id.eq.${currentDoctorUserId}`)
          .order('last_message_at', { ascending: false, nullsFirst: false });

        if (sessionsError) throw sessionsError;

        const sessionIds = (sessionsData || []).map((session) => session.id);
        let messagesData: DashboardMessage[] = [];

        if (sessionIds.length > 0) {
          const { data: fetchedMessages, error: messagesError } = await supabase
            .from('messages')
            .select('id, sender_id, session_id, is_read, created_at')
            .in('session_id', sessionIds)
            .order('created_at', { ascending: false });

          if (messagesError) throw messagesError;
          messagesData = fetchedMessages || [];
        }

        setPatients((patientsData || []) as DashboardPatient[]);
        setSessions((sessionsData || []) as DashboardSession[]);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error loading doctor dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, toast]);

  const unreadMessages = useMemo(
    () => messages.filter((message) => !message.is_read && message.sender_id !== doctorUserId).length,
    [messages, doctorUserId]
  );

  const todayRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  const todaysConsults = useMemo(
    () => sessions.filter((session) => {
      if (!session.last_message_at) return false;
      const timestamp = new Date(session.last_message_at);
      return timestamp >= todayRange.start && timestamp <= todayRange.end;
    }).length,
    [sessions, todayRange]
  );

  const newPatientsThisWeek = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    return patients.filter((patient) => new Date(patient.created_at) >= weekStart).length;
  }, [patients]);

  const waitingReviews = useMemo(() => {
    const patientUserIdsWithUnread = new Set(
      sessions
        .filter((session) =>
          messages.some(
            (message) =>
              message.session_id === session.id &&
              !message.is_read &&
              message.sender_id !== doctorUserId
          )
        )
        .map((session) =>
          session.participant_1_id === doctorUserId ? session.participant_2_id : session.participant_1_id
        )
        .filter(Boolean)
    );

    return patientUserIdsWithUnread.size;
  }, [sessions, messages, doctorUserId]);

  const kpis = useMemo(
    () => [
      {
        label: 'Total Patients',
        value: patients.length.toLocaleString(),
        icon: Users,
        trend: `${newPatientsThisWeek} new this week`,
        trendUp: true,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      {
        label: "Today's Consults",
        value: todaysConsults.toString(),
        icon: Calendar,
        trend: `${sessions.length} total chats`,
        trendUp: todaysConsults > 0,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
      },
      {
        label: 'Pending Reviews',
        value: waitingReviews.toString(),
        icon: Activity,
        trend: waitingReviews > 0 ? 'Requires follow-up' : 'All clear',
        trendUp: false,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      },
      {
        label: 'Unread Messages',
        value: unreadMessages.toString(),
        icon: MessageSquare,
        trend: `${sessions.length} active sessions`,
        trendUp: false,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      },
    ],
    [patients.length, newPatientsThisWeek, todaysConsults, waitingReviews, unreadMessages, sessions.length]
  );

  const todaySchedule = useMemo<DashboardScheduleItem[]>(() => {
    const patientMap = new Map(
      patients
        .filter((patient) => !!patient.user_id)
        .map((patient) => [patient.user_id!, patient])
    );

    return sessions.slice(0, 5).map((session) => {
      const patientUserId = session.participant_1_id === doctorUserId ? session.participant_2_id : session.participant_1_id;
      const patient = patientUserId ? patientMap.get(patientUserId) : null;
      const unreadInSession = messages.filter(
        (message) => message.session_id === session.id && !message.is_read && message.sender_id !== doctorUserId
      ).length;

      let status: DashboardScheduleItem['status'] = 'Scheduled';
      if (unreadInSession > 0) status = 'Waiting';
      else if (session.last_message_at) {
        const sessionDate = new Date(session.last_message_at);
        const hoursSinceLastMessage = (Date.now() - sessionDate.getTime()) / (1000 * 60 * 60);
        status = hoursSinceLastMessage < 1 ? 'In Progress' : 'Completed';
      }

      return {
        id: session.id,
        name: patient?.name || 'Unknown Patient',
        time: session.last_message_at ? formatTime(session.last_message_at) : 'Not started',
        type: unreadInSession > 0 ? 'Message Follow-up' : 'Consultation Chat',
        status,
      };
    });
  }, [sessions, patients, messages, doctorUserId]);

  const aiInsights = useMemo<DashboardInsight[]>(() => {
    const unreadByPatientUserId = new Map<string, number>();

    sessions.forEach((session) => {
      const patientUserId = session.participant_1_id === doctorUserId ? session.participant_2_id : session.participant_1_id;
      if (!patientUserId) return;

      const unreadCount = messages.filter(
        (message) =>
          message.session_id === session.id &&
          !message.is_read &&
          message.sender_id !== doctorUserId
      ).length;

      if (unreadCount > 0) {
        unreadByPatientUserId.set(patientUserId, unreadCount);
      }
    });

    return patients.slice(0, 3).map((patient) => {
      const unreadCount = patient.user_id ? unreadByPatientUserId.get(patient.user_id) || 0 : 0;
      const priority = getPriorityFromPatient(patient);

      return {
        id: patient.id,
        patient: patient.name,
        insight: getInsightText(patient, unreadCount),
        priority,
      };
    });
  }, [patients, sessions, messages, doctorUserId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Waiting': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] p-8 overflow-y-auto h-full">
      <div className="max-w-7xl mx-auto w-full space-y-8 pb-10">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-2">
          <div>
            <h1 className="text-[28px] tracking-tight font-bold text-slate-900 mb-1">
              Welcome back, Dr. {user?.name?.split(' ')[1] || user?.name || 'Doctor'}
            </h1>
            <p className="text-[15px] text-slate-500 font-medium">
              Here's your practice overview for today, {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => navigate('/ai-chat')}
              className="bg-white border text-slate-700 hover:bg-slate-50 h-10 px-4 rounded-lg font-semibold shadow-sm text-[14px]"
              variant="outline"
            >
              <Bot className="w-4 h-4 mr-2 text-[#5442f5]" />
              Ask AI Assistant
            </Button>
            <Button
              onClick={() => navigate('/register-patient')}
              className="bg-[#5442f5] hover:bg-[#4335c0] text-white h-10 px-5 rounded-lg font-semibold shadow-sm text-[14px]"
            >
              New Consultation
            </Button>
          </div>
        </div>

        {/* Global KPIs Array */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden group hover:border-[#5442f5]/30 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div className={`flex items-center space-x-1 text-[12px] font-bold px-2 py-1 rounded-full ${kpi.trendUp ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-slate-50'}`}>
                  {kpi.trendUp ? <TrendingUp className="w-3 h-3" /> : null}
                  <span>{kpi.trend}</span>
                </div>
              </div>
              <div>
                <h3 className="text-[28px] font-bold text-slate-900 leading-none mb-1">{kpi.value}</h3>
                <p className="text-[13px] font-semibold text-slate-500">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Two Column Layout for the rest */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Schedule */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100/80 flex justify-between items-center">
                <h2 className="text-[16px] font-bold text-slate-900 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                  Today's Schedule
                </h2>
                <button 
                  onClick={() => navigate('/patients')}
                  className="text-[13px] font-bold text-[#5442f5] hover:text-[#4335c0] flex items-center transition-colors"
                >
                  View All <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </button>
              </div>
              
              <div className="divide-y divide-slate-100/80 flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-slate-500 text-sm font-medium">Loading schedule...</div>
                ) : todaySchedule.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm font-medium">No consultations yet.</div>
                ) : todaySchedule.map((appt) => (
                  <div key={appt.id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between group cursor-pointer border-l-2 border-transparent hover:border-[#5442f5]">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm shadow-sm ring-2 ring-white overflow-hidden">
                         <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${appt.name}`} alt={appt.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-[14px] leading-tight mb-0.5">{appt.name}</h4>
                        <p className="text-[13px] text-slate-500 font-medium">{appt.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <span className="block font-bold text-slate-800 text-[14px]">{appt.time}</span>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${getStatusColor(appt.status)}`}>
                          {appt.status}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - AI Triage & Alerts */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#f8f7ff] to-[#f4f2ff] border border-[#e8e4ff] rounded-xl shadow-sm flex flex-col h-full overflow-hidden relative">
              
              {/* Decorative AI Background Element */}
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <Bot className="w-32 h-32 text-[#5442f5]" />
              </div>

              <div className="px-6 py-5 border-b border-[#e8e4ff]/60 flex justify-between items-center relative z-10">
                <h2 className="text-[16px] font-bold text-[#3525b6] flex items-center">
                  <Bot className="w-4 h-4 mr-2" />
                  AI Clinical Insights
                </h2>
                <span className="bg-[#5442f5] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  AUTO-TRIAGE
                </span>
              </div>
              
              <div className="p-6 space-y-4 flex-1 relative z-10">
                {loading ? (
                  <div className="text-[13px] text-slate-600">Generating insights from your patient data...</div>
                ) : aiInsights.length === 0 ? (
                  <div className="text-[13px] text-slate-600">No patient data available for insights yet.</div>
                ) : aiInsights.map((insight) => (
                  <div key={insight.id} className="bg-white rounded-lg p-4 shadow-sm border border-[#e8e4ff] relative overflow-hidden group">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${insight.priority === 'High' ? 'bg-red-500' : insight.priority === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <h4 className="font-bold text-slate-900 text-[13px]">{insight.patient}</h4>
                      <div className="flex items-center space-x-1">
                        {insight.priority === 'High' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        {insight.priority === 'Low' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        <span className={`text-[10px] font-bold uppercase tracking-wide border px-1.5 py-0.5 rounded ${getPriorityColor(insight.priority)}`}>
                          {insight.priority} Priority
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-[13px] text-slate-600 leading-relaxed pl-2">
                      {insight.insight}
                    </p>
                    
                    <div className="mt-3 pl-2 flex justify-end">
                      <button
                        onClick={() => navigate('/patients')}
                        className="text-[12px] font-bold text-[#5442f5] hover:text-[#4335c0] transition-colors"
                      >
                        Review Case &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
};

export default DoctorDashboard;