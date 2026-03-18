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
import { Search, Users } from 'lucide-react';
import ReportsDocumentsHub, { type ReportsInsights } from '@/components/ReportsDocumentsHub';
import ClinicalDecisionSupportPanel from '@/components/ClinicalDecisionSupportPanel';
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
  const [activeModule, setActiveModule] = useState<'reports' | 'cds'>('reports');
  const [reportInsights, setReportInsights] = useState<ReportsInsights>({
    metrics: [],
    alerts: [],
    reportCount: 0,
  });

  useEffect(() => {
    if (user?.role === 'doctor') {
      void fetchPatients();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setSelectedPatient(activePatient);
    return () => {
      setSelectedPatient(null);
    };
  }, [activePatient, setSelectedPatient]);

  const fetchPatients = async () => {
    try {
      if (!user || user.role !== 'doctor') return;

      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (doctorError) throw doctorError;
      if (!doctor) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('assigned_doctor_id', doctor.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const fetchedPatients = (data || []) as Patient[];
      setPatients(fetchedPatients);

      if (fetchedPatients.length > 0) {
        setActivePatient((prev) => prev ?? fetchedPatients[0]);
      }
    } catch (error) {
      console.error('Error loading patients for clinical modules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load patients for clinical modules.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = useMemo(
    () => patients.filter((patient) =>
      patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [patients, searchTerm]
  );

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

  if (user?.role !== 'doctor') {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] p-6 md:p-8">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Clinical modules are available only to doctor accounts.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-hidden bg-[#fafafa] p-6 md:p-8">
      <div className="w-full h-full flex flex-col min-h-0 gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clinical Modules</h1>
            <p className="text-muted-foreground">Select a patient, then run Reports & Documents and Clinical Decision Support.</p>
          </div>
          <Badge variant="secondary">{patients.length} patient{patients.length === 1 ? '' : 's'}</Badge>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
          <Card className="h-full overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4" />
                Patients
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name or email"
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="h-[calc(100%-6.25rem)] overflow-auto space-y-2">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading patients...</div>
              ) : filteredPatients.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No patients found.</div>
              ) : (
                filteredPatients.map((patient) => {
                  const isActive = activePatient?.id === patient.id;
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => setActivePatient(patient)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${patient.name}`} />
                          <AvatarFallback>{getInitials(patient.name || 'P')}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{patient.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{patient.email || 'No email'}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <div className="min-h-0">
            {!activePatient ? (
              <Card className="h-full">
                <CardContent className="h-full flex items-center justify-center text-muted-foreground">
                  Select a patient to start using clinical modules.
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={activeModule === 'reports' ? 'default' : 'outline'}
                      onClick={() => setActiveModule('reports')}
                    >
                      Reports & Documents Hub
                    </Button>
                    <Button
                      type="button"
                      variant={activeModule === 'cds' ? 'default' : 'outline'}
                      onClick={() => setActiveModule('cds')}
                    >
                      Clinical Decision Support
                    </Button>
                  </div>
                  <Badge variant="secondary">Selected: {activePatient.name}</Badge>
                </div>

                <div className="min-h-0 flex-1">
                  {activeModule === 'reports' ? (
                    <ReportsDocumentsHub
                      patientName={activePatient.name || 'Patient'}
                      patientId={activePatient.user_id}
                      onInsightsChange={setReportInsights}
                    />
                  ) : (
                    <ClinicalDecisionSupportPanel
                      patientName={activePatient.name || 'Patient'}
                      insights={reportInsights}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalModules;
