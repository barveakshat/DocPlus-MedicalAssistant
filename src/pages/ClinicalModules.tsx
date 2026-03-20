import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePatientContext } from '@/contexts/PatientContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Users, ActivitySquare, FileText, FlaskConical, Brain } from 'lucide-react';
import ReportsDocumentsHub, { type ReportsInsights } from '@/components/ReportsDocumentsHub';
import ClinicalDecisionSupportPanel from '@/components/ClinicalDecisionSupportPanel';
import LabHistoryPanel from '@/components/LabHistoryPanel';
import type { Database } from '@/integrations/supabase/types';

type Patient = Database['public']['Tables']['patients']['Row'];

const ClinicalModules = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { setSelectedPatient } = usePatientContext();

  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [activeModule, setActiveModule] = useState<'reports' | 'cds' | 'lab'>('reports');
  const [reportInsights, setReportInsights] = useState<ReportsInsights>({ metrics: [], alerts: [], reportCount: 0 });

  useEffect(() => {
    if (user?.role === 'doctor') {
      void fetchPatients();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setSelectedPatient(activePatient);
    return () => { setSelectedPatient(null); };
  }, [activePatient, setSelectedPatient]);

  const fetchPatients = async () => {
    try {
      if (!user || user.role !== 'doctor') return;
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors').select('user_id').eq('user_id', user.id).maybeSingle();
      if (doctorError) throw doctorError;
      if (!doctor) { setPatients([]); setLoading(false); return; }

      const { data, error } = await supabase
        .from('patients').select('*').eq('assigned_doctor_id', doctor.user_id).order('created_at', { ascending: false });
      if (error) throw error;

      const fetchedPatients = (data || []) as Patient[];
      setPatients(fetchedPatients);
      if (fetchedPatients.length > 0) setActivePatient((prev) => prev ?? fetchedPatients[0]);
    } catch (error) {
      console.error('Error loading patients for clinical modules:', error);
      toast({ title: 'Error', description: 'Failed to load patients for clinical modules.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = useMemo(
    () => patients.filter((p) =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [patients, searchTerm]
  );

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);

  const modules = [
    { id: 'reports' as const, label: 'Reports & Documents', icon: FileText },
    { id: 'lab' as const, label: 'Lab History', icon: FlaskConical },
    { id: 'cds' as const, label: 'Clinical Decision Support', icon: Brain },
  ];

  if (user?.role !== 'doctor') {
    return (
      <div className="flex-1 h-full overflow-y-auto p-6 md:p-8" style={{ background: '#eef5fc' }}>
        <Card className="border-[#cddff0]">
          <CardContent className="py-10 text-center text-muted-foreground">
            Clinical modules are available only to doctor accounts.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-hidden" style={{ background: '#eef5fc' }}>
      <div className="h-full flex flex-col">

        {/* Page Header Banner */}
        <div
          className="relative overflow-hidden px-8 py-6 shrink-0"
          style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
        >
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 bg-white" />
          <div className="absolute top-3 right-28 w-20 h-20 rounded-full opacity-10 bg-white" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ActivitySquare className="h-4 w-4 text-white/70" />
                <span className="text-white/70 text-sm font-medium">Doctor Tools</span>
              </div>
              <h1 className="text-[24px] font-bold text-white tracking-tight mb-1">Clinical Modules</h1>
              <p className="text-white/70 text-[14px] font-medium">
                Select a patient, then run Reports, Lab History or Clinical Decision Support.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-bold bg-white/20 text-white border border-white/30">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                {patients.length} patient{patients.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 p-6 flex gap-5 overflow-hidden">

          {/* Patient List Sidebar */}
          <div className="w-[300px] shrink-0 bg-white border border-[#cddff0] rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-4 shrink-0"
              style={{ borderBottom: '1px solid #e8f0f9', background: 'linear-gradient(135deg, #f7fbff, #f0f6fc)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg" style={{ background: '#dceaf6' }}>
                  <Users className="h-4 w-4 text-[#1868b7]" />
                </div>
                <h3 className="font-bold text-[14px] text-slate-800">Patients</h3>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search patients..."
                  className="pl-9 border-[#c0dcf5] focus-visible:ring-[#1868b7] text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {loading ? (
                <div className="py-8 text-center text-slate-400 text-sm">Loading patients...</div>
              ) : filteredPatients.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">No patients found.</div>
              ) : filteredPatients.map((patient) => {
                const isActive = activePatient?.id === patient.id;
                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setActivePatient(patient)}
                    className={`w-full text-left rounded-xl p-3 transition-all ${
                      isActive ? 'text-[#1868b7]' : 'hover:bg-[#f0f6fc]'
                    }`}
                    style={isActive ? { background: '#dceaf6', border: '1px solid #c0dcf5' } : { border: '1px solid transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${patient.name}`} />
                        <AvatarFallback className="text-xs font-semibold" style={{ background: '#dceaf6', color: '#1868b7' }}>
                          {getInitials(patient.name || 'P')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm truncate ${isActive ? 'text-[#1868b7]' : 'text-slate-800'}`}>
                          {patient.name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{patient.email || 'No email'}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Panel */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
            {!activePatient ? (
              <div className="flex-1 bg-white border border-[#cddff0] rounded-xl shadow-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#f0f6fc' }}>
                    <ActivitySquare className="h-8 w-8 text-[#c0dcf5]" />
                  </div>
                  <p className="text-slate-500 font-semibold">Select a patient to start using clinical modules.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Module Tabs + Patient Badge */}
                <div className="flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {modules.map((mod) => {
                      const isActive = activeModule === mod.id;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => setActiveModule(mod.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all border ${
                            isActive
                              ? 'text-white border-transparent shadow-sm'
                              : 'text-slate-600 bg-white border-[#cddff0] hover:bg-[#f0f6fc]'
                          }`}
                          style={isActive ? { background: 'linear-gradient(135deg, #1868b7, #0891b2)', border: 'none' } : {}}
                        >
                          <mod.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          {mod.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border shrink-0"
                    style={{ background: '#f0f6fc', borderColor: '#c0dcf5' }}
                  >
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-[12px] font-semibold text-[#1868b7]">{activePatient.name}</span>
                  </div>
                </div>

                {/* Module Content */}
                <div className="flex-1 min-h-0">
                  {activeModule === 'reports' ? (
                    <ReportsDocumentsHub
                      patientName={activePatient.name || 'Patient'}
                      patientId={activePatient.user_id}
                      onInsightsChange={setReportInsights}
                    />
                  ) : activeModule === 'lab' ? (
                    <LabHistoryPanel
                      patientId={activePatient.user_id ?? activePatient.id}
                      patientName={activePatient.name || 'Patient'}
                    />
                  ) : (
                    <ClinicalDecisionSupportPanel
                      patientName={activePatient.name || 'Patient'}
                      insights={reportInsights}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalModules;
