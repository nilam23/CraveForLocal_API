const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const User = require("../models/userCollection");
const Admin = require("../models/adminCollection");
const Vendor = require("../models/vendorCollection");
const Item = require("../models/itemCollection");
const Order = require("../models/orderCollection");

const indexObj = require("./index");


// Landing Page
router.get("", (req, res) => {
    res.render("landing");
});

router.get("/home", async (req, res) => {
    try {
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        if (indexObj.deletePath)
            indexObj.deletePath();
        const currentUser = await User.findOne({ _id: req.session.user_id }) ||
            await Admin.findOne({ _id: req.session.user_id }) ||
            await Vendor.findOne({ _id: req.session.user_id });
        // const items = await Item.find();
        res.render("user/home", { currentUser });
    } catch (error) {
        // res.status(404).json("failed");
        console.log(error)
    }
});

router.get("/seemore", async (req, res) => {
    const currentUser = await User.findOne({ _id: req.session.user_id });
    res.render("user/itemDetails", { currentUser });
});

router.get("/cart", indexObj.isUserLoggedin, (req, res) => {
    res.render("user/cart");
});

router.get("/api/items/:id", async (req, res) => {
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

router.get("/api/users/:id", async (req, res) => {
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

router.get("/api/user/orders/:id", async (req, res) => {
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


module.exports = router;