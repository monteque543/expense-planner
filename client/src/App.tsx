import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import ExpensePlanner from "@/pages/ExpensePlanner";
import AuthPage from "@/pages/AuthPage";
import { AuthProvider } from "@/hooks/useAuthNew";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ExpenseBlocker from "@/components/ExpenseBlocker";

function Router() {
  return (
    <Switch>
      {/* Changed from ProtectedRoute to Route to bypass auth requirement */}
      <Route path="/" component={ExpensePlanner} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
        <ExpenseBlocker />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
