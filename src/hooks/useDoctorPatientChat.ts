import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from './useWebSocket';
import type { Database } from '@/integrations/supabase/types';

// Types
type DoctorPatientChatSession = Database['public']['Tables']['chat_sessions']['Row'] & { session_type: 'doctor-patient' };
type DoctorPatientMessage = Database['public']['Tables']['messages']['Row'] & {
  attachment_signed_url?: string | null;
};

export const useDoctorPatientChat = (sessionId: string | null) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DoctorPatientChatSession[]>([]);
  const [messages, setMessages] = useState<DoctorPatientMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // WebSocket for real-time message delivery
  const effectiveUserId = user?.auth_user_id || user?.id || null;
  const { sendWsMessage, isConnected, onMessage } = useWebSocket(sessionId, effectiveUserId);

  const getSignedAttachmentUrl = useCallback(async (attachmentPath: string | null): Promise<string | null> => {
    if (!attachmentPath) return null;

    const { data, error } = await supabase
      .storage
      .from('chat-attachments')
      .createSignedUrl(attachmentPath, 60 * 60 * 24 * 7);

    if (error) {
      return null;
    }

    return data?.signedUrl || null;
  }, []);

  const enrichMessageWithAttachmentUrl = useCallback(async (message: Database['public']['Tables']['messages']['Row']): Promise<DoctorPatientMessage> => {
    if (!message.attachment_path) {
      return { ...message, attachment_signed_url: null };
    }

    const signedUrl = await getSignedAttachmentUrl(message.attachment_path);
    return {
      ...message,
      attachment_signed_url: signedUrl,
    };
  }, [getSignedAttachmentUrl]);

  const enrichMessagesWithAttachmentUrls = useCallback(async (rawMessages: Database['public']['Tables']['messages']['Row'][]): Promise<DoctorPatientMessage[]> => {
    const enrichedMessages = await Promise.all(rawMessages.map(enrichMessageWithAttachmentUrl));
    return enrichedMessages;
  }, [enrichMessageWithAttachmentUrl]);

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
        .or(`participant_1_id.eq.${effectiveUserId},participant_2_id.eq.${effectiveUserId}`)
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
  }, [user?.id, effectiveUserId]);

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

      const enrichedMessages = await enrichMessagesWithAttachmentUrls(data || []);
      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, user?.id, enrichMessagesWithAttachmentUrls]);

  // Handle incoming WebSocket messages by refetching from DB for consistency
  useEffect(() => {
    onMessage((wsMsg) => {
      if (wsMsg.type === 'message' && wsMsg.sessionId === sessionId) {
        void fetchMessages();
      }
    });
  }, [onMessage, sessionId, fetchMessages]);

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

  // Create a new session (checks for existing first to prevent duplicates)
  const createSession = useCallback(async (doctorId: string, patientId: string, title?: string) => {
    if (!user?.id) return null;

    try {
      setLoading(true);

      // Check for existing session first
      const { data: existing } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_type', 'doctor-patient')
        .or(`and(participant_1_id.eq.${doctorId},participant_2_id.eq.${patientId}),and(participant_1_id.eq.${patientId},participant_2_id.eq.${doctorId})`)
        .limit(1);

      if (existing && existing.length > 0) {
        await fetchSessions();
        return existing[0] as DoctorPatientChatSession;
      }

      // No existing session — create a new one
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
  const sendMessage = useCallback(async ({
    targetSessionId,
    content,
    file,
  }: {
    targetSessionId: string;
    content?: string;
    file?: File | null;
  }) => {
    if (!targetSessionId || !user?.id) return null;

    const trimmedContent = content?.trim() || null;

    if (!trimmedContent && !file) {
      throw new Error('Please enter a message or select a file.');
    }

    try {
      let attachmentPath: string | null = null;
      let messageType: 'text' | 'image' | 'file' = 'text';

      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File size must be 10MB or less.');
        }

        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        attachmentPath = `${targetSessionId}/${effectiveUserId || 'unknown'}-${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase
          .storage
          .from('chat-attachments')
          .upload(attachmentPath, file, {
            upsert: false,
            contentType: file.type || 'application/octet-stream',
          });

        if (uploadError) {
          throw new Error(uploadError.message || 'Failed to upload attachment.');
        }

        messageType = file.type?.startsWith('image/') ? 'image' : 'file';
      }

      // Persist to Supabase (no receiver_id column in messages table)
      const { data, error } = await supabase
        .from('messages')
        .insert({
          session_id: targetSessionId,
          sender_id: effectiveUserId,
          content: trimmedContent,
          message_type: messageType,
          attachment_path: attachmentPath,
          attachment_name: file?.name || null,
          attachment_mime_type: file?.type || null,
          attachment_size: file?.size || null,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Failed to send message');

      const enrichedMessage = await enrichMessageWithAttachmentUrl(data);

      // Broadcast via WebSocket for instant delivery
      sendWsMessage({
        content: trimmedContent || undefined,
        messageId: data.id,
        messageType,
        attachmentName: data.attachment_name,
        attachmentMimeType: data.attachment_mime_type,
        attachmentSize: data.attachment_size,
        attachmentPath: data.attachment_path,
      });

      // Add to local state immediately (sender sees it right away)
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === enrichedMessage.id);
        if (exists) return prev;
        return [...prev, enrichedMessage];
      });

      return enrichedMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [user?.id, effectiveUserId, sendWsMessage, enrichMessageWithAttachmentUrl]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!sessionId || !user?.id) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('session_id', sessionId)
        .neq('sender_id', effectiveUserId!)
        .eq('is_read', false);

      if (error) throw error;

      setMessages(prev =>
        prev.map(msg =>
          msg.sender_id !== effectiveUserId && !msg.is_read
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

  // Polling fallback: fetch new messages every 3s in case WebSocket relay misses them
  useEffect(() => {
    if (!sessionId || !user?.id) return;

    const pollMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          const enrichedMessages = await enrichMessagesWithAttachmentUrls(data);
          setMessages(prev => {
            // Only update if there are genuinely new messages
            if (enrichedMessages.length !== prev.length) {
              return enrichedMessages;
            }
            // Check if the last message ID differs (cheap comparison)
            if (
              enrichedMessages.length > 0 &&
              prev.length > 0 &&
              enrichedMessages[enrichedMessages.length - 1].id !== prev[prev.length - 1].id
            ) {
              return enrichedMessages;
            }
            return prev; // No change — skip re-render
          });
        }
      } catch {
        // Silently fail — next poll will retry
      }
    };

    const interval = setInterval(pollMessages, 3000);
    return () => clearInterval(interval);
  }, [sessionId, user?.id, enrichMessagesWithAttachmentUrls]);

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