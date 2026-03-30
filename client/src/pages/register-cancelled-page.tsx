import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

export default function RegisterCancelledPage() {
  const [, setLocation] = useLocation();

  // Immediately clean up the pending registration so it doesn't linger until Stripe expiry.
  // Stripe appends ?session_id=... to the cancel URL — use it to identify the right record.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      apiRequest('POST', '/api/auth/cancel-registration', { sessionId }).catch((err) => {
        console.warn('[RegisterCancelled] Could not clean up pending registration:', err);
      });
    }
  }, []);

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
              <XCircle className="w-16 h-16 text-muted-foreground" data-testid="icon-cancelled" />
            </div>
            <h2 className="text-2xl font-bold">Registration Cancelled</h2>
            <p className="text-muted-foreground">
              You cancelled the payment setup. No charge has been made and no club has been created.
            </p>
            <p className="text-sm text-muted-foreground">
              You can try again whenever you're ready.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                data-testid="button-try-again"
                className="w-full bg-[#059467] text-white"
                onClick={() => setLocation('/register-club')}
              >
                Try Again
              </Button>
              <Button
                data-testid="button-go-to-login"
                variant="outline"
                className="w-full"
                onClick={() => setLocation('/login')}
              >
                Sign In Instead
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
