'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaTimesCircle,
  FaCalculator,
  FaChartBar,
  FaUser,
  FaFileAlt,
  FaSearch,
  FaFilter
} from 'react-icons/fa';

interface CreditRiskAssessmentProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

interface RiskAssessment {
  id: string;
  appNo: string;
  customerName: string;
  creditAmount: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  assessmentDate: string;
  assessedBy: string;
  factors: {
    creditHistory: number;
    income: number;
    collateral: number;
    employment: number;
    debt: number;
  };
  recommendation: 'approve' | 'reject' | 'review';
  comments: string;
  branch: string;
  status: 'pending' | 'completed' | 'reviewed';
}

const CreditRiskAssessment: React.FC<CreditRiskAssessmentProps> = ({
  refreshTrigger = 0,
  onRefresh
}) => {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAssessment, setSelectedAssessment] = useState<RiskAssessment | null>(null);
  const [newAssessment, setNewAssessment] = useState(false);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/queries/risk-assessments?team=credit');
      const result = await response.json();
      
      if (result.success) {
        setAssessments(result.data.assessments || []);
      } else {
        // Demo data fallback
        setAssessments([
          {
            id: '1',
            appNo: 'APP001',
            customerName: 'Rajesh Kumar',
            creditAmount: '₹5,00,000',
            riskScore: 72,
            riskLevel: 'medium',
            assessmentDate: '2024-08-14T10:30:00Z',
            assessedBy: 'Credit Analyst 1',
            factors: {
              creditHistory: 80,
              income: 75,
              collateral: 65,
              employment: 85,
              debt: 60
            },
            recommendation: 'review',
            comments: 'Stable employment but high debt ratio requires review',
            branch: 'Mumbai Central',
            status: 'pending'
          },
          {
            id: '2',
            appNo: 'APP002',
            customerName: 'Priya Sharma',
            creditAmount: '₹3,00,000',
            riskScore: 85,
            riskLevel: 'low',
            assessmentDate: '2024-08-14T09:15:00Z',
            assessedBy: 'Credit Analyst 2',
            factors: {
              creditHistory: 90,
              income: 85,
              collateral: 80,
              employment: 90,
              debt: 85
            },
            recommendation: 'approve',
            comments: 'Excellent credit profile with low risk indicators',
            branch: 'Delhi NCR',
            status: 'completed'
          },
          {
            id: '3',
            appNo: 'APP003',
            customerName: 'Amit Patel',
            creditAmount: '₹15,00,000',
            riskScore: 45,
            riskLevel: 'high',
            assessmentDate: '2024-08-13T16:45:00Z',
            assessedBy: 'Credit Analyst 1',
            factors: {
              creditHistory: 40,
              income: 50,
              collateral: 45,
              employment: 60,
              debt: 30
            },
            recommendation: 'reject',
            comments: 'Poor credit history and insufficient collateral coverage',
            branch: 'Bangalore Tech',
            status: 'reviewed'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching risk assessments:', error);
      // Use demo data on error
      setAssessments([
        {
          id: '1',
          appNo: 'APP001',
          customerName: 'Rajesh Kumar',
          creditAmount: '₹5,00,000',
          riskScore: 72,
          riskLevel: 'medium',
          assessmentDate: '2024-08-14T10:30:00Z',
          assessedBy: 'Credit Analyst 1',
          factors: {
            creditHistory: 80,
            income: 75,
            collateral: 65,
            employment: 85,
            debt: 60
          },
          recommendation: 'review',
          comments: 'Stable employment but high debt ratio requires review',
          branch: 'Mumbai Central',
          status: 'pending'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [refreshTrigger]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'approve': return 'text-green-600';
      case 'reject': return 'text-red-600';
      case 'review': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'approve': return FaCheckCircle;
      case 'reject': return FaTimesCircle;
      case 'review': return FaExclamationTriangle;
      default: return FaFileAlt;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          assessment.appNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'all' || assessment.riskLevel === riskFilter;
    const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter;
    
    return matchesSearch && matchesRisk && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <span className="ml-3 text-green-600 font-medium">Loading risk assessments...</span>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Risk Assessment</h1>
            <p className="text-gray-600">Credit risk evaluation and analysis</p>
          </div>
          
          <button
            onClick={() => setNewAssessment(true)}
            className="mt-4 md:mt-0 flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <FaCalculator className="h-4 w-4 mr-2" />
            New Assessment
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by customer name or app number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Risk Filter */}
            <div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assessment List */}
        <div className="space-y-6">
          {filteredAssessments.map((assessment) => {
            const RecommendationIcon = getRecommendationIcon(assessment.recommendation);
            
            return (
              <div key={assessment.id} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Basic Info */}
                  <div>
                    <div className="flex items-center space-x-3 mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{assessment.appNo}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(assessment.riskLevel)}`}>
                        {assessment.riskLevel.toUpperCase()} RISK
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Customer</p>
                        <p className="font-medium text-gray-900">{assessment.customerName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Credit Amount</p>
                        <p className="font-medium text-gray-900">{assessment.creditAmount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Branch</p>
                        <p className="font-medium text-gray-900">{assessment.branch}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Assessed By</p>
                        <p className="font-medium text-gray-900">{assessment.assessedBy}</p>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column - Risk Score & Factors */}
                  <div>
                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-500 mb-1">Risk Score</p>
                      <p className={`text-3xl font-bold ${getRiskScoreColor(assessment.riskScore)}`}>
                        {assessment.riskScore}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      {Object.entries(assessment.factors).map(([factor, score]) => (
                        <div key={factor}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600 capitalize">
                              {factor.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="text-sm font-medium text-gray-700">{score}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                score >= 80 ? 'bg-green-500' :
                                score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${score}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column - Recommendation & Actions */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <RecommendationIcon className={`h-5 w-5 ${getRecommendationColor(assessment.recommendation)}`} />
                      <span className={`font-semibold ${getRecommendationColor(assessment.recommendation)}`}>
                        {assessment.recommendation.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-1">Comments</p>
                      <p className="text-gray-700 text-sm">{assessment.comments}</p>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-1">Assessment Date</p>
                      <p className="text-gray-700 text-sm">
                        {new Date(assessment.assessmentDate).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedAssessment(assessment)}
                        className="w-full flex items-center justify-center px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <FaFileAlt className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                      
                      {assessment.status === 'pending' && (
                        <button className="w-full flex items-center justify-center px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors">
                          <FaCheckCircle className="h-4 w-4 mr-2" />
                          Complete Assessment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredAssessments.length === 0 && (
            <div className="text-center py-12">
              <FaShieldAlt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No risk assessments found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or create a new assessment.</p>
            </div>
          )}
        </div>

        {/* Risk Assessment Summary */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-green-100 p-4 rounded-lg mb-2">
                <FaCheckCircle className="h-8 w-8 text-green-600 mx-auto" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {assessments.filter(a => a.riskLevel === 'low').length}
              </p>
              <p className="text-gray-600">Low Risk Cases</p>
            </div>
            
            <div className="text-center">
              <div className="bg-yellow-100 p-4 rounded-lg mb-2">
                <FaExclamationTriangle className="h-8 w-8 text-yellow-600 mx-auto" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {assessments.filter(a => a.riskLevel === 'medium').length}
              </p>
              <p className="text-gray-600">Medium Risk Cases</p>
            </div>
            
            <div className="text-center">
              <div className="bg-red-100 p-4 rounded-lg mb-2">
                <FaTimesCircle className="h-8 w-8 text-red-600 mx-auto" />
              </div>
              <p className="text-2xl font-bold text-red-600">
                {assessments.filter(a => a.riskLevel === 'high').length}
              </p>
              <p className="text-gray-600">High Risk Cases</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditRiskAssessment;
