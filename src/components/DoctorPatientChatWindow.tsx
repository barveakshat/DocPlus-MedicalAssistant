import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send, User, Stethoscope, MessageCircle, Check, CheckCheck,
  Copy, FileText, Sparkles, Paperclip, Image as ImageIcon,
  Download, X, Plus, Trash2, Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useDoctorPatientChat } from '@/hooks/useDoctorPatientChat';
import { useDoctorTemplates } from '@/hooks/useDoctorTemplates';
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
  /** Name of the other participant to display in the header */
  otherParticipantName?: string;
  /** Extra content to render above the message area (e.g. triage banner, care plan) */
  headerExtras?: React.ReactNode;
}

const formatBytes = (bytes: number | null | undefined) => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDateLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const DoctorPatientChatWindow: React.FC<DoctorPatientChatWindowProps> = ({
  session,
  onSessionUpdate,
  isLoading = false,
  otherParticipantName,
  headerExtras,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [soapSummary, setSoapSummary] = useState('');
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const [isCopyingSummary, setIsCopyingSummary] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSoap, setShowSoap] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const effectiveUserId = user?.auth_user_id || user?.id;

  const [newTemplateText, setNewTemplateText] = useState('');
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const { templates: doctorTemplates, addTemplate, deleteTemplate } = useDoctorTemplates(
    user?.role === 'doctor' ? effectiveUserId : null
  );

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
      setShowSoap(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session?.id || !effectiveUserId || messages.length === 0) return;
    markMessagesAsRead();
  }, [session?.id, effectiveUserId, messages.length, markMessagesAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !user?.id) return;
    setError(null);
    try {
      let sessionIdToSend = currentSessionId;
      if (!sessionIdToSend && session) {
        sessionIdToSend = session.id;
        setCurrentSessionId(session.id);
      }
      if (!sessionIdToSend) {
        let doctorId: string;
        let patientId: string;
        if (user?.role === 'doctor') {
          doctorId = effectiveUserId;
          patientId = session?.participant_2_id || session?.participant_1_id || '';
        } else {
          patientId = effectiveUserId;
          doctorId = session?.participant_1_id || session?.participant_2_id || '';
        }
        if (doctorId && patientId && doctorId !== patientId) {
          const newSessionId = await getOrCreateSession(doctorId, patientId);
          if (newSessionId) {
            sessionIdToSend = newSessionId;
            setCurrentSessionId(newSessionId);
          } else throw new Error('Could not establish a chat session.');
        } else throw new Error('Cannot determine doctor and patient IDs.');
      }
      if (!sessionIdToSend) throw new Error('No active session to send message to.');
      const result = await sendDoctorPatientMessage({
        targetSessionId: sessionIdToSend,
        content: newMessage,
        file: selectedFile,
      });
      if (result) {
        setNewMessage('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onSessionUpdate?.();
      } else throw new Error('Message sending failed.');
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      toast({ title: t('error'), description: err.message || 'Failed to send message', variant: 'destructive' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const appendTemplate = (template: string) => {
    setNewMessage((prev) => (!prev.trim() ? template : `${prev.trim()}\n${template}`));
    textareaRef.current?.focus();
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
      const transcript = messages.map((m) => {
        const sender = m.sender_id === effectiveUserId ? 'Doctor' : 'Patient';
        return `${sender}: ${m.content}`;
      }).join('\n');
      const prompt = `Create a concise SOAP note from this doctor-patient conversation.\n\nUse exactly these headings:\nSubjective:\nObjective:\nAssessment:\nPlan:\n\nRules:\n- Keep it concise and clinically useful.\n- Do not invent facts not present in the chat.\n\nConversation:\n${transcript}`;
      const aiResult = await HuggingFaceService.generateDoctorResponse(prompt, [], 'ai-doctor', {
        sessionType: 'ai-doctor',
        patientInfo: patientInfo || undefined,
        doctorInfo: doctorInfo || undefined,
      });
      if (!aiResult.success || !aiResult.response) throw new Error(aiResult.error || 'Failed to generate SOAP note.');
      setSoapSummary(aiResult.response);
      setShowSoap(true);
    } catch (e: any) {
      toast({ title: 'SOAP summary failed', description: e?.message || 'Could not generate summary.', variant: 'destructive' });
    } finally {
      setIsGeneratingSoap(false);
    }
  };

  const handleCopySummary = async () => {
    if (!soapSummary.trim()) return;
    try {
      setIsCopyingSummary(true);
      await navigator.clipboard.writeText(soapSummary);
      toast({ title: 'Copied', description: 'SOAP note copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Unable to copy summary.', variant: 'destructive' });
    } finally {
      setIsCopyingSummary(false);
    }
  };

  const renderAttachment = (message: DoctorPatientMessage) => {
    if (!message.attachment_path) return null;
    const isImage = message.message_type === 'image' || message.attachment_mime_type?.startsWith('image/');
    const attachmentUrl = message.attachment_signed_url;
    if (!attachmentUrl) return <div className="mt-1.5 text-xs opacity-70">Attachment unavailable.</div>;
    if (isImage) {
      return (
        <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
          <img src={attachmentUrl} alt={message.attachment_name || 'Image'} className="max-h-48 w-auto rounded-xl border-2 border-white/30 object-contain" />
        </a>
      );
    }
    return (
      <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2.5 rounded-xl border p-2.5 transition-opacity hover:opacity-80" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)' }}>
        <FileText className="h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold">{message.attachment_name || 'Document'}</p>
          <p className="text-[11px] opacity-70">{formatBytes(message.attachment_size)}</p>
        </div>
        <Download className="h-4 w-4 shrink-0 opacity-70" />
      </a>
    );
  };

  // Group messages by date
  const groupedMessages = messages.reduce<Array<{ label: string; msgs: DoctorPatientMessage[] }>>((acc, msg) => {
    const label = formatDateLabel(msg.created_at);
    const last = acc[acc.length - 1];
    if (last && last.label === label) { last.msgs.push(msg); }
    else acc.push({ label, msgs: [msg] });
    return acc;
  }, []);

  const unreadCount = messages.filter(m => m.sender_id !== effectiveUserId && !m.is_read).length;
  const otherName = otherParticipantName || (user?.role === 'doctor' ? t('chat_patient') : t('chat_doctor'));
  const initials = otherName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ── Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center rounded-2xl" style={{ background: 'white', border: '1px solid #cddff0' }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1868b7] mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">{t('chat_loading')}</p>
        </div>
      </div>
    );
  }

  // ── No session state
  if (!session) {
    return (
      <div className="h-full flex items-center justify-center rounded-2xl" style={{ background: 'white', border: '1px solid #cddff0' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#f0f6fc' }}>
            <MessageCircle className="h-8 w-8 text-[#c0dcf5]" />
          </div>
          <p className="text-slate-500 font-semibold text-sm">{t('chat_no_session')}</p>
          <p className="text-slate-400 text-xs mt-1">{t('chat_select_patient')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #cddff0', background: '#f7fbff' }}>

      {/* Chat Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-5 py-3.5"
        style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}
      >
        {/* Avatar */}
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.35)' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[14px] leading-tight truncate">{otherName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-white/70 text-[11px] font-medium">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500 text-white">
              {unreadCount} {t('chat_unread')}
            </span>
          )}
          {user?.role === 'doctor' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleGenerateSoapSummary()}
              disabled={isGeneratingSoap || messages.length === 0}
              className="text-white/80 hover:text-white hover:bg-white/15 h-8 text-[12px] font-semibold border border-white/25 rounded-xl px-3"
            >
              {isGeneratingSoap
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{t('chat_soap_loading')}</>
                : <><Sparkles className="h-3.5 w-3.5 mr-1.5" />{t('chat_soap')}</>
              }
            </Button>
          )}
        </div>
      </div>

      {/* Header Extras (triage, care plan, etc.) */}
      {headerExtras && (
        <div className="shrink-0 px-4 pt-3 space-y-2">
          {headerExtras}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: '#f0f6fc' }}>
                  <MessageCircle className="h-7 w-7 text-[#c0dcf5]" />
                </div>
                <p className="text-slate-500 text-sm font-medium">{t('chat_no_messages')}</p>
              </div>
            ) : (
              groupedMessages.map(({ label, msgs }) => (
                <div key={label}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px" style={{ background: '#e2eaf4' }} />
                    <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-full" style={{ background: '#eef5fc' }}>{label}</span>
                    <div className="flex-1 h-px" style={{ background: '#e2eaf4' }} />
                  </div>
                  <div className="space-y-2">
                    {msgs.map((message) => {
                      const isOwn = message.sender_id === effectiveUserId;
                      return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                          {/* Other user avatar */}
                          {!isOwn && (
                            <div
                              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-1"
                              style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
                            >
                              {user?.role === 'doctor' ? <User className="h-3.5 w-3.5" /> : <Stethoscope className="h-3.5 w-3.5" />}
                            </div>
                          )}

                          <div className={`max-w-[72%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            {/* Sender label */}
                            <span className="text-[11px] font-medium text-slate-400 px-1">
                              {isOwn ? t('chat_you') : otherName}
                            </span>
                            {/* Bubble */}
                            <div
                              className="rounded-2xl px-4 py-2.5 shadow-sm"
                              style={
                                isOwn
                                  ? {
                                      background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)',
                                      color: 'white',
                                      borderBottomRightRadius: '6px',
                                    }
                                  : {
                                      background: 'white',
                                      color: '#1e293b',
                                      border: '1px solid #e2eaf4',
                                      borderBottomLeftRadius: '6px',
                                    }
                              }
                            >
                              {message.content && (
                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                              )}
                              {renderAttachment(message)}
                            </div>
                            {/* Timestamp + read receipt */}
                            <div className={`flex items-center gap-1 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                              <span className="text-[10px] text-slate-400">{formatTime(message.created_at)}</span>
                              {isOwn && (
                                message.is_read
                                  ? <CheckCheck className="h-3 w-3 text-[#0891b2]" />
                                  : <Check className="h-3 w-3 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Own avatar */}
                          {isOwn && (
                            <div
                              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-1"
                              style={{ background: 'linear-gradient(135deg, #0891b2 0%, #1868b7 100%)' }}
                            >
                              {user?.role === 'doctor' ? <Stethoscope className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* SOAP Note Panel */}
      {showSoap && soapSummary && user?.role === 'doctor' && (
        <div className="shrink-0 mx-4 mb-2 rounded-xl overflow-hidden" style={{ border: '1px solid #c0dcf5', background: '#f0f6fc' }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #c0dcf5' }}>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#1868b7]" />
              <span className="text-[13px] font-bold text-[#1868b7]">SOAP Note</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => void handleCopySummary()} disabled={isCopyingSummary} className="h-7 text-[12px] text-[#1868b7] hover:bg-[#dceaf6]">
                <Copy className="h-3.5 w-3.5 mr-1" />
                {isCopyingSummary ? 'Copying...' : 'Copy'}
              </Button>
              <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setShowSoap(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="px-4 py-3 text-[12px] text-slate-700 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
            {soapSummary}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="shrink-0 mx-4 mb-2 px-4 py-2.5 rounded-xl text-[12px] text-red-600 font-medium" style={{ background: '#fff0f0', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="shrink-0 px-4 py-3" style={{ borderTop: '1px solid #e2eaf4', background: 'white' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
              toast({ title: 'File too large', description: 'Max 10 MB.', variant: 'destructive' });
              e.target.value = ''; return;
            }
            setSelectedFile(file);
          }}
        />

        {/* Doctor quick-reply templates */}
        {user?.role === 'doctor' && (doctorTemplates.length > 0 || isAddingTemplate) && (
          <div className="mb-2.5 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {doctorTemplates.map((t_item) => (
                <div key={t_item.id} className="group relative inline-flex">
                  <button
                    type="button"
                    onClick={() => appendTemplate(t_item.content)}
                    className="text-[11px] font-semibold px-3 py-1 rounded-full transition-all hover:opacity-90 pr-6"
                    style={{ background: '#f0f6fc', color: '#1868b7', border: '1px solid #c0dcf5' }}
                  >
                    {t_item.content.length > 32 ? `${t_item.content.slice(0, 32)}…` : t_item.content}
                  </button>
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                    onClick={() => void deleteTemplate(t_item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {isAddingTemplate && (
              <div className="flex gap-2">
                <input
                  value={newTemplateText}
                  onChange={(e) => setNewTemplateText(e.target.value)}
                  placeholder="New quick-reply text..."
                  className="flex-1 text-[12px] px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1"
                  style={{ borderColor: '#c0dcf5', background: '#f7fbff' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTemplateText.trim()) {
                      void addTemplate(newTemplateText);
                      setNewTemplateText('');
                      setIsAddingTemplate(false);
                    }
                  }}
                />
                <button
                  type="button"
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-xl text-white"
                  style={{ background: 'linear-gradient(135deg, #1868b7, #0891b2)' }}
                  onClick={() => {
                    if (newTemplateText.trim()) {
                      void addTemplate(newTemplateText);
                      setNewTemplateText('');
                      setIsAddingTemplate(false);
                    }
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="text-[12px] font-medium px-3 py-1.5 rounded-xl text-slate-500"
                  style={{ background: '#f0f6fc', border: '1px solid #c0dcf5' }}
                  onClick={() => { setIsAddingTemplate(false); setNewTemplateText(''); }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Doctor: Add template button if no templates yet */}
        {user?.role === 'doctor' && doctorTemplates.length === 0 && !isAddingTemplate && (
          <div className="mb-2">
            <button
              type="button"
              onClick={() => setIsAddingTemplate(true)}
              className="text-[11px] font-semibold text-[#1868b7] flex items-center gap-1 hover:opacity-70 transition-opacity"
            >
              <Plus className="h-3 w-3" />
              {t('chat_add_template')}
            </button>
          </div>
        )}
        {user?.role === 'doctor' && doctorTemplates.length > 0 && !isAddingTemplate && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('chat_templates')}</span>
            <button
              type="button"
              onClick={() => setIsAddingTemplate(true)}
              className="text-[11px] font-semibold text-[#1868b7] flex items-center gap-1 hover:opacity-70"
            >
              <Plus className="h-3 w-3" />
              {t('chat_add_template')}
            </button>
          </div>
        )}

        {/* Selected file preview */}
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#f0f6fc', border: '1px solid #c0dcf5' }}>
            {selectedFile.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-[#1868b7] shrink-0" /> : <FileText className="h-4 w-4 text-[#1868b7] shrink-0" />}
            <span className="text-[12px] font-medium text-slate-700 truncate flex-1">{selectedFile.name}</span>
            <span className="text-[11px] text-slate-400 shrink-0">{formatBytes(selectedFile.size)}</span>
            <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-slate-400 hover:text-red-500 shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          <div
            className="flex-1 flex items-end gap-2 px-3 py-2 rounded-2xl"
            style={{ background: '#f7fbff', border: '1px solid #c0dcf5' }}
          >
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat_placeholder')}
              disabled={messagesLoading}
              rows={1}
              className="flex-1 resize-none bg-transparent text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none"
              style={{ maxHeight: '120px', lineHeight: '1.5' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={messagesLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#1868b7] hover:bg-[#f0f6fc] transition-colors shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={(!newMessage.trim() && !selectedFile) || messagesLoading}
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #1868b7 0%, #0891b2 100%)' }}
          >
            {messagesLoading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Send className="h-4 w-4 text-white" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};

export default DoctorPatientChatWindow;
