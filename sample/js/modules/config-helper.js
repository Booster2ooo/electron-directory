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
              , modulePublics = {
                    getConfig: getConfig
                  , setConfig: setConfig
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
                    return moduleResolve(modulePublics);
                })
                .catch(moduleReject);
        });
    }
  ;

module.exports = configHelper;