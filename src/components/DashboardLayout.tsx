import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import DoctorSidebar from './DoctorSidebar';
import PatientSidebar from './PatientSidebar';
import DoctorProfile from './DoctorProfile';
import PatientProfile from './PatientProfile';
import NotificationBell from './NotificationBell';
import { Settings, LogOut, User as UserIcon, HelpCircle, Stethoscope } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState } from 'react';

import { usePatientContext } from '@/contexts/PatientContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { selectedPatient } = usePatientContext();
  const [isDoctorProfileOpen, setIsDoctorProfileOpen] = useState(false);
  const [isPatientProfileOpen, setIsPatientProfileOpen] = useState(false);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden" style={{ background: '#eef5fc' }}>
        {user?.role === 'doctor' ? <DoctorSidebar /> : <PatientSidebar />}
        <main className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: '#eef5fc' }}>

          {/* Desktop Top Header */}
          <div className="hidden lg:flex h-[60px] border-b items-center justify-between px-6 shrink-0 bg-white"
            style={{ borderColor: '#cddff0', boxShadow: '0 1px 4px rgba(24, 104, 183, 0.06)' }}
          >
            <div className="flex-1 max-w-2xl flex items-center gap-3">
              {user?.role === 'doctor' && selectedPatient ? (
                <div className="flex items-center space-x-3 px-4 py-1.5 rounded-full w-fit border"
                  style={{ background: '#f0f7ff', borderColor: '#c0dcf5' }}
                >
                  <Avatar className="h-7 w-7 border border-[#c0dcf5]">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedPatient.name}`} />
                    <AvatarFallback className="text-[10px] font-semibold" style={{ background: '#dceaf6', color: '#1868b7' }}>
                      {getInitials(selectedPatient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 leading-none">{selectedPatient.name}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm leading-none"
                      style={{ background: '#c0dcf5', color: '#1868b7' }}
                    >
                      {selectedPatient.age} yrs • {selectedPatient.gender}
                    </span>
                  </div>
                </div>
              ) : user?.role === 'doctor' ? (
                <div className="flex items-center space-x-2 text-slate-400">
                  <Stethoscope className="h-4 w-4" />
                  <span className="text-sm font-medium">No Active Patient Selected</span>
                </div>
              ) : user?.role === 'patient' && (
                <h1 className="text-[17px] font-bold tracking-tight" style={{ color: '#172032' }}>
                  Welcome back, {user.name}
                </h1>
              )}
            </div>

            <div className="flex items-center space-x-3 ml-4">
              <div className="h-7 w-px bg-slate-200 hidden lg:block"></div>
              <NotificationBell />

              {user?.role === 'doctor' ? (
                <>
                  <DoctorProfile open={isDoctorProfileOpen} onOpenChange={setIsDoctorProfileOpen} />
                  <DropdownMenu>
                    <DropdownMenuTrigger className="outline-none flex items-center space-x-2 rounded-full hover:ring-2 transition-all"
                      style={{ '--tw-ring-color': 'rgba(24,104,183,0.25)' } as React.CSSProperties}
                    >
                      <Avatar className="h-8 w-8 border border-[#c0dcf5]">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} />
                        <AvatarFallback className="text-white text-xs font-semibold"
                          style={{ background: 'linear-gradient(135deg, #1868b7, #0891b2)' }}
                        >
                          {user?.name ? getInitials(user.name) : 'DR'}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 mt-2 p-2">
                      <div className="flex items-center justify-start gap-3 p-2">
                        <Avatar className="h-10 w-10 border border-[#c0dcf5]">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} />
                          <AvatarFallback className="text-white text-xs font-semibold"
                            style={{ background: 'linear-gradient(135deg, #1868b7, #0891b2)' }}
                          >
                            {user?.name ? getInitials(user.name) : 'DR'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-0.5">
                          <p className="text-sm font-bold text-slate-900 leading-none">{user?.name || 'Doctor'}</p>
                          <p className="text-xs text-slate-500 leading-none">{user?.email}</p>
                        </div>
                      </div>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuLabel className="text-xs font-semibold text-slate-500 px-2 uppercase tracking-wider">Account</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setIsDoctorProfileOpen(true)}
                        className="flex items-center cursor-pointer text-slate-700 py-2.5 px-3 focus:bg-slate-50 font-medium"
                      >
                        <UserIcon className="mr-3 h-4 w-4 text-slate-400" />
                        <span>My Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center cursor-pointer text-slate-700 py-2.5 px-3 focus:bg-slate-50 font-medium">
                        <Settings className="mr-3 h-4 w-4 text-slate-400" />
                        <span>Preferences & Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center cursor-pointer text-slate-700 py-2.5 px-3 focus:bg-slate-50 font-medium">
                        <HelpCircle className="mr-3 h-4 w-4 text-slate-400" />
                        <span>Help & Support</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem onClick={() => logout()}
                        className="flex items-center cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 py-2.5 px-3 font-semibold"
                      >
                        <LogOut className="mr-3 h-4 w-4 text-red-500" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <PatientProfile open={isPatientProfileOpen} onOpenChange={setIsPatientProfileOpen} trigger={null} />
                  <DropdownMenu>
                    <DropdownMenuTrigger className="outline-none flex items-center space-x-2 rounded-full hover:ring-2 transition-all">
                      <Avatar className="h-8 w-8 border border-[#c0dcf5]">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} />
                        <AvatarFallback className="text-white text-xs font-semibold"
                          style={{ background: 'linear-gradient(135deg, #0891b2, #1868b7)' }}
                        >
                          {user?.name ? getInitials(user.name) : 'PT'}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 mt-2 p-2">
                      <div className="flex items-center justify-start gap-3 p-2">
                        <Avatar className="h-10 w-10 border border-[#c0dcf5]">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} />
                          <AvatarFallback className="text-white text-xs font-semibold"
                            style={{ background: 'linear-gradient(135deg, #0891b2, #1868b7)' }}
                          >
                            {user?.name ? getInitials(user.name) : 'PT'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-0.5">
                          <p className="text-sm font-bold text-slate-900 leading-none">{user?.name || 'Patient'}</p>
                          <p className="text-xs text-slate-500 leading-none">{user?.email}</p>
                        </div>
                      </div>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuLabel className="text-xs font-semibold text-slate-500 px-2 uppercase tracking-wider">Account</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setIsPatientProfileOpen(true)}
                        className="flex items-center cursor-pointer text-slate-700 py-2.5 px-3 focus:bg-slate-50 font-medium"
                      >
                        <UserIcon className="mr-3 h-4 w-4 text-slate-400" />
                        <span>My Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center cursor-pointer text-slate-700 py-2.5 px-3 focus:bg-slate-50 font-medium">
                        <Settings className="mr-3 h-4 w-4 text-slate-400" />
                        <span>Preferences & Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center cursor-pointer text-slate-700 py-2.5 px-3 focus:bg-slate-50 font-medium">
                        <HelpCircle className="mr-3 h-4 w-4 text-slate-400" />
                        <span>Help & Support</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem onClick={() => logout()}
                        className="flex items-center cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 py-2.5 px-3 font-semibold"
                      >
                        <LogOut className="mr-3 h-4 w-4 text-red-500" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>

          {/* Mobile header */}
          <div className="lg:hidden h-14 border-b bg-[#0d1e35] flex items-center px-4 shrink-0">
            <SidebarTrigger className="text-white" />
            <span className="ml-3 font-semibold text-white">DocPlus</span>
            <div className="ml-auto">
              {user?.role === 'patient' && (
                <div className="flex space-x-2">
                  <PatientProfile open={isPatientProfileOpen} onOpenChange={setIsPatientProfileOpen} trigger={null} />
                  <Button variant="ghost" size="icon" onClick={() => setIsPatientProfileOpen(true)} className="text-white">
                    <UserIcon className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden h-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
