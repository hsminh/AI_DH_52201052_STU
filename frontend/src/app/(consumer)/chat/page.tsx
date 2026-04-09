'use client';
import { useState, useEffect, useRef } from 'react';
import { ChatApi } from '@/modules/chat/api/chat.api';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { Send, Trash2, LogOut, Brain, Dumbbell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ChatPage() {
  const { user, logout } = useAuth('CONSUMER');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col p-6 space-y-8">
        <div className="flex items-center space-x-2 text-blue-600">
          <Brain size={32} />
          <span className="text-xl font-bold">RAG Gemini</span>
        </div>

        <nav className="flex-1 space-y-2">
          <Link href="/fitness" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-green-50 text-green-700 transition-colors">
            <Dumbbell size={20} />
            <span className="font-medium">Fitness Analyst</span>
          </Link>
          <button onClick={clearChat} className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
            <Trash2 size={20} />
            <span className="font-medium">Clear Chat</span>
          </button>
        </nav>

        <div className="space-y-4 pt-6 border-t border-gray-100">
          <button onClick={logout} className="w-full flex items-center justify-center space-x-2 p-2 text-gray-500 hover:text-red-600 text-sm">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Chat Main */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <Brain size={48} className="opacity-20" />
                <p>Hello! Ask me anything about your documents.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text || (loading && i === messages.length - 1 ? '...' : '')}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex space-x-4">
              <textarea
                className="flex-1 p-3 bg-white border border-gray-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Type your message..."
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-lg shadow-blue-200"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
