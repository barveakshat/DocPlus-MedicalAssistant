import { supabase } from './client';
import type { Database } from './types';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

export interface ChatAPIError {
  message: string;
  code?: string;
}

/**
 * Unified Chat API — all chat operations use the single `chat_sessions` + `messages` table pair.
 * Session types are differentiated by the `session_type` column ('ai-doctor', 'ai-patient', 'doctor-patient').
 */
export class ChatAPI {
  /**
   * Fetch chat sessions for a specific patient
   */
  static async fetchPatientChatSessions(patientId: string): Promise<{ data: ChatSession[] | null; error: ChatAPIError | null }> {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_type', 'doctor-patient')
        .or(`participant_1_id.eq.${patientId},participant_2_id.eq.${patientId}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        return {
          data: null,
          error: { message: 'Failed to fetch chat sessions', code: error.code }
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: 'Network error while fetching chat sessions' }
      };
    }
  }

  /**
   * Fetch chat session between doctor and patient
   */
  static async fetchDoctorPatientSession(doctorId: string, patientId: string): Promise<{ data: ChatSession | null; error: ChatAPIError | null }> {
    try {
      if (!doctorId || !patientId) {
        return {
          data: null,
          error: { message: 'Doctor ID and Patient ID are required' }
        };
      }

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_type', 'doctor-patient')
        .or(`and(participant_1_id.eq.${doctorId},participant_2_id.eq.${patientId}),and(participant_1_id.eq.${patientId},participant_2_id.eq.${doctorId})`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return {
          data: null,
          error: { message: `Failed to fetch chat session: ${error.message}`, code: error.code }
        };
      }

      return { data: data?.[0] as ChatSession || null, error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: 'Network error while fetching chat session' }
      };
    }
  }

  /**
   * Create or find a doctor-patient chat session using the unified chat_sessions table
   */
  static async createDoctorPatientSession(doctorId: string, patientId: string, title?: string): Promise<{ data: ChatSession | null; error: ChatAPIError | null }> {
    try {
      if (!doctorId || !patientId) {
        return {
          data: null,
          error: { message: 'Doctor ID and Patient ID are required' }
        };
      }

      if (doctorId === patientId) {
        return {
          data: null,
          error: { message: 'Doctor and patient cannot be the same user' }
        };
      }

      // Check for existing session
      const { data: existing } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_type', 'doctor-patient')
        .or(`and(participant_1_id.eq.${doctorId},participant_2_id.eq.${patientId}),and(participant_1_id.eq.${patientId},participant_2_id.eq.${doctorId})`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        return { data: existing[0], error: null };
      }

      // Create new session
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          session_type: 'doctor-patient',
          participant_1_id: doctorId,
          participant_2_id: patientId,
          title: title || 'Doctor-Patient Chat',
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: { message: `Failed to create chat session: ${error.message}`, code: error.code }
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: 'Network error while creating chat session' }
      };
    }
  }

  /**
   * Send a message — always uses the unified `messages` table
   */
  static async sendMessage(sessionId: string, content: string, senderId: string, isAiMessage: boolean = false): Promise<{ data: Message | null; error: ChatAPIError | null }> {
    try {
      const validation = this.validateMessageContent(content);
      if (!validation.valid) {
        return {
          data: null,
          error: { message: validation.error || 'Invalid message content' }
        };
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender_id: senderId,
          content: content.trim(),
          is_ai_message: isAiMessage,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: { message: `Failed to send message: ${error.message}`, code: error.code }
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: 'Network error while sending message' }
      };
    }
  }

  /**
   * Mark messages as read — single table query
   */
  static async markMessagesAsRead(sessionId: string, userId: string): Promise<{ success: boolean; error: ChatAPIError | null }> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('session_id', sessionId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) {
        return {
          success: false,
          error: { message: 'Failed to mark messages as read', code: error.code }
        };
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: { message: 'Network error while marking messages as read' }
      };
    }
  }

  /**
   * Fetch unread message count — single table query
   */
  static async getUnreadMessageCount(userId: string): Promise<{ count: number; error: ChatAPIError | null }> {
    try {
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);

      if (!sessions || sessions.length === 0) {
        return { count: 0, error: null };
      }

      const sessionIds = sessions.map(s => s.id);
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', userId)
        .in('session_id', sessionIds);

      if (error) {
        return { count: 0, error: { message: 'Failed to fetch unread count', code: error.code } };
      }

      return { count: count || 0, error: null };
    } catch (err) {
      return {
        count: 0,
        error: { message: 'Network error while fetching unread count' }
      };
    }
  }

  /**
   * Validate message content
   */
  private static validateMessageContent(content: string): { valid: boolean; error?: string } {
    if (!content || typeof content !== 'string') {
      return { valid: false, error: 'Message content is required' };
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (trimmed.length > 2000) {
      return { valid: false, error: 'Message is too long (max 2000 characters)' };
    }

    // Basic XSS prevention
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        return { valid: false, error: 'Message contains potentially dangerous content' };
      }
    }

    return { valid: true };
  }

  /**
   * Delete a chat session (for doctors only)
   */
  static async deleteChatSession(sessionId: string, userId: string): Promise<{ success: boolean; error: ChatAPIError | null }> {
    try {
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        return {
          success: false,
          error: { message: 'Session not found', code: sessionError.code }
        };
      }

      // Verify user is a participant
      const { data: doctors } = await supabase
        .from('doctors')
        .select('user_id')
        .limit(10);

      const doctor = doctors?.find(d => d.user_id === userId);

      if (!doctor) {
        if (session.participant_1_id === userId || session.participant_2_id === userId) {
          // User is a participant, allow deletion
        } else {
          return {
            success: false,
            error: { message: 'Only doctors can delete chat sessions' }
          };
        }
      }

      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        return {
          success: false,
          error: { message: 'Failed to delete chat session', code: error.code }
        };
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: { message: 'Network error while deleting chat session' }
      };
    }
  }
}
