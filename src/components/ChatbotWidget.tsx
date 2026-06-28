import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi there! I'm Agnes-Tachyon, your AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://portfolio-backend-zphz.onrender.com/api';
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, token }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const errData = await response.json();
          throw new Error(`LIMIT:${errData.message}`);
        }
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response ?? 'I received your message!',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('[Agnes-Tachyon] Chat error:', err);
      let content = "I'm having trouble connecting right now. Make sure the Agnes-Tachyon backend is running!";
      if (err.message && err.message.startsWith('LIMIT:')) {
        content = err.message.substring(6);
      }
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* ── Chatbot Toggle Button ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="chatbot-toggle-btn"
        aria-label="Open Agnes-Tachyon chatbot"
        title="Chat with Agnes-Tachyon"
      >
        <div className="chatbot-video-wrapper">
          <video
            src="/agnes-tachyon.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="chatbot-video"
          />
        </div>
        {/* Unread dot when closed */}
        {!isOpen && <span className="chatbot-dot" />}
      </button>

      {/* ── Chat Panel ── */}
      <div className={`chatbot-panel ${isOpen ? 'chatbot-panel--open' : ''}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-avatar">
            <video
              src="/agnes-tachyon.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="chatbot-header-video"
            />
          </div>
          <div className="chatbot-header-info">
            <h3 className="chatbot-header-name">Agnes-Tachyon</h3>
            <p className="chatbot-header-status">
              <span className="chatbot-status-pulse" />
              Online
            </p>
          </div>
          <div className="chatbot-header-actions">
            <button
              onClick={() => setIsOpen(false)}
              className="chatbot-icon-btn"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chatbot-message ${msg.role === 'user' ? 'chatbot-message--user' : 'chatbot-message--assistant'}`}
            >
              {msg.role === 'assistant' && (
                <div className="chatbot-avatar">
                  <Bot size={14} />
                </div>
              )}
              <div className="chatbot-bubble-wrapper">
                <div className="chatbot-bubble">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="chatbot-md-p">{children}</p>,
                        strong: ({ children }) => <strong className="chatbot-md-strong">{children}</strong>,
                        em: ({ children }) => <em className="chatbot-md-em">{children}</em>,
                        ul: ({ children }) => <ul className="chatbot-md-ul">{children}</ul>,
                        ol: ({ children }) => <ol className="chatbot-md-ol">{children}</ol>,
                        li: ({ children }) => <li className="chatbot-md-li">{children}</li>,
                        code: ({ children }) => <code className="chatbot-md-code">{children}</code>,
                        pre: ({ children }) => <pre className="chatbot-md-pre">{children}</pre>,
                        h1: ({ children }) => <h1 className="chatbot-md-h">{children}</h1>,
                        h2: ({ children }) => <h2 className="chatbot-md-h">{children}</h2>,
                        h3: ({ children }) => <h3 className="chatbot-md-h chatbot-md-h3">{children}</h3>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="chatbot-md-a">{children}</a>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
                <span className="chatbot-time">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chatbot-message chatbot-message--assistant">
              <div className="chatbot-avatar">
                <Bot size={14} />
              </div>
              <div className="chatbot-bubble chatbot-bubble--typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chatbot-input-bar">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Agnes-Tachyon…"
            className="chatbot-input"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="chatbot-send-btn"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
