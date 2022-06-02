const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const Joi = require('joi');

app.use(
  session({ secret: 'secretcode', resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

const port = 3000;

let db;

MongoClient.connect(
  'mongodb+srv://<username>:<password>@cluster0.2wcr6.mongodb.net/seohopost2?retryWrites=true&w=majority',
  (error, client) => {
    if (error) return console.log(error);
    db = client.db('seohopost2');
    app.listen(port, () => console.log(`listening on ${port}`));
  }
);

loggedin = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.send('로그인이 필요한 기능입니다');
  }
};

passport.use(
  new LocalStrategy(
    {
      usernameField: 'id',
      passwordField: 'pw',
      session: true,
      passReqToCallback: false,
    },
    (reqId, reqPw, done) => {
      db.collection('login').findOne({ id: reqId }, (error, result) => {
        if (error) return done(error);

        if (!result)
          return done(null, false, {
            message: '아이디 또는 패스워드를 확인해주세요',
          });

        if (reqPw == result.pw) {
          return done(null, result);
        } else {
          return done(null, false, {
            message: '아이디 또는 패스워드를 확인해주세요',
          });
        }
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.collection('login').findOne({ id: id }, (error, result) => {
    done(null, result);
  });
});

app.use((req, res, next) => {
  console.log('Request URL:', req.originalUrl, ' - ', new Date());
  next();
});

app.get('/', (req, res) => {
  res.redirect('/list');
});

app.get('/login', (req, res) => {
  if (req.user) {
    res.status(400).send('이미 로그인 했습니다');
  } else {
    res.render('login.ejs');
  }
});

app.post(
  '/login',
  passport.authenticate('local', { failureRedirect: '/fail' }),
  (req, res) => {
    res.redirect('/list');
  }
);

app.get('/fail', (req, res) => {
  res.render('fail.ejs');
});

app.get('/register', (req, res) => {
  if (req.user) {
    res.status(400).send('이미 로그인 했습니다');
  } else {
    res.render('register.ejs');
  }
});

app.get('/logout', loggedin, (req, res) => {
  req.logout(req.user, (error) => {
    if (error) return next(error);
    res.redirect('/list');
  });
});

const postUseresSchema = Joi.object({
  id: Joi.string().min(3).alphanum().required(),
  pw: Joi.string().min(4).required(),
  pwcheck: Joi.string().required(),
});

app.post('/register', async (req, res) => {
  try {
    const { id, pw, pwcheck } = await postUseresSchema.validateAsync(req.body);
    db.collection('login').findOne({ id: req.body.id }, (error, result) => {
      if (result) {
        res.status(400).send('이미 존재하는 아이디입니다');
      } else if (req.body.pw !== req.body.pwcheck) {
        res.status(400).send('비밀번호가 비밀번호 확인과 일치하지 않습니다 ');
      } else if (req.body.pw.indexOf(req.body.id) !== -1) {
        res.status(400).send('비밀번호에 닉네임과 같은 값이 포함되면 안됩니다');
      } else {
        db.collection('login').insertOne(
          { id: req.body.id, pw: req.body.pw },
          (error, result) => {
            res.redirect('/login');
          }
        );
      }
    });
  } catch (error) {
    res.status(400).send('유효한 형식이 아닙니다. 형식을 확인해주세요');
  }
});

app.get('/list', (req, res) => {
  db.collection('post')
    .find()
    .sort({ _id: -1 })
    .toArray((error, result) => {
      console.log(result);
      res.render('list.ejs', { posts: result });
    });
});
app.get('/write', loggedin, (req, res) => {
  res.render('write.ejs');
});

app.post('/add', loggedin, (req, res) => {
  const postDate = new Date().toLocaleDateString();
  db.collection('postcounter').findOne(
    { name: 'totalPost' },
    (error, result) => {
      const totalPost = result.totalPost;
      db.collection('post').insertOne(
        {
          _id: totalPost + 1,
          title: req.body.title,
          author: req.body.author,
          content: req.body.content,
          date: postDate,
          authorId: req.user._id,
        },
        (error, result) => {
          if (error) console.log(error);
          console.log('saved');
        }
      );
      res.redirect('/list');
      db.collection('postcounter').updateOne(
        { name: 'totalPost' },
        { $inc: { totalPost: 1 } },
        (error, result) => {
          if (error) console.log(error);
        }
      );
    }
  );
});

app.get('/content/:id', (req, res) => {
  db.collection('post').findOne(
    { _id: parseInt(req.params.id) },
    (error, result) => {
      db.collection('comment')
        .find({ parentId: parseInt(req.params.id) })
        .sort({ _id: -1 })
        .toArray((error2, result2) => {
          res.render('content.ejs', { posts: result, comments: result2 });
        });
    }
  );
});

app.get('/delete/:id', loggedin, (req, res) => {
  db.collection('post').findOne(
    { _id: parseInt(req.params.id) },
    (error, result) => {
      console.log(result);
      res.render('delete.ejs', { posts: result });
    }
  );
});

app.delete('/delete', loggedin, (req, res) => {
  db.collection('post').findOne(
    { _id: parseInt(req.body.id) },
    (error, result) => {
      console.log(req.user._id);
      console.log(result.authorId);
      if (result.authorId.toString() !== req.user._id.toString()) {
        res.status(400).send('내가 작성한 게시물이 아닙니다');
      } else {
        db.collection('post').deleteOne(
          { _id: parseInt(req.body.id) },
          (error, result) => {
            db.collection('comment').deleteMany(
              { parentId: parseInt(req.body.id) },
              (error, result) => {
                console.log('posts and comments deleted');
                res.redirect('/list');
              }
            );
          }
        );
      }
    }
  );
});

app.get('/edit/:id', loggedin, (req, res) => {
  db.collection('post').findOne(
    { _id: parseInt(req.params.id) },
    (error, result) => {
      res.render('edit.ejs', { posts: result });
    }
  );
});

app.put('/edit', loggedin, (req, res) => {
  db.collection('post').findOne(
    { _id: parseInt(req.body.id) },
    (error, result) => {
      if (result.authorId.toString() !== req.user._id.toString()) {
        res.status(400).send('내가 작성한 게시물이 아닙니다');
      } else {
        db.collection('post').updateOne(
          { _id: parseInt(req.body.id) },
          {
            $set: {
              title: req.body.title,
              author: req.body.author,
              content: req.body.content,
            },
          },
          (error, result) => {
            console.log('edited');
            res.redirect('/list');
          }
        );
      }
    }
  );
});

app.get('/writecomment/:id', loggedin, (req, res) => {
  db.collection('post').findOne(
    { _id: parseInt(req.params.id) },
    (error, result) => {
      res.render('writecomment.ejs', { posts: result });
    }
  );
});

app.post('/addcomment', loggedin, (req, res) => {
  const commentDate = new Date().toLocaleDateString();
  db.collection('commentcounter').findOne(
    { name: 'totalComment' },
    (error, result) => {
      const totalComment = result.totalComment;
      db.collection('comment').insertOne(
        {
          _id: totalComment + 1,
          comment: req.body.comment,
          author: req.body.author,
          date: commentDate,
          authorId: req.user._id,
          parentId: parseInt(req.body.id),
        },
        (error, result) => {
          console.log('commentsaved');
        }
      );
      res.redirect('/list');
      db.collection('commentcounter').updateOne(
        { name: 'totalComment' },
        { $inc: { totalComment: 1 } },
        (error, result) => {
          if (error) console.log(error);
        }
      );
    }
  );
});

app.get('/editcomment/:id', loggedin, (req, res) => {
  db.collection('comment').findOne(
    { _id: parseInt(req.params.id) },
    (error, result) => {
      res.render('editcomment.ejs', { comments: result });
    }
  );
});

app.put('/editcomment', loggedin, (req, res) => {
  db.collection('comment').findOne(
    { _id: parseInt(req.body.id) },
    (error, result) => {
      if (result.authorId.toString() !== req.user._id.toString()) {
        res.status(400).send('내가 작성한 댓글이 아닙니다');
      } else {
        db.collection('comment').updateOne(
          { _id: parseInt(req.body.id) },
          {
            $set: {
              author: req.body.author,
              comment: req.body.comment,
            },
          },
          (error, result) => {
            console.log('commenteditted');
            res.redirect('/list');
          }
        );
      }
    }
  );
});

app.get('/deletecomment/:id', loggedin, (req, res) => {
  db.collection('comment').findOne(
    { _id: parseInt(req.params.id) },
    (error, result) => {
      res.render('deletecomment.ejs', { comments: result });
    }
  );
});

app.delete('/deletecomment', loggedin, (req, res) => {
  db.collection('comment').findOne(
    { _id: parseInt(req.body.id) },
    (error, result) => {
      if (result.authorId.toString() !== req.user._id.toString()) {
        res.status(400).send('내가 작성한 댓글이 아닙니다');
      } else {
        db.collection('comment').deleteOne(
          { _id: parseInt(req.body.id) },
          (error, result) => {
            console.log('commentdeleted');
            res.redirect('/list');
          }
        );
      }
    }
  );
});
