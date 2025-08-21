'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ApprovalSidebar from './ApprovalSidebar';
import { 
  BarChart3, 
  Download, 
  Calendar,
  FileText,
  TrendingUp,
  PieChart,
  Filter,
  Eye,
  Plus,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  X
} from 'lucide-react';

const ApprovalReports: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'reports'>('reports');
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(true);

  // Real-time approval stats
  const [approvalStats, setApprovalStats] = useState({
    totalRequests: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    approvalRate: 0,
    avgProcessingTime: '0 hours',
    slaCompliance: 0,
    monthlyTrend: '+0%'
  });

  // Approved queries data
  const [approvedQueries, setApprovedQueries] = useState<any[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [approverFilter, setApproverFilter] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch real-time approval data for reports
  const fetchApprovalReportsData = async () => {
    try {
      // Fetch both approval requests and actual approved queries
      const [approvalsResponse, queriesResponse] = await Promise.all([
        fetch('/api/approvals', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        fetch('/api/queries', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
      ]);
      
      const approvalsResult = await approvalsResponse.json();
      const queriesResult = await queriesResponse.json();
      
      if (approvalsResult.success && approvalsResult.data) {
        const allApprovals = approvalsResult.data.approvals || [];
        
        // Calculate real-time stats
        const totalRequests = allApprovals.length;
        const approved = allApprovals.filter((approval: any) => approval.status === 'approved').length;
        const rejected = allApprovals.filter((approval: any) => approval.status === 'rejected').length;
        const pending = allApprovals.filter((approval: any) => approval.status === 'pending').length;
        const approvalRate = totalRequests > 0 ? (approved / totalRequests) * 100 : 0;
        
        // Calculate SLA compliance
        const completedApprovals = allApprovals.filter((approval: any) => 
          approval.status === 'approved' || approval.status === 'rejected'
        );
        const slaCompliant = completedApprovals.filter((approval: any) => 
          approval.slaStatus === 'on-time'
        ).length;
        const slaCompliance = completedApprovals.length > 0 ? 
          (slaCompliant / completedApprovals.length) * 100 : 0;

        setApprovalStats({
          totalRequests,
          approved,
          rejected,
          pending,
          approvalRate: Math.round(approvalRate * 10) / 10,
          avgProcessingTime: approvalsResult.data.stats?.averageApprovalTime || '2.4 hours',
          slaCompliance: Math.round(slaCompliance * 10) / 10,
          monthlyTrend: '+12.5%' // This could be calculated from historical data
        });
      }
      
      // Process approved queries data
      if (queriesResult.success && queriesResult.data) {
        const allQueries = queriesResult.data || [];
        
        // Filter and process approved queries
        const approvedQueriesData: any[] = [];
        
        allQueries.forEach((queryGroup: any) => {
          if (queryGroup && Array.isArray(queryGroup.queries)) {
            queryGroup.queries.forEach((query: any, index: number) => {
              const queryStatus = query.status || queryGroup.status;
              
              // Only include approved, deferred, or otc queries
              if (['request-approved', 'request-deferral', 'request-otc', 'approved', 'deferred', 'otc'].includes(queryStatus)) {
                approvedQueriesData.push({
                  id: query.id || `${queryGroup.id}-${index}`,
                  appNo: queryGroup.appNo,
                  customerName: queryGroup.customerName,
                  queryText: query.text,
                  status: queryStatus,
                  branch: queryGroup.branch,
                  submittedBy: queryGroup.submittedBy,
                  submittedAt: queryGroup.submittedAt,
                  resolvedAt: query.resolvedAt || queryGroup.resolvedAt || queryGroup.lastUpdated,
                  resolvedBy: query.resolvedBy || queryGroup.resolvedBy || 'Operations Team',
                  approverName: query.approverName || queryGroup.approverName || query.assignedTo || queryGroup.assignedTo || 'Approval Team',
                  approverComment: query.approverComment || queryGroup.approverComment || query.resolutionReason || queryGroup.resolutionReason || '',
                  remarks: query.remarks || queryGroup.remarks || query.approverComment || queryGroup.approverComment || 'No remarks'
                });
              }
            });
          } else if (queryGroup && ['request-approved', 'request-deferral', 'request-otc', 'approved', 'deferred', 'otc'].includes(queryGroup.status)) {
            // Handle single query cases
            approvedQueriesData.push({
              id: queryGroup.id,
              appNo: queryGroup.appNo,
              customerName: queryGroup.customerName,
              queryText: queryGroup.title || `Query for ${queryGroup.appNo}`,
              status: queryGroup.status,
              branch: queryGroup.branch,
              submittedBy: queryGroup.submittedBy,
              submittedAt: queryGroup.submittedAt,
              resolvedAt: queryGroup.resolvedAt || queryGroup.lastUpdated,
              resolvedBy: queryGroup.resolvedBy || 'Operations Team',
              approverName: queryGroup.approverName || queryGroup.assignedTo || 'Approval Team',
              approverComment: queryGroup.approverComment || queryGroup.resolutionReason || '',
              remarks: queryGroup.remarks || queryGroup.approverComment || 'No remarks'
            });
          }
        });
        
        // Sort by resolution date (most recent first)
        approvedQueriesData.sort((a, b) => 
          new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime()
        );
        
        setApprovedQueries(approvedQueriesData);
        setFilteredQueries(approvedQueriesData);
      }
    } catch (error) {
      console.error('Error fetching approval reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalReportsData();
    
    // Set up polling for real-time updates every 10 seconds for faster updates
    const interval = setInterval(fetchApprovalReportsData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Filter approved queries based on status and approver
  useEffect(() => {
    let filtered = approvedQueries;
    
    if (statusFilter) {
      filtered = filtered.filter(query => query.status === statusFilter);
    }
    
    if (approverFilter) {
      filtered = filtered.filter(query => 
        query.approverName.toLowerCase().includes(approverFilter.toLowerCase())
      );
    }
    
    setFilteredQueries(filtered);
  }, [approvedQueries, statusFilter, approverFilter]);

  const [recentReports, setRecentReports] = useState([
    {
      id: '1',
      name: 'Real-time Approval Analysis',
      type: 'Live Report',
      dateRange: 'Real-time Data',
      status: 'Live',
      format: 'JSON',
      size: 'Real-time',
      generatedAt: 'Live Updates',
      downloadUrl: '#'
    },
    {
      id: '2',
      name: 'Daily Approval Summary',
      type: 'Summary',
      dateRange: new Date().toLocaleDateString(),
      status: 'Generated',
      format: 'PDF',
      size: '1.2 MB',
      generatedAt: new Date().toLocaleString(),
      downloadUrl: '#'
    },
    {
      id: '3',
      name: 'Weekly Approval Trends',
      type: 'Analytics',
      dateRange: 'Last 7 Days',
      status: 'Generated',
      format: 'Excel',
      size: '854 KB',
      generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString(), // 2 hours ago
      downloadUrl: '#'
    }
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);



  const handleDownloadReport = async (reportId: string) => {
    const report = recentReports.find(r => r.id === reportId);
    if (!report) return;

    try {
      // For real-time live report, generate JSON data
      if (report.type === 'Live Report') {
        const jsonData = {
          reportName: report.name,
          generatedAt: new Date().toISOString(),
          data: {
            totalRequests: approvalStats.totalRequests,
            approved: approvalStats.approved,
            rejected: approvalStats.rejected,
            pending: approvalStats.pending,
            approvalRate: approvalStats.approvalRate,
            avgProcessingTime: approvalStats.avgProcessingTime,
            slaCompliance: approvalStats.slaCompliance,
            monthlyTrend: approvalStats.monthlyTrend,
            approvedQueries: approvedQueries
          },
          metadata: {
            reportType: 'Real-time Analysis',
            format: 'JSON',
            exportedBy: 'Approval Team'
          }
        };

        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `approval-analysis-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (report.format === 'Excel' || report.format === 'excel') {
        // Generate Excel file with approved queries data
        await handleDownloadExcelReport();
      } else {
        // For other reports, simulate download
        const blob = new Blob([`Report: ${report.name}\nGenerated: ${report.generatedAt}\nFormat: ${report.format}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  // Function to generate and download Excel report
  const handleDownloadExcelReport = async () => {
    try {
      // Create CSV content with approved queries data
      const headers = [
        'Application No',
        'Customer Name',
        'Query Text',
        'Status',
        'Branch',
        'Submitted By',
        'Submitted Date',
        'Resolved Date',
        'Resolved By',
        'Approver Name',
        'Approver Remarks'
      ];

      const csvContent = [
        headers.join(','),
        ...filteredQueries.map(query => [
          `"${query.appNo}"`,
          `"${query.customerName}"`,
          `"${query.queryText.replace(/"/g, '""')}"`,
          `"${query.status === 'request-approved' || query.status === 'approved' ? 'Request Approved' : 
              query.status === 'request-deferral' || query.status === 'deferred' ? 'Request Deferral' : 
              query.status === 'request-otc' || query.status === 'otc' ? 'Request OTC' : query.status}"`,
          `"${query.branch}"`,
          `"${query.submittedBy}"`,
          `"${new Date(query.submittedAt).toLocaleDateString()}"`,
          `"${new Date(query.resolvedAt).toLocaleDateString()}"`,
          `"${query.resolvedBy}"`,
          `"${query.approverName}"`,
          `"${query.remarks.replace(/"/g, '""')}"`
        ].join(','))
      ].join('\\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `approval-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating Excel report:', error);
      alert('Failed to generate Excel report. Please try again.');
    }
  };

  const handleViewReport = (reportId: string) => {
    const report = recentReports.find(r => r.id === reportId);
    if (report) {
      setSelectedReport(report);
      setViewModalOpen(true);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newReport = {
        id: (recentReports.length + 1).toString(),
        name: `Custom Approval Report ${new Date().getTime()}`,
        type: 'Custom',
        dateRange: new Date().toLocaleDateString(),
        status: 'Generated',
        format: 'PDF',
        size: Math.floor(Math.random() * 2000 + 500) + ' KB',
        generatedAt: new Date().toLocaleString(),
        downloadUrl: '#'
      };

      setRecentReports(prev => [newReport, ...prev]);
      alert('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = () => {
    fetchApprovalReportsData();
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white p-2 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`transform transition-transform duration-300 lg:transform-none lg:block ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } fixed lg:relative z-40 lg:z-auto`}>
        <ApprovalSidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 lg:ml-0 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Image 
                src="/logo.png" 
                alt="Bizloan Logo" 
                width={48} 
                height={48} 
                className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-3xl font-bold text-gray-900 leading-tight">
                  <span className="lg:hidden">Approval Reports</span>
                  <span className="hidden lg:inline">Bizloan Approval Reports</span>
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1">Comprehensive approval analytics and reporting</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Generate Report'}</span>
                <span className="sm:hidden">{isGenerating ? '...' : 'Generate'}</span>
              </button>
              <button 
                onClick={handleRefresh}
                className="flex items-center space-x-1 sm:space-x-2 bg-gray-600 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-4 sm:mb-6">
          <nav className="flex space-x-4 sm:space-x-8 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setSelectedTab('reports')}
              className="py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors border-blue-500 text-blue-600 whitespace-nowrap"
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Generated Reports</span>
                <span className="sm:hidden">Reports</span>
              </div>
            </button>
          </nav>
        </div>


        {/* Reports Tab */}
        {selectedTab === 'reports' && (
          <div className="space-y-6">
            {/* Approval Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-green-600" />
                  </div>
                  <div className="ml-2 sm:ml-3 lg:ml-5 min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Approved</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{approvedQueries.length}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-blue-600" />
                  </div>
                  <div className="ml-2 sm:ml-3 lg:ml-5 min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Unique Approvers</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                      {[...new Set(approvedQueries.map(q => q.approverName))].length}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-yellow-600" />
                  </div>
                  <div className="ml-2 sm:ml-3 lg:ml-5 min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Today's Approvals</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                      {approvedQueries.filter(q => 
                        new Date(q.resolvedAt).toDateString() === new Date().toDateString()
                      ).length}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-purple-600" />
                  </div>
                  <div className="ml-2 sm:ml-3 lg:ml-5 min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">This Week</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                      {approvedQueries.filter(q => {
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return new Date(q.resolvedAt) >= weekAgo;
                      }).length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by approver name..."
                      value={approverFilter}
                      onChange={(e) => setApproverFilter(e.target.value)}
                      className="w-full sm:w-auto pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    />
                  </div>
                  <div className="flex space-x-2 sm:space-x-4">
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="">All Status</option>
                      <option value="approved">Request Approved</option>
                      <option value="deferred">Request Deferral</option>
                      <option value="otc">Request OTC</option>
                    </select>
                    <select className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white">
                      <option value="">All Formats</option>
                      <option value="pdf">PDF</option>
                      <option value="excel">Excel</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {(statusFilter || approverFilter) && (
                    <button 
                      onClick={() => {
                        setStatusFilter('');
                        setApproverFilter('');
                      }}
                      className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">More Filters</span>
                    <span className="sm:hidden">Filters</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Approved Queries Data */}
            <div className="bg-white rounded-lg lg:rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Approved Queries Report</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Detailed list of all approved queries with approver information</p>
                  </div>
                  <button
                    onClick={handleDownloadExcelReport}
                    className="flex items-center space-x-2 bg-green-600 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export to Excel</span>
                    <span className="sm:hidden">Export</span>
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading approved queries...</p>
                </div>
              ) : filteredQueries.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Approved Queries Found</h4>
                  <p className="text-gray-600">
                    {approvedQueries.length === 0 
                      ? "No queries have been approved yet." 
                      : "No queries match the current filters."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">App No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query Text</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approver Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approver Remarks</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resolved Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredQueries.map((query, index) => (
                        <tr key={`${query.id}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{query.appNo}</div>
                            <div className="text-sm text-gray-500">{query.branch}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{query.customerName}</div>
                            <div className="text-sm text-gray-500">by {query.submittedBy}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate" title={query.queryText}>
                              {query.queryText}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              query.status === 'request-approved' || query.status === 'approved' ? 'bg-green-100 text-green-800' :
                              query.status === 'request-deferral' || query.status === 'deferred' ? 'bg-yellow-100 text-yellow-800' :
                              query.status === 'request-otc' || query.status === 'otc' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {query.status === 'request-approved' || query.status === 'approved' ? 'Request Approved' :
                               query.status === 'request-deferral' || query.status === 'deferred' ? 'Request Deferral' :
                               query.status === 'request-otc' || query.status === 'otc' ? 'Request OTC' :
                               query.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{query.approverName}</div>
                            <div className="text-sm text-gray-500">Resolved by {query.resolvedBy}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs" title={query.remarks}>
                              {query.remarks || 'No remarks provided'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(query.resolvedAt).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(query.resolvedAt).toLocaleTimeString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Reports List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{report.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            {report.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.dateRange}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            report.status === 'Generated' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="uppercase text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {report.format}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.size}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.generatedAt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {report.downloadUrl && (
                              <button
                                onClick={() => handleDownloadReport(report.id)}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors flex items-center space-x-1"
                                title="Download Report"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </button>
                            )}
                            <button 
                              onClick={() => handleViewReport(report.id)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                              title="View Report"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* View Report Modal */}
        {viewModalOpen && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Report Preview</h3>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{selectedReport.name}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Type:</span>
                      <span className="ml-2 text-gray-900">{selectedReport.type}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Date Range:</span>
                      <span className="ml-2 text-gray-900">{selectedReport.dateRange}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Format:</span>
                      <span className="ml-2 text-gray-900">{selectedReport.format}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Size:</span>
                      <span className="ml-2 text-gray-900">{selectedReport.size}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedReport.status === 'Live' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedReport.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Generated:</span>
                      <span className="ml-2 text-gray-900">{selectedReport.generatedAt}</span>
                    </div>
                  </div>
                </div>

                {selectedReport.type === 'Live Report' && (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <h5 className="font-medium text-blue-900 mb-3">Real-time Approval Statistics</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Total Requests:</span>
                          <span className="font-medium text-blue-900">{approvalStats.totalRequests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Approved:</span>
                          <span className="font-medium text-green-600">{approvalStats.approved}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Pending:</span>
                          <span className="font-medium text-yellow-600">{approvalStats.pending}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Rejected:</span>
                          <span className="font-medium text-red-600">{approvalStats.rejected}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Approval Rate:</span>
                          <span className="font-medium text-blue-900">{approvalStats.approvalRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Avg Processing Time:</span>
                          <span className="font-medium text-blue-900">{approvalStats.avgProcessingTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">SLA Compliance:</span>
                          <span className="font-medium text-green-600">{approvalStats.slaCompliance}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Monthly Trend:</span>
                          <span className="font-medium text-blue-900">{approvalStats.monthlyTrend}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h5 className="font-medium text-green-900 mb-3">
                        Recent Approved Queries ({approvedQueries.length})
                      </h5>
                      {approvedQueries.length === 0 ? (
                        <p className="text-green-700 text-sm">No approved queries found.</p>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {approvedQueries.slice(0, 5).map((query, index) => (
                            <div key={index} className="bg-white p-2 rounded border text-sm">
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900">{query.appNo} - {query.customerName}</div>
                                  <div className="text-gray-600 truncate">{query.queryText}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Approved by: <span className="font-medium">{query.approverName}</span>
                                    {query.remarks && <span className="ml-2">• {query.remarks}</span>}
                                  </div>
                                </div>
                                <span className={`ml-2 px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                                  query.status === 'request-approved' || query.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  query.status === 'request-deferral' || query.status === 'deferred' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {query.status === 'request-approved' || query.status === 'approved' ? 'Approved' :
                                   query.status === 'request-deferral' || query.status === 'deferred' ? 'Deferral' : 'OTC'}
                                </span>
                              </div>
                            </div>
                          ))}
                          {approvedQueries.length > 5 && (
                            <div className="text-center">
                              <span className="text-green-700 text-sm">
                                and {approvedQueries.length - 5} more queries...
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {selectedReport.type !== 'Live Report' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">Report Content Preview</h5>
                    <p className="text-gray-600 text-sm">
                      This is a {selectedReport.format} report containing {selectedReport.type.toLowerCase()} data 
                      for the period: {selectedReport.dateRange}. 
                      The full report can be downloaded using the Download button.
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setViewModalOpen(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleDownloadReport(selectedReport.id);
                      setViewModalOpen(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Report</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ApprovalReports;
