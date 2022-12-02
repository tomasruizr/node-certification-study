const app = require('express')();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {getConfig} = require('../config.js');
const z = require('zod');
const configSchema = z.object({
  SERVICE1_PORT: z.string(),
  SERVICE1_UPLOAD_FOLDER: z.string()
})
const config = getConfig(configSchema);
const destFolder = path.join(__dirname, config.SERVICE1_UPLOAD_FOLDER);
const upload = multer({dest: destFolder})
let serverIndex;
let serverPort;

app.get('/healthcheck', (req, res) => {
  console.log('Processing GET /healthcheck')
  res.setHeader('x-custom-header', 'some value');
  res.send(`SERVICE 1, instance ${serverIndex} on port ${serverPort}. The current date is ${new Date().toISOString()}`)
})

app.post('/test', (req, res) => {
  console.log('Processing POST /healthcheck')
  res.send('ok');
})

app.post('/setFile', upload.single('file'), (req, res) => {
  console.log('Processing POST /setFile')
  const filePath = path.join(destFolder, req.file.originalname);
  if (fs.existsSync(filePath)){
    fs.unlinkSync(filePath)
  }
  fs.renameSync(req.file.path, filePath);
  res.send('ok');
})

app.get('/getFile/:file', (req, res) => {
  console.log('Processing GET /getFile')
  res.sendFile(`${path.resolve(destFolder)}/${req.params.file}`)
})

const commands = {
  start: ({port, index}) => {
    serverIndex = index;
    serverPort = port;
    app.listen(port, () => {
      console.log(`service1 listening on port ${port}`)
      process.send && process.send({name: 'started'})
    })
  }
}

console.log('Service1 initializing');
if (process.send){
  process.on('message', (message) => {
    commands[message.name](message.data);
  })
  process.send({name: 'loaded'})
} else {
  commands.start({port:Number(config.SERVICE1_PORT), index: 0})
}