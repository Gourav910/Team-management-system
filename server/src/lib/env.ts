import "dotenv/config";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export const JWT_SECRET = requireEnv("JWT_SECRET");
export const PORT = Number(process.env.PORT) || 4000;
