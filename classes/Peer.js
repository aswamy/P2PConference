function Peer(id, name, socket) {
    this.id = id;
    this.socket = socket;
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

    this.removeRoom = function(id) {
        delete this.rooms[id];
    };

    this.addRoomCaster = function(roomId, casterId, name, socket) {
        return this.addRoomPeer(roomId, casterId, true, name, socket);
    };

    this.removeRoomCaster = function(roomId, casterId) {
        var casterCount = this.removeRoomPeer(roomId, casterId, true);
        if(casterCount == 0) this.removeRoom(roomId);
        return casterCount;
    };

    this.addRoomWatcher = function(roomId, watcherId, name, socket) {
        return this.addRoomPeer(roomId, watcherId, false, name, socket);
    };

    this.removeRoomWatcher = function(roomId, watcherId) {
        return this.removeRoomPeer(roomId, watcherId, false);
    };

    this.addRoomPeer = function(roomId, peerId, isCaster, name, socket) {
        var peerRole = this.getPeerRole(isCaster);

        this.rooms[roomId][peerRole][peerId] = new Peer(peerId, name, socket);
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