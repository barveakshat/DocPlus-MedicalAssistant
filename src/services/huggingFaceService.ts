import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type Patient = Database['public']['Tables']['patients']['Row'];
type Doctor = Database['public']['Tables']['doctors']['Row'];

export interface HuggingFaceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DatabaseContext {
  patientInfo?: Patient;
  doctorInfo?: Doctor;
  sessionType: string;
}

export interface HuggingFaceRequest {
  model: string;
  messages: HuggingFaceMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface HuggingFaceResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface HuggingFaceError {
  error: {
    message: string;
    type: string;
    code?: number;
  };
}

export class HuggingFaceService {
  // Hugging Face Router OpenAI-compatible API.
  // Use Vite proxy in development to bypass CORS.
  // Supports optional override via VITE_HF_BASE_URL.
  private static readonly BASE_URL = import.meta.env.DEV
    ? (import.meta.env.VITE_HF_BASE_URL || '/api/hf/v1')
    : (import.meta.env.VITE_HF_BASE_URL || 'https://router.huggingface.co/v1');
  private static readonly MODEL = import.meta.env.VITE_HF_MODEL || 'meta-llama/Llama-3.3-70B-Instruct';
  private static readonly FALLBACK_CHAT_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';
  private static readonly API_KEY = import.meta.env.VITE_HF_API_KEY || '';

