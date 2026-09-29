The primary content card — an itinerary summary that expands into a full flight view.

```jsx
<FlightCard dep={{time:'22:30',code:'JFK'}} arr={{time:'06:20',code:'HND'}} />
<FlightCard image="assets/img/city-night.png" dep={{time:'22:30',code:'JFK',city:'New York'}} duration="8 h 10m" />
```

Two states only: home (no image, no cities) and expanded (image, cities, duration). `compact` shrinks it to the receded header state used behind the chat.
