const express = require("express");
const { Issuer, Strategy } = require("openid-client");
const passport = require("passport");
const expressSession = require("express-session");
require("dotenv").config();
const app = express();

async function setup() {
  var checkAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/test");
  };

  // use the issuer url here
  const keycloakIssuer = await Issuer.discover(process.env.KEYCLOAK_URL);

  console.log(
    "Discovered issuer %s %O",
    keycloakIssuer.issuer,
    keycloakIssuer.metadata
  );
  const client = new keycloakIssuer.Client({
    client_id: process.env.KEYCLOAK_CLIENT_ID,
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
    redirect_uris: ["http://localhost:3000/callback"],
    post_logout_redirect_uris: ["http://localhost:3000/logout/callback"],
    response_types: ["code"],
  });

  var memoryStore = new expressSession.MemoryStore();
  app.use(
    expressSession({
      secret: "another_long_secret",
      resave: false,
      saveUninitialized: true,
      store: memoryStore,
    })
  );
  app.use(passport.initialize());
  app.use(passport.authenticate("session"));

  // this creates the strategy
  passport.use(
    "oidc",
    new Strategy({ client }, (tokenSet, userinfo, done) => {
      return done(null, tokenSet.claims());
    })
  );

  passport.serializeUser(function (user, done) {
    done(null, user);
  });
  passport.deserializeUser(function (user, done) {
    done(null, user);
  });

  app.get("/test", (req, res, next) => {
    passport.authenticate("oidc")(req, res, next);
  });

  // callback always routes to test
  app.get("/auth/callback", (req, res, next) => {
    passport.authenticate("oidc", {
      successRedirect: "/testauth",
      failureRedirect: "/",
    })(req, res, next);
  });

  app.get("/testauth", checkAuthenticated, (req, res) => {
    res.send("test");
  });

  app.get("/other", checkAuthenticated, (req, res) => {
    res.send("other");
  });

  //unprotected route
  app.get("/", function (req, res) {
    res.send("index");
  });

  app.get("/logout", (req, res) => {
    res.redirect(client.endSessionUrl());
  });

  // logout callback
  app.get("/logout/callback", (req, res) => {
    // clears the persisted user from the local storage
    req.logout();
    // redirects the user to a public route
    res.redirect("/");
  });

  app.listen(3000, (err) => {
    if (err) {
      console.error("Failed to start server:", err);
      return;
    }
    console.log("Server is running on port 3000");
  });
}

setup();
