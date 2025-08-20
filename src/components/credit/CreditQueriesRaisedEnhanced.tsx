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
    const response = await fetch('/api/queries?team=credit&status=all&includeBoth=true');
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
        // Show all queries for credit team including those marked for 'both' teams
        return queryData.markedForTeam === 'credit' || 
               queryData.markedForTeam === 'both' || 
               queryData.team === 'credit';
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
            sendTo: ['credit'],
            submittedBy: 'System',
            submittedAt: new Date().toISOString(),
            status: 'pending' as const,
            branch: 'Unknown Branch',
            branchCode: 'UNK',
            markedForTeam: 'credit',
            tat: '24 hours',
            priority: 'medium' as const
          };
        }
      });
    
    // Process and flatten queries for the component
    const processedQueries: Array<Query & { queryIndex: number; queryText: string; queryId: string }> = [];
    
    queries.forEach((app: Query) => {
      app.queries.forEach((query, qIndex) => {
        processedQueries.push({
          ...app,
          queryIndex: qIndex + 1,
          queryText: query.text,
          queryId: query.id,
          status: query.status || app.status
        });
      });
    });
    
    return processedQueries;
  } catch (error) {
    console.error('Error fetching credit queries:', error);
    throw error;
  }
};

export default function CreditQueriesRaised() {
  // View and selection state
  const [currentView, setCurrentView] = useState<ViewType>('applications');
  const [selectedAppNo, setSelectedAppNo] = useState<string>('');
  const [appQueries, setAppQueries] = useState<Array<Query & { queryIndex: number; queryText: string; queryId: string }>>([]);
  
  // Query data state
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

  // Load queries
  const loadQueries = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      
      const fetchedQueries = await fetchQueries();
      setQueries(fetchedQueries);
      setLastUpdated(new Date());
      
      console.log(`✅ Loaded ${fetchedQueries.length} credit queries`);
    } catch (err) {
      console.error('💥 Error loading credit queries:', err);
      setIsError(true);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize real-time updates and load data
  useEffect(() => {
    loadQueries();
    
    // Initialize query update service
    if (typeof window !== 'undefined') {
      queryUpdateService.initialize();
      
      // Subscribe to real-time updates for credit team
      const unsubscribe = queryUpdateService.subscribe('credit', (update) => {
        console.log('📨 Credit Queries received update:', update.appNo, update.action);
        
        // Refresh queries when we receive updates
        loadQueries();
      });
      
      console.log('🌐 Credit Queries: Initialized real-time updates');
      
      // Cleanup on unmount
      return () => {
        unsubscribe();
      };
    }
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      if (!isLoading && !isRefreshing) {
        loadQueries();
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, isLoading, isRefreshing]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadQueries();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Handle selecting an application to view its queries
  const handleSelectApplication = async (appNo: string) => {
    setSelectedAppNo(appNo);
    const queriesForApp = queries.filter(q => q.appNo === appNo);
    const processedAppQueries: Array<Query & { queryIndex: number; queryText: string; queryId: string }> = [];
    
    queriesForApp.forEach((app: Query) => {
      app.queries.forEach((query, qIndex) => {
        processedAppQueries.push({
          ...app,
          queryIndex: qIndex + 1,
          queryText: query.text,
          queryId: `${app.appNo}-Q${qIndex + 1}`
        });
      });
    });
    
    setAppQueries(processedAppQueries);
    setCurrentView('queries');
  };

  // Handle going back to applications view
  const handleBackToApplications = () => {
    setCurrentView('applications');
    setSelectedAppNo('');
    setAppQueries([]);
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

  // Get grouped applications
  const groupedApplications = queries.reduce((acc, query) => {
    if (!acc[query.appNo]) {
      acc[query.appNo] = {
        appNo: query.appNo,
        customerName: query.customerName,
        branch: query.branch,
        submittedAt: query.submittedAt,
        queries: []
      };
    }
    acc[query.appNo].queries.push(query);
    return acc;
  }, {} as Record<string, any>);

  // Filter applications based on search
  const filteredApplications = Object.values(groupedApplications).filter((app: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      app.appNo.toLowerCase().includes(searchLower) ||
      app.customerName.toLowerCase().includes(searchLower) ||
      app.branch.toLowerCase().includes(searchLower)
    );
  });

  // Filter queries for current application
  const filteredQueries = appQueries.filter((query) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      query.queryText.toLowerCase().includes(searchLower) ||
      query.status.toLowerCase().includes(searchLower)
    );
  });

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'deferred': return 'bg-orange-100 text-orange-800';
      case 'otc': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      case 'pending-approval': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          {currentView === 'queries' && (
            <button
              onClick={handleBackToApplications}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaArrowLeft />
              Back to Applications
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentView === 'applications' ? 'Credit Queries - Applications' : `Queries for ${selectedAppNo}`}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {currentView === 'applications' 
                ? `${filteredApplications.length} applications with queries`
                : `${filteredQueries.length} queries in this application`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder={currentView === 'applications' ? "Search applications..." : "Search queries..."}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={autoRefresh ? "Auto-refresh enabled" : "Auto-refresh disabled"}
          >
            {autoRefresh ? <FaPlay className="h-4 w-4" /> : <FaPause className="h-4 w-4" />}
            Auto
          </button>

          {/* Manual refresh */}
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaSync className={`h-4 w-4 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'polling' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
            <span className="capitalize">{connectionStatus}</span>
          </div>
          <div className="flex items-center gap-2">
            <FaClock className="h-4 w-4" />
            <span>Last updated: {formatLastUpdated()}</span>
          </div>
          <div className="flex items-center gap-2">
            <FaBell className="h-4 w-4" />
            <span>Auto-refresh: {autoRefresh ? 'On' : 'Off'}</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <FaSync className="h-8 w-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-600">Loading credit queries...</p>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
            <div className="text-red-600 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Queries</h3>
            <p className="text-red-700 mb-4">{error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Applications View */}
      {currentView === 'applications' && !isLoading && !isError && (
        <div>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <FaComments className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Applications Found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'No applications match your search criteria.' : 'No credit queries available at the moment.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredApplications.map((app: any) => (
                <div
                  key={app.appNo}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer bg-white"
                  onClick={() => handleSelectApplication(app.appNo)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{app.customerName}</h3>
                      <p className="text-sm text-gray-600">Application #{app.appNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Branch: {app.branch}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {app.queries.length} {app.queries.length === 1 ? 'query' : 'queries'}
                      </span>
                    </div>
                    <div className="text-blue-600 text-sm font-medium">
                      View Queries →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Queries View */}
      {currentView === 'queries' && !isLoading && !isError && (
        <div>
          {filteredQueries.length === 0 ? (
            <div className="text-center py-12">
              <FaComments className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Queries Found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'No queries match your search criteria.' : 'No queries available for this application.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQueries.map((query, index) => (
                <div
                  key={`${query.queryId}-${index}`}
                  className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">Query #{query.queryIndex}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(query.status)}`}>
                          {query.status.replace('-', ' ').toUpperCase()}
                        </span>
                        {query.priority && (
                          <span className={`text-xs font-medium ${getPriorityColor(query.priority)}`}>
                            {query.priority.toUpperCase()} PRIORITY
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-3">{query.queryText}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FaUser className="h-3 w-3" />
                          {query.submittedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaClock className="h-3 w-3" />
                          {new Date(query.submittedAt).toLocaleString()}
                        </span>
                        {query.tat && (
                          <span>TAT: {query.tat}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
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
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <FaReply />
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          team="Credit"
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
            name: user?.name || 'Credit Team',
            role: user?.role || 'credit',
            team: 'credit'
          }}
        />
      )}
    </div>
  );
}
