var app = {
    history: [], // auto
    history2: [], // manual

    geodataID: 'geofence-data', // localStorage
    watchID: null, // watchPosition

    pt: [], // center
    pts: [], // polygon

    map: null,

    layer1: null,
    layer2: null,
    marker: null,
    polygon: null,
    polyline: null,
    //rectangle: null,

    lastStatus: '',
    startTime: 0,
    endTime: 0,

    dist: 0.0, // total distance travelled

    accuracyThreshold: 600, // meters

    serverAlert: false,
    serverUrl: 'http://ings.ca/post.php'
};

app.init = function () {
    console.info('app.init:');
    console.log('Leaflet ' + L.version);

    FlyJSONP.init({
        debug: false
    });

    var txt = 'DateTime,Latitude,Longitude,Accuracy,Heading,Speed,Distance,Altitude,Geofence' + "\n";

    localStorage.setItem(app.geodataID, txt);

    // Mississauga (Buckhorn and Tahoe) Campus
    app.pt = [43.639933, -79.608959];
    app.pts = [
        [43.644631, -79.610453],
        [43.644290, -79.609884],
        [43.644189, -79.609766],
        [43.644034, -79.609605],
        [43.643886, -79.609498],
        [43.643731, -79.609390],
        [43.643374, -79.609219],
        [43.643211, -79.609101],
        [43.643055, -79.608951],
        [43.642838, -79.608639],
        [43.642659, -79.608296],
        [43.642504, -79.607824],
        [43.642434, -79.607416],
        [43.642395, -79.606998],
        [43.642333, -79.606622],
        [43.642201, -79.606279],
        [43.642046, -79.606032],
        [43.641875, -79.605861],
        [43.641650, -79.605721],
        [43.641394, -79.605668],
        [43.641208, -79.605689],
        [43.640998, -79.605764],
        [43.640796, -79.605914],
        [43.640641, -79.606075],
        [43.640516, -79.606279],
        [43.640408, -79.606547],
        [43.640338, -79.606891],
        [43.640097, -79.606655],
        [43.639235, -79.605206],
        [43.638987, -79.605056],
        [43.637473, -79.606966],
        [43.637814, -79.607320],
        [43.637900, -79.607491],
        [43.637962, -79.607695],
        [43.637970, -79.607899],
        [43.637939, -79.608092],
        [43.637884, -79.608253],
        [43.637566, -79.608704],
        [43.638933, -79.610935],
        [43.641044, -79.614036],
        [43.641386, -79.614176]
    ];

    app.map = L.map('map').setView(app.pt, 15);

/*
    L.tileLayer('http://{s}.tile.cloudmade.com/d4fc77ea4a63471cab2423e66626cbb6/997/256/{z}/{x}/{y}.png', {
        //attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://cloudmade.com">CloudMade</a>',
        maxZoom: 18
    }).addTo(app.map);
*/

    L.tileLayer('http://{s}.googleapis.com/vt?lyrs=m@174225136&src=apiv3&hl=en-US&x={x}&y={y}&z={z}&s=Galile&style=api%7Csmartmaps', {
        attribution: 'Map data &copy; 2014 Google',
        maxZoom: 22,
        subdomains: ['mt0', 'mt1']
    }).addTo(app.map);

    L.control.scale().addTo(app.map);

    var crosshairIcon = L.icon({
        iconUrl: 'img/crosshair_square.gif',
        shadowUrl: '',
        iconSize: [17, 17], // size of the icon
        shadowSize: [0, 0], // size of the shadow
        iconAnchor: [8, 9], // point of the icon which will correspond to marker's location
        shadowAnchor: [0, 0], // the same for the shadow
        popupAnchor: [8, 9] // point from which the popup should open relative to the iconAnchor
    });

    var crosshair = L.marker([0, 0], {
        icon: crosshairIcon
    }).addTo(app.map);

    app.updateZoom();

    app.map.on('zoomend', app.updateZoom);

    app.map.on('move', function () {
        crosshair.setLatLng(app.map.getCenter());
    });

    app.polygon = L.polygon(app.pts, {
        color: '#FF0000',
        opacity: 0.6,
        fillOpacity: 0.2
    });

    // Draw a bounding box around polygon
    // app.rectangle = L.rectangle(app.polygon.getBounds(), {
    //     color: "#FF0000",
    //     dashArray: '5,5',
    //     fill: false,
    //     opacity: 0.4,
    //     weight: 2
    // });

    app.marker = L.marker(app.pt, {
        draggable: true
    });

    //app.layer1 = L.layerGroup([app.polygon, app.rectangle]);
    app.layer1 = L.layerGroup([app.polygon]);

    app.layer1.addLayer(app.marker);
    app.layer1.addTo(app.map);

    app.marker.bindPopup('<b>' + app.marker.getLatLng().lat.toFixed(6) + ', ' + app.marker.getLatLng().lng.toFixed(6) + '</b><br>');

    app.history2.push({lat: app.pt[0], lng: app.pt[1]});

    // Add listeners

    app.marker.on('dragend', function (ev) {
        var timestamp = new Date();
        var timestr = app.leftPad(timestamp.getHours(), 2) + ':' + app.leftPad(timestamp.getMinutes(), 2) + ':' + app.leftPad(timestamp.getSeconds(), 2);
        var coords = ev.target._latlng;

        app.handleMove(coords);
    });

    var touch = ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch;
    var evt = (touch) ? 'touchstart' : 'click';
    console.log('touch =', touch, 'evt =', evt);

    document.getElementById('fence-btns').addEventListener(evt, app.updateFence);
    document.getElementById('watch').addEventListener(evt, app.toggleWatch);
    document.getElementById('clear').addEventListener(evt, app.clearHistory);
    document.getElementById('export').addEventListener(evt, app.exportCSV);
    document.getElementById('email').addEventListener(evt, app.emailCSV);

    document.getElementById('log').addEventListener('click', function (ev) {
        if (ev.target.dataset['lat'] && ev.target.dataset['lng']) {
            app.map.panTo([ev.target.dataset['lat'], ev.target.dataset['lng']]);
        }
    });
};

