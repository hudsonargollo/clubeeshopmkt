/**
 * Landing Page
 * Marketing page with hero section and features grid
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 13.1, 13.2, 13.3, 13.4
 */

import { useState } from 'react';
import type { MetaFunction } from '@remix-run/cloudflare';
import { motion } from 'framer-motion';
import { 
  Package, 
  Building2, 
  CreditCard, 
  Wrench, 
  FolderTree, 
  RefreshCw,
  Loader2,
  ArrowRight,
  Store
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { BentoGrid, type BentoGridItem } from '~/components/ui/BentoGrid';

export const meta: MetaFunction = () => {
  return [
    { title: 'ClubeeShopMkt - Multi-Tenant Retail Platform' },
    { 
      name: 'description', 
      content: 'Launch your online shop in minutes. Edge-native multi-tenant retail platform with real-time inventory, POS, and webshop.' 
    },
  ];
};

/**
 * Hero Section Component
 * Glassmorphism style with gradient background and CTAs
 */
function HeroSection() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    setIsLoading(true);
    try {
      const { signInWithGoogle } = await import('~/lib/auth');
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in error:', error);
      setIsLoading(false);
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      
      {/* Floating gradient orbs */}
      <motion.div
        className="absolute top-20 -right-20 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl"
        animate={{ 
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
      />
      <motion.div
        className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl"
        animate={{ 
          x: [0, -20, 0],
          y: [0, 30, 0],
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-400/20 to-pink-400/20 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360],
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: 'linear' 
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/20 dark:border-white/10 text-sm font-medium text-muted-foreground mb-8">
            <Store className="h-4 w-4" />
            Multi-Tenant SaaS Platform
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6"
        >
          Launch Your Shop{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            in Minutes
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          Edge-native retail platform with real-time inventory management, 
          built-in POS, and your own branded webshop. No coding required.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            size="lg"
            onClick={handleGetStarted}
            disabled={isLoading}
            className="h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Connecting...
              </>
            ) : (
              <>
                Start for Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            onClick={handleGetStarted}
            disabled={isLoading}
            className="h-12 px-8 text-base bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-white/20 dark:border-white/10 hover:bg-white/80 dark:hover:bg-slate-800/80"
          >
            Login
          </Button>
        </motion.div>

        {/* Trust indicators */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-sm text-muted-foreground mt-8"
        >
          Free to start • No credit card required • Setup in under 60 seconds
        </motion.p>
      </div>
    </section>
  );
}

/**
 * Bento Grid Item Interface - re-exported from component
 */

/**
 * Features section data
 */
const features: BentoGridItem[] = [
  {
    title: 'Inventory Management',
    description: 'Track stock in real-time with barcode scanning. Get alerts when items run low.',
    icon: Package,
    size: 'large',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'Multi-Tenant',
    description: 'Each shop gets its own subdomain and isolated data.',
    icon: Building2,
    size: 'medium',
  },
  {
    title: 'POS System',
    description: 'Process walk-in sales instantly with our point-of-sale interface.',
    icon: CreditCard,
    size: 'medium',
  },
  {
    title: 'Services',
    description: 'Sell services alongside physical products.',
    icon: Wrench,
    size: 'small',
  },
  {
    title: 'Categories',
    description: 'Organize your catalog with custom categories.',
    icon: FolderTree,
    size: 'small',
  },
  {
    title: 'Real-Time Sync',
    description: 'Changes appear instantly everywhere. Powered by edge computing.',
    icon: RefreshCw,
    size: 'large',
    gradient: 'from-purple-500 to-pink-500',
  },
];

/**
 * Features Bento Grid Section
 * Uses the reusable BentoGrid component
 */
function FeaturesBentoGrid() {
  return (
    <section className="relative px-4 py-20 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Everything You Need to Run Your Shop
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From inventory to checkout, we've got you covered with powerful features 
            that work seamlessly together.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <BentoGrid items={features} />
      </div>
    </section>
  );
}

/**
 * Footer Component
 */
function Footer() {
  return (
    <footer className="px-4 py-8 border-t border-border/50">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <span className="font-semibold">ClubeeShopMkt</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} ClubeeShopMkt. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/**
 * Landing Page
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <HeroSection />
      <FeaturesBentoGrid />
      <Footer />
    </div>
  );
}
