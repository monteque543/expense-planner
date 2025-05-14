import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import ExpensePlanner from "@/pages/ExpensePlanner";
import AuthPage from "@/pages/AuthPage";
import { AuthProvider } from "@/hooks/useAuthNew";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={ExpensePlanner} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Add dark class to document for dark mode
  document.documentElement.classList.add('dark');
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="dark min-h-screen">
          <Router />
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
