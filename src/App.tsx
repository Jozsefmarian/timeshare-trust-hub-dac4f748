import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import SellerDashboard from "./pages/SellerDashboard";
import SellerCases from "./pages/SellerCases";
import CaseDetail from "./pages/CaseDetail";
import NewCase from "./pages/NewCase";
import SellerCaseContracts from "./pages/SellerCaseContracts";
import SellerCasePayment from "./pages/SellerCasePayment";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCases from "./pages/AdminCases";
import AdminCaseDetail from "./pages/AdminCaseDetail";
import AdminPolicies from "./pages/AdminPolicies";
import AdminResorts from "./pages/AdminResorts";
import AdminInventory from "./pages/AdminInventory";
import AdminPayments from "./pages/AdminPayments";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Seller */}
          <Route
            path="/app/dashboard"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/cases"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerCases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/cases/:id"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <CaseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/cases/:id/upload"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <NewCase />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/cases/:id/contracts"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerCaseContracts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/cases/:id/payment"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerCasePayment />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cases"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminCases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cases/:id"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminCaseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/policies"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPolicies />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/resorts"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminResorts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/assets"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPayments />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
