---
status: accepted
---
# One kernel over ports, driven headlessly in a sim

The app must work offline on low-end phones, transfer content between iOS and Android with no network, and be built and verified largely by agents who cannot hold a phone. We put every behaviour in a pure kernel (`createKernel(ports)`) whose only contact with the world is a fixed set of ports, each with exactly two adapters: the platform one and an in-memory one. The sim wires many kernels over memory adapters and a shared transport bus, so every flow, including a two-phone transfer, runs in Node in milliseconds and reproduces deterministically. The alternative, a conventional React Native app with logic in hooks and screens, would have made a device the only place the app can be observed, and would have made transfer untestable short of two phones on a desk.

**Consequences.** Screens are thin and churn freely. A device run is a check on adapters and rendering, never on logic. Any port with a single adapter is a defect, since it means a seam that nothing varies across.
