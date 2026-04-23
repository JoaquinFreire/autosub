import "./config.js";
import { generatePublication1Image, getPublicationExample } from "./services/publication1.js";
import fs from "fs";

const PREFIXES = ["$", "/", ".", "#"];
const GROUP_POWER_PASSWORD = "Joa2302";
const GROUP_POWER_STATE_FILE = "./group-power-state.json";
const IMAGE_TYPES = {
  1: "promo",
  2: "frase",
  3: "anuncio",
};
const publication1Sessions = new Map();
const groupPowerState = loadGroupPowerState();

function loadGroupPowerState() {
  try {
    if (!fs.existsSync(GROUP_POWER_STATE_FILE)) {
      return {};
    }

    const raw = fs.readFileSync(GROUP_POWER_STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveGroupPowerState() {
  fs.writeFileSync(GROUP_POWER_STATE_FILE, JSON.stringify(groupPowerState, null, 2));
}

function isGroupChat(m) {
  return String(m?.key?.remoteJid || "").endsWith("@g.us");
}

function isGroupEnabled(chatId) {
  return groupPowerState[chatId] === true;
}

function setGroupEnabled(chatId, enabled) {
  groupPowerState[chatId] = Boolean(enabled);
  saveGroupPowerState();
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage?.message) return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage?.message) return unwrapMessage(message.viewOnceMessage.message);
  if (message.documentWithCaptionMessage?.message) {
    return unwrapMessage(message.documentWithCaptionMessage.message);
  }

  return message;
}

function extractText(message = {}) {
  const content = unwrapMessage(message);

  if (content.conversation) return content.conversation;
  if (content.extendedTextMessage?.text) return content.extendedTextMessage.text;
  if (content.imageMessage?.caption) return content.imageMessage.caption;
  if (content.videoMessage?.caption) return content.videoMessage.caption;
  if (content.buttonsResponseMessage?.selectedButtonId) {
    return content.buttonsResponseMessage.selectedButtonId;
  }
  if (content.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return content.listResponseMessage.singleSelectReply.selectedRowId;
  }

  return "";
}

function normalizeSender(conn, m) {
  if (m.key?.fromMe) return conn.user?.id || "";
  return m.key?.participant || m.key?.remoteJid || "";
}

function normalizeInput(text = "") {
  return String(text || "").trim();
}

function normalizeLooseText(text = "") {
  return normalizeInput(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function compactCommandKey(text = "") {
  return normalizeLooseText(text).replace(/[^a-z0-9]/g, "");
}

function getCommandInfo(text = "") {
  const trimmed = normalizeInput(text);
  const withoutPrefix = trimmed.replace(/^[./#!#\s]+/, "");
  const firstChunk = withoutPrefix.split(/\s+/)[0] || "";
  const compactWhole = compactCommandKey(trimmed);
  const compactFirst = compactCommandKey(firstChunk);

  return {
    compactWhole,
    compactFirst,
  };
}

function isBlankInput(text = "") {
  const value = normalizeLooseText(text);
  return !value || ["-", "ninguno", "ninguna", "vacio", "no", "."].includes(value);
}

function buildMenu(prefix = "$") {
  return [
    "Bot conectado y escuchando.",
    "",
    "Comandos disponibles:",
    `${prefix}botprender Joa2302`,
    `${prefix}botapagar Joa2302`,
    `${prefix}ping`,
    `${prefix}menu`,
    `${prefix}imagen 1|2|3 tu texto`,
    `${prefix}publicacion1`,
    `${prefix}pubejemplo1`,
    `${prefix}pubejemplo2`,
    `${prefix}pubejemplo3`,
    "",
    "Publicacion1 soporta 3 moldes visuales.",
  ].join("\n");
}

function getSessionKey(m) {
  return `${m.key?.remoteJid || ""}|${m.key?.participant || ""}|${m.key?.fromMe ? "me" : "user"}`;
}

function startPublication1Session(sessionKey) {
  publication1Sessions.set(sessionKey, {
    step: "form",
    data: {
      type: "",
      title: "",
      subtitle: "",
      paragraph1: "",
      paragraph2: "",
      item1: "",
      item2: "",
      item3: "",
      item4: "",
      quote: "",
      signature: "",
    },
  });
}

function buildPublication1Prompt(step) {
  switch (step) {
    case "form":
      return [
        "Enviame la publicacion en uno de estos formatos:",
        "",
        "Tipo: 1",
        "Titulo: Landing Page",
        "Subtitulo: Texto breve o -",
        "",
        "Tipo: 2",
        "Titulo: Beneficios clave",
        "item1: Texto corto",
        "item2: Texto corto",
        "item3: Texto corto",
        "item4: Opcional",
        "",
        "Tipo: 3",
        "Cita: Texto de la cita",
        "Firma: Nombre corto",
        "",
        "Compatibilidad anterior:",
        "parrafo1 y parrafo2 tambien se aceptan.",
        "",
        "Si un campo opcional no lleva nada, escribe -",
      ].join("\n");
    default:
      return "";
  }
}

function parsePublication1Fields(text = "") {
  const result = {
    type: "",
    title: "",
    subtitle: "",
    paragraph1: "",
    paragraph2: "",
    item1: "",
    item2: "",
    item3: "",
    item4: "",
    quote: "",
    signature: "",
  };

  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(
      /^(tipo|molde|titulo|title|subtitulo|subtitle|parrafo1|p[aá]rrafo1|parrafo2|p[aá]rrafo2|item1|item2|item3|item4|cita|texto_cita|firma)\s*:\s*(.*)$/i,
    );
    if (!match) continue;

    const rawKey = normalizeLooseText(match[1]);
    const value = match[2]?.trim() || "";

    if (rawKey === "tipo" || rawKey === "molde") result.type = value;
    if (rawKey === "titulo" || rawKey === "title") result.title = value;
    if (rawKey === "subtitulo" || rawKey === "subtitle") result.subtitle = value;
    if (rawKey === "parrafo1") result.paragraph1 = value;
    if (rawKey === "parrafo2") result.paragraph2 = value;
    if (rawKey === "item1") result.item1 = value;
    if (rawKey === "item2") result.item2 = value;
    if (rawKey === "item3") result.item3 = value;
    if (rawKey === "item4") result.item4 = value;
    if (rawKey === "cita" || rawKey === "textocita") result.quote = value;
    if (rawKey === "firma") result.signature = value;
  }

  return result;
}

function inferPublicationType(data) {
  const explicit = Number(data.type);
  if ([1, 2, 3].includes(explicit)) return explicit;
  if (data.quote || data.signature) return 3;
  if (data.item1 || data.item2 || data.item3) return 2;
  return 1;
}

function isPublication1Trigger(text = "") {
  const info = getCommandInfo(text);
  return info.compactFirst === "publicacion1" || info.compactWhole === "publicacion1";
}

async function sendPublicationExample(conn, m, type) {
  const example = getPublicationExample(type);
  const result = await generatePublication1Image(example);

  await conn.sendMessage(
    m.key.remoteJid,
    {
      image: result.buffer,
      caption: [`Ejemplo de publicacion ${result.type}.`, "", result.hashtags].join("\n"),
    },
    { quoted: m },
  );
}

async function handlePublication1Flow(conn, m, text) {
  const sessionKey = getSessionKey(m);
  const session = publication1Sessions.get(sessionKey);
  if (!session) return false;

  if (/^[$./#!]/.test(text) && !isPublication1Trigger(text)) {
    publication1Sessions.delete(sessionKey);
    await reply(conn, m, "Se cancelo la carga de la publicacion actual porque llego otro comando.");
    return false;
  }

  if (session.step !== "form") {
    publication1Sessions.delete(sessionKey);
    return false;
  }

  const parsed = parsePublication1Fields(text);
  session.data.type = normalizeInput(parsed.type);
  session.data.title = normalizeInput(parsed.title);
  session.data.subtitle = isBlankInput(parsed.subtitle) ? "" : normalizeInput(parsed.subtitle);
  session.data.paragraph1 = isBlankInput(parsed.paragraph1) ? "" : normalizeInput(parsed.paragraph1);
  session.data.paragraph2 = isBlankInput(parsed.paragraph2) ? "" : normalizeInput(parsed.paragraph2);
  session.data.item1 = isBlankInput(parsed.item1) ? "" : normalizeInput(parsed.item1);
  session.data.item2 = isBlankInput(parsed.item2) ? "" : normalizeInput(parsed.item2);
  session.data.item3 = isBlankInput(parsed.item3) ? "" : normalizeInput(parsed.item3);
  session.data.item4 = isBlankInput(parsed.item4) ? "" : normalizeInput(parsed.item4);
  session.data.quote = isBlankInput(parsed.quote) ? "" : normalizeInput(parsed.quote);
  session.data.signature = isBlankInput(parsed.signature) ? "" : normalizeInput(parsed.signature);

  const inferredType = inferPublicationType(session.data);
  const items = [
    session.data.item1,
    session.data.item2,
    session.data.item3,
    session.data.item4,
  ].filter(Boolean);

  if (inferredType === 1 && !session.data.title) {
    await reply(
      conn,
      m,
      [
        "Faltan datos obligatorios para el molde 1.",
        "Necesito al menos Titulo.",
        "",
        buildPublication1Prompt("form"),
      ].join("\n"),
    );
    return true;
  }

  if (inferredType === 2 && (!session.data.title || items.length < 3)) {
    await reply(
      conn,
      m,
      [
        "Faltan datos obligatorios para el molde 2.",
        "Necesito Titulo y al menos item1, item2, item3.",
        "",
        buildPublication1Prompt("form"),
      ].join("\n"),
    );
    return true;
  }

  if (inferredType === 3 && ((!session.data.quote && !session.data.paragraph1) || (!session.data.signature && !session.data.paragraph2))) {
    await reply(
      conn,
      m,
      [
        "Faltan datos obligatorios para el molde 3.",
        "Necesito Cita y Firma.",
        "",
        buildPublication1Prompt("form"),
      ].join("\n"),
    );
    return true;
  }

  publication1Sessions.delete(sessionKey);

  await reply(conn, m, "Estoy armando la pieza visual...");
  const result = await generatePublication1Image({
    type: inferredType,
    title: session.data.title,
    subtitle: session.data.subtitle || session.data.paragraph1,
    items,
    quote: session.data.quote || session.data.paragraph1,
    signature: session.data.signature || session.data.paragraph2,
  });

  await conn.sendMessage(
    m.key.remoteJid,
    {
      image: result.buffer,
      caption: [`Publicacion lista. Molde ${result.type}.`, "", result.hashtags].join("\n"),
    },
    { quoted: m },
  );
  return true;
}

function buildImageStub(type, prompt) {
  const selectedType = IMAGE_TYPES[type];
  if (!selectedType) return "Usa /imagen 1|2|3 tu texto";
  if (!prompt) return `Falta el texto. Ejemplo: /imagen ${type} Oferta de invierno`;

  return [
    `Pedido recibido para imagen tipo ${type} (${selectedType}).`,
    `Texto: ${prompt}`,
    "",
    "La generacion de imagen todavia no esta implementada.",
    "El bot ya quedo listo para recibir este comando cuando conectemos el motor de imagenes.",
  ].join("\n");
}

async function reply(conn, m, text) {
  if (!text) return;
  await conn.sendMessage(m.key.remoteJid, { text }, { quoted: m });
}

export async function handler(conn, m) {
  if (!m?.message || !m.key?.remoteJid) return;

  const text = extractText(m.message).trim();
  if (!text) return;

  m.sender = normalizeSender(conn, m).replace(/:\d+/, "");
  m.chat = m.key.remoteJid;

  if (await handlePublication1Flow(conn, m, text)) {
    return;
  }

  const usedPrefix = PREFIXES.find((prefix) => text.trimStart().startsWith(prefix)) || "";
  const normalized = usedPrefix ? text.trimStart().slice(usedPrefix.length).trim() : text;
  const [rawCommand = "", ...rest] = normalized.split(/\s+/);
  const compactCommand = compactCommandKey(rawCommand);
  const wholeInfo = getCommandInfo(text);
  const commandArgText = rest.join(" ").trim();
  const groupChat = isGroupChat(m);
  const groupEnabled = groupChat ? isGroupEnabled(m.chat) : true;

  if (!usedPrefix) {
    if (/^(hola|buenas|menu|men[uú])$/i.test(text)) {
      if (!groupChat || groupEnabled) {
        await reply(conn, m, buildMenu("$"));
      }
    }
    return;
  }

  if (compactCommand === "botprender") {
    if (!groupChat) {
      await reply(conn, m, "Este comando es para grupos.");
      return;
    }

    if (commandArgText !== GROUP_POWER_PASSWORD) {
      await reply(conn, m, "Clave incorrecta. El bot sigue apagado en este grupo.");
      return;
    }

    setGroupEnabled(m.chat, true);
    await reply(conn, m, "Bot prendido en este grupo.");
    return;
  }

  if (compactCommand === "botapagar") {
    if (!groupChat) {
      await reply(conn, m, "Este comando es para grupos.");
      return;
    }

    if (commandArgText !== GROUP_POWER_PASSWORD) {
      await reply(conn, m, "Clave incorrecta. No apague el bot en este grupo.");
      return;
    }

    setGroupEnabled(m.chat, false);
    await reply(conn, m, "Bot apagado en este grupo.");
    return;
  }

  if (groupChat && !groupEnabled) {
    return;
  }

  if (compactCommand === "ping") {
    await reply(conn, m, "pong");
    return;
  }

  if (compactCommand === "menu" || compactCommand === "help") {
    await reply(conn, m, buildMenu(usedPrefix));
    return;
  }

  if (compactCommand === "publicacion1" || wholeInfo.compactWhole === "publicacion1") {
    const sessionKey = getSessionKey(m);
    startPublication1Session(sessionKey);
    await reply(conn, m, buildPublication1Prompt("form"));
    return;
  }

  if (compactCommand === "pubejemplo1") {
    await reply(conn, m, "Te mando un ejemplo del molde 1...");
    await sendPublicationExample(conn, m, 1);
    return;
  }

  if (compactCommand === "pubejemplo2") {
    await reply(conn, m, "Te mando un ejemplo del molde 2...");
    await sendPublicationExample(conn, m, 2);
    return;
  }

  if (compactCommand === "pubejemplo3") {
    await reply(conn, m, "Te mando un ejemplo del molde 3...");
    await sendPublicationExample(conn, m, 3);
    return;
  }

  if (compactCommand === "imagen") {
    const [type, ...promptParts] = rest;
    await reply(conn, m, buildImageStub(type, promptParts.join(" ").trim()));
    return;
  }

  await reply(conn, m, `No reconozco el comando: ${usedPrefix}${rawCommand}\nPrueba con ${usedPrefix}menu`);
}

export async function participantsUpdate() {}

export async function groupsUpdate() {}

export async function callUpdate() {}
