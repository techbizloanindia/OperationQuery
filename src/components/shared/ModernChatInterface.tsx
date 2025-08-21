'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Phone,
  Video,
  MoreHorizontal,
  Paperclip,
  Smile,
  ArrowDown,
  Check,
  CheckCheck,
  User,
  Bot
} from 'lucide-react';
import { realTimeService } from '@/lib/realTimeService';

interface ChatMessage {
  id: string;
  queryId: string;
  message: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  team?: string;
  isBot?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface ModernChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  queryId: string;
  queryTitle: string;
  customerName: string;
  currentUser: {
    name: string;
    role: string;
    team: string;
    avatar?: string;
  };
}

const botResponses = [
  "Thank you for reaching out. I'm reviewing your query and will get back to you shortly.",
  "I understand your concern. Let me check the details and provide you with an update.",
  "Your request has been received. I'm processing this information now.",
  "I appreciate your patience. Let me gather the necessary information for you.",
  "Thank you for the additional details. This helps me better understand your situation.",
  "I'm looking into this matter right away. I'll have an answer for you soon.",
  "Your query is important to us. I'm working on finding the best solution.",
  "I've noted your request. Let me coordinate with the relevant team for a resolution.",
];

export default function ModernChatInterface({
  isOpen,
  onClose,
  queryId,
  queryTitle,
  customerName,
  currentUser
}: ModernChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    });
  };

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
      setShowScrollButton(!isAtBottom);
    }
  };

  useEffect(() => {
    if (isOpen && queryId && queryId !== 'undefined' && queryId !== 'NaN') {
      // Clear previous messages when switching to a different query
      setMessages([]);
      fetchMessages();
      startRealtimeService();
      scrollToBottom(false);
    } else {
      stopRealtimeService();
      setMessages([]); // Clear messages when closing
    }

    return () => {
      stopRealtimeService();
    };
  }, [isOpen, queryId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      // Validate queryId before making API call
      if (!queryId || queryId === 'undefined' || queryId === 'NaN') {
        console.warn('Invalid queryId provided:', queryId);
        setMessages([]);
        return;
      }

      const response = await fetch(`/api/queries/${queryId}/chat`);
      const result = await response.json();
      
      if (result.success) {
        setMessages(result.data || []);
      } else {
        console.error('Failed to fetch messages:', result.error);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const startRealtimeService = () => {
    // Subscribe to real-time updates
    unsubscribeRef.current = realTimeService.subscribe(queryId, (newMessage) => {
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some(msg => 
          msg.id === newMessage.id || 
          (msg.message === newMessage.message && 
           msg.sender === newMessage.sender && 
           Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 1000)
        );
        if (!exists) {
          return [...prev, newMessage];
        }
        return prev;
      });
    });
    
    // Also poll as fallback
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 10000); // Less frequent polling since we have real-time updates
  };

  const stopRealtimeService = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // Validate queryId before sending
    if (!queryId || queryId === 'undefined' || queryId === 'NaN') {
      console.error('Cannot send message: Invalid queryId:', queryId);
      alert('Error: Invalid query ID. Please refresh and try again.');
      return;
    }

    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      queryId,
      message: newMessage.trim(),
      sender: currentUser.name,
      senderRole: currentUser.role,
      timestamp: new Date().toISOString(),
      team: currentUser.team,
      status: 'sending'
    };

    setMessages(prev => [...prev, tempMessage]);
    const messageToSend = newMessage.trim();
    setNewMessage('');

    try {
      const response = await fetch(`/api/queries/${queryId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          sender: currentUser.name,
          senderRole: currentUser.role,
          team: currentUser.team
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Update message status
        const sentMessage = {
          ...tempMessage,
          id: result.data.id,
          status: 'delivered' as const
        };
        
        setMessages(prev => prev.map(msg =>
          msg.id === tempMessage.id ? sentMessage : msg
        ));

        // Broadcast to real-time service
        realTimeService.broadcastMessage(queryId, sentMessage);

        // Simulate bot response
        simulateBotResponse();
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Update message status to show error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      alert('Failed to send message. Please try again.');
    }
  };

  const simulateBotResponse = () => {
    setBotTyping(true);
    
    setTimeout(() => {
      setBotTyping(false);
      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
      
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        queryId,
        message: randomResponse,
        sender: 'Operations Assistant',
        senderRole: 'bot',
        timestamp: new Date().toISOString(),
        team: 'operations',
        isBot: true,
        status: 'delivered'
      };

      setMessages(prev => [...prev, botMessage]);
    }, 2000 + Math.random() * 2000); // Random delay between 2-4 seconds
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Glassmorphism backdrop */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-500/20 to-pink-500/20 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Chat container */}
      <div className="relative w-full max-w-lg h-[90vh] bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Chat header */}
        <div className="bg-gradient-to-r from-blue-500/90 to-purple-600/90 backdrop-blur-sm p-6 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {customerName.charAt(0).toUpperCase()}
                </div>
                {isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm" />
                )}
              </div>
              
              {/* User info */}
              <div className="text-white">
                <h3 className="font-semibold text-lg">{customerName}</h3>
                <p className="text-blue-100 text-sm">{queryTitle}</p>
                <p className="text-blue-200 text-xs">
                  {isOnline ? 'Online' : 'Last seen recently'}
                </p>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                <Phone className="w-5 h-5 text-white" />
              </button>
              <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                <Video className="w-5 h-5 text-white" />
              </button>
              <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                <MoreHorizontal className="w-5 h-5 text-white" />
              </button>
              <button 
                onClick={onClose}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages container */}
        <div className="flex-1 flex flex-col h-full">
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            onScroll={handleScroll}
            style={{ height: 'calc(100vh - 200px)' }}
          >
            {messages.map((message, index) => {
              const isCurrentUser = message.sender === currentUser.name;
              const isBot = message.isBot || message.senderRole === 'bot';
              const showAvatar = !isCurrentUser && (!messages[index - 1] || messages[index - 1].sender !== message.sender);
              
              return (
                <div
                  key={message.id}
                  className={`flex items-end space-x-2 animate-fadeIn ${
                    isCurrentUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Avatar for received messages */}
                  {!isCurrentUser && (
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${showAvatar ? 'visible' : 'invisible'}`}>
                      {isBot ? (
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-md">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md ${
                          message.senderRole === 'sales' 
                            ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                            : message.senderRole === 'credit' 
                            ? 'bg-gradient-to-br from-blue-400 to-indigo-500'
                            : message.senderRole === 'operations'
                            ? 'bg-gradient-to-br from-purple-400 to-pink-500'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          {message.sender.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Message bubble */}
                  <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-lg ${
                        isCurrentUser
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-md'
                          : isBot
                          ? 'bg-gradient-to-r from-green-400/90 to-blue-500/90 text-white rounded-bl-md backdrop-blur-sm'
                          : 'bg-white/80 text-gray-800 rounded-bl-md backdrop-blur-sm border border-white/20'
                      }`}
                    >
                      {!isCurrentUser && !isBot && (
                        <p className="text-xs font-medium mb-1 text-gray-600">
                          {message.sender} • {message.senderRole} • {message.team || message.senderRole}
                        </p>
                      )}
                      {isBot && (
                        <p className="text-xs font-medium mb-1 text-blue-100">
                          Operations Assistant
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      
                      {/* Time and status */}
                      <div className={`flex items-center justify-end mt-1 space-x-1 ${
                        isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">{formatTime(message.timestamp)}</span>
                        {isCurrentUser && getStatusIcon(message.status)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {botTyping && (
              <div className="flex items-end space-x-2 animate-fadeIn">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl rounded-bl-md px-4 py-3 shadow-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={() => scrollToBottom()}
              className="absolute bottom-20 right-6 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 z-10"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          )}

          {/* Input area */}
          <div className="p-4 bg-white/50 backdrop-blur-sm border-t border-white/20">
            <div className="flex items-end space-x-3">
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none max-h-32 text-gray-800 placeholder-gray-500"
                  rows={1}
                  style={{ minHeight: '48px' }}
                />
              </div>
              
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                <Smile className="w-5 h-5" />
              </button>
              
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-full transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send • Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add custom animations to global CSS
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('modern-chat-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'modern-chat-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}