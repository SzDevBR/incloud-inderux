const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord');
const dotenv = require('dotenv');
dotenv.config();
const crypto = require('crypto')
const Bot = require('./models/bot'); // Importe o modelo Bot
const dbd = require("dbd.js")


const path = require('path');

// Configuração da conexão com o MongoDB
const mongoURL = process.env.MONGODB_URL; // Certifique-se de definir a variável de ambiente MONGO_URL
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

mongoose.connect(mongoURL, mongooseOptions)
  .then(() => {
    console.log('Conexão com o MongoDB estabelecida com sucesso.');
  })
  .catch((error) => {
    console.error('Erro ao conectar ao MongoDB:', error);
  });


const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const SESSION_SECRET = process.env.SESSION_SECRET || generateSessionSecret();


app.use(session({
  secret: SESSION_SECRET,
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

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

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
  failureRedirect: '/' // Redirecionar em caso de falha
}), (req, res) => {
  res.redirect('/dashboard'); // Redirecionar para a página do dashboard após o login
});

app.get('/dashboard', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }
  
  try {
    const userId = req.user.id; // Supondo que você tenha uma propriedade 'id' no objeto 'user'
    const bot = await Bot.findOne({ userId: userId }); // Recupere as informações do bot do banco de dados
    
    res.render('dashboard', { user: req.user, bot: bot }); // Passe 'bot' para a visualização
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar a página de dashboard.');
  }
});

app.get('/', (req, res) => {
  res.render('index'); // Renderiza a visualização index.ejs
});

app.get('/auth/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});




app.get('/create-bot', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/'); // Redirecionar para a página de login se não estiver autenticado
  }

  res.render('create-bot'); // Renderize a página de criação de bot
});


app.post('/create-bot', async (req, res) => {
  try {
    const { userId, token, prefix } = req.body;

    // Crie um novo bot usando aoi.js
    const botInstance = new Aoijs.Bot({
      token: bot.token, // Use o token do bot
      prefix: bot.prefix || defaultPrefix // Use o prefixo do bot ou o prefixo padrão
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
    botInstance.onMessage();

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
// Rota para exibir o formulário de criação de comandos
app.get('/create-command', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/'); // Redirecionar para a página de login se não estiver autenticado
  }

  res.render('create-command'); // Renderize a página de criação de comandos
});

// Rota para processar o formulário de criação de comandos
app.post('/create-command', async (req, res) => {
  try {
    const { botId, name, description, content } = req.body;

    // Salvar os detalhes do novo comando no banco de dados
    const newCommand = new Command({
      botId: botId,
      name: name,
      description: description,
      content: content
    });
    await newCommand.save();

    // Redirecionar de volta para a página de dashboard ou outra página
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao criar o comando.');
  }
});
// Rota para exibir o formulário de edição de comandos
app.get('/edit-command/:commandId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/'); // Redirecionar para a página de login se não estiver autenticado
  }

  const commandId = req.params.commandId;

  try {
    // Recuperar os detalhes do comando do banco de dados
    const command = await Command.findById(commandId);

    if (!command) {
      return res.redirect('/dashboard'); // Redirecionar se o comando não foi encontrado
    }

    res.render('edit-command', { command: command }); // Renderizar a página de edição de comandos
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar a página de edição.');
  }
});

// Rota para processar o formulário de edição de comandos
app.post('/edit-command/:commandId', async (req, res) => {
  const commandId = req.params.commandId;

  try {
    // Atualizar os detalhes do comando no banco de dados
    await Command.findByIdAndUpdate(commandId, {
      name: req.body.name,
      description: req.body.description,
      content: req.body.content
    });

    // Redirecionar de volta para a página de dashboard ou outra página
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao atualizar o comando.');
  }
});
// Rota para exibir a página de confirmação de remoção de comando
app.get('/confirm-remove-command/:commandId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/'); // Redirecionar para a página de login se não estiver autenticado
  }

  const commandId = req.params.commandId;

  try {
    // Recuperar os detalhes do comando do banco de dados
    const command = await Command.findById(commandId);

    if (!command) {
      return res.redirect('/dashboard'); // Redirecionar se o comando não foi encontrado
    }

    res.render('confirm-remove-command', { command: command }); // Renderizar a página de confirmação de remoção
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar a página de confirmação de remoção.');
  }
});

// Rota para processar a remoção de um comando
app.post('/remove-command/:commandId', async (req, res) => {
  const commandId = req.params.commandId;

  try {
    // Remover o comando do banco de dados
    await Command.findByIdAndRemove(commandId);

    // Redirecionar de volta para a página de dashboard ou outra página
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao remover o comando.');
  }
});

// Rota para exibir o formulário de criação de variáveis
app.get('/create-variable', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/'); // Redirecionar para a página de login se não estiver autenticado
  }

  res.render('create-variable'); // Renderize a página de criação de variáveis
});

// Rota para processar o formulário de criação de variáveis
app.post('/create-variable', async (req, res) => {
  try {
    const { botId, name, value } = req.body;

    // Salvar os detalhes da nova variável no banco de dados
    const newVariable = new Variable({
      botId: botId,
      name: name,
      value: value
    });
    await newVariable.save();

    // Redirecionar de volta para a página de dashboard ou outra página
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao criar a variável.');
  }
});
// Rota para remover uma variável
app.post('/remove-variable/:variableId', async (req, res) => {
  const variableId = req.params.variableId;

  try {
    // Remover a variável do banco de dados
    await Variable.findByIdAndRemove(variableId);

    // Redirecionar de volta para a página de dashboard ou outra página
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao remover a variável.');
  }
});
const { Aoijs } = require("dbd.js");

// Rota para iniciar a aplicação do bot
app.get('/start-bot/:botId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/'); // Redirecionar para a página de login se não estiver autenticado
  }

  const botId = req.params.botId;

  try {
    // Recuperar os detalhes do bot do banco de dados
    const bot = await Bot.findById(botId);

    if (!bot) {
      return res.redirect('/dashboard'); // Redirecionar se o bot não foi encontrado
    }

    // Crie um novo bot usando aoi.js
    const botInstance = new Aoijs.Bot({
      token: bot.token, // Use o token do bot
      prefix: bot.prefix // Use o prefixo do bot
    });

    // Evento para verificar quando o bot está online
botInstance.onMessage()

botInstance.on("ready", () => {
  isBotOnline = true;
  console.log("Bot está online!");
});

// Evento para verificar quando o bot está offline
botInstance.on("shardDisconnect", (shardID, code, reason) => {
  isBotOnline = false;
  console.log(`Bot está offline. Razão: ${reason}`);
});

// Verifique o estado do bot em intervalos regulares
setInterval(() => {
  // Verifique se o bot está online usando a variável isBotOnline
  console.log(`O bot está ${isBotOnline ? 'online' : 'offline'}`);
}, 60000); // Verifique a cada minuto

    // Recuperar os comandos associados a esse bot do banco de dados
    const commands = await Command.find({ botId: botId });

    // Adicionar os comandos ao bot
    commands.forEach(command => {
      botInstance.command({
        name: command.name,
        code: command.code
      });
    });

    // Iniciar o bot
    await botInstance.start();

    // Redirecionar de volta para a página de dashboard ou outra página
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao iniciar o bot.');
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});


