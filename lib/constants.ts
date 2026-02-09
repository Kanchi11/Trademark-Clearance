// lib/constants.ts

export interface NiceClass {
    number: number;
    type: 'Goods' | 'Services';
    description: string;
  }
  
  export const NICE_CLASSES: NiceClass[] = [
    // Goods (Classes 1-34)
    { number: 1, type: 'Goods', description: 'Chemicals for industrial, scientific, photographic purposes' },
    { number: 2, type: 'Goods', description: 'Paints, varnishes, lacquers; preservatives against rust' },
    { number: 3, type: 'Goods', description: 'Cosmetics, cleaning and fragrancing preparations' },
    { number: 4, type: 'Goods', description: 'Industrial oils and greases, lubricants; fuels' },
    { number: 5, type: 'Goods', description: 'Pharmaceuticals, medical preparations; dietary supplements' },
    { number: 6, type: 'Goods', description: 'Common metals and their alloys, metal building materials' },
    { number: 7, type: 'Goods', description: 'Machines, machine tools, power-operated tools' },
    { number: 8, type: 'Goods', description: 'Hand tools and implements; cutlery, razors' },
    { number: 9, type: 'Goods', description: 'Scientific apparatus; computers, software; electronics' },
    { number: 10, type: 'Goods', description: 'Surgical, medical, dental apparatus and instruments' },
    { number: 11, type: 'Goods', description: 'Apparatus for lighting, heating, cooling, cooking' },
    { number: 12, type: 'Goods', description: 'Vehicles; apparatus for locomotion by land, air or water' },
    { number: 13, type: 'Goods', description: 'Firearms; ammunition and projectiles; explosives' },
    { number: 14, type: 'Goods', description: 'Precious metals and stones; jewelry; watches' },
    { number: 15, type: 'Goods', description: 'Musical instruments' },
    { number: 16, type: 'Goods', description: 'Paper, cardboard; printed matter; office supplies' },
    { number: 17, type: 'Goods', description: 'Unprocessed plastics; rubber, gutta-percha, asbestos' },
    { number: 18, type: 'Goods', description: 'Leather and imitations; animal skins; trunks and bags' },
    { number: 19, type: 'Goods', description: 'Building materials (non-metallic); asphalt, pitch' },
    { number: 20, type: 'Goods', description: 'Furniture, mirrors, picture frames; containers' },
    { number: 21, type: 'Goods', description: 'Household utensils and containers; glassware, porcelain' },
    { number: 22, type: 'Goods', description: 'Ropes, string, nets, tents, awnings, sails' },
    { number: 23, type: 'Goods', description: 'Yarns and threads for textile use' },
    { number: 24, type: 'Goods', description: 'Textiles and substitutes; household linen; curtains' },
    { number: 25, type: 'Goods', description: 'Clothing, footwear, headwear' },
    { number: 26, type: 'Goods', description: 'Lace, braids, embroidery; buttons, ribbons, needles' },
    { number: 27, type: 'Goods', description: 'Carpets, rugs, mats, linoleum; wall hangings' },
    { number: 28, type: 'Goods', description: 'Games, toys, playthings; sporting articles' },
    { number: 29, type: 'Goods', description: 'Meat, fish, poultry; preserved, frozen, dried fruits' },
    { number: 30, type: 'Goods', description: 'Coffee, tea, cocoa, sugar, rice, flour, bread, pastry' },
    { number: 31, type: 'Goods', description: 'Raw agricultural products; fresh fruits and vegetables' },
    { number: 32, type: 'Goods', description: 'Beers; mineral waters, soft drinks; fruit beverages' },
    { number: 33, type: 'Goods', description: 'Alcoholic beverages (except beers)' },
    { number: 34, type: 'Goods', description: 'Tobacco; smokers articles; matches' },
    
    // Services (Classes 35-45)
    { number: 35, type: 'Services', description: 'Advertising; business management; office functions' },
    { number: 36, type: 'Services', description: 'Insurance; financial affairs; real estate' },
    { number: 37, type: 'Services', description: 'Building construction; repair; installation services' },
    { number: 38, type: 'Services', description: 'Telecommunications services' },
    { number: 39, type: 'Services', description: 'Transport; packaging and storage of goods; travel' },
    { number: 40, type: 'Services', description: 'Treatment of materials; custom manufacturing' },
    { number: 41, type: 'Services', description: 'Education; training; entertainment; sporting activities' },
    { number: 42, type: 'Services', description: 'Scientific and technological services; software development' },
    { number: 43, type: 'Services', description: 'Food and drink services; temporary accommodation' },
    { number: 44, type: 'Services', description: 'Medical services; veterinary services; beauty care' },
    { number: 45, type: 'Services', description: 'Legal services; security services; personal social services' },
  ];