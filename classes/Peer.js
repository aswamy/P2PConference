function Peer(id, name) {
    this.id = id;
    this.name = name;
}

function Room(id, pwd) {
    this.id = id;
    this.pwd = pwd;

    this.casters = {};
    this.watchers = {};
}

function RoomMap() {
    this.rooms = {};

    this.addRoom = function(id, pwd) {
        this.rooms[id] = new Room(id, pwd);
    };

    this.roomExists = function(id) {
        return this.rooms[id] == undefined ? false : true;
    };

    this.removeRoom = function(id) {
        delete this.rooms[id];
    };

    this.addRoomCaster = function(roomId, casterId, name) {
        return this.addRoomPeer(roomId, casterId, true, name);
    };

    this.removeRoomCaster = function(roomId, casterId) {
        return this.removeRoomPeer(roomId, casterId, true);
    };

    this.addRoomWatcher = function(roomId, watcherId, name) {
        return this.addRoomPeer(roomId, watcherId, false, name);
    };

    this.removeRoomWatcher = function(roomId, watcherId) {
        return this.removeRoomPeer(roomId, watcherId, false);
    };

    this.addRoomPeer = function(roomId, peerId, isCaster, name) {
        var peerRole = this.getPeerRole(isCaster);

        this.rooms[roomId][peerRole][peerId] = new Peer(peerId, name);
        return Object.keys(this.rooms[roomId][peerRole]).length;
    };

    this.removeRoomPeer = function(roomId, casterId, isCaster) {
        var peerRole = this.getPeerRole(isCaster);

        delete this.rooms[roomId][peerRole][casterId];
        return Object.keys(this.rooms[roomId][peerRole]).length;
    };

    this.getPeerRole = function(isCaster) {
        return isCaster ? "casters" : "watchers";
    }
}

module.exports = RoomMap;