/**
 * Privacy Policy Page
 * Required for Google OAuth consent screen
 */

import type { MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
import { ArrowLeft } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Política de Privacidade - ClubeeShopMkt' },
    { name: 'description', content: 'Política de privacidade do ClubeeShopMkt' },
  ];
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Início
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Política de Privacidade</h1>
          <p className="text-gray-600 mt-2">Última atualização: 8 de fevereiro de 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 prose prose-gray max-w-none">
          <h2>1. Informações que Coletamos</h2>
          <p>
            O ClubeeShopMkt coleta informações que você nos fornece diretamente, como quando você:
          </p>
          <ul>
            <li>Cria uma conta em nossa plataforma</li>
            <li>Configura sua loja online</li>
            <li>Usa nossos serviços de gestão de inventário</li>
            <li>Entra em contato conosco para suporte</li>
          </ul>

          <h3>1.1 Informações de Conta</h3>
          <p>
            Quando você se registra, coletamos:
          </p>
          <ul>
            <li>Nome e endereço de e-mail</li>
            <li>Informações da sua loja (nome, subdomínio)</li>
            <li>Dados de autenticação (quando usa Google OAuth)</li>
          </ul>

          <h3>1.2 Dados da Loja</h3>
          <p>
            Para operar sua loja, processamos:
          </p>
          <ul>
            <li>Informações de produtos e inventário</li>
            <li>Dados de pedidos e transações</li>
            <li>Informações de clientes (quando fornecidas por você)</li>
          </ul>

          <h2>2. Como Usamos Suas Informações</h2>
          <p>
            Usamos as informações coletadas para:
          </p>
          <ul>
            <li>Fornecer e manter nossos serviços</li>
            <li>Processar transações e pedidos</li>
            <li>Enviar comunicações importantes sobre o serviço</li>
            <li>Melhorar nossa plataforma e desenvolver novos recursos</li>
            <li>Garantir a segurança e prevenir fraudes</li>
          </ul>

          <h2>3. Compartilhamento de Informações</h2>
          <p>
            Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto:
          </p>
          <ul>
            <li>Com seu consentimento explícito</li>
            <li>Para cumprir obrigações legais</li>
            <li>Com provedores de serviços que nos ajudam a operar a plataforma</li>
            <li>Em caso de fusão, aquisição ou venda de ativos</li>
          </ul>

          <h3>3.1 Provedores de Serviços</h3>
          <p>
            Trabalhamos com provedores confiáveis, incluindo:
          </p>
          <ul>
            <li>Supabase (banco de dados e autenticação)</li>
            <li>Cloudflare (hospedagem e CDN)</li>
            <li>Google (autenticação OAuth)</li>
          </ul>

          <h2>4. Segurança dos Dados</h2>
          <p>
            Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações:
          </p>
          <ul>
            <li>Criptografia de dados em trânsito e em repouso</li>
            <li>Autenticação multi-fator</li>
            <li>Monitoramento contínuo de segurança</li>
            <li>Acesso restrito aos dados</li>
          </ul>

          <h2>5. Seus Direitos</h2>
          <p>
            Você tem o direito de:
          </p>
          <ul>
            <li>Acessar suas informações pessoais</li>
            <li>Corrigir dados incorretos</li>
            <li>Solicitar a exclusão de sua conta</li>
            <li>Exportar seus dados</li>
            <li>Retirar consentimento para processamento</li>
          </ul>

          <h2>6. Retenção de Dados</h2>
          <p>
            Mantemos suas informações pelo tempo necessário para:
          </p>
          <ul>
            <li>Fornecer nossos serviços</li>
            <li>Cumprir obrigações legais</li>
            <li>Resolver disputas</li>
            <li>Fazer cumprir nossos acordos</li>
          </ul>

          <h2>7. Cookies e Tecnologias Similares</h2>
          <p>
            Usamos cookies e tecnologias similares para:
          </p>
          <ul>
            <li>Manter você logado</li>
            <li>Lembrar suas preferências</li>
            <li>Analisar o uso da plataforma</li>
            <li>Melhorar a experiência do usuário</li>
          </ul>

          <h2>8. Transferências Internacionais</h2>
          <p>
            Seus dados podem ser processados em servidores localizados fora do Brasil. 
            Garantimos que essas transferências atendam aos padrões de proteção adequados.
          </p>

          <h2>9. Menores de Idade</h2>
          <p>
            Nossos serviços não são direcionados a menores de 18 anos. Não coletamos 
            intencionalmente informações de menores de idade.
          </p>

          <h2>10. Alterações nesta Política</h2>
          <p>
            Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças 
            significativas por e-mail ou através da plataforma.
          </p>

          <h2>11. Contato</h2>
          <p>
            Para questões sobre esta política de privacidade, entre em contato:
          </p>
          <ul>
            <li>E-mail: privacy@clubemkt.digital</li>
            <li>Endereço: [Seu endereço comercial]</li>
          </ul>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 mb-0">
              Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD) 
              e outras regulamentações aplicáveis de proteção de dados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}