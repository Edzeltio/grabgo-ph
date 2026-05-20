import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/Landing";
import LoginPage from "@/pages/auth/Login";
import SignupPage from "@/pages/auth/Signup";
import VerifyEmailPage from "@/pages/auth/VerifyEmail";
import CustomerDashboard from "@/pages/customer/Dashboard";
import BookPickupPage from "@/pages/customer/Book";
import BookingDetailPage from "@/pages/customer/BookingDetail";
import CustomerProfilePage from "@/pages/customer/Profile";
import CollectorJobsPage from "@/pages/collector/Jobs";
import CollectorEarningsPage from "@/pages/collector/Earnings";
import CollectorProfilePage from "@/pages/collector/Profile";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminBookings from "@/pages/admin/Bookings";
import AdminPricing from "@/pages/admin/Pricing";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/signup" component={SignupPage} />
      <Route path="/auth/verify-email" component={VerifyEmailPage} />
      <Route path="/customer/dashboard" component={CustomerDashboard} />
      <Route path="/customer/book" component={BookPickupPage} />
      <Route path="/customer/booking/:id" component={BookingDetailPage} />
      <Route path="/customer/profile" component={CustomerProfilePage} />
      <Route path="/collector/jobs" component={CollectorJobsPage} />
      <Route path="/collector/earnings" component={CollectorEarningsPage} />
      <Route path="/collector/profile" component={CollectorProfilePage} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/bookings" component={AdminBookings} />
      <Route path="/admin/pricing" component={AdminPricing} />
      <Route>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
            <a href="/" className="mt-4 text-emerald-600 hover:underline block">Go home</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}

export default App;