app.updateFence = function (ev) {
    console.info('app.updateFence:');

    if (ev.target.tagName != 'A') {
        return;
    }

    var pt, pts;
    if (ev.target.dataset['center'] && ev.target.dataset['points']) {
        pt = JSON.parse(ev.target.dataset['center']);
        pts = JSON.parse(ev.target.dataset['points']);
    }
    else {
        pt = JSON.parse(document.getElementById('custom-center').value);
        pts = JSON.parse(document.getElementById('custom-points').value);
    }

    app.polygon.setLatLngs(pts);
    //app.rectangle.setLatLngs(app.polygon.getBounds()); // BUG: rectangle disappears!
    app.marker.setLatLng(pt);
    app.map.panTo(pt);

    app.map.fitBounds(app.polygon.getBounds());
/*
    if (app.layer2) {
        app.layer2.clearLayers();
    }
*/
    app.lastStatus = '';

    app.history2 = [];
    app.history2.push({lat: pt[0], lng: pt[1]});
};

app.clearHistory = function () {
    console.info('app.clearHistory:');

    app.history = [];
    app.history2 = [];
    app.lastStatus = '';

    document.getElementById('stat_timestamp').innerHTML = '';
    document.getElementById('stat_latitude').innerHTML = '';
    document.getElementById('stat_longitude').innerHTML = '';
    document.getElementById('stat_speed').innerHTML = '';
    document.getElementById('stat_distance').innerHTML = '';
    document.getElementById('stat_altitude').innerHTML = '';
    document.getElementById('stat_heading').innerHTML = '';
    document.getElementById('stat_accuracy').innerHTML = '';
    document.getElementById('stat_geofence').innerHTML = '';

    document.getElementById('log').innerHTML = '';

    //localStorage.setItem(app.geodataID, '');

    if (app.layer2) {
        app.layer2.clearLayers();
    }
};

