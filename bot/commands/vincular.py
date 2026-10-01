import os
import re
from datetime import datetime, timezone
from urllib.parse import quote

import discord

from utils.supabase_client import supabase

RIOT_HANDLE_PATTERN = re.compile(r"^[^\s#]{3,16}#[A-Za-z0-9]{3,5}$")


def _channel_url() -> str | None:
    guild_id = os.getenv("DISCORD_GUILD_ID")
    channel_id = os.getenv("DISCORD_VALORANT_STATS_CHANNEL_ID")
    if not guild_id or not channel_id:
        return None
    return f"https://discord.com/channels/{guild_id}/{channel_id}"


async def vincular_riot_handler(interaction: discord.Interaction, handle: str) -> None:
    handle = handle.strip()
    if not RIOT_HANDLE_PATTERN.fullmatch(handle):
        await interaction.response.send_message(
            "❌ Formato inválido. Usa `Nombre#TAG` (ej: Player#1234)", ephemeral=True
        )
        return

    try:
        player_response = (
            supabase.table("players")
            .select("id, auth_user_id")
            .eq("discord_user_id", str(interaction.user.id))
            .limit(1)
            .execute()
        )
        if not player_response.data:
            await interaction.response.send_message(
                "⚠️ Primero vincula tu Discord con VANTS en https://vants.gg/cuenta",
                ephemeral=True,
            )
            return

        if not player_response.data or not player_response.data[0].get("auth_user_id"):
            await interaction.response.send_message(
                "⚠️ Tu cuenta de VANTS todavía no tiene un usuario autenticado asociado.",
                ephemeral=True,
            )
            return

        supabase.table("user_game_accounts").upsert(
            {
                "user_id": player_response.data[0]["auth_user_id"],
                "game": "riot",
                "handle": handle,
                "verified": False,
                "verified_at": None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="user_id,game",
        ).execute()
    except Exception:
        await interaction.response.send_message(
            "❌ No se pudo guardar la cuenta ahora. Inténtalo de nuevo más tarde.",
            ephemeral=True,
        )
        return

    embed = discord.Embed(
        title="✅ Cuenta de Riot vinculada a VANTS",
        description=(
            f"**{handle}** quedó guardada en tu perfil VANTS. "
            "Para ver tus stats de ranked, vincula también la misma cuenta en ValoTracker."
        ),
        color=0xE30613,
    )
    embed.add_field(
        name="📌 Siguiente paso",
        value="Usa `/link` del bot **ValoTracker** con el mismo Riot ID.",
        inline=False,
    )
    embed.set_footer(text="VANTS · vants.gg")

    view = discord.ui.View()
    encoded_handle = quote(handle, safe="")
    view.add_item(discord.ui.Button(
        label="Ver stats en tracker.gg",
        style=discord.ButtonStyle.link,
        url=f"https://tracker.gg/valorant/profile/riot/{encoded_handle}",
    ))
    if channel_url := _channel_url():
        view.add_item(discord.ui.Button(
            label="Ir a #valorant-stats", style=discord.ButtonStyle.link, url=channel_url
        ))
    await interaction.response.send_message(embed=embed, view=view)
