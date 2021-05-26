const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const User = require("../models/userCollection");

// const isLoggedIn

router.get("/", (req, res) => {
    res.render("landing");
});

router.get("/signup", (req, res) => {
    res.render("signupForm");
});

router.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            var hashedPassword = await bcrypt.hash(password, 12);
            const newUser = new User({
                email,
                password: hashedPassword,
                userType: "user"
            });
            await newUser.save();
            res.send("Success");
        } else {
            res.send("User already exists.");
        }
    } catch (err) {
        console.log(`---SIGN UP ERROR: ${err}.---`);
        res.redirect("/signup");
    }
});

router.get("/signin", (req, res) => {
    res.render("signinForm");
});

router.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            res.send("Incorrect email or password.");
        } else {
            const validation = await bcrypt.compare(password, user.password);
            if (validation) {
                var userType = user.userType;
                if (userType == "user") {
                    res.redirect("/items");
                } else if (userType == "admin") {
                    res.send("Admin Page");
                } else {
                    res.send("Vendor Page");
                }
            } else {
                res.send("Incorrect email or password.");
            }
        }
    } catch (err) {
        console.log(`---SIGN IN ERROR: ${err}.---`);
        res.redirect("/signin");
    }
});

router.get("/admin/vendors/new", (req, res) => {
    res.render("admin/addVendor");
})

router.post("/admin/vendors/new", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            var hashedPassword = await bcrypt.hash(password, 12);
            const newUser = new User({
                email,
                password: hashedPassword,
                userType: "vendor"
            });
            await newUser.save();
            res.send("Success");
        } else {
            res.send("Vendor already exists.");
        }
    } catch (err) {
        console.log(`---VENDOR CREATION ERROR: ${err}.---`);
        res.redirect("/admin/vendors/new");
    }
});

module.exports = router;