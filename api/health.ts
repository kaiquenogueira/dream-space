export default function handler(req: any, res: any) {
  const envCheck = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_VERSION: process.version,
  };

  res.status(200).json({
    status: 'ok',
    message: 'Health check passed',
    env: envCheck,
    timestamp: new Date().toISOString(),
  });
}
