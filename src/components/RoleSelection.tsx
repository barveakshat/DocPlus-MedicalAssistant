import React from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Stethoscope, User, ArrowRight } from 'lucide-react';

const RoleSelection = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const handleRoleSelection = async (role: 'doctor' | 'patient') => {
    try {
      // Update Clerk metadata with intended role
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          intendedRole: role,
        },
      });

      // Navigate to appropriate onboarding/registration
      if (role === 'doctor') {
        navigate('/onboarding');
      } else {
        navigate('/patient-registration');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Welcome to Doc+
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose your role to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Doctor Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Stethoscope className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Doctor</CardTitle>
              <CardDescription>
                Register as a healthcare professional to manage patients and provide medical care
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => handleRoleSelection('doctor')}
                className="w-full"
                size="lg"
              >
                Continue as Doctor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Patient Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <User className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Patient</CardTitle>
              <CardDescription>
                Register as a patient to connect with doctors and manage your health records
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => handleRoleSelection('patient')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Continue as Patient
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            Not {user?.firstName}? Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
