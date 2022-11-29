//variable containing reference to data
var dataShootings;
var dataShootingsByStates;
var dataStateNameMappings;
var dataStateNameMappingsReversed;

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
var selectedStateButton;

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
      // save also reverse mapping
      dataStateNameMappingsReversed = {};
      for(var key in d_states){
        dataStateNameMappingsReversed[d_states[key]] = key;
      }      
    
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
  // initial selections for the main map
  selectedStateMainMap = null;

  // initial time selections
  selectedYear = null;
  selectedMonth = null;
  selectedYearButton = null;
  selectedMonthButton = null;

  var mapWidth = d3.select("#us_map_div").node().clientWidth;
  var mapHeight = d3.select("#us_map_div").node().clientHeight;

  //retrieve an SVG file via d3.request, 
  //the xhr.responseXML property is a document instance
  function responseCallback(xhr) {
    d3.select("#us_map_div").append(function () {
      return xhr.responseXML.querySelector('svg');
    }).attr("id", "map")
      .attr("width", mapWidth)
      .attr("height", mapHeight)
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
  // title
  titleArea = d3.select("#title_div").append("svg")
    .attr("width", d3.select("#title_div").node().clientWidth)
    .attr("height", d3.select("#title_div").node().clientHeight);
  
  // main map stats
  usMapStatsArea = d3.select("#us_map_stats_div").append("svg")
    .attr("width", d3.select("#us_map_stats_div").node().clientWidth)
    .attr("height", d3.select("#us_map_stats_div").node().clientHeight);
    
  // zoom state1 map
  state1MapArea = d3.select("#state1_map_div").append("svg")
    .attr("width", d3.select("#state1_map_div").node().clientWidth)
    .attr("height", d3.select("#state1_map_div").node().clientHeight);

  // zoom state1 name info
  state1DropMenuArea = d3.select("#state1_drop_menu_div").append("svg")
    .attr("width", d3.select("#state1_drop_menu_div").node().clientWidth)
    .attr("height", d3.select("#state1_drop_menu_div").node().clientHeight)
    .attr("x", d3.select("#state1_drop_menu_div").node().clientWidth);

  // add elements to dropdowns (too much to add using HTML tags) 
  addDropDownOptions();

  // precompute division to states, highest value, etc.
  precompute_data();

  // title stays always the same, just add it once now
  drawTitle();
}

// Append options to dropdowns (state names, years, months)
function addDropDownOptions() {
  var dropDownMenu = $('#select_month_menu');
  for (var i = 1; i <= 12; i++) {
    dropDownMenu.append($('<a class="dropdown-item month-item" href="#">' + i + '</a>'));
  }

  var dropDownMenu = $('#select_year_menu');
  for (var i = 2016; i <= 2022; i++) {
    dropDownMenu.append($('<a class="dropdown-item year-item" href="#">' + i + '</a>'));
  }

  var dropDownMenu = $('#select_state_menu');
  // add the state names sorted
  var list_states = [];
  for (var key in dataStateNameMappings) {
    list_states.push(dataStateNameMappings[key]);
  }
  list_states.sort();
  for (var s of list_states) {
    dropDownMenu.append($('<a class="dropdown-item state-item" href="#">' + s + '</a>'));
  }
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
  colorMap();
}

/*----------------------
TITLE
----------------------*/
function drawTitle() {
  //Draw headline
  titleArea.append("text")
    .attrs({ dx: d3.select("#title_div").node().clientWidth / 5, dy: "2em", class: "headline" })
    .text("Police Shootings in the US");
}

/*----------------------
STATS AND LEGEND FOR THE MAIN MAP
----------------------*/
function drawUsMapStats() {
  // remove existing stuff
  usMapStatsArea.text("")

  // set up a gradient variable for linear gradient
  // this is a storage elemnt that is appended as separate xml tag to svg, but does not result any "graphical output"
  var gradient = usMapStatsArea.append("linearGradient")
    .attr("id", "svgGradient")
    .attr("x1", "0%")
    .attr("x2", "100%");

  // append gradient "stops" - control points at varius gardient offsets with specific colors
  // you can set up multiple stops, minumum are 2
  gradient.append("stop")
    .attr('offset', "0%") //starting color
    .attr("stop-color", myColorScale(0));

  gradient.append("stop")
    .attr('offset', "50%") //middle color
    .attr("stop-color",  myColorScale(highestAbsoluteValue / 2));
    
  gradient.append("stop")
    .attr('offset', "100%") //end color
    .attr("stop-color",  myColorScale(highestAbsoluteValue));

  // append rectangle with gradient fill  
  usMapStatsArea.append('rect').attrs({ 
    x: 0, 
    y: usMapStatsArea.node().clientHeight - 30, 
    width: usMapStatsArea.node().clientWidth * 0.8, 
    height: 18, 
    stroke: 'white',
    fill: 'url(#svgGradient)' //gradient color fill is set as url to svg gradient element
  }).style("stroke-width", 3);

  // min and max labels
  usMapStatsArea.append("text")
    .attrs({x: 0, y: usMapStatsArea.node().clientHeight - 32, class: "subline"})
    .text(0);
  usMapStatsArea.append("text")
    .attrs({x: usMapStatsArea.node().clientWidth * 0.8, y: usMapStatsArea.node().clientHeight - 32, class: "subline"})
    .attr("text-anchor", "end")
    .text(highestAbsoluteValue);

  // Compute and display some stats
  usMapStatsArea.append("text")
    .attrs({x: 0, y: 30})
    .text("Stats regarding numbers of cases:");

  var sumValue = 0.;
  for (var key in dataShootingsByStates) {
    sumValue += dataShootingsByStates[key].length;
  }

  usMapStatsArea.append("text")
    .attrs({x: 0, y: 50})
    .text("Total: " + sumValue);

  var averageValue = sumValue / 51;
  usMapStatsArea.append("text")
    .attrs({x: 0, y: 70})
    .text("Average per state: " + averageValue.toFixed(2));

  usMapStatsArea.append("text")
    .attrs({x: 0, y: 90})
    .text("Highest per state: " + highestAbsoluteValue);

}

