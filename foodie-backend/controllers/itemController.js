const Item = require('../models/Item');

// 🟢 [CREATE] Add a new food item to the database
exports.createItem = async (req, res, next) => {
    try {
        const newItem = new Item(req.body);
        const savedItem = await newItem.save();
        res.status(201).json({ success: true, data: savedItem });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// 🔵 [READ] Fetch all food items from MongoDB
exports.getAllItems = async (req, res, next) => {
    try {
        const items = await Item.find();
        res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch items' });
    }
};

// 🟡 [UPDATE] Modify price or availability of an item
exports.updateItem = async (req, res, next) => {
    try {
        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true } // Return the fresh item & enforce schema rules
        );
        if (!updatedItem) return res.status(404).json({ success: false, error: 'Item not found' });
        res.status(200).json({ success: true, data: updatedItem });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// 🔴 [DELETE] Remove an item from the catalog
exports.deleteItem = async (req, res, next) => {
    try {
        const deletedItem = await Item.findByIdAndDelete(req.params.id);
        if (!deletedItem) return res.status(404).json({ success: false, error: 'Item not found' });
        res.status(200).json({ success: true, message: `Deleted ${deletedItem.name}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};