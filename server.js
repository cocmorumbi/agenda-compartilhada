// server.js
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json()); // aceita JSON vindo do frontend

// Rota para salvar compromisso
app.post("/compromissos", async (req, res) => {
  const { pessoa, descricao, hora, dia, mes, ano } = req.body;
  try {
    await pool.query(
      "INSERT INTO compromissos (pessoa, descricao, hora, dia, mes, ano) VALUES ($1, $2, $3, $4, $5, $6)",
      [pessoa, descricao, hora, dia, mes, ano]
    );
    res.status(200).send("Salvo com sucesso");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao salvar");
  }
});

// Rota para buscar compromissos de um mês
app.get("/compromissos", async (req, res) => {
  const { mes, ano } = req.query;
  try {
    const result = await pool.query(
      "SELECT * FROM compromissos WHERE mes = $1 AND ano = $2",
      [mes, ano]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao buscar");
  }
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
