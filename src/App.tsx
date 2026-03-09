import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import SellerDashboard from "./pages/SellerDashboard";
import NewCase from "./pages/NewCase";
import CaseDetail from "./pages/CaseDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCases from "./pages/AdminCases";
import AdminCaseDetail from "./pages/AdminCaseDetail";
import AdminPolicies from "./pages/AdminPolicies";
import AdminPolicyDetail from "./pages/AdminPolicyDetail";
import AdminInventory from "./pages/AdminInventory";
import AdminInventoryDetail from "./pages/AdminInventoryDetail";
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
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          <Route
            path="/seller"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerDashboard />
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
            path="/seller/case/:caseId"
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <CaseDetail />
              </ProtectedRoute>
            }
          />

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
            path="/admin/case/:caseId"
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
            path="/admin/policy/:policyId"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPolicyDetail />
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
            path="/admin/inventory/:assetId"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminInventoryDetail />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
