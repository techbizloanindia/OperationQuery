// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MongoClient } = require('mongodb');

/**
 * Clean chat storage and ensure proper isolation for Vercel deployment
 * This script removes global message storage contamination and optimizes for serverless
 */

async function cleanChatStorage() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb+srv://querymodel:EXIpJy6PMJ2FS79L@querymodel.kqivk1u.mongodb.net/?retryWrites=true&w=majority&appName=querymodel');
  
  try {
    console.log('🔧 Starting chat storage cleanup for Vercel deployment...');
    
    await client.connect();
    const db = client.db('querymodel');
    const messagesCollection = db.collection('chat_messages');
    
    // Step 1: Get current state
    const allMessages = await messagesCollection.find({}).toArray();
    console.log(`📊 Found ${allMessages.length} total messages`);
    
    // Step 2: Identify and fix issues
    const fixes = {
      duplicatesRemoved: 0,
      isolationFixed: 0,
      crossQueryFixed: 0,
      metadataAdded: 0
    };
    
    const queryGroups = new Map();
    
    // Group by queryId
    for (const message of allMessages) {
      const queryId = message.queryId?.toString()?.trim();
      if (!queryId) {
        // Remove messages without queryId
        await messagesCollection.deleteOne({ _id: message._id });
        fixes.duplicatesRemoved++;
        continue;
      }
      
      if (!queryGroups.has(queryId)) {
        queryGroups.set(queryId, []);
      }
      queryGroups.get(queryId).push(message);
    }
    
    console.log(`📊 Found ${queryGroups.size} unique queries`);
    
    // Step 3: Process each query group
    for (const [queryId, messages] of queryGroups) {
      console.log(`🔍 Processing query ${queryId} with ${messages.length} messages`);
      
      // Remove duplicates within query
      const uniqueMessages = new Map();
      for (const message of messages) {
        const timestamp = Math.floor(new Date(message.timestamp).getTime() / 1000);
        const uniqueKey = `${message.message}|${message.sender}|${timestamp}`;
        
        if (!uniqueMessages.has(uniqueKey)) {
          uniqueMessages.set(uniqueKey, message);
        } else {
          // Delete duplicate
          await messagesCollection.deleteOne({ _id: message._id });
          fixes.duplicatesRemoved++;
        }
      }
      
      // Update remaining messages with proper isolation
      for (const [, message] of uniqueMessages) {
        const updateData = {
          queryId: queryId.toString(),
          isolationKey: `query_${queryId}`,
          threadIsolated: true,
          cleanedAt: new Date()
        };
        
        // Only update if missing isolation data
        if (!message.threadIsolated || !message.isolationKey) {
          await messagesCollection.updateOne(
            { _id: message._id },
            { $set: updateData }
          );
          fixes.isolationFixed++;
        }
        
        // Fix cross-query issues
        if (message.queryId !== queryId) {
          await messagesCollection.updateOne(
            { _id: message._id },
            { $set: { queryId: queryId, originalQueryId: message.queryId } }
          );
          fixes.crossQueryFixed++;
        }
      }
    }
    
    // Step 4: Create indexes for performance
    console.log('🔧 Creating optimized indexes...');
    
    await messagesCollection.createIndex({ queryId: 1 });
    await messagesCollection.createIndex({ queryId: 1, timestamp: -1 });
    await messagesCollection.createIndex({ isolationKey: 1 });
    await messagesCollection.createIndex({ threadIsolated: 1 });
    
    // Step 5: Final validation
    const finalMessages = await messagesCollection.find({}).toArray();
    const finalQueries = new Set();
    
    for (const message of finalMessages) {
      if (message.queryId) {
        finalQueries.add(message.queryId);
      }
    }
    
    console.log('✅ Chat storage cleanup completed successfully!');
    console.log('📊 Results:');
    console.log(`   - Messages before: ${allMessages.length}`);
    console.log(`   - Messages after: ${finalMessages.length}`);
    console.log(`   - Queries: ${finalQueries.size}`);
    console.log(`   - Duplicates removed: ${fixes.duplicatesRemoved}`);
    console.log(`   - Isolation fixed: ${fixes.isolationFixed}`);
    console.log(`   - Cross-query fixed: ${fixes.crossQueryFixed}`);
    
    return {
      success: true,
      before: allMessages.length,
      after: finalMessages.length,
      queries: finalQueries.size,
      fixes
    };
    
  } catch (error) {
    console.error('💥 Error during cleanup:', error);
    return { success: false, error: error.message };
  } finally {
    await client.close();
  }
}

// Run if called directly
// Run if called directly
if (require.main === module) {
  cleanChatStorage()
    .then(result => {
      console.log('Final result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Script error:', error);
      process.exit(1);
    });
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = { cleanChatStorage };