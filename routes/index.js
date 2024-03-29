const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const dotenv = require("dotenv").config();

const mailScript = require("../mailScript");

const User = require("../models/userCollection");
const Admin = require("../models/adminCollection");
const Vendor = require("../models/vendorCollection");

const JWT_SECRET = process.env.JWT_SECRET;

//  Middlewares: isLoggedin
var cache = {};
var redirectPath = '';
var isSet = false;
var deletePath = () => {
    redirectPath = '';
}

const isUserLoggedin = async (req, res, next) => {
    redirectPath = req.path;
    if (req.session.user_id) {
        try {
            const user = await User.findOne({ _id: req.session.user_id });
            if (user) {
                return next();
            } else {
                redirectPath = '';
                req.session.message = {
                    type: "warning",
                    content: "Your request has been denied."
                };
                return res.redirect("/");
            }
        } catch (err) {
            console.log(`---USER-LOGGED-IN middleware error: ${err}.---`);
            res.redirect("/");
        }
    }
    //For handling POST requests if not logged in
    if (req.method == 'POST') {
        cache.method = req.method;
        cache.body = req.body;
    }
    req.session.message = {
        type: 'warning',
        content: 'You need to sign in first.'
    }
    res.redirect("/signin");
};

const isVendorLoggedin = async (req, res, next) => {
    redirectPath = req.path;
    if (req.session.user_id) {
        try {
            const vendor = await Vendor.findOne({ _id: req.session.user_id });
            if (vendor) {
                return next();
            } else {
                redirectPath = '';
                req.session.message = {
                    type: "warning",
                    content: "Your request has been denied."
                };
                return res.redirect("/");
            }
        } catch (err) {
            console.log(`---VENDOR-LOGGED-IN middleware error: ${err}.---`);
            res.redirect("/");
        }
    }
    req.session.message = {
        type: 'warning',
        content: 'You need to sign in as vendor.'
    }
    res.redirect("/signin");
};

const isAdminLoggedin = async (req, res, next) => {
    redirectPath = req.path;
    if (req.session.user_id) {
        try {
            const admin = await Admin.findOne({ _id: req.session.user_id });
            if (admin) {
                return next();
            } else {
                redirectPath = '';
                req.session.message = {
                    type: "warning",
                    content: "Your request has been denied."
                };
                return res.redirect("/");
            }
        } catch (err) {
            console.log(`---ADMIN-LOGGED-IN middleware error: ${err}.---`);
            res.redirect("/");
        }
    }
    req.session.message = {
        type: 'warning',
        content: 'You need to sign in as admin.'
    }
    res.redirect("/signin");
};

// Middleware: isLoggedout
const isLoggedout = async (req, res, next) => {
    if (!req.session.user_id) {
        return next();
    }
    req.session.message = {
        type: 'warning',
        content: 'You are already logged in.'
    };
    if (await User.findById(req.session.user_id)) {
        res.redirect('/');
    } else if (await Admin.findById(req.session.user_id)) {
        res.redirect('/admin');
    } else {
        res.redirect('/vendor');
    }
};

// Admin registration
const createAdmin = async () => {
    try {
        const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
        const admin = new Admin({
            name: process.env.ADMIN_NAME,
            email: process.env.ADMIN_EMAIL,
            password,
            userType: "admin"
        });
        await admin.save();
        console.log("Admin Created.");
    } catch (err) {
        console.log(`---ADMIN CREATION ERROR: ${err}.---`);
    }
}

// createAdmin();

// USER Sign up
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
                wishlist: [],
                cart: [],
                userType: "user"
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

// USER or ADMIN or VENDOR Sign in
router.get("/signin", (req, res) => {
    if (!req.session.user_id) {
        module.exports.deletePath = deletePath;
        isSet = true;
        res.render("signinForm");
    } else {
        req.session.message = {
            type: "warning",
            content: "You're already logged in."
        };
        res.redirect("/");
    }
});

