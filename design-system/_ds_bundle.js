/* @ds-bundle: {"format":4,"namespace":"GenerativeGlassDesignSystem_830e44","components":[{"name":"AuroraField","sourcePath":"components/glass/AuroraField.jsx"},{"name":"DotRing","sourcePath":"components/glass/DotRing.jsx"},{"name":"Filament","sourcePath":"components/glass/Filament.jsx"},{"name":"GlassButton","sourcePath":"components/glass/GlassButton.jsx"},{"name":"GlassChip","sourcePath":"components/glass/GlassChip.jsx"},{"name":"GlassIconButton","sourcePath":"components/glass/GlassIconButton.jsx"},{"name":"GlassInput","sourcePath":"components/glass/GlassInput.jsx"},{"name":"GlassSurface","sourcePath":"components/glass/GlassSurface.jsx"},{"name":"StatusBar","sourcePath":"components/glass/StatusBar.jsx"},{"name":"Icon","sourcePath":"components/icons/Icon.jsx"},{"name":"MapCanvas","sourcePath":"ui_kits/travel-assistant/components/night/MapCanvas.jsx"},{"name":"NightActionBar","sourcePath":"ui_kits/travel-assistant/components/night/NightActionBar.jsx"},{"name":"RouteList","sourcePath":"ui_kits/travel-assistant/components/night/RouteList.jsx"},{"name":"SpotHero","sourcePath":"ui_kits/travel-assistant/components/night/SpotHero.jsx"},{"name":"Avatar","sourcePath":"ui_kits/travel-assistant/components/travel/Avatar.jsx"},{"name":"CategoryTile","sourcePath":"ui_kits/travel-assistant/components/travel/CategoryTile.jsx"},{"name":"DestinationCard","sourcePath":"ui_kits/travel-assistant/components/travel/DestinationCard.jsx"},{"name":"FlightCard","sourcePath":"ui_kits/travel-assistant/components/travel/FlightCard.jsx"},{"name":"RouteArc","sourcePath":"ui_kits/travel-assistant/components/travel/RouteArc.jsx"},{"name":"SuggestionPill","sourcePath":"ui_kits/travel-assistant/components/travel/SuggestionPill.jsx"},{"name":"WeatherPill","sourcePath":"ui_kits/travel-assistant/components/travel/WeatherPill.jsx"}],"sourceHashes":{"components/glass/AuroraField.jsx":"f270ec0f5e49","components/glass/DotRing.jsx":"cefae187c3fb","components/glass/Filament.jsx":"1a5fa0ae608a","components/glass/GlassButton.jsx":"e65f88f7665f","components/glass/GlassChip.jsx":"0199692d68a4","components/glass/GlassIconButton.jsx":"1bfed28aa792","components/glass/GlassInput.jsx":"09d381870966","components/glass/GlassSurface.jsx":"40f59c419750","components/glass/StatusBar.jsx":"04a2a95cf03b","components/icons/Icon.jsx":"abefc0c24555","motion/animations-v3.jsx":"06ae64d470d6","motion/reel.jsx":"f5dd7fdcb5b2","motion/tweaks-panel.jsx":"d259e3a86f73","ui_kits/desktop-console/Inspector.jsx":"085e078a72ea","ui_kits/desktop-console/Sidebar.jsx":"c0a57881603f","ui_kits/desktop-console/Topbar.jsx":"1dbf091f6172","ui_kits/desktop-console/Workspace.jsx":"b12311f76c47","ui_kits/travel-assistant/BranchScreen.jsx":"022a49f2f3ab","ui_kits/travel-assistant/ChatScreen.jsx":"d86f861469c6","ui_kits/travel-assistant/FlightScreen.jsx":"6026a591ca6f","ui_kits/travel-assistant/HomeScreen.jsx":"c1132c748ec8","ui_kits/travel-assistant/MapScreen.jsx":"da7bc8fca7ae","ui_kits/travel-assistant/Shell.jsx":"fab48703fdc8","ui_kits/travel-assistant/SpotScreen.jsx":"947375c5c112","ui_kits/travel-assistant/components/night/MapCanvas.jsx":"03ee0f1c2b63","ui_kits/travel-assistant/components/night/NightActionBar.jsx":"2af9a90aec3d","ui_kits/travel-assistant/components/night/RouteList.jsx":"bf81aba5a867","ui_kits/travel-assistant/components/night/SpotHero.jsx":"40ba639aafb2","ui_kits/travel-assistant/components/travel/Avatar.jsx":"30d51349ea58","ui_kits/travel-assistant/components/travel/CategoryTile.jsx":"d5861347c82e","ui_kits/travel-assistant/components/travel/DestinationCard.jsx":"2ba01a1b4e28","ui_kits/travel-assistant/components/travel/FlightCard.jsx":"c576f22e62ce","ui_kits/travel-assistant/components/travel/RouteArc.jsx":"c11bca90827f","ui_kits/travel-assistant/components/travel/SuggestionPill.jsx":"9acaeca5359f","ui_kits/travel-assistant/components/travel/WeatherPill.jsx":"10e76bf5184e"},"inlinedExternals":[],"unexposedExports":[{"name":"iconNames","sourcePath":"components/icons/Icon.jsx"}]} */

