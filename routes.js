const express = require('express');
const router = express.Router();
const db = require('./db');

// Criar um compromisso
router.post('/compromissos', async (req, res) => {
  const { pessoa, hora, dia, descricao } = req.body;
  try {
    await db.query(
      'INSERT INTO compromissos (pessoa, hora, dia, descricao) VALUES ($1, $2, $3, $4)',
      [pessoa, hora, dia, descricao]
    );
    res.status(201).send('Compromisso criado!');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Listar compromissos do dia
router.get('/compromissos/:dia', async (req, res) => {
  const { dia } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM compromissos WHERE dia = $1 ORDER BY hora',
      [dia]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
