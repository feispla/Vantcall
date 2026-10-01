import os

from dotenv import load_dotenv

# Load configuration before importing modules that initialize external clients.
load_dotenv()

import discord
from discord import app_commands

from commands.perfil import perfil_handler
from commands.vincular import vincular_riot_handler
from utils.health import start_health_server


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

vincular_group = app_commands.Group(
    name="vincular",
    description="Vincula una cuenta externa a tu perfil VANTS",
)


@vincular_group.command(name="riot", description="Vincula tu cuenta de Riot (Valorant)")
@app_commands.describe(handle="Tu Riot ID completo, por ejemplo: Nombre#TAG")
async def vincular_riot(interaction: discord.Interaction, handle: str) -> None:
    await vincular_riot_handler(interaction, handle)


tree.add_command(vincular_group, guild=GUILD)


@tree.command(guild=GUILD, name="perfil", description="Muestra el perfil VANTS de un jugador")
@app_commands.describe(usuario="Jugador a consultar (opcional, por defecto tú)")
async def perfil_command(interaction: discord.Interaction, usuario: discord.User | None = None) -> None:
    await perfil_handler(interaction, usuario)


@client.event
async def on_ready() -> None:
    await start_health_server()
    await tree.sync(guild=GUILD)
    print(f"✅ vantcall conectado como {client.user}")
    print(f"📋 Comandos registrados en guild {GUILD_ID}")


client.run(TOKEN)
