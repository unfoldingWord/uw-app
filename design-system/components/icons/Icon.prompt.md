Single-glyph SVG icon (Lucide outlines) for every icon slot in the system — never inline your own path data.

```jsx
<Icon name="mic" size={22} color="var(--ink-500)" />
```

Available (28). Mobile surface: mic, navigation, plus, chevronLeft, chevronRight, arrowUpRight, bookmark, maximize, minimize, moon, sun, delete, shift, search, compass, sparkle. Desktop surface: check, chevronDown, filter, settings, users, folder, ellipsis, bell, grid, clock, globe, layers.

Icons are stroke-only — no filled glyphs anywhere in this system. `iconNames` is exported from the module but stays bundle-internal (lower-case names are not put on the window namespace), so in card HTML list the names you need explicitly.
