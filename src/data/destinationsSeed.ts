import { Destination, PackingTemplateItem } from '../types';

export const HERO_COAST_IMAGE = '/src/assets/images/hero_journey_coast_1795548515571.jpg';

export const COVER_IMAGES = [
  {
    label: 'Coastal Overlook',
    url: '/src/assets/images/hero_journey_coast_1795548515571.jpg',
  },
  {
    label: "Cox's Bazar Shoreline",
    url: '/src/assets/images/dest_coxs_bazar_1795548516207.jpg',
  },
  {
    label: 'Sajek Mountain Clouds',
    url: '/src/assets/images/dest_sajek_valley_1795548517434.jpg',
  },
  {
    label: 'The Sundarbans Mangroves',
    url: '/src/assets/images/dest_sundarbans_1795551688404.jpg',
  },
  {
    label: 'Ratargul & Sylhet Tea Hills',
    url: '/src/assets/images/dest_ratargul_sylhet_1795551689362.jpg',
  },
  {
    label: 'Paharpur Terracotta Monastery',
    url: '/src/assets/images/dest_paharpur_1795551690770.jpg',
  },
  {
    label: 'Old Dhaka Heritage Palace',
    url: '/src/assets/images/dest_old_dhaka_1795551688614.jpg',
  },
  {
    label: 'Kyoto Pavilion',
    url: '/src/assets/images/dest_kyoto_temple_1795548516150.jpg',
  },
  {
    label: 'Amalfi Cliffside',
    url: '/src/assets/images/dest_amalfi_coast_1795548518776.jpg',
  },
  {
    label: 'Alpine Emerald Lake',
    url: '/src/assets/images/dest_swiss_alps_1795548516396.jpg',
  },
  {
    label: 'Istanbul Bosphorus Skyline',
    url: '/src/assets/images/dest_istanbul_1795551690297.jpg',
  },
];

