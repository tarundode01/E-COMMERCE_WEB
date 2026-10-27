import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from './models/Store.js';
import User from './models/User.js';
import Product from './models/Product.js';
import Category from './models/Category.js';

dotenv.config();

const sampleProducts = [
  {
    name: 'Heritage Chronograph Gold Watch',
    category: 'Luxury Horology',
    price: 850,
    originalPrice: 1100,
    discount: 23,
    stock: 15,
    rating: 4.9,
    reviewsCount: 42,
    image: '/assets/luxury_watch-C7ODefxi.jpg',
    images: ['/assets/luxury_watch-C7ODefxi.jpg'],
    sku: 'HOR-CHRONO-01',
    description: 'The Heritage Chronograph represents the pinnacle of classical Swiss watchmaking. Featuring an automatic mechanical movement, fluted 18-karat gold-plated bezel, and a hand-stitched Italian alligator grain leather strap.',
    status: 'published',
  },
  {
    name: 'Cognac Artisan Leather Satchel',
    category: 'Handcrafted Goods',
    price: 620,
    originalPrice: 750,
    discount: 17,
    stock: 20,
    rating: 4.8,
    reviewsCount: 38,
    image: '/assets/luxury_bag-PchcyaEv.jpg',
    images: ['/assets/luxury_bag-PchcyaEv.jpg'],
    sku: 'LTH-SATCHEL-02',
    description: 'Masterfully hand-cut and assembled by Tuscan leather craftsmen. Crafted from full-grain vegetable-tanned bovine leather that develops a distinctive patina with each passing year.',
    status: 'published',
  },
  {
    name: 'Oud Royal Extrait de Parfum',
    category: 'Fine Fragrance',
    price: 340,
    originalPrice: 400,
    discount: 15,
    stock: 35,
    rating: 4.9,
    reviewsCount: 56,
    image: '/assets/luxury_perfume-C6vzkWmS.jpg',
    images: ['/assets/luxury_perfume-C6vzkWmS.jpg'],
    sku: 'FRG-OUD-03',
    description: 'An opulent symphony of rare Cambodian agarwood, Bulgarian Damask rose, and sun-warmed amber resins. Distilled in Grasse, France using ancient alembic techniques.',
    status: 'published',
  },
  {
    name: 'Aviator Titanium Sunglasses',
    category: 'Designer Eyewear',
    price: 490,
    originalPrice: 580,
    discount: 15,
    stock: 25,
    rating: 4.7,
    reviewsCount: 19,
    image: '/assets/luxury_sunglasses-BiXA71so.jpg',
    images: ['/assets/luxury_sunglasses-BiXA71so.jpg'],
    sku: 'OPT-AVIATOR-04',
    description: 'Ultralight Japanese beta-titanium frames finished with microscopic 24k gold leaf ion plating. Fitted with Carl Zeiss polarized emerald-green mineral glass lenses.',
    status: 'published',
  },
  {
    name: 'Cashmere Double-Breasted Trench Overcoat',
    category: 'Haute Couture',
    price: 1850,
    originalPrice: 2200,
    discount: 16,
    stock: 8,
    rating: 4.9,
    reviewsCount: 27,
    image: '/assets/hero_lifestyle-BbWy7xSx.jpg',
    images: ['/assets/hero_lifestyle-BbWy7xSx.jpg'],
    sku: 'APP-TRENCH-05',
    description: 'Pure Mongolian double-faced cashmere, hand-tailored in Biella, Italy. Unstructured drape with a storm flap, horn buttons, and a belted waist.',
    status: 'published',
  },
];

async function seed() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/premium-ecommerce';
  await mongoose.connect(mongoUri);

  // Find an approved store or create one
  let store = await Store.findOne({ status: 'approved', isPubliclyVisible: true });
  if (!store) {
    let vendorUser = await User.findOne({ role: 'vendor' });
    if (!vendorUser) {
      vendorUser = await User.create({
        name: 'Maison Master Craftsman',
        email: 'maison.vendor@luxury.com',
        mobile: '9888777666',
        password: 'Password123!',
        role: 'vendor',
        isApproved: true,
        status: 'approved',
      });
    }

    store = await Store.create({
      name: 'Maison Haute Horlogerie & Atelier',
      slug: 'maison-haute-horlogerie',
      description: 'The master atelier of bespoke luxury timepieces and leathercraft.',
      businessAddress: '1 Place Vendôme, 75001 Paris, France',
      status: 'approved',
      isOpen: true,
      isPubliclyVisible: true,
      vendor: vendorUser._id,
    });
  }

  console.log(`Using approved store: "${store.name}" (${store._id})`);

  for (const item of sampleProducts) {
    const existing = await Product.findOne({ sku: item.sku });
    if (!existing) {
      const slug = await Product.generateUniqueSlug(item.name, store._id);
      await Product.create({
        ...item,
        slug,
        store: store._id,
        vendor: store.vendor,
      });
      console.log(`  ✓ Seeded Product: ${item.name} (${item.sku}) in [${item.category}]`);
    } else {
      console.log(`  - Product already exists: ${item.name}`);
    }
  }

  const total = await Product.countDocuments();
  console.log(`Total live products in MongoDB: ${total}`);

  await mongoose.disconnect();
}

seed();
