const Xpl = require("xpl-api");
const commander = require('commander');
const SerialPort = require('serialport')
const os = require('os');

const CC128Serial = require('./lib/cc128-serial');

commander.version(require("./package.json").version);
commander.option("-s, --serialPort <path>", "Serial device path");
commander.option("-a, --deviceAliases <aliases>", "Devices aliases");

Xpl.fillCommander(commander);

commander.option("--heapDump", "Enable heap dump (require heapdump)");

commander.command('listSerialPort').description("List serial ports").action(
    function() {

      console.log("List serial ports:");
      SerialPort.list(function(err, ports) {
        if (err) {
          console.log("List performs error : " + err);
          process.exit(0);
          return;
        }

        ports.forEach(function(port) {
          console.log("  Port name='" + port.comName + "' pnpId='" +
              port.pnpId + "' manufacturer='" + port.manufacturer + "'");
        });
        console.log("End of list");

      });
    });

commander
    .command('start')
    .description("Start processing CC128 datas")
    .action(
        function() {
          console.log("Start");

          if (!commander.serialPort) {
            switch (os.platform()) {
            case "win32":
              commander.serialPort = "COM4";
              break;
            case "linux":
              commander.serialPort = "/dev/serial/by-id/usb-Prolific_Technology_Inc._USB-Serial_Controller-if00-port0";
              break;
            }

            console.log("Use default serial port : " + commander.serialPort);
          }

          commander.deviceAliases = Xpl
              .loadDeviceAliases(commander.deviceAliases);

          const port  = new SerialPort(commander.serialPort, {
            baudRate : 57600,
            dataBits : 8,
            stopBits : 1,
            parity : 'none',
            rtscts : false,
          });
          //const parser = port.pipe(new Readline({ delimiter: '\r\n' }))

          port.on("open", function(error) {
            console.log('Parse opened');
            try {
              if (error) {
                console.log("Can not open serial device '" +
                    commander.serialPort + "'", error);
                process.exit(1);
                return;
              }
              console.log("Serial device '" + commander.serialPort +
                  "' opened.");

              if (!commander.xplSource) {
                var hostName = os.hostname();
                if (hostName.indexOf('.') > 0) {
                  hostName = hostName.substring(0, hostName.indexOf('.'));
                }

                commander.xplSource = "cc128." + hostName;
              }

              var xpl = new Xpl(commander);

              xpl.on("error", function(error) {
                console.log("XPL error", error);
              });

              xpl.bind(function(error) {
                if (error) {
                  console.log("Can not open xpl bridge ", error);
                  process.exit(2);
                  return;
                }

                console.log("Xpl bind succeed ");

                new CC128Serial(function(data, callback) {
                  // console.log("Write '" + data + "'");
                  port.write(data, callback);

                }, function(body, callback) {
                  xpl.sendXplTrig(body, callback);

                }, commander, function(error, cc128) {
                  if (error) {
                    console.log("Can not initialize CC128 engine ", error);
                    process.exit(3);
                    return;
                  }

                  port.on('data', function(data) {
//                    console.log('data received: ' + data+"'");

                    cc128.processSerialData(data);
                  });

                  port.on('close', function() {
                    console.log('close received: ' + data);

                    cc128.close();

                    xpl.close();
                  });

                  xpl.on("xpl:xpl-cmnd", function(message) {
                    cc128.processXplMessage(message);
                  });
                });

              });
            } catch (x) {
              console.log(x);
            }
          });
        });

commander.parse(process.argv);
