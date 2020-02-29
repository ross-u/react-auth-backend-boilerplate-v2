const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const cors = require('cors');
require('dotenv').config();

const auth = require('./routes/auth');


// MONGOOSE CONNECTION
mongoose
  .connect(process.env.MONGODB_URI, {
    keepAlive: true,
    useNewUrlParser: true,
    reconnectTries: Number.MAX_VALUE,
  })
  .then( () => console.log(`Connected to database`))
  .catch( (err) => console.error(err));


// EXPRESS SERVER INSTANCE
const app = express();
//      ║
//      ║
//      ║  
//      ⇊   CORS MIDDLEWARE
app.use(
  cors({
    credentials: true,
    origin: [process.env.PUBLIC_DOMAIN],
  }));
//      ║                 ⇈
//      ║                 ║
//      ║                 ╚═══════════════════════════════════════╗
//      ║     SESSION                                             ║
//      ║    MIDDLEWARE                                           ║
//      ║                                                         ║
//      ║   checks if cookie with session id exists on the        ║
//      ║   HTTP request and if it does it verifies               ║
//      ║   it, and gets the user data from                       ║
//      ║   the sessions storage and assigns                      ║
//      ║   it to `req.session.currentUser`                       ║
//      ║                                                         ║
//      ⇊      🍪.sessionId  ❓                                   ║
app.use(                      //                                  ║   ⬆ 🍪
  session({                   //                                  ║   
    store: new MongoStore({   //                                  ║
      mongooseConnection: mongoose.connection,//      session checks if `req.session.currentUser` exists
      ttl: 24 * 60 * 60, // 1 day                     and if it does it sets a cookie 🍪 on the headers
    }),                  //                           with the session id 
    secret: process.env.SECRET_SESSION,
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000,},
  }),
);//    ║                 ⇈ 
//      ║                 ║
//      ║                 ║
//      ║                 ║
//      ║   MIDDLEWARE    ║
//      ⇊                 ║
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//      ║                     ⇈
//      ║                     ║
//      ║                     ║       
//      ║                     ║
//      ║                     ║
//      ║                     ║
//      ║  ROUTER MIDDLEWARE  ║   res.send()  ||  res.json()
//      ⇊                     ║
app.use('/auth', auth);// ════╣   ⬙ or  
//                            ║
//                            ║  next(Error)
//                            ║
//          ERROR HANDLING    ║
//                            ⇊
// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404).json({ code: 'not found' });
});

app.use((err, req, res, next) => {
  // always log the error
  console.error('ERROR', req.method, req.path, err);

  // only render if the error ocurred before sending the response
  if (!res.headersSent) {
    const statusError = err.status || '500';
    res.status(statusError).json(err);
  }
});


module.exports = app;
