# electron-directory

## Introduction
When I started using Electron, I came accros some difficulties to work with path/fs because of the three different states of the application: developpement, packaged or asar packed.
Each one of them has its own way around with directories. That's how I ended up coding this little module to help unify the way I accessed files.


## Initialization
The module is wrapped within a promise, it take the application cwd path as argument as shown here:

```javascript
var electronDirectory = require('electron-directory')
  , dirHelper
  , electronExecPath
  , applicationJsPath
  ;

electronDirectory(__dirname)
	.then(function(electronDirectoryInstance) {
		dirHelper = electronDirectoryInstance;
		return dirHelper.getElectronPath();
	})
	.then(function(info) {
		electronExecPath = info;		
		return dirHelper.getApplicationPath();
	})
	.then(function(info) {
		applicationJsPath = info;
	});
```
Read the methods section for more info.

## Methods
**getElectronPath(path)**

Returns the full path relative to the executing Electron directory.

```javascript
electronDirectoryInstance.getElectronPath('config.json')
	.then(function(path) {
		console.log(path);
	});
```

**getApplicationPath(path)**

Returns the full path relative to the application directory, whenever it's within the asar or not.

```javascript
electronDirectoryInstance.getApplicationPath('/lib/mylib.js')
	.then(function(path) {
		console.log(path);
	});
```

## Usage sample
Here is a use case that illustrate the whole process. We will grab a default JSON config file in the application directory and, if the config.json doesn't exist yet, will create it into the Electron directory.

**/app.js
```javascript
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

```

**/js/main.js
```javascript
try {
	var configHelperModule = require('./js/modules/config-helper.js')
	  , configHelper
	  , config
	  , initConfigHelper = function initConfigHelper() {
			return new Promise(function(resolve, reject) {
				configHelperModule(__dirname)
					.then(function (helper) {
						configHelper = helper;
						return configHelper.getConfig();
					})
					.then(function (cfg) {
						config = cfg;
						return resolve();
					})
					.catch(reject);
			});
		}
	  ;
	initConfigHelper()
		.then(function(children_infos) {
			console.log('config loaded');
		})
		.catch(function(err) {
			console.error(err);
			err.stack && console.error(err.stack);
		});
}
catch(ex) {
	console.error(ex);
	ex.stack && console.error(ex.stack);
}
```

**/js/modules/config-helper.js
```javascript
var path = require('path')
  , fs = require('fs')
  , electronDirectory = require('electron-directory')

  , readFilePromise = function readFilePromise(file, options) {
        return new Promise(function(resolve, reject) {
            fs.readFile(file, options, function (err, data) {
                if(err) {
                    return reject(err);
                }
                return resolve(data);
            });
        });
    }
  , writeFilePromise = function writeFilePromise(file, data, options) {
        return new Promise(function(resolve, reject) {
            fs.writeFile(file, data, options, function (err) {
                if(err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }


  , _eventsNames = {
        addingConfigServer:     'adding-config-server'
      , addedConfigServer:      'added-config-server'
    }

  , configHelper = function configHelper(dirname) {
        return new Promise(function(moduleResolve, moduleReject) {
            var configBase = 'config.json'
              , defaultConfigBase = 'config/config.default.json'
              , defaultConfigPath
              , configPath
              , config
              , dirHelper
              , getConfig = function getConfig() {
                    return new Promise(function(resolve, reject) {
                        if(config) {
                            return resolve(config);
                        }
                        readFilePromise(configPath, { encoding:'utf8'})
                            .then(function(data) {
                                config = JSON.parse(data);
                                return resolve(config);
                            })
                            .catch(function(err) {
                                readFilePromise(defaultConfigPath, { encoding:'utf8'})
                                    .then(function(data) {
                                        data = JSON.parse(data);
                                        return setConfig(data);
                                    })
                                    .then(function() {
                                        return resolve(config);
                                    })
                                    .catch(reject);
                            });
                    });
                }
              , setConfig = function setConfig(newConfig) {
                    return new Promise(function(resolve, reject) {
                        var data = JSON.stringify(newConfig, null, '    ');
                        config = newConfig;
                        writeFilePromise(configPath, data, { encoding:'utf8', flag : 'w+'})
                            .then(resolve)
                            .catch(reject);
                    });
                }
              , getServerByAddress = function getServerByAddress(address) {
                    return new Promise(function(resolve, reject) {
                        if(!config.servers || !config.servers.length) {
                            return resolve();
                        }
                        return resolve(config.servers.filter(function(server) {
                            return server.address === address;
                        }));
                    });
                }
              , pushServer = function(server) {
                    return new Promise(function(resolve, reject) {
                        config.servers.push(server);
                        return resolve(server);
                    })
                }
              , emitServerAdded = function(server) {
                    return new Promise(function(resolve, reject) {
                        process.emit(_eventsNames.addedConfigServer,server);
                        return resolve(server);
                    });
                }
              , addServerToConfig = function(server) {
                    return new Promise(function(resolve, reject) {
                        var rejectFound = function rejectFound(result) {
                            if(result && result.length) {
                                return Promise.reject('a server with the same address already exists');
                            }
                            return Promise.resolve(server);
                        };
                        if(!server.address) {
                            return reject('no address specified');
                        }
                        getServerByAddress(server.address)
                            .then(rejectFound)
                            .then(pushServer)
                            .then(emitServerAdded)
                            .then(function() {
                                return setConfig(config);
                            })
                            .then(resolve)
                            .catch(reject);
                    });
                }
              , bindHandlers = function bindHandlers() {
                    return new Promise(function(resolve, reject) {
                        process.on(_eventsNames.addingConfigServer, handlers.onAddingConfigServer);
                        return resolve();
                    });
                }
              , handlers = {
                    onAddingConfigServer: function onAddingConfigServer(server) {
                        addServerToConfig(server);
                    }
                }
              , modulePublics = {
                    getConfig: getConfig
                  , setConfig: setConfig
                  , getServerByAddress: getServerByAddress
                  , eventsNames: _eventsNames
                }
              ;
            electronDirectory(dirname)
                .then(function(helper) {
                    dirHelper = helper;
                    return dirHelper.getElectronPath(configBase);
                })
                .then(function(info) {
                    configPath = info;
                    return dirHelper.getApplicationPath(defaultConfigBase);
                })
                .then(function(info) {
                    defaultConfigPath = info;
                    return bindHandlers();
                })
                .then(function() {
                    return moduleResolve(modulePublics);
                })
                .catch(moduleReject);
        });
    }
  ;

module.exports = configHelper;
```