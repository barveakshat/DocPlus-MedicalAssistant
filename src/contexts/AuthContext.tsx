import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser, useClerk } from '@clerk/clerk-react';

interface AuthUser {
  id: string;
  user_id: string;
  auth_user_id?: string;
  username?: string;
  name: string;
  email?: string;
  role: 'doctor' | 'patient';
  registration_no?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  medical_history?: string | null;
  assigned_doctor_id?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    userData: { username: string; name: string; registrationNo?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isCheckingProfile: boolean;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  useEffect(() => {
    const checkAuthState = async () => {
      if (!isClerkLoaded) {
        setIsLoading(true);
        return;
      }

      if (!clerkUser) {
        setUser(null);
        setIsLoading(false);
        setIsCheckingProfile(false);
        return;
      }

      // Force reload Clerk user to ensure latest metadata
      await clerkUser.reload();

      const userRole = clerkUser.unsafeMetadata?.role as 'doctor' | 'patient' | undefined;
      const onboardingComplete = clerkUser.unsafeMetadata?.onboardingComplete as boolean;

      if (!userRole) {
        // User hasn't selected role yet
        setUser(null);
        setIsLoading(false);
        setIsCheckingProfile(false);
        return;
      }

      if (userRole && !onboardingComplete) {
        // User has selected role but hasn't completed onboarding
        setUser({
          id: clerkUser.id,
          user_id: clerkUser.id,
          auth_user_id: clerkUser.id,
          name: clerkUser.fullName || clerkUser.firstName || 'User',
          email: clerkUser.primaryEmailAddress?.emailAddress,
          role: userRole,
        });
        setIsLoading(false);
        setIsCheckingProfile(false);
        return;
      }

      // User has completed onboarding — fetch profile from database
      setIsCheckingProfile(true);
      await fetchUserProfile(clerkUser.id, userRole, onboardingComplete);
    };

    checkAuthState();
  }, [clerkUser, isClerkLoaded]);

  const fetchUserProfile = async (
    clerkUserId: string,
    userRole: 'doctor' | 'patient',
    onboardingComplete: boolean
  ) => {
    try {
      if (userRole === 'doctor') {
        const { data: doctors } = await supabase
          .from('doctors')
          .select('id, user_id, username, name, registration_no')
          .eq('clerk_user_id', clerkUserId)
          .limit(1);

        if (doctors && doctors.length > 0) {
          const doctor = doctors[0];
          setUser({
            id: clerkUserId,
            user_id: doctor.id,
            auth_user_id: doctor.user_id || clerkUserId,
            username: doctor.username,
            name: doctor.name,
            email: clerkUser?.primaryEmailAddress?.emailAddress,
            role: 'doctor',
            registration_no: doctor.registration_no,
          });
          setIsLoading(false);
          setIsCheckingProfile(false);
          return;
        }

        // Fallback: try by user_id
        const { data: doctorsByUserId } = await supabase
          .from('doctors')
          .select('id, user_id, username, name, registration_no')
          .eq('user_id', clerkUserId)
          .limit(1);

        if (doctorsByUserId && doctorsByUserId.length > 0) {
          const doctor = doctorsByUserId[0];
          setUser({
            id: clerkUserId,
            user_id: doctor.id,
            auth_user_id: doctor.user_id || clerkUserId,
            username: doctor.username,
            name: doctor.name,
            email: clerkUser?.primaryEmailAddress?.emailAddress,
            role: 'doctor',
            registration_no: doctor.registration_no,
          });
          setIsLoading(false);
          setIsCheckingProfile(false);
          return;
        }
      } else if (userRole === 'patient') {
        const { data: patients } = await supabase
          .from('patients')
          .select('id, user_id, name, email, age, gender, phone, medical_history, assigned_doctor_id')
          .eq('clerk_user_id', clerkUserId)
          .limit(1);

        if (patients && patients.length > 0) {
          const patient = patients[0];
          setUser({
            id: clerkUserId,
            user_id: patient.id,
            auth_user_id: patient.user_id || clerkUserId,
            name: patient.name,
            email: clerkUser?.primaryEmailAddress?.emailAddress || patient.email,
            role: 'patient',
            age: patient.age,
            gender: patient.gender,
            phone: patient.phone,
            medical_history: patient.medical_history,
            assigned_doctor_id: patient.assigned_doctor_id,
          });
          setIsLoading(false);
          setIsCheckingProfile(false);
          return;
        }

        // Fallback: try by user_id
        const { data: patientsByUserId } = await supabase
          .from('patients')
          .select('id, user_id, name, email, age, gender, phone, medical_history, assigned_doctor_id')
          .eq('user_id', clerkUserId)
          .limit(1);

        if (patientsByUserId && patientsByUserId.length > 0) {
          const patient = patientsByUserId[0];
          setUser({
            id: clerkUserId,
            user_id: patient.id,
            auth_user_id: patient.user_id || clerkUserId,
            name: patient.name,
            email: clerkUser?.primaryEmailAddress?.emailAddress || patient.email,
            role: 'patient',
            age: patient.age,
            gender: patient.gender,
            phone: patient.phone,
            medical_history: patient.medical_history,
            assigned_doctor_id: patient.assigned_doctor_id,
          });
          setIsLoading(false);
          setIsCheckingProfile(false);
          return;
        }
      }

      // No profile found — create fallback from Clerk metadata to prevent redirect loop
      if (userRole && onboardingComplete) {
        setUser({
          id: clerkUserId,
          user_id: clerkUserId,
          auth_user_id: clerkUserId,
          name: clerkUser?.fullName || clerkUser?.firstName || 'User',
          email: clerkUser?.primaryEmailAddress?.emailAddress || '',
          role: userRole,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);

      // On error, set fallback user to prevent redirect loop
      if (userRole && onboardingComplete) {
        setUser({
          id: clerkUserId,
          user_id: clerkUserId,
          auth_user_id: clerkUserId,
          name: clerkUser?.fullName || clerkUser?.firstName || 'User',
          email: clerkUser?.primaryEmailAddress?.emailAddress || '',
          role: userRole,
        });
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
      setIsCheckingProfile(false);
    }
  };

  // Kept for compatibility with SignInPage/SignUpPage (Clerk handles auth)
  const login = async (_email: string, _password: string) => {
    return { success: true, error: 'Please use Clerk authentication' };
  };

  const signUp = async (
    _email: string,
    _password: string,
    _userData: { username: string; name: string; registrationNo?: string }
  ) => {
    return { success: true, error: 'Please use Clerk authentication' };
  };

  const logout = async () => {
    await Promise.all([
      supabase.auth.signOut(),
      clerkSignOut()
    ]);
  };

  return (
    <AuthContext.Provider value={{ user, login, signUp, logout, isLoading, isCheckingProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};