const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex')

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'altav1dra',
    database : 'vr'
  }
});

db.select('*').from('users').then(data =>{
  //console.log(data);
});

const app = express();

app.use(cors())
app.use(bodyParser.json());

app.get('/', (req, res)=> {
  res.send(database.users);
})

app.post('/login', (req, res) => {
  db.select('email', 'hash').from('users')
    .where('email', '=', req.body.email)
    .then(data => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', req.body.email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res) => {
  const { email, name, password, bio } = req.body;
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email,
        name: name,
        bio: bio,
        joined: new Date()
      })
      .into('users')
      .returning('*')
      .then(user => {
        res.json(user[0]);
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'))
})

app.post('/createstream', (req, res) => {
  const { url, title, subject, headline, description, is_private } = req.body;
    db.transaction(trx => {
      trx.insert({
        url:url,
        title: title,
        subject: subject,
        headline: headline,
        description: description,
        is_private: is_private
        
      })
      .into('streams')
      .returning('*')
      .then(stream => {
        res.json(stream[0]);
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to create stream'))
})


app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(400).json('Not found')
      }
    })
    .catch(err => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
  .increment('entries', 1)
  .returning('entries')
  .then(entries => {
    res.json(entries[0]);
  })
  .catch(err => res.status(400).json('unable to get entries'))
})

app.listen(3000, ()=> {
  console.log('app is running on port 3000');
})
