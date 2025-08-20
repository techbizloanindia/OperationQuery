'use client';

import React, { useState, useEffect } from 'react';
import { querySyncService } from '@/lib/querySyncService';
import { queryUpdateService } from '@/lib/queryUpdateService';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle,
  Search,
  Calendar,
  User,
  Building,
  Clock,
  FileText,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';

interface ResolvedQuery {
  id: string;
  appNo: string;
  title: string;
  customerName: string;
  branch: string;
  priority: 'high' | 'medium' | 'low';
  resolvedAt: string;
  resolvedBy: string;
  resolutionReason?: string;
  createdAt: string;
  messages: Array<{
    sender: string;
    text: string;
    timestamp: string;
    isSent: boolean;
  }>;
}

export default function SalesQueriesResolved() {
  const { user } = useAuth();
  const [resolvedQueries, setResolvedQueries] = useState<ResolvedQuery[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<ResolvedQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedQuery, setSelectedQuery] = useState<ResolvedQuery | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [operationsUpdates, setOperationsUpdates] = useState<any[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  useEffect(() => {
    fetchResolvedQueries();
    
    // Set up real-time updates
    const unsubscribe = queryUpdateService.subscribe('sales', (update) => {
      console.log('📊 SalesQueriesResolved: Received query update:', update);
      
      // Check if this is a resolved query that's relevant to Sales team
      if ((update.action === 'resolved' || update.status === 'resolved') && 
          (update.markedForTeam === 'sales' || update.markedForTeam === 'both' || update.team === 'sales' || update.broadcast)) {
        console.log(`🆕 New resolved query for Sales: ${update.appNo}`);
        console.log(`👤 Resolved by: ${update.resolvedBy || 'Unknown'}`);
        console.log(`📱 Broadcast: ${update.broadcast ? 'Yes' : 'No'}`);
        console.log(`🔄 Update triggered by Operations`);
        
        // Set the last update time
        setLastUpdateTime(new Date());
        
        // Immediately refresh the queries
        fetchResolvedQueries();
      }
    });
    
    // Set up polling as a fallback
    const interval = setInterval(fetchResolvedQueries, 30000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    filterQueries();
  }, [resolvedQueries, searchTerm, dateFilter, priorityFilter]);

  const fetchResolvedQueries = async () => {
    try {
      const response = await fetch('/api/queries?team=sales&status=resolved');
      const result = await response.json();
      
      if (result.success) {
        const salesResolvedQueries = result.data.filter((query: any) => 
          // More inclusive filter - include queries that might come from operations but are marked for sales
          (query.markedForTeam === 'sales' || 
           query.markedForTeam === 'both' ||
           query.team === 'sales') &&
          (query.status === 'resolved' || 
           query.status === 'approved' || 
           query.status === 'deferred' || 
           query.status === 'otc')
        );
        console.log(`📊 SalesQueriesResolved: Found ${salesResolvedQueries.length} resolved queries`);
        setResolvedQueries(salesResolvedQueries);
      }
    } catch (error) {
      console.error('Error fetching resolved queries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterQueries = () => {
    let filtered = resolvedQueries;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(query =>
        query.appNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.resolvedBy?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(query => 
        new Date(query.resolvedAt) >= filterDate
      );
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(query => query.priority === priorityFilter);
    }

    setFilteredQueries(filtered);
  };

  const handleQueryClick = (query: ResolvedQuery) => {
    setSelectedQuery(query);
    setShowModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateResolutionTime = (createdAt: string, resolvedAt: string) => {
    const created = new Date(createdAt);
    const resolved = new Date(resolvedAt);
    const diffInHours = Math.floor((resolved.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const days = Math.floor(diffInHours / 24);
      const hours = diffInHours % 24;
      return `${days}d ${hours}h`;
    }
  };

  const exportToCSV = () => {
    const csvData = filteredQueries.map(query => ({
      'App No': query.appNo,
      'Customer Name': query.customerName,
      'Branch': query.branch,
      'Priority': query.priority,
      'Created At': new Date(query.createdAt).toLocaleString(),
      'Resolved At': new Date(query.resolvedAt).toLocaleString(),
      'Resolved By': query.resolvedBy || 'N/A',
      'Resolution Time': calculateResolutionTime(query.createdAt, query.resolvedAt),
      'Resolution Reason': query.resolutionReason || 'N/A'
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `sales_resolved_queries_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Query Resolved</h1>
            <p className="text-gray-800">
              {filteredQueries.length} resolved queries by Sales team
            </p>
          </div>
          <div className="flex space-x-3 mt-4 sm:mt-0">
            <button
              onClick={exportToCSV}
              disabled={filteredQueries.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={fetchResolvedQueries}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">{resolvedQueries.length}</p>
              <p className="text-sm text-gray-800">Total Resolved</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">2.4h</p>
              <p className="text-sm text-gray-800">Avg Resolution Time</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">
                {resolvedQueries.filter(q => 
                  new Date(q.resolvedAt).toDateString() === new Date().toDateString()
                ).length}
              </p>
              <p className="text-sm text-gray-800">Today</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-indigo-600" />
            <div className="ml-3">
              <p className="text-2xl font-semibold text-gray-900">
                {resolvedQueries.filter(q => 
                  new Date(q.resolvedAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
              <p className="text-sm text-gray-800">This Week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search resolved queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('');
              setDateFilter('all');
              setPriorityFilter('all');
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Resolved Queries List */}
      <div className="space-y-4">
        {filteredQueries.length > 0 ? (
          filteredQueries.map((query) => (
            <div
              key={query.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleQueryClick(query)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Resolved
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(query.priority)}`}>
                        {query.priority}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Application: {query.appNo}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-800 mb-3">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-600" />
                        {query.customerName}
                      </div>
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-gray-600" />
                        {query.branch}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-600" />
                        Resolved in {calculateResolutionTime(query.createdAt, query.resolvedAt)}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-600" />
                        Resolved by: {query.resolvedBy || 'Sales Team'}
                      </div>
                    </div>

                    <p className="text-sm text-gray-800">
                      Resolved on {new Date(query.resolvedAt).toLocaleDateString()} at {new Date(query.resolvedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <span className="text-xs text-gray-500">
                      {new Date(query.resolvedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resolved queries found</h3>
            <p className="text-gray-700">
              {searchTerm || dateFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'No queries have been resolved by the sales team yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Query Detail Modal */}
      {showModal && selectedQuery && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Resolved Query Details - {selectedQuery.appNo}
                </h3>
                <div className="flex items-center space-x-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Resolved
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedQuery.priority)}`}>
                    {selectedQuery.priority}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-medium text-gray-900">Customer:</span>
                    <p className="text-gray-800">{selectedQuery.customerName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Branch:</span>
                    <p className="text-gray-800">{selectedQuery.branch}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Created:</span>
                    <p className="text-gray-800">{new Date(selectedQuery.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Resolved:</span>
                    <p className="text-gray-800">{new Date(selectedQuery.resolvedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Resolution Time:</span>
                    <p className="text-gray-800">{calculateResolutionTime(selectedQuery.createdAt, selectedQuery.resolvedAt)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Resolved by:</span>
                    <p className="text-gray-800">{selectedQuery.resolvedBy || 'Sales Team'}</p>
                  </div>
                </div>

                {selectedQuery.resolutionReason && (
                  <div className="mb-4">
                    <span className="font-medium text-gray-900">Resolution Reason:</span>
                    <p className="text-gray-800 mt-1">{selectedQuery.resolutionReason}</p>
                  </div>
                )}

                {selectedQuery.messages && selectedQuery.messages.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Query Messages:</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedQuery.messages.map((message, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-md">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-gray-900">{message.sender}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800">{message.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}