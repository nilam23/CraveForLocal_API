const mongoose = require("mongoose");

const orderSchema = mongoose.Schema(
  {
    orderID: {
      type: String,
      unique: true,
      required: true
    },
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    shippingAddress: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    items: [
      {
        itemID: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Item",
        },
        totalQuantity: {
          type: Number,
          required: true
        },
        totalPrice: {
          type: Number,
          required: true
        },
        status: {
          type: String,
          default: 'pending'
        }
      }
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    orderedAt: {
      type: Date,
      default: Date.now
    },
    deliveredAt: {
      type: Date,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
