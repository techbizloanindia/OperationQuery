'use client';

import React, { useState } from 'react';
import { RefreshCw, Bell, User, ChevronDown, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationCenter from '@/components/shared/NotificationCenter';

interface SalesNavbarProps {
  assignedBranches: string[];
  onRefresh: () => void;
  isRefreshing: boolean;
  lastRefreshed: Date;
}

export default function SalesNavbar({ 
  assignedBranches, 
  onRefresh, 
  isRefreshing, 
  lastRefreshed 
}: SalesNavbarProps) {
  const { user, logout } = useAuth();
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const formatLastRefreshed = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleLogout = () => {
    logout();
    // Redirect to login page
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-600">BizLoan</h1>
                <p className="text-sm text-gray-500">Sales Dashboard</p>
              </div>
            </div>
            
            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Last refreshed indicator */}
            <span className="text-xs text-gray-500">
              Last updated: {formatLastRefreshed(lastRefreshed)}
            </span>
          </div>

          {/* Right side - Branches, Notifications, Settings, Profile */}
          <div className="flex items-center space-x-4">
            {/* Assigned Branches Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Building2 className="h-4 w-4" />
                <span>Branches ({assignedBranches.length})</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showBranchDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-2 px-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Assigned Branches</h3>
                  </div>
                  <div className="py-1 max-h-60 overflow-y-auto">
                    {assignedBranches.length > 0 ? (
                      assignedBranches.map((branch, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <span>{branch}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No branches assigned
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <NotificationCenter team="sales" />


            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User className="h-5 w-5" />
                {user && (
                  <span className="text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                )}
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  {user && (
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                      {user.branch && (
                        <p className="text-xs text-gray-500">{user.branch}</p>
                      )}
                    </div>
                  )}
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showBranchDropdown || showProfileDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowBranchDropdown(false);
            setShowProfileDropdown(false);
          }}
        />
      )}
    </nav>
  );
}