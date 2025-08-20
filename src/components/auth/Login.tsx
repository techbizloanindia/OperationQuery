'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LoginCredentials, UserRole } from '@/types/shared';
import Image from 'next/image';



const Login = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    employeeId: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userHasRole, setUserHasRole] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const [userBranch, setUserBranch] = useState<string | null>(null);
  const [userBranchCode, setUserBranchCode] = useState<string | null>(null);
  
  const { login, isLoading } = useAuth();
  const router = useRouter();

  // Check if user has been assigned access rights
  const checkUserRole = async (employeeId: string): Promise<void> => {
    if (!employeeId.trim()) {
      setUserRole(null);
      setUserHasRole(false);
      setUserBranch(null);
      setUserBranchCode(null);
      return;
    }

    try {
      setIsCheckingRole(true);
      const response = await fetch(`/api/users/check-role?employeeId=${encodeURIComponent(employeeId)}`);
      const result = await response.json();
      
      if (result.success && result.data.hasRole) {
        setUserRole(result.data.role as UserRole);
        setUserHasRole(true);
        setUserBranch(result.data.branch || null);
        setUserBranchCode(result.data.branchCode || null);
      } else {
        setUserRole(null);
        setUserHasRole(false);
        setUserBranch(null);
        setUserBranchCode(null);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole(null);
      setUserHasRole(false);
      setUserBranch(null);
      setUserBranchCode(null);
    } finally {
      setIsCheckingRole(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Check user role as user types employee ID
    if (name === 'employeeId') {
      checkUserRole(value);
    }
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!credentials.employeeId || !credentials.password) {
      setError('Please fill in all fields');
      return;
    }

    // Prevent login if user doesn't have access rights (unless admin)
    if (!userHasRole && credentials.employeeId !== 'AashishSrivastava2025' && 
        credentials.employeeId !== 'ADMIN') {
      setError('Access rights not assigned. Please contact administrator to assign your role and branch permissions.');
      return;
    }

    try {
      // Attempt login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();
      
      if (result.success) {
        // Login successful - update auth context
        const success = await login({
          ...credentials,
          branch: result.user.branch,
          branchCode: result.user.branchCode
        });
        
        if (success) {
          const role = result.user.role;
          console.log('🚀 Login successful, redirecting to:', role);
          
          switch (role) {
            case 'sales':
              router.push('/sales');
              break;
            case 'credit':
              router.push('/credit-dashboard');
              break;
            case 'operations':
              router.push('/operations');
              break;
            case 'admin':
              router.push('/admin-dashboard');
              break;
            case 'approval':
              router.push('/approval-dashboard');
              break;
            default:
              router.push('/');
          }
        }
      } else {
        // Handle specific error codes
        console.error('Login failed:', result || 'Empty response');
        
        // Ensure result exists and has proper structure
        if (!result) {
          setError('Server error: No response received. Please try again.');
          return;
        }
        
        switch (result.code) {
          case 'USER_NOT_FOUND':
            setError('Employee ID not found. Please check your employee ID or contact administrator.');
            break;
          case 'ACCOUNT_INACTIVE':
            setError('Your account is inactive. Please contact administrator to reactivate your account.');
            break;
          case 'NO_ACCESS_RIGHTS':
            setError(`Account exists but access rights not assigned. Please contact administrator to assign your role and branch permissions.`);
            break;
          case 'INVALID_CREDENTIALS':
            setError('Invalid employee ID or password. Please check your credentials and try again.');
            break;
          case 'SERVICE_UNAVAILABLE':
            setError('Authentication service temporarily unavailable. Please try again in a few moments.');
            break;
          case 'AUTH_ERROR':
            setError('Authentication system error. Please contact technical support.');
            break;
          default:
            setError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection and try again.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'sales':
        return 'Sales Team';
      case 'credit':
        return 'Credit Team';
      case 'operations':
        return 'Operations Team';
      case 'admin':
        return 'Administrator';
      case 'approval':
        return 'Approval Team';
      default:
        return '';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'sales':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'credit':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'operations':
        return 'text-purple-700 bg-purple-100 border-purple-300';
      case 'admin':
        return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'approval':
        return 'text-indigo-700 bg-indigo-100 border-indigo-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 sm:p-10">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-40 relative mb-6 p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Image
                src="/logo.png"
                alt="Bizloan India - Employee Login Portal"
                fill
                sizes="160px"
                style={{ objectFit: 'contain' }}
                priority
                className="filter drop-shadow-lg"
              />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-gray-300">Operation Query Management System</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee ID Field */}
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-200 mb-2">
                Employee ID
              </label>
              <div className="relative">
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  required
                  value={credentials.employeeId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pl-12 backdrop-blur-sm bg-white/10 border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 outline-none text-white placeholder-gray-300"
                  placeholder="Enter your employee ID"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              
              {/* User Role Feedback */}
              {credentials.employeeId && (
                <div className="mt-3">
                  {isCheckingRole ? (
                    <div className="text-sm text-gray-300 flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying access rights...
                    </div>
                  ) : userHasRole ? (
                    <div className="flex flex-col space-y-2">
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm bg-green-500/20 text-green-300 border border-green-400/30`}>
                        <span className="mr-1">✓</span> {getRoleDisplayName(userRole!)}
                      </div>
                      {userBranch && (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                          <span className="mr-1">🏢</span> {userBranch} {userBranchCode ? `(${userBranchCode})` : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm bg-red-500/20 text-red-300 border border-red-400/30">
                      <span className="mr-1">✗</span> No access rights assigned
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={credentials.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pl-12 pr-12 backdrop-blur-sm bg-white/10 border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 outline-none text-white placeholder-gray-300"
                  placeholder="Enter your password"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="backdrop-blur-sm bg-red-500/20 border border-red-400/30 text-red-200 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </>
                )}
              </button>
            </div>

            {/* Control Panel Link */}
            <div className="text-center pt-4">
              <Link href="/control-panel" className="text-sm text-cyan-300 hover:text-white font-medium transition-colors duration-200 flex items-center justify-center group">
                <svg className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin Control Panel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;