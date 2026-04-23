import * as baileys from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import readlineSync from "readline-sync";
import pino from "pino";
import NodeCache from "node-cache";
import "./config.js";
import { handler, callUpdate, participantsUpdate, groupsUpdate } from "./handler.js";

const BOT_SESSION_FOLDER = "./BotSession";
const BOT_CREDS_PATH = path.join(BOT_SESSION_FOLDER, "creds.json");
const HANG_TIMEOUT_MS = 8 * 60 * 1000;
const OPEN_TIMEOUT_MS = 45 * 1000;
const BACKLOG_FILTER_WINDOW_MS = 20 * 1000;
const BACKLOG_GRACE_MS = 3 * 1000;

if (!fs.existsSync(BOT_SESSION_FOLDER)) {
  fs.mkdirSync(BOT_SESSION_FOLDER, { recursive: true });
}

let usarCodigo = false;
let numero = "";
let spamCount = 0;

setInterval(() => {
  spamCount = 0;
}, 60 * 1000);

const origError = console.error;
console.error = (...args) => {
  if (args[0]?.toString().includes("Closing stale open session")) {
    spamCount++;
    if (spamCount > 50) {
      console.log("Detectado loop de sesiones, reiniciando bot...");
      process.exit(1);
    }
  }

  origError(...args);
};

main();

async function main() {
  const hayCredenciales = fs.existsSync(BOT_CREDS_PATH);

  if (!hayCredenciales) {
    const opcion = readlineSync.question(
      [
        "Metodo de vinculacion",
        "1. Codigo QR",
        "2. Codigo de 8 digitos",
        "Elige una opcion: ",
      ].join("\n"),
    );

    usarCodigo = opcion === "2";

    if (usarCodigo) {
      numero = readlineSync
        .question("Ingresa tu numero con codigo de pais: ")
        .replace(/[^0-9]/g, "");
    }
  }

  await startBot();
}

async function startBot() {
  let lastSocketActivity = Date.now();
  let connectionOpened = false;
  let connectionOpenedAt = 0;

  const { state, saveCreds } = await baileys.useMultiFileAuthState(BOT_SESSION_FOLDER);
  const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
  const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
  const groupCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
  const { version } = await baileys.fetchLatestBaileysVersion();

  const sock = baileys.makeWASocket({
    printQRInTerminal: !usarCodigo && !fs.existsSync(BOT_CREDS_PATH),
    logger: pino({ level: "silent" }),
    browser: ["Windows", "Chrome"],
    auth: {
      creds: state.creds,
      keys: baileys.makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    emitOwnEvents: true,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    getMessage: async () => "",
    msgRetryCounterCache,
    userDevicesCache,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
    version,
    defaultQueryTimeoutMs: 30_000,
    keepAliveIntervalMs: 55_000,
  });

  const touchSocketActivity = () => {
    lastSocketActivity = Date.now();
  };

  const watchdog = setInterval(() => {
    if (!connectionOpened) return;

    if (Date.now() - lastSocketActivity > HANG_TIMEOUT_MS) {
      console.log(chalk.yellow("Sin actividad del socket. Reiniciando bot..."));
      process.exit(1);
    }
  }, 60_000);

  const openTimeout = setTimeout(() => {
    if (!connectionOpened) {
      console.log(chalk.yellow("La conexion no termino de abrir a tiempo. Reiniciando..."));
      try {
        sock.end(new Error("open timeout"));
      } catch {
        process.exit(1);
      }
    }
  }, OPEN_TIMEOUT_MS);

  globalThis.conn = sock;
  setupGroupEvents(sock);

  sock.ev.on("creds.update", () => {
    touchSocketActivity();
    return saveCreds();
  });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    touchSocketActivity();

    const code = lastDisconnect?.error?.output?.statusCode || 0;
    if (connection) {
      console.log(`[CONN] state=${connection} code=${code}`);
    }

    if (connection === "open") {
      connectionOpened = true;
      connectionOpenedAt = Date.now();
      clearTimeout(openTimeout);
      console.log(chalk.green("WhatsApp conectado correctamente."));
    }

    if (connection === "close") {
      connectionOpened = false;
      connectionOpenedAt = 0;
      clearTimeout(openTimeout);
      clearInterval(watchdog);

      if ([401, 440, 428, 405].includes(code)) {
        console.log(
          chalk.red(`Sesion invalida (${code}). Borra la carpeta "BotSession" y vuelve a vincular.`),
        );
      }

      console.log(chalk.yellow("Conexion cerrada. Reintentando en 3 segundos..."));
      setTimeout(() => startBot(), 3000);
    }
  });

  process.on("uncaughtException", console.error);
  process.on("unhandledRejection", console.error);

  if (usarCodigo && !state.creds.registered && numero) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(numero);
        console.log(chalk.yellow("Codigo de emparejamiento:"), chalk.greenBright(code));
      } catch (error) {
        console.error("No se pudo pedir el codigo de emparejamiento.", error);
      }
    }, 2000);
  }

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    touchSocketActivity();
    console.log(`[UPSERT] type=${type} count=${messages?.length || 0}`);

    for (const msg of messages) {
      if (!msg.message) continue;

      const rawTimestamp = Number(msg.messageTimestamp || 0);
      const normalizedTimestampSeconds =
        rawTimestamp > 1e12 ? Math.floor(rawTimestamp / 1000) : rawTimestamp;
      const messageTimestampMs = normalizedTimestampSeconds
        ? normalizedTimestampSeconds * 1000
        : 0;
      const backlogFilterActive =
        connectionOpenedAt > 0 && (Date.now() - connectionOpenedAt) < BACKLOG_FILTER_WINDOW_MS;
      const backlogCutoffMs = connectionOpenedAt > 0 ? connectionOpenedAt - BACKLOG_GRACE_MS : 0;

      if (backlogFilterActive && messageTimestampMs && messageTimestampMs < backlogCutoffMs) {
        continue;
      }

      if (rawTimestamp && Date.now() / 1000 - rawTimestamp > 86400) {
        continue;
      }

      try {
        await handler(sock, msg);
      } catch (error) {
        console.error("Error procesando mensaje:", error);
      }
    }
  });

  sock.ev.on("call", async (calls) => {
    try {
      touchSocketActivity();
      for (const call of calls) {
        await callUpdate(sock, call);
      }
    } catch (error) {
      console.error("Error procesando llamada:", error);
    }
  });

  setInterval(() => {
    const tmp = "./tmp";

    try {
      if (!fs.existsSync(tmp)) return;

      for (const file of fs.readdirSync(tmp)) {
        const filePath = path.join(tmp, file);
        const stats = fs.statSync(filePath);
        const age = Date.now() - new Date(stats.mtime).getTime();

        if (age > 3 * 60 * 1000) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error("Error limpiando tmp:", error);
    }
  }, 30 * 1000);
}

function setupGroupEvents(sock) {
  sock.ev.on("group-participants.update", async (update) => {
    try {
      await participantsUpdate(sock, update);
    } catch (error) {
      console.error("Error en group-participants.update:", error);
    }
  });

  sock.ev.on("groups.update", async (updates) => {
    try {
      for (const update of updates) {
        await groupsUpdate(sock, update);
      }
    } catch (error) {
      console.error("Error en groups.update:", error);
    }
  });
}
