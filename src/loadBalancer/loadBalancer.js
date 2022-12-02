const app = require('express')();
const cors = require('cors');
const helmet = require('helmet');
const {getConfig} = require('../config.js');
const z = require('zod');
const fs = require('fs');
const yaml = require('js-yaml');
const http = require('http');
const path = require('path');

const configSchema = z.object({
  LOAD_BALANCER_PORT: z.string(),
  LOAD_BALANCER_CONFIG_FILE: z.string()
})

const config = getConfig(configSchema);//?
const definitionsYaml = fs.readFileSync(path.join(__dirname, config.LOAD_BALANCER_CONFIG_FILE))
const definitions = yaml.load(definitionsYaml);//?

app.use(cors());
app.use(helmet());

Object.keys(definitions.endpoints).map((route) => {
  const upstream = definitions.endpoints[route]
  definitions.upstream[upstream].ports ||= [];
  let roundRobinState = 0;
  app.use(route, (req, res) => {
    if (!definitions.upstream[upstream].ports.length) throw Error(`Upstream ${upstream} has no ports up`);
    const numberOfInstances = definitions.upstream[upstream].ports.length;
    const initialTime = new Date().valueOf();
    let status;
    const protocol = definitions.upstream[upstream].protocol;
    const host = definitions.upstream[upstream].host;
    const port = definitions.upstream[upstream].ports[roundRobinState % numberOfInstances];
    const instance = `${protocol}://${host}:${port}`;
    
    const request = http.request({
      method: req.method,
      host,
      port,
      path: req.originalUrl,
      headers: req.headers
    },
    (response) => {
      Object.entries(response.headers).map(
        ([key, value]) => res.setHeader(key, value)
      )
      response.pipe(res);
      status = response.statusCode;
    })
      .on('error', console.error)
      .on('close', (x) => {
        const finalTime = new Date().valueOf();
        console.log(`routed ${req.method} ${req.originalUrl} to ${instance}${req.originalUrl} with status ${status} in ${finalTime - initialTime}ms`);
      });
      
    if (['POST', 'PUT', 'PATCH'].includes(req.method)){
      req.pipe(request)
        .on('finish', () => console.log('finish'))
        .on('end', () => console.log('end'))
        .on('drain', () => console.log('drain'))
    } else {
      request.end();
    }
    roundRobinState++;
  })

})


const commands = {
  start: () => {
    app.listen(Number(config.LOAD_BALANCER_PORT), () => {
      console.log(`Load Balancer listening on port ${config.LOAD_BALANCER_PORT}`)
    })
  },
  addUpstream: ({name, port}) => {
    definitions.upstream[name].ports ||= [];
    definitions.upstream[name].ports.push(port);
    console.log(`instance added for service ${name}`, `${definitions.upstream[name].host}:${port}`);
  }
}

console.log('Load Balancer initializing');
process.on('uncaughtException', (err) => {
  console.error(err);
})
process.on('message', (message) => {
  commands[message.name](message.data);
})
process.send({name: 'loaded'})