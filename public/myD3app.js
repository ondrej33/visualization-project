//variable containing reference to data
var data;

//D3.js canvases
var mainArea;
var titleArea;
var usMapArea;
var usMapOptionsArea;
var usMapStatsArea;

var zoomArea;
var state1MapArea;
var state1DropMenuArea;
var state1StatsArea;
var state1PieChartArea;
var state2MapArea;
var state2DropMenuArea;
var state2StatsArea;
var state2PieChartArea;
var statesAttributesMenuArea;

//D3.js svg elements
//TODO
var selectedAreaText;

//variables for selection
var selectedState;
var previousSelectedState;

//variables for precomputed values
//TODO

/*Loading data from CSV file and editing the properties to province codes. Unary operator plus is used to save the data as numbers (originally imported as string)*/
// TODO: load data
/*
d3.csv("./public/criminality.csv")
  .row(function (d) {
    return {
      date: d["Time Unit"],
      Czech_Republic: +d["Average"],
      Central_Bohemia_Region: +d["Central Bohemia Region"],
      South_Bohemian_Region: +d["South Bohemian Region"],
      Pilsen_Region: +d["The Pilsen Region"],
      Usti_Region: +d["The Ústí Region"],
      Hradec_Kralove_Region: +d["Hradec Králové Region"],
      Southern_Moravia_Region: +d["Southern Moravia Region"],
      Moravia_Silesia_Region: +d["Moravian- Silesian Region"],
      Olomouc_Region: +d["The Olomouc Region"],
      Zlin_Region: +d["Zlín Region"],
      Vysocina_Region: +d["Vysočina Region"],
      Pardubice_Region: +d["The Pardubice Region"],
      Liberec_Region: +d["Liberec Region"],
      Karlovy_Vary_Region: +d["Karlovy Vary Region"],
      City_of_Prague: +d["City of Prague"]
    };
  }).get(function (error, rows) {
    //saving reference to data
    data = rows;

    //load map and initialise the views
    init();

    // data visualization
    visualization();
  });
*/
init();
visualization();

/*----------------------
INITIALIZE VISUALIZATION
----------------------*/
function init() {

  let width = screen.width;
  let height = screen.height;

  // TODO: init selections
  // selectedRegion = 'Czech_Republic'
  // previousSelectedRegion = 'Czech_Republic'

  //retrieve an SVG file via d3.request, 
  //the xhr.responseXML property is a document instance
  function responseCallback(xhr) {
    d3.select("#us_map_div").append(function () {
      return xhr.responseXML.querySelector('svg');
    }).attr("id", "map")
      .attr("width", width / 2)
      .attr("height", height / 2)
      .attr("x", 0)
      .attr("y", 0);
  };

  // Select the root <svg> and append it directly
  d3.request("public/us_map.svg")
    .mimeType("image/svg+xml")
    .response(responseCallback)
    .get(function (n) {
      let map = d3.select("body").select("#map");
      map.selectAll("path")
        .style("fill", "lightgray")
        .style("stroke", "gray")
        .style("stroke-width", 3)
        .on("click", function () {
          mapClick(this.id);
        });
    });

  
  
  console.log(d3.select("#title_div").node().clientHeight);
  //TODO: d3 canvases for svg elements
  titleArea = d3.select("#title_div").append("svg")
    .attr("width", d3.select("#title_div").node().clientWidth)
    .attr("height", d3.select("#title_div").node().clientHeight);
  /*
  textArea = d3.select("#text_div").append("svg")
    .attr("width", d3.select("#text_div").node().clientWidth)
    .attr("height", d3.select("#text_div").node().clientHeight);

  barChartArea = d3.select("#barchart_div").append("svg")
    .attr("width", d3.select("#barchart_div").node().clientWidth)
    .attr("height", d3.select("#barchart_div").node().clientHeight);

  heatMap = d3.select("#heatmap_div").append("svg")
    .attr("width", d3.select("#heatmap_div").node().clientWidth)
    .attr("height", d3.select("#heatmap_div").node().clientHeight);
  */

  // TODO: precomputation of top value in all the data and similar things
  /*
  topValue = 0
  for (let index = 0; index < data.length; index++) {
    for (var key in data[index]) {
      if (key != 'date') {
        if (topValue < data[index][key]) topValue = data[index][key]
      }
    }
  }
  console.log("Top overall value is " + topValue)

  //gap size for heatmap row labels
  labelWidth = (1 / 8) * heatMap.node().clientWidth

  //width of one bar/column of the heatmap
  barWidth = ((7 / 8) * heatMap.node().clientWidth) / data.length
  */
}


/*----------------------
BEGINNING OF VISUALIZATION
----------------------*/
function visualization() {

  drawTextInfo();
}

/*----------------------
TEXT INFORMATION
----------------------*/
function drawTextInfo() {
  //Draw headline
  titleArea.append("text")
    .attrs({ dx: 20, dy: "3em", class: "headline" })
    .text("Police Shootings in the US");

  // TODO
  /*
  //Draw source
  textArea.append("text")
    .attrs({ dx: 20, dy: "7.5em", class: "subline" })
    .text("Data source: mapakriminality.cz")
    .on("click", function () { window.open("https://www.mapakriminality.cz/data/"); });;

  //Draw selection information
  selectedAreaText = textArea.append("text")
    .attrs({ dx: 20, dy: "10em", class: "subline" })
    .text("Selected Region: " + selectedRegion.replace(/_/g, " "));
  */
}


/*----------------------
INTERACTION
----------------------*/
function mapClick(region) {
  console.log(region)
  // TODO

  /*
  previousSelectedRegion = selectedRegion

  if (previousSelectedRegion == region) {
    d3.select('#'+selectedRegion).style("fill", 'lightgray').raise()
    selectedRegion = "Czech_Republic"
    selectedAreaText.text("Selected region: Czech Republic")
  }
  else {
    selectedAreaText.text("Selected region: " + region.replace(/_/g, ' '))
    selectedRegion = region  
    d3.select('#'+selectedRegion).style("fill", 'white').raise()
    d3.select('#'+previousSelectedRegion).style("fill", 'lightgrey')
  }
  drawBarChart(selectedRegion)
  */
}