//variable containing reference to data
var data_shootings;
var data_state_name_mappings;

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
//var selectedAreaText;

//variables for selection
var selectedStateMainMap;
var previousSelectedStateMainMap;

// other global variables for precomputed values
//TODO
var myColorScale;
var topAbsoluteValue;

/* Loading the main data from CSV file */
d3.csv("./public/us_police_shootings_dataset.csv")
  .row(function (d_shootings) {
    return {
      id: +d["id"],
      name: d["name"],
      date: d["date"],
      manner_of_death: d["manner_of_death"],
      armed_with: d["armed"],
      age: +d["age"],
      gender: d["gender"],
      race: d["race"],
      city: d["city"],
      state: d["state"],
      signs_of_mental_illness: d["signs_of_mental_illness"],
      threat_level: d["threat_level"],
      flee: d["flee"],
      body_camera: d["body_camera"],
      longitude: d["longitude"],
      latitude: d["latitude"],
      is_geocoding_exact: d["is_geocoding_exact"],
    };
  }).get(function (error, rows) {
    // saving reference to data
    data_shootings = rows;

    /* Loading the <state code - state> mapping data from JSON file */
    d3.json("./public/states_dict.json", function (error, d_states) {
      // saving reference to data
      data_state_name_mappings = d_states;
      console.log(data_state_name_mappings);

      //load map and initialise the views
      init();

      // data visualization
      visualization();
    });  
});



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

  
  // TODO: d3 canvases for svg elements
  titleArea = d3.select("#title_div").append("svg")
    .attr("width", d3.select("#title_div").node().clientWidth)
    .attr("height", d3.select("#title_div").node().clientHeight);
  
  usMapStatsArea = d3.select("#us_map_stats_div").append("svg")
    .attr("width", d3.select("#us_map_stats_div").node().clientWidth)
    .attr("height", d3.select("#us_map_stats_div").node().clientHeight);
  
    // TODO: compute values for states
  topAbsoluteValue = 1000;
  
  // initialize color scale
  myColorScale = d3.scaleSequential().domain([0, topAbsoluteValue]).interpolator(d3.interpolatePlasma);
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
    .attrs({ dx: 100, dy: "2em", class: "headline" })
    .text("Police Shootings in the US");

  
  //set up a gradient variable for linear gradient
  //this is a storage elemnt that is appended as separate xml tag to svg, but does not result any "graphical output"
  var gradient = usMapStatsArea.append("linearGradient")
    .attr("id", "svgGradient")
    .attr("x1", "0%")
    .attr("x2", "100%")

  //append gradient "stops" - control points at varius gardient offsets with specific colors
  //you can set up multiple stops, minumum are 2
  gradient.append("stop")
    .attr('offset', "0%") //starting color
    .attr("stop-color", myColorScale(0));

  gradient.append("stop")
    .attr('offset', "50%") //middle color
    .attr("stop-color",  myColorScale(topAbsoluteValue/2));
    
  gradient.append("stop")
    .attr('offset', "100%") //end color
    .attr("stop-color",  myColorScale(topAbsoluteValue));

  //append rectangle with gradient fill  
  usMapStatsArea.append('rect').attrs({ x: 5, 
            y: usMapStatsArea.node().clientHeight - 30, 
            width: usMapStatsArea.node().clientWidth / 2, 
            height: 18, 
            stroke: 'white',
            fill: 'url(#svgGradient)'}) //gradient color fill is set as url to svg gradient element
          .style("stroke-width", 3)

  //min and max labels         
  usMapStatsArea.append("text")
    .attrs({x: 5, y: usMapStatsArea.node().clientHeight - 30, class: "subline"})
    .text("min");
  usMapStatsArea.append("text")
    .attrs({x: usMapStatsArea.node().clientWidth / 2, y: usMapStatsArea.node().clientHeight - 30, class: "subline"})
    .attr("text-anchor", "end")
    .text("max");


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
function mapClick(stateId) {
  // TODO
  previousSelectedStateMainMap = selectedStateMainMap
  selectedStateMainMap = stateId

  if (selectedStateMainMap == previousSelectedStateMainMap) {
    d3.select('#'+selectedStateMainMap).style("fill", 'lightgray').raise()
    selectedStateMainMap = "USA"
  }
  else {
    d3.select('#'+selectedStateMainMap).style("fill", 'white').raise()
    d3.select('#'+previousSelectedStateMainMap).style("fill", 'lightgrey')
  }
  console.log("Selected:", selectedStateMainMap)
}