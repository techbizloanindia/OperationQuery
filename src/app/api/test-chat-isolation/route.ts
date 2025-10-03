import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/services/ChatStorageService';

/**
 * Test endpoint to verify chat isolation functionality
 * This endpoint will create test messages for different queries
 * and verify they remain properly isolated
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Starting chat isolation test...');
    
    const testQueries = ['TEST_QUERY_1', 'TEST_QUERY_2', 'TEST_QUERY_3'];
    const testResults: any = {};
    
    // Step 1: Create test messages for each query
    for (const queryId of testQueries) {
      testResults[queryId] = {
        messagesSent: 0,
        messagesRetrieved: 0,
        crossContamination: false,
        errors: []
      };
      
      try {
        // Create 3 test messages for each query
        for (let i = 1; i <= 3; i++) {
          const testMessage = {
            queryId: queryId,
            message: `Test message ${i} for query ${queryId}`,
            responseText: `Test message ${i} for query ${queryId}`,
            sender: `TestUser${i}`,
            senderRole: 'tester',
            team: 'testing',
            timestamp: new Date(Date.now() + i * 1000), // Stagger timestamps
            isSystemMessage: false,
            actionType: 'message' as const
          };
          
          const stored = await ChatStorageService.storeChatMessage(testMessage);
          if (stored) {
            testResults[queryId].messagesSent++;
          }
        }
        
        // Wait a moment for database consistency
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Retrieve messages for this query
        const retrievedMessages = await ChatStorageService.getChatMessages(queryId);
        testResults[queryId].messagesRetrieved = retrievedMessages.length;
        
        // Check for cross-contamination
        for (const message of retrievedMessages) {
          const messageQueryId = message.queryId?.toString();
          const originalQueryId = message.originalQueryId?.toString();
          
          if (messageQueryId !== queryId && originalQueryId !== queryId) {
            testResults[queryId].crossContamination = true;
            testResults[queryId].errors.push(
              `Message from query ${messageQueryId || originalQueryId} found in query ${queryId}`
            );
          }
        }
        
      } catch (error: any) {
        testResults[queryId].errors.push(error.message);
      }
    }
    
    // Step 2: Cross-validate isolation between queries
    for (const queryId of testQueries) {
      const messages = await ChatStorageService.getChatMessages(queryId);
      
      for (const otherQueryId of testQueries) {
        if (queryId === otherQueryId) continue;
        
        const otherMessages = await ChatStorageService.getChatMessages(otherQueryId);
        
        // Check if any messages from one query appear in another
        for (const message of messages) {
          const foundInOther = otherMessages.some(otherMsg => 
            otherMsg.message === message.message && 
            otherMsg.sender === message.sender
          );
          
          if (foundInOther) {
            testResults[queryId].crossContamination = true;
            testResults[queryId].errors.push(
              `Message leaked to query ${otherQueryId}`
            );
          }
        }
      }
    }
    
    // Step 3: Test global database isolation (if exists)
    const globalTestResults = {
      exists: false,
      messageCount: 0,
      isolationValid: true,
      errors: [] as string[]
    };
    
    if (typeof global !== 'undefined' && global.queryMessagesDatabase) {
      globalTestResults.exists = true;
      globalTestResults.messageCount = global.queryMessagesDatabase.length;
      
      // Check if test messages are properly isolated in global database
      const globalTestMessages = global.queryMessagesDatabase.filter(msg => 
        testQueries.includes(msg.queryId?.toString())
      );
      
      for (const message of globalTestMessages) {
        const messageQueryId = message.queryId?.toString();
        if (!testQueries.includes(messageQueryId)) {
          globalTestResults.isolationValid = false;
          globalTestResults.errors.push(
            `Invalid queryId ${messageQueryId} found in global database`
          );
        }
      }
    }
    
    // Step 4: Calculate overall test results
    const overallResults = {
      totalQueries: testQueries.length,
      successfulQueries: Object.values(testResults).filter((result: any) => 
        result.messagesSent === result.messagesRetrieved && 
        !result.crossContamination && 
        result.errors.length === 0
      ).length,
      isolationViolations: Object.values(testResults).filter((result: any) => 
        result.crossContamination
      ).length,
      totalErrors: Object.values(testResults).reduce((sum: number, result: any) => 
        sum + result.errors.length, 0
      )
    };
    
    const testPassed = overallResults.successfulQueries === overallResults.totalQueries && 
                      overallResults.isolationViolations === 0 && 
                      globalTestResults.isolationValid;
    
    console.log(`🧪 Chat isolation test ${testPassed ? 'PASSED' : 'FAILED'}`);
    
    return NextResponse.json({
      success: true,
      testPassed,
      results: {
        overall: overallResults,
        byQuery: testResults,
        global: globalTestResults,
        summary: {
          isolationWorking: testPassed,
          recommendedActions: testPassed ? 
            ['Chat isolation is working correctly'] : 
            [
              'Run POST /api/fix-chat-isolation to fix isolation issues',
              'Check database indexes',
              'Review chat storage implementation'
            ]
        }
      }
    });
    
  } catch (error: any) {
    console.error('💥 Error running chat isolation test:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to run chat isolation test',
        testPassed: false
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Cleaning up chat isolation test data...');
    
    const { db } = await (async () => {
      const { connectToDatabase } = await import('@/lib/mongodb');
      return connectToDatabase();
    })();
    
    const messagesCollection = db.collection('chat_messages');
    
    // Remove test messages
    const testQueries = ['TEST_QUERY_1', 'TEST_QUERY_2', 'TEST_QUERY_3'];
    
    const deleteResult = await messagesCollection.deleteMany({
      $or: [
        { queryId: { $in: testQueries } },
        { originalQueryId: { $in: testQueries } },
        { sender: { $regex: /^TestUser\d+$/ } }
      ]
    });
    
    // Clean global database if exists
    let globalCleaned = 0;
    if (typeof global !== 'undefined' && global.queryMessagesDatabase) {
      const originalLength = global.queryMessagesDatabase.length;
      global.queryMessagesDatabase = global.queryMessagesDatabase.filter(msg => 
        !testQueries.includes(msg.queryId?.toString()) &&
        !msg.sender?.match(/^TestUser\d+$/)
      );
      globalCleaned = originalLength - global.queryMessagesDatabase.length;
    }
    
    console.log('✅ Chat isolation test cleanup completed');
    
    return NextResponse.json({
      success: true,
      cleaned: {
        database: deleteResult.deletedCount,
        global: globalCleaned,
        total: deleteResult.deletedCount + globalCleaned
      }
    });
    
  } catch (error: any) {
    console.error('💥 Error cleaning up test data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to clean up test data' 
      },
      { status: 500 }
    );
  }
}