const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const mailScript = require("../mailScript");

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
    res.render("signupForm");
});

router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            var hashedPassword = await bcrypt.hash(password, 12);
            const newUser = new User({
                name,
                email,
                password: hashedPassword,
                userType: "admin"
            });
            await newUser.save();
            req.session.message = {
                type: "success",
                content: `Hi ${name.split(' ')[0]}, you've successfully signed up. Please log in now.`
            };
            res.redirect("/signin");
        } else {
            req.session.message = {
                type: "danger",
                content: "User already exists. Please sign in."
            };
            res.redirect("/signin");
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
                    req.session.message = {
                        type: "success",
                        content: `Welcome back ${user.name.split(' ')[0]}.`
                    };
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
            const secret = JWT_SECRET + user.password;
            const payload = {
                email: user.email,
                id: user._id
            };
            const token = jwt.sign(payload, secret, { expiresIn: '15m' });
            const link = `http://localhost:3000/resetpassword/${user._id}/${token}`;
            const mailOptions = {
                from: `${process.env.ADMIN_NAME} <${process.env.ADMIN_EMAIL}>`,
                to: `${user.email}`,
                subject: 'Crave For Local: Email verification link for password reset.',
                text: `To reset your email, please click on the this link: ${link}`
            };
            // mailScript.transporter.sendMail(mailOptions, (err, info) => console.log(`---EMAIL ERROR: ${err}.---`));
            console.log(link);
            res.render("emailConfirmation");
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
        res.render("emailVerificationFailure");
    } else {
        const secret = JWT_SECRET + user.password;
        try {
            const payload = jwt.verify(token, secret);
            res.render("resetPasswordForm");
        } catch (error) {
            console.log(`---FORGOT PASSWORD ERROR: ${error}.---`);
            res.render("/forgotPassword");
        }
    }
});

router.post("/resetpassword/:id/:token", async (req, res) => {
    const { id, token } = req.params;
    const { password, confirmedPassword } = req.body;
    const user = await User.findOne({ _id: id });
    if (!user) {
        res.render("passwordResetFailure");
    } else {
        const secret = JWT_SECRET + user.password;
        try {
            const payload = jwt.verify(token, secret);
            if (password == confirmedPassword) {
                const newHashedPassword = await bcrypt.hash(password, 12);
                user.password = newHashedPassword;
                await user.save();
                res.redirect("/signin");
            } else {
                req.session.message = {
                    type: "danger",
                    content: "Your password didn't match. Try again."
                }
                res.redirect("/forgotPassword");
            }
        } catch (err) {
            console.log(`---PASSWORD RESET ERROR: ${err}.---`);
        }
    }
});

module.exports = router;
module.exports.isLoggedin = isLoggedin;