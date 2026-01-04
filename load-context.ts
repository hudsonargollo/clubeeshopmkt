import { type PlatformProxy } from "wrangler";
import type { Env } from "~/lib/supabase.server";

type Cloudflare = Omit<PlatformProxy<Env>, "dispose">;

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: Cloudflare;
  }
}

type GetLoadContext = (args: {
  request: Request;
  context: { cloudflare: Cloudflare };
}) => {
  cloudflare: Cloudflare;
};

export const getLoadContext: GetLoadContext = ({ context }) => {
  return {
    cloudflare: context.cloudflare,
  };
};
