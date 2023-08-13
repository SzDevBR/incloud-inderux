const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

app.use(session({
  secret: 'seu_segredo_secreto',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.REDIRECT_URI,
  scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

app.get('/auth/login', passport.authenticate('discord'));

app.get('/auth/callback', passport.authenticate('discord', {
  failureRedirect: '/'
}), (req, res) => {
  res.redirect('/dashboard'); // Redirecionar para a página do dashboard após o login
});

app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/'); // Redirecionar para a página de login se não estiver autenticado
  }
  
  res.render('dashboard', { user: req.user }); // Renderizar a view do dashboard
});


app.get('/auth/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});


const BotSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  token: { type: String, required: true },
  prefix: { type: String, required: true },
  // Outros campos que você desejar armazenar
});

const Bot = mongoose.model('Bot', BotSchema);

module.exports = Bot;
const Bot = require('./models/bot'); // Importe o modelo definido anteriormente

app.post('/create-bot', async (req, res) => {
  try {
    const { userId, token, prefix } = req.body;

    // Crie uma instância do bot usando a biblioteca aoi.js
    const bot = new Aoijs.Bot({
      token: token,
      prefix: prefix
    });

    // Salve as informações do bot no banco de dados
    const newBot = new Bot({
      userId: userId,
      token: token,
      prefix: prefix
      // Preencha outros campos, se necessário
    });
    await newBot.save();

    // Inicie o bot
    bot.onMessage();

    // Responda ao usuário com sucesso
    res.status(200).json({ message: 'Bot criado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar o bot.' });
  }
});
app.get('/my-bot/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Recupere as informações do bot do banco de dados
    const bot = await Bot.findOne({ userId: userId });

    if (!bot) {
      return res.status(404).json({ message: 'Bot não encontrado.' });
    }

    // Crie uma instância do bot com as informações do banco de dados
    const aoiBot = new Aoijs.Bot({
      token: bot.token,
      prefix: bot.prefix
    });

    // Responda ao usuário com informações do bot ou execute outras ações
    res.status(200).json({ bot: aoiBot });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao recuperar informações do bot.' });
  }
});
