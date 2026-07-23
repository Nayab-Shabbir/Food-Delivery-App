require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Route Imports
const itemRoutes = require('./routes/itemRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "foodie_express_quantum_crypto_key_2026";

app.use(cors());
app.use(express.json()); 

// ==========================================================
// DATABASE CONNECTION 
// ==========================================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodie_db';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('🔌 Connected to MongoDB successfully!'))
    .catch((err) => console.error('❌ Database connection failure:', err));

// ==========================================================
// MONGOOSE SCHEMAS & MODELS
// ==========================================================

// 1. User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// 2. Cart Schema
const cartSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    items: [{
        itemId: { type: String, required: true },
        name: String,
        price: Number,
        qty: { type: Number, default: 1 }
    }]
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);

// 3. Order Schema
const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    customer: { type: String, required: true },
    purchasedItems: Array,
    totalAmountPaid: Number,
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// Fallback Inventory Lookup (if dynamic lookup isn't present)
const menuDatabase = [
    { id: "65f1a2b3c4d5e6f789012341", name: "Double Pepperoni Pizza", price: 12.99 },
    { id: "65f1a2b3c4d5e6f789012342", name: "Bacon Cheddar Burger", price: 8.99 },
    { id: "65f1a2b3c4d5e6f789012343", name: "Signature Salmon Sushi", price: 15.99 }
];

// ==========================================================
// SECURITY GATEKEEPER MIDDLEWARE
// ==========================================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log("❌ Blocked: Unauthenticated guest tried to request a protected route.");
        return res.status(401).json({ success: false, error: "Access Denied." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log("❌ Blocked: User request sent an invalid or expired token.");
            return res.status(403).json({ success: false, error: "Forbidden session." });
        }
        req.user = user;
        next();
    });
}

// ==========================================================
// AUTHENTICATION ROUTING SYSTEM 
// ==========================================================
app.post('/api/v1/auth/register', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        console.log(`👤 Register request received for: "${username}"`);
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: "Identity properties missing." });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log(`⚠️ Register failed: Username "${username}" already exists.`);
            return res.status(422).json({ success: false, error: "Identity conflict." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Save user 
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        // Initialize an empty cart record 
        await Cart.create({ username, items: [] });

        console.log(`✅ Success: User account "${username}" saved to MongoDB.`);
        res.status(201).json({ success: true });
    } catch (err) { next(err); }
});

app.post('/api/v1/auth/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        console.log(`🔑 Login challenge initiated for: "${username}"`);
        
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            console.log(`❌ Login failed: Bad credentials for "${username}"`);
            return res.status(401).json({ success: false, error: "Invalid username or password." });
        }

        const accessToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        console.log(`✅ Login success: Access token issued to customer "${username}"`);
        res.status(200).json({ success: true, token: accessToken, username });
    } catch (err) { next(err); }
});

// ==========================================================
// CART OPERATIONS 
// ==========================================================
app.get('/api/v1/cart', authenticateToken, async (req, res, next) => {
    try {
        let cartRecord = await Cart.findOne({ username: req.user.username });
        if (!cartRecord) {
            cartRecord = await Cart.create({ username: req.user.username, items: [] });
        }
        res.status(200).json(cartRecord.items);
    } catch (err) { next(err); }
});

app.post('/api/v1/cart', authenticateToken, async (req, res, next) => {
    try {
        const { itemId } = req.body;
        console.log(`🛒 Cart modification request from "${req.user.username}": Add Item ID ${itemId}`);
        
        if (!itemId) {
            return res.status(400).json({ success: false, error: "Malformed or missing Item ID." });
        }

        const stringItemId = String(itemId);
        let product = menuDatabase.find(d => String(d.id) === stringItemId);

        // Fallback default details if item is custom or unknown
        if (!product) {
            product = { id: stringItemId, name: "Special Culinary Item", price: 10.99 };
        }

        let cartRecord = await Cart.findOne({ username: req.user.username });
        if (!cartRecord) {
            cartRecord = new Cart({ username: req.user.username, items: [] });
        }

        const match = cartRecord.items.find(i => String(i.itemId) === stringItemId || String(i.id) === stringItemId);
        if (match) {
            match.qty += 1;
        } else {
            cartRecord.items.push({ 
                itemId: stringItemId, 
                name: product.name, 
                price: product.price, 
                qty: 1 
            });
        }

        await cartRecord.save();
        console.log(`💾 Saved updated cart for "${req.user.username}" to MongoDB.`);
        res.status(201).json({ success: true, cart: cartRecord.items });
    } catch (err) { next(err); }
});

