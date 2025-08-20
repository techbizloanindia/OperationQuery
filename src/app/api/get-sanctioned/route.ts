import { NextRequest, NextResponse } from 'next/server';
import { ApplicationModel } from '@/lib/models/Application';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const branch = searchParams.get('branch');
    const loanType = searchParams.get('loanType');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10000; // Show all by default

    console.log('🔍 Fetching sanctioned applications from applications collection with filters:', { status, branch, loanType, limit });

    // Fetch applications and filter for sanctioned ones
    const allApplications = await ApplicationModel.getAllApplications({
      branch: branch || undefined,
      limit: 5000 // Get all applications to filter properly
    });

    console.log(`📊 Found ${allApplications.length} total sanctioned applications`);

    // Filter applications that are actually sanctioned (have sanctionAmount > 0 or approved status)
    const sanctionedApps = allApplications.filter(app => {
      // Consider an application sanctioned if:
      // 1. Has sanctionAmount > 0, OR
      // 2. appStatus is APPROVED, OR 
      // 3. remarks contain "sanction" keyword
      const hasSanctionAmount = app.sanctionAmount && app.sanctionAmount > 0;
      const isApproved = app.appStatus === 'APPROVED';
      const hasSanctionKeyword = app.remarks && app.remarks.toLowerCase().includes('sanction');
      
      return hasSanctionAmount || isApproved || hasSanctionKeyword;
    });

    console.log(`📊 Found ${allApplications.length} total applications, ${sanctionedApps.length} are sanctioned`);

    // Transform applications to match the expected format for Sanctioned Cases
    const transformedApplications = sanctionedApps.map(app => ({
      _id: app._id,
      appId: app.appId,
      customerName: app.customerName,
      branch: app.branch,
      sanctionedAmount: app.sanctionAmount || app.amount || 0,
      sanctionedDate: app.sanctionedDate || app.appliedDate,
      loanType: app.loanType || 'Personal Loan',
      status: 'active', // Map sanctioned status to active
      customerEmail: app.customerEmail || '',
      sanctionedBy: app.uploadedBy || 'System',
      createdAt: app.uploadedAt || app.appliedDate,
      updatedAt: app.lastUpdated,
      remarks: app.remarks || ''
    })).filter(app => {
      // Additional filtering based on query parameters
      if (loanType && app.loanType !== loanType) return false;
      if (status && status !== 'active') return false;
      return true;
    }); // Remove .slice(0, limit) to show ALL sanctioned cases

    console.log(`✅ Returning ${transformedApplications.length} transformed sanctioned applications`);

    return NextResponse.json({
      success: true,
      applications: transformedApplications,
      count: transformedApplications.length
    });

  } catch (error) {
    console.error('❌ Error fetching sanctioned applications:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}