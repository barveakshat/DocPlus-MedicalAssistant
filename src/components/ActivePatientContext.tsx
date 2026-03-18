import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Pill, AlertTriangle, Plus } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Patient = Database['public']['Tables']['patients']['Row'];

interface ActivePatientContextProps {
  patient: Patient | null;
}

const ActivePatientContext: React.FC<ActivePatientContextProps> = ({ patient }) => {
  if (!patient) {
    return (
      <div className="w-[340px] border-l border-slate-100 bg-white p-6 flex flex-col hidden xl:flex shrink-0">
        <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-6">Active Patient Context</h3>
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-sm text-slate-400">Context will appear here when a patient is selected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[340px] border-l border-slate-100 bg-white p-6 flex flex-col overflow-y-auto hidden xl:flex shrink-0">
      <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-4">Active Patient Context</h3>
      
      {/* Patient Header Card */}
      <Card className="shadow-sm border-slate-200 mb-6 rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-5">
          <div className="flex items-start space-x-4 mb-4">
            <Avatar className="h-14 w-14 rounded-2xl">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${patient.name}`} />
              <AvatarFallback className="rounded-2xl bg-blue-50 text-blue-600 font-semibold">
                {patient.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="pt-1">
              <h4 className="font-bold text-slate-900 text-base leading-tight mb-1">{patient.name}</h4>
              <p className="text-[13px] text-slate-500 font-medium">
                {patient.age ? `${patient.age} Y/O` : 'Age N/A'} {patient.gender ? `• ${patient.gender}` : ''} • ID: #{patient.id.substring(0, 6).toUpperCase()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
              Critical
            </span>
            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
              Triage Room 4
            </span>
          </div>
        </CardContent>
      </Card>

      <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-4">Current Medical History</h3>

      {/* Medical History List */}
      <Card className="shadow-sm border-slate-200 rounded-2xl bg-white">
        <CardContent className="p-5 space-y-5">
          {/* Chronic Conditions */}
          <div className="flex space-x-4">
            <div className="mt-0.5">
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h5 className="text-sm font-semibold text-slate-900 mb-1">Chronic Conditions</h5>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                Hypertension (Dx 2018), Type 2 Diabetes (Controlled via diet/Metformin).
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Current Medications */}
          <div className="flex space-x-4">
            <div className="mt-0.5">
              <Pill className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h5 className="text-sm font-semibold text-slate-900">Current Medications</h5>
                <Plus className="w-3 h-3 text-slate-400 cursor-pointer" />
              </div>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                Lisinopril 20mg daily, Metformin 500mg BID, Baby Aspirin 81mg.
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Allergies */}
          <div className="flex space-x-4">
            <div className="mt-0.5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h5 className="text-sm font-semibold text-red-600 mb-1">Allergies</h5>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                Penicillin (Anaphylaxis), Shellfish (Hives).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
};

export default ActivePatientContext;
