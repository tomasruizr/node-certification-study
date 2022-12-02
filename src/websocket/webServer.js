const express = require('express');
const app = express();
const {getConfig} = require('../config.js');
const z = require('zod');
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')))

app.get('/test', (req, res) => {
  res.send('ok');
})

const configSchema = z.object({
  WEB_SERVER_PORT: z.string()
})

const config = getConfig(configSchema);

const commands = {
  start: () => {
    app.listen(Number(config.WEB_SERVER_PORT), () => {
      console.log(`WebService listening on port ${config.WEB_SERVER_PORT}`)
      process.send && process.send({name: 'started'})
    })
  }
}

console.log('WebServer initializing');
if (process.send){
  process.on('message', (message) => {
    commands[message.name](message.data);
  })
  process.send({name: 'loaded'})
} else {
  commands.start({port:Number(config.WEB_SERVER_PORT), index: 0})
}