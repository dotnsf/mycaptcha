//. app.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    request = require( 'request' ),
    session = require( 'express-session' ),
    app = express();

var db = require( './api/db' );
app.use( '/api', db );

require( 'dotenv' ).config();

//. CORS
app.all( '/*', function( req, res, next ){
  res.setHeader( 'Access-Control-Allow-Origin', '*' );
  res.setHeader( 'Access-Control-Allow-Methods', '*' );
  res.setHeader( 'Access-Control-Allow-Headers', '*' );
  res.setHeader( 'Vary', 'Origin' );
  next();
});

app.use( express.static( __dirname + '/public' ) );
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( express.Router() );

//. Session
var sess = {
  secret: 'mycaptcha',
  cookie: {
    path: '/',
    maxAge: (7 * 24 * 60 * 60 * 1000)
  },
  resave: false,
  saveUninitialized: false //true
};
app.use( session( sess ) );

app.get( '/', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( { status: true }, null, 2 ) );
  res.end();
});

//. sample
app.post( '/login', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var userid = req.body.userid;
  var password = req.body.password;
  var code = req.body['my-captcha-response'];

  var apikey = process.env.APIKEY ? process.env.APIKEY : '';
  var origin = req.protocol + '://' + req.get( 'host' );

  var option = {
    url: 'http://localhost:8080' + '/api/validate-code?apikey=' + apikey + '&origin=' + origin + '&code=' + code,
    method: 'GET'
  };
  console.log( option.url );

  request( option, function( err0, res0, body0 ){
    if( err0 ){
      console.log( {err0} );
      res.status( 400 );
      res.write( JSON.stringify( err0, null, 2 ) );
      res.end();
    }else{
      //. 本当はここまで来た後に userid と password の検証を行い、正しい転送先に送る

      res.write( body0 );
      res.end();
    }
  });
});


var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );

module.exports = app;
