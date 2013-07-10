var express = require("express");
var app = express();
app.use(express.logger());
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set("view options", { layout: false });
app.use(express.static(__dirname + '/public'));

var com = require("serialport");
var SerialPort = com.SerialPort;
var serialPort = new SerialPort("/dev/ttyACM0", {
    baudrate: 115200,
    parser: com.parsers.readline('\r\n')
});

var orm = require("orm");
var db = orm.connect({ protocol: "sqlite", pathname: "./readings.sql" }, function (err, db) {
    if (err) throw err;
    var Reading = db.define("reading", {
        date        : Date,
        humidity    : Number,
        temperature : Number,
        dewpoint    : Number
    }, {
    });
    Reading.sync(function (err) {
	!err && console.log("Reding sync: done!");
    });
});
var models = db.models;

serialPort.on('open',function() {
    console.log('Port open');
});

var latest = {'date': Date.now(),
	      'humidity': null,
	      'temperature': null,
	      'dewpoint': null
	     };

serialPort.on('data', function(data) {
    var now = Date.now();
    var ts = now / 1000;
    var values = data.split(',');
    if (values[0] == '0') {
	try {
	    var humidity = parseFloat(values[1])
	      , temperature = parseFloat(values[2])
	      , dewpoint = parseFloat(values[3])
	    ;
	    latest = {'date' : now,
    		      'humidity': humidity,
		      'temperature': temperature,
		      'dewpoint': dewpoint
    		     };
	    var read = new models.reading(latest);
	    read.save(function(err, read) {
		if (err) {
		    console.error(err);
		}
	    });
	} catch(err) {
	    if (err) {
		console.error(err);
	    }
	}

    }
});

app.get('/latest', function(request, response) {
  response.send(latest);
});

app.get('/', function(request, response) {
  response.render('index');
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
