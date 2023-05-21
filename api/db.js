//. db.js

var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    fs = require( 'fs' ),
    { v4: uuidv4 } = require( 'uuid' ),
    api = express();

require( 'dotenv' ).config();

//process.env.PGSSLMODE = 'no-verify';
var PG = require( 'pg' );
//PG.defaults.ssl = true;
var database_url = 'DATABASE_URL' in process.env ? process.env.DATABASE_URL : ''; 

//. CORS
api.all( '/*', function( req, res, next ){
  res.setHeader( 'Access-Control-Allow-Origin', '*' );
  res.setHeader( 'Access-Control-Allow-Methods', '*' );
  res.setHeader( 'Access-Control-Allow-Headers', '*' );
  res.setHeader( 'Vary', 'Origin' );
  next();
});

var pg = null;
if( database_url ){
  console.log( 'database_url = ' + database_url );
  pg = new PG.Pool({
    connectionString: database_url,
    //ssl: { require: true, rejectUnauthorized: false },
    idleTimeoutMillis: ( 3 * 86400 * 1000 )
  });
  pg.on( 'error', function( err ){
    console.log( 'error on working', err );
    if( err.code && err.code.startsWith( '5' ) ){
      try_reconnect( 1000 );
    }
  });
}

function try_reconnect( ts ){
  setTimeout( function(){
    console.log( 'reconnecting...' );
    pg = new PG.Pool({
      connectionString: database_url,
      //ssl: { require: true, rejectUnauthorized: false },
      idleTimeoutMillis: ( 3 * 86400 * 1000 )
    });
    pg.on( 'error', function( err ){
      console.log( 'error on retry(' + ts + ')', err );
      if( err.code && err.code.startsWith( '5' ) ){
        ts = ( ts < 10000 ? ( ts + 1000 ) : ts );
        try_reconnect( ts );
      }
    });
  }, ts );
}


api.use( bodyParser.urlencoded( { extended: true } ) );
api.use( bodyParser.json() );
api.use( express.Router() );


/*
create table if not exists apikeys ( 
  id varchar(50) not null primary key,  // API Key
  user varchar(50) not null, 
  origin varchar(50) not null, 
  sitename varchar(50) not null, 
  created bigint default 0, 
  updated bigint default 0 );

create table if not exists captchas ( 
  id varchar(50) not null primary key, 
  apikey varchar(50) not null, 
  sitekey varchar(50) not null, 
  question varchar(256) not null, 
  answer varchar(256) not null, 
  code varchar(50) not null, 
  created bigint default 0,
  updated bigint default 0 );
*/

