const os = require('os');
const childProcess = require('child_process');
const net = require('net');
const path = require('path');
const c = require('ansi-colors');
const {logAndDie} = require('../utils.js');

const colors = [
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
]

const services = {};

const getFreePort = () => {
  return new Promise((resolve, reject) =>{
    const srv = net.createServer(() => {});
    srv.on('error', reject);
    srv.listen(0, () => {
      resolve(srv.address().port);
      srv.close();
    });
  })
}

const stop = () => {
  Object.keys(services).forEach((name) => {
    console.log('killing all instances of service', name);
    services[name].map(({service}) => {
      if (service?.pid){
        console.log('PID killed:', service.pid);
        service.kill();
      }
    })
  });
}

const serviceMessagesStrategy = {
  loaded: ({service, port, index}) => service.send({name: 'start', data: {port, index}}),
  started: ({name, port}) => services['loadBalancer'][0].service.send({name: 'addUpstream', data: {name, port}})
}

const startService = async (name, index = Math.floor(Math.random()*10), shouldGetFreePort = false) => {
  const port = shouldGetFreePort && await getFreePort();
  const service = childProcess.fork(path.join(__dirname, `./${name}.js`), {stdio: 'pipe'});
  const onPort = shouldGetFreePort ? `on port ${port} ` : '';
  service
    .on('message', (data) => {
      console.log('message received from service', name, index, data);
      serviceMessagesStrategy[data.name]({name, service, port, index});
    })
    .on('error', console.error)
  service.stderr
    .on('data', (data) => {
      console.log(c[colors[index % colors.length]](`${name} --> ${onPort}${data}`));
    })
  service.stdout
    .setEncoding('utf8')
    .on('data', (data) => {
      console.log(c[colors[index % colors.length]](`${name} --> ${onPort}${data.substring(0, data.length-1)}`));
    })
    .on('error', (data) => {
      console.error(c[colors[index % colors.length]](`${name} on port ${port}: ${data.substring(0, data.length-1)}`));
    })
  return {service, port};
}

const startServiceMultiInstances = async (name, numberOfInstances) => {
  if (services[name]){
    throw Error(`Service with name ${name} already exists. Exiting`);    
  }
  services[name] = [];
  for (let index = 0; index < numberOfInstances; index++) {
    services[name].push(await startService(name, index, true));
  }
}
const startServiceSingleInstances = async (name) => {
  if (services[name]){
    throw Error(`Service with name ${name} already exists. Exiting`);    
  }
  services[name] = [];
  services[name].push(await startService(name));
}

const onUnhandledError = (err) => {
  stop();
  logAndDie(err);
}

process.on('uncaughtException', onUnhandledError);
process.on('unhandledRejection', onUnhandledError);
process.on('SIGINT', stop);

// Start Load Balancer
startServiceSingleInstances('loadBalancer');
// Start instances of service 1
// startServiceMultiInstances('service1', Math.floor(os.cpus().length))
startServiceMultiInstances('service1', 2)