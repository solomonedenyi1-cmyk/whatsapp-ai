const EventEmitter = require('node:events');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

class BaileysClient extends EventEmitter {
  constructor({ sessionPath, logger }) {
    super();

    this.sessionPath = sessionPath;
    this.logger = logger;

    this.sock = null;
    this.saveCreds = null;

    this.isReady = false;
  }

  async initialize() {
    const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
    this.saveCreds = saveCreds;

    this.sock = makeWASocket({
      auth: state,
      logger: this.logger,
      printQRInTerminal: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      markOnlineOnConnect: true,
      emitOwnEvents: false,
    });

    this.sock.ev.on('creds.update', this.saveCreds);

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.emit('qr', qr);
      }

      if (connection === 'open') {
        this.isReady = true;
        this.emit('authenticated');
        this.emit('ready');
      }

      if (connection === 'close') {
        this.isReady = false;

        const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        this.emit('disconnected', {
          loggedOut,
          statusCode,
          error: lastDisconnect?.error,
        });

        if (!loggedOut) {
          this.initialize().catch((error) => {
            this.emit('error', error);
          });
        }
      }
    });

    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      try {
        if (!Array.isArray(messages) || messages.length === 0) {
          return;
        }

        for (const rawMessage of messages) {
          const normalized = this.createNormalizedMessage(rawMessage);
          if (!normalized) {
            continue;
          }

          this.emit('message', normalized);
        }
      } catch (error) {
        this.emit('error', error);
      }
    });
  }

  async destroy() {
    try {
      if (this.sock) {
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('messages.upsert');

        this.sock.end();
        this.sock = null;
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  async sendMessage(chatId, content, options = {}) {
    if (!this.sock) {
      throw new Error('Baileys socket not initialized');
    }

    if (typeof content === 'string') {
      return this.sock.sendMessage(chatId, { text: content }, options);
    }

    return this.sock.sendMessage(chatId, content, options);
  }

  createNormalizedMessage(rawMessage) {
    if (!rawMessage || !rawMessage.key || !rawMessage.key.remoteJid) {
      return null;
    }

    const jid = rawMessage.key.remoteJid;

    const text =
      rawMessage.message?.conversation ||
      rawMessage.message?.extendedTextMessage?.text ||
      rawMessage.message?.imageMessage?.caption ||
      rawMessage.message?.videoMessage?.caption ||
      '';

    const hasAudio = Boolean(rawMessage.message?.audioMessage);
    const type = hasAudio ? (rawMessage.message?.audioMessage?.ptt ? 'ptt' : 'audio') : 'chat';

    const message = {
      _raw: rawMessage,
      _jid: jid,
      _key: rawMessage.key,

      fromMe: Boolean(rawMessage.key.fromMe),
      from: jid,
      type,
      body: text,
      hasMedia: hasAudio,

      getChat: async () => {
        return this.createNormalizedChat({ jid, rawMessage });
      },

      reply: async (replyText) => {
        await this.sendMessage(jid, { text: replyText }, { quoted: rawMessage });
      },

      getContact: async () => {
        return { id: { _serialized: jid } };
      },

      downloadMedia: async () => {
        if (!hasAudio) {
          return null;
        }

        const buffer = await downloadMediaMessage(rawMessage, 'buffer', {}, { logger: this.logger });
        const mimetype = rawMessage.message?.audioMessage?.mimetype || 'audio/ogg';

        return {
          mimetype,
          data: Buffer.from(buffer).toString('base64'),
          filename: 'audio.ogg',
        };
      },
    };

    return message;
  }

  createNormalizedChat({ jid, rawMessage }) {
    return {
      id: { _serialized: jid },

      sendSeen: async () => {
        if (!this.sock) {
          return;
        }

        if (rawMessage?.key) {
          await this.sock.readMessages([rawMessage.key]);
        }
      },

      sendStateTyping: async () => {
        if (!this.sock) {
          return;
        }

        await this.sock.sendPresenceUpdate('composing', jid);
      },

      sendMessage: async (payload, options = {}) => {
        if (typeof payload === 'string') {
          await this.sendMessage(jid, { text: payload }, options);
          return;
        }

        if (payload && typeof payload === 'object' && typeof payload.mimetype === 'string' && typeof payload.data === 'string') {
          const buffer = Buffer.from(payload.data, 'base64');

          if (payload.mimetype.startsWith('audio/')) {
            await this.sendMessage(
              jid,
              {
                audio: buffer,
                mimetype: payload.mimetype,
                ptt: Boolean(options.sendAudioAsVoice),
              },
              options
            );
            return;
          }

          await this.sendMessage(
            jid,
            {
              document: buffer,
              mimetype: payload.mimetype,
              fileName: payload.filename || 'file',
            },
            options
          );
          return;
        }

        throw new Error('Unsupported payload type for Baileys chat.sendMessage');
      },
    };
  }
}

module.exports = BaileysClient;
