import { watchFile, unwatchFile } from "fs";
import chalk from "chalk";
import { fileURLToPath, pathToFileURL } from "url";

global.owner = [["5493513117202"]];

globalThis.info = {
  wm: "Autopub Bot",
  vs: "0.1.0",
};

const file = fileURLToPath(import.meta.url);
watchFile(file, () => {
  unwatchFile(file);
  console.log(chalk.redBright("Update 'config.js'"));
  import(`${pathToFileURL(file).href}?update=${Date.now()}`);
});