router.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        const admin = await Admin.findOne({ email });
        const vendor = await Vendor.findOne({ email });
        if (!user && !admin && !vendor) {
            req.session.message = {
                type: "danger",
                content: "Incorrect email or password."
            };
            res.redirect("/signin");
        } else {
            var userType;
            var userPassword;
            var userId;
            if (user) {
                if (redirectPath.split('/')[1] == 'admin' || redirectPath.split('/')[1] == 'vendor') {
                    req.session.message = {
                        type: 'warning',
                        content: 'Your request has been denied.'
                    };
                    redirectPath = '';
                    return res.redirect('/');
                }
                userType = user.userType;
                userPassword = user.password;
                userId = user._id;
            } else if (admin) {
                if (redirectPath.split('/')[1] == 'cart' || redirectPath.split('/')[1] == 'wishlist' || redirectPath.split('/')[1] == 'orders' || redirectPath.split('/')[1] == 'vendor') {
                    req.session.message = {
                        type: 'warning',
                        content: 'Your request has been denied.'
                    };
                    redirectPath = '';
                    return res.redirect('/');
                }
                userType = admin.userType;
                userPassword = admin.password;
                userId = admin._id;
            } else {
                if (redirectPath.split('/')[1] == 'cart' || redirectPath.split('/')[1] == 'wishlist' || redirectPath.split('/')[1] == 'orders' || redirectPath.split('/')[1] == 'admin') {
                    req.session.message = {
                        type: 'warning',
                        content: 'Your request has been denied.'
                    };
                    redirectPath = '';
                    return res.redirect('/');
                }
                userType = vendor.userType;
                userPassword = vendor.password;
                userId = vendor._id;
            }
            const validation = await bcrypt.compare(password, userPassword);
            if (validation) {
                req.session.user_id = userId;
                if (userType == "user") {
                    if (redirectPath) {
                        const path = redirectPath;
                        redirectPath = '';
                        req.session.message = {
                            type: "success",
                            content: `Welcome back ${user.name.split(' ')[0]}.`
                        };
                        if (Object.entries(cache).length) {
                            req.session.cache = cache;
                            cache = {};
                            if (req.session.cache.method == 'POST')
                                return res.redirect(307, `${path}`);
                        }
                        return res.redirect(`${path}`);
                    }
                    req.session.message = {
                        type: "success",
                        content: `Welcome back ${user.name.split(' ')[0]}.`
                    };
                    return res.redirect("/");
                } else if (userType == "admin") {
                    if (redirectPath && redirectPath != '/admin') {
                        const path = redirectPath;
                        redirectPath = '';
                        req.session.message = {
                            type: "success",
                            content: `Welcome admin, CFL.`
                        };
                        return res.redirect(`${path}`);
                    }
                    req.session.message = {
                        type: "success",
                        content: `Welcome admin, CFL. Manage your dashboard here.`
                    };
                    return res.redirect("/admin");
                } else {
                    if (redirectPath && redirectPath != '/vendor') {
                        const path = redirectPath;
                        redirectPath = '';
                        req.session.message = {
                            type: "success",
                            content: `Welcome ${vendor.name}.`
                        };
                        return res.redirect(`${path}`);
                    }
                    req.session.message = {
                        type: "success",
                        content: `Welcome ${vendor.name}. Manage your dashboard here.`
                    };
                    return res.redirect("/vendor");
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

// Creating a new vendor by admin
router.get("/admin/addvendor", isAdminLoggedin, (req, res) => {
    res.render("admin/addVendor");
});

router.post("/admin/addvendor", isAdminLoggedin, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const vendor = await Vendor.findOne({ email });
        if (!vendor) {
            var hashedPassword = await bcrypt.hash(password, 12);
            const newVendor = new Vendor({
                name,
                email,
                password: hashedPassword,
                userType: "vendor"
            });
            await newVendor.save();
            req.session.message = {
                type: 'success',
                content: 'Vendor has been added successfully.'
            }
            res.redirect("/admin");
        } else {
            req.session.message = {
                type: 'warning',
                content: 'Vendor already exists.'
            }
            res.redirect("/admin");
        }
    } catch (err) {
        console.log(`---VENDOR CREATION ERROR: ${err}.---`);
        res.redirect("/admin/vendors/new");
    }
});

// logging out a user
router.get("/logout", (req, res) => {
    req.session.user_id = null;
    redirectPath = '';
    req.session.message = {
        type: 'warning',
        content: 'You have been logged out.'
    }
    res.redirect("/");
});

// managing forgot password
router.get("/forgotpassword", isLoggedout, (req, res) => {
    res.render("forgotPasswordForm");
});

router.post("/forgotpassword", isLoggedout, async (req, res) => {
    try {
        const email = req.body.email;
        const user = await User.findOne({ email });
        const admin = await Admin.findOne({ email });
        const vendor = await Vendor.findOne({ email });
        if (!user && !admin && !vendor) {
            req.session.message = {
                type: "danger",
                content: "Email entered is invalid. Please sign up."
            };
            res.redirect("/signup");
        } else {
            var userPassword;
            var userEmail;
            var userId;
            if (user) {
                userPassword = user.password;
                userEmail = user.email;
                userId = user._id;
            } else if (admin) {
                userPassword = admin.password;
                userEmail = admin.email;
                userId = admin._id;
            } else {
                userPassword = vendor.password;
                userEmail = vendor.email;
                userId = vendor._id;
            }
            const secret = JWT_SECRET + userPassword;
            const payload = {
                email: userEmail,
                id: userId
            };
            const token = jwt.sign(payload, secret, { expiresIn: '15m' });
            const link = `https://craveforlocal.herokuapp.com/resetpassword/${userId}/${token}` || `http://localhost:3000/resetpassword/${userId}/${token}`;
            const mailOptions = {
                from: `${process.env.ADMIN_NAME} <${process.env.ADMIN_EMAIL}>`,
                to: `${userEmail}`,
                subject: 'Crave For Local: Email verification link for password reset.',
                text: `To reset your email, please click on the this link: ${link}`
            };
            mailScript.transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    req.session.message = {
                        type: 'danger',
                        content: 'Email could not be sent.'
                    };
                    return res.redirect("/forgotpassword");
                }
            });
            res.render("emailConfirmation");
        }

    } catch (err) {
        console.log(`---FORGOT PASSWORD ERROR: ${err}.---`);
        res.redirect("/signin");
    }
});

