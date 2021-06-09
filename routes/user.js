const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const uuid = require("uuid");

const User = require("../models/userCollection");
const Admin = require("../models/adminCollection");
const Vendor = require("../models/vendorCollection");
const Item = require("../models/itemCollection");
const Order = require("../models/orderCollection");

const indexObj = require("./index");
const { compareSync } = require("bcrypt");

// Home page
router.get("/", async (req, res) => {
    try {
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        if (indexObj.deletePath)
            indexObj.deletePath();
        const currentUser = await User.findById(req.session.user_id) ||
            await Admin.findById(req.session.user_id) ||
            await Vendor.findById(req.session.user_id);
        const items = await Item.find({ status: 'granted' });
        var totalCartItems = 0;
        if (currentUser && currentUser.userType == 'user') {
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
        const currentUser = await User.findById(req.session.user_id) ||
            await Admin.findById(req.session.user_id) ||
            await Vendor.findById(req.session.user_id);
        const item = await Item.findById(req.params.id);
        if (item.status == 'pending')
            return res.render("accessDeny");
        var totalCartItems = 0;
        if (currentUser && currentUser.userType == 'user') {
            currentUser.cart.forEach(item => {
                totalCartItems += item.totalQuantity;
            });
        }
        res.render("user/itemDetails", { currentUser, item, totalCartItems });
    } catch (error) {
        console.log(`USER: Item details error: ${error}`);
        res.redirect("/");
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
        if (req.session.cache) {
            if (req.session.cache.body.quantity == '')
                totalQuantity = 1;
            else
                totalQuantity = Number(req.session.cache.body.quantity);
        } else {
            if (req.body.quantity == '')
                totalQuantity = 1;
            else
                totalQuantity = Number(req.body.quantity);
        }
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
        delete req.session.cache;
        return res.redirect(`/${req.params.id}/seemore`);
    } catch (error) {
        console.log(`USER: Add to cart error: ${error}`);
        res.redirect("/");
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
        res.redirect(`/`);
    } catch (error) {
        console.log(`USER: Add to wishlist error: ${error}`);
        res.redirect("/");
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
        res.render("user/myWishlist", { currentUser: user, items: wishlistItems });
    } catch (error) {
        console.log(`USER: Displaying wishlist error: ${error}`);
        res.redirect("/");
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
        delete req.session.cache;
        res.redirect("/wishlist");
    } catch (error) {
        console.log(`USER: Remove from wishlist error: ${error}`);
        res.redirect("/");
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
        res.render("user/myCart", { currentUser: user, items: cartItems, cartTotal });
    } catch (error) {
        console.log(`USER: Displaying cart error: ${error}`);
        res.redirect("/");
    }
});

// Updating cart details
router.post('/cart/:id/update', indexObj.isUserLoggedin, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        const user = await User.findById(req.session.user_id);
        const itemPrice = item.price;
        var quantity;
        if (req.session.cache) {
            if (req.session.cache.body.quantity == '')
                quantity = 1;
            else
                quantity = Number(req.session.cache.body.quantity);
        } else {
            if (req.body.quantity == '')
                quantity = 1;
            else
                quantity = Number(req.body.quantity);
        }
        user.cart.forEach(cartItem => {
            if (cartItem.itemID.equals(req.params.id)) {
                cartItem.totalQuantity = quantity;
                cartItem.totalPrice = quantity * itemPrice;
            }
        });
        req.session.message = {
            type: 'success',
            content: 'Your cart has been updated.'
        };
        await user.save();
        delete req.session.cache;
        res.redirect("/cart");
    } catch (error) {
        console.log(`USER: Updating cart error: ${error}`);
        res.redirect("/");
    }
})

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
        delete req.session.cache;
        res.redirect("/cart");
    } catch (error) {
        console.log(`USER: Removing item from cart error: ${error}`);
        res.redirect("/");
    }
});

// Checkout
router.get("/checkout", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id);
        if (!user.cart.length)
            return res.render("user/denyCheckout");
        var totalItems = 0;
        var totalPrice = 0;
        var deliveryCharge = 'FREE';
        user.cart.forEach(item => {
            totalItems += item.totalQuantity;
            totalPrice += item.totalPrice;
        });
        res.render("user/checkout", { totalItems, totalPrice, deliveryCharge });
    } catch (error) {
        console.log(`USER: Proceed to checkout error: ${error}`);
        res.redirect("/cart");
    }
});

// Place an order
router.post("/placeorder", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id);
        if (!user.cart.length)
            return res.render("user/denyCheckout");
        var items = user.cart;
        var totalPrice = 0;
        const orderID = uuid.v4();
        user.cart.forEach(item => totalPrice += item.totalPrice);
        var shippingAddress;
        if (req.session.cache) {
            shippingAddress = req.session.cache.body.address;
            paymentMethod = req.session.cache.body.paymentMethod;
        } else {
            shippingAddress = req.body.address;
            paymentMethod = req.body.paymentMethod;
        }
        const orderDocument = new Order({
            orderID,
            userID: req.session.user_id,
            shippingAddress,
            items,
            paymentMethod,
            totalPrice
        });
        await orderDocument.save();
        user.cart = [];
        await user.save();
        req.session.order_id = orderID;
        req.session.order_exec = true;
        delete req.session.cache;
        res.redirect("/ordersuccess");
    } catch (error) {
        console.log(`USER: Order error: ${error}`);
        res.redirect("/orderfailure");
    }
});

