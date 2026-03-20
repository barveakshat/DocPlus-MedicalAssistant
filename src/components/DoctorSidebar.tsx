import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
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
  LayoutDashboard,
  Users,
  MessageCircle,
  BriefcaseMedical,
  Plus,
  ActivitySquare,
  CalendarCheck,
  Pill,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const DoctorSidebar = () => {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';

  const doctorItems = [
    { title: 'Dashboard', url: '/dashboard/doctor', icon: LayoutDashboard },
    { title: 'AI Assistant', url: '/ai-chat', icon: MessageCircle },
    { title: 'Patients', url: '/patients', icon: Users },
    { title: 'Appointments', url: '/appointments', icon: CalendarCheck },
    { title: 'Prescriptions', url: '/prescriptions', icon: Pill },
    { title: 'Disease Programs', url: '/disease-programs', icon: Activity },
    { title: 'Clinical Modules', url: '/clinical-modules', icon: ActivitySquare },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
      <SidebarContent className="flex flex-col h-full bg-white">
        {/* App Header */}
        <div className="h-20 px-6 flex items-center justify-between shrink-0 relative">
          <div className="flex items-center space-x-3">
            <div className="bg-[#5442f5] p-2 rounded-xl text-white">
              <BriefcaseMedical className="h-6 w-6" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  DocPlus
                </h2>
                <span className="text-xs text-slate-500 font-medium tracking-wide">
                  Medical Portal
                </span>
              </div>
            )}
          </div>
          <SidebarTrigger className="text-slate-400 absolute right-4" />
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="px-3 gap-2">
              {doctorItems.map((item) => {
                const isActive = location.pathname.includes(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center space-x-3 p-3 rounded-xl transition-all font-semibold text-sm ${
                          isActive
                            ? 'bg-[#5442f5]/10 text-[#5442f5]'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${isActive ? 'text-[#5442f5]' : 'text-slate-400'}`} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* New AI Chat Button Bottom */}
        <div className="mt-auto p-4 border-t border-slate-100">
          {!collapsed ? (
            <Button 
              onClick={() => navigate('/ai-chat')}
              className="w-full bg-[#5442f5] hover:bg-[#4335c0] text-white rounded-xl py-6 font-semibold shadow-sm"
            >
              <Plus className="h-5 w-5 mr-2" />
              New AI Chat
            </Button>
          ) : (
            <Button 
              size="icon" 
              onClick={() => navigate('/ai-chat')}
              className="w-full bg-[#5442f5] hover:bg-[#4335c0] text-white rounded-xl h-12"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default DoctorSidebar;