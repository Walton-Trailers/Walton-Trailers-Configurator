import { useEffect } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export function ClearDealerSession() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Clear everything
    localStorage.removeItem("dealer_session");
    localStorage.removeItem("dealer_user");
    queryClient.clear();
    queryClient.cancelQueries();
    queryClient.resetQueries();
    queryClient.invalidateQueries();
    
    // Redirect to login
    setLocation("/dealer/login");
  }, [setLocation]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Clearing session...</p>
    </div>
  );
}