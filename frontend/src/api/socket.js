import { io } from "socket.io-client";

// Por defecto usa el mismo origen del frontend.
// En desarrollo, Vite proxifica /socket.io hacia Flask.
const API_BASE = import.meta.env.VITE_API_URL || "";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE || undefined, {
      withCredentials: true,
      transports: ["polling", "websocket"],
    });
  }
  return socket;
}
