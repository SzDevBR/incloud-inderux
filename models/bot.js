const mongoose = require('mongoose');

// Definindo o esquema do modelo
const botSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  token: { type: String, required: true },
  prefix: { type: String, required: true }
  // Outros campos que você precisa
});

// Criando o modelo a partir do esquema
const Bot = mongoose.model('Bot', botSchema);

module.exports = Bot;
