import sharp from "sharp";

const WIDTH = 1080;
const HEIGHT = 1350;
const BG = "#FAF1E9";
const ORANGE = "#FF6600";
const BLACK = "#000000";
const GRAY = "#444444";
const CHARCOAL = "#222222";
const WHITE = "#FFFFFF";

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeOptional(value = "") {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";
  if (["-", "ninguno", "ninguna", "vacio", "vacío", "no", "."].includes(cleaned.toLowerCase())) {
    return "";
  }

  return cleaned;
}

function clampWords(text = "", maxWords = 10) {
  return String(text || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}

function wrapText(text, maxCharsPerLine) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function renderTextBlock(lines, options) {
  const { x, y, fontSize, lineHeight, color, weight = 400, anchor = "start" } = options;

  return lines
    .map((line, index) => {
      const lineY = y + index * lineHeight;
      return `<text x="${x}" y="${lineY}" fill="${color}" font-size="${fontSize}" font-weight="${weight}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>`;
    })
    .join("");
}

function buildLogoMark({ x, y, scale = 1, dark = false }) {
  const s = scale;
  const braceColor = dark ? BLACK : ORANGE;
  const vColor = dark ? ORANGE : BLACK;
  return `
    <g transform="translate(${x}, ${y}) scale(${s})">
      <text x="0" y="46" fill="${braceColor}" font-size="54" font-weight="700" font-family="Arial, Helvetica, sans-serif">{</text>
      <text x="24" y="42" fill="${vColor}" font-size="40" font-weight="800" font-family="Arial, Helvetica, sans-serif">v</text>
      <text x="42" y="46" fill="${braceColor}" font-size="54" font-weight="700" font-family="Arial, Helvetica, sans-serif">}</text>
    </g>
  `;
}

function buildLogoHeader({ x = 92, y = 108, centered = false }) {
  const groupX = centered ? WIDTH / 2 - 170 : x;
  const textAnchor = centered ? "middle" : "start";
  const textX = centered ? WIDTH / 2 + 18 : x + 88;

  return `
    <g>
      ${buildLogoMark({ x: groupX, y: y - 42, scale: 1 })}
      <text x="${textX}" y="${y - 2}" fill="${BLACK}" font-size="29" font-weight="700" text-anchor="${textAnchor}" font-family="Arial, Helvetica, sans-serif">Variable Web</text>
    </g>
  `;
}

function buildFooter() {
  return `<text x="92" y="1270" fill="${GRAY}" font-size="26" font-weight="400" font-family="Arial, Helvetica, sans-serif">@variableswebs</text>`;
}

function buildTemplateNumber(type) {
  return `<text x="970" y="108" fill="${GRAY}" font-size="28" font-weight="500" text-anchor="end" font-family="Arial, Helvetica, sans-serif">${type}</text>`;
}

function buildHashtags(type, payload) {
  const tags = ["#VariableWeb", "#DisenoWeb", "#MarketingDigital"];

  if (type === 1) tags.push("#LandingPage", "#WebDesign", "#Conversion");
  if (type === 2) tags.push("#UXUI", "#BrandingDigital", "#ServiciosWeb");
  if (type === 3) tags.push("#Testimonio", "#MarcaDigital", "#AgenciaCreativa");

  const source = Object.values(payload).join(" ").toLowerCase();
  if (source.includes("landing")) tags.push("#LandingPage");
  if (source.includes("ventas")) tags.push("#VentasOnline");
  if (source.includes("web")) tags.push("#SitioWeb");

  return [...new Set(tags)].slice(0, 7).join(" ");
}

function inferType(input) {
  const numeric = Number(input.type);
  if ([1, 2, 3].includes(numeric)) return numeric;
  if (input.quote || input.signature) return 3;
  if (input.items?.length >= 3) return 2;
  return 1;
}

function buildBaseBackground(extra = "") {
  return `
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}" />
    <circle cx="930" cy="180" r="120" fill="#FFF4EC" />
    <circle cx="150" cy="1180" r="95" fill="#FFF8F1" />
    ${extra}
    ${buildFooter()}
  `;
}

function selectHeadlineLayout(title) {
  const cleanTitle = clampWords(title, 7);
  if (cleanTitle.length <= 14) {
    return {
      lines: wrapText(cleanTitle, 18).slice(0, 2),
      fontSize: 86,
      lineHeight: 94,
    };
  }

  if (cleanTitle.length <= 24) {
    return {
      lines: wrapText(cleanTitle, 14).slice(0, 3),
      fontSize: 74,
      lineHeight: 84,
    };
  }

  return {
    lines: wrapText(cleanTitle, 12).slice(0, 4),
    fontSize: 66,
    lineHeight: 76,
  };
}

function selectSubtitleLayout(subtitle) {
  const cleanSubtitle = clampWords(subtitle || "", 15);
  if (!cleanSubtitle) return { lines: [], fontSize: 0, lineHeight: 0 };
  if (cleanSubtitle.length <= 32) {
    return {
      lines: wrapText(cleanSubtitle, 34).slice(0, 2),
      fontSize: 38,
      lineHeight: 48,
    };
  }

  return {
    lines: wrapText(cleanSubtitle, 28).slice(0, 3),
    fontSize: 34,
    lineHeight: 44,
  };
}

function buildVariationA({ title, subtitle }) {
  const headline = selectHeadlineLayout(title);
  const sub = selectSubtitleLayout(subtitle);
  const cardX = 140;
  const cardY = 250;
  const cardW = 800;
  const cardH = 760;
  const titleStartY = 495 - Math.max(headline.lines.length - 1, 0) * 34;
  const subtitleStartY = titleStartY + headline.lines.length * headline.lineHeight + 44;

  return `
    ${buildBaseBackground()}
    ${buildLogoHeader({ x: 92, y: 108 })}
    ${buildTemplateNumber(1)}
    <rect x="${cardX + 10}" y="${cardY + 18}" rx="34" ry="34" width="${cardW}" height="${cardH}" fill="#E8DDD4" opacity="0.45" />
    <rect x="${cardX}" y="${cardY}" rx="34" ry="34" width="${cardW}" height="${cardH}" fill="${WHITE}" />
    ${renderTextBlock(headline.lines, {
      x: WIDTH / 2,
      y: titleStartY,
      fontSize: headline.fontSize,
      lineHeight: headline.lineHeight,
      color: ORANGE,
      weight: 800,
      anchor: "middle",
    })}
    ${sub.lines.length
      ? renderTextBlock(sub.lines, {
          x: WIDTH / 2,
          y: subtitleStartY,
          fontSize: sub.fontSize,
          lineHeight: sub.lineHeight,
          color: GRAY,
          weight: 500,
          anchor: "middle",
        })
      : ""}
  `;
}

function buildVariationB({ title, items }) {
  const safeItems = items.slice(0, 3).map((item) => clampWords(item, 10));
  const headline = title.length <= 18
    ? { lines: wrapText(clampWords(title, 7), 18).slice(0, 2), fontSize: 60, lineHeight: 68 }
    : { lines: wrapText(clampWords(title, 7), 16).slice(0, 3), fontSize: 54, lineHeight: 62 };
  const descriptionSource = items[3] || "Diseno claro, estructura precisa y foco en conversion.";
  const descriptionLines = wrapText(clampWords(descriptionSource, 15), 34).slice(0, 2);
  const cardX = 120;
  const cardY = 220;
  const cardW = 840;
  const cardH = 900;
  const iconBoxX = 170;
  const iconBoxY = 320;
  const iconBoxSize = 150;
  const titleX = 390;
  const titleY = 380;
  const descriptionY = titleY + headline.lines.length * headline.lineHeight + 24;
  const listStartY = 650;

  return `
    ${buildBaseBackground()}
    ${buildLogoHeader({ x: 92, y: 108 })}
    ${buildTemplateNumber(2)}
    <rect x="${cardX + 12}" y="${cardY + 20}" rx="38" ry="38" width="${cardW}" height="${cardH}" fill="#E9DDD3" opacity="0.48" />
    <rect x="${cardX}" y="${cardY}" rx="38" ry="38" width="${cardW}" height="${cardH}" fill="${WHITE}" />
    <rect x="${iconBoxX}" y="${iconBoxY}" rx="34" ry="34" width="${iconBoxSize}" height="${iconBoxSize}" fill="#FFF1E8" />
    <path d="M218 392 L258 432 L332 352" fill="none" stroke="${ORANGE}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
    ${renderTextBlock(headline.lines, {
      x: titleX,
      y: titleY,
      fontSize: headline.fontSize,
      lineHeight: headline.lineHeight,
      color: BLACK,
      weight: 800,
    })}
    ${renderTextBlock(descriptionLines, {
      x: titleX,
      y: descriptionY,
      fontSize: 32,
      lineHeight: 42,
      color: GRAY,
      weight: 500,
    })}
    <line x1="170" y1="590" x2="910" y2="590" stroke="#EFE3D8" stroke-width="2" />
    ${safeItems
      .map((item, index) => {
        const lines = wrapText(item, item.length <= 18 ? 32 : 28).slice(0, 2);
        const itemY = listStartY + index * 128;
        return `
          <text x="190" y="${itemY}" fill="${ORANGE}" font-size="30" font-weight="800" font-family="Arial, Helvetica, sans-serif">${index + 1}.</text>
          ${renderTextBlock(lines, {
            x: 250,
            y: itemY,
            fontSize: 34,
            lineHeight: 42,
            color: CHARCOAL,
            weight: 500,
          })}
        `;
      })
      .join("")}
  `;
}

function buildVariationC({ quote, signature }) {
  const quoteLines = wrapText(String(quote || "").trim(), String(quote || "").length <= 70 ? 38 : 32).slice(0, 8);
  const sign = clampWords(signature, 3);

  return `
    ${buildBaseBackground(`<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#F7ECE2" opacity="0.62" />`)}
    ${buildLogoHeader({ x: 92, y: 108 })}
    ${buildTemplateNumber(3)}
    <rect x="120" y="190" rx="36" ry="36" width="840" height="930" fill="#E8DDD4" opacity="0.50" />
    <rect x="100" y="170" rx="36" ry="36" width="840" height="930" fill="${WHITE}" />
    <text x="185" y="470" fill="${ORANGE}" font-size="170" font-weight="800" font-family="Georgia, serif">&#8220;</text>
    <text x="870" y="950" fill="${ORANGE}" font-size="170" font-weight="800" text-anchor="end" font-family="Georgia, serif">&#8221;</text>
    ${renderTextBlock(quoteLines, {
      x: WIDTH / 2,
      y: 500,
      fontSize: quoteLines.length <= 4 ? 46 : 42,
      lineHeight: quoteLines.length <= 4 ? 62 : 58,
      color: CHARCOAL,
      weight: 500,
      anchor: "middle",
    })}
    <text x="830" y="915" fill="${CHARCOAL}" font-size="28" font-weight="600" text-anchor="end" font-family="Arial, Helvetica, sans-serif">${escapeXml(sign)}</text>
  `;
}

export async function generatePublication1Image(input) {
  const type = inferType(input);
  const title = normalizeOptional(input.title);
  const subtitle = normalizeOptional(input.subtitle);
  const items = (input.items || []).map(normalizeOptional).filter(Boolean);
  const quote = normalizeOptional(input.quote);
  const signature = normalizeOptional(input.signature);

  if (type === 1 && !title) {
    throw new Error("El molde 1 necesita titulo.");
  }

  if (type === 2 && (!title || items.length < 3)) {
    throw new Error("El molde 2 necesita titulo y al menos 3 items.");
  }

  if (type === 3 && (!quote || !signature)) {
    throw new Error("El molde 3 necesita cita y firma.");
  }

  let svgBody = "";
  if (type === 1) {
    svgBody = buildVariationA({
      title,
      subtitle: subtitle || "Diseno web moderno, claro y profesional.",
    });
  } else if (type === 2) {
    svgBody = buildVariationB({ title, items });
  } else {
    svgBody = buildVariationC({ quote, signature });
  }

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${svgBody}
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return {
    buffer,
    hashtags: buildHashtags(type, { title, subtitle, items: items.join(" "), quote, signature }),
    type,
  };
}

export function getPublicationExample(type) {
  const numeric = Number(type);

  if (numeric === 2) {
    return {
      type: 2,
      title: "Beneficios clave",
      items: ["Diseno responsivo", "Carga rapida", "Mas conversiones", "Soporte continuo"],
    };
  }

  if (numeric === 3) {
    return {
      type: 3,
      quote: "Trabajar con Variable Web cambio nuestra perspectiva. El nuevo sistema no solo se ve genial, sino que tambien funciona mejor para vender.",
      signature: "Maria G.",
    };
  }

  return {
    type: 1,
    title: "Duplica tus ventas online",
    subtitle: "Nuestro sistema optimiza cada paso del proceso de compra.",
  };
}
