'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FaClock, 
  FaExclamationTriangle, 
  FaInfoCircle, 
  FaComments,
  FaFileAlt,
  FaUser,
  FaBuilding
} from 'react-icons/fa';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import { queryUpdateService } from '@/lib/queryUpdateService';

interface Query {
  id: number;
  appNo: string;
  customerName: string;
  queries: Array<{
    id: string;
    text: string;
    status: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'waiting for approval';
    timestamp?: string;
    sender?: string;
    senderRole?: string;
  }>;
  sendTo: string[];
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'waiting for approval';
  branch: string;
  branchCode: string;
  lastUpdated: string;
  proposedAction?: string;
  proposedBy?: string;
  proposedAt?: string;
  amount?: string;
  appliedOn?: string;
  title?: string;
  queryIndex?: number;
  queryText?: string;
  queryId?: string;
}

// Fetch only queries waiting for approval
const fetchWaitingQueries = async (): Promise<Query[]> => {
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/queries?_=${timestamp}`);
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to fetch queries');
    }
    
    // Filter to only include queries waiting for approval
    const waitingQueries = result.data.filter((query: any) => {
      // Check if the main query status is waiting for approval
      if (query.status === 'waiting for approval') {
        return true;
      }
      
      // Also check if any individual queries within are waiting for approval
      const hasWaitingSubQueries = query.queries?.some((q: any) => 
        q.status === 'waiting for approval'
      );
      
      return hasWaitingSubQueries;
    });
    
    console.log(`📋 WaitingApproval: Found ${waitingQueries.length} queries waiting for approval`);
    return waitingQueries || [];
  } catch (error) {
    console.error('Error fetching waiting approval queries:', error);
    throw error;
  }
};

export default function WaitingApproval() {
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name'>('recent');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch all queries waiting for approval
  const { data: queries, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['waitingApprovalQueries'],
    queryFn: fetchWaitingQueries,
    refetchOnWindowFocus: true,
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Subscribe to real-time query updates
  useEffect(() => {
    const unsubscribe = queryUpdateService.subscribe('operations', (update) => {
      console.log('📋 WaitingApproval: Received query update:', update);
      
      // Refresh when queries move to/from waiting approval status
      if (update.status === 'waiting for approval') {
        console.log(`📋 Query moved to waiting approval: ${update.appNo}`);
        refetch();
      }
    });
    
    return () => unsubscribe();
  }, [refetch]);
  
  // Extract individual waiting queries for display
  const individualQueries = React.useMemo(() => {
    if (!queries || !Array.isArray(queries)) return [];
    
    const individual: Array<Query & { queryIndex: number; queryText: string; queryId: string }> = [];
    
    queries.forEach(queryGroup => {
      if (queryGroup && Array.isArray(queryGroup.queries)) {
        queryGroup.queries.forEach((query, index) => {
          // Check both individual query status and group status
          const queryStatus = query.status || queryGroup.status;
          
          // Only include queries that are waiting for approval
          if (queryStatus === 'waiting for approval') {
            individual.push({
              ...queryGroup,
              queryIndex: index + 1,
              queryText: query.text,
              queryId: query.id,
              id: parseInt(query.id.split('-')[0]) + index,
              title: `Query ${index + 1} - ${queryGroup.appNo}`,
              status: queryStatus,
            });
          }
        });
      } else if (queryGroup && queryGroup.status === 'waiting for approval') {
        // Handle cases where the entire query group is waiting for approval
        individual.push({
          ...queryGroup,
          queryIndex: 1,
          queryText: queryGroup.title || `Query for ${queryGroup.appNo}`,
          queryId: queryGroup.id.toString(),
        });
      }
    });
    
    console.log(`📋 WaitingApproval: Processing ${individual.length} individual waiting queries`);
    return individual;
  }, [queries]);

  // Filter and sort queries
  const filteredAndSortedQueries = React.useMemo(() => {
    if (!individualQueries) return [];
    
    const filtered = individualQueries.filter(query => 
      query.appNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.queryText.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (sortBy) {
      case 'oldest':
        return filtered.sort((a, b) => 
          new Date(a.proposedAt || a.lastUpdated).getTime() - new Date(b.proposedAt || b.lastUpdated).getTime()
        );
      case 'name':
        return filtered.sort((a, b) => 
          a.customerName.localeCompare(b.customerName)
        );
      case 'recent':
      default:
        return filtered.sort((a, b) => 
          new Date(b.proposedAt || b.lastUpdated).getTime() - new Date(a.proposedAt || a.lastUpdated).getTime()
        );
    }
  }, [individualQueries, searchTerm, sortBy]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <LoadingState message="Loading queries waiting for approval..." />;
  }

  if (isError) {
    return <ErrorState message={error?.message || 'Failed to load waiting approval queries'} onRetry={refetch} />;
  }
    
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-black font-['Inter',sans-serif]">Waiting for Approval</h1>
          <div className="flex items-center mt-2 sm:mt-0 gap-4">
            <span className="text-sm font-medium text-black">
              {filteredAndSortedQueries.length} Queries Waiting
            </span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest' | 'name')}
                className="appearance-none bg-white border border-slate-300 rounded-md py-2 pl-3 pr-8 text-sm font-medium text-black hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="recent">Sort By: Recent</option>
                <option value="oldest">Sort By: Oldest</option>
                <option value="name">Sort By: Applicant Name</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by application number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black font-bold bg-white"
            style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
          />
        </div>

        {/* Waiting Queries Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white p-4">
            <h2 className="text-xl font-semibold">Queries Waiting for Approval (Approved, Deferred, OTC)</h2>
          </div>
          
          {filteredAndSortedQueries.length === 0 ? (
            <div className="p-8">
              <EmptyState message="No queries waiting for approval" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-black">Query Details</th>
                    <th className="px-4 py-3 text-left font-semibold text-black">Customer Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-black">Query Text</th>
                    <th className="px-4 py-3 text-left font-semibold text-black">Proposed Action</th>
                    <th className="px-4 py-3 text-left font-semibold text-black">Submitted Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-black">Proposed By</th>
                    <th className="px-4 py-3 text-left font-semibold text-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedQueries.map((query: any, index: number) => (
                    <tr key={`waiting-${query.queryId || `${query.appNo}-${index}`}-${index}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0 bg-orange-100 text-orange-800 rounded-full h-8 w-8 flex items-center justify-center">
                            <FaClock className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-black">{query.appNo}</span>
                            <div className="text-xs text-gray-600">Query #{query.queryIndex}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-black">{query.customerName}</div>
                        <div className="text-sm text-gray-600">
                          {query.branch}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-black line-clamp-3 font-medium">
                            {query.queryText || 'No query text available'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          query.proposedAction === 'approve' ? 'bg-green-100 text-green-800' :
                          query.proposedAction === 'deferral' ? 'bg-yellow-100 text-yellow-800' :
                          query.proposedAction === 'otc' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {query.proposedAction === 'approve' ? 'APPROVED' :
                           query.proposedAction === 'deferral' ? 'DEFERRAL' :
                           query.proposedAction === 'otc' ? 'OTC' :
                           (query.proposedAction || 'UNKNOWN')?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-black">
                            {formatDateTime(query.proposedAt || query.lastUpdated)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-purple-700">
                          {query.proposedBy || 'Operations Team'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <FaClock className="w-3 h-3 mr-1" />
                          WAITING FOR APPROVAL
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}