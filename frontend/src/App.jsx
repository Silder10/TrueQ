import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RequireAuth } from "./routes/RequireAuth";
import { AppLayout } from "./layouts/AppLayout";

import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ExchangesPage } from "./pages/ExchangesPage";
import { ExchangeDetailPage } from "./pages/ExchangeDetailPage";
import { CreateExchangePage } from "./pages/CreateExchangePage";
import { RequestsPage } from "./pages/RequestsPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { ConversationsPage } from "./pages/ConversationsPage";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminPage } from "./pages/AdminPage";
import { NotificationsPage } from "./pages/NotificationsPage";

function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/exchanges" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthed>
            <RegisterPage />
          </RedirectIfAuthed>
        }
      />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/exchanges" element={<ExchangesPage />} />
          <Route path="/exchanges/:id" element={<ExchangeDetailPage />} />
          <Route path="/create-exchange" element={<CreateExchangePage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/chat/:userId" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />

          <Route element={<RequireAuth adminOnly />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/exchanges" replace />} />
      <Route path="*" element={<Navigate to="/exchanges" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
