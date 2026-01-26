/**
 * Internationalization (i18n) - Brazilian Portuguese translations
 * All user-facing text in the application
 */

export const translations = {
  // Common
  common: {
    loading: 'Carregando...',
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    edit: 'Editar',
    add: 'Adicionar',
    search: 'Buscar',
    filter: 'Filtrar',
    back: 'Voltar',
    next: 'Próximo',
    previous: 'Anterior',
    submit: 'Enviar',
    close: 'Fechar',
    confirm: 'Confirmar',
    yes: 'Sim',
    no: 'Não',
    error: 'Erro',
    success: 'Sucesso',
    warning: 'Aviso',
    info: 'Informação',
  },

  // Authentication
  auth: {
    login: 'Entrar',
    logout: 'Sair',
    signup: 'Criar Conta',
    email: 'E-mail',
    password: 'Senha',
    confirmPassword: 'Confirmar Senha',
    forgotPassword: 'Esqueceu a senha?',
    rememberMe: 'Lembrar de mim',
    signInWithGoogle: 'Entrar com Google',
    dontHaveAccount: 'Não tem uma conta?',
    alreadyHaveAccount: 'Já tem uma conta?',
    createAccount: 'Criar uma conta',
    signIn: 'Fazer login',
    welcomeBack: 'Bem-vindo de volta',
    getStarted: 'Comece agora',
    loginTitle: 'Entre na sua conta',
    signupTitle: 'Crie sua conta',
    invalidCredentials: 'E-mail ou senha inválidos',
    accountCreated: 'Conta criada com sucesso!',
    loginError: 'Erro ao fazer login',
    signupError: 'Erro ao criar conta',
  },

  // Onboarding
  onboarding: {
    title: 'Configure sua Loja',
    subtitle: 'Vamos configurar sua loja em alguns passos simples',
    shopName: 'Nome da Loja',
    shopNamePlaceholder: 'Minha Loja',
    subdomain: 'Subdomínio',
    subdomainPlaceholder: 'minhaloja',
    subdomainHint: 'Seu endereço será: {subdomain}.{domain}',
    subdomainAvailable: 'Subdomínio disponível',
    subdomainTaken: 'Subdomínio já está em uso',
    createShop: 'Criar Loja',
    creating: 'Criando...',
    error: 'Erro ao criar loja',
    success: 'Loja criada com sucesso!',
  },

  // Dashboard
  dashboard: {
    title: 'Painel de Controle',
    welcome: 'Bem-vindo',
    inventory: 'Estoque',
    orders: 'Pedidos',
    deliveries: 'Entregas',
    settings: 'Configurações',
    totalProducts: 'Total de Produtos',
    lowStock: 'Estoque Baixo',
    outOfStock: 'Sem Estoque',
    pendingOrders: 'Pedidos Pendentes',
    completedOrders: 'Pedidos Concluídos',
    recentOrders: 'Pedidos Recentes',
    quickActions: 'Ações Rápidas',
    viewAll: 'Ver Todos',
  },

  // Inventory
  inventory: {
    title: 'Gerenciar Estoque',
    addProduct: 'Adicionar Produto',
    editProduct: 'Editar Produto',
    deleteProduct: 'Excluir Produto',
    productName: 'Nome do Produto',
    productNamePlaceholder: 'Ex: Coca-Cola 2L',
    description: 'Descrição',
    descriptionPlaceholder: 'Descrição do produto',
    price: 'Preço',
    pricePlaceholder: 'R$ 0,00',
    stock: 'Estoque',
    stockPlaceholder: '0',
    category: 'Categoria',
    categoryPlaceholder: 'Selecione uma categoria',
    barcode: 'Código de Barras',
    barcodePlaceholder: '7891234567890',
    sku: 'SKU',
    skuPlaceholder: 'SKU-001',
    type: 'Tipo',
    physical: 'Físico',
    service: 'Serviço',
    all: 'Todos',
    searchProducts: 'Buscar produtos...',
    noProducts: 'Nenhum produto encontrado',
    productAdded: 'Produto adicionado com sucesso',
    productUpdated: 'Produto atualizado com sucesso',
    productDeleted: 'Produto excluído com sucesso',
    confirmDelete: 'Tem certeza que deseja excluir este produto?',
    scanBarcode: 'Escanear Código de Barras',
    inStock: 'Em Estoque',
    lowStockWarning: 'Estoque baixo',
    outOfStockWarning: 'Sem estoque',
  },

  // Categories
  categories: {
    title: 'Categorias',
    addCategory: 'Adicionar Categoria',
    editCategory: 'Editar Categoria',
    deleteCategory: 'Excluir Categoria',
    categoryName: 'Nome da Categoria',
    categoryNamePlaceholder: 'Ex: Bebidas',
    noCategories: 'Nenhuma categoria encontrada',
    categoryAdded: 'Categoria adicionada com sucesso',
    categoryUpdated: 'Categoria atualizada com sucesso',
    categoryDeleted: 'Categoria excluída com sucesso',
    confirmDelete: 'Tem certeza que deseja excluir esta categoria?',
  },

  // Orders
  orders: {
    title: 'Pedidos',
    newOrder: 'Novo Pedido',
    orderDetails: 'Detalhes do Pedido',
    orderNumber: 'Pedido #',
    customer: 'Cliente',
    customerName: 'Nome do Cliente',
    customerNamePlaceholder: 'João Silva',
    customerPhone: 'Telefone',
    customerPhonePlaceholder: '(11) 99999-9999',
    deliveryAddress: 'Endereço de Entrega',
    deliveryAddressPlaceholder: 'Rua, número, bairro',
    fulfillmentType: 'Tipo de Entrega',
    takeout: 'Retirada',
    delivery: 'Entrega',
    status: 'Status',
    pending: 'Pendente',
    preparing: 'Preparando',
    ready: 'Pronto',
    delivering: 'Em Entrega',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    total: 'Total',
    subtotal: 'Subtotal',
    items: 'Itens',
    addItem: 'Adicionar Item',
    removeItem: 'Remover Item',
    quantity: 'Quantidade',
    noOrders: 'Nenhum pedido encontrado',
    orderCreated: 'Pedido criado com sucesso',
    orderUpdated: 'Pedido atualizado com sucesso',
    orderCancelled: 'Pedido cancelado',
    confirmCancel: 'Tem certeza que deseja cancelar este pedido?',
    scanQRCode: 'Escanear QR Code',
    showQRCode: 'Mostrar QR Code',
    qrCodeInstructions: 'Mostre este QR Code para retirar seu pedido',
    createdAt: 'Criado em',
    updatedAt: 'Atualizado em',
  },

  // Shop (Customer-facing)
  shop: {
    title: 'Loja',
    welcome: 'Bem-vindo à',
    browseProducts: 'Navegue pelos produtos',
    addToCart: 'Adicionar ao Carrinho',
    cart: 'Carrinho',
    checkout: 'Finalizar Compra',
    emptyCart: 'Seu carrinho está vazio',
    continueShopping: 'Continuar Comprando',
    orderSummary: 'Resumo do Pedido',
    placeOrder: 'Fazer Pedido',
    orderPlaced: 'Pedido realizado com sucesso!',
    orderNumber: 'Número do Pedido',
    thankYou: 'Obrigado pela sua compra!',
    viewOrder: 'Ver Pedido',
    searchPlaceholder: 'Buscar produtos...',
    noProductsFound: 'Nenhum produto encontrado',
    allCategories: 'Todas as Categorias',
  },

  // Portal (Admin)
  portal: {
    title: 'Portal Administrativo',
    allShops: 'Todas as Lojas',
    shopName: 'Nome da Loja',
    subdomain: 'Subdomínio',
    owner: 'Proprietário',
    createdAt: 'Criado em',
    actions: 'Ações',
    viewShop: 'Ver Loja',
    noShops: 'Nenhuma loja encontrada',
    totalShops: 'Total de Lojas',
    activeShops: 'Lojas Ativas',
  },

  // Errors
  errors: {
    generic: 'Ocorreu um erro. Tente novamente.',
    notFound: 'Página não encontrada',
    unauthorized: 'Você não tem permissão para acessar esta página',
    serverError: 'Erro no servidor. Tente novamente mais tarde.',
    networkError: 'Erro de conexão. Verifique sua internet.',
    validationError: 'Por favor, verifique os campos do formulário',
    requiredField: 'Este campo é obrigatório',
    invalidEmail: 'E-mail inválido',
    invalidPhone: 'Telefone inválido',
    passwordTooShort: 'A senha deve ter pelo menos 6 caracteres',
    passwordsDontMatch: 'As senhas não coincidem',
  },

  // Success messages
  success: {
    saved: 'Salvo com sucesso!',
    deleted: 'Excluído com sucesso!',
    updated: 'Atualizado com sucesso!',
    created: 'Criado com sucesso!',
  },

  // Date/Time
  datetime: {
    today: 'Hoje',
    yesterday: 'Ontem',
    tomorrow: 'Amanhã',
    now: 'Agora',
    minutes: 'minutos',
    hours: 'horas',
    days: 'dias',
    weeks: 'semanas',
    months: 'meses',
    years: 'anos',
    ago: 'atrás',
  },
};

export type TranslationKey = keyof typeof translations;

/**
 * Get translation by key path
 * Example: t('auth.login') => 'Entrar'
 */
export function t(key: string): string {
  const keys = key.split('.');
  let value: any = translations;
  
  for (const k of keys) {
    value = value[k];
    if (value === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  
  return value;
}

/**
 * Format currency in Brazilian Real
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format date in Brazilian format
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format datetime in Brazilian format
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
