import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, User } from 'lucide-react';

const RoleSelectionPage: React.FC = () => {
  const { user: clerkUser, isLoaded } = useUser();
  const navigate = useNavigate();

  console.log('🎭 RoleSelectionPage - Component rendered');
  console.log('🎭 RoleSelectionPage - isLoaded:', isLoaded);
  console.log('🎭 RoleSelectionPage - clerkUser:', clerkUser);

  if (!isLoaded) {
    console.log('⏳ RoleSelectionPage - Clerk not loaded, showing loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!clerkUser) {
    console.log('❌ RoleSelectionPage - No Clerk user, redirecting to sign-in');
    navigate('/');
    return null;
  }

  console.log('✅ RoleSelectionPage - Clerk user loaded:', clerkUser.id);

  // Debug: Check if user has already completed onboarding
  const userRole = clerkUser.unsafeMetadata?.role;
  const onboardingComplete = clerkUser.unsafeMetadata?.onboardingComplete;

  console.log('🎭 RoleSelectionPage - Current metadata:', {
    role: userRole,
    onboardingComplete: onboardingComplete,
    fullMetadata: clerkUser.unsafeMetadata
  });

  // If user has already completed onboarding, redirect to appropriate page
  if (userRole && onboardingComplete) {
    console.log('✅ User already completed onboarding, redirecting...');
    const targetPath = userRole === 'doctor' ? '/ai-chat' : '/dashboard';
    console.log('🚀 Redirecting to:', targetPath);

    // Use setTimeout to ensure navigation happens after render
    setTimeout(() => {
      navigate(targetPath, { replace: true });
    }, 100);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  const handleRoleSelection = async (selectedRole: 'doctor' | 'patient') => {
    if (!clerkUser) return;

    try {
      // Update Clerk user metadata with selected role
      await clerkUser.update({
        unsafeMetadata: {
          ...clerkUser.unsafeMetadata,
          role: selectedRole,
        },
      });

      // Navigate to role-specific onboarding
      const targetPath = selectedRole === 'doctor' ? '/onboarding/doctor' : '/onboarding/patient';
      navigate(targetPath);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to save role selection. Please try again.');
    }
  };

  console.log('🎭 RoleSelectionPage - About to render main UI');

  // Emergency fallback UI
  try {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-2xl font-bold">D</span>
              </div>
              <h1 className="text-5xl font-bold text-blue-600">
                Doc+
              </h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to Doc+ Medical Assistant
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose your role to get started with personalized healthcare assistance
            </p>
          </div>

          {/* Debug Info */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-8 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-2">Debug Information:</h3>
            <div className="text-sm space-y-1">
              <p><strong>User ID:</strong> {clerkUser?.id}</p>
              <p><strong>Email:</strong> {clerkUser?.primaryEmailAddress?.emailAddress}</p>
              <p><strong>Role:</strong> {userRole ? String(userRole) : 'Not set'}</p>
              <p><strong>Onboarding Complete:</strong> {onboardingComplete ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Doctor Card */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 p-6">
              <div className="text-center">
                <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
                  <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">👨‍⚕️</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  I'm a Doctor
                </h3>
                <p className="text-gray-600 mb-6">
                  Access patient management, AI-powered diagnostics, and comprehensive healthcare tools
                </p>
                <button
                  onClick={() => handleRoleSelection('doctor')}
                  className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-300"
                >
                  Continue as Doctor
                </button>
              </div>
            </div>

            {/* Patient Card */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 hover:border-green-300 transition-all duration-300 p-6">
              <div className="text-center">
                <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-fit">
                  <div className="h-12 w-12 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">👤</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  I'm a Patient
                </h3>
                <p className="text-gray-600 mb-6">
                  Connect with healthcare providers, track your health, and get AI-powered support
                </p>
                <button
                  onClick={() => handleRoleSelection('patient')}
                  className="w-full py-3 px-6 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-300"
                >
                  Continue as Patient
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12">
            <p className="text-gray-500 text-sm">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ Error rendering RoleSelectionPage:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Page</h1>
          <p className="text-gray-600 mb-4">There was an error loading the role selection page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
};

export default RoleSelectionPage;
