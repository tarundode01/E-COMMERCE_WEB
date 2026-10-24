import mongoose from 'mongoose';
import Product from './models/Product.js';

await mongoose.connect('mongodb://127.0.0.1:27017/premium-ecommerce');

const updates = [
  { match: /Satchel|Venezia|Leather/i, image: '/luxury_bag.jpg' },
  { match: /Parfum|Fragrance|Amber/i, image: '/luxury_perfume.jpg' },
  { match: /Aviator|Eyewear|Sunglasses/i, image: '/luxury_sunglasses.jpg' },
  { match: /Overcoat|Cashmere|Trench/i, image: '/hero_lifestyle.jpg' },
  { match: /Timepiece|Chronograph|Watch|Horology/i, image: '/luxury_watch.jpg' },
  { match: /Smartphone|Aurora|Phone|Mobile/i, image: 'http://localhost:5173/luxury_smartphone_titanium.jpg' },
];

const products = await Product.find();
console.log('Total products in DB:', products.length);

for (const prod of products) {
  if (!prod.image || prod.image.trim() === '' || prod.image.includes('undefined')) {
    const text = `${prod.name} ${prod.category}`;
    let resolvedImage = '/luxury_watch.jpg';
    for (const u of updates) {
      if (u.match.test(text)) {
        resolvedImage = u.image;
        break;
      }
    }
    prod.image = resolvedImage;
    await prod.save();
    console.log('Updated image for:', prod.name, '->', resolvedImage);
  } else {
    console.log('Already has image:', prod.name, '->', prod.image);
  }
}

console.log('All product images verified in DB.');
process.exit(0);
