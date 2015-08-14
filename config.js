/**
 * Created by ChrisCheshire on 14/08/15.
 */

'use strict';

var path = require('path'),
	fs = require('fs');

module.exports = {
	remoteRoot: '/var/www/dev/chris',
	localRoot: path.resolve(__dirname + '/..'), //One up from here
	ftpHost: 'ratio-web-06',
	ftpPort: 22,
	ftpUser: 'chris.ratio',
	ftpPrivateKey: fs.readFileSync('/Volumes/Larder/.ssh/id_rsa')
};