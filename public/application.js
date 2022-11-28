//variable containing reference to data
var dataShootings;
var dataShootingsByStates;
var dataStateNameMappings;

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

var selectedYear;
var selectedYearButton;
var selectedMonth;
var selectedMonthButton;

var selectedMode;

// other global variables for precomputed values
//TODO
var numStates = 51;
var myColorScale;
var highestAbsoluteValue;

/* Loading the main data from CSV file */
d3.csv("./public/us_police_shootings_dataset.csv")
  .row(function (d) {
    return {
      id: +d["id"],
      name: d["name"],
      date: new Date(d["date"]),
      manner_of_death: d["manner_of_death"],
      armed_with: d["armed"],
      age: +d["age"],
      gender: d["gender"],
      race: d["race"],
      city: d["city"],
      state_code: d["state"],
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
    dataShootings = rows;

    /* Loading the <state code - state> mapping data from JSON file */
    d3.json("./public/states_dict.json", function (error, d_states) {
      // saving reference to data regarding mapping of state names
      dataStateNameMappings = d_states;
    
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

  // initial selections for the main map
  selectedStateMainMap = "USA";
  previousSelectedStateMainMap = "USA";

  // initial time selections
  selectedYear = null;
  selectedMonth = null;
  selectedYearButton = null;
  selectedMonthButton = null;

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
          mainMapClick(this.id);
        });
    });

  
  // d3 canvases for svg elements
  titleArea = d3.select("#title_div").append("svg")
    .attr("width", d3.select("#title_div").node().clientWidth)
    .attr("height", d3.select("#title_div").node().clientHeight);
  
  usMapStatsArea = d3.select("#us_map_stats_div").append("svg")
    .attr("width", d3.select("#us_map_stats_div").node().clientWidth)
    .attr("height", d3.select("#us_map_stats_div").node().clientHeight);
  
  usMapStatsArea = d3.select("#us_map_options_div").append("svg")
    .attr("width", d3.select("#us_map_stats_div").node().clientWidth)
    .attr("height", d3.select("#us_map_stats_div").node().clientHeight);
  
  precompute_data()

  // Title stays always the same
  drawTitle();
}

// Precompute data division, and color scheme 
// Important to do this before any modifications of the map
function precompute_data() {
  // divide data by states
  divideDataToStates(selectedYear, selectedMonth);

  // compute the highest number of shooting in a state
  highestAbsoluteValue = computeHighestAbsoluteValue();
    
  // initialize color scale
  myColorScale = d3.scaleSequential().domain([0, highestAbsoluteValue]).interpolator(d3.interpolatePlasma);
}

function divideDataToStates(year, month) {
  // initiate the map with state codes and empty lists
  dataShootingsByStates = new Map();
  for (var key in dataStateNameMappings) {
    dataShootingsByStates[key] = [];
  }

  // divide cases into the lists by their state
  for (shootingCase of dataShootings) {
    var state_code = shootingCase["state_code"];
    // if year or month is not specified, take all, otherwise filter
    if ((year == null || year == shootingCase["date"].getFullYear()) &&
        (month == null || month == shootingCase["date"].getMonth() + 1)) {
      dataShootingsByStates[state_code].push(shootingCase);
    }
  }
}

function computeHighestAbsoluteValue() {
  topValue = 0;
  for (var key in dataShootingsByStates) {
    if (dataShootingsByStates[key].length > topValue) {
      topValue = dataShootingsByStates[key].length;
    }
  }
  return topValue;
}


/*----------------------
BEGINNING OF VISUALIZATION
----------------------*/
function visualization() {
  drawUsMapStats();
  drawUsMapOptions();
  colorMap();
}

/*----------------------
TITLE
----------------------*/
function drawTitle() {
  //Draw headline
  titleArea.append("text")
    .attrs({ dx: 200, dy: "2em", class: "headline" })
    .text("Police Shootings in the US");
}

/*----------------------
MAP OPTIONS (buttons, dropdowns)
----------------------*/
function drawUsMapOptions() {
  //Draw headline
  titleArea.append("text")
    .attrs({ dx: 200, dy: "2em", class: "headline" })
    .text("Police Shootings in the US");
}

