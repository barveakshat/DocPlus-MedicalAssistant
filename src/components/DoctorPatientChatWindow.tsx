import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Stethoscope, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChatAPI } from '@/integrations/supabase/chat-api';
import { useToast } from '@/hooks/use-toast';
import { useDoctorPatientChat } from '@/hooks/useDoctorPatientChat';

interface DoctorPatientMessage {
  id: string;
  session_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface DoctorPatientChatSession {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  session_type?: string;
}

interface DoctorPatientChatWindowProps {
  session: DoctorPatientChatSession | null;
  onSessionUpdate?: () => void;
  isLoading?: boolean;
}

const DoctorPatientChatWindow: React.FC<DoctorPatientChatWindowProps> = ({
  session,
  onSessionUpdate,
  isLoading = false
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Use the doctor-patient chat hook
  const {
    messages,
    loading: messagesLoading,
    sendMessage: sendDoctorPatientMessage,
    fetchMessages: fetchDoctorPatientMessages,
    getOrCreateSession,
  } = useDoctorPatientChat(session?.id || null);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(session?.id || null);

  useEffect(() => {
    if (session) {
      setCurrentSessionId(session.id);
    }
  }, [session]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;

    setError(null);

    try {
      let sessionIdToSend = currentSessionId;

      // If there's no active session, try to get or create one
      if (!sessionIdToSend && session) {
        // Use the session from props if available
        sessionIdToSend = session.id;
        setCurrentSessionId(session.id);
      }

      if (!sessionIdToSend) {
        // Determine doctor and patient IDs based on user role and session data
        let doctorId: string;
        let patientId: string;

        if (user?.role === 'doctor') {
          doctorId = user.id;
          // For now, we'll assume the other participant is a patient
          // In a real app, you'd get this from the session or route params
          patientId = session?.participant_2_id || session?.participant_1_id || '';
        } else {
          patientId = user.id;
          // For now, we'll assume the other participant is a doctor
          doctorId = session?.participant_1_id || session?.participant_2_id || '';
        }

        if (doctorId && patientId && doctorId !== patientId) {
          console.log('Creating new session for:', { doctorId, patientId });
          const newSessionId = await getOrCreateSession(doctorId, patientId);
          if (newSessionId) {
            sessionIdToSend = newSessionId;
            setCurrentSessionId(newSessionId);
          } else {
            throw new Error("Could not establish a chat session.");
          }
        } else {
          throw new Error("Cannot determine doctor and patient IDs.");
        }
      }

      if (!sessionIdToSend) {
        throw new Error("No active session to send message to.");
      }

      console.log('Sending doctor-patient message:', {
        sessionId: sessionIdToSend,
        content: newMessage.trim(),
        senderId: user.id
      });

      // Use the hook's sendMessage function, passing the correct session ID
      const result = await sendDoctorPatientMessage(newMessage.trim(), sessionIdToSend);
      if (result) {
        setNewMessage('');
        onSessionUpdate?.();
      } else {
        throw new Error("Message sending failed, but no error was thrown from hook.");
      }
    } catch (err: any) {
      console.error('Error sending doctor-patient message:', err);
      setError(err.message || 'Failed to send message');
      toast({
        title: "Error",
        description: err.message || "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageIcon = (message: DoctorPatientMessage) => {
    if (message.sender_id === (user?.auth_user_id || user?.id)) {
      return <User className="h-4 w-4" />;
    } else {
      return <Stethoscope className="h-4 w-4" />;
    }
  };

  const getMessageStyle = (message: DoctorPatientMessage) => {
    if (message.sender_id === (user?.auth_user_id || user?.id)) {
      return 'bg-primary text-primary-foreground ml-16';
    } else {
      return 'bg-muted text-muted-foreground mr-16';
    }
  };

  const getSenderName = (message: DoctorPatientMessage) => {
    if (message.sender_id === (user?.auth_user_id || user?.id)) {
      return 'You';
    } else {
      return user?.role === 'doctor' ? 'Patient' : 'Doctor';
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (isLoading) {
    return (
      <Card className="flex-1 flex items-center justify-center">
        <CardContent className="text-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Loading Chat</h3>
          <p className="text-muted-foreground">
            Initializing your chat session...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="flex-1 flex items-center justify-center">
        <CardContent className="text-center p-6">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Chat Session</h3>
          <p className="text-muted-foreground">
            Select a patient to start a conversation
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 flex flex-col">
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Chat Header */}
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">{session.title}</h3>
          <p className="text-sm text-muted-foreground">
            Doctor-Patient Chat Session
          </p>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_id === (user?.auth_user_id || user?.id) ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className={`max-w-[80%] p-3 rounded-lg ${getMessageStyle(message)}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      {getMessageIcon(message)}
                      <span className="text-xs font-medium opacity-75">
                        {getSenderName(message)}
                      </span>
                      <span className="text-xs opacity-50">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border-t border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={messagesLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || messagesLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DoctorPatientChatWindow;
