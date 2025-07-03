// lib/SimpleWebSocketServer.js
const { Buffer } = require("buffer");
const crypto = require("crypto");

class SimpleWebSocketServer {
  constructor(httpServer) {
    this.clients = new Map();

    // upgrade
    httpServer.on("upgrade", (request, socket, _) => {
      const key = request.headers["sec-websocket-key"];
      if (!key) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
        socket.destroy();
        return;
      }

      // Accept-Key
      const acceptKey = crypto
        .createHash("sha1")
        .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
        .digest("base64");

      // responce
      const responseHeaders = [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${acceptKey}`,
        "\r\n",
      ].join("\r\n");

      socket.write(responseHeaders);

      // client id (use Set?)
      const clientId = crypto.randomBytes(16).toString("hex");
      this.clients.set(clientId, {
        socket,
        buffer: Buffer.alloc(0),
      });

      console.log(`Client added. Clients total: ${this.clients.size}`);

      socket.on("data", (data) => {
        this.handleMessage(clientId, data);
      });

      socket.on("close", () => {
        this.clients.delete(clientId);
        console.log(`Client removed. Clients total: ${this.clients.size}`);
      });
    });
  }

  handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { socket, buffer } = client;
    const newData = Buffer.concat([buffer, data]);

    let offset = 0;

    while (offset < newData.length) {
      if (newData.length - offset < 2) break; // not enough data

      const firstByte = newData[offset++];
      const secondByte = newData[offset++];

      const fin = (firstByte & 0x80) !== 0;
      const opcode = firstByte & 0x0f;
      const mask = (secondByte & 0x80) !== 0;
      let payloadLength = secondByte & 0x7f;

      if (payloadLength === 126) {
        if (newData.length - offset < 2) break;
        payloadLength = newData.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLength === 127) {
        if (newData.length - offset < 8) break;
        offset += 4; // ignore 4 bytes
        payloadLength = newData.readUInt32BE(offset);
        offset += 4;
      }

      if (mask) {
        if (newData.length - offset < 4) break;
        // const maskingKey = newData.slice(offset, offset + 4);
        const maskingKey = newData.subarray(offset, offset + 4);
        offset += 4;

        if (newData.length - offset < payloadLength) break;

        // const payload = newData.slice(offset, offset + payloadLength);
        const payload = newData.subarray(offset, offset + payloadLength);
        offset += payloadLength;

        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskingKey[i % 4];
        }

        if (opcode === 0x1) {
          // Text frame
          const message = payload.toString("utf8");
          console.log(
            `Message recieved: ${Buffer.from(message, "utf8").toString()}`,
          );
          // this.broadcast(message, socket);
        } else if (opcode === 0x8) {
          // Close
          socket.end();
        }
      } else {
        console.warn("Unmasked message.");
        socket.end();
      }

      // client.buffer = newData.slice(offset);
      client.buffer = newData.subarray(offset);
    }
  }

  send(socket, message) {
    const payload = Buffer.from(message, "utf8");
    const length = payload.length;
    const header = [];

    header.push(0x81); // FIN + Text

    if (length <= 125) {
      header.push(length);
    } else if (length <= 65535) {
      header.push(126, length >> 8, length & 0xff);
    } else {
      header.push(
        127,
        0,
        0,
        0,
        0,
        (length >> 24) & 0xff,
        (length >> 16) & 0xff,
        (length >> 8) & 0xff,
        length & 0xff,
      );
    }

    const headerBuffer = Buffer.from(header);
    const frame = Buffer.concat([headerBuffer, payload]);

    socket.write(frame);
  }

  broadcast(message, excludeSocket = null) {
    for (const client of this.clients.values()) {
      if (client.socket !== excludeSocket) {
        this.send(client.socket, message);
      }
    }
    console.log(`Message broadcasted to ${this.clients.size} clients`);
  }

  close() {
    this.clients.forEach((client) => {
      client.socket.destroy();
    });
    this.clients.clear();
    console.log("All ws connections are closed");
  }
}

module.exports = SimpleWebSocketServer;
