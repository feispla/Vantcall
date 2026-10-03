import os
from urllib.parse import quote

import discord

from utils.supabase_client import supabase


def _channel_url() -> str:
    """URL al canal de ValoTracker en VANTS"""
    return "https://discord.com/channels/1546641331927908472/1546641332632817686"


def _account_url(display_name: str) -> str:
    return f"https://vants.gg/u/{quote(display_name, safe='')}"


async def perfil_handler(interaction: discord.Interaction, usuario: discord.User | None = None) -> None:
    target = usuario or interaction.user
    
    # ✅ Defer PÚBLICO (al comienzo, antes de las consultas)
    await interaction.response.defer()

    try:
        player_response = (
            supabase.table("players")
            .select("*")
            .eq("discord_user_id", str(target.id))
            .limit(1)
            .execute()
        )
        if not player_response.data:
            embed = discord.Embed(
                title="❌ Usuario no encontrado",
                description="Este usuario no tiene cuenta VANTS vinculada.",
                color=0xE30613,
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        player = player_response.data[0]
        player_id = player["id"]
        auth_user_id = player.get("auth_user_id")
        try:
            try:
                tournaments_response = (
                    supabase.table("tournament_participants")
                    .select("player_id", count="exact")
                    .eq("player_id", player_id)
                    .execute()
                )
            except Exception:
                tournaments_response = (
                    supabase.table("tournament_entries")
                    .select("player_id", count="exact")
                    .eq("player_id", player_id)
                    .execute()
                )
            tournaments = tournaments_response.count or 0
        except Exception:
            tournaments = 0

        accounts_response = (
            supabase.table("user_game_accounts")
            .select("game, handle")
            .eq("user_id", auth_user_id)
            .in_("game", ["riot", "steam"])
            .limit(10)
            .execute()
        )
    except Exception:
        await interaction.followup.send(
            "❌ No se pudo consultar el perfil ahora. Inténtalo de nuevo más tarde.",
            ephemeral=True,
        )
        return

    accounts = {row["game"]: row["handle"] for row in (accounts_response.data or [])}
    riot_handle = accounts.get("riot")
    steam_id = accounts.get("steam")
    display_name = player.get("display_name") or target.display_name

    embed = discord.Embed(color=0xE30613)
    embed.set_author(name=display_name, icon_url=player.get("avatar_url") or target.display_avatar.url)
    if player.get("avatar_url"):
        embed.set_thumbnail(url=player["avatar_url"])
    embed.add_field(name="🏆 Rango VANTS", value=str(player.get("rank") or "Sin rango"), inline=True)
    embed.add_field(name="⭐ Puntos", value=str(player.get("points") or 0), inline=True)
    embed.add_field(name="🎮 Torneos", value=str(tournaments), inline=True)
    embed.add_field(name="🌍 País", value=player.get("country") or "No definido", inline=True)
    embed.add_field(name="🔫 Riot ID", value=riot_handle or "No vinculado", inline=True)
    embed.add_field(
        name="🎲 Steam",
        value=(f"[Perfil](https://steamcommunity.com/profiles/{steam_id})" if steam_id else "No vinculado"),
        inline=True,
    )
    embed.set_footer(text="VANTS · vants.gg")

    view = discord.ui.View()
    if riot_handle:
        encoded_handle = quote(riot_handle, safe="")
        view.add_item(discord.ui.Button(
            label="Stats en tracker.gg",
            style=discord.ButtonStyle.link,
            url=f"https://tracker.gg/valorant/profile/riot/{encoded_handle}",
            row=0,
        ))
        view.add_item(discord.ui.Button(
            label="Abrir ValoTracker",
            style=discord.ButtonStyle.link,
            url=_channel_url(),
            row=0
        ))
    if steam_id:
        view.add_item(discord.ui.Button(
            label="Perfil de Steam",
            style=discord.ButtonStyle.link,
            url=f"https://steamcommunity.com/profiles/{steam_id}",
            row=1,
        ))
    view.add_item(discord.ui.Button(
        label="Perfil completo en vants.gg",
        style=discord.ButtonStyle.link,
        url=_account_url(display_name),
        row=2,
    ))
    await interaction.followup.send(embed=embed, view=view)
