const mongoose = require("mongoose");

const itemSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      data: Buffer,
      contentType: String,
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    countInStock: {
      type: Number,
      required: true,
    },
    vendorID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Vendor"
    },
    status: {
      type: String,
      default: 'pending'
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Item", itemSchema);
