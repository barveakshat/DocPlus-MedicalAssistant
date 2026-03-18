import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, User, Stethoscope, MessageCircle, Check, CheckCheck, Copy, FileText, Sparkles, Paperclip, Image as ImageIcon, Download, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDoctorPatientChat } from '@/hooks/useDoctorPatientChat';
import { HuggingFaceService } from '@/services/huggingFaceService';

interface DoctorPatientMessage {
  id: string;
  session_id: string;
  sender_id: string;
  content: string | null;
  is_read: boolean | null;
  created_at: string;
  message_type?: string;
  attachment_name?: string | null;
  attachment_mime_type?: string | null;
  attachment_size?: number | null;
  attachment_path?: string | null;
  attachment_signed_url?: string | null;
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
  const [soapSummary, setSoapSummary] = useState('');
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const [isCopyingSummary, setIsCopyingSummary] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const effectiveUserId = user?.auth_user_id || user?.id;

  const doctorTemplates = [
    'Please upload your latest reports before our next discussion.',
    'Please book a follow-up for 7 days from now.',
    'Kindly monitor your symptoms and share updates by evening.',
    'Please continue current medication and report any side effects immediately.'
  ];

  // Use the doctor-patient chat hook
  const {
    messages,
    loading: messagesLoading,
    sendMessage: sendDoctorPatientMessage,
    fetchMessages: fetchDoctorPatientMessages,
    markMessagesAsRead,
    getOrCreateSession,
  } = useDoctorPatientChat(session?.id || null);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(session?.id || null);

  useEffect(() => {
    if (session) {
      setCurrentSessionId(session.id);
      setSoapSummary('');
    }
  }, [session]);

