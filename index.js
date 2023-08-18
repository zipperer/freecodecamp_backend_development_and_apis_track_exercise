const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const mongoose = require('mongoose')
const MONGO_URI = process.env['MONGO_URI']

const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: false}))


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(MONGO_URI, 
                 { useNewUrlParser: true, 
                  useUnifiedTopology: true })

let userExerciseLogSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  log: [Object] // a more specific type here would provide validation, documentation
})

let UserExerciseLog = mongoose.model('UserExerciseLog', userExerciseLogSchema)

let verbose = true

function genericDone (err, data) {
  if (err) {
    console.error(err)
  } else {
    if (verbose) {
      console.log(`data: ${data}`)
    }
  }
}

function genericErrDataHandler (done, err, data) {
  if (err) {
    done(err)
  } else {
    done(null, data)
  }
}

async function createAndSaveUserExerciseLog (username, done) {
  let userExerciseLogObject = {
    username: username,
    log: new Array()
  }
  let userExerciseLog = UserExerciseLog(userExerciseLogObject)
  
  let userExerciseLogDocument = await userExerciseLog.save()
  return userExerciseLogDocument
}

app.route('/api/users')
  .post(async function (req, res) {
  let username = req.body.username
  let userExerciseLogDocument0 = createAndSaveUserExerciseLog(username, genericDone)
  let userExerciseLogDocument = await UserExerciseLog.findOne({username : username})
  res.send(userExerciseLogDocument)
}).get(async function (req, res) {
  let users = await UserExerciseLog
                      .find()
                      .select({
                        username: true,
                        _id: true
                      })
                      .exec()
  res.json(users)
})

app.post('/api/users/:_id/exercises', async function (req, res) {
  let userID = req.params._id
  let description = req.body.description
  let duration = Number(req.body.duration)
  let date = new Date(req.body.date)
  if (date == 'Invalid Date') {
    console.log(req.body.date)
    date = new Date()
  }
  let userExerciseRecord = UserExerciseLog.findById(userID, async function (err, data) {
    if (err) {
      console.error(err)
    } else {
      let userEntry = data
      let userExerciseDate = date.toDateString()
      let userExerciseLogEntryObject = {
        description: description,
        duration: duration,
        date : userExerciseDate
      }
      userEntry.log.push(userExerciseLogEntryObject)
      let userEntrySaved = await userEntry.save()
      let userEntryUsername = userEntry.username
      let userExerciseLogEntryResponseObject = {
        username: userEntryUsername,
        _id: userID,
        description: description,
        duration: duration,
        date : userExerciseDate
  }
      res.json(userExerciseLogEntryResponseObject)
    }
  })
})

app.get('/api/users/:_id/logs', function (req, res) {
  let userID = req.params._id
  let from = new Date(req.query.from)
  let to = new Date(req.query.to)
  let limit = parseInt(req.query.limit)
  let userExerciseRecord = UserExerciseLog.findById(userID, function (err, data) {
    if (err) {
      console.error(err)
    } else {
      if (data) {
        let userEntry = data
        let userEntryUsername = userEntry.username
        let userEntryLog = userEntry.log
        let userEntryLogCount = userEntryLog.length
        if (from != 'Invalid Date') {
          userEntryLog = userEntryLog.filter((userEntryExerciseObject) => {
            let userEntryExerciseObjectDate = userEntryExerciseObject.date
            return (from <= new Date(userEntryExerciseObjectDate))
          })
        }
      if (to != 'Invalid Date') {
        userEntryLog = userEntryLog.filter((userEntryExerciseObject) => {
          let userEntryExerciseObjectDate = userEntryExerciseObject.date
          return (to >= new Date(userEntryExerciseObjectDate))
        })
    }
    if (typeof(limit) == 'number' && !Number.isNaN(limit)) {
      userEntryLog = userEntryLog.slice(0, limit)
    }
    let userEntryResponseObject = {
      _id: userID,
      username: userEntryUsername,
      count: userEntryLogCount,
      log: userEntryLog
    }
    res.json(userEntryResponseObject)
  }}
})
})

async function removeAllUserExerciseLogs (done) {
  let deleteReport = await UserExerciseLog.deleteMany({}, function(err, data) {
    genericErrDataHandler(done, err, data)
  })
  return deleteReport
}

app.get('/api/delete_users', async function (req, res) {
  let deleteReport = await removeAllUserExerciseLogs(genericDone)
  res.json(deleteReport)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
