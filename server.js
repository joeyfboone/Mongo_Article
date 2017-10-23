// require all packages
const express = require("express");
const mongojs = require("mongojs");
const cheerio = require("cheerio");
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const logger = require("morgan");
const axios = require("axios");

// start express
const app = express();

// set a port for the DB
const PORT = process.env.PORT || 3000;

// bring in the models
var db = require("./models");

// we will log some stuff with morgan
app.use(logger("dev"));
// define our static folder for css, etc
app.use(express.static("public"));
// using body parser for our forms
app.use(bodyParser.urlencoded({ extended: true }));
// handlebars will handle our layout
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");


// here we connect to Mongo and give it a promise
mongoose.Promise = Promise;

//Database Connection for Local and Heroku

if (process.env.MONGODB_URI){
  mongoose.connect(process.env.MONGODB_URI)
}else{
  mongoose.connect("mongodb://localhost/Article_DB", {
// mongoose.connect("mongodb://jbuser:jbuser@ds229465.mlab.com:29465/article_db", { 
 useMongoClient: true
  })
}



// show the main page if no route was requested
app.get("/", function (req, res) {
  db.article
  .find({})
  .then(function(dbArticle) {
    if (dbArticle < 1) {
      res.render("scrape")
    } else {
      res.render("index", {data: dbArticle})
    }
  })
  .catch(function(error) {
    res.json(error);
  });
});


// // show list of movies
app.get("/articles", function (req, res) {
  db.articles
  .find({saved: true})
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function(error) {
    res.json(error);
  });
});


// show saved movies
app.get("/saved", function (req, res) {
  db.article
  .find({saved: true})
  .then(function(dbArticle) {
      res.render("saved", {data: dbArticle})
  })
  .catch(function(error) {
    res.json(error);
  });
});

  // let's empty out the articles so we do not have any duplicates
//db.articles.remove().exec();
  // let's get the articles
  app.get("/scrape", function(req, res) {
    // First, we grab the body of the html with request
    axios.get("http://www.echojs.com/").then(function(response) {
      // Then, we load that into cheerio and save it to $ for a shorthand selector
      var $ = cheerio.load(response.data);
  
      // Now, we grab every h2 within an article tag, and do the following:
      $("article h2").each(function(i, element) {
        // Save an empty result object
        var result = {};
  
        // Add the text and href of every link, and save them as properties of the result object
        result.title = $(this)
          .children("a")
          .text();
        result.link = $(this)
          .children("a")
          .attr("href");
  
        // Create a new Article using the `result` object built from scraping
        db.Article
          .create(result)
          .then(function(dbArticle) {
            // If we were able to successfully scrape and save an Article, send a message to the client
            res.send("Scrape Complete");
          })
          .catch(function(err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
    });
    // send them back to the index to see the new content
res.redirect("/");
  });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.articles
    .findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.note
    .create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.article.findOneAndUpdate({ _id: req.params.id }, {note: dbNote._id}, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route to delete a note
app.post("/delnote/:id", function(req, res) {
  console.log("made it to delnote route");
  console.log("note id is ", req.params.id);
  // remove it from the article 
  db.note.findOneAndRemove({"_id": req.params.id})
  // db.article.remove({note: req.params.id})
  .then(function(dbArticle) {
      console.log("delete note ", req.params.id );
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route to delete an article
app.post("/delarticle/:id", function(req, res) {
  console.log("made it to delarticle route");
  console.log("articleid is ", req.params.id);
  // remove it from the db
  db.article
  .update({ _id: req.params.id }, {$set: {saved:false}})
  // db.article.remove({note: req.params.id})
  .then(function(dbArticle) {
    res.send("Articlehas been deleted from the saved list");
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


// Route for grabbing a specific Article by id, populate it with it's note
app.post("/savearticle/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.article
  .update({ _id: req.params.id }, {$set: {saved:true}})
    .populate("note")
    .then(function(dbArticle) {
      res.send("Article has been saved");
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


// startup the server
app.listen(PORT, function () {
  console.log("app listening on PORT " + PORT);
});