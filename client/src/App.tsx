import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Configurator from "@/pages/configurator";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard-fixed";
import FastPricing from "@/pages/fast-pricing";
import PricingManagement from "@/pages/pricing-management";
import AccountManagement from "@/pages/account-management";
import DealerLogin from "@/pages/dealer-login";
import DealerDashboard from "@/pages/dealer-dashboard";
import AdminDealers from "@/pages/admin-dealers";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import EmailSettings from "@/pages/email-settings";
import { ClearDealerSession } from "@/components/clear-dealer-session";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Configurator} />
      <Route path="/configurator/:category" component={Configurator} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/forgot-password" component={ForgotPassword} />
      <Route path="/admin/reset-password" component={ResetPassword} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/pricing" component={FastPricing} />
      <Route path="/admin/pricing-management" component={PricingManagement} />
      <Route path="/admin/account" component={AccountManagement} />
      <Route path="/admin/dealers" component={AdminDealers} />
      <Route path="/admin/email-settings" component={EmailSettings} />
      <Route path="/dealer/login" component={DealerLogin} />
      <Route path="/dealer/dashboard" component={DealerDashboard} />
      <Route path="/dealer/clear" component={ClearDealerSession} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