  useEffect(() => {
    if (!session?.id || !effectiveUserId || messages.length === 0) return;
    markMessagesAsRead();
  }, [session?.id, effectiveUserId, messages.length, markMessagesAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !user?.id) return;

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
          doctorId = effectiveUserId;
          // For now, we'll assume the other participant is a patient
          // In a real app, you'd get this from the session or route params
          patientId = session?.participant_2_id || session?.participant_1_id || '';
        } else {
          patientId = effectiveUserId;
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
        attachment: selectedFile?.name,
        senderId: effectiveUserId
      });

      // Use the hook's sendMessage function, passing the correct session ID
      const result = await sendDoctorPatientMessage({
        targetSessionId: sessionIdToSend,
        content: newMessage,
        file: selectedFile,
      });
      if (result) {
        setNewMessage('');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
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

  const appendTemplate = (template: string) => {
    setNewMessage((prev) => {
      if (!prev.trim()) return template;
      return `${prev.trim()}\n${template}`;
    });
  };

  const handleGenerateSoapSummary = async () => {
    if (!user || user.role !== 'doctor' || messages.length === 0) return;

    try {
      setIsGeneratingSoap(true);

      const patientUserId =
        session?.participant_1_id === effectiveUserId ? session?.participant_2_id : session?.participant_1_id;

      const [patientInfo, doctorInfo] = await Promise.all([
        patientUserId ? HuggingFaceService.fetchPatientContext(patientUserId) : Promise.resolve(null),
        effectiveUserId ? HuggingFaceService.fetchDoctorContext(effectiveUserId) : Promise.resolve(null),
      ]);

      const transcript = messages
        .map((message) => {
          const sender = message.sender_id === effectiveUserId ? 'Doctor' : 'Patient';
          return `${sender}: ${message.content}`;
        })
        .join('\n');

      const prompt = `Create a concise SOAP note from this doctor-patient conversation.\n\nUse exactly these headings:\nSubjective:\nObjective:\nAssessment:\nPlan:\n\nRules:\n- Keep it concise and clinically useful.\n- Do not invent facts not present in the chat.\n- Mention uncertainties when data is missing.\n\nConversation:\n${transcript}`;

      const aiResult = await HuggingFaceService.generateDoctorResponse(
        prompt,
        [],
        'ai-doctor',
        {
          sessionType: 'ai-doctor',
          patientInfo: patientInfo || undefined,
          doctorInfo: doctorInfo || undefined,
        }
      );

      if (!aiResult.success || !aiResult.response) {
        throw new Error(aiResult.error || 'Failed to generate SOAP note.');
      }

      setSoapSummary(aiResult.response);
    } catch (summaryError: any) {
      toast({
        title: 'SOAP summary failed',
        description: summaryError?.message || 'Could not generate summary right now.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingSoap(false);
    }
  };

  const handleCopySummary = async () => {
    if (!soapSummary.trim()) return;
    try {
      setIsCopyingSummary(true);
      await navigator.clipboard.writeText(soapSummary);
      toast({
        title: 'Copied',
        description: 'SOAP note copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy summary.',
        variant: 'destructive',
      });
    } finally {
      setIsCopyingSummary(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title: 'File too large',
        description: 'Please select a file up to 10MB.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number | null | undefined) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderAttachment = (message: DoctorPatientMessage) => {
    if (!message.attachment_path) return null;

    const isImage = message.message_type === 'image' || message.attachment_mime_type?.startsWith('image/');
    const attachmentUrl = message.attachment_signed_url;

    if (!attachmentUrl) {
      return (
        <div className="mt-2 text-xs opacity-80">
          Attachment unavailable. Please refresh.
        </div>
      );
    }

    if (isImage) {
      return (
        <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
          <img
            src={attachmentUrl}
            alt={message.attachment_name || 'Chat image'}
            className="max-h-56 w-auto rounded-md border object-contain"
          />
        </a>
      );
    }

    return (
      <a
        href={attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center justify-between rounded-md border p-2 text-sm"
      >
        <div className="min-w-0">
          <p className="truncate font-medium">{message.attachment_name || 'Document'}</p>
          <p className="text-xs opacity-75">{formatBytes(message.attachment_size)}</p>
        </div>
        <Download className="h-4 w-4 shrink-0" />
      </a>
    );
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
      return 'bg-primary text-primary-foreground ml-2 md:ml-8';
    } else {
      return 'bg-slate-100 text-slate-800 border border-slate-200 mr-2 md:mr-8';
    }
  };

  const getSenderName = (message: DoctorPatientMessage) => {
    if (message.sender_id === effectiveUserId) {
      return 'You';
    } else {
      return user?.role === 'doctor' ? 'Patient' : 'Doctor';
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const unreadIncomingCount = messages.filter(
    (message) => message.sender_id !== effectiveUserId && !message.is_read
  ).length;

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
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="flex-1 min-h-0 flex flex-col p-0">
        {/* Chat Header */}
        <div className="p-3 border-b bg-muted/40">
          <div className="flex items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              {unreadIncomingCount > 0 && (
                <Badge variant="secondary">{unreadIncomingCount} unread</Badge>
              )}
              {user?.role === 'doctor' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSoapSummary}
                  disabled={isGeneratingSoap || messages.length === 0}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isGeneratingSoap ? 'Summarizing...' : 'Summarize to SOAP'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full p-3">
            <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === effectiveUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-lg ${getMessageStyle(message)}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      {getMessageIcon(message)}
                      <span className="text-xs font-medium opacity-75">
                        {getSenderName(message)}
                      </span>
                      <span className="text-xs opacity-50">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    {message.content ? <p className="text-sm whitespace-pre-wrap">{message.content}</p> : null}
                    {renderAttachment(message)}
                    {message.sender_id === effectiveUserId && (
                      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] opacity-80">
                        {message.is_read ? (
                          <>
                            <CheckCheck className="h-3.5 w-3.5" />
                            <span>Read</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Sent</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {soapSummary && user?.role === 'doctor' && (
          <div className="p-4 border-t bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText className="h-4 w-4" />
                SOAP Note
              </div>
              <Button size="sm" variant="outline" onClick={handleCopySummary} disabled={isCopyingSummary}>
                <Copy className="h-4 w-4 mr-2" />
                {isCopyingSummary ? 'Copying...' : 'Copy'}
              </Button>
            </div>
            <div className="rounded-md border bg-white p-3 text-sm whitespace-pre-wrap text-slate-700">
              {soapSummary}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border-t border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Message Input */}
        <div className="p-4 border-t">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileSelection}
          />

          {selectedFile && (
            <div className="mb-3 flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                {selectedFile.type.startsWith('image/') ? (
                  <ImageIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">({formatBytes(selectedFile.size)})</span>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={clearSelectedFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {user?.role === 'doctor' && (
            <div className="mb-3 flex flex-wrap gap-2">
              {doctorTemplates.map((template) => (
                <Button
                  key={template}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => appendTemplate(template)}
                >
                  {template.length > 36 ? `${template.slice(0, 36)}...` : template}
                </Button>
              ))}
            </div>
          )}
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message or attach a file..."
              disabled={messagesLoading}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleFilePick}
              disabled={messagesLoading}
              size="icon"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              onClick={sendMessage}
              disabled={(!newMessage.trim() && !selectedFile) || messagesLoading}
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
