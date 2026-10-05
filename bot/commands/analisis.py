import discord
from discord import app_commands
from datetime import datetime, timezone, timedelta
from collections import Counter

from utils.supabase_client import supabase


async def stats_servidor_handler(interaction: discord.Interaction) -> None:
    await interaction.response.defer()
    guild = interaction.guild
    players = supabase.table("players").select("id", count="exact").execute()
    tournaments = supabase.table("tournaments").select("id", count="exact").execute()
    matches = supabase.table("ranked_matches").select("id", count="exact").eq("status", "completed").execute()
    embed = discord.Embed(title="📊 Stats del servidor VANTS", color=0x00B6AF, timestamp=datetime.now(timezone.utc))
    embed.add_field(name="Miembros Discord", value=str(guild.member_count), inline=True)
    embed.add_field(name="Jugadores registrados", value=str(players.count or 0), inline=True)
    embed.add_field(name="Torneos", value=str(tournaments.count or 0), inline=True)
    embed.add_field(name="Partidas ranked", value=str(matches.count or 0), inline=True)
    embed.add_field(name="Canales", value=str(len(guild.channels)), inline=True)
    embed.add_field(name="Roles", value=str(len(guild.roles)), inline=True)
    await interaction.followup.send(embed=embed)


async def stats_jugador_handler(interaction: discord.Interaction, usuario: discord.User | None = None) -> None:
    await interaction.response.defer()
    target = usuario or interaction.user
    res = supabase.table("players").select("*").eq("discord_user_id", str(target.id)).limit(1).execute()
    if not res.data:
        await interaction.followup.send(f"❌ {target.mention} no tiene perfil VANTS vinculado.")
        return
    p = res.data[0]
    stats = supabase.table("leaderboard").select("*").eq("player_id", p["id"]).limit(1).execute()
    embed = discord.Embed(title=f"🎮 Stats de {p.get('display_name') or p['username']}", color=0xE67277)
    embed.add_field(name="Username", value=f"@{p['username']}", inline=True)
    embed.add_field(name="Juego principal", value=p.get("main_game") or "—", inline=True)
    embed.add_field(name="Región", value=p.get("region") or "—", inline=True)
    if stats.data:
        s = stats.data[0]
        embed.add_field(name="Rango", value=s.get("rank") or "Unranked", inline=True)
        embed.add_field(name="MMR", value=str(s.get("mmr") or 0), inline=True)
        embed.add_field(name="V/D", value=f"{s.get('wins') or 0} / {s.get('losses') or 0}", inline=True)
    embed.set_thumbnail(url=p.get("avatar_url") or target.display_avatar.url)
    await interaction.followup.send(embed=embed)


async def actividad_handler(interaction: discord.Interaction, dias: int = 7) -> None:
    await interaction.response.defer()
    guild = interaction.guild
    cutoff = datetime.now(timezone.utc) - timedelta(days=dias)
    total = 0
    by_channel = Counter()
    for channel in guild.text_channels:
        try:
            async for msg in channel.history(limit=None, after=cutoff):
                if msg.author.bot:
                    continue
                total += 1
                by_channel[channel.name] += 1
        except discord.Forbidden:
            continue
    top = by_channel.most_common(5)
    embed = discord.Embed(title=f"📈 Actividad últimos {dias} días", color=0x9C27B0)
    embed.add_field(name="Mensajes totales", value=str(total), inline=False)
    if top:
        embed.add_field(name="Canales más activos", value="\n".join(f"#{c}: {n}" for c, n in top), inline=False)
    await interaction.followup.send(embed=embed)


async def top_handler(interaction: discord.Interaction, dias: int = 7) -> None:
    await interaction.response.defer()
    guild = interaction.guild
    cutoff = datetime.now(timezone.utc) - timedelta(days=dias)
    by_user = Counter()
    for channel in guild.text_channels:
        try:
            async for msg in channel.history(limit=None, after=cutoff):
                if msg.author.bot:
                    continue
                by_user[msg.author.display_name] += 1
        except discord.Forbidden:
            continue
    top = by_user.most_common(10)
    embed = discord.Embed(title=f"🏆 Top 10 miembros más activos ({dias} días)", color=0xFFD700)
    if top:
        medals = ["🥇", "🥈", "🥉"] + ["▫️"] * 7
        embed.description = "\n".join(f"{medals[i]} **{name}** — {count} mensajes" for i, (name, count) in enumerate(top))
    else:
        embed.description = "Sin actividad en el período."
    await interaction.followup.send(embed=embed)
