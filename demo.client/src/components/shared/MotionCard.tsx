import { motion } from 'framer-motion';
import { cardVariants, cardHover, cardTap } from '../../lib/motion';
import { cn } from '../../lib/utils';

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  /** Disable hover/tap effects (e.g. for non-interactive display cards) */
  noHover?: boolean;
}

/**
 * Wrapper that applies stagger entrance + hover lift to any card-shaped element.
 * Must be inside a <motion.div> with staggerContainer variants for the entrance to work.
 */
export default function MotionCard({ children, className, noHover }: MotionCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={noHover ? undefined : cardHover}
      whileTap={noHover ? undefined : cardTap}
      className={cn('cursor-default', className)}
    >
      {children}
    </motion.div>
  );
}
