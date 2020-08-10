const PORT = process.env.PORT || 3000;
const path = require('path');
const http = require('http');
const express = require('express');
const enableWs = require('express-ws')

let  app = express()
//initialize a simple http server
// const server = http.createServer(app);
enableWs(app)

app.use(express.static(path.join(__dirname, 'public')));

// const WebSocket = require('ws');
// const wss = new WebSocket.Server({ server });

const formatMessage = require('./src/backend/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  getUserRoom
} = require('./src/backend/users');
const botName = 'ChatCord Bot';

/**
 * users = [
 *      {id: 'socketid', username:'user', room: '1', points: '0'}
 * ]
 */

/**
 * rooms = [
 *      //room 1
 *      [{user1}, {user2}, ...],
 *      //room 2
 *      [{user5}, {user6}, ...],
 * ]
 */
let rooms = []

/** 
 *  action types and message structure (cada mensaje que envie el cliente debe llevar la 
 *  siguiente estructura):
 *      1. join_room : action||username
 *      2. send_message : action||username||message
 *      3. disconnect : action||username
 *      4. receive_message : action||message
 */


// Run when client connects
// wss.on('connection', socket => {
app.ws('/', (ws, req) => {
    ws.on('message', function(message){
        msg = message.split("||")
        action = msg[0]
        switch(action){
            case 'join_room':
                // check if room has available space 
                let last_rm = rooms[rooms.length -1]
                if(!last_rm) {
                    const new_player = userJoin(ws, msg[1], rooms.length +1, 0)
                    rooms.push([new_player])
                }
                else if(last_rm.length < 4){
                    //has space 
                    const new_player = userJoin(ws, msg[1], rooms.length, 0)
                    last_rm.push(new_player)
                }
                else {
                    // room full, create new one
                    const new_player = userJoin(ws, msg[1], rooms.length +1, 0)
                    rooms.push([new_player])
                }
                // welcome user
                ws.send(['receive_message', formatMessage(botName, '¡Bienvenido!')].join("||"))
                // broadcast to all room users
                let room_plyrs = rooms[rooms.length -1]
                for(let i = 0; i < room_plyrs.length; i++){
                    let usr_socket = room_plyrs[i].id
                    usr_socket.send(['receive_message', formatMessage(botName, msg[1]+' se ha unido al chat.')].join("||"))
                }
            case 'send_message':
                let player_usr = msg[1]
                let message = msg[2]
                let room = getUserRoom(player_usr)
                for(let i = 0; i < rooms[room].length; i++){
                    let usr_socket = rooms[room][i].id
                    usr_socket.send(['receive_message', formatMessage(player_usr, message)].join("||"))
                }
            case 'disconnect':
                const user = userLeave(msg[1])
                // broadcast to all room users
                let room_usrs = rooms[user.room]
                for(let i = 0; i < room_usrs.length; i++){
                    let usr_socket = room_usrs[i].id
                    usr_socket.send(['receive_message', formatMessage(botName, msg[1]+' ha salido del chat.')].join("||"))
                }
        }

    })

});

app.listen(PORT, () => console.log(`Server running on ws://localhost:${PORT}`));
  