import cfonts from "cfonts";
import express from "express";

console.log("Iniciando bot...");

const app = express();
const port = process.env.PORT || 8000;

app.get("/", (_req, res) => {
  res.send("Bot Online");
});

app.listen(port, () => {
  console.log(`Health check activo en el puerto ${port}`);
});

cfonts.say("Autopub Bot", {
  font: "chrome",
  align: "center",
  gradient: ["red", "magenta"],
  transition: false,
});

import("./main.js");
