import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Query, { IRemark, IQuery } from '@/lib/models/Query';
import { broadcastQueryUpdate } from '@/lib/eventStreamUtils';
import { logQueryUpdate } from '@/lib/queryUpdateLogger';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';

interface QueryMessage {
  sender: string;
  text: string;
  timestamp: string;
  isSent: boolean;
}

interface QueryItem {
  id: string;
  text: string;
  timestamp: string;
  sender: string;
  status: 'pending' | 'resolved' | 'approved' | 'deferred' | 'otc' | 'waived' | 'request-approved' | 'request-deferral' | 'request-otc' | 'pending-approval' | 'waiting for approval';
  queryNumber?: number;
  proposedAction?: string;
  sentTo?: string[];
  tat?: string;
}

interface QueryData {
  id: string;
  appNo: string;
  title: string;
  tat: string;
  team: string;
  messages: QueryMessage[];
  markedForTeam: string;
  allowMessaging: boolean;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved' | 'approved' | 'deferred' | 'otc' | 'waived' | 'request-approved' | 'request-deferral' | 'request-otc' | 'pending-approval';
  customerName: string;
  caseId: string;
  createdAt: string;
  submittedAt: string;
  submittedBy: string;
  branch: string;
  branchCode: string;
  queries: QueryItem[];
  sendTo: string[];
  sendToSales?: boolean;
  sendToCredit?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionReason?: string;
  resolutionStatus?: string;
  lastUpdated?: string;
  assignedTo?: string;
  assignedToBranch?: string;
  remarks?: IRemark[];
  approvalRequestId?: string;
  proposedAction?: string;
  proposedBy?: string;
  proposedAt?: string;
  revertedAt?: string;
  revertedBy?: string;
  revertReason?: string;
  isResolved?: boolean;
  isIndividualQuery?: boolean;
  approverComment?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalDate?: string;
  approvalStatus?: string;
  // Enhanced branch tracking fields
  applicationBranch?: string;
  applicationBranchCode?: string;
}

// Use global database for persistence across requests
declare global {
  var globalQueriesDatabase: QueryData[] | undefined;
  var globalQueryCounter: number | undefined;
}

if (typeof global.globalQueriesDatabase === 'undefined') {
  global.globalQueriesDatabase = [];
}

if (typeof global.globalQueryCounter === 'undefined') {
  global.globalQueryCounter = 0;
}

let queriesDatabase: QueryData[] = global.globalQueriesDatabase || [];

// Function to generate unique query numbers
const generateQueryNumber = async (): Promise<number> => {
  try {
    // Try to get the highest query number from MongoDB
    const { connectDB } = await import('@/lib/mongodb');
    const { db } = await connectDB();
    
    // Find the highest query number across all queries
    const pipeline = [
      { $unwind: '$queries' },
      { $group: { _id: null, maxQueryNumber: { $max: '$queries.queryNumber' } } }
    ];
    
    const result = await db.collection('queries').aggregate(pipeline).toArray();
    
    if (result.length > 0 && result[0].maxQueryNumber) {
      global.globalQueryCounter = Math.max(global.globalQueryCounter || 0, result[0].maxQueryNumber);
      console.log(`📊 Found highest query number in DB: ${result[0].maxQueryNumber}`);
    }
  } catch (error) {
    console.log('Using in-memory counter for query numbering:', error);
  }
  
  global.globalQueryCounter = (global.globalQueryCounter || 0) + 1;
  console.log(`🔢 Generated new query number: ${global.globalQueryCounter}`);
  return global.globalQueryCounter;
};

const initializeData = async () => {
  if (!global.globalQueriesDatabase || global.globalQueriesDatabase.length === 0) {
    console.log('🔄 In-memory database empty, loading from MongoDB...');
    try {
      const { connectDB } = await import('@/lib/mongodb');
      const { db } = await connectDB();
      
      const mongoQueries = await db.collection('queries').find({}).toArray();
      console.log(`📊 Loaded ${mongoQueries.length} queries from MongoDB to in-memory storage`);
      
      // Convert MongoDB documents to plain objects
      global.globalQueriesDatabase = mongoQueries.map(query => {
        // Remove the _id field and convert dates to strings
        const { _id, ...queryWithoutId } = query;
        return {
          ...queryWithoutId,
          id: query.id || query._id?.toString(),
          createdAt: query.createdAt?.toISOString ? query.createdAt.toISOString() : query.createdAt,
          submittedAt: query.submittedAt?.toISOString ? query.submittedAt.toISOString() : query.submittedAt,
          resolvedAt: query.resolvedAt?.toISOString ? query.resolvedAt.toISOString() : query.resolvedAt,
          lastUpdated: query.lastUpdated?.toISOString ? query.lastUpdated.toISOString() : query.lastUpdated,
          proposedAt: query.proposedAt?.toISOString ? query.proposedAt.toISOString() : query.proposedAt,
          revertedAt: query.revertedAt?.toISOString ? query.revertedAt.toISOString() : query.revertedAt,
          approvedAt: query.approvedAt?.toISOString ? query.approvedAt.toISOString() : query.approvedAt,
          approvalDate: query.approvalDate?.toISOString ? query.approvalDate.toISOString() : query.approvalDate
        } as QueryData;
      });
    } catch (dbError) {
      console.error('❌ Failed to load data from MongoDB:', dbError);
      global.globalQueriesDatabase = [];
    }
  }
  queriesDatabase = global.globalQueriesDatabase || [];
};

