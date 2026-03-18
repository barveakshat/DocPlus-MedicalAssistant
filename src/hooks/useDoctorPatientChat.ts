import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from './useWebSocket';
import type { Database } from '@/integrations/supabase/types';

// Types
type DoctorPatientChatSession = Database['public']['Tables']['chat_sessions']['Row'] & { session_type: 'doctor-patient' };
type DoctorPatientMessage = Database['public']['Tables']['messages']['Row'];

export const useDoctorPatientChat = (sessionId: string | null) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DoctorPatientChatSession[]>([]);
  const [messages, setMessages] = useState<DoctorPatientMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // WebSocket for real-time message delivery
  const { sendWsMessage, isConnected, onMessage } = useWebSocket(sessionId, user?.id || null);

  // Handle incoming WebSocket messages
  useEffect(() => {
    onMessage((wsMsg) => {
      if (wsMsg.type === 'message' && wsMsg.content) {
        const newMessage: DoctorPatientMessage = {
          id: wsMsg.messageId || crypto.randomUUID(),
          session_id: wsMsg.sessionId,
          sender_id: wsMsg.senderId,
          content: wsMsg.content,
          is_read: false,
          is_ai_message: false,
          created_at: wsMsg.timestamp,
        };

        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      }
    });
  }, [onMessage]);

  // Fetch sessions for this user
  const fetchSessions = useCallback(async () => {
    if (!user?.id) {
      setSessions([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_type', 'doctor-patient')
        .or(`participant_1_id.eq.${user.auth_user_id || user.id},participant_2_id.eq.${user.auth_user_id || user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        setSessions([]);
        return;
      }

      setSessions(data as DoctorPatientChatSession[] || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch messages for current session
  const fetchMessages = useCallback(async () => {
    if (!sessionId || !user?.id) {
      setMessages([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, user?.id]);

  // Get or create a session between doctor and patient
  const getOrCreateSession = useCallback(async (doctorId: string, patientId: string): Promise<string | null> => {
    try {
      // Check for existing session
      const { data: existing } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('session_type', 'doctor-patient')
        .or(`and(participant_1_id.eq.${doctorId},participant_2_id.eq.${patientId}),and(participant_1_id.eq.${patientId},participant_2_id.eq.${doctorId})`)
        .limit(1);

      if (existing && existing.length > 0) {
        return existing[0].id;
      }

      // Create new session
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          session_type: 'doctor-patient',
          participant_1_id: doctorId,
          participant_2_id: patientId,
          title: 'Doctor-Patient Chat',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error in getOrCreateSession:', error);
      return null;
    }
  }, []);

  // Create a new session
  const createSession = useCallback(async (doctorId: string, patientId: string, title?: string) => {
    if (!user?.id) return null;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          participant_1_id: doctorId,
          participant_2_id: patientId,
          title: title || 'Chat with patient',
          session_type: 'doctor-patient',
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Failed to create session');

      await fetchSessions();
      return data as DoctorPatientChatSession;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchSessions]);

  // Send a message — persists to Supabase AND broadcasts via WebSocket
  const sendMessage = useCallback(async (content: string, targetSessionId: string) => {
    if (!targetSessionId || !user?.id) return null;

    try {
      // Get receiver ID
      const { data: sessionData } = await supabase
        .from('chat_sessions')
        .select('participant_1_id, participant_2_id')
        .eq('id', targetSessionId)
        .maybeSingle();

      if (!sessionData) throw new Error(`Session ${targetSessionId} not found`);

      const receiverId = sessionData.participant_1_id === user.id
        ? sessionData.participant_2_id
        : sessionData.participant_1_id;

      // Persist to Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert({
          session_id: targetSessionId,
          sender_id: user.id,
          receiver_id: receiverId,
          content,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Failed to send message');

      // Broadcast via WebSocket for instant delivery
      sendWsMessage(content, data.id);

      // Add to local state immediately (sender sees it right away)
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === data.id);
        if (exists) return prev;
        return [...prev, data];
      });

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [user?.id, sendWsMessage]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!sessionId || !user?.id) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('session_id', sessionId)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setMessages(prev =>
        prev.map(msg =>
          msg.sender_id !== user.id && !msg.is_read
            ? { ...msg, is_read: true }
            : msg
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [sessionId, user?.id]);

  // Fetch sessions on mount
  useEffect(() => {
    if (user?.id) fetchSessions();
  }, [user?.id, fetchSessions]);

  // Fetch messages when session changes
  useEffect(() => {
    if (sessionId && user?.id) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [sessionId, user?.id, fetchMessages]);

  return {
    sessions,
    messages,
    loading,
    isConnected,
    fetchSessions,
    fetchMessages,
    createSession,
    sendMessage,
    markMessagesAsRead,
    getOrCreateSession,
  };
};