// Public read-only feed of fully checked MSL scoreboard extracts for GitHub Pages.
// The private inbox, token hashes, player IDs and secret keys are never returned.
const base = Deno.env.get('SUPABASE_URL')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MSL_RESULTS_CHANNEL = '1571086271026036816';

Deno.serve(async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const url = new URL(base + '/rest/v1/msr_result_pending');
  url.searchParams.set('select', 'message_id,channel_id,source_timestamp,extracted_match,issues');
  url.searchParams.set('channel_id', 'eq.' + MSL_RESULTS_CHANNEL);
  url.searchParams.set('status', 'eq.auto_ready');
  url.searchParams.set('order', 'source_timestamp.asc');
  url.searchParams.set('limit', '80');
  try {
    const response = await fetch(url, { headers: { apikey: service, Authorization: 'Bearer ' + service } });
    if (!response.ok) throw Error('database_' + response.status);
    const rows = await response.json();
    const results = rows.flatMap((row: any) => {
      const match = row.extracted_match;
      if (!match || typeof match.a !== 'string' || typeof match.b !== 'string' ||
          !Array.isArray(match.maps) || !Array.isArray(match.uncertain) ||
          match.uncertain.length || !Array.isArray(row.issues) || row.issues.length) return [];
      // Explicitly copy the scoreboard fields only, never raw Discord post content.
      return [{ source_message_id: row.message_id, source_timestamp: row.source_timestamp,
        match: { a: match.a, b: match.b, uncertain: match.uncertain,
          maps: match.maps.map((m: any) => ({
            map: m.map, aScore: m.aScore, bScore: m.bScore, a: m.a, b: m.b,
          })) } }];
    });
    return Response.json({ ok: true, results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ ok: false, error: String((error as Error).message).slice(0, 80) }, { status: 503 });
  }
});
