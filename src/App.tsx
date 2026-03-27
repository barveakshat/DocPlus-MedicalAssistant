import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import DashboardLayout from "./components/DashboardLayout";
import AIChat from "./pages/AIChat";
import DoctorChat from "./pages/DoctorChat";
import PatientDoctorChat from "./pages/PatientDoctorChat";
import PatientRegistration from "./pages/PatientRegistration";
import Patients from "./pages/Patients";
import ClinicalModules from "./pages/ClinicalModules";
import NotFound from "./pages/NotFound";
import PatientDetail from "./pages/PatientDetail";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import PatientOnboardingPage from "./pages/PatientOnboardingPage";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientMyRecords from "./pages/PatientMyRecords";
import Appointments from "./pages/Appointments";
import Prescriptions from "./pages/Prescriptions";
import DiseasePrograms from "./pages/DiseasePrograms";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DoctorOnboarding from "./components/DoctorOnboarding";

import { SignedIn, SignedOut, SignIn, SignUp, useClerk } from '@clerk/clerk-react';
import React from 'react';

const queryClient = new QueryClient();

// Shared loading spinner
const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Shared Clerk sign-in page wrapper
const ClerkSignInWrapper: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Welcome to Doc+',
  subtitle = 'Please sign in to continue'
}) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-2">{subtitle}</p>
      </div>
      <SignIn
        routing="virtual"
        signUpUrl="/sign-up"
        appearance={{
          elements: {
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
            card: 'shadow-none',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden'
          }
        }}
      />
    </div>
  </div>
);

