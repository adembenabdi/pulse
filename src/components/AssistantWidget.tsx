'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Spinner } from '@/components/ui/primitives';
import { MessageCircle, X, Send, Sparkles, Bot, User } from 'lucide-react';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [sugLoading, setSugLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch a quick suggestion when widget opens
  const fetchSuggestion = useCallback(async () => {
    setSugLoading(true);
    try {
      const res = await api.assistant.suggest();
      setSuggestion(res.suggestion);
    } catch {
      setSuggestion('');
    } finally {
      setSugLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      fetchSuggestion();
    }
  }, [open, messages.length, fetchSuggestion]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const history = newMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.assistant.chat(msg, history.slice(-6));
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'What should I do now?',
    'What\'s my priority today?',
    'Am I on track?',
  ];

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--violet)] shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[360px] max-w-[400px] flex flex-col"
            style={{ height: 'min(520px, calc(100vh - 80px))' }}
          >
            <Card variant="elevated" className="flex flex-col h-full overflow-hidden shadow-2xl border border-[var(--border)]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-gradient-to-r from-[var(--primary)]/10 to-[var(--violet)]/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--violet)] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">Pulse AI</p>
                    <p className="text-[10px] text-[var(--foreground-muted)]">Your personal assistant</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--background-surface)] transition-colors">
                  <X className="w-4 h-4 text-[var(--foreground-muted)]" />
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {/* Initial suggestion */}
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-md bg-[var(--primary)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-[var(--primary)]" />
                      </div>
                      <div className="bg-[var(--background-surface)] rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                        {sugLoading ? (
                          <Spinner size={16} />
                        ) : suggestion ? (
                          <p className="text-sm text-[var(--foreground)]">{suggestion}</p>
                        ) : (
                          <p className="text-sm text-[var(--foreground)]">Hey! Ask me what you should do, your priorities, or anything about your day.</p>
                        )}
                      </div>
                    </div>

                    {/* Quick prompts */}
                    <div className="flex flex-wrap gap-1.5 pl-8">
                      {quickPrompts.map(q => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          className="text-[11px] px-2.5 py-1.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat messages */}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      msg.role === 'user' ? 'bg-[var(--foreground)]/10' : 'bg-[var(--primary)]/15'
                    }`}>
                      {msg.role === 'user' ?
                        <User className="w-3.5 h-3.5 text-[var(--foreground-muted)]" /> :
                        <Bot className="w-3.5 h-3.5 text-[var(--primary)]" />
                      }
                    </div>
                    <div className={`rounded-xl px-3 py-2 max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-[var(--primary)] text-white rounded-tr-sm'
                        : 'bg-[var(--background-surface)] text-[var(--foreground)] rounded-tl-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-[var(--primary)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-[var(--primary)]" />
                    </div>
                    <div className="bg-[var(--background-surface)] rounded-xl rounded-tl-sm px-3 py-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="px-3 py-2 border-t border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Ask me anything..."
                    className="flex-1 text-sm bg-[var(--background-surface)] rounded-xl px-3 py-2.5 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] outline-none border border-[var(--border)] focus:border-[var(--primary)] transition-colors"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
