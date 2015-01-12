var known_latlng = {
  'airport' : {
    'IAD' : new google.maps.LatLng(38.9531162, -77.45653879999998),
    'TAV' : new google.maps.LatLng(40.982989, 28.810442),
    'ATH' : new google.maps.LatLng(37.935647, 23.948416),
    'DUB' : new google.maps.LatLng(53.426448, -6.24991),
    'LHR' : new google.maps.LatLng(51.470022, -0.454296),
    'ARN' : new google.maps.LatLng(59.649762, 17.923781),
    'STR' : new google.maps.LatLng(48.687636, 9.205576),
    'SVQ' : new google.maps.LatLng(37.420167, -5.89305),
    'CMN' : new google.maps.LatLng(32.3020274, -7.5793184),
    'CPT' : new google.maps.LatLng(-33.971463, 18.602085),
    'JNB' : new google.maps.LatLng(-26.136673, 28.241146),
    'BOM' : new google.maps.LatLng(19.090177, 72.868739),
    'UIO' : new google.maps.LatLng(-0.113333, -78.358611),
    'SJO' : new google.maps.LatLng(9.998238, -84.20408),
    'SIN' : new google.maps.LatLng(1.36442, 103.991531),
    'BKK' : new google.maps.LatLng(13.689999, 100.750112),
    'PNH' : new google.maps.LatLng(11.546111, 104.84778),
    'SGN' : new google.maps.LatLng(10.818463, 106.658825),
    'AKL' : new google.maps.LatLng(-37.008248, 174.785036),
    'PUQ' : new google.maps.LatLng(-53.00354, -70.8528),
    'SCL' : new google.maps.LatLng(-33.392889,-70.794145),
    'EZE' : new google.maps.LatLng(-34.815004, -58.534828),
    'MVD' : new google.maps.LatLng(-34.837778,-56.030278),
    'GRU' : new google.maps.LatLng(-23.434553,-46.478126),
    'LIM' : new google.maps.LatLng(-12.024053,-77.112036),
    'HND' : new google.maps.LatLng(35.549393,139.779839),
    'SHA' : new google.maps.LatLng(31.144344,121.808273),
    'ULN' : new google.maps.LatLng(47.844415,106.769874),
  },
  'place' : {
    'Galapagos' : new google.maps.LatLng(-0.3839569,-90.4513206),
  }
};

var flightPlanCoordinates = [
  { name: "Home", latlng: known_latlng.airport["IAD"], air: true},
  { name: "Turkey", latlng: known_latlng.airport["TAV"], air: true },
  { name: "Greece", latlng: known_latlng.airport["ATH"], air: true },
  { name: "Ireland", latlng: known_latlng.airport["DUB"], air: true },
  { name: "United Kingdom", latlng: known_latlng.airport["LHR"], air: false },
  { name: "Sweden", latlng: known_latlng.airport["ARN"], air: false },
  { name: "Germany", latlng: known_latlng.airport["STR"], air: false },
  { name: "Spain", latlng: known_latlng.airport["SVQ"], air: false },
  { name: "Morocco", latlng: known_latlng.airport["CMN"], air: true },
  { name: "Spain", latlng: known_latlng.airport["SVQ"], air: false },
  { name: "Johannesburg, SA", latlng: known_latlng.airport["JNB"], air: true },
  { name: "Mumbai, India", latlng: known_latlng.airport["BOM"], air: true },
  { name: "Singapore", latlng: known_latlng.airport["SIN"], air: true },
  { name: "Thailand", latlng: known_latlng.airport["BKK"], air: true },
  { name: "Cambodia", latlng: known_latlng.airport["PNH"], air: true },
  { name: "Vietnam", latlng: known_latlng.airport["SGN"], air: true },
  { name: "New Zealand", latlng: known_latlng.airport["AKL"], air: true },
  { name: "Costa Rica", latlng: known_latlng.airport["SJO"], air: true },
  { name: "Ecuador", latlng: known_latlng.airport["UIO"], air: true },
  { name: "Galapagos", latlng: known_latlng.place["Galapagos"], air: false },
  { name: "Ecuador", latlng: known_latlng.airport["UIO"], air: false },
  { name: "Punta Arenas", latlng: known_latlng.airport["PUQ"], air: true },
  { name: "Santiago, Chile", latlng: known_latlng.airport["SCL"], air: true },
  { name: "Argentina", latlng: known_latlng.airport["EZE"], air: true },
  { name: "Uruguay", latlng: known_latlng.airport["MVD"], air: false },
  { name: "Brazil", latlng: known_latlng.airport["GRU"], air: true },
  { name: "Peru", latlng: known_latlng.airport["LIM"], air: true },
  { name: "Japan", latlng: known_latlng.airport["HND"], air: true },
  { name: "China", latlng: known_latlng.airport["SHA"], air: true },
  { name: "Mongolia", latlng: known_latlng.airport["ULN"], air: true },
  { name: "Home", latlng: known_latlng.airport["IAD"], air: true },
];
  
var flightPath;
var map;
function marker(name, latlng) {
  return new google.maps.Marker({
    position: latlng,
    map: map,
    title:name,
    icon: 'images/beachflag.png'
  });
}

function initialize() {
 var mapOptions = {
    zoom: 2,
    center: new google.maps.LatLng(7, 40),
    disableDefaultUI: true,
    zoomControl: false,
    scrollwheel: false,
    navigationControl: false,
    mapTypeControl: false,
    scaleControl: false,
    draggable: false,
    mapTypeId: google.maps.MapTypeId.TERRAIN
  };

  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  var interpolate = google.maps.geometry.spherical.interpolate;

  for(i=0; i<flightPlanCoordinates.length; i++) {
    marker("" + (i+1) + ": " + flightPlanCoordinates[i].name,
           flightPlanCoordinates.latlng).setMap(map);
    if(i > 0) {
      flightPath = new google.maps.Polyline({
        path: [ flightPlanCoordinates[i-1].latlng,
                flightPlanCoordinates[i].latlng ],
        strokeColor: flightPlanCoordinates[i].air ? '#33a' : '#9a8',
        strokeOpacity: 0.8,
        strokeWeight: 2
      });

      flightPath.setMap(map);
    }
  }
}

google.maps.event.addDomListener(window, 'load', initialize);

