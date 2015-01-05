function headerViewModel() {
    var self = this;
    self.years = ko.observableArray().subscribeTo("years");
    self.selectedYear = ko.observable().syncWith("selectedYear");
    self.address = ko.observable();
    self.searchType = ko.observable().syncWith("searchType");
    self.legend = ko.observableArray([]).subscribeTo("legend");
    

    self.reset = function () {
        require([
"ViewModel/MapViewModel.js"
        ], function (mapmodule) {
            mapmodule.reset();
        });
    }
    self.search = function () {
        self.searchType("parcel");
        require([
     "ViewModel/MapViewModel.js"
        ], function (mapmodule) {
            mapmodule.getParcel(self.address());
        });
    }
}

var headerVM = new headerViewModel();



ko.applyBindings(headerVM, document.getElementById("header"));