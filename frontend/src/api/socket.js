import { io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

let socket = null;

/**
 * Un solo socket compartido por toda la app. withCredentials:true es lo que
 * hace que viaje la cookie de sesión de Flask-Login, igual que en fetch().
 */
export function getSocket() {
  if (!socket) {
    socket = io(API_BASE, {
      withCredentials: true,
      transports: ["polling", "websocket"],
    });
  }
  return socket;
}