app.emailCSV = function () {
    var email = document.getElementById('email-to').value,
        emailList = email.split(','),
        subject = document.getElementById('email-subject').value,
        body = document.getElementById('export-csv').innerHTML;

    console.log(email, emailList, subject, body);

    if (window.blackberry) {
        blackberry.invoke.card.invokeEmailComposer({
            subject: subject,
            body: body,
            to: emailList
            //cc: ["c@c.ca, d@d.com"],
            //attachment: ["/path/to/an/attachment.txt", "path/to/another/attachment.txt"]
        }, function (done) {
            console.log(done);
        }, function (cancel) {
            console.log(cancel);
        }, function (invokeError) {
            console.log(invokeError);
        });
    }
    else {
        window.location = "mailto:" + email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }
};

app.exportCSV = function () {
    console.info('app.exportCSV:');
    document.getElementById('export-csv').innerHTML = localStorage.getItem(app.geodataID);
};

app.sendAlert = function (str) {
    if (app.serverAlert !== true) {
        return;
    }

    console.info('app.sendAlert:', str);

    // Use Ajax if this is a WebWorks app
    if (window.blackberry) {
        console.log('Using Ajax...');
        var xhr = new XMLHttpRequest();

        xhr.onload = function () {
            if (xhr.readyState === xhr.DONE) {
                if (xhr.status === 200 && xhr.response) {
                    console.log('Server response:', xhr.response);
                }
            }
        };

        xhr.onerror = function (err) {
            console.warn(err.target.status);
        };

        xhr.open('POST', app.serverUrl, true);
        //xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.send('?data=' + str);
    }
    // Use JSONP to get around cross-site scripting
    else {
        console.log('Using JSONP...');
        FlyJSONP.post({
            url: app.serverUrl,
            parameters: {
                data: str
            },
            success: function (data) {
                console.log('Server response:', data);
            }
        });
    }
};

app.checkGeoFence = function (lat, lng, timestamp) {
    console.info('app.checkGeoFence:');

    var res;

    // use "contains" method -- not accurate -- returns bounding box of polygon
    //res = app.polygon.getBounds().contains(L.latLng(lat, lng));

    // use "leafletPip" library -- accurate
    var gjLayer = L.geoJson(app.polygon.toGeoJSON());
    res = leafletPip.pointInLayer([lng, lat], gjLayer);

    var status = 'inside';
    var statusColor = 'green';
    var sndFile = 'sfx/female_hello.mp3';

    if (res.length === 0 || res === false) {
        status = 'outside';
        statusColor = 'red';
        sndFile = 'sfx/female_goodbye.mp3';
    }

    document.getElementById('stat_geofence').innerHTML = '<span style="color: ' + statusColor + '">' + status + '</span>';

    if (status !== app.lastStatus) {
        // Play sound
        document.getElementById('snd').pause();
        document.getElementById('snd').src = sndFile;
        document.getElementById('snd').play();

        // Send alert text
        var jsonStr = '{';
        jsonStr += 'id:' + 'demo' + ',';
        jsonStr += 'timestamp:' + timestamp.getTime() + ',';
        jsonStr += 'status:' + status + ',';
        jsonStr += 'latitude:' + lat + ',';
        jsonStr += 'longitude:' + lng + '';
        jsonStr += '}';

        app.sendAlert(jsonStr);
    }

    console.log(status);
    return status;
};