/*----------------------
COLOR THE MAIN MAP
----------------------*/
function colorMap() {
  // set the state color corresponding to the number of cases
  for (var key in dataStateNameMappings) {
    var color = myColorScale(dataShootingsByStates[key].length);
    d3.select('path#'+key).style("fill", color);
  }
}

/*----------------------
INTERACTION WITH THE MAIN MAP
----------------------*/
function mainMapClick(stateId) {
  // TODO: move color map somewhere else
  colorMap();

  if (selectedStateMainMap == stateId) {
    // unselect the state on map
    d3.select('#'+selectedStateMainMap).style("stroke", "gray");
    selectedStateMainMap = null;

    // remove the state name from the text area
    state1DropMenuArea.text("");
    console.log("Unselected");

    // unselect it in the dropdown menu
    $(selectedStateButton).removeClass('active');
    selectedStateButton = null;
    //$( '.state-item:contains(' + dataStateNameMappings[stateId] + ')' ).removeClass('active');

    // TODO: remove the state from the zoom area
  } else {
    // if some other state was selected before, unselect it first
    if (selectedStateMainMap != null) {
      // unselect on map
      d3.select('#'+selectedStateMainMap).style("stroke", "gray");
      // remove state name on from the text area
      state1DropMenuArea.text("");
      // unselect in the dropdown menu
      $(selectedStateButton).removeClass('active');

      // TODO: remove the state from the zoom area
    }
    // select the new state on the map
    selectedStateMainMap = stateId;
    d3.select('#'+selectedStateMainMap).style("stroke", "white").raise();
    // add state name to the text area
    state1DropMenuArea.append("text")
      .attrs({ dx: 0, dy: "1em", class: "headline"})
      .text(dataStateNameMappings[selectedStateMainMap]);
    // select in the dropdown menu
    selectedStateButton = $( '.state-item:contains(' + dataStateNameMappings[stateId] + ')' );
    selectedStateButton.addClass('active');

    console.log("Selected:", dataStateNameMappings[selectedStateMainMap]);

    // TODO: show the state in the zoom area
    /*
    //retrieve an SVG file via d3.request, 
    //the xhr.responseXML property is a document instance
    function responseCallback(xhr) {
      d3.select("#state1_map_div").append(function () {
        return xhr.responseXML.querySelector('svg');
      }).attr("id", "map_state1")
        .attr("width", width / 2)
        .attr("height", height / 2)
        .attr("x", 0)
        .attr("y", 0);
    };

    // Select the root <svg> and append it directly
    d3.request("public/us_map_copy.svg")
      .mimeType("image/svg+xml")
      .get(function (n) {
        d3.select("body").select("#map_state1")
          .selectAll("path")
          .style("fill", "lightgray")
          .style("stroke", "gray")
          .style("stroke-width", 3);
      })
      .response(responseCallback);
    */
  }
}

/*----------------------
INTERACTION WITH THE BUTTONS AND DROPDOWNS
----------------------*/

/* -------------- MONTH CHANGING -------------- */
$("#select_month_btn").on("click", function(event){
  console.log("You clicked the month drop down", event);
});

$(document).on("click", ".month-item", function(event){  
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
    console.log("Selected month: " + target.text);
  }
  // update the numbers and map (needs to be done after both selection & unselection)
  precompute_data();
  visualization();
});

/* -------------- YEAR CHANGING -------------- */
$("#select_year_btn").on("click", function(event){
  console.log("You clicked the year drop down", event);
});

$(document).on("click", ".year-item", function(event){
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
  precompute_data();
  visualization();
});

/* -------------- MODE SWAPING -------------- */
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

/* -------------- STATE CHANGING -------------- */
$("#state1_drop_menu_div").on("click", function(event){
  console.log("You clicked the state1 drop down", event);
});

$(document).on("click", ".state-item", function(event){
  // simulate click on the main map
  /* that alone handles:
     1) map coloring
     2) update of selected state
     3) update of state text
     4) update of selected dropdown option
  */
  var target = event.target;
  mainMapClick(dataStateNameMappingsReversed[target.text]);
});
