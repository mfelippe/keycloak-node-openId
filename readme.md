# Integração Keycloak com MySQL e OpenID Connect

Este projeto demonstra uma integração de um sistema de autenticação usando Keycloak, OpenID Connect e MySQL para armazenar sessões de autenticação. A aplicação backend está estruturada em Node.js.

## Pré-requisitos

- Node.js
- Keycloak Server
- MySQL Server

## Configuração do Ambiente

1. Configure o Keycloak e crie um `realm`.
2. Crie um cliente no Keycloak e obtenha o `client_id` e o `client_secret`.
3. Crie uma tabela no MySQL para armazenar os estados e nonces.

## Estrutura da Tabela MySQL

```sql
CREATE TABLE `keycloak` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `state` VARCHAR(255) NOT NULL,
  `nonce` VARCHAR(255) NOT NULL,
  `state_token` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`)
);
```

## Configuração do Projeto

Defina as variáveis de ambiente no arquivo `.env`:

```bash
DB_HOST=
DB_USER=
DB_PASS=
DB_DATABASE=
KEYCLOAK_URL=
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=

```

## Executando o projeto

Para iniciar o projeto, instale as dependências com `npm install` e então execute o comando `node server.js`. A aplicação será iniciada no endereço http://localhost:3000.

### Rota de login

A rota `/login` inicia o processo de autenticação:

1. Gera um state e nonce para proteção contra ataques CSRF e para garantir a integridade da autenticação.
2. Cria um JWT (stateToken) que encapsula o state e nonce.
3. Insere os valores no banco de dados junto com o tempo de expiração.
4. Redireciona o usuário para a URL de autorização do Keycloak

### Rota de Callback

A rota `/callback` processa a resposta do Keycloak:

1. Valida o código de autenticação recebido contra o state e nonce armazenados.
2. Troca o código por um tokenSet que inclui o access_token e o id_token.
3. Utiliza o tokenSet para acessar informações protegidas ou para estabelecer uma sessão de usuário.

### Problemas Comuns

`ECONNREFUSED` pode ocorrer se o Keycloak ou o MySQL Server não estiverem em execução ou não forem acessíveis na URL configurada.

### Contribuições

Contribuições para o projeto são bem-vindas. Para contribuir, por favor, crie um fork do repositório, faça suas alterações e envie um pull request

### Plus

implementação usando `express-session` no `plus.js` seguinto esse [tutorial]('https://medium.com/keycloak/keycloak-express-openid-client-fabea857f11f').
