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
            items.forEach(item => {
                if (item.vendorID.equals(vendor._id)) {
                    details.totalItems++;
                    details.categories.push(item.category);
                }
            });
            details.categories = [...new Set(details.categories)];
            vendorDetails.push(details);
        });
        res.render("admin/showVendors", { vendorDetails });
    } catch (err) {
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

module.exports = router;