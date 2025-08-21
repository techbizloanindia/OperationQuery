'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaSync, FaSearch } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';

interface QueryMessage {
  id: string;
  text: string;
  timestamp?: string;
  sender?: string;
  senderRole?: string;
  status?: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'waiting for approval';
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

export default function CreditQueriesRaised() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch pending credit queries
  const { data: queries, isLoading, error, refetch } = useQuery({
    queryKey: ['creditQueries', 'pending'],
    queryFn: async () => {
      const response = await fetch('/api/queries?status=pending&team=credit');
      if (!response.ok) {
        throw new Error('Failed to fetch credit queries');
      }
      const data = await response.json();
      return data.success ? data.data : [];
    }
  });

  // Extract individual queries with sequential numbering
  const individualQueries = React.useMemo(() => {
    if (!queries || queries.length === 0) return [];
    
    const individual: Array<Query & { queryIndex: number; queryText: string; queryId: string }> = [];
    
    queries.forEach((queryGroup: Query) => {
      queryGroup.queries.forEach((query, index) => {
        const queryStatus = query.status || queryGroup.status;
        const isResolved = ['request-approved', 'request-deferral', 'request-otc', 'approved', 'resolved', 'deferred', 'otc'].includes(queryStatus);
        
        if (!isResolved) {
          individual.push({
            ...queryGroup,
            queryIndex: individual.length + 1, // Sequential numbering using array index + 1
            queryText: query.text,
            queryId: query.id,
            id: parseInt(query.id.split('-')[0]) + index,
            title: `Query ${individual.length + 1} - ${queryGroup.appNo}`,
            status: queryStatus
          });
        }
      });
    });
    
    return individual;
  }, [queries]);

  // Filter queries based on search term
  const filteredQueries = individualQueries.filter((query) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      query.appNo.toLowerCase().includes(searchLower) ||
      query.customerName.toLowerCase().includes(searchLower) ||
      query.branch.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Credit Queries Raised</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search queries..."
              className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition"
            title="Refresh queries"
          >
            <FaSync />
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 p-4">
          Error loading queries. Please try again.
        </div>
      ) : filteredQueries.length === 0 ? (
        <div className="text-center text-gray-500 p-4">
          No pending credit queries found.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredQueries.map((query, index) => (
            <div key={`credit-query-${query.queryId || query.id}-${index}`} className="border rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-gray-700 text-lg">
                    Query {query.queryIndex}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    query.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {query.status === 'pending' ? 'Pending' : 'Resolved'}
                  </span>
                </div>
                <span className="text-sm text-gray-500">App #: {query.appNo}</span>
              </div>
              
              <h3 className="font-semibold mb-2">{query.customerName}</h3>
              
              <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                <p className="text-gray-700 text-sm font-bold">
                  {query.queryText || 'No query text available'}
                </p>
              </div>
              
              <div className="mt-3 flex justify-between text-xs text-gray-500">
                <span>Branch: {query.branch}</span>
                <span>Submitted: {new Date(query.submittedAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

