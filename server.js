const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const multer = require('multer'); 

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'altav1dra',
    database : 'vr'
  }
});

const app = express();

app.use(cors())
app.use(bodyParser.json());

app.get('/', (req, res)=> {
  res.send('it is working')
})


app.use('/photos', express.static(__dirname + '/public/uploads'));

// Set The Storage Engine
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function(req, file, cb){
    cb(null, file.fieldname + '-' + Date.now() + '.jpg' );
  }
});

// Init Upload
const upload = multer({
  storage: storage,
  limits:{fileSize: 1000000},
}).single('image');

app.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.log(err);
    } else {
      //console.log(req.file);
      res.send(req.file.filename);
    }
  });
});

const deleteImage = (fileName) => {
  var fs = require('fs');
  if (fileName !=='noimage.png' && fileName !=='nouserphoto.png'){
    fs.unlink(`public/uploads/${fileName}`, (err) => {
      if (err) console.log(`File ${fileName} was not deleted`);
      else console.log(`${fileName} was deleted`);
    });
    }
}


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

app.put('/settingsemail', (req , res)=> {
  db.select('id')
  .from('users')
  .where('id', '=', req.body.id)
  .update({
      email: req.body.email
    })
    .returning('*')
    .then(user => {
            res.json(user[0]);
          })
  })

app.put('/settingspassword', (req , res)=> {
  const hash = bcrypt.hashSync(req.body.password);
  db.select('id')
  .from('users')
  .where('id', '=', req.body.id)
  .update({
      hash: hash
    })
    .returning('*')
    .then(user => {
            res.json(user[0]);
          })
  })

app.put('/settingsbio', (req , res)=> {
  db.select('id')
  .from('users')
  .where('id', '=', req.body.id)
  .update({
      bio: req.body.bio
    })
    .returning('*')
    .then(user => {
            res.json(user[0]);
          })
  })



app.post('/register', (req, res) => {
  const { email, name, password, bio, photo } = req.body;
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email,
        name: name,
        bio: bio,
        joined: new Date(),
        photo: photo
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
  const { url, title, subject, headline, description, is_private, owner, photo } = req.body;
    db.transaction(trx => {
      trx.insert({
        url:url,
        title: title,
        subject: subject,
        headline: headline,
        description: description,
        is_private: is_private,
        owner: owner,
        photo: photo
        
      })
      .into('streams')
      .returning('*')
      .then(stream => {
        res.json(stream[0]);
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json(`unable to create stream, error is ${err}`))
})

app.post('/favorites', (req, res) => {
  const { userid, url } = req.body;
    db.transaction(trx => {
      trx.insert({
        userid: userid,
        url:url
      })
      .into('favorites')
      .returning('*')
      .then(data => {
        if ((data[0].userid === userid) && (data[0].url === url) ){
          res.json('success')
        } 
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('saved_already'))
})

app.get('/public_streams', (req, res) => {
  db.select('*').from('streams')
    .where('is_private', '=', 'FALSE')
    .then(data => {
            res.json(data);
          })
          .catch(err => res.status(400).json('unable to get streams data'))
      }) 
    
    
app.post('/saved_streams', (req, res) => {
  const { userid } = req.body;
  db.join('favorites', 'streams.url', '=', 'favorites.url')
    .select('streams.title', 'streams.headline', 'favorites.url').from('streams')
    .where({'favorites.userid' : userid})
    .then(data => {
            res.json(data);
          })
          .catch(err => res.status(400).json(err))
      }) 

app.post('/owned_streams', (req, res) => {
  const { userid } = req.body;
  db.select('title', 'headline', 'url', 'photo').from('streams')
    .where({'owner' : userid})
    .then(data => {
            res.json(data);
          })
          .catch(err => res.status(400).json(err))
      }) 
    
app.post('/unsave_stream', (req, res) => {
  const { userid, url } = req.body;
  db('favorites')
    .where({'userid' : userid, 'url': url})
    .del()
    .then(data => {
            res.json(data);
          })
          .catch(err => res.status(400).json(err))
      }) 

app.post('/delete_stream', (req, res) => {
  const { userid, url, photo } = req.body;
  db('favorites')
    .where({'url': url})
    .del()
    .then(data =>{
      console.log(`deleted ${data}`);
      deleteImage(photo);
});

  db('streams')
    .where({'owner' : userid, 'url': url})
    .del()
    .then(data => {
            res.json(data);
          })
          .catch(err => res.status(400).json(err))
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
//req.session.destroy();
res.redirect('/');
});

app.listen( 3000, ()=> {
  console.log(`app is running on port 3000`);
})