app.handleMove = function (coords) {
    console.info('app.handleMove:');

    var timestamp = new Date();
    var timestr = app.leftPad(timestamp.getHours(), 2) + ':' + app.leftPad(timestamp.getMinutes(), 2) + ':' + app.leftPad(timestamp.getSeconds(), 2);
    var ts = timestamp.getFullYear() + '/' + app.leftPad(timestamp.getMonth() + 1, 2) + '/' + app.leftPad(timestamp.getDate(), 2) + ' ' + app.leftPad(timestamp.getHours(), 2) + ':' + app.leftPad(timestamp.getMinutes(), 2) + ':' + app.leftPad(timestamp.getSeconds(), 2);

    document.getElementById('stat_timestamp').innerHTML = ts;
    document.getElementById('stat_latitude').innerHTML = coords.lat.toFixed(6);
    document.getElementById('stat_longitude').innerHTML = coords.lng.toFixed(6);

    var status = app.checkGeoFence(coords.lat, coords.lng, timestamp);
    var statusColor = (status == 'inside') ? 'green' : 'red';

    app.lastStatus = status;

    if (app.history2.length > 0) {
        var d = app.calculateDistance(app.history2[app.history2.length - 1].lat, app.history2[app.history2.length - 1].lng, coords.lat, coords.lng);
        app.dist += parseFloat(d);
        document.getElementById('stat_distance').innerHTML = app.dist.toFixed(2) + ' km';
    }

    if (app.history2.length === 1) {
        var lastItem = app.history2[app.history2.length - 1];
        var latlngs = [L.latLng(lastItem.lat, lastItem.lng), L.latLng(coords.lat, coords.lng)];

        app.polyline = L.polyline(latlngs, {
            color: '#0000FF',
            opacity: 0.8
        });

        app.layer2 = L.layerGroup([app.polyline]);
        app.layer2.addTo(app.map);
    }
    else if (app.history2.length > 1) {
        app.polyline.addLatLng(L.latLng(coords.lat, coords.lng), {
            color: '#0000FF',
            opacity: 0.8
        });

        app.layer2 = L.layerGroup([app.polyline]);
        app.layer2.addTo(app.map);
    }

    app.history2.push({
        lat: coords.lat,
        lng: coords.lng
    });

    document.getElementById('log').innerHTML += '<span data-lat="' + coords.lat + '" data-lng="' + coords.lng + '">' + timestr + ': <span style="color: ' + statusColor + '">[' + coords.lat.toFixed(6) + ', ' + coords.lng.toFixed(6) + ']</span></span><br>';

    app.marker.setPopupContent('<b>' + app.marker.getLatLng().lat.toFixed(6) + ', ' + app.marker.getLatLng().lng.toFixed(6) + '</b><br>');
};

