'use client';

import React, { useState } from 'react';
import { FaPlus, FaTimes, FaChevronDown, FaPaperPlane, FaSpinner, FaSearch } from 'react-icons/fa';

interface QueryItem {
  id: number;
  text: string;
  isCustom?: boolean;
  team?: 'Sales' | 'Credit' | 'Custom';
}

interface QueryFormProps {
  queries: QueryItem[];
  setQueries: React.Dispatch<React.SetStateAction<QueryItem[]>>;
  sendTo: string[];
  setSendTo: React.Dispatch<React.SetStateAction<string[]>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  onCustomQuery: (queryId: number) => void;
}

// Available teams - restored Credit team for credit dashboard functionality
const availableTeams = [
  { id: 'Sales', label: '🏢 Sales Team', color: 'bg-blue-50 hover:bg-blue-100' },
  { id: 'Credit', label: '💳 Credit Team', color: 'bg-green-50 hover:bg-green-100' },
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

export default function QueryForm({
  queries,
  setQueries,
  sendTo,
  setSendTo,
  onSubmit,
  isSubmitting,
  onCustomQuery
}: QueryFormProps) {
  const [isQueryDropdownOpen, setIsQueryDropdownOpen] = useState<{[key: number]: boolean}>({});
  const [searchTerms, setSearchTerms] = useState<{[key: number]: string}>({});
  // Track which queries are assigned to which team
  const [usedQueries, setUsedQueries] = useState<{[query: string]: 'Sales' | 'Credit'}>({});

  const handleQueryChange = (id: number, text: string, isCustom = false, team?: 'Sales' | 'Credit' | 'Custom') => {
    setQueries(prev => {
      const currentQuery = prev.find(q => q.id === id);
      // If clearing a query that was previously selected from dropdown, remove it from usedQueries
      if (currentQuery && currentQuery.text && !currentQuery.isCustom && text === '') {
        setUsedQueries(prevUsed => {
          const newUsed = { ...prevUsed };
          delete newUsed[currentQuery.text];
          return newUsed;
        });
      }
      
      return prev.map(q => 
        q.id === id 
          ? { ...q, text, isCustom, team: team || q.team }
          : q
      );
    });
  };

  const addQuery = () => {
    const newId = Math.max(0, ...queries.map(q => q.id)) + 1;
    setQueries([...queries, { id: newId, text: '' }]);
  };

  const removeQuery = (id: number) => {
    if (queries.length > 1) {
      // Clean up tracking for the query being removed
      const queryToRemove = queries.find(q => q.id === id);
      if (queryToRemove && queryToRemove.text && !queryToRemove.isCustom) {
        setUsedQueries(prev => {
          const newUsed = { ...prev };
          delete newUsed[queryToRemove.text];
          return newUsed;
        });
      }
      
      setQueries(queries.filter(q => q.id !== id));
    }
  };

  const handleTeamSelection = (teamId: string) => {
    setSendTo([teamId]);
    // Note: We don't clear usedQueries here because we want to maintain 
    // the exclusivity across team switches
  };

  const toggleQueryDropdown = (queryId: number) => {
    setIsQueryDropdownOpen(prev => ({
      ...prev,
      [queryId]: !prev[queryId]
    }));
  };

  const handleDropdownSelect = (queryId: number, selectedQuery: string) => {
    // Track which team this query is assigned to
    const currentTeam = sendTo[0] as 'Sales' | 'Credit';
    setUsedQueries(prev => ({ ...prev, [selectedQuery]: currentTeam }));
    
    handleQueryChange(queryId, selectedQuery, false, currentTeam);
    setIsQueryDropdownOpen(prev => ({ ...prev, [queryId]: false }));
    // Clear search term when selecting a query
    setSearchTerms(prev => ({ ...prev, [queryId]: '' }));
  };

  const handleSearchChange = (queryId: number, searchTerm: string) => {
    setSearchTerms(prev => ({ ...prev, [queryId]: searchTerm }));
  };

  const getFilteredQueries = (queryId: number) => {
    const searchTerm = searchTerms[queryId] || '';
    const currentTeam = sendTo[0] as 'Sales' | 'Credit';
    // Use appropriate queries based on selected team
    const allQueries = currentTeam === 'Sales' ? salesQueries : creditQueries;
    
    // Filter out queries that are already used by the opposite team
    let availableQueries = allQueries.filter(query => {
      const assignedTeam = usedQueries[query];
      // Show query if it's not assigned to any team, or if it's assigned to the current team
      return !assignedTeam || assignedTeam === currentTeam;
    });
    
    // Apply search term filter if provided
    if (searchTerm.trim()) {
      availableQueries = availableQueries.filter(query => 
        query.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return availableQueries;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <FaPlus className="text-white text-sm" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Add New Query</h3>
            <p className="text-emerald-100 text-xs">Submit to selected team</p>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Team Selection - Compact Layout */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Select Team</label>
            <div className="grid grid-cols-2 gap-2">
              {availableTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => handleTeamSelection(team.id)}
                  className={`p-2 rounded-md border transition-all duration-200 text-left ${
                    sendTo.includes(team.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                      team.id === 'Sales' ? 'bg-blue-100 text-blue-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {team.label.split(' ')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{team.label.split(' ').slice(1).join(' ')}</p>
                      <p className="text-xs text-gray-600">
                        {team.id === 'Sales' ? 'Process & Docs' :
                         'Credit & Finance'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Query Input - Compact Layout */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Query Details</label>
            
            {queries.map((query, index) => (
              <div key={query.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-700">
                    {index + 1}
                  </span>
                  <h4 className="text-sm font-medium text-gray-700">Query {index + 1}</h4>
                  {queries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuery(query.id)}
                      className="ml-auto w-5 h-5 text-red-500 hover:bg-red-50 rounded-md flex items-center justify-center transition-colors"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  )}
                </div>
                
                {/* Compact Predefined Query Selection */}
                <div className="relative">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleQueryDropdown(query.id)}
                      className={`flex-1 p-2 bg-white border rounded-md text-left transition-all duration-200 text-sm ${
                        query.text && !query.isCustom 
                          ? 'border-green-500 bg-green-50 cursor-default' 
                          : 'border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:outline-none'
                      }`}
                      disabled={Boolean(query.text && !query.isCustom)}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${
                          query.text && !query.isCustom 
                            ? 'text-green-700 font-medium' 
                            : 'text-gray-700'
                        }`}>
                          {query.text && !query.isCustom 
                            ? `✅ ${query.text.substring(0, 40)}${query.text.length > 40 ? '...' : ''}`
                            : `📋 Select ${sendTo[0]} query...`
                          }
                        </span>
                        <FaChevronDown className={`transition-transform text-xs ${
                          query.text && !query.isCustom 
                            ? 'text-green-500' 
                            : 'text-gray-400'
                        } ${isQueryDropdownOpen[query.id] ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    
                    {/* Clear button */}
                    {query.text && !query.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleQueryChange(query.id, '', false)}
                        className="px-2 py-2 bg-red-100 hover:bg-red-200 border border-red-300 rounded-md text-red-600 transition-all duration-200 flex items-center justify-center"
                        title="Clear selected query"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    )}
                  </div>
                  
                  {isQueryDropdownOpen[query.id] && (
                    <div className="absolute z-30 top-full mt-1 w-full bg-white rounded-md shadow-lg border border-gray-300 max-h-64 overflow-hidden">
                      {/* Compact Team Header */}
                        <div className="bg-white">
                          <div className={`${sendTo[0] === 'Sales' ? 'bg-blue-500' : 'bg-green-500'} text-white p-2 text-center text-xs font-medium`}>
                            {sendTo[0] === 'Sales' ? '🏢 Sales Queries' : '💳 Credit Queries'}
                          </div>
                          
                          {/* Compact Search Input */}
                          <div className="p-2 border-b border-gray-200 bg-gray-50">
                            <div className="relative">
                              <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                              <input
                                type="text"
                                placeholder="Search queries..."
                                value={searchTerms[query.id] || ''}
                                onChange={(e) => handleSearchChange(query.id, e.target.value)}
                                className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                                onClick={(e) => e.stopPropagation()}
                                autoComplete="off"
                              />
                            </div>
                          </div>
                          
                          <div className="max-h-40 overflow-y-auto bg-white">
                            {getFilteredQueries(query.id).map((teamQuery, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleDropdownSelect(query.id, teamQuery)}
                                className={`w-full p-2 text-left hover:${sendTo[0] === 'Sales' ? 'bg-blue-50' : 'bg-green-50'} border-b border-gray-100 text-xs text-gray-800 transition-colors`}
                              >
                                {teamQuery}
                              </button>
                            ))}
                            {getFilteredQueries(query.id).length === 0 && (
                              <div className="p-3 text-center text-gray-500 text-xs bg-white">
                                {searchTerms[query.id] ? (
                                  `No queries found matching "${searchTerms[query.id]}"`
                                ) : (
                                  `No available queries for ${sendTo[0]} team`
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      
                      {/* Custom Option */}
                      <button
                        type="button"
                        onClick={() => {
                          onCustomQuery(query.id);
                          setIsQueryDropdownOpen(prev => ({ ...prev, [query.id]: false }));
                        }}
                        className="w-full p-2 text-left hover:bg-yellow-50 border-t border-yellow-200 text-xs font-medium text-yellow-800 transition-colors bg-white"
                      >
                        ✏️ Write Custom Query
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Compact Custom Text Input */}
                <textarea
                  value={query.text}
                  onChange={(e) => handleQueryChange(query.id, e.target.value)}
                  placeholder={query.text && !query.isCustom ? "Query selected from dropdown" : "Or write your custom query here..."}
                  disabled={Boolean(query.text && !query.isCustom)}
                  className={`w-full h-20 p-2 border rounded-md resize-none transition-all duration-200 text-sm ${
                    query.text && !query.isCustom 
                      ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed' 
                      : 'border-gray-300 focus:border-blue-500 focus:outline-none text-gray-900 bg-white'
                  }`}
                />
              </div>
            ))}
            
            {/* Compact Add Another Query Button */}
            <button
              type="button"
              onClick={addQuery}
              className="w-full h-10 border border-dashed border-gray-400 rounded-md text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium bg-gray-50"
            >
              <FaPlus className="text-xs" />
              Add Another Query
            </button>
          </div>
          
          {/* Compact Submit Button */}
          <div className="pt-3 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting || queries.some(q => !q.text.trim())}
              className="w-full h-10 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-md font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin text-xs" />
                  Submitting...
                </>
              ) : (
                <>
                  <FaPaperPlane className="text-xs" />
                  Submit to {sendTo[0]} Team
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
