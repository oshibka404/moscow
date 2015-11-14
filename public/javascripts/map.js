var M = {
	center: [55.7333, 37.6007],
	fullMapTopLeft = [55.9146, 36.7218], // Широта и долгота левого-верхнего угла картинки с картой

	init: function () {
		this.url = '/get_data';
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		document.body.className = 'loading';
		this.getData()
			.then(this._parseJSON.bind(this))
			.then(this._calculateScale.bind(this))
			.then(this._initDataLayer.bind(this))
			.catch(function(err) {
				throw err;
			});
	},

	_calculateScale: function (data) { 
		var mapRatio = (this.fullMapTopLeft[0]-this.center[0]) / (this.fullMapTopLeft[1]-this.center[1]);
		var screenRatio = this.width / this.height;
		if (mapRatio > screenRatio) { // верх и низ карты скрыты
			var topBorderLat = this.fullMapTopLeft[1] - (this.fullMapTopLeft[1] - this.center[1]) * (mapRatio / screenRatio);
			this.leftTop = [this.fullMapTopLeft[0], topBorderLat];
		}

		return _normalizeCoords(data);
	},

	_initDataLayer: function(data) {
		this._drawHistogram(data);
		this._drawData(data);
	},

	getData: function() {
		var request = new XMLHttpRequest();
		var deferred = Q.defer();

		request.open("GET", this.url, true);
		request.onload = onload;
		request.onerror = onerror;
		request.onprogress = onprogress;
		request.send();

		function onload() {
			if (request.status === 200) {
				deferred.resolve(request.responseText);
			} else {
				deferred.reject(new Error("Status code was " + request.status));
			}
		}

		function onerror() {
			deferred.reject(new Error("Can't XHR " + JSON.stringify(url)));
		}

		function onprogress(event) {
			deferred.notify(event.loaded / event.total * 100 + '%');
		}

		return deferred.promise;
	},

	_parseJSON: function(json) {
		var rawData = [];
		try {
			rawData = JSON.parse(json);
		} catch (e) {
			throw e;
		}
		
		// оставим только нужные данные
		var parsedData = [];
		for (var i = 0, l = rawData.length; i < l; i++) {
			var item = rawData[i];
			console.log(i, item);
			parsedData.push({
				date: this._parseDate(item.date),
				lat: this._parseFloat(item.lat),
				long: this._parseFloat(item.long),
				center: !!parseInt(item.center),
				peref: !parseInt(item.center) // данные немного косячные - бывает такое, что {center: 0, peref: 0}. Чтобы сумма сходилась, делаю так.
			});
		}

		// parsedData = this._normalizeCoords(parsedData);

		return parsedData;
	},

	_parseDate: function(strDate) {
		// решение для частного случая - возвращаем только день месяца
		return parseInt(strDate.split('.')[0]);

		// решение для общего случая - возвращаем нормальный объект Date
		// var dmy = strDate.split('.');
		// return new Date(dmy[2], dmy[1]-1, dmy[0]);
	},

	_parseFloat: function(strfloat) {
		return parseFloat(strfloat.split(',').join('.'));
	},

	_normalizeCoords: function(data) {

	},

	_drawData: function(data) {
		document.body.className = '';
	},

	_drawHistogram: function(data) {

	}
}