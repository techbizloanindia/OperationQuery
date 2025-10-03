'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FaFileAlt,
  FaDownload,
  FaCalendarAlt,
  FaChartBar,
  FaTable,
  FaPrint,
  FaFilter,
  FaSearch,
  FaSpinner,
  FaSyncAlt,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import ResolvedQueriesTable from '@/components/shared/ResolvedQueriesTable';

interface CreditReportsProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<any>;
  frequency: string;
  lastGenerated: string;
}

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  generatedBy: string;
  generatedAt: string;
  fileSize: string;
  status: 'completed' | 'generating' | 'failed';
  downloadUrl?: string;
}

interface ResolvedQueryStats {
  totalResolved: number;
  approvedCount: number;
  deferredCount: number;
  otcCount: number;
  waivedCount: number;
}

const CreditReports: React.FC<CreditReportsProps> = ({
  refreshTrigger = 0,
  onRefresh
}) => {
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [resolvedQueries, setResolvedQueries] = useState<any[]>([]);
  const [queryStats, setQueryStats] = useState<ResolvedQueryStats>({
    totalResolved: 0,
    approvedCount: 0,
    deferredCount: 0,
    otcCount: 0,
    waivedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReportsData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // Fetch real-time resolved queries
      const timestamp = new Date().getTime();
      const resolvedResponse = await fetch(`/api/reports/resolved?team=credit&_=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (resolvedResponse.ok) {
        const resolvedResult = await resolvedResponse.json();
        
        if (resolvedResult.success && resolvedResult.data) {
          const queries = resolvedResult.data.queries || [];
          
          setResolvedQueries(queries);
          
          // Update stats
          const stats = resolvedResult.data.stats || {};
          setQueryStats({
            totalResolved: queries.length,
            approvedCount: queries.filter((q: any) =>
              ['approved', 'request-approved'].includes(q.status) ||
              (q.status === 'resolved' && q.resolutionReason === 'approve')
            ).length,
            deferredCount: queries.filter((q: any) =>
              ['deferred', 'request-deferral'].includes(q.status) ||
              (q.status === 'resolved' && q.resolutionReason === 'deferral')
            ).length,
            otcCount: queries.filter((q: any) =>
              ['otc', 'request-otc'].includes(q.status) ||
              (q.status === 'resolved' && q.resolutionReason === 'otc')
            ).length,
            waivedCount: queries.filter((q: any) =>
              q.status === 'waived' ||
              (q.status === 'resolved' && q.resolutionReason === 'waiver')
            ).length
          });
          
          setLastRefresh(new Date());
        }
      }
      
      // Fetch report templates
      const response = await fetch('/api/reports?team=credit');
      const result = await response.json();
      
      if (result.success) {
        setReportTemplates(result.data.templates || []);
        setGeneratedReports(result.data.generated || []);
      } else {
        // Demo data fallback
        setReportTemplates([
          {
            id: '1',
            name: 'Credit Risk Summary',
            description: 'Comprehensive overview of credit risk across all applications',
            category: 'Risk Analysis',
            icon: FaChartBar,
            frequency: 'Daily',
            lastGenerated: '2024-08-14T09:00:00Z'
          },
          {
            id: '2',
            name: 'Approval Trends Report',
            description: 'Analysis of approval and rejection trends over time',
            category: 'Performance',
            icon: FaTable,
            frequency: 'Weekly',
            lastGenerated: '2024-08-13T15:30:00Z'
          },
          {
            id: '3',
            name: 'Branch Performance Report',
            description: 'Credit performance metrics by branch location',
            category: 'Performance',
            icon: FaChartBar,
            frequency: 'Monthly',
            lastGenerated: '2024-08-01T10:00:00Z'
          },
          {
            id: '4',
            name: 'High Risk Cases Report',
            description: 'Detailed analysis of high-risk credit applications',
            category: 'Risk Analysis',
            icon: FaFileAlt,
            frequency: 'Weekly',
            lastGenerated: '2024-08-12T14:20:00Z'
          },
          {
            id: '5',
            name: 'Portfolio Analysis',
            description: 'Credit portfolio distribution and performance analysis',
            category: 'Analytics',
            icon: FaChartBar,
            frequency: 'Monthly',
            lastGenerated: '2024-08-05T11:15:00Z'
          },
          {
            id: '6',
            name: 'Regulatory Compliance Report',
            description: 'Compliance metrics and regulatory requirements status',
            category: 'Compliance',
            icon: FaFileAlt,
            frequency: 'Monthly',
            lastGenerated: '2024-08-01T16:45:00Z'
          }
        ]);
        
        setGeneratedReports([
          {
            id: '1',
            name: 'Credit Risk Summary - Aug 2024',
            type: 'Credit Risk Summary',
            generatedBy: 'Credit Manager',
            generatedAt: '2024-08-14T09:00:00Z',
            fileSize: '2.4 MB',
            status: 'completed',
            downloadUrl: '/reports/credit-risk-summary-aug-2024.pdf'
          },
          {
            id: '2',
            name: 'Branch Performance - July 2024',
            type: 'Branch Performance Report',
            generatedBy: 'Credit Analyst',
            generatedAt: '2024-08-01T10:00:00Z',
            fileSize: '1.8 MB',
            status: 'completed',
            downloadUrl: '/reports/branch-performance-july-2024.pdf'
          },
          {
            id: '3',
            name: 'High Risk Cases - Week 32',
            type: 'High Risk Cases Report',
            generatedBy: 'Risk Analyst',
            generatedAt: '2024-08-12T14:20:00Z',
            fileSize: '945 KB',
            status: 'completed',
            downloadUrl: '/reports/high-risk-cases-week-32.pdf'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching reports data:', error);
      // Use demo data on error
      setReportTemplates([
        {
          id: '1',
          name: 'Credit Risk Summary',
          description: 'Comprehensive overview of credit risk across all applications',
          category: 'Risk Analysis',
          icon: FaChartBar,
          frequency: 'Daily',
          lastGenerated: '2024-08-14T09:00:00Z'
        }
      ]);
      setGeneratedReports([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReportsData();
    
    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchReportsData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refreshTrigger, fetchReportsData]);

  const handleGenerateReport = async (templateId: string) => {
    setGeneratingReports(prev => new Set(prev).add(templateId));
    
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          period: selectedPeriod,
          branch: selectedBranch,
          team: 'credit'
        })
      });
      
      if (response.ok) {
        // Refresh reports list
        fetchReportsData();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(templateId);
        return newSet;
      });
    }
  };

  const handleDownloadReport = (report: GeneratedReport) => {
    // In a real application, this would trigger the actual download
    console.log('Downloading report:', report.name);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Risk Analysis': return 'bg-red-100 text-red-800';
      case 'Performance': return 'bg-blue-100 text-blue-800';
      case 'Analytics': return 'bg-purple-100 text-purple-800';
      case 'Compliance': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTemplates = reportTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <span className="ml-3 text-green-600 font-medium">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Credit Reports
                <span className="ml-3 inline-flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="ml-1 text-xs text-green-600 font-medium">Real-time</span>
                </span>
              </h1>
              <p className="text-gray-600">
                Generate and manage credit assessment reports
                <span className="text-xs text-gray-500 ml-2">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              </p>
            </div>
            <button
              onClick={fetchReportsData}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FaSyncAlt className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Real-time Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{queryStats.totalResolved}</p>
              </div>
              <FaCheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{queryStats.approvedCount}</p>
              </div>
              <FaCheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Deferred</p>
                <p className="text-2xl font-bold text-yellow-600">{queryStats.deferredCount}</p>
              </div>
              <FaExclamationTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">OTC</p>
                <p className="text-2xl font-bold text-blue-600">{queryStats.otcCount}</p>
              </div>
              <FaFileAlt className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Waived</p>
                <p className="text-2xl font-bold text-purple-600">{queryStats.waivedCount}</p>
              </div>
              <FaFileAlt className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Report Generation Controls */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Generation Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Reports</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Period Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>

            {/* Branch Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Branches</option>
                <option value="mumbai-central">Mumbai Central</option>
                <option value="delhi-ncr">Delhi NCR</option>
                <option value="bangalore-tech">Bangalore Tech</option>
                <option value="chennai-south">Chennai South</option>
                <option value="pune-west">Pune West</option>
              </select>
            </div>

            {/* Quick Actions */}
            <div className="flex items-end">
              <button className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                <FaCalendarAlt className="h-4 w-4 mr-2" />
                Schedule Report
              </button>
            </div>
          </div>
        </div>

        {/* Report Templates */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const Icon = template.icon;
              const isGenerating = generatingReports.has(template.id);
              
              return (
                <div key={template.id} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-3 rounded-lg mr-3">
                        <Icon className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                    <span>Frequency: {template.frequency}</span>
                    <span>Last: {new Date(template.lastGenerated).toLocaleDateString()}</span>
                  </div>
                  
                  <button
                    onClick={() => handleGenerateReport(template.id)}
                    disabled={isGenerating}
                    className={`w-full flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                      isGenerating
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FaFileAlt className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Generated Reports */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recently Generated Reports</h2>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 font-semibold text-gray-700">Report Name</th>
                    <th className="text-left py-3 px-6 font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-6 font-semibold text-gray-700">Generated By</th>
                    <th className="text-left py-3 px-6 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-6 font-semibold text-gray-700">Size</th>
                    <th className="text-left py-3 px-6 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-6 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedReports.map((report, index) => (
                    <tr key={report.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-green-50 transition-colors`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <FaFileAlt className="h-4 w-4 text-green-600 mr-2" />
                          <span className="font-medium text-gray-900">{report.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-600">{report.type}</td>
                      <td className="py-4 px-6 text-gray-600">{report.generatedBy}</td>
                      <td className="py-4 px-6 text-gray-600">
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-gray-600">{report.fileSize}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          report.status === 'completed' ? 'bg-green-100 text-green-800' :
                          report.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {report.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          {report.status === 'completed' && (
                            <>
                              <button
                                onClick={() => handleDownloadReport(report)}
                                className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                              >
                                <FaDownload className="h-3 w-3 mr-1" />
                                Download
                              </button>
                              <button className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm">
                                <FaPrint className="h-3 w-3 mr-1" />
                                Print
                              </button>
                            </>
                          )}
                          {report.status === 'generating' && (
                            <div className="flex items-center text-yellow-600 text-sm">
                              <FaSpinner className="h-3 w-3 mr-1 animate-spin" />
                              Processing...
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {generatedReports.length === 0 && (
              <div className="text-center py-12">
                <FaFileAlt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports generated yet</h3>
                <p className="text-gray-600">Generate your first report using the templates above.</p>
              </div>
            )}
          </div>
        </div>

        {/* Resolved Queries Section */}
        {resolvedQueries.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Resolved Credit Queries
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({resolvedQueries.length} queries - Unknown entries excluded)
              </span>
            </h2>
            <div className="bg-white rounded-xl shadow-lg p-4">

              <ResolvedQueriesTable
                queries={resolvedQueries.map(q => ({
                  id: q.id,
                  queryId: q.id,
                  title: q.title || `Query - ${q.appNo}`,
                  caseId: q.appNo,
                  customerName: q.customerName,
                  branch: q.branch,
                  priority: q.priority || 'medium',
                  team: q.team || 'credit',
                  resolvedAt: q.resolvedAt || q.lastUpdated,
                  resolvedBy: q.resolvedBy || q.approvedBy || 'System',
                  resolutionReason: q.resolutionReason || q.status,
                  history: q.history || []
                }))}
                onQueryClick={(query) => {
                  console.log('Query clicked:', query);
                  // Handle query click - could navigate to details page
                }}
                isLoading={loading}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditReports;
