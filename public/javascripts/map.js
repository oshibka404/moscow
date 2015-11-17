var M = {
	center: [37.618637, 55.751920],

	init: function () {
		this.width = window.innerWidth - 20;
		this.height = window.innerHeight - 20;
		document.body.className = 'loading';
		
		this.svg = d3.select('body').append('svg')
			.attr('width', this.width)
			.attr('height', this.height);

		this.getMap()
			.then(this._setProjection.bind(this))
			.then(this._drawMap.bind(this))
			.then(this.getData.bind(this))
			.then(this._parseData.bind(this))
			.then(this._drawDataLayer.bind(this))
			.catch(function(err) {
				throw err;
			});
	},

	getMap: function() {
		
		var deferred = Q.defer();

		d3.json('/data/moscow.json', function(error, map) {
			if (error) {
				deferred.reject(error);
			}
			deferred.resolve(map);
		});

		return deferred.promise;
	},

	_setProjection: function(map) {
		this.projection = d3.geo.mercator()
			.center(this.center)
			.scale(16000)
			.translate([this.width / 2, this.height / 2]);
		return map;
	},

	_drawMap: function(mapData) {
		var map = this.svg.append('svg:g')
    		.attr('id', 'map');

		var path = d3.geo.path().projection(this.projection);
		map.append('g')
			.attr('class', 'moscow')
			.selectAll('path')
				.data(topojson.feature(mapData, mapData.objects.districts).features)
			.enter().append('path')
			.attr('d', path)
			.attr('class', 'district');

		return true;
	},

	getData: function() {
		var deferred = Q.defer();

		d3.json('/get_data', function(data) {
			deferred.resolve(data);
		});

		return deferred.promise;
	},

	_parseData: function(rawData) {
		var parseDate = function(strDate) {
			// решение для частного случая - возвращаем только день месяца
			return parseInt(strDate.split('.')[0]);
		};

		var parseCoords = function(strfloat) {
			return parseFloat(strfloat.split(',').join('.'));
		}

		// оставим только нужные данные
		return rawData.map(function(item) {
			var coords = [parseCoords(item.long), parseCoords(item.lat)];
			var position = this.projection(coords);
			return {
				date: parseDate(item.date),
				coords: coords,
				position: position,
				center: !!parseInt(item.center),
				peref: !parseInt(item.center) // данные немного косячные - бывает такое, что {center: 0, peref: 0}. Чтобы сумма сходилась, делаю так.
			};
		}.bind(this));
	},

	_drawDataLayer: function(data) {
		this._drawHistogram(data);
		this._drawData(data);
	},

	_drawData: function(data) {
		document.body.className = '';

		var points = this.svg.append('svg:g')
			.attr('id', 'points')

		points.selectAll('circle')
			.data(data)
			.enter().append('svg:circle')
			.attr('cx', function(d, i) {
				return data[i].position[0]; 
			})
			.attr('cy', function(d, i) {
				return data[i].position[1];
			})
			.attr('data-date', function(d,i) {
				return data[i].date;
			})
			.attr('class', function(d,i) {
				return data[i].center ? "center" : "peref"
			})
			.attr('r', 5);
	},

	_drawHistogram: function(data) {

	}
}