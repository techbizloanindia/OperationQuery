'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaChartLine, 
  FaChartBar, 
  FaChartPie, 
  FaArrowUp,
  FaArrowDown,
  FaCalendarAlt,
  FaFilter
} from 'react-icons/fa';

interface CreditAnalyticsProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

interface AnalyticsData {
  approvalRate: number;
  rejectionRate: number;
  monthlyTrends: Array<{
    month: string;
    applications: number;
    approved: number;
    rejected: number;
  }>;
  riskDistribution: Array<{
    risk: string;
    count: number;
    percentage: number;
  }>;
  branchPerformance: Array<{
    branch: string;
    applications: number;
    approvalRate: number;
  }>;
}

const CreditAnalytics: React.FC<CreditAnalyticsProps> = ({
  refreshTrigger = 0,
  onRefresh
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    approvalRate: 0,
    rejectionRate: 0,
    monthlyTrends: [],
    riskDistribution: [],
    branchPerformance: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/queries/analytics?team=credit&period=${selectedPeriod}`);
      const result = await response.json();
      
      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        // Demo data fallback
        setAnalyticsData({
          approvalRate: 76.5,
          rejectionRate: 23.5,
          monthlyTrends: [
            { month: 'Jan', applications: 45, approved: 34, rejected: 11 },
            { month: 'Feb', applications: 52, approved: 40, rejected: 12 },
            { month: 'Mar', applications: 48, approved: 37, rejected: 11 },
            { month: 'Apr', applications: 61, approved: 47, rejected: 14 },
            { month: 'May', applications: 58, approved: 44, rejected: 14 },
            { month: 'Jun', applications: 55, approved: 42, rejected: 13 }
          ],
          riskDistribution: [
            { risk: 'Low Risk', count: 89, percentage: 57.1 },
            { risk: 'Medium Risk', count: 45, percentage: 28.8 },
            { risk: 'High Risk', count: 22, percentage: 14.1 }
          ],
          branchPerformance: [
            { branch: 'Mumbai Central', applications: 34, approvalRate: 82.4 },
            { branch: 'Delhi NCR', applications: 28, approvalRate: 75.0 },
            { branch: 'Bangalore Tech', applications: 31, approvalRate: 77.4 },
            { branch: 'Chennai South', applications: 25, approvalRate: 72.0 },
            { branch: 'Pune West', applications: 22, approvalRate: 68.2 }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Use demo data on error
      setAnalyticsData({
        approvalRate: 76.5,
        rejectionRate: 23.5,
        monthlyTrends: [
          { month: 'Jan', applications: 45, approved: 34, rejected: 11 },
          { month: 'Feb', applications: 52, approved: 40, rejected: 12 },
          { month: 'Mar', applications: 48, approved: 37, rejected: 11 },
          { month: 'Apr', applications: 61, approved: 47, rejected: 14 },
          { month: 'May', applications: 58, approved: 44, rejected: 14 },
          { month: 'Jun', applications: 55, approved: 42, rejected: 13 }
        ],
        riskDistribution: [
          { risk: 'Low Risk', count: 89, percentage: 57.1 },
          { risk: 'Medium Risk', count: 45, percentage: 28.8 },
          { risk: 'High Risk', count: 22, percentage: 14.1 }
        ],
        branchPerformance: [
          { branch: 'Mumbai Central', applications: 34, approvalRate: 82.4 },
          { branch: 'Delhi NCR', applications: 28, approvalRate: 75.0 },
          { branch: 'Bangalore Tech', applications: 31, approvalRate: 77.4 },
          { branch: 'Chennai South', applications: 25, approvalRate: 72.0 },
          { branch: 'Pune West', applications: 22, approvalRate: 68.2 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [refreshTrigger, selectedPeriod]);

  const periodOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <span className="ml-3 text-green-600 font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Credit Analytics</h1>
            <p className="text-gray-600">Comprehensive credit performance insights</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FaFilter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Approval Rate</p>
                <p className="text-2xl font-bold text-green-600">{analyticsData.approvalRate}%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <FaArrowUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Rejection Rate</p>
                <p className="text-2xl font-bold text-red-600">{analyticsData.rejectionRate}%</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <FaArrowDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total Applications</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analyticsData.monthlyTrends.reduce((sum, trend) => sum + trend.applications, 0)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FaChartBar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">High Risk Cases</p>
                <p className="text-2xl font-bold text-orange-600">
                  {analyticsData.riskDistribution.find(r => r.risk === 'High Risk')?.count || 0}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <FaChartPie className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trends */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-6">
              <FaChartLine className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
            </div>
            <div className="space-y-4">
              {analyticsData.monthlyTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">{trend.month}</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">{trend.approved} approved</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">{trend.rejected} rejected</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center mb-6">
              <FaChartPie className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Risk Distribution</h3>
            </div>
            <div className="space-y-4">
              {analyticsData.riskDistribution.map((risk, index) => {
                const colors = ['bg-green-500', 'bg-yellow-500', 'bg-red-500'];
                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700 font-medium">{risk.risk}</span>
                      <span className="text-gray-600">{risk.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${colors[index]} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${risk.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Branch Performance */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center mb-6">
            <FaChartBar className="h-6 w-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Branch Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Branch</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Applications</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Approval Rate</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Performance</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.branchPerformance.map((branch, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{branch.branch}</td>
                    <td className="py-3 px-4 text-gray-600">{branch.applications}</td>
                    <td className="py-3 px-4 text-gray-600">{branch.approvalRate}%</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${branch.approvalRate}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm ${
                          branch.approvalRate >= 80 ? 'text-green-600' :
                          branch.approvalRate >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {branch.approvalRate >= 80 ? 'Excellent' :
                           branch.approvalRate >= 70 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditAnalytics;
