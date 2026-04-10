import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('This verification link is invalid or has expired.');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setErrorMessage('No verification token found in the link.');
      setStatus('error');
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setStatus('success');
        } else {
          setErrorMessage(data.message || 'This verification link is invalid or has expired.');
          setStatus('error');
        }
      })
      .catch(() => {
        setErrorMessage('Unable to connect. Please try again.');
        setStatus('error');
      });
  }, []);

  if (status === 'loading') {
    return (
      <div className="h-full min-h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#059467] mx-auto" data-testid="icon-verifying" />
          <p className="text-muted-foreground text-sm">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="h-full min-h-screen w-full flex items-center justify-center overflow-y-auto bg-white py-8">
        <div className="max-w-md w-full px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-card rounded-2xl shadow-2xl p-6 md:p-8 text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-[#059467] mx-auto" data-testid="icon-verified" />
              <h2 className="text-xl font-semibold">Email verified</h2>
              <p className="text-muted-foreground text-sm" data-testid="text-verified-message">
                Your email has been confirmed and your account is now active. You can sign in below.
              </p>
              <Link href="/login">
                <Button
                  className="w-full bg-[#059467] text-white"
                  data-testid="button-go-to-login"
                >
                  Sign in
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-screen w-full flex items-center justify-center overflow-y-auto bg-white py-8">
      <div className="max-w-md w-full px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-card rounded-2xl shadow-2xl p-6 md:p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" data-testid="icon-verify-error" />
            <h2 className="text-xl font-semibold">Verification failed</h2>
            <p className="text-muted-foreground text-sm" data-testid="text-verify-error">
              {errorMessage}
            </p>
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full"
                data-testid="button-back-to-login"
              >
                Back to sign in
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
