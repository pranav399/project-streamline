import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Sparkles,
  Flame,
  Bot,
  User,
  ExternalLink,
  RotateCcw,
  Landmark,
  ShoppingBag,
  CalendarHeart,
  ChevronDown,
  Volume2,
  VolumeX,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn, getApiUrl } from '../../lib/utils';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  model?: string;
  action?: {
    type: 'book' | 'shop' | 'temples' | 'pandits';
    label: string;
    link: string;
  };
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm-welcome',
    sender: 'bot',
    text: `Namaste and Pranam! 🙏 Welcome to PoojaConnect. I am your **Pooja Mitra** (spiritual assistant).\n\nI can help you with:\n• Recommending the best pooja ceremony for your family or occasion\n• Explaining Vedic ritual vidhi & required sacred samagri\n• Auspicious timings (Muhurat) and sankalp guidance\n• Exploring India's Sacred Temple Heritage\n\nHow may I assist your devotional journey today?`,
    timestamp: 'Just now',
  },
];

const PROMPT_SUGGESTIONS = [
  { label: '🏠 Griha Pravesh Pooja', prompt: 'Which pooja is recommended for entering a new home?' },
  { label: '🪔 Satyanarayan Katha', prompt: 'Tell me about Shri Satyanarayan Pooja vidhi and samagri list.' },
  { label: '🔱 Rudrabhishek', prompt: 'What are the benefits and required items for Rudrabhishek?' },
  { label: '📦 Complete Samagri Kit', prompt: 'What items are included in the complete Pooja Samagri Kit?' },
  { label: '🛕 Indian Temple Heritage', prompt: 'Tell me about the ancient temple heritage portal and famous Jyotirlingas.' },
  { label: '🕉️ How to book Pandit?', prompt: 'How does booking a verified Pandit work on PoojaConnect?' },
];