export const CURATED_SAMPLE_DESTINATIONS: Destination[] = [
  {
    id: 'sample-coxs-bazar',
    name: "Cox's Bazar",
    country: 'Bangladesh',
    category: 'Beaches',
    description:
      'Known for its uninterrupted natural sandy coastline along the Bay of Bengal, Marine Drive scenic coastal road, Inani coral boulders, and golden sunset horizons.',
    imageUrl: '/src/assets/images/dest_coxs_bazar_1795548516207.jpg',
    lat: 21.4272,
    lng: 92.0058,
    bestSeason: 'November – March',
    highlights: ['Laboni & Kolatoli Beach', 'Marine Drive Scenic Route', 'Inani Beach & Himchari'],
    isSampleData: true,
    createdBy: 'system',
  },
  {
    id: 'sample-sajek-valley',
    name: 'Sajek Valley',
    country: 'Bangladesh',
    category: 'Mountains',
    description:
      'Perched high in the Chittagong Hill Tracts of Rangamati, Sajek Valley is celebrated for panoramic dawn cloud seas, bamboo hillside cottages, and Konglak Para ridge views.',
    imageUrl: '/src/assets/images/dest_sajek_valley_1795548517434.jpg',
    lat: 23.3816,
    lng: 92.2938,
    bestSeason: 'October – February',
    highlights: ['Konglak Hill Sunrise', 'Ruilui Para Ridge', 'Sea of Morning Clouds'],
    isSampleData: true,
    createdBy: 'system',
  },
  {
    id: 'sample-sundarbans',
    name: 'The Sundarbans',
    country: 'Bangladesh',
    category: 'Nature',
    description:
      'A UNESCO World Heritage mangrove delta woven with tidal rivers, wooden boardwalk trails at Karamjal and Kotka, and rich estuarine wildlife biodiversity.',
    imageUrl: '/src/assets/images/dest_sundarbans_1795551688404.jpg',
    lat: 21.9497,
    lng: 89.1833,
    bestSeason: 'November – February',
    highlights: ['Karamjal Eco Park', 'Kotka Watchtower', 'Tidal River Cruising'],
    isSampleData: true,
    createdBy: 'system',
  },
  {
    id: 'sample-sylhet-ratargul',
    name: 'Ratargul & Sreemangal',
    country: 'Bangladesh',
    category: 'Parks',
    description:
      'Lush freshwater swamp forests navigated by wooden country boats alongside terraced tea estates and tranquil hillside sanctuaries in northeastern Bangladesh.',
    imageUrl: '/src/assets/images/dest_ratargul_sylhet_1795551689362.jpg',
    lat: 25.0167,
    lng: 91.9333,
    bestSeason: 'July – October & Winter',
    highlights: ['Ratargul Swamp Forest', 'Lawachara National Park', 'Tea Estate Trails'],
    isSampleData: true,
    createdBy: 'system',
  },
  {
    id: 'sample-paharpur',
    name: 'Somapura Mahavihara (Paharpur)',
    country: 'Bangladesh',
    category: 'Historical Places',
    description:
      'An 8th-century terracotta archaeological complex in Naogaon showcasing ancient Buddhist monastery architecture and historical museum artifacts.',
    imageUrl: '/src/assets/images/dest_paharpur_1795551690770.jpg',
    lat: 25.0311,
    lng: 88.9767,
    bestSeason: 'November – February',
    highlights: ['Main Stupa Courtyard', 'Terracotta Plaques', 'Archaeological Museum'],
    isSampleData: true,
    createdBy: 'system',
  },
  {
    id: 'sample-kyoto',
    name: 'Kyoto',
    country: 'Japan',
    category: 'Cultural Attractions',
    description:
      'Japan’s historic cultural capital featuring wooden shrines, tranquil moss gardens, Nishiki culinary alleys, and seasonal autumn maple groves.',
    imageUrl: '/src/assets/images/dest_kyoto_temple_1795548516150.jpg',
    lat: 35.0116,
    lng: 135.7681,
    bestSeason: 'March – May & October – November',
    highlights: ['Ginkaku-ji & Philosopher’s Path', 'Arashiyama Bamboo Grove', 'Gion Historic District'],
    isSampleData: true,
    createdBy: 'system',
  },
  {
    id: 'sample-amalfi',
    name: 'Amalfi Coast',
    country: 'Italy',
    category: 'Beaches',
    description:
      'Dramatic Mediterranean cliffside villages linked by coastal terraces, lemon groves, historic cathedrals, and turquoise coves.',
    imageUrl: '/src/assets/images/dest_amalfi_coast_1795548518776.jpg',
    lat: 40.6333,
    lng: 14.6029,
    bestSeason: 'May – September',
    highlights: ['Positano Cliff Walk', 'Ravello Villa Terraces', 'Coastal Boat Charter'],
    isSampleData: true,
    createdBy: 'system',
  },
  {
    id: 'sample-swiss-alps',
    name: 'Interlaken & Oeschinen Lake',
    country: 'Switzerland',
    category: 'Adventure',
    description:
      'Crisp alpine glacial lakes surrounded by granite peaks, scenic mountain railways, and panoramic hiking ridges across the Bernese Oberland.',
    imageUrl: '/src/assets/images/dest_swiss_alps_1795548516396.jpg',
    lat: 46.6863,
    lng: 7.8632,
    bestSeason: 'June – September',
    highlights: ['Oeschinen Lake', 'Harder Kulm Overlook', 'Alpine Rail Pass Routes'],
    isSampleData: true,
    createdBy: 'system',
  },
  {
    id: 'sample-istanbul-bazaars',
    name: 'Istanbul Old City',
    country: 'Turkey',
    category: 'Shopping',
    description:
      'A crossroads of continents combining vaulted historic bazaars, Bosphorus ferry crossings, spice markets, and monumental domed architecture.',
    imageUrl: '/src/assets/images/dest_istanbul_1795551690297.jpg',
    lat: 41.0082,
    lng: 28.9784,
    bestSeason: 'April – June & September – October',
    highlights: ['Grand Bazaar & Spice Market', 'Bosphorus Strait Ferry', 'Sultanahmet Museums'],
    isSampleData: true,
    createdBy: 'system',
  },
  {
    id: 'sample-dhaka-food-museums',
    name: 'Old Dhaka & National Museum',
    country: 'Bangladesh',
    category: 'Museums',
    description:
      'Explore Mughal-era Lalbagh Fort, Ahsan Manzil riverfront palace, National Museum galleries, and legendary Old Dhaka culinary heritage.',
    imageUrl: '/src/assets/images/dest_old_dhaka_1795551688614.jpg',
    lat: 23.7104,
    lng: 90.4074,
    bestSeason: 'November – February',
    highlights: ['Ahsan Manzil Pink Palace', 'Lalbagh Fort', 'Bangladesh National Museum'],
    isSampleData: true,
    createdBy: 'system',
  },
];

