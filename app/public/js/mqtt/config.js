// host = "172.16.153.122";	// hostname or IP address
host = "54.212.193.26";	// hostname or IP address
// host = "172.16.153.110";	// hostname or IP address
port = 8086;
topic = "#";		// topic to subscribe to
useTLS = false;
username = null;
password = null;
// username = "jjolie";
// password = "aa";

// path as in "scheme:[//[user:password@]host[:port]][/]path[?query][#fragment]"
//    defaults to "/mqtt"
//    may include query and fragment
//
// path = "/mqtt";
// path = "/data/cloud?device=12345";
var mqtt;
var reconnectTimeout = 2000;

function MQTTconnect() {
if (typeof path == "undefined") {
path = "/mqtt";
}
mqtt = new Paho.MQTT.Client(
  host,
  port,
  path,
  "web_" + parseInt(Math.random() * 100, 10)
);
    var options = {
        timeout: 3,
        useSSL: useTLS,
        cleanSession: cleansession,
        onSuccess: onConnect,
        onFailure: function (message) {
            $("#status").val("Connection failed: " + message.errorMessage + "Retrying");
            setTimeout(MQTTconnect, reconnectTimeout);
        }
    };

    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;

    if (username != null) {
        options.userName = username;
        options.password = password;
    }
    console.log("Host="+ host + ", port=" + port + ", path=" + path + " TLS = " + useTLS + " username=" + username + " password=" + password);
    mqtt.connect(options);
}

function onConnect() {
    $("#status").val("Connected to Server !");
    // Connection succeeded; subscribe to our topic
    mqtt.subscribe(topic, {qos: 0});
    $("#topic").val(topic);
}

function onConnectionLost(response) {
    setTimeout(MQTTconnect, reconnectTimeout);
    $("#status").val("connection lost: " + responseObject.errorMessage + ". Reconnecting");

};

function onMessageArrived(message) {

    var value = "0";
    //var payload = "0,0,0";
    var topic = message.destinationName;
    var payload = message.payloadString;
    var sl_data = payload.split(",");
    console.log(sl_data);
    $("r_data").val(sl_data[0]);
    if (sl_data[0] == "1") {
      $("#channel_1").val(sl_data[0]);
      $("#channel_2").val(value);
        $("#channel_3").val(value);
          $("#channel_4").val(value);
          if (sl_data[1] == "1") {
          //  $("#channel_1_status").prop("checked", false);
            $("#channel_2_status").val(value);
            $("#channel_3_status").val(value);
            $("#channel_4_status").val(value);
          }else {
            $("#channel_2").val(value);
            $("#channel_1").val(value);
            $("#channel_3").val(value);
            $("#channel_4").val(value);
          }
          if (sl_data[2] != "0") {
            $("#channel_1_value").val(sl_data[2]);
            $("#channel_2_value").val(value);
            $("#channel_3_value").val(value);
            $("#channel_4_value").val(value);
          }else {
            $("#channel_1_value").val(value);
            $("#channel_2_value").val(value);
            $("#channel_3_value").val(value);
            $("#channel_4_value").val(value);
          }
      }

      if (sl_data[0] == "2") {
        $("#channel_2").val(sl_data[0]);
        $("#channel_1").val(value);
          $("#channel_3").val(value);
            $("#channel_4").val(value);
            if (sl_data[1] == "1") {
            //  $("#channel_2_status").prop("checked", true);
              $("#channel_1_status").val(value);
              $("#channel_3_status").val(value);
              $("#channel_4_status").val(value);
            }else {
              $("#channel_2").val(value);
              $("#channel_1").val(value);
              $("#channel_3").val(value);
              $("#channel_4").val(value);
            }
            if (sl_data[2] != "0") {
              //$("#channel_2_value").val(sl_data[2]);
              $("#channel_1_value").val(value);
              $("#channel_3_value").val(value);
              $("#channel_4_value").val(value);
            }else {
              $("#channel_1_value").val(value);
              $("#channel_2_value").val(value);
              $("#channel_3_value").val(value);
              $("#channel_4_value").val(value);
            }
          }

if (sl_data[0] == "3") {
  $("#channel_3").val(sl_data[0]);
  $("#channel_2").val(value);
    $("#channel_1").val(value);
      $("#channel_4").val(value);
      if (sl_data[1] == "1") {
        //$("#channel_3_status").prop("checked", true);
        $("#channel_2_status").val(value);
        $("#channel_1_status").val(value);
        $("#channel_4_status").val(value);
      }else {
        $("#channel_2").val(value);
        $("#channel_1").val(value);
        $("#channel_3").val(value);
        $("#channel_4").val(value);
      }
      if (sl_data[2] != "0") {
        $("#channel_3_value").val(sl_data[2]);
        $("#channel_2_value").val(value);
        $("#channel_1_value").val(value);
        $("#channel_4_value").val(value);
      }else {
        $("#channel_1_value").val(value);
        $("#channel_2_value").val(value);
        $("#channel_3_value").val(value);
        $("#channel_4_value").val(value);
      }
  }

  if (sl_data[0] == "4") {
    $("#channel_4").val(sl_data[0]);
    $("#channel_2").val(value);
      $("#channel_3").val(value);
        $("#channel_1").val(value);
        if (sl_data[1] == "1") {
          $("#channel_4_status").prop("checked", true);
          $("#channel_2_status").val(value);
          $("#channel_3_status").val(value);
          $("#channel_1_status").val(value);
        }else {
          $("#channel_2").val(value);
          $("#channel_1").val(value);
          $("#channel_3").val(value);
          $("#channel_4").val(value);
        }
        if (sl_data[2] != "0") {
          $("#channel_4_value").val(sl_data[2]);
          $("#channel_2_value").val(value);
          $("#channel_3_value").val(value);
          $("#channel_1_value").val(value);
        }else {
          $("#channel_1_value").val(value);
          $("#channel_2_value").val(value);
          $("#channel_3_value").val(value);
          $("#channel_4_value").val(value);
        }
    }

    $("#ws").prepend("<li>" + topic + " = " + payload + "</li>");
};


$(document).ready(function() {
    MQTTconnect();
});


cleansession = true;
