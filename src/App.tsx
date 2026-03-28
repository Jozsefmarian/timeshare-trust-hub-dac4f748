import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import SellerDashboard from "./pages/SellerDashboard";
import SellerCases from "./pages/SellerCases";
import CaseDetail from "./pages/CaseDetail";
import NewCase from "./pages/NewCase";
import SellerCaseContracts from "./pages/SellerCaseContracts";
import SellerCasePayment from "./pages/SellerCasePayment";
import SellerSupport from "./pages/SellerSupport";
import SellerProfile from "./pages/SellerProfile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCases from "./pages/AdminCases";
import AdminCaseDetail from "./pages/AdminCaseDetail";

import AdminResorts from "./pages/AdminResorts";
import AdminInventory from "./pages/AdminInventory";
import AdminInventoryDetail from "./pages/AdminInventoryDetail";
import AdminPolicies from "./pages/AdminPolicies";
import AdminPolicyDetail from "./pages/AdminPolicyDetail";
import AdminPayments from "./pages/AdminPayments";
import AdminContractTemplates from "./pages/AdminContractTemplates";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

          {/* Seller */}
          <Route
            path="/seller"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/cases"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerCases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/cases/:caseId"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <CaseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/new-case"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <NewCase />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/cases/:caseId/contracts"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerCaseContracts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/cases/:caseId/payment"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerCasePayment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/seller/support"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerSupport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller/profile"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerProfile />
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
            path="/admin/cases/:caseId"
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
            path="/admin/policies/:policyId"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPolicyDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/inventory/:assetId"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminInventoryDetail />
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
            path="/admin/inventory"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/contract-templates"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminContractTemplates />
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
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
