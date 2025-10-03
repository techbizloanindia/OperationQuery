'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaArrowLeft, FaSync, FaSearch, FaClock, FaUser, FaComments, FaPaperPlane, FaBell, FaWifi, FaPlay, FaPauseCircle, FaHistory } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import ChatDisplay from '@/components/shared/ChatDisplay';
import { formatTATDisplay } from '@/lib/tatUtils';

// Real-time TAT Display Component for Credit Enhanced
const RealTimeTATDisplay: React.FC<{ submittedAt: string | Date; tatHours?: number }> = ({ 
  submittedAt, 
  tatHours = 24 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update every minute for real-time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Calculate TAT in real-time
  const tatDisplay = formatTATDisplay(submittedAt, tatHours);
  
  return (
    <span className={tatDisplay.className} title={`TAT: ${tatHours} hours | Status: ${tatDisplay.status}`}>
      {tatDisplay.display}
      {tatDisplay.status === 'warning' && (
        <span className="ml-1 text-orange-500 animate-pulse">⚠️</span>
      )}
      {tatDisplay.status === 'overdue' && (
        <span className="ml-1 text-red-500 animate-bounce">🚨</span>
      )}
    </span>
  );
};

interface QueryMessage {
  id: string;
  text: string;
  timestamp?: string;
  sender?: string;
  senderRole?: string;
  status?: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'waiting for approval';
  queryNumber?: number;
}

interface Query {
  id: number;
  appNo: string;
  customerName: string;
  queries: QueryMessage[];
  sendTo: string[];
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'waiting for approval';
  branch: string;
  branchCode: string;
  employeeId?: string;
  markedForTeam?: string;
  title?: string;
  priority?: 'high' | 'medium' | 'low';
  tat?: string;
  queryId?: string;
  queryIndex?: number;
}

interface ChatMessage {
  id: string;
  queryId: number;
  message: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  team?: string;
  responseText?: string;
  isSystemMessage?: boolean;
  actionType?: string;
  isQuery?: boolean;
  isReply?: boolean;
}

// View types for the interface
type ViewType = 'applications' | 'queries' | 'chat';

// Fetch queries function
const fetchQueries = async (): Promise<Query[]> => {
  try {
    const response = await fetch('/api/queries?status=pending&team=credit&includeBoth=true');
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to fetch queries');
    }
    
    // Filter queries marked for credit team or both teams
    const filteredQueries = result.data.filter((queryData: any) => {
      return queryData.markedForTeam === 'credit' || 
             queryData.markedForTeam === 'both' ||
             queryData.sendTo?.includes('Credit');
    });
    
    // Convert the API response to the format expected by the component
    const queries = filteredQueries.map((queryData: any) => ({
      id: queryData.id,
      appNo: queryData.appNo,
      customerName: queryData.customerName,
      title: queryData.queries[0]?.text || `Query ${queryData.id}`,
      queries: queryData.queries.map((q: any, index: number) => ({
        id: q.id,
        text: q.text,
        timestamp: q.timestamp || queryData.submittedAt,
        sender: q.sender || queryData.submittedBy,
        status: q.status || 'pending',
        queryNumber: q.queryNumber || (index + 1),
        sentTo: q.sentTo || queryData.sendTo || [],
        tat: q.tat || queryData.tat || '24 hours'
      })),
      sendTo: queryData.sendTo,
      submittedBy: queryData.submittedBy,
      submittedAt: queryData.submittedAt,
      status: queryData.status,
      branch: queryData.branch,
      branchCode: queryData.branchCode,
      markedForTeam: queryData.markedForTeam,
      tat: '24 hours',
      priority: 'medium'
    }));
    
    return queries;
  } catch (error) {
    console.error('Error fetching credit queries:', error);
    throw error;
  }
};

