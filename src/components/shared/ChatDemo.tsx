'use client';

import React, { useState } from 'react';
import ModernRemarksInterface from './ModernRemarksInterface';
import { MessageCircle } from 'lucide-react';

export default function ChatDemo() {
  const [showRemarks, setShowRemarks] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Remarks Demo Trigger Button */}
      <button
        onClick={() => setShowRemarks(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:inline">Test Remarks</span>
      </button>

      {/* Demo Remarks Interface */}
      {showRemarks && (
        <ModernRemarksInterface
          isOpen={showRemarks}
          onClose={() => setShowRemarks(false)}
          queryId="demo-123"
          queryTitle="Demo Query - Testing Glassmorphism Remarks"
          customerName="Demo Customer"
          currentUser={{
            name: 'Demo User',
            role: 'Tester',
            team: 'demo'
          }}
        />
      )}
    </div>
  );
}