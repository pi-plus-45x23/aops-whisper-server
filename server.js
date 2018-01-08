/* jshint esversion:6 */

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
.use((req, res) => res.sendFile(INDEX) )
.listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(server);

var sockets = {};
var user_id = {};

io.on('connection', socket => {

  socket.on('login', (username, userId, sessionId, server) => {
    var eiosocket = require('engine.io-client')(server);
    eiosocket.on('open', function() {
      eiosocket.send(JSON.stringify({
        action: 'login',
        'session-id': sessionId,
        'user-id': '' + userId,
        flash: false,
        javascript: true,
        client: 'Engine.io'
      }));
      eiosocket.on('message', function(data) {
        var payload = JSON.parse(data);
        if (payload.action === 'login-response') {
          onLogin();
        } else if (payload.action === 'error-event') {
          socket.emit('err', 'Invalid Login');
        }
        eiosocket.close();
      });
    });
    function onLogin() {
      socket.emit('valid login');
      if (!sockets[username.toLowerCase()])
        sockets[username.toLowerCase()] = [];
      sockets[username.toLowerCase()].push(socket);
      user_id[username.toLowerCase()] = userId;
      socket.join(userId);
      socket.on('disconnect', () => {
        for (let i=0; i<sockets[username.toLowerCase()].length; i++) {
          if (sockets[username.toLowerCase()][i].id === socket.id) {
            sockets[username.toLowerCase()].splice(i, 1);
            break;
          }
        }
      });
      socket.on('whisper', (target, message, room, plus) => {
        if (user_id[target.toLowerCase()] && sockets[target.toLowerCase()].length)
          socket.to(user_id[target.toLowerCase()]).emit('whisper', username, message, room, plus);
        else
          socket.emit('err', 'User <b>' + target + '</b> is not online.');
      });
      socket.on('gwhisper', (target, message) => {
        if (user_id[target.toLowerCase()] && sockets[target.toLowerCase()].length)
          socket.to(user_id[target.toLowerCase()]).emit('gwhisper', username, message);
        else
          socket.emit('err', 'User <b>' + target + '</b> is not online.');
      });
      socket.on('private start', (target, room_id, plus) => {
        if (user_id[target.toLowerCase()] && sockets[target.toLowerCase()].length)
          io.to(user_id[target.toLowerCase()]).emit('private start', username, userId, room_id, plus);
        else
          socket.emit('err', 'User <b>' + target + '</b> is not online.');
      });
      socket.on('private ack', (target, room_id, plus) => {
        if (user_id[target.toLowerCase()])
          socket.to(user_id[target.toLowerCase()]).emit('private ack', username, userId, room_id, plus);
      });
      socket.on('private end', (target, room_id) => {
        if (user_id[target.toLowerCase()])
          socket.to(user_id[target.toLowerCase()]).emit('private end', userId);
      });
      socket.on('private send', (target, message, room_id, latex) => {
        if (user_id[target.toLowerCase()] && sockets[target.toLowerCase()].length) {
          socket.to(user_id[target.toLowerCase()]).emit('private send', userId, message, username, userId, room_id, latex);
          io.to(userId).emit('private send', user_id[target.toLowerCase()], message, username, userId, room_id, latex);
        } else
          socket.emit('err', 'User <b>' + target + '</b> is not online.');
      });
      socket.on('private typing', target => {
        if (user_id[target.toLowerCase()])
          io.to(user_id[target.toLowerCase()]).emit('private typing', username, userId);
      });
    }
  });
});