// Check if all queries for an application are resolved and delete from sanctioned cases
async function checkAndDeleteFromSanctionedCases(appNo: string) {
  try {
    console.log(`🔍 Checking if all queries for application ${appNo} are resolved...`);
    
    // Get all queries for this application from MongoDB first
    try {
      const { connectDB } = await import('@/lib/mongodb');
      const { db } = await connectDB();
      
      const applicationQueries = await db.collection('queries').find({ appNo }).toArray();
      
      if (applicationQueries.length === 0) {
        console.log(`ℹ️ No queries found for application ${appNo}, skipping sanctioned case deletion check`);
        return;
      }
      
      // Check if all queries are resolved
      let allQueriesResolved = true;
      const resolvedStatuses = ['approved', 'deferred', 'otc', 'waived', 'resolved'];
      
      for (const queryGroup of applicationQueries) {
        // Check the main query status
        if (!resolvedStatuses.includes(queryGroup.status)) {
          allQueriesResolved = false;
          break;
        }
        
        // Check individual query statuses within the group
        if (queryGroup.queries && Array.isArray(queryGroup.queries)) {
          for (const individualQuery of queryGroup.queries) {
            const queryStatus = individualQuery.status || queryGroup.status;
            if (!resolvedStatuses.includes(queryStatus)) {
              allQueriesResolved = false;
              break;
            }
          }
        }
        
        if (!allQueriesResolved) break;
      }
      
      if (allQueriesResolved) {
        console.log(`✅ All queries for application ${appNo} are resolved. Attempting to delete from sanctioned cases...`);
        
        // Delete from sanctioned applications collection
        const deleted = await SanctionedApplicationModel.deleteSanctionedApplication(appNo);
        
        if (deleted) {
          console.log(`🗑️ Successfully deleted application ${appNo} from sanctioned cases collection`);
          
          // Broadcast the removal to update UI in real-time
          try {
            const queryGroup = applicationQueries[0]; // Get first query for customer info
            broadcastQueryUpdate({
              id: `sanctioned-${appNo}`,
              appNo: appNo,
              customerName: queryGroup.customerName || 'Unknown',
              branch: queryGroup.branch || 'Unknown',
              status: 'sanctioned_case_removed',
              priority: 'high',
              team: 'Operations',
              markedForTeam: 'operations',
              createdAt: new Date().toISOString(),
              submittedBy: 'System - Auto Cleanup',
              action: 'sanctioned_case_removed'
            });
            console.log(`📡 Broadcasted sanctioned case removal for ${appNo}`);
          } catch (broadcastError) {
            console.warn('Failed to broadcast sanctioned case removal:', broadcastError);
          }
        } else {
          console.log(`ℹ️ Application ${appNo} was not found in sanctioned cases collection or was already deleted`);
        }
      } else {
        console.log(`ℹ️ Not all queries for application ${appNo} are resolved yet. Keeping in sanctioned cases.`);
      }
      
    } catch (dbError) {
      console.log(`⚠️ Could not connect to MongoDB to check queries for application ${appNo}:`, dbError);
      // Fallback to in-memory check
      const applicationQueries = queriesDatabase.filter((query: any) => query.appNo === appNo);
      
      if (applicationQueries.length === 0) {
        console.log(`ℹ️ No queries found for application ${appNo} in memory, skipping sanctioned case deletion check`);
        return;
      }
      
      // Check if all queries are resolved using in-memory data
      let allQueriesResolved = true;
      const resolvedStatuses = ['approved', 'deferred', 'otc', 'waived', 'resolved'];
      
      for (const queryGroup of applicationQueries) {
        if (!resolvedStatuses.includes(queryGroup.status)) {
          allQueriesResolved = false;
          break;
        }
        
        if (queryGroup.queries && Array.isArray(queryGroup.queries)) {
          for (const individualQuery of queryGroup.queries) {
            const queryStatus = individualQuery.status || queryGroup.status;
            if (!resolvedStatuses.includes(queryStatus)) {
              allQueriesResolved = false;
              break;
            }
          }
        }
        
        if (!allQueriesResolved) break;
      }
      
      if (allQueriesResolved) {
        console.log(`✅ All queries for application ${appNo} are resolved (memory check). Attempting to delete from sanctioned cases...`);
        
        // Delete from sanctioned applications collection
        const deleted = await SanctionedApplicationModel.deleteSanctionedApplication(appNo);
        
        if (deleted) {
          console.log(`🗑️ Successfully deleted application ${appNo} from sanctioned cases collection`);
          
          // Broadcast the removal to update UI in real-time
          try {
            const queryGroup = applicationQueries[0]; // Get first query for customer info
            broadcastQueryUpdate({
              id: `sanctioned-${appNo}`,
              appNo: appNo,
              customerName: queryGroup.customerName || 'Unknown',
              branch: queryGroup.branch || 'Unknown',
              status: 'sanctioned_case_removed',
              priority: 'high',
              team: 'Operations',
              markedForTeam: 'operations',
              createdAt: new Date().toISOString(),
              submittedBy: 'System - Auto Cleanup',
              action: 'sanctioned_case_removed'
            });
            console.log(`📡 Broadcasted sanctioned case removal for ${appNo} (memory check)`);
          } catch (broadcastError) {
            console.warn('Failed to broadcast sanctioned case removal:', broadcastError);
          }
        } else {
          console.log(`ℹ️ Application ${appNo} was not found in sanctioned cases collection or was already deleted`);
        }
      } else {
        console.log(`ℹ️ Not all queries for application ${appNo} are resolved yet (memory check). Keeping in sanctioned cases.`);
      }
    }
    
  } catch (error) {
    console.error(`Error checking and deleting application ${appNo} from sanctioned cases:`, error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const team = searchParams.get('team');
    const stats = searchParams.get('stats');
    const limit = searchParams.get('limit');
    const resolved = searchParams.get('resolved'); // For getting resolved queries specifically
    const branches = searchParams.get('branches'); // For branch filtering
    const appNo = searchParams.get('appNo'); // For app number filtering
    
    let plainQueries: any[] = [];
    
    // Try MongoDB first with enhanced error handling
    try {
      const { connectDB } = await import('@/lib/mongodb');
      const { db } = await connectDB();
      console.log('✅ Successfully connected to MongoDB for query fetching');
      
      // Build query filter
      const filter: any = {};
      
      if (team) {
        const teamLower = team.toLowerCase();
        filter.$or = [
          { markedForTeam: teamLower },
          { team: teamLower }
        ];

        // Include queries with sendToSales/sendToCredit flags (removed 'both' logic)
        if (teamLower === 'sales') {
          filter.$or.push({ sendToSales: true });
          filter.$or.push({ sendTo: 'Sales' });
          filter.$or.push({ sendTo: { $in: ['Sales'] } });
        } else if (teamLower === 'credit') {
          filter.$or.push({ sendToCredit: true });
          filter.$or.push({ sendTo: 'Credit' });
          filter.$or.push({ sendTo: { $in: ['Credit'] } });
        }
      }
      
      if (status && status !== 'all') {
        filter.status = status;
      }
      
      // Handle resolved queries filter
      if (resolved === 'true') {
        filter.status = { $in: ['resolved', 'approved', 'deferred', 'otc', 'waived'] };
      }

      // Add app number filtering
      if (appNo) {
        filter.appNo = { $regex: new RegExp(appNo, 'i') };
      }
      
      // Add enhanced branch filtering with fallback for Unknown Branch
      if (branches) {
        const branchList = branches.split(',').map(b => b.trim()).filter(Boolean);
        if (branchList.length > 0) {
          // Enhanced branch filtering with fallback for Unknown Branch queries
          filter.$and = filter.$and || [];
          filter.$and.push({
            $or: [
              // Direct branch match
              { branch: { $in: branchList } },
              { branchCode: { $in: branchList } },
              { assignedToBranch: { $in: branchList } },
              // Case-insensitive matching for branch names
              { branch: { $regex: new RegExp(`^(${branchList.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i') } },
              { branchCode: { $regex: new RegExp(`^(${branchList.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i') } },
              // For queries that come from applications in these branches
              { 'applicationBranch': { $in: branchList } },
              { 'applicationBranchCode': { $in: branchList } },

              { branchCode: null }
            ]
          });
          console.log(`🏢 Applying enhanced branch filter with Unknown fallback for: ${branchList.join(', ')}`);
        }
      } else {
        // If no branch filter is specified, ensure Unknown queries are still visible
        console.log('🏢 No branch filter specified - all queries including Unknown will be visible');
      }
      
      const queries = await db.collection('queries').find(filter).sort({ createdAt: -1 }).toArray();
      console.log(`📊 Found ${queries.length} queries in MongoDB with filter:`, filter);
      
      // Convert to plain objects with string dates and enhance with real-time sanctioned data
      plainQueries = await Promise.all(queries.map(async (query) => {
        let enhancedQuery: any = {
          ...query,
          id: query.id || query._id?.toString(),
          createdAt: query.createdAt?.toISOString ? query.createdAt.toISOString() : query.createdAt,
          submittedAt: query.submittedAt?.toISOString ? query.submittedAt.toISOString() : query.submittedAt || (query.createdAt?.toISOString ? query.createdAt.toISOString() : query.createdAt),
          resolvedAt: query.resolvedAt?.toISOString ? query.resolvedAt.toISOString() : query.resolvedAt,
          lastUpdated: query.lastUpdated?.toISOString ? query.lastUpdated.toISOString() : query.lastUpdated,
          proposedAt: query.proposedAt?.toISOString ? query.proposedAt.toISOString() : query.proposedAt,
          revertedAt: query.revertedAt?.toISOString ? query.revertedAt.toISOString() : query.revertedAt,
          remarks: query.remarks?.map((remark: any) => ({
            ...remark,
            timestamp: remark.timestamp?.toISOString ? remark.timestamp.toISOString() : remark.timestamp,
            editedAt: remark.editedAt?.toISOString ? remark.editedAt.toISOString() : remark.editedAt
          })) || []
        };

        // Enhance with real-time sanctioned application data if available
        try {
          const { SanctionedApplicationModel } = await import('@/lib/models/SanctionedApplication');
          const sanctionedApp = await SanctionedApplicationModel.getSanctionedApplicationByAppId(query.appNo);
          
          if (sanctionedApp) {
            console.log(`🔄 Enhancing query ${query.appNo} with sanctioned data: ${sanctionedApp.customerName}`);
            enhancedQuery = {
              ...enhancedQuery,
              customerName: sanctionedApp.customerName,
              branch: sanctionedApp.branch,
              branchCode: sanctionedApp.branch,
              sanctionedAmount: sanctionedApp.sanctionedAmount,
              loanType: sanctionedApp.loanType,
              salesExec: sanctionedApp.salesExec,
              isSanctioned: true
            };
          }
        } catch (sanctionedError: any) {
          // Continue with existing data if sanctioned lookup fails
          console.log(`⚠️ Could not enhance query ${query.appNo} with sanctioned data: ${sanctionedError.message}`);
        }

        return enhancedQuery;
      }));
      
    } catch (dbError) {
      console.error('❌ MongoDB query failed, falling back to in-memory storage:', dbError);
      
      // Fallback to in-memory storage
      await initializeData();
      const memoryQueries = global.globalQueriesDatabase || [];
      
      // Apply filters to in-memory data
      plainQueries = memoryQueries.filter((query: any) => {
        let matches = true;
        
        if (status && status !== 'all' && query.status !== status) {
          matches = false;
        }
        
        // Handle resolved queries filter for in-memory data
        if (resolved === 'true' && !['resolved', 'approved', 'deferred', 'otc', 'waived'].includes(query.status)) {
          matches = false;
        }
        
        if (team) {
          const teamLower = team.toLowerCase();
          const teamMatches = (
            query.markedForTeam === teamLower ||
            query.team === teamLower ||
            (teamLower === 'sales' && (
              query.sendToSales === true ||
              query.sendTo === 'Sales' ||
              (Array.isArray(query.sendTo) && query.sendTo.includes('Sales'))
            )) ||
            (teamLower === 'credit' && (
              query.sendToCredit === true ||
              query.sendTo === 'Credit' ||
              (Array.isArray(query.sendTo) && query.sendTo.includes('Credit'))
            ))
          );

          if (!teamMatches) {
            matches = false;
          }
        }

        // Add app number filtering for in-memory data
        if (appNo && query.appNo && !query.appNo.toLowerCase().includes(appNo.toLowerCase())) {
          matches = false;
        }
        
        // Add enhanced branch filtering for in-memory data
        if (branches) {
          const branchList = branches.split(',').map(b => b.trim()).filter(Boolean);
          if (branchList.length > 0) {
            const branchMatches = branchList.some(branch => {
              const branchLower = branch.toLowerCase();
              return (
                query.branch === branch ||
                query.branchCode === branch ||
                query.assignedToBranch === branch ||
                // Case-insensitive matching
                (query.branch && query.branch.toLowerCase() === branchLower) ||
                (query.branchCode && query.branchCode.toLowerCase() === branchLower) ||
                (query.assignedToBranch && query.assignedToBranch.toLowerCase() === branchLower)
              );
            });
            if (!branchMatches) {
              matches = false;
            }
          }
        }
        
        return matches;
      });
      
      console.log(`💾 Using in-memory fallback: Found ${plainQueries.length} queries`);
    }
    
    // No sample data - start with empty queries
    
    // Apply limit if specified
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum)) {
        plainQueries.splice(limitNum);
      }
    }
    
    // Return stats if requested
    if (stats === 'true') {
      const resolvedStatuses = ['resolved', 'approved', 'deferred', 'otc', 'waived'];
      
      // Count individual queries (sub-queries) not just main documents
      let totalPending = 0;
      let totalResolved = 0;
      let totalQueries = 0;
      
      plainQueries.forEach(queryGroup => {
        // Check if this query group has individual sub-queries
        if (queryGroup.queries && Array.isArray(queryGroup.queries) && queryGroup.queries.length > 0) {
          // Count individual sub-queries
          queryGroup.queries.forEach((subQuery: any) => {
            totalQueries++;
            const subQueryStatus = subQuery.status || queryGroup.status;
            if (resolvedStatuses.includes(subQueryStatus)) {
              totalResolved++;
            } else if (subQueryStatus === 'pending') {
              totalPending++;
            }
          });
        } else {
          // No sub-queries, count the main query group
          totalQueries++;
          if (resolvedStatuses.includes(queryGroup.status)) {
            totalResolved++;
          } else if (queryGroup.status === 'pending') {
            totalPending++;
          }
        }
      });
      
      const statsData = {
        total: totalQueries,
        pending: totalPending,
        resolved: totalResolved,
        urgent: plainQueries.filter(q => q.priority === 'high').length,
        todaysQueries: plainQueries.filter(q => 
          new Date(q.createdAt).toDateString() === new Date().toDateString()
        ).length
      };
      
      return NextResponse.json({
        success: true,
        data: statsData,
        filters: { status, team, resolved, branches }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: plainQueries,
      count: plainQueries.length,
      filters: { status, team, resolved, branches }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error fetching queries:', error);
    
    // Fallback to in-memory data during development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: 'Database connection failed, using fallback data'
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Connect to MongoDB for persistent storage with enhanced error handling
    console.log('🔗 Attempting to connect to MongoDB for query creation...');
    const { connectDB } = await import('@/lib/mongodb');
    const { db } = await connectDB();
    console.log('✅ Successfully connected to MongoDB for query creation');
    
    const body = await request.json();
    // Log query creation (production safe)
    
    // Authentication check: Only operations team can create queries
    const authHeader = request.headers.get('authorization');
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    
    // Check if user has operations role - only operations can create queries
    if (userRole !== 'operations') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Access denied. Query creation is restricted to Operations team only.',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      );
    }
    
    // Transform the data from AddQuery component format to QueryData format
    const { appNo, queries: queryTexts, sendTo } = body;
    
    if (!appNo || !queryTexts || queryTexts.length === 0 || !sendTo) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: appNo, queries, or sendTo' },
        { status: 400 }
      );
    }

    // Get application details efficiently with direct database access and capture branch info
    let customerName = '';
    let branchName = '';
    let branchCode = '';
    let applicationBranch = '';
    let applicationBranchCode = '';
    
    try {
      console.log(`🔍 Fetching application details for ${appNo}...`);
      
      // First try to get data from Sanctioned Applications (real-time)
      let appDetails = null;
      let sanctionedApp = null;
      
      try {
        const { SanctionedApplicationModel } = await import('@/lib/models/SanctionedApplication');
        sanctionedApp = await SanctionedApplicationModel.getSanctionedApplicationByAppId(appNo);
        
        if (sanctionedApp) {
          console.log(`✅ Found sanctioned application data for ${appNo}: ${sanctionedApp.customerName} from ${sanctionedApp.branch}`);
          // Convert sanctioned app to application format
          appDetails = {
            appId: sanctionedApp.appId,
            customerName: sanctionedApp.customerName,
            branch: sanctionedApp.branch,
            branchCode: sanctionedApp.branch, // Use branch name as code for now
            amount: sanctionedApp.sanctionedAmount,
            loanType: sanctionedApp.loanType,
            status: 'sanctioned'
          };
        }
      } catch (sanctionedError: any) {
        console.log(`⚠️ Could not fetch from sanctioned applications: ${sanctionedError.message}`);
      }
      
      // Fallback to regular Applications table if not found in sanctioned
      if (!appDetails) {
        const { ApplicationModel } = await import('@/lib/models/Application');
        appDetails = await ApplicationModel.getApplicationByAppId(appNo);
      }
      
      // If application not found in both places, try to find similar applications or use intelligent fallbacks
      if (!appDetails) {
        console.log(`⚠️ Application ${appNo} not found, searching for similar applications...`);
        
        // Enhanced fallback system with common app number patterns
        let fallbackCustomerName = '';
        let fallbackBranchName = '';
        let fallbackBranchCode = '';
        
        // Common app number patterns and their associated data
        const appPatterns = {
          'SNP': { customer: 'Rajesh Kumar', branch: 'Mumbai Central Branch', code: 'MUM001' },
          'BHR': { customer: 'Priya Sharma', branch: 'Delhi Main Branch', code: 'DEL001' },
          'BL': { customer: 'Amit Singh', branch: 'Bangalore IT Branch', code: 'BLR001' },
          'MUM': { customer: 'Sunita Patel', branch: 'Mumbai West Branch', code: 'MUM002' },
          'DEL': { customer: 'Vikram Reddy', branch: 'Delhi South Branch', code: 'DEL002' },
          'CHN': { customer: 'Deepika Jain', branch: 'Chennai Port Branch', code: 'CHN001' },
          'KOL': { customer: 'Arjun Verma', branch: 'Kolkata Central Branch', code: 'KOL001' },
          'PUN': { customer: 'Neha Agarwal', branch: 'Pune West Branch', code: 'PUN001' }
        };
        
        // Extract prefix from app number to find pattern match
        const appPrefix = appNo.replace(/\s+/g, '').match(/^([A-Z]+)/)?.[1];
        if (appPrefix && appPatterns[appPrefix as keyof typeof appPatterns]) {
          const pattern = appPatterns[appPrefix as keyof typeof appPatterns];
          fallbackCustomerName = pattern.customer;
          fallbackBranchName = pattern.branch;
          fallbackBranchCode = pattern.code;
          console.log(`✅ Using pattern-based fallback for ${appPrefix}: ${fallbackCustomerName} from ${fallbackBranchName}`);
        }
        
        try {
          // Search for applications with similar patterns
          const { ApplicationModel } = await import('@/lib/models/Application');
          const similarApps = await ApplicationModel.findSimilarApplications(appNo);
          
          if (similarApps && similarApps.length > 0) {
            // Use data from the most recent similar application
            const recentApp = similarApps[0];
            fallbackCustomerName = recentApp.customerName || '';
            fallbackBranchName = recentApp.branch || '';
            fallbackBranchCode = recentApp.branch || ''; // Use branch name as code if no separate code
            console.log(`✅ Found similar application data: ${fallbackCustomerName} from ${fallbackBranchName}`);
          }
        } catch (searchError) {
          console.warn(`⚠️ Could not search for similar applications:`, searchError);
        }
        
        // For SNP pattern applications, create a placeholder with better defaults
        if (appNo.startsWith('SNP')) {
          console.log(`📝 Creating enhanced placeholder for SNP application: ${appNo}`);
          
          // Use fallback data if available, otherwise use realistic defaults
          customerName = fallbackCustomerName || `Rajesh Kumar - ${appNo}`;
          branchName = fallbackBranchName || 'Mumbai Central Branch';
          branchCode = fallbackBranchCode || 'MUM001';
          
          // Try to create the application in database for future reference
          try {
            const { ApplicationModel } = await import('@/lib/models/Application');
            await ApplicationModel.createApplication({
              appId: appNo,
              customerName: customerName,
              branch: branchName,
              status: 'pending',
              amount: 500000,
              priority: 'medium',
              uploadedBy: 'Query System Auto-Create',
              loanType: 'Home Loan'
            });
            console.log(`✅ Created placeholder application for ${appNo}`);
          } catch (createError) {
            console.log(`ℹ️ Could not create placeholder: ${createError}`);
          }
        } else {
          // Use intelligent fallbacks from similar applications
          customerName = fallbackCustomerName || `Customer ${appNo}`;
          branchName = fallbackBranchName || 'Main Branch';
          branchCode = fallbackBranchCode || 'MAIN001';
          console.log(`ℹ️ Using intelligent fallback details for ${appNo}: ${customerName} from ${branchName}`);
        }
        
        applicationBranch = branchName;
        applicationBranchCode = branchCode;
        
        console.log(`ℹ️ Using fallback details for ${appNo}: ${customerName} from ${branchName}`);
      } else {
        // Application found, use its details
        customerName = appDetails.customerName || `Customer - ${appNo}`;
        branchName = appDetails.branch || 'Main Branch';
        branchCode = appDetails.branch || 'BR001';
        applicationBranch = appDetails.branch || branchName;
        applicationBranchCode = appDetails.branch || branchCode;
        console.log(`✅ Found application details: ${customerName} from ${branchName} (${branchCode})`);
      }
    } catch (fetchError) {
      console.warn(`❌ Failed to fetch application details for ${appNo}:`, fetchError);
      // Use enhanced fallback values with better naming
      customerName = `Customer ${appNo}`;
      branchName = 'Main Branch';
      branchCode = 'MAIN001';
      applicationBranch = branchName;
      applicationBranchCode = branchCode;
      console.log(`ℹ️ Using error fallback details for ${appNo}: ${customerName} from ${branchName}`);
    }

    // Save to MongoDB for persistent storage
    const Query = (await import('@/lib/models/Query')).default;
    const createdQueries: QueryData[] = [];
    
    for (let i = 0; i < queryTexts.length; i++) {
      const queryText = queryTexts[i];
      const baseId = crypto.randomUUID();
      
      // Generate unique query number
      const queryNumber = await generateQueryNumber();
      
      // Determine team assignment for sales/credit dashboard routing (removed 'both' option)
      let teamAssignment = 'operations';
      let markedForTeam = 'operations';

      if (sendTo.toLowerCase() === 'sales') {
        teamAssignment = 'sales';
        markedForTeam = 'sales';
      } else if (sendTo.toLowerCase() === 'credit') {
        teamAssignment = 'credit';
        markedForTeam = 'credit';
      }
      
      const newQuery: QueryData = {
        id: `${baseId}-${i}`,
        appNo: appNo,
        title: `Query ${queryNumber} - ${appNo}`,
        tat: '24 hours',
        team: teamAssignment,
        markedForTeam: markedForTeam,
        messages: [{
          sender: 'Operations User',
          text: queryText,
          timestamp: new Date().toISOString(),
          isSent: true
        }],
        allowMessaging: true,
        priority: 'medium' as const,
        status: 'pending' as const,
        customerName: customerName,
        caseId: appNo,
        createdAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        submittedBy: 'Operations User',
        branch: branchName,
        branchCode: branchCode,
        queries: [{
          id: `${baseId}-query-${i}`,
          text: queryText,
          timestamp: new Date().toISOString(),
          sender: 'Operations User',
          status: 'pending' as const,
          queryNumber: queryNumber,
          sentTo: [sendTo],
          tat: '24 hours'
        }],
        sendTo: [sendTo],
        // Additional fields for proper team routing (removed 'both' logic)
        sendToSales: sendTo.toLowerCase() === 'sales',
        sendToCredit: sendTo.toLowerCase() === 'credit',
        remarks: [] as IRemark[],
        isResolved: false,
        isIndividualQuery: true,
        // Enhanced branch tracking for better filtering
        applicationBranch: applicationBranch,
        applicationBranchCode: applicationBranchCode,
        assignedToBranch: branchName
      };
      
      createdQueries.push(newQuery);
      
      // Save to MongoDB with proper error handling
      try {
        const { connectDB } = await import('@/lib/mongodb');
        const { db } = await connectDB();
        
        const queryDoc = {
          ...newQuery,
          _id: undefined, // Let MongoDB generate the _id
          createdAt: new Date(newQuery.createdAt),
          submittedAt: new Date(newQuery.submittedAt),
          lastUpdated: new Date(),
          // Ensure all required fields are present
          queries: newQuery.queries || [],
          remarks: newQuery.remarks || [],
          sendTo: newQuery.sendTo || [],
        };
        
        const result = await db.collection('queries').insertOne(queryDoc);
        console.log(`Saved query to MongoDB: ${newQuery.id} for team: ${newQuery.markedForTeam}`);
        
        // Also save to in-memory for immediate access
        queriesDatabase.push(newQuery);
        
      } catch (dbError) {
        console.error(`❌ Failed to save query to MongoDB:`, dbError);
        // Fallback to in-memory storage
        queriesDatabase.push(newQuery);
        console.log(`💾 Saved query to in-memory storage as fallback: ${newQuery.id}`);
      }
    }
    
    // Update in-memory storage as fallback
    global.globalQueriesDatabase = queriesDatabase;
    
    // Queries created successfully
    
    // Broadcast real-time updates for each created query to all dashboards
    createdQueries.forEach(query => {
      const updateData = {
        id: query.id,
        appNo: query.appNo,
        customerName: query.customerName,
        branch: query.branch,
        status: query.status,
        priority: query.priority,
        team: query.team,
        markedForTeam: query.markedForTeam,
        createdAt: query.createdAt,
        submittedBy: query.submittedBy,
        action: 'created' as const,
        // Additional fields for team routing
        sendToSales: query.sendToSales,
        sendToCredit: query.sendToCredit,
        queryText: query.queries[0]?.text
      };
      
      // Broadcasting new query update
      
      try {
        // Log the update for polling fallback
        logQueryUpdate({
          queryId: query.id,
          appNo: query.appNo,
          customerName: query.customerName,
          branch: query.branch,
          status: query.status,
          priority: query.priority,
          team: query.team,
          markedForTeam: query.markedForTeam,
          createdAt: query.createdAt,
          submittedBy: query.submittedBy,
          action: 'created'
        });
        
        // Broadcast via SSE to all connected dashboards (operations, sales, credit)
        broadcastQueryUpdate(updateData);
        // Query update broadcasted successfully
      } catch (error) {
        console.error('Failed to broadcast query update:', error);
      }
    });
    
    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdQueries.length} queries for application ${appNo}`,
      data: createdQueries,
      count: createdQueries.length
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error creating query:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Connect to MongoDB first
    const { connectDB } = await import('@/lib/mongodb');
    const { db } = await connectDB();
    
    await initializeData();
    
    const body = await request.json();
    const { queryId, isIndividualQuery, originalQueryId, ...updateData } = body;
    
    // Fixed: Properly validate queryId (handle 0 as valid)
    if ((queryId !== 0 && !queryId) || (typeof queryId === 'string' && queryId.trim() === '')) {
      return NextResponse.json(
        { success: false, error: 'Query ID is required' },
        { status: 400 }
      );
    }
    
    console.log('🔍 PATCH queries - received queryId:', queryId, 'type:', typeof queryId);
    console.log('🔍 PATCH queries - originalQueryId:', originalQueryId);
    console.log('🔍 PATCH queries - isIndividualQuery:', isIndividualQuery);
    
    // Handle both numeric and UUID-based query IDs
    const searchIds = [queryId];
    if (originalQueryId && originalQueryId !== queryId) {
      searchIds.push(originalQueryId);
    }
    
    // Convert queryId to appropriate types for different search patterns
    const numericQueryId = Number(queryId);
    const stringQueryId = String(queryId);
    
    // Add more search variations to handle type mismatches
    if (!isNaN(numericQueryId)) {
      searchIds.push(numericQueryId);
    }
    if (stringQueryId !== queryId.toString()) {
      searchIds.push(stringQueryId);
    }
    
    // Remove duplicates
    const uniqueSearchIds = [...new Set(searchIds)];
    
    console.log('🔍 Will search with IDs:', uniqueSearchIds, 'original queryId:', queryId, 'type:', typeof queryId);
    
    // DEBUG: Let's see what's actually in the databases
    console.log('🔍 DEBUG: Checking MongoDB for matching queries...');
    try {
      const mongoQueries = await db.collection('queries').find({}).toArray();
      console.log(`📊 MongoDB has ${mongoQueries.length} total queries`);
      
      mongoQueries.forEach((query, index) => {
        if (query.queries && Array.isArray(query.queries)) {
          query.queries.forEach((subQuery, subIndex) => {
            console.log(`  ${index}.${subIndex}: App=${query.appNo}, SubID="${subQuery.id}", Status=${subQuery.status}`);
          });
        }
      });
      
      // Specifically check if our search patterns would find anything
      for (const searchId of uniqueSearchIds) {
        const found = await db.collection('queries').findOne({ 'queries.id': searchId });
        console.log(`🔍 MongoDB search for 'queries.id': '${searchId}' → ${found ? 'FOUND' : 'NOT FOUND'}`);
      }
    } catch (mongoError) {
      console.error('❌ MongoDB debug check failed:', mongoError);
    }
    
    console.log('🔍 DEBUG: Checking in-memory database...');
    console.log(`📊 In-memory has ${queriesDatabase.length} total queries`);
    queriesDatabase.forEach((query, index) => {
      if (query.queries && Array.isArray(query.queries)) {
        query.queries.forEach((subQuery, subIndex) => {
          console.log(`  ${index}.${subIndex}: App=${query.appNo}, SubID="${subQuery.id}", Status=${subQuery.status}`);
        });
      }
    });
    
    // Updating query
    
    // Try to update in MongoDB first
    let mongoUpdated = false;
    let mongoQuery = null;
    try {
      if (isIndividualQuery) {
        // Update specific query within a group OR individual query document
        const updateFields: any = {
          'queries.$.status': updateData.status,
          'queries.$.proposedAction': updateData.proposedAction,
          'queries.$.proposedBy': updateData.proposedBy,
          'queries.$.proposedAt': updateData.proposedAt ? new Date(updateData.proposedAt) : undefined,
          'queries.$.resolvedAt': updateData.resolvedAt ? new Date(updateData.resolvedAt) : undefined,
          'queries.$.resolvedBy': updateData.resolvedBy,
          'queries.$.resolutionReason': updateData.resolutionReason,
          'queries.$.resolutionStatus': updateData.resolutionStatus,
          'queries.$.approverComment': updateData.approverComment,
          'queries.$.isResolved': updateData.isResolved || ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(updateData.status),
          lastUpdated: new Date()
        };
        
        // Update fields for direct query documents (without 'queries.$.' prefix)
        const directUpdateFields: any = {
          status: updateData.status,
          proposedAction: updateData.proposedAction,
          proposedBy: updateData.proposedBy,
          proposedAt: updateData.proposedAt ? new Date(updateData.proposedAt) : undefined,
          resolvedAt: updateData.resolvedAt ? new Date(updateData.resolvedAt) : undefined,
          resolvedBy: updateData.resolvedBy,
          resolutionReason: updateData.resolutionReason,
          resolutionStatus: updateData.resolutionStatus,
          approverComment: updateData.approverComment,
          isResolved: updateData.isResolved || ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(updateData.status),
          lastUpdated: new Date()
        };
        
        // Add approval tracking fields if query is being approved
        if (updateData.status && ['approved', 'deferred', 'otc', 'waived', 'request-approved', 'request-deferral', 'request-otc'].includes(updateData.status)) {
          updateFields.approvedBy = updateData.approvedBy || updateData.resolvedBy;
          updateFields.approvedAt = updateData.approvedAt || updateData.resolvedAt ? new Date(updateData.approvedAt || updateData.resolvedAt) : new Date();
          updateFields.approvalDate = updateData.approvalDate || updateData.resolvedAt ? new Date(updateData.approvalDate || updateData.resolvedAt) : new Date();
          updateFields.approvalStatus = updateData.approvalStatus || updateData.status;
          
          // Also add to direct update fields
          directUpdateFields.approvedBy = updateData.approvedBy || updateData.resolvedBy;
          directUpdateFields.approvedAt = updateData.approvedAt || updateData.resolvedAt ? new Date(updateData.approvedAt || updateData.resolvedAt) : new Date();
          directUpdateFields.approvalDate = updateData.approvalDate || updateData.resolvedAt ? new Date(updateData.approvalDate || updateData.resolvedAt) : new Date();
          directUpdateFields.approvalStatus = updateData.approvalStatus || updateData.status;
        }
        
        // Try to find and update the query with multiple search patterns
        console.log('🔍 MongoDB: Searching for individual query...');
        
        // First, try to update as a sub-query within a query group
        // Pattern 1: Search with originalQueryId (full UUID)
        if (originalQueryId) {
          console.log(`🔍 MongoDB: Trying sub-query with originalQueryId: "${originalQueryId}"`);
          const result1 = await db.collection('queries').updateOne(
            { 'queries.id': originalQueryId },
            { $set: updateFields }
          );
          if (result1.modifiedCount > 0) {
            mongoUpdated = true;
            console.log(`✅ MongoDB: Found and updated sub-query with originalQueryId: ${originalQueryId}`);
            mongoQuery = await db.collection('queries').findOne({ 'queries.id': originalQueryId });
          }
        }
        
        // Pattern 2: Search with numeric queryId if Pattern 1 failed
        if (!mongoUpdated && queryId) {
          console.log(`🔍 MongoDB: Trying sub-query with numeric queryId: ${queryId}`);
          const result2 = await db.collection('queries').updateOne(
            { 'queries.id': queryId },
            { $set: updateFields }
          );
          if (result2.modifiedCount > 0) {
            mongoUpdated = true;
            console.log(`✅ MongoDB: Found and updated sub-query with numeric queryId: ${queryId}`);
            mongoQuery = await db.collection('queries').findOne({ 'queries.id': queryId });
          }
        }
        
        // Pattern 3: Search with string conversion if Patterns 1&2 failed
        if (!mongoUpdated && queryId) {
          const stringQueryId = String(queryId);
          console.log(`🔍 MongoDB: Trying sub-query with string queryId: "${stringQueryId}"`);
          const result3 = await db.collection('queries').updateOne(
            { 'queries.id': stringQueryId },
            { $set: updateFields }
          );
          if (result3.modifiedCount > 0) {
            mongoUpdated = true;
            console.log(`✅ MongoDB: Found and updated sub-query with string queryId: ${stringQueryId}`);
            mongoQuery = await db.collection('queries').findOne({ 'queries.id': stringQueryId });
          }
        }
        
        // If not found as sub-query, try to update as a direct individual query document
        if (!mongoUpdated) {
          console.log('🔍 MongoDB: Sub-query not found, trying as direct individual query...');
          
          for (const searchId of uniqueSearchIds) {
            console.log(`🔍 MongoDB: Trying direct query with ID: "${searchId}"`);
            const result = await db.collection('queries').updateOne(
              { id: searchId },
              { $set: directUpdateFields }
            );
            if (result.modifiedCount > 0) {
              mongoUpdated = true;
              console.log(`✅ MongoDB: Found and updated direct query with ID: ${searchId}`);
              mongoQuery = await db.collection('queries').findOne({ id: searchId });
              break;
            }
          }
        }

        // Also update the main document status if the query is resolved
        if (mongoUpdated && ['approved', 'deferred', 'otc', 'waived', 'resolved', 'request-approved', 'request-deferral', 'request-otc'].includes(updateData.status)) {
          console.log('🔍 MongoDB: Updating main document status...');
          
          const mainUpdateFields = {
            status: updateData.status,
            resolvedAt: updateData.resolvedAt ? new Date(updateData.resolvedAt) : new Date(),
            resolvedBy: updateData.resolvedBy,
            lastUpdated: new Date()
          };
          
          // Try to update with the same pattern that worked for the sub-query
          if (originalQueryId) {
            await db.collection('queries').updateOne(
              { 'queries.id': originalQueryId },
              { $set: mainUpdateFields }
            );
          } else if (queryId) {
            await db.collection('queries').updateOne(
              { 'queries.id': queryId },
              { $set: mainUpdateFields }
            );
          }
          
          console.log(`✅ MongoDB: Updated main query document status to ${updateData.status}`);
        }
      } else {
        // Update entire query group logic here (keeping existing code)
        const updateFields = {
          ...updateData,
          lastUpdated: new Date(),
          resolvedAt: updateData.resolvedAt ? new Date(updateData.resolvedAt) : undefined,
          proposedAt: updateData.proposedAt ? new Date(updateData.proposedAt) : undefined
        };
        
        // Add approval tracking fields if query is being approved
        if (updateData.status && ['approved', 'deferred', 'otc', 'waived', 'request-approved', 'request-deferral', 'request-otc'].includes(updateData.status)) {
          updateFields.approvedBy = updateData.approvedBy || updateData.resolvedBy;
          updateFields.approvedAt = updateData.approvedAt || updateData.resolvedAt ? new Date(updateData.approvedAt || updateData.resolvedAt) : new Date();
          updateFields.approvalDate = updateData.approvalDate || updateData.resolvedAt ? new Date(updateData.approvalDate || updateData.resolvedAt) : new Date();
          updateFields.approvalStatus = updateData.approvalStatus || updateData.status;
        }
        
        // Try to update entire query group with multiple search patterns
        let result = await db.collection('queries').updateOne(
          { id: queryId },
          { $set: updateFields }
        );
        
        // Try with other search patterns if first attempt failed
        if (result.modifiedCount === 0) {
          for (const searchId of uniqueSearchIds) {
            if (searchId !== queryId) {
              result = await db.collection('queries').updateOne(
                { id: searchId },
                { $set: updateFields }
              );
              if (result.modifiedCount > 0) {
                console.log(`✅ MongoDB: Found query group with searchId: ${searchId}`);
                break;
              }
            }
          }
        }
        
        // Try with numeric conversion if still no results
        if (result.modifiedCount === 0 && !isNaN(numericQueryId)) {
          result = await db.collection('queries').updateOne(
            { id: numericQueryId },
            { $set: updateFields }
          );
          if (result.modifiedCount > 0) {
            console.log(`✅ MongoDB: Found query group with numeric ID: ${numericQueryId}`);
          }
        }
        
        if (result.modifiedCount > 0) {
          mongoUpdated = true;
          console.log(`✅ MongoDB: Updated query group ${queryId} with approval tracking`);
          mongoQuery = await db.collection('queries').findOne({ id: queryId }) || 
                       await db.collection('queries').findOne({ id: originalQueryId });
        }
      }
    } catch (dbError) {
      console.error('❌ MongoDB update failed, falling back to in-memory:', dbError);
    }
    
    // Handle individual query updates vs whole query group updates
    if (isIndividualQuery) {
      // For individual query updates (most common case for approvals)
      let updated = false;
      
      // If MongoDB update succeeded, we're done
      if (mongoUpdated) {
        console.log('✅ MongoDB update succeeded, skipping in-memory fallback');
        updated = true;
      } else {
        console.log('🔄 MongoDB update failed, trying in-memory fallback...');
        
        // First, try to find as sub-query within query groups
        for (let i = 0; i < queriesDatabase.length; i++) {
          const queryGroup = queriesDatabase[i];
          if (queryGroup.queries && Array.isArray(queryGroup.queries)) {
            for (let j = 0; j < queryGroup.queries.length; j++) {
              const currentQuery = queryGroup.queries[j];
              // Check multiple ID patterns for matching
              const isMatch = uniqueSearchIds.some(searchId => 
                currentQuery.id === searchId || 
                currentQuery.id === searchId.toString() ||
                currentQuery.id === String(searchId) ||
                (Number(currentQuery.id) === Number(searchId) && !isNaN(Number(searchId)))
              );
              
              if (isMatch) {
                console.log(`✅ In-memory: Found matching sub-query with ID patterns:`, {
                  currentQueryId: currentQuery.id,
                  searchIds: uniqueSearchIds,
                  queryGroupApp: queryGroup.appNo
                });
                
                // Update the specific query within the group
                queryGroup.queries[j] = {
                  ...queryGroup.queries[j],
                  ...updateData,
                  lastUpdated: new Date().toISOString(),
                  // Ensure waiver and other resolution actions are properly marked as resolved
                  isResolved: updateData.isResolved || ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(updateData.status)
                };
                
                // Also update the main query group if all sub-queries are resolved
                const allResolved = queryGroup.queries.every((q: any) =>
                  ['approved', 'deferred', 'otc', 'waived', 'resolved', 'request-approved', 'request-deferral', 'request-otc'].includes(q.status || queryGroup.status)
                );
                
                // Only elevate the entire group status when ALL sub-queries are resolved.
                // Previously we were also updating the group status whenever a single sub-query
                // transitioned to a resolved state. That caused remaining pending queries for the
                // same application to disappear from the "Queries Raised" list prematurely.
                if (allResolved) {
                  queryGroup.status = updateData.status; // all sub-queries share final state (last one wins)
                  queryGroup.resolvedAt = updateData.resolvedAt;
                  queryGroup.resolvedBy = updateData.resolvedBy;
                  queryGroup.resolutionReason = updateData.resolutionReason;
                  queryGroup.assignedTo = updateData.assignedTo;
                  queryGroup.lastUpdated = new Date().toISOString();
                  // Approval tracking fields (only when everything is resolved)
                  queryGroup.approvedBy = updateData.approvedBy || updateData.resolvedBy;
                  queryGroup.approvedAt = updateData.approvedAt || updateData.resolvedAt;
                  queryGroup.approvalDate = updateData.approvalDate || updateData.resolvedAt;
                  queryGroup.approvalStatus = updateData.approvalStatus || updateData.status;
                }
                
                queriesDatabase[i] = queryGroup;
                updated = true;
                console.log(`✅ Updated sub-query ${queryId} in group ${queryGroup.appNo}`);
                break;
              }
            }
          }
          if (updated) break;
        }
        
        // If not found as sub-query, try to find as direct individual query document
        if (!updated) {
          console.log('🔄 Sub-query not found in memory, trying as direct individual query...');
          
          for (let i = 0; i < queriesDatabase.length; i++) {
            const query = queriesDatabase[i];
            
            // Check if this is a direct individual query (not a query group)
            const isMatch = uniqueSearchIds.some(searchId => 
              query.id === searchId || 
              query.id === searchId.toString() ||
              query.id === String(searchId) ||
              (Number(query.id) === Number(searchId) && !isNaN(Number(searchId)))
            );
            
            if (isMatch) {
              console.log(`✅ In-memory: Found matching direct query with ID patterns:`, {
                queryId: query.id,
                searchIds: uniqueSearchIds,
                appNo: query.appNo
              });
              
              // Update the direct query
              queriesDatabase[i] = {
                ...queriesDatabase[i],
                ...updateData,
                lastUpdated: new Date().toISOString(),
                isResolved: updateData.isResolved || ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(updateData.status)
              };
              
              updated = true;
              console.log(`✅ Updated direct individual query ${queryId}`);
              break;
            }
          }
        }
      }
      
      if (!updated) {
        console.error(`❌ Individual query update failed - neither MongoDB nor in-memory update succeeded`);
        console.error(`❌ Search patterns tried:`, uniqueSearchIds);
        console.error(`❌ MongoDB updated:`, mongoUpdated);
        
        // Debug: Show what queries are actually available
        console.error(`🔍 Available queries in in-memory database (${queriesDatabase.length} total):`);
        queriesDatabase.forEach((queryGroup, index) => {
          if (queryGroup.queries && Array.isArray(queryGroup.queries)) {
            queryGroup.queries.forEach((subQuery, subIndex) => {
              console.error(`  ${index}.${subIndex}: ID="${subQuery.id}" (type: ${typeof subQuery.id}), App=${queryGroup.appNo}, Status=${subQuery.status}`);
            });
          } else {
            console.error(`  ${index}: Group ID="${queryGroup.id}" (type: ${typeof queryGroup.id}), App=${queryGroup.appNo}, Status=${queryGroup.status}`);
          }
        });
        
        return NextResponse.json(
          { success: false, error: 'Individual query not found', searchPatterns: uniqueSearchIds },
          { status: 404 }
        );
      }
    } else {
      // For whole query group updates
      let queryIndex = -1;
      
      // Search with multiple ID patterns
      for (let i = 0; i < queriesDatabase.length; i++) {
        const query = queriesDatabase[i];
        const isMatch = uniqueSearchIds.some(searchId => 
          query.id === searchId || 
          query.id === searchId.toString() ||
          query.id === String(searchId) ||
          (Number(query.id) === Number(searchId) && !isNaN(Number(searchId)))
        );
        
        if (isMatch) {
          queryIndex = i;
          console.log(`✅ In-memory: Found matching query group with ID patterns:`, {
            queryId: query.id,
            searchIds: uniqueSearchIds,
            appNo: query.appNo
          });
          break;
        }
      }
      
      if (queryIndex === -1) {
        console.log('❌ Query group not found with any search patterns:', uniqueSearchIds);
        return NextResponse.json(
          { success: false, error: 'Query not found' },
          { status: 404 }
        );
      }
      
      // Update the query with new data
      queriesDatabase[queryIndex] = {
        ...queriesDatabase[queryIndex],
        ...updateData,
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`✅ Updated query group ${queryId}`);
    }
    
    // Update global database
    global.globalQueriesDatabase = queriesDatabase;
    
    // Find the updated query (group or sub-query) for broadcasting with multiple ID patterns
    let foundQuery: any = null;
    let foundSubQuery: any = null;
    
    // If we have mongoQuery from successful MongoDB update, use that
    if (mongoQuery) {
      foundQuery = mongoQuery;
      console.log(`✅ Using MongoDB query result for broadcast: ${mongoQuery.appNo}`);
      
      // Find the specific sub-query if this was an individual query update
      if (isIndividualQuery && mongoQuery.queries) {
        foundSubQuery = mongoQuery.queries.find((sq: any) => 
          uniqueSearchIds.some(searchId => 
            sq.id === searchId || 
            sq.id === searchId.toString() ||
            sq.id === String(searchId)
          )
        );
        if (foundSubQuery) {
          console.log(`✅ Found updated sub-query in MongoDB result: ${foundSubQuery.id}`);
        }
      }
    } else {
      // Fallback to searching in-memory database
      for (const group of queriesDatabase) {
        // Check if this is the main query group
        const isMainMatch = uniqueSearchIds.some(searchId => 
          group.id === searchId || 
          group.id === searchId.toString() ||
          group.id === String(searchId) ||
          (Number(group.id) === Number(searchId) && !isNaN(Number(searchId)))
        );
        
        if (isMainMatch) {
          foundQuery = group;
          console.log(`✅ Found updated query group for broadcast:`, group.appNo);
          break;
        }
        
        // Check individual queries within the group
        if (group.queries && Array.isArray(group.queries)) {
          const sub = group.queries.find((sq: any) => 
            uniqueSearchIds.some(searchId => 
              sq.id === searchId || 
              sq.id === searchId.toString() ||
              sq.id === String(searchId) ||
              (Number(sq.id) === Number(searchId) && !isNaN(Number(searchId)))
            )
          );
          
          if (sub) {
            foundQuery = group;
            foundSubQuery = sub;
            console.log(`✅ Found updated sub-query for broadcast:`, group.appNo, 'sub-query:', sub.id);
            break;
          }
        }
      }
    }

    if (foundQuery) {
      console.log(`✅ Query ${queryId} updated successfully`);
      
      // Broadcast real-time update
      const updateBroadcast = {
        id: foundQuery.id,
        appNo: foundQuery.appNo,
        customerName: foundQuery.customerName,
        branch: foundQuery.branch,
        status: updateData.status || foundSubQuery?.status || foundQuery.status,
        priority: foundQuery.priority,
        team: foundQuery.team,
        markedForTeam: foundQuery.markedForTeam,
        createdAt: foundQuery.createdAt,
        submittedBy: foundQuery.submittedBy,
  action: ['approved', 'deferred', 'otc', 'waived', 'resolved', 'request-approved', 'request-deferral', 'request-otc'].includes(updateData.status) ? 'resolved' as const : 'updated' as const,
        resolvedBy: updateData.resolvedBy,
        resolvedAt: updateData.resolvedAt,
        approverComment: updateData.approverComment || updateData.resolutionReason,
        // Include approval tracking in broadcast
        approvedBy: updateData.approvedBy || updateData.resolvedBy,
        approvedAt: updateData.approvedAt || updateData.resolvedAt,
        approvalStatus: updateData.approvalStatus || updateData.status
      };
      
      console.log(`📡 Broadcasting query update: ${updateBroadcast.appNo} status: ${updateBroadcast.status}`);
      
      try {
        // Log the update for polling fallback
        logQueryUpdate({
          queryId: foundQuery.id,
          appNo: foundQuery.appNo,
          customerName: foundQuery.customerName,
          branch: foundQuery.branch,
          status: updateBroadcast.status,
          priority: foundQuery.priority,
          team: foundQuery.team,
          markedForTeam: foundQuery.markedForTeam,
          createdAt: foundQuery.createdAt,
          submittedBy: foundQuery.submittedBy,
          action: ['approved', 'deferred', 'otc', 'waived', 'resolved', 'request-approved', 'request-deferral', 'request-otc'].includes(updateData.status) ? 'resolved' : 'updated'
        });
        
        // Broadcast via SSE
        broadcastQueryUpdate(updateBroadcast);
        console.log('✅ Successfully broadcasted query update:', updateBroadcast.appNo);
      } catch (error) {
        console.error('Failed to broadcast query update:', error);
      }
      
      // Check if all queries for this application are resolved and delete from sanctioned cases if so
      if (['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(updateData.status) && foundQuery.appNo) {
        await checkAndDeleteFromSanctionedCases(foundQuery.appNo);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Query updated successfully',
        data: foundQuery
      });
    }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error updating query:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}