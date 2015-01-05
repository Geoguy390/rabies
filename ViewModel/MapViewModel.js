function mapViewModel() {
    var self = this;
    self.years = ko.observableArray([2006, 2007, 2008, 2009, 2010, 2012, 2013, 2014]).syncWith("years");
    self.selectedYear = ko.observable(2014).syncWith("selectedYear");
    self.searchType = ko.observable().syncWith("searchType");
    self.incidents = ko.observableArray();
    self.legend = ko.observableArray().publishOn("legend");
    self.firstTime = ko.observable(true);

    self.close = function(){
	$("#splash").close();
    }

}

var mapVM = new mapViewModel();

var map;
var popup;
var host = "http://maps.bouldercounty.org/";
var template;
var includeInactives = false;
var animalLayer;
var initialExtent;
var dialog;
var cursor;
var rabiesPoints = new Array();
var server = "http://maps.bouldercounty.org/"



define(["esri/map", "esri/InfoTemplate", "esri/geometry/Point", "esri/layers/GraphicsLayer", "esri/tasks/GeometryService", "esri/layers/FeatureLayer", "esri/layers/ArcGISTiledMapServiceLayer", "esri/layers/ArcGISDynamicMapServiceLayer", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol", "esri/Color", "esri/symbols/PictureMarkerSymbol", "esri/geometry/Extent", "esri/SpatialReference",
     "esri/graphic", "esri/renderers/UniqueValueRenderer", "esri/tasks/query", "esri/tasks/QueryTask", "dojo/_base/Color", "esri/tasks/IdentifyTask", "esri/tasks/IdentifyParameters",
     "dojo/dom-construct", "dijit/TooltipDialog", "dojo/on", "esri/lang", "dijit/popup", "dojo/domReady!"],
     function (Map, InfoTemplate, Point, GraphicsLayer, GeometryService, FeatureLayer, TiledService, DynamicService, SimpleMarkerSymbol,
      SimpleLineSymbol, SimpleFillSymbol, Color, PictureMarkerSymbol, Extent, SpatialReference, Graphic, UniqueValueRenderer, Query, QueryTask,
      Color, IdentifyTask, IdentifyParameters, domConstruct, TooltipDialog, on, esriLang, dijitPopup, DomConstruct) {
         //add map  
         function buildMap() {
             initialExtent = new Extent({ "xmin": 2904299, "ymin": 1199120, "xmax": 3154299, "ymax": 1357974, "spatialReference": { "wkid": 2876 } });
             map = new esri.Map("map", { extent: initialExtent, logo: false, sliderStyle: "small" });
             map.logo = false;

             dialog = new TooltipDialog({
                 id: "tooltipDialog",
                 showDelay: 1000,
                 style: "position: absolute; width: 250px; height:0px; font: normal normal normal 10pt Helvetica;z-index:100"
             });
             dialog.startup();

             //add county image
             var countyImage = new TiledService
        (host + "ArcGIS/rest/services/Emap/BOCO_Imagery2010/MapServer", { id: "countyImage", opacity: 0 });
             map.addLayer(countyImage);

             var posLayer = new TiledService
        (host + "ArcGIS/rest/services/Emap/BOCO_BaseMap/MapServer");
             map.addLayer(posLayer);

             var parcelLayer = new DynamicService(host + "/ArcGIS/rest/services/Emap/BOCO_Parcels/MapServer");
             map.addLayer(parcelLayer);

	    

             animalLayer = new GraphicsLayer({ id: 'animalLayer'});
             map.addLayer(animalLayer);

	     animalLayer.on("mouse-over", function (evt){
		var animalInfo = ("<div style='width:200px'><b>${block}</b></div><div><b>${date}</b></div>");
                var content = esriLang.substitute(evt.graphic.attributes, animalInfo);
		dialog.setContent(content);
                dijitPopup.open({
                     popup: dialog,
                     x: evt.pageX,
                     y: evt.pageY,
                     offsetX: 15,
                     offsetY: 15
                 });

	     });

             animalLayer.on("mouse-out", closeDialog);
             getYears();

         }

 function closeDialog() {
             dijitPopup.close();
         }


         //returns the years from the data to populate the years dropdown list
         function getYears() {
             $.ajax({
                 url: server + "dataservices/rabiesdata/api/year",
                 type: "get",
                 timeout: 10000,
		 dataType: "jsonp",
                 success: function (data, text, jqXHR) {
                     mapVM.years(data);
                     mapVM.selectedYear(2014);
                     getMapData(2014);
                 },
                 error: function (jqXHR, textStatus, errorThrown) {
                     console.log("Sorry, we had a problem getting data.  Please reload and try again.");
                 }
             });
         }

         //gets the rabies incident data from the database and starts the processing
         function getMapData(year) {
	     rabiesPoints.length = 0;
           
             if (mapVM.firstTime() == false) {
                 var url = "http://maps.bouldercounty.org/ArcGIS/rest/services/Geometry/GeometryServer"
                 var geoService = new GeometryService(url);
		 var dataType = "json";
		 var isIE11 = !!navigator.userAgent.match(/Trident.*rv[ :]*11\./)
		 if(isIE11){	
		     dataType = "json";
		 }
                 $.ajax({
                     url: server + "dataservices/rabiesdata/api/incident/" + year,
                     type: "get",
		     dataType: dataType,
                     timeout: 10000,
                     success: function (data, text, jqXHR) {
                         processAttributes(data);
                         animalLayer.clear();
                         mapVM.incidents(data);
                         cursor = 0;
                         mapVM.searchType("year");
                         var geoms = new Array();
                         for (var i = 0; i < data.length; i++)
                             geoms.push(new Point(data[i].X, data[i].Y, new SpatialReference({ wkid: 4326 })));

                         geoService.project(geoms, map.spatialReference, function (points) {
                             processPoints(points);
                         });



                     },
                     error: function (jqXHR, textStatus, errorThrown) {
                         console.log("Sorry, we had an error getting data.  Please try again");
                     }
                 });
             }
             else
                 mapVM.firstTime(false);
	     
	     
         }

	function processAttributes(data){
	   for(var i = 0; i < data.length; i++){
	      var att = new Object();
	      att.block = toBlock(data[i].Address);
	      att.date = new Date(data[i].IncidentDate).toLocaleDateString();
	      att.animal = data[i].Animal;
	      rabiesPoints.push(att);
	   }
	}

	function toBlock(address){
	    var split = address.split(" ");
	    var block = Number($.trim(split[0]));
	    if(isNaN(block) != true){
	    	block = Math.floor(block * 0.01) * 100;
 		return block + " block of " + buildAddress(split);
	    }
	    else
		return address;
	}

	function buildAddress(split){
           var street = "";
	   for(var i = 1; i < split.length; i++){
	     
	      if($.trim(split[i].toLowerCase()) == "apt")
                  break;
	      if(split[i] != "")
	         street += split[i] + " ";
              
           }
	   return street;

	}

         //gets the parcel given the address
         function getParcel(address) {
	     $("#splash").show(200);
             var url = server + "dataservices/locationservices/api/location/?searchTerm=" + address + "&searchType=Address";
             url = url.replace(/ /g, "%20");

             $.ajax({
                 url: url,
                 type: "get",
                 timeout: 10000,
		 dataType: "jsonp",
                 success: function (data, text, jqXHR) {
                     getParcelGraphic(data.ParcelNo, mapVM.searchType());
                 },
                 error: function (jqXHR, textStatus, errorThrown) {
                     //console.log("error getting adress: " + errorThrown);
		     alert("Sorry, but location could not be found.  Please try again");
 			$("#splash").hide(200);
                 }
             });
         }

         //query the parcel graphic from the gis
         function getParcelGraphic(parcelNum, type) {
             var url = host + "ArcGIS/rest/services/Emap/BOCO_Parcels/MapServer/0";
             map.graphics.clear();
             var query = new Query();
             var queryTask = new QueryTask(url);
             query.where = "PARCEL_NO = '" + parcelNum + "'";
             query.returnGeometry = true;

             //the first is for locating a parcel to zoom to (address search).  The second is to locate the point where the marker is to go.
             if (type == "parcel")
                 queryTask.execute(query, showParcel, queryError);
             else
                 queryTask.execute(query, showPoint, queryError);
         }

         function processPoints(points) {
             var captions = new Array();
             for (var i = 0; i < rabiesPoints.length; i++) {
                 var point = new Point(points[i].x, points[i].y, map.spatialReference);
                 var marker = new PictureMarkerSymbol(getAnimalMarker(rabiesPoints[i].animal), 35, 35);
                 if ($.inArray(rabiesPoints[i].animal, captions) == -1)
                     captions.push(rabiesPoints[i].animal);
                 var graphic = new Graphic(point, marker, rabiesPoints[i]);
                 animalLayer.add(graphic);
             }
             getLegend(captions);
         }

         function getLegend(captions) {
             var legend = new Array();
             for (var i = 0; i < captions.length; i++) {
                 var detail = new Object();
                 detail.caption = captions[i];
                 detail.url = getAnimalMarker(captions[i]);
                 legend.push(detail);
             }
             mapVM.legend(legend);
         }

         //places the point on the map.
         function showPoint(featureSet) {
             if (featureSet.features.length == 1) {
                 var gsvc = new GeometryService(host + "/ArcGIS/rest/services/Geometry/GeometryServer");
                 var geom = new Array(featureSet.features[0].geometry);
                 gsvc.labelPoints(geom, function (points) {
                     var interiorPoint = points[0];
                     var marker = getAnimalMarker(rabiesPoints.animal);
                     var graphic = new Graphic(interiorPoint, marker);
                     animalLayer.add(graphic);
                 });
             }
         }

         //identfies the desired marker.
         function getAnimalMarker(animal) {
             //var data = mapVM.incidents()[cursor];
             var url = undefined;
             switch (animal) {
                 case "Bat":
                     url = server + "rabies/icons/bat.png"
                     break;
                 case "Cat":
                     url = server + "rabies/icons/cat.png"
                     break;
                 case "Cow":
                     url = server + "rabies/icons/cow.png"
                     break;
                 case "Coyote":
                     url = server + "rabies/icons/coyote.png"
                     break;
                 case "Dog":
                     url = server + "rabies/icons/dog2.png"
                     break;
                 case "Fox":
                     url = server + "rabies/icons/fox.png"
                     break;
                 case "Horse":
                     url = server + "rabies/icons/horse.png"
                     break;
                 case "Monkey":
                     url = server + "rabies/icons/monkey.png"
                     break;
                 case "Raccoon":
                     url = server + "rabies/icons/raccoon.png"
                     break;
                 case "Skunk":
                     url = server + "rabies/icons/skunk.png"
                     break;
             }
            

             return url;
         }

         //locates the parcel to zoom to 
         function showParcel(featureSet) {
             var parcel = featureSet.features[0];
             var parcelSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT,
                new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]));
             var graphic = new Graphic(parcel.geometry, parcelSymbol);
             map.graphics.add(graphic);
             map.setExtent(parcel.geometry.getExtent().expand(16));
	     $("#splash").hide(200);
         }

         function reset() {
             map.setExtent(initialExtent);
         }

         function queryError(data) {
             console.log(data);
         }

         return {
             buildMap: buildMap,
             getMapData: getMapData,
             getParcel: getParcel,
             reset: reset

         }
     });



ko.applyBindings(new mapViewModel(), document.getElementById("map"));