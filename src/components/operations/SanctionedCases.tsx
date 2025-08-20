'use client';

import React, { useState, useEffect } from 'react';
import { FaExclamationCircle } from 'react-icons/fa';
import EmptyState from './EmptyState';
import CaseAccordion from './CaseAccordion';

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
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
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
      {/* Header with stats */}
      <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-green-800">✅ Sanctioned Applications</h3>
            <p className="text-sm text-green-600">
              {sanctionedCases.length > 0 
                ? `${sanctionedCases.length} applications ready for processing` 
                : 'No sanctioned applications found'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {formatLastUpdated()}
              {autoRefresh && <span className="ml-2 text-green-600">• Auto-refreshing</span>}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-800">{sanctionedCases.length}</div>
              <div className="text-xs text-green-600">Total Cases</div>
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => fetchSanctionedCases(false)}
                className="text-xs font-medium px-3 py-1 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
              >
                🔄 Refresh Now
              </button>
              <button
                onClick={toggleAutoRefresh}
                className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                  autoRefresh 
                    ? 'text-orange-600 bg-orange-100 hover:bg-orange-200' 
                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {autoRefresh ? '⏸️ Pause Auto-refresh' : '▶️ Enable Auto-refresh'}
              </button>
            </div>
          </div>
        </div>
        
        {/* New Upload Notification */}
        {sanctionedCases.length > 0 && (
          <div className="mt-3 bg-white border border-green-300 rounded-lg p-3">
            <div className="flex items-center justify-center text-sm">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-green-700 font-medium">
                  Real-time updates enabled - New uploads will appear automatically
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header with Title */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">📊 Sanctioned Applications Data</h3>
            <p className="text-sm text-gray-600 mt-1">Systematic view of all sanctioned applications</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    App.No
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Branch Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Task Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Sanction Amount
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sanctionedCases.map((application, index) => (
                  <tr key={application._id} className="hover:bg-blue-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900 border-r border-gray-200">
                      {application.appId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                      {application.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-r border-gray-200">
                      {application.branch}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-r border-gray-200">
                      {application.loanType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700 border-r border-gray-200">
                      ₹{application.sanctionedAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                        application.status === 'active' ? 'bg-green-100 text-green-800 border border-green-300' :
                        application.status === 'expired' ? 'bg-red-100 text-red-800 border border-red-300' :
                        application.status === 'utilized' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        'bg-gray-100 text-gray-800 border border-gray-300'
                      }`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => onRaiseQuery(application.appId)}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 shadow-sm"
                      >
                        Raise Query
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {/* Mobile Section Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-lg border border-blue-200">
          <h3 className="text-md font-semibold text-gray-800">📱 Sanctioned Applications</h3>
          <p className="text-xs text-gray-600 mt-1">Mobile view - All sanctioned applications</p>
        </div>
        
        {sanctionedCases.map((application, index) => (
          <div key={application._id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200">
            {/* Card Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-bold text-blue-900 text-lg">{application.appId}</p>
                <p className="text-sm font-medium text-gray-800">{application.customerName}</p>
              </div>
              <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                application.status === 'active' ? 'bg-green-100 text-green-800 border border-green-300' :
                application.status === 'expired' ? 'bg-red-100 text-red-800 border border-red-300' :
                application.status === 'utilized' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                'bg-gray-100 text-gray-800 border border-gray-300'
              }`}>
                {application.status}
              </span>
            </div>
            
            {/* Systematic Data Display */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-semibold text-gray-600">Branch Name:</span>
                <span className="font-medium text-gray-900">{application.branch}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-semibold text-gray-600">Task Name:</span>
                <span className="font-medium text-gray-900">{application.loanType}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-semibold text-gray-600">Sanction Amount:</span>
                <span className="font-bold text-green-700 text-lg">₹{application.sanctionedAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            {/* Action Button */}
            <div className="mt-5 pt-4 border-t border-gray-200">
              <button
                onClick={() => onRaiseQuery(application.appId)}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 px-4 rounded-md font-medium text-sm transition-colors duration-200 shadow-sm"
              >
                Raise Query
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
} 