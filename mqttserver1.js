/////////////////////Website////////////////
var express = require('express');
var app = express();
app.use(express.static('app/public'));
app.set('views', __dirname + '/app/server/views');
app.set('view engine', 'ejs');
app.listen(5000);

////////////////////////////////////////
var bodyParser = require('body-parser')
var urlencodedParser = bodyParser.urlencoded({ extended: false })
////////////////////////////////////////////
var mqtt = require('mqtt')
var dot = require('dot-object')
var host = 'ws://54.212.193.26:8086'
var clientId = 'mqttjs_' + Math.random().toString(16).substr(2, 8)
var id = 0;
/////////////////////////////////////
/*
gateway/5ccf7ffffff01f6a/rx = {
"rxInfo":
{"mac":"5ccf7ffffff01f6a",
"time":"0001-01-01T00:00:00Z",
"timestamp":28758925,
"frequency":868128723,
"channel":0,"rfChain":0,
"crcStatus":1,
"codeRate":"4/5",
"rssi":-93,
"loRaSNR":-5,
"size":21,
"dataRate":
{"modulation":"LORA",
"spreadFactor":9,
"bandwidth":125
}
},
"phyPayload":"SF+w7XJGQx5GTRCFR0JSdsE5OFMG"}
*/
var parse;
var mac;
var rssi;
var time;
var timestamp;
var frequency;
var channel;
var rfChain;
var crcStatus;
var codeRate;
var loRaSNR;
var size;
var modulation;
var spreadFactor;
var bandwidth;
var phyPayload;
////////////////////////////////////
var lora_packet = require('lora-packet');
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
  user:'postgres',
  database: 'manager device',
  password: '1122',
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
    client.query('SELECT * FROM lora', function (err, result) {
      done();

      if (err) {
        res.end();
        return console.error('error happened during query', err)
      }
      //  console.log( " Gia tri muon in: " + result.rows[0].id);
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
    client.query('SELECT * FROM lora', function (err, result) {
      done();

      if (err) {
        res.end();
        return console.error('error happened during query', err)
      }
      //  console.log( " Gia tri muon in: " + result.rows[0].id);
        res.render("web_data.ejs",{list:result});
  });

  });
});

//////////////////////////////////////////////



function getdata( a, data) {
  return dot.pick( a,data);
}

client.on('connect', function () {
  console.log('client connected:' + clientId)
})

client.on('error', function (err) {
  console.log(err)
  client.end()
})

client.subscribe('#', { qos: 0 })
client.on('message', function (topic, message) {
  console.log(message.toString())
  parse_data = JSON.parse(message);
  mac = getdata('rxInfo.mac', parse_data);
  time = getdata('rxInfo.time', parse_data);
  rssi = getdata('rxInfo.rssi', parse_data);
  timestamp = getdata('rxInfo.timestamp', parse_data);
  frequency = getdata('rxInfo.frequency', parse_data);
  channel = getdata('rxInfo.channel', parse_data);
  rfChain = getdata('rxInfo.rfChain', parse_data);
  crcStatus = getdata('rxInfo.crcStatus', parse_data);
  codeRate = getdata('rxInfo.codeRate', parse_data);
  loRaSNR = getdata('rxInfo.loRaSNR', parse_data);
  size = getdata('rxInfo.size', parse_data);
  modulation = getdata('rxInfo.dataRate.modulation',parse_data);
  spreadFactor = getdata('rxInfo.dataRate.spreadFactor', parse_data);
  bandwidth = getdata('rxInfo.dataRate.bandwidth', parse_data);
  phyPayload1 = getdata('phyPayload', parse_data);

  //var packet = lora_packet.fromWire(new Buffer(phyPayload.toString(), 'hex'));
  //console.log("packet.toString()=\n" + packet);

  if(codeRate != null) {
    pool.connect(function (err, client, done) {
      id++;
      var buf = new Buffer(phyPayload1,'base64');
      phyPayload2 = buf.toString();
      console.log(phyPayload2);
        if (err) {
          return console.error('error fetching client from pool', err)
        }

        client.query("INSERT INTO lora(id, mac, time, rssi, timestamp, frequency, channel, rfchain, crcstatus, coderate, lorasnr, size, modulation, spreadfactor, bandwidth, phypayload)  VALUES('"+id+"','"+mac+"','"+time+"','"+rssi+"','"+timestamp+"','"+frequency+"','"+channel+"','"+rfChain+"','"+crcStatus+"','"+codeRate+"','"+loRaSNR+"','"+size+"','"+modulation+"','"+spreadFactor+"', '"+bandwidth+"','"+phyPayload2+"')", function(err, result) {
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
