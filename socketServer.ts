import { Server } from "socket.io";
import http from "http";
import NotificationModel from "./models/notification.model";

export const initSocketServer = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3001", // Use your actual frontend origin
      methods: ["GET", "POST"],
    },
  });
  console.log("io", io);

  io.on("connection", (socket) => {
    console.log("a user connected, useID: ",socket.id);

    //Listen for 'notification event from the frontend'
    socket.on("notification", async(data) => {
      // broadcast the notification data to all connected clients (admin dashboards)
      console.log("data",data);
      await NotificationModel.create(data);      io.emit("newNotification", data);
    });
    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });
};