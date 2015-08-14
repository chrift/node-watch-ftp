/**
 * Created by ChrisCheshire on 11/08/15.
 */

'use strict';

var chokidar = require('chokidar');

var Client = require('ssh2').Client;

var async = require('async');

var conn = new Client();

var log = console.log.bind(console);

var fs   = require('fs'),
    path = require('path');

var config = require('./config');

var remoteRoot = config.remoteRoot,
    localRoot  = config.localRoot;

async.parallel({
	sftp: function (callback) {
		conn.on('ready', function () {
			console.log('Client :: ready');
			conn.sftp(function (err, sftp) {
				if (err) return callback(err);

				callback(null, sftp);

				//sftp.readdir('foo', function (err, list) {
				//	if (err) throw err;
				//	console.dir(list);
				//	conn.end();
				//});
			});
		}).on('error', function (err) {
			console.error(err);

			if (err)
				callback(err);
		}).connect({
			host: config.ftpHost,
			port: config.ftpPort,
			username: config.ftpUser,
			privateKey: config.ftpPrivateKey,
			//keepaliveInterval: 30
		});
	},
	watcher: function (callback) {
		//Ignore node_modules folders
		var watcher = chokidar.watch(localRoot, {ignored: /.node_modules/});

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
	var watcher = results.watcher,
	    sftp    = results.sftp;

	watcher
		.on('add', function (path) {
			log('File', path, 'has been added');

			var remoteFilePath = getRemoteFilePath(path);

			sftp.mkdir(fileDir(remoteFilePath), function (err) {
				console.log(err);

				sftp.fastPut(path, remoteFilePath, function (err) {
					if (err)
						console.log(err);
					else console.log('File uploaded to', remoteFilePath);
				});
			});
		})
		.on('change', function (path) {
			log('File', path, 'has been changed');

			var remoteFilePath = getRemoteFilePath(path);

			console.log(remoteFilePath, fileDir(remoteFilePath));

			sftp.mkdir(fileDir(remoteFilePath), function (err) {
				if (err)
					console.error(err);

				sftp.fastPut(path, remoteFilePath, function (err) {
					if (err)
						console.log(err);
					else console.log('File uploaded to', remoteFilePath);
				});
			});
		})
		.on('unlink', function (path) {
			log('File', path, 'has been removed');

			sftp.unlink(getRemoteFilePath(path), function (err) {
				if (err)
					console.error(err);
				else console.log('File has been uploaded to ', getRemoteFilePath(path));
			});
		})
		// More events.
		.on('addDir', function (path) {
			log('Directory', path, 'has been added');

			sftp.mkdir(fileDir(path), function (err) {
				if (err)
					console.error(err);
				else console.log('Dir added at ', fileDir(path));
			});
		})
		.on('unlinkDir', function (path) {
			log('Directory', path, 'has been removed');

			sftp.rmdir(fileDir(path), function (err) {
				if (err)
					console.error(err);
			});
		})
		.on('error', function (error) {
			log('Error happened', error);
		})
});

function getRemoteFilePath(localFilePath) {
	return localFilePath.replace(localRoot, remoteRoot)
}

function fileDir(filePath) {
	var split = filePath.split('/');

	return split.splice(0, split.length - 1).join('/');
}