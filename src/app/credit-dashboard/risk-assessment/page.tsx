'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CreditRiskAssessment from '@/components/credit/CreditRiskAssessment';

export default function RiskAssessmentPage() {
  return (
    <ProtectedRoute allowedRoles={['credit']}>
      <CreditRiskAssessment />
    </ProtectedRoute>
  );
}
