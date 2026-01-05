/**
 * Bento Grid Component
 * Asymmetric grid layout for feature showcases
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export interface BentoGridItem {
  title: string;
  description: string;
  icon: LucideIcon;
  size: 'small' | 'medium' | 'large';
  gradient?: string;
}

interface BentoGridProps {
  items: BentoGridItem[];
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

function getSizeClasses(size: BentoGridItem['size']) {
  switch (size) {
    case 'large':
      return 'md:col-span-2 md:row-span-2';
    case 'medium':
      return 'md:col-span-1 md:row-span-2';
    case 'small':
      return 'md:col-span-1 md:row-span-1';
  }
}

/**
 * BentoGridCard Component
 * Individual card within the Bento Grid
 */
function BentoGridCard({ item }: { item: BentoGridItem }) {
  const Icon = item.icon;
  
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative overflow-hidden rounded-2xl ${getSizeClasses(item.size)}`}
    >
      {/* Glassmorphism card background */}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl" />
      
      {/* Gradient accent for cards with gradient prop */}
      {item.gradient && (
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} 
        />
      )}

      {/* Content */}
      <div className="relative h-full p-6 flex flex-col">
        {/* Icon */}
        <div 
          className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
            item.gradient 
              ? `bg-gradient-to-br ${item.gradient} text-white` 
              : 'bg-slate-100 dark:bg-slate-800 text-foreground'
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>

        {/* Text */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {item.title}
        </h3>
        <p className="text-sm text-muted-foreground flex-grow">
          {item.description}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * BentoGrid Component
 * Displays items in an asymmetric grid layout with staggered animations
 * Responsive: single column on mobile, 4-column grid on desktop
 */
export function BentoGrid({ items, className = '' }: BentoGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      className={`grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[140px] ${className}`}
    >
      {items.map((item) => (
        <BentoGridCard key={item.title} item={item} />
      ))}
    </motion.div>
  );
}

export default BentoGrid;