app.post('/api/v1/cart/quantity', authenticateToken, async (req, res, next) => {
    try {
        const { itemId, change } = req.body;
        const stringItemId = String(itemId);
        console.log(`🔄 Quantity shift from "${req.user.username}": Item ID ${itemId} by ${change}`);
        
        let cartRecord = await Cart.findOne({ username: req.user.username });
        if (cartRecord) {
            const item = cartRecord.items.find(i => String(i.itemId) === stringItemId || String(i.id) === stringItemId);
            if (item) {
                item.qty += change;
                if (item.qty <= 0) {
                    cartRecord.items = cartRecord.items.filter(i => String(i.itemId) !== stringItemId && String(i.id) !== stringItemId);
                }
            }
            await cartRecord.save();
        }

        res.status(200).json({ success: true, cart: cartRecord ? cartRecord.items : [] });
    } catch (err) { next(err); }
});

app.post('/api/v1/cart/delete', authenticateToken, async (req, res, next) => {
    try {
        const { itemId } = req.body;
        const stringItemId = String(itemId);
        console.log(`🗑️ Delete item request from "${req.user.username}": Item ID ${itemId}`);
        
        let cartRecord = await Cart.findOne({ username: req.user.username });
        if (cartRecord) {
            cartRecord.items = cartRecord.items.filter(i => String(i.itemId) !== stringItemId && String(i.id) !== stringItemId);
            await cartRecord.save(); 
        }

        res.status(200).json({ success: true, cart: cartRecord ? cartRecord.items : [] });
    } catch (err) { next(err); }
});

// ==========================================================
// PERSISTENT TRANSACTION CHECKOUT PROCESSOR
// ==========================================================
app.post('/api/v1/checkout', authenticateToken, async (req, res, next) => {
    try {
        let cartRecord = await Cart.findOne({ username: req.user.username });
        const userCart = cartRecord ? cartRecord.items : [];

        console.log(`💳 Checkout command executed by "${req.user.username}"...`);

        if (userCart.length === 0) {
            console.log(`⚠️ Checkout failed: Cart is completely empty for user "${req.user.username}"`);
            return res.status(400).json({ success: false, error: "Checkout aborted: Target cart record set empty." });
        }

        const rawTotal = userCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const finalizedTotal = parseFloat(rawTotal.toFixed(2));

        const orderId = "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

        // Create new Order document 
        const newOrder = new Order({
            orderId,
            customer: req.user.username,
            purchasedItems: userCart,
            totalAmountPaid: finalizedTotal
        });
        await newOrder.save();

        // Clear user cart 
        cartRecord.items = [];
        await cartRecord.save();

        console.log(`✅ Success: Transaction ${orderId} logged into MongoDB. Total: $${finalizedTotal}.`);
        res.status(200).json({ 
            success: true, 
            orderId: orderId, 
            totalAmount: finalizedTotal.toFixed(2) 
        });
    } catch (err) { next(err); }
});

// ==========================================================
// MONGODB CRUD ROUTES
// ==========================================================
app.use('/api/v1/items', itemRoutes);

// ==========================================================
// GLOBAL ERROR HANDLING MIDDLEWARE
// ==========================================================
app.use((err, req, res, next) => {
    console.error("🚨 Fault Trapped:", err.stack);
    res.status(500).json({ success: false, error: "Internal System Error." });
});

// Server Boot Sequence
app.listen(PORT, () => {
    console.log(`🚀 Foodie Express Backend active on port ${PORT}`);
    console.log(`📝 Connected to Database Collections: users, carts, orders\n`);
});