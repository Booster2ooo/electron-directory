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