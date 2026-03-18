import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const OnboardingPage: React.FC = () => {
  const { user: clerkUser } = useUser();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient'>('patient');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Doctor form fields
  const [doctorData, setDoctorData] = useState({
    username: '',
    name: '',
    registrationNo: '',
  });

  // Patient form fields
  const [patientData, setPatientData] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    medicalHistory: '',
  });

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clerkUser) return;

    setIsSubmitting(true);
    try {
      // Create doctor profile (without clerk_user_id for now)
      const { data: doctorProfile, error } = await supabase
        .from('doctors')
        .insert({
          username: doctorData.username,
          name: doctorData.name,
          registration_no: doctorData.registrationNo,
          user_id: clerkUser.id, // Use Clerk ID as user_id for now
        })
        .select()
        .single();

      if (error) throw error;

      // Update user state
      setUser({
        id: clerkUser.id,
        user_id: doctorProfile.id,
        auth_user_id: clerkUser.id,
        username: doctorProfile.username,
        name: doctorProfile.name,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        role: 'doctor',
        registration_no: doctorProfile.registration_no,
      });

      navigate('/ai-chat');
    } catch (error) {
      console.error('Error creating doctor profile:', error);
      alert('Failed to create doctor profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clerkUser) return;

    setIsSubmitting(true);
    try {
      // Create patient profile (without clerk_user_id for now)
      const { data: patientProfile, error } = await supabase
        .from('patients')
        .insert({
          name: patientData.name,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          age: patientData.age ? parseInt(patientData.age) : null,
          gender: patientData.gender || null,
          phone: patientData.phone || null,
          medical_history: patientData.medicalHistory || null,
          user_id: clerkUser.id, // Use Clerk ID as user_id for now
        })
        .select()
        .single();

      if (error) throw error;

      // Update user state
      setUser({
        id: clerkUser.id,
        user_id: patientProfile.id,
        auth_user_id: clerkUser.id,
        name: patientProfile.name,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        role: 'patient',
        age: patientProfile.age,
        gender: patientProfile.gender,
        phone: patientProfile.phone,
        medical_history: patientProfile.medical_history,
        assigned_doctor_id: patientProfile.assigned_doctor_id,
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating patient profile:', error);
      alert('Failed to create patient profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Doc+ Assist!</CardTitle>
          <CardDescription>
            Please complete your profile to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role">I am a:</Label>
              <Select value={selectedRole} onValueChange={(value: 'doctor' | 'patient') => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole === 'doctor' ? (
              <form onSubmit={handleDoctorSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={doctorData.username}
                    onChange={(e) => setDoctorData({ ...doctorData, username: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={doctorData.name}
                    onChange={(e) => setDoctorData({ ...doctorData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="registrationNo">Registration Number</Label>
                  <Input
                    id="registrationNo"
                    value={doctorData.registrationNo}
                    onChange={(e) => setDoctorData({ ...doctorData, registrationNo: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating Profile...' : 'Create Doctor Profile'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePatientSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="patientName">Full Name</Label>
                  <Input
                    id="patientName"
                    value={patientData.name}
                    onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={patientData.age}
                    onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={patientData.gender} onValueChange={(value) => setPatientData({ ...patientData, gender: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={patientData.phone}
                    onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="medicalHistory">Medical History (Optional)</Label>
                  <Input
                    id="medicalHistory"
                    value={patientData.medicalHistory}
                    onChange={(e) => setPatientData({ ...patientData, medicalHistory: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating Profile...' : 'Create Patient Profile'}
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPage;
