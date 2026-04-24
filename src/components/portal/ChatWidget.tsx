import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types/portal';

interface ChatWidgetProps {
  clientId: string;
  projectId: string;
  projectTitle: string;
  initialMessages?: ChatMessage[];
}

// Mock AI responses based on keywords
function getMockResponse(message: string, projectTitle: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('status') || lower.includes('progress') || lower.includes('how')) {
    return `Your project "${projectTitle}" is progressing well! The team is currently working on the latest milestone. Check the task checklist in your dashboard for a detailed breakdown of what's been completed and what's coming next.`;
  }
  if (lower.includes('deadline') || lower.includes('when') || lower.includes('timeline') || lower.includes('done')) {
    return `Great question! You can see the estimated completion date and countdown timer on your project card in the dashboard. If anything changes, we'll post an update to your project timeline right away.`;
  }
  if (lower.includes('invoice') || lower.includes('pay') || lower.includes('price') || lower.includes('cost')) {
    return `You can view all your invoices and payment status in the Payments section of your project details. If you have an outstanding balance, there's a "Pay Now" button that will take you to our secure payment page.`;
  }
  if (lower.includes('video') || lower.includes('walkthrough') || lower.includes('preview')) {
    return `Any video walkthroughs or deliverables will appear in the Videos section of your project. We'll also post an update to your timeline whenever a new video is ready for you to review!`;
  }
  if (lower.includes('change') || lower.includes('revision') || lower.includes('edit') || lower.includes('update')) {
    return `We include revision rounds in every package! For specific changes or additions beyond the scope, feel free to describe what you need here and I'll flag it for the team. You can also reach out directly for larger requests.`;
  }
  return `Thanks for reaching out! I'm here to help with questions about your project "${projectTitle}." For detailed requests or changes, I'd recommend reaching out to the team directly — they'll be happy to help!`;
}

export function ChatWidget({ clientId, projectId, projectTitle, initialMessages = [] }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      client_id: clientId,
      project_id: projectId,
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const reply: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        client_id: clientId,
        project_id: projectId,
        role: 'assistant',
        content: getMockResponse(userMsg.content, projectTitle),
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110"
        style={{ background: '#E94560', color: '#fff' }}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <Card
      className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100vh-3rem)] flex flex-col border shadow-2xl overflow-hidden"
      style={{ background: '#16213E', borderColor: 'rgba(233,69,96,0.3)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: '#1A1A2E' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="p-1.5 rounded-lg"
            style={{ background: 'rgba(233,69,96,0.15)' }}
          >
            <Bot className="h-4 w-4" style={{ color: '#E94560' }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: '#F7F5F2' }}>
              Project Assistant
            </div>
            <div className="text-[11px]" style={{ color: '#6B6B80' }}>
              Ask about your project
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-md transition-colors hover:bg-white/10"
          style={{ color: '#B8B8CC' }}
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Separator style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-10 w-10 mx-auto mb-3" style={{ color: '#6B6B80' }} />
            <p className="text-sm" style={{ color: '#B8B8CC' }}>
              Ask me anything about your project!
            </p>
            <div className="mt-4 space-y-2">
              {['What\'s the current status?', 'When will it be done?', 'Any new videos?'].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => sendMessage(), 50);
                  }}
                  className="block w-full text-left text-xs px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: '#B8B8CC', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role !== 'user' && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(233,69,96,0.15)' }}
              >
                <Bot className="h-3.5 w-3.5" style={{ color: '#E94560' }} />
              </div>
            )}
            <div
              className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
              }`}
              style={
                msg.role === 'user'
                  ? { background: '#E94560', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.06)', color: '#B8B8CC' }
              }
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <User className="h-3.5 w-3.5" style={{ color: '#B8B8CC' }} />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2 justify-start">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(233,69,96,0.15)' }}
            >
              <Bot className="h-3.5 w-3.5" style={{ color: '#E94560' }} />
            </div>
            <div
              className="px-3 py-2 rounded-xl rounded-bl-sm text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#6B6B80' }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 flex-shrink-0" style={{ background: '#1A1A2E' }}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#F7F5F2' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="p-1.5 rounded-lg transition-all duration-200 disabled:opacity-30"
            style={{ background: input.trim() ? '#E94560' : 'transparent', color: '#fff' }}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
