const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

console.log(process.env.MONGO_URI);

// Schemas
const UserSchema = new mongoose.Schema({
  username: {type:String}
});

const ExerciseSchema = new mongoose.Schema({
  username: {type:String},
  description: {type:String},
  duration: {type:Number},
  date: {type:Date}
});

// Models
const User = mongoose.model("User", UserSchema);
const Exercise = mongoose.model("Exercise", ExerciseSchema);

// Post User
app.post("/api/users", function(req, res){
  User.findOne({username: req.body.username}, (err, data) => {
    // not found, then create a new one
    if (data == null || err) {
      const user = new User({username: req.body.username});
      // saving new username to MongoDB
      user.save((err, data) => {
        if (err) {
          return res.json({"error": "sorry, fail to save username"});
        }
        const {username,_id} = data;
        return res.json({username, _id});
      });
    } 
  });
});

// Get User
app.get("/api/users", function(req,res){
  User.find({}, (err, data) => {
    return res.json(data);
  })
});

// Post Exercise
app.post("/api/users/:_id/exercises", function(req, res){
  User.findOne({_id: req.params._id}, (err, data) => {
    if (data == null || err) {
      return res.json({"error": "sorry, user with this id is not found"});
    }
    
    User.findOne({_id: req.params._id}, (err, data) => {
      let date = new Date(req.body.date);

      date = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();

      const exercise = new Exercise({
        username: data.username,
        description: req.body.description,
        duration: Number(req.body.duration),
        date: date
      });

      // saving exercise to MongoDB
      exercise.save((err, data) => {
        if (err) {
          return res.json({"error": "sorry, fail to save exercise"});
        }
        return res.json({
          username: data.username,
          description: data.description,
          duration: data.duration,
          date: data.date.toDateString(),
          _id: req.params._id
        });
      });
    });
  });
});

// Get Log
app.get("/api/users/:_id/logs", function(req,res){
  const { from, to, limit } = req.query;

  User.findOne({_id: req.params._id}, (err, data) => {
    if (data == null || err){
      return res.json({"error": "sorry, user with this id is not found"});
    }

    let username = data.username;

    let filter = {
      username: data.username
    };

    if (from && to){
      filter.date = {"$gte": new Date(from), 
                     "$lte": new Date(to)};
    } else if (from){
      filter.date = {"$gte": new Date(from)};
    } else if (to){
      filter.date = {"$lte": new Date(to)};
    }

    let limitExercise = limit ? limit : 0; // setting limit to 0 means no limit at all in MongoDB
    
    Exercise.find((filter), null, {limit: Number(limitExercise)}, (err, data) => {
      
      let logs = data.map((exercise) => {
        return {
          "description": exercise.description,
          "duration": exercise.duration,
          "date": exercise.date.toDateString()
        }
      });
      return res.json({
          username: username,
          count: logs.length, 
          _id: req.params._id,
          log: logs
      });
    });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})