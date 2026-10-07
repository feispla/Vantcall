import { createSupabaseContext } from 'npm:@supabase/server';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
if (!SUPABASE_URL) throw new Error('SUPABASE_URL is required');

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';
const SELECTOR = 'http://specs.openid.net/auth/2.0/identifier_select';
const REQUIRED_SIGNED_FIELDS = [
  'op_endpoint',
  'claimed_id',
  'identity',
  'return_to',
  'response_nonce',
  'assoc_handle',
];

function appRedirect(kind: 'success' | 'error', reason?: string): Response {
  const target = new URL(kind === 'success' ? 'vants://link-success' : 'vants://link-error');
  if (kind === 'success') target.searchParams.set('game', 'steam');
  else target.searchParams.set('reason', reason ?? 'link_failed');
  return new Response(null, { status: 302, headers: { Location: target.toString(), 'Cache-Control': 'no-store' } });
}

function callbackUrl(state: string): string {
  const url = new URL(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/link-steam-callback`);
  url.searchParams.set('state', state);
  return url.toString();
}

export default {
  fetch: async (req: Request): Promise<Response> => {
    if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

    const url = new URL(req.url);
    const state = url.searchParams.get('state');
    if (!state || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(state)) {
      return appRedirect('error', 'invalid_state');
    }

    const { data: ctx, error: contextError } = await createSupabaseContext(req, { auth: 'none' });
    if (contextError || !ctx?.supabaseAdmin) return appRedirect('error', 'link_failed');

    // Atomic DELETE makes each state token single-use, including concurrent callbacks.
    const { data: stateRow, error: stateError } = await ctx.supabaseAdmin
      .from('steam_link_state')
      .delete()
      .eq('state_id', state)
      .gt('expires_at', new Date().toISOString())
      .select('user_id')
      .maybeSingle();

    if (stateError || !stateRow?.user_id) return appRedirect('error', 'invalid_state');

    const openidMode = url.searchParams.get('openid.mode');
    if (openidMode === 'cancel') return appRedirect('error', 'cancelled');
    if (openidMode !== 'id_res') return appRedirect('error', 'invalid_openid');
    if (url.searchParams.get('openid.ns') !== OPENID_NS) return appRedirect('error', 'invalid_openid');
    if (url.searchParams.get('openid.op_endpoint') !== STEAM_OPENID_ENDPOINT) {
      return appRedirect('error', 'invalid_openid');
    }

    const expectedReturnTo = callbackUrl(state);
    if (url.searchParams.get('openid.return_to') !== expectedReturnTo) {
      return appRedirect('error', 'invalid_openid');
    }

    const signedFields = new Set((url.searchParams.get('openid.signed') ?? '').split(','));
    if (REQUIRED_SIGNED_FIELDS.some((field) => !signedFields.has(field))) {
      return appRedirect('error', 'invalid_openid');
    }

    const claimedId = url.searchParams.get('openid.claimed_id') ?? '';
    const identity = url.searchParams.get('openid.identity') ?? '';
    const steamIdMatch = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(claimedId);
    if (!steamIdMatch || identity !== claimedId || identity === SELECTOR) {
      return appRedirect('error', 'invalid_openid');
    }
    const steamId = steamIdMatch[1];

    const nonce = url.searchParams.get('openid.response_nonce') ?? '';
    const nonceTime = Date.parse(nonce.slice(0, 20));
    const now = Date.now();
    if (!Number.isFinite(nonceTime) || nonceTime > now + 60_000 || nonceTime < now - 600_000) {
      return appRedirect('error', 'invalid_openid');
    }

    const checkParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (!key.startsWith('openid.')) continue;
      if (url.searchParams.getAll(key).length !== 1) return appRedirect('error', 'invalid_openid');
      checkParams.set(key, value);
    }
    checkParams.set('openid.mode', 'check_authentication');

    let checkResponse: Response;
    try {
      checkResponse = await fetch(STEAM_OPENID_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: checkParams,
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return appRedirect('error', 'steam_verification_failed');
    }
    if (!checkResponse.ok) return appRedirect('error', 'steam_verification_failed');

    const verificationText = await checkResponse.text();
    if (!/^is_valid:true\s*$/m.test(verificationText)) {
      return appRedirect('error', 'steam_verification_failed');
    }

    const steamApiKey = Deno.env.get('STEAM_WEB_API_KEY');
    if (!steamApiKey) return appRedirect('error', 'steam_unavailable');

    const summaryUrl = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
    summaryUrl.searchParams.set('key', steamApiKey);
    summaryUrl.searchParams.set('steamids', steamId);

    let summaryResponse: Response;
    try {
      summaryResponse = await fetch(summaryUrl, { signal: AbortSignal.timeout(10_000) });
    } catch {
      return appRedirect('error', 'steam_unavailable');
    }
    if (!summaryResponse.ok) return appRedirect('error', 'steam_unavailable');

    let player: Record<string, unknown> | undefined;
    try {
      const summary = await summaryResponse.json();
      player = summary?.response?.players?.[0];
    } catch {
      return appRedirect('error', 'steam_unavailable');
    }
    if (!player || player.steamid !== steamId) return appRedirect('error', 'steam_unavailable');

    const verifiedAt = new Date().toISOString();
    const { error: upsertError } = await ctx.supabaseAdmin
      .from('user_game_accounts')
      .upsert({
        user_id: stateRow.user_id,
        game: 'steam',
        handle: steamId,
        display_name: typeof player.personaname === 'string' ? player.personaname : null,
        avatar_url: typeof player.avatarfull === 'string' ? player.avatarfull : null,
        profile_url: typeof player.profileurl === 'string' ? player.profileurl : null,
        country: typeof player.loccountrycode === 'string' ? player.loccountrycode : null,
        verified: true,
        verified_at: verifiedAt,
        updated_at: verifiedAt,
      }, { onConflict: 'user_id,game' });

    if (upsertError) {
      if (upsertError.code === '23505') return appRedirect('error', 'already_linked');
      return appRedirect('error', 'link_failed');
    }

    return appRedirect('success');
  },
};
