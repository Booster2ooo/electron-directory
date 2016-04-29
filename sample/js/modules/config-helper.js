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