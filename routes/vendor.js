const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const dotenv = require("dotenv").config();

// const User = require("../models/userCollection");
// const Admin = require("../models/adminCollection");
const Vendor = require("../models/vendorCollection");
const Item = require("../models/itemCollection");
const Order = require("../models/orderCollection");

const indexObj = require("./index");
const { type } = require("os");

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

var upload = multer({ storage: storage });


// Vendor home page
router.get("/vendor", indexObj.isVendorLoggedin, (req, res) => {
    res.render("vendor/home");
});

// Adding a new product to the database
router.get("/vendor/addproduct", indexObj.isVendorLoggedin, (req, res) => {
    res.render("vendor/addProduct");
});

router.post("/vendor/addproduct", indexObj.isVendorLoggedin, upload.single('image'), async (req, res, next) => {
    try {
        const dirname = __dirname.replace('routes', '');
        const vendor = await Vendor.findOne({ _id: req.session.user_id });
        const newItem = new Item({
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            price: req.body.price,
            countInStock: req.body.quantity,
            vendorID: vendor._id,
            image: {
                data: fs.readFileSync(path.join(dirname + '/uploads/' + req.file.filename)),
                contentType: 'image/png'
            }
        });
        await newItem.save();
        req.session.message = {
            type: 'success',
            content: 'Added. Admin will shortly verify your product.'
        }
        res.redirect("/vendor");
    } catch (err) {
        console.log(`---VENDOR/ADD PRODUCT ERROR: ${err}.---`);
        res.redirect("/vendor");
    }
});


// Retrieving products from database and then categorizing them.
router.get("/vendor/products", indexObj.isVendorLoggedin, async (req, res) => {
    try {
        var items = await Item.find();
        var categories = [];
        items.forEach(item => {
            if ((item.vendorID == req.session.user_id) && item.status == 'granted')
                categories.push(item.category);
        });
        categories = [...new Set(categories)];
        res.render("vendor/productCategories", { categories });
    } catch (err) {
        console.log(`---VENDOR/PRODUCT CATEGORIES ERROR: ${err}.---`);
        res.redirect("/vendor");
    }
});

// Displaying products specific to a category
router.get("/vendor/products/:category", indexObj.isVendorLoggedin, async (req, res) => {
    try {
        const { category } = req.params;
        var items = await Item.find({ category });
        items = items.filter(item => {
            if ((item.vendorID == req.session.user_id) && item.status == 'granted')
                return item;
        });
        res.render("vendor/viewProducts", { items });
    } catch (err) {
        console.log(`---VENDOR/PRODUCT DISPLAYING ERROR: ${err}.---`);
        res.redirect("/vendor");
    }
});

// Updating a particular product
router.get("/vendor/products/:id/edit", indexObj.isVendorLoggedin, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if ((item.vendorID == req.session.user_id) && item.status == 'granted') {
            res.render("vendor/editProduct", { item });
        } else {
            res.render("accessDeny");
        }
    } catch (err) {
        console.log(`---VENDOR/PRODUCT EDIT FORM ERROR: ${err}.---`);
        res.redirect("/vendor");
    }
});

router.post("/vendor/products/:id/edit", indexObj.isVendorLoggedin, upload.single('image'), async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if ((item.vendorID == req.session.user_id) && item.status == 'granted') {
            const dirname = __dirname.replace('routes', '');
            item.title = req.body.title;
            item.description = req.body.description;
            item.category = req.body.category;
            item.price = req.body.price;
            item.countInStock = req.body.quantity;
            if (req.file) {
                item.image = {
                    data: fs.readFileSync(path.join(dirname + '/uploads/' + req.file.filename)),
                    contentType: 'image/png'
                }
            }
            await item.save();
            req.session.message = {
                type: 'success',
                content: 'Your item has been updated successfully.'
            }
            res.redirect(`/vendor/products/${item.category}`);
        } else {
            res.render("accessDeny");
        }
    } catch (err) {
        console.log(`---VENDOR/PRODUCT UPDATING ERROR: ${err}.---`);
        res.redirect("/vendor");
    }
});

// Deleting a particular product
router.post("/vendor/products/:id/delete", indexObj.isVendorLoggedin, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if ((item.vendorID == req.session.user_id) && item.status == 'granted') {
            const category = item.category;
            await item.remove();
            req.session.message = {
                type: "success",
                content: "Item removed successfully."
            }
            res.redirect(`/vendor/products/${category}`);
        } else {
            res.render("accessDeny");
        }
    } catch (err) {
        console.log(`---VENDOR/PRODUCT DELETING ERROR: ${err}.---`);
        res.redirect("/vendor");
    }
});

// Manage orders
router.get('/vendor/orders', indexObj.isVendorLoggedin, async (req, res) => {
    try {
        const orders = await Order.find();
        const items = await Item.find({ status: 'granted' });
        var ourOrders = [];
        orders.forEach(order => {
            order.items.forEach(orderItem => {
                items.forEach(item => {
                    if (orderItem.itemID.equals(item._id) && item.vendorID.equals(req.session.user_id)) {
                        var doc = {};
                        doc.itemID = item._id;
                        doc.image = item.image;
                        doc.title = item.title;
                        doc.totalQuantity = orderItem.totalQuantity;
                        doc.totalPrice = orderItem.totalPrice;
                        doc.orderedAt = order.orderedAt;
                        doc.address = order.shippingAddress;
                        doc.orderID = order.orderID;
                        doc.paymentMethod = order.paymentMethod;
                        doc.status = orderItem.status;
                        ourOrders.push(doc);
                    }
                });
            });
        });
        res.render('vendor/orders', { orders: ourOrders });
    } catch (error) {

    }
});

// Confirm an order
router.post('/vendor/orders/:orderID/:itemID/confirm', indexObj.isVendorLoggedin, async (req, res) => {
    try {
        const { orderID, itemID } = req.params;
        const order = await Order.findOne({ orderID: orderID });
        const item = await Item.findById(itemID);
        if (!order)
            return res.render('accessDeny');
        order.items.forEach((orderItem) => {
            if (orderItem.itemID == itemID && orderItem.status == 'pending') {
                item.countInStock -= orderItem.totalQuantity;
                orderItem.status = 'confirmed';
                req.session.message = {
                    type: 'success',
                    content: `The order is confirmed.`
                }
            }
        });
        await item.save();
        await order.save();
        res.redirect("/vendor/orders");
    } catch (error) {
        console.log(`-- - VENDOR: Order confirm error: ${error}.--- `);
        res.redirect("/vendor");
    }
});

// Cancelling an order
router.post('/vendor/orders/:orderID/:itemID/cancel', indexObj.isVendorLoggedin, async (req, res) => {
    try {
        const { orderID, itemID } = req.params;
        const order = await Order.findOne({ orderID: orderID });
        const item = await Item.findById(itemID);
        if (!order)
            return res.render('accessDeny');
        order.items.forEach(orderItem => {
            if (orderItem.itemID == itemID && (orderItem.status == 'pending' || orderItem.status == 'confirmed')) {
                if (orderItem.status == 'confirmed')
                    item.countInStock += orderItem.totalQuantity;
                orderItem.status = 'cancelled';
                req.session.message = {
                    type: 'success',
                    content: `The order has been cancelled.`
                }
            }
        });
        await item.save();
        await order.save();
        res.redirect("/vendor/orders");
    } catch (error) {
        console.log(`---VENDOR: Order confirm error: ${error}.---`);
        res.redirect("/vendor");
    }
});

module.exports = router;