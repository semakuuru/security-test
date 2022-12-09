//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMangoose = require("passport-local-mongoose");
const GoogleStrategy = require( 'passport-google-oauth20' ).Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const md5 = require("md5");
// var bcrypt = require('bcryptjs');
// const saltRounds = 10;
// var encrypt = require('mongoose-encryption');

const app = express();

// console.log(process.env.API_KEY);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
mongoose.set('strictQuery', true);

app.use(session({
  secret: "Our secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMangoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
  done(null, user.id);
});
passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    // passReqToCallback   : true
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log("access");
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google", function(req, res){
  console.log("auth google is called");
  passport.authenticate("google", {scope: ["profile"]});
});

app.get("/auth/google/secrets", passport.authenticate("google", {
  successRedirect: "/secrets",
  failureRedirect: "/login"
}));

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  User.find({secret: {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers){
        console.log("found user", foundUsers);
        res.render("secrets", {usersWithSecrets: foundUsers});
      } else {
        console.log("not found user");
        res.render("secrets");
      }
    }
  });
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

  User.findById( req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        })
      }
    }
  });

});

app.get("/submit", function(req, res){
  res.render("submit");
});


app.get("/logout", function(req, res){
  req.logout(function(err){
    if(err){
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });




  // bcrypt.hash(req.body.password, saltRounds, function(err, hash){
  //   const newUser = new User({
  //     email: req.body.username,
  //     password: hash
  //   });
  //   newUser.save(function(err){
  //     if(err){
  //       console.log(err)
  //     } else{
  //       res.render("login");
  //     }
  //   });
  // });
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if (err){
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

  // const username = req.body.username;
  // const password = req.body.password;
  // // const password = md5(req.body.password);
  //
  // User.findOne({email: username}, function(err, loggingUser){
  //   if(!err){
  //     if(loggingUser){
  //       // bcrypt.compare(password, loggingUser.password, function(err, result){
  //       //   if (result === true){
  //       //     res.render("secrets");
  //       //   }
  //       // });
  //     }
  //   }
  // });
});



app.listen(3000, function(){
  console.log("Server is running on port 3000");
})
