'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CreditAnalytics from '@/components/credit/CreditAnalytics';

export default function CreditAnalyticsPage() {
  return (
    <ProtectedRoute allowedRoles={['credit']}>
      <CreditAnalytics />
    </ProtectedRoute>
  );
}