app.handleWatch = function (position) {
    console.info('app.handleWatch:');

    var txt = '';
    var log = '';
    var timestamp = new Date();
    var timestr = app.leftPad(timestamp.getHours(), 2) + ':' + app.leftPad(timestamp.getMinutes(), 2) + ':' + app.leftPad(timestamp.getSeconds(), 2);

    var coords = position.coords;

    if (coords.accuracy > app.accuracyThreshold) {
        console.warn('Poor accuracy!', coords.accuracy);
        log += '<span data-lat="' + coords.latitude + '" data-lng="' + coords.longitude + '" style="color: red; text-decoration: line-through;">' + timestr + ': ' + coords.latitude.toFixed(6) + ', ' + coords.longitude.toFixed(6) + ' (' + coords.accuracy + ')' + '</span><br>';
        document.getElementById('log').innerHTML += log;
        return;
    }

    var status = app.checkGeoFence(coords.latitude, coords.longitude, timestamp);

    app.lastStatus = status;

    if (app.history.length === 1) {
        var lastItem = app.history[app.history.length - 1].coords;
        var latlngs = [L.latLng(lastItem.latitude, lastItem.longitude), L.latLng(coords.latitude, coords.longitude)];

        app.polyline = L.polyline(latlngs, {
            color: '#0000FF',
            opacity: 0.8
        });

        app.layer2 = L.layerGroup([app.polyline]);
        app.layer2.addTo(app.map);
    }
    else if (app.history.length > 1) {
        app.polyline.addLatLng(L.latLng(coords.latitude, coords.longitude), {
            color: '#0000FF',
            opacity: 0.8
        });

        app.layer2 = L.layerGroup([app.polyline]);
        app.layer2.addTo(app.map);
    }

    app.marker.setLatLng([coords.latitude, coords.longitude]);

    app.map.panTo([coords.latitude, coords.longitude]);

    if (app.history.length > 0) {
        var d = app.calculateDistance(app.history[app.history.length - 1].coords.latitude, app.history[app.history.length - 1].coords.longitude, coords.latitude, coords.longitude);
        app.dist += parseFloat(d);
    }

    var ts = timestamp.getFullYear() + '/' + app.leftPad(timestamp.getMonth() + 1, 2) + '/' + app.leftPad(timestamp.getDate(), 2) + ' ' + app.leftPad(timestamp.getHours(), 2) + ':' + app.leftPad(timestamp.getMinutes(), 2) + ':' + app.leftPad(timestamp.getSeconds(), 2);

    var lat = coords.latitude.toFixed(6);
    var lng = coords.longitude.toFixed(6);
    var accuracy = (coords.accuracy) ? coords.accuracy : ''; // accuracy is in meters
    var heading = (coords.heading) ? coords.heading.toFixed(0) : '';
    var speed = (coords.speed) ? (coords.speed * 3.6).toFixed(0) : 0; // speed is m/s, multiply by 3.6 for km/h or 2.23693629 for mph
    var speed_km = (coords.speed) ? speed + ' km/h' : '';
    var distance = (app.dist) ? app.dist.toFixed(2) : 0;
    var distance_km = (app.dist) ? distance + ' km' : '';
    var altitude = (coords.altitude) ? coords.altitude.toFixed(0) : '';

    var elapsedTime = app.msToTime(timestamp - app.startTime);

    document.getElementById('stat_timestamp').innerHTML = ts;
    document.getElementById('stat_latitude').innerHTML = lat;
    document.getElementById('stat_longitude').innerHTML = lng;
    document.getElementById('stat_speed').innerHTML = speed_km;
    document.getElementById('stat_distance').innerHTML = distance;
    document.getElementById('stat_altitude').innerHTML = altitude;
    document.getElementById('stat_heading').innerHTML = heading;
    document.getElementById('stat_accuracy').innerHTML = accuracy;
    document.getElementById('stat_elapsed').innerHTML = elapsedTime;

    // Adjust zoom level based on speed
    if (speed === 0) {
        // do nothing
    }
    else if (speed > 0 && speed < 15) {
        app.map.setZoom(18); // ~30m
    }
    else if (speed >= 15 && speed < 30) {
        app.map.setZoom(17); // ~50m
    }
    else if (speed >= 30 && speed < 60) {
        app.map.setZoom(16); // ~100m
    }
    else if (speed >= 60 && speed < 90) {
        app.map.setZoom(15); // ~300m
    }
    else if (speed >= 90 && speed < 120) {
        app.map.setZoom(14); // ~500m
    }
    else if (speed >= 120 && speed < 150) {
        app.map.setZoom(13); // ~1km
    }
    else if (speed >= 150 && speed < 180) {
        app.map.setZoom(12); // ~2km
    }
    else if (speed >= 180 && speed < 260) {
        app.map.setZoom(11); // ~5km
    }
    else {
        app.map.setZoom(10); // ~10km
    }

    log += '<span data-lat="' + lat + '" data-lng="' + lng + '">' + timestr + ': ' + lat + ', ' + lng + ' (' + accuracy + ')' + '</span><br>';

    document.getElementById('log').innerHTML += log;

    //txt = timestamp.getTime() + ',' + coords.latitude + ',' + coords.longitude + ',' + coords.accuracy + ',' + coords.heading + ',' + coords.speed + ',' + app.dist + ',' + coords.altitude  + ',' + status + "\n";
    txt = timestamp.getTime() + ',' + lat + ',' + lng + ',' + accuracy + ',' + heading + ',' + speed + ',' + distance + ',' + altitude  + ',' + status + "\n";
    app.appendToStorage(app.geodataID, txt);

    app.marker.setPopupContent('<b>' + app.marker.getLatLng().lat.toFixed(6) + ', ' + app.marker.getLatLng().lng.toFixed(6) + '</b><br>');

    app.history.push(position);
};

