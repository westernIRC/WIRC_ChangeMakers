import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import HomePage from "./pages/HomePage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import HousePage from "./pages/HousePage.jsx";
import LeaderboardPage from "./pages/LeaderboardPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        {/* House rosters and member profiles name individual students, so they sit behind
            login even though the House leaderboard above is public. */}
        <Route
          path="/houses/:houseId"
          element={
            <ProtectedRoute>
              <HousePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["vp_admin", "overall_admin"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="border-t border-ink-200/70 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-ink-500">
          <p>Western Islamic Relief Canada · Changemakers</p>
          <p>Dollar amounts are always private. Only streaks are public.</p>
        </div>
      </footer>
    </div>
  );
}
