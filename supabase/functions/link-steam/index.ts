import { createSupabaseContext } from 'npm:@supabase/server';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
if (!SUPABASE_URL) throw new Error('SUPABASE_URL is required');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

export default {
  fetch: async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const { data: ctx, error: authError } = await createSupabaseContext(req, { auth: 'user' });
    if (authError || !ctx?.userClaims?.id) return json({ error: 'unauthorized' }, 401);
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    try {
      const { data: stateId, error } = await ctx.supabaseAdmin.rpc(
        'create_steam_link_state',
        { p_user_id: ctx.userClaims.id },
      );

      if (error) {
        if (error.message.includes('steam_link_rate_limited')) {
          return json({ error: 'rate_limited', limit: 5, window_seconds: 3600 }, 429);
        }
        return json({ error: 'link_start_failed' }, 500);
      }
      if (typeof stateId !== 'string') return json({ error: 'link_start_failed' }, 500);

      const callback = new URL(`${SUPABASE_URL}/functions/v1/link-steam-callback`);
      callback.searchParams.set('state', stateId);

      const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': callback.toString(),
        'openid.realm': `${SUPABASE_URL}/functions/v1/`,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
      });

      return json({ login_url: `https://steamcommunity.com/openid/login?${params.toString()}`, expires_in: 600 });
    } catch {
      return json({ error: 'link_start_failed' }, 500);
    }
  },
};