router.get("/resetpassword/:id/:token", isLoggedout, async (req, res) => {
    const { id, token } = req.params;
    const user = await User.findOne({ _id: id });
    const admin = await Admin.findOne({ _id: id });
    const vendor = await Vendor.findOne({ _id: id });
    if (!user && !admin && !vendor) {
        res.render("emailVerificationFailure");
    } else {
        var userPassword;
        if (user) {
            userPassword = user.password;
        } else if (admin) {
            userPassword = admin.password;
        } else {
            userPassword = vendor.password;
        }
        const secret = JWT_SECRET + userPassword;
        try {
            const payload = jwt.verify(token, secret);
            res.render("resetPasswordForm");
        } catch (error) {
            console.log(`---FORGOT PASSWORD ERROR: ${error}.---`);
            res.render("/forgotPassword");
        }
    }
});

router.post("/resetpassword/:id/:token", isLoggedout, async (req, res) => {
    const { id, token } = req.params;
    const { password, confirmedPassword } = req.body;
    const user = await User.findOne({ _id: id });
    const admin = await Admin.findOne({ _id: id });
    const vendor = await Vendor.findOne({ _id: id });
    if (!user && !admin && !vendor) {
        res.render("passwordResetFailure");
    } else {
        var userPassword;
        if (user) {
            userPassword = user.password;
        } else if (admin) {
            userPassword = admin.password;
        } else {
            userPassword = vendor.password;
        }
        const secret = JWT_SECRET + userPassword;
        try {
            const payload = jwt.verify(token, secret);
            if (password == confirmedPassword) {
                const newHashedPassword = await bcrypt.hash(password, 12);
                if (user) {
                    user.password = newHashedPassword;
                    await user.save();
                } else if (admin) {
                    admin.password = newHashedPassword;
                    await admin.save();
                } else {
                    vendor.password = newHashedPassword;
                    await vendor.save();
                }
                req.session.message = {
                    type: 'success',
                    content: 'Password has been reset successfully.'
                }
                redirectPath = '';
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
            res.redirect("/forgotpassword");
        }
    }
});

module.exports = router;
module.exports.isUserLoggedin = isUserLoggedin;
module.exports.isVendorLoggedin = isVendorLoggedin;
module.exports.isAdminLoggedin = isAdminLoggedin;
if (isSet == false)
    module.exports.deletePath = null;