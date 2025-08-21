'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  User,
  Clock,
  Building,
  FileText,
  Send,
  ChevronDown
} from 'lucide-react';

interface ChatMessage {
  id: string;
  queryId: string;
  message: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  team?: string;
  isSystemMessage?: boolean;
  actionType?: string;
  metadata?: any;
}

interface QueryDetails {
  id: string;
  appNo: string;
  title: string;
  customerName: string;
  branch: string;
  status: string;
  priority: string;
  submittedBy: string;
  submittedAt: string;
  team: string;
  remarks?: Array<{
    id: string;
    text: string;
    author: string;
    authorRole: string;
    authorTeam: string;
    timestamp: string;
  }>;
  messages?: Array<{
    sender: string;
    text: string;
    timestamp: string;
    isSent: boolean;
  }>;
}

interface QueryChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
}

const QueryChatModal: React.FC<QueryChatModalProps> = ({
  isOpen,
  onClose,
  requestId
}) => {
  const [query, setQuery] = useState<QueryDetails | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch query details and chat history
  useEffect(() => {
    if (isOpen && requestId) {
      fetchQueryData();
    }
  }, [isOpen, requestId]);

  const fetchQueryData = async () => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      // Extract queryId from requestId if it's in BIZLN format
      let queryId = requestId;
      if (requestId.startsWith('BIZLN')) {
        // Try to find the actual query using the approval request
        const approvalResponse = await fetch('/api/approvals');
        const approvalResult = await approvalResponse.json();
        
        if (approvalResult.success && approvalResult.data?.approvals) {
          const approval = approvalResult.data.approvals.find((a: any) => a.requestId === requestId);
          if (approval?.queryId) {
            queryId = approval.queryId;
          }
        }
      }

      // Fetch query details
      const queryResponse = await fetch(`/api/queries?id=${queryId}`);
      const queryResult = await queryResponse.json();

      if (queryResult.success && queryResult.data?.[0]) {
        const queryData = queryResult.data[0];
        setQuery(queryData);

        // Fetch ALL chat messages from all teams (Sales, Credit, Operations)
        console.log(`🔍 Fetching ALL chat messages for query ID: ${queryId}`);
        const messagesResponse = await fetch(`/api/messages?queryId=${queryId}&includeAll=true`);
        const messagesResult = await messagesResponse.json();

        if (messagesResult.success && messagesResult.data) {
          console.log(`📨 Loaded ${messagesResult.data.length} messages from all teams`);
          setChatHistory(messagesResult.data);
        } else {
          console.warn('No chat messages found for query:', queryId);
          setChatHistory([]);
        }
      }
    } catch (error) {
      console.error('Error fetching query data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom when chat updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const getMessageDisplayData = () => {
    const allMessages: any[] = [];

    // Add remarks as messages
    if (query?.remarks) {
      query.remarks.forEach((remark) => {
        allMessages.push({
          id: remark.id,
          message: remark.text,
          sender: remark.author,
          senderRole: remark.authorRole,
          team: remark.authorTeam,
          timestamp: remark.timestamp,
          type: 'remark'
        });
      });
    }

    // Add regular messages
    if (query?.messages) {
      query.messages.forEach((msg, index) => {
        allMessages.push({
          id: `msg-${index}`,
          message: msg.text,
          sender: msg.sender,
          senderRole: 'Team Member',
          team: query.team,
          timestamp: msg.timestamp,
          type: 'message'
        });
      });
    }

      // Add ALL chat history messages from all teams (Sales, Credit, Operations)
    chatHistory.forEach((chat) => {
      const teamName = chat.team?.toLowerCase() || chat.senderRole?.toLowerCase() || 'operations';
      const displayTeam = 
        teamName.includes('sales') ? 'Sales' :
        teamName.includes('credit') ? 'Credit' :
        teamName.includes('approval') ? 'Approval' :
        'Operations';
        
      allMessages.push({
        id: chat.id || `chat-${Date.now()}-${Math.random()}`,
        message: chat.message,
        sender: chat.sender,
        senderRole: chat.senderRole || chat.team,
        team: displayTeam,
        timestamp: chat.timestamp,
        type: 'chat',
        source: 'Team Chat',
        isSystemMessage: false
      });
    });

    // Remove duplicates based on content, sender, and timestamp (within 5 seconds)
    const uniqueMessages = allMessages.filter((msg, index, self) => {
      return index === self.findIndex(m => 
        m.message === msg.message && 
        m.sender === msg.sender &&
        Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 5000
      );
    });

    // Sort by timestamp (chronological order)
    uniqueMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log(`💬 Displaying ${uniqueMessages.length} total messages from all teams`);
    return showAllMessages ? uniqueMessages : uniqueMessages.slice(-20); // Show more messages by default
  };

  const getTeamColor = (team?: string) => {
    const teamLower = team?.toLowerCase() || '';
    const colors = {
      'sales': 'bg-blue-100 text-blue-800 border-blue-200',
      'credit': 'bg-green-100 text-green-800 border-green-200',
      'operations': 'bg-purple-100 text-purple-800 border-purple-200',
      'approval': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    
    if (teamLower.includes('sales')) return colors.sales;
    if (teamLower.includes('credit')) return colors.credit;
    if (teamLower.includes('approval')) return colors.approval;
    if (teamLower.includes('operations') || teamLower.includes('operation')) return colors.operations;
    
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Query Details & Chat History</h2>
                <p className="text-blue-100 text-sm">Request ID: {requestId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading query details...</p>
          </div>
        ) : query ? (
          <div className="flex h-[calc(90vh-120px)]">
            {/* Query Details Sidebar */}
            <div className="w-1/3 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">{query.title}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Application No</label>
                  <p className="text-sm text-gray-900 mt-1">{query.appNo}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Customer</label>
                  <div className="flex items-center mt-1">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{query.customerName}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Branch</label>
                  <div className="flex items-center mt-1">
                    <Building className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{query.branch}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                    query.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    query.status === 'approved' ? 'bg-green-100 text-green-800' :
                    query.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {query.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Priority</label>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                    query.priority === 'high' ? 'bg-red-100 text-red-800' :
                    query.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {query.priority.toUpperCase()}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted By</label>
                  <p className="text-sm text-gray-900 mt-1">{query.submittedBy}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted At</label>
                  <div className="flex items-center mt-1">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">{formatTimestamp(query.submittedAt)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Team</label>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${getTeamColor(query.team)}`}>
                    {query.team.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Chat History</h3>
                  {getMessageDisplayData().length > 15 && (
                    <button
                      onClick={() => setShowAllMessages(!showAllMessages)}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${showAllMessages ? 'rotate-180' : ''}`} />
                      {showAllMessages ? 'Show Less' : 'Show All Messages'}
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  📋 Complete conversation history from ALL teams: <span className="font-medium text-blue-600">Sales</span>, <span className="font-medium text-green-600">Credit</span>, <span className="font-medium text-purple-600">Operations</span>, and <span className="font-medium text-orange-600">Approval</span>
                </p>
              </div>

              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
              >
                {getMessageDisplayData().map((message, index) => (
                  <div key={`${message.id}-${index}`} className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${getTeamColor(message.team)}`}>
                        {message.sender.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{message.sender}</p>
                        {message.team && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getTeamColor(message.team)}`}>
                            {message.team.toUpperCase()}
                          </span>
                        )}
                        {message.senderRole && message.senderRole !== message.team && (
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-xs">
                            {message.senderRole}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
                        {message.source && (
                          <span className="text-xs text-gray-400 italic">({message.source})</span>
                        )}
                      </div>
                      <div className={`p-3 rounded-lg ${
                        message.isSystemMessage 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-white border border-gray-200'
                      }`}>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.message}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {getMessageDisplayData().length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No chat history available for this query.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Query details not found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryChatModal;