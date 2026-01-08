import { Server, Socket } from "socket.io";
import http from "http";
import NotificationModel from "./models/notification.model";

let io: Server | null = null;

export const initSocketServer = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3001",
        "https://6b34ffd6c50f.ngrok-free.app", // ngrok tunnel
        process.env.FRONTEND_URL || "http://localhost:3001",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io", // Default path, Socket.IO will use this
  });
  
  console.log("[SOCKET] 🚀 Socket.IO server initialized");
  console.log("[SOCKET] 📍 Socket path: /socket.io");
  console.log("[SOCKET] 🌐 Allowed origins:", [
    "http://localhost:3001",
    "https://6b34ffd6c50f.ngrok-free.app",
    process.env.FRONTEND_URL || "http://localhost:3001",
  ]);

  io.on("connection", (socket) => {
    const timestamp = new Date().toISOString();
    console.log(`[SOCKET] ✅ New connection - Socket ID: ${socket.id} | Time: ${timestamp}`);
    console.log(`[SOCKET] Total connected clients: ${io?.sockets.sockets.size || 0}`);

    // Log connection headers for debugging
    console.log(`[SOCKET] Connection headers:`, {
      userAgent: socket.handshake.headers['user-agent'],
      origin: socket.handshake.headers.origin,
      referer: socket.handshake.headers.referer,
    });

    // User joins a room with their userId for receiving personal notifications
    socket.on("joinUserRoom", (userId: string) => {
      const roomName = `user_${userId}`;
      socket.join(roomName);
      console.log(`[SOCKET] 👤 User ${userId} joined room: ${roomName} | Socket ID: ${socket.id}`);
      
      // Log room information
      const rooms = Array.from(socket.rooms);
      console.log(`[SOCKET] Socket ${socket.id} is now in rooms:`, rooms);
    });

    //Listen for 'notification event from the frontend'
    socket.on("notification", async(data) => {
      console.log(`[SOCKET] 📬 Received notification event from ${socket.id}:`, data);
      try {
        // broadcast the notification data to all connected clients (admin dashboards)
        await NotificationModel.create(data);      
        io?.emit("newNotification", data);
        console.log(`[SOCKET] ✅ Notification broadcasted to all clients`);
      } catch (error: any) {
        console.error(`[SOCKET] ❌ Error handling notification:`, error.message);
      }
    });

    // Log payment success event emission
    socket.on("paymentSuccess", (data) => {
      console.log(`[SOCKET] 💰 Payment success event received on socket ${socket.id}:`, data);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[SOCKET] ❌ User disconnected - Socket ID: ${socket.id} | Reason: ${reason} | Time: ${new Date().toISOString()}`);
      console.log(`[SOCKET] Remaining connected clients: ${io?.sockets.sockets.size || 0}`);
    });

    // Log errors
    socket.on("error", (error) => {
      console.error(`[SOCKET] ❌ Socket error on ${socket.id}:`, error);
    });

    // Log when socket connects successfully
    socket.on("connect", () => {
      console.log(`[SOCKET] 🔌 Socket ${socket.id} connected successfully`);
    });
  });

  // Log when server is ready
  io.on("connection", () => {
    console.log(`[SOCKET] 🚀 Socket.IO server is listening for connections`);
  });

  return io;
};

// Export io instance to be used in other files
export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initSocketServer first.");
  }
  return io;
};