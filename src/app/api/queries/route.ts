import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Query, { IRemark } from '@/lib/models/Query';
import { broadcastQueryUpdate } from '@/lib/eventStreamUtils';
import { logQueryUpdate } from '@/lib/queryUpdateLogger';

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
  status: 'pending' | 'resolved' | 'approved' | 'deferred' | 'otc' | 'pending-approval' | 'waiting for approval';
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
  status: 'pending' | 'resolved' | 'approved' | 'deferred' | 'otc' | 'pending-approval';
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

const initializeData = () => {
  if (!global.globalQueriesDatabase || global.globalQueriesDatabase.length === 0) {
    global.globalQueriesDatabase = [];
  }
  queriesDatabase = global.globalQueriesDatabase;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const team = searchParams.get('team');
    const stats = searchParams.get('stats');
    const limit = searchParams.get('limit');
    
    let plainQueries: any[] = [];
    
    // Try MongoDB first
    try {
      const { connectDB } = await import('@/lib/mongodb');
      const { db } = await connectDB();
      
      // Build query filter
      const filter: any = {};
      
      if (team) {
        filter.$or = [
          { markedForTeam: team.toLowerCase() },
          { markedForTeam: 'both' },
          { team: team.toLowerCase() }
        ];
      }
      
      if (status && status !== 'all') {
        filter.status = status;
      }
      
      const queries = await db.collection('queries').find(filter).sort({ createdAt: -1 }).toArray();
      console.log(`📊 Found ${queries.length} queries in MongoDB with filter:`, filter);
      
      // Convert to plain objects with string dates
      plainQueries = queries.map(query => ({
        ...query,
        id: query.id || query._id?.toString(),
        createdAt: query.createdAt.toISOString(),
        submittedAt: query.submittedAt?.toISOString() || query.createdAt.toISOString(),
        resolvedAt: query.resolvedAt?.toISOString(),
        lastUpdated: query.lastUpdated?.toISOString(),
        proposedAt: query.proposedAt?.toISOString(),
        revertedAt: query.revertedAt?.toISOString(),
        remarks: query.remarks?.map((remark: any) => ({
          ...remark,
          timestamp: remark.timestamp?.toISOString ? remark.timestamp.toISOString() : remark.timestamp,
          editedAt: remark.editedAt?.toISOString ? remark.editedAt.toISOString() : remark.editedAt
        })) || []
      }));
      
    } catch (dbError) {
      console.error('❌ MongoDB query failed, falling back to in-memory storage:', dbError);
      
      // Fallback to in-memory storage
      initializeData();
      const memoryQueries = global.globalQueriesDatabase || [];
      
      // Apply filters to in-memory data
      plainQueries = memoryQueries.filter((query: any) => {
        let matches = true;
        
        if (status && status !== 'all' && query.status !== status) {
          matches = false;
        }
        
        if (team && query.markedForTeam !== team.toLowerCase() && 
            query.markedForTeam !== 'both' && query.team !== team.toLowerCase()) {
          matches = false;
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
      const statsData = {
        total: plainQueries.length,
        pending: plainQueries.filter(q => q.status === 'pending').length,
        resolved: plainQueries.filter(q => q.status === 'resolved').length,
        urgent: plainQueries.filter(q => q.priority === 'high').length,
        todaysQueries: plainQueries.filter(q => 
          new Date(q.createdAt).toDateString() === new Date().toDateString()
        ).length
      };
      
      return NextResponse.json({
        success: true,
        data: statsData,
        filters: { status, team }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: plainQueries,
      count: plainQueries.length,
      filters: { status, team }
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
    // Connect to MongoDB for persistent storage
    const { connectDB } = await import('@/lib/mongodb');
    await connectDB();
    
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

    // Get application details efficiently with direct database access
    let customerName = 'Unknown Customer';
    let branchName = 'Unknown Branch';
    
    try {
      const { ApplicationModel } = await import('@/lib/models/Application');
      const appDetails = await ApplicationModel.getApplicationByAppId(appNo);
      if (appDetails) {
        customerName = appDetails.customerName || 'Unknown Customer';
        branchName = appDetails.branch || 'Unknown Branch';
      }
    } catch (fetchError) {
      console.warn('Failed to fetch application details:', fetchError);
      // Use default values
    }

    // Save to MongoDB for persistent storage
    const Query = (await import('@/lib/models/Query')).default;
    const createdQueries: QueryData[] = [];
    
    for (let i = 0; i < queryTexts.length; i++) {
      const queryText = queryTexts[i];
      const baseId = crypto.randomUUID();
      
      // Generate unique query number
      const queryNumber = await generateQueryNumber();
      
      // Determine team assignment for sales/credit dashboard routing
      let teamAssignment = 'operations';
      let markedForTeam = 'operations';
      
      if (sendTo.toLowerCase() === 'both') {
        teamAssignment = 'both';
        markedForTeam = 'both';
      } else if (sendTo.toLowerCase() === 'sales') {
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
        branchCode: branchName,
        queries: [{
          id: `${baseId}-query-${i}`,
          text: queryText,
          timestamp: new Date().toISOString(),
          sender: 'Operations User',
          status: 'pending' as const,
          queryNumber: queryNumber,
          sentTo: sendTo.toLowerCase() === 'both' ? ['Sales', 'Credit'] : [sendTo],
          tat: '24 hours'
        }],
        sendTo: sendTo.toLowerCase() === 'both' ? ['Sales', 'Credit'] : [sendTo],
        // Additional fields for proper team routing
        sendToSales: sendTo.toLowerCase() === 'sales' || sendTo.toLowerCase() === 'both',
        sendToCredit: sendTo.toLowerCase() === 'credit' || sendTo.toLowerCase() === 'both',
        remarks: [] as IRemark[],
        isResolved: false,
        isIndividualQuery: true
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
    
    initializeData();
    
    const body = await request.json();
    const { queryId, isIndividualQuery, ...updateData } = body;
    
    if (!queryId) {
      return NextResponse.json(
        { success: false, error: 'Query ID is required' },
        { status: 400 }
      );
    }
    
    // Updating query
    
    // Try to update in MongoDB first
    let mongoUpdated = false;
    try {
      if (isIndividualQuery) {
        // Update specific query within a group
        const updateFields: any = {
          'queries.$.status': updateData.status,
          'queries.$.proposedAction': updateData.proposedAction,
          'queries.$.proposedBy': updateData.proposedBy,
          'queries.$.proposedAt': updateData.proposedAt ? new Date(updateData.proposedAt) : undefined,
          'queries.$.resolvedAt': updateData.resolvedAt ? new Date(updateData.resolvedAt) : undefined,
          'queries.$.resolvedBy': updateData.resolvedBy,
          'queries.$.approverComment': updateData.approverComment,
          lastUpdated: new Date()
        };
        
        // Add approval tracking fields if query is being approved
        if (updateData.status && ['approved', 'deferred', 'otc'].includes(updateData.status)) {
          updateFields.approvedBy = updateData.approvedBy || updateData.resolvedBy;
          updateFields.approvedAt = updateData.approvedAt || updateData.resolvedAt ? new Date(updateData.approvedAt || updateData.resolvedAt) : new Date();
          updateFields.approvalDate = updateData.approvalDate || updateData.resolvedAt ? new Date(updateData.approvalDate || updateData.resolvedAt) : new Date();
          updateFields.approvalStatus = updateData.approvalStatus || updateData.status;
        }
        
        const result = await db.collection('queries').updateOne(
          { 'queries.id': queryId },
          { $set: updateFields }
        );
        
        if (result.modifiedCount > 0) {
          mongoUpdated = true;
          console.log(`✅ MongoDB: Updated individual query ${queryId}`);
        }
      } else {
        // Update entire query group
        const updateFields = {
          ...updateData,
          lastUpdated: new Date(),
          resolvedAt: updateData.resolvedAt ? new Date(updateData.resolvedAt) : undefined,
          proposedAt: updateData.proposedAt ? new Date(updateData.proposedAt) : undefined
        };
        
        // Add approval tracking fields if query is being approved
        if (updateData.status && ['approved', 'deferred', 'otc'].includes(updateData.status)) {
          updateFields.approvedBy = updateData.approvedBy || updateData.resolvedBy;
          updateFields.approvedAt = updateData.approvedAt || updateData.resolvedAt ? new Date(updateData.approvedAt || updateData.resolvedAt) : new Date();
          updateFields.approvalDate = updateData.approvalDate || updateData.resolvedAt ? new Date(updateData.approvalDate || updateData.resolvedAt) : new Date();
          updateFields.approvalStatus = updateData.approvalStatus || updateData.status;
        }
        
        const result = await db.collection('queries').updateOne(
          { id: queryId },
          { $set: updateFields }
        );
        
        if (result.modifiedCount > 0) {
          mongoUpdated = true;
          console.log(`✅ MongoDB: Updated query group ${queryId} with approval tracking`);
        }
      }
    } catch (dbError) {
      console.error('❌ MongoDB update failed, falling back to in-memory:', dbError);
    }
    
    // Handle individual query updates vs whole query group updates
    if (isIndividualQuery) {
      // For individual query updates (most common case for approvals)
      let updated = false;
      
      for (let i = 0; i < queriesDatabase.length; i++) {
        const queryGroup = queriesDatabase[i];
        if (queryGroup.queries && Array.isArray(queryGroup.queries)) {
          for (let j = 0; j < queryGroup.queries.length; j++) {
            if (queryGroup.queries[j].id === queryId || queryGroup.queries[j].id === queryId.toString()) {
              // Update the specific query within the group
              queryGroup.queries[j] = {
                ...queryGroup.queries[j],
                ...updateData,
                lastUpdated: new Date().toISOString()
              };
              
              // Also update the main query group if all sub-queries are resolved
              const allResolved = queryGroup.queries.every((q: any) =>
                ['approved', 'deferred', 'otc', 'resolved'].includes(q.status || queryGroup.status)
              );
              
              if (allResolved || ['approved', 'deferred', 'otc', 'resolved'].includes(updateData.status)) {
                queryGroup.status = updateData.status;
                queryGroup.resolvedAt = updateData.resolvedAt;
                queryGroup.resolvedBy = updateData.resolvedBy;
                queryGroup.resolutionReason = updateData.resolutionReason;
                queryGroup.assignedTo = updateData.assignedTo;
                queryGroup.lastUpdated = new Date().toISOString();
                // Add approval tracking fields
                queryGroup.approvedBy = updateData.approvedBy || updateData.resolvedBy;
                queryGroup.approvedAt = updateData.approvedAt || updateData.resolvedAt;
                queryGroup.approvalDate = updateData.approvalDate || updateData.resolvedAt;
                queryGroup.approvalStatus = updateData.approvalStatus || updateData.status;
              }
              
              queriesDatabase[i] = queryGroup;
              updated = true;
              console.log(`✅ Updated individual query ${queryId} in group ${queryGroup.appNo}`);
              break;
            }
          }
        }
        if (updated) break;
      }
      
      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Individual query not found' },
          { status: 404 }
        );
      }
    } else {
      // For whole query group updates
      const queryIndex = queriesDatabase.findIndex(q => q.id === queryId || q.id === queryId.toString());
      
      if (queryIndex === -1) {
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
    
    // Find the updated query (group or sub-query) for broadcasting
    let foundQuery: any = null;
    let foundSubQuery: any = null;
    for (const group of queriesDatabase) {
      if (group.id === queryId || group.id === queryId.toString()) {
        foundQuery = group;
        break;
      }
      if (group.queries && Array.isArray(group.queries)) {
        const sub = group.queries.find((sq: any) => sq.id === queryId || sq.id === queryId.toString());
        if (sub) {
          foundQuery = group;
          foundSubQuery = sub;
          break;
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
        action: ['approved', 'deferred', 'otc', 'resolved'].includes(updateData.status) ? 'approved' as const : 'updated' as const,
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
          action: ['approved', 'deferred', 'otc', 'resolved'].includes(updateData.status) ? 'resolved' : 'updated'
        });
        
        // Broadcast via SSE
        broadcastQueryUpdate(updateBroadcast);
        console.log('✅ Successfully broadcasted query update:', updateBroadcast.appNo);
      } catch (error) {
        console.error('Failed to broadcast query update:', error);
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