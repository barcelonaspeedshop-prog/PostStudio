export type Dish = { name: string; description: string }
export type HourRow = { label: string; value: string }

export type Restaurant = {
  slug: string
  name: string
  series: 'no-frills' | 'featured'
  badge: string
  badgeClass: string
  country: string
  city: string
  location: string
  cuisine: string
  priceRange: string
  gradClass: string
  metaDescription: string
  ogDescription: string
  excerpt: string
  story: string[]
  mustOrder: Dish[]
  hours: HourRow[]
  hoursNote?: string
  bookingUrl?: string
  bookingNote: string
  directionsQuery: string
  mapsEmbed: string
  mapsLabel: string
  shareUrlEncoded: string
  related: string[]
}

export const restaurants: Restaurant[] = [
  {
    slug: 'chinchinken',
    name: 'Chinchinken',
    series: 'no-frills',
    badge: '★ No Frills But Kills',
    badgeClass: 'badge--kills',
    country: 'Japan',
    city: 'Tokyo',
    location: 'Taito City, Tokyo, Japan',
    cuisine: 'Japanese — Abura Soba',
    priceRange: '¥800–1200',
    gradClass: 'grad-tokyo',
    metaDescription: 'Chinchinken, Taito City Tokyo. A tiny counter restaurant serving legendary Abura Soba (brothless ramen). No tourists, no frills, just extraordinary noodles.',
    ogDescription: 'A tiny counter restaurant in the backstreets of Taito City. The Abura Soba is legendary among Tokyo locals. No tourists, no frills, just extraordinary noodles.',
    excerpt: 'A tiny counter restaurant in the backstreets of Taito City that looks like nothing from outside. The Abura Soba (brothless ramen with oil, soy, vinegar) is legendary among Tokyo locals.',
    story: [
      "Chinchinken sits in the kind of backstreet that most visitors to Tokyo never find. There's no sign in English, no queue management system, no Instagram wall. From outside it looks like someone's garage with a noodle licence. Inside, it seats maybe twelve people at a counter, shoulder to shoulder, facing the kitchen. Nobody is talking to each other. Everyone is focused entirely on the bowl in front of them.",
      'The specialty is Abura Soba — brothless ramen, dressed with oil, soy sauce, and a splash of vinegar, mixed at the table and eaten immediately. It sounds simple because it is simple. But simplicity of this calibre requires years of refinement. Tokyo locals have known about this place for decades. The rest of the world is only just catching up.',
      'No tourists, no frills, just extraordinary noodles. <strong class="kills-word">It kills.</strong>',
    ],
    mustOrder: [
      { name: 'Abura Soba', description: 'The signature — brothless ramen with oil, soy, rice vinegar. Mix vigorously at the table. The texture of the noodles against the slick, umami-forward dressing is the point entirely.' },
      { name: 'Add an Egg', description: 'A soft-boiled marinated egg, split over the noodles as you eat. Not optional. The yolk breaks into the oil dressing and transforms the bowl. Always add the egg.' },
    ],
    hours: [
      { label: 'Lunch', value: '11:00 am – 3:00 pm' },
      { label: 'Dinner', value: '5:00 pm – 9:00 pm' },
      { label: 'Closed', value: 'Sundays' },
    ],
    hoursNote: 'Cash preferred. Arrive early — queues form before opening.',
    bookingNote: 'Chinchinken does not take reservations. Walk in, join the queue, wait your turn. It is always worth it.',
    directionsQuery: 'Chinchinken+Taito+Tokyo',
    mapsEmbed: 'Chinchinken+Abura+Soba+Taito+Tokyo+Japan',
    mapsLabel: '◉ Taito City, Tokyo, Japan',
    shareUrlEncoded: 'https%3A%2F%2Fpremirafirst.com%2Ffood%2Frestaurant%2Fchinchinken',
    related: ['restaurante-garcia'],
  },
  {
    slug: 'dishoom-kensington',
    name: 'Dishoom Kensington',
    series: 'featured',
    badge: 'Featured',
    badgeClass: 'badge--featured',
    country: 'United Kingdom',
    city: 'London',
    location: 'Kensington, London, UK',
    cuisine: 'Modern Indian — Bombay Café',
    priceRange: '£25–40pp',
    gradClass: 'grad-london',
    metaDescription: 'Dishoom Kensington — Bombay café culture reimagined in London\'s most elegant neighbourhood. Black Dal, Bacon Naan Roll, Chicken Ruby. Queue outside is part of the experience.',
    ogDescription: 'Dishoom reimagines the Irani cafés of old Bombay with impeccable style. The Kensington branch is the most elegant of the group.',
    excerpt: 'Dishoom reimagines the Irani cafés of old Bombay with impeccable style. The Kensington branch is the most elegant of the group. Queue outside is part of the experience.',
    story: [
      'In Bombay in the early twentieth century, the Irani café was an institution. Part dining room, part meeting place, part refuge from the city — these cafés were places of democracy, where a businessman and a clerk might sit at adjacent tables eating the same breakfast. Most are gone now. Dishoom brought them back.',
      'The Kensington branch is the most quietly spectacular of the group. The design is meticulous — dark wood, ceiling fans, aged mirrors, old photographs of Bombay — without feeling like a theme park. The food is the point, and it is extraordinary. The Black Dal alone — slow-cooked for twenty-four hours — is one of the finest dishes in London.',
      'There will be a queue. Join it. You will not regret a minute of the wait.',
    ],
    mustOrder: [
      { name: 'Black Dal', description: 'Slow-cooked for 24 hours over low heat. Deeply smoky, impossibly rich, with a texture that falls somewhere between a dhal and a stew. Order it every time.' },
      { name: 'Bacon Naan Roll (breakfast only)', description: 'A freshly baked naan, smoked streaky bacon, cream cheese, chilli jam. One of the great breakfast dishes in any city in the world. The queue at 8am is worth it for this alone.' },
      { name: 'Chicken Ruby', description: 'A full-bodied, warmly spiced curry with great depth. Not hot for the sake of it. The kind of dish that reminds you why Dishoom earned its reputation.' },
    ],
    hours: [
      { label: 'Mon – Thu', value: '8:00 am – 11:00 pm' },
      { label: 'Friday', value: '8:00 am – midnight' },
      { label: 'Saturday', value: '9:00 am – midnight' },
      { label: 'Sunday', value: '9:00 am – 11:00 pm' },
    ],
    hoursNote: 'Breakfast served from opening until noon. Queues form early on weekends.',
    bookingUrl: 'https://www.dishoom.com/kensington/',
    bookingNote: 'Dishoom Kensington accepts reservations for dinner. Walk-ins welcome for breakfast and lunch — queue times vary.',
    directionsQuery: 'Dishoom+Kensington+London',
    mapsEmbed: 'Dishoom+Kensington+London',
    mapsLabel: '◉ Kensington, London, United Kingdom',
    shareUrlEncoded: 'https%3A%2F%2Fpremirafirst.com%2Ffood%2Frestaurant%2Fdishoom-kensington',
    related: ['chinchinken', 'restaurante-garcia'],
  },
  {
    slug: 'restaurante-garcia',
    name: 'Restaurante Garcia',
    series: 'no-frills',
    badge: '★ No Frills But Kills',
    badgeClass: 'badge--kills',
    country: 'Spain',
    city: 'Navarra',
    location: 'Murchante, Navarra, Spain',
    cuisine: 'Traditional Navarrese',
    priceRange: '€15–25pp',
    gradClass: 'grad-navarra',
    metaDescription: 'Restaurante Garcia, Murchante, Navarra. Traditional Navarrese cooking — grilled lamb, pintxos, house wine. A local secret that deserves to be known.',
    ogDescription: 'In the small town of Murchante in Navarra, Garcia has been serving honest, exceptional food for decades. A local secret that deserves to be known.',
    excerpt: 'In the small town of Murchante in Navarra, Garcia has been serving honest, exceptional food for decades. A local secret that deserves to be known.',
    story: [
      'Navarra is not the Spain that most people think about. It is not the beach resorts of the Costa Brava, nor the culinary circus of San Sebastián. It is quieter than that, and in its quietness it is perhaps more honest. The land here is extraordinary — dry hills, ancient rivers, vineyards that go back to Roman times — and the food reflects it.',
      'Restaurante Garcia sits in the centre of Murchante, a small town that most GPS systems will ask you to confirm twice. The dining room has been here for decades. Nothing about it announces itself. The menu is written on a chalkboard. The wine is from a local producer whose name is not on any list. The lamb is grilled over wood, the pintxos are made each morning, and the whole thing operates at a pace that the rest of the food world has entirely forgotten.',
      'This is the restaurant you stumble into on a road trip through northern Spain and spend the next decade trying to find again. We found it. <strong class="kills-word">It kills.</strong>',
    ],
    mustOrder: [
      { name: 'Grilled Lamb Chops', description: 'Chuletas de cordero from Navarra — small, intensely flavoured, charred at the edges and pink inside. Ordered by the rack. Salt, fire, and exceptional meat. Nothing else required.' },
      { name: 'Local Pintxos', description: 'Made fresh each morning — a rotating selection dictated by what arrived at the market that day. The tortilla and the jamón croquetas are constants. Let the kitchen guide you.' },
      { name: 'House Wine from Navarra', description: 'A local red — robust, earthy, the kind of wine that costs €4 a glass and would pass for something three times the price in a city wine bar. Ask for whatever is open.' },
    ],
    hours: [
      { label: 'Lunch', value: '1:00 pm – 4:00 pm (approx.)' },
      { label: 'Dinner', value: '8:00 pm – 10:30 pm (approx.)' },
      { label: 'Closed', value: 'Monday evenings — confirm locally' },
    ],
    hoursNote: 'Hours are traditional Spanish — lunch is the main event. Call ahead if travelling specifically.',
    bookingNote: 'Reservations recommended for weekends and for groups. Call directly or arrive early for lunch — tables fill quickly with locals.',
    directionsQuery: 'Restaurante+Garcia+Murchante+Navarra+Spain',
    mapsEmbed: 'Murchante+Navarra+Spain',
    mapsLabel: '◉ Murchante, Navarra, Spain · Town centre',
    shareUrlEncoded: 'https%3A%2F%2Fpremirafirst.com%2Ffood%2Frestaurant%2Frestaurante-garcia',
    related: ['chinchinken', 'dishoom-kensington'],
  },
]

export function getRestaurant(slug: string): Restaurant | undefined {
  return restaurants.find(r => r.slug === slug)
}

export function getRelated(restaurant: Restaurant): Restaurant[] {
  return restaurant.related
    .map(slug => restaurants.find(r => r.slug === slug))
    .filter(Boolean) as Restaurant[]
}
