import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Stethoscope, User, FileText, Award } from 'lucide-react';

const DoctorOnboarding = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.fullName || '',
    username: user?.username || '',
    registrationNo: '',
    specialization: '',
    experience: '',
    qualifications: '',
    hospitalAffiliation: '',
    contactNumber: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use the actual Clerk user ID
      const clerkUserId = user?.id;
      
      if (!clerkUserId) {
        throw new Error('User not authenticated');
      }

      // Check if doctor profile already exists for this user
      // @ts-ignore - Supabase types issue
      const checkResult = await supabase
        .from('doctors')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .limit(1);

      if (checkResult.data && checkResult.data.length > 0) {
        // Doctor profile already exists, redirect to dashboard
        toast({
          title: "Profile Already Exists",
          description: "You already have a doctor profile. Redirecting to dashboard...",
        });
        navigate('/dashboard');
        return;
      }

      // Ensure unique username by checking existing ones and appending suffix if needed
      let uniqueUsername = formData.username;
      let counter = 1;
      
      while (true) {
        const { data: existingUser } = await supabase
          .from('doctors')
          .select('username')
          .eq('username', uniqueUsername)
          .single();
        
        if (!existingUser) break; // Username is available
        
        // If username exists, append a number
        uniqueUsername = `${formData.username}${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 100) {
          uniqueUsername = `${formData.username}_${Date.now()}`;
          break;
        }
      }

      // Create doctor profile in Supabase using NULL for user_id and Clerk ID for clerk_user_id
      const { data, error } = await supabase
        .from('doctors')
        .insert({
          user_id: null, // Set to NULL since we're not using foreign key to auth.users
          clerk_user_id: clerkUserId, // Use Clerk user ID as primary identifier
          username: uniqueUsername, // Use the unique username
          name: formData.name,
          registration_no: formData.registrationNo,
          specialization: formData.specialization,
          experience: parseInt(formData.experience) || 0,
          qualifications: formData.qualifications,
          hospital_affiliation: formData.hospitalAffiliation,
          contact_number: formData.contactNumber,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update Clerk user metadata with role and database mapping
      console.log('🔄 Updating Clerk metadata...');
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          role: 'doctor',
          onboardingComplete: true,
          doctorProfileId: data.id, // Store the doctor profile ID
        },
      });
      console.log('✅ Clerk metadata updated successfully');
      console.log('📝 New metadata:', user?.unsafeMetadata);

      // Force reload Clerk user data to ensure metadata changes are reflected
      console.log('🔄 Reloading Clerk user data...');
      await user?.reload();
      console.log('✅ Clerk user reloaded, new metadata:', user?.unsafeMetadata);

      toast({
        title: "Registration Complete!",
        description: "Welcome to Doc+, Dr. " + formData.name,
      });

      // Navigate to AI Chat (doctor's main page)
      console.log('🚀 Navigating to AI Chat...');
      navigate('/ai-chat');
      
    } catch (error: any) {
      console.error('Error creating doctor profile:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Stethoscope className="h-12 w-12 text-primary mr-2" />
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Doc+
            </h1>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Doctor Registration</h2>
          <p className="text-muted-foreground mt-2">
            Complete your profile to start helping patients
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Professional Information
            </CardTitle>
            <CardDescription>
              Please provide your medical credentials and contact details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Dr. John Smith"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="dr.johnsmith"
                    required
                  />
                </div>
              </div>

              {/* Medical Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationNo">Medical Registration Number *</Label>
                  <div className="relative">
                    <Award className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="registrationNo"
                      value={formData.registrationNo}
                      onChange={(e) => handleInputChange('registrationNo', e.target.value)}
                      placeholder="REG123456"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization *</Label>
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => handleInputChange('specialization', e.target.value)}
                    placeholder="Cardiology, Neurology, etc."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={formData.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    placeholder="5"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">Contact Number</Label>
                  <Input
                    id="contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifications & Degrees</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="qualifications"
                    value={formData.qualifications}
                    onChange={(e) => handleInputChange('qualifications', e.target.value)}
                    placeholder="MBBS, MD, Fellowship in Cardiology..."
                    className="pl-10 min-h-[80px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hospitalAffiliation">Hospital/Clinic Affiliation</Label>
                <Input
                  id="hospitalAffiliation"
                  value={formData.hospitalAffiliation}
                  onChange={(e) => handleInputChange('hospitalAffiliation', e.target.value)}
                  placeholder="City General Hospital"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Profile...' : 'Complete Registration'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoctorOnboarding;
