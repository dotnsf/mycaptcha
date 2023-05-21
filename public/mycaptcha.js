//. mycaptcha.js
/*
<script src="https://dotnsf.github.io/mycaptcha/mycaptcha.js"></script>
*/

var __THIS = null;
var __CODE = null;
var __BASE = '';   //. 'https://mycaptcha.yellowmix.net';

window.addEventListener( 'load', async function(){
  __mycaptcha_init();
});

async function __mycaptcha_init(){
  __CODE = null;
  __THIS = document.getElementsByClassName( 'my-captcha' )[0];
  if( __THIS ){
    var origin = window.location.origin;
    var apikey = __THIS.getAttribute('data-apikey');
    fetch( __BASE + '/api/captcha?origin=' + origin + '&apikey=' + apikey ).then( ( r ) => r.json() )
    .then( function( r ){
      if( r && r.status && r.html ){
        __THIS.insertAdjacentHTML( 'afterbegin', r.html );

        //. CSS after rendered
      }else{
        console.log( r.error );
      }
    });
  }else{
    console.log( 'failed to get my-captcha class element.')
  }
};

async function __mycaptcha_validate_answer( answer ){
  __CODE = null;
  if( __THIS ){
    var origin = window.location.origin;
    var apikey = __THIS.getAttribute('data-apikey');
    fetch( __BASE + '/api/code?origin=' + origin + '&apikey=' + apikey + '&answer=' + answer ).then( ( r ) => r.json() )
    .then( function( r ){
      console.log( {r} );
      if( r && r.status && r.code && r.html ){
        console.log( {r} );
        __CODE = r.code;
        __THIS.insertAdjacentHTML( 'beforeend', r.html );

        //. CSS after rendered
        document.getElementById( '__mycaptcha_form' ).style.display = 'none';
      }else{
        //. 答が間違っていた可能性もある・・
        document.getElementById( '__mycaptcha_answer' ).style.border = 'solid 2px red';
        console.log( r.error );
      }
    });
  }else{
    console.log( 'failed to get my-captcha class element.')
  }
}

function __mycaptcha_send(){
  var a = document.getElementById( "__mycaptcha_answer" );
  if( a ){
    __mycaptcha_validate_answer( a.value );
  }
}

function __get_code(){
  return __CODE;
}
