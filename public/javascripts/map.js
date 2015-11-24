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
		
		this.getData()
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
			.scale(36000)
			.translate([this.width / 2, this.height / 2]);

		return map;
	},

	_drawMap: function(mapData) {
		var map = this.svg.append('svg:g')
			.attr('id', 'map');

		var path = d3.geo.path().projection(this.projection);
		map.selectAll('path')
				.data(topojson.feature(mapData, mapData.objects.districts).features)
			.enter().append('path')
				.attr('d', path)
				.attr('class', 'district')
				.style('opacity', 0)
				.transition()
					.duration(5000)
					.style('opacity', 1);

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
		this._drawData(data);
		this._drawControls(data);
	},

	_drawData: function(data) {
		var points = this.svg.append('svg:g')
			.attr('id', 'points')
		var transDuration = 3000;

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
				return data[i].center ? 'center' : 'peref'
			})
			.attr('r', 0)
			.style('opacity', 0)
			.transition()
				.style('opacity', .8)
				.duration(function() {
					return Math.random() * transDuration;
				})
				.delay(function() {
					return Math.random() * transDuration;
				})
				.attr('r', 5);
		document.body.className = '';
	},

	_drawControls: function(data) {
		var width = 300,
			height = 100,
			transDuration = 3000;

		var centerData = d3.layout.histogram()
			.value(function(item) {
				return item.center ? item.date : null;
			})
			.bins(31)(data);

		var perefData = d3.layout.histogram()
			.value(function(item) {
				return item.center ? null : item.date;
			})
			.bins(31)(data);

		var x = this.xScale = d3.scale.linear()
			.domain([1, 30])
			.range([0, width]);

		var y = d3.scale.linear()
			.domain([0, d3.max(centerData, function(d) { return d.y; })])
			.range([height, 0]);

		var svg = d3.select('.histogram').append('svg')
			.attr('width', width)
			.attr('height', height*2)
			.append('g');

		var centerArea = d3.svg.area()
			.x(function(d) { return x(d.x); })
			.y0(height)
			.y1(function(d) { return y(d.y); });

		svg.append('path')
			.datum(centerData)
			.attr('class', 'centerarea')
			.attr('d', centerArea)
			.style('opacity', 0)
			.transition()
				.duration(transDuration)
				.style('opacity', 1);

		var perefArea = d3.svg.area()
			.x(function(d) { return x(d.x); })
			.y0(height)
			.y1(function(d) { return height*2 - y(d.y); });

		svg.append('path')
			.datum(perefData)
			.attr('class', 'perefarea')
			.attr('d', perefArea)
			.style('opacity', 0)
			.transition()
				.duration(transDuration)
				.style('opacity', 1);

		var fontSize = 60;

		this.centerCount = svg.append('text')
			.text(d3.selectAll('.center')[0].length)
			.attr('y', height / 2)
			.attr('dx', width / 2)
			.attr('dy', fontSize / 2)
			.attr('text-anchor', 'middle')
			.style('fill', 'white')
			.style('font-size', fontSize)
			.style('opacity', 0);

		this.centerCount.transition()
			.duration(transDuration)
			.style('opacity', 1);

		this.perefCount = svg.append('text')
			.text(d3.selectAll('.peref')[0].length)
			.attr('y', height * 1.5)
			.attr('dx', width / 2)
			.attr('dy', fontSize / 2)
			.attr('text-anchor', 'middle')
			.style('fill', 'white')
			.style('opacity', 0)
			.style('font-size', fontSize)
		
		this.perefCount.transition()
			.duration(transDuration)
			.style('opacity', 1);

		var that = this;
		var leftPosition = x.invert(0);
		var rightPosition = x.invert(width);

		var dragLeft = d3.behavior.drag()
			.on('drag', function(d) {
				var newPos = Math.max(0, Math.min(width, d3.event.x));
				d.x = Math.floor(x.invert(newPos));
				d.x = (d.x <= rightPosition) ? d.x : rightPosition-1;
				d3.select(this).attr('cx', x(d.x));
				leftPosition = d.x;
				that._filterData(leftPosition, rightPosition);
			});

		var dragRight = d3.behavior.drag()
			.on('drag', function(d) {
				var newPos = Math.max(0, Math.min(width, d3.event.x));
				d.x = Math.ceil(x.invert(newPos));
				d.x = (d.x >= leftPosition) ? d.x : leftPosition+1;
				d3.select(this).attr('cx', x(d.x));
				rightPosition = d.x;
				that._filterData(leftPosition, rightPosition);
			});

		svg.append('circle')
			.data([{x: 1}])
			.attr('r', 5)
			.attr('cx', function(d) {
				return x(d.x)
			})
			.attr('cy', height)
			.style('fill', 'white')
			.call(dragLeft);

		svg.append('circle')
			.data([{x: centerData.length-1}])
			.attr('r', 5)
			.attr('cx', function(d) {
				return x(d.x)
			})
			.attr('cy', height)
			.style('fill', 'white')
			.call(dragRight);
	},

	_updateCount: function(center, peref, leftPosition, rightPosition) {
		var fontSize = Math.max((rightPosition - leftPosition)*2, 15);
		var dx = this.xScale(leftPosition) + (this.xScale(rightPosition) - this.xScale(leftPosition))/2;
		this.centerCount
			.text(center)
			.attr('dx', dx)
			.attr('dy', fontSize/2)
			.style('font-size', fontSize);
		this.perefCount
			.text(peref)
			.attr('dx', dx)
			.attr('dy', fontSize/2)
			.style('font-size', fontSize);

	},

	_filterData: function(leftPosition, rightPosition) {
		var circlesToHide = this.svg.selectAll('circle').filter(function(d) {
			return d.date < leftPosition || d.date > rightPosition;
		});
		
		var circlesToShow = this.svg.selectAll('circle').filter(function(d) {
			return d.date >= leftPosition && d.date <= rightPosition;
		});

		var centerCirclesCount = circlesToShow.filter(function(d) {
			return !!d.center;
		})[0].length;

		var perefCirclesCount = circlesToShow[0].length - centerCirclesCount;

		this._updateCount(centerCirclesCount, perefCirclesCount, leftPosition, rightPosition);

		var transDuration = 1000;
		circlesToHide.transition()
			.duration(function() {
				return Math.random() * transDuration;
			})
			.delay(function() {
				return Math.random() * transDuration;
			})
			.attr('r', 0);

		circlesToShow.transition()
			.duration(function() {
				return Math.random() * transDuration;
			})
			.delay(function() {
				return Math.random() * transDuration;
			})
			.attr('r', 5);
	}
}
