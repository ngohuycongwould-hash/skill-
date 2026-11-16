#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ASSET_KEYS = ['wallpaper', 'sticker', 'cornerSvg', 'userAvatar', 'agentAvatar'];
const PLACEHOLDER = '/*__THEMES_PLACEHOLDER__*/{}';

function encodeSvg(svgPath) {
    const svgText = fs.readFileSync(svgPath, 'utf8');
    return 'data:image/svg+xml,' + encodeURIComponent(svgText);
}

function encodeRaster(imgPath) {
    const raw = fs.readFileSync(imgPath);
    const ext = path.extname(imgPath).toLowerCase();
    let mime = 'image/png';
    if (ext === '.webp') mime = 'image/webp';
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.svg') mime = 'image/svg+xml';
    return `data:${mime};base64,${raw.toString('base64')}`;
}

function resolveAssetValue(val, themesDir) {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    const resolvedPath = path.isAbsolute(trimmed) ? trimmed : path.resolve(themesDir, trimmed);
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Theme asset not found: ${trimmed} (resolved: ${resolvedPath})`);
    }
    if (path.extname(resolvedPath).toLowerCase() === '.svg') {
        return encodeSvg(resolvedPath);
    }
    return encodeRaster(resolvedPath);
}

function buildPayload(themesPath, enginePath, outPath) {
    if (!fs.existsSync(themesPath)) throw new Error(`themes.json not found: ${themesPath}`);
    if (!fs.existsSync(enginePath)) throw new Error(`core.js not found: ${enginePath}`);

    const themesRaw = JSON.parse(fs.readFileSync(themesPath, 'utf8'));
    const themesDir = path.dirname(themesPath);
    const resolvedThemes = {};

    for (const [name, cfg] of Object.entries(themesRaw)) {
        const copied = { ...cfg };
        for (const key of ASSET_KEYS) {
            if (key in copied) {
                copied[key] = resolveAssetValue(copied[key], themesDir);
            }
        }
        resolvedThemes[name] = copied;
    }

    const engineSrc = fs.readFileSync(enginePath, 'utf8');
    if (!engineSrc.includes(PLACEHOLDER)) {
        throw new Error(`Placeholder ${PLACEHOLDER} not found in ${enginePath}`);
    }

    const themesJson = JSON.stringify(resolvedThemes);
    const compiled = engineSrc.replace(PLACEHOLDER, themesJson);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, compiled, 'utf8');

    const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`[build_payload] Built ${outPath} (${sizeKb} KB) with ${Object.keys(resolvedThemes).length} theme(s): ${Object.keys(resolvedThemes).join(', ')}`);
}

const repoRoot = path.resolve(__dirname, '..');
const themesPath = path.join(repoRoot, 'themes', 'themes.json');
const enginePath = path.join(repoRoot, 'engine', 'core.js');
const outPath = path.join(repoRoot, 'dist', 'theme_payload.js');

buildPayload(themesPath, enginePath, outPath);
