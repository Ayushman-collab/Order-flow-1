const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-cafe');
        console.log('✅ Connected to MongoDB');

        // Create Admin model
        const adminSchema = new mongoose.Schema({
            username: { type: String, required: true, unique: true },
            password: { type: String, required: true },
            role: { type: String, default: 'admin' }
        });

        const Admin = mongoose.model('Admin', adminSchema);

        // Create MenuItem model
        const menuItemSchema = new mongoose.Schema({
            name: { type: String, required: true },
            description: { type: String, required: true },
            price: { type: Number, required: true },
            category: { type: String, required: true },
            image: { type: String, required: true },
            available: { type: Boolean, default: true }
        });

        const MenuItem = mongoose.model('MenuItem', menuItemSchema);

        // Create default admin user
        const adminExists = await Admin.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 12);
            await Admin.create({
                username: 'admin',
                password: hashedPassword
            });
            console.log('✅ Default admin user created');
            console.log('👑 Username: admin');
            console.log('🔑 Password: admin123');
            console.log('⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
        } else {
            console.log('✅ Admin user already exists');
        }

        // Create sample menu items
        const menuItems = [
            {
                name: "Espresso",
                description: "Strong and rich Italian coffee",
                price: 3.50,
                category: "coffee",
                image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {
                name: "Cappuccino",
                description: "Espresso with steamed milk foam",
                price: 4.50,
                category: "coffee",
                image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {
                name: "Latte",
                description: "Smooth espresso with steamed milk",
                price: 4.75,
                category: "coffee",
                image: "https://images.unsplash.com/photo-1561047029-3000c68339ca?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {
                name: "Green Tea",
                description: "Refreshing Japanese green tea",
                price: 3.00,
                category: "tea",
                image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {
                name: "Croissant",
                description: "Buttery French pastry",
                price: 3.50,
                category: "pastry",
                image: "https://images.unsplash.com/photo-1555507036-ab794f27d2e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {
                name: "Blueberry Muffin",
                description: "Fresh muffin with blueberries",
                price: 3.75,
                category: "pastry",
                image: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            },
            {
                name: "Turkey Sandwich",
                description: "Sliced turkey with lettuce and mayo",
                price: 8.50,
                category: "sandwich",
                image: "https://images.unsplash.com/photo-1567234669003-dce7a7a88821?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            }
        ];

        for (const item of menuItems) {
            const exists = await MenuItem.findOne({ name: item.name });
            if (!exists) {
                await MenuItem.create(item);
                console.log(`✅ Created menu item: ${item.name}`);
            }
        }

        console.log('🎉 Database setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Run: npm start');
        console.log('2. Open: http://localhost:5000');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Setup error:', error);
        process.exit(1);
    }
}

setupDatabase();