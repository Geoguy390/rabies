function DataViewModel() {
    var self = this;
    self.dataSummary = ko.observableArray();
    self.selectedYear = ko.observable().syncWith("selectedYear");
    self.counts = ko.observableArray();
    
}

var server = "http://maps.bouldercounty.org/"
var dataVM = new DataViewModel();

dataVM.selectedYear.subscribe(function (selectedYear) {
    $.ajax({
        url: server + "dataservices/rabiesdata/api/count/" + selectedYear,
        type: "get",
        timeout: 10000,
        success: function (data, text, jqXHR) {
            dataVM.counts(data);
            require([
                 "ViewModel/MapViewModel.js"
                ], function (mapmodule) {
                    mapmodule.getMapData(selectedYear);

                  });
        },
        error: function (jqXHR, textStatus, errorThrown) {
            alert("Sorry, we had problems getting the counts.  Please reload and try again.");
        }
    });
});

ko.applyBindings(dataVM, document.getElementById("data"));