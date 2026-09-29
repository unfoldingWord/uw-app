# Travel assistant — UI kit

A six-screen recreation of the flow in the source frames (`assets/reference/`). One product, one surface: a 390×844 iOS concept app.

| Screen | File | Source frame |
| --- | --- | --- |
| Home | `HomeScreen.jsx` | scene00001 / scene01451 |
| Flight expanded | `FlightScreen.jsx` | scene00301 |
| Chat + keyboard | `ChatScreen.jsx` | scene00451 |
| Branch | `BranchScreen.jsx` | scene01051 |
| Spot detail | `SpotScreen.jsx` | scene01201 |
| Map | `MapScreen.jsx` | scene01301 |

The **Dark** button in the nav sets `data-theme="dark"` on the document — the same six screens re-render against the dark token scope with no per-screen branching.

`Shell.jsx` holds the device frame, home indicator and the orb header widget. Every screen composes the published components — nothing is re-implemented locally.

**Known gaps.** The source is 30 stills from a motion piece, so anything that only exists mid-transition is approximated: the morph between screens, the particle trails, and the filament draw-on. The map geometry is illustrative, not real Tokyo data.
