const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db"); // conexão com banco

const app = express();

app.use(cors());
app.use(express.json());

// 👉 Servir os arquivos da pasta public (frontend)
app.use(express.static(path.join(__dirname, "public")));


// Buscar compromissos (filtrando por dia/mes/ano se vier na query)
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

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao buscar compromissos");
  }
});

// Criar compromisso
app.post("/compromissos", async (req, res) => {
  try {
    const { pessoa, descricao, hora, dia, mes, ano } = req.body;

    const result = await pool.query(
      "INSERT INTO compromissos (pessoa, descricao, hora, dia, mes, ano) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [pessoa, descricao, hora, dia, mes, ano]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao salvar compromisso");
  }
});

// Cancelar compromisso
app.delete("/compromissos", async (req, res) => {
  try {
    const { pessoa, hora, dia, mes, ano } = req.body;

    await pool.query(
      "DELETE FROM compromissos WHERE pessoa=$1 AND hora=$2 AND dia=$3 AND mes=$4 AND ano=$5",
      [pessoa, hora, dia, mes, ano]
    );

    res.send("Compromisso cancelado");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao excluir compromisso");
  }
});

// Qualquer rota que não for API → carrega o index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
