import os
from dotenv import load_dotenv

load_dotenv()

import discord
from discord import app_commands

from commands.perfil import perfil_handler
from commands.vincular import vincular_riot_handler
from utils.health import start_health_server
from utils.supabase import get_supabase_client


def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Falta la variable de entorno {name}")
    return value


TOKEN = required_env("DISCORD_TOKEN")
GUILD_ID = int(required_env("DISCORD_GUILD_ID"))
GUILD = discord.Object(id=GUILD_ID)

intents = discord.Intents.default()
client = discord.Client(intents=intents)
tree = app_commands.CommandTree(client)

# Inicializar Supabase
supabase = get_supabase_client()


# ─────────────────────────────────────────────────────────────────────────────
# GRUPO: vincular
# ─────────────────────────────────────────────────────────────────────────────
vincular_group = app_commands.Group(
    name="vincular",
    description="Vincula una cuenta externa a tu perfil VANTS",
)


@vincular_group.command(name="riot", description="Vincula tu cuenta de Riot (Valorant)")
@app_commands.describe(handle="Tu Riot ID completo, por ejemplo: Nombre#TAG")
async def vincular_riot(interaction: discord.Interaction, handle: str) -> None:
    await vincular_riot_handler(interaction, handle)


tree.add_command(vincular_group, guild=GUILD)


# ─────────────────────────────────────────────────────────────────────────────
# COMANDO: perfil
# ─────────────────────────────────────────────────────────────────────────────
@tree.command(guild=GUILD, name="perfil", description="Muestra el perfil VANTS de un jugador")
@app_commands.describe(usuario="Jugador a consultar (opcional, por defecto tú)")
async def perfil_command(interaction: discord.Interaction, usuario: discord.User | None = None) -> None:
    await perfil_handler(interaction, usuario)


# ─────────────────────────────────────────────────────────────────────────────
# COMANDO: setup (ACTUALIZADO - Usa canales existentes con IDs fijas)
# ─────────────────────────────────────────────────────────────────────────────
@tree.command(guild=GUILD, name="setup", description="Configura automáticamente los canales de VANTCALL")
@app_commands.checks.has_permissions(administrator=True)
async def setup_command(interaction: discord.Interaction) -> None:
    await interaction.response.defer(ephemeral=True)
    
    guild = interaction.guild
    guild_id = str(guild.id)
    
    try:
        # IDs de canales fijos (ya existentes en tu servidor)
        canales_ids = {
            "welcome": "1546654795186577488",
            "anuncios": "1553634435671396432",
            "tryouts": "1553938201754730506",
            "resultados": "1553938926320877669",
            "estadisticas": "1553863844915585146",
            "sup": "1553659242458652733",
            "torneos": "1553659315565367307",
        }
        
        # Obtener objetos de canal
        canales = {}
        for nombre, canal_id in canales_ids.items():
            canal = guild.get_channel(int(canal_id))
            if canal:
                canales[nombre] = canal
        
        # Guardar en Supabase
        supabase.table("guild_configs").upsert({
            "guild_id": guild_id,
            "guild_name": guild.name,
            "anuncios_channel_id": canales_ids["anuncios"],
            "tryouts_channel_id": canales_ids["tryouts"],
            "resultados_channel_id": canales_ids["resultados"],
            "comandos_channel_id": canales_ids["torneos"],
        }).execute()
        
        # Mensaje de éxito
        embed = discord.Embed(
            title="✅ Servidor configurado",
            description=f"**{guild.name}** está listo para VANTCALL",
            color=0x00FF00
        )
        
        embed.add_field(
            name="📢 Canales configurados",
            value=(
                f"• {canales['anuncios'].mention} - Anuncios\n"
                f"• {canales['tryouts'].mention} - Tryouts\n"
                f"• {canales['resultados'].mention} - Resultados\n"
                f"• {canales['torneos'].mention} - Torneos\n"
                f"• {canales['estadisticas'].mention} - Estadísticas\n"
                f"• {canales['sup'].mention} - Sup\n"
            ),
            inline=False
        )
        
        embed.add_field(
            name="🚀 Primeros pasos",
            value=(
                "Usa `/perfil` para ver tu perfil\n"
                "Usa `/vincular riot <ID>` para conectar tu cuenta\n"
                "Los anuncios de torneos llegarán a " + canales["anuncios"].mention
            ),
            inline=False
        )
        
        # Enviar mensaje en el canal de anuncios con @everyone
        await canales["anuncios"].send(
            content="@everyone 🏆 **VANTCALL ya está disponible en este servidor**",
            embed=embed
        )
        
        # Confirmación para el admin
        await interaction.followup.send(
            "✅ Canales configurados y anuncio enviado a " + canales["anuncios"].mention,
            ephemeral=True
        )
        
    except Exception as e:
        await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)


# ─────────────────────────────────────────────────────────────────────────────
# EVENTOS
# ─────────────────────────────────────────────────────────────────────────────
@client.event
async def on_ready() -> None:
    await start_health_server()
    await tree.sync(guild=GUILD)
    print(f"✅ vantcall conectado como {client.user}")
    print(f"📋 Comandos registrados en guild {GUILD_ID}")


client.run(TOKEN)
