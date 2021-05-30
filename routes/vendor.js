const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const Item = require("../models/itemCollection");
const User = require("../models/userCollection");
const Order = require("../models/orderCollection");

const indexObj = require("./index");

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

var upload = multer({ storage: storage });

router.get("/vendor", indexObj.isVendorLoggedin, (req, res) => {
    res.render("vendor/home");
});

router.get("/vendor/addproduct", indexObj.isVendorLoggedin, (req, res) => {
    res.render("vendor/addProduct");
});

router.post("/vendor/addproduct", indexObj.isVendorLoggedin, upload.single('image'), async (req, res, next) => {
    try {
        const dirname = __dirname.replace('routes', '');
        const vendor = await User.findOne({ _id: req.session.user_id });
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
            content: 'Product added successfully.'
        }
        res.redirect("/vendor");
    } catch (err) {
        console.log(err);
    }
});

module.exports = router;