export function DevoteeChatbot() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('poojaconnect_chat_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_MESSAGES;
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(true);

  // Listen for custom launch event from user interface
  useEffect(() => {
    const handleLaunchChat = () => {
      setIsOpen(true);
      setHasNewNotification(false);
    };
    window.addEventListener('open-devotee-chatbot', handleLaunchChat);
    return () => window.removeEventListener('open-devotee-chatbot', handleLaunchChat);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('poojaconnect_chat_history', JSON.stringify(messages));
    } catch {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Strict check: Chatbot MUST ONLY appear in user/devotee interface, NEVER in the admin panel
  const isAdminRoute = location.pathname.includes('admin') || location.pathname.startsWith('/admin');
  const isAdminUser = profile?.role === 'admin';
  const isDevotee = profile ? profile.role === 'devotee' : true;

  if (isAdminUser || isAdminRoute || !isDevotee) {
    return null;
  }

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend || textToSend.trim() === '' || loading) return;

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text,
      }));

      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          history,
        }),
      });

      const data = await res.json();
      const replyText = data.reply || "Namaste! May Lord Ganesha remove all obstacles from your path. How else can I guide you? 🙏";

      // Contextual action detection
      let action: ChatMessage['action'] = undefined;
      const lower = (textToSend + ' ' + replyText).toLowerCase();
      if (lower.includes('griha') || lower.includes('satyanarayan') || lower.includes('rudra') || lower.includes('navgrah')) {
        action = {
          type: 'book',
          label: 'Book Ceremony Now',
          link: '/app/services',
        };
      } else if (lower.includes('samagri') || lower.includes('kit') || lower.includes('diya') || lower.includes('gangajal')) {
        action = {
          type: 'shop',
          label: 'Order Samagri in Shop',
          link: '/app/shop',
        };
      } else if (lower.includes('temple') || lower.includes('heritage') || lower.includes('darshan') || lower.includes('kashi')) {
        action = {
          type: 'temples',
          label: 'Explore Temple Heritage Portal',
          link: 'https://india-temple-heritage-portal-three.vercel.app/#/',
        };
      } else if (lower.includes('pandit')) {
        action = {
          type: 'pandits',
          label: 'Browse Verified Pandits',
          link: '/app/pandits',
        };
      }

      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: replyText,
        model: data.model,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: 'Pranam devotee! I experienced a momentary network interruption. Please try asking again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    try {
      localStorage.removeItem('poojaconnect_chat_history');
    } catch {}
  };

  const handleActionClick = (link: string) => {
    setIsOpen(false);
    navigate(link);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <div className="relative group">
          {hasNewNotification && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vermillion-400 opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 rounded-full bg-vermillion-500 text-[9px] font-bold text-white items-center justify-center">
                1
              </span>
            </span>
          )}

          <button
            onClick={() => {
              setIsOpen(true);
              setHasNewNotification(false);
            }}
            aria-label="Open Pooja Mitra Chatbot"
            className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-saffron-600 via-saffron-500 to-marigold-500 px-4 py-3 text-white shadow-pop transition-all duration-300 hover:scale-105 hover:shadow-glow focus:outline-none focus:ring-4 focus:ring-saffron-500/30 active:scale-95"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs">
              <Flame className="h-4 w-4 text-white animate-pulse" />
            </div>
            <span className="font-display font-semibold text-sm tracking-wide hidden sm:inline">
              Pooja Mitra
            </span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs hidden md:inline">
              Devotee Assistant
            </span>
          </button>
        </div>
      )}

      {/* Interactive Chat Window */}
      {isOpen && (
        <div className="flex flex-col w-[92vw] sm:w-[400px] h-[550px] max-h-[85vh] rounded-2xl border border-saffron-200/80 bg-white shadow-2xl overflow-hidden animate-slide-in dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-saffron-200/70 bg-gradient-to-r from-saffron-50 via-marigold-50 to-saffron-100/60 px-4 py-3 dark:border-slate-800 dark:from-slate-900 dark:to-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-500 to-vermillion-600 text-white shadow-soft">
                <Flame className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-sm font-bold text-saffron-950 dark:text-white">
                    Pooja Mitra
                  </h3>
                  <span className="rounded-md bg-emerald-100/90 dark:bg-emerald-950/70 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-0.5 border border-emerald-200/60 dark:border-emerald-800/50">
                    <Sparkles className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                    Dual Open-Source AI
                  </span>
                </div>
                <p className="text-[10.5px] text-saffron-700/80 dark:text-slate-400">
                  Mistral Nemo ⇄ Mistral Small • 100% Free Open API
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="rounded-lg p-1.5 text-saffron-600 hover:bg-saffron-200/50 hover:text-saffron-800 dark:text-slate-400 dark:hover:bg-slate-800"
                title="Restart Chat"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-saffron-600 hover:bg-saffron-200/50 hover:text-saffron-800 dark:text-slate-400 dark:hover:bg-slate-800"
                title="Close Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3.5 space-y-3 bg-saffron-50/25 dark:bg-slate-950/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex flex-col gap-1',
                  m.sender === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-soft whitespace-pre-wrap',
                    m.sender === 'user'
                      ? 'rounded-br-none bg-gradient-to-r from-saffron-600 to-saffron-700 text-white font-medium'
                      : 'rounded-bl-none border border-saffron-200/80 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200'
                  )}
                >
                  {m.text}

                  {/* Contextual Action Button if suggested by Pooja Mitra */}
                  {m.action && (
                    <div className="mt-2.5 pt-2 border-t border-saffron-100 dark:border-slate-700">
                      <button
                        onClick={() => handleActionClick(m.action!.link)}
                        className="flex items-center justify-between w-full rounded-lg bg-saffron-50 px-2.5 py-1.5 text-xs font-semibold text-saffron-800 hover:bg-saffron-100 dark:bg-slate-700 dark:text-saffron-300 dark:hover:bg-slate-650 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          {m.action.type === 'book' && <CalendarHeart className="h-3.5 w-3.5 text-saffron-600" />}
                          {m.action.type === 'shop' && <ShoppingBag className="h-3.5 w-3.5 text-saffron-600" />}
                          {m.action.type === 'temples' && <Landmark className="h-3.5 w-3.5 text-saffron-600" />}
                          {m.action.label}
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] text-slate-400">
                    {m.timestamp}
                  </span>
                  {m.sender === 'bot' && m.model && (
                    <span className="text-[9.5px] font-medium text-saffron-700/90 dark:text-saffron-400 flex items-center gap-1 bg-saffron-50 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-saffron-200/60 dark:border-slate-700">
                      <Sparkles className="h-2 w-2 text-saffron-500" />
                      {m.model}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-saffron-100 text-saffron-600 dark:bg-slate-800">
                  <Flame className="h-3.5 w-3.5 animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-none border border-saffron-200/80 bg-white px-3.5 py-2 text-xs text-saffron-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 shadow-soft">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-saffron-500" />
                  <span>Pooja Mitra is reciting Vedic guidance…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="border-t border-saffron-200/50 bg-white/95 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/90 overflow-x-auto scrollbar-thin">
            <div className="flex gap-1.5 pb-0.5">
              {PROMPT_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(item.prompt)}
                  disabled={loading}
                  className="shrink-0 rounded-full border border-saffron-200/70 bg-saffron-50/70 px-2.5 py-1 text-[11px] font-medium text-saffron-800 hover:bg-saffron-100 hover:border-saffron-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-saffron-200/70 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about poojas, vidhi, samagri or temples…"
              className="flex-1 rounded-xl border border-saffron-200 bg-saffron-50/40 px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-saffron-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-saffron-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron-600 text-white shadow-soft transition hover:bg-saffron-700 active:scale-95 disabled:opacity-40"
              aria-label="Send Message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
