#!/usr/bin/env node

try {
	var app = require('app')
	  , BrowserWindow = require('browser-window') 
	  , windows = {}
	  ;
	app.on('window-all-closed', function() {
		if (process.platform != 'darwin') {
			app.quit();
		}
	});
	app.on('ready', function() {
		windows["main"] = new BrowserWindow({width: 1000, height: 800, title: "NoIRC XDCC Client", defaultEncoding: "utf8"});
		windows["main"].loadURL('file://' + __dirname + '/app.html');
        windows["main"].toggleDevTools();
		windows["main"].on('closed', function() {
			delete windows["main"];
		});
	});
}
catch(ex) {
	console.log(ex);
	ex.stack && console.log(ex.stack);
}
