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
        const currentUser = await User.findOne({ _id: req.session.user_id });
        const items = await Item.find({ status: 'granted' });
        var totalCartItems = 0;
        if (currentUser) {
            currentUser.cart.forEach(item => {
                totalCartItems += item.totalQuantity;
            });
        }
        res.render("user/home", { currentUser, items, totalCartItems });
    } catch (error) {
        console.log(`USER: Home page error: ${error}`);
        res.redirect("/");
    }
});

// Item details page
router.get("/:id/seemore", async (req, res) => {
    try {
        const currentUser = await User.findOne({ _id: req.session.user_id });
        const item = await Item.findById(req.params.id);
        if (item.status == 'pending')
            return res.render("accessDeny");
        var totalCartItems = 0;
        if (currentUser) {
            currentUser.cart.forEach(item => {
                totalCartItems += item.totalQuantity;
            });
        }
        res.render("user/itemDetails", { currentUser, item, totalCartItems });
    } catch (error) {
        console.log(`USER: Item details error: ${error}`);
        res.redirect("/home");
    }
});

// Add to cart handle
router.post("/:id/addtocart", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (item.status == 'pending')
            return res.render('accessDeny');
        const user = await User.findById(req.session.user_id);
        var isAlreadyAdded = false;
        var totalQuantity;
        if (req.body.quantity == '')
            totalQuantity = 1;
        else
            totalQuantity = Number(req.body.quantity);
        user.cart.forEach(cartItem => {
            if (cartItem.itemID.equals(item._id)) {
                cartItem.totalQuantity += totalQuantity;
                cartItem.totalPrice += totalQuantity * Number(item.price);
                isAlreadyAdded = true;
            }
        });
        if (!isAlreadyAdded) {
            var cartItem = {
                itemID: item._id,
                totalQuantity,
                totalPrice: totalQuantity * Number(item.price)
            };
            user.cart.push(cartItem);
        }
        await user.save();
        req.session.message = {
            type: 'success',
            content: 'Item added to your cart.'
        };
        return res.redirect(`/${req.params.id}/seemore`);
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
        res.redirect(`/home`);
    } catch (error) {
        console.log(`USER: Add to wishlist error: ${error}`);
        res.redirect("/home");
    }
});

// Displaying wishlist
router.get("/wishlist", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id);
        const items = await Item.find();
        var wishlistItems = [];
        user.wishlist.forEach(itemID => {
            items.forEach(item => {
                if (itemID.equals(item._id) && item.status == 'granted')
                    wishlistItems.push(item);
            });
        });
        res.render("user/wishlist", { currentUser: user, items: wishlistItems });
    } catch (err) {
        console.log(`USER: Displaying wishlist error: ${error}`);
        res.redirect("/home");
    }
});

// Removing items from wishlist
router.post("/wishlist/:id/remove", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        const user = await User.findById(req.session.user_id);
        var doesContain = false;
        user.wishlist = user.wishlist.filter(itemID => {
            if (!itemID.equals(item._id)) {
                return itemID;
            } else {
                doesContain = true;
            }
        });
        if (doesContain) {
            await user.save();
            req.session.message = {
                type: 'success',
                content: 'Item has been removed from your wishlist.'
            }
        } else {
            req.session.message = {
                type: 'warning',
                content: 'Item does not exist on your wishlist.'
            }
        }
        res.redirect("/wishlist");
    } catch (err) {
        console.log(`USER: Remove from wishlist error: ${error}`);
        res.redirect("/home");
    }
});

// Displaying Cart
router.get("/cart", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id);
        const items = await Item.find();
        var cartItems = [];
        var cartTotal = 0;
        user.cart.forEach(cartItem => {
            items.forEach(item => {
                if (cartItem.itemID.equals(item._id) && item.status == 'granted') {
                    var doc = {};
                    doc.item = item;
                    doc.totalQuantity = cartItem.totalQuantity;
                    doc.totalPrice = cartItem.totalPrice;
                    cartTotal += doc.totalPrice;
                    cartItems.push(doc);
                }
            });
        });
        res.render("user/cart", { currentUser: user, items: cartItems, cartTotal });
    } catch (err) {
        console.log(`USER: Displaying cart error: ${error}`);
        res.redirect("/home");
    }
});

// Removing item from cart
router.post("/cart/:id/remove", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id);
        var doesContain = false;
        user.cart = user.cart.filter(cartItem => {
            if (!cartItem.itemID.equals(req.params.id))
                return cartItem;
            else
                doesContain = true;
        });
        if (doesContain) {
            await user.save();
            req.session.message = {
                type: 'success',
                content: 'Item has been removed from your cart.'
            }
        } else {
            req.session.message = {
                type: 'warning',
                content: 'Item does not exist on your cart.'
            }
        }
        res.redirect("/cart");
    } catch (err) {
        console.log(`USER: Removing item from cart error: ${error}`);
        res.redirect("/home");
    }
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