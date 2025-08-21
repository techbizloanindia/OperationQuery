'use client';

import React from 'react';
import ApprovalDashboard from '@/components/approval/ApprovalDashboard';
import { AuthProvider } from '@/contexts/AuthContext';

export default function ApprovalDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        body {
          overflow-x: hidden;
        }
        
        /* Hide other dashboard elements when on approval dashboard */
        .approval-dashboard-only {
          isolation: isolate;
        }
        
        /* Ensure full viewport usage */
        html, body, #__next {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        
        /* Mobile responsive fixes */
        @media (max-width: 768px) {
          .mobile-scroll {
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
      <AuthProvider>
        <div className="approval-dashboard-only">
          <ApprovalDashboard />
        </div>
      </AuthProvider>
    </div>
  );
}
