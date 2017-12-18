/////////////////////Website////////////////
var express = require('express');
var app = express();
var nodeExcel = require('excel-export');
app.use(express.static('app/public'));
app.set('views', __dirname + '/app/server/views');
app.set('view engine', 'ejs');
//app.set("views","./views");
app.listen(8089);

////////////////////////////////////////
var bodyParser = require('body-parser')
var urlencodedParser = bodyParser.urlencoded({ extended: false })
////////////////////////////////////////////
var mqtt = require('mqtt')
var dot = require('dot-object')
var host = 'ws://18.217.3.199:8086'
var clientId = 'mqttjs_' + Math.random().toString(16).substr(2, 8)

var fs = require('fs');
var copyFrom = require('pg-copy-streams').from;
csv = require('csv');
////////////////////////////////////
//var lora_packet = require('lora-packet');
////////////////////////////////

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

var client = mqtt.connect(host, options)
//////////////////////////////////////////////
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

app.get("/", function(req,res) {
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
        console.log( " Gia tri muon in: " + result.rows[0]);
        res.render("showdata.ejs",{list:result});
  });

  });
});
///////////////////////////////////////////////
app.get("/viewdata", function(req,res) {
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
       res.render("web_data.ejs",{list:result});
     });
   });
 });
//////////////////////////////////////////////
app.get('/Excel', function(req, res){
	pool.connect(function(err, client, done) {
	  var stream = client.query(copyFrom('COPY lora_imst FROM STDIN CSV'));
	    var fileStream = fs.createReadStream('some_file.tsv')
		fileStream.on('error', done);
	      	stream.on('error', done);
	        stream.on('end', done);
		fileStream.pipe(stream);
	});
});
//////////////////////////////////////////////


function getdata( a, data) {
  console.log(dot.pick(a,data));
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
  console.log(message.toString());
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
        console.log(phyPayload2);
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
