import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle } from 'lucide-react';
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
  created_at: string;
  user_id: string;
};

const Patients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (user?.role === 'doctor') {
      fetchPatients();
    }
  }, [user]);

  const fetchPatients = async () => {
    try {
      if (!user || user.role !== 'doctor') return;

      const { data: doctor } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!doctor) return;

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('assigned_doctor_id', doctor.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const getPatientStatus = (patient: Patient) => {
    // Deterministic mock status based on name length
    const hash = patient.name.length;
    if (hash % 4 === 0) return { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700' };
    if (hash % 4 === 1) return { label: 'Review', bg: 'bg-[#fef3c7]', text: 'text-[#92400e]' };
    return { label: 'Stable', bg: 'bg-[#d1fae5]', text: 'text-[#047857]' };
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#fafafa] p-8 overflow-hidden h-full">
      <div className="max-w-6xl w-full mx-auto flex flex-col flex-1 min-h-0 gap-8">
        
        {/* Header Section */}
        <div className="flex-shrink-0 flex flex-col md:flex-row md:items-start justify-between gap-4 py-2">
          <div>
            <h1 className="text-[28px] tracking-tight font-bold text-slate-900 mb-1">Patient Directory</h1>
            <p className="text-[15px] text-slate-500 font-medium">Manage and monitor your patient records in real-time.</p>
          </div>
          <div className="flex items-center space-x-4 mt-1">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-slate-200 shadow-sm rounded-lg placeholder:text-slate-400 focus-visible:ring-[#5442f5] text-[14px]"
              />
            </div>
            <Button
              onClick={() => navigate('/register-patient')}
              className="bg-[#5442f5] hover:bg-[#4335c0] text-white h-10 px-5 rounded-lg font-semibold shadow-sm text-[14px]"
            >
              Add Patient
            </Button>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-slate-100/80 text-[#8e9cb0] text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-8 py-5">Name</th>
                  <th className="px-8 py-5">Age</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Last Check-Up</th>
                  <th className="px-8 py-5 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5442f5]"></div>
                        <p className="text-slate-500 font-medium">Loading records...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="bg-slate-50 rounded-full p-6 mb-2">
                          <Search className="h-10 w-10 text-slate-300" />
                        </div>
                        <p className="text-slate-700 font-bold text-[16px]">
                          {searchTerm ? 'No matching patients found' : 'No patients in directory yet'}
                        </p>
                        <p className="text-slate-500 text-[14px]">
                          {searchTerm ? 'Try adjusting your search terms.' : 'Add your first patient to start managing records.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPatients.map((patient) => {
                    const status = getPatientStatus(patient);
                    return (
                      <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-10 w-10 overflow-hidden rounded-full shadow-sm">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${patient.name}`} className="object-cover" />
                              <AvatarFallback className="bg-slate-100 text-slate-600 font-semibold text-sm">
                                {getInitials(patient.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-[14px] leading-tight mb-0.5">{patient.name}</span>
                              <span className="text-[13px] text-slate-500">{patient.email || 'No email provided'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-slate-600 font-medium text-[14px]">
                          {patient.age || '-'}
                        </td>
                        <td className="px-8 py-5">
                          <Badge variant="outline" className={`${status.bg} ${status.text} border-none font-bold text-[11px] px-2.5 py-0.5 rounded-md capitalize tracking-wide`}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-8 py-5 text-slate-500 font-medium text-[14px]">
                          {formatDate(patient.created_at)}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button
                            onClick={() => navigate(`/doctor-chat`, { state: { patientId: patient.user_id, patientName: patient.name } })}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[#5442f5]/10 text-[#5442f5] hover:bg-[#5442f5]/20 transition-colors"
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
          
          {/* Pagination Footer */}
          <div className="border-t border-slate-100/80 px-8 py-4 bg-white flex items-center justify-between mt-auto">
            <span className="text-[13px] text-slate-500 font-medium">
              Showing {paginatedPatients.length} of {filteredPatients.length} patients
            </span>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 border-slate-200 text-slate-600 font-semibold text-[13px] hover:bg-slate-50 rounded-lg shadow-sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 border-slate-200 text-slate-600 font-semibold text-[13px] hover:bg-slate-50 rounded-lg shadow-sm"
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