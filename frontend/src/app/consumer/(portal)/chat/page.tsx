'use client';
import { useState, useEffect, useRef } from 'react';
import { ChatApi } from '@/modules/chat/api/chat.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { Send, Trash2, Brain } from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth('CONSUMER');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    setMessages(prev => [...prev, { role: 'bot', text: '' }]);

    await ChatApi.sendMessage({ user_input: userMsg }, (fullText) => {
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].text = fullText;
        return newMsgs;
      });
    });

    setLoading(false);
  };

  const clearChat = async () => {
    await ChatApi.clearChat();
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[#004070] flex items-center gap-2">
          <Brain className="text-[#A3DAFF]" />
          AI Assistant
        </h2>
        <button 
          onClick={clearChat} 
          className="flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
          <span>Clear Chat</span>
        </button>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#A3DAFF] flex flex-col overflow-hidden min-h-[500px]">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 py-20">
              <Brain size={64} className="opacity-10 text-[#A3DAFF]" />
              <div className="text-center">
                <p className="text-lg font-medium text-gray-500">How can I help you today?</p>
                <p className="text-sm">Ask me anything about your health and fitness data.</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl ${
                m.role === 'user' 
                  ? 'bg-[#A3DAFF] text-[#004070] rounded-tr-none shadow-sm' 
                  : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text || (loading && i === messages.length - 1 ? '...' : '')}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-[#F0F9FF] bg-gray-50/50">
          <div className="flex space-x-4">
            <textarea
              className="flex-1 p-3 bg-white border border-[#A3DAFF] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[#A3DAFF] text-sm"
              placeholder="Type your message..."
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-[#A3DAFF] text-[#004070] p-3 rounded-xl hover:bg-[#87C6EE] disabled:bg-blue-100 transition-colors shadow-sm"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
