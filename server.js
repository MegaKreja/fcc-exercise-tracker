const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid');
const { check, validationResult } = require('express-validator/check');
const User = require("./user");
const Exercise = require("./exercise");

const cors = require('cors')

const mongoose = require('mongoose')

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/exercise/new-user", (req, res, next) => {
  const username = req.body.username;
  if(!username) {
    return res.json({error: "Username is required"});
  }
  console.log(username);
  User.findOne({username}).then(user => {
    console.log(user);
    if(user) {
      return res.json({error: "Username is already taken"})
    }
    const newUser = new User({_id: shortid.generate(), username})
    newUser.save().then(result => {
      const {_id, username} = result;
      return res.json({_id, username})
    }).catch(err => {
      console.log(err);
    })
  })
  .catch(err => {
    console.log(err);
  })
})

app.post("/api/exercise/add", [
  check('userId').not().isEmpty().withMessage('userId cannot be empty.'),
  check('description').not().isEmpty().withMessage('description cannot be empty.'),
  check('duration').isNumeric().withMessage('duration must be a number.').not().isEmpty().withMessage('duration cannot be empty'),
  check('date').matches(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/).withMessage('date must be in (YYYY-MM-DD) format')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  const {userId, description, duration, date} = req.body;
  User.findOne({_id: userId}).then(user => {
    if(!user) {
      return res.json({error: "User not found"})
    }
    const newExercise = new Exercise({_userId: user._id, username: user.username, description, duration, date});
    newExercise.save().then(result => {
      const {userId, username, description, duration, date} = result;
      return res.json({userId, username, description, duration, date})
    }).catch(err => console.log(err));
  }).catch(err => console.log(err));
})

app.get("/api/exercise/log", (req, res, next) => {
  const _userId = req.query.userId;
  const from = req.query.from ? req.query.from : 0;
  const to = req.query.to ? req.query.to : 0;
  console.log(from, to);
  const limit = req.query.limit ? +req.query.limit : 0;
  if(!_userId) {
    return res.json({error: "User not selected"})
  }
  Exercise.find({_userId, date: {"$gte": from, "$lt": to}}).limit(limit).then(exercises => {
    res.json(exercises);
  }).catch(err => console.log(err))
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true })

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
