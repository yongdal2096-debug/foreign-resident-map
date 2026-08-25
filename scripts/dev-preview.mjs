import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const nextBin = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const forwarded = process.argv.slice(2);
const nextArgs = [];

for (let index = 0; index < forwarded.length; index += 1) {
  const argument = forwarded[index];
  if (argument === "--host") {
    nextArgs.push("--hostname");
    if (forwarded[index + 1]) nextArgs.push(forwarded[++index]);
    continue;
  }
  if (argument === "--strictPort") continue;
  nextArgs.push(argument);
}

const child = spawn(process.execPath, [nextBin, "dev", ...nextArgs], {
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
