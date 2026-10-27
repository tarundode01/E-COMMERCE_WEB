import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const logoSrc = 'C:/Users/DELL/.gemini/antigravity-ide/brain/1db8de27-1127-4316-b019-40b3a4ad3d9d/vendor3_atelier_logo_1793020933486.jpg';
const bannerSrc = 'C:/Users/DELL/.gemini/antigravity-ide/brain/1db8de27-1127-4316-b019-40b3a4ad3d9d/vendor3_store_banner_1793020952789.jpg';

const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const logoDest = path.join(uploadsDir, 'vendor3_logo.jpg');
const bannerDest = path.join(uploadsDir, 'vendor3_banner.jpg');

fs.copyFileSync(logoSrc, logoDest);
fs.copyFileSync(bannerSrc, bannerDest);
console.log('Copied logo to', logoDest);
console.log('Copied banner to', bannerDest);

await mongoose.connect('mongodb://127.0.0.1:27017/premium-ecommerce');
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));

const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash('vender3@123', salt);

const updatedUser = await User.findOneAndUpdate(
  { email: 'vender3@gmail.com' },
  { $set: { password: hashedPassword, role: 'vendor', status: 'active', isActive: true } },
  { new: true }
);
console.log('Updated User:', updatedUser ? updatedUser.email : 'not found');

const updatedStore = await Store.findOneAndUpdate(
  { vendor: updatedUser._id },
  { 
    $set: { 
      status: 'approved',
      logoUrl: '/uploads/vendor3_logo.jpg',
      bannerUrl: '/uploads/vendor3_banner.jpg',
      isOpen: true,
      isPubliclyVisible: true,
      deliveryAvailable: true
    } 
  },
  { new: true }
);
console.log('Updated Store:', updatedStore ? { 
  id: updatedStore._id, 
  name: updatedStore.name, 
  status: updatedStore.status, 
  logoUrl: updatedStore.logoUrl, 
  bannerUrl: updatedStore.bannerUrl 
} : 'not found');

await mongoose.disconnect();
console.log('Setup Vendor 3 completed successfully!');
