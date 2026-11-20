// Проверка переменных окружения перед сборкой на Vercel (и локально:
// `pnpm check-env`). Понятные сообщения вместо падения посреди сборки.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const env = process.env;
const errors = [];
const warnings = [];

const url = env.TURSO_DATABASE_URL ?? "";
if (!url) {
  errors.push(
    "TURSO_DATABASE_URL не задан. Возьмите адрес командой `turso db show salary --url` (начинается с libsql://).",
  );
} else if (url.startsWith("libsql://") || url.startsWith("https://")) {
  if (!env.TURSO_AUTH_TOKEN) {
    errors.push(
      "TURSO_AUTH_TOKEN не задан. Создайте токен: `turso db tokens create salary`.",
    );
  }
} else if (url.startsWith("file:") && env.VERCEL === "1") {
  errors.push(
    "На Vercel нельзя использовать файл базы (file:…) — укажите адрес Turso (libsql://…).",
  );
}

const secret = env.BETTER_AUTH_SECRET ?? "";
if (!secret) {
  errors.push(
    "BETTER_AUTH_SECRET не задан. Сгенерируйте: `openssl rand -base64 32`.",
  );
} else if (secret.length < 32) {
  errors.push(
    "BETTER_AUTH_SECRET слишком короткий — нужно не меньше 32 символов.",
  );
}

if (env.VERCEL_ENV === "production" && !env.BETTER_AUTH_URL) {
  if (env.VERCEL_PROJECT_PRODUCTION_URL) {
    warnings.push(
      `BETTER_AUTH_URL не задан — используется адрес проекта https://${env.VERCEL_PROJECT_PRODUCTION_URL}. Для своего домена задайте BETTER_AUTH_URL.`,
    );
  } else {
    errors.push(
      "BETTER_AUTH_URL не задан для Production. Укажите адрес сайта, например https://salary.vercel.app.",
    );
  }
}
if (
  env.BETTER_AUTH_URL &&
  env.VERCEL === "1" &&
  !env.BETTER_AUTH_URL.startsWith("https://")
) {
  errors.push("BETTER_AUTH_URL на Vercel должен начинаться с https://.");
}

const g = [env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET].filter(
  Boolean,
).length;
if (g === 1) {
  errors.push(
    "Для входа через Google нужны обе переменные: GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET (или ни одной).",
  );
} else if (g === 0) {
  warnings.push("Вход через Google выключен (GOOGLE_CLIENT_ID не задан).");
}

if (env.E2E_DISABLE_RATE_LIMIT === "1" && env.VERCEL === "1") {
  errors.push(
    "E2E_DISABLE_RATE_LIMIT=1 отключает защиту от перебора паролей — уберите эту переменную на Vercel.",
  );
}

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  console.error("\n✖ Не хватает настроек окружения:\n");
  for (const e of errors) console.error(`  • ${e}`);
  console.error("\nПодробно: docs/deploy.md\n");
  process.exit(1);
}
console.log("✓ Переменные окружения в порядке");
