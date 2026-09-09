import { Routes, Route, Navigate } from "react-router-dom";
import { useWallet } from "./context/WalletContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Toast from "./components/Toast";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import CreatePot from "./pages/CreatePot";
import PotDetail from "./pages/PotDetail";

function ProtectedRoute({ children }) {
  const { isConnected } = useWallet();

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreatePot />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pot/:address"
            element={
              <ProtectedRoute>
                <PotDetail />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
      <Toast />
    </div>
  );
}