'use client';

import React, { useState, useEffect } from 'react';
import SalesNavbar from './SalesNavbar';
import SalesSidebar from './SalesSidebar';
import SalesDashboardOverview from './SalesDashboardOverview';
import SalesQueriesRaised from './SalesQueriesRaised';
import SalesQueriesResolved from './SalesQueriesResolved';
import QueriesByAppNo from '@/components/shared/QueriesByAppNo';
import { useAuth } from '@/contexts/AuthContext';
import { querySyncService } from '@/lib/querySyncService';

export type SalesTabType = 'dashboard' | 'queries-raised' | 'queries-resolved';

export default function SalesDashboard() {
  const [activeTab, setActiveTab] = useState<SalesTabType>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newQueriesCount, setNewQueriesCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assignedBranches, setAssignedBranches] = useState<string[]>([]);
  const [operationsUpdates, setOperationsUpdates] = useState<any[]>([]);

  // Fetch query statistics for real-time updates
  const fetchQueryStats = async () => {
    try {
      const response = await fetch('/api/queries?team=sales&stats=true&includeBoth=true');
      const result = await response.json();
      
      if (result.success) {
        setNewQueriesCount(result.data?.pending || 0);
      }
    } catch (error) {
      console.error('Error fetching query stats:', error);
    }
  };

  // Fetch assigned branches
  const fetchAssignedBranches = async () => {
    try {
      const response = await fetch('/api/branches?isActive=true');
      const result = await response.json();
      
      if (result.success) {
        const branchNames = result.data.map((branch: any) => branch.branchName);
        setAssignedBranches(branchNames);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchQueryStats();
    fetchAssignedBranches();
    
    // Initialize real-time updates
    if (typeof window !== 'undefined') {
      import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
        queryUpdateService.initialize();
        
        // Subscribe to real-time updates for sales team
        const unsubscribe = queryUpdateService.subscribe('sales', (update) => {
          console.log('📨 Sales Dashboard received query update:', update.appNo, update.action);
          
          // Refresh stats when we receive updates
          fetchQueryStats();
          
          // Force refresh of the active tab
          setRefreshTrigger(prev => prev + 1);
        });
        
        console.log('🌐 Sales Dashboard: Initialized real-time updates');
        
        // Cleanup on unmount
        return () => {
          unsubscribe();
        };
      });
    }
  }, []);

  // Auto-refresh every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueryStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh every 10 seconds for real-time updates (like credit dashboard)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueryStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to operations updates for cross-team awareness
  useEffect(() => {
    const unsubscribe = querySyncService.subscribe('operations', (updates) => {
      // Convert query updates to team updates format
      const teamUpdate = {
        id: Date.now().toString(),
        team: 'operations',
        timestamp: new Date().toISOString(),
        type: 'Query Update',
        message: `${updates.length} queries updated by Operations team`,
        affectedTeams: ['sales']
      };
      
      setOperationsUpdates(prev => [teamUpdate, ...prev.slice(0, 4)]); // Keep last 5 updates
      
      // Trigger refresh when operations updates
      handleRefresh();
    });

    return unsubscribe;
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setLastRefreshed(new Date());
    
    // Fetch latest stats
    await fetchQueryStats();
    await fetchAssignedBranches();
    
    // Small delay to show refresh state
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleTabChange = (tab: SalesTabType) => {
    setActiveTab(tab);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SalesDashboardOverview key={refreshTrigger} operationsUpdates={operationsUpdates} />;
      case 'queries-raised':
        return <SalesQueriesRaised key={refreshTrigger} />;
      case 'queries-resolved':
        return <SalesQueriesResolved key={refreshTrigger} />;
      default:
        return <SalesDashboardOverview key={refreshTrigger} operationsUpdates={operationsUpdates} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SalesNavbar 
        assignedBranches={assignedBranches}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastRefreshed={lastRefreshed}
      />
      
      <div className="flex">
        <SalesSidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          newQueriesCount={newQueriesCount}
        />
        
        <div className="flex-1 lg:ml-0">
          {/* Mobile tab navigation for smaller screens */}
          <div className="lg:hidden bg-white border-b">
            <div className="px-4 py-3">
              <select
                value={activeTab}
                onChange={(e) => handleTabChange(e.target.value as SalesTabType)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="dashboard">Dashboard Overview</option>
                <option value="queries-raised">Queries Raised</option>
                <option value="queries-resolved">Queries Resolved</option>
              </select>
            </div>
          </div>
          
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}