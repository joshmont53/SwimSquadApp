import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';

const registerClubSchema = z.object({
  clubName: z.string().min(2, 'Club name must be at least 2 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  dob: z.string().min(1, 'Date of birth is required'),
  level: z.string().min(1, 'Qualification level is required'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  passwordConfirm: z.string(),
}).refine(data => data.password === data.passwordConfirm, {
  message: 'Passwords do not match',
  path: ['passwordConfirm'],
});

type RegisterClubInput = z.infer<typeof registerClubSchema>;

const QUALIFICATION_LEVELS = [
  'No Qualification',
  'Level 1',
  'Level 2',
  'Level 3',
];

export default function RegisterClubPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const form = useForm<RegisterClubInput>({
    resolver: zodResolver(registerClubSchema),
    defaultValues: {
      clubName: '',
      firstName: '',
      lastName: '',
      email: '',
      dob: '',
      level: 'No Qualification',
      password: '',
      passwordConfirm: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterClubInput) => {
      const response = await apiRequest('POST', '/api/auth/register-club', data);
      return response.json();
    },
    onSuccess: (data) => {
      setRegistrationSuccess(true);
      toast({
        title: 'Club registered!',
        description: data.message || 'Your club has been registered successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Registration failed',
        description: error.message || 'Failed to register club. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RegisterClubInput) => {
    registerMutation.mutate(data);
  };

  if (registrationSuccess) {
    return (
      <div className="h-full min-h-screen w-full flex items-center justify-center bg-white py-8">
        <div className="max-w-md w-full px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="bg-card rounded-2xl shadow-2xl p-8 text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-[#059467]" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Club Registered!</h2>
              <p className="text-muted-foreground mb-6">
                Your club has been created. Please check your email to verify your account, then sign in.
              </p>
              <Button
                data-testid="button-go-to-login"
                className="w-full h-11 bg-[#059467] text-white"
                onClick={() => setLocation('/login')}
              >
                Go to Sign In
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-screen w-full flex items-center justify-center overflow-y-auto bg-white py-8">
      <div className="max-w-lg w-full px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="bg-card rounded-2xl shadow-2xl p-6 md:p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-1">Register Your Club</h1>
              <p className="text-muted-foreground text-sm">
                Create your swimming club and primary coach account
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clubName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Club Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-club-name"
                          placeholder="e.g. Riverside Swimming Club"
                          className="h-11 bg-muted/50"
                          disabled={registerMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">First Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            data-testid="input-first-name"
                            placeholder="First name"
                            className="h-11 bg-muted/50"
                            disabled={registerMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            data-testid="input-last-name"
                            placeholder="Last name"
                            className="h-11 bg-muted/50"
                            disabled={registerMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-email"
                          type="email"
                          placeholder="your.email@example.com"
                          className="h-11 bg-muted/50"
                          disabled={registerMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Date of Birth</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            data-testid="input-dob"
                            type="date"
                            className="h-11 bg-muted/50"
                            disabled={registerMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Qualification</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={registerMutation.isPending}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-level" className="h-11 bg-muted/50">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {QUALIFICATION_LEVELS.map(level => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-password"
                          type="password"
                          placeholder="Min 12 chars, uppercase, number, special"
                          className="h-11 bg-muted/50"
                          disabled={registerMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passwordConfirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-password-confirm"
                          type="password"
                          placeholder="Repeat your password"
                          className="h-11 bg-muted/50"
                          disabled={registerMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  data-testid="button-register-club"
                  className="w-full h-11 bg-[#059467] text-white hover:bg-[#047a55] transition-colors"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? 'Registering...' : 'Register Club'}
                </Button>
              </form>
            </Form>

            <div className="mt-5 text-center">
              <span className="text-sm text-muted-foreground">Already have an account? </span>
              <button
                data-testid="link-sign-in"
                className="text-sm text-[#059467] hover:underline transition-all"
                onClick={() => setLocation('/login')}
              >
                Sign in
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
