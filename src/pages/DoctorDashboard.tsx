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
  Bot,
  Stethoscope,
  HeartPulse,
  ActivitySquare,
} from 'lucide-react';

type DashboardPatient = {
  id: string;
  user_id: string | null;
  name: string;
  medical_history: string | null;
  follow_up_date: string | null;
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
          .select('id, user_id, name, medical_history, follow_up_date, created_at')
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
        toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user, toast]);

  const unreadMessages = useMemo(
    () => messages.filter((m) => !m.is_read && m.sender_id !== doctorUserId).length,
    [messages, doctorUserId]
  );

  const todayRange = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  const todaysConsults = useMemo(
    () => sessions.filter((s) => {
      if (!s.last_message_at) return false;
      const t = new Date(s.last_message_at);
      return t >= todayRange.start && t <= todayRange.end;
    }).length,
    [sessions, todayRange]
  );

  const newPatientsThisWeek = useMemo(() => {
    const weekStart = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    return patients.filter((p) => new Date(p.created_at) >= weekStart).length;
  }, [patients]);

  const waitingReviews = useMemo(() => {
    const patientUserIdsWithUnread = new Set(
      sessions
        .filter((s) => messages.some(
          (m) => m.session_id === s.id && !m.is_read && m.sender_id !== doctorUserId
        ))
        .map((s) => s.participant_1_id === doctorUserId ? s.participant_2_id : s.participant_1_id)
        .filter(Boolean)
    );
    return patientUserIdsWithUnread.size;
  }, [sessions, messages, doctorUserId]);

  const kpis = useMemo(() => [
    {
      label: 'Total Patients',
      value: patients.length.toLocaleString(),
      icon: Users,
      trend: `+${newPatientsThisWeek} this week`,
      trendUp: true,
      iconBg: 'linear-gradient(135deg, #1868b7, #0891b2)',
      cardBg: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%)',
      borderColor: '#c0dcf5',
      valueColor: '#1868b7',
    },
    {
      label: "Today's Consults",
      value: todaysConsults.toString(),
      icon: Calendar,
      trend: `${sessions.length} total sessions`,
      trendUp: todaysConsults > 0,
      iconBg: 'linear-gradient(135deg, #0891b2, #06b6d4)',
      cardBg: 'linear-gradient(135deg, #f0fbff 0%, #e0f7ff 100%)',
      borderColor: '#b0e4f7',
      valueColor: '#0891b2',
    },
    {
      label: 'Pending Reviews',
      value: waitingReviews.toString(),
      icon: Activity,
      trend: waitingReviews > 0 ? 'Requires attention' : 'All reviewed',
      trendUp: false,
      iconBg: 'linear-gradient(135deg, #d97706, #f59e0b)',
      cardBg: 'linear-gradient(135deg, #fffbf0 0%, #fef3c7 100%)',
      borderColor: '#fcd34d',
      valueColor: '#d97706',
    },
    {
      label: 'Unread Messages',
      value: unreadMessages.toString(),
      icon: MessageSquare,
      trend: `${sessions.length} active chats`,
      trendUp: false,
      iconBg: 'linear-gradient(135deg, #059669, #10b981)',
      cardBg: 'linear-gradient(135deg, #f0fdf7 0%, #d1fae5 100%)',
      borderColor: '#6ee7b7',
      valueColor: '#059669',
    },
  ], [patients.length, newPatientsThisWeek, todaysConsults, waitingReviews, unreadMessages, sessions.length]);

  const upcomingFollowUps = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in14Days = new Date(today); in14Days.setDate(today.getDate() + 14);
    return patients
      .filter((p) => p.follow_up_date)
      .map((p) => {
        const followUp = new Date(p.follow_up_date!); followUp.setHours(0, 0, 0, 0);
        const diffDays = Math.round((followUp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...p, followUpDate: followUp, diffDays };
      })
      .filter((p) => p.diffDays <= 14)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [patients]);

  const formatFollowUpLabel = (diffDays: number) => {
    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: 'text-red-600 bg-red-50 border-red-200' };
    if (diffDays === 0) return { label: 'Today', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    if (diffDays === 1) return { label: 'Tomorrow', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    return { label: `In ${diffDays}d`, color: 'text-slate-600 bg-slate-50 border-slate-200' };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const aiInsights = useMemo<DashboardInsight[]>(() => {
    const unreadByPatientUserId = new Map<string, number>();
    sessions.forEach((session) => {
      const patientUserId = session.participant_1_id === doctorUserId ? session.participant_2_id : session.participant_1_id;
      if (!patientUserId) return;
      const unreadCount = messages.filter(
        (m) => m.session_id === session.id && !m.is_read && m.sender_id !== doctorUserId
      ).length;
      if (unreadCount > 0) unreadByPatientUserId.set(patientUserId, unreadCount);
    });
    return patients.slice(0, 3).map((patient) => {
      const unreadCount = patient.user_id ? unreadByPatientUserId.get(patient.user_id) || 0 : 0;
      const priority = getPriorityFromPatient(patient);
      return { id: patient.id, patient: patient.name, insight: getInsightText(patient, unreadCount), priority };
    });
  }, [patients, sessions, messages, doctorUserId]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto h-full" style={{ background: '#eef5fc' }}>

      {/* Hero Banner */}
      <div
        className="relative overflow-hidden shrink-0 px-8 py-7"
        style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 80%, #0891b2 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute top-4 right-24 w-24 h-24 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute -bottom-10 right-60 w-36 h-36 rounded-full opacity-10" style={{ background: 'white' }} />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HeartPulse className="h-5 w-5 text-white/70" />
              <span className="text-white/70 text-sm font-medium">Doctor Dashboard</span>
            </div>
            <h1 className="text-[26px] font-bold text-white tracking-tight mb-1">
              Welcome back, Dr. {user?.name?.split(' ')[1] || user?.name || 'Doctor'}
            </h1>
            <p className="text-white/70 text-[14px] font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — Here's your practice overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/ai-chat')}
              className="border border-white/30 text-white hover:bg-white/10 h-10 px-4 rounded-lg font-semibold text-[14px] bg-white/10"
            >
              <Bot className="w-4 h-4 mr-2" />
              Ask AI Assistant
            </Button>
            <Button
              onClick={() => navigate('/register-patient')}
              className="bg-white text-[#1868b7] hover:bg-blue-50 h-10 px-5 rounded-lg font-bold text-[14px] shadow-sm border-0"
            >
              + New Patient
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-8 py-6 space-y-6 pb-10">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <div
              key={idx}
              className="rounded-xl border p-5 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              style={{ background: kpi.cardBg, borderColor: kpi.borderColor }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="p-3 rounded-xl shadow-sm"
                  style={{ background: kpi.iconBg }}
                >
                  <kpi.icon className="w-5 h-5 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  kpi.trendUp ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-white/60'
                }`}>
                  {kpi.trendUp && <TrendingUp className="w-3 h-3" />}
                  <span>{kpi.trend}</span>
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-bold leading-none mb-1.5" style={{ color: kpi.valueColor }}>
                  {kpi.value}
                </h3>
                <p className="text-[13px] font-semibold text-slate-500">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Upcoming Follow-ups */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[#cddff0] rounded-xl shadow-sm flex flex-col overflow-hidden h-full">
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #f7fbff 0%, #f0f6fc 100%)' }}
              >
                <h2 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg" style={{ background: '#dceaf6' }}>
                    <Calendar className="w-4 h-4 text-[#1868b7]" />
                  </div>
                  Upcoming Follow-ups
                </h2>
                <button
                  onClick={() => navigate('/patients')}
                  className="text-[13px] font-bold flex items-center gap-0.5 transition-colors hover:opacity-80"
                  style={{ color: '#1868b7' }}
                >
                  All Patients <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100/80 flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-slate-500 text-sm font-medium">Loading follow-ups...</div>
                ) : upcomingFollowUps.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#f0f6fc' }}>
                      <Clock className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-600 text-sm font-semibold mb-1">No follow-ups in the next 14 days</p>
                    <p className="text-slate-400 text-xs">Set follow-up dates on patient profiles to see them here.</p>
                  </div>
                ) : upcomingFollowUps.map((p) => {
                  const { label, color } = formatFollowUpLabel(p.diffDays);
                  return (
                    <div
                      key={p.id}
                      className="px-6 py-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between group cursor-pointer border-l-2 border-transparent hover:border-[#1868b7]"
                      onClick={() => navigate(`/patient/${p.id}`)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm ring-2 ring-white">
                          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-[14px] leading-tight mb-0.5">{p.name}</h4>
                          <p className="text-[12px] text-slate-500 font-medium">
                            {p.followUpDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[11px] font-bold border px-2 py-0.5 rounded-full ${color}`}>
                          {label}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowUpRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right — AI Clinical Insights */}
          <div>
            <div
              className="border rounded-xl shadow-sm flex flex-col h-full overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f2fd 100%)', borderColor: '#c0dcf5' }}
            >
              {/* Decorative */}
              <div className="absolute top-0 right-0 p-5 opacity-[0.06] pointer-events-none">
                <Bot className="w-36 h-36 text-[#1868b7]" />
              </div>

              <div className="px-5 py-4 flex items-center justify-between relative z-10"
                style={{ borderBottom: '1px solid rgba(192,220,245,0.6)' }}
              >
                <h2 className="text-[15px] font-bold text-[#1868b7] flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  AI Clinical Insights
                </h2>
                <span className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#1868b7' }}
                >
                  AUTO-TRIAGE
                </span>
              </div>

              <div className="p-5 space-y-3 flex-1 relative z-10">
                {loading ? (
                  <div className="text-[13px] text-slate-600">Generating insights from your patient data...</div>
                ) : aiInsights.length === 0 ? (
                  <div className="text-[13px] text-slate-600">No patient data available for insights yet.</div>
                ) : aiInsights.map((insight) => (
                  <div key={insight.id}
                    className="bg-white rounded-xl p-4 shadow-sm border border-[#dceaf6] relative overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${
                      insight.priority === 'High' ? 'bg-red-500' : insight.priority === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <div className="flex items-start justify-between mb-2 pl-2">
                      <h4 className="font-bold text-slate-900 text-[13px]">{insight.patient}</h4>
                      <div className="flex items-center gap-1">
                        {insight.priority === 'High' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        {insight.priority === 'Low' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        <span className={`text-[10px] font-bold uppercase tracking-wide border px-1.5 py-0.5 rounded-full ${getPriorityColor(insight.priority)}`}>
                          {insight.priority}
                        </span>
                      </div>
                    </div>
                    <p className="text-[12px] text-slate-600 leading-relaxed pl-2">{insight.insight}</p>
                    <div className="mt-3 pl-2 flex justify-end">
                      <button
                        onClick={() => navigate('/patients')}
                        className="text-[12px] font-bold transition-colors hover:opacity-80"
                        style={{ color: '#1868b7' }}
                      >
                        Review Case →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Patients', desc: 'View patient directory', icon: Users, url: '/patients' },
            { label: 'Appointments', desc: 'Schedule & manage', icon: Calendar, url: '/appointments' },
            { label: 'Prescriptions', desc: 'Issue prescriptions', icon: Stethoscope, url: '/prescriptions' },
            { label: 'Clinical Modules', desc: 'Reports & decision support', icon: ActivitySquare, url: '/clinical-modules' },
          ].map((link, idx) => (
            <button
              key={idx}
              onClick={() => navigate(link.url)}
              className="bg-white border border-[#cddff0] rounded-xl p-4 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: '#f0f6fc' }}>
                  <link.icon className="h-4 w-4 text-[#1868b7]" />
                </div>
              </div>
              <p className="text-[13px] font-bold text-slate-800 group-hover:text-[#1868b7] transition-colors">{link.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{link.desc}</p>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default DoctorDashboard;
