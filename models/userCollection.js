const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Item",
        }
    ],
    cart: [
        {
            itemID: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: "Item",
            },
            totalQuantity: {
                type: Number
            },
            totalPrice: {
                type: Number
            }
        }
    ],
    userType: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("User", userSchema);