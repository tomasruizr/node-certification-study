const ws = new WebSocket('ws://localhost:2222/socket-connect');

ws.addEventListener('open', function open() {
  console.log('Connection open');
});

ws.addEventListener('message', function message(message) {
  console.log('received:', message.data);
  const data = JSON.parse(message.data);
  const textarea = document.getElementById('textarea');
  if (data.name === 'new_socket'){
    textarea.value += `New Client: ${data.message} \n`;
  }
  if (data.name === 'message'){
    textarea.value += `${data.senderId}: ${data.message} \n`;
  }
});

const btn = document.getElementById('send');

btn.addEventListener('click', function handleClick() {
  const message = document.getElementById('message');
  const recipient = document.getElementById('recipient');
  console.log('sending:', message.value);
  ws.send(JSON.stringify({name: recipient.value ? 'message' : 'broadcast', receipientId: recipient.value || undefined,  data: message.value}));
});