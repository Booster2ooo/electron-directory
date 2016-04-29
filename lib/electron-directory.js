var path = require('path')
  , fs = require('fs')
  , electronDirectory = function electronDirectory(cwd) {
        return new Promise(function(moduleResolve, moduleReject) {
            const asarPath = 'app.asar'
                , oneup = '..'
                ;
            var wd = cwd
              , isAsar = false
              , isPublished = false
              , modulePublics = {
                    getCwd: function getCwd() {
                        return new Promise(function(resolve, reject) { resolve(wd) });
                    }
                  , getIsAsar: function getIsAsar() {
                        return new Promise(function(resolve, reject) { resolve(isAsar) });
                    }
                  , getApplicationPath: function getApplicationPath(p) {
                        return new Promise(function(resolve, reject) {
                            p = p || '';
                            if(!isAsar) {
                                return resolve(path.join(wd, p));
                            }
                            else {
                                return resolve(path.join(wd, asarPath, p));
                            }
                        });
                    }
                  , getElectronPath: function getElectronPath(p) {
                        return new Promise(function(resolve, reject) {
                            p = p || '';
                            if(isAsar) {
                                return resolve(path.join(wd, oneup, p));
                            }
                            else if(isPublished) {
                                return resolve(path.join(wd, oneup, oneup, p));
                            }
                            return resolve(path.join(wd, p));
                        });
                    }
                }
              ;

            fs.stat(path.join(wd, oneup, asarPath), function(err, stats) {
                if(!err) {
                    wd = path.join(wd, oneup);
                    isAsar = true;
                    isPublished = true;
                }
                else {
                    isPublished = wd.substr(-4) == path.join('/','app');
                }
                return moduleResolve(modulePublics);
            });
        });
    }
  ;

module.exports = electronDirectory;