import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle, Users, UserCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Patient = {
  id: string;
  name: string;
  age: number | null;
  email: string | null;
  phone: string | null;
  medical_history: string | null;
  allergies: string | null;
  current_medications: string | null;
  gender: string | null;
  follow_up_date: string | null;
  doctor_quick_notes: string | null;
  created_at: string;
  user_id: string;
};

type PatientSignal = {
  unreadCount: number;
  lastMessageAt: string | null;
  missingProfileFields: string[];
};

const Patients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSignals, setPatientSignals] = useState<Record<string, PatientSignal>>({});
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (user?.role === 'doctor') fetchPatients();
  }, [user]);

  const fetchPatients = async () => {
    try {
      if (!user || user.role !== 'doctor') return;
      const { data: doctor } = await supabase.from('doctors').select('*').eq('user_id', user.id).maybeSingle();
      if (!doctor) return;

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('assigned_doctor_id', doctor.user_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const patientRows = (data || []) as Patient[];
      setPatients(patientRows);

      const patientUserIds = patientRows.map((p) => p.user_id).filter(Boolean);
      if (patientUserIds.length === 0) { setPatientSignals({}); return; }

      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('id, participant_1_id, participant_2_id, last_message_at')
        .eq('session_type', 'doctor-patient')
        .or(`participant_1_id.eq.${doctor.user_id},participant_2_id.eq.${doctor.user_id}`);
      if (sessionsError) throw sessionsError;

      const sessionToPatientUserId: Record<string, string> = {};
      const latestByPatient: Record<string, string | null> = {};
      for (const session of sessions || []) {
        const otherParticipant = session.participant_1_id === doctor.user_id ? session.participant_2_id : session.participant_1_id;
        if (otherParticipant && patientUserIds.includes(otherParticipant)) {
          sessionToPatientUserId[session.id] = otherParticipant;
          const existing = latestByPatient[otherParticipant];
          if (!existing || (session.last_message_at && new Date(session.last_message_at) > new Date(existing))) {
            latestByPatient[otherParticipant] = session.last_message_at;
          }
        }
      }

      const sessionIds = Object.keys(sessionToPatientUserId);
      let unreadByPatient: Record<string, number> = {};
      if (sessionIds.length > 0) {
        const { data: unreadMessages, error: unreadError } = await supabase
          .from('messages')
          .select('session_id')
          .in('session_id', sessionIds)
          .neq('sender_id', doctor.user_id)
          .eq('is_read', false);
        if (unreadError) throw unreadError;
        unreadByPatient = (unreadMessages || []).reduce<Record<string, number>>((acc, msg) => {
          const patientUserId = sessionToPatientUserId[msg.session_id];
          if (patientUserId) acc[patientUserId] = (acc[patientUserId] || 0) + 1;
          return acc;
        }, {});
      }

      const signals: Record<string, PatientSignal> = {};
      for (const patient of patientRows) {
        const missingFields: string[] = [];
        if (!patient.phone?.trim()) missingFields.push('phone');
        if (!patient.age) missingFields.push('age');
        if (!patient.gender?.trim()) missingFields.push('gender');
        if (!patient.medical_history?.trim()) missingFields.push('medical history');
        if (!patient.allergies?.trim()) missingFields.push('allergies');
        if (!patient.current_medications?.trim()) missingFields.push('medications');
        signals[patient.user_id] = {
          unreadCount: unreadByPatient[patient.user_id] || 0,
          lastMessageAt: latestByPatient[patient.user_id] || null,
          missingProfileFields: missingFields,
        };
      }
      setPatientSignals(signals);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({ title: 'Error', description: 'Failed to load patients', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const getPatientStatus = (patient: Patient) => {
    const signal = patientSignals[patient.user_id];
    if (signal?.unreadCount > 0) return { label: 'Needs Reply', bg: 'bg-red-100', text: 'text-red-700' };
    if ((signal?.missingProfileFields.length || 0) >= 3) return { label: 'Profile Incomplete', bg: 'bg-amber-100', text: 'text-amber-700' };
    if (!signal?.lastMessageAt) return { label: 'No Chat Yet', bg: 'bg-slate-100', text: 'text-slate-600' };
    const daysSince = Math.floor((Date.now() - new Date(signal.lastMessageAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 14) return { label: 'Dormant', bg: 'bg-slate-100', text: 'text-slate-600' };
    return { label: 'Active', bg: 'bg-emerald-100', text: 'text-emerald-700' };
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  const formatLastMessageAge = (lastMessageAt: string | null) => {
    if (!lastMessageAt) return 'No messages';
    const diffHours = Math.floor((Date.now() - new Date(lastMessageAt).getTime()) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Summary stats
  const totalPatients = patients.length;
  const activePatients = Object.values(patientSignals).filter(s => s.lastMessageAt && (Date.now() - new Date(s.lastMessageAt).getTime()) < 14 * 24 * 3600 * 1000).length;
  const needingReply = Object.values(patientSignals).filter(s => s.unreadCount > 0).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full" style={{ background: '#eef5fc' }}>

      {/* Page Header Banner */}
      <div
        className="relative overflow-hidden shrink-0 px-8 py-6"
        style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div className="absolute top-3 right-28 w-20 h-20 rounded-full opacity-10 bg-white" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-[24px] font-bold text-white tracking-tight mb-1">Patient Directory</h1>
            <p className="text-white/70 text-[14px] font-medium">Manage and monitor your patient records in real-time.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-white/20 bg-white/15 text-white placeholder:text-white/50 rounded-lg text-[14px] focus-visible:ring-white/40"
              />
            </div>
            <Button
              onClick={() => navigate('/register-patient')}
              className="bg-white text-[#1868b7] hover:bg-blue-50 h-10 px-5 rounded-lg font-bold text-[14px] border-0 shadow-sm"
            >
              + Add Patient
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl w-full mx-auto flex flex-col flex-1 min-h-0 px-8 py-5 gap-4">

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 shrink-0">
          {[
            { label: 'Total Patients', value: totalPatients, icon: Users, color: '#1868b7', bg: '#f0f6fc', border: '#c0dcf5' },
            { label: 'Active (14 days)', value: activePatients, icon: UserCheck, color: '#059669', bg: '#f0fdf7', border: '#6ee7b7' },
            { label: 'Needing Reply', value: needingReply, icon: AlertCircle, color: '#d97706', bg: '#fffbf0', border: '#fcd34d' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl border p-4 shadow-sm flex items-center gap-3"
              style={{ background: stat.bg, borderColor: stat.border }}
            >
              <div className="p-2.5 rounded-xl" style={{ background: stat.color + '20' }}>
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-[26px] font-bold leading-none" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[12px] font-semibold text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Patient Table */}
        <div className="bg-white border border-[#cddff0] rounded-xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ background: 'linear-gradient(135deg, #f7fbff 0%, #f0f6fc 100%)', borderBottom: '1px solid #dceaf6', color: '#6b8aaa' }}
              >
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Age</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Message</th>
                  <th className="px-6 py-4">Quick Note</th>
                  <th className="px-6 py-4">Follow-Up</th>
                  <th className="px-6 py-4 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef5fc]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-28 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1868b7]"></div>
                        <p className="text-slate-500 font-medium">Loading records...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-28 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-2xl p-6 mb-2" style={{ background: '#f0f6fc' }}>
                          <Search className="h-10 w-10" style={{ color: '#c0dcf5' }} />
                        </div>
                        <p className="text-slate-700 font-bold text-[16px]">
                          {searchTerm ? 'No matching patients found' : 'No patients in directory yet'}
                        </p>
                        <p className="text-slate-400 text-[14px]">
                          {searchTerm ? 'Try adjusting your search terms.' : 'Add your first patient to start managing records.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPatients.map((patient) => {
                    const status = getPatientStatus(patient);
                    const signal = patientSignals[patient.user_id];
                    return (
                      <tr key={patient.id} className="hover:bg-[#f7fbff] transition-colors group cursor-pointer"
                        onClick={() => navigate(`/patient/${patient.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 overflow-hidden rounded-full shadow-sm ring-2 ring-white">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${patient.name}`} className="object-cover" />
                              <AvatarFallback className="text-[#1868b7] font-semibold text-sm" style={{ background: '#dceaf6' }}>
                                {getInitials(patient.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-[14px] leading-tight">{patient.name}</span>
                                {(signal?.unreadCount || 0) > 0 && (
                                  <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
                                    {signal?.unreadCount} new
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[12px] text-slate-400">{patient.email || 'No email'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-semibold text-[14px]">
                          {patient.age || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium text-[13px]">
                          {formatLastMessageAge(signal?.lastMessageAt || null)}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-[13px] max-w-[200px] truncate">
                          {patient.doctor_quick_notes?.trim() || '—'}
                        </td>
                        <td className="px-6 py-4">
                          {patient.follow_up_date ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#dceaf6] text-[#1868b7] border border-[#c0dcf5]">
                              {formatDate(patient.follow_up_date)}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[13px]">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate('/doctor-chat', { state: { patientId: patient.user_id, patientName: patient.name } })}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl transition-colors"
                            style={{ background: '#dceaf6', color: '#1868b7' }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#c0dcf5'}
                            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = '#dceaf6'}
                            title={`Chat with ${patient.name}`}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-[#eef5fc] px-6 py-3.5 bg-white flex items-center justify-between">
            <span className="text-[13px] text-slate-500 font-medium">
              Showing {paginatedPatients.length} of {filteredPatients.length} patients
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 border-[#c0dcf5] text-[#1868b7] font-semibold text-[13px] hover:bg-[#f0f6fc] rounded-lg"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 border-[#c0dcf5] text-[#1868b7] font-semibold text-[13px] hover:bg-[#f0f6fc] rounded-lg"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0 || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Patients;
