'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

const AdminNavbar = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="backdrop-blur-xl bg-emerald-900/20 border-b border-emerald-400/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="relative h-10 w-32 sm:h-12 sm:w-40 p-2 bg-white/90 rounded-lg backdrop-blur-sm border border-white/30 shadow-lg">
                <Image
                  src="/logo.png"
                  alt="Bizloan India - Admin Dashboard"
                  fill
                  sizes="(max-width: 640px) 128px, 160px"
                  style={{ 
                    objectFit: 'contain',
                    objectPosition: 'center'
                  }}
                  priority
                  className="filter drop-shadow-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3 px-4 py-2 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-white">
                {user?.name || user?.employeeId}
              </span>
            </div>
            
            {/* Logout Button */}
            <button 
              className="group flex items-center space-x-2 px-4 py-2 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 text-gray-300 hover:text-white hover:bg-white/20 focus:outline-none transition-all duration-200 transform hover:scale-105"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar; 