'use client';

import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaSync, FaSearch, FaClock, FaUser, FaComments, FaBell, FaWifi, FaPlay, FaPause, FaReply } from 'react-icons/fa';
import { queryUpdateService } from '@/lib/queryUpdateService';
import QueryReplyModal from '@/components/shared/QueryReplyModal';
import ModernChatInterface from '@/components/shared/ModernChatInterface';
import { useAuth } from '@/contexts/AuthContext';

interface QueryMessage {
  id: string;
  text: string;
  timestamp?: string;
  sender?: string;
  senderRole?: string;
  status?: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'pending-approval';
}

interface Query {
  id: number;
  appNo: string;
  customerName: string;
  queries: QueryMessage[];
  sendTo: string[];
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'pending-approval';
  branch: string;
  branchCode: string;
  markedForTeam?: string;
  title?: string;
  priority?: 'high' | 'medium' | 'low';
  tat?: string;
  queryId?: string;
  queryIndex?: number;
  queryText?: string;
}

// View types for the interface
type ViewType = 'applications' | 'queries';

// Fetch queries function
const fetchQueries = async (): Promise<Query[]> => {
  try {
    const response = await fetch('/api/queries?team=sales&status=all&includeBoth=true');
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to fetch queries');
    }

    // Convert the API response to the format expected by the component
    const queries = result.data
      .filter((queryData: any) => {
        if (!queryData || typeof queryData !== 'object') {
          console.warn('Invalid query data:', queryData);
          return false;
        }
        // Show all queries for sales team including those marked for 'both' teams
        return queryData.markedForTeam === 'sales' || 
               queryData.markedForTeam === 'both' || 
               queryData.team === 'sales';
      })
      .map((queryData: any, index: number) => {
        try {
          const queryMessages = queryData.queries || [{
            id: queryData.id || `query-${index}`,
            text: queryData.title || 'Query',
            timestamp: queryData.createdAt,
            sender: queryData.submittedBy || 'Operations User',
            status: queryData.status
          }];

          return {
            id: typeof queryData.id === 'string' 
              ? parseInt(queryData.id.split('-')[0].replace(/[^0-9]/g, '')) || Math.floor(Math.random() * 10000)
              : typeof queryData.id === 'number' 
                ? queryData.id 
                : Math.floor(Math.random() * 10000),
            appNo: queryData.appNo,
            customerName: queryData.customerName || 'Unknown Customer',
            title: queryData.title || queryMessages[0]?.text?.slice(0, 50) + '...' || `Query ${queryData.id || 'Unknown'}`,
            queries: queryMessages.map((q: any) => ({
              id: q.id,
              text: q.text,
              timestamp: q.timestamp || queryData.createdAt,
              sender: q.sender || queryData.submittedBy || 'Operations User',
              status: q.status || queryData.status
            })),
            sendTo: queryData.sendTo || [queryData.team],
            submittedBy: queryData.submittedBy || 'Operations User',
            submittedAt: queryData.createdAt,
            status: queryData.status,
            branch: queryData.branch || 'Unknown Branch',
            branchCode: queryData.branchCode || 'UNK',
            markedForTeam: queryData.markedForTeam || queryData.team,
            tat: queryData.tat || '24 hours',
            priority: queryData.priority || 'medium'
          };
        } catch (mapError) {
          console.error('Error processing query data:', mapError, queryData);
          return {
            id: Math.floor(Math.random() * 10000),
            appNo: queryData?.appNo || `APP-${index}`,
            customerName: 'Unknown Customer',
            title: 'Error Loading Query',
            queries: [],
            sendTo: ['sales'],
            submittedBy: 'System',
            submittedAt: new Date().toISOString(),
            status: 'pending' as const,
            branch: 'Unknown Branch',
            branchCode: 'UNK',
            markedForTeam: 'sales',
            tat: '24 hours',
            priority: 'medium' as const
          };
        }
      });
    
    console.log('📋 Sales: Fetched queries:', queries);
    return queries;
  } catch (error) {
    console.error('Error fetching sales queries:', error);
    throw error;
  }
};

