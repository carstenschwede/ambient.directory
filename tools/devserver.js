var lrInject = require('inject-lr-script')
var stacked = require('stacked')
var http = require('http')
var serveStatic = require('serve-static')

var app = stacked()
app.use(lrInject())
app.use(serveStatic(__dirname + '/../'))

var server = http.createServer(app)
server.listen(8080);

var livereload = require('livereload');
var lrserver = livereload.createServer();
lrserver.watch(__dirname + "/../");


/*var connect  = require('connect');
var compiler = require('connect-compiler');
var static = require('serve-static');

var server = connect();


server.use(  static(__dirname + '/../'));

server.listen(8080);

*/