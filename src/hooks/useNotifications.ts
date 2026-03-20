import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const MAX_NOTIFICATIONS = 50;

export function useNotifications(userId: string | null | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_NOTIFICATIONS);
    setNotifications((data ?? []) as AppNotification[]);
    setLoading(false);
  }, [userId]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    void fetchNotifications();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = payload.new as AppNotification;
          setNotifications((prev) => [incoming, ...prev].slice(0, MAX_NOTIFICATIONS));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as AppNotification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [userId]);

  const clearNotification = useCallback(async (notificationId: string) => {
    await supabase.from('notifications').delete().eq('id', notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  // Helper to insert a notification (called from other parts of the app)
  const addNotification = useCallback(
    async (params: {
      user_id: string;
      type: string;
      title: string;
      body: string;
      link?: string;
    }) => {
      await supabase.from('notifications').insert({
        user_id: params.user_id,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
      });
    },
    []
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearNotification,
    addNotification,
    refetch: fetchNotifications,
  };
}
