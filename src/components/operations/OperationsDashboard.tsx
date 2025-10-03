/**
 * OpsQuery - Real-time Query Management System
 * Copyright (c) 2024 OpsQuery Development Team
 * 
 * Licensed under the MIT License.
 * 
 * @fileoverview Operations Dashboard - Main interface for Operations team
 * @author OpsQuery Development Team
 * @version 2.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import OperationsNavbar from './OperationsNavbar';
import OperationsSidebar from './OperationsSidebar';
import DashboardOverview from './DashboardOverview';
import TabNavigation from './TabNavigation';
import QueryRaised from './QueryRaised';
import QueryResolved from './QueryResolved';
import SanctionedCases from './SanctionedCases';
import AddQuery from './AddQuery';



export type TabType = 'dashboard' | 'query-raised' | 'query-resolved' | 'sanctioned-cases' | 'add-query';

export default function OperationsDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [newQueriesCount, setNewQueriesCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAppNo, setSelectedAppNo] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch query statistics for real-time updates
  const fetchQueryStats = async () => {
    try {
      const response = await fetch('/api/queries?stats=true');
      const result = await response.json();
      
      if (result.success) {
        setNewQueriesCount(result.data.pending || 0);
      }
    } catch (error) {
      console.error('Error fetching query stats:', error);
    }
  };

  // Initial load and real-time service initialization
  useEffect(() => {
    fetchQueryStats();
    
    // Initialize query update service for real-time updates
    if (typeof window !== 'undefined') {
      import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
        queryUpdateService.initialize();
        
        // Subscribe to all query updates for operations
        const unsubscribe = queryUpdateService.subscribe('operations', (update) => {
          console.log('📨 Operations Dashboard received query update:', update.appNo, update.action);
          
          // Refresh stats when we receive updates
          fetchQueryStats();
          
          // Force refresh of the active tab
          setRefreshTrigger(prev => prev + 1);
        });
        
        console.log('🌐 Operations Dashboard: Initialized real-time query update service');
        
        // Cleanup on unmount
        return () => {
          unsubscribe();
        };
      });
    }
    
    // Set up refresh interval for stats as fallback
    const statsInterval = setInterval(() => {
      fetchQueryStats();
    }, 50000); // Refresh every 50 seconds (staggered)
    
    return () => {
      clearInterval(statsInterval);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setLastRefreshed(new Date());
    
    // Fetch latest stats
    await fetchQueryStats();
    
    // Small delay to show refresh state
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleRaiseQuery = (appNo: string) => {
    // Switch to add-query tab with the appNo pre-filled
    setSelectedAppNo(appNo);
    setActiveTab('add-query');
  };

  const handleTabChange = (tab: TabType) => {
    // Clear selectedAppNo when switching away from add-query tab
    if (tab !== 'add-query') {
      setSelectedAppNo('');
    }
    setActiveTab(tab);
  };

  const handleQuerySubmitted = () => {
    // Navigate to queries-raised tab after query submission
    setActiveTab('query-raised');
    // Trigger refresh to show the new query
    setRefreshTrigger(prev => prev + 1);
  };


  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <DashboardOverview />
          </div>
        );
      case 'query-raised':
        return <QueryRaised key={refreshTrigger} />;
      case 'query-resolved':
        return <QueryResolved key={refreshTrigger} />;
      case 'sanctioned-cases':
        return <SanctionedCases key={refreshTrigger} onRaiseQuery={handleRaiseQuery} />;
      case 'add-query':
        return <AddQuery key={refreshTrigger} appNo={selectedAppNo} onQuerySubmitted={handleQuerySubmitted} />;

      default:
        return (
          <div className="space-y-6">
            <DashboardOverview />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OperationsNavbar />
      
      <div className="flex">
        <OperationsSidebar activeTab={activeTab} onTabChangeAction={handleTabChange} />
        
        <div className="flex-1 lg:ml-0">
          {/* Mobile tab navigation for smaller screens */}
          <div className="lg:hidden bg-white border-b">
            <div className="px-4 py-3">
              <select
                value={activeTab}
                onChange={(e) => handleTabChange(e.target.value as TabType)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="dashboard">Dashboard Overview</option>
                <option value="query-raised">Queries Raised</option>
                <option value="sanctioned-cases">Sanctioned Cases</option>
                <option value="add-query">Add Query</option>
                <option value="query-resolved">Queries Resolved</option>
              </select>
            </div>
          </div>
          
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}
