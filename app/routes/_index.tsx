/**
 * Landing Page
 * Marketing page with hero section and features grid
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 13.1, 13.2, 13.3, 13.4
 */

import type { MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
import { motion } from 'framer-motion';
import { 
  Package, Building2, CreditCard, Wrench, FolderTree, RefreshCw,
  ArrowRight, Store, Scan, ShoppingCart, Zap, Shield, Globe, CheckCircle2
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ClientOnly } from '~/components/ui/ClientOnly';

export const meta: MetaFunction = () => {
  return [
    { title: 'ClubeeShopMkt - Plataforma Multi-Tenant de Varejo' },
    { name: 'description', content: 'Lance sua loja online em minutos. Plataforma de varejo multi-tenant nativa em edge com estoque em tempo real, PDV e webshop.' },
  ];
};

/**
 * Hero Section Component
 */
function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      
      {/* Gradient orbs */}
      <div className="absolute top-20 -right-20 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-400/20 to-pink-400/20 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/20 dark:border-white/10 text-sm font-medium text-muted-foreground">
            <Store className="h-4 w-4" />
            Plataforma SaaS Multi-Tenant
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
          Lance Sua Loja{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            em Minutos
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          A plataforma completa de varejo para negócios modernos. Gerencie estoque, 
          processe vendas e administre sua webshop — tudo em um só lugar.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/signup">
            <Button
              size="lg"
              className="h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 w-full"
            >
              Começar Grátis
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          
          <Link to="/login">
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-white/20 dark:border-white/10 hover:bg-white/80 dark:hover:bg-slate-800/80 w-full"
            >
              Entrar
            </Button>
          </Link>
        </div>

        {/* Trust indicators */}
        <p className="text-sm text-muted-foreground mt-8">
          Grátis para começar • Sem cartão de crédito • Configure em menos de 60 segundos
        </p>
      </div>
    </section>
  );
}


/**
 * Features section data
 */
const features = [
  { title: 'Gestão de Estoque', description: 'Rastreie estoque em tempo real com leitura de código de barras. Receba alertas quando itens estiverem acabando.', icon: Package, gradient: 'from-blue-500 to-cyan-500' },
  { title: 'Multi-Tenant', description: 'Cada loja recebe seu próprio subdomínio e dados completamente isolados.', icon: Building2 },
  { title: 'Sistema PDV', description: 'Processe vendas presenciais instantaneamente com nossa interface intuitiva de ponto de venda.', icon: CreditCard },
  { title: 'Suporte a Serviços', description: 'Venda serviços junto com produtos físicos com preços flexíveis.', icon: Wrench },
  { title: 'Categorias Inteligentes', description: 'Organize seu catálogo com categorias e filtros personalizados.', icon: FolderTree },
  { title: 'Sincronização em Tempo Real', description: 'Mudanças aparecem instantaneamente em todos os lugares. Alimentado por edge computing.', icon: RefreshCw, gradient: 'from-purple-500 to-pink-500' },
];

/**
 * Feature Card Component
 */
function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const Icon = feature.icon;
  
  return (
    <ClientOnly fallback={
      <div className="group relative overflow-hidden rounded-2xl p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10">
        {feature.gradient && <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-5`} />}
        <div className={`relative inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${feature.gradient ? `bg-gradient-to-br ${feature.gradient} text-white` : 'bg-slate-100 dark:bg-slate-800 text-foreground'}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="relative text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
        <p className="relative text-sm text-muted-foreground">{feature.description}</p>
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
        {feature.gradient && <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />}
        <div className={`relative inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${feature.gradient ? `bg-gradient-to-br ${feature.gradient} text-white` : 'bg-slate-100 dark:bg-slate-800 text-foreground'}`}>
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
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Tudo Que Você Precisa Para Administrar Sua Loja
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Do estoque ao checkout, nós cobrimos você com recursos poderosos que funcionam perfeitamente juntos.
          </p>
        </div>
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
  { icon: Store, title: 'Crie Sua Loja', description: 'Cadastre-se com Google e configure sua loja em menos de 60 segundos.' },
  { icon: Package, title: 'Adicione Produtos', description: 'Importe seu catálogo ou adicione produtos um por um com leitura de código de barras.' },
  { icon: ShoppingCart, title: 'Comece a Vender', description: 'Use o PDV para vendas presenciais ou compartilhe o link da sua webshop com clientes.' },
];

function HowItWorksSection() {
  return (
    <section className="relative px-4 py-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Comece em 3 Passos Simples
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4">
                  <Icon className="h-8 w-8" />
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Passo {index + 1}</div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
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
  { icon: Zap, text: 'Edge computing ultrarrápido' },
  { icon: Shield, text: 'Segurança de nível empresarial' },
  { icon: Globe, text: 'Funciona em qualquer dispositivo' },
  { icon: Scan, text: 'Suporte a leitor de código de barras' },
];

function BenefitsSection() {
  return (
    <section className="relative px-4 py-16 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.text} className="flex flex-col items-center text-center text-white">
                <Icon className="h-8 w-8 mb-2 opacity-90" />
                <span className="text-sm font-medium opacity-90">{benefit.text}</span>
              </div>
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
  return (
    <section className="relative px-4 py-24">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Pronto Para Lançar Sua Loja?
        </h2>
        <p className="text-lg text-muted-foreground">
          Junte-se a milhares de negócios que já usam ClubeeShopMkt para gerenciar suas operações de varejo.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link to="/signup">
            <Button
              size="lg"
              className="h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg w-full"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Começar Grátis
            </Button>
          </Link>
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
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <span className="font-semibold">ClubeeShopMkt</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Política de Privacidade
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Termos de Serviço
            </Link>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ClubeeShopMkt. Todos os direitos reservados.
          </p>
        </div>
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
