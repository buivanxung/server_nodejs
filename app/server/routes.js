
var CT = require('./modules/country-list');
var AM = require('./modules/account-manager');
var EM = require('./modules/email-dispatcher');

var mqtt = require('mqtt')
var dot = require('dot-object')
var host = 'ws://18.217.3.199:8086'
var clientId = 'mqttjs_' + Math.random().toString(16).substr(2, 8)
var client = mqtt.connect(host, options)

var options = {
  keepalive: 10,
  clientId: clientId,
  protocolId: 'MQTT',
  protocolVersion: 4,
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  will: {
    topic: 'WillMsg',
    payload: 'Connection Closed abnormally..!',
    qos: 0,
    retain: false
  },
  username: 'demo',
  password: 'demo',
  rejectUnauthorized: false
}

var pg = require('pg')

var configpg = {
  user:'datalora',
  database: 'loradb',
  password: '1234567',
  host: 'localhost',
  port: 5432,
  max:10,
  idleTimeoutMillis:30000,
};
var pool = new pg.Pool(configpg);


module.exports = function(app) {

// main login page //
	app.get('/', function(req, res){
	// check if the user's credentials are saved in a cookie //
		if (req.cookies.user == undefined || req.cookies.pass == undefined){
			res.render('login', { title: 'Hello - Please Login To Your Account' });
		}	else{
	// attempt automatic login //
			AM.autoLogin(req.cookies.user, req.cookies.pass, function(o){
				if (o != null){
				    req.session.user = o;
					res.redirect('/home');
				}	else{
					res.render('login', { title: 'Hello - Please Login To Your Account' });
				}
			});
		}
	});

	app.post('/', function(req, res){
		AM.manualLogin(req.body['user'], req.body['pass'], function(e, o){
			if (!o){
				res.status(400).send(e);
			}	else{
				req.session.user = o;
				if (req.body['remember-me'] == 'true'){
					res.cookie('user', o.user, { maxAge: 900000 });
					res.cookie('pass', o.pass, { maxAge: 900000 });
				}
				res.status(200).send(o);
			}
		});
	});

// logged-in user homepage //

	app.get('/home', function(req, res) {
		if (req.session.user == null){
	// if user is not logged-in redirect back to login page //
			res.redirect('/');
		}	else{
			app.set('view engine', 'ejs');
			res.render('loginhome', {
				title : 'Home',
				countries : CT,
				udata : req.session.user
			});
			app.set('view engine', 'jade');
		}
	});

	app.get('/user', function(req, res) {
		if (req.session.user == null){
	// if user is not logged-in redirect back to login page //
			res.redirect('/');
		}	else{
			res.render('home', {
				title : 'User',
				countries : CT,
				udata : req.session.user
			});
		}
	});
	app.post('/user', function(req, res){
		if (req.session.user == null){
			res.redirect('/');
		}	else{
			AM.updateAccount({
				id		: req.session.user._id,
				name	: req.body['name'],
				email	: req.body['email'],
				pass	: req.body['pass'],
				country	: req.body['country']
			}, function(e, o){
				if (e){
					res.status(400).send('error-updating-account');
				}	else{
					req.session.user = o;
			// update the user's login cookies if they exists //
					if (req.cookies.user != undefined && req.cookies.pass != undefined){
						res.cookie('user', o.user, { maxAge: 900000 });
						res.cookie('pass', o.pass, { maxAge: 900000 });
					}
					res.status(200).send('ok');
				}
			});
		}
	});

	app.post('/logout', function(req, res){
		res.clearCookie('user');
		res.clearCookie('pass');
		req.session.destroy(function(e){ res.status(200).send('ok'); });

	})

// creating new accounts //

	app.get('/signup', function(req, res) {
		res.render('signup', {  title: 'Signup', countries : CT });
	});

	app.post('/signup', function(req, res){
		AM.addNewAccount({
			name 	: req.body['name'],
			email 	: req.body['email'],
			user 	: req.body['user'],
			pass	: req.body['pass'],
			country : req.body['country']
		}, function(e){
			if (e){
				res.status(400).send(e);
			}	else{
				res.status(200).send('ok');
			}
		});
	});

// password reset //

	app.post('/lost-password', function(req, res){
	// look up the user's account via their email //
		AM.getAccountByEmail(req.body['email'], function(o){
			if (o){
				EM.dispatchResetPasswordLink(o, function(e, m){
				// this callback takes a moment to return //
				// TODO add an ajax loader to give user feedback //
					if (!e){
						res.status(200).send('ok');
					}	else{
						for (k in e) console.log('ERROR : ', k, e[k]);
						res.status(400).send('unable to dispatch password reset');
					}
				});
			}	else{
				res.status(400).send('email-not-found');
			}
		});
	});

	app.get('/reset-password', function(req, res) {
		var email = req.query["e"];
		var passH = req.query["p"];
		AM.validateResetLink(email, passH, function(e){
			if (e != 'ok'){
				res.redirect('/');
			} else{
	// save the user's email in a session instead of sending to the client //
				req.session.reset = { email:email, passHash:passH };
				res.render('reset', { title : 'Reset Password' });
			}
		})
	});

	app.post('/reset-password', function(req, res) {
		var nPass = req.body['pass'];
	// retrieve the user's email from the session to lookup their account and reset password //
		var email = req.session.reset.email;
	// destory the session immediately after retrieving the stored email //
		req.session.destroy();
		AM.updatePassword(email, nPass, function(e, o){
			if (o){
				res.status(200).send('ok');
			}	else{
				res.status(400).send('unable to update password');
			}
		})
	});

// view & delete accounts //

	app.get('/print', function(req, res) {
		AM.getAllRecords( function(e, accounts){
			res.render('print', { title : 'Account List', accts : accounts });
		})
	});

	app.post('/delete', function(req, res){
		AM.deleteAccount(req.body.id, function(e, obj){
			if (!e){
				res.clearCookie('user');
				res.clearCookie('pass');
				req.session.destroy(function(e){ res.status(200).send('ok'); });
			}	else{
				res.status(400).send('record not found');
			}
	    });
	});

	app.get('/reset', function(req, res) {
		AM.delAllRecords(function(){
			res.redirect('/print');
		});
	});

	app.get("/showdata", function(req,res) {
	  pool.connect(function (err, client, done) {
	    if (err) {
	      return console.error('error fetching client from pool', err)
	    }
	    client.query('SELECT * FROM lora_imst', function (err, result) {
	      done();

	      if (err) {
	        res.end();
	        return console.error('error happened during query', err)
	      }
	      //  console.log( " Gia tri muon in: " + result.rows[0]);
	            res.render("showdata.ejs",{list:result});
              //res.render("analyze.ejs",{list:result});
              //console.log(result);
	  });

	  });
	});

	app.get("/webdata", function(req,res) {
	  pool.connect(function (err, client, done) {
	    if (err) {
	      return console.error('error fetching client from pool', err)
	    }
	    client.query('SELECT * FROM lora_imst', function (err, result) {
	      done();
	      if (err) {
	        res.end();
	        return console.error('error happened during query', err)
	       }       //  console.log( " Gia tri muon in: " + result.rows[0].id);
	       res.render("webdata.ejs",{list:result});
	     });
	   });
	 });

  app.get("/chartdata", function(req,res){
    pool.connect(function (err, client, done) {
      if (err) {
        return console.error('error fetching client from pool', err);
      }
      client.query('SELECT device_name, temperature, created_at FROM lora_imst WHERE application_id=1', function (err, r_temperature_1){
        done();
        if (err) {
          res.end();
          return console.error('error data query',err);
        }
        console.log(r_temperature_1)
        res.render("analyze.ejs",{temp_1:r_temperature_1});
      });
      client.query('SELECT humidity FROM lora_imst WHERE application_id=1', function (err, r_humidity_1){
        done();
        if (err) {
          res.end();
          return console.error('error data query',err);
        }
        res.render("analyze.ejs",{humid_1:r_humidity_1});
      });
    });
  });

	 function getdata( a, data) {
	   //console.log(dot.pick(a,data));
	   return dot.pick( a,data);
	 }

	 client.on('connect', function () {
	   console.log('client connected:' + clientId)
	 })

	 client.on('error', function (err) {
	   console.log(err)
	   client.end()
	 })

	 client.subscribe('application/+/node/+/rx', { qos: 0 })
	 client.on('message', function (topic, message) {
	   //console.log(message.toString());
	   try {
	   var parse_data = JSON.parse(message);
	   }
	   catch(e) {
	    return console.error(e);
	   }
	   var appID = getdata('applicationID', parse_data);
	   var appName = getdata('applicationName', parse_data);
	   var deviceName = getdata('deviceName', parse_data);
	   var devEUI = getdata('devEUI', parse_data);
	   var mac = getdata('rxInfo[0].mac', parse_data);
	   var gatewayName = getdata('rxInfo[0].name', parse_data);
	   var rssi = getdata('rxInfo[0].rssi', parse_data);
	   var frequency = getdata('txInfo.frequency', parse_data);
	   var codeRate = getdata('txInfo.codeRate', parse_data);
	   var loRaSNR = getdata('rxInfo[0].loRaSNR', parse_data);
	   var modulation = getdata('txInfo.dataRate.modulation',parse_data);
	   var spreadFactor = getdata('txInfo.dataRate.spreadFactor', parse_data);
	   var bandwidth = getdata('txInfo.dataRate.bandwidth', parse_data);
	   var phyPayload1 = getdata('data', parse_data);
	   if(codeRate != null) {
	     pool.connect(function (err, client, done) {
	         if (err) {
	           return console.error('error fetching client from pool', err)
	         }
	 	var raw_data = phyPayload1.toString();
	         var buf = new Buffer(phyPayload1,'base64');
	         var phyPayload2 = buf.toString();
	     //    console.log(phyPayload2);
	         var wdata = phyPayload2.split(",");
	         var temper = wdata[1];
	         var humid = wdata[0];
	         client.query("INSERT INTO public.lora_imst(application_id, application_name, device_name, dev_eui, mac, gateway_name, rssi, frequency, coderate, lorasnr, modulation, spreadfactor, bandwidth, data, temperature, humidity, created_at, updated_at) VALUES('"+appID+"','"+appName+"','"+deviceName+"','"+devEUI+"','"+mac+"','"+gatewayName+"','"+rssi+"','"+frequency+"','"+codeRate+"','"+loRaSNR+"','"+modulation+"','"+spreadFactor+"','"+bandwidth+"','"+raw_data+"','"+temper+"','"+humid+"','Now()','Now()')", function(err, result) {
	           done();
	           if (err) {
	             return console.error('error happened during query', err)
	           }
	         })
	       })
	     }
	 })

	 client.on('close', function () {
	   console.log(clientId + ' disconnected')
	 })
	 //////////////////////
	 app.get("/dataraw", function(req,res) {
		 res.render("dataraw.ejs");
	 })
	app.get('*', function(req, res) { res.render('404', { title: 'Page Not Found'}); });

};
