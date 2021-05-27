const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();

const User = require("../models/userCollection");

const JWT_SECRET = process.env.JWT_SECRET;

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
            var hashedPassword = await bcrypt.hash(password, process.env.BCRYPT_SALT);
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

router.get("/forgotpassword", (req, res) => {
    res.render("forgotPasswordForm");
});

router.post("/forgotpassword", async (req, res) => {
    try {
        const email = req.body.email;
        const user = await User.findOne({ email });
        if (!user) {
            req.session.message = {
                type: "danger",
                content: "Email entered is invalid. Please sign up."
            };
            res.redirect("/signup");
        } else {
            //Creating a one time link valid for a specific amount of time
            const secret = JWT_SECRET + user.password;
            const payload = {
                email: user.email,
                id: user._id
            };
            const token = jwt.sign(payload, secret, { expiresIn: '15m' });
            const link = `http://localhost:3000/resetpassword/${user._id}/${token}`;
            //send this link to user via email
            console.log(link);
            res.send("Password Reset link sent to your email.");
        }

    } catch (err) {
        console.log(`---FORGOT PASSWORD ERROR: ${err}.---`);
        res.redirect("/signin");
    }
});

router.get("/resetpassword/:id/:token", async (req, res) => {
    const { id, token } = req.params;
    const user = await User.findOne({ _id: id });
    if (!user) {
        res.send("Invalid user.");
    } else {
        const secret = JWT_SECRET + user.password;
        try {
            const payload = jwt.verify(token, secret);
            res.render("resetPasswordForm", { email: user.email });
        } catch (error) {
            console.log(`---FORGOT PASSWORD ERROR: ${error}.---`);
            res.render("")
        }
    }
});

router.post("/resetpassword/:id/:token", async (req, res) => {
    const { id, token } = req.params;
    const { password, confirmedPassword } = req.body;
    const user = await User.findOne({ _id: id });
    if (!user) {
        res.send("Invalid user.");
    } else {
        const secret = JWT_SECRET + user.password;
        try {
            const payload = jwt.verify(token, secret);
            if (password == confirmedPassword) {
                const newHashedPassword = await bcrypt.hash(password, 12);
                user.password = newHashedPassword;
                await user.save();
                res.redirect("/signin");
            }
        } catch (err) {
            console.log(`---PASSWORD RESET ERROR: ${err}.---`);
        }
    }
});

module.exports = router;
module.exports.isLoggedin = isLoggedin;