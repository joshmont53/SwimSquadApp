import { motion } from 'framer-motion';
import swimSquadLogo from '@assets/Swim_Squad_1771264189149.png';

export default function LoadingScreen() {
  return (
    <div 
      className="h-screen w-full flex items-center justify-center overflow-hidden bg-white"
      data-testid="loading-screen"
    >
      <div className="max-w-md w-full px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center"
        >
          <motion.img
            src={swimSquadLogo}
            alt="Swim Squad"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-64 h-auto select-none"
            data-testid="img-swim-squad-logo"
          />
        </motion.div>
      </div>
    </div>
  );
}
