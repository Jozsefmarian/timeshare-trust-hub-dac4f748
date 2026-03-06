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
import NotFound from "./pages/NotFound";

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
          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/seller/new-case" element={<NewCase />} />
          <Route path="/seller/case/:caseId" element={<CaseDetail />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/cases" element={<AdminCases />} />
          <Route path="/admin/case/:caseId" element={<AdminCaseDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
