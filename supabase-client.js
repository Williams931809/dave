(function () {
  const config = window.SUPABASE_CONFIG;
  const configured = config && config.url && config.anonKey &&
    !config.url.includes('YOUR_') && !config.anonKey.includes('YOUR_');

  window.portfolioClient = configured && window.supabase
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;
})();
