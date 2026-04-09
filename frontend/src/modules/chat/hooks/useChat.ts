import { useState, useRef, useEffect } from 'react';
import { ChatApi } from '../api/chat.api';
import { ChatMessage } from '../types';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string, typeId?: string) => {
    if (!text.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    setMessages(prev => [...prev, { role: 'bot', text: '' }]);

    await ChatApi.sendMessage({ user_input: text, type_id: typeId }, (fullText) => {
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

  return { messages, loading, sendMessage, clearChat, messagesEndRef };
};
