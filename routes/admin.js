const express = require("express");
const router = express.Router();

const Item = require("../models/itemCollection");
const User = require("../models/userCollection");
const Order = require("../models/orderCollection");

const indexObj = require("./index");

router.get("/admin", indexObj.isAdminLoggedin, (req, res) => {
    res.render("admin/home");
});

module.exports = router;