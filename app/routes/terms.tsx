/**
 * Terms of Service Page
 * Required for Google OAuth consent screen
 */

import type { MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
import { ArrowLeft } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Termos de Serviço - ClubeeShopMkt' },
    { name: 'description', content: 'Termos de serviço do ClubeeShopMkt' },
  ];
};

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-gray-900">Termos de Serviço</h1>
          <p className="text-gray-600 mt-2">Última atualização: 8 de fevereiro de 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 prose prose-gray max-w-none">
          <h2>1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e usar o ClubeeShopMkt, você concorda em cumprir estes Termos de Serviço. 
            Se você não concorda com qualquer parte destes termos, não deve usar nossos serviços.
          </p>

          <h2>2. Descrição do Serviço</h2>
          <p>
            O ClubeeShopMkt é uma plataforma multi-tenant de operações de varejo que oferece:
          </p>
          <ul>
            <li>Sistema de gestão de inventário com leitura de código de barras</li>
            <li>Loja online para clientes</li>
            <li>Processamento de pedidos (retirada e entrega)</li>
            <li>Ferramentas de gestão empresarial</li>
          </ul>

          <h2>3. Elegibilidade</h2>
          <p>
            Para usar nossos serviços, você deve:
          </p>
          <ul>
            <li>Ter pelo menos 18 anos de idade</li>
            <li>Ter capacidade legal para celebrar contratos</li>
            <li>Fornecer informações precisas e completas</li>
            <li>Manter a segurança de sua conta</li>
          </ul>

          <h2>4. Conta de Usuário</h2>
          
          <h3>4.1 Registro</h3>
          <p>
            Você é responsável por:
          </p>
          <ul>
            <li>Manter a confidencialidade de suas credenciais</li>
            <li>Todas as atividades que ocorrem em sua conta</li>
            <li>Notificar-nos imediatamente sobre uso não autorizado</li>
          </ul>

          <h3>4.2 Informações da Conta</h3>
          <p>
            Você concorda em fornecer informações precisas, atuais e completas durante 
            o registro e manter essas informações atualizadas.
          </p>

          <h2>5. Uso Aceitável</h2>
          
          <h3>5.1 Usos Permitidos</h3>
          <p>
            Você pode usar nossos serviços para:
          </p>
          <ul>
            <li>Operar seu negócio de varejo legítimo</li>
            <li>Gerenciar inventário e processar pedidos</li>
            <li>Interagir com clientes através da plataforma</li>
          </ul>

          <h3>5.2 Usos Proibidos</h3>
          <p>
            Você não pode usar nossos serviços para:
          </p>
          <ul>
            <li>Atividades ilegais ou fraudulentas</li>
            <li>Venda de produtos proibidos ou restritos</li>
            <li>Violar direitos de propriedade intelectual</li>
            <li>Transmitir malware ou código malicioso</li>
            <li>Interferir com a operação da plataforma</li>
            <li>Coletar dados de outros usuários sem consentimento</li>
          </ul>

          <h2>6. Conteúdo do Usuário</h2>
          
          <h3>6.1 Propriedade</h3>
          <p>
            Você mantém a propriedade de todo o conteúdo que carrega ou cria na plataforma, 
            incluindo descrições de produtos, imagens e dados de clientes.
          </p>

          <h3>6.2 Licença</h3>
          <p>
            Ao usar nossos serviços, você nos concede uma licença limitada para hospedar, 
            exibir e processar seu conteúdo conforme necessário para fornecer os serviços.
          </p>

          <h3>6.3 Responsabilidade</h3>
          <p>
            Você é responsável por garantir que seu conteúdo:
          </p>
          <ul>
            <li>Não viola leis ou regulamentos</li>
            <li>Não infringe direitos de terceiros</li>
            <li>É preciso e não enganoso</li>
          </ul>

          <h2>7. Pagamentos e Cobrança</h2>
          
          <h3>7.1 Taxas</h3>
          <p>
            O uso de nossos serviços pode estar sujeito a taxas conforme descrito em 
            nossos planos de preços atuais.
          </p>

          <h3>7.2 Cobrança</h3>
          <p>
            As taxas são cobradas antecipadamente e não são reembolsáveis, exceto 
            conforme exigido por lei.
          </p>

          <h2>8. Propriedade Intelectual</h2>
          
          <h3>8.1 Nossa Propriedade</h3>
          <p>
            A plataforma ClubeeShopMkt, incluindo software, design, texto e gráficos, 
            é de nossa propriedade e protegida por leis de propriedade intelectual.
          </p>

          <h3>8.2 Marcas Registradas</h3>
          <p>
            ClubeeShopMkt e logos relacionados são nossas marcas registradas. Você não 
            pode usar nossas marcas sem permissão prévia por escrito.
          </p>

          <h2>9. Privacidade</h2>
          <p>
            Seu uso dos serviços também é regido por nossa Política de Privacidade, 
            que está incorporada a estes termos por referência.
          </p>

          <h2>10. Suspensão e Encerramento</h2>
          
          <h3>10.1 Por Você</h3>
          <p>
            Você pode encerrar sua conta a qualquer momento através das configurações 
            da conta ou entrando em contato conosco.
          </p>

          <h3>10.2 Por Nós</h3>
          <p>
            Podemos suspender ou encerrar sua conta se você:
          </p>
          <ul>
            <li>Violar estes termos</li>
            <li>Usar os serviços de forma prejudicial</li>
            <li>Não pagar taxas devidas</li>
            <li>Fornecer informações falsas</li>
          </ul>

          <h2>11. Isenções de Responsabilidade</h2>
          <p>
            Nossos serviços são fornecidos "como estão" e "conforme disponíveis". 
            Não garantimos que os serviços serão ininterruptos ou livres de erros.
          </p>

          <h2>12. Limitação de Responsabilidade</h2>
          <p>
            Em nenhuma circunstância seremos responsáveis por danos indiretos, 
            incidentais, especiais ou consequenciais decorrentes do uso dos serviços.
          </p>

          <h2>13. Indenização</h2>
          <p>
            Você concorda em nos indenizar contra reivindicações decorrentes de seu 
            uso dos serviços, violação destes termos ou violação de direitos de terceiros.
          </p>

          <h2>14. Lei Aplicável</h2>
          <p>
            Estes termos são regidos pelas leis do Brasil. Disputas serão resolvidas 
            nos tribunais competentes do Brasil.
          </p>

          <h2>15. Alterações nos Termos</h2>
          <p>
            Podemos modificar estes termos periodicamente. Mudanças significativas 
            serão notificadas com pelo menos 30 dias de antecedência.
          </p>

          <h2>16. Disposições Gerais</h2>
          
          <h3>16.1 Acordo Completo</h3>
          <p>
            Estes termos constituem o acordo completo entre você e nós sobre o uso dos serviços.
          </p>

          <h3>16.2 Divisibilidade</h3>
          <p>
            Se qualquer disposição destes termos for considerada inválida, as disposições 
            restantes permanecerão em vigor.
          </p>

          <h2>17. Contato</h2>
          <p>
            Para questões sobre estes termos, entre em contato:
          </p>
          <ul>
            <li>E-mail: legal@clubemkt.digital</li>
            <li>Endereço: [Seu endereço comercial]</li>
          </ul>

          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800 mb-0">
              Ao continuar a usar nossos serviços após alterações nestes termos, 
              você concorda com os termos revisados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}