/*----------------------
STATS AND LEGEND FOR THE MAIN MAP
----------------------*/
function drawUsMapStats() {
  //set up a gradient variable for linear gradient
  //this is a storage elemnt that is appended as separate xml tag to svg, but does not result any "graphical output"
  var gradient = usMapStatsArea.append("linearGradient")
    .attr("id", "svgGradient")
    .attr("x1", "0%")
    .attr("x2", "100%");

  //append gradient "stops" - control points at varius gardient offsets with specific colors
  //you can set up multiple stops, minumum are 2
  gradient.append("stop")
    .attr('offset', "0%") //starting color
    .attr("stop-color", myColorScale(0));

  gradient.append("stop")
    .attr('offset', "50%") //middle color
    .attr("stop-color",  myColorScale(highestAbsoluteValue / 2));
    
  gradient.append("stop")
    .attr('offset', "100%") //end color
    .attr("stop-color",  myColorScale(highestAbsoluteValue));

  //append rectangle with gradient fill  
  usMapStatsArea.append('rect').attrs({ x: 0, 
            y: usMapStatsArea.node().clientHeight - 30, 
            width: usMapStatsArea.node().clientWidth * 0.8, 
            height: 18, 
            stroke: 'white',
            fill: 'url(#svgGradient)'}) //gradient color fill is set as url to svg gradient element
          .style("stroke-width", 3);

  //min and max labels         
  usMapStatsArea.append("text")
    .attrs({x: 0, y: usMapStatsArea.node().clientHeight - 30, class: "subline"})
    .text("min");
  usMapStatsArea.append("text")
    .attrs({x: usMapStatsArea.node().clientWidth * 0.8, y: usMapStatsArea.node().clientHeight - 30, class: "subline"})
    .attr("text-anchor", "end")
    .text("max");
}

/*----------------------
COLOR THE MAIN MAP
----------------------*/
function colorMap() {
  //set the state color corresponding to the number of cases
  for (var key in dataStateNameMappings) {
    var color = myColorScale(dataShootingsByStates[key].length);
    d3.select('#'+key).style("fill", color).raise();
  }
}

/*----------------------
INTERACTION WITH THE MAIN MAP
----------------------*/
function mainMapClick(stateId) {
  // TODO: move color map somewhere else
  colorMap();

  // TODO
  previousSelectedStateMainMap = selectedStateMainMap;
  selectedStateMainMap = stateId;

  if (selectedStateMainMap == previousSelectedStateMainMap) {
    var origColor = myColorScale(dataShootingsByStates[selectedStateMainMap].length);
    d3.select('#'+selectedStateMainMap).style("fill", origColor).raise();
    selectedStateMainMap = "USA";
    console.log("Unselected");
  } else {
    // if some state was selected before, color it back
    if (previousSelectedStateMainMap != "USA") {
      var origColor = myColorScale(dataShootingsByStates[previousSelectedStateMainMap].length);
      d3.select('#'+previousSelectedStateMainMap).style("fill", origColor).raise();
    }
    d3.select('#'+selectedStateMainMap).style("fill", 'white').raise();
    console.log("Selected:", dataStateNameMappings[selectedStateMainMap]);
  }
}

/*----------------------
INTERACTION WITH THE BUTTONS AND DROPDOWNS
----------------------*/

// Month changing
$("#select_month_btn").on("click", function(event){
  console.log("You clicked the month drop down", event);
});

$(".month-item").on("click", function(event){
  var target = event.target;
  if ( $(target).hasClass("active") ) {
    // unselect the option
    $(selectedMonthButton).removeClass('active');

    selectedMonthButton = null;
    selectedMonth = null;
    console.log("Unselected month " + target.text)
  } else {
    // change the active option (if any option has it, otherwise ok)
    $(selectedMonthButton).removeClass('active');
    $(target).addClass('active');

    selectedMonth = parseInt(target.text);
    selectedMonthButton = target;
    console.log("Selected month: " + target.text)
  }
  // update the numbers and map (needs to be done after both selection & unselection)
  precompute_data()
  visualization()  
});

// Year changing
$("#select_year_btn").on("click", function(event){
  console.log("You clicked the year drop down", event);
});

$(".year-item").on("click", function(event){
  var target = event.target;
  if ( $(target).hasClass("active") ) {
    // unselect the option
    $(selectedYearButton).removeClass('active');

    selectedYearButton = null;
    selectedYear = null;
    console.log("Unselected year " + target.text)
  } else {
    // change the active option (if any option has it, otherwise ok)
    $(selectedYearButton).removeClass('active');
    $(target).addClass('active');

    selectedYear = parseInt(target.text);
    selectedYearButton = target;
    console.log("Selected year: " + target.text)
  }
  // update the numbers and map (needs to be done after both selection & unselection)
  precompute_data()
  visualization()
});

// Mode swaping
$("#absolute-numbers-button").on("click", function(event){
  if (selectedMode != "Abs") {
    selectedMode = "Abs";
    console.log("Selected mode: Absolute");
    // TODO: update the numbers and map
  } else {
    // no need to change anything
    console.log("Selected mode: Absolute (no change)");
  }
});

$("#relative-numbers-button").on("click", function(event){
  if (selectedMode != "Rel") {
    selectedMode = "Rel";
    console.log("Selected mode: Relative");
    // TODO: update the numbers and map
  } else {   
    // no need to change anything
    console.log("Selected mode: Relative (no change)");
  }
});
