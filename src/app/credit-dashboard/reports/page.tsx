'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CreditReports from '@/components/credit/CreditReports';

export default function CreditReportsPage() {
  return (
    <ProtectedRoute allowedRoles={['credit']}>
      <CreditReports />
    </ProtectedRoute>
  );
}
