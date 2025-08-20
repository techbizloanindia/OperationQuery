'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Download,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  PieChart
} from 'lucide-react';

export default function SalesReports() {
  const [reportData, setReportData] = useState({
    totalQueries: 0,
    resolvedQueries: 0,
    pendingQueries: 0,
    avgResolutionTime: '0h',
    resolutionRate: 0,
    monthlyTrend: [],
    priorityBreakdown: { high: 0, medium: 0, low: 0 },
    branchBreakdown: [] as { branch: string; count: number; }[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod]);

  const fetchReportData = async () => {
    try {
      const response = await fetch('/api/queries?team=sales');
      const result = await response.json();
      
      if (result.success) {
        const queries = result.data;
        const resolved = queries.filter((q: any) => q.status === 'resolved');
        const pending = queries.filter((q: any) => q.status === 'pending');
        
        // Calculate priority breakdown
        const priorityBreakdown = {
          high: queries.filter((q: any) => q.priority === 'high').length,
          medium: queries.filter((q: any) => q.priority === 'medium').length,
          low: queries.filter((q: any) => q.priority === 'low').length
        };

        // Calculate branch breakdown
        const branchCounts: { [key: string]: number } = {};
        queries.forEach((q: any) => {
          branchCounts[q.branch] = (branchCounts[q.branch] || 0) + 1;
        });
        const branchBreakdown = Object.entries(branchCounts)
          .map(([branch, count]) => ({ branch, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setReportData({
          totalQueries: queries.length,
          resolvedQueries: resolved.length,
          pendingQueries: pending.length,
          avgResolutionTime: '2.4h', // Mock calculation
          resolutionRate: queries.length > 0 ? Math.round((resolved.length / queries.length) * 100) : 0,
          monthlyTrend: [], // Mock data
          priorityBreakdown,
          branchBreakdown
        });
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = () => {
    const reportContent = `
Sales Team Query Report - ${new Date().toLocaleDateString()}
Generated on: ${new Date().toLocaleString()}

SUMMARY STATISTICS:
- Total Queries: ${reportData.totalQueries}
- Resolved Queries: ${reportData.resolvedQueries}
- Pending Queries: ${reportData.pendingQueries}
- Resolution Rate: ${reportData.resolutionRate}%
- Average Resolution Time: ${reportData.avgResolutionTime}

PRIORITY BREAKDOWN:
- High Priority: ${reportData.priorityBreakdown.high}
- Medium Priority: ${reportData.priorityBreakdown.medium}
- Low Priority: ${reportData.priorityBreakdown.low}

TOP BRANCHES BY QUERY VOLUME:
${reportData.branchBreakdown.map((branch, index) => 
  `${index + 1}. ${branch.branch}: ${branch.count} queries`
).join('\n')}

Report Period: ${selectedPeriod}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.txt`);
    a.click();
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Reports</h1>
            <p className="text-gray-600">Analytics and insights for sales team performance</p>
          </div>
          <div className="flex space-x-3 mt-4 sm:mt-0">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
            <button
              onClick={generateReport}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Queries</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalQueries}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">All time queries handled</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
              <p className="text-2xl font-bold text-green-600">{reportData.resolutionRate}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Queries successfully resolved</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Resolution Time</p>
              <p className="text-2xl font-bold text-purple-600">{reportData.avgResolutionTime}</p>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Average time to resolve</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Queries</p>
              <p className="text-2xl font-bold text-orange-600">{reportData.pendingQueries}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Queries awaiting resolution</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Priority Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Priority Breakdown</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">High Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{reportData.priorityBreakdown.high}</span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${reportData.totalQueries > 0 ? (reportData.priorityBreakdown.high / reportData.totalQueries) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Medium Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{reportData.priorityBreakdown.medium}</span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${reportData.totalQueries > 0 ? (reportData.priorityBreakdown.medium / reportData.totalQueries) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Low Priority</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{reportData.priorityBreakdown.low}</span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${reportData.totalQueries > 0 ? (reportData.priorityBreakdown.low / reportData.totalQueries) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Query Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Query Trend</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">This Week</span>
              <span className="font-medium text-green-600">↗ +15%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Week</span>
              <span className="font-medium text-gray-900">24 queries</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">This Month</span>
              <span className="font-medium text-blue-600">↗ +8%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Month</span>
              <span className="font-medium text-gray-900">89 queries</span>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Performance */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Top Branches by Query Volume</h3>
          <BarChart className="h-5 w-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          {reportData.branchBreakdown.length > 0 ? (
            reportData.branchBreakdown.map((branch, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 w-8">#{index + 1}</span>
                  <span className="text-sm text-gray-700">{branch.branch}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${reportData.totalQueries > 0 ? (branch.count / reportData.totalQueries) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{branch.count}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No branch data available</p>
          )}
        </div>
      </div>
    </div>
  );
}