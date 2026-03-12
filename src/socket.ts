import { Server as HttpServer } from "http";

import { Server } from "socket.io";
import { env } from "./config";
import { AppError } from "./shared/errors/AppError";

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected", socket.id);
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new AppError(422, "Scoket.io not initialized");
  }

  return io;
};
