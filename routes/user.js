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
router.get("/", (req, res) => {
    res.render("landing");
});

// Home page
router.get("/home", async (req, res) => {
    try {
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        if (indexObj.deletePath)
            indexObj.deletePath();
        const currentUser = await User.findOne({ _id: req.session.user_id }) ||
            await Admin.findOne({ _id: req.session.user_id }) ||
            await Vendor.findOne({ _id: req.session.user_id });
        const items = await Item.find({ status: 'granted' });
        res.render("user/home", { currentUser, items });
    } catch (error) {
        console.log(`USER: Home page error: ${error}`);
        res.redirect("/");
    }
});

// Item details page
router.get("/:id/seemore", async (req, res) => {
    try {
        const currentUser = await User.findOne({ _id: req.session.user_id });
        // currentUser.cart = [];
        // await currentUser.save()
        const item = await Item.findById(req.params.id);
        if (item.status == 'pending')
            return res.render("accessDeny");
        res.render("user/itemDetails", { currentUser, item });
    } catch (error) {
        console.log(`USER: Item details error: ${error}`);
        res.redirect("/home");
    }
});

// Add to cart handle
router.get("/:id/addtocart", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (item.status == 'pending')
            return res.render('accessDeny');
        const user = await User.findById(req.session.user_id);
        var isAddedtoCart = false;
        user.cart.forEach(itemID => {
            if (itemID.equals(item._id)) {
                req.session.message = {
                    type: 'warning',
                    content: 'Item is already added to your cart.'
                };
                isAddedtoCart = true;
            }
        });
        if (!isAddedtoCart) {
            user.cart.push(item._id);
            await user.save();
            req.session.message = {
                type: 'success',
                content: 'Item added to your cart.'
            };
        }
        console.log(user);
        res.redirect(`/${item._id}/seemore`);
    } catch (error) {
        console.log(`USER: Add to cart error: ${error}`);
        res.redirect("/home");
    }
});

// Add to wishlist handle
router.get("/:id/addtowishlist", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (item.status == 'pending')
            return res.render('accessDeny');
        const user = await User.findById(req.session.user_id);
        var isAddedtoWishlist = false;
        user.wishlist.forEach(itemID => {
            if (itemID.equals(item._id)) {
                req.session.message = {
                    type: 'warning',
                    content: 'Item is already added to your wishlist.'
                };
                isAddedtoWishlist = true;
            }
        });
        if (!isAddedtoWishlist) {
            user.wishlist.push(item._id);
            await user.save();
            req.session.message = {
                type: 'success',
                content: 'Item added to your wishlist.'
            };
        }
        console.log(user);
        res.redirect(`/${item._id}/seemore`);
    } catch (error) {
        console.log(`USER: Add to wishlist error: ${error}`);
        res.redirect("/home");
    }
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