export default function CreditQueriesRaisedEnhanced() {
  // View state management
  const [currentView, setCurrentView] = useState<ViewType>('applications');
  const [selectedAppNo, setSelectedAppNo] = useState<string>('');
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [appQueries, setAppQueries] = useState<Array<Query & { queryIndex: number; queryText: string; queryId: string }>>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Real-time state
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newQueryCount, setNewQueryCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');
  
  // Chat functionality
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedQueryForChat, setSelectedQueryForChat] = useState<Query & { queryIndex: number; queryText: string; queryId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Fetch queries with real-time updates
  const { data: queries, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['creditQueries', 'pending'],
    queryFn: async () => {
      setConnectionStatus('connecting');
      try {
        console.log('🔍 Credit Dashboard: Fetching queries from API...');
        const result = await fetchQueries();
        console.log(`🔍 Credit Dashboard: Received ${result.length} queries from API`);
        setConnectionStatus('connected');
        setLastUpdated(new Date());
        return result;
      } catch (error) {
        console.error('🔍 Credit Dashboard: Error fetching queries:', error);
        setConnectionStatus('disconnected');
        throw error;
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 10000,
    refetchInterval: autoRefresh ? 15000 : false,
    refetchIntervalInBackground: true,
  });

  // Listen for query events for immediate updates
  useEffect(() => {
    const handleQueryAdded = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔔 Credit Dashboard: New query added event detected!', customEvent?.detail);
      setNewQueryCount(prev => prev + 1);
      showSuccessMessage('New query added! Refreshing data... 🔔');
      refetch();
    };

    const handleQueryUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 Credit Dashboard: Query updated event detected!', customEvent?.detail);
      showSuccessMessage('Query updated! Refreshing data... ✅');
      refetch();
    };

    // Add event listeners
    console.log('📡 Credit Dashboard: Setting up event listeners...');
    window.addEventListener('queryAdded', handleQueryAdded);
    window.addEventListener('queryUpdated', handleQueryUpdated);
    window.addEventListener('queryResolved', handleQueryUpdated);

    // Subscribe to real-time updates from queryUpdateService
    import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
      const unsubscribe = queryUpdateService.subscribe('credit', (update) => {
        console.log('📨 Credit Dashboard received real-time update:', update.appNo, update.action);
        
        // Handle different types of updates
        if (update.action === 'created' && (update.markedForTeam === 'credit' || update.markedForTeam === 'both')) {
          setNewQueryCount(prev => prev + 1);
          showSuccessMessage(`New query added for ${update.appNo}! 🔔`);
          refetch();
        } else if (update.action === 'message_added') {
          console.log(`💬 New message received for query ${update.appNo}`);
          showSuccessMessage(`New message for ${update.appNo}! 💬`);
          
          if (selectedQuery && selectedQuery.appNo === update.appNo && currentView === 'chat') {
            loadChatMessages(selectedQuery.id);
          }
          
          setNewQueryCount(prev => prev + 1);
        } else if (update.action === 'updated') {
          refetch();
        }
        
        setLastUpdated(new Date());
      });
      
      console.log('🌐 Credit Dashboard: Subscribed to real-time query updates');
      
      return unsubscribe;
    });

    return () => {
      console.log('🧹 Credit Dashboard: Cleaning up event listeners...');
      window.removeEventListener('queryAdded', handleQueryAdded);
      window.removeEventListener('queryUpdated', handleQueryUpdated);
      window.removeEventListener('queryResolved', handleQueryUpdated);
    };
  }, [refetch, selectedQuery, currentView]);

  // Extract individual queries for display
  const individualQueries = React.useMemo(() => {
    if (!queries || queries.length === 0) return [];
    
    const individual: Array<Query & { queryIndex: number; queryText: string; queryId: string }> = [];
    
    queries.forEach(queryGroup => {
      queryGroup.queries.forEach((query, index) => {
        const queryStatus = query.status || queryGroup.status;
        const isResolved = ['request-approved', 'request-deferral', 'request-otc', 'approved', 'resolved', 'deferred', 'otc'].includes(queryStatus);
        
        if (!isResolved) {
          individual.push({
            ...queryGroup,
            queryIndex: (query as any).queryNumber || (index + 1),
            queryText: query.text,
            queryId: query.id || `${queryGroup.id}-${index}`,
            id: parseInt(query.id?.split('-')[0] || queryGroup.id.toString()) + index,
            title: `Query ${(query as any).queryNumber || (index + 1)} - ${queryGroup.appNo}`,
            status: queryStatus
          });
        }
      });
    });
    
    return individual;
  }, [queries]);

  // Group individual queries by application number
  const groupedQueries = React.useMemo(() => {
    const grouped = new Map();
    individualQueries.forEach(query => {
      if (!grouped.has(query.appNo)) {
        grouped.set(query.appNo, []);
      }
      grouped.get(query.appNo).push(query);
    });
    return grouped;
  }, [individualQueries]);

  // Filter applications based on search
  const filteredApplications = React.useMemo(() => {
    if (!queries || queries.length === 0) return [];
    
    const applications = Array.from(groupedQueries.keys());
    if (!searchTerm) return applications;
    
    return applications.filter(appNo => 
      appNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groupedQueries, searchTerm, queries]);

  // Handle navigation
  const handleSelectApplication = async (appNo: string) => {
    setSelectedAppNo(appNo);
    setCurrentView('queries');
    
    const appQueriesFiltered = individualQueries.filter(query => query.appNo === appNo);
    setAppQueries(appQueriesFiltered);
    
    setNewQueryCount(0);
  };

  const handleSelectQuery = (query: Query) => {
    setSelectedQuery(query);
    setCurrentView('chat');
    loadChatMessages(query.id);
  };

  const handleBackToApplications = () => {
    setCurrentView('applications');
    setSelectedAppNo('');
    setAppQueries([]);
  };

  const handleBackToQueries = () => {
    setCurrentView('queries');
    setSelectedQuery(null);
    setChatMessages([]);
  };

  // Handle opening chat for a specific query
  const handleOpenChat = (query: Query & { queryIndex: number; queryText: string; queryId: string }) => {
    console.log(`🎯 Credit Dashboard: Opening chat for query:`, {
      queryId: query.queryId || query.id,
      id: query.id,
      appNo: query.appNo,
      customerName: query.customerName
    });
    setSelectedQueryForChat(query);
    setIsChatOpen(true);
  };

  const showSuccessMessage = (message = 'Success! The action was completed.') => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    showSuccessMessage(autoRefresh ? 'Auto-refresh disabled' : 'Auto-refresh enabled');
  };

  // Load chat messages
  const loadChatMessages = async (queryId: number) => {
    try {
      console.log(`🔄 Loading chat messages for query ${queryId}`);
      
      const response = await fetch(`/api/queries/${queryId}/chat`);
      const result = await response.json();
      
      if (result.success) {
        const messages = result.data || [];
        console.log(`📬 Loaded ${messages.length} messages for query ${queryId}`);
        
        // Transform messages to include proper flags for ChatDisplay
        const transformedMessages = messages.map((msg: any) => ({
          ...msg,
          isQuery: msg.team === 'Operations' || msg.senderRole === 'operations',
          isReply: msg.team === 'Credit' || msg.senderRole === 'credit'
        }));
        
        // Sort messages by timestamp
        transformedMessages.sort((a: { timestamp: string }, b: { timestamp: string }) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        setChatMessages(transformedMessages);
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        console.error('Failed to load chat messages:', result.error);
        showSuccessMessage('❌ Failed to load chat messages');
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
      showSuccessMessage('❌ Error loading chat messages');
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedQuery) return;

    try {
      const response = await fetch(`/api/queries/${selectedQuery.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          sender: user?.name || 'Credit Team',
          senderRole: 'credit',
          team: 'Credit'
        }),
      });

      if (response.ok) {
        setNewMessage('');
        loadChatMessages(selectedQuery.id);
        showSuccessMessage('Message sent! 📤');
      } else {
        const errorData = await response.json();
        showSuccessMessage(`❌ Error: Failed to send message. ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showSuccessMessage('❌ Error: Failed to send message. Please try again.');
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <FaWifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <FaSync className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <FaWifi className="h-4 w-4 text-red-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          <span className="text-gray-600">Loading credit queries...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p className="text-lg font-medium">Error Loading Queries</p>
          <p className="text-sm text-gray-600">{error?.message}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-green-600 hover:text-green-800 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white overflow-hidden shadow-xl rounded-lg max-w-6xl mx-auto">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50 transition-transform">
          {successMessage}
        </div>
      )}

      {/* View 1: Applications List */}
      {currentView === 'applications' && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-800">
                  Credit Query Applications
                  {newQueryCount > 0 && (
                    <span className="ml-2 animate-bounce bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      +{newQueryCount} NEW
                    </span>
                  )}
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                {getConnectionStatusIcon()}
                <span className="text-xs text-gray-500">
                  {connectionStatus}
                </span>
              </div>
            </div>
            
            {/* Real-time Controls */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-500">
                  Last updated: {formatLastUpdated()}
                </span>
                {isRefreshing && (
                  <span className="text-xs text-green-600 flex items-center">
                    <FaSync className="h-3 w-3 animate-spin mr-1" />
                    Refreshing...
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={toggleAutoRefresh}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    autoRefresh 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {autoRefresh ? (
                    <><FaPauseCircle className="inline h-3 w-3 mr-1" />Auto-refresh ON</>
                  ) : (
                    <><FaPlay className="inline h-3 w-3 mr-1" />Auto-refresh OFF</>
                  )}
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="mt-4 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black font-bold bg-white"
                style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
              />
            </div>
          </div>

          {/* Application List */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaComments className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No credit queries found</p>
                <p className="text-xs mt-2">Queries marked for Credit team will appear here</p>
              </div>
            ) : (
              filteredApplications.map((appNo) => {
                const queries = groupedQueries.get(appNo) || [];
                const activeQueries = queries.filter((q: Query) => q.status === 'pending').length;
                const totalQueries = queries.length;
                const firstQuery = queries[0];
            
                return (
                  <div 
                    key={appNo} 
                    onClick={() => handleSelectApplication(appNo)}
                    className="p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-400 transition-colors duration-200 relative shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h2 className="text-lg font-semibold text-gray-800">{appNo}</h2>
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                            {totalQueries} {totalQueries === 1 ? 'Query' : 'Queries'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          Customer: {firstQuery?.customerName || firstQuery?.appNo}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 text-xs">
                          {activeQueries > 0 && (
                            <span className="bg-orange-200 text-orange-900 px-3 py-1.5 rounded-full font-bold border border-orange-400 shadow-sm">
                              📋 {activeQueries} Pending
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-500">
                          Branch: {firstQuery?.branch || 'Unknown'}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                          activeQueries > 0 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {activeQueries > 0 ? '🔴 Active' : '🟢 Resolved'}
                        </span>
                        
                        <div className="text-xs text-gray-400 text-right">
                          Last: {queries[0] ? formatDate(queries[0].submittedAt) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      
      {/* View 2: Queries List */}
      {currentView === 'queries' && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={handleBackToApplications}
                className="p-2 rounded-full hover:bg-gray-200 mr-2"
              >
                <FaArrowLeft className="h-6 w-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Queries for {selectedAppNo}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>
                    {appQueries.length} {appQueries.length === 1 ? 'query' : 'queries'} found
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Query List */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {appQueries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No queries found for this application</p>
              </div>
            ) : (
              appQueries.map((query, index) => (
                <div key={`credit-query-${query.id}-${index}`} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div 
                    onClick={() => handleSelectQuery(query)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-gray-700 text-lg">
                          Query {query.queries?.[0]?.queryNumber || query.queryIndex || 1}
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          query.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {query.status === 'pending' ? 'Pending' : 'Resolved'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Query Details */}
                    <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                      <p className="text-gray-700 text-sm font-bold">
                        {query.queryText || 'No query text available'}
                      </p>
                    </div>
                    
                    {/* Query Info Grid with TAT */}
                    <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                      <div className="text-gray-500">
                        <span className="font-medium text-gray-700">Submitted:</span><br/>
                        <span className="text-gray-600">{query.submittedBy}</span>
                      </div>
                      <div className="text-gray-500">
                        <span className="font-medium text-gray-700">TAT:</span><br/>
                        <RealTimeTATDisplay submittedAt={query.submittedAt} />
                      </div>
                      <div className="text-gray-500">
                        <span className="font-medium text-gray-700">Date:</span><br/>
                        <span className="text-gray-600">{new Date(query.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* View 3: Chat/Remarks */}
      {currentView === 'chat' && selectedQuery && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={handleBackToQueries}
                className="p-2 rounded-full hover:bg-gray-200 mr-3"
              >
                <FaArrowLeft className="h-6 w-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Query Chat - {selectedQuery.appNo}
                </h1>
                <p className="text-sm text-gray-600">
                  Customer: {selectedQuery.customerName}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getConnectionStatusIcon()}
            </div>
          </div>
          
          {/* Use the new ChatDisplay component */}
          <div className="flex-1 overflow-hidden">
            <ChatDisplay 
              messages={chatMessages}
              title=""
              showTimestamp={true}
              className="h-full"
            />
          </div>
          
          {/* Message Input */}
          <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Type your response..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black font-bold"
                style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Send</span>
                <FaPaperPlane className="h-4 w-4 ml-0 sm:ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
