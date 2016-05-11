var express = require('express'),
    bodyParser = require('body-parser'),
    oracledb = require('oracledb'),
    nodemailer = require('nodemailer'),
    smtpTransport = require('nodemailer-smtp-transport'),
    logger = require('./logger.js');

var app = express();

var conn;

oracledb.autoCommit = true;

// this isn't the best way to do this
var conf = { user: 'BDUser', password:'password*', connectString: '192.168.0.211:1521/BDNAME', port: 8080,
             emailHost: '192.168.2.1',  emailPortHost: '25', secureConnection: false };


/**
* Se crea un pool de conecciones para el servidor Oauth
*/
oracledb.createPool (
  {
    user          : conf.user,
    password      : conf.password,
    connectString : conf.connectString,
    poolMax       : 16, // maximum size of the pool
    poolMin       : 0, // let the pool shrink completely
    poolIncrement : 1, // only grow the pool by one connection at a time
    poolTimeout   : 180 // never terminate idle connections
  },
  function(err, pool)
  {
    pool.getConnection (
      function(err, connection)
      {
        if (err) {
          console.log ('ERROR connecting to: ' + conf.connectString + '. ' + err);
        }else{
          console.log ('cSucceeded connected to: ' + conf.connectString);
          conn = connection
        }
      });
  });


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/obtenerxml', function( request, response){
  var ticket = request.query.ticket;
  if ( !ticket || ticket === ''){
    sendMail( ticket, "Favor de proporcionar un 'ticket' valido" );
    logger.warn( "Favor de proporcionar un 'ticket' valido, ticket solicitado " + ticket );
    response.json("Favor de proporcionar un 'ticket' valido");    
  }
  var tokensTicket = ticket.split('-');
  if ( tokensTicket.length < 4 ){
    sendMail( ticket, "Favor de proporcionar un 'ticket' valido" );
    logger.warn( "Favor de proporcionar un 'ticket' valido, ticket solicitado " + ticket );
    response.json("Favor de proporcionar un 'ticket' valido");
  }
  else if( tokensTicket.length == 4 ){
    
      getXML( tokensTicket[0 ]+'-'+tokensTicket[1]+'-'+tokensTicket[2], tokensTicket[3], function ( err, data ){
        console.log(' xml afuera -> ');
        console.log( data );

        if( err ){
          sendMail( ticket, "Favor de proporcionar un 'ticket' valido" );
          response.json("Favor de proporcionar un 'ticket' valido");
        }else {
          response.set('Content-Type', 'text/xml');
          sendMail( ticket, data );
          logger.warn( "TICKET -> " + ticket + " ------ XML -> " + data );
          response.send( data );  
        }
    } );
  }

});

function getXML( ticket, idcotizacion, callback ){

  console.log('ticket -> ', ticket);

  var query = "select xmlallianz from rc_solicitud where NUMFIANZA like '%" + ticket + "%' and idcotizacion= "+ idcotizacion;
  console.log( 'query -> ', query);

  conn.execute(
    query,
    [],

    function(err, result)
      {      
        if ( err ){
          console.log( 'error', err );
          return callback( err );
        }

        if(result.rows.length <=  0){
          // logger.warn('Token ' + bearerToken + ' no encontrado en OAUTH_ACCESS_TOKEN');
          console.log('El XML no fue encontrado.');
          return callback( 'El XML no fue encontrado.' );
        }      

        // console.log( result.rows );
        // console.log( result.rows[0]);
        console.log(' xml adentro -> ');
        console.log( result.rows[0][0] );
        return callback( null, result.rows[0][0] );

    });

}

function sendMail( ticket, data ){

    var options = {
      port: conf.emailPortHost,
      host: conf.emailHost,
      secureConnection: conf.secureConnection
    };
    
    var transporter = nodemailer.createTransport(smtpTransport(options));

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: 'UtilsUser <nodeusr@aserta.com.mx>', // sender address
        to: 'middelware02@aserta.com.mx', // list of receivers
        subject: 'XML Allianz solicitado TICKET ' + ticket +' ✔', // Subject line
        text: 'Información adicional:\n\n' + data
        // html: '<b>Hello world ✔</b>' // html body
    };
    
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
      if(error){
          console.log(error);
      }else{
          console.log('Message sent: ' + info.response);
      }
    });
  }


var server = app.listen( conf.port, function(){
  console.log('Server running at port ' + server.address().port);
});
