'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CreditQueryManagement from '@/components/credit/CreditQueryManagement';

export default function QueryManagementPage() {
  return (
    <ProtectedRoute allowedRoles={['credit']}>
      <CreditQueryManagement />
    </ProtectedRoute>
  );
}
