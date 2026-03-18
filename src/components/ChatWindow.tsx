import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Stethoscope, MessageCircle, X, Paperclip, Settings, Search, Loader2, Mic, Copy, ThumbsUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useChatSessions';
import { supabase } from '@/integrations/supabase/client';
import { ChatAPI } from '@/integrations/supabase/chat-api';
import { useToast } from '@/hooks/use-toast';
import { HuggingFaceService } from '@/services/huggingFaceService';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import type { Database } from '@/integrations/supabase/types';
import { usePatientContext } from '@/contexts/PatientContext';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type Patient = Database['public']['Tables']['patients']['Row'];

interface ChatWindowProps {
  session: ChatSession | null;
  onSessionUpdate?: () => void;
  onNewSession?: () => void;
  onRenameSession?: (sessionId: string, newTitle: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ session, onSessionUpdate, onNewSession, onRenameSession }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbContext, setDbContext] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, sendMessage, fetchMessages } = useMessages(session?.id || null);

  // @ mention state - only for doctors in ai-doctor sessions
  const isDoctorAIChat = user?.role === 'doctor' && session?.session_type === 'ai-doctor';
  const isPatientAIChat = user?.role === 'patient' && session?.session_type === 'ai-patient';
  const [showPatientList, setShowPatientList] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const { selectedPatient, setSelectedPatient } = usePatientContext();
  const [cursorPosition, setCursorPosition] = useState(0);

  // Voice chat - only for patients in AI sessions
  const { isListening, transcript, startListening, stopListening } = useVoiceChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch database context when session changes or patient is selected
  useEffect(() => {
    const fetchDatabaseContext = async () => {
      if (!session || !user) return;

      try {
        const context: any = {
          sessionType: session.session_type,
          patientInfo: null,
          doctorInfo: null
        };

        // For AI-doctor sessions, fetch patient info if one is selected via @ mention
        if (session.session_type === 'ai-doctor' && user.role === 'doctor') {
          // Use selected patient from @ mention if available
          if (selectedPatient) {
            context.patientInfo = selectedPatient;
          }
          // Also fetch doctor's own info
          const doctorInfo = await HuggingFaceService.fetchDoctorContext(user.id);
          if (doctorInfo) context.doctorInfo = doctorInfo;
        }

        // For AI-patient sessions, fetch both patient and their assigned doctor info
        if (session.session_type === 'ai-patient' && user.role === 'patient') {
          const patientInfo = await HuggingFaceService.fetchPatientContext(user.id);
          if (patientInfo) {
            context.patientInfo = patientInfo;
            
            // Fetch assigned doctor info if available
            if (patientInfo.assigned_doctor_id) {
              const doctorInfo = await HuggingFaceService.fetchDoctorContext(patientInfo.assigned_doctor_id);
              if (doctorInfo) context.doctorInfo = doctorInfo;
            }
          }
        }

        // For doctor-patient sessions, fetch both
        if (session.session_type === 'doctor-patient') {
          if (user.role === 'doctor') {
            const doctorInfo = await HuggingFaceService.fetchDoctorContext(user.id);
            if (doctorInfo) context.doctorInfo = doctorInfo;
            
            if (session.participant_2_id) {
              const patientInfo = await HuggingFaceService.fetchPatientContext(session.participant_2_id);
              if (patientInfo) context.patientInfo = patientInfo;
            }
          } else {
            const patientInfo = await HuggingFaceService.fetchPatientContext(user.id);
            if (patientInfo) {
              context.patientInfo = patientInfo;
              
              if (patientInfo.assigned_doctor_id) {
                const doctorInfo = await HuggingFaceService.fetchDoctorContext(patientInfo.assigned_doctor_id);
                if (doctorInfo) context.doctorInfo = doctorInfo;
              }
            }
          }
        }

        console.log('Database context fetched:', { 
          hasPatient: !!context.patientInfo, 
          hasDoctor: !!context.doctorInfo,
          patientName: context.patientInfo?.name 
        });
        setDbContext(context);

      } catch (error) {
        console.error('Error fetching database context:', error);
      }
    };

    fetchDatabaseContext();
  }, [session, user, selectedPatient]); // Re-fetch when selectedPatient changes

  // Fetch patients for @ mention - only for doctors
  const fetchPatients = async (searchTerm: string = '') => {
    if (!isDoctorAIChat) return;
    
    try {
      // First, find the doctor record to get the correct user_id for assigned_doctor_id
      const { data: doctor } = await supabase
        .from('doctors')
        .select('user_id')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      const doctorUserId = doctor?.user_id || user?.auth_user_id || user?.id;

      let query = supabase.from('patients').select('*');
      
      if (doctorUserId) {
        query = query.eq('assigned_doctor_id', doctorUserId);
      }
      
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      
      const { data, error } = await query.limit(10);
      
      if (error) {
        console.error('Error fetching patients:', error);
        return;
      }
      
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };



  // Handle @ mention input - only for doctors
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setNewMessage(value);
    setCursorPosition(cursorPos);
    
    if (!isDoctorAIChat) return;
    
    // Check if @ is typed
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const searchTerm = textBeforeCursor.substring(atIndex + 1);
      setPatientSearch(searchTerm);
      setShowPatientList(true);
      fetchPatients(searchTerm);
    } else {
      setShowPatientList(false);
      setPatientSearch('');
    }
  };

  // Handle patient selection - only for doctors
  const handlePatientSelect = (patient: Patient) => {
    if (!isDoctorAIChat) return;
    
    const textBeforeAt = newMessage.substring(0, newMessage.lastIndexOf('@'));
    const textAfterCursor = newMessage.substring(cursorPosition);
    const newText = `${textBeforeAt}@${patient.name} ${textAfterCursor}`;
    
    setNewMessage(newText);
    setSelectedPatient(patient);
    setShowPatientList(false);
    setPatientSearch('');
    
    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPos = textBeforeAt.length + patient.name.length + 1;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear selected patient when session changes - only for doctors
  useEffect(() => {
    if (isDoctorAIChat) {
      setSelectedPatient(null);
      setShowPatientList(false);
      setPatientSearch('');
    }
  }, [session?.id, isDoctorAIChat]);

  // Mark messages as read when session changes or new messages arrive
  useEffect(() => {
    if (session?.id && user?.id && messages.length > 0) {
      const markAsRead = async () => {
        const { error } = await ChatAPI.markMessagesAsRead(session.id, user.auth_user_id || user.id);
        if (error) {
        }
      };
      markAsRead();
    }
  }, [session?.id, user?.id, messages.length]);

  // Real-time subscription is now handled by the useMessages hook
  // No need for additional subscription here as it's already implemented in the hook

  const handleSendMessage = async (overrideText?: string | any) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : newMessage;
    if (!textToSend.trim() || !session) return;

    if (!user?.id) {
      setError('You must be logged in to send messages.');
      return;
    }

    const messageContent = textToSend;
    if (typeof overrideText !== 'string') {
      setNewMessage('');
    }
    setIsLoading(true);
    setError(null);

    try {
      // Use the hook's sendMessage function to send the user message and update local state
      const sentMessage = await sendMessage(messageContent, false); // false = not AI message

      if (!sentMessage) {
        toast({
          title: "Failed to send message",
          description: "Could not send message. Please try again.",
          variant: "destructive",
        });
        setNewMessage(messageContent);
        setIsLoading(false);
        return;
      }

      // Dynamically name sessions based on first user message content
      const genericTitles = ['chat with ai assistant', 'talk to ai support', 'new ai-doctor session', 'new ai-patient session'];
      const hasGenericTitle = session.title && genericTitles.includes(session.title.toLowerCase());
      if ((messages.length === 0 || hasGenericTitle) && onRenameSession) {
        let suggestedTitle = messageContent.substring(0, 30);
        if (messageContent.length > 30) {
          suggestedTitle += '...';
        }
        onRenameSession(session.id, suggestedTitle);
      }

      // Generate AI response if this is an AI session
      if (session.session_type.includes('ai')) {
        try {
          const aiResult = await HuggingFaceService.generateDoctorResponse(
            messageContent,
            messages, // Pass conversation history
            session.session_type,
            dbContext  // Pass database context with patient/doctor info
          );

          if (aiResult.success && aiResult.response) {
            // Send AI response using the hook's sendMessage function
            await sendMessage(aiResult.response, true); // true marks it as AI message
          } else {
            setError(`AI Response Error: ${aiResult.error}`);
          }
        } catch (aiError) {
          setError('Failed to generate AI response. Please try again.');
        }
      }

      // Only set loading to false after everything is complete
      setIsLoading(false);
      onSessionUpdate?.();

    } catch (error) {
      toast({
        title: "Network Error",
        description: "Failed to send message. Please check your connection and try again.",
        variant: "destructive",
      });
      setNewMessage(messageContent);
      setIsLoading(false);
    }
  };

  const getMessageIcon = (message: Message) => {
    if (message.is_ai_message) {
      return <Bot className="h-4 w-4" />;
    }
    
    const isDoctorPatientChat = session?.session_type === 'doctor-patient';
    const isCurrentUserMessage = message.sender_id === (user?.auth_user_id || user?.id);
    
    if (isDoctorPatientChat) {
      if (user?.role === 'doctor') {
        return isCurrentUserMessage ? <User className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />;
      } else {
        return isCurrentUserMessage ? <User className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />;
      }
    } else {
      return isCurrentUserMessage ? <User className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />;
    }
  };



  const getSenderName = (message: Message) => {
    if (message.is_ai_message) {
      return session?.session_type === 'ai-doctor' ? 'AI Assistant' : 'AI Support';
    } 
    
    const isDoctorPatientChat = session?.session_type === 'doctor-patient';
    const isCurrentUserMessage = message.sender_id === (user?.auth_user_id || user?.id);
    
    if (isDoctorPatientChat) {
      // For doctor-patient chat
      if (user?.role === 'doctor') {
        return isCurrentUserMessage ? 'You' : 'Patient';
      } else {
        return isCurrentUserMessage ? 'You' : 'Doctor';
      }
    } else {
      // For AI chats
      return isCurrentUserMessage ? 'You' : (user?.role === 'doctor' ? 'Patient' : 'Doctor');
    }
  };

  if (!session) {
    const isDoctor = user?.role === 'doctor';
    return (
      <div className="flex flex-1 h-full w-full">
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center max-w-md p-8">
            {isDoctor ? (
              <Stethoscope className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            ) : (
              <Bot className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-bold text-slate-900 mb-2">
               {isDoctor ? 'Select a Patient' : 'Start Chatting with AI Support'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
               {isDoctor
                 ? 'Choose a patient from the sidebar to start a conversation and provide personalized care.'
                 : 'Click "Start New Chat" to begin a supportive conversation with your AI assistant.'}
            </p>
            {onNewSession && (
              <Button
                onClick={onNewSession}
                className="bg-[#5442f5] hover:bg-[#4335c0] text-white rounded-xl shadow-sm"
              >
                {isDoctor ? <User className="h-4 w-4 mr-2" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                {isDoctor ? 'Register New Patient' : 'Start New Chat'}
              </Button>
            )}
            {isDoctor && (
              <p className="text-[11px] text-slate-400 mt-4">Or select an existing patient to continue care</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full w-full">
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      
      {/* Main Chat Column */}
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth bg-white [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-4xl mx-auto space-y-8 pb-4">
          
          <div className="flex justify-center mb-8">
            <span className="bg-slate-100 text-slate-500 text-[11px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {session.session_type === 'ai-patient' 
                  ? "I'm here to provide emotional support and stress relief. How are you feeling today?"
                  : "Ask me anything about medical cases, treatments, or patient care."
                }
              </p>
            </div>
          )}
          
          {messages.map((message) => {
            const isCurrentUserMessage = message.sender_id === (user?.auth_user_id || user?.id) && !message.is_ai_message;
            const isDoctorPatientChat = session?.session_type === 'doctor-patient';
            
            // For doctor-patient chat, doctor's messages should appear on right as "You"
            // For patients, doctor's messages appear on left as "Doctor"
            // For doctors, patient's messages appear on left as "Patient"
            const isUserMessage = isDoctorPatientChat 
              ? (user?.role === 'doctor' ? isCurrentUserMessage : false)
              : isCurrentUserMessage;
            
            const isAIMessage = message.is_ai_message;
            
            return (
              <div
                key={message.id}
                className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start max-w-[85%] ${
                  isUserMessage ? 'flex-row-reverse space-x-reverse space-x-4' : 'space-x-4'
                }`}>
                  {/* Avatar & Sender Info */}
                  <div className={`flex flex-col flex-shrink-0 items-center mt-7`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border ${
                      isAIMessage 
                        ? 'bg-[#f4f2ff] border-[#e8e4ff] text-[#5442f5]' 
                        : isUserMessage
                          ? 'bg-transparent border-slate-200' 
                          : 'bg-green-100 border-green-200 text-green-700'
                    }`}>
                      {isAIMessage ? (
                        <div className="w-4 h-4 rounded-[4px] bg-[#5442f5] flex items-center justify-center">
                          <Bot className="h-3 w-3 text-white" />
                        </div>
                      ) : isUserMessage ? (
                         <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${getSenderName(message)}`} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        getMessageIcon(message)
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className={`flex flex-col`}>
                    {/* Sender Name */}
                    <div className={`flex items-center mb-1.5 ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[13px] font-semibold text-slate-500">
                        {isAIMessage ? 'Clinical AI Assistant' : user?.name || getSenderName(message)}
                      </span>
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`px-6 py-5 shadow-sm ${
                      isUserMessage
                        ? 'bg-[#5442f5] text-white rounded-2xl rounded-tr-sm'
                        : isAIMessage
                          ? 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-sm shadow-sm'
                          : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-2xl rounded-tl-sm'
                    }`}>
                      {isAIMessage ? (
                        <div className="text-[14.5px] leading-relaxed prose prose-sm max-w-none prose-headings:text-slate-800 prose-headings:font-bold prose-p:text-slate-600 prose-strong:text-slate-800 prose-ul:text-slate-600 prose-li:marker:text-slate-400">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                          
                          {/* AI Action Buttons */}
                          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
                            <button className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-700 text-[13px] font-semibold transition-colors">
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>Helpful</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-[80%]">
                {/* AI Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>

                {/* Typing Indicator */}
                <div className="flex flex-col items-start">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {session.session_type === 'ai-patient' ? 'AI Support' : 'AI Assistant'}
                    </span>
                  </div>
                  
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-gray-100 shadow-sm">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500 ml-2">AI is typing...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input Bottom */}
      <div className="px-6 py-6 bg-white relative shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          
          {/* @ Mention Patient Dropdown - only for doctors */}
          {isDoctorAIChat && showPatientList && patients.length > 0 && (
            <div className="absolute bottom-full left-6 right-6 mb-2 z-50">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Select a patient
                  </div>
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient)}
                      className="w-full text-left px-4 py-3 hover:bg-[#5442f5]/5 transition-colors flex items-center space-x-3 border-b border-slate-50 last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#5442f5]/10 text-[#5442f5] flex items-center justify-center text-xs font-bold">
                        {patient.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">{patient.name}</span>
                        <span className="text-xs text-slate-400">{patient.email || 'No email'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="w-full flex items-center bg-slate-50 border border-slate-100 rounded-2xl shadow-sm p-2 transition-all focus-within:ring-2 focus-within:ring-[#5442f5]/20 focus-within:border-[#5442f5]/30">
            <Input
              ref={inputRef}
              value={isListening && transcript ? transcript : newMessage}
              onChange={handleInputChange}
              placeholder={isDoctorAIChat ? "Type @ to select a patient, then ask about symptoms, labs, or literature..." : (isListening ? "Listening..." : "Type your message...")}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && (!isDoctorAIChat || !showPatientList)) {
                  handleSendMessage();
                } else if (e.key === 'Escape' && isDoctorAIChat) {
                  setShowPatientList(false);
                }
              }}
              disabled={isLoading || isListening}
              className={`flex-1 bg-transparent border-none px-2 py-3 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none text-base placeholder:text-slate-400 ${
                isListening ? 'text-[#5442f5] font-medium' : 'text-slate-700'
              }`}
            />
            <div className="flex items-center space-x-1 pr-1">
              {/* Voice input mic button - patient AI chat only */}
              {isPatientAIChat && (
                <button
                  onClick={() => {
                    if (isListening) {
                      if (transcript.trim()) {
                        handleSendMessage(transcript);
                      } else {
                        toast({
                          title: "No speech detected",
                          description: "Your browser's microphone didn't capture any audio. Please check your mic settings.",
                        });
                      }
                      stopListening();
                    } else {
                      startListening(
                        (text) => {
                          handleSendMessage(text); // Auto-send on natural pause
                        },
                        () => {
                          // Ended without result (e.g. timeout on silence)
                          toast({
                            title: "Microphone timeout",
                            description: "Listening stopped because no audio was detected by your browser.",
                          });
                        }
                      );
                    }
                  }}
                  disabled={isLoading && !isListening}
                  className={`p-3 transition-colors rounded-lg flex items-center justify-center ${
                    isListening
                      ? 'text-red-500 bg-red-50 animate-pulse'
                      : 'text-slate-400 hover:text-[#5442f5] hover:bg-[#5442f5]/5'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  <Mic className="h-5 w-5" />
                </button>
              )}
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !newMessage.trim()}
                className="bg-[#5442f5] hover:bg-[#4335c0] text-white rounded-xl w-12 h-12 p-0 shadow-md transition-all"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-wider text-center">
            DOCPLUS AI MAY PROVIDE CLINICAL SUGGESTIONS. ALWAYS VERIFY WITH PRIMARY DIAGNOSTICS.
          </p>

          {/* Selected Patient Indicator - only for doctors */}
          {isDoctorAIChat && selectedPatient && (
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <span>Context: {selectedPatient.name}</span>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Remove patient context"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};

export default ChatWindow;
