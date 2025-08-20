// Store active connections
const connections = new Set<{
  id: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
}>();

// Cleanup inactive connections
setInterval(() => {
  const now = Date.now();
  connections.forEach(conn => {
    if (now - conn.lastPing > 65000) { // 65 seconds timeout
      try {
        conn.controller.close();
      } catch (e) {
        // Connection already closed
      }
      connections.delete(conn);
    }
  });
}, 30000); // Cleanup every 30 seconds

// Function to broadcast query updates to all connected clients
export function broadcastQueryUpdate(update: any) {
  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify({
    type: 'query_update',
    ...update,
    timestamp: new Date().toISOString()
  })}\n\n`;

  console.log(`📡 Broadcasting to ${connections.size} connections:`, {
    appNo: update.appNo,
    action: update.action,
    team: update.team,
    markedForTeam: update.markedForTeam
  });

  const deadConnections = new Set<{
    id: string;
    controller: ReadableStreamDefaultController;
    lastPing: number;
  }>();
  
  connections.forEach(conn => {
    try {
      conn.controller.enqueue(encoder.encode(data));
      conn.lastPing = Date.now(); // Update last activity
    } catch (error) {
      console.warn('Dead connection detected, marking for removal:', conn.id);
      deadConnections.add(conn);
    }
  });

  // Remove dead connections
  deadConnections.forEach(conn => {
    connections.delete(conn);
  });

  console.log(`📤 Broadcast completed. Active connections: ${connections.size}`);
}

// Function to add a connection (to be called from the route handler)
export function addConnection(connection: {
  id: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
}) {
  connections.add(connection);
  console.log(`🔗 New SSE connection added: ${connection.id}. Total connections: ${connections.size}`);
}

// Function to remove a connection
export function removeConnection(connection: {
  id: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
}) {
  connections.delete(connection);
  console.log(`🔌 SSE connection removed: ${connection.id}. Total connections: ${connections.size}`);
}

// Function to get all connections (for debugging)
export function getConnections() {
  return Array.from(connections);
}
