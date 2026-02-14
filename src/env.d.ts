/// <reference path="../.astro/types.d.ts" />

interface CfEnv {
  RESEND_API_KEY: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<CfEnv>;

declare namespace App {
  interface Locals extends Runtime {}
}