// Order success redirect
router.get('/ordersuccess', (req, res) => {
    if (!req.session.order_exec)
        return res.render("accessDeny");
    var orderID = req.session.order_id;
    req.session.order_id = null;
    req.session.order_exec = null;
    res.render("user/orderSuccess", { orderID });
});

//  Order failure redirect
router.get('/orderfailure', (req, res) => {
    if (!req.session.order_exec)
        return res.render("accessDeny");
    req.session.order_id = null;
    req.session.order_exec = null;
    res.render("user/orderFailure");
});

// Viewing my orders
router.get("/orders", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const orders = await Order.find({ userID: req.session.user_id });
        const items = await Item.find({ status: 'granted' });
        var myOrders = [];
        orders.forEach(order => {
            order.items.forEach(orderItem => {
                items.forEach(item => {
                    if (orderItem.itemID.equals(item._id)) {
                        var doc = {};
                        doc.id = orderItem.itemID;
                        doc.title = item.title;
                        doc.image = item.image;
                        doc.quantity = orderItem.totalQuantity;
                        doc.price = orderItem.totalPrice;
                        doc.status = orderItem.status;
                        doc.address = order.shippingAddress;
                        doc.orderID = order.orderID;
                        doc.orderedAt = order.orderedAt.toLocaleDateString();
                        myOrders.push(doc);
                    }
                });
            });
        });
        res.render("user/myOrders", { myOrders });
    } catch (error) {
        console.log(`USER: Viewing my orders error: ${error}`);
        res.redirect("/orderfailure");
    }
});

// Updating shipping address from my orders
router.get('/orders/:orderID/:itemID/updateaddress', indexObj.isUserLoggedin, async (req, res) => {
    try {
        const { orderID, itemID } = req.params;
        const order = await Order.findOne({ orderID: orderID });
        var deny = false;
        if (!order || !order.userID.equals(req.session.user_id))
            return res.render("accessDeny");
        order.items.forEach(item => {
            if (item.itemID == itemID && item.status == 'cancelled')
                deny = true;
        });
        if (!deny)
            return res.render("user/updateShippingAddress", { address: order.shippingAddress, orderID, itemID });
        res.render("accessDeny");
    } catch (error) {
        console.log(`USER: Updating shipping address error: ${error}`);
        res.redirect("/orders");
    }
});

router.post('/orders/:orderID/:itemID/updateaddress', indexObj.isUserLoggedin, async (req, res) => {
    try {
        const { orderID, itemID } = req.params;
        const order = await Order.findOne({ orderID: orderID });
        var deny = false;
        if (!order || !order.userID.equals(req.session.user_id))
            return res.render("accessDeny");
        order.items.forEach(item => {
            if (item.itemID == itemID && item.status == 'cancelled')
                deny = true;
        });
        if (!deny) {
            if (req.session.cache)
                order.shippingAddress = req.session.cache.body.address;
            else
                order.shippingAddress = req.body.address;
            await order.save();
            req.session.message = {
                type: 'success',
                content: 'Shipping address has been updated.'
            }
            delete req.session.cache;
            return res.redirect("/orders");
        }
        res.render("accessDeny");
    } catch (error) {
        console.log(`USER: Updating shipping address (POST) error: ${error}`);
        res.redirect("/orders");
    }
});

// Cancelling order
router.post("/orders/:orderID/:itemID/cancel", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const { orderID, itemID } = req.params;
        const order = await Order.findOne({ orderID: orderID });
        const item = await Item.findById(itemID);
        if (!order || !order.userID.equals(req.session.user_id))
            return res.render('accessDeny');
        order.items.forEach(orderItem => {
            if (orderItem.itemID == itemID && (orderItem.status == 'pending' || orderItem.status == 'confirmed')) {
                if (orderItem.status == 'confirmed')
                    item.countInStock += orderItem.totalQuantity;
                orderItem.status = 'cancelled';
                req.session.message = {
                    type: 'success',
                    content: `Your ordered item has been cancelled.`
                }
            }
        });
        await item.save();
        await order.save();
        delete req.session.cache;
        res.redirect("/orders");
    } catch (error) {
        console.log(`USER: Cancelling order error: ${error}`);
        res.redirect("/orders");
    }
});

// Deleting order after cancellation
router.post("/orders/:orderID/:itemID/delete", indexObj.isUserLoggedin, async (req, res) => {
    try {
        const { orderID, itemID } = req.params;
        const order = await Order.findOne({ orderID: orderID });
        if (!order || !order.userID.equals(req.session.user_id))
            return res.render('accessDeny');
        for (let i = 0; i < order.items.length; i++) {
            let item = order.items[i];
            if (item.itemID == itemID && item.status == 'cancelled')
                order.items.pop(item);
        }
        if (!order.items.length)
            await order.remove();
        else
            await order.save();
        req.session.message = {
            type: 'success',
            content: 'Your order has been deleted.'
        }
        delete req.session.cache;
        res.redirect("/orders");
    } catch (error) {
        console.log(`USER: Deleting order error: ${error}`);
        res.redirect("/orders");
    }
});

module.exports = router;