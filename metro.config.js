// The onboarding video (video/) is its own project with its own packages:
// keep Metro from crawling it.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const video = new RegExp(`^${path.resolve(__dirname, "video").replace(/[/\\\\]/g, "[/\\\\]")}[/\\\\].*`);
const block = config.resolver.blockList;
config.resolver.blockList = [...(Array.isArray(block) ? block : block ? [block] : []), video];

module.exports = config;
