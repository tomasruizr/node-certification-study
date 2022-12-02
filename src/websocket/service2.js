const {createServer} = require('http');
const {getConfig} = require('../config.js');
const z = require('zod');
const { Server } = require('ws');
const crypto = require('crypto');
const configSchema = z.object({
  SERVICE2_PORT: z.string(),
  WEBSOCKET_UPGRADE_ROUTE: z.string(),
  WEBSOCKET_PING_INTERVAL_MS: z.string(),
})
const config = getConfig(configSchema);
const server = createServer();
const webSocketServer = new Server({ noServer: true });
const sockets = {};

server.on('upgrade', (request, socket, head) => {
  if (request.url !== config.WEBSOCKET_UPGRADE_ROUTE) {
    socket.destroy();
    console.warn('Attempt to upgrade to socket connection through route: ', request.url, 'which is not the configured upgrade route: ', config.WEBSOCKET_UPGRADE_ROUTE, '. The Socket was destroyed');
    return;
  }
  webSocketServer.handleUpgrade(request, socket, head, socketConnected );
})

const startPingInterval = (ws, interval) => {
  ws.on('pong', () => ws.isAlive = true)
  return setInterval(() => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  }, interval)
}

const operations = {
  broadcast: (name, senderId, _, message) => {
    console.log('broadcasting', message)
    Object.keys(sockets)
      .filter(id => id!==senderId)
      .forEach((id) => {
        sockets[id].ws.send(JSON.stringify({name, senderId, message}), (err)=>err && console.error(err))
      })
  },
  message: (name, senderId, receipientId, message) => {
    if (!sockets[receipientId]){
      console.warn(`no receipientId ${receipientId}`);
      return;
    }
    sockets[receipientId].ws.send(JSON.stringify({name, senderId, message}), (err)=>err && console.error(err))
  } 
}

const wsIncomingMessage = id => data => {
  data = data.toString();
  console.log('Received a Websocket incoming message: ', data);
  const message = JSON.parse(data);
  operations[message.name] && operations[message.name]('message', id, message.receipientId, message.data);
}

const socketConnected = (ws) =>  {
  const id = crypto.randomUUID().substring(0,7);
  console.log('Socket client connected with id: ', id);
  sockets[id] = {ws, pingInterval: startPingInterval(ws, config.WEBSOCKET_PING_INTERVAL_MS)};
  operations.broadcast('new_socket',id, null, id)
  ws.on('message', wsIncomingMessage(id));
  ws.on('close', () => {
    console.log('Socket client disconnected with id', id);
    delete sockets[id];
  })
}

const commands = {
  start: ({port, index}) => {
    serverIndex = index;
    serverPort = port;
    server.listen(port || undefined, () => {
      console.log(`service2 listening on port ${port}`)
      process.send && process.send({name: 'started'})
    })
  }
}

console.log('Service2 initializing');
if (process.send){
  process.on('message', (message) => {
    commands[message.name](message.data);
  })
  process.send({name: 'loaded'})
} else {
  commands.start({port:Number(config.SERVICE2_PORT), index: 0})
}