import mongoose from 'mongoose';

const categoryImages = {
  'Designer Eyewear': '/luxury_sunglasses.jpg',
  'Fine Fragrance': '/luxury_perfume.jpg',
  'Handcrafted Goods': '/luxury_bag.jpg',
  'Haute Couture': '/hero_lifestyle.jpg',
  'Luxury Horology': '/luxury_watch.jpg',
  'mobile': '/luxury_smartphone_titanium.jpg',
};

async function seedCategoryImages() {
  await mongoose.connect('mongodb://127.0.0.1:27017/premium-ecommerce');
  for (const [name, img] of Object.entries(categoryImages)) {
    const res = await mongoose.connection.db.collection('categories').updateOne(
      { name: new RegExp(`^${name}$`, 'i') },
      { $set: { image: img } }
    );
    console.log(`Updated image for ${name}: matched ${res.matchedCount}`);
  }
  console.log('Category images updated successfully.');
  process.exit(0);
}

seedCategoryImages().catch((err) => {
  console.error(err);
  process.exit(1);
});
