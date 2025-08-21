'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaSearch, FaSpinner, FaExclamationCircle, FaUser, FaEnvelope, FaBuilding, FaTimes, FaPlus, FaCheckCircle, FaPaperPlane, FaChevronDown } from 'react-icons/fa';
import EmptyState from './EmptyState';
import { useAuth } from '@/contexts/AuthContext';

interface AddQueryProps {
  appNo?: string;
  onQuerySubmitted?: () => void; // Add callback for navigation
}

interface ApplicationDetails {
  appNo: string;
  customerName: string;
  branchName: string;
  taskName: string;
  appliedDate: string;
  loanNo: string;
  loanAmount: string;
  customerEmail: string;
  login: string;
  assetType: string;
  sanctionedAmount: string;
  status: string;
  customerPhone: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  employeeId: string;
  loanType: string;
  lastUpdated: string;
  sanctionedDate?: string;
  tenure: string;
  interestRate: string;
  processingFee: string;
  cibilScore: number | string;
  monthlyIncome: string;
  companyName: string;
  designation: string;
  workExperience: string;
  priority?: string;
  documentStatus?: string;
  remarks?: string;
}

interface QueryItem {
  id: number;
  text: string;
  isCustom?: boolean;
  team?: 'Sales' | 'Credit' | 'Custom';
}

// Search for application
const searchApplication = async (appNo: string): Promise<ApplicationDetails | null> => {
  try {
    const response = await fetch(`/api/applications/${appNo}`);
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      let errorMessage = result.error || 'Failed to find application';
      if (result.suggestion) {
        errorMessage += `\n\n💡 Suggestion: ${result.suggestion}`;
      }
      throw new Error(errorMessage);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error searching for application:', error);
    return null;
  }
};

// Submit query
const submitQuery = async (data: {
  appNo: string;
  queries: string[];
  sendTo: string;
}): Promise<any> => {
  try {
    if (typeof window === 'undefined') {
      throw new Error('Cannot submit query: Not in browser environment');
    }

    if (!data.appNo || !data.queries || data.queries.length === 0 || !data.sendTo) {
      throw new Error('Missing required fields: appNo, queries, or sendTo');
    }

    // Get current user from localStorage for authentication
    const currentUser = localStorage.getItem('currentUser');
    let userRole = 'guest';
    let userId = 'unknown';
    
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        userRole = user.role || 'guest';
        userId = user.employeeId || 'unknown';
      } catch (parseError) {
        console.error('Failed to parse current user:', parseError);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-id': userId,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Query submitted successfully:', result);
      return result;

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }
      
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error submitting query:', error);
    const userMessage = error.message || 'Failed to submit query. Please try again.';
    throw new Error(userMessage);
  }
};

export default function AddQuery({ appNo = '', onQuerySubmitted }: AddQueryProps) {
  const [searchTerm, setSearchTerm] = useState(appNo);
  const [queries, setQueries] = useState<QueryItem[]>([{ id: 1, text: '' }]);
  const [sendTo, setSendTo] = useState<string[]>(['Sales']);
  const [searchResult, setSearchResult] = useState<ApplicationDetails | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showBothTeams, setShowBothTeams] = useState(false);
  const [isQueryDropdownOpen, setIsQueryDropdownOpen] = useState<{[key: number]: boolean}>({});
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [customQueryId, setCustomQueryId] = useState<number | null>(null);
  const [customQueryTeam, setCustomQueryTeam] = useState<'Sales' | 'Credit' | 'Both'>('Sales');
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [pendingSubmissionData, setPendingSubmissionData] = useState<{
    appNo: string;
    queries: string[];
    sendTo: string;
  } | null>(null);
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Available teams
  const availableTeams = [
    { id: 'Sales', label: '🏢 Sales Team', color: 'bg-blue-50 hover:bg-blue-100' },
    { id: 'Credit', label: '💳 Credit Team', color: 'bg-green-50 hover:bg-green-100' },
    { id: 'Both', label: '🔄 Both Teams', color: 'bg-purple-50 hover:bg-purple-100' },
  ];

  // Predefined query options
  const salesQueries = [
  "Application form missing / Incomplete filled / Photo missing / Sign missing / Cross sign missing in photo",
  "KYC missing / Self-attested missing / OSV missing / Clear image missing",
  "Signature / Any change related to rate, tenure, ROI, insurance, sanction condition, Applicant & Co-applicant details mismatch",
  "Borrower & Co-Borrower details missing / Borrower declaration form missing / RM details & sign missing",
  "Property owner details missing / Sign missing / Description of property missing",
  "Declarant details wrongly mentioned / Declarant sign in wrong place",
  "Details wrongly mentioned / Signing issue",
  "Complete login details required / Login fee missing / Cheque & online payment image missing",
  "As per sanction another person cheque / Signing issues / Favour wrong or missing / SDPC missing / If mandate done – 5 SPDC required",
  "As per sanction another person cheque / Signing issues / Favour wrong or missing / SDPC missing / As per policy all Co-Applicants 3 PDC required",
  "NACH form wrong place / Wrong details mentioned / As per sanction another person cheque",
  "Insured person sign missing, wrong place sign / Declarant sign missing / Declarant KYC missing",
  "Insured person sign missing, wrong place sign / Insurance form missing",
  "Property owner details mismatch / Date issue / Product name mismatch",
  "Signature missing / Bank account missing / Repayment change",
  "Guarantor details missing / Sign missing / Photo missing",
  "A/C details wrong / Sign missing / Bank stamp missing",
  "Repayment A/c Banking"
];