  /**
   * Fetch patient information from database
   */
  static async fetchPatientContext(patientUserId: string): Promise<Patient | null> {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', patientUserId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching patient context:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception fetching patient context:', error);
      return null;
    }
  }

  /**
   * Fetch doctor information from database
   */
  static async fetchDoctorContext(doctorUserId: string): Promise<Doctor | null> {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', doctorUserId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching doctor context:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception fetching doctor context:', error);
      return null;
    }
  }

  /**
   * Build system prompt with database context
   */
  static buildSystemPrompt(sessionType: string, context?: DatabaseContext): string {
    let basePrompt = '';
    let contextInfo = '';

    // Build context information from database
    if (context) {
      if (context.patientInfo) {
        const patient = context.patientInfo;
        contextInfo += `\n\nPATIENT INFORMATION:
- Name: ${patient.name || 'Not provided'}
- Email: ${patient.email || 'Not provided'}
- Phone: ${patient.phone || 'Not provided'}
- Age: ${patient.age || 'Not provided'}
- Gender: ${patient.gender || 'Not provided'}
- Address: ${patient.address || 'Not provided'}
- Medical History: ${patient.medical_history || 'Not provided'}
- Current Medications: ${patient.current_medications || 'None listed'}
- Allergies: ${patient.allergies || 'None listed'}
- Emergency Contact: ${patient.emergency_contact_name || 'Not provided'} ${patient.emergency_contact_phone ? `(${patient.emergency_contact_phone})` : ''}`;
      }

      if (context.doctorInfo) {
        const doctor = context.doctorInfo;
        contextInfo += `\n\nDOCTOR INFORMATION:
- Name: Dr. ${doctor.name || 'Not provided'}
- Username: ${doctor.username || 'Not provided'}
- Registration Number: ${doctor.registration_no || 'Not provided'}`;
      }
    }

    // Build prompts based on session type
    if (sessionType === 'ai-doctor') {
      basePrompt = `You are a medical AI assistant that helps doctors by providing medical information, clinical guidance, and patient-related insights. You provide:
- Differential diagnosis support
- Treatment suggestions based on symptoms
- Medical knowledge and best practices
- Professional, evidence-based responses
- Clear explanations for complex medical concepts

${contextInfo ? `You have access to the following patient information for context:${contextInfo}` : ''}

When a doctor asks about patient details, symptoms, history, medications, or any other patient-specific information, refer to the patient information provided above.

Always maintain patient confidentiality and encourage evidence-based medicine. If you're unsure about something, recommend consulting specialists or current medical literature.`;
    } else if (sessionType === 'ai-patient') {
      basePrompt = `You are an AI support assistant helping patients with emotional support and stress relief. You provide:
- Empathetic listening and understanding
- Stress management techniques
- Emotional support and encouragement
- General wellness advice
- Professional boundaries (you're not a replacement for medical care)

${contextInfo ? `You have access to the following information:${contextInfo}` : ''}

When a patient asks about their doctor, medical history, medications, or any personal information, refer to the information provided above.

Always encourage seeking professional medical help when appropriate and maintain appropriate boundaries as an AI assistant.`;
    } else if (sessionType === 'doctor-patient') {
      basePrompt = `You are facilitating a conversation between a doctor and patient. Provide relevant context when asked.

${contextInfo ? `Relevant information:${contextInfo}` : ''}

When either party asks about the other or about medical information, refer to the information provided above.`;
    }

    return basePrompt;
  }

  /**
   * Test Hugging Face API connection
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.API_KEY) {
        return { success: false, error: 'Hugging Face API key not found. Set VITE_HF_API_KEY in your .env file.' };
      }

      const response = await fetch(`${this.BASE_URL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
        },
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `HTTP ${response.status}: ${(errorData as any).error || 'Unknown error'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Generate AI response with database context
   */
  static async generateDoctorResponse(
    userMessage: string,
    conversationHistory: Message[] = [],
    sessionType: string = 'ai-doctor',
    context?: DatabaseContext,
    fileContext?: string
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      if (!this.API_KEY) {
        return { success: false, error: 'Hugging Face API key not found. Set VITE_HF_API_KEY in your .env file. Get a free token at https://huggingface.co/settings/tokens' };
      }

      // Build conversation context
      const messages: HuggingFaceMessage[] = [];

      // Add system prompt with database context
      let systemPrompt = this.buildSystemPrompt(sessionType, context);
      
      // Add file context if provided
      if (fileContext) {
        systemPrompt += `\n\nATTACHED FILES CONTEXT:\n${fileContext}`;
      }

      messages.push({
        role: 'system',
        content: systemPrompt
      });

      // Add conversation history (last 10 messages for context)
      const recentMessages = conversationHistory.slice(-10);
      for (const msg of recentMessages) {
        if (!msg.is_ai_message) {
          messages.push({
            role: 'user',
            content: msg.content
          });
        } else {
          messages.push({
            role: 'assistant',
            content: msg.content
          });
        }
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      const requestBody: HuggingFaceRequest = {
        model: this.MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      };

      const sendRequest = async (body: HuggingFaceRequest) => {
        return fetch(`${this.BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`,
          },
          body: JSON.stringify(body),
        });
      };

      console.log('📤 Sending request to HuggingFace:', {
        model: requestBody.model,
        messageCount: messages.length,
        lastMessage: userMessage.substring(0, 100) + '...',
        apiKey: `${this.API_KEY.substring(0, 12)}...`
      });

      let response = await sendRequest(requestBody);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as HuggingFaceError;
        const errorCode = errorData.error?.code;
        const shouldRetryWithFallback =
          response.status === 400 &&
          errorCode === 'model_not_supported' &&
          requestBody.model !== this.FALLBACK_CHAT_MODEL;

        if (shouldRetryWithFallback) {
          console.warn(`Primary HF model '${requestBody.model}' is not chat-compatible. Retrying with fallback '${this.FALLBACK_CHAT_MODEL}'.`);
          const fallbackRequest: HuggingFaceRequest = {
            ...requestBody,
            model: this.FALLBACK_CHAT_MODEL,
          };
          response = await sendRequest(fallbackRequest);
        }

        if (!response.ok) {
          const finalErrorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as HuggingFaceError;
          console.error('AI API error:', response.status, finalErrorData);

          return {
            success: false,
            error: `API Error ${response.status}: ${finalErrorData.error?.message || 'Unknown error'}`
          };
        }
      }

      const data: HuggingFaceResponse = await response.json();

      const aiResponse = data.choices[0]?.message?.content?.trim();

      if (!aiResponse) {
        return {
          success: false,
          error: 'No response generated by AI'
        };
      }

      return {
        success: true,
        response: aiResponse
      };

    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
}
