// db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: "teu_usuario",
  host: "localhost",
  database: "teu_banco",
  password: "tua_senha",
  port: 5432,
});

module.exports = pool;
