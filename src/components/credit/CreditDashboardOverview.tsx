'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Edit3
} from 'lucide-react';
import ModernRemarksInterface from '../shared/ModernRemarksInterface';


interface QueryStats {
  total: number;
  pending: number;
  resolved: number;
  urgent: number;
  todaysQueries: number;
  responseRate: number;
  avgResolutionTime: string;
}

interface CreditDashboardOverviewProps {
  operationsUpdates?: any[];
}

export default function CreditDashboardOverview({ operationsUpdates = [] }: CreditDashboardOverviewProps) {
  const [stats, setStats] = useState<QueryStats>({
    total: 0,
    pending: 0,
    resolved: 0,
    urgent: 0,
    todaysQueries: 0,
    responseRate: 0,
    avgResolutionTime: '0h'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  
  // Remarks interface state
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<any>(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentQueries();
    
    // Set up real-time updates
    if (typeof window !== 'undefined') {
      import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
        // Subscribe to real-time updates for credit team
        const unsubscribe = queryUpdateService.subscribe('credit', (update) => {
          console.log('📨 Credit Dashboard Overview received query update:', update.appNo, update.action);
          
          // Refresh data when we receive updates
          fetchDashboardStats();
          fetchRecentQueries();
        });
        
        console.log('🌐 Credit Dashboard Overview: Subscribed to real-time updates');
        
        // Cleanup on unmount
        return () => {
          unsubscribe();
        };
      });
    }
    
    // Set up polling as fallback every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardStats();
      fetchRecentQueries();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/queries?team=credit');
      const result = await response.json();
      
      if (result.success) {
        const queries = result.data.filter((query: any) => 
          query.markedForTeam === 'credit' || 
          query.markedForTeam === 'both' ||
          query.team === 'credit'
        );
        const today = new Date().toDateString();
        
        // Calculate average resolution time from actual data
        const resolvedQueries = queries.filter((q: any) => q.status === 'resolved' && q.resolvedAt && q.createdAt);
        let avgResolutionHours = 0;
        
        if (resolvedQueries.length > 0) {
          const totalHours = resolvedQueries.reduce((total: number, query: any) => {
            const created = new Date(query.createdAt);
            const resolved = new Date(query.resolvedAt);
            return total + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
          }, 0);
          avgResolutionHours = Math.round(totalHours / resolvedQueries.length * 10) / 10; // Round to 1 decimal
        }
        
        const calculatedStats: QueryStats = {
          total: queries.length,
          pending: queries.filter((q: any) => q.status === 'pending').length,
          resolved: queries.filter((q: any) => q.status === 'resolved').length,
          urgent: queries.filter((q: any) => q.priority === 'high').length,
          todaysQueries: queries.filter((q: any) => 
            new Date(q.createdAt).toDateString() === today
          ).length,
          responseRate: queries.length > 0 ? 
            Math.round((queries.filter((q: any) => q.status === 'resolved').length / queries.length) * 100) : 0,
          avgResolutionTime: avgResolutionHours > 0 ? `${avgResolutionHours}h` : 'N/A'
        };
        
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentQueries = async () => {
    try {
      const response = await fetch('/api/queries?team=credit&limit=10');
      const result = await response.json();
      
      if (result.success) {
        const creditQueries = result.data.filter((query: any) => 
          query.markedForTeam === 'credit' || 
          query.markedForTeam === 'both' ||
          query.team === 'credit'
        );
        // Sort by creation date (newest first) and take top 5
        const sortedQueries = creditQueries
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        setRecentQueries(sortedQueries);
      }
    } catch (error) {
      console.error('Error fetching recent queries:', error);
    }
  };

  // Handle opening remarks modal
  const handleOpenRemarks = (query: any) => {
    setSelectedQuery(query);
    setShowRemarksModal(true);
  };

  // Handle closing remarks modal
  const handleCloseRemarks = () => {
    setShowRemarksModal(false);
    setSelectedQuery(null);
  };

  const statCards = [
    {
      title: 'Total Queries',
      value: stats.total,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Urgent',
      value: stats.urgent,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Credit Dashboard</h1>
        <p className="text-gray-600">Monitor and manage credit queries in real-time</p>
      </div>

      {/* Query Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {card.value}
                </p>
                <p className="text-sm text-gray-600">{card.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operations Team Updates */}
      {operationsUpdates && operationsUpdates.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Operations Team Updates</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {operationsUpdates.map((update, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {update.type}
                      </span>
                      <span className="text-sm text-gray-500">from {update.team}</span>
                    </div>
                    <p className="text-sm text-gray-700">{update.message}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(update.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Queries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Credit Queries</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentQueries.length > 0 ? (
            recentQueries.map((query, index) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        query.status === 'pending' 
                          ? 'bg-orange-100 text-orange-800'
                          : query.status === 'resolved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {query.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        query.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : query.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {query.priority}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                      {query.title || `Query for ${query.appNo}`}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {query.customerName} • {query.branch} • App: {query.appNo}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleOpenRemarks(query)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 text-xs font-medium rounded-lg transition-colors"
                      title="Add Remarks"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Remarks</span>
                    </button>
                    <div className="text-sm text-gray-500">
                      {new Date(query.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent queries found</p>
            </div>
          )}
        </div>
      </div>

      {/* Modern Remarks Interface */}
      {showRemarksModal && selectedQuery && (
        <ModernRemarksInterface
          isOpen={showRemarksModal}
          onClose={handleCloseRemarks}
          queryId={selectedQuery.queryId || selectedQuery.id}
          queryTitle={selectedQuery.title || `Query for ${selectedQuery.appNo}`}
          customerName={selectedQuery.customerName}
          currentUser={{
            name: 'Credit User',
            role: 'credit',
            team: 'credit'
          }}
        />
      )}
    </div>
  );
}
