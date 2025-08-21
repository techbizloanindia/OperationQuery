'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  History, 
  BarChart3,
  Home,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  pendingCount?: number;
  urgentCount?: number;
}

const ApprovalSidebar: React.FC<SidebarProps> = ({ 
  pendingCount: propPendingCount, 
  urgentCount: propUrgentCount 
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [stats, setStats] = useState({
    pendingCount: propPendingCount || 0,
    urgentCount: propUrgentCount || 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch real-time approval stats
  const fetchApprovalStats = async () => {
    try {
      const response = await fetch('/api/approvals');
      const result = await response.json();
      
      if (result.success) {
        const pendingApprovals = result.data.approvals.filter(
          (approval: any) => approval.status === 'pending'
        );
        const urgentApprovals = result.data.approvals.filter(
          (approval: any) => approval.priority === 'urgent' && approval.status === 'pending'
        );
        
        setStats({
          pendingCount: pendingApprovals.length,
          urgentCount: urgentApprovals.length
        });
      }
    } catch (error) {
      console.error('Error fetching approval stats:', error);
      // Fallback to props or default values
      setStats({
        pendingCount: propPendingCount || 0,
        urgentCount: propUrgentCount || 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalStats();
    
    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(fetchApprovalStats, 30000);
    
    return () => clearInterval(interval);
  }, [propPendingCount, propUrgentCount]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/approval-dashboard',
      badge: null,
    },
    {
      id: 'pending-approvals',
      label: 'Pending Approvals',
      icon: Clock,
      href: '/approval-dashboard/pending-approvals',
      badge: loading ? '...' : stats.pendingCount,
      badgeColor: 'bg-red-500',
    },
    {
      id: 'my-approvals',
      label: 'My Approvals',
      icon: CheckCircle,
      href: '/approval-dashboard/my-approvals',
      badge: null,
    },
    {
      id: 'approval-history',
      label: 'Approval History',
      icon: History,
      href: '/approval-dashboard/approval-history',
      badge: null,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      href: '/approval-dashboard/reports',
      badge: null,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/approval-dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="bg-gradient-to-b from-slate-800 to-slate-900 text-white w-64 min-h-screen fixed left-0 top-0 z-40 shadow-xl lg:relative lg:block">
      {/* Logo and Title */}
      <div className="p-4 sm:p-6 border-b border-slate-700">
        <Link href="/approval-dashboard" className="flex items-center space-x-3 group">
          <div className="bg-white p-2 rounded-lg group-hover:bg-gray-100 transition-colors flex-shrink-0">
            <Image 
              src="/logo.png" 
              alt="Bizloan Logo" 
              width={24} 
              height={24} 
              className="w-5 h-5 sm:w-6 sm:h-6"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">Bizloan</h1>
            <p className="text-xs sm:text-sm text-slate-300 truncate">Approval Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-4 sm:mt-6">
        <ul className="space-y-1 sm:space-y-2 px-3 sm:px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg transition-all duration-200 group ${
                    active
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                    <Icon 
                      className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${
                        active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                      }`} 
                    />
                    <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                  </div>
                  
                  {item.badge && (
                    <span 
                      className={`${item.badgeColor} text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold min-w-[16px] sm:min-w-[20px] text-center flex-shrink-0`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Back to Main App */}
      <div className="absolute bottom-4 sm:bottom-6 left-3 right-3 sm:left-4 sm:right-4 space-y-2">
        {/* User Info */}
        {user && (
          <div className="p-2.5 sm:p-3 rounded-lg bg-slate-700 border border-slate-600">
            <div className="text-xs sm:text-sm text-slate-300">Logged in as</div>
            <div className="text-sm sm:text-base text-white font-medium truncate">{user.name}</div>
            <div className="text-xs text-slate-400 truncate">ID: {user.employeeId}</div>
          </div>
        )}
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-lg text-slate-300 hover:bg-red-600 hover:text-white transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-white flex-shrink-0" />
          <span className="font-medium text-sm sm:text-base">Logout</span>
        </button>
        
        <Link
          href="/"
          className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 group"
        >
          <Home className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-white flex-shrink-0" />
          <span className="font-medium text-sm sm:text-base">Back to Main App</span>
        </Link>
      </div>
    </div>
  );
};

export default ApprovalSidebar;
