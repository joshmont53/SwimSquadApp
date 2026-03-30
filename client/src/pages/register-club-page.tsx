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

const registerClubSchema = z.object({
  clubName: z.string().min(2, 'Club name must be at least 2 characters'),
  clubColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex colour').default('#4B9A4A'),
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

  const form = useForm<RegisterClubInput>({
    resolver: zodResolver(registerClubSchema),
    defaultValues: {
      clubName: '',
      clubColor: '#4B9A4A',
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
      // Redirect to Stripe Checkout to collect payment method
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
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

                <FormField
                  control={form.control}
                  name="clubColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Club Colour (optional)</FormLabel>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-11 w-16 cursor-pointer rounded-md border border-input"
                          data-testid="input-club-colour"
                          disabled={registerMutation.isPending}
                        />
                        <div
                          className="h-11 flex-1 rounded-md border flex items-center justify-center text-sm font-mono"
                          style={{ backgroundColor: field.value + '20', color: field.value, borderColor: field.value + '60' }}
                        >
                          {field.value.toUpperCase()}
                        </div>
                      </div>
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
                  className="w-full h-11 bg-[#059467] text-white"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? 'Redirecting to payment...' : 'Register Club'}
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
