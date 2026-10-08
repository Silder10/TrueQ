import { io } from "socket.io-client";

// En desarrollo usa el mismo origen del frontend y Vite proxifica /socket.io.
// En producción puede usarse VITE_API_URL para un backend separado.
const API_BASE = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "");

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