export default function SalesQueriesRaised() {
  // View state management
  const [currentView, setCurrentView] = useState<ViewType>('applications');
  const [selectedAppNo, setSelectedAppNo] = useState<string>('');
  const [appQueries, setAppQueries] = useState<Array<Query & { queryIndex: number; queryText: string; queryId: string }>>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [queries, setQueries] = useState<Query[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Real-time state
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'polling' | 'disconnected'>('disconnected');
  
  // Chat functionality
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedQueryForChat, setSelectedQueryForChat] = useState<Query & { queryIndex: number; queryText: string; queryId: string } | null>(null);
  
  // Reply modal state
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedQueryForReply, setSelectedQueryForReply] = useState<Query & { queryIndex: number; queryText: string; queryId: string } | null>(null);

  // Get current user from auth context
  const { user } = useAuth();
  const currentUser = {
    name: 'Sales User',
    role: 'Sales Executive',
    team: 'sales'
  };

  // Fetch queries function
  const refetch = async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchQueries();
      setQueries(result);
      setIsError(false);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setIsError(true);
      setError(err as Error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  // Initial load and real-time updates
  useEffect(() => {
    refetch();
    
    // Subscribe to real-time query updates
    const unsubscribe = queryUpdateService.subscribe('sales', (update) => {
      console.log('📊 Sales: Received query update:', {
        appNo: update.appNo,
        action: update.action,
        team: update.team,
        markedForTeam: update.markedForTeam,
        status: update.status
      });
      
      // Check if this query is relevant to sales team
      const isRelevantToSales = 
        update.markedForTeam === 'sales' || 
        update.markedForTeam === 'both' || 
        update.team === 'sales';
        
      if (isRelevantToSales) {
        console.log(`✅ Sales: Processing relevant update for ${update.appNo}`);
        
        // Refresh queries to show the new/updated query
        refetch();
        
        // Show notification for new queries
        if (update.action === 'created') {
          console.log(`🆕 New query assigned to Sales: ${update.appNo}`);
        } else if (update.action === 'resolved') {
          console.log(`✅ Query resolved for Sales: ${update.appNo}`);
        }
      } else {
        console.log(`⏭️ Sales: Skipping irrelevant update for ${update.appNo} (team: ${update.team}, marked: ${update.markedForTeam})`);
      }
    });
    
    // Monitor connection status
    const statusInterval = setInterval(() => {
      const newStatus = queryUpdateService.getConnectionStatus();
      if (newStatus !== connectionStatus) {
        setConnectionStatus(newStatus);
        console.log(`🔄 Sales: Connection status changed to: ${newStatus}`);
      }
    }, 3000);
    
    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    
    if (autoRefresh && currentView === 'applications') {
      refreshInterval = setInterval(async () => {
        await refetch();
      }, 15000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, currentView]);

  // Extract individual queries for display
  const individualQueries = React.useMemo(() => {
    if (!queries || queries.length === 0) return [];
    
    const individual: Array<Query & { queryIndex: number; queryText: string; queryId: string }> = [];
    
    queries.forEach(queryGroup => {
      queryGroup.queries.forEach((query, index) => {
        individual.push({
          ...queryGroup,
          queryIndex: index + 1,
          queryText: query.text,
          queryId: query.id,
          id: parseInt(query.id.split('-')[0]) + index,
          title: `Query ${index + 1} - ${queryGroup.appNo}`,
          status: query.status || queryGroup.status
        });
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
  };

  const handleBackToApplications = () => {
    setCurrentView('applications');
    setSelectedAppNo('');
    setAppQueries([]);
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Handle closing reply modal
  const handleCloseReplyModal = () => {
    setReplyModalOpen(false);
    setSelectedQueryForReply(null);
  };

  // Handle opening chat for a specific query
  const handleOpenChat = (query: Query & { queryIndex: number; queryText: string; queryId: string }) => {
    setSelectedQueryForChat(query);
    setIsChatOpen(true);
  };

  // Handle reply to a specific query
  const handleReplyToQuery = (query: Query & { queryIndex: number; queryText: string; queryId: string }) => {
    setSelectedQueryForReply(query);
    setReplyModalOpen(true);
  };  

  // Format functions
  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <FaWifi className="h-4 w-4 text-green-500" />;
      case 'polling':
        return <FaSync className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <FaWifi className="h-4 w-4 text-red-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading queries...</span>
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
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white overflow-hidden shadow-xl rounded-lg max-w-6xl mx-auto">
      
      {/* View 1: Applications List */}
      {currentView === 'applications' && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-800">Sales - Query Raised Applications</h1>
              <div className="flex items-center space-x-2">
                {getConnectionStatusIcon()}
                <span className="text-xs text-gray-500">
                  {connectionStatus === 'connected' ? '🟢 Real-time' : 
                   connectionStatus === 'polling' ? '🟡 Polling' : '🔴 Offline'}
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
                  <span className="text-xs text-blue-600 flex items-center">
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
                    <><FaPause className="inline h-3 w-3 mr-1" />Auto-refresh ON</>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black font-bold bg-white"
                style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
              />
            </div>
          </div>

          {/* Summary Stats */}
          {filteredApplications.length > 0 && (
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-800">
                    {individualQueries.length}
                  </div>
                  <div className="text-xs text-gray-600">Total Queries</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-600">
                    {individualQueries.filter((q: Query) => q.status === 'pending').length}
                  </div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {individualQueries.filter((q: Query) => q.status === 'resolved').length}
                  </div>
                  <div className="text-xs text-gray-600">Resolved</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {filteredApplications.length}
                  </div>
                  <div className="text-xs text-gray-600">Applications</div>
                </div>
              </div>
            </div>
          )}

          {/* Application List */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaComments className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No applications with queries found</p>
                <p className="text-xs mt-2">Queries will appear here once assigned to Sales team</p>
              </div>
            ) : (
              filteredApplications.map((appNo) => {
                const queries = groupedQueries.get(appNo) || [];
                const activeQueries = queries.filter((q: Query) => q.status === 'pending').length;
                const resolvedQueries = queries.filter((q: Query) => q.status === 'resolved').length;
                const totalQueries = queries.length;
                const firstQuery = queries[0];
            
                return (
                  <div 
                    key={appNo} 
                    onClick={() => handleSelectApplication(appNo)}
                    className="p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors duration-200 relative shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h2 className="text-lg font-semibold text-gray-800">{appNo}</h2>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                            {totalQueries} {totalQueries === 1 ? 'Query' : 'Queries'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          Customer: {firstQuery?.customerName || 'Unknown Customer'}
                        </p>
                        
                        {/* Query Status Summary */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {activeQueries > 0 && (
                            <span className="bg-orange-200 text-orange-900 px-3 py-1.5 rounded-full font-bold border border-orange-400 shadow-sm">
                              📋 {activeQueries} Pending
                            </span>
                          )}
                          {resolvedQueries > 0 && (
                            <span className="bg-green-200 text-green-900 px-3 py-1.5 rounded-full font-bold border border-green-400 shadow-sm">
                              ✅ {resolvedQueries} Resolved
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-500">
                          Branch: {firstQuery?.branch || 'Unknown Branch'}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                          activeQueries > 0 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {activeQueries > 0 ? '🔴 Active' : '🟢 All Resolved'}
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
                  Sales Queries for {selectedAppNo}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>
                    {appQueries.length} {appQueries.length === 1 ? 'query' : 'queries'} found
                  </span>
                  <span className="text-xs">
                    Updated: {formatLastUpdated()}
                  </span>
                  {isRefreshing && (
                    <span className="text-blue-600 flex items-center">
                      <FaSync className="h-3 w-3 animate-spin mr-1" />
                      Refreshing...
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getConnectionStatusIcon()}
              <button
                onClick={() => handleSelectApplication(selectedAppNo)}
                disabled={isRefreshing}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <FaSync className={`h-4 w-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
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
                <div key={`sales-${query.queryId || `${query.appNo}-${index}`}-${index}`} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-gray-700 text-lg">
                        Query {query.queryIndex} - {query.appNo}
                      </span>
                      <span className="text-gray-400">–</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        query.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                        query.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {query.status.charAt(0).toUpperCase() + query.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        From: Operations
                      </span>
                    </div>
                  </div>
                  
                  <h2 className="text-md font-semibold text-gray-800 mb-2">
                    {query.queryText || 'No query text available'}
                  </h2>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Submitted: {formatDate(query.submittedAt)}</span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      TAT: {query.tat || '24 hours'}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Customer:</span> {query.customerName}
                      <span className="ml-4 font-medium">Branch:</span> {query.branch}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChat(query);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FaComments />
                        Chat
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplyToQuery(query);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FaReply />
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {selectedQueryForReply && (
        <QueryReplyModal
          queryId={selectedQueryForReply.queryId}
          appNo={selectedQueryForReply.appNo}
          customerName={selectedQueryForReply.customerName}
          isOpen={replyModalOpen}
          onClose={handleCloseReplyModal}
          team="Sales"
          markedForTeam={selectedQueryForReply.markedForTeam}
          allowMessaging={true}
        />
      )}

      {/* Chat Interface */}
      {selectedQueryForChat && (
        <ModernChatInterface
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          queryId={selectedQueryForChat.queryId}
          queryTitle={selectedQueryForChat.queryText || `Query for ${selectedQueryForChat.appNo}`}
          customerName={selectedQueryForChat.customerName}
          currentUser={{
            name: user?.name || 'Sales Team',
            role: user?.role || 'sales',
            team: 'sales'
          }}
        />
      )}
    </div>
  );
}