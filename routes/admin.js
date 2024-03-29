const express = require("express");
const router = express.Router();
const dotenv = require("dotenv").config();

const User = require("../models/userCollection");
const Admin = require("../models/adminCollection");
const Vendor = require("../models/vendorCollection");
const Item = require("../models/itemCollection");
const Order = require("../models/orderCollection");

const indexObj = require("./index");
const mailScript = require("../mailScript");
const { request } = require("express");

// Admin dashboard
router.get("/admin", indexObj.isAdminLoggedin, (req, res) => {
    res.render("admin/home");
});

// Admin: show vendors
router.get("/admin/vendors", indexObj.isAdminLoggedin, async (req, res) => {
    try {
        const vendors = await Vendor.find();
        const items = await Item.find();
        var vendorDetails = [];
        vendors.forEach(vendor => {
            const details = {};
            details.id = vendor._id;
            details.name = vendor.name;
            details.email = vendor.email;
            details.totalItems = 0;
            details.categories = [];
            details.reqCount = 0;
            items.forEach(item => {
                if (item.vendorID.equals(vendor._id) && item.status == 'granted') {
                    details.totalItems++;
                    details.categories.push(item.category);
                } else if (item.vendorID.equals(vendor._id) && item.status == 'pending') {
                    details.reqCount++;
                }
            });
            details.categories = [...new Set(details.categories)];
            vendorDetails.push(details);
        });
        res.render("admin/showVendors", { vendorDetails });
    } catch (err) {
        console.log(`---ADMIN/ Show vendor error: ${err}.---`);
        res.redirect("/admin");
    }
});

// ADMIN: Contact vendor
router.get("/admin/vendors/:id/contact", indexObj.isAdminLoggedin, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        res.render("admin/contactVendor", { vendor });
    } catch (err) {
        console.log(`---ADMIN/ Contact vendor error: ${err}.---`);
        res.redirect("/admin/vendors");
    }
});

router.post("/admin/vendors/:id/contact", async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        const mailOptions = {
            from: `${process.env.ADMIN_NAME} <${process.env.ADMIN_EMAIL}>`,
            to: `${req.body.email}`,
            subject: `${req.body.subject}`,
            text: `${req.body.content}`
        };
        mailScript.transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                req.session.message = {
                    type: 'danger',
                    content: 'Email could not be sent.'
                };
                return res.redirect("/admin/vendors");
            }
        });
        req.session.message = {
            type: 'success',
            content: 'Email has been sent successfully.'
        };
        res.redirect("/admin/vendors");
    } catch (err) {
        console.log(`---ADMIN/ Contact (email) vendor error: ${err}.---`);
        res.redirect("/admin/vendors");
    }
});

// ADMIN: Deleting a vendor
router.get("/admin/vendors/:id/remove", indexObj.isAdminLoggedin, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        res.render("admin/deleteVendor", { vendor });
    } catch (err) {
        console.log(`---ADMIN/ Delete vendor error: ${err}.---`);
        res.redirect("/admin/vendors");
    }
});

router.post("/admin/vendors/:id/remove", indexObj.isAdminLoggedin, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        const items = await Item.find();
        items.forEach(async (item) => {
            if (item.vendorID.equals(vendor._id))
                await item.remove();
        });
        await vendor.remove();
        const mailOptions = {
            from: `${process.env.ADMIN_NAME} <${process.env.ADMIN_EMAIL}>`,
            to: `${req.body.email}`,
            subject: `${req.body.subject}`,
            text: `${req.body.content}`
        };
        mailScript.transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                req.session.message = {
                    type: 'danger',
                    content: 'Email could not be sent.'
                };
                return res.redirect("/admin/vendors");
            }
        });
        req.session.message = {
            type: 'success',
            content: 'The vendor has been removed.'
        };
        res.redirect("/admin/vendors");
    } catch (err) {
        console.log(`---ADMIN/ Delete vendor error 2: ${err}.---`);
        res.redirect("/admin/vendors");
    }
});

// ADMIN: handling product requests of vendors
router.get("/admin/vendors/requests", indexObj.isAdminLoggedin, async (req, res) => {
    try {
        var items = await Item.find({ status: 'pending' });
        var vendors = await Vendor.find();
        var productGrantReqs = [];
        items.forEach(item => {
            vendors.forEach(vendor => {
                if (item.vendorID.equals(vendor._id)) {
                    var product = {};
                    product.id = item._id;
                    product.title = item.title;
                    product.description = item.description;
                    product.category = item.category;
                    product.price = item.price;
                    product.countInStock = item.countInStock;
                    product.image = item.image;
                    product.vendorName = vendor.name;
                    productGrantReqs.push(product);
                }
            });
        });
        res.render("admin/vendorProductRequests", { productGrantReqs });
    } catch (err) {
        console.log(`---ADMIN/ Handling product request error: ${err}.---`);
        res.redirect("/admin/vendors");
    }
});

router.post("/admin/vendors/requests/:id/deny", indexObj.isAdminLoggedin, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        await item.remove();
        req.session.message = {
            type: 'success',
            content: 'Request has been denied.'
        };
        res.redirect("/admin/vendors/requests");
    } catch (err) {
        console.log(`---ADMIN/ Denying product request error: ${err}.---`);
        res.redirect("/admin/vendors");
    }
});

router.post("/admin/vendors/requests/:id/grant", indexObj.isAdminLoggedin, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        item.status = 'granted';
        await item.save();
        req.session.message = {
            type: 'success',
            content: 'Request has been granted.'
        };
        res.redirect("/admin/vendors/requests");
    } catch (err) {
        console.log(`---ADMIN/ Granting product request error: ${err}.---`);
        res.redirect("/admin/vendors");
    }
});

module.exports = router;