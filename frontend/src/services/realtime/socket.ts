import { io, Socket } from "socket.io-client";
import { getToken } from "../../lib/authStorage.js";
import { SERVER_URL } from "../config.js";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const token = getToken();

  socket = io(SERVER_URL, {
    transports: ["websocket"],
    auth: {
      token:token,
    },
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
