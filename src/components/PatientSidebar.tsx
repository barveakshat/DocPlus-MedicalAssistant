import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LogOut,
  Stethoscope,
  Heart,
  BriefcaseMedical,
  FolderOpen,
  CalendarCheck,
  Pill,
  Activity,
} from 'lucide-react';

const PatientSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const patientItems = [
    { title: 'AI Support', url: '/ai-chat', icon: Heart },
    { title: 'My Doctor', url: '/doctor-chat', icon: Stethoscope },
    { title: 'Appointments', url: '/appointments', icon: CalendarCheck },
    { title: 'Prescriptions', url: '/prescriptions', icon: Pill },
    { title: 'My Programs', url: '/disease-programs', icon: Activity },
    { title: 'My Records', url: '/my-records', icon: FolderOpen },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className="w-60 border-r border-slate-200">
      <SidebarContent className="flex flex-col h-full bg-white">
        {/* App Header */}
        <div className="h-20 px-6 flex items-center justify-between shrink-0 relative border-b border-transparent">
          <div className="flex items-center space-x-3">
            <div className="bg-[#5442f5] p-2 rounded-xl text-white">
              <BriefcaseMedical className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                DocPlus
              </h2>
              <span className="text-xs text-slate-500 font-medium tracking-wide">
                Patient Portal
              </span>
            </div>
          </div>
        </div>


        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {patientItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout */}
        <div className="mt-auto p-4 border-t border-slate-100">
          <SidebarMenuButton onClick={logout} className="w-full justify-start text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default PatientSidebar;