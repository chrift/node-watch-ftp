# node-watch-ftp
Recursively watches a directory for changes and replicates changes on an ftp server

Originally built to fill the void that is PHPStorm's automatic ftp upload keep alive functionality!

Eliminates the need to use PHPStorm's auto upload function, (apart from files beginning with a full stop).

Built using node js.

Steps:
* Clone repo
* `npm install`
* Update config.js to suit your setup
* `npm start` or `npm run prod` to use pm2 to run in the background (You can use pm2 to initiate the connection on system boot, and to restart the app if it crashes)

Default watch directory is one above the project's root dir. This is configurable in config.js.
