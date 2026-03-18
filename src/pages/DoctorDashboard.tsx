import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mock data for the dashboard
  const kpis = [
    { label: "Total Patients", value: "1,248", icon: Users, trend: "+12 this week", trendUp: true, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Today's Consults", value: "14", icon: Calendar, trend: "4 remaining", trendUp: true, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Pending Reviews", value: "7", icon: Activity, trend: "3 critical", trendUp: false, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Unread Messages", value: "24", icon: MessageSquare, trend: "From 8 patients", trendUp: false, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const todaySchedule = [
    { id: 1, name: "Elena Wong", time: "09:00 AM", type: "Follow-up", status: "Completed", avatar: "E" },
    { id: 2, name: "Robert Miller", time: "10:30 AM", type: "Consultation", status: "In Progress", avatar: "R" },
    { id: 3, name: "Alice Smith", time: "01:15 PM", type: "Lab Review", status: "Waiting", avatar: "A" },
    { id: 4, name: "Johnathan Doe", time: "03:00 PM", type: "General Checkup", status: "Scheduled", avatar: "J" },
  ];

  const aiInsights = [
    { id: 1, patient: "Alice Smith", insight: "Blood pressure trends indicate potential hypertension risk based on last 3 encounters.", priority: "High" },
    { id: 2, patient: "Robert Miller", insight: "Medication adherence seems low. AI suggests scheduling a follow-up to discuss side effects.", priority: "Medium" },
    { id: 3, patient: "Elena Wong", insight: "Lab results normal. AI drafted a 'Good News' summary ready for your approval to send.", priority: "Low" }
  ];

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
                {todaySchedule.map((appt) => (
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
                {aiInsights.map((insight) => (
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
                      <button className="text-[12px] font-bold text-[#5442f5] hover:text-[#4335c0] transition-colors">
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