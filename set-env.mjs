import { execFileSync } from "child_process"

const [,, key, value] = process.argv
if (!key || !value) {
  console.error("Usage: node set-env.mjs <KEY> <VALUE>")
  process.exit(1)
}

execFileSync("vercel", ["env", "add", key, "production"], {
  input: value,
  stdio: ["pipe", "inherit", "inherit"],
  shell: true,
})

console.log(`✅ ${key} を Vercel に設定しました`)
