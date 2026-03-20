import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation, NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
  ChevronRight,
  Settings,
  HelpCircle,
} from 'lucide-react';

const PatientSidebar = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const patientItems = [
    { title: t('nav_ai_support'), url: '/ai-chat', icon: Heart },
    { title: t('nav_my_doctor'), url: '/doctor-chat', icon: Stethoscope },
    { title: t('nav_appointments'), url: '/appointments', icon: CalendarCheck },
    { title: t('nav_prescriptions'), url: '/prescriptions', icon: Pill },
    { title: t('nav_my_programs'), url: '/disease-programs', icon: Activity },
    { title: t('nav_my_records'), url: '/my-records', icon: FolderOpen },
  ];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[#1b2f4a]"
      style={{ backgroundColor: '#0d1e35' }}
    >
      <SidebarContent
        className="flex flex-col h-full"
        style={{ backgroundColor: '#0d1e35' }}
      >
        {/* App Header */}
        <div
          className={`shrink-0 relative flex items-center ${collapsed ? 'h-14 px-2 justify-center' : 'h-20 px-5 justify-between'}`}
          style={{
            background: 'linear-gradient(135deg, #112540 0%, #0d1e35 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {!collapsed ? (
            <div className="flex items-center space-x-3">
              <div
                className="p-2 rounded-xl shrink-0"
                style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
              >
                <BriefcaseMedical className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[18px] font-bold text-white leading-tight tracking-tight">
                  DocPlus
                </h2>
                <span className="text-[11px] font-medium tracking-wide" style={{ color: '#7cafd4' }}>
                  {t('patient_portal')}
                </span>
              </div>
            </div>
          ) : null}
          <SidebarTrigger className={`text-white/40 hover:text-white/80 transition-colors ${collapsed ? '' : 'absolute right-3'}`} />
        </div>

        {/* User Info */}
        {!collapsed && (
          <div
            className="px-5 py-4 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center space-x-3">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #0891b2 0%, #1868b7 100%)' }}
              >
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PT'}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white leading-tight truncate">
                  {user?.name || 'Patient'}
                </p>
                <p className="text-[11px] font-medium" style={{ color: '#7cafd4' }}>
                  {t('patient_account')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup className="flex-1 pt-3">
          <SidebarGroupContent>
            <SidebarMenu className={collapsed ? 'px-1 gap-2' : 'px-3 gap-1'}>
              {patientItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center rounded-xl transition-all font-medium text-[13px] relative ${collapsed ? 'justify-center px-0 py-2.5' : 'space-x-3 px-3 py-2.5'}`}
                        style={
                          isActive
                            ? {
                                background: 'rgba(56, 170, 219, 0.18)',
                                color: '#7dd3f5',
                              }
                            : {}
                        }
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background =
                              'rgba(255,255,255,0.06)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = '';
                          }
                        }}
                      >
                        <item.icon
                          className={`h-[18px] w-[18px] shrink-0 ${
                            isActive ? 'text-[#7dd3f5]' : 'text-white/40'
                          }`}
                        />
                        {!collapsed && (
                          <>
                            <span className={isActive ? 'text-[#7dd3f5]' : 'text-white/60'}>
                              {item.title}
                            </span>
                            {isActive && (
                              <ChevronRight className="h-3.5 w-3.5 ml-auto text-[#7dd3f5]" />
                            )}
                          </>
                        )}
                        {!collapsed && isActive && (
                          <div
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-l"
                            style={{ background: '#3baadb' }}
                          />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Links: Settings + Help + Logout */}
        <div
          className={`shrink-0 ${collapsed ? 'px-1 py-2 gap-2' : 'px-3 pb-3 gap-1'} flex flex-col`}
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { title: t('nav_settings'), url: '/settings', icon: Settings },
            { title: t('nav_help'), url: '/help', icon: HelpCircle },
          ].map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={`flex items-center rounded-xl transition-all font-medium text-[13px] relative ${collapsed ? 'justify-center px-0 py-2' : 'space-x-3 px-3 py-2'}`}
                style={isActive ? { background: 'rgba(56,170,219,0.18)', color: '#7dd3f5' } : {}}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = '';
                }}
              >
                <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-[#7dd3f5]' : 'text-white/40'}`} />
                {!collapsed && <span className={isActive ? 'text-[#7dd3f5]' : 'text-white/60'}>{item.title}</span>}
              </NavLink>
            );
          })}
          <button
            onClick={logout}
            className={`flex items-center rounded-xl transition-all font-medium text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-1 ${collapsed ? 'justify-center px-0 py-2' : 'space-x-3 px-3 py-2'}`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{t('nav_logout')}</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default PatientSidebar;