app.toggleWatch = function (ev) {
    console.info('app.toggleWatch:');

    app.history = [];
    app.history2 = [];
    app.dist = 0.0;

    var res;

    if (ev.target.innerText == 'Start') {
        var timestamp = new Date();
        var timestr = timestamp.getFullYear() + '' + app.leftPad(timestamp.getMonth() + 1, 2) + '' + app.leftPad(timestamp.getDate(), 2) + '-' + app.leftPad(timestamp.getHours(), 2) + '' + app.leftPad(timestamp.getMinutes(), 2) + '' + app.leftPad(timestamp.getSeconds(), 2);

        app.startTime = timestamp;

        if (window.blackberry && community && community.preventsleep) {
            res = community.preventsleep.setPreventSleep(true);
            console.log(res);
            document.getElementById('stat_screen').innerHTML = 'on';
        }
        else {
            document.getElementById('stat_screen').innerHTML = '';
        }

        app.watchID = navigator.geolocation.watchPosition(app.handleWatch, function (err) {
            console.warn('watchPosition error:', err);
        }, {
            enableHighAccuracy: true,
            maximumAge: 1500,
            timeout: 3000
        });

        ev.target.innerText = 'Stop';
    }
    else {
        if (window.blackberry && community && community.preventsleep) {
            res = community.preventsleep.setPreventSleep(false);
            console.log(res);
            document.getElementById('stat_screen').innerHTML = 'timeout';
        }

        navigator.geolocation.clearWatch(app.watchID);

        ev.target.innerText = 'Start';
    }
};

app.updateZoom = function () {
    //console.info('app.updateZoom:');
    document.getElementById('stat_zoom').innerHTML = app.map.getZoom() + ' / ' + app.map.getMaxZoom();
};

//----------------------------------------------------------------------------

Number.prototype.toRad = function () {
    return this * Math.PI / 180;
};

app.calculateDistance = function (lat1, lng1, lat2, lng2) {
    //console.info('app.calculateDistance:');
    //console.log('lat1=', lat1, 'lng1=', lng1, 'lat2=', lat2, 'lng2=', lng2);

    var R = 6371; // radius of the Earth in km
    var dLat = (lat2 - lat1).toRad();
    var dLng = (lng2 - lng1).toRad();
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;

    //console.log(d);
    return d;
};

app.msToTime = function (duration) {
    var milliseconds = parseInt((duration % 1000) / 100, 10),
        seconds = parseInt((duration / 1000) % 60, 10),
        minutes = parseInt((duration / (1000 * 60)) % 60, 10),
        hours = parseInt((duration / (1000 * 60 * 60)) % 24, 10);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
};

app.appendToStorage = function (name, data) {
    console.info('app.appendToStorage:');

    try {
        var item = localStorage.getItem(name);
        if (item === null) {
            item = "";
        }

        localStorage.setItem(name, item + data);
    }
    catch (ex) {
        console.warn(ex.message);
        for (var p in ex) {
            console.log("\t" + p + ': ' + ex[p]);
        }
    }
};

app.leftPad = function (value, padding) {
    //console.info('app.leftPad:');

    var zeroes = "0";

    for (var i = 0; i < padding; i++) {
        zeroes += "0";
    }

    return (zeroes + value).slice(padding * -1);
};
