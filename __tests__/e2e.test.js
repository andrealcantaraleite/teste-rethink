/**
 * Testes End-to-End para a API Rethink Bank
 * Framework: Jest
 * Cliente HTTP: Axios
 * * Para executar este teste:
 * 1. Instale as dependências:
 * npm install --save-dev jest axios @babel/core @babel/preset-env
 * * 2. Configure o package.json:
 * "scripts": {
 * "test": "jest"
 * }
 * * 3. Crie um arquivo babel.config.js na raiz do projeto:
 * module.exports = {
 * presets: [['@babel/preset-env', {targets: {node: 'current'}}]],
 * };
 * * 4. Execute os testes com:
 * npm test
 */

import axios from 'axios';

// Configuração base do Axios para a API
const api = axios.create({
  baseURL: 'https://points-app-backend.vercel.app',
  validateStatus: () => true, // Permite que o Axios não lance erro para status 4xx/5xx
});

// --- Funções Auxiliares para gerar dados únicos ---
const generateRandomCpf = () => {
  const num = Math.floor(10000000000 + Math.random() * 90000000000);
  return num.toString();
};

const generateUniqueEmail = () => {
  const timestamp = new Date().getTime();
  return `user${timestamp}@test.com`;
};

// --- Início da Suíte de Testes ---
describe('Jornada do Usuário - Rethink Bank E2E', () => {
  // Variáveis para armazenar dados entre os testes
  let userData;
  let recipientData;
  let sessionToken;
  let confirmToken;

  // Bloco executado antes de todos os testes para gerar os dados dos usuários
  beforeAll(() => {
    // CORREÇÃO: Garantindo que os e-mails sejam únicos para evitar a falha no cadastro do destinatário.
    const userEmail = generateUniqueEmail();
    const recipientEmail = `recipient.${userEmail}`;

    userData = {
      cpf: generateRandomCpf(),
      fullName: 'Usuário Teste Principal',
      email: userEmail,
      password: 'Password@123',
    };
    recipientData = {
      cpf: generateRandomCpf(),
      fullName: 'Usuário Destinatário',
      email: recipientEmail,
      password: 'Password@456',
    };
  });

  // Teste 1: Cadastro do usuário principal
  test('1. Deve cadastrar um novo usuário com sucesso', async () => {
    const response = await api.post('/cadastro', {
      cpf: userData.cpf,
      full_name: userData.fullName,
      email: userData.email,
      password: userData.password,
      confirmPassword: userData.password,
    });

    console.log('Resposta Cadastro (Usuário Principal):', response.data);
    expect(response.status).toBe(201);
    expect(response.data.message).toBe('Cadastro realizado com sucesso.');
    expect(response.data.confirmToken).toBeDefined();
    confirmToken = response.data.confirmToken;
  });

  // Teste 2: Cadastro do usuário destinatário (necessário para o teste de envio)
  test('2. Deve cadastrar um usuário destinatário para o teste de envio', async () => {
    const response = await api.post('/cadastro', {
      cpf: recipientData.cpf,
      full_name: recipientData.fullName,
      email: recipientData.email,
      password: recipientData.password,
      confirmPassword: recipientData.password,
    });

    console.log('Resposta Cadastro (Usuário Destinatário):', response.data);
    expect(response.status).toBe(201);
  });

  // Teste 3: Confirmação de E-mail
  test('3. Deve confirmar o e-mail do usuário', async () => {
    const response = await api.get(`/confirm-email?token=${confirmToken}`);
    
    console.log('Resposta Confirmação de E-mail:', response.data);
    expect(response.status).toBe(200);
    expect(response.data).toBe('E-mail confirmado com sucesso.');
  });


  // Teste 4: Login do usuário
  test('4. Deve realizar o login com sucesso e obter um token de sessão', async () => {
    const response = await api.post('/login', {
      email: userData.email,
      password: userData.password,
    });

    console.log('Resposta Login:', response.data);
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
    sessionToken = response.data.token; // Salva o token para os próximos testes
  });

  // Teste 5: Envio de pontos
  test('5. Deve enviar pontos para outro usuário', async () => {
    const response = await api.post(
      '/points/send',
      {
        recipientCpf: recipientData.cpf,
        amount: 50,
      },
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );

    console.log('Resposta Envio de Pontos:', response.data);
    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Pontos enviados com sucesso.');
  });

  // Teste 6: Depositar pontos na caixinha
  test('6. Deve depositar pontos na caixinha', async () => {
    const response = await api.post(
      '/caixinha/deposit',
      { amount: 30 },
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );

    console.log('Resposta Depósito Caixinha:', response.data);
    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Depósito na caixinha realizado.');
  });

  // Teste 7: Verificar o saldo geral
  test('7. Deve exibir o saldo geral corretamente', async () => {
    const response = await api.get('/points/saldo', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    console.log('Resposta Saldo:', response.data);
    expect(response.status).toBe(200);
    
    // Lógica esperada após as correções:
    // Saldo inicial: 100
    // Após enviar 50: 100 - 50 = 50
    // Após depositar 30 na caixinha: 50 - 30 = 20
    // Saldo esperado: normal_balance = 20, piggy_bank_balance = 30
    
    expect(response.data.piggy_bank_balance).toBe(30);
    expect(response.data.normal_balance).toBe(20);
  });

  // Teste 8: Excluir a conta do usuário
  test('8. Deve marcar a conta como deletada', async () => {
    const response = await api.delete('/account', {
      headers: { Authorization: `Bearer ${sessionToken}` },
      data: { password: userData.password }, // O Axios exige que o body do DELETE esteja em 'data'
    });

    console.log('Resposta Excluir Conta:', response.data);
    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Conta marcada como deletada.');
  });

  // Teste 9: Verificar se o login falha após a exclusão da conta
  test('9. Não deve permitir o login com uma conta deletada', async () => {
    const response = await api.post('/login', {
      email: userData.email,
      password: userData.password,
    });

    console.log('Resposta Login Pós-Exclusão:', response.data);
    expect(response.status).toBe(401); // Espera-se "Não autorizado"
    expect(response.data.message).toBe('Credenciais inválidas.');
  });
});
