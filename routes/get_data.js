var express = require('express');
var router = express.Router(); 
var Converter = require("csvtojson").Converter;

router.get('/', function(req, res, next) {
	var converter = new Converter({
		delimiter: ';'
	});
	converter.on("end_parsed", function(jsonArray) {
		res.send(jsonArray)
	});
	require("fs").createReadStream("./data/data.csv").pipe(converter);
});

module.exports = router;