(() => {

const __ds_ns = (window.GenerativeGlassDesignSystem_830e44 = window.GenerativeGlassDesignSystem_830e44 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/glass/AuroraField.jsx
try { (() => {
function AuroraField({
  intensity = 1,
  drift = true,
  style,
  children,
  ...rest
}) {
  return React.createElement('div', {
    style: {
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      height: '100%',
      background: 'var(--surface-app)',
      ...style
    },
    ...rest
  }, React.createElement('div', {
    'aria-hidden': true,
    style: {
      position: 'absolute',
      inset: '-18%',
      background: 'var(--aurora-field)',
      opacity: intensity,
      filter: 'blur(28px)',
      animation: drift ? 'gg-drift 22s var(--ease-liquid) infinite' : undefined
    }
  }), React.createElement('div', {
    style: {
      position: 'relative',
      height: '100%'
    }
  }, children));
}
Object.assign(__ds_scope, { AuroraField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/AuroraField.jsx", error: String((e && e.message) || e) }); }

// components/glass/DotRing.jsx
try { (() => {
function DotRing({
  size = 170,
  rings = 7,
  dots = 30,
  color = 'var(--dot-ring-stroke)',
  children,
  style,
  ...rest
}) {
  const pts = [];
  for (let r = 0; r < rings; r++) {
    const rad = size / 2 * (0.34 + 0.66 * (r / (rings - 1)));
    const n = Math.round(dots * (0.4 + 0.6 * (r / (rings - 1))));
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + r * 0.16;
      pts.push({
        x: size / 2 + Math.cos(a) * rad,
        y: size / 2 + Math.sin(a) * rad,
        o: 0.25 + 0.75 * (1 - r / rings)
      });
    }
  }
  return React.createElement('div', {
    style: {
      position: 'relative',
      width: size,
      height: size,
      ...style
    },
    ...rest
  }, React.createElement('svg', {
    width: size,
    height: size,
    style: {
      position: 'absolute',
      inset: 0,
      animation: 'gg-breathe 4.5s var(--ease-liquid) infinite'
    }
  }, pts.map((p, i) => React.createElement('circle', {
    key: i,
    cx: p.x,
    cy: p.y,
    r: .9,
    fill: color,
    opacity: p.o
  }))), React.createElement('div', {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'grid',
      placeItems: 'center'
    }
  }, children));
}
Object.assign(__ds_scope, { DotRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/DotRing.jsx", error: String((e && e.message) || e) }); }

// components/glass/Filament.jsx
try { (() => {
function Filament({
  height = 70,
  width = 120,
  branch = false,
  color = 'var(--filament-stroke)',
  node = true,
  style,
  ...rest
}) {
  const w = branch ? width : 2,
    mid = w / 2;
  const d = branch ? `M ${mid} 0 C ${mid} ${height * .55}, 8 ${height * .45}, 8 ${height} M ${mid} 0 C ${mid} ${height * .55}, ${w - 8} ${height * .45}, ${w - 8} ${height}` : `M 1 0 L 1 ${height}`;
  return React.createElement('svg', {
    width: w,
    height,
    viewBox: `0 0 ${w} ${height}`,
    style: {
      overflow: 'visible',
      ...style
    },
    ...rest
  }, React.createElement('path', {
    d,
    stroke: color,
    strokeWidth: 1,
    fill: 'none',
    strokeLinecap: 'round'
  }), node ? React.createElement('circle', {
    cx: mid,
    cy: height,
    r: 3.5,
    fill: 'var(--surface-solid)',
    stroke: color,
    strokeWidth: 1
  }) : null);
}
Object.assign(__ds_scope, { Filament });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/Filament.jsx", error: String((e && e.message) || e) }); }

// components/glass/GlassButton.jsx
try { (() => {
function GlassButton({
  variant = 'glass',
  size = 'md',
  full = false,
  leading,
  trailing,
  style,
  children,
  ...rest
}) {
  const pad = size === 'sm' ? '8px 14px' : size === 'lg' ? '15px 26px' : '12px 20px';
  const fs = size === 'sm' ? 'var(--fs-caption)' : size === 'lg' ? 'var(--fs-body)' : 'var(--fs-label)';
  const V = {
    glass: {
      background: 'var(--glass-fill-3)',
      color: 'var(--text-title)',
      border: 'var(--border-glass)',
      boxShadow: 'var(--shadow-rest), var(--inner-top)'
    },
    solid: {
      background: 'var(--paper-000)',
      color: 'var(--ink-900)',
      border: '.5px solid rgba(255,255,255,.9)',
      boxShadow: 'var(--shadow-card)'
    },
    dark: {
      background: 'var(--surface-inverse)',
      color: 'var(--text-on-inverse)',
      border: '.5px solid rgba(255,255,255,.14)',
      boxShadow: 'var(--shadow-card)'
    },
    night: {
      background: 'var(--glass-fill-night)',
      color: 'var(--on-night-900)',
      border: 'var(--border-night)',
      boxShadow: 'var(--shadow-night)',
      backdropFilter: 'blur(var(--blur-medium))',
      WebkitBackdropFilter: 'blur(var(--blur-medium))'
    },
    quiet: {
      background: 'transparent',
      color: 'var(--text-muted)',
      border: '.5px solid transparent',
      boxShadow: 'none'
    }
  }[variant];
  const [h, setH] = React.useState(false),
    [a, setA] = React.useState(false);
  return React.createElement('button', {
    onMouseEnter: () => setH(true),
    onMouseLeave: () => {
      setH(false);
      setA(false);
    },
    onMouseDown: () => setA(true),
    onMouseUp: () => setA(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--gap-inline)',
      width: full ? '100%' : undefined,
      padding: pad,
      borderRadius: 'var(--r-pill)',
      cursor: 'pointer',
      font: `var(--fw-semibold) ${fs}/1 var(--font-core)`,
      letterSpacing: 'var(--ls-body)',
      transition: 'var(--t-hover)',
      transform: a ? 'scale(var(--press-scale))' : h ? 'var(--hover-lift)' : 'none',
      filter: h ? 'brightness(1.04)' : 'none',
      ...V,
      ...style
    },
    ...rest
  }, leading, children, trailing);
}
Object.assign(__ds_scope, { GlassButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/GlassButton.jsx", error: String((e && e.message) || e) }); }

// components/glass/GlassChip.jsx
try { (() => {
function GlassChip({
  leading,
  tone = 'light',
  size = 'md',
  style,
  children,
  ...rest
}) {
  const night = tone === 'night',
    bare = tone === 'bare';
  return React.createElement('span', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--sp-3)',
      padding: bare ? '4px 0' : size === 'sm' ? '4px 9px' : '5px 11px',
      borderRadius: 'var(--r-pill)',
      background: bare ? 'none' : night ? 'rgba(255,255,255,.16)' : 'var(--glass-fill-3)',
      color: night ? 'var(--on-night-900)' : 'var(--text-muted)',
      border: bare ? 'none' : night ? '.5px solid rgba(255,255,255,.18)' : 'var(--border-glass)',
      backdropFilter: bare ? 'none' : 'blur(var(--blur-soft))',
      WebkitBackdropFilter: bare ? 'none' : 'blur(var(--blur-soft))',
      font: `var(--fw-medium) ${size === 'sm' ? 'var(--fs-overline)' : 'var(--fs-micro)'}/1.1 var(--font-core)`,
      letterSpacing: '.01em',
      ...style
    },
    ...rest
  }, leading, children);
}
Object.assign(__ds_scope, { GlassChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/GlassChip.jsx", error: String((e && e.message) || e) }); }

// components/glass/GlassIconButton.jsx
try { (() => {
function GlassIconButton({
  size = 52,
  tone = 'light',
  label,
  style,
  children,
  ...rest
}) {
  const [h, setH] = React.useState(false),
    [a, setA] = React.useState(false);
  const night = tone === 'night',
    dark = tone === 'dark';
  return React.createElement('button', {
    'aria-label': label,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => {
      setH(false);
      setA(false);
    },
    onMouseDown: () => setA(true),
    onMouseUp: () => setA(false),
    style: {
      width: size,
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--r-pill)',
      cursor: 'pointer',
      flex: 'none',
      background: dark ? 'var(--surface-inverse)' : night ? 'var(--glass-fill-night)' : 'var(--glass-fill-3)',
      color: dark ? 'var(--text-on-inverse)' : night ? 'var(--on-night-900)' : 'var(--text-body)',
      border: night ? 'var(--border-night)' : dark ? '.5px solid rgba(255,255,255,.14)' : 'var(--border-glass)',
      backdropFilter: 'blur(var(--blur-medium)) var(--sat-glass)',
      WebkitBackdropFilter: 'blur(var(--blur-medium)) var(--sat-glass)',
      boxShadow: night || dark ? 'var(--shadow-night)' : `var(--shadow-rest), var(--inner-top)${h ? ', var(--glow-focus)' : ''}`,
      transition: 'var(--t-hover)',
      transform: a ? 'scale(var(--press-scale))' : h ? 'var(--hover-lift)' : 'none',
      ...style
    },
    ...rest
  }, children);
}
Object.assign(__ds_scope, { GlassIconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/GlassIconButton.jsx", error: String((e && e.message) || e) }); }

// components/glass/GlassInput.jsx
try { (() => {
function GlassInput({
  placeholder = 'Type a message',
  value,
  onChange,
  leading,
  trailing,
  height = 58,
  style,
  ...rest
}) {
  const [f, setF] = React.useState(false);
  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-6)',
      height,
      padding: '0 var(--sp-9)',
      borderRadius: 'var(--r-pill)',
      background: 'var(--glass-fill-2)',
      border: 'var(--border-glass)',
      backdropFilter: 'blur(var(--blur-strong)) var(--sat-glass)',
      WebkitBackdropFilter: 'blur(var(--blur-strong)) var(--sat-glass)',
      boxShadow: f ? 'var(--shadow-rest), var(--inner-top), var(--glow-focus)' : 'var(--shadow-rest), var(--inner-top)',
      transition: 'var(--t-hover)',
      ...style
    }
  }, leading, React.createElement('input', {
    value,
    onChange,
    placeholder,
    onFocus: () => setF(true),
    onBlur: () => setF(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      font: 'var(--type-body)',
      color: 'var(--text-title)'
    },
    ...rest
  }), trailing);
}
Object.assign(__ds_scope, { GlassInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/GlassInput.jsx", error: String((e && e.message) || e) }); }

// components/glass/GlassSurface.jsx
try { (() => {
const FILL = {
  1: 'var(--glass-fill-1)',
  2: 'var(--glass-fill-2)',
  3: 'var(--glass-fill-3)',
  4: 'var(--glass-fill-4)'
};
const BLUR = {
  sheer: 'var(--blur-sheer)',
  soft: 'var(--blur-soft)',
  medium: 'var(--blur-medium)',
  strong: 'var(--blur-strong)',
  heavy: 'var(--blur-heavy)'
};
const RAD = {
  sm: 'var(--r-sm)',
  md: 'var(--r-md)',
  lg: 'var(--r-lg)',
  xl: 'var(--r-xl)',
  '2xl': 'var(--r-2xl)',
  pill: 'var(--r-pill)'
};
const SHADOW = {
  none: 'none',
  rest: 'var(--shadow-rest)',
  card: 'var(--shadow-card)',
  float: 'var(--shadow-float)'
};
function GlassSurface({
  level = 2,
  blur = 'medium',
  radius = 'xl',
  shadow = 'card',
  tone = 'light',
  refraction = true,
  float = false,
  as = 'div',
  style,
  children,
  ...rest
}) {
  const night = tone === 'night';
  const s = {
    position: 'relative',
    background: night ? level >= 3 ? 'var(--glass-fill-night-strong)' : 'var(--glass-fill-night)' : FILL[level],
    backdropFilter: `blur(${BLUR[blur]}) var(--sat-glass)`,
    WebkitBackdropFilter: `blur(${BLUR[blur]}) var(--sat-glass)`,
    border: night ? 'var(--border-night)' : 'var(--border-glass)',
    borderRadius: RAD[radius] || radius,
    boxShadow: night ? 'var(--shadow-night), var(--inner-top-night)' : `${SHADOW[shadow]}, var(--inner-top), var(--inner-edge)`,
    color: night ? 'var(--text-on-night)' : 'var(--text-body)',
    animation: float ? 'gg-float var(--float-cycle) var(--ease-liquid) infinite' : undefined,
    ...style
  };
  return React.createElement(as, {
    style: s,
    ...rest
  }, refraction ? React.createElement('span', {
    'aria-hidden': true,
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      background: night ? 'var(--refraction-night)' : 'var(--refraction)',
      opacity: night ? 1 : .6,
      pointerEvents: 'none'
    }
  }) : null, children);
}
Object.assign(__ds_scope, { GlassSurface });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/GlassSurface.jsx", error: String((e && e.message) || e) }); }

// components/glass/StatusBar.jsx
try { (() => {
function StatusBar({
  time = '9:41',
  tone = 'light',
  style,
  ...rest
}) {
  const c = tone === 'night' ? 'var(--paper-000)' : 'var(--text-title)';
  const bar = h => React.createElement('rect', {
    width: 3,
    height: h,
    y: 11 - h,
    rx: 1,
    fill: c
  });
  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px var(--sp-11) 0',
      font: 'var(--fw-semibold) 15px/1 var(--font-numeric)',
      color: c,
      ...style
    },
    ...rest
  }, React.createElement('span', null, time), React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, React.createElement('svg', {
    width: 18,
    height: 11
  }, [4, 6, 8.5, 11].map((h, i) => React.createElement('g', {
    key: i,
    transform: `translate(${i * 4.6},0)`
  }, bar(h)))), React.createElement('svg', {
    width: 16,
    height: 12,
    viewBox: '0 0 16 12',
    fill: c
  }, React.createElement('path', {
    d: 'M8 10.4 5.6 8a3.4 3.4 0 0 1 4.8 0zM8 6.2a5.7 5.7 0 0 0-4 1.6L2.6 6.4a7.7 7.7 0 0 1 10.8 0L12 7.8a5.7 5.7 0 0 0-4-1.6zM8 2.2a9.7 9.7 0 0 0-6.8 2.8L0 3.7a11.5 11.5 0 0 1 16 0L14.8 5A9.7 9.7 0 0 0 8 2.2z'
  })), React.createElement('svg', {
    width: 25,
    height: 12,
    viewBox: '0 0 25 12'
  }, React.createElement('rect', {
    x: .5,
    y: .5,
    width: 21,
    height: 11,
    rx: 3.2,
    fill: 'none',
    stroke: c,
    opacity: .4
  }), React.createElement('rect', {
    x: 2,
    y: 2,
    width: 18,
    height: 8,
    rx: 2,
    fill: c
  }), React.createElement('path', {
    d: 'M23 4.2v3.6a2 2 0 0 0 0-3.6z',
    fill: c,
    opacity: .4
  }))));
}
Object.assign(__ds_scope, { StatusBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/StatusBar.jsx", error: String((e && e.message) || e) }); }

// components/icons/Icon.jsx
try { (() => {
// Glyph outlines are Lucide (MIT, lucide.dev) — the source frames ship no icon set,
// so Lucide is the flagged substitution: 24px grid, 2px round stroke, no fills.
const P = {
  mic: ['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3'],
  navigation: ['M3 11l19-9-9 19-2-8-8-2z'],
  plus: ['M5 12h14', 'M12 5v14'],
  chevronLeft: ['M15 18l-6-6 6-6'],
  chevronRight: ['M9 18l6-6-6-6'],
  arrowUpRight: ['M7 17L17 7', 'M7 7h10v10'],
  bookmark: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
  maximize: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
  minimize: ['M8 3v3a2 2 0 0 1-2 2H3', 'M21 8h-3a2 2 0 0 1-2-2V3', 'M3 16h3a2 2 0 0 1 2 2v3', 'M16 21v-3a2 2 0 0 1 2-2h3'],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  sun: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M12 4V2', 'M12 22v-2', 'M4 12H2', 'M22 12h-2', 'M6.3 6.3L4.9 4.9', 'M19.1 19.1l-1.4-1.4', 'M6.3 17.7l-1.4 1.4', 'M19.1 4.9l-1.4 1.4'],
  delete: ['M20 6H9l-5 6 5 6h11a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z', 'M16 10l-4 4', 'M12 10l4 4'],
  shift: ['M12 3l8 9h-4v7H8v-7H4z'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  compass: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M16.2 7.8l-2.2 6.4-6.4 2.2 2.2-6.4z'],
  sparkle: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z'],
  // Added for the desktop console surface — same Lucide set, same 24px/2px grid.
  check: ['M20 6L9 17l-5-5'],
  chevronDown: ['M6 9l6 6 6-6'],
  filter: ['M22 3H2l8 9.5V19l4 2v-8.5z'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 8a1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V8a1.7 1.7 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M22 21v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
  folder: ['M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.9 3.9A2 2 0 0 0 8.2 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z'],
  ellipsis: ['M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2', 'M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2', 'M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2'],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.9 1.9 0 0 0 3.4 0'],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  globe: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z'],
  layers: ['M12 2L2 7l10 5 10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5']
};
function Icon({
  name,
  size = 20,
  stroke = 1.7,
  color = 'currentColor',
  style,
  ...rest
}) {
  const d = P[name];
  if (!d) return null;
  return React.createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: {
      display: 'block',
      flex: 'none',
      ...style
    },
    ...rest
  }, d.map((p, i) => React.createElement('path', {
    key: i,
    d: p
  })));
}
const iconNames = Object.keys(P);
Object.assign(__ds_scope, { Icon, iconNames });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/icons/Icon.jsx", error: String((e && e.message) || e) }); }

// motion/animations-v3.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// animations-v3.jsx — continuous-composition animation engine.
//
// THE MODEL: the animation is ONE element tree rendered as a pure function
// of one authored-time axis. Nothing mounts or unmounts at section
// boundaries, so any element can move, morph, or persist across them by
// ordinary interpolation. The scene list (OM_SCENES) is the user-control
// view — names, order, playback durations — and the engine derives the cue
// table from it, so structure has exactly one source and cannot drift.
//
// API INDEX (every export is a window global):
//   <CompositionStage width height scenes={window.OM_SCENES}
//                     playback={window.OM_PLAYBACK} bg>
//     <Piece />   — ONE component, the whole animation
//   </CompositionStage>
//   useComposition() -> {T, CUES, time, duration, authoredTotal, playing}
//     T: authored seconds (warped per-section by user trims/speeds) —
//        key ALL choreography to T, never to wall-clock time
//     CUES: {SectionName: authoredStart} derived from OM_SCENES; an unknown
//        name returns NaN and raises a preview-only badge (never exports);
//        duplicate section names bind to the first occurrence
//   <Shot from={CUES.Build} to={CUES.Close}> — children visible between two
//     authored times (an authored hard cut in one line); children stay
//     mounted (media keeps its readiness) and are hidden outside the window
//   <Captions items={[{at, until?, text}, ...]} /> — ONE caption element,
//     at most one visible at a time, keyed to T; 'until' defaults to the
//     next item's 'at'; a last item with no 'until' stays to the end
//   WATERCOLOR (only when the Watercolor illustration skill is active —
//   otherwise ignore these entries). A painting is a function(p) written
//   against the paint kit, on a width x height sheet; it needs
//   watercolor_kit.js loaded by a <script> tag before this engine, must
//   be a stable function defined once (module scope, never an inline
//   arrow), and every component below renders <img> elements, so it all
//   exports by construction.
//   <WatercolorPainting painting={fn} from={CUES.X} to={CUES.Y} width height
//     seed scale quality style /> — the painting assembled from its own
//     STROKES: each wash / ink line / splatter is a separate layer
//     stacked over the paper, appearing in painting order between two
//     authored times (washes bloom in, ink draws tip to tail). This is the
//     default way to show a watercolor being painted. It keeps the sheet's
//     aspect ratio (size it with style, e.g. {position:'absolute', left,
//     top, width}). scale is the layers' render resolution over width x
//     height (default 1, a deliberate weight-over-dpi trade — raise it
//     toward the zoom factor if the composition zooms into the painting,
//     or toward the devicePixelRatio for a hero-sized sheet); quality is
//     0..1 layer image quality (default 0.92; 1 is the encoder's maximum).
//   useWatercolorLayers(fn, {width, height, seed, scale, quality}) -> L
//     (null if the kit isn't loaded — load watercolor_kit.js before the
//     engine — or if the painting fails to build) — the painting taken apart into strokes, for
//     choreography beyond in-order painting: L.count strokes, L.kind(i)
//     ('wash' | 'gradedWash' | 'glaze' | 'ink' | 'hatch' | 'splatter' |
//     'dryStroke' | 'reserve' | 'caption'), L.span(i) = the stroke's
//     {from, to} share of the painting's 0..1 timeline; call L.warm()
//     once after load so finished strokes pre-render off the critical
//     path (WatercolorPainting does this itself). Compose with:
//   <WatercolorSheet layers={L} style>children</WatercolorSheet> — the
//     paper the strokes sit on (keeps the sheet's aspect ratio), and
//   <WatercolorStroke index={i} at={0..1} style /> — stroke i as its own
//     element, placed where it was painted; at is its painting progress
//     (0 hidden, 1 finished — drive it from T with animate()); style lets
//     you move, scale, rotate, or fade the stroke (transform / opacity).
//     Strokes are paint, so they multiply: overlapping strokes darken
//     where they cross, as in the still image, within a few 8-bit levels
//     (tighter still at quality 1). The sheet clips to its
//     box — for strokes that fly in from outside it, set
//     style={{overflow: 'visible'}} on the WatercolorSheet. 'reserve' strokes
//     are erasures (lifted paper) — keep them where they were painted and
//     reveal them in order after the strokes they erase; moving an erase
//     around has no sensible meaning.
//   <WatercolorReveal painting={fn} from={CUES.X} to={CUES.Y} width height
//     seed steps scale format quality style />, or <WatercolorReveal
//     frames={[src, ...]} from to /> — the whole painting as ONE flat
//     image that paints on (frames pre-baked in the background, so it is
//     the lightest option and the one to zoom or pan over as a single
//     picture). Prefer WatercolorPainting when the strokes themselves
//     should appear one by one or be individually animated. format is
//     the image MIME type (default image/jpeg), quality 0..1 (default
//     0.88). Frames bake at width x height times scale (default: the
//     device pixel ratio, capped at 2) — if the composition zooms INTO
//     the painting, raise scale toward the maximum zoom so frames stay
//     crisp. The kit caps a sheet at ~12M pixels and the components clamp
//     scale to stay under it; exported video sharpness also depends on
//     the export dialog's own resolution choice.
//   Motion: Easing.{linear, easeIn|Out|InOutQuad/Cubic/Quart/Expo/Sine,
//     easeIn|Out|InOutBack, easeOutElastic}, interpolate(input, output, ease),
//     animate({from, to, start, end, ease}) -> fn(T), clamp(v, min, max)
//   Plumbing (rarely needed): Stage, PlaybackBar, TimelineContext,
//     useTime, useTimeline
//   Seek event (host/export transport): 'data-om-seek-to-time-frame',
//     detail {time, sync, playing} — the stage owns it; never implement it
//     yourself
//
// THE AUTHORING CONTRACT — this is what makes the host timeline's trim and
// speed gestures write back into YOUR file, so follow it exactly:
//   1. Declare the scene list as a JSON string literal in a plain inline
//      <script> of the main document (NOT type="text/babel", NOT a sibling
//      .jsx — only vanilla inline scripts are addressable for write-back):
//        <script>window.OM_SCENES = '[{"name":"Opening","dur":3,"desc":"The logo fades in and the title settles"},{"name":"Build","dur":5,"desc":"Bars grow to their final values"}]';</script>
//      Give every entry a "desc": one short plain-words sentence saying
//      what happens in that section. The user reads it in the timeline's
//      section popover — keep it true whenever you edit the section.
//   2. Pass the string through untouched:
//        <CompositionStage scenes={window.OM_SCENES} ...>
//   3. ALSO declare the playback setting the same way:
//        <script>window.OM_PLAYBACK = '{"mode":"loop"}';</script>
//      and pass it through untouched (values: '{"mode":"loop"}' or
//      '{"mode":"times","count":N}'; omitting keeps loop behavior but
//      leaves the host Repeat control read-only for this document).
//   IMPORTANT — the exportable-video contract: CompositionStage/Stage OWNS
//   it (the data-om-exportable-video-with-duration-secs attribute, the
//   data-om-seek-to-time-frame listener, the svg/foreignObject wrapper,
//   and font inlining). NEVER put the exportable attribute on any other
//   element — a second "exportable root" makes the host timeline and the
//   video exporter bind to the wrong element, and playback control /
//   export silently break.
//
// HOW TIME WORKS: each OM_SCENES entry is a named slice of the authored
// timeline. CUES.Name is that section's authored start (the running sum of
// authored lengths, in literal order). useComposition().T is the authored
// clock: when the user trims or speeds a section on the host timeline, the
// engine replays that section's SAME authored slice over the new playback
// length — your choreography retimes, never cuts off. The optional "nat"
// field on an entry is the engine's authored-length anchor — the host
// timeline stamps it on the first retime; don't set it by hand.
//
// CUE-FIRST DISCIPLINE (what makes a piece read as one continuous video):
//   1. Write the OM_SCENES literal FIRST — it is the piece's outline.
//   2. One helper component per section for readability, but ALL of them
//      render ALL the time inside the one tree, keyed to CUES — never
//      conditionally mounted per section.
//   3. Define exactly three motion helpers up front (e.g.
//      MOTION = {enter, draw, pop} wrapping Easing curves) and use no
//      easing or transform outside them; one caption element, one visible
//      at a time (<Captions> has this built in).
//   A shared element that crosses a boundary is just motion whose start
//   and end straddle a cue: animate({from, to, start: CUES.Build - 0.4,
//   end: CUES.Build + 0.6})(T) glides through the boundary, and a user
//   slowing either section slows the glide without breaking it.
//
// RENDER FROM T ONLY: the exporter seeks each frame with a synchronous
// commit and may serialize the stage the moment the seek event returns —
// anything painted from useEffect or your own requestAnimationFrame lags
// that commit and exports stale. Render everything visible from T and this
// is automatic. A seeked frame is a deterministic render at that time.
//
// HARD CUTS are content now, not structure: wrap a shot's elements in
// <Shot from to> (visibility toggles at the cues; children stay mounted so
// images and videos hold their readiness). Shot also doubles as the
// perf gate for heavy far-away beats.
//
// LOOP SEAMS are the one surviving boundary rule: a looping piece shows
// its last authored frame immediately before its first — make them match
// (settle your choreography by authoredTotal, open it at 0).
//
// DIAGNOSTICS: choreography that references an unknown section name (a
// rename or deletion in OM_SCENES) shows a badge below the stage in the
// preview, outside the exportable svg — visible in preview screenshots,
// never in the exported video. An OM_SCENES section with no choreography
// keyed to it is a valid empty beat, not an error.
/* END USAGE */

// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: t => t,
  // Quad
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  // Cubic
  easeInCubic: t => t * t * t,
  easeOutCubic: t => --t * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  // Quart
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - --t * t * t * t,
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  // Expo
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },
  // Sine
  easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: t => Math.sin(t * Math.PI / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  // Back (overshoot)
  easeOutBack: t => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: t => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: t => {
    const c1 = 1.70158,
      c2 = c1 * 1.525;
    return t < 0.5 ? Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  // Elastic
  easeOutElastic: t => {
    const c4 = 2 * Math.PI / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return t => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? ease[i] || Easing.linear : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({
  from = 0,
  to = 1,
  start = 0,
  end = 1,
  ease = Easing.easeInOutCubic
}) {
  return t => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({
  time: 0,
  duration: 10,
  playing: false
});
const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// How long a marked (detail.playing === true) host seek keeps the
// external-playback latch alive with no successor. The host play bar's
// seek pump is one-in-flight/latest-wins, so its inter-seek gap is tens
// of milliseconds in the worst case — 400ms is far above that, so a
// marked stream that dies mid-play decays the latch promptly.
var SS_EXT_PLAY_MS = 400;

// ── Font inlining ───────────────────────────────────────────────────────────
// Copy every @font-face rule from the page into a <style> inside the svg's
// foreignObject, with font URLs rewritten to data: URLs. Makes the svg
// self-describing so serializing it alone (video export fast path) still
// renders with the right fonts. Sets data-om-fonts-inlined on the svg when
// done so the exporter can wait for it.

function useInlineFontsInto(svgRef) {
  React.useEffect(() => {
    const svg = svgRef.current;
    const host = svg && svg.querySelector('foreignObject > div');
    if (!svg || !host) return;
    let cancelled = false;
    (async () => {
      const rules = [];
      for (const ss of document.styleSheets) {
        let cssRules;
        try {
          cssRules = ss.cssRules;
        } catch {
          // Cross-origin sheet without crossorigin attr (e.g. the standard
          // fonts.googleapis.com <link>) — fetch the CSS text directly and
          // regex-extract the @font-face blocks.
          if (ss.href) {
            try {
              const txt = await fetch(ss.href).then(r => {
                if (!r.ok) throw 0;
                return r.text();
              });
              for (const ff of txt.match(/@font-face\s*{[^}]*}/g) || []) rules.push({
                css: ff,
                base: ss.href
              });
            } catch {}
          }
          continue;
        }
        if (!cssRules) continue;
        for (const r of cssRules) {
          if (r.type === CSSRule.FONT_FACE_RULE) {
            rules.push({
              css: r.cssText,
              base: ss.href || location.href
            });
          }
        }
      }
      const toDataURL = url => fetch(url).then(r => {
        if (!r.ok) throw 0;
        return r.blob();
      }).then(b => new Promise(res => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = () => res(url);
        fr.readAsDataURL(b);
      })).catch(() => url);
      const parts = await Promise.all(rules.map(async ({
        css,
        base
      }) => {
        const re = /url\((['"]?)([^'")]+)\1\)/g;
        let out = css,
          m;
        while (m = re.exec(css)) {
          const u = m[2];
          if (u.startsWith('data:')) continue;
          let abs;
          try {
            abs = new URL(u, base).href;
          } catch {
            continue;
          }
          out = out.split(m[0]).join(`url("${await toDataURL(abs)}")`);
        }
        return out;
      }));
      if (cancelled || !parts.length) {
        svg.setAttribute('data-om-fonts-inlined', 'true');
        return;
      }
      const style = document.createElement('style');
      style.textContent = parts.join('\n');
      host.insertBefore(style, host.firstChild);
      svg.setAttribute('data-om-fonts-inlined', 'true');
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  // Parsed playback object ({mode:'loop'} | {mode:'times',count:N}) or
  // null. When present it overrides the legacy loop prop — CompositionStage
  // passes the validated value from the OM_PLAYBACK authoring contract.
  playback = null,
  persistKey = 'animstage-v3',
  children
}) {
  // Props arrive as strings when Stage is mounted via <x-import> (DC
  // projects) — coerce so style={{width}} gets a number React can px-ify.
  width = +width || 1280;
  height = +height || 720;
  duration = +duration || 10;
  fps = +fps || 60;
  if (typeof loop === 'string') loop = loop !== 'false';
  if (typeof autoplay === 'string') autoplay = autoplay !== 'false';
  const playTimes = playback && playback.mode === 'times' ? playback.count : null;
  const loopEff = playback ? playback.mode === 'loop' : loop;
  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch {
      return 0;
    }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  // The external-playback latch: true while the HOST play bar is driving
  // time forward as genuine continuous playback (its play-loop seeks
  // carry detail.playing === true). The engine's own clock stays paused
  // the whole time — exactly one clock ever drives — so this is a
  // separate bit, not a second meaning for `playing`. Set and cleared
  // in the seek handler below; decays via SS_EXT_PLAY_MS when the
  // marked stream stops without a parting unmarked seek.
  const [extPlay, setExtPlay] = React.useState(false);
  const extPlayTimerRef = React.useRef(null);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);
  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    try {
      localStorage.setItem(persistKey + ':t', String(time));
    } catch {}
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44; // playback bar height
      const s = Math.min(el.clientWidth / width, (el.clientHeight - barH) / height);
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height]);

  // Passes completed since playback last started. Lives in a ref so the
  // per-frame wrap can count without re-running this effect; reset on
  // every (re)start so a fresh play (or a host restart) gets the full
  // run count again.
  const passesRef = React.useRef(0);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    passesRef.current = 0;
    const step = ts => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime(t => {
        let next = t + dt;
        if (next >= duration) {
          if (playTimes !== null) {
            // Play N times then hold the last frame — the partial pass a
            // mid-timeline start produces counts as a pass, so the piece
            // never runs longer than N full durations.
            passesRef.current += 1;
            if (passesRef.current >= playTimes) {
              next = duration;
              setPlaying(false);
            } else {
              next = next % duration;
            }
          } else if (loopEff) {
            next = next % duration;
          } else {
            next = duration;
            setPlaying(false);
          }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loopEff, playTimes]);

  // Keyboard: space = play/pause, ← → = seek
  React.useEffect(() => {
    const onKey = e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  // Video-export protocol + the editor's play bar: hosts dispatch this
  // event per frame; pause + sync the playhead so the frame shows exactly
  // that timestamp. The host play bar marks its play-loop seeks with
  // detail.playing === true — the mark latches extPlay (playback is
  // playback even when a host clock drives it), while ANY unmarked seek
  // (scrub, step, export frame, the transport's pause park) clears the
  // latch in the same commit it retimes, so a seeked frame still renders
  // exactly one scene's state. The engine's own clock pauses either way.
  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    // Sync-seek capability: a dispatcher that marks its seek with
    // detail.sync === true gets the commit applied via ReactDOM.flushSync,
    // so the stage DOM reflects the seeked frame the moment dispatchEvent
    // returns. The video exporter keys off the data-om-sync-seek
    // advertisement to drop its two-display-refresh settle (that wait only
    // exists to let React's async commit land — serialization needs the
    // committed DOM, not the paint). Feature-detected: a runtime without
    // ReactDOM.flushSync never advertises and every seek takes the async
    // path. Unmarked seeks (scrubs, the host play bar) stay async — a
    // forced sync render per pointermove would tax the editor for no one.
    const canSyncSeek = typeof ReactDOM !== 'undefined' && typeof ReactDOM.flushSync === 'function';
    const onSeek = e => {
      const apply = () => {
        setPlaying(false);
        const hostPlay = !!(e.detail && e.detail.playing === true);
        if (extPlayTimerRef.current) {
          clearTimeout(extPlayTimerRef.current);
          extPlayTimerRef.current = null;
        }
        if (hostPlay) {
          // Watchdog: the latch is only as alive as its seek stream. If the
          // host stops without a parting seek (tab jank, bar unmount), the
          // latch decays on its own rather than stranding extPlaying true.
          extPlayTimerRef.current = setTimeout(() => {
            extPlayTimerRef.current = null;
            setExtPlay(false);
          }, SS_EXT_PLAY_MS);
        }
        setExtPlay(hostPlay);
        setTime(clamp(e.detail.time, 0, duration));
      };
      // flushSync is safe here: a native DOM listener runs outside React's
      // lifecycle, and the exporter's dispatchEvent is synchronous, so the
      // commit lands in the same JS task — the engine's own rAF loop can
      // never interleave between seek and serialize.
      if (canSyncSeek && e.detail && e.detail.sync === true) {
        ReactDOM.flushSync(apply);
      } else {
        apply();
      }
    };
    el.addEventListener('data-om-seek-to-time-frame', onSeek);
    if (canSyncSeek) el.setAttribute('data-om-sync-seek', 'true');
    return () => {
      el.removeEventListener('data-om-seek-to-time-frame', onSeek);
      el.removeAttribute('data-om-sync-seek');
      if (extPlayTimerRef.current) {
        clearTimeout(extPlayTimerRef.current);
        extPlayTimerRef.current = null;
      }
      // Drop the latch too: this cleanup runs on every duration change
      // (an agent edit can retime mid-host-play, no gesture involved) and
      // the new effect instance arms no watchdog — clearing only the
      // timer could strand extPlay true forever if the marked stream died
      // in the gap. Fail toward cut: the next marked seek re-latches.
      setExtPlay(false);
    };
  }, [duration]);

  // Inline @font-face rules into the svg's foreignObject so the svg is
  // self-describing — serializing it alone (for video export) then renders
  // with the right fonts. Sets data-om-fonts-inlined once done.
  useInlineFontsInto(canvasRef);
  const displayTime = hoverTime != null ? hoverTime : time;
  const ctxValue = React.useMemo(
  // extPlaying is ADDITIVE: "time is advancing under an external
  // driver's continuous playback". `playing` keeps meaning the
  // engine's OWN clock — the hidden PlaybackBar glyph (and through it
  // the host's clock-reporter/adoption channel) reads that — and
  // CompositionClock is the one consumer that widens to either.
  () => ({
    time: displayTime,
    duration,
    playing,
    extPlaying: extPlay,
    setTime,
    setPlaying
  }), [displayTime, duration, playing, extPlay]);
  return (
    /*#__PURE__*/
    // data-om-starter: inert presence marker — Claude Design's starter-usage
    // probe reads it; it renders nothing. Keep it on this root element.
    React.createElement("div", {
      ref: stageRef,
      "data-om-starter": "animations-v3",
      style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#0a0a0a',
        fontFamily: 'Inter, system-ui, sans-serif'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("svg", {
      ref: canvasRef,
      width: width,
      height: height,
      "data-om-exportable-video-with-duration-secs": duration,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        flexShrink: 0,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'block'
      }
    }, /*#__PURE__*/React.createElement("foreignObject", {
      x: "0",
      y: "0",
      width: "100%",
      height: "100%"
    }, /*#__PURE__*/React.createElement("div", {
      xmlns: "http://www.w3.org/1999/xhtml",
      style: {
        width,
        height,
        background,
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement(TimelineContext.Provider, {
      value: ctxValue
    }, children))))), /*#__PURE__*/React.createElement(PlaybackBar, {
      time: displayTime,
      actualTime: time,
      duration: duration,
      playing: playing,
      onPlayPause: () => setPlaying(p => !p),
      onReset: () => {
        setTime(0);
      },
      onSeek: t => setTime(t),
      onHover: t => setHoverTime(t)
    }))
  );
}

// ── Playback bar ────────────────────────────────────────────────────────────
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

function PlaybackBar({
  time,
  duration,
  playing,
  onPlayPause,
  onReset,
  onSeek,
  onHover
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const timeFromEvent = React.useCallback(e => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);
  const onTrackMove = e => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };
  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };
  const onTrackDown = e => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };
  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = e => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);
  const pct = duration > 0 ? time / duration * 100 : 0;
  const fmt = t => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor(total * 100 % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };
  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';
  return /*#__PURE__*/React.createElement("div", {
    "data-omelette-chrome": true,
    style: {
      // Slimmed to visually match the host editor bar's basic row (the
      // single-scrubber look): transport first, tighter metrics, quieter
      // chrome. Shown only outside the app — the host bar suppresses this
      // whenever it is present.
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 12px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
      borderRadius: 6,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    onClick: onPlayPause,
    title: "Play/pause (space)"
  }, playing ? /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "2",
    width: "3",
    height: "10",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "2",
    width: "3",
    height: "10",
    fill: "currentColor"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 2l9 5-9 5V2z",
    fill: "currentColor"
  }))), /*#__PURE__*/React.createElement(IconButton, {
    onClick: onReset,
    title: "Return to start (0)"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 2v10M12 2L5 7l7 5V2z",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinejoin: "round",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: mono,
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      width: 64,
      textAlign: 'right',
      color: '#f6f4ef'
    }
  }, fmt(time)), /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    onMouseMove: onTrackMove,
    onMouseLeave: onTrackLeave,
    onMouseDown: onTrackDown,
    style: {
      flex: 1,
      height: 22,
      position: 'relative',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 4,
      background: 'rgba(255,255,255,0.12)',
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      width: `${pct}%`,
      height: 4,
      background: 'oklch(72% 0.12 250)',
      borderRadius: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: `${pct}%`,
      top: '50%',
      width: 12,
      height: 12,
      marginLeft: -6,
      marginTop: -6,
      background: '#fff',
      borderRadius: 6,
      boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: mono,
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      width: 64,
      textAlign: 'left',
      color: 'rgba(246,244,239,0.55)'
    }
  }, fmt(duration)), typeof VideoEncoder !== 'undefined' && /*#__PURE__*/React.createElement(IconButton, {
    title: "Export video",
    onClick: () => window.parent.postMessage({
      type: 'omelette:request-video-export'
    }, '*')
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 2v7m0 0L4 6m3 3l3-3M2 12h10",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))));
}
function IconButton({
  children,
  onClick,
  title
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    title: title,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: 24,
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 5,
      color: '#f6f4ef',
      cursor: 'pointer',
      padding: 0,
      transition: 'background 120ms'
    }
  }, children);
}

// ── Scene-list plumbing ──────────────────────────────────────────────────
// Guest-side validation of a scene list (the engine's own inputs: the
// authored prop, and host-dispatched updates). Mirrors the host parser's
// shape rules and constants — keep in sync with parseTimelineScenes in
// apps/web/src/shared/timeline.ts (16KB raw cap, 50 entries, dur finite in
// (0, 300]); returns null on any violation.
function ssParse(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 16 * 1024) return null;
  var parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 50) return null;
  for (var i = 0; i < parsed.length; i++) {
    var s = parsed[i];
    if (typeof s !== 'object' || s === null) return null;
    if (typeof s.name !== 'string' || typeof s.dur !== 'number') return null;
    if (!isFinite(s.dur) || s.dur <= 0 || s.dur > 300) return null;
  }
  return parsed;
}

// Guest-side validation of the playback value — mirrors the host parser
// (shared/timeline.ts parseTimelinePlayback): {"mode":"loop"} or
// {"mode":"times","count":1..99}, strict all-or-nothing, null otherwise.
// Callers treat null as the loop default.
function ppParse(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 256) return null;
  var parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  var keys = Object.keys(parsed);
  if (parsed.mode === 'loop') return keys.length === 1 ? {
    mode: 'loop'
  } : null;
  if (parsed.mode === 'times') {
    if (keys.length !== 2) return null;
    var c = parsed.count;
    if (typeof c !== 'number' || c !== Math.floor(c) || c < 1 || c > 99) return null;
    return {
      mode: 'times',
      count: c
    };
  }
  return null;
}

// Stamps the playback attribute VERBATIM from the authored raw string (the
// host's write-back anchors on that exact value) and listens for the
// host's post-write update event. Same shape as SceneSync; only rendered
// when the document authors a playback literal — an absent contract means
// the attribute stays absent and the document plays its default.
function PlaybackSync(props) {
  var ref = React.useRef(null);
  var raw = props.raw;
  var onUpdate = props.onUpdate;
  React.useEffect(function () {
    var el = ref.current;
    if (!el) return;
    var root = el.closest('[data-om-exportable-video-with-duration-secs]');
    if (!root) return;
    root.setAttribute('data-om-timeline-playback', raw);
    var onEvent = function (e) {
      var next = e && e.detail;
      if (ppParse(next)) onUpdate(next);
    };
    root.addEventListener('data-om-timeline-playback-update', onEvent);
    return function () {
      root.removeEventListener('data-om-timeline-playback-update', onEvent);
      root.removeAttribute('data-om-timeline-playback');
    };
  }, [raw, onUpdate]);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      display: 'none'
    }
  });
}

// Renders inside the Stage (so it can reach the exportable root via
// closest()): stamps the scenes attribute VERBATIM from the current raw
// string — the host's write-back anchors on that exact value — and listens
// for the host's post-write update event.
function SceneSync(props) {
  var ref = React.useRef(null);
  var raw = props.raw;
  var onUpdate = props.onUpdate;
  React.useEffect(function () {
    var el = ref.current;
    if (!el) return;
    var root = el.closest('[data-om-exportable-video-with-duration-secs]');
    if (!root) return;
    root.setAttribute('data-om-timeline-scenes', raw);
    var onEvent = function (e) {
      var next = e && e.detail;
      // Ignore anything that doesn't validate — a bad update must not tear
      // down a working composition.
      if (ssParse(next)) onUpdate(next);
    };
    root.addEventListener('data-om-timeline-scenes-update', onEvent);
    return function () {
      root.removeEventListener('data-om-timeline-scenes-update', onEvent);
      root.removeAttribute('data-om-timeline-scenes');
    };
  }, [raw, onUpdate]);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      display: 'none'
    }
  });
}

// ── Continuous composition ──────────────────────────────────────────────

var CompositionContext = React.createContext(null);
function useComposition() {
  var ctx = React.useContext(CompositionContext);
  if (!ctx) throw new Error('useComposition() must be called inside <CompositionStage>');
  return ctx;
}
function ccDerive(scenes) {
  var playStart = 0;
  var authStart = 0;
  var sections = [];
  var table = Object.create(null);
  for (var i = 0; i < scenes.length; i++) {
    var s = scenes[i];
    var nat = typeof s.nat === 'number' && isFinite(s.nat) && s.nat > 0 ? s.nat : s.dur;
    sections.push({
      name: s.name,
      playStart: playStart,
      dur: s.dur,
      authStart: authStart,
      nat: nat
    });
    if (!Object.prototype.hasOwnProperty.call(table, s.name)) {
      table[s.name] = Math.round(authStart * 1000) / 1000;
    }
    playStart += s.dur;
    authStart += nat;
  }
  return {
    sections: sections,
    table: table,
    total: Math.round(playStart * 1000) / 1000,
    authoredTotal: Math.round(authStart * 1000) / 1000
  };
}
function ccWarp(d, t) {
  var ss = d.sections;
  if (ss.length === 0) return 0;
  var idx = ss.length - 1;
  for (var i = 0; i < ss.length; i++) {
    if (t < ss[i].playStart + ss[i].dur) {
      idx = i;
      break;
    }
  }
  var s = ss[idx];
  var local = Math.min(Math.max(t - s.playStart, 0), s.dur);
  var T = s.authStart + (s.dur > 0 ? local * (s.nat / s.dur) : 0);
  return Math.min(T, d.authoredTotal);
}
var CC_META = Object.assign(Object.create(null), {
  toString: 1,
  toLocaleString: 1,
  valueOf: 1,
  toJSON: 1,
  then: 1,
  constructor: 1,
  hasOwnProperty: 1,
  isPrototypeOf: 1,
  propertyIsEnumerable: 1,
  default: 1
});
function ccCueProxy(table, unknownRef) {
  if (typeof Proxy !== 'function') return table;
  return new Proxy(table, {
    get: function (target, prop) {
      if (typeof prop !== 'string' || prop in target) return target[prop];
      if (CC_META[prop] || prop.indexOf('@@') === 0) return Object.prototype[prop];
      unknownRef.current[prop] = true;
      return NaN;
    }
  });
}
function CcUnknownWatch(props) {
  var tl = useTimeline();
  React.useEffect(function () {
    var next = Object.keys(props.unknownRef.current).sort().join(', ');
    if (next !== props.badge) props.setBadge(next);
  }, [tl.time]);
  return null;
}
function CompositionClock(props) {
  var tl = useTimeline();
  var d = props.derived;
  var T = ccWarp(d, tl.time);
  var value = React.useMemo(function () {
    return {
      T: T,
      CUES: props.cues,
      time: tl.time,
      duration: tl.duration,
      authoredTotal: d.authoredTotal,
      playing: tl.playing || tl.extPlaying === true
    };
  }, [T, props.cues, tl.time, tl.duration, d, tl.playing, tl.extPlaying]);
  return /*#__PURE__*/React.createElement(CompositionContext.Provider, {
    value: value
  }, props.children);
}
function Shot(props) {
  var c = useComposition();
  var from = +props.from;
  var to = props.to == null ? Infinity : +props.to;
  var on = isFinite(from) && c.T >= from && c.T < to;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      visibility: on ? 'visible' : 'hidden'
    }
  }, props.children);
}
var CAPTION_FADE = 0.18;
function Captions(props) {
  var c = useComposition();
  var t = c.T;
  var items = (props.items || []).filter(function (it) {
    return it && isFinite(+it.at);
  }).sort(function (a, b) {
    return a.at - b.at;
  });
  var active = null;
  var end = Infinity;
  for (var i = 0; i < items.length; i++) {
    if (t < items[i].at) break;
    active = items[i];
    end = typeof active.until === 'number' && isFinite(active.until) ? active.until : i + 1 < items.length ? items[i + 1].at : Infinity;
  }
  if (!active || t >= end) return null;
  var o = Math.min(1, (t - active.at) / CAPTION_FADE);
  if (isFinite(end)) o = Math.min(o, (end - t) / CAPTION_FADE);
  o = Math.max(0, Math.min(1, o));
  return /*#__PURE__*/React.createElement("div", {
    "data-om-caption": true,
    style: Object.assign({
      position: 'absolute',
      left: '8%',
      right: '8%',
      bottom: '7%',
      textAlign: 'center',
      opacity: o,
      pointerEvents: 'none',
      font: '500 30px Inter, system-ui, sans-serif',
      color: '#f6f4ef',
      textShadow: '0 1px 14px rgba(0,0,0,0.45)'
    }, props.style)
  }, active.text);
}
function CompositionStage(props) {
  var width = +props.width || 1280;
  var height = +props.height || 720;
  var bg = props.bg || '#0b0b0e';
  var autoplay = props.autoplay == null ? true : String(props.autoplay) !== 'false';
  var loop = props.loop == null ? true : String(props.loop) !== 'false';
  var state = React.useState(props.scenes);
  var raw = state[0];
  var setRaw = state[1];
  var scenes = React.useMemo(function () {
    return ssParse(raw);
  }, [raw]);
  var pstate = React.useState(props.playback);
  var praw = pstate[0];
  var setPraw = pstate[1];
  var pb = React.useMemo(function () {
    return ppParse(praw);
  }, [praw]);
  var unknownRef = React.useRef({});
  var badgeState = React.useState('');
  var badge = badgeState[0];
  var setBadge = badgeState[1];
  var derived = React.useMemo(function () {
    unknownRef.current = {};
    return scenes ? ccDerive(scenes) : null;
  }, [scenes]);
  var cues = React.useMemo(function () {
    return derived ? ccCueProxy(derived.table, unknownRef) : null;
  }, [derived]);
  React.useEffect(function () {
    var next = Object.keys(unknownRef.current).sort().join(', ');
    if (next !== badge) setBadge(next);
  });
  if (!scenes) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0b0e',
        color: '#c96442',
        font: '500 16px Inter, system-ui, sans-serif',
        textAlign: 'center'
      }
    }, "animations-v3: the scenes prop isn't a valid JSON scene list", /*#__PURE__*/React.createElement("br", null), "(expected '[", '{', "\"name\":\"\u2026\",\"dur\":N", '}', ", \u2026]')");
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Stage, {
    width: width,
    height: height,
    duration: derived.total,
    background: bg,
    autoplay: autoplay,
    loop: loop,
    playback: pb
  }, /*#__PURE__*/React.createElement(SceneSync, {
    raw: raw,
    onUpdate: setRaw
  }), typeof praw === 'string' && praw !== '' && /*#__PURE__*/React.createElement(PlaybackSync, {
    raw: praw,
    onUpdate: setPraw
  }), /*#__PURE__*/React.createElement(CompositionClock, {
    derived: derived,
    cues: cues
  }, props.children), /*#__PURE__*/React.createElement(CcUnknownWatch, {
    unknownRef: unknownRef,
    badge: badge,
    setBadge: setBadge
  })), badge !== '' &&
  /*#__PURE__*/
  // Sibling of Stage, outside the exportable <svg>: visible in the
  // preview (and its screenshots), never in the exported video.
  React.createElement("div", {
    "data-om-unknown-cues": true,
    style: {
      position: 'absolute',
      left: 12,
      bottom: 56,
      zIndex: 10,
      padding: '6px 10px',
      borderRadius: 6,
      background: 'rgba(0,0,0,0.72)',
      color: '#e8906a',
      font: '500 12px Inter, system-ui, sans-serif',
      pointerEvents: 'none'
    }
  }, "choreography references unknown section", badge.indexOf(',') >= 0 ? 's' : '', ": ", badge));
}

// Strokes as layers: paint multiplies, so stroke images stacked with
// mix-blend-mode:multiply over the paper reproduce the flat render.

var WC_PIXEL_CAP = 11000000;
function wcLayerOpts(props) {
  var w = +props.width || 900,
    h = +props.height || 1200;
  var askScale = +props.scale || 1;
  return {
    width: w,
    height: h,
    scale: Math.min(askScale, Math.sqrt(WC_PIXEL_CAP / (w * h))),
    seed: props.seed == null ? undefined : +props.seed,
    quality: props.quality == null ? undefined : +props.quality
  };
}
var wcWarned = {};
function wcWarnOnce(key, message, err) {
  if (wcWarned[key]) return;
  wcWarned[key] = true;
  console.warn(message, err);
}
function useWatercolorLayers(painting, opts) {
  var kit = window.WatercolorKit;
  if (typeof painting !== 'function' || !kit || typeof kit.layers !== 'function') return null;
  try {
    return kit.layers(painting, wcLayerOpts(opts || {}));
  } catch (e) {
    wcWarnOnce('layers:' + e, 'watercolor painting failed to build; rendering the fallback sheet', e);
    return null;
  }
}
var WatercolorSheetContext = React.createContext(null);
function WatercolorSheet(props) {
  var L = props.layers || null;
  var style = Object.assign({
    position: 'relative',
    display: 'block',
    width: '100%',
    aspectRatio: L ? L.width + ' / ' + L.height : '3 / 4',
    isolation: 'isolate',
    overflow: 'hidden'
  }, props.style);
  if (!L) {
    return /*#__PURE__*/React.createElement("div", {
      style: Object.assign(style, {
        background: '#f4f1e8',
        color: '#8a8270',
        font: '12px system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      })
    }, "watercolor-kit.js not loaded (or the painting failed to build)");
  }
  return /*#__PURE__*/React.createElement(WatercolorSheetContext.Provider, {
    value: L
  }, /*#__PURE__*/React.createElement("div", {
    style: style,
    "data-om-watercolor-sheet": true
  }, /*#__PURE__*/React.createElement("img", {
    src: L.paper,
    alt: props.alt || '',
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      display: 'block'
    }
  }), props.children));
}
function WatercolorStroke(props) {
  var fromSheet = React.useContext(WatercolorSheetContext);
  var L = props.layers || fromSheet;
  if (!L) return null;
  var i = +props.index;
  if (!(i >= 0) || i >= L.count) return null;
  var at = props.at == null ? 1 : clamp(+props.at, 0, 1);
  if (!(at > 0)) return null;
  var box, src;
  try {
    box = L.box(i);
    src = box ? L.src(i, at) : null;
  } catch (e) {
    wcWarnOnce('stroke:' + i + ':' + e, 'watercolor stroke ' + i + ' failed to render; skipping it', e);
    return null;
  }
  if (!box || !src) return null;
  var style = Object.assign({
    position: 'absolute',
    display: 'block',
    left: box.x * 100 + '%',
    top: box.y * 100 + '%',
    width: box.w * 100 + '%',
    height: box.h * 100 + '%',
    mixBlendMode: L.kind(i) === 'reserve' ? 'normal' : 'multiply',
    pointerEvents: 'none'
  }, props.style);
  return /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    "data-om-watercolor-stroke": i,
    "data-om-stroke-kind": L.kind(i),
    style: style
  });
}

// The default watercolor moment: the painting assembled from its strokes,
// each appearing in painting order (a pure function of T).
function WatercolorPainting(props) {
  var c = useComposition();
  var from = +props.from || 0;
  var to = props.to == null ? from + 6 : +props.to;
  var u = clamp((c.T - from) / Math.max(to - from, 0.001), 0, 1);
  var eased = Easing.easeInOutQuad(u);
  var L = useWatercolorLayers(props.painting, props);
  var tick = React.useState(0)[1];
  var warmed = React.useRef(null);
  React.useEffect(function () {
    if (!L || typeof L.warm !== 'function') return;
    var p = L.warm();
    if (warmed.current === p) return;
    var live = true;
    p.then(function () {
      warmed.current = p;
      if (live) tick(function (x) {
        return x + 1;
      });
    });
    return function () {
      live = false;
    };
  }, [L && L.paper, props.painting]);
  var strokes = [];
  if (L) {
    for (var i = 0; i < L.count; i++) {
      var sp = L.span(i);
      var at = clamp((eased - sp.from) / Math.max(sp.to - sp.from, 1e-6), 0, 1);
      if (at <= 0) break;
      strokes.push(/*#__PURE__*/React.createElement(WatercolorStroke, {
        key: i,
        layers: L,
        index: i,
        at: at
      }));
    }
  }
  return /*#__PURE__*/React.createElement(WatercolorSheet, {
    layers: L,
    style: props.style,
    alt: props.alt
  }, strokes);
}

// Paint-on watercolor reveal as a pure function of T — an <img> with a data:
// URL (the exporter serializes those as-is; a live canvas would export blank).
function WatercolorReveal(props) {
  var c = useComposition();
  var from = +props.from || 0;
  var to = props.to == null ? from + 6 : +props.to;
  var u = clamp((c.T - from) / Math.max(to - from, 0.001), 0, 1);
  var style = Object.assign({
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  }, props.style);
  var frames = Array.isArray(props.frames) && props.frames.length ? props.frames : null;
  var steps = frames ? frames.length - 1 : Math.max(1, Math.round(+props.steps || 36));
  var i = Math.min(steps, Math.round(Easing.easeInOutQuad(u) * steps));
  var painting = typeof props.painting === 'function' ? props.painting : null;
  var kit = window.WatercolorKit;
  var w = +props.width || 900,
    h = +props.height || 1200;
  var askScale = +props.scale || Math.min(2, window.devicePixelRatio || 1);
  var opts = {
    width: w,
    height: h,
    scale: Math.min(askScale, Math.sqrt(11000000 / (w * h))),
    seed: props.seed == null ? undefined : +props.seed,
    steps: steps,
    type: props.format || 'image/jpeg',
    quality: props.quality == null ? 0.88 : +props.quality
  };
  var key = opts.width + 'x' + opts.height + '#' + opts.seed + '@' + opts.scale + '/' + steps + ':' + opts.type + '/' + opts.quality;
  var cache = React.useRef({
    fn: null,
    key: '',
    frames: {},
    baking: false
  }).current;
  var tick = React.useState(0)[1];
  if (cache.fn !== painting && String(cache.fn) !== String(painting) || cache.key !== key) {
    cache.key = key;
    cache.frames = {};
    cache.baking = false;
  }
  cache.fn = painting;
  React.useEffect(function () {
    if (frames || cache.baking || !painting || !kit || typeof kit.bake !== 'function') return;
    cache.baking = true;
    var target = cache.frames;
    try {
      kit.bake(painting, opts, function (n, _t, url) {
        target[n] = url;
      }).then(function (all) {
        if (cache.frames !== target) return;
        for (var n = 0; n < all.length; n++) target[n] = all[n];
        tick(function (x) {
          return x + 1;
        });
      }).catch(function () {
        /* failed bake: the guarded lazy path below still renders */
      });
    } catch (e) {
      /* oversized painting: the guarded lazy path below still renders */
    }
  });
  if (frames) return /*#__PURE__*/React.createElement("img", {
    src: frames[i],
    alt: props.alt || '',
    style: style
  });
  if (!kit || !painting) {
    return /*#__PURE__*/React.createElement("div", {
      style: Object.assign({
        width: '100%',
        height: '100%',
        background: '#f4f1e8',
        color: '#8a8270',
        font: '12px system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }, props.style)
    }, "watercolor-kit.js not loaded (or no painting function)");
  }
  if (!cache.frames[i]) {
    try {
      cache.frames[i] = kit.frame(painting, Object.assign({}, opts, {
        at: i / steps
      }));
    } catch (e) {
      return /*#__PURE__*/React.createElement("div", {
        style: Object.assign({
          width: '100%',
          height: '100%',
          background: '#f4f1e8',
          color: '#8a8270',
          font: '12px system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }, props.style)
      }, "painting too large to render (", String(e && e.message).slice(0, 80), ")");
    }
  }
  return /*#__PURE__*/React.createElement("img", {
    src: cache.frames[i],
    alt: props.alt || '',
    style: style
  });
}
Object.assign(window, {
  Easing,
  interpolate,
  animate,
  clamp,
  TimelineContext,
  useTime,
  useTimeline,
  Stage,
  PlaybackBar,
  CompositionStage,
  useComposition,
  Shot,
  Captions,
  WatercolorReveal,
  WatercolorPainting,
  WatercolorSheet,
  WatercolorStroke,
  useWatercolorLayers
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "motion/animations-v3.jsx", error: String((e && e.message) || e) }); }

// motion/reel.jsx
try { (() => {
/* Motion reel — the six-beat flow from the source frames, rendered as ONE
   continuous composition. Every layer below is mounted the whole time; a beat
   is just motion whose start and end straddle a cue. Choreography is keyed to
   T (authored seconds) so the host timeline can retime any section. */
/* Read engine + design-system exports off window: every text/babel script in the
   page shares one global scope, so top-level names must not collide. */
const {
  useComposition: useComp,
  Captions: Cap,
  Easing: E,
  animate: anim,
  interpolate: lerp,
  clamp: cl
} = window;
const RDS = window.GenerativeGlassDesignSystem_830e44;
const {
  AuroraField,
  StatusBar,
  WeatherPill,
  Avatar,
  FlightCard,
  GlassInput,
  GlassIconButton,
  Icon,
  GlassChip,
  GlassSurface,
  Filament,
  DotRing,
  DestinationCard,
  CategoryTile,
  SpotHero,
  MapCanvas,
  RouteList
} = RDS;
const IMG = '../assets/img/';
const PW = 390,
  PH = 844;

/* The only three easing wrappers in the piece. */
const MOTION = {
  enter: (from, to, start, end) => anim({
    from,
    to,
    start,
    end,
    ease: E.easeOutQuart
  }),
  swell: (from, to, start, end) => anim({
    from,
    to,
    start,
    end,
    ease: E.easeOutBack
  }),
  draw: (from, to, start, end) => anim({
    from,
    to,
    start,
    end,
    ease: E.easeInOutCubic
  })
};
const blurPx = v => `blur(${Math.max(0, v).toFixed(2)}px)`;

/* Keyboard key — same construction as the travel kit's ChatScreen. */
function Key({
  children,
  dark,
  flex
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      flex: flex || 1,
      minWidth: 0,
      height: 42,
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'var(--r-key)',
      background: dark ? 'rgba(166,181,190,.85)' : 'var(--paper-000)',
      color: 'var(--text-title)',
      font: 'var(--fw-regular) 20px/1 var(--font-core)',
      boxShadow: '0 1px 0 rgba(1,66,99,.26)'
    }
  }, children);
}

/* Phone shell — the whole piece happens inside it. */
function Phone({
  children,
  frame
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: PW,
      height: PH,
      borderRadius: 54,
      padding: 5,
      flex: 'none',
      position: 'relative',
      background: frame,
      boxShadow: '0 2px 6px rgba(1,66,99,.14), 0 30px 70px rgba(1,66,99,.24), 0 90px 160px rgba(1,66,99,.18)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      borderRadius: 46,
      overflow: 'hidden',
      position: 'relative',
      background: '#F4FAFB'
    }
  }, children));
}
function Reel({
  captions = true
}) {
  const {
    T,
    CUES
  } = useComp();
  const C = CUES;

  /* ---- camera: never fully still ---- */
  const camScale = T < C.Flight ? MOTION.enter(1.00, 1.03, 0, C.Flight)(T) : T < C.Ask ? MOTION.enter(1.03, 1.16, C.Flight, C.Flight + 1.6)(T) : T < C.Branch ? MOTION.enter(1.16, 1.08, C.Ask, C.Ask + 1.2)(T) : T < C.Spot ? MOTION.enter(1.08, 1.00, C.Branch, C.Branch + 1.4)(T) : T < C.Route ? MOTION.enter(1.00, 1.20, C.Spot, C.Spot + 2.4)(T) : T < C.Return ? MOTION.enter(1.20, 1.02, C.Route, C.Route + 1.6)(T) : MOTION.enter(1.02, 1.00, C.Return, C.Return + 2.2)(T);
  const camY = T < C.Flight ? 0 : T < C.Ask ? MOTION.enter(0, -70, C.Flight, C.Flight + 1.6)(T) : T < C.Branch ? MOTION.enter(-70, -30, C.Ask, C.Ask + 1.2)(T) : T < C.Spot ? MOTION.enter(-30, 0, C.Branch, C.Branch + 1.4)(T) : T < C.Route ? MOTION.enter(0, 10, C.Spot, C.Spot + 2.4)(T) : 0;

  /* ---- ambient: the aurora breathes the whole time ---- */
  const drift = Math.sin(T * 0.5) * 10,
    drift2 = Math.cos(T * 0.38) * 8;
  const night = cl(lerp([C.Route - 0.4, C.Route + 0.7], [0, 1], E.easeInOutQuad)(T), 0, 1) * cl(lerp([C.Return + 0.2, C.Return + 1.4], [1, 0], E.easeInOutQuad)(T), 0, 1);

  /* ---- header widgets ---- */
  const headIn = MOTION.enter(0, 1, 0.25, 1.15)(T);
  const headOut = cl(lerp([C.Spot - 0.2, C.Spot + 0.5], [1, 0], E.easeInOutQuad)(T), 0, 1);
  const headLive = cl(lerp([C.Return + 0.1, C.Return + 0.9], [1, 0], E.easeInOutQuad)(T), 0, 1);
  const headOp = headIn * headOut * Math.max(headOut, 0) * headLive;
  const float = Math.sin(T * 1.05) * 3;

  /* ---- greeting ---- */
  const grIn = MOTION.enter(0, 1, 0.7, 1.7)(T);
  const grOut = cl(lerp([C.Ask - 0.5, C.Ask + 0.3], [1, 0], E.easeInOutQuad)(T), 0, 1);
  const grY = MOTION.enter(18, 0, 0.7, 1.7)(T);

  /* ---- flight card: rises, expands, then recedes behind the chat ---- */
  const fcIn = MOTION.enter(0, 1, 2.0, 3.0)(T);
  const fcRise = MOTION.swell(26, 0, 2.0, 3.2)(T);
  const fcBlur = MOTION.enter(9, 0, 2.0, 3.1)(T);
  const fcRecede = cl(lerp([C.Ask - 0.2, C.Ask + 0.9], [0, 1], E.easeInOutQuad)(T), 0, 1);
  const fcGone = cl(lerp([C.Branch + 0.2, C.Branch + 1.0], [1, 0], E.easeInOutQuad)(T), 0, 1);
  const fcScale = MOTION.enter(0.97, 1, 2.0, 3.2)(T) - fcRecede * 0.07;
  const fcY = fcRise + MOTION.enter(0, -14, C.Flight, C.Flight + 1.2)(T) - fcRecede * 120;

  /* ---- chat ---- */
  const askIn = MOTION.enter(0, 1, C.Ask + 0.7, C.Ask + 1.5)(T);
  const askOut = cl(lerp([C.Branch - 0.55, C.Branch + 0.15], [1, 0], E.easeInOutQuad)(T), 0, 1);
  const kbY = MOTION.enter(300, 0, C.Ask + 0.15, C.Ask + 1.05)(T) + MOTION.enter(0, 300, C.Branch - 0.35, C.Branch + 0.45)(T);

  /* ---- branch: filament draws, then the card lands, then the tiles fork ---- */
  const fil = MOTION.draw(0, 1, C.Branch + 1.35, C.Branch + 2.15)(T);
  const filOut = cl(lerp([C.Spot - 0.45, C.Spot + 0.15], [1, 0], E.easeInOutQuad)(T), 0, 1);
  const destIn = MOTION.swell(0, 1, C.Branch + 0.3, C.Branch + 1.2)(T);
  const destOut = cl(lerp([C.Spot - 0.45, C.Spot + 0.15], [1, 0], E.easeInOutQuad)(T), 0, 1);
  const tile = i => MOTION.swell(0, 1, C.Branch + 2.35 + i * 0.15, C.Branch + 3.2 + i * 0.15)(T);

  /* ---- spot: the chosen tile becomes the whole screen ---- */
  const spot = MOTION.enter(0, 1, C.Spot + 0.3, C.Spot + 1.5)(T);
  const spotOut = cl(lerp([C.Route - 0.2, C.Route + 0.6], [1, 0], E.easeInOutQuad)(T), 0, 1);

  /* ---- route: the map wipes out from the puck, then the list rises ---- */
  const wipe = MOTION.draw(0, 120, C.Route + 0.15, C.Route + 1.7)(T);
  const listIn = MOTION.swell(0, 1, C.Route + 1.6, C.Route + 2.6)(T);
  const routeOut = cl(lerp([C.Return, C.Return + 1.1], [1, 0], E.easeInOutQuad)(T), 0, 1);
  const tone = night > 0.5 ? 'night' : 'light';
  const frame = night > 0.5 ? 'linear-gradient(150deg,#3E4E57 0%,#141F27 22%,#4A5C66 48%,#0F1A21 78%,#33434B 100%)' : 'linear-gradient(150deg,#EFF6F8 0%,#BFD0D8 22%,#E7F0F3 48%,#ADC3CD 78%,#E2EDF0 100%)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1280,
      height: 720,
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--studio-bg)',
      fontFamily: 'var(--font-core)',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--aurora-field)',
      opacity: .55,
      transform: `translate(${drift}px,${drift2}px) scale(1.1)`,
      filter: 'blur(30px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: `translate(-50%,-50%) translateY(${camY * 0.35}px) scale(${0.735 * camScale})`,
      transformOrigin: '50% 50%'
    }
  }, /*#__PURE__*/React.createElement(Phone, {
    frame: frame
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      opacity: 1 - night
    }
  }, /*#__PURE__*/React.createElement(AuroraField, {
    style: {
      position: 'absolute',
      inset: 0
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      opacity: night,
      background: '#04161F'
    }
  }, /*#__PURE__*/React.createElement(MapCanvas, {
    style: {
      position: 'absolute',
      inset: 0,
      WebkitMaskImage: `radial-gradient(circle at 52% 47%, #000 ${wipe}%, transparent ${wipe + 14}%)`,
      maskImage: `radial-gradient(circle at 52% 47%, #000 ${wipe}%, transparent ${wipe + 14}%)`
    },
    roads: ['M8 12 L58 70', 'M0 118 L100 56', 'M52 47 L96 78', 'M20 150 L70 40', 'M64 0 L40 160'],
    user: {
      x: 52,
      y: 47
    },
    places: [{
      x: 45,
      y: 22,
      name: 'Tokyo\nSkytree'
    }, {
      x: 53,
      y: 57,
      name: 'Senso-ji',
      accent: true
    }, {
      x: 22,
      y: 66,
      name: 'Ueno Park',
      muted: true,
      dot: 5
    }, {
      x: 74,
      y: 40,
      name: 'Asakusa',
      muted: true,
      dot: 5
    }]
  })), /*#__PURE__*/React.createElement(StatusBar, {
    tone: tone
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      right: 18,
      top: 58,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      opacity: headOp,
      transform: `translateY(${float}px)`
    }
  }, /*#__PURE__*/React.createElement(WeatherPill, {
    temp: "28\xB0"
  }), /*#__PURE__*/React.createElement(Avatar, {
    src: IMG + 'avatar-amelia.png',
    size: 54
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      right: 18,
      top: 150,
      opacity: grIn * grOut,
      transform: `translateY(${grY}px)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-regular) 12px/1.3 var(--font-core)',
      color: 'var(--text-muted)'
    }
  }, "Wed, Apr 23"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '6px 0 0',
      font: 'var(--fw-medium) 28px/1.16 var(--font-core)',
      letterSpacing: '-.02em',
      color: 'var(--text-title)'
    }
  }, "Good morning,", /*#__PURE__*/React.createElement("br", null), "Amelia")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      right: 18,
      top: 352,
      opacity: fcIn * (1 - fcRecede * 0.55) * fcGone,
      filter: blurPx(fcBlur + fcRecede * 6),
      transform: `translateY(${fcY}px) scale(${fcScale})`,
      transformOrigin: '50% 30%'
    }
  }, /*#__PURE__*/React.createElement(FlightCard, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      right: 60,
      top: 300,
      opacity: askIn * askOut,
      transform: `translateY(${MOTION.enter(14, 0, C.Ask + 0.7, C.Ask + 1.5)(T)}px)`
    }
  }, /*#__PURE__*/React.createElement(GlassSurface, {
    level: 2,
    blur: "strong",
    radius: "lg",
    shadow: "card",
    style: {
      padding: '14px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-regular) 15px/1.45 var(--font-core)',
      color: 'var(--text-body)'
    }
  }, "Two days in Tokyo \u2014 here is where to start."))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 534,
      display: 'grid',
      justifyItems: 'center',
      opacity: filOut
    }
  }, /*#__PURE__*/React.createElement(Filament, {
    height: 56,
    width: 150,
    branch: fil > 0.55,
    style: {
      opacity: fil,
      clipPath: `inset(0 0 ${(1 - fil) * 100}% 0)`
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: 300,
      transform: `translateX(-50%) translateY(${(1 - destIn) * 30}px) scale(${0.9 + destIn * 0.1})`,
      opacity: destIn * destOut
    }
  }, /*#__PURE__*/React.createElement(DestinationCard, {
    image: IMG + 'fuji-blossom.png',
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Best places", /*#__PURE__*/React.createElement("br", null), "in Tokyo"),
    subtitle: "A relaxed route for your first day",
    width: 200,
    height: 230
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      right: 18,
      top: 596,
      display: 'flex',
      gap: 12,
      justifyContent: 'center'
    }
  }, [['nature-tokyo.png', 'Nature', /*#__PURE__*/React.createElement(React.Fragment, null, "Nature", /*#__PURE__*/React.createElement("br", null), "around Tokyo")], ['tokyo-night.png', 'Nightlife', /*#__PURE__*/React.createElement(React.Fragment, null, "Tokyo", /*#__PURE__*/React.createElement("br", null), "at night")]].map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      opacity: tile(i) * destOut,
      transform: `translateY(${(1 - tile(i)) * 26}px) scale(${0.88 + tile(i) * 0.12})`
    }
  }, /*#__PURE__*/React.createElement(CategoryTile, {
    image: IMG + t[0],
    label: t[1],
    title: t[2],
    size: 118
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      opacity: spot * spotOut,
      transform: `scale(${0.82 + spot * 0.18})`,
      transformOrigin: '62% 78%'
    }
  }, /*#__PURE__*/React.createElement(SpotHero, {
    image: IMG + 'tokyo-night.png',
    eyebrow: "View spot",
    title: "Tokyo at night",
    body: "Neon streets, quiet temples, and the city that never fully sleeps.",
    style: {
      position: 'absolute',
      inset: 0
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 96,
      opacity: listIn * routeOut,
      transform: `translateY(${(1 - listIn) * 28}px)`
    }
  }, /*#__PURE__*/React.createElement(RouteList, {
    items: [{
      name: 'Senso-ji Temple',
      time: '30 min',
      active: true
    }, {
      name: 'Nakamise Street',
      time: '45 min'
    }, {
      name: 'Shibuya Crossing',
      time: '1h 20m'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 96,
      display: 'flex',
      gap: 8,
      opacity: MOTION.enter(0, 1, 0.15, 0.95)(T) * (1 - night) * (1 - fcRecede * 0.2) * headLive * cl(lerp([C.Branch + 1.4, C.Branch + 2.2], [1, 0], E.easeInOutQuad)(T), 0, 1)
    }
  }, /*#__PURE__*/React.createElement(GlassInput, {
    placeholder: "Type a message",
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(GlassIconButton, {
    size: 58,
    label: "Voice"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mic",
    size: 22,
    color: "var(--text-muted)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      transform: `translateY(${kbY}px)`,
      background: 'rgba(202,216,222,.72)',
      backdropFilter: 'blur(var(--blur-strong))',
      padding: '8px 3px 34px',
      display: 'grid',
      gap: 9,
      alignContent: 'start'
    }
  }, [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l']].map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 5,
      padding: i ? '0 18px' : '0 3px'
    }
  }, row.map(k => /*#__PURE__*/React.createElement(Key, {
    key: k
  }, k)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      padding: '0 3px'
    }
  }, /*#__PURE__*/React.createElement(Key, {
    dark: true,
    flex: 1.4
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shift",
    size: 18
  })), ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(k => /*#__PURE__*/React.createElement(Key, {
    key: k
  }, k)), /*#__PURE__*/React.createElement(Key, {
    dark: true,
    flex: 1.4
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "delete",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      padding: '0 3px'
    }
  }, /*#__PURE__*/React.createElement(Key, {
    dark: true,
    flex: 1.6
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    }
  }, "ABC")), /*#__PURE__*/React.createElement(Key, {
    flex: 5
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    }
  }, "space")), /*#__PURE__*/React.createElement(Key, {
    dark: true,
    flex: 2
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    }
  }, "return")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 134,
      height: 5,
      borderRadius: 3,
      background: night > 0.5 ? 'rgba(255,255,255,.5)' : 'rgba(1,66,99,.30)'
    }
  }))), captions ? /*#__PURE__*/React.createElement(Cap, {
    style: {
      /* Narration sits in the left margin beside the device — the stage is 1280
         wide and the phone only ~290, so there is a clear column. Ocean ink on
         the light studio backdrop instead of the engine's white-on-nothing. */
      left: 72,
      right: 'auto',
      bottom: 'auto',
      top: '50%',
      transform: 'translateY(-50%)',
      width: 330,
      textAlign: 'left',
      color: 'var(--ink-900)',
      textShadow: 'none',
      font: '500 27px/1.35 var(--font-brand)',
      letterSpacing: '-.01em',
      textWrap: 'pretty'
    },
    items: [{
      at: 1.4,
      until: 3.6,
      text: 'Elements rise into place — nothing simply appears'
    }, {
      at: C.Ask + 0.9,
      until: C.Branch + 0.1,
      text: 'What leaves softens before what arrives lands'
    }, {
      at: C.Branch + 0.4,
      until: C.Branch + 3.2,
      text: 'The answer lands, then flows down into what it opens'
    }, {
      at: C.Route + 0.3,
      until: C.Route + 2.2,
      text: 'Screens dissolve and reform — they never cut'
    }]
  }) : null);
}
Object.assign(window, {
  Reel
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "motion/reel.jsx", error: String((e && e.message) || e) }); }

// motion/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // data-om-starter: inert presence marker — Claude Design's starter-usage
  // probe reads it. The closed panel renders nothing, so the marker rides
  // the <html> element as an attribute instead of a rendered node — zero
  // elements added, so page CSS (even structural selectors like
  // :nth-child) can never observe it. It records that the page WIRES a
  // tweaks panel, whether or not the panel is open. Keep this effect.
  React.useEffect(() => {
    document.documentElement.setAttribute('data-om-starter', 'tweaks-panel');
    return () => document.documentElement.removeAttribute('data-om-starter');
  }, []);
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "motion/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/desktop-console/Inspector.jsx
try { (() => {
const {
  GlassSurface,
  GlassButton,
  GlassChip,
  GlassIconButton,
  Icon,
  DotRing
} = window.GenerativeGlassDesignSystem_830e44;
function Inspector({
  item,
  onClose
}) {
  if (!item) return /*#__PURE__*/React.createElement(GlassSurface, {
    level: 1,
    blur: "medium",
    radius: "lg",
    shadow: "rest",
    style: {
      width: 288,
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      justifyItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(DotRing, {
    size: 120,
    rings: 5,
    dots: 22
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-regular) 12px/1.5 var(--font-core)',
      color: 'var(--text-dim)',
      textAlign: 'center',
      maxWidth: 170
    }
  }, "Select a collection to inspect it.")));
  return /*#__PURE__*/React.createElement(GlassSurface, {
    level: 2,
    blur: "strong",
    radius: "lg",
    shadow: "card",
    style: {
      width: 288,
      flex: 'none',
      display: 'flex',
      flexDirection: 'column',
      padding: 18,
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-medium) 9px/1 var(--font-core)',
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: 'var(--accent-blue-text)'
    }
  }, "Collection"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 7,
      font: 'var(--fw-semibold) 18px/1.2 var(--font-core)',
      letterSpacing: '-.015em',
      color: 'var(--text-title)'
    }
  }, item.name)), /*#__PURE__*/React.createElement(GlassIconButton, {
    size: 30,
    label: "Close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14,
    style: {
      transform: 'rotate(45deg)'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(GlassChip, {
    size: "sm"
  }, item.tag), /*#__PURE__*/React.createElement(GlassChip, {
    size: "sm"
  }, "Shared"), /*#__PURE__*/React.createElement(GlassChip, {
    size: "sm"
  }, "v4")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '.5px',
      background: 'rgba(1,66,99,.10)'
    }
  }), /*#__PURE__*/React.createElement("dl", {
    style: {
      margin: 0,
      display: 'grid',
      gap: 11
    }
  }, [['Owner', 'A. Mercer'], ['Updated', item.meta], ['Region', 'eu-west'], ['Items', '1,284']].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("dt", {
    style: {
      font: 'var(--fw-regular) 12px/1.3 var(--font-core)',
      color: 'var(--text-dim)'
    }
  }, k), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0,
      font: 'var(--fw-medium) 12px/1.3 var(--font-core)',
      color: 'var(--text-body)'
    }
  }, v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '.5px',
      background: 'rgba(1,66,99,.10)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-medium) 9px/1 var(--font-core)',
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, "Review"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--accent-blue)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12,
    color: "#fff",
    stroke: 2.4
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-regular) 12px/1.4 var(--font-core)',
      color: 'var(--text-body)'
    }
  }, "Passed automated checks")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--glass-fill-4)',
      border: 'var(--border-glass-soft)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 12,
    color: "var(--accent-warm-text)"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-regular) 12px/1.4 var(--font-core)',
      color: 'var(--text-body)'
    }
  }, "Awaiting one approval"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'grid',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(GlassButton, {
    variant: "solid",
    size: "md",
    full: true
  }, "Open collection"), /*#__PURE__*/React.createElement(GlassButton, {
    variant: "glass",
    size: "md",
    full: true,
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "users",
      size: 15
    })
  }, "Manage access")));
}
Object.assign(window, {
  Inspector
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/desktop-console/Inspector.jsx", error: String((e && e.message) || e) }); }

// ui_kits/desktop-console/Sidebar.jsx
try { (() => {
const {
  GlassSurface,
  GlassChip,
  Icon
} = window.GenerativeGlassDesignSystem_830e44;
const NAV = [['grid', 'Overview'], ['folder', 'Collections'], ['layers', 'Sources'], ['users', 'People'], ['clock', 'Activity']];
function Sidebar({
  active,
  onGo
}) {
  return /*#__PURE__*/React.createElement(GlassSurface, {
    level: 2,
    blur: "strong",
    radius: "lg",
    shadow: "card",
    style: {
      width: 236,
      flex: 'none',
      display: 'flex',
      flexDirection: 'column',
      padding: '18px 14px',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '2px 8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: 8,
      background: 'var(--accent-blue)',
      display: 'grid',
      placeItems: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkle",
    size: 15,
    color: "#fff",
    stroke: 2
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-semibold) 14px/1 var(--font-core)',
      letterSpacing: '-.01em',
      color: 'var(--text-title)'
    }
  }, "Console")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'grid',
      gap: 2
    }
  }, NAV.map(([icon, label]) => {
    const on = active === label;
    return /*#__PURE__*/React.createElement("button", {
      key: label,
      onClick: () => onGo(label),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 10px',
        borderRadius: 'var(--r-md)',
        border: '.5px solid ' + (on ? 'rgba(255,255,255,.7)' : 'transparent'),
        background: on ? 'var(--glass-fill-3)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: on ? 'var(--shadow-rest), var(--inner-top)' : 'none',
        transition: 'var(--t-hover)',
        font: `${on ? 'var(--fw-medium)' : 'var(--fw-regular)'} 13px/1 var(--font-core)`,
        color: on ? 'var(--text-title)' : 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: icon,
      size: 16,
      color: on ? 'var(--accent-deep-text)' : 'var(--text-dim)'
    }), label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'grid',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-medium) 9px/1 var(--font-core)',
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)',
      padding: '0 10px'
    }
  }, "Storage"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 10px',
      display: 'grid',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 5,
      borderRadius: 3,
      background: 'var(--glass-fill-3)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '62%',
      height: '100%',
      borderRadius: 3,
      background: 'var(--accent-blue)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-regular) 11px/1.3 var(--font-core)',
      color: 'var(--text-dim)'
    }
  }, "18.4 GB of 30 GB")), /*#__PURE__*/React.createElement(GlassChip, {
    style: {
      alignSelf: 'start',
      marginLeft: 10
    },
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "globe",
      size: 10
    })
  }, "3 regions")));
}
Object.assign(window, {
  Sidebar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/desktop-console/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/desktop-console/Topbar.jsx
try { (() => {
const {
  GlassInput,
  GlassIconButton,
  GlassButton,
  Icon
} = window.GenerativeGlassDesignSystem_830e44;
function Topbar({
  title,
  onNew
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 3,
      marginRight: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-medium) 9px/1 var(--font-core)',
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: 'var(--accent-blue-text)'
    }
  }, "Workspace"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--fw-semibold) 24px/1.1 var(--font-core)',
      letterSpacing: '-.02em',
      color: 'var(--text-title)'
    }
  }, title)), /*#__PURE__*/React.createElement(GlassInput, {
    placeholder: "Search everything",
    height: 40,
    style: {
      width: 260
    },
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 16,
      color: "var(--text-dim)"
    })
  }), /*#__PURE__*/React.createElement(GlassIconButton, {
    size: 40,
    label: "Filter"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "filter",
    size: 17
  })), /*#__PURE__*/React.createElement(GlassIconButton, {
    size: 40,
    label: "Notifications"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 17
  })), /*#__PURE__*/React.createElement(GlassButton, {
    variant: "solid",
    size: "md",
    onClick: onNew,
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 15
    })
  }, "New"));
}
Object.assign(window, {
  Topbar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/desktop-console/Topbar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/desktop-console/Workspace.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  GlassSurface,
  GlassChip,
  Icon
} = window.GenerativeGlassDesignSystem_830e44;
function Stat({
  label,
  value,
  delta
}) {
  return /*#__PURE__*/React.createElement(GlassSurface, {
    level: 2,
    blur: "strong",
    radius: "lg",
    shadow: "rest",
    style: {
      padding: '16px 18px',
      display: 'grid',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-medium) 9px/1 var(--font-core)',
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-semibold) 27px/1 var(--font-numeric)',
      letterSpacing: '-.02em',
      color: 'var(--text-title)'
    }
  }, value), delta ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-medium) 11px/1 var(--font-core)',
      color: 'var(--accent-deep-text)'
    }
  }, delta) : null));
}
function Row({
  name,
  meta,
  tag,
  tone,
  active,
  onPick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onPick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '13px 16px',
      borderRadius: 'var(--r-md)',
      cursor: 'pointer',
      background: active || h ? 'var(--glass-fill-3)' : 'transparent',
      border: '.5px solid ' + (active ? 'rgba(255,255,255,.7)' : 'transparent'),
      boxShadow: active ? 'var(--shadow-rest), var(--inner-top)' : 'none',
      transition: 'var(--t-hover)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 9,
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      background: active || h ? 'transparent' : 'var(--glass-fill-2)',
      border: 'var(--border-glass-soft)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "folder",
    size: 15,
    color: "var(--accent-deep-text)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-medium) 13px/1.3 var(--font-core)',
      color: 'var(--text-title)'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-regular) 11px/1.3 var(--font-core)',
      color: 'var(--text-dim)'
    }
  }, meta)), /*#__PURE__*/React.createElement(GlassChip, {
    tone: "bare",
    size: "sm",
    style: {
      color: tone === 'warm' ? 'var(--accent-warm-text)' : 'var(--text-muted)'
    }
  }, tag), /*#__PURE__*/React.createElement(Icon, {
    name: "chevronRight",
    size: 15,
    color: "var(--text-faint)"
  }));
}
function Workspace({
  items,
  active,
  onPick
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'grid',
      gap: 16,
      alignContent: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Collections",
    value: "128",
    delta: "+6"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Contributors",
    value: "42"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Pending review",
    value: "7",
    delta: "\u22122"
  })), /*#__PURE__*/React.createElement(GlassSurface, {
    level: 2,
    blur: "strong",
    radius: "lg",
    shadow: "card",
    style: {
      padding: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 10px 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-semibold) 14px/1 var(--font-core)',
      letterSpacing: '-.01em',
      color: 'var(--text-title)'
    }
  }, "Recent collections"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      font: 'var(--fw-medium) 11px/1 var(--font-core)',
      color: 'var(--text-muted)',
      cursor: 'pointer'
    }
  }, "Sorted by activity ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown",
    size: 13,
    color: "var(--text-dim)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 2
    }
  }, items.map(it => /*#__PURE__*/React.createElement(Row, _extends({
    key: it.name
  }, it, {
    active: active === it.name,
    onPick: () => onPick(it.name)
  }))))));
}
Object.assign(window, {
  Workspace,
  Stat,
  Row
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/desktop-console/Workspace.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/BranchScreen.jsx
try { (() => {
const {
  DotRing,
  Filament,
  GlassButton,
  GlassChip,
  GlassIconButton,
  GlassInput,
  GlassSurface,
  Icon,
  MapCanvas,
  NightActionBar,
  RouteList,
  SpotHero,
  AuroraField,
  Avatar,
  CategoryTile,
  DestinationCard,
  FlightCard,
  RouteArc,
  StatusBar,
  SuggestionPill,
  WeatherPill
} = window.GenerativeGlassDesignSystem_830e44 || {};
function BranchScreen({
  onPick
}) {
  return /*#__PURE__*/React.createElement(AuroraField, {
    intensity: .6,
    style: {
      width: '100%',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px var(--gutter-screen) 0',
      opacity: .42,
      transform: 'scale(.8)',
      transformOrigin: 'top center'
    }
  }, /*#__PURE__*/React.createElement(FlightCard, {
    compact: true,
    dep: {
      time: '22:30',
      code: 'JFK',
      city: 'New York'
    },
    arr: {
      time: '06:20',
      code: 'HND',
      city: 'Tokyo'
    },
    duration: "8 h 10m"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      justifyItems: 'center',
      marginTop: -14
    }
  }, /*#__PURE__*/React.createElement(Filament, {
    height: 44,
    node: false
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(DestinationCard, {
    image: IMG + 'fuji-blossom.png',
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Best places", /*#__PURE__*/React.createElement("br", null), "in Tokyo"),
    subtitle: "A relaxed route for your first day",
    cta: null,
    width: 178,
    height: 250
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -16,
      right: -26,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    src: IMG + 'avatar-amelia.png',
    size: 26,
    ring: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: '50%',
      marginLeft: -8,
      background: 'var(--surface-solid)',
      display: 'grid',
      placeItems: 'center',
      boxShadow: 'var(--shadow-rest)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "9",
    viewBox: "0 0 24 16"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 14C7 9 14 4 23 1c-3 6-9 11-15 13z",
    fill: "#1B2A4A"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 15c5-3 11-7 17-11-2 5-7 9-13 11z",
    fill: "#C8102E",
    opacity: ".85"
  }))))), /*#__PURE__*/React.createElement(Filament, {
    branch: true,
    width: 186,
    height: 72
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-9)',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(CategoryTile, {
    image: IMG + 'nature-tokyo.png',
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Nature", /*#__PURE__*/React.createElement("br", null), "around", /*#__PURE__*/React.createElement("br", null), "Tokyo"),
    label: "Nature",
    size: 116
  }), /*#__PURE__*/React.createElement(CategoryTile, {
    image: IMG + 'tokyo-night.png',
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Tokyo at", /*#__PURE__*/React.createElement("br", null), "night"),
    label: "Nightlife",
    size: 116,
    onClick: onPick
  }))), /*#__PURE__*/React.createElement(HomeIndicator, null));
}
Object.assign(window, {
  BranchScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/BranchScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/ChatScreen.jsx
try { (() => {
const {
  DotRing,
  Filament,
  GlassButton,
  GlassChip,
  GlassIconButton,
  GlassInput,
  GlassSurface,
  Icon,
  MapCanvas,
  NightActionBar,
  RouteList,
  SpotHero,
  AuroraField,
  Avatar,
  CategoryTile,
  DestinationCard,
  FlightCard,
  RouteArc,
  StatusBar,
  SuggestionPill,
  WeatherPill
} = window.GenerativeGlassDesignSystem_830e44 || {};
const ROWS = [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l']];
function Key({
  children,
  wide,
  dark,
  flex
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      flex: flex || 1,
      minWidth: 0,
      height: 42,
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'var(--r-key)',
      background: dark ? 'rgba(166,181,190,.85)' : 'var(--paper-000)',
      color: 'var(--text-title)',
      font: 'var(--fw-regular) 20px/1 var(--font-core)',
      boxShadow: '0 1px 0 rgba(1,66,99,.26)'
    }
  }, children);
}
function Keyboard() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(202,216,222,.72)',
      backdropFilter: 'blur(var(--blur-strong))',
      padding: '8px 3px 34px',
      display: 'grid',
      gap: 9
    }
  }, ROWS.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 5,
      padding: i ? '0 18px' : '0 3px'
    }
  }, r.map(k => /*#__PURE__*/React.createElement(Key, {
    key: k
  }, k)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      padding: '0 3px'
    }
  }, /*#__PURE__*/React.createElement(Key, {
    dark: true,
    flex: 1.4
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shift",
    size: 18
  })), ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(k => /*#__PURE__*/React.createElement(Key, {
    key: k
  }, k)), /*#__PURE__*/React.createElement(Key, {
    dark: true,
    flex: 1.4
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "delete",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      padding: '0 3px'
    }
  }, /*#__PURE__*/React.createElement(Key, {
    dark: true,
    flex: 1.6
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-regular) 14px/1 var(--font-core)'
    }
  }, "ABC")), /*#__PURE__*/React.createElement(Key, {
    flex: 5
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-regular) 14px/1 var(--font-core)'
    }
  }, "space")), /*#__PURE__*/React.createElement(Key, {
    dark: true,
    flex: 2
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-regular) 14px/1 var(--font-core)'
    }
  }, "return"))));
}
function ChatScreen({
  onSend
}) {
  const [v, setV] = React.useState('Best places in Tokyo');
  return /*#__PURE__*/React.createElement(AuroraField, {
    intensity: .5,
    style: {
      width: '100%',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px var(--gutter-screen) 0',
      opacity: .5,
      transform: 'scale(.86)',
      transformOrigin: 'top center'
    }
  }, /*#__PURE__*/React.createElement(FlightCard, {
    compact: true,
    dep: {
      time: '22:30',
      code: 'JFK',
      city: 'New York'
    },
    arr: {
      time: '06:20',
      code: 'HND',
      city: 'Tokyo'
    },
    duration: "8 h 10m"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 300,
      left: 0,
      right: 0,
      textAlign: 'center',
      padding: '0 34px'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--fw-medium) 19px/1.35 var(--font-core)',
      letterSpacing: 'var(--ls-title)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-title)',
      fontWeight: 'var(--fw-semibold)'
    }
  }, "Amelia,"), " you just landed in Tokyo. What\u2019s first?"), /*#__PURE__*/React.createElement(DotRing, {
    size: 150,
    dots: 22,
    style: {
      margin: '18px auto 0',
      opacity: .5
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-6)',
      padding: '0 var(--gutter-screen) 14px'
    }
  }, /*#__PURE__*/React.createElement(GlassIconButton, {
    label: "Attach",
    size: 46
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 20,
    color: "var(--text-muted)"
  })), /*#__PURE__*/React.createElement("input", {
    value: v,
    onChange: e => setV(e.target.value),
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      font: 'var(--type-body)',
      fontSize: 16,
      color: 'var(--text-title)'
    }
  }), /*#__PURE__*/React.createElement(GlassIconButton, {
    label: "Send",
    size: 54,
    tone: "dark",
    onClick: onSend
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevronRight",
    size: 22
  }))), /*#__PURE__*/React.createElement(Keyboard, null)));
}
Object.assign(window, {
  ChatScreen,
  Keyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/ChatScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/FlightScreen.jsx
try { (() => {
const {
  DotRing,
  Filament,
  GlassButton,
  GlassChip,
  GlassIconButton,
  GlassInput,
  GlassSurface,
  Icon,
  MapCanvas,
  NightActionBar,
  RouteList,
  SpotHero,
  AuroraField,
  Avatar,
  CategoryTile,
  DestinationCard,
  FlightCard,
  RouteArc,
  StatusBar,
  SuggestionPill,
  WeatherPill
} = window.GenerativeGlassDesignSystem_830e44 || {};
function FlightScreen({
  onNext
}) {
  return /*#__PURE__*/React.createElement(AuroraField, {
    intensity: .55,
    style: {
      width: '100%',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      placeItems: 'center',
      paddingTop: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 4,
      borderRadius: 2,
      background: 'var(--dot-ring-stroke)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      font: 'var(--type-label)',
      color: 'var(--text-muted)'
    }
  }, "Your flight today")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px var(--gutter-screen) 0'
    }
  }, /*#__PURE__*/React.createElement(FlightCard, {
    image: IMG + 'city-night.png',
    dep: {
      time: '22:30',
      code: 'JFK',
      city: 'New York'
    },
    arr: {
      time: '06:20',
      code: 'HND',
      city: 'Tokyo'
    },
    duration: "8 h 10m"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      placeItems: 'center',
      marginTop: -2
    }
  }, /*#__PURE__*/React.createElement(Filament, {
    height: 64
  }), /*#__PURE__*/React.createElement(DotRing, {
    size: 170,
    style: {
      marginTop: -8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onNext,
    "aria-label": "Ask",
    style: {
      width: 46,
      height: 46,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 24,
    color: "var(--text-dim)"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: -40,
      right: -40,
      bottom: 56,
      display: 'grid',
      gap: 'var(--gap-inline)',
      justifyItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--gap-inline)'
    }
  }, /*#__PURE__*/React.createElement(SuggestionPill, null, "Ramen spots nearby"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 120
    }
  }), /*#__PURE__*/React.createElement(SuggestionPill, null, "Hotel check-in")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--gap-inline)'
    }
  }, /*#__PURE__*/React.createElement(SuggestionPill, null, "Local etiquette tips for Japan"), /*#__PURE__*/React.createElement(SuggestionPill, {
    onClick: onNext
  }, "Help me beat jet lag")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--gap-inline)',
      opacity: .45
    }
  }, /*#__PURE__*/React.createElement(SuggestionPill, null, "Great spots in Tokyo"), /*#__PURE__*/React.createElement(SuggestionPill, null, "Tokyo beyond the guidebook"))), /*#__PURE__*/React.createElement(HomeIndicator, null));
}
Object.assign(window, {
  FlightScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/FlightScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/HomeScreen.jsx
try { (() => {
const {
  DotRing,
  Filament,
  GlassButton,
  GlassChip,
  GlassIconButton,
  GlassInput,
  GlassSurface,
  Icon,
  MapCanvas,
  NightActionBar,
  RouteList,
  SpotHero,
  AuroraField,
  Avatar,
  CategoryTile,
  DestinationCard,
  FlightCard,
  RouteArc,
  StatusBar,
  SuggestionPill,
  WeatherPill
} = window.GenerativeGlassDesignSystem_830e44 || {};
function HomeScreen({
  onOpenFlight,
  onCompose
}) {
  return /*#__PURE__*/React.createElement(AuroraField, {
    style: {
      width: '100%',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px var(--gutter-screen) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--gap-inline)'
    }
  }, /*#__PURE__*/React.createElement(WeatherPill, null), /*#__PURE__*/React.createElement(OrbWidget, null)), /*#__PURE__*/React.createElement(Avatar, {
    src: IMG + 'avatar-amelia.png',
    size: 54
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '92px var(--gutter-screen) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-muted)'
    }
  }, "Wed, Apr 23"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '6px 0 0',
      font: 'var(--type-hero)',
      letterSpacing: 'var(--ls-hero)',
      color: 'var(--text-title)'
    }
  }, "Good morning,", /*#__PURE__*/React.createElement("br", null), "Amelia")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 'var(--gutter-screen)',
      right: 'var(--gutter-screen)',
      bottom: 24,
      display: 'grid',
      gap: 'var(--gap-stack)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onOpenFlight,
    style: {
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(FlightCard, null)), /*#__PURE__*/React.createElement(GlassSurface, {
    level: 2,
    blur: "strong",
    radius: "xl",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 0 0 var(--gutter-card)',
      height: 78,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-muted)'
    }
  }, "Best places to visit"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 2,
      font: 'var(--fw-semibold) var(--fs-body)/1.2 var(--font-core)',
      color: 'var(--text-title)'
    }
  }, "First day in Tokyo")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 150,
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: IMG + 'tokyo-night.png',
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      opacity: .75
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(90deg,rgba(244,250,251,.95) 0%,rgba(244,250,251,0) 55%)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 14,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 54,
      height: 54,
      borderRadius: '50%',
      background: 'rgba(255,255,255,.35)',
      backdropFilter: 'blur(var(--blur-medium))',
      border: 'var(--border-glass)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "navigation",
    size: 22,
    color: "#fff"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--gap-inline)'
    }
  }, /*#__PURE__*/React.createElement(GlassInput, {
    placeholder: "Type a message",
    onFocus: onCompose,
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(GlassIconButton, {
    label: "Voice input",
    size: 58
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "mic",
    size: 22,
    color: "var(--text-muted)"
  })))), /*#__PURE__*/React.createElement(HomeIndicator, null));
}
Object.assign(window, {
  HomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/MapScreen.jsx
try { (() => {
const {
  DotRing,
  Filament,
  GlassButton,
  GlassChip,
  GlassIconButton,
  GlassInput,
  GlassSurface,
  Icon,
  MapCanvas,
  NightActionBar,
  RouteList,
  SpotHero,
  AuroraField,
  Avatar,
  CategoryTile,
  DestinationCard,
  FlightCard,
  RouteArc,
  StatusBar,
  SuggestionPill,
  WeatherPill
} = window.GenerativeGlassDesignSystem_830e44 || {};
function MapScreen({
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      background: 'var(--night-map)'
    }
  }, /*#__PURE__*/React.createElement(MapCanvas, {
    style: {
      position: 'absolute',
      inset: 0
    },
    roads: ['M6 26 L58 78', 'M0 122 L100 58', 'M52 58 L98 84', 'M18 158 L74 44', 'M30 8 L62 62', 'M62 62 L100 96'],
    user: {
      x: 52,
      y: 58
    },
    places: [{
      x: 45,
      y: 22,
      name: 'Tokyo\nSkytree'
    }, {
      x: 56,
      y: 68,
      name: 'Senso-ji Temple',
      accent: true
    }, {
      x: 20,
      y: 74,
      name: 'Ueno Park',
      muted: true,
      dot: 5
    }, {
      x: 74,
      y: 64,
      name: 'Tokyo Tower',
      muted: true,
      dot: 5
    }, {
      x: 19,
      y: 24,
      name: 'Asakusa',
      muted: true,
      dot: 5
    }]
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: '6%',
      right: '6%',
      top: 0,
      height: 130,
      background: 'linear-gradient(180deg,rgba(3,19,28,.85),rgba(3,19,28,0))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 22,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 64,
      height: 78,
      borderRadius: '0 0 var(--r-md) var(--r-md)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-night)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: IMG + 'tokyo-night.png',
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    tone: "night"
  })), /*#__PURE__*/React.createElement(GlassIconButton, {
    tone: "night",
    size: 54,
    label: "Recentre",
    style: {
      position: 'absolute',
      right: 20,
      bottom: 196
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "navigation",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 40,
      display: 'flex',
      gap: 'var(--gap-inline)',
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(GlassSurface, {
    tone: "night",
    level: 3,
    blur: "strong",
    radius: "lg",
    style: {
      width: 130,
      height: 118,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(GlassIconButton, {
    tone: "night",
    size: 44,
    label: "Save",
    style: {
      position: 'absolute',
      top: 12,
      right: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bookmark",
    size: 18
  })), /*#__PURE__*/React.createElement(GlassIconButton, {
    tone: "night",
    size: 44,
    label: "Collapse",
    onClick: onBack,
    style: {
      position: 'absolute',
      bottom: 12,
      left: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "minimize",
    size: 18
  }))), /*#__PURE__*/React.createElement(RouteList, {
    style: {
      flex: 1
    },
    items: [{
      name: 'Senso-ji Temple',
      time: '30 min',
      active: true
    }, {
      name: 'Shibuya Crossing',
      time: '1h 20m'
    }]
  })), /*#__PURE__*/React.createElement(HomeIndicator, {
    tone: "night"
  }));
}
Object.assign(window, {
  MapScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/MapScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/Shell.jsx
try { (() => {
const {
  DotRing,
  Filament,
  GlassButton,
  GlassChip,
  GlassIconButton,
  GlassInput,
  GlassSurface,
  Icon,
  MapCanvas,
  NightActionBar,
  RouteList,
  SpotHero,
  AuroraField,
  Avatar,
  CategoryTile,
  DestinationCard,
  FlightCard,
  RouteArc,
  StatusBar,
  SuggestionPill,
  WeatherPill
} = window.GenerativeGlassDesignSystem_830e44 || {};
const IMG = '../../assets/img/';
function Phone({
  children,
  tone = 'light'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 844,
      borderRadius: 'var(--r-device)',
      padding: 5,
      flex: 'none',
      background: 'var(--device-frame,linear-gradient(150deg,#EFF6F8 0%,#BFD0D8 22%,#E7F0F3 48%,#ADC3CD 78%,#E2EDF0 100%))',
      boxShadow: '0 2px 6px rgba(1,66,99,.14), 0 30px 70px rgba(1,66,99,.24), 0 90px 160px rgba(1,66,99,.18)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      borderRadius: 'var(--r-screen)',
      overflow: 'hidden',
      position: 'relative',
      background: tone === 'night' ? 'var(--night-900)' : 'var(--surface-app)'
    }
  }, children));
}
function HomeIndicator({
  tone = 'light'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 134,
      height: 5,
      borderRadius: 3,
      background: tone === 'night' ? 'rgba(255,255,255,.5)' : 'rgba(1,66,99,.30)'
    }
  });
}
function OrbWidget() {
  return /*#__PURE__*/React.createElement(GlassSurface, {
    level: 3,
    blur: "soft",
    radius: "pill",
    shadow: "rest",
    style: {
      width: 104,
      height: 54,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 6px'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "34",
    height: "14",
    viewBox: "0 0 34 14"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "7",
    r: "2.4",
    fill: "var(--text-body)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5.4 7h18",
    stroke: "var(--text-body)",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 42,
      height: 42,
      borderRadius: '50%',
      flex: 'none',
      /* Source-mandated: the assistant orb is a dark iridescent violet sphere in
         scene-home.png. It is deliberately NOT rebranded — it reads as a rendered
         object sitting on the glass, not as UI chrome. */
      background: 'radial-gradient(circle at 34% 30%,#6E4BD8 0%,#2A1560 42%,#08040F 74%)',
      boxShadow: '0 0 14px rgba(140,90,230,.55), inset 0 0 10px rgba(255,255,255,.25)'
    }
  }));
}
Object.assign(window, {
  Phone,
  HomeIndicator,
  OrbWidget,
  IMG
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/SpotScreen.jsx
try { (() => {
const {
  DotRing,
  Filament,
  GlassButton,
  GlassChip,
  GlassIconButton,
  GlassInput,
  GlassSurface,
  Icon,
  MapCanvas,
  NightActionBar,
  RouteList,
  SpotHero,
  AuroraField,
  Avatar,
  CategoryTile,
  DestinationCard,
  FlightCard,
  RouteArc,
  StatusBar,
  SuggestionPill,
  WeatherPill
} = window.GenerativeGlassDesignSystem_830e44 || {};
function SpotScreen({
  onBack,
  onRoute
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      background: 'var(--night-900)'
    }
  }, /*#__PURE__*/React.createElement(SpotHero, {
    image: IMG + 'tokyo-night.png',
    eyebrow: "View spot",
    title: "Tokyo at night",
    body: "Neon streets, quiet temples, and the city that never fully sleeps.",
    style: {
      position: 'absolute',
      inset: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    tone: "night"
  })), /*#__PURE__*/React.createElement(NightActionBar, {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 34
    }
  }, /*#__PURE__*/React.createElement(GlassIconButton, {
    tone: "night",
    size: 64,
    label: "Back",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevronLeft",
    size: 22
  })), /*#__PURE__*/React.createElement(GlassButton, {
    variant: "night",
    size: "lg",
    onClick: onRoute,
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "navigation",
      size: 18
    }),
    style: {
      height: 64,
      paddingLeft: 30,
      paddingRight: 30
    }
  }, "Route"), /*#__PURE__*/React.createElement(GlassIconButton, {
    tone: "night",
    size: 64,
    label: "Save"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 22
  }))), /*#__PURE__*/React.createElement(HomeIndicator, {
    tone: "night"
  }));
}
Object.assign(window, {
  SpotScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/SpotScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/components/night/MapCanvas.jsx
try { (() => {
function MapCanvas({
  places = [],
  roads = [],
  user = {
    x: 52,
    y: 47
  },
  style,
  children,
  ...rest
}) {
  return React.createElement('div', {
    style: {
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      height: '100%',
      background: 'radial-gradient(60% 40% at 50% 8%,#0A3A4E 0%,#04202C 46%,#031219 78%,#0B1418 100%)',
      ...style
    },
    ...rest
  }, React.createElement('svg', {
    viewBox: '0 0 100 160',
    preserveAspectRatio: 'none',
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%'
    }
  }, roads.map((d, i) => React.createElement('path', {
    key: i,
    d,
    fill: 'none',
    stroke: 'rgba(255,255,255,.22)',
    strokeWidth: .35
  }))), React.createElement('div', {
    'aria-hidden': true,
    style: {
      position: 'absolute',
      left: `${user.x}%`,
      top: `${user.y}%`,
      transform: 'translate(-50%,-50%)',
      width: 74,
      height: 74,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      border: '.5px solid rgba(255,255,255,.10)'
    }
  }, React.createElement('span', {
    style: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      border: '.5px solid rgba(255,255,255,.16)'
    }
  }, React.createElement('span', {
    style: {
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 0 12px rgba(255,255,255,.55)'
    }
  }))), places.map((p, i) => React.createElement('div', {
    key: i,
    style: {
      position: 'absolute',
      left: `${p.x}%`,
      top: `${p.y}%`,
      transform: 'translate(-50%,-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4
    }
  }, React.createElement('span', {
    style: {
      width: p.dot || 8,
      height: p.dot || 8,
      borderRadius: '50%',
      background: p.accent ? 'var(--accent-warm)' : p.muted ? 'rgba(255,255,255,.35)' : '#fff',
      boxShadow: p.accent ? '0 0 10px rgba(229,157,51,.85)' : '0 0 8px rgba(255,255,255,.5)'
    }
  }), p.name ? React.createElement('span', {
    style: {
      font: 'var(--fw-semibold) 7px/1.15 var(--font-core)',
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      color: p.muted ? 'var(--on-night-400)' : 'var(--on-night-500)',
      whiteSpace: 'pre-line',
      textAlign: 'center'
    }
  }, p.name) : null)), children);
}
Object.assign(__ds_scope, { MapCanvas });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/components/night/MapCanvas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/components/night/NightActionBar.jsx
try { (() => {
function NightActionBar({
  children,
  style,
  ...rest
}) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--sp-4)',
      ...style
    },
    ...rest
  }, children);
}
Object.assign(__ds_scope, { NightActionBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/components/night/NightActionBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/components/night/RouteList.jsx
try { (() => {
function RouteList({
  items = [],
  style,
  ...rest
}) {
  return React.createElement(__ds_scope.GlassSurface, {
    tone: 'night',
    level: 3,
    blur: 'strong',
    radius: 'lg',
    style: {
      padding: 'var(--sp-7) var(--sp-8)',
      display: 'grid',
      gap: 'var(--sp-7)',
      ...style
    },
    ...rest
  }, items.map((it, i) => React.createElement('div', {
    key: i,
    style: {
      display: 'flex',
      gap: 'var(--sp-6)',
      alignItems: 'flex-start'
    }
  }, React.createElement('span', {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      marginTop: 5,
      flex: 'none',
      background: it.active ? 'var(--accent-warm)' : 'transparent',
      border: it.active ? 'none' : '1.2px solid var(--on-night-400)'
    }
  }), React.createElement('div', null, React.createElement('div', {
    style: {
      font: 'var(--fw-semibold) 14px/1.2 var(--font-core)',
      color: 'var(--text-on-night)'
    }
  }, it.name), React.createElement('div', {
    style: {
      marginTop: 2,
      font: 'var(--fw-regular) 11px/1.2 var(--font-core)',
      color: 'var(--text-on-night-muted)'
    }
  }, it.time)))));
}
Object.assign(__ds_scope, { RouteList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/components/night/RouteList.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/components/night/SpotHero.jsx
try { (() => {
function SpotHero({
  image,
  eyebrow = 'View spot',
  title,
  body,
  style,
  children,
  ...rest
}) {
  return React.createElement('div', {
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--night-900)',
      ...style
    },
    ...rest
  }, React.createElement('img', {
    src: image,
    alt: '',
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), React.createElement('div', {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg,rgba(2,16,24,.25) 0%,rgba(2,16,24,0) 28%,rgba(2,18,27,.74) 66%,rgba(1,11,17,.96) 100%)'
    }
  }), React.createElement('div', {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 'var(--sp-10) var(--sp-11) var(--sp-13)'
    }
  }, eyebrow ? React.createElement(__ds_scope.GlassChip, {
    tone: 'night',
    size: 'sm',
    style: {
      textTransform: 'uppercase',
      letterSpacing: 'var(--ls-overline)'
    }
  }, eyebrow) : null, React.createElement('h1', {
    style: {
      margin: 'var(--sp-6) 0 0',
      font: 'var(--fw-bold) 29px/1.1 var(--font-core)',
      letterSpacing: 'var(--ls-hero)',
      color: 'var(--text-on-night)'
    }
  }, title), body ? React.createElement('p', {
    style: {
      margin: 'var(--sp-5) 0 0',
      maxWidth: 280,
      font: 'var(--fw-regular) 13px/1.45 var(--font-core)',
      color: 'var(--text-on-night-muted)'
    }
  }, body) : null, children));
}
Object.assign(__ds_scope, { SpotHero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/components/night/SpotHero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/components/travel/Avatar.jsx
try { (() => {
function Avatar({
  src,
  alt = '',
  size = 54,
  ring = false,
  style,
  ...rest
}) {
  return React.createElement('div', {
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--r-pill)',
      overflow: 'hidden',
      flex: 'none',
      background: 'var(--accent-deep)',
      boxShadow: ring ? '0 0 0 2px rgba(255,255,255,.85), var(--shadow-rest)' : 'var(--shadow-rest)',
      ...style
    },
    ...rest
  }, src ? React.createElement('img', {
    src,
    alt,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  }) : null);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/components/travel/Avatar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/components/travel/CategoryTile.jsx
try { (() => {
function CategoryTile({
  image,
  title,
  label,
  size = 122,
  style,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--sp-5)',
      ...style
    }
  }, React.createElement('button', {
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      position: 'relative',
      width: size,
      height: size * 1.22,
      borderRadius: 'var(--r-md)',
      overflow: 'hidden',
      border: 'var(--border-glass-soft)',
      cursor: 'pointer',
      padding: 0,
      background: 'var(--glass-fill-2)',
      boxShadow: 'var(--shadow-card)',
      transition: 'var(--t-hover)',
      transform: h ? 'var(--hover-lift)' : 'none'
    },
    ...rest
  }, image ? React.createElement('img', {
    src: image,
    alt: '',
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : null, React.createElement('span', {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg,rgba(2,26,40,0) 40%,rgba(2,24,36,.78) 100%)'
    }
  }), React.createElement('span', {
    style: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: 'rgba(255,255,255,.9)',
      display: 'grid',
      placeItems: 'center'
    }
  }, React.createElement(__ds_scope.Icon, {
    name: 'arrowUpRight',
    size: 12,
    color: 'var(--ink-900)',
    stroke: 2
  })), title ? React.createElement('span', {
    style: {
      position: 'absolute',
      left: 10,
      right: 10,
      bottom: 10,
      textAlign: 'left',
      font: 'var(--fw-bold) 14px/1.15 var(--font-core)',
      color: 'var(--text-on-image)'
    }
  }, title) : null), label ? React.createElement('span', {
    style: {
      font: 'var(--type-overline)',
      letterSpacing: 'var(--ls-overline)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, label) : null);
}
Object.assign(__ds_scope, { CategoryTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/components/travel/CategoryTile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/components/travel/DestinationCard.jsx
try { (() => {
function DestinationCard({
  image,
  title,
  subtitle,
  cta = 'Open',
  onOpen,
  width = 178,
  height = 322,
  style,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  return React.createElement('div', {
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      position: 'relative',
      width,
      height,
      borderRadius: 'var(--r-xl)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-float)',
      transition: 'var(--t-hover)',
      transform: h ? 'translateY(-3px)' : 'none',
      ...style
    },
    ...rest
  }, React.createElement('img', {
    src: image,
    alt: '',
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: h ? 'scale(1.04)' : 'scale(1)',
      transition: 'transform var(--dur-slow) var(--ease-liquid)'
    }
  }), React.createElement('div', {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg,rgba(1,40,60,0) 34%,rgba(1,34,52,.64) 62%,rgba(2,22,33,.93) 100%)'
    }
  }), React.createElement('div', {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 'var(--sp-8)'
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--fw-bold) 17px/1.15 var(--font-core)',
      letterSpacing: 'var(--ls-title)',
      color: 'var(--text-on-image)'
    }
  }, title), subtitle ? React.createElement('div', {
    style: {
      marginTop: 6,
      font: 'var(--fw-regular) 13px/1.3 var(--font-core)',
      color: 'rgba(255,255,255,.82)'
    }
  }, subtitle) : null, cta ? React.createElement(__ds_scope.GlassButton, {
    variant: 'solid',
    size: 'sm',
    full: true,
    onClick: onOpen,
    style: {
      marginTop: 'var(--sp-7)'
    }
  }, cta) : null));
}
Object.assign(__ds_scope, { DestinationCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/components/travel/DestinationCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/components/travel/RouteArc.jsx
try { (() => {
function RouteArc({
  width = 150,
  height = 34,
  duration,
  style,
  ...rest
}) {
  return React.createElement('div', {
    style: {
      position: 'relative',
      width,
      height,
      ...style
    },
    ...rest
  }, React.createElement('svg', {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    style: {
      display: 'block'
    }
  }, React.createElement('path', {
    d: `M 4 ${height - 8} Q ${width / 2} -2 ${width - 4} ${height - 8}`,
    fill: 'none',
    stroke: 'var(--text-faint)',
    strokeWidth: 1,
    strokeDasharray: '3 4',
    strokeLinecap: 'round'
  }), React.createElement('circle', {
    cx: 4,
    cy: height - 8,
    r: 2.6,
    fill: 'var(--text-body)'
  }), React.createElement('circle', {
    cx: width - 4,
    cy: height - 8,
    r: 2.6,
    fill: 'none',
    stroke: 'var(--text-faint)',
    strokeWidth: 1.2
  })), duration ? React.createElement('span', {
    style: {
      position: 'absolute',
      bottom: -4,
      left: '50%',
      transform: 'translateX(-50%)',
      font: 'var(--type-overline)',
      fontWeight: 'var(--fw-regular)',
      letterSpacing: 0,
      color: 'var(--text-dim)',
      whiteSpace: 'nowrap'
    }
  }, duration) : null);
}
Object.assign(__ds_scope, { RouteArc });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/components/travel/RouteArc.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/components/travel/FlightCard.jsx
try { (() => {
function FlightCard({
  title = 'Flight from',
  route = 'New York to Tokyo',
  code = 'FY8722',
  dep = {
    time: '22:30',
    code: 'JFK',
    city: 'New York'
  },
  arr = {
    time: '06:20',
    code: 'HND',
    city: 'Tokyo'
  },
  duration = '8 h 10m',
  image,
  seat = 'A6',
  compact = false,
  style,
  ...rest
}) {
  const scale = compact ? .72 : 1;
  return React.createElement(__ds_scope.GlassSurface, {
    level: 2,
    blur: 'strong',
    radius: 'xl',
    shadow: 'card',
    style: {
      overflow: 'hidden',
      ...style
    },
    ...rest
  }, image ? React.createElement('div', {
    style: {
      margin: 10,
      marginBottom: 0,
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      height: 200
    }
  }, React.createElement('img', {
    src: image,
    alt: '',
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  })) : null, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--sp-6)',
      padding: `${18 * scale}px var(--gutter-card) ${14 * scale}px`
    }
  }, React.createElement('div', {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--type-card-title)',
      fontSize: 19 * scale,
      letterSpacing: 'var(--ls-title)',
      color: 'var(--text-title)'
    }
  }, title), React.createElement('div', {
    style: {
      font: 'var(--type-card-title)',
      fontSize: 19 * scale,
      letterSpacing: 'var(--ls-title)',
      color: 'var(--text-title)'
    }
  }, route), React.createElement('div', {
    style: {
      marginTop: 10 * scale
    }
  }, React.createElement(__ds_scope.GlassChip, {
    leading: React.createElement(__ds_scope.Icon, {
      name: 'moon',
      size: 10 * scale
    })
  }, code))), React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, React.createElement('div', {
    style: {
      width: 34 * scale,
      height: 34 * scale,
      borderRadius: '50%',
      background: 'var(--surface-solid)',
      display: 'grid',
      placeItems: 'center',
      boxShadow: 'var(--shadow-rest)',
      zIndex: 1
    }
  }, React.createElement('svg', {
    width: 17 * scale,
    height: 11 * scale,
    viewBox: '0 0 24 16'
  }, React.createElement('path', {
    d: 'M1 14C7 9 14 4 23 1c-3 6-9 11-15 13z',
    fill: '#1B2A4A'
  }), React.createElement('path', {
    d: 'M4 15c5-3 11-7 17-11-2 5-7 9-13 11z',
    fill: '#C8102E',
    opacity: .85
  }))), React.createElement('div', {
    style: {
      width: 34 * scale,
      height: 34 * scale,
      borderRadius: '50%',
      background: 'var(--accent-blue)',
      marginLeft: -9 * scale,
      display: 'grid',
      placeItems: 'center',
      color: '#fff',
      font: `var(--fw-semibold) ${13 * scale}px/1 var(--font-core)`,
      boxShadow: 'var(--shadow-rest)'
    }
  }, seat))), React.createElement('div', {
    style: {
      height: '.5px',
      background: 'rgba(1,66,99,.10)'
    }
  }), React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--sp-6)',
      padding: `${16 * scale}px var(--gutter-card)`,
      background: 'var(--glass-fill-2)'
    }
  }, React.createElement(Endpoint, {
    ...dep,
    scale,
    align: 'left'
  }), React.createElement(__ds_scope.RouteArc, {
    width: 150 * scale,
    height: 34 * scale,
    duration
  }), React.createElement(Endpoint, {
    ...arr,
    scale,
    align: 'right'
  })));
}
function Endpoint({
  time,
  code,
  city,
  scale = 1,
  align
}) {
  return React.createElement('div', {
    style: {
      textAlign: align,
      minWidth: 52 * scale
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--type-caption)',
      fontSize: 11 * scale,
      color: 'var(--text-dim)'
    }
  }, code), React.createElement('div', {
    style: {
      font: 'var(--type-time)',
      fontSize: 17 * scale,
      color: 'var(--text-title)',
      letterSpacing: '-.01em'
    }
  }, time), city ? React.createElement('div', {
    style: {
      font: 'var(--type-caption)',
      fontSize: 11 * scale,
      color: 'var(--text-muted)'
    }
  }, city) : null);
}
Object.assign(__ds_scope, { FlightCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/components/travel/FlightCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/components/travel/SuggestionPill.jsx
try { (() => {
function SuggestionPill({
  children,
  style,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  return React.createElement('button', {
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      padding: '11px 18px',
      borderRadius: 'var(--r-pill)',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      background: h ? 'var(--glass-fill-3)' : 'var(--glass-fill-2)',
      border: 'var(--border-glass-soft)',
      backdropFilter: 'blur(var(--blur-medium)) var(--sat-glass)',
      WebkitBackdropFilter: 'blur(var(--blur-medium)) var(--sat-glass)',
      boxShadow: 'var(--shadow-rest), var(--inner-top)',
      font: 'var(--type-label)',
      color: 'var(--text-body)',
      transition: 'var(--t-hover)',
      transform: h ? 'var(--hover-lift)' : 'none',
      ...style
    },
    ...rest
  }, children);
}
Object.assign(__ds_scope, { SuggestionPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/components/travel/SuggestionPill.jsx", error: String((e && e.message) || e) }); }

// ui_kits/travel-assistant/components/travel/WeatherPill.jsx
try { (() => {
function WeatherPill({
  temp = '28°',
  style,
  ...rest
}) {
  return React.createElement(__ds_scope.GlassSurface, {
    level: 3,
    blur: 'soft',
    radius: 'pill',
    shadow: 'rest',
    style: {
      width: 54,
      height: 54,
      display: 'grid',
      placeItems: 'center',
      position: 'relative',
      ...style
    },
    ...rest
  }, React.createElement('span', {
    style: {
      position: 'absolute',
      top: 9,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: 'var(--accent-warm)',
      boxShadow: '0 0 6px rgba(229,157,51,.75)'
    }
  }), React.createElement('span', {
    style: {
      font: 'var(--fw-medium) var(--fs-label)/1 var(--font-numeric)',
      color: 'var(--text-title)',
      marginTop: 8
    }
  }, temp));
}
Object.assign(__ds_scope, { WeatherPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/travel-assistant/components/travel/WeatherPill.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AuroraField = __ds_scope.AuroraField;

__ds_ns.DotRing = __ds_scope.DotRing;

__ds_ns.Filament = __ds_scope.Filament;

__ds_ns.GlassButton = __ds_scope.GlassButton;

__ds_ns.GlassChip = __ds_scope.GlassChip;

__ds_ns.GlassIconButton = __ds_scope.GlassIconButton;

__ds_ns.GlassInput = __ds_scope.GlassInput;

__ds_ns.GlassSurface = __ds_scope.GlassSurface;

__ds_ns.StatusBar = __ds_scope.StatusBar;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.MapCanvas = __ds_scope.MapCanvas;

__ds_ns.NightActionBar = __ds_scope.NightActionBar;

__ds_ns.RouteList = __ds_scope.RouteList;

__ds_ns.SpotHero = __ds_scope.SpotHero;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.CategoryTile = __ds_scope.CategoryTile;

__ds_ns.DestinationCard = __ds_scope.DestinationCard;

__ds_ns.FlightCard = __ds_scope.FlightCard;

__ds_ns.RouteArc = __ds_scope.RouteArc;

__ds_ns.SuggestionPill = __ds_scope.SuggestionPill;

__ds_ns.WeatherPill = __ds_scope.WeatherPill;

})();
