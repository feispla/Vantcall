(function () {
  'use strict';

  let sdkPromise = null;

  function loadSdk() {
    if (window.Spotify) return Promise.resolve(window.Spotify);
    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise((resolve, reject) => {
      let settled = false;
      const script = document.createElement('script');
      const timeout = window.setTimeout(() => fail(new Error('Spotify tardó demasiado en cargar.')), 15000);
      const fail = (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        reject(error);
      };
      const ready = () => {
        if (!window.Spotify) return fail(new Error('No se pudo inicializar el reproductor de Spotify.'));
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(window.Spotify);
      };
      const previousReady = window.onSpotifyWebPlaybackSDKReady;
      window.onSpotifyWebPlaybackSDKReady = () => {
        try {
          if (typeof previousReady === 'function') previousReady();
        } finally {
          ready();
        }
      };

      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onerror = () => fail(new Error('No se pudo cargar el reproductor de Spotify.'));
      document.head.appendChild(script);
    }).catch((error) => {
      sdkPromise = null;
      throw error;
    });

    return sdkPromise;
  }

  function toSpotifyUri(value) {
    const uriMatch = value.match(/^spotify:(track|album|playlist):([A-Za-z0-9]+)$/);
    if (uriMatch) return { type: uriMatch[1], uri: value };

    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error('Pega un enlace válido de Spotify o una URI spotify:track/album/playlist.');
    }
    const match = url.hostname === 'open.spotify.com'
      ? url.pathname.match(/^\/(track|album|playlist)\/([A-Za-z0-9]+)/)
      : null;
    if (!match) throw new Error('El enlace debe ser una canción, álbum o playlist de open.spotify.com.');
    return { type: match[1], uri: `spotify:${match[1]}:${match[2]}` };
  }

  class VantSpotifyPlayer {
    constructor({ accessToken, onReady, onState, onError }) {
      this.accessToken = accessToken;
      this.onReady = onReady || (() => {});
      this.onState = onState || (() => {});
      this.onError = onError || (() => {});
      this.player = null;
      this.deviceId = null;
    }

    async connect() {
      if (!this.accessToken) throw new Error('Vuelve a iniciar sesión con Spotify para obtener un token de reproducción.');
      const Spotify = await loadSdk();
      this.player = new Spotify.Player({
        name: 'VANTCALL Esports',
        getOAuthToken: (callback) => callback(this.accessToken),
        volume: 0.5,
      });
      this.player.addListener('ready', ({ device_id: deviceId }) => {
        this.deviceId = deviceId;
        this.onReady();
      });
      this.player.addListener('player_state_changed', (state) => this.onState(state));
      ['initialization_error', 'authentication_error', 'account_error', 'playback_error'].forEach((event) => {
        this.player.addListener(event, ({ message }) => {
          this.onError(new Error(message || 'Spotify no pudo iniciar la reproducción.'));
        });
      });

      const connected = await this.player.connect();
      if (!connected) throw new Error('No se pudo conectar el reproductor de Spotify. Vuelve a intentarlo.');
    }

    async play(value) {
      if (!this.player || !this.deviceId) throw new Error('El reproductor de Spotify todavía se está conectando.');
      const { type, uri } = toSpotifyUri(value);
      await this.player.activateElement();

      const body = type === 'track' ? { uris: [uri] } : { context_uri: uri };
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(this.deviceId)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (response.status === 401) throw new Error('El acceso a Spotify caducó. Cierra sesión y vuelve a entrar con Spotify.');
      if (response.status === 403) throw new Error('Spotify requiere una cuenta Premium y permisos de reproducción para usar este reproductor.');
      if (!response.ok) throw new Error(`Spotify no pudo iniciar la reproducción (HTTP ${response.status}).`);
    }

    async togglePlayback() {
      if (!this.player || !this.deviceId) throw new Error('El reproductor de Spotify todavía se está conectando.');
      await this.player.togglePlay();
    }

    disconnect() {
      if (this.player) this.player.disconnect();
      this.player = null;
      this.deviceId = null;
    }
  }

  window.VantSpotifyPlayer = VantSpotifyPlayer;
})();