const creditQueries = [
  "Applicant & Co-Applicant details missing or wrong / Condition mismatch (ROI, tenure, processing fee, insurance etc.)",
  "Resi & office FI missing / Negative & refer cases",
  "A/C details wrong / Refer & fake cases",
  "Sign missing / Property details wrong / Product mismatch / Property value issue",
  "CIBIL & crime report missing",
  "Property owner details mismatch / Date issue / Product name mismatch & Search report issue / Document missing as per Legal (Credit/Sales overlap)",
  "Credit condition vetting issue / Condition mismatch between CAM & sanction"
];


  // React Query mutations
  const searchMutation = useMutation({
    mutationFn: searchApplication,
    onSuccess: (data) => {
      if (data) {
        setSearchResult(data);
        setSearchError(null);
      } else {
        setSearchError('Application not found. Please check the application number and try again.');
        setSearchResult(null);
      }
      setIsSearching(false);
    },
    onError: (error: Error) => {
      setSearchError(error.message);
      setSearchResult(null);
      setIsSearching(false);
    }
  });

  const submitMutation = useMutation({
    mutationFn: submitQuery,
    onSuccess: (data) => {
      console.log('🎉 Submit mutation onSuccess called with data:', data);
      console.log('📊 Query details:', {
        appNo: searchResult?.appNo,
        teams: sendTo,
        queryCount: queries.filter(q => q.text.trim()).length
      });
      
      // Don't show success message - remove this block
      // setQuerySubmitted(true);
      setSearchError(null);
      console.log('✅ Query submitted without showing success message');
      
      // Reset form only if submission was successful
      if (data && data.success) {
        setQueries([{ id: 1, text: '' }]);
        console.log('🔄 Form reset completed');
        
        // Log the created queries for debugging
        if (data.data && Array.isArray(data.data)) {
          console.log('📝 Created queries:', data.data.map((q: any) => ({
            id: q.id,
            appNo: q.appNo,
            markedForTeam: q.markedForTeam,
            sendToSales: q.sendToSales,
            sendToCredit: q.sendToCredit,
            status: q.status
          })));
        }
        
        // Invalidate all relevant query caches
        console.log('🔄 Invalidating query caches...');
        queryClient.invalidateQueries({ queryKey: ['pendingQueries'] });
        queryClient.invalidateQueries({ queryKey: ['resolvedQueries'] });
        queryClient.invalidateQueries({ queryKey: ['salesQueries'] });
        queryClient.invalidateQueries({ queryKey: ['creditQueries'] });
        queryClient.invalidateQueries({ queryKey: ['allQueries'] });
        
        // Force refetch with logging
        console.log('🔄 Force refetching queries...');
        queryClient.refetchQueries({ queryKey: ['pendingQueries'] }).then(() => {
          console.log('✅ Queries refetched successfully');
        }).catch((error) => {
          console.error('❌ Error refetching queries:', error);
        });
        console.log('🔄 Query caches invalidated and refetch initiated');
        
        // Broadcast updates
        if (typeof window !== 'undefined') {
          console.log('📡 Broadcasting query update events...');
          
          // Dispatch event for immediate UI updates
          window.dispatchEvent(new CustomEvent('queryAdded', {
            detail: {
              appNo: searchResult?.appNo,
              queriesCount: data.count || 1,
              sendTo: sendTo,
              teams: sendTo.join(', '),
              timestamp: new Date().toISOString()
            }
          }));
          
          // Store in localStorage for cross-tab sync
          localStorage.setItem('queryUpdate', JSON.stringify({
            type: 'added',
            appNo: searchResult?.appNo,
            count: data.count || 1,
            teams: sendTo.join(', '),
            timestamp: new Date().toISOString()
          }));
          
          setTimeout(() => localStorage.removeItem('queryUpdate'), 100);
          
          console.log('📡 Events broadcasted successfully');
        }
        
        // Navigate to Queries Raised section after successful submission
        if (onQuerySubmitted) {
          console.log('🔄 Navigating to Queries Raised section');
          setTimeout(() => {
            onQuerySubmitted();
          }, 500); // Small delay to ensure data is saved
        }
      } else {
        console.warn('⚠️ API response indicates failure:', data);
        setSearchError('Failed to submit queries: ' + (data?.message || 'Unknown error'));
      }
      
      console.log('🏁 Submit mutation onSuccess completed');
    },
    onError: (error) => {
      console.error('❌ Query submission failed:', error);
      setSearchError(`Error submitting queries: ${error.message}. Please try again.`);
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSearchTerm = searchTerm
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
    
    if (!cleanSearchTerm) return;
    
    setIsSearching(true);
    searchMutation.mutate(cleanSearchTerm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchResult || queries.some(q => !q.text.trim())) return;
    
    const validQueries = queries.filter(q => q.text.trim().length > 0);
    
    if (validQueries.length === 0) {
      setSearchError('Please enter at least one query');
      return;
    }
    
    const allQueriesText = validQueries.map(q => q.text);
    const targetTeam = showBothTeams ? 'Both' : sendTo[0];
    
    // Store the submission data and show confirmation popup
    setPendingSubmissionData({
      appNo: searchResult.appNo,
      queries: allQueriesText,
      sendTo: targetTeam
    });
    setShowConfirmationPopup(true);
  };

  const handleConfirmSubmission = () => {
    if (pendingSubmissionData) {
      submitMutation.mutate(pendingSubmissionData);
      setShowConfirmationPopup(false);
      setPendingSubmissionData(null);
    }
  };

  const handleCancelSubmission = () => {
    setShowConfirmationPopup(false);
    setPendingSubmissionData(null);
  };

  const handleQueryChange = (id: number, text: string, isCustom = false, team?: 'Sales' | 'Credit' | 'Custom') => {
    setQueries(prev => prev.map(q => 
      q.id === id 
        ? { ...q, text, isCustom, team: team || q.team }
        : q
    ));
  };

  const addQuery = () => {
    const newId = Math.max(0, ...queries.map(q => q.id)) + 1;
    setQueries([...queries, { id: newId, text: '' }]);
  };

  const removeQuery = (id: number) => {
    if (queries.length > 1) {
      setQueries(queries.filter(q => q.id !== id));
    }
  };

  const handleTeamSelection = (teamId: string) => {
    if (teamId === 'Both') {
      setShowBothTeams(true);
      setSendTo(['Sales', 'Credit']);
    } else {
      setShowBothTeams(false);
      setSendTo([teamId]);
    }
    setIsDropdownOpen(false);
  };

  const toggleQueryDropdown = (queryId: number) => {
    setIsQueryDropdownOpen(prev => ({
      ...prev,
      [queryId]: !prev[queryId]
    }));
  };

  const handleDropdownSelect = (queryId: number, selectedQuery: string) => {
    handleQueryChange(queryId, selectedQuery);
    setIsQueryDropdownOpen(prev => ({ ...prev, [queryId]: false }));
  };

  const handleCustomMessageSubmit = (customMessage: string) => {
    if (customQueryId !== null) {
      let teamAssignment: 'Sales' | 'Credit' | 'Custom' = 'Custom';
      if (customQueryTeam === 'Sales') {
        teamAssignment = 'Sales';
      } else if (customQueryTeam === 'Credit') {
        teamAssignment = 'Credit';
      } else {
        teamAssignment = 'Custom';
      }
      
      handleQueryChange(customQueryId, customMessage, true, teamAssignment);
      setShowCustomMessage(false);
      setCustomQueryId(null);
      setCustomQueryTeam('Sales');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'sanctioned':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'under processing':
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            📝 Add Query
          </h1>
          <p className="text-gray-600 text-lg">
            Search for applications and submit queries to relevant teams
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FaSearch className="text-blue-600 text-sm" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">Search Application</h2>
              <p className="text-gray-700 text-sm font-medium">Enter application number to find sanctioned cases</p>
            </div>
            {appNo && (
              <span className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                Auto-loaded: {appNo}
              </span>
            )}
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter App.No (e.g., GGNP001, APP123)"
                className="w-full h-12 pl-10 pr-4 text-base font-bold text-black bg-white border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-all duration-200"
                style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            </div>
            
            <button
              type="submit"
              disabled={isSearching || !searchTerm.trim()}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isSearching ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <FaSearch />
                  Search Application
                </>
              )}
            </button>
          </form>
          
          {searchError && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FaExclamationCircle className="text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-800 mb-1">Search Failed</h4>
                  <p className="text-red-700 text-sm whitespace-pre-wrap">{searchError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      
        {searchResult ? (
          <div className="space-y-6">
            {/* Application Details - Clean Design */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FaBuilding className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Application Details</h3>
                    <p className="text-indigo-100">App.No: {searchResult.appNo}</p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 lg:p-8">
                {/* Customer Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 pb-6 border-b border-gray-200">
                  <div className="space-y-3">
                    <h4 className="text-2xl font-bold text-gray-900">{searchResult.customerName}</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(searchResult.status)}`}>
                        {searchResult.status}
                      </span>
                      {searchResult.priority && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          searchResult.priority === 'high' ? 'bg-red-100 text-red-800' :
                          searchResult.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {searchResult.priority} Priority
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">Applied on {searchResult.appliedDate}</p>
                  </div>
                  
                  <div className="mt-6 lg:mt-0 text-left lg:text-right">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Loan Amount</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {searchResult.loanAmount !== 'Not specified' ? `₹${searchResult.loanAmount}` : searchResult.loanAmount}
                        </p>
                      </div>
                      {searchResult.sanctionedAmount && searchResult.sanctionedAmount !== 'Same as loan amount' && (
                        <div>
                          <p className="text-sm text-gray-600">Sanctioned Amount</p>
                          <p className="text-xl font-bold text-green-600">₹{searchResult.sanctionedAmount}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Information Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Loan Information */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <h5 className="text-lg font-bold text-blue-900">💰 Loan Details</h5>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-700">Requested Amount</span>
                          <span className="text-lg font-bold text-blue-900">
                            {searchResult.loanAmount !== 'Not specified' ? `₹${searchResult.loanAmount}` : searchResult.loanAmount}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-green-700">Sanctioned Amount</span>
                          <span className="text-lg font-bold text-green-700">
                            {searchResult.sanctionedAmount !== 'Same as loan amount' ? `₹${searchResult.sanctionedAmount}` : '₹' + searchResult.loanAmount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Information */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                        <FaEnvelope className="text-white" />
                      </div>
                      <h5 className="text-lg font-bold text-purple-900">📞 Contact & Branch</h5>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-3">
                          <FaEnvelope className="text-purple-500" />
                          <div>
                            <p className="text-sm font-medium text-purple-700">Email Address</p>
                            <p className="font-semibold text-purple-900 truncate">{searchResult.customerEmail}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-3">
                          <FaBuilding className="text-purple-500" />
                          <div>
                            <p className="text-sm font-medium text-purple-700">Branch</p>
                            <p className="font-semibold text-purple-900">{searchResult.branchName}</p>
                          </div>
                        </div>
                      </div>
                      {searchResult.login && searchResult.login !== 'Not provided' && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="flex items-center gap-3">
                            <FaUser className="text-purple-500" />
                            <div>
                              <p className="text-sm font-medium text-purple-700">Employee Login</p>
                              <p className="font-semibold text-purple-900">{searchResult.login}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Add Query Form - Clean Design */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FaPlus className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Add New Query</h3>
                    <p className="text-emerald-100">Real-time submission to selected teams</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 lg:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Team Selection */}
                  <div className="space-y-3">
                    <label className="text-base font-bold text-black">Select Team</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {availableTeams.map((team) => (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => handleTeamSelection(team.id)}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                            (team.id === 'Both' && showBothTeams) || 
                            (team.id !== 'Both' && !showBothTeams && sendTo.includes(team.id))
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-gray-400 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                              team.id === 'Sales' ? 'bg-blue-100 text-blue-600' :
                              team.id === 'Credit' ? 'bg-green-100 text-green-600' :
                              'bg-purple-100 text-purple-600'
                            }`}>
                              {team.label.split(' ')[0]}
                            </div>
                            <div>
                              <p className="font-bold text-black">{team.label.split(' ').slice(1).join(' ')}</p>
                              <p className="text-sm text-gray-700 font-medium">
                                {team.id === 'Sales' ? 'Documentation & Process' :
                                 team.id === 'Credit' ? 'Financial & Approval' :
                                 'Send to both teams'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Query Input */}
                  <div className="space-y-4">
                    <label className="text-base font-bold text-black">Query Details</label>
                    
                    {queries.map((query, index) => (
                      <div key={query.id} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-black">
                            {index + 1}
                          </span>
                          <h4 className="font-bold text-black text-sm">Query {index + 1}</h4>
                          {queries.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuery(query.id)}
                              className="ml-auto w-6 h-6 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                            >
                              <FaTimes />
                            </button>
                          )}
                        </div>
                        
                        {/* Predefined Query Selection */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => toggleQueryDropdown(query.id)}
                            className="w-full p-3 bg-white border-2 border-gray-300 rounded-lg text-left hover:border-gray-400 focus:border-blue-500 focus:outline-none transition-all duration-200"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-black font-medium">
                                {showBothTeams 
                                  ? "📋 Select from Sales or Credit team queries..." 
                                  : `📋 Select from ${sendTo[0]} team queries...`}
                              </span>
                              <FaChevronDown className={`transition-transform text-gray-400 ${isQueryDropdownOpen[query.id] ? 'rotate-180' : ''}`} />
                            </div>
                          </button>
                          
                          {isQueryDropdownOpen[query.id] && (
                            <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-300 max-h-72 overflow-y-auto">
                              {showBothTeams ? (
                                /* Both Teams Layout */
                                <div className="grid grid-cols-1 lg:grid-cols-2">
                                  {/* Sales Column */}
                                  <div className="border-r border-gray-200">
                                    <div className="bg-blue-600 text-white p-2 font-bold text-center text-sm">
                                      🏢 Sales Queries
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                      {salesQueries.map((salesQuery, idx) => (
                                        <button
                                          key={`sales-${idx}`}
                                          type="button"
                                          onClick={() => handleDropdownSelect(query.id, salesQuery)}
                                          className="w-full p-2 text-left hover:bg-blue-50 border-b border-gray-100 text-xs font-medium text-black transition-colors"
                                        >
                                          {salesQuery}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Credit Column */}
                                  <div>
                                    <div className="bg-green-600 text-white p-2 font-bold text-center text-sm">
                                      💳 Credit Queries
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                      {creditQueries.map((creditQuery, idx) => (
                                        <button
                                          key={`credit-${idx}`}
                                          type="button"
                                          onClick={() => handleDropdownSelect(query.id, creditQuery)}
                                          className="w-full p-2 text-left hover:bg-green-50 border-b border-gray-100 text-xs font-medium text-black transition-colors"
                                        >
                                          {creditQuery}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Single Team Layout */
                                <div>
                                  <div className={`${sendTo[0] === 'Sales' ? 'bg-blue-600' : 'bg-green-600'} text-white p-2 font-bold text-center text-sm`}>
                                    {sendTo[0] === 'Sales' ? '🏢 Sales Queries' : '💳 Credit Queries'}
                                  </div>
                                  <div className="max-h-60 overflow-y-auto">
                                    {(sendTo[0] === 'Sales' ? salesQueries : creditQueries).map((teamQuery, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleDropdownSelect(query.id, teamQuery)}
                                        className={`w-full p-2 text-left hover:${sendTo[0] === 'Sales' ? 'bg-blue-50' : 'bg-green-50'} border-b border-gray-100 text-xs font-medium text-black transition-colors`}
                                      >
                                        {teamQuery}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Custom Option */}
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomQueryId(query.id);
                                  setShowCustomMessage(true);
                                  setIsQueryDropdownOpen(prev => ({ ...prev, [query.id]: false }));
                                }}
                                className="w-full p-2 text-left hover:bg-yellow-50 border-t-2 border-yellow-200 text-xs font-bold text-yellow-900 transition-colors"
                              >
                                ✏️ Write Custom Query
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Custom Text Input */}
                        <textarea
                          value={query.text}
                          onChange={(e) => handleQueryChange(query.id, e.target.value)}
                          placeholder="Or write your custom query here..."
                          className="w-full h-24 p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none transition-all duration-200 text-black font-medium bg-white"
                          style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '600' }}
                        />
                      </div>
                    ))}
                    
                    {/* Add Another Query Button */}
                    <button
                      type="button"
                      onClick={addQuery}
                      className="w-full h-12 border-2 border-dashed border-gray-400 rounded-lg text-black hover:border-blue-500 hover:text-blue-600 transition-all duration-200 flex items-center justify-center gap-2 font-bold bg-gray-50"
                    >
                      <FaPlus />
                      Add Another Query
                    </button>
                  </div>
                  
                  {/* Submit Button */}
                  <div className="pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={submitMutation.isPending || queries.some(q => !q.text.trim())}
                      className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          Submitting Query...
                        </>
                      ) : (
                        <>
                          <FaPaperPlane />
                          Submit Query to {showBothTeams ? 'Both Teams' : `${sendTo[0]} Team`}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState 
            title="No Application Selected"
            message="Search for an application above to start adding queries"
          />
        )}

        {/* Custom Query Modal */}
        {showCustomMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-4">
                <h3 className="text-lg font-bold text-black mb-4">Write Custom Query</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black mb-2">Send to Team:</label>
                    <select
                      value={customQueryTeam}
                      onChange={(e) => setCustomQueryTeam(e.target.value as 'Sales' | 'Credit' | 'Both')}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-black font-medium bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '600' }}
                    >
                      <option value="Sales">🏢 Sales Team</option>
                      <option value="Credit">💳 Credit Team</option>
                      <option value="Both">🔄 Both Teams</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Enter your custom query..."
                    className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-black font-medium bg-white"
                    style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '600' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        const customMessage = (e.target as HTMLTextAreaElement).value;
                        if (customMessage.trim()) {
                          handleCustomMessageSubmit(customMessage);
                        }
                      }
                    }}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const textarea = document.querySelector('.fixed textarea') as HTMLTextAreaElement;
                        const customMessage = textarea?.value;
                        if (customMessage?.trim()) {
                          handleCustomMessageSubmit(customMessage);
                        }
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      Add Query
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomMessage(false);
                        setCustomQueryId(null);
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Popup */}
        {showConfirmationPopup && pendingSubmissionData && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all animate-in fade-in zoom-in duration-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FaPaperPlane className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Confirm Query Submission</h3>
                    <p className="text-blue-100">Review before sending to team</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Application Info */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Application Number</span>
                    <span className="font-bold text-gray-900">{searchResult?.appNo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Customer Name</span>
                    <span className="font-bold text-gray-900">{searchResult?.customerName}</span>
                  </div>
                </div>

                {/* Team Info */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      pendingSubmissionData.sendTo === 'Sales' ? 'bg-blue-500' :
                      pendingSubmissionData.sendTo === 'Credit' ? 'bg-green-500' :
                      'bg-purple-500'
                    }`}>
                      <span className="text-white text-lg">
                        {pendingSubmissionData.sendTo === 'Sales' ? '🏢' :
                         pendingSubmissionData.sendTo === 'Credit' ? '💳' : '🔄'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sending to</p>
                      <p className="font-bold text-gray-900">
                        {pendingSubmissionData.sendTo === 'Both' ? 'Sales & Credit Teams' : `${pendingSubmissionData.sendTo} Team`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Queries List */}
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-700">Queries to be raised ({pendingSubmissionData.queries.length}):</p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {pendingSubmissionData.queries.map((query, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
                            {index + 1}
                          </span>
                          <p className="text-sm text-gray-800 font-medium">{query}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warning Message */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FaExclamationCircle className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Important Notice</p>
                      <p className="text-sm text-amber-700 mt-1">
                        This query will be sent to the {pendingSubmissionData.sendTo === 'Both' ? 'Sales and Credit teams' : `${pendingSubmissionData.sendTo} team`} for review.
                        The team will be notified immediately and the query will appear in the Queries Raised section.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200">
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmSubmission}
                    disabled={submitMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Sending to Team...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle />
                        Yes, Send Query to Team
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelSubmission}
                    disabled={submitMutation.isPending}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaTimes />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
