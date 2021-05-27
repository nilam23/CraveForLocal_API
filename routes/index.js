const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const User = require("../models/userCollection");

const isLoggedin = (req, res, next) => {
    if (req.session.user_id) {
        return next();
    }
    res.redirect("/signin");
};

router.get("/", (req, res) => {
    console.log(res.locals);
    res.render("landing");
});

router.get("/signup", (req, res) => {
    res.render("signupForm", { message: res.locals.message });
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
            req.session.message = {
                type: "success",
                content: "You've successfully signed up. Please log in now."
            };
            res.redirect("/signin");
        } else {
            req.session.message = {
                type: "danger",
                content: "User already exists. Please log in."
            };
            res.redirect("/signin");
        }
    } catch (err) {
        console.log(`---SIGN UP ERROR: ${err}.---`);
        res.redirect("/signup");
    }
});

router.get("/signin", (req, res) => {
    res.render("signinForm", { message: res.locals.message });
});

router.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            req.session.message = {
                type: "danger",
                content: "Incorrect email or password."
            };
            res.redirect("/signin");
        } else {
            const validation = await bcrypt.compare(password, user.password);
            if (validation) {
                req.session.user_id = user._id;
                var userType = user.userType;
                if (userType == "user") {
                    res.redirect("/items");
                } else if (userType == "admin") {
                    res.send("Admin Page");
                } else {
                    res.send("Vendor Page");
                }
            } else {
                req.session.message = {
                    type: "danger",
                    content: "Incorrect email or password."
                };
                res.redirect("/signin");
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

router.post("/logout", (req, res) => {
    req.session.user_id = null;
    res.redirect("/items");
});

module.exports = router;
module.exports.isLoggedin = isLoggedin;