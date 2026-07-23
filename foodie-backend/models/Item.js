const mongoose = require('mongoose');

// Define the schema (blueprint) for a single food item
const itemSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'A food item must have a name!'],
        trim: true // Automatically removes accidental spaces at the start/end
    },
    price: { 
        type: Number, 
        required: [true, 'A food item must have a price!'],
        min: [0, 'Price cannot be negative'] // Prevents accidental free or negative items
    },
    category: { 
        type: String, 
        required: [true, 'You must choose a food category!'],
        enum: ['Appetizer', 'Main Course', 'Dessert', 'Beverage'] // Restricts to only these types
    },
    isAvailable: { 
        type: Boolean, 
        default: true 
    }
}, { 
    timestamps: true // Automatically creates 'createdAt' and 'updatedAt' fields for us!
});

// Turn that blueprint into a working model and export it
module.exports = mongoose.model('Item', itemSchema);