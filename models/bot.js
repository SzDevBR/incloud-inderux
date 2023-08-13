const mongoose = require('mongoose');

const BotSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  token: { type: String, required: true },
  prefix: { type: String, required: true },
  // Outros campos que você desejar armazenar
});

module.exports = mongoose.model('Bot', BotSchema);
