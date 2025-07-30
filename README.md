# Rethink Bank - Análise de Testes E2E e Relatório de Bugs

Este repositório contém os testes end-to-end automatizados para a API do Rethink Bank. 

## Como Executar os Testes

Para executar a suíte de testes em seu ambiente local, siga os passos abaixo:

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/andrealcantaraleite/teste-rethink.git
    cd teste-rethink
    ```

2.  **Instale as dependências necessárias:**
    ```bash
    npm install
    ```

3.  **Configure o script de teste no `package.json`:**
    ```json
    "scripts": {
      "test": "jest --verbose"
    }
    ```

4.  **Execute os testes:**
    ```bash
    npm test
    ```

## Análise e Relatório de Bugs (Baseado na Execução Real)

A execução dos testes revelou **3 falhas críticas de funcionamento e segurança**.

### a- Há bugs? Se sim, quais são e quais são os cenários esperados?

**Sim, conforme abaixo.**

---

#### **Bug 1: Depósito na "Caixinha" falha silenciosamente**

* **Descrição:** Este é o bug mais enganoso. O endpoint `POST /caixinha/deposit` retorna status `200 OK` com a mensagem `"Depósito na caixinha realizado."`, levando o usuário a acreditar que a operação foi um sucesso. No entanto, **nenhuma alteração é feita no banco de dados**. O saldo da caixinha (`piggy_bank_balance`) permanece inalterado e o valor não é debitado do saldo principal (`normal_balance`).
* **Evidência no Log:**
    * O teste 6 (`Depositar pontos na caixinha`) passa, pois recebe status 200.
    * O teste 7 (`Verificar o saldo geral`) falha. O log mostra: `Resposta Saldo: { normal_balance: 100, piggy_bank_balance: 0 }`. O saldo da caixinha esperado era `30`.
* **Comportamento Esperado:**
    O endpoint só deveria retornar `200 OK` após a transação ser efetivamente confirmada no banco de dados. O saldo deveria ser atualizado para `normal_balance: 70` e `piggy_bank_balance: 30` (considerando um saldo inicial de 100).

---

#### **Bug 2: Login é permitido após a conta ser "excluída"**

* **Descrição:** Um usuário que solicitou a exclusão de sua conta (`DELETE /account`) consegue realizar o login normalmente e obter um novo token de sessão. A funcionalidade de "soft delete" é ineficaz, pois não impede o acesso à conta.
* **Evidência no Log:**
    * O teste 9 (`Não deve permitir o login com uma conta deletada`) falha.
    * Log: `Expected: 401, Received: 200`. A API retornou sucesso em vez de "Não Autorizado".
* **Comportamento Esperado:**
    Após a exclusão, qualquer tentativa de login com aquelas credenciais deveria resultar em um erro `401 Unauthorized` com a mensagem `"Credenciais inválidas."` ou similar.

---

#### **Bug 3: Login é permitido sem a confirmação de e-mail**

* **Descrição:** A jornada do usuário pode ser completada sem a verificação do e-mail, o que representa um risco de segurança para a criação de contas fraudulentas ou com dados incorretos.
* **Evidência no Log:**
    * Não há uma falha de teste para este caso, mas a lógica do fluxo permite a vulnerabilidade.
* **Comportamento Esperado:**
    O endpoint `POST /login` deveria verificar o status de confirmação do e-mail e retornar `401 Unauthorized` caso o e-mail ainda não tenha sido validado.

### b- Se houver bugs, classifique-os em nível de criticidade.

1.  **Depósito na Caixinha Falha Silenciosamente (Bug 1):**
    * **Criticidade: CRÍTICO (Critical) / BLOQUEADOR (Blocker)**
    * **Justificativa:** Este é o pior tipo de bug. Ele quebra a confiança do usuário ao mentir sobre o resultado de uma operação. O usuário acredita que seus pontos estão guardados, mas eles não estão. Isso leva à perda de dados e destrói a credibilidade do sistema.

2.  **Login Após Exclusão da Conta (Bug 2):**
    * **Criticidade: CRÍTICO (Critical)**
    * **Justificativa:** É uma falha de segurança grave. Anula completamente a funcionalidade de exclusão de conta, expondo os dados e o saldo de um usuário que explicitamente pediu para sair da plataforma.

3.  **Login Sem Confirmação de E-mail (Bug 4):**
    * **Criticidade: MÉDIO (Medium)**
    * **Justificativa:** Falha de segurança que facilita a criação de contas falsas, spam e dificulta a recuperação de conta e comunicação com o usuário.


### c- Diante do cenário, o sistema está pronto para subir em produção?

**Não. Absolutamente não.**

A conclusão: o sistema **não tem a menor condição de ser lançado em produção**.

Os bugs Críticos/Bloqueadores (1 e 2) são impeditivos totais. Um sistema que não garante a integridade das transações e a segurança do acesso do usuário é fundamentalmente falho. Lançar a API neste estado seria irresponsável e levaria a problemas graves e imediatos.

**Recomendação:** **Parar qualquer plano de deploy.** A equipe de desenvolvimento precisa focar na correção dos bugs 1 e 2 como prioridade máxima. Após a correção, uma nova e completa rodada de testes de regressão é obrigatória.
