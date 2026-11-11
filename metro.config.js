const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite (web) : autoriser l'import du fichier wa-sqlite.wasm
config.resolver.assetExts.push('wasm');

// expo-sqlite (web) : SharedArrayBuffer exige ces en-têtes d'isolation
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
