import discord
from discord import app_commands
from datetime import datetime, timezone, timedelta

from utils.supabase_client import supabase


async def informe_semanal_handler(interaction: discord.Interaction) -> None:
    await interaction.response.defer()
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_players = supabase.table("players").select("username, display_name, created_at").gte("created_at", week_ago).order("created_at", desc=True).limit(10).execute()
    tournaments = supabase.table("tournaments").select("name, status, current_participants, max_participants, starts_at").in_("status", ["registration", "open", "upcoming", "in_progress", "live"]).execute()
    matches = supabase.table("ranked_matches").select("id", count="exact").eq("status", "completed").gte("completed_at", week_ago).execute()
    season = supabase.table("seasons").select("id, name").eq("status", "active").limit(1).execute()
    top5 = []
    if season.data:
        top5 = supabase.table("leaderboard").select("username, display_name, rank, mmr, wins").eq("season_id", season.data[0]["id"]).order("mmr", desc=True).limit(5).execute().data or []

    embed = discord.Embed(title="📋 Informe semanal VANTS", color=0x00B6AF, timestamp=datetime.now(timezone.utc))
    embed.add_field(name="🆕 Jugadores nuevos (7d)", value=str(len(new_players.data or [])), inline=True)
    embed.add_field(name="🎮 Partidas ranked (7d)", value=str(matches.count or 0), inline=True)
    embed.add_field(name="🏆 Torneos activos", value=str(len(tournaments.data or [])), inline=True)

    if new_players.data:
        names = ", ".join(p.get("display_name") or p["username"] for p in new_players.data[:5])
        embed.add_field(name="Últimos registros", value=names, inline=False)

    if tournaments.data:
        t_list = "\n".join(f"• **{t['name']}** ({t.get('status', '?')}) — {t.get('current_participants', 0)}/{t.get('max_participants') or '∞'}" for t in tournaments.data[:5])
        embed.add_field(name="Torneos en curso", value=t_list, inline=False)

    if top5:
        lb = "\n".join(f"{i+1}. **{p.get('display_name') or p['username']}** — {p.get('rank', '?')} ({p.get('mmr', 0)} MMR)" for i, p in enumerate(top5))
        embed.add_field(name="Top 5 ranked", value=lb, inline=False)

    await interaction.followup.send(embed=embed)


async def resumen_handler(interaction: discord.Interaction) -> None:
    await interaction.response.defer()
    players = supabase.table("players").select("id", count="exact").execute()
    tournaments = supabase.table("tournaments").select("id", count="exact").execute()
    matches = supabase.table("ranked_matches").select("id", count="exact").eq("status", "completed").execute()
    events = supabase.table("events").select("id", count="exact").gte("starts_at", datetime.now(timezone.utc).isoformat()).execute()
    season = supabase.table("seasons").select("name, season_number, status").eq("status", "active").limit(1).execute()

    embed = discord.Embed(title="⚡ Resumen VANTCALL", color=0xE67277, timestamp=datetime.now(timezone.utc))
    embed.add_field(name="Jugadores", value=str(players.count or 0), inline=True)
    embed.add_field(name="Torneos", value=str(tournaments.count or 0), inline=True)
    embed.add_field(name="Partidas ranked", value=str(matches.count or 0), inline=True)
    embed.add_field(name="Eventos próximos", value=str(events.count or 0), inline=True)
    if season.data:
        embed.add_field(name="Temporada", value=f"{season.data[0].get('name', 'T' + str(season.data[0]['season_number']))} ({season.data[0]['status']})", inline=True)
    embed.set_footer(text="Datos en tiempo real desde Supabase")
    await interaction.followup.send(embed=embed)