//. Create API Key
api.createApiKey = async function( user, sitename, origin ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      conn = await pg.connect();
      if( conn ){
        if( user && sitename && origin ){
          //. user ごとにいくつまで、という制約が必要？

          try{
            var sql = 'insert into apikeys( id, user, origin, sitename, created, updated ) values ( $1, $2, $3, $4, $5, $6 )';
            var id = uuidv4();
            var t = ( new Date() ).getTime();
            var query = { text: sql, values: [ id, user, origin, sitename, t, t ] };
            conn.query( query, function( err, result ){
              if( err ){
                console.log( err );
                resolve( { status: false, error: err } );
              }else{
                resolve( { status: true } );
              }
            });
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: e } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }else{
          resolve( { status: false, error: 'no enough information provided.' } );
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Create Captcha
api.createCaptcha = async function( apikey, origin ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      conn = await pg.connect();
      if( conn ){
        if( apikey && origin ){
          try{
            //. apikeys に id(apikey) と origin が存在している
            //. captchas に apikey が存在していない場合は作成、存在している場合は更新
            var sql0 = 'select * from apikeys where id = $1 and origin = $2';
            var query0 = { text: sql0, values: [ apikey, origin ] };
            conn.query( query0, function( err0, result0 ){
              if( err0 ){
                console.log( err0 );
                resolve( { status: false, error: err0 } );
              }else{
                if( result0 && result0.rows && result0.rows.length == 1 ){
                  var sql1 = 'select * from captchas where apikey = $1';
                  var query1 = { text: sql1, values: [ apikey ] };
                  conn.query( query1, function( err1, result1 ){
                    //. 問題と回答
                    var question = '1+2';
                    var answer = '3';

                    var html = '<div id="__mycaptcha_form">'
                      + '<h2>' + question + '</h2>'
                      + '<label for="__mycaptcha_answer">答は？</label>'
                      + '<input id="__mycaptcha_answer" type="text" value=""/>'
                      + '<input id="__mycaptcha_button" type="button" value="回答" onClick="__mycaptcha_send();"/>'
                      + '</div>';
                    var t = ( new Date() ).getTime();

                    if( err1 || result1.rows.length < 1 ){
                      //. 新規作成
                      var sql2 = 'insert into captchas( id, apikey, question, answer, created, updated ) values ( $1, $2, $3, $4, $5, $6 )';
                      var id = uuidv4();
                      var query2 = { text: sql2, values: [ id, apikey, question, answer, t, t ] };
                      conn.query( query2, function( err2, result2 ){
                        if( err2 ){
                          console.log( err2 );
                          resolve( { status: false, error: err2 } );
                        }else{
                          resolve( { status: true, question: question, html: html } );
                        }
                      });
                    }else{
                      //. 更新
                      var id = result1.rows[0].id;
                      var sql2 = 'update captchas set question = $1, answer = $2, updated = $3 where id = $4';
                      var query2 = { text: sql2, values: [ question, answer, t, id ] };
                      conn.query( query2, function( err2, result2 ){
                        if( err2 ){
                          console.log( err2 );
                          resolve( { status: false, error: err2 } );
                        }else{
                          resolve( { status: true, question: question, html: html } );
                        }
                      });
                    }
                  });
                }else{
                  resolve( { status: false, error: 'invalid apikey and/or origin' } );
                }
              }
            });
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: e } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }else{
          resolve( { status: false, error: 'no enough information provided.' } );
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. Update Captcha
api.generateCode = async function( apikey, origin, answer ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      conn = await pg.connect();
      if( conn ){
        if( apikey && origin && answer ){
          try{
            //. apikeys に id(apikey) と origin が存在している
            //. captchas に apikey と answer が存在している
            //. captchas を更新
            var sql0 = 'select * from apikeys where id = $1 and origin = $2';
            var query0 = { text: sql0, values: [ apikey, origin ] };
            conn.query( query0, function( err0, result0 ){
              if( err0 ){
                console.log( err0 );
                resolve( { status: false, error: err0 } );
              }else{
                if( result0 && result0.rows && result0.rows.length == 1 ){
                  var sql1 = 'select * from captchas where apikey = $1 and answer = $2';
                  var query1 = { text: sql1, values: [ apikey, answer ] };
                  conn.query( query1, function( err1, result1 ){
                    if( err1 ){
                      console.log( err1 );
                      resolve( { status: false, error: 'wrong answer' } );
                    }else{
                      if( result1 && result1.rows && result1.rows.length == 1 ){
                        var id = result1.rows[0].id;
                        var code = uuidv4();
                        var t = ( new Date() ).getTime();
                        var sql = 'update captchas set code = $1, updated = $2 where id = $3';
                        var query = { text: sql, values: [ code, t, id ] };
                        conn.query( query, function( err, result ){
                          if( err ){
                            console.log( err );
                            resolve( { status: false, error: err } );
                          }else{
                            var html = '<input type="hidden" name="my-captcha-response" id="my-captcha-response" value="' + code + '"/>';
                            resolve( { status: true, code: code, html: html } );
                          }
                        });
                      }else{
                        resolve( { status: false, error: 'wrong answer' } );
                      }
                    }
                  });
                }else{
                  resolve( { status: false, error: 'invalid apikey and/or origin' } );
                }
              }
            });
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: e } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }else{
          resolve( { status: false, error: 'no enough information provided.' } );
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

api.validateCode = async function( apikey, origin, code ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      conn = await pg.connect();
      if( conn ){
        if( apikey && origin && code ){
          try{
            //. apikeys に id(apikey) と origin が存在している
            //. captchas に apikey と発行から２分以内の code が１件存在している
            //. 該当データを削除
            var sql0 = 'select * from apikeys where id = $1 and origin = $2';
            var query0 = { text: sql0, values: [ apikey, origin ] };
            conn.query( query0, function( err0, result0 ){
              if( err0 ){
                console.log( err0 );
                resolve( { status: false, error: err0 } );
              }else{
                if( result0 && result0.rows && result0.rows.length == 1 ){
                  var t = ( new Date() ).getTime();
                  var sql1 = 'select * from captchas where apikey = $1 and code = $2 and updated + 120 * 1000 > $3';
                  var query1 = { text: sql1, values: [ apikey, code, t ] };
                  conn.query( query1, function( err1, result1 ){
                    if( err1 ){
                      //console.log( err1 );
                      resolve( { status: false, error: 'wrong answer' } );
                    }else{
                      if( result1 && result1.rows && result1.rows.length == 1 ){
                        var id = result1.rows[0].id;
                        var sql2 = 'delete from captchas where id = $1';
                        var query2 = { text: sql2, values: [ id ] };
                        conn.query( query2, function( err2, result2 ){
                          if( err2 ){
                            console.log( err2 );
                          }
                          resolve( { status: true } );
                        });
                      }else{
                        //console.log( result1 );
                        resolve( { status: false, error: 'wrong answer' } );
                      }
                    }
                  });
                }else{
                  resolve( { status: false, error: 'invalid apikey and/or origin' } );
                }
              }
            });
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: e } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }else{
          resolve( { status: false, error: 'no enough information provided.' } );
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};



api.get( '/register-site', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var user = req.query.user;
  var sitename = req.query.sitename;
  var origin = req.query.origin;
  if( user && sitename && origin ){
    var r = await api.createApiKey( user, sitename, origin );
    res.status( r.status ? 200 : 400 );
    res.write( JSON.stringify( r, null, 2 ) );
    res.end();
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'parameter user, sitename, and/or origin missing.'}, null, 2 ) );
    res.end();
  }
});

api.get( '/captcha', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var apikey = req.query.apikey;
  var origin = req.query.origin;
  if( apikey && origin ){
    var r = await api.createCaptcha( apikey, origin );
    res.status( r.status ? 200 : 400 );
    res.write( JSON.stringify( r, null, 2 ) );
    res.end();
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'parameter apikey and/or origin missing.'}, null, 2 ) );
    res.end();
  }
});

api.get( '/code', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var apikey = req.query.apikey;
  var origin = req.query.origin;
  var answer = req.query.answer;
  if( apikey && origin && answer ){
    var r = await api.generateCode( apikey, origin, answer );
    res.status( r.status ? 200 : 400 );
    res.write( JSON.stringify( r, null, 2 ) );
    res.end();
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'parameter apikey, origin, sitekey and/or answer missing.'}, null, 2 ) );
    res.end();
  }
});

api.get( '/validate-code', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var apikey = req.query.apikey;
  var origin = req.query.origin;
  var code = req.query.code;
  //console.log( apikey, origin, code );
  if( apikey && origin && code ){
    var r = await api.validateCode( apikey, origin, code );
    res.status( r.status ? 200 : 400 );
    res.write( JSON.stringify( r, null, 2 ) );
    res.end();
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'parameter apikey, origin, sitekey and/or code missing.'}, null, 2 ) );
    res.end();
  }
});

//. api をエクスポート
module.exports = api;
