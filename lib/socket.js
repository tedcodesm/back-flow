import { Server } from "socket.io";

let io;
const userSocketMap = {};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      userSocketMap[userId] = socket.id;
    }

    socket.on("disconnect", () => {
      delete userSocketMap[userId];
    });
  });
};

export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId];
};

export { io };