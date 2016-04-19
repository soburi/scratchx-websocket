var WebSocketServer = require('ws').Server;
var spawn = require('child_process').spawn;
var wss = new WebSocketServer({port: 80});

wss.on('connection', function(ws) {
    console.log('connection');

    ws.on('message', function(message) {
        console.log('received: %s', message);
        var msg = JSON.parse(message);

	if(msg.command == 'eject') {
            var child = spawn("powershell.exe",
                ["function Eject-CDROM {\n" +
                 "$wmplayer = New-Object -ComObject WMPlayer.OCX \n" +
                 "$wmplayer.cdromCollection.Item(0).Eject() \n" +
                 "} \n" +
                 "Eject-CDROM\n"]);
            child.on("close", function(error) {
                console.log('exec eject: %s', error);
                var data = {command: 'eject', error: error };
                ws.send(JSON.stringify(data));
            });
	}
        else if(msg.command == 'close') {
            var child = spawn("powershell.exe",
                ["function Eject-CDROM {\n" +
                 "$wmplayer = New-Object -ComObject WMPlayer.OCX \n" +
                 "$wmplayer.cdromCollection.Item(0).Eject() \n" +
                 "$wmplayer.cdromCollection.Item(0).Eject() \n" +
                 "} \n" +
                 "Eject-CDROM\n"]);

            child.on("close", function(error) {
                console.log('exec close: %s', error);
                var data = {command: 'close', error: error };
                ws.send(JSON.stringify(data));
            });
        }
    });

    ws.on('error', function(err) {
        console.log('error: %s', error);
    });
});

process.on('SIGINT', function() {
    console.log("Caught interrupt signal");

    wss.close();

    process.exit();
});

