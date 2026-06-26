import { motion } from 'framer-motion';
import { headerVariants } from '../../lib/motion';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <motion.div
      variants={headerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-5 border-b border-gray-200/70"
    >
      <div>
        <h1 className="text-[19px] font-black tracking-tight text-brand-navy dark:text-white leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-400 mt-1.5 font-medium">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  );
}
