import discord
from discord import app_commands
from datetime import datetime, timezone

from utils.supabase_client import supabase

ANUNCIOS_CHANNEL_ID = 1553634435671396432
STAFF_ROLE_NAMES = {"staff", "admin", "moderador", "owner"}


def is_staff(interaction: discord.Interaction) -> bool:
    if interaction.user.guild_permissions.administrator:
        return True
    user_roles = {r.name.lower() for r in interaction.user.roles}
    return any(r in user_roles for r in STAFF_ROLE_NAMES)


async def anuncio_handler(interaction: discord.Interaction, titulo: str, mensaje: str, imagen: str | None = None) -> None:
    if not is_staff(interaction):
        await interaction.response.send_message("❌ Solo el staff puede usar este comando.", ephemeral=True)
        return
    await interaction.response.defer()
    channel = interaction.guild.get_channel(ANUNCIOS_CHANNEL_ID)
    if not channel:
        await interaction.followup.send("❌ Canal de anuncios no encontrado.", ephemeral=True)
        return
    embed = discord.Embed(title=titulo, description=mensaje, color=0x00B6AF, timestamp=datetime.now(timezone.utc))
    embed.set_footer(text=f"Anuncio por {interaction.user.display_name}")
    if imagen:
        embed.set_image(url=imagen)
    await channel.send(embed=embed)
    await interaction.followup.send(f"✅ Anuncio publicado en {channel.mention}.", ephemeral=True)


async def evento_crear_handler(interaction: discord.Interaction, titulo: str, tipo: str, fecha: str, descripcion: str | None = None) -> None:
    if not is_staff(interaction):
        await interaction.response.send_message("❌ Solo el staff puede usar este comando.", ephemeral=True)
        return
    await interaction.response.defer()
    try:
        try:
            starts = datetime.strptime(fecha, "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
        except ValueError:
            starts = datetime.strptime(fecha, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        await interaction.followup.send("❌ Formato de fecha inválido. Usa `YYYY-MM-DD` o `YYYY-MM-DD HH:MM`.", ephemeral=True)
        return
    payload = {
        "title": titulo,
        "event_type": tipo,
        "starts_at": starts.isoformat(),
        "status": "upcoming",
    }
    if descripcion:
        payload["description"] = descripcion
    res = supabase.table("events").insert(payload).execute()
    eid = res.data[0]["id"] if res.data else None
    await interaction.followup.send(f"✅ Evento **{titulo}** creado para el {starts.strftime('%d/%m/%Y %H:%M')} UTC (id `{eid}`).", ephemeral=True)


async def torneo_crear_handler(interaction: discord.Interaction, nombre: str, formato: str, fecha_inicio: str, max_participantes: int = 16) -> None:
    if not is_staff(interaction):
        await interaction.response.send_message("❌ Solo el staff puede usar este comando.", ephemeral=True)
        return
    await interaction.response.defer()
    try:
        starts = datetime.strptime(fecha_inicio, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        await interaction.followup.send("❌ Formato de fecha inválido. Usa `YYYY-MM-DD`.", ephemeral=True)
        return
    slug = nombre.lower().replace(" ", "-")[:50]
    payload = {
        "name": nombre,
        "slug": slug,
        "format": formato,
        "status": "registration",
        "starts_at": starts.isoformat(),
        "max_participants": max_participantes,
    }
    res = supabase.table("tournaments").insert(payload).execute()
    tid = res.data[0]["id"] if res.data else None
    await interaction.followup.send(f"✅ Torneo **{nombre}** creado (formato {formato}, inicio {starts.strftime('%d/%m/%Y')}, máx {max_participantes} jugadores, id `{tid}`).", ephemeral=True)


async def recordatorio_handler(interaction: discord.Interaction, mensaje: str, minutos: int) -> None:
    if not is_staff(interaction):
        await interaction.response.send_message("❌ Solo el staff puede usar este comando.", ephemeral=True)
        return
    await interaction.response.send_message(f"⏰ Recordatorio programado en {minutos} minutos.", ephemeral=True)
    import asyncio
    await asyncio.sleep(minutos * 60)
    try:
        await interaction.channel.send(f"⏰ **Recordatorio**: {mensaje}")
    except discord.HTTPException:
        pass