// Authenticated routes — rendered only when user has a complete profile
const AuthenticatedRoutes: React.FC = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/onboarding/select-role" replace />;

  return (
    <Routes>
      {/* Redirect roots to AI Chat */}
      <Route path="/" element={<Navigate to="/ai-chat" replace />} />
      <Route
        path="/dashboard"
        element={<Navigate to={user.role === 'doctor' ? '/dashboard/doctor' : '/dashboard/patient'} replace />}
      />
      <Route path="/auth-redirect" element={<Navigate to="/ai-chat" replace />} />

      {/* Doctor Dashboard */}
      <Route 
        path="/dashboard/doctor" 
        element={
          <DashboardLayout>
            <DoctorDashboard />
          </DashboardLayout>
        } 
      />

      <Route
        path="/dashboard/patient"
        element={
          <DashboardLayout>
            <PatientMyRecords />
          </DashboardLayout>
        }
      />

      {/* AI Chat — available to all roles */}
      <Route
        path="/ai-chat"
        element={
          <DashboardLayout>
            <AIChat />
          </DashboardLayout>
        }
      />

      {/* Doctor-Patient Chat — renders role-specific component */}
      <Route
        path="/doctor-chat"
        element={
          <DashboardLayout>
            {user.role === 'doctor' ? <DoctorChat /> : <PatientDoctorChat />}
          </DashboardLayout>
        }
      />

      {/* Doctor-only routes */}
      {user.role === 'doctor' && (
        <>
          <Route
            path="/patients"
            element={<DashboardLayout><Patients /></DashboardLayout>}
          />
          <Route
            path="/register-patient"
            element={<DashboardLayout><PatientRegistration /></DashboardLayout>}
          />
          <Route
            path="/patient/:id"
            element={<DashboardLayout><PatientDetail /></DashboardLayout>}
          />
          <Route
            path="/clinical-modules"
            element={<DashboardLayout><ClinicalModules /></DashboardLayout>}
          />
          <Route
            path="/appointments"
            element={<DashboardLayout><Appointments /></DashboardLayout>}
          />
          <Route
            path="/prescriptions"
            element={<DashboardLayout><Prescriptions /></DashboardLayout>}
          />
          <Route
            path="/disease-programs"
            element={<DashboardLayout><DiseasePrograms /></DashboardLayout>}
          />
        </>
      )}

      {/* Patient-only routes */}
      {user.role === 'patient' && (
        <>
          <Route
            path="/my-records"
            element={<DashboardLayout><PatientMyRecords /></DashboardLayout>}
          />
          <Route
            path="/appointments"
            element={<DashboardLayout><Appointments /></DashboardLayout>}
          />
          <Route
            path="/prescriptions"
            element={<DashboardLayout><Prescriptions /></DashboardLayout>}
          />
          <Route
            path="/disease-programs"
            element={<DashboardLayout><DiseasePrograms /></DashboardLayout>}
          />
        </>
      )}

      {/* Shared routes — available to all authenticated users */}
      <Route
        path="/settings"
        element={<DashboardLayout><Settings /></DashboardLayout>}
      />
      <Route
        path="/help"
        element={<DashboardLayout><HelpSupport /></DashboardLayout>}
      />

      {/* Onboarding routes (accessible for re-visits) */}
      <Route path="/onboarding/select-role" element={<RoleSelectionPage />} />
      <Route path="/onboarding/doctor" element={<DoctorOnboarding />} />
      <Route path="/onboarding/patient" element={<PatientOnboardingPage />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Main app content — state machine for auth flow
const AppContent: React.FC = () => {
  const { loaded, user: clerkUser } = useClerk();
  const { user, isLoading, isCheckingProfile } = useAuth();

  // State 1: Loading
  if (!loaded || isLoading || isCheckingProfile) {
    return <LoadingScreen message={isCheckingProfile ? 'Checking your profile...' : 'Loading...'} />;
  }

  return (
    <>
      <SignedIn>
        {(() => {
          const userRole = clerkUser?.unsafeMetadata?.role as string | undefined;
          const onboardingComplete = clerkUser?.unsafeMetadata?.onboardingComplete as boolean;

          // State 2: Signed in, no role selected → role selection
          if (!userRole) {
            return (
              <Routes>
                <Route path="/onboarding/select-role" element={<RoleSelectionPage />} />
                <Route path="/onboarding/doctor" element={<DoctorOnboarding />} />
                <Route path="/onboarding/patient" element={<PatientOnboardingPage />} />
                <Route path="*" element={<Navigate to="/onboarding/select-role" replace />} />
              </Routes>
            );
          }

          // State 3: Signed in, role selected, onboarding incomplete → onboarding
          if (userRole && !onboardingComplete) {
            const onboardingRoute = userRole === 'doctor' ? '/onboarding/doctor' : '/onboarding/patient';
            return (
              <Routes>
                <Route path="/onboarding/doctor" element={<DoctorOnboarding />} />
                <Route path="/onboarding/patient" element={<PatientOnboardingPage />} />
                <Route path="*" element={<Navigate to={onboardingRoute} replace />} />
              </Routes>
            );
          }

          // State 4: Signed in, onboarding complete → full app
          return <AuthenticatedRoutes />;
        })()}
      </SignedIn>

      <SignedOut>
        <Routes>
          <Route path="/sign-up" element={
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Welcome to Doc+</h1>
                  <p className="text-gray-600 mt-2">Create your account to get started</p>
                </div>
                <SignUp
                  routing="virtual"
                  signInUrl="/"
                  appearance={{
                    elements: {
                      formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
                      card: 'shadow-none',
                      headerTitle: 'hidden',
                      headerSubtitle: 'hidden'
                    }
                  }}
                />
              </div>
            </div>
          } />
          <Route path="/patient-onboarding" element={
            <ClerkSignInWrapper
              title="Welcome to Doc+"
              subtitle="Please sign in to access your invitation"
            />
          } />
          <Route path="/auth-redirect" element={<Navigate to="/" replace />} />
          <Route path="*" element={<ClerkSignInWrapper />} />
        </Routes>
      </SignedOut>
    </>
  );
};

import { PatientProvider } from "./contexts/PatientContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { initAppSettings } from "./pages/Settings";

// Apply saved theme/font-size before first render
initAppSettings();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <AuthProvider>
      <PatientProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </PatientProvider>
    </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
