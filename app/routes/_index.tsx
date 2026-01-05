/**
 * Landing Page
 * Marketing page with hero section and features grid
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 13.1, 13.2, 13.3, 13.4
 */

import { useState } from 'react';
import type { MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
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
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      
      {/* Floating gradient orbs - static version */}
      <div className="absolute top-20 -right-20 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-400/20 to-pink-400/20 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/20 dark:border-white/10 text-sm font-medium text-muted-foreground">
            <Store className="h-4 w-4" />
            Multi-Tenant SaaS Platform
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
          Launch Your Shop{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            in Minutes
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Edge-native retail platform with real-time inventory management, 
          built-in POS, and your own branded webshop. No coding required.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
        </div>

        {/* Trust indicators */}
        <p className="text-sm text-muted-foreground mt-8">
          Free to start • No credit card required • Setup in under 60 seconds
        </p>
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
    description: 'Each shop gets its own subdomain and isolated data.',
    icon: Building2,
  },
  {
    title: 'POS System',
    description: 'Process walk-in sales instantly with our point-of-sale interface.',
    icon: CreditCard,
  },
  {
    title: 'Services',
    description: 'Sell services alongside physical products.',
    icon: Wrench,
  },
  {
    title: 'Categories',
    description: 'Organize your catalog with custom categories.',
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
function FeatureCard({ feature }: { feature: FeatureItem }) {
  const Icon = feature.icon;
  
  return (
    <div className="group relative overflow-hidden rounded-2xl p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 hover:-translate-y-1 transition-transform duration-200">
      {/* Gradient accent */}
      {feature.gradient && (
        <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
      )}

      {/* Icon */}
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
        feature.gradient 
          ? `bg-gradient-to-br ${feature.gradient} text-white` 
          : 'bg-slate-100 dark:bg-slate-800 text-foreground'
      }`}>
        <Icon className="h-6 w-6" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {feature.title}
      </h3>
      <p className="text-sm text-muted-foreground">
        {feature.description}
      </p>
    </div>
  );
}

/**
 * Features Grid Section
 */
function FeaturesGrid() {
  return (
    <section className="relative px-4 py-20 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Everything You Need to Run Your Shop
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From inventory to checkout, we've got you covered with powerful features 
            that work seamlessly together.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
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
      <Footer />
    </div>
  );
}
