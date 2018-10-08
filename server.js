const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex')

const db = knex({
  client: 'pg',
  connection: {
    connectionString : process.env.DATABASE_URL,
    ssl: true,
  }
});

db.select('*').from('users').then(data =>{
  //console.log(data);
});

const app = express();

app.use(cors())
app.use(bodyParser.json());

app.get('/', (req, res)=> {
  res.send('it is working')
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
  const { url, title, subject, headline, description, is_private, owner } = req.body;
    db.transaction(trx => {
      trx.insert({
        url:url,
        title: title,
        subject: subject,
        headline: headline,
        description: description,
        is_private: is_private,
        owner: owner
        
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

app.get('/public_streams', (req, res) => {
  db.select('*').from('streams')
    .where('is_private', '=', 'FALSE')
    .then(data => {
            res.json(data);
          })
          .catch(err => res.status(400).json('unable to get streams data'))
      }) 
    
    

app.get('/:url', (req, res) => {
  const { url } = req.params;
  db.select('*').from('streams').where({url})
    .then(data => {
      if (data.length) {
        res.json(data[0])
      } else {
        //res.status(400).json('Not found')
        res.json('VR event does not exist')
      }
    })
    .catch(err => res.status(400).json('error getting user'))
})

app.post('/logout', (req, res) => {
req.session.destroy();
res.redirect('/');
});

app.listen(process.env.PORT || 3000, ()=> {
  console.log(`app is running on port ${process.env.PORT}`);
})
