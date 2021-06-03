const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const path = require("path");

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

module.exports = router;