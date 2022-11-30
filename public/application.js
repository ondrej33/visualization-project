/* variables referencing various types data */

// main dataset regarding shooting cases
var dataShootings;
// shooting cases by states, corresponding to selected year+month
var dataShootingsByStatesRestricted; 
// mapping state short names to full names
var dataStateNameMappings;
// mapping state full names to short names
var dataStateNameMappingsReversed;
// mapping attribute short names to full names
var dataAttribNameMappings;
// mapping attribute full names to short names
var dataAttribNameMappingsReversed;
// attributes to be displayed with their full names and values
var dataDisplayedAttribs;

/* D3.js canvases */
var titleArea;
var usMapStatsArea;

var state1MapArea;
var state1DropMenuArea;
var state1StatsArea;
var state1ChartArea;
var state2MapArea;
var state2DropMenuArea;
var state2StatsArea;
var state2ChartArea;
var statesAttributesMenuArea;

/* variables for current selection */
var selectedStateMainMap;
var selectedStateButton;

var selectedYear;
var selectedYearButton;

var selectedMonth;
var selectedMonthButton;

var selectedMode;

var selectedAttribute;
var selectedAttributeButton;

/* other global variables for precomputed values */
var numStates = 51;
var myColorScale;
var highestAbsoluteValue;

/* Loading the main data from CSV file */
d3.csv("./public/us_police_shootings_dataset.csv")
  .row(function (d) {
    return {
      //id: +d["id"],
      //name: d["name"],
      date: new Date(d["date"]),
      manner_of_death: d["manner_of_death"],
      armed_with: d["armed"],
      age: d["age"],
      gender: d["gender"],
      race: d["race"],
      city: d["city"],
      state_code: d["state"],
      signs_of_mental_illness: d["signs_of_mental_illness"],
      threat_level: d["threat_level"],
      flee: d["flee"],
      body_camera: d["body_camera"],
      //longitude: d["longitude"],
      //latitude: d["latitude"],
      //is_geocoding_exact: d["is_geocoding_exact"],
    };
  }).get(function (error, rows) {
    // saving reference to data
    dataShootings = rows;

    // preprocess the data a little bit
    // 1) define relevant attributes and their values that will be used for visualization
    dataDisplayedAttribs = {
      "age": {"full_name": "Age", "values": ["0-20", "21-40", "41-60", "61+", "N/A"]},
      "gender": {"full_name": "Gender", "values": ["Male", "Female", "N/A"]},
      "race": {"full_name": "Race", "values": ['White', 'Black', 'Hispanic', 'Other', "N/A"]},
      "flee": {"full_name": "Fleeing", "values": ['Not fleeing', 'Car', 'Foot', 'Other', 'N/A']},
      "body_camera": {"full_name": "Body camera", "values": ['True', 'False', 'N/A']},
    };
    // 2) preprocess these relevant attributes
    for (shootingCase of dataShootings) {
      // age group
      if (shootingCase["age"] == "") {
        shootingCase["age"] = "N/A";
      } else {
        var age = parseInt(shootingCase["age"]);
        if (age < 21) {
          shootingCase["age"] = "0-20";
        } else if (age < 41) {
          shootingCase["age"] = "21-40";
        } else if (age < 61) {
          shootingCase["age"] = "41-60";
        } else {
          shootingCase["age"] = "61+";
        }
      }
      
      // gender
      var gender = shootingCase["gender"];
      if (gender == "") {
        shootingCase["gender"] = "N/A";
      } else if (gender == "M") {
        shootingCase["gender"] = "Male";
      } else if (gender == "F") {
        shootingCase["gender"] = "Female";
      }

      // race
      var race = shootingCase["race"];
      if (race == "") {
        shootingCase["race"] = "N/A";
      } else if (race == "W") {
        shootingCase["race"] = "White";
      } else if (race == "B") {
        shootingCase["race"] = "Black";
      } else if (race == "H") {
        shootingCase["race"] = "Hispanic";
      } else {
        shootingCase["race"] = "Other";
      }




      // flee
      var flee = shootingCase["flee"];
      if (flee == "") {
        shootingCase["flee"] = "N/A";
      }

      // body camera
      var camera = shootingCase["body_camera"];
      if (camera == "") {
        shootingCase["body_camera"] = "N/A";
      } else if (camera == "TRUE") {
        shootingCase["body_camera"] = "True";
      } else if (camera == "FALSE") {
        shootingCase["body_camera"] = "False";
      }
    }

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

  // initial attribute selections
  selectedAttribute = null;
  selectedAttributeButton = null;

  // initial mode selections
  selectedMode = "Abs";

  //retrieve an SVG file via d3.request, 
  //the xhr.responseXML property is a document instance
  function responseCallback(xhr) {
    d3.select("#us_map_div").append(function () {
      return xhr.responseXML.querySelector('svg');
    }).attr("id", "map")
      .attr("width", d3.select("#us_map_div").node().clientWidth)
      .attr("height", d3.select("#us_map_div").node().clientHeight)
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

  // zoom state1 chart
  state1ChartArea = d3.select("#state1_pie_chart_div")
  .append("svg")
    .attr("width", d3.select("#state1_pie_chart_div").node().clientWidth)
    .attr("height", d3.select("#state1_pie_chart_div").node().clientHeight)
  .append("g")
    .attr("transform", "translate(" + d3.select("#state1_pie_chart_div").node().clientWidth / 2 + "," + d3.select("#state1_pie_chart_div").node().clientHeight / 2 + ")");

  // add elements to dropdowns (too much to add using HTML tags) 
  addDropDownOptions();

  // precompute division to states, highest value, etc.
  precompute_data();

  // title stays always the same, just add it once now
  drawTitle();

  // initial text for selected state
  state1DropMenuArea.append("text")
    .attrs({ dx: 0, dy: "1em", class: "headline"})
    .text("No state selected");
}

// Append options to dropdowns (state names, years, months)
function addDropDownOptions() {
  // month dropdown
  var dropDownMenu = $('#select_month_menu');
  for (var i = 1; i <= 12; i++) {
    dropDownMenu.append($('<a class="dropdown-item month-item">' + i + '</a>'));
  }

  // year dropdown
  var dropDownMenu = $('#select_year_menu');
  for (var i = 2016; i <= 2022; i++) {
    dropDownMenu.append($('<a class="dropdown-item year-item">' + i + '</a>'));
  }

  // state dropdown
  var dropDownMenu = $('#select_state_menu');
  // add the state names sorted
  var list_states = [];
  for (var key in dataStateNameMappings) {
    list_states.push(dataStateNameMappings[key]);
  }
  list_states.sort();
  for (var s of list_states) {
    dropDownMenu.append($('<a class="dropdown-item state-item">' + s + '</a>'));
  }

  // attribute dropdown
  var dropDownMenu = $('#select_attrib_menu');
  dataAttribNameMappings = {};
  dataAttribNameMappingsReversed = {};
  for(var key in dataDisplayedAttribs){
    dataAttribNameMappings[key] = dataDisplayedAttribs[key]["full_name"];
    dataAttribNameMappingsReversed[dataAttribNameMappings[key]] = key;
  }
  for (var attr in dataAttribNameMappingsReversed) {
    dropDownMenu.append($('<a class="dropdown-item attrib-item">' + attr + '</a>'));
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
  dataShootingsByStatesRestricted = new Map();
  for (var key in dataStateNameMappings) {
    dataShootingsByStatesRestricted[key] = [];
  }

  // divide cases into the lists by their state
  for (shootingCase of dataShootings) {
    var state_code = shootingCase["state_code"];
    // if year or month is not specified, take all, otherwise filter
    if ((year == null || year == shootingCase["date"].getFullYear()) &&
        (month == null || month == shootingCase["date"].getMonth() + 1)) {
          dataShootingsByStatesRestricted[state_code].push(shootingCase);
    }
  }
}

function computeHighestAbsoluteValue() {
  topValue = 0;
  for (var key in dataShootingsByStatesRestricted) {
    if (dataShootingsByStatesRestricted[key].length > topValue) {
      topValue = dataShootingsByStatesRestricted[key].length;
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
  drawPieChart(selectedAttribute, selectedStateMainMap);
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
  for (var key in dataShootingsByStatesRestricted) {
    sumValue += dataShootingsByStatesRestricted[key].length;
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
    var color = myColorScale(dataShootingsByStatesRestricted[key].length);
    d3.select('path#'+key).style("fill", color);
  }
}

/*----------------------
DRAW PIE CHART 
----------------------*/
function drawPieChart(attribute, state) {
  console.log("Pie chart for:",attribute, state)
  // remove current visualization if some exists
  d3.select("#state1_pie_chart_div").select('svg').select('g').html("")

  // if no state or attribute selected return
  if (attribute == null || state == null) {
    return;
  }
  // compute how many cases of each attribute's value we have in the current 
  // dataset (potentially restricted by year+month) for the given state

  // current data for only the given state
  currentDataState = dataShootingsByStatesRestricted[state];

  // compute attr value counts
  dataAttrValueCount = {};
  for (var attr_val of dataDisplayedAttribs[attribute]["values"]) {
    dataAttrValueCount[attr_val] = 0;
  }
  for (var shootingCase of currentDataState) {
    dataAttrValueCount[shootingCase[attribute]] += 1;
  }

  // set the color scale
  var pieColorScale = d3.scaleSequential().domain([0, dataDisplayedAttribs[attribute]["values"].length - 1]).interpolator(d3.interpolatePlasma);

  // compute the position of each group on the pie:
  var pie = d3.pie()
    .value(function(d) {return d.value; })
  var pieData = pie(d3.entries(dataAttrValueCount))
  var radius = Math.min(d3.select("#state1_pie_chart_div").node().clientWidth, d3.select("#state1_pie_chart_div").node().clientHeight) / 2;

  // build the pie chart: each part of the pie is a path that we build using the arc function
  console.log(pieData)
  state1ChartArea
    .selectAll('whatever')
    .data(pieData)
    .enter()
    .append('path')
    .attr('d', d3.arc()
      .innerRadius(radius / 3)
      .outerRadius(radius)
    )
    .attr('fill', function(d){ return(pieColorScale(d.index)) })
    .attr("stroke", "black")
    .style("stroke-width", "2px")
    .style("opacity", 0.7);

  var labelHeight = 18;

  legend = state1ChartArea
    .append('g')
    .attr('transform', `translate(${radius  + 20},0)`);

  legend
    .selectAll(null)
    .data(pieData)
    .enter()
    .append('rect')
    .attr('y', d => labelHeight * d.index * 1.6 - 50)
    .attr('width', labelHeight)
    .attr('height', labelHeight)
    .attr('fill', d => pieColorScale(d.index))
    .attr('stroke', 'grey')
    .style('stroke-width', '1px');

  legend
    .selectAll(null)
    .data(pieData)
    .enter()
    .append('text')
    .text(d => d.data.key)
    .attr('x', labelHeight * 1.2)
    .attr('y', d => labelHeight * d.index * 1.6 + labelHeight - 50)
    .style('font-family', 'sans-serif')
    .style('font-size', `${labelHeight}px`);


  /*
  // add annotation using the centroid method (to get the best coordinates)
  state1ChartArea
    .selectAll('whatever')
    .data(data_ready)
    .enter()
    .append('text')
    .text(function(d){ return "grp " + d.data.key})
    .attr("transform", function(d) { return "translate(" + arcGenerator.centroid(d) + ")";  })
    .style("text-anchor", "middle")
    .style("font-size", 17);
  */
}


/*----------------------
INTERACTION WITH THE MAIN MAP
----------------------*/
function mainMapClick(stateId) {
  // TODO: move color map somewhere else
  colorMap();

  if (selectedStateMainMap == stateId) {
    console.log("Unselected state: " + dataStateNameMappings[selectedStateMainMap]);
    // unselect the state on map
    d3.select('#'+selectedStateMainMap).style("stroke", "gray");
    selectedStateMainMap = null;

    // remove the state name from the text area
    state1DropMenuArea.text("");
    state1DropMenuArea.append("text")
      .attrs({ dx: 0, dy: "1em", class: "headline"})
      .text("No state selected");

    // unselect it in the dropdown menu
    $(selectedStateButton).removeClass('active');
    selectedStateButton = null;
    //$( '.state-item:contains(' + dataStateNameMappings[stateId] + ')' ).removeClass('active');

    // redraw state chart (will remove chart)
    drawPieChart(selectedAttribute, selectedStateMainMap);

    // TODO: remove the state from the zoom area

  } else {
    // if some other state was selected before, unselect it first
    if (selectedStateMainMap != null) {
      // unselect on map
      d3.select('#'+selectedStateMainMap).style("stroke", "gray");
      // unselect in the dropdown menu
      $(selectedStateButton).removeClass('active');

      // TODO: remove the state from the zoom area
    }
    // remove the previous text (can be state name or "nothing selected" text) from the text area
    state1DropMenuArea.text("");

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
    // redraw state chart
    drawPieChart(selectedAttribute, selectedStateMainMap);

    console.log("Selected state:", dataStateNameMappings[selectedStateMainMap]);

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
    console.log("Unselected month: " + target.text);
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
    console.log("Unselected year: " + target.text)
  } else {
    // change the active option (if any option has it, otherwise ok)
    $(selectedYearButton).removeClass('active');
    $(target).addClass('active');

    selectedYear = parseInt(target.text);
    selectedYearButton = target;
    console.log("Selected year: " + target.text);
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
     5) update of the state pie chart
  */
  var target = event.target;
  mainMapClick(dataStateNameMappingsReversed[target.text]);
});

/* -------------- ATTRIB CHANGING -------------- */
$("#select_attrib_btn").on("click", function(event){
  console.log("You clicked the attribute drop down", event);
});

$(document).on("click", ".attrib-item", function(event){
  var target = event.target;
  if ( $(target).hasClass("active") ) {
    // unselect the option
    $(target).removeClass('active');

    selectedAttributeButton = null;
    selectedAttribute = null;
    console.log("Unselected attribute: " + target.text)

    // redraw state chart (will remove the chart)
    drawPieChart(selectedAttribute, selectedStateMainMap);
  } else {
    // change the active option (if any option has it, otherwise ok)
    $(selectedAttributeButton).removeClass('active');
    $(target).addClass('active');
    selectedAttribute = dataAttribNameMappingsReversed[target.text];
    selectedAttributeButton = target;

    // redraw state chart
    drawPieChart(selectedAttribute, selectedStateMainMap);

    console.log("Selected attribute: " + target.text);
  }
});
