const express = require("express");
const jwt = require("jsonwebtoken");
const { Issuer, generators } = require("openid-client");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
const port = 3000;

const keycloakIssuerUrl = process.env.KEYCLOAK_URL;
let client;

const JWT_SECRET = "seuSuperSegredo";
const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
};

// Crie uma conexão de pool do MySQL
const pool = mysql.createPool(DB_CONFIG);

(async () => {
  const keycloakIssuer = await Issuer.discover(keycloakIssuerUrl);
  client = new keycloakIssuer.Client({
    client_id: process.env.KEYCLOAK_CLIENT_ID,
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
    redirect_uris: ["http://localhost:3000/callback"],
    post_logout_redirect_uris: ["http://localhost:3000/logout/callback"],
    response_types: ["code"],
  });
})();

app.get("/login", async (req, res) => {
  const state = generators.state();
  const nonce = generators.nonce();

  const jwtPayload = { state, nonce };
  const stateToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: "10m" });

  const expiresAt = new Date(Date.now() + 10 * 60000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  // Insira o estado no banco de dados MySQL
  const [result] = await pool.query(
    "INSERT INTO keycloak (state, nonce, state_token, expires_at) VALUES (?, ?, ?, ?)",
    [state, nonce, stateToken, expiresAt]
  );

  const authorizationUrl = client.authorizationUrl({
    scope: "openid email profile",
    state: state,
    nonce: nonce,
  });

  res.redirect(authorizationUrl);
});

app.get("/callback", async (req, res) => {
  const { state } = req.query;

  // Recupere o estado do banco de dados MySQL
  const [rows] = await pool.query("SELECT * FROM keycloak WHERE state = ?", [
    state,
  ]);
  const oauthState = rows[0];

  if (!oauthState) {
    return res.status(400).json({ message: "O token ausente ou expirado." });
  }

  // Verifique se o stateToken é válido
  try {
    jwt.verify(oauthState.state_token, JWT_SECRET);
  } catch (err) {
    return res.status(400).send("token inválido.");
  }

  const params = client.callbackParams(req);
  try {
    const tokenSet = await client.callback(
      "http://localhost:3000/callback",
      params,
      {
        state: oauthState.state,
        nonce: oauthState.nonce,
      }
    );

    const id_token = jwt.decode(tokenSet.id_token);

    
     await pool.query("DELETE FROM keycloak WHERE state = ?", [state]);

    res.status(200).json({
      message: "Você está autenticado!",
      user: id_token.preferred_username,
    });
  } catch (err) {
    res.status(500).send("Falha na autenticação: " + err.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
