require("dotenv").config();
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

    query += " ORDER BY hora, pessoa";

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
    console.log("Salvo:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao salvar compromisso");
  }
});

// Atualizar compromisso por id
app.put('/compromissos/:id', async (req, res) => {
  const { id } = req.params;
  const { descricao, pessoa, hora, dia, mes, ano } = req.body;

  try {
    const result = await pool.query(
      `UPDATE compromissos
       SET descricao = COALESCE($1, descricao),
           pessoa = COALESCE($2, pessoa),
           hora = COALESCE($3, hora),
           dia = COALESCE($4, dia),
           mes = COALESCE($5, mes),
           ano = COALESCE($6, ano)
       WHERE id = $7
       RETURNING *`,
      [descricao, pessoa, hora, dia, mes, ano, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Compromisso não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar compromisso:', err);
    res.status(500).json({ error: 'Erro ao atualizar compromisso' });
  }
});

 app.put("/compromissos", async (req, res) => {
  try {
    const { pessoa, hora, dia, mes, ano, descricao } = req.body;
    const result = await pool.query(
      `UPDATE compromissos
       SET descricao=$1
       WHERE pessoa=$2 AND hora=$3 AND dia=$4 AND mes=$5 AND ano=$6
       RETURNING *`,
      [descricao, pessoa, hora, dia, mes, ano]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Compromisso não encontrado");
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao editar compromisso");
  }
});

// (Opcional) deletar por id — mais robusto que deletar por combinação
app.delete('/compromissos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM compromissos WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).send('Não encontrado');
    res.sendStatus(204);
  } catch (err) {
    console.error('Erro ao excluir por id:', err);
    res.status(500).send('Erro ao excluir');
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
