'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FaChevronDown, FaSignOutAlt } from 'react-icons/fa';
import NotificationCenter from '@/components/shared/NotificationCenter';

// Custom Logout Confirmation Modal
interface LogoutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmationModal: React.FC<LogoutModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <FaSignOutAlt className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
            Logout Confirmation
          </h3>
          <p className="text-center text-gray-600 mb-6">
            Are you sure you want to logout? You will need to sign in again to access the dashboard.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface Branch {
  id: string;
  branchCode: string;
  branchName: string;
  city: string;
  state: string;
  isActive: boolean;
}

export default function OperationsNavbar() {
  const { user, logout } = useAuth();
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutModal(false);
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Fetch branches on component mount
  useEffect(() => {
    fetchBranches();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBranchDropdown && !(event.target as Element)?.closest('.branches-dropdown')) {
        setShowBranchDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showBranchDropdown]);

  const fetchBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const response = await fetch('/api/branches?isActive=true');
      const result = await response.json();
      
      if (result.success) {
        // Filter out test branches and branches with "test" in name
        const filteredBranches = result.data
          .filter((branch: Branch) => 
            !branch.branchName.toLowerCase().includes('test') &&
            !branch.branchCode.toLowerCase().includes('test') &&
            branch.branchName.toLowerCase() !== 'tested branch'
          )
          .sort((a: Branch, b: Branch) => {
            // Sort by state first, then by city, then by name
            if (a.state !== b.state) return a.state.localeCompare(b.state);
            if (a.city !== b.city) return a.city.localeCompare(b.city);
            return a.branchName.localeCompare(b.branchName);
          });
        
        setBranches(filteredBranches);
        console.log(`📋 Loaded ${filteredBranches.length} active branches (filtered out test branches)`);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  return (
    <nav className="bg-slate-700 text-white px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left section - Logo and title */}
        <div className="flex items-center space-x-4 lg:space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs lg:text-sm">BIZ</span>
            </div>
            <span className="text-green-400 font-semibold text-sm lg:text-base">BIZLOAN</span>
          </div>
          <span className="text-lg lg:text-xl font-semibold hidden sm:block">Dashboard System</span>
        </div>

        {/* Center section - Navigation tabs (hidden on mobile) */}
        <div className="hidden lg:flex items-center space-x-1">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium">
            📊 Operations
          </button>
          
          {/* Branches dropdown */}
          <div className="relative branches-dropdown">
            <button
              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
              className="flex items-center space-x-2 px-4 py-2 hover:bg-slate-600 rounded-md transition-colors"
            >
              <span>
                🏢 Branches ({isLoadingBranches ? '...' : branches.length})
                {isLoadingBranches && <span className="animate-pulse ml-1">⏳</span>}
              </span>
              <FaChevronDown className={`w-3 h-3 transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showBranchDropdown && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-white text-gray-800 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="py-1">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                    <div className="font-semibold text-sm text-gray-800">
                      All Active Branches {isLoadingBranches && <span className="text-blue-500">(Loading...)</span>}
                    </div>
                    {branches.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {branches.length} branches • {new Set(branches.map(b => b.state)).size} states • {new Set(branches.map(b => b.city)).size} cities
                      </div>
                    )}
                  </div>
                  {branches.length === 0 && !isLoadingBranches ? (
                    <div className="px-4 py-3 text-gray-500 text-sm">No branches available</div>
                  ) : (
                    branches.map((branch, index) => (
                      <div 
                        key={`branch-${branch.id || index}`} 
                        className="block px-4 py-2 hover:bg-gray-100 border-b border-gray-100 cursor-pointer"
                        onClick={() => setShowBranchDropdown(false)}
                      >
                        <div className="font-medium text-sm">{branch.branchName}</div>
                        <div className="text-xs text-gray-500">
                          Code: {branch.branchCode} • {branch.city}, {branch.state}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right section - User info, notifications and logout */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs lg:text-sm text-gray-300">OPERATIONS</div>
            <div className="text-xs lg:text-sm">ID: {user?.employeeId || 'CONS0130'}</div>
            {branches.length > 0 && (
              <div className="text-xs text-green-400">{branches.length} Active Branches</div>
            )}
          </div>
          
          {/* Notifications */}
          <NotificationCenter team="operations" />
          
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-3 lg:px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-1 lg:space-x-2"
          >
            <FaSignOutAlt className="text-sm" />
            <span className="hidden sm:inline">LOGOUT</span>
          </button>
        </div>
      </div>
      <LogoutConfirmationModal 
        isOpen={showLogoutModal}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
    </nav>
  );
} 