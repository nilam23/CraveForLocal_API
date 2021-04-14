const mongoose = require("mongoose");
const express = require("express");
const app = express();

const Item = require("./models/itemCollection");
const User = require("./models/userCollection");
const Order = require("./models/orderCollection");

mongoose
  .connect("mongodb://localhost/CraveForLocal", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => console.log("MONGODB CONNECTION SUCCESSFUL."))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("I am ready to serve.........");
});

app.get("/api/items", async (req, res) => {
  try {
    const item = await Item.find();
    res.json(item);
  } catch (error) {
    res.status(404).json("failed");
  }
});

app.get("/api/items/:id", async (req, res) => {
  try {
    const item = await Item.find({ _id: req.params.id });
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: "Product Not Found" });
    }
  } catch (error) {
    res.status(404).json("failed");
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.find({ _id: req.params.id });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User Not Found" });
    }
  } catch (error) {
    res.status(404).json("failed");
  }
});

app.get("/api/user/orders/:id", async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id });
    if (orders) {
      res.json(orders);
    } else {
      res.status(404).json({ message: "Not Found" });
    }
  } catch (error) {
    res.status(404).json("failed");
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running in on port ${PORT}`));
