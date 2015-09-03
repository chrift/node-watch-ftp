/**
 * Created by ChrisCheshire on 11/08/15.
 */

'use strict';

var chokidar = require('chokidar'),
    Client   = require('ssh2').Client,
    async    = require('async'),
    fs       = require('fs'),
    path     = require('path'),
    notifier = require('node-notifier');

var conn = new Client();

var log = console.log.bind(console);

var config = require('./config');

var remoteRoot = config.remoteRoot,
    localRoot  = config.localRoot;

notify('Build started');

async.parallel({
	sftp: function (callback) {
		conn.on('ready', function () {
			console.log('Client :: ready');

			conn.sftp(function (err, sftp) {
				if (err) return callback(err);

				callback(null, sftp);
			});
		}).on('error', function (err) {
			notify('An error has occurred');
			console.error(err);

			process.exit(1);
		}).connect({
			host: config.ftpHost,
			port: config.ftpPort,
			username: config.ftpUser,
			password: config.ftpPassword,
			privateKey: config.ftpPrivateKey,
			//keepaliveInterval: 30
		});
	},
	watcher: function (callback) {
		//Ignore node_modules folders and files starting with dot or js_
		var watcher = chokidar.watch(localRoot, {ignored: /[\/\\]\.|.node_modules/});

		watcher
			.on('error', function (error) {
				log('Error happened', error);

				callback(error);
			})
			.on('ready', function () {
				log('Initial scan complete. Ready for changes.');

				callback(null, watcher);
			});
	}
}, function (err, results) {
	if (err) {
		console.log('There was an error!:');
		console.error(err);

		notify('There was an error!');

		process.exit(1);
	}

	notify('Pre-amble complete');

	var watcher = results.watcher,
	    sftp    = results.sftp;

	watcher
		.on('add', function (path) {
			log('File', path, 'has been added');

			var remoteFilePath = getRemoteFilePath(path);

			sftp.mkdir(fileDir(remoteFilePath), function (err) {
				//console.log(err);

				sftp.fastPut(path, remoteFilePath, function (err) {
					if (err) {
						console.log('Error uploading new file');
						console.error(err);
					} else {
						console.log('File uploaded to', remoteFilePath);
						notify('New file uploaded: ' + fileName(remoteFilePath));
					}
				});
			});
		})
		.on('change', function (path) {
			log('File', path, 'has been changed');

			var remoteFilePath = getRemoteFilePath(path);

			sftp.mkdir(fileDir(remoteFilePath), function (err) {
				//if (err)
				//	console.error(err);

				sftp.fastPut(path, remoteFilePath, function (err) {
					if (err) {
						console.log('Error uploading modified file');
						console.error(err);
					} else {
						console.log('File uploaded to', remoteFilePath);
						notify('File changes uploaded: ' + fileName(remoteFilePath));
					}
				});
			});
		})
		.on('unlink', function (path) {
			log('File', path, 'has been removed');

			var remoteFilePath = getRemoteFilePath(path);

			sftp.unlink(remoteFilePath, function (err) {
				if (err) {
					console.log('Error removing file');
					console.error(err);
				} else {
					console.log('File has been removed from ', getRemoteFilePath(path));
					notify('File removed: ' + fileName(remoteFilePath));
				}
			});
		})
		// More events.
		.on('addDir', function (path) {
			log('Directory', path, 'has been added');

			sftp.mkdir(getRemoteFilePath(path), function (err) {
				if (err) {
					console.log('Error adding folder');
					console.error(err);
				} else {
					console.log('Dir added at ', getRemoteFilePath(path));
					notify('Directory created: ' + fileName(path));
				}
			});
		})
		.on('unlinkDir', function (path) {
			log('Directory', path, 'has been removed');

			sftp.rmdir(getRemoteFilePath(path), function (err) {
				if (err) {
					console.log('Error uploading folder');
					console.error(err);
				} else {
					console.log('Dir removed at ', getRemoteFilePath(path));
					notify('Directory removed: ' + fileName(path));
				}
			});
		})
		.on('error', function (error) {
			log('Error happened', error);

			notify('Error!');
		})
});

function getRemoteFilePath(localFilePath) {
	return localFilePath.replace(localRoot, remoteRoot)
}

function fileDir(filePath) {
	var split = filePath.split('/');

	return split.splice(0, split.length - 1).join('/');
}

function fileName(filePath) {
	return filePath.split('/').splice(-1)[0];
}

function notify(message) {
	notifier.notify({
		//icon: path.join(__dirname, 'public/favicon.gif'),
		title: 'FTP-Sync',
		message: message
	});
}