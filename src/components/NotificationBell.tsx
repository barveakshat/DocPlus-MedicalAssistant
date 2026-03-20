import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TYPE_COLORS: Record<string, string> = {
  new_message: 'bg-blue-100 text-blue-700',
  follow_up_reminder: 'bg-amber-100 text-amber-700',
  abnormal_lab: 'bg-red-100 text-red-700',
  appointment_confirmed: 'bg-emerald-100 text-emerald-700',
  prescription_issued: 'bg-purple-100 text-purple-700',
  medication_reminder: 'bg-orange-100 text-orange-700',
};

const TYPE_LABEL: Record<string, string> = {
  new_message: 'Message',
  follow_up_reminder: 'Follow-up',
  abnormal_lab: 'Lab Alert',
  appointment_confirmed: 'Appointment',
  prescription_issued: 'Prescription',
  medication_reminder: 'Medication',
};

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const NotificationItem: React.FC<{
  notification: AppNotification;
  onRead: (id: string) => void;
  onClear: (id: string) => void;
  onNavigate: (link: string | null) => void;
}> = ({ notification, onRead, onClear, onNavigate }) => {
  const colorClass = TYPE_COLORS[notification.type] ?? 'bg-slate-100 text-slate-600';
  const label = TYPE_LABEL[notification.type] ?? notification.type;

  return (
    <div
      className={`flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
      onClick={() => {
        if (!notification.is_read) onRead(notification.id);
        onNavigate(notification.link);
      }}
    >
      {!notification.is_read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
      )}
      {notification.is_read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${colorClass}`}>
            {label}
          </span>
          <span className="text-[11px] text-slate-400">{timeAgo(notification.created_at)}</span>
        </div>
        <p className="text-sm font-semibold text-slate-800 leading-snug">{notification.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">{notification.body}</p>
      </div>
      <button
        className="shrink-0 p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onClear(notification.id);
        }}
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } =
    useNotifications(user?.id);

  // Track prev unread count to detect new arrivals and show toast preview
  const prevUnreadRef = useRef(unreadCount);
  const prevNotifIds = useRef<Set<string>>(new Set(notifications.map((n) => n.id)));

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      // Find the new notification(s)
      const newOnes = notifications.filter((n) => !prevNotifIds.current.has(n.id) && !n.is_read);
      newOnes.forEach((n) => {
        toast(n.title, {
          description: n.body,
          action: n.link
            ? {
                label: 'View',
                onClick: () => navigate(n.link!),
              }
            : undefined,
          duration: 5000,
        });
      });
    }
    prevUnreadRef.current = unreadCount;
    prevNotifIds.current = new Set(notifications.map((n) => n.id));
  }, [notifications, unreadCount, navigate]);

  const handleNavigate = (link: string | null) => {
    if (link) navigate(link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold bg-blue-600 text-white border-2 border-white rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] p-0 shadow-xl rounded-xl overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-bold text-slate-800">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="bg-blue-600 text-white text-[10px] h-4 px-1.5">{unreadCount}</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => void markAllAsRead()}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-8 w-8 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">All caught up</p>
              <p className="text-xs text-slate-400 mt-1">No notifications yet.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={(id) => void markAsRead(id)}
                onClear={(id) => void clearNotification(id)}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100">
            <button
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
              onClick={() => {
                notifications.forEach((n) => void clearNotification(n.id));
              }}
            >
              <Trash2 className="h-3 w-3" />
              Clear all
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
