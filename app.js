const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
require("dotenv").config();
const path = require("path");

const app = express();

app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI);

const itemsSchema = new mongoose.Schema({
  name: String,
});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todolist!",
});

const item2 = new Item({
  name: "Hit the + button to add a new item.",
});

const item3 = new Item({
  name: "<-- Hit this to delete an item.",
});

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema],
});

const List = mongoose.model("List", listSchema);

app.get("/", async function (req, res) {
  const items = await Item.find();

  if (items.length === 0) {
    await Item.insertMany(defaultItems);
  }
  res.render("list", { listTitle: "Today", newListItems: items });
});

app.get("/todo/:customListName", async function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  const list = await List.findOne({ name: customListName });

  if (list) {
    // show an existing list
    res.render("list", { listTitle: list.name, newListItems: list.items });
  } else {
    // create a new list
    const list = new List({
      name: customListName,
      items: defaultItems,
    });

    await list.save();

    res.redirect("/todo/" + customListName);
  }
});

app.post("/", async function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName,
  });

  if (listName === "Today") {
    await item.save();
    res.redirect("/");
  } else {
    const list = await List.findOne({ name: listName });
    list.items.push(item);
    await list.save();
    res.redirect("/todo/" + listName);
  }
});

app.post("/delete", async function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if ((listName === "Today")) {
    try {
      const deletedItem = await Item.findByIdAndDelete(checkedItemId);
      if (deletedItem) {
        console.log("Successfully deleted item");
        res.status(200).redirect("/");
      } else {
        res.status(404).send("Item not found");
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  } else {
    await List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: checkedItemId } } }
    );
    res.redirect("/todo/" + listName);
  }
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server has started successfully.");
});
