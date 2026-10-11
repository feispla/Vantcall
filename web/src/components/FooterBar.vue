<template>
  <footer class="footer">
    <div class="container inner">
      <span class="title brand">VANTS</span>
      <span class="muted">Plataforma competitiva de esports · VALORANT · CS2 · League of Legends</span>
      <nav class="legal" aria-label="Legal">
        <a href="../privacidad.html">Privacidad</a>
        <a href="../terminos.html">Términos</a>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.footer { margin-top: 64px; border-top: 1px solid var(--line); padding: 28px 0; background: var(--bg-2); }
.inner { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; font-size: 14px; }
.brand { color: var(--accent); font-size: 22px; letter-spacing: .06em; }
.legal { margin-left: auto; display: flex; gap: 16px; }
.legal a:hover { color: var(--accent); }
</style>
