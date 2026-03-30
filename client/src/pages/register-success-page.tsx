import { motion } from 'framer-motion';
import { CheckCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function RegisterSuccessPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="h-full min-h-screen w-full flex items-center justify-center bg-white py-8">
      <div className="max-w-md w-full px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-card rounded-2xl shadow-2xl p-8 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-[#059467]" data-testid="icon-success" />
            </div>
            <h2 className="text-2xl font-bold">Club Registration Complete!</h2>
            <p className="text-muted-foreground">
              Your payment method has been saved and your swimming club is being set up. This usually takes a few seconds.
            </p>
            <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4 text-left">
              <Mail className="w-5 h-5 text-[#059467] shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Check your inbox for a verification email. You must verify your address before signing in.
              </p>
            </div>
            <Button
              data-testid="button-go-to-login"
              className="w-full bg-[#059467] text-white"
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
