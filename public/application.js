/* variables referencing various types data */

// main dataset regarding shooting cases
var dataShootings;
// shooting cases by states, corresponding to selected year+month
var dataByStatesRestricted; 
// shooting cases by states AND cities, corresponding to selected year+month
var dataCountByCitiesRestricted; 
// mapping cities to their coords
var dataCityCoordMappings; 
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
// month number to name mappings
var dataMonthNameMappings;
// month name to number mappings
var dataMonthNameMappingsReversed;


/* D3.js canvases */
var titleArea;
var usMapStatsArea;

var state1MapArea;
var state1MapToolTip;
var state1DropMenuArea;
var state1StatsArea;
var state1ChartArea;
var state2MapArea;
var state2MapToolTip;
var state2DropMenuArea;
var state2StatsArea;
var state2ChartArea;
var statesAttributesMenuArea;

/* variables for current selection */
var selectedState;
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
var highestAbsVal;

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
      lon: d["longitude"],
      lat: d["latitude"],
      is_geocoding_exact: d["is_geocoding_exact"],
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
    // 2) preprocess these relevant attributes, save some metadata (city coords...)
    dataCityCoordMappings = new Map();
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

      // save city coord mapping to the relevant map 
      if (!dataCityCoordMappings.has(shootingCase["state_code"] + "_" + shootingCase["city"])) {
        dataCityCoordMappings.set(
          shootingCase["state_code"] + "_" + shootingCase["city"], 
          {lat: shootingCase["lat"], lon: shootingCase["lon"], exact: shootingCase["is_geocoding_exact"]}
        );
      }
    }

    /* Loading the <state code - state> mapping data from JSON file */
    d3.json("./public/states_dict.json", function (error, dStates) {
      // saving reference to data regarding mapping of state names
      dataStateNameMappings = dStates;
      // save also reverse mapping
      dataStateNameMappingsReversed = {};
      for(var key in dStates){
        dataStateNameMappingsReversed[dStates[key]] = key;
      }      

      // save month num <-> names mappings
      dataMonthNameMappings = {
        1: "January",
        2: "February",
        3: "March",
        4: "April",
        5: "May",
        6: "June",
        7: "July",
        8: "August",
        9: "September",
        10: "October",
        11: "November",
        12: "December"
      };
      dataMonthNameMappingsReversed = {};
      for (var key in dataMonthNameMappings){
        dataMonthNameMappingsReversed[dataMonthNameMappings[key]] = key;
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
  selectedState = null;

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

  // add elements to dropdowns (too many to add using HTML tags) 
  addDropDownOptions();

  // precompute division to states, highest value, etc.
  precomputeData();

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
        .style("fill", function() { // fill states using the defined gradient
          return myColorScale(dataByStatesRestricted[this.id].length); 
        })
        .style("stroke", "grey")
        .style("stroke-width", 2)
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
    
  // zoom state1 map and tooltip
  state1MapArea = d3.select("#state1_map_div").append("svg")
    .attr("width", d3.select("#state1_map_div").node().clientWidth)
    .attr("height", d3.select("#state1_map_div").node().clientHeight);
  state1MapToolTip = d3.select("#state1_map_div").append("div")   
    .attr("class", "tooltip")               
    .style("opacity", 0);

  // zoom state1 name info
  state1DropMenuArea = d3.select("#state1_drop_menu_div").append("svg")
    .attr("width", d3.select("#state1_drop_menu_div").node().clientWidth)
    .attr("height", d3.select("#state1_drop_menu_div").node().clientHeight)
    .attr("x", d3.select("#state1_drop_menu_div").node().clientWidth);

  // zoom state1 stats 
  state1StatsArea = d3.select("#state1_stats_div").append("svg")
    .attr("width", d3.select("#state1_stats_div").node().clientWidth)
    .attr("height", d3.select("#state1_stats_div").node().clientHeight)

  // zoom state1 chart
  // translate moves it to the middle of div
  var halfWidth = d3.select("#state1_pie_chart_div").node().clientWidth / 2;
  var halfHeight = d3.select("#state1_pie_chart_div").node().clientHeight / 2;
  state1ChartArea = d3.select("#state1_pie_chart_div")
    .append("svg")
      .attr("width", d3.select("#state1_pie_chart_div").node().clientWidth)
      .attr("height", d3.select("#state1_pie_chart_div").node().clientHeight)
    .append("g")
      .attr("transform", "translate(" + halfWidth + "," + halfHeight + ")");

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
    dropDownMenu.append($('<a class="dropdown-item month-item">' + dataMonthNameMappings[i] + '</a>'));
  }

  // year dropdown
  var dropDownMenu = $('#select_year_menu');
  for (var i = 2016; i <= 2022; i++) {
    dropDownMenu.append($('<a class="dropdown-item year-item">' + i + '</a>'));
  }

  // state dropdown
  var dropDownMenu = $('#select_state_menu');
  // add the state names sorted
  var listStates = [];
  for (var key in dataStateNameMappings) {
    listStates.push(dataStateNameMappings[key]);
  }
  listStates.sort();
  for (var s of listStates) {
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
function precomputeData() {
  // divide data by states
  divideDataToStates(selectedYear, selectedMonth);

  // compute the highest number of shooting in a state
  highestAbsVal = computeHighestAbsVal();
    
  // initialize color scale
  myColorScale = d3.scaleSequential().domain([0, highestAbsVal]).interpolator(d3.interpolateYlOrRd);
}

function divideDataToStates(year, month) {
  // initiate the map with state codes and empty lists
  dataByStatesRestricted = new Map();
  dataCountByCitiesRestricted = new Map();
  for (var key in dataStateNameMappings) {
    dataByStatesRestricted[key] = [];
    dataCountByCitiesRestricted[key] = new Map();
  }

  // divide cases into the lists by their state
  for (shootingCase of dataShootings) {
    var stateCode = shootingCase["state_code"];
    // if year or month is not specified, take all, otherwise filter
    if ((year == null || year == shootingCase["date"].getFullYear()) &&
        (month == null || month == shootingCase["date"].getMonth() + 1)) {
          // add the shooting case
          dataByStatesRestricted[stateCode].push(shootingCase);

          // increment counter for the city, or initiate it to 1 if there is nothiing
          if (dataCountByCitiesRestricted[stateCode].has(shootingCase["city"])) {
            dataCountByCitiesRestricted[stateCode].set(
              shootingCase["city"], 
              dataCountByCitiesRestricted[stateCode].get(shootingCase["city"]) + 1);
          } else {
            dataCountByCitiesRestricted[stateCode].set(shootingCase["city"], 1);
          }
    }
  }
}

function computeHighestAbsVal() {
  topValue = 0;
  for (var key in dataByStatesRestricted) {
    if (dataByStatesRestricted[key].length > topValue) {
      topValue = dataByStatesRestricted[key].length;
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
  drawPieChart(selectedAttribute, selectedState);
  drawStateStats(selectedState);
  drawSecondMap(selectedState);
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
    .attr("stop-color",  myColorScale(highestAbsVal / 2));
    
  gradient.append("stop")
    .attr('offset', "100%") //end color
    .attr("stop-color",  myColorScale(highestAbsVal));

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
    .text(highestAbsVal);

  // Compute and display some stats
  usMapStatsArea.append("text")
    .attrs({x: 0, y: 40})
    .text("STATS REGARDING NUMBERS OF CASES");

  // compute min, sum, average and mid, ... values first
  var minValue = 1000000; // some large value
  var sumValue = 0.;
  var medianValue = 0;
  var midIndex = Math.floor(numStates / 2);
  var i = 0;
  for (var key in dataByStatesRestricted) {
    value = dataByStatesRestricted[key].length;
    sumValue += value;
    if (i == midIndex) {
      medianValue = value;
    }
    if (value < minValue) {
      minValue = value;
    }
    i++;
  }
  var averageValue = sumValue / 51;
  
  // total number of cases
  usMapStatsArea.append("text")
    .attrs({x: 0, y: 70})
    .text("Total: " + sumValue);
  
  // highest number of cases per state
  usMapStatsArea.append("text")
    .attrs({x: 0, y: 90})
    .text("Highest per state: " + highestAbsVal);

  // least number of cases per state
  usMapStatsArea.append("text")
    .attrs({x: 0, y: 110})
    .text("Lowest per state: " + minValue);

  // average number of cases per state
  usMapStatsArea.append("text")
    .attrs({x: 0, y: 130})
    .text("Average per state: " + averageValue.toFixed(2));

  // median number of cases per state
  usMapStatsArea.append("text")
    .attrs({x: 0, y: 150})
    .text("Median per state: " + medianValue);
}

/*----------------------
COLOR THE MAIN MAP
----------------------*/
function colorMap() {
  // set the state color corresponding to the number of cases
  for (var key in dataStateNameMappings) {
    var color = myColorScale(dataByStatesRestricted[key].length);
    d3.select('path#'+key).style("fill", color);
  }
}


/*----------------------
DRAW SECOND MAP 
----------------------*/
function drawSecondMap(state) {
  // remove map and tooltip
  d3.select("#state1_map_div").select('svg').html("");
  d3.select("#state1_map_div").select('.tooltip').html("");

  // if no state selected, return
  if (state == null) {
    return;
  }
          
  // Load GeoJSON data and merge with states data
  d3.json("us-states.json", function(json) { 
    var selStateOnly = json.features.filter((d) => (dataStateNameMappingsReversed[d.properties.name] === state))
    console.log(selStateOnly)
    //console.log(d3.geoCentroid(selStateOnly[0]))
    //console.log(d3.geoBounds(selStateOnly[0]))

    var projection = d3.geoAlbersUsa()
		  .translate([  // translate to center of screen
        d3.select("#state1_map_div").node().clientWidth / 2, 
        d3.select("#state1_map_div").node().clientHeight / 2, 
      ])
		  .scale(d3.select("#state1_map_div").node().clientWidth); // scale things down to see entire US

    // Bind the data to the SVG and create one path per GeoJSON feature
    state1MapArea.selectAll("path")
      .data(selStateOnly)
      .enter()
      .append("path")
        .attr("id", function(d) {return dataStateNameMappingsReversed[d.properties.name]})
        .attr("name", function(d) {return d.properties.name})
        .attr("idx", function(d) {return d.id})
        .attr("d", d3.geoPath().projection(projection)) // d3.geoPath() creates real path object from the coords
        .style("stroke", "#fff")
        .style("stroke-width", "1")
        .style("fill", function(d) { 
          var stateCode = dataStateNameMappingsReversed[d.properties.name];
          return myColorScale(dataByStatesRestricted[stateCode].length); 
        })
        .on("click", clickedState)
        .raise();
      
    d3.select('#state1_map_div').select("path").dispatch('click');
     
    var dataCities = new Array();
    for (var key of dataCountByCitiesRestricted[state].keys()) {
      var uniqueName = state + "_" + key; // name for indexing
      var coordsObj = dataCityCoordMappings.get(uniqueName);
      
      // ignore few irrelevant cities without coords or inexact ones
      if (coordsObj["lon"] == "" || coordsObj["lat"] == "" || coordsObj["exact"] != "TRUE") {
        continue;
      }

      dataCities.push({
        name: key, 
        val: dataCountByCitiesRestricted[state].get(key), 
        lon: coordsObj["lon"], 
        lat: coordsObj["lat"]
      })
    }
    
    // Map the cities 
    state1MapArea.selectAll("circle")
      .data(dataCities)
      .enter()
      .append("circle")
        .attr("cx", function(d) { return projection([d.lon, d.lat])[0]; })
        .attr("cy", function(d) { return projection([d.lon, d.lat])[1]; })
        .attr("r", function(d) { return Math.sqrt(d.val); })
        .style("fill", "rgb(0,0,0)")	
        .style("opacity", 0.85)	
      .on("mouseover", function(d) { // Modification of custom tooltip code provided by Malcolm Maclean, "D3 Tips and Tricks" http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html
        state1MapToolTip.transition()        
          .duration(200)      
          .style("opacity", .9);      
          state1MapToolTip.text(d.name)
          .style("left", (d3.event.pageX) + "px")     
          .style("top", (d3.event.pageY - 28) + "px");    
      })                 
      .on("mouseout", function(d) { // fade out tooltip on mouse out     
        state1MapToolTip.transition()        
          .duration(500)      
          .style("opacity", 0);   
      });  
  });
}

function clickedState(state) {
  console.log(state)
  console.log(d3.select("#state1_map_div").select("path"))
  var width = d3.select("#state1_map_div").node().clientWidth;
  var height = d3.select("#state1_map_div").node().clientHeight;

  var projection = d3.geoAlbersUsa()
    .translate([  // translate to center of screen
      width / 2, 
      height / 2, 
    ])
    .scale(width); // scale things down to see entire US
  
  var path = d3.geoPath().projection(projection);
  console.log(path.bounds(state))
  console.log(path.centroid(state))

  var bounds = path.bounds(state),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      //scale = .9 / Math.max(dx / width, dy / height),
      //translate = [width / 2 - scale * x, height / 2 - scale * y];
      scale = 1,
      translate = [ width / 2 - x, height / 2 - y];

  state1MapArea.transition()
      .duration(0) // instant
      .style("stroke-width", 1.5 / scale + "px")
      .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
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
  currentDataState = dataByStatesRestricted[state];
  // if no data for current (time and state) selection, return
  if (currentDataState.length == 0) {
    return;
  }

  // compute attr value counts
  dataAttrValueCount = {};
  for (var attrVal of dataDisplayedAttribs[attribute]["values"]) {
    dataAttrValueCount[attrVal] = 0;
  }
  for (var shootingCase of currentDataState) {
    dataAttrValueCount[shootingCase[attribute]] += 1;
  }

  // set the color scale
  var pieColorScale = d3.scaleSequential().domain([0, dataDisplayedAttribs[attribute]["values"].length - 1]).interpolator(d3.interpolateCubehelixLong("purple", "orange"));

  // compute the position of each group on the pie:
  var pie = d3.pie()
    .value(function(d) {return d.value; })
  var pieData = pie(d3.entries(dataAttrValueCount))
  var radius = Math.min(d3.select("#state1_pie_chart_div").node().clientWidth, d3.select("#state1_pie_chart_div").node().clientHeight) / 2 - 3;

  // build the pie chart: each part of the pie is a path that we build using the arc function
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
    .style("stroke-width", "1px")
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
}


function drawStateStats(state) {
  // remove existing stuff
  state1StatsArea.text("")

  if (state == null) {
    return;
  }

  // Compute and display some stats
  state1StatsArea.append("text")
    .attrs({x: 0, y: 20})
    .text("INFO REGARDING THE STATE");

  // compute some numbers first
  var casesState = dataByStatesRestricted[state];
  var numCasesState = casesState.length;
  var rankStateAbs = 1; // rank can be in some range, if more states have same value
  var sameNumCases = 0;

  for (var key in dataByStatesRestricted) {
    value = dataByStatesRestricted[key].length;
    if (value > numCasesState) {
      rankStateAbs++;
    }
    if (value == numCasesState && key != state) {
      sameNumCases++;
    }
  }
  
  // total number of cases in state
  state1StatsArea.append("text")
    .attrs({x: 0, y: 50})
    .text("Number of cases: " + numCasesState);
  
  // rank of the state (1 = highest)
  var sameNumCasesString = "";
  if (sameNumCases > 0) {
    sameNumCasesString = " - " + (rankStateAbs + sameNumCases);
  }
  state1StatsArea.append("text")
    .attrs({x: 0, y: 70})
    .text("Rank: " + rankStateAbs + sameNumCasesString);
}


/*----------------------
INTERACTION WITH THE MAIN MAP
----------------------*/
function mainMapClick(stateId) {
  if (selectedState == stateId) {
    console.log("Unselected state: " + dataStateNameMappings[selectedState]);
    // unselect the state on map
    d3.select('#'+selectedState)
      .style("stroke", "gray")
      .style("stroke-width", 2);
    selectedState = null;

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
    drawPieChart(selectedAttribute, null);

    // remove state stats
    state1StatsArea.text("");

    // redraw state map (will remove map)
    drawSecondMap(null);
  } else {
    // if some other state was selected before, unselect it first
    if (selectedState != null) {
      // unselect on map
      d3.select('#'+selectedState)
        .style("stroke", "gray")
        .style("stroke-width", 2);
      // unselect in the dropdown menu
      $(selectedStateButton).removeClass('active');

    }
    // remove the previous text (can be state name or "nothing selected" text) from the text area
    state1DropMenuArea.text("");
    // remove stats completely
    state1StatsArea.text("");

    // select the new state on the map
    selectedState = stateId;
    d3.select('#'+selectedState)
      .style("stroke", "black")
      .style("stroke-width", 4)
      .raise();
    // add state name to the text area
    state1DropMenuArea.append("text")
      .attrs({ dx: 0, dy: "1em", class: "headline"})
      .text(dataStateNameMappings[selectedState]);
    // select in the dropdown menu
    selectedStateButton = $( '.state-item:contains(' + dataStateNameMappings[stateId] + ')' );
    selectedStateButton.addClass('active');
    // redraw state chart
    drawPieChart(selectedAttribute, selectedState);
    // add state stats
    drawStateStats(selectedState);
    // redraw state map (will remove old and add new version)
    drawSecondMap(selectedState);

    console.log("Selected state:", dataStateNameMappings[selectedState]);
  }
}

/*----------------------
INTERACTION WITH THE BUTTONS AND DROPDOWNS
----------------------*/

/* -------------- MONTH CHANGING -------------- */
$("#select_month_btn").on("click", function(event){
  console.log("You clicked the month drop down");
});

$(document).on("click", ".month-item", function(event){  
  var target = event.target;
  if ( $(target).hasClass("active") ) {
    // unselect the option
    $(selectedMonthButton).removeClass('active');

    // change main button text
    $("#select_month_btn").text("Month");

    selectedMonthButton = null;
    selectedMonth = null;
    console.log("Unselected month: " + target.text);
  } else {
    // change the active option (if any option has it, otherwise ok)
    $(selectedMonthButton).removeClass('active');
    $(target).addClass('active');

    // change main button text
    $("#select_month_btn").text(target.text);

    selectedMonth = dataMonthNameMappingsReversed[target.text];
    selectedMonthButton = target;
    console.log("Selected month: " + target.text);
  }
  // update the numbers and map (needs to be done after both selection & unselection)
  precomputeData();
  visualization();
});

/* -------------- YEAR CHANGING -------------- */
$("#select_year_btn").on("click", function(event){
  console.log("You clicked the year drop down");
});

$(document).on("click", ".year-item", function(event){
  var target = event.target;
  if ( $(target).hasClass("active") ) {
    // unselect the option
    $(selectedYearButton).removeClass('active');

    // change main button text
    $("#select_year_btn").text("Year");

    selectedYearButton = null;
    selectedYear = null;
    console.log("Unselected year: " + target.text)
  } else {
    // change the active option (if any option has it, otherwise ok)
    $(selectedYearButton).removeClass('active');
    $(target).addClass('active');
  
    // change main button text
    $("#select_year_btn").text(target.text);

    selectedYear = parseInt(target.text);
    selectedYearButton = target;
    console.log("Selected year: " + target.text);
  }
  // update the numbers and map (needs to be done after both selection & unselection)
  precomputeData();
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
  console.log("You clicked the state1 drop down");
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
    drawPieChart(selectedAttribute, selectedState);
  } else {
    // change the active option (if any option has it, otherwise ok)
    $(selectedAttributeButton).removeClass('active');
    $(target).addClass('active');
    selectedAttribute = dataAttribNameMappingsReversed[target.text];
    selectedAttributeButton = target;

    // redraw state chart
    drawPieChart(selectedAttribute, selectedState);

    console.log("Selected attribute: " + target.text);
  }
});
