const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = "foodie_express_quantum_crypto_key_2026";
const DATA_FILE = path.join(__dirname, 'persistentStore.json');

app.use(cors());
app.use(express.json());

const menuDatabase = [
    { id: 1, name: "Double Pepperoni Pizza", price: 12.99 },
    { id: 2, name: "Bacon Cheddar Burger", price: 8.99 },
    { id: 3, name: "Signature Salmon Sushi", price: 15.99 }
];

// ==========================================================
// PERSISTENCE LAYER CONTROLLER
// ==========================================================
async function initializeStore() {
    try {
        await fs.access(DATA_FILE);
        console.log("💾 persistentStore.json found and loaded successfully.");
    } catch {
        console.log("💾 No persistent store found. Creating brand new database file...");
        const initialData = { users: {}, carts: {}, orders: [] };
        await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
}

async function readStore() {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

async function writeStore(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

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
        if (!username || !password) return res.status(400).json({ success: false, error: "Identity properties missing." });

        const store = await readStore();
        if (store.users[username]) {
            console.log(`⚠️ Register failed: Username "${username}" already exists.`);
            return res.status(422).json({ success: false, error: "Identity conflict." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        store.users[username] = { password: hashedPassword };
        store.carts[username] = [];
        
        await writeStore(store);
        console.log(`✅ Success: User account "${username}" created and saved to disk.`);
        res.status(201).json({ success: true });
    } catch (err) { next(err); }
});

app.post('/api/v1/auth/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        console.log(`🔑 Login challenge initiated for: "${username}"`);
        const store = await readStore();
        const user = store.users[username];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            console.log(`❌ Login failed: Bad credentials for "${username}"`);
            return res.status(401).json({ success: false, error: "Invalid username or password." });
        }

        const accessToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        console.log(`✅ Login success: Access token issued to customer "${username}"`);
        res.status(200).json({ success: true, token: accessToken, username });
    } catch (err) { next(err); }
});

// ==========================================================
// CART OPERATIONS
// ==========================================================
app.get('/api/v1/cart', authenticateToken, async (req, res, next) => {
    try {
        const store = await readStore();
        res.status(200).json(store.carts[req.user.username] || []);
    } catch (err) { next(err); }
});

app.post('/api/v1/cart', authenticateToken, async (req, res, next) => {
    try {
        const { itemId } = req.body;
        console.log(`🛒 Cart modification request from "${req.user.username}": Add Item ID ${itemId}`);
        if (itemId === undefined || typeof itemId !== 'number') return res.status(400).json({ success: false, error: "Malformed ID." });

        const product = menuDatabase.find(d => d.id === itemId);
        if (!product) return res.status(422).json({ success: false, error: "Item absent from inventory registry." });

        const store = await readStore();
        const userCart = store.carts[req.user.username] || [];

        const match = userCart.find(i => i.id === itemId);
        if (match) match.qty += 1;
        else userCart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });

        store.carts[req.user.username] = userCart;
        await writeStore(store);
        console.log(`💾 Saved updated cart for "${req.user.username}" to store file.`);
        res.status(201).json({ success: true, cart: userCart });
    } catch (err) { next(err); }
});

app.post('/api/v1/cart/quantity', authenticateToken, async (req, res, next) => {
    try {
        const { itemId, change } = req.body;
        console.log(`🔄 Quantity shift from "${req.user.username}": Item ID ${itemId} by ${change}`);
        const store = await readStore();
        let userCart = store.carts[req.user.username] || [];

        const item = userCart.find(i => i.id === itemId);
        if (item) {
            item.qty += change;
            if (item.qty <= 0) userCart = userCart.filter(i => i.id !== itemId);
        }

        store.carts[req.user.username] = userCart;
        await writeStore(store);
        res.status(200).json({ success: true, cart: userCart });
    } catch (err) { next(err); }
});

app.post('/api/v1/cart/delete', authenticateToken, async (req, res, next) => {
    try {
        const { itemId } = req.body;
        console.log(`🗑️ Delete item request from "${req.user.username}": Item ID ${itemId}`);
        const store = await readStore();
        store.carts[req.user.username] = (store.carts[req.user.username] || []).filter(i => i.id !== itemId);
        await writeStore(store);
        res.status(200).json({ success: true, cart: store.carts[req.user.username] });
    } catch (err) { next(err); }
});

// ==========================================================
// PERSISTENT TRANSACTION CHECKOUT PROCESSOR
// ==========================================================
app.post('/api/v1/checkout', authenticateToken, async (req, res, next) => {
    try {
        const store = await readStore();
        const userCart = store.carts[req.user.username] || [];

        console.log(`💳 Checkout command executed by "${req.user.username}"...`);

        if (userCart.length === 0) {
            console.log(`⚠️ Checkout failed: Cart is completely empty for user "${req.user.username}"`);
            return res.status(400).json({ success: false, error: "Checkout aborted: Target cart record set empty." });
        }

        const rawTotal = userCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const finalizedTotal = parseFloat(rawTotal.toFixed(2));

        // Create historical record receipt
        const orderReceipt = {
            orderId: "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
            timestamp: new Date().toISOString(),
            customer: req.user.username,
            purchasedItems: [...userCart],
            totalAmountPaid: finalizedTotal
        };

        if (!store.orders) store.orders = [];
        
        // Save history straight into json file
        store.orders.push(orderReceipt);
        
        // Empty out user's active shopping cart session
        store.carts[req.user.username] = []; 
        
        await writeStore(store);
        console.log(`✅ Success: Transaction ${orderReceipt.orderId} logged. Total: $${orderReceipt.totalAmountPaid}.`);
        res.status(200).json({ 
            success: true, 
            orderId: orderReceipt.orderId, 
            totalAmount: orderReceipt.totalAmountPaid.toFixed(2) 
        });
    } catch (err) { next(err); }
});

app.use((err, req, res, next) => {
    console.error("🚨 Fault Trapped:", err.stack);
    res.status(500).json({ success: false, error: "Internal System Error." });
});

initializeStore().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Foodie Express Backend active on port ${PORT}`);
        console.log(`📝 Monitoring database: ${DATA_FILE}\n`);
    });
});