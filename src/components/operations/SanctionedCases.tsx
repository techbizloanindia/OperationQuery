'use client';

import React, { useState, useEffect } from 'react';
import { FaExclamationCircle } from 'react-icons/fa';
import EmptyState from './EmptyState';
import CaseAccordion from './CaseAccordion';
import { queryUpdateService } from '@/lib/queryUpdateService';

interface SanctionedApplication {
  _id: string;
  appId: string;
  customerName: string;
  branch: string;
  status: 'active' | 'expired' | 'utilized' | 'cancelled';
  sanctionedAmount: number;
  sanctionedDate: string;
  createdAt: string;
  loanType: string;
  sanctionedBy: string;
  validityPeriod?: number;
  loanNo?: string;
  customerEmail?: string;
  remarks?: string;
  salesExec?: string;
  approvedBy?: string;
}

interface SanctionedCasesProps {
  onRaiseQuery: (appNo: string) => void;
}

export default function SanctionedCases({ onRaiseQuery }: SanctionedCasesProps) {
  const [sanctionedCases, setSanctionedCases] = useState<SanctionedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSanctionedCases();
    
    // Set up auto-refresh interval
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchSanctionedCases(true); // Silent refresh
      }, 25000); // Refresh every 25 seconds (staggered)
    }

    // Subscribe to real-time query updates via SSE for operations team
    const unsubscribe = queryUpdateService.subscribe('operations', (update) => {
      console.log('🔔 Received query update in SanctionedCases:', update);
      
      // Check if this is a sanctioned case removal event
      if (update.action === 'sanctioned_case_removed' || update.status === 'sanctioned_case_removed') {
        console.log('🗑️ Sanctioned case removed, refreshing list:', update.appNo);
        fetchSanctionedCases(true); // Silent refresh to update the list
      }
      // Also refresh when queries are resolved, to check if app should be removed
      else if (['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(update.status)) {
        console.log('✅ Query resolved, checking sanctioned cases:', update.appNo);
        // Small delay to ensure backend processing is complete
        setTimeout(() => {
          fetchSanctionedCases(true);
        }, 1000);
      }
    });

    // Listen for real-time updates when sanctioned cases are removed (legacy fallback)
    const handleSanctionedCaseRemoval = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔔 Sanctioned case removal event detected (legacy)!', customEvent?.detail);
      
      if (customEvent?.detail?.action === 'sanctioned_case_removed') {
        console.log('🗑️ Refreshing sanctioned cases due to removal:', customEvent.detail.appNo);
        fetchSanctionedCases(true); // Silent refresh
      }
    };

    // Add event listeners for real-time updates (legacy fallback)
    window.addEventListener('queryUpdated', handleSanctionedCaseRemoval);
    window.addEventListener('queryResolved', handleSanctionedCaseRemoval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      // Unsubscribe from SSE updates
      unsubscribe();
      // Clean up event listeners
      window.removeEventListener('queryUpdated', handleSanctionedCaseRemoval);
      window.removeEventListener('queryResolved', handleSanctionedCaseRemoval);
    };
  }, [autoRefresh]);

  const fetchSanctionedCases = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      console.log('🔍 Fetching sanctioned cases from sanctioned_applications collection...');
      const response = await fetch('/api/get-sanctioned');
      const result = await response.json();
      
      console.log('📊 Sanctioned cases API response:', result);
      
      if (result.success) {
        setSanctionedCases(result.applications);
        setLastUpdated(new Date());
        setError(null);
        console.log(`✅ Successfully loaded ${result.applications.length} sanctioned cases`);
      } else {
        setError(result.message || 'Failed to fetch sanctioned cases');
        console.error('❌ Failed to fetch sanctioned cases:', result.message);
      }
    } catch (error) {
      const errorMessage = 'Failed to fetch sanctioned cases - check network connection';
      setError(errorMessage);
      console.error('❌ Error fetching sanctioned cases:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const formatLastUpdated = () => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return lastUpdated.toLocaleTimeString();
    }
  };


  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-6 w-6 text-cyan-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600">Loading sanctioned cases...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <FaExclamationCircle className="h-12 w-12 mx-auto mb-2" />
          <p className="text-lg font-medium">Error Loading Cases</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
        <button
          onClick={() => fetchSanctionedCases()}
          className="text-cyan-600 hover:text-cyan-800 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (sanctionedCases.length === 0) {
    return (
      <EmptyState 
        title="No sanctioned cases found"
        message="No sanctioned applications found in database. Upload CSV files through the Admin Panel to see sanctioned applications here."
        actionLabel="Refresh Cases"
        onAction={() => fetchSanctionedCases(false)}
      />
    );
  }

  return (
    <>
      {/* Simple Header */}
      <div className="mb-4 bg-white p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Sanctioned Applications</h3>
            <p className="text-sm text-gray-600">
              {sanctionedCases.length > 0 
                ? `${sanctionedCases.length} applications ready for processing` 
                : 'No sanctioned applications found'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {formatLastUpdated()}
              {autoRefresh && <span className="ml-2 text-gray-600">• Auto-refreshing</span>}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-xl font-semibold text-gray-800">{sanctionedCases.length}</div>
              <div className="text-xs text-gray-600">Total Cases</div>
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => fetchSanctionedCases(false)}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
              >
                Refresh Now
              </button>
              <button
                onClick={toggleAutoRefresh}
                className={`text-xs px-3 py-1 border ${
                  autoRefresh 
                    ? 'text-gray-700 bg-gray-200 border-gray-300' 
                    : 'text-gray-600 bg-gray-100 border-gray-300'
                }`}
              >
                {autoRefresh ? 'Pause Auto-refresh' : 'Enable Auto-refresh'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Simple Notification */}
        {sanctionedCases.length > 0 && (
          <div className="mt-3 bg-gray-50 border border-gray-200 p-3">
            <div className="flex items-center justify-center text-sm">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                <span className="text-gray-700">
                  Real-time updates enabled - New uploads will appear automatically
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Simple Table Layout */}
      <div className="bg-white border border-gray-200">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">App ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">RM Executive</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody>
            {sanctionedCases.map((application, index) => (
              <tr key={application._id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-4 text-sm font-medium text-gray-900">{application.appId}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{application.customerName}</td>
                <td className="px-4 py-4 text-sm font-medium text-gray-900">
                  ₹{application.sanctionedAmount.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">{application.branch}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold border ${
                    application.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                    application.status === 'expired' ? 'bg-red-100 text-red-800 border-red-200' :
                    application.status === 'utilized' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                  }`}>
                    {application.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {application.salesExec || application.approvedBy || 'Not Assigned'}
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => onRaiseQuery(application.appId)}
                    className="text-sm px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 border border-blue-600"
                  >
                    Raise Query
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
} 