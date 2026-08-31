require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

// Buscar compromissos
app.get("/compromissos", async (req, res) => {
  try {
    const { dia, mes, ano } = req.query;
    let query = "SELECT * FROM compromissos WHERE 1=1";
    let values = [];

    if (dia) {
      values.push(dia);
      query += ` AND dia = $${values.length}`;
    }
    if (mes) {
      values.push(mes);
      query += ` AND mes = $${values.length}`;
    }
    if (ano) {
      values.push(ano);
      query += ` AND ano = $${values.length}`;
    }

    query += " ORDER BY hora, pessoa";

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao buscar compromissos");
  }
});

// Criar compromisso (retorna o ID criado)
app.post("/compromissos", async (req, res) => {
  try {
    const { pessoa, descricao, hora, dia, mes, ano } = req.body;

    const result = await pool.query(
      "INSERT INTO compromissos (pessoa, descricao, hora, dia, mes, ano) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [pessoa, descricao, hora, dia, mes, ano]
    );
    console.log("Salvo:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao salvar compromisso");
  }
});

app.delete("/compromissos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM compromissos WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Compromisso não encontrado."
      });
    }
    return res.status(200).json({
      sucesso: true,
      mensagem: "Compromisso cancelado com sucesso!",
      idExcluido: id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao excluir compromisso"
    });
  }
});

// Atualizar compromisso
app.put("/compromissos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao } = req.body;

    const result = await pool.query(
      "UPDATE compromissos SET descricao = $1 WHERE id = $2 RETURNING *",
      [descricao, id]
    );

    console.log("Atualizado:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao atualizar compromisso");
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});