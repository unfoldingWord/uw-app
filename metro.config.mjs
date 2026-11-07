import expoMetroConfig from 'expo/metro-config.js';

const config = expoMetroConfig.getDefaultConfig(import.meta.dirname);

config.resolver.assetExts = [...config.resolver.assetExts.filter((extension) => extension !== 'zip'), 'zip'];

export default config;