export const DEFAULT_PACKING_ITEMS: PackingTemplateItem[] = [
  // A. CLOTHING
  { name: 'T-Shirts', category: 'Clothing', quantity: 4, priority: 'High' },
  { name: 'Shirts', category: 'Clothing', quantity: 2, priority: 'Medium' },
  { name: 'Pants', category: 'Clothing', quantity: 2, priority: 'High' },
  { name: 'Jeans', category: 'Clothing', quantity: 1, priority: 'Medium' },
  { name: 'Jackets', category: 'Clothing', quantity: 1, priority: 'Medium' },
  { name: 'Shoes', category: 'Clothing', quantity: 1, priority: 'Essential' },
  { name: 'Sandals', category: 'Clothing', quantity: 1, priority: 'Medium' },
  { name: 'Socks', category: 'Clothing', quantity: 4, priority: 'High' },
  { name: 'Sleepwear', category: 'Clothing', quantity: 2, priority: 'Medium' },

  // B. PERSONAL CARE
  { name: 'Toothbrush', category: 'Personal Care', quantity: 1, priority: 'Essential' },
  { name: 'Toothpaste', category: 'Personal Care', quantity: 1, priority: 'Essential' },
  { name: 'Shampoo', category: 'Personal Care', quantity: 1, priority: 'Medium' },
  { name: 'Soap', category: 'Personal Care', quantity: 1, priority: 'Medium' },
  { name: 'Skincare Products', category: 'Personal Care', quantity: 1, priority: 'Low' },
  { name: 'Towels', category: 'Personal Care', quantity: 1, priority: 'Medium' },
  { name: 'Personal Hygiene Products', category: 'Personal Care', quantity: 1, priority: 'High' },

  // C. TRAVEL ESSENTIALS
  { name: 'Passport', category: 'Travel Essentials', quantity: 1, priority: 'Essential' },
  { name: 'NID', category: 'Travel Essentials', quantity: 1, priority: 'Essential' },
  { name: 'Tickets', category: 'Travel Essentials', quantity: 1, priority: 'Essential' },
  { name: 'Wallet', category: 'Travel Essentials', quantity: 1, priority: 'Essential' },
  { name: 'Cash', category: 'Travel Essentials', quantity: 1, priority: 'Essential' },
  { name: 'Mobile Phone', category: 'Travel Essentials', quantity: 1, priority: 'Essential' },
  { name: 'Charger', category: 'Travel Essentials', quantity: 1, priority: 'Essential' },
  { name: 'Power Bank', category: 'Travel Essentials', quantity: 1, priority: 'High' },
  { name: 'Headphones', category: 'Travel Essentials', quantity: 1, priority: 'Low' },
  { name: 'Travel Documents', category: 'Travel Essentials', quantity: 1, priority: 'Essential' },

  // D. HEALTH & SAFETY
  { name: 'Personal Medicines', category: 'Health & Safety', quantity: 1, priority: 'Essential' },
  { name: 'First Aid Kit', category: 'Health & Safety', quantity: 1, priority: 'High' },
  { name: 'Hand Sanitizer', category: 'Health & Safety', quantity: 1, priority: 'High' },
  { name: 'Sunscreen', category: 'Health & Safety', quantity: 1, priority: 'Medium' },
  { name: 'Insect Repellent', category: 'Health & Safety', quantity: 1, priority: 'Medium' },

  // E. ELECTRONICS
  { name: 'Laptop', category: 'Electronics', quantity: 1, priority: 'Low' },
  { name: 'Camera', category: 'Electronics', quantity: 1, priority: 'Low' },
  { name: 'Memory Card', category: 'Electronics', quantity: 1, priority: 'Low' },
  { name: 'Charging Cable', category: 'Electronics', quantity: 2, priority: 'High' },
  { name: 'Travel Adapter', category: 'Electronics', quantity: 1, priority: 'High' },
];

const DESTINATION_IMAGE_RULES: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ['cox', 'bazar', 'bazer', 'kuakata', 'saint martin', 'st martin', 'beach', 'sea', 'ocean', 'island'],
    url: '/src/assets/images/dest_coxs_bazar_1795548516207.jpg',
  },
  {
    keywords: ['sajek', 'bandarban', 'rangamati', 'khagrachari', 'hill', 'mountain', 'valley'],
    url: '/src/assets/images/dest_sajek_valley_1795548517434.jpg',
  },
  {
    keywords: ['sundarban', 'mangrove', 'wildlife'],
    url: '/src/assets/images/dest_sundarbans_1795551688404.jpg',
  },
  {
    keywords: ['ratargul', 'sylhet', 'sreemangal', 'srimangal', 'swamp', 'tea', 'forest'],
    url: '/src/assets/images/dest_ratargul_sylhet_1795551689362.jpg',
  },
  {
    keywords: ['paharpur', 'somapura', 'mahasthangarh', 'ancient', 'temple ruin', 'monastery'],
    url: '/src/assets/images/dest_paharpur_1795551690770.jpg',
  },
  {
    keywords: ['dhaka', 'ahsan manzil', 'lalbagh', 'museum', 'palace'],
    url: '/src/assets/images/dest_old_dhaka_1795551688614.jpg',
  },
  {
    keywords: ['kyoto', 'japan', 'tokyo', 'osaka', 'shrine', 'temple'],
    url: '/src/assets/images/dest_kyoto_temple_1795548516150.jpg',
  },
  {
    keywords: ['amalfi', 'positano', 'italy', 'mediterranean', 'coastal cliff'],
    url: '/src/assets/images/dest_amalfi_coast_1795548518776.jpg',
  },
  {
    keywords: ['interlaken', 'oeschinen', 'swiss', 'alps', 'zurich', 'zermatt', 'lake'],
    url: '/src/assets/images/dest_swiss_alps_1795548516396.jpg',
  },
  {
    keywords: ['istanbul', 'turkey', 'bosphorus', 'sultanahmet', 'bazaar'],
    url: '/src/assets/images/dest_istanbul_1795551690297.jpg',
  },
];

export function resolveDestinationImage(destination?: string, currentCover?: string): string {
  const isGenericOrMissing = !currentCover || currentCover === HERO_COAST_IMAGE;
  if (!isGenericOrMissing && currentCover) {
    return currentCover;
  }
  const q = (destination || '').toLowerCase();
  if (q) {
    const matched = DESTINATION_IMAGE_RULES.find((rule) =>
      rule.keywords.some((kw) => q.includes(kw))
    );
    if (matched) return matched.url;
  }
  return currentCover || HERO_COAST_IMAGE;
}

