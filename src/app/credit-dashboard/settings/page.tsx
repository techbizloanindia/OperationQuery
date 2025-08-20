'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CreditSettings from '@/components/credit/CreditSettings';

export default function CreditSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={['credit']}>
      <CreditSettings />
    </ProtectedRoute>
  );
}
