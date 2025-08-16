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
import AccountManagement from "@/pages/account-management";
import DealerLogin from "@/pages/dealer-login";
import DealerDashboard from "@/pages/dealer-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Configurator} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/pricing" component={FastPricing} />
      <Route path="/admin/account" component={AccountManagement} />
      <Route path="/dealer/login" component={DealerLogin} />
      <Route path="/dealer/dashboard" component={DealerDashboard} />
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
