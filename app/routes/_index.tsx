/**
 * Landing Page
 * Marketing page with hero section and features grid
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 13.1, 13.2, 13.3, 13.4
 */

import { useState } from 'react';
import type { MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
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
  Store,
  Scan,
  ShoppingCart,
  Zap,
  Shield,
  Globe,
  CheckCircle2
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ClientOnly } from '~/components/ui/ClientOnly';

export const meta: MetaFunction = () => {
  return [
    { title: 'ClubeeShopMkt - Multi-Tenant Retail Platform' },
    { 
      name: 'description', 
      content: 'Launch your online shop in minutes. Edge-native multi-tenant retail platform with real-time inventory, POS, and webshop.' 
    },
  ];
};


// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
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
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      
      {/* Animated gradient orbs - client only */}
      <ClientOnly fallback={
        <>
          <div className="absolute top-20 -right-20 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl" />
        </>
      }>
        <motion.div
          className="absolute top-20 -right-20 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-400/20 to-pink-400/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </ClientOnly>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <ClientOnly fallback={
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/20 text-sm font-medium text-muted-foreground">
              <Store className="h-4 w-4" />
              Multi-Tenant SaaS Platform
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
              Launch Your Shop <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">in Minutes</span>
            </h1>
          </div>
        }>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-6"
          >
            {/* Badge */}
            <motion.div variants={fadeInUp}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/20 dark:border-white/10 text-sm font-medium text-muted-foreground">
                <Store className="h-4 w-4" />
                Multi-Tenant SaaS Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground"
            >
              Launch Your Shop{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                in Minutes
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              The complete retail platform for modern businesses. Manage inventory, 
              process sales, and run your webshop — all from one place.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
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
              
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-white/20 dark:border-white/10 hover:bg-white/80 dark:hover:bg-slate-800/80 w-full"
                >
                  Login
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div variants={fadeInUp} className="pt-6">
              <p className="text-sm text-muted-foreground">
                Free to start • No credit card required • Setup in under 60 seconds
              </p>
            </motion.div>
          </motion.div>
        </ClientOnly>
      </div>
    </section>
  );
}


/**
 * Features section data
 */
interface FeatureItem {
  title: string;
  description: string;
  icon: typeof Package;
  gradient?: string;
}

const features: FeatureItem[] = [
  {
    title: 'Inventory Management',
    description: 'Track stock in real-time with barcode scanning. Get alerts when items run low.',
    icon: Package,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'Multi-Tenant',
    description: 'Each shop gets its own subdomain and completely isolated data.',
    icon: Building2,
  },
  {
    title: 'POS System',
    description: 'Process walk-in sales instantly with our intuitive point-of-sale interface.',
    icon: CreditCard,
  },
  {
    title: 'Services Support',
    description: 'Sell services alongside physical products with flexible pricing.',
    icon: Wrench,
  },
  {
    title: 'Smart Categories',
    description: 'Organize your catalog with custom categories and filters.',
    icon: FolderTree,
  },
  {
    title: 'Real-Time Sync',
    description: 'Changes appear instantly everywhere. Powered by edge computing.',
    icon: RefreshCw,
    gradient: 'from-purple-500 to-pink-500',
  },
];


/**
 * Feature Card Component
 */
function FeatureCard({ feature, index }: { feature: FeatureItem; index: number }) {
  const Icon = feature.icon;
  
  return (
    <ClientOnly fallback={
      <div className="group relative overflow-hidden rounded-2xl p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
          feature.gradient 
            ? `bg-gradient-to-br ${feature.gradient} text-white` 
            : 'bg-slate-100 dark:bg-slate-800 text-foreground'
        }`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
        <p className="text-sm text-muted-foreground">{feature.description}</p>
      </div>
    }>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="group relative overflow-hidden rounded-2xl p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10"
      >
        {feature.gradient && (
          <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
        )}
        <div className={`relative inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
          feature.gradient 
            ? `bg-gradient-to-br ${feature.gradient} text-white` 
            : 'bg-slate-100 dark:bg-slate-800 text-foreground'
        }`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="relative text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
        <p className="relative text-sm text-muted-foreground">{feature.description}</p>
      </motion.div>
    </ClientOnly>
  );
}


/**
 * Features Grid Section
 */
function FeaturesGrid() {
  return (
    <section className="relative px-4 py-24 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        <ClientOnly fallback={
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              Everything You Need to Run Your Shop
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From inventory to checkout, we've got you covered with powerful features 
              that work seamlessly together.
            </p>
          </div>
        }>
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
        </ClientOnly>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}


/**
 * How It Works Section
 */
const steps = [
  {
    icon: Store,
    title: 'Create Your Shop',
    description: 'Sign up with Google and set up your shop in under 60 seconds.',
  },
  {
    icon: Package,
    title: 'Add Products',
    description: 'Import your catalog or add products one by one with barcode scanning.',
  },
  {
    icon: ShoppingCart,
    title: 'Start Selling',
    description: 'Use the POS for walk-ins or share your webshop link with customers.',
  },
];

function HowItWorksSection() {
  return (
    <section className="relative px-4 py-24">
      <div className="max-w-4xl mx-auto">
        <ClientOnly fallback={
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              Get Started in 3 Simple Steps
            </h2>
          </div>
        }>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              Get Started in 3 Simple Steps
            </h2>
          </motion.div>
        </ClientOnly>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <ClientOnly key={step.title} fallback={
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Step {index + 1}</div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              }>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="text-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4"
                  >
                    <Icon className="h-8 w-8" />
                  </motion.div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Step {index + 1}</div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </motion.div>
              </ClientOnly>
            );
          })}
        </div>
      </div>
    </section>
  );
}


/**
 * Benefits Section
 */
const benefits = [
  { icon: Zap, text: 'Lightning fast edge computing' },
  { icon: Shield, text: 'Enterprise-grade security' },
  { icon: Globe, text: 'Works on any device' },
  { icon: Scan, text: 'Barcode scanner support' },
];

function BenefitsSection() {
  return (
    <section className="relative px-4 py-16 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <ClientOnly key={benefit.text} fallback={
                <div className="flex flex-col items-center text-center text-white">
                  <Icon className="h-8 w-8 mb-2 opacity-90" />
                  <span className="text-sm font-medium opacity-90">{benefit.text}</span>
                </div>
              }>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex flex-col items-center text-center text-white"
                >
                  <Icon className="h-8 w-8 mb-2 opacity-90" />
                  <span className="text-sm font-medium opacity-90">{benefit.text}</span>
                </motion.div>
              </ClientOnly>
            );
          })}
        </div>
      </div>
    </section>
  );
}


/**
 * CTA Section
 */
function CTASection() {
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
    <section className="relative px-4 py-24">
      <div className="max-w-3xl mx-auto text-center">
        <ClientOnly fallback={
          <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Ready to Launch Your Shop?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of businesses already using ClubeeShopMkt to manage their retail operations.
            </p>
          </div>
        }>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Ready to Launch Your Shop?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of businesses already using ClubeeShopMkt to manage their retail operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                onClick={handleGetStarted}
                disabled={isLoading}
                className="h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                )}
                Get Started Free
              </Button>
            </div>
          </motion.div>
        </ClientOnly>
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
      <FeaturesGrid />
      <HowItWorksSection />
      <BenefitsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
