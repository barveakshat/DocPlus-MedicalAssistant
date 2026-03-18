import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Calendar, ArrowLeft, MapPin, AlertTriangle, Pill, Copy, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PatientCredentialsModalProps {
  patientName: string;
  patientEmail: string;
  tempPassword: string;
  onClose: () => void;
}

const PatientCredentialsModal: React.FC<PatientCredentialsModalProps> = ({
  patientName,
  patientEmail,
  tempPassword,
  onClose
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Credentials
          </CardTitle>
          <CardDescription>
            {patientName} has been registered successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Patient Name</Label>
            <div className="flex items-center gap-2">
              <Input value={patientName} readOnly className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(patientName, 'Patient name')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="flex items-center gap-2">
              <Input value={patientEmail} readOnly className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(patientEmail, 'Email address')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Temporary Password</Label>
            <div className="flex items-center gap-2">
              <Input
                value={tempPassword}
                type={showPassword ? 'text' : 'password'}
                readOnly
                className="flex-1 font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(tempPassword, 'Password')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <p>Please save these credentials and provide them to the patient securely. They should change their password after first login.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={onClose} className="flex-1">
              Done
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const credentials = `Patient: ${patientName}\nEmail: ${patientEmail}\nPassword: ${tempPassword}`;
                copyToClipboard(credentials, 'All credentials');
              }}
            >
              Copy All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientCredentialsModal;
